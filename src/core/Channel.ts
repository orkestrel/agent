/**
 * A minimal unbounded async channel — the eager pump WRITES chunks into it (`push`)
 * and ends it (`close` / `fail`) regardless of consumption; a consumer READS them back
 * live via the `drain` async-iterator. Decoupling write from read is what lets a
 * producer make progress without a consumer pulling.
 *
 * @remarks
 * The standard resolver-swap: a waiting `drain` parks on `#wake` (a void resolver);
 * `push` / `close` / `fail` enqueue/flag, then fire `#wake` so the parked reader wakes,
 * re-reads the buffer, and either yields the next chunk, returns (on `close`), or throws
 * (on `fail`). Event-free, no `!` / `as` / `any`.
 */
export class Channel<T> {
	readonly #buffer: T[] = []
	#wake: (() => void) | undefined
	#closed = false
	#failure: { error: unknown } | undefined

	push(value: T): void {
		this.#buffer.push(value)
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
				const next = this.#buffer.shift()
				if (next !== undefined) yield next
			}
			if (this.#failure !== undefined) throw this.#failure.error
			if (this.#closed) return
			await this.#parked()
		}
	}

	// Resolve the parked reader (if any) and clear the slot — a fresh `#parked()` arms
	// the next wait. A `signal` with no parked reader is a no-op (the buffer / flags are
	// already set, so the next `drain` pass reads them without parking).
	#signal(): void {
		const wake = this.#wake
		this.#wake = undefined
		wake?.()
	}

	#parked(): Promise<void> {
		return new Promise<void>((resolve) => {
			this.#wake = resolve
		})
	}
}
