import type { ContextFormat, Message, ProviderIncrement } from '@src/core'
import { getEventListeners } from 'node:events'
import {
	DEFAULT_PROVIDER_TIMEOUT,
	MAX_ERROR_BODY_LENGTH,
	ProviderAbortError,
	ProviderError,
	isProviderAbortError,
	isProviderError,
} from '@src/core'
import { requireValue, waitForDelay } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import {
	createRefusingTransport,
	createStreamingTransport,
	drainProvider,
	RecordedBody,
	RecordedTransport,
	RecordedHeaders,
	rejectTransportOnAbort,
	recordGlobalTransport,
	ScriptedWire,
} from '../../setup.js'

describe('AgentProvider — identity, transport, and request composition', () => {
	it('mints an instance UUID and exposes exact optional context framing', () => {
		const format: ContextFormat = { instructions: { open: 'instructions' } }
		const provider = new ScriptedWire({ url: 'https://provider.test', format })
		const other = new ScriptedWire({ url: 'https://provider.test' })
		expect(provider.id).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/)
		expect(provider.id).not.toBe(other.id)
		expect(provider.format).toBe(format)
		expect(other.format).toBeUndefined()
		expect(DEFAULT_PROVIDER_TIMEOUT).toBe(120_000)
		expect(MAX_ERROR_BODY_LENGTH).toBe(2048)
	})

	it('binds the default global transport to its global receiver', async () => {
		const original = globalThis.fetch
		globalThis.fetch = recordGlobalTransport
		try {
			const provider = new ScriptedWire({ url: 'https://provider.test' })
			expect(await provider.generate([], new AbortController().signal)).toEqual({
				content: 'global',
			})
		} finally {
			globalThis.fetch = original
		}
	})

	it('posts the projected body and awaits case-insensitive header overrides', async () => {
		const transport = new RecordedTransport(() => new Response('c:ok'))
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			path: '/chat',
			fetch: transport.fetch,
			headers: async () => ({
				authorization: 'Bearer fixture',
				'content-type': 'application/custom',
			}),
		})
		const messages = [{ id: '1', role: 'user', content: 'hi' }] satisfies readonly Message[]
		const tools = [{ name: 'lookup', parameters: { query: 'string' } }]
		const options = { think: true, schema: { answer: 'string' } }
		expect(await provider.generate(messages, new AbortController().signal, tools, options)).toEqual(
			{ content: 'ok' },
		)
		expect(transport.requests).toHaveLength(1)
		const request = requireValue(transport.requests[0])
		expect(request.url).toBe('https://provider.test/chat')
		expect(request.method).toBe('POST')
		expect(request.headers.get('content-type')).toBe('application/custom')
		expect(request.headers.get('authorization')).toBe('Bearer fixture')
		expect(await request.json()).toEqual({ messages, tools, options })
	})

	it('preserves the JSON content type when the hook adds only authentication', async () => {
		const transport = new RecordedTransport(() => new Response(''))
		await new ScriptedWire({
			url: 'https://provider.test',
			fetch: transport.fetch,
			headers: () => ({ Authorization: 'fixture' }),
		}).generate([], new AbortController().signal)
		expect(requireValue(transport.requests[0]).headers.get('content-type')).toBe('application/json')
	})
})

