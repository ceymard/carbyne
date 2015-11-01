
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


/**
 * The Component is a specialization of a controller that defines
 * a view and as such can be used during element creation.
 */
// export class Component extends Controller {
//
//   constructor(attrs) {
//     super();
//     this.attrs = attrs;
//   }
//
//   setNode(node) {
//     super(node);
//     let attrs = this.attrs;
//
//     // FIXME this is actually fairly ugly.
//     // Maybe I should decorate with cls() or style()
//     if (attrs.class) {
//       node.attrs.class = o(attrs.class, node.attrs.class||'', (c1, c2) => `${c1} ${c2}`);
//     }
//
//     if (attrs.style) {
//       node.attrs.style = o(attrs.style, node.attrs.style||'', (c1, c2) => `${c1};${c2}`);
//     }
//
//     for (let att of ['id', 'tabindex']) {
//       if (attrs[att]) // The last one to speak wins
//         node.attrs[att] = attrs[att];
//     }
//
//   }
//
//   /**
//    * @param  {Object} attrs    The attributes object that was given
//    * @param  {Array} children An array of children that can therefore be used in the view.
//    * @return {HtmlNode}          Always returns a Node.
//    */
//   view(attrs, children) {
//     return null;
//   }
//
// }
//
//
// /**
//  * 	A repeater.
//  *
//  * 	By default, it will simply compile the provided views with custom data.
//  * 	If the array changes and is a simple observable, then all previously
//  * 	created elements are destroyed and are recreated on the fly.
//  *
//  * 	If a track-by was specified, then previously created elements are kept
//  * 	and their data just updated with the array value, if it was observable.
//  * 	Otherwise they're just kept but basically nothing changes.
//  *
//  * 	If the provided data is an object, then it automatically has a track-by.
//  *
//  * 	It has various strategies :
//  * 		- track-by
//  */
// export class Repeat extends Component {
//
//   view(attrs, children) {
//     // NOTE some asserts would do nicely here.
//     this.data = attrs.data;
//     this.view = attrs.view;
//     this.watched_children = [];
//
//     return null; // we do not define anything.
//   }
//
//   link() {
//     let element = this.node.element;
//
//     this.node.once('mount', () => {
//       this.end = document.createComment('!Repeat');
//       element.parentNode.insertBefore(this.end, element.nextSibling);
//       this.node.observe(this.data, this.redraw.bind(this));
//     });
//   }
//
//   redraw(arr) {
//     // FIXME Outdated code !
//
//     let element = this.node.element;
//     let parent = element.parentNode;
//     let view = this.view;
//     let len = arr.length;
//     let trackby = this.trackBy;
//     let end = this.end;
//     let watched = [];
//
//     for (let e of this.watched_children) {
//       // FIXME track-by.
//       e.unmount();
//     }
//
//     for (let i = 0; i < len; i++) {
//       let e = view({
//           $index0: i,
//           $index: i + 1,
//           $first: i === 0,
//           $last: i === len - 1,
//           $value: arr[i]
//       });
//
//       // Whatever happens, the view *must* give us some HTML components.
//       // assert(e instanceof HtmlNode);
//
//       watched.push(e);
//       e.mount(parent, end);
//     }
//
//     this.watched_children= watched;
//
//   }
//
//   mount(parent, before) {
//     parent.insertBefore(this.node_start, before || null);
//     parent.insertBefore(this.node_end, before || null);
//     // Generate on array changes.
//     this.on('unbind', o.onchange(this.attrs.data, ::this.redraw));
//     this.trigger('mount');
//   }
//
//   destroy() {
//     // Remove everything.
//   }
//
// }
