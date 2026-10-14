import type {
	AgentInterface,
	ConversationInterface,
	LedgerGauge,
	LedgerResult,
	ProviderInterface,
	Message,
} from '../../vendor/agent-0.0.30-trimmed/index.js'
import type { TokenUsage } from '@orkestrel/budget'
import type { ToolManagerInterface } from '@orkestrel/tool'
import type { EnduranceRuntime } from '../endurance/types.js'
import type { MatrixBudget, MatrixFailure, MatrixRequest } from '../matrix/types.js'
import type { RefitFile } from '../refit/types.js'
import type { SustainedMessage, SustainedObservation, SustainedReceipt } from '../sustained/types.js'
import type { CallRole, LookupCount, QuestionCount, RecallCount, SelectionRecord } from '../types.js'

/** Names one context design the continuous comparison serves the same workload through. */
export type ContinuousArm = 'records' | 'compaction' | 'full'

/** Names what a trajectory does at a goal with no product: `stop` ends it as `failed`, `continue` records the empty row and serves the next goal. */
export type ContinuousFailurePolicy = 'stop' | 'continue'

/** Names how a trajectory stands: its progress, its complete horizon, or the design outcome or fault that ended it early. */
export type ContinuousStatus =
	| 'started'
	| 'calibrated'
	| 'running'
	| 'complete'
	| 'overflow'
	| 'limit'
	| 'failed'
	| 'fault'

/** Binds a model role to the exact daemon digest the freeze observed. */
export interface ContinuousModel {
	readonly model: string
	readonly digest: string
}

/** Configures the package's own conversation compaction for the `compaction` arm. */
export interface ContinuousCompaction {
	/** Caps the summarizer's generation in tokens, `num_predict`. */
	readonly predict: number
	/** Caps the compacted sections; overflow merges the oldest into one recap. */
	readonly sections: number
	/** Keeps this many recent live messages verbatim on a fold. */
	readonly keep: number
}

/** Holds the finite whole-trajectory limits frozen before the first request. */
export interface ContinuousLimits {
	readonly metadata: number
	readonly goal: number
	readonly requests: number
	readonly series: number
	readonly calls: number
	readonly tokens: number
	readonly wall: number
	readonly goals: number
}

/** Records the daemon a freeze observed and every run must reach again. */
export interface ContinuousDaemon {
	readonly url: string
	readonly version: string
}

/** Freezes one model configuration, its budget, the workload custody, and the arms a series serves. */
export interface ContinuousManifest {
	readonly protocol: 'c1'
	readonly capacity: 1
	readonly key: string
	readonly think: boolean
	readonly decision: ContinuousModel
	readonly summarizer: ContinuousModel
	readonly judge: ContinuousModel
	readonly sampler: Readonly<Record<string, number>>
	readonly budget: ContinuousBudget
	readonly compaction: ContinuousCompaction
	readonly retry: number
	readonly timeout: number
	readonly limits: ContinuousLimits
	readonly workload: RefitFile
	readonly runtime: RefitFile
	readonly oracle: RefitFile
	readonly agent: RefitFile
	readonly ollama: RefitFile
	readonly tags: RefitFile
	readonly daemon: ContinuousDaemon
	readonly arms: readonly ContinuousArm[]
	readonly blind: number
	/** Holds the required successor policy at a goal with no product. */
	readonly failure: ContinuousFailurePolicy
}

/** Holds the physical output reservation and independent safety allowance. */
export interface ContinuousBudget extends MatrixBudget {
	readonly safety: number
}

/** Records the first operational termination without losing its wire evidence. */
export interface ContinuousTerminal {
	readonly status: 'overflow' | 'limit' | 'fault'
	readonly reason: string
	readonly role: CallRole | 'metadata'
	readonly sequence: number
	readonly expected: boolean
}

/** Describes the operational disposition of one actual retained wire request. */
export type ContinuousDisposition = Pick<ContinuousTerminal, 'status' | 'reason' | 'expected'>

/** Holds the CLI capacity profile before custody files are frozen. */
export interface ContinuousProfile {
	readonly budget: ContinuousBudget
	readonly recap: number
	readonly timeout: number
	readonly limits: Omit<ContinuousLimits, 'goals'>
}

/** Captures native messages before their provider performs a wire request. */
export interface ContinuousProviderOptions {
	readonly provider: ProviderInterface
	readonly prepare: (messages: readonly Message[]) => void
}

/** Binds one trajectory to its frozen manifest, arm, and runtime bytes. */
export interface ContinuousExecution {
	readonly protocol: 'c1'
	readonly manifest: RefitFile
	readonly arm: ContinuousArm
	readonly runtime: RefitFile
}

