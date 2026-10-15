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
import type { StudyContext, StudyProfile, StudyRole, StudyTicket } from '@orkestrel/study'

/** Holds the memory driver's interpretation of `StudyProfile.settings`. */
export interface StudyMemorySettings {
	/** Prices a complete request for the compaction window; required to open or validate a compaction arm. */
	readonly gauge?: LedgerGauge | undefined
	/** Reserved for passive observation by a separate consumer; this driver does not read it. */
	readonly observe?: boolean | undefined
	/** Names observation checkpoints and requires `observe: true`; this driver does not read it. */
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
}

/** Holds the bounded transport's immutable configuration. */
export interface StudyMemoryTransportOptions {
	readonly profile: StudyProfile
	readonly signal: AbortSignal
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
	bytes: number
	text: string
	terminal: StudyMemoryTerminal | undefined
	settled: boolean
}

/** Holds mechanical predicates over retained observations. */
export type StudyMemoryAssertion =
	| { readonly observation: 'result'; readonly partial: boolean }
	| { readonly observation: 'arrival'; readonly id: string }
	| { readonly observation: 'lookup'; readonly id: string }
	| { readonly observation: 'summary' }
	| { readonly observation: 'operational' }
