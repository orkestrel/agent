import type { BudgetInterface, TokenUsage } from '@orkestrel/budget'
import type { EmitterErrorHandler, EmitterHooks, EmitterInterface } from '@orkestrel/emitter'
import type { QueueStoreInterface } from '@orkestrel/queue'
import type {
	ToolCall,
	ToolDefinition,
	ToolInterface,
	ToolManagerInterface,
	ToolResult,
} from '@orkestrel/tool'
import type { SchedulerInterface } from '@orkestrel/workflow'
import type { WorkspaceManagerInterface } from '@orkestrel/workspace'

/** Names the role a {@link Message} plays in a conversation turn. */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

/**
 * Represents one conversation turn fed to a {@link ProviderInterface} — a stored, identified
 * message.
 *
 * @remarks
 * `calls` is present only on an `assistant` turn that requested tool calls — the
 * `tool_calls` a prior generation produced, replayed back into the next request so
 * the model sees its own decision. A `tool` turn carries the tool's result in
 * `content` (the textual outcome), keyed back to the call by the conversation order.
 */
export interface Message {
	readonly id: string
	readonly role: MessageRole
	readonly content: string
	/** Holds an assistant turn's requested tools — its `tool_calls`, replayed. */
	readonly calls?: readonly ToolCall[]
	/**
	 * Holds multimodal image data attached to this turn — base64-encoded image strings,
	 * forwarded to a vision-capable provider (the provider maps them onto the wire's
	 * per-message `images` array). Present only on a multimodal turn; absent otherwise.
	 */
	readonly images?: readonly string[]
}

/**
 * Carries the minimal data needed to author a {@link Message} — the `id` is
 * assigned by the layer that stores it, so a caller supplies only role / content
 * (and, for a replayed assistant turn, its `calls`).
 */
export interface MessageInput {
	readonly role: MessageRole
	readonly content: string
	readonly calls?: readonly ToolCall[]
	/**
	 * Holds multimodal image data for this turn — base64-encoded image strings forwarded to a
	 * vision-capable provider (carried verbatim onto the stored {@link Message}).
	 */
	readonly images?: readonly string[]
}

/**
 * Holds a single inference turn's structured outcome — the assembled assistant content,
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
	/** Carries reasoning the provider separated from the answer when present — never re-enters the conversation. */
	readonly thinking?: string
	/** Carries the tool calls the model wants when present. */
	readonly tools?: readonly ToolCall[]
	/** Carries token consumption for this turn when present (from the wire's `done` line / body). */
	readonly usage?: TokenUsage
}

/**
 * Represents one streamed delta a {@link ProviderInterface}'s `stream` yields — a TAGGED unit
 * discriminated by the channel it belongs to, so the agent loop can re-surface the two
 * channels separately (answer content vs. live reasoning) as it pumps.
 *
 * @remarks
 * The discriminant `channel` names the axis that varies: a
 * `'content'` delta is a chunk of the assistant ANSWER (the deltas that accumulate into
 * {@link ProviderResult.content}); a `'thinking'` delta is a chunk of the model's
 * REASONING the provider separated from the answer (the daemon's native
 * `message.thinking` wire channel), surfaced LIVE so a consumer can stream it into a
 * collapsible without waiting for the assembled result. `text` is the delta's literal
 * text. Thinking NEVER re-enters the conversation — it is display/audit metadata, exactly
 * as {@link ProviderResult.thinking} (the authoritative final accumulation) is.
 */
export type ProviderDelta =
	| { readonly channel: 'content'; readonly text: string }
	| { readonly channel: 'thinking'; readonly text: string }

/**
 * Carries the per-call options threaded into a {@link ProviderInterface}'s `generate` / `stream` —
 * the bag a caller passes to influence ONE inference call without reconfiguring the
 * provider instance.
 *
 * @remarks
 * `think` OVERRIDES the provider's constructed reasoning preference for THIS call: `true`
 * asks the backend to separate reasoning natively (a thinking model returns it on its
 * `message.thinking` channel, surfaced as `'thinking'` {@link ProviderDelta}s + the final
 * {@link ProviderResult.thinking}); `false` suppresses it. `schema`, when given, asks the
 * backend to constrain its response to the given JSON-Schema shape (the same open
 * JSON-Schema record {@link ToolDefinition.parameters} already carries) — a structured-output
 * request for THIS call only. Both omitted ⇒ the provider's own defaults apply (the
 * constructor value / no schema constraint), so the contract stays backward-safe — a caller
 * that passes no options behaves exactly as before.
 */
export interface ProviderStreamOptions {
	/** Overrides the provider's reasoning preference for this call; omitted ⇒ the provider default. */
	readonly think?: boolean
	/** Constrains the response to this JSON-Schema shape (the same open record {@link ToolDefinition.parameters} uses); omitted ⇒ no constraint. */
	readonly schema?: Readonly<Record<string, unknown>>
}

