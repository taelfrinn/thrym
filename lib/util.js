'use strict';

const Promise = require('bluebird');
const List = require('collections/list');

function Gate () {
	let gateCallback, cancelCallback;
	let gatePromise = new Promise((resolve, reject) => {
		gateCallback = resolve;
		cancelCallback = reject;
	});
	return { gatePromise, gateCallback, cancelCallback };
}
exports.Gate = Gate;

function SerialGate () {
	if (!(this instanceof SerialGate)) {
		return new SerialGate(...arguments);
	}
	this.index = {};
	this.backlog = new List();
	this.busy = false;
}
SerialGate.prototype.whenReady = function (promiseFunc, idStr) {
	if (idStr) {
		// cancel backlogged work - will be replaced by new promiseFunc
		this.cancel(idStr);
	}
	if (!this.busy) {
		this.busy = true;
		return Promise.resolve().then(promiseFunc).finally(() => {
			this._openTheGate();
		});
	} else {
		let newGate = Gate();
		this.backlog.push({ idStr, ...newGate });
		const node = this.backlog.scan(-1);
		if (idStr) {
			this.index[idStr] = node;// note presence only. will be removed before it starts
		}
		return newGate.gatePromise.then(promiseFunc).finally(() => {
			this._openTheGate();
		});
	}
};
SerialGate.prototype._openTheGate = function () {
	this.busy = false;
	if (this.backlog.length > 0) {
		this.busy = true;
		let { idStr, gateCallback } = this.backlog.shift();
		if (idStr) {
			delete this.index[idStr];// unindex so it can no longer be canceled
		}
		gateCallback();// this unlocks the pending work just popped
	}
};
SerialGate.prototype.cancel = function (idStr) {
	const node = this.index[idStr];
	if (node) {
		// remove from backlog
		this.backlog.splice(node, 1);
		// unindex
		delete this.index[idStr];
		// find and cancel the callback
		let { cancelCallback } = node.value;
		cancelCallback(new Error('canceled'));// this will dispatch a rejection
		return true;
	}
	return false;
};

// const _ = require('lodash');
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

// only supports USA phones for now:
//   improving support for international phone numbers should be valuable
function formatPhone (num) {
	let ret = "";
	try {
		// parse(numberToParse, defaultRegion) - parses a string and returns it as an object
		let number = phoneUtil.parse(num, 'US');
		if (phoneUtil.isValidNumber(number)) {
			ret = phoneUtil.format(number, PNF.E164);
		} else {
			// support for 000 area code test numbers: fake users for unit testing
			let rawDigits = num.replace(/[^0-9]/g, '');
			if (rawDigits[0] === '1') {
				rawDigits = rawDigits.substring(1);
			}
			if (rawDigits.length === 10 && rawDigits.match(/^0{3}\d{7}$/)) {
				ret = "+1" + rawDigits;
			}
		}
	} catch (err) {
		// swallow errors
	}
	return ret;
}

// This function is for English-centric, space separated words
// Combining characters/diacritical marks may fail
// beyond bmp characters; which in JS result in surrogate pairs, may also fail
function titleCase (str) {
	str = String(str || "").toLowerCase().split(' ');
	for (var i = 0; i < str.length; i++) {
		str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
	}
	return str.join(' ');
}

module.exports = {
	Gate,
	SerialGate,
	formatPhone,
	titleCase
};
