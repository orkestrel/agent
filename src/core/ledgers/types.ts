import type { AgentInterface, AgentOptions, AgentResult } from '../agents/index.js'
import type { ConversationInterface } from '../conversations/index.js'
import type {
	ChoiceQuestion,
	JudgeEntry,
	JudgeInterface,
	Message,
	MessageRole,
	NoulQuestion,
} from '../types.js'
import type { LEDGER_CATEGORIES } from './constants.js'
import type { TokenUsage } from '@orkestrel/budget'
import type { ToolInterface } from '@orkestrel/tool'

/** Names the category the ledger files a message under, one of {@link LEDGER_CATEGORIES}. */
export type LedgerCategory = (typeof LEDGER_CATEGORIES)[number]

/**
 * Carries the wording of every question the ledger asks its judge.
 *
 * @remarks
 * `category` is the choice question asked about each message the category handler leaves open; its
 * criteria name every {@link LedgerCategory}. `topic` is the instructions of the noul question
 * asked for each desk topic, whose criteria the ledger frames from the topic, as
 * {@link LedgerTopic} states. `amends` and `supersedes` are the noul questions asked about an
 * earlier and a later message. The ledger asks each question as given, so a judgment reused across
 * ledgers matches only under the same wording. Pass the `LEDGER_QUESTIONS` constant for the
 * measured wording.
 */
export interface LedgerQuestion {
	readonly category: ChoiceQuestion & {
		readonly criteria: Readonly<Record<LedgerCategory, JudgeEntry>>
	}
	readonly topic: string
	readonly amends: NoulQuestion
	readonly supersedes: NoulQuestion
}

/**
 * Carries the probability cutoff of each reading the ledger takes from its judge.
 *
 * @remarks
 * `category` decides a category and the quiet and decisive groups; `topic` decides a desk topic;
 * `amends` and `supersedes` decide a pair. `correction` is the lower floor a message's `correction`
 * probability must reach before the ledger asks the pair questions about it. Each cutoff must be
 * finite, greater than 0, and at most 1. No default is supplied: a cutoff holds only for the
 * question wording and the judge it was fitted on.
 */
export interface LedgerThreshold {
	readonly category: number
	readonly topic: number
	readonly amends: number
	readonly supersedes: number
	readonly correction: number
}

/**
 * Carries one desk topic: the subject the ledger asks its judge about for every message.
 *
 * @remarks
 * The ledger asks the {@link LedgerQuestion} `topic` instructions with the criteria
 * `The message concerns NAME: CRITERION` for true and `The message does not concern NAME` for
 * false, where `NAME` is `name` and `CRITERION` is `criterion`. `name` must be non-empty and
 * unique among the ledger's topics.
 */
export interface LedgerTopic {
	readonly name: string
	readonly criterion: string
	/**
	 * If `true`, the ledger asks this topic about each request as well as about each statement;
	 * if `false`, it asks it about statements only. Default: `true`.
	 */
	readonly requests?: boolean
}

/**
 * Carries the share of the context capacity the prompt can take and the share of that budget the
 * tail can take.
 *
 * @remarks
 * `prompt` is a share of the ledger's `capacity`; the fixed tokens of the gauge come out of it
 * before the briefing and the tail take the rest. `tail` is a share of what remains for messages.
 * Each share must be finite, greater than 0, and at most 1.
 */
export interface LedgerShare {
	readonly prompt: number
	readonly tail: number
}

/**
 * Carries the text of each note the ledger writes into its conversation or returns to the model.
 *
 * @remarks
 * `cue` is the last user message of an answer pass. `results` heads the note that carries what the
 * first pass's lookups and recalls returned. `repeat` is the failure a repeated tool call returns,
 * and the ledger reads a failure with exactly this text as a repeat. `closed` is the failure a
 * `recall` call returns after the request's recalls are spent, repeated, or out of room.
 */
export interface LedgerNote {
	readonly cue: string
	readonly results: string
	readonly repeat: string
	readonly closed: string
}

/**
 * Configures the ledger's `recall` tool.
 *
 * @remarks
 * `limit` caps the `recall` calls one request can make before the tool refuses with the
 * {@link LedgerNote} `closed` text; it must be a nonnegative safe integer. Default: the
 * `DEFAULT_RECALL_LIMIT` constant. `description` replaces the tool description the ledger builds
 * from its topics.
 * Recall identity is the trimmed `{ topic }` alone; other arguments do not change its identity.
 */
export interface LedgerRecallOptions {
	readonly limit?: number
	readonly description?: string
}

