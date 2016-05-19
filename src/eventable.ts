
var ident = 0

export type CarbyneEventObj = {
  type: string
  target: Eventable
}

export type CarbyneEvent = CarbyneEventObj | string


export type CarbyneListener = (ev: CarbyneEvent, ...args: Array<any>) => any

/**
 *
 */
export class Eventable {

  protected _listeners : {
    [key: string]: Array<CarbyneListener>
  }

	constructor() {
    this._listeners = {}
	}

  /////////////////////////////////////////////////////////////////

  _mkEvent(event : CarbyneEvent) : CarbyneEventObj {
    if (typeof event === 'string')
      return {
        type: event,
        target: this
      }
    let e = {}
    let x = null
    for (x in <CarbyneEventObj>event)
      e[x] = event[x]
    return <CarbyneEventObj>e
  }

  on(name: string, fn: CarbyneListener) {
    if (!(name in this._listeners)) this._listeners[name] = []
    ident++
    this._listeners[name][ident] = fn
    return this
  }

  off(name: string, fn: CarbyneListener) {
    /// FIXME this is probably severely bugged
    let idx = (this._listeners[name]||[]).indexOf(fn)
    if (idx > 1)
      delete this._listeners[name][idx]
    return this
  }

  once(name: string, fn: CarbyneListener) {
    let self = this
    let cbk = function () {
      fn.apply(this, arguments)
      self.off(name, cbk)
    }
    this.on(name, cbk)
    return this
  }

  /**
   * Call all the listeners on the event
   * @param {[type]} event   [description]
   * @param {[type]} ...args [description]
   */
  trigger(event: CarbyneEvent, ...args) {
    let event_obj = this._mkEvent(event)
    var result = []
    var listeners = this._listeners[event_obj.type] || {}
    var a = [event_obj].concat(args)

    for (var id in listeners) {
      // result.push(listeners[id].call(this, event, ...args))
      result.push(listeners[id].apply(this, a))
    }

    return result
  }

}