
import {Eventable} from './events';

export class Controller {

  constructor() {

    this._node = null;

  }

  destroy() { }

  /**
   * Called when dom was created.
   */
  link() { }

  /**
   * Called if unmounted.
   */
  unload() { }

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


/**
 * 	A repeater.
 *
 * 	By default, it will simply compile the provided views with custom data.
 * 	If the array changes and is a simple observable, then all previously
 * 	created elements are destroyed and are recreated on the fly.
 *
 * 	If a track-by was specified, then previously created elements are kept
 * 	and their data just updated with the array value, if it was observable.
 * 	Otherwise they're just kept but basically nothing changes.
 *
 * 	If the provided data is an object, then it automatically has a track-by.
 *
 * 	It has various strategies :
 * 		- track-by
 */
export class Repeat extends Component {

  view(attrs, children) {
    // NOTE some asserts would do nicely here.
    this.data = attrs.data;
    this.view = attrs.view;
    this.watched_children = [];

    return null; // we do not define anything.
  }

  link() {
    let element = this.node.element;

    this.node.once('mount', () => {
      this.end = document.createComment('!Repeat');
      element.parentNode.insertBefore(this.end, element.nextSibling);
      this.node.observe(this.data, this.redraw.bind(this));
    });
  }

  redraw(arr) {
    // FIXME Outdated code !

    let element = this.node.element;
    let parent = element.parentNode;
    let view = this.view;
    let len = arr.length;
    let trackby = this.trackBy;
    let end = this.end;
    let watched = [];

    for (let e of this.watched_children) {
      // FIXME track-by.
      e.unmount();
    }

    for (let i = 0; i < len; i++) {
      let e = view({
          $index0: i,
          $index: i + 1,
          $first: i === 0,
          $last: i === len - 1,
          $value: arr[i]
      });

      // Whatever happens, the view *must* give us some HTML components.
      // assert(e instanceof HtmlNode);

      watched.push(e);
      e.mount(parent, end);
    }

    this.watched_children= watched;

  }

  mount(parent, before) {
    parent.insertBefore(this.node_start, before || null);
    parent.insertBefore(this.node_end, before || null);
    // Generate on array changes.
    this.on('unbind', o.onchange(this.attrs.data, ::this.redraw));
    this.trigger('mount');
  }

  destroy() {
    // Remove everything.
  }

}
