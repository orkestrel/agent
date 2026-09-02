import type {
	AgentJobInput,
	ContextFormat,
	ConversationSnapshot,
	ConversationStoreInterface,
	ConversationSummaryHandler,
	Message,
	ProviderDelta,
	ProviderInterface,
	ProviderResult,
	ProviderStreamOptions,
} from '@src/core'
import type { TokenUsage } from '@orkestrel/budget'
import type { ToolCall, ToolDefinition, ToolInterface } from '@orkestrel/tool'
import type { SchedulerInterface, SchedulerOptions } from '@orkestrel/workflow'
import { createConversation, ProviderAbortError } from '@src/core'
import { waitForDelay } from '@orkestrel/test'
import { createTool } from '@orkestrel/tool'

// ── Scripted ProviderInterface (Ollama-free agent fixture) ───────────────────
//
// AGENTS §16.1: the ONE general scripted `ProviderInterface` every Ollama-free agent
// test drives — the agent-job tests, the deterministic loop tests (tool iteration, the
// chunk stream, generate↔stream parity, abort / budget bounds, status, the emitter),
// and the provider-agnosticism proof. The LIVE model is exercised separately in the
// `src:ollama` project. It is a real provider (NOT a mock of the agent): `stream`
// chunks the turn's content into deltas and RETURNS the result, honouring its `signal`
// between every delta exactly like the Ollama provider (an abort throws a
// `ProviderAbortError` carrying the accumulated partial), so a cancel threaded into the
// agent commits a genuine partial.

/**
 * One turn a {@link createScriptedProvider} replays — either a bare {@link ProviderResult}
 * (chunked by the provider's `deltasOf`) or a `{ result, deltas?, thoughts? }` pair whose per-turn
 * `deltas` override how that one turn's content streams and whose `thoughts` stream live
 * reasoning deltas before the content. A `deltas` of `[]` streams the content as zero deltas
 * (the result still returns).
 */
export type ScriptedTurn =
	| ProviderResult
	| {
			readonly result: ProviderResult
			readonly deltas?: readonly string[]
			readonly thoughts?: readonly string[]
	  }

/**
 * One recorded `generate` / `stream` call on a {@link createScriptedProvider} (when `record`).
 *
 * @remarks
 * `signal` is the live bound the call was handed — the agent's composed run signal (external
 * signal + the run's own handle + the `timeout` deadline + the `budget`). A test holds it past
 * the call to prove which bounds did, or did not, trip afterwards.
 */
export interface ScriptedCall {
	readonly messages: readonly Message[]
	readonly tools: readonly ToolDefinition[] | undefined
	readonly options: ProviderStreamOptions | undefined
	readonly signal: AbortSignal
}

/** How a {@link createScriptedProvider} chunks a turn's content into stream deltas. */
export type DeltasOf = (content: string) => readonly string[]

/**
 * Options for {@link createScriptedProvider} — every field optional, defaulting to the
 * original single-delta / repeat-on-exhaust behaviour.
 *
 * @remarks
 * - `delay` — ms paused at the start of each call (lets a test observe concurrency via
 *   `maxInFlight`); defaults to `0`.
 * - `name` — sets the provider's `id` and `name` (so a drop-in-swap test can prove two
 *   providers are distinguishable); defaults to `'scripted'`.
 * - `format` — a provider-default {@link ContextFormat}, included on the provider
 *   ONLY when supplied (omitted ⇒ framing-agnostic, like the live OllamaProvider).
 * - `deltasOf` — how a turn's content is chunked into stream deltas; defaults to one whole
 *   delta (`(content) => [content]`). A per-turn `deltas` (the `{ result, deltas }` turn
 *   form) overrides this for that turn.
 * - `exhaust` — what happens once the turn list is consumed: `'repeat'` (the DEFAULT — the
 *   last turn repeats, so a job with extra tool-iterations still resolves) or `'throw'` (a
 *   call past the end throws, to assert a bounded loop never over-ran the script).
 * - `record` — when `true`, every call appends its `messages` / `tools` / `signal` to `calls`.
 */
