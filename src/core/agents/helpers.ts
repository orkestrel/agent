import type { Message } from '../types.js'
import type { ProviderRequest } from '../providers/index.js'
import type { ConversationInterface } from '../conversations/index.js'
import type {
	AgentContextInterface,
	AgentDisclosure,
	ScopeFilter,
	ScopeInterface,
	Skill,
} from '../contexts/index.js'
import type {
	AgentBuiltin,
	AgentChunk,
	AgentFrame,
	AgentInterface,
	AgentJobInput,
	AgentOptions,
	AgentRegistryInterface,
	AgentResult,
	AgentRunResult,
	AgentStop,
	AgentStreamInterface,
	AgentTurn,
	ApproverInterface,
	AuthorityDecision,
	AuthorityOptions,
	AuthorityRule,
	MessageMeasure,
	RequestMeasure,
} from './types.js'
import type { BudgetInterface, TokenUsage } from '@orkestrel/budget'
import type { AuditFault, JSONValue } from '@orkestrel/contract'
import type { QueueContext, QueueOptions } from '@orkestrel/queue'
import type { ToolCall, ToolDefinition, ToolManagerInterface, ToolResult } from '@orkestrel/tool'
import { isBudget, isBudgetAmount, isBudgetError } from '@orkestrel/budget'
import {
	admitValue,
	describeFaults,
	attempt,
	canonicalStringify,
	ContractError,
	createContract,
	isArray,
	isBoolean,
	isFiniteNumber,
	isObject,
	isString,
	objectOf,
	parseJSON,
	parseJSONValue,
	preview,
	schemaToParameters,
	schemaToShape,
} from '@orkestrel/contract'
import {
	AUTHORITY_NOTES,
	BUILTIN_LIMITS,
	BUILTIN_NOTES,
	BUILTIN_TOOLS,
	ARGUMENT_BLANK_PATTERN,
	ARGUMENT_CONTROL_PATTERN,
	DEFAULT_AGENT_LIMIT,
	IMAGE_TOKEN_ESTIMATE,
	JOB_REFUSAL_PREFIX,
	MESSAGE_TOKEN_OVERHEAD,
} from './constants.js'
import { agentDisclosureContract, agentJobContract, builtinToolContracts } from './contracts.js'
import { AgentError, AgentJobError } from './errors.js'
import { isConversation } from '../conversations/index.js'
import { isScope } from '../contexts/index.js'
import { isAgentBuiltin, isAuthorityDecision, isAuthorityVerdict } from './validators.js'
import {
	collectToolGroups,
	estimateTokens,
	filterAllowList,
	findToolCall,
	hasCalls,
	renderJSON,
} from '../helpers.js'
import { isPositiveSafeInteger } from '../validators.js'

/**
 * Projects an unknown value onto a fresh, exact `JSONValue` representation of an
 * {@link AgentResult} — capturing each structural field once through a total boundary,
 * accepting conforming accessors and inherited properties, preserving fractional usage counts,
 * dropping extras, and resolving `undefined` for a malformed field, a negative or non-finite usage
 * number, a throwing getter, or a malformed or revoked proxy.
 *
 * @remarks
 * This is a total projection that reads untrusted input. Each structural field is captured once
 * through Contract's sanctioned exception boundary, so conforming accessors and inherited
 * properties are supported while a throwing getter or revoked proxy returns `undefined`.
 * Present usage counts must be finite and nonnegative; fractional values are preserved, not
 * normalized. The result is exact `{ content, thinking?, usage?, partial, stop? }`. A present
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
		const measured = {
			...(isFiniteNumber(estimate) ? { estimate } : {}),
			...(projectedSpent === undefined ? {} : { usage: projectedSpent }),
		}
		const projectedStop =
			!isString(id) ||
			(estimate !== undefined && !isFiniteNumber(estimate)) ||
			(spent !== undefined && projectedSpent === undefined)
				? undefined
				: ranked && isFiniteNumber(max) && isFiniteNumber(consumed)
					? { layer, id, max, consumed, ...measured }
					: layer === 'model'
						? { layer, id, ...measured }
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
 * `total` once each through a total boundary, preserving fractional counts, dropping extras, and
 * resolving `undefined` for a non-object, a missing, negative, or non-finite count, a throwing getter,
 * or a malformed or revoked proxy.
 *
 * @remarks
 * The capture runs inside Contract's sanctioned exception boundary, so conforming accessors and
 * inherited properties are read while a throwing getter or a revoked proxy returns `undefined`.
 * Counts are not normalized. A caller that treats an absent usage as valid checks for `undefined`
 * before it projects, because this function refuses `undefined` like any other non-object.
 *
 * @param value - The unknown value to project
 * @returns A fresh `{ prompt, completion, total }`, or `undefined` when the value is not a finite nonnegative usage triple
 *
 * @example
 * ```ts
 * import { tokenUsageToJSON } from '@orkestrel/agent'
 *
 * tokenUsageToJSON({ prompt: 2, completion: 1, total: 1.5, cached: 4 }) // { prompt: 2, completion: 1, total: 1.5 }
 * tokenUsageToJSON({ prompt: 2, completion: -1, total: 1 }) // undefined
 * tokenUsageToJSON({ prompt: 2, completion: Infinity, total: 3 }) // undefined
 * ```
 */
export function tokenUsageToJSON(value: unknown): TokenUsage | undefined {
	const captured = attempt(() => {
		if (!isObject(value)) return undefined
		const prompt = Reflect.get(value, 'prompt')
		const completion = Reflect.get(value, 'completion')
		const total = Reflect.get(value, 'total')
		return isBudgetAmount(prompt) && isBudgetAmount(completion) && isBudgetAmount(total)
			? { prompt, completion, total }
			: undefined
	})
	return captured.success ? captured.value : undefined
}

/**
 * Projects one {@link AgentChunk} onto the {@link AgentFrame} a page receives, member by member, or
 * returns `undefined` for an `ask` chunk.
 *
 * @remarks
 * A `tool` chunk projects to `{ category: 'tool', success: true, name }` only when its result
 * succeeded, and to `{ category: 'tool', success: false }` otherwise, so neither the tool's value nor
 * a denial's text crosses. An `ask` chunk returns `undefined`, because only the approver holding the
 * ask knows its id: read its frame through the `frame` method of an {@link ApproverInterface}.
 *
 * @param chunk - The chunk the run yielded
 * @returns The chunk's frame, or `undefined` for an `ask` chunk
 *
 * @example
 * ```ts
 * agentChunkToFrame({ category: 'token', content: 'Hi' }) // { category: 'token', content: 'Hi' }
 * ```
 */