/**
 * Carries one owner a lookup result names: its id and the names it goes by.
 *
 * @remarks
 * An owner is the party a record collects statements about, such as a customer account. `names`
 * can be empty when the result names the owner by id alone.
 */
export interface LedgerOwner {
	readonly id: string
	readonly names: readonly string[]
}

/** Carries what a lookup handler read from one lookup result: the ids it names and the owners among them. */
export interface LedgerLookupResult {
	readonly ids: readonly string[]
	readonly owners: readonly LedgerOwner[]
}

/**
 * Reads one successful lookup result into the ids and owners it names.
 *
 * @param args - The arguments the model called the lookup with
 * @param text - The result text the tool returned
 * @returns The ids and owners the result names, or undefined when the lookup found nothing
 *
 * @example
 * ```ts
 * const read: LedgerLookupHandler = (args, text) => {
 * 	if (text.startsWith('No record')) return undefined
 * 	const id = String(args.id ?? '').trim().toUpperCase()
 * 	return { ids: [id], owners: [{ id, names: [] }] }
 * }
 * ```
 */
export type LedgerLookupHandler = (
	args: Readonly<Record<string, unknown>>,
	text: string,
) => LedgerLookupResult | undefined

/**
 * Carries one application lookup: the tool the model calls and the handler that reads its results.
 *
 * @remarks
 * The ledger registers the tool behind a repeat stop beside its own `recall` tool, so the tool must
 * not be named `recall`, and no two lookups can share a tool name.
 * A throwing `read` handler makes the lookup failed: it files as chatter and replaces no reading.
 * A seed tool message with no recorded result counts as a successful lookup.
 */
export interface LedgerLookup {
	readonly tool: ToolInterface
	readonly read: LedgerLookupHandler
}

/**
 * Carries one successful lookup result as the ledger read it.
 *
 * @remarks
 * `id` is the tool message's id, `name` and `arguments` come from the call it answers, and `text`
 * is the result text. `result` is what the lookup's handler read, undefined for a lookup that found
 * nothing; an empty reading still replaces an earlier reading of the same call.
 */
export interface LedgerLookupReading {
	readonly id: string
	readonly name: string
	readonly arguments: Readonly<Record<string, unknown>>
	readonly text: string
	readonly result: LedgerLookupResult | undefined
}

/** Names what became of a lookup of an earlier request, as the tail stub of its result reports it. */
export type LedgerLookupState = 'failed' | 'empty' | 'shown' | 'hidden'

/**
 * Carries the ids the ledger's lookups named and the owners among them.
 *
 * @remarks
 * `ids` holds every id a lookup argument or result named, owner ids included. `owners` maps each
 * owner id to its names in the order the lookups returned them, so a record's title takes the first
 * name read.
 */
export interface LedgerRegistry {
	readonly ids: ReadonlySet<string>
	readonly owners: ReadonlyMap<string, readonly string[]>
}

/**
 * Carries the price of a prompt in tokens, measured against the model the ledger serves.
 *
 * @remarks
 * `scale` is the tokens one unit of the `estimateMessages` estimate costs. `fixed` is the tokens
 * every request carries beyond its messages, such as the tool definitions and the chat framing.
 * `scale` must be finite and greater than 0, and `fixed` finite and at least 0.
 */
export interface LedgerGauge {
	readonly scale: number
	readonly fixed: number
}

/**
 * Selects the agent bounds and hooks a ledger passes through to the agent it builds.
 *
 * @remarks
 * `limit` must be a nonnegative safe integer. Default: the `DEFAULT_LEDGER_LIMIT` constant. The
 * ledger owns every other agent option: the conversation, the tools, the selection handler, and
 * the scope.
 */
export type LedgerAgentOptions = Pick<
	AgentOptions,
	'limit' | 'timeout' | 'budget' | 'signal' | 'on' | 'error'
>

/**
 * Configures a ledger: its judge and the wording and cutoffs it files with, the desk topics, the
 * context capacity, and the optional lookups, gauge, shares, recall, notes, and agent bounds.
 *
 * @remarks
 * `judge` answers every filing question. `system` is the application's system text, a date
 * sentence included; the briefing follows it in the system message. `topics` lists the desk
 * topics. `questions` and `thresholds` are required with no default; pass the `LEDGER_QUESTIONS`
 * constant for the measured wording, and fit `thresholds` on the wording and the judge you pass. `capacity` is the model's context window in tokens and must be a positive safe
 * integer. Without `gauge`, the ledger calibrates before its first pass. `share` and `notes`
 * default leaf by leaf to the `DEFAULT_LEDGER_SHARE` and `LEDGER_NOTES` constants.
 */
