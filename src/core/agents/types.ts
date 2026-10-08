import type {
	AgentContextInterface,
	InstructionManagerInterface,
	ScopeInterface,
	Selection,
	SelectionHandler,
} from '../contexts/index.js'
import type {
	ConversationManagerInterface,
	ConversationStoreInterface,
} from '../conversations/index.js'
import type { Message, MessageInput } from '../types.js'
import type { ProviderInterface } from '../providers/index.js'
import type { BudgetInterface, TokenUsage } from '@orkestrel/budget'
import type { EmitterErrorHandler, EmitterHooks, EmitterInterface } from '@orkestrel/emitter'
import type { QueueStoreInterface } from '@orkestrel/queue'
import type { ToolCall, ToolInterface, ToolManagerInterface, ToolResult } from '@orkestrel/tool'
import type { SchedulerInterface } from '@orkestrel/workflow'
import type { WorkspaceManagerInterface } from '@orkestrel/workspace'

/**
 * Names the lifecycle state of an {@link AgentInterface} turn — `idle` before a run,
 * `running` while the loop is in flight, then the settled `done` (a normal finish or
 * a cancel) or `error` (a genuine provider / tool failure).
 */
export type AgentStatus = 'idle' | 'running' | 'done' | 'error'

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
 * only when a provider call surfaced reasoning it separated from the answer
 * ({@link ProviderResult.thinking}, joined across the run's calls) — display/audit
 * metadata that never re-enters the conversation.
 */
export interface AgentResult {
	readonly content: string
	/** Carries reasoning the run's provider calls separated from the answer (present when any surfaced it). */
	readonly thinking?: string
	/** Holds the summed {@link TokenUsage} across the run's provider calls and selections (present when any reported it). */
	readonly usage?: TokenUsage
	/**
	 * Reports cancellation or a turn limit reached with unresolved tool intent.
	 * A reply to a turn advertising no tools is a complete answer (`false`), even if it
	 * contains calls: those calls are dropped and observed through the `deny` event.
	 */
	readonly partial: boolean
}

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
export interface RunOutcome {
	readonly content: string
	readonly thinking: string | undefined
	readonly usage: TokenUsage | undefined
	readonly partial: boolean
	readonly exhausted: boolean
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
export type AgentEventMap = {
	/** Reports a run beginning — emitted at the top of `stream()` once `status` is `running`. */
	readonly start: readonly [id: string]
	/** Reports each `#run` loop iteration beginning — the zero-based turn index. */
	readonly turn: readonly [index: number]
	/** Reports a dispatched {@link ToolCall} paired with its {@link ToolResult} (executed or a denial). */
	readonly tool: readonly [call: ToolCall, result: ToolResult]
	/** Reports a turn's {@link TokenUsage} — emitted after a usage-bearing provider call. */
	readonly usage: readonly [usage: TokenUsage]
	/**
	 * Reports a call denied by scope or authority, before dispatch.
	 * A turn advertising no tools drops each call with `no tool is advertised in the active scope`.
	 * Otherwise a call excluded by the tool allow-list carries `<tool name> is not in the active scope` and
	 * produces a denial tool result and message. Authority evaluates only admitted calls.
	 */
	readonly deny: readonly [call: ToolCall, reason: string | undefined]
	/** Reports the run settled successfully (a natural finish or a cancel's partial) — the {@link AgentResult}. */
	readonly finish: readonly [result: AgentResult]
	/** Reports the run settled with a genuine (non-cancel) error — the thrown value (always `unknown`). */
	readonly error: readonly [error: unknown]
	/** Reports the run cancelled (external signal / timeout / budget / `abort()`) — the cancel reason. */
	readonly abort: readonly [reason: unknown]
	/**
	 * Reports the loop exhausting its `limit` while still holding unresolved tool intent (the model
	 * requested tools on the very last allowed turn) — the turn count reached. Distinct from
	 * `abort`: exhaustion is not a cancel (no external signal / timeout / budget tripped), so
	 * this fires instead of `abort`, still followed by `finish` carrying the partial result.
	 */
	readonly exhaust: readonly [turns: number]
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
	readonly fault: readonly [error: unknown]
	/**
	 * Reports the {@link Selection} a handler returned, after the loop built the prompt from it —
	 * at run entry and after each automatic compaction rebuild, so twice before turn 0 when the
	 * pre-first-turn compaction folds. A returned `fault` the lenient run builds from still fires
	 * it, so the receipt carries the cost; a thrown handler and a run aborted during selection
	 * fire none.
	 */
	readonly select: readonly [selection: Selection]
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
export interface ChannelInterface<T> {
	/**
	 * Writes one value — buffered, then handed to a parked consumer; a value pushed at an
	 * already-parked reader is delivered, never dropped.
	 *
	 * @param value - The value to enqueue
	 */
	push(value: T): void
	/** Ends the channel normally — a draining consumer returns once the buffer is empty. */
	close(): void
	/**
	 * Ends the channel with a failure — a draining consumer throws it once the buffer is empty;
	 * the first failure wins.
	 *
	 * @param error - The failure to surface (the first one recorded wins)
	 */
	fail(error: unknown): void
	/**
	 * Reads the values back live, in write order — returning on `close` and throwing on `fail`.
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
 * cancels the in-flight operation — for an agent turn the `result` then resolves
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
	/**
	 * Sets the initial active scope; `undefined` admits every registered tool.
	 * Each turn snapshots the scope's tool allow-list before advertising and checks calls
	 * against that list before applying authority. An absent list also admits unknown names
	 * to authority and the registry, which returns its tool-not-found failure.
	 * A reply to a turn advertising no tools ends the run as its answer, records an assistant
	 * message without calls, and emits a `deny` event for every dropped call without marking it partial.
	 * Other scoped-out calls produce denial tool results and messages, and the loop continues.
	 * Changing the context scope through the `apply` method takes effect on the next turn.
	 */
	readonly scope?: ScopeInterface
	/** Caps the tool-iteration turns before the loop stops; defaults to `DEFAULT_AGENT_LIMIT`. */
	readonly limit?: number
	/** Sets a wall-clock deadline (ms) for the whole turn; its abort commits a partial result. */
	readonly timeout?: number
	/** Bounds the token cost; each provider call's usage is charged and its abort commits a partial. */
	readonly budget?: BudgetInterface<TokenUsage>
	/** Paces the loop — the loop yields to it between turns so the host regains control. */
	readonly scheduler?: SchedulerInterface
	/** Carries an external cancel; its abort commits a partial result. */
	readonly signal?: AbortSignal
	/**
	 * Holds an optional policy gate consulted after scope admits a tool call — a denied call is
	 * fed back to the model as a denial {@link ToolResult} (a `tool` chunk + a tool
	 * message) rather than executed (no tool run, no budget cost), so the model sees the
	 * denial and can react; an allowed call dispatches normally. Omitted ⇒ every admitted call
	 * dispatches through the registry.
	 */
	readonly authority?: AuthorityInterface
	/**
	 * Holds an optional {@link ConversationManagerInterface} that becomes the agent context's message
	 * source — forwarded to the {@link AgentContextInterface} the agent builds, so
	 * `agent.context.messages` is its active conversation's live tail and `build()` folds that
	 * conversation's `view()` (the per-section summaries + the live tail). Omitted ⇒ a fresh
	 * registry holding one default conversation. With `window` set, automatic compaction folds the
	 * active conversation between turns (when it is summarizable).
	 */
	readonly conversations?: ConversationManagerInterface
	/**
	 * Holds an optional context {@link BudgetInterface} for automatic compaction. Its `consumer` is a
	 * token estimator (for example the exported {@link import('./helpers.js').estimateMessages}) and
	 * its `max` is the context window. When set, the loop measures the current full prompt (the
	 * next provider request) against this budget each turn; when that prompt reaches the window and
	 * the active conversation is summarizable, it **compacts the active conversation + continues on
	 * the rebuilt smaller view** (compact-and-continue) — the same consume-to-a-ceiling primitive
	 * as the cost `budget`, but compaction is the ceiling action instead of abort. Omit to disable.
	 */
	readonly window?: BudgetInterface<readonly Message[]>
	/**
	 * If `true`, a summarizer failure during automatic compaction aborts the run — the
	 * `fault` event still fires, then the caught error is rethrown so the run settles
	 * `error` instead of continuing over-window. The selection faults are the second source: a
	 * thrown handler, a returned `fault`, and a conversation changed under the handler each fire
	 * `fault` and then settle the run `error`. If `false`, the run continues — over-window for a
	 * summarizer failure, and on the active conversation's `view()` for a selection fault.
	 * Default: `false`.
	 */
	readonly strict?: boolean
	/**
	 * Holds the default selection handler forwarded to the agent's context; the active scope's
	 * `select` overrides it while that scope is active. The loop runs it at run entry and after
	 * each automatic compaction rebuild, for the user message that ends the conversation, and
	 * charges its usage to the cost `budget`. Omitted ⇒ with no scope handler either, the loop
	 * builds from the active conversation's `view()` and awaits nothing.
	 */
	readonly select?: SelectionHandler
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
export interface AgentRunOptions {
	/**
	 * Sets the per-run reasoning preference forwarded to the provider's `stream` as
	 * {@link ProviderStreamOptions.think} — `true` asks the backend to separate reasoning
	 * (surfaced as `think` {@link AgentChunk}s + the settled `thinking`), `false` suppresses
	 * it. Omitted ⇒ the loop sends no reasoning preference and the provider's own default applies.
	 */
	readonly think?: boolean
	/**
	 * Constrains the response to this JSON-Schema shape, forwarded to the provider's `stream`
	 * as {@link ProviderStreamOptions.schema} — a per-run structured-output request. Omitted ⇒
	 * no constraint (the loop sends no schema).
	 */
	readonly schema?: Readonly<Record<string, unknown>>
	/**
	 * Overrides {@link AgentOptions.limit} for this run only — the max tool-iteration turns
	 * before the loop stops. Omitted ⇒ the agent's constructed `limit` applies.
	 */
	readonly limit?: number
	/**
	 * Overrides {@link AgentOptions.timeout} for this run only — a wall-clock deadline (ms)
	 * whose abort commits a partial result. Omitted ⇒ the agent's constructed `timeout` applies.
	 */
	readonly timeout?: number
	/**
	 * Overrides {@link AgentOptions.budget} for this run only — a token cost bound whose abort
	 * commits a partial result; started for this run with `start()`, as the constructed budget is.
	 * Omitted ⇒ the agent's constructed `budget` applies.
	 */
	readonly budget?: BudgetInterface<TokenUsage>
	/**
	 * Carries an additional per-run external cancel, composed with {@link AgentOptions.signal} (both
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
 *   the loop awaits a running handler even when it ignores the signal.
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
export interface AgentInterface {
	readonly emitter: EmitterInterface<AgentEventMap>
	readonly id: string
	readonly status: AgentStatus
	readonly context: AgentContextInterface
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
	generate(options?: AgentRunOptions): Promise<AgentResult>
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
 * The first rule whose `match` returns true decides; if none match, the authority's
 * `fallback` decides. A matched rule allows by default and denies only when its
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
 * `fallback` is the {@link AuthorityDecision} returned when no rule matches; it
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
	 * Evaluates one tool call against the ordered rules — returns the first matching rule's
	 * verdict, which allows unless `allowed: false`, or the fallback when none match.
	 *
	 * @param context - The call under consideration (see {@link AuthorityContext})
	 * @returns The first matching rule's verdict, or the fallback when none match
	 */
	evaluate(context: AuthorityContext): AuthorityDecision
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
	 * each child through the same bounded queue before running this (parent) job, so the
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
export interface AgentRegistryInterface {
	/**
	 * Resolves a registered {@link ProviderInterface} by name — throws `unknown provider: <name>` when
	 * absent.
	 *
	 * @param name - The provider's registry key
	 * @returns The live provider
	 * @throws If no provider is registered under `name`
	 */
	provider(name: string): ProviderInterface
	/**
	 * Resolves a registered {@link ToolInterface} by name — throws `unknown tool: <name>` when
	 * absent.
	 *
	 * @param name - The tool's registry key
	 * @returns The live tool
	 * @throws If no tool is registered under `name`
	 */
	tool(name: string): ToolInterface
	/**
	 * Resolves a registered {@link AuthorityInterface} by name — throws `unknown authority: <name>` when
	 * absent.
	 *
	 * @param name - The authority's registry key
	 * @returns The live authority
	 * @throws If no authority is registered under `name`
	 */
	authority(name: string): AuthorityInterface
	/**
	 * Resolves a registered {@link SchedulerInterface} by name — throws `unknown scheduler: <name>` when
	 * absent.
	 *
	 * @param name - The scheduler's registry key
	 * @returns The live scheduler
	 * @throws If no scheduler is registered under `name`
	 */
	scheduler(name: string): SchedulerInterface
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
	build(input: AgentJobInput, signal?: AbortSignal): AgentInterface
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
 *   early from an abort / budget / timeout) is by default a failure: the handler throws
 *   an {@link import('./errors.js').AgentJobError}, so the Queue's retries (and a
 *   Runner's fail-fast) engage. Set `true` to treat a partial as success instead — the
 *   handler resolves the partial result rather than throwing.
 * - `concurrency` / `retries` / `timeout` / `store` — passed straight to the backing
 *   `QueueInterface` (see `QueueOptions`): bounded concurrency, the retry budget, the
 *   per-attempt deadline, and the durable backing for persistence + replay.
 */
export interface AgentQueueOptions {
	readonly registry: AgentRegistryInterface
	/** If `true`, a partial `AgentResult` resolves as success; if `false` (the default), it throws and retries engage. */
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
 * `AgentResult` throws by default so the run's fail-fast engages, `true` resolves it as
 * success). `concurrency` / `retries` / `timeout` pass straight to the backing
 * `RunnerInterface` (see `RunnerOptions`). The runner enables sub-agent fan-out: a
 * parent job's handler can `controller.spawn(childJob)` to launch a child agent job
 * through the same bounded queue.
 */
export interface AgentRunnerOptions {
	readonly registry: AgentRegistryInterface
	/** If `true`, a partial `AgentResult` resolves as success; if `false` (the default), it throws and fail-fast engages. */
	readonly partial?: boolean
	readonly concurrency?: number
	readonly retries?: number
	readonly timeout?: number
}
