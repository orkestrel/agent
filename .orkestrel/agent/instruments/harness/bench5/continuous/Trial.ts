import type {
	JudgeInterface,
	LedgerGauge,
	LedgerLookup,
	LedgerResult,
	Message,
	ProviderInterface,
	Section,
	Selection,
} from '../../vendor/agent-0.0.30-trimmed/index.js'
import type { ToolCall, ToolResult } from '@orkestrel/tool'
import type { EnduranceRuntime } from '../endurance/types.js'
import type { MatrixBudget, MatrixFailure, MatrixRequest } from '../matrix/types.js'
import type { SustainedReceipt } from '../sustained/types.js'
import type { CallRole, Copy, CopyGoal, JudgeStats } from '../types.js'
import type {
	ContinuousExecution,
	ContinuousObservation,
	ContinuousRow,
	ContinuousSection,
	ContinuousSelection,
	ContinuousStatus,
	TrialArm,
	TrialConfig,
} from './types.js'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createToolManager } from '@orkestrel/tool'
import {
	CONVERSATION_RECAP_PREFIX,
	DEFAULT_LEDGER_LIMIT,
	DEFAULT_LEDGER_SHARE,
	DEFAULT_RECALL_LIMIT,
	LEDGER_NOTES,
	LEDGER_QUESTIONS,
	createLedger,
	estimateMessages,
	stripThinking,
} from '../../vendor/agent-0.0.30-trimmed/index.js'
import { createOllama, createOllamaJudge } from '../../vendor/ollama/index.js'
import { INSTRUCTION_DATE } from '../aggregates/constants.js'
import {
	DAEMON,
	FIT,
	LOOKUP_TOOLS,
	MICA_CALIBRATION,
	MICA_CONTEXT,
	MICA_SYSTEM,
	VENDOR_AGENT,
} from '../constants.js'
import { FLUSH_SYSTEM, appendSeed, buildQuestions, buildTail, shapeBody } from '../Driver.js'
import { measureText, projectCopy } from '../endurance/helpers.js'
import {
	buildSystem,
	computeDigest,
	describeError,
	findDay,
	readLookup,
	readWireReading,
	renderDate,
} from '../helpers.js'
import { JudgeCache } from '../JudgeCache.js'
import { readModelDigest } from '../matrix/helpers.js'
import { Mirror } from '../Mirror.js'
import { hashFile } from '../refit/helpers.js'
import { PlainArm } from './arms/PlainArm.js'
import { CONTINUOUS_FAILURE, CONTINUOUS_FILES } from './constants.js'
import { createLookups } from './factories.js'
import {
	collectHistory,
	computeWindowUnits,
	listContinuousFailures,
	matchesOverflow,
	nameContinuous,
	readContinuousManifest,
} from './helpers.js'

/**
 * Serves one frozen manifest's workload through one arm and retains every request, product, receipt, and read-point observation.
 *
 * @remarks
 * A trajectory calibrates the prompt price once, builds the arm, adds the seed up to each goal's read point, sends the prefix flush, serves the goal, and appends its row and observation. It ends at the horizon, at a context-length refusal, at a whole-trajectory limit, at a judge fault, or at a goal with no product unless the manifest's failure policy is `continue`, which records the empty row and serves the next goal.
 *
 * @example
 * ```ts
 * const { manifest } = readContinuousManifest(path)
 * process.exitCode = await new Trial({ manifest, reference: hashFile(path), arm: 'records', out, url, live: true }).execute()
 * ```
 */
export class Trial {
	readonly #config: TrialConfig
	readonly #budget: MatrixBudget
	readonly #started = Date.now()
	readonly #walls = new Map<CallRole, number>()
	readonly #requests = new Set<string>()
	readonly #tags = new Map<string, string>()
	readonly #seeds = new Map<string, number>()
	readonly #receipts: SustainedReceipt[] = []
	readonly #selectedSources = new Set<string>()
	readonly #foldedSources = new Set<string>()
	readonly #abort = new AbortController()
	readonly #faults: string[] = []
	#runtime: EnduranceRuntime | undefined
	#out: string | undefined
	#execution: ContinuousExecution | undefined
	#sequence = 0
	#sent = 0
	#tokens = 0
	#turn = 0
	#stopped: string | undefined
	#overflow = false
	#calibrating = false
	#position = -1
	#current: CopyGoal | undefined
	#date = ''
	#cache: JudgeCache | undefined
	#mirror: Mirror | undefined
	#gauge: LedgerGauge | undefined
	#estimate: number | undefined
	#selected: Selection | undefined
	#boundary = 0
	#prompts: number[] = []
	#picks: ContinuousSelection[] = []
	#shown: Selection | undefined
	#recap = 0
	#lookups = 0
	#repeats = 0
	#recalls = 0
	#closed = 0
	#size: number | undefined
	#folds = 0
	#merges = 0
	#failures = new Set<MatrixFailure>()
	#unserved = 0
	#flushed = 0
	#status: ContinuousStatus = 'started'

