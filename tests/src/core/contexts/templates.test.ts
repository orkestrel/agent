import { NEEDED_QUESTION } from '@src/core'
import { describe, expect, it } from 'vitest'

describe('NEEDED_QUESTION', () => {
	it('names the subject and request markers without positional or threshold arithmetic', () => {
		expect(NEEDED_QUESTION).toBe(
			'Is message [A] needed to carry out the request in message [B] correctly?',
		)
	})
})
