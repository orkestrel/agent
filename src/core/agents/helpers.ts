import type { Message } from '../types.js'
import type { ProviderRequest } from '../providers/index.js'
import type {
	AgentInterface,
	AgentJobInput,
	AgentRegistryInterface,
	AgentResult,
	AgentRunResult,
	AgentStop,
	AgentTurn,
	MessageMeasure,
	RequestMeasure,
} from './types.js'
import type { BudgetInterface, TokenUsage } from '@orkestrel/budget'
import type { JSONValue } from '@orkestrel/contract'
import type { QueueContext, QueueOptions } from '@orkestrel/queue'
import type { ToolCall, ToolResult } from '@orkestrel/tool'
import { isBudget, isBudgetError } from '@orkestrel/budget'
import {
	attempt,
	ContractError,
	isBoolean,
	isFiniteNumber,
	isObject,
	isString,
	parseJSONValue,
	preview,
} from '@orkestrel/contract'
import { IMAGE_TOKEN_ESTIMATE, MESSAGE_TOKEN_OVERHEAD } from './constants.js'
import { AgentError, AgentJobError } from './errors.js'
import { hasCalls, renderJSON } from '../helpers.js'
import { isNonNegativeSafeInteger } from '../validators.js'

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
 * not normalized. The result is exact `{ content, thinking?, usage?, partial, stop? }`. A present
 * `stop` is read once, then its `layer`, `id`, `max`, `consumed`, `estimate`, and `usage` once each
 * in that order, `max` and `consumed` only on a `meter` or `budget` arm; the arm is rebuilt
 * exactly, omitting absent readings, and a malformed `stop` refuses the whole value. Extra input
 * properties are dropped while a fresh exact plain object is rebuilt and deep-gated through
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
		const stop = Reflect.get(value, 'stop')
		if (!isString(content) || !isBoolean(partial)) return undefined
		if (thinking !== undefined && !isString(thinking)) return undefined
		const projectedUsage = usage === undefined ? undefined : tokenUsageToJSON(usage)
		if (usage !== undefined && projectedUsage === undefined) return undefined
		if (stop !== undefined && !isObject(stop)) return undefined

		const layer = isObject(stop) ? Reflect.get(stop, 'layer') : undefined
		const id = isObject(stop) ? Reflect.get(stop, 'id') : undefined
		const ranked = layer === 'meter' || layer === 'budget'
		const max = isObject(stop) && ranked ? Reflect.get(stop, 'max') : undefined
		const consumed = isObject(stop) && ranked ? Reflect.get(stop, 'consumed') : undefined
		const estimate = isObject(stop) ? Reflect.get(stop, 'estimate') : undefined
		const spent = isObject(stop) ? Reflect.get(stop, 'usage') : undefined
		const projectedSpent = spent === undefined ? undefined : tokenUsageToJSON(spent)
		const readings = {
			...(isFiniteNumber(estimate) ? { estimate } : {}),
			...(projectedSpent === undefined ? {} : { usage: projectedSpent }),
		}
		const projectedStop =
			!isString(id) ||
			(estimate !== undefined && !isFiniteNumber(estimate)) ||
			(spent !== undefined && projectedSpent === undefined)
				? undefined
				: ranked && isFiniteNumber(max) && isFiniteNumber(consumed)
					? { layer, id, max, consumed, ...readings }
					: layer === 'model'
						? { layer, id, ...readings }
						: undefined
		if (stop !== undefined && projectedStop === undefined) return undefined

		return {
			content,
			...(thinking === undefined ? {} : { thinking }),
			...(projectedUsage === undefined ? {} : { usage: projectedUsage }),
			partial,
			...(projectedStop === undefined ? {} : { stop: projectedStop }),
		}
	})

	return captured.success ? parseJSONValue(captured.value) : undefined
}

