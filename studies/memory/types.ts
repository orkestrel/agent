import type {
	Agent,
	AgentStop,
	LEDGER_QUESTIONS,
	LedgerGauge,
	LedgerReceipt,
	LedgerOptions,
	createConversationManager,
	createLedger,
} from '@orkestrel/agent'
import type { createOllama, createOllamaJudge, extractTiming } from '@orkestrel/ollama'
import type { StudyAgentRuntime, StudyProfile } from '@orkestrel/study'
import type {
	StudyExchangeSinkInterface,
	StudyOllamaMetadata,
	StudyOllamaReplayInterface,
	StudyOllamaStep,
	StudyExchangeDivergence,
	StudyResultReading,
	StudySealedResult,
} from '@orkestrel/study/server'

/** Holds the memory driver's interpretation of `StudyProfile.settings`. */
export interface StudyMemoryOptions {
	/** Forwards declared default-off Ledger treatments on the records arm only. */
	readonly ledger?: StudyMemoryLedgerOptions
	/** Configures the lookup tool on every memory arm. */
	readonly lookup?: StudyMemoryLookupOptions
	/** Configures standing source placement on the compaction arm only. */
	readonly instructions?: StudyMemoryInstructionOptions
	/** Prices a complete request for the compaction window; required to open or validate a compaction arm. */
	readonly gauge?: LedgerGauge | undefined
	/** Enables passive request and classifier observations. */
	readonly observe?: boolean | undefined
	/** Names observation checkpoints and requires `observe: true`. */
	readonly checkpoints?: readonly string[] | undefined
	/** Rolls each compaction into one section covering the prior recaps; forwarded only in the compaction arm. */
	readonly rolling?: boolean | undefined
	/** Bounds metadata independently; required with a recording declaration. */
	readonly metadata?: StudyOllamaMetadata | undefined
	/** Pins the serving version; required with recording. */
	readonly version?: string | undefined
	/** Optionally restricts recording to declared model requests; omission records an open sequence. */
	readonly procedure?: readonly StudyOllamaStep[] | undefined
}

/** Selects the Ledger treatments admitted by the memory study. */
export type StudyMemoryLedgerOptions = Pick<LedgerOptions, 'lexical' | 'recent' | 'work'>

/** Holds the lookup tool's default-off treatment. */
export interface StudyMemoryLookupOptions {
	/** Advertises order and customer id prefixes if `true`; preserves the base description if `false`. Default: false. */
	readonly grammar?: boolean
}

/** Holds the compaction instruction set's default-off treatment. */
export interface StudyMemoryInstructionOptions {
	/** Moves released standing sources into instructions if `true`; keeps arrivals in conversation if `false`. Default: false. Refused outside compaction. */
	readonly standing?: boolean
}

/** Names the request-body members compared in precedence order. */
export type StudyMemoryMember = 'model' | 'messages' | 'tools' | 'options' | 'prompt' | 'flags'

/** Holds the first parsed request difference with bounded text and baseline provenance. */
export interface StudyMemoryChange {
	readonly member: StudyMemoryMember
	readonly index: number | undefined
	/** Counts UTF-16 code units within the changed message content or canonical member text. */
	readonly offset: number
	readonly expected: string
	readonly actual: string
	readonly origin: StudyMemoryOrigin | undefined
	readonly source: string | undefined
}

/** Holds the first differing normalized selection, including an unmatched pass. */
export interface StudyMemorySelection {
	readonly goal: string
	readonly pass: number
	readonly expected: StudyMemoryReceipt | undefined
	readonly actual: StudyMemoryReceipt | undefined
}

/** Holds the sealed observed baseline and a sealed or interrupted replay of one trial. */
export interface StudyMemoryDifferentialOptions {
	readonly baseline: StudySealedResult
	readonly replay: StudyResultReading
	readonly trial: string
}

