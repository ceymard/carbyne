
const {BindController} = require('./controllers/bind');
const {Observable} = require('./observable');

export function bind(obs, opts) {

  if (!obs) return;

  return function bindDecorator(atom) {
    let ctrl = new BindController(obs, opts);
    atom.addController(ctrl);
    return atom;
  };

}


export function click(cbk) {

    return function clickDecorator(atom) {

      atom.once('create', function () {
        this.listen('click', cbk.bind(atom));
      });

      return atom;
    };

}

export function cls(...args) {

  return function clsDecorator(atom) {

    atom.once('create', function () {
      let clslist = this.element.classList;

      for (let obj of args) {
        if (typeof obj === 'string') {
          clslist.add(obj);
        } else if (obj instanceof Observable) {
          atom.observe(obj, ((prev) => (val) => {
            if (prev) clslist.remove(prev);
            clslist.add(val);
            prev = val;
          })(null));
        } else {
          for (let cls in obj) {
            let obs = obj[cls];
            atom.observe(obs, (val) => {
              if (val) clslist.add(cls);
              else clslist.remove(cls);
            });
          }
        }
      }
    });

    return atom;
  }

}


export function ctrl(...ctrls) {
  return function ctrlDecorator(atom) {
    for (let c of ctrls) atom.addController(c);
  }
}


/**
 * FIXME should detect computed properties to tell if we're having to handle
 * animations or not. Should we check for prefixed vendor events also ?
 */
export function transition(name = '') {
  if (name) name = `${name}-`;

  return function transitionDecorator(atom) {
    atom.on('mount', function () {
      atom.element.classList.add(`${name}enter`);
      setTimeout(() => requestAnimationFrame(() => atom.element.classList.remove(`${name}enter`)));
    });

    atom.on('unmount:before', function () {
      // Duplicate the DOM node and apply the .leave class
      // try to tell by the computed css on the element if we indeed have an end transition
      // var dup = atom.element.cloneNode();
      // dup.classList.add(`${name}leave`);
      // var has_transition = dup; // ???
      // // listen the animationend event and then remove the duplicate from the dom.
      // if (!has_transition) dup = null;
      // dup.insertBefore(atom.element.parentNode, atom.element);
      // dup.addEventListener('transitionend', function () {
      //   dup.parentNode.removeChild(dup);
      // });
    })

    let orig_remove = atom.removeFromDOM;
    atom.removeFromDOM = function removeFromDOMTransition() {
      atom.element.classList.add(`${name}leave`);
      atom.listen('animationend', function() {
        // effectively remove the element.
        orig_remove.call(atom);
      });
      atom.listen('transitionend', function() {
        // effectively remove the element.
        orig_remove.call(atom);
      });
    }
  }
}