/**
 * Defines the pluggable LLM inference boundary — the one contract every agent chunk depends
 * on. A provider turns a conversation (plus optional tools) into either a single
 * assembled {@link ProviderResult} (`generate`) or a stream of {@link ProviderDelta}s that
 * RETURNS the assembled result (`stream`).
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
	 * Holds the model's preferred context framing, by section kind — an OPTIONAL
	 * {@link ContextFormat} an {@link import('./AgentContext.js').AgentContext}
	 * applies as the PROVIDER-DEFAULT level of its build cascade (beating the managers'
	 * built-in framing, beaten by a manager-options or per-item override). Omitted ⇒ the
	 * provider is framing-agnostic and the managers' built-in defaults apply unchanged.
	 */
	readonly format?: ContextFormat | undefined
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
	 * Streams one turn — yields {@link ProviderDelta}s (channel-tagged `content` / `thinking`
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
 * Splits a thinking model's in-content `<think>…</think>` reasoning spans away from the
 * answer, delta by delta with per-stream state, so a provider yields ONLY clean content
 * and surfaces the reasoning as {@link ProviderResult.thinking}.
 *
 * @remarks
 * - **Stateful across deltas.** A tag may arrive SPLIT across wire chunks (`'<thi'`
 *   ending one delta, `'nk>'` opening the next) — `split` holds any ambiguous tail
 *   back until the next delta (or `flush`) disambiguates it, so a partial tag is
 *   never leaked as content and never mis-eaten as thinking.
 * - **`split(delta)`** feeds one raw content delta and returns the CLEAN content to
 *   surface for it (possibly `''` — for example mid-think). Text inside a
 *   `<think>…</think>` span accumulates on `thinking`; multiple spans accumulate in
 *   order; a nested-looking `<think>` inside an open span is thinking text (no
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
	/** Holds the AUTHORITATIVE clean content accumulated so far (corrected across an implicit-open reclassification). */
	readonly content: string
	/** Holds the reasoning text accumulated from every `<think>…</think>` span so far. */
	readonly thinking: string
	/** Feeds one raw delta; returns the clean (non-think) content to surface for it. */
	split(delta: string): string
	/** Settles the stream end — returns any held clean tail; an unclosed think span lands on `thinking`. */
	flush(): string
}

/**
 * Stores immutable {@link Message}s in insertion order; `add` mints the `id`.
 *
 * @remarks
 * - **Store.** Messages live in insertion order; `count` is how many are stored.
 *   `add` takes one {@link MessageInput} or a batch and MINTS each message's
 *   `id` (a random UUID), returning the created message(s). A stored message is
 *   immutable — created once from its input, never mutated.
 * - **Lookup.** `message(id)` resolves one by id (`undefined` when absent);
 *   `messages()` lists every message in insertion order.
 * - **Removal.** `remove` drops one by id, or a batch — `true` only when EVERY supplied id
 *   was removed; `clear` empties the store.
 * - **Event-free.** A purely data store — no Emitter, no events.
 */
export interface MessageManagerInterface {
	readonly count: number
	add(input: MessageInput): Message
	add(inputs: readonly MessageInput[]): readonly Message[]
	message(id: string): Message | undefined
	messages(): readonly Message[]
	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	clear(): void
}

/**
 * Represents an immutable instruction — a named directive a richer context places between the
 * system prompt and the conversation, ordered by descending {@link priority}.
 *
 * @remarks
 * Assembled once from its {@link InstructionInput} (the `id` minted by the storing
 * layer) and never mutated. `name` keys it in an {@link InstructionManagerInterface}
 * (last write wins); `priority` orders the rendered list (higher first), defaulting to
 * `0`. The {@link import('./AgentContext.js').AgentContext} build step renders it through
 * its manager's `render` (`content`) under the manager's `open` header.
 */
export interface InstructionInterface {
	readonly id: string
	readonly name: string
	readonly content: string
	/** Ranks the instruction — higher renders first; defaults to `0`. */
	readonly priority: number
	/**
	 * Holds a fully-rendered per-item override of this instruction's prompt text — the
	 * MOST-SPECIFIC level of the {@link import('./AgentContext.js').AgentContext} build
	 * cascade, beating every format level for THIS item. Present only when supplied on the
	 * {@link InstructionInput} (round-tripped through the manager, like a message's
	 * `images`); absent ⇒ the cascade decides.
	 */
	readonly override?: string
}

/**
 * Carries the minimal data to author an {@link InstructionInterface} — the `id` is minted by
 * the {@link InstructionManagerInterface} that stores it, so a caller supplies only
 * `name` / `content` (and an optional `priority`, defaulting to `0`).
 */
export interface InstructionInput {
	readonly name: string
	readonly content: string
	/** Weights the ordering (higher renders first); defaults to `0` when omitted. */
	readonly priority?: number
	/**
	 * Holds a fully-rendered override of THIS instruction's prompt text — the most-specific
	 * level of the {@link import('./AgentContext.js').AgentContext} build cascade (beats a
	 * manager-options / provider / built-in format for this item). Round-tripped onto the
	 * stored {@link InstructionInterface} when given (present-when-supplied, like `images`).
	 */
	readonly override?: string
}

/**
 * Maps the push observation surface of an {@link InstructionManagerInterface} — the
 * mutation moments a fire-and-forget observer subscribes to through `manager.emitter.on`.
 *
 * @remarks
 * `add` carries the created (or replaced) {@link InstructionInterface}; `remove`
 * carries the removed instruction's `name`; `clear` is a pure signal (no payload).
 * Listener isolation is the emitter's: a listener throw is routed to the
 * emitter's `error` handler (the `error` option), never onto this map, so a buggy
 * observer can never corrupt a mutation. Declared as a `type` alias (not `interface
 * extends EventMap`) so the type-literal satisfies `EventMap` structurally.
 */
export type InstructionManagerEventMap = {
	/** Reports an instruction added (or a same-name one replaced) — the created instruction. */
	readonly add: readonly [instruction: InstructionInterface]
	/** Reports an instruction removed — its `name`. */
	readonly remove: readonly [name: string]
	/** Reports every instruction removed. */
	readonly clear: readonly []
}

/**
 * Configures `createInstructionManager` — the reserved `on` hooks plus an optional
 * per-section format override.
 *
 * @remarks
 * `on` is the reserved listener key: initial listeners for the manager's
 * {@link InstructionManagerEventMap}, wired at construction. `format` is the
 * MANAGER-OPTIONS level of the {@link import('./AgentContext.js').AgentContext} build
 * cascade — a {@link ContextSectionFormat} the manager consults FIRST in its own
 * `open` / `render` (falling back to the built-in when a member is omitted), so it
 * BEATS the provider default and the built-in, while a per-item
 * {@link InstructionInput.override} still beats it. Omitted ⇒ the built-in framing applies.
 */
export interface InstructionManagerOptions {
	readonly on?: EmitterHooks<InstructionManagerEventMap>
	/** Holds the emitter's listener-error handler — a listener throw routes here, not to a domain event. */
	readonly error?: EmitterErrorHandler
	/** Holds a manager-level format override (beats the provider default + built-in); see {@link AgentContextInterface.build}. */
	readonly format?: ContextSectionFormat<InstructionInterface>
}

/**
 * Registers {@link InstructionInterface}s keyed by `name` — `add` (one or a batch)
 * mints each `id` and OVERWRITES a same-name instruction (last write wins);
 * `instructions()` lists them SORTED by descending `priority` (stable for ties).
 *
 * @remarks
 * - **Build contract.** `open` is the section header a richer context renders
 *   the instructions under; `render(instruction)` renders one instruction (its
 *   `content`). Together they let an {@link import('./AgentContext.js').AgentContext}
 *   assemble an instructions block.
 * - **Observable.** The owned `emitter` ({@link InstructionManagerEventMap})
 *   carries `add` / `remove` / `clear` for fire-and-forget observers; the emitter
 *   isolates a listener throw and routes it to its `error` handler (the `error` option).
 */
export interface InstructionManagerInterface {
	readonly emitter: EmitterInterface<InstructionManagerEventMap>
	readonly count: number
	/** Names the section header a context renders the instructions under. */
	readonly open: string
	/**
	 * Holds the manager-options format override (the {@link InstructionManagerOptions.format}
	 * supplied at construction), or `undefined` when none — the MANAGER-OPTIONS level of the
	 * {@link import('./AgentContext.js').AgentContext} build cascade, exposed so `build()`
	 * can interleave the provider default BENEATH it (`open` / `render` already
	 * encapsulate the `[override → built-in]` half for standalone use). A `readonly` data
	 * member, not a method.
	 */
	readonly format: ContextSectionFormat<InstructionInterface> | undefined
	add(input: InstructionInput): InstructionInterface
	add(inputs: readonly InstructionInput[]): readonly InstructionInterface[]
	instruction(name: string): InstructionInterface | undefined
	/** Lists every instruction, sorted by descending `priority` (stable for equal priorities). */
	instructions(): readonly InstructionInterface[]
	/** Renders one instruction for the prompt — its `content`. */
	render(instruction: InstructionInterface): string
	remove(name: string): boolean
	remove(names: readonly string[]): boolean
	clear(): void
}

/**
 * Overrides one context section's format — an `open` / `render` / `close` trio
 * that frames a section in the {@link import('./AgentContext.js').AgentContext} build
 * cascade: a top line rendered once before the items, a per-item rendering, and a bottom
 * line rendered once after the items.
 *
 * @remarks
 * `open`, `render`, and `close` are OPTIONAL and resolved INDEPENDENTLY (so an override may set only
 * the top, only the per-item rendering, only the bottom, or any mix). A section assembles
 * as `[open, ...items.map(render), close]` with empty / absent slots dropped, the survivors
 * blank-line (`\n\n`) joined — so `open` + `close` together let a developer WRAP the whole
 * group (for example `open: '<instructions>'` … `close: '</instructions>'`). `open` is the
 * section's leading text (the header, or a group's opening tag); `render` turns one section
 * item (an {@link InstructionInterface}) into its prompt text; `close` is the trailing text.
 * `open` and `render` cascade through the
 * built-in floor (`open` ⇒ the manager's built-in header, `render` ⇒ the manager's built-in
 * rendering); `close` has NO built-in, so an unset `close` yields no closing line.
 * It is the unit BOTH a provider's {@link ContextFormat} (a per-section-kind
 * default) and a manager's `Options` carry — see {@link AgentContextInterface.build} for
 * the full precedence.
 *
 * @typeParam T - The section item the `render` override formats
 */
export interface ContextSectionFormat<T> {
	/**
	 * Holds text rendered ONCE before the section's items — the section header or a group's
	 * opening wrapper, for example `'<instructions>'`; omitted ⇒ the next cascade level decides
	 * (defaulting to the built-in header).
	 */
	readonly open?: string
	/** Overrides one item's rendering; omitted ⇒ the next cascade level decides. */
	readonly render?: (item: T) => string
	/**
	 * Holds text rendered ONCE after the section's items — a group's closing wrapper, for
	 * example `'</instructions>'`; omitted ⇒ no closing line (there is no built-in close).
	 */
	readonly close?: string
}

/**
 * Exposes the manager surface one context section's format cascade reads — its built-in
 * `open` / `render`, plus the raw options override the cascade layers a provider
 * default beneath.
 *
 * @remarks
 * The narrow contract the cascade resolvers
 * ({@link import('./helpers.js').resolveOpen} / {@link import('./helpers.js').resolveClose} /
 * {@link import('./helpers.js').resolveItem}) take, so they stay independent of WHICH manager
 * supplies the section: an {@link InstructionManagerInterface} satisfies it structurally.
 * `open` and `render` already encapsulate `[options-override → built-in]` (so a manager
 * used standalone renders correctly), and `format` exposes the raw override so `build()` can
 * interleave the provider default BENEATH it.
 *
 * @typeParam T - The section item this source renders
 */
export interface ContextSectionSourceInterface<T> {
	/** Names the built-in section header (already resolved against the manager-options override). */
	readonly open: string
	/** Holds the raw manager-options override, or `undefined` when none was supplied. */
	readonly format: ContextSectionFormat<T> | undefined
	/** Renders one item (already resolved against the manager-options override). */
	render(item: T): string
}

/**
 * Holds a provider's OPTIONAL context-framing default, keyed by section kind — the framing a
 * model prefers (for example XML tags against Markdown headers), declared by a
 * {@link ProviderInterface} that opts in.
 *
 * @remarks
 * Each key is a {@link ContextSectionFormat} for one of the observable context sections
 * (the `instructions` section), so a provider can frame each section independently — and any
 * it omits falls through to that manager's built-in default. It is the PROVIDER-DEFAULT
 * level of the {@link import('./AgentContext.js').AgentContext} build cascade: it BEATS a
 * manager's built-in default but is BEATEN by a manager-options override and by a per-item
 * override (see {@link AgentContextInterface.build}). It references the ABSTRACT core
 * item interface ({@link InstructionInterface}), so a provider opting in imports it from
 * `@orkestrel/agent` — the type is provider-agnostic, with no backend coupling. Omitting it
 * entirely (the default for an agnostic provider) leaves every section on its manager's
 * built-in framing.
 */
export interface ContextFormat {
	/** Frames the instructions section; omitted ⇒ that manager's built-in. */
	readonly instructions?: ContextSectionFormat<InstructionInterface>
}

/**
 * Lists the per-category allow-lists a {@link ScopeInterface} carries — an optional
 * `readonly string[]` for `instructions`, for `tools`, and for `files`, each keyed by that
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
export interface ScopeFilter {
	/** Lists the allowed instruction `name`s (`undefined` ⇒ all, `[]` ⇒ none, else only-listed). */
	readonly instructions?: readonly string[]
	/** Lists the allowed tool `name`s (`undefined` ⇒ all, `[]` ⇒ none, else only-listed). */
	readonly tools?: readonly string[]
	/**
	 * Lists the allowed ACTIVE-workspace file `path`s (`undefined` ⇒ all, `[]` ⇒ none, else only-listed) —
	 * the filter {@link AgentContextInterface.build} applies to the active workspace's
	 * {@link import('@orkestrel/workspace').WorkspaceInterface.files} before rendering them (text → the system block, image →
	 * the last user message).
	 */
	readonly files?: readonly string[]
}

/**
 * Carries the data to author a {@link ScopeInterface} — a {@link ScopeFilter} plus the
 * required `name` (a human label; the `id` is minted by the layer that stores it).
 */
export interface ScopeInput extends ScopeFilter {
	readonly name: string
}

/**
 * Represents a named, immutable filter over a richer context's items — the per-category
 * allow-lists ({@link ScopeFilter}) plus an `id` / `name`, and a `narrow` that
 * composes a tighter child by set-INTERSECTION.
 *
 * @remarks
 * Each list is three-way (`undefined` ⇒ all, `[]` ⇒ none, else only-listed). `narrow`
 * returns a NEW scope whose per-category visible set is the intersection of this scope's
 * list and the config's — with `undefined` treated as the universal set (no constraint),
 * so `undefined ∩ list = list` and `undefined ∩ undefined = undefined`. Narrowing can
 * only TIGHTEN (a parent-excluded key never returns); the scope itself is never mutated.
 */
export interface ScopeInterface extends ScopeFilter {
	readonly id: string
	readonly name: string
	/**
	 * Composes a tighter child scope — its per-category set is the intersection of this
	 * scope's list and `config`'s (an `undefined` side imposing no constraint).
	 *
	 * @param config - The narrowing allow-lists (a `name`-less {@link ScopeFilter})
	 * @returns A NEW, tighter {@link ScopeInterface} (this one is left unchanged)
	 */
	narrow(config: ScopeFilter): ScopeInterface
}

/**
 * Maps the push observation surface of a {@link ScopeManagerInterface} — analogous to
 * {@link InstructionManagerEventMap}, but keyed by the minted `id` and carrying `create`
 * (a scope always mints, never overwrites) rather than `add`.
 *
 * @remarks
 * `create` carries the created {@link ScopeInterface}; `remove` carries the removed
 * scope's `id`; `clear` is a pure signal. The emitter isolates a listener throw and routes
 * it to its `error` handler. A `type` alias so it satisfies `EventMap` structurally.
 */
export type ScopeManagerEventMap = {
	/** Reports a scope created — the created scope. */
	readonly create: readonly [scope: ScopeInterface]
	/** Reports a scope removed — its `id`. */
	readonly remove: readonly [id: string]
	/** Reports every scope removed. */
	readonly clear: readonly []
}

/**
 * Configures `createScopeManager` — the reserved `on` hooks: initial listeners for
 * the manager's {@link ScopeManagerEventMap}, wired at construction.
 */
export interface ScopeManagerOptions {
	readonly on?: EmitterHooks<ScopeManagerEventMap>
	/** Holds the emitter's listener-error handler — a listener throw routes here, not to a domain event. */
	readonly error?: EmitterErrorHandler
}

/**
 * Registers reusable {@link ScopeInterface}s keyed by their minted `id` — `create`
 * mints + stores one (never overwrites), `scopes()` lists them in insertion order.
 *
 * @remarks
 * - **Registry.** `create(input)` mints a scope (an `id` + the per-category allow-lists) and
 *   stores it; `count` is how many are stored. `scope(id)` looks one up; `scopes()` lists
 *   them in insertion order. (Keyed by minted `id`, not `name`, so two scopes may share a
 *   `name` and `create` always adds.)
 * - **Observable.** The owned `emitter` ({@link ScopeManagerEventMap}) carries
 *   `create` / `remove` / `clear` for fire-and-forget observers; the emitter isolates a
 *   listener throw and routes it to its `error` handler (the `error` option).
 */
export interface ScopeManagerInterface {
	readonly emitter: EmitterInterface<ScopeManagerEventMap>
	readonly count: number
	create(input: ScopeInput): ScopeInterface
	scope(id: string): ScopeInterface | undefined
	/** Lists every scope, in insertion order. */
	scopes(): readonly ScopeInterface[]
	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	clear(): void
}

