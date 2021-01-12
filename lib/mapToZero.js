'use strict';

exports.__esModule = true;
exports['default'] = mapToZero;

// currently used to initiate the velocity style object to 0
function mapToZero(obj) {
  var ret = {};

  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      ret[key] = 0;
    }
  }

  return ret;
}
