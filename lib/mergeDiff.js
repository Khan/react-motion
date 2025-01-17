'use strict';

exports.__esModule = true;
exports['default'] = mergeDiff;

// core keys merging algorithm. If previous render's keys are [a, b], and the
// next render's [c, b, d], what's the final merged keys and ordering?
// - c and a must both be before b
// - b before d
// - ordering between a and c ambiguous
// this reduces to merging two partially ordered lists (e.g. lists where not
// every item has a definite ordering, like comparing a and c above). For the
// ambiguous ordering we deterministically choose to place the next render's
// item after the previous'; so c after a
// this is called a topological sorting. Except the existing algorithms don't
// work well with js bc of the amount of allocation, and isn't optimized for our
// current use-case bc the runtime is linear in terms of edges (see wiki for
// meaning), which is huge when two lists have many common elements
function mergeDiff(prev, next, onRemove) {
  // bookkeeping for easier access of a key's index below. This is 2 allocations +
  // potentially triggering chrome hash map mode for objs (so it might be faster
  // to loop through and find a key's index each time), but I no longer care
  var prevKeyIndex = {};

  for (var i = 0; i < prev.length; i++) {
    prevKeyIndex[prev[i].key] = i;
  }

  var nextKeyIndex = {};

  for (var _i = 0; _i < next.length; _i++) {
    nextKeyIndex[next[_i].key] = _i;
  } // first, an overly elaborate way of merging prev and next, eliminating
  // duplicates (in terms of keys). If there's dupe, keep the item in next).
  // This way of writing it saves allocations

  var ret = [];

  for (var _i2 = 0; _i2 < next.length; _i2++) {
    ret[_i2] = next[_i2];
  }

  for (var _i3 = 0; _i3 < prev.length; _i3++) {
    if (!Object.prototype.hasOwnProperty.call(nextKeyIndex, prev[_i3].key)) {
      // this is called my TM's `mergeAndSync`, which calls willLeave. We don't
      // merge in keys that the user desires to kill
      var fill = onRemove(_i3, prev[_i3]);

      if (fill != null) {
        ret.push(fill);
      }
    }
  } // now all the items all present. Core sorting logic to have the right order

  return ret.sort(function(a, b) {
    var nextOrderA = nextKeyIndex[a.key];
    var nextOrderB = nextKeyIndex[b.key];
    var prevOrderA = prevKeyIndex[a.key];
    var prevOrderB = prevKeyIndex[b.key];

    if (nextOrderA != null && nextOrderB != null) {
      // both keys in next
      return nextKeyIndex[a.key] - nextKeyIndex[b.key];
    } else if (prevOrderA != null && prevOrderB != null) {
      // both keys in prev
      return prevKeyIndex[a.key] - prevKeyIndex[b.key];
    } else if (nextOrderA != null) {
      // key a in next, key b in prev
      // how to determine the order between a and b? We find a "pivot" (term
      // abuse), a key present in both prev and next, that is sandwiched between
      // a and b. In the context of our above example, if we're comparing a and
      // d, b's (the only) pivot
      for (var _i4 = 0; _i4 < next.length; _i4++) {
        var pivot = next[_i4].key;

        if (!Object.prototype.hasOwnProperty.call(prevKeyIndex, pivot)) {
          continue;
        }

        if (
          nextOrderA < nextKeyIndex[pivot] &&
          prevOrderB > prevKeyIndex[pivot]
        ) {
          return -1;
        } else if (
          nextOrderA > nextKeyIndex[pivot] &&
          prevOrderB < prevKeyIndex[pivot]
        ) {
          return 1;
        }
      } // pluggable. default to: next bigger than prev

      return 1;
    } // prevOrderA, nextOrderB

    for (var _i5 = 0; _i5 < next.length; _i5++) {
      var _pivot = next[_i5].key;

      if (!Object.prototype.hasOwnProperty.call(prevKeyIndex, _pivot)) {
        continue;
      }

      if (
        nextOrderB < nextKeyIndex[_pivot] &&
        prevOrderA > prevKeyIndex[_pivot]
      ) {
        return 1;
      } else if (
        nextOrderB > nextKeyIndex[_pivot] &&
        prevOrderA < prevKeyIndex[_pivot]
      ) {
        return -1;
      }
    } // pluggable. default to: next bigger than prev

    return -1;
  });
}
