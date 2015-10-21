
import {Controller} from '../controller';

export function Click (cbk) {

    return function (node) {

      node.once('dom-created', function () {
        this.$node.addEventListener('click', cbk);
      });

    };

}