/**
 * Configures `createAgentContext` — the richer context's configuration.
 *
 * @remarks
 * `system` is the optional system prompt prepended to the turn's input. `instructions` /
 * `workspaces` are optional pre-built context managers to reuse (bring your own registry);
 * when one is omitted, the context creates a fresh empty one. `tools` supplies the loop's
 * call-dispatch and provider-advertising registry; it never renders into the prompt. `scope` is the
 * initial active filter applied at `build()` time (and at the loop's tool-advertise step); it
 * defaults to `undefined` — no filtering — and can be changed through the context's `apply`
 * method afterwards. `conversations` is the structural {@link ConversationManagerInterface} the
 * context's message source flows from: `messages` IS the manager's ACTIVE conversation's live tail
 * and `build()` folds that conversation's `view()` (section summaries + live). When omitted, a fresh
 * {@link ConversationManagerInterface} is created and a default conversation is added (so
 * `messages` is ALWAYS defined). All default to a context with no system prompt, empty registries,
 * no scope, and a fresh conversation registry holding one default conversation.
 */
export interface AgentContextOptions {
	readonly system?: string
	/**
	 * Holds the loop's pre-built tool registry for provider advertising and call dispatch; an empty one is
	 * created when omitted. Tools never render into `build()`'s prompt.
	 */
	readonly tools?: ToolManagerInterface
	/** Reuses a pre-built instruction registry; an empty one is created when omitted. */
	readonly instructions?: InstructionManagerInterface
	/**
	 * Reuses a pre-built {@link WorkspaceManagerInterface}; a fresh empty one is created when
	 * omitted (so `context.workspaces` is ALWAYS present). `build()` renders the ACTIVE workspace's
	 * files by carrier — text files into the system block (fenced), image files attached to the last
	 * user message. The registry is structural; change its active workspace through
	 * `workspaces.switch(id)`. The active workspace is the SOLE document/image context.
	 */
	readonly workspaces?: WorkspaceManagerInterface
	/** Sets the initial active scope (the build-time filter); `undefined` ⇒ no filtering. */
	readonly scope?: ScopeInterface
	/**
	 * Reuses a pre-built {@link ConversationManagerInterface} as the message source; a fresh
	 * empty one is created when omitted. The context ENSURES an active conversation at construction
	 * (it `add`s a default when the manager has none), so `messages` — the manager's ACTIVE
	 * conversation's LIVE tail — is ALWAYS defined. `build()` folds the active conversation's
	 * `view()` (the per-section summaries + the live tail) as its AUTHORITATIVE message inclusion —
	 * the scope does NOT filter the conversation (it owns inclusion through compaction; scope filters
	 * only instructions / tools / workspace files). The registry is structural; change its active
	 * conversation through the manager's `switch(id)`.
	 */
	readonly conversations?: ConversationManagerInterface
}

/**
 * Assembles a turn's provider input from the system prompt + the context managers +
 * the conversation, applying the active scope per category.
 *
 * @remarks
 * The richer context — `system` (the optional system prompt), the prompt context managers
 * (`instructions` / `workspaces` / `conversations`), `messages` (the active
 * conversation's live tail, satisfying {@link MessageManagerInterface}), and the current `scope`
 * (the active {@link ScopeInterface} filter, or `undefined` for no filtering). `build()` folds the
 * scoped instructions into ONE leading `system` message (under the manager's `open`,
 * each item through its `render`) — PLUS the ACTIVE workspace's scope-filtered text files
 * (rendered as fenced reference blocks) — and appends the ACTIVE conversation's `view()`, attaching
 * the active workspace's scope-filtered image files' `base64` payload to the LAST user message. The
 * active workspace is the SOLE document/image context. Tools are advertised to the provider
 * STRUCTURALLY (through `tools.definitions()`, scope-filtered by the loop), NOT serialized into
 * the prompt, so they never appear in `build()`'s output. The context managers are observable
 * (their own `emitter`s); the context itself is event-free.
 */
export interface AgentContextInterface {
	readonly system: string | undefined
	readonly instructions: InstructionManagerInterface
	/**
	 * Holds the {@link WorkspaceManagerInterface} whose ACTIVE workspace `build()` renders by carrier —
	 * its text files folded into the system block (fenced reference blocks) and its image files'
	 * `base64` payload attached to the LAST user message. The active workspace is the SOLE
	 * document/image context. ALWAYS present (a fresh empty manager when none was supplied).
	 * `build()` reads its `active` (and the active workspace's `files()`) FRESH each call. With NO
	 * active workspace, nothing is rendered for workspaces. Active-only — never the other registered
	 * workspaces.
	 */
	readonly workspaces: WorkspaceManagerInterface
	/**
	 * Holds the active conversation's LIVE tail — the agent's message source, ALWAYS defined (the
	 * {@link conversations} registry always has an active conversation; a default is added at
	 * construction). It IS the active {@link ConversationInterface} itself (which satisfies
	 * {@link MessageManagerInterface} structurally), so appends through `messages` route to the
	 * active conversation's tail and `build()` folds its `view()`. Computed dynamically (it follows
	 * `conversations.switch(id)`), the SAME reference the active conversation exposes — no
	 * duplication.
	 */
	readonly messages: MessageManagerInterface
	/**
	 * Holds the {@link ConversationManagerInterface} the message source flows from — `messages` IS its
	 * ACTIVE conversation's live tail and `build()` folds that conversation's `view()`. ALWAYS holds
	 * an active conversation (a default is added at construction when none was supplied), so
	 * `messages` is always defined. Switch the active conversation through
	 * `conversations.switch(id)` — so one agent can serve MANY conversations (set the active one per
	 * request). Switch BETWEEN runs, not during one; for CONCURRENT threads use separate agents.
	 */
	readonly conversations: ConversationManagerInterface
	/**
	 * Holds the loop's tool registry for provider advertising and call dispatch. Tools are structural
	 * loop machinery and never render into `build()`'s prompt.
	 */
	readonly tools: ToolManagerInterface
	/** Holds the active scope applied at `build()` time + the loop's tool-advertise step (`undefined` ⇒ no filtering). */
	readonly scope: ScopeInterface | undefined
	/**
	 * Applies the active per-turn scope filter. Passing `undefined` removes filtering.
	 *
	 * @param scope - The scope to apply, or `undefined` to remove the active filter
	 *
	 * @example
	 * ```ts
	 * context.apply(scope)
	 * context.apply(undefined)
	 * ```
	 */
	apply(scope: ScopeInterface | undefined): void
	/**
	 * Builds the provider input for the next turn: a leading `system` message folding the prompt
	 * + the scoped instructions + the ACTIVE workspace's scoped-in TEXT files (rendered as
	 * fenced reference blocks), then the ACTIVE conversation's `view()` (with the active workspace's
	 * scoped-in IMAGE files' `base64` payload attached to the last user message). Tools are advertised
	 * structurally, not in the prompt. Built fresh on each call.
	 *
	 * @remarks
	 * **The active workspace (rendered by carrier) — the SOLE document/image context.** When
	 * `workspaces.active` is set, its
	 * {@link import('@orkestrel/workspace').WorkspaceInterface.files} are filtered by
	 * `scope.files` (a three-way allow-list; `undefined` ⇒ all active files), then split by
	 * carrier: TEXT files ({@link import('@orkestrel/workspace').isText}) render into a dedicated
	 * `## Workspace` section in the system block — each a fenced
	 * `` File: <path>\n```<language>\n<text>\n``` `` block — placed immediately after the instructions
	 * section; binary files whose MIME starts with `image/` have their `base64` payload
	 * attached to the LAST user message (a vision provider reads images off a user turn).
	 * ACTIVE-ONLY — never the other registered workspaces; with NO active workspace nothing is
	 * rendered for workspaces.
	 *
	 * **The format cascade.** Each manager section frames as `[open, ...items.map(render), close]`
	 * (empty / absent slots dropped, the survivors `\n\n`-joined). The `open` (the section's
	 * leading text), each item's `render`, and the `close` (the section's trailing text)
	 * resolve INDEPENDENTLY, MOST-SPECIFIC-FIRST, from a {@link ContextSectionFormat} at each
	 * level — an item override, a manager-options override, the provider `format` default,
	 * and the manager's built-in. For the `instructions` section kind `K`, manager
	 * `M`, and the supplied `format` `F`:
	 * - **open** = `M.format?.open ?? F?.[K]?.open ?? M.open` — that is,
	 *   **manager-options override > provider default > built-in** (the leading text has no
	 *   per-item level). The manager ENCAPSULATES the `[options-override → built-in]` half:
	 *   `M.open` already returns the options override's `open` when one is set, else
	 *   the built-in header — so `build()` only layers the provider default BETWEEN them.
	 * - **item** `I` = `I.override ?? M.format?.render?.(I) ?? F?.[K]?.render?.(I) ?? M.render(I)`
	 *   — that is, **item override > manager-options override > provider default > built-in**.
	 *   Again `M.render(I)` already returns the options override when set, else the
	 *   built-in, so `build()` layers the per-item `I.override` ON TOP and the provider
	 *   default BETWEEN.
	 * - **close** = `M.format?.close ?? F?.[K]?.close` — that is, **manager-options
	 *   override > provider default**, with NO built-in floor (the trailing text has no
	 *   per-item level): unset at both levels ⇒ `undefined` ⇒ no closing line. Paired with
	 *   `open`, it lets a level WRAP the group (`open: '<instructions>'` … `close: '</instructions>'`).
	 *
	 * Passing NO `format` (the default) leaves the provider-default level empty, so the
	 * output is BYTE-FOR-BYTE the managers' built-in framing — every section is its
	 * built-in header + items, with no closing line (the regression contract). Scope
	 * filtering runs BEFORE formatting (unchanged); the workspace image-data attachment to the
	 * last user message is unchanged.
	 *
	 * @param format - The provider's optional {@link ContextFormat} default
	 *   (typically `provider.format`); omitted ⇒ only the manager-options / item / built-in
	 *   levels apply, reproducing the prior built-in output exactly
	 * @returns The scoped conversation, prefixed by the assembled `system` message when any
	 *   of (the prompt, the scoped instructions, the active workspace's text files) is non-empty
	 */
	build(format?: ContextFormat): readonly Message[]
}

/**
 * Names the lifecycle state of an {@link AgentInterface} turn — `idle` before a run,
 * `running` while the loop is in flight, then the settled `done` (a normal finish or
 * a cancel) or `error` (a genuine provider / tool failure).
 */
export type AgentStatus = 'idle' | 'running' | 'done' | 'error'

/**
 * Represents a streamed step of an agent turn — the union the loop yields as it runs, discriminated
 * by the `category` of step it carries.
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
	| { readonly category: 'token'; readonly content: string }
	| { readonly category: 'think'; readonly content: string }
	| { readonly category: 'tool'; readonly call: ToolCall; readonly result: ToolResult }
	| { readonly category: 'usage'; readonly usage: TokenUsage }

/**
 * Holds the settled outcome of an agent turn — the assembled assistant `content`, the
 * `usage` summed across the turn's provider calls, and whether it was committed
 * `partial`.
 *
 * @remarks
 * `partial` is `true` when the turn was committed early from a cancel — an external
 * `signal` abort, the turn's own `abort()`, a `timeout` deadline, or an exhausted
 * `budget` — in which case `content` is whatever had accumulated when the cancel
 * landed. `partial` is ALSO `true` when the loop exhausted its `limit` while still
 * holding unresolved tool intent (the model requested tools on the very last allowed
 * turn) — a distinct, non-cancel cause covered by {@link RunOutcome.exhausted} (see
 * the `exhaust` {@link AgentEventMap} event). It is `false` for a turn that ran to a
 * natural finish (including a `limit: 0` run, which never enters the loop). `usage` is
 * present only when at least one provider call reported usage — an aborted run's `usage`
 * INCLUDES the cancelled turn's tokens when the provider reports partial usage on the
 * abort (folded in exactly like a completed turn's); a provider that cannot observe
 * usage mid-stream (for example a daemon whose final counts never arrive before the cancel)
 * reports none for that turn, and none is fabricated. `thinking` is present
 * only when a provider call surfaced reasoning it separated from the answer
 * ({@link ProviderResult.thinking}, joined across the run's calls) — display/audit
 * metadata that never re-enters the conversation.
 */
