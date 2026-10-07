import type {
	ChoiceCriteria,
	JudgeEntry,
	JudgeInterface,
	JudgeRequest,
	JudgeResult,
	Message,
	NoulCriteria,
	ScoreCriteria,
} from '../types.js'
import type { TokenUsage } from '@orkestrel/budget'
import type { ToolCall, ToolDefinition } from '@orkestrel/tool'

/**
 * Holds a single inference turn's structured outcome — the assembled assistant content,
 * any reasoning the provider separated from it, any tool calls the model requested,
 * and the token usage it reported.
 *
 * @remarks
 * `thinking` is present only when the turn produced reasoning the provider split
 * away from the answer (an in-content `<think>…</think>` span a thinking model
 * emitted, or a wire-side reasoning field) — `content` is always the clean answer,
 * and the thinking never re-enters the conversation (it is display/audit metadata,
 * not prompt text). `tools` is present only when the model wants tool calls (an
 * empty array is never surfaced — its absence means "no calls"). `usage` is present
 * only when the wire reported it (on the stream's `done` line, or the non-stream
 * body), so a caller folds it into a token budget exactly when it exists.
 */
export interface ProviderResult {
	readonly content: string
	/** Carries reasoning the provider separated from the answer when present — never re-enters the conversation. */
	readonly thinking?: string
	/** Carries the tool calls the model wants when present. */
	readonly tools?: readonly ToolCall[]
	/** Carries token consumption for this turn when present (from the wire's `done` line / body). */
	readonly usage?: TokenUsage
}

/**
 * Represents one streamed delta a {@link ProviderInterface}'s `stream` yields — a unit tagged by
 * the channel it belongs to, so the agent loop can re-surface answer content and live reasoning
 * separately as it pumps.
 *
 * @remarks
 * The discriminant `channel` names the axis that varies: a
 * `'content'` delta is a chunk of the assistant answer (the deltas that accumulate into
 * {@link ProviderResult.content}); a `'thinking'` delta is a chunk of the model's
 * reasoning the provider separated from the answer (the daemon's native
 * `message.thinking` wire channel), surfaced live so a consumer can stream it into a
 * collapsible without waiting for the assembled result. `text` is the delta's literal
 * text. Thinking never re-enters the conversation — it is display/audit metadata, exactly
 * as {@link ProviderResult.thinking} (the authoritative final accumulation) is.
 */
export type ProviderDelta =
	| { readonly channel: 'content'; readonly text: string }
	| { readonly channel: 'thinking'; readonly text: string }

/**
 * Carries the per-call options threaded into a {@link ProviderInterface}'s `generate` / `stream` —
 * the bag a caller passes to influence one inference call without reconfiguring the provider
 * instance.
 *
 * @remarks
 * `think` overrides the provider's constructed reasoning preference for this call: `true`
 * asks the backend to separate reasoning natively (a thinking model returns it on its
 * `message.thinking` channel, surfaced as `'thinking'` {@link ProviderDelta}s + the final
 * {@link ProviderResult.thinking}); `false` suppresses it. `schema`, when given, asks the
 * backend to constrain its response to the given JSON-Schema shape (the same open
 * JSON-Schema record {@link ToolDefinition.parameters} already carries) — a structured-output
 * request for this call only. Both omitted ⇒ the provider's own defaults apply: its constructed
 * reasoning preference and no schema constraint.
 */
export interface ProviderStreamOptions {
	/** Overrides the provider's reasoning preference for this call; omitted ⇒ the provider default. */
	readonly think?: boolean
	/** Constrains the response to this JSON-Schema shape (the same open record {@link ToolDefinition.parameters} uses); omitted ⇒ no constraint. */
	readonly schema?: Readonly<Record<string, unknown>>
}

/**
 * Defines the pluggable LLM inference boundary — the one contract every agent chunk depends on. A
 * provider turns a conversation (plus optional tools) into either a single assembled {@link
 * ProviderResult} (`generate`) or a stream of {@link ProviderDelta}s that returns the assembled
 * result (`stream`).
 *
 * @remarks
 * - `id` is a stable per-instance trace label; `name` identifies the backend
 *   (`'ollama'`).
 * - Both calls take an `AbortSignal` so a caller bounds the request (cancel,
 *   deadline, or budget folded through `AbortSignal.any`); aborting a `stream` mid-flight
 *   surfaces a `ProviderAbortError` carrying the partial result.
 * - `tools`, when given non-empty, advertises the callable tools for this turn.
 * - `options` carries the optional per-call {@link ProviderStreamOptions} (for example `think`),
 *   overriding the provider's constructed defaults for that one call; omitted ⇒ defaults.
 */
