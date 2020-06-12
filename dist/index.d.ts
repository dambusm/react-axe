import axeCore = require('axe-core');
declare let React: any;
declare let ReactDOM: any;
/**
 * Run axe against all changes made in a React app.
 * @parma {React} _React React instance
 * @param {ReactDOM} _ReactDOM ReactDOM instance
 * @param {Number} _timeout debounce timeout in milliseconds
 * @parma {Spec} conf axe.configure Spec object
 * @param {ElementContext} _context axe ElementContent object
 */
declare function reactAxe(
  _React: typeof React,
  _ReactDOM: typeof ReactDOM,
  _timeout: number,
  conf: axeCore.Spec,
  _context: axeCore.ElementContext
): Promise<void>;
export = reactAxe;
