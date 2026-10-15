import type {
	AgentInterface,
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
import { cloneJSONValue, isJSONValue, isObject } from '@orkestrel/contract'
import { createTool, createToolManager } from '@orkestrel/tool'
import { StudyAgentJudge, StudyAgentObserver, StudyError } from '@orkestrel/study'
import {
	StudyAgentSummary,
	StudyAgentTrace,
	StudyOllamaTransport,
	buildStudyAgentReadings,
	buildStudyOllamaModels,
	buildStudyOllamaSettings,
} from '@orkestrel/study/server'
import {
	STUDY_MEMORY_JUDGE,
	STUDY_MEMORY_SUMMARY,
	STUDY_MEMORY_SYSTEM,
	STUDY_MEMORY_THRESHOLDS,
	STUDY_MEMORY_TOPICS,
} from './constants.js'
import {
	buildStudyMemoryOrigins,
	buildStudyMemoryRoles,
	readStudyMemoryCompaction,
	readStudyMemorySettings,
} from './helpers.js'
import { isStudyMemoryInput, isStudyMemorySettings } from './validators.js'

/** Preserves actual Agent, Ledger and conversation state across a trial's goals. */
export class StudyMemorySession implements StudySessionInterface {
	readonly #options: StudyMemorySessionOptions
	readonly #transport: StudyOllamaTransport
	readonly #trace: StudyAgentTrace
	readonly #tools: ToolManagerInterface
	readonly #settings: StudyMemoryObservation
	readonly #agent: AgentInterface
	readonly #conversation: ConversationInterface
	readonly #ledger: LedgerInterface | undefined
	readonly #arrivals = new Set<string>()
	readonly #records = new Map<string, StudyMemoryInput['records'][number]>()
	// Message ids this consumer added or named, joined to their origin; the summary instruction is fixed.
	readonly #explicit = new Map<string, StudyMemoryProvenance>([
		['summary-instruction', { origin: 'instructions', source: 'summary' }],
	])
	#input: string | undefined
	#active: StudyOllamaActivity | undefined
	#work: Promise<StudyProduct> | undefined
	#closing: Promise<void> | undefined

	/** Composes a fresh real runtime from admitted public factories. @param options - Trial dependencies and memory treatment. */
	constructor(options: StudyMemorySessionOptions) {
		const compaction =
			options.arm === 'compaction' ? readStudyMemoryCompaction(options.profile) : undefined
		const gauge = compaction?.gauge
		this.#options = options
		this.#tools = createToolManager()
		this.#settings = readStudyMemorySettings(options.profile.settings)
		const settings = options.profile.provider
		if (settings === undefined) throw new StudyError('CONFIG', 'Memory provider is required')
		const room = options.profile.room
		// One declaration of every role's wire policy feeds both the transport and the provider constructors.
		const roles = buildStudyMemoryRoles(options.profile, options.arm)
		const policy = roles.agent
		if (policy === undefined) throw new StudyError('CONFIG', 'Memory agent role is required')
		this.#transport = new StudyOllamaTransport({
			url: settings.url,
			room,
			limit: options.profile.bounds.request,
			models: buildStudyOllamaModels(settings),
			roles,
			signal: options.signal,
			observe: this.#settings.observe,
			timing: options.provider.extractTiming,
		})
		this.#trace = new StudyAgentTrace({
			runtime: options.agent,
			latch: this.#transport,
			observe: this.#settings.observe,
			origins: (messages) => buildStudyMemoryOrigins(messages, this.#provenance()),
		})
		// Every arm wraps the agent provider, so toggling passive capture keeps the same wrapper overhead.
		const provider = new StudyAgentObserver({
			provider: options.provider.createOllama({
				...buildStudyOllamaSettings(policy),
				url: settings.url,
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
							...buildStudyOllamaSettings(recap),
							url: settings.url,
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
			const judge = new StudyAgentJudge(
				options.classifier.createOllamaJudge({
					model: role.model,
					system: STUDY_MEMORY_JUDGE,
					url: settings.url,
					timeout: options.profile.bounds.request.duration,
					options: role.options,
					fetch: (input, init) => this.#transport.fetch('judge', input, init),
				}),
				this.#transport,
			)
			this.#ledger = options.ledger.createLedger(provider, {
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
				agent: {
					limit: 8,
					timeout: options.profile.bounds.goal.duration,
					on: { fault: (error) => this.#trace.translate(error) },
				},
			})
			this.#agent = this.#ledger.agent
			this.#conversation = this.#ledger.conversation
		} else {
			this.#ledger = undefined
			const conversations = options.agent.createConversationManager()
			this.#conversation = conversations.add(
				summary === undefined
					? {}
					: {
							keep: 2,
							summarize: (messages, signal) => summary.summarize(messages, signal),
							...(isStudyMemorySettings(options.profile.settings) &&
							options.profile.settings.rolling === true
								? { rolling: true }
								: {}),
						},
			)
			this.#agent = new options.agent.Agent(provider, {
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
						}),
				on: { fault: (error) => this.#trace.translate(error) },
				error: (error) => this.#trace.translate(error),
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
		this.#trace.start(goal)
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
						? { readings: buildStudyAgentReadings(result) }
						: {}),
				},
			})
			this.#transport.check()
			signal.throwIfAborted()
			await this.#transport.verify()
			return product
		} catch (error) {
			throw this.#trace.translate(error)
		} finally {
			try {
				await this.#trace.flush(context.evidence)
			} finally {
				this.#active = undefined
			}
		}
	}

	#provenance(): StudyMemoryProvenanceSource {
		return {
			explicit: this.#explicit,
			sections: new Set(this.#conversation.sections.map((section) => section.id)),
			members: new Set(this.#conversation.messages().map((message) => message.id)),
			composed: this.#options.arm === 'records',
		}
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
				this.#trace.append('lookup', { id: args.id, found: record !== undefined })
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

	async #dispose(): Promise<void> {
		this.#agent.abort(new StudyError('FAULT', 'Memory session closed'))
		await this.#transport.close()
		await this.#work?.catch(() => undefined)
		this.#tools.destroy()
		this.#agent.emitter.destroy()
		this.#conversation.emitter.destroy()
	}
}
