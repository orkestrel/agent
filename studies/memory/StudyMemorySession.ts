import type {
	AgentInterface,
	ConversationInterface,
	LedgerGauge,
	LedgerInterface,
	Message,
	ProviderInterface,
	ProviderRequest,
} from '@orkestrel/agent'
import type { JSONValue } from '@orkestrel/contract'
import type { ToolContext, ToolManagerInterface } from '@orkestrel/tool'
import type {
	StudyContext,
	StudyEvidence,
	StudyGoal,
	StudyProduct,
	StudySessionInterface,
} from '@orkestrel/study'
import type {
	StudyMemoryActivity,
	StudyMemoryDispatch,
	StudyMemoryEstimate,
	StudyMemoryInput,
	StudyMemoryOllamaOptions,
	StudyMemoryProvenance,
	StudyMemoryProvenanceSource,
	StudyMemorySessionOptions,
	StudyMemoryObservation,
	StudyMemoryStage,
	StudyMemoryStamp,
} from './types.js'
import { createBudget } from '@orkestrel/budget'
import { cloneJSONValue, isJSONValue, isObject } from '@orkestrel/contract'
import { createTool, createToolManager } from '@orkestrel/tool'
import { StudyError } from '@orkestrel/study'
import {
	STUDY_MEMORY_JUDGE,
	STUDY_MEMORY_SYSTEM,
	STUDY_MEMORY_THRESHOLDS,
	STUDY_MEMORY_TOPICS,
} from './constants.js'
import {
	buildStudyMemoryOrigins,
	buildStudyMemoryParts,
	buildStudyMemoryRevision,
	projectStudyMemoryRequest,
	readStudyMemoryError,
	readStudyMemoryGauge,
	buildStudyMemoryReadings,
	readStudyMemorySettings,
	validateStudyMemoryUsage,
} from './helpers.js'
import { StudyMemoryObserver } from './StudyMemoryObserver.js'
import { StudyMemoryTransport } from './StudyMemoryTransport.js'
import { StudyMemoryJudge } from './StudyMemoryJudge.js'
import { isStudyMemoryInput } from './validators.js'

