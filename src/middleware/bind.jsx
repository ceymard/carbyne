
import {Middleware} from '../middleware';
import {Observable} from '../observable';

function Bind(observable, opts) {
  if (!observable) return;

  return function (component) {
    return new BindMiddleware(component, observable, opts);
  };

};

class BindMiddleware extends Middleware {

  $creator = Bind;

  constructor(component, observable, opts) {
    super(component);

    assert(observable instanceof Observable);

    this.observable = observable;
    this.opts = opts;

  }

  link() {

    // We're calling bind on a classic HTML node.
    let observable = this.observable;
    let opts = this.opts;
    let cpt = this.component;
    let node = cpt.node;
    let tag = node.tagName.toLowerCase();

    // FIXME need to check if we're in editing mode of an HTML node (usually by checking its attributes)

    if (tag === 'input') {

      let cbk = (evt) => {
        let val = node.value;
        // console.log(val);
        observable.set(val);
      }
      let type = node.type.toLowerCase() || 'text';


      switch (type) {
        case 'color':
        case 'range':
        case 'date':
        case 'datetime':
        case 'week':
        case 'month':
        case 'datetime-local':
          cpt.onunbind(observable.onchange((val) => node.value = val));
          node.addEventListener('input', cbk);
          break;
        case 'radio':
          cpt.onunbind(observable.onchange((val) => node.checked = node.value === val));
          node.addEventListener('change', cbk);
          break;
        case 'checkbox':
          cpt.onunbind(observable.onchange((val) => val ? node.checked = true : node.checked = false));
          node.addEventListener('change', () => observable.set(node.checked));
          break;
        case 'number':
        case 'text':
        case 'password':
        case 'search':
        default:
        cpt.onunbind(observable.onchange((val) => node.value = val));
        node.addEventListener('keyup', cbk);
        node.addEventListener('input', cbk);
        node.addEventListener('change', cbk);
      }

    } else if (tag === 'textarea') {

    } else if (tag === 'select') {

    }

  }

}

module.exports = Bind;
