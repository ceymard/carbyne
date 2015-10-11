
import {Middleware} from '../middleware';

function Click (cbk) {

    return function (component) {
      return new ClickMiddleware(component, cbk);
    }

}

class ClickMiddleware extends Middleware {

  constructor(component, cbk) {
    super(component);
    this.cbk = cbk;
  }

  link() {
    this.$component.$node.addEventListener('click', this.cbk);
  }

}

module.exports = Click;
