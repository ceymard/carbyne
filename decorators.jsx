
import {BindController} from './controllers/bind';

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
        this.element.addEventListener('click', cbk.bind(node));
      });

      return node;
    };

}

export function cls(obj) {

  return function clsDecorator(node) {

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


export function ctrl(...ctrls) {
  return function ctrlDecorator(node) {
    for (let c of ctrls) node.addController(c);
  }
}

export function transition(name = '') {
  if (name) name = `${name}-`;

  return function transitionDecorator(node) {
    node.on('dom-created', function () {
      node.element.classList.add(`${name}enter`);
      requestAnimationFrame(() => node.element.classList.remove(`${name}enter`));
    });
  }
}
