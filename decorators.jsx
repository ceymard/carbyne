
import {BindController} from './controllers/bind';
import {Controller} from './controller';

export function bind(obs, opts) {

  if (!obs) return;

  return function bindDecorator(node) {
    let ctrl = new BindController(obs, opts);
    node.addController(ctrl);
    return node;
  };

}


export function click(cbk) {

    return function clickDecorator(node) {

      node.once('dom-created', function () {
        this.element.addEventListener('click', cbk);
      });

      return node;
    };

}

export class ClassController extends Controller {

  constructor() {
    super(...arguments);
  }

  addStyles(...args) {
    this.classes = this.classes.concat(args);
  }

}

export class StyleController extends Controller {

}

export function cls(obj) {

  return function clsDecorator(node) {

    // There is no need to have several controllers on the node, so we first try to find
    // if there is one here.
    let ctrl = node.getController(ClassController);

    node.once('dom-created', function () {
      let clslist = this.element.classList;

      for (let cls in obj) {
        let obs = obj[cls];
        node.observe(obs, (val) => {
          if (val) clslist.add(cls);
          else clslist.remove(cls);
        });
      }
    });

    return node;
  }

}
