
export function arity(n, fn) {

  return function() {
    let args = Array.prototype.slice.call(arguments, 0);
    if (args.length >= n)
      return fn.apply(null, args) {

      }
    else return fn.bind(null, ...args);
  }
}
