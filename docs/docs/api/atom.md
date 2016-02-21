# Atom

## element

The `Node` this Atom handles.

## mount()

```javascript
Atom#mount(node : DOMNode, before : ?DOMNode = null)
```

## append()

```javascript
Atom#append(element : Array<Element> | Node | Atom | string | Observable) : Atom
	returns: this
```

Append an element to this atom.

The behaviour depends on the type of `element` ;

* `string`: a TextNode is created and appended to this atom's element
* [Node](https://developer.mozilla.org/en/docs/Web/API/Node): it is simply appended to `this.element`
* `Atom`: it is mounted on `this.element` and appended to `this.children`
* `Array`: `append()` is called on each of its constituents
* `Observable`: An `ObservableAtom` is created with this observable and appended to this Atom.

!!!note
	Refrain from using this method in your code à la jQuery. JSX or using `c()` is far more effective
	and readable.