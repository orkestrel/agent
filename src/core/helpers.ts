import type {
	AgentInterface,
	AgentJobInput,
	AgentRegistryInterface,
	AgentResult,
	ConversationSnapshot,
	MessageInterface,
	SectionInterface,
} from './types.js'
import type { TokenUsage } from '@orkestrel/budget'
import type { QueueExecution } from '@orkestrel/queue'
import type { ControllerInterface } from '@orkestrel/workflow'
import { isArray, isRecord, isString } from '@orkestrel/contract'
import { isToolCall } from '@orkestrel/tool'
import { IMAGE_TOKEN_ESTIMATE, MESSAGE_TOKEN_OVERHEAD } from './constants.js'
import { AgentJobError } from './errors.js'

/**
 * Filter a list of items by a {@link import('./types.js').ScopeInterface} allow-list of
 * keys — the pure, total set-membership primitive the context's build step and the agent
 * loop's tool-advertise step apply a scope through.
 *
 * @remarks
 * Three-way by the allow-list's shape, so a `Scope` category cleanly expresses "all /
 * none / only these":
 * - `undefined` ⇒ NO constraint — every item passes (returned unchanged).
 * - `[]` (empty) ⇒ NONE pass (no key is in an empty set).
 * - a non-empty list ⇒ only items whose `key(item)` is in the list pass.
 *
 * Order-preserving (it filters `items` in place order, never reorders) and total — never
 * throws. Keys are matched by a `Set` for O(1) membership, so a large list is cheap.
 *
 * @typeParam T - The item type being filtered
 * @param allow - The allow-list of keys (`undefined` ⇒ all, `[]` ⇒ none, else only-listed)
 * @param items - The items to filter (returned unchanged when `allow` is `undefined`)
 * @param key - Extracts the key an item is matched on (e.g. an instruction's `name`)
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
export function filterAllowList<T>(
	allow: readonly string[] | undefined,
	items: readonly T[],
	key: (item: T) => string,
): readonly T[] {
	if (allow === undefined) return items
	if (allow.length === 0) return []
	const set = new Set(allow)
	return items.filter((item) => set.has(key(item)))
}

/**
 * Estimate the context-token footprint of a string — the deterministic char-based heuristic
 * {@link estimateMessages} sums over a conversation's messages (the default context-budget
 * estimator).
 *
 * @remarks
 * Approximates `ceil(length / 4)` (≈ four characters per token — the rough average for
 * English text), so the same input always yields the same estimate (no model round-trip).
 * Empty text is `0`. This is a planning heuristic for reasoning about how much a turn's
 * messages cost the next request, NOT an exact tokenizer count — it never calls a provider,
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
export function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4)
}

/**
 * Estimate the context-token footprint of a batch of messages — the default `consume`
 * estimator for an agent's context `BudgetInterface` (a budgets surface's tracking contract)
 * (the {@link import('./types.js').AgentOptions} `window`).
 *
 * @remarks
 * Sums, per message, {@link estimateTokens} over its `content` (the `ceil(length / 4)` char
 * heuristic) PLUS {@link import('./constants.js').MESSAGE_TOKEN_OVERHEAD} (a fixed per-message
 * role/framing overhead) PLUS, when present, {@link estimateTokens} over its JSON-stringified
 * `calls` PLUS `images.length * `{@link import('./constants.js').IMAGE_TOKEN_ESTIMATE} (a coarse,
 * deliberately-approximate per-image cost — a base64 length is NOT a token proxy). Deterministic
 * and provider-free — the same messages always yield the same estimate, with an empty batch `0`.
 * It is the fully-swappable default an agent's auto-compaction context budget charges each
 * turn's new messages through; a caller wanting a sharper count supplies its own `consume` to
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
export function estimateMessages(messages: readonly MessageInterface[]): number {
	return messages.reduce((sum, message) => {
		const content = estimateTokens(message.content) + MESSAGE_TOKEN_OVERHEAD
		let calls = 0
		if (message.calls?.length) {
			// `JSON.stringify` over `ToolCall.arguments` can throw (a circular reference) even
			// though this function promises never to throw — so the serialization is wrapped; a
			// throw falls back to a conservative fixed contribution (the same per-message overhead
			// scale) instead of an unreachable serialized-length estimate. The happy path (no
			// throw) is byte-identical to the bare estimate below.
			try {
				calls = estimateTokens(JSON.stringify(message.calls))
			} catch {
				calls = MESSAGE_TOKEN_OVERHEAD
			}
		}
		const images = (message.images?.length ?? 0) * IMAGE_TOKEN_ESTIMATE
		return sum + content + calls + images
	}, 0)
}

/**
 * Run one rehydrated agent and apply the partial-as-configurable-failure policy — the
 * shared job-handler step BOTH `createAgentQueue` and `createAgentRunner` settle each job
 * through, so the policy can never diverge between them.
 *
 * @remarks
 * A turn that committed PARTIAL (a cancel — abort / budget / timeout) is by default a
 * FAILURE, so it THROWS an {@link import('./errors.js').AgentJobError} carrying the partial
 * (the Queue's retries + a Runner's fail-fast then engage); with `allowPartial` it RESOLVES
 * the partial as success instead. A natural finish ALWAYS resolves with its result.
 *
 * @param agent - The rehydrated {@link AgentInterface} to run to its {@link AgentResult}
 * @param allowPartial - When `true`, a partial result resolves as success; when `false`
 *   (the default policy), a partial result throws an {@link AgentJobError}
 * @returns The agent's {@link AgentResult} (a natural finish, or a partial when `allowPartial`)
 * @throws {AgentJobError} When the run ended `partial` and `allowPartial` is `false`
 *
 * @example
 * ```ts
 * const result = await settleAgentJob(registry.build(input, signal), false)
 * ```
 */
