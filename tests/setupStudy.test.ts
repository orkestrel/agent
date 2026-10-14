import { describe, expect, it } from 'vitest'
import {
	buildCustodyAttempt,
	buildStudyGrading,
	createStudyMeterFixture,
} from './setupStudy.js'
import { loadStudyToolsFixture } from './setupService.js'

describe('study meter fixture lifecycle', () => {
	it('owns its primitive lifetimes and closes admission without cancelling completed work', () => {
		const fixture = createStudyMeterFixture()
		fixture.meter
			.admit({ role: 'tool', tokens: 0, bytes: 1 })
			.finish({ role: 'tool', calls: 1, tokens: 0, bytes: 1, duration: 0 })
		fixture.close()
		fixture.close()
		expect(fixture.control.failure).toBeUndefined()
		expect(fixture.meter.usage).toHaveLength(1)
		expect(() => fixture.meter.admit({ role: 'tool', tokens: 0, bytes: 1 })).toThrow(/closed/)
	})
})

describe('study declaration fixtures', () => {
	it('builds independent declarations and terminal horizons from their actual schedule', async () => {
		const first = (await loadStudyToolsFixture()).manifest
		const second = (await loadStudyToolsFixture()).manifest
		expect(first).not.toBe(second)
		expect(first.bounds).not.toBe(second.bounds)
		const trial = first.schedule[0]
		if (trial === undefined) throw new Error('Missing fixture trial')
		const attempt = buildCustodyAttempt(first, trial)
		expect(attempt.trial).toEqual(trial)
		expect(attempt.observations.map((observation) => observation.goal)).toEqual(
			first.scenarios.find((scenario) => scenario.id === trial.scenario)?.goals.map((goal) => goal.id),
		)
		expect(buildStudyGrading(first.schedule).attempts).toEqual(first.schedule.map((item) => item.id))
		expect(() => buildCustodyAttempt(first, { ...trial, scenario: 'foreign' })).toThrow(
			'no scenario',
		)
	})
})
