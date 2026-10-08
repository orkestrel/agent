import type {
	ConversationInterface,
	ConversationManagerInterface,
	MessageManagerInterface,
} from '../conversations/index.js'
import type { Message } from '../types.js'
import type { TokenUsage } from '@orkestrel/budget'
import type { EmitterErrorHandler, EmitterHooks, EmitterInterface } from '@orkestrel/emitter'
import type { ToolManagerInterface } from '@orkestrel/tool'
import type { WorkspaceManagerInterface } from '@orkestrel/workspace'

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
	 * most-specific level of the {@link import('./AgentContext.js').AgentContext} build
	 * cascade, beating every format level for this item. Present only when supplied on the
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
	 * Holds a fully-rendered override of this instruction's prompt text — the most-specific
	 * level of the {@link import('./AgentContext.js').AgentContext} build cascade (beats the
	 * manager-options format and the built-in rendering for this item). Round-tripped onto the
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
 * manager-options level of the {@link import('./AgentContext.js').AgentContext} build
 * cascade — a {@link ContextSectionFormat} the manager consults in its own `open` /
 * `render` / `close` (falling back to the built-in when a member is omitted), so it beats
 * the built-in, while a per-item {@link InstructionInput.override} still beats it.
 * Omitted ⇒ the built-in framing applies.
 */
export interface InstructionManagerOptions {
	readonly on?: EmitterHooks<InstructionManagerEventMap>
	/** Holds the emitter's listener-error handler — a listener throw routes here, not to a domain event. */
	readonly error?: EmitterErrorHandler
	/** Holds a manager-level format override that beats the built-in; see {@link AgentContextInterface.build}. */
	readonly format?: ContextSectionFormat<InstructionInterface>
}

/**
 * Registers {@link InstructionInterface}s keyed by `name` — `add` (one or a batch) mints each `id`
 * and overwrites a same-name instruction, last write wins, while `instructions()` lists them sorted
 * by descending `priority` and stable for ties.
 *
 * @remarks
 * - **Build contract.** `open` is the section header a richer context renders
 *   the instructions under, `render(instruction)` renders one instruction, and `close` is
 *   the trailing line after them, each resolved through the item override, the
 *   manager-options `format`, and the built-in. Together they let an
 *   {@link import('./AgentContext.js').AgentContext} assemble an instructions block.
 * - **Observable.** The owned `emitter` ({@link InstructionManagerEventMap})
 *   carries `add` / `remove` / `clear` for fire-and-forget observers; the emitter
 *   isolates a listener throw and routes it to its `error` handler (the `error` option).
 */
export interface InstructionManagerInterface {
	readonly emitter: EmitterInterface<InstructionManagerEventMap>
	readonly count: number
	/**
	 * Names the section header a context renders the instructions under — the manager-options
	 * `open`, else the built-in `'## Instructions'`.
	 */
	readonly open: string
	/**
	 * Holds the line a context renders after the instructions — the manager-options `close`, or
	 * `undefined` when none, because there is no built-in close and so no closing line.
	 */
	readonly close: string | undefined
	/**
	 * Adds one {@link InstructionInput}, or a batch — mints each `id`; a re-`add` of the same
	 * name overwrites it, last write wins.
	 */
	add(input: InstructionInput): InstructionInterface
	add(inputs: readonly InstructionInput[]): readonly InstructionInterface[]
	/** Looks up one instruction by name (`undefined` when absent). */
	instruction(name: string): InstructionInterface | undefined
	/** Lists every instruction, sorted by descending `priority` (stable for equal priorities). */
	instructions(): readonly InstructionInterface[]
	/**
	 * Renders one instruction for the prompt — its `override`, else the manager-options
	 * `render`, else its `content`.
	 */
	render(instruction: InstructionInterface): string
	/**
	 * Removes one instruction by name, or a batch — `true` only when every supplied name was
	 * removed.
	 */
	remove(name: string): boolean
	remove(names: readonly string[]): boolean
	/** Removes every instruction. */
	clear(): void
}

