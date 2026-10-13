import { closeSync, openSync, writeFileSync, writeSync } from 'node:fs'
import { resolve } from 'node:path'
import { DAEMON } from './constants.ts'
import { computeHash, writeArtifact } from './helpers.ts'

/** Records real requests and cloned responses without changing forwarded arguments. */
export class Recorder {
	readonly #output: string
	readonly #forward = globalThis.fetch.bind(globalThis)
	#count = 0
	#body: string | undefined
	#label: string | undefined
	#response: Uint8Array | undefined

	constructor(output: string) {
		this.#output = output
	}

	get count(): number { return this.#count }
	get response(): Uint8Array | undefined { return this.#response }

	/** Arms one frozen body before a sequential judge request. */
	arm(label: string, body: string): void {
		this.#label = label
		this.#body = body
		this.#response = undefined
	}

	/** Forwards the real local request and preserves cloned response bytes. */
	async fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
		if (typeof input !== 'string' || input !== `${DAEMON}/api/generate` || init?.method !== 'POST' || typeof init.body !== 'string' || this.#body === undefined || this.#label === undefined || init.body !== this.#body) throw new Error('Transport or frozen serialized body mismatch before forwarding')
		const label = this.#label
		this.#body = undefined
		this.#label = undefined
		const started = performance.now()
		writeFileSync(resolve(this.#output, `${label}.request.bin`), Buffer.from(init.body, 'utf8'), { flag: 'wx' })
		writeArtifact(resolve(this.#output, `${label}.request.json`), { url: input, method: init.method, body: init.body, hash: computeHash(init.body), bytes: Buffer.byteLength(init.body), at: new Date().toISOString(), headers: { content: new Headers(init.headers).get('content-type') ?? 'absent' } })
		this.#count += 1
		let response: Response | undefined
		let returned = false
		try {
			response = await this.#forward(input, init)
			writeArtifact(resolve(this.#output, `${label}.response-head.json`), { status: response.status, text: response.statusText, url: response.url, redirected: response.redirected, headers: Object.fromEntries(['content-type', 'content-length', 'date', 'server', 'transfer-encoding', 'content-encoding'].map(name => [name, response?.headers.get(name) ?? 'absent'])) })
			const clone = response.clone()
			if (clone.body === null) throw new Error('Missing response body')
			const reader = clone.body.getReader()
			const chunks: Uint8Array[] = []
			const file = openSync(resolve(this.#output, `${label}.response.bin`), 'wx')
			let completed = false
			try {
				while (true) {
					const chunk = await reader.read()
					if (chunk.done) { completed = true; break }
					chunks.push(chunk.value)
					writeSync(file, chunk.value)
				}
			} finally {
				closeSync(file)
				if (!completed) await reader.cancel().catch(() => undefined)
				reader.releaseLock()
			}
			const bytes = new Uint8Array(Buffer.concat(chunks))
			this.#response = bytes
			writeArtifact(resolve(this.#output, `${label}.response.json`), { status: response.status, hash: computeHash(bytes), bytes: bytes.length, wall: performance.now() - started, body: Buffer.from(bytes).toString('utf8') })
			returned = true
			return response
		} catch (error) {
			writeArtifact(resolve(this.#output, `${label}.transport-error.json`), { error: error instanceof Error ? error.message : String(error), wall: performance.now() - started, count: this.#count, captured: this.#response !== undefined })
			throw error
		} finally {
			if (!returned && response?.body !== null && response?.body !== undefined) await response.body.cancel().catch(() => undefined)
		}
	}
}
