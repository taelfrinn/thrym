'use strict';

const sodium = require('sodium-native');
const crypto = require('crypto');
const base32 = require('thirty-two');
const bip39 = require('bip39');

function load_keypair_from_seed_hex (seedHex) {
	let box_seed = Buffer.from(seedHex, 'hex');

	if (box_seed.length !== sodium.crypto_box_SEEDBYTES) {
		throw new Error('Please use a 24 word bip39 phrase for the vault secret');
	}

	let apikey_cryptobox_public = sodium.sodium_malloc(sodium.crypto_box_PUBLICKEYBYTES);
	let apikey_cryptobox_private = sodium.sodium_malloc(sodium.crypto_box_SECRETKEYBYTES);

	sodium.crypto_box_seed_keypair(apikey_cryptobox_public, apikey_cryptobox_private, box_seed);

	return {
		publicKey: apikey_cryptobox_public,
		privateKey: apikey_cryptobox_private
	};
}

function encrypt (publicKey, message) {
	let cypherBytes = Buffer.alloc(sodium.crypto_box_SEALBYTES + message.length);
	sodium.crypto_box_seal(cypherBytes, Buffer.from(message, 'utf8'), publicKey);

	return cypherBytes.toString('base64');
}

function decrypt (publicKey, privateKey, cypherTextBase64) {
	let cypherBytes = Buffer.from(cypherTextBase64, 'base64');
	let message = Buffer.alloc(cypherBytes.length - sodium.crypto_box_SEALBYTES);
	if (!sodium.crypto_box_seal_open(message, cypherBytes, publicKey, privateKey)) {
		throw new Error('Failed to Decrypt');
	}
	return message.toString('utf8');
}

function CryptoCore () {
	if (!(this instanceof CryptoCore)) {
		return new CryptoCore(...arguments);
	}

	this.shared_secret = null;

	return this;
};

CryptoCore.prototype.Reload = function (config) {
	let byteshex = bip39.mnemonicToEntropy(config.get(['vault', 'cryptobox_seed']));
	this.kp = load_keypair_from_seed_hex(byteshex);
};

CryptoCore.prototype.vault = function (clearString) {
	try {
		return encrypt(this.kp.publicKey, clearString);
	} catch (err) {
		return null;
	}
};
CryptoCore.prototype.unvault = function (vaultedString) {
	try {
		return decrypt(this.kp.publicKey, this.kp.privateKey, vaultedString);
	} catch (err) {
		return null;
	}
};
const _DEFAULT_STEP = 30 * 1000;
CryptoCore.otp = function (shared_secret_buffer, now_ms = null, period = _DEFAULT_STEP, digits = 6) {
	if (!now_ms) {
		now_ms = Date.now();
	}
	let nowmin = Math.floor(now_ms / period);

	function DT (buf) {
		const OffsetBits = buf[19] & 0x0F;
		const P = buf.readInt32BE(OffsetBits); // String[OffSet]...String[OffSet+3]
		// Return the Last 31 bits of P
		return P & 0x7FFFFFFF;
	}
	function digitize (hash, digits) {
		const dtval = DT(hash);
		// code := truncatedHash mod 1000000
		let token = dtval % Math.pow(10, digits);
		// left pad code with 0 until length of code is as defined.
		return String(token).padStart(digits, '0');
	}
	// TOTP = HOTP(K, T)
	// HOTP(K,C) = Truncate(HMAC-SHA-1(K,C))
	// 8 bytes binary BE value of number
	let tohash1 = UInt64Buffer(nowmin);
	let tohash2 = UInt64Buffer(nowmin + 1);

	let h1 = crypto.createHmac('sha1', shared_secret_buffer).update(tohash1).digest();
	let h2 = crypto.createHmac('sha1', shared_secret_buffer).update(tohash2).digest();

	return [digitize(h1, digits), digitize(h2, digits)];
};

// TOTP for login purposes
function UInt64Buffer (num) {
	let res = [];
	while (res.length < 8) {
		res.unshift(num & 0xFF);
		num = num >> 8;
	}
	return Buffer.from(res);
}
CryptoCore.prototype.login_otp_method_new = function () {
	// generate 20 random bytes, encode as base32
	let base_data = base32.encode(crypto.randomBytes(20));
	base_data = this.vault(base_data);
	if (!base_data) {
		return Promise.reject({ status: "error", msg: "Failed to encode new secret" });
	}
	// encode as a totp method
	return Promise.resolve({
		"method_type": "TOTP",
		'method_params': base_data,
		'confirmed': false
		// 'name': uuid.v4()
	});
};
CryptoCore.prototype.login_otp_method_toUrl = function (issuername, username, method) {
	issuername = encodeURIComponent(issuername || "Houston");
	username = encodeURIComponent(username);
	const b32secret = this.unvault(method.method_params);
	if (!b32secret) {
		return Promise.reject({status: "error", msg: "Failed to decode method params"});
	}
	return Promise.resolve(`otpauth://totp/${issuername}:${username}?secret=${encodeURIComponent(b32secret)}&issuer=${issuername}`);
};
CryptoCore.prototype.login_otp_method_check = function (method, digits) {
	const b32secret = this.unvault(method.method_params);
	if (!b32secret) {
		return Promise.reject({status: "error", msg: "Failed to decode method params"});
	}
	const codeLength = 6;
	const _hotp = function (counter) {
		let hmac = crypto.createHmac('sha1', base32.decode(b32secret));
		hmac = hmac.update(UInt64Buffer(counter)).digest();
		let offset = hmac[19] & 0xf;
		let code = String((hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 | (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff));
		code = ((new Array(codeLength + 1)).join('0') + code).slice(-1 * codeLength);
		return code;
	};
	const counter = Math.floor((Date.now() / 1000) / 30);
	const nextDigits = [_hotp(counter), _hotp(counter - 1)]; // accept present and previous
	return Promise.resolve({passed: nextDigits.includes(digits), answers: nextDigits});
};

module.exports = {
	load_keypair_from_seed_hex,
	encrypt,
	decrypt,
	CryptoCore
};
