import type {
	JudgeInterface,
	JudgeAbortError,
	isJudgeAbortError,
	buildJudgeResult,
	createSystemOneJudge,
	Agent,
	ConversationSnapshot,
	LEDGER_NOTES,
	LEDGER_QUESTIONS,
	LedgerSnapshot,
	createAuthority,
	createConversationManager,
	createLedger,
} from '@orkestrel/agent'
import type { JSONValue } from '@orkestrel/contract'
import type { createOllama, createOllamaJudge, extractTiming } from '@orkestrel/ollama'
import type {
	StudyAgentRuntime,
	StudyEvidence,
	StudyProfile,
	StudyScenario,
	StudyTrial,
} from '@orkestrel/study'
import type {
	StudyExchangeSinkInterface,
	StudyOllamaMetadata,
	StudyOllamaReplayInterface,
} from '@orkestrel/study/server'

/** Holds the memory driver's interpretation of `StudyProfile.settings`. */
export interface StudyMemoryOptions {
	/** Enables passive request and classifier observations. */
	readonly observe?: boolean | undefined
	/** Names observation checkpoints and requires `observe: true`. */
	readonly checkpoints?: readonly string[] | undefined
	/** Bounds the metadata passes a recording declares; absent, the unrecorded default bounds them. */
	readonly metadata?: StudyOllamaMetadata | undefined
	/** Places the records judge on this host; `gpu` is forwarded as Ollama's `num_gpu`, so 0 runs the judge on the CPU. Forwarded only in the records arm. */
	readonly judge?: { readonly gpu: number } | undefined
}

/** Holds one role's pinned sampling values, each key written as its Ollama wire name. */
export interface StudyMemoryParameters {
	readonly temperature: number
	readonly seed: number
	readonly top_k: number
	readonly top_p: number
	readonly min_p: number
	readonly presence_penalty: number
	readonly repeat_penalty: number
}

/** Holds public arrivals and reference snapshots released before a goal. */
export interface StudyMemoryInput {
	readonly prompt: string
	readonly arrivals: ReadonlyArray<{ readonly id: string; readonly content: string }>
	/** Adds or replaces the current snapshot by id; omitted ids retain their last release, and unreleased ids remain absent. */
	readonly records: ReadonlyArray<{
		readonly id: string
		readonly name: string
		readonly content: string
	}>
}

/**
 * Holds one goal's end state as the `checkpoint` evidence row.
 * @remarks
 * The arm names which state member is present: `ledger` on `records`, and `conversation` on `full` and `plain`, where the `plain` conversation holds only the last goal run. A session opened with this value hydrates that state, its released records, and the arrival ids it already took. Provenance is not carried, so an arrival from before the seed reads origin `history`.
 */
export interface StudyMemoryCheckpoint {
	readonly ledger?: LedgerSnapshot
	readonly conversation?: ConversationSnapshot
	readonly records: StudyMemoryInput['records']
	readonly arrivals: readonly string[]
}

/** Holds one goal's reading in `study progress`; a cell is absent when the goal holds none of the rows it reads. */
export interface StudyMemoryProgress {
	/** Counts the goal's `wire` rows per role, `metadata` included. */
	readonly calls?: Readonly<Record<string, number>>
	/** Sums what the goal's `wire` rows report; `total` is in the daemon's own duration unit. */
	readonly usage?: {
		readonly prompt: number
		readonly cached: number
		readonly completion: number
		readonly total: number
	}
	readonly partial?: boolean
	/** Reports that the product's content holds nothing but whitespace. */
	readonly empty?: boolean
	/** Reports that the product's content opens with a refusal `STUDY_MEMORY_ABSTENTION` matches. */
	readonly abstained?: boolean
	readonly lookups?: StudyMemoryLookups
	/** Counts the `denial` rows whose reason is a repeat reason; absent when the goal denied nothing. */
	readonly repeats?: number
	/** Reads the `system` messages of the goal's first retained agent request, which a calibrating ledger's first goal spends on calibration. */
	readonly system?: { readonly count: number; readonly bytes: number }
	/** Lists the cache share of each agent request that reported both counts, in row order. */
	readonly cache?: readonly number[]
}

/** Holds a count of `lookup` rows: the reads that found their record and the reads that missed. */
export interface StudyMemoryLookups {
	readonly found: number
	readonly missing: number
}

