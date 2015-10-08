

export class Component {

}

export class elDOM {
  constructor(elt, attrs, children) {
    this.elt = elt;
    this.attrs = attrs;
    this.children = children;
  }

  view(data) {
    return elc(this.elt, this.attrs, this.children);
  }
}
