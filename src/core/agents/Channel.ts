import type { ChannelInterface } from './types.js'

/**
 * Buffers chunks in a minimal unbounded async channel — the eager pump writes them in (`push`)
 * and ends it (`close` / `fail`) regardless of consumption, while a consumer reads them back live
 * through the `drain` async-iterator. Decoupling write from read is what lets a producer make
 * progress without a consumer pulling, and it is why an agent's `result` settles whether or not
 * its `events` are drained.
 *
 * @remarks
 * A waiting `drain` parks its void resolver in `#waiting`; `push` / `close` / `fail`
 * enqueue/flag, then fire and clear every parked resolver, so each parked reader wakes,
 * re-reads the shared buffer, and either takes the next chunk, returns (on `close`), throws
 * (on `fail`), or parks again when another reader took the chunk first. Taking a chunk is
 * synchronous, so each value reaches exactly one reader.
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
	#buffer: ReadonlyArray<{ readonly value: T }> = []
	#waiting: ReadonlyArray<() => void> = []
	#closed = false
	#failure: { error: unknown } | undefined

	push(value: T): void {
		this.#buffer = [...this.#buffer, { value }]
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
			while (this.#buffer.length > 0) {
				const [cell, ...remaining] = this.#buffer
				this.#buffer = remaining
				if (cell !== undefined) yield cell.value
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
