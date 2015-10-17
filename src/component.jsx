
import {o, Observable, ObservableObject} from './observable';
import {Event} from './events';

export class BaseComponent {

  _parent = null;
  node = null;
  children_components = [];
  middleware = [];

  onunbind = Event();
  onunmount = Event();

  constructor(attrs = {}, children = []) {
    attrs = attrs || {};

    // Handle middleware.
    if (attrs.$$) {
        this.middleware = (attrs.$$ instanceof Array ? attrs.$$ : [attrs.$$])
          .map((mc) => mc(this)).filter((e) => e != null);
        delete attrs.$$;
    }

    this.attrs = attrs;
    this.children = children;

  }

  /**
   * The goal of compile is to set the node of the element.
   */
  compile() {
    // By the point link is called, we should have a this.node available.
    this.link();
  }

  link() {
    // This is typically when middlewares and the component should comunicate.
    for (let m of this.middleware) {
      m.link();
    }

  }

  unbind() {
    this.onunbind.emit(this);
    this.onunbind.removeListeners();
  }

  mount(domnode) {
    domnode.appendChild(this.node);
  }

  unmount() {
    this.unbind();
    this.onunmount.emit(this);
    this.onunmount.removeListeners();
    if (this.parent) this.parent.removeChild(this);
    this.node = null;
  }

  appendComponent(c) {
    if (!c) return;
    c.parent = this;
    // This will generally be called only once.
    this.children_components.push(c);
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

      // A DOM Node is simply appended to node.
      node.appendChild(child);

    } else if (child instanceof BaseComponent) {

      this.appendComponent(child);

    } else {
      // If the node is nothing mountable, then we shall try to render it
      // on a text node.

      let txt = document.createTextNode('');

      let set_value = (val) => {
        if (val === undefined || val === null) val = '';
        else if (typeof val === 'object') val = JSON.stringify(val);
        txt.textContent = val.toString();
      }

      // We use o.onchange to handle both observable and regular values.
      if (child instanceof Observable)
        this.onunbind(child.onchange(set_value));
      else
        set_value(child);

      node.appendChild(txt);
    }
  }

  removeChild(child) {
    let idx = this.children.indexOf(child);
    if (idx > -1) {
      this.children.splice(idx, 1);
    }
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

    assert('string' === typeof elt);

    super(attrs, children);
    this.elt = elt;

  }

  toString() {
    return `<${this.elt}>`;
  }

  /**
   * Create the html node.
   */
  compile() {

    let e = document.createElement(this.elt);

    for (let attribute_name in this.attrs) {
      let att = this.attrs[attribute_name];
      this.onunbind(o.onchange(att, (val) => {
        if (typeof val === 'object')
          e.setAttribute(attribute_name, JSON.stringify(val));
        else
          e.setAttribute(attribute_name, val);
      }));
    }

    this.node = e;

    for (let c of this.children) {
      this.append(c);
    }

    super();

  }

  appendComponent(c) {
    super(c);
    // The HTML Component possesses a real node, so it will append the node of
    // its new child component.
    this.node.appendChild(c.node);
  }

  unmount() {
    // remove from the parent DOM node if it is mounted
    if (!this.node.parentNode) throw new Error('this node was not mounted');
    this.node.parentNode.removeChild(this.node);

    super();
  }

}


export class Component extends BaseComponent {

  // List of properties set in the attributes that will be pulled into
  // data as .props
  props = []

  // The data spec for this component. Note that it can be overriden
  // (although rarely, usually by Repeat)
  data_defaults = {}

  compile() {

    let data = this.data_defaults;
    this.data = new ObservableObject(data);

    let attrs = this.attrs;

    for (let p of this.props) {
      if (p in attrs) {
        this.data[p] = attrs[p];
      }
    }

    this.appendComponent(this.view(this.data, this.children));

    this.link();
  }

  view() {
    // A component may not have a view, as it just may be talking to a parent
    // component.
    return null;
  }

  toString() {
    return this.constructor.name;
  }

  appendComponent(c) {
    super(c);
    // A component doesn't really possess a node, so it must 'spoof' its child
    // node as being its own.
    this.node = c.node;
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

  elt.compile();

  // for (let c of children) {
  //   if (typeof c === 'undefined') continue;
  //   elt.appendChild(c);
  // }

  // By this point, elt.node is ready for insertion into the DOM.
  return elt;
}
