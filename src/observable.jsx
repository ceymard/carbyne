
export class Observable {

  static _captured = [];
  static enterCapture() {

  }
  static stopCapture() {

  }

  static getCaptured() {

  }

  constructor(value) {
    this._listeners = [];
    this._value = value;
  }

  /**
   * Get the value of the observable.
   */
  get() {
    this.emit('accessed'); // useful to track which observables are being
    return this._value;
  }

  set(value) {

    this._value = value;

    // No need to trigger if no one is listening to us.
    if (this._listeners.length === 0) return;

    for (let l of this._listeners) {
        l.call(this, value);
    }

  }

  destroy() {

  }

  negate() {

  }

  /**
   * Create DOM elements.
   * NOTE these elements are *not* compiled and this
   * 	method is just used to have some innerHTML given by components.
   */
  html() {

  }

}


export class ArrayObservable {

  destroy() {
    for (let i of this.items) {
      i.destroy();
    }
  }

}


/**
 * This object only creates keys whenever they are needed.
 */
export class ObjectObservable {

  constructor(obj) {
    this.update(obj);
  }

  update(obj) {

  }

}


export function o(...args) {
  let l = args.length;
  let fn = args[args.length - 1];
  let deps = [];

  for (let i = 0; i < l - 2; i++) {
      // compute the dependencies here.
  }
}
