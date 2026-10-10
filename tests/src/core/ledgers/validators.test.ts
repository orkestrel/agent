import { describe, expect, it } from 'vitest'
import { isFraction, isPositiveSafeInteger } from '../../../../src/core/ledgers/validators.js'

describe('isFraction', () => {
	it('accepts its finite positive interval and refuses off-shape values', () => {
		for (const value of [Number.MIN_VALUE, 0.5, 1]) expect(isFraction(value)).toBe(true)
		for (const value of [
			0,
			-0,
			-1,
			1.01,
			NaN,
			Infinity,
			-Infinity,
			'1',
			null,
			undefined,
			{},
			Symbol('fraction'),
		])
			expect(isFraction(value)).toBe(false)
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
