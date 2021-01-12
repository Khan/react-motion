'use strict';

exports.__esModule = true;
exports['default'] = void 0;

var _mapToZero = _interopRequireDefault(require('./mapToZero'));

var _stripStyle = _interopRequireDefault(require('./stripStyle'));

var _stepper3 = _interopRequireDefault(require('./stepper'));

var _mergeDiff = _interopRequireDefault(require('./mergeDiff'));

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

var msPerFrame = 1000 / 60; // the children function & (potential) styles function asks as param an
// Array<TransitionPlainStyle>, where each TransitionPlainStyle is of the format
// {key: string, data?: any, style: PlainStyle}. However, the way we keep
// internal states doesn't contain such a data structure (check the state and
// TransitionMotionState). So when children function and others ask for such
// data we need to generate them on the fly by combining mergedPropsStyles and
// currentStyles/lastIdealStyles

function rehydrateStyles(mergedPropsStyles, unreadPropStyles, plainStyles) {
  // Copy the value to a `const` so that Flow understands that the const won't
  // change and will be non-nullable in the callback below.
  var cUnreadPropStyles = unreadPropStyles;

  if (cUnreadPropStyles == null) {
    return mergedPropsStyles.map(function(mergedPropsStyle, i) {
      return {
        key: mergedPropsStyle.key,
        data: mergedPropsStyle.data,
        style: plainStyles[i],
      };
    });
  }

  return mergedPropsStyles.map(function(mergedPropsStyle, i) {
    for (var j = 0; j < cUnreadPropStyles.length; j++) {
      if (cUnreadPropStyles[j].key === mergedPropsStyle.key) {
        return {
          key: cUnreadPropStyles[j].key,
          data: cUnreadPropStyles[j].data,
          style: plainStyles[i],
        };
      }
    }

    return {
      key: mergedPropsStyle.key,
      data: mergedPropsStyle.data,
      style: plainStyles[i],
    };
  });
}

function shouldStopAnimationAll(
  currentStyles,
  destStyles,
  currentVelocities,
  mergedPropsStyles,
) {
  if (mergedPropsStyles.length !== destStyles.length) {
    return false;
  }

  for (var i = 0; i < mergedPropsStyles.length; i++) {
    if (mergedPropsStyles[i].key !== destStyles[i].key) {
      return false;
    }
  } // we have the invariant that mergedPropsStyles and
  // currentStyles/currentVelocities/last* are synced in terms of cells, see
  // mergeAndSync comment for more info

  for (var _i = 0; _i < mergedPropsStyles.length; _i++) {
    if (
      !(0, _shouldStopAnimation['default'])(
        currentStyles[_i],
        destStyles[_i].style,
        currentVelocities[_i],
      )
    ) {
      return false;
    }
  }

  return true;
} // core key merging logic
// things to do: say previously merged style is {a, b}, dest style (prop) is {b,
// c}, previous current (interpolating) style is {a, b}
// **invariant**: current[i] corresponds to merged[i] in terms of key
// steps:
// turn merged style into {a?, b, c}
//    add c, value of c is destStyles.c
//    maybe remove a, aka call willLeave(a), then merged is either {b, c} or {a, b, c}
// turn current (interpolating) style from {a, b} into {a?, b, c}
//    maybe remove a
//    certainly add c, value of c is willEnter(c)
// loop over merged and construct new current
// dest doesn't change, that's owner's

