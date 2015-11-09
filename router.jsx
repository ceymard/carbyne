
import {o} from './observable';
import {Controller} from './controller';
import {VirtualNode} from './node';

function _merge(o1, o2) {
  for (let name in o2) o1[name] = o2[name];
}

export class Router {

  constructor() {
    this.states = {};

    this.view_nodes = {};
    this.computed_views = o({});

    this.currently_active_states = [];

    this.current_state = null;
    this.data = null;

    // views is observable
    this.views = o({});

    // Query is an observable, since we don't use it in routing.
    this.query = o(null);
  }

  default(name, args) {
    this.default = {name, args};
  }

  /**
   * Create a new state for our router.
   * @param {String} name The name of the state.
   * @param {object} desc The full description of the state.
   */
  state(name, url, fn) {

    if (this.states[name]) throw new Error(`state '${name}' is already defined`);

    let state = {
      name: name,
      url: url,
      // view: desc.view || null,
      // views: desc.views || {},
      data: {},
      fn: fn,
      // parent: desc.parent || null,
      is_active: o(false),
      params: []
    }

    let parent_idx = name.lastIndexOf('.');
    if (parent_idx > -1) {
      state.parent = name.substring(0, parent_idx);
      if (!this.states[state.parent]) throw new Error(`parent state '${state.parent}' does not exist`);
      state.parent = this.states[state.parent];
    }

    // Get the full URL.
    this.states[name] = state;
    let parent = this.states[(state.parent||{}).name];
    let full_url = state.url;
    while (parent) {
      full_url = parent.url + full_url;
      parent = this.states[(parent.parent||{}).name];
    }
    state.url = full_url;

    // Extract the name parameters and convert them to [^\/]+
    // FIXME
    // Also extract the name reconstruction from groupings.

    state.regexp = new RegExp(`^${full_url}$`, 'i');

    state.getUrl = (params) => {

    };

    state.match = (url) => {

    };
  }

  setUrl(url) {
    // 1. Find the state that matches with the url.
    // use go();

    for (let name in this.states) {
      let st = this.states[name];
      var matches = st.regexp.exec(url);
      if (matches) {
        this._go(st.name); // FIXME parse params !!!!
        break;
      }
    }
  }

  /**
   * NOTE This function should return a promise instead of doing it
   * 			all inline.
   * @param  {Object} state The state object to activate.
   */
  activate(state, params, states=[], views={}, data={}) {

    if (state.parent) {
      this.activate(state.parent, params, states, views, data);
    }

    states[state.name] = true;
    if (state.is_active.get()) {
      _merge(views, state.view_nodes);
      _merge(data, state.active_data);
      return;
    };

    let _views = {};
    // FIXME recreate data !!

    state.fn(_views, params, data);
    state.view_nodes = _views;
    state.active_data = data;
    _merge(views, _views);
  }

  _go(state_name, params = {}) {
    let state = this.states[state_name];
    if (!state) throw new Error(`no such state.`);

    let activated = {};

    let new_views = {};
    let data = {};
    this.activate(state, params, activated, new_views, data);

    // NOTE if we got here, it means that the state change was validated.

    for (let name in this.currently_active_states) {
      if (!(name in activated)) {
        this.states[name].is_active.set(false);
      }
    }

    for (let name in activated) {
      this.states[name].is_active.set(true);
    }

    this.currently_active_states = activated;

    this.computed_views.set(new_views);
  }

  /**
   * [go description]
   * @param  {[type]} state_name [description]
   * @param  {[type]} params     [description]
   * @return {Promise} A promise that tells when the state has been fully activated.
   */
  go(state_name, params = {}) {
    // FIXME Find out what is the url that corresponds to the current state and setUrl it
    // if we're linked to the location.
    this._go(state_name, params);
  }

  linkWithLocation() {
    let change = (event) => {
      let hash = window.location.hash;
      this.setUrl(hash.split('?')[0].slice(1));
    }

    window.addEventListener('hashchange', change);
    change();
  }

  /**
   * A decorator that sets up the href
   */
  href(name, params) {
    return (node) => {
      let state = this.states[name];
      node.attrs.href = '#' + state.url;

      node.on('mount', (ev) => {
        node.observe(state.is_active, (b) => {
          if (b) node.element.classList.add('active');
          if (!b) node.element.classList.remove('active');
        })
      });
    }
  }

}


var count = 0;
export class ViewNode extends VirtualNode {
  constructor(name) {
    super();
    this.name = `View<${count++}> '${name}'`;
  }
}


export class ViewController extends Controller {
  constructor(name) {
    super();
    this.name = name;
  }

  setNode(node) {
    super(node);
    this.unregister = null;
    node.on('mount', (ev) => {
      if (!this.router) {
        let parent_ctrl = node.parent.getController(ViewController);
        this.setRouter(parent_ctrl.router);
      } else this.link();
    });
  }

  link() {
    if (this.node && this.router && this.node.element)
      this.node.observe(this.router.computed_views.path(this.name), (v) => this.setContent(v));
  }

  setContent(c) {
    this.node.removeChildren();
    this.node.append(c);
  }

  setRouter(router) {
    this.router = router;
    this.link();
  }
}


/**
 * A view is a virtual node.
 */
export function View(attrs, children) {

  let vctrl = new ViewController(attrs.name);


  let node = new ViewNode(attrs.name);
  node.addController(vctrl);

  if (attrs.router)
    vctrl.setRouter(attrs.router);

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
