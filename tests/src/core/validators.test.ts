import { isJudgeEntry, isJudgeQuestion } from '@src/core'
import { createHostileValues } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import { approveEvery, TEV1_REQUEST } from '../../setup.js'

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
		]) {
			expect(isJudgeEntry(value)).toBe(false)
		}
	})

	it('contains the installed hostile corpus at the entry boundary', () => {
		for (const [index, value] of createHostileValues().entries()) {
			expect(() => isJudgeEntry(value), `hostile entry ${index}`).not.toThrow()
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
	})

	it('contains the installed hostile corpus at question and nested entry boundaries', () => {
		for (const [index, value] of createHostileValues().entries()) {
			expect(isJudgeQuestion(value), `hostile question ${index}`).toBe(false)
			expect(
				isJudgeQuestion({ form: 'choice', criteria: value }),
				`hostile choice criteria ${index}`,
			).toBe(false)
			// The corpus also contains admitted JSON structures, such as a null-prototype record.
			expect(
				() => isJudgeQuestion({ form: 'score', criteria: [null, value] }),
				`hostile score entry ${index}`,
			).not.toThrow()
			expect(
				() => isJudgeQuestion({ form: 'noul', instructions: value }),
				`hostile instructions ${index}`,
			).not.toThrow()
		}
	})
})