export function agentChunkToFrame(chunk: AgentChunk): AgentFrame | undefined {
	switch (chunk.category) {
		case 'token':
			return { category: 'token', content: chunk.content }
		case 'think':
			return { category: 'think', content: chunk.content }
		case 'tool':
			return chunk.result.success === true
				? { category: 'tool', success: true, name: chunk.call.name }
				: { category: 'tool', success: false }
		case 'usage':
			return {
				category: 'usage',
				usage: {
					prompt: chunk.usage.prompt,
					completion: chunk.usage.completion,
					total: chunk.usage.total,
				},
				estimate: chunk.estimate,
			}
		case 'ask':
			return undefined
	}
}

/**
 * Projects a settled {@link AgentResult} onto the terminal `finish` frame a page receives.
 *
 * @remarks
 * Keeps `content`, `partial`, `usage` when present, and the stop's `layer` when a layer stopped the
 * run; drops `thinking` and every other stop member.
 *
 * @param result - The run's settled result
 * @returns A fresh `finish` frame
 *
 * @example
 * ```ts
 * agentResultToFrame({ content: 'Done.', partial: false }) // { category: 'finish', content: 'Done.', partial: false }
 * ```
 */
export function agentResultToFrame(
	result: AgentResult,
): Extract<AgentFrame, { readonly category: 'finish' }> {
	return {
		category: 'finish',
		content: result.content,
		partial: result.partial,
		...(result.usage === undefined
			? {}
			: {
					usage: {
						prompt: result.usage.prompt,
						completion: result.usage.completion,
						total: result.usage.total,
					},
				}),
		...(result.stop === undefined ? {} : { layer: result.stop.layer }),
	}
}

/**
 * Projects a run's live handle onto the frames a page receives — one frame per projected chunk, in
 * order, then exactly one terminal `finish` or `error`, last.
 *
 * @remarks
 * Reads `events` and `result` once each. An `ask` chunk crosses as the frame `approver` holds for
 * its call, and every other chunk through {@link agentChunkToFrame}; after the drain ends, the
 * settled result crosses through {@link agentResultToFrame}, and any throw ends the frames with a
 * bare `{ category: 'error' }`. It never calls `abort` itself, and drained to the end it yields
 * exactly one terminal frame, last. A consumer's `return()` while it waits at a chunk's frame
 * closes the drain of `events`, whose `return()` aborts the run, and no terminal frame is yielded.
 * When the run aborts while an ask waits and the reader pulls the `ask` chunk afterwards, the
 * approver holds no waiting ask, marks the call, and frames nothing, so no `ask` frame crosses and
 * the frames end `finish` with `partial: true`.
 *
 * @param stream - The run's live handle
 * @param approver - The approver wired as the authority's `ask` handler; with `undefined` every
 *   `ask` chunk is dropped, so pass `undefined` only when an in-process handler answers the asks.
 *   An `Approver` wired as the handler but passed as `undefined` leaves each ask waiting with no
 *   frame until the run `timeout` or an abort.
 * @returns An async generator of the run's frames
 *
 * @example
 * ```ts
 * const approver = createApprover()
 * const authority = createAuthority({
 * 	rules,
 * 	fallback: { zone: 'default', verdict: 'deny' },
 * 	ask: approver.ask,
 * })
 * const agent = createAgent(provider, { tools, authority })
 * for await (const frame of agentStreamToFrames(agent.stream({ prompt }), approver)) {
 * 	send(JSON.stringify(frame))
 * }
 * ```
 */
