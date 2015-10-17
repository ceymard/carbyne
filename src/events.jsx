/**
 * Very lightweight event.
 */

export function Event() {
  let listeners = [];

  function E(fn) {
    listeners.push(fn);
    return function unregister() {
      let idx = listeners.indexOf(fn);
      if (idx > -1) listeners.splice(idx, 1);
    }
  }

  E.emit = function emit() {
    for (let l of listeners)
      l.apply(null, arguments);
  };

  E.removeListeners = function removeListeners() {
    // this is to avoid memory leaks.
    listeners = [];
  };

  return E;
}
