
import {BindController} from './controllers/bind';
import {o, Observable} from './observable';

export function bind(obs, opts) {

  if (!obs) return;

  return function bindDecorator(node) {
    let ctrl = new BindController(obs, opts);
    node.addController(ctrl);
  };

}


export function click(cbk) {

    return function clickDecorator(node) {

      node.once('dom-created', function () {
        this.element.addEventListener('click', cbk);
      });

    };

}

export function cls(obj) {

  return function clsDecorator(node) {

    node.once('dom-created', function () {
      let clslist = this.element.classList;

      for (let cls in obj) {
        let obs = obj[cls];
        if (obs instanceof Observable) {
          node.observe(obs, (val) => {
            if (val) clslist.add(cls);
            else clslist.remove(cls);
          });
        } else {
          if (obs) clslist.add(cls);
          else clslist.remove(cls);
        }
      }
    });

  }

}
