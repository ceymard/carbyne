
import {forceString} from './helpers';
import {Observable, o} from './observable';

let ident = 0;

/**
  Noteworthy events ;

  This can only happen once.
  before-create: Before DOM is created (when we want to eg. manipulate children list and attributes)
  create: Right after DOM is created
  ---
  These can be called multiple times :
  before-mount: Before DOM is to be inserted
  mount: After DOM is inserted
  ---
  These can be called multiple times :
  before-unmount: Before element is to be removed (can it be canceled ?)
  unmount: After element is removed from DOM
  ---
  This can only happen once, mostly
  before-remove: Before unloading the tree and calling the destroyers
  remove: Right after that.
 */

/**
 * HtmlNode is a wrapper on nodes.
 */
export class HtmlNode {

  /**
   * @param  {String} tag      The tag name. It always will be lowercase.
   * @param  {Object} attrs    Attributes to the node. Can include observables.
   * @param  {Array} children  The list of children.
   */
  constructor(tag = null, attrs, children = []) {
    this.tag = tag;
    this.attrs = attrs;
    this.initial_children = children;
    this.children = [];
    this.listeners = {};
    this.controllers = [];

    // Used for DOM insertions.
    this.element = null;
    this.parentNode = null;
    // used as a `before` argument, useful when dealing with virtual nodes.
    this.insertionNode = null;
    this.insertionParent = null;
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
      event = {
        type: event, 
        target: this, 
        prevent_default: false,
        preventDefault() { this.prevent_default = true; }
    };
    let listeners = this.listeners[event.type] || {};

    for (let id in listeners)
      listeners[id].call(this, event, ...args);

    return this;
  }

  /**
   * Convenience method to tie the observation of an observable
   * to the life cycle of a node.
   */
  observe(obs, cbk) {
    if (obs instanceof Observable) {
      let unregister = obs.addObserver(cbk)
      this.on('remove', unregister);
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
          return ctrl;
        }
      }

      if (!recursive) return null;
      node = node.parent;
    }

    return null;

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

    this.trigger('before-create');

    if (this.tag) {
      elt = this.createElement(this.tag);
      this.element = elt;
      this.insertionParent = this.element;

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

      let children = this.initial_children;
      // We'll not be using them anymore.
      this.initial_children = null;
      for (let c of children) {
        this.append(c);
      }
    } else {
      this.element = document.createComment('!');
      this.insertionNode = document.createComment('!!');
    }

    // The created event will allow the decorators to do some set up on the dom
    // like binding events, attributes, ...
    this.trigger('create');
  }

  /**
   * Mount the node onto the DOM.
   * @param  {Node} parent The parent DOM node.
   * @param  {Node} before An optionnal element before which to add it. If null,
   *                       then the current node is appended to the parent.
   */
  mount(parent, before = null) {
    this.trigger('before-mount', parent, before);

    this.parentNode = parent;

    if (!this.element) this.createDOM();

    // Insert our element in the DOM.
    parent.insertBefore(this.element, before);
    // This is to handle the case of virtual nodes.
    if (!this.tag) {
      this.insertionParent = parent;
      this.insertionParent.insertBefore(this.insertionNode, before);
    } else {
      this.insertionParent = this.element;
      this.insertionNode = before;
    }

    this._unmounted = false;
    this.trigger('mount', parent, before);
    return this;
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
      this.children.push(child);
      this.insertionParent.insertBefore(child, this.insertionNode);
    } else if (child instanceof HtmlNode) {
      this.children.push(child);
      child.parent = this;
      child.mount(this.insertionParent, this.insertionNode);
    } else {
      child = document.createTextNode(forceString(child));
      this.children.push(child);
      this.insertionParent.insertBefore(child, this.insertionNode);
    }

  }

  unmount() {
    // Unmount is recursive and tells all children to remove themselves.
    if (this._unmounted) return;

    this.trigger('before-unmount');

    this.parentNode.removeChild(this.element);

    // Case for virtual nodes that need to unmount.
    if (this.insertionParent === this.parentNode) {
      this.empty(true);
      this.parentNode.removeChild(this.insertionNode);
    }

    this._unmonted = true;
    this.trigger('unmount');

    return this;
  }

  removeChild(child) {
    // This does not remove element from the DOM !
    // But maybe it should...
    let idx = this.children.indexOf(child);
    if (idx > -1) this.children.splice(idx, 1);
  }

  remove() {
    this.trigger('before-remove');

    // should check if we're already unmounted.

    // This is probably here that we should also destroy
    // the children.

    this.unmount();

    this.parentNode = null;
    this.insertionParent = null;
    this.insertionNode = null;
    this.element = null;

    // FIXME unload everything.

    this.trigger('remove');
  }

  /**
   * Detaches all children or removes them.
   */
  empty(detach = false) {
    // copy the children array as it will get modified by unmount()
    let children = this.children.slice(0);

    if (detach) {
      for (let c of children) {
        if (c instanceof Node) {
          this.parentNode.removeChild(c);
        } else c.unmount();
      }
    } else {
      for (let c of children) {
        if (c instanceof Node) {
          this.parentNode.removeChild(c);
        } else c.remove();
      }
    }
    this.children = [];
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
    this.name = 'Virtual Node';
  }

  // /**
  //  * The virtual node
  //  */
  // mount(parent, before) {
  //   this.element = document.createComment(this.name + 'end');
  //   parent.insertBefore(this.element, before);

  //   // prev is used for debug purposes.
  //   this.start_element = document.createComment(this.name + 'start');
  //   parent.insertBefore(this.start_element, this.element);
  //   this.trigger('mount', parent, before);
  //   return this;
  // }

  // addHtmlNode(child) {
  //   child.mount(this.element.parentNode, this.element);
  // }

  // addNode(child) {
  //   this.element.parentNode.insertBefore(child, this.element);
  //   this.dom_children.push(child);
  // }

  // removeChildren() {
  //   let parent = this.element.parentNode;
  //   for (let n of this.dom_children)
  //     parent.removeChild(n);
  //   this.dom_children = [];
  //   let children = this.children;
  //   while (this.children.length) {
  //     children[0].remove();
  //   }
  // }

  // detachChildren() {
  //   let parent = this.element.parentNode;
  //   for (let n of this.dom_children)
  //     parent.removeChild(n);
  //   this.dom_children = [];
  //   let children = this.children;
  //   while (this.children.length) {
  //     children[0].detach();
  //   }    
  // }

  // detach() {
  //   this.element.parentNode.removeChild(this.element);
  //   this.start_element.parentNode.removeChild(this.start_element);
  // }

  // remove() {
  //   // Since the children are not children of a comment node, we need to manually
  //   // clean them up.
  //   this.removeChildren();
  //   super();
  // }

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
        this.children[0].textContent = forceString(value);
        return;
      }

      // this.removeChildren();
      this.empty(); // remove all children.
      this.append(value);
      this.last_was_text = is_text;
    });
  }

}
