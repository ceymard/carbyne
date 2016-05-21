
import {Atom} from './atom'
import {o, O} from './observable'

export function If(cond, fn, fnelse?) {
  return o(cond, val => val ? fn(val) : (fnelse ? fnelse(val) : null))
}

export function Then(fn: any) { return fn }
export function Else(fn: any) { return fn }

export function Match(obj: O<any>, ...args: any[]) {
  return o(obj, (val: any) => {
    let res: any = null
    for (let i = 0; i < args.length; i++) {
      res = args[i](obj)
      if (res) return res
    }
    return null
  })
}


// FIXME this is seriously bugged !
export function Case(test: any, fn: (a: any) => Atom) {
  if (typeof test === 'function') {
    return function(obj: any) {
      if (test(obj)) return fn(obj)
      return null
    }
  }
  return function(obj: any) {
    if (test === obj) return fn(obj)
    return null
  }
}
