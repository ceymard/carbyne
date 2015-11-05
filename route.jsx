
import {o} from './observable';
import {Controller} from './controller';
import {VirtualNode} from './node';

export class ViewNode extends VirtualNode {
  constructor() {
    super(...arguments);
    this.name = 'View';
  }
}

/**
 * A view is a virtual node.
 */
export function View(attrs, children) {

}

export function rref(router, path, args) {
  return routeDecorator(node) {

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