export interface ProviderInterface {
	readonly id: string
	readonly name: string
	/**
	 * Generates one complete turn — resolves the assembled {@link ProviderResult}.
	 *
	 * @param messages - The conversation so far
	 * @param signal - Bounds the request; an abort rejects the call
	 * @param tools - Optional tools the model may call this turn
	 * @param options - Optional per-call {@link ProviderStreamOptions} (for example `think`); omitted ⇒ defaults
	 * @returns The assembled result (content + any tool calls + any usage)
	 */
	generate(
		messages: readonly Message[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		options?: ProviderStreamOptions,
	): Promise<ProviderResult>
	/**
	 * Streams one turn — yields channel-tagged `content` / `thinking` {@link ProviderDelta}s as
	 * they arrive and returns the assembled {@link ProviderResult} (the concatenated content,
	 * any separated reasoning, any tool calls, and any usage) when the stream completes. A
	 * mid-stream abort throws a `ProviderAbortError` carrying the partial result.
	 *
	 * @remarks
	 * The `partial` holds whatever streamed before the cancel, so a caller can recover the
	 * partial content.
	 *
	 * @param messages - The conversation so far
	 * @param signal - Bounds the request; an abort throws `ProviderAbortError`
	 * @param tools - Optional tools the model may call this turn
	 * @param options - Optional per-call {@link ProviderStreamOptions} (for example `think`); omitted ⇒ defaults
	 * @returns A generator of {@link ProviderDelta}s, returning the assembled result
	 */
	stream(
		messages: readonly Message[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		options?: ProviderStreamOptions,
	): AsyncGenerator<ProviderDelta, ProviderResult>
}

/**
 * Splits a thinking model's in-content `<think>…</think>` reasoning spans away from the answer,
 * delta by delta with per-stream state, so a provider yields clean content alone and surfaces the
 * reasoning as {@link ProviderResult.thinking}.
 *
 * @remarks
 * - **Stateful across deltas.** A tag may arrive split across wire chunks (`'<thi'`
 *   ending one delta, `'nk>'` opening the next) — `split` holds any ambiguous tail
 *   back until the next delta (or `flush`) disambiguates it, so a partial tag is
 *   never leaked as content and never mis-eaten as thinking.
 * - **`split(delta)`** feeds one raw content delta and returns the clean content to
 *   surface for it (possibly `''` — for example mid-think). Text inside a
 *   `<think>…</think>` span accumulates on `thinking`; multiple spans accumulate in
 *   order; a nested-looking `<think>` inside an open span is thinking text (no
 *   nesting — the first `</think>` closes).
 * - **The implicit leading open (the qwen3-template shape).** Some chat templates
 *   pre-seed `<think>` into the prompt scaffold, so the wire stream begins
 *   mid-reasoning and only a bare `</think>` ever appears. Before any tag event, a
 *   bare close therefore reclassifies everything surfaced so far (plus the pre-close
 *   pending) as thinking — `content` is corrected retroactively, while the already
 *   `split`-returned prefix cannot be recalled (the one shape where the per-delta
 *   returns over-report; `content` stays authoritative). The rule is one-shot: after
 *   any tag event a bare `</think>` is plain text (prose quoting the tag stays text).
 * - **`flush()`** settles the stream end: an unclosed `<think>` tail (the model was
 *   cut off mid-reasoning) lands on `thinking`; a held partial tag that never
 *   completed (`'<thi'` then EOF) is returned as the final clean-content delta —
 *   it was real text after all.
 * - **`content` / `thinking`** are the authoritative accumulations so far (read them
 *   after the stream — or mid-stream for a cancel's partial); `content` is the one
 *   exact clean-content source (the per-delta returns match it except across an
 *   implicit-open reclassification). One splitter serves one stream; create a fresh
 *   one per call ({@link import('./factories.js').createThinkSplitter}).
 */
export interface ThinkSplitterInterface {
	/** Holds the authoritative clean content accumulated so far (corrected across an implicit-open reclassification). */
	readonly content: string
	/** Holds the reasoning text accumulated from every `<think>…</think>` span so far. */
	readonly thinking: string
	/**
	 * Feeds one raw delta and returns the clean, non-think content to surface for it (possibly
	 * `''`) — a tag split across deltas is held until disambiguated, never leaked as content
	 * and never mis-eaten as thinking.
	 */
	split(delta: string): string
	/**
	 * Settles the stream end — a held partial tag that never completed returns as the final
	 * content delta, and an unclosed think span's tail lands on `thinking`.
	 */
	flush(): string
}

/** Defines the structural framing seam supplied by a concrete provider. */
export interface ProviderParserInterface<TRecord = Readonly<Record<string, unknown>>> {
	/** Parses a decoded chunk into complete records. */
	parse(chunk: string): readonly TRecord[]
	/** Clears retained framing state. */
	clear(): void
}

/** Carries the conversation and per-call configuration sent to a provider. */
export interface ProviderRequest {
	readonly messages: readonly Message[]
	readonly tools?: readonly ToolDefinition[]
	readonly options?: ProviderStreamOptions
}

/** Holds the decoded contribution of a wire record to a provider turn. */
export interface ProviderIncrement {
	readonly content: string
	readonly thinking: string
	readonly tools: readonly ToolCall[]
	readonly usage?: TokenUsage
	readonly result?: ProviderResult
}

/**
 * Configures a provider's deadline, transport, and headers.
 *
 * @remarks
 * `timeout` is an integer duration in milliseconds. Default: 120_000.
 * `fetch` defaults to the global transport bound to its global receiver.
 * `headers` runs for each request inside its deadline and receives the combined caller
 * and deadline signal so token requests can share that bound. It overrides the JSON
 * content type only when it returns that header.
 */
export interface ProviderOptions {
	readonly timeout?: number
	readonly fetch?: typeof globalThis.fetch
	readonly headers?: (
		signal: AbortSignal,
	) => Readonly<Record<string, string>> | Promise<Readonly<Record<string, string>>>
}

/**
 * Configures the HTTP destination and stream assembly of a provider base.
 *
 * @remarks
 * `path` appends to `url`. If `split` is true, separates in-content reasoning;
 * if false, preserves content verbatim. Default: true.
 * If `strict` is true, requires a settled result record; if false, assembles at end of input.
 * Default: false.
 */
export interface AgentProviderInput extends ProviderOptions {
	readonly url: string
	readonly path?: string
	readonly split?: boolean
	readonly strict?: boolean
}

/** Defines the wire-specific seams of the shared HTTP provider engine. */
export interface AgentProviderInterface<
	TRecord = Readonly<Record<string, unknown>>,
> extends ProviderInterface {
	/** Creates fresh framing state for a call. */
	frame(): ProviderParserInterface<TRecord>
	/** Projects a request to the concrete protocol's serializable body. */
	body(request: ProviderRequest): object
	/** Decodes a framed record into its contribution to the turn. */
	read(record: TRecord): ProviderIncrement
	/** Returns records retained at end of input before the parser is cleared. */
	finish(parser: ProviderParserInterface<TRecord>): readonly TRecord[]
}

/** Names the machine-readable provider failure conditions. */
export type ProviderErrorCode =
	/** Reports a non-OK HTTP response, including a relay request rejected with status 413. */
	| 'HTTP'
	/** Reports a missing body, malformed wire record, or missing required settled result. */
	| 'PROTOCOL'
	/** Reports an upstream provider failure carried by a relay error record. */
	| 'PROVIDER'

/** Carries a provider failure's HTTP status and underlying cause. */
export interface ProviderErrorOptions {
	readonly status?: number
	readonly cause?: unknown
}

/** Carries a relay delta, settled result, remote abort, or remote failure. */
export type RelayFrame =
	| ProviderDelta
	| { readonly channel: 'result'; readonly result: ProviderResult }
	| { readonly channel: 'abort'; readonly partial: ProviderResult }
	| { readonly channel: 'error'; readonly message: string }

/** Defines a host-independent relay request handler. */
export type RelayHandler = (request: Request) => Promise<Response>

/** Configures the upstream provider, mandatory authorization, and request byte limit. */
export interface RelayOptions {
	readonly provider: ProviderInterface
	/**
	 * Authorizes the request before its body is read.
	 *
	 * @remarks
	 * The hook must not consume the request body; a body-reading hook locks the stream
	 * and the handler answers with the `400` status. The relay performs no origin or
	 * method check. An application trusting an ambient credential such as a cookie
	 * must compose origin and CSRF middleware before the handler to prevent cross-site calls.
	 */
	readonly authorize: (request: Request) => boolean | Promise<boolean>
	/**
	 * Bounds the request body in bytes; the handler answers with the `413` status
	 * for a body at or above the limit.
	 */
	readonly limit?: number
}

/** Carries the upstream call and cancellation bound of a relay response stream. */
export interface RelayStreamOptions {
	readonly provider: ProviderInterface
	readonly request: ProviderRequest
	readonly signal: AbortSignal
}

/** Configures a relay destination and its fresh structural parser factory. */
export interface RelayProviderOptions extends ProviderOptions {
	readonly url: string
	/** Creates a fresh parser for each relay response stream. */
	readonly parser: () => ProviderParserInterface
}

/** Carries a decoded stream prefix and whether the stream ended within its byte budget. */
export interface TextRead {
	readonly text: string
	/**
	 * Reports true only when a read observes the `done` flag before exhausting the
	 * byte budget; an abort reports false.
	 */
	readonly complete: boolean
}

/**
 * Configures the judge engine's destination, identity, and call split.
 *
 * @remarks
 * `path` appends to `url`. `model` is the identity the judge reports when a response names none.
 * `timeout`, `fetch`, and `headers` bound, carry, and authenticate each call as they do for a
 * provider; the deadline applies to each call on its own.
 */
export interface AgentJudgeInput extends Pick<ProviderOptions, 'timeout' | 'fetch' | 'headers'> {
	readonly url: string
	readonly path?: string
	readonly model: string
	/** If true, one call carries every question; if false, the engine issues one call per question. Default: true. */
	readonly batch?: boolean
}

/** Defines the wire seams of the shared judge engine. */
export interface AgentJudgeInterface extends JudgeInterface {
	/** Projects one call's request onto the concrete protocol's serializable body. */
	body(request: JudgeRequest): object
	/** Decodes one call's parsed response body into the answers for that call's questions. */
	read(value: unknown, request: JudgeRequest): JudgeResult
}

/** Names the machine-readable judge failure conditions. */
export type JudgeErrorCode =
	/** Reports a non-OK HTTP response. */
	| 'HTTP'
	/** Reports a missing or unparsable response body, or a response a wire cannot read. */
	| 'PROTOCOL'
	/** Reports a request refused before inference: an empty question map, a malformed question or state, a wire limit, or a judge configuration that would refuse every request. */
	| 'QUESTION'

/** Configures the System One server, model, transport, authentication, and deadline. */
export interface SystemOneJudgeOptions extends Pick<
	ProviderOptions,
	'timeout' | 'fetch' | 'headers'
> {
	/** Holds the server origin without a path. */
	readonly url: string
	readonly model: string
}

/** Carries a TypeSafe System One entry, including the wire's explicit null. */
export type SystemOneEntry = JudgeEntry | null

/** Transliterates a TypeSafe System One question with its protocol discriminant and criteria. */
export interface SystemOneQuestion {
	readonly type: 'choice' | 'score' | 'noul'
	readonly instructions?: SystemOneEntry
	readonly criteria?: ChoiceCriteria | ScoreCriteria | NoulCriteria | null
}

/** Transliterates the TypeSafe System One request body. */
export interface SystemOneRequest {
	readonly state: SystemOneEntry
	readonly model: string
	readonly questions: Readonly<Record<string, SystemOneQuestion>>
}

/** Transliterates TypeSafe System One token counts with missing or null counts permitted. */
export interface SystemOneUsage {
	readonly input_tokens?: number | null
	readonly output_tokens?: number | null
}

/** Transliterates a TypeSafe System One choice distribution and optional server measures. */
export interface SystemOneChoiceAnswer {
	readonly type: 'choice'
	readonly probabilities: Readonly<Record<string, number>>
	readonly choice?: string
	readonly confidence?: number
}

/** Accepts System One score probabilities and legends as maps or llama.cpp arrays. */
export interface SystemOneScoreAnswer {
	readonly type: 'score'
	readonly probabilities: Readonly<Record<string, number>> | readonly number[]
	readonly score?: number
	readonly legend?: Readonly<Record<string, SystemOneEntry>> | readonly SystemOneEntry[]
	readonly confidence?: number
}

/** Transliterates a TypeSafe System One yes probability and optional server confidence. */
export interface SystemOneNoulAnswer {
	readonly type: 'noul'
	readonly noul: number
	readonly confidence?: number
}

/** Unites the TypeSafe System One answer forms. */
export type SystemOneAnswer = SystemOneChoiceAnswer | SystemOneScoreAnswer | SystemOneNoulAnswer

/** Transliterates the System One response envelope before question-specific answer validation. */
export interface SystemOneResponse {
	readonly model?: string
	readonly answers: Readonly<Record<string, unknown>>
	readonly usage?: SystemOneUsage
}
