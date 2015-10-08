
import {Observable} from 'el/observable';
import {Component} from 'el/component';

export function el(elt, attrs, ...children) {
  var middleware = null;

  if (attrs.$$) {
    middleware = attrs.$$;
    delete attrs.$$;
  }

    // Heya.
    if (elt instanceof Component) {
      // Do something !
    } else if (typeof elt === 'function') {

    } else if (typeof elt === 'string') {

    }
}


export class BindHtml extends Component {

  constructor(attrs, children) {
    super(attrs, children);
    assert(attrs.model && attrs.model instanceof Observable);
    this.insertion_point = document.createComment('bind-html');
  }

  view(data) {
    return this.insertion_point;
  }
}
