import type { LedgerLookup, LedgerTopic, LedgerResult, RelayProvider } from '@src/core'
import { Classifier, createLedger, createRelay, createRelayProvider, renderStub } from '@src/core'
import { createBudget } from '@orkestrel/budget'
import type {
	AgentResult,
	AgentRegistryInterface,
	AuthorityContext,
	ChannelInterface,
} from '@src/core'
import type {
	ClassifierOptions,
	GaugeCall,
	GaugeOptions,
	LedgerCategory,
	LedgerClassification,
	LedgerLine,
	LedgerLookupReading,
	LedgerLookupResult,
	LedgerOptions,
	LedgerProjection,
	LedgerProjectionInput,
	LedgerProjectionRequest,
	LedgerThreshold,
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
	ConversationSnapshotRow,
	Section,
	SystemOneJudgeOptions,
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
	ThinkingReplay,
	ThinkSplitterInterface,
} from '@src/core'
import type { TokenUsage } from '@orkestrel/budget'
import type { DriverInterface } from '@orkestrel/database'
import type { RecorderInterface } from '@orkestrel/test'
import type { ToolCall, ToolDefinition, ToolInterface, ToolManagerInterface } from '@orkestrel/tool'
import type { SchedulerInterface, SchedulerOptions } from '@orkestrel/workflow'
import { createAgentRegistry, createConversationManager } from '@src/core'
import { createToolManager } from '@orkestrel/tool'
import {
	arrayShape,
	integerShape,
	literalShape,
	objectShape,
	optionalShape,
	stringShape,
} from '@orkestrel/contract'
import {
	buildRecords,
	collectNames,
	extractTokens,
	linkOwners,
	splitSentences,
	estimateMessages,
	isLedgerError,
	LEDGER_QUESTIONS,
	AgentContext,
	AgentJudge,
	AgentProvider,
	CONVERSATION_RECAP_PREFIX,
	createAgent,
	createConversation,
	InstructionManager,
	JudgeError,
	ProviderAbortError,
	ProviderError,
	Scope,
	createSystemOneJudge,
	SystemOneJudge,
} from '@src/core'
import { isTokenUsage } from '@orkestrel/budget'
import { canonicalStringify, isRecord, isString, parseJSONAs, rawShape } from '@orkestrel/contract'
import { createDatabase } from '@orkestrel/database'
import {
	captureError,
	createRecorder,
	requireValue,
	waitForAbort,
	waitForDelay,
} from '@orkestrel/test'
import { createTool, ToolManager } from '@orkestrel/tool'
import { createBinaryContent, createFile, createTextContent } from '@orkestrel/workspace'

/** Supplies usage shared by agent runs. */
export const AGENT_USAGE = Object.freeze(createTokenUsage())

/** Configures recorded agent turn scripts. */
export const AGENT_SCRIPT_OPTIONS: ScriptedProviderOptions = Object.freeze({
	name: 'script',
	recorded: true,
	repeat: false,
})

/** Sets the agent timeout fixture deadline in milliseconds. */
export const AGENT_DEADLINE = 25

/** Sums one field of recorded budget consumption. */
export function computeUsageTotal(
	calls: ReadonlyArray<readonly [TokenUsage]>,
	field: keyof TokenUsage,
): number {
	return calls.reduce((total, [usage]) => total + usage[field], 0)
}

/** Names the agent lifecycle events observed by the suite. */
export const AGENT_EVENTS = Object.freeze([
	'start',
	'turn',
	'tool',
	'usage',
	'deny',
	'finish',
	'error',
	'abort',
	'fault',
] as const)
/** Names one observed agent lifecycle event. */
export type AgentEventName = (typeof AGENT_EVENTS)[number]

/** Echoes the last message with usage for reusable agent runs. */
export function createEchoProvider(): ProviderInterface {
	return {
		id: 'reuse',
		name: 'reuse',
		async *stream(messages): AsyncGenerator<ProviderDelta, ProviderResult> {
			// Echo the last user message's content into the answer, so two runs with
			// different conversations produce distinguishable results.
			const last = messages.at(-1)
			yield { channel: 'content', text: 'ok:' }
			return { content: `ok:${last?.content ?? ''}`, usage: AGENT_USAGE }
		},
		async generate(messages) {
			const last = messages.at(-1)
			return { content: `ok:${last?.content ?? ''}`, usage: AGENT_USAGE }
		},
	}
}

/** Supplies tool turns followed by a final answer for compaction. */
export const COMPACT_SCRIPT: readonly ScriptedTurn[] = Object.freeze([
	{ result: { content: 'x'.repeat(40), tools: [createToolCall()] } },
	{ result: { content: 'y'.repeat(40), tools: [createToolCall({ id: 'c2' })] } },
	{ result: { content: 'the answer is 42' } },
])

/** Seeds an agent and conversation for automatic compaction. */
export function seedCompactionAgent(
	window: ReturnType<typeof createBudget<readonly Message[]>> | undefined,
): {
	readonly agent: ReturnType<typeof createAgent>
	readonly conversation: ReturnType<typeof createConversation>
	readonly provider: ReturnType<typeof createScriptedProvider>
} {
	const conversations = createConversationManager({
		summarize: createStubSummarizer().summarize,
		keep: 0,
	})
	const conversation = conversations.add() // auto-activates — the agent's message source
	const tools = createToolManager()
	tools.add(createAddTool())
	const provider = createScriptedProvider(COMPACT_SCRIPT, AGENT_SCRIPT_OPTIONS)
	// The registry is injected through the AGENT (forwarded to its context), so
	// `agent.context.messages` IS the active conversation's live tail — seed the user turn there.
	const agent = createAgent(provider, {
		conversations,
		tools,
		...(window === undefined ? {} : { window }),
		limit: 5,
	})
	agent.context.messages.add({ role: 'user', content: 'go' })
	return { agent, conversation, provider }
}

/** Creates the final-answer provider used by compaction cases. */
export const createAnswerProvider = (): ReturnType<typeof createScriptedProvider> =>
	createScriptedProvider([{ result: { content: 'final answer' } }], {
		name: 'answer',
		recorded: true,
		repeat: true,
	})

/** Switches a conversation, appends the request, and generates its reply. */
export const requestConversation = async (
	agent: ReturnType<typeof createAgent>,
	manager: ReturnType<typeof createConversationManager>,
	id: string,
	content: string,
): Promise<AgentResult> => {
	if (manager.conversation(id) === undefined) manager.add({ id })
	manager.switch(id)
	agent.context.messages.add({ role: 'user', content })
	return agent.generate()
}

/** Holds a provider turn after its first content delta. */
export const createGatedProvider = (gate: PromiseWithResolvers<void>): ProviderInterface => ({
	id: 'gated',
	name: 'gated',
	async *stream(): AsyncGenerator<ProviderDelta, ProviderResult> {
		yield { channel: 'content', text: 'part' }
		await gate.promise
		return { content: 'full' }
	},
	async generate() {
		return { content: 'full' }
	},
})

/** Aborts the caller while a provider reports its partial result. */
export function createAbortingResultProvider(
	abort: AbortController,
	failure: ProviderAbortError,
): ProviderInterface {
	return {
		id: 'empty-thinking',
		name: 'empty-thinking',
		async *stream() {
			yield { channel: 'content', text: 'x' }
			abort.abort()
			throw failure
		},
		async generate() {
			throw failure
		},
	}
}

/** Coordinates overlapping provider calls through caller-owned gates. */
export function createSharedGatedProvider(
	g1: PromiseWithResolvers<void>,
	g2: PromiseWithResolvers<void>,
): ProviderInterface {
	let started = 0
	return {
		id: 'm',
		name: 'm',
		async *stream(_messages, signal): AsyncGenerator<ProviderDelta, ProviderResult> {
			started += 1
			const gate = started === 1 ? g1 : g2
			yield { channel: 'content', text: 'part' }
			await gate.promise
			if (signal.aborted) throw new ProviderAbortError({ content: 'part' })
			return { content: 'full' }
		},
		async generate() {
			return { content: 'full' }
		},
	}
}

/** Coordinates overlapping provider calls through caller-owned gates. */
export function createIndependentGatedProvider(
	g1: PromiseWithResolvers<void>,
	g2: PromiseWithResolvers<void>,
): ProviderInterface {
	let started = 0
	return {
		id: 'own',
		name: 'own',
		async *stream(_messages, signal): AsyncGenerator<ProviderDelta, ProviderResult> {
			started += 1
			const me = started
			const gate = me === 1 ? g1 : g2
			yield { channel: 'content', text: 'part' }
			await gate.promise
			if (signal.aborted) throw new ProviderAbortError({ content: 'part' })
			return { content: `full-${me}` }
		},
		async generate() {
			return { content: 'full' }
		},
	}
}

/** Requests a tool then fails the following provider turn. */
export function createSecondTurnFailureProvider(): ProviderInterface {
	let calls = 0
	return {
		id: 'fault',
		name: 'fault',
		async *stream(): AsyncGenerator<ProviderDelta, ProviderResult> {
			calls += 1
			if (calls === 1) {
				yield { channel: 'content', text: '' }
				return { content: '', tools: [createToolCall()] }
			}
			throw new Error('turn 2 boom')
		},
		async generate() {
			throw new Error('turn 2 boom')
		},
	}
}

/** Replies with the last message for conversation switching. */
export function createConversationEchoProvider(): ProviderInterface {
	return {
		id: 'echo',
		name: 'echo',
		async *stream(messages): AsyncGenerator<ProviderDelta, ProviderResult> {
			const last = messages.at(-1)
			yield { channel: 'content', text: 'ok' }
			return { content: `answer:${last?.content ?? ''}` }
		},
		async generate(messages) {
			const last = messages.at(-1)
			return { content: `answer:${last?.content ?? ''}` }
		},
	}
}

/** Rejects scheduler yielding to exercise agent failure propagation. */
export function createFailingScheduler(): SchedulerInterface {
	return {
		async yield() {
			throw new Error('scheduler fault')
		},
		async delay() {},
	}
}

/** Streams one delta, waits on a gate, then reports a partial result on abort. */
export function createAbortingGatedProvider(
	gate: PromiseWithResolvers<void>,
	usage?: TokenUsage,
): ProviderInterface {
	return {
		id: 'gated-abort',
		name: 'gated-abort',
		async *stream(_messages, signal) {
			yield { channel: 'content', text: 'part' }
			await gate.promise
			if (signal.aborted)
				throw new ProviderAbortError({ content: 'part', ...(usage === undefined ? {} : { usage }) })
			return { content: 'partfull' }
		},
		async generate() {
			return { content: 'partfull' }
		},
	}
}
/** Fails provider generation and streaming after an optional content delta. */
export function createThrowingProvider(message: string, delta?: string): ProviderInterface {
	return {
		id: 'throwing',
		name: 'throwing',
		async *stream(): AsyncGenerator<ProviderDelta, ProviderResult> {
			if (delta !== undefined) yield { channel: 'content', text: delta }
			throw new Error(message)
		},
		async generate() {
			throw new Error(message)
		},
	}
}

/** Builds the call context evaluated by an authority. */
export function createAuthorityContext(
	name: string,
	args: Readonly<Record<string, unknown>> = {},
): AuthorityContext {
	const call: ToolCall = { id: 'c1', name, arguments: args }
	return { call }
}

/** Builds a user message for estimation. */
export function createMessage(content: string): Message {
	return { id: 'm', role: 'user', content }
}

/** Records accesses while a result is projected. */
export class AgentResultAccessCounter {
	content = 0
	thinking = 0
	usage = 0
	partial = 0
	prompt = 0
	completion = 0
	total = 0
}

/** Records accesses while a result is projected. */
export class CountingTokenUsage {
	#counter: AgentResultAccessCounter

	constructor(counter: AgentResultAccessCounter) {
		this.#counter = counter
	}

	get prompt(): number {
		this.#counter.prompt += 1
		return 2
	}

	get completion(): number {
		this.#counter.completion += 1
		return 1
	}

	get total(): number {
		this.#counter.total += 1
		return 3
	}
}

/** Records accesses while a result is projected. */
export class CountingAgentResult {
	readonly counter = new AgentResultAccessCounter()
	#usage = new CountingTokenUsage(this.counter)

	get content(): string {
		this.counter.content += 1
		return 'done'
	}

	get thinking(): string {
		this.counter.thinking += 1
		return 'reasoning'
	}