export async function settleAgentJob(
	agent: AgentInterface,
	allowPartial: boolean,
): Promise<AgentResult> {
	const result = await agent.generate()
	if (result.partial && !allowPartial) throw new AgentJobError('agent job ended partial', result)
	return result
}

/**
 * Handle one queued agent job by rehydrating it through a registry with the queue
 * attempt's signal, then applying the shared partial-result policy.
 *
 * @param registry - The registry that rehydrates the serializable job
 * @param allowPartial - Whether a partial result resolves instead of throwing
 * @param input - The serializable agent job
 * @param execution - The queue attempt whose signal bounds the agent
 * @returns The settled agent result
 */
export function handleAgentQueueJob(
	registry: AgentRegistryInterface,
	allowPartial: boolean,
	input: AgentJobInput,
	execution: QueueExecution,
): Promise<AgentResult> {
	return settleAgentJob(registry.build(input, execution.signal), allowPartial)
}

/**
 * Handle one runner agent job by fanning out its declared children, rehydrating the
 * parent through a registry with the controller signal, and applying the shared
 * partial-result policy.
 *
 * @remarks
 * Children are fired and tracked through the runner controller without awaiting them
 * inline, preserving bounded-runner progress.
 *
 * @param registry - The registry that rehydrates serializable jobs
 * @param allowPartial - Whether a partial result resolves instead of throwing
 * @param controller - The runner controller for this parent job
 * @returns The settled parent agent result
 */
export function handleAgentRunnerJob(
	registry: AgentRegistryInterface,
	allowPartial: boolean,
	controller: ControllerInterface<AgentJobInput, AgentResult>,
): Promise<AgentResult> {
	const children = controller.input.children
	if (children !== undefined) for (const child of children) void controller.spawn(child)
	return settleAgentJob(registry.build(controller.input, controller.signal), allowPartial)
}