/**
 * Projects an unknown value onto a fresh, exact `TokenUsage` — capturing `prompt`, `completion`, and
 * `total` once each through a total boundary, preserving finite negative and fractional counts,
 * dropping extras, and resolving `undefined` for a non-object, a missing or non-finite count, a
 * throwing getter, or a hostile or revoked proxy.
 *
 * @remarks
 * The capture runs inside Contract's sanctioned exception boundary, so conforming accessors and
 * inherited properties are read while a throwing getter or a revoked proxy returns `undefined`.
 * Counts are not normalized. A caller that treats an absent usage as valid checks for `undefined`
 * before it projects, because this function refuses `undefined` like any other non-object.
 *
 * @param value - The unknown value to project
 * @returns A fresh `{ prompt, completion, total }`, or `undefined` when the value is not a finite usage triple
 *
 * @example
 * ```ts
 * import { tokenUsageToJSON } from '@orkestrel/agent'
 *
 * tokenUsageToJSON({ prompt: 2, completion: -1, total: 1.5, cached: 4 }) // { prompt: 2, completion: -1, total: 1.5 }
 * tokenUsageToJSON({ prompt: 2, completion: Infinity, total: 3 }) // undefined
 * ```
 */
export function tokenUsageToJSON(value: unknown): TokenUsage | undefined {
	const captured = attempt(() => {
		if (!isObject(value)) return undefined
		const prompt = Reflect.get(value, 'prompt')
		const completion = Reflect.get(value, 'completion')
		const total = Reflect.get(value, 'total')
		return isFiniteNumber(prompt) && isFiniteNumber(completion) && isFiniteNumber(total)
			? { prompt, completion, total }
			: undefined
	})
	return captured.success ? captured.value : undefined
}

/**
 * Infers which of a run's three failure layers stopped it — the meter allowance, a cost budget, or
 * the model's own token limit — and returns the stop record with the final call's readings, or
 * `undefined` when no layer stopped the run.
 *
 * @remarks
 * The layer that stopped the final provider call first wins. A model-truncated final answer whose
 * call returned unaborted is a `model` stop, even when that call's reconciled usage then exhausted a
 * budget or a cancel then landed before the run settled. Otherwise a `BudgetError` reason is a
 * `meter` stop when the allowance is exhausted, the reason is the allowance signal's own reason, its
 * context carries the allowance's `id` and `max`, and either the allowance is a separate instance or
 * the run had aborted when the call returned; any other `BudgetError` is a `budget` stop. The
 * identity test tells an allowance and a budget that share an `id` apart, and the readings test
 * tells a parent budget linked through the allowance's `signal` option apart from the allowance. An
 * external cancel, a deadline, or an `abort()` reason yields `undefined`. Two inputs still read as
 * the meter's: a charge a caller makes to the run's shared allowance from its own code while a call
 * streams, and a parent with the allowance's own `id` and `max` that aborted before `start()` when
 * the allowance then exhausts.
 *
 * @param reason - The run signal's abort reason (`undefined` while it is unaborted)
 * @param allowance - The run's meter allowance, or `undefined` for a run with no meter layer
 * @param budget - The run's cost budget, or `undefined` for an unbudgeted run
 * @param provider - The provider's trace `id`, named by a `model` stop
 * @param turn - The run's final turn record, or `undefined` when the run took no turn
 * @returns The stop record, or `undefined` when no layer stopped the run
 *
 * @example
 * ```ts
 * const allowance = createTokenBudget({ id: 'meter', max: 2 })
 * allowance.start()
 * allowance.consume({ prompt: 0, completion: 3, total: 3 })
 * inferStop(allowance.signal.reason, allowance, undefined, 'ollama', undefined)
 * // { layer: 'meter', id: 'meter', max: 2, consumed: 3 }
 * ```
 */
