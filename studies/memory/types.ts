import type {
	Agent,
	ConversationSnapshot,
	LEDGER_NOTES,
	LEDGER_QUESTIONS,
	LedgerCorrectionOptions,
	LedgerGauge,
	LedgerSnapshot,
	createAuthority,
	createConversationManager,
	createLedger,
} from '@orkestrel/agent'
import type { createOllama, createOllamaJudge, extractTiming } from '@orkestrel/ollama'
import type { StudyAgentRuntime, StudyProfile } from '@orkestrel/study'
import type {
	StudyExchangeSinkInterface,
	StudyOllamaMetadata,
	StudyOllamaReplayInterface,
} from '@orkestrel/study/server'

/** Holds the memory driver's interpretation of `StudyProfile.settings`. */
export interface StudyMemoryOptions {
	/** Prices a complete request for the compaction window; required to open or validate a compaction arm. */
	readonly gauge?: LedgerGauge | undefined
	/** Enables passive request and classifier observations. */
	readonly observe?: boolean | undefined
	/** Names observation checkpoints and requires `observe: true`. */
	readonly checkpoints?: readonly string[] | undefined
	/** Rolls each compaction into one section covering the prior recaps; forwarded only in the compaction arm. */
	readonly rolling?: boolean | undefined
	/** Declares the bare serving version a recording requires, equal to the profile's daemon version. */
	readonly version?: string | undefined
	/** Bounds the metadata passes a recording declares; absent, the unrecorded default bounds them. */
	readonly metadata?: StudyOllamaMetadata | undefined
	/** Mirrors `LedgerOptions.correction`; forwarded only in the records arm. */
	readonly correction?: LedgerCorrectionOptions | undefined
}

/** Holds one role's pinned sampling values, each key written as its Ollama wire name. */
export interface StudyMemorySampling {
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
 * The arm's strategy names which state member is present: `ledger` on `records` and `conversation` on every other arm. A session opened with this value hydrates that state, its released records, and the arrival ids it already took. Provenance is not carried, so an arrival from before the seed reads origin `history`.
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
	readonly lookups?: { readonly found: number; readonly missing: number }
	/** Counts the `denial` rows whose reason is a repeat reason; absent when the goal denied nothing. */
	readonly repeats?: number
	/** Reads the `system` messages of the goal's first retained agent request, which a calibrating ledger's first goal spends on calibration. */
	readonly system?: { readonly count: number; readonly bytes: number }
	/** Lists the cache share of each agent request that reported both counts, in row order. */
	readonly cache?: readonly number[]
}

/** Holds the admitted Agent runtime capabilities every memory arm invokes, beyond the shared instrumentation's own. */
export interface StudyMemoryRuntime extends StudyAgentRuntime {
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

/** Holds the declarations only the compaction arm reads: its explicit gauge and its recap allowance. */
export interface StudyMemoryCompaction {
	readonly gauge: LedgerGauge
	readonly recap: number
}

/** Names where a request message came from, or that the composer mixes sources (`mixed`) or the consumer cannot tell (`unknown`). */
export type StudyMemoryOrigin =
	| 'input'
	| 'arrival'
	| 'summary'
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
	/** Holds message ids the consumer itself added or named: the current input, each arrival and the summary instruction. */
	readonly explicit: ReadonlyMap<string, StudyMemoryProvenance>
	/** Holds the ids of the conversation's compacted sections, which are also the ids of their recap messages. */
	readonly sections: ReadonlySet<string>
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

/** Holds the shared implementation's irreducible memory treatment. */
export type StudyMemoryArm = 'records' | 'compaction' | 'full'

/**
 * Holds a fresh session's admitted dependencies and parent cancellation.
 * @remarks
 * `ledger` and `classifier` are present exactly for the records arm; no other arm requires them.
 * `exchanges` and `replay` retain and answer the recorded bytes of a profile that declares `record`.
 * `seed` is the checkpoint a seeded execution hands the driver at `open`.
 */
export interface StudyMemorySessionOptions {
	readonly agent: StudyMemoryRuntime
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
	| { readonly observation: 'summary' }
	| { readonly observation: 'operational' }

/** Reads the ids one text carries; the study wiring passes `(text) => extractLiterals(text).ids`. */
export type StudyMemoryLiteralHandler = (text: string) => ReadonlySet<string>

/** Holds how many of the counted literals a reading found, out of how many it counted; the share is derived, never stored. */
export interface StudyMemoryTally {
	readonly found: number
	readonly total: number
}

/** Holds one literal-retention reading: the folded slice, the later requests the reading covers, and the post-fold view. */
export interface StudyMemoryRetentionInput {
	/** Texts of the folded slice. */
	readonly history: readonly string[]
	/** Texts of the requests after the boundary the reading covers (the next 3, then the next 8, as two readings). */
	readonly later: readonly string[]
	/** Texts of the post-fold view. */
	readonly view: readonly string[]
	/** Reads the ids one text carries. */
	readonly literals: StudyMemoryLiteralHandler
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

/** Holds the counts and durations of a Study `wire` timing the instruments read; `null` mirrors `buildStudyOllamaTiming`, which reports an unreported value as `null`. */
export interface StudyMemoryTiming {
	readonly counts: { readonly prompt: number | null; readonly cached: number | null }
	readonly durations?: { readonly total: number | null } | undefined
}

/** Holds the members of a Study `wire` value the instruments read; `timing` is `null` when `buildStudyOllamaTiming` observed no terminal timing, and `prompt` and `completion` are `null` when the terminal reported none. */
export interface StudyMemoryWire {
	readonly role: string
	readonly prompt?: number | null | undefined
	readonly completion?: number | null | undefined
	readonly timing?: StudyMemoryTiming | null | undefined
}
