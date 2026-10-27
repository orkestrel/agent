import type { ClassifierReading, Selection } from '@src/core'
import { createConversation, DEFAULT_RECALL_LIMIT, LEDGER_NOTES, LedgerRequest } from '@src/core'
import { describe, expect, it } from 'vitest'
import { computeLedgerErrorCode } from '../../../setup.js'

describe('LedgerRequest', () => {
	it('refuses a recall limit that is not a nonnegative safe integer and accepts its boundaries', () => {
		for (const limit of [-1, 0.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
			expect(computeLedgerErrorCode(() => new LedgerRequest('Check.', limit))).toBe('LIMIT')
		}
		for (const limit of [0, -0, Number.MAX_SAFE_INTEGER]) {
			expect(computeLedgerErrorCode(() => new LedgerRequest('Check.', limit))).toBeUndefined()
		}
	})

	it('appends its content once on enter and holds the message', () => {
		const conversation = createConversation()
		const request = new LedgerRequest('What approval is needed?')
		expect(request.message).toBeUndefined()
		const message = request.enter(conversation)
		expect(message).toMatchObject({ role: 'user', content: 'What approval is needed?' })
		expect(request.enter(conversation)).toBe(message)
		expect(request.message).toBe(message)
		expect(conversation.messages()).toEqual([message])
	})

	it('opens a pass that the current pass members read, starting at its boundary', () => {
		const request = new LedgerRequest('Check.')
		expect(request.boundary).toBeUndefined()
		request.open(2)
		const selection: Selection = { messages: [], judgments: ['first'] }
		request.adopt(selection, 3)
		request.open(5)
		expect(request.boundary).toBe(5)
		expect(request.selection).toBeUndefined()
		expect(request.usage).toBeUndefined()
	})

	it('adopts a selection into the current pass and sums the usage each selection spent', () => {
		const request = new LedgerRequest('Check.')
		const first: Selection = {
			messages: [],
			judgments: ['first'],
			usage: { prompt: 5, completion: 1, total: 6 },
		}
		request.adopt(first, 1)
		expect(request.selection).toBeUndefined()
		request.open(2)
		request.adopt(first, 3)
		const second: Selection = { messages: [], judgments: [] }
		request.adopt(second, 4)
		expect(request.selection).toBe(second)
		expect(request.boundary).toBe(4)
		expect(request.usage).toEqual({ prompt: 5, completion: 1, total: 6 })
	})

	it('observes each call in its pass and keeps every call of every pass in order', () => {
		const request = new LedgerRequest('Check.')
		request.observe({ estimate: 9, tools: 9 }, 0)
		expect(request.calls).toEqual([])
		request.open(0)
		request.observe({ estimate: 1, tools: 2 }, 0)
		request.observe({ estimate: 2, tools: 2 }, 2)
		request.open(4)
		request.observe({ estimate: 3, tools: 0 }, 4)
		expect(request.calls).toEqual([
			{ estimate: 1, tools: 2 },
			{ estimate: 2, tools: 2 },
			{ estimate: 3, tools: 0 },
		])
	})

	it('spends usage on the current pass and bills the call in flight', () => {
		const request = new LedgerRequest('Check.')
		request.open(0)
		request.spend({ prompt: 1, completion: 1, total: 2 })
		request.observe({ estimate: 1, tools: 2 }, 0)
		request.spend({ prompt: 10, completion: 2, total: 12 })
		expect(request.usage).toEqual({ prompt: 11, completion: 3, total: 14 })
		expect(request.calls).toEqual([{ estimate: 1, tools: 2, prompt: 10, completion: 2 }])
		// A new pass sums its own usage, while the earlier pass's call stays in flight until the new
		// pass observes its first call.
		request.open(4)
		request.spend({ prompt: 30, completion: 4, total: 34 })
		expect(request.usage).toEqual({ prompt: 30, completion: 4, total: 34 })
		expect(request.calls).toEqual([{ estimate: 1, tools: 2, prompt: 30, completion: 4 }])
	})

	it('thinks the share of the call in flight from the first assistant message after its position', () => {
		const conversation = createConversation()
		const request = new LedgerRequest('Check.')
		conversation.add({ role: 'assistant', content: 'earlier', thinking: 'before the call' })
		request.open(1)
		request.observe({ estimate: 5, tools: 0 }, 1)
		conversation.add({ role: 'assistant', content: 'ok', thinking: 'plan' })
		// No completion is reported yet, so the share cannot be apportioned.
		request.think(conversation.messages())
		expect(request.calls).toEqual([{ estimate: 5, tools: 0 }])
		request.spend({ prompt: 8, completion: 10, total: 18 })
		request.think(conversation.messages())
		// 'plan' is 4 of the 6 generated characters: round(10 * 4 / 6) = 7.
		expect(request.calls).toEqual([
			{ estimate: 5, tools: 0, prompt: 8, completion: 10, thinking: 7 },
		])
		const plain = new LedgerRequest('Check.')
		plain.open(2)
		plain.observe({ estimate: 6, tools: 0 }, 2)
		plain.spend({ prompt: 9, completion: 4, total: 13 })
		conversation.add({ role: 'assistant', content: 'done' })
		plain.think(conversation.messages())
		expect(plain.calls).toEqual([{ estimate: 6, tools: 0, prompt: 9, completion: 4 }])
	})

	it('files readings in asking order and holds the last successful plan', () => {
		const request = new LedgerRequest('Check.')
		const first: ClassifierReading = {
			key: 'one',
			phase: 'category',
			outcome: 'resolved',
			duration: 3,
		}
		const second: ClassifierReading = { key: 'two', phase: 'topic', outcome: 'cached' }
		const plan: Selection = { messages: [], judgments: ['one'], briefing: '## Rules' }
		request.file([first], plan)
		request.file([second])
		expect(request.readings).toEqual([first, second])
		expect(request.plan).toBe(plan)
	})

	it('admits a call once by tool name and canonical arguments', () => {
		const request = new LedgerRequest('Check.')
		request.admit('lookup', { id: 'BW-20931', page: 1 })
		expect(() => request.admit('lookup', { page: 1, id: 'BW-20931' })).toThrow(LEDGER_NOTES.repeat)
		request.admit('lookup', { id: 'bw-20931', page: 1 })
		request.admit('recall', { id: 'BW-20931', page: 1 })
		const cycle: Record<string, unknown> = {}
		cycle.self = cycle
		expect(() => request.admit('lookup', cycle)).toThrow(
			'tool arguments have no canonical identity',
		)
	})

	it('counts recalls up to its limit and closes after it', () => {
		const request = new LedgerRequest('Check.')
		Array.from({ length: DEFAULT_RECALL_LIMIT }).forEach(() => request.recall())
		expect(() => request.recall()).toThrow(LEDGER_NOTES.closure)
		const closed = new LedgerRequest('Check.', 0)
		expect(() => closed.recall()).toThrow(LEDGER_NOTES.closure)
	})

	it('closes its recall tool before the limit is spent', () => {
		const request = new LedgerRequest('Check.', 3)
		request.recall()
		request.close()
		expect(() => request.recall()).toThrow(LEDGER_NOTES.closure)
	})

	it('lists the stored first lines of a recall result by its text', () => {
		const request = new LedgerRequest('Check.')
		const lines = new Map([['lookup {"id":"BW-20931"}: Account BW-20931.', 'Account BW-20931.']])
		expect(request.listing('Account BW-20931.')).toBeUndefined()
		request.list('first result', new Map())
		request.list('first result', lines)
		expect(request.listing('first result')).toBe(lines)
		expect(request.listing('other result')).toBeUndefined()
	})
})