function mergeAndSync(
  willEnter,
  willLeave,
  didLeave,
  oldMergedPropsStyles,
  destStyles,
  oldCurrentStyles,
  oldCurrentVelocities,
  oldLastIdealStyles,
  oldLastIdealVelocities,
) {
  var newMergedPropsStyles = (0, _mergeDiff['default'])(
    oldMergedPropsStyles,
    destStyles,
    function(oldIndex, oldMergedPropsStyle) {
      var leavingStyle = willLeave(oldMergedPropsStyle);

      if (leavingStyle == null) {
        didLeave({
          key: oldMergedPropsStyle.key,
          data: oldMergedPropsStyle.data,
        });
        return null;
      }

      if (
        (0, _shouldStopAnimation['default'])(
          oldCurrentStyles[oldIndex],
          leavingStyle,
          oldCurrentVelocities[oldIndex],
        )
      ) {
        didLeave({
          key: oldMergedPropsStyle.key,
          data: oldMergedPropsStyle.data,
        });
        return null;
      }

      return {
        key: oldMergedPropsStyle.key,
        data: oldMergedPropsStyle.data,
        style: leavingStyle,
      };
    },
  );
  var newCurrentStyles = [];
  var newCurrentVelocities = [];
  var newLastIdealStyles = [];
  var newLastIdealVelocities = [];

  for (var i = 0; i < newMergedPropsStyles.length; i++) {
    var newMergedPropsStyleCell = newMergedPropsStyles[i];
    var foundOldIndex = null;

    for (var j = 0; j < oldMergedPropsStyles.length; j++) {
      if (oldMergedPropsStyles[j].key === newMergedPropsStyleCell.key) {
        foundOldIndex = j;
        break;
      }
    } // TODO: key search code

    if (foundOldIndex == null) {
      var plainStyle = willEnter(newMergedPropsStyleCell);
      newCurrentStyles[i] = plainStyle;
      newLastIdealStyles[i] = plainStyle;
      var velocity = (0, _mapToZero['default'])(newMergedPropsStyleCell.style);
      newCurrentVelocities[i] = velocity;
      newLastIdealVelocities[i] = velocity;
    } else {
      newCurrentStyles[i] = oldCurrentStyles[foundOldIndex];
      newLastIdealStyles[i] = oldLastIdealStyles[foundOldIndex];
      newCurrentVelocities[i] = oldCurrentVelocities[foundOldIndex];
      newLastIdealVelocities[i] = oldLastIdealVelocities[foundOldIndex];
    }
  }

  return [
    newMergedPropsStyles,
    newCurrentStyles,
    newCurrentVelocities,
    newLastIdealStyles,
    newLastIdealVelocities,
  ];
}