/** Reports replay completion and independent wire, parsed-body, and sealed selection differences. */
export interface StudyMemoryDifferential {
	/** Requires a sealed successful trial, complete goal products and sidecar, and consumption of the baseline's full non-maintenance history; inertness also requires every difference to be absent. */
	readonly complete: boolean
	readonly divergence: StudyExchangeDivergence | undefined
	readonly change: StudyMemoryChange | undefined
	readonly selection: StudyMemorySelection | undefined
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

/** Holds the admitted Agent runtime capabilities every memory arm invokes, beyond the shared instrumentation's own. */
export interface StudyMemoryRuntime extends StudyAgentRuntime {
	readonly Agent: typeof Agent
	readonly createConversationManager: typeof createConversationManager
}

/** Holds the admitted Agent capabilities only the records arm invokes. */
export interface StudyMemoryLedger {
	readonly createLedger: typeof createLedger
	readonly LEDGER_QUESTIONS: typeof LEDGER_QUESTIONS
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
 * study and is never loaded or read here.
 */
export interface StudyMemoryDriverOptions {
	readonly agent: unknown
	readonly subject: unknown
	readonly provider: unknown
	readonly profile: StudyProfile
	readonly exchanges?: StudyExchangeSinkInterface | undefined
	readonly replay?: StudyOllamaReplayInterface | undefined
}

/** Holds the shared implementation's irreducible memory treatment. */
export type StudyMemoryArm = 'records' | 'compaction' | 'full'

/**
 * Holds a fresh session's admitted dependencies and parent cancellation.
 * @remarks
 * `ledger` and `classifier` are present exactly for the records arm; no other arm requires them.
 */
export interface StudyMemorySessionOptions {
	readonly agent: StudyMemoryRuntime
	readonly ledger: StudyMemoryLedger | undefined
	readonly provider: StudyMemoryProvider
	readonly classifier: StudyMemoryClassifier | undefined
	readonly profile: StudyProfile
	readonly arm: StudyMemoryArm
	readonly signal: AbortSignal
	readonly exchanges?: StudyExchangeSinkInterface | undefined
	readonly replay?: StudyOllamaReplayInterface | undefined
}

/** Holds mechanical predicates over retained observations. */
export type StudyMemoryAssertion =
	| { readonly observation: 'result'; readonly partial: boolean }
	| { readonly observation: 'arrival'; readonly id: string }
	| { readonly observation: 'lookup'; readonly id: string }
	| { readonly observation: 'summary' }
	| { readonly observation: 'operational' }

/** Carries one pass's evidence and the consumer's identity joins. */
export interface StudyMemoryReceipt {
	readonly request: string
	/** Lists the session's conversation message ids in append order, independently of selection order. */
	readonly messages: readonly string[]
	readonly pass: number
	readonly role: 'agent'
	readonly receipt: LedgerReceipt
	readonly arrivals: readonly StudyMemoryArrival[]
	readonly recaps: readonly string[]
	readonly stop: AgentStop | undefined
}

/** Identifies a public arrival by the message the session appended. */
export interface StudyMemoryArrival {
	readonly id: string
	readonly message: string
}

/** Declares the source, owner and sentence identities required by an independent goal reading. */
export interface StudyMemoryRequirement {
	readonly source: string
	readonly owner: string | undefined
	readonly sentences: readonly number[]
}

/** Declares a goal's nonempty required-source denominator and optional independent product reading. */
export interface StudyMemoryDeclaration {
	readonly goal: string
	readonly sources: readonly StudyMemoryRequirement[]
	/** Reports whether the independently read product satisfies the goal; absence establishes no ignored class. */
	readonly product: boolean | undefined
}

/** Reports a failure count over the declared required-source population. */
export interface StudyMemoryRatio {
	readonly count: number
	readonly denominator: number
}

/** Reports selection failure classes over an explicit required-source denominator. */
export interface StudyMemoryClassification {
	readonly unfiled: StudyMemoryRatio
	readonly unselected: StudyMemoryRatio
	readonly incorrect: StudyMemoryRatio
	/** Holds no reading without independent product evidence. */
	readonly ignored: StudyMemoryRatio | undefined
}

/** Holds the foreign result members the selection reader dereferences. */
export interface StudyMemoryResult {
	readonly request: string
	readonly receipts: readonly LedgerReceipt[]
	readonly passes: ReadonlyArray<{ readonly stop?: AgentStop | undefined }>
}

/** Holds section identities and conversation order available when a goal resolves. */
export interface StudyMemorySections {
	readonly sections: ReadonlyArray<{ readonly id: string }>
	/** Lists conversation messages in append order, including messages outside the selected tail. */
	readonly messages: readonly string[]
}

/** Holds an evidence envelope before its selection value is validated. */
export interface StudyMemoryEvidence {
	readonly event: string
	readonly goal?: string | undefined
	readonly value: unknown
}