describe('AgentProvider — stream assembly and settled results', () => {
	it('assembles content, native reasoning, tool calls, and replacement usage', async () => {
		const records = new Map<string, ProviderIncrement>([
			[
				'u:first',
				{ content: '', thinking: '', tools: [], usage: { prompt: 1, completion: 2, total: 3 } },
			],
			[
				'x:first',
				{ content: '', thinking: '', tools: [{ id: 'a', name: 'lookup', arguments: {} }] },
			],
			[
				'x:next',
				{
					content: '',
					thinking: '',
					tools: [{ id: 'b', name: 'lookup', arguments: {} }],
					usage: { prompt: 2, completion: 4, total: 6 },
				},
			],
		])
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			records,
			fetch: createStreamingTransport([
				'c:<think>hidden</think>answer',
				't:native',
				'u:first',
				'x:first',
				'x:next',
				'c:!',
			]),
		})
		const actual = await drainProvider(provider.stream([], new AbortController().signal))
		expect(actual.deltas).toEqual([
			{ channel: 'content', text: 'answer' },
			{ channel: 'thinking', text: 'native' },
			{ channel: 'content', text: '!' },
		])
		expect(actual.result).toEqual({
			content: 'answer!',
			thinking: 'hidden\n\nnative',
			tools: [
				{ id: 'a', name: 'lookup', arguments: {} },
				{ id: 'b', name: 'lookup', arguments: {} },
			],
			usage: { prompt: 2, completion: 4, total: 6 },
		})
	})

	it('reclassifies implicit-open reasoning in the authoritative result', async () => {
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: createStreamingTransport(['c:reason', 'c:</think>answer']),
		})
		const actual = await drainProvider(provider.stream([], new AbortController().signal))
		expect(actual.deltas).toEqual([
			{ channel: 'content', text: 'reason' },
			{ channel: 'content', text: 'answer' },
		])
		expect(actual.result).toEqual({ content: 'answer', thinking: 'reason' })
	})

	it('flushes a held content tail as the final delta', async () => {
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: createStreamingTransport(['c:answer<thi']),
		})
		const actual = await drainProvider(provider.stream([], new AbortController().signal))
		expect(actual.deltas).toEqual([
			{ channel: 'content', text: 'answer' },
			{ channel: 'content', text: '<thi' },
		])
		expect(actual.result).toEqual({ content: 'answer<thi' })
	})

	it('preserves raw content verbatim when splitting is disabled', async () => {
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			split: false,
			fetch: createStreamingTransport(['c:<think>raw</think>answer<thi']),
		})
		const actual = await drainProvider(provider.stream([], new AbortController().signal))
		expect(actual).toEqual({
			deltas: [{ channel: 'content', text: '<think>raw</think>answer<thi' }],
			result: { content: '<think>raw</think>answer<thi' },
		})
	})

	it('feeds a buffered record through finish and clears the parser', async () => {
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			buffered: true,
			fetch: createStreamingTransport(['c:an', 'swer']),
		})
		expect(await provider.generate([], new AbortController().signal)).toEqual({ content: 'answer' })
		expect(requireValue(provider.parsers[0]).cleared).toBe(true)
	})

	it('decodes a multibyte character split between byte chunks', async () => {
		const bytes = new TextEncoder().encode('c:🌍')
		const body = new RecordedBody([bytes.subarray(0, 3), bytes.subarray(3)])
		const transport = new RecordedTransport(() => new Response(body.stream))
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			buffered: true,
			fetch: transport.fetch,
		})
		expect(await provider.generate([], new AbortController().signal)).toEqual({ content: '🌍' })
	})

	it('returns a settled result unchanged without folding its duplicate fields', async () => {
		const result = { content: 'authoritative', usage: { prompt: 1, completion: 1, total: 2 } }
		const records = new Map<string, ProviderIncrement>([
			['r:done', { content: 'duplicate', thinking: '', tools: [], result }],
		])
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			records,
			strict: true,
			fetch: createStreamingTransport(['c:prior', 'r:done']),
		})
		const actual = await drainProvider(provider.stream([], new AbortController().signal))
		expect(actual.result).toBe(result)
		expect(actual.deltas).toEqual([{ channel: 'content', text: 'prior' }])
	})

	it('accepts a settled result retained by finish', async () => {
		const result = { content: 'terminal', thinking: 'reason' }
		const records = new Map<string, ProviderIncrement>([
			['r:done', { content: '', thinking: '', tools: [], result }],
		])
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			records,
			buffered: true,
			strict: true,
			fetch: createStreamingTransport(['r:', 'done']),
		})
		expect(await provider.generate([], new AbortController().signal)).toBe(result)
		expect(requireValue(provider.parsers[0]).cleared).toBe(true)
	})

	it('rejects strict end of input without a settled result', async () => {
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			strict: true,
			fetch: createStreamingTransport(['c:partial']),
		})
		await expect(provider.generate([], new AbortController().signal)).rejects.toMatchObject({
			code: 'PROTOCOL',
			message: 'provider error: missing settled result',
		})
	})

	it('leaves a poison record undecoded after a result and cancels the body', async () => {
		const result = { content: 'authoritative' }
		const body = new RecordedBody(
			['c:first', 'result', 'poison'].map((chunk) => new TextEncoder().encode(chunk)),
			false,
		)
		const transport = new RecordedTransport(() => new Response(body.stream))
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: transport.fetch,
			records: new Map<string, ProviderIncrement | Error>([
				['result', { content: '', thinking: '', tools: [], result }],
				['poison', new Error('decoded poison')],
			]),
		})
		const actual = await drainProvider(provider.stream([], new AbortController().signal))
		expect(actual.result).toBe(result)
		expect(actual.deltas).toEqual([{ channel: 'content', text: 'first' }])
		expect(provider.decoded).toEqual(['c:first', 'result'])
		expect(body.cancelled).toBe(true)
		expect(body.stream.locked).toBe(false)
	})
})

