import type { TokenUsage } from '@orkestrel/budget'
// The vendored build is the one import of the agent in bench5; repoint this path when a later build is vendored.
import type {
	AgentInterface,
	ClassifierInterface,
	ConversationInterface,
	JudgeAnswer,
	JudgeEntry,
	JudgeInterface,
	JudgeQuestion,
	JudgeRequest,
	JudgeResult,
	LedgerInterface,
	LedgerLine,
	LedgerLookupReading,
	LedgerProjection,
	LedgerProjectionInput,
	LedgerQuestion,
	LedgerRegistry,
	LedgerThreshold,
	LedgerTopic,
	Message,
	MessageRole,
	ProviderInterface,
	Refusal,
} from '../vendor/agent-0.0.30-trimmed/index.js'
import type { Aggregator } from './aggregates/Aggregator.js'
import type { JudgeCache } from './JudgeCache.js'
import type { MatrixExecution, MatrixFailure, MatrixFreeze, MatrixRequest } from './matrix/types.js'
import type { SustainedExecution } from './sustained/types.js'
import type { EnduranceRuntime } from './endurance/types.js'

export type JudgeState = JudgeRequest['state']

/** Holds scored phrases and forbidden text actually carried by an input. */
export interface ScoreCarriers {
	readonly expected: readonly string[]
	readonly stale: readonly string[]
}

export type CacheOrigin = 'corpus' | 'live'

export type CallRole = 'agent' | 'judge' | 'summarizer' | 'flush'

export type ArchiveArm = 'control' | 'aggregate'

export type RunArm = 'records' | 'aggregate' | 'full'

export type ReplyVia = 'none' | 'answered' | 'final'

export type AssignCategory = 'fact' | 'chatter'

/** Holds one judge answer under the content key of its model, state, and question. */
export interface CacheRow {
	readonly context?: string
	readonly key: string
	readonly model: string
	readonly state: JudgeState
	readonly question: JudgeQuestion
	readonly answer?: JudgeAnswer
	readonly refusal?: Refusal
	readonly error?: string
	readonly usage?: TokenUsage
	readonly wall: number
	readonly origin: CacheOrigin
	readonly at: number
}

/** Configures a judge cache over one rows file. */
export interface JudgeCacheOptions {
	readonly judge: JudgeInterface
	readonly path: string
	readonly live: boolean
	/** Holds the number of repeats a live miss gets after a transient error. */
	readonly retry: number
	/** Receives the fault after the retries end, so the owner of the run can abort it. */
	readonly abort?: (fault: Error) => void
}

/** Counts a cache's questions by head, plus the transient judge errors it saw. */
export interface JudgeStats {
	readonly hits: Readonly<Record<string, number>>
	readonly misses: Readonly<Record<string, number>>
	readonly transient: number
}

export interface Settings {
	readonly allowance: number
	readonly retry: number
	readonly predict: number
}

export interface Fit {
	readonly change: number
	readonly agree: number
	readonly separated: boolean
}

export interface PlanEntry {
	readonly name: string
	readonly harness: string
	readonly estimate: number
	readonly args: readonly string[]
}

/** Holds one request that a run sent to the daemon, as one line of `calls.jsonl`. */
export interface CallRecord {
	/** Distinguishes a sent request from a refused local observation. */
	readonly sent?: boolean
	readonly turn?: number
	/** Holds the request's position among the run's requests, which is also the number of its wire files. */
	readonly sequence: number
	readonly role: CallRole
	/** Holds the goal being served, or `undefined` for a calibration call and a seed-pass call. */
	readonly goal: string | undefined
	readonly started: number
	readonly wall: number
	/** Holds the HTTP status, or `undefined` when the request threw before a response. */
	readonly status: number | undefined
	readonly error?: string
	/** Holds the estimate read from the context at the ledger's turn event, before the provider call. */
	readonly estimate?: number
}

/** Holds one message of a selection's tail as seed index, role, and content, because message ids differ between runs. */
export interface TailMessage {
	/** Holds the seed index, or `undefined` for a request, a reply, and a tool message the run added. */
	readonly index: number | undefined
	readonly role: string
	readonly content: string
}

/** Holds one `select` event of the agent, as one line of `selections.jsonl`. */
export interface SelectionRecord {
	/** Binds each admitted body to its completed maintenance state; absent in archived recordings. */
	readonly aggregates?: readonly AggregateBinding[]
	readonly goal: string
	/** Holds the position of the event among the goal's events: 1 for the first pass, 2 for the answer pass. */
	readonly pass: number
	readonly sequence: number
	readonly briefing: string
	readonly digest: string
	readonly tail: readonly TailMessage[]
	/** Holds the content of each instruction the prompt carries, by name. */
	readonly instructions: Readonly<Record<string, string>>
	readonly scale: number | undefined
}

