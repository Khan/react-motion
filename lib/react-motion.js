'use strict';

exports.__esModule = true;
exports.presets = exports.spring = exports.Motion = void 0;

var _Motion = _interopRequireDefault(require('./Motion'));

exports.Motion = _Motion['default'];

var _spring = _interopRequireDefault(require('./spring'));

exports.spring = _spring['default'];

var _presets = _interopRequireDefault(require('./presets'));

exports.presets = _presets['default'];

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}
