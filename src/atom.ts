
import {identity, forceString, resolve, waitall} from './helpers'
import {Observable, o, O, Observer} from './observable'
import {Controller} from './controller'
import {Eventable, CarbyneListener, CarbyneEvent} from './eventable'

/**
  Noteworthy events ;

  This can only happen once.
  create:before: Before DOM is created (when we want to eg. manipulate children list and attributes)
  create: Right after DOM is created
  ---
  These can be called multiple times :
  mount:before: Before DOM is to be inserted
  mount: After DOM is inserted
  ---
  These can be called multiple times :
  unmount:before: Before element is to be removed (can it be canceled ?)
  unmount: After element is removed from DOM
  ---
  This can only happen once, mostly
  destroy:before: Before unloading the tree and calling the destroyers
  destroy: Right after that.
 */


export type Element = Atom | Node

export type AppendableElement = string | number | boolean | Atom | Node
export type AppendableBuilder = (...a: any[]) => AppendableElement
export type AppendableSingle = AppendableElement | AppendableBuilder
export type AppendableMult = AppendableSingle | AppendableSingle[]
export type Appendable = AppendableMult | AppendableMult[]

export type DecoratorFn = (a: Atom) => Atom
export type Decorator = Controller | DecoratorFn
export type DecoratorParam = Decorator | Decorator[]

export type AtomStatus = 'uninitialized' | 'unmounted' | 'mounted' | 'destroyed'

export interface BasicAttributes {
  id?: O<string>
  class?: O<string>
  style?: O<string>
  [name: string]: any
  $$?: DecoratorParam
}

export function isAtom(a: any): a is Atom {
  return a instanceof Atom
}

export function isNode(a: any): a is Node {
  return a instanceof Node
}

/**
 * Get an Atom or a Node ready for insertion.
 */
function _getAtom(child: any, parent: Atom = null) : Element {

  var result: Element = child

  if (child instanceof Observable) {
    result = new ObservableAtom(child)
  } else if (typeof child === 'string' ||
    typeof child === 'number') {

    result = document.createTextNode(child.toString())

  } else if (!isAtom(child)) {
    // maybe this should be an error case ?
    result = document.createTextNode(`<${child.constructor.name}>(${child.toString()})`)
  }

  if (parent && isAtom(result))
    result.parent = parent

  return result
}


/**
 *
 */
export class Atom extends Eventable {

  public tag: string = ''
  public parent: Atom = null
  public children: Element[] = []
  public attrs: {[name: string]: O<string>} = {}
  public element: HTMLElement = null

  public status: AtomStatus = 'uninitialized'
  protected _initial_children: Appendable[]
  protected _fragment: Node = null
  protected _controllers: Array<Controller> = []

  constructor(tag: string, attrs: BasicAttributes = {}, children: Appendable[] = []) {
    super()
    this.tag = tag
    this.attrs = attrs
    this._initial_children = children
  }

  /**
   * Trigger an event on the curernt node and its parent, recursively.
   */
  emit(event: CarbyneEvent<this>|string, ...args: any[]) {
    event = this._mkEvent(event)
    const res = this.trigger(event, ...args)
    if (this.parent)
      this.parent.emit(event, ...args)
    return res
  }

  /**
   * Trigger an event on the current node and all of its
   * children nodes, recursively.
   */
  broadcast(event: CarbyneEvent<this>|string, ...args: any[]) {
    event = this._mkEvent(event)
    const res = this.trigger(event, ...args)

    this.atomChildren().map(child => child.broadcast(event, ...args))
    return res
  }

  /**
   * Convenience method to tie the observation of an observable
   * to the life cycle of an atom. It accepts non-observables as well,
   * simply calling `cbk` with the value immediately.
   */
  observe<T>(obs: O<T>, cbk: Observer<T>): Atom {

    if (obs instanceof Observable) {
      this.on('destroy', obs.addObserver(cbk))
    } else {
      cbk(obs)
    }

    return this
  }

