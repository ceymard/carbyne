
import {Middleware} from '../middleware';

function Bind(observable, opts) {
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

module.exports = Bind;
