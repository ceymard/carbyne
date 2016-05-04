
export {bind, click, cls, transition, ctrl} from './decorators'
export {Controller} from './controller'
export {o, Observable} from './observable'
export {Atom, ObservableAtom, VirtualAtom} from './atom'
export {Eventable} from './eventable'
export {pathget, pathset, identity, noop, clonedeep, merge, debounce, exists} from './helpers'

import {Controller} from './controller'
import {Atom} from './atom'
import {o, Observable} from './observable'

var _re_elt_name = /^[^\.#]*/
var _re_cls_or_id = /[\.#][^\.#]+/g

var _add_cls = (attrs, added) => {
  attrs.class = attrs.class ? o(attrs.class, added, (o1, o2) => `${o1} ${o2}`) : added
}

export function c(elt, attrs) {
  var atom = null

  var special_attrs = ['id', 'tabindex']
  var i = null
  var children = []
  for (i = 2; i < arguments.length; i++)
    children.push(arguments[i])

  attrs = attrs || {}

  let decorators = attrs.$$

  if (decorators) {
    delete attrs.$$
    if (!Array.isArray(decorators)) decorators = [decorators]
  }

  if (typeof elt === 'string') {

    // Add to class the .<class name> part or set the id if the provided
    // string had a #<id> in it.
    elt.replace(_re_cls_or_id, match => {
      if (match[0] === '.') {
        _add_cls(attrs, match.slice(1))
      } else attrs.id = match.slice(1)
    })

    elt = _re_elt_name.exec(elt)[0] || 'div'

    // If we have a string, then it is a simple html element.
    atom = new Atom(elt, attrs, children)

  } else if (typeof elt === 'function') {
    // If it is a function, then the element is composite.
    atom = elt(attrs, children)
    atom.builder = elt

    // The following code forwards diverse and common html attributes automatically.
    if (attrs.class) {
      if (atom.attrs.class)
        // NOTE the fact that we use o() does not necessarily create an Observable ;
        // if neither of the class attributes are, then the function returns directly
        // with the value.
        _add_cls(atom.attrs, attrs.class)
        // atom.attrs.class = o(attrs.class, atom.attrs.class, (c1, c2) => `${c1} ${c2}`);
      else atom.attrs.class = attrs.class;
    }

    // Forward the style attriute.
    if (attrs.style) {
      if (atom.attrs.style)
        atom.attrs.style = o(attrs.style, atom.attrs.style, (c1, c2) => `${c1};${c2}`)
      else atom.attrs.style = attrs.style
    }

    for (i = 0; i < special_attrs.length; i++) {
      if (attrs[special_attrs[i]]) // The last one to speak wins
        atom.attrs[special_attrs[i]] = attrs[special_attrs[i]]
    }

  } else {
    throw new Error('wrong type')
  }

  var decorated = null

  // A decorator generally sets up events and add controllers
  if (decorators) {
    for (i = 0; i < decorators.length; i++) {
      if (decorators[i] instanceof Controller) {
        decorators[i].setAtom(atom)
      } else {
        decorated = decorators[i](atom)
        atom = decorated instanceof Atom ? decorated : atom
      }
    }
  }

  // At this point, we have an atom that is ready to be inserted.
  return atom
}

export function Fragment(attrs, children) {
  return children
}

// module.exports = {
//   // core
//   c, Fragment,
//   // observable
//   // o, Observable,
//   // atom
//   Atom, ObservableAtom, VirtualAtom,
//   // controller
//   Controller,
//   // decorators
//   bind, click, cls, transition, ctrl,
//   // helpers
//   pathget, pathset, identity, noop, clonedeep, merge, debounce, exists,
//   // eventable
//   Eventable
// }