describe('AgentProvider — HTTP failures and the bounded error body', () => {
	it('bounds the error-body read and cancels its remainder', async () => {
		const body = new RecordedBody(
			Array.from({ length: 16 }, () => new TextEncoder().encode('x'.repeat(512))),
		)
		const transport = new RecordedTransport(() => new Response(body.stream, { status: 503 }))
		const provider = new ScriptedWire({ url: 'https://provider.test', fetch: transport.fetch })
		await expect(provider.generate([], new AbortController().signal)).rejects.toMatchObject({
			name: 'ProviderError',
			code: 'HTTP',
			status: 503,
			message: 'provider error: 503 - ' + 'x'.repeat(MAX_ERROR_BODY_LENGTH),
		})
		expect(body.bytes).toBe(MAX_ERROR_BODY_LENGTH)
		expect(body.cancelled).toBe(true)
		expect(body.stream.locked).toBe(false)
	})

	it('bounds decoded error bytes with the documented single-chunk overshoot', async () => {
		const body = new RecordedBody([new TextEncoder().encode('x'.repeat(8192))], false)
		const transport = new RecordedTransport(() => new Response(body.stream, { status: 503 }))
		const provider = new ScriptedWire({ url: 'https://provider.test', fetch: transport.fetch })
		await expect(provider.generate([], new AbortController().signal)).rejects.toMatchObject({
			code: 'HTTP',
			status: 503,
			message: 'provider error: 503 - ' + 'x'.repeat(MAX_ERROR_BODY_LENGTH),
		})
		expect(body.bytes).toBe(8192)
		expect(body.count).toBe(1)
		expect(body.cancelled).toBe(true)
		expect(body.stream.locked).toBe(false)
	})

	it('rejects an exact-bound stalled error body before the deadline', async () => {
		const body = new RecordedBody(
			[new TextEncoder().encode('x'.repeat(MAX_ERROR_BODY_LENGTH))],
			false,
		)
		const transport = new RecordedTransport(() => new Response(body.stream, { status: 503 }))
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: transport.fetch,
			timeout: 200,
		})
		await expect(provider.generate([], new AbortController().signal)).rejects.toMatchObject({
			name: 'ProviderError',
			code: 'HTTP',
			status: 503,
			message: 'provider error: 503 - ' + 'x'.repeat(MAX_ERROR_BODY_LENGTH),
		})
		expect(body.bytes).toBe(MAX_ERROR_BODY_LENGTH)
		expect(body.cancelled).toBe(true)
		expect(body.stream.locked).toBe(false)
		expect(requireValue(transport.signals[0]).aborted).toBe(false)
	}, 400)

	it('omits the separator for an empty error excerpt', async () => {
		const transport = new RecordedTransport(() => new Response(undefined, { status: 401 }))
		const provider = new ScriptedWire({ url: 'https://provider.test', fetch: transport.fetch })
		await expect(provider.generate([], new AbortController().signal)).rejects.toMatchObject({
			name: 'ProviderError',
			code: 'HTTP',
			status: 401,
			message: 'provider error: 401',
		})
	})

	it('retains HTTP status and cause when the error body cannot be read', async () => {
		const cause = new Error('broken body')
		const body = new RecordedBody([], true, cause)
		const transport = new RecordedTransport(() => new Response(body.stream, { status: 502 }))
		await expect(
			new ScriptedWire({ url: 'https://provider.test', fetch: transport.fetch }).generate(
				[],
				new AbortController().signal,
			),
		).rejects.toMatchObject({
			code: 'HTTP',
			status: 502,
			cause,
			message: 'provider error: 502 - (error body unavailable)',
		})
		expect(body.stream.locked).toBe(false)
	})

	it('rejects a successful response with no body as a protocol failure', async () => {
		const transport = new RecordedTransport(() => new Response(null, { status: 204 }))
		await expect(
			new ScriptedWire({ url: 'https://provider.test', fetch: transport.fetch }).generate(
				[],
				new AbortController().signal,
			),
		).rejects.toMatchObject({ code: 'PROTOCOL' })
	})

	it('preserves provider failure codes, status, cause, and instanceof narrowing', () => {
		const cause = new Error('network')
		const error = new ProviderError('HTTP', 'unavailable', { status: 503, cause })
		expect(error).toBeInstanceOf(Error)
		expect(error.name).toBe('ProviderError')
		expect(error.code).toBe('HTTP')
		expect(error.status).toBe(503)
		expect(error.cause).toBe(cause)
		expect(isProviderError(error)).toBe(true)
		expect(isProviderError(new Error('plain'))).toBe(false)
		expect(new ProviderError('PROTOCOL', 'missing').status).toBeUndefined()
	})
})

