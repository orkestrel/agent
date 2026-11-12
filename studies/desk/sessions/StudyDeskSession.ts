import type {
	AgentInterface,
	AgentOptions,
	AgentResult,
	LedgerInterface,
	ProviderInterface,
	SkillManagerInterface,
} from '@orkestrel/agent'
import type { JSONValue } from '@orkestrel/contract'
import type { StudyContext, StudyGoal, StudyProduct, StudySessionInterface } from '@orkestrel/study'
import type { StudyDeskArea, StudyDeskInput, StudyDeskSessionOptions } from '../types.js'
import { linkSignal } from '@orkestrel/abort'
import { createTool, createToolManager } from '@orkestrel/tool'
import { StudyAgentJudge, StudyAgentObserver, StudyError } from '@orkestrel/study'
import {
	StudyAgentTrace,
	StudyOllamaTransport,
	buildStudyAgentToolDenial,
	buildStudyAgentToolResult,
	buildStudyOllamaModels,
	buildStudyOllamaOptions,
} from '@orkestrel/study/server'
import {
	STUDY_DESK_JUDGE,
	STUDY_DESK_JUDGE_OPTIONS,
	STUDY_DESK_LIMIT,
	STUDY_DESK_RESULT,
	STUDY_DESK_SKILLS,
	STUDY_DESK_SYSTEM,
	STUDY_DESK_THRESHOLDS,
	STUDY_DESK_TOOLS,
	STUDY_DESK_TOPIC,
} from '../constants.js'
import { buildStudyDeskDefinition, buildStudyDeskRoles, collectStudyDeskTools } from '../helpers.js'
import { isStudyDeskInput, isStudyDeskSettings } from '../validators.js'
import { StudyDeskRequest } from './StudyDeskRequest.js'

/** Owns one conversation of one arm: its agent or ledger, its transported requests, its tool and turn rows, and its cleanup.
 * @remarks
 * Arms `all`, `area`, and `index` run one bare agent across the conversation; arm `shown` runs one
 * ledger built at the first goal with that goal's area shown through `agent.disclosure`, and retains that
 * value as the goal's `disclosure` row. Every
 * request passes Study's transport, so it is admitted, metered, and recorded.
 * @example await new StudyDeskSession(options).execute(goal, context)
 */
export class StudyDeskSession implements StudySessionInterface {
	readonly #options: StudyDeskSessionOptions
	readonly #transport: StudyOllamaTransport
	readonly #trace: StudyAgentTrace
	readonly #abort = new AbortController()
	readonly #active = new Set<StudyDeskRequest>()
	readonly #flights = new Set<Promise<StudyProduct>>()
	#agent: AgentInterface | undefined
	#ledger: LedgerInterface | undefined
	#closed: Promise<void> | undefined

	/**
	 * Binds the transport and the trace for one trial.
	 * @param options - The admitted capabilities, the trial's arm, the profile, and the trial signal
	 * @throws StudyError - Thrown with code `CONFIG` when the profile lacks a provider or desk settings
	 */
	constructor(options: StudyDeskSessionOptions) {
		this.#options = options
		const provider = options.profile.provider
		const settings = options.profile.settings
		if (provider === undefined || !isStudyDeskSettings(settings))
			throw new StudyError('CONFIG', 'Desk requires provider and settings')
		this.#transport = new StudyOllamaTransport({
			url: provider.url,
			room: options.profile.room,
			limit: options.profile.bounds.request,
			metadata: settings.metadata,
			models: buildStudyOllamaModels(provider),
			roles: buildStudyDeskRoles(options.profile),
			signal: linkSignal(options.signal, this.#abort.signal),
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

	/**
	 * Executes one request of the conversation and retains its turns, calls, and result.
	 * @param goal - The declared public request
	 * @param context - The enclosing meter, evidence sink, and operational signal
	 * @returns The reply and whether the run ended partial
	 * @throws StudyError - Thrown with code `CONFIG` when the session is closed or busy, or the input is malformed
	 */
	async execute(goal: StudyGoal, context: StudyContext): Promise<StudyProduct> {
		if (this.#closed !== undefined || this.#flights.size > 0)
			throw new StudyError('CONFIG', 'Desk session is closed or busy')
		if (!isStudyDeskInput(goal.input)) throw new StudyError('CONFIG', 'Malformed public desk input')
		const flight = this.#execute(goal.id, goal.input, context)
		this.#flights.add(flight)
		try {
			return await flight
		} finally {
			this.#flights.delete(flight)
		}
	}

	/**
	 * Cancels active work and releases the transport and the listeners.
	 * @returns Completion after the work in flight settles
	 */
	close(): Promise<void> {
		this.#closed ??= this.#dispose()
		return this.#closed
	}

	async #execute(
		goal: string,
		input: StudyDeskInput,
		context: StudyContext,
	): Promise<StudyProduct> {
		this.#transport.prepare({ goal, context, checkpoint: undefined })
		this.#trace.start(goal)
		try {
			const goals = this.#options.exchanges?.declaration?.goals
			if (goals === undefined || goals[0] === goal) await this.#transport.verify()
			const request = new StudyDeskRequest()
			this.#active.add(request)
			try {
				const signal = AbortSignal.any([
					this.#options.signal,
					this.#abort.signal,
					context.signal,
					context.meter.signal,
				])
				const result = await this.#run(input, signal)
				this.#transport.check()
				signal.throwIfAborted()
				this.#trace.append('result', {
					content: result.content,
					partial: result.partial,
					...(result.usage?.prompt === undefined ? {} : { prompt: result.usage.prompt }),
					...(request.first === undefined || this.#options.replay !== undefined
						? {}
						: { first: request.first }),
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

	// Runs one request on the arm's agent, or on the ledger built at the first goal for arm `shown`.
	async #run(input: StudyDeskInput, signal: AbortSignal): Promise<AgentResult> {
		if (this.#options.arm === 'shown') {
			this.#ledger ??= this.#createLedger(input.area)
			return await this.#ledger.respond(input.prompt, signal)
		}
		this.#agent ??= this.#createAgent()
		return await this.#agent.generate({
			prompt: { content: input.prompt },
			signal,
			...(this.#options.arm === 'area'
				? {
						scope: this.#options.agent.createScope({
							name: input.area,
							tools: collectStudyDeskTools(input.area),
						}),
					}
				: {}),
		})
	}