export interface ScriptedProviderOptions {
	readonly delay?: number
	readonly name?: string
	readonly format?: ContextFormat
	readonly deltasOf?: DeltasOf
	readonly exhaust?: 'repeat' | 'throw'
	readonly record?: boolean
}

/**
 * A scripted {@link ProviderInterface} plus its live recorders — `maxInFlight` is the
 * high-water mark of concurrent calls (so a test can prove a queue / runner bounded the
 * agent jobs, e.g. `concurrency: 2` ⇒ `maxInFlight <= 2`), `started` counts calls, and
 * `calls` records each call's `messages` / `tools` / `signal` (populated only under `record: true`).
 */
export interface ScriptedProviderInterface extends ProviderInterface {
	/** The highest number of `stream` calls in flight at once across this provider's life. */
	readonly maxInFlight: number
	/** How many `stream` calls have started in total. */
	readonly started: number
	/** Each call's `messages` / `tools` / `signal`, in order — populated only when `record: true`. */
	readonly calls: readonly ScriptedCall[]
}

// Normalize a {@link ScriptedTurn} to its `{ result, deltas? }` parts — a bare result has
// no per-turn deltas (the `'result' in turn` discriminant narrows the union, §14, no `as`).
function turnParts(turn: ScriptedTurn): {
	readonly result: ProviderResult
	readonly deltas: readonly string[] | undefined
	readonly thoughts: readonly string[] | undefined
} {
	return 'result' in turn
		? { result: turn.result, deltas: turn.deltas, thoughts: turn.thoughts }
		: { result: turn, deltas: undefined, thoughts: undefined }
}

/**
 * Create the shared scripted {@link ProviderInterface} for deterministic, Ollama-free agent
 * tests — each `generate` / `stream` call consumes the next {@link ScriptedTurn}, streams
 * its content as deltas (per-turn `deltas`, else `deltasOf(content)`, else the whole content
 * as one delta), and RETURNS the turn's result. The call honours its `signal` between every
 * delta: an already-aborted (or mid-stream aborted) signal throws a `ProviderAbortError`
 * carrying the accumulated partial, so a cancel threaded into the agent commits a genuine
 * partial. Once the turn list is exhausted the last turn repeats (`exhaust: 'repeat'`, the
 * default) unless `exhaust: 'throw'` is set.
 *
 * @param turns - The {@link ScriptedTurn}s to replay in order (the last repeats by default)
 * @param options - The {@link ScriptedProviderOptions} (all optional; see its `@remarks`)
 * @returns A {@link ScriptedProviderInterface} (the provider + its recorders)
 */
