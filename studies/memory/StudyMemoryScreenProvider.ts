import type {
	Message,
	ProviderInterface,
	ProviderDelta,
	ProviderResult,
	ProviderStreamOptions,
} from '@orkestrel/agent'
import type { ToolDefinition } from '@orkestrel/tool'
import type { StudyMemoryScreen } from './StudyMemoryScreen.js'

/** Intercepts terminal tool batches and applies the target-only sham before actual provider encoding. */
export class StudyMemoryScreenProvider implements ProviderInterface {
	readonly #provider: ProviderInterface
	readonly #screen: StudyMemoryScreen
	/** Binds the real provider to one case account. @param provider - Unchanged delegate. @param screen - Case admission owner. */
	constructor(provider: ProviderInterface, screen: StudyMemoryScreen) {
		this.#provider = provider
		this.#screen = screen
	}
	/** Returns the delegate identity. */
	get id(): string {
		return this.#provider.id
	}
	/** Returns the delegate backend name. */
	get name(): string {
		return this.#provider.name
	}
	/** Returns the delegate replay policy with the provider contract's absent default. */
	get replay() {
		return this.#provider.replay ?? 'none'
	}
	/** Admits the request and completed tool batch around real generation. @param messages - Supplied messages. @param signal - Caller cancellation. @param tools - Unchanged advertised tools. @param options - Unchanged call options. @returns The delegate result. */
	async generate(
		messages: readonly Message[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		options?: ProviderStreamOptions,
	): Promise<ProviderResult> {
		try {
			return this.#screen.complete(
				await this.#provider.generate(
					this.#screen.prepare(messages),
					AbortSignal.any([signal, this.#screen.signal]),
					tools,
					options,
				),
			)
		} catch (error) {
			return this.#screen.fail(error)
		}
	}
	/** Relays deltas and closes the delegate iterator on return, throw, or abort. @param messages - Supplied messages. @param signal - Caller cancellation. @param tools - Unchanged advertised tools. @param options - Unchanged call options. @returns Delegate deltas and the admitted terminal result. */
	async *stream(
		messages: readonly Message[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		options?: ProviderStreamOptions,
	): AsyncGenerator<ProviderDelta, ProviderResult> {
		try {
			return this.#screen.complete(
				yield* this.#provider.stream(
					this.#screen.prepare(messages),
					AbortSignal.any([signal, this.#screen.signal]),
					tools,
					options,
				),
			)
		} catch (error) {
			return this.#screen.fail(error)
		}
	}
}
