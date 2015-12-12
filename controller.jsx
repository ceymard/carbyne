
export class Controller {

  constructor() {

    this.atom = null;
  }

  onDestroy() {
    // remove reference to the node for easy GC collection.
    this.atom = null;
  }

  setAtom(atom) {
    this.atom = atom;
    if (this.onCreate) atom.on('create', this.onCreate.bind(this));
    if (this.onMount) atom.on('mount', this.onMount.bind(this));
    if (this.onUnmount) atom.on('unmount', this.onUnmount.bind(this));
    if (this.onDestroy) atom.on('destroy', this.onDestroy.bind(this));
  }

}