/** Holds the questions one goal asked of the judge for one head: the answers it asked fresh and the answers its rows held. */
export interface QuestionCount {
	readonly fresh: number
	readonly hits: number
}

/** Holds what the briefing and tail of a goal's first select carry. */
export interface BriefingReading {
	/** Holds the briefing's estimate times the gauge scale. */
	readonly tokens: number
	/** Counts the goal's facts whose live text renders in the briefing or the tail. */
	readonly facts: number
	/** Counts the tokens of the goal's stale sentences that no fact carries, plus the forbidden phrases, that the briefing or the tail shows. */
	readonly stale: number
	readonly digest: string
}

/** Holds the recalls of a goal. */
export interface RecallCount {
	readonly calls: number
	readonly closed: number
	/** Holds the tokens of the first recall result, or `undefined` when no recall returned text. */
	readonly size: number | undefined
	/** Names why recall closed: the limit of recalls, or the room left in the window; `undefined` when it stayed open. */
	readonly cause: 'limit' | 'room' | undefined
}

/** Holds the lookups of a goal. */
export interface LookupCount {
	readonly calls: number
	readonly repeats: number
}

/** Holds one goal's outcome and measurements as one line of a run's `rows.jsonl`. */
export interface Row {
	/** Holds l6 resource invalidity separately from scorer outcomes; absent in archives. */
	readonly resource?: readonly MatrixFailure[]
	readonly goal: string
	readonly copy: number
	readonly model: string
	readonly arm: RunArm
	readonly success: boolean
	readonly reply: string
	readonly via: ReplyVia
	readonly missing: readonly string[]
	readonly violations: readonly string[]
	readonly patterns: readonly string[]
	readonly passes: number
	readonly usage: TokenUsage | undefined
	readonly partial: boolean | undefined
	readonly error: string | undefined
	/** Counts the goal's agent requests that threw or answered with a status of 400 or more. */
	readonly faults: number
	/** Holds the agent's wall in milliseconds: the `respond` call less the aggregate stage and the flush. */
	readonly wall: number
	/** Holds the wall of the aggregate stage in milliseconds; 0 in the control arm. */
	readonly stage: number
	/** Holds the wall of the prefix flush in milliseconds. */
	readonly flush: number
	/** Holds the sequence of the goal's first request. */
	readonly first: number
	/** Holds the sequence of the goal's last request. */
	readonly last: number
	/** Holds the largest prompt token count among the goal's agent calls. */
	readonly prompt: number
	/** Holds the prompt token count of the goal's first agent call, or `undefined` when none reported it. */
	readonly entry: number | undefined
	/** Reports a prompt at or over the window, or a context error. */
	readonly overflow: boolean
	readonly recalls: RecallCount
	readonly lookups: LookupCount
	readonly questions: Readonly<Record<string, QuestionCount>>
	readonly briefing: BriefingReading
	/** Holds `ledger.gauge.scale` before the goal's `respond`. */
	readonly scale: number
	/** Holds the digest of the first select's tail as seed index, role, and content. */
	readonly tail: string
	/** Lists the topic keys the summaries block rendered. */
	readonly rendered: readonly string[]
	/** Lists the topic keys the allowance cut from the block. */
	readonly cut: readonly string[]
	/** Lists the topic keys a failed build withheld. */
	readonly withheld: readonly string[]
	/** Lists the topic keys whose prose the render filter emptied. */
	readonly emptied: readonly string[]
	/** Holds the tokens of the rendered summaries block. */
	readonly summary: number
	/** Counts the sentences the render filter dropped. */
	readonly filtered: number
	/** Counts the tokens that only the summaries block carried. */
	readonly sole: number
}

export interface ScenarioDay {
	readonly date: string
	readonly from: number
}

export interface ScenarioLookup {
	readonly tool: string
	readonly id: string
	readonly from: number
	readonly text: string
}

/** Holds the lookup tables a copy carries: the base text per tool and id, and the versions that start at a seed index. */
export interface ScenarioLookups {
	readonly tools: Readonly<Record<string, Readonly<Record<string, string>>>>
	readonly lookups: readonly ScenarioLookup[]
}

export interface ScenarioSystem {
	readonly ledger: { readonly system: string }
}

export interface SeedCall {
	readonly id: string
	readonly name: string
	readonly arguments: Readonly<Record<string, unknown>>
}

