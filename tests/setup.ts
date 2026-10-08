import type {
	AgentContextInterface,
	AgentInterface,
	AgentJudgeInput,
	AgentProviderInput,
	ChoiceAnswer,
	JudgeAnswer,
	JudgeInterface,
	JudgeRequest,
	JudgeResult,
	Judgment,
	JudgmentInput,
	JudgeQuestion,
	NoulAnswer,
	Refusal,
	ScoreAnswer,
	ProviderIncrement,
	ProviderParserInterface,
	ProviderRequest,
	AgentJobInput,
	ConversationInterface,
	ConversationManagerInterface,
	ConversationSnapshot,
	ConversationStoreInterface,
	ConversationSummaryHandler,
	Message,
	MessageInput,
	MessageRole,
	RelayFrame,
	ProviderDelta,
	ProviderInterface,
	ProviderResult,
	ProviderStreamOptions,
	Selection,
	SelectionHandler,
	SelectionOptions,
	ScreenHandler,
} from '@src/core'
import type { TokenUsage } from '@orkestrel/budget'
import type { RecorderInterface } from '@orkestrel/test'
import type { ToolCall, ToolDefinition, ToolInterface, ToolManagerInterface } from '@orkestrel/tool'
import type { SchedulerInterface, SchedulerOptions } from '@orkestrel/workflow'
import {
	AgentContext,
	AgentJudge,
	AgentProvider,
	createAgent,
	createConversation,
	createSelection,
	NEEDED_CRITERION,
	InstructionManager,
	parseConditionKey,
	JudgeError,
	ProviderAbortError,
	ProviderError,
	Scope,
	SystemOneJudge,
} from '@src/core'
import { isTokenUsage } from '@orkestrel/budget'
import { isRecord, isString, parseJSONAs } from '@orkestrel/contract'
import { createRecorder, requireValue, waitForDelay } from '@orkestrel/test'
import { createTool, ToolManager } from '@orkestrel/tool'
import { createBinaryContent, createFile, createTextContent } from '@orkestrel/workspace'

/** Exercises tool dispatch with authority configured and omitted. */
export const AUTHORITY_STATES = Object.freeze([true, false])

/** Supplies the question reused by judgment identity cases. */
export const JUDGMENT_QUESTION: JudgeQuestion = Object.freeze({
	form: 'noul',
	instructions: 'Is a refund owed?',
	criteria: { true: 'Charged twice', false: 'Charged once' },
})

/** Supplies a single answered question before storage stamps its time. */
export const JUDGMENT_INPUT: JudgmentInput = Object.freeze<JudgmentInput>({
	id: 'refund',
	question: JUDGMENT_QUESTION,
	answer: { form: 'noul', noul: 0.9 },
	model: 'tev1:0.8b',
	sources: ['message-a', 'message-b'],
	state: 'Charged twice',
})

/** Supplies a persisted record with a fixed time for identity and restoration tests. */
export const JUDGMENT_RECORD: Judgment = Object.freeze({ ...JUDGMENT_INPUT, time: 1234 })

/** Supplies answered and refused records in one persisted snapshot. */
export const JUDGMENT_SNAPSHOT: ConversationSnapshot = Object.freeze({
	id: 'judged',
	sections: [],
	messages: [],
	judgments: [
		JUDGMENT_RECORD,
		{
			id: 'refused',
			question: JUDGMENT_QUESTION,
			refusal: { missing: ['true'] },
			model: 'tev1:0.8b',
			sources: ['message-a'],
			state: 'Charged twice',
			time: 2345,
		},
	],
})

/** Lists independently malformed judgment members for storage guard tests. */
export const INVALID_JUDGMENTS: readonly unknown[] = Object.freeze([
	null,
	{},
	{ ...JUDGMENT_RECORD, id: 1 },
	{ ...JUDGMENT_RECORD, model: 1 },
	{ ...JUDGMENT_RECORD, question: { form: 'other' } },
	{ ...JUDGMENT_RECORD, sources: [1] },
	{ ...JUDGMENT_RECORD, state: {} },
	{ ...JUDGMENT_RECORD, time: '1234' },
	{ ...JUDGMENT_RECORD, usage: { prompt: -1 } },
	{ ...JUDGMENT_RECORD, answer: undefined },
	{ ...JUDGMENT_RECORD, refusal: { missing: [] } },
	{ ...JUDGMENT_RECORD, answer: { form: 'noul', noul: 'yes' } },
	{ ...JUDGMENT_RECORD, answer: { form: 'score', probabilities: [0, '1'] } },
	{ ...JUDGMENT_RECORD, answer: { form: 'choice', probabilities: { yes: '1' } } },
	{ ...JUDGMENT_RECORD, answer: undefined, refusal: { missing: [1] } },
])

/** Supplies request usage independently of judgment construction. */
export const JUDGMENT_USAGE: TokenUsage = Object.freeze({ prompt: 975, completion: 4, total: 979 })

/** Names each independent mismatch against the shared judgment record. */
export const JUDGMENT_MISMATCHES: ReadonlyArray<readonly [string, Judgment]> = Object.freeze([
	['source', { ...JUDGMENT_RECORD, sources: ['message-c', 'message-b'] }],
	['source order', { ...JUDGMENT_RECORD, sources: ['message-b', 'message-a'] }],
	['source count', { ...JUDGMENT_RECORD, sources: ['message-a'] }],
	[
		'text',
		{ ...JUDGMENT_RECORD, question: { ...JUDGMENT_QUESTION, instructions: 'Was payment valid?' } },
	],
	[
		'criterion',
		{
			...JUDGMENT_RECORD,
			question: {
				form: 'noul',
				instructions: 'Is a refund owed?',
				criteria: { true: 'Charged thrice', false: 'Charged once' },
			},
		},
	],
	[
		'criteria order',
		{
			...JUDGMENT_RECORD,
			question: {
				form: 'noul',
				instructions: 'Is a refund owed?',
				criteria: { false: 'Charged once', true: 'Charged twice' },
			},
		},
	],
	[
		'form',
		{
			...JUDGMENT_RECORD,
			question: {
				form: 'choice',
				instructions: 'Is a refund owed?',
				criteria: { true: 'Charged twice', false: 'Charged once' },
			},
		},
	],
	['state', { ...JUDGMENT_RECORD, state: 'Charged once' }],
	['identity', { ...JUDGMENT_RECORD, model: 'other-model' }],
	[
		'question member order',
		{
			...JUDGMENT_RECORD,
			question: {
				instructions: 'Is a refund owed?',
				criteria: { true: 'Charged twice', false: 'Charged once' },
				form: 'noul',
			},
		},
	],
])

/** Drives the real System One wire methods through the judge engine's sequential mode. */
export class SequentialSystemOneJudge extends AgentJudge {
	readonly name = 'systemone'
	readonly body = SystemOneJudge.prototype.body
	readonly read = SystemOneJudge.prototype.read
}

/** Supplies a fictional stand-in for the missing transcript, with no claim to reproduce the probe. */
export const SELECTION_STAND_IN: readonly Message[] = Object.freeze([
	{ id: 'standing', role: 'user', content: 'Use only local files; do not access the internet.' },
	{
		id: 'acceptance',
		role: 'user',
		content: 'SQLite is accepted. Include a header row in exports.',
	},
	{ id: 'reply', role: 'assistant', content: 'The export will read the local SQLite database.' },
	{ id: 'withdrawal', role: 'user', content: 'Omit the header row from the export.' },
	{ id: 'unrelated', role: 'user', content: 'The office printer needs paper.' },
	{ id: 'request', role: 'user', content: 'Export the active accounts from the local database.' },
])

/** Configures recorded probabilities and transport failures for selection tests. */
export interface StockSelectionFixtureOptions {
	readonly messages?: readonly Message[]
	readonly probabilities?: Readonly<Record<string, number>>
	readonly screen?: ScreenHandler
	readonly limit?: number
	readonly model?: string
	readonly failure?: { readonly at: number; readonly cause: unknown }
	readonly respond?: (request: JudgeRequest, index: number) => Response | Promise<Response>
}

/** Exposes the real conversation, judge, handler, and recording transport used by a selection test. */
export interface StockSelectionFixtureInterface {
	readonly conversation: ConversationInterface
	readonly request: Message
	readonly judge: SequentialSystemOneJudge
	readonly transport: RecordedTransport
	readonly options: SelectionOptions
	readonly select: SelectionHandler
}

/**
 * Creates a real selection over recorded System One envelope data with request-derived keys.
 * @param threshold - The test's explicit cutoff
 * @param options - The message fixture, probabilities, and transport controls
 * @returns The conversation and selection with their transport recorder
 */
export function createStockSelectionFixture(
	threshold: number,
	options: StockSelectionFixtureOptions = {},
): StockSelectionFixtureInterface {
	const messages = options.messages ?? SELECTION_STAND_IN
	const conversation = createConversation({
		snapshot: { id: 'selection-fixture', sections: [], messages },
		summarize: createStubSummarizer().summarize,
	})
	const request = requireValue(messages.at(-1))
	const transport: RecordedTransport = new RecordedTransport(async (): Promise<Response> => {
		const index = transport.requests.length
		if (options.failure !== undefined && options.failure.at === index) throw options.failure.cause
		const body: unknown = await requireValue(transport.requests.at(-1)).clone().json()
		if (!isRecord(body) || !isRecord(body.questions) || !isString(body.state))
			throw new Error('selection fixture received a malformed request')
		const questions: Record<string, JudgeQuestion> = {}
		const answers: Record<string, unknown> = {}
		for (const [id, question] of Object.entries(body.questions)) {
			const key = parseConditionKey(id)
			if (key === undefined || !isRecord(question))
				throw new Error('selection fixture received an unreadable question key')
			const subject = key[1]
			questions[id] = {
				form: 'noul',
				...(isString(question.instructions) ? { instructions: question.instructions } : {}),
			}
			answers[id] = {
				...SYSTEM_ONE_TEV1.answers.refund,
				noul:
					options.probabilities?.[subject] ?? SYSTEM_ONE_TEV1.answers.label.probabilities.billing,
			}
		}
		if (options.respond !== undefined)
			return options.respond({ state: body.state, questions }, index)
		return Response.json({ ...SYSTEM_ONE_TEV1, answers })
	})
	const judge = new SequentialSystemOneJudge({
		url: 'http://selection.test',
		model: options.model ?? 'tev1:0.8b',
		batch: false,
		fetch: transport.fetch,
	})
	const configured: SelectionOptions = {
		judge,
		screen: options.screen ?? ((source) => source.view().map((message) => message.id)),
		needed: { ...NEEDED_CRITERION, threshold },
		limit: options.limit ?? messages.length + 1,
	}
	return {
		conversation,
		request,
		judge,
		transport,
		options: configured,
		select: createSelection(configured),
	}
}