describe('AgentProvider — failures that reach the caller unchanged', () => {
	it('propagates a hostile record decoder error unchanged', async () => {
		const error = new Error('hostile decoder')
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			records: new Map([['bad', error]]),
			fetch: createStreamingTransport(['bad']),
		})
		await expect(provider.generate([], new AbortController().signal)).rejects.toBe(error)
		expect(requireValue(provider.parsers[0]).cleared).toBe(true)
	})

	it('propagates a remotely reported abort unchanged', async () => {
		const error = new ProviderAbortError({ content: 'remote partial' })
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			records: new Map([['abort', error]]),
			fetch: createStreamingTransport(['abort']),
		})
		await expect(provider.generate([], new AbortController().signal)).rejects.toBe(error)
	})

	it('preserves a remote abort identity and cancels its open body with the local signal unaborted', async () => {
		const failure = new ProviderAbortError({ content: 'remote partial' })
		const body = new RecordedBody([new TextEncoder().encode('abort')], false)
		const transport = new RecordedTransport(() => new Response(body.stream))
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: transport.fetch,
			timeout: 40,
			records: new Map([['abort', failure]]),
		})
		await expect(provider.generate([], new AbortController().signal)).rejects.toBe(failure)
		expect(body.cancelled).toBe(true)
		expect(body.stream.locked).toBe(false)
		expect(requireValue(provider.parsers[0]).cleared).toBe(true)
		await waitForDelay(60)
		expect(requireValue(transport.signals[0]).aborted).toBe(false)
	})
})

describe('AgentProvider — the header hook inside the cancellation bound', () => {
	it('races a never-resolving header hook against the deadline', async () => {
		const transport = createRefusingTransport()
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: transport.fetch,
			timeout: 10,
			headers: () => new Promise(() => {}),
		})
		await expect(provider.generate([], new AbortController().signal)).rejects.toBeInstanceOf(
			ProviderAbortError,
		)
		expect(transport.signals).toEqual([])
		expect(requireValue(provider.parsers[0]).cleared).toBe(true)
	}, 250)

	it('preserves a rejected header hook and issues no request', async () => {
		const error = new Error('header rejected')
		const transport = createRefusingTransport()
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: transport.fetch,
			headers: () => Promise.reject(error),
			timeout: 10,
		})
		await expect(provider.generate([], new AbortController().signal)).rejects.toBe(error)
		expect(transport.signals).toEqual([])
	})

	it('cancels an unresolved header hook through the caller signal', async () => {
		const abort = new AbortController()
		const entered = Promise.withResolvers<void>()
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			headers: () => {
				entered.resolve()
				return new Promise(() => {})
			},
		})
		const result = provider.generate([], abort.signal)
		await entered.promise
		abort.abort()
		await expect(result).rejects.toMatchObject({ partial: { content: '' } })
		expect(requireValue(provider.parsers[0]).cleared).toBe(true)
	})
})

