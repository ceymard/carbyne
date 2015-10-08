/**
 * Core middleware for el.
 */

export function Attr(obj) {

}

export function If(obs) {

}

export function Repeat(obs, trackBy, children) {

}

export function On(evt_name, cbk) {

  return function (node) {
    // Est-ce qu'on peut se unsubscribe ?
    node.addEventListener(evt_name, cbk);
    return node;
  }

}
