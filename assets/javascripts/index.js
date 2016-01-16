(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";function _interopRequireDefault(e){return e&&e.__esModule?e:{"default":e}}var _tls_check=require("./tls_check"),_tls_check2=_interopRequireDefault(_tls_check);!function(){(0,_tls_check2["default"])()}();

},{"./tls_check":3}],2:[function(require,module,exports){
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports["default"]={domain:"lorefnon.me"};

},{}],3:[function(require,module,exports){
"use strict";function _interopRequireDefault(t){return t&&t.__esModule?t:{"default":t}}function ensureTLS(){location.host==_settings2["default"].domain?"https:"!==location.protocol&&(location.protocol="https"):location.host.match(/^localhost:\d+$/)||(location.href="https://"+_settings2["default"].domain)}Object.defineProperty(exports,"__esModule",{value:!0}),exports["default"]=ensureTLS;var _settings=require("./settings"),_settings2=_interopRequireDefault(_settings);

},{"./settings":2}]},{},[1]);
