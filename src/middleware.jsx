/**
 * Core middleware for el.
 */

export var Attr = function Attr(obj, cpt) {

};

export var If = function If(obs, cpt) {

};

/**
 * Decorate the component so that
 * @param  {[type]} 2        [description]
 * @param  {[type]} function Repeat(obs,   trackBy, repeater [description]
 * @return {[type]}          [description]
 */
export var Repeat = function Repeat(obs, trackBy, repeater) {

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

exports.Bind = require('./middleware/bind');
