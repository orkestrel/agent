import type { AuthorityDecision } from '@src/core'
import { CANARY_SENTINELS, createToolCall } from '../../../setup.js'
import { getEventListeners } from 'node:events'
import { describe, expect, it } from 'vitest'
import { Approver, isAgentError } from '@src/core'

// The approver in isolation: the bound handler, the ask registry keyed by the call object, the
// minted id, the frame members, strict approval, the missed mark, and the run-signal cleanup. The
// approver wired into a run is covered in Agent.test.ts.

describe('Approver', () => {
	const decision: AuthorityDecision = { zone: 'files', verdict: 'ask', reason: 'needs a look' }

	it('returns one bound ask on every read', async () => {
		const approver = new Approver()
		const controller = new AbortController()
		const call = createToolCall({ name: 'write', arguments: { path: 'a.txt' } })

		expect(approver.ask).toBe(approver.ask)
		const pending = Reflect.apply(approver.ask, undefined, [{ call }, decision, controller.signal])

		expect(approver.frame(call)).toBeDefined()
		controller.abort()
		expect(await pending).toBe(false)
	})

	it('registers an ask before it suspends', async () => {
		const approver = new Approver()
		const controller = new AbortController()
		const call = createToolCall({ name: 'write', arguments: { path: 'a.txt' } })

		const pending = approver.ask({ call }, decision, controller.signal)

		expect(approver.frame(call)).toMatchObject({ category: 'ask', name: 'write' })
		controller.abort()
		expect(await pending).toBe(false)
	})

	it('frames name, zone, and arguments only', async () => {
		const approver = new Approver()
		const controller = new AbortController()
		const call = createToolCall({
			id: 'c7',
			name: 'write',
			arguments: { path: 'a.txt', mode: 'w' },
		})

		const pending = approver.ask({ call }, decision, controller.signal)
		const frame = approver.frame(call)

		expect(Object.keys(frame ?? {}).toSorted()).toEqual([
			'arguments',
			'category',
			'id',
			'name',
			'zone',
		])
		expect(frame).toMatchObject({
			category: 'ask',
			name: 'write',
			zone: 'files',
			arguments: '{"mode":"w","path":"a.txt"}',
		})
		controller.abort()
		expect(await pending).toBe(false)
	})

	it('mints an id apart from the call id', async () => {
		const approver = new Approver()
		const controller = new AbortController()
		const first = createToolCall({ id: 'c1', name: 'write' })
		const second = createToolCall({ id: 'c1', name: 'write' })

		const pending = [
			approver.ask({ call: first }, decision, controller.signal),
			approver.ask({ call: second }, decision, controller.signal),
		]
		const ids = [first, second].map((call) => {
			const frame = approver.frame(call)
			return frame?.category === 'ask' ? frame.id : undefined
		})

		expect(new Set(ids).size).toBe(2)
		expect(ids).not.toContain('c1')
		expect(ids).not.toContain(undefined)
		controller.abort()
		expect(await Promise.all(pending)).toEqual([false, false])
	})

	it('approves only on approved true', async () => {
		const approver = new Approver()
		const signal = new AbortController().signal

		for (const approved of ['true', 1, null, true]) {
			const call = createToolCall({ name: 'write' })
			const pending = approver.ask({ call }, decision, signal)
			const frame = approver.frame(call)
			const id = frame?.category === 'ask' ? frame.id : ''

			expect(Reflect.apply(approver.answer, approver, [{ id, approved }])).toBe(true)
			expect(await pending).toBe(approved === true)
		}
	})

	it('answers false for an unknown id', async () => {
		const approver = new Approver()
		const controller = new AbortController()
		const call = createToolCall({ name: 'write' })

		const pending = approver.ask({ call }, decision, controller.signal)

		expect(approver.answer({ id: 'unknown', approved: true })).toBe(false)
		expect(approver.frame(call)).toBeDefined()
		controller.abort()
		expect(await pending).toBe(false)
	})

	it('refuses a second answer to one id', async () => {
		const approver = new Approver()
		const controller = new AbortController()
		const first = createToolCall({ id: 'c1', name: 'write' })
		const second = createToolCall({ id: 'c2', name: 'write' })

		const settled = approver.ask({ call: first }, decision, controller.signal)
		const frame = approver.frame(first)
		const id = frame?.category === 'ask' ? frame.id : ''
		expect(approver.answer({ id, approved: true })).toBe(true)
		expect(approver.answer({ id, approved: true })).toBe(false)
		expect(await settled).toBe(true)
		const waiting = approver.ask({ call: second }, decision, controller.signal)

		expect(approver.answer({ id, approved: true })).toBe(false)
		expect(approver.frame(second)).toBeDefined()
		controller.abort()
		expect(await waiting).toBe(false)
	})

	it('settles to the call the page saw', async () => {
		const approver = new Approver()
		const controller = new AbortController()
		const first = createToolCall({ id: 'c1', name: 'write', arguments: { path: 'a.txt' } })
		const second = createToolCall({ id: 'c2', name: 'write', arguments: { path: 'b.txt' } })

		const waiting = approver.ask({ call: first }, decision, controller.signal)
		const answered = approver.ask({ call: second }, decision, controller.signal)
		const frame = approver.frame(second)
		const id = frame?.category === 'ask' ? frame.id : ''

		expect(approver.answer({ id, approved: true })).toBe(true)
		expect(await answered).toBe(true)
		expect(approver.frame(first)).toMatchObject({ arguments: '{"path":"a.txt"}' })
		controller.abort()
		expect(await waiting).toBe(false)
	})

	it('refuses an ask after a missed frame', async () => {
		const approver = new Approver()
		const call = createToolCall({ name: 'write' })

		expect(approver.frame(call)).toBeUndefined()
		const error = await Promise.resolve(
			approver.ask({ call }, decision, new AbortController().signal),
		).then(
			() => undefined,
			(reason: unknown) => reason,
		)

		expect(isAgentError(error) && error.code).toBe('APPROVER')
	})

	it('refuses a second ask for one call', async () => {
		const approver = new Approver()
		const controller = new AbortController()
		const call = createToolCall({ name: 'write' })

		const waiting = approver.ask({ call }, decision, controller.signal)
		const error = await Promise.resolve(approver.ask({ call }, decision, controller.signal)).then(
			() => undefined,
			(reason: unknown) => reason,
		)

		expect(isAgentError(error) && error.code).toBe('APPROVER')
		expect(approver.frame(call)).toBeDefined()
		controller.abort()
		expect(await waiting).toBe(false)
	})

	it('drops the ask when the run aborts', async () => {
		const approver = new Approver()
		const controller = new AbortController()
		const call = createToolCall({ name: 'write' })

		const pending = approver.ask({ call }, decision, controller.signal)
		const frame = approver.frame(call)
		controller.abort()

		expect(await pending).toBe(false)
		expect(frame?.category === 'ask' && approver.answer({ id: frame.id, approved: true })).toBe(
			false,
		)
		expect(getEventListeners(controller.signal, 'abort')).toEqual([])
	})

	it('releases the run signal on an answer', async () => {
		const approver = new Approver()
		const controller = new AbortController()
		const call = createToolCall({ name: 'write' })

		const pending = approver.ask({ call }, decision, controller.signal)
		const frame = approver.frame(call)
		expect(getEventListeners(controller.signal, 'abort')).toHaveLength(1)
		expect(frame?.category === 'ask' && approver.answer({ id: frame.id, approved: true })).toBe(
			true,
		)

		expect(await pending).toBe(true)
		expect(controller.signal.aborted).toBe(false)
		expect(getEventListeners(controller.signal, 'abort')).toEqual([])
	})

	it('resolves false on an aborted signal', async () => {
		const approver = new Approver()
		const call = createToolCall({ name: 'write' })

		expect(await approver.ask({ call }, decision, AbortSignal.abort())).toBe(false)
		expect(approver.frame(call)).toBeUndefined()
	})

	it('refuses arguments it cannot render', async () => {
		const approver = new Approver()
		const cyclic: Record<string, unknown> = { path: 'a.txt' }
		cyclic.self = cyclic
		const unreadable = new Proxy(
			{ path: 'a.txt' },
			{
				get() {
					throw new Error('unreadable path')
				},
			},
		)

		for (const args of [cyclic, unreadable]) {
			const call = createToolCall({ name: 'write', arguments: args })
			const error = await Promise.resolve(
				approver.ask({ call }, decision, new AbortController().signal),
			).then(
				() => undefined,
				(reason: unknown) => reason,
			)

			expect(isAgentError(error) && error.code).toBe('APPROVER')
			expect(approver.frame(call)).toBeUndefined()
		}
	})

	it('encodes the call name in a refusal', async () => {
		const approver = new Approver()
		const controller = new AbortController()
		const name = `${CANARY_SENTINELS.name}\n"${'x'.repeat(80)}`
		const call = createToolCall({ name })

		const waiting = approver.ask({ call }, decision, controller.signal)
		const error = await Promise.resolve(approver.ask({ call }, decision, controller.signal)).then(
			() => undefined,
			(reason: unknown) => reason,
		)

		expect(isAgentError(error) && error.code).toBe('APPROVER')
		const message = error instanceof Error ? error.message : ''
		expect(message).toContain(CANARY_SENTINELS.name)
		expect(message).not.toContain('\n')
		expect(message).not.toContain(name)
		controller.abort()
		expect(await waiting).toBe(false)
	})
})
