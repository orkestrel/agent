import type {
	AgentContextInterface,
	AgentJobInput,
	ContextFormat,
	ConversationManagerInterface,
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
import type { ToolCall, ToolDefinition, ToolInterface, ToolManagerInterface } from '@orkestrel/tool'
import type { SchedulerInterface, SchedulerOptions } from '@orkestrel/workflow'
import { AgentContext, createConversation, InstructionManager, ProviderAbortError } from '@src/core'
import { requireValue, waitForDelay } from '@orkestrel/test'
import { createTool, ToolManager } from '@orkestrel/tool'
import { createBinaryContent, createFile, createTextContent } from '@orkestrel/workspace'

// ── Scripted ProviderInterface (Ollama-free agent fixture) ───────────────────
//
// The ONE general scripted `ProviderInterface` every Ollama-free agent
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
 * - `format` — a provider-default {@link ContextFormat}; `undefined` when unset, so an
 *   agnostic provider reports no framing.
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

/**
 * Normalize a {@link ScriptedTurn} to its `{ result, deltas, thoughts }` parts — a bare result
 * carries no per-turn deltas and no thoughts. The `'result' in turn` discriminant narrows the
 * union with a guard, never an assertion.
 *
 * @param turn - The scripted turn to normalize
 * @returns The turn's `result` plus its per-turn `deltas` / `thoughts` (`undefined` for a bare result)
 */
export function turnParts(turn: ScriptedTurn): {
	readonly result: ProviderResult
	readonly deltas: readonly string[] | undefined
	readonly thoughts: readonly string[] | undefined
} {
	return 'result' in turn
		? { result: turn.result, deltas: turn.deltas, thoughts: turn.thoughts }
		: { result: turn, deltas: undefined, thoughts: undefined }
}

/**
 * Chunk a turn's whole content into ONE stream delta — the default {@link DeltasOf} a
 * {@link ScriptedProvider} applies when neither a per-turn `deltas` nor an options `deltasOf`
 * overrides it.
 *
 * @param content - The turn's content
 * @returns The content as a single-delta list
 */
export function chunkWholeDelta(content: string): readonly string[] {
	return [content]
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
	return new ScriptedProvider(turns, options)
}

/**
 * The scripted {@link ProviderInterface} {@link createScriptedProvider} builds — a REAL provider
 * that replays its turns, honours its signal between every delta, and records its calls.
 *
 * @remarks
 * Reaches its own turn cursor and its in-flight / started / calls recorders, so it is a class
 * with `#` state and methods rather than a closure over locals. Construct it through
 * {@link createScriptedProvider}.
 */
export class ScriptedProvider implements ScriptedProviderInterface {
	readonly #turns: readonly ScriptedTurn[]
	readonly #deltasOf: DeltasOf
	readonly #exhaust: 'repeat' | 'throw'
	readonly #record: boolean
	readonly #delay: number
	readonly #name: string
	readonly #format: ContextFormat | undefined
	readonly #calls: ScriptedCall[] = []
	#index = 0
	#inFlight = 0
	#maxInFlight = 0
	#started = 0

	constructor(turns: readonly ScriptedTurn[], options?: ScriptedProviderOptions) {
		this.#turns = turns
		this.#deltasOf = options?.deltasOf ?? chunkWholeDelta
		this.#exhaust = options?.exhaust ?? 'repeat'
		this.#record = options?.record === true
		this.#delay = options?.delay ?? 0
		this.#name = options?.name ?? 'scripted'
		this.#format = options?.format
	}

	get id(): string {
		return this.#name
	}

	get name(): string {
		return this.#name
	}

	get format(): ContextFormat | undefined {
		return this.#format
	}

	get maxInFlight(): number {
		return this.#maxInFlight
	}

	get started(): number {
		return this.#started
	}

	get calls(): readonly ScriptedCall[] {
		return this.#calls
	}

	async *stream(
		messages: readonly Message[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		run?: ProviderStreamOptions,
	): AsyncGenerator<ProviderDelta, ProviderResult> {
		if (this.#record) {
			this.#calls.push({ messages: [...messages], tools, options: run, signal })
		}
		this.#started += 1
		this.#inFlight += 1
		this.#maxInFlight = Math.max(this.#maxInFlight, this.#inFlight)
		try {
			if (signal.aborted) throw new ProviderAbortError({ content: '' })
			if (this.#delay > 0) await waitForDelay(this.#delay)
			const { result, deltas, thoughts } = turnParts(this.#next())
			// Per-turn `deltas` win; else chunk the content through `deltasOf`.
			const chunks = deltas ?? this.#deltasOf(result.content)
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
			this.#inFlight -= 1
		}
	}

	async generate(
		messages: readonly Message[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		run?: ProviderStreamOptions,
	): Promise<ProviderResult> {
		const generator = this.stream(messages, signal, tools, run)
		let step = await generator.next()
		while (!step.done) step = await generator.next()
		return step.value
	}

	// Consume the next turn: past the end either repeat the last ('repeat') or throw ('throw').
	#next(): ScriptedTurn {
		if (this.#index >= this.#turns.length && this.#exhaust === 'throw') {
			throw new Error(`createScriptedProvider exhausted at turn ${this.#index}`)
		}
		const turn = this.#turns[Math.min(this.#index, this.#turns.length - 1)] ?? { content: '' }
		this.#index += 1
		return turn
	}
}

// ── Agent data-stub factories (real shapes + per-test overrides) ─────────────
//
// The repeated agent DATA shapes — a tool call, a token usage, the
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
 * predictable summary-of-summaries (a data-stub, NOT a behavior-mock — the LIVE
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
		async summarize(messages) {
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
// The `{Memory,Database}{Conversation,Workspace}Store` twins each persist the
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
 * store-test fixture both `{Memory,Database}ConversationStore` twins drive (one
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
		async summarize(messages) {
			return `recap(${messages.map((message) => message.content).join('|')})`
		},
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

// ── Scenario builders (the seeded entities several suites drive) ─────────────
//
// One general form per scenario, exported here rather than re-declared inside a `describe`
// callback, so a suite imports the fixture instead of owning a near-duplicate of it. Real
// entities throughout — no mocks.

/**
 * Build a {@link ToolManagerInterface} pre-seeded with working tools — the registry the agent
 * loop tests hand to an agent so the model has SOMETHING callable.
 *
 * @param tools - The tools to seed; defaults to the canonical {@link addTool}
 * @returns A tool manager holding the supplied tools
 */
export function createSeededToolManager(tools?: readonly ToolInterface[]): ToolManagerInterface {
	const manager = new ToolManager()
	manager.add(tools === undefined ? [addTool()] : [...tools])
	return manager
}

/**
 * Build an {@link AgentContextInterface} whose ACTIVE workspace holds two TEXT files
 * (`keep.txt` / `drop.txt`) and two IMAGE files (`keep.png` / `drop.png`), plus a system prompt
 * and one seeded user turn — so a `scope.files` allow-list can be shown filtering BOTH the
 * rendered text section and the last-user image attach.
 *
 * @remarks
 * The image files are seated through the workspace constructor's `seed` seam, because `write()`
 * only mints text content.
 *
 * @returns The seeded context (system `'sys'`, four active files, one user message)
 */
export function seedWorkspaceContext(): AgentContextInterface {
	const context = new AgentContext({ system: 'sys' })
	context.workspaces.add({
		seed: [
			createFile({ path: 'keep.txt', content: createTextContent('KEPT FILE', 'text') }),
			createFile({ path: 'drop.txt', content: createTextContent('DROPPED FILE', 'text') }),
			createFile({ path: 'keep.png', content: createBinaryContent('KEEPIMG', 'image/png') }),
			createFile({ path: 'drop.png', content: createBinaryContent('DROPIMG', 'image/png') }),
		],
	})
	context.messages.add({ role: 'user', content: 'hi' })
	return context
}

/**
 * Build an {@link AgentContextInterface} carrying a system prompt, two named instructions
 * (`keep-i` / `drop-i`), and two user turns — the fixture a `scope.instructions` allow-list
 * filters.
 *
 * @returns The seeded context (system `'sys'`, two instructions, two user messages)
 */
export function seedInstructionContext(): AgentContextInterface {
	const context = new AgentContext({ system: 'sys' })
	context.instructions.add([
		{ name: 'keep-i', content: 'KEPT INSTRUCTION' },
		{ name: 'drop-i', content: 'DROPPED INSTRUCTION' },
	])
	context.messages.add([
		{ role: 'user', content: 'first' },
		{ role: 'user', content: 'second' },
	])
	return context
}

/** Options for {@link resolveSectionOpen} — the manager-options `open` override, when one applies. */
export interface SectionOpenOptions {
	readonly managerOpen?: string
}

/** Options for {@link resolveSectionRender} — the manager-options `render` and the per-item override. */
export interface SectionRenderOptions {
	readonly managerRender?: string
	readonly itemOverride?: string
}

/**
 * Resolve the instructions section's `open` (its header) at whichever cascade levels the
 * arguments set — the built-in floor, a provider default, and a manager-options override.
 *
 * @remarks
 * Builds a context holding ONE instruction, so the rendered block is `<open>\n\n<render>`; the
 * returned string is the part before the render.
 *
 * @param format - The provider-default {@link ContextFormat}, or `undefined` for none
 * @param options - The manager-options `open` override, when one applies
 * @returns The resolved section header
 */
export function resolveSectionOpen(
	format: ContextFormat | undefined,
	options?: SectionOpenOptions,
): string {
	const managerOpen = options?.managerOpen
	const instructions =
		managerOpen === undefined
			? new InstructionManager()
			: new InstructionManager({ format: { open: managerOpen } })
	const context = new AgentContext({ instructions })
	context.instructions.add({ name: 'a', content: 'X' })
	const block = requireValue(context.build(format)[0]).content
	return requireValue(block.split('\n\n')[0])
}

/**
 * Resolve ONE instruction item's rendering at whichever cascade levels the arguments set — the
 * built-in floor, a provider default, a manager-options override, and the per-item override.
 *
 * @remarks
 * Builds a context holding ONE instruction whose built-in content is `'BUILTIN'`; the returned
 * string is the part after the header.
 *
 * @param format - The provider-default {@link ContextFormat}, or `undefined` for none
 * @param options - The manager-options `render` override and the per-item `override`
 * @returns The resolved item rendering
 */
export function resolveSectionRender(
	format: ContextFormat | undefined,
	options?: SectionRenderOptions,
): string {
	const managerRender = options?.managerRender
	const instructions =
		managerRender === undefined
			? new InstructionManager()
			: new InstructionManager({
					format: {
						render() {
							return managerRender
						},
					},
				})
	const context = new AgentContext({ instructions })
	context.instructions.add({
		name: 'a',
		content: 'BUILTIN',
		...(options?.itemOverride === undefined ? {} : { override: options.itemOverride }),
	})
	const block = requireValue(context.build(format)[0]).content
	return requireValue(block.split('\n\n')[1])
}

/**
 * Register a conversation on a {@link ConversationManagerInterface} and compact it, so the
 * registered conversation carries a real compacted section, a live tail, and a rollup summary —
 * a durable `save` / `open` round trip over it is then NON-VACUOUS in every field.
 *
 * @param manager - The manager to register the conversation on (it supplies the summarizer and `keep`)
 * @param id - The conversation id to register
 */
export async function seedConversation(
	manager: ConversationManagerInterface,
	id: string,
): Promise<void> {
	const conversation = manager.add({ id })
	conversation.add([
		{ role: 'user', content: 'first' },
		{ role: 'assistant', content: 'second' },
		{ role: 'user', content: 'third' },
	])
	await conversation.compact()
}
