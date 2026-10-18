import type {
	AgentChunk,
	AgentEventMap,
	AgentInterface,
	AgentOptions,
	AgentResult,
	AgentRunOptions,
	AgentStatus,
	AgentStreamInterface,
	AgentTurn,
	AuthorityInterface,
	AgentRunResult,
} from './types.js'
import type { ProviderInterface, ProviderRequest, ProviderResult } from '../providers/index.js'
import type { AgentContextInterface, Selection } from '../contexts/index.js'
import type { Section } from '../conversations/index.js'
import type { Message, ThinkingReplay } from '../types.js'
import type { AbortInterface } from '@orkestrel/abort'
import type { BudgetInterface, MeterInterface, TokenUsage } from '@orkestrel/budget'
import type { Result } from '@orkestrel/contract'
import type { EmitterInterface } from '@orkestrel/emitter'
import type { ToolCall, ToolManagerInterface, ToolResult } from '@orkestrel/tool'
import type { SchedulerInterface } from '@orkestrel/workflow'
import type { TimeoutInterface } from '@orkestrel/timeout'
import { createAbort } from '@orkestrel/abort'
import { createTokenMeter } from '@orkestrel/budget'
import { attempt } from '@orkestrel/contract'
import { createTimeout } from '@orkestrel/timeout'
import { Emitter } from '@orkestrel/emitter'
import { errorToMessage } from '@orkestrel/workflow'
import { AgentContext } from '../contexts/index.js'
import { DEFAULT_AGENT_LIMIT } from './constants.js'
import { AgentError } from './errors.js'
import { Channel } from './Channel.js'
import {
	assembleResult,
	chargeUsage,
	denyCall,
	estimateTokens,
	inferStop,
	renderToolValue,
	requireBudget,
	requireLimit,
} from './helpers.js'
import { filterAllowList, sanitizeUsage, stripThinking, sumUsage } from '../helpers.js'
import { isProviderAbortError } from '../providers/index.js'