describe('AgentProvider — abort listener removal after the header hook', () => {
	it('removes abort listeners after hook success and clears the deadline', async () => {
		const pending = Promise.withResolvers<Readonly<Record<string, string>>>()
		const hook = new RecordedHeaders(pending.promise)
		const transport = new RecordedTransport(() => new Response('c:done'))
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: transport.fetch,
			timeout: 40,
			headers: hook.headers.bind(hook),
		})
		const result = provider.generate([], new AbortController().signal)
		try {
			await hook.entered
			const signal = requireValue(hook.signals[0])
			expect(getEventListeners(signal, 'abort')).toHaveLength(1)
			pending.resolve({})
			expect(await result).toEqual({ content: 'done' })
			const received = requireValue(transport.signals[0])
			expect(received).toBe(signal)
			await waitForDelay(60)
			expect(received.aborted).toBe(false)
			expect(getEventListeners(received, 'abort')).toEqual([])
		} finally {
			pending.resolve({})
			await result.catch(() => {
				// Release pending work even when an earlier assertion failed.
			})
		}
	})

	it('removes abort listeners after hook rejection and clears the deadline', async () => {
		const failure = new Error('header failed')
		const hook = new RecordedHeaders(failure)
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			timeout: 40,
			headers: hook.headers.bind(hook),
		})
		await expect(provider.generate([], new AbortController().signal)).rejects.toBe(failure)
		await waitForDelay(60)
		const signal = requireValue(hook.signals[0])
		expect(signal.aborted).toBe(false)
		expect(getEventListeners(signal, 'abort')).toEqual([])
	})

	it('removes abort listeners after caller cancellation during the hook', async () => {
		const pending = Promise.withResolvers<Readonly<Record<string, string>>>()
		const hook = new RecordedHeaders(pending.promise)
		const abort = new AbortController()
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			timeout: 40,
			headers: hook.headers.bind(hook),
		})
		const result = provider.generate([], abort.signal)
		try {
			await hook.entered
			const signal = requireValue(hook.signals[0])
			expect(getEventListeners(signal, 'abort')).toHaveLength(1)
			abort.abort()
			await expect(result).rejects.toBeInstanceOf(ProviderAbortError)
			expect(getEventListeners(signal, 'abort')).toEqual([])
		} finally {
			pending.resolve({})
			abort.abort()
			await result.catch(() => {
				// Release pending work even when an earlier assertion failed.
			})
		}
	})

	it('removes abort listeners after deadline expiry during the hook', async () => {
		const pending = Promise.withResolvers<Readonly<Record<string, string>>>()
		const hook = new RecordedHeaders(pending.promise)
		try {
			const provider = new ScriptedWire({
				url: 'https://provider.test',
				timeout: 40,
				headers: hook.headers.bind(hook),
			})
			await expect(provider.generate([], new AbortController().signal)).rejects.toBeInstanceOf(
				ProviderAbortError,
			)
			const signal = requireValue(hook.signals[0])
			expect(signal.aborted).toBe(true)
			expect(getEventListeners(signal, 'abort')).toEqual([])
		} finally {
			pending.resolve({})
		}
	})
})

