
import {Controller} from '../controller';

export class BindController extends Controller {

  constructor(obs, opts) {
    super();
    this.obs = obs;
    this.opts = opts;
  }

  onMount() {
    let element = this.node.element;
    let tag = element.tagName.toLowerCase();
    if (tag === 'input') this.linkToInput(element);
  }

  linkToInput(element) {

    let obs = this.obs;
    let opts = this.opts;
    let node = this.node;

    let cbk = (evt) => {
      let val = element.value;
      obs.set(val);
    }

    let type = element.type.toLowerCase() || 'text';

    switch (type) {
      case 'color':
      case 'range':
      case 'date':
      case 'datetime':
      case 'week':
      case 'month':
      case 'datetime-local':
        node.observe(obs, (val) => element.value = val);
        element.addEventListener('input', cbk);
        break;
      case 'radio':
        node.observe(obs, (val) => {
          element.checked = element.value === val
        });
        element.addEventListener('change', cbk);
        break;
      case 'checkbox':
        node.observe(obs, (val) => element.checked = val == true);
        element.addEventListener('change', () => obs.set(element.checked));
        break;
      case 'number':
      case 'text':
      case 'password':
      case 'search':
      default:
      node.observe(obs, (val) => element.value = val);
      element.addEventListener('keyup', cbk);
      element.addEventListener('input', cbk);
      element.addEventListener('change', cbk);
    }

  }

  linkToHTML5Editable() {

  }

  linkToBind(bind) {

  }

}
