
import {Controller} from '../controller';

export class BindController extends Controller {

  constructor(obs, opts) {
    super();
    this.obs = obs;
    this.opts = opts;
  }

  linkToInput() {

    let obs = this.obs;
    let opts = this.opts;
    let node = this.node;
    let domnode = node.$node;

    let cbk = (evt) => {
      let val = domnode.value;
      obs.set(val);
    }

    let type = domnode.type.toLowerCase() || 'text';

    switch (type) {
      case 'color':
      case 'range':
      case 'date':
      case 'datetime':
      case 'week':
      case 'month':
      case 'datetime-local':
        node.observe(obs, (val) => domnode.value = val);
        domnode.addEventListener('input', cbk);
        break;
      case 'radio':
        node.observe(obs, (val) => {
          domnode.checked = domnode.value === val
        });
        domnode.addEventListener('change', cbk);
        break;
      case 'checkbox':
        node.observe(obs, (val) => domnode.checked = val == true);
        domnode.addEventListener('change', () => obs.set(domnode.checked));
        break;
      case 'number':
      case 'text':
      case 'password':
      case 'search':
      default:
      node.observe(obs, (val) => domnode.value = val);
      domnode.addEventListener('keyup', cbk);
      domnode.addEventListener('input', cbk);
      domnode.addEventListener('change', cbk);
    }

  }

  linkToHTML5Editable() {

  }

  link() {
    // We're calling bind on a classic HTML node.
    let tag = this.node.$node.tagName.toLowerCase();

    // FIXME need to check if we're in editing mode of an HTML node (usually by checking its attributes)
    if (tag === 'input') this.linkToInput();

  }

}
