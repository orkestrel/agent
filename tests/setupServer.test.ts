import { createRecorder, waitForCondition } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import { createFixtureServer, stopTimed } from './setupServer.js'

describe('createFixtureServer', () => {
	it('binds independent loopback listeners, customizes routes, and releases caller-owned resources', async () => {
		const requests = createRecorder<readonly [string]>()
		const first = createFixtureServer([
			{
				method: 'POST',
				path: '/answer',
				handler: async (request) => {
					requests.handler(await request.text())
					return Response.json({ answer: 7 })
				},
			},
		])
		const second = createFixtureServer([
			{ method: 'GET', path: '/other', handler: () => new Response('other') },
		])
		try {
			expect(first.status).toBe('idle')
			const port = await first.start()
			const other = await second.start()
			expect(port).toBeGreaterThan(0)
			expect(other).not.toBe(port)
			expect(first.address?.address).toBe('127.0.0.1')
			expect(second.address?.address).toBe('127.0.0.1')
			const response = await fetch('http://127.0.0.1:' + port + '/answer', {
				method: 'POST',
				body: 'question',
			})
			expect(await response.json()).toEqual({ answer: 7 })
			expect(requests.calls).toEqual([['question']])
			const refused = await fetch('http://127.0.0.1:' + port + '/answer')
			expect(refused.status).toBe(405)
			expect(refused.headers.get('allow')).toBe('POST')
			await refused.text()
			const missing = await fetch('http://127.0.0.1:' + port + '/absent')
			expect(missing.status).toBe(404)
			await missing.text()
			expect(await (await fetch('http://127.0.0.1:' + other + '/other')).text()).toBe('other')
		} finally {
			await Promise.all([first.stop(), second.stop()])
		}
		expect(first.status).toBe('stopped')
		expect(second.status).toBe('stopped')
		expect(first.address).toBeUndefined()
		expect(second.address).toBeUndefined()
	})
	it('lets a caller close the listener when its scenario rejects', async () => {
		const server = createFixtureServer([])
		const failure = new Error('scenario failed')
		await expect(async () => {
			try {
				await server.start()
				throw failure
			} finally {
				await server.stop()
			}
		}).rejects.toBe(failure)
		expect(server.status).toBe('stopped')
		expect(server.address).toBeUndefined()
	})
})

describe('stopTimed', () => {
	it('releases the parked request before it times the stop and reports the elapsed interval', async () => {
		const gate = Promise.withResolvers<void>()
		const entered = createRecorder<readonly []>()
		const released = createRecorder<readonly []>()
		const server = createFixtureServer([
			{
				method: 'GET',
				path: '/parked',
				handler: async () => {
					entered.handler()
					await gate.promise
					return new Response('parked')
				},
			},
		])
		const port = await server.start()
		const reply = fetch('http://127.0.0.1:' + port + '/parked').then((response) => response.text())
		await waitForCondition('the request parked on the gate', () => entered.calls.length === 1)
		expect(entered.calls).toEqual([[]])
		const opening = performance.now()
		const elapsed = await stopTimed(server, () => {
			released.handler()
			gate.resolve()
		})
		const outer = performance.now() - opening
		expect(released.calls).toEqual([[]])
		expect(await reply).toBe('parked')
		expect(server.status).toBe('stopped')
		expect(Number.isFinite(elapsed)).toBe(true)
		expect(elapsed).toBeGreaterThanOrEqual(0)
		expect(elapsed).toBeLessThanOrEqual(outer)
	})
	it('stops a server whose scenario failed and still reports the interval', async () => {
		const server = createFixtureServer([])
		await server.start()
		const failure = new Error('scenario failed')
		const released = createRecorder<readonly []>()
		const drain = await Promise.reject(failure).then(
			() => -1,
			async () => stopTimed(server, released.handler),
		)
		expect(drain).toBeGreaterThanOrEqual(0)
		expect(released.calls).toEqual([[]])
		expect(server.status).toBe('stopped')
	})
})