	get usage(): CountingTokenUsage {
		this.counter.usage += 1
		return this.#usage
	}

	get partial(): boolean {
		this.counter.partial += 1
		return false
	}
}

/** Builds hostile and malformed result cases for total projection. */
export function createInvalidAgentResultCases(): ReadonlyArray<readonly [string, unknown]> {
	const throwingAccessor = { partial: false }
	const throwingGetter = Proxy.revocable(() => 'done', {})
	throwingGetter.revoke()
	Object.defineProperty(throwingAccessor, 'content', {
		enumerable: true,
		get: throwingGetter.proxy,
	})

	const usageAccessor = { content: 'done', partial: false, usage: { completion: 1, total: 2 } }
	const usageGetter = Proxy.revocable(() => 1, {})
	usageGetter.revoke()
	Object.defineProperty(usageAccessor.usage, 'prompt', {
		enumerable: true,
		get: usageGetter.proxy,
	})

	const revokedRoot = Proxy.revocable({ content: 'done', partial: false }, {})
	revokedRoot.revoke()
	const getTrap = Proxy.revocable(() => undefined, {})
	getTrap.revoke()
	const throwingGet = new Proxy({}, { get: getTrap.proxy })
	const revokedUsage = Proxy.revocable({ prompt: 1, completion: 1, total: 2 }, {})
	const nestedRevoked = { content: 'done', usage: revokedUsage.proxy, partial: false }
	revokedUsage.revoke()

	return Object.freeze<ReadonlyArray<readonly [string, unknown]>>([
		['missing content', { partial: false }],
		['missing partial', { content: 'done' }],
		['wrong content type', { content: 1, partial: false }],
		['wrong partial type', { content: 'done', partial: 'false' }],
		['wrong thinking type', { content: 'done', thinking: 1, partial: false }],
		['null usage', { content: 'done', usage: null, partial: false }],
		['wrong usage type', { content: 'done', usage: 'tokens', partial: false }],
		[
			'NaN usage',
			{ content: 'done', usage: { prompt: NaN, completion: 1, total: 2 }, partial: false },
		],
		[
			'positive-infinite usage',
			{
				content: 'done',
				usage: { prompt: 1, completion: Infinity, total: 2 },
				partial: false,
			},
		],
		[
			'negative-infinite usage',
			{
				content: 'done',
				usage: { prompt: 1, completion: 1, total: -Infinity },
				partial: false,
			},
		],
		['missing usage field', { content: 'done', usage: { prompt: 1, total: 2 }, partial: false }],
		['throwing root accessor', throwingAccessor],
		['nested usage accessor', usageAccessor],
		['throwing get trap', throwingGet],
		['revoked root proxy', revokedRoot.proxy],
		['revoked nested usage proxy', nestedRevoked],
		['undefined input', undefined],
		['null input', null],
		['string input', 'done'],
		['number input', 1],
		['boolean input', false],
		['function input', returnUndefined],
		['symbol input', Symbol('result')],
		['bigint input', 1n],
	])
}

/** Creates a registry for one scripted provider turn. */
export function createTurnRegistry(turn: ScriptedTurn): AgentRegistryInterface {
	return createAgentRegistry({ providers: { main: createScriptedProvider([turn]) } })
}

/** Collects channel values with a real pause between pulls. */
export async function collectPaced<T>(
	channel: ChannelInterface<T>,
	pause: number,
): Promise<readonly T[]> {
	const values: T[] = []
	for await (const value of channel.drain()) {
		values.push(value)
		await waitForDelay(pause)
	}
	return values
}

/** Supplies usage for job budget exhaustion. */
export const JOB_USAGE = Object.freeze(createTokenUsage({ prompt: 3, total: 10 }))

/** Supplies a repeated tool turn that exhausts the job budget. */
export const PARTIAL_TURNS = Object.freeze([
	{ content: 'a', tools: [{ id: 'c', name: 'loop', arguments: {} }], usage: JOB_USAGE },
] as const)

/** Describes the serializable job fields exercised by durable queue cases. */
export const AGENT_JOB_SHAPE = Object.freeze(
	objectShape({
		provider: stringShape(),
		messages: arrayShape(
			objectShape({
				role: literalShape(['system', 'user', 'assistant', 'tool']),
				content: stringShape(),
			}),
		),
		system: optionalShape(stringShape()),
		tools: optionalShape(arrayShape(stringShape())),
		limit: optionalShape(integerShape({ min: 0 })),
		budget: optionalShape(integerShape({ min: 0 })),
	}),
)

/** Records the abort state when a parked provider resumes. */
export function createObservedGatedProvider(
	gate: PromiseWithResolvers<void>,
	record: (aborted: boolean) => void,
): ProviderInterface {
	return {
		id: 'observed-gate',
		name: 'observed-gate',
		async *stream(_messages, signal): AsyncGenerator<ProviderDelta, ProviderResult> {
			yield { channel: 'content', text: 'part' }
			await gate.promise
			record(signal.aborted)
			if (signal.aborted) throw new ProviderAbortError({ content: 'part' })
			return { content: 'full' }
		},
		async generate() {
			return { content: 'full' }
		},
	}
}

/** Streams the scenario deltas in their declared order. */
export function createInterleavedThinkingProvider(): ProviderInterface {
	return {
		id: 'thinking',
		name: 'thinking',
		async *stream(): AsyncGenerator<ProviderDelta, ProviderResult> {
			yield { channel: 'thinking', text: 'plan ' }
			yield { channel: 'content', text: 'answer' }
			yield { channel: 'thinking', text: 'check' }
			return { content: 'answer', thinking: 'plan check' }
		},
		async generate() {
			return { content: 'answer', thinking: 'plan check' }
		},
	}
}

/** Streams the scenario deltas in their declared order. */
export function createPacedProvider(): ProviderInterface {
	return {
		id: 'w',
		name: 'w',
		async *stream(): AsyncGenerator<ProviderDelta, ProviderResult> {
			yield { channel: 'content', text: 'a' }
			await waitForDelay() // consumer drains 'a', then parks on the empty buffer
			yield { channel: 'content', text: 'b' }
			return { content: 'ab' }
		},
		async generate() {
			return { content: 'ab' }
		},
	}
}

/** Returns an absent value for malformed-input cases. */
export function returnUndefined(): undefined {
	return undefined
}
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

/** Describes a snapshot in the 0.0.29 shape, which carries the conversation summary 0.0.30 no longer writes. */
export interface SummarizedConversationSnapshot extends ConversationSnapshot {
	readonly summary: string
}

/**
 * Supplies a snapshot in the 0.0.29 shape: one compacted section, a live tail, and the
 * conversation `summary` member that 0.0.30 reads past.
 */
export const SUMMARIZED_CONVERSATION_SNAPSHOT: SummarizedConversationSnapshot =
	Object.freeze<SummarizedConversationSnapshot>({
		id: 'published',
		summary: 'recap of 2',
		sections: [
			{
				id: 'section-depot',
				summary: 'recap of 2',
				messages: [
					{ id: 'user-depot', role: 'user', content: 'Is the depot open on Friday?' },
					{ id: 'assistant-depot', role: 'assistant', content: 'The depot is open on Friday.' },
				],
			},
		],
		messages: [{ id: 'user-order', role: 'user', content: 'Which order is late?' }],
	})

/**
 * Builds a snapshot that is valid in every member except the planted assistant `calls` value, so
 * a guard rejection isolates the per-call check rather than a sibling member.
 *
 * @param calls - The value planted as the `calls` member of the one live assistant message
 * @returns The snapshot candidate, typed `unknown` because `calls` can be anything
 */
export function buildCallsSnapshot(calls: unknown): unknown {
	return { id: 'c', sections: [], messages: [{ id: 'a1', role: 'assistant', content: '', calls }] }
}

/**
 * Renders the content `view()` gives the recap message of a section with `summary`, built from
 * the exported prefix rather than a retyped literal.
 *
 * @param summary - The section summary the recap frames
 * @returns The framed recap text
 */
export function renderRecap(summary: string): string {
	return `${CONVERSATION_RECAP_PREFIX}${summary}`
}

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
	readonly encode = SystemOneJudge.prototype.encode
	readonly read = SystemOneJudge.prototype.read
}

/** Records each request a resolver hands it and answers nothing, so a pre-ask check is observable. */
export class RecordingJudge implements JudgeInterface {
	readonly id = 'recording'
	readonly name = 'recording'
	readonly model = 'recording-model'
	readonly #requests = createRecorder<readonly [JudgeRequest]>()

	get requests(): readonly JudgeRequest[] {
		return this.#requests.calls.map(([request]) => request)
	}

	ask(request: JudgeRequest): Promise<JudgeResult> {
		this.#requests.handler(request)
		return Promise.resolve({ model: this.model, answers: {} })
	}
}

// Deterministic provider turns isolate the agent loop from model and transport variation.

/**
 * Replays one turn of a {@link createScriptedProvider} script — either a bare {@link ProviderResult}
 * (chunked by the provider's `chunk`) or a `{ result, deltas?, thoughts? }` pair whose per-turn
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
 * Describes one recorded `generate` / `stream` call on a {@link createScriptedProvider} when recording is enabled.
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
export type DeltaFunction = (content: string) => readonly string[]

/**
 * Configures the scripted provider's chunking, recording, and repeat behavior.
 *
 * @remarks
 * - `delay` - Milliseconds paused at the start of each call. Default: `0`.
 * - `name` - The provider id and name. Default: `'scripted'`.
 * - `replay` - The supplied thinking policy; omission leaves the member absent.
 * - `chunk` - Content chunking. Default: one whole delta. A per-turn `deltas` list overrides it.
 * - `repeat` - Whether the last turn repeats after the script ends. Default: `true`.
 *   With `false`, a call past the end throws.
 * - `recorded` - Whether calls retain their messages, tools, options, and signal. Default: `false`.
 */
export interface ScriptedProviderOptions {
	readonly replay?: ThinkingReplay
	readonly delay?: number
	readonly name?: string
	readonly chunk?: DeltaFunction
	readonly repeat?: boolean
	readonly recorded?: boolean
}

/**
 * Extends a scripted {@link ProviderInterface} with its live recorders — `peak` is the
 * high-water mark of concurrent calls (so a test can prove a queue / runner bounded the
 * agent jobs, for example `concurrency: 2` ⇒ `peak <= 2`), `started` counts calls, and
 * `calls` records each call's `messages` / `tools` / `signal` (populated only under `recorded: true`).
 */
