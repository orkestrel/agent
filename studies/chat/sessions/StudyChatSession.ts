import type { LedgerInterface } from '@orkestrel/agent'
import type { StudyContext, StudyGoal, StudyProduct, StudySessionInterface } from '@orkestrel/study'
import type { StudyChatInput, StudyChatSessionOptions } from '../types.js'
import { canonicalStringify } from '@orkestrel/contract'
import { createTool } from '@orkestrel/tool'
import { StudyAgentJudge, StudyAgentObserver, StudyError } from '@orkestrel/study'
import {
	StudyAgentTrace,
	StudyOllamaTransport,
	buildStudyOllamaModels,
	buildStudyOllamaOptions,
} from '@orkestrel/study/server'
import {
	STUDY_CHAT_JUDGE,
	STUDY_CHAT_OPTIONS,
	STUDY_CHAT_THRESHOLDS,
	STUDY_CHAT_TOPICS,
} from '../constants.js'
import { buildStudyChatRoles } from '../helpers.js'
import { isStudyChatInput, isStudyChatSettings } from '../validators.js'
import { StudyChatRequest } from './StudyChatRequest.js'

/** Owns one conversation's ledger, transported generations, timing evidence, and cleanup.
 * @example await new StudyChatSession(options).execute(goal, context)
 */