/**
 * Overrides one context section's format — an `open` / `render` / `close` trio
 * that frames a section in the {@link import('./AgentContext.js').AgentContext} build
 * cascade: a top line rendered once before the items, a per-item rendering, and a bottom
 * line rendered once after the items.
 *
 * @remarks
 * `open`, `render`, and `close` are optional and resolved independently (so an override may set only
 * the top, only the per-item rendering, only the bottom, or any mix). A section assembles
 * as `[open, ...items.map(render), close]` with empty / absent slots dropped, the survivors
 * blank-line (`\n\n`) joined — so `open` + `close` together let a developer wrap the whole
 * group (for example `open: '<instructions>'` … `close: '</instructions>'`). `open` is the
 * section's leading text (the header, or a group's opening tag); `render` turns one section
 * item (an {@link InstructionInterface}) into its prompt text; `close` is the trailing text.
 * `open` and `render` cascade through the
 * built-in floor (`open` ⇒ the manager's built-in header, `render` ⇒ the manager's built-in
 * rendering); `close` has no built-in, so an unset `close` yields no closing line.
 * It is the unit a manager's `Options` carry — see {@link AgentContextInterface.build} for
 * the full precedence.
 *
 * @typeParam T - The section item the `render` override formats
 */
export interface ContextSectionFormat<T> {
	/**
	 * Holds text rendered once before the section's items — the section header or a group's
	 * opening wrapper, for example `'<instructions>'`; omitted ⇒ the next cascade level decides
	 * (defaulting to the built-in header).
	 */
	readonly open?: string
	/** Overrides one item's rendering; omitted ⇒ the next cascade level decides. */
	readonly render?: (item: T) => string
	/**
	 * Holds text rendered once after the section's items — a group's closing wrapper, for
	 * example `'</instructions>'`; omitted ⇒ no closing line (there is no built-in close).
	 */
	readonly close?: string
}

/**
 * Lists the per-category allow-lists a {@link ScopeInterface} carries — an optional `readonly
 * string[]` for `instructions`, for `tools`, and for `files`, each keyed by that category's
 * identity (an instruction's `name`, a tool's `name`, a workspace file's `path`) and read as an
 * allow-list: `undefined` lets everything pass, `[]` lets nothing pass, and a non-empty list passes
 * the listed keys alone.
 *
 * @remarks
 * Each list is three-way (see {@link import('../helpers.js').filterAllowList}): `undefined`
 * ⇒ no constraint on that category (all pass); `[]` ⇒ none pass; a non-empty list ⇒ only
 * the listed keys pass. It is the shape both a {@link ScopeInput} and `Scope.narrow`
 * accept (a `name`-less narrowing config). `files` filters the active workspace's rendered
 * files (by `path`) in {@link AgentContextInterface.build} — both the text files folded into
 * the system block and the image files attached to the last user message.
 */
export interface ScopeFilter {
	/** Lists the allowed instruction `name`s (`undefined` ⇒ all, `[]` ⇒ none, else only-listed). */
	readonly instructions?: readonly string[]
	/**
	 * Lists the allowed tool `name`s (`undefined` ⇒ all, `[]` ⇒ none, else only-listed).
	 * The loop advertises and dispatches only admitted tools, checking scope before authority.
	 * If no definition is advertised, the reply ends the run without dispatching its calls.
	 */
	readonly tools?: readonly string[]
	/**
	 * Lists the allowed active-workspace file `path`s (`undefined` ⇒ all, `[]` ⇒ none, else only-listed) —
	 * the filter {@link AgentContextInterface.build} applies to the active workspace's
	 * {@link import('@orkestrel/workspace').WorkspaceInterface.files} before rendering them (text → the system block, image →
	 * the last user message).
	 */
	readonly files?: readonly string[]
}

/**
 * Carries the conversation part of the next prompt and the receipt for it.
 *
 * @remarks
 * A {@link SelectionHandler} returns one per select site, and
 * {@link AgentContextInterface.build} folds its `messages` in place of the active conversation's
 * `view()`. It carries no tool member: what a turn advertises and dispatches stays the scope's
 * `tools` allow-list. What the selection omitted is `view()` minus `messages`; no second list is
 * stored.
 */
export interface Selection {
	/** Lists the messages `build` folds in place of `view()`, in prompt order. */
	readonly messages: readonly Message[]
	/** Lists the keys of the judgments the selection rests on, reused or recorded. */
	readonly judgments: readonly string[]
	/** Holds the judge usage this selection spent, on success and on failure alike. */
	readonly usage?: TokenUsage
	/** Holds the error a handler gave up on; `messages` is then `view()`. */
	readonly fault?: Error
}

