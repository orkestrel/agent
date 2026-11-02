/**
 * Holds one value a `Channel` buffers and the cell pushed after it.
 *
 * @remarks
 * A `Channel` keeps its unread values as a chain of these cells, from its `#head` cell to its
 * `#tail` cell, so no public signature names this class. The `#next` field is a latch: the
 * `link` method sets it once, and a later call keeps the first cell.
 */
export class ChannelCell<T> {
	readonly #value: T
	#next: ChannelCell<T> | undefined

	/**
	 * Holds a value with no next cell.
	 *
	 * @param value - The value the cell holds
	 */
	constructor(value: T) {
		this.#value = value
	}

	/**
	 * Returns the value the cell holds.
	 *
	 * @returns The value
	 */
	get value(): T {
		return this.#value
	}

	/**
	 * Returns the cell pushed after this one.
	 *
	 * @returns The next cell, or undefined before one is linked
	 */
	get next(): ChannelCell<T> | undefined {
		return this.#next
	}

	/**
	 * Links the cell pushed after this one, once.
	 *
	 * @param cell - The cell pushed after this one
	 */
	link(cell: ChannelCell<T>): void {
		this.#next ??= cell
	}
}
