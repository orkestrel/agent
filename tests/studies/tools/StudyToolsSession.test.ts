import type { StudyEvidence, StudyGoal } from '@orkestrel/study'
import { isObject } from '@orkestrel/contract'
import { createRecorder } from '@orkestrel/test'
import { createScratch } from '@orkestrel/test/server'
import { expect, it } from 'vitest'
import { StudyToolsDriver } from '../../../studies/tools/StudyToolsDriver.js'
import { isStudyToolsRuntime } from '../../../studies/tools/validators.js'
import { createStudyMeterFixture, loadStudyToolsFixture } from '../../setupStudy.js'

it('keeps a fault raised in one goal out of the next goal of the same session and frees the goal after it', async () => {
	const fixture = await loadStudyToolsFixture()
	if (!isStudyToolsRuntime(fixture.agent)) throw new Error('No admitted Agent runtime')
	const save = fixture.manifest.scenarios
		.find((scenario) => scenario.id === 'write')
		?.goals.find((goal) => goal.id === 'save')
	const trial = fixture.manifest.schedule.find((entry) => entry.scenario === 'write')
	if (save === undefined || trial === undefined) throw new Error('No declared write workload')
	const plain: StudyGoal = {
		id: 'plain',
		input: {
			prompt: 'Answer plainly.',
			admitted: true,
			files: [],
			responses: [{ content: 'plain', calls: [] }],
		},
	}
	// A listener that throws on every dispatched tool is routed to the session's own error handler.
	const faulty = {
		Agent: new Proxy(fixture.agent.Agent, {
			construct(target, args, newTarget) {
				const agent = Reflect.construct(target, args, newTarget)
				if (
					isObject(agent) &&
					'emitter' in agent &&
					isObject(agent.emitter) &&
					'on' in agent.emitter &&
					typeof agent.emitter.on === 'function'
				)
					agent.emitter.on('tool', () => {
						throw new Error('listener fault')
					})
				return agent
			},
		}),
	}
	const scratch = createScratch()
	const meter = createStudyMeterFixture(fixture.profile.bounds)
	try {
		const driver = new StudyToolsDriver({
			agent: faulty,
			subject: fixture.subject,
			directory: scratch.ensure('work'),
		})
		const session = await driver.open(trial, meter.control.signal)
		const context = {
			signal: meter.control.signal,
			meter: meter.meter,
			evidence: { append: async () => undefined },
		}
		try {
			await expect(session.execute(save, context)).rejects.toThrow('listener fault')
			// The next goal's product carries nothing of the first goal's fault.
			await expect(session.execute(plain, context)).resolves.toEqual({
				value: { content: 'plain' },
				partial: false,
			})
		} finally {
			await session.close()
		}
	} finally {
		meter.close()
		scratch.destroy()
	}
})

it('retains each goal trace only under its own goal when a session serves several goals', async () => {
	const fixture = await loadStudyToolsFixture()
	const goals = fixture.manifest.scenarios.find((scenario) => scenario.id === 'write')?.goals
	const trial = fixture.manifest.schedule.find((entry) => entry.scenario === 'write')
	if (goals === undefined || trial === undefined) throw new Error('No declared write workload')
	const scratch = createScratch()
	const meter = createStudyMeterFixture(fixture.profile.bounds)
	try {
		const driver = new StudyToolsDriver({
			agent: fixture.agent,
			subject: fixture.subject,
			directory: scratch.ensure('work'),
		})
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
		try {
			for (const goal of goals) await session.execute(goal, context)
			// One dispatched call per goal: a trace carried across goals would repeat the first goal's row.
			expect(
				rows.calls
					.map(([row]) => row)
					.filter((row) => row.event === 'tool')
					.map((row) => row.goal),
			).toEqual(['save', 'recall'])
		} finally {
			await session.close()
		}
	} finally {
		meter.close()
		scratch.destroy()
	}
})