/**
 * Chooses the conversation messages the next prompt carries for one user request.
 *
 * @remarks
 * Receives the active conversation, the user message the run serves (passed by the loop, because
 * a compaction can fold it into a section), and the run's abort signal. A handler that spent judge
 * calls before giving up returns a {@link Selection} with `fault` set, `messages` as `view()`, and
 * the usage spent, rather than throwing.
 */
export type SelectionHandler = (
	conversation: ConversationInterface,
	request: Message,
	signal: AbortSignal,
) => Promise<Selection>

/**
 * Carries the data to author a {@link ScopeInterface} — a {@link ScopeFilter} plus the
 * required `name` (a human label; the `id` is minted by the layer that stores it).
 */
export interface ScopeInput extends ScopeFilter {
	readonly name: string
	/** Holds the selection handler that overrides the agent default while this scope is active. */
	readonly select?: SelectionHandler
	/** Describes the mode this scope stands for; `build()` never reads it. */
	readonly description?: string
}

/**
 * Represents a named, immutable filter over a richer context's items — the per-category allow-lists
 * ({@link ScopeFilter}) plus an `id` / `name`, and a `narrow` that composes a tighter child by set
 * intersection.
 *
 * @remarks
 * Each list is three-way (`undefined` ⇒ all, `[]` ⇒ none, else only-listed). `narrow`
 * returns a new scope whose per-category visible set is the intersection of this scope's
 * list and the config's — with `undefined` treated as the universal set (no constraint),
 * so `undefined ∩ list = list` and `undefined ∩ undefined = undefined`. Narrowing can
 * only tighten (a parent-excluded key never returns); the scope itself is never mutated.
 */
export interface ScopeInterface extends ScopeFilter {
	readonly id: string
	readonly name: string
	/** Holds the selection handler that overrides the agent default while this scope is active. */
	readonly select?: SelectionHandler
	/** Describes the mode this scope stands for; `build()` never reads it. */
	readonly description?: string
	/**
	 * Composes a tighter child scope — each category is the set intersection of this scope's
	 * list and `config`'s (an `undefined` side imposing no constraint), returned as a new
	 * scope that leaves this one unchanged.
	 *
	 * @remarks
	 * The child keeps this scope's `name`, `description`, and `select`, and mints its own `id`.
	 *
	 * @param config - The narrowing allow-lists (a `name`-less {@link ScopeFilter})
	 * @returns A new, tighter {@link ScopeInterface} (this one is left unchanged)
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
	/**
	 * Mints a scope from a {@link ScopeInput} (an `id` plus the per-category allow-lists) and
	 * stores it — always adds, never overwrites.
	 */
	create(input: ScopeInput): ScopeInterface
	/** Looks up one scope by id (`undefined` when absent). */
	scope(id: string): ScopeInterface | undefined
	/** Lists every scope, in insertion order. */
	scopes(): readonly ScopeInterface[]
	/** Removes one scope by id, or a batch — `true` only when every supplied id was removed. */
	remove(id: string): boolean
	remove(ids: readonly string[]): boolean
	/** Removes every scope. */
	clear(): void
}

