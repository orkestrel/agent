import type { ChannelInterface } from './types.js'
import { ChannelCell } from './ChannelCell.js'

/**
 * Buffers chunks in a minimal unbounded async channel — the eager pump writes them in (`push`)
 * and ends it (`close` / `fail`) regardless of consumption, while a consumer reads them back live
 * through the `drain` async-iterator. Decoupling write from read is what lets a producer make
 * progress without a consumer pulling, and it is why an agent's `result` settles whether or not
 * its `events` are drained.
 *
 * @remarks
 * A waiting `drain` call parks its void resolver in the `#waiting` field. The `push` method links a
 * cell after the `#tail` cell, and the `close` and `fail` methods flag the end; each then fires and
 * clears every parked resolver, so each parked reader wakes, reads the `#head` cell, and either
 * takes the next chunk, returns (on `close`), throws (on `fail`), or parks again when another
 * reader took the chunk first. Taking a chunk reads its value and moves `#head` to the next cell
 * synchronously, so each value reaches exactly one reader, a push and a take each cost constant
 * time, and every taken cell but the newest is released at once; the `#tail` field holds the newest
 * cell until the next push links after it, so a channel retains at most one taken value. A reader
 * suspended at its `yield` expression holds only the value it took, never a cell, so the bound on
 * retained values covers both the channel's fields and a suspended reader.
 * A `return()` issued while a read is parked waits for the next `push`, `close`, or `fail`.
 * The parked read takes a pushed value before that `return()` settles.
 *
 * @example
 * ```ts
 * import { Channel } from '@orkestrel/agent'
 *
 * const channel = new Channel<number>()
 * channel.push(1)
 * channel.close()
 * for await (const value of channel.drain()) {
 * 	value // 1
 * }
 * ```
 */
export class Channel<T> implements ChannelInterface<T> {
	#head: ChannelCell<T> | undefined
	#tail: ChannelCell<T> | undefined
	#waiting: ReadonlyArray<() => void> = []
	#closed = false
	#failure: { error: unknown } | undefined

	push(value: T): void {
		const cell = new ChannelCell(value)
		this.#tail?.link(cell)
		this.#tail = cell
		this.#head ??= cell
		this.#signal()
	}

	close(): void {
		this.#closed = true
		this.#signal()
	}

	fail(error: unknown): void {
		// First failure wins; a later close / fail can't override a recorded error.
		if (this.#failure === undefined) this.#failure = { error }
		this.#closed = true
		this.#signal()
	}

	async *drain(): AsyncGenerator<T, void> {
		for (;;) {
			// Yield everything buffered before checking for end, so a close / fail that
			// arrives alongside the last chunks still delivers those chunks first.
			while (this.#head !== undefined) {
				const value = this.#head.value
				this.#head = this.#head.next
				yield value
			}
			if (this.#failure !== undefined) throw this.#failure.error
			if (this.#closed) return
			await this.#park()
		}
	}

	// Wake every parked reader, not one: with concurrent readers, a single woken reader would
	// leave the rest parked past a `close` / `fail`. The list is cleared before firing, so a
	// reader that re-parks arms the next wait. A `signal` with no parked reader is a no-op (the
	// buffer / flags are already set, so the next `drain` pass reads them without parking).
	#signal(): void {
		const waiting = this.#waiting
		this.#waiting = []
		for (const wake of waiting) wake()
	}

	#park(): Promise<void> {
		return new Promise<void>((resolve) => {
			this.#waiting = [...this.#waiting, resolve]
		})
	}
}
