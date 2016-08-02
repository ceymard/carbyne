export {bind, click, cls, on, once, listen, observe} from './decorators'
export {Controller} from './controller'
export {o, Observable, O, ArrayObservable, Observer, DependentObservable, PropObservable} from './observable'
export {Atom, ObservableAtom, VirtualAtom, BasicAttributes, Appendable, Observe} from './atom'
export {pathget, pathset, identity, noop, clonedeep, merge, debounce, throttle, resolve} from './helpers'
export {RepeaterAtom, Repeat} from './repeat'
export {Eventable, CarbyneEvent, CarbyneListener} from './eventable'
export {If, Then, Else, Match, Case} from './control'


///////////////////////////////////////////////////////////////

import {cls} from './decorators'
import {Controller} from './controller'
import {Atom, BasicAttributes, Appendable, DecoratorFn, Decorator} from './atom'
import {o} from './observable'

var _re_elt_name = /^[^\.#]*/
var _re_cls_or_id = /[\.#][^\.#]+/g

export type FnBuilder = (a: BasicAttributes, children: Array<any>) => Atom
export type Builder = string | FnBuilder

export interface C {
  (elt: Builder, attrs?: BasicAttributes, ...children: Appendable[]): Atom
  createElement: (elt: Builder, attrs?: BasicAttributes, ...children: Appendable[]) => Atom
}

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
export var c: C = function c(elt: Builder, attrs: BasicAttributes = {}, ...children: Appendable[]) : Atom {
  var atom: Atom = null

  var special_attrs: string[] = ['id', 'tabindex']
  var i = 0
  // var children = []
  // for (i = 2; i < arguments.length; i++)
  //   children.push(arguments[i])

  attrs = attrs || {}

  let decorators: Decorator[] = null
  let $$ = attrs.$$

  if ($$) {
    delete attrs.$$
    // FIXME couldn't find a way of correctly de-typing decorators
    if (!Array.isArray($$)) decorators = [$$ as any]
    else decorators = $$ as any
  }

  if (typeof elt === 'string') {

    let str_elt = <string>elt
    let classes: string[] = []
    // Add to class the .<class name> part or set the id if the provided
    // string had a #<id> in it.
    str_elt.replace(_re_cls_or_id, match => {
      if (match[0] === '.') {
        // _add_cls(attrs, match.slice(1))
        classes.push(match.slice(1))
      } else attrs.id = match.slice(1)
      return ''
    })

    str_elt = _re_elt_name.exec(str_elt)[0] || 'div'
    var _cls = attrs.class
    delete attrs.class

    // If we have a string, then it is a simple html element.
    atom = new Atom(str_elt, attrs, children)
    if (_cls) cls(_cls)(atom)
    if (classes.length) cls(...classes)(atom)

  } else if (typeof elt === 'function') {
    // If it is a function, then the element is composite.

    var _class = attrs.class
    var _style = attrs.style
    delete attrs.class
    delete attrs.style

    atom = elt(attrs, children)

    if (_class) {
      cls(_class)(atom)
    }

    // Forward the style attriute.
    // XXX may need a style decorator.
    if (_style) {
      if (atom.attrs['style'])
        atom.attrs['style'] = o(attrs.style, atom.attrs['style'], (c1: string, c2: string) => `${c1};${c2}`)
      else atom.attrs['style'] = attrs.style
    }

    for (i = 0; i < special_attrs.length; i++) {
      if (attrs[special_attrs[i]]) // The last one to speak wins
        atom.attrs[special_attrs[i]] = attrs[special_attrs[i]]
    }

  } else {
    throw new Error('wrong type')
  }

  var decorated: Atom = null

  // A decorator generally sets up events and add controllers
  if (decorators) {
    for (i = 0; i < decorators.length; i++) {
      if (decorators[i] instanceof Controller) {
        atom.addController(decorators[i] as Controller)
      } else {
        decorated = (decorators[i] as DecoratorFn)(atom)
        atom = decorated instanceof Atom ? decorated : atom
      }
    }
  }

  // At this point, we have an atom that is ready to be inserted.
  return atom
} as C

c.createElement = c

export function Fragment(attrs: {}, children: Appendable): Atom {
  // ugly, ugly hack...
  return children as any
}


declare global {
  namespace JSX {
    export type Element = Atom
    export interface ElementClass {
      (attrs: BasicAttributes, children: Appendable): Atom
    }
    export interface IntrinsicElements {
      [name: string]: any
    }
  }
}