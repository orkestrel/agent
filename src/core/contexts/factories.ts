import type {
	AgentContextInterface,
	AgentContextOptions,
	InstructionInput,
	InstructionInterface,
	InstructionManagerInterface,
	InstructionManagerOptions,
	ScopeInput,
	ScopeInterface,
	ScopeManagerInterface,
	ScopeManagerOptions,
} from './types.js'
import { Instruction } from './instructions/Instruction.js'
import { InstructionManager } from './instructions/InstructionManager.js'
import { Scope } from './scopes/Scope.js'
import { ScopeManager } from './scopes/ScopeManager.js'
import { AgentContext } from './AgentContext.js'

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
export function createScopeManager(options?: ScopeManagerOptions): ScopeManagerInterface {
	return new ScopeManager(options)
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
export function createAgentContext(options?: AgentContextOptions): AgentContextInterface {
	return new AgentContext(options)
}
