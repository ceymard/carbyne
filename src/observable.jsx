
let OBJ_PROTO = Object.getPrototypeOf({});

export class Observable {

  constructor(value) {
    this._listeners = [];
    this._destroyed = false;
    if (value !== undefined) this.set(value);
  }

  reset() {
    delete this._value;
  }

  /**
   * Get the value of the observable.
   */
  get() {
    return this._value;
  }

  set(value) {

    // No need to change.
    if (this._value === value) return;

    this._value = value;

    // No need to trigger if no one is listening to us.
    if (this._listeners.length === 0) return;

    for (let l of this._listeners) {
        l(value);
    }

  }

  onchange(fn) {

    // listeners are always given the current value if it is available upon subscribing.
    if (this.hasOwnProperty('_value')) fn(this._value);

    if (this._destroyed) return;

    this._listeners.push(fn);

    return () => {
      let idx = this._listeners.indexOf(fn);
      this._listeners.splice(idx, 1);
    }
  }

  // This Observable will never update anyone again.
  destroy() {
    this._destroyed = true;
    this._listeners = [];
  }

}


export class ArrayObservable {

  length = new Observable();

  constructor(a) {
    this.length = new Observable(0);
    this.update(a);
  }

  /**
   * Update this array with another array.
   * Performs optimisation ?
   * @param  {Array} arr The array with the newer values.
   */
  update(arr) {
    assert(a instanceof Array);

    // the array hasn't changed.
    if (arr === this._value);

    // empty the array ?
    for (let a of arr) {

    }

    // update the length.
    this.length.set(this._value.length);
  }

  // Get observable on position i
  // or set the object at the given position.
  at(i, v) {

  }

  destroy() {
    for (let i of this.items) {
      i.destroy();
    }
  }

}

export class ObservableObject {

  constructor(o) {
    for (let name of Object.getOwnPropertyNames(o)) {
      // For now, we don't check for recursion.
      this.define(name, o[name]);
    }
  }

  define(name, value) {
    let o = new Observable(value);
    Object.defineProperty(this, name, {
      enumerable: true,
      set: (value) => o.set(value),
      get: () => o
    })
  }

  /**
   * Bulk update of a datascope.
   */
  set(o) {

  }
}


export function o(...args) {
  let l = args.length;
  let fn = args[args.length - 1];

  // Just creating an observable.
  if (l === 1) {
    let a = args[0];
    if (a && Object.getPrototypeOf(a) === OBJ_PROTO)
      return new ObservableObject(a);
    return new Observable(a);
  }

  let deps = [];
  let res = new Observable();

  let not_resolved = 0;

  // We only get the observable objects.
  let observables = Array.prototype.slice.call(arguments, 0, arguments.length - 2);
  observables.forEach((o, i) => {
    resolved = false;
    deps.push(null);

    o.onchange((v) => {
      if (!resolved) not_resolved -= 1;
      resolved = true;
      deps[i] = v;
      if (not_resolved === 0) res.set(fn.apply(null, deps));
    });
  });

  return res;
}
