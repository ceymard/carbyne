
import {Observable} from 'elt/observable';

export class Component {

  $node = null;
  $content = null;
  $parentComponent = null;

  // List of properties set in the attributes that will be pulled into
  // data as .props
  props = []

  // The data spec for this component. Note that it can be overriden
  // (although rarely, usually by Repeat)
  initial_data = {}

  // Should the view be built whenever a component is instanciated ?
  constructor(attrs = {}) {

    this.attrs = attrs;

  }

  compile = () => {
    // FIXME WE WANT THEM OBSERVABLES
    this.data = Object.assign({}, this.initial_data);

    for (let p of this.props) {
      // forward bindings into data. Should they all be observable ?
    }

    // hmm ?? should I call the view() here ?
    // NOTE $content should be set up somewhere.
    this.$view = this.view(this.data);
    this.$view.setParentComponent(this);
    this.$content = this.$node = this.$view.$node;
  }

  view() {
    return null;
  }

  setContentInsertion = (component) => {
    return {
      // Bound function because we want to access the this.
      view: (data, next) => {
        let elt = next(data);
        this.$content = elt.$node;
        return elt;
      }
    }
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
    let content = this.$content || this.$node;

    if (typeof child === 'string' || child instanceof Number || child instanceof Boolean) {
      // Simple text node.
      // Note
      content.appendChild(document.createTextNode(child.toString()));

    } else if (child instanceof Observable) {
      // A text node that will be bound
      child = new TextObservable(c);
      content.appendChild(child.$node);

    } else if (child instanceof Node) {
      content.appendChild(c);
    } else if (child instanceof Component) {
      // Get its HTML node.
      child.setParentComponent(elt);
      content.appendChild(child.$node);
    } else {
      // When all else fail, then try to at least create a JSON-ificated version of it.
      // FIXME probably not.
      content.appendChild(document.createTextNode(JSON.stringify(child)));
    }
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
    // obs.changed((v) => this.$node.textContent = v.toString());
    obs.changed((v) => this.appendChild);
  }

}


/**
 *
 */
export class HtmlComponent extends Component {
  constructor(elt, attrs) {
    super();

    assert('string' === typeof elt);

    this.elt = elt;
    this.attrs = attrs;
  }

  /**
   * Create the html node.
   */
  view(data) {

    let e = document.createElement(this.elt);

    for (let attribute_name in this.attrs) {
      let att = attrs[a];

      if (att instanceof Observable) {
        att.changed((val) => e.setAttribute(attribute_name, val));
      } else {
        e.setAttribute(attribute_name, attrs[a]);
      }
    }

    // empty setParentComponent as this one shall never have one.
    return {$node: e, setParentComponent() { }};
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
    elt = new HtmlComponent(elt, attrs);

  } else if (elt instanceof Function) {

    // Create a component, as a constructor was given to us as first argument.
    elt = new elt(attrs, children);

  }

  elt.compile();

  // For each child, construct their node.
  for (let c of children) {
    if (typeof c === 'undefined') continue;
    elt.appendChild(c);
  }

  // By this point, elt.$node is ready for insertion into the DOM.
  return elt;
}