
import {identity, forceString} from './helpers';
import {Observable, o} from './observable';
import {Eventable} from './eventable';


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
 * Atom is a wrapper on nodes.
 */
export class Atom extends Eventable {

  /**
   * @param  {String} tag      The tag name. It always will be lowercase.
   * @param  {Object} attrs    Attributes to the node. Can include observables.
   * @param  {Array} children  The list of children.
   */
  constructor(tag = null, attrs, children = []) {
    super();
    this.parent = null;
    this.tag = tag;
    this.element = null;
    this.attrs = attrs;
    this.children = [];

    this._initial_children = children;
    this._controllers = [];
    this._mounted = false;
    this._destroyed = false;

    // the parentNode in the DOM of the current element held by the Atom
    this._parentNode = null;
    // used as a `before` argument, useful when dealing with virtual nodes.
    this._insertionNode = null;
    // The parent node used to insert children, which this.element
    // or the parentNode of the current comment node if there is no element.
    this._insertionParent = null;
  }

  emit(event, ...args) {
    event = this._mkEvent(event);
    const res = this.trigger(event, ...args);
    if (this.parent && event.propagating)
      this.parent.emit(event, ...args);
    return res;
  }

  broadcast(event, ...args) {
    event = this._mkEvent(event);
    const res = this.trigger(event, ...args);
    if (!event.propagating) return;
    for (let c of this.children) {
      if (c instanceof Atom) c.broadcast(event, ...args);
    }
    return res;
  }

  /**
   * Convenience method to tie the observation of an observable
   * to the life cycle of a node.
   */
  observe(obs, cbk) {
    cbk = cbk || identity;
    if (obs instanceof Observable) {
      let unregister = obs.addObserver(cbk)
      this.on('destroy', unregister);
    } else
      // Fire immediately if this is not an observable.
      cbk(obs);
  }

  listen(event, cbk) {
    if (!this.element)
      this.on('create', this.listen.bind(this, obs, cbk));
    else {
      this.element.addEventListener(event, cbk);
      this.on('destroy:before', () => this.element.removeEventListener(event, cbk));
    }
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
    let atom = this;

    let all = opts.all;
    let recursive = opts.recursive != false;

    while (atom) {
      for (let ctrl of atom._controllers) {
        if (ctrl instanceof cls) {
          return ctrl;
        }
      }

      if (!recursive) return null;
      atom = atom.parent;
    }

    return null;

  }

  /**
   * Add another controller to this node.
   * @param {[type]} cn [description]
   */
  addController(cn) {
    this._controllers.push(cn);
    cn.setAtom(this);
  }

  /////////////////////////////////////////////////////////////////

  setAttributes(attrs) {
    for (let name in attrs) {
      let a = attrs[name];
      if (a instanceof Observable) {
        this.observe(a, (value) => {
          if (value !== undefined) this.element.setAttribute(name, forceString(value))
          else this.element.removeAttribute(name);
        });
      } else {
        if (a !== undefined) this.element.setAttribute(name, forceString(a));
      }
    }
  }

  _create() {
    if (this._destroyed) throw new Error('cannot create a destroyed Atom');

    this.trigger('create:before');

    if (this.tag) {
      this.element = document.createElement(this.tag);
      this._insertionParent = this.element;
      this.setAttributes(this.attrs);

      let children = this._initial_children;
      // We'll not be using them anymore.
      this._initial_children = null;
      this.append(children);
    } else {
      this.element = document.createComment('!');
      this._insertionNode = document.createComment('!!');
    }

    // The created event will allow the decorators to do some set up on the dom
    // like binding events, attributes, ...
    this.trigger('create');
    delete this._listeners.create;
  }

  /**
   * Mount the node onto the DOM.
   * @param  {Node} parent The parent DOM node.
   * @param  {Node} before An optionnal element before which to add it. If null,
   *                       then the current node is appended to the parent.
   */
  mount(parent, before = null) {
    this.trigger('mount:before', parent, before);

    this._parentNode = parent;

    if (!this.element) this._create();

    // Insert our element in the DOM.
    parent.insertBefore(this.element, before);
    if (!this.tag) {
      // This is to handle the case of virtual nodes.
      this._insertionParent = parent;
      this._insertionParent.insertBefore(this._insertionNode, before);
    } else {
      this._insertionParent = this.element;
      this._insertionNode = before;
    }

    this._mounted = false;
    this.trigger('mount', parent, before);
    return this;
  }

  append(child) {

    if (child === undefined) return;

    if (typeof child === 'function') child = child();

    if (child instanceof Observable) {
      child = new ObservableAtom(child);
    }

    if (Array.isArray(child)) {
      for (let c of child) this.append(c);
    } else if (child instanceof Node) {
      this.children.push(child);
      this._insertionParent.insertBefore(child, this._insertionNode);
    } else if (child instanceof Atom) {
      this.children.push(child);
      child.parent = this;
      child.mount(this._insertionParent, this._insertionNode);
    } else {
      child = document.createTextNode(forceString(child));
      this.children.push(child);
      this._insertionParent.insertBefore(child, this._insertionNode);
    }

  }

  unmount() {
    if (!this._parentNode) return;

    return Promise.all(this.broadcast('unmount:before')).then(all => {
      this._parentNode.removeChild(this.element);

      // Case for virtual nodes that need to unmount.
      if (this._insertionParent === this._parentNode) {
        this.empty(true);
        this._parentNode.removeChild(this._insertionNode);
      }

      this._mounted = false;
      this._parentNode = null;
      this._insertionParent = null;
      this.trigger('unmount');      
    });
    // return this;
  }

  removeChild(child) {
    // This does not remove element from the DOM !
    // But maybe it should...
    let idx = this.children.indexOf(child);
    if (idx > -1) {
      this.children.splice(idx, 1);
      child.parent = null;
    }
  }

  destroy() {
    return this.unmount().then(res => Promise.all(this.broadcast('destroy:before'))).then(all => {
      this._parentNode = null;
      this._insertionParent = null;
      this._insertionNode = null;
      this.element = null;

      this.broadcast('destroy');
      this.children = null;
      this.attrs = null;
      this._destroyed = true;
      this._listeners = null;
    });
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
          this._parentNode.removeChild(c);
        } else c.unmount();
      }
    } else {
      for (let c of children) {
        if (c instanceof Node) {
          this._parentNode.removeChild(c);
        } else c.destroy();
      }
    }
    this.children = [];
  }

}

/**
 * An ObservableAtom is a node built on an observable.
 * It uses an Atom without a tag, which means it will be using
 * comment nodes to insert its contents.
 */
export class ObservableAtom extends Atom {

  constructor(obs) {
    super(null);
    this.obs = obs;
    this.last_was_text = false;
  }

  mount() {
    super(...arguments);

    this.observe(this.obs, (value) => {
      if (value === undefined) return;

      let is_text = !(
        value instanceof Atom ||
        value instanceof Node ||
        Array.isArray(value) ||
        typeof value === 'function' ||
        value instanceof Observable
      );

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
