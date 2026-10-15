import type {
	Message,
	ProviderDelta,
	ProviderInterface,
	ProviderRequest,
	ProviderResult,
	ProviderStreamOptions,
	ThinkingReplay,
} from '@orkestrel/agent'
import type { ToolDefinition } from '@orkestrel/tool'
import type { StudyMemoryObserverOptions } from './types.js'
import { projectStudyMemoryRequest, validateStudyMemoryProjection } from './helpers.js'

/** Reads each agent request's size and enforces the gauge projection on the real provider's successful returns. */
export class StudyMemoryObserver implements ProviderInterface {
	readonly #options: StudyMemoryObserverOptions

	/** Binds the real provider, measuring subject, optional gauge and reading recorder. @param options - Delegate and measurement seams. */
	constructor(options: StudyMemoryObserverOptions) {
		this.#options = options
	}

	/** Reports the delegate's trace label. @returns The real provider's id. */
	get id(): string {
		return this.#options.provider.id
	}

	/** Reports the delegate's backend name. @returns The real provider's name. */
	get name(): string {
		return this.#options.provider.name
	}

	/** Reports the delegate's thinking replay policy; an absent policy is the declared 'none'. @returns The policy the Agent applies before calling. */
	get replay(): ThinkingReplay {
		return this.#options.provider.replay ?? 'none'
	}

	/** Records one reading, then awaits the real generate. @param messages - Conversation sent. @param signal - Bounds the request. @param tools - Tools advertised this turn. @param options - Per-call options. @returns The real provider's result. */
	async generate(
		messages: readonly Message[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		options?: ProviderStreamOptions,
	): Promise<ProviderResult> {
		const projected = this.#measure(messages, tools, options)
		const result = await this.#options.provider.generate(messages, signal, tools, options)
		if (projected !== undefined && !signal.aborted)
			validateStudyMemoryProjection(result.usage, projected, 'agent')
		return result
	}

	/** Records one reading, then relays the real stream. @param messages - Conversation sent. @param signal - Bounds the request. @param tools - Tools advertised this turn. @param options - Per-call options. @returns The real deltas and result. */
	stream(
		messages: readonly Message[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		options?: ProviderStreamOptions,
	): AsyncGenerator<ProviderDelta, ProviderResult> {
		const projected = this.#measure(messages, tools, options)
		return this.#relay(
			this.#options.provider.stream(messages, signal, tools, options),
			signal,
			projected,
		)
	}

	// Forms the pre-encoding request exactly as the Agent's window measures it: omitted members stay omitted.
	#measure(
		messages: readonly Message[],
		tools: readonly ToolDefinition[] | undefined,
		options: ProviderStreamOptions | undefined,
	): number | undefined {
		const request: ProviderRequest = {
			messages,
			...(tools === undefined ? {} : { tools }),
			...(options === undefined ? {} : { options }),
		}
		const estimate = this.#options.subject.estimateRequest(request)
		const gauge = this.#options.gauge
		const projected = gauge === undefined ? undefined : projectStudyMemoryRequest(gauge, estimate)
		this.#options.record({ estimate, projected }, request)
		return projected
	}

	async *#relay(
		source: AsyncGenerator<ProviderDelta, ProviderResult>,
		signal: AbortSignal,
		projected: number | undefined,
	): AsyncGenerator<ProviderDelta, ProviderResult> {
		const result = yield* source
		if (projected !== undefined && !signal.aborted)
			validateStudyMemoryProjection(result.usage, projected, 'agent')
		return result
	}
}
