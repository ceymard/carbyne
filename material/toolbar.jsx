
import {Component} from '../controller';
import {elt} from '../node';

import './toolbar.styl';

export class Toolbar extends Component {

  view(attrs, children) {

    return <div class='eltm-toolbar'>
        {children}
      </div>;

  }

}