/**
 * Whether an `unknown` is structurally a {@link MessageInterface} record — the per-message step of
 * the {@link isConversationSnapshot} read-boundary narrow (AGENTS §14: narrow an untrusted storage
 * read via a guard, never an `as`). The conversation analogue of
 * {@link import('@orkestrel/workspace').isFile}.
 *
 * @remarks
 * A total guard (it NEVER throws — adversarial input returns `false`). It checks the message's
 * SHAPE: a record with a `string` `id`, a `string` `role`, a `string` `content`, and — WHEN present
 * — a `calls` array EVERY element of which is a valid
 * {@link import('@orkestrel/tool').ToolCall} ({@link isToolCall} — the
 * ASI06 fail-closed deepening: a tampered `calls` element rejects the message, so the snapshot
 * reads back as absent rather than replaying a malformed call) and an `images` that is an array
 * (an absent optional passes). The `role` is left as a broad `string` here (an open
 * {@link import('./types.js').MessageRole}, so any storage-read role string is accepted
 * defensively rather than rejected against the current literal set). Enough to safely impose the
 * {@link MessageInterface} type at
 * a storage boundary WITHOUT a cast.
 *
 * @param value - The value to test (one element of a snapshot's `messages` / a section's `messages`)
 * @returns `true` when `value` has the structural shape of a {@link MessageInterface}
 *
 * @example
 * ```ts
 * isMessage({ id: '1', role: 'user', content: 'hi' }) // true
 * isMessage({ id: '1', role: 'assistant', content: '', calls: [] }) // true
 * isMessage({ id: '1', role: 'user' }) // false (missing content)
 * isMessage({ id: '1', role: 'assistant', content: '', calls: [null] }) // false (malformed call)
 * ```
 */
export function isMessage(value: unknown): value is MessageInterface {
	if (!isRecord(value)) return false
	if (!isString(value.id) || !isString(value.role) || !isString(value.content)) return false
	if (value.calls !== undefined && !(isArray(value.calls) && value.calls.every(isToolCall))) {
		return false
	}
	return value.images === undefined || isArray(value.images)
}

/**
 * Whether an `unknown` is structurally a {@link SectionInterface} record — the per-section step of
 * the {@link isConversationSnapshot} read-boundary narrow (AGENTS §14: narrow an untrusted storage
 * read via a guard, never an `as`).
 *
 * @remarks
 * A total guard (it NEVER throws — adversarial input returns `false`). It checks the section's
 * SHAPE: a record with a `string` `id`, a `string` `summary`, and a `messages` array EVERY element
 * of which is a valid {@link MessageInterface} record ({@link isMessage}). Enough to safely impose
 * the {@link SectionInterface} type at a storage boundary WITHOUT a cast.
 *
 * @param value - The value to test (one element of a snapshot's `sections` array)
 * @returns `true` when `value` has the structural shape of a {@link SectionInterface}
 *
 * @example
 * ```ts
 * isSection({ id: 's', summary: 'recap', messages: [{ id: '1', role: 'user', content: 'hi' }] }) // true
 * isSection({ id: 's', summary: 'recap', messages: 'nope' }) // false
 * isSection({ id: 's', messages: [] }) // false (missing summary)
 * ```
 */
export function isSection(value: unknown): value is SectionInterface {
	if (!isRecord(value)) return false
	if (!isString(value.id) || !isString(value.summary)) return false
	return isArray(value.messages) && value.messages.every(isMessage)
}

