import type {
	AgentContextInterface,
	AgentContextOptions,
	AgentInterface,
	AgentJobInput,
	AgentOptions,
	AgentQueueOptions,
	AgentRegistryInterface,
	AgentRegistryOptions,
	AgentResult,
	AgentRunnerOptions,
	AuthorityInterface,
	AuthorityOptions,
	BinaryMIME,
	ConversationInterface,
	ConversationManagerInterface,
	ConversationManagerOptions,
	ConversationOptions,
	ConversationSnapshotRow,
	ConversationStoreInterface,
	FileContent,
	FileInput,
	FileInterface,
	InstructionInput,
	InstructionInterface,
	InstructionManagerInterface,
	InstructionManagerOptions,
	ProviderInterface,
	ScopeInput,
	ScopeInterface,
	ScopeManagerInterface,
	ScopeManagerOptions,
	ThinkSplitterInterface,
	ToolInterface,
	ToolManagerInterface,
	ToolOptions,
	WorkspaceInterface,
	WorkspaceManagerInterface,
	WorkspaceManagerOptions,
	WorkspaceOptions,
	WorkspaceSnapshotRow,
	WorkspaceStoreInterface,
} from './types.js'
import type { DriverInterface, TableInterface } from '@orkestrel/database'
import type { QueueInterface } from '@orkestrel/queue'
import type { RunnerInterface } from '@orkestrel/workflow'
import { rawShape, stringShape } from '@orkestrel/contract'
import { createDatabase, createMemoryDriver } from '@orkestrel/database'
import { createQueue } from '@orkestrel/queue'
import { createRunner } from '@orkestrel/workflow'
import { Agent } from './Agent.js'
import { AgentContext } from './AgentContext.js'
import { AgentRegistry } from './AgentRegistry.js'
import { Authority } from './Authority.js'
import { Conversation } from './conversations/Conversation.js'
import { ConversationManager } from './conversations/ConversationManager.js'
import { DatabaseConversationStore } from './conversations/stores/DatabaseConversationStore.js'
import { MemoryConversationStore } from './conversations/stores/MemoryConversationStore.js'
import { settleAgentJob } from './helpers.js'
import { Instruction } from './instructions/Instruction.js'
import { InstructionManager } from './instructions/InstructionManager.js'
import { Scope } from './scopes/Scope.js'
import { ScopeManager } from './scopes/ScopeManager.js'
import { ThinkSplitter } from './ThinkSplitter.js'
import { Tool } from './tools/Tool.js'
import { ToolManager } from './tools/ToolManager.js'
import { computeSize, countLines } from './helpers.js'
import { Workspace } from './workspaces/Workspace.js'
import { WorkspaceManager } from './workspaces/WorkspaceManager.js'
import { DatabaseWorkspaceStore } from './workspaces/stores/DatabaseWorkspaceStore.js'
import { MemoryWorkspaceStore } from './workspaces/stores/MemoryWorkspaceStore.js'

/**
 * Create a tool — a {@link ToolInterface} binding a {@link ToolDefinition} schema
 * (the `name` / `description` / `parameters` the model sees) to the `execute` handler
 * that runs a call.
 *
 * @remarks
 * Only `name` is required (it keys the tool in a {@link ToolManagerInterface} and is
 * what the model calls); `description` / `parameters` are the optional JSON-Schema the
 * provider advertises (forwarded verbatim). The handler's `args` is the model-supplied
 * `unknown` arguments record — narrow it inside (§14); a `createToolManager` registry
 * isolates a throw into a `ToolResult.error`.
 *
 * @param options - `name` (required), optional `description` / `parameters`, and the
 *   `execute` handler (see {@link ToolOptions})
 * @returns A working {@link ToolInterface}
 *
 * @example
 * ```ts
 * import { createTool } from '@src/core'
 *
 * const add = createTool({
 * 	name: 'add',
 * 	description: 'Add two numbers',
 * 	execute: (args) => Number(args.a) + Number(args.b),
 * })
 * ```
 */
export function createTool(options: ToolOptions): ToolInterface {
	return new Tool(options)
}

/**
 * Create a tool registry — a {@link ToolManagerInterface} that resolves tool names,
 * lists {@link ToolDefinition}s for the provider, and executes calls with per-call
 * error isolation.
 *
 * @remarks
 * Starts empty; `add` registers one tool or a batch (§9.2), `definitions()` yields the
 * schemas to hand a provider, and `execute` runs a {@link ToolCall} (or a batch),
 * ALWAYS resolving a {@link ToolResult} — a handler throw becomes an `error` result and
 * an unknown name a not-found `error`, so a tool throw never escapes and a batch never
 * fails as a whole.
 *
 * @returns An empty {@link ToolManagerInterface}
 *
 * @example
 * ```ts
 * import { createTool, createToolManager } from '@src/core'
 *
 * const tools = createToolManager()
 * tools.add(createTool({ name: 'add', execute: (a) => Number(a.x) + Number(a.y) }))
 * const result = await tools.execute({ id: '1', name: 'add', arguments: { x: 1, y: 2 } })
 * ```
 */
export function createToolManager(): ToolManagerInterface {
	return new ToolManager()
}

