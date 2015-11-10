
import {forceString} from './helpers';
import {Observable, o} from './observable';

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
    if (obs instanceof Observable) {
      let unregister = obs.addObserver(cbk)
      this.on('unmount', unregister);
    } else
      // Fire immediately if this is not an observable.
      cbk(obs);
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
    let recursive = opts.recursive != false;

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

    // The created event will allow the decorators to do some set up on the dom
    // like binding events, attributes, ...
    this.trigger('dom-created');
  }

  addHtmlNode(child) {
    child.mount(this.element);
  }

  addNode(child) {
    this.element.appendChild(child);
  }

  append(child) {

    if (child === undefined) return;

    if (typeof child === 'function') child = child();

    if (child instanceof Observable) {
      child = new ObservableNode(child);
    }

    if (Array.isArray(child)) {
      // FIXME should probably do something with DOM fragments here since they allow reflow minimization.
      for (let c of child) this.append(c);
    } else if (child instanceof Node) {
      this.addNode(child);
    } else if (child instanceof HtmlNode) {
      this.children.push(child);
      child.parent = this;
      this.addHtmlNode(child);
    } else {
      let domnode = document.createTextNode(forceString(child));
      this.addNode(domnode);
    }

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

    // This should be preventable in the event.
    this.trigger('unmount');

    for (let c of this.children)
      c.unmount();

    for (let ctrl of this.controllers)
      ctrl.destroy();

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
    if (this.parent) {
      this.parent.removeChild(this);
      this.parent = null;
    }
    this.element = null;
  }

}

/**
 * It has no children. It may have in the future, but it has to wait until
 * it's mounted to actually start appending things into the DOM.
 */
export class VirtualNode extends HtmlNode {

  constructor() {
    super(null, {}, []);
    // We have to track manually the DOM children that we insert, since
    // the removal is between two comment nodes.
    this.dom_children = [];
    this.name = 'Virtual Node';
  }

  /**
   * The virtual node
   */
  mount(parent, before) {
    this.element = document.createComment(this.name + 'end');
    parent.insertBefore(this.element, before);

    // prev is used for debug purposes.
    this.start_element = document.createComment(this.name + 'start');
    parent.insertBefore(this.start_element, this.element);
    this.trigger('mount', parent, before);
  }

  addHtmlNode(child) {
    child.mount(this.element.parentNode, this.element);
  }

  addNode(child) {
    this.element.parentNode.insertBefore(child, this.element);
    this.dom_children.push(child);
  }

  removeChildren() {
    let parent = this.element.parentNode;
    for (let n of this.dom_children)
      parent.removeChild(n);
    this.dom_children = [];
    let children = this.children;
    while (this.children.length) {
      children[0].remove();
    }
  }

  remove() {
    // Since the children are not children of a comment node, we need to manually
    // clean them up.
    this.removeChildren();
    this.start_element.parentNode.removeChild(this.start_element);
    super();
  }

}


var _obs_count = 0;

/**
 * An ObservableNode is a node built on an observable.
 * It extends the VirtualNode in the sense that it needs the comment as an insertion point.
 */
export class ObservableNode extends VirtualNode {

  constructor(obs) {
    super();
    this.obs = obs;
    this.last_was_text = false;
    _obs_count++;
    this.name = `Observable<${_obs_count}>`
  }

  mount() {
    super(...arguments);

    this.observe(this.obs, (value) => {
      if (value === undefined) return;

      let is_text = !(value instanceof HtmlNode || value instanceof Node || Array.isArray(value) || typeof value === 'function');
      if (is_text && this.last_was_text) {
        // Small optimization in the case that we just have to modify a text node
        // to avoid removing and adding Nodes around by reusing the last one we
        // were using.
        this.dom_children[0].textContent = forceString(value);
        return;
      }

      this.removeChildren();
      this.append(value);
      this.last_was_text = is_text;
    });
  }

}