/**
 * Configures `createAgentContext` — the optional system prompt plus the pre-built managers to
 * reuse: an `instructions` registry, a `workspaces` registry (the only document channel), a
 * `conversations` registry (the message source), a `tools` registry (the loop's advertise and
 * dispatch surface), and an initial `scope`.
 *
 * @remarks
 * `system` is the optional system prompt prepended to the turn's input. `instructions` /
 * `workspaces` are optional pre-built context managers to reuse (bring your own registry);
 * when one is omitted, the context creates a fresh empty one. `tools` supplies the loop's
 * call-dispatch and provider-advertising registry; it never renders into the prompt. `scope` is the
 * initial active filter applied at `build()` time (and at the loop's tool-advertise step); it
 * defaults to `undefined` — no filtering — and can be changed through the context's `apply`
 * method afterwards. `conversations` is the structural {@link ConversationManagerInterface} the
 * context's message source flows from: `messages` is the manager's active conversation's live tail
 * and `build()` folds that conversation's `view()` (section summaries + live). When omitted, a fresh
 * {@link ConversationManagerInterface} is created and a default conversation is added (so
 * `messages` is always defined). All default to a context with no system prompt, empty registries,
 * no scope, and a fresh conversation registry holding one default conversation. `select` is the
 * agent's default {@link SelectionHandler}, which the active scope's `select` overrides; omitted,
 * `select()` returns `undefined` while the active scope holds no handler.
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
	 * omitted (so `context.workspaces` is always present). `build()` renders the active workspace's
	 * files by carrier — text files into the system block (fenced), image files attached to the last
	 * user message. The registry is structural; change its active workspace through
	 * `workspaces.switch(id)`. The active workspace is the sole document/image context.
	 */
	readonly workspaces?: WorkspaceManagerInterface
	/** Sets the initial active scope (the build-time filter); `undefined` ⇒ no filtering. */
	readonly scope?: ScopeInterface
	/**
	 * Reuses a pre-built {@link ConversationManagerInterface} as the message source; a fresh
	 * empty one is created when omitted. The constructor adds a default conversation when the
	 * manager has no active one, so `messages` — the manager's active
	 * conversation's live tail — is always defined. `build()` folds the active conversation's
	 * `view()` (the per-section summaries + the live tail) as its authoritative message inclusion —
	 * the scope does not filter the conversation (it owns inclusion through compaction; scope filters
	 * only instructions / tools / workspace files). The registry is structural; change its active
	 * conversation through the manager's `switch(id)`.
	 */
	readonly conversations?: ConversationManagerInterface
	/**
	 * Holds the agent's default selection handler; the active scope's `select` overrides it.
	 * Omitted ⇒ with no scope handler either, `build()` folds the active conversation's `view()`.
	 */
	readonly select?: SelectionHandler
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
 * scoped instructions into one leading `system` message (under the manager's `open`,
 * each item through its `render`) — plus the active workspace's scope-filtered text files
 * (rendered as fenced reference blocks) — and appends the active conversation's `view()`, attaching
 * the active workspace's scope-filtered image files' `base64` payload to the last user message. The
 * active workspace is the sole document/image context. Tools are advertised to the provider
 * structurally (through `tools.definitions()`, scope-filtered by the loop), not serialized into
 * the prompt, so they never appear in `build()`'s output. The context managers are observable
 * (their own `emitter`s); the context itself is event-free.
 */
