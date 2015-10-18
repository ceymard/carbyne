/**
 * Lifecycle of components.
 *
 * 1. elt instanciates them, and by doing so sets up the links between them.
 * 		Also, the middleware are initialized.
 *
 * 2. At some point, a component may be mounted onto a DOM node.
 * 		This triggers the creation of all DOM nodes that are to be created.
 *
 */
import {o, Observable, ObservableObject} from './observable';
import {Event} from './events';

function forceString(val) {
  if (val === undefined || val === null) val = '';
  else if (typeof val === 'object') val = JSON.stringify(val);
  return val.toString();
}

export class BaseComponent {

  _parent = null;
  node = null;
  middleware = [];

  // Called whenever the DOM has finished being created and is ready
  // to have event listeners set up, for instance.
  onbind = Event();
  onunbind = Event();

  // Called whenever a component was mounted to another (or generally to
  // the DOM).
  onmount = Event();
  onunmount = Event();

  constructor(attrs = {}, children = []) {
    attrs = attrs || {};

    // Handle middleware.
    if (attrs.$$) {
        let middle = attrs.$$;
        delete attrs.$$;
        this.middleware = (middle instanceof Array ? middle : [middle])
          .map((mc) => mc(this)).filter((e) => e != null);
    }

    this.attrs = attrs;
    this.children = children;

  }

  mount(domnode) {
    this.compile();
    domnode.appendChild(this.node);
  }

  unbind() {
    this.onunbind.emit(this);
    this.onunbind.removeListeners();
  }

  unmount() {
    this.unbind();
    this.onunmount.emit(this);
    this.onunmount.removeListeners();
    this.node = null;
  }

  get parent() { return this._parent; }
  set parent(p) {
    assert(!this._parent, 'a component can only have one parent');

    this._parent = p;
    this._parent.onunbind(this.unbind.bind(this));
    this._parent.onunmount(this.unmount.bind(this));
  }

}


/**
 *
 */
export class HtmlComponent extends BaseComponent {

  constructor(elt, attrs = {}, children = []) {

    super(attrs, children);

    assert('string' === typeof elt);
    this.elt = elt;

    // We establish the hierarchy here.
    for (let c of this.children) {
      if (c instanceof BaseComponent) c.parent = this;
    }

  }

  toString() {
    return `<${this.elt}>`;
  }

  /**
   * Create the html node.
   */
  compile() {

    // Create the DOM node that will be represented by this element.
    let e = document.createElement(this.elt);

    // Set up its attribute, especially if they're observable.
    for (let attribute_name in this.attrs) {
      if (attribute_name === '$$') continue;

      let att = this.attrs[attribute_name];

      if (att instanceof Observable) {
        // FIXME need to transform val in case it was an object or something that
        // isn't a string.
        this.onunbind(att.onchange((val) => e.setAttribute(attribute_name, forceString(val))));
      } else {
          e.setAttribute(attribute_name, forceString(att));
      }

    }

    this.node = e;

    for (let c of this.children) {
      this.append(c);
    }

    this.onbind.emit(this);

  }

  unmount() {
    // remove from the parent DOM node if it is mounted
    if (!this.node.parentNode) throw new Error('this node was not mounted');
    this.node.parentNode.removeChild(this.node);

    super();
  }


  /**
   *
   * This method is bound to
   * @param  {String|Number|Boolean|Node|Component} child
   *         The child we want to add to the current component.
   */
  append(child) {
    // content is a Node.
    let node = this.node;

    if (Array.isArray(child)) {

      for (let c of child) {
        this.append(c);
      }

    } else if (child instanceof Node) {

      node.appendChild(child);

    } else if (child instanceof BaseComponent) {

      child.compile(); // Components need to be compiled before being appended.
      if (child.node) node.appendChild(child.node);
      child.onunmount(this.removeChild.bind(this, child));

    } else {
      // If the node is nothing mountable, then we shall try to render it
      // on a text node.

      let txt = document.createTextNode('');

      // We use o.onchange to handle both observable and regular values.
      if (child instanceof Observable)
        this.onunbind(child.onchange((val) => { txt.textContent = forceString(val); }));
      else
        txt.textContent = forceString(child);

      node.appendChild(txt);
    }
  }

  removeChild(child) {
    let idx = this.children.indexOf(child);
    if (idx > -1) {
      this.children.splice(idx, 1);
    }
  }

}


/**
 * A Component is actually a special kind of component, as it holds no elements of its own.
 * Instead, it relies on the fact that /at some point/, there will be an HtmlComponent to
 * render things on the DOM.
 *
 * As such, it can only have *one* child.
 */
export class Component extends BaseComponent {

  // List of properties set in the attributes that will be pulled into
  // data
  props = []

  // The data spec for this component. Note that it can be overriden
  // (although rarely, usually by Repeat)
  data_defaults = {}

  child = null;

  compile() {

    this.data = new ObservableObject(this.data_defaults);

    // FIXME class, id, tabindex and style should be forwarded to the next component, until
    // it reaches an HTML component where they can at last be applied.
    for (let p of this.props) {
      if (p in this.attrs) {
        this.data[p] = this.attrs[p];
      }
    }

    this.child = this.view(this.data, this.children);
    this.child.onunbind(this.unbind.bind(this));
    this.child.onunmount(this.unmount.bind(this));
    this.children = null;

    if (this.child) this.child.compile(); // Need to create everything in the children, since they're about to be mounted as well.

    this.node = this.child.node;

    // We leave a comment to identify the controller in the DOM for debugging.
    // NOTE maybe should guard this statement inside some debug instruction.
    let cpts = this.node.getAttribute('elt');
    this.node.setAttribute('elt', this.constructor.name + (cpts ? ', ' + cpts : ''));

    this.onbind.emit(this);

  }

  view() {
    // A component may not have a view, as it just may be talking to a parent
    // component.
    return null;
  }

  toString() {
    return this.constructor.name;
  }

  unmount() {
    this.child.unmount();
    super(unmount);
  }
}


/**
 *
 * NOTE During the element instanciation, it is expected
 * 		that the children are already instanciated components.
 *
 * @param  {Component|String} elt
 *         A Component or the name of the html element to create.
 * @param  {Object} attrs
 *         The attributes that go onto the node. They can hold Observable
 *         objects.
 * @param  {Component|Node|Any} ...children
 *         List of children to append to this component.
 * @return {Component}
 *         The resulting instanciated component, with a node property
 *         ready to be inserted into the DOM.
 */
export function elt(elt, attrs, ...children) {

  // assert(elt instanceof Component || typeof elt === 'string');

  if ((typeof elt) === 'string') {
    // Create a simple Html node.
    elt = new HtmlComponent(elt, attrs, children);

  } else if (elt instanceof Function) {
    // instanceof Function because elt is a constructor at this stage, not
    // an actual instance of a component.

    // Create a component, as a constructor was given to us as first argument.
    elt = new elt(attrs, children);

  } else {
    // FIXME should trigger some kind of error here.
  }

  // for (let c of children) {
  //   if (typeof c === 'undefined') continue;
  //   elt.appendChild(c);
  // }

  // By this point, elt.node is ready for insertion into the DOM.
  return elt;
}
