/**
 * Core middleware for el.
 */

export class Middleware {

  $component = null;

  constructor(cmp) {
    this.$component = cmp;
  }

  view() { }

  link() { }

}

exports.Click = require('./middleware/click');
exports.Bind = require('./middleware/bind');
exports.If = require('./middleware/if');
exports.Repeat = require('./middleware/repeat');
