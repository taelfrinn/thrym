'use strict';

const Promise = require('bluebird');
const List = require('collections/list');

function Gate () {
	let gateCallback, cancelCallback;
	let gatePromise = new Promise((resolve, reject) => {
		gateCallback = resolve;
		cancelCallback = reject;
	});
	return {gatePromise, gateCallback, cancelCallback};
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
		this.backlog.push({idStr, ...newGate});
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
		let {idStr, gateCallback} = this.backlog.shift();
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
		let {cancelCallback} = node.value;
		cancelCallback(new Error('canceled'));// this will dispatch a rejection
		return true;
	}
	return false;
};

module.exports = {
	Gate,
	SerialGate
};