/**
 * Create a conversation — a {@link ConversationInterface} grouping messages above a flat
 * message store it OWNS DIRECTLY, with compaction into summarized sections, a regenerated
 * rollup `summary`, on-demand `rehydrate`, and substring `search`, driven by a
 * provider-agnostic {@link ConversationSummarizer} seam.
 *
 * @remarks
 * Append turns through the conversation's own `add` (the live tail it owns); `view()` is the model input
 * (each section as a summary message, then the live tail). `compact()` folds the older live
 * messages into a summarized {@link SectionInterface} and regenerates the rollup — it REQUIRES
 * a `summarize` (omitted ⇒ `compact()` throws a `ConversationError`); `keep` retains a recent
 * tail (default `DEFAULT_CONVERSATION_KEEP` — fold ALL). `rehydrate(id)` / `search(query)` read
 * the retained originals. Observable (`emitter` — `compact` / `summary` / `rehydrate`), wired
 * via the reserved `on` option (§8); the emitter isolates a listener throw and routes it to
 * its `error` handler (the `error` option, §13), so it can never corrupt a compaction.
 *
 * @param options - Optional `id` / `on` hooks + the `summarize` seam + `keep` (see {@link ConversationOptions})
 * @returns A working {@link ConversationInterface}
 *
 * @example
 * ```ts
 * import type { ProviderInterface } from '@src/core'
 * import { createConversation } from '@src/core'
 *
 * declare const provider: ProviderInterface // any concrete implementation supplied by the host app
 * const conversation = createConversation({
 * 	// Append the instruction as the FINAL user turn — a chat model emits nothing when the
 * 	// prompt ends on an assistant turn, so a leading-system instruction is unreliable.
 * 	summarize: async (messages) =>
 * 		(await provider.generate([...messages, { id: 's', role: 'user', content: 'Summarize the conversation so far concisely.' }], AbortSignal.timeout(30_000))).content,
 * })
 * conversation.add({ role: 'user', content: 'Hello' })
 * await conversation.compact() // folds the live tail into a summarized section
 * ```
 */
export function createConversation(options?: ConversationOptions): ConversationInterface {
	return new Conversation(options)
}

/**
 * Create a conversation registry — a {@link ConversationManagerInterface} holding
 * {@link ConversationInterface}s keyed by their `id` (in insertion order) WITH an active pointer:
 * the §9 store over the conversation layer plus the `active` / `switch` seam the context renders.
 *
 * @remarks
 * Starts empty; `add(input?)` mints a {@link ConversationInterface} (its `id` from the input
 * or a random UUID), flowing the manager's default `summarize` / `keep` in unless the input
 * overrides them, and stores it (an already-present `id` overwrites — last write wins) — and
 * AUTO-ACTIVATES the FIRST one (a registry with conversations always has one `active`); a later
 * `add` leaves `active` unchanged. `switch(id)` re-points `active` (an unknown `id` returns
 * `undefined`, leaving `active` unchanged — lenient, never throws); `conversation(id)` /
 * `conversations()` look up; `remove` (one or a batch, §9.2) reports whether any was removed AND
 * clears `active` if it was the removed one; `clear` empties it and clears `active`. Event-free
 * (each conversation owns its own observable `emitter`). A conversation created with NEITHER a
 * manager default nor a per-`add` `summarize` cannot `compact` (it throws a `ConversationError`).
 *
 * @param options - Optional default `summarize` / `keep` (see {@link ConversationManagerOptions})
 * @returns An empty {@link ConversationManagerInterface}
 *
 * @example
 * ```ts
 * import { createConversationManager } from '@src/core'
 *
 * const conversations = createConversationManager({ summarize: async (m) => `recap of ${m.length}` })
 * const chat = conversations.add() // auto-activates — conversations.active === chat
 * chat.add({ role: 'user', content: 'Hello' })
 * ```
 */
export function createConversationManager(
	options?: ConversationManagerOptions,
): ConversationManagerInterface {
	return new ConversationManager(options)
}

/**
 * Create the in-memory conversation store — a {@link ConversationStoreInterface} backed by a
 * process-lifetime `Map` of {@link import('./types.js').ConversationSnapshot}s keyed by conversation
 * id, the DEFAULT backing for the durable {@link ConversationManagerInterface.open} /
 * {@link ConversationManagerInterface.save} seam. The EXACT twin of {@link createMemoryWorkspaceStore}.
 *
 * @remarks
 * A plain `Map` (the snapshot is already pure JSON, so no encoding is needed for the memory tier),
 * the structural twin of {@link createMemoryWorkspaceStore}. `get` / `set` / `delete` are async (the
 * same shape a durable backend fits); UNLIKE a session store there is NO idle-TTL / eviction — a
 * persisted conversation lives until an explicit `delete`. Its driver-pluggable twin is
 * {@link createDatabaseConversationStore} (the snapshot as one opaque JSON column over a `databases`
 * table) — for a DURABLE store pass it a JSON / SQLite / IndexedDB driver, and it swaps in WITHOUT
 * touching the manager or the conversation. Hydration stays a manager concern: read a snapshot back
 * and rebuild the live conversation through the constructor `seed` (re-supplying the live
 * `summarize` / `keep`).
 *
 * @returns A memory-backed {@link ConversationStoreInterface}
 *
 * @example
 * ```ts
 * import { createConversationManager, createMemoryConversationStore } from '@src/core'
 *
 * const store = createMemoryConversationStore()
 * const manager = createConversationManager({ store })
 * const conversation = manager.add()
 * conversation.add({ role: 'user', content: 'hello' })
 * await manager.save(conversation.id)            // persist the conversation
 * ```
 */