describe('AgentProvider — cancellation and partial results', () => {
	it('rejects an already-aborted call before framing or issuing a request', async () => {
		const transport = createRefusingTransport()
		const provider = new ScriptedWire({ url: 'https://provider.test', fetch: transport.fetch })
		await expect(provider.generate([], AbortSignal.abort())).rejects.toMatchObject({
			partial: { content: '' },
		})
		expect(transport.signals).toEqual([])
		expect(provider.parsers).toEqual([])
	})

	it('flushes held content into the partial when cancelled between deltas', async () => {
		const abort = new AbortController()
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: createStreamingTransport(['c:answer<thi']),
		})
		const stream = provider.stream([], abort.signal)
		expect(await stream.next()).toEqual({
			done: false,
			value: { channel: 'content', text: 'answer' },
		})
		abort.abort()
		await expect(stream.next()).rejects.toMatchObject({ partial: { content: 'answer<thi' } })
		expect(requireValue(provider.parsers[0]).cleared).toBe(true)
	})

	it('stops between channels while retaining the complete decoded increment', async () => {
		const abort = new AbortController()
		const records = new Map<string, ProviderIncrement>([
			[
				'mixed',
				{
					content: 'answer',
					thinking: 'reason',
					tools: [{ id: 'call', name: 'lookup', arguments: {} }],
					usage: { prompt: 1, completion: 2, total: 3 },
				},
			],
		])
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			records,
			fetch: createStreamingTransport(['mixed']),
		})
		const stream = provider.stream([], abort.signal)
		await stream.next()
		abort.abort()
		await expect(stream.next()).rejects.toMatchObject({
			partial: {
				content: 'answer',
				thinking: 'reason',
				tools: [{ id: 'call', name: 'lookup', arguments: {} }],
				usage: { prompt: 1, completion: 2, total: 3 },
			},
		})
	})

	it('cancels a stalled readable body on the deadline', async () => {
		const body = new RecordedBody([new TextEncoder().encode('c:partial')], false)
		const transport = new RecordedTransport(() => new Response(body.stream))
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			timeout: 15,
			fetch: transport.fetch,
		})
		await expect(provider.generate([], new AbortController().signal)).rejects.toMatchObject({
			partial: { content: 'partial' },
		})
		expect(body.cancelled).toBe(true)
		expect(requireValue(provider.parsers[0]).cleared).toBe(true)
	})

	it('cancels a stalled 503 body within the deadline budget', async () => {
		const body = new RecordedBody([], false)
		const transport = new RecordedTransport(() => new Response(body.stream, { status: 503 }))
		const abort = new AbortController()
		try {
			const provider = new ScriptedWire({
				url: 'https://provider.test',
				fetch: transport.fetch,
				timeout: 40,
			})
			const result = provider.generate([], abort.signal)
			await expect(result).rejects.toMatchObject({
				name: 'ProviderAbortError',
				partial: { content: '' },
			})
			expect(body.cancelled).toBe(true)
			expect(body.stream.locked).toBe(false)
			expect(requireValue(transport.signals[0]).aborted).toBe(true)
			expect(requireValue(provider.parsers[0]).cleared).toBe(true)
		} finally {
			abort.abort()
		}
	}, 400)

	it('refuses buffered finish records after cancellation ends a pending read', async () => {
		const body = new RecordedBody([new TextEncoder().encode('c:unfolded')], false)
		const transport = new RecordedTransport(() => new Response(body.stream))
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: transport.fetch,
			buffered: true,
		})
		const abort = new AbortController()
		const result = provider.generate([], abort.signal)
		await body.pending
		abort.abort()
		await expect(result).rejects.toMatchObject({ partial: { content: '' } })
		expect(provider.decoded).toEqual([])
		expect(body.cancelled).toBe(true)
		expect(body.stream.locked).toBe(false)
		expect(requireValue(provider.parsers[0]).cleared).toBe(true)
	})

	it('normalizes a transport AbortError after the local deadline', async () => {
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: rejectTransportOnAbort,
			timeout: 40,
		})
		await expect(provider.generate([], new AbortController().signal)).rejects.toBeInstanceOf(
			ProviderAbortError,
		)
		expect(requireValue(provider.parsers[0]).cleared).toBe(true)
	})

	it('replaces a caller ProviderAbortError reason with the locally accumulated partial', async () => {
		const body = new RecordedBody([new TextEncoder().encode('c:answer')], false)
		const transport = new RecordedTransport(() => new Response(body.stream))
		const provider = new ScriptedWire({ url: 'https://provider.test', fetch: transport.fetch })
		const abort = new AbortController()
		const stream = provider.stream([], abort.signal)
		expect(await stream.next()).toEqual({
			done: false,
			value: { channel: 'content', text: 'answer' },
		})
		abort.abort(new ProviderAbortError({ content: 'foreign' }))
		await expect(stream.next()).rejects.toMatchObject({
			name: 'ProviderAbortError',
			partial: { content: 'answer' },
		})
		expect(body.cancelled).toBe(true)
		expect(body.stream.locked).toBe(false)
	})

	it('carries a decoder failure that raced the cancel as the abort error cause', async () => {
		const abort = new AbortController()
		const failure = new ProviderError('PROTOCOL', 'provider error: malformed record')
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			abort,
			records: new Map([['poison', failure]]),
			fetch: createStreamingTransport(['poison']),
		})
		const caught = await provider.generate([], abort.signal).then(
			() => undefined,
			(error: unknown) => (isProviderAbortError(error) ? error : undefined),
		)
		expect(provider.decoded).toEqual(['poison'])
		expect(requireValue(caught).partial).toEqual({ content: '' })
		expect(requireValue(caught).cause).toBe(failure)
	})

	it('leaves the cause undefined when the cancel is the only failure', async () => {
		const body = new RecordedBody([new TextEncoder().encode('c:partial')], false)
		const transport = new RecordedTransport(() => new Response(body.stream))
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			timeout: 15,
			fetch: transport.fetch,
		})
		const caught = await provider.generate([], new AbortController().signal).then(
			() => undefined,
			(error: unknown) => (isProviderAbortError(error) ? error : undefined),
		)
		expect(requireValue(caught).partial).toEqual({ content: 'partial' })
		expect(requireValue(caught).cause).toBeUndefined()
	})
})