export async function* agentStreamToFrames(
	stream: AgentStreamInterface,
	approver: ApproverInterface | undefined,
): AsyncGenerator<AgentFrame, void, undefined> {
	const events = stream.events
	const result = stream.result
	try {
		for await (const chunk of events) {
			const frame =
				chunk.category === 'ask' ? approver?.frame(chunk.call) : agentChunkToFrame(chunk)
			if (frame !== undefined) yield frame
		}
		yield agentResultToFrame(await result)
	} catch {
		yield { category: 'error' }
	}
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
	const measured = {
		...(turn?.estimate === undefined ? {} : { estimate: turn.estimate }),
		...(turn?.usage === undefined ? {} : { usage: turn.usage }),
	}
	const interrupted = turn?.interrupted === true
	if (!interrupted && turn?.truncated === true) return { layer: 'model', id: provider, ...measured }
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
		...measured,
	}
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
			sum + measure.content + measure.uniform + measure.calls + measure.thinking + measure.images
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
 * not individually attributed. `content` is `ceil(length / 4)`, `uniform` is
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
 * // { id: '1', role: 'user', content: 2, uniform: 4, calls: 0, thinking: 0, images: 0 }
 * ```
 */
export function measureMessage(message: Message): MessageMeasure {
	const rendered = hasCalls(message) ? renderJSON(message.calls) : ''
	const calls = rendered === undefined ? MESSAGE_TOKEN_OVERHEAD : estimateTokens(rendered)
	return {
		id: message.id,
		role: message.role,
		content: estimateTokens(message.content),
		uniform: MESSAGE_TOKEN_OVERHEAD,
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
			sum + message.content + message.uniform + message.calls + message.thinking + message.images,
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
 * // { messages: [{ id: '1', role: 'user', content: 2, uniform: 4, calls: 0, thinking: 0, images: 0 }], tools: 0, schema: 0 }
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
 * Scans every job under a root for a member that exceeds its own parent's; an empty result clears the tree.
 *
 * @remarks
 * The walk audits each job, the root included, through `agentJobContract` before it reads a member,
 * because a job's `children` cross that contract as JSON records. A refused job yields one finding
 * with its faults, or with an unreadable note when a member read throws, and the walk reads
 * nothing under it. A child is within its parent when each of
 * its `tools` is one its parent names (a parent with no `tools` names none), each of its `builtins`
 * is one its parent names (a parent with no `builtins` names none), each name in each list of its
 * `scope` is in its parent's same list (a job with no `scope` holds the three lists empty), its
 * `authority` and `scheduler` are absent or its parent's, its `provider` is its parent's, its `limit`
 * is at most its parent's (an absent `limit` reads `DEFAULT_AGENT_LIMIT`), and, where its parent
 * holds a `timeout` or a `budget`, it holds one no larger. `system`, `messages`, and `disclosure` are
 * free: a `disclosure` shows nothing its own `scope` omits. A refused job's finding
 * opens with `JOB_REFUSAL_PREFIX` and then the job's path from `job`; an exceeded member's opens
 * with that path, a dot, and the member. The walk is total: an unreadable job yields a finding,
 * never a throw. The `AgentFanout` class runs it on every attempt of a unit, before the unit spawns
 * or runs.
 *
 * @param root - The root job of the tree
 * @returns One finding per refused job and per exceeded member, in walk order
 *
 * @example
 * ```ts
 * scanJobTree({ provider: 'main', children: [{ provider: 'other' }] })
 * // ['job.children[0].provider: "other" differs from its parent\'s, which is "main"']
 * ```
 */
export function scanJobTree(root: AgentJobInput): readonly string[] {
	const findings: string[] = []
	const pending: Array<
		readonly [
			job: unknown,
			path: string,
			parent: Omit<AgentJobInput, 'messages' | 'children'> | undefined,
		]
	> = [[root, 'job', undefined]]
	for (const [job, path, parent] of pending) {
		if (!agentJobContract.is(job)) {
			// An unreadable member makes the audit throw, so the walk reports the job as unreadable.
			const faults = attempt(() => agentJobContract.audit(job))
			findings.push(
				`${JOB_REFUSAL_PREFIX}${path}: ${faults.success ? describeFaults(faults.value, agentJobContract.schema) : 'a member read threw, so the job cannot be read'}`,
			)
			continue
		}
		if (parent !== undefined) {
			const held = parent.tools ?? []
			const outside = (job.tools ?? []).filter((name) => !held.includes(name))
			const enabled: readonly string[] = parent.builtins ?? []
			const extra = (job.builtins ?? []).filter((name) => !enabled.includes(name))
			// A job with no scope holds the three lists empty, so its child may list no name.
			const unlisted = (['skills', 'memos', 'workspaces'] as const).map(
				(list) =>
					[
						list,
						(job.scope?.[list] ?? []).filter(
							(name) => !(parent.scope?.[list] ?? []).includes(name),
						),
					] as const,
			)
			const limit = job.limit ?? DEFAULT_AGENT_LIMIT
			const bound = parent.limit ?? DEFAULT_AGENT_LIMIT
			findings.push(
				...[
					outside.length === 0
						? undefined
						: `${path}.tools: names ${outside.map((name) => preview(name)).join(', ')}, which its parent does not hold`,
					extra.length === 0
						? undefined
						: `${path}.builtins: names ${extra.map((name) => preview(name)).join(', ')}, which its parent does not hold`,
					...unlisted.map(([list, names]) =>
						names.length === 0
							? undefined
							: `${path}.scope.${list}: names ${names.map((name) => preview(name)).join(', ')}, which its parent does not hold`,
					),
					job.authority === undefined || job.authority === parent.authority
						? undefined
						: `${path}.authority: ${preview(job.authority)} is neither absent nor its parent's, which is ${parent.authority === undefined ? 'none' : preview(parent.authority)}`,
					job.provider === parent.provider
						? undefined
						: `${path}.provider: ${preview(job.provider)} differs from its parent's, which is ${preview(parent.provider)}`,
					job.scheduler === undefined || job.scheduler === parent.scheduler
						? undefined
						: `${path}.scheduler: ${preview(job.scheduler)} is neither absent nor its parent's, which is ${parent.scheduler === undefined ? 'none' : preview(parent.scheduler)}`,
					limit <= bound
						? undefined
						: `${path}.limit: ${job.limit === undefined ? `none reads ${limit}, which exceeds` : `${limit} exceeds`} its parent's ${bound}`,
					parent.timeout === undefined ||
					(job.timeout !== undefined && job.timeout <= parent.timeout)
						? undefined
						: `${path}.timeout: ${job.timeout ?? 'none'} exceeds its parent's ${parent.timeout}`,
					parent.budget === undefined || (job.budget !== undefined && job.budget <= parent.budget)
						? undefined
						: `${path}.budget: ${job.budget ?? 'none'} exceeds its parent's ${parent.budget}`,
				].filter((finding) => finding !== undefined),
			)
		}
		for (const [index, child] of (job.children ?? []).entries()) {
			pending.push([child, `${path}.children[${index}]`, job])
		}
	}
	return findings
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
 * Synthesizes the denial {@link ToolResult} a blocked call is fed back with — the call's `id` /
 * `name` keyed back, carrying a denial `error` instead of a value.
 *
 * @remarks
 * Pure and total. The `error` is `<name> did not run: <reason>`, where the model-supplied name
 * is JSON-encoded and capped at `PREVIEW_LIMIT` characters by
 * {@link import('@orkestrel/contract').preview}, and an absent `reason` reads the `denied` note
 * of {@link AUTHORITY_NOTES}. There is no `value`, so the agent loop feeds it back exactly like
 * a tool error and the model can react to it.
 *
 * @param call - The denied {@link ToolCall}
 * @param reason - A rule's `deny` reason or a note, or `undefined` for the `denied` note
 * @returns The failure-arm {@link ToolResult}
 *
 * @example
 * ```ts
 * denyCall({ id: '1', name: 'drop', arguments: {} }, 'read-only mode')
 * // { success: false, id: '1', name: 'drop', error: '"drop" did not run: read-only mode' }
 * ```
 */
export function denyCall(call: ToolCall, reason: string | undefined): ToolResult {
	return {
		success: false,
		id: call.id,
		name: call.name,
		error: `${preview(call.name)} did not run: ${reason ?? AUTHORITY_NOTES.denied}`,
	}
}

/**
 * Renders a tool call's arguments as escaped canonical JSON text — sorted keys, with every control,
 * format, line-separator, and paragraph-separator code point written as `\uXXXX` — or returns
 * `undefined` when they cannot be rendered.
 *
 * @remarks
 * Keeps the semantics of `canonicalStringify` from `@orkestrel/contract`, so `NaN` renders as `null`
 * and an `undefined` member is dropped, as `JSON.stringify` does; the exact round trip through
 * `JSON.parse` is promised for JSON arguments only, which a provider's parsed call carries. A cycle,
 * a throwing getter, or a value JSON cannot encode returns `undefined`. Each escaped code point is
 * written over its UTF-16 code units, so bidi overrides, zero-width characters, U+0085, U+2028,
 * U+2029, U+FEFF, and tag characters appear only encoded. The text carries no length cap.
 *
 * @param value - The call's arguments
 * @returns The rendered text, or `undefined` when the arguments cannot be rendered
 *
 * @example
 * ```ts
 * renderArguments({ path: 'a\u202Eb', mode: 'r' }) // '{"mode":"r","path":"a\\u202eb"}'
 * ```
 */
