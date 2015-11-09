
import {o} from './observable';
import {Controller} from './controller';
import {VirtualNode} from './node';


export class Router {

  constructor() {
    this.states = {};

    this.active_views = {};
    this.computed_views = {};

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

  registerView(view) {
    let name = view.name;

    if (!(name in this.active_views))
      this.active_views[name] = [];
    this.active_views[name].push(view);
    if (this.computed_views[name])
      view.setContent(this.computed_views[name])
  }

  unregisterView(view) {
    let av = this.active_views[view.name]||[];
    let idx = av.indexOf(view);
    if (idx > -1) av.splice(idx, 1);
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
        this.go(st.name); // FIXME parse params !!!!
        break;
      }
    }
  }

  /**
   * NOTE This function should return a promise instead of doing it
   * 			all inline.
   * @param  {Object} state The state object to activate.
   */
  activate(state, params, states=[]) {
    let prev = {};
    if (state.parent) {
      prev = this.activate(state.parent, params, states);
    }

    states[state.name] = true;
    if (state.is_active.get()) {
      return {views: {}, data: state.active_data};
    };

    let views = Object.assign({}, prev.views||{});
    let data = Object.assign({}, prev.data||{});

    state.fn(views, params, data);
    state.active_views = views;
    state.active_data = data;
    // console.log(views, data);
    return {views, data};
  }

  /**
   * [go description]
   * @param  {[type]} state_name [description]
   * @param  {[type]} params     [description]
   * @return {Promise} A promise that tells when the state has been fully activated.
   */
  go(state_name, params = {}) {
    let state = this.states[state_name];
    if (!state) throw new Error(`no such state.`);

    let activated = {};
    let {views, data} = this.activate(state, params, activated);

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

    for (let name in views) {
      for (let v of this.active_views[name]||[]) {
        v.setContent(views[name]);
      }
    }

    this.computed_views = views;
    // NOTE  how do I track that view has not changed ?
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


export class ViewNode extends VirtualNode {
  constructor(name) {
    super();
    this.name = `View '${name}'`;
  }
}


export class ViewController extends Controller {
  constructor(name) {
    super();
    this.name = name;
  }

  setNode(node) {
    super(node);
    if (!this.router) node.on('mount', function () {
      // look for a parent controller.
      // that way we can find which view we are linked to in the router.
    });
  }

  setContent(c) {
    this.node.removeChildren();
    this.node.append(c);
  }

  setRouter(router) {
    this.router = router;
    router.registerView(this);
  }
}


/**
 * A view is a virtual node.
 */
export function View(attrs, children) {

  let vctrl = new ViewController(attrs.name);

  if (attrs.router)
    vctrl.setRouter(attrs.router);

  let node = new ViewNode(attrs.name);
  node.addController(vctrl);

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
