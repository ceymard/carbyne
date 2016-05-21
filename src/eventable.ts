
export type CarbyneEvent = {
  type: string
  target: Eventable
}

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

  _mkEvent(event : CarbyneEvent | string) : CarbyneEvent {
    if (typeof event === 'string') {
      return {
        type: event,
        target: this
      }
    }

    // FIXME no more copy
    return event as CarbyneEvent
  }

  on(name: string, fn: CarbyneListener) {
    if (!(name in this._listeners)) this._listeners[name] = []
    this._listeners[name].push(fn)
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
  trigger(event: CarbyneEvent | string, ...args: any[]) {
    let event_obj = this._mkEvent(event)
    var result = []
    var listeners = this._listeners[event_obj.type] || []

    for (let ls of listeners) {
      result.push(ls(event_obj, ...args))
    }

    return result
  }

}