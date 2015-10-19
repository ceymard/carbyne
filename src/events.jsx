/**
 * Very lightweight event.
 */

export class Eventable {

  constructor() {
    this._listeners = {};
  }

  on(name, fn) {
    let lst = this._listeners[name];
    if (!(name in this._listeners))
      lst = this._listeners[name] = [];
    lst.push(fn);
    return this.off.bind(this, name, fn);
  }

  allOff(name) {
    if (!name) this._listeners = {};
    else  this._listeners[name] = [];
  }

  off(name, fn) {
    let lst = this._listeners[name];
    if (!lst) return;
    let idx = lst.indexOf(fn);
    if (idx > -1) lst.splice(idx, 1);
  }

  once(name, fn) {
    return this.on(name, function () {
      fn.apply(this, arguments);
      this.off(name, fn);
    });
  }

  trigger(name, ...args) {
    for (let l of (this._listeners[name]||[]))
      l.apply(this, args);
  }

}
