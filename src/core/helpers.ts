import type {
	AgentInterface,
	AgentJobInput,
	AgentRegistryInterface,
	AgentResult,
	ContextSectionFormat,
	ContextSectionSourceInterface,
	Message,
	RunOutcome,
	Section,
} from './types.js'
import type { TokenUsage } from '@orkestrel/budget'
import type { JSONValue } from '@orkestrel/contract'
import type { QueueContext } from '@orkestrel/queue'
import type { ToolCall, ToolResult } from '@orkestrel/tool'
import type { ControllerInterface } from '@orkestrel/workflow'
import type { FileInterface } from '@orkestrel/workspace'
import {
	attempt,
	isBoolean,
	isFiniteNumber,
	isObject,
	isString,
	parseJSONValue,
} from '@orkestrel/contract'
import { isBinary } from '@orkestrel/workspace'
import {
	CONVERSATION_RECAP_PREFIX,
	IMAGE_TOKEN_ESTIMATE,
	MESSAGE_TOKEN_OVERHEAD,
} from './constants.js'
import { AgentJobError } from './errors.js'

/**
 * Projects an unknown value onto the canonical JSON representation of an
 * {@link AgentResult}.
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
export function agentResultToJSON(value: unknown): JSONValue | undefined {
	const captured = attempt(() => {
		if (!isObject(value)) return undefined

		const content = Reflect.get(value, 'content')
		const thinking = Reflect.get(value, 'thinking')
		const usage = Reflect.get(value, 'usage')
		const partial = Reflect.get(value, 'partial')
		if (!isString(content) || !isBoolean(partial)) return undefined
		if (thinking !== undefined && !isString(thinking)) return undefined

		let projectedUsage: TokenUsage | undefined
		if (usage !== undefined) {
			if (!isObject(usage)) return undefined
			const prompt = Reflect.get(usage, 'prompt')
			const completion = Reflect.get(usage, 'completion')
			const total = Reflect.get(usage, 'total')
			if (!isFiniteNumber(prompt) || !isFiniteNumber(completion) || !isFiniteNumber(total)) {
				return undefined
			}
			projectedUsage = { prompt, completion, total }
		}

		return {
			content,
			...(thinking === undefined ? {} : { thinking }),
			...(projectedUsage === undefined ? {} : { usage: projectedUsage }),
			partial,
		}
	})

	return captured.success ? parseJSONValue(captured.value) : undefined
}

/**
 * Filters a list of items by a {@link import('./types.js').ScopeInterface} allow-list of
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
 * Estimates the context-token footprint of a string — the deterministic char-based heuristic
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
 * Estimates the context-token footprint of a batch of messages — the default `consumer`
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
export function estimateMessages(messages: readonly Message[]): number {
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
 * Runs one rehydrated agent and applies the partial-as-configurable-failure policy — the
 * shared job-handler step BOTH `createAgentQueue` and `createAgentRunner` settle each job
 * through, so the policy can never diverge between them.
 *
 * @remarks
 * A turn that committed PARTIAL (a cancel — abort / budget / timeout) is by default a
 * FAILURE, so it THROWS an {@link import('./errors.js').AgentJobError} carrying the partial
 * (the Queue's retries + a Runner's fail-fast then engage); the `partial` policy RESOLVES
 * it as success instead. A natural finish ALWAYS resolves with its result.
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
export async function settleAgentJob(
	agent: AgentInterface,
	partial: boolean,
): Promise<AgentResult> {
	const result = await agent.generate()
	if (result.partial && !partial) throw new AgentJobError('agent job ended partial', result)
	return result
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
export function handleAgentQueueJob(
	registry: AgentRegistryInterface,
	partial: boolean,
	input: AgentJobInput,
	context: QueueContext,
): Promise<AgentResult> {
	return settleAgentJob(registry.build(input, context.signal), partial)
}

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
export function handleAgentRunnerJob(
	registry: AgentRegistryInterface,
	partial: boolean,
	controller: ControllerInterface<AgentJobInput, AgentResult>,
): Promise<AgentResult> {
	const children = controller.input.children
	if (children !== undefined) for (const child of children) void controller.spawn(child)
	return settleAgentJob(registry.build(controller.input, controller.signal), partial)
}

/**
 * Renders a path-addressed text body as a fenced reference block — the framing an
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
export function renderFencedFile(path: string, language: string, content: string): string {
	return `File: ${path}\n\`\`\`${language}\n${content}\n\`\`\``
}

/**
 * Sanitizes one reported token count into a safe non-negative integer.
 *
 * @param value - The token count to sanitize
 * @returns The floored count, or `0` when the value is non-finite or non-positive
 */
