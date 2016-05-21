
import {identity, forceString} from './helpers'
import {Observable, o, O} from './observable'
import {Eventable} from './eventable'
import {Controller} from './controller'

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

export interface BasicAttributes {
  id?: O<string>
  class?: O<string>
  width?: O<string>
  height?: O<string>
  $$?: any
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


function _mount(child: Element, parent: Node, before: Node = null): void {
  if (child instanceof Atom)
    child.mount(parent, before)
  else
    parent.insertBefore(child, before)
}


function _unmount(child: Element): Promise<any> {
  if (isAtom(child))
    return child.unmount()
  if (isNode(child))
    child.parentNode.removeChild(child)
  return Promise.resolve(true)
}

/**
 *
 */
export class Atom extends Eventable {

  public tag: string = ''
  public parent: Atom = null
  public children: Array<Element> = []
  public attrs: Object = {}
  public element: HTMLElement = null

  protected _fragment: Node = null
  protected _mounted: boolean = false
  protected _destroyed: boolean = false
  protected _controllers: Array<Controller> = []

  constructor(tag: string, attrs: BasicAttributes = {}, children = []) {
    super()

    this.tag = tag
    this.attrs = attrs
    this.children = children
  }

  /**
   * Trigger an event on the curernt node and its parent, recursively.
   */
  emit(event, ...args) {
    event = this._mkEvent(event)
    const res = this.trigger(event, ...args)
    if (this.parent && event.propagating)
      this.parent.emit(event, ...args)
    return res
  }

  /**
   * Trigger an event on the current node and all of its
   * children nodes, recursively.
   */
  broadcast(event, ...args) {
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
  observe(obs, cbk) {

    if (obs instanceof Observable) {
      let unregister = obs.addObserver(cbk)
      this.on('destroy', unregister)
    } else {
      cbk(obs)
    }

    return this
  }

  /**
   * Wrapper to listen to events from an HtmlElement
   */
  listen(event, cbk) {
    if (!this.element)
      this.on('create', this.listen.bind(this, event, cbk))
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

    let res = null
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
  addController(cn) {
    this._controllers.push(cn)
    cn.setAtom(this)
  }

  mount(parent: Node, before: Node = null) {

    // Note : it is assumed that the Atom parent is set up at this point.
    this._mounted = true

    // Create the element if it does not exist.
    if (!this.element) {
      this.trigger('create:before')
      this.element = document.createElement(this.tag)

      var _attrs = this.attrs
      for (var _name in _attrs)
        this._setAttribute(_name, _attrs[_name])

      this.trigger('create')

      // append the children since they're probably nowhere right now.
      var _children = this.children
      this.children = []
      this.append(_children)
      // Mount it to its parent.
    }

    this.trigger('mount:before')
    parent.insertBefore(this.element, before)
    this.trigger('mount')
  }

  append(child) {
    if (typeof child === 'function') child = child()

    if (child == null) return null

    if (child instanceof Array) {
      child.forEach(c => this.append(c))
      return null
    }

    child = _getAtom(child, this)
    this.children.push(child)

    if (this._mounted) {
      // We'll try to mount the child to ourself.

      var initiated = false

      if (!this._fragment) {
        initiated = true
        this._fragment = document.createDocumentFragment()
      }

      _mount(child, this._fragment)

      if (initiated) {
        this._addFragment()
        this._fragment = null
      }
    }

    return child
  }

  _setAttribute(name: string, obs) {
    this.observe(obs, val => {
      if (val !== undefined)
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

  removeChild(child) {
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
    if (!this._mounted) return Promise.resolve(false)

    this._mounted = false

    if (this.parent) this.parent.removeChild(this)
    var before = this.broadcast('unmount:before')
    return Promise.all(before || [])
      .then(e => this._unmountFromDOM())
      .then(e => {
        return this.trigger('unmount')
      })
  }

  destroy() {
    return this.unmount()
    .then(res => Promise.all(this.broadcast('destroy:before') || [])).then(all => {
      var i = 0, ctrls = this._controllers

      this.broadcast('destroy')

      for (i = 0; i < ctrls.length; i++)
        ctrls[i].atom = null

      this.children = null
      this.attrs = null
      this._destroyed = true
      this._listeners = {}
      // super.destroy()
    })
  }

  /**
   * Detaches all children or removes them.
   */
  empty() : Promise<any> {
    if (!this._mounted) return Promise.resolve(true)

    var prom = this.children.slice(0).map(c => c instanceof Atom ?
      c.destroy()
      : Promise.resolve(c.parentNode.removeChild(c))
    )
    return Promise.all<any>(prom).then(all => {
      this.children = []
    })
  }

}


/**
 *
 */
export class VirtualAtom extends Atom {

  public name: string

  protected _begin: Comment
  protected _end: Comment

  constructor(tag: string) {
    super(tag)

    this.name = 'virtual'
    this._begin = null
    this._end = null
  }

  mount(parent: Node, before: Node = null) {

    this._mounted = true

    if (!this._begin) {
      this.trigger('create:before')
      this._begin = document.createComment(`[ ${this.name}`)
      this._end = document.createComment(`]`)
      this.trigger('create')
    }

    this.trigger('mount:before')
    parent.insertBefore(this._begin, before)
    parent.insertBefore(this._end, before)
    this.trigger('mount')

    var _children = this.children
    this.children = []
    this.append(_children)

  }

  _unmountFromDOM() {
    this._begin.parentNode.removeChild(this._begin)
    this._end.parentNode.removeChild(this._end)
    var _children = this.children.slice()
    return Promise.all(_children.map(c => c instanceof Atom ? c.unmount() : c.parentNode.removeChild(c)))
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
export class ObservableAtom<T> extends VirtualAtom {

  public obs: Observable<T>

  private next_value: T
  private last_was_text: boolean

  constructor(obs) {
    super('observer')
    this.obs = obs
    this.last_was_text = false
    this.next_value = null
  }

  mount(parent: Node, before: Node = null) {
    super.mount(parent, before)

    this.observe(this.obs, value => {
      if (value === undefined) return;

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
