
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

	private current: Atom[]
	private obs: Observable<T[]>
	private fn: RepeaterFn<T>

	constructor(obs: Observable<T[]>, fn: RepeaterFn<T>) {
		super('repeater') // Virtual Atom
		this.current = []
		this.obs = obs
		this.fn = fn
	}

	mount(parent: Node, before: Node = null) {
		super.mount(parent, before) // mount it normally

		// and then create the observing logic
		this.observe(this.obs.p<number>('length'), (len) => {
			// only update whenever length changes.
			this._update(len)
		})
	}

	/**
	 * The only transformation that takes place is that children are
	 * added or removed if the new array's length is different from
	 * what we are tracking.
	 */
	_update(len: number) {
		var fn = this.fn

		if (!len) {
			this.current = []
			return this.empty()
		}

		if (len < this.current.length) {

			this.current.slice(len).map(atom => atom.destroy())
			this.current = this.current.slice(0, len)

		} else if (len > this.current.length) {
			for (var i = this.current.length; i < len; i++) {
				let atom = fn(this.obs.prop<T>(i.toString()), i)
				this.append(atom)
				this.current.push(atom)
			}
		}

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
