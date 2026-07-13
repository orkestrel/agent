import type { BudgetInterface, TokenUsage } from '@orkestrel/budget'
import type { EmitterErrorHandler, EmitterHooks, EmitterInterface } from '@orkestrel/emitter'
import type { QueueStoreInterface } from '@orkestrel/queue'
import type { SchedulerInterface } from '@orkestrel/workflow'

/** The role a {@link MessageInterface} plays in a conversation turn. */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

/**
 * One conversation turn fed to a {@link ProviderInterface} — a stored, identified
 * message.
 *
 * @remarks
 * `calls` is present only on an `assistant` turn that requested tool calls — the
 * `tool_calls` a prior generation produced, replayed back into the next request so
 * the model sees its own decision. A `tool` turn carries the tool's result in
 * `content` (the textual outcome), keyed back to the call by the conversation order.
 */
export interface MessageInterface {
	readonly id: string
	readonly role: MessageRole
	readonly content: string
	/** An assistant turn that requested tools — its `tool_calls`, replayed. */
	readonly calls?: readonly ToolCall[]
	/**
	 * Multimodal image data attached to this turn — base64-encoded image strings,
	 * forwarded to a vision-capable provider (the provider maps them onto the wire's
	 * per-message `images` array). Present only on a multimodal turn; absent otherwise.
	 */
	readonly images?: readonly string[]
}

/**
 * The minimal data needed to author a {@link MessageInterface} — the `id` is
 * assigned by the layer that stores it, so a caller supplies only role / content
 * (and, for a replayed assistant turn, its `calls`).
 */
export interface MessageInput {
	readonly role: MessageRole
	readonly content: string
	readonly calls?: readonly ToolCall[]
	/**
	 * Multimodal image data for this turn — base64-encoded image strings forwarded to a
	 * vision-capable provider (carried verbatim onto the stored {@link MessageInterface}).
	 */
	readonly images?: readonly string[]
}

/**
 * A tool the model may call — its name, an optional description, and an optional
 * JSON-Schema `parameters` object describing its arguments.
 *
 * @remarks
 * Passed to a {@link ProviderInterface}'s `generate` / `stream`; the provider maps
 * each into the wire's function-tool shape. `parameters` is an open JSON-Schema
 * record (the provider forwards it verbatim).
 */
export interface ToolDefinition {
	readonly name: string
	readonly description?: string
	readonly parameters?: Readonly<Record<string, unknown>>
}

/**
 * A tool call the model emitted — the tool `name` and its parsed `arguments`.
 *
 * @remarks
 * `id` correlates the call with its later {@link ToolResult}; when the wire omits an
 * id the provider mints one (a random UUID) so every call is addressable. `arguments`
 * is always a record — the provider narrows the wire value (an object, or a JSON
 * string it parses) to one, defaulting to `{}` when neither.
 */
export interface ToolCall {
	readonly id: string
	readonly name: string
	readonly arguments: Readonly<Record<string, unknown>>
}

/**
 * The outcome of executing a {@link ToolCall} — keyed back to the call by `id` and
 * `name`, carrying either a `value` (the result) or an `error` string (the failure).
 */
export interface ToolResult {
	readonly id: string
	readonly name: string
	readonly value?: unknown
	readonly error?: string
}

/**
 * One block of an MCP-shaped tool call response — plain text, the only content kind
 * {@link buildToolResult} emits.
 */
export interface ToolResultContent {
	readonly type: 'text'
	readonly text: string
}

/**
 * The MCP `CallToolResult` shape a {@link ToolResult} maps to via {@link buildToolResult} —
 * `content` blocks plus an `isError` flag set ONLY on failure (never `false`).
 */
export interface ToolCallResult {
	readonly content: readonly ToolResultContent[]
	readonly isError?: true
}

/**
 * A registered tool: its {@link ToolDefinition} (the schema the model sees) plus the
 * handler that runs a call.
 *
 * @remarks
 * The definition fields (`name` / `description` / `parameters`) are what a
 * {@link ProviderInterface} advertises to the model; `execute` is the local handler a
 * {@link ToolManagerInterface} invokes when the model calls the tool. The handler's
 * `args` is the model-supplied `unknown` JSON object — narrow it inside the handler
 * (§14), never assert; the manager isolates a throw into a {@link ToolResult} `error`.
 */
export interface ToolInterface extends ToolDefinition {
	/**
	 * Run the tool. `args` is the model-supplied `unknown` JSON object — narrow it
	 * inside (§14); the manager isolates a throw into a {@link ToolResult} `error`.
	 *
	 * @param args - The model-supplied arguments record (an open `unknown` object)
	 * @returns The tool's result (sync or async) — folded into a `ToolResult.value`
	 */
	execute(args: Readonly<Record<string, unknown>>): Promise<unknown> | unknown
}

/**
 * Options for `createTool` — the schema the model sees (`name` / `description` /
 * `parameters`) plus the `execute` handler that runs a call.
 *
 * @remarks
 * `name` is required (it keys the tool in a {@link ToolManagerInterface} and is what
 * the model calls); `description` and `parameters` are the optional JSON-Schema the
 * provider advertises (forwarded verbatim). `execute` receives the model-supplied
 * arguments record and returns the tool's result (sync or async).
 */
export interface ToolOptions {
	readonly name: string
	readonly description?: string
	readonly parameters?: Readonly<Record<string, unknown>>
	readonly execute: (args: Readonly<Record<string, unknown>>) => Promise<unknown> | unknown
}

/**
 * A registry of tools — resolves names, lists definitions for the provider, and
 * executes calls with per-call error isolation.
 *
 * @remarks
 * - **Registry.** `add` registers one tool or a batch (§9.2), keyed by `tool.name`
 *   (a re-`add` of the same name overwrites — last write wins); `count` is the number
 *   registered. `tool(name)` looks one up; `tools()` lists them in insertion order;
 *   `definitions()` strips each to a plain {@link ToolDefinition} for the provider.
 * - **Per-call error isolation.** `execute` resolves a {@link ToolCall}'s tool by name
 *   and runs it, ALWAYS resolving a {@link ToolResult}: a success carries `value`, a
 *   handler throw is caught into `error`, and an unknown name becomes a not-found
 *   `error`. A tool throw NEVER escapes — it becomes a result the model can react to.
 * - **Batch never fails as a whole.** The array `execute` runs every call (via
 *   `Promise.all`) and resolves results correlated by `id` in order — one bad call
 *   (throw or not-found) does not fail the batch.
 * - **Event-free.** A purely functional registry — no Emitter, no events.
 */
export interface ToolManagerInterface {
	readonly count: number
	add(tool: ToolInterface): void
	add(tools: readonly ToolInterface[]): void
	tool(name: string): ToolInterface | undefined
	tools(): readonly ToolInterface[]
	definitions(): readonly ToolDefinition[]
	execute(call: ToolCall): Promise<ToolResult>
	execute(calls: readonly ToolCall[]): Promise<readonly ToolResult[]>
	remove(name: string): boolean
	remove(names: readonly string[]): boolean
	clear(): void
}

/**
 * A single inference turn's structured outcome — the assembled assistant content,
 * any reasoning the provider separated from it, any tool calls the model requested,
 * and the token usage it reported.
 *
 * @remarks
 * `thinking` is present only when the turn produced reasoning the provider SPLIT
 * AWAY from the answer (an in-content `<think>…</think>` span a thinking model
 * emitted, or a wire-side reasoning field) — `content` is always the CLEAN answer,
 * and the thinking never re-enters the conversation (it is display/audit metadata,
 * not prompt text). `tools` is present only when the model wants tool calls (an
 * empty array is never surfaced — its absence means "no calls"). `usage` is present
 * only when the wire reported it (on the stream's `done` line, or the non-stream
 * body), so a caller folds it into a token budget exactly when it exists.
 */
export interface ProviderResult {
	readonly content: string
	/** Present ⇒ reasoning the provider separated from the answer — never re-enters the conversation. */
	readonly thinking?: string
	/** Present ⇒ the model wants these tool calls. */
	readonly tools?: readonly ToolCall[]
	/** Present ⇒ token consumption for this turn (from the wire's `done` line / body). */
	readonly usage?: TokenUsage
}

/**
 * One streamed delta a {@link ProviderInterface}'s `stream` yields — a TAGGED unit
 * discriminated by the channel it belongs to, so the agent loop can re-surface the two
 * channels separately (answer content vs. live reasoning) as it pumps.
 *
 * @remarks
 * The discriminant `type` names the CHANNEL axis (AGENTS §4.4 — never `kind`): a
 * `'content'` delta is a chunk of the assistant ANSWER (the deltas that accumulate into
 * {@link ProviderResult.content}); a `'thinking'` delta is a chunk of the model's
 * REASONING the provider separated from the answer (the daemon's native
 * `message.thinking` wire channel), surfaced LIVE so a consumer can stream it into a
 * collapsible without waiting for the assembled result. `text` is the delta's literal
 * text. Thinking NEVER re-enters the conversation — it is display/audit metadata, exactly
 * as {@link ProviderResult.thinking} (the authoritative final accumulation) is.
 */
export type ProviderDelta =
	| { readonly type: 'content'; readonly text: string }
	| { readonly type: 'thinking'; readonly text: string }

/**
 * Per-call options threaded into a {@link ProviderInterface}'s `generate` / `stream` —
 * the bag a caller passes to influence ONE inference call without reconfiguring the
 * provider instance.
 *
 * @remarks
 * `think` OVERRIDES the provider's constructed reasoning preference for THIS call: `true`
 * asks the backend to separate reasoning natively (a thinking model returns it on its
 * `message.thinking` channel, surfaced as `'thinking'` {@link ProviderDelta}s + the final
 * {@link ProviderResult.thinking}); `false` suppresses it. Omitted ⇒ the provider's own
 * default applies (the constructor value), so the contract stays backward-safe — a caller
 * that passes no options behaves exactly as before.
 */
export interface ProviderStreamOptions {
	/** Override the provider's reasoning preference for this call; omitted ⇒ the provider default. */
	readonly think?: boolean
}

/**
 * The pluggable LLM inference boundary — the one contract every agent chunk depends
 * on. A provider turns a conversation (plus optional tools) into either a single
 * assembled {@link ProviderResult} (`generate`) or a stream of {@link ProviderDelta}s that
 * RETURNS the assembled result (`stream`).
 *
 * @remarks
 * - `id` is a stable per-instance trace label; `name` identifies the backend
 *   (`'ollama'`).
 * - Both calls take an `AbortSignal` so a caller bounds the request (cancel,
 *   deadline, or budget folded via `AbortSignal.any`); aborting a `stream` mid-flight
 *   surfaces a `ProviderAbortError` carrying the partial result.
 * - `tools`, when given non-empty, advertises the callable tools for this turn.
 * - `options` carries the optional per-call {@link ProviderStreamOptions} (e.g. `think`),
 *   overriding the provider's constructed defaults for that one call; omitted ⇒ defaults.
 */
