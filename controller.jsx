
export class Controller {

  constructor() {

    this.node = null;

  }

  destroy() {
    // remove reference to the node for easy GC collection.
    this.node = null;
  }

  /**
   * Called when dom was created.
   */
  link() { }

  /**
   * Called if unmounted.
   */
  unload() { }

  setNode(node) {
    this.node = node;
  }

}
