import type {
	AgentInterface,
	ConversationInterface,
	LedgerInterface,
	Message,
	ProviderInterface,
} from '@orkestrel/agent'
import type { JSONValue } from '@orkestrel/contract'
import type { ToolContext } from '@orkestrel/tool'
import type {
	StudyContext,
	StudyEvidence,
	StudyGoal,
	StudyProduct,
	StudySessionInterface,
} from '@orkestrel/study'
import type { StudyMemoryActivity, StudyMemoryInput, StudyMemorySessionOptions } from './types.js'
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
import { StudyMemoryTransport } from './StudyMemoryTransport.js'
import { StudyMemoryJudge } from './StudyMemoryJudge.js'
import { isStudyMemoryInput } from './validators.js'

/** Preserves actual Agent, Ledger and conversation state across a trial's goals. */
export class StudyMemorySession implements StudySessionInterface {
	readonly #options: StudyMemorySessionOptions
	readonly #transport: StudyMemoryTransport
	readonly #tools = createToolManager()
	readonly #agent: AgentInterface
	readonly #conversation: ConversationInterface
	readonly #ledger: LedgerInterface | undefined
	readonly #summary: ProviderInterface
	readonly #arrivals = new Set<string>()
	readonly #records = new Map<string, StudyMemoryInput['records'][number]>()
	#active: StudyMemoryActivity | undefined
	#trace: StudyEvidence[] = []
	#work: Promise<StudyProduct> | undefined
	#closing: Promise<void> | undefined

	/** Composes a fresh real runtime from admitted public factories. @param options - Trial dependencies and memory treatment. */
	constructor(options: StudyMemorySessionOptions) {
		this.#options = options
		this.#transport = new StudyMemoryTransport({ profile: options.profile, signal: options.signal })
		const settings = options.profile.provider
		if (settings === undefined) throw new StudyError('CONFIG', 'Memory provider is required')
		const room = options.profile.room
		const provider = options.provider.createOllama({
			model: settings.model,
			url: settings.url,
			think: room.think,
			timeout: options.profile.bounds.request.duration,
			options: { num_ctx: room.context, num_predict: room.output, temperature: 0, seed: 0 },
			fetch: (input, init) => this.#transport.fetch('agent', input, init),
		})
		this.#summary = options.provider.createOllama({
			model: settings.model,
			url: settings.url,
			think: false,
			timeout: options.profile.bounds.request.duration,
			options: { num_ctx: room.context, num_predict: room.recap, temperature: 0, seed: 0 },
			fetch: (input, init) => this.#transport.fetch('summary', input, init),
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
					on: { fault: (error) => this.#transport.fail(error) },
				},
			})
			this.#agent = this.#ledger.agent
			this.#conversation = this.#ledger.conversation
		} else {
			this.#ledger = undefined
			const conversations = options.subject.createConversationManager()
			this.#conversation = conversations.add(
				options.arm === 'compaction'
					? { keep: 2, summarize: (messages, signal) => this.#summarize(messages, signal) }
					: {},
			)
			this.#agent = new options.subject.Agent(provider, {
				conversations,
				tools: this.#tools,
				strict: true,
				limit: 8,
				timeout: options.profile.bounds.goal.duration,
				signal: options.signal,
				...(options.arm === 'compaction'
					? {
							window: createBudget<readonly Message[]>({
								max: room.context - room.output - room.safety,
								consumer: options.subject.estimateMessages,
							}),
						}
					: {}),
				on: { fault: (error) => this.#transport.fail(error) },
				error: (error) => this.#transport.fail(error),
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
		this.#transport.prepare({ goal, context })
		this.#active = { goal, context }
		this.#trace = []
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
				await context.evidence.append({
					event: 'arrival',
					goal,
					value: { id: arrival.id, message: message.id },
				})
			}
			const signal = AbortSignal.any([this.#options.signal, context.signal, context.meter.signal])
			if (this.#ledger === undefined)
				this.#conversation.add({ role: 'user', content: input.prompt })
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
				},
			})
			this.#transport.check()
			signal.throwIfAborted()
			await this.#transport.verify()
			return product
		} catch (error) {
			this.#transport.fail(error)
			throw error
		} finally {
			try {
				for (const row of this.#trace) await context.evidence.append(row)
			} finally {
				this.#active = undefined
			}
		}
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

	async #summarize(messages: readonly Message[], signal?: AbortSignal): Promise<string> {
		this.#transport.check()
		const result = await this.#summary.generate(
			[
				{
					id: 'summary-instruction',
					role: 'system',
					content:
						'Summarize the conversation while preserving source identifiers, corrections, unresolved obligations and handoffs.',
				},
				...messages,
			],
			signal ?? this.#options.signal,
		)
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