  /**
   * Wrapper to listen to events from an HtmlElement
   */
  listen(event: string, cbk: EventListener): Atom {
    if (!this.element)
      this.on('create', () => this.listen(event, cbk))
    else {
      this.element.addEventListener(event, cbk)
      this.on('destroy:before', () => this.element.removeEventListener(event, cbk))
    }

    return this
  }

  /////////////////////////////////////////////////////////////////

  /**
   * Get a controller by its class type, the first one that is met.
   *
   * @param  {Function} cls The controller class.
   * @param  {Object} opts Options
   *
   *                       recursive: boolean
   * @return {Controller}      The controller instance if found.
   */
  getController<T extends Controller>(cls: new(...a: Array<any>) => T, recursive: boolean = true) : T {

    let atom: Atom = this

    while (atom) {
      for (let ctrl of atom._controllers) {
        if (ctrl instanceof cls) {
          return ctrl as T
        }
      }

      if (!recursive) return null
      atom = atom.parent
    }

    return null

  }

  /**
   * Add another controller to this node.
   * @param {[type]} cn [description]
   */
  addController(cn: Controller): void {
    this._controllers.push(cn)
    cn.setAtom(this)
  }

  mount(parent: Node, before: Node = null) {

    // Note : it is assumed that the Atom parent is set up at this point.
    this.status = 'unmounted'

    // Create the element if it does not exist.
    if (!this.element) {
      this.trigger('create:before')
      this.element = document.createElement(this.tag)

      var _attrs = this.attrs
      for (var _name in _attrs)
        this._setAttribute(_name, _attrs[_name])

      this.trigger('create')

      for (let c of this._initial_children) this.append(c)
      this._initial_children = null
    }

    this.trigger('mount:before')
    parent.insertBefore(this.element, before)

    if (parent instanceof HTMLElement)
      this.setMounted()
  }

  protected setMounted() {
    this.status = 'mounted'
    for (let c of this.atomChildren().filter(a => a.status !== 'mounted'))
      c.setMounted()
    this.trigger('mount')
  }

  /**
   * Append an appendable to the Atom.
   * @param  {Appendable} child The child to append
   * @return {Element}    The result of the transformation of the child
   *                          to a Node if it needed to be.
   */
  append(child: Appendable): Element {
    // FIXME this ugly hack is due to the fact that I can't seem to
    // cast child as an AppendableBuilder. Is this a typescript bug ?
    if (typeof child === 'function') child = <any>((<any>child)())

    if (child == null) return null

    if (child instanceof Array) {
      (child as AppendableElement[]).forEach(c => this.append(c))
      return null
    }

    var elt: Element = _getAtom(child, this)

    var status = this.status
    if (status === 'mounted' || status === 'unmounted') {
      this.children.push(elt)
      // We'll try to mount the child to ourself.

      var initiated = false

      if (!this._fragment) {
        initiated = true
        this._fragment = document.createDocumentFragment()
      }

      if (elt instanceof Atom)
        elt.mount(this._fragment, null)
      else
        this._fragment.insertBefore(elt, null)

      if (initiated) {
        this._addFragment()
        this._fragment = null
        for (let c of this.atomChildren().filter(a => a.status !== 'mounted'))
          c.setMounted()
      }
    } else if (status === 'uninitialized') {
      this._initial_children.push(elt)
    } else {
      throw new Error('cannot append to a destroyed Atom')
    }

    return elt
  }

  _setAttribute(name: string, obs: O<string>) {
    this.observe<string>(obs, val => {
      if (val != undefined)
        this.element.setAttribute(name, forceString(val))
      else
        this.element.removeAttribute(name)
    })
  }

  _unmountFromDOM() {
    this.element.parentNode.removeChild(this.element)
  }

  _destroy() {
    this.element = null
  }

  _addFragment() {
    this.element.appendChild(this._fragment)
  }

  atomChildren(): Array<Atom> {
    return <Array<Atom>>this.children.filter(child => child instanceof Atom)
  }

