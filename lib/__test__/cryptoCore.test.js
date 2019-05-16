'use strict';
const base32 = require('thirty-two');
const Promise = require('bluebird');

jest.dontMock('../cryptoCore.js');
const CryptoCore = require('../cryptoCore.js').CryptoCore;

describe('Test crypto utils', function () {
	beforeEach(() => {
	});
	afterEach(() => {
	});

	it('Test OTP', async function () {
		// should also incidentally test vault, two independent impls of otp
		const time = '1557980685000';
		Date.now = jest.fn(() => time);

		const vaultMnem = "squirrel street robust throw palace noise pledge tissue quantum source define company problem exchange satisfy frozen negative noble render apology check walk knife sort";
		const tCore = CryptoCore();
		tCore.Reload({get: () => vaultMnem});
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
		await Promise.each(secrets, async (secret, index) => {
			const ssec = base32.decode(secret);
			const testres = CryptoCore.otp(ssec, time);
			expect(testres[0]).toEqual(answers[index]);
			expect(testres[1]).toEqual(answers2[index]);

			const method = {method_params: tCore.vault(secret)};
			const res = await tCore.login_otp_method_check(method, testres[0]);

			expect(res.passed).toBeTruthy();
			expect(res.answers[0]).toEqual(answers[index]);
			expect(res.answers[1]).toEqual(answersN1[index]);
		});
	});
});
