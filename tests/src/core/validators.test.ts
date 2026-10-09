import { isJudgeEntry, isJudgeQuestion, isMessage } from '@src/core'
import { describe, expect, it } from 'vitest'
import { approveEvery, TEV1_REQUEST, throwProxyRead } from '../../setup.js'

describe('isMessage — the per-message shape guard (total + defensive)', () => {
	it('rejects images with a hostile own every method', () => {
		const images = Object.assign([1], { every: approveEvery })
		expect(isMessage({ id: '1', role: 'user', content: '', images })).toBe(false)
	})

	it('accepts an absent or string thinking and refuses any other value', () => {
		expect(
			isMessage({ id: '1', role: 'assistant', content: '', thinking: 'weigh the fares' }),
		).toBe(true)
		expect(isMessage({ id: '1', role: 'assistant', content: '' })).toBe(true)
		expect(isMessage({ id: '1', role: 'assistant', content: '', thinking: 1 })).toBe(false)
	})

	it('rejects calls with a hostile own every method', () => {
		const calls = Object.assign([null], { every: approveEvery })
		expect(isMessage({ id: '1', role: 'assistant', content: '', calls })).toBe(false)
	})

	it('rejects a throwing proxy and a revoked proxy', () => {
		expect(isMessage(new Proxy({}, { get: throwProxyRead }))).toBe(false)
		const revoked = Proxy.revocable({}, {})
		revoked.revoke()
		expect(isMessage(revoked.proxy)).toBe(false)
		expect(isMessage({ id: '1', role: 'user', content: '', images: revoked.proxy })).toBe(false)
		expect(
			isMessage({
				id: '1',
				role: 'assistant',
				content: '',
				calls: new Proxy([], { get: throwProxyRead }),
			}),
		).toBe(false)
	})

	it('rejects an arbitrary role outside the domain union', () => {
		expect(isMessage({ id: '1', role: 'other', content: '' })).toBe(false)
	})

	it('rejects a non-string image element', () => {
		expect(isMessage({ id: '1', role: 'user', content: '', images: [1] })).toBe(false)
	})

	it('accepts the real Message shape, with and without its optionals', () => {
		expect(isMessage({ id: 'm1', role: 'user', content: 'hi' })).toBe(true)
		expect(isMessage({ id: 'm1', role: 'assistant', content: '', calls: [] })).toBe(true)
		expect(
			isMessage({
				id: 'm1',
				role: 'assistant',
				content: '',
				calls: [{ id: 'c1', name: 'search', arguments: { q: 'acme' } }],
			}),
		).toBe(true)
		expect(isMessage({ id: 'm1', role: 'user', content: 'see', images: ['DATA'] })).toBe(true)
		expect(isMessage({ id: 'm1', role: 'developer', content: 'hi' })).toBe(false)
	})

	it('rejects a non-record, a nullish, and a primitive without throwing', () => {
		expect(isMessage(undefined)).toBe(false)
		expect(isMessage(null)).toBe(false)
		expect(isMessage(42)).toBe(false)
		expect(isMessage('message')).toBe(false)
		expect(isMessage(['m'])).toBe(false)
	})

	it('rejects a missing or wrong-typed required field', () => {
		expect(isMessage({ role: 'user', content: 'hi' })).toBe(false) // no id
		expect(isMessage({ id: 'm1', content: 'hi' })).toBe(false) // no role
		expect(isMessage({ id: 'm1', role: 'user' })).toBe(false) // no content
		expect(isMessage({ id: 1, role: 'user', content: 'hi' })).toBe(false)
		expect(isMessage({ id: 'm1', role: 7, content: 'hi' })).toBe(false)
		expect(isMessage({ id: 'm1', role: 'user', content: 7 })).toBe(false)
	})

	it('rejects a non-array calls, a malformed calls element, and a non-array images', () => {
		expect(isMessage({ id: 'm1', role: 'assistant', content: '', calls: 'nope' })).toBe(false)
		expect(isMessage({ id: 'm1', role: 'assistant', content: '', calls: [null] })).toBe(false)
		expect(
			isMessage({ id: 'm1', role: 'assistant', content: '', calls: [{ id: 'c1', name: 'tool' }] }),
		).toBe(false)
		expect(isMessage({ id: 'm1', role: 'user', content: 'see', images: 'DATA' })).toBe(false)
	})

	it('accepts a string call on a tool message and on every other role the flat type admits', () => {
		expect(isMessage({ id: 't1', role: 'tool', content: 'sunny', call: 'call-weather' })).toBe(true)
		expect(isMessage({ id: 't1', role: 'tool', content: 'sunny' })).toBe(true)
		expect(isMessage({ id: 'u1', role: 'user', content: 'hi', call: 'call-weather' })).toBe(true)
	})

	it('rejects a non-string call', () => {
		expect(isMessage({ id: 't1', role: 'tool', content: 'sunny', call: 7 })).toBe(false)
		expect(isMessage({ id: 't1', role: 'tool', content: 'sunny', call: null })).toBe(false)
		expect(isMessage({ id: 't1', role: 'tool', content: 'sunny', call: ['call-weather'] })).toBe(
			false,
		)
		expect(
			isMessage({
				id: 't1',
				role: 'tool',
				content: 'sunny',
				call: { id: 'call-weather', name: 'weather', arguments: {} },
			}),
		).toBe(false)
	})
})

