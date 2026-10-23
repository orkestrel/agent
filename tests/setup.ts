import type { LedgerPlanReceipt, LedgerSelectionReceipt } from '@src/core'
import type {
	LedgerLookup,
	LedgerInterface,
	LedgerTopic,
	LedgerResult,
	LedgerGauge,
	RelayOptions,
	RelayProviderOptions,
} from '@src/core'
import {
	Classifier,
	createLedger,
	createRelay,
	LEDGER_NOTES,
	RelayProvider,
	renderStub,
} from '@src/core'
import { createBudget } from '@orkestrel/budget'
import type {
	AgentResult,
	AgentRegistryInterface,
	AgentTurn,
	AuthorityContext,
	ChannelInterface,
} from '@src/core'
import type {
	ClassifierOptions,
	ClassifierOutcome,
	ClassifierPhase,
	ClassifierReading,
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
	MessageMeasure,
	MessageRole,
	RequestMeasure,
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
import type { BudgetInterface, TokenUsage } from '@orkestrel/budget'
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
	estimateRequest,
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

/** Supplies cut-free and fully cut capacities for composition controls. */
export const LEDGER_RECEIPT_CAPACITIES: readonly number[] = Object.freeze([20000, 1])

/** Supplies a pinned protocol, replaceable seed context, and exchanges spanning a recent tail. */
export const LEDGER_TAIL_FIXTURE = Object.freeze({
	seed: Object.freeze<MessageInput[]>([
		{ role: 'user', content: 'Standing protocol: keep the approval record.' },
		{ role: 'user', content: 'The day is Monday. '.repeat(5) },
		{ role: 'user', content: 'The old case is closed. '.repeat(5) },
	]),
	goals: Object.freeze(['Review BW-20931.', 'Continue the review.', 'Finish the review.']),
	turns: Object.freeze<ScriptedTurn[]>([
		{ content: '', tools: [{ id: 'read', name: 'lookup', arguments: { id: 'BW-20931' } }] },
		{ content: 'The first review is complete.' },
		{ content: 'The second review carries the recent details. '.repeat(8) },
		{ content: 'The final review is complete.' },
	]),
	capacity: 1600,
	share: Object.freeze({ prompt: 1, tail: 0.12 }),
	pressure: Object.freeze<MessageInput[]>([
		{ role: 'user', content: 'Standing protocol: '.repeat(80) },
		{ role: 'user', content: 'Standing protocol: '.repeat(80) },
		{ role: 'user', content: 'Refunds over $100 need a manager.' },
	]),
})

/**
 * Serializes provider and judge requests with conversation-local identities replaced in order.
 * @param ledger - The ledger that owns the message identities
 * @param calls - The recorded provider calls
 * @param judges - The recorded judge requests
 * @returns The complete request transcript, preserving all non-identity bytes
 */
export function serializeLedgerRequests(
	ledger: LedgerInterface,
	calls: readonly ScriptedCall[],
	judges: readonly JudgeRequest[],
): string {
	const identities = [
		...new Set([
			...ledger.conversation.messages().map((message) => message.id),
			...calls.flatMap((call) => call.messages.map((message) => message.id)),
		]),
	]
	return identities.reduce(
		(text, id, position) => text.replaceAll(id, `@message:${position}`),
		JSON.stringify({ providers: calls.map(readCallRequest), judges }),
	)
}

/**
 * Drives the recent-tail fixture through the real ledger and records every request and result.
 * @param options - The options to override
 * @param count - The request prefix to execute
 * @returns The ledger, seed, recorded calls, results, and normalized request transcript
 */
export async function observeLedgerTail(
	options: Partial<LedgerOptions> = {},
	count = LEDGER_TAIL_FIXTURE.goals.length,
): Promise<{
	readonly ledger: LedgerInterface
	readonly seed: readonly Message[]
	readonly calls: readonly ScriptedCall[]
	readonly results: readonly LedgerResult[]
	readonly transcript: string
}> {
	const fixture = LEDGER_TAIL_FIXTURE
	const provider = createScriptedProvider(fixture.turns, { recorded: true, repeat: false })
	const judge = new RecordingJudge()
	const ledger = createLedger(
		provider,
		buildLedgerOptions({
			judge,
			capacity: fixture.capacity,
			share: fixture.share,
			...options,
		}),
	)
	const seed = ledger.conversation.add(fixture.seed)
	const results: LedgerResult[] = []
	for (const goal of fixture.goals.slice(0, count)) results.push(await ledger.respond(goal))
	return {
		ledger,
		seed,
		calls: provider.calls,
		results,
		transcript: serializeLedgerRequests(ledger, provider.calls, judge.requests),
	}
}

/** Drives stored source content through recall and its answer pass. */
export async function observeLedgerRecall(
	query: string,
	contents: readonly string[],
	lexical: boolean | undefined,
	options: Partial<LedgerOptions> = {},
): Promise<{ readonly result: string | undefined; readonly note: string | undefined }> {
	const provider = createScriptedProvider(
		[
			{ content: '', tools: [{ id: 'recall', name: 'recall', arguments: { topic: query } }] },
			{ content: '' },
			{ content: 'Done.' },
		],
		{ recorded: true },
	)
	const ledger = createLedger(
		provider,
		buildLedgerOptions({
			...(lexical === undefined ? {} : { lexical }),
			lookups: [],
			share: { tail: 0.001 },
			...options,
		}),
	)
	ledger.conversation.add(contents.map((content): MessageInput => ({ role: 'user', content })))
	await ledger.respond('Review.')
	return {
		result: provider.calls[1]?.messages.findLast((message) => message.role === 'tool')?.content,
		note: ledger.conversation
			.messages()
			.find((message) => message.content.startsWith(LEDGER_NOTES.results))?.content,
	}
}

/** Supplies cut suffix recognition cases for each ranking option. */
export const LEDGER_CUT_MATCHES = Object.freeze([
	{ line: '1 item not shown; add a topic', ranked: false, matched: false },
	{ line: '2 items not shown; add a topic', ranked: false, matched: false },
	{ line: '1 older item not shown; add a topic', ranked: false, matched: true },
	{ line: '2 older items not shown; add a topic', ranked: false, matched: true },
	{ line: '1 item not shown; add a topic', ranked: true, matched: true },
	{ line: '2 items not shown; add a topic', ranked: true, matched: true },
	{ line: '1 older item not shown; add a topic', ranked: true, matched: false },
	{ line: '2 older items not shown; add a topic', ranked: true, matched: false },
])

/** Supplies a ranked recall source whose older wording must survive a generated neutral cut. */
export const LEDGER_CUT_RECALL = Object.freeze({
	source: `2 older items not shown; amber stock remains.\n${'amber '.repeat(200)}10`,
	other: 'amber 20',
})

/** Supplies independent BM25 examples with occurrence lengths and document frequencies. */
export const LEDGER_LEXICAL_NUMBERS = Object.freeze({
	texts: Object.freeze(['amber amber blue', 'blue']),
	query: 'amber',
	expected: (88 / 73) * Math.log(2),
	unicode: 'ÉLODIE, élodie! 42—42; blue.',
	// N=2, df(élodie)=df(42)=1, L=5, avgL=3: each term contributes 22/19 * ln(2).
	unicodeScore: (44 / 19) * Math.log(2),
})

/** Supplies the lexical rank boundary and the unchanged priority ranks. */
export const LEDGER_LEXICAL_RANKS = Object.freeze([
	{ group: 4, unsettled: false, category: 'fact', expected: -1 },
	{ group: 4, unsettled: true, category: 'rule', expected: -1 },
	{ group: 3, unsettled: true, category: 'rule', expected: 0 },
	{ group: 1, unsettled: true, category: 'fact', expected: 1 },
	{ group: 2, unsettled: false, category: 'correction', expected: 2 },
	{ group: 2, unsettled: false, category: 'rule', expected: 3 },
	{ group: 1, unsettled: false, category: 'fact', expected: 4 },
] as const)

/** Supplies equal-length floor inputs and a shorter corpus that puts the candidate below it. */
export const LEDGER_LEXICAL_DISCOVERY = Object.freeze([
	{ query: 'amber', filler: 'green green green', selected: true },
	{ query: 'amber', filler: 'green green', selected: false },
	{ query: 'violet', filler: 'green green green', selected: false },
	{ query: '???', filler: 'green green green', selected: false },
] as const)

/** Supplies discovery sources in conversation order and their independently specified score order. */
export const LEDGER_LEXICAL_ORDER = Object.freeze({
	sources: Object.freeze(['amber 10', 'amber amber 20', 'amber 30']),
	ordered: Object.freeze(['amber amber 20', 'amber 10', 'amber 30']),
})

/** Supplies call-free background messages outside every lexical candidate group. */
export const LEDGER_LEXICAL_PADDING: readonly MessageInput[] = Object.freeze(
	Array.from({ length: 8 }, (): MessageInput => ({ role: 'user', content: 'blue green violet' })),
)

/** Supplies complete recall entries for ranked truncation. */
export const LEDGER_LEXICAL_ENTRIES = Object.freeze([
	'amber root\namendment',
	'blue root',
	'green root',
])

/** Supplies recall roots and the keyed-first, score-first, newest-tie listing. */
export const LEDGER_LEXICAL_RECALL = Object.freeze({
	sources: Object.freeze([
		'amber amber 10',
		'amber 20',
		'amber 30',
		'violet 40',
		'Desk anchor 70.',
	]),
	query: 'refunds, amber',
	ordered: Object.freeze(['Desk anchor 70.', 'amber amber 10', 'amber 30', 'amber 20']),
})

/** Supplies explicit off, omitted, and enabled arms for byte captures. */
export const LEDGER_LEXICAL_ARMS = Object.freeze([false, undefined, true])

/** Supplies owners whose lookup contents have deliberately opposed lexical scores. */
export const LEDGER_LEXICAL_OWNERS = Object.freeze([
	{
		id: 'BW-20931',
		names: Object.freeze(['Brightwater Studio']),
		text: 'Account BW-20931: Brightwater Studio.',
	},
	{
		id: 'LH-81660',
		names: Object.freeze(['Lighthouse Studio']),
		text: `Account LH-81660: Lighthouse Studio. ${'amber '.repeat(30)}`,
	},
])

/** Supplies a discovery source larger than the room beside an off-topic rule. */
export const LEDGER_LEXICAL_ROOM = Object.freeze({
	source: `${'amber '.repeat(50)}10`,
	rule: 'Keep warehouse 42 clear.',
	filler: 'blue green violet '.repeat(25),
})

/** Supplies long call-free background messages for discovery and amendment room proofs. */
export const LEDGER_LEXICAL_LONG_PADDING: readonly MessageInput[] = Object.freeze(
	Array.from({ length: 8 }, (): MessageInput => ({
		role: 'user',
		content: LEDGER_LEXICAL_ROOM.filler,
	})),
)

/** Supplies matching and nonmatching amenders for whole-entry ranked cuts. */
export const LEDGER_LEXICAL_AMENDMENTS = Object.freeze({
	source: 'amber amber amber 10. Code AA-10.',
	other: 'amber 20.',
	cases: Object.freeze([
		{ correction: 'Replace AA-10 with AA-11.', matching: false },
		{ correction: 'amber replaces AA-10 with AA-11.', matching: true },
	]),
})

/** Supplies planning groups with decisive precedence, score keys, and conversation ties. */
export const LEDGER_LEXICAL_GROUPS = Object.freeze({
	padding: Object.freeze(
		Array.from({ length: 12 }, (): MessageInput => ({
			role: 'user',
			content: 'blue green violet',
		})),
	),
	sources: Object.freeze([
		'amber 40.',
		'For Mira, amber 31.',
		'refund amber 13.',
		'refund amber 11.',
		'refund amber amber 12.',
		'For Mira, amber amber 32.',
	]),
	unsettled: Object.freeze([2, 4]),
	order: Object.freeze([3, 2, 4, 1, 5, 0]),
})

/** Supplies tied keyed sources whose length normalization reverses their cut keys under pressure. */
export const LEDGER_LEXICAL_KEYED_CUT = Object.freeze({
	sources: Object.freeze([`refund 10 ${'blue '.repeat(24)}ends.`, 'refund 20.']),
	query: 'refund',
	capacity: 56,
})

/** Carries an empty successful plan for request lifecycle controls. */
export const LEDGER_EMPTY_PLAN: LedgerPlanReceipt = Object.freeze({
	owners: [],
	filed: [],
	rendered: [],
	sentences: [],
	omitted: [],
	trims: 0,
	withdrawn: [],
})

/** Carries an adoption without planning facts for pass lifecycle controls. */
export const LEDGER_EMPTY_RECEIPT: LedgerSelectionReceipt = Object.freeze({
	turn: undefined,
	tail: [],
	prior: [],
	plan: undefined,
	sources: [],
})

/** Supplies composition facts that distinguish carriage precedence from tail membership. */
export const LEDGER_CARRIAGE_PLAN: LedgerPlanReceipt = Object.freeze({
	owners: [],
	filed: [],
	rendered: ['recap', 'whole', 'partial', 'record'],
	sentences: [],
	omitted: ['whole', 'cut', 'absent'],
	trims: 1,
	withdrawn: [],
})

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

/**
 * Measures only the messages of a request, a custom window policy that ignores the advertised
 * tools and the per-call options. Tests that pin message-only arithmetic select it explicitly,
 * while the default window consumer is `estimateRequest`.
 *
 * @param request - The complete provider request a window measures
 * @returns The `estimateMessages` estimate of its messages
 */
export function measureMessages(request: ProviderRequest): number {
	return estimateMessages(request.messages)
}

/** Supplies the five-character user message the request estimate and measure cases share: content 2 and framing 4. */
export const REQUEST_HELLO: Message = Object.freeze<Message>({
	id: 'm',
	role: 'user',
	content: 'hello',
})

/** Supplies the forty-character user message the request estimate and measure cases share: content 10 and framing 4. */
export const REQUEST_LONG: Message = Object.freeze<Message>({
	id: 'n',
	role: 'user',
	content: 'a'.repeat(40),
})

/** Supplies the described tool with an object parameter schema the request estimate and measure cases advertise. */
export const REQUEST_ADD: ToolDefinition = Object.freeze<ToolDefinition>({
	name: 'add',
	description: 'Adds.',
	parameters: { type: 'object' },
})

/**
 * Supplies request estimates counted by hand. The message term is `hello` at 2 tokens plus 4 of
 * framing, so 6, and 40 characters at 10 plus 4, so 14. A tool list renders as JSON and costs the
 * ceiling of its character count over 4: `[{"name":"lookup"}]` is 19 characters, so 5, and the
 * `add` definition renders to 69 characters, so 18. A schema renders the same way:
 * `{"type":"object"}` is 17 characters, so 5, and `{"type":"object","required":["a"]}` is 34, so 9.
 * An empty tool list, an empty schema, and `think` add nothing.
 */
export const REQUEST_ESTIMATE_CASES: ReadonlyArray<{
	readonly label: string
	readonly request: ProviderRequest
	readonly expected: number
}> = Object.freeze([
	{ label: 'messages alone', request: { messages: [REQUEST_HELLO] }, expected: 6 },
	{
		label: 'several messages unchanged',
		request: { messages: [REQUEST_HELLO, REQUEST_LONG] },
		expected: 20,
	},
	{ label: 'an empty tool list', request: { messages: [REQUEST_HELLO], tools: [] }, expected: 6 },
	{
		label: 'an empty schema and think',
		request: { messages: [REQUEST_HELLO], options: { think: true, schema: {} } },
		expected: 6,
	},
	{
		label: 'a named tool',
		request: { messages: [REQUEST_HELLO], tools: [{ name: 'lookup' }] },
		expected: 11,
	},
	{
		label: 'a tool with a description and parameters',
		request: { messages: [REQUEST_HELLO], tools: [REQUEST_ADD] },
		expected: 24,
	},
	{
		label: 'a structured output schema',
		request: { messages: [REQUEST_HELLO], options: { schema: { type: 'object' } } },
		expected: 11,
	},
	{
		label: 'a schema with a required list',
		request: {
			messages: [REQUEST_HELLO],
			options: { schema: { type: 'object', required: ['a'] } },
		},
		expected: 15,
	},
	{
		label: 'messages, tools, and schema together',
		request: {
			messages: [REQUEST_HELLO],
			tools: [REQUEST_ADD],
			options: { think: false, schema: { type: 'object' } },
		},
		expected: 29,
	},
])

/** Supplies an object that holds itself, which JSON cannot render, so every measure of it costs the framing alone. */
export const MEASURE_CIRCULAR: Record<string, unknown> = { type: 'object' }
MEASURE_CIRCULAR.self = MEASURE_CIRCULAR

/** Supplies one `add` call whose arguments render to a 41-character JSON call, so its measure is 11. */
export const MEASURE_CALLS: readonly ToolCall[] = Object.freeze<readonly ToolCall[]>([
	{ id: 'c1', name: 'add', arguments: {} },
])

/**
 * Supplies message measures counted by hand: content is `ceil(length / 4)` over UTF-16 length, framing
 * is 4, an image is 512, and calls cost the ceiling of their JSON length over 4 — the `add` call below
 * renders to 41 characters, so 11 — or the framing 4 when JSON cannot carry them. `total` is the
 * legacy `estimateMessages` reading of the message alone.
 */
export const MESSAGE_MEASURE_CASES: ReadonlyArray<{
	readonly label: string
	readonly message: Message
	readonly expected: MessageMeasure
	readonly total: number
}> = Object.freeze([
	{
		label: 'an empty message',
		message: { id: 'e', role: 'user', content: '' },
		expected: { id: 'e', role: 'user', content: 0, framing: 4, calls: 0, thinking: 0, images: 0 },
		total: 4,
	},
	{
		label: 'content on a four-character boundary',
		message: { id: 'b4', role: 'user', content: 'a'.repeat(4) },
		expected: { id: 'b4', role: 'user', content: 1, framing: 4, calls: 0, thinking: 0, images: 0 },
		total: 5,
	},
	{
		label: 'content rounded up from five characters',
		message: { id: 'b5', role: 'user', content: 'hello' },
		expected: { id: 'b5', role: 'user', content: 2, framing: 4, calls: 0, thinking: 0, images: 0 },
		total: 6,
	},
	{
		label: 'content on an eight-character boundary',
		message: { id: 'b8', role: 'user', content: 'a'.repeat(8) },
		expected: { id: 'b8', role: 'user', content: 2, framing: 4, calls: 0, thinking: 0, images: 0 },
		total: 6,
	},
	{
		label: 'content rounded up from nine characters',
		message: { id: 'b9', role: 'user', content: 'a'.repeat(9) },
		expected: { id: 'b9', role: 'user', content: 3, framing: 4, calls: 0, thinking: 0, images: 0 },
		total: 7,
	},
	{
		label: 'accented text counted by UTF-16 length',
		message: { id: 'ac', role: 'user', content: 'naïve café' },
		expected: { id: 'ac', role: 'user', content: 3, framing: 4, calls: 0, thinking: 0, images: 0 },
		total: 7,
	},
	{
		label: 'surrogate pairs counted as two units each',
		message: { id: 'sp', role: 'user', content: '\u{1F600}\u{1F600}' },
		expected: { id: 'sp', role: 'user', content: 1, framing: 4, calls: 0, thinking: 0, images: 0 },
		total: 5,
	},
	{
		label: 'thinking beside content',
		message: {
			id: 'th',
			role: 'assistant',
			content: 'Booked',
			thinking: 'Compare the fares before booking',
		},
		expected: {
			id: 'th',
			role: 'assistant',
			content: 2,
			framing: 4,
			calls: 0,
			thinking: 8,
			images: 0,
		},
		total: 14,
	},
	{
		label: 'an empty thinking string',
		message: { id: 'et', role: 'assistant', content: '', thinking: '' },
		expected: {
			id: 'et',
			role: 'assistant',
			content: 0,
			framing: 4,
			calls: 0,
			thinking: 0,
			images: 0,
		},
		total: 4,
	},
	{
		label: 'rendered calls',
		message: { id: 'ca', role: 'assistant', content: '', calls: MEASURE_CALLS },
		expected: {
			id: 'ca',
			role: 'assistant',
			content: 0,
			framing: 4,
			calls: 11,
			thinking: 0,
			images: 0,
		},
		total: 15,
	},
	{
		label: 'an empty calls list',
		message: { id: 'ec', role: 'assistant', content: '', calls: [] },
		expected: {
			id: 'ec',
			role: 'assistant',
			content: 0,
			framing: 4,
			calls: 0,
			thinking: 0,
			images: 0,
		},
		total: 4,
	},
	{
		label: 'calls JSON cannot carry',
		message: {
			id: 'uc',
			role: 'assistant',
			content: '',
			calls: [{ id: 'c1', name: 'search', arguments: MEASURE_CIRCULAR }],
		},
		expected: {
			id: 'uc',
			role: 'assistant',
			content: 0,
			framing: 4,
			calls: 4,
			thinking: 0,
			images: 0,
		},
		total: 8,
	},
	{
		label: 'three images',
		message: { id: 'im', role: 'user', content: '', images: ['aaaa', 'bbbb', 'cccc'] },
		expected: {
			id: 'im',
			role: 'user',
			content: 0,
			framing: 4,
			calls: 0,
			thinking: 0,
			images: 1536,
		},
		total: 1540,
	},
	{
		label: 'an empty images list',
		message: { id: 'ei', role: 'user', content: '', images: [] },
		expected: { id: 'ei', role: 'user', content: 0, framing: 4, calls: 0, thinking: 0, images: 0 },
		total: 4,
	},
	{
		label: 'every component at once',
		message: {
			id: 'all',
			role: 'assistant',
			content: 'aaaaa',
			thinking: 'bbbbbbbbb',
			calls: MEASURE_CALLS,
			images: ['x', 'y'],
		},
		expected: {
			id: 'all',
			role: 'assistant',
			content: 2,
			framing: 4,
			calls: 11,
			thinking: 3,
			images: 1024,
		},
		total: 1044,
	},
])

/**
 * Supplies request measures counted by hand from the same character counts as
 * {@link REQUEST_ESTIMATE_CASES}: `hello` is content 2 and `a` repeated 40 is content 10, each with
 * framing 4; `[{"name":"lookup"}]` is 5, the `add` definition 18, `{"type":"object"}` 5 and the schema with
 * a required list 9. A tool list or schema JSON cannot carry costs the framing 4. `total` is the legacy
 * `estimateRequest` reading of the request.
 */
export const REQUEST_MEASURE_CASES: ReadonlyArray<{
	readonly label: string
	readonly request: ProviderRequest
	readonly expected: RequestMeasure
	readonly total: number
}> = Object.freeze([
	{
		label: 'an empty request',
		request: { messages: [] },
		expected: { messages: [], tools: 0, schema: 0 },
		total: 0,
	},
	{
		label: 'one message',
		request: { messages: [REQUEST_HELLO] },
		expected: {
			messages: [
				{ id: 'm', role: 'user', content: 2, framing: 4, calls: 0, thinking: 0, images: 0 },
			],
			tools: 0,
			schema: 0,
		},
		total: 6,
	},
	{
		label: 'two messages in request order',
		request: { messages: [REQUEST_HELLO, REQUEST_LONG] },
		expected: {
			messages: [
				{ id: 'm', role: 'user', content: 2, framing: 4, calls: 0, thinking: 0, images: 0 },
				{ id: 'n', role: 'user', content: 10, framing: 4, calls: 0, thinking: 0, images: 0 },
			],
			tools: 0,
			schema: 0,
		},
		total: 20,
	},
	{
		label: 'an empty tool list, an empty schema and think',
		request: { messages: [REQUEST_HELLO], tools: [], options: { think: true, schema: {} } },
		expected: {
			messages: [
				{ id: 'm', role: 'user', content: 2, framing: 4, calls: 0, thinking: 0, images: 0 },
			],
			tools: 0,
			schema: 0,
		},
		total: 6,
	},
	{
		label: 'a named tool',
		request: { messages: [REQUEST_HELLO], tools: [{ name: 'lookup' }] },
		expected: {
			messages: [
				{ id: 'm', role: 'user', content: 2, framing: 4, calls: 0, thinking: 0, images: 0 },
			],
			tools: 5,
			schema: 0,
		},
		total: 11,
	},
	{
		label: 'a schema with a required list',
		request: {
			messages: [REQUEST_HELLO],
			options: { schema: { type: 'object', required: ['a'] } },
		},
		expected: {
			messages: [
				{ id: 'm', role: 'user', content: 2, framing: 4, calls: 0, thinking: 0, images: 0 },
			],
			tools: 0,
			schema: 9,
		},
		total: 15,
	},
	{
		label: 'messages, tools and schema together',
		request: {
			messages: [REQUEST_HELLO],
			tools: [REQUEST_ADD],
			options: { think: false, schema: { type: 'object' } },
		},
		expected: {
			messages: [
				{ id: 'm', role: 'user', content: 2, framing: 4, calls: 0, thinking: 0, images: 0 },
			],
			tools: 18,
			schema: 5,
		},
		total: 29,
	},
	{
		label: 'a tool list JSON cannot carry',
		request: {
			messages: [REQUEST_HELLO],
			tools: [{ name: 'lookup', parameters: MEASURE_CIRCULAR }],
		},
		expected: {
			messages: [
				{ id: 'm', role: 'user', content: 2, framing: 4, calls: 0, thinking: 0, images: 0 },
			],
			tools: 4,
			schema: 0,
		},
		total: 10,
	},
	{
		label: 'a schema JSON cannot carry',
		request: { messages: [REQUEST_HELLO], options: { schema: MEASURE_CIRCULAR } },
		expected: {
			messages: [
				{ id: 'm', role: 'user', content: 2, framing: 4, calls: 0, thinking: 0, images: 0 },
			],
			tools: 0,
			schema: 4,
		},
		total: 10,
	},
	{
		label: 'duplicate ids kept in occurrence order',
		request: {
			messages: [
				{ id: 'd', role: 'user', content: 'aaaa' },
				{ id: 'x', role: 'assistant', content: '' },
				{ id: 'd', role: 'tool', content: 'bbbbbbbb' },
			],
		},
		expected: {
			messages: [
				{ id: 'd', role: 'user', content: 1, framing: 4, calls: 0, thinking: 0, images: 0 },
				{ id: 'x', role: 'assistant', content: 0, framing: 4, calls: 0, thinking: 0, images: 0 },
				{ id: 'd', role: 'tool', content: 2, framing: 4, calls: 0, thinking: 0, images: 0 },
			],
			tools: 0,
			schema: 0,
		},
		total: 15,
	},
])

/**
 * Reads the request a scripted provider call received, omitting an absent tool list or options so
 * it compares to a measured {@link ProviderRequest}.
 *
 * @param call - One recorded scripted provider call
 * @returns The messages, tools, and options the call carried
 */
export function readCallRequest(call: ScriptedCall): ProviderRequest {
	return {
		messages: call.messages,
		...(call.tools === undefined ? {} : { tools: call.tools }),
		...(call.options === undefined ? {} : { options: call.options }),
	}
}

/** Seeds an agent and conversation for automatic compaction. */
export function seedCompactionAgent(
	window: ReturnType<typeof createBudget<ProviderRequest>> | undefined,
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

/**
 * Reports a scripted value per read: the script in read order, then `rest` for every later read.
 * It keeps each value it reported, so a test asserts the whole read history instead of a count.
 *
 * @example
 * ```ts
 * const replays = new ScriptedReads<ThinkingReplay>(['none'], 'all')
 * replays.read() // 'none'
 * replays.read() // 'all'
 * replays.reported // ['none', 'all']
 * ```
 */
export class ScriptedReads<T> {
	readonly #script: Iterator<T>
	readonly #rest: T
	readonly #reported: T[] = []

	constructor(script: readonly T[], rest: T) {
		this.#script = script.values()
		this.#rest = rest
	}

	/** Each value reported so far, in read order. */
	get reported(): readonly T[] {
		return [...this.#reported]
	}

	/** Reports the next scripted value, or `rest` once the script is spent. */
	read(): T {
		const step = this.#script.next()
		const value = step.done === true ? this.#rest : step.value
		this.#reported.push(value)
		return value
	}
}

/** Coordinates overlapping provider calls through caller-owned gates. */
export function createSharedGatedProvider(
	g1: PromiseWithResolvers<void>,
	g2: PromiseWithResolvers<void>,
): ProviderInterface {
	const gates = new ScriptedReads([g1], g2)
	return {
		id: 'm',
		name: 'm',
		async *stream(_messages, signal): AsyncGenerator<ProviderDelta, ProviderResult> {
			const gate = gates.read()
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

/**
 * Coordinates overlapping provider calls through caller-owned gates: the first call parks on `g1`
 * and finishes `full-1`, and every later call parks on `g2` and finishes `full-2`.
 */
export function createIndependentGatedProvider(
	g1: PromiseWithResolvers<void>,
	g2: PromiseWithResolvers<void>,
): ProviderInterface {
	const turns = new ScriptedReads([{ ordinal: 1, gate: g1 }], { ordinal: 2, gate: g2 })
	return {
		id: 'own',
		name: 'own',
		async *stream(_messages, signal): AsyncGenerator<ProviderDelta, ProviderResult> {
			const { ordinal, gate } = turns.read()
			yield { channel: 'content', text: 'part' }
			await gate.promise
			if (signal.aborted) throw new ProviderAbortError({ content: 'part' })
			return { content: `full-${ordinal}` }
		},
		async generate() {
			return { content: 'full' }
		},
	}
}

/** Requests a tool then fails the following provider turn. */
export function createSecondTurnFailureProvider(): ProviderInterface {
	const tooling = new ScriptedReads([true], false)
	return {
		id: 'fault',
		name: 'fault',
		async *stream(): AsyncGenerator<ProviderDelta, ProviderResult> {
			if (tooling.read()) {
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

/** Names a result or usage member whose read a {@link CountingAgentResult} records. */
export type AccessedMember =
	| 'content'
	| 'thinking'
	| 'usage'
	| 'partial'
	| 'prompt'
	| 'completion'
	| 'total'

/** Records each usage member read while a result is projected. */
export class CountingTokenUsage {
	readonly #accesses: RecorderInterface<readonly [member: AccessedMember]>

	constructor(accesses: RecorderInterface<readonly [member: AccessedMember]>) {
		this.#accesses = accesses
	}

	get prompt(): number {
		this.#accesses.handler('prompt')
		return 2
	}

	get completion(): number {
		this.#accesses.handler('completion')
		return 1
	}

	get total(): number {
		this.#accesses.handler('total')
		return 3
	}
}

/** Records each result member read while a result is projected, in read order, on `accesses`. */
export class CountingAgentResult {
	readonly accesses = createRecorder<readonly [member: AccessedMember]>()
	readonly #usage = new CountingTokenUsage(this.accesses)

	get content(): string {
		this.accesses.handler('content')
		return 'done'
	}

	get thinking(): string {
		this.accesses.handler('thinking')
		return 'reasoning'
	}

	get usage(): CountingTokenUsage {
		this.accesses.handler('usage')
		return this.#usage
	}

	get partial(): boolean {
		this.accesses.handler('partial')
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
		return lines
			.filter((line) => line.trim().length > 0)
			.map((line) => {
				const record = parseJSONAs(line, isRecord)
				if (record === undefined) throw new ProviderError('PROTOCOL', 'invalid JSON record')
				return record
			})
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
		...(typeof body === 'string' ? {} : { duplex: 'half' as const }),
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
			const thoughtList = thoughts ?? []
			const reasoned = thoughtList.join('')
			for (const [index, thought] of thoughtList.entries()) {
				if (signal.aborted) {
					throw new ProviderAbortError(
						buildProviderPartial('', thoughtList.slice(0, index).join('')),
					)
				}
				if (thought.length > 0) yield { channel: 'thinking', text: thought }
			}
			for (const [index, delta] of chunks.entries()) {
				if (signal.aborted) {
					throw new ProviderAbortError(
						buildProviderPartial(chunks.slice(0, index).join(''), reasoned),
					)
				}
				if (delta.length > 0) yield { channel: 'content', text: delta }
			}
			if (signal.aborted) {
				throw new ProviderAbortError(buildProviderPartial(chunks.join(''), reasoned))
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
		for (;;) {
			const step = await generator.next()
			if (step.done) return step.value
		}
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

/**
 * Builds an {@link AgentTurn} record for a stop-inference case — by default an `answer` turn whose
 * call streamed nothing, reported no usage, returned unaborted, and was not truncated, with
 * per-case overrides for the readings a case varies.
 *
 * @param overrides - Fields to override on the default turn
 * @returns The assembled turn record
 */
export function createAgentTurn(overrides?: Partial<AgentTurn>): AgentTurn {
	return {
		content: '',
		thinking: undefined,
		usage: undefined,
		spent: undefined,
		messages: [],
		ending: 'answer',
		partial: false,
		futile: false,
		estimate: 0,
		interrupted: false,
		truncated: false,
		...overrides,
	}
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
 * Creates a real token budget that records every consumed usage and charges its `total`.
 * The default ceiling is generous, so a case that proves metering never trips the budget.
 *
 * @param recorder - The recorder that receives each consumed usage
 * @param max - The cumulative ceiling. Default: 1_000_000
 * @returns A cumulative budget over {@link TokenUsage} whose consumer records before it charges
 */
export function createRecordedBudget(
	recorder: RecorderInterface<[TokenUsage]>,
	max = 1_000_000,
): BudgetInterface<TokenUsage> {
	return createBudget<TokenUsage>({
		max,
		consumer: (value) => {
			recorder.handler(value)
			return value.total
		},
	})
}

/**
 * Creates a real tool that records its arguments and returns a fixed output.
 *
 * @param name - The tool name a provider call selects
 * @param recorder - The recorder that receives each call's arguments
 * @param output - The value each execution returns. Default: 'ok'
 * @returns A working tool whose execution records, then returns the output
 */
export function createRecordedTool(
	name: string,
	recorder: RecorderInterface<[Readonly<Record<string, unknown>>]>,
	output: unknown = 'ok',
): ToolInterface {
	return createTool({
		name,
		execute: (args) => {
			recorder.handler(args)
			return output
		},
	})
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

/**
 * Creates an inert summarizer that records each request and digests it as `recap(<contents>)`,
 * so a rolling fold's input and output are both readable from the section summary.
 *
 * @returns The summarizer and the requests it received, oldest first
 */
export function createRecapSummarizer(): {
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
			return `recap(${messages.map((message) => message.content).join('|')})`
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
	const selected = createRecorder<readonly [selection: Selection]>()
	return {
		get calls() {
			return recorder.calls
		},
		get selections() {
			return selected.calls.map(([selection]) => selection)
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
			selected.handler(selection)
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
 * Counts each successful yield and resolves immediately. An aborted signal rejects with its
 * reason; delay resolves without a timer so loop tests isolate pacing.
 */
export class RecordedScheduler implements RecordingSchedulerInterface {
	#yields = 0

	get yields(): number {
		return this.#yields
	}

	async yield(options?: SchedulerOptions): Promise<void> {
		if (options?.signal?.aborted) throw options.signal.reason
		this.#yields += 1
	}

	async delay(): Promise<void> {}
}

/**
 * Creates a scheduler boundary fixture that records successful yields and resolves immediately.
 * An aborted signal rejects with its reason; delay resolves without a timer so loop tests isolate pacing.
 *
 * @returns A scheduler whose yields report successful turn boundaries
 */
export function createRecordingScheduler(): RecordingSchedulerInterface {
	return new RecordedScheduler()
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
 * again — the caller asserts `before` is defined and `after` is `undefined`.
 *
 * @param create - Builds a fresh, empty store (the twin's own factory)
 * @param build - The snapshot builder ({@link buildConversationSnapshot})
 * @returns The snapshot read before and after the delete
 */
export async function exerciseConversationStoreDeleteThenAbsent(
	create: ConversationStoreFunction,
	build: ConversationSnapshotFunction,
): Promise<{
	readonly before: ConversationSnapshot | undefined
	readonly after: ConversationSnapshot | undefined
}> {
	const store = create()
	const snapshot = await build()
	await store.set(snapshot)
	const before = await store.get(snapshot.id)
	await store.delete(snapshot.id)
	const after = await store.get(snapshot.id)
	return { before, after }
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
	readonly alpha: {
		readonly snapshot: ConversationSnapshot
		readonly before: ConversationSnapshot | undefined
		readonly after: ConversationSnapshot | undefined
	}
	readonly beta: {
		readonly snapshot: ConversationSnapshot
		readonly before: ConversationSnapshot | undefined
		readonly after: ConversationSnapshot | undefined
	}
}> {
	const store = create()
	const alpha = await build('alpha')
	const beta = await build('beta')
	await store.set(alpha)
	await store.set(beta)
	const alphaBefore = await store.get('alpha')
	const betaBefore = await store.get('beta')
	await store.delete('alpha')
	const alphaAfter = await store.get('alpha')
	const betaAfter = await store.get('beta')
	return {
		alpha: { snapshot: alpha, before: alphaBefore, after: alphaAfter },
		beta: { snapshot: beta, before: betaBefore, after: betaAfter },
	}
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
	const recorded = createRecorder<readonly [signal: AbortSignal]>()
	return {
		get signals() {
			return recorded.calls.map(([signal]) => signal)
		},
		fetch(_input, init) {
			const signal = init?.signal
			if (signal !== null && signal !== undefined) recorded.handler(signal)
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
	const content = deltas.map((delta) => splitter.split(delta)).join('')
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
export class RecordedHeader {
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
	read(
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
	_input: Parameters<typeof globalThis.fetch>[0],
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

	async #request(
		input: Parameters<typeof globalThis.fetch>[0],
		init?: RequestInit,
	): Promise<Response> {
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
	for (;;) {
		const step = await stream.next()
		if (step.done) return { deltas, result: step.value }
		deltas.push(step.value)
	}
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
	input: Parameters<typeof globalThis.fetch>[0],
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
		const entries = Object.keys(request.questions).map((id) => {
			const answer = this.#answers[id]
			const refusal = this.#refusals[id]
			if (answer === undefined && refusal === undefined) {
				throw new JudgeError('PROTOCOL', `judge error: answer ${id} is missing`)
			}
			return { id, answer, refusal }
		})
		const answers = Object.fromEntries(
			entries.flatMap(({ id, answer }): ReadonlyArray<readonly [string, JudgeAnswer]> => {
				return answer === undefined ? [] : [[id, answer]]
			}),
		)
		const refusals = Object.fromEntries(
			entries.flatMap(({ id, answer, refusal }): ReadonlyArray<readonly [string, Refusal]> => {
				return answer !== undefined || refusal === undefined ? [] : [[id, refusal]]
			}),
		)
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
export const SCOPE_EVENTS = Object.freeze(['add', 'remove', 'clear'] as const)

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

/** Supplies the order-to-owner attribution seam and its provider system bytes. */
export const LEDGER_LINK_FIXTURE = Object.freeze({
	subject: 'order:BC-7301',
	id: 'BC-7301',
	owner: 'BW-20931',
	lookup: 'Account BW-20931: Brightwater Studio.',
	fact: 'Order BC-7301 requires a signature before release.',
	result: Object.freeze({
		ids: Object.freeze(['BC-7301', 'BW-20931']),
		owners: Object.freeze([{ id: 'BW-20931', names: Object.freeze(['Brightwater Studio']) }]),
	}),
	off: 'Serve the desk.\n\n## Pinned\n### Brightwater Studio (account BW-20931)\n- Account BW-20931: Brightwater Studio.',
	on: 'Serve the desk.\n\n## Pinned\n### Brightwater Studio (account BW-20931)\n- Account BW-20931: Brightwater Studio.\n- Order BC-7301 requires a signature before release.',
})

/** Lists subjects and reading texts that cannot attribute a non-owner order id. */
export const LEDGER_LINK_REFUSALS = Object.freeze([
	{ subject: 'orders:BC-7301,BC-7302', text: 'Account BW-20931: Brightwater Studio.' },
	{ subject: 'order:pending', text: 'Account BW-20931: Brightwater Studio.' },
	{ subject: 'order:BC-7301', text: 'Accounts BW-20931 and OM-30418.' },
	{ subject: 'order:BC-7301', text: 'No owner was named.' },
])

/** Carries the parts of a classification as plain collections, which {@link buildLedgerClassification} turns into the projection's maps and sets. */
export interface LedgerClassificationInput {
	readonly quiet?: readonly string[]
	readonly categories?: Readonly<Record<string, LedgerCategory>>
	readonly topics?: Readonly<Record<string, readonly string[]>>
	readonly amendments?: Readonly<Record<string, readonly string[]>>
	readonly supersessions?: Readonly<Record<string, readonly string[]>>
}

/** Carries the parts of a projection input as plain collections, which {@link buildLedgerInput} turns into the projection's maps. */
export interface LedgerProjectionSource {
	readonly system?: string
	readonly exclusions?: readonly string[]
	readonly owners?: Readonly<Record<string, readonly string[]>>
	readonly messages?: readonly Message[]
	readonly readings?: readonly LedgerLookupReading[]
	readonly entities?: Readonly<Record<string, readonly string[]>>
	readonly classification?: LedgerClassificationInput
}

/**
 * Builds a classification from plain collections.
 *
 * @param parts - The parts to set; an absent part is empty
 * @returns The classification
 */
export function buildLedgerClassification(
	parts: LedgerClassificationInput = {},
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
export function buildLedgerInput(parts: LedgerProjectionSource = {}): LedgerProjectionInput {
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
	const owners = new Set(
		(input.entities.get(id) ?? []).flatMap((entity) => {
			const owner = input.owners.has(entity) ? entity : links.get(entity)
			return owner === undefined ? [] : [`owner:${owner}`]
		}),
	)
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
	const byId = new Map(input.messages.map((message, at) => [message.id, { ...message, at }]))
	const { classification } = input
	const excluded = new Set(input.exclusions)
	const supersessions = new Set(
		[...classification.supersessions].flatMap(([id, laters]) => (laters.length > 0 ? [id] : [])),
	)
	const lookups = new Map(input.readings.map((reading) => [reading.id, reading]))
	const replaced = new Set(
		[...lookups.values()]
			.filter((reading) =>
				[...lookups.values()].some(
					(later) =>
						(byId.get(later.id)?.at ?? -1) > (byId.get(reading.id)?.at ?? -1) &&
						computeLedgerIdentity(later.name, later.arguments) ===
							computeLedgerIdentity(reading.name, reading.arguments),
				),
			)
			.map((reading) => reading.id),
	)
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

	const verbatim = lines.flatMap(({ record, line }) => {
		const sentences = splitSentences(byId.get(line.source)?.content ?? '')
		const prefix = line.party === undefined ? '' : `${line.party}: `
		const unmatched =
			!line.text.startsWith(prefix) || line.text.slice(prefix.length) !== sentences[line.sentence]
		const unnamed =
			line.party !== undefined &&
			!collectNames(sentences[line.sentence - 1] ?? '').includes(line.party)
		return [
			...(unmatched
				? [
						`verbatim ${record.key}: "${line.text}" is not sentence ${line.sentence} of ${line.source}`,
					]
				: []),
			...(unnamed
				? [
						`verbatim ${record.key}: party "${line.party}" is absent from the sentence before ${line.source} sentence ${line.sentence}`,
					]
				: []),
		]
	})

	const dead = lines.flatMap(({ record, line }) => {
		const tokens = extractTokens(line.text)
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
		return [
			...built.stale
				.filter(
					(entry) =>
						entry.source === line.source &&
						entry.tokens.some(
							(token) => tokens.ids.has(token) || tokens.numbers.has(Number(token)),
						),
				)
				.map(
					(entry) =>
						`dead ${record.key}: "${line.text}" holds ${entry.tokens.join(', ')}, which stale lists for ${line.source}`,
				),
			...(reason === undefined
				? []
				: [`dead ${record.key}: "${line.text}" comes from a ${reason} source ${line.source}`]),
		]
	})

	const coverage = built.records.flatMap((record) =>
		record.members
			.filter((id) => live.has(id))
			.flatMap((id) =>
				[...splitSentences(byId.get(id)?.content ?? '').keys()]
					.filter(
						(at) =>
							!record.lines.some((line) => line.source === id && line.sentence === at) &&
							!staleKeys.has(`${id} ${at}`),
					)
					.map(
						(at) => `coverage ${record.key}: sentence ${at} of ${id} is neither a line nor stale`,
					),
			),
	)

	const links = linkOwners(input.readings, input.owners)
	const earlierSides = new Map(
		[
			...Map.groupBy(
				[...classification.amendments].flatMap(([earlier, laters]) =>
					laters.map((later): readonly [string, string] => [later, earlier]),
				),
				([later]) => later,
			),
		].map(([later, pairs]): readonly [string, readonly string[]] => [
			later,
			pairs.map(([, earlier]) => earlier),
		]),
	)
	const placedIn = Map.groupBy(
		[
			...built.records.flatMap((record) =>
				record.members.map((id): readonly [string, string] => [id, record.key]),
			),
			...built.orphans.map((id): readonly [string, string] => [id, 'orphans']),
		],
		([id]) => id,
	)
	const placement = [...new Set([...live, ...placedIn.keys()])].flatMap((id) => {
		const expected = live.has(id)
			? [...listPlacementKeys(id, new Set([id]), input, earlierSides, links)]
			: []
		const want = (expected.length === 0 && live.has(id) ? ['orphans'] : expected).sort().join(', ')
		const got = (placedIn.get(id) ?? [])
			.map(([, key]) => key)
			.sort()
			.join(', ')
		return want === got ? [] : [`placement ${id}: placed in [${got}], expected [${want}]`]
	})

	const expectedStale = [...live]
		.sort((left, right) => (byId.get(left)?.at ?? 0) - (byId.get(right)?.at ?? 0))
		.flatMap((id) => {
			const laters = (classification.amendments.get(id) ?? []).filter((later) =>
				hasEffect(later, input, byId, live, excluded, supersessions),
			)
			return splitSentences(byId.get(id)?.content ?? '').flatMap((sentence, at) => {
				const own = extractTokens(sentence)
				const shared = new Set(
					laters.flatMap((later) => {
						const other = extractTokens(byId.get(later)?.content ?? '')
						return [
							...[...own.ids].filter((token) => other.ids.has(token)),
							...[...own.numbers].filter((token) => other.numbers.has(token)).map(String),
						]
					}),
				)
				return shared.size > 0 ? [`${id} ${at} ${[...shared].sort().join(',')}`] : []
			})
		})
	const gotStale = built.stale.map(
		(entry) => `${entry.source} ${entry.sentence} ${[...entry.tokens].sort().join(',')}`,
	)
	const stale =
		JSON.stringify(gotStale) === JSON.stringify(expectedStale)
			? []
			: [`stale: built [${gotStale.join('; ')}], expected [${expectedStale.join('; ')}]`]

	const handle = lines.flatMap(({ record, line }) => {
		const own = new Set(byId.get(line.source)?.content.match(LEDGER_HANDLE) ?? [])
		return (line.text.match(LEDGER_HANDLE) ?? [])
			.filter((held) => !own.has(held))
			.map(
				(held) => `handle ${record.key}: "${line.text}" holds ${held}, which ${line.source} lacks`,
			)
	})

	const order =
		canonicalStringify(buildRecords(reverseLedgerInput(input))) === canonicalStringify(built)
			? []
			: ['order: the build over reversed collections differs from the build']
	return [...verbatim, ...dead, ...coverage, ...placement, ...stale, ...handle, ...order]
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

/** Carries the complete unmodified API observations of a ledger scenario. */
export interface LedgerCapture {
	readonly providers: readonly ProviderRequest[]
	readonly judges: readonly JudgeRequest[]
	readonly selections: readonly Selection[]
	readonly results: readonly LedgerResult[]
	readonly gauges: ReadonlyArray<LedgerGauge | undefined>
}

/** Pins exact serialized UTF-8 request text and its SHA-256. */
export interface LedgerCaptureText {
	readonly text: string
	readonly digest: string
}

/** Supplies independent expected API captures for the fictional desk. */
export interface LedgerCaptureFixture {
	readonly id: string
	readonly seed: readonly MessageInput[]
	readonly goals: readonly string[]
	readonly turns: readonly ScriptedTurn[]
	readonly expected: {
		readonly providers: readonly LedgerCaptureText[]
		readonly judges: readonly LedgerCaptureText[]
		readonly selections: readonly string[]
		readonly results: readonly string[]
	}
}

/** Supplies a first-goal reconstruction without a dependency on ignored evidence. */
export interface LedgerNumericFixture {
	readonly seed: readonly MessageInput[]
	readonly goal: string
	readonly records: ReadonlyArray<{
		readonly id: string
		readonly name: string
		readonly content: string
	}>
	readonly agents: readonly string[]
	readonly judges: readonly string[]
	readonly independent: ReadonlyArray<{
		readonly role: string
		readonly ordinal: number
		readonly bytes: number
	}>
	readonly dependent: ReadonlyArray<{
		readonly role: string
		readonly ordinal: number
		readonly bytes: number
	}>
}

/** Carries one transformed copy of raw captures and the boundary it must change or refuse. */
export interface LedgerCaptureControl {
	readonly label: string
	readonly populations: Readonly<Record<string, readonly unknown[]>>
	readonly channel?: string
	readonly path?: string
	readonly refused?: string
	readonly bytes?: number
}

/** Supplies the negative-control cases and their expected capture boundaries. */
export const LEDGER_CAPTURE_CONTROLS: ReadonlyArray<Omit<LedgerCaptureControl, 'populations'>> =
	Object.freeze([
		{ label: 'baseline' },
		{
			label: 'question-instruction',
			channel: 'judges',
			path: 'judges[0].questions.category.instructions',
		},
		{
			label: 'tool-description',
			channel: 'providers',
			path: 'providers[0].tools[0].description',
		},
		{
			label: 'one-byte-question',
			channel: 'judges',
			path: 'judges[0].questions.category.instructions',
			bytes: 1,
		},
		{
			label: 'same-length-question',
			channel: 'judges',
			path: 'judges[0].questions.category.instructions',
			bytes: 0,
		},
		{
			label: 'source-amount',
			channel: 'providers',
			path: 'providers[0].messages[6].content',
			bytes: 0,
		},
		{
			label: 'request-order',
			channel: 'providers',
			path: 'providers[0].tools',
		},
		{
			label: 'unknown-reference',
			refused: 'Unknown reference',
		},
		{
			label: 'unknown-message',
			refused: 'Unknown message',
		},
		{
			label: 'token-collision',
			refused: 'Normalization token collision',
		},
	])

/** Supplies baseline, fresh-repeat, and independently changed arrival amounts. */
export const LEDGER_CAPTURE_AMOUNTS: readonly string[] = Object.freeze([
	'$168.50',
	'$168.50',
	'$178.50',
])

/** Supplies the sources added after each earlier request completes. */
export const LEDGER_CAPTURE_ARRIVALS: ReadonlyArray<readonly MessageInput[]> = Object.freeze([
	[],
	[{ role: 'user', content: 'Correction: BW-20931 refund is $168.50, replacing $148.50.' }],
	[
		{
			role: 'user',
			content: 'Correction: replace the standing refund rule. Refunds over $250 need a manager.',
		},
	],
])

/** Supplies complete external provider results, including accompanying text and usage. */
export const LEDGER_CAPTURE_TURNS: readonly ScriptedTurn[] = Object.freeze([
	{ content: '', usage: { prompt: 620, completion: 1, total: 621 } },
	{ content: '', usage: { prompt: 600, completion: 1, total: 601 } },
	{
		content: 'Reading Brightwater now.',
		thinking: 'Verify the owner.',
		tools: [{ id: 'read', name: 'lookup', arguments: { id: 'BW-20931' } }],
		usage: { prompt: 400, completion: 12, total: 412 },
	},
	{
		content: 'The account is Brightwater Studio.',
		usage: { prompt: 420, completion: 8, total: 428 },
	},
	{
		content: 'Reading stored refund sources.',
		tools: [{ id: 'recall', name: 'recall', arguments: { topic: 'refunds' } }],
		usage: { prompt: 430, completion: 10, total: 440 },
	},
	{ content: '', usage: { prompt: 500, completion: 1, total: 501 } },
	{ content: 'Refund review complete.', usage: { prompt: 520, completion: 9, total: 529 } },
	{ content: 'Standing rule review complete.', usage: { prompt: 450, completion: 6, total: 456 } },
])

/** Supplies the immutable fictional seed; the oldest exchange exceeds the bounded tail. */
export const LEDGER_CAPTURE_SEED: readonly MessageInput[] = Object.freeze([
	{ role: 'user', content: 'Archive delivery evidence. '.repeat(100) },
	{ role: 'assistant', content: 'The archived delivery is complete.' },
	{ role: 'user', content: 'Refunds over $100 need a manager.' },
	{ role: 'user', content: 'Keep the loading dock at warehouse 42 clear.' },
	...buildLedgerExchange('Account LH-81660: Lighthouse Studio. Refund is $30.00.', 'foreign', {
		id: 'LH-81660',
	}),
])

/** Supplies the requests whose suffix observes the amendments and replacement. */
export const LEDGER_CAPTURE_GOALS: readonly string[] = Object.freeze([
	'Check BW-20931.',
	'What do we know about BW-20931 refunds?',
	'What standing refund rule applies to Brightwater Studio?',
])

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
	asked: RecorderInterface<readonly [key: string]>,
	answer: (request: JudgeRequest, count: number) => Promise<JudgeResult>,
	model = 'partial',
): JudgeInterface {
	return {
		id: model,
		name: model,
		model,
		ask: (request) => {
			for (const key of Object.keys(request.questions)) asked.handler(key)
			return answer(request, asked.count)
		},
	}
}

/**
 * Wraps a judge whose reported model a test changes between calls, so the model outlives each
 * call as entity state instead of a cell the test body writes.
 *
 * @remarks
 * `id`, `name`, and `ask` forward to the wrapped judge. `model` reports the identity the last
 * {@link SwitchingJudge.use} set, or the constructor's `model` before any.
 *
 * @example
 * ```ts
 * const judge = new SwitchingJudge(inner, 'A')
 * judge.use('B')
 * judge.model // 'B'
 * ```
 */
export class SwitchingJudge implements JudgeInterface {
	readonly #judge: JudgeInterface
	#model: string

	constructor(judge: JudgeInterface, model: string = judge.model) {
		this.#judge = judge
		this.#model = model
	}

	get id(): string {
		return this.#judge.id
	}

	get name(): string {
		return this.#judge.name
	}

	get model(): string {
		return this.#model
	}

	use(model: string): void {
		this.#model = model
	}

	ask(request: JudgeRequest, signal: AbortSignal): Promise<JudgeResult> {
		return this.#judge.ask(request, signal)
	}
}

/** Supplies the phase and judgment key of each question the measured `m1` to `m5` filing asks, in asking order. */
export const CLASSIFIER_PINNED_ASKS: ReadonlyArray<readonly [ClassifierPhase, string]> = [
	['category', '["category","m1"]'],
	['category', '["category","m2"]'],
	['category', '["category","m3"]'],
	['topic', '["topic","m1","refunds"]'],
	['topic', '["topic","m1","warehouse"]'],
	['topic', '["topic","m2","refunds"]'],
	['topic', '["topic","m2","warehouse"]'],
	['topic', '["topic","m4","refunds"]'],
	['amends', '["amends","m1","m2"]'],
	['supersedes', '["supersedes","m1","m2"]'],
]

/** Carries a classifier reading with its elapsed time reduced to whether it is absent, a finite nonnegative number, or anything else. */
export interface ReadingSummary {
	readonly key: string
	readonly phase: ClassifierPhase
	readonly outcome: ClassifierOutcome
	readonly duration: 'absent' | 'valid' | 'invalid'
}

/**
 * Reduces classifier readings to values an exact comparison can hold without a timing threshold.
 * @param readings - The readings a classifier or ledger returned
 * @returns Each reading's key, phase, and outcome, with its duration classed as absent, valid, or invalid
 */
export function summarizeReadings(
	readings: readonly ClassifierReading[],
): readonly ReadingSummary[] {
	return readings.map((reading) => ({
		key: reading.key,
		phase: reading.phase,
		outcome: reading.outcome,
		duration:
			reading.duration === undefined
				? 'absent'
				: Number.isFinite(reading.duration) && reading.duration >= 0
					? 'valid'
					: 'invalid',
	}))
}

/**
 * Builds the summaries for a run of questions with one outcome.
 * @param asks - The phase and judgment key of each question, in asking order
 * @param outcome - The outcome every question shares
 * @returns The expected summaries; a cached or skipped question has no duration and any other has a valid one
 */
export function buildReadingSummaries(
	asks: ReadonlyArray<readonly [ClassifierPhase, string]>,
	outcome: ClassifierOutcome,
): readonly ReadingSummary[] {
	return asks.map(([phase, key]) => ({
		key,
		phase,
		outcome,
		duration: outcome === 'cached' || outcome === 'skipped' ? 'absent' : 'valid',
	}))
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
 * Builds an amendment or supersession judgment whose identity and state match a source pair.
 * @param head - The pair question, amends or supersedes
 * @param earlier - The earlier source message
 * @param later - The later source message
 * @param noul - The noul answer for the pair
 * @returns The pair judgment input
 */
export function buildLedgerPairJudgment(
	head: 'amends' | 'supersedes',
	earlier: Message,
	later: Message,
	noul: number,
): JudgmentInput {
	return {
		id: JSON.stringify([head, earlier.id, later.id]),
		question: LEDGER_QUESTIONS[head],
		sources: [earlier.id, later.id],
		state: `Earlier message: ${earlier.role}: ${earlier.content}\nLater message: ${later.role}: ${later.content}`,
		model: 'recording-model',
		answer: { form: 'noul', noul },
	}
}

/**
 * Builds a topic judgment whose identity and state match a source message.
 * @param message - The source message
 * @param topic - The desk topic the question names
 * @param noul - The noul answer for the topic
 * @returns The topic judgment input
 */
export function buildLedgerTopicJudgment(
	message: Message,
	topic: LedgerTopic,
	noul: number,
): JudgmentInput {
	return {
		id: JSON.stringify(['topic', message.id, topic.name]),
		question: {
			form: 'noul',
			instructions: LEDGER_QUESTIONS.topic,
			criteria: {
				true: `The message concerns ${topic.name}: ${topic.criterion}`,
				false: `The message does not concern ${topic.name}`,
			},
		},
		sources: [message.id],
		state: `${message.role}: ${message.content}`,
		model: 'recording-model',
		answer: { form: 'noul', noul },
	}
}

/**
 * Removes the calibrated gauge from ledger options so the ledger measures its own.
 * @param options - The ledger options to copy
 * @returns The options without a gauge
 */
export function buildUncalibratedOptions(options: LedgerOptions): Omit<LedgerOptions, 'gauge'> {
	const { gauge: _gauge, ...uncalibrated } = options
	return uncalibrated
}

/**
 * Builds the delivery history that fills a conversation with distinct user statements.
 * @param count - The number of deliveries
 * @returns The user messages to append to a conversation
 */
export function buildDeliverySeed(count: number): readonly MessageInput[] {
	return Array.from({ length: count }, (_unused, at): MessageInput => ({
		role: 'user',
		content: `Delivery ${at} arrived Tuesday with a completed receipt.`,
	}))
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
			const answers = Object.fromEntries(
				Object.entries(request.questions).map(([id, question]): readonly [string, JudgeAnswer] => [
					id,
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
							},
				]),
			)
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
	ledger.conversation.add(buildDeliverySeed(40))
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
		judge: {
			id: 'scripted',
			name: 'scripted',
			model: 'scripted',
			ask: async (request) => {
				const state = isString(request.state) ? request.state : ''
				const answers = Object.fromEntries(
					Object.entries(request.questions).map(
						([id, question]): readonly [string, JudgeAnswer] => [
							id,
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
									},
						],
					),
				)
				return { model: 'scripted', answers }
			},
		},
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
	readonly measured: readonly ProviderRequest[]
	readonly wire: readonly ProviderRequest[]
}> {
	const measured = createRecorder<readonly [ProviderRequest]>()
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
			consumer: (request: ProviderRequest) => {
				measured.handler({ ...request, messages: [...request.messages] })
				return estimateRequest(request)
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
		measured: measured.calls.map(([request]) => request),
		wire: provider.calls.map(readCallRequest),
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

/** Builds the request a relay hop hands to its handler from the arguments of one fetch. */
export type RelayHopRequest = (
	input: Parameters<typeof globalThis.fetch>[0],
	init: Parameters<typeof globalThis.fetch>[1],
) => Request | Promise<Request>

/**
 * Configures a relay hop.
 *
 * @remarks
 * - `provider` - The upstream provider the real handler drives.
 * - `limit` - The request body byte limit. Default: the handler's own.
 * - `url` - The relay destination. Default: `http://relay.test/`.
 * - `headers` - The headers the relay provider sends with each call.
 * - `authorize` - The handler's authorization hook. Default: admits every request.
 * - `request` - Builds the request the handler receives; observes or rewrites it. Default: the
 *   request the fetch arguments describe.
 * - `response` - Observes the handler's response, for example to read a clone of its frames.
 */
export interface RelayHopOptions {
	readonly provider: ProviderInterface
	readonly limit?: number
	readonly url?: string
	readonly headers?: RelayProviderOptions['headers']
	readonly authorize?: RelayOptions['authorize']
	readonly request?: RelayHopRequest
	readonly response?: (response: Response) => void | Promise<void>
}

/**
 * Creates a relay provider connected in process to a real relay handler.
 *
 * @param options - The upstream provider, byte limit, destination, and observation seams
 * @returns The provider driving the handler through Fetch objects
 */
export function createRelayHop(options: RelayHopOptions): RelayProvider {
	const handler = createRelay({
		provider: options.provider,
		authorize: options.authorize ?? (() => true),
		...(options.limit === undefined ? {} : { limit: options.limit }),
	})
	return new RelayProvider({
		url: options.url ?? 'http://relay.test/',
		parser: createParser,
		...(options.headers === undefined ? {} : { headers: options.headers }),
		fetch: async (input, init) => {
			const request =
				options.request === undefined
					? new Request(input, init)
					: await options.request(input, init)
			const response = await handler(request)
			await options.response?.(response)
			return response
		},
	})
}

/**
 * Creates a relay provider connected to a real byte-limited handler.
 * @param upstream - The provider the handler drives
 * @param limit - The request body byte limit
 * @returns The provider driving the handler through Fetch objects
 */
export function createBoundedRelay(upstream: ProviderInterface, limit: number): RelayProvider {
	return createRelayHop({ provider: upstream, limit, url: 'https://app.example/relay' })
}

/**
 * Creates an inert object shaped like an `AbortSignal` from another realm.
 * `AbortSignal.any` checks its brand and refuses it with a `TypeError`.
 *
 * @returns A never-aborted signal-shaped object
 */
export function createForeignSignal(): AbortSignal {
	return {
		aborted: false,
		reason: undefined,
		onabort: null,
		throwIfAborted: () => undefined,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
		dispatchEvent: () => false,
	}
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
	"filed.readings.map((reading) => reading.outcome) // ['resolved', 'resolved'] — the judge answered both",
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
	"`estimateRequest` counts a message's `thinking`, so the `window` budget counts the thinking the request carries and no other.",
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

/** Pins the inspected baseline; JSON member insertion order is the serialization convention. */
export const LEDGER_CAPTURE_FIXTURE: LedgerCaptureFixture = Object.freeze({
	id: 'brightwater-later-correction-v1',
	seed: LEDGER_CAPTURE_SEED,
	goals: LEDGER_CAPTURE_GOALS,
	turns: LEDGER_CAPTURE_TURNS,
	expected: {
		providers: [
			{
				text: '{"messages":[{"id":"system","role":"system","content":"Serve the desk."},{"id":"@w7:message:0","role":"user","content":"Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. "},{"id":"@w7:message:1","role":"assistant","content":"The archived delivery is complete."},{"id":"@w7:message:2","role":"user","content":"Refunds over $100 need a manager."},{"id":"@w7:message:3","role":"user","content":"Keep the loading dock at warehouse 42 clear."},{"id":"@w7:message:4","role":"assistant","content":"","calls":[{"id":"foreign","name":"lookup","arguments":{"id":"LH-81660"}}]},{"id":"@w7:message:5","role":"tool","content":"Account LH-81660: Lighthouse Studio. Refund is $30.00.","call":"foreign"}],"tools":[{"name":"lookup","description":"Read an owner record.","parameters":{"type":"object"}},{"name":"recall","description":"Recall what the full conversation record holds on a topic: an owner name, an id, or one of the desk topics refunds. Returns source lines, newest first.","parameters":{"type":"object","properties":{"topic":{"type":"string","description":"An owner name, an id, or a desk topic"}},"required":["topic"]}}],"options":{"think":false}}',
				digest: '6a19218d572d11ff766ba235a4d62e07f8b4b09fef8fea59d3b603cbd984d3cd',
			},
			{
				text: '{"messages":[{"id":"system","role":"system","content":"Serve the desk."},{"id":"@w7:message:0","role":"user","content":"Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. "},{"id":"@w7:message:1","role":"assistant","content":"The archived delivery is complete."},{"id":"@w7:message:2","role":"user","content":"Refunds over $100 need a manager."},{"id":"@w7:message:3","role":"user","content":"Keep the loading dock at warehouse 42 clear."},{"id":"@w7:message:4","role":"assistant","content":"","calls":[{"id":"foreign","name":"lookup","arguments":{"id":"LH-81660"}}]},{"id":"@w7:message:5","role":"tool","content":"Account LH-81660: Lighthouse Studio. Refund is $30.00.","call":"foreign"}],"options":{"think":false}}',
				digest: '064b040843281ccecbdf05d1d6d187cdac15876b0c3deb82f4af9f7cbc7ba8af',
			},
			{
				text: '{"messages":[{"id":"@w7:system:0","role":"system","content":"Serve the desk.\\n\\n## Rules\\n- Refunds over $100 need a manager.\\n- Keep the loading dock at warehouse 42 clear."},{"id":"@w7:message:2","role":"user","content":"Refunds over $100 need a manager."},{"id":"@w7:message:3","role":"user","content":"Keep the loading dock at warehouse 42 clear."},{"id":"@w7:message:4","role":"assistant","content":"","calls":[{"id":"foreign","name":"lookup","arguments":{"id":"LH-81660"}}]},{"id":"@w7:message:5","role":"tool","content":"lookup {\\"id\\":\\"LH-81660\\"}: result not shown; call recall with LH-81660","call":"foreign"},{"id":"@w7:message:6","role":"user","content":"Check BW-20931."}],"tools":[{"name":"lookup","description":"Read an owner record.","parameters":{"type":"object"}},{"name":"recall","description":"Recall what the full conversation record holds on a topic: an owner name, an id, or one of the desk topics refunds. Returns source lines, newest first.","parameters":{"type":"object","properties":{"topic":{"type":"string","description":"An owner name, an id, or a desk topic"}},"required":["topic"]}}],"options":{"think":true}}',
				digest: '8f21b575defd478484d782b50156b3d197e2489ca4cdd2eafeac09648da93a70',
			},
			{
				text: '{"messages":[{"id":"@w7:system:0","role":"system","content":"Serve the desk.\\n\\n## Rules\\n- Refunds over $100 need a manager.\\n- Keep the loading dock at warehouse 42 clear."},{"id":"@w7:message:2","role":"user","content":"Refunds over $100 need a manager."},{"id":"@w7:message:3","role":"user","content":"Keep the loading dock at warehouse 42 clear."},{"id":"@w7:message:4","role":"assistant","content":"","calls":[{"id":"foreign","name":"lookup","arguments":{"id":"LH-81660"}}]},{"id":"@w7:message:5","role":"tool","content":"lookup {\\"id\\":\\"LH-81660\\"}: result not shown; call recall with LH-81660","call":"foreign"},{"id":"@w7:message:6","role":"user","content":"Check BW-20931."},{"id":"@w7:message:7","role":"assistant","content":"Reading Brightwater now.","calls":[{"id":"read","name":"lookup","arguments":{"id":"BW-20931"}}],"thinking":"Verify the owner."},{"id":"@w7:message:8","role":"tool","content":"Account BW-20931: Brightwater Studio. Refund is $148.50.","call":"read"}],"tools":[{"name":"lookup","description":"Read an owner record.","parameters":{"type":"object"}},{"name":"recall","description":"Recall what the full conversation record holds on a topic: an owner name, an id, or one of the desk topics refunds. Returns source lines, newest first.","parameters":{"type":"object","properties":{"topic":{"type":"string","description":"An owner name, an id, or a desk topic"}},"required":["topic"]}}],"options":{"think":true}}',
				digest: 'de5416eadde486de94fe544d9bb06783adfdd42845add22fe6d33c8fcd66e403',
			},
			{
				text: '{"messages":[{"id":"@w7:system:1","role":"system","content":"Serve the desk.\\n\\n## Pinned\\n### Brightwater Studio (account BW-20931)\\n- Correction: BW-20931 refund is $168.50, replacing $148.50.\\n\\n## Rules\\n- Refunds over $100 need a manager.\\n- Keep the loading dock at warehouse 42 clear."},{"id":"@w7:message:11","role":"user","content":"What do we know about BW-20931 refunds?"}],"tools":[{"name":"lookup","description":"Read an owner record.","parameters":{"type":"object"}},{"name":"recall","description":"Recall what the full conversation record holds on a topic: an owner name, an id, or one of the desk topics refunds. Returns source lines, newest first.","parameters":{"type":"object","properties":{"topic":{"type":"string","description":"An owner name, an id, or a desk topic"}},"required":["topic"]}}],"options":{"think":true}}',
				digest: '0ec785ffe5ef60df9c6735a60344238b94b776260cc5bc85db2e5579b8116eb3',
			},
			{
				text: '{"messages":[{"id":"@w7:system:1","role":"system","content":"Serve the desk.\\n\\n## Pinned\\n### Brightwater Studio (account BW-20931)\\n- Correction: BW-20931 refund is $168.50, replacing $148.50.\\n\\n## Rules\\n- Refunds over $100 need a manager.\\n- Keep the loading dock at warehouse 42 clear."},{"id":"@w7:message:11","role":"user","content":"What do we know about BW-20931 refunds?"},{"id":"@w7:message:12","role":"assistant","content":"Reading stored refund sources.","calls":[{"id":"recall","name":"recall","arguments":{"topic":"refunds"}}]},{"id":"@w7:message:13","role":"tool","content":"Correction: BW-20931 refund is $168.50, replacing $148.50.\\nRefunds over $100 need a manager.","call":"recall"}],"tools":[{"name":"lookup","description":"Read an owner record.","parameters":{"type":"object"}},{"name":"recall","description":"Recall what the full conversation record holds on a topic: an owner name, an id, or one of the desk topics refunds. Returns source lines, newest first.","parameters":{"type":"object","properties":{"topic":{"type":"string","description":"An owner name, an id, or a desk topic"}},"required":["topic"]}}],"options":{"think":true}}',
				digest: 'd4af5aad7c0cdff6aa320f6ee6f4baa15b64bb7feebbda23b3f6036e67708338',
			},
			{
				text: '{"messages":[{"id":"@w7:system:2","role":"system","content":"Serve the desk.\\n\\n## Pinned\\n### Brightwater Studio (account BW-20931)\\n- Correction: BW-20931 refund is $168.50, replacing $148.50.\\n\\n## Rules\\n- Refunds over $100 need a manager.\\n- Keep the loading dock at warehouse 42 clear."},{"id":"@w7:message:11","role":"user","content":"What do we know about BW-20931 refunds?"},{"id":"@w7:message:15","role":"user","content":"[Desk] What your lookups and recalls returned in this request:\\nCorrection: BW-20931 refund is $168.50, replacing $148.50.\\nRefunds over $100 need a manager."},{"id":"@w7:message:16","role":"user","content":"[Desk] Give your complete answer now as your final message, from what you already have."}],"options":{"think":false}}',
				digest: 'e5c62dcf22efa073f0c2d122542b4bdace4dd6f3bdb284e76df6767985e79ce2',
			},
			{
				text: '{"messages":[{"id":"@w7:system:3","role":"system","content":"Serve the desk.\\n\\n## Pinned\\n### Brightwater Studio (account BW-20931)\\n- Correction: BW-20931 refund is $168.50, replacing $148.50.\\n\\n## Rules\\n- Correction: replace the standing refund rule.\\n- Refunds over $250 need a manager.\\n- Keep the loading dock at warehouse 42 clear."},{"id":"@w7:message:19","role":"user","content":"What standing refund rule applies to Brightwater Studio?"}],"tools":[{"name":"lookup","description":"Read an owner record.","parameters":{"type":"object"}},{"name":"recall","description":"Recall what the full conversation record holds on a topic: an owner name, an id, or one of the desk topics refunds. Returns source lines, newest first.","parameters":{"type":"object","properties":{"topic":{"type":"string","description":"An owner name, an id, or a desk topic"}},"required":["topic"]}}],"options":{"think":true}}',
				digest: '32b097a224d57b0fd06e216494eafba0deaa5a07c63e59632d3d2156dfaba7ce',
			},
		],
		judges: [
			{
				text: '{"state":"user: Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. ","questions":{"[\\"category\\",\\"@w7:message:0\\"]":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}}}}',
				digest: 'e8e75d11d05f556baedd04bcc90bdb8dd284a65c04c2bc9d3fb4ba9230a21c05',
			},
			{
				text: '{"state":"assistant: The archived delivery is complete.","questions":{"[\\"category\\",\\"@w7:message:1\\"]":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}}}}',
				digest: 'f0f584f220304c7118be1bac5c18b3d73f2030290697775f9d019eab0794b004',
			},
			{
				text: '{"state":"user: Refunds over $100 need a manager.","questions":{"[\\"category\\",\\"@w7:message:2\\"]":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}}}}',
				digest: '28870127a19dccb452117fd2f20fb3171ede1aaa7e3d8df96899b7101da1d448',
			},
			{
				text: '{"state":"user: Keep the loading dock at warehouse 42 clear.","questions":{"[\\"category\\",\\"@w7:message:3\\"]":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}}}}',
				digest: 'be9bdc85cdaf2490c7fcc4ab12e85eae9061afe8f6c123f01d39faad6be501e4',
			},
			{
				text: '{"state":"user: Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. ","questions":{"[\\"topic\\",\\"@w7:message:0\\",\\"refunds\\"]":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}}}}',
				digest: '722f5ed967de335b402e503b3fc5d808228c8f44062c075f40239c8b0976f25d',
			},
			{
				text: '{"state":"assistant: The archived delivery is complete.","questions":{"[\\"topic\\",\\"@w7:message:1\\",\\"refunds\\"]":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}}}}',
				digest: '5e565ea83006783e25c57912f9c8e9d5a015e76f5d196e4e5d9fd23ee387ef84',
			},
			{
				text: '{"state":"user: Refunds over $100 need a manager.","questions":{"[\\"topic\\",\\"@w7:message:2\\",\\"refunds\\"]":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}}}}',
				digest: 'b0c4f45af43356361535fb536ac1bdccbd678baea2f940564013012bcdc4371c',
			},
			{
				text: '{"state":"user: Keep the loading dock at warehouse 42 clear.","questions":{"[\\"topic\\",\\"@w7:message:3\\",\\"refunds\\"]":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}}}}',
				digest: 'f4ff1e607cab51f2c45ab2692a0fefc731f1c8e6f84fbc4c015d45aaba7740d1',
			},
			{
				text: '{"state":"user: Check BW-20931.","questions":{"[\\"topic\\",\\"@w7:message:6\\",\\"refunds\\"]":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}}}}',
				digest: '624c89f804635733a17d62dbdb1ae338c4e54ee3c244785f0f06cba42dcb83e7',
			},
			{
				text: '{"state":"user: Correction: BW-20931 refund is $168.50, replacing $148.50.","questions":{"[\\"category\\",\\"@w7:message:10\\"]":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}}}}',
				digest: '8d59e9bd416740211b06de1e2fa8bb0ada377b4996576665a1b1fcf8ca9f7939',
			},
			{
				text: '{"state":"user: Correction: BW-20931 refund is $168.50, replacing $148.50.","questions":{"[\\"topic\\",\\"@w7:message:10\\",\\"refunds\\"]":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}}}}',
				digest: '65d9ec8344feeb95dd527cd7a9ec785f5d4c5e39c16ad89441ec2fac97cac28e',
			},
			{
				text: '{"state":"user: What do we know about BW-20931 refunds?","questions":{"[\\"topic\\",\\"@w7:message:11\\",\\"refunds\\"]":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}}}}',
				digest: '78d5d5664c5b81e5d7e9c8f88048a9ba5c867748c9eabf22c784fda144469969',
			},
			{
				text: '{"state":"Earlier message: user: Refunds over $100 need a manager.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","questions":{"[\\"amends\\",\\"@w7:message:2\\",\\"@w7:message:10\\"]":{"form":"noul","instructions":"Does the later message replace or withdraw any value or rule the earlier message states?","criteria":{"true":"The later message replaces or withdraws at least one value or rule the earlier message states","false":"Every value and rule the earlier message states stays in force after the later message"}}}}',
				digest: '67eb761e1aeba4943c592366f10096e27ffefde77bdab2f33de539a69112d43d',
			},
			{
				text: '{"state":"Earlier message: user: Refunds over $100 need a manager.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","questions":{"[\\"supersedes\\",\\"@w7:message:2\\",\\"@w7:message:10\\"]":{"form":"noul","instructions":"Does the later message replace or withdraw everything the earlier message states?","criteria":{"true":"The later message replaces or withdraws everything the earlier message states","false":"Some value or rule the earlier message states stays in force after the later message"}}}}',
				digest: 'd210fb8061b4cc6f4d880dbcf3a77350dbf5d9a13a545b9d60bf58d9bc5fbb10',
			},
			{
				text: '{"state":"Earlier message: user: Check BW-20931.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","questions":{"[\\"amends\\",\\"@w7:message:6\\",\\"@w7:message:10\\"]":{"form":"noul","instructions":"Does the later message replace or withdraw any value or rule the earlier message states?","criteria":{"true":"The later message replaces or withdraws at least one value or rule the earlier message states","false":"Every value and rule the earlier message states stays in force after the later message"}}}}',
				digest: '3871e22ed2214c109e6e2a90f8a3b6bbf8a8999c267f60f125e2d38756b06779',
			},
			{
				text: '{"state":"Earlier message: user: Check BW-20931.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","questions":{"[\\"supersedes\\",\\"@w7:message:6\\",\\"@w7:message:10\\"]":{"form":"noul","instructions":"Does the later message replace or withdraw everything the earlier message states?","criteria":{"true":"The later message replaces or withdraws everything the earlier message states","false":"Some value or rule the earlier message states stays in force after the later message"}}}}',
				digest: '09be667ca9ee83ed6d841b92921820073fc74a428945fd76fb3ffe3d80948ce6',
			},
			{
				text: '{"state":"Earlier message: tool: Account BW-20931: Brightwater Studio. Refund is $148.50.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","questions":{"[\\"amends\\",\\"@w7:message:8\\",\\"@w7:message:10\\"]":{"form":"noul","instructions":"Does the later message replace or withdraw any value or rule the earlier message states?","criteria":{"true":"The later message replaces or withdraws at least one value or rule the earlier message states","false":"Every value and rule the earlier message states stays in force after the later message"}}}}',
				digest: 'f2dd0bb625e258d704d0c37f00c5f5035e5148a559cd8feef22ef64a8077a801',
			},
			{
				text: '{"state":"Earlier message: tool: Account BW-20931: Brightwater Studio. Refund is $148.50.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","questions":{"[\\"supersedes\\",\\"@w7:message:8\\",\\"@w7:message:10\\"]":{"form":"noul","instructions":"Does the later message replace or withdraw everything the earlier message states?","criteria":{"true":"The later message replaces or withdraws everything the earlier message states","false":"Some value or rule the earlier message states stays in force after the later message"}}}}',
				digest: '269c700e3d4aa063b0979df4bc76af54f0b8acfa9c1408977155bbb72c8f82f2',
			},
			{
				text: '{"state":"user: Correction: replace the standing refund rule. Refunds over $250 need a manager.","questions":{"[\\"category\\",\\"@w7:message:18\\"]":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}}}}',
				digest: '343aae0f47f2c925627cb8595afe07bc74b70a62dfe26b096b4ce383360432f5',
			},
			{
				text: '{"state":"user: Correction: replace the standing refund rule. Refunds over $250 need a manager.","questions":{"[\\"topic\\",\\"@w7:message:18\\",\\"refunds\\"]":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}}}}',
				digest: '243302c2b03e77e916a42a754c10b65d23d9431af791cae98ca4089c2f50b9d2',
			},
			{
				text: '{"state":"user: What standing refund rule applies to Brightwater Studio?","questions":{"[\\"topic\\",\\"@w7:message:19\\",\\"refunds\\"]":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}}}}',
				digest: '16c2c02430a588e080e63a585adaf4092cfb2991523b937c9bb74565a65531b7',
			},
			{
				text: '{"state":"Earlier message: user: Refunds over $100 need a manager.\\nLater message: user: Correction: replace the standing refund rule. Refunds over $250 need a manager.","questions":{"[\\"amends\\",\\"@w7:message:2\\",\\"@w7:message:18\\"]":{"form":"noul","instructions":"Does the later message replace or withdraw any value or rule the earlier message states?","criteria":{"true":"The later message replaces or withdraws at least one value or rule the earlier message states","false":"Every value and rule the earlier message states stays in force after the later message"}}}}',
				digest: '91eea3a297e834fb736812b9da5d43a11dedbe4c203f0bfcbef7abb0bdfffb5e',
			},
			{
				text: '{"state":"Earlier message: user: Refunds over $100 need a manager.\\nLater message: user: Correction: replace the standing refund rule. Refunds over $250 need a manager.","questions":{"[\\"supersedes\\",\\"@w7:message:2\\",\\"@w7:message:18\\"]":{"form":"noul","instructions":"Does the later message replace or withdraw everything the earlier message states?","criteria":{"true":"The later message replaces or withdraws everything the earlier message states","false":"Some value or rule the earlier message states stays in force after the later message"}}}}',
				digest: '6686cc8f01995c9e5f9da4a304f6d075c50a783d8ceb721d3c09fe7ee9bc026c',
			},
			{
				text: '{"state":"Earlier message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.\\nLater message: user: Correction: replace the standing refund rule. Refunds over $250 need a manager.","questions":{"[\\"amends\\",\\"@w7:message:10\\",\\"@w7:message:18\\"]":{"form":"noul","instructions":"Does the later message replace or withdraw any value or rule the earlier message states?","criteria":{"true":"The later message replaces or withdraws at least one value or rule the earlier message states","false":"Every value and rule the earlier message states stays in force after the later message"}}}}',
				digest: 'de21b9e5d06c7025aa0008905a819a4784abbc05be347d4265793a310b080127',
			},
			{
				text: '{"state":"Earlier message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.\\nLater message: user: Correction: replace the standing refund rule. Refunds over $250 need a manager.","questions":{"[\\"supersedes\\",\\"@w7:message:10\\",\\"@w7:message:18\\"]":{"form":"noul","instructions":"Does the later message replace or withdraw everything the earlier message states?","criteria":{"true":"The later message replaces or withdraws everything the earlier message states","false":"Some value or rule the earlier message states stays in force after the later message"}}}}',
				digest: '42b73dba4f336150082e34fbbd7a657fe115f5bc9ab77f0965fbcca14d00fbdc',
			},
			{
				text: '{"state":"Earlier message: user: What do we know about BW-20931 refunds?\\nLater message: user: Correction: replace the standing refund rule. Refunds over $250 need a manager.","questions":{"[\\"amends\\",\\"@w7:message:11\\",\\"@w7:message:18\\"]":{"form":"noul","instructions":"Does the later message replace or withdraw any value or rule the earlier message states?","criteria":{"true":"The later message replaces or withdraws at least one value or rule the earlier message states","false":"Every value and rule the earlier message states stays in force after the later message"}}}}',
				digest: '58cfd1b0e3f4da790463f9621547a5ab38b4c6f7c7c32d5e50b17387477f9057',
			},
			{
				text: '{"state":"Earlier message: user: What do we know about BW-20931 refunds?\\nLater message: user: Correction: replace the standing refund rule. Refunds over $250 need a manager.","questions":{"[\\"supersedes\\",\\"@w7:message:11\\",\\"@w7:message:18\\"]":{"form":"noul","instructions":"Does the later message replace or withdraw everything the earlier message states?","criteria":{"true":"The later message replaces or withdraws everything the earlier message states","false":"Some value or rule the earlier message states stays in force after the later message"}}}}',
				digest: '5768e14aaf3ef773798c5f14596431d51501f4c6f28ef59ab5e9b3f947c39b18',
			},
		],
		selections: [
			'{"messages":[{"id":"@w7:message:2","role":"user","content":"Refunds over $100 need a manager."},{"id":"@w7:message:3","role":"user","content":"Keep the loading dock at warehouse 42 clear."},{"id":"@w7:message:4","role":"assistant","content":"","calls":[{"id":"foreign","name":"lookup","arguments":{"id":"LH-81660"}}]},{"id":"@w7:message:5","role":"tool","content":"lookup {\\"id\\":\\"LH-81660\\"}: result not shown; call recall with LH-81660","call":"foreign"},{"id":"@w7:message:6","role":"user","content":"Check BW-20931."}],"briefing":"## Rules\\n- Refunds over $100 need a manager.\\n- Keep the loading dock at warehouse 42 clear.","judgments":["[\\"category\\",\\"@w7:message:0\\"]","[\\"category\\",\\"@w7:message:1\\"]","[\\"category\\",\\"@w7:message:2\\"]","[\\"category\\",\\"@w7:message:3\\"]","[\\"topic\\",\\"@w7:message:0\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:1\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:2\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:3\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:6\\",\\"refunds\\"]"]}',
			'{"messages":[{"id":"@w7:message:11","role":"user","content":"What do we know about BW-20931 refunds?"}],"briefing":"## Pinned\\n### Brightwater Studio (account BW-20931)\\n- Correction: BW-20931 refund is $168.50, replacing $148.50.\\n\\n## Rules\\n- Refunds over $100 need a manager.\\n- Keep the loading dock at warehouse 42 clear.","judgments":["[\\"category\\",\\"@w7:message:0\\"]","[\\"category\\",\\"@w7:message:1\\"]","[\\"category\\",\\"@w7:message:2\\"]","[\\"category\\",\\"@w7:message:3\\"]","[\\"category\\",\\"@w7:message:10\\"]","[\\"topic\\",\\"@w7:message:0\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:1\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:2\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:3\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:6\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:10\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:11\\",\\"refunds\\"]","[\\"amends\\",\\"@w7:message:2\\",\\"@w7:message:10\\"]","[\\"supersedes\\",\\"@w7:message:2\\",\\"@w7:message:10\\"]","[\\"amends\\",\\"@w7:message:6\\",\\"@w7:message:10\\"]","[\\"supersedes\\",\\"@w7:message:6\\",\\"@w7:message:10\\"]","[\\"amends\\",\\"@w7:message:8\\",\\"@w7:message:10\\"]","[\\"supersedes\\",\\"@w7:message:8\\",\\"@w7:message:10\\"]"]}',
			'{"messages":[{"id":"@w7:message:11","role":"user","content":"What do we know about BW-20931 refunds?"},{"id":"@w7:message:15","role":"user","content":"[Desk] What your lookups and recalls returned in this request:\\nCorrection: BW-20931 refund is $168.50, replacing $148.50.\\nRefunds over $100 need a manager."},{"id":"@w7:message:16","role":"user","content":"[Desk] Give your complete answer now as your final message, from what you already have."}],"judgments":[],"briefing":"## Pinned\\n### Brightwater Studio (account BW-20931)\\n- Correction: BW-20931 refund is $168.50, replacing $148.50.\\n\\n## Rules\\n- Refunds over $100 need a manager.\\n- Keep the loading dock at warehouse 42 clear."}',
			'{"messages":[{"id":"@w7:message:19","role":"user","content":"What standing refund rule applies to Brightwater Studio?"}],"briefing":"## Pinned\\n### Brightwater Studio (account BW-20931)\\n- Correction: BW-20931 refund is $168.50, replacing $148.50.\\n\\n## Rules\\n- Correction: replace the standing refund rule.\\n- Refunds over $250 need a manager.\\n- Keep the loading dock at warehouse 42 clear.","judgments":["[\\"category\\",\\"@w7:message:0\\"]","[\\"category\\",\\"@w7:message:1\\"]","[\\"category\\",\\"@w7:message:2\\"]","[\\"category\\",\\"@w7:message:3\\"]","[\\"category\\",\\"@w7:message:10\\"]","[\\"category\\",\\"@w7:message:18\\"]","[\\"topic\\",\\"@w7:message:0\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:1\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:2\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:3\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:6\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:10\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:11\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:18\\",\\"refunds\\"]","[\\"topic\\",\\"@w7:message:19\\",\\"refunds\\"]","[\\"amends\\",\\"@w7:message:2\\",\\"@w7:message:10\\"]","[\\"supersedes\\",\\"@w7:message:2\\",\\"@w7:message:10\\"]","[\\"amends\\",\\"@w7:message:6\\",\\"@w7:message:10\\"]","[\\"supersedes\\",\\"@w7:message:6\\",\\"@w7:message:10\\"]","[\\"amends\\",\\"@w7:message:8\\",\\"@w7:message:10\\"]","[\\"supersedes\\",\\"@w7:message:8\\",\\"@w7:message:10\\"]","[\\"amends\\",\\"@w7:message:2\\",\\"@w7:message:18\\"]","[\\"supersedes\\",\\"@w7:message:2\\",\\"@w7:message:18\\"]","[\\"amends\\",\\"@w7:message:10\\",\\"@w7:message:18\\"]","[\\"supersedes\\",\\"@w7:message:10\\",\\"@w7:message:18\\"]","[\\"amends\\",\\"@w7:message:11\\",\\"@w7:message:18\\"]","[\\"supersedes\\",\\"@w7:message:11\\",\\"@w7:message:18\\"]"]}',
		],
		results: [
			'{"result":{"request":"@w7:message:6","content":"The account is Brightwater Studio.","partial":false,"passes":[{"content":"The account is Brightwater Studio.","partial":false,"thinking":"Verify the owner.","usage":{"prompt":820,"completion":20,"total":840}}],"readings":[{"key":"[\\"category\\",\\"@w7:message:0\\"]","phase":"category","outcome":"resolved","duration":"observed"},{"key":"[\\"category\\",\\"@w7:message:1\\"]","phase":"category","outcome":"resolved","duration":"observed"},{"key":"[\\"category\\",\\"@w7:message:2\\"]","phase":"category","outcome":"resolved","duration":"observed"},{"key":"[\\"category\\",\\"@w7:message:3\\"]","phase":"category","outcome":"resolved","duration":"observed"},{"key":"[\\"topic\\",\\"@w7:message:0\\",\\"refunds\\"]","phase":"topic","outcome":"resolved","duration":"observed"},{"key":"[\\"topic\\",\\"@w7:message:1\\",\\"refunds\\"]","phase":"topic","outcome":"resolved","duration":"observed"},{"key":"[\\"topic\\",\\"@w7:message:2\\",\\"refunds\\"]","phase":"topic","outcome":"resolved","duration":"observed"},{"key":"[\\"topic\\",\\"@w7:message:3\\",\\"refunds\\"]","phase":"topic","outcome":"resolved","duration":"observed"},{"key":"[\\"topic\\",\\"@w7:message:6\\",\\"refunds\\"]","phase":"topic","outcome":"resolved","duration":"observed"}],"receipts":[{"selections":[{"tail":["@w7:message:2","@w7:message:3","@w7:message:4","@w7:message:5","@w7:message:6"],"prior":[],"plan":{"owners":[],"filed":["@w7:message:0","@w7:message:5","@w7:message:2","@w7:message:3"],"rendered":["@w7:message:2","@w7:message:3"],"sentences":[{"source":"@w7:message:2","sentence":0},{"source":"@w7:message:3","sentence":0}],"omitted":[],"trims":0,"withdrawn":[]},"sources":[{"source":"@w7:message:2","carriage":"verbatim"},{"source":"@w7:message:3","carriage":"verbatim"},{"source":"@w7:message:4","carriage":"verbatim"},{"source":"@w7:message:5"},{"source":"@w7:message:6","carriage":"verbatim"}]}],"calls":[{"estimate":109,"tools":2,"prompt":400,"completion":12,"selection":0},{"estimate":158,"tools":2,"prompt":420,"completion":8,"selection":0}]}],"usage":{"prompt":820,"completion":20,"total":840},"thinking":"Verify the owner."},"snapshot":{"id":"@w7:conversation","sections":[],"messages":[{"id":"@w7:message:0","role":"user","content":"Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. "},{"id":"@w7:message:1","role":"assistant","content":"The archived delivery is complete."},{"id":"@w7:message:2","role":"user","content":"Refunds over $100 need a manager."},{"id":"@w7:message:3","role":"user","content":"Keep the loading dock at warehouse 42 clear."},{"id":"@w7:message:4","role":"assistant","content":"","calls":[{"id":"foreign","name":"lookup","arguments":{"id":"LH-81660"}}]},{"id":"@w7:message:5","role":"tool","content":"Account LH-81660: Lighthouse Studio. Refund is $30.00.","call":"foreign"},{"id":"@w7:message:6","role":"user","content":"Check BW-20931."},{"id":"@w7:message:7","role":"assistant","content":"Reading Brightwater now.","calls":[{"id":"read","name":"lookup","arguments":{"id":"BW-20931"}}],"thinking":"Verify the owner."},{"id":"@w7:message:8","role":"tool","content":"Account BW-20931: Brightwater Studio. Refund is $148.50.","call":"read"},{"id":"@w7:message:9","role":"assistant","content":"The account is Brightwater Studio."}],"judgments":[{"id":"[\\"category\\",\\"@w7:message:0\\"]","question":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}},"model":"scripted","sources":["@w7:message:0"],"state":"user: Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. ","answer":{"form":"choice","probabilities":{"fact":1}},"time":"observed"},{"id":"[\\"category\\",\\"@w7:message:1\\"]","question":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}},"model":"scripted","sources":["@w7:message:1"],"state":"assistant: The archived delivery is complete.","answer":{"form":"choice","probabilities":{"fact":1}},"time":"observed"},{"id":"[\\"category\\",\\"@w7:message:2\\"]","question":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}},"model":"scripted","sources":["@w7:message:2"],"state":"user: Refunds over $100 need a manager.","answer":{"form":"choice","probabilities":{"rule":1}},"time":"observed"},{"id":"[\\"category\\",\\"@w7:message:3\\"]","question":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}},"model":"scripted","sources":["@w7:message:3"],"state":"user: Keep the loading dock at warehouse 42 clear.","answer":{"form":"choice","probabilities":{"rule":1}},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:0\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:0"],"state":"user: Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. ","answer":{"form":"noul","noul":0.1},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:1\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:1"],"state":"assistant: The archived delivery is complete.","answer":{"form":"noul","noul":0.1},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:2\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:2"],"state":"user: Refunds over $100 need a manager.","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:3\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:3"],"state":"user: Keep the loading dock at warehouse 42 clear.","answer":{"form":"noul","noul":0.1},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:6\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:6"],"state":"user: Check BW-20931.","answer":{"form":"noul","noul":0.1},"time":"observed"}]},"gauge":{"scale":3.4862385321100917,"overhead":20}}',
			'{"result":{"request":"@w7:message:11","content":"Refund review complete.","partial":false,"passes":[{"content":"","partial":false,"usage":{"prompt":930,"completion":11,"total":941}},{"content":"Refund review complete.","partial":false,"usage":{"prompt":520,"completion":9,"total":529}}],"readings":[{"key":"[\\"category\\",\\"@w7:message:0\\"]","phase":"category","outcome":"cached"},{"key":"[\\"category\\",\\"@w7:message:1\\"]","phase":"category","outcome":"cached"},{"key":"[\\"category\\",\\"@w7:message:2\\"]","phase":"category","outcome":"cached"},{"key":"[\\"category\\",\\"@w7:message:3\\"]","phase":"category","outcome":"cached"},{"key":"[\\"category\\",\\"@w7:message:10\\"]","phase":"category","outcome":"resolved","duration":"observed"},{"key":"[\\"topic\\",\\"@w7:message:0\\",\\"refunds\\"]","phase":"topic","outcome":"cached"},{"key":"[\\"topic\\",\\"@w7:message:1\\",\\"refunds\\"]","phase":"topic","outcome":"cached"},{"key":"[\\"topic\\",\\"@w7:message:2\\",\\"refunds\\"]","phase":"topic","outcome":"cached"},{"key":"[\\"topic\\",\\"@w7:message:3\\",\\"refunds\\"]","phase":"topic","outcome":"cached"},{"key":"[\\"topic\\",\\"@w7:message:6\\",\\"refunds\\"]","phase":"topic","outcome":"cached"},{"key":"[\\"topic\\",\\"@w7:message:10\\",\\"refunds\\"]","phase":"topic","outcome":"resolved","duration":"observed"},{"key":"[\\"topic\\",\\"@w7:message:11\\",\\"refunds\\"]","phase":"topic","outcome":"resolved","duration":"observed"},{"key":"[\\"amends\\",\\"@w7:message:2\\",\\"@w7:message:10\\"]","phase":"amends","outcome":"resolved","duration":"observed"},{"key":"[\\"supersedes\\",\\"@w7:message:2\\",\\"@w7:message:10\\"]","phase":"supersedes","outcome":"resolved","duration":"observed"},{"key":"[\\"amends\\",\\"@w7:message:6\\",\\"@w7:message:10\\"]","phase":"amends","outcome":"resolved","duration":"observed"},{"key":"[\\"supersedes\\",\\"@w7:message:6\\",\\"@w7:message:10\\"]","phase":"supersedes","outcome":"resolved","duration":"observed"},{"key":"[\\"amends\\",\\"@w7:message:8\\",\\"@w7:message:10\\"]","phase":"amends","outcome":"resolved","duration":"observed"},{"key":"[\\"supersedes\\",\\"@w7:message:8\\",\\"@w7:message:10\\"]","phase":"supersedes","outcome":"resolved","duration":"observed"}],"receipts":[{"selections":[{"tail":["@w7:message:11"],"prior":[],"plan":{"owners":["BW-20931"],"filed":["@w7:message:0","@w7:message:5","@w7:message:10","@w7:message:2","@w7:message:3"],"rendered":["@w7:message:10","@w7:message:2","@w7:message:3"],"sentences":[{"source":"@w7:message:10","sentence":0},{"source":"@w7:message:2","sentence":0},{"source":"@w7:message:3","sentence":0}],"omitted":[],"trims":0,"withdrawn":[{"earlier":"@w7:message:8","later":"@w7:message:10"}]},"sources":[{"source":"@w7:message:11","carriage":"verbatim"},{"source":"@w7:message:10","carriage":"record"},{"source":"@w7:message:2","carriage":"record"},{"source":"@w7:message:3","carriage":"record"}]}],"calls":[{"estimate":74,"tools":2,"prompt":430,"completion":10,"selection":0},{"estimate":130,"tools":2,"prompt":500,"completion":1,"selection":0}]},{"selections":[{"tail":["@w7:message:11","@w7:message:15","@w7:message:16"],"prior":[],"plan":{"owners":["BW-20931"],"filed":["@w7:message:0","@w7:message:5","@w7:message:10","@w7:message:2","@w7:message:3"],"rendered":["@w7:message:10","@w7:message:2","@w7:message:3"],"sentences":[{"source":"@w7:message:10","sentence":0},{"source":"@w7:message:2","sentence":0},{"source":"@w7:message:3","sentence":0}],"omitted":[],"trims":0,"withdrawn":[{"earlier":"@w7:message:8","later":"@w7:message:10"}]},"sources":[{"source":"@w7:message:11","carriage":"verbatim"},{"source":"@w7:message:15","carriage":"verbatim"},{"source":"@w7:message:16","carriage":"verbatim"},{"source":"@w7:message:10","carriage":"record"},{"source":"@w7:message:2","carriage":"record"},{"source":"@w7:message:3","carriage":"record"}]}],"calls":[{"estimate":143,"tools":0,"prompt":520,"completion":9,"selection":0}]}],"usage":{"prompt":1450,"completion":20,"total":1470}},"snapshot":{"id":"@w7:conversation","sections":[],"messages":[{"id":"@w7:message:0","role":"user","content":"Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. "},{"id":"@w7:message:1","role":"assistant","content":"The archived delivery is complete."},{"id":"@w7:message:2","role":"user","content":"Refunds over $100 need a manager."},{"id":"@w7:message:3","role":"user","content":"Keep the loading dock at warehouse 42 clear."},{"id":"@w7:message:4","role":"assistant","content":"","calls":[{"id":"foreign","name":"lookup","arguments":{"id":"LH-81660"}}]},{"id":"@w7:message:5","role":"tool","content":"Account LH-81660: Lighthouse Studio. Refund is $30.00.","call":"foreign"},{"id":"@w7:message:6","role":"user","content":"Check BW-20931."},{"id":"@w7:message:7","role":"assistant","content":"Reading Brightwater now.","calls":[{"id":"read","name":"lookup","arguments":{"id":"BW-20931"}}],"thinking":"Verify the owner."},{"id":"@w7:message:8","role":"tool","content":"Account BW-20931: Brightwater Studio. Refund is $148.50.","call":"read"},{"id":"@w7:message:9","role":"assistant","content":"The account is Brightwater Studio."},{"id":"@w7:message:10","role":"user","content":"Correction: BW-20931 refund is $168.50, replacing $148.50."},{"id":"@w7:message:11","role":"user","content":"What do we know about BW-20931 refunds?"},{"id":"@w7:message:12","role":"assistant","content":"Reading stored refund sources.","calls":[{"id":"recall","name":"recall","arguments":{"topic":"refunds"}}]},{"id":"@w7:message:13","role":"tool","content":"Correction: BW-20931 refund is $168.50, replacing $148.50.\\nRefunds over $100 need a manager.","call":"recall"},{"id":"@w7:message:14","role":"assistant","content":""},{"id":"@w7:message:15","role":"user","content":"[Desk] What your lookups and recalls returned in this request:\\nCorrection: BW-20931 refund is $168.50, replacing $148.50.\\nRefunds over $100 need a manager."},{"id":"@w7:message:16","role":"user","content":"[Desk] Give your complete answer now as your final message, from what you already have."},{"id":"@w7:message:17","role":"assistant","content":"Refund review complete."}],"judgments":[{"id":"[\\"category\\",\\"@w7:message:0\\"]","question":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}},"model":"scripted","sources":["@w7:message:0"],"state":"user: Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. ","answer":{"form":"choice","probabilities":{"fact":1}},"time":"observed"},{"id":"[\\"category\\",\\"@w7:message:1\\"]","question":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}},"model":"scripted","sources":["@w7:message:1"],"state":"assistant: The archived delivery is complete.","answer":{"form":"choice","probabilities":{"fact":1}},"time":"observed"},{"id":"[\\"category\\",\\"@w7:message:2\\"]","question":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}},"model":"scripted","sources":["@w7:message:2"],"state":"user: Refunds over $100 need a manager.","answer":{"form":"choice","probabilities":{"rule":1}},"time":"observed"},{"id":"[\\"category\\",\\"@w7:message:3\\"]","question":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}},"model":"scripted","sources":["@w7:message:3"],"state":"user: Keep the loading dock at warehouse 42 clear.","answer":{"form":"choice","probabilities":{"rule":1}},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:0\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:0"],"state":"user: Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. ","answer":{"form":"noul","noul":0.1},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:1\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:1"],"state":"assistant: The archived delivery is complete.","answer":{"form":"noul","noul":0.1},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:2\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:2"],"state":"user: Refunds over $100 need a manager.","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:3\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:3"],"state":"user: Keep the loading dock at warehouse 42 clear.","answer":{"form":"noul","noul":0.1},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:6\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:6"],"state":"user: Check BW-20931.","answer":{"form":"noul","noul":0.1},"time":"observed"},{"id":"[\\"category\\",\\"@w7:message:10\\"]","question":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}},"model":"scripted","sources":["@w7:message:10"],"state":"user: Correction: BW-20931 refund is $168.50, replacing $148.50.","answer":{"form":"choice","probabilities":{"correction":1}},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:10\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:10"],"state":"user: Correction: BW-20931 refund is $168.50, replacing $148.50.","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:11\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:11"],"state":"user: What do we know about BW-20931 refunds?","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"amends\\",\\"@w7:message:2\\",\\"@w7:message:10\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw any value or rule the earlier message states?","criteria":{"true":"The later message replaces or withdraws at least one value or rule the earlier message states","false":"Every value and rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:2","@w7:message:10"],"state":"Earlier message: user: Refunds over $100 need a manager.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"supersedes\\",\\"@w7:message:2\\",\\"@w7:message:10\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw everything the earlier message states?","criteria":{"true":"The later message replaces or withdraws everything the earlier message states","false":"Some value or rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:2","@w7:message:10"],"state":"Earlier message: user: Refunds over $100 need a manager.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","answer":{"form":"noul","noul":0.1},"time":"observed"},{"id":"[\\"amends\\",\\"@w7:message:6\\",\\"@w7:message:10\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw any value or rule the earlier message states?","criteria":{"true":"The later message replaces or withdraws at least one value or rule the earlier message states","false":"Every value and rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:6","@w7:message:10"],"state":"Earlier message: user: Check BW-20931.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"supersedes\\",\\"@w7:message:6\\",\\"@w7:message:10\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw everything the earlier message states?","criteria":{"true":"The later message replaces or withdraws everything the earlier message states","false":"Some value or rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:6","@w7:message:10"],"state":"Earlier message: user: Check BW-20931.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","answer":{"form":"noul","noul":0.1},"time":"observed"},{"id":"[\\"amends\\",\\"@w7:message:8\\",\\"@w7:message:10\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw any value or rule the earlier message states?","criteria":{"true":"The later message replaces or withdraws at least one value or rule the earlier message states","false":"Every value and rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:8","@w7:message:10"],"state":"Earlier message: tool: Account BW-20931: Brightwater Studio. Refund is $148.50.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"supersedes\\",\\"@w7:message:8\\",\\"@w7:message:10\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw everything the earlier message states?","criteria":{"true":"The later message replaces or withdraws everything the earlier message states","false":"Some value or rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:8","@w7:message:10"],"state":"Earlier message: tool: Account BW-20931: Brightwater Studio. Refund is $148.50.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","answer":{"form":"noul","noul":0.1},"time":"observed"}]},"gauge":{"scale":5.54054054054054,"overhead":20}}',
			'{"result":{"request":"@w7:message:19","content":"Standing rule review complete.","partial":false,"passes":[{"content":"Standing rule review complete.","partial":false,"usage":{"prompt":450,"completion":6,"total":456}}],"readings":[{"key":"[\\"category\\",\\"@w7:message:0\\"]","phase":"category","outcome":"cached"},{"key":"[\\"category\\",\\"@w7:message:1\\"]","phase":"category","outcome":"cached"},{"key":"[\\"category\\",\\"@w7:message:2\\"]","phase":"category","outcome":"cached"},{"key":"[\\"category\\",\\"@w7:message:3\\"]","phase":"category","outcome":"cached"},{"key":"[\\"category\\",\\"@w7:message:10\\"]","phase":"category","outcome":"cached"},{"key":"[\\"category\\",\\"@w7:message:18\\"]","phase":"category","outcome":"resolved","duration":"observed"},{"key":"[\\"topic\\",\\"@w7:message:0\\",\\"refunds\\"]","phase":"topic","outcome":"cached"},{"key":"[\\"topic\\",\\"@w7:message:1\\",\\"refunds\\"]","phase":"topic","outcome":"cached"},{"key":"[\\"topic\\",\\"@w7:message:2\\",\\"refunds\\"]","phase":"topic","outcome":"cached"},{"key":"[\\"topic\\",\\"@w7:message:3\\",\\"refunds\\"]","phase":"topic","outcome":"cached"},{"key":"[\\"topic\\",\\"@w7:message:6\\",\\"refunds\\"]","phase":"topic","outcome":"cached"},{"key":"[\\"topic\\",\\"@w7:message:10\\",\\"refunds\\"]","phase":"topic","outcome":"cached"},{"key":"[\\"topic\\",\\"@w7:message:11\\",\\"refunds\\"]","phase":"topic","outcome":"cached"},{"key":"[\\"topic\\",\\"@w7:message:18\\",\\"refunds\\"]","phase":"topic","outcome":"resolved","duration":"observed"},{"key":"[\\"topic\\",\\"@w7:message:19\\",\\"refunds\\"]","phase":"topic","outcome":"resolved","duration":"observed"},{"key":"[\\"amends\\",\\"@w7:message:2\\",\\"@w7:message:10\\"]","phase":"amends","outcome":"cached"},{"key":"[\\"supersedes\\",\\"@w7:message:2\\",\\"@w7:message:10\\"]","phase":"supersedes","outcome":"cached"},{"key":"[\\"amends\\",\\"@w7:message:6\\",\\"@w7:message:10\\"]","phase":"amends","outcome":"cached"},{"key":"[\\"supersedes\\",\\"@w7:message:6\\",\\"@w7:message:10\\"]","phase":"supersedes","outcome":"cached"},{"key":"[\\"amends\\",\\"@w7:message:8\\",\\"@w7:message:10\\"]","phase":"amends","outcome":"cached"},{"key":"[\\"supersedes\\",\\"@w7:message:8\\",\\"@w7:message:10\\"]","phase":"supersedes","outcome":"cached"},{"key":"[\\"amends\\",\\"@w7:message:2\\",\\"@w7:message:18\\"]","phase":"amends","outcome":"resolved","duration":"observed"},{"key":"[\\"supersedes\\",\\"@w7:message:2\\",\\"@w7:message:18\\"]","phase":"supersedes","outcome":"resolved","duration":"observed"},{"key":"[\\"amends\\",\\"@w7:message:10\\",\\"@w7:message:18\\"]","phase":"amends","outcome":"resolved","duration":"observed"},{"key":"[\\"supersedes\\",\\"@w7:message:10\\",\\"@w7:message:18\\"]","phase":"supersedes","outcome":"resolved","duration":"observed"},{"key":"[\\"amends\\",\\"@w7:message:11\\",\\"@w7:message:18\\"]","phase":"amends","outcome":"resolved","duration":"observed"},{"key":"[\\"supersedes\\",\\"@w7:message:11\\",\\"@w7:message:18\\"]","phase":"supersedes","outcome":"resolved","duration":"observed"}],"receipts":[{"selections":[{"tail":["@w7:message:19"],"prior":[],"plan":{"owners":["BW-20931"],"filed":["@w7:message:0","@w7:message:5","@w7:message:10","@w7:message:3","@w7:message:18"],"rendered":["@w7:message:10","@w7:message:18","@w7:message:3"],"sentences":[{"source":"@w7:message:10","sentence":0},{"source":"@w7:message:18","sentence":0},{"source":"@w7:message:18","sentence":1},{"source":"@w7:message:3","sentence":0}],"omitted":[],"trims":0,"withdrawn":[{"earlier":"@w7:message:8","later":"@w7:message:10"}]},"sources":[{"source":"@w7:message:19","carriage":"verbatim"},{"source":"@w7:message:10","carriage":"record"},{"source":"@w7:message:18","carriage":"record"},{"source":"@w7:message:3","carriage":"record"}]}],"calls":[{"estimate":90,"tools":2,"prompt":450,"completion":6,"selection":0}]}],"usage":{"prompt":450,"completion":6,"total":456}},"snapshot":{"id":"@w7:conversation","sections":[],"messages":[{"id":"@w7:message:0","role":"user","content":"Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. "},{"id":"@w7:message:1","role":"assistant","content":"The archived delivery is complete."},{"id":"@w7:message:2","role":"user","content":"Refunds over $100 need a manager."},{"id":"@w7:message:3","role":"user","content":"Keep the loading dock at warehouse 42 clear."},{"id":"@w7:message:4","role":"assistant","content":"","calls":[{"id":"foreign","name":"lookup","arguments":{"id":"LH-81660"}}]},{"id":"@w7:message:5","role":"tool","content":"Account LH-81660: Lighthouse Studio. Refund is $30.00.","call":"foreign"},{"id":"@w7:message:6","role":"user","content":"Check BW-20931."},{"id":"@w7:message:7","role":"assistant","content":"Reading Brightwater now.","calls":[{"id":"read","name":"lookup","arguments":{"id":"BW-20931"}}],"thinking":"Verify the owner."},{"id":"@w7:message:8","role":"tool","content":"Account BW-20931: Brightwater Studio. Refund is $148.50.","call":"read"},{"id":"@w7:message:9","role":"assistant","content":"The account is Brightwater Studio."},{"id":"@w7:message:10","role":"user","content":"Correction: BW-20931 refund is $168.50, replacing $148.50."},{"id":"@w7:message:11","role":"user","content":"What do we know about BW-20931 refunds?"},{"id":"@w7:message:12","role":"assistant","content":"Reading stored refund sources.","calls":[{"id":"recall","name":"recall","arguments":{"topic":"refunds"}}]},{"id":"@w7:message:13","role":"tool","content":"Correction: BW-20931 refund is $168.50, replacing $148.50.\\nRefunds over $100 need a manager.","call":"recall"},{"id":"@w7:message:14","role":"assistant","content":""},{"id":"@w7:message:15","role":"user","content":"[Desk] What your lookups and recalls returned in this request:\\nCorrection: BW-20931 refund is $168.50, replacing $148.50.\\nRefunds over $100 need a manager."},{"id":"@w7:message:16","role":"user","content":"[Desk] Give your complete answer now as your final message, from what you already have."},{"id":"@w7:message:17","role":"assistant","content":"Refund review complete."},{"id":"@w7:message:18","role":"user","content":"Correction: replace the standing refund rule. Refunds over $250 need a manager."},{"id":"@w7:message:19","role":"user","content":"What standing refund rule applies to Brightwater Studio?"},{"id":"@w7:message:20","role":"assistant","content":"Standing rule review complete."}],"judgments":[{"id":"[\\"category\\",\\"@w7:message:0\\"]","question":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}},"model":"scripted","sources":["@w7:message:0"],"state":"user: Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. ","answer":{"form":"choice","probabilities":{"fact":1}},"time":"observed"},{"id":"[\\"category\\",\\"@w7:message:1\\"]","question":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}},"model":"scripted","sources":["@w7:message:1"],"state":"assistant: The archived delivery is complete.","answer":{"form":"choice","probabilities":{"fact":1}},"time":"observed"},{"id":"[\\"category\\",\\"@w7:message:2\\"]","question":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}},"model":"scripted","sources":["@w7:message:2"],"state":"user: Refunds over $100 need a manager.","answer":{"form":"choice","probabilities":{"rule":1}},"time":"observed"},{"id":"[\\"category\\",\\"@w7:message:3\\"]","question":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}},"model":"scripted","sources":["@w7:message:3"],"state":"user: Keep the loading dock at warehouse 42 clear.","answer":{"form":"choice","probabilities":{"rule":1}},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:0\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:0"],"state":"user: Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. Archive delivery evidence. ","answer":{"form":"noul","noul":0.1},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:1\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:1"],"state":"assistant: The archived delivery is complete.","answer":{"form":"noul","noul":0.1},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:2\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:2"],"state":"user: Refunds over $100 need a manager.","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:3\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:3"],"state":"user: Keep the loading dock at warehouse 42 clear.","answer":{"form":"noul","noul":0.1},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:6\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:6"],"state":"user: Check BW-20931.","answer":{"form":"noul","noul":0.1},"time":"observed"},{"id":"[\\"category\\",\\"@w7:message:10\\"]","question":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}},"model":"scripted","sources":["@w7:message:10"],"state":"user: Correction: BW-20931 refund is $168.50, replacing $148.50.","answer":{"form":"choice","probabilities":{"correction":1}},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:10\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:10"],"state":"user: Correction: BW-20931 refund is $168.50, replacing $148.50.","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:11\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:11"],"state":"user: What do we know about BW-20931 refunds?","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"amends\\",\\"@w7:message:2\\",\\"@w7:message:10\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw any value or rule the earlier message states?","criteria":{"true":"The later message replaces or withdraws at least one value or rule the earlier message states","false":"Every value and rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:2","@w7:message:10"],"state":"Earlier message: user: Refunds over $100 need a manager.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"supersedes\\",\\"@w7:message:2\\",\\"@w7:message:10\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw everything the earlier message states?","criteria":{"true":"The later message replaces or withdraws everything the earlier message states","false":"Some value or rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:2","@w7:message:10"],"state":"Earlier message: user: Refunds over $100 need a manager.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","answer":{"form":"noul","noul":0.1},"time":"observed"},{"id":"[\\"amends\\",\\"@w7:message:6\\",\\"@w7:message:10\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw any value or rule the earlier message states?","criteria":{"true":"The later message replaces or withdraws at least one value or rule the earlier message states","false":"Every value and rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:6","@w7:message:10"],"state":"Earlier message: user: Check BW-20931.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"supersedes\\",\\"@w7:message:6\\",\\"@w7:message:10\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw everything the earlier message states?","criteria":{"true":"The later message replaces or withdraws everything the earlier message states","false":"Some value or rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:6","@w7:message:10"],"state":"Earlier message: user: Check BW-20931.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","answer":{"form":"noul","noul":0.1},"time":"observed"},{"id":"[\\"amends\\",\\"@w7:message:8\\",\\"@w7:message:10\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw any value or rule the earlier message states?","criteria":{"true":"The later message replaces or withdraws at least one value or rule the earlier message states","false":"Every value and rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:8","@w7:message:10"],"state":"Earlier message: tool: Account BW-20931: Brightwater Studio. Refund is $148.50.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"supersedes\\",\\"@w7:message:8\\",\\"@w7:message:10\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw everything the earlier message states?","criteria":{"true":"The later message replaces or withdraws everything the earlier message states","false":"Some value or rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:8","@w7:message:10"],"state":"Earlier message: tool: Account BW-20931: Brightwater Studio. Refund is $148.50.\\nLater message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.","answer":{"form":"noul","noul":0.1},"time":"observed"},{"id":"[\\"category\\",\\"@w7:message:18\\"]","question":{"form":"choice","instructions":"Which category best describes what this support-desk message states?","criteria":{"fact":"States a fact about a customer, an order, an account, the desk, or the day","rule":"States a standing rule, policy, or instruction the desk must follow","correction":"Corrects, replaces, or withdraws a value or rule stated earlier","request":"Asks the assistant to do a task or to answer a question","opinion":"States a personal view or judgment rather than a fact","chatter":"Talk with the agent that states nothing the desk acts on","distractor":"A statement about something outside the desk\'s work"}},"model":"scripted","sources":["@w7:message:18"],"state":"user: Correction: replace the standing refund rule. Refunds over $250 need a manager.","answer":{"form":"choice","probabilities":{"correction":1}},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:18\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:18"],"state":"user: Correction: replace the standing refund rule. Refunds over $250 need a manager.","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"topic\\",\\"@w7:message:19\\",\\"refunds\\"]","question":{"form":"noul","instructions":"Does this support-desk message concern the named desk topic?","criteria":{"true":"The message concerns refunds: Refund amounts","false":"The message does not concern refunds"}},"model":"scripted","sources":["@w7:message:19"],"state":"user: What standing refund rule applies to Brightwater Studio?","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"amends\\",\\"@w7:message:2\\",\\"@w7:message:18\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw any value or rule the earlier message states?","criteria":{"true":"The later message replaces or withdraws at least one value or rule the earlier message states","false":"Every value and rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:2","@w7:message:18"],"state":"Earlier message: user: Refunds over $100 need a manager.\\nLater message: user: Correction: replace the standing refund rule. Refunds over $250 need a manager.","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"supersedes\\",\\"@w7:message:2\\",\\"@w7:message:18\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw everything the earlier message states?","criteria":{"true":"The later message replaces or withdraws everything the earlier message states","false":"Some value or rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:2","@w7:message:18"],"state":"Earlier message: user: Refunds over $100 need a manager.\\nLater message: user: Correction: replace the standing refund rule. Refunds over $250 need a manager.","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"amends\\",\\"@w7:message:10\\",\\"@w7:message:18\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw any value or rule the earlier message states?","criteria":{"true":"The later message replaces or withdraws at least one value or rule the earlier message states","false":"Every value and rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:10","@w7:message:18"],"state":"Earlier message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.\\nLater message: user: Correction: replace the standing refund rule. Refunds over $250 need a manager.","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"supersedes\\",\\"@w7:message:10\\",\\"@w7:message:18\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw everything the earlier message states?","criteria":{"true":"The later message replaces or withdraws everything the earlier message states","false":"Some value or rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:10","@w7:message:18"],"state":"Earlier message: user: Correction: BW-20931 refund is $168.50, replacing $148.50.\\nLater message: user: Correction: replace the standing refund rule. Refunds over $250 need a manager.","answer":{"form":"noul","noul":0.1},"time":"observed"},{"id":"[\\"amends\\",\\"@w7:message:11\\",\\"@w7:message:18\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw any value or rule the earlier message states?","criteria":{"true":"The later message replaces or withdraws at least one value or rule the earlier message states","false":"Every value and rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:11","@w7:message:18"],"state":"Earlier message: user: What do we know about BW-20931 refunds?\\nLater message: user: Correction: replace the standing refund rule. Refunds over $250 need a manager.","answer":{"form":"noul","noul":0.9},"time":"observed"},{"id":"[\\"supersedes\\",\\"@w7:message:11\\",\\"@w7:message:18\\"]","question":{"form":"noul","instructions":"Does the later message replace or withdraw everything the earlier message states?","criteria":{"true":"The later message replaces or withdraws everything the earlier message states","false":"Some value or rule the earlier message states stays in force after the later message"}},"model":"scripted","sources":["@w7:message:11","@w7:message:18"],"state":"Earlier message: user: What do we know about BW-20931 refunds?\\nLater message: user: Correction: replace the standing refund rule. Refunds over $250 need a manager.","answer":{"form":"noul","noul":0.1},"time":"observed"}]},"gauge":{"scale":4.777777777777778,"overhead":20}}',
		],
	},
})

/** Pins the external judge answers independently of request comparison. */
export const LEDGER_CAPTURE_ANSWERS: readonly string[] = Object.freeze([
	'{"model":"scripted","answers":{"[\\"category\\",\\"@w7:message:0\\"]":{"form":"choice","probabilities":{"fact":1}}}}',
	'{"model":"scripted","answers":{"[\\"category\\",\\"@w7:message:1\\"]":{"form":"choice","probabilities":{"fact":1}}}}',
	'{"model":"scripted","answers":{"[\\"category\\",\\"@w7:message:2\\"]":{"form":"choice","probabilities":{"rule":1}}}}',
	'{"model":"scripted","answers":{"[\\"category\\",\\"@w7:message:3\\"]":{"form":"choice","probabilities":{"rule":1}}}}',
	'{"model":"scripted","answers":{"[\\"topic\\",\\"@w7:message:0\\",\\"refunds\\"]":{"form":"noul","noul":0.1}}}',
	'{"model":"scripted","answers":{"[\\"topic\\",\\"@w7:message:1\\",\\"refunds\\"]":{"form":"noul","noul":0.1}}}',
	'{"model":"scripted","answers":{"[\\"topic\\",\\"@w7:message:2\\",\\"refunds\\"]":{"form":"noul","noul":0.9}}}',
	'{"model":"scripted","answers":{"[\\"topic\\",\\"@w7:message:3\\",\\"refunds\\"]":{"form":"noul","noul":0.1}}}',
	'{"model":"scripted","answers":{"[\\"topic\\",\\"@w7:message:6\\",\\"refunds\\"]":{"form":"noul","noul":0.1}}}',
	'{"model":"scripted","answers":{"[\\"category\\",\\"@w7:message:10\\"]":{"form":"choice","probabilities":{"correction":1}}}}',
	'{"model":"scripted","answers":{"[\\"topic\\",\\"@w7:message:10\\",\\"refunds\\"]":{"form":"noul","noul":0.9}}}',
	'{"model":"scripted","answers":{"[\\"topic\\",\\"@w7:message:11\\",\\"refunds\\"]":{"form":"noul","noul":0.9}}}',
	'{"model":"scripted","answers":{"[\\"amends\\",\\"@w7:message:2\\",\\"@w7:message:10\\"]":{"form":"noul","noul":0.9}}}',
	'{"model":"scripted","answers":{"[\\"supersedes\\",\\"@w7:message:2\\",\\"@w7:message:10\\"]":{"form":"noul","noul":0.1}}}',
	'{"model":"scripted","answers":{"[\\"amends\\",\\"@w7:message:6\\",\\"@w7:message:10\\"]":{"form":"noul","noul":0.9}}}',
	'{"model":"scripted","answers":{"[\\"supersedes\\",\\"@w7:message:6\\",\\"@w7:message:10\\"]":{"form":"noul","noul":0.1}}}',
	'{"model":"scripted","answers":{"[\\"amends\\",\\"@w7:message:8\\",\\"@w7:message:10\\"]":{"form":"noul","noul":0.9}}}',
	'{"model":"scripted","answers":{"[\\"supersedes\\",\\"@w7:message:8\\",\\"@w7:message:10\\"]":{"form":"noul","noul":0.1}}}',
	'{"model":"scripted","answers":{"[\\"category\\",\\"@w7:message:18\\"]":{"form":"choice","probabilities":{"correction":1}}}}',
	'{"model":"scripted","answers":{"[\\"topic\\",\\"@w7:message:18\\",\\"refunds\\"]":{"form":"noul","noul":0.9}}}',
	'{"model":"scripted","answers":{"[\\"topic\\",\\"@w7:message:19\\",\\"refunds\\"]":{"form":"noul","noul":0.9}}}',
	'{"model":"scripted","answers":{"[\\"amends\\",\\"@w7:message:2\\",\\"@w7:message:18\\"]":{"form":"noul","noul":0.9}}}',
	'{"model":"scripted","answers":{"[\\"supersedes\\",\\"@w7:message:2\\",\\"@w7:message:18\\"]":{"form":"noul","noul":0.9}}}',
	'{"model":"scripted","answers":{"[\\"amends\\",\\"@w7:message:10\\",\\"@w7:message:18\\"]":{"form":"noul","noul":0.9}}}',
	'{"model":"scripted","answers":{"[\\"supersedes\\",\\"@w7:message:10\\",\\"@w7:message:18\\"]":{"form":"noul","noul":0.1}}}',
	'{"model":"scripted","answers":{"[\\"amends\\",\\"@w7:message:11\\",\\"@w7:message:18\\"]":{"form":"noul","noul":0.9}}}',
	'{"model":"scripted","answers":{"[\\"supersedes\\",\\"@w7:message:11\\",\\"@w7:message:18\\"]":{"form":"noul","noul":0.1}}}',
])

/** Supplies W4's accepted ev-01-1 reconstruction inputs and separately named request populations. */
export const LEDGER_NUMERIC_FIXTURE: LedgerNumericFixture = Object.freeze<LedgerNumericFixture>({
	seed: [
		{
			role: 'user',
			content:
				'[Source endurance-desk] You are the support operator for Beacon Cooperative. Maintain one continuous work history and answer the current desk request. Treat external source messages and actual lookup receipts as evidence. Distinguish approval, draft preparation, initiation, and completion. Preserve unfinished obligations and revise your earlier work when facts change. Do not invent tool receipts, sent messages, completed refunds, shipments, deliveries, or closed cases. Available read-only lookup tools are lookup with an id of order:<order id> and lookup with an id of customer:<account id>. They reveal the version released by the current source boundary. Your written packet is a draft unless an external source confirms the action.',
		},
		{
			role: 'user',
			content:
				"[Source ev-opening] Beacon Cooperative support desk opening note. Each numbered shift is one workday. Preserve unresolved commitments across shifts and distinguish a prepared draft from an externally completed action. Customer remedies require the case-specific approval and evidence. Money is in USD; round monetary results to cents. A confirmed posting, collection, delivery, or acceptance needs its own receipt. The desk holds an early grant-evidence obligation for Soren Ashby, order BC-7312, account BC-4112: assemble the corrected legal-name document set and obtain grant-officer acceptance by the end of shift 24. The payment and delivery already occurred, but the corrected invoice and grant acceptance have not. Keep this obligation open until its actual final evidence arrives. Mara Ellison's BC-7301 case will have no updates during shifts 2 through 12; do not invent progress while it is dormant.",
		},
		{
			role: 'user',
			content:
				'[Source ev-register] Customer/order register. Each entry is one continuing thread; a shared surname is not proof of identity.\nMara Ellison; account BC-4101; order BC-7301; subject ceramic filter breakage.\nIvo Mercer; account BC-4102; order BC-7302; subject meter delivery to a locked site.\nNadia Solano; account BC-4103; order BC-7303; subject duplicate bench-vise charge.\nTomas Wren; account BC-4104; order BC-7304; subject pump warranty diagnosis.\nLeonie Hart; account BC-4105; order BC-7305; subject cut cable quantity correction.\nOren Vale; account BC-4106; order BC-7306; subject credit-account release hold.\nCelia Quill; account BC-4107; order BC-7307; subject rental return and deposit.\nBram Fenwick; account BC-4108; order BC-7308; subject partial tool-kit cancellation.\nEsme Rowan; account BC-4109; order BC-7309; subject sensor compatibility exchange.\nDario Finch; account BC-4110; order BC-7310; subject backordered lamp allocation.\nAnika Moss; account BC-4111; order BC-7311; subject safety recall and replacement consent.\nSoren Ashby; account BC-4112; order BC-7312; subject year-end grant reimbursement evidence.\nThe register identifies the queued cases but does not supply approval, payment, or receipt evidence. Use the scheduled source messages and the lookup versions available at the time of the request.',
		},
		{
			role: 'user',
			content: '[Source endurance-day:2031-02-02] Current workday: 2031-02-02.',
		},
		{
			role: 'user',
			content:
				'[Source ev-source-1-1] [2031-02-02; Mara Ellison; BC-7301; document 1.1] Customer message, Mara Ellison: I ordered six ceramic filters for the Alderbrook repair workshop. Two arrived with cracks across the threaded neck; the other four passed our water test and are installed. The workshop has no need for replacement filters after the winter session. Please price a refund for the damaged pair only. The cardholder name matches my account, but the workshop treasurer controls the card. I can send photographs today; do not mistake my willingness to send them for receipt by your warehouse. The damaged pieces remain packed in the original cartons because our caretaker cannot dispose of them without written clearance.',
		},
		{
			role: 'user',
			content:
				'[Source ev-source-1-2] [2031-02-02; Mara Ellison; BC-7301; document 1.2] Invoice BC-7301, accounts clerk: Six filters at $42.50 each produce a merchandise subtotal of $255.00. The invoice applies a 10% merchandise discount before 8% tax. Freight is $18.00 and is not taxable. The customer paid $265.86. A refund for a damaged unit returns its discounted price and the associated tax. Freight is refundable only if every unit is unusable. No restocking deduction applies to damage confirmed by intake. The invoice has no credit already applied. Do not convert the remaining four installed units into a return claim merely to recover freight.',
		},
		{
			role: 'user',
			content:
				'[Source ev-source-1-3] [2031-02-02; Mara Ellison; BC-7301; document 1.3] Intake coordinator, document IN-7301: The reported cracks could have been caused in transit, but the photographs are not in the intake folder. The evidence required is a photograph showing both serial stickers and both cracked necks, plus a written count from the customer. A draft request can be sent to the account contact in the lookup. An approved refund requires the intake finding, not a carrier claim number. Keep the cartons until intake records whether a pickup is necessary. The carrier deadline expires after shift 14, and the support desk owns the reminder.',
		},
		{
			role: 'user',
			content:
				"[Source ev-source-1-4] [2031-02-02; Mara Ellison; BC-7301; document 1.4] Authorization desk, memo AU-7301: Mara may receive a damage-remedy draft while intake is pending. No one has authorized a refund posting. Team lead Dana Voss can approve up to $100.00 after the evidence arrives; larger amounts go to finance. The customer asked for email, not a telephone callback. Place the tentative amount, evidence gap, and approver in the work packet. This case will receive no external update until shift 13; absence of a message is not a denial, and another case's warehouse receipt cannot satisfy this one.",
		},
	],
	goal: "Shift 1 queue decision sheet for Mara Ellison, BC-7301, concerning ceramic filter breakage. Use only external evidence available at this boundary. Start a work record that later shifts can revise. Set a priority, name the immediate owner and blocker, and distinguish the next feasible action from an action that still lacks approval or evidence. Reconcile the active due tasks with the commitments in your previous shift's handoff. Include the long-running grant-evidence obligation if it is still open. Do not infer an external action from a draft you wrote.",
	records: [
		{
			content:
				'Invoice BC-7301; owner Mara Ellison; six ceramic filters; paid $265.86; no refund posted; intake photographs pending; contact mara@alderbrook.example.',
			id: 'order:BC-7301',
			name: 'Mara Ellison',
		},
		{
			content:
				'Account BC-4101; owner Mara Ellison; order BC-7301; authorized correspondence follows the account-contact notice in this case. Active email mara@alderbrook.example.',
			id: 'customer:BC-4101',
			name: 'Mara Ellison',
		},
	],
	agents: [
		'{"message":{"role":"assistant","content":"ok"},"done":false}\n{"message":{"role":"assistant","content":""},"done":true,"done_reason":"stop","prompt_eval_count":1827,"eval_count":2}\n',
		'{"message":{"role":"assistant","content":"ok"},"done":false}\n{"message":{"role":"assistant","content":""},"done":true,"done_reason":"stop","prompt_eval_count":1473,"eval_count":2}\n',
		'{"message":{"role":"assistant","content":"","tool_calls":[{"function":{"name":"lookup","arguments":{"id":"customer:BC-4101"}}},{"function":{"name":"lookup","arguments":{"id":"order:BC-7301"}}}]},"done":false}\n{"message":{"role":"assistant","content":""},"done":true,"done_reason":"stop","prompt_eval_count":2510,"eval_count":215}\n',
		'{"message":{"role":"assistant","content":"**Shift 1 Work Record – Mara Ellison, Order BC-7301 (Ceramic Filter Breakage)**\\n\\n**Priority:** High  \\n**Immediate Owner:** Intake Coordinator (IN-7301)  \\n**Blocker:** Missing intake evidence (photographs showing serial stickers and cracked necks + written customer count)  \\n\\n**Next Feasible Action:**  \\nSubmit the required intake evidence package to IN-7301 via email to mara@alderbrook.example. The draft request can be sent now, but no refund posting or approval has been granted yet.\\n\\n**Action Lacking Approval/Evidence:**  \\n- Drafting a refund posting (requires Team Lead Dana Voss’s approval after evidence is received).  \\n- Initiating a carrier claim (not required; intake finding is the sole basis for refund).  \\n\\n**Reconciliation with Prior Shift Commitments:**  \\n- This case was marked dormant in shifts 2–12 per opening note, but shift 1 has now initiated active work. The prior commitment to “no updates” does not apply once evidence collection begins.  \\n- The grant-evidence obligation for Soren Ashby (BC-7312) remains open and unchanged: assemble corrected legal-name documents and obtain grant-officer acceptance by end of shift 24. Payment and delivery are confirmed; only the invoice correction and grant acceptance remain pending.\\n\\n**Due Tasks:**  \\n1. Collect and submit intake evidence for BC-7301 (deadline: after shift 14).  \\n2. Await Team Lead Dana Voss’s approval (max $100.00) once evidence is received.  \\n3. Maintain the grant-evidence obligation for Soren Ashby until final acceptance.\\n\\n**Note:** Do not draft a refund posting or assume any external action has occurred. All postings require confirmed receipt and approval."},"done":false}\n{"message":{"role":"assistant","content":""},"done":true,"done_reason":"stop","prompt_eval_count":3271,"eval_count":384}\n',
	],
	judges: [
		'{"model":"hf.co/sky7350/Mica-v0.1-4B:Q4_K_M","done":true,"done_reason":"length","prompt_eval_count":300,"eval_count":1,"logprobs":[{"token":"B","logprob":-0.05,"top_logprobs":[{"token":"A","logprob":-6},{"token":"B","logprob":-0.05},{"token":"C","logprob":-6},{"token":"D","logprob":-6},{"token":"E","logprob":-6},{"token":"F","logprob":-6},{"token":"G","logprob":-6}]}]}',
		'{"model":"hf.co/sky7350/Mica-v0.1-4B:Q4_K_M","done":true,"done_reason":"length","prompt_eval_count":300,"eval_count":1,"logprobs":[{"token":"A","logprob":-0.05,"top_logprobs":[{"token":"A","logprob":-0.05},{"token":"B","logprob":-6},{"token":"C","logprob":-6},{"token":"D","logprob":-6},{"token":"E","logprob":-6},{"token":"F","logprob":-6},{"token":"G","logprob":-6}]}]}',
		'{"model":"hf.co/sky7350/Mica-v0.1-4B:Q4_K_M","done":true,"done_reason":"length","prompt_eval_count":300,"eval_count":1,"logprobs":[{"token":"B","logprob":-0.05,"top_logprobs":[{"token":"A","logprob":-6},{"token":"B","logprob":-0.05},{"token":"C","logprob":-6},{"token":"D","logprob":-6},{"token":"E","logprob":-6},{"token":"F","logprob":-6},{"token":"G","logprob":-6}]}]}',
		'{"model":"hf.co/sky7350/Mica-v0.1-4B:Q4_K_M","done":true,"done_reason":"length","prompt_eval_count":300,"eval_count":1,"logprobs":[{"token":"A","logprob":-0.05,"top_logprobs":[{"token":"A","logprob":-0.05},{"token":"B","logprob":-6},{"token":"C","logprob":-6},{"token":"D","logprob":-6},{"token":"E","logprob":-6},{"token":"F","logprob":-6},{"token":"G","logprob":-6}]}]}',
		'{"model":"hf.co/sky7350/Mica-v0.1-4B:Q4_K_M","done":true,"done_reason":"length","prompt_eval_count":300,"eval_count":1,"logprobs":[{"token":"A","logprob":-0.05,"top_logprobs":[{"token":"A","logprob":-0.05},{"token":"B","logprob":-6},{"token":"C","logprob":-6},{"token":"D","logprob":-6},{"token":"E","logprob":-6},{"token":"F","logprob":-6},{"token":"G","logprob":-6}]}]}',
		'{"model":"hf.co/sky7350/Mica-v0.1-4B:Q4_K_M","done":true,"done_reason":"length","prompt_eval_count":300,"eval_count":1,"logprobs":[{"token":"A","logprob":-0.05,"top_logprobs":[{"token":"A","logprob":-0.05},{"token":"B","logprob":-6},{"token":"C","logprob":-6},{"token":"D","logprob":-6},{"token":"E","logprob":-6},{"token":"F","logprob":-6},{"token":"G","logprob":-6}]}]}',
		'{"model":"hf.co/sky7350/Mica-v0.1-4B:Q4_K_M","done":true,"done_reason":"length","prompt_eval_count":300,"eval_count":1,"logprobs":[{"token":"A","logprob":-0.05,"top_logprobs":[{"token":"A","logprob":-0.05},{"token":"B","logprob":-6},{"token":"C","logprob":-6},{"token":"D","logprob":-6},{"token":"E","logprob":-6},{"token":"F","logprob":-6},{"token":"G","logprob":-6}]}]}',
		'{"model":"hf.co/sky7350/Mica-v0.1-4B:Q4_K_M","done":true,"done_reason":"length","prompt_eval_count":300,"eval_count":1,"logprobs":[{"token":"A","logprob":-0.05,"top_logprobs":[{"token":"A","logprob":-0.05},{"token":"B","logprob":-6},{"token":"C","logprob":-6},{"token":"D","logprob":-6},{"token":"E","logprob":-6},{"token":"F","logprob":-6},{"token":"G","logprob":-6}]}]}',
		'{"model":"hf.co/sky7350/Mica-v0.1-4B:Q4_K_M","done":true,"done_reason":"length","prompt_eval_count":300,"eval_count":1,"logprobs":[{"token":"Yes","logprob":-0.05,"top_logprobs":[{"token":"Yes","logprob":-0.05},{"token":"No","logprob":-6}]}]}',
		'{"model":"hf.co/sky7350/Mica-v0.1-4B:Q4_K_M","done":true,"done_reason":"length","prompt_eval_count":300,"eval_count":1,"logprobs":[{"token":"Yes","logprob":-0.05,"top_logprobs":[{"token":"Yes","logprob":-0.05},{"token":"No","logprob":-6}]}]}',
		'{"model":"hf.co/sky7350/Mica-v0.1-4B:Q4_K_M","done":true,"done_reason":"length","prompt_eval_count":300,"eval_count":1,"logprobs":[{"token":"Yes","logprob":-0.05,"top_logprobs":[{"token":"Yes","logprob":-0.05},{"token":"No","logprob":-6}]}]}',
		'{"model":"hf.co/sky7350/Mica-v0.1-4B:Q4_K_M","done":true,"done_reason":"length","prompt_eval_count":300,"eval_count":1,"logprobs":[{"token":"Yes","logprob":-0.05,"top_logprobs":[{"token":"Yes","logprob":-0.05},{"token":"No","logprob":-6}]}]}',
		'{"model":"hf.co/sky7350/Mica-v0.1-4B:Q4_K_M","done":true,"done_reason":"length","prompt_eval_count":300,"eval_count":1,"logprobs":[{"token":"Yes","logprob":-0.05,"top_logprobs":[{"token":"Yes","logprob":-0.05},{"token":"No","logprob":-6}]}]}',
		'{"model":"hf.co/sky7350/Mica-v0.1-4B:Q4_K_M","done":true,"done_reason":"length","prompt_eval_count":300,"eval_count":1,"logprobs":[{"token":"Yes","logprob":-0.05,"top_logprobs":[{"token":"Yes","logprob":-0.05},{"token":"No","logprob":-6}]}]}',
		'{"model":"hf.co/sky7350/Mica-v0.1-4B:Q4_K_M","done":true,"done_reason":"length","prompt_eval_count":300,"eval_count":1,"logprobs":[{"token":"Yes","logprob":-0.05,"top_logprobs":[{"token":"Yes","logprob":-0.05},{"token":"No","logprob":-6}]}]}',
		'{"model":"hf.co/sky7350/Mica-v0.1-4B:Q4_K_M","done":true,"done_reason":"length","prompt_eval_count":300,"eval_count":1,"logprobs":[{"token":"Yes","logprob":-0.05,"top_logprobs":[{"token":"Yes","logprob":-0.05},{"token":"No","logprob":-6}]}]}',
		'{"model":"hf.co/sky7350/Mica-v0.1-4B:Q4_K_M","done":true,"done_reason":"length","prompt_eval_count":300,"eval_count":1,"logprobs":[{"token":"Yes","logprob":-0.05,"top_logprobs":[{"token":"Yes","logprob":-0.05},{"token":"No","logprob":-6}]}]}',
	],
	independent: [
		{
			role: 'agent',
			ordinal: 0,
			bytes: 6900,
		},
		{
			role: 'agent',
			ordinal: 1,
			bytes: 6288,
		},
		{
			role: 'judge',
			ordinal: 0,
			bytes: 2043,
		},
		{
			role: 'judge',
			ordinal: 1,
			bytes: 2212,
		},
		{
			role: 'judge',
			ordinal: 2,
			bytes: 2640,
		},
		{
			role: 'judge',
			ordinal: 3,
			bytes: 1366,
		},
		{
			role: 'judge',
			ordinal: 4,
			bytes: 2023,
		},
		{
			role: 'judge',
			ordinal: 5,
			bytes: 1944,
		},
		{
			role: 'judge',
			ordinal: 6,
			bytes: 1946,
		},
		{
			role: 'judge',
			ordinal: 7,
			bytes: 1907,
		},
		{
			role: 'judge',
			ordinal: 8,
			bytes: 1643,
		},
		{
			role: 'judge',
			ordinal: 9,
			bytes: 1812,
		},
		{
			role: 'judge',
			ordinal: 10,
			bytes: 2240,
		},
		{
			role: 'judge',
			ordinal: 11,
			bytes: 966,
		},
		{
			role: 'judge',
			ordinal: 12,
			bytes: 1623,
		},
		{
			role: 'judge',
			ordinal: 13,
			bytes: 1544,
		},
		{
			role: 'judge',
			ordinal: 14,
			bytes: 1546,
		},
		{
			role: 'judge',
			ordinal: 15,
			bytes: 1507,
		},
		{
			role: 'judge',
			ordinal: 16,
			bytes: 1463,
		},
	],
	dependent: [
		{
			role: 'agent',
			ordinal: 2,
			bytes: 9639,
		},
		{
			role: 'agent',
			ordinal: 3,
			bytes: 10256,
		},
	],
})
