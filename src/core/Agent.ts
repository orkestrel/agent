import type {
	AgentChunk,
	AgentContextInterface,
	AgentEventMap,
	AgentInterface,
	AgentOptions,
	AgentResult,
	AgentRunOptions,
	AgentStatus,
	AgentStreamInterface,
	AuthorityDecision,
	AuthorityInterface,
	Message,
	ProviderInterface,
	ProviderResult,
	RunOutcome,
} from './types.js'
import type { AbortInterface } from '@orkestrel/abort'
import type { BudgetInterface, TokenUsage } from '@orkestrel/budget'
import type { EmitterInterface } from '@orkestrel/emitter'
import type { ToolCall, ToolManagerInterface, ToolResult } from '@orkestrel/tool'
import type { SchedulerInterface } from '@orkestrel/workflow'
import type { TimeoutInterface } from '@orkestrel/timeout'
import { createAbort } from '@orkestrel/abort'
import { createTimeout } from '@orkestrel/timeout'
import { Emitter } from '@orkestrel/emitter'
import { errorToMessage } from '@orkestrel/workflow'
import { AgentContext } from './AgentContext.js'
import { Channel } from './Channel.js'
import { DEFAULT_AGENT_LIMIT } from './constants.js'
import { AgentError, isProviderAbortError } from './errors.js'
import {
	assembleResult,
	denyCall,
	estimateTokens,
	filterAllowList,
	joinThinking,
	sanitizeUsage,
	sumUsage,
} from './helpers.js'