export function renderArguments(value: Readonly<Record<string, unknown>>): string | undefined {
	const rendered = attempt(() => canonicalStringify(value))
	if (!rendered.success || rendered.value === undefined) return undefined
	return rendered.value.replace(new RegExp(ARGUMENT_CONTROL_PATTERN.source, 'gu'), (match) =>
		Array.from(
			{ length: match.length },
			(_, index) => `\\u${match.charCodeAt(index).toString(16).padStart(4, '0')}`,
		).join(''),
	)
}

/**
 * Applies the `consequential` floor to one {@link AuthorityDecision} — an `allow` for a tool
 * whose advertised definition is annotated `consequential` becomes an `ask`.
 *
 * @remarks
 * Pure and total, and monotone: it raises `allow` to `ask` and never loosens a verdict, so an
 * `ask` and a `deny` return with the same verdict. The result is always a fresh decision.
 * An unannotated or absent definition leaves the verdict unchanged.
 *
 * @param decision - The authority's decision on one call
 * @param definition - The advertised definition named by the call, or `undefined` when none is
 * @returns A fresh decision carrying the raised or unchanged verdict
 *
 * @example
 * ```ts
 * const definition = { name: 'write', description: 'Write a file', annotations: { consequential: true } }
 * resolveDecision({ zone: 'default', verdict: 'allow' }, definition) // { zone: 'default', verdict: 'ask' }
 * ```
 */
export function resolveDecision(
	decision: AuthorityDecision,
	definition: ToolDefinition | undefined,
): AuthorityDecision {
	const raised = decision.verdict === 'allow' && definition?.annotations?.consequential === true
	return { ...decision, verdict: raised ? 'ask' : decision.verdict }
}

/**
 * Checks a run's final answer against its schema: the content must parse as JSON and satisfy the
 * schema, or the call throws a coded error carrying the faults.
 *
 * @remarks
 * The schema enters through the lenient `schemaToShape`, which widens every keyword it cannot express
 * and never narrows, because a provider constrains its own output and a false refusal would discard a
 * good answer. The check is `is`, because `explain` alone passes what `parse` would repair. Each call
 * compiles once, and a run has one final answer.
 *
 * @param content - The final answer's text
 * @param schema - The run's JSON Schema
 * @throws {AgentError} Thrown when the content is not JSON, misses the schema, or the schema does not compile (code `'SCHEMA'`), with the faults under `context.faults` for the first two
 *
 * @example
 * ```ts
 * requireAnswer('{"a":5}', { type: 'object', properties: { a: { type: 'number' } } })
 * requireAnswer('nope', { type: 'object' }) // throws AgentError ('SCHEMA')
 * ```
 */
export function requireAnswer(content: string, schema: Readonly<Record<string, unknown>>): void {
	const compiled = attempt(() => createContract(schemaToShape(schema)))
	if (!compiled.success) {
		throw new AgentError(
			'SCHEMA',
			'the run schema does not compile; pass a JSON Schema built from plain values',
			{ cause: compiled.error },
		)
	}
	const parsed = parseJSON(content)
	const faults: readonly AuditFault[] =
		parsed === undefined
			? [
					{
						reason: 'type',
						path: [],
						expected: 'json',
						received: preview(content),
					},
				]
			: compiled.value.is(parsed)
				? []
				: compiled.value.audit(parsed)
	if (faults.length > 0) {
		throw new AgentError(
			'SCHEMA',
			`the final answer does not satisfy the run schema; pass strict: false to createAgent to take the raw content from a provider that ignores schemas\n${describeFaults(faults, compiled.value.schema)}`,
			{ context: { faults } },
		)
	}
}

/**
 * Returns an authority's no-match decision after checking the options carry one, or throws a coded
 * error naming the two fallbacks a host chooses between.
 *
 * @remarks
 * A rules list says nothing about the calls it does not match, so no fallback is assumed: a denylist
 * and an allowlist differ only here. The check is {@link isAuthorityDecision}, a total guard, so a
 * missing options object and a malformed fallback refuse alike.
 *
 * @param options - The authority's options as a host passed them
 * @returns The fallback, narrowed to an {@link AuthorityDecision}
 * @throws {AgentError} Thrown when the options carry no valid `fallback` (code `'AUTHORITY'`)
 *
 * @example
 * ```ts
 * requireFallback({ fallback: { zone: 'default', verdict: 'deny' } }) // { zone: 'default', verdict: 'deny' }
 * ```
 */
export function requireFallback(options: AuthorityOptions): AuthorityDecision {
	const fallback = attempt(() => (isObject(options) ? Reflect.get(options, 'fallback') : undefined))
	if (fallback.success && isAuthorityDecision(fallback.value)) return fallback.value
	throw new AgentError(
		'AUTHORITY',
		"an authority needs a fallback for the calls no rule matches; pass fallback: { zone: 'default', verdict: 'deny' } for an allowlist, or fallback: { zone: 'default', verdict: 'allow' } for a denylist",
	)
}

/**
 * Returns an authority's rules after checking each one names a verdict, or throws a coded error naming
 * the first rule that does not.
 *
 * @remarks
 * Absent rules return an empty list. A rule's verdict decides a tool call, so a rule with none is
 * refused rather than read as an allow. The error's `context` carries the rule's index as `rule`.
 *
 * @param rules - The ordered rules, or `undefined` for none
 * @returns The rules unchanged, or an empty list when none were supplied
 * @throws {AgentError} Thrown when a rule has no valid `verdict` (code `'AUTHORITY'`)
 *
 * @example
 * ```ts
 * requireRules([{ match: () => true, zone: 'files', verdict: 'ask' }]).length // 1
 * ```
 */
