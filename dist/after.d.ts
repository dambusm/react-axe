/// <reference types="react" />
declare function after(host: React.Component, name: string, cb: Function): void;
declare namespace after {
  var restorePatchedMethods: () => void;
}
export = after;
