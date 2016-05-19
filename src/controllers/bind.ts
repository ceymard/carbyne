
import {Controller} from '../controller'
import {Observable} from '../observable'

export class BindController extends Controller {

  obs: Observable<string>
  opts: Object // FIXME this is still unused

  constructor(obs, opts) {
    super()
    this.obs = obs
    this.opts = opts
  }

  onCreate() {
    let element = this.atom.element
    let tag = element.tagName.toLowerCase()
    if (tag === 'input') this.linkToInput(element)
    if (tag === 'select') this.linkToSelect(element)
  }

  linkToSelect(element) {
    let obs = this.obs
    let opts = this.opts
    let atom = this.atom

    atom.listen('change', function (evt) {
      obs.set(this.value)
    })

    atom.observe(obs, (val) => {
      element.value = val
    })
  }

  linkToInput(element) {

    let obs = this.obs
    let opts = this.opts
    let atom = this.atom

    const convert = (val) => {
      if (type === 'number')
        return parseInt(val)
      return val
    }

    let cbk = (evt) => {
      let val = element.value
      obs.set(type === 'number' ? parseInt(val) : val)
    }

    let type = element.type.toLowerCase() || 'text'

    switch (type) {
      case 'color':
      case 'range':
      case 'date':
      case 'datetime':
      case 'week':
      case 'month':
      case 'time':
      case 'datetime-local':
        atom.observe(obs, (val) => val !== element.value && (element.value = val))
        atom.listen('input', cbk)
        break
      case 'radio':
        atom.observe(obs, (val) => {
          element.checked = element.value === val
        })
        atom.listen('change', cbk)
        break
      case 'checkbox':
        atom.observe(obs, (val) => element.checked = val == true)
        atom.listen('change', () => obs.set(element.checked))
        break
      case 'number':
      case 'text':
      case 'password':
      case 'search':
      default:
      atom.observe(obs, (val) => val !== element.value && (element.value = val))
      atom.listen('keyup', cbk)
      atom.listen('input', cbk)
      atom.listen('change', cbk)
    }

  }

  linkToHTML5Editable() {

  }

  linkToBind(bind) {

  }

}
