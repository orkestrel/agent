import type { Message } from '../types.js'
import type {
	AgentInterface,
	AgentJobInput,
	AgentRegistryInterface,
	AgentResult,
	RunOutcome,
} from './types.js'
import type { BudgetInterface, TokenUsage } from '@orkestrel/budget'
import type { JSONValue } from '@orkestrel/contract'
import type { QueueContext } from '@orkestrel/queue'
import type { ToolCall, ToolResult } from '@orkestrel/tool'
import type { ControllerInterface } from '@orkestrel/workflow'
import {
	attempt,
	isBoolean,
	isFiniteNumber,
	isObject,
	isString,
	parseJSONValue,
} from '@orkestrel/contract'
import { IMAGE_TOKEN_ESTIMATE, MESSAGE_TOKEN_OVERHEAD } from './constants.js'
import { AgentJobError } from './errors.js'

/**
 * Projects an unknown value onto a fresh, exact `JSONValue` representation of an
 * {@link AgentResult} — capturing each structural field once through a total boundary,
 * accepting conforming accessors and inherited properties, preserving finite negative and
 * fractional usage counts, dropping extras, and resolving `undefined` for a malformed field, a
 * non-finite usage number, a throwing getter, or a hostile or revoked proxy.
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
 * Estimates the context-token footprint of a string — the deterministic `ceil(length / 4)`
 * character heuristic {@link estimateMessages} sums over a conversation's messages (the default
 * context-budget estimator).
 *
 * @remarks
 * Approximates `ceil(length / 4)` (≈ four characters per token — the rough average for
 * English text), so the same input always yields the same estimate (no model round-trip).
 * Empty text is `0`. This is a planning heuristic for reasoning about how much a turn's
 * messages cost the next request, not an exact tokenizer count — it never calls a provider,
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
 * Estimates the context-token footprint of a batch of messages — each message's content plus
 * {@link import('./constants.js').MESSAGE_TOKEN_OVERHEAD}, a tool-call JSON estimate, and
 * {@link import('./constants.js').IMAGE_TOKEN_ESTIMATE} for each attached image. The default
 * `consumer` estimator for an agent's context budget (the
 * {@link import('./types.js').AgentOptions} `window`), total and never throwing, and a
 * deliberate provider-agnostic approximation rather than an exact tokenizer count.
 *
 * @remarks
 * Sums, per message, {@link estimateTokens} over its `content` (the `ceil(length / 4)` char
 * heuristic) plus {@link import('./constants.js').MESSAGE_TOKEN_OVERHEAD} (a fixed per-message
 * role/framing overhead) plus, when present, {@link estimateTokens} over its JSON-stringified
 * `calls` plus `images.length * `{@link import('./constants.js').IMAGE_TOKEN_ESTIMATE} (a coarse,
 * deliberately-approximate per-image cost — a base64 length is not a token proxy). Deterministic
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
			// scale) instead of an unreachable serialized-length estimate.
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
 * Runs one rehydrated agent and applies the partial-as-configurable-failure policy — a partial
 * run throws an {@link import('./errors.js').AgentJobError} unless the `partial` policy allows
 * it, and a natural finish resolves. The shared job-handler step `createAgentQueue` and
 * `createAgentRunner` both settle each job through, so the policy can never diverge between
 * them.
 *
 * @remarks
 * A turn that committed partial (a cancel — abort / budget / timeout) is by default a
 * failure, so it throws an {@link import('./errors.js').AgentJobError} carrying the partial
 * (the Queue's retries + a Runner's fail-fast then engage); the `partial` policy resolves
 * it as success instead. A natural finish always resolves with its result.
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
 * Assembles the settled {@link AgentResult} from a run's {@link RunOutcome} — `thinking` and
 * `usage` are carried only when the run surfaced them, and the loop-internal `exhausted` flag is
 * left out.
 *
 * @remarks
 * Pure and total. An absent optional is omitted rather than stored as `undefined` (the
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
 * Consumes a reported usage against a budget over what was already charged, so a turn's total
 * draw matches the report and nothing is charged twice.
 *
 * @remarks
 * The full `prompt` count is consumed because no earlier charge covers it. Each of `completion`
 * and `total` is consumed less `charged`, floored at 0. The usage must already be sanitized;
 * a `NaN` field would poison the budget. Without a budget the call consumes nothing and still
 * returns the new charged total.
 *
 * @param budget - The budget to consume against, or `undefined` for an unmetered run
 * @param usage - The sanitized usage the provider reported
 * @param charged - The completion tokens already consumed this turn
 * @returns The completion tokens charged after the call, never below `charged`
 *
 * @example
 * ```ts
 * const budget = createBudget<TokenUsage>({ max: 1000, consumer: (usage) => usage.total })
 * chargeUsage(budget, { prompt: 20, completion: 30, total: 50 }, 10) // 30
 * ```
 */
export function chargeUsage(
	budget: BudgetInterface<TokenUsage> | undefined,
	usage: TokenUsage,
	charged: number,
): number {
	budget?.consume({
		prompt: usage.prompt,
		completion: Math.max(0, usage.completion - charged),
		total: Math.max(0, usage.total - charged),
	})
	return Math.max(charged, usage.completion)
}
