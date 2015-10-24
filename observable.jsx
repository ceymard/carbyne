
let OBJ_PROTO = Object.getPrototypeOf({});

export class Observable {

  constructor(value) {
    this.listeners = [];
    this._destroyed = false;
    this._waiting_promise = null;

    this._value = undefined;
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
    if (this.listeners.length === 0) return;

    for (let l of this.listeners) {
      // console.log(value);
      l(value);
    }

    return this;
  }

  onchange(fn) {

    // listeners are always given the current value if it is available upon subscribing.
    if (this.hasOwnProperty('_value')) fn(this._value);

    if (this._destroyed) return;

    this.listeners.push(fn);

    return this.removeListener.bind(this, fn);
  }

  removeListener(fn) {
    let idx = this.listeners.indexOf(fn);
    if (idx > -1) this.listeners.splice(idx, 1);
  }

  // This Observable will never update anyone again.
  destroy() {
    this._destroyed = true;
    this.listeners = [];
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


/**
 * You can't set a DependentObservable
 */
export class DependentObservable extends Observable {

  constructor(deps, fn) {
    super(undefined); // by default the value is undefined.
    this.fn = fn;
    this.dependencies = [];
    this.args = [];
    this.missing = 0;

    for (let dep of deps) {
      if (dep instanceof Observable) {
        let index = this.args.length;
        let resolved = false;
        this.missing++;
        this.args.push(undefined);
        this.dependencies.push(dep.onchange((v) => {
          if (!resolved) {
            this.missing--;
            resolved = true;
          }
          this.args[index] = v;
          // If there are no missing dependencies, then just call the apply function.
          if (this.missing === 0) this.set(this.fn.apply(null, this.args));
        }));
      } else {
        this.args.push(dep);
      }
    }

    if (this.missing === 0) this.set(this.fn.apply(null, this.args));

  }

  removeListener(fn) {
    super(fn);
    if (this.listeners.length === 0)
      for (d of this.dependencies) d(); // unregister all the dependencies.
  }
}


export function oo(obj) {
  return new ObservableObject(obj);
}

export function o(...args) {
  let l = args.length;

  // Just creating an observable.
  if (l === 1) {
    let a = args[0];
    if (a instanceof Observable) return a;
    return new Observable(a);
  }

  let fn = args[args.length - 1];
  let res = new DependentObservable(
    Array.prototype.slice.call(arguments, 0, arguments.length - 1),
    fn
  );

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
