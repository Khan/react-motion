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

function shouldStopAnimationAll(currentStyles, styles, currentVelocities) {
  for (var i = 0; i < currentStyles.length; i++) {
    if (
      !(0, _shouldStopAnimation['default'])(
        currentStyles[i],
        styles[i],
        currentVelocities[i],
      )
    ) {
      return false;
    }
  }

  return true;
}

var StaggeredMotion =
  /*#__PURE__*/
  (function(_React$Component) {
    _inheritsLoose(StaggeredMotion, _React$Component);

    function StaggeredMotion(props) {
      var _this;

      _this = _React$Component.call(this, props) || this;
      _this.unmounting = false;
      _this.animationID = null;
      _this.prevTime = 0;
      _this.accumulatedTime = 0;
      _this.unreadPropStyles = null;

      _this.clearUnreadPropStyle = function(unreadPropStyles) {
        var _this$state = _this.state,
          currentStyles = _this$state.currentStyles,
          currentVelocities = _this$state.currentVelocities,
          lastIdealStyles = _this$state.lastIdealStyles,
          lastIdealVelocities = _this$state.lastIdealVelocities;
        var someDirty = false;

        for (var i = 0; i < unreadPropStyles.length; i++) {
          var unreadPropStyle = unreadPropStyles[i];
          var dirty = false;

          for (var key in unreadPropStyle) {
            if (!Object.prototype.hasOwnProperty.call(unreadPropStyle, key)) {
              continue;
            }

            var styleValue = unreadPropStyle[key];

            if (typeof styleValue === 'number') {
              if (!dirty) {
                dirty = true;
                someDirty = true;
                currentStyles[i] = _extends({}, currentStyles[i]);
                currentVelocities[i] = _extends({}, currentVelocities[i]);
                lastIdealStyles[i] = _extends({}, lastIdealStyles[i]);
                lastIdealVelocities[i] = _extends({}, lastIdealVelocities[i]);
              }

              currentStyles[i][key] = styleValue;
              currentVelocities[i][key] = 0;
              lastIdealStyles[i][key] = styleValue;
              lastIdealVelocities[i][key] = 0;
            }
          }
        }

        if (someDirty) {
          _this.setState({
            currentStyles: currentStyles,
            currentVelocities: currentVelocities,
            lastIdealStyles: lastIdealStyles,
            lastIdealVelocities: lastIdealVelocities,
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
          }

          var destStyles = _this.props.styles(_this.state.lastIdealStyles); // check if we need to animate in the first place

          if (
            shouldStopAnimationAll(
              _this.state.currentStyles,
              destStyles,
              _this.state.currentVelocities,
            )
          ) {
            // no need to cancel animationID here; shouldn't have any in flight
            _this.animationID = null;
            _this.accumulatedTime = 0;
            return;
          }

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
          var newLastIdealStyles = [];
          var newLastIdealVelocities = [];
          var newCurrentStyles = [];
          var newCurrentVelocities = [];

          for (var i = 0; i < destStyles.length; i++) {
            var destStyle = destStyles[i];
            var newCurrentStyle = {};
            var newCurrentVelocity = {};
            var newLastIdealStyle = {};
            var newLastIdealVelocity = {};

            for (var key in destStyle) {
              if (!Object.prototype.hasOwnProperty.call(destStyle, key)) {
                continue;
              }

              var styleValue = destStyle[key];

              if (typeof styleValue === 'number') {
                newCurrentStyle[key] = styleValue;
                newCurrentVelocity[key] = 0;
                newLastIdealStyle[key] = styleValue;
                newLastIdealVelocity[key] = 0;
              } else {
                var newLastIdealStyleValue =
                  _this.state.lastIdealStyles[i][key];
                var newLastIdealVelocityValue =
                  _this.state.lastIdealVelocities[i][key];

                for (var j = 0; j < framesToCatchUp; j++) {
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
                  (nextIdealX - newLastIdealStyleValue) *
                    currentFrameCompletion;
                newCurrentVelocity[key] =
                  newLastIdealVelocityValue +
                  (nextIdealV - newLastIdealVelocityValue) *
                    currentFrameCompletion;
                newLastIdealStyle[key] = newLastIdealStyleValue;
                newLastIdealVelocity[key] = newLastIdealVelocityValue;
              }
            }

            newCurrentStyles[i] = newCurrentStyle;
            newCurrentVelocities[i] = newCurrentVelocity;
            newLastIdealStyles[i] = newLastIdealStyle;
            newLastIdealVelocities[i] = newLastIdealVelocity;
          }

          _this.animationID = null; // the amount we're looped over above

          _this.accumulatedTime -= framesToCatchUp * msPerFrame;

          _this.setState({
            currentStyles: newCurrentStyles,
            currentVelocities: newCurrentVelocities,
            lastIdealStyles: newLastIdealStyles,
            lastIdealVelocities: newLastIdealVelocities,
          });

          _this.unreadPropStyles = null;

          _this.startAnimationIfNecessary();
        });
      };

      _this.state = _this.defaultState();
      return _this;
    }

    var _proto = StaggeredMotion.prototype;

    _proto.defaultState = function defaultState() {
      var _this$props = this.props,
        defaultStyles = _this$props.defaultStyles,
        styles = _this$props.styles;
      var currentStyles = defaultStyles || styles().map(_stripStyle['default']);
      var currentVelocities = currentStyles.map(function(currentStyle) {
        return (0, _mapToZero['default'])(currentStyle);
      });
      return {
        currentStyles: currentStyles,
        currentVelocities: currentVelocities,
        lastIdealStyles: currentStyles,
        lastIdealVelocities: currentVelocities,
      };
    };

    _proto.componentDidMount = function componentDidMount() {
      this.prevTime = (0, _performanceNow['default'])();
      this.startAnimationIfNecessary();
    };

    _proto.UNSAFE_componentWillReceiveProps = function UNSAFE_componentWillReceiveProps(
      props,
    ) {
      if (this.unreadPropStyles != null) {
        // previous props haven't had the chance to be set yet; set them here
        this.clearUnreadPropStyle(this.unreadPropStyles);
      }

      this.unreadPropStyles = props.styles(this.state.lastIdealStyles);

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
      var renderedChildren = this.props.children(this.state.currentStyles);
      return (
        renderedChildren && _react['default'].Children.only(renderedChildren)
      );
    };

    return StaggeredMotion;
  })(_react['default'].Component);

exports['default'] = StaggeredMotion;
process.env.NODE_ENV !== 'production'
  ? (StaggeredMotion.propTypes = {
      // TOOD: warn against putting a config in here
      defaultStyles: _propTypes['default'].arrayOf(
        _propTypes['default'].objectOf(_propTypes['default'].number),
      ),
      styles: _propTypes['default'].func.isRequired,
      children: _propTypes['default'].func.isRequired,
    })
  : void 0;
