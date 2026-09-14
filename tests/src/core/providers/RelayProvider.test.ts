import type { ProviderRequest, RelayFrame } from '@src/core'
import { parseJSONAs } from '@orkestrel/contract'
import { requireValue, roundTripJSON } from '@orkestrel/test'
import {
	createRelayProvider,
	providerRequestContract,
	relayFrameContract,
	ProviderAbortError,
	ProviderError,
	RelayProvider,
} from '@src/core'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
	createParser,
	createHostileSerializer,
	createRefusingTransport,
	createStreamingTransport,
	createToolCall,
	drainProvider,
} from '../../../setup.js'

describe('RelayProvider', () => {
	it('rejects a synthetic parameters serializer before fetching', async () => {
		const transport = createRefusingTransport()
		const provider = createRelayProvider({
			url: 'http://relay.test/',
			parser: createParser,
			fetch: transport.fetch,
		})
		const result = provider.generate([], new AbortController().signal, [
			{ name: 'hostile', parameters: createHostileSerializer() },
		])
		await expect(result).rejects.toBeInstanceOf(ProviderError)
		await expect(result).rejects.toMatchObject({ code: 'PROTOCOL' })
		expect(transport.signals).toEqual([])
	})
	it('rejects a synthetic schema serializer before fetching', async () => {
		const transport = createRefusingTransport()
		const provider = createRelayProvider({
			url: 'http://relay.test/',
			parser: createParser,
			fetch: transport.fetch,
		})
		await expect(
			provider.generate([], new AbortController().signal, undefined, {
				schema: createHostileSerializer(),
			}),
		).rejects.toMatchObject({ name: 'ProviderError', code: 'PROTOCOL' })
		expect(transport.signals).toEqual([])
	})
	it('owns a valid request snapshot without changing its JSON values', () => {
		const provider = createRelayProvider({ url: 'http://relay.test/', parser: createParser })
		const parameters = { x: 1 }
		const schema = { type: 'object' }
		const request: ProviderRequest = {
			messages: [],
			tools: [{ name: 'valid', parameters }],
			options: { schema },
		}
		const snapshot = provider.body(request)
		if (!providerRequestContract.is(snapshot)) throw new Error('invalid request snapshot')
		expect(parseJSONAs(JSON.stringify(snapshot), providerRequestContract.is)).toEqual(request)
		parameters.x = 2
		schema.type = 'string'
		expect(parseJSONAs(JSON.stringify(snapshot), providerRequestContract.is)).toEqual({
			messages: [],
			tools: [{ name: 'valid', parameters: { x: 1 } }],
			options: { schema: { type: 'object' } },
		})
	})
	it('refuses an error frame carrying a decorative code member', () => {
		expectTypeOf<Extract<RelayFrame, { channel: 'error' }>>().toEqualTypeOf<{
			readonly channel: 'error'
			readonly message: string
		}>()
		const provider = createRelayProvider({ url: 'http://relay.test/', parser: createParser })
		const frame = { channel: 'error', code: 'PROVIDER', message: 'unavailable' }
		expect(relayFrameContract.is(frame)).toBe(false)
		expect(() => provider.read(frame)).toThrow('invalid relay frame')
		expect(relayFrameContract.is({ channel: 'error', message: 'unavailable' })).toBe(true)
	})
	it('projects declared request fields and omits caller context before a JSON round trip', () => {
		const provider = new RelayProvider({ url: 'http://relay.test/', parser: createParser })
		const request: ProviderRequest = {
			messages: [
				{
					id: 'message',
					role: 'assistant',
					content: 'answer',
					images: ['image'],
					calls: [createToolCall({ caller: { credential: 'local-only' }, arguments: { x: 1 } })],
				},
			],
			tools: [{ name: 'add', description: 'Adds values', parameters: { x: { type: 'number' } } }],
			options: { think: false, schema: { type: 'object' } },
		}
		const wire = provider.body(request)
		expect(providerRequestContract.is(wire)).toBe(true)
		expect(parseJSONAs(JSON.stringify(wire), providerRequestContract.is)).toEqual(wire)
		expect(wire).toEqual({
			...request,
			messages: [{ ...request.messages[0], calls: [createToolCall({ arguments: { x: 1 } })] }],
		})
		expect(request.messages[0]?.calls?.[0]?.caller).toEqual({ credential: 'local-only' })
	})
	it('rejects non-JSON arguments before fetching', async () => {
		const transport = createRefusingTransport()
		const provider = createRelayProvider({
			url: 'http://relay.test/',
			parser: createParser,
			fetch: transport.fetch,
		})
		await expect(
			provider.generate(
				[
					{
						id: 'message',
						role: 'assistant',
						content: '',
						calls: [createToolCall({ arguments: { invalid: createParser } })],
					},
				],
				new AbortController().signal,
			),
		).rejects.toMatchObject({ code: 'PROTOCOL', message: 'relay request is not JSON' })
		expect(transport.signals).toEqual([])
	})
	it('rejects non-JSON parameters and schema', () => {
		const provider = createRelayProvider({ url: 'http://relay.test/', parser: createParser })
		expect(() =>
			provider.body({
				messages: [],
				tools: [{ name: 'invalid', parameters: { value: Infinity } }],
			}),
		).toThrow('relay request is not JSON')
		expect(() =>
			provider.body({ messages: [], options: { schema: { value: createParser } } }),
		).toThrow('relay request is not JSON')
	})
	it('maps validated thinking and content frames and keeps literal thinking tags', async () => {
		const content = '<think>literal</think>'
		const result = { content, thinking: 'reason' }
		const frames = [
			{ channel: 'thinking', text: 'reason' },
			{ channel: 'content', text: content },
			{ channel: 'result', result },
		]
		for (const frame of frames) expect(relayFrameContract.is(roundTripJSON(frame))).toBe(true)
		const provider = createRelayProvider({
			url: 'http://relay.test/',
			parser: createParser,
			fetch: createStreamingTransport(frames.map((frame) => `${JSON.stringify(frame)}\n`)),
		})
		expect(await drainProvider(provider.stream([], new AbortController().signal))).toEqual({
			deltas: frames.slice(0, 2),
			result,
		})
	})
	it('reconstructs an abort frame with its complete partial and an unaborted local signal', async () => {
		const partial = {
			content: 'partial',
			thinking: 'reason',
			tools: [createToolCall()],
			usage: { prompt: 1, completion: 2, total: 3 },
		}
		const provider = createRelayProvider({
			url: 'http://relay.test/',
			parser: createParser,
			fetch: createStreamingTransport([JSON.stringify({ channel: 'abort', partial }) + '\n']),
		})
		const signal = new AbortController().signal
		await expect(provider.generate([], signal)).rejects.toEqual(new ProviderAbortError(partial))
		expect(signal.aborted).toBe(false)
	})
	it('refuses malformed frames and missing terminal results', async () => {
		const provider = createRelayProvider({
			url: 'http://relay.test/',
			parser: createParser,
			fetch: createStreamingTransport(['{"channel":"content","text":"prefix"}\n']),
		})
		expect(() => provider.read({ channel: 'content', text: 4 })).toThrow('invalid relay frame')
		expect(() => provider.read({ channel: 'error', code: 'HTTP', message: 'secret' })).toThrow(
			'invalid relay frame',
		)
		await expect(provider.generate([], new AbortController().signal)).rejects.toMatchObject({
			code: 'PROTOCOL',
		})
	})
	it('recovers a fragmented unterminated final result with fresh framing per call', async () => {
		const provider = createRelayProvider({
			url: 'http://relay.test/',
			parser: createParser,
			fetch: createStreamingTransport(['{"channel":"res', 'ult","result":{"content":"answer"}}']),
		})
		expect(provider.name).toBe('relay')
		expect(provider.frame()).not.toBe(provider.frame())
		expect(await provider.generate([], new AbortController().signal)).toEqual({ content: 'answer' })
		expect(await provider.generate([], new AbortController().signal)).toEqual({ content: 'answer' })
		const parser = provider.frame()
		expect(parser.parse('{"channel":"content","text":"discard"}')).toEqual([])
		parser.clear()
		expect(provider.finish(parser)).toEqual([])
		expect(requireValue(provider.id)).toBeTypeOf('string')
	})
})
