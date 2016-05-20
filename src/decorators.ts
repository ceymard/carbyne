
import {BindController} from './controllers/bind'
import {Observable} from './observable'

export function bind(obs, opts: Object = {}) {

  if (!obs) return

  return function bindDecorator(atom) {
    let ctrl = new BindController(obs, opts)
    atom.addController(ctrl)
    return atom
  }

}


export function click(cbk) {

    return function clickDecorator(atom) {

      atom.once('create', function () {
        this.listen('click', ev => cbk.call(atom, ev, atom))
      })

      return atom
    }

}

export function cls(...args) {

  return function clsDecorator(atom) {

    atom.once('create', function () {
      let clslist = this.element.classList

      for (let obj of args) {
        if (typeof obj === 'string') {
          clslist.add(obj)
        } else if (obj instanceof Observable) {
          atom.observe(obj, ((prev) => (val) => {
            if (prev) clslist.remove(prev)
            clslist.add(val)
            prev = val
          })(null))
        } else {
          for (let cls in obj) {
            let obs = obj[cls]
            atom.observe(obs, (val) => {
              if (val) clslist.add(cls)
              else clslist.remove(cls)
            })
          }
        }
      }
    })

    return atom
  }

}


export function ctrl(...ctrls) {
  return function ctrlDecorator(atom) {
    for (let c of ctrls) atom.addController(c)
  }
}
