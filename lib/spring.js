'use strict';

exports.__esModule = true;
exports['default'] = spring;

var _presets = _interopRequireDefault(require('./presets'));

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _extends() {
  _extends =
    Object.assign ||
    function(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    };
  return _extends.apply(this, arguments);
}

var defaultConfig = _extends({}, _presets['default'].noWobble, {
  precision: 0.01,
});

function spring(val, config) {
  return _extends({}, defaultConfig, {}, config, {
    val: val,
  });
}
