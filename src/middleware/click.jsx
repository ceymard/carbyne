
import {Middleware} from '../middleware';

function Click (cbk) {

    return function (component) {

      component.onbind((cpt) => {
        // FIXME should do more processing.
        // also should set up touch events.
        cpt.node.addEventListener('click', cbk);
      });

      return null; // there will be no controller for this middleware.
    }

}

module.exports = Click;
