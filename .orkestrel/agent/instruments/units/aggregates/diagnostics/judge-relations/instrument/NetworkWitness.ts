import { channel } from 'node:diagnostics_channel'

/** Counts native Undici dispatch events without changing transport behavior. */
export class NetworkWitness {
	readonly #channel = channel('undici:request:create')
	readonly #handler = this.#observe.bind(this)
	#count = 0

	constructor() { this.#channel.subscribe(this.#handler) }
	get count(): number { return this.#count }
	close(): void { this.#channel.unsubscribe(this.#handler) }
	#observe(): void { this.#count += 1 }
}