export function sanitizeToken(value: number): number {
	return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

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
export function sanitizeUsage(usage: TokenUsage): TokenUsage {
	return {
		prompt: sanitizeToken(usage.prompt),
		completion: sanitizeToken(usage.completion),
		total: sanitizeToken(usage.total),
	}
}

/**
 * Joins the reasoning a run's provider calls separated from the answer — the first call
 * seeds the accumulation, a later call appends blank-line separated so each turn's reasoning
 * stays readable.
 *
 * @remarks
 * Pure and total. `running` is `undefined` until a call surfaces reasoning, so the first join
 * returns `next` verbatim (no leading separator). The result is display/audit metadata that
 * never re-enters the conversation.
 *
 * @param running - The reasoning accumulated so far (`undefined` before the first)
 * @param next - This call's separated reasoning
 * @returns The joined reasoning
 *
 * @example
 * ```ts
 * joinThinking(undefined, 'first') // 'first'
 * joinThinking('first', 'second') // 'first\n\nsecond'
 * ```
 */
export function joinThinking(running: string | undefined, next: string): string {
	return running === undefined ? next : `${running}\n\n${next}`
}

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
export function sumUsage(running: TokenUsage | undefined, next: TokenUsage): TokenUsage {
	if (running === undefined) return next
	return {
		prompt: running.prompt + next.prompt,
		completion: running.completion + next.completion,
		total: running.total + next.total,
	}
}

/**
 * Assembles the settled {@link AgentResult} from a run's {@link RunOutcome} — `thinking` and
 * `usage` are carried only when the run surfaced them.
 *
 * @remarks
 * Pure and total. An absent optional is OMITTED rather than stored as `undefined` (the
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
export function assembleResult(outcome: RunOutcome): AgentResult {
	const result: { content: string; thinking?: string; usage?: TokenUsage; partial: boolean } = {
		content: outcome.content,
		partial: outcome.partial,
	}
	if (outcome.thinking !== undefined) result.thinking = outcome.thinking
	if (outcome.usage !== undefined) result.usage = outcome.usage
	return result
}

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
export function denyCall(call: ToolCall, reason: string | undefined): ToolResult {
	return {
		success: false,
		id: call.id,
		name: call.name,
		error: reason !== undefined ? `denied: ${reason}` : 'denied by authority',
	}
}

/**
 * Renders one context section — the resolved `open`, each item's rendering, and the resolved
 * `close` when one exists, blank-line joined.
 *
 * @remarks
 * Pure and total. A section with NO items renders nothing (`undefined`), so an empty or fully
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
export function renderSection<T>(
	open: string,
	items: readonly T[],
	render: (item: T) => string,
	close: string | undefined,
): string | undefined {
	if (items.length === 0) return undefined
	const lines = [open, ...items.map(render)]
	if (close !== undefined) lines.push(close)
	return lines.join('\n\n')
}

/**
 * Resolves one section's OPEN text through the format cascade — manager-options override >
 * provider default > built-in header.
 *
 * @remarks
 * Pure and total. The leading text has NO per-item level. A manager's `open` already
 * encapsulates `[options-override → built-in]`, so it is reached only when neither the
 * override's `open` nor the provider's `open` applies — and there it IS the built-in header.
 *
 * @typeParam T - The section item the manager renders
 * @param manager - The section source (its `format` override + its built-in `open`)
 * @param provider - The provider-default framing for this section, or `undefined`
 * @returns The section's leading text
 *
 * @example
 * ```ts
 * resolveOpen(instructions, undefined) // '## Instructions' (the built-in header)
 * resolveOpen(instructions, { open: '<rules>' }) // '<rules>' (the provider default)
 * ```
 */
export function resolveOpen<T>(
	manager: ContextSectionSourceInterface<T>,
	provider: ContextSectionFormat<T> | undefined,
): string {
	return manager.format?.open ?? provider?.open ?? manager.open
}

/**
 * Resolves one section's CLOSE text through the format cascade — manager-options override >
 * provider default.
 *
 * @remarks
 * Pure and total. There is NO built-in close, so a section with neither level set returns
 * `undefined` and {@link renderSection} appends no closing line. Paired with
 * {@link resolveOpen}, one level can WRAP the whole group.
 *
 * @typeParam T - The section item the manager renders
 * @param manager - The section source (its `format` override)
 * @param provider - The provider-default framing for this section, or `undefined`
 * @returns The section's trailing text, or `undefined` when no level sets one
 *
 * @example
 * ```ts
 * resolveClose(instructions, undefined) // undefined (no built-in close)
 * resolveClose(instructions, { close: '</rules>' }) // '</rules>'
 * ```
 */
export function resolveClose<T>(
	manager: ContextSectionSourceInterface<T>,
	provider: ContextSectionFormat<T> | undefined,
): string | undefined {
	return manager.format?.close ?? provider?.close
}

/**
 * Resolves ONE item's rendering through the format cascade — item override >
 * manager-options override > provider default > built-in rendering.
 *
 * @remarks
 * Pure and total. The item's own `override` is the most-specific level (a fully-rendered
 * string for that item alone). A manager's `render(item)` already encapsulates
 * `[options-override → built-in]`, so it is reached only when no higher level applies — and
 * there it IS the built-in rendering.
 *
 * @typeParam T - The section item being rendered (it may carry its own `override`)
 * @param manager - The section source (its `format` override + its built-in `render`)
 * @param provider - The provider-default framing for this section, or `undefined`
 * @param item - The item to render
 * @returns The item's prompt text
 *
 * @example
 * ```ts
 * resolveItem(instructions, undefined, terse) // 'Be terse.' (the built-in rendering)
 * resolveItem(instructions, { render: (one) => `<rule>${one.content}</rule>` }, terse)
 * // '<rule>Be terse.</rule>'
 * ```
 */
export function resolveItem<T extends { readonly override?: string }>(
	manager: ContextSectionSourceInterface<T>,
	provider: ContextSectionFormat<T> | undefined,
	item: T,
): string {
	return (
		item.override ??
		manager.format?.render?.(item) ??
		provider?.render?.(item) ??
		manager.render(item)
	)
}

/**
 * Copies a message with image data merged onto its `images` — the message's own images
 * first, then the attached data.
 *
 * @remarks
 * Pure and total: the original message is NEVER mutated. `calls` is carried only when the
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
export function attachImages(message: Message, data: readonly string[]): Message {
	const images = [...(message.images ?? []), ...data]
	return message.calls === undefined
		? { id: message.id, role: message.role, content: message.content, images }
		: {
				id: message.id,
				role: message.role,
				content: message.content,
				calls: message.calls,
				images,
			}
}

/**
 * Attaches image data to a conversation's LAST user message — the turn a vision provider
 * reads images off.
 *
 * @remarks
 * Pure and total: the conversation and its messages are NEVER mutated, and the returned array
 * replaces exactly the one target message with the copy {@link attachImages} builds. Empty
 * data returns the conversation unchanged; a conversation with NO user message returns it
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
export function attachUserImages(
	conversation: readonly Message[],
	data: readonly string[],
): readonly Message[] {
	if (data.length === 0) return conversation
	let target = -1
	for (let index = conversation.length - 1; index >= 0; index -= 1) {
		if (conversation[index]?.role === 'user') {
			target = index
			break
		}
	}
	if (target === -1) return conversation
	return conversation.map((message, index) =>
		index === target ? attachImages(message, data) : message,
	)
}

/**
 * Collects the `base64` payload of the IMAGE files in a workspace file list — the data an
 * agent context attaches to the last user message.
 *
 * @remarks
 * Pure and total. `isBinary` NARROWS the tagless content to its binary arm (a total guard,
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
export function collectImageData(files: readonly FileInterface[]): readonly string[] {
	const data: string[] = []
	for (const file of files) {
		if (isBinary(file.content) && file.content.mime.startsWith('image/')) {
			data.push(file.content.base64)
		}
	}
	return data
}

/**
 * Builds the RAW synthetic summary message for one compacted section — role `'assistant'`,
 * the section's stable `id`, its `summary` VERBATIM as content.
 *
 * @remarks
 * Pure and total. This is the unframed form the rollup regeneration digests (a
 * summary-of-summaries over the section summaries); the recap LABEL is a `view()`
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
export function buildSummaryMessage(section: Section): Message {
	return { id: section.id, role: 'assistant', content: section.summary }
}

/**
 * Builds the FRAMED recap message for one compacted section — the same role and stable `id`
 * as {@link buildSummaryMessage}, with the content prefixed by
 * {@link import('./constants.js').CONVERSATION_RECAP_PREFIX}.
 *
 * @remarks
 * Pure and total. The prefix is what makes a small model read the message as a CONDENSED
 * RECAP of earlier turns rather than a literal assistant turn to echo or answer from. It is a
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
export function buildRecapMessage(section: Section): Message {
	return {
		id: section.id,
		role: 'assistant',
		content: `${CONVERSATION_RECAP_PREFIX}${section.summary}`,
	}
}

/**
 * Intersects two scope category lists under the "`undefined` is the universal set" rule — the
 * primitive a scope narrows through.
 *
 * @remarks
 * Pure and total, and it can only TIGHTEN: `undefined` ∩ `undefined` is `undefined` (still no
 * constraint); `undefined` ∩ a list is a COPY of that list (the `undefined` side imposes
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
export function intersectKeys(
	parent: readonly string[] | undefined,
	child: readonly string[] | undefined,
): readonly string[] | undefined {
	if (parent === undefined) return child === undefined ? undefined : [...child]
	if (child === undefined) return [...parent]
	const allowed = new Set(parent)
	return child.filter((key) => allowed.has(key))
}
