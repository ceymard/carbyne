
import {bind, click, cls, transition, ctrl} from './decorators';
import {Controller} from './controller';
import {o, Observable} from './observable';
import {HtmlNode, VirtualNode} from './node';


function c(elt, attrs, ...children) {
  let node = null;
  attrs = attrs || {};

  let decorators = attrs.$$;

  if (decorators) {
    delete attrs.$$;
    if (!Array.isArray(decorators)) decorators = [decorators];
  }

  if (typeof elt === 'string') {
    // If we have a string, then it is a simple html element.
    node = new HtmlNode(elt, attrs, children);

  } else if (typeof elt === 'function') {
    // If it is a function, then the element is composite.
    node = elt(attrs, children);

    // The following code forwards diverse and common html attributes automatically.
    if (attrs.class) {
      if (node.attrs.class)
        // NOTE the fact that we use o() does not necessarily create an Observable ;
        // if neither of the class attributes are, then the function returns directly
        // with the value.
        node.attrs.class = o(attrs.class, node.attrs.class, (c1, c2) => `${c1} ${c2}`);
      else node.attrs.class = attrs.class;
    }

    // Forward the style attriute.
    if (attrs.style) {
      if (node.attrs.style)
        node.attrs.style = o(attrs.style, node.attrs.style, (c1, c2) => `${c1};${c2}`);
      else node.attrs.style = attrs.style;
    }

    for (let att of ['id', 'tabindex']) {
      if (attrs[att]) // The last one to speak wins
        node.attrs[att] = attrs[att];
    }

  } else {
    throw new Error('wrong type')
  }

  // A decorator generally sets up events and add controllers
  if (decorators) {
    for (let d of decorators) {
      node = d(node) || node;
    }
  }

  // At this point, we have a node that is ready to be inserted or something.
  return node;
}


module.exports = {c, o, Observable, HtmlNode, VirtualNode,
  Controller,
  bind, click, cls, transition, ctrl
};
