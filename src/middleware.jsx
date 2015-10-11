/**
 * Core middleware for el.
 */

export class Middleware {

  $component = null;
  $unloaders = [];

  constructor(cmp) {
    this.$component = cmp;
  }

  view() { }

  link() { }

  unmount() {
    for (let u of this.$unloaders) {
      u.call(this);
    }
  }

}

exports.Click = require('./middleware/click');
exports.Bind = require('./middleware/bind');
exports.If = require('./middleware/if');
exports.Repeat = require('./middleware/repeat');
