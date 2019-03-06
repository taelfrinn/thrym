'use strict';

function csrfMidleware (config, logger) {
	const srcPattern = new RegExp(config.get(['service', 'csrf_allow_pattern']));
	const doCORS = new RegExp(config.get(['service', 'add_cors_headers'], true));
	function checkCSRF (req, res, next) {
		if (req.method === 'GET') {
			next();
			return;
		}
		// (!req.xhr) => should we check for this header? 
		// OPTIONS preflight wont have it set in any case
		let srcU = req.get('Origin') || req.get('Referer');
		if (!srcU || !srcU.match(srcPattern)) {
			logger.error({
				errorType: 'csrf error',
				message: "CSRF check failed",
				statusCode: 403,
				data: {
					'X-Requested-With': req.get('X-Requested-With'),
					'Origin': req.get('Origin'),
					'Referer': req.get('Referer'),
					'xhr': req.xhr
				}
			});

			res.status(403).json({
				errorType: 'csrf error',
				message: 'csrf check failed',
				event: 'serviceError'
			});
			return;
		}
		if (doCORS) {
			// Add automatic CORS headers which allow everything
			if (req.method === 'OPTIONS') {
				res.set({
					"Access-Control-Allow-Origin": srcU,
					"Vary": "Origin",
					"Access-Control-Allow-Methods": req.get('Access-Control-Request-Method'),
					"Access-Control-Allow-Headers": req.get('Access-Control-Request-Headers')
				});
				res.status(200).end();
				return;
			}
			res.set({"Access-Control-Allow-Origin": srcU});
		}
		next();
	}
	return checkCSRF;
}

module.exports = csrfMidleware;
