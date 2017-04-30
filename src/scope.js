/**
 * Created by fjywan on 17/3/28.
 */
"use strict";
var _ = require('lodash');

var initWatchVal = function () {

};
function Scope() {
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
  this.$$asyncQueue = [];
}

Scope.prototype.$watch = function (watchFn, listenerFn, valueEq) {
  var self = this;
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn || function () {
    },
    valueEq: !!valueEq,
    last: initWatchVal
  };
  this.$$watchers.unshift(watcher);
  this.$$lastDirtyWatch = null;
  return function() {
    var index = self.$$watchers.indexOf(watcher);
    if (index >= 0) {
      self.$$watchers.splice(index, 1);
      self.$$lastDirtyWatch = null;
    }
  };
};
Scope.prototype.$digestOnce = function () {
  var dirty = false;
  var self = this;
  _.forEachRight(this.$$watchers, function (watcher) {
    try{
      if (watcher) {
        var val = watcher.watchFn(self);
        if (!self.$$areEqual(val, watcher.last, watcher.valueEq)) {
          self.$$lastDirtyWatch = watcher;
          watcher.last = watcher.valueEq ? _.cloneDeep(val) : val;
          watcher.listenerFn(val, watcher.last === initWatchVal ? val : watcher.last, self);
          dirty = true;
        } else {
          if (watcher === self.$$lastDirtyWatch) {
            return false;
          }
        }
      }
    } catch(e) {
      console.error(e);
    }
  });

  return dirty;
};
Scope.prototype.$digest = function () {
  this.$$lastDirtyWatch = null;
  var TTL = 10;
  var dirty = false;
  do {
    while (this.$$asyncQueue.length) {
      var asyncTask = this.$$asyncQueue.shift();
      asyncTask.scope.$eval(asyncTask.expression);
    }
    dirty = this.$digestOnce();
    TTL--;
    if ((dirty || this.$$asyncQueue.length )&& !TTL) {
      throw '10 iteration reached';
    }
  } while (dirty || this.$$asyncQueue.length);
};
Scope.prototype.$$areEqual = function (newVal, oldVal, valueEq) {
  if (valueEq) {
    return _.isEqual(newVal, oldVal);
  } else {
    return newVal === oldVal ||
      (typeof newVal === 'number' && typeof oldVal === 'number' && isNaN(newVal) && isNaN(oldVal));
  }
};
Scope.prototype.$eval = function (expr, locals) {
  return expr(this, locals);
};
Scope.prototype.$apply = function (expr) {
  try {
    return this.$eval(expr);
  } finally {
    this.$digest();
  }
};
Scope.prototype.$evalAsync = function (expr) {
  this.$$asyncQueue.push({
    scope: this,
    expression: expr
  });
};
module.exports = Scope;