	/**
	 * Holds the validated configuration.
	 * @param config - The manifest, its file identity, the arm, the output directory, the daemon URL, and the live flag
	 */
	constructor(config: TrialConfig) {
		this.#config = config
		this.#budget = config.manifest.budget
	}

	/**
	 * Runs the trajectory to its end.
	 *
	 * @returns 0 when every goal was served, 3 when the run ended at a design outcome (a context-length refusal, a limit, or a goal with no product) or reached the horizon past a goal with no product
	 * @remarks Thrown when the output exists, the daemon's models or version differ from the freeze, a transport or harness fault ends the run, or the judge cache faults; the run directory keeps what was written.
	 */
	async execute(): Promise<number> {
		const { manifest, arm, out, reference } = this.#config
		const { runtime } = readContinuousManifest(reference.path)
		this.#runtime = runtime
		if (existsSync(out)) throw new Error(`run output already exists: ${out}`)
		mkdirSync(out, { recursive: true })
		this.#out = out
		const execution: ContinuousExecution = {
			protocol: 'c1',
			manifest: reference,
			arm,
			runtime: manifest.runtime,
		}
		this.#execution = execution
		writeFileSync(join(out, 'execution.json'), `${JSON.stringify(execution, null, 2)}\n`, {
			flag: 'wx',
		})
		for (const name of CONTINUOUS_FILES)
			if (name.endsWith('.jsonl')) writeFileSync(join(out, name), '', { flag: 'wx' })
		await this.#inventory(out)
		const copy = projectCopy(runtime)
		const system = buildSystem({ ledger: { system: copy.system } })
		const lookups = createLookups(copy.tables, () => this.#position)
		const judge = arm === 'records' ? this.#createCache(out) : this.#createInertJudge()
		this.#report(out, 'started', undefined)
		let built: TrialArm | undefined
		try {
			const first = copy.goals[0]
			if (first === undefined) throw new Error('the runtime has no goal to serve')
			this.#gauge = await this.#calibrate(copy, system, judge, lookups, first.after)
			this.#report(out, 'calibrated', undefined)
			built = this.#build(copy, system, judge, lookups, this.#gauge, out)
			this.#advance(built, copy, first.after)
			this.#status = 'running'
			for (const goal of copy.goals) {
				if (!(await this.#serve(built, goal, copy, out))) break
			}
			if (this.#status === 'running') this.#status = 'complete'
		} catch (error) {
			this.#status = this.#abort.signal.aborted ? 'fault' : 'failed'
			this.#report(out, this.#status, describeError(error))
			throw error
		} finally {
			if (built instanceof PlainArm) built.destroy()
			if (built !== undefined) this.#dump(built, out)
		}
		this.#report(out, this.#status, undefined)
		return this.#status === 'complete' && this.#unserved === 0 ? 0 : 3
	}

	async #inventory(out: string): Promise<void> {
		const { manifest, url, arm } = this.#config
		const tags = await fetch(new URL('/api/tags', url))
		if (!tags.ok) throw new Error(`model inventory HTTP ${tags.status}`)
		const inventory: unknown = await tags.json()
		writeFileSync(join(out, 'model-inventory.json'), JSON.stringify(inventory), { flag: 'wx' })
		const roles = arm === 'records' ? [manifest.decision, manifest.judge] : [manifest.decision]
		for (const role of roles)
			if (readModelDigest(inventory, role.model) !== role.digest)
				throw new Error(`actual model digest changed after the freeze: ${role.model}`)
		const version = await fetch(new URL('/api/version', url))
		const value: unknown = await version.json()
		if (
			typeof value !== 'object' ||
			value === null ||
			!('version' in value) ||
			value.version !== manifest.daemon.version
		)
			throw new Error('daemon version differs from the freeze')
	}

	#createCache(out: string): JudgeCache {
		const { manifest, url, live } = this.#config
		const judge = createOllamaJudge({
			url,
			model: manifest.judge.model,
			system: MICA_SYSTEM,
			calibration: { temperature: MICA_CALIBRATION },
			options: { num_ctx: MICA_CONTEXT },
			keepAlive: '5m',
			timeout: manifest.timeout,
			fetch: (input: Parameters<typeof fetch>[0], init?: RequestInit) =>
				this.#fetch('judge', input, init),
		})
		const path = join(out, 'cache', 'judge.jsonl')
		mkdirSync(join(out, 'cache'), { recursive: true })
		const cache = new JudgeCache({
			judge,
			path,
			live,
			retry: manifest.retry,
			abort: (fault) => this.#abort.abort(fault),
		})
		this.#cache = cache
		return cache
	}

	// A plain arm files nothing, so its calibration ledger carries a judge that refuses every question.
	#createInertJudge(): JudgeInterface {
		return {
			id: 'inert-judge',
			name: 'inert judge',
			model: this.#config.manifest.judge.model,
			ask: () => Promise.reject(new Error('calibration asks no judge question')),
		}
	}

	#createProvider(role: CallRole, options: Readonly<Record<string, number>>): ProviderInterface {
		const { manifest, url } = this.#config
		return createOllama({
			url,
			model: manifest.decision.model,
			think: role === 'agent' ? manifest.think : false,
			keepAlive: role === 'judge' ? '5m' : '30m',
			timeout: manifest.timeout,
			options: { ...options },
			fetch: (input: Parameters<typeof fetch>[0], init?: RequestInit) =>
				this.#fetch(role, input, init),
		})
	}