export function createMemoryConversationStore(): ConversationStoreInterface {
	return new MemoryConversationStore()
}

/**
 * Create a {@link DatabaseConversationStore} over any {@link DriverInterface} — the durable,
 * driver-pluggable backing for the conversation persistence seam, the opt-in twin of
 * {@link createMemoryConversationStore}. The EXACT twin of {@link createDatabaseWorkspaceStore}.
 *
 * @remarks
 * Builds a one-table database (`conversations`, keyed by `id`) over the supplied driver, the snapshot
 * held as ONE OPAQUE JSON COLUMN — the column map is `{ id; snapshot }` where `snapshot` is a
 * `rawShape` (a JSON blob), exactly as {@link createDatabaseWorkspaceStore} stores its snapshot. The
 * snapshot is already a COMPLETE, self-contained, pure-JSON payload, so storing it whole is lossless
 * AND keeps the row type FLAT (the column reads back as `unknown`, narrowed on `get` by
 * {@link import('./helpers.js').isConversationSnapshot}). The `driver` DEFAULTS to
 * {@link createMemoryDriver}, so the store ALSO works in memory out of the box; pass a server
 * `createJSONDriver` / `createSQLiteDriver` (or a browser IndexedDB driver) for a persistent one —
 * the durability is the driver's job, the store engine is shared. It swaps in behind
 * {@link ConversationStoreInterface} WITHOUT touching the manager or the conversation.
 *
 * @param driver - The storage backend the snapshots persist to (defaults to {@link createMemoryDriver})
 * @returns A {@link ConversationStoreInterface} over the driver
 *
 * @example
 * ```ts
 * import { createConversationManager, createDatabaseConversationStore, createMemoryDriver } from '@src/core'
 *
 * const store = createDatabaseConversationStore(createMemoryDriver()) // a durable driver swaps in here
 * const manager = createConversationManager({ store })
 * const conversation = manager.add()
 * conversation.add({ role: 'user', content: 'hello' })
 * await manager.save(conversation.id)            // persist the conversation (one JSON column)
 * ```
 */
export function createDatabaseConversationStore(
	driver: DriverInterface = createMemoryDriver(),
): ConversationStoreInterface {
	// The snapshot is stored as ONE OPAQUE JSON column (`rawShape`), so the row infers FLAT —
	// `{ id: string; snapshot: unknown }` = `ConversationSnapshotRow` — and the sections/messages
	// snapshot shape never forces a contract `Infer`.
	const columns = { id: stringShape(), snapshot: rawShape({}) }
	const database = createDatabase({ driver, tables: { conversations: columns } })
	const table: TableInterface<ConversationSnapshotRow> = database.table('conversations')
	return new DatabaseConversationStore(table)
}

/**
 * Create an instruction — an immutable {@link InstructionInterface} (a named directive)
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
 * import { createInstruction } from '@src/core'
 *
 * const instruction = createInstruction({ name: 'tone', content: 'Be concise.', priority: 5 })
 * ```
 */
export function createInstruction(input: InstructionInput): InstructionInterface {
	return new Instruction(input)
}

/**
 * Create an instruction registry — an {@link InstructionManagerInterface} holding
 * immutable instructions keyed by `name`, listed by descending `priority`.
 *
 * @remarks
 * Starts empty; `add` (one or a batch, §9.2) MINTS each `id` and OVERWRITES a same-name
 * instruction (last write wins); `instructions()` lists them sorted by descending
 * `priority` (stable for ties); `format` / `description` are the build contract a richer
 * context renders an instructions block with; `remove` (one or a batch) reports whether
 * any was removed; `clear` empties it. Carries an observable `emitter`
 * ({@link import('./types.js').InstructionManagerEventMap}) wired via the reserved `on`
 * option (§8); the emitter isolates a listener throw and routes it to its `error` handler
 * (the `error` option, §13), so it can never corrupt a mutation. An optional `format`
 * override is the manager-options level of the `AgentContext` build cascade (consulted by
 * `description` / `format`, beating the provider default + built-in; a per-item
 * `InstructionInput.format` still beats it).
 *
 * @param options - Optional `on` hooks + a `format` override (see {@link InstructionManagerOptions})
 * @returns An empty {@link InstructionManagerInterface}
 *
 * @example
 * ```ts
 * import { createInstructionManager } from '@src/core'
 *
 * const instructions = createInstructionManager()
 * instructions.add({ name: 'tone', content: 'Be concise.', priority: 5 })
 * ```
 */
export function createInstructionManager(
	options?: InstructionManagerOptions,
): InstructionManagerInterface {
	return new InstructionManager(options)
}

