import { BUILTIN_NAMES, createDisclosureScale } from '../../../setup.js'
import { measureOtherLoad } from '../../../setupServer.js'
import { collectDisclosure } from '@src/core'
import { expect, it } from 'vitest'
import { createRecorder } from '@orkestrel/test'

// Claim 2.11: `collectDisclosure` over 1600 stored messages reads at most 6.6 ms, 1% of the 660 ms
// selection stop `methods.md` records, and at 3200 messages at most 2.5 times its 1600 reading.
// Half of each conversation sits in sections and half in the live tail. Each arm, with unique and
// with per-turn call ids, discards 20 warmup readings and takes the median of 60, and the test logs
// one JSON line per arm with the host's other load. The growth bar is the instrument's failing
// control: a derivation that searches the prefix for each owner grows past it.

it(
	'reads a disclosure within claim 2.11 at 1600 and 3200 messages',
	{ timeout: 300_000 },
	async ({ bench, task }) => {
		const arms = [
			{ size: 1600, unique: true },
			{ size: 3200, unique: true },
			{ size: 1600, unique: false },
			{ size: 3200, unique: false },
		]
		const readings = createRecorder<readonly [size: number, unique: boolean, median: number]>()
		for (const { size, unique } of arms) {
			const conversation = await createDisclosureScale(size, unique)
			expect(conversation.sections.length).toBeGreaterThan(0)
			expect(
				conversation.sections.flatMap((section) => section.messages).length +
					conversation.messages().length,
			).toBe(size)
			expect(
				Array.from({ length: 20 }, () => collectDisclosure(conversation, BUILTIN_NAMES)),
			).toHaveLength(20)
			const walls = createRecorder<readonly [wall: number]>()
			const measured = await measureOtherLoad(() =>
				bench(`${task.name} ${size} ${unique}`, { async: false, retainSamples: true }, () => {
					const start = performance.now()
					collectDisclosure(conversation, BUILTIN_NAMES)
					const wall = performance.now() - start
					walls.handler(wall)
					return { overriddenDuration: wall }
				}).run({ iterations: 60, time: 0, warmup: false, throws: true }),
			)
			const sorted = walls.calls.map(([wall]) => wall).toSorted((left, right) => left - right)
			const median = sorted[Math.floor(sorted.length / 2)] ?? Number.NaN
			console.log(
				JSON.stringify({
					size,
					unique,
					median,
					high: sorted[Math.floor(sorted.length * 0.95)],
					load: measured.load,
					version: process.version,
				}),
			)
			readings.handler(size, unique, median)
		}
		for (const unique of [true, false]) {
			const small = readings.calls.find(([size, flag]) => size === 1600 && flag === unique)?.[2]
			const large = readings.calls.find(([size, flag]) => size === 3200 && flag === unique)?.[2]
			expect(Number.isFinite(small)).toBe(true)
			expect(Number.isFinite(large)).toBe(true)
			expect(small ?? Number.NaN).toBeLessThanOrEqual(6.6)
			expect((large ?? Number.NaN) / (small ?? Number.NaN)).toBeLessThanOrEqual(2.5)
		}
	},
)
