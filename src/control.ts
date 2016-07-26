
import {Appendable, ObservableAtom} from './atom'
import {o, O, Observable} from './observable'

export type ConditionalBuilder<T> = (a: T) => Appendable

export function If<T>(cond: O<T>, fn: ConditionalBuilder<T>, fnelse?: ConditionalBuilder<T>): ObservableAtom<Appendable> {
  var obs: Observable<T> = o(cond)
  return new ObservableAtom<Appendable>(obs.tf<Appendable>(val => val ? fn(val) : (fnelse ? fnelse(val) : null)))
  // return o(cond, (val: any) => val ? fn(val) : (fnelse ? fnelse(val) : null))
}

export function Then<T>(fn: ConditionalBuilder<T>): ConditionalBuilder<T> { return fn }
export function Else<T>(fn: ConditionalBuilder<T>): ConditionalBuilder<T> { return fn }



export function Match<T>(obj: O<T>, ...args: ConditionalBuilder<T>[]): ObservableAtom<Appendable> {
  var obs: Observable<T> = o(obj)

  return new ObservableAtom<Appendable>(obs.tf((val: T) => {
    let res: Appendable = null
    for (let i = 0; i < args.length; i++) {
      res = args[i](val)
      if (res) return res
    }
    return null
  }))
}


export type CaseTestFn<T> = (ar: T) => boolean
export type CaseTest<T> = T | CaseTestFn<T>

export function Case<T>(test: CaseTest<T>, fn: ConditionalBuilder<T>): ConditionalBuilder<T> {
  if (typeof test === 'function') {
    return function(obj: T) {
      if ((test as (ar: T) => boolean)(obj)) return fn(obj)
      return null
    }
  }
  return function(obj: T) {
    // test is really T here.
    if ((test as any) === obj) return fn(obj)
    return null
  }
}