/**
 * Create a named scope — an immutable {@link ScopeInterface} from its `name` and the four
 * optional per-category allow-lists, the `id` minted at construction.
 *
 * @remarks
 * Each list is THREE-WAY: `undefined` ⇒ NO constraint on that category (all pass), `[]` ⇒
 * NONE pass, a non-empty list ⇒ only the listed keys pass. `narrow(config)` composes a
 * tighter child by set-INTERSECTION (an `undefined` side imposing no constraint). Stored
 * immutable — never mutated after creation (`narrow` returns a new scope).
 *
 * @param input - `name` (required) and the optional `instructions` / `tools` / `messages` /
 *   `files` allow-lists (see {@link ScopeInput})
 * @returns A working {@link ScopeInterface}
 *
 * @example
 * ```ts
 * import { createScope } from '@src/core'
 *
 * const reader = createScope({ name: 'reader', tools: ['search', 'read'] })
 * reader.narrow({ tools: ['read', 'write'] }).tools // ['read'] — intersection tightens
 * ```
 */
export function createScope(input: ScopeInput): ScopeInterface {
	return new Scope(input)
}

/**
 * Create a scope registry — a {@link ScopeManagerInterface} holding immutable scopes keyed
 * by their minted `id`, in insertion order.
 *
 * @remarks
 * Starts empty; `create` mints each scope's `id` and stores it (keyed by `id`, so it
 * always adds — two scopes may share a `name`); `scopes()` lists them in insertion order;
 * `remove` (one or a batch, §9.2) reports whether any was removed; `clear` empties it.
 * Carries an observable `emitter` ({@link import('./types.js').ScopeManagerEventMap}) wired
 * via the reserved `on` option (§8); the emitter isolates a listener throw and routes it to
 * its `error` handler (the `error` option, §13), so it can never corrupt a mutation.
 *
 * @param options - Optional `on` hooks (see {@link ScopeManagerOptions})
 * @returns An empty {@link ScopeManagerInterface}
 *
 * @example
 * ```ts
 * import { createScopeManager } from '@src/core'
 *
 * const scopes = createScopeManager()
 * const reader = scopes.create({ name: 'reader', tools: ['search'] })
 * ```
 */
export function createScopeManager(options?: ScopeManagerOptions): ScopeManagerInterface {
	return new ScopeManager(options?.on, options?.error)
}

/**
 * Create a richer turn context — an {@link AgentContextInterface} assembling a provider
 * request from the optional system prompt, the instruction registry, the workspace registry,
 * the conversation store, the tool registry, and the active scope.
 *
 * @remarks
 * `system` is the optional system prompt; `tools` / `instructions` / `workspaces` are pre-built
 * managers to reuse (empty ones are created when omitted, so `context.workspaces` is ALWAYS
 * present); `scope` is the initial active filter (`undefined` ⇒ no filtering, mutable afterwards
 * via `context.scope`). The `messages` store is always fresh. `build()` folds the scoped
 * instructions — PLUS the ACTIVE workspace's scope-filtered text files (fenced) — into ONE leading
 * `system` message and appends the scoped conversation (attaching the active workspace's
 * scope-filtered image files' `data` to the last user message), built fresh each call; the active
 * workspace is the SOLE document/image context. Tools are advertised STRUCTURALLY (via
 * `tools.definitions()`, scope-filtered by the loop), never serialized into the prompt.
 *
 * @param options - Optional `system` / `tools` / `instructions` / `workspaces` / `scope`
 *   (see {@link AgentContextOptions})
 * @returns A working {@link AgentContextInterface}
 *
 * @example
 * ```ts
 * import { createAgentContext } from '@src/core'
 *
 * const context = createAgentContext({ system: 'You are concise.' })
 * context.instructions.add({ name: 'tone', content: 'Be terse.' })
 * context.messages.add({ role: 'user', content: 'Hi' })
 * context.build() // [{ role: 'system', content: 'You are concise.\n\n## Instructions\n\nBe terse.' }, { role: 'user', content: 'Hi' }]
 * ```
 */
export function createAgentContext(options?: AgentContextOptions): AgentContextInterface {
	return new AgentContext(options)
}

/**
 * Create an agent loop — an {@link AgentInterface} composing a
 * {@link ProviderInterface}, its {@link AgentContextInterface}, and a tool registry
 * into a bounded context → provider → tools → repeat turn, exposed as a one-shot
 * `generate` and a live `stream`.
 *
 * @remarks
 * One private loop drives the turn; `generate` DRAINS the same stream `stream`
 * exposes, so they can never diverge. Each turn is bounded by one cancel folded from
 * `signal` + `timeout` + `budget` (via `AbortSignal.any`) — any trip (or `abort()`)
 * commits a PARTIAL result (the stream's `result` RESOLVES on a cancel, rejects only
 * on a genuine provider / tool error). The `scheduler` paces between turns; tool
 * iteration is capped at `limit` (default `DEFAULT_AGENT_LIMIT`). Tools are advertised
 * structurally via `context.tools.definitions()`. Two observation surfaces: the
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
 * import type { ProviderInterface } from '@src/core'
 * import { createAgent, createTokenBudget } from '@src/core'
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
 * 	if (chunk.type === 'token') process.stdout.write(chunk.content)
 * }
 * const result = await stream.result // { content, usage?, partial }
 * ```
 */
export function createAgent(provider: ProviderInterface, options?: AgentOptions): AgentInterface {
	return new Agent(provider, options)
}

