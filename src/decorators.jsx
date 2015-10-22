
import {BindController} from './controllers/bind';

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
        this.$node.addEventListener('click', cbk);
      });

    };

}
