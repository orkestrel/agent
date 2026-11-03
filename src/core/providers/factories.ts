import type {
	ProviderInterface,
	RelayHandler,
	RelayOptions,
	RelayProviderOptions,
	RelaySystemOptions,
	RelayToolOptions,
	SystemOneJudgeOptions,
	ThinkSplitterInterface,
} from './types.js'
import type { JudgeInterface } from '../types.js'
import { attempt, cloneJSONValue, parseJSONAs, preview } from '@orkestrel/contract'
import {
	DEFAULT_RELAY_LIMIT,
	INVALID_RELAY_STATUS,
	OVERSIZED_RELAY_STATUS,
	REFUSED_RELAY_CONTENT_TYPE,
	REFUSED_RELAY_STATUS,
	UNAUTHORIZED_RELAY_STATUS,
	UPSTREAM_RELAY_STATUS,
} from './constants.js'
import { buildRelayRequest, describeRelayRefusal, readBodyText, requestToRelay } from './helpers.js'
import { ProviderError } from './errors.js'
import { providerRequestContract } from './contracts.js'
import { RelayStream } from './RelayStream.js'
import { RelayProvider } from './RelayProvider.js'
import { ThinkSplitter } from './ThinkSplitter.js'
import { SystemOneJudge } from './SystemOneJudge.js'

/**
 * Creates an authorized relay handler that validates a bounded JSON request before streaming.
 *
 * @remarks
 * Answers with the `401` status when authorization refuses or throws, the `400`
 * status when the body is missing, unreadable, or invalid, the `413` status when
 * the body fills its byte budget or the inbound read is aborted, the `422` status when
 * the request carries a page `system` message or tool definition that `options.system` or
 * `options.tools` does not admit, and the `502` status when the upstream provider call cannot
 * be constructed. A `422` refusal carries one `text/plain` line per refused member, as
 * {@link describeRelayRefusal} writes it, and the page reads at most `MAX_ERROR_BODY_LENGTH`
 * bytes of that body into its error message; every other refusal carries no body. An admitted
 * request is forwarded as {@link buildRelayRequest} builds it, the server's text first, and
 * `limit` counts only the inbound bytes. The handler copies `options.system` and the tool
 * definitions at construction, so a later change to either has no effect.
 *
 * @param options - The upstream provider, authorization decision, optional byte budget, and
 * system turn and tool definition policy
 * @returns A fetch-standard handler suitable for a router
 * @throws {ProviderError} Thrown with the `PROTOCOL` code when `options.tools.definitions` is not
 * JSON or repeats a name
 * @example Mounting the relay on your server
 * ```ts
 * import type { ProviderInterface } from '@orkestrel/agent'
 * import { createRelay } from '@orkestrel/agent'
 * import { createDispatcher } from '@orkestrel/router'
 * import { createServer } from '@orkestrel/server'
 *
 * declare const upstream: ProviderInterface // the server-side provider holding the credential
 * declare const bearer: string
 *
 * const handler = createRelay({
 * 	provider: upstream,
 * 	authorize: (request) => request.headers.get('authorization') === `Bearer ${bearer}`,
 * })
 * const dispatcher = createDispatcher({
 * 	routes: [{ method: 'POST', path: '/relay', handler }],
 * })
 *
 * export function serve(request: Request): Promise<Response> {
 * 	return dispatcher.handle(request, undefined)
 * }
 *
 * const server = createServer({ dispatcher, state: () => undefined })
 * await server.start()
 * process.on('SIGTERM', () => server.stop()) // signal cancellation, drain, then close the listener
 * ```
 */