export interface SeedMessage {
	readonly role: MessageRole
	readonly content: string
	readonly calls?: readonly SeedCall[]
	readonly call?: string
}

export interface StateMessage {
	readonly role: string
	readonly content: string
}

export interface TopicSpec {
	readonly name: string
	readonly criterion: string
}

export interface QuestionSet {
	readonly category: {
		readonly instructions?: JudgeEntry
		readonly criteria: Readonly<Record<string, JudgeEntry | null>>
	}
	readonly topic: string
	readonly amends: JudgeQuestion
	readonly supersedes: JudgeQuestion
}

export interface LookupOwner {
	readonly id: string
	readonly names: readonly string[]
}

export interface LookupReading {
	readonly ids: readonly string[]
	readonly owners: readonly LookupOwner[]
}

export interface AssignMessage {
	readonly id: string
	readonly role: string
	readonly calls?: readonly unknown[]
}

export interface AssignResult {
	readonly success: boolean
}

/** Holds one row of `data/cal-categories.jsonl` as the importer reads it. */
export interface CorpusRow {
	readonly question: string
	readonly order?: string
	readonly index?: number
	readonly topic?: string
	readonly earlier?: number
	readonly later?: number
	readonly probabilities?: Readonly<Record<string, number>>
	readonly p?: number
	readonly refusal?: unknown
	readonly error?: string
	readonly asked?: string
	readonly ms?: number
}

/** Holds the state and question that a corpus row's judgment was asked under. */
export interface CorpusQuery {
	readonly state: string
	readonly question: JudgeQuestion
}

/** Configures a summarizer over one rows file. */
export interface SummarizerOptions {
	/** Holds the provider that generates the prose; it must send the sampler and `num_predict` that the options carry. */
	readonly provider: ProviderInterface
	readonly model: string
	readonly sampler: Readonly<Record<string, number>>
	/** Holds the generation cap in tokens, `num_predict`. */
	readonly predict: number
	/** Holds the path of the rows file. */
	readonly cache: string
	readonly live: boolean
}

/** Holds one summary under the content key of its model, sampler, cap, and messages. */
export interface SummaryRow {
	readonly key: string
	readonly model: string
	readonly sampler: Readonly<Record<string, number>>
	readonly predict: number
	readonly prose: string
	readonly raw: string
	readonly usage?: TokenUsage
	readonly wall: number
	readonly origin: CacheOrigin
	readonly at: number
}

/** Holds the outcome of one summary call. */
export interface SummaryResult {
	readonly prose: string
	readonly raw: string
	readonly usage: TokenUsage | undefined
	readonly wall: number
	readonly cached: boolean
}

/** Generates aggregate prose from a message list and answers a repeated list from a rows file. */
export interface SummarizerInterface {
	summarize(messages: readonly Message[], signal: AbortSignal): Promise<SummaryResult>
}

/** Reads the ids and owners that one lookup result names. */
export type MirrorRead = (
	args: Readonly<Record<string, unknown>>,
	text: string,
) => LookupReading | undefined

export type MirrorTopic = LedgerTopic

export type MirrorThresholds = LedgerThreshold

export type MirrorFiler = ClassifierInterface

export type MirrorInput = LedgerProjectionInput

export type MirrorProjection = LedgerProjection

export type MirrorLine = LedgerLine

export type MirrorReading = LedgerLookupReading

/** Holds the two members of a ledger that the mirror reads. */
export interface MirrorLedger {
	readonly agent: AgentInterface
	readonly conversation: ConversationInterface
}

/** Configures a mirror with the judge, wording, topics, cutoffs, system text, and lookup readers that the ledger runs with. */
export interface MirrorOptions {
	readonly judge: JudgeInterface
	readonly questions: LedgerQuestion
	readonly topics: readonly MirrorTopic[]
	readonly thresholds: MirrorThresholds
	readonly system: string
	readonly reads: ReadonlyMap<string, MirrorRead>
}

/** Rebuilds the projection input and the filing that the ledger's private projection and plan read. */
export interface MirrorInterface {
	note(request: Message): void
	assign(message: Message): AssignCategory | undefined
	readings(): readonly MirrorReading[]
	input(): MirrorInput
	projection(input?: MirrorInput): MirrorProjection
	lines(id: string, input?: MirrorInput, projection?: MirrorProjection): readonly MirrorLine[]
	near(request: Message): ReadonlySet<string>
	owners(request: Message): readonly string[]
}

/** Answers questions as a judge and counts the questions it answered from its rows. */
export interface JudgeCacheInterface extends JudgeInterface {
	ask(request: JudgeRequest, signal: AbortSignal, context?: string): Promise<JudgeResult>
	stats(): JudgeStats
}

