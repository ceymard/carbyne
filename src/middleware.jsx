/**
 * Core middleware for el.
 */

export var Attr = function Attr(obj, cpt) {

};

export var On = function On(evt_name, cbk) {

  return function (component) {
    // Est-ce qu'on peut se unsubscribe ?
    component.$node.addEventListener(evt_name, cbk);
    return node;
  };

};

export class Middleware {

  $component = null;

  setComponent(cmp) {
    this.$component = cmp;
  }

}

export function Click(fn) {

  return function (component) {
    component.$node.addEventListener('click', fn);
  }

}

exports.Bind = require('./middleware/bind');
exports.If = require('./middleware/if');
exports.Repeat = require('./middleware/repeat');
