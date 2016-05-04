
import {VirtualAtom} from './atom'


/**
 * Use the repeater when you want to render an Array and not have its elements
 * completely re-rendered everytime the array changes (including when only a
 * sub-element is modified.)
 *
 * The Repeater needs an Observable<Array> and a render function that takes
 * an observable as its argument. If the length of the observed array changes,
 * elements are removed or added accordingly.
 */
export class RepeaterAtom extends VirtualAtom {

	constructor(obs, fn) {
		super() // Virtual Atom
		this._current_length = 0
		this._obs = obs
		this._fn = fn
	}

	mount() {
		super.mount(...arguments) // mount it normally

		// and then create the observing logic
		this.observe(this._obs, arr => {
			this._update(arr)
		})
	}

	/**
	 * The only transformation that takes place is that children are
	 * added or removed if the new array's length is different from
	 * what we are tracking.
	 */
	_update(arr) {
		var fn = this._fn

		if (!Array.isArray(arr))
			return this.empty()

		if (arr.length < this._current_length) {
			// remove the elements we don't need anymore

			this.children
				.slice(arr.length)
				.map(atom => atom.destroy())

		} else if (arr.length > this._current_length) {
			for (var i = this._current_length; i < arr.length; i++) {
				this.append(fn(this._obs.prop(`${i}`), i))
			}
		}

		this._current_length = arr.length
	}

}


/**
 * A wrapper function meant to use the RepeaterAtom more easily.
 *
 * Either use {Repeat(o_array, o_item => ...)}
 * or <Repeat obs={o_array} render={o_item => ...}/>
 */
export function Repeat(obs, fn) {
	if (typeof fn !== 'function') {
		return new RepeaterAtom(obs.obs, obs.render)
	}
	return new RepeaterAtom(obs, fn)
}
