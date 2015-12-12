
export class Controller {

  constructor() {

    this.node = null;
  }

  destroy() {
    // remove reference to the node for easy GC collection.
    this.node = null;
  }

  setNode(node) {
    this.node = node;
    if (this.onCreate) node.on('create', this.onCreate.bind(this));
    if (this.onMount) node.on('mount', this.onMount.bind(this));
    if (this.onUnmount) node.on('unmount', this.onUnmount.bind(this));
    if (this.onRemove) node.on('remove', this.onRemove.bind(this));
    if (this.onCreateDOM) node.on('create-dom', this.onCreateDOM.bind(this));
  }

}
