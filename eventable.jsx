
var ident = 0;


export class Eventable {

	constructor() {
    this._listeners = {};
	}

  /////////////////////////////////////////////////////////////////

  _mkEvent(event) {
    if (typeof event === 'string')
      return {
        type: event,
        target: this,
        prevent_default: false,
        preventDefault() { this.prevent_default = true; },
        propagating: true,
        stopPropagation() { this.propagating = false; },
    };
    let e = {};
    for (let x in event)
      e[x] = event[x];
    return e;
  }

  on(name, fn) {
    if (!(name in this._listeners)) this._listeners[name] = {};
    fn.$$ident = ident++;
    this._listeners[name][fn.$$ident] = fn;
  }

  off(name, fn) {
    delete (this._listeners[name]||{})[fn.$$ident||'---'];
  }

  once(name, fn) {
    let self = this;
    let cbk = function () {
      fn.apply(this, arguments);
      self.off(name, cbk);
    }
    this.on(name, cbk);
  }

  trigger(event, ...args) {
    event = this._mkEvent(event);
    let listeners = this._listeners[event.type] || {};

    for (let id in listeners)
      listeners[id].call(this, event, ...args);

    return this;
  }


}