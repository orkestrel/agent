import type { Capture, ExecutionOptions, Packet } from './types.ts'
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync, writeSync } from 'node:fs'
import { resolve } from 'node:path'
import { computeHash, readString, writeArtifact } from '../aggregate-judge-counterfactual/helpers.ts'
import { DAEMON, HOST, INPUT_FILES, LIMITS, PACKET, PREPARED } from './constants.ts'
import { buildPacket, computeOperator, describeError, readArguments, readFileBinding, scanInventory, validateExecution } from './helpers.ts'

/** Prepares offline inputs and records an explicitly admitted serial diagnostic run. */
export class Driver {
	#output: string | undefined
	#signal: AbortSignal | undefined
	#captures: Capture[] = []

	/** Dispatches explicit preparation or execution and defaults to an offline refusal.
	 * @param argv - The entry arguments
	 * @returns The entry exit code
	 */
	async main(argv: readonly string[]): Promise<number> {
		try {
			if (argv.length === 1 && argv[0] === '--prepare') { this.prepare(); return 0 }
			if (argv[0] !== '--execute') {
				console.log(JSON.stringify({ offline: true, message: 'No HTTP or service mutation. Explicit --prepare or exact-hash --execute required.', host: HOST }))
				return argv.length === 0 ? 0 : 64
			}
			const args = readArguments(argv.slice(1), ['--packet', '--operator', '--receipt', '--custody', '--output', '--host'])
			return await this.execute({ packet: readString(args['--packet']), operator: readString(args['--operator']), receipt: readString(args['--receipt']), custody: readString(args['--custody']), output: readString(args['--output']), host: readString(args['--host']) })
		} catch (error) { console.error(JSON.stringify(describeError(error))); return 64 }
	}

	/** Writes create-only diagnostic inputs and their request plan without HTTP.
	 * @returns Nothing after retaining the packet and inventory
	 */
	prepare(): void {
		mkdirSync(PREPARED)
		writeArtifact(resolve(PREPARED, 'short.json'), [
			{ role: 'system', content: 'Answer the final request only.' },
			{ role: 'user', content: 'The fictional parcel identifier is PARCEL-CEDAR-7319.' },
			{ role: 'assistant', content: 'Acknowledged the parcel identifier.' },
			{ role: 'user', content: 'Reply with that parcel identifier only.' },
		])
		writeArtifact(resolve(PREPARED, 'history.json'), [
			{ role: 'system', content: 'Answer the final request only.' },
			{ role: 'user', content: ' 1'.repeat(2600) },
			{ role: 'assistant', content: 'Acknowledged the older content.' },
			{ role: 'user', content: "Reply 'Ready'." },
		])
		writeArtifact(resolve(PREPARED, 'generation.json'), [
			{ role: 'system', content: 'Provide direct output only.' },
			{ role: 'user', content: 'Output every integer from 1 through 5000, one per line, without commentary or an early stop.' },
		])
		writeFileSync(resolve(PREPARED, 'mica.txt'), `<|im_start|>system\nAnswer the final request only.<|im_end|>\n<|im_start|>user\n${' 1'.repeat(2600)}<|im_end|>\n<|im_start|>assistant\nAcknowledged the older content.<|im_end|>\n<|im_start|>user\nReply 'Ready'.<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n`, { flag: 'wx' })
		const packet = buildPacket()
		writeArtifact(PACKET, packet)
		for (const vector of packet.vectors) writeFileSync(resolve(PREPARED, `${vector.id}.request.bin`), vector.body, { flag: 'wx' })
		writeArtifact(resolve(PREPARED, 'inventory.json'), { packet: readFileBinding(PACKET), operator: computeOperator(), files: scanInventory(PREPARED), inputs: INPUT_FILES, inference: packet.vectors.length, maximum: Math.max(...packet.vectors.map(vector => vector.bytes)), offline: true })
		console.log(JSON.stringify({ packet: readFileBinding(PACKET), operator: packet.operator, inventory: readFileBinding(resolve(PREPARED, 'inventory.json')), inference: packet.vectors.length, maximum: Math.max(...packet.vectors.map(vector => vector.bytes)), offline: true }))
	}

