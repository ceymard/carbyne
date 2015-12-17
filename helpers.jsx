

/**
 * Get a deep property using a string accessor.
 * Eg: `obj = {a: {b: 2}}; pathget(obj, 'a.b') => 2`
 *
 * @param  {Object} obj  The source object
 * @param  {String} path The path inside the object
 * @return {Any}  The value of the property.
 */
export function pathget(obj, path) {
  path = path.split('.');
  for (let p of path) {
    if (!obj) break;
    obj = obj[p];
  }
  return obj;
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
  path = path.split('.');
  let last = path.pop();
  for (let p of path) {
    // create objects as we need it.
    if (!obj[p]) obj[p] = {};
    obj = obj[p];
  }
  obj[last] = value;
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
export function identity(i) { return i; }


export function forceString(val) {
  if (val === undefined || val === null) val = '';
  else if (typeof val === 'object') val = JSON.stringify(val);
  return val.toString();
}


export function pathjoin() {
  const pathes = [];
  for (let pth of arguments) {
    if (pth) pathes.push(pth);
  }
  return pathes.join('.');
}