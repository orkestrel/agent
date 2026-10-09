import type { GaugeCall } from '../../../../src/core/ledgers/types.js'
import { describe, expect, it } from 'vitest'
import { Gauge } from '../../../../src/core/ledgers/Gauge.js'
import { isLedgerError } from '../../../../src/core/ledgers/errors.js'

// Gauge arithmetic on hand-computed values. A recall call with a short result estimates 25 units: the
// assistant message is 4 overhead plus ceil(65 / 4) = 17 for its serialized call, the tool message 4.

const SEED = { scale: 1.1634671320535195, fixed: 498, capacity: 32768 } as const

function readCode(build: () => unknown): string | undefined {
	try {
		build()
	} catch (error) {
		return isLedgerError(error) ? error.code : 'OTHER'
	}
	return undefined
}

describe('Gauge construction', () => {
	it('refuses an invalid generation cap and accepts its boundaries', () => {
		for (const predict of [
			-1,
			0.5,
			SEED.capacity,
			SEED.capacity + 1,
			Number.NaN,
			Infinity,
			Number.MAX_SAFE_INTEGER + 1,
		]) {
			expect(readCode(() => new Gauge({ ...SEED, predict }))).toBe('CAPACITY')
		}
		for (const predict of [0, -0, SEED.capacity - 1]) {
			expect(readCode(() => new Gauge({ ...SEED, predict }))).toBeUndefined()
		}
	})

	it('refuses a scale that is nonfinite or not above 0', () => {
		for (const scale of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(readCode(() => new Gauge({ ...SEED, scale }))).toBe('GAUGE')
		}
	})

	it('refuses a fixed cost that is negative or nonfinite and accepts 0', () => {
		for (const fixed of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(readCode(() => new Gauge({ ...SEED, fixed }))).toBe('GAUGE')
		}
		expect(readCode(() => new Gauge({ ...SEED, fixed: 0 }))).toBeUndefined()
	})

	it('refuses a capacity that is not a positive safe integer', () => {
		for (const capacity of [0, -5, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
			expect(readCode(() => new Gauge({ ...SEED, capacity }))).toBe('CAPACITY')
		}
	})
})

describe('Gauge.measure', () => {
	it('prices the seed reading at fixed plus scale times the estimate', () => {
		// One user message of 6860 characters estimates 1715 + 4 = 1719; 498 + 1.1634671320535195 * 1719 = 2498.
		const gauge = new Gauge(SEED)
		const price = gauge.measure([{ id: 'u', role: 'user', content: 'a'.repeat(6860) }])
		expect(price).toBeCloseTo(2498, 6)
	})

	it('prices no messages at the fixed cost', () => {
		expect(new Gauge(SEED).measure([])).toBe(498)
	})
})

describe('Gauge.observe', () => {
	it('rescales from the first call with the fixed cost taken out', () => {
		const gauge = new Gauge(SEED)
		gauge.observe([
			{ estimate: 1000, prompt: 1498, tools: 3 },
			{ estimate: 2000, prompt: 9000, tools: 3 },
		])
		expect(gauge.scale).toBe(1)
		expect(gauge.fixed).toBe(498)
	})

	it('keeps the scale when the first call has no usage, no estimate, or a prompt at or under the fixed cost', () => {
		const gauge = new Gauge({ scale: 2, fixed: 100, capacity: 1000 })
		gauge.observe([{ estimate: 50, tools: 0 }])
		gauge.observe([{ estimate: 0, prompt: 500, tools: 0 }])
		gauge.observe([{ estimate: 50, prompt: 100, tools: 0 }])
		expect(gauge.scale).toBe(2)
	})

	it('reproduces the seed scale from the seed prompt', () => {
		const gauge = new Gauge({ scale: 5, fixed: 498, capacity: 32768 })
		gauge.observe([{ estimate: 1719, prompt: 2498, tools: 3 }])
		expect(gauge.scale).toBeCloseTo(1.1634671320535195, 12)
	})
})

describe('Gauge.rate', () => {
	it('falls back to the scale before two calls of one tool count exist', () => {
		const gauge = new Gauge({ scale: 1.5, fixed: 0, capacity: 1000 })
		expect(gauge.rate([])).toBe(1.5)
		expect(gauge.rate([{ estimate: 100, prompt: 200, tools: 1 }])).toBe(1.5)
	})

	it('fits within each tool count and pools, where one slope across both reads 0', () => {
		// Tools 3: (100, 300), (200, 400), slope 1. Tools 1: (300, 250), (400, 350), slope 1.
		// One line through all four points has slope 0.
		const gauge = new Gauge({ scale: 9, fixed: 0, capacity: 10000 })
		gauge.observe([
			{ estimate: 100, prompt: 300, tools: 3 },
			{ estimate: 200, prompt: 400, tools: 3 },
		])
		const live: readonly GaugeCall[] = [
			{ estimate: 300, prompt: 250, tools: 1 },
			{ estimate: 400, prompt: 350, tools: 1 },
		]
		expect(gauge.rate(live)).toBe(1)
	})

	it('pools the kept requests with the calls in progress', () => {
		// Kept: (100, 150), (200, 250), slope 1. Live: (100, 100), (200, 400), slope 3. Equal spreads pool to 2.
		const gauge = new Gauge({ scale: 9, fixed: 0, capacity: 10000 })
		gauge.observe([
			{ estimate: 100, prompt: 150, tools: 0 },
			{ estimate: 200, prompt: 250, tools: 0 },
		])
		const live: readonly GaugeCall[] = [
			{ estimate: 100, prompt: 100, tools: 0 },
			{ estimate: 200, prompt: 400, tools: 0 },
		]
		expect(gauge.rate(live)).toBe(2)
	})

	it('returns the scale when the fit slope is negative or zero', () => {
		const falling = new Gauge({ scale: 9, fixed: 0, capacity: 10000 })
		falling.observe([
			{ estimate: 100, prompt: 300, tools: 0 },
			{ estimate: 200, prompt: 200, tools: 0 },
		])
		expect(falling.rate([])).toBe(3)
		const flat = new Gauge({ scale: 9, fixed: 0, capacity: 10000 })
		flat.observe([
			{ estimate: 100, prompt: 300, tools: 0 },
			{ estimate: 200, prompt: 300, tools: 0 },
		])
		expect(flat.rate([])).toBe(3)
	})

	it('keeps its own copy of the observed calls', () => {
		const gauge = new Gauge({ scale: 9, fixed: 0, capacity: 10000 })
		const calls = [
			{ estimate: 100, prompt: 150, tools: 0 },
			{ estimate: 200, prompt: 250, tools: 0 },
		]
		gauge.observe(calls)
		calls.length = 0
		expect(gauge.rate([])).toBe(1)
	})

	it('ignores a call with no usage', () => {
		const gauge = new Gauge({ scale: 9, fixed: 0, capacity: 10000 })
		expect(
			gauge.rate([
				{ estimate: 100, tools: 0 },
				{ estimate: 200, prompt: 300, tools: 0 },
			]),
		).toBe(9)
	})
})

describe('Gauge.left', () => {
	it('counts the whole completion when thinking is replayed within a turn or across turns', () => {
		for (const replay of ['turn', 'all'] as const) {
			const retained = new Gauge({ scale: 1, fixed: 0, capacity: 1000, replay })
			expect(
				retained.left([{ estimate: 100, prompt: 100, completion: 300, thinking: 250, tools: 0 }]),
			).toBe(600)
		}
		const dropped = new Gauge({ scale: 1, fixed: 0, capacity: 1000 })
		expect(
			dropped.left([{ estimate: 100, prompt: 100, completion: 300, thinking: 250, tools: 0 }]),
		).toBe(850)
	})

	const gauge = new Gauge({ scale: 2, fixed: 100, capacity: 10000 })

	it('subtracts the last prompt and completion', () => {
		expect(gauge.left([{ estimate: 1, prompt: 3000, completion: 500, tools: 0 }])).toBe(6500)
		expect(gauge.left([{ estimate: 1, prompt: 3000, tools: 0 }])).toBe(7000)
	})

	it('prices a call with no usage at fixed plus scale times the estimate', () => {
		// 100 + 2 * 1000 = 2100.
		expect(gauge.left([{ estimate: 1000, tools: 0 }])).toBe(7900)
	})

	it('reads only the last call', () => {
		expect(
			gauge.left([
				{ estimate: 1, prompt: 9000, tools: 0 },
				{ estimate: 1, prompt: 1000, tools: 0 },
			]),
		).toBe(9000)
	})

	it('prices no calls at the fixed cost', () => {
		expect(gauge.left([])).toBe(9900)
	})

	it('never falls below 0', () => {
		expect(gauge.left([{ estimate: 1, prompt: 9000, completion: 2000, tools: 0 }])).toBe(0)
	})
})

describe('Gauge.reserve', () => {
	it('excludes thinking from the reply reserve under every replay policy', () => {
		for (const replay of ['none', 'turn', 'all'] as const) {
			const gauge = new Gauge({ scale: 1, fixed: 0, capacity: 1000, replay })
			gauge.observe([], { estimate: 10, completion: 900, thinking: 850, tools: 0 })
			expect(gauge.reserve([], '')).toBe(75)
		}
	})

	it('prices the longest text and one recall call at the rate before any reply is observed', () => {
		// Rate 2. Longest 40 characters: 10 + 4 = 14 units. Recall call 25 units. (14 + 25) * 2 = 78.
		const gauge = new Gauge({ scale: 2, fixed: 100, capacity: 10000 })
		expect(gauge.reserve([], 'a'.repeat(40))).toBe(78)
	})

	it('uses the final answer completion instead of a larger tool completion', () => {
		// Observing (100, 300) sets scale 3 and rate 3. Reply 70, recall 25 * 3 = 75.
		const gauge = new Gauge({ scale: 2, fixed: 0, capacity: 10000 })
		gauge.observe(
			[
				{ estimate: 100, prompt: 300, completion: 900, tools: 1 },
				{ estimate: 100, prompt: 300, completion: 70, tools: 0 },
			],
			{ estimate: 100, prompt: 300, completion: 70, tools: 0 },
		)
		expect(gauge.reserve([], 'a'.repeat(4000))).toBe(145)
	})

	it('keeps the longest completion across requests', () => {
		const gauge = new Gauge({ scale: 2, fixed: 0, capacity: 10000 })
		gauge.observe([{ estimate: 100, prompt: 300, completion: 70, tools: 0 }], {
			estimate: 100,
			completion: 70,
			tools: 0,
		})
		gauge.observe([{ estimate: 100, prompt: 300, completion: 40, tools: 0 }], {
			estimate: 100,
			completion: 40,
			tools: 0,
		})
		expect(gauge.reserve([], '')).toBe(145)
	})
	it('keeps the text fallback when a request delivered no final answer', () => {
		const gauge = new Gauge({ scale: 1, fixed: 0, capacity: 10000 })
		gauge.observe([{ estimate: 100, prompt: 100, completion: 900, tools: 1 }])
		expect(gauge.reserve([], '')).toBe(29)
	})
})

describe('Gauge.room', () => {
	it('preserves room, reserve, and recall closure when capacity grows by the generation cap', () => {
		const plain = new Gauge({ scale: 1, fixed: 0, capacity: 3072 })
		const thinking = new Gauge({
			scale: 1,
			fixed: 0,
			capacity: 4096,
			predict: 1024,
			replay: 'none',
		})
		plain.observe([], { estimate: 100, completion: 100, tools: 0 })
		thinking.observe([], { estimate: 100, completion: 500, thinking: 400, tools: 0 })
		for (const prompt of [1000, 2600, 2822, 2823, 2900]) {
			const plainCalls = [{ estimate: 100, prompt, completion: 0, tools: 0 }]
			const thinkingCalls = [{ estimate: 100, prompt, completion: 700, thinking: 700, tools: 0 }]
			expect(thinking.left(thinkingCalls) - 1024).toBe(plain.left(plainCalls))
			expect(thinking.reserve(thinkingCalls, '')).toBe(plain.reserve(plainCalls, ''))
			expect(thinking.room(thinkingCalls, '')).toBe(plain.room(plainCalls, ''))
			expect(thinking.left(thinkingCalls) - 1024 < 2 * thinking.reserve(thinkingCalls, '')).toBe(
				prompt > 2822,
			)
			expect(plain.left(plainCalls) < 2 * plain.reserve(plainCalls, '')).toBe(prompt > 2822)
		}
	})

	it('halves what the call left beyond the reserve and divides by the rate', () => {
		// Left 10000 - 2100 = 7900. Reserve 78 at rate 2. (7900 - 78) / 2 / 2 = 1955.5.
		const gauge = new Gauge({ scale: 2, fixed: 100, capacity: 10000 })
		expect(gauge.room([{ estimate: 1000, tools: 0 }], 'a'.repeat(40))).toBe(1955.5)
	})

	it('floors at 0 when the reserve exceeds what is left', () => {
		const gauge = new Gauge({ scale: 2, fixed: 100, capacity: 10000 })
		expect(gauge.room([{ estimate: 1, prompt: 9990, tools: 0 }], 'a'.repeat(40))).toBe(0)
		expect(gauge.room([{ estimate: 1, prompt: 9999, completion: 500, tools: 0 }], '')).toBe(0)
	})
})