export class StudyChatSession implements StudySessionInterface {
	readonly #options: StudyChatSessionOptions
	readonly #transport: StudyOllamaTransport
	readonly #trace: StudyAgentTrace
	readonly #abort = new AbortController()
	readonly #active = new Set<StudyChatRequest>()
	readonly #flights = new Set<Promise<StudyProduct>>()
	#ledger: LedgerInterface | undefined
	#configuration: string | undefined
	#closed: Promise<void> | undefined
	constructor(options: StudyChatSessionOptions) {
		this.#options = options
		const provider = options.profile.provider
		const settings = options.profile.settings
		if (provider === undefined || !isStudyChatSettings(settings))
			throw new StudyError('CONFIG', 'Chat requires provider and settings')
		this.#transport = new StudyOllamaTransport({
			url: provider.url,
			room: options.profile.room,
			limit: options.profile.bounds.request,
			metadata: settings.metadata,
			models: buildStudyOllamaModels(provider),
			roles: buildStudyChatRoles(options.profile),
			signal: AbortSignal.any([options.signal, this.#abort.signal]),
			observe: true,
			timing: options.provider.extractTiming,
			...(options.exchanges === undefined ? {} : { exchanges: options.exchanges }),
			...(options.replay === undefined ? {} : { replay: options.replay }),
		})
		this.#trace = new StudyAgentTrace({
			runtime: options.agent,
			latch: this.#transport,
			observe: true,
			origins: (messages) => messages.map((message) => ({ id: message.id, origin: 'unknown' })),
		})
	}
	async execute(goal: StudyGoal, context: StudyContext): Promise<StudyProduct> {
		if (this.#closed !== undefined || this.#flights.size > 0)
			throw new StudyError('CONFIG', 'Chat session is closed or busy')
		if (!isStudyChatInput(goal.input)) throw new StudyError('CONFIG', 'Malformed public chat input')
		const flight = this.#execute(goal.id, goal.input, context)
		this.#flights.add(flight)
		try {
			return await flight
		} finally {
			this.#flights.delete(flight)
		}
	}
	close(): Promise<void> {
		this.#closed ??= this.#dispose()
		return this.#closed
	}
	async #execute(
		goal: string,
		input: StudyChatInput,
		context: StudyContext,
	): Promise<StudyProduct> {
		const configuration = canonicalStringify({
			system: input.system,
			topic: input.topic,
			...(input.record === undefined ? {} : { record: input.record }),
		})
		if (this.#configuration !== undefined && this.#configuration !== configuration)
			throw new StudyError('CONFIG', 'Chat conversation configuration changed')
		this.#configuration ??= configuration
		this.#ledger ??= this.#createLedger(input)
		this.#transport.prepare({ goal, context, checkpoint: undefined })
		this.#trace.start(goal)
		try {
			const goals = this.#options.exchanges?.declaration?.goals
			if (goals === undefined || goals[0] === goal) await this.#transport.verify()
			const request = new StudyChatRequest()
			this.#active.add(request)
			try {
				const signal = AbortSignal.any([
					this.#options.signal,
					this.#abort.signal,
					context.signal,
					context.meter.signal,
				])
				const result = await this.#ledger.respond(input.prompt, signal)
				this.#transport.check()
				signal.throwIfAborted()
				await context.evidence.append({
					event: 'result',
					goal,
					value: {
						content: result.content,
						partial: result.partial,
						...(request.first === undefined || this.#options.replay !== undefined
							? {}
							: { first: request.first }),
					},
				})
				if (goals === undefined || goals.at(-1) === goal) await this.#transport.verify()
				return { value: { content: result.content }, partial: result.partial }
			} finally {
				this.#active.delete(request)
			}
		} catch (error) {
			throw this.#trace.translate(error)
		} finally {
			try {
				await this.#trace.flush(context.evidence)
			} finally {
				this.#transport.clear()
			}
		}
	}
	#createLedger(input: StudyChatInput): LedgerInterface {
		const options = this.#options
		const provider = options.profile.provider
		const settings = options.profile.settings
		const roles = buildStudyChatRoles(options.profile)
		if (
			provider?.judge === undefined ||
			roles.agent === undefined ||
			!isStudyChatSettings(settings)
		)
			throw new StudyError('CONFIG', 'Chat requires complete treatment')
		const observer = new StudyAgentObserver({
			provider: options.provider.createOllama({
				...buildStudyOllamaOptions(roles.agent),
				url: provider.url,
				fetch: async (url, init) => {
					const response = await this.#transport.fetch(
						'agent',
						url,
						init,
						this.#trace.canonical('agent'),
					)
					const [request] = this.#active
					if (request === undefined)
						throw new StudyError('FAULT', 'Chat response outside a request')
					return request.observe(response)
				},
			}),
			runtime: options.agent,
			gauge: undefined,
			enforced: false,
			record: (measurement, request) => this.#trace.record(measurement, request),
		})
		const judge = new StudyAgentJudge(
			options.provider.createOllamaJudge({
				model: provider.judge,
				system: STUDY_CHAT_JUDGE,
				url: provider.url,
				timeout: 180000,
				options: STUDY_CHAT_OPTIONS,
				fetch: (url, init) => this.#transport.fetch('judge', url, init),
			}),
			this.#transport,
		)
		return options.agent.createLedger(observer, {
			judge,
			system: input.system,
			topics: [{ name: input.topic, criterion: STUDY_CHAT_TOPICS[input.topic], requested: false }],
			questions: options.agent.LEDGER_QUESTIONS,
			thresholds: STUDY_CHAT_THRESHOLDS,
			capacity: settings.capacity,
			predict: 1024,
			think: false,
			share: { prompt: 1, tail: 0.35 },
			lookups: (input.record === undefined ? [] : [input.record]).map((record) => ({
				tool: createTool({
					name: 'lookup',
					description: `Read an order record by id, such as ${record.id}.`,
					parameters: {
						type: 'object',
						properties: { id: { type: 'string' } },
						required: ['id'],
					},
					execute: (args) => (String(args.id) === record.id ? record.text : 'No record'),
				}),
				read: (args) =>
					args.id === record.id
						? { ids: [record.id], owners: [{ id: record.id, names: [record.name] }] }
						: undefined,
			})),
			agent: { limit: 8 },
		})
	}
	async #dispose(): Promise<void> {
		this.#abort.abort(new StudyError('FAULT', 'Chat session closed'))
		this.#ledger?.agent.abort()
		await this.#transport.close()
		await Promise.allSettled([...this.#flights])
		this.#ledger?.agent.emitter.destroy()
		this.#ledger?.conversation.emitter.destroy()
	}
}