export function inferStop(
	reason: unknown,
	allowance: BudgetInterface<TokenUsage> | undefined,
	budget: BudgetInterface<TokenUsage> | undefined,
	provider: string,
	turn: AgentTurn | undefined,
): AgentStop | undefined {
	const readings = {
		...(turn?.estimate === undefined ? {} : { estimate: turn.estimate }),
		...(turn?.usage === undefined ? {} : { usage: turn.usage }),
	}
	const interrupted = turn?.interrupted === true
	if (!interrupted && turn?.truncated === true) return { layer: 'model', id: provider, ...readings }
	if (!isBudgetError(reason)) return undefined
	const metered =
		allowance !== undefined &&
		allowance.exhausted &&
		reason === allowance.signal.reason &&
		reason.context.id === allowance.id &&
		reason.context.max === allowance.max &&
		(allowance !== budget || interrupted)
	return {
		layer: metered ? 'meter' : 'budget',
		id: reason.context.id,
		max: reason.context.max,
		consumed: reason.context.consumed,
		...readings,
	}
}

/**
 * Estimates the context-token footprint of a string — the deterministic `ceil(length / 4)`
 * character heuristic {@link estimateMessages} sums over a conversation's messages (the default
 * context-budget estimator).
 *
 * @remarks
 * Approximates `ceil(length / 4)` (4 characters per token), so the same input always yields the same estimate (no model round-trip).
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
 * {@link import('./constants.js').MESSAGE_TOKEN_OVERHEAD}, a tool-call JSON estimate, a thinking estimate, and
 * {@link import('./constants.js').IMAGE_TOKEN_ESTIMATE} for each attached image. The {@link estimateRequest} message term
 * for an agent's context budget (the
 * {@link import('./types.js').AgentOptions} `window`), a provider-independent approximation for conforming messages rather than an exact tokenizer count.
 *
 * @remarks
 * Sums, per message, {@link estimateTokens} over its `content` (the `ceil(length / 4)` character
 * heuristic) plus {@link import('./constants.js').MESSAGE_TOKEN_OVERHEAD} (a fixed per-message
 * role/framing overhead) plus, when present, {@link estimateTokens} over its JSON-stringified
 * `calls` plus, when present, {@link estimateTokens} over its `thinking` plus `images.length * `{@link import('./constants.js').IMAGE_TOKEN_ESTIMATE} (a coarse,
 * deliberately-approximate per-image cost — a base64 length is not a token proxy). Deterministic
 * and provider-free — the same messages always yield the same estimate, with an empty batch `0`.
 * It is the message term of the request estimate an agent's auto-compaction context budget
 * measures; a caller wanting a sharper count supplies its own `consumer` to `createBudget`
 * instead. A `calls` list JSON cannot carry (a circular or `BigInt`
 * `ToolCall.arguments`) contributes a fixed
 * {@link import('./constants.js').MESSAGE_TOKEN_OVERHEAD} (the same per-message overhead scale)
 * instead of an estimate of the (unreachable) serialized length.
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
		const measure = measureMessage(message)
		return (
			sum + measure.content + measure.framing + measure.calls + measure.thinking + measure.images
		)
	}, 0)
}

/**
 * Measures the disjoint estimate components of one message — its content, framing, rendered calls,
 * thinking, and attached images — as the same heuristic units {@link estimateMessages} sums.
 *
 * @remarks
 * The result is a structural estimate, not a tokenizer allocation. `id` and `role` are joins back to
 * the message, not token components, and a provider's template effects and the estimation error are
 * not individually attributed. `content` is `ceil(length / 4)`, `framing` is
 * {@link import('./constants.js').MESSAGE_TOKEN_OVERHEAD}, `calls` is the estimate of the JSON-rendered
 * calls (`0` when the message carries none, the framing overhead when they cannot be rendered),
 * `thinking` is the estimate of the thinking (`0` when absent), and `images` is the attached image
 * count times {@link import('./constants.js').IMAGE_TOKEN_ESTIMATE}. The message is not mutated.
 *
 * @param message - The message to measure
 * @returns The message's identity and its estimate components
 *
 * @example
 * ```ts
 * measureMessage({ id: '1', role: 'user', content: 'hello' })
 * // { id: '1', role: 'user', content: 2, framing: 4, calls: 0, thinking: 0, images: 0 }
 * ```
 */
