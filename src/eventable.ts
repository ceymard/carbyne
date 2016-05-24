
export type CarbyneEvent<T> = {
  type: string
  target: T
}

export type CarbyneListener<T> = (ev: CarbyneEvent<T>, ...args: Array<any>) => any


/**
 *
 */
export class Eventable {

  protected _listeners: {
    [key: string]: CarbyneListener<Eventable>[]
  } = null


  _mkEvent(event: CarbyneEvent<this> | string): CarbyneEvent<this> {
    if (typeof event === 'string') {
      return {
        type: event,
        target: this as any // this is due to a quirk that prevents us to say that T is necessarily
        	// derived from Eventable.
      }
    }

    // FIXME no more copy
    return event as CarbyneEvent<this>
  }

  on(name: string, fn: CarbyneListener<this>) {
    if (!this._listeners) this._listeners = {}
    if (!(name in this._listeners)) this._listeners[name] = []
    this._listeners[name].push(fn)
    return this
  }

  off(name: string, fn: CarbyneListener<this>) {
    /// FIXME this is probably severely bugged
    let idx = (this._listeners[name] || []).indexOf(fn)
    if (idx > 1)
      delete this._listeners[name][idx]
    return this
  }

  once(name: string, fn: CarbyneListener<this>) {
    let self = this
    let cbk = function() {
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
  trigger(event: CarbyneEvent<this> | string, ...args: any[]) {
    if (!this._listeners) return

    let event_obj = this._mkEvent(event)
    var result: any[] = [] // FIXME
    var listeners = this._listeners[event_obj.type] || []

    for (let ls of listeners) {
      result.push(ls(event_obj, ...args))
    }

    return result
  }

}
