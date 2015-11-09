
export function pathget(obj, path) {
  path = path.slice('.');
  for (let p of path) {
    if (!obj) break;
    obj = obj[p];
  }
  return obj;
}


export function pathset(obj, path, value) {
  path = path.slice('.');
  let last = path.pop();
  for (let p of path) {
    // create objects as we need it.
    if (!obj[p]) obj[p] = {};
    obj = obj[p];
  }
  obj[last] = value;
}


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

  set(value, force = false) {
    // FIXME need to check if the value is a promise or an observable.

    if (value instanceof Observable) value = value.get();

    // No need to change.
    if (!force && this._value === value) return;

    this._value = value;

    // No need to trigger if no one is listening to us.
    if (this.listeners.length === 0) return;

    for (let l of this.listeners) {
      // console.log(value);
      l(value);
    }

    return this;
  }

  addObserver(fn) {

    // listeners are always given the current value if it is available upon subscribing.
    if (this.hasOwnProperty('_value')) {
      fn(this._value);
    }

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
   * @return {Observable}  The observable object that results.
   */
  transform(fnget) {
    return new DependentObservable([this], fnget);
  }

  /**
   * Gets an observable on an object's property.
   * This is a special observable that is able to bind two ways unless
   * asked not to.
   * Like the DependentObservable, it will stop listening once it has
   * no listeners anymore.
   * It will get triggered everytime the original object is set.
   *
   * @param  {String} path The path in dot format.
   * @return {DependentObservable} The resulting observable.
   */
  path(path, oneway = false) {

    // FIXME this is not implemented !
    let o = new Observable(null);
    let unload = this.addObserver((v) => o.set(pathget(this._value, path)));
    let unload2 = o.addObserver((v) => {
      // Set path of original object.
      pathset(this._value, path, v);
      this.set(this._value, true);
    });
    return o;

  }

  oneway() {
    return new DependentObservable([this], (v) => v);
  }

}


/**
 * The DependentObservable is based on other observables (and optionnaly values too).
 * It uses a function to give its value.
 *
 * Whenever the last of its listeners unsubscribes, it unsubscribes from the
 * Observables it depends upon.
 */
export class DependentObservable extends Observable {

  constructor(deps, fnget) {
    super(undefined); // by default the value is undefined.
    this.fnget = fnget;
    this.unloaders = [];
    this.args = [];
    this.missing = 0;

    for (let dep of deps) {
      if (dep instanceof Observable) {
        let index = this.args.length;
        let resolved = false;
        this.missing++;
        this.args.push(undefined);
        this.unloaders.push(dep.addObserver((v) => {
          if (!resolved) {
            this.missing--;
            resolved = true;
          }
          this.args[index] = v;
          this._set();
        }));
      } else {
        this.args.push(dep);
      }
    }

    this._set();

  }

  _set() {
    if (this.missing === 0)
      // If there are no missing unloaders, then just call the apply function.
      Observable.prototype.set.call(this, this.fnget.apply(null, this.args));
  }

  // Override set so that this Observable can't be set.
  set(value) {
    if (this.fnset) {
      for (let d of this.dependencies)
        d.set(this.fnset(value));
    }
  }

  removeListener(fn) {
    super(fn);
    if (this.listeners.length === 0) {
      for (d of this.unloaders) d(); // unregister all the dependencies.
    }
  }
}


/**
 * This is a convenience function.
 * There are two ways of calling it :
 *
 * 	- With a single argument, it will return an observable, whether the argument
 * 		was observable or not. Which is to say that in that case, we have
 * 		o(Any|Observable) -> Observable
 *
 * 	- With several arguments, it expects the last one to be a computation function
 * 		and the first ones its dependencies. If none of the dependency is Observable,
 * 		just return the result of the computation. Otherwise return an observable
 * 		that depends on other observables.
 */
export function o(...args) {
  let l = args.length;

  // Just creating an observable.
  if (l === 1) {
    let a = args[0];
    if (a instanceof Observable) return a;
    return new Observable(a);
  }

  let fn = args[args.length - 1];
  let deps = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
  let has_obs = false;

  // See if one of the dependency has observables.
  for (let d of deps) {
    if (d instanceof Observable) {
      has_obs = true;
      break;
    }
  }

  // If there is no observer, directly return the result of applying the function
  // with its arguments.
  if (!has_obs) return fn.apply(this, deps);

  let res = new DependentObservable(
    deps,
    fn
  );

  return res;
}


/**
 * Force the array or object to only contain Obervables.
 */
o.all = function all(arg) {
  if (Array.isArray(arg))
    return arg.map((e) => o(e));
  else {
    let res = {};
    for (let name in arg)
      res[name] = o(arg[name]);
    return res;
  }
}

/**
 * Get the current value of the observable, or the value itself if the
 * provided parameter was not an observable.
 */
o.get = function get(v) {
  if (v instanceof Observable) return v.get();
  return v;
};


/**
 * Setup an onchange event on the observable, or just call the
 * onchange value once if the provided o is not an observable.
 */
o.observe = function observe(o, fn) {
  if (o instanceof Observable) return o.addObserver(fn);
  // the object is not observable, so the onchange value is immediately called.
  fn(o);
  // return a function that does nothing, since nothing is being registered.
  return function() { };
}
