
import {Eventable} from './eventable'
import {Observable, Observer} from './observable'
// import {Atom} from './atom'

type Atom = any

export class Controller extends Eventable {

  public atom : Atom

  constructor() {
    super()
    this.atom = null
  }

  listen(ev: string, fn: any) {
    return this.atom.listen(ev, fn)
  }

  observe<T>(o: Observable<T>, fn: Observer<T>) {
    return this.atom.observe(o, fn)
  }

  getController(cnt : new () => Controller) {
    return this.atom.getController(cnt)
  }

  onCreate(ev: Event) {}
  onMount(ev: Event) {}
  onUnmount(ev: Event) { }
  onDestroy(ev: Event) { }
  onCreateBefore(ev: Event) { }
  onMountBefore(ev: Event) { }
  onUnmountBefore(ev: Event) { }
  onDestroyBefore(ev: Event) { }

  setAtom(atom : Atom) {
    this.atom = atom
    atom.on('create', this.onCreate.bind(this))
    atom.on('mount', this.onMount.bind(this))
    atom.on('unmount', this.onUnmount.bind(this))
    atom.on('destroy', this.onDestroy.bind(this))
    atom.on('create:before', this.onCreateBefore.bind(this))
    atom.on('mount:before', this.onMountBefore.bind(this))
    atom.on('unmount:before', this.onUnmountBefore.bind(this))
    atom.on('destroy:before', this.onDestroyBefore.bind(this))
  }

}
