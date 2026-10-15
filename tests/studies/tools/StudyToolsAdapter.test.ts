import { createScratch } from '@orkestrel/test/server'
import { expect, it } from 'vitest'
import { createStudyAdapter } from '../../../studies/tools/factories.js'
import { StudyToolsDriver } from '../../../studies/tools/StudyToolsDriver.js'
import { loadStudyToolsFixture } from '../../setupStudy.js'

it('validates mechanism declarations and refuses incompatible execution before constructing a driver', async () => {
	const fixture = await loadStudyToolsFixture()
	const adapter = createStudyAdapter()
	const input = {
		definition: fixture.manifest.definition,
		scenarios: fixture.manifest.scenarios,
		rubric: fixture.rubric,
		profile: fixture.profile,
	}
	expect(() => adapter.validate(input)).not.toThrow()
	expect(() =>
		adapter.validate({ ...input, definition: { ...input.definition, driver: 'memory' } }),
	).toThrow('Unsupported')
	expect(() =>
		adapter.validate({ ...input, definition: { ...input.definition, purpose: 'quality' } }),
	).toThrow('Unsupported')
	expect(() =>
		adapter.validate({ ...input, definition: { ...input.definition, arms: ['foreign'] } }),
	).toThrow('Unsupported')
	expect(() =>
		adapter.validate({ ...input, profile: { ...input.profile, qualification: 'foreign' } }),
	).toThrow('Unsupported')
	expect(() =>
		adapter.validate({
			...input,
			scenarios: [{ id: 'invalid', goals: [{ id: 'invalid', input: {} }] }],
		}),
	).toThrow('Unsupported')
	expect(() =>
		adapter.validate({
			...input,
			rubric: {
				...input.rubric,
				criteria: input.rubric.criteria.map((criterion) => ({ ...criterion, method: 'semantic' })),
			},
		}),
	).toThrow('Unsupported')
	const scratch = createScratch()
	try {
		const options = {
			agent: fixture.agent,
			subject: fixture.subject,
			provider: undefined,
			profile: fixture.profile,
			directory: scratch.path,
		}
		expect(adapter.driver(options)).toBeInstanceOf(StudyToolsDriver)
		expect(() => adapter.driver({ ...options, agent: {} })).toThrow('Invalid')
		// The runtime is the selected Agent; the subject only identifies the tested artifact.
		expect(adapter.driver({ ...options, subject: {} })).toBeInstanceOf(StudyToolsDriver)
		expect(() => adapter.driver({ ...options, provider: {} })).toThrow('scripted provider')
		expect(scratch.names()).toEqual([])
	} finally {
		scratch.destroy()
	}
})

it('retains every declared criterion as unknown when the adapter receives no execution evidence', async () => {
	const fixture = await loadStudyToolsFixture()
	const judgments = createStudyAdapter().grade({
		manifest: fixture.manifest,
		rubric: fixture.rubric,
		attempts: [],
		evidence: {},
	})
	expect(judgments).toHaveLength(22)
	expect(
		judgments.every(
			(judgment) => judgment.verdict === 'unknown' && judgment.references.length === 0,
		),
	).toBe(true)
	expect(new Set(judgments.map((judgment) => judgment.trial))).toEqual(
		new Set(fixture.manifest.schedule.map((trial) => trial.id)),
	)
})