/** Supplies invalid cutoffs whose refusal is part of the selection factory contract. */
export const INVALID_SELECTION_THRESHOLDS = Object.freeze([
	0.5,
	0,
	-1,
	1.01,
	NaN,
	Infinity,
	-Infinity,
])

/** Supplies invalid question limits, including nonfinite and fractional values. */
export const INVALID_SELECTION_LIMITS = Object.freeze([
	-1,
	0.5,
	NaN,
	Infinity,
	Number.MAX_SAFE_INTEGER + 1,
])

/**
 * Builds independent identity changes that must invalidate a needed judgment.
 * @param record - The matching judgment
 * @returns Named records with one identity component changed
 */
export function buildSelectionMismatches(
	record: Judgment,
): ReadonlyArray<readonly [string, Judgment]> {
	return [
		['model', { ...record, model: 'another-model' }],
		['sources', { ...record, sources: ['other', 'request'] }],
		['source order', { ...record, sources: [...record.sources].reverse() }],
		['state', { ...record, state: 'other state' }],
		[
			'instructions',
			{ ...record, question: { ...record.question, instructions: 'Another question?' } },
		],
		[
			'criteria',
			{
				...record,
				question: {
					form: 'noul',
					...(record.question.instructions === undefined
						? {}
						: { instructions: record.question.instructions }),
					criteria: { true: 'Different' },
				},
			},
		],
	]
}

/** Supplies tool groups with unique calls, duplicate calls, detached results, and orphan results. */
export const SELECTION_TOOL_MESSAGES: readonly Message[] = Object.freeze([
	{ id: 'orphan-a', role: 'tool', content: 'lost assistant result', call: 'missing' },
	{ id: 'orphan-b', role: 'tool', content: 'other lost result' },
	{ id: 'unique', role: 'assistant', content: '', calls: [createToolCall({ id: 'one' })] },
	{ id: 'unique-result', role: 'tool', content: 'paired', call: 'one' },
	{
		id: 'duplicate',
		role: 'assistant',
		content: '',
		calls: [createToolCall({ id: 'same' }), createToolCall({ id: 'same' })],
	},
	{ id: 'duplicate-a', role: 'tool', content: 'first', call: 'same' },
	{ id: 'duplicate-b', role: 'tool', content: 'second', call: 'same' },
	{ id: 'recap', role: 'assistant', content: 'Earlier work was summarized.' },
	{ id: 'detached', role: 'tool', content: 'late result', call: 'one' },
	{ id: 'ambiguous-a', role: 'tool', content: 'ambiguous result', call: 'same' },
	{ id: 'ambiguous-b', role: 'tool', content: 'ambiguous companion', call: 'missing' },
	{ id: 'request', role: 'user', content: 'Continue.' },
])

/**
 * Builds a cost fixture containing repeated conversation turns and complete tool groups.
 * @returns Messages whose known size and group structure bound selection request counts
 */
export function buildSelectionCostMessages(): readonly Message[] {
	const messages: Message[] = []
	for (let index = 0; index < 8; index += 1) {
		messages.push(
			{ id: `note-${index}`, role: 'user', content: `Read local record ${index}.` },
			{
				id: `assistant-${index}`,
				role: 'assistant',
				content: '',
				calls: [createToolCall({ id: `call-${index}` })],
			},
			{ id: `result-${index}`, role: 'tool', content: `Record ${index}`, call: `call-${index}` },
		)
	}
	messages.push({ id: 'request', role: 'user', content: 'Summarize the records.' })
	return messages
}

/** Records each request a resolver hands it and answers nothing, so a pre-ask check is observable. */
export class RecordingJudge implements JudgeInterface {
	readonly id = 'recording'
	readonly name = 'recording'
	readonly model = 'recording-model'
	readonly requests: JudgeRequest[] = []

	ask(request: JudgeRequest): Promise<JudgeResult> {
		this.requests.push(request)
		return Promise.resolve({ model: this.model, answers: {} })
	}
}

// ── Scripted ProviderInterface (Ollama-free agent fixture) ───────────────────
//
// The ONE general scripted `ProviderInterface` every Ollama-free agent
// test drives — the agent-job tests, the deterministic loop tests (tool iteration, the
// chunk stream, generate↔stream parity, abort / budget bounds, status, the emitter),
// and the provider-agnosticism proof. The LIVE model is exercised separately in the
// `src:ollama` project. It is a real provider (NOT a mock of the agent): `stream`
// chunks the turn's content into deltas and RETURNS the result, honouring its `signal`
// between every delta exactly like the Ollama provider (an abort throws a
// `ProviderAbortError` carrying the accumulated partial), so a cancel threaded into the
// agent commits a genuine partial.

/**
 * Replays one turn of a {@link createScriptedProvider} script — either a bare {@link ProviderResult}
 * (chunked by the provider's `deltasOf`) or a `{ result, deltas?, thoughts? }` pair whose per-turn
 * `deltas` override how that one turn's content streams and whose `thoughts` stream live
 * reasoning deltas before the content. A `deltas` of `[]` streams the content as zero deltas
 * (the result still returns).
 */
export type ScriptedTurn =
	| ProviderResult
	| {
			readonly result: ProviderResult
			readonly deltas?: readonly string[]
			readonly thoughts?: readonly string[]
	  }

/**
 * Describes one recorded `generate` / `stream` call on a {@link createScriptedProvider} (when `record`).
 *
 * @remarks
 * `signal` is the live bound the call was handed — the agent's composed run signal (external
 * signal + the run's own handle + the `timeout` deadline + the `budget`). A test holds it past
 * the call to prove which bounds did, or did not, trip afterwards.
 */
export interface ScriptedCall {
	readonly messages: readonly Message[]
	readonly tools: readonly ToolDefinition[] | undefined
	readonly options: ProviderStreamOptions | undefined
	readonly signal: AbortSignal
}

/** Chunks a turn's content into the stream deltas a {@link createScriptedProvider} emits. */
export type DeltasOf = (content: string) => readonly string[]

/**
 * Options for {@link createScriptedProvider} — every field optional, defaulting to the
 * original single-delta / repeat-on-exhaust behaviour.
 *
 * @remarks
 * - `delay` — ms paused at the start of each call (lets a test observe concurrency through
 *   `maxInFlight`); defaults to `0`.
 * - `name` — sets the provider's `id` and `name` (so a drop-in-swap test can prove two
 *   providers are distinguishable); defaults to `'scripted'`.
 * - `deltasOf` — how a turn's content is chunked into stream deltas; defaults to one whole
 *   delta (`(content) => [content]`). A per-turn `deltas` (the `{ result, deltas }` turn
 *   form) overrides this for that turn.
 * - `exhaust` — what happens once the turn list is consumed: `'repeat'` (the DEFAULT — the
 *   last turn repeats, so a job with extra tool-iterations still resolves) or `'throw'` (a
 *   call past the end throws, to assert a bounded loop never over-ran the script).
 * - `record` — when `true`, every call appends its `messages` / `tools` / `signal` to `calls`.
 */
export interface ScriptedProviderOptions {
	readonly delay?: number
	readonly name?: string
	readonly deltasOf?: DeltasOf
	readonly exhaust?: 'repeat' | 'throw'
	readonly record?: boolean
}

/**
 * Extends a scripted {@link ProviderInterface} with its live recorders — `maxInFlight` is the
 * high-water mark of concurrent calls (so a test can prove a queue / runner bounded the
 * agent jobs, for example `concurrency: 2` ⇒ `maxInFlight <= 2`), `started` counts calls, and
 * `calls` records each call's `messages` / `tools` / `signal` (populated only under `record: true`).
 */
export interface ScriptedProviderInterface extends ProviderInterface {
	/** The highest number of `stream` calls in flight at once across this provider's life. */
	readonly maxInFlight: number
	/** How many `stream` calls have started in total. */
	readonly started: number
	/** Each call's `messages` / `tools` / `signal`, in order — populated only when `record: true`. */
	readonly calls: readonly ScriptedCall[]
}

/**
 * Normalizes a {@link ScriptedTurn} to its `{ result, deltas, thoughts }` parts — a bare result
 * carries no per-turn deltas and no thoughts. The `'result' in turn` discriminant narrows the
 * union with a guard, never an assertion.
 *
 * @param turn - The scripted turn to normalize
 * @returns The turn's `result` plus its per-turn `deltas` / `thoughts` (`undefined` for a bare result)
 */
export function turnParts(turn: ScriptedTurn): {
	readonly result: ProviderResult
	readonly deltas: readonly string[] | undefined
	readonly thoughts: readonly string[] | undefined
} {
	return 'result' in turn
		? { result: turn.result, deltas: turn.deltas, thoughts: turn.thoughts }
		: { result: turn, deltas: undefined, thoughts: undefined }
}

/**
 * Chunks a turn's whole content into ONE stream delta — the default {@link DeltasOf} a
 * {@link ScriptedProvider} applies when neither a per-turn `deltas` nor an options `deltasOf`
 * overrides it.
 *
 * @param content - The turn's content
 * @returns The content as a single-delta list
 */
export function chunkWholeDelta(content: string): readonly string[] {
	return [content]
}

/**
 * Creates the shared scripted {@link ProviderInterface} for deterministic, Ollama-free agent
 * tests — each `generate` / `stream` call consumes the next {@link ScriptedTurn}, streams
 * its content as deltas (per-turn `deltas`, else `deltasOf(content)`, else the whole content
 * as one delta), and RETURNS the turn's result. The call honours its `signal` between every
 * delta: an already-aborted (or mid-stream aborted) signal throws a `ProviderAbortError`
 * carrying the accumulated partial, so a cancel threaded into the agent commits a genuine
 * partial. Once the turn list is exhausted the last turn repeats (`exhaust: 'repeat'`, the
 * default) unless `exhaust: 'throw'` is set.
 *
 * @param turns - The {@link ScriptedTurn}s to replay in order (the last repeats by default)
 * @param options - The {@link ScriptedProviderOptions} (all optional; see its `@remarks`)
 * @returns A {@link ScriptedProviderInterface} (the provider + its recorders)
 */
