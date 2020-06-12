'use strict';
var restoreFunctions = [];
function after(host, name, cb) {
  var originalFn = host[name];
  var restoreFn;
  if (originalFn) {
    host[name] = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      originalFn.apply(this, args);
      cb(host);
    };
    restoreFn = function() {
      host[name] = originalFn;
    };
  } else {
    host[name] = function() {
      cb(host);
    };
    restoreFn = function() {
      delete host[name];
    };
  }
  restoreFunctions.push(restoreFn);
}
after.restorePatchedMethods = function() {
  restoreFunctions.forEach(function(restoreFn) {
    return restoreFn();
  });
  restoreFunctions = [];
};
module.exports = after;
//# sourceMappingURL=after.js.map
