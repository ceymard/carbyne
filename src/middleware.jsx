/**
 * Core middleware for el.
 */

export var Attr = arity(2, function Attr(obj, cpt) {

});

export var If = arity(2, function If(obs, cpt) {

});

/**
 * Decorate the component so that
 * @param  {[type]} 2        [description]
 * @param  {[type]} function Repeat(obs,   trackBy, repeater [description]
 * @return {[type]}          [description]
 */
export var Repeat = arity(2, function Repeat(obs, trackBy, repeater) {

});

export var On = arity(3, function On(evt_name, cbk) {

  return function (node) {
    // Est-ce qu'on peut se unsubscribe ?
    node.addEventListener(evt_name, cbk);
    return node;
  }

});
