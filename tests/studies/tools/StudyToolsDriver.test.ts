import type { StudyEvidence } from '@orkestrel/study'
import { createRecorder } from '@orkestrel/test'
import { createScratch } from '@orkestrel/test/server'
import { expect, it } from 'vitest'
import { StudyToolsDriver } from '../../../studies/tools/StudyToolsDriver.js'
import { loadStudyToolsFixture } from '../../setupStudy.js'
import { createStudyMeterFixture } from '../../setupStudy.js'

it('rejects malformed runtimes and unsupported arms, serializes a real session and closes only its private child', async () => {
	const fixture = await loadStudyToolsFixture()
	const scratch = createScratch({ files: { 'sentinel.txt': 'keep' } })
	const meter = createStudyMeterFixture(fixture.profile.bounds)
	// The subject identifies the tested artifact: an object that throws on any read proves the driver never touches it.
	const untouched = new Proxy(
		{},
		{
			get: () => {
				throw new Error('subject read')
			},
			has: () => {
				throw new Error('subject read')
			},
		},
	)
	try {
		expect(
			() => new StudyToolsDriver({ agent: {}, subject: fixture.subject, directory: scratch.path }),
		).toThrow('Invalid')
		const driver = new StudyToolsDriver({
			agent: fixture.agent,
			subject: untouched,
			directory: scratch.path,
		})
		const trial = fixture.manifest.schedule[0]
		const goal = fixture.manifest.scenarios[0]?.goals[0]
		if (trial === undefined || goal === undefined) throw new Error('Missing declared tools work')
		await expect(driver.open({ ...trial, arm: 'foreign' }, meter.control.signal)).rejects.toThrow(
			'Unsupported',
		)
		const session = await driver.open(trial, meter.control.signal)
		const rows = createRecorder<readonly [StudyEvidence]>()
		const context = {
			signal: meter.control.signal,
			meter: meter.meter,
			evidence: {
				append: async (row: StudyEvidence) => {
					rows.handler(row)
				},
			},
		}
		const running = session.execute(goal, context)
		await expect(session.execute(goal, context)).rejects.toThrow('already executing')
		expect((await running).partial).toBe(false)
		expect(rows.count).toBeGreaterThan(0)
		await session.close()
		await session.close()
		await expect(session.execute(goal, context)).rejects.toThrow('closed')
		expect(scratch.names()).toEqual(['sentinel.txt'])
		expect(scratch.read('sentinel.txt')).toBe('keep')
	} finally {
		meter.close()
		scratch.destroy()
	}
})
