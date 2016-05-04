const {pathget, pathset, identity, pathjoin, exists} = require('./helpers')


const IS_CHILD = 1
const IS_ANCESTOR = 2
const IS_UNRELATED = 3

function _get_ancestry(p1, p2) {
  p1 = '' + (p1 || '')
  p2 = '' + (p2 || '')

  // XXX indexOf is *slow*
  if (p1.indexOf(p2) === 0)
    return IS_CHILD // p1 is a child of p2

  if (p2.indexOf(p1) === 0)
    return IS_ANCESTOR // p1 is an ancestor of p2

  return IS_UNRELATED
}

// made to be used by Observable transformers so that they
// give booleans or use transformer functions when true
function _bool_or_tf(prop, cond, tf) {
  if (typeof prop !== 'string') {
    tf = prop
    prop = null
  }

  return this.transform(prop, val => {
    if (tf) return cond(val) ? tf(val) : null
    return cond(val)
  })
}

/**
 *
 */
export class Observable {

  constructor(value) {
    this._value = value
    this._observers = []
  }

  get(prop) {
    return pathget(this._value, prop)
  }

  set(prop, value) {

    if (arguments.length === 1) {
      value = prop
      prop = null
    }

    // if (value instanceof Observable) value = value._value

    let changed = false

    if (prop) {
      changed = pathset(this._value, prop, value)
    } else {
      changed = this._value !== value
      this._value = value
    }

    if (changed) {
      this._change(prop)
    }

  }

  _change(prop) {
    const val = this._value
    const obss = this._observers
    prop = (prop||'').toString()
    for (var i = 0; i < obss.length; i++)
      obss[i](val, prop)
  }

  addObserver(fn) {
    this._observers.push(fn)
    fn(this._value)
    return this.removeObserver.bind(this, fn)
  }

  removeObserver(fn) {
    const index = this._observers.indexOf(fn)
    if (index > -1) {
      this._observers.splice(index, 1)
      return true
    }
    return false
  }

  prop(prop) {
    if (!exists(prop)) return this
    return new PropObservable(this, prop)
  }

  transform(prop, transformer) {

    if (arguments.length === 1) {
      transformer = prop
      prop = null
    }

    if (!transformer.get) {
      transformer = {get: transformer, set: null}
    }

    const obs = prop ? this.prop(prop) : this
    return new TransformObservable(obs, transformer)
  }

  gt(prop, value) {
    if (arguments.length === 1) { value = prop; prop = null }
    return this.transform(prop, {get: val => val > value})
  }

  lt(prop, value) {
    if (arguments.length === 1) { value = prop; prop = null }
    return this.transform(prop, {get: val => val < value})
  }

  eq(prop, value) {
    if (arguments.length === 1) { value = prop; prop = null }
    return this.transform(prop, {get: val => val === value})
  }

  gte(prop, value) {
    if (arguments.length === 1) { value = prop; prop = null }
    return this.transform(prop, {get: val => val >= value})
  }

  lte(prop, value) {
    if (arguments.length === 1) { value = prop; prop = null }
    return this.transform(prop, {get: val => val <= value})
  }

  not(prop) {
    if (arguments.length === 1) { value = prop; prop = null }
    return this.transform(prop, {get: val => !val})
  }

  /**
   * True if the observed value is neither null, undefined or empty string.
   */
  exists(prop, tf) {
    return _bool_or_tf.call(this,
      prop,
      val => val !== null && val !== 0 && val !== '' && val !== undefined,
      tf)
    // return this.transform(prop, {get: val => val != null})
  }

  isNotNull(prop, tf) {
    return _bool_or_tf.call(this, prop, val => val !== null && val !== undefined, tf)
  }

  isNull(prop, tf) {
    return _bool_or_tf.call(this, prop, val => val === null, tf)
  }

  isUndefined(prop, tf) {
    return _bool_or_tf.call(this, prop, val => val === undefined, tf)
  }

  isDefined(prop, tf) {
    return _bool_or_tf.call(this, prop, val => val !== undefined, tf)
  }

  isFalse(prop, tf) {
    return _bool_or_tf.call(this, prop, val => val === false)
  }

  isTrue(prop, tf) {
    return _bool_or_tf.call(this, prop, val => val === true, tf)
  }

