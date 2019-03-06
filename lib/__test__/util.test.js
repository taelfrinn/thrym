'use strict';
const Promise = require('bluebird');
jest.dontMock('../util.js');

// test SerialGate;
const util = require('../util.js');
const SerialGate = util.SerialGate;

function resolvesTest (valStr) {
	return () => {
		return Promise.resolve(valStr);
	};
}

describe('Test Serial Gate', function () {
	it('schedules some work', function () {
		let g = SerialGate();

		let p1 = g.whenReady(resolvesTest("one"), "one");
		let p2 = g.whenReady(resolvesTest("two"), "two");
		let p3 = g.whenReady(resolvesTest("three"), "three");

		// currently 3 objects on theb backlog, since 1 runs immediately
		expect(g.backlog.length).toEqual(2);
		expect(p1).resolves.toEqual("one");
		expect(p2).resolves.toEqual("two");
		expect(p3).resolves.toEqual("three");
		return Promise.try(() => {})
			.then(() => {
				return expect(p1).resolves.toEqual("one");
			}).then(() => {
				return expect(p2).resolves.toEqual("two");
			}).then(() => {
				return expect(p3).resolves.toEqual("three");
			});
	});
	it('schedules some duplicate work', function () {
		let g = SerialGate();
		let p1 = g.whenReady(resolvesTest("one"), "one");
		let dupe1 = g.whenReady(resolvesTest("dupe1"), "dupe");
		let dupe2 = g.whenReady(resolvesTest("dupe2"), "dupe");
		expect(g.backlog.length).toEqual(1);

		expect(p1).resolves.toEqual("one");
		expect(dupe1).rejects.toEqual({ message: "canceled" });
		expect(dupe2).resolves.toEqual("dupe2");
		return Promise.try(() => {})
			.then(() => {
				return expect(p1).resolves.toEqual("one");
			}).then(() => {
				return expect(dupe1).rejects.toHaveProperty(['message'], "canceled");
			}).then(() => {
				return expect(dupe2).resolves.toEqual("dupe2");
			});
	});
	it('schedules some work, then cancels it', function () {
		let g = SerialGate();
		let p1 = g.whenReady(resolvesTest("one"), "one");
		let p2 = g.whenReady(resolvesTest("two"), "two");
		let p3 = g.whenReady(resolvesTest("three"), "three");

		// currently 3 objects on theb backlog, since 1 runs immediately
		expect(g.backlog.length).toEqual(2);

		g.cancel("two");

		return Promise.try(() => {})
			.then(() => {
				return expect(p1).resolves.toEqual("one");
			}).then(() => {
				return expect(p2).rejects.toHaveProperty(['message'], "canceled");
			}).then(() => {
				return expect(p3).resolves.toEqual("three");
			});
	});
});