/**
 * Create a stream-stateful `<think>` separator — a {@link ThinkSplitterInterface} that
 * splits a thinking model's in-content `<think>…</think>` reasoning spans away from
 * the answer, delta by delta, so a provider yields ONLY clean content and surfaces the
 * accumulated reasoning as {@link import('./types.js').ProviderResult.thinking}.
 *
 * @remarks
 * Feed each raw wire delta through `split(delta)` (it returns the clean content to
 * surface — possibly `''` mid-think) and settle the stream end with `flush()` (a held
 * partial open tag that never completed returns as final content; an UNCLOSED think
 * span lands on `thinking`). Tags split ACROSS deltas are held back until
 * disambiguated, multiple spans accumulate in order, and a nested-looking `<think>`
 * inside an open span is just thinking text. One splitter serves ONE stream — create
 * a fresh one per provider call.
 *
 * @returns A fresh {@link ThinkSplitterInterface} (state empty, outside any span)
 *
 * @example
 * ```ts
 * import { createThinkSplitter } from '@src/core'
 *
 * const splitter = createThinkSplitter()
 * const clean = splitter.split('<think>plan the answer</think>Here it is.')
 * clean // 'Here it is.'
 * splitter.thinking // 'plan the answer'
 * ```
 */
export function createThinkSplitter(): ThinkSplitterInterface {
	return new ThinkSplitter()
}

/**
 * Create a policy gate — an {@link AuthorityInterface} the agent loop consults before
 * each tool call runs, evaluating the ordered rules first-match-wins and falling back
 * to the configured default when none match.
 *
 * @remarks
 * `rules` are evaluated in order — the FIRST whose `match` is true decides (a matched
 * rule ALLOWS unless its `allowed` is explicitly `false`). When no rule matches, the
 * `fallback` decides; it defaults to `{ zone: DEFAULT_AUTHORITY_ZONE, allowed: true }`
 * (allow-unmatched — a rules list of denials acts as a DENYLIST). Pass an
 * `allowed: false` `fallback` to flip the gate to deny-by-default (an ALLOWLIST). Wire
 * the result into `createAgent` via `AgentOptions.authority`: a denied call is fed back
 * to the model as a denial `ToolResult` (not executed, no budget cost), so the model
 * can react. Synchronous now — the async human-approval handshake is deferred.
 *
 * @param options - Optional `rules` (ordered) and `fallback` (see {@link AuthorityOptions})
 * @returns A working {@link AuthorityInterface}
 *
 * @example
 * ```ts
 * import { createAgent, createAuthority } from '@src/core'
 *
 * // Deny the `delete` tool, allow everything else.
 * const authority = createAuthority({
 * 	rules: [{ match: (c) => c.call.name === 'delete', zone: 'restricted', allowed: false }],
 * })
 * const agent = createAgent(provider, { tools, authority })
 * ```
 */
export function createAuthority(options?: AuthorityOptions): AuthorityInterface {
	return new Authority(options)
}

/**
 * Create an agent registry — an {@link AgentRegistryInterface} holding the named pools of
 * live, non-serializable pieces (providers, tools, authorities, schedulers) that a
 * serializable {@link AgentJobInput}'s names resolve against, and `build`ing a seeded,
 * signal-wired {@link AgentInterface} from a job.
 *
 * @remarks
 * `providers` is required; `tools` / `authorities` / `schedulers` are optional pools.
 * The accessors (`provider` / `tool` / `authority` / `scheduler`) THROW `unknown <category>:
 * <name>` on an unregistered name (§9.1 + §12) — a misconfigured or crash-restored job
 * fails loudly rather than running with a missing dependency. `build(input, signal)`
 * resolves the names, rebuilds the token budget from its ceiling, seeds the agent's
 * context with the job's messages, and threads `signal` so a queue / runner abort
 * propagates. This is the bridge that makes durable, serializable agent jobs runnable.
 *
 * @param options - The named pools (see {@link AgentRegistryOptions})
 * @returns A working {@link AgentRegistryInterface}
 *
 * @example
 * ```ts
 * import type { ProviderInterface } from '@src/core'
 * import { createAgentRegistry, createTool } from '@src/core'
 *
 * declare const provider: ProviderInterface // any concrete implementation supplied by the host app
 * const registry = createAgentRegistry({
 * 	providers: { main: provider },
 * 	tools: { add: createTool({ name: 'add', execute: (a) => Number(a.x) + Number(a.y) }) },
 * })
 * const agent = registry.build({ provider: 'main', messages: [{ role: 'user', content: 'Hi.' }] })
 * ```
 */
export function createAgentRegistry(options: AgentRegistryOptions): AgentRegistryInterface {
	return new AgentRegistry(options)
}