/** Preserves actual Agent, Ledger and conversation state across a trial's goals. */
export class StudyMemorySession implements StudySessionInterface {
	readonly #options: StudyMemorySessionOptions
	readonly #transport: StudyMemoryTransport
	readonly #tools: ToolManagerInterface
	readonly #settings: StudyMemoryObservation
	readonly #agent: AgentInterface
	readonly #conversation: ConversationInterface
	readonly #ledger: LedgerInterface | undefined
	readonly #summary: ProviderInterface
	readonly #arrivals = new Set<string>()
	readonly #records = new Map<string, StudyMemoryInput['records'][number]>()
	// Message ids this consumer added or named, joined to their origin; the summary instruction is fixed.
	readonly #explicit = new Map<string, StudyMemoryProvenance>([
		['summary-instruction', { origin: 'instructions', source: 'summary' }],
	])
	// The session executes goals serially and awaits each summary before the Agent's next request, so one
	// current dispatch per role cannot be overtaken by another of the same role.
	#agentDispatch: StudyMemoryDispatch | undefined
	#summaryDispatch: StudyMemoryDispatch | undefined
	#ordinal = 0
	#dispatches = 0
	#input: string | undefined
	#admission: StudyMemoryStamp | undefined
	#refused: unknown
	#active: StudyMemoryActivity | undefined
	#trace: StudyEvidence[] = []
	#work: Promise<StudyProduct> | undefined
	#closing: Promise<void> | undefined

	/** Composes a fresh real runtime from admitted public factories. @param options - Trial dependencies and memory treatment. */
	constructor(options: StudyMemorySessionOptions) {
		const compaction = options.arm === 'compaction'
		const gauge = compaction ? readStudyMemoryGauge(options.profile.settings) : undefined
		// Compaction refuses an overflowing prompt instead of letting the daemon truncate or shift it; other arms keep the omitted controls.
		const strict: Pick<StudyMemoryOllamaOptions, 'truncate' | 'shift'> = compaction
			? { truncate: false, shift: false }
			: {}
		this.#options = options
		this.#tools = createToolManager()
		this.#settings = readStudyMemorySettings(options.profile.settings)
		this.#transport = new StudyMemoryTransport({
			profile: options.profile,
			signal: options.signal,
			observe: this.#settings.observe,
			timing: options.provider.extractTiming,
			...(compaction ? { strict: true } : {}),
		})
		const settings = options.profile.provider
		if (settings === undefined) throw new StudyError('CONFIG', 'Memory provider is required')
		const room = options.profile.room
		// Every arm wraps the agent provider, so toggling passive capture keeps the same wrapper overhead.
		const provider = new StudyMemoryObserver({
			provider: options.provider.createOllama({
				model: settings.model,
				url: settings.url,
				think: room.think,
				...strict,
				timeout: options.profile.bounds.request.duration,
				options: { num_ctx: room.context, num_predict: room.output, temperature: 0, seed: 0 },
				fetch: (input, init) => this.#transport.fetch('agent', input, init, this.#agentDispatch),
			}),
			subject: options.subject,
			gauge,
			record: (reading, request) => this.#record(reading, request),
		})
		this.#summary = options.provider.createOllama({
			model: settings.model,
			url: settings.url,
			think: false,
			...strict,
			timeout: options.profile.bounds.request.duration,
			options: { num_ctx: room.context, num_predict: room.recap, temperature: 0, seed: 0 },
			fetch: (input, init) => this.#transport.fetch('summary', input, init, this.#summaryDispatch),
		})
		const lookup = createTool({
			name: 'lookup',
			description: 'Reads the latest released public reference snapshot by id',
			parameters: {
				type: 'object',
				properties: { id: { type: 'string' } },
				required: ['id'],
				additionalProperties: false,
			},
			execute: (args, context) => this.#lookup(args, context),
		})
		this.#tools.add(lookup)
		if (options.arm === 'records') {
			const judge = new StudyMemoryJudge(
				options.provider.createOllamaJudge({
					model: settings.judge,
					system: STUDY_MEMORY_JUDGE,
					url: settings.url,
					timeout: options.profile.bounds.request.duration,
					options: { num_ctx: room.context, num_predict: 1, temperature: 1, seed: 0 },
					fetch: (input, init) => this.#transport.fetch('judge', input, init),
				}),
				this.#transport,
			)
			this.#ledger = options.subject.createLedger(provider, {
				judge,
				system: STUDY_MEMORY_SYSTEM,
				topics: STUDY_MEMORY_TOPICS,
				questions: options.subject.LEDGER_QUESTIONS,
				thresholds: STUDY_MEMORY_THRESHOLDS,
				capacity: room.context - room.safety,
				predict: room.output,
				think: room.think,
				share: { prompt: 1, tail: 0.35 },
				lookups: [
					{
						tool: lookup,
						read: (args) =>
							typeof args.id === 'string' && this.#records.has(args.id)
								? {
										ids: [args.id],
										owners: [{ id: args.id, names: [this.#records.get(args.id)?.name ?? args.id] }],
									}
								: undefined,
					},
				],
				agent: {
					limit: 8,
					timeout: options.profile.bounds.goal.duration,
					on: { fault: (error) => this.#translate(error) },
				},
			})
			this.#agent = this.#ledger.agent
			this.#conversation = this.#ledger.conversation
		} else {
			this.#ledger = undefined
			const conversations = options.subject.createConversationManager()
			this.#conversation = conversations.add(
				gauge === undefined
					? {}
					: { keep: 2, summarize: (messages, signal) => this.#summarize(messages, signal, gauge) },
			)
			this.#agent = new options.subject.Agent(provider, {
				conversations,
				tools: this.#tools,
				strict: true,
				limit: 8,
				timeout: options.profile.bounds.goal.duration,
				signal: options.signal,
				...(gauge === undefined
					? {}
					: {
							window: createBudget<ProviderRequest>({
								max: room.context - room.output - room.safety,
								consumer: (request) => this.#admit(request, gauge),
							}),
						}),
				on: { fault: (error) => this.#translate(error) },
				error: (error) => this.#translate(error),
			})
			this.#agent.context.instructions.add({ name: 'desk', content: STUDY_MEMORY_SYSTEM })
		}
	}

	/** Executes a public goal against preserved state and retains its observable product. @param goal - Public arrivals, request and references. @param context - Parent accounting and evidence. @returns Actual complete or partial content. */
	async execute(goal: StudyGoal, context: StudyContext): Promise<StudyProduct> {
		if (this.#closing !== undefined || this.#work !== undefined)
			throw new StudyError('CONFIG', 'Memory session is closed or busy')
		if (!isStudyMemoryInput(goal.input))
			throw new StudyError('CONFIG', 'Malformed public memory input')
		const work = this.#execute(goal.id, goal.input, context)
		this.#work = work
		try {
			return await work
		} finally {
			this.#work = undefined
		}
	}

	/** Cancels native work and drains the actual agent before releasing managers. @returns Completion after session cleanup. */
	close(): Promise<void> {
		this.#closing ??= this.#dispose()
		return this.#closing
	}

	async #execute(
		goal: string,
		input: StudyMemoryInput,
		context: StudyContext,
	): Promise<StudyProduct> {
		const activity = { goal, context, checkpoint: this.#checkpoint(goal, input) }
		this.#transport.prepare(activity)
		this.#active = activity
		this.#trace = []
		this.#refused = undefined
		this.#admission = undefined
		// The previous goal's input is history now; membership or a section names it from here on.
		if (this.#input !== undefined) this.#explicit.delete(this.#input)
		this.#input = undefined
		try {
			await this.#transport.verify()
			for (const record of input.records) {
				this.#records.set(record.id, Object.freeze({ ...record }))
			}
			for (const arrival of input.arrivals) {
				if (this.#arrivals.has(arrival.id))
					throw new StudyError('CONFIG', 'Source arrival was replayed within a trial')
				this.#arrivals.add(arrival.id)
				const message = this.#conversation.add({
					role: 'user',
					content: `[Source ${arrival.id}] ${arrival.content}`,
				})
				if (this.#settings.observe)
					this.#explicit.set(message.id, { origin: 'arrival', source: arrival.id })
				await context.evidence.append({
					event: 'arrival',
					goal,
					value: { id: arrival.id, message: message.id },
				})
			}
			const signal = AbortSignal.any([this.#options.signal, context.signal, context.meter.signal])
			if (this.#ledger === undefined) {
				const prompt = this.#conversation.add({ role: 'user', content: input.prompt })
				if (this.#settings.observe) {
					this.#input = prompt.id
					this.#explicit.set(prompt.id, { origin: 'input', source: goal })
				}
			}
			const result: unknown =
				this.#ledger === undefined
					? await this.#agent.generate({ signal })
					: await this.#ledger.respond(input.prompt, signal)
			this.#transport.check()
			signal.throwIfAborted()
			if (
				!isObject(result) ||
				!('content' in result) ||
				typeof result.content !== 'string' ||
				!('partial' in result) ||
				typeof result.partial !== 'boolean'
			)
				throw new StudyError('FAULT', 'Agent returned malformed content or partial state')
			const product = { value: { content: result.content }, partial: result.partial }
			await context.evidence.append({
				event: 'result',
				goal,
				value: {
					content: result.content,
					partial: result.partial,
					conversation: this.#conversation.id,
					...(this.#settings.observe && this.#ledger !== undefined
						? { readings: buildStudyMemoryReadings(result) }
						: {}),
				},
			})
			this.#transport.check()
			signal.throwIfAborted()
			await this.#transport.verify()
			return product
		} catch (error) {
			throw this.#translate(error)
		} finally {
			try {
				for (const row of this.#trace) await context.evidence.append(row)
			} finally {
				this.#active = undefined
			}
		}
	}

	// Latch the study-level reading before any enclosing runtime can swallow the failure.
	#translate(error: unknown): unknown {
		const translated = readStudyMemoryError(error, this.#options.subject)
		this.#refuse(error, translated)
		this.#transport.fail(translated)
		return translated
	}

	// Retains one refusal row per refused error identity in a goal, however many callbacks it traverses.
	#refuse(error: unknown, translated: unknown): void {
		const active = this.#active
		if (
			translated === error ||
			!this.#settings.observe ||
			active === undefined ||
			this.#refused === error
		)
			return
		this.#refused = error
		const context = this.#options.subject.isAgentError(error) ? error.context : undefined
		this.#trace.push({
			event: 'refusal',
			goal: active.goal,
			value: {
				cause: 'capacity',
				role: 'agent',
				ordinal: this.#admission?.ordinal ?? null,
				revision: this.#admission?.revision ?? null,
				consumed: typeof context?.consumed === 'number' ? context.consumed : null,
				max: typeof context?.max === 'number' ? context.max : null,
			},
		})
	}

	// Takes one synchronous measurement row; the goal's finally flush appends it, failure included.
	#stamp(
		stage: StudyMemoryStage,
		role: 'agent' | 'summary',
		request: ProviderRequest,
		reading: StudyMemoryEstimate,
		dispatch: number | undefined,
	): StudyMemoryStamp {
		const ordinal = ++this.#ordinal
		const revision = buildStudyMemoryRevision(request)
		const active = this.#active
		if (active !== undefined)
			this.#trace.push({
				event: 'context',
				goal: active.goal,
				value: {
					stage,
					role,
					ordinal,
					revision,
					estimate: reading.estimate,
					projected: reading.projected ?? null,
					...(dispatch === undefined ? {} : { dispatch }),
					parts: buildStudyMemoryParts(this.#options.subject.measureRequest(request)),
					origins: buildStudyMemoryOrigins(request.messages, this.#provenance()),
				},
			})
		return { ordinal, revision }
	}

	#provenance(): StudyMemoryProvenanceSource {
		return {
			explicit: this.#explicit,
			sections: new Set(this.#conversation.sections.map((section) => section.id)),
			members: new Set(this.#conversation.messages().map((message) => message.id)),
			composed: this.#options.arm === 'records',
		}
	}

	// Prices a window measurement exactly as before and, when observing, retains it as an admission row.
	#admit(request: ProviderRequest, gauge: LedgerGauge): number {
		const estimate = this.#options.subject.estimateRequest(request)
		const projected = projectStudyMemoryRequest(gauge, estimate)
		if (this.#settings.observe && this.#active !== undefined)
			this.#admission = this.#stamp(
				'admission',
				'agent',
				request,
				{ estimate, projected },
				undefined,
			)
		return projected
	}

	// Retains the reading of a dispatching agent request and names it for the wire request that follows.
	#record(reading: StudyMemoryEstimate, request: ProviderRequest): void {
		const active = this.#active
		if (!this.#settings.observe || active === undefined) return
		const id = ++this.#dispatches
		const { revision } = this.#stamp('dispatch', 'agent', request, reading, id)
		this.#agentDispatch = Object.freeze({ id, revision: revision ?? undefined })
		this.#trace.push({
			event: 'estimate',
			goal: active.goal,
			value: {
				estimate: reading.estimate,
				projected: reading.projected ?? null,
				revision,
				dispatch: id,
			},
		})
	}

	#checkpoint(goal: string, input: StudyMemoryInput): JSONValue | undefined {
		if (!this.#settings.observe || !this.#settings.checkpoints.has(goal)) return undefined
		const value: unknown = {
			conversation: this.#conversation.snapshot(),
			records: [...this.#records.values()],
			arrivals: [...this.#arrivals],
			gauge: this.#ledger?.gauge ?? null,
			input,
		}
		if (!isJSONValue(value)) throw new StudyError('FAULT', 'Checkpoint is not JSON')
		return cloneJSONValue(value)
	}

	async #lookup(args: Readonly<Record<string, unknown>>, context: ToolContext): Promise<JSONValue> {
		this.#transport.check()
		const active = this.#active
		if (active === undefined) throw new StudyError('FAULT', 'Lookup outside an active goal')
		try {
			const encoder = new TextEncoder()
			let bytes = encoder.encode(JSON.stringify(args)).byteLength
			const bound = this.#options.profile.bounds.request
			if (bytes > bound.bytes)
				throw new StudyError('CAPACITY', 'Lookup arguments exceed the byte allowance')
			const ticket = await active.context.meter.admit({
				role: 'tool',
				tokens: 0,
				bytes: bound.bytes,
			})
			const started = performance.now()
			try {
				const signal = AbortSignal.any([
					this.#options.signal,
					context.signal,
					active.context.signal,
					active.context.meter.signal,
					ticket.signal,
				])
				signal.throwIfAborted()
				if (typeof args.id !== 'string') throw new StudyError('CONFIG', 'Lookup requires an id')
				const record = this.#records.get(args.id)
				const value =
					record === undefined ? 'No record' : `${record.id}: ${record.name}\n${record.content}`
				bytes += encoder.encode(JSON.stringify(value)).byteLength
				this.#trace.push({
					event: 'lookup',
					goal: active.goal,
					value: { id: args.id, found: record !== undefined },
				})
				signal.throwIfAborted()
				return value
			} finally {
				if (!ticket.signal.aborted)
					ticket.finish({
						role: 'tool',
						calls: 1,
						tokens: 0,
						bytes,
						duration: Math.ceil(performance.now() - started),
					})
			}
		} catch (error) {
			this.#transport.fail(error)
			throw error
		}
	}

	async #summarize(
		messages: readonly Message[],
		signal: AbortSignal | undefined,
		gauge: LedgerGauge,
	): Promise<string> {
		const bound = signal ?? this.#options.signal
		bound.throwIfAborted()
		this.#transport.check()
		// One canonical array: measured once, admitted or refused, then sent as the very same array.
		const canonical: readonly Message[] = [
			{
				id: 'summary-instruction',
				role: 'system',
				content:
					'Summarize the conversation while preserving source identifiers, corrections, unresolved obligations and handoffs.',
			},
			...messages,
		]
		const request: ProviderRequest = { messages: canonical }
		const estimate = this.#options.subject.estimateRequest(request)
		const projected = projectStudyMemoryRequest(gauge, estimate)
		const room = this.#options.profile.room
		const limit = room.context - room.recap - room.safety
		const current = this.#active
		const observing = this.#settings.observe && current !== undefined
		if (projected >= limit) {
			const message = 'Summary request projection reaches the summary room'
			// The refusal keeps its own admission, so the Agent's admission stays the one a later window refusal names.
			if (observing) {
				const { ordinal, revision } = this.#stamp(
					'admission',
					'summary',
					request,
					{ estimate, projected },
					undefined,
				)
				this.#trace.push({
					event: 'refusal',
					goal: current.goal,
					value: {
						cause: 'capacity',
						role: 'summary',
						ordinal,
						revision,
						consumed: projected,
						max: limit,
					},
				})
			}
			throw new StudyError('CAPACITY', message, { cause: 'capacity', message, role: 'summary' })
		}
		if (observing) {
			const id = ++this.#dispatches
			const { revision } = this.#stamp('dispatch', 'summary', request, { estimate, projected }, id)
			this.#summaryDispatch = Object.freeze({ id, revision: revision ?? undefined })
		}
		const result = await this.#summary.generate(canonical, bound)
		if (!bound.aborted) validateStudyMemoryUsage(result.usage, 'summary')
		this.#transport.check()
		const active = this.#active
		if (active === undefined || typeof result.content !== 'string')
			throw new StudyError('FAULT', 'Summary outside an active goal or invalid content')
		const value: unknown = {
			sources: messages.map((message) => message.id),
			content: result.content,
		}
		if (!isJSONValue(value)) throw new StudyError('FAULT', 'Summary evidence is not JSON')
		this.#trace.push({ event: 'summary', goal: active.goal, value: cloneJSONValue(value) })
		return result.content
	}

	async #dispose(): Promise<void> {
		this.#agent.abort(new StudyError('FAULT', 'Memory session closed'))
		await this.#transport.close()
		await this.#work?.catch(() => undefined)
		this.#tools.destroy()
		this.#agent.emitter.destroy()
		this.#conversation.emitter.destroy()
	}
}
