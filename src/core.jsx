
import {Observable} from 'el/observable';
import {Component} from 'el/component';

/**
 * Fonctionnement de l'algorithme de création ;
 *
 * 1. On crée récursivement tous les Component.
 */

export class TextObservable extends Component {

  constructor(obs) {
    super({});
    this.$elt = document.createTextNode('');

    // Whenever the observed change, just set its value to its string content.
    // obs.changed((v) => this.$elt.textContent = v.toString());
    obs.changed((v) => this.appendChild);
  }

}

export class HtmlComponent extends Component {
  constructor(elt, attrs, children=[]) {
    super();

    assert(typeof elt === 'string');
    assert(children instanceof Array);

    let e = document.createElement(elt);

    for (let attribute_name in attrs) {
      let att = attrs[a];

      if (att instanceof Observable) {
        att.changed((val) => e.setAttribute(attribute_name, val));
      } else {
        e.setAttribute(attribute_name, attrs[a]);
      }
    }

    this.$elt = e;
  }
}

export function el(elt, attrs, ...children) {
  var middleware = null;

  if (attrs.$$) {
    middleware = attrs.$$;
    delete attrs.$$;
  }

  if (elt instanceof Component) {
    elt = new elt(attrs, children);
    // Do something !
  } else if (typeof elt === 'string') {
    // Create an element that has to be resolved with the scope.
    elt = new HtmlComponent(elt, attrs, children);
      // that only has a view() method.
  }

  // Build the middleware up.
  for (let m of middleware) {
    // FIXME this won't do, we need some kind of way to change
    // the way view() is constructed also.
    // NOTE maybe not, but who the hell knows ????
    elt = m(elt);
  }

  // For each child, construct their node.
  for (let c of children) {
    c.appendChild(c);
  }

    return elt;
}