/**
 * Composes a {@link ProviderInterface}, an {@link AgentContext}, and a
 * {@link ToolManagerInterface} into a bounded context → provider → tools → repeat
 * turn, exposed as both a one-shot `generate` and a live `stream`.
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
 *   assistant message and stop.
 * - **Bounded.** Each run arms one cancel through `createAbort({ signal: AbortSignal.any([
 *   …]) })` folding the external `signal`, the `timeout` deadline, and the `budget`
 *   signal; `abort()` fires it. Any trip stops the loop and commits a PARTIAL result
 *   (the `result` promise RESOLVES, never rejects, on a cancel) — only a genuine
 *   provider / tool error rejects.
 * - **Paced + capped.** The `scheduler` (when given) `yield`s between turns; tool
 *   iteration is capped at `limit`.
 * - **Two observation surfaces.** The PULL {@link AgentChunk} stream carries per-token
 *   deltas (+ usage/tool chunks); the PUSH {@link emitter} ({@link AgentEventMap}) carries
 *   lifecycle + usage/tool/deny moments for fire-and-forget observers. Every event is
 *   emitted directly, AFTER the relevant state transition / settle; the emitter isolates a
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
export class Agent implements AgentInterface {
	readonly #id: string
	readonly #provider: ProviderInterface
	readonly #context: AgentContextInterface
	readonly #limit: number
	readonly #timeoutMs: number | undefined
	readonly #budget: BudgetInterface<TokenUsage> | undefined
	readonly #scheduler: SchedulerInterface | undefined
	readonly #signal: AbortSignal | undefined
	readonly #authority: AuthorityInterface | undefined
	// The CONTEXT budget for AUTOMATIC conversation compaction — its `consumer`
	// is a token estimator, its `max` the context window. `#trim` re-measures the ABSOLUTE current
	// prompt against it (clear() + consume(messages)) BEFORE the first provider request AND between
	// turns; `undefined` ⇒ disabled: `#trim` is a no-op and the loop is byte-for-byte the prior
	// behavior. Reset (`clear()`) at run entry so no stale `consumed` carries across runs / a
	// conversation switch. NOT the hard cost `budget` ceiling — when the prompt reaches its `max`
	// this COMPACTS + continues (non-fatal on a summarizer throw, futile-guarded), never aborts.
	readonly #window: BudgetInterface<readonly Message[]> | undefined
	// When true, a summarizer failure during AUTOMATIC compaction rethrows (after the
	// `fault` event) instead of skipping compaction and continuing over-window.
	readonly #strict: boolean
	// The PUSH observation surface — owned, never inherited. The emitter isolates a
	// listener throw (routing it to the `error` handler), so it can never escape into the loop. No
	// `destroy()`: the Agent holds no other teardownable resources, and an `Emitter` owns
	// only listener `Set`s (no timers / handles), so it is reclaimed with the agent — there
	// is no leak to clear, and adding lifecycle the entity does not otherwise need is avoided.
	readonly #emitter: Emitter<AgentEventMap>
	// The label the LAST run settled on. `status` derives the live answer from `#runs`, so an
	// overlapping run can never report `done` while another is still in flight.
	#settled: AgentStatus = 'idle'
	// Every in-flight run's abort handle — a run adds its handle on `stream()` and the
	// pump removes it when it settles, so `abort()` fires EVERY live run, not only the
	// most recent. Per-run, never a single shared slot a later `stream()` could clobber:
	// `generate`/`stream` are reusable and may overlap, and each run must cancel
	// independently (its own `stream.abort()` fires its own handle; `agent.abort()` fires
	// them all).
	readonly #runs = new Set<AbortInterface>()

	constructor(provider: ProviderInterface, options?: AgentOptions) {
		this.#id = crypto.randomUUID()
		this.#provider = provider
		this.#context = new AgentContext({
			...(options?.system === undefined ? {} : { system: options.system }),
			...(options?.tools === undefined ? {} : { tools: options.tools }),
			...(options?.instructions === undefined ? {} : { instructions: options.instructions }),
			...(options?.workspaces === undefined ? {} : { workspaces: options.workspaces }),
			...(options?.scope === undefined ? {} : { scope: options.scope }),
			...(options?.conversations === undefined ? {} : { conversations: options.conversations }),
		})
		this.#limit = options?.limit ?? DEFAULT_AGENT_LIMIT
		this.#timeoutMs = options?.timeout
		this.#budget = options?.budget
		this.#scheduler = options?.scheduler
		this.#signal = options?.signal
		this.#authority = options?.authority
		this.#window = options?.window
		this.#strict = options?.strict ?? false
		this.#emitter = new Emitter<AgentEventMap>({
			...(options?.on === undefined ? {} : { on: options.on }),
			...(options?.error === undefined ? {} : { error: options.error }),
		})
	}

	get id(): string {
		return this.#id
	}

	get emitter(): EmitterInterface<AgentEventMap> {
		return this.#emitter
	}

	get status(): AgentStatus {
		// Derived, never stored: a live run outranks any settled label, so overlapping runs can
		// never report `done` while one is still in flight, and a settled `error` is not erased
		// by a later run's `done` until that later run itself settles.
		return this.#runs.size > 0 ? 'running' : this.#settled
	}

	get context(): AgentContextInterface {
		return this.#context
	}

	generate(options?: AgentRunOptions): Promise<AgentResult> {
		// Zero loop logic of its own — start the stream (whose eager pump settles `result`
		// independently of any consumer) and await that same settled result, so `generate`
		// and `stream` can never diverge. No manual drain needed: the pump runs regardless.
		return this.stream(options).result
	}

	stream(options?: AgentRunOptions): AgentStreamInterface {
		// Concurrency guard: a run already in flight PLUS a shared construction-level
		// accounting instance (a `window` context budget, or a construction `budget` with no
		// per-run override) would race its charges against that shared instance — corrupting
		// the accounting. Thrown SYNCHRONOUSLY, before any state mutation or emit, so a
		// sequential/awaited caller is never affected and a concurrent run with no `window` and
		// a per-run `budget` override is still allowed.
		if (
			this.#runs.size > 0 &&
			(this.#window !== undefined || (this.#budget !== undefined && options?.budget === undefined))
		) {
			throw new AgentError(
				'CONCURRENCY',
				'concurrent runs on one agent with a shared construction window/budget corrupt accounting; use separate agents or per-run budgets',
			)
		}
		// Resolve effective per-run bounds — a per-run override wins, else the
		// construction default. `limit` and `budget` also thread into `#run` (the loop bound
		// + the mid-stream charging); `budget` here is the SAME instance folded into `#parents`
		// below, so its trip both aborts the run and is the budget `#run` charges against.
		const timeoutMs = options?.timeout ?? this.#timeoutMs
		const timeout = timeoutMs === undefined ? undefined : createTimeout({ ms: timeoutMs })
		timeout?.start()
		const budget = options?.budget ?? this.#budget
		// A construction-level budget (`this.#budget`, not a per-run `options?.budget` override) is
		// a SHARED cumulative tally across every sequential run on this agent — concurrent streams
		// on one agent race their charges against the same instance. Use separate agents (or a
		// per-run `options.budget`) for concurrent streams that must not share a budget.
		budget?.start()
		const limit = options?.limit ?? this.#limit
		// Fold every present bound (external signal + a per-run signal + deadline + budget)
		// into one cancel the run races against; this run's own `abort()` fires this handle.
		const signal = this.#parents(timeout, budget, options?.signal)
		const abort = createAbort(signal === undefined ? {} : { signal })
		this.#runs.add(abort)
		// Observe the run begin — AFTER the run joins `#runs` (which is what `status` derives
		// `running` from), so a swallowed listener throw can't perturb the state the pump is
		// about to drive.
		this.#emitter.emit('start', this.id)
		const channel = new Channel<AgentChunk>()
		const settled = Promise.withResolvers<AgentResult>()
		// Kick off the eager pump SYNCHRONOUSLY (not lazily on first `events` pull): it
		// drives `#run` into the channel and settles `settled` regardless of whether anyone
		// drains `events`. The per-run `think` / `schema` preferences ride through to
		// `provider.stream`; `limit` / `budget` ride through as the effective run bounds.
		void this.#pump(
			abort,
			timeout,
			channel,
			settled,
			options?.think,
			options?.schema,
			limit,
			budget,
		)
		// An abandoned handle (neither `events` drained nor `result` awaited) must not surface an
		// unhandledRejection on a genuine error — guard the PUBLIC result, where the rejection lives
		// (#pump's finally rejects `settled` without re-throwing, so the pump promise itself resolves).
		// A caller who awaits `result` still gets the rejection: `.catch` returns a derived promise, it
		// does not consume the original's rejection.
		settled.promise.catch(() => {})
		return {
			events: this.#events(channel, abort),
			result: settled.promise,
			// Fire THIS run's own handle (the closed-over `abort`), never a shared field a
			// later `stream()` could have replaced — so a handle's `abort()` always cancels
			// the run it belongs to, even when runs overlap.
			abort: abort.abort.bind(abort),
		}
	}

	abort(reason?: unknown): void {
		// Cancel EVERY in-flight run — iterate a snapshot so a settle-driven `#runs.delete`
		// (a cancelled run unwinding) can't disturb the walk. Aborting is idempotent, so an
		// already-finished or already-cancelled handle is a harmless no-op.
		for (const abort of [...this.#runs]) abort.abort(reason)
	}

	// The eager pump — the DRIVE behind both faces. Kicked off synchronously in `stream`
	// (NOT lazily on an `events` pull), it drives `#run` and `push`es each chunk into the
	// channel as it arrives, then settles `result` from the outcome the generator RETURNS: a
	// normal / cancelled finish `close`s the channel and RESOLVES the assembled result (status
	// `done`); a genuine provider / tool error (the bound signal NOT aborted) `fail`s the
	// channel and REJECTS (status `error`). The generator is driven by hand rather than with
	// `for await`, which discards a generator's return value — the settled `RunOutcome` IS that
	// return value, so the run owns its state and nothing is threaded through a caller-held box.
	// Because the pump runs regardless of whether anyone drains `events`, `result` ALWAYS
	// settles — that is the fix for the no-drain hang. The deadline `clear()` lives in the
	// `finally` so it ALWAYS fires (drained or not), and `result` settles EXACTLY ONCE through
	// the shared resolvers (the underlying promise obeys native settle-once — the first resolve
	// / reject wins).
	async #pump(
		abort: AbortInterface,
		timeout: TimeoutInterface | undefined,
		channel: Channel<AgentChunk>,
		settled: PromiseWithResolvers<AgentResult>,
		think: boolean | undefined,
		schema: Readonly<Record<string, unknown>> | undefined,
		limit: number,
		budget: BudgetInterface<TokenUsage> | undefined,
	): Promise<void> {
		let failure: { error: unknown } | undefined
		// The outcome of a run that produced nothing — replaced by whatever `#run` returns, and
		// read only on the success path (a genuine failure rejects from `failure` instead).
		let outcome: RunOutcome = {
			content: '',
			thinking: undefined,
			usage: undefined,
			partial: false,
			exhausted: false,
		}
		try {
			const run = this.#run(abort, think, schema, limit, budget)
			let next = await run.next()
			while (next.done !== true) {
				channel.push(next.value)
				next = await run.next()
			}
			outcome = next.value
		} catch (error) {
			failure = { error }
		} finally {
			timeout?.clear()
			// This run is settling — drop its handle so a later `agent.abort()` no longer
			// fires it (and the set never leaks finished runs).
			this.#runs.delete(abort)
			if (failure === undefined) {
				this.#settled = 'done'
				channel.close()
				const result = assembleResult(outcome)
				settled.resolve(result)
				// Observe the settle — AFTER `settled.resolve(...)` (the result is already
				// settled; emit only OBSERVES it). A cancel still RESOLVES a partial, so a
				// cancelled run emits `abort` (the cancel reason) THEN `finish` (the settled
				// partial) — observers see both "it was cancelled" and the partial outcome; a
				// natural / cap finish (`partial: false`) emits `finish` only. LIMIT EXHAUSTION
				// (unresolved tool intent at the turn cap) is NOT a cancel — it emits `exhaust`
				// (the turn count) INSTEAD of `abort`, still followed by `finish`. Both emits are
				// post-settle, so an isolated listener throw can't reorder the latch.
				if (outcome.exhausted) this.#emitter.emit('exhaust', limit)
				else if (outcome.partial) this.#emitter.emit('abort', abort.signal.reason)
				this.#emitter.emit('finish', result)
			} else {
				this.#settled = 'error'
				channel.fail(failure.error)
				settled.reject(failure.error)
				// Observe the genuine (non-cancel) failure — AFTER `settled.reject(...)`.
				this.#emitter.emit('error', failure.error)
			}
		}
	}

	// The live event stream: drain the channel the pump writes into, yielding each
	// `AgentChunk` as it is pushed (and throwing if the pump `fail`ed the channel). Its
	// `return()` — fired when a consumer `break`s out early — fires the turn ABORT, so the
	// run stops promptly: the pump then completes the loop with `partial: true`, `clear`s
	// the deadline, and settles `result` to a non-misleading `{ partial: true }` (never the
	// old `{ content: '', partial: false }`), leaving `status` no longer `running`.
	async *#events(
		channel: Channel<AgentChunk>,
		abort: AbortInterface,
	): AsyncGenerator<AgentChunk, void> {
		try {
			yield* channel.drain()
		} finally {
			// Early break (consumer stopped pulling): cancel the run so the pump unwinds and
			// settles partial. A natural end reaches here too with the signal already done, so
			// this abort is a harmless no-op then.
			abort.abort()
		}
	}

	// The core loop, shared by generate + stream. Builds the provider input once, then
	// iterates up to `limit`: stream the provider (yielding token chunks), fold usage,
	// dispatch any tool calls (yielding tool chunks) and continue, else finish. A cancel
	// (the bound abort) stops the loop and marks the outcome partial — it never throws;
	// only a genuine provider / tool error propagates. The run OWNS its state: every mutable
	// field lives in these locals for the length of one call (so concurrent runs share
	// nothing), and the settled `RunOutcome` is what the generator RETURNS to `#pump`.
	async *#run(
		abort: AbortInterface,
		think: boolean | undefined,
		schema: Readonly<Record<string, unknown>> | undefined,
		limit: number,
		budget: BudgetInterface<TokenUsage> | undefined,
	): AsyncGenerator<AgentChunk, RunOutcome> {
		// Pass the provider's optional context-framing default into `build()` — the
		// PROVIDER level of the format cascade. An agnostic provider supplies no `format`,
		// so `build(undefined)` reproduces the managers' built-in framing exactly.
		const messages: Message[] = [...this.#context.build(this.#provider.format)]
		const tools = this.#context.tools
		let content = ''
		let thinking: string | undefined
		let usage: TokenUsage | undefined
		// Limit-exhaustion tracking — `pending` is `true` while the most recent turn left
		// unresolved tool intent (the tool branch was taken and the loop is about to `continue`);
		// `broke` marks whether the loop exited through an explicit `break` (a cancel, or the natural
		// final-answer finish) rather than the `for` condition failing. Exhaustion is exactly
		// "the condition failed (`!broke`) while tool intent was still pending" — a `limit: 0` run
		// never enters the loop, so both stay `false` and the outcome is non-partial.
		let pending = false
		let broke = false
		let partial = false
		let exhausted = false
		// PER-RUN auto-compaction state — a local, so it starts FRESH each run (never carried
		// across runs or a conversation switch). `futile` is the futile-compaction guard:
		// once a `compact()` returns `undefined` while still over the window, the prompt can't
		// shrink further, so auto-compaction STOPS for the rest of THIS run (no per-turn churn).
		let futile = false
		// AUTO-COMPACTION is enabled only when BOTH a `#window` budget is set AND the active
		// conversation CAN summarize (`summarizable` — it has a summarizer). There is ALWAYS an
		// active conversation, but the DEFAULT one has no summarizer, so this gate preserves the shipped
		// behavior: a non-summarizable conversation is NEVER auto-compacted (and the loop never throws
		// the `compact()` SUMMARIZER error from the auto path). Gating the whole auto-compaction PATH
		// (the run-entry `clear()` reset + the pre-first-turn `await this.#trim`) behind this flag keeps
		// the loop PURELY ADDITIVE: with no window OR a non-summarizable conversation, NO extra `await`
		// is introduced before the first provider request, so the eager-pump / abort timing is
		// byte-for-byte the prior behavior (a synchronously-fired abort still lands exactly as before).
		// When enabled: reset `#window` at run entry so no stale `consumed` carries across runs / a
		// conversation switch, then run a PRE-FIRST-TURN `#trim` so a resumed / long conversation whose
		// INITIAL prompt already exceeds the window compacts at once (not only after a tool turn) —
		// skipped when already aborted (a pre-aborted run commits its empty partial without compaction).
		const compacting =
			this.#window !== undefined && this.#context.conversations.active?.summarizable === true
		if (compacting) {
			this.#window?.clear()
			// PRE-FIRST-TURN: `latch: false` — an `undefined` fold here means the tail is too short
			// YET (this run's turns haven't accumulated), NOT permanently futile, so it must not disable
			// auto-compaction for the run; the growing tail can still fold on the between-turns checks.
			if (!abort.signal.aborted) futile = await this.#trim(messages, false)
		}
		for (let turn = 0; turn < limit; turn += 1) {
			// Observe each iteration begin (the turn index). The emitter isolates a listener
			// throw, so it can't perturb the loop that immediately follows.
			this.#emitter.emit('turn', turn)
			// Pace between expensive turns — never after the last (the loop body decides). A
			// scheduler honours the signal by REJECTING a pending yield on abort (the standard
			// AbortSignal convention), so a cancel landing at the turn boundary surfaces here as
			// a throw, NOT as the `aborted` check below. Treat that exactly like a mid-stream
			// cancel: stop and commit a PARTIAL (resolve), never reject — a cancel is not an
			// error. A non-abort yield rejection (a genuine scheduler fault) still propagates.
			if (turn > 0) {
				try {
					await this.#scheduler?.yield({ signal: abort.signal })
				} catch (error) {
					if (abort.signal.aborted) {
						partial = true
						broke = true
						break
					}
					throw error
				}
			}
			if (abort.signal.aborted) {
				partial = true
				broke = true
				break
			}
			// Advertise only the tools the active scope admits — a scoped-out tool is filtered
			// from the definitions handed to the provider, so the model never sees it and thus
			// can't call it (neither described nor callable). `undefined` scope ⇒ all pass.
			const advertised = filterAllowList(
				this.#context.scope?.tools,
				tools.definitions(),
				(definition) => definition.name,
			)
			const definitions = advertised.length > 0 ? advertised : undefined
			// Bounded mid-stream budget enforcement — a PER-TURN local accumulator (`turnContent`,
			// distinct from the run-spanning `content`) so `charged` (the amount already consumed
			// against `budget` THIS turn) never mixes with prior turns' content. As each content delta
			// arrives, re-estimate the turn's token footprint so far and consume only the INCREMENT
			// over what was already charged — the running `budget.consume` therefore mirrors the live
			// stream instead of waiting for the turn's final usage report. Thinking deltas are NOT
			// metered here: `#provide` never routes a `'thinking'` delta through `onDelta` (only
			// `'content'` deltas are), so there is no live thinking text to estimate mid-stream — the
			// honest choice given the loop's existing delta wiring; thinking is metered, like content,
			// only through the post-turn usage reconcile that follows (which charges the FULL reported usage).
			let charged = 0
			let turnContent = ''
			let result: ProviderResult
			try {
				result = yield* this.#provide(
					messages,
					abort.signal,
					definitions,
					think,
					schema,
					(delta) => {
						content += delta
						turnContent += delta
						const est = estimateTokens(turnContent)
						if (est > charged) {
							budget?.consume({ prompt: 0, completion: est - charged, total: est - charged })
							charged = est
						}
					},
				)
			} catch (error) {
				// A cancel mid-stream (the bound signal aborted): stop and mark partial. The
				// deltas streamed before the cancel were already accumulated into `content`
				// through `onDelta`, and a ProviderAbortError's `partial.content` is exactly those
				// same yielded deltas (the contract) — so `content` already holds the partial;
				// do NOT re-add it (that double-counts). The separated REASONING has no delta
				// channel, though — the abort partial is its only carrier, so harvest it. A
				// non-abort error (the signal is not aborted) propagates so the run rejects.
				if (abort.signal.aborted) {
					if (isProviderAbortError(error)) {
						if (error.partial.thinking !== undefined) {
							thinking = joinThinking(thinking, error.partial.thinking)
						}
						// The abort's partial usage — when the provider observed it mid-stream — is
						// folded and reconciled exactly like the normal post-turn path below: the
						// FULL reported usage sums into `usage`, and only the RESIDUAL over the
						// mid-stream `charged` estimate is consumed against `budget` (never
						// double-counted). A provider that can't observe usage mid-stream (its
						// final counts never arrive) reports none, and none is fabricated here.
						if (error.partial.usage !== undefined) {
							// Sanitize the provider's partial usage before charging/folding it: a
							// non-finite or negative field floors to `0`, a fractional field floors to its
							// integer part. The normal post-turn usage path is untouched.
							const abortUsage = sanitizeUsage(error.partial.usage)
							budget?.consume({
								prompt: abortUsage.prompt,
								completion: Math.max(0, abortUsage.completion - charged),
								total: Math.max(0, abortUsage.total - charged),
							})
							usage = sumUsage(usage, abortUsage)
						}
					}
					partial = true
					broke = true
					break
				}
				throw error
			}
			if (result.thinking !== undefined && result.thinking.length > 0) {
				thinking = joinThinking(thinking, result.thinking)
			}
			if (result.usage !== undefined) {
				// Sanitize the provider's normal post-turn usage before charging/folding it,
				// exactly like the preceding abort path: a non-finite or negative field floors to `0`, a
				// fractional field floors to its integer part. Unsanitized, a buggy provider's
				// NaN/negative usage would poison `budget.consumed` and `sumUsage`, and never trip
				// exhaustion (`Math.max(0, NaN - charged)` is `NaN`).
				const resultUsage = sanitizeUsage(result.usage)
				// RESIDUAL reconcile — the mid-stream charges above already consumed `charged` worth
				// of budget against this turn's completion; charge only what remains of the FULL
				// reported usage so the turn's total budget draw matches `resultUsage` exactly (never
				// double-counted). `prompt` was never charged mid-stream (no live prompt-delta channel
				// exists), so it is charged here in full. `sumUsage` / the emitted `usage` chunk below
				// still carry the FULL sanitized `resultUsage` — reconciliation affects only the
				// budget charge, never the reported usage.
				budget?.consume({
					prompt: resultUsage.prompt,
					completion: Math.max(0, resultUsage.completion - charged),
					total: Math.max(0, resultUsage.total - charged),
				})
				usage = sumUsage(usage, resultUsage)
				// Observe this turn's usage — the result already exists; emit beside the yield.
				this.#emitter.emit('usage', resultUsage)
				yield { category: 'usage', usage: resultUsage }
			}
			if (result.tools !== undefined && result.tools.length > 0) {
				const assistant = this.#context.messages.add({
					role: 'assistant',
					content: result.content,
					calls: result.tools,
				})
				messages.push(assistant)
				const results = await this.#authorize(tools, result.tools)
				for (let index = 0; index < result.tools.length; index += 1) {
					const call = result.tools[index]
					const outcomeResult = results[index]
					if (call === undefined || outcomeResult === undefined) continue
					// Observe the dispatched tool + its result — beside the existing `tool` yield
					// (the result already exists). Carries the same pair the chunk carries.
					this.#emitter.emit('tool', call, outcomeResult)
					yield { category: 'tool', call, result: outcomeResult }
					const toolMessage = this.#context.messages.add({
						role: 'tool',
						content: outcomeResult.success
							? JSON.stringify(outcomeResult.value)
							: outcomeResult.error,
					})
					messages.push(toolMessage)
				}
				// AUTOMATIC compaction — BETWEEN turns (this `continue` path: another
				// turn follows; never after the final assistant turn that ends the loop, where it
				// would be wasted). The same `#trim` the run also ran BEFORE the first provider request
				// (so a resumed / long conversation whose initial prompt already exceeds the window
				// compacts at once). Gated behind `compacting` (window + conversation both present), so
				// with auto-compaction OFF this introduces NO extra `await` — the loop is byte-for-byte
				// the prior behavior. `latch: true` — by now the tail has accumulated this turn's
				// appends, so an `undefined` fold here is genuinely futile, and the run stops
				// calling `#trim` for the rest of its turns.
				if (compacting && !futile) futile = await this.#trim(messages, true)
				pending = true
				continue
			}
			// No tools: this turn's content is the final answer — record it and finish.
			messages.push(this.#context.messages.add({ role: 'assistant', content: result.content }))
			content = result.content
			pending = false
			broke = true
			break
		}
		// The loop exhausted `limit` (the `for` condition failed, never a `break`) while the
		// most recent turn still held unresolved tool intent: commit the outcome PARTIAL. Flag it
		// `exhausted` ONLY when the signal did NOT abort — a cancel that lands during the LAST turn's
		// post-provider work (tool authorize/execute, the residual budget reconcile, between-turns
		// compaction) also takes this `pending=true; continue` path and exits through the `for` condition
		// (never a `break`), so `broke` stays `false` even though it was a genuine cancel, not a limit
		// exhaustion. Checking `abort.signal.aborted` here classifies that case correctly: the pump
		// then emits `abort` (the cancel reason), never `exhaust`. A `limit: 0` run never enters the
		// loop (`pending` stays `false`), so it stays non-partial either way.
		if (!broke && pending) {
			partial = true
			exhausted = !abort.signal.aborted
		}
		return { content, thinking, usage, partial, exhausted }
	}

	// AUTOMATIC compaction — the production-hardened context-budget check. Called
	// BOTH before the first provider request (a resumed / long conversation compacts at once) AND
	// between turns. PURELY ADDITIVE: with no `#window` budget OR a NON-SUMMARIZABLE active conversation
	// it is a no-op, so the loop is byte-for-byte the prior behavior — and a conversation that cannot
	// summarize (the default one has no summarizer) is NEVER auto-compacted, so the auto path never
	// throws the `compact()` SUMMARIZER error. The trigger is the CONTEXT `#window` budget —
	// its `consumer` a token estimator (for example `estimateMessages`), its `max` the context window — the
	// SAME consume-to-a-ceiling primitive as the cost `budget`, but the ceiling action is COMPACT, not
	// abort. It measures the ABSOLUTE current prompt: `clear()` then `consume(messages)` makes
	// `#window.consumed` the estimated footprint of the EXACT next prompt (the working `messages` array
	// = the system block + the conversation's `view()` + this turn's appended messages — the real input
	// the next `provider.stream` will receive), and `exhausted` means that prompt has REACHED `max`.
	// PRODUCTION HARDENING:
	//  • NON-FATAL summarizer failure — `conversation.compact()` is wrapped: a thrown summarizer error
	//    does NOT crash the run; it is surfaced as a `fault` event (observable, never lost) and
	//    compaction is skipped THIS turn, then the loop continues (the over-window prompt proceeds to
	//    the provider). (A MANUAL `conversation.compact()` still propagates — only the AUTO path here is
	//    resilient.)
	//  • FUTILE-COMPACTION guard (the single-level limit) — when a BETWEEN-TURNS `compact()` resolves
	//    `undefined` (nothing left to fold) while the prompt is still over the window — that is, the live tail
	//    is at/below `keep` and the over-window is structural (the uncompactable system block + the
	//    section summaries) so compaction can't reduce further — set the per-run `futile` flag so
	//    auto-compaction STOPS for the rest of this run (no per-turn churn). The over-window prompt then
	//    proceeds to the provider, which surfaces a genuine context-length error if it truly can't fit
	//    (the real limit). The loop does NOT churn futilely. The RETURNED flag carries that latch back to
	//    `#run`, which owns the per-run state and stops calling `#trim` after it is set. `latch`
	//    gates it: the BETWEEN-TURNS check passes `true`; the PRE-FIRST-TURN check passes `false` —
	//    there an `undefined` fold means "nothing to fold YET" (the live tail hasn't
	//    accumulated this run's turns), NOT permanently futile, so it reports `false` and the run's
	//    growing tail can still fold later. (A `compact()` that DOES fold a section is never futile
	//    — the tail shrank; if the rebuilt prompt is still over window the NEXT between-turns
	//    `undefined` fold latches.)
	// No post-compact `clear()` is needed: the NEXT check's `clear()` + `consume` re-measures the
	// now-shrunken prompt from scratch. The summarizer call is the conversation's configured
	// (best-effort) one, NOT separately bound to this run's abort signal.
	async #trim(messages: Message[], latch: boolean): Promise<boolean> {
		const conversation = this.#context.conversations.active
		// No window or a non-summarizable active conversation (the default one can't fold) ⇒ the
		// additive no-op. (Both call sites are gated by `compacting`, so here `conversation` is the
		// active, summarizable one; this guard keeps `#trim` total.)
		if (this.#window === undefined || conversation?.summarizable !== true) return false
		this.#window.clear()
		this.#window.consume(messages)
		if (!this.#window.exhausted) return false
		let section: Awaited<ReturnType<typeof conversation.compact>>
		try {
			section = await conversation.compact()
		} catch (error) {
			// Surface the summarizer failure observably first (always). Lenient (default): skip
			// compaction this turn and continue over-window. STRICT: rethrow after the event so
			// the caught error propagates through `#run` and the run settles `error` instead.
			this.#emitter.emit('fault', error)
			if (this.#strict) throw error
			return false
		}
		// Nothing folded. On a BETWEEN-TURNS check (`latch`) the tail had its chance to grow yet
		// still won't fold ⇒ genuinely FUTILE: report the latch so the run stops churning and the
		// over-window prompt reaches the provider. On the PRE-FIRST-TURN check the tail is
		// too short YET ⇒ report no latch, leaving later turns free to fold as the tail grows.
		if (section === undefined) return latch
		// REBUILD the working array from the (now smaller) compacted view through the SAME projection the
		// loop opened with — so the run continues on the system block + compacted `view()`.
		messages.splice(0, messages.length, ...this.#context.build(this.#provider.format))
		return false
	}

	// The tool-dispatch gate. With no authority this is byte-identical to the no-authority path —
	// `tools.execute(calls)` straight through. With one set, each call is `evaluate`d:
	// ALLOWED calls run as a batch (skipped entirely when none are allowed, so a denial
	// costs no tool run / no budget); DENIED calls become a synthesized denial ToolResult
	// (never executed). The two are then MERGED back into the ORIGINAL `calls` order
	// (correlated by `id` through a Map), so the loop's per-call `tool` chunks + tool messages
	// stay in call order — a denied call still yields a `tool` chunk + a tool message
	// (carrying the denial error), so the model sees it and can react.
	async #authorize(
		tools: ToolManagerInterface,
		calls: readonly ToolCall[],
	): Promise<readonly ToolResult[]> {
		if (this.#authority === undefined) return tools.execute(calls)
		const authority = this.#authority
		const allowed: ToolCall[] = []
		const denials = new Map<string, ToolResult>()
		for (const call of calls) {
			// A security gate must FAIL CLOSED: if a policy `evaluate` throws, the call is NOT
			// cleared, so it must not run. Synthesize a denial (carrying the error's message)
			// instead of letting the throw reject the whole run — the tool stays unexecuted and
			// the model still sees a denial it can react to, exactly like an explicit `deny`.
			let decision: AuthorityDecision
			try {
				decision = authority.evaluate({ call })
			} catch (error) {
				// The declared `@orkestrel/workflow` normalizer, so a fail-closed denial carries a
				// NON-EMPTY explanation the model can read: an `Error` with an empty `message`
				// normalizes to real text, and a throw whose stringification itself fails is caught
				// rather than escaping the gate and rejecting the run.
				const reason = errorToMessage(error)
				denials.set(call.id, denyCall(call, reason))
				// Observe the fail-closed denial (the call + the thrown reason) — the denial is
				// already synthesized; the guarded emit can't perturb the dispatch that follows.
				this.#emitter.emit('deny', call, reason)
				continue
			}
			if (decision.allowed) allowed.push(call)
			else {
				denials.set(call.id, denyCall(call, decision.reason))
				// Observe the explicit denial (the call + the rule's reason).
				this.#emitter.emit('deny', call, decision.reason)
			}
		}
		const executed = allowed.length > 0 ? await tools.execute(allowed) : []
		const byId = new Map<string, ToolResult>(denials)
		for (const result of executed) byId.set(result.id, result)
		return calls.map((call) => byId.get(call.id) ?? denyCall(call, undefined))
	}

	// Drive one provider stream turn: read each {@link ProviderDelta}'s `channel` — a
	// `'content'` delta is the answer (fed back through `onDelta`, surfaced as a
	// `token` chunk); a `'thinking'` delta is live reasoning (surfaced as a `think` chunk,
	// NEVER fed into `onDelta` — reasoning is not answer content) — returning the provider's
	// assembled result. The per-run `think` / `schema` preferences ride into `provider.stream`
	// as {@link ProviderStreamOptions}, composed together — keys are OMITTED when undefined, so
	// the provider receives no options object at all when both are absent (preserving the prior
	// think-only behavior exactly). Kept separate so the loop reads as one straight line.
	async *#provide(
		messages: readonly Message[],
		signal: AbortSignal,
		definitions: ReturnType<ToolManagerInterface['definitions']> | undefined,
		think: boolean | undefined,
		schema: Readonly<Record<string, unknown>> | undefined,
		onDelta: (delta: string) => void,
	): AsyncGenerator<AgentChunk, ProviderResult> {
		const options: { think?: boolean; schema?: Readonly<Record<string, unknown>> } = {}
		if (think !== undefined) options.think = think
		if (schema !== undefined) options.schema = schema
		const generator = this.#provider.stream(
			messages,
			signal,
			definitions,
			Object.keys(options).length > 0 ? options : undefined,
		)
		let next = await generator.next()
		while (!next.done) {
			const delta = next.value
			if (delta.channel === 'content') {
				onDelta(delta.text)
				yield { category: 'token', content: delta.text }
			} else {
				yield { category: 'think', content: delta.text }
			}
			next = await generator.next()
		}
		return next.value
	}

	// The parent signal for a run's abort: the external signal, an optional per-run signal
	// (composed with, never replacing, the construction `signal`), the deadline, and the
	// EFFECTIVE budget (a per-run override, else the construction `budget`) folded through
	// `AbortSignal.any` — or a lone present one, or `undefined` when none.
	#parents(
		timeout: TimeoutInterface | undefined,
		budget: BudgetInterface<TokenUsage> | undefined,
		signal: AbortSignal | undefined,
	): AbortSignal | undefined {
		const signals: AbortSignal[] = []
		if (this.#signal !== undefined) signals.push(this.#signal)
		if (signal !== undefined) signals.push(signal)
		if (timeout !== undefined) signals.push(timeout.signal)
		if (budget !== undefined) signals.push(budget.signal)
		if (signals.length === 0) return undefined
		if (signals.length === 1) return signals[0]
		return AbortSignal.any(signals)
	}
}