export interface AgentResult {
	readonly content: string
	/** Carries reasoning the run's provider calls separated from the answer (present when any surfaced it). */
	readonly thinking?: string
	/** Holds the summed {@link TokenUsage} across the turn's provider calls (present when any reported it). */
	readonly usage?: TokenUsage
	readonly partial: boolean
}

/**
 * Holds the immutable per-run outcome an {@link AgentInterface}'s loop settles on — the value its
 * run RETURNS, assembled from there into the {@link AgentResult} its `stream`'s `result`
 * promise resolves.
 *
 * @remarks
 * Computed inside one run (so concurrent runs never share state) and returned once, when the
 * loop settles: `content` is the streamed assistant text, `thinking` the reasoning the
 * provider calls separated from it ({@link ProviderResult.thinking}, joined across calls —
 * `undefined` when none surfaced), `usage` the summed {@link TokenUsage} (present only when
 * a provider call reported it), `partial` is `true` when a cancel committed the run early OR
 * when the loop exhausted its `limit` with unresolved tool intent, and `exhausted` is `true`
 * in that second case specifically (a distinct, non-cancel cause the {@link AgentEventMap}
 * `exhaust` event observes). It is the settled outcome one run returns, before the agent folds
 * it into the {@link AgentResult} its `stream`'s `result` promise resolves.
 */
export interface RunOutcome {
	readonly content: string
	readonly thinking: string | undefined
	readonly usage: TokenUsage | undefined
	readonly partial: boolean
	readonly exhausted: boolean
}

/**
 * Maps the push observation surface of an {@link AgentInterface} — the
 * lifecycle + usage/tool moments a fire-and-forget observer (logging, metrics,
 * tracing) subscribes to, ALONGSIDE the pull {@link AgentChunk} stream.
 *
 * @remarks
 * Push vs. pull: the Emitter carries the loop's LIFECYCLE moments (a run begins /
 * each turn / a settle / a cancel) plus usage and dispatched-tool events — the things
 * the chunk stream can't express (a `deny` never reaches the stream) or that a
 * fire-and-forget observer wants without draining the stream. PER-TOKEN deltas stay
 * EXCLUSIVELY the {@link AgentChunk} stream's job (the pull surface) — there is
 * deliberately NO `token` event here. Subscribe through `agent.emitter.on(...)`.
 *
 * Observation is side-effect-free on the loop: listener isolation is the emitter's
 * — every event is emitted directly and a listener throw is routed to the emitter's OWN
 * `error` handler (the `error` option), never onto this domain map and never into the
 * settle-once / wake-park engine — so a buggy observer can never reorder, throw into, or
 * corrupt the run.
 *
 * A cancelled run emits `abort` (the cancel signal) AND then `finish` (the settled
 * PARTIAL result) — so an observer sees both that the run was cancelled and the partial
 * outcome it committed; a genuine error emits `error` instead of `finish`.
 *
 * Declared as a `type` alias (not `interface extends EventMap` — `EventMap` is a
 * `type` kind): a type-literal satisfies the `EventMap` constraint
 * (`Record<string, readonly unknown[]>`) structurally, whereas an interface lacks the
 * required index signature.
 */
export type AgentEventMap = {
	/** Reports a run beginning — emitted at the top of `stream()` once `status` is `running`. */
	readonly start: readonly [id: string]
	/** Reports each `#run` loop iteration beginning — the zero-based turn index. */
	readonly turn: readonly [index: number]
	/** Reports a dispatched {@link ToolCall} paired with its {@link ToolResult} (executed or a denial). */
	readonly tool: readonly [call: ToolCall, result: ToolResult]
	/** Reports a turn's {@link TokenUsage} — emitted after a usage-bearing provider call. */
	readonly usage: readonly [usage: TokenUsage]
	/** Reports a call the authority DENIED — the call + the optional reason (NOT in the chunk stream). */
	readonly deny: readonly [call: ToolCall, reason: string | undefined]
	/** Reports the run settled successfully (a natural finish OR a cancel's partial) — the {@link AgentResult}. */
	readonly finish: readonly [result: AgentResult]
	/** Reports the run settled with a genuine (non-cancel) error — the thrown value (always `unknown`). */
	readonly error: readonly [error: unknown]
	/** Reports the run cancelled (external signal / timeout / budget / `abort()`) — the cancel reason. */
	readonly abort: readonly [reason: unknown]
	/**
	 * Reports the loop exhausting its `limit` while still holding unresolved tool intent (the model
	 * requested tools on the very last allowed turn) — the turn count reached. Distinct from
	 * `abort`: exhaustion is NOT a cancel (no external signal / timeout / budget tripped), so
	 * this fires INSTEAD of `abort`, still followed by `finish` carrying the partial result.
	 */
	readonly exhaust: readonly [turns: number]
	/**
	 * Reports AUTOMATIC compaction's summarizer THROWING — a NON-FATAL warn channel (the run continues; see
	 * {@link AgentOptions.window}). When the loop's between-turns / pre-first-turn auto-compaction
	 * (`conversation.compact()`) rejects, the run does NOT crash: the loop skips compaction that
	 * turn and surfaces the caught error here so the failure is observable, never silently lost.
	 * The run still SETTLES through the other events — `finish` for the lenient default, and
	 * `error` when {@link AgentOptions.strict} rethrows the same caught value — so `fault` reports
	 * the best-effort optimization that failed and never the run's own outcome. A MANUAL
	 * `conversation.compact()` still propagates its own error; only the agent's AUTO path is
	 * resilient. A DOMAIN event (the emitter isolates a listener throw separately, routing it to
	 * its `error` handler).
	 */
	readonly fault: readonly [error: unknown]
}

/**
 * Buffers values in an unbounded async channel — a producer WRITES them in (`push`) and
 * ends it (`close` / `fail`) regardless of consumption, while a consumer READS them back
 * live through `drain`.
 *
 * @remarks
 * Decoupling the write from the read is what lets a producer make progress with nobody
 * pulling: an agent's eager pump writes each {@link AgentChunk} into one, so the run's
 * `result` settles whether or not `events` is ever drained. A waiting `drain` parks on a
 * resolver the next `push` / `close` / `fail` fires, so a value pushed at a parked reader is
 * delivered rather than dropped. Buffered values are always yielded BEFORE the end is
 * reported, so a `close` arriving alongside the last values still delivers them. The FIRST
 * failure wins — a later `close` / `fail` cannot override a recorded error. Event-free.
 *
 * @typeParam T - The value type the channel carries
 */
export interface ChannelInterface<T> {
	/**
	 * Writes one value — buffered, then handed to a parked consumer.
	 *
	 * @param value - The value to enqueue
	 */
	push(value: T): void
	/** Ends the channel normally — a draining consumer returns once the buffer is empty. */
	close(): void
	/**
	 * Ends the channel with a failure — a draining consumer throws it once the buffer is empty.
	 *
	 * @param error - The failure to surface (the first one recorded wins)
	 */
	fail(error: unknown): void
	/**
	 * Reads the values back live, in write order.
	 *
	 * @returns A generator yielding each pushed value, returning on `close` and throwing on `fail`
	 */
	drain(): AsyncGenerator<T, void>
}

/**
 * Pairs a live event stream with the eventual settled result and a cancel — the
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
	 * Cancels the in-flight operation — fires its bound signal.
	 *
	 * @param reason - An optional cancellation reason propagated to the signal
	 */
	abort(reason?: unknown): void
}

/**
 * Names the agent turn's live handle — a {@link StreamInterface} of {@link AgentChunk}s
 * resolving an {@link AgentResult}.
 */
export type AgentStreamInterface = StreamInterface<AgentChunk, AgentResult>

/**
 * Configures `createAgent` — bounds and pacing for the agent loop.
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
 *   (its `consumer` is a token estimator, its `max` the context window) and, when the prompt
 *   reaches the window AND the active conversation is summarizable, COMPACTS the active
 *   conversation + continues on the rebuilt smaller view — compact-and-continue, distinct from
 *   `budget`'s hard abort. Omitted ⇒ no auto-compaction.
 * - `strict` — when `true`, a summarizer failure during AUTOMATIC compaction ABORTS the run
 *   (rethrown after the `fault` event, propagating through `#run` to a genuine `error`
 *   settle) instead of skipping compaction and continuing over-window. Defaults to `false`
 *   (lenient — the prior, byte-for-byte behavior).
 * - `instructions` — an optional pre-built {@link InstructionManagerInterface} forwarded to the
 *   agent's context; an empty one is created when omitted (mirrors {@link AgentContextOptions.instructions}).
 * - `workspaces` — an optional pre-built {@link WorkspaceManagerInterface} forwarded to the
 *   agent's context; a fresh empty one is created when omitted (mirrors {@link AgentContextOptions.workspaces}).
 * - `scope` — an optional initial active {@link ScopeInterface} forwarded to the agent's context
 *   (the build-time filter); `undefined` ⇒ no filtering (mirrors {@link AgentContextOptions.scope}).
 * - `on` — the reserved {@link EmitterHooks} key: initial listeners for the agent's
 *   {@link AgentEventMap}, wired at construction (for example `{ finish: (r) => log(r) }`).
 */