/**
 * Create a durable, bounded-concurrency agent-job queue — a {@link QueueInterface} over
 * serializable {@link AgentJobInput}s that COMPOSES `createQueue`: each job is rehydrated
 * through the `registry` into a live {@link AgentInterface}, run to its {@link AgentResult},
 * and subjected to the partial-as-configurable-failure policy.
 *
 * @remarks
 * - **Composes the substrate (no new engine).** The handler is the only new logic;
 *   bounded `concurrency`, `retries`, the per-attempt `timeout`, and durable persistence
 *   via `store` (+ `restore()` after a crash) are all the backing Queue's. `enqueue`
 *   returns a per-job promise.
 * - **Durable + serializable.** Because `AgentJobInput` is JSON-serializable, a `store`
 *   (e.g. `createMemoryQueueStore` / `createDatabaseQueueStore`) persists outstanding
 *   jobs; `restore()` re-enqueues them after a restart and the `registry` rehydrates the
 *   live pieces from the names — so a job survives a crash.
 * - **Partial policy.** A partial result THROWS an
 *   {@link import('./errors.js').AgentJobError} by default, so a job cancelled by its
 *   attempt deadline / a queue abort RETRIES while attempts remain; `allowPartial: true`
 *   resolves the partial as success instead.
 * - **Cancellation threads through.** The handler passes `execution.signal` into
 *   `registry.build`, so a queue `abort()` or a per-attempt timeout cancels the in-flight
 *   agent (which commits a partial → throws → retries / fails per policy).
 *
 * @param options - The `registry`, the `allowPartial` policy, and the substrate knobs
 *   (`concurrency` / `retries` / `timeout` / `store`) (see {@link AgentQueueOptions})
 * @returns A {@link QueueInterface} of {@link AgentJobInput} → {@link AgentResult}
 *
 * @example
 * ```ts
 * import { createAgentQueue, createAgentRegistry, createMemoryQueueStore } from '@src/core'
 *
 * const registry = createAgentRegistry({ providers: { main: provider } })
 * const store = createMemoryQueueStore(agentJobShape) // survives a restart via restore()
 * const queue = createAgentQueue({ registry, concurrency: 2, retries: 1, store })
 * const result = await queue.enqueue({ provider: 'main', messages: [{ role: 'user', content: 'ok?' }] })
 * ```
 */
export function createAgentQueue(
	options: AgentQueueOptions,
): QueueInterface<AgentJobInput, AgentResult> {
	const { registry, allowPartial = false, concurrency, retries, timeout, store } = options
	return createQueue<AgentJobInput, AgentResult>({
		concurrency,
		retries,
		timeout,
		store,
		handler: (input, execution) =>
			settleAgentJob(registry.build(input, execution.signal), allowPartial),
	})
}

/**
 * Create an agent-job runner — a {@link RunnerInterface} over serializable
 * {@link AgentJobInput}s that COMPOSES `createRunner` (one-shot, ordered, fail-fast), each
 * unit rehydrated through the `registry` and subjected to the partial policy. The runner
 * enables **sub-agent fan-out**: a parent job's handler can `controller.spawn(childJob)`.
 *
 * @remarks
 * - **Composes the substrate (no new engine).** Bounded `concurrency`, `retries`, the
 *   per-attempt `timeout`, ordered results, and fail-fast are all the backing Runner's;
 *   the handler adds only rehydration + the partial policy.
 * - **Sub-agent fan-out.** Each unit's handler receives a `ControllerInterface` whose
 *   `spawn(childJob)` launches a CHILD agent job through the same bounded queue (the
 *   child's result joins the run after the declared units, in spawn order). On a bounded
 *   runner, FAN OUT and return — do NOT inline-`await` a spawn from within the handler (a
 *   slot-holding handler awaiting its own spawn can deadlock; see `ControllerInterface`).
 * - **Partial policy + cancellation.** Same as `createAgentQueue`: a partial result
 *   THROWS by default (the run's fail-fast engages), `allowPartial: true` resolves it; the
 *   handler threads `controller.signal` into `registry.build`, so a runner abort / a
 *   per-attempt timeout cancels the agent.
 *
 * @param options - The `registry`, the `allowPartial` policy, and the substrate knobs
 *   (`concurrency` / `retries` / `timeout`) (see {@link AgentRunnerOptions})
 * @returns A {@link RunnerInterface} of {@link AgentJobInput} → {@link AgentResult}
 *
 * @example
 * ```ts
 * import { createAgentRunner, createAgentRegistry } from '@src/core'
 *
 * const registry = createAgentRegistry({ providers: { main: provider } })
 * const runner = createAgentRunner({ registry, concurrency: 2 })
 * // Run two jobs; the first fans out a child sub-agent then returns.
 * const child = { provider: 'main', messages: [{ role: 'user', content: 'child' }] }
 * const parent = { provider: 'main', messages: [{ role: 'user', content: 'parent' }] }
 * const results = await runner.execute([parent, child]) // declared first, then any spawns
 * ```
 */
export function createAgentRunner(
	options: AgentRunnerOptions,
): RunnerInterface<AgentJobInput, AgentResult> {
	const { registry, allowPartial = false, concurrency, retries, timeout } = options
	return createRunner<AgentJobInput, AgentResult>({
		concurrency,
		retries,
		timeout,
		handler: (controller) => {
			// Fan out this job's declared sub-agents FIRST (fire-and-track): spawn each child
			// through the same bounded queue and DON'T await it here — the runner awaits the
			// whole spawn closure via its count gate, and inline-awaiting a spawn from a
			// slot-holding handler on a bounded runner can deadlock (see ControllerInterface).
			const children = controller.input.children
			if (children !== undefined) for (const child of children) void controller.spawn(child)
			// Then run THIS (parent) job's agent and apply the partial policy.
			return settleAgentJob(registry.build(controller.input, controller.signal), allowPartial)
		},
	})
}

