import type { StudyEvidence } from '@orkestrel/study'
import { cloneJSONValue, parseJSON } from '@orkestrel/contract'
import { createScratch } from '@orkestrel/test/server'
import { realpathSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'
import {
	StudySeries,
	buildStudySchedule,
	computeStudyScores,
	isStudyJudgment,
	parseStudyProfile,
} from '@orkestrel/study'
import {
	StudyArtifactLoader,
	StudyResultStore,
	collectStudyEvidence,
	encodeStudyJSON,
	hashStudyBytes,
	readStudyResult,
} from '@orkestrel/study/server'
import {
	createStudyAdapter,
	parseStudyToolsInput,
	StudyToolsDriver,
} from '../../../studies/tools/index.js'
import {
	buildStudyGrading,
	createStudyMeterFixture,
	loadStudyToolsFixture,
} from '../../setupStudy.js'

it('inspects the shipped package-root profile against the real offline artifact inventory', async () => {
	const root = realpathSync(resolve('.'))
	const profile = parseStudyProfile(
		parseJSON(await readFile(join(root, 'studies', 'tools', 'profiles', 'local.json'), 'utf8')),
	)
	const resolved = {
		...profile,
		agent: realpathSync(resolve(root, profile.agent)),
		subject: realpathSync(resolve(root, profile.subject)),
		roots: profile.roots.map((packageRoot) => realpathSync(resolve(root, packageRoot))),
	}
	const entry = realpathSync(resolve(root, 'node_modules/@orkestrel/study/dist/bin/main.js'))
	const adapter = realpathSync(resolve(root, 'studies/tools/index.ts'))
	const artifacts = new StudyArtifactLoader({ root, entry, adapter, profile: resolved })
	const identity = await artifacts.inspect()
	expect(identity.subject).toMatch(/^[a-f0-9]{64}$/)
	expect(identity.instrument).toMatch(/^[a-f0-9]{64}$/)
	expect(identity.provider).toBeUndefined()
	expect(await artifacts.inspect()).toEqual(identity)
})

it('executes all declared tools goals through the actual built Agent and retains independent whole-horizon grades', async () => {
	const fixture = await loadStudyToolsFixture()
	const scratch = createScratch()
	try {
		const directory = join(scratch.path, 'result')
		const work = scratch.ensure('work')
		const store = new StudyResultStore({ directory, manifest: fixture.manifest })
		await store.create()
		const driver = new StudyToolsDriver({
			agent: fixture.agent,
			subject: fixture.subject,
			directory: work,
		})
		const parent = new AbortController()
		const attempts = await new StudySeries({
			manifest: fixture.manifest,
			driver,
			store,
			signal: parent.signal,
		}).execute()
		expect(attempts).toHaveLength(10)
		expect(attempts.every((attempt) => attempt.failure === undefined)).toBe(true)
		expect(
			attempts
				.flatMap((attempt) => attempt.observations)
				.every(
					(observation) => observation.failure === undefined && observation.product !== undefined,
				),
		).toBe(true)
		expect(
			attempts
				.filter((attempt) => attempt.trial.scenario === 'cancellation')
				.every((attempt) => attempt.observations[0]?.product?.partial === true),
		).toBe(true)
		expect(parent.signal.aborted).toBe(false)
		expect(scratch.names('work')).toEqual([])
		expect(scratch.has('work/escape.txt')).toBe(false)
		const usage = attempts.flatMap((attempt) =>
			attempt.observations.flatMap((observation) => observation.usage),
		)
		expect(usage.length).toBeGreaterThan(30)
		expect(
			usage.every(
				(charge) =>
					charge.tokens === undefined &&
					charge.bytes !== undefined &&
					Number.isSafeInteger(charge.bytes),
			),
		).toBe(true)
		await store.seal()
		const result = await readStudyResult(directory)
		if (result.status !== 'sealed') throw new Error('Real tools result did not seal')
		const judgments = createStudyAdapter().grade({
			manifest: result.manifest,
			rubric: fixture.rubric,
			attempts: result.attempts,
			evidence: await collectStudyEvidence(result),
		})
		expect(judgments).toHaveLength(22)
		expect(judgments.every((judgment) => isStudyJudgment(judgment))).toBe(true)
		expect(
			judgments.every(
				(judgment) => judgment.verdict === 'achieved' && judgment.references.length === 1,
			),
		).toBe(true)
		const grading = {
			...buildStudyGrading(fixture.manifest.schedule, judgments),
			result: result.seal.id,
			rubric: hashStudyBytes(encodeStudyJSON(fixture.rubric)),
		}
		expect(computeStudyScores(result.manifest, fixture.rubric, grading)).toEqual([
			{
				arm: 'agent',
				total: 22,
				achieved: 22,
				unsuccessful: 0,
				unknown: 0,
				critical: 0,
				lower: 1,
				upper: 1,
				coverage: 1,
			},
		])
		const admission = result.attempts.filter((attempt) => attempt.trial.scenario === 'admission')
		expect(
			admission.every((attempt) =>
				attempt.observations
					.flatMap((observation) => observation.usage)
					.every((charge) => charge.role !== 'tool'),
			),
		).toBe(true)
	} finally {
		scratch.destroy()
	}
})

it('latches real parent meter refusal and retains all unserved goals and repetitions as unknown', async () => {
	const fixture = await loadStudyToolsFixture()
	const scratch = createScratch()
	try {
		const original = fixture.manifest.scenarios.find((scenario) => scenario.id === 'write')
		if (original === undefined) throw new Error('No declared write workload')
		const scenario = {
			...original,
			goals: original.goals.map((goal, index) => {
				if (index !== 0) return goal
				const input = parseStudyToolsInput(goal.input)
				return {
					...goal,
					input: cloneJSONValue({
						...input,
						responses: input.responses.map((response) => ({ ...response, tokens: 100000 })),
					}),
				}
			}),
		}
		const definition = { ...fixture.manifest.definition, scenarios: ['write'] }
		const manifest = {
			...fixture.manifest,
			definition,
			scenarios: [scenario],
			schedule: buildStudySchedule(definition, [scenario]),
		}
		const directory = join(scratch.path, 'denied')
		const work = scratch.ensure('work')
		const store = new StudyResultStore({ directory, manifest })
		await store.create()
		const attempts = await new StudySeries({
			manifest,
			driver: new StudyToolsDriver({
				agent: fixture.agent,
				subject: fixture.subject,
				directory: work,
			}),
			store,
			signal: new AbortController().signal,
		}).execute()
		expect(attempts).toHaveLength(2)
		expect(attempts.every((attempt) => attempt.failure?.cause === 'capacity')).toBe(true)
		expect(
			attempts
				.flatMap((attempt) => attempt.observations)
				.every(
					(observation) =>
						observation.product === undefined && observation.failure?.cause === 'capacity',
				),
		).toBe(true)
		expect(scratch.names('work')).toEqual([])
		await store.seal()
		const sealed = await readStudyResult(directory)
		if (sealed.status !== 'sealed') throw new Error('Real tools result did not seal')
		const evidence = await collectStudyEvidence(sealed)
		expect(
			Object.values(evidence)
				.flat()
				.some((row) => row.event === 'admission'),
		).toBe(true)
		expect(
			Object.values(evidence)
				.flat()
				.some((row) => row.event === 'provider' || row.event === 'tool'),
		).toBe(false)
		const rubric = {
			...fixture.rubric,
			criteria: fixture.rubric.criteria.filter((criterion) => criterion.scenario === 'write'),
		}
		const judgments = createStudyAdapter().grade({ manifest, rubric, attempts, evidence })
		expect(judgments).toHaveLength(6)
		expect(
			judgments.every(
				(judgment) => judgment.verdict === 'unknown' && judgment.references.length === 0,
			),
		).toBe(true)
	} finally {
		scratch.destroy()
	}
})

it('keeps a cancelled workload inside its goal and serves the next goal of the same session', async () => {
	const fixture = await loadStudyToolsFixture()
	const scratch = createScratch()
	const meter = createStudyMeterFixture(fixture.profile.bounds)
	try {
		const trial = fixture.manifest.schedule.find((entry) => entry.scenario === 'cancellation')
		const cancel = fixture.manifest.scenarios.find((scenario) => scenario.id === 'cancellation')
			?.goals[0]
		if (trial === undefined || cancel === undefined)
			throw new Error('No declared cancellation workload')
		const driver = new StudyToolsDriver({
			agent: fixture.agent,
			subject: fixture.subject,
			directory: scratch.ensure('work'),
		})
		const session = await driver.open(trial, meter.control.signal)
		const rows: StudyEvidence[] = []
		const context = {
			signal: meter.control.signal,
			meter: meter.meter,
			evidence: {
				append: async (row: StudyEvidence) => {
					rows.push(row)
				},
			},
		}
		try {
			// The declared goal cancels its own workload and returns the partial product.
			await expect(session.execute(cancel, context)).resolves.toMatchObject({ partial: true })
			expect(meter.control.signal.aborted).toBe(false)
			// The next goal of the same session runs under a fresh workload and completes.
			const next = {
				id: 'after',
				input: {
					prompt: 'Answer after the cancelled workload.',
					admitted: true,
					files: [],
					responses: [{ content: 'after-cancel', calls: [] }],
				},
			}
			await expect(session.execute(next, context)).resolves.toEqual({
				value: { content: 'after-cancel' },
				partial: false,
			})
			expect(rows.filter((row) => row.event === 'workload').map((row) => row.goal)).toEqual([
				cancel.id,
			])
		} finally {
			await session.close()
		}
	} finally {
		meter.close()
		scratch.destroy()
	}
})