export function measureMessage(message: Message): MessageMeasure {
	const rendered = hasCalls(message) ? renderJSON(message.calls) : ''
	const calls = rendered === undefined ? MESSAGE_TOKEN_OVERHEAD : estimateTokens(rendered)
	return {
		id: message.id,
		role: message.role,
		content: estimateTokens(message.content),
		framing: MESSAGE_TOKEN_OVERHEAD,
		calls,
		thinking: message.thinking === undefined ? 0 : estimateTokens(message.thinking),
		images: (message.images?.length ?? 0) * IMAGE_TOKEN_ESTIMATE,
	}
}

/**
 * Estimates the context-token footprint of a complete provider request — its messages through
 * {@link estimateMessages}, plus the rendered advertised `tools`, plus the rendered
 * `options.schema`. The `consumer` estimator an agent's `window` budget measures every request
 * through, a provider-independent heuristic rather than an exact tokenizer count.
 *
 * @remarks
 * Adds {@link estimateTokens} over the JSON rendering of `tools` and of `options.schema` to the
 * message estimate. An absent or empty `tools` list and an absent or empty `schema` add `0`, so a
 * request that advertises neither equals {@link estimateMessages} of its messages. A value JSON
 * cannot carry contributes a fixed {@link import('./constants.js').MESSAGE_TOKEN_OVERHEAD}. The
 * estimate counts JSON characters, not a provider's template: the chat template's own tokens, how
 * a provider encodes tool definitions, and the `think` flag are not counted, and no tokenizer
 * runs. A model's real prompt count can exceed it, so choose the window `max` with headroom
 * measured against the provider.
 *
 * @param request - The {@link ProviderRequest} to estimate: messages, advertised tools, call options
 * @returns The estimated token count (`0` for an empty request)
 *
 * @example
 * ```ts
 * estimateRequest({ messages: [{ id: '1', role: 'user', content: 'hello' }] }) // 6, equal to estimateMessages
 * ```
 */
export function estimateRequest(request: ProviderRequest): number {
	const measure = measureRequest(request)
	return measure.messages.reduce(
		(sum, message) =>
			sum + message.content + message.framing + message.calls + message.thinking + message.images,
		measure.tools + measure.schema,
	)
}

/**
 * Measures the disjoint estimate components of a complete provider request — each message through
 * {@link measureMessage}, plus the rendered advertised `tools` and `options.schema` — as the same
 * heuristic units {@link estimateRequest} sums.
 *
 * @remarks
 * The result is a structural estimate, not a tokenizer allocation; a provider's template effects, how
 * it encodes tool definitions, the `think` flag, and the estimation error are not individually
 * attributed. `messages` keeps the request's message order, duplicate ids included. `tools` and
 * `schema` are each `0` when absent or empty and the estimate of their JSON rendering otherwise, or
 * the {@link import('./constants.js').MESSAGE_TOKEN_OVERHEAD} when JSON cannot carry them. The request
 * is not mutated.
 *
 * @param request - The {@link ProviderRequest} to measure: messages, advertised tools, call options
 * @returns The per-message components and the tools and schema estimates
 *
 * @example
 * ```ts
 * measureRequest({ messages: [{ id: '1', role: 'user', content: 'hello' }] })
 * // { messages: [{ id: '1', role: 'user', content: 2, framing: 4, calls: 0, thinking: 0, images: 0 }], tools: 0, schema: 0 }
 * ```
 */
