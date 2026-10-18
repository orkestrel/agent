import type { StudyEvidence } from '@orkestrel/study'
import { expect, it } from 'vitest'
import { StudyToolsWorkload } from '../../../studies/tools/StudyToolsWorkload.js'
import { createStudyMeterFixture } from '../../setupStudy.js'

it('exposes the values it was created from and starts with no trace, no fault and a live controller', () => {
	const meter = createStudyMeterFixture()
	try {
		const input = { prompt: 'Save it.', responses: [], files: ['note.txt'], admitted: true }
		const workload = new StudyToolsWorkload({
			input,
			goal: 'save',
			context: {
				signal: meter.control.signal,
				meter: meter.meter,
				evidence: { append: async () => undefined },
			},
		})
		expect(workload.input).toBe(input)
		expect(workload.goal).toBe('save')
		expect(workload.context.signal).toBe(meter.control.signal)
		expect(workload.context.meter).toBe(meter.meter)
		expect(workload.trace).toEqual([])
		expect(workload.fault).toBeUndefined()
		expect(workload.controller.signal.aborted).toBe(false)
		workload.controller.abort()
		expect(workload.controller.signal.aborted).toBe(true)
		expect(meter.control.signal.aborted).toBe(false)
	} finally {
		meter.close()
	}
})

it('appends rows in emission order and holds the latest fault', () => {
	const meter = createStudyMeterFixture()
	try {
		const workload = new StudyToolsWorkload({
			input: { prompt: 'Save it.', responses: [], files: [], admitted: true },
			goal: 'save',
			context: {
				signal: meter.control.signal,
				meter: meter.meter,
				evidence: { append: async () => undefined },
			},
		})
		const first: StudyEvidence = { event: 'tool', goal: 'save', value: { name: 'write' } }
		const second: StudyEvidence = { event: 'denial', goal: 'save', value: { name: 'read' } }
		workload.record(first)
		workload.record(second)
		expect(workload.trace).toEqual([first, second])
		const early = new Error('early')
		const late = new Error('late')
		workload.fail(early)
		expect(workload.fault).toBe(early)
		workload.fail(late)
		expect(workload.fault).toBe(late)
	} finally {
		meter.close()
	}
})
