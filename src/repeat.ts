
import {VirtualAtom, Atom} from './atom'
import {Observable} from './observable'

export type RepeaterFn<T> = (o: Observable<T>, idx?: number) => Atom

/**
 * Use the repeater when you want to render an Array and not have its elements
 * completely re-rendered everytime the array changes (including when only a
 * sub-element is modified.)
 *
 * The Repeater needs an Observable<Array> and a render function that takes
 * an observable as its argument. If the length of the observed array changes,
 * elements are removed or added accordingly.
 */
export class RepeaterAtom<T> extends VirtualAtom {

	_current_length: number
	_obs: Observable<T[]>
	_fn: RepeaterFn<T>

	constructor(obs: Observable<T[]>, fn: RepeaterFn<T>) {
		super('repeater') // Virtual Atom
		this._current_length = 0
		this._obs = obs
		this._fn = fn
	}

	mount(parent: Node, before: Node = null) {
		super.mount(parent, before) // mount it normally

		// and then create the observing logic
		this.observe(this._obs.p('length'), (len) => {
			// only update whenever length changes.
			this._update(this._obs.get())
		})
	}

	/**
	 * The only transformation that takes place is that children are
	 * added or removed if the new array's length is different from
	 * what we are tracking.
	 */
	_update(arr: T[]) {
		var fn = this._fn

		if (arr == null || arr.length == 0) {
			return this.empty()
		}

		if (arr.length < this._current_length) {
			// remove the elements we don't need anymore

			this.atomChildren()
				.slice(arr.length)
				.map(atom => atom.destroy())

		} else if (arr.length > this._current_length) {
			for (var i = this._current_length; i < arr.length; i++) {
				this.append(fn(this._obs.prop<T>(i.toString()), i))
			}
		}

		this._current_length = arr.length
		return null
	}

}


/**
 * A wrapper function meant to use the RepeaterAtom more easily.
 *
 * Either use {Repeat(o_array, o_item => ...)}
 * or <Repeat obs={o_array} render={o_item => ...}/>
 */
export function Repeat<T>(obs: Observable<T[]>, fn: RepeaterFn<T>) {
	return new RepeaterAtom<T>(obs, fn)
}