  isEmpty(prop) {
    return _bool_or_tf.call(this, prop, val => !val)
  }

  and(...obs) {
    return o(this, ...obs, (...args) => {
      for (let o of args) if (!o) return false
      return args[args.length - 1]
    });
  }

  equals(prop, value) {
    return _bool_or_tf.call(this, prop, val => val === value)
  }

  or(...obs) {
    return o(this, ...obs, (...args) => {
      for (let o of args) if (o) return o
      return false
    })
  }

  map(prop, fn) {
    if (fn === undefined) {
      fn = prop
      prop = null
    }
    return this.transform(prop, {get: arr => Array.isArray(arr) ? arr.map(fn) : []})
  }

  filter(prop, fn) {
    // FIXME should we warn the user if something is given that is not an array ?
    // for instance the value could be an array, null or undefined, but not anything
    // else (which would then generate a warning in the console ?)
    if (fn === undefined) {
      fn = prop
      prop = null
    }
    return this.transform(prop, {get: arr => Array.isArray(arr) ? arr.map(filter) : []})
  }

  /////////////////////////////////////////////////////////////////////////
  // Some array functions

  push() {
    let res = this._value.push(...arguments)
    this._change(this._value.length - 1)
    this._change('length')
    return res
  }

  pop() {
    let res = this._value.pop()
    this._change(this._value.length)
    this._change('length')
    return res
  }

  shift() {
    let res = this._value.shift(...arguments)
    this._change(null)
    this._change('length')
    return res
  }

  unshift() {
    let res = this._value.unshift(...arguments)
    this._change(null)
    this._change('length')
    return res
  }

  sort() {
    let res = this._value.sort(...arguments)
    this._change(null)
    return res
  }

  splice() {
    let res = this._value.splice(...arguments)
    this._change(null)
    this._change('length')
    return res
  }

  reverse() {
    let res = this._value.reverse(...arguments)
    this._change(null)
    return res
  }

  // FIXME should we do reduce ?

  // Some basic modification functions
  inc(inc) {
    this.set(this._value + inc)
  }

  dec(dec) {
    this.set(this._value - dec)
  }

  mult(coef) {
    this.set(this._value * coef)
  }

  div(coef) {
    this.set(this._value / coef)
  }

  mod(m) {
    this.set(this._value % m)
  }

}

Observable.prototype.tf = Observable.prototype.transform
Observable.prototype.p = Observable.prototype.prop
Observable.prototype.path = Observable.prototype.prop


export class PropObservable extends Observable {

  constructor(obs, prop) {
    super(undefined)
    this._prop = "" + prop // force prop as a string
    this._obs = obs
  }

  get(prop) {
    if (!this._unregister) {
      this._refresh()
      // this._value = this._obs.get(this._prop)
    }
    return pathget(this._value, prop)
  }

  _refresh(ancestry, prop) {
    const old_val = this._value
    const new_val = this._value = this._obs.get(this._prop)

    // if changed_prop is a sub property of this prop, then we will change
    // automaticaly.
    // if changed_prop is a parent property, then we're going to try to refresh
    // but the observers won't necessarily be called, since we may not have
    // changed.
    const changed = ancestry === IS_ANCESTOR || old_val !== new_val
    const subprop = ancestry === IS_ANCESTOR ? prop.replace(this._prop + '.', '') : null

    if (changed) {
      var obs = this._observers
      var i = null
      for (i = 0; i < obs.length; i++)
        obs[i](new_val, subprop)
    }
  }

  set(prop, value) {
    // Forward the set to the parent observable.
    if (arguments.length === 1) {
      value = prop
      prop = null
    }

    this._obs.set(pathjoin(this._prop, prop), value)
  }

  addObserver() {
    if (!this._unregister) {
      this._unregister = this._obs.addObserver((value, prop) => {
        // Link observable changes to us.
        const ancestry = _get_ancestry(this._prop, prop)
        // console.log(ancestry, this._prop, prop)
        // if changed_prop has nothing to do with us, then just ignore the set.
        if (ancestry === IS_UNRELATED) return

        this._refresh(ancestry, prop)
      })
    }

    return super.addObserver(...arguments)
  }

}


export class TransformObservable extends Observable {

  constructor(obs, transformer) {
    super(undefined) // !!!
    this._obs = obs
    this._transformer = transformer
    this._unregister = null
  }

