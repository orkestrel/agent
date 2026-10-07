import { createRelay, DEFAULT_RELAY_LIMIT } from '@src/core'
import { describe, expect, it } from 'vitest'
import { getEventListeners } from 'node:events'
import {
	createRelayRequest,
	createStreamingRelayRequest,
	RecordedBody,
	RecordedProvider,
	createScriptedProvider,
} from '../../../setup.js'

describe('createRelay', () => {
	it('answers 400 when the request body errors after a prefix', async () => {
		const provider = new RecordedProvider()
		const body = new RecordedBody(
			[new TextEncoder().encode('{"messages":')],
			true,
			new Error('fixture-secret'),
		)
		const request = createStreamingRelayRequest(body.stream)
		const response = await createRelay({ provider, authorize: () => true })(request)
		expect(response.status).toBe(400)
		expect(await response.text()).toBe('')
		expect(provider.entries).toBe(0)
		expect(body.stream.locked).toBe(false)
		expect(getEventListeners(request.signal, 'abort')).toEqual([])
	})
	it('answers 502 when stream construction throws without leaking text or listeners', async () => {
		const provider = new RecordedProvider([], undefined, new Error('fixture-secret'))
		const request = createRelayRequest()
		const response = await createRelay({ provider, authorize: () => true })(request)
		expect(response.status).toBe(502)
		expect(await response.text()).toBe('')
		expect(JSON.stringify([...response.headers])).not.toContain('fixture-secret')
		expect(response.statusText).not.toContain('fixture-secret')
		expect(provider.entries).toBe(1)
		expect(getEventListeners(request.signal, 'abort')).toEqual([])
	})
	it('keeps an inbound abort during a pending body read at 413', async () => {
		const provider = new RecordedProvider()
		const body = new RecordedBody([new TextEncoder().encode('{')], false)
		const abort = new AbortController()
		const request = createStreamingRelayRequest(body.stream, abort.signal)
		const pending = createRelay({ provider, authorize: () => true })(request)
		await body.pending
		abort.abort()
		const response = await pending
		expect(response.status).toBe(413)
		expect(provider.entries).toBe(0)
		expect(body.stream.locked).toBe(false)
		expect(getEventListeners(request.signal, 'abort')).toEqual([])
	}, 400)
	it('keeps a body-read throw at 413 when the inbound signal is aborted', async () => {
		const provider = new RecordedProvider()
		const abort = new AbortController()
		const request = createRelayRequest('{"messages":[]}', abort.signal)
		const reader = request.body?.getReader()
		abort.abort()
		try {
			const response = await createRelay({ provider, authorize: () => true })(request)
			expect(response.status).toBe(413)
			expect(provider.entries).toBe(0)
		} finally {
			reader?.releaseLock()
		}
	})
	it('answers 400 when authorization consumes the request body', async () => {
		const provider = new RecordedProvider()
		const response = await createRelay({
			provider,
			authorize: async (request) => {
				await request.text()
				return true
			},
		})(createRelayRequest())
		expect(response.status).toBe(400)
		expect(provider.entries).toBe(0)
	})
	it('refuses false authorization before reading the body or calling the provider', async () => {
		const provider = createScriptedProvider([], { record: true })
		const request = createRelayRequest('invalid')
		const response = await createRelay({ provider, authorize: () => false })(request)
		expect(response.status).toBe(401)
		expect(request.bodyUsed).toBe(false)
		expect(provider.started).toBe(0)
		expect(provider.calls).toEqual([])
	})
	it('fails closed when authorization throws', async () => {
		const provider = createScriptedProvider([], { record: true })
		const handler = createRelay({
			provider,
			authorize: () => {
				throw new Error('secret')
			},
		})
		const response = await handler(createRelayRequest())
		expect(response.status).toBe(401)
		expect(await response.text()).toBe('')
		expect(provider.started).toBe(0)
	})
	it('fails closed when asynchronous authorization rejects', async () => {
		const provider = createScriptedProvider([], { record: true })
		const handler = createRelay({ provider, authorize: () => Promise.reject(new Error('secret')) })
		expect((await handler(createRelayRequest())).status).toBe(401)
		expect(provider.started).toBe(0)
	})
	it('rejects missing malformed and contract-invalid bodies before calling the provider', async () => {
		const provider = createScriptedProvider([], { record: true })
		const handler = createRelay({ provider, authorize: () => true })
		expect((await handler(new Request('http://relay.test/'))).status).toBe(400)
		expect((await handler(createRelayRequest('not json'))).status).toBe(400)
		expect(
			(await handler(createRelayRequest('{"messages":[{"id":"m","role":"invalid","content":""}]}')))
				.status,
		).toBe(400)
		expect((await handler(createRelayRequest('{"messages":[],"extra":true}'))).status).toBe(400)
		expect(provider.started).toBe(0)
	})
	it('rejects default limit plus one before calling the provider', async () => {
		const provider = createScriptedProvider([], { record: true })
		const body = '{"messages":[]}'.padEnd(DEFAULT_RELAY_LIMIT + 1)
		expect(new TextEncoder().encode(body).byteLength).toBe(DEFAULT_RELAY_LIMIT + 1)
		const response = await createRelay({ provider, authorize: () => true })(
			createRelayRequest(body),
		)
		expect(response.status).toBe(413)
		expect(provider.started).toBe(0)
		expect(provider.calls).toEqual([])
	})
	it('refuses valid JSON at exactly the default limit', async () => {
		const provider = new RecordedProvider()
		const body = '{"messages":[]}'.padEnd(DEFAULT_RELAY_LIMIT)
		expect(new TextEncoder().encode(body).byteLength).toBe(DEFAULT_RELAY_LIMIT)
		const response = await createRelay({ provider, authorize: () => true })(
			createRelayRequest(body),
		)
		expect(response.status).toBe(413)
		expect(provider.entries).toBe(0)
	})
	it('accepts valid JSON at the default limit minus one', async () => {
		const provider = createScriptedProvider([{ content: 'answer' }], { record: true })
		const body = '{"messages":[]}'.padEnd(DEFAULT_RELAY_LIMIT - 1)
		expect(new TextEncoder().encode(body).byteLength).toBe(DEFAULT_RELAY_LIMIT - 1)
		const response = await createRelay({ provider, authorize: () => Promise.resolve(true) })(
			createRelayRequest(body),
		)
		expect(response.status).toBe(200)
		expect(await response.text()).toContain('"channel":"result"')
		expect(provider.started).toBe(1)
	})
	it('uses completion rather than decoded length for a custom limit with a BOM', async () => {
		const provider = createScriptedProvider([], { record: true })
		const handler = createRelay({ provider, authorize: () => true, limit: 19 })
		expect((await handler(createRelayRequest('\uFEFF{"messages":[]} '))).status).toBe(413)
		expect(provider.started).toBe(0)
		const response = await handler(createRelayRequest('\uFEFF{"messages":[]}'))
		expect(response.status).toBe(200)
		await response.text()
		expect(provider.started).toBe(1)
	})
})
