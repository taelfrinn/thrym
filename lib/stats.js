"use strict";

let _stats_handler = {
	get: function (target, name) {
		if (!target[name]) {
			return 0;
		}
		return target[name];
	}
};

function STAT () {
	if (!(this instanceof STAT)) {
		return new STAT(...arguments);
	}
	return new Proxy(this, _stats_handler);
}

STAT.prototype.INCR = function (name) {
	return this[name]++;
};
STAT.prototype.SUBCATEGORY = function (name) {
	return (this[name] = new STAT());
};

module.exports = STAT;