describe('isJudgeEntry — the text or JSON a judge reads', () => {
	it('accepts a string, a JSON record, a null-prototype record, and a JSON array', () => {
		expect(isJudgeEntry('Ticket 4182 crashes on export')).toBe(true)
		expect(isJudgeEntry({ ticket: 4182, tags: ['billing'], paid: null })).toBe(true)
		expect(isJudgeEntry(Object.assign(Object.create(null), { ticket: 4182 }))).toBe(true)
		expect(isJudgeEntry(['first charge', 'second charge'])).toBe(true)
	})

	it('rejects null, a primitive, a non-JSON member, a class instance, and a cycle', () => {
		const cyclic: Record<string, unknown> = {}
		cyclic.self = cyclic
		for (const value of [
			null,
			undefined,
			4182,
			true,
			{ opened: new Date() },
			[Number.NaN],
			new Date(),
			cyclic,
			new Proxy({}, { ownKeys: throwProxyRead }),
		]) {
			expect(isJudgeEntry(value)).toBe(false)
		}
	})
})

describe('isJudgeQuestion — the universal question shape (total)', () => {
	it('accepts every recorded tev1 question', () => {
		for (const question of Object.values(TEV1_REQUEST.questions)) {
			expect(isJudgeQuestion(question)).toBe(true)
		}
	})

	it('accepts null option descriptions and null score levels', () => {
		expect(isJudgeQuestion({ form: 'choice', criteria: { billing: null, bug: null } })).toBe(true)
		expect(isJudgeQuestion({ form: 'score', criteria: [null, 'Degraded', null] })).toBe(true)
		expect(isJudgeQuestion({ form: 'noul' })).toBe(true)
		expect(isJudgeQuestion({ form: 'noul', criteria: { true: 'Charged twice' } })).toBe(true)
	})

	it('rejects a choice with one option and a score with one level', () => {
		expect(isJudgeQuestion({ form: 'choice', criteria: { billing: null } })).toBe(false)
		expect(isJudgeQuestion({ form: 'choice', criteria: {} })).toBe(false)
		expect(isJudgeQuestion({ form: 'score', criteria: ['Cosmetic'] })).toBe(false)
	})

	it('rejects a non-JSON entry in instructions or criteria', () => {
		const opened = new Date()
		expect(isJudgeQuestion({ form: 'choice', criteria: { billing: opened, bug: null } })).toBe(
			false,
		)
		expect(isJudgeQuestion({ form: 'score', criteria: ['Cosmetic', [Number.NaN]] })).toBe(false)
		expect(isJudgeQuestion({ form: 'noul', criteria: { false: 4182 } })).toBe(false)
		expect(
			isJudgeQuestion({ form: 'noul', instructions: { opened }, criteria: { true: 'Paid' } }),
		).toBe(false)
	})

	it('rejects a null where the domain omits the member', () => {
		expect(isJudgeQuestion({ form: 'noul', instructions: null })).toBe(false)
		expect(isJudgeQuestion({ form: 'noul', criteria: null })).toBe(false)
		expect(isJudgeQuestion({ form: 'noul', criteria: { true: null } })).toBe(false)
	})

	it('rejects an unknown form, a mismatched criteria shape, and hostile input', () => {
		expect(isJudgeQuestion({ type: 'choice', criteria: { billing: null, bug: null } })).toBe(false)
		expect(isJudgeQuestion({ form: 'rank', criteria: ['first', 'second'] })).toBe(false)
		expect(isJudgeQuestion({ form: 'choice', criteria: ['billing', 'bug'] })).toBe(false)
		expect(isJudgeQuestion({ form: 'score', criteria: { 0: 'Cosmetic', 1: 'Blocking' } })).toBe(
			false,
		)
		expect(isJudgeQuestion(null)).toBe(false)
		expect(isJudgeQuestion('choice')).toBe(false)
		const criteria = Object.assign([new Date(), null], { every: approveEvery })
		expect(isJudgeQuestion({ form: 'score', criteria })).toBe(false)
		const hostile = new Proxy({ form: 'noul' }, { get: throwProxyRead })
		expect(isJudgeQuestion(hostile)).toBe(false)
	})
})
