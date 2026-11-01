import type {
	AgentContextInterface,
	AgentContextOptions,
	InstructionInput,
	InstructionInterface,
	InstructionManagerInterface,
	InstructionManagerOptions,
	MemoManagerInterface,
	MemoManagerOptions,
	ScopeInput,
	ScopeInterface,
	ScopeManagerInterface,
	ScopeManagerOptions,
	SkillManagerInterface,
	SkillManagerOptions,
} from './types.js'
import { Instruction } from './instructions/Instruction.js'
import { InstructionManager } from './instructions/InstructionManager.js'
import { MemoManager } from './memos/MemoManager.js'
import { Scope } from './scopes/Scope.js'
import { ScopeManager } from './scopes/ScopeManager.js'
import { SkillManager } from './skills/SkillManager.js'
import { AgentContext } from './AgentContext.js'

/**
 * Creates an instruction — an immutable {@link InstructionInterface} (a named directive)
 * from its `name` / `content` and optional `priority`, the `id` minted at construction.
 *
 * @remarks
 * Only `name` / `content` are required; `priority` orders the instruction in the
 * rendered list of an {@link InstructionManagerInterface} (higher first). Default: `0`.
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
export function createInstruction(input: InstructionInput): InstructionInterface {
	return new Instruction(input)
}

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
export function createInstructionManager(
	options?: InstructionManagerOptions,
): InstructionManagerInterface {
	return new InstructionManager(options)
}

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
export function createScope(input: ScopeInput): ScopeInterface {
	return new Scope(input)
}

/**
 * Creates a scope registry — a {@link ScopeManagerInterface} holding immutable scopes keyed
 * by their minted `id`, in insertion order.
 *
 * @remarks
 * Starts empty; `add` mints each scope's `id` and stores it (keyed by `id`, so it
 * never overwrites — two scopes may share a `name`); `scopes()` lists them in insertion order;
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
 * const reader = scopes.add({ name: 'reader', tools: ['search'] })
 * ```
 */
export function createScopeManager(options?: ScopeManagerOptions): ScopeManagerInterface {
	return new ScopeManager(options)
}

/**
 * Creates a memo set — a {@link MemoManagerInterface} holding durable facts keyed by `name`, where
 * a same-name `add` with changed text appends a revision and the earlier ones stay readable.
 *
 * @remarks
 * Starts empty unless a `snapshot` restores revisions, silently. `id` names the set: the
 * `snapshot.id`, else the `id` option, else a minted UUID. Re-adding unchanged text is a no-op that
 * emits nothing; `remove` forgets a memo and its whole history. An optional `format` override is
 * the manager-options level of the build cascade, beating the built-in `'## Memos'` header and the
 * `- name: description` index line.
 *
 * @param options - Optional `id`, `on` hooks, `error` handler, `format` override, and `snapshot`
 *   (see {@link MemoManagerOptions})
 * @returns A {@link MemoManagerInterface}
 *
 * @example
 * ```ts
 * import { createMemoManager } from '@orkestrel/agent'
 *
 * const memos = createMemoManager({ id: 'ada' })
 * const tone = memos.add({ name: 'tone', description: 'Prefers short replies.', content: 'Answer briefly.' })
 * memos.render(tone) // '- tone: Prefers short replies.'
 * ```
 */
export function createMemoManager(options?: MemoManagerOptions): MemoManagerInterface {
	return new MemoManager(options)
}

/**
 * Creates a skill registry — a {@link SkillManagerInterface} holding the skills a host supplies,
 * keyed by `name` and listed in insertion order.
 *
 * @remarks
 * Starts empty; `add` (one or a batch) mints each `id` and each file through `createFile`, and
 * overwrites a same-name skill (last write wins, position kept). An optional `format` override is
 * the manager-options level of the build cascade, beating the built-in `'## Skills'` header and the
 * `- name: description` index line.
 *
 * @param options - Optional `on` hooks, `error` handler, and `format` override (see
 *   {@link SkillManagerOptions})
 * @returns An empty {@link SkillManagerInterface}
 *
 * @example
 * ```ts
 * import { createSkillManager } from '@orkestrel/agent'
 *
 * const skills = createSkillManager()
 * const review = skills.add({ name: 'review', description: 'Reviews a change.', content: 'Read the diff.' })
 * skills.render(review) // '- review: Reviews a change.'
 * ```
 */
export function createSkillManager(options?: SkillManagerOptions): SkillManagerInterface {
	return new SkillManager(options)
}

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
 * through `context.apply(...)`). `conversations` is the message source: a supplied manager's
 * active conversation is reused as `messages`, and a default conversation is added only when it
 * has none (a fresh registry with one default conversation is created when omitted). `build()`
 * folds the scoped instructions — plus the active workspace's scope-filtered text files (fenced) —
 * into one leading `system` message and appends the active conversation's `view()` (attaching the
 * active workspace's scope-filtered image files' `base64` payload to the last user message), built
 * fresh each call; the scope never filters the conversation. The active workspace is the sole
 * document/image context. Tools are advertised structurally (through
 * `tools.definitions()`, scope-filtered by the loop), never serialized into the prompt.
 *
 * @param options - Optional `system` / `tools` / `instructions` / `workspaces` /
 *   `conversations` / `scope` / `select` (see {@link AgentContextOptions})
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
export function createAgentContext(options?: AgentContextOptions): AgentContextInterface {
	return new AgentContext(options)
}
