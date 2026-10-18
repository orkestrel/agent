import type {
	AgentProviderInput,
	AgentProviderInterface,
	ProviderDelta,
	ProviderIncrement,
	ProviderOptions,
	ProviderParserInterface,
	ProviderRequest,
	ProviderResult,
	ProviderStreamOptions,
	ThinkSplitterInterface,
} from './types.js'
import type { Message, ThinkingReplay } from '../types.js'
import type { ToolDefinition } from '@orkestrel/tool'
import { Timeout } from '@orkestrel/timeout'
import { DEFAULT_PROVIDER_TIMEOUT } from './constants.js'
import { ProviderAbortError, ProviderError } from './errors.js'
import { ThinkSplitter } from './ThinkSplitter.js'
import { buildProviderResult, readChunks, buildProviderHeaders, readFailure } from './helpers.js'
import { joinThinking } from '../helpers.js'

/**
 * Implements bounded HTTP streaming and result assembly behind concrete wire seams.
 *
 * @remarks
 * Every call owns its parser, splitter, deadline, and accumulation. Success bodies
 * have no size limit. A qwen3 implicit-open reclassification corrects the final
 * content while content deltas already yielded cannot be recalled. A subclass fills
 * `name`, `frame`, `encode`, `read`, and `finish`; the constructor takes the `split`
 * and `strict` switches to control reasoning separation and settled-result requirements.
 * The `replay` input names which stored thinking the agent and relay send back. Default: `'none'`.
 *
 * @example Writing a provider for a new wire
 * ```ts
 * import type {
 * 	ProviderIncrement,
 * 	ProviderOptions,
 * 	ProviderParserInterface,
 * 	ProviderRequest,
 * } from '@orkestrel/agent'
 * import { AgentProvider } from '@orkestrel/agent'
 *
 * class TextFrame implements ProviderParserInterface<string> {
 * 	parse(chunk: string): readonly string[] {
 * 		return [chunk]
 * 	}
 * 	clear(): void {} // Raw text retains no framing state.
 * }
 *
 * interface TextOptions extends ProviderOptions {
 * 	readonly url: string
 * }
 *
 * class TextProvider extends AgentProvider<string> {
 * 	readonly name = 'text'
 * 	constructor(options: TextOptions) {
 * 		super({ ...options, path: '/generate' })
 * 	}
 * 	frame(): ProviderParserInterface<string> {
 * 		return new TextFrame()
 * 	}
 * 	encode(request: ProviderRequest): object {
 * 		return { messages: request.messages }
 * 	}
 * 	read(record: string): ProviderIncrement {
 * 		return { content: record, thinking: '', tools: [] }
 * 	}
 * 	finish(_parser: ProviderParserInterface<string>): readonly string[] {
 * 		return [] // Raw text retains no records at end of input.
 * 	}
 * }
 * ```
 */
export abstract class AgentProvider<
	TRecord = Readonly<Record<string, unknown>>,
