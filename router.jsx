
import {o} from './observable';
import {Controller} from './controller';
import {VirtualNode} from './node';

function _merge(o1, o2) {
  for (let name in o2) o1[name] = o2[name];
}


/**
 * A single state, able to tell if it matches an url.
 */
export class State {
  constructor(name, url, fn, parent) {
    this.name = name;
    this.url_part = url;
    this.full_url = '';
    this.fn = fn;
    this.parent = parent;
    this.param_names = [];
    this.regexp = null;

    this.view_nodes = null;
    this.active_data = null;
    this.virtual = false;

    this.is_active = o(false);

    this.build();
  }

  deactivate() {
    this.is_active.set(false);
    this.view_nodes = null;
    this.active_data = null;
  }

  build() {
    let full_url = this.url_part;
    let parent = this.parent;

    while (parent) {
      full_url = `${parent.url_part}${full_url}`;
      parent = parent.parent;
    }

    this.regexp = new RegExp('^' + full_url.replace(/:[a-zA-Z_$]\w*/g, (v) => {
      this.param_names.push(v.slice(1)); // remove the leading :
      return '([^/]+)';
    }) + '$');

    this.full_url = full_url;
  }

  getUrl(params = {}) {
    if (this.virtual) throw new Error('Virtual states don\'t have urls.');
    let url = this.full_url;
    for (let p of this.param_names) {
      url = url.replace(`:${p}`, params[p]);
    }
    return url;
  }

  match(url) {
    if (this.virtual) return null;

    let matches = this.regexp.exec(url);

    // this state does not match the url.
    if (!matches) return null;

    // build the params.
    let params = {};
    let pars = this.param_names;
    let l = this.param_names.length;
    for (let i = 0; i < l; i++) {
      params[pars[i]] = matches[i + 1];
    }
    return params;
  }

  /**
   * NOTE This function should return a promise instead of doing it
   * 			all inline.
   * @param  {Object} state The state object to activate.
   */
  activate(params, activated={}, views={}, data={}) {

    if (this.parent) {
      this.parent.activate(params, activated, views, data);
    }

    activated[this.name] = true;
    if (this.is_active.get()) {
      _merge(views, this.view_nodes);
      _merge(data, this.active_data);
      return;
    };

    let _views = {};
    // FIXME recreate data !!

    this.fn(_views, params, data);
    this.view_nodes = _views;
    this.active_data = data;
    _merge(views, _views);
  }


}


/**
 * A router that can link to window.location.
 */
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
    this.params = o({});

    this.linked = false; // true if linked to location.
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

    let parent_idx = name.lastIndexOf('.');
    let parent = null;
    if (parent_idx > -1) {
      parent = name.substring(0, parent_idx);
      if (!this.states[parent]) throw new Error(`parent state '${parent}' does not exist`);
      parent = this.states[parent];
    }

    let state = new State(name, url, fn, parent);
    this.states[name] = state;
    return state;
  }

  virtualState(name, url, fn) {
    this.state(name, url, fn).virtual = true;
  }

  setUrl(url) {
    for (let name in this.states) {
      let st = this.states[name];
      let params = st.match(url);
      if (params) {
        this._go(st, params);
        return;
      }
    }

    let defaults = this.default;
    this.go(defaults.name, defaults.params);
  }

  _go(state, params = {}) {
    let activated = {};

    let new_views = {};
    let data = {};
    state.activate(this.params, activated, new_views, data);

    // NOTE if we got here, it means that the state change was validated.

    let states = this.states;
    for (let name in this.currently_active_states) {
      if (!(name in activated)) {
        states[name].deactivate();
      }
    }

    for (let name in activated) {
      states[name].is_active.set(true);
    }

    this.currently_active_states = activated;

    this.computed_views.set(new_views);
    this.params.set(params);
  }

  /**
   * [go description]
   * @param  {[type]} state_name [description]
   * @param  {[type]} params     [description]
   * @return {Promise} A promise that tells when the state has been fully activated.
   */
  go(state_name, params = {}) {
    let state = this.states[state_name];
    if (!state) throw new Error('no such state');
    if (!this.linked) {
      this._go(this.states[state_name], params);
    } else {
      let url = state.getUrl(params);
      window.location.hash = '#' + url;
    }
  }

  linkWithLocation() {
    this.linked = true;

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
      // node.attrs.href = '#' + state.getUrl(params);

      node.on('mount', (ev) => {
        node.observe(params, (p) => {
          node.element.href = '#' + state.getUrl(params);
        });

        node.observe(o(state.is_active, this.params, (act, pars) => {
          if (!act) return false;
          if (!params) return true;
          for (let x in pars) {
            if (pars[x] !== params[x].toString()) return false;
          }
          return true;
        }), (b) => {
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
    this.name = `View<${name}>`;
  }
}


export class ViewController extends Controller {
  constructor(name) {
    super();
    this.name = name;
  }

  onMount() {
    if (!this.router) {
      let parent_ctrl = this.node.parent.getController(ViewController);
      this.setRouter(parent_ctrl.router);
    } else this.link();
  }

  link() {
    if (this.node && this.router && this.node.element)
      this.node.observe(this.router.computed_views.path(this.name), (v) => {
        if (v && typeof v !== 'function') throw new Error(`Views must be functions in '${this.name}'`);
        this.setContent(v);
      });
  }

  setContent(c) {
    this.node.empty(); // detach the children, remove the children.
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