/**
 * Composes a {@link ProviderInterface}, an {@link AgentContext}, and a
 * {@link ToolManagerInterface} into a bounded context → provider → tools → repeat turn, exposed
 * as both a one-shot `generate` and a live `stream` that share one private run — bounded by the
 * run `signal`, the `timeout`, and the `budget` folded through `AbortSignal.any`, paced by
 * `scheduler`, with tool iteration capped at `limit`.
 *
 * @remarks
 * - **One loop, two faces.** A single private async generator (`#execute`) drives the
 *   whole run. `stream` drives it eagerly into a private {@link Channel} and settles `result`
 *   from the outcome the generator returns, through one `.then` — so `result` settles
 *   whether or not the live `events` are drained; `generate` awaits that same
 *   settled `result` — so the two can never diverge.
 * - **The turn.** `#execute` builds the provider input once, then runs up to `limit` turns,
 *   each returning one readonly {@link AgentTurn} record: drive `provider.stream(...)`,
 *   yielding each content delta as a `token` chunk and charging its estimate to the
 *   `allowance` when one is set; reconcile the turn's usage against the `budget` and yield a
 *   `usage` chunk; if the model requested tools, append the assistant turn, pass them to the tool
 *   manager's `execute` method, yield a `tool` chunk per call, append each tool result message,
 *   and continue; otherwise append the final assistant message and stop. The run's content,
 *   thinking, usage, and stop derive from the turn records. Each assistant message stores its
 *   call's non-empty thinking.
 *   Provider calls and prompt estimates apply the provider's `replay` policy to the working
 *   array; an absent policy means `'none'`.
 * - **Bounded.** Each run arms one cancel through `createAbort({ signal: AbortSignal.any([
 *   …]) })` folding the external `signal`, the `timeout` deadline, and the `budget` and
 *   `allowance` signals; `abort()` fires it. Any trip stops the loop and commits a partial result
 *   (the `result` promise resolves, never rejects, on a cancel) — only a genuine
 *   provider / tool error rejects.
 * - **Paced + capped.** The loop calls the `scheduler` object's `yield` method between turns when given; tool
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
export class Agent implements AgentInterface {
	readonly #id: string
	readonly #provider: ProviderInterface
	readonly #replay: ThinkingReplay
	readonly #context: AgentContextInterface
	readonly #limit: number
	readonly #timeoutMs: number | undefined
	readonly #budget: BudgetInterface<TokenUsage> | undefined
	// The meter layer's allowance: the budget each content delta's estimate is charged against while
	// a call streams. `undefined` ⇒ no meter layer; the estimate is still measured for `usage`.
	readonly #allowance: BudgetInterface<TokenUsage> | undefined
	readonly #scheduler: SchedulerInterface | undefined
	readonly #signal: AbortSignal | undefined
	readonly #authority: AuthorityInterface | undefined
	// The context budget that admits each provider request — its `consumer` is a token estimator
	// over the complete `ProviderRequest`, its `max` the context window. `#admit` re-measures the
	// exact request (replay-filtered messages, advertised tools, per-call options) against it before
	// every dispatch; `undefined` ⇒ disabled, and the loop never calls `#admit`. Reset (`clear()`)
	// at run entry so no stale `consumed` carries across runs / a conversation switch. Not the hard
	// cost `budget` ceiling — when the request reaches its `max` this compacts + continues
	// (non-fatal on a summarizer throw, futile-guarded) and never aborts; only `strict` refuses.
	readonly #window: BudgetInterface<ProviderRequest> | undefined
	// When true, a summarizer failure during automatic compaction rethrows (after the `fault`
	// event) instead of skipping compaction and continuing over-window, and a request still over
	// the window after the permitted fold is refused with a WINDOW error before dispatch.
	readonly #strict: boolean
	// The push observation surface — owned, never inherited. The emitter isolates a
	// listener throw (routing it to the `error` handler), so it can never escape into the loop. No
	// `destroy()`: the Agent holds no other teardownable resources, and an `Emitter` owns
	// only listener sets (no timers / handles), so it is reclaimed with the agent — there
	// is no leak to clear, and adding lifecycle the entity does not otherwise need is avoided.
	readonly #emitter: Emitter<AgentEventMap>
	// The label the last run settled on. `status` derives the live answer from `#runs`, so an
	// overlapping run can never report `done` while another is still in flight.
	#settled: AgentStatus = 'idle'
	// Every in-flight run's abort handle, mapped to the distinct budget and allowance instances that
	// run holds — a run adds its entry on `stream()` and its settle removes it, so `abort()` fires
	// every live run, not only the most recent, and the concurrency guard reads which instances are
	// held. Per-run, never a single shared slot a later `stream()` could clobber: `generate`/`stream`
	// are reusable and may overlap, and each run must cancel independently (its own `stream.abort()`
	// fires its own handle; `agent.abort()` fires them all).
	readonly #runs = new Map<AbortInterface, ReadonlyArray<BudgetInterface<TokenUsage>>>()

	constructor(provider: ProviderInterface, options?: AgentOptions) {
		this.#limit = requireLimit(options?.limit ?? DEFAULT_AGENT_LIMIT)
		this.#id = crypto.randomUUID()
		this.#provider = provider
		this.#replay = provider.replay ?? 'none'
		this.#context = new AgentContext({
			...(options?.system === undefined ? {} : { system: options.system }),
			...(options?.tools === undefined ? {} : { tools: options.tools }),
			...(options?.instructions === undefined ? {} : { instructions: options.instructions }),
			...(options?.workspaces === undefined ? {} : { workspaces: options.workspaces }),
			...(options?.scope === undefined ? {} : { scope: options.scope }),
			...(options?.conversations === undefined ? {} : { conversations: options.conversations }),
			...(options?.select === undefined ? {} : { select: options.select }),
		})
		this.#timeoutMs = options?.timeout
		this.#budget = options?.budget
		this.#allowance = options?.allowance
		this.#scheduler = options?.scheduler
		this.#signal = options?.signal
		this.#authority = options?.authority
		this.#window = options?.window
		this.#strict = options?.strict ?? false
		this.#emitter = new Emitter<AgentEventMap>(options)
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
		// Zero loop logic of its own — start the stream (whose eager drive settles `result`
		// independently of any consumer) and await that same settled result, so `generate`
		// and `stream` can never diverge. No manual drain needed: the drive runs regardless.
		return this.stream(options).result
	}

	stream(options?: AgentRunOptions): AgentStreamInterface {
		// Resolve effective per-run bounds — a per-run override wins, else the construction
		// default. `limit`, `budget`, and `allowance` also thread into `#execute` (the loop bound,
		// the reconcile, and the mid-stream meter); each budget is the same instance folded into
		// `#combineSignals`, so its trip both aborts the run and is the budget the run charges.
		const limit = options?.limit === undefined ? this.#limit : requireLimit(options.limit)
		// Both bounds are checked before the concurrency guard and before either `start()`, so a
		// refused bound leaves the other untouched and nothing emitted.
		const budget = requireBudget(options?.budget ?? this.#budget, 'budget')
		const allowance = requireBudget(options?.allowance ?? this.#allowance, 'allowance')
		// The distinct accounting instances this run holds, cost budget first: an allowance that is
		// the budget itself is held, started, and folded once.
		const held = [budget, allowance].filter(
			(one, index, all): one is BudgetInterface<TokenUsage> =>
				one !== undefined && all.indexOf(one) === index,
		)
		// Concurrency guard: a `window` is one context budget every run clears and measures, and a
		// budget instance carries one signal that `start()` replaces — a second live run on either
		// would race the first run's accounting or orphan its bound. Thrown synchronously, before
		// any state mutation or emit, so a sequential/awaited caller is never affected and runs
		// holding distinct budget instances with no `window` still overlap.
		if (
			this.#runs.size > 0 &&
			(this.#window !== undefined ||
				[...this.#runs.values()].some((live) => live.some((one) => held.includes(one))))
		) {
			throw new AgentError(
				'CONCURRENCY',
				'a live run on this agent holds the window or this budget or allowance instance; use separate agents or distinct instances per run',
				{ context: { agent: this.#id } },
			)
		}
		// The deadline is created unarmed: its signal keeps its identity when `start()` arms it, so
		// it can be composed first and armed only after nothing left can throw.
		const timeoutMs = options?.timeout ?? this.#timeoutMs
		const timeout = timeoutMs === undefined ? undefined : createTimeout({ ms: timeoutMs })
		// `start()` replaces each held budget's signal, so it precedes the composition that reads it.
		for (const one of held) one.start()
		// Fold every present bound (external signal + a per-run signal + deadline + budget +
		// allowance) into one cancel the run races against; this run's own `abort()` fires this handle.
		const signal = this.#combineSignals(timeout, budget, allowance, options?.signal)
		const abort = createAbort(signal === undefined ? {} : { signal })
		timeout?.start()
		this.#runs.set(abort, held)
		// Observe the run begin — after the run joins `#runs` (which is what `status` derives
		// `running` from), so a swallowed listener throw can't perturb the state the drive is
		// about to change.
		this.#emitter.emit('start', this.id)
		const channel = new Channel<AgentChunk>()
		const settled = Promise.withResolvers<AgentResult>()
		// Kick off the eager drive synchronously (not lazily on first `events` pull): it drives
		// `#execute` into the channel, and the run settles from its outcome regardless of whether
		// anyone drains `events`. The per-run `think` / `schema` preferences ride through to
		// `provider.stream`; `limit` / `budget` / `allowance` ride through as the effective run bounds.
		void this.#drive(
			abort,
			channel,
			options?.think,
			options?.schema,
			limit,
			budget,
			allowance,
		).then(
			(outcome) => this.#finish(abort, timeout, channel, settled, limit, outcome),
			(error: unknown) => this.#fail(abort, timeout, channel, settled, error),
		)
		// An abandoned handle (neither `events` drained nor `result` awaited) must not surface an
		// unhandledRejection on a genuine error — guard the public result, where the rejection lives
		// (`#fail` rejects `settled` without re-throwing, so the drive's settle itself resolves).
		// A caller who awaits `result` still gets the rejection: `.catch` returns a derived promise, it
		// does not consume the original's rejection.
		settled.promise.catch(() => {})
		return {
			events: this.#drainEvents(channel, abort),
			result: settled.promise,
			// Fire this run's own handle (the closed-over `abort`), never a shared field a
			// later `stream()` could have replaced — so a handle's `abort()` always cancels
			// the run it belongs to, even when runs overlap.
			abort: abort.abort.bind(abort),
		}
	}

	abort(reason?: unknown): void {
		// Cancel every in-flight run — iterate a snapshot so a settle-driven `#runs.delete`
		// (a cancelled run unwinding) can't disturb the walk. Aborting is idempotent, so an
		// already-finished or already-cancelled handle is a harmless no-op.
		for (const abort of [...this.#runs.keys()]) abort.abort(reason)
	}

	// Settles a finished or cancelled run: the deadline clears, the run leaves `#runs` (releasing its
	// budget instances), the channel closes, and the assembled result resolves before it is observed.
	// A cancel still resolves a partial, so a cancelled run emits `abort` (the cancel reason) then
	// `finish`; limit exhaustion is not a cancel and emits `exhaust` (the turn count) instead. Every
	// emit follows the resolve, so an isolated listener throw can't reorder the settle.
	#finish(
		abort: AbortInterface,
		timeout: TimeoutInterface | undefined,
		channel: Channel<AgentChunk>,
		settled: PromiseWithResolvers<AgentResult>,
		limit: number,
		outcome: AgentRunResult,
	): void {
		timeout?.clear()
		this.#runs.delete(abort)
		this.#settled = 'done'
		channel.close()
		const result = assembleResult(outcome)
		settled.resolve(result)
		if (outcome.exhausted) this.#emitter.emit('exhaust', limit)
		else if (outcome.partial) this.#emitter.emit('abort', abort.signal.reason)
		this.#emitter.emit('finish', result)
	}

	// Settles a run a genuine (non-cancel) provider / tool error stopped: the channel fails, the
	// result rejects, and the failure is observed after the reject.
	#fail(
		abort: AbortInterface,
		timeout: TimeoutInterface | undefined,
		channel: Channel<AgentChunk>,
		settled: PromiseWithResolvers<AgentResult>,
		error: unknown,
	): void {
		timeout?.clear()
		this.#runs.delete(abort)
		this.#settled = 'error'
		channel.fail(error)
		settled.reject(error)
		this.#emitter.emit('error', error)
	}

	// Drives `#execute` by hand, pushing each chunk into the channel, and returns the generator's
	// return value; a genuine provider / tool error rejects. `for await` would discard the return.
	async #drive(
		abort: AbortInterface,
		channel: Channel<AgentChunk>,
		think: boolean | undefined,
		schema: Readonly<Record<string, unknown>> | undefined,
		limit: number,
		budget: BudgetInterface<TokenUsage> | undefined,
		allowance: BudgetInterface<TokenUsage> | undefined,
	): Promise<AgentRunResult> {
		const run = this.#execute(abort, think, schema, limit, budget, allowance)
		for (;;) {
			const next = await run.next()
			if (next.done === true) return next.value
			channel.push(next.value)
		}
	}

	// The live event stream: drain the channel the drive writes into, yielding each `AgentChunk` as it
	// is pushed (and throwing if the drive called `fail` on the channel). Its `return()` — fired when
	// a consumer exits with `break` early — fires the turn abort, so the run stops promptly: the drive
	// then completes the loop with `partial: true`, calls `clear` on the deadline, and settles
	// `result` to a non-misleading `{ partial: true }`, leaving `status` no longer `running`.
	async *#drainEvents(
		channel: Channel<AgentChunk>,
		abort: AbortInterface,
	): AsyncGenerator<AgentChunk, void> {
		try {
			yield* channel.drain()
		} finally {
			// Early break (consumer stopped pulling): cancel the run so the drive unwinds and
			// settles partial. A natural end reaches here too with the signal already done, so
			// this abort is a harmless no-op then.
			abort.abort()
		}
	}

	// The core loop, shared by generate + stream. Builds the provider input once, then runs turns up
	// to `limit`, appending each turn's readonly record, and continues only while the latest turn
	// requested tools. A cancel (the bound abort) ends a turn with a `cancel` record — it never
	// throws; only a genuine provider / tool error propagates. Every record is local to one call, so
	// concurrent runs share nothing, and the settled `AgentRunResult` derives from the records.
	async *#execute(
		abort: AbortInterface,
		think: boolean | undefined,
		schema: Readonly<Record<string, unknown>> | undefined,
		limit: number,
		budget: BudgetInterface<TokenUsage> | undefined,
		allowance: BudgetInterface<TokenUsage> | undefined,
	): AsyncGenerator<AgentChunk, AgentRunResult> {
		// Compaction can fold the request into a section, so every select site receives the object
		// captured at run entry.
		const last = this.#context.conversations.active?.view().at(-1)
		const request = last?.role === 'user' ? last : undefined
		// `#select` returns `undefined` when no handler is set, so the default path awaits nothing
		// before the first provider request.
		const selecting = this.#select(request, abort, budget)
		const entry =
			selecting === undefined
				? { messages: this.#context.build(), usage: undefined }
				: await selecting
		const tools = this.#context.tools
		// The per-call options are fixed for the run, so every request carries this one snapshot;
		// absent when neither preference is set.
		const options: ProviderRequest['options'] =
			think === undefined && schema === undefined
				? undefined
				: {
						...(think === undefined ? {} : { think }),
						...(schema === undefined ? {} : { schema }),
					}
		// Reset `#window` at run entry so no stale `consumed` carries across runs / a conversation
		// switch. A `limit: 0` run never measures or folds, and adds no `await` when `window` is unset.
		this.#window?.clear()
		// A cancel at the entry select site of a `limit: 0` run never reaches a turn's abort checks.
		const cancelled = abort.signal.aborted
		// One readonly record per turn; the turn index is the list length.
		const turns: AgentTurn[] = []
		while (turns.length < limit && (turns.at(-1)?.ending ?? 'tools') === 'tools') {
			turns.push(
				yield* this.#turn(
					turns.length,
					turns.at(-1),
					entry.messages,
					request,
					tools,
					options,
					abort,
					budget,
					allowance,
				),
			)
		}
		const final = turns.at(-1)
		const thinkings = turns.flatMap((turn) => (turn.thinking === undefined ? [] : [turn.thinking]))
		return {
			content:
				final?.ending === 'answer' ? final.content : turns.map((turn) => turn.content).join(''),
			thinking: thinkings.length === 0 ? undefined : thinkings.join('\n\n'),
			// Every turn's usage, then the entry selection's, then each rebuild's, in turn order.
			usage: [
				...turns.map((turn) => turn.usage),
				entry.usage,
				...turns.map((turn) => turn.spent),
			].reduce<TokenUsage | undefined>(
				(total, one) => (one === undefined ? total : sumUsage(total, one)),
				undefined,
			),
			partial: final?.partial ?? cancelled,
			// Every allowed turn requested tools; a cancel during the last one is an `abort`, never an
			// `exhaust`, so the signal is read here.
			exhausted: final?.ending === 'tools' && !abort.signal.aborted,
			stop: inferStop(abort.signal.reason, allowance, budget, this.#provider.id, final),
		}
	}

	// One turn: observe it, pace the boundary, admit the request, stream the provider, reconcile the
	// usage, then dispatch the requested tools or record the final answer. A cancel returns a
	// `cancel` record; a genuine error throws. The section before the provider call adds no `await`
	// on the default path, so the provider's `stream()` is entered in `agent.stream()`'s own call.
	async *#turn(
		index: number,
		previous: AgentTurn | undefined,
		entry: readonly Message[],
		request: Message | undefined,
		tools: ToolManagerInterface,
		options: ProviderRequest['options'],
		abort: AbortInterface,
		budget: BudgetInterface<TokenUsage> | undefined,
		allowance: BudgetInterface<TokenUsage> | undefined,
	): AsyncGenerator<AgentChunk, AgentTurn> {
		const base = previous?.messages ?? entry
		const futile = previous?.futile ?? false
		// The record of a turn a cancel stopped before its provider call.
		const stopped: AgentTurn = {
			content: '',
			thinking: undefined,
			usage: undefined,
			spent: undefined,
			messages: base,
			ending: 'cancel',
			partial: true,
			futile,
			estimate: undefined,
			interrupted: false,
			truncated: false,
		}
		// Observe each turn begin (the turn index). The emitter isolates a listener throw, so it
		// can't perturb the turn that immediately follows.
		this.#emitter.emit('turn', index)
		// Pace between expensive turns — never before the first. A scheduler honours the signal by
		// rejecting a pending yield on abort, so a cancel landing at the turn boundary surfaces here as
		// a throw; it stops the turn like any cancel, while a genuine scheduler fault propagates.
		if (index > 0) {
			try {
				await this.#scheduler?.yield({ signal: abort.signal })
			} catch (error) {
				if (abort.signal.aborted) return stopped
				throw error
			}
		}
		if (abort.signal.aborted) return stopped
		// Snapshot the allow-list before listeners can change the active scope this turn.
		const names = this.#context.scope?.tools?.slice()
		const advertised = filterAllowList(names, tools.definitions(), (definition) => definition.name)
		const definitions = advertised.length > 0 ? advertised : undefined
		// Admit the request: compose it once from the replay-filtered messages and this turn's tool
		// and option snapshot, measure it against `#window`, and dispatch exactly the request the
		// window last measured (the rebuilt one after a fold). With no `window` it is composed and
		// dispatched with no extra `await`.
		const composed = this.#compose(base, definitions, options)
		const admitted =
			this.#window === undefined
				? { dispatch: composed, messages: base, spent: undefined, futile }
				: await this.#admit(this.#window, composed, base, request, index > 0, futile, abort, budget)
		if (admitted.dispatch === undefined) {
			return {
				...stopped,
				messages: admitted.messages,
				spent: admitted.spent,
				futile: admitted.futile,
			}
		}
		// The turn's streamed content, one entry per content delta; the meter charges only when an
		// allowance exists.
		const streamed: string[] = []
		const meter =
			allowance === undefined
				? undefined
				: createTokenMeter({ budget: allowance, estimator: estimateTokens })
		const provided = yield* this.#attemptProvide(admitted.dispatch, abort.signal, streamed, meter)
		// Read before any reconcile: an abort seen here landed while the call ran.
		const interrupted = abort.signal.aborted
		if (!provided.success && !interrupted) throw provided.error
		// The abort partial is the only carrier of a cancelled call's reasoning and usage; the
		// streamed deltas already hold its content.
		const partial =
			!provided.success && isProviderAbortError(provided.error) ? provided.error.partial : undefined
		const reasoning = provided.success ? provided.value.thinking : partial?.thinking
		const thinking = reasoning !== undefined && reasoning.length > 0 ? reasoning : undefined
		const content = streamed.join('')
		const estimate = estimateTokens(content)
		const reported = provided.success ? provided.value.usage : partial?.usage
		const usage = reported === undefined ? undefined : sanitizeUsage(reported)
		// The one charge site for both paths. The estimate is already on the cost budget only when the
		// meter charged that same instance; a call that reported no usage keeps its estimate on the
		// cost budget, unless the meter put it there.
		const charged = allowance === budget ? (meter?.charged ?? 0) : 0
		const billed =
			usage ??
			(allowance === budget ? undefined : { prompt: 0, completion: estimate, total: estimate })
		if (billed !== undefined) chargeUsage(budget, billed, charged)
		const settled = {
			content,
			thinking,
			usage,
			spent: admitted.spent,
			messages: admitted.messages,
			futile: admitted.futile,
			estimate,
			interrupted,
			truncated: false,
		}
		if (!provided.success) return { ...settled, ending: 'cancel', partial: true }
		const result = provided.value
		const recorded = thinking === undefined ? {} : { thinking }
		if (usage !== undefined) {
			// Observe this turn's usage — the result already exists; emit beside the yield.
			this.#emitter.emit('usage', usage, estimate)
			yield { category: 'usage', usage, estimate }
		}
		if (definitions === undefined) {
			for (const call of result.tools ?? []) {
				this.#emitter.emit('deny', call, 'no tool is advertised in the active scope')
			}
		} else if (result.tools !== undefined && result.tools.length > 0) {
			const admittedCalls = filterAllowList(names, result.tools, (call) => call.name)
			const authorization = this.#authorize(result.tools, admittedCalls)
			if (abort.signal.aborted) return { ...settled, ending: 'cancel', partial: true }
			const assistant = this.#context.messages.add({
				role: 'assistant',
				content: result.content,
				calls: result.tools,
				...recorded,
			})
			const results = await this.#dispatch(tools, result.tools, abort.signal, authorization)
			// Each dispatched call's tool message, appended per step of a loop that yields.
			const replies: Message[] = []
			for (const [position, call] of result.tools.entries()) {
				const outcome = results[position]
				if (outcome === undefined) continue
				// Observe the dispatched tool + its result — beside the `tool` yield (the result
				// already exists). Carries the same pair the chunk carries.
				this.#emitter.emit('tool', call, outcome)
				yield { category: 'tool', call, result: outcome }
				// `call` comes from the paired call rather than the result's `id`, so tool message
				// `position` names `calls[position]` even when a supplied tool manager returns another id.
				replies.push(
					this.#context.messages.add({
						role: 'tool',
						content: outcome.success ? renderToolValue(outcome.value) : outcome.error,
						call: call.id,
					}),
				)
			}
			// The next turn's admission measures and folds the grown prompt, so a final answer never
			// pays for a fold. A tools turn's truncation does not end the run, so it is not recorded.
			return {
				...settled,
				messages: [...admitted.messages, assistant, ...replies],
				ending: 'tools',
				partial: true,
			}
		}
		// No tools: this turn's content is the final answer — record it and finish.
		this.#context.messages.add({ role: 'assistant', content: result.content, ...recorded })
		return {
			...settled,
			content: result.content,
			ending: 'answer',
			partial: abort.signal.aborted,
			truncated: result.truncated === true,
		}
	}

	// Composes the exact request one provider dispatch sends: the working messages after the
	// provider's replay policy, the advertised tool definitions, and the per-call `think` / `schema`
	// options. Keys are omitted when undefined, so the provider receives no tools and no options
	// object when there are none. The request owns its messages array, a shallow copy after the
	// replay filter, because that filter returns the working array itself for a policy that keeps
	// every message. The admission step measures this object and `#provide` sends it, so the
	// measured and the dispatched request can never diverge.
	#compose(
		messages: readonly Message[],
		tools: ProviderRequest['tools'],
		options: ProviderRequest['options'],
	): ProviderRequest {
		return {
			messages: [...stripThinking(messages, this.#replay)],
			...(tools === undefined ? {} : { tools }),
			...(options === undefined ? {} : { options }),
		}
	}

	// Admits one request against the context `window` budget immediately before its provider
	// dispatch, so only called when a window is set. `clear()` then consuming the request makes
	// `window.consumed` its estimated footprint, and `exhausted` means it has reached `max`. A
	// request over the window folds the active conversation once when it is summarizable and not
	// latched futile, then rebuilds through selection, recomposes with the same tool and option
	// snapshot, and measures again; the request that measures last is the one dispatched. A
	// non-summarizable conversation is measured but never folded, so the auto path never throws the
	// `compact()` SUMMARIZER error. A cancel anywhere returns no dispatch so the run settles partial,
	// and wins over `strict`; otherwise `strict` refuses a request still over the window with a
	// WINDOW error before any dispatch, while the lenient default sends it.
	async #admit(
		window: BudgetInterface<ProviderRequest>,
		composed: ProviderRequest,
		messages: readonly Message[],
		request: Message | undefined,
		latch: boolean,
		futile: boolean,
		abort: AbortInterface,
		budget: BudgetInterface<TokenUsage> | undefined,
	) {
		window.clear()
		window.consume(composed)
		if (!window.exhausted) return { dispatch: composed, messages, spent: undefined, futile }
		// A cancelled run is about to settle, so a fold would spend summarizer time on a request no
		// provider reads; the next run's first admission folds instead.
		if (abort.signal.aborted) return { dispatch: undefined, messages, spent: undefined, futile }
		const conversation = this.#context.conversations.active
		if (conversation?.summarizable !== true || futile) {
			return { dispatch: this.#enforce(window, composed), messages, spent: undefined, futile }
		}
		// The run signal bounds the fold: `compact()` rejects with its reason on a cancel and
		// commits nothing, even when the summarizer ignores the signal.
		return conversation.compact({ signal: abort.signal }).then(
			(section) => this.#refold(section, window, composed, messages, request, latch, abort, budget),
			(error: unknown) => this.#unfold(error, composed, messages, abort),
		)
	}

	// A fold that settled: a cancel wins; nothing folded latches on a later turn, where the tail had
	// its chance to grow, but not on the first; otherwise rebuild through selection (compaction
	// changed the view the handler evaluates) and measure the rebuilt request.
	async #refold(
		section: Section | undefined,
		window: BudgetInterface<ProviderRequest>,
		composed: ProviderRequest,
		messages: readonly Message[],
		request: Message | undefined,
		latch: boolean,
		abort: AbortInterface,
		budget: BudgetInterface<TokenUsage> | undefined,
	) {
		if (abort.signal.aborted)
			return { dispatch: undefined, messages, spent: undefined, futile: false }
		if (section === undefined) {
			return {
				dispatch: this.#enforce(window, composed),
				messages,
				spent: undefined,
				futile: latch,
			}
		}
		const selecting = this.#select(request, abort, budget)
		const rebuilt =
			selecting === undefined
				? { messages: this.#context.build(), usage: undefined }
				: await selecting
		if (abort.signal.aborted) {
			return {
				dispatch: undefined,
				messages: rebuilt.messages,
				spent: rebuilt.usage,
				futile: false,
			}
		}
		const dispatch = this.#compose(rebuilt.messages, composed.tools, composed.options)
		window.clear()
		window.consume(dispatch)
		return {
			dispatch: this.#enforce(window, dispatch),
			messages: rebuilt.messages,
			spent: rebuilt.usage,
			futile: false,
		}
	}

	// A fold that rejected: a cancel wins over the failure it caused, as on the select path;
	// otherwise surface the summarizer failure observably, rethrow under `strict`, and send the
	// over-window request leniently.
	#unfold(
		error: unknown,
		composed: ProviderRequest,
		messages: readonly Message[],
		abort: AbortInterface,
	) {
		if (abort.signal.aborted)
			return { dispatch: undefined, messages, spent: undefined, futile: false }
		this.#emitter.emit('fault', error)
		if (this.#strict) throw error
		return { dispatch: composed, messages, spent: undefined, futile: false }
	}

	// Refuses, under `strict`, a request the window still measures over its max; returns it otherwise.
	#enforce(window: BudgetInterface<ProviderRequest>, request: ProviderRequest): ProviderRequest {
		if (this.#strict && window.exhausted) {
			throw new AgentError(
				'WINDOW',
				`the request measures ${window.consumed} against a window of ${window.max} and cannot shrink`,
				{ context: { agent: this.#id, consumed: window.consumed, max: window.max } },
			)
		}
		return request
	}

	// One select site: the handler's pending selection settled into the working messages and the
	// usage it spent, or `undefined` when there is no request or no handler, so the caller builds from
	// `view()` without an await.
	#select(
		request: Message | undefined,
		abort: AbortInterface,
		budget: BudgetInterface<TokenUsage> | undefined,
	) {
		const pending = request === undefined ? undefined : this.#context.select(request, abort.signal)
		return pending === undefined
			? undefined
			: pending.then(
					(selection) => this.#adopt(selection, abort, budget),
					(error: unknown) => this.#reject(error, abort),
				)
	}

	// A resolved selection: charge its usage before the abort check, because judge calls were spent
	// either way and the charge can itself trip the run's bound; then build from it unless a cancel or
	// a strict fault intervenes. A cancelled site builds from `view()` and emits no `select`.
	#adopt(
		selection: Selection,
		abort: AbortInterface,
		budget: BudgetInterface<TokenUsage> | undefined,
	) {
		const usage = selection.usage === undefined ? undefined : sanitizeUsage(selection.usage)
		if (usage !== undefined) chargeUsage(budget, usage, 0)
		if (abort.signal.aborted) return { messages: this.#context.build(), usage }
		if (selection.fault !== undefined) {
			this.#emitter.emit('fault', selection.fault)
			if (abort.signal.aborted) return { messages: this.#context.build(), usage }
			if (this.#strict) throw selection.fault
		}
		const messages = this.#context.build(selection)
		this.#emitter.emit('select', selection)
		return { messages, usage }
	}

	// A rejected selection: a fault unless cancelled, rethrown under `strict`, then the default build.
	#reject(error: unknown, abort: AbortInterface) {
		if (!abort.signal.aborted) {
			this.#emitter.emit('fault', error)
			// A `fault` listener can cancel the run synchronously; the cancel then wins over `strict`.
			if (this.#strict && !abort.signal.aborted) throw error
		}
		return { messages: this.#context.build(), usage: undefined }
	}

	// Evaluate policy and emit denials before the run's final pre-dispatch abort guard:
	// policy callbacks and denial listeners can cancel the run synchronously.
	#authorize(calls: readonly ToolCall[], admitted: readonly ToolCall[]) {
		// `entries()` visits a hole as `undefined`, as a `for…of` over the calls does.
		const decisions = [...calls.entries()].map(([index, call]) => ({
			index,
			call,
			denial: this.#decide(call, admitted),
		}))
		return {
			allowed: new Map(
				decisions.flatMap((one) =>
					one.denial === undefined ? [[one.index, one.call] as const] : [],
				),
			),
			denials: new Map(
				decisions.flatMap((one) =>
					one.denial === undefined ? [] : [[one.index, one.denial] as const],
				),
			),
		}
	}

	// Decides one call — scope, then authority — and emits `deny` with the reason of a denial.
	#decide(call: ToolCall, admitted: readonly ToolCall[]): ToolResult | undefined {
		if (!admitted.includes(call)) {
			const reason = `${call.name} is not in the active scope`
			const denial = denyCall(call, reason)
			this.#emitter.emit('deny', call, reason)
			return denial
		}
		const authority = this.#authority
		if (authority === undefined) return undefined
		// A security gate must fail closed: if a policy `evaluate` throws, the call is not
		// cleared, so it must not run. Synthesize a denial (carrying the error's message)
		// instead of letting the throw reject the whole run — the tool stays unexecuted and
		// the model still receives a denial it can react to, exactly like an explicit `deny`.
		const evaluated = attempt(() => authority.evaluate({ call }))
		if (!evaluated.success) {
			// The declared `@orkestrel/workflow` normalizer, so a fail-closed denial carries a
			// non-empty explanation the model can read: an `Error` with an empty `message`
			// normalizes to real text, and a throw whose stringification itself fails is caught
			// rather than escaping the gate and rejecting the run.
			const reason = errorToMessage(evaluated.error)
			const denial = denyCall(call, reason)
			this.#emitter.emit('deny', call, reason)
			return denial
		}
		if (evaluated.value.allowed) return undefined
		const denial = denyCall(call, evaluated.value.reason)
		this.#emitter.emit('deny', call, evaluated.value.reason)
		return denial
	}

	// Carry cancellation into entered handlers, then merge executed results and denials
	// in call order. An all-denied turn costs no tool run.
	async #dispatch(
		tools: ToolManagerInterface,
		calls: readonly ToolCall[],
		signal: AbortSignal,
		authorization: {
			readonly allowed: ReadonlyMap<number, ToolCall>
			readonly denials: ReadonlyMap<number, ToolResult>
		},
	): Promise<readonly ToolResult[]> {
		const { allowed, denials } = authorization
		const executed = allowed.size > 0 ? await tools.execute([...allowed.values()], { signal }) : []
		// Denials and executed results never share an index.
		const results = new Map<number, ToolResult>([
			...denials,
			...[...allowed.keys()].flatMap((index, offset) => {
				const result = executed[offset]
				return result === undefined ? [] : [[index, result] as const]
			}),
		])
		return calls.map((call, index) => results.get(index) ?? denyCall(call, undefined))
	}

	// Drive one provider stream turn: read the `channel` of each {@link ProviderDelta} — a `'content'`
	// delta is the answer (appended to the turn's `streamed` log, charged through the meter, surfaced
	// as a `token` chunk, in that order); a `'thinking'` delta is live reasoning (surfaced as a `think`
	// chunk, never metered — reasoning is not answer content) — returning the provider's assembled
	// result. It sends the composed {@link ProviderRequest} unchanged — the messages already carry
	// only the thinking the provider's replay policy permits (default `'none'`), and the tools and
	// options are the turn's snapshot, absent when there are none.
	async *#provide(
		request: ProviderRequest,
		signal: AbortSignal,
		streamed: string[],
		meter: MeterInterface | undefined,
	): AsyncGenerator<AgentChunk, ProviderResult> {
		const generator = this.#provider.stream(
			request.messages,
			signal,
			request.tools,
			request.options,
		)
		for (;;) {
			const next = await generator.next()
			if (next.done) return next.value
			const delta = next.value
			if (delta.channel === 'content') {
				streamed.push(delta.text)
				meter?.charge(delta.text)
				yield { category: 'token', content: delta.text }
			} else {
				yield { category: 'think', content: delta.text }
			}
		}
	}

	// Drives `#provide` and returns its outcome as a Result built through the installed `attempt`,
	// so the turn reads the outcome from a value; the chunks still stream through to the caller.
	async *#attemptProvide(
		request: ProviderRequest,
		signal: AbortSignal,
		streamed: string[],
		meter: MeterInterface | undefined,
	): AsyncGenerator<AgentChunk, Result<ProviderResult>> {
		try {
			const result = yield* this.#provide(request, signal, streamed, meter)
			return attempt(() => result)
		} catch (error) {
			return attempt((): ProviderResult => {
				throw error
			})
		}
	}

	// The parent signal for a run's abort: the external signal, an optional per-run signal
	// (composed with, never replacing, the construction `signal`), the deadline, the effective
	// budget, and an allowance that is not the budget itself, folded through `AbortSignal.any` —
	// or a lone present one, or `undefined` when none. The budget precedes the allowance, so when
	// both are exhausted before the run the budget's reason is the run's.
	#combineSignals(
		timeout: TimeoutInterface | undefined,
		budget: BudgetInterface<TokenUsage> | undefined,
		allowance: BudgetInterface<TokenUsage> | undefined,
		signal: AbortSignal | undefined,
	): AbortSignal | undefined {
		const signals = [
			this.#signal,
			signal,
			timeout?.signal,
			budget?.signal,
			allowance === budget ? undefined : allowance?.signal,
		].filter((one): one is AbortSignal => one !== undefined)
		if (signals.length === 0) return undefined
		if (signals.length === 1) return signals[0]
		return AbortSignal.any(signals)
	}
}
