
import {o} from './observable';
import {Controller} from './controller';
import {VirtualNode} from './node';


export class Router {

  constructor() {
    this.states = {};
    // Query is an observable, since we don't use it in routing.
    this.query = o();
  }

  /**
   * Create a new state for our router.
   * @param {String} name The name of the state.
   * @param {object} desc The full description of the state.
   */
  addState(name, desc) {

    if (this.states[name]) throw new Error(`state '${name}' is already defined`);

    let state = {
      name: name,
      url: desc.url || '',
      view: desc.view || null,
      views: desc.views || {},
      data: desc.data || {},
      parent: desc.parent || null,
      is_active: o(false),
      params: []
    }

    let parent_idx = name.lastIndexOf('.');
    if (!desc.parent && name.lastIndexOf('.') > -1) {
      state.parent = name.substring(0, parent_idx);
    }
    if (state.parent && !this.states[state.parent]) throw new Error(`parent state '${state.parent}' does not exist`);

    // Get the full URL.
    this.states[name] = state;
    let parent = this.states[state.parent];
    let full_url = state.url;
    while (parent) {
      full_url = parent.url + full_url;
    }

    // Extract the name parameters and convert them to [^\/]+
    // FIXME
    // Also extract the name reconstruction from groupings.

    state.regexp = new RegExp(`^${full_url}$`, 'i');
  }

  setUrl(url) {
    // 1. Find the state that matches with the url.
    // 2. Compute its parents to have the full list of states that are to be activated.
    // 3. Evaluate the decorators if any to check protection on all the states.
    //    3.b. if something was returned, do something about it (probably change URL and state, or
    //    cancel the change with some error)
    // 4. Swap the active state list (Views will unload their contents when they change since
    //    they watch the router)
  }

  go(state_name, params, query) {

  }

  linkWithLocation() {
    window.addEventListener('hashchange', (event) => {
      console.log(event.newURL, event.oldURL);
      console.log(window.location);
    });
  }

  /**
   * A decorator that sets up the href
   */
  href(node) {
    node.attrs.href = 'javascript:'; // this is by default.

    node.on('mount', () => {
      // Logically, when mount is called we're sure that the links have been set up.
    });
  }

}


export class ViewNode extends VirtualNode {
  constructor() {
    super(...arguments);
    this.name = 'View';
  }
}


export class ViewController extends Controller {
  setNode(node) {
    super(node);
    node.on('mount', function () {
      // look for a parent controller.
      // that way we can find which view we are linked to in the router.
    });
  }
}


/**
 * A view is a virtual node.
 */
export function View(attrs, children) {

  let vctrl = new ViewController();

  if (attrs.router)
    vctrl.setRouter(attrs.router);

  let node = new ViewNode();
  node.setController(vctrl);

  return node;

}

export function rref(router, path, args) {
  return function routeDecorator(node) {

  }
}

// NOTE This is what is needed :
//
// - Route aliasing : It is a good thing to call a route by a single name.
// - Route default : what happens when we can't find the route ?
// - isActive for links to know when their route is actually the active one.
//    Have to be careful for the immense number of watchers that would create. Maybe
//    associate them with the route somehow ?
// - Route gards (before navigate to) that can return a route or just cancel the
//    current route change.
// - Child Routers ?

// Decorate the routes. We're already using those, so why not use for instance
// auth decorators ? (middlewares ?)
// Should the route send events ?
// Should we instead use promises to switch between states ?
