
import {Controller} from './controller'
import {Observable, O} from './observable'
import {Atom, CarbyneEvent, CarbyneListener} from './atom'


export type BindControllerOptions = {
  debounce?: number // number of milliseconds before observable update.
}


export class BindController extends Controller {

  obs: Observable<string>
  opts: BindControllerOptions

  constructor(obs: Observable<string>, opts: BindControllerOptions = {}) {
    super()
    this.obs = obs
    this.opts = opts
  }

  onCreate() {
    let element = this.atom.element

    if (element instanceof HTMLInputElement) this.linkToInput(element)
    if (element instanceof HTMLSelectElement) this.linkToSelect(element)

    if (element.contentEditable) this.linkToHTML5Editable(element)
  }

  linkToSelect(element: HTMLSelectElement) {
    let obs = this.obs
    let opts = this.opts
    let atom = this.atom

    atom.listen('change', function(evt) {
      obs.set(this.value)
    })

    atom.observe(obs, (val) => {
      element.value = val
    })
  }

  linkToInput(element: HTMLInputElement) {

    let obs = this.obs
    let atom = this.atom
    let value_set_from_event = false

    let fromObservable = (val: string) => {
      if (value_set_from_event) {
        // Do not update the input if the event just updated
        value_set_from_event = false
        return
      }
      element.value = val
    }

    let fromEvent = (evt: Event) => {
      let val = element.value
      if (obs.set(val))
        value_set_from_event = true
    }

    let type = element.type.toLowerCase() || 'text'

    switch (type) {
      case 'color':
      case 'range':
      case 'date':
      case 'datetime':
      case 'week':
      case 'month':
      case 'time':
      case 'datetime-local':
        atom.observe(obs, fromObservable)
        atom.listen('input', fromEvent)
        break
      case 'radio':
        atom.observe(obs, (val) => {
          element.checked = element.value === val
        })
        atom.listen('change', fromEvent)
        break
      case 'checkbox':
        // FIXME ugly hack because we specified string
        atom.observe(obs, (val: any) => element.checked = val == true)
        atom.listen('change', () => (obs as Observable<any>).set(element.checked))
        break
      // case 'number':
      // case 'text':
      // case 'password':
      // case 'search':
      default:
        atom.observe(obs, fromObservable)
        atom.listen('keyup', fromEvent)
        atom.listen('input', fromEvent)
        atom.listen('change', fromEvent)
    }

  }

  linkToHTML5Editable(element: HTMLElement) {
    // FIXME
  }

}


export function bind(obs: Observable<string>, opts: BindControllerOptions = {}) {

  if (!obs) return

  return function bindDecorator(atom: Atom): Atom {
    let ctrl = new BindController(obs, opts)
    atom.addController(ctrl)
    return atom
  }

}


/**
 * Use to bind to an event directly in the jsx phase.
 *
 * ```jsx
 *   <div $$={on('create', ev => ev.target...)}
 * ```
 */
export function on(name: string, cbk: CarbyneListener) {
  return function (atom: Atom): Atom {
    return atom.on(name, cbk)
  }
}


export function once(name: string, cbk: CarbyneListener) {
  return function(atom: Atom): Atom {
    return atom.once(name, cbk)
  }
}


export function click(cbk: EventListener) {

    return function clickDecorator(atom: Atom): Atom {

      atom.on('create', function (event: CarbyneEvent) {
        event.target.listen('click', (ev: Event) => cbk.call(atom, ev, atom))
      })

      return atom
    }

}


export type ClassDefinition = O<string> | {
  [name: string]: O<boolean>
}

function isClassDefObj(a: any): a is {[name: string]: O<boolean>} {
  return typeof a === 'object' && !(a instanceof Observable)
}

export class ClassController extends Controller {

  private _on_create: Array<ClassDefinition> = []

  onCreate() {
    for (let def of this._on_create)
      this.add(def)
    this._on_create = null
  }

  add(def: ClassDefinition) {

    if (!this.atom.element) {
      // as long as we're not created, we're not adding classes.
      this._on_create.push(def)
      return
    }

    let list = this.atom.element.classList

    if (!isClassDefObj(def)) {

      let old: string = null
      this.atom.observe(def, name => {
        if (old !== name && old != null)
          list.remove(...old.split(/\s+/))
        old = name
        list.add(...name.split(/\s+/))
      })

    } else if (isClassDefObj(def)) {

      for (let name in def) {
        this.atom.observe(def[name], value => {
          if (value) {
            list.add(...name.split(/\s+/))
          } else {
            list.remove(...name.split(/\s+/))
          }
        })
      }

    }
  }

}


export function cls(...args: ClassDefinition[]) {

  return function clsDecorator(atom: Atom): Atom {

    let cc = atom.getController(ClassController, false)

    if (!cc) {
      cc = new ClassController()
      atom.addController(cc)
    }

    for (let def of args) {
      cc.add(def)
    }

    return atom
  }

}
