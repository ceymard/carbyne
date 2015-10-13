

export class Component {

  props = [];

  // Should the view be built whenever a component is instanciated ?
  constructor(attrs, children = []) {
    this.data = {};

    for (let p of props) {
      // forward bindings into data. Should they all be observable ?
    }

    // hmm ??
    this.$elt = null;
  }

  /**
   *
   * This method is bound to
   * @param  {String|Number|Boolean|Node|Component} child
   *         The child we want to add to the current component.
   */
  appendChild = (child) => {
    // content is a Node.
    let content = this.$content || this.$elt;

    if (child instanceof String || child instanceof Number || child instanceof Boolean) {
      // Simple text node.
      // Note
      content.appendChild(document.createTextNode(child.toString()));

    } else if (child instanceof Observable) {
      // A text node that will be bound
      child = new TextObservable(c);
      content.appendChild(child.$elt);

    } else if (child instanceof Node) {
      content.appendChild(c);
    } else if (child instanceof Component) {
      // Get its HTML node.
      child.setParent(elt);
      content.appendChild(child.$elt);
    } else {
      // When all else fail, then try to at least create a JSON-ificated version of it.
      // FIXME probably not.
      content.appendChild(JSON.stringify(c));
    }
  }

  view() {
    return null;
  }

  // hmmm ?
  // This is where Repeat could actually get a chance of doing something with the
  // data before the component is created... Or should it be passed along in the
  // constructor ?
  setData(obj) {

  }

}
