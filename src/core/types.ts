import type { TokenUsage } from '@orkestrel/budget'
import type { JSONRecord, JSONValue } from '@orkestrel/contract'
import type { ToolCall } from '@orkestrel/tool'
import type { MESSAGE_ROLES } from './constants.js'

/** Names the role a {@link Message} plays in a conversation turn. */
export type MessageRole = (typeof MESSAGE_ROLES)[number]

/**
 * Names which thinking the agent loop, a relay server, and a ledger retain before calling a
 * provider: `'none'` retains none, `'turn'` retains thinking after the last `user` message,
 * and `'all'` retains all thinking. A direct `generate` or `stream` call sends messages as given.
 */
export type ThinkingReplay = 'none' | 'turn' | 'all'

/**
 * Represents one conversation turn fed to a {@link ProviderInterface} — a stored, identified
 * message.
 *
 * @remarks
 * `calls` is present only on an `assistant` turn that requested tool calls — the
 * `tool_calls` a prior generation produced, replayed back into the next request so
 * the model sees its own decision. A `tool` turn carries the tool's result in
 * `content` (the textual outcome) and the `id` of the call it answers in `call`.
 * Position stays the join the loop uses: the `tool` turns that follow an `assistant`
 * turn answer its `calls` in order. `call` is the record's reference, and it identifies
 * one call only where the ids within one assistant turn are unique.
 * For a successful tool result, a string is the content as is; any other value is
 * JSON-encoded. A failed tool result carries its error text unchanged. `thinking` is present
 * only on an assistant turn whose call surfaced reasoning. The agent loop, a relay server, and
 * a ledger apply the provider's `replay` policy before calling it. A direct `generate` or
 * `stream` call sends messages as given.
 */
export interface Message {
	readonly id: string
	readonly role: MessageRole
	readonly content: string
	/** Holds an assistant turn's requested tools — its `tool_calls`, replayed. */
	readonly calls?: readonly ToolCall[]
	/** Holds the `id` of the {@link ToolCall} a `tool` turn answers. */
	readonly call?: string
	/**
	 * Holds multimodal image data attached to this turn — base64-encoded image strings,
	 * forwarded to a vision-capable provider (the provider maps them onto the wire's
	 * per-message `images` array). Present only on a multimodal turn; absent otherwise.
	 */
	readonly images?: readonly string[]
	/**
	 * Holds the reasoning the provider call that produced an assistant turn separated from its
	 * `content`. It is present only on an assistant turn whose call surfaced reasoning. It never
	 * enters `content`, judge state, a briefing, or a summary. The agent loop, a relay server, and
	 * a ledger apply the provider's `replay` policy before calling it. A direct `generate` or
	 * `stream` call sends messages as given.
	 */
	readonly thinking?: string
}

/**
 * Carries the minimal data needed to author a {@link Message} — the `id` is
 * assigned by the layer that stores it, so a caller supplies only role / content
 * (and, for a replayed assistant turn, its `calls`; for a tool turn, the `call` it answers).
 */
export interface MessageInput {
	readonly role: MessageRole
	readonly content: string
	readonly calls?: readonly ToolCall[]
	/** Holds the `id` of the {@link ToolCall} a `tool` turn answers. */
	readonly call?: string
	/**
	 * Holds multimodal image data for this turn — base64-encoded image strings forwarded to a
	 * vision-capable provider (carried verbatim onto the stored {@link Message}).
	 */
	readonly images?: readonly string[]
	/**
	 * Holds the reasoning the provider call that produced an assistant turn separated from its
	 * `content`. It is present only on an assistant turn whose call surfaced reasoning. It never
	 * enters `content`, judge state, a briefing, or a summary. The agent loop, a relay server, and
	 * a ledger apply the provider's `replay` policy before calling it. A direct `generate` or
	 * `stream` call sends messages as given.
	 */
	readonly thinking?: string
}

/** Carries text or structured JSON the model reads; mirrors the TypeSafe `EntryType` without its null arm. */
export type JudgeEntry = string | JSONRecord | readonly JSONValue[]

/** Maps each option name the model sees to its description; null keeps an undescribed option in the map. */
export type ChoiceCriteria = Readonly<Record<string, JudgeEntry | null>>

/** Lists at least two score levels from level 0 upward; null leaves a level undescribed. */
export type ScoreCriteria = readonly [
	JudgeEntry | null,
	JudgeEntry | null,
	...Array<JudgeEntry | null>,
]

/** Carries what makes a noul answer true and what makes it false; an omitted side is undescribed. */
export interface NoulCriteria {
	readonly true?: JudgeEntry
	readonly false?: JudgeEntry
}

/** Asks the model to pick one named option from its criteria. */
export interface ChoiceQuestion {
	readonly form: 'choice'
	readonly instructions?: JudgeEntry
	readonly criteria: ChoiceCriteria
}

/** Asks the model to place the state on an ordered scale of levels. */
export interface ScoreQuestion {
	readonly form: 'score'
	readonly instructions?: JudgeEntry
	readonly criteria: ScoreCriteria
}

/** Asks the model whether a statement about the state holds. */
export interface NoulQuestion {
	readonly form: 'noul'
	readonly instructions?: JudgeEntry
	readonly criteria?: NoulCriteria
}

/** Names one question by its form, the protocol's type field under the fleet's named discriminant. */
export type JudgeQuestion = ChoiceQuestion | ScoreQuestion | NoulQuestion

/** Carries one state and the questions asked about it, keyed by caller ids the model never sees; each question is evaluated on its own. */
export interface JudgeRequest {
	readonly state: JudgeEntry
	readonly questions: Readonly<Record<string, JudgeQuestion>>
}

/** Carries a choice distribution keyed by option name, in criteria order. */
export interface ChoiceAnswer {
	readonly form: 'choice'
	readonly probabilities: Readonly<Record<string, number>>
}

/** Carries a score distribution indexed by level. */
export interface ScoreAnswer {
	readonly form: 'score'
	readonly probabilities: readonly number[]
}

/** Carries the probability that the answer is yes; the protocol's noul field. */
export interface NoulAnswer {
	readonly form: 'noul'
	readonly noul: number
}

/** Names one answer by its form; it stores only the distribution a server returned. */
export type JudgeAnswer = ChoiceAnswer | ScoreAnswer | NoulAnswer

/** Reports a question a wire could not read a candidate for; it lists the caller's keys and invents no probability. */
export interface Refusal {
	readonly missing: readonly string[]
}

/** Carries the answering model, the answers keyed by question id, the refusals, and the usage the request's calls spent. */
export interface JudgeResult {
	readonly model: string
	readonly answers: Readonly<Record<string, JudgeAnswer>>
	/** Holds each refused question by id; absent when none was refused. An id appears in answers or refusals, never both. */
	readonly refusals?: Readonly<Record<string, Refusal>>
	readonly usage?: TokenUsage
}

/** Answers typed questions about one state with probabilities; the sibling of `ProviderInterface`, never a provider. */
export interface JudgeInterface {
	readonly id: string
	readonly name: string
	/** Holds the configured model identity; the wire composes it from everything that changes an answer under one state. */
	readonly model: string
	/** Asks every question of the request about its state and returns the merged answers. */
	ask(request: JudgeRequest, signal: AbortSignal): Promise<JudgeResult>
}

/** Carries the measures `computeReading` derives from an answer; nothing stores them. */
export interface Reading {
	/** Holds the first strictly greatest candidate in enumeration order: an option name, a level index, or true or false. */
	readonly winner: string
	readonly probability: number
	readonly confidence: number
	/** Holds the expected level of a score answer; the protocol's score field. */
	readonly score?: number
}
