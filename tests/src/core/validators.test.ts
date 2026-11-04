import {
	isJudgeEntry,
	isJudgeAnswer,
	isJudgeQuestion,
	judgeAnswerContract,
	isNonNegativeSafeInteger,
	isPositiveSafeInteger,
	judgeQuestionContract,
} from '@src/core'
import { isNonNegativeInteger } from '@orkestrel/contract'
import { createHostileValues } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import {
	approveEvery,
	JUDGE_ANSWER_FIXTURES,
	JUDGE_ANSWER_REFUSALS,
	JUDGE_QUESTION_FIXTURES,
	JUDGE_QUESTION_REFUSALS,
	TEV1_REQUEST,
} from '../../setup.js'

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

describe('isNonNegativeSafeInteger — the count and limit guard', () => {
	it('accepts zero, negative zero, and the largest safe integer', () => {
		expect(isNonNegativeSafeInteger(0)).toBe(true)
		expect(isNonNegativeSafeInteger(-0)).toBe(true)
		expect(isNonNegativeSafeInteger(12)).toBe(true)
		expect(isNonNegativeSafeInteger(2 ** 53 - 1)).toBe(true)
	})

	it('rejects an unsafe integer, a non-finite number, a fraction, a negative, and a numeric string', () => {
		expect(isNonNegativeSafeInteger(2 ** 53)).toBe(false)
		expect(isNonNegativeSafeInteger(Number.NaN)).toBe(false)
		expect(isNonNegativeSafeInteger(Number.POSITIVE_INFINITY)).toBe(false)
		expect(isNonNegativeSafeInteger(1.5)).toBe(false)
		expect(isNonNegativeSafeInteger(-1)).toBe(false)
		expect(isNonNegativeSafeInteger('1')).toBe(false)
	})

	it('differs from the contract guard at negative zero and at 2 ** 53 alone', () => {
		expect(isNonNegativeSafeInteger(-0)).toBe(true)
		expect(isNonNegativeInteger(-0)).toBe(false)
		expect(isNonNegativeSafeInteger(2 ** 53)).toBe(false)
		expect(isNonNegativeInteger(2 ** 53)).toBe(true)
		const disagreements = [
			0,
			2 ** 53 - 1,
			Number.NaN,
			Number.POSITIVE_INFINITY,
			1.5,
			-1,
			'1',
		].filter((value) => isNonNegativeSafeInteger(value) !== isNonNegativeInteger(value))
		expect(disagreements).toEqual([])
	})

	it('contains the installed hostile corpus', () => {
		for (const [index, value] of createHostileValues().entries()) {
			expect(() => isNonNegativeSafeInteger(value), `hostile value ${index}`).not.toThrow()
		}
	})
})

describe('isPositiveSafeInteger', () => {
	it('accepts positive safe boundaries and refuses other values without coercion', () => {
		for (const value of [1, Number.MAX_SAFE_INTEGER])
			expect(isPositiveSafeInteger(value)).toBe(true)
		for (const value of [
			0,
			-0,
			-1,
			0.5,
			Number.MAX_SAFE_INTEGER + 1,
			NaN,
			Infinity,
			'1',
			null,
			undefined,
			{},
			Symbol('capacity'),
		])
			expect(isPositiveSafeInteger(value)).toBe(false)
	})
})

describe('isJudgeEntry and isJudgeQuestion — exact, and in lockstep with their shapes', () => {
	it.each(['', [], {}])('refuses the empty entry %j', (entry) => {
		expect(isJudgeEntry(entry)).toBe(false)
	})

	it.each(JUDGE_ANSWER_FIXTURES)('holds both ways on the owned answer %#', (answer) => {
		expect(judgeAnswerContract.is(answer)).toBe(true)
		expect(isJudgeAnswer(answer)).toBe(true)
	})

	it.each(JUDGE_ANSWER_REFUSALS)('refuses the answer value %#', (value) => {
		expect(judgeAnswerContract.is(value)).toBe(false)
		expect(isJudgeAnswer(value)).toBe(false)
	})

	it('reads a stored probability outside [0, 1], which only a write refuses', () => {
		const stored = { form: 'noul', noul: 2 }
		expect(judgeAnswerContract.is(stored)).toBe(false)
		expect(isJudgeAnswer(stored)).toBe(true)
	})

	it('contains every hostile answer value', () => {
		expect(createHostileValues().filter((value) => isJudgeAnswer(value))).toEqual([])
	})

	it.each(JUDGE_QUESTION_FIXTURES)('holds both ways on the owned question %#', (question) => {
		expect(isJudgeQuestion(question)).toBe(true)
		expect(judgeQuestionContract.is(question)).toBe(true)
	})

	it.each(JUDGE_QUESTION_REFUSALS)('refuses the question value %#', (value) => {
		expect(isJudgeQuestion(value)).toBe(false)
	})

	it('holds is ⟹ guard on the refused values a shape can state', () => {
		expect(
			JUDGE_QUESTION_REFUSALS.filter(
				(value) => judgeQuestionContract.is(value) && !isJudgeQuestion(value),
			),
		).toEqual([])
	})

	it('reads the empty record and the one-option choice as the guard refusing what a shape cannot state', () => {
		// A shape has no minProperties, so these are the two places the shape admits more than the guard.
		expect(judgeQuestionContract.is({ form: 'noul', instructions: {} })).toBe(true)
		expect(isJudgeQuestion({ form: 'noul', instructions: {} })).toBe(false)
		expect(judgeQuestionContract.is({ form: 'choice', criteria: { a: null } })).toBe(true)
		expect(isJudgeQuestion({ form: 'choice', criteria: { a: null } })).toBe(false)
	})
})
