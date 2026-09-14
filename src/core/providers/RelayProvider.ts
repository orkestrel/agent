import type {
	ProviderIncrement,
	ProviderParserInterface,
	ProviderRequest,
	RelayProviderOptions,
} from '../types.js'
import { cloneJSONValue } from '@orkestrel/contract'
import { AgentProvider } from '../AgentProvider.js'
import { providerRequestContract, relayFrameContract } from '../contracts.js'
import { ProviderAbortError, ProviderError } from '../errors.js'

/**
 * Carries provider calls over an authenticated NDJSON relay endpoint.
 *
 * @remarks
 * The `ToolCall.caller` member never crosses the hop. Non-JSON arguments, parameters,
 * and schemas are refused before fetching. A remote abort reconstructs a
 * `ProviderAbortError` instance without aborting the local signal; the `Agent` runtime
 * treats that instance as an error unless its own bound signal is aborted.
 * Content is preserved verbatim, including literal thinking tags.
 * A refusal reaches the browser as a `ProviderError` instance with the `HTTP` code and status.
 *
 * @example
 * ```ts
 * import type { ProviderInterface } from '@orkestrel/agent'
 * import { createRelay, RelayProvider } from '@orkestrel/agent'
 * // The browser application supplies this parser dependency.
 * import { createNDJSONParser } from '@orkestrel/ndjson'
 * import { createDispatcher } from '@orkestrel/router'
 *
 * export function connectRelay(upstream: ProviderInterface, bearer: string) {
 * 	const handler = createRelay({
 * 		provider: upstream,
 * 		authorize: (request) => request.headers.get('authorization') === `Bearer ${bearer}`,
 * 	})
 * 	const dispatcher = createDispatcher({
 * 		routes: [{ method: 'POST', path: '/relay', handler }],
 * 	})
 * 	const browser = new RelayProvider({
 * 		url: 'https://relay.example/relay',
 * 		parser: createNDJSONParser,
 * 		headers: () => ({ authorization: `Bearer ${bearer}` }),
 * 		fetch: (input, init) => dispatcher.handle(new Request(input, init), undefined),
 * 	})
 * 	return { browser, dispatcher }
 * }
 * ```
 */
export class RelayProvider extends AgentProvider {
	readonly #parser: () => ProviderParserInterface

	constructor(options: RelayProviderOptions) {
		const { url, timeout, fetch, headers, format } = options
		super({
			url,
			split: false,
			strict: true,
			...(timeout === undefined ? {} : { timeout }),
			...(fetch === undefined ? {} : { fetch }),
			...(headers === undefined ? {} : { headers }),
			...(format === undefined ? {} : { format }),
		})
		this.#parser = options.parser
	}

	/** Identifies the relay backend. */
	readonly name = 'relay'

	/** Creates fresh framing state for each response. */
	frame(): ProviderParserInterface {
		return this.#parser()
	}

	/**
	 * Projects declared request fields and refuses values the JSON wire cannot carry.
	 *
	 * @param request - The domain conversation and call configuration
	 * @returns The validated wire request with caller context omitted
	 * @throws {ProviderError} Thrown when the projected request is not JSON
	 */
	body(request: ProviderRequest): object {
		try {
			const projected = {
				messages: request.messages.map((message) => ({
					id: message.id,
					role: message.role,
					content: message.content,
					...(message.calls === undefined
						? {}
						: {
								calls: message.calls.map((call) => ({
									id: call.id,
									name: call.name,
									arguments: call.arguments,
								})),
							}),
					...(message.images === undefined ? {} : { images: message.images }),
				})),
				...(request.tools === undefined
					? {}
					: {
							tools: request.tools.map((tool) => ({
								name: tool.name,
								...(tool.description === undefined ? {} : { description: tool.description }),
								...(tool.parameters === undefined ? {} : { parameters: tool.parameters }),
							})),
						}),
				...(request.options === undefined
					? {}
					: {
							options: {
								...(request.options.think === undefined ? {} : { think: request.options.think }),
								...(request.options.schema === undefined ? {} : { schema: request.options.schema }),
							},
						}),
			}
			if (
				projected.tools?.some((tool) => typeof tool.parameters?.toJSON === 'function') ||
				typeof projected.options?.schema?.toJSON === 'function'
			) {
				throw new ProviderError('PROTOCOL', 'relay request is not JSON')
			}
			const snapshot = cloneJSONValue(projected)
			if (!providerRequestContract.is(snapshot)) {
				throw new ProviderError('PROTOCOL', 'relay request is not JSON')
			}
			return snapshot
		} catch {
			throw new ProviderError('PROTOCOL', 'relay request is not JSON')
		}
	}

	/**
	 * Validates a relay frame and translates its channel into the shared stream engine.
	 *
	 * @param record - The framed wire record
	 * @returns A delta contribution or authoritative result
	 * @throws {ProviderAbortError} Thrown for a remote abort carrying its partial
	 * @throws {ProviderError} Thrown for a malformed frame or remote provider failure
	 */
	read(record: Readonly<Record<string, unknown>>): ProviderIncrement {
		if (!relayFrameContract.is(record)) {
			throw new ProviderError('PROTOCOL', 'invalid relay frame')
		}
		switch (record.channel) {
			case 'content':
				return { content: record.text, thinking: '', tools: [] }
			case 'thinking':
				return { content: '', thinking: record.text, tools: [] }
			case 'result':
				return { content: '', thinking: '', tools: [], result: record.result }
			case 'abort':
				throw new ProviderAbortError(record.partial)
			case 'error':
				throw new ProviderError('PROVIDER', record.message)
		}
	}

	/**
	 * Recovers an unterminated final frame by completing its NDJSON line.
	 *
	 * @param parser - The call's retained framing state
	 * @returns Records completed by the final newline
	 */
	finish(parser: ProviderParserInterface): ReadonlyArray<Readonly<Record<string, unknown>>> {
		return parser.parse('\n')
	}
}
