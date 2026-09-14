import { parseJSONAs } from '@orkestrel/contract'
import { requireValue, waitForDelay } from '@orkestrel/test'
import { getEventListeners } from 'node:events'
import {
	ProviderAbortError,
	RELAY_CONTENT_TYPE,
	RELAY_PROVIDER_MESSAGE,
	relayFrameContract,
	RelayStream,
} from '@src/core'
import { describe, expect, it } from 'vitest'
import {
	createScriptedProvider,
	createToolCall,
	FailingProvider,
	RecordedProvider,
} from '../../setup.js'

describe('RelayStream', () => {
	it('writes validated deltas and the authoritative result with response headers', async () => {
		const result = {
			content: 'answer',
			thinking: 'reason',
			tools: [createToolCall()],
			usage: { prompt: 1, completion: 2, total: 3 },
		}
		const provider = createScriptedProvider(
			[{ result, deltas: ['an', 'swer'], thoughts: ['reason'] }],
			{ record: true },
		)
		const signal = new AbortController().signal
		const relay = new RelayStream({ provider, request: { messages: [] }, signal })
		expect(relay.response).toBe(relay.response)
		expect(relay.response.headers.get('content-type')).toBe(RELAY_CONTENT_TYPE)
		expect(relay.response.headers.get('cache-control')).toBe('no-store')
		const text = await relay.response.text()
		expect(text.endsWith('\n')).toBe(true)
		expect(
			text
				.split('\n')
				.slice(0, -1)
				.map((line) => parseJSONAs(line, relayFrameContract.is)),
		).toEqual([
			{ channel: 'thinking', text: 'reason' },
			{ channel: 'content', text: 'an' },
			{ channel: 'content', text: 'swer' },
			{ channel: 'result', result },
		])
		expect(provider.started).toBe(1)
		expect(getEventListeners(signal, 'abort')).toEqual([])
		const upstream = requireValue(provider.calls[0]).signal
		expect(upstream.aborted).toBe(false)
	})
	it('emits a fixed error message without upstream secret text', async () => {
		const provider = new FailingProvider({ content: '' }, new Error('sk-secret'))
		const signal = new AbortController().signal
		const response = new RelayStream({ provider, request: { messages: [] }, signal }).response
		const text = await response.text()
		expect(text).not.toContain('sk-secret')
		expect(text).not.toContain('stack')
		expect(parseJSONAs(text, relayFrameContract.is)).toEqual({
			channel: 'error',
			code: 'PROVIDER',
			message: RELAY_PROVIDER_MESSAGE,
		})
		expect(getEventListeners(signal, 'abort')).toEqual([])
	})
	it('writes a remote abort partial through the same compiled frame contract', async () => {
		const partial = { content: 'partial', thinking: 'reason', tools: [createToolCall()] }
		const provider = new FailingProvider({ content: '' }, new ProviderAbortError(partial))
		const signal = new AbortController().signal
		const response = new RelayStream({ provider, request: { messages: [] }, signal }).response
		expect(parseJSONAs(await response.text(), relayFrameContract.is)).toEqual({
			channel: 'abort',
			partial,
		})
		expect(signal.aborted).toBe(false)
		expect(getEventListeners(signal, 'abort')).toEqual([])
	})
	it('refuses a result outside the JSON frame contract', async () => {
		const provider = createScriptedProvider([
			{ content: '', tools: [createToolCall({ arguments: { invalid: Infinity } })] },
		])
		const response = new RelayStream({
			provider,
			request: { messages: [] },
			signal: new AbortController().signal,
		}).response
		expect(parseJSONAs(await response.text(), relayFrameContract.is)).toEqual({
			channel: 'error',
			code: 'PROVIDER',
			message: RELAY_PROVIDER_MESSAGE,
		})
	})
	it('serializes next calls and stops pulling while the response queue is full', async () => {
		const gate = Promise.withResolvers<void>()
		const provider = new RecordedProvider(
			[{ result: { content: 'abc' }, deltas: ['a', 'b', 'c'] }],
			gate.promise,
		)
		const signal = new AbortController().signal
		const reader = requireValue(
			new RelayStream({ provider, request: { messages: [] }, signal }).response.body,
		).getReader()
		try {
			const first = reader.read()
			const second = reader.read()
			await waitForDelay()
			expect(provider.steps).toBe(1)
			expect(provider.active).toBe(1)
			gate.resolve()
			expect(new TextDecoder().decode((await first).value)).toBe(
				'{"channel":"content","text":"a"}\n',
			)
			expect(new TextDecoder().decode((await second).value)).toBe(
				'{"channel":"content","text":"b"}\n',
			)
			await waitForDelay()
			expect(provider.steps).toBe(3)
			expect(provider.maximum).toBe(1)
			expect(provider.active).toBe(0)
			await reader.read()
			const final = await reader.read()
			expect(parseJSONAs(new TextDecoder().decode(final.value), relayFrameContract.is)).toEqual({
				channel: 'result',
				result: { content: 'abc' },
			})
			expect((await reader.read()).done).toBe(true)
			expect(provider.steps).toBe(4)
			expect(provider.maximum).toBe(1)
		} finally {
			gate.resolve()
			await reader.cancel()
			reader.releaseLock()
		}
		expect(getEventListeners(signal, 'abort')).toEqual([])
	})
	it('aborts upstream before iterator return and suppresses a late pending pull', async () => {
		const gate = Promise.withResolvers<void>()
		const provider = new RecordedProvider([{ content: 'late' }], gate.promise)
		const signal = new AbortController().signal
		const reader = requireValue(
			new RelayStream({ provider, request: { messages: [] }, signal }).response.body,
		).getReader()
		try {
			const pending = reader.read()
			await waitForDelay()
			expect(provider.active).toBe(1)
			await reader.cancel()
			expect(provider.returns).toBe(1)
			expect(provider.cancelled).toBe(true)
			expect(await pending).toEqual({ done: true, value: undefined })
			gate.resolve()
			await waitForDelay()
			expect(provider.active).toBe(0)
			expect(provider.started).toBe(0)
			expect(getEventListeners(signal, 'abort')).toEqual([])
		} finally {
			gate.resolve()
			await reader.cancel()
			reader.releaseLock()
		}
	})
	it('links an already-aborted inbound signal before the upstream turn starts', async () => {
		const abort = new AbortController()
		abort.abort(new Error('cancelled'))
		const provider = createScriptedProvider([{ content: 'unread' }], { record: true })
		const response = new RelayStream({ provider, request: { messages: [] }, signal: abort.signal })
			.response
		expect(parseJSONAs(await response.text(), relayFrameContract.is)).toEqual({
			channel: 'abort',
			partial: { content: '' },
		})
		expect(requireValue(provider.calls[0]).signal.aborted).toBe(true)
		expect(getEventListeners(abort.signal, 'abort')).toEqual([])
	})
})
