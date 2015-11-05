
import {o} from './observable';
import {Controller} from './controller';
import {VirtualNode} from './node';

export class State {

  constructor(desc) {

  }

}


export class Router {

  constructor() {
    this.states = {};
    // maps fully constructed urls to states.
    this.url_mapping = {};
  }

  addState(name, desc) {

  }

  dispatch(url, params, query) {

  }

  // Will only be called on the main router.
  setUrl(url) {

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
