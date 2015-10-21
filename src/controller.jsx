
import {Eventable} from './events';

export class Controller {

  constructor() {

    this._node = null;

  }

  set node(value) {
    if (this._node) return; // FIXME error or de-initialize ?

    this._node = value;
    // FIXME Initialize the code that is to be called when this addin is affected a node.
  }
  get node() { return this._node; }

}


/**
 * The Component is a specialization of a controller that defines
 * a view and as such can be used during element creation.
 */
export class Component extends Controller {

  /**
   * @param  {Object} attrs    The attributes object that was given
   * @param  {Array} children An array of children that can therefore be used in the view.
   * @return {HtmlNode}          Always returns a Node.
   */
  view(attrs, children) {
    return null;
  }

}
