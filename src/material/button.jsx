
import {el, Component} from 'el/component';
import {o} from 'el/observable';

export class Button extends Component {

  props = ['class', 'raised', 'disabled'];

  view(data) {
    // FIXME missing ripple.
    return <button class={o(this.props.class, (v) => `${v} el-material`)} disabled={this.props.disabled} $$={[
        this.setContentInsertion
      ]}></button>;
  }

}