export function createScriptedProvider(
	turns: readonly ScriptedTurn[],
	options?: ScriptedProviderOptions,
): ScriptedProviderInterface {
	return new ScriptedProvider(turns, options)
}

/** Frames newline-delimited JSON records without replacing relay behavior. */
export class RelayParser implements ProviderParserInterface {
	#pending = ''
	parse(chunk: string): ReadonlyArray<Readonly<Record<string, unknown>>> {
		this.#pending += chunk
		const lines = this.#pending.split('\n')
		this.#pending = lines.pop() ?? ''
		const records: Array<Readonly<Record<string, unknown>>> = []
		for (const line of lines) {
			if (line.trim().length === 0) continue
			const record = parseJSONAs(line, isRecord)
			if (record === undefined) throw new ProviderError('PROTOCOL', 'invalid JSON record')
			records.push(record)
		}
		return records
	}
	clear(): void {
		this.#pending = ''
	}
}

/** Creates fresh NDJSON framing for a relay response. */
export function createParser(): ProviderParserInterface {
	return new RelayParser()
}

/** Creates a real POST request carrying the supplied relay body. */
export function createRelayRequest(body = '{"messages":[]}', signal?: AbortSignal): Request {
	return new Request('http://relay.test/', {
		method: 'POST',
		body,
		...(signal === undefined ? {} : { signal }),
	})
}

/** Creates a streamed POST request for body-read failure and cancellation proofs. */
export function createStreamingRelayRequest(
	body: ReadableStream<Uint8Array>,
	signal?: AbortSignal,
): Request {
	const options = {
		method: 'POST',
		body,
		duplex: 'half',
		...(signal === undefined ? {} : { signal }),
	}
	return new Request('http://relay.test/', options)
}

/** Creates a JSON-shaped proxy with a synthetic serializer that returns a bigint. */
export function createHostileSerializer(): Readonly<Record<string, unknown>> {
	return new Proxy(
		{ x: 1 },
		{
			get(target, key) {
				return key === 'toJSON' ? () => 1n : Reflect.get(target, key)
			},
		},
	)
}

/**
 * Replays the turns {@link createScriptedProvider} scripts — a REAL {@link ProviderInterface}
 * that honours its signal between every delta and records its calls.
 *
 * @remarks
 * Reaches its own turn cursor and its in-flight / started / calls recorders, so it is a class
 * with `#` state and methods rather than a closure over locals. Construct it through
 * {@link createScriptedProvider}.
 */
export class ScriptedProvider implements ScriptedProviderInterface {
	readonly #turns: readonly ScriptedTurn[]
	readonly #deltasOf: DeltasOf
	readonly #exhaust: 'repeat' | 'throw'
	readonly #record: boolean
	readonly #delay: number
	readonly #name: string
	readonly #calls: ScriptedCall[] = []
	#index = 0
	#inFlight = 0
	#maxInFlight = 0
	#started = 0

	constructor(turns: readonly ScriptedTurn[], options?: ScriptedProviderOptions) {
		this.#turns = turns
		this.#deltasOf = options?.deltasOf ?? chunkWholeDelta
		this.#exhaust = options?.exhaust ?? 'repeat'
		this.#record = options?.record === true
		this.#delay = options?.delay ?? 0
		this.#name = options?.name ?? 'scripted'
	}

	get id(): string {
		return this.#name
	}

	get name(): string {
		return this.#name
	}

	get maxInFlight(): number {
		return this.#maxInFlight
	}

	get started(): number {
		return this.#started
	}

	get calls(): readonly ScriptedCall[] {
		return this.#calls
	}