export interface AgentOptions {
	readonly on?: EmitterHooks<AgentEventMap>
	/** Holds the emitter's listener-error handler — a listener throw routes here, not to a domain event. */
	readonly error?: EmitterErrorHandler
	readonly system?: string
	/** Reuses a pre-built tool registry the loop dispatches calls through; an empty one is created when omitted. */
	readonly tools?: ToolManagerInterface
	/** Reuses a pre-built instruction registry forwarded to the agent's context; an empty one is created when omitted. */
	readonly instructions?: InstructionManagerInterface
	/** Reuses a pre-built workspace registry forwarded to the agent's context; a fresh empty one is created when omitted. */
	readonly workspaces?: WorkspaceManagerInterface
	/** Sets the initial active scope forwarded to the agent's context (the build-time filter); `undefined` ⇒ no filtering. */
	readonly scope?: ScopeInterface
	/** Caps the tool-iteration turns before the loop stops; defaults to `DEFAULT_AGENT_LIMIT`. */
	readonly limit?: number
	/** Sets a wall-clock deadline (ms) for the whole turn; its abort commits a partial result. */
	readonly timeout?: number
	/** Bounds the token cost; each provider call's usage is charged and its abort commits a partial. */
	readonly budget?: BudgetInterface<TokenUsage>
	/** Paces the loop — `yield`ed between turns so the host regains control. */
	readonly scheduler?: SchedulerInterface
	/** Carries an external cancel; its abort commits a partial result. */
	readonly signal?: AbortSignal
	/**
	 * Holds an optional policy gate consulted before each tool call runs — a denied call is
	 * fed back to the model as a denial {@link ToolResult} (a `tool` chunk + a tool
	 * message) rather than executed (no tool run, no budget cost), so the model sees the
	 * denial and can react; an allowed call dispatches normally. Omitted ⇒ every call
	 * dispatches as before.
	 */
	readonly authority?: AuthorityInterface
	/**
	 * Holds an optional {@link ConversationManagerInterface} that becomes the agent context's MESSAGE
	 * SOURCE — forwarded to the {@link AgentContextInterface} the agent builds, so
	 * `agent.context.messages` IS its ACTIVE conversation's live tail and `build()` folds that
	 * conversation's `view()` (the per-section summaries + the live tail). Omitted ⇒ a fresh
	 * registry holding one default conversation. With `window` set, AUTOMATIC compaction folds the
	 * ACTIVE conversation between turns (when it is summarizable).
	 */
	readonly conversations?: ConversationManagerInterface
	/**
	 * Holds an optional CONTEXT {@link BudgetInterface} for AUTOMATIC compaction. Its `consumer` is a
	 * token estimator (for example the exported {@link import('./helpers.js').estimateMessages}) and
	 * its `max` is the context window. When set, the loop measures the CURRENT FULL prompt (the
	 * next provider request) against this budget each turn; when that prompt reaches the window AND
	 * the active conversation is summarizable, it **compacts the active conversation + continues on
	 * the rebuilt smaller view** (compact-and-continue) — the same consume-to-a-ceiling primitive
	 * as the cost `budget`, but compaction is the ceiling action instead of abort. Omit to disable.
	 */
	readonly window?: BudgetInterface<readonly Message[]>
	/**
	 * If `true`, a summarizer failure during AUTOMATIC compaction ABORTS the run — the
	 * `fault` event still fires, then the caught error is RETHROWN so the run settles
	 * `error` instead of continuing over-window. Defaults to `false` (lenient — the run
	 * continues over-window, byte-for-byte the prior behavior).
	 */
	readonly strict?: boolean
}

/**
 * Carries the per-run override bag an {@link AgentInterface}'s `generate` / `stream` accepts — each
 * member overrides the matching {@link AgentOptions} value for ONE run.
 *
 * @remarks
 * Every member is optional and resolved independently, so an omitted member leaves the
 * agent's constructed value in force and a caller that passes no options runs exactly the
 * agent it configured. `think` / `schema` ride through to the provider as
 * {@link ProviderStreamOptions}; `limit` / `timeout` / `budget` replace their construction
 * defaults for this run only; `signal` COMPOSES with the constructed `signal` (both fold into
 * the run's bound abort) rather than replacing it. Nothing here mutates the agent — the next
 * run reads the construction defaults again.
 */
export interface AgentRunOptions {
	/**
	 * Sets the per-run reasoning preference forwarded to the provider's `stream` as
	 * {@link ProviderStreamOptions.think} — `true` asks the backend to separate reasoning
	 * (surfaced as `think` {@link AgentChunk}s + the settled `thinking`), `false` suppresses
	 * it. Omitted ⇒ the provider's own default applies (the loop is byte-for-byte the prior
	 * behaviour), so a caller that passes no options runs exactly as before.
	 */
	readonly think?: boolean
	/**
	 * Constrains the response to this JSON-Schema shape, forwarded to the provider's `stream`
	 * as {@link ProviderStreamOptions.schema} — a per-run structured-output request. Omitted ⇒
	 * no constraint (the loop is byte-for-byte the prior behaviour).
	 */
	readonly schema?: Readonly<Record<string, unknown>>
	/**
	 * Overrides {@link AgentOptions.limit} for THIS run only — the max tool-iteration turns
	 * before the loop stops. Omitted ⇒ the agent's constructed `limit` applies.
	 */
	readonly limit?: number
	/**
	 * Overrides {@link AgentOptions.timeout} for THIS run only — a wall-clock deadline (ms)
	 * whose abort commits a partial result. Omitted ⇒ the agent's constructed `timeout` applies.
	 */
	readonly timeout?: number
	/**
	 * Overrides {@link AgentOptions.budget} for THIS run only — a token cost bound whose abort
	 * commits a partial result; `start()`ed for this run exactly as the constructed budget is.
	 * Omitted ⇒ the agent's constructed `budget` applies.
	 */
	readonly budget?: BudgetInterface<TokenUsage>
	/**
	 * Carries an additional per-run external cancel, COMPOSED with {@link AgentOptions.signal} (both
	 * fold into the run's bound abort through `AbortSignal.any` — neither is dropped). Omitted ⇒
	 * only the agent's constructed `signal` (if any) applies.
	 */
	readonly signal?: AbortSignal
}

/**
 * Composes a {@link ProviderInterface}, an {@link AgentContextInterface}, and a
 * {@link ToolManagerInterface} into a bounded context → provider → tools → repeat turn.
 *
 * @remarks
 * - **One loop, two faces.** `generate` and `stream` share ONE private run, so they
 *   can never diverge: `generate` drains the same stream `stream` exposes, then
 *   resolves its settled {@link AgentResult}.
 * - **Bounded.** Each turn arms a single cancel folded from the external `signal`, the
 *   `timeout` deadline, and the `budget` signal (through `AbortSignal.any`); any of them —
 *   or `abort()` — stops the loop and settles the result `partial: true`.
 * - **Paced + capped.** The `scheduler` (when given) yields between turns; tool
 *   iteration is capped at `limit` so the loop always terminates.
 * - **Two observation surfaces.** PULL: the {@link AgentChunk} stream (`stream().events`)
 *   carries per-token answer deltas, per-think reasoning deltas, and usage/tool chunks for a live consumer. PUSH: the
 *   {@link emitter} ({@link AgentEventMap}) carries lifecycle + usage/tool/deny moments
 *   for fire-and-forget observers — the emitter isolates a listener throw and routes it to
 *   its `error` handler (the `error` option), so a buggy observer can NEVER corrupt the
 *   loop. Per-token / per-thinking deltas are the stream's job exclusively; there is no
 *   `token` or `think` event.
 * - **Per-run overrides.** Both faces accept an optional {@link AgentRunOptions} bag whose
 *   members override the construction {@link AgentOptions} for that one run.
 */
export interface AgentInterface {
	readonly emitter: EmitterInterface<AgentEventMap>
	readonly id: string
	readonly status: AgentStatus
	readonly context: AgentContextInterface
	/**
	 * Runs the turn to completion, discarding the live chunks — drains the shared
	 * stream and resolves the settled outcome.
	 *
	 * @remarks
	 * A concurrent run on a shared accounting agent throws an
	 * {@link import('./errors.js').AgentError} (`code: 'CONCURRENCY'`) — and it throws
	 * SYNCHRONOUSLY, before any `Promise` is returned. A fire-and-forget
	 * `agent.generate().catch(...)` therefore will NOT catch it (the throw happens on the call
	 * itself, ahead of the `.catch` ever attaching) — `await` the call (inside a `try`/`catch`)
	 * or wrap the call expression itself in `try`/`catch`.
	 *
	 * @param options - Optional per-run {@link AgentRunOptions} (for example `think`); omitted ⇒ defaults
	 * @returns The settled {@link AgentResult} (`partial: true` when cancelled)
	 * @throws {AgentError} Synchronously, with `code: 'CONCURRENCY'`, for a concurrent run
	 */
	generate(options?: AgentRunOptions): Promise<AgentResult>
	/**
	 * Runs the turn as a live stream — iterate `events` for {@link AgentChunk}s and
	 * `await result` for the settled outcome.
	 *
	 * @remarks
	 * Like `generate()`, a concurrent run on a shared accounting agent throws an
	 * {@link import('./errors.js').AgentError} (`code: 'CONCURRENCY'`) SYNCHRONOUSLY — before the
	 * {@link AgentStreamInterface} handle is even returned, so it cannot be caught by chaining
	 * off the (never-produced) handle; wrap the call itself in `try`/`catch`.
	 *
	 * @param options - Optional per-run {@link AgentRunOptions} (for example `think`); omitted ⇒ defaults
	 * @returns A live {@link AgentStreamInterface} handle (events + result + abort)
	 * @throws {AgentError} Synchronously, with `code: 'CONCURRENCY'`, for a concurrent run
	 */
	stream(options?: AgentRunOptions): AgentStreamInterface
	/**
	 * Cancels the in-flight turn — fires the turn's signal; the `result` settles
	 * `partial: true` with whatever content accumulated.
	 *
	 * @param reason - An optional cancellation reason propagated to the signal
	 */
	abort(reason?: unknown): void
}

/**
 * Carries what an {@link AuthorityInterface} evaluates for one tool call — the call under
 * consideration.
 *
 * @remarks
 * Lean by design: it carries the {@link ToolCall} (the tool `name` and its
 * parsed `arguments`), which is enough for a rule to branch on what is being called
 * and with what.
 */
export interface AuthorityContext {
	readonly call: ToolCall
}

/**
 * Holds an {@link AuthorityInterface}'s verdict on one tool call.
 *
 * @remarks
 * `zone` is a project-defined classification (for example `'default'` / `'sensitive'` /
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
 * Represents one ordered policy rule an {@link AuthorityInterface} evaluates.
 *
 * @remarks
 * The FIRST rule whose `match` returns true decides; if none match, the authority's
 * `fallback` decides. A matched rule ALLOWS by default and DENIES only when its
 * `allowed` is explicitly `false`. `zone` classifies the matched call; `reason` is the
 * optional explanation carried into the {@link AuthorityDecision} (and, on a denial,
 * into the denial {@link ToolResult}).
 */
export interface AuthorityRule {
	readonly match: (context: AuthorityContext) => boolean
	readonly zone: string
	readonly allowed?: boolean
	readonly reason?: string
}

/**
 * Configures `createAuthority` — the ordered rules and the no-match fallback.
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
 * Gates each tool call before it runs — the synchronous policy that turns one
 * {@link AuthorityContext} into an {@link AuthorityDecision}.
 *
 * @remarks
 * Ordered first-match-wins over the configured rules, falling back to the configured
 * default when none match (see {@link AuthorityOptions}). `evaluate` is synchronous and
 * returns the verdict directly. Event-free — no Emitter, no events.
 */
export interface AuthorityInterface {
	/**
	 * Evaluates one tool call against the ordered rules.
	 *
	 * @param context - The call under consideration (see {@link AuthorityContext})
	 * @returns The first matching rule's verdict, or the fallback when none match
	 */
	evaluate(context: AuthorityContext): AuthorityDecision
}

/**
 * Represents a JSON-serializable agent job — the descriptor a durable queue / runner runs. Its
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
	/** Names the registry key of the {@link ProviderInterface} the job runs against. */
	readonly provider: string
	/** Holds the seed conversation added to the rehydrated agent's context (serializable). */
	readonly messages: readonly MessageInput[]
	/** Holds an optional system prompt seeding the agent's context. */
	readonly system?: string
	/** Names the registry keys of the {@link ToolInterface}s loaded into the agent's tool manager. */
	readonly tools?: readonly string[]
	/** Names the registry key of an optional {@link AuthorityInterface} policy gate. */
	readonly authority?: string
	/** Names the registry key of an optional {@link SchedulerInterface} pacing the loop. */
	readonly scheduler?: string
	/** Caps the tool-iteration turns before the loop stops (see {@link AgentOptions.limit}). */
	readonly limit?: number
	/** Sets a wall-clock deadline (ms) for the whole turn (see {@link AgentOptions.timeout}). */
	readonly timeout?: number
	/** Sets a token ceiling rebuilt into a `createTokenBudget({ max })` cost bound. */
	readonly budget?: number
	/**
	 * Lists the sub-agent jobs this job fans out — each a nested {@link AgentJobInput} (so the whole
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
 * - **Accessors throw on a miss.** `provider` / `tool` / `authority` / `scheduler` look one
 *   up by name and THROW an {@link AgentError} carrying `code: 'REGISTRY'` and the message
 *   `unknown <category>: <name>` when the name is unregistered — an unknown name in a
 *   rehydrated job must fail loudly, never silently resolve to `undefined`, so a
 *   misconfigured job surfaces at once rather than running with a missing dependency.
 * - **`build` rehydrates.** It resolves the job's `provider`, assembles a
 *   {@link ToolManagerInterface} from the `tools` names, rebuilds the token `budget`
 *   from its ceiling, resolves the `authority` / `scheduler` names, seeds the agent's
 *   context with the `messages` (and `system`), threads the supplied `signal` into the
 *   agent so a queue / runner cancel propagates, and returns the ready agent.
 * - **Event-free.** A pure resolver — no Emitter, no events.
 */
