
export class Observable {

  constructor(value) {
    this._listeners = [];
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

  changed(fn) {
    this._listeners.push(fn);

    // listeners are always given the current value if it is available upon subscribing.
    if (this.hasOwnProperty('_value')) fn(this._value);
  }

  unsubscribe(fn) {
    let idx = this._listeners.indexOf(fn);
    if (idx > -1) this._listeners.splice(idx, 1);
  }

  /**
   * Remove all listeners and prepare to free the object.
   */
  destroy() {
    delete this._listeners;
    delete this._value;
  }

}


export class ArrayObservable {

  constructor(a) {
    this.length = new Observable(0);
    this.update(a);
  }

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


/**
 * This object only creates keys whenever they are needed.
 */
export class ObjectObservable {

  constructor(obj) {
    this.update(obj);
  }

  update(obj) {
    for (let name in obj) {
      if (this[name])
        this[name].set(obj[name]);
      else
        this[name] = obs(obj[name]);
    }
  }

}

export function obs(o) {
  let cls = null;

  if (o instanceof Array) {
    cls = ArrayObservable;
  } else if (o instanceof Date) {
    cls = Observable;
  } else if (typeof o === 'object') {
    cls = ObjectObservable;
  } else {
    cls = Observable;
  }

  return new cls(o);
}

export function o(...args) {
  let l = args.length;
  let fn = args[args.length - 1];
  let deps = [];

  for (let i = 0; i < l - 2; i++) {
      // compute the dependencies here.
  }
}