export interface LedgerOptions {
	readonly judge: JudgeInterface
	readonly system: string
	readonly topics: readonly LedgerTopic[]
	readonly questions: LedgerQuestion
	readonly thresholds: LedgerThreshold
	readonly capacity: number
	readonly gauge?: LedgerGauge
	readonly lookups?: readonly LedgerLookup[]
	readonly share?: Partial<LedgerShare>
	readonly recall?: LedgerRecallOptions
	readonly notes?: Partial<LedgerNote>
	readonly agent?: LedgerAgentOptions
}

/**
 * Carries the outcome of one request a ledger served: the agent result of its reply and every pass
 * it took.
 *
 * @remarks
 * `passes` holds the first pass and, when the ledger ran one, the answer pass. `content` and
 * `partial` are the last pass's, `usage` sums the passes' usage, and `thinking` joins the passes'
 * reasoning; each optional member is present when any pass reported it.
 */
export interface LedgerResult extends AgentResult {
	readonly passes: readonly AgentResult[]
}

/**
 * Serves the requests of one conversation through an agent whose prompt the ledger projects from
 * what the judge filed.
 *
 * @remarks
 * The ledger files every message of its conversation through the injected judge, projects the
 * owner records and the rules record from that filing, and sends a briefing and a tail that fit
 * its capacity. It owns its agent: applying a scope that carries `select` displaces the ledger's
 * selection handler.
 */
export interface LedgerInterface {
	/** Holds the agent the ledger drives, with the ledger's tools and selection handler. */
	readonly agent: AgentInterface
	/** Holds the one conversation the ledger files and serves. */
	readonly conversation: ConversationInterface
	/** Holds the measured price of a prompt, or undefined until the ledger calibrates when the options supplied none. */
	readonly gauge: LedgerGauge | undefined
	/**
	 * Appends `content` as a user message and serves it through to its reply.
	 *
	 * @remarks
	 * The ledger calibrates first while `gauge` is undefined. When the first pass ends without final
	 * text and the caller did not abort, the ledger adds the results and cue notes and makes one
	 * answer pass that advertises no tools. A call while another is in flight rejects with an
	 * `AgentError` whose `code` is `'CONCURRENCY'`. A failed calibration rejects with
	 * `LedgerError` code `'GAUGE'`.
	 *
	 * @param content - The request text
	 * @param signal - An optional caller signal; an abort during calibration rejects with its reason; afterward it ends the request partial and skips the answer pass
	 * @returns The reply and the passes the request took
	 * @throws {LedgerError} Thrown when calibration fails (code `'GAUGE'`)
	 * @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
	 */
	respond(content: string, signal?: AbortSignal): Promise<LedgerResult>
	/**
	 * Measures the gauge, holds it as `gauge`, and returns it.
	 *
	 * @remarks
	 * The ledger sends its system message and its conversation's view to the provider twice, with
	 * and without the tool definitions. The call without tools prices the messages and the
	 * difference between the calls is the fixed cost.
	 * An abort during calibration rejects with the abort reason. A call during `respond` or `calibrate` rejects
	 * with `AgentError` code `'CONCURRENCY'`.
	 *
	 * @param signal - The signal that aborts both calls
	 * @returns The measured gauge
	 * @throws {LedgerError} Thrown when a call reports no prompt usage, or a prompt usage of 0 or less (code `'GAUGE'`)
	 * @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
	 */
	calibrate(signal: AbortSignal): Promise<LedgerGauge>
}

/**
 * Carries the id-shaped tokens and the numbers of a text.
 *
 * @remarks
 * `ids` holds the uppercased hyphenated tokens that contain a digit. `numbers` holds the numbers
 * outside those ids, with grouping commas removed.
 */
export interface LedgerTokenSet {
	readonly ids: ReadonlySet<string>
	readonly numbers: ReadonlySet<number>
}

/**
 * Carries the ledger's filing of its conversation's messages, keyed by message id.
 *
 * @remarks
 * `quiet` holds the messages the projection leaves out. `categories` maps each decided message to
 * its category and `topics` to its desk topics. `amended` and `superseded` map an earlier message
 * to the later messages that replace part or all of it, in conversation order.
 */
export interface LedgerClassification {
	readonly quiet: ReadonlySet<string>
	readonly categories: ReadonlyMap<string, LedgerCategory>
	readonly topics: ReadonlyMap<string, readonly string[]>
	readonly amended: ReadonlyMap<string, readonly string[]>
	readonly superseded: ReadonlyMap<string, readonly string[]>
}

