
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
  constructor(tag = null, attrs, children = null) {
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

  emit(name, ...args) {

  }

  broadcast(name, ...args) {

  }

  trigger(name, ...args) {
    let listeners = this.listeners[name] || {};

    for (let id in listeners)
      listeners[id].apply(this, {type: name}, ...args);
  }

  observe(obs, cbk) {
    // This is to make sure that the callback is not fired anymore
    // after this component is unbound.
    this.on('unmount', obs.onchange(cbk));
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

    let all = !opts.first || opts.all;

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
    cn.node = this;
  }

  /////////////////////////////////////////////////////////////////

  createDOM() {
    let elt = null;

    if (this.tag) {
      elt = document.createElement(this.tag);
      this.$node = elt;

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
      this.$node = document.createComment('!');
    }

    for (let ctrl of this.controllers) {
      ctrl.link();
    }

    // The created event will allow the decorators to do some set up on the dom
    // like binding events, attributes, ...
    this.trigger('dom-created');
  }

  append(child) {

    if (Array.isArray(child)) {
      for (let c of child) this.append(c);
    } else if (child instanceof Node) {
      this.$node.appendChild(child);
    } else if (child instanceof HtmlNode) {
      this.children.push(child);
      child.parent = this;
      child.mount(this.$node);
    } else {
      let domnode = document.createTextNode('');

      if (child instanceof Observable)
        this.observe(child, (val) => domnode.textContent = forceString(val));
      else
        domnode.textContent = forceString(child);
        this.$node.appendChild(domnode);
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
    if (!this.$node) this.createDOM();
    parent.insertBefore(this.$node, before);
    this.trigger('mount');
  }

  unmount() {
    // Unmount is recursive and tells all children to remove themselves.
    for (let c of this.children)
      c.unmount();

    for (let ctrl of this.controllers)
      ctrl.destroy();

    this.trigger('unmount');
    this.$node.parentNode.removeChild(this.$node);
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

    node = new HtmlNode(elt, attrs, children);

  } else if (typeof elt === 'function') {
    // Should assert that elt is indeed a Controller.
    // Get its view until we have a node
    let controller = new elt();
    node = controller.view(attrs, children) || new HtmlNode(null);
    node.addController(controller);
  }

  // A decorator generally sets up events and add controllers
  decorators = decorators || [];
  for (let d of decorators) {
    d(node);
  }

  // At this point, we have a node that is ready to be inserted or something.
  return node;
}