/** Holds one goal's outcome and measurements as one line of a run's `rows.jsonl`. */
export interface ContinuousRow {
	readonly goal: string
	readonly arm: ContinuousArm
	readonly success: boolean
	readonly reply: string
	readonly partial: boolean
	readonly error?: string
	readonly usage?: TokenUsage
	readonly passes: number
	/** Holds the `respond` wall in milliseconds. */
	readonly wall: number
	/** Holds the wall of the prefix flush in milliseconds. */
	readonly flush: number
	readonly first: number
	readonly last: number
	/** Holds the largest prompt token count among the goal's agent calls. */
	readonly prompt: number
	readonly entry: number | undefined
	/** Reports a context-length refusal from the daemon during the goal. */
	readonly overflow: boolean
	readonly failures: readonly MatrixFailure[]
	readonly recalls: RecallCount
	readonly lookups: LookupCount
	readonly questions: Readonly<Record<string, QuestionCount>>
	readonly briefing: { readonly tokens: number; readonly digest: string }
	readonly tail: string
	readonly scale: number
	/** Counts the live-tail folds the goal triggered. */
	readonly folds: number
	/** Counts the section merges the goal triggered. */
	readonly merges: number
	/** Counts the compacted sections after the goal. */
	readonly sections: number
	/** Holds the estimate units the recap messages took in the goal's first prompt. */
	readonly recap: number
}

/** Holds one `select` event as one line of `selections.jsonl`, without the aggregate axis. */
export type ContinuousSelection = Pick<
	SelectionRecord,
	'goal' | 'pass' | 'sequence' | 'briefing' | 'digest' | 'tail' | 'instructions' | 'scale'
>

/** Holds the selected, omitted, and folded history at one served read point. */
export interface ContinuousObservation extends SustainedObservation {
	/** Lists the sources whose originals sit inside a section whose recap the prompt carried. */
	readonly folded: readonly string[]
}

/** Holds one compaction event as one line of `sections.jsonl`. */
export interface ContinuousSection {
	readonly goal: string
	readonly event: 'compact' | 'collapse'
	readonly id: string
	readonly summary: string
	readonly messages: readonly string[]
	readonly estimate: number
}

/** Holds one turn's prompt estimate as one line of `turns.jsonl`. */
export interface ContinuousTurn {
	readonly turn: number
	readonly goal: string | undefined
	readonly estimate: number | undefined
}

/** Holds the fresh wire expenditure of one role in one phase. */
export interface ContinuousCost {
	readonly role: CallRole
	readonly phase: 'calibration' | 'trajectory'
	readonly requests: number
	readonly wall: number
	readonly prompt: number
	readonly completion: number
	readonly missing: number
}

/** Separates per-role wire expenditure from the whole-run interval. */
export interface ContinuousCosts {
	readonly wire: readonly ContinuousCost[]
	readonly elapsed: number
	readonly flush: number
}

/** Holds a complete or ended trajectory read back from its directory. */
export interface ContinuousRun {
	readonly path: string
	readonly execution: ContinuousExecution
	readonly manifest: ContinuousManifest
	readonly runtime: EnduranceRuntime
	readonly status: ContinuousStatus
	readonly rows: readonly ContinuousRow[]
	readonly picks: readonly ContinuousSelection[]
	readonly requests: readonly MatrixRequest[]
	readonly receipts: readonly SustainedReceipt[]
	readonly observations: readonly ContinuousObservation[]
	readonly messages: readonly SustainedMessage[]
	readonly sections: readonly ContinuousSection[]
	readonly gauge: LedgerGauge | undefined
	readonly files: readonly RefitFile[]
	readonly failures: readonly string[]
	readonly costs: ContinuousCosts
}

/** Serves requests of one conversation through one context design. */
export interface TrialArm {
	readonly agent: AgentInterface
	readonly conversation: ConversationInterface
	/**
	 * Appends the request and serves it through to its reply.
	 * @param content - The request text
	 * @param signal - The caller's cancellation signal
	 * @returns The reply and the passes the request took
	 */
	respond(content: string, signal?: AbortSignal): Promise<LedgerResult>
}

/** Configures a plain arm: the whole history as the prompt, with the package's compaction when `compaction` is set. */
export interface PlainArmOptions {
	readonly provider: ProviderInterface
	readonly system: string
	readonly tools: ToolManagerInterface
	readonly limit: number
	readonly timeout: number
	readonly compaction?: ContinuousCompaction & {
		readonly summarizer: ProviderInterface
		/** Holds the context window in estimate units; a prompt reaching it folds the conversation. */
		readonly window: number
	}
}

/** Configures one trajectory. */
export interface TrialConfig {
	readonly manifest: ContinuousManifest
	readonly reference: RefitFile
	readonly arm: ContinuousArm
	readonly out: string
	readonly url: string
	readonly live: boolean
	readonly signal?: AbortSignal
}

/** Holds one planned run of a series and how it ended. */
export interface SeriesEntry {
	readonly manifest: RefitFile
	readonly key: string
	readonly arm: ContinuousArm
	readonly out: string
	readonly status: ContinuousStatus | 'skipped'
	readonly error?: string
	readonly wall: number
}
