/**
 * Created by fjywan on 17/3/28.
 */

"use strict";
var Scope = require('../src/scope');
var _ = require('lodash');
describe('Scope', function () {
  it('can be constructed and used as an object', function () {
    var scope = new Scope();
    scope.aProperty = 1;
    expect(scope.aProperty).toBe(1);
  });
  describe('digest', function() {
    var scope;
    beforeEach(function () {
      scope = new Scope();
    });
    it('calls the listener function of a watch on first $digest', function () {
      var watchFn = function () {
        return 'wat';
      };
      var listenerFn = jasmine.createSpy();
      scope.$watch(watchFn, listenerFn);
      scope.$digest();
      expect(listenerFn).toHaveBeenCalled();
    });
    it('calls the watch function with the scope as the argument', function () {
      var watchFn = jasmine.createSpy();
      var listenerFn = function () {

      };
      scope.$watch(watchFn, listenerFn);
      scope.$digest();
      expect(watchFn).toHaveBeenCalledWith(scope);
    });
    it('calls the listenerFn when the watched value changes', function () {
      scope.someVal = 'a';
      scope.counter = 0;
      scope.$watch(function (scope) {
        return scope.someVal;
      }, function (newValue, oldValue, scope) {
        scope.counter++;
      });
      expect(scope.counter).toBe(0);
      scope.$digest();
      expect(scope.counter).toBe(1);
      scope.$digest();
      expect(scope.counter).toBe(1);
      scope.someVal = 'b';
      expect(scope.counter).toBe(1);
      scope.$digest();
      expect(scope.counter).toBe(2);
    });
    it('calls listener with new value as old value the first time', function () {
      var firstOldVal;
      scope.someVal = 'a';
      scope.$watch(function(scope) {
        return scope.someVal;
      }, function (newVal, oldVal, scope) {
        firstOldVal = oldVal;
      });
      scope.$digest();
      expect(firstOldVal).toBe('a');
    });
    it('may have wachers that omit the listener function', function () {
      var watchFn = jasmine.createSpy();
      scope.$watch(watchFn);
      scope.$digest();
      expect(watchFn).toHaveBeenCalled();
    });
    it('triggers chained watchers in the same digest', function () {
      scope.val1 = 'a';
      scope.val2 = 'b';
      var count = 0;
      scope.$watch(function(scope) {
        return scope.val1;
      }, function(newVal, oldVal, scope) {
        count++;
      });
      scope.$watch(function (scope) {
        return scope.val2;
      }, function (newVal, oldVal, scope) {
        scope.val1 = 'change';
      });
      scope.$digest();
      expect(count).toBe(2);
    });
    it('give up on the watches after 10 iterations', function () {
      scope.a = 0;
      scope.b = 0;
      scope.$watch(function (scope) {
        return scope.a;
      }, function (newVal, oldVal, scope) {
        scope.b++;
      });
      scope.$watch(function (scope) {
        return scope.b;
      }, function (newVal, oldVal, scope) {
        scope.a++;
      });
      expect(scope.$digest).toThrow();
    });
    it('ends the digest when the last watch is clean at next digest', function () {
      var count = 0;
      scope.array = _.range(100);
      _.times(100, function (i) {
        scope.$watch(function (scope) {
          count++;
          return scope.array[i];
        });
      });
      scope.$digest();
      expect(count).toBe(200);
      scope.array[0] = 111111;
      scope.$digest();
      expect(count).toBe(301);
    });
    it('does not end digest so that new watches will run', function () {
      var count = 0;
      scope.val = 1;
      scope.val2 = 2;
      var ddd = 0;
      scope.$watch(function (scope) {
        ddd++;
        return scope.val;
      }, function (newVal, oldVal, scope) {
        scope.$watch(function (scope) {
          return scope.val;
        }, function() {
          count++;
        });
      });
      scope.$digest();
      expect(count).toBe(1);
    });
    it('compares based on value if enabled', function() {
      scope.aVal = [1,2,3];
      var count = 0;
      scope.$watch(function (scope) {
        return scope.aVal;
      }, function (newVal, oldVal, scope) {
        count++;
      }, true);
      scope.$digest();
      expect(count).toBe(1);
      scope.aVal.push(4);
      scope.$digest();
      expect(count).toBe(2);
    });
    it('correctly handles NaNs', function () {
      scope.aVal = 0/0;
      var count = 0;
      scope.$watch(function (scope) {
        return scope.aVal;
      }, function () {
        count++;
      });
      scope.$digest();
      expect(count).toBe(1);
      scope.$digest();
      expect(count).toBe(1);
    });
    it('catches exceptions in watch function and continues', function () {
      scope.aVal = 'a';
      var count = 0;
      scope.$watch(function (scope) {
        throw 'error';
      }, function (newVal, oldVal, scope) {
      });
      scope.$watch(function (scope) {
        return scope.aVal;
      }, function (newVal, oldVal, scope) {
        count++;
      });
      scope.$digest();
      expect(count).toBe(1);

    });
    it('catches exceptions in listener function and continues', function () {
      scope.aVal = 'a';
      var count = 0;
      scope.$watch(function (scope) {
        return scope.aVal;
      }, function() {
        throw 'error';
      });
      scope.$watch(function (scope) {
        return scope.aVal;
      }, function () {
        count++;
      });
      scope.$digest();
      expect(count).toBe(1);
    });
    it('allows destroying a $watch with a removal function', function () {
      scope.aVal = 'a';
      var count = 0;
      var destroyWatch = scope.$watch(function (scope) {
        return scope.aVal;
      }, function () {
        count++;
      });
      scope.$digest();
      expect(count).toBe(1);
      scope.aVal = 'b';
      scope.$digest();
      expect(count).toBe(2);
      scope.aVal = 'c';
      destroyWatch();
      scope.$digest();
      expect(count).toBe(2);
    });
    it('allows destroying a $watch during digest', function () {
      scope.aVal = 'a';
      var watchCall = [];
      scope.$watch(function (scope) {
        watchCall.push('first');
        return scope.aVal;
      });
      var destroyFn = scope.$watch(function (scope) {
        watchCall.push('second');
        destroyFn();
      });
      scope.$watch(function (scope) {
        watchCall.push('third');
        return scope.aVal;
      });
      scope.$digest();
      expect(watchCall).toEqual(['first', 'second', 'third', 'first', 'third']);
    });
    it('allows a $watch destroy another during digest', function () {
      scope.aVal = 'a';
      var count = 0;
      scope.$watch(function (scope) {
        return scope.aVal;
      }, function () {
        destroyFn();
      });
      var destroyFn = scope.$watch(function (scope) {

      }, function () {
      });
      scope.$watch(function (scope) {
        return scope.aVal;
      }, function() {
        count++;
      });
      scope.$digest();
      expect(count).toBe(1);
    });
    it('allows destroying several $watches during digest', function () {
      scope.aVal = 'a';
      var count = 0;
      var destroyFn1 = scope.$watch(function () {
        destroyFn1();
        destroyFn2();
      });
      var destroyFn2 = scope.$watch(function (scope) {
        return scope.aVal;
      }, function () {
        count++;
      });
      scope.$digest();
      expect(count).toBe(0);
    });
  });

  describe('$eval', function () {
    var scope;
    beforeEach(function () {
      scope = new Scope();
    });

    it('execute $eval function anf returns result', function () {
      scope.aVal = 3;
      var result = scope.$eval(function (scope) {
        return scope.aVal;
      });
      expect(result).toBe(3);
    });
    it('pass the second $eval args straight through', function () {
      scope.aVal = 3;
      var result = scope.$eval(function (scope, arg) {
        return scope.aVal + arg;
      }, 3);
      expect(result).toBe(6);
    });
  });
  
  describe('$apply', function () {
    var scope;
    beforeEach(function () {
      scope = new Scope();
    });
    it('execute the given function and starts the digest', function () {
      scope.aVal = 3;
      scope.counter = 0;
      scope.$watch(function (scope) {
        return scope.aVal;
      }, function (newVal, oldVal, scope) {
        scope.counter++;
      });
      scope.$digest();
      expect(scope.counter).toBe(1);
      scope.$apply(function (scope) {
        scope.aVal = 6;
      });
      expect(scope.counter).toBe(2);
    });
  });
  describe('$evalAsync', function () {
    var scope;
    beforeEach(function () {
      scope = new Scope();
    });
    it('execute given function later in the same cycle', function () {
      scope.aVal = 3;
      scope.evaluateImmediately = false;
      scope.evaluateAsync = false;
      scope.$watch(function (scope) {
        return scope.aVal;
      }, function (newVal, oldVal, scope) {
        scope.$evalAsync(function (scope) {
          scope.evaluateAsync = true;
        });
        scope.evaluateImmediately = scope.evaluateAsync
      });
      scope.$digest();
      expect(scope.evaluateAsync).toBe(true);
      expect(scope.evaluateImmediately).toBe(false);
    });
  });
});
