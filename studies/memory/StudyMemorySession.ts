import type {
	AgentInterface,
	AuthorityContext,
	ConversationInterface,
	LedgerInterface,
	ProviderRequest,
} from '@orkestrel/agent'
import type { JSONValue } from '@orkestrel/contract'
import type { ToolContext, ToolManagerInterface } from '@orkestrel/tool'
import type { StudyContext, StudyGoal, StudyProduct, StudySessionInterface } from '@orkestrel/study'
import type { StudyOllamaActivity } from '@orkestrel/study/server'
import type {
	StudyMemoryInput,
	StudyMemoryProvenance,
	StudyMemoryProvenanceSource,
	StudyMemorySessionOptions,
	StudyMemoryObservation,
} from './types.js'
import { createBudget } from '@orkestrel/budget'
import { canonicalStringify, cloneJSONValue, isJSONValue, isObject } from '@orkestrel/contract'
import { createTool, createToolManager } from '@orkestrel/tool'
import { StudyAgentJudge, StudyAgentObserver, StudyError } from '@orkestrel/study'
import {
	STUDY_CHECKPOINT_EVENT,
	StudyAgentSummary,
	StudyAgentTrace,
	StudyOllamaTransport,
	buildStudyAgentReadings,
	buildStudyAgentToolDenial,
	buildStudyOllamaModels,
	buildStudyOllamaOptions,
} from '@orkestrel/study/server'
import {
	STUDY_MEMORY_JUDGE,
	STUDY_MEMORY_METADATA,
	STUDY_MEMORY_REPEAT,
	STUDY_MEMORY_SUMMARY,
	STUDY_MEMORY_SYSTEM,
	STUDY_MEMORY_THRESHOLDS,
	STUDY_MEMORY_TOPICS,
} from './constants.js'
import {
	buildStudyMemoryOrigins,
	buildStudyMemoryRoles,
	readStudyMemoryCompaction,
	resolveStudyMemoryObservation,
} from './helpers.js'
import { isStudyMemoryInput, isStudyMemoryOptions } from './validators.js'

