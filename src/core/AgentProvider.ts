import type { ToolDefinition } from '@orkestrel/tool'
import type {
	AgentProviderInput,
	AgentProviderInterface,
	ContextFormat,
	Message,
	ProviderDelta,
	ProviderIncrement,
	ProviderOptions,
	ProviderParserInterface,
	ProviderRequest,
	ProviderResult,
	ProviderStreamOptions,
	ThinkSplitterInterface,
} from './types.js'
import { Timeout } from '@orkestrel/timeout'
import { DEFAULT_PROVIDER_TIMEOUT, MAX_ERROR_BODY_LENGTH } from './constants.js'
import { ProviderAbortError, ProviderError } from './errors.js'
import { createThinkSplitter } from './factories.js'
import { buildProviderResult, joinThinking, readChunks, readText } from './helpers.js'

/**
 * Implements bounded HTTP streaming and result assembly behind concrete wire seams.
 *
 * @remarks
 * Every call owns its parser, splitter, deadline, and accumulation. Success bodies
 * have no size limit. A qwen3 implicit-open reclassification corrects the final
 * content while content deltas already yielded cannot be recalled. A subclass fills
 * `name`, `frame`, `body`, `read`, and `finish`; the constructor takes the `split`
 * and `strict` switches to control reasoning separation and settled-result requirements.
 *
 * @example
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
 * 	body(request: ProviderRequest): object {
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
	readonly #url: string
	readonly #path: string
	readonly #timeout: number
	readonly #transport: typeof globalThis.fetch
	readonly #headers: ProviderOptions['headers']
	readonly #format: ContextFormat | undefined
	readonly #split: boolean
	readonly #strict: boolean

	constructor(input: AgentProviderInput) {
		this.#id = crypto.randomUUID()
		this.#url = input.url
		this.#path = input.path ?? ''
		this.#timeout = input.timeout ?? DEFAULT_PROVIDER_TIMEOUT
		this.#transport = input.fetch ?? globalThis.fetch.bind(globalThis)
		this.#headers = input.headers
		this.#format = input.format
		this.#split = input.split ?? true
		this.#strict = input.strict ?? false
	}

	/** Identifies the concrete backend. */
	abstract readonly name: string

	/** Exposes the instance's minted UUID. */
	get id(): string {
		return this.#id
	}

	/** Exposes the context framing exactly as supplied. */
	get format(): ContextFormat | undefined {
		return this.#format
	}

	/** Creates fresh framing state for the call. */
	abstract frame(): ProviderParserInterface<TRecord>
	/** Projects a domain request onto the concrete protocol's wire body. */
	abstract body(request: ProviderRequest): object
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
		let step = await stream.next()
		while (!step.done) step = await stream.next()
		return step.value
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
	 * @throws ProviderError Thrown for an HTTP or protocol failure
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
		let parser: ProviderParserInterface<TRecord> | undefined
		let splitter: ThinkSplitterInterface | undefined
		let state: ProviderIncrement = { content: '', thinking: '', tools: [] }
		try {
			parser = this.frame()
			splitter = this.#split ? createThinkSplitter() : undefined
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
					yield* this.#fold(record, state, splitter, combined, (increment) => {
						state = increment
					})
					combined.throwIfAborted()
					if (state.result !== undefined) return state.result
				}
			}
			combined.throwIfAborted()
			for (const record of this.finish(parser)) {
				yield* this.#fold(record, state, splitter, combined, (increment) => {
					state = increment
				})
				combined.throwIfAborted()
				if (state.result !== undefined) return state.result
			}
			const tail = splitter?.flush() ?? ''
			if (tail.length > 0) yield { channel: 'content', text: tail }
			combined.throwIfAborted()
			if (this.#strict)
				throw new ProviderError('PROTOCOL', 'provider error: missing settled result')
			return buildProviderResult(
				splitter?.content ?? state.content,
				joinThinking(splitter?.thinking, state.thinking),
				state.tools,
				state.usage,
			)
		} catch (error) {
			if (combined.aborted) {
				splitter?.flush()
				const partial = buildProviderResult(
					splitter?.content ?? state.content,
					joinThinking(splitter?.thinking, state.thinking),
					state.tools,
					state.usage,
				)
				// A throw that raced the cancel is the call's real failure, so it rides as the cause.
				throw new ProviderAbortError(
					partial,
					error === combined.reason ? undefined : { cause: error },
				)
			}
			throw error
		} finally {
			try {
				parser?.clear()
			} finally {
				timeout.clear()
			}
		}
	}

	// Fold every record before exposing deltas, so resumed cancellation retains its contribution.
	*#fold(
		record: TRecord,
		previous: ProviderIncrement,
		splitter: ThinkSplitterInterface | undefined,
		signal: AbortSignal,
		commit: (increment: ProviderIncrement) => void,
	): Generator<ProviderDelta> {
		const increment = this.read(record)
		if (increment.result !== undefined) {
			commit(increment)
			return
		}
		const content = splitter?.split(increment.content) ?? increment.content
		const usage = increment.usage ?? previous.usage
		const state: ProviderIncrement = {
			content: previous.content + increment.content,
			thinking: previous.thinking + increment.thinking,
			tools: [...previous.tools, ...increment.tools],
			...(usage === undefined ? {} : { usage }),
		}
		commit(state)
		if (content.length > 0) yield { channel: 'content', text: content }
		signal.throwIfAborted()
		if (increment.thinking.length > 0) yield { channel: 'thinking', text: increment.thinking }
	}

	// Send one request and translate its HTTP failure into the shared provider taxonomy.
	async #request(request: ProviderRequest, signal: AbortSignal): Promise<Response> {
		const headers = await this.#requestHeaders(signal)
		signal.throwIfAborted()
		const response = await this.#transport(this.#url + this.#path, {
			method: 'POST',
			headers,
			body: JSON.stringify(this.body(request)),
			signal,
		})
		if (!response.ok) {
			let detail: string
			try {
				detail =
					response.body === null
						? ''
						: (await readText(response.body, MAX_ERROR_BODY_LENGTH, signal)).text
			} catch (cause) {
				throw new ProviderError(
					'HTTP',
					`provider error: ${response.status} - (error body unavailable)`,
					{ status: response.status, cause },
				)
			}
			signal.throwIfAborted()
			throw new ProviderError('HTTP', `provider error: ${response.status} - ${detail}`, {
				status: response.status,
			})
		}
		return response
	}

	// Await the hook inside the call's cancellation bound and release its listener on exit.
	async #requestHeaders(signal: AbortSignal): Promise<Headers> {
		const headers = new Headers({ 'Content-Type': 'application/json' })
		if (this.#headers === undefined) return headers
		const cleanup = new AbortController()
		const aborted = Promise.withResolvers<never>()
		signal.addEventListener('abort', () => aborted.reject(signal.reason), {
			once: true,
			signal: cleanup.signal,
		})
		try {
			signal.throwIfAborted()
			const hook = this.#headers
			const entries = await Promise.race([
				Promise.resolve().then(() => hook(signal)),
				aborted.promise,
			])
			for (const [key, value] of Object.entries(entries)) headers.set(key, value)
			return headers
		} finally {
			cleanup.abort()
		}
	}
}
