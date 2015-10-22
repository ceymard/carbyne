
import {Component} from '../controller';
import {o} from '../observable';
import {cls} from '../decorators';
import {elt} from '../node';

import './button.styl';

export class Button extends Component {

  view(attrs, children) {
    // FIXME missing ripple.
    return <button class='eltm-button' disabled={attrs.disabled}>
      <span class='eltm-button-content' $$={cls({disabled: attrs.disabled, raised: attrs.raised})} >{children}</span>
    </button>;
    // class={o(attrs.class, attrs.disabled, (v, d) => `${v||''} ${d ? 'disabled' : ''} eltm-button-content`)}
  }

}
