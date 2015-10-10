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

export function Bind(observable, opts) {
  if (!observable) return;

  return function (component) {
    return new BindMiddleware(component, observable, opts);
  };

};


class BindMiddleware extends Middleware {

  $component = null;
  $creator = Bind;

  constructor(component, observable, opts) {
    super();

    this.$component = component;
    this.observable = observable;
    this.opts = opts;

    // We're calling bind on a classic HTML node.
    let node = component.$node;
    let tag = node.tagName.toLowerCase();

    if (tag === 'input') {
      let type = node.type.toLowerCase() || 'text';

      switch (type) {
        case 'number':
        case 'text':
          observable.onchange((val) => node.value = val);

          node.addEventListener('keyup', (evt) => {
            let val = node.value;
            // should update the values elsewhere !
            observable.set(val);
            // console.log(val, evt);
          });
          break;
        default:
          // Do something else ?
      }

    } else if (tag === 'textarea') {

    } else if (tag === 'select') {

    }

  }

}
