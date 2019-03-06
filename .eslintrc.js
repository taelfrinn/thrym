module.exports = {
	"extends": [
		"standard"
	],
	"plugins": [
		"standard"
	],
	"parserOptions":  {
		"ecmaFeatures": {
		}
	},

	"rules": {
		"semi": [2, "always"],
		"quotes": [0, "double"],
		"camelcase": ["off", {"properties": "never"}],
		"indent": ["error", "tab"],
		"no-tabs": ["off", ""],
		"yoda": ["off"],
		"prefer-promise-reject-errors": ["off"]
	},
	"env": {
		"node": true,
		"browser": true,
		"es6": true,
		"jest": true
	}
};