export type AggregateTrigger =
	| 'first'
	| 'removed'
	| 'change'
	| 'check'
	| 'retry'
	| 'unchanged'
	| 'retained'

export type AggregateEvent = 'build' | 'agree' | 'change' | 'withhold' | 'keep' | 'retire' | 'fail'

export type AggregateStatus = 'current' | 'stale' | 'withheld' | 'retired' | 'failed'

export type AggregateCheck = 'empty' | 'id' | 'number' | 'name' | 'stale' | 'agree'

/** Holds one failed check of a summary and the token that failed it. */
export interface AggregateFailure {
	readonly kind: AggregateCheck
	readonly token: string
}

/** Holds the tokens of a text: the ids, numbers, name candidates, and words. */
export interface AggregateTokens {
	readonly ids: ReadonlySet<string>
	readonly numbers: ReadonlySet<number>
	readonly names: ReadonlySet<string>
	readonly words: ReadonlySet<string>
}

/** Holds the sentences of a summary that the shown text carries, with the ids that occur there and the sentences dropped. */
export interface AggregateFilter {
	readonly prose: string
	readonly ids: readonly string[]
	readonly dropped: readonly string[]
}

/** Holds one record line that a topic summarizes, with the date of its message. */
export interface AggregateSource {
	readonly id: string
	readonly sentence: number
	readonly role: MessageRole
	readonly text: string
	readonly day: string
}

/** Holds an exact UTF-16 span of the complete candidate. */
export interface AggregateFocus {
	readonly start: number
	readonly end: number
	readonly text: string
}

/** Holds one required native question without cache-only custody fields. */
export interface AggregateComponent {
	readonly id: string
	readonly state: string
	readonly question: JudgeQuestion
	readonly focus?: AggregateFocus
}

/** Binds the exhaustive operation to its complete semantic inputs. */
export interface AggregatePlan {
	readonly revision: string
	readonly candidate: string
	readonly sources: readonly AggregateSource[]
	readonly context: string
	readonly components: readonly AggregateComponent[]
}

/** Retains an attempted component, including unsuccessful and cached work. */
export interface AggregateObservation extends AggregateComponent {
	readonly key: string
	readonly score?: number
	readonly error?: string
	readonly refusal?: Refusal
	readonly usage?: TokenUsage
	readonly cached: boolean
	readonly sent?: boolean
	readonly wall: number
}

/** Retains complete input custody and every attempted component; its score is recomputed. */
export interface AggregateBundle extends Omit<AggregatePlan, 'components'> {
	readonly model: string
	readonly components: readonly AggregateObservation[]
	readonly wall: number
	readonly error?: string
}

/** Configures contextual support and an optional measured wire boundary. */
export interface AggregateSupportOptions {
	readonly judge: JudgeCacheInterface
	readonly sent?: () => number
}

/** Holds a source's message id, seed index, and sentence index. */
export interface AggregateRef {
	readonly id: string
	readonly seed: number | undefined
	readonly sentence: number
}

/** Holds one summary topic: a desk topic or an owner record. */
export interface AggregateTopic {
	readonly key: string
	readonly title: string
	readonly owner: boolean
}

/** Holds a supported version's exact sources and completed read point. */
export interface AggregateState {
	readonly version: number
	readonly goal: string
	readonly point: number
	readonly sources: readonly AggregateSource[]
}

/** Binds one admitted topic body to the state that supplied it. */
export interface AggregateBinding {
	readonly topic: string
	readonly state: AggregateState
	readonly prose: string
}

/** Records the completion boundary of one maintenance pass, including empty or failed passes. */
export interface AggregateMaintenance {
	readonly event: 'maintenance'
	readonly goal: string
	readonly lastSeed: number
	readonly status: 'complete' | 'failed' | 'aborted'
	readonly error?: string
}

/** Names source transitions independently of observed model decisions. */
export type TransitionCategory =
	| 'arrival'
	| 'repetition'
	| 'correction'
	| 'withdrawal'
	| 'supersession'
	| 'tool'

/** Records a prefrozen semantic annotation that scenario truth does not distinguish. */
export interface TransitionAnnotation {
	readonly transition: 'repetition' | 'withdrawal'
	readonly index: number
	readonly prior: readonly number[]
	readonly text: string
}

/** Records an opportunity in the scenario, never a claim of live maintenance coverage. */
export interface TransitionOpportunity {
	readonly transition: TransitionCategory
	readonly index: number
	readonly prior: readonly number[]
	readonly text: string
	readonly topics: readonly string[]
	readonly before: number | undefined
	readonly after: number | undefined
	readonly tool?: string
	readonly id?: string
}

