'use strict';
/* global Promise */
var axeCore = require('axe-core');
var rIC = require('requestidlecallback');
var after = require('./after');
var requestIdleCallback = rIC.request;
var cancelIdleCallback = rIC.cancel;
var React;
var ReactDOM;
// contrasted against Chrome default color of #ffffff
var lightTheme = {
  serious: '#d93251',
  minor: '#d24700',
  text: 'black'
};
// contrasted against Safari dark mode color of #535353
var darkTheme = {
  serious: '#ffb3b3',
  minor: '#ffd500',
  text: 'white'
};
var theme =
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? darkTheme
    : lightTheme;
var boldCourier = 'font-weight:bold;font-family:Courier;';
var critical = 'color:' + theme.serious + ';font-weight:bold;';
var serious = 'color:' + theme.serious + ';font-weight:normal;';
var moderate = 'color:' + theme.minor + ';font-weight:bold;';
var minor = 'color:' + theme.minor + ';font-weight:normal;';
var defaultReset = 'font-color:' + theme.text + ';font-weight:normal;';
var idleId;
var timeout;
var context;
var _createElement;
var components = {};
var nodes = [document.documentElement];
var cache = {};
// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
// @see https://davidwalsh.name/javascript-debounce-function
function debounce(func, wait, immediate) {
  var _timeout;
  return function() {
    var _this = this;
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    var later = function() {
      _timeout = null;
      if (!immediate) func.apply(_this, args);
    };
    var callNow = immediate && !_timeout;
    clearTimeout(_timeout);
    _timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
}
/**
 * Return the entire parent tree of a node (from HTML down).
 * @param {Node} node
 * @return {Node[]}
 */
function getPath(node) {
  var path = [node];
  while (node && node.nodeName.toLowerCase() !== 'html') {
    path.push(node.parentNode);
    node = node.parentNode;
  }
  if (!node || !node.parentNode) {
    return null;
  }
  return path.reverse();
}
/**
 * Find the common parent of an array of nodes.
 * @param {Node[]} nodes
 * @return {Node}
 */
function getCommonParent(nodes) {
  var path;
  var nextPath;
  if (nodes.length === 1) {
    return nodes.pop();
  }
  while (!path && nodes.length) {
    path = getPath(nodes.pop());
  }
  while (nodes.length) {
    nextPath = getPath(nodes.pop());
    if (nextPath) {
      path = path.filter(function(node, index) {
        return nextPath.length > index && nextPath[index] === node;
      });
    }
  }
  return path ? path[path.length - 1] : document;
}
/**
 * Log the axe result node to the console
 * @param {NodeResult} node
 * @param {Function} logFn console log function to use (error, warn, log, etc.)
 */
function logElement(node, logFn) {
  var el = document.querySelector(node.target.toString());
  if (!el) {
    logFn('Selector: %c%s', boldCourier, node.target.toString());
  } else {
    logFn('Element: %o', el);
  }
}
/**
 * Log the axe result node html tot he console
 * @param {NodeResult} node
 */
function logHtml(node) {
  console.log('HTML: %c%s', boldCourier, node.html);
}
/**
 * Log the failure message of a node result.
 * @param {NodeResult} node
 * @param {String} key which check array to log from (any, all, none)
 */
function logFailureMessage(node, key) {
  // this exists on axe but we don't export it as part of the typescript
  // namespace, so just let me use it as I need
  var message = axeCore._audit.data.failureSummaries[key].failureMessage(
    node[key].map(function(check) {
      return check.message || '';
    })
  );
  console.error(message);
}
/**
 * Log as a group the node result and failure message.
 * @param {NodeResult} node
 * @param {String} key which check array to log from (any, all, none)
 */
function failureSummary(node, key) {
  if (node[key].length > 0) {
    logElement(node, console.groupCollapsed);
    logHtml(node);
    logFailureMessage(node, key);
    var relatedNodes_1 = [];
    node[key].forEach(function(check) {
      relatedNodes_1 = relatedNodes_1.concat(check.relatedNodes);
    });
    if (relatedNodes_1.length > 0) {
      console.groupCollapsed('Related nodes');
      relatedNodes_1.forEach(function(relatedNode) {
        logElement(relatedNode, console.log);
        logHtml(relatedNode);
      });
      console.groupEnd();
    }
    console.groupEnd();
  }
}
/**
 * Run axe against the passed in node and report violations
 * @param {*} node
 * @param {Number} timeout force call of axe.run after the timeout has passed (if not called before)
 * @return {Promise}
 */
function checkAndReport(node, timeout) {
  if (idleId) {
    cancelIdleCallback(idleId);
    idleId = undefined;
  }
  return new Promise(function(resolve, reject) {
    nodes.push(node);
    idleId = requestIdleCallback(
      function() {
        var n = context;
        if (n === undefined) {
          n = getCommonParent(
            nodes.filter(function(node) {
              return node.isConnected;
            })
          );
          if (n.nodeName.toLowerCase() === 'html') {
            // if the only common parent is the body, then analyze the whole page
            n = document;
          }
        }
        axeCore.run(n, { reporter: 'v2' }, function(error, results) {
          if (error) {
            return reject(error);
          }
          results.violations = results.violations.filter(function(result) {
            result.nodes = result.nodes.filter(function(node) {
              var key = node.target.toString() + result.id;
              var retVal = !cache[key];
              cache[key] = key;
              return retVal;
            });
            return !!result.nodes.length;
          });
          if (results.violations.length) {
            console.group('%cNew axe issues', serious);
            results.violations.forEach(function(result) {
              var fmt;
              switch (result.impact) {
                case 'critical':
                  fmt = critical;
                  break;
                case 'serious':
                  fmt = serious;
                  break;
                case 'moderate':
                  fmt = moderate;
                  break;
                case 'minor':
                  fmt = minor;
                  break;
                default:
                  fmt = minor;
                  break;
              }
              console.groupCollapsed(
                '%c%s: %c%s %s',
                fmt,
                result.impact,
                defaultReset,
                result.help,
                result.helpUrl
              );
              result.nodes.forEach(function(node) {
                failureSummary(node, 'any');
                failureSummary(node, 'none');
              });
              console.groupEnd();
            });
            console.groupEnd();
          }
          resolve();
        });
      },
      {
        timeout: timeout
      }
    );
  });
}
/**
 * Check the node for violations.
 * @param {Component} component
 */
function checkNode(component) {
  var node;
  try {
    node = ReactDOM.findDOMNode(component);
  } catch (e) {
    console.group('%caxe error: could not check node', critical);
    console.group('%cComponent', serious);
    console.error(component);
    console.groupEnd();
    console.group('%cError', serious);
    console.error(e);
    console.groupEnd();
    console.groupEnd();
  }
  if (node) {
    checkAndReport(node, timeout);
  }
}
/**
 * Check the component for violations whenever the DOM updates
 * @param {Component} component
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function componentAfterRender(component) {
  var debounceCheckNode = debounce(checkNode, timeout, true);
  after(component, 'componentDidMount', debounceCheckNode);
  after(component, 'componentDidUpdate', debounceCheckNode);
}
/**
 * Add a component to track.
 * @param {Component} component
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addComponent(component) {
  var reactInstance = component._reactInternalInstance || {};
  var reactInstanceDebugID = reactInstance._debugID;
  var reactFiberInstance = component._reactInternalFiber || {};
  var reactFiberInstanceDebugID = reactFiberInstance._debugID;
  if (reactInstanceDebugID && !components[reactInstanceDebugID]) {
    components[reactInstanceDebugID] = component;
    componentAfterRender(component);
  } else if (
    reactFiberInstanceDebugID &&
    !components[reactFiberInstanceDebugID]
  ) {
    components[reactFiberInstanceDebugID] = component;
    componentAfterRender(component);
  }
}
/**
 * Run axe against all changes made in a React app.
 * @parma {React} _React React instance
 * @param {ReactDOM} _ReactDOM ReactDOM instance
 * @param {Number} _timeout debounce timeout in milliseconds
 * @parma {Spec} conf axe.configure Spec object
 * @param {ElementContext} _context axe ElementContent object
 */
function reactAxe(_React, _ReactDOM, _timeout, conf, _context) {
  React = _React;
  ReactDOM = _ReactDOM;
  timeout = _timeout;
  context = _context;
  if (conf) {
    axeCore.configure(conf);
  }
  if (!_createElement) {
    _createElement = React.createElement;
    React.createElement = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      var reactEl = _createElement.apply(this, args);
      if (reactEl._owner && reactEl._owner._instance) {
        addComponent(reactEl._owner._instance);
      } else if (reactEl._owner && reactEl._owner.stateNode) {
        addComponent(reactEl._owner.stateNode);
      }
      return reactEl;
    };
  }
  return checkAndReport(document.body, timeout);
}
module.exports = reactAxe;
//# sourceMappingURL=index.js.map
