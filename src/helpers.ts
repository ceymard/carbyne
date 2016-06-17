
/**
 * Get a deep property using a string accessor.
 * Eg: `obj = {a: {b: 2}}; pathget(obj, 'a.b') => 2`
 *
 * @param  {Object} obj  The source object
 * @param  {String} path The path inside the object
 * @return {Any}  The value of the property.
 */
export function pathget<T>(obj : any, path : string|number) : T {
  if (!path) return obj
  let pathes = path.toString().split('.')
  for (var i = 0; i < pathes.length; i++) {
    if (!obj) break
    obj = obj[pathes[i]]
  }
  return obj
}


/**
 * Set a deep property using a string accessor.
 * Eg: `pathset(myobj, 'my.deep.prop', value)`.
 *
 * @param  {Object} obj   The root object
 * @param  {String} path  A path to a deep property. Dots are used
 *                        to go into sub-objects.
 * @param  {Any} value The value the property will be set to.
 */
export function pathset(obj : any, path : string|number, value : any) : boolean {
  let pathes = (path == null ? '' : path).toString().split('.')
  let last = pathes.pop()
  for (var i = 0; i < pathes.length; i++) {
    // create objects as we need it.
    if (!obj[pathes[i]]) obj[pathes[i]] = {}
    obj = obj[pathes[i]]
  }
  const changed = obj[last] !== value
  obj[last] = value
  return changed
}


/**
 * A function that does nothing, useful for callbacks that expect
 * functions but that don't really need anything done.
 */
export function noop() { }

/**
 * A function that returns its first parameter.
 * @param  {Any} i The value that will be returned
 * @return {Any}   i
 */
export function identity(i: any) { return i }


export function forceString(val : any) {
  if (val === undefined || val === null) val = ''
  else if (typeof val === 'object') val = JSON.stringify(val)
  return val.toString()
}


/**
 * Transforms a series of string paths and join them with a dot
 * @param  {[string]} ...args [description]
 * @return {string}           [description]
 */
export function pathjoin(...args : string[]) : string {
  const pathes: string[] = []
  for (let pth of args) {
    if (pth) pathes.push(pth)
  }
  return pathes.join('.')
}


/**
 * @param {[type]} obj [description]
 */
export function clonedeep(obj : any) : any {
  if (obj instanceof Array)
    return obj.map((elt: any) => clonedeep(elt))
  if ('object' === typeof obj) {
    var res: any = {}
    for (var prop in obj)
      res[prop] = clonedeep(obj[prop])
    return res
  }
  return obj // simple type, does not need to be cloned
}


/**
 * Do a shallow copy of src's own properties to dst and return dst.
 * dst is modified in the process.
 *
 * @param  {any} dst The destination
 * @param  {any} src the source object
 * @return {any}     dst
 */
export function merge(dst: any, src: any): any {
  for (var x in src) {
    if (src.hasOwnProperty(x)) dst[x] = src[x]
  }
  return dst
}


/**
 * A debounce decorator for your methods.
 */
export function debounce(ms: number) {

  return function debounceDecorator(target: any, key: string, descriptor: PropertyDescriptor): void {
    let cancel_id: number = null
    let orig = descriptor.value

    function wrapped(...args: any[]) {
      if (cancel_id) {
        clearTimeout(cancel_id)
        cancel_id = null
      }

      cancel_id = setTimeout(() => {
        (orig as any).apply(this, args)
        cancel_id = null
      }, ms)
    }

    descriptor.value = wrapped
  }
}

/**
 * A throttle decorator for methods
 */
export function throttle(ms: number) {

  return function throttleDecorator(target: any, key: string, descriptor: PropertyDescriptor): void {
    let last_call: number = 0
    let cancel_id: number = null
    let orig = descriptor.value

    function wrapped(...args: any[]) {
      let prev = last_call
      let now = Date.now()
      last_call = now

      if (now - prev < ms) {
        if (!cancel_id)
          cancel_id = setTimeout(() => {
            (orig as any).apply(this, args)
            cancel_id = null
          }, ms - (now - prev))
        return
      }

      (orig as any).apply(this, args)
    }

    descriptor.value = wrapped
  }
}


function isThenable<T>(obj: any) : obj is Thenable<T> {
  return obj && obj.then
}

/**
 * A helper that calls a thenable instantly instead of waiting for the next tick.
 */
export function resolve<T>(value: T): Thenable<T> {
  return {
    __value__: value,
    then<U>(onFulfilled: (a: T) => U | Thenable<U>, onRejected?: (error: any) => U | Thenable<U>): Thenable<U> {
      let res = onFulfilled(value)
      if (isThenable<U>(res)) {
        return res
      }
      return resolve(res)
    },

    catch<U>(onRejected?: (error: any) => U | Thenable<U>): Thenable<U> {
      return null
      // return reject(onRejected(error))
    }
  } as Thenable<T>
}


/**
 * An internal method that avoids launching new promises
 */
export function waitall(proms: any[]): Thenable<any> {
  let has_promise = false

  for (let p of proms) {
    if (p && !p.__value__ && isThenable(p)) {
      has_promise = true
      break
    }
  }

  return has_promise ? Promise.all(proms) : resolve(null)
}