export interface AgentRegistryInterface {
	/**
	 * Resolves a registered {@link ProviderInterface} by name.
	 *
	 * @param name - The provider's registry key
	 * @returns The live provider
	 * @throws If no provider is registered under `name`
	 */
	provider(name: string): ProviderInterface
	/**
	 * Resolves a registered {@link ToolInterface} by name.
	 *
	 * @param name - The tool's registry key
	 * @returns The live tool
	 * @throws If no tool is registered under `name`
	 */
	tool(name: string): ToolInterface
	/**
	 * Resolves a registered {@link AuthorityInterface} by name.
	 *
	 * @param name - The authority's registry key
	 * @returns The live authority
	 * @throws If no authority is registered under `name`
	 */
	authority(name: string): AuthorityInterface
	/**
	 * Resolves a registered {@link SchedulerInterface} by name.
	 *
	 * @param name - The scheduler's registry key
	 * @returns The live scheduler
	 * @throws If no scheduler is registered under `name`
	 */
	scheduler(name: string): SchedulerInterface
	/**
	 * Rehydrates a live, seeded {@link AgentInterface} from a serializable job — resolving
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
 * Configures `createAgentRegistry` — the named pools of live, non-serializable pieces
 * a {@link AgentJobInput}'s names resolve against.
 *
 * @remarks
 * `providers` is required (a job always names a provider); `tools` / `authorities` /
 * `schedulers` are optional pools, each an entity-keyed record mapping a registry
 * name to its live object. A name absent from its pool throws when resolved (see
 * {@link AgentRegistryInterface}). `store` is the durable {@link ConversationStoreInterface}
 * every agent this registry builds carries: each built agent gets its OWN store-backed
 * {@link ConversationManagerInterface} over THIS shared store — a fresh conversation id per
 * build (minted by the seeded `add`), so concurrent builds never collide, and the store
 * accumulates one snapshot per built agent that later calls `save`. Persistence
 * stays caller-triggered (`open` / `save`) — `build` never hydrates, so `build` stays
 * SYNCHRONOUS. Omitted ⇒ every built agent gets a registry-only manager, byte-identical
 * to today.
 */
export interface AgentRegistryOptions {
	readonly providers: Readonly<Record<string, ProviderInterface>>
	readonly tools?: Readonly<Record<string, ToolInterface>>
	readonly authorities?: Readonly<Record<string, AuthorityInterface>>
	readonly schedulers?: Readonly<Record<string, SchedulerInterface>>
	readonly store?: ConversationStoreInterface
}

/**
 * Configures `createAgentQueue` — the registry that rehydrates jobs, the partial-result
 * policy, and the substrate knobs threaded into the backing `createQueue`.
 *
 * @remarks
 * - `registry` — the {@link AgentRegistryInterface} the handler rehydrates each job
 *   through (required).
 * - `partial` — the partial policy. A partial {@link AgentResult} (a job committed
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
	/** If `true`, a partial `AgentResult` resolves as success; if `false` (the default), it THROWS and retries engage. */
	readonly partial?: boolean
	readonly concurrency?: number
	readonly retries?: number
	readonly timeout?: number
	readonly store?: QueueStoreInterface<AgentJobInput>
}

/**
 * Configures `createAgentRunner` — the registry that rehydrates jobs, the partial-result
 * policy, and the substrate knobs threaded into the backing `createRunner`.
 *
 * @remarks
 * Identical partial policy to {@link AgentQueueOptions} (`partial` — a partial
 * `AgentResult` THROWS by default so the run's fail-fast engages, `true` resolves it as
 * success). `concurrency` / `retries` / `timeout` pass straight to the backing
 * `RunnerInterface` (see `RunnerOptions`). The runner enables sub-agent fan-out: a
 * parent job's handler can `controller.spawn(childJob)` to launch a child agent job
 * through the same bounded queue.
 */
export interface AgentRunnerOptions {
	readonly registry: AgentRegistryInterface
	/** If `true`, a partial `AgentResult` resolves as success; if `false` (the default), it THROWS and fail-fast engages. */
	readonly partial?: boolean
	readonly concurrency?: number
	readonly retries?: number
	readonly timeout?: number
}

/**
 * Summarizes a conversation, provider-agnostically — the seam the agent RUNTIME supplies so
 * core never imports a provider. Given the folded messages, it resolves their digest (the
 * model-written summary), used both to summarize a compacted {@link Section} and
 * to regenerate a {@link ConversationInterface}'s rollup `summary`.
 *
 * @remarks
 * The agent runtime builds one from its `ProviderInterface` (for example
 * `async (messages) => (await provider.generate([systemPrompt, ...messages], signal)).content`)
 * and hands it to a {@link ConversationInterface} / {@link ConversationManagerInterface}.
 * The core conversation layer treats it as an opaque async function — it never reads which
 * backend produced the digest, keeping `core` free of any provider coupling.
 *
 * @param messages - The folded messages to digest into a summary
 * @returns The summary text (the model-written digest of those messages)
 */
export type ConversationSummaryHandler = (messages: readonly Message[]) => Promise<string>

/**
 * Holds a slice of folded messages digested into a summary — the unit of compaction a
 * {@link ConversationInterface} produces when it `compact`s its live tail.
 *
 * @remarks
 * `summary` is the model-written digest of this slice (through the
 * {@link ConversationSummaryHandler}); `messages` are the folded ORIGINALS, RETAINED in full so
 * `rehydrate` can pull them back and `search` can scan them (compaction shrinks the model
 * INPUT, never discards history).
 */
export interface Section {
	readonly id: string
	/** Holds the model-written digest of this slice (its {@link ConversationSummaryHandler} output). */
	readonly summary: string
	/** Retains the folded original messages in full for `rehydrate` / `search`. */
	readonly messages: readonly Message[]
}

/**
 * Maps the push observation surface of a {@link ConversationInterface} — the compaction
 * moments a fire-and-forget observer subscribes to through `conversation.emitter.on`.
 *
 * @remarks
 * `compact` carries the newly-folded {@link Section}; `collapse` carries a section
 * created by folding multiple OLDER sections together (a bounded-`sections` cap enforcement,
 * distinct from `compact`'s fresh live-tail fold); `summary` carries the regenerated
 * conversation rollup (refreshed on each compaction); `rehydrate` carries the `id` of a
 * section whose originals were pulled back. Listener isolation is the emitter's:
 * every event is emitted directly and a listener throw is routed to the emitter's
 * `error` handler (the `error` option), never onto this map, so a buggy observer can never
 * corrupt a compaction. A `type` alias (not `interface extends EventMap`) so the
 * type-literal satisfies `EventMap` structurally.
 */
export type ConversationEventMap = {
	/** Reports a new section folded from the live tail — the created section. */
	readonly compact: readonly [section: Section]
	/** Reports the conversation rollup regenerated — the new summary text. */
	readonly summary: readonly [summary: string]
	/** Reports a section's original messages pulled back — the section's `id`. */
	readonly rehydrate: readonly [id: string]
	/**
	 * Reports the bounded-`sections` cap folding the oldest sections into ONE merged section — the
	 * merged {@link Section} that replaced them.
	 */
	readonly collapse: readonly [section: Section]
}

/**
 * Configures `createConversation` — the optional `id`, the reserved `on` hooks, the
 * provider-agnostic `summarize` seam, and the retained-tail size.
 *
 * @remarks
 * `id` is the conversation's identity (a random UUID when omitted). `on` is the reserved
 * listener key (initial {@link ConversationEventMap} listeners). `summarize` is the
 * {@link ConversationSummaryHandler} compaction needs — ABSENT ⇒ `compact()` throws a
 * {@link import('./errors.js').ConversationError} (a conversation can still store + view a
 * live tail; it cannot fold). `keep` is how many recent live messages a `compact()`
 * retains VERBATIM (folding only the older ones); it defaults to
 * {@link import('./constants.js').DEFAULT_CONVERSATION_KEEP} (`0` — a manual `compact()`
 * folds the WHOLE current live tail into one section). `sections` is an optional cap on the
 * compacted `sections` list — when set (`>= 1`), a `compact()` that would leave more than
 * `sections` sections FOLDS the oldest overflow into ONE merged section so the list never
 * exceeds `sections`, emitting `collapse`; omitted ⇒ unlimited (the prior behavior).
 * `snapshot` is the HYDRATION seam — a {@link ConversationSnapshot} whose `id`, rollup
 * `summary`, compacted `sections`, and live tail are RESTORED into the new conversation, with
 * the live `summarize` / `keep` / `on` supplied alongside it (a summarizer is a function, not
 * serialized data). Restoring is SILENT (no events — nothing was edited), and a `snapshot.id`
 * WINS over `id` (the snapshot IS the conversation's identity). It is what lets
 * `createConversation` hydrate, and what a {@link ConversationManagerInterface.open} reads a
 * stored snapshot back through.
 */
export interface ConversationOptions {
	readonly id?: string
	readonly on?: EmitterHooks<ConversationEventMap>
	/** Holds the emitter's listener-error handler — a listener throw routes here, not to a domain event. */
	readonly error?: EmitterErrorHandler
	/** Supplies the summarizer compaction needs; ABSENT ⇒ `compact()` throws a `ConversationError`. */
	readonly summarize?: ConversationSummaryHandler
	/** Keeps this many recent live messages verbatim on `compact`; defaults to `DEFAULT_CONVERSATION_KEEP` (`0`). */
	readonly keep?: number
	/** Caps the compacted `sections` list (`>= 1`); overflow folds into one merged section. Omitted ⇒ unlimited. */
	readonly sections?: number
	/** Hydrates from a {@link ConversationSnapshot} — its `id` wins over `id`; restoring is silent. */
	readonly snapshot?: ConversationSnapshot
}

/**
 * Configures one {@link ConversationInterface.compact} call — overrides for ONE fold.
 *
 * @remarks
 * `keep` overrides the conversation's configured retained-tail size for THIS compaction only
 * (the older `count - keep` live messages fold; when `count <= keep` nothing folds and
 * `compact()` is a no-op returning `undefined`). Omitted ⇒ the conversation's own `keep`
 * (its option, or `DEFAULT_CONVERSATION_KEEP`) applies. `sections` overrides the conversation's
 * configured `sections` cap for THIS compaction only — after the new section is pushed, an
 * overflow past `sections` folds the oldest sections into one merged section. Omitted ⇒ the
 * conversation's own `sections` cap (or unlimited) applies.
 */
