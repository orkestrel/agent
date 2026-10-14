import type { Message, ProviderInterface, ProviderResult, ProviderDelta, ProviderStreamOptions } from '../../../vendor/agent-0.0.30-trimmed/index.js'
import type { ToolDefinition } from '@orkestrel/tool'
import type { ContinuousProviderOptions } from '../types.js'

/** Captures each native provider input before its wire projection for calibrated admission. */
export class GuardedProvider implements ProviderInterface {
	readonly #options: ContinuousProviderOptions
	/** Creates a provider boundary that captures each generated input.
	 * @param options - The native provider and its admission capture
	 */
	constructor(options: ContinuousProviderOptions) { this.#options = options }
	/** Returns the underlying provider identity. */
	get id(): string { return this.#options.provider.id }
	/** Returns the underlying provider name. */
	get name(): string { return this.#options.provider.name }
	/** Returns the underlying thinking replay policy. */
	get replay() { return this.#options.provider.replay }
	/** Captures the native input before generating the complete turn.
	 * @param messages - The exact native messages
	 * @param signal - The caller cancellation signal
	 * @param tools - The advertised tool definitions
	 * @param options - Per-call generation options
	 * @returns The complete provider result
	 */
	async generate(messages: readonly Message[], signal: AbortSignal, tools?: readonly ToolDefinition[], options?: ProviderStreamOptions): Promise<ProviderResult> {
		this.#options.prepare(messages)
		return await this.#options.provider.generate(messages, signal, tools, options)
	}
	/** Captures the native input before streaming the turn.
	 * @param messages - The exact native messages
	 * @param signal - The caller cancellation signal
	 * @param tools - The advertised tool definitions
	 * @param options - Per-call generation options
	 * @returns The native deltas and terminal result
	 */
	async *stream(messages: readonly Message[], signal: AbortSignal, tools?: readonly ToolDefinition[], options?: ProviderStreamOptions): AsyncGenerator<ProviderDelta, ProviderResult> {
		this.#options.prepare(messages)
		return yield* this.#options.provider.stream(messages, signal, tools, options)
	}
}
