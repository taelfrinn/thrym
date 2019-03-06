"use strict";

const fs = require('fs');
const _ = require('lodash');

function _configBaseClass () {}

_configBaseClass.prototype.get = function (path, defaultVal) {
	return Config(_.get(this, path, defaultVal));
};
function Config (obj) {
	if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
		obj = _.assign(new _configBaseClass(), obj); // make a copy
	}
	return obj;
}
let g_settings = Config({});

function set_default_value (path, v) {
	let curval = _.get(g_settings, path);
	if (null == curval) {
		_.set(g_settings, path, v);
	}
}
function set_defaults (defaults) {
	for (let d of defaults) {
		set_default_value(d.path, d.val);
	}
}

function SaveBlocking (path) {
	fs.writeFileSync(path, JSON.stringify(g_settings, null, "\t"));
}

// format of config defaults = [
//	{"path": ["key1", "key2"], val: "<default key value here>"}, ...
// ]
function LoadBlocking (path, defaults) {
	if (path) {
		try {
			if (!fs.existsSync(path)) { throw new Error("exists failed"); }
		} catch (err) {
			console.error("Failed to find config file: creating default: " + err.toString());
			g_settings = Config({});
			set_defaults(defaults);
			SaveBlocking(path);
			module.exports.settings = g_settings;
			return;
		}

		var cont = fs.readFileSync(path);
		g_settings = Config(JSON.parse(cont));
		set_defaults(defaults);
	}
	module.exports.settings = g_settings;
}

module.exports.get = (p, d) => g_settings.get(p, d);
module.exports.settings = g_settings;
module.exports.SaveBlocking = SaveBlocking;
module.exports.LoadBlocking = LoadBlocking;
module.exports.Config = Config;