export interface CompactOptions {
	/** Overrides the retained-tail size for this compaction; omitted ⇒ the conversation's own `keep`. */
	readonly keep?: number
	/** Overrides the `sections` cap for this compaction; omitted ⇒ the conversation's own cap (or unlimited). */
	readonly sections?: number
}

/**
 * Configures {@link ConversationInterface.reference} — how to render ONE conversation as a
 * self-labeled, fenced PROVENANCE block to pull INTO another conversation (by writing it to
 * the active context's active workspace).
 *
 * @remarks
 * The rendered block is a cross-conversation reference a SMALL model must read as foreign
 * material, NOT as part of the live thread — so every member keeps it CONCISE and unmistakably
 * attributed:
 * - `label` — the human PROVENANCE name shown in the block's leading marker (for example `'planning'`);
 *   defaults to the conversation's own `id`. It is what the model attributes the content to.
 * - `summary` — whether to include the conversation's rollup `summary` (its summary-of-summaries)
 *   in the block; defaults to `true` (the rollup is included WHEN one exists — `undefined` until
 *   the first compaction omits the `Summary:` line). Pass `false` to exclude it.
 * - `messages` — the CHERRY-PICKED excerpts to include (each rendered `role: content`), default
 *   NONE. The intended source is the conversation's OWN `search(query)` / `rehydrate(id)` output
 *   (select the few relevant turns), NOT its whole history — dumping every message defeats the
 *   point (it re-bloats the destination context a small model then has to wade through).
 */
export interface ConversationReferenceOptions {
	/** Names the human provenance label in the block's marker; defaults to the conversation's `id`. */
	readonly label?: string
	/** Includes the conversation's rollup `summary` (when one exists); defaults to `true`. */
	readonly summary?: boolean
	/** Lists the cherry-picked excerpts to include (`role: content`); defaults to none. */
	readonly messages?: readonly Message[]
}

/**
 * Groups messages ABOVE the flat {@link MessageManagerInterface} — a live
 * uncompacted tail plus compacted, summarized {@link Section}s and a conversation
 * rollup `summary`, with on-demand `rehydrate` and substring `search`, driven by a
 * provider-agnostic {@link ConversationSummaryHandler} seam.
 *
 * @remarks
 * - **Live tail + sections.** The conversation OWNS its LIVE uncompacted tail DIRECTLY — a
 *   caller appends turns through its own message verbs (`add` mints each `id`, `message` /
 *   `messages` look up, `remove` / `clear` drop, `count` tallies), exactly as a `Workspace`
 *   owns its files (no separate per-value manager). `sections` are the compacted history
 *   (oldest → newest), each a summarized slice that RETAINS its originals. `summary` is the
 *   conversation rollup (a summary-of-summaries over all sections), regenerated on each
 *   compaction (`undefined` until the first compaction).
 * - **Message verbs (the inlined store).** `add` takes one {@link MessageInput} or a batch,
 *   MINTS each message's `id` (a random UUID), stores it, and returns the created
 *   message(s); a stored message is immutable. `message(id)` resolves one (`undefined` when
 *   absent); `messages()` lists the live tail in insertion order; `remove` drops one by id or
 *   a batch (`true` only when EVERY supplied id was removed); `clear` empties the tail;
 *   `count` is how many live messages are stored.
 * - **`view()` — the model input.** Each section folds to ONE synthetic summary message,
 *   followed by the live messages verbatim: `[...sections-as-summary-messages, ...live]`. The
 *   rollup `summary` is NOT injected (it is a separately pull-able digest for a
 *   cross-conversation case); `view()` carries the per-section summaries, which ARE the
 *   compaction benefit.
 * - **`compact()` — fold older live → a section.** Folds the oldest `count - keep` live
 *   messages into a new {@link Section} (its `summary` from `summarize`), removes
 *   them from the live tail, REGENERATES the rollup (a second `summarize` over all section
 *   summaries), and emits `summary` then `compact` — returning the new section (or
 *   `undefined` when nothing folds). TWO summarizer calls per compaction (the section digest
 *   + the rollup). Throws a {@link import('./errors.js').ConversationError} when no
 *   `summarize` was supplied.
 * - **`summarizable` — whether a `compact()` CAN fold.** `true` when a
 *   {@link ConversationSummaryHandler} was supplied, `false` otherwise. The agent loop's AUTOMATIC
 *   compaction (`AgentOptions.window`) gates on it so a conversation that has no summarizer is
 *   never auto-compacted (and the loop never throws the `compact()` `SUMMARIZER` error from the
 *   auto path). A MANUAL `compact()` still throws without a summarizer — only the auto path is
 *   guarded.
 * - **`rehydrate(id)` / `search(query)` — read the retained originals.** `rehydrate` returns
 *   a section's full original messages (`[]` for an unknown id) and emits `rehydrate` — a
 *   pure READ (the caller decides whether to re-add them; `rehydrate` never reinserts).
 *   `search` is a case-insensitive substring scan of `content` across ALL messages (every
 *   section's originals + the live tail).
 * - **`reference(options?)` — pull THIS conversation into ANOTHER with provenance.** A PURE
 *   string render (no model call) of a self-labeled, fenced cross-conversation block — the
 *   rollup `summary` (when included + present) plus cherry-picked excerpts — framed so a small
 *   model reads it as FOREIGN material. Written into the ACTIVE conversation's context through
 *   the active workspace (`context.workspaces.active?.write(path, block)`); the cherry-pick
 *   comes from this conversation's own `search` / `rehydrate`, never its whole history.
 * - **Observable.** The owned `emitter` ({@link ConversationEventMap}) carries
 *   `compact` / `summary` / `rehydrate`; the emitter isolates a listener throw and routes it
 *   to its `error` handler (the `error` option).
 */
export interface ConversationInterface {
	readonly id: string
	readonly emitter: EmitterInterface<ConversationEventMap>
	/** Holds the conversation rollup (a summary-of-summaries), regenerated on each compaction; `undefined` until the first. */
	readonly summary: string | undefined
	/** Lists the compacted history, oldest → newest. */
	readonly sections: readonly Section[]
	/**
	 * Reports whether a `compact()` CAN fold — `true` when a {@link ConversationSummaryHandler} was supplied.
	 * The agent loop's AUTOMATIC compaction (`AgentOptions.window`) gates on it (a non-summarizable
	 * conversation is never auto-compacted, so the auto path never throws the `SUMMARIZER` error);
	 * a MANUAL `compact()` still throws without a summarizer.
	 */
	readonly summarizable: boolean
	/** Counts the LIVE (uncompacted) messages stored in the tail. */
	readonly count: number
	/**
	 * Appends one message to the live tail (or a batch) — MINTS each message's `id`
	 * (a random UUID) and returns the created message(s); a stored message is immutable.
	 *
	 * @param input - One {@link MessageInput}, or a batch
	 * @returns The created {@link Message}(s), with their minted `id`s
	 */
	add(input: MessageInput): Message
	add(inputs: readonly MessageInput[]): readonly Message[]
	/**
	 * Looks up one LIVE message by id.
	 *
	 * @param id - The message id to resolve
	 * @returns The {@link Message}, or `undefined` when absent
	 */
	message(id: string): Message | undefined
	/**
	 * Lists every LIVE (uncompacted) message in the tail, in insertion order.
	 *
	 * @returns The live tail, in insertion order
	 */
	messages(): readonly Message[]
	/**
	 * Removes one LIVE message by id (or a batch) from the tail.
	 *
	 * @param id - One message id, or a batch
	 * @returns True when every supplied id was present and removed; false otherwise
	 */
	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	/** Empties the live tail (the compacted `sections` are untouched). */
	clear(): void
	/**
	 * Builds the model input for the next turn — each section as ONE synthetic summary message,
	 * then the live messages verbatim (the rollup `summary` is NOT injected).
	 *
	 * @returns `[...sections-as-summary-messages, ...live messages]`
	 */
	view(): readonly Message[]
	/**
	 * Folds the older live messages into a summarized {@link Section}, regenerates the
	 * rollup, and emits `summary` then `compact`.
	 *
	 * @remarks
	 * Folds the oldest `count - keep` live messages (`keep` from `options`, else the
	 * conversation's own); when `count <= keep` NOTHING folds and this is a no-op resolving
	 * `undefined`. Otherwise it summarizes the slice into the section, removes those messages
	 * from the live tail, regenerates the rollup (a second `summarize` over all sections), and
	 * resolves the new section. Requires a {@link ConversationSummaryHandler} — THROWS a
	 * {@link import('./errors.js').ConversationError} when none was supplied.
	 *
	 * @remarks
	 * When a `sections` cap is set and the fold pushes the section count over it, an overflow
	 * merge step folds the oldest sections into one — if THAT merge's `summarize` call throws,
	 * the merge is skipped (sections transiently sit at `cap + 1`, no loss) but the rollup still
	 * regenerates over the current unmerged sections (never left stale) before the error
	 * propagates; the next successful `compact()` self-heals the section count back to `cap`.
	 *
	 * @param options - Optional {@link CompactOptions} (`keep` overrides the retained-tail size)
	 * @returns The new {@link Section}, or `undefined` when nothing folded
	 */
	compact(options?: CompactOptions): Promise<Section | undefined>
	/**
	 * Returns a section's full original messages — a pure READ that emits `rehydrate`.
	 *
	 * @param id - The {@link Section} `id` to pull back
	 * @returns The section's retained original messages (empty when no such section)
	 */
	rehydrate(id: string): readonly Message[]
	/**
	 * Searches `content` for a case-insensitive substring across ALL messages — every section's
	 * retained originals plus the live tail.
	 *
	 * @param query - The substring to match (case-insensitive)
	 * @returns The matching messages, sections' originals first then the live tail
	 */
	search(query: string): readonly Message[]
	/**
	 * Renders THIS conversation as a self-labeled, fenced PROVENANCE block to pull INTO another
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
	 * Serializes this conversation to a plain, JSON-serializable {@link ConversationSnapshot} — its
	 * `id`, the rollup `summary`, the compacted `sections`, and the live tail (its `messages()`).
	 *
	 * @remarks
	 * The container serializes ITSELF (`{ id, summary, sections, messages: this.messages() }`) — the
	 * {@link ConversationStoreInterface} persistence seam's payload, the exact analogue of
	 * {@link import('@orkestrel/workspace').WorkspaceInterface}'s `snapshot`. The summarizer /
	 * `keep` are NOT serialized — they are live
	 * CONFIG re-supplied on hydrate (a `ConversationSummaryHandler` is a function, not data). The snapshot
	 * is the durable analogue of the `snapshot` option: a {@link ConversationManagerInterface}
	 * HYDRATES a conversation from it through that seam (see {@link ConversationManagerInterface.open}).
	 * Pure — the sections + messages are already plain immutable records (so the snapshot
	 * `structuredClone`s / JSON-round-trips losslessly), and snapshotting mutates nothing.
	 *
	 * @returns The {@link ConversationSnapshot} (`{ id, summary?, sections, messages }`)
	 */
	snapshot(): ConversationSnapshot
}