> implements AgentProviderInterface<TRecord> {
	readonly #id: string
	readonly #replay: ThinkingReplay
	readonly #url: string
	readonly #path: string
	readonly #timeout: number
	readonly #transport: typeof globalThis.fetch
	readonly #headers: ProviderOptions['headers']
	readonly #split: boolean
	readonly #strict: boolean

	constructor(input: AgentProviderInput) {
		this.#id = crypto.randomUUID()
		this.#replay = input.replay ?? 'none'
		this.#url = input.url
		this.#path = input.path ?? ''
		this.#timeout = input.timeout ?? DEFAULT_PROVIDER_TIMEOUT
		this.#transport = input.fetch ?? globalThis.fetch.bind(globalThis)
		this.#headers = input.headers
		this.#split = input.split ?? true
		this.#strict = input.strict ?? false
	}

	/** Identifies the concrete backend. */
	abstract readonly name: string

	/** Exposes the instance's minted UUID. */
	get id(): string {
		return this.#id
	}

	/** Names which stored assistant thinking the agent and relay send back. */
	get replay(): ThinkingReplay {
		return this.#replay
	}

	/** Creates fresh framing state for the call. */
	abstract frame(): ProviderParserInterface<TRecord>
	/** Projects a domain request onto the concrete protocol's wire body. */
	abstract encode(request: ProviderRequest): object
	/** Decodes a framed record into a turn increment. */
	abstract read(record: TRecord): ProviderIncrement
	/** Returns any records retained at end of input. */
	abstract finish(parser: ProviderParserInterface<TRecord>): readonly TRecord[]

	/**
	 * Generates a complete turn by draining the shared stream engine.
	 *
	 * @param messages - The conversation turns
	 * @param signal - The caller's cancellation bound
	 * @param tools - The advertised tool definitions
	 * @param options - The per-call generation configuration
	 * @returns The terminal stream result
	 */
	async generate(
		messages: readonly Message[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		options?: ProviderStreamOptions,
	): Promise<ProviderResult> {
		const stream = this.stream(messages, signal, tools, options)
		for (;;) {
			const step = await stream.next()
			if (step.done) return step.value
		}
	}

	/**
	 * Streams decoded deltas and returns the authoritative or assembled turn result.
	 *
	 * @param messages - The conversation turns
	 * @param signal - The caller's cancellation bound
	 * @param tools - The advertised tool definitions
	 * @param options - The per-call generation configuration
	 * @returns Content and native thinking deltas followed by the settled result
	 * @throws ProviderAbortError Thrown when the combined cancellation bound fires
	 * @throws ProviderError Thrown when the response is non-OK, the response has no body, a wire record
	 * is malformed or carries an upstream failure, or a strict stream ends without a settled result
	 */
	async *stream(
		messages: readonly Message[],
		signal: AbortSignal,
		tools?: readonly ToolDefinition[],
		options?: ProviderStreamOptions,
	): AsyncGenerator<ProviderDelta, ProviderResult> {
		if (signal.aborted) throw new ProviderAbortError({ content: '' })
		const timeout = new Timeout({ ms: this.#timeout })
		timeout.start()
		const combined = AbortSignal.any([timeout.signal, signal])
		try {
			const parser = this.#frame(combined)
			try {
				return yield* this.#read(parser, messages, tools, options, combined)
			} finally {
				parser.clear()
			}
		} finally {
			timeout.clear()
		}
	}

	// Creates the call's framing state; a failure that raced the cancel becomes the empty partial.
	#frame(combined: AbortSignal): ProviderParserInterface<TRecord> {
		try {
			return this.frame()
		} catch (error) {
			throw this.#translate(error, combined, undefined, [])
		}
	}

	// Requests, frames, folds, and settles one call. Each decoded increment joins a local list
	// before its deltas are exposed, so a cancel during a yield assembles from what the body produced.
	async *#read(
		parser: ProviderParserInterface<TRecord>,
		messages: readonly Message[],
		tools: readonly ToolDefinition[] | undefined,
		options: ProviderStreamOptions | undefined,
		combined: AbortSignal,
	): AsyncGenerator<ProviderDelta, ProviderResult> {
		const splitter = this.#split ? new ThinkSplitter() : undefined
		const increments: ProviderIncrement[] = []
		try {
			const response = await this.#request(
				{
					messages,
					...(tools === undefined ? {} : { tools }),
					...(options === undefined ? {} : { options }),
				},
				combined,
			)
			if (response.body === null) {
				throw new ProviderError('PROTOCOL', 'provider error: no response body')
			}
			for await (const chunk of readChunks(response.body, combined)) {
				combined.throwIfAborted()
				for (const record of parser.parse(chunk)) {
					const increment = this.read(record)
					increments.push(increment)
					if (increment.result === undefined) yield* this.#emit(increment, splitter, combined)
					combined.throwIfAborted()
					if (increment.result !== undefined) return increment.result
				}
			}
			combined.throwIfAborted()
			for (const record of this.finish(parser)) {
				const increment = this.read(record)
				increments.push(increment)
				if (increment.result === undefined) yield* this.#emit(increment, splitter, combined)
				combined.throwIfAborted()
				if (increment.result !== undefined) return increment.result
			}
			const tail = splitter?.flush() ?? ''
			if (tail.length > 0) yield { channel: 'content', text: tail }
			combined.throwIfAborted()
			if (this.#strict) {
				throw new ProviderError('PROTOCOL', 'provider error: missing settled result')
			}
			return this.#assemble(splitter, increments)
		} catch (error) {
			throw this.#translate(error, combined, splitter, increments)
		}
	}

	// Surfaces one increment's deltas: the split content, then — unless the call was cancelled in
	// between — its native thinking.
	*#emit(
		increment: ProviderIncrement,
		splitter: ThinkSplitterInterface | undefined,
		signal: AbortSignal,
	): Generator<ProviderDelta> {
		const content = splitter?.split(increment.content) ?? increment.content
		if (content.length > 0) yield { channel: 'content', text: content }
		signal.throwIfAborted()
		if (increment.thinking.length > 0) yield { channel: 'thinking', text: increment.thinking }
	}

	// The error a failed call throws: a cancel becomes a ProviderAbortError carrying the partial
	// assembled so far (a throw that raced the cancel is its cause); any other failure is itself.
	#translate(
		error: unknown,
		combined: AbortSignal,
		splitter: ThinkSplitterInterface | undefined,
		increments: readonly ProviderIncrement[],
	): unknown {
		if (!combined.aborted) return error
		splitter?.flush()
		return new ProviderAbortError(
			this.#assemble(splitter, increments),
			error === combined.reason ? undefined : { cause: error },
		)
	}

	// Both exits assemble alike, so an aborted call's partial carries what a settled call would. A
	// settled-result increment replaces the fold.
	#assemble(
		splitter: ThinkSplitterInterface | undefined,
		increments: readonly ProviderIncrement[],
	): ProviderResult {
		const last = increments.at(-1)
		const folded = last?.result === undefined ? increments : [last]
		return buildProviderResult(
			splitter?.content ?? folded.map((one) => one.content).join(''),
			joinThinking(splitter?.thinking, folded.map((one) => one.thinking).join('')),
			folded.flatMap((one) => one.tools),
			folded.findLast((one) => one.usage !== undefined)?.usage,
			folded.findLast((one) => one.truncated !== undefined)?.truncated,
		)
	}

	// Send one request and translate its HTTP failure into the shared provider taxonomy.
	async #request(request: ProviderRequest, signal: AbortSignal): Promise<Response> {
		const headers = await buildProviderHeaders(this.#headers, signal)
		signal.throwIfAborted()
		const response = await this.#transport(this.#url + this.#path, {
			method: 'POST',
			headers,
			body: JSON.stringify(this.encode(request)),
			signal,
		})
		if (!response.ok) {
			const { message, ...options } = await readFailure(response, 'provider error:', signal)
			throw new ProviderError('HTTP', message, options)
		}
		return response
	}
}