export interface AgentContextInterface {
	readonly system: string | undefined
	readonly instructions: InstructionManagerInterface
	/**
	 * Holds the {@link WorkspaceManagerInterface} whose active workspace `build()` renders by carrier —
	 * its text files folded into the system block (fenced reference blocks) and its image files'
	 * `base64` payload attached to the last user message. The active workspace is the sole
	 * document/image context. Always present (a fresh empty manager when none was supplied).
	 * `build()` reads its `active` (and the active workspace's `files()`) fresh each call. With no
	 * active workspace, nothing is rendered for workspaces. Active-only — never the other registered
	 * workspaces.
	 */
	readonly workspaces: WorkspaceManagerInterface
	/**
	 * Holds the active conversation's live tail — the agent's message source, always defined (the
	 * {@link conversations} registry always has an active conversation; a default is added at
	 * construction). It is the active {@link ConversationInterface} itself (which satisfies
	 * {@link MessageManagerInterface} structurally), so appends through `messages` route to the
	 * active conversation's tail and `build()` folds its `view()`. Computed dynamically (it follows
	 * `conversations.switch(id)`), the same reference the active conversation exposes — no
	 * duplication.
	 */
	readonly messages: MessageManagerInterface
	/**
	 * Holds the {@link ConversationManagerInterface} the message source flows from — `messages` is its
	 * active conversation's live tail and `build()` folds that conversation's `view()`. Always holds
	 * an active conversation (a default is added at construction when none was supplied), so
	 * `messages` is always defined. Switch the active conversation through
	 * `conversations.switch(id)` — so one agent can serve many conversations (set the active one per
	 * request). Switch between runs, not during one; for concurrent threads use separate agents.
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
	 * Applies the given scope as the active per-turn filter; passing `undefined` explicitly
	 * removes filtering.
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
	 * Runs the selection handler for one request — the active scope's `select`, else the agent
	 * default — and checks that the conversation did not change under it.
	 *
	 * @remarks
	 * Resolves the handler once per call. With no handler in either home it returns `undefined`
	 * synchronously, so a caller awaits nothing. Otherwise it records the message ids of the
	 * active conversation's `view()`, calls the handler, and compares the ids after it settles: an
	 * unchanged view returns the handler's {@link Selection}; a changed view returns a selection
	 * whose `fault` names the change, whose `messages` are the current `view()`, and which carries
	 * the handler's `judgments` and `usage`. A handler throw rejects the returned promise with the
	 * thrown value. The context stays event-free; the agent emits the receipt.
	 *
	 * @param request - The user message the run serves
	 * @param signal - The run's abort signal, passed to the handler
	 * @returns The pending {@link Selection}, or `undefined` when no handler is set
	 *
	 * @example
	 * ```ts
	 * const request = context.messages.add({ role: 'user', content: 'Summarize the ticket.' })
	 * const selection = await context.select(request, new AbortController().signal)
	 * context.build(selection)
	 * ```
	 */
	select(request: Message, signal: AbortSignal): Promise<Selection> | undefined
	/**
	 * Builds the provider input for the next turn: a leading `system` message folding the
	 * prompt, the scope-filtered instructions (each section's header and each item's rendering
	 * resolved through the format cascade), and the active workspace's scope-filtered
	 * (`scope.files`) text files as fenced reference blocks in a `## Workspace` section, then
	 * the active conversation's `view()`, with the active workspace's image files' `base64`
	 * payload attached to the last user message. With no override set, each section renders on
	 * its manager's built-in framing. The `system` message is prepended only when some part of
	 * it exists, the workspace render covers the active workspace alone, tools are advertised
	 * structurally rather than in the prompt, and the input is built fresh on each call.
	 *
	 * @remarks
	 * **The active workspace (rendered by carrier) — the sole document/image context.** When
	 * `workspaces.active` is set, its
	 * {@link import('@orkestrel/workspace').WorkspaceInterface.files} are filtered by
	 * `scope.files` (a three-way allow-list; `undefined` ⇒ all active files), then split by
	 * carrier: text files ({@link import('@orkestrel/workspace').isText}) render into a dedicated
	 * `## Workspace` section in the system block — each a fenced
	 * `` File: <path>\n```<language>\n<text>\n``` `` block — placed immediately after the instructions
	 * section; binary files whose MIME starts with `image/` have their `base64` payload
	 * attached to the last user message (a vision provider reads images off a user turn).
	 * Active-only — never the other registered workspaces; with no active workspace nothing is
	 * rendered for workspaces.
	 *
	 * **The format cascade.** Each manager section frames as `[open, ...items.map(render), close]`
	 * (empty / absent slots dropped, the survivors `\n\n`-joined), reading the manager's `open`,
	 * `render`, and `close`. Each slot resolves independently, most-specific-first, across three
	 * levels — an item override, the manager-options {@link ContextSectionFormat}, and the
	 * manager's built-in. For the instructions manager's options format `O`:
	 * - **open** = `O.open ?? '## Instructions'` — **manager-options override > built-in** (the
	 *   leading text has no per-item level).
	 * - **item** `I` = `I.override ?? O.render?.(I) ?? I.content` — **item override >
	 *   manager-options override > built-in**.
	 * - **close** = `O.close` — **manager-options override** alone, with no built-in floor:
	 *   unset ⇒ `undefined` ⇒ no closing line. Paired with `open`, it wraps the group
	 *   (`open: '<instructions>'` … `close: '</instructions>'`).
	 *
	 * To apply a provider's framing preference, pass it as the manager-options `format` of the
	 * instructions manager the agent receives. Scope filtering runs before formatting, and the
	 * workspace image data attaches to the last user message.
	 *
	 * **A selection.** Given a {@link Selection}, the build folds `selection.messages` in place of
	 * `view()` and attaches the image data to the last user message of that array; the system
	 * block is unchanged.
	 *
	 * @param selection - The selection whose `messages` replace `view()`; omitted ⇒ `view()`
	 * @returns The scoped conversation, prefixed by the assembled `system` message when any
	 *   of (the prompt, the scoped instructions, the active workspace's text files) is non-empty
	 */
	build(selection?: Selection): readonly Message[]
}