export function createScriptedProvider(
	turns: readonly ScriptedTurn[],
	options?: ScriptedProviderOptions,
): ScriptedProviderInterface {
	const delay = options?.delay ?? 0
	const name = options?.name ?? 'scripted'
	const deltasOf = options?.deltasOf ?? ((content: string): readonly string[] => [content])
	const exhaust = options?.exhaust ?? 'repeat'
	const calls: ScriptedCall[] = []
	let index = 0
	let inFlight = 0
	let maxInFlight = 0
	let started = 0
	// Consume the next turn: past the end either repeat the last ('repeat') or throw ('throw').
	const next = (): ScriptedTurn => {
		if (index >= turns.length && exhaust === 'throw') {
			throw new Error(`createScriptedProvider exhausted at turn ${index}`)
		}
		const turn = turns[Math.min(index, turns.length - 1)] ?? { content: '' }
		index += 1
		return turn
	}
	async function* stream(
		messages: readonly Message[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		run?: ProviderStreamOptions,
	): AsyncGenerator<ProviderDelta, ProviderResult> {
		if (options?.record === true) {
			calls.push({ messages: [...messages], tools, options: run, signal })
		}
		started += 1
		inFlight += 1
		maxInFlight = Math.max(maxInFlight, inFlight)
		try {
			if (signal.aborted) throw new ProviderAbortError({ content: '' })
			if (delay > 0) await waitForDelay(delay)
			const turn = next()
			const { result, deltas, thoughts } = turnParts(turn)
			// Per-turn `deltas` win; else chunk the content via `deltasOf`.
			const chunks = deltas ?? deltasOf(result.content)
			let streamed = ''
			let reasoned = ''
			for (const thought of thoughts ?? []) {
				if (signal.aborted) {
					const partial: ProviderResult =
						reasoned.length > 0 ? { content: streamed, thinking: reasoned } : { content: streamed }
					throw new ProviderAbortError(partial)
				}
				reasoned += thought
				if (thought.length > 0) yield { channel: 'thinking', text: thought }
			}
			for (const delta of chunks) {
				if (signal.aborted) {
					const partial: ProviderResult =
						reasoned.length > 0 ? { content: streamed, thinking: reasoned } : { content: streamed }
					throw new ProviderAbortError(partial)
				}
				streamed += delta
				if (delta.length > 0) yield { channel: 'content', text: delta }
			}
			if (signal.aborted) {
				const partial: ProviderResult =
					reasoned.length > 0 ? { content: streamed, thinking: reasoned } : { content: streamed }
				throw new ProviderAbortError(partial)
			}
			return result
		} finally {
			inFlight -= 1
		}
	}
	return {
		id: name,
		name,
		...(options?.format === undefined ? {} : { format: options.format }),
		get maxInFlight() {
			return maxInFlight
		},
		get started() {
			return started
		},
		get calls() {
			return calls
		},
		stream,
		async generate(messages, signal, tools, run) {
			const generator = stream(messages, signal, tools, run)
			let step = await generator.next()
			while (!step.done) step = await generator.next()
			return step.value
		},
	}
}

// ── Agent data-stub factories (real shapes + per-test overrides) ─────────────
//
// AGENTS §16.1: the repeated agent DATA shapes — a tool call, a token usage, the
// canonical `add` / `loop` tools, an agent job — built ONCE as parameterized factories
// so a test stubs the shape it needs and customizes only the bit that matters, instead
// of re-typing the literal. These are REAL data builders (and, for the tools, real
// working `ToolInterface`s), NOT mocks of behaviour.

/**
 * Build a {@link ToolCall} for an agent / loop test — the verbose `{ id, name, arguments }`
 * literal folded into a call with a sensible default (`add` with no arguments) plus
 * per-call overrides, so a test names only the fields its scenario cares about.
 *
 * @param overrides - Fields to override on the default call (`{ id: 'c1', name: 'add', arguments: {} }`)
 * @returns The assembled tool call
 */
export function createToolCall(overrides?: Partial<ToolCall>): ToolCall {
	return { id: 'c1', name: 'add', arguments: {}, ...overrides }
}

/**
 * Build a {@link TokenUsage} for an agent / budget test — the default `{ prompt: 5,
 * completion: 7, total: 12 }`, with per-call overrides for a budget-triggering variant.
 *
 * @param overrides - Fields to override on the default usage
 * @returns The assembled token usage
 */
export function createTokenUsage(overrides?: Partial<TokenUsage>): TokenUsage {
	return { prompt: 5, completion: 7, total: 12, ...overrides }
}

/**
 * The canonical `add` tool — a REAL {@link ToolInterface} that returns a fixed `5`, the
 * single most-repeated tool literal across the agent loop / registry tests (where the loop
 * only needs SOME callable tool whose result feeds back, not a real summation). A data
 * builder, not a mock: a test that needs the tool to actually sum its arguments, or to
 * record its calls, keeps its own `createTool` closure.
 *
 * @returns A working `add` tool returning `5`
 */
export function addTool(): ToolInterface {
	return createTool({ name: 'add', execute: () => 5 })
}

/**
 * The canonical `loop` tool — a REAL {@link ToolInterface} that always returns `'again'`,
 * the tool the iteration-cap / budget / always-tool loop tests repeat. A data builder, not
 * a mock.
 *
 * @returns A working `loop` tool
 */
export function loopTool(): ToolInterface {
	return createTool({ name: 'loop', execute: () => 'again' })
}

/**
 * Build an {@link AgentJobInput} for an agent-job test — the default `{ provider: 'main',
 * messages: [{ role: 'user', content: 'go' }] }`, with per-call overrides so a test names
 * only the job fields its scenario varies (a different `provider` / `content`, a `tools`
 * list, a `budget`). A specific failure-scenario job (a budget ceiling, a tool list) is
 * expressed through overrides; a genuinely bespoke one stays local.
 *
 * @param overrides - Fields to override on the default job
 * @returns The assembled agent-job input
 */
export function createAgentJob(overrides?: Partial<AgentJobInput>): AgentJobInput {
	return { provider: 'main', messages: [{ role: 'user', content: 'go' }], ...overrides }
}

/**
 * Create a deterministic stub {@link ConversationSummaryHandler} for the conversation-layer tests
 * — a REAL `(messages) => Promise<string>` that digests the slice into `recap of <n>` (the
 * folded count), so a `compact()` produces a predictable section summary and the rollup is a
 * predictable summary-of-summaries (AGENTS §16.1: a data-stub, NOT a behavior-mock — the LIVE
 * model is exercised separately in the `src:ollama` project). Counts its calls so a test can
 * prove the TWO summarizer calls per compaction (the section digest + the rollup regeneration).
 *
 * @returns The summarizer plus a live `calls` recorder of every digested message-slice
 */
export function createStubSummarizer(): {
	readonly summarize: ConversationSummaryHandler
	readonly calls: ReadonlyArray<readonly Message[]>
} {
	const calls: Array<readonly Message[]> = []
	return {
		get calls() {
			return calls
		},
		summarize: async (messages) => {
			calls.push(messages)
			return `recap of ${messages.length}`
		},
	}
}

/** A {@link SchedulerInterface} that records how many turn boundaries its `yield` paced. */
export interface RecordingSchedulerInterface extends SchedulerInterface {
	/** How many times `yield` ran — the turn boundaries the loop paced through this scheduler. */
	readonly yields: number
}

/**
 * Create a {@link RecordingSchedulerInterface} — a real `SchedulerInterface` whose
 * `yield` counts each call (the turn boundary it paced) and resolves immediately, so a
 * test can prove pacing ran BETWEEN turns (not after the last). It honours its signal
 * exactly like the real scheduler — an already-aborted signal rejects with the reason —
 * and its `delay` is a no-op. Not a mock: a genuine scheduler the agent loop drives.
 *
 * @returns A scheduler whose `yields` reports the turn boundaries it paced
 */
export function createRecordingScheduler(): RecordingSchedulerInterface {
	let yields = 0
	return {
		get yields() {
			return yields
		},
		async yield(options?: SchedulerOptions) {
			if (options?.signal?.aborted) throw options.signal.reason
			yields += 1
		},
		async delay() {},
	}
}

// ── Store-pair contract batteries (Memory ⇄ Database twins, environment-agnostic) ──
//
// AGENTS §16.1: the `{Memory,Database}{Conversation,Workspace}Store` twins each persist the
// SAME self-contained, pure-JSON snapshot behind the SAME `{X}StoreInterface` seam (get / set /
// delete, async, keyed by the snapshot's own id), so the round-trip / upsert / delete / two-ids
// battery is IDENTICAL across each pair. Each pair's snapshot builder + shared battery are
// promoted here so the contract lives in ONE place; every twin invokes the battery ONCE with its
// own store factory and KEEPS its twin-specific blocks local. Real data only — NO mocks. All
// plain `@src/core` (no `node:*` / DOM), so they load in every project. The assertions are
// plain-JSON `toEqual` (no class-identity `toBe`).

/**
 * Build a REAL {@link ConversationSnapshot} the way a conversation produces one — three turns
 * added, then a genuine `compact()` folds the oldest two into one summarized section + regenerates
 * the rollup `summary`, with the last message kept live (`keep: 1`). So the snapshot is NON-VACUOUS
 * in BOTH the compacted sections AND the live tail (and carries a rollup summary). The shared
 * store-test fixture both `{Memory,Database}ConversationStore` twins drive (AGENTS §16.1 — one
 * builder, not a per-file copy). The deterministic, provider-free summarizer is folded INSIDE
 * (digesting the slice into `recap(<contents>)` — NOT {@link createStubSummarizer}, whose `recap of
 * <n>` digest text differs), so a `compact()` produces a predictable section + rollup.
 *
 * @param id - The conversation id (and snapshot key); defaults to `'chat'`
 * @returns The settled conversation's snapshot (sections + live tail + rollup summary)
 */
export async function buildConversationSnapshot(id = 'chat'): Promise<ConversationSnapshot> {
	const conversation = createConversation({
		id,
		summarize: async (messages) => `recap(${messages.map((message) => message.content).join('|')})`,
		keep: 1,
	})
	conversation.add([
		{ role: 'user', content: 'first' },
		{ role: 'assistant', content: 'second' },
		{ role: 'user', content: 'third' },
	])
	// Fold the oldest two into one summarized section + regenerate the rollup; the last stays live.
	await conversation.compact()
	return conversation.snapshot()
}

// A `makeStore` builds a fresh, empty store for one scenario; `build` is
// {@link buildConversationSnapshot}. Every scenario below RUNS the store operations and RETURNS
// their plain results — it asserts nothing, since NO `describe` / `it` / `expect` may enter this
// module. A consuming suite's own `it` block calls the scenario, then asserts on what it returns.
export type MakeConversationStore = () => ConversationStoreInterface
export type BuildConversationSnapshot = (id?: string) => Promise<ConversationSnapshot>

/** The literal values a {@link conversationStoreRoundTrip} result must carry, shared by every twin. */
export interface ConversationStoreRoundTripExpectation {
	readonly sectionSummary: string
	readonly sectionMessages: readonly string[]
	readonly liveTail: readonly string[]
	readonly rollupSummary: string
}

/**
 * The literal values `buildConversationSnapshot()`'s round trip must reproduce — the fold's section
 * summary + retained messages, the live tail, and the rollup summary. Shared so both twin suites (and
 * `setup.test.ts`'s own proof) assert the SAME literals rather than each retyping them.
 */
export const conversationStoreRoundTripExpectation: ConversationStoreRoundTripExpectation = {
	sectionSummary: 'recap(first|second)',
	sectionMessages: ['first', 'second'],
	liveTail: ['third'],
	rollupSummary: 'recap(recap(first|second))',
}

/**
 * Run the round-trip scenario of the shared `ConversationStoreInterface` contract: set a real
 * {@link buildConversationSnapshot} snapshot, then get it back. Returns what was stored and what came
 * back, sections + live tail + rollup summary intact, so the caller's `it` block asserts the equality
 * (and the literals in {@link conversationStoreRoundTripExpectation}) itself.
 *
 * @param makeStore - Builds a fresh, empty store (the twin's own factory)
 * @param build - The snapshot builder ({@link buildConversationSnapshot})
 * @returns The stored `snapshot` and the retrieved `got`
 */
export async function conversationStoreRoundTrip(
	makeStore: MakeConversationStore,
	build: BuildConversationSnapshot,
): Promise<{
	readonly snapshot: ConversationSnapshot
	readonly got: ConversationSnapshot | undefined
}> {
	const store = makeStore()
	const snapshot = await build()
	await store.set(snapshot)
	const got = await store.get(snapshot.id)
	return { snapshot, got }
}

/**
 * Run the upsert scenario: `set` keys off the snapshot's OWN id (no separate id param), so
 * re-setting the same id REPLACES — insert-or-replace semantics, not an append (one entry, latest
 * wins). Returns the replacement and what `get` reads back, for the caller to assert equal.
 *
 * @param makeStore - Builds a fresh, empty store (the twin's own factory)
 * @param build - The snapshot builder ({@link buildConversationSnapshot})
 * @returns The replacement `second` snapshot and the retrieved `got`
 */
export async function conversationStoreUpsert(
	makeStore: MakeConversationStore,
	build: BuildConversationSnapshot,
): Promise<{
	readonly second: ConversationSnapshot
	readonly got: ConversationSnapshot | undefined
}> {
	const store = makeStore()
	const first = await build('c')
	const second: ConversationSnapshot = {
		id: 'c',
		sections: [],
		messages: [{ id: 'm1', role: 'user', content: 'only' }],
	}
	await store.set(first)
	await store.set(second)
	return { second, got: await store.get('c') }
}

/**
 * Run the delete scenario: set a snapshot, read it back (proving it landed), delete it, then read
 * again — the caller asserts `beforeDelete` is defined and `afterDelete` is `undefined`.
 *
 * @param makeStore - Builds a fresh, empty store (the twin's own factory)
 * @param build - The snapshot builder ({@link buildConversationSnapshot})
 * @returns The snapshot read before and after the delete
 */
export async function conversationStoreDeleteThenAbsent(
	makeStore: MakeConversationStore,
	build: BuildConversationSnapshot,
): Promise<{
	readonly beforeDelete: ConversationSnapshot | undefined
	readonly afterDelete: ConversationSnapshot | undefined
}> {
	const store = makeStore()
	const snapshot = await build()
	await store.set(snapshot)
	const beforeDelete = await store.get(snapshot.id)
	await store.delete(snapshot.id)
	const afterDelete = await store.get(snapshot.id)
	return { beforeDelete, afterDelete }
}

/**
 * Run the absent-delete scenario: deleting an id that was never stored — the caller asserts the
 * settled promise resolves `undefined` rather than rejecting (a no-op).
 *
 * @param makeStore - Builds a fresh, empty store (the twin's own factory)
 * @returns The store's own `delete` promise, unsettled
 */
export function conversationStoreDeleteAbsent(makeStore: MakeConversationStore): Promise<void> {
	return makeStore().delete('never-stored')
}

/**
 * Run the absent-get scenario: getting an id that was never stored — the caller asserts the result
 * is `undefined`.
 *
 * @param makeStore - Builds a fresh, empty store (the twin's own factory)
 * @returns What `get` resolves for an id the store never saw
 */
export function conversationStoreGetAbsent(
	makeStore: MakeConversationStore,
): Promise<ConversationSnapshot | undefined> {
	return makeStore().get('never-stored')
}

/**
 * Run the two-ids-coexist scenario: a real durable store holds many conversations, so distinct ids
 * must not clobber each other, and dropping one must leave the other intact. Returns every snapshot
 * and every read, before and after the `alpha` delete, for the caller to assert.
 *
 * @param makeStore - Builds a fresh, empty store (the twin's own factory)
 * @param build - The snapshot builder ({@link buildConversationSnapshot})
 * @returns The two stored snapshots and the reads before/after dropping `alpha`
 */
export async function conversationStoreTwoIds(
	makeStore: MakeConversationStore,
	build: BuildConversationSnapshot,
): Promise<{
	readonly alpha: ConversationSnapshot
	readonly beta: ConversationSnapshot
	readonly gotAlpha: ConversationSnapshot | undefined
	readonly gotBeta: ConversationSnapshot | undefined
	readonly gotAlphaAfterDelete: ConversationSnapshot | undefined
	readonly gotBetaAfterDelete: ConversationSnapshot | undefined
}> {
	const store = makeStore()
	const alpha = await build('alpha')
	const beta = await build('beta')
	await store.set(alpha)
	await store.set(beta)
	const gotAlpha = await store.get('alpha')
	const gotBeta = await store.get('beta')
	await store.delete('alpha')
	const gotAlphaAfterDelete = await store.get('alpha')
	const gotBetaAfterDelete = await store.get('beta')
	return { alpha, beta, gotAlpha, gotBeta, gotAlphaAfterDelete, gotBetaAfterDelete }
}
