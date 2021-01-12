'use strict';

exports.__esModule = true;
exports['default'] = void 0;

var _mapToZero = _interopRequireDefault(require('./mapToZero'));

var _stripStyle = _interopRequireDefault(require('./stripStyle'));

var _stepper3 = _interopRequireDefault(require('./stepper'));

var _performanceNow = _interopRequireDefault(require('performance-now'));

var _raf = _interopRequireDefault(require('raf'));

var _shouldStopAnimation = _interopRequireDefault(
  require('./shouldStopAnimation'),
);

var _react = _interopRequireDefault(require('react'));

var _propTypes = _interopRequireDefault(require('prop-types'));

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

function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  subClass.__proto__ = superClass;
}

var msPerFrame = 1000 / 60;

var Motion =
  /*#__PURE__*/
  (function(_React$Component) {
    _inheritsLoose(Motion, _React$Component);

    function Motion(props) {
      var _this;

      _this = _React$Component.call(this, props) || this;
      _this.unmounting = false;
      _this.wasAnimating = false;
      _this.animationID = null;
      _this.prevTime = 0;
      _this.accumulatedTime = 0;
      _this.unreadPropStyle = null;

      _this.clearUnreadPropStyle = function(destStyle) {
        var dirty = false;
        var _this$state = _this.state,
          currentStyle = _this$state.currentStyle,
          currentVelocity = _this$state.currentVelocity,
          lastIdealStyle = _this$state.lastIdealStyle,
          lastIdealVelocity = _this$state.lastIdealVelocity;

        for (var key in destStyle) {
          if (!Object.prototype.hasOwnProperty.call(destStyle, key)) {
            continue;
          }

          var styleValue = destStyle[key];

          if (typeof styleValue === 'number') {
            if (!dirty) {
              dirty = true;
              currentStyle = _extends({}, currentStyle);
              currentVelocity = _extends({}, currentVelocity);
              lastIdealStyle = _extends({}, lastIdealStyle);
              lastIdealVelocity = _extends({}, lastIdealVelocity);
            }

            currentStyle[key] = styleValue;
            currentVelocity[key] = 0;
            lastIdealStyle[key] = styleValue;
            lastIdealVelocity[key] = 0;
          }
        }

        if (dirty) {
          _this.setState({
            currentStyle: currentStyle,
            currentVelocity: currentVelocity,
            lastIdealStyle: lastIdealStyle,
            lastIdealVelocity: lastIdealVelocity,
          });
        }
      };

      _this.startAnimationIfNecessary = function() {
        if (_this.unmounting || _this.animationID != null) {
          return;
        } // TODO: when config is {a: 10} and dest is {a: 10} do we raf once and
        // call cb? No, otherwise accidental parent rerender causes cb trigger

        _this.animationID = (0, _raf['default'])(function(timestamp) {
          // https://github.com/chenglou/react-motion/pull/420
          // > if execution passes the conditional if (this.unmounting), then
          // executes async defaultRaf and after that component unmounts and after
          // that the callback of defaultRaf is called, then setState will be called
          // on unmounted component.
          if (_this.unmounting) {
            return;
          } // check if we need to animate in the first place

          var propsStyle = _this.props.style;

          if (
            (0, _shouldStopAnimation['default'])(
              _this.state.currentStyle,
              propsStyle,
              _this.state.currentVelocity,
            )
          ) {
            if (_this.wasAnimating && _this.props.onRest) {
              _this.props.onRest();
            } // no need to cancel animationID here; shouldn't have any in flight

            _this.animationID = null;
            _this.wasAnimating = false;
            _this.accumulatedTime = 0;
            return;
          }

          _this.wasAnimating = true;
          var currentTime = timestamp || (0, _performanceNow['default'])();
          var timeDelta = currentTime - _this.prevTime;
          _this.prevTime = currentTime;
          _this.accumulatedTime = _this.accumulatedTime + timeDelta; // more than 10 frames? prolly switched browser tab. Restart

          if (_this.accumulatedTime > msPerFrame * 10) {
            _this.accumulatedTime = 0;
          }

          if (_this.accumulatedTime === 0) {
            // no need to cancel animationID here; shouldn't have any in flight
            _this.animationID = null;

            _this.startAnimationIfNecessary();

            return;
          }

          var currentFrameCompletion =
            (_this.accumulatedTime -
              Math.floor(_this.accumulatedTime / msPerFrame) * msPerFrame) /
            msPerFrame;
          var framesToCatchUp = Math.floor(_this.accumulatedTime / msPerFrame);
          var newLastIdealStyle = {};
          var newLastIdealVelocity = {};
          var newCurrentStyle = {};
          var newCurrentVelocity = {};

          for (var key in propsStyle) {
            if (!Object.prototype.hasOwnProperty.call(propsStyle, key)) {
              continue;
            }

            var styleValue = propsStyle[key];

            if (typeof styleValue === 'number') {
              newCurrentStyle[key] = styleValue;
              newCurrentVelocity[key] = 0;
              newLastIdealStyle[key] = styleValue;
              newLastIdealVelocity[key] = 0;
            } else {
              var newLastIdealStyleValue = _this.state.lastIdealStyle[key];
              var newLastIdealVelocityValue =
                _this.state.lastIdealVelocity[key];

              for (var i = 0; i < framesToCatchUp; i++) {
                var _stepper = (0, _stepper3['default'])(
                  msPerFrame / 1000,
                  newLastIdealStyleValue,
                  newLastIdealVelocityValue,
                  styleValue.val,
                  styleValue.stiffness,
                  styleValue.damping,
                  styleValue.precision,
                );

                newLastIdealStyleValue = _stepper[0];
                newLastIdealVelocityValue = _stepper[1];
              }

              var _stepper2 = (0, _stepper3['default'])(
                  msPerFrame / 1000,
                  newLastIdealStyleValue,
                  newLastIdealVelocityValue,
                  styleValue.val,
                  styleValue.stiffness,
                  styleValue.damping,
                  styleValue.precision,
                ),
                nextIdealX = _stepper2[0],
                nextIdealV = _stepper2[1];

              newCurrentStyle[key] =
                newLastIdealStyleValue +
                (nextIdealX - newLastIdealStyleValue) * currentFrameCompletion;
              newCurrentVelocity[key] =
                newLastIdealVelocityValue +
                (nextIdealV - newLastIdealVelocityValue) *
                  currentFrameCompletion;
              newLastIdealStyle[key] = newLastIdealStyleValue;
              newLastIdealVelocity[key] = newLastIdealVelocityValue;
            }
          }

          _this.animationID = null; // the amount we're looped over above

          _this.accumulatedTime -= framesToCatchUp * msPerFrame;

          _this.setState({
            currentStyle: newCurrentStyle,
            currentVelocity: newCurrentVelocity,
            lastIdealStyle: newLastIdealStyle,
            lastIdealVelocity: newLastIdealVelocity,
          });

          _this.unreadPropStyle = null;

          _this.startAnimationIfNecessary();
        });
      };

      _this.state = _this.defaultState();
      return _this;
    }

    var _proto = Motion.prototype;

    _proto.defaultState = function defaultState() {
      var _this$props = this.props,
        defaultStyle = _this$props.defaultStyle,
        style = _this$props.style;
      var currentStyle = defaultStyle || (0, _stripStyle['default'])(style);
      var currentVelocity = (0, _mapToZero['default'])(currentStyle);
      return {
        currentStyle: currentStyle,
        currentVelocity: currentVelocity,
        lastIdealStyle: currentStyle,
        lastIdealVelocity: currentVelocity,
      };
    }; // it's possible that currentStyle's value is stale: if props is immediately
    // changed from 0 to 400 to spring(0) again, the async currentStyle is still
    // at 0 (didn't have time to tick and interpolate even once). If we naively
    // compare currentStyle with destVal it'll be 0 === 0 (no animation, stop).
    // In reality currentStyle should be 400

    _proto.componentDidMount = function componentDidMount() {
      this.prevTime = (0, _performanceNow['default'])();
      this.startAnimationIfNecessary();
    };

    _proto.UNSAFE_componentWillReceiveProps = function UNSAFE_componentWillReceiveProps(
      props,
    ) {
      if (this.unreadPropStyle != null) {
        // previous props haven't had the chance to be set yet; set them here
        this.clearUnreadPropStyle(this.unreadPropStyle);
      }

      this.unreadPropStyle = props.style;

      if (this.animationID == null) {
        this.prevTime = (0, _performanceNow['default'])();
        this.startAnimationIfNecessary();
      }
    };

    _proto.componentWillUnmount = function componentWillUnmount() {
      this.unmounting = true;

      if (this.animationID != null) {
        _raf['default'].cancel(this.animationID);

        this.animationID = null;
      }
    };

    _proto.render = function render() {
      var renderedChildren = this.props.children(this.state.currentStyle);
      return (
        renderedChildren && _react['default'].Children.only(renderedChildren)
      );
    };

    return Motion;
  })(_react['default'].Component);

exports['default'] = Motion;
process.env.NODE_ENV !== 'production'
  ? (Motion.propTypes = {
      // TOOD: warn against putting a config in here
      defaultStyle: _propTypes['default'].objectOf(
        _propTypes['default'].number,
      ),
      style: _propTypes['default'].objectOf(
        _propTypes['default'].oneOfType([
          _propTypes['default'].number,
          _propTypes['default'].object,
        ]),
      ).isRequired,
      children: _propTypes['default'].func.isRequired,
      onRest: _propTypes['default'].func,
    })
  : void 0;