export function requireRules(
	rules: readonly AuthorityRule[] | undefined,
): readonly AuthorityRule[] {
	if (rules === undefined) return []
	// `Array.from` visits a hole as an undefined rule, which the guard refuses; `findIndex` reads it too.
	const refused = Array.from(rules).findIndex(
		(rule) => !objectOf({ verdict: isAuthorityVerdict })(rule),
	)
	if (refused !== -1) {
		throw new AgentError(
			'AUTHORITY',
			`rule ${refused} has no verdict; set verdict: 'allow' | 'ask' | 'deny'`,
			{ context: { rule: refused } },
		)
	}
	return rules
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
 * Returns a tool-iteration cap after checking it is a positive safe integer, or throws a coded error.
 *
 * @remarks
 * The check is {@link import('../validators.js').isPositiveSafeInteger}, so `0`, `-0`, `NaN`, a
 * fraction, a negative, and either infinity are refused, because a run of no turns asks the provider
 * nothing and answers nothing. The error's `context` carries the refused value as `limit`.
 *
 * @param limit - The tool-iteration cap to check
 * @returns The cap unchanged
 * @throws {AgentError} Thrown when `limit` is not a positive safe integer (code `'LIMIT'`)
 *
 * @example
 * ```ts
 * requireLimit(3) // 3
 * requireLimit(0) // throws AgentError ('LIMIT')
 * ```
 */
export function requireLimit(limit: number): number {
	if (!isPositiveSafeInteger(limit)) {
		throw new AgentError(
			'LIMIT',
			'a limit must be a positive safe integer, because a run of no turns answers nothing',
			{ context: { limit } },
		)
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
 * Returns a run's `conversation` option after checking it implements `ConversationInterface`, or
 * throws a coded error before the run starts.
 *
 * @remarks
 * The check is {@link isConversation}, a total guard. `undefined` passes, because an absent option
 * binds the run to the active conversation. The error's `context` carries the option path, the
 * limit `'ConversationInterface'`, and a preview of the refused value.
 *
 * @param value - The run's `conversation` option, or `undefined`
 * @returns The value unchanged
 * @throws {ContractError} Thrown when `value` is defined and does not implement `ConversationInterface` (code `'placement'`)
 *
 * @example
 * ```ts
 * requireConversation(createConversation()) // the conversation
 * requireConversation({ id: 'c1' }) // throws ContractError ('placement')
 * ```
 */
export function requireConversation(value: unknown): ConversationInterface | undefined {
	if (value === undefined || isConversation(value)) return value
	throw new ContractError('Agent: conversation must implement ConversationInterface', {
		code: 'placement',
		context: {
			path: ['options', 'conversation'],
			limit: 'ConversationInterface',
			received: preview(value),
		},
	})
}

/**
 * Returns a scope a run can bind, or throws a `ContractError` coded `'placement'`; `undefined`
 * passes through.
 *
 * @remarks
 * The check is {@link isScope}, a total guard that reads each member one time and admits any
 * implementation of `ScopeInterface`. `undefined` passes, because an absent option leaves the
 * context scope alone as the run's ceiling. The error's `context` carries the option path, the
 * limit `'ScopeInterface'`, and a preview of the refused value.
 *
 * @param value - The run's `scope` option, or `undefined`
 * @returns The value unchanged
 * @throws {ContractError} Thrown when `value` is defined and does not implement `ScopeInterface` (code `'placement'`)
 *
 * @example
 * ```ts
 * requireScope(createScope({ name: 'reader', tools: ['search'] })) // the scope
 * requireScope({ id: 's1', name: 'reader' }) // throws ContractError ('placement')
 * ```
 */
export function requireScope(value: unknown): ScopeInterface | undefined {
	if (value === undefined || isScope(value)) return value
	throw new ContractError('Agent: scope must implement ScopeInterface', {
		code: 'placement',
		context: { path: ['options', 'scope'], limit: 'ScopeInterface', received: preview(value) },
	})
}

/**
 * Renders a tool's output as the string content of its tool message, or returns `undefined` when JSON
 * cannot carry it.
 *
 * @remarks
 * A string passes through unchanged and `undefined` renders as `''`. Any other value renders as
 * its `JSON.stringify` text, byte for byte, when JSON can carry it. A value JSON cannot carry (a
 * `BigInt`, a cycle, a symbol, a function, a throwing `toJSON`) returns `undefined`, which
 * {@link settleToolResult} turns into a tool failure.
 *
 * @param value - The tool's output (`ToolSuccess.value`, which may be `undefined`)
 * @returns The message content, or `undefined` when JSON cannot carry the value
 *
 * @example
 * ```ts
 * renderToolValue('sunny') // 'sunny'
 * renderToolValue({ count: 2 }) // '{"count":2}'
 * renderToolValue(undefined) // ''
 * renderToolValue(10n) // undefined
 * ```
 */
export function renderToolValue(value: unknown): string | undefined {
	if (typeof value === 'string') return value
	if (value === undefined) return ''
	return renderJSON(value)
}

/**
 * Settles one dispatched result into the result the loop reports and the content of its tool message,
 * turning a success whose value JSON cannot carry into a tool failure the model reads.
 *
 * @remarks
 * A failure passes through with its `error` as the content. A success renders through
 * {@link renderToolValue}. A success that renders to `undefined` becomes the failure arm with the
 * call's `id` and `name`, whose `error` names the tool and the remedy.
 *
 * @param result - The result the tool manager returned for one call
 * @returns The result to report and the tool message content
 *
 * @example
 * ```ts
 * settleToolResult({ success: true, id: '1', name: 'read', value: { count: 2 } }).content // '{"count":2}'
 * settleToolResult({ success: true, id: '1', name: 'read', value: 10n }).outcome.success // false
 * ```
 */
export function settleToolResult(result: ToolResult): {
	readonly outcome: ToolResult
	readonly content: string
} {
	if (!result.success) return { outcome: result, content: result.error }
	const content = renderToolValue(result.value)
	if (content !== undefined) return { outcome: result, content }
	const error = `${preview(result.name)} returned a value JSON cannot carry; return strings, numbers, booleans, null, arrays, and plain records`
	return {
		outcome: { success: false, id: result.id, name: result.name, error },
		content: error,
	}
}

/**
 * Returns a registered value or throws when its name is absent.
 * @param pool - The named values
 * @param category - The registry category named in an error
 * @param name - The requested key
 * @returns The registered value
 * @throws {AgentError} Thrown when the name is absent, with code REGISTRY, the name encoded and capped in its text because a tool refusal reaches a model, and a `context` naming the `category` and the `name`.
 * @example
 * ```ts
 * requireEntry(new Map([['main', provider]]), 'provider', 'main') // provider
 * ```
 */
export function requireEntry<T>(pool: ReadonlyMap<string, T>, category: string, name: string): T {
	const value = pool.get(name)
	if (value === undefined) {
		throw new AgentError('REGISTRY', `unknown ${category}: ${preview(name)}`, {
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

/**
 * Collects the definitions of the tools an agent serves itself, as a run advertises them.
 *
 * @remarks
 * Each definition carries the name, description, and annotations `BUILTIN_TOOLS` declares and the
 * parameters of the built-in's compiled contract in `builtinToolContracts`, in the order `builtins` lists them, so
 * it equals the definition of the tool `createBuiltinTool` creates. A relay server lists these
 * among its declared definitions to forward a page's built-ins. A name that is no built-in
 * contributes nothing.
 *
 * @param options - The agent options whose `builtins` to project
 * @returns The definitions, empty when `builtins` is absent
 *
 * @example
 * ```ts
 * collectBuiltinDefinitions({ builtins: ['load', 'unload'] }).map((definition) => definition.name) // ['load', 'unload']
 * ```
 */
export function collectBuiltinDefinitions(
	options: Pick<AgentOptions, 'builtins'>,
): readonly ToolDefinition[] {
	return (options.builtins ?? []).filter(isAgentBuiltin).map((name) => {
		const declared = BUILTIN_TOOLS[name]
		const parameters = schemaToParameters(builtinToolContracts[name].contract.schema)
		return {
			name,
			description: declared.description,
			...(parameters === undefined ? {} : { parameters }),
			...(declared.annotations === undefined ? {} : { annotations: declared.annotations }),
		}
	})
}

/**
 * Returns an agent's `builtins` option as an owned, frozen list, or throws a coded error before the
 * agent is built.
 *
 * @remarks
 * `undefined` returns an empty list. The option must be an array of distinct {@link AgentBuiltin}
 * names; `unload` needs `load`, because only a loaded skill can be unloaded; and the host's tool
 * manager may hold no tool under an enabled name, because the run serves that name itself.
 *
 * @param value - The `builtins` option
 * @param tools - The host's tool manager
 * @returns The enabled names, in the order given
 * @throws {AgentError} Thrown when the option is not an array, names something that is no built-in, repeats a name, lists `unload` without `load`, or names a tool the manager holds (code `'BUILTIN'`)
 *
 * @example
 * ```ts
 * requireBuiltins(['load', 'unload'], createToolManager()) // ['load', 'unload']
 * requireBuiltins(['unload'], createToolManager()) // throws AgentError ('BUILTIN')
 * ```
 */
export function requireBuiltins(
	value: unknown,
	tools: Pick<ToolManagerInterface, 'tool'>,
): readonly AgentBuiltin[] {
	if (value === undefined) return Object.freeze([])
	if (!isArray(value)) {
		throw new AgentError('BUILTIN', `builtins must be an array; received ${preview(value)}`)
	}
	const names = [...value].filter(isAgentBuiltin)
	if (names.length !== value.length) {
		throw new AgentError(
			'BUILTIN',
			"builtins lists a name that is no built-in; list only 'load', 'unload', 'memo', 'remember', and 'switch'",
			{ context: { received: preview(value) } },
		)
	}
	if (new Set(names).size !== names.length) {
		throw new AgentError('BUILTIN', 'builtins lists a name more than once', {
			context: { builtins: names },
		})
	}
	if (names.includes('unload') && !names.includes('load')) {
		throw new AgentError('BUILTIN', "builtins lists 'unload' without 'load'; add 'load' too", {
			context: { builtins: names },
		})
	}
	const taken = names.filter((name) => tools.tool(name) !== undefined)
	if (taken.length > 0) {
		throw new AgentError(
			'BUILTIN',
			`the tool manager holds a tool under the built-in name ${taken.map((name) => `'${name}'`).join(', ')}; rename that tool or leave the name out of builtins`,
			{ context: { builtins: names, taken } },
		)
	}
	return Object.freeze(names)
}

/**
 * Returns an owned, frozen copy of a `disclosure` option, or throws a coded error before the agent
 * is built or the run starts; `undefined` passes through.
 *
 * @remarks
 * The check is `agentDisclosureContract.is`, which refuses a missing `skills`, a member that is not
 * a string, an extra member, and a `workspace` given as `undefined`. The error's `context` carries
 * the option path, the limit `'AgentDisclosure'`, and a preview of the refused value, and its text
 * carries the faults. A name the registries do not hold, or the ceiling does not admit, passes here
 * and shows nothing.
 *
 * @param value - The `disclosure` option of an agent or a run, or `undefined`
 * @returns The owned copy, or `undefined`
 * @throws {ContractError} Thrown when `value` is defined and the contract refuses it (code `'placement'`)
 *
 * @example
 * ```ts
 * requireDisclosure({ skills: ['refunds'] }) // { skills: ['refunds'] }
 * requireDisclosure({ skills: 'refunds' }) // throws ContractError ('placement')
 * ```
 */
export function requireDisclosure(value: unknown): AgentDisclosure | undefined {
	if (value === undefined) return undefined
	if (!agentDisclosureContract.is(value)) {
		// A contract error's context declares no faults, so they travel in the text it carries.
		const faults = attempt(() =>
			describeFaults(agentDisclosureContract.audit(value), agentDisclosureContract.schema),
		)
		throw new ContractError(
			`Agent: disclosure must be an exact AgentDisclosure${faults.success ? `\n${faults.value}` : ''}`,
			{
				code: 'placement',
				context: {
					path: ['options', 'disclosure'],
					limit: 'AgentDisclosure',
					received: preview(value),
				},
			},
		)
	}
	return Object.freeze({
		skills: Object.freeze([...value.skills]),
		...(value.workspace === undefined ? {} : { workspace: value.workspace }),
	})
}

/**
 * Returns the definitions a turn advertises from the allow-list, the registered skills, and the
 * shown skills.
 *
 * @remarks
 * The allow-list admits first, as `filterAllowList` does. When no skill is passed, or the allow-list
 * admits no `load`, the admitted list returns as it is. Otherwise a tool any registered skill names
 * is held back unless a shown skill names it too; `load` and `unload` are never held back. A caller
 * passes the registered skills only while `load` is enabled, so a ceiling whose empty `skills` list
 * withholds `load` from the candidates still holds the skills' tools back. Holding a tool back is
 * presentation, never authority: a call to it is denied as outside the turn's scope.
 *
 * @param definitions - The candidate definitions, in advertisement order
 * @param names - The turn's `tools` allow-list (`undefined` ⇒ all, `[]` ⇒ none)
 * @param skills - The registered skills whose `tools` gate, or none while `load` is not enabled
 * @param shown - The names of the skills the turn shows
 * @returns The advertised definitions, in candidate order
 *
 * @example
 * ```ts
 * const skills = [{ id: '1', name: 'refunds', description: 'Refunds', content: '', tools: ['refund'], files: [] }]
 * filterAdvertisedTools([{ name: 'load' }, { name: 'refund' }], undefined, skills, []) // [{ name: 'load' }]
 * filterAdvertisedTools([{ name: 'load' }, { name: 'refund' }], undefined, skills, ['refunds']).length // 2
 * ```
 */
export function filterAdvertisedTools(
	definitions: readonly ToolDefinition[],
	names: readonly string[] | undefined,
	skills: readonly Skill[],
	shown: readonly string[],
): readonly ToolDefinition[] {
	const admitted = filterAllowList(names, definitions, (definition) => definition.name)
	if (skills.length === 0 || (names !== undefined && !names.includes('load'))) return admitted
	const held = new Set(skills.flatMap((skill) => skill.tools))
	const visible = new Set(shown)
	const open = new Set(
		skills.filter((skill) => visible.has(skill.name)).flatMap((skill) => skill.tools),
	)
	return admitted.filter(
		(definition) =>
			definition.name === 'load' ||
			definition.name === 'unload' ||
			!held.has(definition.name) ||
			open.has(definition.name),
	)
}

/**
 * Returns the definitions a run offers before the allow-list, without `remember` unless the
 * ceiling's `memos` list names a memo, without `switch` unless its `workspaces` list names a
 * workspace, and without `load` and `unload` while its `skills` list is empty.
 *
 * @remarks
 * `remember` writes and `switch` selects only a name its list holds, so an absent list and an empty
 * list each leave the built-in nothing to act on, and it is not advertised. An absent `skills` list
 * admits every registered skill, so `load` and `unload` are withheld only when the list is empty.
 * Every other definition keeps its place.
 *
 * @param definitions - The candidate definitions, in advertisement order
 * @param ceiling - The turn's ceiling
 * @returns The definitions, in candidate order
 *
 * @example
 * ```ts
 * filterBuiltinCandidates([{ name: 'memo' }, { name: 'remember' }], { memos: [] }) // [{ name: 'memo' }]
 * filterBuiltinCandidates([{ name: 'memo' }, { name: 'remember' }], { memos: ['tone'] }).length // 2
 * ```
 */
export function filterBuiltinCandidates(
	definitions: readonly ToolDefinition[],
	ceiling: ScopeFilter,
): readonly ToolDefinition[] {
	const writable = (ceiling.memos ?? []).length > 0
	const selectable = (ceiling.workspaces ?? []).length > 0
	const loadable = ceiling.skills === undefined || ceiling.skills.length > 0
	return definitions.filter(
		(definition) =>
			(definition.name !== 'remember' || writable) &&
			(definition.name !== 'switch' || selectable) &&
			((definition.name !== 'load' && definition.name !== 'unload') || loadable),
	)
}

/**
 * Returns the refusal that names a subject and at most `BUILTIN_LIMITS.candidates` of the names a
 * caller can use.
 *
 * @remarks
 * The subject reads after "No", so it names what the caller may use, such as `'skill you can load'`.
 * The text echoes no argument, so an absent name and a name outside the ceiling read byte for byte
 * the same. Each name is JSON-encoded and capped by `preview`, in the order given. Past the cap one
 * fixed sentence sends the reader to the index in its prompt.
 *
 * @param subject - What the caller may name, such as `'skill you can load'`
 * @param names - The names the caller can use, in registry order
 * @returns The refusal text
 *
 * @example
 * ```ts
 * describeCandidates('skill you can load', ['refunds', 'billing'])
 * // 'No skill you can load has that name. Use one of: "refunds", "billing".'
 * ```
 */
export function describeCandidates(subject: string, names: readonly string[]): string {
	if (names.length === 0) return `No ${subject} has that name, and none is available now.`
	const listed = names
		.slice(0, BUILTIN_LIMITS.candidates)
		.map((name) => preview(name))
		.join(', ')
	const rest =
		names.length > BUILTIN_LIMITS.candidates ? ' The index in your prompt lists the others.' : ''
	return `No ${subject} has that name. Use one of: ${listed}.${rest}`
}

/**
 * Checks whether a text is one nonblank line: it holds a code point other than white space and
 * default-ignorable code points (`ARGUMENT_BLANK_PATTERN`), and no control, format, line-separator, or
 * paragraph-separator code point (`ARGUMENT_CONTROL_PATTERN`).
 *
 * @remarks
 * The class is the one `renderArguments` encodes. A memo's name and description render in the memos
 * index one line each, so `remember` refuses a value outside this check.
 *
 * @param text - The text to check
 * @returns True if the text is one nonblank line; false otherwise
 *
 * @example
 * ```ts
 * matchesPlainLine('Reply tone') // true
 * matchesPlainLine('Reply\ntone') // false
 * matchesPlainLine('   ') // false
 * ```
 */
export function matchesPlainLine(text: string): boolean {
	return !ARGUMENT_BLANK_PATTERN.test(text) && !ARGUMENT_CONTROL_PATTERN.test(text)
}

/**
 * Checks whether two ceilings carry the same lists of what a head renders: `instructions`,
 * `skills`, `memos`, `files`, and `workspaces`.
 *
 * @remarks
 * Each list compares by its members in order, and an absent list equals only an absent list,
 * because `undefined` admits everything and `[]` admits nothing. The `tools` list is not compared:
 * it reaches the tools block, never the head.
 *
 * @param left - One ceiling's lists
 * @param right - The other ceiling's lists
 * @returns True if every compared list matches; false otherwise
 *
 * @example
 * ```ts
 * matchesHeadLists({ skills: ['refunds'] }, { skills: ['refunds'], tools: [] }) // true
 * matchesHeadLists({ skills: [] }, {}) // false
 * ```
 */
export function matchesHeadLists(left: ScopeFilter, right: ScopeFilter): boolean {
	return [
		[left.instructions, right.instructions],
		[left.skills, right.skills],
		[left.memos, right.memos],
		[left.files, right.files],
		[left.workspaces, right.workspaces],
	].every(([one, other]) =>
		one === undefined || other === undefined
			? one === other
			: one.length === other.length && one.every((key, index) => key === other[index]),
	)
}

/**
 * Resolves what a turn shows: the given value, then the conversation's record, within the ceiling
 * and the registries.
 *
 * @remarks
 * The caller reads the ceiling, so a turn reads each scope list one time. The skills are the given value's, then
 * those {@link collectDisclosure} reads from the conversation, without repeats, keeping each that
 * the skill registry holds and the ceiling's `skills` list admits; an empty, repeated, unregistered,
 * or excluded name shows nothing. The workspace is the conversation's last switch, else the given
 * value's, kept only when the workspace registry holds it and the ceiling's `workspaces` list
 * admits it. The record counts only the built-ins in `builtins`, as {@link collectDisclosure}
 * states.
 *
 * @param context - The agent's context, whose scope, skills, and workspaces it reads
 * @param conversation - The conversation whose record to read
 * @param given - What the host shows, or `undefined`
 * @param ceiling - The ceiling the turn read: the context scope intersected with the run scope
 * @param builtins - The built-ins the run enables
 * @returns The shown skills, in order, and the shown workspace when one is
 *
 * @example
 * ```ts
 * resolveDisclosure(agent.context, agent.context.messages, { skills: ['refunds', 'unknown'] }, {}, []) // { skills: ['refunds'] } when only refunds is registered
 * ```
 */
export function resolveDisclosure(
	context: AgentContextInterface,
	conversation: Pick<ConversationInterface, 'sections' | 'messages'>,
	given: AgentDisclosure | undefined,
	ceiling: ScopeFilter,
	builtins: readonly AgentBuiltin[],
): AgentDisclosure {
	const recorded = collectDisclosure(conversation, builtins)
	const admitted = new Set(
		filterAllowList(ceiling.skills, context.skills.skills(), (skill) => skill.name).map(
			(skill) => skill.name,
		),
	)
	const skills = [...new Set([...(given?.skills ?? []), ...recorded.skills])].filter((name) =>
		admitted.has(name),
	)
	const workspace = recorded.workspace ?? given?.workspace
	const shown =
		workspace !== undefined &&
		context.workspaces.workspace(workspace) !== undefined &&
		filterAllowList(ceiling.workspaces, [workspace], (id) => id).length > 0
	return shown ? { skills, workspace } : { skills }
}

/**
 * Collects the loaded skills and the selected workspace a conversation's stored built-in calls
 * record, counting only the built-ins a run enables.
 *
 * @remarks
 * Pure. It reads each section's retained originals, oldest first, then the live tail, and pairs
 * each tool message with the call that owns it through {@link collectToolGroups} and
 * {@link findToolCall}. It then folds the pairs in message order: a `load` whose message content
 * equals `BUILTIN_NOTES.loaded` adds its `skill`, an `unload` with `BUILTIN_NOTES.unloaded` removes
 * it, and a `switch` with `BUILTIN_NOTES.switched` selects its `workspace`. Each call's arguments
 * are admitted through the built-in's contract in `builtinToolContracts`, lossless repairs
 * included, as its tool's door admits them, so a `{ skill: 1 }` the door repaired to `'1'` counts
 * as `'1'`; arguments the contract refuses change nothing. A skill loaded again while shown keeps
 * its place, and one loaded again after its unload goes last. Any other message and a denied or
 * refused call change nothing. The result holds `workspace` only when a switch succeeded.
 *
 * A record counts only while its built-in is in `builtins`, so a host tool that holds a built-in's
 * name on a run that does not enable it shows nothing; with none of `load`, `unload`, and `switch`
 * enabled, nothing is read. A stored record cannot tell its writer, so one a host tool wrote under a
 * built-in's name while that built-in was off counts after a run enables it, bounded by the registry
 * and the ceiling as every record is.
 *
 * @param conversation - The conversation whose stored messages record the calls
 * @param builtins - The built-ins the run enables
 * @returns The skills in load order and the last selected workspace
 *
 * @example
 * ```ts
 * import { collectDisclosure, createConversation } from '@orkestrel/agent'
 *
 * collectDisclosure(createConversation(), ['load', 'unload']) // { skills: [] }
 * ```
 */
export function collectDisclosure(
	conversation: Pick<ConversationInterface, 'sections' | 'messages'>,
	builtins: readonly AgentBuiltin[],
): AgentDisclosure {
	const counted = new Set<string>(
		builtins.filter((name) => name === 'load' || name === 'unload' || name === 'switch'),
	)
	if (counted.size === 0) return { skills: [] }
	const stored = [
		...conversation.sections.flatMap((section) => section.messages),
		...conversation.messages(),
	]
	// Groups come back in owner order, so the fold walks the stored order, not the groups.
	const owners = new Map(
		collectToolGroups(stored).flatMap((group) =>
			group.flatMap((message): ReadonlyArray<readonly [Message, ToolCall]> => {
				const call = findToolCall(group, message)
				return call === undefined ? [] : [[message, call]]
			}),
		),
	)
	return stored.reduce<AgentDisclosure>(
		(shown, message) => {
			const call = owners.get(message)
			const name = call?.name
			if (call === undefined || !isAgentBuiltin(name) || !counted.has(name)) return shown
			const note =
				name === 'load'
					? BUILTIN_NOTES.loaded
					: name === 'unload'
						? BUILTIN_NOTES.unloaded
						: BUILTIN_NOTES.switched
			if (message.content !== note) return shown
			// The door's admission, its lossless repair included, decides what the call named.
			const admitted = admitValue(builtinToolContracts[name].contract, { ...call.arguments })
			const skill = admitted.success ? admitted.value.value['skill'] : undefined
			const workspace = admitted.success ? admitted.value.value['workspace'] : undefined
			if (name === 'load') {
				return !isString(skill) || shown.skills.includes(skill)
					? shown
					: { ...shown, skills: [...shown.skills, skill] }
			}
			if (name === 'unload') {
				return !isString(skill)
					? shown
					: { ...shown, skills: shown.skills.filter((one) => one !== skill) }
			}
			return !isString(workspace) ? shown : { skills: shown.skills, workspace }
		},
		{ skills: [] },
	)
}
