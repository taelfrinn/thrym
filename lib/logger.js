'use strict';

const pinoHttp = require('pino-http');

function wipe (req, ...path) {
	for (let i = 0; i < path.length; ++i) {
		if (i === path.length - 1) {
			req[path[i]] = undefined;
			return;
		}

		if (typeof (req[path[i]]) !== 'object') {
			return;
		}

		req = req[path[i]];
	}
}

function formatReq (req) {
	req.client_address = req.raw.ip;

	// redact cookies if present
	wipe(req, 'headers');

	// include body
	if (req.raw.body) {
		req.body = req.raw.body;
	}

	return req;
}

function formatRes (res) {
	// only report the content type we shipped back
	res.headers = {
		'Content-Type': res.raw.get('Content-Type')
	};

	if (res.raw.responseBody) {
		res.responseBody = res.raw.responseBody;
	}

	return res;
}

function WebLoggerMiddleware () {
	if (!(this instanceof WebLoggerMiddleware)) {
		return new WebLoggerMiddleware();
	}
}
WebLoggerMiddleware.prototype.getMiddleware = function () {
	return this.pinoHttp;
};
WebLoggerMiddleware.prototype.Reload = function (ifs) {
	this.pinoHttp = pinoHttp({ logger: ifs.logger, serializers: { req: formatReq, res: formatRes } });
};

module.exports = {
	formatReq,
	formatRes,
	WebLoggerMiddleware
};