/**
 * Create a file — an immutable {@link FileInterface} from its `path` + {@link FileContent}
 * and optional {@link import('./types.js').FileState}, with `size` / `lines` DERIVED from the
 * content.
 *
 * @remarks
 * Returns a PLAIN `Object.freeze`d record (NOT a class instance) — the `path` IS its identity
 * (there is no `id`). Only `path` / `content` are required; `state` defaults to `'created'`
 * when omitted. `size` (via {@link computeSize}) and `lines` (via {@link countLines}) are
 * computed from the content here (so they never drift from it). Frozen + plain, so it
 * `structuredClone`s losslessly and is never mutated after creation.
 *
 * @param input - `path` / `content` (required) and an optional `state` (see {@link FileInput})
 * @returns A frozen {@link FileInterface} record
 *
 * @example
 * ```ts
 * import { createFile, createTextContent } from '@src/core'
 *
 * const file = createFile({ path: 'src/main.ts', content: createTextContent('const x = 1', 'typescript') })
 * file.lines // 1
 * ```
 */
export function createFile(input: FileInput): FileInterface {
	return Object.freeze({
		path: input.path,
		content: input.content,
		state: input.state ?? 'created',
		size: computeSize(input.content),
		lines: countLines(input.content),
	})
}

/**
 * Build the TEXT {@link FileContent} arm — the §4.2.3 split constructor for text (a separate
 * function per arm, not one constructor dispatching on a discriminator parameter).
 *
 * @param text - The literal text body
 * @param language - The fenced-code language the text renders as (e.g. `'typescript'`)
 * @returns A `{ text; language }` content arm
 *
 * @example
 * ```ts
 * import { createTextContent } from '@src/core'
 *
 * createTextContent('const x = 1', 'typescript') // { text: 'const x = 1', language: 'typescript' }
 * ```
 */
export function createTextContent(text: string, language: string): FileContent {
	return { text, language }
}

/**
 * Build the BINARY {@link FileContent} arm — the §4.2.3 split constructor for binary (a
 * separate function per arm, not one constructor dispatching on a discriminator parameter).
 * An image is just a binary with an image {@link BinaryMIME}.
 *
 * @param data - The base64-encoded binary payload
 * @param mime - The {@link BinaryMIME} that labels the payload
 * @returns A `{ data; mime }` content arm
 *
 * @example
 * ```ts
 * import { createBinaryContent } from '@src/core'
 *
 * createBinaryContent('<base64>', 'image/png') // { data: '<base64>', mime: 'image/png' }
 * ```
 */
export function createBinaryContent(data: string, mime: BinaryMIME): FileContent {
	return { data, mime }
}

/**
 * Create a workspace — a mutable, `path`-keyed working set of immutable
 * {@link FileInterface}s with the in-memory edit surface (read / write / search / replace /
 * move / remove), observable through its `EmitterInterface` (from `@orkestrel/emitter`).
 *
 * @param options - Optional initial {@link import('./types.js').WorkspaceEventMap} listeners (`on`) and the emitter's `error` handler (see {@link WorkspaceOptions})
 * @returns A working {@link WorkspaceInterface}
 *
 * @example
 * ```ts
 * import { createWorkspace } from '@src/core'
 *
 * const workspace = createWorkspace({ on: { write: (file) => console.log(file.path) } })
 * workspace.write('src/main.ts', 'const x = 1')
 * workspace.file('src/main.ts')?.state // 'created'
 * ```
 */
export function createWorkspace(options?: WorkspaceOptions): WorkspaceInterface {
	return new Workspace(options)
}

/**
 * Create the in-memory workspace store — a {@link WorkspaceStoreInterface} backed by a
 * process-lifetime `Map` of {@link import('./types.js').WorkspaceSnapshot}s keyed by workspace id,
 * the DEFAULT backing for the durable {@link WorkspaceManagerInterface.open} /
 * {@link WorkspaceManagerInterface.save} seam.
 *
 * @remarks
 * A plain `Map` (the snapshot is already pure JSON, so no encoding is needed for the memory tier),
 * the structural twin of the analogous `createMemoryWorkflowStore` in `@orkestrel/workflow`.
 * `get` / `set` / `delete` are async (the same shape a durable backend fits); UNLIKE a session
 * store there is NO idle-TTL / eviction — a persisted workspace lives until an explicit `delete`.
 * Its driver-pluggable twin is {@link createDatabaseWorkspaceStore} (the snapshot as one opaque
 * JSON column over a `databases` table) — for a DURABLE store pass it a JSON / SQLite / IndexedDB
 * driver, and it swaps in WITHOUT touching the manager or the workspace. Hydration stays a manager
 * concern: read a snapshot back and rebuild the live workspace through the constructor `seed`.
 *
 * @returns A memory-backed {@link WorkspaceStoreInterface}
 *
 * @example
 * ```ts
 * import { createMemoryWorkspaceStore, createWorkspaceManager } from '@src/core'
 *
 * const store = createMemoryWorkspaceStore()
 * const manager = createWorkspaceManager({ store })
 * const workspace = manager.add()
 * workspace.write('notes.txt', 'hello')
 * await manager.save(workspace.id)               // persist the workspace
 * ```
 */
