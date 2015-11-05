
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
  }

}
