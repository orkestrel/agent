import { ArrayShape } from '@orkestrel/contract';
import { BooleanShape } from '@orkestrel/contract';
import type { BudgetInterface } from '@orkestrel/budget';
import { ContractInterface } from '@orkestrel/contract';
import type { ContractShape } from '@orkestrel/contract';
import type { ControllerInterface } from '@orkestrel/workflow';
import type { DriverInterface } from '@orkestrel/database';
import type { EmitterErrorHandler } from '@orkestrel/emitter';
import type { EmitterHooks } from '@orkestrel/emitter';
import type { EmitterInterface } from '@orkestrel/emitter';
import type { FileInterface } from '@orkestrel/workspace';
import type { JSONRecord } from '@orkestrel/contract';
import { JSONShape } from '@orkestrel/contract';
import { JSONValue } from '@orkestrel/contract';
import { LiteralShape } from '@orkestrel/contract';
import { NumberShape } from '@orkestrel/contract';
import { ObjectShape } from '@orkestrel/contract';
import { OptionalShape } from '@orkestrel/contract';
import type { QueueContext } from '@orkestrel/queue';
import type { QueueInterface } from '@orkestrel/queue';
import type { QueueStoreInterface } from '@orkestrel/queue';
import type { RunnerInterface } from '@orkestrel/workflow';
import type { SchedulerInterface } from '@orkestrel/workflow';
import { StringShape } from '@orkestrel/contract';
import type { TableInterface } from '@orkestrel/database';
import type { TokenUsage } from '@orkestrel/budget';
import type { ToolCall } from '@orkestrel/tool';
import type { ToolDefinition } from '@orkestrel/tool';
import type { ToolInterface } from '@orkestrel/tool';
import type { ToolManagerInterface } from '@orkestrel/tool';
import type { ToolResult } from '@orkestrel/tool';
import { UnionShape } from '@orkestrel/contract';
import type { WorkspaceManagerInterface } from '@orkestrel/workspace';

/**
 * Composes a {@link ProviderInterface}, an {@link AgentContext}, and a
 * {@link ToolManagerInterface} into a bounded context → provider → tools → repeat turn, exposed
 * as both a one-shot `generate` and a live `stream` that share one private run — bounded by the
 * run `signal`, the `timeout`, and the `budget` folded through `AbortSignal.any`, paced by
 * `scheduler`, with tool iteration capped at `limit`.
 *
 * @remarks
 * - **One loop, two faces.** A single private async generator (`#run`) drives the
 *   whole turn. `stream` kicks off an eager pump that iterates `#run` into a private
 *   {@link Channel}, settling `result` from the run's outcome — so `result` settles
 *   whether or not the live `events` are drained; `generate` awaits that same
 *   settled `result` — so the two can never diverge.
 * - **The turn.** `#run` builds the provider input once (`context.build()` into a
 *   working array) then loops up to `limit`: drive `provider.stream(...)` accumulating
 *   + yielding each content delta as a `token` chunk; fold the turn's usage into the
 *   running total + the `budget` and yield a `usage` chunk; if the model requested
 *   tools, append the assistant turn, `execute` them, yield a `tool` chunk per call,
 *   append each tool result message, and continue; otherwise append the final
 *   assistant message and stop. Each assistant message stores its call's non-empty thinking.
 *   Provider calls and prompt estimates apply the provider's `replay` policy to the working
 *   array; an absent policy means `'none'`.
 * - **Bounded.** Each run arms one cancel through `createAbort({ signal: AbortSignal.any([
 *   …]) })` folding the external `signal`, the `timeout` deadline, and the `budget`
 *   signal; `abort()` fires it. Any trip stops the loop and commits a partial result
 *   (the `result` promise resolves, never rejects, on a cancel) — only a genuine
 *   provider / tool error rejects.
 * - **Paced + capped.** The `scheduler` (when given) `yield`s between turns; tool
 *   iteration is capped at `limit`.
 * - **Two observation surfaces.** The pull {@link AgentChunk} stream carries per-token
 *   deltas (+ usage/tool chunks); the push {@link emitter} ({@link AgentEventMap}) carries
 *   lifecycle + usage/tool/deny moments for fire-and-forget observers. Every event is
 *   emitted directly, after the relevant state transition / settle; the emitter isolates a
 *   listener throw and routes it to its `error` handler (the `error` option), so a buggy
 *   observer can never escape into / reorder / corrupt the settle-once loop — observation is
 *   purely a side-channel.
 *
 * @example
 * ```ts
 * const agent = new Agent(provider, { system: 'You are concise.' })
 * agent.context.messages.add({ role: 'user', content: 'Say hi.' })
 * const result = await agent.generate()
 * ```
 */
export declare class Agent implements AgentInterface {
    #private;
    constructor(provider: ProviderInterface, options?: AgentOptions);
    get id(): string;
    get emitter(): EmitterInterface<AgentEventMap>;
    get status(): AgentStatus;
    get context(): AgentContextInterface;
    generate(options?: AgentRunOptions): Promise<AgentResult>;
    stream(options?: AgentRunOptions): AgentStreamInterface;
    abort(reason?: unknown): void;
}

/**
 * Represents a streamed step of an agent turn — the union the loop yields as it runs, discriminated
 * by the `category` of step it carries, and the pull surface beside the push {@link AgentEventMap}.
 *
 * @remarks
 * - `token` — a content delta the provider streamed (the `'content'`
 *   {@link ProviderDelta}s a {@link ProviderInterface}'s `stream` yields), re-surfaced for
 *   live rendering of the assistant answer.
 * - `think` — a reasoning delta the provider streamed (the `'thinking'`
 *   {@link ProviderDelta}s, the daemon's native `message.thinking` channel), surfaced so a
 *   consumer can stream the model's reasoning live into a collapsible; never answer content
 *   (it is never fed into the accumulated `content`).
 * - `tool` — a {@link ToolCall} the loop dispatched paired with its {@link ToolResult},
 *   emitted once the tool ran (so a consumer sees what was called and what came back).
 * - `usage` — one provider call's {@link TokenUsage}, emitted after each turn's
 *   provider response that reported it (folded into the running total + any budget).
 */
export declare type AgentChunk = {
    readonly category: 'token';
    readonly content: string;
} | {
    readonly category: 'think';
    readonly content: string;
} | {
    readonly category: 'tool';
    readonly call: ToolCall;
    readonly result: ToolResult;
} | {
    readonly category: 'usage';
    readonly usage: TokenUsage;
};

/**
 * Assembles a provider request from the richer turn context — the optional system prompt, the
 * observable context managers (instructions / workspaces), the
 * {@link ConversationManagerInterface} message source whose active conversation is `messages`, the
 * {@link ToolManagerInterface} registry, and an active {@link ScopeInterface} changed through
 * {@link AgentContextInterface.apply}. `build()` folds the scoped managers and the active
 * workspace into one system block, then the conversation, and never reads `tools`.
 *
 * @remarks
 * - **Composition.** `system` is the optional system prompt; `instructions` / `tools` /
 *   `workspaces` / `conversations` are the registries passed in `options` (bring your own), or
 *   fresh empty ones when omitted (so `workspaces` is always present); `messages` is the active
 *   conversation's live tail (always defined — see the following item). `scope` is the active filter —
 *   `undefined` (the default) ⇒ no filtering; change it through `apply(scope)`. The structural
 *   `workspaces` / `conversations` registries are fixed at construction; switch their active
 *   members through their own `switch(id)` methods.
 * - **The message source — the conversation registry's active conversation.** `conversations` is a
 *   {@link ConversationManagerInterface}. The constructor adds a default conversation when the
 *   manager has no active one, so the dynamic `messages` getter — `this.#conversations.active` — is
 *   always defined. `messages` returns the active conversation itself (it owns the live tail + the
 *   message verbs directly, satisfying {@link MessageManagerInterface} structurally — the same
 *   reference, no duplication), and `build()` folds that conversation's `view()` (its per-section
 *   summaries + live tail) as the authoritative message inclusion — the scope does not filter the
 *   conversation (it owns inclusion through compaction; scope filters only instructions / tools /
 *   workspace files). Because `messages` is read dynamically, an agent switches the active
 *   conversation between runs (`conversations.switch(id)`) to serve many threads (the real
 *   multi-conversation pattern); switch between runs, not during a run, and use separate agents for
 *   concurrent threads.
 * - **`build()` — the scoped assembly + the format cascade.** It folds, in order,
 *   the system prompt then the scope-filtered instructions → the active workspace's text files
 *   (each as a block: the section's `open` text, each item's rendering, then any `close` text)
 *   into one leading `system` message (prepended only when at least one part exists), then
 *   appends the active conversation's `view()` (the conversation owns message inclusion through
 *   compaction — the scope does not filter the conversation). The instruction manager resolves
 *   each `open` / item / `close` most-specific-first: `open` = manager-options-override >
 *   built-in; per item = item-override > manager-options-override > built-in; `close` =
 *   manager-options-override (no built-in ⇒ no closing line when unset) (see
 *   {@link AgentContextInterface.build}). With no override set, each section is its built-in
 *   header + items, no closing line. The active workspace's scoped-in image files' `base64` payload is attached to
 *   the last user message (a vision provider reads images off a user turn); when no user message
 *   exists the attachment is skipped. Built fresh each call (recomputed, never cached), so it
 *   always reflects the current managers / messages / scope / active workspace; it never mutates a
 *   manager or the stored messages.
 * - **The active workspace, rendered by carrier — the sole document/image context.**
 *   `workspaces.active` (when set) has its {@link import('@orkestrel/workspace').FileInterface}s scope-filtered by `scope.files`,
 *   then split: text files fold into a dedicated `## Workspace` system section (fenced reference
 *   blocks — placed right after the instructions section), and image files' `base64` payload attaches
 *   to the last user message. Active-only — never the other registered workspaces; with no active
 *   workspace nothing renders for workspaces. `build()` owns this render (a `Workspace` /
 *   `WorkspaceManager` stays file-focused).
 * - **Tools are structural, not in the prompt.** The registry is advertised to the provider
 *   through `tools.definitions()` (scope-filtered by the loop), never serialized into the
 *   message array — so `build()`'s output carries no tool content, scoped or not.
 * - **Event-free context; observable managers.** The context itself owns no Emitter; the
 *   context managers each carry their own (the push observation surface).
 *
 * @example
 * ```ts
 * const context = new AgentContext({ system: 'You are concise.' })
 * context.instructions.add({ name: 'tone', content: 'Be terse.' })
 * context.messages.add({ role: 'user', content: 'Hi' })
 * context.build() // [{ role: 'system', content: 'You are concise.\n\n## Instructions\n\nBe terse.' }, { role: 'user', content: 'Hi' }]
 * ```
 */
export declare class AgentContext implements AgentContextInterface {
    #private;
    constructor(options?: AgentContextOptions);
    get system(): string | undefined;
    get instructions(): InstructionManagerInterface;
    get workspaces(): WorkspaceManagerInterface;
    get messages(): MessageManagerInterface;
    get conversations(): ConversationManagerInterface;
    get tools(): ToolManagerInterface;
    get scope(): ScopeInterface | undefined;
    apply(scope: ScopeInterface | undefined): void;
    select(request: Message, signal: AbortSignal): Promise<Selection> | undefined;
    build(selection?: Selection): readonly Message[];
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
export declare interface AgentContextInterface {
    readonly system: string | undefined;
    readonly instructions: InstructionManagerInterface;
    /**
     * Holds the {@link WorkspaceManagerInterface} whose active workspace `build()` renders by carrier —
     * its text files folded into the system block (fenced reference blocks) and its image files'
     * `base64` payload attached to the last user message. The active workspace is the sole
     * document/image context. Always present (a fresh empty manager when none was supplied).
     * `build()` reads its `active` (and the active workspace's `files()`) fresh each call. With no
     * active workspace, nothing is rendered for workspaces. Active-only — never the other registered
     * workspaces.
     */
    readonly workspaces: WorkspaceManagerInterface;
    /**
     * Holds the active conversation's live tail — the agent's message source, always defined (the
     * {@link conversations} registry always has an active conversation; a default is added at
     * construction). It is the active {@link ConversationInterface} itself (which satisfies
     * {@link MessageManagerInterface} structurally), so appends through `messages` route to the
     * active conversation's tail and `build()` folds its `view()`. Computed dynamically (it follows
     * `conversations.switch(id)`), the same reference the active conversation exposes — no
     * duplication.
     */
    readonly messages: MessageManagerInterface;
    /**
     * Holds the {@link ConversationManagerInterface} the message source flows from — `messages` is its
     * active conversation's live tail and `build()` folds that conversation's `view()`. Always holds
     * an active conversation (a default is added at construction when none was supplied), so
     * `messages` is always defined. Switch the active conversation through
     * `conversations.switch(id)` — so one agent can serve many conversations (set the active one per
     * request). Switch between runs, not during one; for concurrent threads use separate agents.
     */
    readonly conversations: ConversationManagerInterface;
    /**
     * Holds the loop's tool registry for provider advertising and call dispatch. Tools are structural
     * loop machinery and never render into `build()`'s prompt.
     */
    readonly tools: ToolManagerInterface;
    /** Holds the active scope applied at `build()` time + the loop's tool-advertise step (`undefined` ⇒ no filtering). */
    readonly scope: ScopeInterface | undefined;
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
    apply(scope: ScopeInterface | undefined): void;
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
    select(request: Message, signal: AbortSignal): Promise<Selection> | undefined;
    /**
     * Builds the provider input for the next turn: a leading `system` message folding the
     * prompt, the scope-filtered instructions (each section's header and each item's rendering
     * resolved through the format cascade), and the active workspace's scope-filtered
     * (`scope.files`) text files as fenced reference blocks in a `## Workspace` section, then
     * the active conversation's `view()`, or the selection's `messages` when a selection is
     * passed, with the active workspace's image files' `base64` payload attached to the last user
     * message. With no override set, each section renders on its manager's built-in framing. The
     * `system` message is prepended only when some part of it exists, the workspace render covers
     * the active workspace alone, tools are advertised structurally rather than in the prompt, and
     * the input is built fresh on each call.
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
     * `view()` and attaches the image data to the last user message of that array, and appends a
     * non-empty `selection.briefing` as the last system part when the selection has no `fault`; the
     * rest of the system block is unchanged.
     *
     * @param selection - The selection whose `messages` replace `view()`; omitted ⇒ `view()`
     * @returns The scoped conversation, prefixed by the assembled `system` message when any
     *   of (the prompt, the scoped instructions, the active workspace's text files) is non-empty
     */
    build(selection?: Selection): readonly Message[];
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
export declare interface AgentContextOptions {
    readonly system?: string;
    /**
     * Holds the loop's pre-built tool registry for provider advertising and call dispatch; an empty one is
     * created when omitted. Tools never render into `build()`'s prompt.
     */
    readonly tools?: ToolManagerInterface;
    /** Reuses a pre-built instruction registry; an empty one is created when omitted. */
    readonly instructions?: InstructionManagerInterface;
    /**
     * Reuses a pre-built {@link WorkspaceManagerInterface}; a fresh empty one is created when
     * omitted (so `context.workspaces` is always present). `build()` renders the active workspace's
     * files by carrier — text files into the system block (fenced), image files attached to the last
     * user message. The registry is structural; change its active workspace through
     * `workspaces.switch(id)`. The active workspace is the sole document/image context.
     */
    readonly workspaces?: WorkspaceManagerInterface;
    /** Sets the initial active scope (the build-time filter); `undefined` ⇒ no filtering. */
    readonly scope?: ScopeInterface;
    /**
     * Reuses a pre-built {@link ConversationManagerInterface} as the message source; a fresh
     * empty one is created when omitted. The constructor adds a default conversation when the
     * manager has no active one, so `messages` — the manager's active
     * conversation's live tail — is always defined. `build()` folds the active conversation's
     * `view()` (the per-section summaries + the live tail), or a passed selection's `messages`.
     * The scope's filters never touch messages; message inclusion is the conversation's through
     * compaction and, when a handler is set, the selection's. A scope change reaches the prompt at
     * the next build or select site (run entry, the pre-first-turn compaction fold, or a compaction
     * rebuild) and the tools at the next turn's snapshot. The registry is structural; change its
     * active conversation through the manager's `switch(id)`.
     */
    readonly conversations?: ConversationManagerInterface;
    /**
     * Holds the agent's default selection handler; the active scope's `select` overrides it.
     * Omitted ⇒ with no scope handler either, `build()` folds the active conversation's `view()`.
     */
    readonly select?: SelectionHandler;
}

/**
 * Reports a concurrent run that would corrupt shared per-agent accounting, or a rehydration
 * name absent from its registry pool — thrown synchronously by an {@link AgentInterface}'s
 * `stream()` (and so by `generate()`, which calls it) and by an
 * {@link AgentRegistryInterface}'s accessors, carrying the machine-readable `code`
 * `'CONCURRENCY' | 'REGISTRY'`. Synchronous means a fire-and-forget
 * `agent.generate().catch(…)` never catches it: `await` the call inside `try`/`catch`, or wrap
 * the call expression itself.
 *
 * @remarks
 * `'CONCURRENCY'` reports a run already in flight on the same agent, plus a construction-level
 * `window` (a shared context budget) or a construction-level `budget` with no per-run override
 * (a shared cost budget) — a second concurrent `stream()` would race its charges against the
 * same shared instance, corrupting the accounting. Use separate agents, or per-run `budget`
 * overrides with no `window`, for genuinely concurrent runs. `'REGISTRY'` reports a rehydration
 * name absent from its registry pool, on `provider` / `tool` / `authority` / `scheduler` /
 * `build`. Narrow a caught value with {@link isAgentError} and branch on `error.code`.
 */
export declare class AgentError extends Error {
    /** Names the machine-readable condition — `'CONCURRENCY'`: a concurrent run on a shared accounting agent; `'REGISTRY'`: a rehydration name absent from its registry pool. */
    readonly code: 'CONCURRENCY' | 'REGISTRY';
    constructor(code: 'CONCURRENCY' | 'REGISTRY', message: string);
}

/**
 * Maps the push observation surface of an {@link AgentInterface} — the lifecycle, usage, and tool
 * moments a fire-and-forget observer (logging, metrics, tracing) subscribes to, beside the pull
 * {@link AgentChunk} stream.
 *
 * @remarks
 * Push vs. pull: the Emitter carries the loop's lifecycle moments (a run begins /
 * each turn / a settle / a cancel) plus usage and dispatched-tool events — the things
 * the chunk stream can't express (a `deny` never reaches the stream) or that a
 * fire-and-forget observer wants without draining the stream. Per-token deltas stay
 * exclusively the {@link AgentChunk} stream's job (the pull surface) — there is
 * deliberately no `token` event here. Subscribe through `agent.emitter.on(...)`.
 *
 * Observation is side-effect-free on the loop: listener isolation is the emitter's
 * — every event is emitted directly and a listener throw is routed to the emitter's own
 * `error` handler (the `error` option), never onto this domain map and never into the
 * settle-once / wake-park engine — so a buggy observer can never reorder, throw into, or
 * corrupt the run.
 *
 * A cancelled run emits `abort` (the cancel signal) and then `finish` (the settled
 * partial result) — so an observer sees both that the run was cancelled and the partial
 * outcome it committed; a genuine error emits `error` instead of `finish`.
 *
 * Declared as a `type` alias (not `interface extends EventMap` — `EventMap` is a
 * `type` kind): a type-literal satisfies the `EventMap` constraint
 * (`Record<string, readonly unknown[]>`) structurally, whereas an interface lacks the
 * required index signature.
 */
export declare type AgentEventMap = {
    /** Reports a run beginning — emitted at the top of `stream()` once `status` is `running`. */
    readonly start: readonly [id: string];
    /** Reports each `#run` loop iteration beginning — the zero-based turn index. */
    readonly turn: readonly [index: number];
    /** Reports a dispatched {@link ToolCall} paired with its {@link ToolResult} (executed or a denial). */
    readonly tool: readonly [call: ToolCall, result: ToolResult];
    /** Reports a turn's {@link TokenUsage} — emitted after a usage-bearing provider call. */
    readonly usage: readonly [usage: TokenUsage];
    /**
     * Reports a call denied by scope or authority, before dispatch.
     * A turn advertising no tools drops each call with `no tool is advertised in the active scope`.
     * Otherwise a call excluded by the tool allow-list carries `<tool name> is not in the active scope` and
     * produces a denial tool result and message. Authority evaluates only admitted calls.
     */
    readonly deny: readonly [call: ToolCall, reason: string | undefined];
    /** Reports the run settled successfully (a natural finish or a cancel's partial) — the {@link AgentResult}. */
    readonly finish: readonly [result: AgentResult];
    /** Reports the run settled with a genuine (non-cancel) error — the thrown value (always `unknown`). */
    readonly error: readonly [error: unknown];
    /** Reports the run cancelled (external signal / timeout / budget / `abort()`) — the cancel reason. */
    readonly abort: readonly [reason: unknown];
    /**
     * Reports the loop exhausting its `limit` while still holding unresolved tool intent (the model
     * requested tools on the very last allowed turn) — the turn count reached. Distinct from
     * `abort`: exhaustion is not a cancel (no external signal / timeout / budget tripped), so
     * this fires instead of `abort`, still followed by `finish` carrying the partial result.
     */
    readonly exhaust: readonly [turns: number];
    /**
     * Reports automatic compaction's summarizer throwing — a non-fatal warn channel (the run continues; see
     * {@link AgentOptions.window}). When the loop's between-turns / pre-first-turn auto-compaction
     * (`conversation.compact()`) rejects, the run does not crash: the loop skips compaction that
     * turn and surfaces the caught error here so the failure is observable, never silently lost.
     * The run still settles through the other events — `finish` for the lenient default, and
     * `error` when {@link AgentOptions.strict} rethrows the same caught value — so `fault` reports
     * the best-effort optimization that failed and never the run's own outcome. A manual
     * `conversation.compact()` still propagates its own error; only the agent's auto path is
     * resilient. A domain event (the emitter isolates a listener throw separately, routing it to
     * its `error` handler).
     */
    readonly fault: readonly [error: unknown];
    /**
     * Reports the {@link Selection} a handler returned, after the loop built the prompt from it —
     * at run entry and after each automatic compaction rebuild, so twice before turn 0 when the
     * pre-first-turn compaction folds. A returned `fault` the lenient run builds from still fires
     * it, so the receipt carries the cost; a thrown handler and a run aborted during selection
     * fire none.
     */
    readonly select: readonly [selection: Selection];
};

/**
 * Composes a {@link ProviderInterface}, an {@link AgentContextInterface}, and a
 * {@link ToolManagerInterface} into a bounded context → provider → tools → repeat turn.
 *
 * @remarks
 * - **One loop, two faces.** `generate` and `stream` share one private run, so they
 *   can never diverge: `generate` drains the same stream `stream` exposes, then
 *   resolves its settled {@link AgentResult}.
 * - **Bounded.** Each turn arms a single cancel folded from the external `signal`, the
 *   `timeout` deadline, and the `budget` signal (through `AbortSignal.any`); any of them —
 *   or `abort()` — stops the loop and settles the result `partial: true`.
 *   Tool handlers receive that run's signal through their `ToolContext`. An agent abort,
 *   stream abort, external signal, or deadline can reach a running handler. The budget is
 *   charged during provider streaming and between turns, before tool dispatch; exhaustion
 *   ends the run without dispatching, never inside a handler. An abort before dispatch
 *   appends neither the assistant call turn nor tool messages and emits no tool chunk;
 *   streamed content remains in the partial result. Cancellation after entry is cooperative:
 *   the loop awaits a running handler even when it ignores the signal, records its tool message,
 *   and folds nothing before the run settles; the next run's pre-first-turn check compacts
 *   instead.
 *   The agent supplies no caller identity.
 * - **Paced + capped.** The `scheduler` (when given) yields between turns; tool
 *   iteration is capped at `limit` so the loop always terminates.
 * - **Two observation surfaces.** Pull: the {@link AgentChunk} stream (`stream().events`)
 *   carries per-token answer deltas, per-think reasoning deltas, and usage/tool chunks for a live consumer. Push: the
 *   {@link emitter} ({@link AgentEventMap}) carries lifecycle + usage/tool/deny moments
 *   for fire-and-forget observers — the emitter isolates a listener throw and routes it to
 *   its `error` handler (the `error` option), so a buggy observer can never corrupt the
 *   loop. Per-token / per-thinking deltas are the stream's job exclusively; there is no
 *   `token` or `think` event.
 * - **Per-run overrides.** Both faces accept an optional {@link AgentRunOptions} bag whose
 *   members override the construction {@link AgentOptions} for that one run.
 */
export declare interface AgentInterface {
    readonly emitter: EmitterInterface<AgentEventMap>;
    readonly id: string;
    readonly status: AgentStatus;
    readonly context: AgentContextInterface;
    /**
     * Runs the turn to completion, discarding the live chunks — drains the shared stream and
     * resolves the settled {@link AgentResult} (`partial: true` when cancelled).
     *
     * @remarks
     * A concurrent run on a shared accounting agent throws an
     * {@link import('./errors.js').AgentError} (`code: 'CONCURRENCY'`) — and it throws
     * synchronously, before any `Promise` is returned. A fire-and-forget
     * `agent.generate().catch(...)` therefore will not catch it (the throw happens on the call
     * itself, ahead of the `.catch` ever attaching) — `await` the call (inside a `try`/`catch`)
     * or wrap the call expression itself in `try`/`catch`.
     *
     * @param options - Optional per-run {@link AgentRunOptions} (for example `think`); omitted ⇒ defaults
     * @returns The settled {@link AgentResult} (`partial: true` when cancelled)
     * @throws {AgentError} Synchronously, with `code: 'CONCURRENCY'`, for a concurrent run
     */
    generate(options?: AgentRunOptions): Promise<AgentResult>;
    /**
     * Runs the turn as a live stream — iterate `events` for {@link AgentChunk}s and
     * `await result` for the settled outcome; `result` resolves partial on a cancel and rejects
     * on a genuine error.
     *
     * @remarks
     * Like `generate()`, a concurrent run on a shared accounting agent throws an
     * {@link import('./errors.js').AgentError} (`code: 'CONCURRENCY'`) synchronously — before the
     * {@link AgentStreamInterface} handle is even returned, so it cannot be caught by chaining
     * off the (never-produced) handle; wrap the call itself in `try`/`catch`.
     *
     * @param options - Optional per-run {@link AgentRunOptions} (for example `think`); omitted ⇒ defaults
     * @returns A live {@link AgentStreamInterface} handle (events + result + abort)
     * @throws {AgentError} Synchronously, with `code: 'CONCURRENCY'`, for a concurrent run
     */
    stream(options?: AgentRunOptions): AgentStreamInterface;
    /**
     * Cancels the in-flight turn — fires the turn's signal; the `result` settles
     * `partial: true` with whatever content accumulated.
     *
     * @param reason - An optional cancellation reason propagated to the signal
     */
    abort(reason?: unknown): void;
}

/**
 * Reports an {@link AgentInterface} run that ended {@link AgentResult.partial} under a
 * `partial` policy of `false` (the default) — thrown by an agent-job handler (a
 * `createAgentQueue` / `createAgentRunner` job), carrying the partial {@link AgentResult} so
 * the failure stays inspectable, and the machine-readable `code` `'PARTIAL'`.
 *
 * @remarks
 * A partial result means the agent was cancelled (an external `signal` abort, a queue /
 * runner abort threaded in, a `timeout` deadline, or an exhausted token `budget`) rather
 * than finishing naturally. For a durable job that is a failure by default: throwing this
 * lets the Queue's retries re-run the job and a Runner's fail-fast abort its siblings.
 * Set `partial: true` (see `AgentQueueOptions` / `AgentRunnerOptions`) to treat a
 * partial as success instead, in which case this is never thrown. Narrow a caught value
 * with {@link isAgentJobError} to read `partial`. `code` is the machine-readable condition
 * (`'PARTIAL'` — the only one this error reports), so a `catch` branches on it rather than on
 * the message string.
 */
export declare class AgentJobError extends Error {
    /** Names the machine-readable condition — `'PARTIAL'`: a job that ended partial under a disallowing policy. */
    readonly code: "PARTIAL";
    /** Holds the partial {@link AgentResult} the cancelled job produced. */
    readonly partial: AgentResult;
    constructor(message: string, partial: AgentResult);
}

/**
 * Represents a JSON-serializable agent job — the descriptor a durable queue or runner runs. Its
 * non-serializable pieces (the provider, tools, authority, scheduler) are referenced by name and
 * resolved to live objects through an {@link AgentRegistryInterface} at handler time, while its
 * data fields (the seed `messages`, `system`, `limit`, `timeout`, and a token `budget` ceiling)
 * carry directly.
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
export declare interface AgentJobInput {
    /** Names the registry key of the {@link ProviderInterface} the job runs against. */
    readonly provider: string;
    /** Holds the seed conversation added to the rehydrated agent's context (serializable). */
    readonly messages: readonly MessageInput[];
    /** Holds an optional system prompt seeding the agent's context. */
    readonly system?: string;
    /** Names the registry keys of the {@link ToolInterface}s loaded into the agent's tool manager. */
    readonly tools?: readonly string[];
    /** Names the registry key of an optional {@link AuthorityInterface} policy gate. */
    readonly authority?: string;
    /** Names the registry key of an optional {@link SchedulerInterface} pacing the loop. */
    readonly scheduler?: string;
    /** Caps the tool-iteration turns before the loop stops (see {@link AgentOptions.limit}). */
    readonly limit?: number;
    /** Sets a wall-clock deadline (ms) for the whole turn (see {@link AgentOptions.timeout}). */
    readonly timeout?: number;
    /** Sets a token ceiling rebuilt into a `createTokenBudget({ max })` cost bound. */
    readonly budget?: number;
    /**
     * Lists the sub-agent jobs this job fans out — each a nested {@link AgentJobInput} (so the whole
     * tree stays serializable). On a `createAgentRunner`, the handler `controller.spawn`s
     * each child through the same bounded queue before running this (parent) job, so the
     * children run as sibling sub-agents and their results join the run after the declared
     * jobs (in spawn order). Ignored by `createAgentQueue` (a queue has no fan-out).
     */
    readonly children?: readonly AgentJobInput[];
}

/**
 * Implements the bounded HTTP calls, validation, and result merging of a judge behind concrete
 * wire seams.
 *
 * @remarks
 * A subclass fills `name`, `body`, and `read`; the constructor takes the `batch` switch that
 * decides whether one call carries every question or each question gets its own call in key
 * order. `ask` validates the request before any call, builds every body before the first call so
 * a wire limit refuses the request before inference, and runs the calls one after another, each
 * under its own deadline folded with the caller's signal. A cancel throws a `JudgeAbortError`
 * whose `partial` merges the calls that completed. A transport error reaches the caller unchanged.
 *
 * @example Writing a judge wire
 * ```ts
 * import type { JudgeRequest, JudgeResult } from '@orkestrel/agent'
 * import { AgentJudge, JudgeError } from '@orkestrel/agent'
 * import { isFiniteNumber, isRecord } from '@orkestrel/contract'
 *
 * // A wire whose server answers one yes/no question per call as { "yes": 0.93 }.
 * class YesJudge extends AgentJudge {
 * 	readonly name = 'yes'
 * 	body(request: JudgeRequest): object {
 * 		return { model: this.model, state: request.state, questions: request.questions }
 * 	}
 * 	read(value: unknown, request: JudgeRequest): JudgeResult {
 * 		const [id] = Object.keys(request.questions)
 * 		if (id === undefined || !isRecord(value) || !isFiniteNumber(value.yes)) {
 * 			throw new JudgeError('PROTOCOL', 'judge error: unreadable answer')
 * 		}
 * 		return { model: this.model, answers: { [id]: { form: 'noul', noul: value.yes } } }
 * 	}
 * }
 *
 * const judge = new YesJudge({
 * 	url: 'http://localhost:8010',
 * 	path: '/v1/yes',
 * 	model: 'yes-1',
 * 	batch: false,
 * })
 * ```
 */
export declare abstract class AgentJudge implements AgentJudgeInterface {
    #private;
    constructor(input: AgentJudgeInput);
    /** Identifies the concrete wire. */
    abstract readonly name: string;
    /** Exposes the instance's minted UUID. */
    get id(): string;
    /** Exposes the configured model identity. */
    get model(): string;
    /** Projects one call's request onto the concrete protocol's wire body. */
    abstract body(request: JudgeRequest): object;
    /** Decodes one call's parsed response body into the answers for that call's questions. */
    abstract read(value: unknown, request: JudgeRequest): JudgeResult;
    /**
     * Asks every question of the request about its state and merges the answers of every call.
     *
     * @param request - The state and the questions keyed by caller id
     * @param signal - The caller's cancellation bound
     * @returns The merged answers, refusals, and usage of every call
     * @throws JudgeAbortError Thrown when the caller's signal or a call's deadline fires, carrying
     * the merged result of the completed calls
     * @throws JudgeError Thrown with code `QUESTION` for an empty question map, a malformed question
     * or state, or a wire refusal before any call; with code `HTTP` for a non-OK response; and with
     * code `PROTOCOL` for a missing or unparsable response body
     */
    ask(request: JudgeRequest, signal: AbortSignal): Promise<JudgeResult>;
}

/**
 * Configures the judge engine's destination, identity, and call split.
 *
 * @remarks
 * `path` appends to `url`. `model` is the identity the judge reports when a response names none.
 * `timeout`, `fetch`, and `headers` bound, carry, and authenticate each call as they do for a
 * provider; the deadline applies to each call on its own.
 */
export declare interface AgentJudgeInput extends Pick<ProviderOptions, 'timeout' | 'fetch' | 'headers'> {
    readonly url: string;
    readonly path?: string;
    readonly model: string;
    /** If true, one call carries every question; if false, the engine issues one call per question. Default: true. */
    readonly batch?: boolean;
}

/** Defines the wire seams of the shared judge engine. */
export declare interface AgentJudgeInterface extends JudgeInterface {
    /** Projects one call's request onto the concrete protocol's serializable body. */
    body(request: JudgeRequest): object;
    /** Decodes one call's parsed response body into the answers for that call's questions. */
    read(value: unknown, request: JudgeRequest): JudgeResult;
}

/**
 * Configures `createAgent` — the loop's bounds and pacing, the reserved `on` hooks, the
 * construction-time context wiring (`instructions` / `workspaces` / `scope`), the `conversations`
 * registry that is the message source, the context `window` budget that opts into automatic
 * compaction of the active conversation, and the `strict` switch that aborts the run on an
 * automatic-compaction summarizer failure instead of the lenient default.
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
 *   context as the message source (so `context.messages` is its active conversation's live tail);
 *   omitted ⇒ a fresh registry holding one default conversation. Auto-compaction (`window`) folds
 *   the active conversation when it is summarizable.
 * - `window` — an optional context {@link BudgetInterface} for automatic conversation
 *   compaction: when set, the loop measures the current full prompt against this budget each turn
 *   (its `consumer` is a token estimator, its `max` the context window) and, when the prompt
 *   reaches the window and the active conversation is summarizable, compacts the active
 *   conversation + continues on the rebuilt smaller view — compact-and-continue, distinct from
 *   `budget`'s hard abort. Omitted ⇒ no auto-compaction.
 * - `strict` — when `true`, a summarizer failure during automatic compaction aborts the run
 *   (rethrown after the `fault` event, propagating through `#run` to a genuine `error`
 *   settle) instead of skipping compaction and continuing over-window. The selection faults (a
 *   thrown handler, a returned `fault`, a conversation changed under the handler) settle the same
 *   way. Defaults to `false` (lenient — the run continues over-window, or on `view()` after a
 *   selection fault).
 * - `select` — an optional default {@link SelectionHandler} forwarded to the agent's context; the
 *   active scope's `select` overrides it. The loop runs it at run entry and after each automatic
 *   compaction rebuild, emits each {@link Selection} it builds from on `select`, and charges the
 *   selection's usage to `budget` and the result's `usage`.
 * - `instructions` — an optional pre-built {@link InstructionManagerInterface} forwarded to the
 *   agent's context; an empty one is created when omitted (mirrors {@link AgentContextOptions.instructions}).
 * - `workspaces` — an optional pre-built {@link WorkspaceManagerInterface} forwarded to the
 *   agent's context; a fresh empty one is created when omitted (mirrors {@link AgentContextOptions.workspaces}).
 * - `scope` — an optional initial active {@link ScopeInterface} forwarded to the agent's context
 *   (the context and tool-dispatch filter); `undefined` ⇒ every registered tool is admitted.
 * - `on` — the reserved {@link EmitterHooks} key: initial listeners for the agent's
 *   {@link AgentEventMap}, wired at construction (for example `{ finish: (r) => log(r) }`).
 */
export declare interface AgentOptions {
    readonly on?: EmitterHooks<AgentEventMap>;
    /** Holds the emitter's listener-error handler — a listener throw routes here, not to a domain event. */
    readonly error?: EmitterErrorHandler;
    readonly system?: string;
    /** Reuses a pre-built tool registry the loop dispatches calls through; an empty one is created when omitted. */
    readonly tools?: ToolManagerInterface;
    /** Reuses a pre-built instruction registry forwarded to the agent's context; an empty one is created when omitted. */
    readonly instructions?: InstructionManagerInterface;
    /** Reuses a pre-built workspace registry forwarded to the agent's context; a fresh empty one is created when omitted. */
    readonly workspaces?: WorkspaceManagerInterface;
    /**
     * Sets the initial active scope; `undefined` admits every registered tool.
     * Each turn snapshots the scope's tool allow-list before advertising and checks calls
     * against that list before applying authority. An absent list also admits unknown names
     * to authority and the registry, which returns its tool-not-found failure.
     * A reply to a turn advertising no tools ends the run as its answer, records an assistant
     * message without calls, and emits a `deny` event for every dropped call without marking it partial.
     * Other scoped-out calls produce denial tool results and messages, and the loop continues.
     * A scope change through the context's `apply` method applies the tool allow-list at the next
     * turn's snapshot, which a `turn` listener reaches for the same turn, and the instructions,
     * files, and `select` at the next build or select site: run entry, the pre-first-turn
     * compaction fold, or a compaction rebuild.
     */
    readonly scope?: ScopeInterface;
    /** Caps the tool-iteration turns before the loop stops; defaults to `DEFAULT_AGENT_LIMIT`. */
    readonly limit?: number;
    /** Sets a wall-clock deadline (ms) for the whole turn; its abort commits a partial result. */
    readonly timeout?: number;
    /** Bounds the token cost; each provider call's usage is charged and its abort commits a partial. */
    readonly budget?: BudgetInterface<TokenUsage>;
    /** Paces the loop — the loop yields to it between turns so the host regains control. */
    readonly scheduler?: SchedulerInterface;
    /** Carries an external cancel; its abort commits a partial result. */
    readonly signal?: AbortSignal;
    /**
     * Holds an optional policy gate consulted after scope admits a tool call — a denied call is
     * fed back to the model as a denial {@link ToolResult} (a `tool` chunk + a tool
     * message) rather than executed (no tool run, no budget cost), so the model sees the
     * denial and can react; an allowed call dispatches normally. Omitted ⇒ every admitted call
     * dispatches through the registry.
     */
    readonly authority?: AuthorityInterface;
    /**
     * Holds an optional {@link ConversationManagerInterface} that becomes the agent context's message
     * source — forwarded to the {@link AgentContextInterface} the agent builds, so
     * `agent.context.messages` is its active conversation's live tail and `build()` folds that
     * conversation's `view()` (the per-section summaries + the live tail). Omitted ⇒ a fresh
     * registry holding one default conversation. With `window` set, automatic compaction folds the
     * active conversation between turns (when it is summarizable).
     */
    readonly conversations?: ConversationManagerInterface;
    /**
     * Holds an optional context {@link BudgetInterface} for automatic compaction. Its `consumer` is a
     * token estimator (for example the exported {@link import('./helpers.js').estimateMessages}) and
     * its `max` is the context window. When set, the loop measures the current full prompt (the
     * next provider request) against this budget each turn; when that prompt reaches the window and
     * the active conversation is summarizable, it **compacts the active conversation + continues on
     * the rebuilt smaller view** (compact-and-continue) — the same consume-to-a-ceiling primitive
     * as the cost `budget`, but compaction is the ceiling action instead of abort. Omit to disable.
     */
    readonly window?: BudgetInterface<readonly Message[]>;
    /**
     * If `true`, a summarizer failure during automatic compaction emits `fault` and settles the
     * run `error`; a thrown selection handler, a returned selection `fault`, and a conversation
     * changed during selection follow the same rule. If `false`, the run continues — over-window
     * after a summarizer failure, and on the active conversation's `view()` after a selection
     * fault. A cancel at a selection site, a `fault` listener's included, settles partial instead
     * of `error`. Default: `false`.
     */
    readonly strict?: boolean;
    /**
     * Holds the default selection handler forwarded to the agent's context; the active scope's
     * `select` overrides it while that scope is active. The loop runs it at run entry and after
     * each automatic compaction rebuild, for the user message that ends the conversation, and
     * charges its usage to the cost `budget`. Omitted ⇒ with no scope handler either, the loop
     * builds from the active conversation's `view()` and awaits nothing.
     */
    readonly select?: SelectionHandler;
}

/**
 * Implements bounded HTTP streaming and result assembly behind concrete wire seams.
 *
 * @remarks
 * Every call owns its parser, splitter, deadline, and accumulation. Success bodies
 * have no size limit. A qwen3 implicit-open reclassification corrects the final
 * content while content deltas already yielded cannot be recalled. A subclass fills
 * `name`, `frame`, `body`, `read`, and `finish`; the constructor takes the `split`
 * and `strict` switches to control reasoning separation and settled-result requirements.
 * The `replay` input names which stored thinking the agent and relay send back. Default: `'none'`.
 *
 * @example Writing a provider for a new wire
 * ```ts
 * import type {
 * 	ProviderIncrement,
 * 	ProviderOptions,
 * 	ProviderParserInterface,
 * 	ProviderRequest,
 * } from '@orkestrel/agent'
 * import { AgentProvider } from '@orkestrel/agent'
 *
 * class TextFrame implements ProviderParserInterface<string> {
 * 	parse(chunk: string): readonly string[] {
 * 		return [chunk]
 * 	}
 * 	clear(): void {} // Raw text retains no framing state.
 * }
 *
 * interface TextOptions extends ProviderOptions {
 * 	readonly url: string
 * }
 *
 * class TextProvider extends AgentProvider<string> {
 * 	readonly name = 'text'
 * 	constructor(options: TextOptions) {
 * 		super({ ...options, path: '/generate' })
 * 	}
 * 	frame(): ProviderParserInterface<string> {
 * 		return new TextFrame()
 * 	}
 * 	body(request: ProviderRequest): object {
 * 		return { messages: request.messages }
 * 	}
 * 	read(record: string): ProviderIncrement {
 * 		return { content: record, thinking: '', tools: [] }
 * 	}
 * 	finish(_parser: ProviderParserInterface<string>): readonly string[] {
 * 		return [] // Raw text retains no records at end of input.
 * 	}
 * }
 * ```
 */
export declare abstract class AgentProvider<TRecord = Readonly<Record<string, unknown>>> implements AgentProviderInterface<TRecord> {
    #private;
    constructor(input: AgentProviderInput);
    /** Identifies the concrete backend. */
    abstract readonly name: string;
    /** Exposes the instance's minted UUID. */
    get id(): string;
    /** Names which stored assistant thinking the agent and relay send back. */
    get replay(): ThinkingReplay;
    /** Creates fresh framing state for the call. */
    abstract frame(): ProviderParserInterface<TRecord>;
    /** Projects a domain request onto the concrete protocol's wire body. */
    abstract body(request: ProviderRequest): object;
    /** Decodes a framed record into a turn increment. */
    abstract read(record: TRecord): ProviderIncrement;
    /** Returns any records retained at end of input. */
    abstract finish(parser: ProviderParserInterface<TRecord>): readonly TRecord[];
    /**
     * Generates a complete turn by draining the shared stream engine.
     *
     * @param messages - The conversation turns
     * @param signal - The caller's cancellation bound
     * @param tools - The advertised tool definitions
     * @param options - The per-call generation configuration
     * @returns The terminal stream result
     */
    generate(messages: readonly Message[], signal: AbortSignal, tools?: readonly ToolDefinition[], options?: ProviderStreamOptions): Promise<ProviderResult>;
    /**
     * Streams decoded deltas and returns the authoritative or assembled turn result.
     *
     * @param messages - The conversation turns
     * @param signal - The caller's cancellation bound
     * @param tools - The advertised tool definitions
     * @param options - The per-call generation configuration
     * @returns Content and native thinking deltas followed by the settled result
     * @throws ProviderAbortError Thrown when the combined cancellation bound fires
     * @throws ProviderError Thrown for an HTTP or protocol failure
     */
    stream(messages: readonly Message[], signal: AbortSignal, tools?: readonly ToolDefinition[], options?: ProviderStreamOptions): AsyncGenerator<ProviderDelta, ProviderResult>;
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
export declare interface AgentProviderInput extends ProviderOptions {
    readonly url: string;
    readonly path?: string;
    readonly split?: boolean;
    readonly strict?: boolean;
}

/** Defines the wire-specific seams of the shared HTTP provider engine. */
export declare interface AgentProviderInterface<TRecord = Readonly<Record<string, unknown>>> extends ProviderInterface {
    /** Creates fresh framing state for a call. */
    frame(): ProviderParserInterface<TRecord>;
    /** Projects a request to the concrete protocol's serializable body. */
    body(request: ProviderRequest): object;
    /** Decodes a framed record into its contribution to the turn. */
    read(record: TRecord): ProviderIncrement;
    /** Returns records retained at end of input before the parser is cleared. */
    finish(parser: ProviderParserInterface<TRecord>): readonly TRecord[];
}

/**
 * Configures `createAgentQueue` — the registry that rehydrates jobs, the partial-result
 * policy, and the substrate knobs threaded into the backing `createQueue`.
 *
 * @remarks
 * - `registry` — the {@link AgentRegistryInterface} the handler rehydrates each job
 *   through (required).
 * - `partial` — the partial policy. A partial {@link AgentResult} (a job committed
 *   early from an abort / budget / timeout) is by default a failure: the handler throws
 *   an {@link import('./errors.js').AgentJobError}, so the Queue's retries (and a
 *   Runner's fail-fast) engage. Set `true` to treat a partial as success instead — the
 *   handler resolves the partial result rather than throwing.
 * - `concurrency` / `retries` / `timeout` / `store` — passed straight to the backing
 *   `QueueInterface` (see `QueueOptions`): bounded concurrency, the retry budget, the
 *   per-attempt deadline, and the durable backing for persistence + replay.
 */
export declare interface AgentQueueOptions {
    readonly registry: AgentRegistryInterface;
    /** If `true`, a partial `AgentResult` resolves as success; if `false` (the default), it throws and retries engage. */
    readonly partial?: boolean;
    readonly concurrency?: number;
    readonly retries?: number;
    readonly timeout?: number;
    readonly store?: QueueStoreInterface<AgentJobInput>;
}

/**
 * Makes a durable, JSON-serializable {@link AgentJobInput} runnable — holds the named pools of
 * live, non-serializable pieces (providers, tools, authorities, schedulers), throws on a name
 * absent from its pool, and `build`s a seeded, signal-wired {@link Agent} from a job's names and
 * data.
 *
 * @remarks
 * - **Why it exists.** An `AgentJobInput` is serializable so it can survive a crash in a
 *   Queue's store; the live objects it needs (a provider with sockets, tools / rules /
 *   schedulers carrying functions) cannot serialize. The registry closes that gap:
 *   construct it once with the live pools, then a queue / runner handler calls `build`
 *   on each (possibly restored) job to get a ready agent.
 * - **Accessors throw on a miss.** `provider` / `tool` / `authority` / `scheduler` resolve a
 *   name against their pool and throw an {@link AgentError} carrying `code: 'REGISTRY'` and
 *   the message `unknown <category>: <name>` when it is absent — an unknown name in a
 *   rehydrated job is a programmer / config error that must fail loudly at build time, never
 *   silently resolve to `undefined` and run an agent missing a dependency.
 * - **`build` rehydrates.** Resolve the job's `provider`; assemble a fresh
 *   {@link ToolManager} from the `tools` names; rebuild the token `budget` from its
 *   ceiling (`createTokenBudget({ max })`); resolve the optional `authority` /
 *   `scheduler` names; construct the {@link Agent} with `system` / `limit` / `timeout` /
 *   the threaded `signal`; seed its context with the job's `messages`; return it. The
 *   `signal` is the queue attempt's / runner unit's cancel, so a bounded abort propagates
 *   into the agent (which commits a partial — the job's `partial` policy then
 *   decides success vs. retry).
 * - **Event-free.** A pure resolver — no Emitter, no events.
 *
 * @example
 * ```ts
 * declare const provider: ProviderInterface // any concrete implementation supplied by the host app
 * const registry = new AgentRegistry({ providers: { main: provider } })
 * const agent = registry.build({ provider: 'main', messages: [{ role: 'user', content: 'Say ok.' }] })
 * const result = await agent.generate()
 * ```
 */
export declare class AgentRegistry implements AgentRegistryInterface {
    #private;
    constructor(options: AgentRegistryOptions);
    provider(name: string): ProviderInterface;
    tool(name: string): ToolInterface;
    authority(name: string): AuthorityInterface;
    scheduler(name: string): SchedulerInterface;
    build(input: AgentJobInput, signal?: AbortSignal): AgentInterface;
}

/**
 * Resolves an {@link AgentJobInput}'s names to the live, non-serializable pieces and
 * rehydrates a seeded, signal-wired {@link AgentInterface} — the bridge that makes a
 * durable, serializable job runnable.
 *
 * @remarks
 * - **Accessors throw on a miss.** `provider` / `tool` / `authority` / `scheduler` look one
 *   up by name and throw an {@link AgentError} carrying `code: 'REGISTRY'` and the message
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
export declare interface AgentRegistryInterface {
    /**
     * Resolves a registered {@link ProviderInterface} by name — throws `unknown provider: <name>` when
     * absent.
     *
     * @param name - The provider's registry key
     * @returns The live provider
     * @throws If no provider is registered under `name`
     */
    provider(name: string): ProviderInterface;
    /**
     * Resolves a registered {@link ToolInterface} by name — throws `unknown tool: <name>` when
     * absent.
     *
     * @param name - The tool's registry key
     * @returns The live tool
     * @throws If no tool is registered under `name`
     */
    tool(name: string): ToolInterface;
    /**
     * Resolves a registered {@link AuthorityInterface} by name — throws `unknown authority: <name>` when
     * absent.
     *
     * @param name - The authority's registry key
     * @returns The live authority
     * @throws If no authority is registered under `name`
     */
    authority(name: string): AuthorityInterface;
    /**
     * Resolves a registered {@link SchedulerInterface} by name — throws `unknown scheduler: <name>` when
     * absent.
     *
     * @param name - The scheduler's registry key
     * @returns The live scheduler
     * @throws If no scheduler is registered under `name`
     */
    scheduler(name: string): SchedulerInterface;
    /**
     * Rehydrates a live, seeded {@link AgentInterface} from a serializable {@link AgentJobInput}
     * — resolving its names, rebuilding its token budget, seeding its conversation, and wiring
     * `signal`; a name absent from its pool throws.
     *
     * @param input - The serializable {@link AgentJobInput} to rehydrate
     * @param signal - An optional cancel threaded into the agent (a queue / runner abort)
     * @returns The ready agent, its context seeded with the job's messages
     * @throws If any referenced name (provider / tools / authority / scheduler) is unknown
     */
    build(input: AgentJobInput, signal?: AbortSignal): AgentInterface;
}

/**
 * Configures `createAgentRegistry` — the named pools of live, non-serializable pieces an {@link
 * AgentJobInput}'s names resolve against, plus the optional durable `store` every built agent's
 * conversation manager shares.
 *
 * @remarks
 * `providers` is required (a job always names a provider); `tools` / `authorities` /
 * `schedulers` are optional pools, each an entity-keyed record mapping a registry
 * name to its live object. A name absent from its pool throws when resolved (see
 * {@link AgentRegistryInterface}). `store` is the durable {@link ConversationStoreInterface}
 * every agent this registry builds carries: each built agent gets its own store-backed
 * {@link ConversationManagerInterface} over this shared store — a fresh conversation id per
 * build (minted by the seeded `add`), so concurrent builds never collide, and the store
 * accumulates one snapshot per built agent that later calls `save`. Persistence
 * stays caller-triggered (`open` / `save`) — `build` never hydrates, so `build` stays
 * synchronous. Omitted ⇒ every built agent gets a registry-only manager.
 */
export declare interface AgentRegistryOptions {
    readonly providers: Readonly<Record<string, ProviderInterface>>;
    readonly tools?: Readonly<Record<string, ToolInterface>>;
    readonly authorities?: Readonly<Record<string, AuthorityInterface>>;
    readonly schedulers?: Readonly<Record<string, SchedulerInterface>>;
    readonly store?: ConversationStoreInterface;
}

/**
 * Holds the settled outcome of an agent turn — the assembled assistant `content`, the
 * `usage` summed across the turn's provider calls, and whether it was committed
 * `partial`.
 *
 * @remarks
 * `partial` is `true` when the turn was committed early from a cancel — an external
 * `signal` abort, the turn's own `abort()`, a `timeout` deadline, or an exhausted
 * `budget` — in which case `content` is whatever had accumulated when the cancel
 * landed. `partial` is also `true` when the loop exhausted its `limit` while still
 * holding unresolved tool intent (the model requested tools on the very last allowed
 * turn) — a distinct, non-cancel cause covered by {@link RunOutcome.exhausted} (see
 * the `exhaust` {@link AgentEventMap} event). It is `false` for a turn that ran to a
 * natural finish (including a `limit: 0` run, which never enters the loop). `usage` is
 * present only when at least one provider call or selection reported usage — an aborted run's `usage`
 * includes the cancelled turn's tokens when the provider reports partial usage on the
 * abort (folded in exactly like a completed turn's); a provider that cannot observe
 * usage mid-stream (for example a daemon whose final counts never arrive before the cancel)
 * reports none for that turn, and none is fabricated. `thinking` is present
 * only when a call surfaced reasoning ({@link ProviderResult.thinking}, joined across calls);
 * it stays out of `content`. Each call's non-empty thinking is recorded on the assistant
 * message that call appends. The joined result also includes thinking from calls that appended
 * no message, such as an aborted call. Only recorded thinking can return to a provider,
 * as its `replay` policy allows.
 */
export declare interface AgentResult {
    readonly content: string;
    /**
     * Carries the calls' joined reasoning, including calls that appended no message, such as an
     * aborted call. Each appended assistant message records only its own call's non-empty thinking;
     * only recorded thinking can return to a provider under its `replay` policy.
     */
    readonly thinking?: string;
    /** Holds the summed {@link TokenUsage} across the run's provider calls and selections (present when any reported it). */
    readonly usage?: TokenUsage;
    /**
     * Reports cancellation or a turn limit reached with unresolved tool intent.
     * A reply to a turn advertising no tools is a complete answer (`false`), even if it
     * contains calls: those calls are dropped and observed through the `deny` event.
     */
    readonly partial: boolean;
}

/**
 * Projects an unknown value onto a fresh, exact `JSONValue` representation of an
 * {@link AgentResult} — capturing each structural field once through a total boundary,
 * accepting conforming accessors and inherited properties, preserving finite negative and
 * fractional usage counts, dropping extras, and resolving `undefined` for a malformed field, a
 * non-finite usage number, a throwing getter, or a hostile or revoked proxy.
 *
 * @remarks
 * This is a total hostile-boundary projection. Each structural field is captured once
 * through Contract's sanctioned exception boundary, so conforming accessors and inherited
 * properties are supported while a throwing getter or revoked proxy returns `undefined`.
 * Present usage counts must be finite numbers; negative and fractional values are preserved,
 * not normalized. Extra input properties are dropped while a fresh exact plain object is rebuilt
 * and deep-gated through
 * {@link import('@orkestrel/contract').parseJSONValue}.
 *
 * @param value - The unknown value to project
 * @returns A fresh JSON value containing only AgentResult fields, or `undefined` when invalid
 *
 * @example
 * ```ts
 * import { agentResultToJSON } from '@orkestrel/agent'
 *
 * agentResultToJSON({ content: 'done', usage: { prompt: 2, completion: 1, total: 3 }, partial: false })
 * // { content: 'done', usage: { prompt: 2, completion: 1, total: 3 }, partial: false }
 * ```
 */
export declare function agentResultToJSON(value: unknown): JSONValue | undefined;

/**
 * Configures `createAgentRunner` — the registry that rehydrates jobs, the partial-result
 * policy, and the substrate knobs threaded into the backing `createRunner`.
 *
 * @remarks
 * Identical partial policy to {@link AgentQueueOptions} (`partial` — a partial
 * `AgentResult` throws by default so the run's fail-fast engages, `true` resolves it as
 * success). `concurrency` / `retries` / `timeout` pass straight to the backing
 * `RunnerInterface` (see `RunnerOptions`). The runner enables sub-agent fan-out: a
 * parent job's handler can `controller.spawn(childJob)` to launch a child agent job
 * through the same bounded queue.
 */
export declare interface AgentRunnerOptions {
    readonly registry: AgentRegistryInterface;
    /** If `true`, a partial `AgentResult` resolves as success; if `false` (the default), it throws and fail-fast engages. */
    readonly partial?: boolean;
    readonly concurrency?: number;
    readonly retries?: number;
    readonly timeout?: number;
}

/**
 * Carries the per-run override bag an {@link AgentInterface}'s `generate` / `stream` accepts — each
 * member overrides the matching {@link AgentOptions} value for one run, where `think` and `schema`
 * forward to the provider call and `signal` composes with the constructed one.
 *
 * @remarks
 * Every member is optional and resolved independently, so an omitted member leaves the
 * agent's constructed value in force and a caller that passes no options runs exactly the
 * agent it configured. `think` / `schema` ride through to the provider as
 * {@link ProviderStreamOptions}; `limit` / `timeout` / `budget` replace their construction
 * defaults for this run only; `signal` composes with the constructed `signal` (both fold into
 * the run's bound abort) rather than replacing it. Nothing here mutates the agent — the next
 * run reads the construction defaults again.
 */
export declare interface AgentRunOptions {
    /**
     * Sets the per-run reasoning preference forwarded to the provider's `stream` as
     * {@link ProviderStreamOptions.think} — `true` asks the backend to separate reasoning
     * (surfaced as `think` {@link AgentChunk}s + the settled `thinking`), `false` suppresses
     * it. Omitted ⇒ the loop sends no reasoning preference and the provider's own default applies.
     */
    readonly think?: boolean;
    /**
     * Constrains the response to this JSON-Schema shape, forwarded to the provider's `stream`
     * as {@link ProviderStreamOptions.schema} — a per-run structured-output request. Omitted ⇒
     * no constraint (the loop sends no schema).
     */
    readonly schema?: Readonly<Record<string, unknown>>;
    /**
     * Overrides {@link AgentOptions.limit} for this run only — the max tool-iteration turns
     * before the loop stops. Omitted ⇒ the agent's constructed `limit` applies.
     */
    readonly limit?: number;
    /**
     * Overrides {@link AgentOptions.timeout} for this run only — a wall-clock deadline (ms)
     * whose abort commits a partial result. Omitted ⇒ the agent's constructed `timeout` applies.
     */
    readonly timeout?: number;
    /**
     * Overrides {@link AgentOptions.budget} for this run only — a token cost bound whose abort
     * commits a partial result; started for this run with `start()`, as the constructed budget is.
     * Omitted ⇒ the agent's constructed `budget` applies.
     */
    readonly budget?: BudgetInterface<TokenUsage>;
    /**
     * Carries an additional per-run external cancel, composed with {@link AgentOptions.signal} (both
     * fold into the run's bound abort through `AbortSignal.any` — neither is dropped). Omitted ⇒
     * only the agent's constructed `signal` (if any) applies.
     */
    readonly signal?: AbortSignal;
}

/**
 * Names the lifecycle state of an {@link AgentInterface} turn — `idle` before a run,
 * `running` while the loop is in flight, then the settled `done` (a normal finish or
 * a cancel) or `error` (a genuine provider / tool failure).
 */
export declare type AgentStatus = 'idle' | 'running' | 'done' | 'error';

/**
 * Names the agent turn's live handle — a {@link StreamInterface} of {@link AgentChunk}s
 * resolving an {@link AgentResult}.
 */
export declare type AgentStreamInterface = StreamInterface<AgentChunk, AgentResult>;

/** Carries a screened message's needed condition, absent without a decisive matching answer. */
export declare interface Applicability {
    readonly id: string;
    readonly needed?: boolean;
}

/**
 * Assembles the settled {@link AgentResult} from a run's {@link RunOutcome} — `thinking` and
 * `usage` are carried only when the run surfaced them, and the loop-internal `exhausted` flag is
 * left out.
 *
 * @remarks
 * Pure and total. An absent optional is omitted rather than stored as `undefined` (the
 * present-when-given convention the message store follows), so a settled result JSON
 * round-trips without an explicit `undefined` field. `exhausted` is loop bookkeeping and does
 * not reach the public result — the `exhaust` event carries it instead.
 *
 * @param outcome - The run's settled outcome
 * @returns The public {@link AgentResult}
 *
 * @example
 * ```ts
 * assembleResult({ content: 'hi', thinking: undefined, usage: undefined, partial: false, exhausted: false })
 * // { content: 'hi', partial: false }
 * ```
 */
export declare function assembleResult(outcome: RunOutcome): AgentResult;

/**
 * Copies a message with image data merged onto its `images` — the message's own images first,
 * then the attached data, carrying `calls` only when present and never mutating the original.
 *
 * @remarks
 * Pure and total: the original message is never mutated. `calls` is carried only when the
 * source message has one (kept omitted otherwise, mirroring the store's present-when-given
 * convention).
 *
 * @param message - The message to copy (left unchanged)
 * @param data - The base64 image data to attach
 * @returns A new message carrying the merged `images`
 *
 * @example
 * ```ts
 * attachImages({ id: '1', role: 'user', content: 'Describe' }, ['<payload>'])
 * // { id: '1', role: 'user', content: 'Describe', images: ['<payload>'] }
 * ```
 */
export declare function attachImages(message: Message, data: readonly string[]): Message;

/**
 * Attaches image data to a conversation's last user message — the turn a vision provider reads
 * images off — as a new array with that one message replaced by its carrying copy, and unchanged
 * when there is no data or no user turn.
 *
 * @remarks
 * Pure and total: the conversation and its messages are never mutated, and the returned array
 * replaces exactly the one target message with the copy {@link attachImages} builds. Empty
 * data returns the conversation unchanged; a conversation with no user message returns it
 * unchanged too (there is nowhere to attach, and the images already rode the system block).
 *
 * @param conversation - The messages to attach into (left unchanged)
 * @param data - The base64 image data to attach
 * @returns The conversation with its last user message replaced by the carrying copy
 *
 * @example
 * ```ts
 * attachUserImages([{ id: '1', role: 'user', content: 'Describe' }], ['<payload>'])
 * // [{ id: '1', role: 'user', content: 'Describe', images: ['<payload>'] }]
 * ```
 */
export declare function attachUserImages(conversation: readonly Message[], data: readonly string[]): readonly Message[];

/**
 * Gates the agent loop's tool calls — the synchronous policy consulted before each call runs,
 * turning one {@link AuthorityContext} into an {@link AuthorityDecision} by walking the ordered
 * rules first-match-wins and falling back to a configurable default, which allows an unmatched
 * call unless its `fallback` denies.
 *
 * @remarks
 * - **Ordered, first-match-wins.** `evaluate` walks the configured rules in order and
 *   returns the first whose `match(context)` is true as
 *   `{ zone, allowed: rule.allowed ?? true, reason }` — a matched rule allows by
 *   default and denies only when its `allowed` is explicitly `false`.
 * - **Fallback.** When no rule matches, `evaluate` returns the configured `fallback`.
 *   It defaults to `{ zone: DEFAULT_AUTHORITY_ZONE, allowed: true }` (allow-unmatched),
 *   so a rules list of denials behaves as a denylist. To make the gate deny-by-default
 *   (an allowlist — only matched rules that allow get through), pass an `allowed: false`
 *   `fallback`.
 * - **Consulted before each tool call.** The agent loop calls `evaluate({ call })` for
 *   every {@link import('@orkestrel/tool').ToolCall} the model emits; a denied call is fed
 *   back to the model as a denial {@link import('@orkestrel/tool').ToolResult} (a `tool`
 *   chunk + a tool message) instead of being executed — no tool run, no budget cost —
 *   so the model sees the denial and can react.
 * - **Synchronous.** `evaluate` returns the verdict directly.
 * - **Event-free.** A purely functional gate — no Emitter, no events.
 *
 * @example
 * ```ts
 * // A denylist: deny the `delete` tool, allow everything else (default fallback).
 * const authority = new Authority({
 * 	rules: [{ match: (c) => c.call.name === 'delete', zone: 'restricted', allowed: false }],
 * })
 * authority.evaluate({ call: { id: '1', name: 'delete', arguments: {} } }) // { zone: 'restricted', allowed: false }
 * authority.evaluate({ call: { id: '2', name: 'add', arguments: {} } }) // { zone: 'default', allowed: true }
 * ```
 */
export declare class Authority implements AuthorityInterface {
    #private;
    constructor(options?: AuthorityOptions);
    evaluate(context: AuthorityContext): AuthorityDecision;
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
export declare interface AuthorityContext {
    readonly call: ToolCall;
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
export declare interface AuthorityDecision {
    readonly zone: string;
    readonly allowed: boolean;
    readonly reason?: string;
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
export declare interface AuthorityInterface {
    /**
     * Evaluates one tool call against the ordered rules — returns the first matching rule's
     * verdict, which allows unless `allowed: false`, or the fallback when none match.
     *
     * @param context - The call under consideration (see {@link AuthorityContext})
     * @returns The first matching rule's verdict, or the fallback when none match
     */
    evaluate(context: AuthorityContext): AuthorityDecision;
}

/**
 * Configures `createAuthority` — the ordered rules and the no-match fallback.
 *
 * @remarks
 * `rules` are evaluated in order, first match wins (see {@link AuthorityRule}).
 * `fallback` is the {@link AuthorityDecision} returned when no rule matches; it
 * defaults to `{ zone: DEFAULT_AUTHORITY_ZONE, allowed: true }` (allow-unmatched — a
 * rules list of denials acts as a denylist). Set `fallback` to an `allowed: false`
 * decision to flip the gate to deny-by-default (an allowlist — only matched rules
 * that allow get through).
 */
export declare interface AuthorityOptions {
    readonly rules?: readonly AuthorityRule[];
    readonly fallback?: AuthorityDecision;
}

/**
 * Represents one ordered policy rule an {@link AuthorityInterface} evaluates.
 *
 * @remarks
 * The first rule whose `match` returns true decides; if none match, the authority's
 * `fallback` decides. A matched rule allows by default and denies only when its
 * `allowed` is explicitly `false`. `zone` classifies the matched call; `reason` is the
 * optional explanation carried into the {@link AuthorityDecision} (and, on a denial,
 * into the denial {@link ToolResult}).
 */
export declare interface AuthorityRule {
    readonly match: (context: AuthorityContext) => boolean;
    readonly zone: string;
    readonly allowed?: boolean;
    readonly reason?: string;
}

/**
 * Encodes a condition and its ordered message ids without separator ambiguity.
 * @param condition - The needed condition
 * @param subject - The screened message id
 * @param object - The request message id
 * @returns The JSON tuple used as the judgment key
 * @example
 * ```ts
 * buildConditionKey('needed', 'a', 'b') // '["needed","a","b"]'
 * ```
 */
export declare function buildConditionKey(condition: 'needed', subject: string, object: string): string;

/**
 * Merges the results of a judge request's calls into one result.
 *
 * @remarks
 * Pure and total. Answers and refusals are joined by question id; `refusals` is omitted when no
 * call refused a question. Each call's usage passes through {@link sanitizeUsage} and the totals
 * add through {@link sumUsage}; `usage` is omitted when no call reported one. The model is the
 * first call's, or the given model when the list is empty, as the empty partial of a cancel
 * before the first call requires.
 *
 * @param model - The judge's configured model, reported when no call completed
 * @param results - The completed calls' results in call order
 * @returns The merged result
 * @example
 * ```ts
 * buildJudgeResult('tev1:0.8b', []) // { model: 'tev1:0.8b', answers: {} }
 * buildJudgeResult('jev-latest', [
 * 	{ model: 'jev-1.13.0', answers: { urgent: { form: 'noul', noul: 0.95 } } },
 * 	{ model: 'jev-1.13.0', answers: {}, refusals: { team: { missing: ['sales'] } } },
 * ])
 * // { model: 'jev-1.13.0', answers: { urgent: ... }, refusals: { team: { missing: ['sales'] } } }
 * ```
 */
export declare function buildJudgeResult(model: string, results: readonly JudgeResult[]): JudgeResult;

/**
 * Builds records for answered or refused request keys, attaching usage only for a single question.
 *
 * @param request - The request whose question keys define record order
 * @param result - The reported answers, refusals, model, and usage
 * @param sources - The ordered source message ids
 * @param state - The rendered state read by the judge
 * @param model - The configured judge identity the records carry
 * @returns Inputs for completed question keys in request order
 * @example
 * ```ts
 * buildJudgments(request, result, ['message-a'], 'Charged twice', judge.model)
 * ```
 */
export declare function buildJudgments(request: JudgeRequest, result: JudgeResult, sources: readonly string[], state: string, model: string): readonly JudgmentInput[];

/**
 * Builds the record lines of one message.
 *
 * @remarks
 * Each sentence that is not stale becomes a line. A sentence that opens with a pronoun and follows
 * another sentence takes the last name of the sentence before it that is neither an owner name nor
 * a system name, and its line text opens with that party and a colon.
 *
 * @param input - The classification whose topics the lines carry
 * @param byId - The messages by id
 * @param id - The message id
 * @param dead - The stale sentences as `SOURCE SENTENCE` keys
 * @param holders - The owner names, which never serve as a party
 * @param system - The system text's names, which never serve as a party
 * @returns The lines in sentence order; empty when the message is absent
 *
 * @example
 * ```ts
 * buildLines(input, byId, 'user-1', new Set(), [], []).map((line) => line.text)
 * // ['Odile Marlow phoned about BW-5512.', 'Odile Marlow: She wants a refund.']
 * ```
 */
export declare function buildLines(input: LedgerProjectionInput, byId: ReadonlyMap<string, Message>, id: string, dead: ReadonlySet<string>, holders: readonly string[], system: readonly string[]): readonly LedgerLine[];

/**
 * Builds the fixed needed question with the application's true and false criteria.
 * @param needed - The true and false criteria, such as `NEEDED_CRITERION`
 * @returns The binary question whose instructions remain stable across compaction
 * @example
 * ```ts
 * buildNeededQuestion(NEEDED_CRITERION)
 * ```
 */
export declare function buildNeededQuestion(needed: Pick<Criterion, 'yes' | 'no'>): NoulQuestion;

/**
 * Assembles a provider result with only populated optional fields.
 *
 * @param content - The authoritative answer
 * @param thinking - The joined reasoning
 * @param tools - The accumulated calls
 * @param usage - The reported token usage
 * @returns The assembled result
 * @example
 * ```ts
 * buildProviderResult('ok', '', [], undefined) // { content: 'ok' }
 * ```
 */
export declare function buildProviderResult(content: string, thinking: string, tools: readonly ToolCall[], usage: TokenUsage | undefined): ProviderResult;

/**
 * Builds the framed recap message for one compacted section — the same role and stable `id` as
 * {@link buildSummaryMessage}, with the content prefixed by {@link
 * import('./constants.js').CONVERSATION_RECAP_PREFIX}.
 *
 * @remarks
 * Pure and total. The prefix is what makes a small model read the message as a condensed
 * recap of earlier turns rather than a literal assistant turn to echo or answer from. It is a
 * fixed handful of tokens, so a conversation's `view()` stays lean however many sections it
 * carries.
 *
 * @param section - The compacted section to render
 * @returns The framed recap message
 *
 * @example
 * ```ts
 * buildRecapMessage({ id: 's1', summary: 'recap', messages: [] })
 * // { id: 's1', role: 'assistant', content: `${CONVERSATION_RECAP_PREFIX}recap` }
 * ```
 */
export declare function buildRecapMessage(section: Section): Message;

/**
 * Projects the owner records and the rules record from a conversation's messages.
 *
 * @remarks
 * Each line is a sentence of a live message, verbatim except that a sentence that opens with a pronoun opens with its party and a colon. A message is live when it is a user message,
 * or a tool message whose reading is the last reading of its call, and the input neither excludes it nor
 * files it quiet or superseded. A reading with an undefined `result` still replaces the earlier
 * reading of the same call, so the earlier result leaves every record.
 *
 * A live message joins the owner records its entities name, directly or through a linked lookup
 * argument. A message that names no owner joins where its earlier side of an amended pair joins,
 * or on the rules record when it is filed as a rule or a correction, and is loose otherwise.
 *
 * A sentence an amending message made stale is left out and listed in `stale`. An amending message
 * that is itself superseded keeps that effect, so the old value never revives.
 *
 * A sentence that opens with a pronoun takes the party named in the sentence before it. The reading
 * trusts capitals, so a capitalized word that is no person, such as a carrier named mid-sentence,
 * is read as the party. This is a documented limit that the measured series kept: the prefix carries
 * the follow-up facts the records exist for.
 *
 * @param input - The messages, readings, entities, and classification to project
 * @returns The records with owner records ordered by their first member and the rules record last, the stale sentences, and the live message ids no record placed
 *
 * @example
 * ```ts
 * const projection = buildRecords({
 * 	system: 'You staff the desk.',
 * 	exclude: [],
 * 	owners: new Map([['BW-20931', ['Brightwater Studio']]]),
 * 	messages: [{ id: 'user-1', role: 'user', content: 'Brightwater Studio asked for a refund.' }],
 * 	readings: [],
 * 	entities: new Map([['user-1', ['BW-20931']]]),
 * 	classification: { quiet: new Set(), categories: new Map(), topics: new Map(), amended: new Map(), superseded: new Map() },
 * })
 * // projection.records[0].title === 'Brightwater Studio (account BW-20931)'
 * ```
 */
export declare function buildRecords(input: LedgerProjectionInput): LedgerProjection;

/**
 * Builds the raw synthetic summary message for one compacted section — role `'assistant'`, the
 * section's stable `id`, and its `summary` verbatim as content.
 *
 * @remarks
 * Pure and total. This is the unframed form an opted-in rollup regeneration digests (a
 * summary-of-summaries over the section summaries); the recap label is a `view()`
 * presentation concern kept out of what the summarizer re-reads — see
 * {@link buildRecapMessage}.
 *
 * @param section - The compacted section to render
 * @returns The synthetic summary message
 *
 * @example
 * ```ts
 * buildSummaryMessage({ id: 's1', summary: 'recap', messages: [] })
 * // { id: 's1', role: 'assistant', content: 'recap' }
 * ```
 */
export declare function buildSummaryMessage(section: Section): Message;

/**
 * Buffers chunks in a minimal unbounded async channel — the eager pump writes them in (`push`)
 * and ends it (`close` / `fail`) regardless of consumption, while a consumer reads them back live
 * through the `drain` async-iterator. Decoupling write from read is what lets a producer make
 * progress without a consumer pulling, and it is why an agent's `result` settles whether or not
 * its `events` are drained.
 *
 * @remarks
 * The standard resolver-swap: a waiting `drain` parks on `#wake` (a void resolver);
 * `push` / `close` / `fail` enqueue/flag, then fire `#wake` so the parked reader wakes,
 * re-reads the buffer, and either yields the next chunk, returns (on `close`), or throws
 * (on `fail`). Event-free, no `!` / `as` / `any`.
 *
 * @example
 * ```ts
 * import { Channel } from '@orkestrel/agent'
 *
 * const channel = new Channel<number>()
 * channel.push(1)
 * channel.close()
 * for await (const value of channel.drain()) {
 * 	value // 1
 * }
 * ```
 */
export declare class Channel<T> implements ChannelInterface<T> {
    #private;
    push(value: T): void;
    close(): void;
    fail(error: unknown): void;
    drain(): AsyncGenerator<T, void>;
}

/**
 * Buffers values in an unbounded async channel — a producer writes them in (`push`) and ends it
 * (`close` / `fail`) regardless of consumption, while a consumer reads them back live through
 * `drain`.
 *
 * @remarks
 * Decoupling the write from the read is what lets a producer make progress with nobody
 * pulling: an agent's eager pump writes each {@link AgentChunk} into one, so the run's
 * `result` settles whether or not `events` is ever drained. A waiting `drain` parks on a
 * resolver the next `push` / `close` / `fail` fires, so a value pushed at a parked reader is
 * delivered rather than dropped. Buffered values are always yielded before the end is
 * reported, so a `close` arriving alongside the last values still delivers them. The first
 * failure wins — a later `close` / `fail` cannot override a recorded error. Event-free.
 *
 * @typeParam T - The value type the channel carries
 */
export declare interface ChannelInterface<T> {
    /**
     * Writes one value — buffered, then handed to a parked consumer; a value pushed at an
     * already-parked reader is delivered, never dropped.
     *
     * @param value - The value to enqueue
     */
    push(value: T): void;
    /** Ends the channel normally — a draining consumer returns after the buffer empties. */
    close(): void;
    /**
     * Ends the channel with a failure — a draining consumer throws it after the buffer empties;
     * the first failure wins.
     *
     * @param error - The failure to surface (the first one recorded wins)
     */
    fail(error: unknown): void;
    /**
     * Reads the values back live, in write order — returning on `close` and throwing on `fail`.
     *
     * @returns A generator yielding each pushed value, returning on `close` and throwing on `fail`
     */
    drain(): AsyncGenerator<T, void>;
}

/**
 * Consumes a reported usage against a budget over what was already charged, so a turn's total
 * draw matches the report and nothing is charged twice.
 *
 * @remarks
 * The full `prompt` count is consumed because no earlier charge covers it. Each of `completion`
 * and `total` is consumed less `charged`, floored at 0. The usage must already be sanitized: a
 * non-finite field yields a non-finite charge, which the installed `Budget` refuses by throwing
 * a `range` `ContractError`. Without a budget the call consumes nothing.
 *
 * @param budget - The budget to consume against, or `undefined` for an unmetered run
 * @param usage - The sanitized usage the provider reported
 * @param charged - The completion tokens already consumed this turn
 *
 * @example
 * ```ts
 * const budget = createBudget<TokenUsage>({ max: 1000, consumer: (usage) => usage.total })
 * chargeUsage(budget, { prompt: 20, completion: 30, total: 50 }, 10)
 * budget.consumed // 40
 * ```
 */
export declare function chargeUsage(budget: BudgetInterface<TokenUsage> | undefined, usage: TokenUsage, charged: number): void;

/** Carries a choice distribution keyed by option name, in criteria order. */
export declare interface ChoiceAnswer {
    readonly form: 'choice';
    readonly probabilities: Readonly<Record<string, number>>;
}

/** Maps each option name the model sees to its description; null keeps an undescribed option in the map. */
export declare type ChoiceCriteria = Readonly<Record<string, JudgeEntry | null>>;

/** Asks the model to pick one named option from its criteria. */
export declare interface ChoiceQuestion {
    readonly form: 'choice';
    readonly instructions?: JudgeEntry;
    readonly criteria: ChoiceCriteria;
}

/**
 * Files messages through the conversation's judgment manager and reads their categories and corrections.
 *
 * @example
 * ```ts
 * const classifier = new Classifier(options)
 * await classifier.classify(new Set(), signal)
 * const filing = classifier.classification()
 * ```
 */
export declare class Classifier implements ClassifierInterface {
    #private;
    /**
     * Creates the filing engine with the ledger's handlers and calibrated questions.
     * @param options - The conversation, judge, questions, cutoffs, and handlers
     */
    constructor(options: ClassifierOptions);
    /**
     * Asks the judge every question the filing still lacks, in the measured order.
     * @param requests - The ids of the messages that belong to the current request
     * @param signal - The caller's signal; an abort returns a fault with completed judgments and usage
     * @returns The judgment keys and summed usage; a throw from the assign or entities handler, or a caller abort, returns the partial result with `fault`; a judge rejection under a live signal leaves that question undecided and sets no `fault`
     */
    classify(requests: ReadonlySet<string>, signal: AbortSignal): Promise<ClassifierResult>;
    /**
     * Reads the category a message is filed under.
     * @param id - The message id
     * @returns The assigned category, the recorded category at the cutoff, or `undefined`
     */
    category(id: string): LedgerCategory | undefined;
    /**
     * Reports whether a message files under a quiet category.
     * @param id - The message id
     * @returns True if the assigned or recorded category is quiet; false otherwise.
     */
    quiet(id: string): boolean;
    /**
     * Reports whether a message files under a decisive category.
     * @param id - The message id
     * @returns True if the recorded decisive weight reaches the category cutoff; false otherwise.
     */
    decisive(id: string): boolean;
    /**
     * Reads the topics a message concerns.
     * @param id - The message id
     * @returns The names of the topics whose recorded weight reaches the topic cutoff
     */
    topics(id: string): ReadonlySet<string>;
    /**
     * Reads the whole filing from the recorded judgments.
     * @returns The quiet ids, categories, topics, and the amended and superseded marks
     */
    classification(): LedgerClassification;
}

/**
 * Files a conversation's messages through a judge and reads the filing.
 *
 * @remarks
 * Every reading derives from the conversation's recorded judgments and the cutoffs; the classifier
 * stores only the failures it holds. A judge error leaves its item undecided.
 */
export declare interface ClassifierInterface {
    /**
     * Asks every filing question the conversation's judgments lack an answer for.
     *
     * @param requests - The ids of the user messages the ledger serves as requests
     * @param signal - The signal that aborts the questions; completed judgments stay recorded
     * @returns The judgment keys and usage spent; a throw from the assign or entities handler, or a caller abort, returns the partial result with `fault`; a judge rejection under a live signal leaves that question undecided and sets no `fault`
     */
    classify(requests: ReadonlySet<string>, signal: AbortSignal): Promise<ClassifierResult>;
    /**
     * Returns the category a message is filed under, or undefined when no category reaches its cutoff.
     *
     * @param id - The id of the message
     * @returns The category, or undefined
     */
    category(id: string): LedgerCategory | undefined;
    /**
     * Returns true if the message is filed as quiet; false otherwise.
     *
     * @param id - The id of the message
     * @returns True if the message is quiet; false otherwise.
     */
    quiet(id: string): boolean;
    /**
     * Returns true if the message is filed as decisive; false otherwise.
     *
     * @param id - The id of the message
     * @returns True if the message is decisive; false otherwise.
     */
    decisive(id: string): boolean;
    /**
     * Returns the desk topics the message is filed under.
     *
     * @param id - The id of the message
     * @returns The names of the message's desk topics
     */
    topics(id: string): ReadonlySet<string>;
    /**
     * Returns the filing of every message in the conversation.
     *
     * @returns The classification of the conversation
     */
    classification(): LedgerClassification;
}

/**
 * Configures a classifier: the conversation it files, the judge and the wording it asks with, the
 * desk topics, the cutoffs, and the ledger's handlers.
 *
 * @remarks
 * `assign` decides the category of a message the ledger wrote or a tool returned, without a
 * question. `entities` names the registry ids a text carries, which decide the pairs it asks about.
 */
export declare interface ClassifierOptions {
    readonly conversation: ConversationInterface;
    readonly judge: JudgeInterface;
    readonly questions: LedgerQuestion;
    readonly topics: readonly LedgerTopic[];
    readonly thresholds: LedgerThreshold;
    readonly assign: LedgerCategoryHandler;
    readonly entities: LedgerEntityHandler;
}

/** Carries the judgment keys one classification rests on and the judge usage it spent. */
export declare interface ClassifierResult {
    readonly judgments: readonly string[];
    readonly usage?: TokenUsage;
    /** Holds the error when an assign or entities handler throw, or a caller abort, interrupts classification; judgments and usage retain the partial result. A judge rejection under a live signal sets no fault. */
    readonly fault?: Error;
}

/**
 * Collects whole exchanges, joining every exchange spanned by a tool group.
 *
 * @remarks
 * A user message opens an exchange that ends before the next user message. Leading messages
 * form their own exchange. A tool group joins every exchange between its first and last member.
 *
 * @param messages - The messages in prompt order
 * @returns The exchanges in prompt order, with each message retained unchanged
 * @example
 * ```ts
 * collectExchanges([
 * 	{ id: 'greeting', role: 'assistant', content: 'Welcome.' },
 * 	{ id: 'request', role: 'user', content: 'Read the order.' },
 * ]) // a leading exchange and a request exchange
 * ```
 */
export declare function collectExchanges(messages: readonly Message[]): ReadonlyArray<readonly Message[]>;

/**
 * Collects the `base64` payload of the image files in a workspace file list — the data an agent
 * context attaches to the last user message.
 *
 * @remarks
 * Pure and total. `isBinary` narrows the tagless content to its binary arm (a total guard,
 * never an assertion), then the MIME prefix gates it to an image, so a text file and a non-image
 * binary (a PDF) are both skipped. Order follows the file list.
 *
 * @param files - The (already scope-filtered) workspace files
 * @returns The `base64` payload of each image file, in file order
 *
 * @example
 * ```ts
 * collectImageData([createFile({ path: 'a.png', content: { base64: '<payload>', mime: 'image/png' } })])
 * // ['<payload>']
 * ```
 */
export declare function collectImageData(files: readonly FileInterface[]): readonly string[];

/**
 * Collects the ids of the live messages in conversation order.
 *
 * @remarks
 * A message is live when it is a user message, or a tool message whose reading is the last reading of its
 * call, and the input neither excludes it nor files it quiet or superseded. A reading replaces any
 * earlier reading of the same call, an empty one included, so an empty lookup leaves the earlier
 * result out of every record.
 *
 * @param input - The messages, readings, and classification to read
 * @returns The live message ids
 *
 * @example
 * ```ts
 * collectLive(input) // ['user-1', 'tool-2']
 * ```
 */
export declare function collectLive(input: LedgerProjectionInput): readonly string[];

/**
 * Collects the capitalized name runs of a text, leaving out the run that opens each sentence.
 *
 * @remarks
 * A sentence opens with a capital whatever its first word is, so its opening run proves nothing.
 * This is the reading the person prefix of {@link buildRecords} rests on.
 *
 * @param text - The text to read
 * @returns The capitalized runs in order, repeats included
 *
 * @example
 * ```ts
 * collectNames('Odile phoned. We asked about Odile Marlow.') // ['Odile Marlow']
 * ```
 */
export declare function collectNames(text: string): readonly string[];

/**
 * Collects the ids and the owner names the lookup readings named.
 *
 * @remarks
 * Every reading counts, a replaced one included, because an id a lookup named stays registered.
 * An empty reading names nothing. An owner name is trimmed, and a name without a letter is dropped.
 *
 * @param readings - The lookup readings in conversation order
 * @returns The registry: every id named, and each owner's names in the order read
 *
 * @example
 * ```ts
 * const registry = collectRegistry([
 * 	{ id: 'tool-1', name: 'lookup_customer', arguments: { account: 'BW-20931' }, text: 'Account BW-20931: Brightwater Studio', result: { ids: ['BW-20931'], owners: [{ id: 'BW-20931', names: ['Brightwater Studio'] }] } },
 * ])
 * // registry.owners is Map { 'BW-20931' => ['Brightwater Studio'] }
 * ```
 */
export declare function collectRegistry(readings: readonly LedgerLookupReading[]): LedgerRegistry;

/**
 * Collects the sentences that live messages made stale.
 *
 * @remarks
 * A sentence of a live message is stale when it shares an id or a number with a message that
 * amends it. An amending message takes effect while it is live, and keeps its effect after another
 * message supersedes it, so the value it replaced never revives. A user or tool message that the
 * input excludes or files quiet never takes effect.
 *
 * @param input - The exclusions and classification to read
 * @param byId - The messages by id
 * @param live - The live message ids from {@link collectLive}
 * @returns The stale sentences in conversation order, each with the tokens it shares
 *
 * @example
 * ```ts
 * collectStale(input, byId, ['user-1', 'user-3']) // [{ source: 'user-1', sentence: 1, tokens: ['ESC-2291'] }]
 * ```
 */
export declare function collectStale(input: LedgerProjectionInput, byId: ReadonlyMap<string, Message>, live: readonly string[]): readonly LedgerStaleSentence[];

/**
 * Collects each assistant message that carries calls together with the tool messages that answer
 * it, then each run of tool messages that no assistant message owns.
 *
 * @remarks
 * A tool message belongs to the one assistant message whose calls hold its `call` id. Without that
 * unique owner, it belongs to the assistant message that leads its run of tool messages when that
 * leader holds the id, repeats a call id, or the tool message has no `call`. Any other tool message
 * joins the orphan run it sits in. Compaction and the stock selection each keep a group on one side
 * of their cut.
 *
 * @param messages - The messages in prompt order
 * @returns The owned groups in owner order, then the orphan runs, each in prompt order
 * @example
 * ```ts
 * collectToolGroups([
 * 	{ id: 'lookup', role: 'assistant', content: '', calls: [{ id: 'order', name: 'lookup', arguments: {} }] },
 * 	{ id: 'result', role: 'tool', content: 'LH-81660 is late', call: 'order' },
 * ]) // one group holding the lookup call and its result
 * ```
 */
export declare function collectToolGroups(messages: readonly Message[]): ReadonlyArray<readonly Message[]>;

/**
 * Configures one {@link ConversationInterface.compact} call — the retained-tail size, the
 * `sections` cap, or both, overridden for one fold.
 *
 * @remarks
 * `keep` overrides the conversation's configured retained-tail size for this compaction only
 * (at most the older `count - keep` live messages fold, cut back to whole exchanges, never the
 * newest user message or a message after it; when nothing is left to fold, `compact()` is a no-op returning
 * `undefined`). Omitted ⇒ the conversation's own `keep`
 * (its option, or `DEFAULT_CONVERSATION_KEEP`) applies. `sections` overrides the conversation's
 * configured `sections` cap for this compaction only — after the new section is pushed, an
 * overflow past `sections` folds the oldest sections into one merged section. Omitted ⇒ the
 * conversation's own `sections` cap (or unlimited) applies.
 */
export declare interface CompactOptions {
    /** Overrides the retained-tail size for this compaction; omitted ⇒ the conversation's own `keep`. */
    readonly keep?: number;
    /** Overrides the `sections` cap for this compaction; omitted ⇒ the conversation's own cap (or unlimited). */
    readonly sections?: number;
}

/**
 * Derives the winner, its probability, the published confidence, and a score answer's expected
 * level from a judge answer's distribution.
 *
 * @remarks
 * The winner is the first strictly greatest candidate in enumeration order: an option name in
 * criteria order, a level index, or `'false'` then `'true'` for a noul, so a noul of exactly 0.5
 * names `'false'`. Confidence follows the TypeSafe formulas, whatever confidence a server sent: a
 * choice reads `(max(p) - 1/n) / (1 - 1/n)`, a noul reads `|2p - 1|` (the choice formula at
 * n = 2), and a score reads `max(0, 1 - spread / even_spread)`, where `spread` sums each level's
 * probability times its distance from the winning level and `even_spread` is the mean distance
 * from the middle level. `score` is the expected level `sum(i * p_i)` and is set only for a score
 * answer.
 *
 * @param answer - The answer whose distribution is read
 * @returns The derived measures
 * @throws JudgeError Thrown with code `PROTOCOL` when a choice or score answer has fewer than 2
 * candidates, because the confidence formulas divide by the candidate count
 * @example
 * ```ts
 * computeReading({ form: 'choice', probabilities: { billing: 0.88, technical: 0.12, sales: 0 } })
 * // { winner: 'billing', probability: 0.88, confidence: 0.82 } to two decimals
 * computeReading({ form: 'score', probabilities: [0, 0.57, 0.43] })
 * // { winner: '1', probability: 0.57, confidence: 0.355, score: 1.43 } to three decimals
 * computeReading({ form: 'noul', noul: 0.5 }) // { winner: 'false', probability: 0.5, confidence: 0 }
 * ```
 */
export declare function computeReading(answer: JudgeAnswer): Reading;

/**
 * Computes the completion tokens attributable to a message's thinking.
 *
 * @remarks
 * Weights the completion by thinking characters divided by the combined characters of thinking,
 * content, and JSON-serialized calls. Rounds to the nearest integer and caps at the completion.
 * An empty generation yields 0. The completion must be a finite nonnegative integer token count.
 * Calls that cannot be JSON-serialized contribute 0 characters.
 *
 * @param message - The generated thinking, content, and optional calls
 * @param completion - The tokens reported for the completion
 * @returns The thinking share in tokens, or 0 when no thinking characters exist
 *
 * @example
 * ```ts
 * computeThinking({ thinking: 'plan', content: 'ok' }, 10) // 7
 * ```
 */
export declare function computeThinking(message: Pick<Message, 'thinking' | 'content' | 'calls'>, completion: number): number;

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
export declare interface ContextSectionFormat<T> {
    /**
     * Holds text rendered once before the section's items — the section header or a group's
     * opening wrapper, for example `'<instructions>'`; omitted ⇒ the next cascade level decides
     * (defaulting to the built-in header).
     */
    readonly open?: string;
    /** Overrides one item's rendering; omitted ⇒ the next cascade level decides. */
    readonly render?: (item: T) => string;
    /**
     * Holds text rendered once after the section's items — a group's closing wrapper, for
     * example `'</instructions>'`; omitted ⇒ no closing line (there is no built-in close).
     */
    readonly close?: string;
}

/**
 * Represents a conversation — a live uncompacted tail of messages it owns directly above a flat
 * message store, plus compacted, summarized {@link Section}s, an opt-in rollup `summary`, and
 * a `summarizable` flag, with on-demand `rehydrate` and substring `search`, driven by a
 * provider-agnostic {@link ConversationSummaryHandler} seam so `core` never imports a provider.
 * Observable through its own `emitter`.
 *
 * @remarks
 * - **Live tail + sections.** The conversation owns its live tail directly — `#messages` is an
 *   insertion-ordered `Map` of immutable {@link Message}s keyed by their minted id
 *   (the same store mechanics a flat manager had, folded in: `add` / `message` / `messages` /
 *   `remove` / `clear` / `count`), exactly as a `Workspace` owns its files (no separate
 *   per-value manager). `#sections` are the compacted history (oldest → newest), each a
 *   summarized slice that retains its originals. `#summary` is the rollup (a
 *   summary-of-summaries over all sections), regenerated on each compaction when the `rollup`
 *   option is `true`; otherwise it keeps its value, `undefined` or the restored snapshot's.
 * - **`view()`.** Each section folds to one synthetic summary message (role `'assistant'` — a
 *   prior-context recap — keyed by the section's stable `id`), then the live messages
 *   verbatim. The rollup `summary` is not injected (it is separately pull-able); `view()`
 *   carries the per-section summaries, which are the compaction benefit.
 * - **`compact()`.** Folds the oldest `count - keep` live messages into a new section
 *   (its `summary` from `#summarize`), removes them from the live tail by id, regenerates the
 *   rollup (a second `#summarize` over all section summaries) when the `rollup` option is
 *   `true`, and emits `summary` (only for a regenerated rollup) then `compact`. The fold stops
 *   before the newest user message, so the request a run serves and its turns stay live. An
 *   exchange is a user message and every message after it up to the next user message. Leading
 *   messages form a separate exchange, retained until the first user exchange can also fold.
 *   A cut inside an exchange moves back to its start, so a fold removes whole exchanges.
 *   A cut inside an assistant call group, which only a group spanning two exchanges allows,
 *   moves before the group, so a tool result never stays live without its call. Returns the
 *   section, or `undefined` when nothing folds. Throws a {@link ConversationError} when no
 *   `#summarize` was supplied. A compaction calls the summarizer for the section digest, and
 *   again for the rollup only when `rollup` is `true`.
 * - **`rehydrate(id)` / `search(query)`.** `rehydrate` returns a section's full original
 *   messages (`[]` for an unknown id) and emits `rehydrate` — a pure read (the caller decides
 *   whether to re-add them; `rehydrate` never reinserts). `search` is a case-insensitive
 *   substring scan of `content` across all messages (every section's originals + the live tail).
 * - **Observable.** The owned {@link emitter} ({@link ConversationEventMap}) carries
 *   `compact` / `summary` / `rehydrate`, emitted directly, strictly after the state change;
 *   the emitter isolates a listener throw and routes it to its `error` handler (the `error`
 *   option), so a buggy observer can never corrupt a compaction.
 *
 * @example
 * ```ts
 * const conversation = new Conversation({
 * 	summarize: async (m) => `recap of ${m.length}`,
 * 	rollup: true,
 * })
 * conversation.add([
 * 	{ role: 'user', content: 'Hello' },
 * 	{ role: 'assistant', content: 'Hi there' },
 * 	{ role: 'user', content: 'What did I say?' },
 * ])
 * const section = await conversation.compact() // folds the first two into one summarized section
 * conversation.view() // [<recap of 2>, { role: 'user', content: 'What did I say?' }]
 * conversation.summary // 'recap of 1' — the rollup over the one section
 * ```
 */
export declare class Conversation implements ConversationInterface {
    #private;
    constructor(options?: ConversationOptions);
    get id(): string;
    get judgments(): JudgmentManagerInterface;
    get emitter(): EmitterInterface<ConversationEventMap>;
    get summary(): string | undefined;
    get sections(): readonly Section[];
    get summarizable(): boolean;
    get count(): number;
    add(input: MessageInput): Message;
    add(inputs: readonly MessageInput[]): readonly Message[];
    message(id: string): Message | undefined;
    messages(): readonly Message[];
    remove(id: string): boolean;
    remove(ids: readonly string[]): boolean;
    clear(): void;
    view(): readonly Message[];
    compact(options?: CompactOptions): Promise<Section | undefined>;
    rehydrate(id: string): readonly Message[];
    search(query: string): readonly Message[];
    reference(options?: ConversationReferenceOptions): string;
    snapshot(): ConversationSnapshot;
}

/**
 * Names the framing label a {@link ConversationInterface}'s `view()` prefixes onto each compacted
 * section's summary so a small model reads it as a condensed recap of earlier turns — the lean
 * `'[Summary of earlier messages] '` marker, never a literal assistant turn to echo or treat as
 * the live answer.
 *
 * @remarks
 * Deliberately a fixed, lean handful of tokens (a short bracketed marker) so the framing adds a
 * bounded `prefix × sections` overhead and never an open-ended blow-up — the
 * {@link ConversationInterface} no-bloat test guard pins exactly that. Kept here (beside
 * {@link DEFAULT_CONVERSATION_KEEP}) as the conversation layer's one tunable framing constant, so
 * the wording has a single source of truth as it is optimized against real small-model behavior
 * (the `view()` recap framing is distinct from `reference()`'s cross-conversation provenance
 * marker, which is rendered inline since it interpolates the per-call provenance `label`).
 */
export declare const CONVERSATION_RECAP_PREFIX = "[Summary of earlier messages] ";

/**
 * Reports a conversation with no {@link ConversationSummaryHandler} to fold its messages with, a
 * `sections` cap below `1`, or a judgment or judge request that JSON cannot carry — thrown by a
 * {@link ConversationInterface}'s `compact()`, its construction, or its judgment store, carrying
 * the machine-readable `code` `'SUMMARIZER' | 'SECTIONS' | 'JUDGMENT'`.
 *
 * @remarks
 * Compaction requires a summarizer (it digests the folded slice into a section summary and,
 * with the `rollup` option, regenerates the rollup); a conversation created without one can still store + `view()` its
 * live tail, but a `compact()` is a programmer error and throws this with `'SUMMARIZER'`.
 * A `sections` cap (on {@link import('./types.js').ConversationOptions} /
 * {@link import('./types.js').ConversationManagerOptions} /
 * {@link import('./types.js').CompactOptions}) must be `>= 1` — a sub-1 cap is a programmer
 * error and throws this with `'SECTIONS'`. A judgment record or a judge request that JSON cannot
 * carry, or whose copy fails its guard, is a programmer error and throws this with `'JUDGMENT'`.
 * Narrow a caught value with
 * {@link isConversationError} and branch on `error.code`.
 */
export declare class ConversationError extends Error {
    /** Names the machine-readable condition — `'SUMMARIZER'`: a `compact()` with no summarizer; `'SECTIONS'`: a sub-1 `sections` cap; `'JUDGMENT'`: a judgment or judge request that is not JSON. */
    readonly code: 'SUMMARIZER' | 'SECTIONS' | 'JUDGMENT';
    constructor(code: 'SUMMARIZER' | 'SECTIONS' | 'JUDGMENT', message: string);
}

/**
 * Maps the push observation surface of a {@link ConversationInterface} — the compaction
 * moments a fire-and-forget observer subscribes to through `conversation.emitter.on`.
 *
 * @remarks
 * `compact` carries the newly-folded {@link Section}; `collapse` carries a section
 * created by folding multiple older sections together (a bounded-`sections` cap enforcement,
 * distinct from `compact`'s fresh live-tail fold); `summary` carries the regenerated
 * conversation rollup (refreshed on each compaction when the `rollup` option is `true`, and
 * never emitted otherwise); `rehydrate` carries the `id` of a
 * section whose originals were pulled back. Listener isolation is the emitter's:
 * every event is emitted directly and a listener throw is routed to the emitter's
 * `error` handler (the `error` option), never onto this map, so a buggy observer can never
 * corrupt a compaction. A `type` alias (not `interface extends EventMap`) so the
 * type-literal satisfies `EventMap` structurally.
 */
export declare type ConversationEventMap = {
    /** Reports a new section folded from the live tail — the created section. */
    readonly compact: readonly [section: Section];
    /** Reports the conversation rollup regenerated — the new summary text. */
    readonly summary: readonly [summary: string];
    /** Reports a section's original messages pulled back — the section's `id`. */
    readonly rehydrate: readonly [id: string];
    /**
     * Reports the bounded-`sections` cap folding the oldest sections into one merged section — the
     * merged {@link Section} that replaced them.
     */
    readonly collapse: readonly [section: Section];
};

/**
 * Carries the data to author a {@link ConversationInterface} through a {@link
 * ConversationManagerInterface} — the optional `id`, a `summarize` override, a `keep` override, a
 * `sections` cap override, a `rollup` override, the reserved `on` hooks, and a
 * {@link ConversationSnapshot} to hydrate from.
 *
 * @remarks
 * `id` is the conversation's identity (minted when omitted). `summarize` overrides the
 * manager's default {@link ConversationSummaryHandler} for this conversation (omitted ⇒ the
 * manager's default flows in). `keep` overrides the manager's default retained-tail size.
 * `sections` overrides the manager's default `sections` cap. `rollup` overrides the manager's
 * default {@link ConversationOptions.rollup} switch. `on` is the reserved listener key
 * (initial {@link ConversationEventMap} listeners). `snapshot` is
 * the construction-time hydration seam — a {@link ConversationSnapshot} whose `id` / `summary` /
 * `sections` / live tail are restored into the new conversation (the live `summarize` / `keep` /
 * `on` re-supplied alongside it), the conversation analogue of
 * {@link import('@orkestrel/workspace').WorkspaceOptions}'s `seed`, carried onto
 * {@link ConversationOptions.snapshot}, that a
 * {@link ConversationManagerInterface.open} reads a stored snapshot back through; hydration is
 * silent (no events). When both `snapshot.id` and `id` are given, `snapshot.id` wins (the snapshot
 * is the conversation's identity).
 */
export declare interface ConversationInput {
    readonly id?: string;
    /** Overrides the manager's default summarizer for this conversation. */
    readonly summarize?: ConversationSummaryHandler;
    /** Overrides the manager's default retained-tail size for this conversation. */
    readonly keep?: number;
    /** Overrides the manager's default `sections` cap for this conversation. */
    readonly sections?: number;
    /** Overrides the manager's default `rollup` switch for this conversation. */
    readonly rollup?: boolean;
    readonly on?: EmitterHooks<ConversationEventMap>;
    /** Hydrates from a {@link ConversationSnapshot}, passed on as {@link ConversationOptions.snapshot}. */
    readonly snapshot?: ConversationSnapshot;
}

/**
 * Groups messages above the flat {@link MessageManagerInterface} — a live uncompacted tail plus
 * compacted, summarized {@link Section}s and an opt-in conversation rollup `summary`, with on-demand
 * `rehydrate`, substring `search`, a cross-conversation `reference`, and a JSON `snapshot`, driven
 * by a provider-agnostic {@link ConversationSummaryHandler} seam; `summarizable` reports whether
 * that seam was supplied, and the agent loop gates automatic compaction on it.
 *
 * @remarks
 * - **Live tail + sections.** The conversation owns its live uncompacted tail directly — a
 *   caller appends turns through its own message verbs (`add` mints each `id`, `message` /
 *   `messages` look up, `remove` / `clear` drop, `count` tallies), exactly as a `Workspace`
 *   owns its files (no separate per-value manager). `sections` are the compacted history
 *   (oldest → newest), each a summarized slice that retains its originals. `summary` is the
 *   conversation rollup (a summary-of-summaries over all sections), regenerated on each
 *   compaction when the `rollup` option is `true`; otherwise it keeps its value, `undefined` or
 *   the summary a restored snapshot carried.
 * - **Message verbs (the inlined store).** `add` takes one {@link MessageInput} or a batch,
 *   mints each message's `id` (a random UUID), stores it, and returns the created
 *   message(s); a stored message is immutable. `message(id)` resolves one (`undefined` when
 *   absent); `messages()` lists the live tail in insertion order; `remove` drops one by id or
 *   a batch (`true` only when every supplied id was removed); `clear` empties the tail;
 *   `count` is how many live messages are stored.
 * - **`view()` — the model input.** Each section folds to one synthetic summary message,
 *   followed by the live messages verbatim: `[...sections-as-summary-messages, ...live]`. The
 *   rollup `summary` is not injected (it is a separately pull-able digest for a
 *   cross-conversation case); `view()` carries the per-section summaries, which are the
 *   compaction benefit.
 * - **`compact()` — fold older live → a section.** Folds the oldest `count - keep` live
 *   messages, cut short at the newest user message and moved back to whole exchanges and
 *   before any call group the cut would split, into a new {@link Section} (its `summary` from
 *   `summarize`), removes them from the live tail, regenerates the rollup (a second
 *   `summarize` over all section summaries) when the `rollup` option is `true`, and emits
 *   `summary` (only for a regenerated rollup) then `compact` — returning the new section (or
 *   `undefined` when nothing folds). A compaction calls the summarizer for the section
 *   digest, and again for the rollup only when `rollup` is `true`. Throws a
 *   {@link import('./errors.js').ConversationError} when no `summarize` was supplied.
 * - **`summarizable` — whether a `compact()` can fold.** `true` when a
 *   {@link ConversationSummaryHandler} was supplied, `false` otherwise. The agent loop's automatic
 *   compaction (`AgentOptions.window`) gates on it so a conversation that has no summarizer is
 *   never auto-compacted (and the loop never throws the `compact()` `SUMMARIZER` error from the
 *   auto path). A manual `compact()` still throws without a summarizer — only the auto path is
 *   guarded.
 * - **`rehydrate(id)` / `search(query)` — read the retained originals.** `rehydrate` returns
 *   a section's full original messages (`[]` for an unknown id) and emits `rehydrate` — a
 *   pure read (the caller decides whether to re-add them; `rehydrate` never reinserts).
 *   `search` is a case-insensitive substring scan of `content` across all messages (every
 *   section's originals + the live tail).
 * - **`reference(options?)` — pull this conversation into another with provenance.** A pure
 *   string render (no model call) of a self-labeled, fenced cross-conversation block — the
 *   rollup `summary` (when included + present) plus cherry-picked excerpts — framed so a small
 *   model reads it as foreign material. Written into the active conversation's context through
 *   the active workspace (`context.workspaces.active?.write(path, block)`); the cherry-pick
 *   comes from this conversation's own `search` / `rehydrate`, never its whole history.
 * - **Observable.** The owned `emitter` ({@link ConversationEventMap}) carries
 *   `compact` / `summary` / `rehydrate`; the emitter isolates a listener throw and routes it
 *   to its `error` handler (the `error` option).
 */
export declare interface ConversationInterface {
    readonly id: string;
    /** Holds the judgments recorded beside this conversation's messages. */
    readonly judgments: JudgmentManagerInterface;
    readonly emitter: EmitterInterface<ConversationEventMap>;
    /** Holds the conversation rollup (a summary-of-summaries), regenerated on each compaction when the `rollup` option is `true`; otherwise `undefined` or the restored snapshot's summary. */
    readonly summary: string | undefined;
    /** Lists the compacted history, oldest → newest. */
    readonly sections: readonly Section[];
    /**
     * Reports whether a `compact()` can fold — `true` when a {@link ConversationSummaryHandler} was supplied.
     * The agent loop's automatic compaction (`AgentOptions.window`) gates on it (a non-summarizable
     * conversation is never auto-compacted, so the auto path never throws the `SUMMARIZER` error);
     * a manual `compact()` still throws without a summarizer.
     */
    readonly summarizable: boolean;
    /** Counts the live (uncompacted) messages stored in the tail. */
    readonly count: number;
    /**
     * Appends one {@link MessageInput} to the live tail, or a batch — mints each message's `id`
     * (a random UUID) and returns the created message or messages; a stored message is
     * immutable.
     *
     * @param input - One {@link MessageInput}, or a batch
     * @returns The created {@link Message}(s), with their minted `id`s
     */
    add(input: MessageInput): Message;
    add(inputs: readonly MessageInput[]): readonly Message[];
    /**
     * Looks up one live message by id (`undefined` when absent).
     *
     * @param id - The message id to resolve
     * @returns The {@link Message}, or `undefined` when absent
     */
    message(id: string): Message | undefined;
    /**
     * Lists every live, uncompacted message in the tail, in insertion order.
     *
     * @returns The live tail, in insertion order
     */
    messages(): readonly Message[];
    /**
     * Removes one live message by id, or a batch, from the tail — `true` only when every
     * supplied id was removed.
     *
     * @param id - One message id, or a batch
     * @returns True when every supplied id was present and removed; false otherwise
     */
    remove(id: string): boolean;
    remove(ids: readonly string[]): boolean;
    /** Empties the live tail, leaving the compacted `sections` untouched. */
    clear(): void;
    /**
     * Builds the model input for the next turn — each section as one synthetic recap message,
     * its summary prefixed with `CONVERSATION_RECAP_PREFIX` so a small model reads it as a
     * recap rather than a literal turn, then the live tail verbatim; the rollup `summary` is
     * not injected.
     *
     * @returns `[...sections-as-summary-messages, ...live messages]`
     */
    view(): readonly Message[];
    /**
     * Folds whole exchanges from the oldest `count - keep` live messages, cut short at the newest
     * user message, into a summarized {@link Section} through the
     * {@link ConversationSummaryHandler}, removes them from the live tail, regenerates the rollup
     * when the `rollup` option is `true`, and emits `summary` (only for a regenerated rollup) then
     * `compact` — resolving `undefined` when nothing folds. Throws a
     * {@link import('./errors.js').ConversationError} when no summarizer was supplied.
     *
     * @remarks
     * The effective `keep` comes from `options`, else the conversation's own. With `rollup` set,
     * regenerating the rollup runs `summarize` again, over all sections. The newest user message
     * is the request a run serves, so it and every message after it stay live. An exchange is a
     * user message and every message after it up to the next user message. Leading messages form
     * their own exchange, retained until the first user exchange can also fold. A cut inside an
     * exchange moves back to its start, so a fold removes whole exchanges. An assistant message with
     * calls and the tool messages that answer it, grouped as
     * {@link import('./helpers.js').collectToolGroups} groups them, stay on one side: a cut inside
     * a group moves before its assistant message, then back to whole exchanges again. Only a group
     * that spans two exchanges reaches that rule.
     *
     * @remarks
     * When a `sections` cap is set and the fold pushes the section count over it, an overflow
     * merge step folds the oldest sections into one — if that merge's `summarize` call throws,
     * the merge is skipped (sections transiently sit at `cap + 1`, no loss) but, with `rollup`
     * set, the rollup still regenerates over the current unmerged sections (never left stale)
     * before the error propagates; the next successful `compact()` self-heals the section count
     * back to `cap`.
     *
     * @param options - Optional {@link CompactOptions} (`keep` overrides the retained-tail size)
     * @returns The new {@link Section}, or `undefined` when nothing folded
     */
    compact(options?: CompactOptions): Promise<Section | undefined>;
    /**
     * Returns a section's full original messages — a pure read that emits `rehydrate`, empty for
     * an unknown id and never reinserting.
     *
     * @param id - The {@link Section} `id` to pull back
     * @returns The section's retained original messages (empty when no such section)
     */
    rehydrate(id: string): readonly Message[];
    /**
     * Searches `content` for a case-insensitive substring across every message — each section's
     * retained originals, then the live tail.
     *
     * @param query - The substring to match (case-insensitive)
     * @returns The matching messages, sections' originals first then the live tail
     */
    search(query: string): readonly Message[];
    /**
     * Renders this conversation as a self-labeled, fenced provenance block to pull into another
     * conversation — a pure string with no model call: a leading
     * `[Reference — conversation "<label>" — NOT part of this conversation]` marker, the rollup
     * `Summary:` when `summary` is not `false` and a rollup exists, and the cherry-picked
     * excerpts (`- role: content`) when `messages` is supplied. `label` defaults to the `id`.
     *
     * @remarks
     * The block leads with an unmistakable provenance marker
     * (`[Reference — conversation "<label>" — NOT part of this conversation]`), then optionally
     * the rollup `Summary:` (when `options.summary !== false` and a rollup exists), then the
     * cherry-picked `Relevant messages:` (each `- role: content`) when `options.messages` is
     * supplied. The intended flow is to pull another conversation B into the active conversation
     * A's active workspace: decide relevance from `B.summary`, select the few right turns with
     * `B.search(query)` / `B.rehydrate(id)`, frame them here, then
     * `A.context.workspaces.active?.write(\`conversation:${B.id}.md\`, B.reference({ label, messages }))`.
     * Keep the excerpts cherry-picked, never B's whole history — this content enters another
     * context a small model must read.
     *
     * @param options - The {@link ConversationReferenceOptions} (label / summary / cherry-picked messages)
     * @returns The rendered provenance block (a concise, fenced, self-attributed string)
     */
    reference(options?: ConversationReferenceOptions): string;
    /**
     * Serializes this conversation to a plain, JSON-serializable {@link ConversationSnapshot} —
     * its `id`, the rollup `summary`, the compacted `sections`, and the live tail; the live
     * `summarize` / `keep` are configuration re-supplied on hydrate rather than serialized.
     *
     * @remarks
     * The container serializes itself (`{ id, summary?, sections, messages, judgments? }`) — the
     * {@link ConversationStoreInterface} persistence seam's payload, the exact analogue of
     * {@link import('@orkestrel/workspace').WorkspaceInterface}'s `snapshot`. The summarizer /
     * `keep` are not serialized — they are live
     * config re-supplied on hydrate (a `ConversationSummaryHandler` is a function, not data). The snapshot
     * is the durable analogue of the `snapshot` option: a {@link ConversationManagerInterface}
     * hydrates a conversation from it through that seam (see {@link ConversationManagerInterface.open}).
     * Pure — the sections + messages are already plain immutable records (so the snapshot
     * `structuredClone`s / JSON-round-trips losslessly), and snapshotting mutates nothing.
     *
     * @returns The {@link ConversationSnapshot} (`{ id, summary?, sections, messages, judgments? }`), the
     * judgments present only when the store holds one
     */
    snapshot(): ConversationSnapshot;
}

/**
 * Registers {@link Conversation}s keyed by `id`, in insertion order, with an active pointer —
 * the id-keyed store over the conversation layer, the `active` / `switch` seam the
 * {@link import('../contexts/index.js').AgentContext} renders, and the durable `open` / `save`
 * store seam. Event-free (a registry, like
 * {@link import('@orkestrel/workspace').WorkspaceManager}); the observability lives on each
 * {@link Conversation}.
 *
 * @remarks
 * - **Registry.** Conversations live in an insertion-ordered `Map` keyed by `id`. `add(input?)`
 *   mints a {@link Conversation} (its `id` from `input` or `crypto.randomUUID()`), flowing the
 *   manager's default `#summarize` / `#keep` / `#rollup` in unless the `input` overrides them, and stores
 *   it (an already-present `id` overwrites — last write wins). `count` is the map size,
 *   `conversation(id)` looks one up, `conversations()` lists them in insertion order.
 * - **Active pointer.** `active` is the active conversation (the agent's message source the
 *   context renders), `undefined` until the first `add` (which auto-activates it — a registry
 *   with conversations always has one active). A subsequent `add` leaves `active` unchanged.
 *   `switch(id)` re-points `active` to the conversation with `id` and returns it; an unknown `id`
 *   returns `undefined` and leaves `active` unchanged (the lenient lookup style — never throws,
 *   no new error code).
 * - **Removal.** `remove` drops one by id, or a batch — `true` only when every supplied id was
 *   removed; removing the active conversation sets `active` to `undefined`. `clear` empties the registry
 *   and sets `active` to `undefined`.
 * - **Event-free.** A purely registry store — no Emitter, no events (each conversation owns
 *   its own observable `emitter`).
 *
 * @example
 * ```ts
 * const manager = new ConversationManager({ summarize: async (m) => `recap of ${m.length}` })
 * const conversation = manager.add() // auto-activates — active === conversation
 * manager.add({ id: 'scratch' }) // leaves active unchanged
 * manager.switch('scratch') // re-points active to the 'scratch' conversation
 * manager.count // 2
 * ```
 */
export declare class ConversationManager implements ConversationManagerInterface {
    #private;
    constructor(options?: ConversationManagerOptions);
    get count(): number;
    get active(): ConversationInterface | undefined;
    conversation(id: string): ConversationInterface | undefined;
    conversations(): readonly ConversationInterface[];
    add(input?: ConversationInput): ConversationInterface;
    switch(id: string): ConversationInterface | undefined;
    open(id: string): Promise<ConversationInterface | undefined>;
    save(id: string): Promise<boolean>;
    remove(ids: readonly string[]): boolean;
    remove(id: string): boolean;
    clear(): void;
}

/**
 * Registers {@link ConversationInterface}s keyed by their `id`, in insertion order, with an active
 * pointer — the id-keyed store over the conversation layer, the `active` / `switch` seam the {@link
 * AgentContextInterface} renders, and the durable `open` / `save` store seam. Event-free (a
 * registry, like {@link import('@orkestrel/workspace').WorkspaceManagerInterface}); the
 * observability lives on each {@link ConversationInterface}.
 *
 * @remarks
 * - **Registry.** `count` is how many are stored. `add(input?)` mints a
 *   {@link ConversationInterface} (its `id` from `input` or a random UUID), flowing the
 *   manager's default `summarize` / `keep` in unless the `input` overrides them; `add` of an
 *   already-present `id` overwrites it (last write wins). `conversation(id)` looks one up
 *   (`undefined` when absent); `conversations()` lists them in insertion order.
 * - **Active pointer.** `active` is the active conversation (the agent's message source the
 *   context renders), `undefined` until the first `add` (which auto-activates it — a registry
 *   with conversations always has one active). A subsequent `add` leaves `active` unchanged.
 *   `switch(id)` re-points `active` to the conversation with `id` and returns it; an unknown
 *   `id` returns `undefined` and leaves `active` unchanged (the lenient lookup style — never
 *   throws, no new error code).
 * - **Removal.** `remove` drops one by id, or a batch (the array overload declared first) — `true`
 *   only when every supplied id was removed; removing the active conversation sets `active` to `undefined`. `clear`
 *   empties the registry and sets `active` to `undefined`.
 * - **Durable open / save (the optional `store` seam).** When a {@link ConversationStoreInterface}
 *   is supplied (the `store` option), `open(id)` hydrates a conversation from the store on a registry
 *   miss (rebuilding it through the `snapshot` option, flowing the manager's
 *   default `summarize` / `keep` in) and `save(id)` persists a registered conversation's
 *   {@link ConversationInterface.snapshot}. Both are lenient without a store — `open` resolves only
 *   registered ids, `save` is a no-op (`false`) — consistent with the lenient `switch`. It mirrors
 *   the workspace package manager's `open` / `save` seam.
 * - **Event-free.** A purely registry store — no Emitter, no events (each conversation owns
 *   its own).
 */
export declare interface ConversationManagerInterface {
    readonly count: number;
    /** Holds the active conversation — the agent's message source the context renders; `undefined` until the first `add`. */
    readonly active: ConversationInterface | undefined;
    /** Looks up one conversation by id (`undefined` when absent). */
    conversation(id: string): ConversationInterface | undefined;
    /** Lists every conversation, in insertion order. */
    conversations(): readonly ConversationInterface[];
    /**
     * Mints a conversation, taking its `id` from the input or a fresh UUID and flowing the
     * manager's default `summarize` / `keep` in unless the input overrides them — auto-activates
     * the first, and an already-present `id` overwrites, last write wins.
     */
    add(input?: ConversationInput): ConversationInterface;
    /**
     * Re-points `active` at the conversation with `id` and returns it; an unknown `id` returns
     * `undefined` and leaves `active` unchanged, never throwing.
     */
    switch(id: string): ConversationInterface | undefined;
    /**
     * Resolves a conversation by id and activates it — from the registry when present, else
     * hydrated from the optional {@link ConversationStoreInterface} (`store`); `undefined` when
     * it is neither registered nor stored.
     *
     * @remarks
     * - If `id` is already registered, it is activated through `switch` and returned — no store hit.
     * - Else if a `store` is set, `store.get(id)` is awaited; on a hit the snapshot is rehydrated
     *   into a fresh {@link ConversationInterface} through the `snapshot` option
     *   (`add({ snapshot, ... })`, flowing the manager's default `summarize` / `keep` in), which
     *   registers and activates it, and it is returned.
     * - Else (no store, or a store miss) ⇒ `undefined` (lenient — no throw).
     *
     * @param id - The conversation id to open
     * @returns The activated {@link ConversationInterface}, or `undefined` when neither registered nor stored
     */
    open(id: string): Promise<ConversationInterface | undefined>;
    /**
     * Persists a registered conversation's {@link ConversationInterface.snapshot} to the optional
     * {@link ConversationStoreInterface} (`store`) — `true` when persisted, `false` when there is
     * no store or the id is unknown, and never throwing.
     *
     * @remarks
     * Lenient: when a `store` is set and `id` is registered, `store.set(conversation.snapshot())` is
     * awaited and `true` is returned; otherwise (no store, or an unknown id) it is a no-op returning
     * `false` — never a throw, consistent with the lenient `switch`.
     *
     * @param id - The id of the registered conversation to persist
     * @returns True if the snapshot was persisted; false otherwise (no store, or an unknown id)
     */
    save(id: string): Promise<boolean>;
    /**
     * Removes one conversation by id, or a batch — `true` only when every supplied id was
     * removed; clears `active` when a removed conversation was the active one.
     */
    remove(ids: readonly string[]): boolean;
    remove(id: string): boolean;
    /** Removes every conversation and clears `active`. */
    clear(): void;
}

/**
 * Configures `createConversationManager` — the default `ConversationSummaryHandler`, retained-tail
 * size, `sections` cap, and `rollup` switch the conversations it creates inherit, plus the
 * optional durable `store` backing `open` / `save`.
 *
 * @remarks
 * `summarize` is the default summarizer flowed into every conversation the manager creates
 * (a per-`add` {@link ConversationInput.summarize} overrides it); a conversation created
 * with neither cannot `compact` (it throws a `ConversationError`). `keep` is the default
 * retained-tail size (a per-`add` {@link ConversationInput.keep} overrides it), defaulting
 * to {@link import('./constants.js').DEFAULT_CONVERSATION_KEEP}. `sections` is the default cap
 * on a created conversation's compacted `sections` list (a per-`add` {@link ConversationInput.sections}
 * overrides it); omitted ⇒ unlimited. `rollup` is the default {@link ConversationOptions.rollup}
 * switch (a per-`add` {@link ConversationInput.rollup} overrides it); omitted ⇒ `false`.
 */
export declare interface ConversationManagerOptions {
    /** Supplies the default summarizer for conversations this manager creates (a per-`add` override wins). */
    readonly summarize?: ConversationSummaryHandler;
    /** Sets the default retained-tail size (a per-`add` override wins); defaults to `DEFAULT_CONVERSATION_KEEP`. */
    readonly keep?: number;
    /** Sets the default `sections` cap for conversations this manager creates (a per-`add` override wins); omitted ⇒ unlimited. */
    readonly sections?: number;
    /** Sets the default `rollup` switch for conversations this manager creates (a per-`add` override wins). Default: `false`. */
    readonly rollup?: boolean;
    /**
     * Holds the optional durable {@link ConversationStoreInterface} backing
     * {@link ConversationManagerInterface.open} / {@link ConversationManagerInterface.save} — a memory
     * / JSON / SQLite / IndexedDB store a conversation is hydrated from (`open` a registry-miss) and
     * persisted to (`save`). Omitted ⇒ the manager is registry-only: `open` resolves only what is
     * already registered, and `save` is a no-op (`false`). The exact analogue of
     * {@link import('@orkestrel/workspace').WorkspaceManagerOptions}'s `store`.
     */
    readonly store?: ConversationStoreInterface;
}

/**
 * Configures `createConversation` — the optional `id`, the reserved `on` hooks, the
 * provider-agnostic `summarize` seam, the retained-tail size, an optional cap on the compacted
 * `sections` list, the `rollup` switch, and a {@link ConversationSnapshot} to hydrate from.
 *
 * @remarks
 * `id` is the conversation's identity (a random UUID when omitted). `on` is the reserved
 * listener key (initial {@link ConversationEventMap} listeners). `summarize` is the
 * {@link ConversationSummaryHandler} compaction needs — absent ⇒ `compact()` throws a
 * {@link import('./errors.js').ConversationError} (a conversation can still store + view a
 * live tail; it cannot fold). `keep` is how many recent live messages a `compact()`
 * retains verbatim (folding only the older ones); it defaults to
 * {@link import('./constants.js').DEFAULT_CONVERSATION_KEEP} (`0` — a manual `compact()`
 * folds every exchange before the newest user message into one section). `sections` is an
 * optional cap on the
 * compacted `sections` list — when set (`>= 1`), a `compact()` that would leave more than
 * `sections` sections folds the oldest overflow into one merged section so the list never
 * exceeds `sections`, emitting `collapse`; omitted ⇒ unlimited.
 * `rollup` decides whether each compaction regenerates the rollup `summary`, a further summarizer
 * call over every section summary. Default: `false`, so no summarizer call is spent on a rollup
 * and `summary` keeps its value: `undefined`, or the summary a restored snapshot carried.
 * `snapshot` is the hydration seam — a {@link ConversationSnapshot} whose `id`, rollup
 * `summary`, compacted `sections`, and live tail are restored into the new conversation, with
 * the live `summarize` / `keep` / `on` supplied alongside it (a summarizer is a function, not
 * serialized data). Restoring is silent (no events — nothing was edited), and a `snapshot.id`
 * wins over `id` (the snapshot is the conversation's identity). It is what lets
 * `createConversation` hydrate, and what a {@link ConversationManagerInterface.open} reads a
 * stored snapshot back through.
 */
export declare interface ConversationOptions {
    readonly id?: string;
    readonly on?: EmitterHooks<ConversationEventMap>;
    /** Holds the emitter's listener-error handler — a listener throw routes here, not to a domain event. */
    readonly error?: EmitterErrorHandler;
    /** Supplies the summarizer compaction needs; absent ⇒ `compact()` throws a `ConversationError`. */
    readonly summarize?: ConversationSummaryHandler;
    /** Keeps this many recent live messages verbatim on `compact`; defaults to `DEFAULT_CONVERSATION_KEEP` (`0`). */
    readonly keep?: number;
    /** Caps the compacted `sections` list (`>= 1`); overflow folds into one merged section. Omitted ⇒ unlimited. */
    readonly sections?: number;
    /** If `true`, each compaction regenerates the rollup `summary`; if `false`, none is generated. Default: `false`. */
    readonly rollup?: boolean;
    /** Hydrates from a {@link ConversationSnapshot} — its `id` wins over `id`; restoring is silent. */
    readonly snapshot?: ConversationSnapshot;
}

/**
 * Configures {@link ConversationInterface.reference} — how to render one conversation as a
 * self-labeled, fenced provenance block to pull into another conversation by writing it to the
 * active context's active workspace: `label` defaults to the `id`, `summary` defaults to `true`,
 * and `messages` are cherry-picked excerpts defaulting to none.
 *
 * @remarks
 * The rendered block is a cross-conversation reference a small model must read as foreign
 * material, not as part of the live thread — so every member keeps it concise and unmistakably
 * attributed:
 * - `label` — the human provenance name shown in the block's leading marker (for example `'planning'`);
 *   defaults to the conversation's own `id`. It is what the model attributes the content to.
 * - `summary` — whether to include the conversation's rollup `summary` (its summary-of-summaries)
 *   in the block; defaults to `true` (the rollup is included when one exists — `undefined` until
 *   the first compaction omits the `Summary:` line). Pass `false` to exclude it.
 * - `messages` — the cherry-picked excerpts to include (each rendered `role: content`), default
 *   none. The intended source is the conversation's own `search(query)` / `rehydrate(id)` output
 *   (select the few relevant turns), not its whole history — dumping every message defeats the
 *   point (it re-bloats the destination context a small model then has to wade through).
 */
export declare interface ConversationReferenceOptions {
    /** Names the human provenance label in the block's marker; defaults to the conversation's `id`. */
    readonly label?: string;
    /** Includes the conversation's rollup `summary` (when one exists); defaults to `true`. */
    readonly summary?: boolean;
    /** Lists the cherry-picked excerpts to include (`role: content`); defaults to none. */
    readonly messages?: readonly Message[];
}

/**
 * Holds a JSON-serializable snapshot of a conversation's state — its `id`, the rollup `summary`, the
 * compacted `sections`, and the live tail `messages` — the durable payload the
 * {@link ConversationStoreInterface} persists. The exact analogue of
 * {@link import('@orkestrel/workspace').WorkspaceSnapshot}.
 *
 * @remarks
 * Pure JSON data (no class instances, no functions): each {@link Section} and
 * {@link Message} is already a plain record that `structuredClone`s / JSON-round-trips
 * losslessly. The snapshot carries the rollup `summary` (a summary-of-summaries; absent until a
 * compaction with the `rollup` option `true`, unless a restored snapshot carried one), the
 * compacted `sections` (each retaining its folded originals), and the live uncompacted tail
 * `messages` — but not the `summarize` / `keep` / `rollup`, which are live config
 * re-supplied on hydrate (a summarizer is a function, not serializable data). The snapshot the
 * container produces from itself ({@link ConversationInterface.snapshot}); the durable analogue of
 * the {@link ConversationOptions.snapshot} hydration seam. A {@link ConversationManagerInterface}
 * hydrates a conversation from it through that seam (see {@link ConversationManagerInterface.open}). It is narrowed back from an
 * untrusted storage read by {@link import('./validators.js').isConversationSnapshot} (the total
 * boundary guard).
 */
export declare interface ConversationSnapshot {
    readonly id: string;
    /** Carries recorded judgments; absent in snapshots saved before judgment storage. */
    readonly judgments?: readonly Judgment[];
    /** Holds the rollup (a summary-of-summaries); absent until a compaction with the `rollup` option `true`. */
    readonly summary?: string;
    /** Lists the compacted history, oldest → newest (each section retains its folded originals). */
    readonly sections: readonly Section[];
    /** Lists the live uncompacted tail, in insertion order. */
    readonly messages: readonly Message[];
}

/**
 * Represents one row of the table a {@link
 * import('./stores/DatabaseConversationStore.js').DatabaseConversationStore} persists
 * — a conversation `id` plus its {@link ConversationSnapshot} held as one opaque JSON column, read
 * back as `unknown` and narrowed on `get`. The exact analogue of {@link
 * import('@orkestrel/workspace').WorkspaceSnapshotRow}.
 *
 * @remarks
 * The Database twin of {@link ConversationStoreInterface} stores the snapshot whole (the `snapshot`
 * column is a `rawShape`, an opaque JSON blob — exactly as
 * {@link import('@orkestrel/workspace').WorkspaceSnapshotRow} stores a workspace snapshot), so the
 * row type stays flat and the sections/messages snapshot shape never
 * forces the contract to `Infer` it. The column therefore reads back as the broad `unknown`; the
 * store narrows it to a {@link ConversationSnapshot} on `get`
 * ({@link import('./validators.js').isConversationSnapshot}, the total boundary guard). `id`
 * mirrors {@link ConversationSnapshot.id} (the primary key), so a `set` writes
 * `{ id: snapshot.id, snapshot }`.
 */
export declare interface ConversationSnapshotRow {
    readonly id: string;
    /** Holds the whole {@link ConversationSnapshot} as one opaque JSON blob — read back as `unknown`, narrowed on `get`. */
    readonly snapshot: unknown;
}

/**
 * Persists a {@link ConversationSnapshot} durably — the async `get` / `set` / `delete` primitives,
 * keyed by a conversation id and holding no expiry, the exact analogue of {@link
 * import('@orkestrel/workspace').WorkspaceStoreInterface}.
 *
 * @remarks
 * The store persists the {@link ConversationSnapshot} — the self-contained, pure-JSON conversation
 * state — so a JSON / SQLite / IndexedDB backend swaps in without touching the manager or the
 * conversation: the in-memory default
 * {@link import('./stores/MemoryConversationStore.js').MemoryConversationStore} and its
 * driver-pluggable twin
 * {@link import('./stores/DatabaseConversationStore.js').DatabaseConversationStore} (the
 * snapshot as one opaque JSON column) share this one interface. Hydration is not a store concern
 * — a {@link ConversationManagerInterface} reads a snapshot back and rebuilds the live conversation
 * through the {@link ConversationOptions.snapshot} seam (re-supplying the live `summarize` / `keep`; see
 * {@link ConversationManagerInterface.open} / {@link ConversationManagerInterface.save}).
 *
 * Every primitive is async (a `Promise`), so a durable backend (a database round-trip) fits the
 * same shape as the memory one. The snapshot carries its own id, so `set` takes no separate id
 * param (mirroring
 * {@link import('@orkestrel/workspace').WorkspaceStoreInterface}'s `set`). Unlike a session store
 * there is no idle-TTL
 * / eviction — a persisted conversation lives until an explicit `delete`. It is concrete over
 * {@link ConversationSnapshot} — no generic parameter, because the
 * snapshot is the one payload a conversation store persists.
 */
export declare interface ConversationStoreInterface {
    /**
     * Resolves the persisted snapshot for `id`, or `undefined` if none is stored.
     *
     * @param id - The conversation id to resolve (a {@link ConversationSnapshot.id})
     * @returns The persisted snapshot, or `undefined` if absent
     */
    get(id: string): Promise<ConversationSnapshot | undefined>;
    /**
     * Inserts or replaces a snapshot under its own `snapshot.id` (no separate id param —
     * mirroring {@link import('@orkestrel/workspace').WorkspaceStoreInterface}'s `set`).
     *
     * @param snapshot - The snapshot to store (keyed by its `id`)
     */
    set(snapshot: ConversationSnapshot): Promise<void>;
    /**
     * Drops a snapshot by id; an absent id is a no-op (no throw).
     *
     * @param id - The conversation id to drop
     */
    delete(id: string): Promise<void>;
}

/**
 * Summarizes a conversation, provider-agnostically — the seam the agent runtime supplies so core
 * never imports a provider. Given the folded messages, it resolves their digest, the model-written
 * summary used to summarize a compacted {@link Section} and, when the `rollup` option is `true`,
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
export declare type ConversationSummaryHandler = (messages: readonly Message[]) => Promise<string>;

/**
 * Owns a value by serializing it to JSON and parsing the text, so the copy shares nothing with its source.
 *
 * @remarks
 * A value that JSON cannot carry, such as a cycle or a bigint, and a value that serializes to
 * nothing, such as a function, both return undefined, so a guard over the result refuses them.
 * A proxied value serializes through its traps, where a structured clone refuses it.
 *
 * @param value - The value to own
 * @returns The owned JSON copy, or undefined when the value is not JSON
 * @example
 * ```ts
 * copyJSON({ state: 'A ticket.' }) // { state: 'A ticket.' }
 * copyJSON(() => 1) // undefined
 * ```
 */
export declare function copyJSON(value: unknown): unknown;

/**
 * Creates an agent loop — an {@link AgentInterface} composing a
 * {@link ProviderInterface}, its {@link AgentContextInterface}, and a tool registry
 * into a bounded context → provider → tools → repeat turn, exposed as a one-shot
 * `generate` and a live `stream`.
 *
 * @remarks
 * One private loop drives the turn; `generate` drains the same stream `stream`
 * exposes, so they can never diverge. Each turn is bounded by one cancel folded from
 * `signal` + `timeout` + `budget` (through `AbortSignal.any`) — any trip (or `abort()`)
 * commits a partial result (the stream's `result` resolves on a cancel, rejects only
 * on a genuine provider / tool error). The `scheduler` paces between turns; tool
 * iteration is capped at `limit` (default `DEFAULT_AGENT_LIMIT`). Tools are advertised
 * structurally through `context.tools.definitions()`. Two observation surfaces: the
 * {@link AgentChunk} stream (pull — per-token content) and a typed `emitter` (push —
 * lifecycle + `usage` / `tool` / `deny` for fire-and-forget observers).
 *
 * @param provider - The {@link ProviderInterface} the loop drives each turn
 * @param options - Optional `system` / `tools` / `limit` / `timeout` / `budget` /
 *   `scheduler` / `signal` (see {@link AgentOptions})
 * @returns A working {@link AgentInterface}
 *
 * @example
 * ```ts
 * import type { ProviderInterface } from '@orkestrel/agent'
 * import { createAgent } from '@orkestrel/agent'
 * import { createTokenBudget } from '@orkestrel/budget'
 *
 * declare const provider: ProviderInterface // any concrete implementation supplied by the host app
 * const agent = createAgent(provider, {
 * 	system: 'You are concise.',
 * 	budget: createTokenBudget({ max: 50_000, scope: 'total' }),
 * })
 * agent.context.messages.add({ role: 'user', content: 'Say hi.' })
 *
 * const stream = agent.stream()
 * for await (const chunk of stream.events) {
 * 	if (chunk.category === 'token') process.stdout.write(chunk.content)
 * }
 * const result = await stream.result // { content, usage?, partial }
 * ```
 */
export declare function createAgent(provider: ProviderInterface, options?: AgentOptions): AgentInterface;

/**
 * Creates a richer turn context — an {@link AgentContextInterface} assembling a provider request
 * from the optional system prompt, the instruction registry, the workspace registry (the only
 * document channel), the conversation registry that is its `messages` source, the tool registry,
 * and the active scope, which `build()` folds into the next turn's input.
 *
 * @remarks
 * `system` is the optional system prompt; `tools` / `instructions` / `workspaces` are pre-built
 * managers to reuse (empty ones are created when omitted, so `context.workspaces` is always
 * present); `scope` is the initial active filter (`undefined` ⇒ no filtering, changeable afterwards
 * through `context.apply(...)`). The `messages` store is always fresh. `build()` folds the scoped
 * instructions — plus the active workspace's scope-filtered text files (fenced) — into one leading
 * `system` message and appends the scoped conversation (attaching the active workspace's
 * scope-filtered image files' `base64` payload to the last user message), built fresh each call; the active
 * workspace is the sole document/image context. Tools are advertised structurally (through
 * `tools.definitions()`, scope-filtered by the loop), never serialized into the prompt.
 *
 * @param options - Optional `system` / `tools` / `instructions` / `workspaces` / `scope`
 *   (see {@link AgentContextOptions})
 * @returns A working {@link AgentContextInterface}
 *
 * @example
 * ```ts
 * import { createAgentContext } from '@orkestrel/agent'
 *
 * const context = createAgentContext({ system: 'You are concise.' })
 * context.instructions.add({ name: 'tone', content: 'Be terse.' })
 * context.messages.add({ role: 'user', content: 'Hi' })
 * context.build() // [{ role: 'system', content: 'You are concise.\n\n## Instructions\n\nBe terse.' }, { role: 'user', content: 'Hi' }]
 * ```
 */
export declare function createAgentContext(options?: AgentContextOptions): AgentContextInterface;

/**
 * Creates a durable, bounded-concurrency agent-job queue — a {@link QueueInterface} over
 * serializable {@link AgentJobInput}s that composes `createQueue`: each job is rehydrated
 * through the `registry` into a live {@link AgentInterface}, run to its {@link AgentResult},
 * and subjected to the partial-as-configurable-failure policy.
 *
 * @remarks
 * - **Composes the substrate (no new engine).** The handler is the only new logic;
 *   bounded `concurrency`, `retries`, the per-attempt `timeout`, and durable persistence
 *   through `store` (+ `restore()` after a crash) are all the backing Queue's. `enqueue`
 *   returns a per-job promise.
 * - **Durable + serializable.** Because `AgentJobInput` is JSON-serializable, a `store`
 *   (for example `createMemoryQueueStore` / `createDatabaseQueueStore`) persists outstanding
 *   jobs; `restore()` re-enqueues them after a restart and the `registry` rehydrates the
 *   live pieces from the names — so a job survives a crash.
 * - **Partial policy.** A partial result throws an
 *   {@link import('./errors.js').AgentJobError} by default, so a job cancelled by its
 *   attempt deadline / a queue abort retries while attempts remain; `partial: true`
 *   resolves the partial as success instead.
 * - **Cancellation threads through.** The handler passes `context.signal` into
 *   `registry.build`, so a queue `abort()` or a per-attempt timeout cancels the in-flight
 *   agent (which commits a partial → throws → retries / fails per policy).
 *
 * @param options - The `registry`, the `partial` policy, and the substrate knobs
 *   (`concurrency` / `retries` / `timeout` / `store`) (see {@link AgentQueueOptions})
 * @returns A {@link QueueInterface} of {@link AgentJobInput} → {@link AgentResult}
 *
 * @example
 * ```ts
 * import { createAgentQueue, createAgentRegistry } from '@orkestrel/agent'
 * import { createMemoryQueueStore } from '@orkestrel/queue'
 *
 * const registry = createAgentRegistry({ providers: { main: provider } })
 * const store = createMemoryQueueStore(agentJobShape) // survives a restart through restore()
 * const queue = createAgentQueue({ registry, concurrency: 2, retries: 1, store })
 * const result = await queue.enqueue({ provider: 'main', messages: [{ role: 'user', content: 'ok?' }] })
 * ```
 */
export declare function createAgentQueue(options: AgentQueueOptions): QueueInterface<AgentJobInput, AgentResult>;

/**
 * Creates an agent registry — an {@link AgentRegistryInterface} holding the named pools of
 * live, non-serializable pieces (providers, tools, authorities, schedulers) that a
 * serializable {@link AgentJobInput}'s names resolve against, and `build`ing a seeded,
 * signal-wired {@link AgentInterface} from a job.
 *
 * @remarks
 * `providers` is required; `tools` / `authorities` / `schedulers` are optional pools.
 * The accessors (`provider` / `tool` / `authority` / `scheduler`) throw an
 * {@link import('./errors.js').AgentError} carrying `code: 'REGISTRY'` and the message
 * `unknown <category>: <name>` on an unregistered name — a misconfigured or crash-restored
 * job fails loudly rather than running with a missing dependency. `build(input, signal)`
 * resolves the names, rebuilds the token budget from its ceiling, seeds the agent's
 * context with the job's messages, and threads `signal` so a queue / runner abort
 * propagates. This is the bridge that makes durable, serializable agent jobs runnable.
 *
 * @param options - The named pools (see {@link AgentRegistryOptions})
 * @returns A working {@link AgentRegistryInterface}
 *
 * @example
 * ```ts
 * import { createAgentRegistry } from '@orkestrel/agent'
 * import type { ProviderInterface } from '@orkestrel/agent'
 * import { createTool } from '@orkestrel/tool'
 *
 * declare const provider: ProviderInterface // any concrete implementation supplied by the host app
 * const registry = createAgentRegistry({
 * 	providers: { main: provider },
 * 	tools: { add: createTool({ name: 'add', execute: (a) => Number(a.x) + Number(a.y) }) },
 * })
 * const agent = registry.build({ provider: 'main', messages: [{ role: 'user', content: 'Hi.' }] })
 * ```
 */
export declare function createAgentRegistry(options: AgentRegistryOptions): AgentRegistryInterface;

/**
 * Creates an agent-job runner — a {@link RunnerInterface} over serializable
 * {@link AgentJobInput}s that composes `createRunner` (one-shot, ordered, fail-fast), each unit
 * rehydrated through the `registry` and subjected to the partial policy. The runner also carries
 * sub-agent fan-out: a parent job's handler can `controller.spawn(childJob)`.
 *
 * @remarks
 * - **Composes the substrate (no new engine).** Bounded `concurrency`, `retries`, the
 *   per-attempt `timeout`, ordered results, and fail-fast are all the backing Runner's;
 *   the handler adds only rehydration + the partial policy.
 * - **Sub-agent fan-out.** Each unit's handler receives a `ControllerInterface` whose
 *   `spawn(childJob)` launches a child agent job through the same bounded queue (the
 *   child's result joins the run after the declared units, in spawn order). On a bounded
 *   runner, fan out and return — do not inline-`await` a spawn from within the handler (a
 *   slot-holding handler awaiting its own spawn can deadlock; see `ControllerInterface`).
 * - **Partial policy + cancellation.** Same as `createAgentQueue`: a partial result
 *   throws by default (the run's fail-fast engages), `partial: true` resolves it; the
 *   handler threads `controller.signal` into `registry.build`, so a runner abort / a
 *   per-attempt timeout cancels the agent.
 *
 * @param options - The `registry`, the `partial` policy, and the substrate knobs
 *   (`concurrency` / `retries` / `timeout`) (see {@link AgentRunnerOptions})
 * @returns A {@link RunnerInterface} of {@link AgentJobInput} → {@link AgentResult}
 *
 * @example
 * ```ts
 * import { createAgentRunner, createAgentRegistry } from '@orkestrel/agent'
 *
 * const registry = createAgentRegistry({ providers: { main: provider } })
 * const runner = createAgentRunner({ registry, concurrency: 2 })
 * // Run two jobs; the first fans out a child sub-agent then returns.
 * const child = { provider: 'main', messages: [{ role: 'user', content: 'child' }] }
 * const parent = { provider: 'main', messages: [{ role: 'user', content: 'parent' }] }
 * const results = await runner.execute([parent, child]) // declared first, then any spawns
 * ```
 */
export declare function createAgentRunner(options: AgentRunnerOptions): RunnerInterface<AgentJobInput, AgentResult>;

/**
 * Creates a policy gate — an {@link AuthorityInterface} the agent loop consults before
 * each tool call runs, evaluating the ordered rules first-match-wins and falling back
 * to the configured default when none match.
 *
 * @remarks
 * `rules` are evaluated in order — the first whose `match` is true decides (a matched
 * rule allows unless its `allowed` is explicitly `false`). When no rule matches, the
 * `fallback` decides; it defaults to `{ zone: DEFAULT_AUTHORITY_ZONE, allowed: true }`
 * (allow-unmatched — a rules list of denials acts as a denylist). Pass an
 * `allowed: false` `fallback` to flip the gate to deny-by-default (an allowlist). Wire
 * the result into `createAgent` through `AgentOptions.authority`: a denied call is fed back
 * to the model as a denial `ToolResult` (not executed, no budget cost), so the model
 * can react. Synchronous — `evaluate` returns the verdict directly.
 *
 * @param options - Optional `rules` (ordered) and `fallback` (see {@link AuthorityOptions})
 * @returns A working {@link AuthorityInterface}
 *
 * @example
 * ```ts
 * import { createAgent, createAuthority } from '@orkestrel/agent'
 *
 * // Deny the `delete` tool, allow everything else.
 * const authority = createAuthority({
 * 	rules: [{ match: (c) => c.call.name === 'delete', zone: 'restricted', allowed: false }],
 * })
 * const agent = createAgent(provider, { tools, authority })
 * ```
 */
export declare function createAuthority(options?: AuthorityOptions): AuthorityInterface;

/**
 * Creates an empty unbounded async channel — a {@link ChannelInterface} a producer writes
 * values into (`push`) and ends (`close` / `fail`) regardless of consumption, while a
 * consumer reads them back live through `drain`.
 *
 * @remarks
 * Write and read are decoupled, so the producer never waits for a consumer: an agent's eager
 * pump writes each chunk into one, which is why a run's `result` settles whether or not the
 * live events are drained. A value pushed at an already-parked consumer is delivered, buffered
 * values are yielded before the end is reported, and the first failure wins.
 *
 * @typeParam T - The value type the channel carries
 * @returns A fresh, empty {@link ChannelInterface}
 *
 * @example
 * ```ts
 * import { createChannel } from '@orkestrel/agent'
 *
 * const channel = createChannel<number>()
 * channel.push(1)
 * channel.close()
 * for await (const value of channel.drain()) {
 * 	value // 1
 * }
 * ```
 */
export declare function createChannel<T>(): ChannelInterface<T>;

/**
 * Creates a conversation — a {@link ConversationInterface} grouping messages above a flat
 * message store it owns directly, with compaction into summarized sections, an opt-in
 * rollup `summary`, on-demand `rehydrate`, and substring `search`, driven by a
 * provider-agnostic {@link ConversationSummaryHandler} seam.
 *
 * @remarks
 * Append turns through the conversation's own `add` (the live tail it owns); `view()` is the model input
 * (each section as a summary message, then the live tail). `compact()` folds the older live
 * messages into a summarized {@link Section}, whole exchanges at a time, and regenerates the
 * rollup when `rollup` is `true` — it requires a `summarize` (omitted ⇒ `compact()` throws a
 * `ConversationError`); `keep` retains a recent tail (default `DEFAULT_CONVERSATION_KEEP` —
 * fold up to the newest user message). `rehydrate(id)` / `search(query)` read the retained
 * originals. Observable (`emitter` — `compact` / `summary` / `rehydrate`), wired
 * through the reserved `on` option; the emitter isolates a listener throw and routes it to
 * its `error` handler (the `error` option), so it can never corrupt a compaction.
 *
 * @param options - Optional `id` / `on` hooks + the `summarize` seam + `keep` + `rollup` (see {@link ConversationOptions})
 * @returns A working {@link ConversationInterface}
 *
 * @example Conversations & compaction
 * ```ts
 * import type { ProviderInterface } from '@orkestrel/agent'
 * import { createConversation } from '@orkestrel/agent'
 *
 * declare const provider: ProviderInterface // any concrete implementation supplied by the host app
 * // The summarizer seam — built from the provider by the runtime; core stays provider-agnostic.
 * // Append the instruction as the FINAL user turn: a chat model emits nothing when the prompt
 * // ends on an assistant turn, so a leading-system instruction is unreliable.
 * const conversation = createConversation({
 * 	summarize: async (messages) =>
 * 		(
 * 			await provider.generate(
 * 				[
 * 					...messages,
 * 					{ id: 's', role: 'user', content: 'Summarize the conversation so far concisely.' },
 * 				],
 * 				AbortSignal.timeout(30_000),
 * 			)
 * 		).content,
 * 	keep: 2, // retain at least the two most recent messages verbatim on each compaction
 * 	rollup: true, // also regenerate the rollup summary on each compaction
 * })
 * conversation.add([
 * 	{ role: 'user', content: 'My name is Ada.' },
 * 	{ role: 'assistant', content: 'Nice to meet you, Ada.' },
 * 	{ role: 'user', content: 'Book a table for two at 19:00.' },
 * 	{ role: 'assistant', content: 'Booked for two at 19:00.' },
 * 	{ role: 'user', content: 'What did I say my name was?' },
 * ])
 *
 * const section = await conversation.compact() // folds the first exchange → a summarized section
 * conversation.view() // [<section summary message>, ...the retained recent exchanges] — the model input
 * conversation.summary // the regenerated rollup (a summary-of-summaries over all sections)
 * conversation.search('ada') // case-insensitive across sections' originals + the live tail
 * section && conversation.rehydrate(section.id) // the section's full original messages (a pure read)
 * ```
 */
export declare function createConversation(options?: ConversationOptions): ConversationInterface;

/**
 * Creates a conversation registry — a {@link ConversationManagerInterface} holding
 * {@link ConversationInterface}s keyed by their `id`, in insertion order, with an active pointer:
 * the id-keyed store over the conversation layer plus the `active` / `switch` seam the context
 * renders. `add` auto-activates the first conversation and flows the registry's default
 * `summarize` / `keep` into every conversation it creates.
 *
 * @remarks
 * Starts empty; `add(input?)` mints a {@link ConversationInterface} (its `id` from the input
 * or a random UUID), flowing the manager's default `summarize` / `keep` in unless the input
 * overrides them, and stores it (an already-present `id` overwrites — last write wins) — and
 * auto-activates the first one (a registry with conversations always has one `active`); a later
 * `add` leaves `active` unchanged. `switch(id)` re-points `active` (an unknown `id` returns
 * `undefined`, leaving `active` unchanged — lenient, never throws); `conversation(id)` /
 * `conversations()` look up; `remove` (one or a batch) reports `true` only when every supplied id
 * was removed and clears `active` if it was a removed one; `clear` empties it and clears `active`.
 * Event-free
 * (each conversation owns its own observable `emitter`). A conversation created with neither a
 * manager default nor a per-`add` `summarize` cannot `compact` (it throws a `ConversationError`).
 *
 * @param options - Optional default `summarize` / `keep` (see {@link ConversationManagerOptions})
 * @returns An empty {@link ConversationManagerInterface}
 *
 * @example
 * ```ts
 * import { createConversationManager } from '@orkestrel/agent'
 *
 * const conversations = createConversationManager({ summarize: async (m) => `recap of ${m.length}` })
 * const chat = conversations.add() // auto-activates — conversations.active === chat
 * chat.add({ role: 'user', content: 'Hello' })
 * ```
 */
export declare function createConversationManager(options?: ConversationManagerOptions): ConversationManagerInterface;

/**
 * Creates a {@link DatabaseConversationStore} over any {@link DriverInterface}, defaulting to
 * `createMemoryDriver()` — the durable, driver-pluggable backing for the conversation persistence
 * seam, holding each snapshot as one opaque JSON column and standing as the opt-in twin of
 * {@link createMemoryConversationStore}. The exact twin of
 * {@link import('@orkestrel/workspace').createDatabaseWorkspaceStore}.
 *
 * @remarks
 * Builds a one-table database (`conversations`, keyed by `id`) over the supplied driver, the snapshot
 * held as one opaque JSON column — the column map is `{ id; snapshot }` where `snapshot` is a
 * `rawShape` (a JSON blob), exactly as
 * {@link import('@orkestrel/workspace').createDatabaseWorkspaceStore} stores its snapshot. The
 * snapshot is already a complete, self-contained, pure-JSON payload, so storing it whole is lossless
 * and keeps the row type flat (the column reads back as `unknown`, narrowed on `get` by
 * {@link import('./validators.js').isConversationSnapshot}). The `driver` defaults to
 * {@link createMemoryDriver}, so the store also works in memory out of the box; pass a server
 * `createJSONDriver` / `createSQLiteDriver` (or a browser IndexedDB driver) for a persistent one —
 * the durability is the driver's job, the store engine is shared. It swaps in behind
 * {@link ConversationStoreInterface} without touching the manager or the conversation.
 *
 * @param driver - The storage backend the snapshots persist to (defaults to {@link createMemoryDriver})
 * @returns A {@link ConversationStoreInterface} over the driver
 *
 * @example
 * ```ts
 * import { createConversationManager, createDatabaseConversationStore } from '@orkestrel/agent'
 * import { createMemoryDriver } from '@orkestrel/database'
 *
 * const store = createDatabaseConversationStore(createMemoryDriver()) // a durable driver swaps in here
 * const manager = createConversationManager({ store })
 * const conversation = manager.add()
 * conversation.add({ role: 'user', content: 'hello' })
 * await manager.save(conversation.id)            // persist the conversation (one JSON column)
 * ```
 */
export declare function createDatabaseConversationStore(driver?: DriverInterface): ConversationStoreInterface;

/**
 * Creates an instruction — an immutable {@link InstructionInterface} (a named directive)
 * from its `name` / `content` and optional `priority`, the `id` minted at construction.
 *
 * @remarks
 * Only `name` / `content` are required; `priority` orders the instruction in an
 * {@link InstructionManagerInterface}'s rendered list (higher first) and defaults to `0`.
 * Stored immutable — never mutated after creation.
 *
 * @param input - `name` / `content` (required) and an optional `priority` (see
 *   {@link InstructionInput})
 * @returns A working {@link InstructionInterface}
 *
 * @example
 * ```ts
 * import { createInstruction } from '@orkestrel/agent'
 *
 * const instruction = createInstruction({ name: 'tone', content: 'Be concise.', priority: 5 })
 * ```
 */
export declare function createInstruction(input: InstructionInput): InstructionInterface;

/**
 * Creates an instruction registry — an {@link InstructionManagerInterface} holding
 * immutable instructions keyed by `name`, listed by descending `priority`.
 *
 * @remarks
 * Starts empty; `add` (one or a batch) mints each `id` and overwrites a same-name
 * instruction (last write wins); `instructions()` lists them sorted by descending
 * `priority` (stable for ties); `open` / `render` / `close` are the build contract a richer
 * context renders an instructions block with; `remove` (one or a batch) reports `true` only
 * when every supplied name was removed; `clear` empties it. Carries an observable `emitter`
 * ({@link import('./types.js').InstructionManagerEventMap}) wired through the reserved `on`
 * option; the emitter isolates a listener throw and routes it to its `error` handler
 * (the `error` option), so it can never corrupt a mutation. An optional `format`
 * override is the manager-options level of the `AgentContext` build cascade (consulted by
 * `open` / `render` / `close`, beating the built-in; a per-item
 * `InstructionInput.override` still beats it).
 *
 * @param options - Optional `on` hooks + a `format` override (see {@link InstructionManagerOptions})
 * @returns An empty {@link InstructionManagerInterface}
 *
 * @example
 * ```ts
 * import { createInstructionManager } from '@orkestrel/agent'
 *
 * const instructions = createInstructionManager()
 * instructions.add({ name: 'tone', content: 'Be concise.', priority: 5 })
 * ```
 */
export declare function createInstructionManager(options?: InstructionManagerOptions): InstructionManagerInterface;

/**
 * Creates a conversation ledger after checking its thresholds, allocation, and tool names.
 * @param provider - The provider that answers requests
 * @param options - The judge, projection policy, capacity, and agent bounds
 * @returns The ledger and its owned conversation and agent
 * @throws {LedgerError} Thrown when an option lies outside its documented bounds
 * @example
 * ```ts
 * const ledger = createLedger(provider, options)
 * const reply = await ledger.respond('Check the order.')
 * ```
 */
export declare function createLedger(provider: ProviderInterface, options: LedgerOptions): LedgerInterface;

/**
 * Creates the in-memory conversation store — a {@link ConversationStoreInterface} backed by a
 * process-lifetime `Map` of {@link import('./types.js').ConversationSnapshot}s keyed by conversation
 * id, the default backing for the durable {@link ConversationManagerInterface.open} /
 * {@link ConversationManagerInterface.save} seam. The exact twin of
 * {@link import('@orkestrel/workspace').createMemoryWorkspaceStore}.
 *
 * @remarks
 * A plain `Map` (the snapshot is already pure JSON, so no encoding is needed for the memory tier),
 * the structural twin of {@link import('@orkestrel/workspace').createMemoryWorkspaceStore}.
 * `get` / `set` / `delete` are async (the
 * same shape a durable backend fits); unlike a session store there is no idle-TTL / eviction — a
 * persisted conversation lives until an explicit `delete`. Its driver-pluggable twin is
 * {@link createDatabaseConversationStore} (the snapshot as one opaque JSON column over a `databases`
 * table) — for a durable store pass it a JSON / SQLite / IndexedDB driver, and it swaps in without
 * touching the manager or the conversation. Hydration stays a manager concern: read a snapshot back
 * and rebuild the live conversation through the `snapshot` option (re-supplying the live
 * `summarize` / `keep`).
 *
 * @returns A memory-backed {@link ConversationStoreInterface}
 *
 * @example
 * ```ts
 * import { createConversationManager, createMemoryConversationStore } from '@orkestrel/agent'
 *
 * const store = createMemoryConversationStore()
 * const manager = createConversationManager({ store })
 * const conversation = manager.add()
 * conversation.add({ role: 'user', content: 'hello' })
 * await manager.save(conversation.id)            // persist the conversation
 * ```
 */
export declare function createMemoryConversationStore(): ConversationStoreInterface;

/**
 * Creates an authorized relay handler that validates a bounded JSON request before streaming.
 *
 * @remarks
 * Answers with the `401` status when authorization refuses or throws, the `400`
 * status when the body is missing, unreadable, or invalid, the `413` status when
 * the body fills its byte budget or the inbound read is aborted, and the `502`
 * status when the upstream provider call cannot be constructed. Refusals carry no body.
 *
 * @param options - The upstream provider, authorization decision, and optional byte budget
 * @returns A fetch-standard handler suitable for a router
 * @example Mounting the relay on your server
 * ```ts
 * import type { ProviderInterface } from '@orkestrel/agent'
 * import { createRelay } from '@orkestrel/agent'
 * import { createDispatcher } from '@orkestrel/router'
 * import { createServer } from '@orkestrel/server'
 *
 * declare const upstream: ProviderInterface // the server-side provider holding the credential
 * declare const bearer: string
 *
 * const handler = createRelay({
 * 	provider: upstream,
 * 	authorize: (request) => request.headers.get('authorization') === `Bearer ${bearer}`,
 * })
 * const dispatcher = createDispatcher({
 * 	routes: [{ method: 'POST', path: '/relay', handler }],
 * })
 *
 * export function serve(request: Request): Promise<Response> {
 * 	return dispatcher.handle(request, undefined)
 * }
 *
 * const server = createServer({ dispatcher, state: () => undefined })
 * await server.start()
 * process.on('SIGTERM', () => server.stop()) // signal cancellation, drain, then close the listener
 * ```
 */
export declare function createRelay(options: RelayOptions): RelayHandler;

/**
 * Creates a provider that carries calls through a relay endpoint.
 *
 * @remarks
 * This is the browser end alone. {@link createRelay} mounts the server end, and its example
 * is the server half this one pairs with.
 *
 * @param options - The endpoint, parser factory, and HTTP call configuration
 * @returns The concrete relay provider
 * @example Reaching the relay from the browser
 * ```ts
 * import type { ProviderInterface } from '@orkestrel/agent'
 * import { createRelayProvider } from '@orkestrel/agent'
 * import { createAbort } from '@orkestrel/abort'
 * // The browser application supplies this parser dependency.
 * import { createNDJSONParser } from '@orkestrel/ndjson'
 *
 * declare const bearer: string
 * const abort = createAbort()
 * const messages = [{ id: '1', role: 'user', content: 'Say hello.' }] as const
 *
 * const browser: ProviderInterface = createRelayProvider({
 * 	url: 'https://app.example/relay',
 * 	parser: createNDJSONParser,
 * 	headers: () => ({ authorization: `Bearer ${bearer}` }),
 * })
 * const result = await browser.generate(messages, abort.signal) // a ProviderResult like a local provider's
 * ```
 */
export declare function createRelayProvider(options: RelayProviderOptions): RelayProvider;

/**
 * Creates a named scope — an immutable {@link ScopeInterface} from its `name` and its
 * per-category allow-lists, the `id` minted at construction.
 *
 * @remarks
 * Each list is three-way: `undefined` ⇒ no constraint on that category (all pass), `[]` ⇒
 * none pass, a non-empty list ⇒ only the listed keys pass. `narrow(config)` composes a
 * tighter child by set-intersection (an `undefined` side imposing no constraint). Stored
 * immutable — never mutated after creation (`narrow` returns a new scope).
 *
 * @param input - `name` (required) and the optional `instructions` / `tools` / `files`
 *   allow-lists (see {@link ScopeInput})
 * @returns A working {@link ScopeInterface}
 *
 * @example
 * ```ts
 * import { createScope } from '@orkestrel/agent'
 *
 * const reader = createScope({ name: 'reader', tools: ['search', 'read'] })
 * reader.narrow({ tools: ['read', 'write'] }).tools // ['read'] — intersection tightens
 * ```
 */
export declare function createScope(input: ScopeInput): ScopeInterface;

/**
 * Creates a scope registry — a {@link ScopeManagerInterface} holding immutable scopes keyed
 * by their minted `id`, in insertion order.
 *
 * @remarks
 * Starts empty; `create` mints each scope's `id` and stores it (keyed by `id`, so it
 * always adds — two scopes may share a `name`); `scopes()` lists them in insertion order;
 * `remove` (one or a batch) reports `true` only when every supplied id was removed; `clear`
 * empties it. Carries an observable `emitter`
 * ({@link import('./types.js').ScopeManagerEventMap}) wired through the reserved `on`
 * option; the emitter isolates a listener throw and routes it to its `error` handler
 * (the `error` option), so it can never corrupt a mutation.
 *
 * @param options - Optional `on` hooks (see {@link ScopeManagerOptions})
 * @returns An empty {@link ScopeManagerInterface}
 *
 * @example
 * ```ts
 * import { createScopeManager } from '@orkestrel/agent'
 *
 * const scopes = createScopeManager()
 * const reader = scopes.create({ name: 'reader', tools: ['search'] })
 * ```
 */
export declare function createScopeManager(options?: ScopeManagerOptions): ScopeManagerInterface;

/**
 * Creates a selection handler that judges screened messages and retains uncertain subjects.
 *
 * @remarks
 * Reuses matching judgments without spending usage or the fresh question limit.
 * A judge error for one subject leaves that subject undecided, so it is kept, and the handler
 * asks about the next subject. When the judge failed for every subject asked and no recorded
 * judgment was reused, the handler returns the full view with `fault` set, its cause the first
 * judge error. A cancel returns the full view, the recorded keys, spent usage, and the cancel
 * cause as `fault`. The handler sends nothing until an application invokes or installs it.
 *
 * @param options - The judge, screen, needed criterion, and fresh question limit
 * @returns The application-installed selection handler
 * @throws SelectionError Thrown when the threshold is outside the interval above 0.5 up to and including 1 (code `'THRESHOLD'`) or the limit is not a nonnegative safe integer (code `'LIMIT'`)
 * @example
 * ```ts
 * const select = createSelection({ judge, screen, needed, limit: 12 })
 * ```
 */
export declare function createSelection(options: SelectionOptions): SelectionHandler;

/**
 * Creates a judge that sends every question through the configured System One server.
 *
 * @param options - The server origin, model, and optional transport, headers, and timeout
 * @returns The configured judge behind its shared interface
 * @example
 * ```ts
 * const judge = createSystemOneJudge({ url: 'http://localhost:11434', model: 'tev1:0.8b' })
 * ```
 */
export declare function createSystemOneJudge(options: SystemOneJudgeOptions): JudgeInterface;

/**
 * Creates a fresh stream-stateful `<think>` separator — a {@link ThinkSplitterInterface} that
 * splits a thinking model's in-content `<think>…</think>` reasoning spans away from the answer,
 * delta by delta, so a provider yields clean content alone and surfaces the accumulated
 * reasoning as {@link import('./types.js').ProviderResult.thinking}. One splitter serves one
 * stream.
 *
 * @remarks
 * Feed each raw wire delta through `split(delta)` (it returns the clean content to
 * surface — possibly `''` mid-think) and settle the stream end with `flush()` (a held
 * partial open tag that never completed returns as final content; an unclosed think
 * span lands on `thinking`). Tags split across deltas are held back until
 * disambiguated, multiple spans accumulate in order, and a nested-looking `<think>`
 * inside an open span is thinking text. One splitter serves one stream — create
 * a fresh one per provider call.
 *
 * @returns A fresh {@link ThinkSplitterInterface} (state empty, outside any span)
 *
 * @example
 * ```ts
 * import { createThinkSplitter } from '@orkestrel/agent'
 *
 * const splitter = createThinkSplitter()
 * const clean = splitter.split('<think>plan the answer</think>Here it is.')
 * clean // 'Here it is.'
 * splitter.thinking // 'plan the answer'
 * ```
 */
export declare function createThinkSplitter(): ThinkSplitterInterface;

/**
 * Carries application criteria and a required probability cutoff.
 *
 * @remarks
 * `yes` describes the true side and `no` the false side. `threshold` must be finite,
 * greater than 0.5, and at most 1. No default is supplied. A probability at or over
 * the cutoff means true, at or under its complement means false, and between means absent.
 */
export declare interface Criterion {
    readonly yes: string;
    readonly no: string;
    readonly threshold: number;
}

/**
 * Cuts entries to a room and names how many it left out.
 *
 * @remarks
 * The cut keeps at least one entry. When it leaves entries out, its last line reads
 * `N older items not shown; name a narrower topic to narrow the recall`, which
 * {@link matchesCutLine} recognizes.
 *
 * @param entries - The entries in the order they are kept
 * @param room - The estimate units the joined entries can take
 * @returns The kept entries followed by the cut line when any were left out, joined by newlines
 *
 * @example
 * ```ts
 * cutListing(['first entry', 'second entry'], 1) // 'first entry\n1 older item not shown; name a narrower topic to narrow the recall'
 * ```
 */
export declare function cutListing(entries: readonly string[], room: number): string;

/**
 * Backs a {@link ConversationStoreInterface} with one table of the `databases` layer — a
 * conversation's durable state is a row holding the snapshot as one opaque JSON column, narrowed
 * back on `get` by {@link import('../validators.js').isConversationSnapshot}, so persistence
 * reduces to keyed point-access (`get` / `set` / `delete`) over a {@link TableInterface}. The
 * driver-pluggable twin of the plain-`Map`
 * {@link import('./MemoryConversationStore.js').MemoryConversationStore}, and the exact twin of
 * {@link import('@orkestrel/workspace').DatabaseWorkspaceStore}.
 *
 * @remarks
 * The store is driver-agnostic: it holds a single {@link TableInterface} whose backend (memory,
 * JSON, SQLite, IndexedDB) is chosen by whoever builds it (the factories), so a JSON / SQLite /
 * IndexedDB backend swaps in without touching the
 * {@link import('../ConversationManager.js').ConversationManager} or the
 * {@link import('../Conversation.js').Conversation} — the same seam as
 * {@link import('@orkestrel/workspace').DatabaseWorkspaceStore}. The
 * driver defaults to memory ({@link import('../factories.js').createDatabaseConversationStore}
 * passes `createMemoryDriver()`), so it also works in memory out of the box; you opt into the
 * durable plumbing by passing a JSON / SQLite / IndexedDB driver.
 *
 * The {@link ConversationSnapshot} is stored as one opaque JSON column — the table is a row of
 * `{ id; snapshot }` ({@link ConversationSnapshotRow}), the snapshot the whole JSON blob (a
 * `rawShape` column the factory builds) — exactly as `DatabaseWorkspaceStore` stores its snapshot.
 * The snapshot is already a complete, self-contained, pure-JSON payload, so storing it whole is
 * lossless and keeps the row type flat (`snapshot` reads back as `unknown`).
 *
 * - **`set(snapshot)` upserts under the snapshot's own `id`** (no separate id param) — it writes
 *   the row `{ id: snapshot.id, snapshot }`.
 * - **`get(id)` resolves the stored snapshot for an id**, narrowing the opaque JSON column back to
 *   a {@link ConversationSnapshot} ({@link import('../validators.js').isConversationSnapshot} — the
 *   total guard for an untrusted storage read), or `undefined` if none is stored.
 * - **`delete(id)` drops a snapshot by id**; an absent id is a no-op (no throw).
 *
 * Unlike a session store there is no idle-TTL / eviction — a persisted conversation lives until an
 * explicit `delete`. The public surface is exactly `get` / `set` / `delete` — no extra members (the
 * method bijection with {@link ConversationStoreInterface}). Hydration stays a caller concern: a
 * {@link import('../ConversationManager.js').ConversationManager} reads a snapshot back and rebuilds
 * the live conversation through the `snapshot` option (its `open` / `save`).
 *
 * @example
 * ```ts
 * import { createConversation, createDatabaseConversationStore } from '@orkestrel/agent'
 * import { createMemoryDriver } from '@orkestrel/database'
 *
 * const store = createDatabaseConversationStore(createMemoryDriver()) // a durable driver swaps in here
 * const conversation = createConversation()
 * conversation.add({ role: 'user', content: 'hello' })
 * await store.set(conversation.snapshot())        // persist the conversation (one JSON column)
 * const snapshot = await store.get(conversation.id)
 * await store.delete(conversation.id)             // drop it
 * ```
 */
export declare class DatabaseConversationStore implements ConversationStoreInterface {
    #private;
    /**
     * Wraps a table as a conversation store.
     *
     * @param table - The {@link TableInterface} holding the snapshots — its row is the
     *   {@link ConversationSnapshotRow} `{ id; snapshot }` shape (the snapshot one opaque JSON column)
     */
    constructor(table: TableInterface<ConversationSnapshotRow>);
    /** Resolves the persisted snapshot for `id`, narrowing the opaque JSON column back to a `ConversationSnapshot`. */
    get(id: string): Promise<ConversationSnapshot | undefined>;
    /** Inserts or replaces under the snapshot's own `id` (no separate id param) — the row is `{ id, snapshot }`. */
    set(snapshot: ConversationSnapshot): Promise<void>;
    /** Drops a snapshot by id; an absent id is a no-op (no throw). */
    delete(id: string): Promise<void>;
}

/** Lists the categories whose messages state what the desk acts on, which the briefing renders. */
export declare const DECISIVE_CATEGORIES: readonly LedgerCategory[];

/**
 * Caps an {@link AgentInterface} turn's tool iterations by default — `10` context → provider →
 * tools cycles before the loop stops, so a model that keeps requesting tools can never loop
 * forever. Overridable per agent through `AgentOptions.limit`.
 */
export declare const DEFAULT_AGENT_LIMIT = 10;

/**
 * Names the zone an {@link AuthorityInterface}'s default fallback {@link AuthorityDecision}
 * carries — `'default'`, the classification for a tool call that matched no rule. Paired with
 * the default `allowed: true` fallback, an unmatched call is allowed under this zone, so a
 * rules list of denials acts as a denylist; a caller wanting deny-by-default supplies an
 * `allowed: false` `fallback` of their own (see `AuthorityOptions`).
 */
export declare const DEFAULT_AUTHORITY_ZONE = "default";

/**
 * Sets the default number of recent live messages a {@link ConversationInterface}'s `compact()`
 * retains verbatim — `0`, so a manual `compact()` keeps no recent tail and folds every
 * exchange before the newest user message into one summarized section. A caller retains a recent
 * tail by passing `keep` (on
 * {@link ConversationOptions}, {@link ConversationManagerOptions}, or per-fold through
 * {@link CompactOptions}), folding at most the older `count - keep` messages, cut back to whole
 * exchanges, and leaving at least the most recent `keep` live for the next turn. Overridable everywhere `keep` is accepted.
 */
export declare const DEFAULT_CONVERSATION_KEEP = 0;

/**
 * Caps the tool-iteration turns of a ledger's agent at 8 turns.
 */
export declare const DEFAULT_LEDGER_LIMIT = 8;

/**
 * Supplies the default prompt and tail shares.
 */
export declare const DEFAULT_LEDGER_SHARE: LedgerShare;

/**
 * Holds the default provider deadline in milliseconds — `120_000`, the wall-clock bound a call
 * runs under when `AgentProviderInput.timeout` is omitted, folded with the caller's signal so
 * whichever trips first cancels the call.
 */
export declare const DEFAULT_PROVIDER_TIMEOUT = 120000;

/**
 * Caps the `recall` calls of one request at 2 calls.
 */
export declare const DEFAULT_RECALL_LIMIT = 2;

/**
 * Holds the default relay request limit in bytes — `1_048_576`, the byte budget a relay applies
 * to an inbound body when `RelayOptions.limit` is omitted, refusing a body that reaches it.
 */
export declare const DEFAULT_RELAY_LIMIT = 1048576;

/**
 * Synthesizes the denial {@link ToolResult} an authority-blocked call is fed back with — the
 * call's `id` / `name` keyed back, carrying a denial `error` instead of a value.
 *
 * @remarks
 * Pure and total. The rule's `reason` is rendered as `denied: <reason>` when one was given,
 * else the generic `denied by authority`. There is no `value`, so the agent loop feeds it back
 * exactly like a tool error and the model can react to it.
 *
 * @param call - The denied {@link ToolCall}
 * @param reason - The rule's explanation, or `undefined` for the generic denial
 * @returns The failure-arm {@link ToolResult}
 *
 * @example
 * ```ts
 * denyCall({ id: '1', name: 'drop', arguments: {} }, 'read-only mode')
 * // { success: false, id: '1', name: 'drop', error: 'denied: read-only mode' }
 * ```
 */
export declare function denyCall(call: ToolCall, reason: string | undefined): ToolResult;

/** Matches the logprob decoding failure `invalid or duplicate top logprob token`, which the ledger holds for the ledger's life. */
export declare const DETERMINISTIC_JUDGE_ERROR: RegExp;

/**
 * Estimates the context-token footprint of a batch of messages — each message's content plus
 * {@link import('./constants.js').MESSAGE_TOKEN_OVERHEAD}, a tool-call JSON estimate, a thinking estimate, and
 * {@link import('./constants.js').IMAGE_TOKEN_ESTIMATE} for each attached image. The default
 * `consumer` estimator for an agent's context budget (the
 * {@link import('./types.js').AgentOptions} `window`), total and never throwing, and a
 * deliberate provider-agnostic approximation rather than an exact tokenizer count.
 *
 * @remarks
 * Sums, per message, {@link estimateTokens} over its `content` (the `ceil(length / 4)` char
 * heuristic) plus {@link import('./constants.js').MESSAGE_TOKEN_OVERHEAD} (a fixed per-message
 * role/framing overhead) plus, when present, {@link estimateTokens} over its JSON-stringified
 * `calls` plus, when present, {@link estimateTokens} over its `thinking` plus `images.length * `{@link import('./constants.js').IMAGE_TOKEN_ESTIMATE} (a coarse,
 * deliberately-approximate per-image cost — a base64 length is not a token proxy). Deterministic
 * and provider-free — the same messages always yield the same estimate, with an empty batch `0`.
 * It is the fully-swappable default an agent's auto-compaction context budget charges each
 * turn's new messages through; a caller wanting a sharper count supplies its own `consumer` to
 * `createBudget` instead. Total — never throws: a `calls` `JSON.stringify` that throws (a
 * circular `ToolCall.arguments`) is caught and replaced with a conservative fixed contribution of
 * {@link import('./constants.js').MESSAGE_TOKEN_OVERHEAD} (the same per-message overhead scale)
 * instead of estimating the (unreachable) serialized length.
 *
 * @param messages - The messages to estimate (a turn's appended assistant + tool messages)
 * @returns The summed estimated token count (`0` when empty)
 *
 * @example
 * ```ts
 * estimateMessages([]) // 0
 * estimateMessages([{ id: '1', role: 'user', content: 'hello' }]) // 6  (2 content + 4 overhead)
 * ```
 */
export declare function estimateMessages(messages: readonly Message[]): number;

/**
 * Estimates the context-token footprint of a string — the deterministic `ceil(length / 4)`
 * character heuristic {@link estimateMessages} sums over a conversation's messages (the default
 * context-budget estimator).
 *
 * @remarks
 * Approximates `ceil(length / 4)` (≈ four characters per token — the rough average for
 * English text), so the same input always yields the same estimate (no model round-trip).
 * Empty text is `0`. This is a planning heuristic for reasoning about how much a turn's
 * messages cost the next request, not an exact tokenizer count — it never calls a provider,
 * so the agent layer stays provider-agnostic and synchronous where it can be.
 *
 * @param text - The text to estimate (a section summary, a message's content)
 * @returns The estimated token count (`ceil(text.length / 4)`; `0` for empty text)
 *
 * @example
 * ```ts
 * estimateTokens('') // 0
 * estimateTokens('hello') // 2  (ceil(5 / 4))
 * estimateTokens('a'.repeat(40)) // 10
 * ```
 */
export declare function estimateTokens(text: string): number;

/**
 * Extracts a System One distribution in question criteria order and drops server measures.
 *
 * @remarks
 * Every requested candidate must have a finite probability in [0, 1]; the helper checks each
 * requested candidate itself and reads no other member. Score maps and arrays project onto the
 * requested levels. Additional candidates are ignored, sums are unconstrained, and probabilities
 * are preserved without normalization.
 *
 * @param answer - The wire answer to decode
 * @param question - The question defining the form and candidate order
 * @returns The domain answer, or undefined for a mismatched form or a requested candidate whose
 * probability is missing, not finite, or outside [0, 1]
 * @example
 * ```ts
 * extractSystemOneAnswer({ type: 'noul', noul: 0.9 }, { form: 'noul' })
 * // { form: 'noul', noul: 0.9 }
 * ```
 */
export declare function extractSystemOneAnswer(answer: SystemOneAnswer, question: JudgeQuestion): JudgeAnswer | undefined;

/**
 * Maps complete System One token counts onto validated token usage.
 *
 * @param usage - The optional wire token counts
 * @returns Token usage, or undefined for missing, null, negative, or non-finite counts
 * @example
 * ```ts
 * extractSystemOneUsage({ input_tokens: 975, output_tokens: 4 })
 * // { prompt: 975, completion: 4, total: 979 }
 * ```
 */
export declare function extractSystemOneUsage(usage: SystemOneUsage | undefined): TokenUsage | undefined;

/**
 * Reads the id-shaped tokens and the numbers of a text.
 *
 * @param text - The text to read
 * @returns The uppercased hyphenated ids that hold a digit, and the numbers outside those ids with grouping commas removed
 *
 * @example
 * ```ts
 * const tokens = extractTokens('Order bw-5512 totals 1,200.50')
 * // tokens.ids is Set { 'BW-5512' }, tokens.numbers is Set { 1200.5 }
 * ```
 */
export declare function extractTokens(text: string): LedgerTokenSet;

/**
 * Filters a list of items by a {@link import('./contexts/index.js').ScopeInterface} allow-list of keys —
 * `undefined` passes everything, `[]` passes nothing, and a non-empty list passes the listed keys
 * alone, order preserved. The pure, total set-membership primitive the context's build step and
 * the agent loop's tool-advertise step apply a scope through.
 *
 * @remarks
 * Three-way by the allow-list's shape, so a `Scope` category cleanly expresses "all /
 * none / only these":
 * - `undefined` ⇒ no constraint — every item passes (returned unchanged).
 * - `[]` (empty) ⇒ none pass (no key is in an empty set).
 * - a non-empty list ⇒ only items whose `key(item)` is in the list pass.
 *
 * Order-preserving (it filters `items` in place order, never reorders) and total — never
 * throws. Keys are matched by a `Set` for O(1) membership, so a large list is cheap.
 *
 * @typeParam T - The item type being filtered
 * @param allow - The allow-list of keys (`undefined` ⇒ all, `[]` ⇒ none, else only-listed)
 * @param items - The items to filter (returned unchanged when `allow` is `undefined`)
 * @param key - Extracts the key an item is matched on (for example an instruction's `name`)
 * @returns The items that pass the allow-list, in their original order
 *
 * @example
 * ```ts
 * const items = [{ name: 'a' }, { name: 'b' }]
 * filterAllowList(undefined, items, (i) => i.name) // [{ name: 'a' }, { name: 'b' }] (all)
 * filterAllowList([], items, (i) => i.name) // [] (none)
 * filterAllowList(['b'], items, (i) => i.name) // [{ name: 'b' }] (only listed)
 * ```
 */
export declare function filterAllowList<T>(allow: readonly string[] | undefined, items: readonly T[], key: (item: T) => string): readonly T[];

/**
 * Filters decisively unneeded subjects while preserving requests, whole exchanges, and complete
 * tool groups.
 *
 * @remarks
 * An exchange is a user message and every message after it up to the next user message. Leading
 * messages form their own exchange. An exchange and a tool group from
 * {@link import('../conversations/helpers.js').collectToolGroups}
 * are each kept whole when any member is kept and dropped whole only when every member is
 * dropped. A tool group that spans two exchanges joins them, so keeping one keeps both.
 *
 * @param messages - The conversation view in prompt order
 * @param applicability - The screened subjects and their recorded conditions
 * @param request - The request whose id must be retained when present
 * @returns A subset of the original messages in their original order
 * @example
 * ```ts
 * filterSelectionMessages(conversation.view(), applicability, request)
 * ```
 */
export declare function filterSelectionMessages(messages: readonly Message[], applicability: readonly Applicability[], request: Message): readonly Message[];

/**
 * Fits the marginal tokens one estimate unit adds within a request.
 *
 * @remarks
 * The fit is the least-squares slope of prompt tokens over estimate, taken within each set of calls
 * that advertised the same number of tools and pooled over every group. The estimate counts no tool
 * schema, so a pooled fit across tool counts would read the dropped schemas as a falling rate.
 *
 * @param groups - The calls of each request
 * @returns The slope, or undefined when no set holds two calls with a prompt count and an estimate that differ
 *
 * @example
 * ```ts
 * fitSlope([[{ estimate: 100, prompt: 130, tools: 2 }, { estimate: 200, prompt: 260, tools: 2 }]]) // 1.3
 * ```
 */
export declare function fitSlope(groups: ReadonlyArray<readonly GaugeCall[]>): number | undefined;

/**
 * Prices prompts in tokens from a measured scale and fixed cost, and measures the room a request
 * has left.
 *
 * @remarks
 * `observe` rescales from the first call of each finished request with the fixed cost taken out,
 * and keeps that request's calls for the marginal rate and the longest final completion for the reply
 * reserve after subtracting its thinking. `fixed` never changes after construction.
 * {@link GaugeOptions} defines the measured use, reply reserve, and recall-room formulas.
 * {@link LedgerOptions} defines the ledger's plan budget and recall close rule.
 *
 * @example
 * ```ts
 * const gauge = new Gauge({ scale: 1.16, fixed: 498, capacity: 32768 })
 * gauge.room([{ estimate: 1719, prompt: 2498, tools: 3 }], '') // estimate units a recall result can take
 * ```
 */
export declare class Gauge implements GaugeInterface {
    #private;
    /**
     * Holds the starting price and the capacity.
     *
     * @param options - The starting `scale` and `fixed` price and the context `capacity`
     * @throws {LedgerError} Thrown when `scale` is not finite and above 0, or `fixed` is not finite and at least 0 (code `'GAUGE'`)
     * @throws {LedgerError} Thrown when `capacity` is not a positive safe integer (code `'CAPACITY'`)
     * @throws {LedgerError} Thrown when `predict` is not a nonnegative safe integer less than `capacity` (code `'CAPACITY'`)
     */
    constructor(options: GaugeOptions);
    get scale(): number;
    get fixed(): number;
    measure(messages: readonly Message[]): number;
    /**
     * Reads the marginal rate of prompt tokens per estimate unit.
     *
     * @remarks
     * Returns the scale when the fit is undefined, nonfinite, or not above 0, a guard the measured
     * harness lacked, so a degenerate fit never prices recall room.
     *
     * @param calls - The calls of the request in progress
     * @returns The fitted slope, or the scale when the slope is unusable
     */
    rate(calls: readonly GaugeCall[]): number;
    left(calls: readonly GaugeCall[]): number;
    reserve(calls: readonly GaugeCall[], longest: string): number;
    room(calls: readonly GaugeCall[], longest: string): number;
    observe(calls: readonly GaugeCall[], reply?: GaugeCall): void;
}

/**
 * Carries one agent call as the gauge reads it.
 *
 * @remarks
 * `estimate` is the `estimateMessages` estimate of the call's messages. `prompt` and `completion`
 * are the tokens the provider reported, absent when it reported none. `tools` is the count of tool
 * definitions the call advertised.
 * `thinking` estimates the completion tokens spent on thinking from its share of the generated
 * characters, rounded to the nearest integer and capped at `completion`. With replay `'none'`,
 * the measured call uses `prompt + completion - thinking`; other policies retain the whole
 * completion. The reply reserve reads `completion - (thinking ?? 0)` for every replay policy.
 */
export declare interface GaugeCall {
    readonly estimate: number;
    readonly prompt?: number;
    readonly completion?: number;
    readonly thinking?: number;
    readonly tools: number;
}

/**
 * Prices prompts in tokens and measures the room a request has left.
 *
 * @remarks
 * `scale` and `fixed` hold the price the gauge read from its last observation.
 */
export declare interface GaugeInterface extends LedgerGauge {
    /**
     * Returns the tokens the messages cost at the current scale.
     *
     * @param messages - The messages to price
     * @returns The cost in tokens
     */
    measure(messages: readonly Message[]): number;
    /**
     * Returns the tokens one more estimate unit adds within a request, fitted over the observed calls.
     *
     * @param calls - The calls of the request so far
     * @returns The tokens one estimate unit adds
     */
    rate(calls: readonly GaugeCall[]): number;
    /**
     * Returns the tokens of the capacity the last call left.
     *
     * @remarks
     * Applies the measured-use and fallback formulas in {@link GaugeOptions}.
     *
     * @param calls - The calls of the request so far
     * @returns The tokens left
     */
    left(calls: readonly GaugeCall[]): number;
    /**
     * Returns the tokens a reply turn needs after the calls, given the longest reply text written so far.
     *
     * @remarks
     * Applies the reply reserve described in {@link GaugeOptions}.
     *
     * @param calls - The calls of the request so far
     * @param longest - The longest reply text written so far
     * @returns The tokens to reserve
     */
    reserve(calls: readonly GaugeCall[], longest: string): number;
    /**
     * Returns the estimate units a recall result can take without taking the reply's room.
     *
     * @remarks
     * Applies the recall-room formula in {@link GaugeOptions}; {@link LedgerOptions} describes
     * the ledger's close rule.
     *
     * @param calls - The calls of the request so far
     * @param longest - The longest reply text written so far
     * @returns The estimate units available
     */
    room(calls: readonly GaugeCall[], longest: string): number;
    /**
     * Rescales from a completed request's first call and keeps its calls and the final reply's completion.
     *
     * @param calls - The calls of the completed request
     * @param reply - The call that delivered the final answer, absent when no final answer was delivered
     */
    observe(calls: readonly GaugeCall[], reply?: GaugeCall): void;
}

/**
 * Configures a gauge: its starting price of a prompt and the context capacity it measures against.
 *
 * @remarks
 * `predict` is the generation cap in tokens, including thinking. Default: 0. It must be a
 * nonnegative safe integer less than `capacity`; construction throws `LedgerError` with code
 * `'CAPACITY'` otherwise. `replay` names the thinking the next request carries. Default: `'none'`.
 * Measured use is `prompt + completion - (thinking ?? 0)` for `'none'`, and `prompt + completion`
 * otherwise; absent completion counts as 0. Without prompt usage, use is `fixed + scale * estimate`.
 * Capacity left is `max(0, capacity - used)`. The reply reserve adds recall framing at the marginal
 * rate to the largest observed reply's `completion - (thinking ?? 0)` for every policy.
 * Without a positive reply observation, it prices the longest reply text at that rate. Recall room is
 * `max(0, (left - predict - reserve) / 2 / rate)`; recall closes at `left - predict < 2 * reserve`.
 */
export declare interface GaugeOptions extends LedgerGauge {
    readonly capacity: number;
    readonly predict?: number;
    readonly replay?: ThinkingReplay;
}

/**
 * Handles one queued agent job by rehydrating it through a registry with the queue
 * attempt's signal, then applying the shared partial-result policy.
 *
 * @param registry - The registry that rehydrates the serializable job
 * @param partial - The partial policy. If `true`, a partial result resolves; if `false`, it throws
 * @param input - The serializable agent job
 * @param context - The queue attempt whose signal bounds the agent
 * @returns The settled agent result
 */
export declare function handleAgentQueueJob(registry: AgentRegistryInterface, partial: boolean, input: AgentJobInput, context: QueueContext): Promise<AgentResult>;

/**
 * Handles one runner agent job by fanning out its declared children, rehydrating the
 * parent through a registry with the controller signal, and applying the shared
 * partial-result policy.
 *
 * @remarks
 * Children are fired and tracked through the runner controller without awaiting them
 * inline, preserving bounded-runner progress.
 *
 * @param registry - The registry that rehydrates serializable jobs
 * @param partial - The partial policy. If `true`, a partial result resolves; if `false`, it throws
 * @param controller - The runner controller for this parent job
 * @returns The settled parent agent result
 */
export declare function handleAgentRunnerJob(registry: AgentRegistryInterface, partial: boolean, controller: ControllerInterface<AgentJobInput, AgentResult>): Promise<AgentResult>;

/**
 * Identifies a lookup reading for projection by its tool name and normalized arguments.
 *
 * @remarks
 * Two calls share an identity whatever the key order of their arguments at any depth. A top-level
 * string argument is trimmed and uppercased first, so `"lh-1 "` and `"LH-1"` name one call.
 * The ledger's repeat stop instead compares the tool name and canonical arguments without this
 * string normalization, so those argument spellings remain distinct within a request.
 *
 * @param name - The tool name
 * @param args - The arguments the call carried
 * @returns The identity: the name, a space, and the canonical arguments
 *
 * @example
 * ```ts
 * identifyLookup('lookup_order', { id: 'bw-5512', opts: { b: 1, a: 2 } }) ===
 * 	identifyLookup('lookup_order', { opts: { a: 2, b: 1 }, id: ' BW-5512' }) // true
 * ```
 */
export declare function identifyLookup(name: string, args: Readonly<Record<string, unknown>>): string;

/**
 * Names the coarse, deliberately approximate per-image token cost
 * {@link import('./helpers.js').estimateMessages} charges for each attached image — `512`, because
 * a base64 payload's length is no reliable token proxy.
 *
 * @remarks
 * A base64 image payload's length is not a reliable token proxy (a vision model's actual image
 * token cost depends on resolution / tiling, not byte size), so this is a fixed, coarse
 * per-image estimate rather than a derivation from `image.length` — a planning heuristic, not an
 * exact count.
 */
export declare const IMAGE_TOKEN_ESTIMATE = 512;

/**
 * Derives needed conditions from matching recorded judgments without asking a judge.
 *
 * @remarks
 * The threshold must lie in the interval above 0.5 up to and including 1, and `createSelection`
 * refuses any other value. The helper reads the true side first.
 *
 * @param conversation - The conversation supplying the view and recorded judgments
 * @param request - The user message the selection serves
 * @param options - The judge identity, screen, and application criterion
 * @returns One applicability per distinct screened id present in the view, in screen order
 * @example
 * ```ts
 * inferApplicability(conversation, request, { judge, screen, needed })
 * ```
 */
export declare function inferApplicability(conversation: ConversationInterface, request: Message, options: Pick<SelectionOptions, 'judge' | 'screen' | 'needed'>): readonly Applicability[];

/**
 * Represents an immutable named directive — an {@link InstructionInterface} assembled once from
 * its input (`name` / `content`, an optional `priority` defaulting to `0`), the `id` minted at
 * construction.
 *
 * @remarks
 * A thin immutable value object (mirroring {@link import('@orkestrel/tool').Tool}): the
 * constructor mints a fresh `id` (`crypto.randomUUID()`), copies the input's `name` /
 * `content`, resolves `priority` to the input's value or `0`, and carries the input's
 * per-item `override` only when supplied (assigned when present, mirroring a
 * message's `images` / `calls` present-when-given convention — kept absent otherwise).
 * Never mutated after construction. An
 * {@link import('./InstructionManager.js').InstructionManager} keys it by `name` and
 * renders it (highest `priority` first) under its section header.
 *
 * @example
 * ```ts
 * const instruction = new Instruction({ name: 'tone', content: 'Be concise.', priority: 5 })
 * instruction.priority // 5
 * ```
 */
export declare class Instruction implements InstructionInterface {
    readonly id: string;
    readonly name: string;
    readonly content: string;
    readonly priority: number;
    readonly override?: string;
    constructor(input: InstructionInput);
}

/**
 * Carries the minimal data to author an {@link InstructionInterface} — the `id` is minted by
 * the {@link InstructionManagerInterface} that stores it, so a caller supplies only
 * `name` / `content` (and an optional `priority`, defaulting to `0`).
 */
export declare interface InstructionInput {
    readonly name: string;
    readonly content: string;
    /** Weights the ordering (higher renders first); defaults to `0` when omitted. */
    readonly priority?: number;
    /**
     * Holds a fully-rendered override of this instruction's prompt text — the most-specific
     * level of the {@link import('./AgentContext.js').AgentContext} build cascade (beats the
     * manager-options format and the built-in rendering for this item). Round-tripped onto the
     * stored {@link InstructionInterface} when given (present-when-supplied, like `images`).
     */
    readonly override?: string;
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
export declare interface InstructionInterface {
    readonly id: string;
    readonly name: string;
    readonly content: string;
    /** Ranks the instruction — higher renders first; defaults to `0`. */
    readonly priority: number;
    /**
     * Holds a fully-rendered per-item override of this instruction's prompt text — the
     * most-specific level of the {@link import('./AgentContext.js').AgentContext} build
     * cascade, beating every format level for this item. Present only when supplied on the
     * {@link InstructionInput} (round-tripped through the manager, like a message's
     * `images`); absent ⇒ the cascade decides.
     */
    readonly override?: string;
}

/**
 * Registers the immutable {@link Instruction}s a richer context assembles a directives block
 * from — keyed by `name` so a re-`add` overwrites, last write wins, and listed by descending
 * `priority`, carrying the `open` / `render` / `close` build contract and an observable `emitter`.
 *
 * @remarks
 * - **Registry.** Instructions live in an insertion-ordered `Map` keyed by `name`;
 *   `add` takes one {@link InstructionInput} or a batch, mints each instruction's
 *   `id`, and a re-`add` of the same name overwrites it (last write wins). `count` is the
 *   map size, `instruction(name)` looks one up, and `instructions()` lists them sorted by
 *   descending `priority` (a stable sort, so equal priorities keep insertion order).
 * - **Build contract (the whole format cascade).** `open` is the section header a context
 *   renders the instructions under, `render(instruction)` renders one instruction, and
 *   `close` is the line after them. Each resolves the cascade most-specific-first: `render`
 *   returns the instruction's {@link InstructionInput.override}, else the
 *   `InstructionManagerOptions.format` `render`, else its `content`; `open` returns the
 *   options `open`, else the built-in header; `close` returns the options `close`, else
 *   `undefined`. A context reads the three and frames the section from them (see
 *   {@link import('../AgentContext.js').AgentContext}).
 * - **Removal.** `remove` drops one by name, or a batch — `true` only when every supplied
 *   name was removed; `clear` empties the registry.
 * - **Observable.** The owned {@link emitter} ({@link InstructionManagerEventMap})
 *   carries `add` (the created instruction) / `remove` (the name) / `clear` for
 *   fire-and-forget observers. Every event is emitted directly, strictly after the map
 *   mutation completes; the emitter isolates a listener throw and routes it to its `error`
 *   handler (the `error` option), so a buggy observer can never corrupt a mutation.
 *
 * @example
 * ```ts
 * const manager = new InstructionManager()
 * manager.add([
 * 	{ name: 'tone', content: 'Be concise.', priority: 1 },
 * 	{ name: 'safety', content: 'Refuse unsafe requests.', priority: 10 },
 * ])
 * manager.instructions().map((one) => one.name) // ['safety', 'tone'] — highest priority first
 * ```
 */
export declare class InstructionManager implements InstructionManagerInterface {
    #private;
    constructor(options?: InstructionManagerOptions);
    get emitter(): EmitterInterface<InstructionManagerEventMap>;
    get count(): number;
    get open(): string;
    get close(): string | undefined;
    add(input: InstructionInput): InstructionInterface;
    add(inputs: readonly InstructionInput[]): readonly InstructionInterface[];
    instruction(name: string): InstructionInterface | undefined;
    instructions(): readonly InstructionInterface[];
    render(instruction: InstructionInterface): string;
    remove(name: string): boolean;
    remove(names: readonly string[]): boolean;
    clear(): void;
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
export declare type InstructionManagerEventMap = {
    /** Reports an instruction added (or a same-name one replaced) — the created instruction. */
    readonly add: readonly [instruction: InstructionInterface];
    /** Reports an instruction removed — its `name`. */
    readonly remove: readonly [name: string];
    /** Reports every instruction removed. */
    readonly clear: readonly [];
};

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
export declare interface InstructionManagerInterface {
    readonly emitter: EmitterInterface<InstructionManagerEventMap>;
    readonly count: number;
    /**
     * Names the section header a context renders the instructions under — the manager-options
     * `open`, else the built-in `'## Instructions'`.
     */
    readonly open: string;
    /**
     * Holds the line a context renders after the instructions — the manager-options `close`, or
     * `undefined` when none, because there is no built-in close and so no closing line.
     */
    readonly close: string | undefined;
    /**
     * Adds one {@link InstructionInput}, or a batch — mints each `id`; a re-`add` of the same
     * name overwrites it, last write wins.
     */
    add(input: InstructionInput): InstructionInterface;
    add(inputs: readonly InstructionInput[]): readonly InstructionInterface[];
    /** Looks up one instruction by name (`undefined` when absent). */
    instruction(name: string): InstructionInterface | undefined;
    /** Lists every instruction, sorted by descending `priority` (stable for equal priorities). */
    instructions(): readonly InstructionInterface[];
    /**
     * Renders one instruction for the prompt — its `override`, else the manager-options
     * `render`, else its `content`.
     */
    render(instruction: InstructionInterface): string;
    /**
     * Removes one instruction by name, or a batch — `true` only when every supplied name was
     * removed.
     */
    remove(name: string): boolean;
    remove(names: readonly string[]): boolean;
    /** Removes every instruction. */
    clear(): void;
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
export declare interface InstructionManagerOptions {
    readonly on?: EmitterHooks<InstructionManagerEventMap>;
    /** Holds the emitter's listener-error handler — a listener throw routes here, not to a domain event. */
    readonly error?: EmitterErrorHandler;
    /** Holds a manager-level format override that beats the built-in; see {@link AgentContextInterface.build}. */
    readonly format?: ContextSectionFormat<InstructionInterface>;
}

/**
 * Intersects two scope category lists under the "`undefined` is the universal set" rule — a
 * fresh copy that can only tighten, and the primitive a scope narrows through.
 *
 * @remarks
 * Pure and total, and it can only tighten: `undefined` ∩ `undefined` is `undefined` (still no
 * constraint); `undefined` ∩ a list is a copy of that list (the `undefined` side imposes
 * nothing); a list ∩ a list keeps the child keys the parent also allows, so a parent-excluded
 * key can never be re-admitted. Every returned list is a fresh copy, so a later mutation of
 * either input cannot leak into the result.
 *
 * @param parent - The parent's allow-list (`undefined` ⇒ no constraint)
 * @param child - The narrowing allow-list (`undefined` ⇒ no constraint)
 * @returns The intersected allow-list, or `undefined` when neither side constrains
 *
 * @example
 * ```ts
 * intersectKeys(['read', 'write'], ['write', 'admin']) // ['write']
 * intersectKeys(undefined, ['read']) // ['read']
 * intersectKeys(undefined, undefined) // undefined
 * ```
 */
export declare function intersectKeys(parent: readonly string[] | undefined, child: readonly string[] | undefined): readonly string[] | undefined;

/**
 * Names the status a relay answers for a body that is missing, unreadable, or rejected by
 * `providerRequestContract` — `400`, carried with no body and reaching the browser as a
 * `ProviderError` with the `HTTP` code.
 */
export declare const INVALID_RELAY_STATUS = 400;

/**
 * Narrows an unknown caught value to an {@link AgentError} through `instanceof`, so a `catch`
 * can branch on its `code`.
 *
 * @param value - The value to test (typically a `catch` binding)
 * @returns True if `value` is an {@link AgentError}; false otherwise
 *
 * @example
 * ```ts
 * try {
 * 	agent.stream()
 * } catch (error) {
 * 	if (isAgentError(error) && error.code === 'CONCURRENCY') useSeparateAgents()
 * }
 * ```
 */
export declare function isAgentError(value: unknown): value is AgentError;

/**
 * Narrows an unknown caught value to an {@link AgentJobError} through `instanceof`, so a
 * `catch` can recover its `partial` result.
 *
 * @param value - The value to test (typically a `catch` binding or a rejected enqueue)
 * @returns True if `value` is an {@link AgentJobError}; false otherwise
 *
 * @example
 * ```ts
 * try {
 * 	await queue.enqueue(job) // retries: 0 → a partial rejects with the error
 * } catch (error) {
 * 	if (isAgentJobError(error)) keep(error.partial.content) // recover the partial content
 * }
 * ```
 */
export declare function isAgentJobError(value: unknown): value is AgentJobError;

/**
 * Narrows an unknown caught value to a {@link ConversationError} through `instanceof`, so a
 * `catch` can branch on its `code`.
 *
 * @param value - The value to test (typically a `catch` binding)
 * @returns True if `value` is a {@link ConversationError}; false otherwise
 *
 * @example
 * ```ts
 * try {
 * 	await conversation.compact()
 * } catch (error) {
 * 	if (isConversationError(error) && error.code === 'SUMMARIZER') addSummarizer()
 * }
 * ```
 */
export declare function isConversationError(value: unknown): value is ConversationError;

/**
 * Narrows an `unknown` to a {@link ConversationSnapshot} — a `string` `id`, an optional `string`
 * `summary`, and valid `sections` and `messages` arrays; the total boundary guard for an
 * untrusted snapshot read (a storage row a
 * {@link import('./stores/DatabaseConversationStore.js').DatabaseConversationStore}
 * reads back from its opaque JSON column, a snapshot loaded from disk), never throwing. The exact
 * analogue of {@link import('@orkestrel/workspace').isWorkspaceSnapshot}.
 *
 * @remarks
 * A total guard (it never throws — adversarial input returns `false`). It checks the snapshot's
 * shape: a `string` `id`, an optional `string` `summary` (present-or-absent — the rollup is
 * `undefined` until the first compaction), a `sections` array every element of which is a valid
 * {@link Section} ({@link isSection}), and a `messages` array every element of which is a
 * valid {@link Message} ({@link isMessage}) — enough to safely impose the
 * {@link ConversationSnapshot} type at a storage boundary without a cast. The structural twin of
 * {@link import('@orkestrel/workspace').isWorkspaceSnapshot}. A malformed blob (a non-record, a missing / non-string `id`, a
 * non-string `summary` when present, a non-array `sections` / `messages`, or any malformed
 * element) resolves `false`, so a
 * {@link import('./stores/DatabaseConversationStore.js').DatabaseConversationStore}
 * read yields `undefined` rather than a broken conversation.
 *
 * @param value - The value to test (an opaque storage read)
 * @returns True if `value` has the structural shape of a {@link ConversationSnapshot}; false otherwise
 *
 * @example
 * ```ts
 * isConversationSnapshot({ id: 'c1', sections: [], messages: [] }) // true
 * isConversationSnapshot({ id: 'c1', summary: 'recap', sections: [], messages: [] }) // true
 * isConversationSnapshot({ id: 'c1', sections: 'nope', messages: [] }) // false
 * isConversationSnapshot({ sections: [], messages: [] }) // false (missing id)
 * ```
 */
export declare function isConversationSnapshot(value: unknown): value is ConversationSnapshot;

/**
 * Narrows a caught value to a {@link JudgeAbortError} through `instanceof`, so a `catch` can
 * recover its `partial` result.
 *
 * @param value - The caught value
 * @returns True if the value is a {@link JudgeAbortError}; false otherwise
 * @example
 * ```ts
 * isJudgeAbortError(new JudgeAbortError({ model: 'tev1:0.8b', answers: {} })) // true
 * ```
 */
export declare function isJudgeAbortError(value: unknown): value is JudgeAbortError;

/**
 * Checks whether a value is a judge entry: a string, a JSON record, or a JSON array.
 *
 * @remarks
 * Total: a cycle, a non-JSON member, a class instance, and a hostile input return false. `null`
 * is not an entry; a criteria guard admits it where the protocol keeps it.
 *
 * @param value - The unknown entry candidate
 * @returns True if the value is a string or JSON structure the model can read; false otherwise
 * @example
 * ```ts
 * isJudgeEntry('Customer asks for a refund') // true
 * isJudgeEntry({ ticket: 4182, tags: ['billing'] }) // true
 * isJudgeEntry(null) // false
 * isJudgeEntry({ opened: new Date() }) // false
 * ```
 */
export declare function isJudgeEntry(value: unknown): value is JudgeEntry;

/**
 * Narrows a caught value to the judge failure class through `instanceof`.
 *
 * @param value - The caught value
 * @returns True if the value is a {@link JudgeError}; false otherwise
 * @example
 * ```ts
 * isJudgeError(new JudgeError('HTTP', 'judge error: 429', { status: 429 })) // true
 * ```
 */
export declare function isJudgeError(value: unknown): value is JudgeError;

/**
 * Checks whether a value is a well-formed judge question of the choice, score, or noul form.
 *
 * @remarks
 * Total: a hostile input returns false. A choice needs at least 2 options and a score at least 2
 * levels, because the confidence formula divides by the candidate count; a description or a level
 * can be `null`. `instructions` and noul `criteria` are omitted when absent and never `null`.
 * Server limits on option, level, and question counts are left to the server.
 *
 * @param value - The unknown question candidate
 * @returns True if the value is a question the judge engine can send; false otherwise
 * @example
 * ```ts
 * isJudgeQuestion({ form: 'choice', criteria: { billing: null, bug: 'Software defect' } }) // true
 * isJudgeQuestion({ form: 'score', criteria: ['Cosmetic', null, 'Blocking'] }) // true
 * isJudgeQuestion({ form: 'noul', instructions: 'Is a refund owed?' }) // true
 * isJudgeQuestion({ form: 'choice', criteria: { billing: null } }) // false
 * ```
 */
export declare function isJudgeQuestion(value: unknown): value is JudgeQuestion;

/**
 * Checks whether a stored judgment carries a valid question and exactly one answer or refusal.
 *
 * @remarks
 * Malformed members and unreadable inputs return false. Answer fields follow the root judge
 * value types; this storage guard does not impose a wire's probability or candidate limits.
 *
 * @param value - The unknown stored record
 * @returns True if the record satisfies the judgment contract; false otherwise
 * @example
 * ```ts
 * isJudgment({ id: 'q', question: { form: 'noul' }, answer: { form: 'noul', noul: 0.9 }, model: 'judge', sources: [], state: 'text', time: 0 }) // true
 * isJudgment({ id: 'q' }) // false
 * ```
 */
export declare function isJudgment(value: unknown): value is Judgment;

/**
 * Narrows an unknown caught value to a {@link LedgerError} through `instanceof`, so a `catch` can
 * branch on its `code`.
 *
 * @param value - The value to test (typically a `catch` binding)
 * @returns True if `value` is a {@link LedgerError}; false otherwise
 *
 * @example
 * ```ts
 * isLedgerError(new LedgerError('GAUGE', 'calibration reported no prompt usage')) // true
 * ```
 */
export declare function isLedgerError(value: unknown): value is LedgerError;

/**
 * Checks whether a value satisfies the domain conversation-message contract.
 *
 * @remarks
 * Roles belong to MessageRole, image elements are strings, `thinking` is a string, and `call` is a string on any
 * role, as the flat Message type admits. Tool arguments may carry non-JSON values, as the
 * domain type permits; the message wire contract is narrower. Unreadable fields and hostile
 * inputs return false.
 *
 * @param value - The unknown message candidate
 * @returns True if the domain message fields are valid; false otherwise
 * @example
 * ```ts
 * isMessage({ id: '1', role: 'user', content: 'hi' }) // true
 * isMessage({ id: '1', role: 'other', content: '' }) // false
 * isMessage({ id: '1', role: 'user', content: '', images: [1] }) // false
 * isMessage({ id: '1', role: 'assistant', content: '', thinking: 1 }) // false
 * ```
 */
export declare function isMessage(value: unknown): value is Message;

/**
 * Narrows an unknown caught value to a {@link ProviderAbortError} through `instanceof`, so a
 * `catch` can recover its `partial` result.
 *
 * @param value - The value to test (typically a `catch` binding)
 * @returns True if `value` is a {@link ProviderAbortError}; false otherwise
 *
 * @example
 * ```ts
 * try {
 * 	for await (const delta of provider.stream(messages, signal)) render(delta)
 * } catch (error) {
 * 	if (isProviderAbortError(error)) keep(error.partial.content) // recover partial
 * }
 * ```
 */
export declare function isProviderAbortError(value: unknown): value is ProviderAbortError;

/**
 * Narrows a caught value to the provider failure class through instanceof.
 *
 * @param value - The caught value
 * @returns True if the value is a provider failure; false otherwise
 * @example
 * ```ts
 * isProviderError(new ProviderError('HTTP', 'unavailable', { status: 503 })) // true
 * ```
 */
export declare function isProviderError(value: unknown): value is ProviderError;

/**
 * Checks whether an `unknown` is structurally a {@link Section} record — a `string` `id` and
 * `summary` beside a `messages` array of valid {@link Message}s, the per-section step of the
 * {@link isConversationSnapshot} read-boundary narrow. Total, never throwing, and never an
 * assertion.
 *
 * @remarks
 * A total guard (it never throws — adversarial input returns `false`). It checks the section's
 * shape: a record with a `string` `id`, a `string` `summary`, and a `messages` array every element
 * of which is a valid {@link Message} record ({@link isMessage}). Enough to safely impose
 * the {@link Section} type at a storage boundary without a cast.
 *
 * @param value - The value to test (one element of a snapshot's `sections` array)
 * @returns True if `value` has the structural shape of a {@link Section}; false otherwise
 *
 * @example
 * ```ts
 * isSection({ id: 's', summary: 'recap', messages: [{ id: '1', role: 'user', content: 'hi' }] }) // true
 * isSection({ id: 's', summary: 'recap', messages: 'nope' }) // false
 * isSection({ id: 's', messages: [] }) // false (missing summary)
 * ```
 */
export declare function isSection(value: unknown): value is Section;

/**
 * Narrows an unknown caught value to a {@link SelectionError} through `instanceof`, so a
 * `catch` can branch on its `code`.
 *
 * @param value - The value to test (typically a `catch` binding)
 * @returns True if `value` is a {@link SelectionError}; false otherwise
 *
 * @example
 * ```ts
 * try {
 * 	createSelection({ judge, screen, needed: { ...NEEDED_CRITERION, threshold: 0.5 }, limit: 12 })
 * } catch (error) {
 * 	if (isSelectionError(error) && error.code === 'THRESHOLD') reportCutoff()
 * }
 * ```
 */
export declare function isSelectionError(value: unknown): value is SelectionError;

/**
 * Checks whether a value is a System One answer whose type and distribution the wire can read.
 *
 * @remarks
 * The guard checks `type` and the distribution the wire dereferences: the `noul` number for a
 * noul, the `probabilities` map for a choice, and the `probabilities` map or dense array for a
 * score, each probability a finite number in [0, 1]. The `choice`, `score`, `confidence`, and
 * `legend` members are carried unchecked, because the wire never reads them, so a value this
 * guard accepts can hold any value in those members. Distribution sums are not constrained;
 * values are never normalized. Hostile reads return false.
 *
 * @param value - The unknown answer candidate
 * @returns True if the type and the distribution satisfy the wire contract; false otherwise
 * @example
 * ```ts
 * isSystemOneAnswer({ type: 'noul', noul: 0.9 }) // true
 * isSystemOneAnswer({ type: 'score', probabilities: [0.2, 0.8] }) // true
 * isSystemOneAnswer({ type: 'noul', noul: 1.1 }) // false
 * ```
 */
export declare function isSystemOneAnswer(value: unknown): value is SystemOneAnswer;

/**
 * Checks whether a value is a System One response envelope with optional model and usage.
 *
 * @remarks
 * Answers remain unknown until checked against their questions. Missing and null usage counts
 * are accepted. Extra members are ignored, and unreadable fields return false.
 *
 * @param value - The unknown response candidate
 * @returns True if the envelope fields have their wire types; false otherwise
 * @example
 * ```ts
 * isSystemOneResponse({ answers: {}, usage: { input_tokens: null } }) // true
 * ```
 */
export declare function isSystemOneResponse(value: unknown): value is SystemOneResponse;

/**
 * Joins the reasoning a run's provider calls separated from the answer — the first call
 * seeds the accumulation, a later call appends blank-line separated so each turn's reasoning
 * stays readable.
 *
 * @remarks
 * Pure and total. `running` is `undefined` until a call surfaces reasoning, so the first join
 * returns `next` verbatim. Each call's non-empty thinking is recorded on the assistant message
 * that call appends. The joined result also includes thinking from calls that appended no
 * message, such as an aborted call. Only recorded thinking can return to a provider,
 * as its `replay` policy allows. Thinking stays out of `content`.
 *
 * @param running - The reasoning accumulated so far (`undefined` before the first)
 * @param next - This call's separated reasoning
 * @returns The joined reasoning
 *
 * @example
 * ```ts
 * joinThinking(undefined, 'first') // 'first'
 * joinThinking('', 'x') // 'x'
 * joinThinking('first', 'second') // 'first\n\nsecond'
 * ```
 */
export declare function joinThinking(running: string | undefined, next: string): string;

/**
 * Reports a judge call cancelled by the caller's signal or its deadline, carrying the
 * {@link JudgeResult} merged from the calls that completed before the cancel and the
 * machine-readable `code` `'ABORT'`.
 *
 * @remarks
 * `partial` keeps the answers and the usage of every completed call, so usage reported by
 * completed calls is retained; a cancel before the first call carries an empty partial. `cause` holds the failure the
 * cancel superseded when a throw raced the abort, and is undefined when the cancel was the only
 * failure.
 */
export declare class JudgeAbortError extends Error {
    /** Names the machine-readable condition — `'ABORT'`: a judge call cancelled mid-flight. */
    readonly code: "ABORT";
    readonly partial: JudgeResult;
    constructor(partial: JudgeResult, options?: ErrorOptions);
}

/** Names one answer by its form; it stores only the distribution a server returned. */
export declare type JudgeAnswer = ChoiceAnswer | ScoreAnswer | NoulAnswer;

/** Carries text or structured JSON the model reads; mirrors the TypeSafe `EntryType` without its null arm. */
export declare type JudgeEntry = string | JSONRecord | readonly JSONValue[];

/**
 * Reports a coded judge failure with its HTTP status and underlying cause when available.
 *
 * @remarks
 * The judge engine throws this error for a non-OK HTTP response, a missing or unparsable
 * response body, and a request refused before inference. Concrete wire decoders also use it for
 * a response they cannot read and for a wire limit. `status` is present only for an `HTTP`
 * failure; other codes leave it undefined.
 */
export declare class JudgeError extends Error {
    /** Names the machine-readable condition — `'HTTP'`: a non-OK response; `'PROTOCOL'`: a missing, unparsable, or unreadable response body; `'QUESTION'`: a request refused before inference. */
    readonly code: JudgeErrorCode;
    /** Holds the response status for an HTTP failure, or undefined for other codes. */
    readonly status: number | undefined;
    constructor(code: JudgeErrorCode, message: string, options?: ProviderErrorOptions);
}

/** Names the machine-readable judge failure conditions. */
export declare type JudgeErrorCode = 
/** Reports a non-OK HTTP response. */
'HTTP'
/** Reports a missing or unparsable response body, or a response a wire cannot read. */
| 'PROTOCOL'
/** Reports a request refused before inference: an empty question map, a malformed question or state, a wire limit, or a judge configuration that would refuse every request. */
| 'QUESTION';

/** Answers typed questions about one state with probabilities; the sibling of `ProviderInterface`, never a provider. */
export declare interface JudgeInterface {
    readonly id: string;
    readonly name: string;
    /** Holds the configured model identity; the wire composes it from everything that changes an answer under one state. */
    readonly model: string;
    /** Asks every question of the request about its state and returns the merged answers. */
    ask(request: JudgeRequest, signal: AbortSignal): Promise<JudgeResult>;
}

/** Names one question by its form, the protocol's type field under the fleet's named discriminant. */
export declare type JudgeQuestion = ChoiceQuestion | ScoreQuestion | NoulQuestion;

/** Carries one state and the questions asked about it, keyed by caller ids the model never sees; each question is evaluated on its own. */
export declare interface JudgeRequest {
    readonly state: JudgeEntry;
    readonly questions: Readonly<Record<string, JudgeQuestion>>;
}

/** Carries the answering model, the answers keyed by question id, the refusals, and the usage the request's calls spent. */
export declare interface JudgeResult {
    readonly model: string;
    readonly answers: Readonly<Record<string, JudgeAnswer>>;
    /** Holds each refused question by id; absent when none was refused. An id appears in answers or refusals, never both. */
    readonly refusals?: Readonly<Record<string, Refusal>>;
    readonly usage?: TokenUsage;
}

/** Records an answered or refused question with its sources, state, model, and storage time. */
export declare interface Judgment {
    readonly id: string;
    readonly question: JudgeQuestion;
    /** Carries the answer when the question was answered; mutually exclusive with refusal. */
    readonly answer?: JudgeAnswer;
    /** Carries the refusal when the question was refused; mutually exclusive with answer. */
    readonly refusal?: Refusal;
    readonly model: string;
    readonly sources: readonly string[];
    readonly state: string;
    readonly time: number;
    /** Carries usage only when the answering request held this question alone. */
    readonly usage?: TokenUsage;
}

/** Supplies an answered or refused question for storage before its time is stamped. */
export declare interface JudgmentInput {
    readonly id: string;
    readonly question: JudgeQuestion;
    readonly answer?: JudgeAnswer;
    readonly refusal?: Refusal;
    readonly model: string;
    readonly sources: readonly string[];
    readonly state: string;
    readonly usage?: TokenUsage;
}

/**
 * Stores judgments in insertion order and asks a judge only for unmatched question identities.
 *
 * @remarks
 * Adding an existing key replaces it without changing its insertion position. Construction
 * restores recorded times; adding stamps the current epoch milliseconds. Caller input is owned
 * through JSON on arrival, so a proxied record or request is accepted where a structured clone
 * refuses it, and records are copied on reads, so callers cannot change the stored identity
 * through nested values.
 *
 * @example
 * ```ts
 * const judgments = new JudgmentManager()
 * const records = await judgments.resolve(judge, request, ['message-a'], signal)
 * ```
 */
export declare class JudgmentManager implements JudgmentManagerInterface {
    #private;
    /**
     * Restores records without replacing their storage times.
     * @param judgments - The previously stored judgments to restore. Default: an empty list
     */
    constructor(judgments?: readonly Judgment[]);
    get count(): number;
    add(input: JudgmentInput): Judgment;
    add(inputs: readonly JudgmentInput[]): readonly Judgment[];
    judgment(id: string): Judgment | undefined;
    judgments(): readonly Judgment[];
    remove(id: string): boolean;
    remove(ids: readonly string[]): boolean;
    clear(): void;
    resolve(judge: JudgeInterface, request: JudgeRequest, sources: readonly string[], signal: AbortSignal): Promise<readonly Judgment[]>;
}

/** Stores judgments by caller key and resolves requests by reusing matching records. */
export declare interface JudgmentManagerInterface {
    readonly count: number;
    /** Stores inputs with the current epoch milliseconds; an existing key is replaced. */
    add(input: JudgmentInput): Judgment;
    add(inputs: readonly JudgmentInput[]): readonly Judgment[];
    /** Returns the record for a key, or `undefined` when absent. */
    judgment(id: string): Judgment | undefined;
    /** Returns stored records in insertion order. */
    judgments(): readonly Judgment[];
    /** Removes every supplied key; returns `true` only when all were present. */
    remove(id: string): boolean;
    remove(ids: readonly string[]): boolean;
    /** Removes all records. */
    clear(): void;
    /**
     * Reuses matching records and asks for the unmatched questions in one request.
     *
     * @param judge - The judge whose model identity participates in reuse
     * @param request - The state and keyed questions to resolve
     * @param sources - The ordered message ids the questions concern
     * @param signal - The cancellation signal checked before asking
     * @returns The resolved records in request key order
     * @throws JudgeAbortError Thrown when asking aborts, after completed partial records are stored
     */
    resolve(judge: JudgeInterface, request: JudgeRequest, sources: readonly string[], signal: AbortSignal): Promise<readonly Judgment[]>;
}

/**
 * Serves one conversation through classified records, a bounded briefing, and a final answer pass.
 * @example
 * ```ts
 * const ledger = new Ledger(provider, options)
 * ledger.conversation.add({ role: 'user', content: 'The refund needs approval.' })
 * const reply = await ledger.respond('What approval is needed?')
 * ```
 */
export declare class Ledger implements LedgerInterface {
    #private;
    /**
     * Composes the conversation, classifier, tools, and agent.
     * @param provider - The provider that serves the conversation
     * @param options - The filing policy, capacity, and request bounds
     * @throws {LedgerError} Thrown when a threshold, share, capacity, limit, topic, lookup, or gauge is invalid
     * @throws {LedgerError} Thrown when `predict` is not a nonnegative safe integer less than `capacity` (code `'CAPACITY'`)
     */
    constructor(provider: ProviderInterface, options: LedgerOptions);
    /**
     * Returns the owned request engine.
     * @returns The engine serving this conversation
     */
    get agent(): AgentInterface;
    /**
     * Returns the owned message history.
     * @returns The history filed and served by this ledger
     */
    get conversation(): ConversationInterface;
    /**
     * Returns the stored prompt price.
     * @returns The scale and fixed cost, or undefined before calibration
     */
    get gauge(): LedgerGauge | undefined;
    /**
     * Measures message scale and tool overhead from provider prompt usage.
     * @param signal - The signal bounding both calibration calls; an abort rejects with its reason
     * @returns The stored scale and fixed cost
     * @throws {LedgerError} Thrown when either call reports no prompt usage, or a prompt usage of 0 or less (code `'GAUGE'`)
     * @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
     */
    calibrate(signal: AbortSignal): Promise<LedgerGauge>;
    /**
     * Appends a request and serves it, recovering an unfinished first pass with one answer pass.
     * A failed calibration rejects with `LedgerError` code `'GAUGE'`.
     * @param content - The request text
     * @param signal - The caller's cancellation signal; an abort during calibration rejects with its reason
     * @returns The final pass and the usage of every pass
     * @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
     * @throws {LedgerError} Thrown when calibration fails (code `'GAUGE'`)
     */
    respond(content: string, signal?: AbortSignal): Promise<LedgerResult>;
}

/**
 * Lists the categories the ledger files a message under, in the order the category question
 * names them — the one list the {@link LedgerCategory} union derives from.
 */
export declare const LEDGER_CATEGORIES: readonly ["fact", "rule", "correction", "request", "opinion", "chatter", "distractor"];

/**
 * Supplies the text of each ledger note, worded for a model that answers in its final
 * message.
 */
export declare const LEDGER_NOTES: LedgerNote;

/** Prefixes the key of an owner's record, which the owner's id follows. */
export declare const LEDGER_OWNER_PREFIX = "owner:";

/**
 * Supplies the wording of every question the ledger asks its judge.
 *
 * @remarks
 * The wording names a support desk. Fit the cutoffs for the wording and judge you use.
 */
export declare const LEDGER_QUESTIONS: LedgerQuestion;

/** Names the key of the record that holds the rules no owner claims. */
export declare const LEDGER_RULES_KEY = "rules";

/**
 * Holds back the share of the prompt budget the scale can rise by between calibration and a
 * request's first call.
 *
 * @remarks
 * Across the `ledger-deny` and `ledger-admit` series of 2026-10-08, a
 * request's first-call tokens per estimate unit rose at most from 1.150 at the seed to 1.212, 5.4
 * percent; the ledger divides its prompt budget by 1.06.
 */
export declare const LEDGER_SCALE_DRIFT = 0.06;

/**
 * Selects the agent bounds and hooks a ledger passes through to the agent it builds.
 *
 * @remarks
 * `limit` must be a nonnegative safe integer. Default: the `DEFAULT_LEDGER_LIMIT` constant. The
 * ledger owns every other agent option: the conversation, the tools, the selection handler, and
 * the scope.
 */
export declare type LedgerAgentOptions = Pick<AgentOptions, 'limit' | 'timeout' | 'budget' | 'signal' | 'on' | 'error'>;

/** Names the category the ledger files a message under, one of {@link LEDGER_CATEGORIES}. */
export declare type LedgerCategory = (typeof LEDGER_CATEGORIES)[number];

/**
 * Reads a message's category from its shape, or returns undefined to leave it to the judge.
 *
 * @param message - The message to file
 * @returns The category the message's shape decides, or undefined
 */
export declare type LedgerCategoryHandler = (message: Message) => LedgerCategory | undefined;

/**
 * Carries the ledger's filing of its conversation's messages, keyed by message id.
 *
 * @remarks
 * `quiet` holds the messages the projection leaves out. `categories` maps each decided message to
 * its category and `topics` to its desk topics. `amended` and `superseded` map an earlier message
 * to the later messages that replace part or all of it, in conversation order.
 */
export declare interface LedgerClassification {
    readonly quiet: ReadonlySet<string>;
    readonly categories: ReadonlyMap<string, LedgerCategory>;
    readonly topics: ReadonlyMap<string, readonly string[]>;
    readonly amended: ReadonlyMap<string, readonly string[]>;
    readonly superseded: ReadonlyMap<string, readonly string[]>;
}

/**
 * Lists the registry ids and owner ids a text names.
 *
 * @param text - The text to read
 * @param partial - If `true`, a name word that only one owner name carries also names that owner; if `false`, only a whole name does
 * @returns The ids the text names
 */
export declare type LedgerEntityHandler = (text: string, partial: boolean) => ReadonlySet<string>;

/**
 * Reports an invalid ledger configuration, failed calibration, or unowned request selection,
 * carrying the machine-readable `code`.
 *
 * @remarks
 * A threshold, share, capacity, limit, topic, lookup, or gauge outside its bounds is a programmer
 * error and throws this with the matching {@link LedgerErrorCode}. A calibration call that reports
 * no prompt usage throws this with `'GAUGE'`. Narrow a caught value with {@link isLedgerError} and
 * branch on `error.code`. A selection without an active `respond` call, or for a request other than
 * that call's request or a ledger note, reports `'REQUEST'` through the selection's fault.
 */
export declare class LedgerError extends Error {
    /** Names the machine-readable condition; the {@link LedgerErrorCode} union describes each code. */
    readonly code: LedgerErrorCode;
    constructor(code: LedgerErrorCode, message: string);
}

/** Names the machine-readable conditions a `LedgerError` error reports. */
export declare type LedgerErrorCode = 
/** Reports a selection whose request is neither an active `respond` call's request nor a ledger note. */
'REQUEST'
/** Reports a threshold that is not finite or lies outside the interval above 0 up to and including 1. */
| 'THRESHOLD'
/** Reports a share that is not finite or lies outside the interval above 0 up to and including 1. */
| 'SHARE'
/** Reports an invalid capacity or a generation cap that is not a nonnegative safe integer less than capacity. */
| 'CAPACITY'
/** Reports a recall limit or an agent limit that is not a nonnegative safe integer. */
| 'LIMIT'
/** Reports a topic with an empty name or a name another topic carries. */
| 'TOPIC'
/** Reports a lookup tool named `recall` or a name another lookup tool carries. */
| 'LOOKUP'
/** Reports a supplied gauge outside its bounds, or a calibration call that reports no prompt usage, or a prompt usage of 0 or less. */
| 'GAUGE';

/**
 * Carries the price of a prompt in tokens, measured against the model the ledger serves.
 *
 * @remarks
 * `scale` is the tokens one unit of the `estimateMessages` estimate costs. `fixed` is the tokens
 * every request carries beyond its messages, such as the tool definitions and the chat framing.
 * `scale` must be finite and greater than 0, and `fixed` finite and at least 0.
 */
export declare interface LedgerGauge {
    readonly scale: number;
    readonly fixed: number;
}

/**
 * Serves the requests of one conversation through an agent whose prompt the ledger projects from
 * what the judge filed.
 *
 * @remarks
 * The ledger files every message of its conversation through the injected judge, projects the
 * owner records and the rules record from that filing, and sends a briefing and a tail that fit
 * its capacity. It owns its agent: applying a scope that carries `select` displaces the ledger's
 * selection handler.
 */
export declare interface LedgerInterface {
    /** Holds the agent the ledger drives, with the ledger's tools and selection handler. */
    readonly agent: AgentInterface;
    /** Holds the one conversation the ledger files and serves. */
    readonly conversation: ConversationInterface;
    /** Holds the measured price of a prompt, or undefined until the ledger calibrates when the options supplied none. */
    readonly gauge: LedgerGauge | undefined;
    /**
     * Appends `content` as a user message and serves it through to its reply.
     *
     * @remarks
     * The ledger calibrates first while `gauge` is undefined. When the first pass ends without final
     * text and the caller did not abort, the ledger adds the results and cue notes and makes one
     * answer pass that advertises no tools. A `respond` or `calibrate` call while either is in flight
     * rejects with an `AgentError` whose `code` is `'CONCURRENCY'`. A failed calibration rejects with
     * `LedgerError` code `'GAUGE'`.
     * Direct agent runs share an active request's gauge readings and repeat stop, even when their
     * selections fault. Only `respond` and `calibrate` calls are refused by the concurrency guard.
     *
     * @param content - The request text
     * @param signal - An optional caller signal; an abort during calibration rejects with its reason; afterward it ends the request partial and skips the answer pass
     * @returns The reply and the passes the request took
     * @throws {LedgerError} Thrown when calibration fails (code `'GAUGE'`)
     * @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
     */
    respond(content: string, signal?: AbortSignal): Promise<LedgerResult>;
    /**
     * Measures the gauge, holds it as `gauge`, and returns it.
     *
     * @remarks
     * The ledger sends its system message and its conversation's view to the provider twice, with
     * and without the tool definitions. The call without tools prices the messages and the
     * difference between the calls is the fixed cost.
     * An abort during calibration rejects with the abort reason. A call during `respond` or `calibrate` rejects
     * with `AgentError` code `'CONCURRENCY'`.
     *
     * @param signal - The signal that aborts both calls
     * @returns The measured gauge
     * @throws {LedgerError} Thrown when a call reports no prompt usage, or a prompt usage of 0 or less (code `'GAUGE'`)
     * @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
     */
    calibrate(signal: AbortSignal): Promise<LedgerGauge>;
}

/**
 * Carries one record line: a sentence of a live message, verbatim except that a sentence that opens with a pronoun opens with its party and a colon.
 *
 * @remarks
 * `source` is the message id and `sentence` the zero-based index of the sentence in it. `party` is
 * the person a sentence that opens with a pronoun refers to, read from the sentence before it;
 * `text` then opens with `party` and a colon. `topics` are the source's desk topics and `role` its
 * role.
 */
export declare interface LedgerLine {
    readonly text: string;
    readonly source: string;
    readonly sentence: number;
    readonly party?: string;
    readonly topics: readonly string[];
    readonly role: MessageRole;
}

/**
 * Carries one application lookup: the tool the model calls and the handler that reads its results.
 *
 * @remarks
 * The ledger registers the tool behind a repeat stop beside its own `recall` tool, so the tool must
 * not be named `recall`, and no two lookups can share a tool name.
 * The repeat stop compares the tool name and canonical arguments without normalizing strings.
 * The projection uses {@link identifyLookup}, which trims and uppercases top-level string
 * arguments when deciding which reading replaces an earlier one.
 * A throwing `read` handler makes the lookup failed: it files as chatter and replaces no reading.
 * A seed tool message with no recorded result counts as a successful lookup.
 */
export declare interface LedgerLookup {
    readonly tool: ToolInterface;
    readonly read: LedgerLookupHandler;
}

/**
 * Reads one successful lookup result into the ids and owners it names.
 *
 * @param args - The arguments the model called the lookup with
 * @param text - The result text the tool returned
 * @returns The ids and owners the result names, or undefined when the lookup found nothing
 *
 * @example
 * ```ts
 * const read: LedgerLookupHandler = (args, text) => {
 * 	if (text.startsWith('No record')) return undefined
 * 	const id = String(args.id ?? '').trim().toUpperCase()
 * 	return { ids: [id], owners: [{ id, names: [] }] }
 * }
 * ```
 */
export declare type LedgerLookupHandler = (args: Readonly<Record<string, unknown>>, text: string) => LedgerLookupResult | undefined;

/**
 * Carries one successful lookup result as the ledger read it.
 *
 * @remarks
 * `id` is the tool message's id, `name` and `arguments` come from the call it answers, and `text`
 * is the result text. `result` is what the lookup's handler read, undefined for a lookup that found
 * nothing; an empty reading still replaces an earlier reading of the same call.
 */
export declare interface LedgerLookupReading {
    readonly id: string;
    readonly name: string;
    readonly arguments: Readonly<Record<string, unknown>>;
    readonly text: string;
    readonly result: LedgerLookupResult | undefined;
}

/** Carries what a lookup handler read from one lookup result: the ids it names and the owners among them. */
export declare interface LedgerLookupResult {
    readonly ids: readonly string[];
    readonly owners: readonly LedgerOwner[];
}

/** Names what became of a lookup of an earlier request, as the tail stub of its result reports it. */
export declare type LedgerLookupState = 'failed' | 'empty' | 'shown' | 'hidden';

/**
 * Carries the text of each note the ledger writes into its conversation or returns to the model.
 *
 * @remarks
 * `cue` is the last user message of an answer pass. `results` heads the note that carries what the
 * first pass's lookups and recalls returned. `repeat` is the failure a repeated tool call returns,
 * and the ledger reads a failure with exactly this text as a repeat. `closed` is the failure a
 * `recall` call returns after the request's recalls are spent, repeated, or out of room.
 */
export declare interface LedgerNote {
    readonly cue: string;
    readonly results: string;
    readonly repeat: string;
    readonly closed: string;
}

/**
 * Configures a ledger: its judge and the wording and cutoffs it files with, the desk topics, the
 * context capacity, and the optional first-pass thinking, lookups, gauge, shares, recall, notes,
 * and agent bounds.
 *
 * @remarks
 * `judge` answers every filing question. `system` is the application's system text, a date
 * sentence included; the briefing follows it in the system message. `topics` lists the desk
 * topics. `questions` and `thresholds` are required with no default; pass the `LEDGER_QUESTIONS`
 * constant for the measured wording, and fit `thresholds` on the wording and the judge you pass. `capacity` is the model's context window in tokens and must be a positive safe
 * integer. Without `gauge`, the ledger calibrates before its first pass. `share` and `notes`
 * default leaf by leaf to the `DEFAULT_LEDGER_SHARE` and `LEDGER_NOTES` constants.
 * `predict` is the generation cap in tokens, including thinking. Default: 0. It must be a
 * nonnegative safe integer less than `capacity`; construction throws `LedgerError` with code
 * `'CAPACITY'` otherwise. The plan budgets
 * `max(0, (capacity - predict) * share.prompt - fixed) / (1 + LEDGER_SCALE_DRIFT)`.
 * Recall closes when `left - predict < 2 * reserve`.
 */
export declare interface LedgerOptions {
    readonly judge: JudgeInterface;
    readonly system: string;
    readonly topics: readonly LedgerTopic[];
    readonly questions: LedgerQuestion;
    readonly thresholds: LedgerThreshold;
    readonly capacity: number;
    readonly predict?: number;
    /**
     * Selects thinking for the first pass; the answer pass always runs with thinking off.
     * If `true`, the first pass requests thinking; if `false`, it suppresses thinking; omission
     * leaves the provider's default in effect.
     * A thinking model asked for a reply with no tools might end its turn inside its reasoning or
     * think to the generation cap, and the answer pass exists to produce the reply.
     */
    readonly think?: boolean;
    readonly gauge?: LedgerGauge;
    readonly lookups?: readonly LedgerLookup[];
    readonly share?: Partial<LedgerShare>;
    readonly recall?: LedgerRecallOptions;
    readonly notes?: Partial<LedgerNote>;
    readonly agent?: LedgerAgentOptions;
}

/**
 * Carries one owner a lookup result names: its id and the names it goes by.
 *
 * @remarks
 * An owner is the party a record collects statements about, such as a customer account. `names`
 * can be empty when the result names the owner by id alone.
 */
export declare interface LedgerOwner {
    readonly id: string;
    readonly names: readonly string[];
}

/** Names a briefing source's planning group: a topic match, an off-topic rule or correction, or a name match. */
export declare type LedgerPlanningGroup = 1 | 2 | 3;

/**
 * Carries the records projected from a conversation, the stale sentences, and the live messages no
 * record placed.
 */
export declare interface LedgerProjection {
    readonly records: readonly LedgerRecord[];
    readonly stale: readonly LedgerStaleSentence[];
    readonly loose: readonly string[];
}

/**
 * Carries what a projection reads.
 *
 * @remarks
 * `system` is the system text, whose names never serve as a party. `exclude` lists the message ids
 * no record places, such as requests and ledger notes. `owners` maps each owner id to its names.
 * `readings` lists the lookup results in conversation order, and `entities` maps a message id to
 * the registry ids its text names.
 */
export declare interface LedgerProjectionInput {
    readonly system: string;
    readonly exclude: readonly string[];
    readonly owners: ReadonlyMap<string, readonly string[]>;
    readonly messages: readonly Message[];
    readonly readings: readonly LedgerLookupReading[];
    readonly entities: ReadonlyMap<string, readonly string[]>;
    readonly classification: LedgerClassification;
}

/** Carries the owners and the desk topics one request names, which select its records. */
export declare interface LedgerProjectionRequest {
    readonly owners: readonly string[];
    readonly topics: readonly string[];
}

/**
 * Carries the wording of every question the ledger asks its judge.
 *
 * @remarks
 * `category` is the choice question asked about each message the category handler leaves open; its
 * criteria name every {@link LedgerCategory}. `topic` is the instructions of the noul question
 * asked for each desk topic, whose criteria the ledger frames from the topic, as
 * {@link LedgerTopic} states. `amends` and `supersedes` are the noul questions asked about an
 * earlier and a later message. The ledger asks each question as given, so a judgment reused across
 * ledgers matches only under the same wording. Pass the `LEDGER_QUESTIONS` constant for the
 * measured wording.
 */
export declare interface LedgerQuestion {
    readonly category: ChoiceQuestion & {
        readonly criteria: Readonly<Record<LedgerCategory, JudgeEntry>>;
    };
    readonly topic: string;
    readonly amends: NoulQuestion;
    readonly supersedes: NoulQuestion;
}

/**
 * Configures the ledger's `recall` tool.
 *
 * @remarks
 * `limit` caps the `recall` calls one request can make before the tool refuses with the
 * {@link LedgerNote} `closed` text; it must be a nonnegative safe integer. Default: the
 * `DEFAULT_RECALL_LIMIT` constant. `description` replaces the tool description the ledger builds
 * from its topics.
 * Recall identity is the trimmed `{ topic }` alone; other arguments do not change its identity.
 */
export declare interface LedgerRecallOptions {
    readonly limit?: number;
    readonly description?: string;
}

/**
 * Carries one record: the live messages placed on one owner or on the rules, as lines.
 *
 * @remarks
 * `key` is `rules` for the rules record and `owner:` followed by the owner id for an owner record.
 * `title` is `Rules`, or the owner's first name with its id. `members` lists the placed message ids
 * in conversation order.
 */
export declare interface LedgerRecord {
    readonly key: string;
    readonly title: string;
    readonly members: readonly string[];
    readonly lines: readonly LedgerLine[];
}

/**
 * Carries the ids the ledger's lookups named and the owners among them.
 *
 * @remarks
 * `ids` holds every id a lookup argument or result named, owner ids included. `owners` maps each
 * owner id to its names in the order the lookups returned them, so a record's title takes the first
 * name read.
 */
export declare interface LedgerRegistry {
    readonly ids: ReadonlySet<string>;
    readonly owners: ReadonlyMap<string, readonly string[]>;
}

/**
 * Carries the outcome of one request a ledger served: the agent result of its reply and every pass
 * it took.
 *
 * @remarks
 * `passes` holds the first pass and, when the ledger ran one, the answer pass. `content` and
 * `partial` are the last pass's, `usage` sums the passes' usage, and `thinking` joins the passes'
 * reasoning; each optional member is present when any pass reported it.
 */
export declare interface LedgerResult extends AgentResult {
    readonly passes: readonly AgentResult[];
}

/**
 * Carries the share of the context capacity the prompt can take and the share of that budget the
 * tail can take.
 *
 * @remarks
 * `prompt` is a share of the ledger's `capacity`; the fixed tokens of the gauge come out of it
 * before the briefing and the tail take the rest. `tail` is a share of what remains for messages.
 * Each share must be finite, greater than 0, and at most 1.
 */
export declare interface LedgerShare {
    readonly prompt: number;
    readonly tail: number;
}

/**
 * Carries one sentence a later message made stale, with the tokens the two share.
 *
 * @remarks
 * `source` is the earlier message's id and `sentence` the zero-based index of the sentence. The
 * projection leaves a stale sentence out of the records and the briefing. Recall, answer notes,
 * and the seed tail keep the stored content.
 */
export declare interface LedgerStaleSentence {
    readonly source: string;
    readonly sentence: number;
    readonly tokens: readonly string[];
}

/**
 * Carries the probability cutoff of each reading the ledger takes from its judge.
 *
 * @remarks
 * `category` decides a category and the quiet and decisive groups; `topic` decides a desk topic;
 * `amends` and `supersedes` decide a pair. `correction` is the lower floor a message's `correction`
 * probability must reach before the ledger asks the pair questions about it. Each cutoff must be
 * finite, greater than 0, and at most 1. No default is supplied: a cutoff holds only for the
 * question wording and the judge it was fitted on.
 */
export declare interface LedgerThreshold {
    readonly category: number;
    readonly topic: number;
    readonly amends: number;
    readonly supersedes: number;
    readonly correction: number;
}

/**
 * Carries the id-shaped tokens and the numbers of a text.
 *
 * @remarks
 * `ids` holds the uppercased hyphenated tokens that contain a digit. `numbers` holds the numbers
 * outside those ids, with grouping commas removed.
 */
export declare interface LedgerTokenSet {
    readonly ids: ReadonlySet<string>;
    readonly numbers: ReadonlySet<number>;
}

/**
 * Carries one desk topic: the subject the ledger asks its judge about for every message.
 *
 * @remarks
 * The ledger asks the {@link LedgerQuestion} `topic` instructions with the criteria
 * `The message concerns NAME: CRITERION` for true and `The message does not concern NAME` for
 * false, where `NAME` is `name` and `CRITERION` is `criterion`. `name` must be non-empty and
 * unique among the ledger's topics.
 */
export declare interface LedgerTopic {
    readonly name: string;
    readonly criterion: string;
    /**
     * If `true`, the ledger asks this topic about each request as well as about each statement;
     * if `false`, it asks it about statements only. Default: `true`.
     */
    readonly requested?: boolean;
}

/**
 * Links each id-shaped lookup argument to its owner.
 *
 * @remarks
 * An owner argument links to itself. Any other id-shaped argument links to the single owner id its
 * reading's text names. An empty reading links nothing, and a later reading overwrites an earlier
 * link of the same argument.
 *
 * @param readings - The lookup readings in conversation order
 * @param owners - The owners keyed by id
 * @returns The owner id of each linked argument id; an argument whose text names no owner or several is absent
 *
 * @example
 * ```ts
 * linkOwners(
 * 	[{ id: 'tool-1', name: 'lookup_order', arguments: { id: 'BW-5512' }, text: 'Order BW-5512 for account BW-20931.', result: { ids: [], owners: [] } }],
 * 	new Map([['BW-20931', ['Brightwater Studio']]]),
 * ) // Map { 'BW-5512' => 'BW-20931' }
 * ```
 */
export declare function linkOwners(readings: readonly LedgerLookupReading[], owners: ReadonlyMap<string, readonly string[]>): ReadonlyMap<string, string>;

/**
 * Matches the registry ids and owners a text names.
 *
 * @remarks
 * An id counts when the text holds it as an id token. An owner counts when the text holds one of
 * its names whole. With `partial`, a capitalized name word that only one name carries also names
 * that name's owners, matched case-sensitively so a common word that spells a first name does not.
 *
 * @param registry - The registry to match against
 * @param text - The text to read
 * @param partial - If `true`, a name word only one name carries also names its owners; if `false`, only a whole name does
 * @returns The registry ids and owner ids the text names
 *
 * @example
 * ```ts
 * const registry = { ids: new Set(['BW-20931']), owners: new Map([['BW-20931', ['Brightwater Studio']]]) }
 * matchEntities(registry, 'Ask Brightwater about it', true) // Set { 'BW-20931' }
 * matchEntities(registry, 'Ask Brightwater about it', false) // Set {}
 * ```
 */
export declare function matchEntities(registry: LedgerRegistry, text: string, partial: boolean): ReadonlySet<string>;

/**
 * Checks whether a line is the cut line {@link cutListing} writes.
 *
 * @param line - The line to check
 * @returns True if the line is a cut line; false otherwise
 *
 * @example
 * ```ts
 * matchesCutLine('2 older items not shown; name a narrower topic to narrow the recall') // true
 * ```
 */
export declare function matchesCutLine(line: string): boolean;

/**
 * Matches a recorded question, ordered sources, rendered state, and judge identity by JSON text, so key order counts.
 *
 * @param judgment - The recorded judgment to compare
 * @param question - The question to ask
 * @param sources - The ordered source message ids
 * @param state - The rendered state to compare
 * @param model - The configured judge identity
 * @returns True if every identity component matches; false otherwise
 * @example
 * ```ts
 * matchesJudgment(judgment, question, ['message-a'], 'Charged twice', judge.model)
 * ```
 */
export declare function matchesJudgment(judgment: Judgment, question: JudgeQuestion, sources: readonly string[], state: string, model: string): boolean;

/**
 * Bounds the decoded error excerpt's input in bytes — `2048`, the leading bytes of a non-OK
 * response body handed to the decoder before the read cancels the remainder, so a `ProviderError`
 * message never carries a longer excerpt.
 */
export declare const MAX_ERROR_BODY_LENGTH = 2048;

/**
 * Implements the {@link ConversationStoreInterface} in memory — a process-lifetime `Map` of
 * {@link ConversationSnapshot}s keyed by conversation id, the default store
 * {@link import('../factories.js').createMemoryConversationStore} builds and the default
 * backing for `open` / `save`. The exact twin of
 * {@link import('@orkestrel/workspace').MemoryWorkspaceStore}.
 *
 * @remarks
 * A plain `Map<string, ConversationSnapshot>` — the snapshot is already pure,
 * self-contained JSON, so no encoding is needed for the memory tier. Like the
 * {@link import('@orkestrel/workspace').MemoryWorkspaceStore} it twins,
 * there is no idle-TTL and no eviction: a persisted conversation lives until an explicit `delete`. A
 * durable backend (JSON / SQLite / IndexedDB) swaps in through the same interface without touching
 * the {@link import('../ConversationManager.js').ConversationManager} or the
 * {@link import('../Conversation.js').Conversation} — its driver-pluggable twin is
 * {@link import('./DatabaseConversationStore.js').DatabaseConversationStore} (the snapshot as one
 * opaque JSON column).
 *
 * - **`get` resolves the persisted snapshot for an id**, or `undefined` if none is stored.
 * - **`set` inserts / replaces under the snapshot's own `id`** (no separate id param).
 * - **`delete` drops a snapshot by id**; an absent id is a no-op (no throw).
 *
 * The public surface is exactly `get` / `set` / `delete` — no extra members (the method
 * bijection with {@link ConversationStoreInterface}). Hydration is a caller concern: a
 * {@link import('../ConversationManager.js').ConversationManager} reads a snapshot back and rebuilds
 * the live conversation through the `snapshot` option (its `open` / `save`).
 *
 * @example
 * ```ts
 * import { createConversation, createMemoryConversationStore } from '@orkestrel/agent'
 *
 * const store = createMemoryConversationStore()
 * const conversation = createConversation()
 * conversation.add({ role: 'user', content: 'hello' })
 * await store.set(conversation.snapshot())   // persist the conversation
 * const snapshot = await store.get(conversation.id)
 * await store.delete(conversation.id)        // drop it
 * ```
 */
export declare class MemoryConversationStore implements ConversationStoreInterface {
    #private;
    /**
     * Resolves the persisted snapshot for `id`, or `undefined` if none is stored.
     *
     * @param id - The conversation id to resolve (a {@link ConversationSnapshot.id})
     * @returns The persisted snapshot, or `undefined` if absent
     */
    get(id: string): Promise<ConversationSnapshot | undefined>;
    /**
     * Inserts or replaces a snapshot under its own `snapshot.id` (no separate id param —
     * mirroring {@link import('@orkestrel/workspace').WorkspaceStoreInterface}'s `set`).
     *
     * @param snapshot - The snapshot to store (keyed by its `id`)
     * @returns A promise that resolves after the snapshot is stored
     */
    set(snapshot: ConversationSnapshot): Promise<void>;
    /**
     * Drops a snapshot by id; an absent id is a no-op (no throw).
     *
     * @param id - The conversation id to drop
     * @returns A promise that resolves after the snapshot is dropped
     */
    delete(id: string): Promise<void>;
}

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
export declare interface Message {
    readonly id: string;
    readonly role: MessageRole;
    readonly content: string;
    /** Holds an assistant turn's requested tools — its `tool_calls`, replayed. */
    readonly calls?: readonly ToolCall[];
    /** Holds the `id` of the {@link ToolCall} a `tool` turn answers. */
    readonly call?: string;
    /**
     * Holds multimodal image data attached to this turn — base64-encoded image strings,
     * forwarded to a vision-capable provider (the provider maps them onto the wire's
     * per-message `images` array). Present only on a multimodal turn; absent otherwise.
     */
    readonly images?: readonly string[];
    /**
     * Holds the reasoning the provider call that produced an assistant turn separated from its
     * `content`. It is present only on an assistant turn whose call surfaced reasoning. It never
     * enters `content`, judge state, a briefing, or a summary. The agent loop, a relay server, and
     * a ledger apply the provider's `replay` policy before calling it. A direct `generate` or
     * `stream` call sends messages as given.
     */
    readonly thinking?: string;
}

/**
 * Lists the roles a conversation message can play, in the order the wire contract names them —
 * the one list the {@link import('./types.js').MessageRole} union derives from, the message
 * guard tests membership against, and the message shape passes to its literal contract.
 */
export declare const MESSAGE_ROLES: readonly ["system", "user", "assistant", "tool"];

/**
 * Estimates the per-message role and framing overhead {@link import('./helpers.js').estimateMessages}
 * adds on top of a message's content estimate — `4` tokens for the fixed wire framing every
 * conversation turn carries (its role tag, its delimiters) that
 * {@link import('./helpers.js').estimateTokens}'s content-only heuristic does not otherwise
 * capture.
 */
export declare const MESSAGE_TOKEN_OVERHEAD = 4;

/** Validates and projects conversation messages at a JSON wire boundary. */
export declare const messageContract: ContractInterface<Readonly<{
id: string;
role: "system" | "user" | "assistant" | "tool";
content: string;
} & {
calls?: readonly Readonly<{
id: string;
name: string;
arguments: {
readonly [k: string]: JSONValue;
};
} & {}>[];
call?: string;
images?: readonly string[];
thinking?: string;
}>>;

/**
 * Carries the minimal data needed to author a {@link Message} — the `id` is
 * assigned by the layer that stores it, so a caller supplies only role / content
 * (and, for a replayed assistant turn, its `calls`; for a tool turn, the `call` it answers).
 */
export declare interface MessageInput {
    readonly role: MessageRole;
    readonly content: string;
    readonly calls?: readonly ToolCall[];
    /** Holds the `id` of the {@link ToolCall} a `tool` turn answers. */
    readonly call?: string;
    /**
     * Holds multimodal image data for this turn — base64-encoded image strings forwarded to a
     * vision-capable provider (carried verbatim onto the stored {@link Message}).
     */
    readonly images?: readonly string[];
    /**
     * Holds the reasoning the provider call that produced an assistant turn separated from its
     * `content`. It is present only on an assistant turn whose call surfaced reasoning. It never
     * enters `content`, judge state, a briefing, or a summary. The agent loop, a relay server, and
     * a ledger apply the provider's `replay` policy before calling it. A direct `generate` or
     * `stream` call sends messages as given.
     */
    readonly thinking?: string;
}

/**
 * Stores immutable {@link Message}s in insertion order and mints each `id` on `add` — the
 * message-store contract {@link AgentContextInterface.messages} is typed to, which the active
 * {@link ConversationInterface} satisfies structurally.
 *
 * @remarks
 * - **Store.** Messages live in insertion order; `count` is how many are stored.
 *   `add` takes one {@link MessageInput} or a batch and mints each message's
 *   `id` (a random UUID), returning the created message(s). A stored message is
 *   immutable — created once from its input, never mutated.
 * - **Lookup.** `message(id)` resolves one by id (`undefined` when absent);
 *   `messages()` lists every message in insertion order.
 * - **Removal.** `remove` drops one by id, or a batch — `true` only when every supplied id
 *   was removed; `clear` empties the store.
 * - **Event-free.** A purely data store — no Emitter, no events.
 */
export declare interface MessageManagerInterface {
    readonly count: number;
    /**
     * Stores one {@link MessageInput}, or a batch — mints each message's `id` and returns the
     * created message or messages; a stored message is immutable.
     */
    add(input: MessageInput): Message;
    add(inputs: readonly MessageInput[]): readonly Message[];
    /** Looks up one stored message by id (`undefined` when absent). */
    message(id: string): Message | undefined;
    /** Lists every stored message, in insertion order. */
    messages(): readonly Message[];
    /**
     * Removes one message by id, or a batch — `true` only when every supplied id was removed.
     */
    remove(id: string): boolean;
    remove(ids: readonly string[]): boolean;
    /** Removes every stored message. */
    clear(): void;
}

/** Names the role a {@link Message} plays in a conversation turn. */
export declare type MessageRole = (typeof MESSAGE_ROLES)[number];

/**
 * Describes a conversation message's JSON wire projection.
 *
 * @remarks
 * The wire is strictly narrower than Message: non-JSON call arguments are refused,
 * and execution context stays local. The guard refuses extra members; the parser drops them.
 */
export declare const messageShape: ObjectShape<    {
id: StringShape;
role: LiteralShape<readonly ["system", "user", "assistant", "tool"]>;
content: StringShape;
calls: OptionalShape<ArrayShape<ObjectShape<    {
id: StringShape;
name: StringShape;
arguments: ObjectShape<Record<never, never>, JSONShape>;
}, boolean | ContractShape>>>;
call: OptionalShape<StringShape>;
images: OptionalShape<ArrayShape<StringShape>>;
thinking: OptionalShape<StringShape>;
}, boolean | ContractShape>;

/** Supplies measured needed criteria without choosing the application's threshold. */
export declare const NEEDED_CRITERION: Pick<Criterion, 'yes' | 'no'>;

/** Asks whether the marked subject is needed to carry out the marked request correctly. */
export declare const NEEDED_QUESTION = "Is message [A] needed to carry out the request in message [B] correctly?";

/** Carries the probability that the answer is yes; the protocol's noul field. */
export declare interface NoulAnswer {
    readonly form: 'noul';
    readonly noul: number;
}

/** Carries what makes a noul answer true and what makes it false; an omitted side is undescribed. */
export declare interface NoulCriteria {
    readonly true?: JudgeEntry;
    readonly false?: JudgeEntry;
}

/** Asks the model whether a statement about the state holds. */
export declare interface NoulQuestion {
    readonly form: 'noul';
    readonly instructions?: JudgeEntry;
    readonly criteria?: NoulCriteria;
}

/**
 * Names the status a relay answers for a request body at or above its byte budget — `413`,
 * carried with no body and answered for an aborted inbound read as well.
 */
export declare const OVERSIZED_RELAY_STATUS = 413;

/**
 * Parses a judgment id as a needed condition key, the inverse of `buildConditionKey`.
 * @param key - The judgment id to read
 * @returns The condition, subject id, and request id, or `undefined` when the id is not a needed key
 * @example
 * ```ts
 * parseConditionKey('["needed","a","b"]') // ['needed', 'a', 'b']
 * parseConditionKey('other-condition') // undefined
 * ```
 */
export declare function parseConditionKey(key: string): readonly ['needed', string, string] | undefined;

/** Lists the categories that place a message no owner claims on the rules record. */
export declare const PLACED_CATEGORIES: readonly LedgerCategory[];

/**
 * Places a message on the record keys it joins.
 *
 * @remarks
 * A message joins the owner records its entities name, directly or through a linked lookup argument.
 * A message that names no owner joins where the earlier side of its amended pair joins, and a
 * message with no earlier side joins the rules record when it is filed as a rule or a correction.
 * A message that is not live still places, because a correction joins where its earlier side would
 * join.
 *
 * @param input - The owners, entities, and classification to read
 * @param links - The owner of each linked lookup argument, from {@link linkOwners}
 * @param amending - The earlier sides of each message's amended pairs
 * @param id - The message id
 * @param seen - The ids already visited, which stops a cycle of amended pairs
 * @returns The record keys, empty when the message is loose
 *
 * @example
 * ```ts
 * placeMember(input, new Map(), new Map(), 'user-1', new Set()) // Set { 'owner:BW-20931' }
 * ```
 */
export declare function placeMember(input: LedgerProjectionInput, links: ReadonlyMap<string, string>, amending: ReadonlyMap<string, readonly string[]>, id: string, seen: ReadonlySet<string>): ReadonlySet<string>;

/**
 * Reports a provider stream cancelled mid-flight by its bound signal — thrown by a
 * {@link ProviderInterface}'s `stream`, carrying the {@link ProviderResult} assembled from
 * whatever streamed before the cancel and the machine-readable `code` `'ABORT'`.
 *
 * @remarks
 * Lets a caller recover the partial content (and any tool calls / usage seen so far)
 * on cancellation: `catch` the throw, narrow with {@link isProviderAbortError}, and
 * read `partial`. `code` is the machine-readable condition (`'ABORT'` — the only one this
 * error reports), so a `catch` branches on it rather than on the message string. `cause`
 * holds the failure the cancel superseded when a throw raced the abort — the wire decoder's
 * {@link ProviderError}, say — and is undefined when the cancel was the only failure.
 */
export declare class ProviderAbortError extends Error {
    /** Names the machine-readable condition — `'ABORT'`: a stream cancelled mid-flight. */
    readonly code: "ABORT";
    readonly partial: ProviderResult;
    constructor(partial: ProviderResult, options?: ErrorOptions);
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
 * text. Thinking stays out of `content`, is recorded on the assistant message, and returns
 * only as `replay` allows, like the authoritative {@link ProviderResult.thinking}.
 */
export declare type ProviderDelta = {
    readonly channel: 'content';
    readonly text: string;
} | {
    readonly channel: 'thinking';
    readonly text: string;
};

/**
 * Reports a coded provider failure with its HTTP status and underlying cause when available.
 *
 * @remarks
 * The provider base throws this error for a non-OK HTTP response, a missing response
 * body, or a missing settled result when strict assembly is enabled. Concrete wire
 * decoders also use it for malformed records and relayed provider failures.
 * `status` is present only for an `HTTP` failure; other codes leave it undefined.
 */
export declare class ProviderError extends Error {
    /** Names the machine-readable condition — `'HTTP'`: a non-OK response, including a relay refusing an oversized request with 413; `'PROTOCOL'`: a missing response body, a malformed wire record, or a strict stream with no settled result; `'PROVIDER'`: an upstream failure carried by a relay error record. */
    readonly code: ProviderErrorCode;
    /** Holds the response status for an HTTP failure, or undefined for other codes. */
    readonly status: number | undefined;
    constructor(code: ProviderErrorCode, message: string, options?: ProviderErrorOptions);
}

/** Names the machine-readable provider failure conditions. */
export declare type ProviderErrorCode = 
/** Reports a non-OK HTTP response, including a relay request rejected with status 413. */
'HTTP'
/** Reports a missing body, malformed wire record, or missing required settled result. */
| 'PROTOCOL'
/** Reports an upstream provider failure carried by a relay error record. */
| 'PROVIDER';

/** Carries a provider failure's HTTP status and underlying cause. */
export declare interface ProviderErrorOptions {
    readonly status?: number;
    readonly cause?: unknown;
}

/** Holds the decoded contribution of a wire record to a provider turn. */
export declare interface ProviderIncrement {
    readonly content: string;
    readonly thinking: string;
    readonly tools: readonly ToolCall[];
    readonly usage?: TokenUsage;
    readonly result?: ProviderResult;
}

/**
 * Defines the pluggable LLM inference boundary — the one contract every agent chunk depends on. A
 * provider turns a conversation (plus optional tools) into either a single assembled {@link
 * ProviderResult} (`generate`) or a stream of {@link ProviderDelta}s that returns the assembled
 * result (`stream`). The agent loop, a relay server, and a ledger apply its `replay` policy
 * before calling it. A direct `generate` or `stream` call sends messages as given.
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
export declare interface ProviderInterface {
    readonly id: string;
    readonly name: string;
    /**
     * Names the policy the agent loop, a relay server, and a ledger apply before calling the
     * provider; absent means `'none'`. A direct `generate` or `stream` call sends messages as given.
     */
    readonly replay?: ThinkingReplay;
    /**
     * Generates one complete turn — resolves the assembled {@link ProviderResult}.
     *
     * @param messages - The conversation so far
     * @param signal - Bounds the request; an abort rejects the call
     * @param tools - Optional tools the model may call this turn
     * @param options - Optional per-call {@link ProviderStreamOptions} (for example `think`); omitted ⇒ defaults
     * @returns The assembled result (content + any tool calls + any usage)
     */
    generate(messages: readonly Message[], signal: AbortSignal, tools?: readonly ToolDefinition[], options?: ProviderStreamOptions): Promise<ProviderResult>;
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
    stream(messages: readonly Message[], signal: AbortSignal, tools?: readonly ToolDefinition[], options?: ProviderStreamOptions): AsyncGenerator<ProviderDelta, ProviderResult>;
}

/**
 * Configures a provider's deadline, transport, and headers.
 *
 * @remarks
 * `timeout` is an integer duration in milliseconds. Default: 120_000.
 * `replay` is a {@link ThinkingReplay} that configures the provider's `replay`. Default: `'none'`.
 * `fetch` defaults to the global transport bound to its global receiver.
 * `headers` runs for each request inside its deadline and receives the combined caller
 * and deadline signal so token requests can share that bound. It overrides the JSON
 * content type only when it returns that header.
 */
export declare interface ProviderOptions {
    readonly timeout?: number;
    readonly replay?: ThinkingReplay;
    readonly fetch?: typeof globalThis.fetch;
    readonly headers?: (signal: AbortSignal) => Readonly<Record<string, string>> | Promise<Readonly<Record<string, string>>>;
}

/** Defines the structural framing seam supplied by a concrete provider. */
export declare interface ProviderParserInterface<TRecord = Readonly<Record<string, unknown>>> {
    /** Parses a decoded chunk into complete records. */
    parse(chunk: string): readonly TRecord[];
    /** Clears retained framing state. */
    clear(): void;
}

/** Carries the conversation and per-call configuration sent to a provider. */
export declare interface ProviderRequest {
    readonly messages: readonly Message[];
    readonly tools?: readonly ToolDefinition[];
    readonly options?: ProviderStreamOptions;
}

/** Validates and projects provider requests at a JSON wire boundary. */
export declare const providerRequestContract: ContractInterface<Readonly<{
messages: readonly Readonly<{
id: string;
role: "system" | "user" | "assistant" | "tool";
content: string;
} & {
calls?: readonly Readonly<{
id: string;
name: string;
arguments: {
readonly [k: string]: JSONValue;
};
} & {}>[];
call?: string;
images?: readonly string[];
thinking?: string;
}>[];
} & {
tools?: readonly Readonly<{
name: string;
} & {
description?: string;
parameters?: {
readonly [k: string]: JSONValue;
};
}>[];
options?: Readonly<{} & {
think?: boolean;
schema?: {
readonly [k: string]: JSONValue;
};
}>;
}>>;

/**
 * Describes a provider request's JSON wire projection.
 *
 * @remarks
 * The wire is strictly narrower than ProviderRequest: non-JSON arguments, parameters,
 * or schema members are refused. Execution context stays local; the guard refuses
 * extra members, and the parser drops them.
 */
export declare const providerRequestShape: ObjectShape<    {
messages: ArrayShape<ObjectShape<    {
id: StringShape;
role: LiteralShape<readonly ["system", "user", "assistant", "tool"]>;
content: StringShape;
calls: OptionalShape<ArrayShape<ObjectShape<    {
id: StringShape;
name: StringShape;
arguments: ObjectShape<Record<never, never>, JSONShape>;
}, boolean | ContractShape>>>;
call: OptionalShape<StringShape>;
images: OptionalShape<ArrayShape<StringShape>>;
thinking: OptionalShape<StringShape>;
}, boolean | ContractShape>>;
tools: OptionalShape<ArrayShape<ObjectShape<    {
name: StringShape;
description: OptionalShape<StringShape>;
parameters: OptionalShape<ObjectShape<Record<never, never>, JSONShape>>;
}, boolean | ContractShape>>>;
options: OptionalShape<ObjectShape<    {
think: OptionalShape<BooleanShape>;
schema: OptionalShape<ObjectShape<Record<never, never>, JSONShape>>;
}, boolean | ContractShape>>;
}, boolean | ContractShape>;

/**
 * Holds a single inference turn's structured outcome — the assembled assistant content,
 * any reasoning the provider separated from it, any tool calls the model requested,
 * and the token usage it reported.
 *
 * @remarks
 * `thinking` is present only when the turn produced reasoning the provider split
 * away from the answer (an in-content `<think>…</think>` span a thinking model
 * emitted, or a wire-side reasoning field) — `content` is always the clean answer,
 * and the thinking is recorded on the assistant message and returns only as `replay`
 * allows. `tools` is present only when the model wants tool calls (an
 * empty array is never surfaced — its absence means "no calls"). `usage` is present
 * only when the wire reported it (on the stream's `done` line, or the non-stream
 * body), so a caller folds it into a token budget exactly when it exists.
 */
export declare interface ProviderResult {
    readonly content: string;
    /** Carries separated reasoning when present; the assistant message records it and `replay` governs its return. */
    readonly thinking?: string;
    /** Carries the tool calls the model wants when present. */
    readonly tools?: readonly ToolCall[];
    /** Carries token consumption for this turn when present (from the wire's `done` line / body). */
    readonly usage?: TokenUsage;
}

/** Validates and projects provider results at a JSON wire boundary. */
export declare const providerResultContract: ContractInterface<Readonly<{
content: string;
} & {
thinking?: string;
tools?: readonly Readonly<{
id: string;
name: string;
arguments: {
readonly [k: string]: JSONValue;
};
} & {}>[];
usage?: Readonly<{
prompt: number;
completion: number;
total: number;
} & {}>;
}>>;

/**
 * Describes a provider result's JSON wire projection.
 *
 * @remarks
 * The wire is strictly narrower than ProviderResult: non-JSON call arguments are
 * refused. Execution context stays local; the guard refuses extra members, and the parser drops them.
 */
export declare const providerResultShape: ObjectShape<    {
content: StringShape;
thinking: OptionalShape<StringShape>;
tools: OptionalShape<ArrayShape<ObjectShape<    {
id: StringShape;
name: StringShape;
arguments: ObjectShape<Record<never, never>, JSONShape>;
}, boolean | ContractShape>>>;
usage: OptionalShape<ObjectShape<    {
prompt: NumberShape;
completion: NumberShape;
total: NumberShape;
}, boolean | ContractShape>>;
}, boolean | ContractShape>;

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
export declare interface ProviderStreamOptions {
    /** Overrides the provider's reasoning preference for this call; omitted ⇒ the provider default. */
    readonly think?: boolean;
    /** Constrains the response to this JSON-Schema shape (the same open record {@link ToolDefinition.parameters} uses); omitted ⇒ no constraint. */
    readonly schema?: Readonly<Record<string, unknown>>;
}

/**
 * Projects a judge question onto the System One wire while preserving omitted members.
 *
 * @param question - The domain question to send
 * @returns The wire question with `type` replacing `form`
 * @example
 * ```ts
 * questionToSystemOne({ form: 'noul' }) // { type: 'noul' }
 * ```
 */
export declare function questionToSystemOne(question: JudgeQuestion): SystemOneQuestion;

/** Lists the categories whose messages the projection leaves out as quiet. */
export declare const QUIET_CATEGORIES: readonly LedgerCategory[];

/**
 * Ranks a briefing source for removal before the next prompt.
 *
 * @param group - The planning group: 1 for a topic match, 2 for an off-topic rule or correction, or 3 for a name match
 * @param loose - If `true`, the source is a user message without a decisive category; if `false`, it is another source
 * @param category - The source's recorded category, or undefined when undecided
 * @returns The ascending removal rank: name matches, loose sources, off-topic corrections, off-topic rules, then topic matches
 * @remarks
 * The planner removes lower ranks first. Equal ranks 0, 1, and 4 remove lower scores first;
 * every equal rank then removes later conversation positions first.
 * @example
 * ```ts
 * rankLedgerCut(2, false, 'rule') // 3
 * ```
 */
export declare function rankLedgerCut(group: LedgerPlanningGroup, loose: boolean, category: LedgerCategory | undefined): number;

/**
 * Decodes UTF-8 chunks with a final flush and releases the stream on every exit.
 *
 * @param body - The readable byte stream
 * @param signal - The optional cancellation bound; abort ends iteration without further chunks
 * @returns Decoded text chunks, including a held decoder tail
 * @example
 * ```ts
 * const body = new Response('answer').body
 * if (body !== null) for await (const chunk of readChunks(body)) render(chunk)
 * ```
 */
export declare function readChunks(body: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncGenerator<string>;

/**
 * Builds a request's JSON headers, awaiting the caller's header hook inside the call's
 * cancellation bound.
 *
 * @remarks
 * The headers start with `Content-Type: application/json`; each entry the hook returns is set
 * over them, so the hook overrides the content type only when it returns that header. The hook
 * receives `signal` and races its abort, and the abort listener is removed on every exit. Both
 * HTTP engines, the provider and the judge, read their headers here.
 *
 * @param hook - The caller's header hook, or undefined for the JSON content type alone
 * @param signal - The call's combined caller and deadline signal
 * @returns The request headers
 * @throws Thrown when the signal aborts before the hook settles, with the signal's reason, and
 * when the hook throws or rejects, with the hook's own failure
 * @example
 * ```ts
 * const signal = new AbortController().signal
 * const headers = await readHeaders(() => ({ authorization: 'Bearer KEY' }), signal)
 * headers.get('authorization') // 'Bearer KEY'
 * headers.get('content-type') // 'application/json'
 * ```
 */
export declare function readHeaders(hook: ProviderOptions['headers'], signal: AbortSignal): Promise<Headers>;

/** Carries the measures `computeReading` derives from an answer; nothing stores them. */
export declare interface Reading {
    /** Holds the first strictly greatest candidate in enumeration order: an option name, a level index, or true or false. */
    readonly winner: string;
    readonly probability: number;
    readonly confidence: number;
    /** Holds the expected level of a score answer; the protocol's score field. */
    readonly score?: number;
}

/**
 * Reads a UTF-8 prefix of a byte stream and cancels its remainder.
 *
 * @remarks
 * The `limit` parameter bounds bytes passed to the decoder, including a partial final
 * character. An omitted limit reads to completion. A source may deliver a chunk larger
 * than the remaining limit; its unused bytes are discarded without decoding.
 * The read can overshoot by one source chunk. An abort leaves completion false.
 *
 * @param body - The readable byte stream
 * @param limit - The maximum byte prefix, or undefined for the complete stream
 * @param signal - The optional cancellation bound; abort returns the decoded prefix
 * @returns The decoded prefix and whether EOF occurred within the byte budget
 * @example
 * ```ts
 * import { readText } from '@orkestrel/agent'
 *
 * const body = new Response('answer').body
 * if (body !== null) await readText(body, 3) // { text: 'ans', complete: false }
 * ```
 */
export declare function readText(body: ReadableStream<Uint8Array>, limit?: number, signal?: AbortSignal): Promise<TextRead>;

/** Reports a question a wire could not read a candidate for; it lists the caller's keys and invents no probability. */
export declare interface Refusal {
    readonly missing: readonly string[];
}

/**
 * Names the relay's newline-delimited JSON content type — `'application/x-ndjson; charset=utf-8'`,
 * the header a relay response carries beside `cache-control: no-store`.
 */
export declare const RELAY_CONTENT_TYPE = "application/x-ndjson; charset=utf-8";

/**
 * Names the public message for an unexpected upstream relay failure — `'relay provider failed'`,
 * the fixed text every `error` frame carries, so an upstream failure's own message never reaches
 * the browser.
 */
export declare const RELAY_PROVIDER_MESSAGE = "relay provider failed";

/** Carries a relay delta, settled result, remote abort, or remote failure. */
export declare type RelayFrame = ProviderDelta | {
    readonly channel: 'result';
    readonly result: ProviderResult;
} | {
    readonly channel: 'abort';
    readonly partial: ProviderResult;
} | {
    readonly channel: 'error';
    readonly message: string;
};

/** Validates and projects channel-discriminated relay frames at a JSON wire boundary. */
export declare const relayFrameContract: ContractInterface<Readonly<{
channel: "content" | "thinking";
text: string;
} & {}> | Readonly<{
channel: "result";
result: Readonly<{
content: string;
} & {
thinking?: string;
tools?: readonly Readonly<{
id: string;
name: string;
arguments: {
readonly [k: string]: JSONValue;
};
} & {}>[];
usage?: Readonly<{
prompt: number;
completion: number;
total: number;
} & {}>;
}>;
} & {}> | Readonly<{
channel: "abort";
partial: Readonly<{
content: string;
} & {
thinking?: string;
tools?: readonly Readonly<{
id: string;
name: string;
arguments: {
readonly [k: string]: JSONValue;
};
} & {}>[];
usage?: Readonly<{
prompt: number;
completion: number;
total: number;
} & {}>;
}>;
} & {}> | Readonly<{
channel: "error";
message: string;
} & {}>>;

/**
 * Describes the channel-discriminated JSON relay wire projection.
 *
 * @remarks
 * The wire is strictly narrower than RelayFrame through its result and partial
 * fields: non-JSON arguments are refused. Execution context stays local; the guard
 * refuses extra members, and the parser drops them.
 */
export declare const relayFrameShape: UnionShape<readonly [ObjectShape<    {
channel: LiteralShape<readonly ["content", "thinking"]>;
text: StringShape;
}, boolean | ContractShape>, ObjectShape<    {
channel: LiteralShape<readonly ["result"]>;
result: ObjectShape<    {
content: StringShape;
thinking: OptionalShape<StringShape>;
tools: OptionalShape<ArrayShape<ObjectShape<    {
id: StringShape;
name: StringShape;
arguments: ObjectShape<Record<never, never>, JSONShape>;
}, boolean | ContractShape>>>;
usage: OptionalShape<ObjectShape<    {
prompt: NumberShape;
completion: NumberShape;
total: NumberShape;
}, boolean | ContractShape>>;
}, boolean | ContractShape>;
}, boolean | ContractShape>, ObjectShape<    {
channel: LiteralShape<readonly ["abort"]>;
partial: ObjectShape<    {
content: StringShape;
thinking: OptionalShape<StringShape>;
tools: OptionalShape<ArrayShape<ObjectShape<    {
id: StringShape;
name: StringShape;
arguments: ObjectShape<Record<never, never>, JSONShape>;
}, boolean | ContractShape>>>;
usage: OptionalShape<ObjectShape<    {
prompt: NumberShape;
completion: NumberShape;
total: NumberShape;
}, boolean | ContractShape>>;
}, boolean | ContractShape>;
}, boolean | ContractShape>, ObjectShape<    {
channel: LiteralShape<readonly ["error"]>;
message: StringShape;
}, boolean | ContractShape>]>;

/** Defines a host-independent relay request handler. */
export declare type RelayHandler = (request: Request) => Promise<Response>;

/** Configures the upstream provider, mandatory authorization, and request byte limit. */
export declare interface RelayOptions {
    readonly provider: ProviderInterface;
    /**
     * Authorizes the request before its body is read.
     *
     * @remarks
     * The hook must not consume the request body; a body-reading hook locks the stream
     * and the handler answers with the `400` status. The relay performs no origin or
     * method check. An application trusting an ambient credential such as a cookie
     * must compose origin and CSRF middleware before the handler to prevent cross-site calls.
     */
    readonly authorize: (request: Request) => boolean | Promise<boolean>;
    /**
     * Bounds the request body in bytes; the handler answers with the `413` status
     * for a body at or above the limit.
     */
    readonly limit?: number;
}

/**
 * Carries provider calls over an authenticated NDJSON relay endpoint.
 *
 * @remarks
 * Tool execution context stays local; calls carry only `id`, `name`, and `arguments`.
 * The wire body is an owned snapshot of
 * the projection read through property descriptors, so a serializer reachable only through a
 * `get` trap or a prototype is never consulted; an own function-valued property such as a
 * `toJSON` method is a value outside JSON and is refused before fetching, with the clone's
 * failure as the refusal's `cause`. A remote abort reconstructs a `ProviderAbortError` instance
 * without aborting the
 * local signal; the `Agent` runtime treats that instance as an error unless its own bound
 * signal is aborted.
 * Content is preserved verbatim, including literal thinking tags.
 * A refusal reaches the browser as a `ProviderError` instance with the `HTTP` code and status.
 * This is the browser end alone; {@link createRelay} mounts the server end, and
 * {@link createRelayProvider}'s example is the browser half of that pair.
 *
 * @example
 * ```ts
 * import type { ProviderResult } from '@orkestrel/agent'
 * import { RelayProvider } from '@orkestrel/agent'
 * // The browser application supplies this parser dependency.
 * import { createNDJSONParser } from '@orkestrel/ndjson'
 *
 * export function ask(bearer: string, signal: AbortSignal): Promise<ProviderResult> {
 * 	const browser = new RelayProvider({
 * 		url: 'https://relay.example/relay',
 * 		parser: createNDJSONParser,
 * 		headers: () => ({ authorization: `Bearer ${bearer}` }),
 * 	})
 * 	return browser.generate([{ id: 'ask', role: 'user', content: 'ping' }], signal)
 * }
 * ```
 */
export declare class RelayProvider extends AgentProvider {
    #private;
    constructor(options: RelayProviderOptions);
    /** Identifies the relay backend. */
    readonly name = "relay";
    /** Creates fresh framing state for each response. */
    frame(): ProviderParserInterface;
    /**
     * Projects declared request fields and refuses values the JSON wire cannot carry.
     *
     * @remarks
     * The snapshot is taken from property descriptors, so a custom serializer a projected
     * value carries is ignored rather than consulted and cannot reach the wire.
     *
     * @param request - The domain conversation and call configuration
     * @returns The validated wire request
     * @throws {ProviderError} Thrown when the snapshot cannot be taken — a hostile read or a
     * value outside JSON — carrying that failure as its `cause`, and when the snapshot the
     * projection produced is not a valid wire request
     */
    body(request: ProviderRequest): object;
    /**
     * Validates a relay frame and translates its channel into the shared stream engine.
     *
     * @param record - The framed wire record
     * @returns A delta contribution or authoritative result
     * @throws {ProviderAbortError} Thrown for a remote abort carrying its partial
     * @throws {ProviderError} Thrown for a malformed frame or remote provider failure
     */
    read(record: Readonly<Record<string, unknown>>): ProviderIncrement;
    /**
     * Recovers an unterminated final frame by completing its NDJSON line.
     *
     * @param parser - The call's retained framing state
     * @returns Records completed by the final newline
     */
    finish(parser: ProviderParserInterface): ReadonlyArray<Readonly<Record<string, unknown>>>;
}

/** Configures a relay destination and its fresh structural parser factory. */
export declare interface RelayProviderOptions extends ProviderOptions {
    readonly url: string;
    /** Creates a fresh parser for each relay response stream. */
    readonly parser: () => ProviderParserInterface;
}

/**
 * Streams a provider call as validated NDJSON frames under response backpressure.
 *
 * @remarks
 * Cancellation aborts upstream before returning its iterator. Request listeners are
 * released on settlement. Unexpected provider failures carry a fixed public message.
 * An inbound abort leaves the response body neither closed nor errored — a server runtime
 * cancels that body when the client disconnects — so a consumer that aborts the inbound
 * signal itself must cancel the body rather than keep reading it.
 *
 * @example
 * ```ts
 * import type { ProviderInterface } from '@orkestrel/agent'
 * import { RelayStream } from '@orkestrel/agent'
 *
 * export function respond(provider: ProviderInterface, signal: AbortSignal): Response {
 * 	return new RelayStream({ provider, request: { messages: [] }, signal }).response
 * }
 * ```
 */
export declare class RelayStream {
    #private;
    constructor(options: RelayStreamOptions);
    /** Exposes the pull-driven response for the provider call. */
    get response(): Response;
}

/** Carries the upstream call and cancellation bound of a relay response stream. */
export declare interface RelayStreamOptions {
    readonly provider: ProviderInterface;
    readonly request: ProviderRequest;
    readonly signal: AbortSignal;
}

/**
 * Cancels a stream reader and releases its lock, swallowing a cancellation failure so the
 * caller's own outcome stands.
 *
 * @param reader - The reader to cancel and release
 * @returns A promise that settles after the lock is released
 *
 * @example
 * ```ts
 * const body = new Response('answer').body
 * if (body !== null) await releaseReader(body.getReader())
 * ```
 */
export declare function releaseReader(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void>;

/**
 * Removes each key through a single-key remover and folds the outcomes, so a batch `remove`
 * reports whether the whole batch applied.
 *
 * @remarks
 * Every key is passed to `remove` even after one is missing, so a present key still takes
 * effect (and emits) when an earlier key was absent.
 *
 * @typeParam K - The key type the remover accepts
 * @param keys - The keys to remove, in order
 * @param remove - Removes one key and returns whether it was present
 * @returns True if every key was present and removed; false otherwise (an empty list returns true)
 *
 * @example
 * ```ts
 * const stored = new Set(['a', 'b'])
 * removeEntries(['a', 'b'], (key) => stored.delete(key)) // true
 * removeEntries(['a', 'c'], (key) => stored.delete(key)) // false
 * ```
 */
export declare function removeEntries<K>(keys: readonly K[], remove: (key: K) => boolean): boolean;

/**
 * Renders a path-addressed text body as a fenced reference block — a `File: <path>` label line
 * over a language-tagged fence, the framing an
 * {@link import('./AgentContext.js').AgentContext}'s active-workspace text-file render emits.
 *
 * @remarks
 * Produces `` File: <path>\n```<language>\n<content>\n``` `` — the `File:` label line, then a
 * fenced code block tagged with `language`, the `content` verbatim inside. Pure string assembly,
 * total — never throws. The one fenced-file format string for the whole module — `AgentContext.build()`
 * frames an active workspace's text files with it (each carries its own `language` on its
 * {@link import('@orkestrel/workspace').FileContent} text arm).
 *
 * @param path - The file path shown on the `File:` label line
 * @param language - The fenced-code language tag (for example `'typescript'`)
 * @param content - The file body rendered verbatim inside the fence
 * @returns The fenced reference block
 *
 * @example
 * ```ts
 * import { renderFencedFile } from '@orkestrel/agent'
 *
 * renderFencedFile('src/main.ts', 'typescript', 'const x = 1')
 * // 'File: src/main.ts\n```typescript\nconst x = 1\n```'
 * ```
 */
export declare function renderFencedFile(path: string, language: string, content: string): string;

/**
 * Renders one owner record under a `###` heading, which the briefing nests under its one `## Pinned` heading.
 *
 * @param record - An owner record or view with a `title` and `lines`
 * @returns `### TITLE` followed by `- LINE` for each line
 *
 * @example
 * ```ts
 * renderLedgerPinned({ title: 'Odile Marlow (account OM-30418)', lines: [] }) // '### Odile Marlow (account OM-30418)'
 * ```
 */
export declare function renderLedgerPinned(record: Pick<LedgerRecord, 'title' | 'lines'>): string;

/**
 * Renders one record as a heading and one list item per line.
 *
 * @remarks
 * The briefing joins rendered records with one blank line.
 *
 * @param record - A record or view with a `title` and `lines`
 * @returns `## TITLE` followed by `- LINE` for each line
 *
 * @example
 * ```ts
 * renderLedgerRecord({ title: 'Rules', lines: [{ text: 'Refunds need a manager.', source: 'user-1', sentence: 0, topics: [], role: 'user' }] })
 * // '## Rules\n- Refunds need a manager.'
 * ```
 */
export declare function renderLedgerRecord(record: Pick<LedgerRecord, 'title' | 'lines'>): string;

/**
 * Renders one context section — the resolved `open`, each item's rendering, and the resolved
 * `close` when one exists, blank-line joined; `undefined` when the section has no items.
 *
 * @remarks
 * Pure and total. A section with no items renders nothing (`undefined`), so an empty or fully
 * scoped-out manager stays silent — its `open` / `close` never appear without items. `close`
 * is the only optional slot: an unset one (there is no built-in close) drops the
 * trailing line.
 *
 * @typeParam T - The section item being rendered
 * @param open - The section's resolved leading text
 * @param items - The already scope-filtered items
 * @param render - Renders one item to its prompt text
 * @param close - The section's resolved trailing text, or `undefined` for none
 * @returns The rendered section, or `undefined` when there are no items
 *
 * @example
 * ```ts
 * renderSection('## Instructions', [{ content: 'Be terse.' }], (one) => one.content, undefined)
 * // '## Instructions\n\nBe terse.'
 * renderSection('<rules>', [], (one) => one.content, '</rules>') // undefined (no items)
 * ```
 */
export declare function renderSection<T>(open: string, items: readonly T[], render: (item: T) => string, close: string | undefined): string | undefined;

/**
 * Renders the view with subject and request markers, appending a folded request as evidence.
 *
 * @remarks
 * A message's `images` and `thinking` members are left out, so neither a base64 payload nor
 * reasoning enters the state or the bytes a judgment reuse compares.
 * @param messages - The conversation view in prompt order
 * @param subject - The screened message id marked [A]
 * @param request - The user message marked [B], even when absent from the view
 * @returns The complete state whose bytes determine judgment reuse
 * @example
 * ```ts
 * renderSelectionState([], 'earlier', { id: 'request', role: 'user', content: 'Continue.' })
 * ```
 */
export declare function renderSelectionState(messages: readonly Message[], subject: string, request: Message): string;

/**
 * Renders the tail stub of a lookup result from an earlier request.
 *
 * @param name - The lookup tool name
 * @param args - The arguments the call carried
 * @param state - What became of the result: `failed`, `empty`, `shown` in the briefing, or `hidden` from it
 * @returns The stub text, which carries the call and its state
 *
 * @example
 * ```ts
 * renderStub('lookup_order', { id: 'BW-5512' }, 'hidden')
 * // 'lookup_order {"id":"BW-5512"}: result not shown; call recall with BW-5512'
 * ```
 */
export declare function renderStub(name: string, args: Readonly<Record<string, unknown>>, state: LedgerLookupState): string;

/**
 * Resolves the call that owns a tool message within a collected tool group.
 * @param group - The assistant leader followed by its tool results
 * @param message - The tool result to pair; distinct leader ids pair by result id when any result has one
 * @returns The call matching the result's call id, or its position when the leader repeats an id or every result lacks an id; undefined when unpaired
 * @example
 * ```ts
 * resolveLedgerCall(group, result)?.arguments
 * ```
 */
export declare function resolveLedgerCall(group: readonly Message[], message: Message): ToolCall | undefined;

/**
 * Resolves the generation cap and checks it against the context capacity.
 *
 * @param predict - The optional generation cap in tokens; see {@link LedgerOptions}
 * @param capacity - The context capacity in tokens
 * @returns The validated cap
 * @throws {LedgerError} Thrown when the cap is not a nonnegative safe integer less than capacity (code `'CAPACITY'`)
 * @example
 * ```ts
 * resolvePredict(1024, 4096) // 1024
 * ```
 */
export declare function resolvePredict(predict: number | undefined, capacity: number): number;

/**
 * Holds the immutable per-run outcome an {@link AgentInterface}'s loop settles on — the value its
 * run returns, assembled from there into the {@link AgentResult} its `stream`'s `result` promise
 * resolves.
 *
 * @remarks
 * Computed inside one run (so concurrent runs never share state) and returned once, when the
 * loop settles: `content` is the streamed assistant text, `thinking` the reasoning the
 * provider calls separated from it ({@link ProviderResult.thinking}, joined across calls —
 * `undefined` when none surfaced), `usage` the summed {@link TokenUsage} (present only when
 * a provider call or a selection reported it), `partial` is `true` when a cancel committed the run early or
 * when the loop exhausted its `limit` with unresolved tool intent, and `exhausted` is `true`
 * in that second case specifically (a distinct, non-cancel cause the {@link AgentEventMap}
 * `exhaust` event observes). It is the settled outcome one run returns, before the agent folds
 * it into the {@link AgentResult} its `stream`'s `result` promise resolves.
 */
export declare interface RunOutcome {
    readonly content: string;
    readonly thinking: string | undefined;
    readonly usage: TokenUsage | undefined;
    readonly partial: boolean;
    readonly exhausted: boolean;
}

/**
 * Sanitizes one reported token count into a safe non-negative integer — a non-finite or
 * non-positive value becomes `0`, and a positive fractional value floors down.
 *
 * @param value - The token count to sanitize
 * @returns The floored count, or `0` when the value is non-finite or non-positive
 */
export declare function sanitizeToken(value: number): number;

/**
 * Sanitizes a {@link TokenUsage} into safe, non-negative integers — the guard an agent's
 * abort-usage path applies to a provider's partial usage before it is charged against a
 * budget or folded into the run total.
 *
 * @remarks
 * Per field (`prompt` / `completion` / `total`): a non-finite value (`NaN`, `+Infinity`,
 * `-Infinity`) or a negative value floors to `0`; a fractional value floors to its
 * non-negative integer part. No upper cap is applied. Total — never throws.
 *
 * @param usage - The token usage to sanitize (for example a provider's abort-partial usage)
 * @returns A new {@link TokenUsage} with every field a safe non-negative integer
 *
 * @example
 * ```ts
 * sanitizeUsage({ prompt: -5, completion: NaN, total: 12.7 }) // { prompt: 0, completion: 0, total: 12 }
 * ```
 */
export declare function sanitizeUsage(usage: TokenUsage): TokenUsage;

/**
 * Represents a named, immutable filter over a richer context's items — an optional allow-list per
 * category (`instructions` / `tools` / `files`), each keyed by that category's identity (an
 * instruction's `name`, a tool's `name`, a workspace file's `path`) and read as an allow-list:
 * `undefined` lets everything pass, `[]` lets nothing pass, and a non-empty list passes the listed
 * keys alone. `narrow` composes a tighter child by set intersection.
 *
 * @remarks
 * - **A category list is three-way.** `undefined` ⇒ no constraint on that category (all
 *   pass); `[]` ⇒ none pass; a non-empty list ⇒ only the listed keys pass. The build
 *   step / loop apply this through `filterAllowList`.
 * - **Immutable.** The `id` is minted at construction; every supplied list is copied in
 *   (so a later mutation of the caller's array can't leak in), and the lists are
 *   `readonly`. A `Scope` is never mutated after construction — `narrow` returns a new
 *   one rather than altering this one.
 * - **`narrow` is set-intersection (immutable composition).** A child scope's visible set
 *   per category is the intersection of this scope's list and the config's list — but
 *   `undefined` means "no constraint", so it acts as the universal set: intersecting
 *   `undefined` with a list yields the list, and `undefined` with `undefined` stays
 *   `undefined`. Narrowing can only tighten, never widen — a key excluded by a parent
 *   can never be re-admitted by a child. The child keeps this scope's `name`, `description`,
 *   and `select` handler.
 *
 * @example
 * ```ts
 * const scope = new Scope({ name: 'reader', tools: ['search', 'read'] })
 * // narrow intersects: tools ∩ ['read', 'write'] = ['read'] (write was never in the parent).
 * const tighter = scope.narrow({ tools: ['read', 'write'] })
 * tighter.tools // ['read']
 * // instructions had no parent constraint (undefined) → the child's list passes through.
 * tighter.narrow({ instructions: ['safety'] }).instructions // ['safety']
 * ```
 */
export declare class Scope implements ScopeInterface {
    readonly id: string;
    readonly name: string;
    readonly instructions?: readonly string[];
    readonly tools?: readonly string[];
    readonly files?: readonly string[];
    readonly select?: SelectionHandler;
    readonly description?: string;
    constructor(input: ScopeInput);
    narrow(config: ScopeFilter): ScopeInterface;
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
export declare interface ScopeFilter {
    /** Lists the allowed instruction `name`s (`undefined` ⇒ all, `[]` ⇒ none, else only-listed). */
    readonly instructions?: readonly string[];
    /**
     * Lists the allowed tool `name`s (`undefined` ⇒ all, `[]` ⇒ none, else only-listed).
     * The loop advertises and dispatches only admitted tools, checking scope before authority.
     * If no definition is advertised, the reply ends the run without dispatching its calls.
     */
    readonly tools?: readonly string[];
    /**
     * Lists the allowed active-workspace file `path`s (`undefined` ⇒ all, `[]` ⇒ none, else only-listed) —
     * the filter {@link AgentContextInterface.build} applies to the active workspace's
     * {@link import('@orkestrel/workspace').WorkspaceInterface.files} before rendering them (text → the system block, image →
     * the last user message).
     */
    readonly files?: readonly string[];
}

/**
 * Carries the data to author a {@link ScopeInterface} — a {@link ScopeFilter} plus the
 * required `name` (a human label; the `id` is minted by the layer that stores it).
 */
export declare interface ScopeInput extends ScopeFilter {
    readonly name: string;
    /** Holds the selection handler that overrides the agent default while this scope is active. */
    readonly select?: SelectionHandler;
    /** Describes the mode this scope stands for; `build()` never reads it. */
    readonly description?: string;
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
export declare interface ScopeInterface extends ScopeFilter {
    readonly id: string;
    readonly name: string;
    /** Holds the selection handler that overrides the agent default while this scope is active. */
    readonly select?: SelectionHandler;
    /** Describes the mode this scope stands for; `build()` never reads it. */
    readonly description?: string;
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
    narrow(config: ScopeFilter): ScopeInterface;
}

/**
 * Registers the named filters a richer context reuses — immutable {@link Scope}s keyed by their
 * minted `id`, in insertion order, where `create` always mints and stores rather than overwriting,
 * and an observable `emitter` reports each change.
 *
 * @remarks
 * - **Registry.** Scopes live in an insertion-ordered `Map` keyed by their minted `id`;
 *   `create` mints a {@link Scope} from a {@link ScopeInput} (an `id` plus the three
 *   allow-lists), stores it, and returns it. `count` is the map size, `scope(id)` looks
 *   one up, and `scopes()` lists them in insertion order. (Unlike the name-keyed
 *   instruction registry, a scope's key is its minted `id`, so two scopes may share a
 *   `name`; `create` therefore always adds — it never overwrites.)
 * - **Removal.** `remove` drops one by id, or a batch — `true` only when every supplied id
 *   was removed; `clear` empties the registry.
 * - **Observable.** The owned {@link emitter} ({@link ScopeManagerEventMap}) carries
 *   `create` (the created scope) / `remove` (the id) / `clear`. Every event is emitted
 *   directly, strictly after the map mutation completes; the emitter isolates a listener
 *   throw and routes it to its `error` handler (the `error` option), so a buggy observer can
 *   never corrupt a mutation.
 *
 * @example
 * ```ts
 * const manager = new ScopeManager()
 * const reader = manager.create({ name: 'reader', tools: ['search', 'read'] })
 * manager.scope(reader.id) // the same scope
 * manager.count // 1
 * ```
 */
export declare class ScopeManager implements ScopeManagerInterface {
    #private;
    constructor(options?: ScopeManagerOptions);
    get emitter(): EmitterInterface<ScopeManagerEventMap>;
    get count(): number;
    create(input: ScopeInput): ScopeInterface;
    scope(id: string): ScopeInterface | undefined;
    scopes(): readonly ScopeInterface[];
    remove(id: string): boolean;
    remove(ids: readonly string[]): boolean;
    clear(): void;
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
export declare type ScopeManagerEventMap = {
    /** Reports a scope created — the created scope. */
    readonly create: readonly [scope: ScopeInterface];
    /** Reports a scope removed — its `id`. */
    readonly remove: readonly [id: string];
    /** Reports every scope removed. */
    readonly clear: readonly [];
};

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
export declare interface ScopeManagerInterface {
    readonly emitter: EmitterInterface<ScopeManagerEventMap>;
    readonly count: number;
    /**
     * Mints a scope from a {@link ScopeInput} (an `id` plus the per-category allow-lists) and
     * stores it — always adds, never overwrites.
     */
    create(input: ScopeInput): ScopeInterface;
    /** Looks up one scope by id (`undefined` when absent). */
    scope(id: string): ScopeInterface | undefined;
    /** Lists every scope, in insertion order. */
    scopes(): readonly ScopeInterface[];
    /** Removes one scope by id, or a batch — `true` only when every supplied id was removed. */
    remove(id: string): boolean;
    remove(ids: readonly string[]): boolean;
    /** Removes every scope. */
    clear(): void;
}

/**
 * Configures `createScopeManager` — the reserved `on` hooks: initial listeners for
 * the manager's {@link ScopeManagerEventMap}, wired at construction.
 */
export declare interface ScopeManagerOptions {
    readonly on?: EmitterHooks<ScopeManagerEventMap>;
    /** Holds the emitter's listener-error handler — a listener throw routes here, not to a domain event. */
    readonly error?: EmitterErrorHandler;
}

/** Carries a score distribution indexed by level. */
export declare interface ScoreAnswer {
    readonly form: 'score';
    readonly probabilities: readonly number[];
}

/** Lists at least two score levels from level 0 upward; null leaves a level undescribed. */
export declare type ScoreCriteria = readonly [
JudgeEntry | null,
JudgeEntry | null,
...Array<JudgeEntry | null>
];

/** Asks the model to place the state on an ordered scale of levels. */
export declare interface ScoreQuestion {
    readonly form: 'score';
    readonly instructions?: JudgeEntry;
    readonly criteria: ScoreCriteria;
}

/**
 * Returns the message ids the application permits selection to judge.
 *
 * @param conversation - The conversation to screen
 * @param request - The user message the run serves
 * @returns The candidate ids in asking order
 * @example
 * ```ts
 * const screen: ScreenHandler = (conversation) => conversation.view().map((message) => message.id)
 * ```
 */
export declare type ScreenHandler = (conversation: ConversationInterface, request: Message) => readonly string[];

/**
 * Holds a slice of folded messages digested into a summary — the unit of compaction a
 * {@link ConversationInterface} produces when it `compact`s its live tail.
 *
 * @remarks
 * `summary` is the model-written digest of this slice (through the
 * {@link ConversationSummaryHandler}); `messages` are the folded originals, retained in full so
 * `rehydrate` can pull them back and `search` can scan them (compaction shrinks the model
 * input, never discards history).
 */
export declare interface Section {
    readonly id: string;
    /** Holds the model-written digest of this slice (its {@link ConversationSummaryHandler} output). */
    readonly summary: string;
    /** Retains the folded original messages in full for `rehydrate` / `search`. */
    readonly messages: readonly Message[];
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
 *
 * @example
 * ```ts
 * const selection: Selection = { messages: conversation.view(), judgments: [] }
 * ```
 */
export declare interface Selection {
    /** Lists the messages `build` folds in place of `view()`, in prompt order. */
    readonly messages: readonly Message[];
    /** Lists the keys of the judgments the selection rests on, reused or recorded. */
    readonly judgments: readonly string[];
    /** Holds the judge usage this selection spent, on success and on failure alike. */
    readonly usage?: TokenUsage;
    /** Holds the error a handler gave up on; `messages` is then `view()`. */
    readonly fault?: Error;
    /** Holds the text `build` appends as the last part of the system message. */
    readonly briefing?: string;
}

/**
 * Reports a selection configuration that `createSelection` refuses, carrying the
 * machine-readable `code` `'THRESHOLD' | 'LIMIT'`.
 *
 * @remarks
 * A `needed` threshold outside the interval above 0.5 up to and including 1, a non-finite one
 * included, is a programmer error and throws this with `'THRESHOLD'`. A `limit` that is not a
 * nonnegative safe integer is a programmer error and throws this with `'LIMIT'`. Narrow a caught
 * value with {@link isSelectionError} and branch on `error.code`.
 */
export declare class SelectionError extends Error {
    /** Names the machine-readable condition — `'THRESHOLD'`: a cutoff outside the accepted interval; `'LIMIT'`: a limit that is not a nonnegative safe integer. */
    readonly code: 'THRESHOLD' | 'LIMIT';
    constructor(code: 'THRESHOLD' | 'LIMIT', message: string);
}

/**
 * Chooses the conversation messages the next prompt carries for one user request.
 *
 * @remarks
 * Receives the active conversation, the user message the run serves (passed by the loop, because
 * a compaction can fold it into a section), and the run's abort signal. A handler that spent judge
 * calls before giving up returns a {@link Selection} with `fault` set, `messages` as `view()`, and
 * the usage spent, rather than throwing. A handler that recovers from an error returns no `fault`:
 * the stock handler leaves a subject whose judge call failed undecided and sets `fault` only when
 * the judge failed for every subject it asked and no recorded judgment was reused.
 *
 * @param conversation - The conversation whose messages the handler selects
 * @param request - The user message captured at run entry
 * @param signal - The run's abort signal
 * @returns The selected messages, the judgment keys they rest on, and any usage or fault
 *
 * @example
 * ```ts
 * const select: SelectionHandler = async (conversation) => ({
 * 	messages: conversation.view(),
 * 	judgments: [],
 * })
 * ```
 */
export declare type SelectionHandler = (conversation: ConversationInterface, request: Message, signal: AbortSignal) => Promise<Selection>;

/**
 * Configures the judge, candidate screen, needed criterion, and fresh question limit.
 *
 * @remarks
 * `judge` supplies the model identity and inference. `screen` supplies candidate ids.
 * `needed` supplies the criteria text and required cutoff. `limit` is a nonnegative
 * safe integer; reused judgments consume none of it.
 */
export declare interface SelectionOptions {
    readonly judge: JudgeInterface;
    readonly screen: ScreenHandler;
    readonly needed: Criterion;
    readonly limit: number;
}

/**
 * Selects a request's view of the projected records.
 *
 * @remarks
 * The view holds the owner records the request names in the order it names them, then the rules
 * record with the lines whose topics meet the request's first, each group in position order. The
 * returned records and lines are copies.
 *
 * @param projection - The output of {@link buildRecords}
 * @param request - The owners and the desk topics the request names
 * @returns The selected records; an owner with no record yields none
 *
 * @example
 * ```ts
 * selectRecords(projection, { owners: ['BW-20931'], topics: ['refunds'] }).map((record) => record.key)
 * // ['owner:BW-20931', 'rules']
 * ```
 */
export declare function selectRecords(projection: LedgerProjection, request: LedgerProjectionRequest): readonly LedgerRecord[];

/**
 * Runs one rehydrated agent and applies the partial-as-configurable-failure policy — a partial
 * run throws an {@link import('./errors.js').AgentJobError} unless the `partial` policy allows
 * it, and a natural finish resolves. The shared job-handler step `createAgentQueue` and
 * `createAgentRunner` both settle each job through, so the policy can never diverge between
 * them.
 *
 * @remarks
 * A turn that committed partial (a cancel — abort / budget / timeout) is by default a
 * failure, so it throws an {@link import('./errors.js').AgentJobError} carrying the partial
 * (the Queue's retries + a Runner's fail-fast then engage); the `partial` policy resolves
 * it as success instead. A natural finish always resolves with its result.
 *
 * @param agent - The rehydrated {@link AgentInterface} to run to its {@link AgentResult}
 * @param partial - The partial policy. If `true`, a partial result resolves as success; if
 *   `false` (the default policy), a partial result throws an {@link AgentJobError}
 * @returns The agent's {@link AgentResult} (a natural finish, or a partial one under the
 *   `partial` policy)
 * @throws {AgentJobError} Thrown when the run ended partial and the `partial` policy is `false`
 *
 * @example
 * ```ts
 * const result = await settleAgentJob(registry.build(input, signal), false)
 * ```
 */
export declare function settleAgentJob(agent: AgentInterface, partial: boolean): Promise<AgentResult>;

/**
 * Splits a message into its sentences.
 *
 * @remarks
 * A sentence ends at a period, question mark, or exclamation mark followed by a space and a capital
 * letter, a digit, or a quote, so a decimal point, an id, or an amount never splits one.
 *
 * @param text - The message text
 * @returns The trimmed, non-empty sentences in order
 *
 * @example
 * ```ts
 * splitSentences('Refunds over $200 need a manager. Ask Odile.')
 * // ['Refunds over $200 need a manager.', 'Ask Odile.']
 * ```
 */
export declare function splitSentences(text: string): readonly string[];

/**
 * Splits a recall topic at its joints.
 *
 * @remarks
 * The joints are a comma, a semicolon, a slash, and the word `and`. A topic with no joint is
 * returned whole, so a model that joins a name and an id recalls each part alone.
 *
 * @param topic - The topic the model asked for
 * @returns The trimmed, non-empty parts when there are at least two; otherwise the topic itself
 *
 * @example
 * ```ts
 * splitTopic('BW-5512, Odile Marlow and refunds') // ['BW-5512', 'Odile Marlow', 'refunds']
 * ```
 */
export declare function splitTopic(topic: string): readonly string[];

/**
 * Pairs a live event stream with the eventual settled result and a cancel — the
 * generic pull/streaming handle a long-running operation hands back.
 *
 * @remarks
 * Iterate `events` to consume the live `T` chunks as they arrive; `await result` for
 * the eventual `R` outcome (it resolves once `events` completes). `abort(reason)`
 * cancels the in-flight operation — for an agent turn the `result` then resolves
 * (with a partial outcome), since a cancel is not an error.
 *
 * @typeParam T - The live event type the stream yields
 * @typeParam R - The settled result the operation resolves to
 */
export declare interface StreamInterface<T, R> {
    readonly events: AsyncIterable<T>;
    readonly result: Promise<R>;
    /**
     * Cancels the in-flight operation — fires its bound signal.
     *
     * @param reason - An optional cancellation reason propagated to the signal
     */
    abort(reason?: unknown): void;
}

/**
 * Applies a {@link ThinkingReplay} policy to a conversation, returning the messages a provider
 * sends with only the assistant thinking the policy allows.
 *
 * @remarks
 * Pure and total. `'all'` returns the input array itself. `'none'` drops `thinking` from every
 * message that carries it. `'turn'` drops it from every message at or before the last `user`
 * message and keeps it after, the turn in progress; with no `user` message every message counts
 * as inside the turn. A message without `thinking`, or one that keeps it, is the same object;
 * a message that loses it is a copy without that member, so no `undefined` member is written.
 *
 * @param messages - The conversation to project (left unchanged)
 * @param replay - The policy naming which thinking stays
 * @returns The messages with the policy applied
 *
 * @example
 * ```ts
 * const messages = [
 * 	{ id: '1', role: 'user', content: 'Plan the trip' },
 * 	{ id: '2', role: 'assistant', content: 'Booked', thinking: 'Compare fares first' },
 * ]
 * stripThinking(messages, 'none') // [{ id: '1', ... }, { id: '2', role: 'assistant', content: 'Booked' }]
 * stripThinking(messages, 'turn') // the thinking on '2' stays: it follows the last user message
 * ```
 */
export declare function stripThinking(messages: readonly Message[], replay: ThinkingReplay): readonly Message[];

/**
 * Adds two {@link TokenUsage} values field by field — the running total an agent run keeps
 * across its provider calls.
 *
 * @remarks
 * Pure and total: the first call seeds the total (`running` `undefined` returns `next`
 * unchanged), later calls accumulate. No sanitization happens here — charge a provider's
 * reported usage through {@link sanitizeUsage} first.
 *
 * @param running - The total so far (`undefined` before the first usage-bearing call)
 * @param next - This call's reported usage
 * @returns The summed usage
 *
 * @example
 * ```ts
 * sumUsage(undefined, { prompt: 2, completion: 1, total: 3 }) // { prompt: 2, completion: 1, total: 3 }
 * sumUsage({ prompt: 2, completion: 1, total: 3 }, { prompt: 1, completion: 1, total: 2 })
 * // { prompt: 3, completion: 2, total: 5 }
 * ```
 */
export declare function sumUsage(running: TokenUsage | undefined, next: TokenUsage): TokenUsage;

/** Names the System One decision endpoint shared by compatible servers. */
export declare const SYSTEM_ONE_PATH = "/v1/systemone";

/** Unites the TypeSafe System One answer forms. */
export declare type SystemOneAnswer = SystemOneChoiceAnswer | SystemOneScoreAnswer | SystemOneNoulAnswer;

/** Transliterates a TypeSafe System One choice distribution and optional server measures. */
export declare interface SystemOneChoiceAnswer {
    readonly type: 'choice';
    readonly probabilities: Readonly<Record<string, number>>;
    readonly choice?: string;
    readonly confidence?: number;
}

/** Carries a TypeSafe System One entry, including the wire's explicit null. */
export declare type SystemOneEntry = JudgeEntry | null;

/**
 * Carries judge questions over the System One protocol and derives answers from server distributions.
 *
 * @remarks
 * The caller supplies the server origin and model. Every question travels in one request.
 * Server measures are ignored; the response model is preserved.
 * `headers` supplies authentication through the shared judge engine.
 *
 * @example Asking a System One server a choice, a noul, and a score
 * ```ts
 * import { computeReading, createSystemOneJudge } from '@orkestrel/agent'
 *
 * const judge = createSystemOneJudge({ url: 'http://localhost:11434', model: 'tev1:0.8b' })
 * const result = await judge.ask(
 * 	{
 * 		state: 'Our checkout has returned 500 errors since 9am. I want a refund for today.',
 * 		questions: {
 * 			label: {
 * 				form: 'choice',
 * 				instructions: 'Which label fits this ticket?',
 * 				criteria: { billing: 'Payments and refunds', bug: 'Software errors', account: null },
 * 			},
 * 			refund: {
 * 				form: 'noul',
 * 				instructions: 'Does the customer ask for money back?',
 * 				criteria: {
 * 					true: 'The customer asks for a refund or for money back.',
 * 					false: 'The customer does not ask for money back.',
 * 				},
 * 			},
 * 			severity: {
 * 				form: 'score',
 * 				instructions: 'How severe is the reported issue?',
 * 				criteria: ['Cosmetic; no impact', 'Degraded, workaround exists', 'Blocking; no workaround'],
 * 			},
 * 		},
 * 	},
 * 	AbortSignal.timeout(30_000),
 * )
 * const readings = Object.fromEntries(
 * 	Object.entries(result.answers).map(([id, answer]) => [id, computeReading(answer)]),
 * )
 * result.model // 'tev1:0.8b' — the model the server named
 * result.usage // { prompt: 975, completion: 4, total: 979 }
 * readings.label // { winner: 'bug', probability: 0.9691, confidence: 0.9536 } to four decimals
 * readings.refund // { winner: 'true', probability: 0.9979, confidence: 0.9958 } to four decimals
 * readings.severity // { winner: '1', probability: 0.9494, confidence: 0.9241, score: 0.9919 } to four decimals
 * ```
 */
export declare class SystemOneJudge extends AgentJudge {
    constructor(options: SystemOneJudgeOptions);
    /** Identifies the System One protocol. */
    readonly name = "systemone";
    /**
     * Projects the state and questions onto the System One request with the configured model.
     *
     * @param request - The state and questions keyed by caller id
     * @returns The System One request body
     */
    body(request: JudgeRequest): SystemOneRequest;
    /**
     * Decodes requested System One answers and reports the server model and available usage.
     *
     * @param value - The parsed response body
     * @param request - The questions defining the expected answers
     * @returns The decoded distributions, model, and available usage
     * @throws JudgeError Thrown with code `PROTOCOL` for a malformed envelope or an invalid answer naming its question id
     */
    read(value: unknown, request: JudgeRequest): JudgeResult;
}

/** Configures the System One server, model, transport, authentication, and deadline. */
export declare interface SystemOneJudgeOptions extends Pick<ProviderOptions, 'timeout' | 'fetch' | 'headers'> {
    /** Holds the server origin without a path. */
    readonly url: string;
    readonly model: string;
}

/** Transliterates a TypeSafe System One yes probability and optional server confidence. */
export declare interface SystemOneNoulAnswer {
    readonly type: 'noul';
    readonly noul: number;
    readonly confidence?: number;
}

/** Transliterates a TypeSafe System One question with its protocol discriminant and criteria. */
export declare interface SystemOneQuestion {
    readonly type: 'choice' | 'score' | 'noul';
    readonly instructions?: SystemOneEntry;
    readonly criteria?: ChoiceCriteria | ScoreCriteria | NoulCriteria | null;
}

/** Transliterates the TypeSafe System One request body. */
export declare interface SystemOneRequest {
    readonly state: SystemOneEntry;
    readonly model: string;
    readonly questions: Readonly<Record<string, SystemOneQuestion>>;
}

/** Transliterates the System One response envelope before question-specific answer validation. */
export declare interface SystemOneResponse {
    readonly model?: string;
    readonly answers: Readonly<Record<string, unknown>>;
    readonly usage?: SystemOneUsage;
}

/** Accepts System One score probabilities and legends as maps or llama.cpp arrays. */
export declare interface SystemOneScoreAnswer {
    readonly type: 'score';
    readonly probabilities: Readonly<Record<string, number>> | readonly number[];
    readonly score?: number;
    readonly legend?: Readonly<Record<string, SystemOneEntry>> | readonly SystemOneEntry[];
    readonly confidence?: number;
}

/** Transliterates TypeSafe System One token counts with missing or null counts permitted. */
export declare interface SystemOneUsage {
    readonly input_tokens?: number | null;
    readonly output_tokens?: number | null;
}

/** Carries a decoded stream prefix and whether the stream ended within its byte budget. */
export declare interface TextRead {
    readonly text: string;
    /**
     * Reports true only when a read observes the `done` flag before exhausting the
     * byte budget; an abort reports false.
     */
    readonly complete: boolean;
}

/**
 * Names the closing tag that ends a {@link THINK_OPEN} reasoning span — `'</think>'`. A span the
 * stream never closes (the model was cut off mid-reasoning) is treated as thinking to its end,
 * and {@link import('./types.js').ThinkSplitterInterface.flush} settles it.
 */
export declare const THINK_CLOSE = "</think>";

/**
 * Names the opening tag a {@link import('./ThinkSplitter.js').ThinkSplitter} recognizes as the start of
 * an in-content reasoning span — `'<think>'`, the de-facto wire convention thinking models
 * (qwen3, DeepSeek-R1 family) emit their chain-of-thought under when a daemon renders it inline
 * instead of on a separate wire field. Paired with {@link THINK_CLOSE}.
 */
export declare const THINK_OPEN = "<think>";

/**
 * Names which thinking the agent loop, a relay server, and a ledger retain before calling a
 * provider: `'none'` retains none, `'turn'` retains thinking after the last `user` message,
 * and `'all'` retains all thinking. A direct `generate` or `stream` call sends messages as given.
 */
export declare type ThinkingReplay = 'none' | 'turn' | 'all';

/**
 * Feeds raw content deltas through a tiny stream-stateful state machine that routes everything
 * inside a `<think>…</think>` span to `thinking` and returns everything outside it as clean
 * content, so a provider yields the answer alone and surfaces the reasoning as
 * {@link import('./types.js').ProviderResult.thinking}. A tag split across deltas is held until
 * disambiguated, `flush()` settles the stream end, and one splitter serves one stream.
 *
 * @remarks
 * - **Cross-chunk tags.** A tag may arrive split across wire deltas (`'<thi'` then
 *   `'nk>'`): any suffix of the pending text that is a strict prefix of a tag being
 *   scanned for is held back (neither surfaced nor routed) until the next delta — or
 *   `flush()` — disambiguates it. A held tag prefix that never completes is real
 *   content; a held close-tag prefix inside a span is thinking.
 * - **The implicit leading open (the qwen3-template shape).** Some chat templates
 *   pre-seed `<think>` into the prompt scaffold, so the wire stream begins
 *   mid-reasoning and only a bare `</think>` appears. Before any tag event, a bare
 *   close therefore reclassifies everything surfaced so far (plus the pre-close
 *   pending) as thinking — `content` is corrected retroactively (the already-returned
 *   prefix cannot be recalled, so `content` is the authoritative accumulation). The
 *   rule is one-shot: after any tag event a bare `</think>` is plain text.
 * - **Multiple spans** accumulate onto `thinking` in stream order. A nested-looking
 *   `<think>` inside an open span is thinking text (no nesting is tracked — the
 *   first `</think>` closes the span), matching how the models emit it.
 * - **Unclosed span at stream end.** `flush()` routes the open span's tail (including
 *   any held partial close tag) to `thinking` — a cut-off model was still reasoning.
 * - **One splitter, one stream.** State is per-stream; create a fresh instance per
 *   provider call ({@link import('./factories.js').createThinkSplitter}).
 *
 * @example
 * ```ts
 * const splitter = new ThinkSplitter()
 * splitter.split('<thi') // '' (held — ambiguous)
 * splitter.split('nk>plan</think>ok') // 'ok'
 * splitter.thinking // 'plan'
 * splitter.content // 'ok'
 * splitter.flush() // '' (nothing held)
 * ```
 */
export declare class ThinkSplitter implements ThinkSplitterInterface {
    #private;
    get content(): string;
    get thinking(): string;
    split(delta: string): string;
    flush(): string;
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
export declare interface ThinkSplitterInterface {
    /** Holds the authoritative clean content accumulated so far (corrected across an implicit-open reclassification). */
    readonly content: string;
    /** Holds the reasoning text accumulated from every `<think>…</think>` span so far. */
    readonly thinking: string;
    /**
     * Feeds one raw delta and returns the clean, non-think content to surface for it (possibly
     * `''`) — a tag split across deltas is held until disambiguated, never leaked as content
     * and never mis-eaten as thinking.
     */
    split(delta: string): string;
    /**
     * Settles the stream end — a held partial tag that never completed returns as the final
     * content delta, and an unclosed think span's tail lands on `thinking`.
     */
    flush(): string;
}

/**
 * Describes a tool call's JSON wire projection.
 *
 * @remarks
 * The wire is strictly narrower than the domain: non-JSON arguments are refused.
 * Calls carry only id, name, and arguments; execution context stays local.
 * The guard refuses every extra member; the contract parser drops extra members.
 */
export declare const toolCallShape: ObjectShape<    {
id: StringShape;
name: StringShape;
arguments: ObjectShape<Record<never, never>, JSONShape>;
}, boolean | ContractShape>;

/**
 * Names the status a relay answers when the `authorize` callback returns anything but `true` or throws —
 * `401`, carried with no body and reaching the browser as a `ProviderError` with the `HTTP` code.
 */
export declare const UNAUTHORIZED_RELAY_STATUS = 401;

/**
 * Names the status a relay answers when the upstream provider call cannot be constructed — `502`,
 * carried with no body after `provider.stream` was entered and threw before returning its
 * iterator.
 */
export declare const UPSTREAM_RELAY_STATUS = 502;

/**
 * Names the section header {@link import('./AgentContext.js').AgentContext}'s `build()` renders the
 * active workspace's text files under — `'## Workspace'`, the leading line of the dedicated
 * workspace block in the system message and the carrier-split counterpart to the documents and
 * images section headers.
 *
 * @remarks
 * `build()` owns the workspace render (a `Workspace` / `WorkspaceManager` stays file-focused — no
 * `open` / `format` getters), so this header lives here as the contexts module's one
 * workspace-section framing constant rather than on a manager. Each workspace text file renders
 * beneath it as a fenced `` File: <path>\n```<language>\n<text>\n``` `` block — the same framing
 * the documents section uses — placed immediately after the documents section in the system block.
 */
export declare const WORKSPACE_SECTION_HEADER = "## Workspace";

export { }