export function createMemoryWorkspaceStore(): WorkspaceStoreInterface {
	return new MemoryWorkspaceStore()
}

/**
 * Create a {@link DatabaseWorkspaceStore} over any {@link DriverInterface} — the durable,
 * driver-pluggable backing for the workspace persistence seam, the opt-in twin of
 * {@link createMemoryWorkspaceStore}.
 *
 * @remarks
 * Builds a one-table database (`workspaces`, keyed by `id`) over the supplied driver, the snapshot
 * held as ONE OPAQUE JSON COLUMN — the column map is `{ id; snapshot }` where `snapshot` is a
 * `rawShape` (a JSON blob), exactly as
 * the analogous `createDatabaseWorkflowStore` in `@orkestrel/workflow` stores its snapshot. The
 * snapshot is already a COMPLETE, self-contained, pure-JSON payload, so storing it whole is lossless
 * AND keeps the row type FLAT (the column reads back as `unknown`, narrowed on `get` by
 * {@link import('./helpers.js').isWorkspaceSnapshot}). The `driver` DEFAULTS to
 * {@link createMemoryDriver}, so the store ALSO works in memory out of the box; pass a server
 * `createJSONDriver` / `createSQLiteDriver` (or a browser IndexedDB driver) for a persistent one —
 * the durability is the driver's job, the store engine is shared. It swaps in behind
 * {@link WorkspaceStoreInterface} WITHOUT touching the manager or the workspace.
 *
 * @param driver - The storage backend the snapshots persist to (defaults to {@link createMemoryDriver})
 * @returns A {@link WorkspaceStoreInterface} over the driver
 *
 * @example
 * ```ts
 * import { createDatabaseWorkspaceStore, createMemoryDriver, createWorkspaceManager } from '@src/core'
 *
 * const store = createDatabaseWorkspaceStore(createMemoryDriver()) // a durable driver swaps in here
 * const manager = createWorkspaceManager({ store })
 * const workspace = manager.add()
 * workspace.write('notes.txt', 'hello')
 * await manager.save(workspace.id)               // persist the workspace (one JSON column)
 * ```
 */
export function createDatabaseWorkspaceStore(
	driver: DriverInterface = createMemoryDriver(),
): WorkspaceStoreInterface {
	// The snapshot is stored as ONE OPAQUE JSON column (`rawShape`), so the row infers FLAT —
	// `{ id: string; snapshot: unknown }` = `WorkspaceSnapshotRow` — and the File-list snapshot
	// shape never forces a contract `Infer`.
	const columns = { id: stringShape(), snapshot: rawShape({}) }
	const database = createDatabase({ driver, tables: { workspaces: columns } })
	const table: TableInterface<WorkspaceSnapshotRow> = database.table('workspaces')
	return new DatabaseWorkspaceStore(table)
}

/**
 * Create a workspace registry — a {@link WorkspaceManagerInterface} holding
 * {@link WorkspaceInterface}s keyed by their `id` (in insertion order) WITH an active pointer:
 * the §9 store over the workspace layer plus the `active` / `switch` seam the context renders.
 *
 * @remarks
 * Starts empty; `add(input?)` mints a {@link WorkspaceInterface} (its `id` from the input or a
 * random UUID), flowing the manager's default `on` / `error` in unless the input overrides them,
 * and stores it (an already-present `id` overwrites — last write wins) — and AUTO-ACTIVATES the
 * FIRST one (a registry with workspaces always has one `active`); a later `add` leaves `active`
 * unchanged. `switch(id)` re-points `active` (an unknown `id` returns `undefined`, leaving
 * `active` unchanged — lenient, never throws); `workspace(id)` / `workspaces()` look up;
 * `remove` (one or a batch, §9.2) reports whether any was removed AND clears `active` if it was
 * the removed one; `clear` empties it and clears `active`. Event-free (each workspace owns its
 * own observable `emitter`).
 *
 * With the optional `store` ({@link WorkspaceStoreInterface}, e.g. `createMemoryWorkspaceStore` /
 * `createDatabaseWorkspaceStore`), `open(id)` HYDRATES a workspace on a registry miss (rebuilding it
 * through the constructor `seed` from the snapshot's `files`, then activating it) and `save(id)`
 * PERSISTS a registered workspace's `snapshot()`. Both are LENIENT without a store (open resolves
 * only registered ids, save is a no-op `false`).
 *
 * @param options - Optional default `on` / `error` for created workspaces + the durable `store`
 *   (see {@link WorkspaceManagerOptions})
 * @returns An empty {@link WorkspaceManagerInterface}
 *
 * @example
 * ```ts
 * import { createWorkspaceManager } from '@src/core'
 *
 * const workspaces = createWorkspaceManager()
 * const scratch = workspaces.add() // auto-activates — workspaces.active === scratch
 * scratch.write('notes.txt', 'hello')
 * ```
 */
export function createWorkspaceManager(
	options?: WorkspaceManagerOptions,
): WorkspaceManagerInterface {
	return new WorkspaceManager(options)
}
