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

export class Bind extends Middleware {

}

// export function Bind(observable, opts) {
//
//   return function (component) {
//     // FIXME specify a bind interface.
//     if (component.bind) {
//
//     } else {
//       // We're calling bind on a classic HTML node.
//       let node = component.$node;
//
//       if (node.tagName === 'input') {
//
//       } else if (node.tagName === 'textarea') {
//
//       }
//     }
//   };
//
// };