/**
 * Holds a JSON-serializable snapshot of a conversation's state — its `id`, the rollup `summary`, the
 * compacted `sections`, and the live tail `messages` — the durable payload the
 * {@link ConversationStoreInterface} persists. The exact analogue of
 * {@link import('@orkestrel/workspace').WorkspaceSnapshot}.
 *
 * @remarks
 * Pure JSON DATA (no class instances, no functions): each {@link Section} and
 * {@link Message} is already a PLAIN record that `structuredClone`s / JSON-round-trips
 * losslessly. The snapshot carries the rollup `summary` (a summary-of-summaries; `undefined` until
 * the first compaction), the compacted `sections` (each RETAINING its folded originals), and the
 * live uncompacted tail `messages` — but NOT the `summarize` / `keep`, which are live CONFIG
 * re-supplied on hydrate (a summarizer is a function, not serializable data). The snapshot the
 * container produces from itself ({@link ConversationInterface.snapshot}); the durable analogue of
 * the {@link ConversationOptions.snapshot} hydration seam. A {@link ConversationManagerInterface}
 * hydrates a conversation from it through that seam (see {@link ConversationManagerInterface.open}). It is narrowed back from an
 * untrusted storage read by {@link import('./validators.js').isConversationSnapshot} (the total
 * boundary guard).
 */
export interface ConversationSnapshot {
	readonly id: string
	/** Holds the rollup (a summary-of-summaries); `undefined` until the first compaction. */
	readonly summary?: string
	/** Lists the compacted history, oldest → newest (each section RETAINS its folded originals). */
	readonly sections: readonly Section[]
	/** Lists the live uncompacted tail, in insertion order. */
	readonly messages: readonly Message[]
}

/**
 * Persists a {@link ConversationSnapshot} durably — three async primitives
 * (`get` / `set` / `delete`) keyed by a conversation id, the exact analogue of
 * {@link import('@orkestrel/workspace').WorkspaceStoreInterface}.
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
 * through the {@link ConversationOptions.snapshot} seam (re-supplying the live `summarize` / `keep`; see
 * {@link ConversationManagerInterface.open} / {@link ConversationManagerInterface.save}).
 *
 * Every primitive is async (a `Promise`), so a durable backend (a database round-trip) fits the
 * same shape as the memory one. The snapshot carries its OWN id, so `set` takes no separate id
 * param (mirroring
 * {@link import('@orkestrel/workspace').WorkspaceStoreInterface}'s `set`). UNLIKE a session store
 * there is NO idle-TTL
 * / eviction — a persisted conversation lives until an explicit `delete`. It is concrete over
 * {@link ConversationSnapshot} — no generic parameter, because the
 * snapshot is the ONE payload a conversation store persists.
 */
export interface ConversationStoreInterface {
	/**
	 * Resolves the persisted snapshot for `id`, or `undefined` if none is stored.
	 *
	 * @param id - The conversation id to resolve (a {@link ConversationSnapshot.id})
	 * @returns The persisted snapshot, or `undefined` if absent
	 */
	get(id: string): Promise<ConversationSnapshot | undefined>
	/**
	 * Inserts or replaces a snapshot under its own `snapshot.id` (no separate id param —
	 * mirroring {@link import('@orkestrel/workspace').WorkspaceStoreInterface}'s `set`).
	 *
	 * @param snapshot - The snapshot to store (keyed by its `id`)
	 */
	set(snapshot: ConversationSnapshot): Promise<void>
	/**
	 * Drops a snapshot by id; an absent id is a no-op (no throw).
	 *
	 * @param id - The conversation id to drop
	 */
	delete(id: string): Promise<void>
}

/**
 * Represents one row of the table a
 * {@link import('./conversations/stores/DatabaseConversationStore.js').DatabaseConversationStore}
 * persists — a conversation `id` plus its {@link ConversationSnapshot} held as ONE OPAQUE JSON
 * column. The exact analogue of {@link import('@orkestrel/workspace').WorkspaceSnapshotRow}.
 *
 * @remarks
 * The Database twin of {@link ConversationStoreInterface} stores the snapshot whole (the `snapshot`
 * column is a `rawShape`, an opaque JSON blob — exactly as
 * {@link import('@orkestrel/workspace').WorkspaceSnapshotRow} stores a workspace snapshot), so the
 * row type stays FLAT and the sections/messages snapshot shape never
 * forces the contract to `Infer` it. The column therefore reads back as the broad `unknown`; the
 * store narrows it to a {@link ConversationSnapshot} on `get`
 * ({@link import('./validators.js').isConversationSnapshot}, the total boundary guard). `id`
 * mirrors {@link ConversationSnapshot.id} (the primary key), so a `set` writes
 * `{ id: snapshot.id, snapshot }`.
 */
export interface ConversationSnapshotRow {
	readonly id: string
	/** Holds the whole {@link ConversationSnapshot} as one opaque JSON blob — read back as `unknown`, narrowed on `get`. */
	readonly snapshot: unknown
}

/**
 * Carries the data to author a {@link ConversationInterface} through a
 * {@link ConversationManagerInterface} — the optional `id`, a `summarize` override, a `keep`
 * override, and the reserved `on` hooks.
 *
 * @remarks
 * `id` is the conversation's identity (minted when omitted). `summarize` OVERRIDES the
 * manager's default {@link ConversationSummaryHandler} for this conversation (omitted ⇒ the
 * manager's default flows in). `keep` overrides the manager's default retained-tail size.
 * `sections` overrides the manager's default `sections` cap. `on` is the reserved listener key
 * (initial {@link ConversationEventMap} listeners). `snapshot` is
 * the construction-time hydration seam — a {@link ConversationSnapshot} whose `id` / `summary` /
 * `sections` / live tail are RESTORED into the new conversation (the live `summarize` / `keep` /
 * `on` re-supplied alongside it), the conversation analogue of
 * {@link import('@orkestrel/workspace').WorkspaceOptions}'s `seed`, carried onto
 * {@link ConversationOptions.snapshot}, that a
 * {@link ConversationManagerInterface.open} reads a stored snapshot back through; hydration is
 * silent (no events). When both `snapshot.id` and `id` are given, `snapshot.id` wins (the snapshot
 * IS the conversation's identity).
 */
export interface ConversationInput {
	readonly id?: string
	/** Overrides the manager's default summarizer for this conversation. */
	readonly summarize?: ConversationSummaryHandler
	/** Overrides the manager's default retained-tail size for this conversation. */
	readonly keep?: number
	/** Overrides the manager's default `sections` cap for this conversation. */
	readonly sections?: number
	readonly on?: EmitterHooks<ConversationEventMap>
	/** Hydrates from a {@link ConversationSnapshot}, passed on as {@link ConversationOptions.snapshot}. */
	readonly snapshot?: ConversationSnapshot
}

/**
 * Configures `createConversationManager` — the default {@link ConversationSummaryHandler} and
 * retained-tail size the conversations it creates inherit.
 *
 * @remarks
 * `summarize` is the default summarizer flowed into every conversation the manager `add`s
 * (a per-`add` {@link ConversationInput.summarize} overrides it); a conversation created
 * with neither cannot `compact` (it throws a `ConversationError`). `keep` is the default
 * retained-tail size (a per-`add` {@link ConversationInput.keep} overrides it), defaulting
 * to {@link import('./constants.js').DEFAULT_CONVERSATION_KEEP}. `sections` is the default cap
 * on a created conversation's compacted `sections` list (a per-`add` {@link ConversationInput.sections}
 * overrides it); omitted ⇒ unlimited.
 */
export interface ConversationManagerOptions {
	/** Supplies the default summarizer for conversations this manager creates (a per-`add` override wins). */
	readonly summarize?: ConversationSummaryHandler
	/** Sets the default retained-tail size (a per-`add` override wins); defaults to `DEFAULT_CONVERSATION_KEEP`. */
	readonly keep?: number
	/** Sets the default `sections` cap for conversations this manager creates (a per-`add` override wins); omitted ⇒ unlimited. */
	readonly sections?: number
	/**
	 * Holds the optional durable {@link ConversationStoreInterface} backing
	 * {@link ConversationManagerInterface.open} / {@link ConversationManagerInterface.save} — a memory
	 * / JSON / SQLite / IndexedDB store a conversation is HYDRATED from (`open` a registry-miss) and
	 * PERSISTED to (`save`). Omitted ⇒ the manager is registry-only: `open` resolves only what is
	 * already registered, and `save` is a no-op (`false`). The exact analogue of
	 * {@link import('@orkestrel/workspace').WorkspaceManagerOptions}'s `store`.
	 */
	readonly store?: ConversationStoreInterface
}

/**
 * Registers {@link ConversationInterface}s keyed by their `id`, in insertion order, WITH an
 * active pointer — the id-keyed store over the conversation layer PLUS the `active` / `switch` seam the
 * {@link AgentContextInterface} renders. Event-free (a registry, like
 * {@link import('@orkestrel/workspace').WorkspaceManagerInterface}); the observability lives on each
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
 * - **Removal.** `remove` drops one by id, or a batch (array overload FIRST) — `true`
 *   only when EVERY supplied id was removed; removing the ACTIVE conversation sets `active` to `undefined`. `clear`
 *   empties the registry and sets `active` to `undefined`.
 * - **Durable open / save (the optional `store` seam).** When a {@link ConversationStoreInterface}
 *   is supplied (the `store` option), `open(id)` HYDRATES a conversation from the store on a registry
 *   miss (rebuilding it through the `snapshot` option, flowing the manager's
 *   default `summarize` / `keep` in) and `save(id)` PERSISTS a registered conversation's
 *   {@link ConversationInterface.snapshot}. Both are LENIENT without a store — `open` resolves only
 *   registered ids, `save` is a no-op (`false`) — consistent with the lenient `switch`. It mirrors
 *   the workspace package manager's `open` / `save` seam.
 * - **Event-free.** A purely registry store — no Emitter, no events (each conversation owns
 *   its own).
 */
export interface ConversationManagerInterface {
	readonly count: number
	/** Holds the active conversation — the agent's message source the context renders; `undefined` until the first `add`. */
	readonly active: ConversationInterface | undefined
	conversation(id: string): ConversationInterface | undefined
	conversations(): readonly ConversationInterface[]
	add(input?: ConversationInput): ConversationInterface
	switch(id: string): ConversationInterface | undefined
	/**
	 * Resolves a conversation by id, ACTIVATING it — from the registry if present, else HYDRATED from
	 * the optional {@link ConversationStoreInterface} (`store`).
	 *
	 * @remarks
	 * - If `id` is ALREADY registered, it is ACTIVATED (`switch`ed to) and returned — no store hit.
	 * - Else if a `store` is set, `store.get(id)` is awaited; on a HIT the snapshot is rehydrated
	 *   into a fresh {@link ConversationInterface} through the `snapshot` option
	 *   (`add({ snapshot, ... })`, flowing the manager's default `summarize` / `keep` in), which
	 *   registers AND activates it, and it is returned.
	 * - Else (no store, or a store MISS) ⇒ `undefined` (lenient — no throw).
	 *
	 * @param id - The conversation id to open
	 * @returns The activated {@link ConversationInterface}, or `undefined` when neither registered nor stored
	 */
	open(id: string): Promise<ConversationInterface | undefined>
	/**
	 * Persists a REGISTERED conversation's {@link ConversationInterface.snapshot} to the optional
	 * {@link ConversationStoreInterface} (`store`).
	 *
	 * @remarks
	 * Lenient: when a `store` is set AND `id` is registered, `store.set(conversation.snapshot())` is
	 * awaited and `true` is returned; otherwise (no store, OR an unknown id) it is a NO-OP returning
	 * `false` — never a throw, consistent with the lenient `switch`.
	 *
	 * @param id - The id of the registered conversation to persist
	 * @returns True if the snapshot was persisted; false otherwise (no store, or an unknown id)
	 */
	save(id: string): Promise<boolean>
	remove(ids: readonly string[]): boolean
	remove(id: string): boolean
	clear(): void
}
