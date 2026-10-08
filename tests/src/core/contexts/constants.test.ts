import type { Criterion } from '@src/core'
import { NEEDED_CRITERION } from '@src/core'
import * as constants from '../../../../src/core/contexts/constants.js'
import { describe, expect, expectTypeOf, it } from 'vitest'

describe('NEEDED_CRITERION', () => {
	it('exports the measured words alone, frozen and assignable with an application threshold', () => {
		expect(NEEDED_CRITERION).toEqual({
			yes: 'A states something the work in B must respect',
			no: 'A can be left out and the request in B is still done correctly',
		})
		expect(Object.isFrozen(NEEDED_CRITERION)).toBe(true)
		expectTypeOf({ ...NEEDED_CRITERION, threshold: 0.9 }).toExtend<Criterion>()
		expectTypeOf<typeof constants>().not.toHaveProperty('DEFAULT_SELECTION_THRESHOLD')
		expect(
			Object.values(constants).some(
				(value) => typeof value === 'object' && Object.hasOwn(value, 'threshold'),
			),
		).toBe(false)
	})
})