/** Holds one supported summary and the read point that validated its sources. */
export interface AggregateVersion extends AggregateState {
	readonly title: string
	readonly asOf: string
	readonly prose: string
	readonly raw: string
	readonly ids: readonly string[]
}

/** Holds one summary as the block renders it. */
export interface AggregateEntry {
	readonly key: string
	readonly title: string
	readonly date: string
	readonly ids: readonly string[]
	readonly prose: string
}

/** Holds the rendered block, the entries it kept and cut, and its price. */
export interface AggregateBlock {
	readonly text: string
	readonly kept: readonly AggregateEntry[]
	readonly cut: readonly AggregateEntry[]
	readonly tokens: number
}

/** Prices admission of the complete built request without changing its selection. */
export type AggregateAdmission = (text: string) => boolean

/** Holds a built prefix before and after removing a stale summary instruction. */
export interface AggregatePrefix {
	readonly previous: readonly Message[]
	readonly current: readonly Message[]
}

/** Holds the usage and termination evidence of one recorded agent completion. */
export interface WireReading {
	readonly prompt: number | undefined
	readonly completion: number | undefined
	readonly reason: string | undefined
	readonly complete: boolean
	readonly messages: ReadonlyArray<{ readonly role: string; readonly content: string }>
}

/** Holds the recorded run evidence needed to check exposure and completion boundaries. */
export interface WireRun {
	readonly info: { readonly arm: RunArm | ArchiveArm }
	readonly picks: readonly SelectionRecord[]
	readonly calls: ReadonlyArray<
		Pick<CallRecord, 'sequence' | 'role' | 'goal'> & Partial<CallRecord>
	>
	readonly wire: ReadonlyMap<number, WireReading>
}

/** Holds a sentence that the render filter dropped from a topic's prose. */
export interface AggregateDrop {
	readonly topic: string
	readonly sentence: string
}

/** Holds the summaries block of a prompt and what the render left out. */
export interface AggregateRendering {
	readonly states: readonly AggregateBinding[]
	readonly text: string
	readonly topics: readonly string[]
	readonly cut: readonly string[]
	readonly withheld: readonly string[]
	readonly emptied: readonly string[]
	readonly filtered: readonly AggregateDrop[]
	readonly sole: number
	readonly tokens: number
}

/** Holds the answer, cache status, and wall time of one asked noul question. */
export interface AggregateAsked {
	readonly noul: number
	readonly cached: boolean
	readonly wall: number
}

/** Holds what one maintain pass reads for every topic. */
export interface AggregateContext {
	readonly input: MirrorInput
	readonly projection: MirrorProjection
	readonly goal: string
	readonly lastSeed: number
	readonly asOf: string
	readonly signal: AbortSignal
}

/** Holds one line of the aggregate rows file. */
export interface AggregateRow {
	readonly support?: AggregateBundle
	/** Records the complete attempted source projection, or absence when a pass failed before reading it. */
	readonly projection: readonly AggregateSource[] | undefined
	readonly prior: AggregateState | undefined
	readonly result: AggregateState | undefined
	readonly error?: string
	readonly topic: string
	readonly title: string
	readonly goal: string
	readonly lastSeed: number
	readonly event: AggregateEvent
	readonly version: number
	readonly status: AggregateStatus
	readonly sources: readonly AggregateRef[]
	readonly ids: string | undefined
	readonly prose: string | undefined
	readonly raw: string | undefined
	readonly trigger: AggregateTrigger | undefined
	readonly answers: Readonly<Record<string, number>>
	readonly failures: readonly AggregateFailure[]
	readonly wall: number
	readonly cached: boolean
}

/** Configures an aggregator with its mirror, summarizer, judge, cutoffs, settings, days, seed indices, rows file, and logger. */
export interface AggregatorOptions {
	readonly study?: SustainedExecution
	readonly development?: MatrixExecution
	readonly mirror: MirrorInterface
	readonly summarizer: SummarizerInterface
	readonly judge: JudgeCacheInterface
	readonly fit: Fit
	readonly settings: Settings
	readonly days: readonly ScenarioDay[]
	readonly seeds: ReadonlyMap<string, number>
	readonly path: string
	readonly log: (line: string) => void
}

export type DriverMode = 'run' | 'dry' | 'seed'

