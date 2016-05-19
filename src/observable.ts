
import {pathget, pathset, identity, pathjoin} from './helpers'


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


type Observer<T> = (obj : T, prop : string) => void

type TransformerObj<T, U> = {
  get: (a: T) => U
  set?: (a: U) => T
}

type TransformerFn<T, U> = (a: T) => U
type Transformer<T, U> = TransformerObj<T, U> | TransformerFn<T, U>

/**
 *
 */
export class Observable<T> {

  public _value : T
  public _observers : Array<Observer<T>>

  constructor(value : T) {
    this._value = value
    this._observers = []
  }

  get() : T {
    return this._value
  }

  getp<U>(prop) : U {
    return pathget<U>(this._value, prop)
  }

  set(value : T) {

    // if (value instanceof Observable) value = value._value

    let changed = false
    changed = this._value !== value
    this._value = value
    if (changed) {
      this._change('')
    }

  }

  setp<U>(prop : string, value : U) {

    if (pathset(this._value, prop, value))
      this._change(prop)

  }

  _change(prop : string | number) {
    const val = this._value
    const obss = this._observers
    const final_prop = (prop||'').toString()
    for (var i = 0; i < obss.length; i++)
      obss[i](val, final_prop)
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

  prop<U>(prop : string) : PropObservable<T, U> {
    return new PropObservable<T, U>(this, prop)
  }

  p(prop) {
    return this.prop.apply(this, arguments)
  }

  tf<U>(transformer : Transformer<T, U>) {
    return new TransformObservable(this, transformer)
  }

  tfp(prop : string, transformer : Transformer<T, any>) {

    let obs = this.prop(prop)
    return new TransformObservable(obs, transformer)

  }

  transform() { return this.tf.apply(this, arguments) }
  transformp() { return this.tfp.apply(this, arguments) }

  /**
   *  Boolean methods
   */

  gt(value) {
    return this.tf({get: val => val > value})
  }

  lt(value) {
    return this.tf({get: val => val < value})
  }

  eq(value) {
    return this.tf({get: val => val === value})
  }

  gte(value) {
    return this.tf({get: val => val >= value})
  }

  lte(value) {
    return this.tf({get: val => val <= value})
  }

  isNull() {
    return this.tf({get: val => val == null})
  }

  isNotNull() {
    return this.tf({get: val => val != null})
  }

  isUndefined() {
    return this.tf({get: val => val === undefined})
  }

  isDefined() {
    return this.tf({get: val => val !== undefined})
  }

  isFalse() {
    return this.tf({get: val => <any>val === false})
  }

  isTrue() {
    return this.tf({get: val => <any>val === true})
  }

  // FIXME should we do reduce ?

  // ?

  or(...args : Array<Observable<any>>) : Observable<boolean> {
    return Or(...[this, ...args])
  }

  and(...args: Array<Observable<boolean>>) : Observable<boolean> {

    return And(...[this, ...args])
  }
}

export class ArrayObservable<T> extends Observable<Array<T>> {

  /////////////////////////////////////////////////////////////////////////
  // Some array functions

  push(v: T) {
    let res = this._value.push(v)
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
    let res = this._value.shift()
    this._change(null)
    this._change('length')
    return res
  }

  unshift(v: T) {
    let res = this._value.unshift(v)
    this._change(null)
    this._change('length')
    return res
  }

  sort() {
    // FIXME sort function type
    let res = this._value.sort()
    this._change(null)
    return res
  }

  splice(start: number, deleteCount: number, ...items: Array<T>) {
    // FIXME arguments
    let res = this._value.splice(start, deleteCount, ...items)
    this._change(null)
    this._change('length')
    return res
  }

  reverse() {
    let res = this._value.reverse()
    this._change(null)
    return res
  }

  //////////////////////////////////////

  map(fn) {
    return this.tf({ get: arr => Array.isArray(arr) ? arr.map(fn) : [] })
  }

  filter(fn) {
    return this.tf({ get: arr => Array.isArray(arr) ? arr.filter(fn) : [] })
  }

}

export class NumberObservable extends Observable<number> {

  // Some basic modification functions
  add(inc) {
    this.set(this._value + inc)
  }

  sub(dec) {
    this.set(this._value - dec)
  }

  mul(coef) {
    this.set(this._value * coef)
  }

  div(coef) {
    this.set(this._value / coef)
  }

  mod(m) {
    this.set(this._value % m)
  }

}

// Observable.prototype.tf = Observable.prototype.transform
// Observable.prototype.p = Observable.prototype.prop
// Observable.prototype.path = Observable.prototype.prop


/**
 * An Observable based on another observable, watching only its subpath.
 */
export class PropObservable<T, U> extends Observable<T> {

  _prop : string
  _obs : Observable<T>
  _unregister: () => void

  constructor(obs : Observable<T>, prop : string) {
    super(undefined)
    this._prop = "" + prop // force prop as a string
    this._obs = obs
    this._unregister = null
  }

  get() {
    if (!this._unregister) this._refresh()
    return this._value
  }

  getp(prop) {
    if (!this._unregister) {
      this._refresh()
    }
    return pathget(this._value, prop)
  }

  set(value) {
    this._obs.setp(this._prop, value)
  }

  setp(prop, value) {
    this._obs.setp(pathjoin(this._prop, prop), value)
  }

  _refresh(ancestry?, prop?) {
    const old_val = this._value
    const new_val = this._value = this._obs.getp(this._prop)

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

  get() {

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
  set(value) {

    this._obs.set(this._transformer.set(value))

  }

  setp(prop, value) {
    throw new Error('transformers cannot set subpath')
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


/**
 * An observable based on several observables and a transformation function.
 */
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
export function o(...args : Array<any>) {
  let l = args.length

  // Just creating an observable.
  if (l === 1) {
    let a = args[0]
    if (a instanceof Observable) return a
    return new Observable(a)
  }

  let fn = args[args.length - 1]
  let deps = Array.prototype.slice.call(arguments, 0, arguments.length - 1)

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
 * Get the current value of the observable, or the value itself if the
 * provided parameter was not an observable.
 */
export function get(v) {
  if (v instanceof Observable) return v.get()
  return v
}


/**
 * Setup an onchange event on the observable, or just call the
 * onchange value once if the provided o is not an observable.
 */
export function observe(o, fn) {
  if (o instanceof Observable) return o.addObserver(fn)
  // the object is not observable, so the onchange value is immediately called.
  fn(o)
  // return a function that does nothing, since nothing is being registered.
  return function() { }
}

export function Or(...args : Observable<any>) : Observable<boolean> {
  return new DependentObservable(args, (...args) => {
    for (var i = 0; i < args.length; i++)
      if (args[i]) return true
    return false
  })
}

export function And(...args: Observable<any>) : Observable<boolean> {
  return new DependentObservable(args, (...args) => {
    for (var i = 0; i < args.length; i++)
      if (!args[i]) return false
    return true
  })
}