/** Holds one scheduled goal's lookups, abstention, and arrival, with the trial and arm that ran it. */
export interface StudyMemoryGoalSummary {
	readonly trial: string
	readonly arm: string
	readonly goal: string
	readonly lookups: StudyMemoryLookups
	/** Reports that the goal's reply opens with a refusal `STUDY_MEMORY_ABSTENTION` matches; false when the goal holds no reply. */
	readonly abstained: boolean
	/** Reports that the goal holds an `arrival` row. */
	readonly arrival: boolean
}

/** Holds a sealed memory result's schedule, scenarios, and verified evidence by trial id. */
export interface StudyMemorySummaryInput {
	readonly schedule: readonly StudyTrial[]
	readonly scenarios: readonly StudyScenario[]
	readonly evidence: ReadonlyMap<string, readonly StudyEvidence[]>
}

/** Holds a memory result's reading of every scheduled goal and each arm's totals. */
export interface StudyMemorySummary {
	/** Lists every scheduled goal in schedule and scenario order; a goal with no `lookup` row reads 0 and 0. */
	readonly goals: readonly StudyMemoryGoalSummary[]
	/** Sums each arm's lookups. */
	readonly arms: Readonly<Record<string, StudyMemoryLookups>>
	/** Counts each arm's abstained goals; an arm with none reads 0. */
	readonly abstained: Readonly<Record<string, number>>
}

/** Holds the admitted Agent runtime capabilities every memory arm invokes, beyond the shared instrumentation's own. */
export interface StudyMemoryAgent extends StudyAgentRuntime {
	readonly Agent: typeof Agent
	readonly createConversationManager: typeof createConversationManager
	readonly createAuthority: typeof createAuthority
}

/** Holds the admitted Agent capabilities only the records arm invokes. */
export interface StudyMemoryLedger {
	readonly createLedger: typeof createLedger
	readonly LEDGER_QUESTIONS: typeof LEDGER_QUESTIONS
	readonly LEDGER_NOTES: typeof LEDGER_NOTES
}

/** Holds the extra admitted Agent capabilities required only by the triage. */
export interface StudyMemoryRuntime {
	readonly createSystemOneJudge: typeof createSystemOneJudge
	readonly JudgeAbortError: typeof JudgeAbortError
	readonly isJudgeAbortError: typeof isJudgeAbortError
	readonly buildJudgeResult: typeof buildJudgeResult
}

/** Holds the serial judges and the admitted runtime, avoiding another Agent module occurrence. */
export interface StudyMemoryJudgeOptions {
	readonly first: JudgeInterface
	readonly second: JudgeInterface
	readonly runtime: Pick<
		StudyMemoryRuntime,
		'JudgeAbortError' | 'isJudgeAbortError' | 'buildJudgeResult'
	>
	readonly evidence: { readonly append: (event: string, value: JSONValue) => void }
}

/** Holds the frozen consumer triage rule. */
export interface StudyMemoryPolicy {
	readonly version: number
	readonly probability: number
	readonly referrals: readonly string[]
}

/** Holds the first leg's decision for one caller question without state text. */
export interface StudyMemoryTriage {
	readonly id: string
	readonly outcome: 'kept' | 'referred' | 'fault'
	readonly winner: string | null
	readonly probability: number | null
}

/** Holds the admitted Ollama capabilities every memory arm invokes. */
export interface StudyMemoryProvider {
	readonly createOllama: typeof createOllama
	readonly extractTiming: typeof extractTiming
}

/** Holds the admitted Ollama capability only the records arm invokes. */
export interface StudyMemoryClassifier {
	readonly createOllamaJudge: typeof createOllamaJudge
}

/** Holds the passive observation switches read from the generic profile settings. */
export interface StudyMemoryObservation {
	readonly observe: boolean
	/** Holds the goal ids whose public view and exact request bodies are retained; empty unless observing. */
	readonly checkpoints: ReadonlySet<string>
}

/** Names where a request message came from, or that the composer mixes sources (`mixed`) or the consumer cannot tell (`unknown`). */
export type StudyMemoryOrigin =
	| 'input'
	| 'arrival'
	| 'tool'
	| 'history'
	| 'instructions'
	| 'mixed'
	| 'unknown'