/** Holds the flags of one driver invocation after validation, with every path resolved. */
export interface Config {
	readonly study?: SustainedExecution
	readonly studyPath?: string
	readonly runtime?: EnduranceRuntime
	readonly think: boolean
	readonly reserve: number
	readonly execution?: MatrixExecution
	readonly frozen?: MatrixFreeze
	readonly mode: DriverMode
	readonly live: boolean
	readonly copy: number
	/** Holds the agent model tag, a `MODELS` value. */
	readonly model: string
	/** Holds the `MODELS` key of the tag, which names the model's entry in the settings file. */
	readonly key: string
	readonly arm: RunArm
	readonly out: string | undefined
	readonly cache: string
	readonly url: string
	/** Lists the goal id prefixes to serve; empty serves every goal. */
	readonly goals: readonly string[]
	readonly fit: string
	readonly settings: string
	readonly allowance: number | undefined
	readonly retry: number | undefined
	readonly predict: number | undefined
}

/** Holds the flags that parsed, or the reason that none did. */
export type ConfigOutcome =
	| { readonly success: true; readonly value: Config }
	| { readonly success: false; readonly error: string }

/** Holds the fields of a goal that the driver reads: the request, the read point, the facts, and the scoring rules. */
export interface CopyGoal {
	readonly id: string
	readonly request: string
	/** Holds the index of the last seed message the goal's request follows. */
	readonly after: number
	readonly facts: readonly number[]
	readonly stale: readonly number[]
	readonly expected: readonly string[]
	readonly expectedAny: readonly string[]
	readonly forbidden: readonly string[]
	readonly forbiddenPatterns: readonly string[]
}

/** Holds the parts of a scenario file that a run reads. */
export interface Copy {
	readonly system: string
	readonly topics: readonly MirrorTopic[]
	readonly days: readonly ScenarioDay[]
	readonly seed: readonly SeedMessage[]
	readonly tables: ScenarioLookups
	readonly goals: readonly CopyGoal[]
}

/** Holds one comparison between a value the driver built and the value it must equal. */
export interface Check {
	readonly name: string
	readonly actual: unknown
	readonly expected: unknown
	readonly equal: boolean
}

/** Holds the parts of one run that the selection wrapper and the goal loop share. */
export interface Rig {
	readonly ledger: LedgerInterface
	readonly mirror: MirrorInterface
	readonly cache: JudgeCache
	readonly aggregator: Aggregator | undefined
	/** Holds the provider that sends the prefix flush. */
	readonly flusher: ProviderInterface
	readonly copy: Copy
	readonly system: string
	/** Maps a message id to its seed index. */
	readonly seeds: Map<string, number>
	/** Aborts the run when the judge cache reports a fault. */
	readonly abort: AbortController
}

/** Counts the questions that no cached answer covered, by head, and splits them by what they ask about. */
export interface Coverage {
	readonly misses: Readonly<Record<string, number>>
	/** Counts the missed questions about seed messages only. */
	readonly seed: number
	/** Counts the missed questions that name a request. */
	readonly requests: number
}

/** Holds what a run reads before it starts: the scenario copy, the settings, the cutoffs, the goals to serve, and the checks between them. */
export interface Preparation {
	readonly copy: Copy
	readonly settings: Settings
	readonly fit: Fit
	readonly goals: readonly CopyGoal[]
	readonly checks: readonly Check[]
}

/** Holds the outcome of scoring one reply against a goal's rules. */
export interface Score {
	readonly clean: boolean
	readonly missing: readonly string[]
	readonly violations: readonly string[]
	readonly patterns: readonly string[]
}

/** Names the judge head that an item asks. */
export type CalibrateHead = 'change' | 'agree'

/** Names how an item was built from the scenario. */
export type CalibrateVariant = 'next' | 'foreign' | 'repeat' | 'summary' | 'stale' | 'cross'

/** Names how the judge answered an item. */
export type CalibrateOutcome = 'answered' | 'refused' | 'failed'

/** Holds the flags of one calibration invocation after validation, with every path resolved. */
export interface CalibrateConfig {
	readonly cache: string
	/** Holds the model tag, a `MODELS` value. */
	readonly model: string
	/** Holds the `MODELS` key of the tag, which names the model's entry in the settings file. */
	readonly key: string
	readonly out: string
	readonly live: boolean
	readonly url: string
	/** Holds the path of the scenario whose seed truth labels the items. */
	readonly scenario: string
	readonly settings: string
}

/** Holds the flags that parsed, or the reason that none did. */
export type CalibrateConfigOutcome =
	| { readonly success: true; readonly value: CalibrateConfig }
	| { readonly success: false; readonly error: string }

/** Holds one seed message with the truth that labels it. */
export interface CalibrateMessage {
	readonly index: number
	readonly role: MessageRole
	readonly content: string
	readonly category: string
	readonly topics: readonly string[]
	/** Lists the earlier seed indices that this message amends. */
	readonly amends: readonly number[]
	/** Lists the earlier seed indices that this message supersedes. */
	readonly supersedes: readonly number[]
}