export interface ProviderInterface {
	readonly id: string
	readonly name: string
	/**
	 * The model's preferred context framing, by section kind — an OPTIONAL
	 * {@link ContextFormatInterface} an {@link import('./AgentContext.js').AgentContext}
	 * applies as the PROVIDER-DEFAULT level of its build cascade (beating the managers'
	 * built-in framing, beaten by a manager-options or per-item override). Omitted ⇒ the
	 * provider is framing-agnostic and the managers' built-in defaults apply unchanged.
	 */
	readonly format?: ContextFormatInterface
	/**
	 * Generate one complete turn — resolves the assembled {@link ProviderResult}.
	 *
	 * @param messages - The conversation so far
	 * @param signal - Bounds the request; an abort rejects the call
	 * @param tools - Optional tools the model may call this turn
	 * @param options - Optional per-call {@link ProviderStreamOptions} (e.g. `think`); omitted ⇒ defaults
	 * @returns The assembled result (content + any tool calls + any usage)
	 */
	generate(
		messages: readonly MessageInterface[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		options?: ProviderStreamOptions,
	): Promise<ProviderResult>
	/**
	 * Stream one turn — yields {@link ProviderDelta}s (channel-tagged `content` / `thinking`
	 * chunks) as they arrive and RETURNS the assembled {@link ProviderResult} (the
	 * concatenated content + any separated reasoning + any tool calls + any usage) when the
	 * stream completes.
	 *
	 * @remarks
	 * An abort mid-stream throws a `ProviderAbortError` whose `partial` holds whatever
	 * streamed before the cancel, so a caller can recover the partial content.
	 *
	 * @param messages - The conversation so far
	 * @param signal - Bounds the request; an abort throws `ProviderAbortError`
	 * @param tools - Optional tools the model may call this turn
	 * @param options - Optional per-call {@link ProviderStreamOptions} (e.g. `think`); omitted ⇒ defaults
	 * @returns A generator of {@link ProviderDelta}s, returning the assembled result
	 */
	stream(
		messages: readonly MessageInterface[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		options?: ProviderStreamOptions,
	): AsyncGenerator<ProviderDelta, ProviderResult>
}

/**
 * The stream-stateful `<think>` separator — splits a thinking model's in-content
 * `<think>…</think>` reasoning spans away from the answer, delta by delta, so a
 * provider yields ONLY clean content and surfaces the reasoning as
 * {@link ProviderResult.thinking}.
 *
 * @remarks
 * - **Stateful across deltas.** A tag may arrive SPLIT across wire chunks (`'<thi'`
 *   ending one delta, `'nk>'` opening the next) — `split` holds any ambiguous tail
 *   back until the next delta (or `flush`) disambiguates it, so a partial tag is
 *   never leaked as content and never mis-eaten as thinking.
 * - **`split(delta)`** feeds one raw content delta and returns the CLEAN content to
 *   surface for it (possibly `''` — e.g. mid-think). Text inside a
 *   `<think>…</think>` span accumulates on `thinking`; multiple spans accumulate in
 *   order; a nested-looking `<think>` inside an open span is just thinking text (no
 *   nesting — the first `</think>` closes).
 * - **The IMPLICIT leading open (the qwen3-template shape).** Some chat templates
 *   PRE-SEED `<think>` into the prompt scaffold, so the wire stream begins
 *   MID-REASONING and only a bare `</think>` ever appears. Before any tag event, a
 *   bare close therefore RECLASSIFIES everything surfaced so far (plus the pre-close
 *   pending) as thinking — `content` is corrected retroactively, while the already
 *   `split`-returned prefix cannot be recalled (the one shape where the per-delta
 *   returns over-report; `content` stays authoritative). The rule is ONE-SHOT: after
 *   any tag event a bare `</think>` is plain text (prose quoting the tag stays text).
 * - **`flush()`** settles the stream end: an UNCLOSED `<think>` tail (the model was
 *   cut off mid-reasoning) lands on `thinking`; a held partial tag that never
 *   completed (`'<thi'` then EOF) is returned as the final clean-content delta —
 *   it was real text after all.
 * - **`content` / `thinking`** are the authoritative accumulations so far (read them
 *   after the stream — or mid-stream for a cancel's partial); `content` is the ONE
 *   exact clean-content source (the per-delta returns match it except across an
 *   implicit-open reclassification). One splitter serves ONE stream; create a fresh
 *   one per call ({@link import('./factories.js').createThinkSplitter}).
 */
export interface ThinkSplitterInterface {
	/** The AUTHORITATIVE clean content accumulated so far (corrected across an implicit-open reclassification). */
	readonly content: string
	/** The reasoning text accumulated from every `<think>…</think>` span so far. */
	readonly thinking: string
	/** Feed one raw delta; returns the clean (non-think) content to surface for it. */
	split(delta: string): string
	/** Settle the stream end — returns any held clean tail; an unclosed think span lands on `thinking`. */
	flush(): string
}

/**
 * The conversation store — immutable {@link MessageInterface}s in insertion order;
 * `add` mints the `id`.
 *
 * @remarks
 * - **Store.** Messages live in insertion order; `count` is how many are stored.
 *   `add` takes one {@link MessageInput} or a batch (§9.2) and MINTS each message's
 *   `id` (a random UUID), returning the created message(s). A stored message is
 *   immutable — created once from its input, never mutated.
 * - **Lookup.** `message(id)` resolves one by id (`undefined` when absent);
 *   `messages()` lists every message in insertion order.
 * - **Removal.** `remove` drops one by id, or a batch (§9.2) — `true` when any was
 *   removed; `clear` empties the store.
 * - **Event-free.** A purely data store — no Emitter, no events.
 */
export interface MessageManagerInterface {
	readonly count: number
	add(input: MessageInput): MessageInterface
	add(inputs: readonly MessageInput[]): readonly MessageInterface[]
	message(id: string): MessageInterface | undefined
	messages(): readonly MessageInterface[]
	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	clear(): void
}

/**
 * An immutable instruction — a named directive a richer context places between the
 * system prompt and the conversation, ordered by descending {@link priority}.
 *
 * @remarks
 * Assembled once from its {@link InstructionInput} (the `id` minted by the storing
 * layer) and never mutated. `name` keys it in an {@link InstructionManagerInterface}
 * (last write wins); `priority` orders the rendered list (higher first), defaulting to
 * `0`. The {@link import('./AgentContext.js').AgentContext} build step renders it via
 * its manager's `format` (`content`) under the manager's `description` header.
 */
export interface InstructionInterface {
	readonly id: string
	readonly name: string
	readonly content: string
	/** Higher renders first; defaults to `0`. */
	readonly priority: number
	/**
	 * A fully-rendered per-item override of this instruction's prompt text — the
	 * MOST-SPECIFIC level of the {@link import('./AgentContext.js').AgentContext} build
	 * cascade, beating every format level for THIS item. Present only when supplied on the
	 * {@link InstructionInput} (round-tripped through the manager, like a message's
	 * `images`); absent ⇒ the cascade decides.
	 */
	readonly format?: string
}

/**
 * The minimal data to author an {@link InstructionInterface} — the `id` is minted by
 * the {@link InstructionManagerInterface} that stores it, so a caller supplies only
 * `name` / `content` (and an optional `priority`, defaulting to `0`).
 */
export interface InstructionInput {
	readonly name: string
	readonly content: string
	/** Ordering weight (higher renders first); defaults to `0` when omitted. */
	readonly priority?: number
	/**
	 * A fully-rendered override of THIS instruction's prompt text — the most-specific
	 * level of the {@link import('./AgentContext.js').AgentContext} build cascade (beats a
	 * manager-options / provider / built-in format for this item). Round-tripped onto the
	 * stored {@link InstructionInterface} when given (present-when-supplied, like `images`).
	 */
	readonly format?: string
}

/**
 * The push observation surface (§13) of an {@link InstructionManagerInterface} — the
 * mutation moments a fire-and-forget observer subscribes to via `manager.emitter.on`.
 *
 * @remarks
 * `add` carries the created (or replaced) {@link InstructionInterface}; `remove`
 * carries the removed instruction's `name`; `clear` is a pure signal (no payload).
 * Listener isolation is the emitter's (AGENTS §13): a listener throw is routed to the
 * emitter's `error` handler (the `error` option), never onto this map, so a buggy
 * observer can never corrupt a mutation. Declared as a `type` alias (not `interface
 * extends EventMap`, §4.5) so the type-literal satisfies `EventMap` structurally.
 */
export type InstructionManagerEventMap = {
	/** An instruction was added (or a same-name one replaced) — the created instruction. */
	readonly add: readonly [instruction: InstructionInterface]
	/** An instruction was removed — its `name`. */
	readonly remove: readonly [name: string]
	/** Every instruction was removed. */
	readonly clear: readonly []
}

/**
 * Options for `createInstructionManager` — the reserved `on` hooks (§8) plus an optional
 * per-section format override.
 *
 * @remarks
 * `on` is the §8 reserved key: initial listeners for the manager's
 * {@link InstructionManagerEventMap}, wired at construction. `format` is the
 * MANAGER-OPTIONS level of the {@link import('./AgentContext.js').AgentContext} build
 * cascade — a {@link ContextSectionFormat} the manager consults FIRST in its own
 * `description` / `format` (falling back to the built-in when a member is omitted), so it
 * BEATS the provider default and the built-in, while a per-item
 * {@link InstructionInput.format} still beats it. Omitted ⇒ the built-in framing applies.
 */
export interface InstructionManagerOptions {
	readonly on?: EmitterHooks<InstructionManagerEventMap>
	/** The emitter's listener-error handler (AGENTS §13) — a listener throw routes here, not to a domain event. */
	readonly error?: EmitterErrorHandler
	/** A manager-level format override (beats the provider default + built-in); see {@link AgentContextInterface.build}. */
	readonly format?: ContextSectionFormat<InstructionInterface>
}

/**
 * A registry of {@link InstructionInterface}s keyed by `name` — `add` (one or a batch,
 * §9.2) mints each `id` and OVERWRITES a same-name instruction (last write wins);
 * `instructions()` lists them SORTED by descending `priority` (stable for ties).
 *
 * @remarks
 * - **Build contract.** `description` is the section header a richer context renders
 *   the instructions under; `format(instruction)` renders one instruction (its
 *   `content`). Together they let an {@link import('./AgentContext.js').AgentContext}
 *   assemble an instructions block.
 * - **Observable (§13).** The owned `emitter` ({@link InstructionManagerEventMap})
 *   carries `add` / `remove` / `clear` for fire-and-forget observers; the emitter
 *   isolates a listener throw and routes it to its `error` handler (the `error` option, §13).
 */
export interface InstructionManagerInterface {
	readonly emitter: EmitterInterface<InstructionManagerEventMap>
	readonly count: number
	/** The section header a context renders the instructions under. */
	readonly description: string
	/**
	 * The manager-options format override (the {@link InstructionManagerOptions.format}
	 * supplied at construction), or `undefined` when none — the MANAGER-OPTIONS level of the
	 * {@link import('./AgentContext.js').AgentContext} build cascade, exposed so `build()`
	 * can interleave the provider default BENEATH it (`description` / `format` already
	 * encapsulate the `[override → built-in]` half for standalone use). A `readonly` data
	 * member, not a method.
	 */
	readonly framing: ContextSectionFormat<InstructionInterface> | undefined
	add(input: InstructionInput): InstructionInterface
	add(inputs: readonly InstructionInput[]): readonly InstructionInterface[]
	instruction(name: string): InstructionInterface | undefined
	/** Every instruction, sorted by descending `priority` (stable for equal priorities). */
	instructions(): readonly InstructionInterface[]
	/** Render one instruction for the prompt — its `content`. */
	format(instruction: InstructionInterface): string
	remove(name: string): boolean
	remove(names: readonly string[]): boolean
	clear(): void
}

/**
 * One context section's optional format override — an `open` / `render` / `close` trio
 * that frames a section in the {@link import('./AgentContext.js').AgentContext} build
 * cascade: a top line rendered once before the items, a per-item rendering, and a bottom
 * line rendered once after the items.
 *
 * @remarks
 * All three members are OPTIONAL and resolved INDEPENDENTLY (so an override may set only
 * the top, only the per-item rendering, only the bottom, or any mix). A section assembles
 * as `[open, ...items.map(render), close]` with empty / absent slots dropped, the survivors
 * blank-line (`\n\n`) joined — so `open` + `close` together let a developer WRAP the whole
 * group (e.g. `open: '<instructions>'` … `close: '</instructions>'`). `open` is the section's
 * leading text (the header, or a group's opening tag); `render` turns one section item (an
 * {@link InstructionInterface}) into its prompt text; `close` is the trailing text. `open`
 * and `render` cascade through the
 * built-in floor (`open` ⇒ the manager's built-in header, `render` ⇒ the manager's built-in
 * rendering); `close` has NO built-in, so an unset `close` simply yields no closing line.
 * It is the unit BOTH a provider's {@link ContextFormatInterface} (a per-section-kind
 * default) and a manager's `Options` carry — see {@link AgentContextInterface.build} for
 * the full precedence.
 *
 * @typeParam T - The section item the `render` override formats
 */
export interface ContextSectionFormat<T> {
	/**
	 * Text rendered ONCE before the section's items — the section header or a group's
	 * opening wrapper, e.g. `'<instructions>'`; omitted ⇒ the next cascade level decides
	 * (defaulting to the built-in header).
	 */
	readonly open?: string
	/** Override one item's rendering; omitted ⇒ the next cascade level decides. */
	readonly render?: (item: T) => string
	/**
	 * Text rendered ONCE after the section's items — a group's closing wrapper, e.g.
	 * `'</instructions>'`; omitted ⇒ no closing line (there is no built-in close).
	 */
	readonly close?: string
}

/**
 * A provider's OPTIONAL context-framing default, keyed by section kind — the framing a
 * model prefers (e.g. XML tags vs. Markdown headers), declared by a
 * {@link ProviderInterface} that opts in.
 *
 * @remarks
 * Each key is a {@link ContextSectionFormat} for one of the observable context sections
 * (currently `instructions`), so a provider can frame each section independently — and any
 * it omits falls through to that manager's built-in default. It is the PROVIDER-DEFAULT
 * level of the {@link import('./AgentContext.js').AgentContext} build cascade: it BEATS a
 * manager's built-in default but is BEATEN by a manager-options override and by a per-item
 * override (see {@link AgentContextInterface.build}). It references the ABSTRACT core
 * item interface ({@link InstructionInterface}), so a provider opting in imports it from
 * `@src/core` — the type is provider-agnostic, with no backend coupling. Omitting it
 * entirely (the default for an agnostic provider) leaves every section on its manager's
 * built-in framing.
 */
export interface ContextFormatInterface {
	/** The framing for the instructions section; omitted ⇒ that manager's built-in. */
	readonly instructions?: ContextSectionFormat<InstructionInterface>
}

/**
 * The per-category allow-lists a {@link ScopeInterface} carries — three optional
 * `readonly string[]`s, one per filterable context category, each keyed by that
 * category's identity (an instruction's `name`, a tool's `name`, a workspace file's
 * `path`).
 *
 * @remarks
 * Each list is THREE-WAY (see {@link import('./helpers.js').filterAllowList}): `undefined`
 * ⇒ NO constraint on that category (all pass); `[]` ⇒ NONE pass; a non-empty list ⇒ only
 * the listed keys pass. It is the shape both a {@link ScopeInput} and `Scope.narrow`
 * accept (a `name`-less narrowing config). `files` filters the ACTIVE workspace's rendered
 * files (by `path`) in {@link AgentContextInterface.build} — both the text files folded into
 * the system block and the image files attached to the last user message.
 */
export interface ScopeConfiguration {
	/** Allowed instruction `name`s (`undefined` ⇒ all, `[]` ⇒ none, else only-listed). */
	readonly instructions?: readonly string[]
	/** Allowed tool `name`s (`undefined` ⇒ all, `[]` ⇒ none, else only-listed). */
	readonly tools?: readonly string[]
	/**
	 * Allowed ACTIVE-workspace file `path`s (`undefined` ⇒ all, `[]` ⇒ none, else only-listed) —
	 * the filter {@link AgentContextInterface.build} applies to the active workspace's
	 * {@link WorkspaceInterface.files} before rendering them (text → the system block, image →
	 * the last user message).
	 */
	readonly files?: readonly string[]
}

/**
 * The data to author a {@link ScopeInterface} — a {@link ScopeConfiguration} plus the
 * required `name` (a human label; the `id` is minted by the layer that stores it).
 */
export interface ScopeInput extends ScopeConfiguration {
	readonly name: string
}

/**
 * A named, immutable filter over a richer context's items — the four per-category
 * allow-lists ({@link ScopeConfiguration}) plus an `id` / `name`, and a `narrow` that
 * composes a tighter child by set-INTERSECTION.
 *
 * @remarks
 * Each list is three-way (`undefined` ⇒ all, `[]` ⇒ none, else only-listed). `narrow`
 * returns a NEW scope whose per-category visible set is the intersection of this scope's
 * list and the config's — with `undefined` treated as the universal set (no constraint),
 * so `undefined ∩ list = list` and `undefined ∩ undefined = undefined`. Narrowing can
 * only TIGHTEN (a parent-excluded key never returns); the scope itself is never mutated.
 */
export interface ScopeInterface extends ScopeConfiguration {
	readonly id: string
	readonly name: string
	/**
	 * Compose a tighter child scope — its per-category set is the intersection of this
	 * scope's list and `config`'s (an `undefined` side imposing no constraint).
	 *
	 * @param config - The narrowing allow-lists (a `name`-less {@link ScopeConfiguration})
	 * @returns A NEW, tighter {@link ScopeInterface} (this one is left unchanged)
	 */
	narrow(config: ScopeConfiguration): ScopeInterface
}

/**
 * The push observation surface (§13) of a {@link ScopeManagerInterface} — analogous to
 * {@link InstructionManagerEventMap}, but keyed by the minted `id` and carrying `create`
 * (a scope always mints, never overwrites) rather than `add`.
 *
 * @remarks
 * `create` carries the created {@link ScopeInterface}; `remove` carries the removed
 * scope's `id`; `clear` is a pure signal. The emitter isolates a listener throw and routes
 * it to its `error` handler (§13). A `type` alias (§4.5) so it satisfies `EventMap` structurally.
 */
export type ScopeManagerEventMap = {
	/** A scope was created — the created scope. */
	readonly create: readonly [scope: ScopeInterface]
	/** A scope was removed — its `id`. */
	readonly remove: readonly [id: string]
	/** Every scope was removed. */
	readonly clear: readonly []
}

/**
 * Options for `createScopeManager` — the reserved `on` hooks (§8): initial listeners for
 * the manager's {@link ScopeManagerEventMap}, wired at construction.
 */
export interface ScopeManagerOptions {
	readonly on?: EmitterHooks<ScopeManagerEventMap>
	/** The emitter's listener-error handler (AGENTS §13) — a listener throw routes here, not to a domain event. */
	readonly error?: EmitterErrorHandler
}

/**
 * A registry of reusable {@link ScopeInterface}s keyed by their minted `id` — `create`
 * mints + stores one (never overwrites), `scopes()` lists them in insertion order.
 *
 * @remarks
 * - **Registry.** `create(input)` mints a scope (an `id` + the four allow-lists) and
 *   stores it; `count` is how many are stored. `scope(id)` looks one up; `scopes()` lists
 *   them in insertion order. (Keyed by minted `id`, not `name`, so two scopes may share a
 *   `name` and `create` always adds.)
 * - **Observable (§13).** The owned `emitter` ({@link ScopeManagerEventMap}) carries
 *   `create` / `remove` / `clear` for fire-and-forget observers; the emitter isolates a
 *   listener throw and routes it to its `error` handler (the `error` option, §13).
 */
export interface ScopeManagerInterface {
	readonly emitter: EmitterInterface<ScopeManagerEventMap>
	readonly count: number
	create(input: ScopeInput): ScopeInterface
	scope(id: string): ScopeInterface | undefined
	/** Every scope, in insertion order. */
	scopes(): readonly ScopeInterface[]
	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	clear(): void
}

/**
 * Options for `createAgentContext` — the richer context's configuration.
 *
 * @remarks
 * `system` is the optional system prompt prepended to the turn's input. `tools` /
 * `instructions` / `workspaces` are optional pre-built managers to reuse (bring your own
 * registry); when one is omitted, the context creates a fresh empty one. `scope` is the
 * initial active filter applied at `build()` time (and at the loop's tool-advertise step); it
 * defaults to `undefined` — no filtering — and is mutable through the context's `scope` setter
 * afterwards. `conversations` is the {@link ConversationManagerInterface} the context's message
 * source flows from: `messages` IS the manager's ACTIVE conversation's live tail and `build()`
 * folds that conversation's `view()` (section summaries + live). When omitted, a fresh
 * {@link ConversationManagerInterface} is created and a default conversation is added (so
 * `messages` is ALWAYS defined). All default to a context with no system prompt, empty registries,
 * no scope, and a fresh conversation registry holding one default conversation.
 */
export interface AgentContextOptions {
	readonly system?: string
	/** A pre-built tool registry to reuse; an empty one is created when omitted. */
	readonly tools?: ToolManagerInterface
	/** A pre-built instruction registry to reuse; an empty one is created when omitted. */
	readonly instructions?: InstructionManagerInterface
	/**
	 * A pre-built {@link WorkspaceManagerInterface} to reuse; a fresh empty one is created when
	 * omitted (so `context.workspaces` is ALWAYS present). `build()` renders the ACTIVE workspace's
	 * files by carrier — text files into the system block (fenced), image files attached to the last
	 * user message — and is mutable through the context's `workspaces` setter afterwards. The active
	 * workspace is the SOLE document/image context.
	 */
	readonly workspaces?: WorkspaceManagerInterface
	/** The initial active scope (the build-time filter); `undefined` ⇒ no filtering. */
	readonly scope?: ScopeInterface
	/**
	 * A pre-built {@link ConversationManagerInterface} to reuse as the message source; a fresh
	 * empty one is created when omitted. The context ENSURES an active conversation at construction
	 * (it `add`s a default when the manager has none), so `messages` — the manager's ACTIVE
	 * conversation's LIVE tail — is ALWAYS defined. `build()` folds the active conversation's
	 * `view()` (the per-section summaries + the live tail) as its AUTHORITATIVE message inclusion —
	 * the scope does NOT filter the conversation (it owns inclusion via compaction; scope filters
	 * only instructions / tools / workspace files). A SETTABLE mutable
	 * property afterwards (the context's `conversations` setter — swap the whole registry between
	 * runs), and the active conversation is switchable through the manager's `switch(id)`.
	 */
	readonly conversations?: ConversationManagerInterface
}

/**
 * Assembles a turn's provider input from the system prompt + the context managers +
 * the conversation, applying the active scope per category.
 *
 * @remarks
 * The richer context — `system` (the optional system prompt), the context managers
 * (`instructions` / `tools` / `workspaces` / `conversations`), `messages` (the active
 * conversation's live tail, satisfying {@link MessageManagerInterface}), and a mutable `scope`
 * (the active {@link ScopeInterface} filter, or `undefined` for no filtering). `build()` folds the
 * scoped instructions into ONE leading `system` message (under the manager's `description`,
 * each item via its `format`) — PLUS the ACTIVE workspace's scope-filtered text files
 * (rendered as fenced reference blocks) — and appends the ACTIVE conversation's `view()`, attaching
 * the active workspace's scope-filtered image files' base64 `data` to the LAST user message. The
 * active workspace is the SOLE document/image context. Tools are advertised to the provider
 * STRUCTURALLY (via `tools.definitions()`, scope-filtered by the loop), NOT serialized into
 * the prompt, so they never appear in `build()`'s output. The context managers are observable
 * (their own `emitter`s); the context itself is event-free.
 */
export interface AgentContextInterface {
	readonly system: string | undefined
	readonly instructions: InstructionManagerInterface
	/**
	 * The {@link WorkspaceManagerInterface} whose ACTIVE workspace `build()` renders by carrier —
	 * its text files folded into the system block (fenced reference blocks) and its image files'
	 * base64 `data` attached to the LAST user message. The active workspace is the SOLE
	 * document/image context. ALWAYS present (a fresh empty manager when none was supplied). A
	 * SETTABLE mutable property (a getter + setter, like {@link scope} / {@link conversations}, NOT a
	 * method): assign it to swap the whole workspace registry; `build()` reads its `active` (and the
	 * active workspace's `files()`) FRESH each call. With NO active workspace, nothing is rendered for
	 * workspaces. Active-only — never the other registered workspaces.
	 */
	workspaces: WorkspaceManagerInterface
	/**
	 * The active conversation's LIVE tail — the agent's message source, ALWAYS defined (the
	 * {@link conversations} registry always has an active conversation; a default is added at
	 * construction). It IS the active {@link ConversationInterface} itself (which satisfies
	 * {@link MessageManagerInterface} structurally), so appends through `messages` route to the
	 * active conversation's tail and `build()` folds its `view()`. Computed dynamically (it follows
	 * a `conversations.switch(id)` or a `conversations` swap), the SAME reference the active
	 * conversation exposes — no duplication.
	 */
	readonly messages: MessageManagerInterface
	/**
	 * The {@link ConversationManagerInterface} the message source flows from — `messages` IS its
	 * ACTIVE conversation's live tail and `build()` folds that conversation's `view()`. ALWAYS holds
	 * an active conversation (a default is added at construction when none was supplied), so
	 * `messages` is always defined. A SETTABLE mutable property (a getter + setter, like
	 * {@link scope} / {@link workspaces}, NOT a method): assign it to swap the whole conversation
	 * registry between runs; switch the active conversation through `conversations.switch(id)` — so
	 * one agent can serve MANY conversations (set the active one per request). Switch BETWEEN runs,
	 * not during one; for CONCURRENT threads use separate agents (see clause 25).
	 */
	conversations: ConversationManagerInterface
	readonly tools: ToolManagerInterface
	/** The active scope applied at `build()` time + the loop's tool-advertise step; mutable (`undefined` ⇒ no filtering). */
	scope: ScopeInterface | undefined
	/**
	 * The provider input for the next turn: a leading `system` message folding the prompt
	 * + the scoped instructions + the ACTIVE workspace's scoped-in TEXT files (rendered as
	 * fenced reference blocks), then the ACTIVE conversation's `view()` (with the active workspace's
	 * scoped-in IMAGE files' `data` attached to the last user message). Tools are advertised
	 * structurally, not in the prompt. Built fresh on each call.
	 *
	 * @remarks
	 * **The active workspace (rendered by carrier) — the SOLE document/image context.** When
	 * `workspaces.active` is set, its {@link WorkspaceInterface.files} are filtered by
	 * `scope.files` (a three-way allow-list; `undefined` ⇒ all active files), then split by
	 * carrier: TEXT files ({@link import('./helpers.js').isText}) render into a dedicated
	 * `## Workspace` section in the system block — each a fenced
	 * `` File: <path>\n```<language>\n<text>\n``` `` block — placed just after the instructions
	 * section; IMAGE files ({@link import('./helpers.js').isImage}) have their base64 `data`
	 * attached to the LAST user message (a vision provider reads images off a user turn).
	 * ACTIVE-ONLY — never the other registered workspaces; with NO active workspace nothing is
	 * rendered for workspaces.
	 *
	 * **The format cascade.** Each manager section frames as `[open, ...items.map(render), close]`
	 * (empty / absent slots dropped, the survivors `\n\n`-joined). The `open` (the section's
	 * leading text), each item's `render`, and the `close` (the section's trailing text)
	 * resolve INDEPENDENTLY, MOST-SPECIFIC-FIRST, from a {@link ContextSectionFormat} at each
	 * level — an item override, a manager-options override, the provider `format` default,
	 * and the manager's built-in. For a section kind `K` (currently `instructions`), manager
	 * `M`, and the supplied `format` `F`:
	 * - **open** = `M.optionsFormat?.open ?? F?.[K]?.open ?? M.builtInOpen` — i.e.
	 *   **manager-options override > provider default > built-in** (the leading text has no
	 *   per-item level). The manager ENCAPSULATES the `[options-override → built-in]` half:
	 *   `M.description` already returns the options override's `open` when one is set, else
	 *   the built-in header — so `build()` only layers the provider default BETWEEN them.
	 * - **item** `I` = `I.format ?? M.optionsFormat?.render?.(I) ?? F?.[K]?.render?.(I) ?? M.builtInFormat(I)`
	 *   — i.e. **item override > manager-options override > provider default > built-in**.
	 *   Again `M.format(I)` already returns the options override when set, else the
	 *   built-in, so `build()` layers the per-item `I.format` ON TOP and the provider
	 *   default BETWEEN.
	 * - **close** = `M.optionsFormat?.close ?? F?.[K]?.close` — i.e. **manager-options
	 *   override > provider default**, with NO built-in floor (the trailing text has no
	 *   per-item level): unset at both levels ⇒ `undefined` ⇒ no closing line. Paired with
	 *   `open`, it lets a level WRAP the group (`open: '<instructions>'` … `close: '</instructions>'`).
	 *
	 * Passing NO `format` (the default) leaves the provider-default level empty, so the
	 * output is BYTE-FOR-BYTE the managers' built-in framing — every section is just its
	 * built-in header + items, with no closing line (the regression contract). Scope
	 * filtering runs BEFORE formatting (unchanged); the workspace image-data attachment to the
	 * last user message is unchanged.
	 *
	 * @param format - The provider's optional {@link ContextFormatInterface} default
	 *   (typically `provider.format`); omitted ⇒ only the manager-options / item / built-in
	 *   levels apply, reproducing the prior built-in output exactly
	 * @returns The scoped conversation, prefixed by the assembled `system` message when any
	 *   of (the prompt, the scoped instructions, the active workspace's text files) is non-empty
	 */
	build(format?: ContextFormatInterface): readonly MessageInterface[]
}

/**
 * The lifecycle state of an {@link AgentInterface} turn — `idle` before a run,
 * `running` while the loop is in flight, then the settled `done` (a normal finish or
 * a cancel) or `error` (a genuine provider / tool failure).
 */
export type AgentStatus = 'idle' | 'running' | 'done' | 'error'

/**
 * A streamed step of an agent turn — the discriminated union the loop yields as it
 * runs.
 *
 * @remarks
 * - `token` — a content delta the provider streamed (the `'content'`
 *   {@link ProviderDelta}s a {@link ProviderInterface}'s `stream` yields), re-surfaced for
 *   live rendering of the assistant ANSWER.
 * - `think` — a reasoning delta the provider streamed (the `'thinking'`
 *   {@link ProviderDelta}s, the daemon's native `message.thinking` channel), surfaced so a
 *   consumer can stream the model's reasoning LIVE into a collapsible; NEVER answer content
 *   (it is never fed into the accumulated `content`).
 * - `tool` — a {@link ToolCall} the loop dispatched paired with its {@link ToolResult},
 *   emitted once the tool ran (so a consumer sees what was called and what came back).
 * - `usage` — one provider call's {@link TokenUsage}, emitted after each turn's
 *   provider response that reported it (folded into the running total + any budget).
 */
export type AgentChunk =
	| { readonly type: 'token'; readonly content: string }
	| { readonly type: 'think'; readonly content: string }
	| { readonly type: 'tool'; readonly call: ToolCall; readonly result: ToolResult }
	| { readonly type: 'usage'; readonly usage: TokenUsage }

/**
 * The settled outcome of an agent turn — the assembled assistant `content`, the
 * `usage` summed across the turn's provider calls, and whether it was committed
 * `partial`.
 *
 * @remarks
 * `partial` is `true` when the turn was committed early from a cancel — an external
 * `signal` abort, the turn's own `abort()`, a `timeout` deadline, or an exhausted
 * `budget` — in which case `content` is whatever had accumulated when the cancel
 * landed. It is `false` for a turn that ran to a natural finish. `usage` is present
 * only when at least one provider call reported usage. `thinking` is present only
 * when a provider call surfaced reasoning it separated from the answer
 * ({@link ProviderResult.thinking}, joined across the run's calls) — display/audit
 * metadata that never re-enters the conversation.
 */
export interface AgentResult {
	readonly content: string
	/** Reasoning the run's provider calls separated from the answer (present when any surfaced it). */
	readonly thinking?: string
	/** The summed {@link TokenUsage} across the turn's provider calls (present when any reported it). */
	readonly usage?: TokenUsage
	readonly partial: boolean
}

/**
 * The mutable per-run sink an {@link AgentInterface}'s loop fills as it runs — the
 * assembled outcome its `stream`'s `result` promise resolves into a settled
 * {@link AgentResult} once the run completes.
 *
 * @remarks
 * Created fresh per run (so concurrent runs never share state) and threaded through
 * the loop: `content` accumulates the streamed assistant text, `thinking` the
 * reasoning the provider calls separated from it ({@link ProviderResult.thinking},
 * joined across calls — `undefined` until one surfaces it), `usage` the summed
 * {@link TokenUsage} (present only when a provider call reported it), and `partial`
 * flips `true` when a cancel commits the run early. It is the INTERNAL precursor to
 * the settled `AgentResult` — the loop reads it back to assemble the public result —
 * not a caller-facing shape.
 */
export interface RunOutcome {
	content: string
	thinking: string | undefined
	usage: TokenUsage | undefined
	partial: boolean
}

/**
 * The PER-RUN auto-compaction state threaded through an {@link AgentInterface}'s loop —
 * a tiny mutable holder created fresh per run (so no state leaks across runs or a
 * conversation switch), mirroring how {@link RunOutcome} is the per-run sink.
 *
 * @remarks
 * `futile` latches once the loop's between-turns `compact()` resolves `undefined` while
 * the prompt is still over the context window (the v1 single-level limit — the live tail
 * is at/below `keep` and the over-window is structural), so auto-compaction STOPS for the
 * rest of that run (no per-turn churn). Like {@link RunOutcome}, it is INTERNAL loop state
 * — the loop reads + flips it as it runs, not a caller-facing shape.
 */
export interface CompactionState {
	futile: boolean
}

/**
 * The push observation surface of an {@link AgentInterface} (AGENTS §13) — the
 * lifecycle + usage/tool moments a fire-and-forget observer (logging, metrics,
 * tracing) subscribes to, ALONGSIDE the pull {@link AgentChunk} stream.
 *
 * @remarks
 * Push vs. pull: the Emitter carries the loop's LIFECYCLE moments (a run begins /
 * each turn / a settle / a cancel) plus usage and dispatched-tool events — the things
 * the chunk stream can't express (a `deny` never reaches the stream) or that a
 * fire-and-forget observer wants without draining the stream. PER-TOKEN deltas stay
 * EXCLUSIVELY the {@link AgentChunk} stream's job (the pull surface) — there is
 * deliberately NO `token` event here. Subscribe via `agent.emitter.on(...)`.
 *
 * Observation is provably side-effect-free on the loop: listener isolation is the emitter's
 * (§13) — every event is emitted directly and a listener throw is routed to the emitter's OWN
 * `error` handler (the `error` option), never onto this domain map and never into the
 * settle-once / wake-park engine — so a buggy observer can never reorder, throw into, or
 * corrupt the run.
 *
 * A cancelled run emits `abort` (the cancel signal) AND then `finish` (the settled
 * PARTIAL result) — so an observer sees both that the run was cancelled and the partial
 * outcome it committed; a genuine error emits `error` instead of `finish`.
 *
 * Declared as a `type` alias (not `interface extends EventMap`, §4.5 — `EventMap` is a
 * `type` kind): a type-literal satisfies the `EventMap` constraint
 * (`Record<string, readonly unknown[]>`) structurally, whereas an interface lacks the
 * required index signature.
 */
export type AgentEventMap = {
	/** A run begins — emitted at the top of `stream()` once `status` is `running`. */
	readonly start: readonly [id: string]
	/** Each `#run` loop iteration begins — the zero-based turn index. */
	readonly turn: readonly [index: number]
	/** A dispatched {@link ToolCall} paired with its {@link ToolResult} (executed or a denial). */
	readonly tool: readonly [call: ToolCall, result: ToolResult]
	/** A turn reported {@link TokenUsage} — emitted after a usage-bearing provider call. */
	readonly usage: readonly [usage: TokenUsage]
	/** The authority DENIED a call — the call + the optional reason (NOT in the chunk stream). */
	readonly deny: readonly [call: ToolCall, reason: string | undefined]
	/** The run settled successfully (a natural finish OR a cancel's partial) — the {@link AgentResult}. */
	readonly finish: readonly [result: AgentResult]
	/** The run settled with a genuine (non-cancel) error — the thrown value (always `unknown`). */
	readonly error: readonly [error: unknown]
	/** The run was cancelled (external signal / timeout / budget / `abort()`) — the cancel reason. */
	readonly abort: readonly [reason: unknown]
	/**
	 * AUTOMATIC compaction's summarizer THREW — a NON-FATAL warn channel (the run continues; see
	 * {@link AgentOptions.window}). When the loop's between-turns / pre-first-turn auto-compaction
	 * (`conversation.compact()`) rejects, the run does NOT crash: the loop skips compaction that
	 * turn and surfaces the caught error here so the failure is observable, never silently lost.
	 * Distinct from `error` (a GENUINE provider/tool failure that REJECTS the run) — this is a
	 * best-effort optimization that failed. A MANUAL `conversation.compact()` still propagates its
	 * own error; only the agent's AUTO path is resilient. A DOMAIN event (the emitter isolates a
	 * listener throw separately, routing it to its `error` handler).
	 */
	readonly compactError: readonly [error: unknown]
}

/**
 * A live event stream paired with the eventual settled result and a cancel — the
 * generic pull/streaming handle a long-running operation hands back.
 *
 * @remarks
 * Iterate `events` to consume the live `T` chunks as they arrive; `await result` for
 * the eventual `R` outcome (it resolves once `events` completes). `abort(reason)`
 * cancels the in-flight operation — for an agent turn the `result` then RESOLVES
 * (with a partial outcome), since a cancel is not an error.
 *
 * @typeParam T - The live event type the stream yields
 * @typeParam R - The settled result the operation resolves to
 */
export interface StreamInterface<T, R> {
	readonly events: AsyncIterable<T>
	readonly result: Promise<R>
	/**
	 * Cancel the in-flight operation — fires its bound signal.
	 *
	 * @param reason - An optional cancellation reason propagated to the signal
	 */
	abort(reason?: unknown): void
}

/**
 * The agent turn's live handle — a {@link StreamInterface} of {@link AgentChunk}s
 * resolving an {@link AgentResult}.
 */
export type AgentStreamInterface = StreamInterface<AgentChunk, AgentResult>

/**
 * Options for `createAgent` — bounds and pacing for the agent loop.
 *
 * @remarks
 * - `system` — an optional system prompt prepended to the turn (seeds the context).
 * - `tools` — an optional pre-built {@link ToolManagerInterface} the loop dispatches
 *   the model's calls through; an empty one is created when omitted.
 * - `limit` — the maximum number of tool-iteration turns before the loop stops
 *   (defaults to `DEFAULT_AGENT_LIMIT`), so a model that keeps requesting tools can't
 *   loop forever.
 * - `timeout` — an optional wall-clock deadline (ms) for the whole turn; its signal
 *   folds into the turn's bound, committing a partial result on expiry.
 * - `budget` — an optional token {@link BudgetInterface} cost bound; the loop charges
 *   each provider call's usage and its signal folds into the turn's bound, committing
 *   a partial result once exhausted.
 * - `scheduler` — an optional {@link SchedulerInterface} that paces the loop —
 *   `yield`ed between turns so the host regains control between expensive provider
 *   calls.
 * - `signal` — an optional external `AbortSignal` whose abort cancels the turn (a
 *   partial result).
 * - `conversations` — an optional {@link ConversationManagerInterface} forwarded to the agent's
 *   context as the message source (so `context.messages` is its ACTIVE conversation's live tail);
 *   omitted ⇒ a fresh registry holding one default conversation. Auto-compaction (`window`) folds
 *   the ACTIVE conversation when it is summarizable.
 * - `window` — an optional CONTEXT {@link BudgetInterface} for AUTOMATIC conversation
 *   compaction: when set, the loop measures the CURRENT FULL prompt against this budget each turn
 *   (its `consume` is a token estimator, its `max` the context window) and, when the prompt
 *   reaches the window AND the active conversation is summarizable, COMPACTS the active
 *   conversation + continues on the rebuilt smaller view — compact-and-continue, distinct from
 *   `budget`'s hard abort. Omitted ⇒ no auto-compaction.
 * - `on` — the reserved {@link EmitterHooks} key (§8): initial listeners for the agent's
 *   {@link AgentEventMap}, wired at construction (e.g. `{ finish: (r) => log(r) }`).
 */
export interface AgentOptions {
	readonly on?: EmitterHooks<AgentEventMap>
	/** The emitter's listener-error handler (AGENTS §13) — a listener throw routes here, not to a domain event. */
	readonly error?: EmitterErrorHandler
	readonly system?: string
	/** A pre-built tool registry the loop dispatches calls through; an empty one is created when omitted. */
	readonly tools?: ToolManagerInterface
	/** Max tool-iteration turns before the loop stops; defaults to `DEFAULT_AGENT_LIMIT`. */
	readonly limit?: number
	/** A wall-clock deadline (ms) for the whole turn; its abort commits a partial result. */
	readonly timeout?: number
	/** A token cost bound; each provider call's usage is charged and its abort commits a partial. */
	readonly budget?: BudgetInterface<TokenUsage>
	/** Paces the loop — `yield`ed between turns so the host regains control. */
	readonly scheduler?: SchedulerInterface
	/** An external cancel; its abort commits a partial result. */
	readonly signal?: AbortSignal
	/**
	 * An optional policy gate consulted before each tool call runs — a denied call is
	 * fed back to the model as a denial {@link ToolResult} (a `tool` chunk + a tool
	 * message) rather than executed (no tool run, no budget cost), so the model sees the
	 * denial and can react; an allowed call dispatches normally. Omitted ⇒ every call
	 * dispatches as before.
	 */
	readonly authority?: AuthorityInterface
	/**
	 * An optional {@link ConversationManagerInterface} that becomes the agent context's MESSAGE
	 * SOURCE — forwarded to the {@link AgentContextInterface} the agent builds, so
	 * `agent.context.messages` IS its ACTIVE conversation's live tail and `build()` folds that
	 * conversation's `view()` (the per-section summaries + the live tail). Omitted ⇒ a fresh
	 * registry holding one default conversation. With `window` set, AUTOMATIC compaction folds the
	 * ACTIVE conversation between turns (when it is summarizable).
	 */
	readonly conversations?: ConversationManagerInterface
	/**
	 * An optional CONTEXT {@link BudgetInterface} for AUTOMATIC compaction. Its `consume` is a
	 * token estimator (e.g. the exported {@link import('./helpers.js').estimateMessages}) and
	 * its `max` is the context window. When set, the loop measures the CURRENT FULL prompt (the
	 * next provider request) against this budget each turn; when that prompt reaches the window AND
	 * the active conversation is summarizable, it **compacts the active conversation + continues on
	 * the rebuilt smaller view** (compact-and-continue) — the same consume-to-a-ceiling primitive
	 * as the cost `budget`, but compaction is the ceiling action instead of abort. Omit to disable.
	 */
	readonly window?: BudgetInterface<readonly MessageInterface[]>
}

/**
 * The agent loop — composes a {@link ProviderInterface}, an
 * {@link AgentContextInterface}, and a {@link ToolManagerInterface} into a bounded
 * context → provider → tools → repeat turn.
 *
 * @remarks
 * - **One loop, two faces.** `generate` and `stream` share ONE private run, so they
 *   can never diverge: `generate` drains the same stream `stream` exposes, then
 *   resolves its settled {@link AgentResult}.
 * - **Bounded.** Each turn arms a single cancel folded from the external `signal`, the
 *   `timeout` deadline, and the `budget` signal (via `AbortSignal.any`); any of them —
 *   or `abort()` — stops the loop and settles the result `partial: true`.
 * - **Paced + capped.** The `scheduler` (when given) yields between turns; tool
 *   iteration is capped at `limit` so the loop always terminates.
 * - **Two observation surfaces.** PULL: the {@link AgentChunk} stream (`stream().events`)
 *   carries per-token answer deltas, per-think reasoning deltas, and usage/tool chunks for a live consumer. PUSH: the
 *   {@link emitter} ({@link AgentEventMap}) carries lifecycle + usage/tool/deny moments
 *   for fire-and-forget observers — the emitter isolates a listener throw and routes it to
 *   its `error` handler (the `error` option, §13), so a buggy observer can NEVER corrupt the
 *   loop. Per-token / per-thinking deltas are the stream's job exclusively; there is no
 *   `token` or `think` event.
 */
export interface AgentRunOptions {
	/**
	 * The per-run reasoning preference forwarded to the provider's `stream` as
	 * {@link ProviderStreamOptions.think} — `true` asks the backend to separate reasoning
	 * (surfaced as `think` {@link AgentChunk}s + the settled `thinking`), `false` suppresses
	 * it. Omitted ⇒ the provider's own default applies (the loop is byte-for-byte the prior
	 * behaviour), so a caller that passes no options runs exactly as before.
	 */
	readonly think?: boolean
}

export interface AgentInterface {
	readonly emitter: EmitterInterface<AgentEventMap>
	readonly id: string
	readonly status: AgentStatus
	readonly context: AgentContextInterface
	/**
	 * Run the turn to completion, discarding the live chunks — drains the shared
	 * stream and resolves the settled outcome.
	 *
	 * @param options - Optional per-run {@link AgentRunOptions} (e.g. `think`); omitted ⇒ defaults
	 * @returns The settled {@link AgentResult} (`partial: true` when cancelled)
	 */
	generate(options?: AgentRunOptions): Promise<AgentResult>
	/**
	 * Run the turn as a live stream — iterate `events` for {@link AgentChunk}s and
	 * `await result` for the settled outcome.
	 *
	 * @param options - Optional per-run {@link AgentRunOptions} (e.g. `think`); omitted ⇒ defaults
	 * @returns A live {@link AgentStreamInterface} handle (events + result + abort)
	 */
	stream(options?: AgentRunOptions): AgentStreamInterface
	/**
	 * Cancel the in-flight turn — fires the turn's signal; the `result` settles
	 * `partial: true` with whatever content accumulated.
	 *
	 * @param reason - An optional cancellation reason propagated to the signal
	 */
	abort(reason?: unknown): void
}

/**
 * What an {@link AuthorityInterface} evaluates for one tool call — the call under
 * consideration.
 *
 * @remarks
 * Lean by design: it carries only the {@link ToolCall} now (the tool `name` and its
 * parsed `arguments`), which is enough for a rule to branch on what is being called
 * and with what. It is a seam for richer policy inputs (call history, agent state)
 * later WITHOUT changing the `evaluate` signature — those would join as new fields.
 */
export interface AuthorityContextInterface {
	readonly call: ToolCall
}

/**
 * An {@link AuthorityInterface}'s verdict on one tool call.
 *
 * @remarks
 * `zone` is a project-defined classification (e.g. `'default'` / `'sensitive'` /
 * `'restricted'`) carried for routing + observability; `allowed` is the gate decision
 * (a denied call is fed back to the model, never executed); `reason` is an optional
 * human-readable explanation surfaced in the denial {@link ToolResult}.
 */
export interface AuthorityDecision {
	readonly zone: string
	readonly allowed: boolean
	readonly reason?: string
}

/**
 * One ordered policy rule an {@link AuthorityInterface} evaluates.
 *
 * @remarks
 * The FIRST rule whose `match` returns true decides; if none match, the authority's
 * `fallback` decides. A matched rule ALLOWS by default and DENIES only when its
 * `allowed` is explicitly `false`. `zone` classifies the matched call; `reason` is the
 * optional explanation carried into the {@link AuthorityDecision} (and, on a denial,
 * into the denial {@link ToolResult}).
 */
export interface AuthorityRule {
	readonly match: (context: AuthorityContextInterface) => boolean
	readonly zone: string
	readonly allowed?: boolean
	readonly reason?: string
}

/**
 * Options for `createAuthority` — the ordered rules and the no-match fallback.
 *
 * @remarks
 * `rules` are evaluated in order, first match wins (see {@link AuthorityRule}).
 * `fallback` is the {@link AuthorityDecision} returned when NO rule matches; it
 * defaults to `{ zone: DEFAULT_AUTHORITY_ZONE, allowed: true }` (allow-unmatched — a
 * rules list of denials acts as a denylist). Set `fallback` to an `allowed: false`
 * decision to flip the gate to deny-by-default (an allowlist — only matched rules
 * that allow get through).
 */
export interface AuthorityOptions {
	readonly rules?: readonly AuthorityRule[]
	readonly fallback?: AuthorityDecision
}

/**
 * A synchronous policy gate consulted before each tool call runs — it turns one
 * {@link AuthorityContextInterface} into an {@link AuthorityDecision}.
 *
 * @remarks
 * Ordered first-match-wins over the configured rules, falling back to the configured
 * default when none match (see {@link AuthorityOptions}). Synchronous by design now;
 * the async human-approval handshake (request / grant / deny) is deferred to a later
 * chunk. Event-free — no Emitter, no events.
 */
export interface AuthorityInterface {
	/**
	 * Evaluate one tool call against the ordered rules.
	 *
	 * @param context - The call under consideration (see {@link AuthorityContextInterface})
	 * @returns The first matching rule's verdict, or the fallback when none match
	 */
	evaluate(context: AuthorityContextInterface): AuthorityDecision
}

/**
 * A JSON-serializable agent job — the descriptor a durable queue / runner runs. Its
 * non-serializable pieces (the provider, tools, authority, scheduler) are referenced by
 * NAME and resolved to live objects through an {@link AgentRegistryInterface} at handler
 * time; its data fields (the seed `messages`, `system`, `limit`, `timeout`, and a token
 * `budget` ceiling) carry directly.
 *
 * @remarks
 * Because every field is JSON-serializable, a job survives a crash through the Queue's
 * `store` + `restore()` (it satisfies a {@link QueueStoreInterface}'s serializable
 * `StoredEntry.input` requirement) — the registry rehydrates a live, seeded agent from
 * the names + data on the way back in. `provider` is the only required field (the model
 * to run); `messages` defaults to an empty seed. `tools` lists registry keys whose
 * resolved tools are loaded into the agent's manager; `authority` / `scheduler` are
 * single registry keys (their live objects carry functions, so they can't serialize).
 * `budget` is a token ceiling rebuilt into a `createTokenBudget({ max })`.
 */
export interface AgentJobInput {
	/** The registry key of the {@link ProviderInterface} the job runs against. */
	readonly provider: string
	/** The seed conversation added to the rehydrated agent's context (serializable). */
	readonly messages: readonly MessageInput[]
	/** An optional system prompt seeding the agent's context. */
	readonly system?: string
	/** Registry keys of the {@link ToolInterface}s loaded into the agent's tool manager. */
	readonly tools?: readonly string[]
	/** The registry key of an optional {@link AuthorityInterface} policy gate. */
	readonly authority?: string
	/** The registry key of an optional {@link SchedulerInterface} pacing the loop. */
	readonly scheduler?: string
	/** Max tool-iteration turns before the loop stops (see {@link AgentOptions.limit}). */
	readonly limit?: number
	/** A wall-clock deadline (ms) for the whole turn (see {@link AgentOptions.timeout}). */
	readonly timeout?: number
	/** A token ceiling rebuilt into a `createTokenBudget({ max })` cost bound. */
	readonly budget?: number
	/**
	 * Sub-agent jobs this job fans out — each a nested {@link AgentJobInput} (so the whole
	 * tree stays serializable). On a `createAgentRunner`, the handler `controller.spawn`s
	 * each child through the same bounded queue BEFORE running this (parent) job, so the
	 * children run as sibling sub-agents and their results join the run after the declared
	 * jobs (in spawn order). Ignored by `createAgentQueue` (a queue has no fan-out).
	 */
	readonly children?: readonly AgentJobInput[]
}

/**
 * Resolves an {@link AgentJobInput}'s names to the live, non-serializable pieces and
 * rehydrates a seeded, signal-wired {@link AgentInterface} — the bridge that makes a
 * durable, serializable job runnable.
 *
 * @remarks
 * - **Accessors throw on a miss (§9.1 + §12).** `provider` / `tool` / `authority` /
 *   `scheduler` look one up by name and THROW a clear `Error` (`unknown provider:
 *   <name>`, etc.) when the name is unregistered — an unknown name in a rehydrated job
 *   must fail loudly, never silently resolve to `undefined`, so a misconfigured job
 *   surfaces at once rather than running with a missing dependency.
 * - **`build` rehydrates.** It resolves the job's `provider`, assembles a
 *   {@link ToolManagerInterface} from the `tools` names, rebuilds the token `budget`
 *   from its ceiling, resolves the `authority` / `scheduler` names, seeds the agent's
 *   context with the `messages` (and `system`), threads the supplied `signal` into the
 *   agent so a queue / runner cancel propagates, and returns the ready agent.
 * - **Event-free.** A pure resolver — no Emitter, no events.
 */
export interface AgentRegistryInterface {
	/**
	 * Resolve a registered {@link ProviderInterface} by name.
	 *
	 * @param name - The provider's registry key
	 * @returns The live provider
	 * @throws If no provider is registered under `name`
	 */
	provider(name: string): ProviderInterface
	/**
	 * Resolve a registered {@link ToolInterface} by name.
	 *
	 * @param name - The tool's registry key
	 * @returns The live tool
	 * @throws If no tool is registered under `name`
	 */
	tool(name: string): ToolInterface
	/**
	 * Resolve a registered {@link AuthorityInterface} by name.
	 *
	 * @param name - The authority's registry key
	 * @returns The live authority
	 * @throws If no authority is registered under `name`
	 */
	authority(name: string): AuthorityInterface
	/**
	 * Resolve a registered {@link SchedulerInterface} by name.
	 *
	 * @param name - The scheduler's registry key
	 * @returns The live scheduler
	 * @throws If no scheduler is registered under `name`
	 */
	scheduler(name: string): SchedulerInterface
	/**
	 * Rehydrate a live, seeded {@link AgentInterface} from a serializable job — resolving
	 * its names, rebuilding its budget, seeding its conversation, and wiring `signal`.
	 *
	 * @param input - The serializable {@link AgentJobInput} to rehydrate
	 * @param signal - An optional cancel threaded into the agent (a queue / runner abort)
	 * @returns The ready agent, its context seeded with the job's messages
	 * @throws If any referenced name (provider / tools / authority / scheduler) is unknown
	 */
	build(input: AgentJobInput, signal?: AbortSignal): AgentInterface
}

/**
 * Options for `createAgentRegistry` — the named pools of live, non-serializable pieces
 * a {@link AgentJobInput}'s names resolve against.
 *
 * @remarks
 * `providers` is required (a job always names a provider); `tools` / `authorities` /
 * `schedulers` are optional pools, each an entity-keyed record (§8) mapping a registry
 * name to its live object. A name absent from its pool throws when resolved (see
 * {@link AgentRegistryInterface}).
 */
export interface AgentRegistryOptions {
	readonly providers: Readonly<Record<string, ProviderInterface>>
	readonly tools?: Readonly<Record<string, ToolInterface>>
	readonly authorities?: Readonly<Record<string, AuthorityInterface>>
	readonly schedulers?: Readonly<Record<string, SchedulerInterface>>
}

/**
 * Options for `createAgentQueue` — the registry that rehydrates jobs, the partial-result
 * policy, and the substrate knobs threaded into the backing `createQueue`.
 *
 * @remarks
 * - `registry` — the {@link AgentRegistryInterface} the handler rehydrates each job
 *   through (required).
 * - `allowPartial` — the partial policy. A partial {@link AgentResult} (a job committed
 *   early from an abort / budget / timeout) is by DEFAULT a FAILURE: the handler THROWS
 *   an {@link import('./errors.js').AgentJobError}, so the Queue's retries (and a
 *   Runner's fail-fast) engage. Set `true` to treat a partial as SUCCESS instead — the
 *   handler resolves the partial result rather than throwing.
 * - `concurrency` / `retries` / `timeout` / `store` — passed straight to the backing
 *   `QueueInterface` (see `QueueOptions`): bounded concurrency, the retry budget, the
 *   per-attempt deadline, and the durable backing for persistence + replay.
 */
export interface AgentQueueOptions {
	readonly registry: AgentRegistryInterface
	/** A partial `AgentResult` THROWS by default (retries engage); `true` resolves it as success. */
	readonly allowPartial?: boolean
	readonly concurrency?: number
	readonly retries?: number
	readonly timeout?: number
	readonly store?: QueueStoreInterface<AgentJobInput>
}

/**
 * Options for `createAgentRunner` — the registry that rehydrates jobs, the partial-result
 * policy, and the substrate knobs threaded into the backing `createRunner`.
 *
 * @remarks
 * Identical partial policy to {@link AgentQueueOptions} (`allowPartial` — a partial
 * `AgentResult` THROWS by default so the run's fail-fast engages, `true` resolves it as
 * success). `concurrency` / `retries` / `timeout` pass straight to the backing
 * `RunnerInterface` (see `RunnerOptions`). The runner enables sub-agent fan-out: a
 * parent job's handler can `controller.spawn(childJob)` to launch a child agent job
 * through the same bounded queue.
 */
export interface AgentRunnerOptions {
	readonly registry: AgentRegistryInterface
	/** A partial `AgentResult` THROWS by default (fail-fast engages); `true` resolves it as success. */
	readonly allowPartial?: boolean
	readonly concurrency?: number
	readonly retries?: number
	readonly timeout?: number
}

/**
 * A provider-agnostic conversation summarizer — the seam the agent RUNTIME supplies so
 * core never imports a provider. Given the folded messages, it resolves their digest (the
 * model-written summary), used both to summarize a compacted {@link SectionInterface} and
 * to regenerate a {@link ConversationInterface}'s rollup `summary`.
 *
 * @remarks
 * The agent runtime builds one from its `ProviderInterface` (e.g.
 * `async (messages) => (await provider.generate([systemPrompt, ...messages], signal)).content`)
 * and hands it to a {@link ConversationInterface} / {@link ConversationManagerInterface}.
 * The core conversation layer treats it as an opaque async function — it neither knows nor
 * cares which backend produced the digest, keeping `core` free of any provider coupling.
 *
 * @param messages - The folded messages to digest into a summary
 * @returns The summary text (the model-written digest of those messages)
 */
export type ConversationSummarizer = (messages: readonly MessageInterface[]) => Promise<string>

/**
 * A slice of folded messages digested into a summary — the unit of compaction a
 * {@link ConversationInterface} produces when it `compact`s its live tail.
 *
 * @remarks
 * `summary` is the model-written digest of this slice (via the
 * {@link ConversationSummarizer}); `messages` are the folded ORIGINALS, RETAINED in full so
 * `rehydrate` can pull them back and `search` can scan them (compaction shrinks the model
 * INPUT, never discards history).
 */
export interface SectionInterface {
	readonly id: string
	/** The model-written digest of this slice (its {@link ConversationSummarizer} output). */
	readonly summary: string
	/** The folded original messages, RETAINED in full for `rehydrate` / `search`. */
	readonly messages: readonly MessageInterface[]
}

/**
 * The push observation surface (§13) of a {@link ConversationInterface} — the compaction
 * moments a fire-and-forget observer subscribes to via `conversation.emitter.on`.
 *
 * @remarks
 * `compact` carries the newly-folded {@link SectionInterface}; `summary` carries the
 * regenerated conversation rollup (refreshed on each compaction); `rehydrate` carries the
 * `id` of a section whose originals were pulled back. Listener isolation is the emitter's
 * (§13): every event is emitted directly and a listener throw is routed to the emitter's
 * `error` handler (the `error` option), never onto this map, so a buggy observer can never
 * corrupt a compaction. A `type` alias (not `interface extends EventMap`, §4.5) so the
 * type-literal satisfies `EventMap` structurally.
 */
export type ConversationEventMap = {
	/** A new section was folded from the live tail — the created section. */
	readonly compact: readonly [section: SectionInterface]
	/** The conversation rollup was regenerated — the new summary text. */
	readonly summary: readonly [summary: string]
	/** A section's original messages were pulled back — the section's `id`. */
	readonly rehydrate: readonly [id: string]
}

/**
 * Options for `createConversation` — the optional `id`, the reserved `on` hooks (§8), the
 * provider-agnostic `summarize` seam, and the retained-tail size.
 *
 * @remarks
 * `id` is the conversation's identity (a random UUID when omitted). `on` is the §8 reserved
 * key (initial {@link ConversationEventMap} listeners). `summarize` is the
 * {@link ConversationSummarizer} compaction needs — ABSENT ⇒ `compact()` throws a
 * {@link import('./errors.js').ConversationError} (a conversation can still store + view a
 * live tail, it just cannot fold). `keep` is how many recent live messages a `compact()`
 * retains VERBATIM (folding only the older ones); it defaults to
 * {@link import('./constants.js').DEFAULT_CONVERSATION_KEEP} (`0` — a manual `compact()`
 * folds the WHOLE current live tail into one section).
 */
export interface ConversationOptions {
	readonly id?: string
	readonly on?: EmitterHooks<ConversationEventMap>
	/** The emitter's listener-error handler (AGENTS §13) — a listener throw routes here, not to a domain event. */
	readonly error?: EmitterErrorHandler
	/** The summarizer compaction needs; ABSENT ⇒ `compact()` throws a `ConversationError`. */
	readonly summarize?: ConversationSummarizer
	/** Recent live messages kept verbatim on `compact`; defaults to `DEFAULT_CONVERSATION_KEEP` (`0`). */
	readonly keep?: number
}

/**
 * Per-compaction options for {@link ConversationInterface.compact} — overrides for ONE fold.
 *
 * @remarks
 * `keep` overrides the conversation's configured retained-tail size for THIS compaction only
 * (the older `count - keep` live messages fold; when `count <= keep` nothing folds and
 * `compact()` is a no-op returning `undefined`). Omitted ⇒ the conversation's own `keep`
 * (its option, or `DEFAULT_CONVERSATION_KEEP`) applies.
 */
export interface CompactOptions {
	/** Override the retained-tail size for this compaction; omitted ⇒ the conversation's own `keep`. */
	readonly keep?: number
}

/**
 * Options for {@link ConversationInterface.reference} — how to render ONE conversation as a
 * self-labeled, fenced PROVENANCE block to pull INTO another conversation (by writing it to
 * the active context's active workspace).
 *
 * @remarks
 * The rendered block is a cross-conversation reference a SMALL model must read as foreign
 * material, NOT as part of the live thread — so every member keeps it CONCISE and unmistakably
 * attributed:
 * - `label` — the human PROVENANCE name shown in the block's leading marker (e.g. `'planning'`);
 *   defaults to the conversation's own `id`. It is what the model attributes the content to.
 * - `summary` — whether to include the conversation's rollup `summary` (its summary-of-summaries)
 *   in the block; defaults to `true` (the rollup is included WHEN one exists — `undefined` until
 *   the first compaction simply omits the `Summary:` line). Pass `false` to exclude it.
 * - `messages` — the CHERRY-PICKED excerpts to include (each rendered `role: content`), default
 *   NONE. The intended source is the conversation's OWN `search(query)` / `rehydrate(id)` output
 *   (select the few relevant turns), NOT its whole history — dumping every message defeats the
 *   point (it re-bloats the destination context a small model then has to wade through).
 */
export interface ConversationReferenceOptions {
	/** The human provenance label in the block's marker; defaults to the conversation's `id`. */
	readonly label?: string
	/** Include the conversation's rollup `summary` (when one exists); defaults to `true`. */
	readonly summary?: boolean
	/** The cherry-picked excerpts to include (`role: content`); defaults to none. */
	readonly messages?: readonly MessageInterface[]
}

/**
 * A conversation grouping messages ABOVE the flat {@link MessageManagerInterface} — a live
 * uncompacted tail plus compacted, summarized {@link SectionInterface}s and a conversation
 * rollup `summary`, with on-demand `rehydrate` and substring `search`, driven by a
 * provider-agnostic {@link ConversationSummarizer} seam.
 *
 * @remarks
 * - **Live tail + sections.** The conversation OWNS its LIVE uncompacted tail DIRECTLY — a
 *   caller appends turns through its own message verbs (`add` mints each `id`, `message` /
 *   `messages` look up, `remove` / `clear` drop, `count` tallies), exactly as a `Workspace`
 *   owns its files (no separate per-value manager). `sections` are the compacted history
 *   (oldest → newest), each a summarized slice that RETAINS its originals. `summary` is the
 *   conversation rollup (a summary-of-summaries over all sections), regenerated on each
 *   compaction (`undefined` until the first compaction).
 * - **Message verbs (the inlined store).** `add` takes one {@link MessageInput} or a batch
 *   (§9.2), MINTS each message's `id` (a random UUID), stores it, and returns the created
 *   message(s); a stored message is immutable. `message(id)` resolves one (`undefined` when
 *   absent); `messages()` lists the live tail in insertion order; `remove` drops one by id or
 *   a batch (§9.2); `clear` empties the tail; `count` is how many live messages are stored.
 * - **`view()` — the model input.** Each section folds to ONE synthetic summary message,
 *   followed by the live messages verbatim: `[...sections-as-summary-messages, ...live]`. The
 *   rollup `summary` is NOT injected (it is a separately pull-able digest for a
 *   cross-conversation case); `view()` carries the per-section summaries, which ARE the
 *   compaction benefit.
 * - **`compact()` — fold older live → a section.** Folds the oldest `count - keep` live
 *   messages into a new {@link SectionInterface} (its `summary` from `summarize`), removes
 *   them from the live tail, REGENERATES the rollup (a second `summarize` over all section
 *   summaries), and emits `summary` then `compact` — returning the new section (or
 *   `undefined` when nothing folds). TWO summarizer calls per compaction (the section digest
 *   + the rollup). Throws a {@link import('./errors.js').ConversationError} when no
 *   `summarize` was supplied.
 * - **`summarizable` — whether a `compact()` CAN fold.** `true` when a
 *   {@link ConversationSummarizer} was supplied, `false` otherwise. The agent loop's AUTOMATIC
 *   compaction (`AgentOptions.window`) gates on it so a conversation that has no summarizer is
 *   never auto-compacted (and the loop never throws the `compact()` `SUMMARIZER` error from the
 *   auto path). A MANUAL `compact()` still throws without a summarizer — only the auto path is
 *   guarded.
 * - **`rehydrate(id)` / `search(query)` — read the retained originals.** `rehydrate` returns
 *   a section's full original messages (`[]` for an unknown id) and emits `rehydrate` — a
 *   pure READ (the caller decides whether to re-add them; v1 never auto-reinserts).
 *   `search` is a case-insensitive substring scan of `content` across ALL messages (every
 *   section's originals + the live tail).
 * - **`reference(options?)` — pull THIS conversation into ANOTHER with provenance.** A PURE
 *   string render (no model call) of a self-labeled, fenced cross-conversation block — the
 *   rollup `summary` (when included + present) plus cherry-picked excerpts — framed so a small
 *   model reads it as FOREIGN material. Written into the ACTIVE conversation's context via the
 *   active workspace (`context.workspaces.active?.write(path, block)`); the cherry-pick comes
 *   from this conversation's own `search` / `rehydrate`, never its whole history.
 * - **Observable (§13).** The owned `emitter` ({@link ConversationEventMap}) carries
 *   `compact` / `summary` / `rehydrate`; the emitter isolates a listener throw and routes it
 *   to its `error` handler (the `error` option, §13).
 */
export interface ConversationInterface {
	readonly id: string
	readonly emitter: EmitterInterface<ConversationEventMap>
	/** The conversation rollup (a summary-of-summaries), regenerated on each compaction; `undefined` until the first. */
	readonly summary: string | undefined
	/** The compacted history, oldest → newest. */
	readonly sections: readonly SectionInterface[]
	/**
	 * Whether a `compact()` CAN fold — `true` when a {@link ConversationSummarizer} was supplied.
	 * The agent loop's AUTOMATIC compaction (`AgentOptions.window`) gates on it (a non-summarizable
	 * conversation is never auto-compacted, so the auto path never throws the `SUMMARIZER` error);
	 * a MANUAL `compact()` still throws without a summarizer.
	 */
	readonly summarizable: boolean
	/** How many LIVE (uncompacted) messages are stored in the tail. */
	readonly count: number
	/**
	 * Append one message to the live tail (or a batch, §9.2) — MINTS each message's `id`
	 * (a random UUID) and returns the created message(s); a stored message is immutable.
	 *
	 * @param input - One {@link MessageInput}, or a batch
	 * @returns The created {@link MessageInterface}(s), with their minted `id`s
	 */
	add(input: MessageInput): MessageInterface
	add(inputs: readonly MessageInput[]): readonly MessageInterface[]
	/**
	 * Look up one LIVE message by id.
	 *
	 * @param id - The message id to resolve
	 * @returns The {@link MessageInterface}, or `undefined` when absent
	 */
	message(id: string): MessageInterface | undefined
	/**
	 * Every LIVE (uncompacted) message in the tail, in insertion order.
	 *
	 * @returns The live tail, in insertion order
	 */
	messages(): readonly MessageInterface[]
	/**
	 * Remove one LIVE message by id (or a batch, §9.2) from the tail.
	 *
	 * @param id - One message id, or a batch
	 * @returns `true` when any was removed
	 */
	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	/** Empty the live tail (the compacted `sections` are untouched). */
	clear(): void
	/**
	 * The model input for the next turn — each section as ONE synthetic summary message,
	 * then the live messages verbatim (the rollup `summary` is NOT injected).
	 *
	 * @returns `[...sections-as-summary-messages, ...live messages]`
	 */
	view(): readonly MessageInterface[]
	/**
	 * Fold the older live messages into a summarized {@link SectionInterface}, regenerate the
	 * rollup, and emit `summary` then `compact`.
	 *
	 * @remarks
	 * Folds the oldest `count - keep` live messages (`keep` from `options`, else the
	 * conversation's own); when `count <= keep` NOTHING folds and this is a no-op resolving
	 * `undefined`. Otherwise it summarizes the slice into the section, removes those messages
	 * from the live tail, regenerates the rollup (a second `summarize` over all sections), and
	 * resolves the new section. Requires a {@link ConversationSummarizer} — THROWS a
	 * {@link import('./errors.js').ConversationError} when none was supplied.
	 *
	 * @param options - Optional {@link CompactOptions} (`keep` overrides the retained-tail size)
	 * @returns The new {@link SectionInterface}, or `undefined` when nothing folded
	 */
	compact(options?: CompactOptions): Promise<SectionInterface | undefined>
	/**
	 * A section's full original messages — a pure READ that emits `rehydrate`.
	 *
	 * @param id - The {@link SectionInterface} `id` to pull back
	 * @returns The section's retained original messages (empty when no such section)
	 */
	rehydrate(id: string): readonly MessageInterface[]
	/**
	 * Case-insensitive substring search over `content` across ALL messages — every section's
	 * retained originals plus the live tail.
	 *
	 * @param query - The substring to match (case-insensitive)
	 * @returns The matching messages, sections' originals first then the live tail
	 */
	search(query: string): readonly MessageInterface[]
	/**
	 * Render THIS conversation as a self-labeled, fenced PROVENANCE block to pull INTO another
	 * conversation — a pure string (NO model call), framed so a small model reads it as FOREIGN
	 * material, not as part of the live thread.
	 *
	 * @remarks
	 * The block leads with an unmistakable provenance marker
	 * (`[Reference — conversation "<label>" — NOT part of this conversation]`), then optionally
	 * the rollup `Summary:` (when `options.summary !== false` AND a rollup exists), then the
	 * cherry-picked `Relevant messages:` (each `- role: content`) when `options.messages` is
	 * supplied. The intended flow is to pull another conversation B into the active conversation
	 * A's active workspace: decide relevance from `B.summary`, select the few right turns with
	 * `B.search(query)` / `B.rehydrate(id)`, frame them here, then
	 * `A.context.workspaces.active?.write(\`conversation:${B.id}.md\`, B.reference({ label, messages }))`.
	 * Keep the excerpts CHERRY-PICKED, never B's whole history — this content enters another
	 * context a small model must read.
	 *
	 * @param options - The {@link ConversationReferenceOptions} (label / summary / cherry-picked messages)
	 * @returns The rendered provenance block (a concise, fenced, self-attributed string)
	 */
	reference(options?: ConversationReferenceOptions): string
	/**
	 * Serialize this conversation to a plain, JSON-serializable {@link ConversationSnapshot} — its
	 * `id`, the rollup `summary`, the compacted `sections`, and the live tail (its `messages()`).
	 *
	 * @remarks
	 * The container serializes ITSELF (`{ id, summary, sections, messages: this.messages() }`) — the
	 * {@link ConversationStoreInterface} persistence seam's payload, the EXACT analogue of
	 * {@link WorkspaceInterface.snapshot}. The summarizer / `keep` are NOT serialized — they are live
	 * CONFIG re-supplied on hydrate (a `ConversationSummarizer` is a function, not data). The snapshot
	 * is the durable analogue of the constructor `seed`: a {@link ConversationManagerInterface}
	 * HYDRATES a conversation from it through that seam (see {@link ConversationManagerInterface.open}).
	 * Pure — the sections + messages are already plain immutable records (so the snapshot
	 * `structuredClone`s / JSON-round-trips losslessly), and snapshotting mutates nothing.
	 *
	 * @returns The {@link ConversationSnapshot} (`{ id, summary?, sections, messages }`)
	 */
	snapshot(): ConversationSnapshot
}

/**
 * A JSON-serializable snapshot of a conversation's state — its `id`, the rollup `summary`, the
 * compacted `sections`, and the live tail `messages` — the durable payload the
 * {@link ConversationStoreInterface} persists. The EXACT analogue of {@link WorkspaceSnapshot}.
 *
 * @remarks
 * Pure JSON DATA (no class instances, no functions): each {@link SectionInterface} and
 * {@link MessageInterface} is already a PLAIN record that `structuredClone`s / JSON-round-trips
 * losslessly. The snapshot carries the rollup `summary` (a summary-of-summaries; `undefined` until
 * the first compaction), the compacted `sections` (each RETAINING its folded originals), and the
 * live uncompacted tail `messages` — but NOT the `summarize` / `keep`, which are live CONFIG
 * re-supplied on hydrate (a summarizer is a function, not serializable data). The snapshot the
 * container produces from itself ({@link ConversationInterface.snapshot}); the durable analogue of
 * the constructor `seed`. A {@link ConversationManagerInterface} hydrates a conversation from it
 * through the seed seam (see {@link ConversationManagerInterface.open}). It is narrowed back from an
 * untrusted storage read by {@link import('./helpers.js').isConversationSnapshot} (the AGENTS §14
 * boundary narrow).
 */
export interface ConversationSnapshot {
	readonly id: string
	/** The rollup (a summary-of-summaries); `undefined` until the first compaction. */
	readonly summary?: string
	/** The compacted history, oldest → newest (each section RETAINS its folded originals). */
	readonly sections: readonly SectionInterface[]
	/** The live uncompacted tail, in insertion order. */
	readonly messages: readonly MessageInterface[]
}

/**
 * The durable persistence seam for a {@link ConversationSnapshot} — three async primitives
 * (`get` / `set` / `delete`) keyed by a conversation id, the EXACT analogue of
 * {@link WorkspaceStoreInterface}.
 *
 * @remarks
 * The store persists the {@link ConversationSnapshot} — the self-contained, pure-JSON conversation
 * state — so a JSON / SQLite / IndexedDB backend swaps in WITHOUT touching the manager or the
 * conversation: the in-memory default
 * {@link import('./conversations/stores/MemoryConversationStore.js').MemoryConversationStore} and its
 * driver-pluggable twin
 * {@link import('./conversations/stores/DatabaseConversationStore.js').DatabaseConversationStore} (the
 * snapshot as one opaque JSON column) share THIS one interface. Hydration is NOT a store concern
 * — a {@link ConversationManagerInterface} reads a snapshot back and rebuilds the live conversation
 * through the constructor `seed` (re-supplying the live `summarize` / `keep`; see
 * {@link ConversationManagerInterface.open} / {@link ConversationManagerInterface.save}).
 *
 * Every primitive is async (a `Promise`), so a durable backend (a database round-trip) fits the
 * same shape as the memory one. The snapshot carries its OWN id, so `set` takes no separate id
 * param (mirroring {@link WorkspaceStoreInterface.set}). UNLIKE a session store there is NO idle-TTL
 * / eviction — a persisted conversation lives until an explicit `delete`. It is concrete over
 * {@link ConversationSnapshot} — no generic parameter (AGENTS §21 minimal-interface), since the
 * snapshot is the ONE payload a conversation store persists.
 */
export interface ConversationStoreInterface {
	/**
	 * Resolve the persisted snapshot for `id`, or `undefined` if none is stored.
	 *
	 * @param id - The conversation id to resolve (a {@link ConversationSnapshot.id})
	 * @returns The persisted snapshot, or `undefined` if absent
	 */
	get(id: string): Promise<ConversationSnapshot | undefined>
	/**
	 * Insert or replace a snapshot under its own `snapshot.id` (no separate id param —
	 * mirroring {@link WorkspaceStoreInterface.set}).
	 *
	 * @param snapshot - The snapshot to store (keyed by its `id`)
	 */
	set(snapshot: ConversationSnapshot): Promise<void>
	/**
	 * Drop a snapshot by id; an absent id is a no-op (no throw).
	 *
	 * @param id - The conversation id to drop
	 */
	delete(id: string): Promise<void>
}

/**
 * One row of the table a
 * {@link import('./conversations/stores/DatabaseConversationStore.js').DatabaseConversationStore}
 * persists — a conversation `id` plus its {@link ConversationSnapshot} held as ONE OPAQUE JSON
 * column. The EXACT analogue of {@link WorkspaceSnapshotRow}.
 *
 * @remarks
 * The Database twin of {@link ConversationStoreInterface} stores the snapshot whole (the `snapshot`
 * column is a `rawShape`, an opaque JSON blob — exactly as {@link WorkspaceSnapshotRow} stores a
 * workspace snapshot), so the row type stays FLAT and the sections/messages snapshot shape never
 * forces the contract to `Infer` it. The column therefore reads back as the broad `unknown`; the
 * store narrows it to a {@link ConversationSnapshot} on `get`
 * ({@link import('./helpers.js').isConversationSnapshot}, the AGENTS §14 boundary narrow). `id`
 * mirrors {@link ConversationSnapshot.id} (the primary key), so a `set` writes
 * `{ id: snapshot.id, snapshot }`.
 */
export interface ConversationSnapshotRow {
	readonly id: string
	/** The whole {@link ConversationSnapshot} as one opaque JSON blob — read back as `unknown`, narrowed on `get`. */
	readonly snapshot: unknown
}

/**
 * The data to author a {@link ConversationInterface} through a
 * {@link ConversationManagerInterface} — the optional `id`, a `summarize` override, a `keep`
 * override, and the reserved `on` hooks.
 *
 * @remarks
 * `id` is the conversation's identity (minted when omitted). `summarize` OVERRIDES the
 * manager's default {@link ConversationSummarizer} for this conversation (omitted ⇒ the
 * manager's default flows in). `keep` overrides the manager's default retained-tail size.
 * `on` is the §8 reserved key (initial {@link ConversationEventMap} listeners). `snapshot` is
 * the construction-time hydration seam — a {@link ConversationSnapshot} whose `id` / `summary` /
 * `sections` / live tail are RESTORED into the new conversation (the live `summarize` / `keep` /
 * `on` re-supplied alongside it), the conversation analogue of {@link WorkspaceInput.seed} that a
 * {@link ConversationManagerInterface.open} reads a stored snapshot back through; hydration is
 * silent (no events). When both `snapshot.id` and `id` are given, `snapshot.id` wins (the snapshot
 * IS the conversation's identity).
 */
export interface ConversationInput {
	readonly id?: string
	/** Overrides the manager's default summarizer for this conversation. */
	readonly summarize?: ConversationSummarizer
	/** Overrides the manager's default retained-tail size for this conversation. */
	readonly keep?: number
	readonly on?: EmitterHooks<ConversationEventMap>
	/** A {@link ConversationSnapshot} to hydrate FROM (its `id` / `summary` / `sections` / live tail restored); the analogue of `WorkspaceInput.seed`. */
	readonly snapshot?: ConversationSnapshot
}

/**
 * Options for `createConversationManager` — the default {@link ConversationSummarizer} and
 * retained-tail size the conversations it creates inherit.
 *
 * @remarks
 * `summarize` is the default summarizer flowed into every conversation the manager `add`s
 * (a per-`add` {@link ConversationInput.summarize} overrides it); a conversation created
 * with neither cannot `compact` (it throws a `ConversationError`). `keep` is the default
 * retained-tail size (a per-`add` {@link ConversationInput.keep} overrides it), defaulting
 * to {@link import('./constants.js').DEFAULT_CONVERSATION_KEEP}.
 */
export interface ConversationManagerOptions {
	/** The default summarizer for conversations this manager creates (a per-`add` override wins). */
	readonly summarize?: ConversationSummarizer
	/** The default retained-tail size (a per-`add` override wins); defaults to `DEFAULT_CONVERSATION_KEEP`. */
	readonly keep?: number
	/**
	 * The optional durable {@link ConversationStoreInterface} backing
	 * {@link ConversationManagerInterface.open} / {@link ConversationManagerInterface.save} — a memory
	 * / JSON / SQLite / IndexedDB store a conversation is HYDRATED from (`open` a registry-miss) and
	 * PERSISTED to (`save`). Omitted ⇒ the manager is registry-only: `open` resolves only what is
	 * already registered, and `save` is a no-op (`false`). The EXACT analogue of
	 * {@link WorkspaceManagerOptions.store}.
	 */
	readonly store?: ConversationStoreInterface
}

/**
 * A registry of {@link ConversationInterface}s keyed by their `id`, in insertion order, WITH an
 * active pointer — the §9 store over the conversation layer PLUS the `active` / `switch` seam the
 * {@link AgentContextInterface} renders. Event-free (a registry, like
 * {@link WorkspaceManagerInterface}); the observability lives on each
 * {@link ConversationInterface}.
 *
 * @remarks
 * - **Registry.** `count` is how many are stored. `add(input?)` mints a
 *   {@link ConversationInterface} (its `id` from `input` or a random UUID), flowing the
 *   manager's default `summarize` / `keep` in unless the `input` overrides them; `add` of an
 *   already-present `id` OVERWRITES it (last write wins). `conversation(id)` looks one up
 *   (`undefined` when absent); `conversations()` lists them in insertion order.
 * - **Active pointer.** `active` is the active conversation (the agent's message source the
 *   context renders), `undefined` until the FIRST `add` (which auto-activates it — a registry
 *   with conversations always has one active). A subsequent `add` leaves `active` unchanged.
 *   `switch(id)` re-points `active` to the conversation with `id` and returns it; an unknown
 *   `id` returns `undefined` and leaves `active` unchanged (the lenient lookup style — never
 *   throws, no new error code).
 * - **Removal.** `remove` drops one by id, or a batch (§9.2, array overload FIRST) — `true`
 *   when any was removed; removing the ACTIVE conversation sets `active` to `undefined`. `clear`
 *   empties the registry and sets `active` to `undefined`.
 * - **Durable open / save (the optional `store` seam).** When a {@link ConversationStoreInterface}
 *   is supplied (the `store` option), `open(id)` HYDRATES a conversation from the store on a registry
 *   miss (rebuilding it through the constructor `seed` from the snapshot, flowing the manager's
 *   default `summarize` / `keep` in) and `save(id)` PERSISTS a registered conversation's
 *   {@link ConversationInterface.snapshot}. Both are LENIENT without a store — `open` resolves only
 *   registered ids, `save` is a no-op (`false`) — consistent with the lenient `switch`. The EXACT
 *   analogue of {@link WorkspaceManagerInterface.open} / {@link WorkspaceManagerInterface.save}.
 * - **Event-free.** A purely registry store — no Emitter, no events (each conversation owns
 *   its own).
 */
export interface ConversationManagerInterface {
	readonly count: number
	/** The active conversation — the agent's message source the context renders; `undefined` until the first `add`. */
	readonly active: ConversationInterface | undefined
	conversation(id: string): ConversationInterface | undefined
	conversations(): readonly ConversationInterface[]
	add(input?: ConversationInput): ConversationInterface
	switch(id: string): ConversationInterface | undefined
	/**
	 * Resolve a conversation by id, ACTIVATING it — from the registry if present, else HYDRATED from
	 * the optional {@link ConversationStoreInterface} (`store`).
	 *
	 * @remarks
	 * - If `id` is ALREADY registered, it is ACTIVATED (`switch`ed to) and returned — no store hit.
	 * - Else if a `store` is set, `store.get(id)` is awaited; on a HIT the snapshot is rehydrated
	 *   into a fresh {@link ConversationInterface} through the constructor `seed`
	 *   (`add({ snapshot, ... })`, flowing the manager's default `summarize` / `keep` in), which
	 *   registers AND activates it, and it is returned.
	 * - Else (no store, or a store MISS) ⇒ `undefined` (lenient — no throw).
	 *
	 * @param id - The conversation id to open
	 * @returns The activated {@link ConversationInterface}, or `undefined` when neither registered nor stored
	 */
	open(id: string): Promise<ConversationInterface | undefined>
	/**
	 * Persist a REGISTERED conversation's {@link ConversationInterface.snapshot} to the optional
	 * {@link ConversationStoreInterface} (`store`).
	 *
	 * @remarks
	 * Lenient: when a `store` is set AND `id` is registered, `store.set(conversation.snapshot())` is
	 * awaited and `true` is returned; otherwise (no store, OR an unknown id) it is a NO-OP returning
	 * `false` — never a throw, consistent with the lenient `switch`.
	 *
	 * @param id - The id of the registered conversation to persist
	 * @returns `true` when the snapshot was persisted; `false` when no store / unknown id
	 */
	save(id: string): Promise<boolean>
	remove(ids: readonly string[]): boolean
	remove(id: string): boolean
	clear(): void
}

// Workspaces — the immutable file primitive + the in-memory Workspace edit surface (relocated
// from the dissolved files/ module). A `File` is a PLAIN frozen record (no `id` — the `path` IS
// its identity); its content is a TAGLESS text-vs-binary union narrowed by the isText / isBinary /
// isImage guards (no `modality` discriminant). The Workspace is a mutable, `path`-keyed working
// set of immutable Files with the full edit surface, observable through its emitter (§13).
// `BinaryMIME` (the binary arm's MIME) is the canonical file-content MIME — the active workspace
// is the SOLE document/image context, rendered into the turn by `AgentContext.build()`.

/**
 * The binary MIME types a {@link FileContent} binary arm carries — the labels for a
 * base64-encoded payload.
 *
 * @remarks
 * Initialized to the four image MIMEs a vision-capable provider accepts; the union is OPEN
 * by design — a future binary MIME (e.g. `'application/pdf'`) slots in purely additively (a
 * new member), with nothing above it changed. {@link import('./helpers.js').isImage}
 * narrows a binary arm to an image by the `image/` prefix, so an image is just a binary with
 * an image MIME.
 */
export type BinaryMIME = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'

/**
 * A {@link FileInterface}'s content — a TAGLESS union of a TEXT arm and a BINARY arm, narrowed
 * by the {@link import('./helpers.js').isText} / {@link import('./helpers.js').isBinary}
 * guards (AGENTS §14: an untyped arm is narrowed via a guard, never an `as`).
 *
 * @remarks
 * - The TEXT arm carries the literal `text` plus the fenced-code `language` it renders as.
 * - The BINARY arm carries the base64-encoded `data` plus the {@link BinaryMIME} that labels it.
 *
 * There is no `modality` discriminant — the arms are told apart structurally
 * (`'text' in content` vs `'data' in content`) by the guards. A binary arm whose `mime`
 * starts with `image/` IS an image ({@link import('./helpers.js').isImage}). A future
 * non-image binary (a PDF) is the same binary arm with a new {@link BinaryMIME} — additive,
 * with nothing above it changed.
 */
export type FileContent =
	| { readonly text: string; readonly language: string }
	| { readonly data: string; readonly mime: BinaryMIME }

/**
 * The lifecycle state of a {@link FileInterface} relative to its (future) durable backing
 * — a multi-value lifecycle union (AGENTS §10), not a boolean.
 *
 * @remarks
 * `'created'` is a brand-new file not yet persisted; `'modified'` has unsaved edits over a
 * persisted original; `'loaded'` was read from the backing and is unchanged; `'deleted'`
 * is tombstoned. A `File` authored without a `state` defaults to `'created'`.
 */
export type FileState = 'created' | 'modified' | 'loaded' | 'deleted'

/**
 * The minimal data to author a {@link FileInterface} — `size` / `lines` are DERIVED from the
 * `content`, so a caller supplies only `path` / `content` (and an optional `state`, defaulting
 * to `'created'`).
 */
export interface FileInput {
	readonly path: string
	readonly content: FileContent
	/** The lifecycle state; defaults to `'created'` when omitted. */
	readonly state?: FileState
}

/**
 * An immutable file value object — a `path`-addressed {@link FileContent} carrying a
 * lifecycle {@link FileState}, with `size` / `lines` DERIVED once when built.
 *
 * @remarks
 * A PLAIN frozen record (not a class instance) produced by
 * {@link import('./factories.js').createFile} — the `path` IS its identity (there is no
 * `id`). `size` and `lines` are computed from `content` when built (so they can never drift
 * from it) and re-read for free thereafter. Never mutated — a Workspace REPLACES a file
 * rather than editing it in place. A DATA-ONLY value object — no methods, plus it
 * `structuredClone`s losslessly (every field is a plain primitive / record).
 */
export interface FileInterface {
	readonly path: string
	readonly content: FileContent
	readonly state: FileState
	/** Derived byte size: UTF-8 byte length (text) / decoded payload bytes (binary). */
	readonly size: number
	/** Derived line count: the text line count; `0` for a binary arm. */
	readonly lines: number
}

/**
 * A 1-based caret position inside a text file — `line` and `column` both count from `1`
 * (column `1` is the first character of the line), matching an editor's gutter.
 *
 * @remarks
 * The {@link import('./workspaces/Workspace.js').Workspace} edit surface speaks 1-based
 * positions end to end ({@link Range}, {@link ReadResult}, {@link SearchMatch}). A
 * structurally invalid component (`line < 1` or `column < 1`) is rejected by a range op
 * (`RANGE`); an in-bounds-but-past-the-end one is CLAMPED to the nearest valid caret rather
 * than rejected.
 */
export interface Position {
	readonly line: number
	readonly column: number
}

/**
 * A half-open span of text between two {@link Position}s — `start` INCLUSIVE, `end`
 * EXCLUSIVE (the character at `end` is not part of the span).
 *
 * @remarks
 * A range whose `start` is at or before its `end` is valid; an inverted range
 * (`start` after `end`) or one with a sub-1 component is structurally invalid and a range
 * op throws `RANGE`. Each in-bounds component is clamped to the text before it is applied,
 * so a range reaching past the end of the content reads / splices up to the end.
 */
export interface Range {
	readonly start: Position
	readonly end: Position
}

/**
 * The outcome of a ranged {@link WorkspaceInterface.read} — the sliced `content` plus the
 * `range` actually applied after clamping (so a caller learns the real span it got).
 *
 * @remarks
 * `range` is the input {@link Range} CLAMPED to the file's bounds — when the requested
 * span reached past the end of the text, `range` reflects the trimmed span that was read,
 * never the original out-of-bounds request.
 */
export interface ReadResult {
	readonly content: string
	/** The actual (clamped) range applied to produce `content`. */
	readonly range: Range
}

/**
 * Options for {@link WorkspaceInterface.search} — how the `query` matches.
 *
 * @param options - The search options
 *
 * @remarks
 * - `regex` — treat `query` as a regular expression source rather than a literal substring; defaults to `false`.
 * - `exact` — match case-sensitively; defaults to `true` (set `false` for a case-insensitive scan).
 * - `limit` — stop after this many matches across all files; defaults to unlimited.
 */
export interface SearchOptions {
	readonly regex?: boolean
	readonly exact?: boolean
	readonly limit?: number
}

/**
 * One hit from {@link WorkspaceInterface.search} — where the match was found and the line
 * that carried it.
 *
 * @remarks
 * `line` / `column` are 1-based (column `1` is the first character of the line); `length`
 * is the matched substring's length; `content` is the FULL line the match sits on (not
 * just the matched fragment), so a caller can render the hit in context.
 */
export interface SearchMatch {
	readonly path: string
	readonly line: number
	readonly column: number
	readonly length: number
	/** The full text of the line the match was found on. */
	readonly content: string
}

/**
 * Options for {@link WorkspaceInterface.replace} — how the `query` matches (the same axes
 * as {@link SearchOptions}).
 *
 * @param options - The replace options
 *
 * @remarks
 * - `regex` — treat `query` as a regular expression source rather than a literal substring; defaults to `false`.
 * - `exact` — match case-sensitively; defaults to `true`.
 * - `limit` — stop after this many replacements across all files; defaults to unlimited.
 */
export interface ReplaceOptions {
	readonly regex?: boolean
	readonly exact?: boolean
	readonly limit?: number
}

/**
 * The tally returned by {@link WorkspaceInterface.replace} — the `query` that ran, how
 * many occurrences were `replaced`, and the number of `files` changed.
 */
export interface ReplaceResult {
	readonly query: string
	readonly replaced: number
	readonly files: number
}

/**
 * The observable events a {@link import('./workspaces/Workspace.js').Workspace} emits
 * (AGENTS §13) — each fired AFTER the corresponding mutation completes.
 *
 * @remarks
 * - `write` — a file was written / edited, carrying the resulting {@link FileInterface}.
 * - `remove` — a single file was dropped, carrying its `path`.
 * - `move` — a file was re-keyed, carrying `{ from, to }`.
 * - `clear` — the workspace was emptied (the canonical "emptied" signal, fired by both `remove()` and `clear()`).
 */
export type WorkspaceEventMap = {
	readonly write: readonly [file: FileInterface]
	readonly remove: readonly [path: string]
	readonly move: readonly [move: { readonly from: string; readonly to: string }]
	readonly clear: readonly []
}

/**
 * Options for {@link import('./factories.js').createWorkspace} / the
 * {@link import('./workspaces/Workspace.js').Workspace} constructor.
 *
 * @param options - The workspace options
 *
 * @remarks
 * - `id` — the workspace's identity (its key in a {@link WorkspaceManagerInterface}); MINTED via `crypto.randomUUID()` when omitted.
 * - `on` — initial {@link WorkspaceEventMap} listeners (AGENTS §8), wired at construction.
 * - `error` — the emitter's listener-error handler (AGENTS §13); a throw from any listener is routed here instead of rethrown.
 */
export interface WorkspaceOptions {
	readonly id?: string
	readonly on?: EmitterHooks<WorkspaceEventMap>
	readonly error?: EmitterErrorHandler
}

/**
 * A JSON-serializable snapshot of a workspace's state — its `id` plus a FLAT list of its
 * {@link FileInterface}s — the durable payload the {@link WorkspaceStoreInterface} persists.
 *
 * @remarks
 * Pure JSON DATA (no class instances, no functions): each {@link FileInterface} is already a
 * PLAIN frozen record that `structuredClone`s / JSON-round-trips losslessly, and a `File` carries
 * its OWN `path`, so a flat `files` list is enough to reconstruct the path-keyed map (no nested
 * `path → File` object needed for serialization). The snapshot the container produces from itself
 * ({@link WorkspaceInterface.snapshot}); the durable analogue of the constructor `seed`. A
 * {@link WorkspaceManagerInterface} hydrates a workspace from `snapshot.files` through the seed
 * seam (see {@link WorkspaceManagerInterface.open}). It is narrowed back from an untrusted storage
 * read by {@link import('./helpers.js').isWorkspaceSnapshot} (the AGENTS §14 boundary narrow).
 */
export interface WorkspaceSnapshot {
	readonly id: string
	readonly files: readonly FileInterface[]
}

/**
 * The durable persistence seam for a {@link WorkspaceSnapshot} — three async primitives
 * (`get` / `set` / `delete`) keyed by a workspace id, mirroring the analogous
 * `WorkflowStoreInterface` in `@orkestrel/workflow` (and the driver-swap pattern a server
 * surface's session store would follow).
 *
 * @remarks
 * The store persists the {@link WorkspaceSnapshot} — the self-contained, pure-JSON workspace
 * state — so a JSON / SQLite / IndexedDB backend swaps in WITHOUT touching the manager or the
 * workspace: the in-memory default
 * {@link import('./workspaces/stores/MemoryWorkspaceStore.js').MemoryWorkspaceStore} and its
 * driver-pluggable twin
 * {@link import('./workspaces/stores/DatabaseWorkspaceStore.js').DatabaseWorkspaceStore} (the
 * snapshot as one opaque JSON column) share THIS one interface. Hydration is NOT a store concern
 * — a {@link WorkspaceManagerInterface} reads a snapshot back and rebuilds the live workspace
 * through the constructor `seed` (see {@link WorkspaceManagerInterface.open} /
 * {@link WorkspaceManagerInterface.save}).
 *
 * Every primitive is async (a `Promise`), so a durable backend (a database round-trip) fits the
 * same shape as the memory one. The snapshot carries its OWN id, so `set` takes no separate id
 * param (mirroring the analogous `WorkflowStoreInterface.set` in `@orkestrel/workflow`). UNLIKE a
 * session store there is NO idle-TTL / eviction — a persisted workspace lives until an explicit
 * `delete`. It is concrete over {@link WorkspaceSnapshot} — no generic parameter (AGENTS §21
 * minimal-interface), since the snapshot is the ONE payload a workspace store persists.
 */
export interface WorkspaceStoreInterface {
	/**
	 * Resolve the persisted snapshot for `id`, or `undefined` if none is stored.
	 *
	 * @param id - The workspace id to resolve (a {@link WorkspaceSnapshot.id})
	 * @returns The persisted snapshot, or `undefined` if absent
	 */
	get(id: string): Promise<WorkspaceSnapshot | undefined>
	/**
	 * Insert or replace a snapshot under its own `snapshot.id` (no separate id param —
	 * mirroring the analogous `WorkflowStoreInterface.set` in `@orkestrel/workflow`).
	 *
	 * @param snapshot - The snapshot to store (keyed by its `id`)
	 */
	set(snapshot: WorkspaceSnapshot): Promise<void>
	/**
	 * Drop a snapshot by id; an absent id is a no-op (no throw).
	 *
	 * @param id - The workspace id to drop
	 */
	delete(id: string): Promise<void>
}

/**
 * One row of the table a
 * {@link import('./workspaces/stores/DatabaseWorkspaceStore.js').DatabaseWorkspaceStore} persists
 * — a workspace `id` plus its {@link WorkspaceSnapshot} held as ONE OPAQUE JSON column.
 *
 * @remarks
 * The Database twin of {@link WorkspaceStoreInterface} stores the snapshot whole (the `snapshot`
 * column is a `rawShape`, an opaque JSON blob — exactly as the analogous
 * `WorkflowSnapshotRow` in `@orkestrel/workflow` stores a workflow snapshot), so the
 * row type stays FLAT and the `File`-list snapshot shape never forces the contract to `Infer` it.
 * The column therefore reads back as the broad `unknown`; the store narrows it to a
 * {@link WorkspaceSnapshot} on `get` ({@link import('./helpers.js').isWorkspaceSnapshot}, the
 * AGENTS §14 boundary narrow). `id` mirrors {@link WorkspaceSnapshot.id} (the primary key), so a
 * `set` writes `{ id: snapshot.id, snapshot }`.
 */
export interface WorkspaceSnapshotRow {
	readonly id: string
	/** The whole {@link WorkspaceSnapshot} as one opaque JSON blob — read back as `unknown`, narrowed on `get`. */
	readonly snapshot: unknown
}

/**
 * The machine-readable code a {@link import('./errors.js').WorkspaceError} carries
 * (AGENTS §12) — a `catch` branches on `error.code` instead of parsing the message.
 *
 * @remarks
 * - `MODALITY` — a text-only op (ranged read/write, `prepend`, `append`) was aimed at a binary file.
 * - `PATTERN` — a `search` / `replace` `query` was an invalid regular expression (with `regex: true`).
 * - `RANGE` — a ranged `write` got a structurally invalid {@link Range} (inverted, or a sub-1 line/column).
 * - `TOOL` — a handler-level validation fault from {@link import('./factories.js').createWorkspaceTool}:
 *   the agent-supplied args were a malformed / unknown {@link WorkspaceOperation} (none of the 13 arms
 *   matched). Distinct from the surface faults above (which the live workspace raises) — this is the
 *   tool boundary rejecting an un-parseable operation before any workspace call.
 */
export type WorkspaceErrorCode = 'MODALITY' | 'PATTERN' | 'RANGE' | 'TOOL'

/**
 * A mutable, `path`-keyed working set of immutable {@link FileInterface}s — the in-memory
 * editing surface over the file primitive.
 *
 * @remarks
 * Files live in an insertion-ordered map keyed by `path`. Every edit REPLACES the
 * immutable {@link FileInterface} at a path with a new one (transitioning its `state` to
 * `'created'` for a fresh path or `'modified'` for an existing one) rather than mutating in
 * place. The disk/sync lifecycle (`load` / `revert` / `accept` / `purge` / `dirty`) is
 * deliberately NOT part of this surface — it is deferred to a future FileStore. Text-only
 * operations on a binary file are governed by the modality rules (a ranged read/write,
 * `prepend`, and `append` throw `MODALITY`; a plain `read` returns `undefined`; `search` /
 * `replace` skip the file). Observe mutations through the owned {@link emitter} (AGENTS §13).
 */
export interface WorkspaceInterface {
	/** The workspace's identity — its key in a {@link WorkspaceManagerInterface}; minted when not supplied. */
	readonly id: string
	/** The push observation surface (AGENTS §13) — `write` / `remove` / `move` / `clear`. */
	readonly emitter: EmitterInterface<WorkspaceEventMap>
	/** The number of files currently held. */
	readonly count: number
	/** Look up one file by path, or `undefined` when absent. */
	file(path: string): FileInterface | undefined
	/** List every file in insertion order. */
	files(): readonly FileInterface[]
	// Read a whole text file's text, a clamped range of it, or a batch of text files.
	read(path: string): string | undefined
	read(path: string, range: Range): ReadResult | undefined
	read(paths: readonly string[]): Readonly<Record<string, string>>
	// Whether a path (or every path in a batch) is present.
	has(path: string): boolean
	has(paths: readonly string[]): boolean
	/** Scan every text file's lines for `query`, returning each hit in insertion order. */
	search(query: string, options?: SearchOptions): readonly SearchMatch[]
	/** Replace `query` with `replacement` across every text file, returning the tally. */
	replace(query: string, replacement: string, options?: ReplaceOptions): ReplaceResult
	// Write a whole file, splice a range of an existing text file, or write a batch.
	write(path: string, content: string): void
	write(path: string, content: string, range: Range): void
	write(files: Readonly<Record<string, string>>): void
	// Prepend text to a file (creating it when absent), or to a batch.
	prepend(path: string, content: string): void
	prepend(files: Readonly<Record<string, string>>): void
	// Append text to a file (creating it when absent), or to a batch.
	append(path: string, content: string): void
	append(files: Readonly<Record<string, string>>): void
	// Re-key one file (overwriting an occupied target), or a batch; `true` if any moved.
	move(from: string, to: string): boolean
	move(mapping: Readonly<Record<string, string>>): boolean
	// Empty the workspace, or drop one / a listed batch of files.
	remove(): void
	remove(path: string): boolean
	remove(paths: readonly string[]): boolean
	/** Empty the workspace (emits `clear`). */
	clear(): void
	/**
	 * Serialize this workspace to a plain, JSON-serializable {@link WorkspaceSnapshot} — its
	 * `id` plus a flat list of its {@link FileInterface}s (each already carries its `path`).
	 *
	 * @remarks
	 * The container serializes ITSELF (`{ id: this.id, files: this.files() }`) — the
	 * {@link WorkspaceStoreInterface} persistence seam's payload, paralleling the
	 * {@link ConversationInterface}'s own snapshot a later track adds. The snapshot is the
	 * durable analogue of the constructor `seed`: a {@link WorkspaceManagerInterface} HYDRATES a
	 * workspace from `snapshot.files` through that seam (see {@link WorkspaceManagerInterface.open}).
	 * Pure — the `File`s are already frozen plain records (so the snapshot `structuredClone`s /
	 * JSON-round-trips losslessly), and snapshotting mutates nothing.
	 *
	 * @returns The {@link WorkspaceSnapshot} (`{ id, files }`)
	 */
	snapshot(): WorkspaceSnapshot
}

/**
 * The data to author a {@link WorkspaceInterface} through a
 * {@link WorkspaceManagerInterface} — the optional `id`, the reserved `on` hooks + `error`
 * handler (§13), and an optional `seed` of initial files.
 *
 * @remarks
 * `id` is the workspace's identity (minted when omitted). `on` / `error` are the §8/§13
 * keys (initial {@link WorkspaceEventMap} listeners + the listener-error handler), flowing
 * the manager's defaults in unless overridden. `seed` is the construction-time hydration
 * seam (path → {@link FileInterface}) — the only way to seat a non-text (binary) file, and
 * what a future FileStore reads a snapshot into; seeding is silent (no `write` events).
 */
export interface WorkspaceInput {
	readonly id?: string
	readonly on?: EmitterHooks<WorkspaceEventMap>
	readonly error?: EmitterErrorHandler
	/** Pre-seeded initial files (path → File), placed silently at construction. */
	readonly seed?: Iterable<readonly [string, FileInterface]>
}

/**
 * Options for `createWorkspaceManager` — the per-workspace `on` / `error` defaults the
 * workspaces it creates inherit.
 *
 * @remarks
 * `on` / `error` are the default {@link WorkspaceEventMap} listeners + the emitter's
 * listener-error handler (§13) flowed into every workspace the manager `add`s (a per-`add`
 * {@link WorkspaceInput.on} / `.error` overrides them). Kept minimal (AGENTS §21) — a
 * registry needs no more.
 */
export interface WorkspaceManagerOptions {
	/** The default event listeners for workspaces this manager creates (a per-`add` override wins). */
	readonly on?: EmitterHooks<WorkspaceEventMap>
	/** The default listener-error handler (a per-`add` override wins). */
	readonly error?: EmitterErrorHandler
	/**
	 * The optional durable {@link WorkspaceStoreInterface} backing {@link WorkspaceManagerInterface.open}
	 * / {@link WorkspaceManagerInterface.save} — a memory / JSON / SQLite / IndexedDB store a workspace
	 * is HYDRATED from (`open` a registry-miss) and PERSISTED to (`save`). Omitted ⇒ the manager is
	 * registry-only: `open` resolves only what is already registered, and `save` is a no-op (`false`).
	 */
	readonly store?: WorkspaceStoreInterface
}

/**
 * A registry of {@link WorkspaceInterface}s keyed by their `id`, in insertion order, WITH an
 * active pointer — the §9 store over the workspace layer PLUS the `active` / `switch` seam the
 * context renders. Event-free (each {@link WorkspaceInterface} owns its own `emitter`).
 *
 * @remarks
 * - **Registry.** `count` is how many are stored. `add(input?)` mints a
 *   {@link WorkspaceInterface} (its `id` from `input` or a random UUID), flowing the manager's
 *   default `on` / `error` in unless the `input` overrides them; `add` of an already-present
 *   `id` OVERWRITES it (last write wins). `workspace(id)` looks one up (`undefined` when
 *   absent); `workspaces()` lists them in insertion order.
 * - **Active pointer.** `active` is the active workspace (what the context renders), `undefined`
 *   until the FIRST `add` (which auto-activates it). A later `add` leaves `active` unchanged.
 *   `switch(id)` re-points `active` to the workspace with `id` and returns it; an unknown `id`
 *   returns `undefined` and leaves `active` unchanged (the lenient lookup style — never throws).
 * - **Removal.** `remove` drops one by id, or a batch (§9.2, array overload FIRST) — `true`
 *   when any was removed; removing the ACTIVE workspace sets `active` to `undefined`. `clear`
 *   empties the registry and sets `active` to `undefined`.
 * - **Durable open / save (the optional `store` seam).** When a {@link WorkspaceStoreInterface}
 *   is supplied (the `store` option), `open(id)` HYDRATES a workspace from the store on a registry
 *   miss (rebuilding it through the constructor `seed` from `snapshot.files`) and `save(id)`
 *   PERSISTS a registered workspace's {@link WorkspaceInterface.snapshot}. Both are LENIENT without
 *   a store — `open` resolves only registered ids, `save` is a no-op (`false`) — consistent with
 *   the lenient `switch`.
 * - **Event-free.** A purely registry store — no Emitter, no events (each workspace owns its own).
 */
export interface WorkspaceManagerInterface {
	readonly count: number
	/** The active workspace — what the context renders; `undefined` until the first `add`. */
	readonly active: WorkspaceInterface | undefined
	workspace(id: string): WorkspaceInterface | undefined
	workspaces(): readonly WorkspaceInterface[]
	add(input?: WorkspaceInput): WorkspaceInterface
	switch(id: string): WorkspaceInterface | undefined
	/**
	 * Resolve a workspace by id, ACTIVATING it — from the registry if present, else HYDRATED from
	 * the optional {@link WorkspaceStoreInterface} (`store`).
	 *
	 * @remarks
	 * - If `id` is ALREADY registered, it is ACTIVATED (`switch`ed to) and returned — no store hit.
	 * - Else if a `store` is set, `store.get(id)` is awaited; on a HIT the snapshot is rehydrated
	 *   into a fresh {@link WorkspaceInterface} through the constructor `seed`
	 *   (`add({ id, seed: snapshot.files.map((file) => [file.path, file]) })`), which registers AND
	 *   auto-activates it (or activates it explicitly), and it is returned.
	 * - Else (no store, or a store MISS) ⇒ `undefined` (lenient — no throw).
	 *
	 * @param id - The workspace id to open
	 * @returns The activated {@link WorkspaceInterface}, or `undefined` when neither registered nor stored
	 */
	open(id: string): Promise<WorkspaceInterface | undefined>
	/**
	 * Persist a REGISTERED workspace's {@link WorkspaceInterface.snapshot} to the optional
	 * {@link WorkspaceStoreInterface} (`store`).
	 *
	 * @remarks
	 * Lenient: when a `store` is set AND `id` is registered, `store.set(workspace.snapshot())` is
	 * awaited and `true` is returned; otherwise (no store, OR an unknown id) it is a NO-OP returning
	 * `false` — never a throw, consistent with the lenient `switch`.
	 *
	 * @param id - The id of the registered workspace to persist
	 * @returns `true` when the snapshot was persisted; `false` when no store / unknown id
	 */
	save(id: string): Promise<boolean>
	remove(ids: readonly string[]): boolean
	remove(id: string): boolean
	clear(): void
}

/**
 * Options for {@link import('./factories.js').createWorkspaceTool} — optional overrides of the
 * advertised tool `name` / `description`.
 *
 * @param options - The workspace-tool options
 *
 * @remarks
 * - `name` — the advertised tool name a model calls; defaults to {@link import('./constants.js').WORKSPACE_TOOL_NAME} (`'workspace'`).
 * - `description` — the model-facing description; defaults to {@link import('./constants.js').WORKSPACE_TOOL_DESCRIPTION} (the operation guide). Deliberately minimal (AGENTS §21) — the tool needs no depth / ancestry (it has no recursion).
 */
export interface WorkspaceToolOptions {
	readonly name?: string
	readonly description?: string
}

/**
 * One operation an agent invokes through {@link import('./factories.js').createWorkspaceTool} — a
 * FLAT, descriptive tagged union over the 13 workspace edit / read / navigation actions,
 * discriminated by the `operation` literal (AGENTS §4.8: a discriminant is named for its axis — the
 * action being performed — NEVER `kind`).
 *
 * @remarks
 * This is the SOURCE OF TRUTH the tool contract is typed to ({@link import('./shapers.js').workspaceToolShape}
 * compiles to a structurally-identical guard / parser / JSON Schema). Every field is FLAT (no nested
 * objects) — the small-model ergonomic lever: a range edit is the four flat integers of the
 * `'splice'` arm (`fromLine` / `fromColumn` / `toLine` / `toColumn`), reassembled into a 1-based
 * {@link Range} by {@link import('./helpers.js').rangeOf}, never a nested `{ start, end }`. Each EDIT
 * / READ arm maps onto exactly one {@link WorkspaceInterface} call against the manager's ACTIVE
 * workspace; the two REGISTRY arms (`switch` / `workspaces`) drive the
 * {@link WorkspaceManagerInterface} pointer instead — `workspaces` LISTS the workspaces the model
 * can move between, and `switch` re-points which one the edit / read arms target.
 */
export type WorkspaceOperation =
	/** Read a whole text file's text by `path` from the ACTIVE workspace (a binary / absent path — or no active workspace — yields no content). */
	| { readonly operation: 'read'; readonly path: string }
	/** List every file in the ACTIVE workspace (path / state / size / lines / kind summaries); `[]` when no workspace is active. */
	| { readonly operation: 'list' }
	/** Whether a file exists at `path` in the ACTIVE workspace (`false` when no workspace is active). */
	| { readonly operation: 'has'; readonly path: string }
	/**
	 * Scan every text file for `query`, returning each hit (path + 1-based line / column + the line).
	 *
	 * @remarks
	 * `regex` treats `query` as a regular-expression source (default `false` — a literal substring);
	 * `exact` matches case-sensitively (default `true`); `limit` caps the total hits returned.
	 */
	| {
			readonly operation: 'search'
			readonly query: string
			readonly regex?: boolean
			readonly exact?: boolean
			readonly limit?: number
	  }
	/**
	 * Replace `query` with `replacement` across every text file, returning the tally.
	 *
	 * @remarks
	 * Same matching axes as `search`: `regex` (default `false`), `exact` (default `true`), `limit`
	 * (cap the total replacements).
	 */
	| {
			readonly operation: 'replace'
			readonly query: string
			readonly replacement: string
			readonly regex?: boolean
			readonly exact?: boolean
			readonly limit?: number
	  }
	/** Write (create or overwrite) the whole file at `path` with `content`. */
	| { readonly operation: 'write'; readonly path: string; readonly content: string }
	/**
	 * Splice `content` into an existing text file, replacing the 1-based range
	 * `(fromLine, fromColumn)` (INCLUSIVE) → `(toLine, toColumn)` (EXCLUSIVE).
	 *
	 * @remarks
	 * The FLAT range edit — the four positive-integer caret components reassemble into a {@link Range}
	 * ({@link import('./helpers.js').rangeOf}). An empty span (`from === to`) inserts; a span past the
	 * end is clamped. An inverted / sub-1 range throws `RANGE`; a binary target throws `MODALITY`.
	 */
	| {
			readonly operation: 'splice'
			readonly path: string
			readonly content: string
			readonly fromLine: number
			readonly fromColumn: number
			readonly toLine: number
			readonly toColumn: number
	  }
	/** Prepend `content` to the start of the file at `path` (creating it when absent). */
	| { readonly operation: 'prepend'; readonly path: string; readonly content: string }
	/** Append `content` to the end of the file at `path` (creating it when absent). */
	| { readonly operation: 'append'; readonly path: string; readonly content: string }
	/** Re-key the file `from` → `to` (overwriting an occupied target). */
	| { readonly operation: 'move'; readonly from: string; readonly to: string }
	/** Remove the file at `path` from the workspace. */
	| { readonly operation: 'remove'; readonly path: string }
	/** List the workspaces the model can move between — each `{ id, files, active }` — so it can choose an `id` to `switch` to. */
	| { readonly operation: 'workspaces' }
	/** Re-point the manager's ACTIVE workspace to the one with `id` (an unknown `id` is a lenient no-op). The edit / read arms target the active workspace from then on. */
	| { readonly operation: 'switch'; readonly id: string }