/** Preserves actual Agent, Ledger and conversation state across a trial's goals. */
export class StudyMemorySession implements StudySessionInterface {
	readonly #options: StudyMemorySessionOptions
	readonly #transport: StudyOllamaTransport
	readonly #trace: StudyAgentTrace
	readonly #tools: ToolManagerInterface
	readonly #observation: StudyMemoryObservation
	readonly #agent: AgentInterface
	readonly #conversation: ConversationInterface
	readonly #ledger: LedgerInterface | undefined
	readonly #arrivals = new Set<string>()
	readonly #records = new Map<string, StudyMemoryInput['records'][number]>()
	// Message ids this consumer added or named, joined to their origin; the summary instruction is fixed.
	readonly #explicit = new Map<string, StudyMemoryProvenance>([
		['summary-instruction', { origin: 'instructions', source: 'summary' }],
	])
	// The goal in flight: added when it starts, deleted on every path that ends it, and capped at one by the busy refusal.
	readonly #live = new Set<StudyOllamaActivity>()
	readonly #flights = new Set<Promise<StudyProduct>>()
	// A recording's declared goal range, so its preflight and postflight join the range's two ends.
	readonly #goals: readonly string[] | undefined
	// The calls the compaction arm dispatched in this run, replaced on each admission as `LedgerRequest` replaces its own.
	#repeats: ReadonlySet<string> = new Set()
	#input: string | undefined
	#closing: Promise<void> | undefined

	/** Composes a fresh real runtime from admitted public factories. @param options - Trial dependencies and memory treatment. */
	constructor(options: StudyMemorySessionOptions) {
		const compaction =
			options.arm === 'compaction' ? readStudyMemoryCompaction(options.profile) : undefined
		const gauge = compaction?.gauge
		this.#options = options
		const seed = options.seed
		for (const record of seed?.records ?? [])
			this.#records.set(record.id, Object.freeze({ ...record }))
		for (const arrival of seed?.arrivals ?? []) this.#arrivals.add(arrival)
		this.#tools = createToolManager()
		this.#observation = resolveStudyMemoryObservation(options.profile.settings)
		const provider = options.profile.provider
		if (provider === undefined) throw new StudyError('CONFIG', 'Memory provider is required')
		const room = options.profile.room
		const settings = isStudyMemoryOptions(options.profile.settings)
			? options.profile.settings
			: undefined
		const recorded = options.profile.record !== undefined
		if (!recorded && (options.exchanges !== undefined || options.replay !== undefined))
			throw new StudyError('CONFIG', 'Memory exchanges and replay require declared recording')
		const declaration = options.exchanges?.declaration
		if (
			recorded &&
			(declaration === undefined ||
				settings?.version === undefined ||
				settings.metadata === undefined)
		)
			throw new StudyError('CONFIG', 'Memory recording requires declarations and an exchange sink')
		this.#goals = declaration === undefined ? undefined : [...declaration.goals]
		// One declaration of every role's wire policy feeds both the transport and the provider constructors.
		const roles = buildStudyMemoryRoles(options.profile, options.arm)
		const policy = roles.agent
		if (policy === undefined) throw new StudyError('CONFIG', 'Memory agent role is required')
		this.#transport = new StudyOllamaTransport({
			url: provider.url,
			room,
			limit: options.profile.bounds.request,
			metadata: settings?.metadata ?? STUDY_MEMORY_METADATA,
			models: buildStudyOllamaModels(provider),
			roles,
			signal: options.signal,
			observe: this.#observation.observe,
			timing: options.provider.extractTiming,
			...(options.exchanges === undefined ? {} : { exchanges: options.exchanges }),
			...(options.replay === undefined ? {} : { fetch: options.replay.fetch }),
		})
		this.#trace = new StudyAgentTrace({
			runtime: options.agent,
			latch: this.#transport,
			observe: this.#observation.observe,
			origins: (messages) => buildStudyMemoryOrigins(messages, this.#provenance()),
		})
		// Every arm wraps the agent provider, so toggling passive capture keeps the same wrapper overhead.
		const observer = new StudyAgentObserver({
			provider: options.provider.createOllama({
				...buildStudyOllamaOptions(policy),
				url: provider.url,
				timeout: options.profile.bounds.request.duration,
				fetch: (input, init) =>
					this.#transport.fetch('agent', input, init, this.#trace.canonical('agent')),
			}),
			runtime: options.agent,
			gauge,
			enforced: gauge !== undefined,
			record: (reading, request) => this.#trace.record(reading, request),
		})
		const recap = compaction === undefined ? undefined : roles.summary
		if (compaction !== undefined && recap === undefined)
			throw new StudyError('CONFIG', 'Memory compaction requires a summary role')
		const summary =
			compaction === undefined || recap === undefined
				? undefined
				: new StudyAgentSummary({
						provider: options.provider.createOllama({
							...buildStudyOllamaOptions(recap),
							url: provider.url,
							timeout: options.profile.bounds.request.duration,
							fetch: (input, init) =>
								this.#transport.fetch('summary', input, init, this.#trace.canonical('summary')),
						}),
						runtime: options.agent,
						trace: this.#trace,
						latch: this.#transport,
						gauge: compaction.gauge,
						limit: room.context - compaction.recap - room.safety,
						instruction: { id: 'summary-instruction', role: 'user', content: STUDY_MEMORY_SUMMARY },
						signal: options.signal,
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
			if (options.ledger === undefined || options.classifier === undefined)
				throw new StudyError('CONFIG', 'Memory records require the Ledger and judge factories')
			const role = roles.judge
			if (role === undefined) throw new StudyError('CONFIG', 'Memory records require a judge role')
			const repeat = options.ledger.LEDGER_NOTES.repeat
			const judge = new StudyAgentJudge(
				options.classifier.createOllamaJudge({
					model: role.model,
					system: STUDY_MEMORY_JUDGE,
					url: provider.url,
					timeout: options.profile.bounds.request.duration,
					options: role.options,
					fetch: (input, init) => this.#transport.fetch('judge', input, init),
				}),
				this.#transport,
			)
			this.#ledger = options.ledger.createLedger(observer, {
				judge,
				system: STUDY_MEMORY_SYSTEM,
				topics: STUDY_MEMORY_TOPICS,
				questions: options.ledger.LEDGER_QUESTIONS,
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
				...(settings?.correction === undefined ? {} : { correction: settings.correction }),
				...(seed?.ledger === undefined ? {} : { snapshot: seed.ledger }),
				agent: {
					limit: 8,
					timeout: options.profile.bounds.goal.duration,
					on: {
						fault: (error) => this.#trace.translate(error),
						deny: (call, reason) =>
							this.#trace.append('denial', buildStudyAgentToolDenial(call, reason)),
						// A ledger repeat fails inside the tool and is no denial, so `deny` never reads it.
						tool: (call, result) => {
							if (!result.success && result.error === repeat)
								this.#trace.append('denial', buildStudyAgentToolDenial(call, repeat))
						},
					},
				},
			})
			this.#agent = this.#ledger.agent
			this.#conversation = this.#ledger.conversation
		} else {
			this.#ledger = undefined
			const conversations = options.agent.createConversationManager()
			const held = seed?.conversation === undefined ? {} : { snapshot: seed.conversation }
			this.#conversation = conversations.add(
				summary === undefined
					? held
					: {
							...held,
							keep: 2,
							summarize: (messages, signal) => summary.summarize(messages, signal),
						},
			)
			this.#agent = new options.agent.Agent(observer, {
				conversations,
				tools: this.#tools,
				strict: true,
				limit: 8,
				timeout: options.profile.bounds.goal.duration,
				signal: options.signal,
				...(compaction === undefined
					? {}
					: {
							window: createBudget<ProviderRequest>({
								max: room.context - room.output - room.safety,
								consumer: (request) => this.#trace.admit(request, compaction.gauge),
							}),
							authority: options.agent.createAuthority({
								rules: [
									{
										match: (context) => this.#repeat(context),
										zone: 'study',
										verdict: 'deny',
										reason: STUDY_MEMORY_REPEAT,
									},
								],
							}),
						}),
				on: {
					fault: (error) => this.#trace.translate(error),
					start: () => {
						this.#repeats = new Set()
					},
					deny: (call, reason) =>
						this.#trace.append('denial', buildStudyAgentToolDenial(call, reason)),
				},
				error: (error) => this.#trace.translate(error),
			})
			this.#agent.context.instructions.add({ name: 'desk', content: STUDY_MEMORY_SYSTEM })
		}
	}

	/** Executes a public goal against preserved state and retains its observable product. @param goal - Public arrivals, request and references. @param context - Parent accounting and evidence. @returns Actual complete or partial content. */
	async execute(goal: StudyGoal, context: StudyContext): Promise<StudyProduct> {
		if (this.#closing !== undefined || this.#flights.size > 0)
			throw new StudyError('CONFIG', 'Memory session is closed or busy')
		if (!isStudyMemoryInput(goal.input))
			throw new StudyError('CONFIG', 'Malformed public memory input')
		const flight = this.#execute(goal.id, goal.input, context)
		this.#flights.add(flight)
		try {
			return await flight
		} finally {
			this.#flights.delete(flight)
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
		this.#trace.start(goal)
		// The previous goal's input is history now; membership or a section names it from here on.
		if (this.#input !== undefined) this.#explicit.delete(this.#input)
		this.#input = undefined
		this.#live.add(activity)
		try {
			if (this.#goals === undefined || this.#goals[0] === goal) await this.#transport.verify()
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
				if (this.#observation.observe)
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
				if (this.#observation.observe) {
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
					// Study reads the evidence key `readings`; the projection stays until Study renames it to `attempts`.
					...(this.#observation.observe && this.#ledger !== undefined
						? {
								readings: buildStudyAgentReadings({
									readings: 'attempts' in result ? result.attempts : undefined,
								}),
							}
						: {}),
				},
			})
			this.#transport.check()
			signal.throwIfAborted()
			if (this.#goals === undefined || this.#goals.at(-1) === goal) await this.#transport.verify()
			if (this.#observation.checkpoints.has(goal))
				await context.evidence.append({
					event: STUDY_CHECKPOINT_EVENT,
					goal,
					value: this.#state(),
				})
			return product
		} catch (error) {
			throw this.#trace.translate(error)
		} finally {
			try {
				await this.#trace.flush(context.evidence)
			} finally {
				this.#live.delete(activity)
				this.#transport.clear()
			}
		}
	}

	// Keys one dispatched call as `LedgerRequest` keys its own; the authority evaluates each call once.
	#repeat(context: AuthorityContext): boolean {
		const key = canonicalStringify([context.call.name, context.call.arguments])
		if (key === undefined)
			throw new StudyError('FAULT', 'Tool arguments have no canonical identity')
		if (this.#repeats.has(key)) return true
		this.#repeats = new Set([...this.#repeats, key])
		return false
	}

	#provenance(): StudyMemoryProvenanceSource {
		return {
			explicit: this.#explicit,
			sections: new Set(this.#conversation.sections.map((section) => section.id)),
			members: new Set(this.#conversation.messages().map((message) => message.id)),
			composed: this.#options.arm === 'records',
		}
	}

	// Keeps the transport retaining a listed goal's request bodies; the state itself lands after the goal ends.
	#checkpoint(goal: string, input: StudyMemoryInput): JSONValue | undefined {
		if (!this.#observation.checkpoints.has(goal)) return undefined
		const value: unknown = { input }
		if (!isJSONValue(value)) throw new StudyError('FAULT', 'Checkpoint is not JSON')
		return cloneJSONValue(value)
	}

	// Copies the end of a goal, when no request is in flight, so `snapshot()` cannot refuse.
	#state(): JSONValue {
		const value: unknown = {
			...(this.#ledger === undefined
				? { conversation: this.#conversation.snapshot() }
				: { ledger: this.#ledger.snapshot() }),
			records: [...this.#records.values()],
			arrivals: [...this.#arrivals],
		}
		if (!isJSONValue(value)) throw new StudyError('FAULT', 'Checkpoint is not JSON')
		return cloneJSONValue(value)
	}

	async #lookup(args: Readonly<Record<string, unknown>>, context: ToolContext): Promise<JSONValue> {
		this.#transport.check()
		// The busy refusal caps the registry at the one goal that added its entry.
		const [active] = this.#live
		if (active === undefined) throw new StudyError('FAULT', 'Lookup outside an active goal')
		try {
			const encoder = new TextEncoder()
			const request = encoder.encode(JSON.stringify(args)).byteLength
			// The request bytes, then the reply bytes once the lookup produced one.
			const sizes = [request]
			const bound = this.#options.profile.bounds.request
			if (request > bound.bytes)
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
				sizes.push(encoder.encode(JSON.stringify(value)).byteLength)
				this.#trace.append('lookup', { id: args.id, found: record !== undefined })
				signal.throwIfAborted()
				return value
			} finally {
				if (!ticket.signal.aborted)
					ticket.finish({
						role: 'tool',
						calls: 1,
						tokens: 0,
						bytes: sizes.reduce((total, size) => total + size, 0),
						duration: Math.ceil(performance.now() - started),
					})
			}
		} catch (error) {
			this.#transport.fail(error)
			throw error
		}
	}

	async #dispose(): Promise<void> {
		this.#agent.abort(new StudyError('FAULT', 'Memory session closed'))
		await this.#transport.close()
		await Promise.allSettled([...this.#flights])
		this.#tools.destroy()
		this.#agent.emitter.destroy()
		this.#conversation.emitter.destroy()
	}
}
