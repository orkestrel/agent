import type { Selection } from '../../../../src/core/contexts/types.js'
import { describe, expect, it } from 'vitest'
import { LedgerPass } from '../../../../src/core/ledgers/LedgerPass.js'

describe('LedgerPass', () => {
	it('opens at its boundary with no selection, usage, call, or position', () => {
		const pass = new LedgerPass(3)
		expect(pass.boundary).toBe(3)
		expect(pass.selection).toBeUndefined()
		expect(pass.usage).toBeUndefined()
		expect(pass.call).toBeUndefined()
		expect(pass.position).toBeUndefined()
		expect(pass.calls).toEqual([])
	})

	it('adopts a selection at a boundary and sums the usage each selection spent', () => {
		const pass = new LedgerPass(0)
		const first: Selection = {
			messages: [],
			judgments: ['first'],
			usage: { prompt: 5, completion: 1, total: 6 },
		}
		const second: Selection = { messages: [], judgments: [] }
		pass.adopt(first, 2)
		pass.adopt(second, 4)
		expect(pass.selection).toBe(second)
		expect(pass.boundary).toBe(4)
		expect(pass.usage).toEqual({ prompt: 5, completion: 1, total: 6 })
	})

	it('sums spent usage without billing a call', () => {
		const pass = new LedgerPass(0)
		pass.observe({ estimate: 1, tools: 2 }, 0)
		pass.spend({ prompt: 4, completion: 2, total: 6 })
		pass.spend({ prompt: 1, completion: 1, total: 2 })
		expect(pass.usage).toEqual({ prompt: 5, completion: 3, total: 8 })
		expect(pass.calls).toEqual([{ estimate: 1, tools: 2 }])
	})

	it('reads the latest observed call and its position', () => {
		const pass = new LedgerPass(0)
		pass.observe({ estimate: 1, tools: 2 }, 3)
		expect(pass.call).toEqual({ estimate: 1, tools: 2 })
		expect(pass.position).toBe(3)
		pass.observe({ estimate: 2, tools: 2 }, 6)
		expect(pass.call).toEqual({ estimate: 2, tools: 2 })
		expect(pass.position).toBe(6)
	})

	it('bills a reported usage to the call observed before it and keeps earlier calls final', () => {
		const pass = new LedgerPass(0)
		pass.observe({ estimate: 1, tools: 2 }, 0)
		pass.bill({ prompt: 10, completion: 2, total: 12 })
		pass.observe({ estimate: 2, tools: 2 }, 3)
		pass.bill({ prompt: 20, completion: 4, total: 24 })
		expect(pass.calls).toEqual([
			{ estimate: 1, tools: 2, prompt: 10, completion: 2 },
			{ estimate: 2, tools: 2, prompt: 20, completion: 4 },
		])
		expect(pass.call).toEqual({ estimate: 2, tools: 2, prompt: 20, completion: 4 })
	})

	it('replaces the prompt and completion with the last usage the call received', () => {
		const pass = new LedgerPass(0)
		pass.observe({ estimate: 1, tools: 0 }, 0)
		pass.bill({ prompt: 10, completion: 2, total: 12 })
		pass.bill({ prompt: 11, completion: 3, total: 14 })
		expect(pass.calls).toEqual([{ estimate: 1, tools: 0, prompt: 11, completion: 3 }])
	})

	it('attributes thinking to the call observed before it, and keeps it when usage is billed again', () => {
		const pass = new LedgerPass(0)
		pass.observe({ estimate: 1, tools: 0 }, 0)
		pass.bill({ prompt: 10, completion: 6, total: 16 })
		pass.think(4)
		pass.observe({ estimate: 2, tools: 0 }, 2)
		pass.bill({ prompt: 20, completion: 5, total: 25 })
		pass.think(1)
		pass.bill({ prompt: 21, completion: 5, total: 26 })
		pass.think(2)
		expect(pass.calls).toEqual([
			{ estimate: 1, tools: 0, prompt: 10, completion: 6, thinking: 4 },
			{ estimate: 2, tools: 0, prompt: 21, completion: 5, thinking: 2 },
		])
		pass.observe({ estimate: 3, tools: 0 }, 4)
		pass.bill({ prompt: 30, completion: 7, total: 37 })
		expect(pass.calls).toEqual([
			{ estimate: 1, tools: 0, prompt: 10, completion: 6, thinking: 4 },
			{ estimate: 2, tools: 0, prompt: 21, completion: 5, thinking: 2 },
			{ estimate: 3, tools: 0, prompt: 30, completion: 7 },
		])
	})

	it('joins no call to a usage or thinking reported before the first call', () => {
		const pass = new LedgerPass(0)
		pass.bill({ prompt: 9, completion: 9, total: 18 })
		pass.think(5)
		expect(pass.calls).toEqual([])
		expect(pass.call).toBeUndefined()
		pass.observe({ estimate: 1, tools: 1 }, 0)
		expect(pass.calls).toEqual([{ estimate: 1, tools: 1 }])
	})

	it('reads a billed usage as the values it held at bill time, whatever the caller changes later', () => {
		const pass = new LedgerPass(0)
		const billed = { prompt: 10, completion: 2, total: 12 }
		pass.observe({ estimate: 1, tools: 0 }, 0)
		pass.bill(billed)
		billed.prompt = 99
		expect(pass.calls).toEqual([{ estimate: 1, tools: 0, prompt: 10, completion: 2 }])
		pass.observe({ estimate: 2, tools: 0 }, 1)
		billed.completion = 98
		expect(pass.calls).toEqual([
			{ estimate: 1, tools: 0, prompt: 10, completion: 2 },
			{ estimate: 2, tools: 0 },
		])
		expect(pass.call).toEqual({ estimate: 2, tools: 0 })
	})

	it('hands out calls that later reports do not change', () => {
		const pass = new LedgerPass(0)
		pass.observe({ estimate: 1, tools: 0 }, 0)
		const before = pass.calls
		pass.bill({ prompt: 3, completion: 1, total: 4 })
		pass.observe({ estimate: 2, tools: 0 }, 1)
		expect(before).toEqual([{ estimate: 1, tools: 0 }])
		expect(pass.calls).toEqual([
			{ estimate: 1, tools: 0, prompt: 3, completion: 1 },
			{ estimate: 2, tools: 0 },
		])
	})
})