	#createAgent(): AgentInterface {
		const runtime = this.#options.agent
		const tools = createToolManager()
		tools.add(
			STUDY_DESK_TOOLS.map((tool) =>
				createTool({ ...buildStudyDeskDefinition(tool), execute: () => STUDY_DESK_RESULT }),
			),
		)
		return runtime.createAgent(this.#createProvider(), {
			system: STUDY_DESK_SYSTEM,
			tools,
			authority: runtime.createAuthority({ fallback: { zone: 'desk', verdict: 'allow' } }),
			limit: STUDY_DESK_LIMIT,
			on: this.#hooks(),
			...(this.#options.arm === 'index'
				? { skills: this.#createSkills(), builtins: ['load'] as const }
				: {}),
		})
	}

	#createLedger(area: StudyDeskArea): LedgerInterface {
		const options = this.#options
		const provider = options.profile.provider
		if (provider?.judge === undefined) throw new StudyError('CONFIG', 'Desk requires a judge')
		// One value reaches the ledger and the trial's evidence, so the summary splits by what the run disclosed.
		const disclosure = { skills: [area] }
		this.#trace.append('disclosure', disclosure)
		const judge = new StudyAgentJudge(
			options.provider.createOllamaJudge({
				model: provider.judge,
				system: STUDY_DESK_JUDGE,
				url: provider.url,
				timeout: 180000,
				options: STUDY_DESK_JUDGE_OPTIONS,
				fetch: (url, init) => this.#transport.fetch('judge', url, init),
			}),
			this.#transport,
		)
		return options.agent.createLedger(this.#createProvider(), {
			judge,
			system: STUDY_DESK_SYSTEM,
			topics: [STUDY_DESK_TOPIC],
			questions: options.agent.LEDGER_QUESTIONS,
			thresholds: STUDY_DESK_THRESHOLDS,
			capacity: options.profile.room.context - options.profile.room.safety,
			predict: options.profile.room.output,
			think: false,
			lookups: STUDY_DESK_TOOLS.map((tool) => ({
				tool: createTool({ ...buildStudyDeskDefinition(tool), execute: () => STUDY_DESK_RESULT }),
				read: () => undefined,
			})),
			agent: {
				limit: STUDY_DESK_LIMIT,
				on: this.#hooks(),
				skills: this.#createSkills(),
				builtins: ['load'],
				disclosure,
				authority: options.agent.createAuthority({ fallback: { zone: 'desk', verdict: 'allow' } }),
			},
		})
	}

	// Wraps the transported Ollama provider so each dispatch is measured and its first text is timed.
	#createProvider(): ProviderInterface {
		const options = this.#options
		const provider = options.profile.provider
		const roles = buildStudyDeskRoles(options.profile)
		if (provider === undefined || roles.agent === undefined)
			throw new StudyError('CONFIG', 'Desk requires an agent role')
		return new StudyAgentObserver({
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
						throw new StudyError('FAULT', 'Desk response outside a request')
					return request.observe(response)
				},
			}),
			runtime: options.agent,
			gauge: undefined,
			enforced: false,
			record: (measurement, request) => this.#trace.record(measurement, request),
		})
	}

	#createSkills(): SkillManagerInterface {
		const skills = this.#options.agent.createSkillManager()
		skills.add(
			STUDY_DESK_SKILLS.map((skill) => ({
				...skill,
				tools: [...collectStudyDeskTools(skill.name)],
			})),
		)
		return skills
	}

	// Retains each dispatched turn's advertised tools and each call with its denial, in emission order.
	#hooks(): NonNullable<AgentOptions['on']> {
		return {
			request: (_index, request) =>
				this.#capture('turn', () => ({
					tools: (request.tools ?? []).map((definition) => definition.name),
				})),
			tool: (call, result) => this.#capture('tool', () => buildStudyAgentToolResult(call, result)),
			deny: (call, reason) =>
				this.#capture('denial', () => buildStudyAgentToolDenial(call, reason)),
		}
	}

	#capture(event: 'turn' | 'tool' | 'denial', project: () => JSONValue): void {
		try {
			this.#trace.append(event, project())
		} catch (error) {
			this.#transport.fail(error)
		}
	}

	async #dispose(): Promise<void> {
		this.#abort.abort(new StudyError('FAULT', 'Desk session closed'))
		this.#agent?.abort()
		this.#ledger?.agent.abort()
		await this.#transport.close()
		await Promise.allSettled([...this.#flights])
		this.#agent?.emitter.destroy()
		this.#ledger?.agent.emitter.destroy()
		this.#ledger?.conversation.emitter.destroy()
	}
}
