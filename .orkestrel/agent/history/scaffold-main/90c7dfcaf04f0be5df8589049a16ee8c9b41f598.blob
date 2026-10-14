import type { TokenUsage } from '@orkestrel/budget'
import type { ToolDefinition } from '@orkestrel/tool'
import type {
	JudgeAnswer,
	JudgeInterface,
	JudgeQuestion,
	LedgerInterface,
	LedgerOptions,
	MessageInput,
	Refusal,
} from '../vendor/agent-0.0.30-trimmed/index.js'

/** Carries the options accepted by the archived driver. */
export interface DriverFlags {
	readonly copy?: string
	readonly out?: string
	readonly dry?: boolean
	readonly live?: boolean
	readonly references?: string
}

/** Carries the measured scenario fields the driver reads. */
export interface Scenario {
	readonly ledger: {
		readonly system: string
		readonly clock: string
		readonly topics: Readonly<Record<string, string>>
	}
	readonly seed: readonly SeedMessage[]
	readonly tools: Readonly<Record<string, Readonly<Record<string, string>>>>
	readonly goals: readonly Goal[]
}

/** Carries only the archived seed fields the driver replays. */
export type SeedMessage = Pick<MessageInput, 'role' | 'content' | 'calls' | 'call'>

/** Carries the archived scoring-rule wire fields. */
export interface Goal {
	readonly id: string
	readonly request: string
	readonly expected?: readonly string[]
	readonly expectedAny?: readonly string[]
	readonly forbidden?: readonly string[]
	readonly forbiddenPatterns?: readonly string[]
}

/** Carries the historical calibration rows without changing their wire names. */
export interface CalibrationRow {
	readonly question?: string
	readonly order?: string
	readonly index?: number
	readonly earlier?: number
	readonly later?: number
	readonly topic?: string
	readonly asked?: string
	readonly name?: string
	readonly error?: string
	readonly probabilities?: Readonly<Record<string, number>>
	readonly p?: number
	readonly refusal?: Refusal
}

/** Carries the seed's historical fixed gauge field verbatim. */
export interface Seed {
	readonly imported: number
	readonly judgments: string
	readonly measured: { readonly scale: number; readonly fixed: number }
	readonly undecided: readonly UndecidedQuestion[]
}

/** Carries a measured question that the historical judge left unanswered. */
export interface UndecidedQuestion {
	readonly item: string
	readonly state: string
}

/** Carries a recorded chat request used to compare the measured seed. */
export interface ChatRequest {
	readonly options?: Readonly<Record<string, unknown>>
	readonly messages: readonly ChatMessage[]
	readonly tools: readonly ChatTool[]
	readonly keep_alive: string
}

/** Carries the chat wire message fields used by seed comparisons. */
export interface ChatMessage {
	readonly content: string
	readonly [key: string]: unknown
}

/** Carries the historical chat tool wrapper. */
export interface ChatTool {
	readonly function: Pick<ToolDefinition, 'name' | 'description' | 'parameters'>
}

/** Carries an exclusively created reference-copy destination. */
export interface ReferenceCopy {
	readonly file: string
	readonly destination: string
}

/** Carries a settings comparison and its unchanged archived value. */
export interface DriverCheck {
	readonly name: string
	readonly actual: unknown
	readonly measured: unknown
	readonly equal: boolean
}

/** Carries a held question and its attempts. */
export interface HeldQuestion {
	readonly item: string
	readonly state: string
	readonly question: JudgeQuestion
	readonly original: string
	readonly attempts: readonly Attempt[]
}

/** Carries an attempt's mutable receipt fields using the archived wire names. */
export interface Attempt {
	readonly goal: string | undefined
	readonly started: number
	readonly firstWire: number
	readonly answer?: JudgeAnswer
	readonly refusal?: Refusal
	readonly usage?: TokenUsage
	readonly wall?: number
	readonly lastWire?: number
	readonly error?: string
}

/** Carries fully specified measured ledger settings. */
export interface DriverOptions extends LedgerOptions {
	readonly judge: JudgeInterface
	readonly share: { readonly prompt: number; readonly tail: number }
	readonly recall: { readonly limit: number }
	readonly agent: { readonly limit: number; readonly timeout: number }
}

/** Carries the historical Ollama constructor settings the driver supplies. */
export interface AgentOptions {
	readonly url: string
	readonly model: string
	readonly think: boolean
	readonly keepAlive: string
	readonly timeout: number
	readonly options: Readonly<Record<string, number>> & { readonly num_ctx: number }
}

/** Carries the historical judge constructor settings the driver supplies. */
export interface JudgeOptions {
	readonly url: string
	readonly model: string
	readonly system: string
	readonly calibration: { readonly temperature: number }
	readonly options: { readonly num_ctx: number }
	readonly keepAlive: string
	readonly timeout: number
}

/** Carries an explicit mapping from archived Linux identity to preserved bytes. */
export interface SourceMapping {
	readonly archived: string
	readonly local: string
	readonly sha256: string
}

/** Carries the initialized runtime after measured inputs have been read. */
export interface DriverContext {
	readonly scenario: Scenario
	readonly seed: Seed
	readonly ledger: LedgerInterface
	readonly judge: JudgeInterface
	readonly options: DriverOptions
	readonly agent: AgentOptions
	readonly judging: JudgeOptions
}

/** Carries owned fixture resources for the real reference-copy engine. */
export interface ReferenceFixture {
	readonly entry: string
	readonly out: string
	readonly sources: readonly string[]
	readonly text: string
}
