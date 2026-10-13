import { NetworkWitness } from '../aggregate-judge-counterfactual/NetworkWitness.ts'

/** Installs the established refusing fetch witness for an offline child entry. */
export class Guard {
	#native = new NetworkWitness()
	#dispatches = 0

	constructor() {
		globalThis.fetch = this.#refuseFetch.bind(this)
		process.on('exit', this.#report.bind(this))
	}

	#refuseFetch(): Promise<Response> {
		this.#dispatches += 1
		throw new Error('Offline witness refuses fetch before native dispatch')
	}

	#report(): void {
		console.log(JSON.stringify({ witness: true, global: this.#dispatches, native: this.#native.count }))
		if (this.#dispatches !== 0 || this.#native.count !== 0) process.exitCode = 3
		this.#native.close()
	}
}