	async *stream(
		messages: readonly Message[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		run?: ProviderStreamOptions,
	): AsyncGenerator<ProviderDelta, ProviderResult> {
		if (this.#record) {
			this.#calls.push({ messages: [...messages], tools, options: run, signal })
		}
		this.#started += 1
		this.#inFlight += 1
		this.#maxInFlight = Math.max(this.#maxInFlight, this.#inFlight)
		try {
			if (signal.aborted) throw new ProviderAbortError({ content: '' })
			if (this.#delay > 0) await waitForDelay(this.#delay)
			const { result, deltas, thoughts } = turnParts(this.#next())
			// Per-turn `deltas` win; else chunk the content through `deltasOf`.
			const chunks = deltas ?? this.#deltasOf(result.content)
			let streamed = ''
			let reasoned = ''
			for (const thought of thoughts ?? []) {
				if (signal.aborted) {
					const partial: ProviderResult =
						reasoned.length > 0 ? { content: streamed, thinking: reasoned } : { content: streamed }
					throw new ProviderAbortError(partial)
				}
				reasoned += thought
				if (thought.length > 0) yield { channel: 'thinking', text: thought }
			}
			for (const delta of chunks) {
				if (signal.aborted) {
					const partial: ProviderResult =
						reasoned.length > 0 ? { content: streamed, thinking: reasoned } : { content: streamed }
					throw new ProviderAbortError(partial)
				}
				streamed += delta
				if (delta.length > 0) yield { channel: 'content', text: delta }
			}
			if (signal.aborted) {
				const partial: ProviderResult =
					reasoned.length > 0 ? { content: streamed, thinking: reasoned } : { content: streamed }
				throw new ProviderAbortError(partial)
			}
			return result
		} finally {
			this.#inFlight -= 1
		}
	}

	async generate(
		messages: readonly Message[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		run?: ProviderStreamOptions,
	): Promise<ProviderResult> {
		const generator = this.stream(messages, signal, tools, run)
		let step = await generator.next()
		while (!step.done) step = await generator.next()
		return step.value
	}

	// Consume the next turn: past the end either repeat the last ('repeat') or throw ('throw').
	#next(): ScriptedTurn {
		if (this.#index >= this.#turns.length && this.#exhaust === 'throw') {
			throw new Error(`createScriptedProvider exhausted at turn ${this.#index}`)
		}
		const turn = this.#turns[Math.min(this.#index, this.#turns.length - 1)] ?? { content: '' }
		this.#index += 1
		return turn
	}
}

/** Replays a provider turn and then raises the supplied boundary failure. */
export class FailingProvider extends ScriptedProvider {
	readonly #failure: Error
	constructor(result: ProviderResult, failure: Error) {
		super([result], { record: true })
		this.#failure = failure
	}
	override async *stream(
		messages: readonly Message[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		options?: ProviderStreamOptions,
	): AsyncGenerator<ProviderDelta, ProviderResult> {
		yield* super.stream(messages, signal, tools, options)
		throw this.#failure
	}
}

/** Records iterator entry and return while forwarding a real scripted generator. */
export class RecordedProvider extends ScriptedProvider {
	readonly #gate: Promise<void>
	readonly #failure: Error | undefined
	readonly #ready = Promise.withResolvers<void>()
	readonly #closed = Promise.withResolvers<void>()
	#entries = 0
	#finished = false
	#active = 0
	#maximum = 0
	#steps = 0
	#returns = 0
	#cancelled = false
	constructor(
		turns: readonly ScriptedTurn[] = [{ content: 'queued' }],
		gate = Promise.resolve(),
		failure?: Error,
	) {
		super(turns, { record: true })
		this.#gate = gate
		this.#failure = failure
	}
	get entries(): number {
		return this.#entries
	}
	get finished(): boolean {
		return this.#finished
	}
	get ready(): Promise<void> {
		return this.#ready.promise
	}
	get closed(): Promise<void> {
		return this.#closed.promise
	}
	get active(): number {
		return this.#active
	}
	get maximum(): number {
		return this.#maximum
	}
	get steps(): number {
		return this.#steps
	}
	get returns(): number {
		return this.#returns
	}
	get cancelled(): boolean {
		return this.#cancelled
	}
	override stream(
		messages: readonly Message[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		options?: ProviderStreamOptions,
	): AsyncGenerator<ProviderDelta, ProviderResult> {
		this.#entries += 1
		if (this.#failure !== undefined) throw this.#failure
		const iterator = this.#iterate(messages, signal, tools, options)
		return {
			next: this.#next.bind(this, iterator),
			return: this.#return.bind(this, iterator, signal),
			throw: iterator.throw.bind(iterator),
			[Symbol.asyncIterator]() {
				return this
			},
			[Symbol.asyncDispose]: this.#dispose.bind(this, iterator, signal),
		}
	}
	async *#iterate(
		messages: readonly Message[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		options?: ProviderStreamOptions,
	): AsyncGenerator<ProviderDelta, ProviderResult> {
		try {
			return yield* super.stream(messages, signal, tools, options)
		} finally {
			this.#finished = true
			this.#closed.resolve()
		}
	}
	async #next(
		iterator: AsyncGenerator<ProviderDelta, ProviderResult>,
	): Promise<IteratorResult<ProviderDelta, ProviderResult>> {
		this.#steps += 1
		this.#active += 1
		this.#maximum = Math.max(this.#maximum, this.#active)
		try {
			await this.#gate
			const step = await iterator.next()
			this.#ready.resolve()
			return step
		} finally {
			this.#active -= 1
		}
	}
	async #return(
		iterator: AsyncGenerator<ProviderDelta, ProviderResult>,
		signal: AbortSignal,
		result: ProviderResult | PromiseLike<ProviderResult>,
	): Promise<IteratorResult<ProviderDelta, ProviderResult>> {
		this.#returns += 1
		this.#cancelled = signal.aborted
		return iterator.return(result)
	}
	// A Node 22 generator carries no `Symbol.asyncDispose`, so disposal is the wrapper's own
	// `return`, counted like any other return.
	async #dispose(
		iterator: AsyncGenerator<ProviderDelta, ProviderResult>,
		signal: AbortSignal,
	): Promise<void> {
		await this.#return(iterator, signal, { content: '' })
	}
}

// ── Agent data-stub factories (real shapes + per-test overrides) ─────────────
//
// The repeated agent DATA shapes — a tool call, a token usage, the
// canonical `add` / `loop` tools, an agent job — built ONCE as parameterized factories
// so a test stubs the shape it needs and customizes only the bit that matters, instead
// of re-typing the literal. These are REAL data builders (and, for the tools, real
// working `ToolInterface`s), NOT mocks of behaviour.

/**
 * Builds a {@link ToolCall} for an agent / loop test — the verbose `{ id, name, arguments }`
 * literal folded into a call with a sensible default (`add` with no arguments) plus
 * per-call overrides, so a test names only the fields its scenario cares about.
 *
 * @param overrides - Fields to override on the default call (`{ id: 'c1', name: 'add', arguments: {} }`)
 * @returns The assembled tool call
 */
export function createToolCall(overrides?: Partial<ToolCall>): ToolCall {
	return { id: 'c1', name: 'add', arguments: {}, ...overrides }
}

/**
 * Builds a {@link TokenUsage} for an agent / budget test — the default `{ prompt: 5,
 * completion: 7, total: 12 }`, with per-call overrides for a budget-triggering variant.
 *
 * @param overrides - Fields to override on the default usage
 * @returns The assembled token usage
 */
export function createTokenUsage(overrides?: Partial<TokenUsage>): TokenUsage {
	return { prompt: 5, completion: 7, total: 12, ...overrides }
}

/**
 * Builds the canonical `add` tool — a REAL {@link ToolInterface} that returns a fixed `5`, the
 * single most-repeated tool literal across the agent loop / registry tests (where the loop
 * only needs SOME callable tool whose result feeds back, not a real summation). A data
 * builder, not a mock: a test that needs the tool to actually sum its arguments, or to
 * record its calls, keeps its own `createTool` closure.
 *
 * @returns A working `add` tool returning `5`
 */
export function addTool(): ToolInterface {
	return createTool({ name: 'add', execute: () => 5 })
}

/**
 * Builds the canonical `loop` tool — a REAL {@link ToolInterface} that always returns `'again'`,
 * the tool the iteration-cap / budget / always-tool loop tests repeat. A data builder, not
 * a mock.
 *
 * @returns A working `loop` tool
 */
export function loopTool(): ToolInterface {
	return createTool({ name: 'loop', execute: () => 'again' })
}

/**
 * Builds an {@link AgentJobInput} for an agent-job test — the default `{ provider: 'main',
 * messages: [{ role: 'user', content: 'go' }] }`, with per-call overrides so a test names
 * only the job fields its scenario varies (a different `provider` / `content`, a `tools`
 * list, a `budget`). A specific failure-scenario job (a budget ceiling, a tool list) is
 * expressed through overrides; a genuinely bespoke one stays local.
 *
 * @param overrides - Fields to override on the default job
 * @returns The assembled agent-job input
 */
export function createAgentJob(overrides?: Partial<AgentJobInput>): AgentJobInput {
	return { provider: 'main', messages: [{ role: 'user', content: 'go' }], ...overrides }
}

/**
 * Creates a deterministic stub {@link ConversationSummaryHandler} for the conversation-layer tests
 * — a REAL `(messages) => Promise<string>` that digests the slice into `recap of <n>` (the
 * folded count), so a `compact()` produces a predictable section summary and the rollup is a
 * predictable summary-of-summaries (a data-stub, NOT a behavior-mock — the LIVE
 * model is exercised separately in the `src:ollama` project). Counts its calls so a test can
 * prove the summarizer calls per compaction (the section digest, plus the rollup regeneration
 * when the `rollup` option is `true`).
 *
 * @returns The summarizer plus a live `calls` recorder of every digested message-slice
 */
export function createStubSummarizer(): {
	readonly summarize: ConversationSummaryHandler
	readonly calls: ReadonlyArray<readonly Message[]>
} {
	const calls: Array<readonly Message[]> = []
	return {
		get calls() {
			return calls
		},
		async summarize(messages) {
			calls.push(messages)
			return `recap of ${messages.length}`
		},
	}
}

/** Supplies the judge usage a selection fixture reports, distinct from every provider usage. */
export const SELECTION_USAGE: TokenUsage = Object.freeze({ prompt: 30, completion: 2, total: 32 })

/** Names the arguments one {@link SelectionHandler} call receives. */
export type SelectionCall = readonly [
	conversation: ConversationInterface,
	request: Message,
	signal: AbortSignal,
]

/**
 * Configures the recording handler's message predicate and reported usage.
 *
 * @remarks
 * - `keep` — the predicate a message of `view()` must pass to enter the selection, given the
 *   request; omitted ⇒ the selection is `view()` unchanged (a pass-through).
 * - `usage` — the judge usage each returned selection reports; omitted ⇒ none.
 */
export interface RecordingSelectionOptions {
	readonly keep?: (message: Message, request: Message) => boolean
	readonly usage?: TokenUsage
}

/** Records the calls a selection handler fixture receives and the selections it returns. */
export interface RecordingSelectionInterface {
	readonly handler: SelectionHandler
	/** Each call's conversation, request, and signal, in call order. */
	readonly calls: readonly SelectionCall[]
	/** Each returned selection, in call order. */
	readonly selections: readonly Selection[]
}

/**
 * Creates a recording {@link SelectionHandler} that selects the messages of the conversation's
 * `view()` passing `keep`, or the whole `view()` when `keep` is omitted.
 *
 * @param options - The {@link RecordingSelectionOptions} (both optional; see its `@remarks`)
 * @returns The handler plus its live call and selection records
 *
 * @example
 * ```ts
 * const fixture = createRecordingSelection({ usage: SELECTION_USAGE })
 * const selected = await fixture.handler(conversation, request, signal)
 * ```
 */
export function createRecordingSelection(
	options?: RecordingSelectionOptions,
): RecordingSelectionInterface {
	const recorder: RecorderInterface<SelectionCall> = createRecorder<SelectionCall>()
	const selections: Selection[] = []
	return {
		get calls() {
			return recorder.calls
		},
		get selections() {
			return selections
		},
		handler: async (conversation, request, signal) => {
			recorder.handler(conversation, request, signal)
			const view = conversation.view()
			const keep = options?.keep
			const selection: Selection = {
				messages: keep === undefined ? view : view.filter((message) => keep(message, request)),
				judgments: [],
				...(options?.usage === undefined ? {} : { usage: options.usage }),
			}
			selections.push(selection)
			return selection
		},
	}
}

/**
 * Rejects a selection with the error a thrown handler raises.
 *
 * @returns A promise rejected with `Error('the judge is unreachable')`
 *
 * @example
 * ```ts
 * const context = createAgentContext({ select: rejectSelection })
 * ```
 */
export function rejectSelection(): Promise<Selection> {
	return Promise.reject(new Error('the judge is unreachable'))
}

/**
 * Returns the selection a handler gives up on: `fault` set, `messages` as `view()`, and the judge
 * usage it spent ({@link SELECTION_USAGE}).
 *
 * @param conversation - The conversation whose `view()` the selection carries
 * @returns A selection whose `fault` is `Error('the judge refused the needed question')`
 *
 * @example
 * ```ts
 * const selection = await abandonSelection(conversation)
 * ```
 */
export async function abandonSelection(conversation: ConversationInterface): Promise<Selection> {
	return {
		messages: conversation.view(),
		judgments: [],
		usage: SELECTION_USAGE,
		fault: new Error('the judge refused the needed question'),
	}
}

/** Describes one handler failure, the error text it settles with, and the usage its receipt carries. */
export interface SelectionFaultCase {
	readonly label: string
	readonly select: SelectionHandler
	readonly message: string
	readonly usage?: TokenUsage
}

/**
 * Supplies the three selection faults the `strict` rule covers: a thrown handler, a returned
 * `fault`, and a conversation changed during selection.
 */
export const SELECTION_FAULT_CASES: readonly SelectionFaultCase[] = Object.freeze([
	Object.freeze({
		label: 'a thrown handler',
		select: rejectSelection,
		message: 'the judge is unreachable',
	}),
	Object.freeze({
		label: 'a returned fault',
		select: abandonSelection,
		message: 'the judge refused the needed question',
		usage: SELECTION_USAGE,
	}),
	Object.freeze({
		label: 'a changed tail',
		select: async (conversation: ConversationInterface): Promise<Selection> => {
			conversation.add({ role: 'assistant', content: 'A reply from an overlapping run.' })
			return { messages: conversation.view(), judgments: [] }
		},
		message: 'changed during selection',
	}),
])

/** Records how many turn boundaries a {@link SchedulerInterface}'s `yield` paced. */
export interface RecordingSchedulerInterface extends SchedulerInterface {
	/** How many times `yield` ran — the turn boundaries the loop paced through this scheduler. */
	readonly yields: number
}

/**
 * Creates a {@link RecordingSchedulerInterface} — a real `SchedulerInterface` whose
 * `yield` counts each call (the turn boundary it paced) and resolves immediately, so a
 * test can prove pacing ran BETWEEN turns (not after the last). It honours its signal
 * exactly like the real scheduler — an already-aborted signal rejects with the reason —
 * and its `delay` is a no-op. Not a mock: a genuine scheduler the agent loop drives.
 *
 * @returns A scheduler whose `yields` reports the turn boundaries it paced
 */
export function createRecordingScheduler(): RecordingSchedulerInterface {
	let yields = 0
	return {
		get yields() {
			return yields
		},
		async yield(options?: SchedulerOptions) {
			if (options?.signal?.aborted) throw options.signal.reason
			yields += 1
		},
		async delay() {},
	}
}

// ── Store-pair contract batteries (Memory ⇄ Database twins, environment-agnostic) ──
//
// The `{Memory,Database}{Conversation,Workspace}Store` twins each persist the
// SAME self-contained, pure-JSON snapshot behind the SAME `{X}StoreInterface` seam (get / set /
// delete, async, keyed by the snapshot's own id), so the round-trip / upsert / delete / two-ids
// battery is IDENTICAL across each pair. Each pair's snapshot builder + shared battery are
// promoted here so the contract lives in ONE place; every twin invokes the battery ONCE with its
// own store factory and KEEPS its twin-specific blocks local. Real data only — NO mocks. All
// plain `@src/core` without Node or DOM imports, so they load in every project. The assertions are
// plain-JSON `toEqual` (no class-identity `toBe`).

/**
 * Builds a REAL {@link ConversationSnapshot} the way a conversation produces one — three turns
 * added, then a genuine `compact()` folds the oldest two into one summarized section + regenerates
 * the opted-in rollup `summary`, with the last message kept live (`keep: 1`). So the snapshot is
 * NON-VACUOUS in BOTH the compacted sections AND the live tail (and carries a rollup summary). The
 * shared store-test fixture both `{Memory,Database}ConversationStore` twins drive (one
 * builder, not a per-file copy). The deterministic, provider-free summarizer is folded INSIDE
 * (digesting the slice into `recap(<contents>)` — NOT {@link createStubSummarizer}, whose `recap of
 * <n>` digest text differs), so a `compact()` produces a predictable section + rollup.
 *
 * @param id - The conversation id (and snapshot key); defaults to `'chat'`
 * @returns The settled conversation's snapshot (sections + live tail + rollup summary)
 */
export async function buildConversationSnapshot(id = 'chat'): Promise<ConversationSnapshot> {
	const conversation = createConversation({
		id,
		async summarize(messages) {
			return `recap(${messages.map((message) => message.content).join('|')})`
		},
		keep: 1,
		rollup: true,
	})
	conversation.add([
		{ role: 'user', content: 'first' },
		{ role: 'assistant', content: 'second' },
		{ role: 'user', content: 'third' },
	])
	// Fold the oldest two into one summarized section + regenerate the rollup; the last stays live.
	await conversation.compact()
	return conversation.snapshot()
}

/**
 * Holds tool messages with and without `call` so storage tests cover the member's
 * optionality and preservation.
 */
export const TOOL_SNAPSHOT: ConversationSnapshot = Object.freeze<ConversationSnapshot>({
	id: 'weather',
	summary: 'Paris is sunny',
	sections: [
		{
			id: 'section-paris',
			summary: 'Paris is sunny',
			messages: [
				{ id: 'user-paris', role: 'user', content: 'weather in Paris' },
				{
					id: 'assistant-paris',
					role: 'assistant',
					content: '',
					calls: [{ id: 'call-paris', name: 'weather', arguments: { city: 'Paris' } }],
				},
				{ id: 'tool-paris', role: 'tool', content: 'sunny in Paris' },
			],
		},
	],
	messages: [
		{
			id: 'assistant-oslo',
			role: 'assistant',
			content: '',
			calls: [{ id: 'call-oslo', name: 'weather', arguments: { city: 'Oslo' } }],
		},
		{ id: 'tool-oslo', role: 'tool', content: 'sunny in Oslo', call: 'call-oslo' },
	],
})

// A `makeStore` builds a fresh, empty store for one scenario; `build` is
// {@link buildConversationSnapshot}. Every scenario below RUNS the store operations and RETURNS
// their plain results — it asserts nothing, since NO `describe` / `it` / `expect` may enter this
// module. A consuming suite's own `it` block calls the scenario, then asserts on what it returns.
export type MakeConversationStore = () => ConversationStoreInterface
export type BuildConversationSnapshot = (id?: string) => Promise<ConversationSnapshot>

/** Names the literal values a {@link conversationStoreRoundTrip} result must carry, shared by every twin. */
export interface ConversationStoreRoundTripExpectation {
	readonly sectionSummary: string
	readonly sectionMessages: readonly string[]
	readonly liveTail: readonly string[]
	readonly rollupSummary: string
}

/**
 * Holds the literal values `buildConversationSnapshot()`'s round trip must reproduce — the fold's section
 * summary + retained messages, the live tail, and the rollup summary. Shared so both twin suites (and
 * `setup.test.ts`'s own proof) assert the SAME literals rather than each retyping them.
 */
export const conversationStoreRoundTripExpectation: ConversationStoreRoundTripExpectation = {
	sectionSummary: 'recap(first|second)',
	sectionMessages: ['first', 'second'],
	liveTail: ['third'],
	rollupSummary: 'recap(recap(first|second))',
}

/**
 * Runs the round-trip scenario of the shared `ConversationStoreInterface` contract: set a real
 * {@link buildConversationSnapshot} snapshot, then get it back. Returns what was stored and what came
 * back, sections + live tail + rollup summary intact, so the caller's `it` block asserts the equality
 * (and the literals in {@link conversationStoreRoundTripExpectation}) itself.
 *
 * @param makeStore - Builds a fresh, empty store (the twin's own factory)
 * @param build - The snapshot builder ({@link buildConversationSnapshot})
 * @returns The stored `snapshot` and the retrieved `got`
 */
export async function conversationStoreRoundTrip(
	makeStore: MakeConversationStore,
	build: BuildConversationSnapshot,
): Promise<{
	readonly snapshot: ConversationSnapshot
	readonly got: ConversationSnapshot | undefined
}> {
	const store = makeStore()
	const snapshot = await build()
	await store.set(snapshot)
	const got = await store.get(snapshot.id)
	return { snapshot, got }
}

/**
 * Runs the upsert scenario: `set` keys off the snapshot's OWN id (no separate id param), so
 * re-setting the same id REPLACES — insert-or-replace semantics, not an append (one entry, latest
 * wins). Returns the replacement and what `get` reads back, for the caller to assert equal.
 *
 * @param makeStore - Builds a fresh, empty store (the twin's own factory)
 * @param build - The snapshot builder ({@link buildConversationSnapshot})
 * @returns The replacement `second` snapshot and the retrieved `got`
 */
export async function conversationStoreUpsert(
	makeStore: MakeConversationStore,
	build: BuildConversationSnapshot,
): Promise<{
	readonly second: ConversationSnapshot
	readonly got: ConversationSnapshot | undefined
}> {
	const store = makeStore()
	const first = await build('c')
	const second: ConversationSnapshot = {
		id: 'c',
		sections: [],
		messages: [{ id: 'm1', role: 'user', content: 'only' }],
	}
	await store.set(first)
	await store.set(second)
	return { second, got: await store.get('c') }
}

/**
 * Runs the delete scenario: set a snapshot, read it back (proving it landed), delete it, then read
 * again — the caller asserts `beforeDelete` is defined and `afterDelete` is `undefined`.
 *
 * @param makeStore - Builds a fresh, empty store (the twin's own factory)
 * @param build - The snapshot builder ({@link buildConversationSnapshot})
 * @returns The snapshot read before and after the delete
 */
export async function conversationStoreDeleteThenAbsent(
	makeStore: MakeConversationStore,
	build: BuildConversationSnapshot,
): Promise<{
	readonly beforeDelete: ConversationSnapshot | undefined
	readonly afterDelete: ConversationSnapshot | undefined
}> {
	const store = makeStore()
	const snapshot = await build()
	await store.set(snapshot)
	const beforeDelete = await store.get(snapshot.id)
	await store.delete(snapshot.id)
	const afterDelete = await store.get(snapshot.id)
	return { beforeDelete, afterDelete }
}

/**
 * Runs the absent-delete scenario: deleting an id that was never stored — the caller asserts the
 * settled promise resolves `undefined` rather than rejecting (a no-op).
 *
 * @param makeStore - Builds a fresh, empty store (the twin's own factory)
 * @returns The store's own `delete` promise, unsettled
 */
export function conversationStoreDeleteAbsent(makeStore: MakeConversationStore): Promise<void> {
	return makeStore().delete('never-stored')
}

/**
 * Runs the absent-get scenario: getting an id that was never stored — the caller asserts the result
 * is `undefined`.
 *
 * @param makeStore - Builds a fresh, empty store (the twin's own factory)
 * @returns What `get` resolves for an id the store never saw
 */
export function conversationStoreGetAbsent(
	makeStore: MakeConversationStore,
): Promise<ConversationSnapshot | undefined> {
	return makeStore().get('never-stored')
}

/**
 * Runs the two-ids-coexist scenario: a real durable store holds many conversations, so distinct ids
 * must not clobber each other, and dropping one must leave the other intact. Returns every snapshot
 * and every read, before and after the `alpha` delete, for the caller to assert.
 *
 * @param makeStore - Builds a fresh, empty store (the twin's own factory)
 * @param build - The snapshot builder ({@link buildConversationSnapshot})
 * @returns The two stored snapshots and the reads before/after dropping `alpha`
 */
export async function conversationStoreTwoIds(
	makeStore: MakeConversationStore,
	build: BuildConversationSnapshot,
): Promise<{
	readonly alpha: ConversationSnapshot
	readonly beta: ConversationSnapshot
	readonly gotAlpha: ConversationSnapshot | undefined
	readonly gotBeta: ConversationSnapshot | undefined
	readonly gotAlphaAfterDelete: ConversationSnapshot | undefined
	readonly gotBetaAfterDelete: ConversationSnapshot | undefined
}> {
	const store = makeStore()
	const alpha = await build('alpha')
	const beta = await build('beta')
	await store.set(alpha)
	await store.set(beta)
	const gotAlpha = await store.get('alpha')
	const gotBeta = await store.get('beta')
	await store.delete('alpha')
	const gotAlphaAfterDelete = await store.get('alpha')
	const gotBetaAfterDelete = await store.get('beta')
	return { alpha, beta, gotAlpha, gotBeta, gotAlphaAfterDelete, gotBetaAfterDelete }
}

// ── Scenario builders (the seeded entities several suites drive) ─────────────
//
// One general form per scenario, exported here rather than re-declared inside a `describe`
// callback, so a suite imports the fixture instead of owning a near-duplicate of it. Real
// entities throughout — no mocks.

/**
 * Builds a {@link ToolManagerInterface} pre-seeded with working tools — the registry the agent
 * loop tests hand to an agent so the model has SOMETHING callable.
 *
 * @param tools - The tools to seed; defaults to the canonical {@link addTool}
 * @returns A tool manager holding the supplied tools
 */
export function createSeededToolManager(tools?: readonly ToolInterface[]): ToolManagerInterface {
	const manager = new ToolManager()
	manager.add(tools === undefined ? [addTool()] : [...tools])
	return manager
}

/**
 * Builds an {@link AgentContextInterface} whose ACTIVE workspace holds two TEXT files
 * (`keep.txt` / `drop.txt`) and two IMAGE files (`keep.png` / `drop.png`), plus a system prompt
 * and one seeded user turn — so a `scope.files` allow-list can be shown filtering BOTH the
 * rendered text section and the last-user image attach.
 *
 * @remarks
 * The image files are seated through the workspace constructor's `seed` seam, because `write()`
 * only mints text content.
 *
 * @returns The seeded context (system `'sys'`, four active files, one user message)
 */
export function seedWorkspaceContext(): AgentContextInterface {
	const context = new AgentContext({ system: 'sys' })
	context.workspaces.add({
		seed: [
			createFile({ path: 'keep.txt', content: createTextContent('KEPT FILE', 'text') }),
			createFile({ path: 'drop.txt', content: createTextContent('DROPPED FILE', 'text') }),
			createFile({ path: 'keep.png', content: createBinaryContent('KEEPIMG', 'image/png') }),
			createFile({ path: 'drop.png', content: createBinaryContent('DROPIMG', 'image/png') }),
		],
	})
	context.messages.add({ role: 'user', content: 'hi' })
	return context
}

/**
 * Builds an {@link AgentContextInterface} carrying a system prompt, two named instructions
 * (`keep-i` / `drop-i`), and two user turns — the fixture a `scope.instructions` allow-list
 * filters.
 *
 * @returns The seeded context (system `'sys'`, two instructions, two user messages)
 */
export function seedInstructionContext(): AgentContextInterface {
	const context = new AgentContext({ system: 'sys' })
	context.instructions.add([
		{ name: 'keep-i', content: 'KEPT INSTRUCTION' },
		{ name: 'drop-i', content: 'DROPPED INSTRUCTION' },
	])
	context.messages.add([
		{ role: 'user', content: 'first' },
		{ role: 'user', content: 'second' },
	])
	return context
}

/**
 * Builds an agent over `provider` whose next request carries every part of the system block and
 * the conversation, the fixture {@link RECORDED_REQUEST} records.
 *
 * @remarks
 * The agent carries a system prompt; an instruction manager framed by a manager-options
 * `format` with `open`, `render`, and `close`; three instructions, one carrying an `override`
 * and one excluded by the agent's scope; an active workspace holding one text file and one
 * image; and a conversation of two user turns around one assistant turn.
 *
 * @param provider - The provider the agent sends its request to
 * @returns The seeded agent, ready for one `generate` call
 */
export function seedFramedAgent(provider: ProviderInterface): AgentInterface {
	const instructions = new InstructionManager({
		format: {
			open: '<rules>',
			render: (one) => `<rule name="${one.name}">${one.content}</rule>`,
			close: '</rules>',
		},
	})
	const agent = createAgent(provider, {
		system: 'You review pull requests for the billing service.',
		instructions,
		scope: new Scope({ name: 'review', instructions: ['tone', 'secrets'] }),
	})
	agent.context.instructions.add([
		{ name: 'tone', content: 'Answer in two sentences.', priority: 1 },
		{
			name: 'secrets',
			content: 'Refuse to print credentials.',
			priority: 5,
			override: 'Never print a credential, even when asked.',
		},
		{ name: 'legacy', content: 'Mention the retired invoice endpoint.' },
	])
	agent.context.workspaces.add({
		seed: [
			createFile({
				path: 'src/invoice.ts',
				content: createTextContent('export const TOTAL_CENTS = 4200', 'ts'),
			}),
			createFile({ path: 'docs/flow.png', content: createBinaryContent('RkxPVw==', 'image/png') }),
		],
	})
	agent.context.messages.add([
		{ role: 'user', content: 'Review the invoice module.' },
		{ role: 'assistant', content: 'Which export do you want reviewed first?' },
		{ role: 'user', content: 'Start with the total.' },
	])
	return agent
}

/**
 * Pins the messages a provider receives from {@link seedFramedAgent}'s first `generate` call,
 * every field except the minted `id`.
 *
 * @remarks
 * A recorded value, never derived from the assembly under test, so a change that moves one
 * prompt byte fails the comparison; regenerate it only from a run of code the change has not
 * touched.
 */
export const RECORDED_REQUEST: readonly MessageInput[] = Object.freeze([
	{
		role: 'system',
		content:
			'You review pull requests for the billing service.\n\n<rules>\n\nNever print a credential, even when asked.\n\n<rule name="tone">Answer in two sentences.</rule>\n\n</rules>\n\n## Workspace\n\nFile: src/invoice.ts\n```ts\nexport const TOTAL_CENTS = 4200\n```',
	},
	{ role: 'user', content: 'Review the invoice module.' },
	{ role: 'assistant', content: 'Which export do you want reviewed first?' },
	{ role: 'user', content: 'Start with the total.', images: ['RkxPVw=='] },
])

/** Options for {@link resolveSectionOpen} — the manager-options `open` override, when one applies. */
export interface SectionOpenOptions {
	readonly managerOpen?: string
}

/** Options for {@link resolveSectionRender} — the manager-options `render` and the per-item override. */
export interface SectionRenderOptions {
	readonly managerRender?: string
	readonly itemOverride?: string
}

/**
 * Resolves the instructions section's `open` (its header) at whichever cascade level the
 * options set — the built-in floor or a manager-options override.
 *
 * @remarks
 * Builds a context holding ONE instruction, so the rendered block is `<open>\n\n<render>`; the
 * returned string is the part before the render.
 *
 * @param options - The manager-options `open` override, when one applies
 * @returns The resolved section header
 */
export function resolveSectionOpen(options?: SectionOpenOptions): string {
	const managerOpen = options?.managerOpen
	const instructions =
		managerOpen === undefined
			? new InstructionManager()
			: new InstructionManager({ format: { open: managerOpen } })
	const context = new AgentContext({ instructions })
	context.instructions.add({ name: 'a', content: 'X' })
	const block = requireValue(context.build()[0]).content
	return requireValue(block.split('\n\n')[0])
}

/**
 * Resolves ONE instruction item's rendering at whichever cascade levels the options set — the
 * built-in floor, a manager-options override, and the per-item override.
 *
 * @remarks
 * Builds a context holding ONE instruction whose built-in content is `'BUILTIN'`; the returned
 * string is the part after the header.
 *
 * @param options - The manager-options `render` override and the per-item `override`
 * @returns The resolved item rendering
 */
export function resolveSectionRender(options?: SectionRenderOptions): string {
	const managerRender = options?.managerRender
	const instructions =
		managerRender === undefined
			? new InstructionManager()
			: new InstructionManager({
					format: {
						render() {
							return managerRender
						},
					},
				})
	const context = new AgentContext({ instructions })
	context.instructions.add({
		name: 'a',
		content: 'BUILTIN',
		...(options?.itemOverride === undefined ? {} : { override: options.itemOverride }),
	})
	const block = requireValue(context.build()[0]).content
	return requireValue(block.split('\n\n')[1])
}

/**
 * Registers a conversation on a {@link ConversationManagerInterface} and compacts it with the
 * `rollup` option, so the registered conversation carries a real compacted section, a live tail,
 * and a rollup summary — a durable `save` / `open` round trip over it is then NON-VACUOUS in every field.
 *
 * @param manager - The manager to register the conversation on (it supplies the summarizer and `keep`)
 * @param id - The conversation id to register
 */
export async function seedConversation(
	manager: ConversationManagerInterface,
	id: string,
): Promise<void> {
	const conversation = manager.add({ id, rollup: true })
	conversation.add([
		{ role: 'user', content: 'first' },
		{ role: 'assistant', content: 'second' },
		{ role: 'user', content: 'third' },
	])
	await conversation.compact()
}

/** Holds signals recorded by a transport that rejects every request. */
export interface RefusingTransportInterface {
	readonly signals: readonly AbortSignal[]
	readonly fetch: typeof globalThis.fetch
}

/** Builds a transport that records the request signal and rejects without network access. */
export function createRefusingTransport(): RefusingTransportInterface {
	const signals: AbortSignal[] = []
	return {
		get signals() {
			return signals
		},
		fetch(_input, init) {
			const signal = init?.signal
			if (signal !== null && signal !== undefined) signals.push(signal)
			return Promise.reject(new Error('fetch failed'))
		},
	}
}

/** Builds a transport that enqueues each supplied UTF-8 chunk verbatim and closes. */
export function createStreamingTransport(chunks: readonly string[]): typeof globalThis.fetch {
	return () =>
		Promise.resolve(
			new Response(
				new ReadableStream<Uint8Array>({
					start(controller) {
						const encoder = new TextEncoder()
						for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
						controller.close()
					},
				}),
				{ headers: { 'Content-Type': 'application/x-ndjson' } },
			),
		)
}

/** Frames chunks directly or retains them for an explicit end-of-input fixture. */
export class ScriptedFrame implements ProviderParserInterface<string> {
	readonly #buffered: boolean
	#pending = ''
	#cleared = false

	constructor(buffered = false) {
		this.#buffered = buffered
	}
	get cleared(): boolean {
		return this.#cleared
	}
	parse(chunk: string): readonly string[] {
		if (!this.#buffered) return [chunk]
		this.#pending += chunk
		return []
	}
	flush(): readonly string[] {
		return this.#pending.length > 0 ? [this.#pending] : []
	}
	clear(): void {
		this.#pending = ''
		this.#cleared = true
	}
}

/**
 * Holds scripted wire records, optional end-of-input buffering, and the controller a scripted
 * failure aborts in the turn it throws, so a decoder throw races the cancel.
 */
export interface ScriptedWireOptions extends AgentProviderInput {
	readonly records?: ReadonlyMap<string, ProviderIncrement | Error>
	readonly buffered?: boolean
	readonly abort?: AbortController
}

/** Drives the real provider engine with direct content/thinking records and scripted increments. */
export class ScriptedWire extends AgentProvider<string> {
	readonly #records: ReadonlyMap<string, ProviderIncrement | Error>
	readonly #buffered: boolean
	readonly #abort: AbortController | undefined
	readonly #parsers: ScriptedFrame[] = []
	readonly #decoded: string[] = []
	readonly name = 'scripted'
	constructor(options: ScriptedWireOptions) {
		super(options)
		this.#records = options.records ?? new Map()
		this.#buffered = options.buffered ?? false
		this.#abort = options.abort
	}
	get parsers(): readonly ScriptedFrame[] {
		return this.#parsers
	}
	get decoded(): readonly string[] {
		return this.#decoded
	}
	frame(): ScriptedFrame {
		const parser = new ScriptedFrame(this.#buffered)
		this.#parsers.push(parser)
		return parser
	}
	body(request: ProviderRequest): object {
		return request
	}
	read(record: string): ProviderIncrement {
		this.#decoded.push(record)
		const increment = this.#records.get(record)
		if (increment instanceof Error) {
			this.#abort?.abort()
			throw increment
		}
		return (
			increment ?? {
				content: record.startsWith('c:') ? record.slice(2) : '',
				thinking: record.startsWith('t:') ? record.slice(2) : '',
				tools: [],
			}
		)
	}
	finish(parser: ProviderParserInterface<string>): readonly string[] {
		return parser instanceof ScriptedFrame ? parser.flush() : []
	}
}

/** Records byte delivery and cancellation on a real readable stream. */
export class RecordedBody {
	readonly #chunks: readonly Uint8Array[]
	readonly #close: boolean
	readonly #failure: Error | undefined
	readonly #cancellation: Error | undefined
	readonly stream: ReadableStream<Uint8Array>
	readonly #pending = Promise.withResolvers<void>()
	#index = 0
	#bytes = 0
	#cancelled = false
	#reason: unknown
	constructor(chunks: readonly Uint8Array[], close = true, failure?: Error, cancellation?: Error) {
		this.#chunks = chunks
		this.#close = close
		this.#failure = failure
		this.#cancellation = cancellation
		this.stream = new ReadableStream(this, { highWaterMark: 0 })
	}
	get bytes(): number {
		return this.#bytes
	}
	get count(): number {
		return this.#index
	}
	get cancelled(): boolean {
		return this.#cancelled
	}
	get pending(): Promise<void> {
		return this.#pending.promise
	}
	get reason(): unknown {
		return this.#reason
	}
	pull(controller: ReadableStreamDefaultController<Uint8Array>): void {
		const chunk = this.#chunks[this.#index]
		if (chunk !== undefined) {
			this.#index += 1
			this.#bytes += chunk.byteLength
			controller.enqueue(chunk)
		} else if (this.#failure !== undefined) controller.error(this.#failure)
		else if (this.#close) controller.close()
		else this.#pending.resolve()
	}
	cancel(reason?: unknown): void | Promise<void> {
		this.#cancelled = true
		this.#reason = reason
		if (this.#cancellation !== undefined) return Promise.reject(this.#cancellation)
	}
}

/** Records the call signal received by a request-header hook. */
export class RecordedHeaders {
	readonly #signals: AbortSignal[] = []
	readonly #entered = Promise.withResolvers<AbortSignal>()
	readonly #result:
		| Readonly<Record<string, string>>
		| Promise<Readonly<Record<string, string>>>
		| Error
	constructor(
		result:
			| Readonly<Record<string, string>>
			| Promise<Readonly<Record<string, string>>>
			| Error = {},
	) {
		this.#result = result
	}
	get signals(): readonly AbortSignal[] {
		return this.#signals
	}
	get entered(): Promise<AbortSignal> {
		return this.#entered.promise
	}
	headers(
		signal: AbortSignal,
	): Readonly<Record<string, string>> | Promise<Readonly<Record<string, string>>> {
		this.#signals.push(signal)
		this.#entered.resolve(signal)
		if (this.#result instanceof Error) throw this.#result
		return this.#result
	}
}

/** Rejects a transport with its own abort exception when the supplied signal expires. */
export function rejectTransportOnAbort(
	_input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	const signal = requireValue(init?.signal)
	return new Promise((_resolve, reject) => {
		signal.addEventListener('abort', () => reject(new DOMException('x', 'AbortError')), {
			once: true,
		})
	})
}

/** Returns true as an array's own hostile `every`, exposing a guard that trusts the method. */
export function approveEvery(): boolean {
	return true
}

/** Throws when a hostile proxy field is read. */
export function throwProxyRead(): never {
	throw new Error('unreadable field')
}

/** Records requests and returns responses supplied by a fixture. */
export class RecordedTransport {
	readonly #respond: () => Response | Promise<Response>
	readonly #requests: Request[] = []
	readonly #signals: AbortSignal[] = []

	readonly fetch: typeof globalThis.fetch
	constructor(respond: () => Response | Promise<Response>) {
		this.#respond = respond
		this.fetch = this.#request.bind(this)
	}
	get requests(): readonly Request[] {
		return this.#requests
	}
	get signals(): readonly AbortSignal[] {
		return this.#signals
	}

	async #request(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
		const { signal, ...options } = init ?? {}
		if (signal !== undefined && signal !== null) this.#signals.push(signal)
		// Record headers and body without adding a Request-owned listener to the observed signal.
		this.#requests.push(new Request(input, options))
		return this.#respond()
	}
}

/** Drains a provider generator and retains its yielded deltas and terminal value. */
export async function drainProvider(
	stream: AsyncGenerator<ProviderDelta, ProviderResult>,
): Promise<{
	readonly deltas: readonly ProviderDelta[]
	readonly result: ProviderResult
}> {
	const deltas: ProviderDelta[] = []
	let step = await stream.next()
	while (!step.done) {
		deltas.push(step.value)
		step = await stream.next()
	}
	return { deltas, result: step.value }
}

/** Records the global fetch receiver while returning a real response without network access. */
export function recordGlobalTransport(
	this: unknown,
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	return Promise.resolve(
		new Response('c:' + (this === globalThis ? 'global' : 'unbound'), {
			headers: { 'X-Request': new Request(input, init).method },
		}),
	)
}

/** Supplies a callable value for non-JSON domain argument fixtures. */
export function domainArgument(): string {
	return 'domain'
}

/** Lists the domain roles used to compare message wire and domain guards. */
export const MESSAGE_WIRE_ROLES: readonly MessageRole[] = Object.freeze([
	'system',
	'user',
	'assistant',
	'tool',
])

/** Covers the relay channels with inert JSON wire values. */
export const RELAY_WIRE_FRAMES: readonly RelayFrame[] = Object.freeze([
	{ channel: 'content', text: 'answer' },
	{ channel: 'thinking', text: 'reason' },
	{ channel: 'result', result: { content: 'answer' } },
	{ channel: 'abort', partial: { content: 'partial' } },
	{ channel: 'error', message: 'unavailable' },
])

/** Supplies one settled NDJSON turn, enough for a call that must reach the transport and return. */
export const RELAY_RESULT_FRAME = '{"channel":"result","result":{"content":"answer"}}\n'

/** Holds the recorded `tev1:0.8b` choice distribution over a ticket's billing, bug, and account labels. */
export const TEV1_CHOICE: ChoiceAnswer = Object.freeze({
	form: 'choice',
	probabilities: Object.freeze({
		billing: 0.030333089940396418,
		bug: 0.9690833479435905,
		account: 0.0005835621160130767,
	}),
})

/** Holds the recorded `tev1:0.8b` severity distribution over three levels. */
export const TEV1_SCORE: ScoreAnswer = Object.freeze({
	form: 'score',
	probabilities: Object.freeze([0.029332143644132135, 0.9494108750977565, 0.021256981258111343]),
})

/** Holds the recorded `tev1:0.8b` probability that a refund is owed. */
export const TEV1_NOUL: NoulAnswer = Object.freeze({ form: 'noul', noul: 0.9978973674111222 })

/** Keys the recorded `tev1:0.8b` answers by the question ids of {@link TEV1_REQUEST}. */
export const TEV1_ANSWERS: Readonly<Record<string, JudgeAnswer>> = Object.freeze({
	label: TEV1_CHOICE,
	refund: TEV1_NOUL,
	severity: TEV1_SCORE,
})

/**
 * Holds a synthetic engine fixture that asks a choice, a noul, and a score question about one
 * ticket. Its ticket and questions are not the recorded request's; {@link SYSTEM_ONE_JUDGE_REQUEST}
 * carries the recorded projection.
 */
export const TEV1_REQUEST: JudgeRequest = Object.freeze<JudgeRequest>({
	state:
		'Ticket 4182: the export button crashes the app after the 2.4 update; the customer paid twice.',
	questions: {
		label: {
			form: 'choice',
			instructions: 'Which team owns this ticket?',
			criteria: { billing: 'Payments and invoices', bug: null, account: 'Login and profile' },
		},
		refund: {
			form: 'noul',
			instructions: 'Is a refund owed?',
			criteria: { true: 'The customer was charged in error', false: 'Every charge was valid' },
		},
		severity: {
			form: 'score',
			instructions: 'How severe is the defect?',
			criteria: ['Cosmetic; no impact', 'Degraded, workaround exists', 'Blocking; no workaround'],
		},
	},
})

/** Carries the response envelope a {@link ScriptedJudge} reads: the answering model and one call's usage. */
export const JUDGE_ENVELOPE =
	'{"model":"tev1:0.8b","usage":{"prompt":975,"completion":4,"total":979}}'

/**
 * Holds the scripted answers and refusals a {@link ScriptedJudge} reads per question id, and the
 * question id whose body projection it refuses.
 */
export interface ScriptedJudgeOptions extends AgentJudgeInput {
	readonly answers?: Readonly<Record<string, JudgeAnswer>>
	readonly refusals?: Readonly<Record<string, Refusal>>
	readonly refuse?: string
	/** Holds the controller `read` aborts before it returns, so a cancel lands during decoding. */
	readonly readAbort?: AbortController
}

/**
 * Drives the real judge engine: it posts each call's request as JSON, reads the model and usage
 * from the response envelope, and answers each requested id from its script.
 */
export class ScriptedJudge extends AgentJudge {
	readonly #answers: Readonly<Record<string, JudgeAnswer>>
	readonly #refusals: Readonly<Record<string, Refusal>>
	readonly #refuse: string | undefined
	readonly #readAbort: AbortController | undefined
	readonly #bodies: JudgeRequest[] = []
	readonly #values: unknown[] = []
	readonly name = 'scripted'
	constructor(options: ScriptedJudgeOptions) {
		super(options)
		this.#answers = options.answers ?? {}
		this.#refusals = options.refusals ?? {}
		this.#refuse = options.refuse
		this.#readAbort = options.readAbort
	}
	get bodies(): readonly JudgeRequest[] {
		return this.#bodies
	}
	get values(): readonly unknown[] {
		return this.#values
	}
	body(request: JudgeRequest): object {
		this.#bodies.push(request)
		if (this.#refuse !== undefined && Object.hasOwn(request.questions, this.#refuse)) {
			throw new JudgeError('QUESTION', `judge error: question ${this.#refuse} is refused`)
		}
		return { model: this.model, state: request.state, questions: request.questions }
	}
	read(value: unknown, request: JudgeRequest): JudgeResult {
		this.#values.push(value)
		this.#readAbort?.abort()
		if (!isRecord(value)) throw new JudgeError('PROTOCOL', 'judge error: invalid envelope')
		let answers: Readonly<Record<string, JudgeAnswer>> = {}
		let refusals: Readonly<Record<string, Refusal>> = {}
		for (const id of Object.keys(request.questions)) {
			const answer = this.#answers[id]
			const refusal = this.#refusals[id]
			if (answer !== undefined) answers = { ...answers, [id]: answer }
			else if (refusal !== undefined) refusals = { ...refusals, [id]: refusal }
			else throw new JudgeError('PROTOCOL', `judge error: answer ${id} is missing`)
		}
		return {
			model: isString(value.model) ? value.model : this.model,
			answers,
			...(Object.keys(refusals).length === 0 ? {} : { refusals }),
			...(isTokenUsage(value.usage) ? { usage: value.usage } : {}),
		}
	}
}
/** Holds the exact Ollama 0.40.0 request recorded in systemone-tev1-request.json on 2026-10-07. */
export const SYSTEM_ONE_TEV1_REQUEST = Object.freeze({
	model: 'tev1:0.8b',
	state: 'Our checkout has returned 500 errors since 9am. I want a refund for today.',
	questions: {
		label: {
			type: 'choice',
			instructions: 'Which label fits this ticket?',
			criteria: { billing: 'Payments and refunds', bug: 'Software errors', account: null },
		},
		refund: {
			type: 'noul',
			instructions: 'Does the customer ask for money back?',
			criteria: {
				true: 'The customer asks for a refund or for money back.',
				false: 'The customer does not ask for money back.',
			},
		},
		severity: {
			type: 'score',
			instructions: 'How severe is the reported issue?',
			criteria: ['Cosmetic; no impact', 'Degraded, workaround exists', 'Blocking; no workaround'],
		},
	},
})

/** Holds the HTTP 200 body recorded in systemone-tev1.json on 2026-10-07. */
export const SYSTEM_ONE_TEV1 = Object.freeze({
	model: 'tev1:0.8b',
	answers: {
		label: {
			type: 'choice',
			choice: 'bug',
			probabilities: {
				billing: 0.030333089940396418,
				bug: 0.9690833479435905,
				account: 0.0005835621160130767,
			},
			confidence: 0.8718301731972261,
		},
		refund: { type: 'noul', noul: 0.9978973674111222 },
		severity: {
			type: 'score',
			score: 0.9919248376139791,
			legend: {
				'0': 'Cosmetic; no impact',
				'1': 'Degraded, workaround exists',
				'2': 'Blocking; no workaround',
			},
			probabilities: {
				'0': 0.029332143644132135,
				'1': 0.9494108750977565,
				'2': 0.021256981258111343,
			},
			confidence: 0.7863989838603391,
		},
	},
	usage: { input_tokens: 975, output_tokens: 4 },
})

/** Holds the exact request recorded in systemone-tev1-object-request.json on 2026-10-07. */
export const SYSTEM_ONE_OBJECT_REQUEST = Object.freeze({
	model: 'tev1:0.8b',
	state: { message: 'Hi, I was charged twice', plan: 'pro' },
	questions: {
		intent: {
			type: 'choice',
			instructions: { question: 'What does the customer want?', field: 'message' },
			criteria: { refund: 'wants money back', other: 'anything else' },
		},
	},
})

/** Holds the HTTP 200 body recorded in systemone-tev1-object.json on 2026-10-07. */
export const SYSTEM_ONE_OBJECT = Object.freeze({
	model: 'tev1:0.8b',
	answers: {
		intent: {
			type: 'choice',
			choice: 'refund',
			probabilities: { refund: 0.672163600162288, other: 0.32783639983771207 },
			confidence: 0.0872994563506665,
		},
	},
	usage: { input_tokens: 148, output_tokens: 1 },
})

/** Transliterates the recorded distribution into llama.cpp's array probabilities and legend; no live llama.cpp body was recorded. */
export const SYSTEM_ONE_LLAMA = Object.freeze({
	...SYSTEM_ONE_TEV1,
	answers: {
		...SYSTEM_ONE_TEV1.answers,
		severity: {
			type: 'score',
			score: 0.9919248376139791,
			legend: ['Cosmetic; no impact', 'Degraded, workaround exists', 'Blocking; no workaround'],
			probabilities: [0.029332143644132135, 0.9494108750977565, 0.021256981258111343],
		},
	},
})

/** Transliterates the recorded distribution into Mica server fields; no live Mica server body was recorded. */
export const SYSTEM_ONE_MICA = Object.freeze({
	...SYSTEM_ONE_TEV1,
	model: 'mica-v0.1-4b',
	latency_ms: 414,
	answers: {
		label: { ...SYSTEM_ONE_TEV1.answers.label, answer: 'bug', confidence: 0.9690833479435905 },
		refund: { ...SYSTEM_ONE_TEV1.answers.refund, answer: true, confidence: 0.9978973674111222 },
		severity: {
			type: 'score',
			score: 1,
			answer: 1,
			probabilities: SYSTEM_ONE_TEV1.answers.severity.probabilities,
			confidence: 0.9494108750977565,
		},
	},
	usage: { input_tokens: 975, output_tokens: 0 },
})

/** Holds the HTTP 400 responses recorded in systemone-errors.json and systemone-mica-refusal.json. */
export const SYSTEM_ONE_ERRORS = Object.freeze([
	{ status: 400, body: { error: 'questions must contain 1–64 fields' } },
	{ status: 400, body: { error: 'question "q": type must be choice, noul, or score' } },
	{ status: 400, body: { error: 'model is required' } },
	{ status: 400, body: { error: 'hf.co/sky7350/Mica-v0.1-4B:Q4_K_M does not support decision' } },
])

/** Lists values outside the probability domain for guard and decoder boundary tests. */
export const SYSTEM_ONE_INVALID_PROBABILITIES = Object.freeze([
	NaN,
	Infinity,
	-Infinity,
	-0.01,
	1.01,
	'0.5',
	null,
	undefined,
])

/** Carries the recorded tev1 request under the domain's form discriminant. */
export const SYSTEM_ONE_JUDGE_REQUEST: JudgeRequest = Object.freeze<JudgeRequest>({
	state: 'Our checkout has returned 500 errors since 9am. I want a refund for today.',
	questions: {
		label: {
			form: 'choice',
			instructions: 'Which label fits this ticket?',
			criteria: { billing: 'Payments and refunds', bug: 'Software errors', account: null },
		},
		refund: {
			form: 'noul',
			instructions: 'Does the customer ask for money back?',
			criteria: {
				true: 'The customer asks for a refund or for money back.',
				false: 'The customer does not ask for money back.',
			},
		},
		severity: {
			form: 'score',
			instructions: 'How severe is the reported issue?',
			criteria: ['Cosmetic; no impact', 'Degraded, workaround exists', 'Blocking; no workaround'],
		},
	},
})

/** Carries the recorded structured request under the domain's form discriminant. */
export const SYSTEM_ONE_JUDGE_OBJECT: JudgeRequest = Object.freeze<JudgeRequest>({
	state: { message: 'Hi, I was charged twice', plan: 'pro' },
	questions: {
		intent: {
			form: 'choice',
			instructions: { question: 'What does the customer want?', field: 'message' },
			criteria: { refund: 'wants money back', other: 'anything else' },
		},
	},
})

/** Holds the TypeSafe quickstart sentence from introduction/quickstart.md as recorded on 2026-10-07. */
export const SYSTEM_ONE_QUICKSTART_STATE =
	"Hi, I've been trying to connect my Stripe account for 3 days and the integration keeps failing. I'm losing sales. Please help ASAP."

/** Lists incomplete and mismatched response bodies with the question each must name. */
export const SYSTEM_ONE_PROTOCOL_CASES = Object.freeze([
	{ id: 'label', answers: {} },
	{ id: 'label', answers: { ...SYSTEM_ONE_TEV1.answers, label: { type: 'noul', noul: 0.5 } } },
	{
		id: 'label',
		answers: {
			...SYSTEM_ONE_TEV1.answers,
			label: { type: 'choice', probabilities: { billing: 0.1, bug: 0.9 } },
		},
	},
	{
		id: 'severity',
		answers: { ...SYSTEM_ONE_TEV1.answers, severity: { type: 'score', probabilities: [0.1, 0.9] } },
	},
	{ id: 'refund', answers: { ...SYSTEM_ONE_TEV1.answers, refund: { type: 'noul', noul: 1.1 } } },
])

/** Lists unreadable answer maps for {@link SYSTEM_ONE_JUDGE_REQUEST} with the `PROTOCOL` message each must produce. */
export const SYSTEM_ONE_UNREADABLE_ANSWERS = Object.freeze([
	{
		answers: {
			...SYSTEM_ONE_TEV1.answers,
			label: { type: 'choice', probabilities: { billing: 0.03, bug: 0.97 } },
		},
		message: 'judge error: question label has a mismatched or incomplete System One answer',
	},
	{
		answers: {
			refund: SYSTEM_ONE_TEV1.answers.refund,
			severity: SYSTEM_ONE_TEV1.answers.severity,
		},
		message: 'judge error: question label has no System One answer',
	},
	{
		answers: {
			...SYSTEM_ONE_TEV1.answers,
			refund: { type: 'choice', probabilities: { true: 0.9, false: 0.1 } },
		},
		message: 'judge error: question refund has a mismatched or incomplete System One answer',
	},
	{
		answers: { ...SYSTEM_ONE_TEV1.answers, refund: { type: 'noul', noul: 1.1 } },
		message: 'judge error: question refund has an invalid System One answer',
	},
])

/**
 * Answers a System One request of needed questions with the recorded envelope, one noul per
 * question, read from the probability of the subject its key names.
 *
 * @param body - The parsed System One request body a fixture listener received
 * @param probabilities - The yes probability for each subject id a needed key names
 * @returns The recorded envelope carrying one noul answer per requested question
 * @throws Error Thrown when the body is malformed or names a subject with no probability
 *
 * @example
 * ```ts
 * Response.json(answerNeededRequest(await request.json(), { [standing.id]: 0.9979 }))
 * ```
 */
export function answerNeededRequest(
	body: unknown,
	probabilities: Readonly<Record<string, number>>,
): Readonly<Record<string, unknown>> {
	if (!isRecord(body) || !isRecord(body.questions))
		throw new Error('needed fixture received a malformed request')
	const answers: Record<string, unknown> = {}
	for (const id of Object.keys(body.questions)) {
		const subject = parseConditionKey(id)?.[1]
		const noul = subject === undefined ? undefined : probabilities[subject]
		if (noul === undefined) throw new Error(`needed fixture has no probability for ${id}`)
		answers[id] = { type: 'noul', noul }
	}
	return { ...SYSTEM_ONE_TEV1, answers }
}