/** Holds the parts of the long scenario that the calibration reads. */
export interface CalibrateScenario {
	readonly topics: readonly TopicSpec[]
	readonly days: readonly ScenarioDay[]
	readonly messages: readonly CalibrateMessage[]
	/** Lists the distinct read points in ascending order. */
	readonly points: readonly number[]
}

/** Holds the carriers of a topic at a read point, split by whether truth has replaced them. */
export interface CalibrateSelection {
	readonly live: readonly CalibrateMessage[]
	readonly stale: readonly CalibrateMessage[]
}

/** Holds a summary that passes the code check, with the sources it was built from. */
export interface CalibrateSummary {
	readonly topic: string
	readonly after: number
	readonly asOf: string
	readonly prose: string
	readonly sources: readonly AggregateSource[]
	/** Lists the seed indices of the live carriers. */
	readonly live: readonly number[]
	/** Lists the seed indices of the stale carriers. */
	readonly stale: readonly number[]
}

/** Holds a summary with one value replaced by code. */
export interface CalibrateSwap {
	readonly variant: 'stale' | 'cross'
	readonly from: string
	readonly to: string
	readonly prose: string
}

/** Holds one labelled judge item. */
export interface CalibrateItem {
	readonly support?: { readonly candidate: string; readonly sources: readonly AggregateSource[] }
	readonly id: string
	readonly head: CalibrateHead
	readonly variant: CalibrateVariant
	/** Holds `true` for an item the judge must answer yes. */
	readonly label: boolean
	readonly topic: string
	readonly after: number
	/** Lists the seed indices of the event messages that a CHANGE item drew. */
	readonly events: readonly number[]
	/** Holds `FROM -> TO` for an AGREE item whose summary had a value replaced. */
	readonly swap: string | undefined
	readonly state: string
	readonly question: JudgeQuestion
}

/** Holds an item with the judge's answer. */
export interface CalibrateAsked {
	readonly support?: AggregateBundle
	readonly item: CalibrateItem
	readonly noul: number | undefined
	readonly outcome: CalibrateOutcome
	readonly cached: boolean
	readonly wall: number
}

/** Holds a fitted cutoff and whether it gives no yes on the negatives. */
export interface CalibrateCutoff {
	readonly cutoff: number
	readonly separated: boolean
}

/** Counts one head's items at its fitted cutoff. */
export interface CalibrateTally {
	readonly positives: number
	readonly negatives: number
	readonly refused: number
	readonly failed: number
	readonly cached: number
	/** Counts the positives at or above the cutoff. */
	readonly recalled: number
	/** Counts the negatives at or above the cutoff. */
	readonly leaked: number
	readonly separated: boolean
}

/** Counts the summaries and the items of a calibration. */
export interface CalibrateCounts {
	readonly summaries: { readonly asked: number; readonly passed: number; readonly failed: number }
	readonly change: CalibrateTally
	readonly agree: CalibrateTally
}

/** Holds the content of `fit.json`: the two cutoffs, whether both separated, and the counts. */
export interface CalibrateFit extends Fit {
	readonly counts: CalibrateCounts
}

/** Names the ledger head that a shadowed judgment asked. */
export type ShadowHead = 'category' | 'amends' | 'supersedes'

/** Names how a shadowed item was decided. */
export type ShadowOutcome = 'plain' | 'asked' | 'missed' | 'failed'

/** Holds the flags of one shadow invocation after validation, with every path resolved. */
export interface ShadowConfig {
	readonly run: string
	readonly cache: string
	readonly out: string
	readonly live: boolean
	readonly url: string
	/** Holds the directory of the scenario copies, `vN.json`. */
	readonly copies: string
}

/** Holds the flags that parsed, or the reason that none did. */
export type ShadowConfigOutcome =
	| { readonly success: true; readonly value: ShadowConfig }
	| { readonly success: false; readonly error: string }

/** Holds what a run's `run.json` names about the run. */
export interface ShadowRun {
	readonly copy: number
	readonly model: string
	readonly arm: string
	readonly execution?: MatrixExecution
	readonly frozen?: MatrixFreeze
}

/** Holds one line of a run's `messages.jsonl`. */
export interface ShadowMessage {
	readonly message: Message
	/** Holds the seed index, or `undefined` for a request, a reply, and a message the run added. */
	readonly index: number | undefined
	readonly request: boolean
}