export function createRelay(options: RelayOptions): RelayHandler {
	const { provider, authorize, limit } = options
	const system: RelaySystemOptions = { ...options.system }
	const { definitions, accept } = options.tools ?? {}
	const snapshot = attempt(() =>
		cloneJSONValue(requestToRelay({ messages: [], tools: definitions ?? [] })),
	)
	if (!snapshot.success) {
		throw new ProviderError('PROTOCOL', 'relay tool definitions are not JSON', {
			cause: snapshot.error,
		})
	}
	if (!providerRequestContract.is(snapshot.value)) {
		throw new ProviderError('PROTOCOL', 'relay tool definitions are not JSON')
	}
	const owned = snapshot.value.tools ?? []
	const names = new Set<string>()
	for (const tool of owned) {
		if (names.has(tool.name)) {
			throw new ProviderError(
				'PROTOCOL',
				`relay tool definitions repeat the name ${preview(tool.name)}`,
			)
		}
		names.add(tool.name)
	}
	const tools: RelayToolOptions = {
		...(definitions === undefined ? {} : { definitions: owned }),
		...(accept === undefined ? {} : { accept }),
	}
	return async (request) => {
		try {
			if ((await authorize(request)) !== true) {
				return new Response(undefined, { status: UNAUTHORIZED_RELAY_STATUS })
			}
		} catch {
			return new Response(undefined, { status: UNAUTHORIZED_RELAY_STATUS })
		}
		if (request.body === null) return new Response(undefined, { status: INVALID_RELAY_STATUS })
		const read = await readBodyText(
			request.body,
			limit ?? DEFAULT_RELAY_LIMIT,
			request.signal,
		).catch(() => undefined)
		if (read === undefined) {
			return new Response(undefined, {
				status: request.signal.aborted ? OVERSIZED_RELAY_STATUS : INVALID_RELAY_STATUS,
			})
		}
		if (!read.complete) return new Response(undefined, { status: OVERSIZED_RELAY_STATUS })
		const parsed = parseJSONAs(read.text, providerRequestContract.is)
		if (parsed === undefined) return new Response(undefined, { status: INVALID_RELAY_STATUS })
		const built = buildRelayRequest(parsed, { system, tools })
		if (!built.success) {
			return new Response(built.error.map(describeRelayRefusal).join('\n'), {
				status: REFUSED_RELAY_STATUS,
				headers: { 'content-type': REFUSED_RELAY_CONTENT_TYPE, 'cache-control': 'no-store' },
			})
		}
		try {
			return new RelayStream({ provider, request: built.value, signal: request.signal }).response
		} catch {
			return new Response(undefined, { status: UPSTREAM_RELAY_STATUS })
		}
	}
}

/**
 * Creates a provider that carries calls through a relay endpoint.
 *
 * @remarks
 * This is the browser end alone. {@link createRelay} mounts the server end, and its example
 * is the server half this one pairs with.
 *
 * @param options - The endpoint, optional parser factory, and HTTP call configuration
 * @returns The relay provider behind the shared provider interface; construct
 * {@link RelayProvider} directly to reach its wire seams
 * @example Reaching the relay from the browser
 * ```ts
 * import type { ProviderInterface } from '@orkestrel/agent'
 * import { createRelayProvider } from '@orkestrel/agent'
 * import { createAbort } from '@orkestrel/abort'
 *
 * declare const bearer: string
 * const abort = createAbort()
 * const messages = [{ id: '1', role: 'user', content: 'Say hello.' }] as const
 *
 * const browser: ProviderInterface = createRelayProvider({
 * 	url: 'https://app.example/relay',
 * 	headers: () => ({ authorization: `Bearer ${bearer}` }),
 * })
 * const result = await browser.generate(messages, abort.signal) // a ProviderResult like a local provider's
 * ```
 */
export function createRelayProvider(options: RelayProviderOptions): ProviderInterface {
	return new RelayProvider(options)
}

/**
 * Creates a fresh stream-stateful `<think>` separator — a {@link ThinkSplitterInterface} that
 * splits a thinking model's in-content `<think>…</think>` reasoning spans away from the answer,
 * delta by delta, so a provider yields clean content alone and surfaces the accumulated
 * reasoning as {@link import('./types.js').ProviderResult.thinking}. One splitter serves one
 * stream.
 *
 * @remarks
 * Feed each raw wire delta through `split(delta)` (it returns the clean content to
 * surface — possibly `''` mid-think) and settle the stream end with `flush()` (a held
 * partial open tag that never completed returns as final content; an unclosed think
 * span lands on `thinking`). Tags split across deltas are held back until
 * disambiguated, multiple spans accumulate in order, and a nested-looking `<think>`
 * inside an open span is thinking text. One splitter serves one stream — create
 * a fresh one per provider call.
 *
 * @returns A fresh {@link ThinkSplitterInterface} (state empty, outside any span)
 *
 * @example
 * ```ts
 * import { createThinkSplitter } from '@orkestrel/agent'
 *
 * const splitter = createThinkSplitter()
 * const clean = splitter.split('<think>plan the answer</think>Here it is.')
 * clean // 'Here it is.'
 * splitter.thinking // 'plan the answer'
 * ```
 */
export function createThinkSplitter(): ThinkSplitterInterface {
	return new ThinkSplitter()
}

/**
 * Creates a judge that sends every question through the configured System One server.
 *
 * @param options - The server origin, model, and optional transport, headers, and timeout
 * @returns The configured judge behind its shared interface
 * @example
 * ```ts
 * const judge = createSystemOneJudge({ url: 'http://localhost:11434', model: 'tev1:0.8b' })
 * ```
 */
export function createSystemOneJudge(options: SystemOneJudgeOptions): JudgeInterface {
	return new SystemOneJudge(options)
}
