
let OBJ_PROTO = Object.getPrototypeOf({});

export class Observable {

  constructor(value) {
    this._listeners = [];
    this._destroyed = false;
    this._waiting_promise = null;

    assert(arguments.length > 0); // an observable *must* have a value
    this.set(value);
  }

  /**
   * Get the value of the observable.
   */
  get() {
    return this._value;
  }

  set(value) {
    // FIXME need to check if the value is a promise or an observable.

    if (value instanceof Observable) value = value.get();

    if (value && value.then) {
      // This is a promise, so we're going to bind the set on its then.
      value.then((val) => this.set(val));
      return this;
    }

    // No need to change.
    if (this._value === value) return;

    this._value = value;

    // No need to trigger if no one is listening to us.
    if (this._listeners.length === 0) return;

    for (let l of this._listeners) {
      // console.log(value);
      l(value);
    }

    return this;
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

  /**
   * Optionally two-way transformer.
   * @param  {function} fnset The function that transforms the value.
   * @param  {function} fnget The function that gets the value back into the current observable.
   * @return {[type]}       [description]
   */
  transform(fnset, fnget) {
    let o = new Observable(fnset(this._value));

    let unset = this.onchange((val) => o.set(fn(val)));
    let unset_get = null;
    if (fnget) {
      unset_get = o.onchange((val) => this.set(fnget(val)));
    }

    // Unset both of them.
    return () => { unset(); unset_get && unset_get(); };
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
    let o = value instanceof Observable ? value : new Observable(value);
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
    for (let name in o) {
      if (name in this)
        this.define(name, o[name])
      else
        this[name] = o[name];
    }
  }

  get(o) {
    // rebuild this object and return it.
  }

}

export function oo(obj) {
  return new ObservableObject(obj);
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

o.all = function all(o) {
  if (Array.isArray(o))
    return o.map((e) => new Observable(e));
  else {
    let res = {};
    for (let name in o)
      res[name] = new Observable(o[name]);
    return res;
  }
}

/**
 * Get the current value of the observable, or the value itself if the
 * provided parameter was not an observable.
 * @param  {[type]} v [description]
 * @return {[type]}   [description]
 */
o.get = function get(v) {
  if (v instanceof Observable) return v.get();
  return v;
};


/**
 * Setup an onchange event on the observable, or just call the
 * onchange value once if the provided o is not an observable.
 * @param  {[type]}   o  [description]
 * @param  {Function} fn [description]
 * @return {[type]}      [description]
 */
o.onchange = function onchange(o, fn) {
  if (o instanceof Observable) return o.onchange(fn);
  // the object is not observable, so the onchange value is immediately called.
  fn(o);
  // return a function that does nothing, since nothing is being registered.
  return function() { };
}
