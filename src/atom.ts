
import {identity, forceString} from './helpers'
import {Observable, o} from './observable'
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

export type Element = BaseAtom | Node


function _getAtom(child: any, parent: BaseAtom = null) : Element {

  var result: Element = child

  if (child instanceof Observable) {
    result = new ObservableAtom(child)
  } else if (typeof child === 'string' ||
    typeof child === 'number') {

    result = document.createTextNode(child.toString())
  } else {

  }

  if (parent && result instanceof BaseAtom)
    result.parent = parent

  return result
}


function _mount(child, parent, before = null) {
  if (child instanceof BaseAtom)
    child.mount(parent, before)
  else
    parent.insertBefore(child, before)
}


function _unmount(child) {
  if (child instanceof BaseAtom)
    return child.unmount()
  child.parentNode.removeChild(child)
  return Promise.resolve(true)
}

/**
 *
 */
export class BaseAtom extends Eventable {

  protected _mounted: boolean
  protected _destroyed: boolean
  protected _controllers: Array<Controller>

  public parent: BaseAtom
  public children: Array<Element>
  public attrs: Object
  public element: HTMLElement = null

  protected _fragment: Node

  constructor() {
    super()

    this._mounted = false
    this._destroyed = false
    this._controllers = []

    this.parent = null
    this.children = []
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
    if (!event.propagating) return

    this.atomChildren().forEach(child => child.broadcast(event, ...args))
    // var children = this.children
    // for (var i = 0; i < children.length; i++) {
    //   if (children[i] instanceof BaseAtom) {
    //     (<BaseAtom>children[i]).broadcast(event, ...args)
    //   }
    // }
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
    let atom: BaseAtom = this

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
    // This method is virtual and must be implemented.
    throw new Error('BaseAtom can not be mounted.')
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

  _addFragment() {
    throw new Error('BaseAtom#_addFragment() can not be called directly')
  }

  _unmountFromDOM() {
    throw new Error('BaseAtom#_unmountFromDOM() can not be called directly')
  }

  _destroy() {
    throw new Error('BaseAtom#_destroy() can not be called directly')
  }

  atomChildren() : Array<BaseAtom> {
    return <Array<BaseAtom>>this.children.filter(child => child instanceof BaseAtom)
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
    return Promise.all(this.broadcast('unmount:before') || [])
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

    var prom = this.children.slice(0).map(c => c instanceof BaseAtom ?
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
export class Atom extends BaseAtom {

  public tag: string
  public attrs: Object

  constructor(tag, attrs = {}, children = []) {
    super()

    this.element = null

    this.tag = tag
    this.attrs = attrs
    this.children = children

    this._fragment = null
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

  _setAttribute(name, obs) {
    this.observe(obs, val => {
      if (val !== undefined)
        this.element.setAttribute(name, forceString(val))
      else
        this.element.removeAttribute(name)
    })
  }

  mount(parent, before = null) {

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

  _unmountFromDOM() {
    this.element.parentNode.removeChild(this.element)
  }

  _destroy() {
    this.element = null
  }

  _addFragment() {
    this.element.appendChild(this._fragment)
  }

}


/**
 *
 */
export class VirtualAtom extends BaseAtom {

  public name: string
  protected _begin: Comment
  protected _end: Comment

  constructor() {
    super()

    this.name = 'virtual'
    this._begin = null
    this._end = null
  }

  mount(parent, before = null) {

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
    return Promise.all(_children.map(c => c instanceof BaseAtom ? c.unmount() : c.parentNode.removeChild(c)))
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
    super()
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