/** Holds one line of a run's `judgments.jsonl`: the question the ledger asked and the answer it recorded. */
export interface ShadowJudgment {
	readonly id: string
	/** Holds the parsed question id: the head, then the message ids. */
	readonly key: readonly string[]
	readonly question: JudgeQuestion
	readonly state: string
	/** Holds the recorded answer, or `undefined` for a refusal. */
	readonly answer: JudgeAnswer | undefined
}

/** Holds the members of an aggregate row that the shadow reads. */
export interface ShadowAggregate {
	readonly topic: string
	readonly title: string
	readonly lastSeed: number
	readonly event: string
	readonly status: string
	readonly prose: string | undefined
	readonly result: AggregateState | undefined
}

/** Holds the title and prose of one current aggregate. */
export interface ShadowEntry {
	readonly title: string
	readonly prose: string
	readonly state: AggregateState
}

/** Holds the aggregates that were current after the rows of one read point. */
export interface ShadowSnapshot {
	readonly seed: number
	readonly topics: ReadonlyMap<string, ShadowEntry>
}

/** Holds the registry and the owner links that the lookups of a conversation prefix give. */
export interface ShadowEntities {
	readonly registry: LedgerRegistry
	readonly links: ReadonlyMap<string, string>
}

/** Holds the seed truth of a copy: the first read point, each seed index's category, and the truth pairs after the first read point as `EARLIER:LATER` seed indices. */
export interface ShadowTruth {
	readonly first: number
	readonly categories: ReadonlyMap<number, string>
	readonly amends: ReadonlySet<string>
	readonly supersedes: ReadonlySet<string>
}

/** Holds what the shadow reads from one run directory. */
export interface ShadowInputs {
	readonly run: ShadowRun
	readonly messages: readonly ShadowMessage[]
	readonly judgments: readonly ShadowJudgment[]
	readonly timeline: readonly ShadowSnapshot[]
	readonly truth: ShadowTruth
}

/** Holds one judgment that the shadow re-asked, with the plain and the shadow decision. */
export interface ShadowItem {
	/** Binds the prefixed summaries to their exact prior maintenance states. */
	readonly aggregates?: readonly AggregateBinding[]
	readonly id: string
	readonly head: ShadowHead
	/** Holds the seed index of each message the question names, `undefined` for a message that is no seed message. */
	readonly seeds: ReadonlyArray<number | undefined>
	/** Holds the seed index of the later message, whose arrival is the read point. */
	readonly point: number
	/** Lists the topic keys whose aggregates the state carries. */
	readonly topics: readonly string[]
	/** Lists the topic keys that had no aggregate current at the read point. */
	readonly absent: readonly string[]
	/** Holds the state that was asked: the plain state when no aggregate applied. */
	readonly state: string
	readonly outcome: ShadowOutcome
	/** Holds the recorded decision: for `category`, filed quiet; for a pair head, read at the cutoff; `undefined` when there is no answer. */
	readonly plain: boolean | undefined
	/** Holds the same decision from the shadow answer, which equals `plain` when the state stayed plain. */
	readonly shadow: boolean | undefined
}

/** Reads one side's decision from an item. */
export type ShadowVerdict = (item: ShadowItem) => boolean | undefined

/** Holds a count of hits over a total and their ratio, which is `undefined` for a total of 0. */
export interface ShadowRate {
	readonly hits: number
	readonly total: number
	readonly rate: number | undefined
}

/** Holds the recall of the truth pairs and the false-drop rate of the screened pairs outside the truth, for one pair head. */
export interface ShadowPairs {
	readonly recall: ShadowRate
	readonly falsedrop: ShadowRate
}

/** Holds the keep, drop, and pair rates of one side of the reading. */
export interface ShadowRates {
	readonly keep: ShadowRate
	readonly drop: ShadowRate
	readonly amends: ShadowPairs
	readonly supersedes: ShadowPairs
}

/** Counts the items whose decision differs between the plain and the shadow answer, per head. */
export interface ShadowFlips {
	readonly category: number
	readonly amends: number
	readonly supersedes: number
}

/** Counts the shadowed items by outcome, and the named topics that had no aggregate. */
export interface ShadowCounts {
	readonly items: number
	readonly plain: number
	readonly asked: number
	readonly missed: number
	readonly failed: number
	readonly absent: number
}

/** Holds the shadow reading of one run: the file `--out` names. */
export interface ShadowReport extends ShadowRun {
	readonly counts: ShadowCounts
	readonly plain: ShadowRates
	readonly shadow: ShadowRates
	readonly flips: ShadowFlips
	readonly items: readonly ShadowItem[]
	readonly requests?: readonly MatrixRequest[]
}
