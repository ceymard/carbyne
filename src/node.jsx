

import {Eventable} from './events';

export class EmptyNode {

  constructor() {
    this.children = null;
    this.parent = null;
    this.controllers = [];

    this.$node = null;
  }

  on(name, fn) {

  }

  off(name, fn) {

  }

  once(name, fn) {

  }

  emit(name, ...args) {

  }

  broadcast(name, ...args) {

  }

  trigger(name, ...args) {

  }

  observe(obs, cbk) {
    // This is to make sure that the callback is not fired anymore
    // after this component is unbound.
    this.on('$unbind', obs.onchanged(cbk));
  }

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

  addController(cn) {
    this.controllers.push(cn);
    cn.node = this;
  }

  mount() {
    // Does nothing. In fact, none of its children shall ever be mounted.
  }

}

/**
 * HtmlNode is a wrapper on nodes.
 */
export class HtmlNode extends EmptyNode {

  /**
   * @param  {String} tag      The tag name. It always will be lowercase.
   * @param  {Object} attrs    Attributes to the node. Can include observables.
   * @param  {[type]} children [description]
   * @return {[type]}          [description]
   */
  constructor(tag, attrs, children) {
    super();
    this.tag = tag;
    this.attrs = attrs;
    this.children = children;

    // FIXME should handle middleware.
  }

  createDOM() {
    let elt = document.createElement(this.tag);

    let attrs = this.attrs;
    for (let name in attrs) {
      let a = attrs[name];
      if (a instanceof Observable) {
        this.observe(a, (value) => elt.setAttribute(name, forceString(a)));
      } else {
        elt.setAttribute(name, forceString(a));
      }
    }

    let children = this.children;
    for (let c in children) {
      this.append(c);
    }

    this.$node = elt;
    // The created event will allow the decorators to do some set up on the dom
    // like binding events, attributes, ...
    this.trigger('dom-created');
  }

  /**
   * Mount the node onto the DOM.
   * @param  {Node} parent The parent DOM node.
   * @param  {Node} before An optionnal element before which to add it. If null,
   *                       then the current node is appended to the parent.
   */
  mount(parent, before = null) {
    if (!this.$node) this.createDOM();
    parent.insertBefore(parent, before);
    this.trigger('mounted');
  }

}


export function elt(elt, attrs, ...children) {
  let node = null;
  let decorators = attrs.$$;
  if (decorators) {
    delete attrs.$$;
  }

  if (typeof elt === 'string') {

    node = new HtmlNode(elt, attrs, children);

  } else if (typeof elt === 'function') {
    // Should assert that elt is indeed a Controller.
    // Get its view until we have a node
    let controller = new elt();
    node = controller.view(attrs, children);
    node.addController(controller);
  }

  // A decorator generally sets up events and add controllers
  for (let d of decorators) {
    d(node);
  }

  // At this point, we have a node that is ready to be inserted or something.
  return node;
}