/** Holds one message's nonadditive origin annotation and, when known, the source id it came from. */
export interface StudyMemoryProvenance {
	readonly origin: StudyMemoryOrigin
	readonly source?: string | undefined
}

/** Holds the session state a message's origin is joined from; no text, position or substring is consulted. */
export interface StudyMemoryProvenanceSource {
	/** Holds message ids the consumer itself added or named: the current input and each arrival. */
	readonly explicit: ReadonlyMap<string, StudyMemoryProvenance>
	/** Holds the ids of the messages the conversation stores. */
	readonly members: ReadonlySet<string>
	/** Reports that a composer builds the request from several sources, so its system messages are mixed. */
	readonly composed: boolean
}

/**
 * Holds the admitted modules and profile for a fresh trial.
 * @remarks
 * `agent` supplies the runtime the driver constructs; `subject` identifies the artifact under
 * study and is never loaded or read here. `exchanges` and `replay` are the worker's recording
 * collaborators, each present only for a profile that declares `record`.
 */
export interface StudyMemoryDriverOptions {
	readonly agent: unknown
	readonly subject: unknown
	readonly provider: unknown
	readonly profile: StudyProfile
	readonly exchanges?: StudyExchangeSinkInterface
	readonly replay?: StudyOllamaReplayInterface
}

/**
 * Holds the shared implementation's irreducible memory treatment.
 * @remarks
 * `records` keeps the ledger's records. Each control drops the ledger: `full` keeps the whole conversation, and `plain` keeps no conversation, so each goal sees only its own arrivals and prompt. Every arm reads the same released reference snapshots through `lookup`.
 */
export type StudyMemoryArm = 'records' | 'full' | 'plain'

/**
 * Holds a fresh session's admitted dependencies and parent cancellation.
 * @remarks
 * `ledger` and `classifier` are present exactly for the records arm; no other arm requires them.
 * `exchanges` and `replay` retain and answer the recorded bytes of a profile that declares `record`.
 * `seed` is the checkpoint a seeded execution hands the driver at `open`.
 */
export interface StudyMemorySessionOptions {
	readonly agent: StudyMemoryAgent
	readonly ledger: StudyMemoryLedger | undefined
	readonly provider: StudyMemoryProvider
	readonly classifier: StudyMemoryClassifier | undefined
	readonly profile: StudyProfile
	readonly arm: StudyMemoryArm
	readonly signal: AbortSignal
	readonly exchanges?: StudyExchangeSinkInterface
	readonly replay?: StudyOllamaReplayInterface
	readonly seed?: StudyMemoryCheckpoint
}

/** Holds mechanical predicates over retained observations. */
export type StudyMemoryAssertion =
	| { readonly observation: 'result'; readonly partial: boolean }
	| { readonly observation: 'arrival'; readonly id: string }
	| { readonly observation: 'lookup'; readonly id: string }
	| { readonly observation: 'operational' }

/** Reads the ids one text carries; the study wiring passes `(text) => extractLiterals(text).ids`. */
export type StudyMemoryLiteralHandler = (text: string) => ReadonlySet<string>

/** Holds how many of the counted literals a reading found, out of how many it counted; the share is derived, never stored. */
export interface StudyMemoryTally {
	readonly found: number
	readonly total: number
}

/** Holds one carriage reading: the referenced prior product and the built prompt. */
export interface StudyMemoryCarriageInput {
	/** Text of the referenced prior product. */
	readonly product: string
	/** Message texts of the built prompt. */
	readonly prompt: readonly string[]
	/** Reads the ids one text carries. */
	readonly literals: StudyMemoryLiteralHandler
}

/** Holds the counts and durations of a Study `wire` timing the instruments read; `null` mirrors `buildStudyOllamaTelemetry`, which reports an unreported value as `null`. */
export interface StudyMemoryTiming {
	readonly counts: { readonly prompt: number | null; readonly cached: number | null }
	readonly durations?: { readonly total: number | null } | undefined
}

/** Holds the members of a Study `wire` value the instruments read; `timing` is `null` when `buildStudyOllamaTelemetry` observed no terminal timing, and `prompt` and `completion` are `null` when the terminal reported none. */
export interface StudyMemoryWire {
	readonly role: string
	readonly prompt?: number | null | undefined
	readonly completion?: number | null | undefined
	readonly timing?: StudyMemoryTiming | null | undefined
}