/**
 * Carries one record line: a verbatim sentence of a live message.
 *
 * @remarks
 * `source` is the message id and `sentence` the zero-based index of the sentence in it. `party` is
 * the person a sentence that opens with a pronoun refers to, read from the sentence before it;
 * `text` then opens with `party` and a colon. `topics` are the source's desk topics and `role` its
 * role.
 */
export interface LedgerLine {
	readonly text: string
	readonly source: string
	readonly sentence: number
	readonly party?: string
	readonly topics: readonly string[]
	readonly role: MessageRole
}

/**
 * Carries one record: the live messages placed on one owner or on the rules, as lines.
 *
 * @remarks
 * `key` is `rules` for the rules record and `owner:` followed by the owner id for an owner record.
 * `title` is `Rules`, or the owner's first name with its id. `members` lists the placed message ids
 * in conversation order.
 */
export interface LedgerRecord {
	readonly key: string
	readonly title: string
	readonly members: readonly string[]
	readonly lines: readonly LedgerLine[]
}

/**
 * Carries one sentence a later message made stale, with the tokens the two share.
 *
 * @remarks
 * `source` is the earlier message's id and `sentence` the zero-based index of the sentence. The
 * projection leaves a stale sentence out of every record and every route to the model.
 */
export interface LedgerStaleSentence {
	readonly source: string
	readonly sentence: number
	readonly tokens: readonly string[]
}

/**
 * Carries the records projected from a conversation, the stale sentences, and the live messages no
 * record placed.
 */
export interface LedgerProjection {
	readonly records: readonly LedgerRecord[]
	readonly stale: readonly LedgerStaleSentence[]
	readonly loose: readonly string[]
}

/**
 * Carries what a projection reads.
 *
 * @remarks
 * `system` is the system text, whose names never serve as a party. `exclude` lists the message ids
 * no record places, such as requests and ledger notes. `owners` maps each owner id to its names.
 * `readings` lists the lookup results in conversation order, and `entities` maps a message id to
 * the registry ids its text names.
 */
export interface LedgerProjectionInput {
	readonly system: string
	readonly exclude: readonly string[]
	readonly owners: ReadonlyMap<string, readonly string[]>
	readonly messages: readonly Message[]
	readonly readings: readonly LedgerLookupReading[]
	readonly entities: ReadonlyMap<string, readonly string[]>
	readonly classification: LedgerClassification
}

/** Carries the owners and the desk topics one request names, which select its records. */
export interface LedgerProjectionRequest {
	readonly owners: readonly string[]
	readonly topics: readonly string[]
}

/**
 * Reads a message's category from its shape, or returns undefined to leave it to the judge.
 *
 * @param message - The message to file
 * @returns The category the message's shape decides, or undefined
 */
export type LedgerCategoryHandler = (message: Message) => LedgerCategory | undefined

/**
 * Lists the registry ids and owner ids a text names.
 *
 * @param text - The text to read
 * @param partial - If `true`, a name word that only one owner name carries also names that owner; if `false`, only a whole name does
 * @returns The ids the text names
 */
export type LedgerEntityHandler = (text: string, partial: boolean) => ReadonlySet<string>

/**
 * Configures a classifier: the conversation it files, the judge and the wording it asks with, the
 * desk topics, the cutoffs, and the ledger's handlers.
 *
 * @remarks
 * `assign` decides the category of a message the ledger wrote or a tool returned, without a
 * question. `entities` names the registry ids a text carries, which decide the pairs it asks about.
 */
export interface ClassifierOptions {
	readonly conversation: ConversationInterface
	readonly judge: JudgeInterface
	readonly questions: LedgerQuestion
	readonly topics: readonly LedgerTopic[]
	readonly thresholds: LedgerThreshold
	readonly assign: LedgerCategoryHandler
	readonly entities: LedgerEntityHandler
}

/** Carries the judgment keys one classification rests on and the judge usage it spent. */
export interface ClassifierResult {
	readonly judgments: readonly string[]
	readonly usage?: TokenUsage
	/** Holds the error when a throw or caller abort interrupts classification; judgments and usage retain the partial result. */
	readonly fault?: Error
}

/**
 * Files a conversation's messages through a judge and reads the filing.
 *
 * @remarks
 * Every reading derives from the conversation's recorded judgments and the cutoffs; the classifier
 * stores only the failures it holds. A judge error leaves its item undecided.
 */
