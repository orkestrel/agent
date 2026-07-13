import { describe, expect, it } from 'vitest'
import { Channel } from '@src/core'
import { collect, waitForDelay } from '../../../setup.js'

// The Channel is MODULE-INTERNAL to the agents surface (not barrel-exported), so it is
// imported by its relative source path — the same way the server worker fixtures reach
// an un-exported source file (no `@src/core/*` wildcard alias exists). These tests pin
// the SUBTLE write/read decoupling the Agent relies on indirectly: a producer (`push` /
// `close` / `fail`) and a consumer (`drain`) interleave through the resolver-swap park
// without dropping, truncating, or re-ordering a chunk. Real async iteration, no mocks.

describe('Channel — lost-wakeup (park then push)', () => {
	it('delivers a value pushed while a consumer is parked', async () => {
		const channel = new Channel<number>()
		// Start draining BEFORE any push so the iterator parks on an empty buffer.
		const drained = collect(channel.drain())
		// Let the consumer reach its parked await, then push — this is the lost-wakeup case:
		// the push must wake the parked reader and the value must be delivered, not dropped.
		await waitForDelay(10)
		channel.push(1)
		await waitForDelay(10)
		channel.push(2)
		await waitForDelay(10)
		channel.close()
		expect(await drained).toEqual([1, 2])
	})

	it('does not lose a push that lands between two pulls', async () => {
		const channel = new Channel<number>()
		const iterator = channel.drain()
		// First pull parks (buffer empty); a push wakes it and resolves with the value.
		const first = iterator.next()
		await waitForDelay(10)
		channel.push(1)
		expect((await first).value).toBe(1)
		// Second pull parks again; the next push between pulls is likewise not lost.
		const second = iterator.next()
		await waitForDelay(10)
		channel.push(2)
		expect((await second).value).toBe(2)
		channel.close()
		expect((await iterator.next()).done).toBe(true)
	})
})

describe('Channel — buffer-before-close (no truncation)', () => {
	it('drains every chunk pushed before close, then ends', async () => {
		const channel = new Channel<number>()
		// Push 3, then close synchronously — all three must yield before `done`.
		channel.push(1)
		channel.push(2)
		channel.push(3)
		channel.close()
		const out: number[] = []
		const iterator = channel.drain()
		let next = await iterator.next()
		while (!next.done) {
			out.push(next.value)
			next = await iterator.next()
		}
		expect(out).toEqual([1, 2, 3])
		expect(next.done).toBe(true)
	})

	it('flushes a value buffered just before close even when drained late', async () => {
		const channel = new Channel<string>()
		channel.push('a')
		channel.close()
		// The consumer starts AFTER push+close — the buffered value still flushes first,
		// then the iterator returns (close does not discard buffered chunks).
		expect(await collect(channel.drain())).toEqual(['a'])
	})
})

describe('Channel — fail', () => {
	it('throws the recorded error from drain', async () => {
		const channel = new Channel<number>()
		const error = new Error('boom')
		channel.fail(error)
		await expect(collect(channel.drain())).rejects.toBe(error)
	})

	it('yields already-buffered chunks before throwing', async () => {
		const channel = new Channel<number>()
		channel.push(1)
		channel.push(2)
		channel.fail(new Error('late'))
		const seen: number[] = []
		// Buffered chunks come out first; the failure surfaces only after the buffer drains.
		const drain = (async () => {
			for await (const value of channel.drain()) seen.push(value)
		})()
		await expect(drain).rejects.toThrow('late')
		expect(seen).toEqual([1, 2])
	})

	it('keeps the FIRST failure — a later fail cannot override it', async () => {
		const channel = new Channel<number>()
		const first = new Error('first')
		channel.fail(first)
		channel.fail(new Error('second'))
		await expect(collect(channel.drain())).rejects.toBe(first)
	})

	it('keeps the recorded failure even when a later close arrives', async () => {
		const channel = new Channel<number>()
		const error = new Error('failed')
		channel.fail(error)
		// A close after a fail does not turn the channel into a clean end — drain still throws.
		channel.close()
		await expect(collect(channel.drain())).rejects.toBe(error)
	})
})

describe('Channel — FIFO / backpressure', () => {
	it('drains many pre-buffered pushes in FIFO order', async () => {
		const channel = new Channel<number>()
		const inputs = Array.from({ length: 50 }, (_value, index) => index)
		for (const value of inputs) channel.push(value)
		channel.close()
		expect(await collect(channel.drain())).toEqual(inputs)
	})

	it('delivers every chunk in order to a slow consumer awaiting between pulls', async () => {
		const channel = new Channel<number>()
		const inputs = [10, 20, 30, 40]
		const seen: number[] = []
		// The consumer awaits a delay between each pull while the producer pushes ahead;
		// every chunk must still arrive exactly once, in order (no drop, no reorder).
		const consumer = (async () => {
			for await (const value of channel.drain()) {
				seen.push(value)
				await waitForDelay(5)
			}
		})()
		for (const value of inputs) {
			channel.push(value)
			await waitForDelay(2)
		}
		channel.close()
		await consumer
		expect(seen).toEqual(inputs)
	})

	it('interleaves pushes arriving during slow consumption without loss', async () => {
		const channel = new Channel<number>()
		const seen: number[] = []
		const consumer = (async () => {
			for await (const value of channel.drain()) {
				seen.push(value)
				// Pause long enough that more pushes land mid-consumption (into the buffer).
				await waitForDelay(15)
			}
		})()
		channel.push(1)
		await waitForDelay(5)
		channel.push(2)
		channel.push(3)
		await waitForDelay(5)
		channel.push(4)
		channel.close()
		await consumer
		expect(seen).toEqual([1, 2, 3, 4])
	})
})

describe('Channel — close idempotence & end semantics', () => {
	it('ends once closed and a second close is a harmless no-op', async () => {
		const channel = new Channel<number>()
		channel.push(1)
		channel.close()
		channel.close()
		expect(await collect(channel.drain())).toEqual([1])
	})

	it('a fresh drain after a close ends immediately with no values', async () => {
		const channel = new Channel<number>()
		channel.close()
		// First drain ends empty; a second, fresh drain also ends empty (closed is sticky).
		expect(await collect(channel.drain())).toEqual([])
		expect(await collect(channel.drain())).toEqual([])
	})

	it('flushes the buffer before ending even when close precedes draining', async () => {
		const channel = new Channel<number>()
		channel.push(7)
		channel.push(8)
		channel.close()
		const iterator = channel.drain()
		expect((await iterator.next()).value).toBe(7)
		expect((await iterator.next()).value).toBe(8)
		expect((await iterator.next()).done).toBe(true)
	})

	it('signal with no parked reader is a no-op (push then later drain still sees it)', async () => {
		const channel = new Channel<number>()
		// `push` signals with no reader parked yet — the buffer/flags hold the state, so a
		// drain started afterwards reads them without having missed the signal.
		channel.push(99)
		await waitForDelay(10)
		channel.close()
		expect(await collect(channel.drain())).toEqual([99])
	})
})
