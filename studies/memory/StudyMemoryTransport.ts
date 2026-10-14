import type { StudyRole } from '@orkestrel/study'
import type { StudyMemoryActivity, StudyMemoryTransportOptions, StudyMemoryWire } from './types.js'
import { StudyError, readStudyFailure } from '@orkestrel/study'
import {
	readStudyMemoryRequest,
	readStudyMemorySupport,
	readStudyMemoryTerminal,
	validateStudyMemoryInventory,
	validateStudyMemoryCompletion,
} from './helpers.js'

/** Admits and accounts actual Ollama wire requests and latches every operational failure. */
export class StudyMemoryTransport {
	readonly #options: StudyMemoryTransportOptions
	readonly #abort = new AbortController()
	readonly #wires = new Set<StudyMemoryWire>()
	#activity: StudyMemoryActivity | undefined
	#fault: unknown

	/** Records immutable transport bounds. @param options - Profile and trial signal. */
	constructor(options: StudyMemoryTransportOptions) {
		this.#options = options
	}

	/** Binds subsequent wire requests to one live goal. @param activity - Goal accounting boundary. */
	prepare(activity: StudyMemoryActivity): void {
		this.check()
		if (this.#wires.size !== 0)
			throw new StudyError('FAULT', 'Previous model response is still open')
		this.#activity = activity
	}

	/** Refuses work after any transport fault or trial cancellation. */
	check(): void {
		if (this.#fault !== undefined) throw this.#fault
		this.#options.signal.throwIfAborted()
		this.#abort.signal.throwIfAborted()
	}

	/** Retains an operational failure even if an inner runtime catches it. @param error - Observed failure. */
	fail(error: unknown): void {
		this.#fault ??= error
	}

	/** Checks pinned serving identities through an admitted inventory request. @returns Completion after inventory validation. */
	async verify(): Promise<void> {
		const provider = this.#options.profile.provider
		if (provider === undefined) throw new StudyError('CONFIG', 'Missing serving identity')
		try {
			const response = await this.fetch('metadata', new URL('/api/tags', provider.url), {
				method: 'GET',
			})
			const value: unknown = await response.json()
			validateStudyMemoryInventory(value, this.#options.profile)
			const activity = this.#activity
			if (activity === undefined) throw new StudyError('FAULT', 'Inventory has no goal attribution')
			for (const model of new Set([provider.model, provider.judge])) {
				const support = await this.fetch('metadata', new URL('/api/show', provider.url), {
					method: 'POST',
					body: JSON.stringify({ model }),
					headers: { 'content-type': 'application/json' },
				})
				const metadata: unknown = await support.json()
				const ceiling = readStudyMemorySupport(metadata, this.#options.profile)
				await activity.context.evidence.append({
					event: 'support',
					goal: activity.goal,
					value: { model, ceiling, requested: this.#options.profile.room.context },
				})
			}
			await activity.context.evidence.append({
				event: 'inventory',
				goal: activity.goal,
				value: { model: provider.digest.model, judge: provider.digest.judge },
			})
		} catch (error) {
			this.fail(error)
			throw error
		}
	}

	/** Dispatches exactly one admitted request with bounded streaming reads. @param role - Accountable responsibility. @param input - Exact configured URL. @param init - Native fetch settings. @returns A validated streaming response. */
	async fetch(
		role: StudyRole,
		input: string | URL | Request,
		init?: RequestInit,
	): Promise<Response> {
		this.check()
		const activity = this.#activity
		if (activity === undefined)
			throw new StudyError('FAULT', 'Model dispatch outside an active goal')
		let wire: StudyMemoryWire | undefined
		try {
			const request = readStudyMemoryRequest(this.#options.profile, role, input, init)
			const bound = this.#options.profile.bounds.request
			if (request.bytes >= bound.bytes)
				throw new StudyError('CAPACITY', 'Encoded request consumes the response byte allowance')
			const ticket = await activity.context.meter.admit({
				role,
				tokens: role === 'metadata' ? 0 : this.#options.profile.room.context,
				bytes: bound.bytes,
			})
			const started = performance.now()
			const signal = AbortSignal.any([
				this.#options.signal,
				this.#abort.signal,
				activity.context.signal,
				activity.context.meter.signal,
				ticket.signal,
				AbortSignal.timeout(bound.duration),
				...(init?.signal === undefined || init.signal === null ? [] : [init.signal]),
			])
			try {
				signal.throwIfAborted()
				await activity.context.evidence.append({
					event: 'dispatch',
					goal: activity.goal,
					value: {
						role,
						path: request.path,
						model: request.model ?? null,
						options: { ...request.options },
						bytes: request.bytes,
					},
				})
				signal.throwIfAborted()
				const response = await globalThis.fetch(input, { ...init, signal, redirect: 'error' })
				if (!response.ok || response.body === null) {
					await response.body?.cancel()
					throw new StudyError('FAULT', `Ollama HTTP response refused: ${response.status}`)
				}
				wire = {
					activity,
					request,
					ticket,
					signal,
					reader: response.body.getReader(),
					decoder: new TextDecoder('utf-8', { fatal: true }),
					started,
					bytes: request.bytes,
					text: '',
					terminal: undefined,
					settled: false,
				}
				this.#wires.add(wire)
				return new Response(
					new ReadableStream<Uint8Array>({
						pull: (controller) => this.#pull(wire, controller),
						cancel: (reason: unknown) => this.#cancel(wire, reason),
					}),
					{
						status: response.status,
						headers: {
							'content-type':
								role === 'judge' || role === 'metadata'
									? 'application/json'
									: 'application/x-ndjson',
						},
					},
				)
			} catch (error) {
				if (wire === undefined && !ticket.signal.aborted)
					ticket.fail({ ...readStudyFailure(error), role })
				throw error
			}
		} catch (error) {
			this.fail(error)
			throw error
		}
	}

	/** Cancels every outstanding native reader and permanently closes the transport. @returns Completion after finite native cancellation. */
	async close(): Promise<void> {
		this.#abort.abort(new StudyError('FAULT', 'Memory session closed'))
		await Promise.all([...this.#wires].map((wire) => this.#cancel(wire, this.#abort.signal.reason)))
		this.#activity = undefined
	}

	async #pull(
		wire: StudyMemoryWire | undefined,
		controller: ReadableStreamDefaultController<Uint8Array>,
	): Promise<void> {
		if (wire === undefined) {
			controller.error(new StudyError('FAULT', 'Missing wire state'))
			return
		}
		try {
			wire.signal.throwIfAborted()
			const chunk = await wire.reader.read()
			wire.signal.throwIfAborted()
			if (!chunk.done) {
				wire.bytes += chunk.value.byteLength
				if (wire.bytes > this.#options.profile.bounds.request.bytes)
					throw new StudyError('CAPACITY', 'Ollama wire byte allowance exceeded')
				wire.text += wire.decoder.decode(chunk.value, { stream: true })
				if (wire.request.role !== 'metadata' && wire.request.role !== 'judge')
					this.#rows(wire, false)
				controller.enqueue(chunk.value)
				return
			}
			wire.text += wire.decoder.decode()
			if (wire.request.role === 'metadata') {
				if (wire.request.path === '/api/tags')
					validateStudyMemoryInventory(JSON.parse(wire.text), this.#options.profile)
				else readStudyMemorySupport(JSON.parse(wire.text), this.#options.profile)
			} else if (wire.request.role === 'judge')
				wire.terminal = readStudyMemoryTerminal(JSON.parse(wire.text), wire.request)
			else this.#rows(wire, true)
			if (wire.request.role !== 'metadata' && wire.terminal === undefined)
				throw new StudyError('FAULT', 'Ollama response has no terminal row')
			await this.#finish(wire)
			if (wire.terminal !== undefined)
				validateStudyMemoryCompletion(wire.terminal, this.#options.profile, wire.request)
			controller.close()
		} catch (error) {
			this.fail(error)
			await this.#cancel(wire, error)
			controller.error(error)
		}
	}

	#rows(wire: StudyMemoryWire, final: boolean): void {
		const lines = wire.text.split(/\r\n|\n/)
		wire.text = final ? '' : (lines.pop() ?? '')
		for (const line of lines) {
			if (line.trim() === '') continue
			if (wire.terminal !== undefined)
				throw new StudyError('FAULT', 'Ollama emitted a row after its terminal')
			wire.terminal = readStudyMemoryTerminal(JSON.parse(line), wire.request)
		}
	}

	async #finish(wire: StudyMemoryWire): Promise<void> {
		if (wire.settled) throw new StudyError('FAULT', 'Duplicate wire accounting')
		const terminal = wire.terminal
		await wire.activity.context.evidence.append({
			event: 'wire',
			goal: wire.activity.goal,
			value: {
				role: wire.request.role,
				path: wire.request.path,
				model: wire.request.model ?? null,
				options: { ...wire.request.options },
				finish: terminal?.reason ?? null,
				prompt: terminal?.prompt ?? null,
				completion: terminal?.completion ?? null,
				bytes: wire.bytes,
			},
		})
		wire.settled = true
		try {
			wire.ticket.finish({
				role: wire.request.role,
				calls: 1,
				tokens:
					wire.request.role === 'metadata'
						? 0
						: terminal?.prompt !== undefined && terminal.completion !== undefined
							? terminal.prompt + terminal.completion
							: undefined,
				bytes: wire.bytes,
				duration: Math.ceil(performance.now() - wire.started),
			})
		} finally {
			this.#wires.delete(wire)
			wire.reader.releaseLock()
		}
	}

	async #cancel(wire: StudyMemoryWire | undefined, error: unknown): Promise<void> {
		if (wire === undefined || wire.settled) return
		this.fail(error ?? new StudyError('FAULT', 'Ollama response cancelled before EOF'))
		wire.settled = true
		try {
			if (!wire.ticket.signal.aborted)
				wire.ticket.fail({ ...readStudyFailure(this.#fault), role: wire.request.role })
			await wire.activity.context.evidence.append({
				event: 'wire-failure',
				goal: wire.activity.goal,
				value: { role: wire.request.role, path: wire.request.path, bytes: wire.bytes },
			})
		} finally {
			this.#wires.delete(wire)
			await wire.reader.cancel(error).catch(() => undefined)
			wire.reader.releaseLock()
		}
	}
}
