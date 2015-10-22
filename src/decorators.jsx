
import {BindController} from './controllers/bind';

export function Bind(obs, opts) {

  if (!obs) return;

  return function (node) {
    let ctrl = new BindController(obs, opts);
    node.addController(ctrl);
  };

}


export function Click (cbk) {

    return function (node) {

      node.once('dom-created', function () {
        this.$node.addEventListener('click', cbk);
      });

    };

}