describe('AgentProvider — deadline clearing and reader release on every exit', () => {
	it('clears the deadline after successful completion', async () => {
		const transport = new RecordedTransport(() => new Response('c:ok'))
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: transport.fetch,
			timeout: 20,
		})
		await provider.generate([], new AbortController().signal)
		await waitForDelay(40)
		expect(requireValue(transport.signals[0]).aborted).toBe(false)
		expect(requireValue(provider.parsers[0]).cleared).toBe(true)
	})

	it('clears the deadline after a transport rejection', async () => {
		const transport = createRefusingTransport()
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: transport.fetch,
			timeout: 20,
		})
		await expect(provider.generate([], new AbortController().signal)).rejects.toThrow(
			'fetch failed',
		)
		await waitForDelay(40)
		expect(requireValue(transport.signals[0]).aborted).toBe(false)
		expect(requireValue(provider.parsers[0]).cleared).toBe(true)
	})

	it('releases the reader and deadline after an early generator return', async () => {
		const body = new RecordedBody([new TextEncoder().encode('c:answer')], false)
		const transport = new RecordedTransport(() => new Response(body.stream))
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			timeout: 20,
			fetch: transport.fetch,
		})
		const stream = provider.stream([], new AbortController().signal)
		await stream.next()
		await stream.return({ content: 'stopped' })
		await waitForDelay(40)
		expect(body.cancelled).toBe(true)
		expect(body.stream.locked).toBe(false)
		expect(requireValue(transport.signals[0]).aborted).toBe(false)
		expect(requireValue(provider.parsers[0]).cleared).toBe(true)
	})

	it('clears the deadline after a non-OK response', async () => {
		const transport = new RecordedTransport(() => new Response('unavailable', { status: 503 }))
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: transport.fetch,
			timeout: 40,
		})
		await expect(provider.generate([], new AbortController().signal)).rejects.toMatchObject({
			code: 'HTTP',
		})
		await waitForDelay(60)
		expect(requireValue(transport.signals[0]).aborted).toBe(false)
	})

	it('clears the deadline after a decoder failure', async () => {
		const failure = new Error('decoder failed')
		const body = new RecordedBody([new TextEncoder().encode('poison')], false)
		const transport = new RecordedTransport(() => new Response(body.stream))
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: transport.fetch,
			timeout: 40,
			records: new Map([['poison', failure]]),
		})
		await expect(provider.generate([], new AbortController().signal)).rejects.toBe(failure)
		await waitForDelay(60)
		expect(requireValue(transport.signals[0]).aborted).toBe(false)
		expect(body.cancelled).toBe(true)
		expect(body.stream.locked).toBe(false)
	})

	it('clears the local deadline after a remotely reported abort', async () => {
		const failure = new ProviderAbortError({ content: 'remote' })
		const transport = new RecordedTransport(() => new Response('abort'))
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			timeout: 20,
			fetch: transport.fetch,
			records: new Map([['abort', failure]]),
		})
		await expect(provider.generate([], new AbortController().signal)).rejects.toBe(failure)
		await waitForDelay(40)
		expect(requireValue(transport.signals[0]).aborted).toBe(false)
	})
})