var TransitionMotion =
  /*#__PURE__*/
  (function(_React$Component) {
    _inheritsLoose(TransitionMotion, _React$Component);

    // it's possible that currentStyle's value is stale: if props is immediately
    // changed from 0 to 400 to spring(0) again, the async currentStyle is still
    // at 0 (didn't have time to tick and interpolate even once). If we naively
    // compare currentStyle with destVal it'll be 0 === 0 (no animation, stop).
    // In reality currentStyle should be 400
    function TransitionMotion(props) {
      var _this;

      _this = _React$Component.call(this, props) || this;
      _this.unmounting = false;
      _this.animationID = null;
      _this.prevTime = 0;
      _this.accumulatedTime = 0;
      _this.unreadPropStyles = null;

      _this.clearUnreadPropStyle = function(unreadPropStyles) {
        var _mergeAndSync = mergeAndSync(
            _this.props.willEnter,
            _this.props.willLeave,
            _this.props.didLeave,
            _this.state.mergedPropsStyles,
            unreadPropStyles,
            _this.state.currentStyles,
            _this.state.currentVelocities,
            _this.state.lastIdealStyles,
            _this.state.lastIdealVelocities,
          ),
          mergedPropsStyles = _mergeAndSync[0],
          currentStyles = _mergeAndSync[1],
          currentVelocities = _mergeAndSync[2],
          lastIdealStyles = _mergeAndSync[3],
          lastIdealVelocities = _mergeAndSync[4];

        for (var i = 0; i < unreadPropStyles.length; i++) {
          var unreadPropStyle = unreadPropStyles[i].style;
          var dirty = false;

          for (var key in unreadPropStyle) {
            if (!Object.prototype.hasOwnProperty.call(unreadPropStyle, key)) {
              continue;
            }

            var styleValue = unreadPropStyle[key];

            if (typeof styleValue === 'number') {
              if (!dirty) {
                dirty = true;
                currentStyles[i] = _extends({}, currentStyles[i]);
                currentVelocities[i] = _extends({}, currentVelocities[i]);
                lastIdealStyles[i] = _extends({}, lastIdealStyles[i]);
                lastIdealVelocities[i] = _extends({}, lastIdealVelocities[i]);
                mergedPropsStyles[i] = {
                  key: mergedPropsStyles[i].key,
                  data: mergedPropsStyles[i].data,
                  style: _extends({}, mergedPropsStyles[i].style),
                };
              }

              currentStyles[i][key] = styleValue;
              currentVelocities[i][key] = 0;
              lastIdealStyles[i][key] = styleValue;
              lastIdealVelocities[i][key] = 0;
              mergedPropsStyles[i].style[key] = styleValue;
            }
          }
        } // unlike the other 2 components, we can't detect staleness and optionally
        // opt out of setState here. each style object's data might contain new
        // stuff we're not/cannot compare

        _this.setState({
          currentStyles: currentStyles,
          currentVelocities: currentVelocities,
          mergedPropsStyles: mergedPropsStyles,
          lastIdealStyles: lastIdealStyles,
          lastIdealVelocities: lastIdealVelocities,
        });
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

          var propStyles = _this.props.styles;
          var destStyles =
            typeof propStyles === 'function'
              ? propStyles(
                  rehydrateStyles(
                    _this.state.mergedPropsStyles,
                    _this.unreadPropStyles,
                    _this.state.lastIdealStyles,
                  ),
                )
              : propStyles; // check if we need to animate in the first place

          if (
            shouldStopAnimationAll(
              _this.state.currentStyles,
              destStyles,
              _this.state.currentVelocities,
              _this.state.mergedPropsStyles,
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

          var _mergeAndSync2 = mergeAndSync(
              _this.props.willEnter,
              _this.props.willLeave,
              _this.props.didLeave,
              _this.state.mergedPropsStyles,
              destStyles,
              _this.state.currentStyles,
              _this.state.currentVelocities,
              _this.state.lastIdealStyles,
              _this.state.lastIdealVelocities,
            ),
            newMergedPropsStyles = _mergeAndSync2[0],
            newCurrentStyles = _mergeAndSync2[1],
            newCurrentVelocities = _mergeAndSync2[2],
            newLastIdealStyles = _mergeAndSync2[3],
            newLastIdealVelocities = _mergeAndSync2[4];

          for (var i = 0; i < newMergedPropsStyles.length; i++) {
            var newMergedPropsStyle = newMergedPropsStyles[i].style;
            var newCurrentStyle = {};
            var newCurrentVelocity = {};
            var newLastIdealStyle = {};
            var newLastIdealVelocity = {};

            for (var key in newMergedPropsStyle) {
              if (
                !Object.prototype.hasOwnProperty.call(newMergedPropsStyle, key)
              ) {
                continue;
              }

              var styleValue = newMergedPropsStyle[key];

              if (typeof styleValue === 'number') {
                newCurrentStyle[key] = styleValue;
                newCurrentVelocity[key] = 0;
                newLastIdealStyle[key] = styleValue;
                newLastIdealVelocity[key] = 0;
              } else {
                var newLastIdealStyleValue = newLastIdealStyles[i][key];
                var newLastIdealVelocityValue = newLastIdealVelocities[i][key];

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

            newLastIdealStyles[i] = newLastIdealStyle;
            newLastIdealVelocities[i] = newLastIdealVelocity;
            newCurrentStyles[i] = newCurrentStyle;
            newCurrentVelocities[i] = newCurrentVelocity;
          }

          _this.animationID = null; // the amount we're looped over above

          _this.accumulatedTime -= framesToCatchUp * msPerFrame;

          _this.setState({
            currentStyles: newCurrentStyles,
            currentVelocities: newCurrentVelocities,
            lastIdealStyles: newLastIdealStyles,
            lastIdealVelocities: newLastIdealVelocities,
            mergedPropsStyles: newMergedPropsStyles,
          });

          _this.unreadPropStyles = null;

          _this.startAnimationIfNecessary();
        });
      };

      _this.state = _this.defaultState();
      return _this;
    }

    var _proto = TransitionMotion.prototype;

    _proto.defaultState = function defaultState() {
      var _this$props = this.props,
        defaultStyles = _this$props.defaultStyles,
        styles = _this$props.styles,
        willEnter = _this$props.willEnter,
        willLeave = _this$props.willLeave,
        didLeave = _this$props.didLeave;
      var destStyles =
        typeof styles === 'function' ? styles(defaultStyles) : styles; // this is special. for the first time around, we don't have a comparison
      // between last (no last) and current merged props. we'll compute last so:
      // say default is {a, b} and styles (dest style) is {b, c}, we'll
      // fabricate last as {a, b}

      var oldMergedPropsStyles;

      if (defaultStyles == null) {
        oldMergedPropsStyles = destStyles;
      } else {
        oldMergedPropsStyles = defaultStyles.map(function(defaultStyleCell) {
          // TODO: key search code
          for (var i = 0; i < destStyles.length; i++) {
            if (destStyles[i].key === defaultStyleCell.key) {
              return destStyles[i];
            }
          }

          return defaultStyleCell;
        });
      }

      var oldCurrentStyles =
        defaultStyles == null
          ? destStyles.map(function(s) {
              return (0, _stripStyle['default'])(s.style);
            })
          : defaultStyles.map(function(s) {
              return (0, _stripStyle['default'])(s.style);
            });
      var oldCurrentVelocities =
        defaultStyles == null
          ? destStyles.map(function(s) {
              return (0, _mapToZero['default'])(s.style);
            })
          : defaultStyles.map(function(s) {
              return (0, _mapToZero['default'])(s.style);
            });

      var _mergeAndSync3 = mergeAndSync(
          // Because this is an old-style createReactClass component, Flow doesn't
          // understand that the willEnter and willLeave props have default values
          // and will always be present.
          willEnter,
          willLeave,
          didLeave,
          oldMergedPropsStyles,
          destStyles,
          oldCurrentStyles,
          oldCurrentVelocities,
          oldCurrentStyles, // oldLastIdealStyles really
          oldCurrentVelocities, // oldLastIdealVelocities really
        ),
        mergedPropsStyles = _mergeAndSync3[0],
        currentStyles = _mergeAndSync3[1],
        currentVelocities = _mergeAndSync3[2],
        lastIdealStyles = _mergeAndSync3[3],
        lastIdealVelocities = _mergeAndSync3[4];

      return {
        currentStyles: currentStyles,
        currentVelocities: currentVelocities,
        lastIdealStyles: lastIdealStyles,
        lastIdealVelocities: lastIdealVelocities,
        mergedPropsStyles: mergedPropsStyles,
      };
    }; // after checking for unreadPropStyles != null, we manually go set the
    // non-interpolating values (those that are a number, without a spring
    // config)

    _proto.componentDidMount = function componentDidMount() {
      this.prevTime = (0, _performanceNow['default'])();
      this.startAnimationIfNecessary();
    };

    _proto.UNSAFE_componentWillReceiveProps = function UNSAFE_componentWillReceiveProps(
      props,
    ) {
      if (this.unreadPropStyles) {
        // previous props haven't had the chance to be set yet; set them here
        this.clearUnreadPropStyle(this.unreadPropStyles);
      }

      var styles = props.styles;

      if (typeof styles === 'function') {
        this.unreadPropStyles = styles(
          rehydrateStyles(
            this.state.mergedPropsStyles,
            this.unreadPropStyles,
            this.state.lastIdealStyles,
          ),
        );
      } else {
        this.unreadPropStyles = styles;
      }

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
      var hydratedStyles = rehydrateStyles(
        this.state.mergedPropsStyles,
        this.unreadPropStyles,
        this.state.currentStyles,
      );
      var renderedChildren = this.props.children(hydratedStyles);
      return (
        renderedChildren && _react['default'].Children.only(renderedChildren)
      );
    };

    return TransitionMotion;
  })(_react['default'].Component);

exports['default'] = TransitionMotion;
TransitionMotion.defaultProps = {
  willEnter: function willEnter(styleThatEntered) {
    return (0, _stripStyle['default'])(styleThatEntered.style);
  },
  // recall: returning null makes the current unmounting TransitionStyle
  // disappear immediately
  willLeave: function willLeave() {
    return null;
  },
  didLeave: function didLeave() {},
};
process.env.NODE_ENV !== 'production'
  ? (TransitionMotion.propTypes = {
      defaultStyles: _propTypes['default'].arrayOf(
        _propTypes['default'].shape({
          key: _propTypes['default'].string.isRequired,
          data: _propTypes['default'].any,
          style: _propTypes['default'].objectOf(_propTypes['default'].number)
            .isRequired,
        }),
      ),
      styles: _propTypes['default'].oneOfType([
        _propTypes['default'].func,
        _propTypes['default'].arrayOf(
          _propTypes['default'].shape({
            key: _propTypes['default'].string.isRequired,
            data: _propTypes['default'].any,
            style: _propTypes['default'].objectOf(
              _propTypes['default'].oneOfType([
                _propTypes['default'].number,
                _propTypes['default'].object,
              ]),
            ).isRequired,
          }),
        ),
      ]).isRequired,
      children: _propTypes['default'].func.isRequired,
      willEnter: _propTypes['default'].func,
      willLeave: _propTypes['default'].func,
      didLeave: _propTypes['default'].func,
    })
  : void 0;