  removeChild(child: Atom) {
    // This does not remove element from the DOM !
    // But maybe it should...
    let idx = this.children.indexOf(child)
    if (idx > -1) {
      this.children.splice(idx, 1)
      child.parent = null
    }
  }

  unmount(): Promise<any> {
    // Ignore unmounted nodes, as unmount could be called by destroy() while not
    // mounted.
    if (this.status !== 'mounted') return resolve(false)

    this.status = 'unmounted'

    if (this.parent) this.parent.removeChild(this)
    var before = this.broadcast('unmount:before')
    return waitall(before)
      .then(e => this._unmountFromDOM())
      .then(e => this.trigger('unmount'))
  }

  destroy() {
    return this.unmount()
    .then(res => waitall(this.broadcast('destroy:before'))).then(all => {
      var i = 0, ctrls = this._controllers

      this.broadcast('destroy')

      for (i = 0; i < ctrls.length; i++)
        ctrls[i].atom = null

      this.children = null
      this.attrs = null
      this.status = 'destroyed'
      this._listeners = {}
      // super.destroy()
    })
  }

  /**
   * Detaches all children or removes them.
   */
  empty() : Promise<any> {
    if (this.status !== 'mounted') return resolve(true)

    var prom = this.children.slice(0).map(c => c instanceof Atom ?
      c.destroy()
      : resolve(c.parentNode.removeChild(c))
    )

    return waitall(prom).then(all => {
      this.children = []
    })
  }

}


/**
 *
 */
export class VirtualAtom extends Atom {

  protected _begin: Comment
  protected _end: Comment

  constructor(tag: string, attrs?: {}, children: Appendable[] = []) {
    super(tag)

    this._begin = null
    this._end = null
    this._initial_children = children
  }

  mount(parent: Node, before: Node = null) {

    this.status = 'unmounted'

    if (!this._begin) {
      this.trigger('create:before')
      this._begin = document.createComment(`[ ${this.tag}`)
      this._end = document.createComment(`]`)
      this.trigger('create')
    }

    this.trigger('mount:before')
    parent.insertBefore(this._begin, before)
    parent.insertBefore(this._end, before)

    for (let c of this._initial_children) this.append(c)
    this._initial_children = null

    if (parent instanceof HTMLElement)
      this.setMounted()
  }

  _unmountFromDOM() {
    this._begin.parentNode.removeChild(this._begin)
    this._end.parentNode.removeChild(this._end)
    var _children = this.children.slice()
    return waitall(_children.map(c => c instanceof Atom ? c.unmount() : c.parentNode.removeChild(c)))
      .then(a => this.children = _children) // keep the children.
  }

  _destroy() {
    this._begin = null
    this._end = null
  }

  _addFragment() {
    this._begin.parentNode.insertBefore(this._fragment, this._end)
  }

}


/**
 * An ObservableAtom is a node built on an observable.
 * It uses an Atom without a tag, which means it will be using
 * comment nodes to insert its contents.
 */
export class ObservableAtom<T extends Appendable> extends VirtualAtom {

  public obs: Observable<T>

  private next_value: T = null
  private last_was_text: boolean = false

  constructor(obs: Observable<T>) {
    super('observer')
    this.obs = obs
  }

  mount(parent: Node, before: Node = null) {
    super.mount(parent, before)

    this.observe(this.obs, value => {
      if (value === undefined) {
        this.empty()
        return
      }

      let is_text = !(
        value instanceof Atom ||
        value instanceof Node ||
        Array.isArray(value) ||
        typeof value === 'function' ||
        value instanceof Observable
      )

      var had_next_value = this.next_value !== null

      this.next_value = is_text ? forceString(value) : value

      if (had_next_value) return

      this.empty().then(() => {
        if (this.children) this.append(this.next_value)
        this.next_value = null
      })

    })
  }

}


/**
 * Display the content of an Observable into the DOM
 */
export function Observe<T extends Appendable>(obs: Observable<T>): ObservableAtom<T> {
  return new ObservableAtom(obs)
}
