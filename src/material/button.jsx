
import {Component} from '../controller';
import {o} from '../observable';
import {elt} from '../node';

import './button.styl';

export class Button extends Component {

  view(attrs, children) {
    // FIXME missing ripple.
    return <span class='eltm-button-touchable'><button class={o(attrs.class, (v) => `${v||''} eltm-button`)} disabled={attrs.disabled}>
      {children}
    </button></span>;
  }

}
