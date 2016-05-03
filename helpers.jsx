
export function exists(obj) {
  return obj !== null && obj !== undefined
}

/**
 * Get a deep property using a string accessor.
 * Eg: `obj = {a: {b: 2}}; pathget(obj, 'a.b') => 2`
 *
 * @param  {Object} obj  The source object
 * @param  {String} path The path inside the object
 * @return {Any}  The value of the property.
 */
export function pathget(obj, path) {
  if (!exists(path)) return obj
  path = path.toString().split('.')
  for (var i = 0; i < path.length; i++) {
    if (!obj) break
    obj = obj[path[i]]
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
export function pathset(obj, path, value) {
  path = (!exists(path) ? '' : path).toString().split('.')
  let last = path.pop()
  for (var i = 0; i < path.length; i++) {
    // create objects as we need it.
    if (!obj[path[i]]) obj[path[i]] = {}
    obj = obj[path[i]]
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
export function identity(i) { return i }


export function forceString(val) {
  if (val === undefined || val === null) val = ''
  else if (typeof val === 'object') val = JSON.stringify(val)
  return val.toString()
}


export function pathjoin(...args) {
  const pathes = []
  for (let pth of args) {
    if (pth) pathes.push(pth)
  }
  return pathes.join('.')
}


export function clonedeep(obj) {
  if (obj instanceof Array)
    return obj.map(elt => clonedeep(elt))
  if ('object' === typeof obj) {
    var res = {}
    for (var prop in obj)
      res[prop] = clonedeep(obj[prop])
    return res
  }
  return obj // simple type, does not need to be cloned
}


export function merge(dst, src) {
  for (var x in src) {
    dst[x] = src[x]
  }
  return dst
}

export function debounce(fn, ms) {
  let last_call = new Date
  let cancel_id = null
  let self = this

  return function debouncedWrapper(...args) {
    if (cancel_id) {
      clearTimeout(cancel_id)
      cancel_id = null
    }
    cancel_id = setTimeout(() => fn.apply(self, args), ms)
  }
}