describe('AgentProvider — isolation between concurrent calls on one instance', () => {
	it('keeps concurrent calls isolated and generate equal to a drained stream', async () => {
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: createStreamingTransport(['c:<thi', 'c:nk>reason</think>answer']),
		})
		const [generated, streamed] = await Promise.all([
			provider.generate([], new AbortController().signal),
			drainProvider(provider.stream([], new AbortController().signal)),
		])
		expect(generated).toEqual({ content: 'answer', thinking: 'reason' })
		expect(streamed.result).toEqual(generated)
		expect(provider.parsers).toHaveLength(2)
		expect(provider.parsers[0]).not.toBe(provider.parsers[1])
		expect(provider.parsers.every((parser) => parser.cleared)).toBe(true)
	})

	it('isolates distinct interleaved bodies while one splitter holds a cancelled prefix', async () => {
		const left = new RecordedBody(
			['left', 'c:never'].map((chunk) => new TextEncoder().encode(chunk)),
			false,
		)
		const right = new RecordedBody(['right', 'c:!'].map((chunk) => new TextEncoder().encode(chunk)))
		const bodies = [left, right]
		const transport = new RecordedTransport(() => new Response(requireValue(bodies.shift()).stream))
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: transport.fetch,
			records: new Map<string, ProviderIncrement>([
				[
					'left',
					{
						content: 'alpha<thi',
						thinking: 'left-native',
						tools: [{ id: 'left', name: 'lookup', arguments: { side: 'left' } }],
						usage: { prompt: 1, completion: 2, total: 3 },
					},
				],
				[
					'right',
					{
						content: '<think>right-hidden</think>beta',
						thinking: 'right-native',
						tools: [{ id: 'right', name: 'lookup', arguments: { side: 'right' } }],
						usage: { prompt: 4, completion: 5, total: 9 },
					},
				],
			]),
		})
		const abort = new AbortController()
		const cancelled = provider.stream([], abort.signal)
		const running = provider.stream([], new AbortController().signal)
		try {
			expect(await cancelled.next()).toEqual({
				done: false,
				value: { channel: 'content', text: 'alpha' },
			})
			expect(await running.next()).toEqual({
				done: false,
				value: { channel: 'content', text: 'beta' },
			})
			expect(await cancelled.next()).toEqual({
				done: false,
				value: { channel: 'thinking', text: 'left-native' },
			})
			expect(await running.next()).toEqual({
				done: false,
				value: { channel: 'thinking', text: 'right-native' },
			})
			abort.abort()
			await expect(cancelled.next()).rejects.toMatchObject({
				partial: {
					content: 'alpha<thi',
					thinking: 'left-native',
					tools: [{ id: 'left', name: 'lookup', arguments: { side: 'left' } }],
					usage: { prompt: 1, completion: 2, total: 3 },
				},
			})
			expect(await drainProvider(running)).toEqual({
				deltas: [{ channel: 'content', text: '!' }],
				result: {
					content: 'beta!',
					thinking: 'right-hidden\n\nright-native',
					tools: [{ id: 'right', name: 'lookup', arguments: { side: 'right' } }],
					usage: { prompt: 4, completion: 5, total: 9 },
				},
			})
			await waitForDelay()
			expect(left.cancelled).toBe(true)
			expect(left.stream.locked).toBe(false)
			expect(right.stream.locked).toBe(false)
			expect(provider.parsers).toHaveLength(2)
			expect(provider.parsers[0]).not.toBe(provider.parsers[1])
			expect(provider.parsers.every((parser) => parser.cleared)).toBe(true)
		} finally {
			abort.abort()
			await cancelled.return({ content: '' })
			await running.return({ content: '' })
		}
	})

	it('isolates cancellation from a concurrent call on the same instance', async () => {
		const abort = new AbortController()
		const provider = new ScriptedWire({
			url: 'https://provider.test',
			fetch: createStreamingTransport(['c:answer', 'c:tail']),
		})
		const cancelled = provider.stream([], abort.signal)
		const running = provider.stream([], new AbortController().signal)
		await Promise.all([cancelled.next(), running.next()])
		abort.abort()
		await expect(cancelled.next()).rejects.toMatchObject({ partial: { content: 'answer' } })
		expect((await drainProvider(running)).result).toEqual({ content: 'answertail' })
		expect(provider.parsers.every((parser) => parser.cleared)).toBe(true)
	})
})