export interface ClassifierInterface {
	/**
	 * Asks every filing question the conversation's judgments lack an answer for.
	 *
	 * @param requests - The ids of the user messages the ledger serves as requests
	 * @param signal - The signal that aborts the questions; completed judgments stay recorded
	 * @returns The judgment keys and usage spent; any throw or caller abort during classification returns the partial result with `fault`
	 */
	classify(requests: ReadonlySet<string>, signal: AbortSignal): Promise<ClassifierResult>
	/**
	 * Returns the category a message is filed under, or undefined when no category reaches its cutoff.
	 *
	 * @param id - The id of the message
	 * @returns The category, or undefined
	 */
	category(id: string): LedgerCategory | undefined
	/**
	 * Returns true if the message is filed as quiet; false otherwise.
	 *
	 * @param id - The id of the message
	 * @returns Whether the message is quiet
	 */
	quiet(id: string): boolean
	/**
	 * Returns true if the message is filed as decisive; false otherwise.
	 *
	 * @param id - The id of the message
	 * @returns Whether the message is decisive
	 */
	decisive(id: string): boolean
	/**
	 * Returns the desk topics the message is filed under.
	 *
	 * @param id - The id of the message
	 * @returns The names of the message's desk topics
	 */
	topics(id: string): ReadonlySet<string>
	/**
	 * Returns the filing of every message in the conversation.
	 *
	 * @returns The classification of the conversation
	 */
	classification(): LedgerClassification
}

/**
 * Carries one agent call as the gauge reads it.
 *
 * @remarks
 * `estimate` is the `estimateMessages` estimate of the call's messages. `prompt` and `completion`
 * are the tokens the provider reported, absent when it reported none. `tools` is the count of tool
 * definitions the call advertised.
 */
export interface GaugeCall {
	readonly estimate: number
	readonly prompt?: number
	readonly completion?: number
	readonly tools: number
}

/** Configures a gauge: its starting price of a prompt and the context capacity it measures against. */
export interface GaugeOptions extends LedgerGauge {
	readonly capacity: number
}

/**
 * Prices prompts in tokens and measures the room a request has left.
 *
 * @remarks
 * `scale` and `fixed` hold the price the gauge read from its last observation.
 */
export interface GaugeInterface extends LedgerGauge {
	/**
	 * Returns the tokens the messages cost at the current scale.
	 *
	 * @param messages - The messages to price
	 * @returns The cost in tokens
	 */
	measure(messages: readonly Message[]): number
	/**
	 * Returns the tokens one more estimate unit adds within a request, fitted over the observed calls.
	 *
	 * @param calls - The calls of the request so far
	 * @returns The tokens one estimate unit adds
	 */
	rate(calls: readonly GaugeCall[]): number
	/**
	 * Returns the tokens of the capacity the last call left.
	 *
	 * @param calls - The calls of the request so far
	 * @returns The tokens left
	 */
	left(calls: readonly GaugeCall[]): number
	/**
	 * Returns the tokens a reply turn needs after the calls, given the longest reply text written so far.
	 *
	 * @param calls - The calls of the request so far
	 * @param longest - The longest reply text written so far
	 * @returns The tokens to reserve
	 */
	reserve(calls: readonly GaugeCall[], longest: string): number
	/**
	 * Returns the estimate units a recall result can take without taking the reply's room.
	 *
	 * @param calls - The calls of the request so far
	 * @param longest - The longest reply text written so far
	 * @returns The estimate units available
	 */
	room(calls: readonly GaugeCall[], longest: string): number
	/**
	 * Rescales from a completed request's first call and keeps its calls and the final reply's completion.
	 *
	 * @param calls - The calls of the completed request
	 * @param reply - The call that delivered the final answer, absent when no final answer was delivered
	 */
	observe(calls: readonly GaugeCall[], reply?: GaugeCall): void
}

/** Names the machine-readable conditions a `LedgerError` error reports. */
export type LedgerErrorCode =
	/** Reports a threshold that is not finite or lies outside the interval above 0 up to and including 1. */
	| 'THRESHOLD'
	/** Reports a share that is not finite or lies outside the interval above 0 up to and including 1. */
	| 'SHARE'
	/** Reports a capacity that is not a positive safe integer. */
	| 'CAPACITY'
	/** Reports a recall limit or an agent limit that is not a nonnegative safe integer. */
	| 'LIMIT'
	/** Reports a topic with an empty name or a name another topic carries. */
	| 'TOPIC'
	/** Reports a lookup tool named `recall` or a name another lookup tool carries. */
	| 'LOOKUP'
	/** Reports a supplied gauge outside its bounds, or a calibration call that reports no prompt usage, or a prompt usage of 0 or less. */
	| 'GAUGE'
