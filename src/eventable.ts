
var ident = 0

type Event = {
  type: string
  target: Eventable
}

export class Eventable {

  _listeners : Object

	constructor() {
    this._listeners = {}
	}

  /////////////////////////////////////////////////////////////////

  _mkEvent(event : string | Event) : Event {
    if (typeof event === 'string')
      return {
        type: event,
        target: this
      }
    let e = {}
    let x = null
    for (x in <Event>event)
      e[x] = event[x]
    return <Event>e
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
    return this
  }

}