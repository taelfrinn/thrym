'use strict';
const base32 = require('thirty-two');
// const Promise = require('bluebird');

jest.dontMock('../cryptoCore.js');
const cryptoCore = require('../cryptoCore.js');
const CryptoCore = require('../cryptoCore.js');

describe('Test crypto utils', function () {
	beforeEach(() => {
	});
	afterEach(() => {
	});

	it('Password Hashing', async function () {
		const passwords = [
			'password1',
			'Hello World!',
			'谢谢你'
		];
		const hashedPasswords = [
			'$pbkdf2-sha256$6000$+ojfrMgltgsO8oz6kpd9wT+6uVI=$Me2Nb5uXFVjwfRJiTdVCJHkCKfyvUwIGdGS/WRQ3n2A=',
			'$pbkdf2-sha256$6000$9xbTs48KIIV3w5G62a00$COmSGjrKyOnQAj8uAJNnvM8/qMD3uRcKoCziTu7lMTE=',
			'$pbkdf2-sha256$100$asH6YR+lGQndNZznTZqML1+o$oHVinqHEkU6E2vJ16AQil4FVvU8Otn4RSA5eZNec3Og='
		];
		for (let i = 0; i < passwords.length; ++i) {
			const password = passwords[i];
			const hashedPassword = hashedPasswords[i];

			const hash = cryptoCore.passwordHash(password, hashedPassword);
			expect(hash).toEqual(hashedPassword);
		}
	});

	it('Test OTP', async function () {
		// should also incidentally test vault, two independent impls of otp
		const time = '1557980685000';
		Date.now = jest.fn(() => time);

		const vaultMnem = "squirrel street robust throw palace noise pledge tissue quantum source define company problem exchange satisfy frozen negative noble render apology check walk knife sort";
		const tCore = CryptoCore();
		tCore.Reload({config: {get: () => vaultMnem}});
		const secrets = [
			'FIINXY3ZV3BBRZPKU5ZR4L7OR4EXKJV3ELHYCI5HU5LER7EGF7GQSVQG7CQZ7NNE',
			'JUAEWK7UUTMR6GKIQC2QLOM7PSRN6RAJVASEOSHIND7NUF67WC5ARPFLO7QGO6BR',
			'R6LUE6JGL35VYNCXEJ7R4ZF2WK56QDGU'
		];
		const answers = [
			'338617',
			'798063',
			'413654'
		];
		const answers2 = [
			'458802',
			'399038',
			'452743'
		];
		const answersN1 = [
			'191796',
			'491677',
			'595657'
		];

		expect.assertions(15);

		for await (const index of Object.keys(secrets)) {
			const secret = secrets[index];
			const ssec = base32.decode(secret);
			const testres = CryptoCore.otp(ssec, time);
			expect(testres[0]).toEqual(answers[index]);
			expect(testres[1]).toEqual(answers2[index]);

			const method = {method_params: tCore.vault(secret)};
			const res = await tCore.login_otp_method_check(method, testres[0]);

			expect(res.passed).toBeTruthy();
			expect(res.answers[0]).toEqual(answers[index]);
			expect(res.answers[1]).toEqual(answersN1[index]);
		};
	});
});