/**
 * Narrow an `unknown` to a {@link ConversationSnapshot} — the AGENTS §14 boundary guard for an
 * UNTRUSTED snapshot read (a storage row a
 * {@link import('./conversations/stores/DatabaseConversationStore.js').DatabaseConversationStore}
 * reads back from its opaque JSON column, a snapshot loaded from disk). The EXACT analogue of
 * {@link import('@orkestrel/workspace').isWorkspaceSnapshot}.
 *
 * @remarks
 * A total guard (it NEVER throws — adversarial input returns `false`). It checks the snapshot's
 * SHAPE: a `string` `id`, an OPTIONAL `string` `summary` (present-or-absent — the rollup is
 * `undefined` until the first compaction), a `sections` array EVERY element of which is a valid
 * {@link SectionInterface} ({@link isSection}), and a `messages` array EVERY element of which is a
 * valid {@link MessageInterface} ({@link isMessage}) — enough to safely impose the
 * {@link ConversationSnapshot} type at a storage boundary WITHOUT a cast. The structural twin of
 * {@link import('@orkestrel/workspace').isWorkspaceSnapshot}. A malformed blob (a non-record, a missing / non-string `id`, a
 * non-string `summary` when present, a non-array `sections` / `messages`, or any malformed
 * element) resolves `false`, so a
 * {@link import('./conversations/stores/DatabaseConversationStore.js').DatabaseConversationStore}
 * read yields `undefined` rather than a broken conversation.
 *
 * @param value - The value to test (an opaque storage read)
 * @returns `true` when `value` has the structural shape of a {@link ConversationSnapshot}
 *
 * @example
 * ```ts
 * isConversationSnapshot({ id: 'c1', sections: [], messages: [] }) // true
 * isConversationSnapshot({ id: 'c1', summary: 'recap', sections: [], messages: [] }) // true
 * isConversationSnapshot({ id: 'c1', sections: 'nope', messages: [] }) // false
 * isConversationSnapshot({ sections: [], messages: [] }) // false (missing id)
 * ```
 */
export function isConversationSnapshot(value: unknown): value is ConversationSnapshot {
	if (!isRecord(value)) return false
	if (!isString(value.id)) return false
	if (value.summary !== undefined && !isString(value.summary)) return false
	if (!isArray(value.sections) || !value.sections.every(isSection)) return false
	return isArray(value.messages) && value.messages.every(isMessage)
}

/**
 * Render a path-addressed text body as a fenced reference block — the framing an
 * {@link import('./AgentContext.js').AgentContext}'s ACTIVE-workspace text-file render emits (the
 * active workspace is the SOLE document/image context).
 *
 * @remarks
 * Produces `` File: <path>\n```<language>\n<content>\n``` `` — the `File:` label line, then a
 * fenced code block tagged with `language`, the `content` verbatim inside. Pure string assembly,
 * total — never throws. The one fenced-file format string for the whole module — `AgentContext.build()`
 * frames an active workspace's text files with it (each carries its own `language` on its
 * {@link import('@orkestrel/workspace').FileContent} text arm).
 *
 * @param path - The file path shown on the `File:` label line
 * @param language - The fenced-code language tag (e.g. `'typescript'`)
 * @param content - The file body rendered verbatim inside the fence
 * @returns The fenced reference block
 *
 * @example
 * ```ts
 * import { fencedFile } from '@src/core'
 *
 * fencedFile('src/main.ts', 'typescript', 'const x = 1')
 * // 'File: src/main.ts\n```typescript\nconst x = 1\n```'
 * ```
 */
export function fencedFile(path: string, language: string, content: string): string {
	return `File: ${path}\n\`\`\`${language}\n${content}\n\`\`\``
}

/**
 * Sanitize one reported token count into a safe non-negative integer.
 *
 * @param value - The token count to sanitize
 * @returns The floored count, or `0` when the value is non-finite or non-positive
 */
export function sanitizeToken(value: number): number {
	return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

/**
 * Sanitize a {@link TokenUsage} into safe, non-negative integers — the guard an agent's
 * abort-usage path applies to a provider's partial usage before it is charged against a
 * budget or folded into the run total.
 *
 * @remarks
 * Per field (`prompt` / `completion` / `total`): a non-finite value (`NaN`, `+Infinity`,
 * `-Infinity`) or a negative value floors to `0`; a fractional value floors to its
 * non-negative integer part. No upper cap is applied. Total — never throws.
 *
 * @param usage - The token usage to sanitize (e.g. a provider's abort-partial usage)
 * @returns A new {@link TokenUsage} with every field a safe non-negative integer
 *
 * @example
 * ```ts
 * sanitizeUsage({ prompt: -5, completion: NaN, total: 12.7 }) // { prompt: 0, completion: 0, total: 12 }
 * ```
 */
export function sanitizeUsage(usage: TokenUsage): TokenUsage {
	return {
		prompt: sanitizeToken(usage.prompt),
		completion: sanitizeToken(usage.completion),
		total: sanitizeToken(usage.total),
	}
}
