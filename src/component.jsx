
import {Observable, ObservableObject} from './observable';

export class Component {

  $node = null;
  $parentNode = null;
  $parentComponent = null;
  $middleware = [];

  // List of properties set in the attributes that will be pulled into
  // data as .props
  props = []

  // The data spec for this component. Note that it can be overriden
  // (although rarely, usually by Repeat)
  initial_data = {}

  // Should the view be built whenever a component is instanciated ?
  constructor(attrs = {}, children = []) {
    attrs = attrs || {};

    // Handle middleware.
    if (attrs.$$) {
        this.$middleware = (attrs.$$ instanceof Array ? attrs.$$ : [attrs.$$]).map((mc) => mc(this)).filter((e) => e != null);
        delete attrs.$$;
    }

    this.attrs = attrs;
    this.children = children;

  }

  compile(additional_data = {}) {

    let data = Object.assign({}, this.initial_data, additional_data);
    this.data = new ObservableObject(data);

    let attrs = this.attrs;

    for (let p of this.props) {
      if (p in attrs) {
        this.data[p] = attrs[p];
      }
    }

    let v = null;
    v = this.view(this.data, this.children);

    this.$view = v;

    this.$view.setParentComponent(this);
    this.$node = this.$view.$node;

    this.link();
  }

  view() {
    return null;
  }

  link() {
    // This is typically when middlewares and the component should comunicate.
    for (let m of this.$middleware) {
      m.link();
    }

    return null;
  }

  setParentComponent(component) {
    this.$parentComponent = component;
  }

  getParentComponent(cls) {
    let p = this.$parentComponent;
    if (!p) return null;

    if (p instanceof cls) return p;
    return p.getParentComponent(cls);
  }

  /**
   *
   * This method is bound to
   * @param  {String|Number|Boolean|Node|Component} child
   *         The child we want to add to the current component.
   */
  appendChild(child) {
    // content is a Node.
    let $node = this.$node;

    if (Array.isArray(child)) {

      for (let c of child) {
        this.appendChild(c);
      }

    } else if (typeof child === 'string' || child instanceof Number || child instanceof Boolean) {
      // Simple text node.
      // Note
      $node.appendChild(document.createTextNode(child.toString()));

    } else if (child instanceof Observable) {
      // A text node that will be bound
      // child = new TextObservable(child);
      let txt = document.createTextNode('null');
      // FIXME should do some stringify.
      child.onchange((val) => {
        if (typeof val === 'object') val = JSON.stringify(val);
        txt.textContent = val.toString();
      });
      $node.appendChild(txt);

    } else if (child instanceof Node) {
      $node.appendChild(child);
    } else if (child instanceof Component) {
      // Get its HTML node.
      child.setParentComponent(elt);
      $node.appendChild(child.$node);
    } else {
      // When all else fail, then try to at least create a JSON-ificated version of it.
      // FIXME probably not.
      $node.appendChild(document.createTextNode(JSON.stringify(child)));
    }
  }

  unmount() {
    // remove from the parent DOM node if it is mounted
    // destroy the data, observables and such.
    if (!this.$parentNode) throw new Error('this node was not mounted');
    this.$parentNode.removeChild(this.$node);
    this.$parentNode = null;
    this.data.destroy();
  }

  mount(domnode) {
    if (this.$parentNode) {
      // maybe we could just let the node be mounted elsewhere ?
      throw new Error('already mounted !');
    }
    this.$parentNode = domnode;
    domnode.appendChild(this.$node);
  }

}


/**
 *
 */
export class TextObservable extends Component {

  constructor(obs) {
    super();
    this.$node = document.createTextNode('');

    // Whenever the observed change, just set its value to its string content.
    // obs.onchange((v) => this.$node.textContent = v.toString());
    // obs.onchange((v) => this.$node.textContent);
  }

}


/**
 *
 */
export class HtmlComponent extends Component {
  constructor(elt, attrs = {}, children) {
    super(attrs, children);

    assert('string' === typeof elt);

    this.elt = elt;
  }

  /**
   * Create the html node.
   */
  view(data, children) {

    let e = document.createElement(this.elt);

    for (let attribute_name in this.attrs) {
      let att = this.attrs[attribute_name];

      if (att instanceof Observable) {
        att.onchange((val) => {
          if (typeof val === 'object')
            e.setAttribute(attribute_name, JSON.stringify(val));
          else
            e.setAttribute(attribute_name, val);
        });
      } else {
        e.setAttribute(attribute_name, att);
      }
    }

    // empty setParentComponent as this one shall never have one.
    return {$node: e, setParentComponent() { }};
  }

  compile() {

    super();

    for (let c of this.children) {
      this.appendChild(c);
    }

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
 *         The resulting instanciated component, with a $node property
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

  // By this point, elt.$node is ready for insertion into the DOM.
  return elt;
}
