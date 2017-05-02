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
  this.$$applyAsyncQueue = [];
  this.$$applyAsyncId = null;
  this.$$postDigestQueue = [];
  this.$$phase = null;
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
          watcher.listenerFn(val, watcher.last === initWatchVal ? val : watcher.last, self);
          watcher.last = watcher.valueEq ? _.cloneDeep(val) : val;
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
  this.$beginPhase('$digest');
  if (this.$$applyAsyncId) {
    clearTimeout(this.$$applyAsyncId);
    this.$$flushApplyAsync();
  }
  do {
    while (this.$$asyncQueue.length) {
      try {
        var asyncTask = this.$$asyncQueue.shift();
        asyncTask.scope.$eval(asyncTask.expression);
      } catch (e) {
        console.error(e);
      }
    }
    dirty = this.$digestOnce();
    TTL--;
    if ((dirty || this.$$asyncQueue.length )&& !TTL) {
      throw '10 iteration reached';
    }
  } while (dirty || this.$$asyncQueue.length);
  this.$clearPhase();
  while (this.$$postDigestQueue.length) {
    try {
      this.$$postDigestQueue.shift()();
    } catch (e) {
      console.error(e);
    }
  }
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
    this.$beginPhase('$apply');
    return this.$eval(expr);
  } finally {
    this.$clearPhase();
    this.$digest();
  }
};
Scope.prototype.$evalAsync = function (expr) {
  if (!this.$$phase && !this.$$asyncQueue.length) {
    var self = this;
    setTimeout(function () {
      if (self.$$asyncQueue.length) {
        self.$digest();
      }
    }, 0);
  }
  this.$$asyncQueue.push({
    scope: this,
    expression: expr
  });
};

Scope.prototype.$beginPhase = function (phase) {
  if (this.$$phase) {
    throw this.$$phase + ' already in progress.';
  }
  this.$$phase = phase;
};
Scope.prototype.$clearPhase = function () {
  this.$$phase = null;
};
Scope.prototype.$applyAsync = function (expr) {
  var self = this;
  self.$$applyAsyncQueue.push(function () {
    self.$eval(expr);
  });
  if (!self.$$applyAsyncId) {
    self.$$applyAsyncId = setTimeout(function () {
      self.$apply(_.bind(self.$$flushApplyAsync, self));
    }, 0);
  }
};
Scope.prototype.$$flushApplyAsync = function () {
  while (this.$$applyAsyncQueue.length) {
    try {
      this.$$applyAsyncQueue.shift()();
    } catch (e) {
      console.error(e);
    }
  }
  this.$$applyAsyncId = null;
};
Scope.prototype.$$postDigest = function (fn) {
  this.$$postDigestQueue.push(fn);
};
Scope.prototype.$watchGroup = function (watchFns, listenerFn) {
  var self = this;
  var oldValues = new Array(watchFns.length);
  var newValues = new Array(watchFns.length);
  var changeReactionSheduled = false;
  var firstRun = true;
  function watchGroupListener() {
    console.log('oldValues', oldValues);
    console.log('newValues', newValues);
    if (firstRun) {
      firstRun = false;
      listenerFn(newValues, newValues, self);
    } else {
      listenerFn(newValues, oldValues, self);
    }
    changeReactionSheduled = false;
  }
  _.forEach(watchFns, function (watchFn, i) {
    self.$watch(watchFn, function (newValue, oldValue) {
      console.log('i', i);
      console.log('newValue', newValue);
      console.log('oldValue', oldValue);
      newValues[i] = newValue;
      oldValues[i] = oldValue;
      if (!changeReactionSheduled) {
        changeReactionSheduled = true;
        self.$evalAsync(watchGroupListener);
      }
    });
  });
};
module.exports = Scope;