import type {
	AgentError,
	AgentOptions,
	AgentInterface,
	ConversationManagerInterface,
	ConversationManagerOptions,
	LedgerGauge,
	LedgerInterface,
	LedgerOptions,
	LedgerQuestion,
	ProviderInterface,
	ProviderOptions,
	ProviderRequest,
	JudgeInterface,
} from '@orkestrel/agent'
import type { JSONValue } from '@orkestrel/contract'
import type { OllamaTiming } from '@orkestrel/ollama'
import type { StudyContext, StudyProfile, StudyRole, StudyTicket } from '@orkestrel/study'

/** Holds the memory driver's interpretation of `StudyProfile.settings`. */
export interface StudyMemorySettings {
	/** Prices a complete request for the compaction window; required to open or validate a compaction arm. */
	readonly gauge?: LedgerGauge | undefined
	/** Enables passive request and classifier observations. */
	readonly observe?: boolean | undefined
	/** Names observation checkpoints and requires `observe: true`. */
	readonly checkpoints?: readonly string[] | undefined
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

/** Holds the admitted public Agent factories this consumer invokes. */
export interface StudyMemorySubject {
	readonly Agent: new (provider: ProviderInterface, options?: AgentOptions) => AgentInterface
	readonly createLedger: (provider: ProviderInterface, options: LedgerOptions) => LedgerInterface
	readonly createConversationManager: (
		options?: ConversationManagerOptions,
	) => ConversationManagerInterface
	readonly estimateRequest: (request: ProviderRequest) => number
	readonly isAgentError: (value: unknown) => value is AgentError
	readonly LEDGER_QUESTIONS: LedgerQuestion
}

/** Mirrors the public Ollama factory settings without adding a provider dependency. */
export interface StudyMemoryOllamaOptions extends ProviderOptions {
	readonly model: string
	readonly url: string
	readonly think?: boolean
	readonly options: Readonly<Record<string, unknown>>
}

/** Holds the admitted public Ollama factories. */
export interface StudyMemoryProvider {
	readonly createOllama: (options: StudyMemoryOllamaOptions) => ProviderInterface
	readonly createOllamaJudge: (
		options: StudyMemoryOllamaOptions & { readonly system: string },
	) => JudgeInterface
	readonly extractTiming: (record: Readonly<Record<string, unknown>>) => OllamaTiming | undefined
}

/** Holds the passive observation switches read from the generic profile settings. */
export interface StudyMemoryObservation {
	readonly observe: boolean
	/** Holds the goal ids whose public view and exact request bodies are retained; empty unless observing. */
	readonly checkpoints: ReadonlySet<string>
}

/** Holds one dispatched agent request's explicit size reading. */
export interface StudyMemoryEstimate {
	/** Holds the subject's estimate of the complete pre-encoding request. */
	readonly estimate: number
	/** Holds the gauge projection of that estimate; undefined when no gauge applies. */
	readonly projected: number | undefined
}

/** Holds the observing provider's real delegate and measurement seams. */
export interface StudyMemoryObserverOptions {
	/** Holds the real provider every call is delegated to unchanged. */
	readonly provider: ProviderInterface
	/** Holds the admitted Agent namespace measuring requests. */
	readonly subject: StudyMemorySubject
	/** Holds the validated gauge enforced after a successful return; undefined enforces nothing. */
	readonly gauge: LedgerGauge | undefined
	/** Receives exactly one reading, synchronously, before each delegated call. */
	readonly record: (reading: StudyMemoryEstimate) => void
}

/** Holds validated runtime dependencies for a fresh trial. */
export interface StudyMemoryOptions {
	readonly subject: unknown
	readonly provider: unknown
	readonly profile: StudyProfile
}

/** Holds the shared implementation's irreducible memory treatment. */
export type StudyMemoryArm = 'records' | 'compaction' | 'full'

/** Holds a fresh session's admitted dependencies and parent cancellation. */
export interface StudyMemorySessionOptions {
	readonly subject: StudyMemorySubject
	readonly provider: StudyMemoryProvider
	readonly profile: StudyProfile
	readonly arm: StudyMemoryArm
	readonly signal: AbortSignal
}

/** Holds one active goal's accounting and attribution. */
export interface StudyMemoryActivity {
	readonly goal: string
	readonly context: StudyContext
	/** Holds the owned public view taken before a selected goal's arrivals; undefined retains neither it nor request bodies. */
	readonly checkpoint: JSONValue | undefined
}

/** Holds the bounded transport's immutable configuration. */
export interface StudyMemoryTransportOptions {
	readonly profile: StudyProfile
	readonly signal: AbortSignal
	/** Adds passive timing and correlation fields to existing evidence when true. */
	readonly observe: boolean
	/** Extracts the daemon timing of a validated terminal record. */
	readonly timing: StudyMemoryProvider['extractTiming']
}

/** Holds a validated response terminal's actual usage and finish reason. */
export interface StudyMemoryTerminal {
	readonly prompt: number | undefined
	readonly completion: number | undefined
	readonly reason: string
}

/** Holds validated wire dispatch facts without retaining payload text. */
export interface StudyMemoryRequest {
	readonly role: StudyRole
	readonly path: string
	readonly model: string | undefined
	readonly output: number
	readonly bytes: number
	readonly options: Readonly<Record<string, number>>
}

/** Tracks one owned HTTP response until EOF or cancellation. */
export interface StudyMemoryWire {
	readonly activity: StudyMemoryActivity
	readonly request: StudyMemoryRequest
	readonly ticket: StudyTicket
	readonly signal: AbortSignal
	readonly reader: ReadableStreamDefaultReader<Uint8Array>
	readonly decoder: TextDecoder
	readonly started: number
	/** Holds the trial-local request id. */
	readonly id: number
	/** Holds the monotonic millisecond reading taken immediately before native fetch. */
	readonly sent: number
	bytes: number
	text: string
	terminal: StudyMemoryTerminal | undefined
	/** Holds the daemon timing of the terminal row once observed. */
	timing: OllamaTiming | undefined
	settled: boolean
}

/** Holds mechanical predicates over retained observations. */
export type StudyMemoryAssertion =
	| { readonly observation: 'result'; readonly partial: boolean }
	| { readonly observation: 'arrival'; readonly id: string }
	| { readonly observation: 'lookup'; readonly id: string }
	| { readonly observation: 'summary' }
	| { readonly observation: 'operational' }