export interface ScriptedProviderInterface extends ProviderInterface {
	/** The highest number of `stream` calls in flight at once across this provider's life. */
	readonly peak: number
	/** How many `stream` calls have started in total. */
	readonly started: number
	/** Each call's `messages` / `tools` / `signal`, in order — populated only when `recorded: true`. */
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
export function splitTurn(turn: ScriptedTurn): {
	readonly result: ProviderResult
	readonly deltas: readonly string[] | undefined
	readonly thoughts: readonly string[] | undefined
} {
	return 'result' in turn
		? { result: turn.result, deltas: turn.deltas, thoughts: turn.thoughts }
		: { result: turn, deltas: undefined, thoughts: undefined }
}

/**
 * Chunks a turn's whole content into ONE stream delta — the default {@link DeltaFunction} a
 * {@link ScriptedProvider} applies when neither a per-turn `deltas` nor an options `chunk`
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
 * its content as deltas (per-turn `deltas`, else `chunk(content)`, else the whole content
 * as one delta), and RETURNS the turn's result. The call honours its `signal` between every
 * delta: an already-aborted (or mid-stream aborted) signal throws a `ProviderAbortError`
 * carrying the accumulated partial, so an abort threaded into the agent commits a genuine
 * partial. After the turn list is exhausted the last turn repeats (`repeat: true`, the
 * default) unless `repeat: false` is set.
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

/**
 * Builds the partial provider result accumulated before an abort.
 *
 * @param content - The content emitted before the abort
 * @param thinking - The reasoning emitted before the abort
 * @returns The accumulated content with reasoning only when it is present
 * @example
 * ```ts
 * buildProviderPartial('answer', 'plan') // { content: 'answer', thinking: 'plan' }
 * ```
 */
export function buildProviderPartial(content: string, thinking: string): ProviderResult {
	return thinking.length > 0 ? { content, thinking } : { content }
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

/**
 * Creates fresh NDJSON framing for a relay response.
 *
 * @returns A parser that frames newline-delimited JSON records
 */
export function createParser(): ProviderParserInterface {
	return new RelayParser()
}

/**
 * Creates a real POST request carrying the supplied relay body. A stream body adds the
 * `duplex: 'half'` member a streamed request needs.
 *
 * @param body - The request body: a string, or a stream for body-read failure and abort proofs
 * @param signal - The signal the request carries; omitted leaves the request unbound
 * @returns The POST request
 */
export function createRelayRequest(
	body: string | ReadableStream<Uint8Array> = '{"messages":[]}',
	signal?: AbortSignal,
): Request {
	const options = {
		method: 'POST',
		body,
		...(typeof body === 'string' ? {} : { duplex: 'half' }),
		...(signal === undefined ? {} : { signal }),
	}
	return new Request('http://relay.test/', options)
}

/**
 * Creates a JSON-shaped proxy with a synthetic serializer that returns a bigint.
 *
 * @returns A record whose `toJSON` member returns a bigint
 */
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
 * Replays the turns {@link createScriptedProvider} scripts through a {@link ProviderInterface}
 * that honours its signal between every delta and records its calls.
 *
 * @remarks
 * Reaches its own turn cursor and its in-flight / started / calls recorders, so it is a class
 * with `#` state and methods rather than a closure over locals. Construct it through
 * {@link createScriptedProvider}.
 */
export class ScriptedProvider implements ScriptedProviderInterface {
	readonly replay?: ThinkingReplay
	readonly #turns: readonly ScriptedTurn[]
	readonly #chunk: DeltaFunction
	readonly #repeat: boolean
	readonly #recorded: boolean
	readonly #delay: number
	readonly #name: string
	readonly #calls = createRecorder<readonly [ScriptedCall]>()
	#index = 0
	#inFlight = 0
	#peak = 0
	#started = 0

	constructor(turns: readonly ScriptedTurn[], options?: ScriptedProviderOptions) {
		if (options?.replay !== undefined) this.replay = options.replay
		this.#turns = turns
		this.#chunk = options?.chunk ?? chunkWholeDelta
		this.#repeat = options?.repeat ?? true
		this.#recorded = options?.recorded === true
		this.#delay = options?.delay ?? 0
		this.#name = options?.name ?? 'scripted'
	}

	get id(): string {
		return this.#name
	}

	get name(): string {
		return this.#name
	}

	get peak(): number {
		return this.#peak
	}

	get started(): number {
		return this.#started
	}

	get calls(): readonly ScriptedCall[] {
		return this.#calls.calls.map(([call]) => call)
	}

	async *stream(
		messages: readonly Message[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		options?: ProviderStreamOptions,
	): AsyncGenerator<ProviderDelta, ProviderResult> {
		if (this.#recorded) {
			this.#calls.handler({ messages: [...messages], tools, options, signal })
		}
		this.#started += 1
		this.#inFlight += 1
		this.#peak = Math.max(this.#peak, this.#inFlight)
		try {
			if (signal.aborted) throw new ProviderAbortError({ content: '' })
			if (this.#delay > 0) await waitForDelay(this.#delay)
			const { result, deltas, thoughts } = splitTurn(this.#next())
			const chunks = deltas ?? this.#chunk(result.content)
			let streamed = ''
			let reasoned = ''
			for (const thought of thoughts ?? []) {
				if (signal.aborted) {
					throw new ProviderAbortError(buildProviderPartial(streamed, reasoned))
				}
				reasoned += thought
				if (thought.length > 0) yield { channel: 'thinking', text: thought }
			}
			for (const delta of chunks) {
				if (signal.aborted) {
					throw new ProviderAbortError(buildProviderPartial(streamed, reasoned))
				}
				streamed += delta
				if (delta.length > 0) yield { channel: 'content', text: delta }
			}
			if (signal.aborted) {
				throw new ProviderAbortError(buildProviderPartial(streamed, reasoned))
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
		options?: ProviderStreamOptions,
	): Promise<ProviderResult> {
		const generator = this.stream(messages, signal, tools, options)
		let step = await generator.next()
		while (!step.done) step = await generator.next()
		return step.value
	}

	#next(): ScriptedTurn {
		if (this.#index >= this.#turns.length && !this.#repeat) {
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
		super([result], { recorded: true })
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
	#aborted = false
	constructor(
		turns: readonly ScriptedTurn[] = [{ content: 'queued' }],
		gate = Promise.resolve(),
		failure?: Error,
	) {
		super(turns, { recorded: true })
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
	get aborted(): boolean {
		return this.#aborted
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
		this.#aborted = signal.aborted
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

/** Supplies assistant thinking before and after the last user turn. */
export const THINKING_MESSAGES: readonly Message[] = Object.freeze([
	Object.freeze({ id: 'u1', role: 'user', content: 'Plan the trip' }),
	Object.freeze({
		id: 'a1',
		role: 'assistant',
		content: 'Fares found',
		thinking: 'first reasoning',
	}),
	Object.freeze({ id: 'u2', role: 'user', content: 'Book it' }),
	Object.freeze({ id: 'a2', role: 'assistant', content: 'Booked', thinking: 'second reasoning' }),
	Object.freeze({ id: 'a3', role: 'assistant', content: 'Receipt sent' }),
])

/** Supplies ordered keys for allow-list filtering. */
export const ALLOW_LIST_MEMBERS = Object.freeze([
	Object.freeze({ name: 'a' }),
	Object.freeze({ name: 'b' }),
	Object.freeze({ name: 'c' }),
])

/** Supplies distinct records whose extracted keys decide admission. */
export const ALLOW_LIST_MATCH_MEMBERS = Object.freeze([
	Object.freeze({ name: 'a', extra: 1 }),
	Object.freeze({ name: 'z', extra: 2 }),
])

/** Supplies the usage shared by provider composition proofs. */
export const INTEGRATION_USAGE: TokenUsage = Object.freeze(createTokenUsage())

/**
 * Builds exchanges spanned by interleaved tool results.
 *
 * @returns Fresh messages with independent tool calls
 */
export function buildExchangeMessages(): readonly Message[] {
	return [
		{ id: 'lead', role: 'assistant', content: 'Welcome.' },
		{ id: 'u1', role: 'user', content: 'Read the order.' },
		{ id: 'a1', role: 'assistant', content: '', calls: [createToolCall({ id: 'c1' })] },
		{ id: 'u2', role: 'user', content: 'Read the account.' },
		{ id: 'a2', role: 'assistant', content: '', calls: [createToolCall({ id: 'c2' })] },
		{ id: 'r1', role: 'tool', content: 'Order.', call: 'c1' },
		{ id: 'u3', role: 'user', content: 'Continue.' },
		{ id: 'r2', role: 'tool', content: 'Account.', call: 'c2' },
		{ id: 'u4', role: 'user', content: 'Finish.' },
	]
}

/**
 * Builds unique, positional, and orphan tool-result groups.
 *
 * @returns Fresh messages with independent tool calls
 */
export function buildToolGroupMessages(): readonly Message[] {
	return [
		{ id: 'U', role: 'user', content: 'Which order is late?' },
		{ id: 'A1', role: 'assistant', content: '', calls: [createToolCall({ id: 'one' })] },
		{ id: 'R1', role: 'tool', content: 'positional result' },
		{ id: 'A2', role: 'assistant', content: '', calls: [createToolCall({ id: 'two' })] },
		{ id: 'R2', role: 'tool', content: 'second result', call: 'two' },
		{ id: 'L1', role: 'tool', content: 'late first result', call: 'one' },
		{ id: 'N', role: 'assistant', content: 'Order LH-81660 is late.' },
		{ id: 'O1', role: 'tool', content: 'lost result', call: 'missing' },
		{ id: 'O2', role: 'tool', content: 'other lost result' },
	]
}

/**
 * Generates a reply through the real agent loop for a provider.
 *
 * @param provider - The provider to compose
 * @returns The generated content
 */
export async function generateReply(provider: ProviderInterface): Promise<string> {
	const agent = createAgent(provider)
	agent.context.messages.add({ role: 'user', content: 'who are you?' })
	return (await agent.generate()).content
}

/**
 * Splits content into word deltas while retaining each intervening space.
 *
 * @param content - The content to split
 * @returns The first word followed by space-prefixed words
 */
export function splitWordDeltas(content: string): readonly string[] {
	return content.split(' ').map((word, index) => (index === 0 ? word : ` ${word}`))
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
export function createAddTool(): ToolInterface {
	return createTool({ name: 'add', execute: () => 5 })
}

/**
 * Builds the canonical `loop` tool — a REAL {@link ToolInterface} that always returns `'again'`,
 * the tool the iteration-cap / budget / always-tool loop tests repeat. A data builder, not
 * a mock.
 *
 * @returns A working `loop` tool
 */
export function createLoopTool(): ToolInterface {
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
 * Creates a deterministic summarizer that returns the message count and records each slice.
 * Conversation tests use the count to distinguish section compaction from a cap merge.
 *
 * @returns The summarizer and its readonly recorded slices
 */
export function createStubSummarizer(): {
	readonly summarize: ConversationSummaryHandler
	readonly calls: ReadonlyArray<readonly Message[]>
} {
	const recorder = createRecorder<readonly [readonly Message[]]>()
	return {
		get calls() {
			return recorder.calls.map(([messages]) => messages)
		},
		async summarize(messages) {
			recorder.handler(messages)
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
 * // ... conversation, request, and signal setup omitted
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

/** Records how many turn boundaries the `yield` method of a {@link SchedulerInterface} paced. */
export interface RecordingSchedulerInterface extends SchedulerInterface {
	/** How many times `yield` ran — the turn boundaries the loop paced through this scheduler. */
	readonly yields: number
}

/**
 * Creates a scheduler boundary fixture that records successful yields and resolves immediately.
 * An aborted signal rejects with its reason; delay resolves without a timer so loop tests isolate pacing.
 *
 * @returns A scheduler whose yields report successful turn boundaries
 */
export function createRecordingScheduler(): RecordingSchedulerInterface {
	const recorder = createRecorder<readonly []>()
	return {
		get yields() {
			return recorder.count
		},
		async yield(options?: SchedulerOptions) {
			if (options?.signal?.aborted) throw options.signal.reason
			recorder.handler()
		},
		async delay() {},
	}
}

// Store scenarios share this host-independent battery so each backend exercises the same snapshots.

/**
 * Adds three turns (`first`, `second`, `third`) to a conversation and compacts it, so a
 * conversation configured with `keep: 1` folds the oldest two into one summarized section and
 * keeps the last live. {@link buildConversationSnapshot} and {@link seedConversation} share
 * this one copy of the turn data and the fold.
 *
 * @param conversation - The conversation to seed and compact
 * @returns A promise that settles after the compaction
 */
export async function compactSeedTurns(conversation: ConversationInterface): Promise<void> {
	conversation.add([
		{ role: 'user', content: 'first' },
		{ role: 'assistant', content: 'second' },
		{ role: 'user', content: 'third' },
	])
	await conversation.compact()
}

/**
 * Builds a REAL {@link ConversationSnapshot} the way a conversation produces one — three turns
 * added, then a genuine `compact()` folds the oldest two into one summarized section, with the
 * last message kept live (`keep: 1`). So the snapshot is NON-VACUOUS in BOTH the compacted
 * sections AND the live tail. The
 * shared store-test fixture both `{Memory,Database}ConversationStore` twins drive (one
 * builder, not a per-file copy). The deterministic, provider-free summarizer is folded INSIDE
 * (digesting the slice into `recap(<contents>)` — NOT {@link createStubSummarizer}, whose `recap of
 * <n>` digest text differs), so a `compact()` produces a predictable section.
 *
 * @param id - The conversation id (and snapshot key); Default: `'chat'`
 * @returns The settled conversation's snapshot (sections + live tail)
 */
export async function buildConversationSnapshot(id = 'chat'): Promise<ConversationSnapshot> {
	const conversation = createConversation({
		id,
		async summarize(messages) {
			return `recap(${messages.map((message) => message.content).join('|')})`
		},
		keep: 1,
	})
	await compactSeedTurns(conversation)
	return conversation.snapshot()
}

/**
 * Holds tool messages with and without `call` so storage tests cover the member's
 * optionality and preservation.
 */
export const TOOL_SNAPSHOT: ConversationSnapshot = Object.freeze<ConversationSnapshot>({
	id: 'weather',
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

// Every following scenario drives the store operations and returns their plain results. It asserts
// nothing, because no `describe` / `it` / `expect` may enter this module. A consuming suite's own
// `it` block calls the scenario, then asserts on what it returns.

/** Builds a fresh, empty store for one scenario; each twin supplies its own. */
export type ConversationStoreFunction = () => ConversationStoreInterface

/** Builds the snapshot a scenario stores; {@link buildConversationSnapshot} is the shared form. */
export type ConversationSnapshotFunction = (id?: string) => Promise<ConversationSnapshot>

/** Names the literal values a {@link exerciseConversationStoreRoundTrip} result must carry, shared by every twin. */
export interface ConversationStoreRoundTripExpectation {
	readonly section: {
		readonly summary: string
		readonly messages: readonly string[]
	}
	readonly tail: readonly string[]
}

/**
 * Holds the literal values a round trip of `buildConversationSnapshot()` must reproduce — the fold's section
 * summary + retained messages, and the live tail. Shared so both twin suites (and
 * the setup proof) assert the SAME literals rather than each retyping them.
 */
export const CONVERSATION_STORE_ROUND_TRIP_EXPECTATION: ConversationStoreRoundTripExpectation =
	Object.freeze({
		section: Object.freeze({
			summary: 'recap(first|second)',
			messages: Object.freeze(['first', 'second']),
		}),
		tail: Object.freeze(['third']),
	})

/**
 * Drives the round-trip scenario of the shared `ConversationStoreInterface` contract: set a real
 * {@link buildConversationSnapshot} snapshot, then get it back. Returns what was stored and what came
 * back, sections + live tail intact, so the caller's `it` block asserts the equality
 * (and the literals in {@link CONVERSATION_STORE_ROUND_TRIP_EXPECTATION}) itself.
 *
 * @param create - Builds a fresh, empty store (the twin's own factory)
 * @param build - The snapshot builder ({@link buildConversationSnapshot})
 * @returns The stored `snapshot` and the retrieved `got`
 */
export async function exerciseConversationStoreRoundTrip(
	create: ConversationStoreFunction,
	build: ConversationSnapshotFunction,
): Promise<{
	readonly snapshot: ConversationSnapshot
	readonly got: ConversationSnapshot | undefined
}> {
	const store = create()
	const snapshot = await build()
	await store.set(snapshot)
	const got = await store.get(snapshot.id)
	return { snapshot, got }
}

/**
 * Drives the upsert scenario: `set` keys off the snapshot's OWN id (no separate id param), so
 * re-setting the same id REPLACES — insert-or-replace semantics, not an append (one entry, latest
 * wins). Returns the replacement and what `get` reads back, for the caller to assert equal.
 *
 * @param create - Builds a fresh, empty store (the twin's own factory)
 * @param build - The snapshot builder ({@link buildConversationSnapshot})
 * @returns The replacement `second` snapshot and the retrieved `got`
 */
export async function exerciseConversationStoreUpsert(
	create: ConversationStoreFunction,
	build: ConversationSnapshotFunction,
): Promise<{
	readonly second: ConversationSnapshot
	readonly got: ConversationSnapshot | undefined
}> {
	const store = create()
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
 * Drives the delete scenario: set a snapshot, read it back (proving it landed), delete it, then read
 * again — the caller asserts `beforeDelete` is defined and `afterDelete` is `undefined`.
 *
 * @param create - Builds a fresh, empty store (the twin's own factory)
 * @param build - The snapshot builder ({@link buildConversationSnapshot})
 * @returns The snapshot read before and after the delete
 */
export async function exerciseConversationStoreDeleteThenAbsent(
	create: ConversationStoreFunction,
	build: ConversationSnapshotFunction,
): Promise<{
	readonly beforeDelete: ConversationSnapshot | undefined
	readonly afterDelete: ConversationSnapshot | undefined
}> {
	const store = create()
	const snapshot = await build()
	await store.set(snapshot)
	const beforeDelete = await store.get(snapshot.id)
	await store.delete(snapshot.id)
	const afterDelete = await store.get(snapshot.id)
	return { beforeDelete, afterDelete }
}

/**
 * Drives the absent-delete scenario: deleting an id that was never stored — the caller asserts the
 * settled promise resolves `undefined` rather than rejecting (a no-op).
 *
 * @param create - Builds a fresh, empty store (the twin's own factory)
 * @returns The store's own `delete` promise, unsettled
 */
export function exerciseConversationStoreDeleteAbsent(
	create: ConversationStoreFunction,
): Promise<void> {
	return create().delete('never-stored')
}

/**
 * Drives the absent-get scenario: getting an id that was never stored — the caller asserts the result
 * is `undefined`.
 *
 * @param create - Builds a fresh, empty store (the twin's own factory)
 * @returns What `get` resolves for an id the store never saw
 */
export function exerciseConversationStoreGetAbsent(
	create: ConversationStoreFunction,
): Promise<ConversationSnapshot | undefined> {
	return create().get('never-stored')
}

/**
 * Drives the two-ids-coexist scenario: a real durable store holds many conversations, so distinct ids
 * must not clobber each other, and dropping one must leave the other intact. Returns every snapshot
 * and every read, before and after the `alpha` delete, for the caller to assert.
 *
 * @param create - Builds a fresh, empty store (the twin's own factory)
 * @param build - The snapshot builder ({@link buildConversationSnapshot})
 * @returns The two stored snapshots and the reads before/after dropping `alpha`
 */
export async function exerciseConversationStoreTwoIds(
	create: ConversationStoreFunction,
	build: ConversationSnapshotFunction,
): Promise<{
	readonly alpha: ConversationSnapshot
	readonly beta: ConversationSnapshot
	readonly gotAlpha: ConversationSnapshot | undefined
	readonly gotBeta: ConversationSnapshot | undefined
	readonly gotAlphaAfterDelete: ConversationSnapshot | undefined
	readonly gotBetaAfterDelete: ConversationSnapshot | undefined
}> {
	const store = create()
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
 * @param tools - The tools to seed; Default: the canonical {@link createAddTool}
 * @returns A tool manager holding the supplied tools
 */
export function createSeededToolManager(tools?: readonly ToolInterface[]): ToolManagerInterface {
	const manager = new ToolManager()
	manager.add(tools === undefined ? [createAddTool()] : [...tools])
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
 * Pins the messages a provider receives from the first `generate` call of {@link seedFramedAgent},
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

/** Carries the manager-options `open` override that {@link resolveSectionOpen} reads, when one applies. */
export interface SectionOpenOptions {
	readonly manager?: { readonly open?: string }
}

/** Carries the manager-options `render` and the per-item override that {@link resolveSectionRender} reads. */
export interface SectionRenderOptions {
	readonly manager?: { readonly render?: string }
	readonly instruction?: { readonly override?: string }
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
	const managerOpen = options?.manager?.open
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
	const managerRender = options?.manager?.render
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
		...(options?.instruction?.override === undefined
			? {}
			: { override: options.instruction.override }),
	})
	const block = requireValue(context.build()[0]).content
	return requireValue(block.split('\n\n')[1])
}

/**
 * Registers a conversation on a {@link ConversationManagerInterface} and compacts it, so the
 * registered conversation carries a real compacted section and a live tail — a durable `save` /
 * `open` round trip over it is then NON-VACUOUS in every field.
 *
 * @param manager - The manager to register the conversation on (it supplies the summarizer and `keep`)
 * @param id - The conversation id to register
 */
export async function seedConversation(
	manager: ConversationManagerInterface,
	id: string,
): Promise<void> {
	await compactSeedTurns(manager.add({ id }))
}

/** Holds signals recorded by a transport that rejects every request. */
export interface RefusingTransportInterface {
	readonly signals: readonly AbortSignal[]
	readonly fetch: typeof globalThis.fetch
}

/**
 * Builds a transport that records the request signal and rejects without network access.
 *
 * @returns The transport with the signals it recorded
 */
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

/**
 * Builds a transport that enqueues each supplied UTF-8 chunk verbatim and closes.
 *
 * @param chunks - The text chunks the response body delivers, in order
 * @returns A fetch function that answers every request with an NDJSON stream of the chunks
 */
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
 * failure aborts in the turn it throws, so a decoder throw races the abort.
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
	encode(request: ProviderRequest): object {
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

/** Supplies response factories and expected messages for judge protocol refusals. */
export const JUDGE_PROTOCOL_CASES: ReadonlyArray<readonly [() => Response, string]> = Object.freeze(
	[
		Object.freeze<readonly [() => Response, string]>([
			() => new Response(null),
			'judge error: no response body',
		]),
		Object.freeze<readonly [() => Response, string]>([
			() => new Response('{"model":'),
			'judge error: invalid JSON body',
		]),
	],
)

/**
 * Builds each System One answer form with the supplied probability.
 *
 * @param probability - The probability placed in each answer's tested candidate
 * @returns Answers keyed by the recorded request's question ids
 * @example
 * ```ts
 * buildSystemOneProbabilityCases(0.5).refund // { type: 'noul', noul: 0.5 }
 * ```
 */
export function buildSystemOneProbabilityCases(
	probability: unknown,
): Readonly<Record<string, unknown>> {
	return {
		label: { type: 'choice', probabilities: { billing: probability, bug: 0.5, account: 0 } },
		refund: { type: 'noul', noul: probability },
		severity: { type: 'score', probabilities: [0, probability, 0.5] },
	}
}

/**
 * Drives a splitter through a delta sequence and flushes its remaining content.
 *
 * @param splitter - The real splitter whose state is advanced
 * @param deltas - The wire chunks in delivery order
 * @returns The joined content deltas and final flush
 * @example
 * ```ts
 * // ... ThinkSplitter import omitted
 * driveThinkSplitter(new ThinkSplitter(), ['<think>plan</think>answer']) // 'answer'
 * ```
 */
export function driveThinkSplitter(
	splitter: ThinkSplitterInterface,
	deltas: readonly string[],
): string {
	let content = ''
	for (const delta of deltas) content += splitter.split(delta)
	return content + splitter.flush()
}

/** Records byte delivery and cancellation on a real readable stream. */
export class RecordedBody {
	readonly #chunks: readonly Uint8Array[]
	readonly #closed: boolean
	readonly #failure: Error | undefined
	readonly #cancellation: Error | undefined
	readonly stream: ReadableStream<Uint8Array>
	readonly #pending = Promise.withResolvers<void>()
	#index = 0
	#bytes = 0
	#cancelled = false
	#reason: unknown
	constructor(chunks: readonly Uint8Array[], closed = true, failure?: Error, cancellation?: Error) {
		this.#chunks = chunks
		this.#closed = closed
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
		else if (this.#closed) controller.close()
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

/**
 * Rejects a transport with its own abort exception when the supplied signal expires.
 *
 * @param _input - The request target; unread
 * @param init - The request init whose `signal` the rejection waits on
 * @returns A promise rejected with an `AbortError` exception after the signal aborts
 * @throws Error Thrown when `init` carries no signal
 */
export async function rejectTransportOnAbort(
	_input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	await waitForAbort(requireValue(init?.signal))
	throw new DOMException('x', 'AbortError')
}

/**
 * Returns true as an array's own hostile `every`, exposing a guard that trusts the method.
 *
 * @returns True always
 */
export function approveEvery(): boolean {
	return true
}

/**
 * Throws when a hostile proxy field is read.
 *
 * @throws Error Thrown on every call
 */
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

/** Supplies an empty section shared by summary and recap message cases. */
export const CONVERSATION_SECTION: Section = Object.freeze({
	id: 's1',
	summary: 'recap of 2',
	messages: Object.freeze([]),
})

/** Configures the response, real judge factory, and recorded transport for a judge fixture. */
export interface RecordedJudgeOptions {
	readonly response?: unknown
	readonly create?: (options: SystemOneJudgeOptions) => JudgeInterface
	readonly respond?: (transport: RecordedTransport) => Response | Promise<Response>
}

/** Exposes a real judge and the transport that records its requests. */
export interface RecordedJudgeInterface {
	readonly judge: JudgeInterface
	readonly transport: RecordedTransport
}

/**
 * Creates a real System One judge with a recording transport and a customizable response.
 *
 * @param options - The response envelope, judge factory, and response callback
 * @returns The real judge and its recording transport
 * @example
 * ```ts
 * const { judge, transport } = createRecordedJudge()
 * judge.model // 'tev1:0.8b'
 * transport.requests.length // 0
 * ```
 */
export function createRecordedJudge(options: RecordedJudgeOptions = {}): RecordedJudgeInterface {
	const transport: RecordedTransport = new RecordedTransport(() =>
		options.respond === undefined
			? Response.json(options.response === undefined ? SYSTEM_ONE_TEV1 : options.response)
			: options.respond(transport),
	)
	const judge = (options.create ?? createSystemOneJudge)({
		url: 'http://judge.test',
		model: 'tev1:0.8b',
		fetch: transport.fetch,
	})
	return { judge, transport }
}

/**
 * Plants an opaque snapshot row through a real database over the supplied driver.
 *
 * @param driver - The driver shared with the conversation store under test
 * @param row - The row to persist, including malformed or older snapshot shapes
 * @returns A promise that settles after the row is stored and the database closes
 * @example
 * ```ts
 * // ... driver setup omitted
 * await plantConversationRow(driver, { id: 'unreadable', snapshot: { id: 'unreadable' } })
 * ```
 */
export async function plantConversationRow(
	driver: DriverInterface,
	row: ConversationSnapshotRow,
): Promise<void> {
	const database = createDatabase({
		driver,
		tables: { conversations: { id: stringShape(), snapshot: rawShape({}) } },
	})
	try {
		await database.table('conversations').set(row)
	} finally {
		await database.close()
	}
}

/**
 * Drains a provider generator and retains its yielded deltas and terminal value.
 *
 * @param stream - The provider generator to drain
 * @returns Every yielded delta and the generator's returned result
 */
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

/**
 * Records the global fetch receiver while returning a real response without network access.
 *
 * @param input - The request target
 * @param init - The request init
 * @returns A response whose body names the receiver (`c:global` or `c:unbound`) and whose `X-Request` header carries the request method
 */
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

/**
 * Returns the string `domain`; the function itself supplies a non-JSON argument fixture.
 *
 * @returns The string `domain`
 */
export function returnDomain(): string {
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
	/** Holds the controller `read` aborts before it returns, so an abort lands during decoding. */
	readonly abort?: AbortController
}

/**
 * Drives the real judge engine: it posts each call's request as JSON, reads the model and usage
 * from the response envelope, and answers each requested id from its script.
 */
export class ScriptedJudge extends AgentJudge {
	readonly #answers: Readonly<Record<string, JudgeAnswer>>
	readonly #refusals: Readonly<Record<string, Refusal>>
	readonly #refuse: string | undefined
	readonly #abort: AbortController | undefined
	readonly #bodies: JudgeRequest[] = []
	readonly #values: unknown[] = []
	readonly name = 'scripted'
	constructor(options: ScriptedJudgeOptions) {
		super(options)
		this.#answers = options.answers ?? {}
		this.#refusals = options.refusals ?? {}
		this.#refuse = options.refuse
		this.#abort = options.abort
	}
	get bodies(): readonly JudgeRequest[] {
		return this.#bodies
	}
	get values(): readonly unknown[] {
		return this.#values
	}
	encode(request: JudgeRequest): object {
		this.#bodies.push(request)
		if (this.#refuse !== undefined && Object.hasOwn(request.questions, this.#refuse)) {
			throw new JudgeError('QUESTION', `judge error: question ${this.#refuse} is refused`)
		}
		return { model: this.model, state: request.state, questions: request.questions }
	}
	read(value: unknown, request: JudgeRequest): JudgeResult {
		this.#values.push(value)
		this.#abort?.abort()
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

/** Holds the exact Ollama 0.40.0 request recorded on 2026-10-07 for the tev1 label, refund, and severity questions. */
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

/** Holds the HTTP 200 body recorded on 2026-10-07 for {@link SYSTEM_ONE_TEV1_REQUEST}. */
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

/** Holds the exact request recorded on 2026-10-07 for a structured state and one intent question. */
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

/** Holds the HTTP 200 body recorded on 2026-10-07 for {@link SYSTEM_ONE_OBJECT_REQUEST}. */
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

/** Holds the HTTP 400 responses recorded for malformed System One requests and a model without decision support. */
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

/** Holds the quickstart sentence of the System One documentation, recorded on 2026-10-07. */
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

/** Lists the instruction manager events recorded by its tests. */
export const INSTRUCTION_EVENTS = Object.freeze(['add', 'remove', 'clear'] as const)

/** Names an instruction manager event recorded by its tests. */
export type InstructionEventName = (typeof INSTRUCTION_EVENTS)[number]

/** Lists the scope manager events recorded by its tests. */
export const SCOPE_EVENTS = Object.freeze(['create', 'remove', 'clear'] as const)

/** Names a scope manager event recorded by its tests. */
export type ScopeEventName = (typeof SCOPE_EVENTS)[number]

/** Matches a generated handle such as `m12`, `r8`, or `[r8]`, which no helper writes into a text. */
export const LEDGER_HANDLE = /\b[mrp]\d+\b/g

/** Holds the system text of the fictional desk: two names the party prefix must never take. */
export const LEDGER_DESK_SYSTEM =
	'You work the Harbor Lane support desk with Pat Ruiz as shift lead. Today is Thursday 2026-10-08.'

/** Maps each fictional owner of the desk scenario to the names it goes by. */
export const LEDGER_DESK_OWNERS: Readonly<Record<string, readonly string[]>> = Object.freeze({
	'BW-20931': Object.freeze(['Brightwater Studio']),
	'OM-30418': Object.freeze(['Odile Marlow']),
})

/** Carries the parts of a classification as plain collections, which {@link buildLedgerClassification} turns into the projection's maps and sets. */
export interface LedgerClassificationParts {
	readonly quiet?: readonly string[]
	readonly categories?: Readonly<Record<string, LedgerCategory>>
	readonly topics?: Readonly<Record<string, readonly string[]>>
	readonly amendments?: Readonly<Record<string, readonly string[]>>
	readonly supersessions?: Readonly<Record<string, readonly string[]>>
}

/** Carries the parts of a projection input as plain collections, which {@link buildLedgerInput} turns into the projection's maps. */
export interface LedgerInputParts {
	readonly system?: string
	readonly exclusions?: readonly string[]
	readonly owners?: Readonly<Record<string, readonly string[]>>
	readonly messages?: readonly Message[]
	readonly readings?: readonly LedgerLookupReading[]
	readonly entities?: Readonly<Record<string, readonly string[]>>
	readonly classification?: LedgerClassificationParts
}

/**
 * Builds a classification from plain collections.
 *
 * @param parts - The parts to set; an absent part is empty
 * @returns The classification
 */
export function buildLedgerClassification(
	parts: LedgerClassificationParts = {},
): LedgerClassification {
	return {
		quiet: new Set(parts.quiet ?? []),
		categories: new Map(Object.entries(parts.categories ?? {})),
		topics: new Map(Object.entries(parts.topics ?? {})),
		amendments: new Map(Object.entries(parts.amendments ?? {})),
		supersessions: new Map(Object.entries(parts.supersessions ?? {})),
	}
}

/**
 * Builds a projection input from plain collections.
 *
 * @param parts - The parts to set; an absent part is empty
 * @returns The projection input
 */
export function buildLedgerInput(parts: LedgerInputParts = {}): LedgerProjectionInput {
	return {
		system: parts.system ?? '',
		exclusions: parts.exclusions ?? [],
		owners: new Map(Object.entries(parts.owners ?? {})),
		messages: parts.messages ?? [],
		readings: parts.readings ?? [],
		entities: new Map(Object.entries(parts.entities ?? {})),
		classification: buildLedgerClassification(parts.classification),
	}
}

/**
 * Builds a message.
 *
 * @param id - The message id
 * @param role - The message role
 * @param content - The message text
 * @returns The message
 */
export function buildLedgerMessage(id: string, role: Message['role'], content: string): Message {
	return { id, role, content }
}

/**
 * Builds a lookup reading for a tool message.
 *
 * @param id - The tool message id
 * @param name - The lookup tool name
 * @param values - The arguments of the call
 * @param text - The result text
 * @param result - What the handler read; undefined for a lookup that found nothing
 * @returns The reading
 */
export function buildLedgerReading(
	id: string,
	name: string,
	values: Readonly<Record<string, unknown>>,
	text: string,
	result?: LedgerLookupResult,
): LedgerLookupReading {
	return { id, name, arguments: values, text, result }
}

/**
 * Builds the fictional desk scenario: two owners, a rule a correction made stale, a replaced lookup, a quiet message, and an excluded request.
 *
 * @returns A projection input whose build the oracle passes
 */
export function createLedgerDesk(): LedgerProjectionInput {
	const found: LedgerLookupResult = {
		ids: ['BW-5512', 'BW-20931'],
		owners: [],
	}
	return buildLedgerInput({
		system: LEDGER_DESK_SYSTEM,
		exclusions: ['user-06'],
		owners: LEDGER_DESK_OWNERS,
		messages: [
			buildLedgerMessage(
				'user-01',
				'user',
				'Standing rule: any refund over $200 needs a manager code. This week code is MX-4471.',
			),
			buildLedgerMessage(
				'assistant-01',
				'assistant',
				'Understood. Refunds over $200 carry code MX-4471.',
			),
			buildLedgerMessage(
				'user-02',
				'user',
				'The caller is Odile Marlow, owner of account OM-30418. Her order shipped late.',
			),
			buildLedgerMessage(
				'tool-01',
				'tool',
				'Order BW-5512 for account BW-20931 (Brightwater Studio): linen set, total $140.00.',
			),
			buildLedgerMessage(
				'user-03',
				'user',
				'The shift lead is Dana Whitcombe. She approved the refund of $148.50 for order BW-5512.',
			),
			buildLedgerMessage(
				'tool-02',
				'tool',
				'Order BW-5512 for account BW-20931 (Brightwater Studio): linen set, total $148.50.',
			),
			buildLedgerMessage(
				'user-04',
				'user',
				'Correction: the manager code is MX-4486, not MX-4471.',
			),
			buildLedgerMessage('user-05', 'user', 'Thanks, that is all for now.'),
			buildLedgerMessage('user-06', 'user', 'Can you check the refund for Brightwater Studio?'),
		],
		readings: [
			buildLedgerReading(
				'tool-01',
				'lookup_order',
				{ id: 'bw-5512' },
				'Order BW-5512 for account BW-20931 (Brightwater Studio): linen set, total $140.00.',
				found,
			),
			buildLedgerReading(
				'tool-02',
				'lookup_order',
				{ id: ' BW-5512 ' },
				'Order BW-5512 for account BW-20931 (Brightwater Studio): linen set, total $148.50.',
				found,
			),
		],
		entities: {
			'user-02': ['OM-30418'],
			'user-03': ['BW-5512'],
			'tool-01': ['BW-5512', 'BW-20931'],
			'tool-02': ['BW-5512', 'BW-20931'],
		},
		classification: {
			quiet: ['user-05'],
			categories: { 'user-01': 'rule', 'user-04': 'correction' },
			topics: { 'user-01': ['refunds'], 'user-03': ['refunds'] },
			amendments: { 'user-01': ['user-04'] },
		},
	})
}

/**
 * Builds the request that names the desk scenario's Brightwater Studio owner and its refunds topic.
 *
 * @returns The projection request
 */
export function createLedgerRequest(): LedgerProjectionRequest {
	return { owners: ['BW-20931'], topics: ['refunds'] }
}

/**
 * Reverses an iterable into a separate list.
 * @param members - The members to reverse
 * @returns The members in reverse order
 */
export function reverseLedgerMembers<T>(members: Iterable<T>): readonly T[] {
	return [...members].reverse()
}

/**
 * Reverses a map and each member list without changing the input.
 * @param map - The lists keyed by identity
 * @returns The reversed map and lists
 */
export function reverseLedgerMap(
	map: ReadonlyMap<string, readonly string[]>,
): ReadonlyMap<string, readonly string[]> {
	return new Map(
		reverseLedgerMembers(map).map(([key, value]) => [key, reverseLedgerMembers(value)]),
	)
}

/**
 * Reverses the insertion order of every map, set, and list of a projection input.
 *
 * @param input - The input to reverse
 * @returns A copy whose collections hold the same members in the opposite order
 */
export function reverseLedgerInput(input: LedgerProjectionInput): LedgerProjectionInput {
	return {
		...input,
		exclusions: reverseLedgerMembers(input.exclusions),
		owners: reverseLedgerMap(input.owners),
		entities: reverseLedgerMap(input.entities),
		classification: {
			quiet: new Set(reverseLedgerMembers(input.classification.quiet)),
			categories: new Map(reverseLedgerMembers(input.classification.categories)),
			topics: reverseLedgerMap(input.classification.topics),
			amendments: reverseLedgerMap(input.classification.amendments),
			supersessions: reverseLedgerMap(input.classification.supersessions),
		},
	}
}

/**
 * Sorts record keys recursively for the independent lookup oracle.
 * @param value - The JSON-compatible value to order
 * @returns The value with ordered keys
 */
export function sortLedgerKeys(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortLedgerKeys)
	if (typeof value === 'object' && value !== null) {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
				.map(([key, item]) => [key, sortLedgerKeys(item)]),
		)
	}
	return value
}

/**
 * Computes a lookup identity with sorted keys and normalized top-level strings.
 * @param name - The tool name
 * @param values - The arguments to normalize
 * @returns The tool name and canonical arguments
 */
export function computeLedgerIdentity(
	name: string,
	values: Readonly<Record<string, unknown>>,
): string {
	const top = Object.fromEntries(
		Object.entries(values).map(([key, value]) => [
			key,
			isString(value) ? value.trim().toUpperCase() : value,
		]),
	)
	return `${name} ${JSON.stringify(sortLedgerKeys(top))}`
}

/**
 * Lists the owner or rules keys reached through earlier amendment sides.
 * @param id - The message to place
 * @param seen - The visited message ids
 * @param input - The projection input
 * @param earlierSides - The earlier messages for each amending message
 * @param links - The lookup argument links to owners
 * @returns The keys that hold the message
 */
export function listPlacementKeys(
	id: string,
	seen: ReadonlySet<string>,
	input: LedgerProjectionInput,
	earlierSides: ReadonlyMap<string, readonly string[]>,
	links: ReadonlyMap<string, string>,
): ReadonlySet<string> {
	const owners = new Set<string>()
	for (const entity of input.entities.get(id) ?? []) {
		const owner = input.owners.has(entity) ? entity : links.get(entity)
		if (owner !== undefined) owners.add(`owner:${owner}`)
	}
	if (owners.size > 0) return owners
	const sides = (earlierSides.get(id) ?? []).filter((earlier) => !seen.has(earlier))
	if (sides.length > 0) {
		return new Set(
			sides.flatMap((earlier) => [
				...listPlacementKeys(earlier, new Set([...seen, id]), input, earlierSides, links),
			]),
		)
	}
	const category = input.classification.categories.get(id)
	return category === 'rule' || category === 'correction' ? new Set(['rules']) : new Set()
}

/**
 * Checks whether an amending message retains its stale effect.
 * @param id - The amending message id
 * @param input - The classification input
 * @param byId - The message roles by id
 * @param live - The live message ids
 * @param excluded - The excluded message ids
 * @param supersessions - The replaced message ids
 * @returns True if the amender is live or remains effective after replacement; false otherwise
 */
export function hasEffect(
	id: string,
	input: LedgerProjectionInput,
	byId: ReadonlyMap<string, { readonly role: string }>,
	live: ReadonlySet<string>,
	excluded: ReadonlySet<string>,
	supersessions: ReadonlySet<string>,
): boolean {
	const message = byId.get(id)
	return (
		live.has(id) ||
		(message !== undefined &&
			message.role !== 'assistant' &&
			!excluded.has(id) &&
			!input.classification.quiet.has(id) &&
			supersessions.has(id))
	)
}

/**
 * Checks a projection against its input with passes that share only `linkOwners`, `extractTokens`, `splitSentences`, and `collectNames` with `buildRecords` and share no liveness, placement, or staleness pass.
 *
 * @remarks
 * Each fault opens with its check: `verbatim`, `dead`, `coverage`, `placement`, `stale`, `handle`,
 * or `order`. The `order` check rebuilds over the input with every collection reversed and expects
 * the same projection.
 *
 * @param built - The output of `buildRecords`
 * @param input - The input the build read
 * @returns The faults; empty when clean
 */
export function checkLedgerProjection(
	built: LedgerProjection,
	input: LedgerProjectionInput,
): readonly string[] {
	const faults: string[] = []
	const byId = new Map(input.messages.map((message, at) => [message.id, { ...message, at }]))
	const { classification } = input
	const excluded = new Set(input.exclusions)
	const supersessions = new Set(
		[...classification.supersessions].flatMap(([id, laters]) => (laters.length > 0 ? [id] : [])),
	)
	const lookups = new Map(input.readings.map((reading) => [reading.id, reading]))
	const replaced = new Set<string>()
	for (const reading of lookups.values()) {
		for (const later of lookups.values()) {
			const earlierAt = byId.get(reading.id)?.at ?? -1
			const laterAt = byId.get(later.id)?.at ?? -1
			if (
				laterAt > earlierAt &&
				computeLedgerIdentity(later.name, later.arguments) ===
					computeLedgerIdentity(reading.name, reading.arguments)
			) {
				replaced.add(reading.id)
			}
		}
	}
	const live = new Set(
		[...byId.values()]
			.filter(
				(message) =>
					(message.role === 'user' ||
						(message.role === 'tool' &&
							lookups.get(message.id)?.result !== undefined &&
							!replaced.has(message.id))) &&
					!excluded.has(message.id) &&
					!classification.quiet.has(message.id) &&
					!supersessions.has(message.id),
			)
			.map((message) => message.id),
	)
	const staleKeys = new Set(built.stale.map((entry) => `${entry.source} ${entry.sentence}`))
	const lines = built.records.flatMap((record) => record.lines.map((line) => ({ record, line })))

	for (const { record, line } of lines) {
		const sentences = splitSentences(byId.get(line.source)?.content ?? '')
		const prefix = line.party === undefined ? '' : `${line.party}: `
		if (
			!line.text.startsWith(prefix) ||
			line.text.slice(prefix.length) !== sentences[line.sentence]
		) {
			faults.push(
				`verbatim ${record.key}: "${line.text}" is not sentence ${line.sentence} of ${line.source}`,
			)
		}
		if (
			line.party !== undefined &&
			!collectNames(sentences[line.sentence - 1] ?? '').includes(line.party)
		) {
			faults.push(
				`verbatim ${record.key}: party "${line.party}" is absent from the sentence before ${line.source} sentence ${line.sentence}`,
			)
		}
	}

	for (const { record, line } of lines) {
		const tokens = extractTokens(line.text)
		for (const entry of built.stale) {
			if (
				entry.source === line.source &&
				entry.tokens.some((token) => tokens.ids.has(token) || tokens.numbers.has(Number(token)))
			) {
				faults.push(
					`dead ${record.key}: "${line.text}" holds ${entry.tokens.join(', ')}, which stale lists for ${line.source}`,
				)
			}
		}
		const message = byId.get(line.source)
		const reason =
			message === undefined
				? 'missing'
				: message.role === 'assistant'
					? 'assistant'
					: excluded.has(line.source)
						? 'excluded'
						: classification.quiet.has(line.source)
							? 'quiet'
							: supersessions.has(line.source)
								? 'supersessions'
								: replaced.has(line.source)
									? 'replaced'
									: live.has(line.source)
										? undefined
										: 'not live'
		if (reason !== undefined)
			faults.push(`dead ${record.key}: "${line.text}" comes from a ${reason} source ${line.source}`)
	}

	for (const record of built.records) {
		for (const id of record.members) {
			if (!live.has(id)) continue
			for (const [at] of splitSentences(byId.get(id)?.content ?? '').entries()) {
				const lined = record.lines.some((line) => line.source === id && line.sentence === at)
				if (!lined && !staleKeys.has(`${id} ${at}`)) {
					faults.push(`coverage ${record.key}: sentence ${at} of ${id} is neither a line nor stale`)
				}
			}
		}
	}

	const links = linkOwners(input.readings, input.owners)
	const earlierSides = new Map<string, string[]>()
	for (const [earlier, laters] of classification.amendments) {
		for (const later of laters)
			earlierSides.set(later, [...(earlierSides.get(later) ?? []), earlier])
	}
	const placedIn = new Map<string, string[]>()
	for (const record of built.records) {
		for (const id of record.members) placedIn.set(id, [...(placedIn.get(id) ?? []), record.key])
	}
	for (const id of built.orphans) placedIn.set(id, [...(placedIn.get(id) ?? []), 'orphans'])
	for (const id of new Set([...live, ...placedIn.keys()])) {
		const expected = live.has(id)
			? [...listPlacementKeys(id, new Set([id]), input, earlierSides, links)]
			: []
		const want = (expected.length === 0 && live.has(id) ? ['orphans'] : expected).sort().join(', ')
		const got = [...(placedIn.get(id) ?? [])].sort().join(', ')
		if (want !== got) faults.push(`placement ${id}: placed in [${got}], expected [${want}]`)
	}

	const expectedStale: string[] = []
	for (const id of [...live].sort(
		(left, right) => (byId.get(left)?.at ?? 0) - (byId.get(right)?.at ?? 0),
	)) {
		const laters = (classification.amendments.get(id) ?? []).filter((later) =>
			hasEffect(later, input, byId, live, excluded, supersessions),
		)
		if (laters.length === 0) continue
		for (const [at, sentence] of splitSentences(byId.get(id)?.content ?? '').entries()) {
			const own = extractTokens(sentence)
			const shared = new Set<string>()
			for (const later of laters) {
				const other = extractTokens(byId.get(later)?.content ?? '')
				for (const token of own.ids) if (other.ids.has(token)) shared.add(token)
				for (const token of own.numbers) if (other.numbers.has(token)) shared.add(String(token))
			}
			if (shared.size > 0) expectedStale.push(`${id} ${at} ${[...shared].sort().join(',')}`)
		}
	}
	const gotStale = built.stale.map(
		(entry) => `${entry.source} ${entry.sentence} ${[...entry.tokens].sort().join(',')}`,
	)
	if (JSON.stringify(gotStale) !== JSON.stringify(expectedStale)) {
		faults.push(`stale: built [${gotStale.join('; ')}], expected [${expectedStale.join('; ')}]`)
	}

	for (const { record, line } of lines) {
		const own = new Set(byId.get(line.source)?.content.match(LEDGER_HANDLE) ?? [])
		for (const handle of line.text.match(LEDGER_HANDLE) ?? []) {
			if (!own.has(handle))
				faults.push(
					`handle ${record.key}: "${line.text}" holds ${handle}, which ${line.source} lacks`,
				)
		}
	}

	const reversed = canonicalStringify(buildRecords(reverseLedgerInput(input)))
	if (reversed !== canonicalStringify(built)) {
		faults.push('order: the build over reversed collections differs from the build')
	}
	return faults
}

/** Holds the cutoffs shared by fictional ledger scenarios. */
export const LEDGER_DESK_THRESHOLDS: LedgerThreshold = Object.freeze({
	category: 0.7,
	topic: 0.8,
	correction: 0.3,
	amends: 0.8,
	supersedes: 0.8,
})

/** Holds a successful lookup with no ids or owners. */
export const LEDGER_EMPTY_FOUND: LedgerLookupResult = Object.freeze({
	ids: Object.freeze([]),
	owners: Object.freeze([]),
})

/** Holds the measured gauge seed used by arithmetic cases. */
export const LEDGER_GAUGE_SEED: GaugeOptions = Object.freeze({
	scale: 1.1634671320535195,
	overhead: 498,
	capacity: 32768,
})

/**
 * Computes the ledger code thrown by a synchronous construction.
 * @param build - The construction to attempt
 * @returns The ledger code, OTHER for another thrown value, or undefined for success
 */
export function computeLedgerErrorCode(build: () => unknown): string | undefined {
	const error = captureError(build)
	return error === undefined ? undefined : isLedgerError(error) ? error.code : 'OTHER'
}

/**
 * Builds a gauge reading with optional prompt usage.
 * @param estimate - The message estimate
 * @param prompt - The reported prompt usage
 * @param tools - The advertised tool count
 * @returns The gauge call
 */
export function buildGaugeCall(
	estimate: number,
	prompt: number | undefined,
	tools: number,
): GaugeCall {
	return prompt === undefined ? { estimate, tools } : { estimate, prompt, tools }
}

/**
 * Measures the estimate units of a recall listing.
 * @param kept - The retained source lines
 * @returns The estimate including tool framing
 */
export function measureRoom(kept: readonly string[]): number {
	return estimateMessages([{ id: 'recall', role: 'tool', content: kept.join('\n') }])
}

/**
 * Builds a record line for a user sentence.
 * @param source - The message id
 * @param sentence - The sentence index
 * @param text - The sentence text
 * @returns The unprefixed line with no topics
 */
export function buildLedgerLine(source: string, sentence: number, text: string): LedgerLine {
	return { text, source, sentence, topics: [], role: 'user' }
}

/**
 * Replaces one projection record through a supplied transformation.
 * @param built - The projection to copy
 * @param key - The record key to change
 * @param change - The record transformation
 * @returns A projection with the matching record transformed
 */
export function replaceLedgerRecord(
	built: LedgerProjection,
	key: string,
	change: (record: LedgerProjection['records'][number]) => LedgerProjection['records'][number],
): LedgerProjection {
	return {
		...built,
		records: built.records.map((record) => (record.key === key ? change(record) : record)),
	}
}

/**
 * Builds ledger options with a fresh recording judge and fictional account lookup.
 * @param overrides - The fields to replace
 * @returns The configured ledger options
 */
export function buildLedgerOptions(overrides: Partial<LedgerOptions> = {}): LedgerOptions {
	return {
		judge: new RecordingJudge(),
		system: 'Serve the desk.',
		questions: LEDGER_QUESTIONS,
		thresholds: LEDGER_DESK_THRESHOLDS,
		topics: [{ name: 'refunds', criterion: 'Refund amounts' }],
		capacity: 4096,
		gauge: { scale: 1, overhead: 0 },
		lookups: [
			{
				tool: createTool({
					name: 'lookup',
					description: 'Read an owner record.',
					parameters: { type: 'object' },
					execute: (values) =>
						values.id === 'missing'
							? 'No record'
							: 'Account BW-20931: Brightwater Studio. Refund is $148.50.',
				}),
				read: (_values, text) =>
					text === 'No record'
						? undefined
						: { ids: ['BW-20931'], owners: [{ id: 'BW-20931', names: ['Brightwater Studio'] }] },
			},
		],
		...overrides,
	}
}

/**
 * Builds classifier options with a fresh conversation and recording judge.
 * @param overrides - The fields to replace
 * @returns The classifier options
 */
export function buildClassifierOptions(
	overrides: Partial<ClassifierOptions> = {},
): ClassifierOptions {
	return {
		conversation: createConversation(),
		judge: new RecordingJudge(),
		questions: LEDGER_QUESTIONS,
		topics: [],
		thresholds: LEDGER_DESK_THRESHOLDS,
		assign: () => undefined,
		entities: () => new Set(),
		...overrides,
	}
}

/**
 * Builds a System One filing response from a recorded request and an answer selector.
 * @param request - The recorded HTTP request
 * @param answer - The wire answer for each question; omission files each as fact
 * @param usage - The wire token usage
 * @returns The protocol response
 */
export async function buildLedgerResponse(
	request: Request,
	answer: (key: string, question: unknown) => unknown = () => ({
		type: 'choice',
		probabilities: {
			fact: 1,
			rule: 0,
			correction: 0,
			request: 0,
			opinion: 0,
			chatter: 0,
			distractor: 0,
		},
	}),
	usage = { input_tokens: 50, output_tokens: 1 },
): Promise<Response> {
	const body: unknown = await request.json()
	if (!isRecord(body) || !isRecord(body.questions)) throw new Error('invalid request')
	return Response.json({
		model: 'filing',
		answers: Object.fromEntries(
			Object.entries(body.questions).map(([key, question]) => [key, answer(key, question)]),
		),
		usage,
	})
}

/**
 * Creates a judge that records question keys and delegates each answer to a scripted boundary.
 * @param asked - The question-key recorder
 * @param answer - The result or rejection for a request
 * @param model - The model identity
 * @returns The judge fixture
 */
export function createLedgerJudge(
	asked: string[],
	answer: (request: JudgeRequest, count: number) => Promise<JudgeResult>,
	model = 'partial',
): JudgeInterface {
	return {
		id: model,
		name: model,
		model,
		ask: (request) => {
			asked.push(...Object.keys(request.questions))
			return answer(request, asked.length)
		},
	}
}

/**
 * Builds a category judgment whose identity and state match a source message.
 * @param message - The source message
 * @param overrides - The judgment fields to replace
 * @returns The category judgment input
 */
export function buildLedgerJudgment(
	message: Message,
	overrides: Partial<JudgmentInput> = {},
): JudgmentInput {
	return {
		id: JSON.stringify(['category', message.id]),
		question: LEDGER_QUESTIONS.category,
		sources: [message.id],
		state: `${message.role}: ${message.content}`,
		model: 'recording-model',
		answer: { form: 'choice', probabilities: { fact: 1 } },
		...overrides,
	}
}

/**
 * Builds the assistant call and tool result of a seeded lookup exchange.
 * @param content - The result text
 * @param id - The call id
 * @param values - The call arguments
 * @returns The messages to append to a conversation
 */
export function buildLedgerExchange(
	content: string,
	id = 'seed',
	values: Readonly<Record<string, unknown>> = { id: 'BW-20931' },
): readonly MessageInput[] {
	return [
		{ role: 'assistant', content: '', calls: [{ id, name: 'lookup', arguments: values }] },
		{ role: 'tool', call: id, content },
	]
}

/**
 * Creates a phrase-driven judge for deterministic ledger scenarios.
 * @param rules - Text fragments filed as rules
 * @param amenders - Text fragments that approve amendment questions
 * @returns A scripted judge preserving category, topic, and amendment outcomes
 */
export function createPhraseJudge(
	rules: readonly string[],
	amenders: readonly string[] = [],
): JudgeInterface {
	return {
		id: 'scripted',
		name: 'scripted',
		model: 'scripted',
		ask: async (request) => {
			const state = isString(request.state) ? request.state : ''
			const answers: Record<string, JudgeAnswer> = {}
			for (const [id, question] of Object.entries(request.questions)) {
				answers[id] =
					question.form === 'choice'
						? {
								form: 'choice',
								probabilities: rules.some((rule) => state.includes(rule))
									? { rule: 1 }
									: state.includes('Correction')
										? { correction: 1 }
										: { fact: 1 },
							}
						: {
								form: 'noul',
								noul:
									(id.startsWith('["topic"') && state.toLowerCase().includes('refund')) ||
									(id.startsWith('["amends"') &&
										amenders.some((amender) => state.includes(amender)))
										? 0.9
										: 0.1,
							}
			}
			return { model: 'scripted', answers }
		},
	}
}

/** Supplies the refund topic used by ledger guide scenarios. */
export const LEDGER_REFUNDS_TOPIC: LedgerTopic = Object.freeze({
	name: 'refunds',
	criterion: 'refund amounts and approvals',
})
/** Supplies a fictional order lookup and its owner projection. */
export const LEDGER_ORDER_LOOKUP: LedgerLookup = Object.freeze<LedgerLookup>({
	tool: {
		name: 'lookup_order',
		description: 'Read an order by its id.',
		parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
		execute: (args) =>
			`Order ${String(args.id)} for account BW-20931: Brightwater Studio. Refund due $148.50.`,
	},
	read: (args) => ({
		ids: [String(args.id)],
		owners: [{ id: 'BW-20931', names: ['Brightwater Studio'] }],
	}),
})

/**
 * Files a correction with the supplied topic inventory.
 * @param topics - The desk topics shared by the messages
 * @returns The asked pair keys and the expected amendment identity
 */
export async function fileLedgerCorrection(
	topics: readonly LedgerTopic[],
): Promise<{ readonly pairs: readonly string[]; readonly amends: string }> {
	const conversation = createConversation()
	const earlier = conversation.add({
		role: 'user',
		content: 'Refunds over $100 need a manager.',
	})
	const later = conversation.add({
		role: 'user',
		content: 'Correction: refunds need a manager over $250.',
	})
	const classifier = new Classifier({
		conversation,
		judge: createPhraseJudge(['Refunds over']),
		questions: LEDGER_QUESTIONS,
		topics,
		thresholds: LEDGER_DESK_THRESHOLDS,
		assign: () => undefined,
		entities: () => new Set(),
	})
	const filed = await classifier.classify(new Set(), AbortSignal.timeout(30_000))
	return {
		pairs: filed.judgments.filter(
			(key) => key.startsWith('["amends"') || key.startsWith('["supersedes"'),
		),
		amends: JSON.stringify(['amends', earlier.id, later.id]),
	}
}
/**
 * Plans a ledger prompt from a fixed delivery history.
 * @param capacity - The context capacity
 * @param predict - The optional generation cap
 * @returns The roles and content sent to the provider
 */
export async function planLedgerDelivery(
	capacity: number,
	predict?: number,
): Promise<ReadonlyArray<readonly string[]>> {
	const provider = createScriptedProvider([{ content: 'Done.' }], { recorded: true })
	const ledger = createLedger(
		provider,
		buildGuideLedgerOptions({
			judge: createPhraseJudge([]),
			capacity,
			...(predict === undefined ? {} : { predict }),
			gauge: { scale: 1, overhead: 0 },
		}),
	)
	ledger.conversation.add(
		Array.from({ length: 40 }, (_unused, at): MessageInput => ({
			role: 'user',
			content: `Delivery ${at} arrived Tuesday with a completed receipt.`,
		})),
	)
	await ledger.respond('Review the desk.')
	return requireValue(provider.calls[0], 'Missing first call').messages.map(({ role, content }) => [
		role,
		content,
	])
}
/** Lists briefing fragments in their removal order. */
export const LEDGER_BRIEFING_MARKERS = Object.freeze([
	'Keep the loading dock at warehouse 42 clear.',
	'The Northgate courier brings refund forms on 2026-10-12.',
	'Refunds over $100 need a manager.',
	'Refund due $148.50.',
	'Order BW-5512 for account BW-20931: Brightwater Studio.',
])

/**
 * Builds a desk briefing at a supplied capacity.
 * @param capacity - The context capacity
 * @returns The retained briefing fragments in removal order
 */
export async function briefLedgerDesk(capacity: number): Promise<readonly string[]> {
	const provider = createScriptedProvider([{ content: 'Done.' }], { recorded: true })
	const ledger = createLedger(
		provider,
		buildGuideLedgerOptions({
			judge: createPhraseJudge(['Keep the loading', 'Refunds over']),
			capacity,
			gauge: { scale: 1, overhead: 0 },
			share: { prompt: 1, tail: 0.05 },
			lookups: [LEDGER_ORDER_LOOKUP],
		}),
	)
	ledger.conversation.add([
		{ role: 'user', content: 'Keep the loading dock at warehouse 42 clear.' },
		{ role: 'user', content: 'Refunds over $100 need a manager.' },
		{ role: 'user', content: 'The Northgate courier brings refund forms on 2026-10-12.' },
		{
			role: 'assistant',
			content: '',
			calls: [{ id: 'seed', name: 'lookup_order', arguments: { id: 'BW-5512' } }],
		},
		{
			role: 'tool',
			call: 'seed',
			content: 'Order BW-5512 for account BW-20931: Brightwater Studio. Refund due $148.50.',
		},
	])
	await ledger.respond('Does the Brightwater Studio refund need a manager?')
	const system = requireValue(provider.calls[0]?.messages[0], 'Missing system message').content
	return LEDGER_BRIEFING_MARKERS.filter((marker) => system.includes(marker))
}
/** Supplies the original amended rule. */
export const LEDGER_AMENDED_RULE = 'Refunds for Brightwater Studio need a manager. Use code AA-10.'
/** Supplies the original desk statement. */
export const LEDGER_AMENDED_STATEMENT = 'Refund forms go to the Northgate desk.'
/** Supplies the later correction. */
export const LEDGER_AMENDED_CORRECTION =
	'Correction: Brightwater Studio uses code AA-12 in place of AA-10.'
/** Supplies the seeded order lookup text. */
export const LEDGER_AMENDED_READING =
	'Order BW-5512 for account BW-20931: Brightwater Studio. Refund due $148.50.'
/**
 * Serves a request that recalls a desk topic and its amended owner record.
 * @returns The pass result and each recorded provider prompt
 */
export async function serveAmendedDesk(): Promise<{
	readonly result: LedgerResult
	readonly prompts: ReadonlyArray<readonly Message[]>
}> {
	const provider = createScriptedProvider(
		[
			{ content: '', tools: [{ id: 'desk', name: 'recall', arguments: { topic: 'refunds' } }] },
			{
				content: '',
				tools: [{ id: 'owner', name: 'recall', arguments: { topic: 'Brightwater' } }],
			},
			{ content: '' },
			{ content: 'Use code AA-12.' },
		],
		{ recorded: true },
	)
	const ledger = createLedger(
		provider,
		buildGuideLedgerOptions({
			judge: createPhraseJudge(['Refunds for'], ['uses code AA-12']),
			capacity: 32_768,
			gauge: { scale: 1, overhead: 0 },
			lookups: [LEDGER_ORDER_LOOKUP],
		}),
	)
	ledger.conversation.add([
		{
			role: 'assistant',
			content: '',
			calls: [{ id: 'seed', name: 'lookup_order', arguments: { id: 'BW-5512' } }],
		},
		{ role: 'tool', call: 'seed', content: LEDGER_AMENDED_READING },
		{ role: 'user', content: LEDGER_AMENDED_RULE },
		{ role: 'assistant', content: LEDGER_AMENDED_STATEMENT },
		{ role: 'user', content: LEDGER_AMENDED_CORRECTION },
	])
	const result = await ledger.respond('Review the Brightwater Studio refund.')
	return { result, prompts: provider.calls.map(({ messages }) => messages) }
}

/**
 * Files an amendment with a supplied supersession probability.
 * @param correction - The later message text
 * @param supersedes - The scripted supersession probability
 * @returns Whether the earlier message is amended and superseded
 */
export async function classifyLedgerCorrection(
	correction: string,
	supersedes: number,
): Promise<{ readonly amendments: boolean; readonly supersessions: boolean }> {
	const conversation = createConversation()
	const earlier = conversation.add({
		role: 'user',
		content: 'Refunds over $100 need a manager.',
	})
	conversation.add({ role: 'user', content: correction })
	const classifier = new Classifier({
		conversation,
		judge: createLedgerJudge(
			[],
			async (request) => {
				const state = isString(request.state) ? request.state : ''
				const answers: Record<string, JudgeAnswer> = {}
				for (const [id, question] of Object.entries(request.questions))
					answers[id] =
						question.form === 'choice'
							? {
									form: 'choice',
									probabilities: state.includes('Correction') ? { correction: 1 } : { rule: 1 },
								}
							: {
									form: 'noul',
									noul: id.startsWith('["supersedes"')
										? supersedes
										: id.startsWith('["amends"') ||
											  (id.startsWith('["topic"') && state.toLowerCase().includes('refund'))
											? 0.9
											: 0.1,
								}
				return { model: 'scripted', answers }
			},
			'scripted',
		),
		questions: LEDGER_QUESTIONS,
		topics: [LEDGER_REFUNDS_TOPIC],
		thresholds: LEDGER_DESK_THRESHOLDS,
		assign: () => undefined,
		entities: () => new Set(),
	})
	await classifier.classify(new Set(), AbortSignal.timeout(30_000))
	const filing = classifier.classification()
	return {
		amendments: filing.amendments.has(earlier.id),
		supersessions: filing.supersessions.has(earlier.id),
	}
}
/**
 * Executes a tool turn under a thinking replay policy.
 * @param replay - The provider replay policy; omission uses the agent default
 * @returns The result, retained thinking, measured prompts, and transmitted prompts
 */
export async function exerciseThinkingReplay(replay: ThinkingReplay | undefined): Promise<{
	readonly result: AgentResult
	readonly recorded: readonly string[]
	readonly sent: ReadonlyArray<readonly string[]>
	readonly measured: ReadonlyArray<readonly Message[]>
	readonly wire: ReadonlyArray<readonly Message[]>
}> {
	const measured = createRecorder<readonly [readonly Message[]]>()
	const replies: ProviderResult[] = [
		{
			content: '',
			thinking: 'Refund through the order tool.',
			tools: [{ id: 'call-1', name: 'refund_order', arguments: { id: 'BW-5512' } }],
		},
		{ content: 'Refunded $148.50.', thinking: 'Report the amount.' },
	]
	const provider = createScriptedProvider(replies, {
		recorded: true,
		repeat: false,
		...(replay === undefined ? {} : { replay }),
	})
	const tools = createToolManager()
	tools.add(createTool({ name: 'refund_order', execute: () => 'Refunded $148.50.' }))
	const conversations = createConversationManager({
		summarize: createStubSummarizer().summarize,
	})
	conversations.add()
	const agent = createAgent(provider, {
		tools,
		conversations,
		window: createBudget({
			max: 1_000_000,
			consumer: (messages: readonly Message[]) => {
				measured.handler([...messages])
				return estimateMessages(messages)
			},
		}),
	})
	agent.context.messages.add([
		{ role: 'user', content: 'Is order BW-5512 refundable?' },
		{
			role: 'assistant',
			content: 'Yes, within 30 days.',
			thinking: 'The window is 30 days.',
		},
		{ role: 'user', content: 'Refund it.' },
	])
	const result = await agent.generate()
	return {
		result,
		recorded: collectMessageThinking(agent.context.messages.messages()),
		sent: provider.calls.map(({ messages }) => collectMessageThinking(messages)),
		measured: measured.calls.map(([messages]) => messages),
		wire: provider.calls.map(({ messages }) => messages),
	}
}
/**
 * Collects the reasoning stored in messages in conversation order.
 * @param messages - The messages to read
 * @returns Every present reasoning string
 */
export function collectMessageThinking(messages: readonly Message[]): readonly string[] {
	return messages.flatMap((message) => (message.thinking === undefined ? [] : [message.thinking]))
}

/**
 * Creates a relay provider connected to a real byte-limited handler.
 * @param upstream - The provider the handler drives
 * @param limit - The request body byte limit
 * @returns The provider driving the handler through Fetch objects
 */
export function createBoundedRelay(upstream: ProviderInterface, limit: number): RelayProvider {
	return createRelayProvider({
		url: 'https://app.example/relay',
		parser: createParser,
		fetch: (input, init) =>
			createRelay({ provider: upstream, authorize: () => true, limit })(new Request(input, init)),
	})
}
/**
 * Builds options for the guide desk with no lookups unless supplied.
 * @param overrides - The scenario-specific options
 * @returns Fresh ledger options using the shared desk topic and thresholds
 */
export function buildGuideLedgerOptions(overrides: Partial<LedgerOptions> = {}): LedgerOptions {
	return buildLedgerOptions({
		judge: createPhraseJudge([]),
		topics: [LEDGER_REFUNDS_TOPIC],
		capacity: 32_768,
		lookups: [],
		...overrides,
	})
}

/** Supplies invalid complete relay records for the documented strict parser. */
export const RELAY_INVALID_RECORDS = Object.freeze(['invalid\n', '[]\n', 'null\n'])

/** Supplies the ledger overhead cases scenario inputs. */
export const LEDGER_OVERHEAD_CASES = Object.freeze([0, 200])

/** Supplies the ledger thinking cases scenario inputs. */
export const LEDGER_THINKING_CASES = Object.freeze([true, false, undefined])

/** Supplies the ledger refund amounts scenario inputs. */
export const LEDGER_REFUND_AMOUNTS = Object.freeze([120, 135, 150])

/** Supplies the thinking replay cases scenario inputs. */
export const THINKING_REPLAY_CASES: ReadonlyArray<ThinkingReplay | undefined> = Object.freeze([
	undefined,
	'none',
	'turn',
	'all',
])

/** Supplies the ledger recorded thinking scenario inputs. */
export const LEDGER_RECORDED_THINKING = Object.freeze([undefined, 'a'.repeat(800)])

/** Supplies the relay replay cases scenario inputs. */
export const RELAY_REPLAY_CASES: readonly ThinkingReplay[] = Object.freeze(['all', 'turn', 'none'])

/** Supplies the guide classifier readings scenario inputs. */
export const GUIDE_CLASSIFIER_READINGS = Object.freeze([
	'filed.judgments.length // 2 — the category question and the refunds topic question',
	"classifier.category(rule.id) // 'rule'",
	'classifier.decisive(rule.id) // true',
	'classifier.quiet(rule.id) // false',
	"classifier.topics(rule.id) // Set { 'refunds' }",
	"classifier.classification().categories.get(rule.id) // 'rule'",
	'gauge.rate(calls) // 1.25 — the scale, because no two calls with one tool count are observed',
	"gauge.remainder(calls) // 32098 — the capacity less the last call's prompt and completion",
	"gauge.reserve(calls, '') // 36.25 — an empty reply and one recall call, priced at the rate",
	"gauge.room(calls, '') // 12824.7 — half of what is left beyond the reserve, in estimate units",
	"gauge.scale // 1.3 — the first call's prompt less the overhead cost, over its estimate",
])

/** Supplies the guide replay readings scenario inputs. */
export const GUIDE_REPLAY_READINGS = Object.freeze([
	"content: 'Yes, within 30 days.',",
	"thinking: 'The window is 30 days.',",
	"calls: [{ id: 'call-1', name: 'refund_order', arguments: { id: 'BW-5512' } }],",
	"thinking: 'Refund through the order tool.',",
	"none.filter((message) => 'thinking' in message).length // 0 — no thinking goes back",
	"turn.filter((message) => 'thinking' in message).map(({ id }) => id) // ['4'] — the turn in progress",
])

/** Supplies the guide replay claims scenario inputs. */
export const GUIDE_REPLAY_CLAIMS = Object.freeze([
	"The agent loop records each call's non-empty thinking as the `thinking` member of the assistant message that call appends, on a tool-call turn and on the final answer alike.",
	"`estimateMessages` counts a message's `thinking`, so the `window` budget counts the thinking the request carries and no other.",
	'It is the default. Under it, the agent loop and a relay send the same messages they would send if no thinking were recorded; a ledger still reads recorded thinking to measure what a call left.',
])

/** Supplies complete and incomplete System One model and usage envelopes. */
export const SYSTEM_ONE_USAGE_CASES = Object.freeze([
	{ ...SYSTEM_ONE_TEV1, model: 'gateway/tev1:0.8b' },
	{ answers: SYSTEM_ONE_TEV1.answers, usage: SYSTEM_ONE_TEV1.usage },
	{ ...SYSTEM_ONE_TEV1, usage: { input_tokens: 975, output_tokens: null } },
	{ ...SYSTEM_ONE_TEV1, usage: { input_tokens: -1, output_tokens: 4 } },
	{ model: 'tev1:0.8b', answers: SYSTEM_ONE_TEV1.answers },
])

/** Supplies the system one model cases scenario inputs. */
export const SYSTEM_ONE_MODEL_CASES = Object.freeze([
	SYSTEM_ONE_TEV1,
	SYSTEM_ONE_LLAMA,
	SYSTEM_ONE_MICA,
])

/** Carries the independent lookup stubs that straddle the tail allowance. */
export interface LedgerTailScenario {
	readonly request: Message
	readonly seed: readonly Message[]
	readonly boundaries: readonly [Message, Message]
}

/**
 * Builds fresh hidden and shown lookup stubs with their request and seed call.
 * @returns The scenario's messages and ordered stub variants
 */
export function buildLedgerTailScenario(): LedgerTailScenario {
	const request: Message = { id: 'request', role: 'user', content: 'Check BW-5512.' }
	const seed: readonly Message[] = [
		{ id: 'seed', role: 'user', content: 'Read the order.' },
		{
			id: 'leader',
			role: 'assistant',
			content: '',
			calls: [{ id: 'c1', name: 'lookup_order', arguments: { id: 'BW-5512' } }],
		},
	]
	const hidden: Message = {
		id: 'result',
		role: 'tool',
		call: 'c1',
		content: renderStub('lookup_order', { id: 'BW-5512' }, 'hidden'),
	}
	const shown: Message = {
		...hidden,
		content: renderStub('lookup_order', { id: 'BW-5512' }, 'shown'),
	}
	return { request, seed, boundaries: [hidden, shown] }
}

/** Supplies the messages for refused, deterministic, and transient judge failures. */
export const LEDGER_FAILURE_MESSAGES: readonly [string, string, string] = Object.freeze([
	'Refunds over $100 need a manager.',
	'Keep the loading dock at warehouse 42 clear.',
	'The Northgate courier arrives on Tuesday.',
])