  get(prop) {

    if (!this._unregister) {
      // Nobody is watching this observable, so it is not up to date.
      this._value = this._transformer.get(this._obs.get())
    }

    return this._value
  }

  _refresh(value) {
    const old_val = this._value
    const new_val = this._value = this._transformer.get(value)
    const changed = old_val !== new_val
    var i = null
    var obs = this._observers

    if (changed) {
      var i = null
      for (i = 0; i < obs.length; i++) obs[i](new_val, null)
    }
  }

  /**
   * The transform observable does not set itself directly. Instead, it
   * forwards the set to its observed.
   */
  set(prop, value) {

    if (arguments.length > 1) {
      throw new Error('transformers cannot set subpath')
    }

    value = prop
    prop = null

    this._obs.set(this._transformer.set(value))

  }

  addObserver(fn) {
    if (!this._unregister) {
      this._unregister = this._obs.addObserver(value => this._refresh(value))
    }
    return super.addObserver(...arguments)
  }

  removeObserver(fn) {
    super.removeObserver(...arguments)
    if (this._observers.length === 0) {
      this._unregister()
      this._unregister = null
    }
  }

}


export class DependentObservable extends Observable {

  constructor(deps, fn) {
    super(undefined)

    this._resolved = null
    this._unregister = []
    this._deps = deps
    this._fn = fn

    this._ignore_updates = false
  }

  get(prop) {
    if (this._observers.length === 0) this._refresh()
    return pathget(this._value, prop)
  }

  set() {
    throw new Error('cannot set on a DependentObservable')
  }

  _refresh() {
    if (this._ignore_updates) return
    const old_val = this._value
    const resolved = this._resolved || this._deps.map(dep => o.get(dep))
    const new_val = this._value = this._fn(...resolved)
    const obs = this._observers
    var i = 0

    if (old_val === new_val) return

    for (i = 0; i < obs.length; i++) obs[i](new_val)
  }

  addObserver(fn) {
    if (this._observers.length === 0) {
      // Set up the observing.

      this._resolved = []
      let idx = -1
      this._ignore_updates = true
      for (let obs of this._deps) {
        idx++

        if (!(obs instanceof Observable)) {
          this._resolved.push(obs)
          continue
        }

        this._unregister.push(obs.addObserver(((idx, value) => {
          this._resolved[idx] = value
          this._refresh()
        }).bind(this, idx)))
      }
      this._ignore_updates = false
      this._refresh()
    }

    return super.addObserver(...arguments)
  }

  removeObserver() {
    super.removeObserver(...arguments)
    if (this._observers.length === 0) {
      for (let un of this._unregister) un()
      this._unregister = []
      this._resolved = null
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
  let l = args.length

  // Just creating an observable.
  if (l === 1) {
    let a = args[0]
    if (a instanceof Observable) return a
    return new Observable(a)
  }

  let fn = args[args.length - 1]
  let deps = Array.prototype.slice.call(arguments, 0, arguments.length - 1)
  let has_obs = false

  let i = 0
  // See if one of the dependency has observables.
  for (i = 0; i < deps.length; i++) {
    if (deps[i] instanceof Observable) {
      has_obs = true
      break
    }
  }

  // If there is no observer, directly return the result of applying the function
  // with its arguments.
  // if (!has_obs) return fn.apply(this, deps)

  let res = new DependentObservable(
    deps,
    fn
  )

  return res
}


/**
 * Force the array or object to only contain Obervables.
 */
o.all = function all(arg) {
  if (Array.isArray(arg))
    return arg.map((e) => o(e))
  else {
    let res = {}
    for (let name in arg)
      res[name] = o(arg[name])
    return res
  }
}

/**
 * Get the current value of the observable, or the value itself if the
 * provided parameter was not an observable.
 */
o.get = function get(v) {
  if (v instanceof Observable) return v.get()
  return v
}


/**
 * Setup an onchange event on the observable, or just call the
 * onchange value once if the provided o is not an observable.
 */
o.observe = function observe(o, fn) {
  if (o instanceof Observable) return o.addObserver(fn)
  // the object is not observable, so the onchange value is immediately called.
  fn(o)
  // return a function that does nothing, since nothing is being registered.
  return function() { }
}
