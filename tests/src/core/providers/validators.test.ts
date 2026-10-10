import { createHostileValues } from '@orkestrel/test'
import { isSystemOneAnswer, isSystemOneResponse } from '@src/core'
import { describe, expect, it } from 'vitest'
import {
	approveEvery,
	SYSTEM_ONE_TEV1,
	SYSTEM_ONE_OBJECT,
	SYSTEM_ONE_LLAMA,
	SYSTEM_ONE_MICA,
	SYSTEM_ONE_INVALID_PROBABILITIES,
} from '../../../setup.js'

describe('System One guards', () => {
	it('accepts recorded envelopes and transliterated answer variants with extra fields', () => {
		for (const body of [SYSTEM_ONE_TEV1, SYSTEM_ONE_OBJECT, SYSTEM_ONE_LLAMA, SYSTEM_ONE_MICA]) {
			expect(isSystemOneResponse(body)).toBe(true)
			for (const answer of Object.values(body.answers)) expect(isSystemOneAnswer(answer)).toBe(true)
		}
		expect(isSystemOneResponse({ answers: { unread: null }, usage: { input_tokens: null } })).toBe(
			true,
		)
		expect(isSystemOneResponse({ answers: {}, usage: {} })).toBe(true)
		expect(isSystemOneResponse({ answers: {} })).toBe(true)
	})

	it('refuses malformed envelope fields without validating unrequested answers', () => {
		expect(isSystemOneResponse(null)).toBe(false)
		expect(isSystemOneResponse({})).toBe(false)
		expect(isSystemOneResponse({ answers: [] })).toBe(false)
		expect(isSystemOneResponse({ answers: {}, model: 7 })).toBe(false)
		expect(isSystemOneResponse({ answers: {}, usage: null })).toBe(false)
		expect(isSystemOneResponse({ answers: {}, usage: { input_tokens: '3' } })).toBe(false)
		expect(isSystemOneResponse({ answers: {}, usage: { output_tokens: false } })).toBe(false)
	})

	it.each(SYSTEM_ONE_INVALID_PROBABILITIES)(
		'refuses invalid probability %s in every answer form',
		(probability) => {
			expect(isSystemOneAnswer({ type: 'noul', noul: probability })).toBe(false)
			expect(
				isSystemOneAnswer({ type: 'choice', probabilities: { yes: probability, no: 0.5 } }),
			).toBe(false)
			expect(isSystemOneAnswer({ type: 'score', probabilities: [probability, 0.5] })).toBe(false)
		},
	)

	it('carries the members the wire never reads unchecked', () => {
		expect(isSystemOneAnswer({ type: 'noul', noul: 0.9, confidence: null })).toBe(true)
		expect(isSystemOneAnswer({ type: 'score', probabilities: [0.2, 0.8], legend: 7 })).toBe(true)
		expect(isSystemOneAnswer({ type: 'choice', probabilities: { bug: 1 }, choice: 1 })).toBe(true)
		expect(isSystemOneAnswer({ type: 'score', probabilities: [0, 1], score: 'one' })).toBe(true)
		expect(
			isSystemOneAnswer({ type: 'score', probabilities: [0, 1], legend: Array(2), confidence: {} }),
		).toBe(true)
		expect(isSystemOneAnswer({ type: 'noul', noul: -0, confidence: NaN })).toBe(true)
		expect(isSystemOneAnswer({ type: 'noul', noul: 1 })).toBe(true)
		expect(isSystemOneAnswer({ type: 'score', probabilities: { '0': 0, '1': 0 } })).toBe(true)
	})

	it('refuses an unknown type, a missing distribution, a choice array, and a sparse score array', () => {
		expect(isSystemOneAnswer({ type: 'choice', probabilities: [0.5, 0.5] })).toBe(false)
		expect(isSystemOneAnswer({ type: 'rank', probabilities: {} })).toBe(false)
		expect(isSystemOneAnswer({ type: 'noul' })).toBe(false)
		expect(isSystemOneAnswer({ type: 'choice' })).toBe(false)
		expect(isSystemOneAnswer({ type: 'score', probabilities: null })).toBe(false)
		expect(isSystemOneAnswer(null)).toBe(false)
		expect(isSystemOneAnswer({ type: 'score', probabilities: Array(2) })).toBe(false)
	})

	it('contains hostile reads and refuses arrays with a misleading every method', () => {
		for (const [index, value] of createHostileValues().entries()) {
			expect(isSystemOneResponse(value), `hostile response ${index}`).toBe(false)
			expect(isSystemOneAnswer(value), `hostile answer ${index}`).toBe(false)
			expect(
				() => isSystemOneAnswer({ type: 'choice', probabilities: value }),
				`hostile distribution ${index}`,
			).not.toThrow()
		}
		expect(
			isSystemOneAnswer({
				type: 'score',
				probabilities: Object.assign(['invalid'], { every: approveEvery }),
			}),
		).toBe(false)
	})
})