	#assemble(
		copy: Copy,
		system: string,
		judge: JudgeInterface,
		lookups: readonly LedgerLookup[],
		gauge: LedgerGauge | undefined,
	) {
		const { manifest } = this.#config
		return createLedger(
			this.#createProvider('agent', {
				...manifest.sampler,
				num_ctx: this.#budget.window,
				num_predict: this.#budget.reserve,
			}),
			{
				judge,
				system,
				topics: copy.topics,
				questions: LEDGER_QUESTIONS,
				thresholds: FIT,
				capacity: this.#budget.window,
				predict: this.#budget.predict,
				think: manifest.think,
				share: { ...DEFAULT_LEDGER_SHARE },
				recall: { limit: DEFAULT_RECALL_LIMIT },
				agent: { limit: DEFAULT_LEDGER_LIMIT, timeout: manifest.timeout },
				lookups,
				...(gauge === undefined ? {} : { gauge }),
			},
		)
	}

	// Measures one prompt price before the arm exists, on a ledger that serves nothing.
	async #calibrate(
		copy: Copy,
		system: string,
		judge: JudgeInterface,
		lookups: readonly LedgerLookup[],
		after: number,
	): Promise<LedgerGauge> {
		const ledger = this.#assemble(copy, system, judge, lookups, undefined)
		appendSeed(ledger.conversation, copy.seed, 0, after, new Map())
		this.#calibrating = true
		try {
			return await ledger.calibrate(this.#abort.signal)
		} finally {
			this.#calibrating = false
		}
	}

	#build(
		copy: Copy,
		system: string,
		judge: JudgeInterface,
		lookups: readonly LedgerLookup[],
		gauge: LedgerGauge,
		out: string,
	): TrialArm {
		const { manifest } = this.#config
		let arm: TrialArm
		if (this.#config.arm === 'records') {
			const ledger = this.#assemble(copy, system, judge, lookups, gauge)
			this.#mirror = new Mirror(ledger, {
				judge,
				questions: LEDGER_QUESTIONS,
				topics: copy.topics,
				thresholds: FIT,
				system,
				reads: new Map(LOOKUP_TOOLS.map((spec) => [spec.name, readLookup])),
			})
			arm = ledger
		} else {
			const tools = createToolManager()
			for (const lookup of lookups) tools.add(lookup.tool)
			arm = new PlainArm({
				provider: this.#createProvider('agent', {
					...manifest.sampler,
					num_ctx: this.#budget.window,
					num_predict: this.#budget.reserve,
				}),
				system,
				tools,
				limit: DEFAULT_LEDGER_LIMIT,
				timeout: manifest.timeout,
				...(this.#config.arm === 'compaction'
					? {
							compaction: {
								...manifest.compaction,
								summarizer: this.#createProvider('summarizer', {
									...manifest.sampler,
									num_ctx: this.#budget.window,
									num_predict: manifest.compaction.predict,
								}),
								window: computeWindowUnits(this.#budget, gauge),
							},
						}
					: {}),
			})
		}
		const { agent, conversation } = arm
		// A ledger selects through its handler and emits each selection; a plain arm has no handler, so its prompt is the view at each turn.
		if (!(arm instanceof PlainArm))
			agent.emitter.on('select', (selection) => this.#observe(arm, selection, out))
		agent.emitter.on('turn', () => {
			if (arm instanceof PlainArm) {
				const selection: Selection = { messages: conversation.view(), judgments: [] }
				if (this.#shown === undefined) this.#observe(arm, selection, out)
				else {
					this.#selected = selection
					this.#boundary = conversation.messages().length
				}
			}
			this.#turn += 1
			this.#estimate = estimateMessages(
				stripThinking(
					[...agent.context.build(this.#selected), ...conversation.messages().slice(this.#boundary)],
					'none',
				),
			)
			appendFileSync(
				join(out, 'turns.jsonl'),
				`${JSON.stringify({ turn: this.#turn, goal: this.#current?.id, estimate: this.#estimate })}\n`,
			)
		})
		agent.emitter.on('usage', (usage) => {
			this.#prompts.push(usage.prompt)
		})
		agent.emitter.on('tool', (call, result) => this.#count(call, result))
		agent.emitter.on('fault', (error) => {
			this.#faults.push(`${this.#current?.id ?? ''}: ${describeError(error)}`)
			process.stderr.write(`fault ${this.#current?.id ?? ''}: ${describeError(error)}\n`)
		})
		conversation.emitter.on('compact', (section) => this.#fold('compact', section, out))
		conversation.emitter.on('collapse', (section) => this.#fold('collapse', section, out))
		return arm
	}

	#advance(arm: TrialArm, copy: Copy, to: number): void {
		if (to <= this.#position) return
		appendSeed(arm.conversation, copy.seed, this.#position + 1, to, this.#seeds)
		this.#position = to
	}

	#begin(goal: CopyGoal): void {
		this.#current = goal
		this.#selectedSources.clear()
		this.#foldedSources.clear()
		this.#failures.clear()
		this.#overflow = false
		this.#prompts = []
		this.#picks = []
		this.#shown = undefined
		this.#selected = undefined
		this.#estimate = undefined
		this.#recap = 0
		this.#lookups = 0
		this.#repeats = 0
		this.#recalls = 0
		this.#closed = 0
		this.#size = undefined
		this.#folds = 0
		this.#merges = 0
		this.#flushed = 0
	}

	async #serve(arm: TrialArm, goal: CopyGoal, copy: Copy, out: string): Promise<boolean> {
		const { manifest } = this.#config
		this.#begin(goal)
		this.#advance(arm, copy, goal.after)
		this.#date = renderDate(findDay(copy.days, goal.after)?.date ?? '')
		arm.agent.context.instructions.add({
			name: INSTRUCTION_DATE.name,
			content: this.#date,
			priority: INSTRUCTION_DATE.priority,
		})
		await this.#flush()
		const before = this.#cache?.stats() ?? { hits: {}, misses: {}, transient: 0 }
		const first = this.#sequence + 1
		const known = new Set(collectHistory(arm.conversation).map((message) => message.id))
		const started = Date.now()
		let result: LedgerResult | undefined
		let error: string | undefined
		try {
			result = await arm.respond(
				goal.request,
				AbortSignal.any([AbortSignal.timeout(manifest.timeout), this.#abort.signal]),
			)
		} catch (fault) {
			error = describeError(fault)
		}
		const wall = Date.now() - started
		let request: string | undefined
		for (const message of collectHistory(arm.conversation)) {
			if (known.has(message.id)) continue
			this.#tags.set(message.id, goal.id)
			if (request === undefined && message.role === 'user' && message.content === goal.request) {
				request = message.id
				this.#requests.add(message.id)
			}
		}
		if (this.#cache?.fault !== undefined) throw this.#cache.fault
		if (this.#stopped !== undefined) error ??= this.#stopped
		const reply = result === undefined || result.partial ? '' : result.content.trim()
		const row: ContinuousRow = {
			goal: goal.id,
			arm: this.#config.arm,
			success: error === undefined && reply !== '',
			reply,
			partial: result?.partial ?? true,
			...(error === undefined ? {} : { error }),
			...(result?.usage === undefined ? {} : { usage: result.usage }),
			passes: result?.passes.length ?? 0,
			wall,
			flush: this.#flushed,
			first,
			last: this.#sequence,
			prompt: Math.max(0, ...this.#prompts),
			entry: this.#prompts[0],
			overflow: this.#overflow,
			failures: [...this.#failures],
			recalls: {
				calls: this.#recalls,
				closed: this.#closed,
				size: this.#size,
				cause:
					this.#closed === 0
						? undefined
						: this.#recalls - this.#closed >= DEFAULT_RECALL_LIMIT
							? 'limit'
							: 'room',
			},
			lookups: { calls: this.#lookups, repeats: this.#repeats },
			questions: buildQuestions(before, this.#cache?.stats() ?? before),
			briefing: {
				tokens:
					estimateMessages([
						{ id: 'briefing', role: 'system', content: this.#shown?.briefing ?? '' },
					]) * (this.#gauge?.scale ?? 0),
				digest: computeDigest(this.#shown?.briefing ?? ''),
			},
			tail: computeDigest(this.#picks[0]?.tail ?? []),
			scale: this.#gauge?.scale ?? 0,
			folds: this.#folds,
			merges: this.#merges,
			sections: arm.conversation.sections.length,
			recap: this.#recap,
		}
		appendFileSync(join(out, 'rows.jsonl'), `${JSON.stringify(row)}\n`)
		this.#observeWork(arm, goal, row, out)
		if (!row.success) this.#unserved += 1
		if (this.#stopped !== undefined) this.#status = 'limit'
		else if (this.#overflow) this.#status = 'overflow'
		else if (error !== undefined || reply === '')
			this.#status = (manifest.failure ?? CONTINUOUS_FAILURE) === 'continue' ? 'running' : 'failed'
		else this.#status = 'running'
		this.#report(out, this.#status, error)
		console.log(
			`${goal.id}: ${reply === '' ? 'EMPTY' : 'OK'} status=${this.#status} wall=${wall}ms prompt=${row.prompt} sections=${row.sections} requests=${first}-${this.#sequence}`,
		)
		return this.#status === 'running'
	}

	#count(call: ToolCall, result: ToolResult): void {
		const runtime = this.#runtime
		const goal = this.#current
		if (runtime !== undefined && goal !== undefined && this.#out !== undefined) {
			const id = String(call.arguments.id ?? call.arguments.account ?? '')
			const version = runtime.lookups
				.filter(
					(lookup) =>
						lookup.tool === call.name && lookup.id === id && lookup.from <= this.#position,
				)
				.at(-1)?.from
			const receipt: SustainedReceipt = {
				goal: goal.id,
				call: call.id,
				tool: call.name,
				arguments: call.arguments,
				success: result.success,
				content: result.success
					? typeof result.value === 'string'
						? result.value
						: JSON.stringify(result.value)
					: result.error,
				after: this.#position,
				...(version === undefined ? {} : { version }),
			}
			this.#receipts.push(receipt)
			appendFileSync(join(this.#out, 'receipts.jsonl'), `${JSON.stringify(receipt)}\n`)
		}
		if (call.name !== 'recall') {
			this.#lookups += 1
			if (!result.success && result.error === LEDGER_NOTES.repeat) this.#repeats += 1
			return
		}
		this.#recalls += 1
		if (!result.success && result.error === LEDGER_NOTES.closure) {
			this.#closed += 1
			return
		}
		if (this.#size === undefined && result.success) {
			const text = typeof result.value === 'string' ? result.value : JSON.stringify(result.value)
			this.#size =
				estimateMessages([{ id: 'recall', role: 'tool', content: text }]) *
				(this.#gauge?.scale ?? 1)
		}
	}

	#fold(event: ContinuousSection['event'], section: Section, out: string): void {
		if (event === 'compact') this.#folds += 1
		else this.#merges += 1
		const record: ContinuousSection = {
			goal: this.#current?.id ?? '',
			event,
			id: section.id,
			summary: section.summary,
			messages: section.messages.map((message) => message.id),
			estimate: estimateMessages([
				{
					id: section.id,
					role: 'assistant',
					content: `${CONVERSATION_RECAP_PREFIX}${section.summary}`,
				},
			]),
		}
		appendFileSync(join(out, 'sections.jsonl'), `${JSON.stringify(record)}\n`)
	}

	#observe(arm: TrialArm, selection: Selection, out: string): void {
		const goal = this.#current?.id
		if (goal === undefined) return
		this.#selected = selection
		this.#boundary = arm.conversation.messages().length
		this.#estimate = undefined
		const recaps = new Set(arm.conversation.sections.map((section) => section.id))
		if (this.#shown === undefined) {
			this.#shown = selection
			this.#recap = estimateMessages(
				selection.messages.filter((message) => recaps.has(message.id)),
			)
		}
		const briefing = selection.briefing ?? ''
		const record: ContinuousSelection = {
			goal,
			pass: this.#picks.length + 1,
			sequence: this.#sequence,
			briefing,
			digest: computeDigest(briefing),
			tail: buildTail(selection.messages, this.#seeds),
			instructions: Object.fromEntries(
				arm.agent.context.instructions.instructions().map((one) => [one.name, one.content]),
			),
			scale: this.#gauge?.scale,
		}
		this.#picks.push(record)
		appendFileSync(join(out, 'selections.jsonl'), `${JSON.stringify(record)}\n`)
		this.#observeSources(arm, selection, briefing)
	}

	#observeSources(arm: TrialArm, selection: Selection, briefing: string): void {
		const runtime = this.#runtime
		if (runtime === undefined) return
		const direct = new Set(selection.messages.map((message) => message.id))
		const folded = new Set(
			arm.conversation.sections
				.filter((section) => direct.has(section.id))
				.flatMap((section) => section.messages.map((message) => message.id)),
		)
		const input = this.#mirror?.input()
		const projection = input === undefined ? undefined : this.#mirror?.projection(input)
		for (const message of collectHistory(arm.conversation)) {
			const shown =
				direct.has(message.id) ||
				(input !== undefined &&
					projection !== undefined &&
					this.#mirror !== undefined &&
					this.#mirror
						.lines(message.id, input, projection)
						.some((line) => briefing.includes(line.text)))
			if (!shown && !folded.has(message.id)) continue
			const target = shown ? this.#selectedSources : this.#foldedSources
			const index = this.#seeds.get(message.id)
			const source = index === undefined ? undefined : runtime.seed[index]
			if (source !== undefined) target.add(`source:${source.id}`)
			const goal = this.#tags.get(message.id)
			if (message.role === 'assistant' && goal !== undefined && goal !== this.#current?.id)
				target.add(`product:${goal}`)
			const receipt = this.#receipts.find(
				(one) => one.call === message.call && one.version !== undefined && one.success,
			)
			if (receipt !== undefined)
				target.add(
					`lookup:${String(receipt.arguments.id ?? receipt.arguments.account)}@${receipt.version}`,
				)
		}
	}

	#observeWork(arm: TrialArm, goal: CopyGoal, row: ContinuousRow, out: string): void {
		const runtime = this.#runtime
		const current = runtime?.goals.find((one) => one.id === goal.id)
		if (runtime === undefined || current === undefined) return
		const history = collectHistory(arm.conversation)
		const sources = [
			...runtime.seed.slice(0, goal.after + 1).map((source) => `source:${source.id}`),
			...new Set(
				this.#receipts
					.filter((receipt) => receipt.success && receipt.version !== undefined)
					.map(
						(receipt) =>
							`lookup:${String(receipt.arguments.id ?? receipt.arguments.account)}@${receipt.version}`,
					),
			),
		]
		const products = [
			...new Set(
				history
					.filter(
						(message) =>
							message.role === 'assistant' &&
							this.#tags.has(message.id) &&
							this.#tags.get(message.id) !== goal.id,
					)
					.map((message) => `product:${this.#tags.get(message.id)}`),
			),
		]
		const available = [...sources, ...products]
		const earlier = history.filter((message) => this.#tags.get(message.id) !== goal.id)
		const arrivals = measureText(
			runtime.seed
				.slice(0, goal.after + 1)
				.map((source) => source.content)
				.join('\n'),
		).tokens
		const requests = measureText(
			[
				...earlier
					.filter((message) => this.#requests.has(message.id))
					.map((message) => message.content),
				goal.request,
			].join('\n'),
		).tokens
		const work = measureText(
			earlier
				.filter((message) => message.role === 'assistant')
				.map((message) => message.content)
				.join('\n'),
		).tokens
		const tools = measureText(
			earlier
				.filter((message) => message.role === 'tool')
				.map((message) => message.content)
				.join('\n'),
		).tokens
		const complete =
			!row.partial && row.error === undefined && row.reply.length > 0 && !row.overflow
		const observation: ContinuousObservation = {
			goal: goal.id,
			shift: current.shift,
			after: goal.after,
			checkpoint:
				complete &&
				current.shift % 4 === 0 &&
				runtime.goals.filter((one) => one.shift === current.shift).at(-1)?.id === goal.id,
			conversation: history.map((message) => `message:${message.id}`),
			sources,
			products,
			selected: available.filter((id) => this.#selectedSources.has(id)),
			omitted: available.filter((id) => !this.#selectedSources.has(id)),
			folded: available.filter(
				(id) => !this.#selectedSources.has(id) && this.#foldedSources.has(id),
			),
			history: {
				arrivals,
				requests,
				products: work,
				tools,
				total: arrivals + requests + work + tools,
			},
			exposed: false,
			complete,
		}
		appendFileSync(join(out, 'observations.jsonl'), `${JSON.stringify(observation)}\n`)
	}

	async #flush(): Promise<void> {
		const { manifest } = this.#config
		const flusher = this.#createProvider('flush', {
			...manifest.sampler,
			num_ctx: this.#budget.window,
			num_predict: 1,
		})
		const started = performance.now()
		try {
			await flusher.generate(
				[
					{ id: 'flush-system', role: 'system', content: FLUSH_SYSTEM },
					{ id: 'flush-user', role: 'user', content: '' },
				],
				this.#abort.signal,
				undefined,
				{ think: false },
			)
		} catch (error) {
			process.stderr.write(`prefix flush ${this.#current?.id ?? ''}: ${describeError(error)}\n`)
		}
		this.#flushed = performance.now() - started
	}

	async #fetch(
		role: CallRole,
		input: Parameters<typeof fetch>[0],
		init?: RequestInit,
	): Promise<Response> {
		this.#sequence += 1
		const sequence = this.#sequence
		const goal = this.#current?.id
		const started = Date.now()
		const turn = role === 'agent' && !this.#calibrating ? this.#turn : undefined
		const limits = this.#config.manifest.limits
		let status: number | undefined
		let error: string | undefined
		let sent = false
		let raw: unknown
		let responseText: string | undefined
		let buffered: number | undefined
		let result: Response
		try {
			const request = new Request(input, init)
			if (this.#stopped !== undefined) throw new Error(this.#stopped)
			if (
				this.#sent >= limits.calls ||
				this.#tokens >= limits.tokens ||
				Date.now() - this.#started >= limits.wall
			) {
				this.#stopped = `c1 whole-trajectory limit reached at request ${sequence}`
				throw new Error(this.#stopped)
			}
			if (!this.#config.live && new URL(request.url).port === new URL(DAEMON).port)
				throw new Error(`fetch guard: request ${sequence} (${role}) refused; --live is required`)
			const body = shapeBody(role, await request.text(), this.#calibrating)
			raw = JSON.parse(body)
			sent = true
			this.#sent += 1
			const response = await globalThis.fetch(request.url, {
				method: request.method,
				headers: request.headers,
				body,
				signal: request.signal,
			})
			status = response.status
			const bytes = new Uint8Array(await response.arrayBuffer())
			responseText = new TextDecoder().decode(bytes)
			buffered = Date.now()
			result = new Response([204, 205, 304].includes(status) ? null : bytes, {
				status,
				statusText: response.statusText,
				headers: response.headers,
			})
		} catch (cause) {
			error = describeError(cause)
			throw cause
		} finally {
			const reading = readWireReading({ body: raw }, { text: responseText })
			const failures = sent
				? listContinuousFailures(
						role,
						raw,
						responseText,
						this.#budget,
						status,
						error,
						this.#calibrating,
					)
				: []
			if (
				role === 'agent' &&
				sent &&
				!this.#calibrating &&
				(error !== undefined || (status ?? 0) >= 400) &&
				matchesOverflow(responseText ?? error)
			)
				this.#overflow = true
			for (const failure of failures) this.#failures.add(failure)
			const wall = (buffered ?? Date.now()) - started
			const evidence: MatrixRequest = {
				started,
				...(buffered === undefined ? {} : { buffered }),
				finished: Date.now(),
				sequence,
				role,
				...(goal === undefined ? {} : { goal }),
				...(turn === undefined ? {} : { turn }),
				sent,
				request: raw ?? null,
				...(responseText === undefined ? {} : { response: responseText }),
				...(status === undefined ? {} : { status }),
				...(error === undefined ? {} : { error }),
				...(role === 'agent' && this.#estimate !== undefined ? { estimate: this.#estimate } : {}),
				...(reading.prompt === undefined ? {} : { prompt: reading.prompt }),
				...(reading.completion === undefined ? {} : { completion: reading.completion }),
				...(reading.reason === undefined ? {} : { reason: reading.reason }),
				failures,
				wall,
			}
			this.#tokens += (reading.prompt ?? 0) + (reading.completion ?? 0)
			this.#walls.set(role, (this.#walls.get(role) ?? 0) + wall)
			if (this.#out !== undefined)
				appendFileSync(join(this.#out, 'requests.jsonl'), `${JSON.stringify(evidence)}\n`)
		}
		return result
	}

	#dump(arm: TrialArm, out: string): void {
		const sections = new Map(
			arm.conversation.sections.flatMap((section) =>
				section.messages.map((message): [string, string] => [message.id, section.id]),
			),
		)
		writeFileSync(
			join(out, 'messages.jsonl'),
			collectHistory(arm.conversation)
				.map(
					(message: Message) =>
						`${JSON.stringify({
							id: message.id,
							...(this.#seeds.has(message.id) ? { seed: this.#seeds.get(message.id) } : {}),
							role: message.role,
							content: message.content,
							...(message.calls === undefined ? {} : { calls: message.calls }),
							...(message.call === undefined ? {} : { call: message.call }),
							...(this.#tags.has(message.id) ? { goal: this.#tags.get(message.id) } : {}),
							...(sections.has(message.id) ? { section: sections.get(message.id) } : {}),
							request: this.#requests.has(message.id),
						})}\n`,
				)
				.join(''),
		)
		writeFileSync(
			join(out, 'judgments.jsonl'),
			arm.conversation.judgments
				.judgments()
				.map((judgment) => `${JSON.stringify(judgment)}\n`)
				.join(''),
		)
	}

	#report(out: string, status: ContinuousStatus, error: string | undefined): void {
		const { manifest, arm, reference, url, live } = this.#config
		const execution = this.#execution
		const finished = Date.now()
		const stats: JudgeStats | undefined = this.#cache?.stats()
		writeFileSync(
			join(out, 'run.json'),
			`${JSON.stringify(
				{
					protocol: 'c1',
					identity: nameContinuous(manifest.key, arm),
					execution,
					executionFile: hashFile(join(out, 'execution.json')),
					manifest: reference,
					key: manifest.key,
					arm,
					think: manifest.think,
					status,
					...(error === undefined ? {} : { error }),
					live,
					url,
					goals: this.#runtime?.goals.map((goal) => goal.id) ?? [],
					limits: manifest.limits,
					budget: this.#budget,
					compaction: arm === 'compaction' ? manifest.compaction : undefined,
					tokens: this.#tokens,
					sent: this.#sent,
					requests: this.#sequence,
					turns: this.#turn,
					gauge: this.#gauge,
					judge: stats,
					faults: this.#faults,
					unserved: this.#unserved,
					walls: Object.fromEntries(this.#walls),
					build: { entry: VENDOR_AGENT, sha256: computeDigest(readFileSync(VENDOR_AGENT, 'utf8')) },
					started: this.#started,
					finished,
					wall: finished - this.#started,
				},
				null,
				2,
			)}\n`,
		)
	}
}
