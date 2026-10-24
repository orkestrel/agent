import type {
	AgentInterface,
	ConversationInterface,
	LedgerInterface,
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
import type { StudyOllamaActivity } from '@orkestrel/study/server'
import type {
	StudyMemoryInput,
	StudyMemoryProvenance,
	StudyMemoryProvenanceSource,
	StudyMemorySessionOptions,
	StudyMemoryObservation,
	StudyMemoryArrival,
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
	buildStudyOllamaOptions,
} from '@orkestrel/study/server'
import {
	STUDY_MEMORY_JUDGE,
	STUDY_MEMORY_METADATA,
	STUDY_MEMORY_SUMMARY,
	STUDY_MEMORY_SYSTEM,
	STUDY_MEMORY_STANDING,
	STUDY_MEMORY_LOOKUP,
	STUDY_MEMORY_GRAMMAR,
	STUDY_MEMORY_THRESHOLDS,
	STUDY_MEMORY_TOPICS,
	STUDY_MEMORY_WORKLOAD_BYTES,
} from './constants.js'
import {
	buildStudyMemoryOrigins,
	buildStudyMemoryRoles,
	buildStudyMemoryReceipts,
	buildStudyMemoryResult,
	buildStudyMemoryEvidence,
	measureStudyMemoryEvidence,
	readStudyMemoryCompaction,
	resolveStudyMemoryObservation,
	validateStudyMemoryProfile,
} from './helpers.js'
import { isStudyMemoryInput, isStudyMemoryOptions } from './validators.js'

/** Preserves actual Agent, Ledger and conversation state across a trial's goals. */
export class StudyMemorySession implements StudySessionInterface {
	readonly #options: StudyMemorySessionOptions
	readonly #transport: StudyOllamaTransport
	readonly #trace: StudyAgentTrace
	readonly #tools: ToolManagerInterface
	readonly #observation: StudyMemoryObservation
	readonly #goals: readonly string[] | undefined
	readonly #agent: AgentInterface
	readonly #conversation: ConversationInterface
	readonly #ledger: LedgerInterface | undefined
	readonly #arrivals = new Set<string>()
	readonly #messages: StudyMemoryArrival[] = []
	#names: ReadonlyMap<string, string> = new Map()
	readonly #sizes: number[] = []
	readonly #records = new Map<string, StudyMemoryInput['records'][number]>()
	readonly #lookups = new WeakMap<object, Readonly<Record<string, unknown>>>()
	readonly #calls = new WeakMap<object, string>()
	// Message ids this consumer added or named, joined to their origin; the summary instruction is fixed.
	readonly #explicit = new Map<string, StudyMemoryProvenance>([
		['summary-instruction', { origin: 'instructions', source: 'summary' }],
	])
	// The goal in flight: added when it starts, deleted on every path that ends it, and capped at one by the busy refusal.
	readonly #live = new Set<StudyOllamaActivity>()
	readonly #flights = new Set<Promise<StudyProduct>>()
	#input: string | undefined
	#closing: Promise<void> | undefined

	/** Composes a fresh real runtime from admitted public factories. @param options - Trial dependencies and memory treatment. */
	constructor(options: StudyMemorySessionOptions) {
		validateStudyMemoryProfile(options.profile, [options.arm])
		const compaction =
			options.arm === 'compaction' ? readStudyMemoryCompaction(options.profile) : undefined
		const gauge = compaction?.gauge
		this.#options = options
		this.#tools = createToolManager()
		this.#observation = resolveStudyMemoryObservation(options.profile.settings)
		const provider = options.profile.provider
		if (provider === undefined) throw new StudyError('CONFIG', 'Memory provider is required')
		const room = options.profile.room
		// One declaration of every role's wire policy feeds both the transport and the provider constructors.
		const roles = buildStudyMemoryRoles(options.profile, options.arm)
		const policy = roles.agent
		if (policy === undefined) throw new StudyError('CONFIG', 'Memory agent role is required')
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
			description:
				settings?.lookup?.grammar === true
					? `${STUDY_MEMORY_LOOKUP}. ${STUDY_MEMORY_GRAMMAR}`
					: STUDY_MEMORY_LOOKUP,
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
					url: provider.url,
					timeout: options.profile.bounds.request.duration,
					options: role.options,
					fetch: (input, init) => this.#transport.fetch('judge', input, init),
				}),
				this.#transport,
			)
			this.#ledger = options.ledger.createLedger(observer, {
				...settings?.ledger,
				names: (message) => this.#names.get(message.id),
				pins: (message) =>
					this.#messages.some(
						(arrival) =>
							arrival.message === message.id && STUDY_MEMORY_STANDING.includes(arrival.id),
					),
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
			this.#agent.emitter.on('tool', (call) => {
				if (call.name === 'lookup') this.#calls.set(call.arguments, call.id)
			})
		} else {
			this.#ledger = undefined
			const conversations = options.agent.createConversationManager()
			this.#conversation = conversations.add(
				summary === undefined
					? {}
					: {
							keep: 2,
							summarize: (messages, signal) => summary.summarize(messages, signal),
							...(isStudyMemoryOptions(options.profile.settings) &&
							options.profile.settings.rolling === true
								? { rolling: true }
								: {}),
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
						}),
				on: { fault: (error) => this.#trace.translate(error) },
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
			const settings = this.#options.profile.settings
			const standing = isStudyMemoryOptions(settings) && settings.instructions?.standing === true
			if (this.#goals === undefined || this.#goals[0] === goal) await this.#transport.verify()
			for (const record of input.records) {
				this.#records.set(record.id, Object.freeze({ ...record }))
			}
			for (const arrival of input.arrivals) {
				if (this.#arrivals.has(arrival.id))
					throw new StudyError('CONFIG', 'Source arrival was replayed within a trial')
				this.#arrivals.add(arrival.id)
				if (standing && STUDY_MEMORY_STANDING.includes(arrival.id)) {
					this.#agent.context.instructions.add({
						name: arrival.id,
						content: `[Source ${arrival.id}] ${arrival.content}`,
					})
					await context.evidence.append({
						event: 'arrival',
						goal,
						value: { id: arrival.id, instruction: arrival.id },
					})
					continue
				}
				const message = this.#conversation.add({
					role: 'user',
					content: `[Source ${arrival.id}] ${arrival.content}`,
				})
				this.#messages.push({ id: arrival.id, message: message.id })
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
			const sections = this.#ledger === undefined ? [] : this.#conversation.snapshot().sections
			const result: unknown =
				this.#ledger === undefined
					? await this.#agent.generate({ signal })
					: await this.#ledger.respond(input.prompt, signal)
			if (this.#ledger !== undefined) {
				const captured = buildStudyMemoryResult(result)
				this.#names = new Map([...this.#names, [captured.request, goal]])
				const snapshot = {
					sections: [...sections, ...this.#conversation.snapshot().sections],
					messages: this.#conversation.messages().map((message) => message.id),
				}
				for (const receipt of buildStudyMemoryReceipts(captured, this.#messages, snapshot)) {
					const value = buildStudyMemoryEvidence(goal, receipt)
					const bytes = measureStudyMemoryEvidence(goal, value)
					if (
						this.#sizes.reduce((total, size) => total + size, bytes) > STUDY_MEMORY_WORKLOAD_BYTES
					)
						throw new StudyError('CAPACITY', 'Memory selection workload exceeds the byte bound')
					this.#sizes.push(bytes)
					this.#trace.append('selection', value)
				}
			}
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
					...(this.#observation.observe && this.#ledger !== undefined
						? { readings: buildStudyAgentReadings(result) }
						: {}),
				},
			})
			this.#transport.check()
			signal.throwIfAborted()
			if (this.#goals === undefined || this.#goals.at(-1) === goal) await this.#transport.verify()
			return product
		} catch (error) {
			throw this.#trace.translate(error)
		} finally {
			try {
				await this.#trace.flush({
					append: (row) => context.evidence.append(this.#joinLookup(row)),
				})
			} finally {
				this.#live.delete(activity)
				this.#transport.clear()
			}
		}
	}

	#joinLookup(row: StudyEvidence): StudyEvidence {
		if (row.event !== 'lookup' || !isObject(row.value)) return row
		const args = this.#lookups.get(row.value)
		const call = args === undefined ? undefined : this.#calls.get(args)
		const message =
			call === undefined
				? undefined
				: this.#conversation
						.messages()
						.find((entry) => entry.role === 'tool' && entry.call === call)
		return message === undefined ? row : { ...row, value: { ...row.value, message: message.id } }
	}

	#provenance(): StudyMemoryProvenanceSource {
		return {
			explicit: this.#explicit,
			sections: new Set(this.#conversation.sections.map((section) => section.id)),
			members: new Set(this.#conversation.messages().map((message) => message.id)),
			composed:
				this.#options.arm === 'records' ||
				this.#agent.context.instructions
					.instructions()
					.some((instruction) => STUDY_MEMORY_STANDING.includes(instruction.name)),
		}
	}

	#checkpoint(goal: string, input: StudyMemoryInput): JSONValue | undefined {
		if (!this.#observation.observe || !this.#observation.checkpoints.has(goal)) return undefined
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
				const evidence = { id: args.id, found: record !== undefined }
				if (this.#ledger !== undefined) this.#lookups.set(evidence, args)
				this.#trace.append('lookup', evidence)
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
