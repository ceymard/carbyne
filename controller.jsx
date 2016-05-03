
import {Eventable} from './eventable'

export class Controller extends Eventable {

  constructor() {
    super()
    this.atom = null
  }

  onDestroy() {
    // remove reference to the node for easy GC collection.
    this.atom = null
  }

  listen() {
    return this.atom.listen(...arguments)
  }

  observe() {
    return this.atom.observe(...arguments)
  }

  getController() {
    return this.atom.getController(...arguments)
  }

  setAtom(atom) {
    this.atom = atom
    if (this.onCreate) atom.on('create', this.onCreate.bind(this))
    if (this.onMount) atom.on('mount', this.onMount.bind(this))
    if (this.onUnmount) atom.on('unmount', this.onUnmount.bind(this))
    if (this.onDestroy) atom.on('destroy', this.onDestroy.bind(this))
    if (this.onCreateBefore) atom.on('create:before', this.onCreateBefore.bind(this))
    if (this.onMountBefore) atom.on('mount:before', this.onMountBefore.bind(this))
    if (this.onUnmountBefore) atom.on('unmount:before', this.onUnmountBefore.bind(this))
    if (this.onDestroyBefore) atom.on('destroy:before', this.onDestroyBefore.bind(this))
  }

}
