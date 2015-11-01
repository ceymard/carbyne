
import {forceString} from './helpers';
import {Observable} from './observable';

let ident = 0;

/**
 * HtmlNode is a wrapper on nodes.
 */
export class HtmlNode {

  /**
   * @param  {String} tag      The tag name. It always will be lowercase.
   * @param  {Object} attrs    Attributes to the node. Can include observables.
   * @param  {[type]} children [description]
   * @return {[type]}          [description]
   */
  constructor(tag = null, attrs, children = []) {
    this.tag = tag;
    this.attrs = attrs;
    this.children = children;
    this.listeners = {};
    this.controllers = [];
  }

  /////////////////////////////////////////////////////////////////

  on(name, fn) {
    if (!(name in this.listeners)) this.listeners[name] = {};
    fn.$$ident = ident++;
    this.listeners[name][fn.$$ident] = fn;
  }

  off(name, fn) {
    delete (this.listeners[name]||{})[fn.$$ident||'---'];
  }

  once(name, fn) {
    let self = this;
    let cbk = function () {
      fn.apply(this, arguments);
      self.off(name, cbk);
    }
    this.on(name, cbk);
  }

  emit() {
    // FIXME stop propagation ?
    this.trigger.apply(this, arguments);
    if (this.parent) this.parent.trigger.apply(this.parent, arguments);
  }

  broadcast() {
    this.trigger.apply(this, arguments);
    for (let c of this.children) {
      c.broadcast.apply(c, arguments);
    }
  }

  trigger(event, ...args) {
    if (typeof event === 'string')
      event = {type: event, target: this, propagate: true, stopPropagation() { this.propagate = false; }};
    let listeners = this.listeners[event.type] || {};

    for (let id in listeners)
      listeners[id].call(this, event, ...args);

    return this;
  }

  observe(obs, cbk) {
    // This is to make sure that the callback is not fired anymore
    // after this component is unbound.
    if (obs instanceof Observable)
      this.on('unmount', obs.onchange(cbk));
    else
      // Fire immediately if this is not an observable.
      cbk();
  }

  /////////////////////////////////////////////////////////////////

  /**
   * Get a controller by its class name, the first one that is met.
   * Optionnally get all of them and or recurse the parents to get
   * instances.
   *
   * @param  {Function} cls The controller class.
   * @param  {Object} opts Options
   *                       all: boolean
   *                       recursive: boolean
   * @return {Controller}      The controller instance if found.
   */
  getController(cls, opts = {}) {

    let res = null;
    let node = this;

    let all = opts.all;
    let recursive = opts.recursive == true;

    while (node) {
      for (let ctrl of node.controllers) {
        if (ctrl instanceof cls) {
          if (all)
            res.push(ctrl);
          else
            return ctrl;
        }
      }

      if (!recursive) return res;
      node = node.parent;
    }

    return res;

  }

  /**
   * Add another controller to this node.
   * @param {[type]} cn [description]
   */
  addController(cn) {
    this.controllers.push(cn);
    cn.setNode(this);
    // cn.node = this;
  }

  /////////////////////////////////////////////////////////////////

  createElement(tag) {
    return document.createElement(tag);
  }

  createDOM() {
    let elt = null;

    if (this.tag) {
      elt = this.createElement(this.tag);
      this.element = elt;

      let attrs = this.attrs;
      for (let name in attrs) {
        let a = attrs[name];
        if (a instanceof Observable) {
          this.observe(a, (value) => {
            if (value !== undefined) elt.setAttribute(name, forceString(value))
            else elt.removeAttribute(name);
          });
        } else {
          if (a !== undefined) elt.setAttribute(name, forceString(a));
        }
      }

      let children = this.children;
      // We're replacing children with only the components.
      this.children = [];
      for (let c of children) {
        this.append(c);
      }
    } else {
      this.element = document.createComment('!');
    }

    for (let ctrl of this.controllers) {
      ctrl.link();
    }

    // The created event will allow the decorators to do some set up on the dom
    // like binding events, attributes, ...
    this.trigger('dom-created');
  }

  append(child, before = null) {

    if (Array.isArray(child)) {
      for (let c of child) this.append(c, before);
    } else if (child instanceof Node) {
      this.element.insertBefore(child, before);
    } else if (child instanceof HtmlNode) {
      this.children.push(child);
      child.parent = this;
      child.mount(this.element, before);
    } else if (child instanceof Observable) {
      let dynamic_children = null;
      // Create a text child anyway.
      let domnode = document.createTextNode('');
      this.element.insertBefore(domnode, before);

      // FIXME we should be able to also observe HTMLNodes, regular nodes,
      // and arrays of values, not just their text equivalents.
      //
      // NOTE we should probably use something like a VirtualNode, for which
      // we know that its contents can completely vary ?
      this.observe(child, (val) => {
        domnode.textContent = forceString(val);
      });
    } else {
      let domnode = document.createTextNode('');
      domnode.textContent = forceString(child);

      this.element.insertBefore(domnode, before);
    }

  }

  /**
   * @param  {[type]} child [description]
   * @return {[type]}       [description]
   */
  prepend(child) {

  }

  /**
   * Convenience functions like jQuery
   * @param  {[type]} node [description]
   * @return {[type]}      [description]
   */
  after(node) {

  }

  before(node) {

  }

  /**
   * Mount the node onto the DOM.
   * @param  {Node} parent The parent DOM node.
   * @param  {Node} before An optionnal element before which to add it. If null,
   *                       then the current node is appended to the parent.
   */
  mount(parent, before = null) {
    if (!this.element) this.createDOM();
    parent.insertBefore(this.element, before);
    this.trigger('mount', parent, before);
  }

  unmount() {
    // Unmount is recursive and tells all children to remove themselves.
    if (this._unmounted) return;

    for (let c of this.children)
      c.unmount();

    for (let ctrl of this.controllers)
      ctrl.destroy();

    this.trigger('unmount');
    if (this.parent) {
      this.parent.removeChild(this);
      this.parent = null;
    }
    this._unmonted = true;
  }

  removeChild(child) {
    // This does not remove element from the DOM !
    let idx = this.children.indexOf(child);
    if (idx > -1) this.children.splice(idx, 1);
  }

  remove() {
    // should check if we're already unmounted.
    this.unmount();
    this.element.parentNode.removeChild(this.element);
  }

}

var _virtual_count = 0;
export class VirtualNode extends HtmlNode {

  constructor() {
    super(null, {}, []);
  }

  mount(parent, before) {
    _virtual_count++;
    // Virtual nodes have two comments between which they
    this.element = document.createComment(`virtual ${_virtual_count}`);
    parent.insertBefore(this.element, before);
  }

}


export function elt(elt, attrs, ...children) {
  let node = null;
  attrs = attrs || {};

  let decorators = attrs.$$;

  if (decorators) {
    delete attrs.$$;
    if (!Array.isArray(decorators)) decorators = [decorators];
  }

  if (typeof elt === 'string') {
    // If we have a string, then it is a simple html element.
    node = new HtmlNode(elt, attrs, children);

  } else if (typeof elt === 'function') {
    // If it is a function, then the element is composite.
    // FIXME we should probably set up class forwarding here
    // as well as some common html attributes.
    node = elt(attrs, children);
  } else {
    throw new Error('wrong type')
  }

  // A decorator generally sets up events and add controllers
  if (decorators) {
    for (let d of decorators) {
      node = d(node) || node;
    }
  }

  // At this point, we have a node that is ready to be inserted or something.
  return node;
}
