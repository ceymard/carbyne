
import {Controller} from './controller'
import {Observable, O} from './observable'
import {Atom} from './atom'
import {CarbyneEvent, CarbyneListener} from './eventable'


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
      if (value_set_from_event)
        return
      element.value = val == null ? '' : val
    }

    let fromEvent = (evt: Event) => {
      let val = element.value
      value_set_from_event = true
      obs.set(val)
      value_set_from_event = false
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

  if (!obs) return function (atom: Atom): Atom { return atom }

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
export function on(name: string, cbk: CarbyneListener<Atom>) {
  return function (atom: Atom): Atom {
    return atom.on(name, cbk)
  }
}


export function once(name: string, cbk: CarbyneListener<Atom>) {
  return function(atom: Atom): Atom {
    return atom.once(name, cbk)
  }
}


export function listen(name: string, cbk: EventListener) {
  return function(atom: Atom): Atom {
    return atom.listen(name, cbk)
  }
}


export function observe<A, B, C, D, E, F>(a: O<A>, b: O<B>, c: O<C>, d: O<D>, e: O<E>, f: O<F>, cbk: (a: A, b: B, c: C, d: D, e: E, f: F) => any): (a: Atom) => Atom;
export function observe<A, B, C, D, E>(a: O<A>, b: O<B>, c: O<C>, d: O<D>, e: O<E>, cbk: (a: A, b: B, c: C, d: D, e: E) => any): (a: Atom) => Atom;
export function observe<A, B, C, D>(a: O<A>, b: O<B>, c: O<C>, d: O<D>, cbk: (a: A, b: B, c: C, d: D) => any): (a: Atom) => Atom;
export function observe<A, B, C>(a: O<A>, b: O<B>, c: O<C>, cbk: (a: A, b: B, c: C) => any): (a: Atom) => Atom;
export function observe<A, B>(a: O<A>, b: O<B>, cbk: (a: A, b: B) => any): (a: Atom) => Atom;
export function observe<A>(a: O<A>, cbk: (a: A, prop: string) => any): (a: Atom) => Atom;
export function observe(...params: any[]) {
  return function(atom: Atom): Atom {
    return atom.observe.apply(atom, params)
  }
}


let on_mobile = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
export var THRESHOLD = 300 // 10 milliseconds
export var DISTANCE_THRESHOLD = 10

/**
 * Add a callback on the click event, or touchend if we are on a mobile
 * device.
 */
export function click(cbk: (ev: Event, atom: Atom) => any) {

  return on_mobile ? clickTapDecorator : clickDecorator;

  function clickTapDecorator(atom: Atom): Atom {

    let last_ev: MouseEvent = null
    let last_call: number = 0

    atom.on('create', function (event: CarbyneEvent<Atom>) {

      event.target.listen('touchstart', (ev: MouseEvent) => {
        last_ev = ev
        last_call = Date.now()
      })

      event.target.listen('touchend', (ev: MouseEvent) => {
        let now = Date.now()
        let dx = ev.pageX - last_ev.pageX
        let dy = ev.pageY - last_ev.pageY

        if (last_ev.target !== ev.target
          || now - last_call > THRESHOLD
          || (dx * dx + dy * dy) > DISTANCE_THRESHOLD * DISTANCE_THRESHOLD
        ) {
          // do nothing if the target is not the same
        } else {
          // If we got here, we can safely call the callback.
          cbk(ev, atom)
        }

        last_ev = null
      })
    })

    return atom
  }

  function clickDecorator(atom: Atom): Atom {

    atom.on('create', function (event: CarbyneEvent<Atom>) {
      event.target.listen('click', (ev: Event) => cbk(ev, atom))
    })

    return atom
  }

}


export type ClassDefinition = O<string> | {
  [name: string]: O<any>
}

function isClassDefObj(a: any): a is {[name: string]: O<any>} {
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
        if (name) list.add(...name.split(/\s+/))
      })

    } else if (isClassDefObj(def)) {

      for (let name in def) {
        this.atom.observe(def[name], value => {
          if (value) {
            if (name) list.add(...name.split(/\s+/))
          } else {
            if (name) list.remove(...name.split(/\s+/))
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
      if (Array.isArray(def)) {
        let ad: any = def
        for (let d of ad) cc.add(d)
      } else {
        cc.add(def)
      }
    }

    return atom
  }

}
