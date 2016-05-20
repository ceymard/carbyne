export {bind, click, cls, ctrl} from './decorators'
export {Controller} from './controller'
export {o, Observable, O, ArrayObservable, Observer} from './observable'
export {Atom, ObservableAtom, VirtualAtom, BaseAtom} from './atom'
export {Eventable} from './eventable'
export {pathget, pathset, identity, noop, clonedeep, merge, debounce} from './helpers'
export {RepeaterAtom, Repeat} from './repeat'

import {Controller} from './controller'
import {BaseAtom, Atom} from './atom'
import {o, Observable, O} from './observable'

var _re_elt_name = /^[^\.#]*/
var _re_cls_or_id = /[\.#][^\.#]+/g

var _add_cls = (attrs, added) => {
  attrs.class = attrs.class ? o(attrs.class, added, (o1, o2) => `${o1} ${o2}`) : added
}

export interface BasicAttributes {
  id?: O<string>
  class?: O<string>
  width?: O<string>
  height?: O<string>
}

export type FnBuilder = (a: BasicAttributes, children: Array<any>) => BaseAtom
export type Builder = string | FnBuilder


/**
 * The main carbyne function.
 *
 * Can be called pure .jsx style or directly with some support for hyperscript-like syntax ;
 *
 * c('.class') gives an Atom that holds <div class='class'></div>
 *
 * @param  {String|Function} elt  Either the tag name or a function that returns an Atom
 * @param  {Object} attrs The attributes that should go onto the final Atom.
 * @return {Atom} The instanciated Atom.
 */
export function c(elt: Builder, attrs: any = {}, children: Array<any> = []) {
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

    let str_elt = <string>elt
    // Add to class the .<class name> part or set the id if the provided
    // string had a #<id> in it.
    str_elt.replace(_re_cls_or_id, match => {
      if (match[0] === '.') {
        _add_cls(attrs, match.slice(1))
      } else attrs.id = match.slice(1)
      return ''
    })

    str_elt = _re_elt_name.exec(str_elt)[0] || 'div'

    // If we have a string, then it is a simple html element.
    atom = new Atom(str_elt, attrs, children)

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
        atom.addController(decorators[i])
      } else {
        decorated = decorators[i](atom)
        atom = decorated instanceof Atom ? decorated : atom
      }
    }
  }

  // At this point, we have an atom that is ready to be inserted.
  return atom
}

c.createElement = c

export function Fragment(attrs, children) {
  return children
}

export function If(cond, fn, fnelse?) {
  return o(cond, val => val ? fn(val) : (fnelse ? fnelse(val) : null))
}

export function Then(fn) { return fn }
export function Else(fn) { return fn }

export function Match(obj, ...args) {
  return o(obj, val => {
    var i = 0
    var res = null
    for (i = 0 ; i < args.length; i++) {
      res = args[i](obj)
      if (res) return res
    }
    return null
  })
}

export function Case(test, fn) {
  if (typeof test === 'function')
    return function (obj) {
      if (test(obj)) return fn(obj)
    }
  return function (obj) {
    if (test === obj) return fn(obj)
  }
}