export function measureRequest(request: ProviderRequest): RequestMeasure {
	const tools = request.tools !== undefined && request.tools.length > 0 ? request.tools : undefined
	const schema = request.options?.schema
	const [toolsEstimate = 0, schemaEstimate = 0] = [
		tools,
		schema !== undefined && Object.keys(schema).length > 0 ? schema : undefined,
	].map((part) => {
		if (part === undefined) return 0
		const rendered = renderJSON(part)
		return rendered === undefined ? MESSAGE_TOKEN_OVERHEAD : estimateTokens(rendered)
	})
	return {
		messages: request.messages.map((message) => measureMessage(message)),
		tools: toolsEstimate,
		schema: schemaEstimate,
	}
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
 *
 * @example
 * ```ts
 * const result = await handleAgentQueueJob(registry, false, input, context)
 * ```
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
 * Assembles the settled {@link AgentResult} from a run's {@link AgentRunResult} — `thinking`,
 * `usage`, and `stop` are carried only when the run surfaced them, and the loop-internal
 * `exhausted` flag is left out.
 *
 * @remarks
 * Pure and total. An absent optional is omitted rather than stored as `undefined` (the
 * present-when-given convention the message store follows), so a settled result JSON
 * round-trips without an explicit `undefined` field. The keys follow `content`, `partial`,
 * `thinking`, `usage`, then `stop`. `exhausted` is loop bookkeeping and does not reach the public
 * result — the `exhaust` event carries it instead.
 *
 * @param outcome - The run's settled outcome
 * @returns The public {@link AgentResult}
 *
 * @example
 * ```ts
 * assembleResult({ content: 'hi', thinking: undefined, usage: undefined, partial: false, exhausted: false, stop: undefined })
 * // { content: 'hi', partial: false }
 * ```
 */
export function assembleResult(outcome: AgentRunResult): AgentResult {
	return {
		content: outcome.content,
		partial: outcome.partial,
		...(outcome.thinking === undefined ? {} : { thinking: outcome.thinking }),
		...(outcome.usage === undefined ? {} : { usage: outcome.usage }),
		...(outcome.stop === undefined ? {} : { stop: outcome.stop }),
	}
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
 * draw is never less than the report and nothing is charged twice.
 *
 * @remarks
 * The full `prompt` count is consumed because no earlier charge covers it. Each of `completion`
 * and `total` is consumed less `charged`, floored at 0. An estimate above the report is not
 * refunded. The usage must already be sanitized: a
 * non-finite field yields a non-finite charge, which the installed `Budget` refuses by throwing
 * a `range` `ContractError`. Without a budget the call consumes nothing.
 *
 * @param budget - The budget to consume against, or `undefined` for an unmetered run
 * @param usage - The sanitized usage the provider reported
 * @param charged - The completion tokens already consumed this turn
 *
 * @example
 * ```ts
 * const budget = createBudget<TokenUsage>({ max: 1000, consumer: (usage) => usage.total })
 * chargeUsage(budget, { prompt: 20, completion: 30, total: 50 }, 10)
 * budget.consumed // 40
 * ```
 */
export function chargeUsage(
	budget: BudgetInterface<TokenUsage> | undefined,
	usage: TokenUsage,
	charged: number,
): void {
	budget?.consume({
		prompt: usage.prompt,
		completion: Math.max(0, usage.completion - charged),
		total: Math.max(0, usage.total - charged),
	})
}

/**
 * Returns a tool-iteration cap after checking it is a nonnegative safe integer, or throws a coded
 * error.
 *
 * @remarks
 * The check is {@link import('../validators.js').isNonNegativeSafeInteger}, so `0` and `-0`
 * pass while `NaN`, a fraction, a negative, and either infinity are refused. The error's `context`
 * carries the refused value as `limit`.
 *
 * @param limit - The tool-iteration cap to check
 * @returns The cap unchanged
 * @throws {AgentError} Thrown when `limit` is not a nonnegative safe integer (code `'LIMIT'`)
 *
 * @example
 * ```ts
 * requireLimit(3) // 3
 * requireLimit(1.5) // throws AgentError ('LIMIT')
 * ```
 */
export function requireLimit(limit: number): number {
	if (!isNonNegativeSafeInteger(limit)) {
		throw new AgentError('LIMIT', 'a limit must be a nonnegative safe integer', {
			context: { limit },
		})
	}
	return limit
}

/**
 * Returns a run's budget or allowance after checking it implements `BudgetInterface`, or throws a
 * coded error before the run starts it.
 *
 * @remarks
 * The check is `isBudget` from `@orkestrel/budget`, a total guard. `undefined` passes, because an
 * absent bound is no bound. The error's `context` carries the option path, the limit
 * `'BudgetInterface'`, and a preview of the refused value.
 *
 * @param value - The effective `budget` or `allowance`, or `undefined`
 * @param key - The option the value came from, named in the error's path
 * @returns The value unchanged
 * @throws {ContractError} Thrown when `value` is defined and does not implement `BudgetInterface` (code `'placement'`)
 *
 * @example
 * ```ts
 * requireBudget(createTokenBudget({ max: 10 }), 'budget') // the budget
 * requireBudget({ consume() {} }, 'allowance') // throws ContractError ('placement')
 * ```
 */
export function requireBudget(
	value: BudgetInterface<TokenUsage> | undefined,
	key: 'budget' | 'allowance',
): BudgetInterface<TokenUsage> | undefined {
	if (value === undefined || isBudget(value)) return value
	throw new ContractError(`Agent: ${key} must implement BudgetInterface`, {
		code: 'placement',
		context: { path: ['options', key], limit: 'BudgetInterface', received: preview(value) },
	})
}

/**
 * Renders a tool's output as the string content of its tool message.
 *
 * @remarks
 * A string passes through unchanged and `undefined` renders as `''`. Any other value renders as
 * its `JSON.stringify` text, byte for byte, when JSON can carry it. A value JSON cannot carry (a
 * `BigInt`, a cycle, a symbol, a throwing `toJSON`) renders as `String(value)`, and as `''` when
 * that conversion throws too, so a tool's output never rejects the run that dispatched it.
 *
 * @param value - The tool's output (`ToolSuccess.value`, which may be `undefined`)
 * @returns The message content
 *
 * @example
 * ```ts
 * renderToolValue('sunny') // 'sunny'
 * renderToolValue({ count: 2 }) // '{"count":2}'
 * renderToolValue(undefined) // ''
 * renderToolValue(10n) // '10'
 * ```
 */
export function renderToolValue(value: unknown): string {
	if (typeof value === 'string') return value
	if (value === undefined) return ''
	const rendered = renderJSON(value)
	if (rendered !== undefined) return rendered
	const fallback = attempt(() => String(value))
	return fallback.success ? fallback.value : ''
}

/**
 * Returns a registered value or throws when its name is absent.
 * @param pool - The named values
 * @param category - The registry category named in an error
 * @param name - The requested key
 * @returns The registered value
 * @throws {AgentError} Thrown when the name is absent, with code REGISTRY and a `context` naming the `category` and the `name`.
 * @example
 * ```ts
 * requireEntry(new Map([['main', provider]]), 'provider', 'main') // provider
 * ```
 */
export function requireEntry<T>(pool: ReadonlyMap<string, T>, category: string, name: string): T {
	const value = pool.get(name)
	if (value === undefined) {
		throw new AgentError('REGISTRY', `unknown ${category}: ${name}`, {
			context: { category, name },
		})
	}
	return value
}

/**
 * Extracts the present concurrency, retry, and deadline options for an agent job queue.
 * @param options - The queue options to project
 * @returns The present queue options, omitting absent keys
 * @example
 * ```ts
 * extractQueueOptions({ concurrency: 2 }) // { concurrency: 2 }
 * ```
 */
export function extractQueueOptions(
	options: Pick<QueueOptions<AgentJobInput, AgentResult>, 'concurrency' | 'retries' | 'timeout'>,
): Pick<QueueOptions<AgentJobInput, AgentResult>, 'concurrency' | 'retries' | 'timeout'> {
	const { concurrency, retries, timeout } = options
	return {
		...(concurrency === undefined ? {} : { concurrency }),
		...(retries === undefined ? {} : { retries }),
		...(timeout === undefined ? {} : { timeout }),
	}
}
