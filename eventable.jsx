
var ident = 0


export class Eventable {

	constructor() {
    this._listeners = {}
	}

  /////////////////////////////////////////////////////////////////

  _mkEvent(event) {
    if (typeof event === 'string')
      return {
        type: event,
        target: this,
        prevent_default: false,
        preventDefault() { this.prevent_default = true },
        propagating: true,
        stopPropagation() { this.propagating = false },
    }
    let e = {}
    var x = null
    for (x in event)
      e[x] = event[x]
    return e
  }

  on(name, fn) {
    if (!(name in this._listeners)) this._listeners[name] = []
    ident++
    this._listeners[name][ident] = fn
    return this
  }

  off(name, ident) {
    delete (this._listeners[name]||{})[ident||'---']
    return this
  }

  once(name, fn) {
    let self = this
    let cbk = function () {
      fn.apply(this, arguments)
      self.off(name, cbk)
    }
    this.on(name, cbk)
    return this
  }

  trigger(event, ...args) {
    event = this._mkEvent(event)
    var result = []
    var listeners = this._listeners[event.type] || {}
    var a = [event].concat(args)

    for (var id in listeners) {
      // result.push(listeners[id].call(this, event, ...args))
      result.push(listeners[id].apply(this, a))
    }

    return result
  }

  destroy() {
    this._listeners = null
  }

}