	/** Executes an admitted packet and preserves complete or incomplete raw custody.
	 * @param options - Explicit exact-hash authorization
	 * @returns Zero for completed transport custody, or three for incomplete custody
	 */
	async execute(options: ExecutionOptions): Promise<number> {
		const admission = validateExecution(options)
		mkdirSync(admission.output)
		this.#output = admission.output
		this.#signal = AbortSignal.timeout(LIMITS.duration)
		const started = new Date().toISOString()
		let complete = false
		let error: unknown
		writeFileSync(resolve(admission.output, 'packet.json'), readFileSync(PACKET), { flag: 'wx' })
		writeFileSync(resolve(admission.output, 'daemon-start.bin'), readFileSync(resolve(options.receipt)), { flag: 'wx' })
		writeArtifact(resolve(admission.output, 'runtime.json'), { started, host: options.host, platform: process.platform, node: process.version, executable: readFileBinding(process.execPath), packet: readFileBinding(PACKET), operator: computeOperator(), receipt: admission.binding, sources: admission.packet.bindings, limits: LIMITS })
		try {
			await this.#metadata(admission.packet, 'initial')
			for (const vector of admission.packet.vectors) {
				this.#signal.throwIfAborted()
				const response = await this.#capture(vector.id, vector.route, 'POST', vector.body, LIMITS.response, LIMITS.timeout)
				// The snapshot is attempted even when inference transport failed or exceeded its limit.
				const snapshot = await this.#capture(`${vector.id}-ps`, '/api/ps', 'GET', undefined, LIMITS.metadata, LIMITS.snapshot)
				if (response.breached || snapshot.breached || !response.complete || !snapshot.complete) throw new Error(`Incomplete transport custody: ${vector.id}`)
			}
			await this.#metadata(admission.packet, 'final')
			complete = true
		} catch (failure) { error = describeError(failure) }
		finally {
			writeArtifact(resolve(admission.output, 'inventory.json'), { complete, started, finished: new Date().toISOString(), planned: admission.packet.vectors.map(vector => vector.id), captures: this.#captures, files: scanInventory(admission.output), ...(error === undefined ? {} : { error }) })
		}
		console.log(JSON.stringify({ output: admission.output, complete, inventory: readFileBinding(resolve(admission.output, 'inventory.json')) }))
		return complete ? 0 : 3
	}

	async #metadata(packet: Packet, phase: 'initial' | 'final'): Promise<void> {
		for (const route of phase === 'initial' ? ['/api/version', '/api/tags', '/api/ps'] : ['/api/tags', '/api/ps']) {
			const capture = await this.#capture(`${phase}-${route.slice(5)}`, route, 'GET', undefined, LIMITS.metadata, LIMITS.snapshot)
			if (!capture.complete || capture.breached) throw new Error(`Incomplete metadata: ${route}`)
		}
		if (phase === 'initial') for (const model of packet.models) {
			const capture = await this.#capture(`initial-show-${model.key}`, '/api/show', 'POST', JSON.stringify({ model: model.tag, verbose: false }), LIMITS.metadata, LIMITS.snapshot)
			if (!capture.complete || capture.breached) throw new Error(`Incomplete model metadata: ${model.key}`)
		}
	}

	async #capture(id: string, route: string, method: 'GET' | 'POST', body: string | undefined, limit: number, timeout: number): Promise<Capture> {
		const output = this.#output
		const outer = this.#signal
		if (output === undefined || outer === undefined) throw new Error('Capture requires admitted execution')
		const started = new Date().toISOString()
		const clock = performance.now()
		const controller = new AbortController()
		const signal = AbortSignal.any([outer, AbortSignal.timeout(timeout), controller.signal])
		let complete = false
		let breached = false
		let bytes = 0
		let status: number | undefined
		let error: unknown
		let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
		writeFileSync(resolve(output, `${id}.request.bin`), body ?? '', { flag: 'wx' })
		writeArtifact(resolve(output, `${id}.request.json`), { url: `${DAEMON}${route}`, method, body: body === undefined ? undefined : { hash: computeHash(body), bytes: Buffer.byteLength(body) }, headers: method === 'POST' ? { 'content-type': 'application/json' } : {}, started, timeout, limit })
		const file = openSync(resolve(output, `${id}.response.bin`), 'wx')
		try {
			if (body !== undefined && Buffer.byteLength(body) > LIMITS.request) throw new Error('Request byte ceiling breach before fetch')
			const response = await fetch(`${DAEMON}${route}`, { method, ...(body === undefined ? {} : { body }), headers: method === 'POST' ? { 'content-type': 'application/json' } : {}, redirect: 'error', signal })
			status = response.status
			writeArtifact(resolve(output, `${id}.response-head.json`), { status, text: response.statusText, url: response.url, redirected: response.redirected, headers: Array.from(response.headers.entries()), at: new Date().toISOString(), duration: performance.now() - clock })
			if (response.body === null) complete = true
			else {
				reader = response.body.getReader()
				while (true) {
					const chunk = await reader.read()
					if (chunk.done) { complete = true; break }
					const remaining = limit - bytes
					const retained = chunk.value.subarray(0, remaining)
					writeSync(file, retained)
					bytes += retained.byteLength
					if (chunk.value.byteLength > remaining) {
						breached = true
						controller.abort(new Error(`Response byte ceiling breach: ${id}`))
						throw new Error(`Response byte ceiling breach: ${id}`)
					}
				}
			}
		} catch (failure) { error = describeError(failure) }
		finally {
			closeSync(file)
			if (reader !== undefined) {
				if (!complete) await reader.cancel().catch(() => undefined)
				reader.releaseLock()
			}
		}
		const capture: Capture = { id, complete, breached, bytes, hash: computeHash(readFileSync(resolve(output, `${id}.response.bin`))), ...(status === undefined ? {} : { status }), started, finished: new Date().toISOString(), duration: performance.now() - clock, ...(error === undefined ? {} : { error }) }
		writeArtifact(resolve(output, `${id}.capture.json`), capture)
		this.#captures.push(capture)
		return capture
	}
}
