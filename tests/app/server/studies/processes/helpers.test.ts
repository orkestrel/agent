import { buildStudyProfile } from '../../../../setupStudy.js'
import { describe, expect, it } from 'vitest'
import {
	computeStudyProfileDigest,
	createStudyProcessFailure,
	toStudyWire,
} from '../../../../../app/server/studies/processes/helpers.js'

describe('process helpers', () => {
	it('binds canonical resolved profile settings across the JSON boundary', () => {
		const profile = buildStudyProfile()
		expect(computeStudyProfileDigest(profile)).toMatch(/^[a-f0-9]{64}$/)
		expect(
			computeStudyProfileDigest({ ...profile, room: { ...profile.room, output: 33 } }),
		).not.toBe(computeStudyProfileDigest(profile))
		expect(toStudyWire({ optional: undefined, value: 1 })).toEqual({ value: 1 })
		expect(createStudyProcessFailure('lost')).toEqual({
			cause: 'infrastructure',
			message: 'lost',
			role: undefined,
		})
	})
})
