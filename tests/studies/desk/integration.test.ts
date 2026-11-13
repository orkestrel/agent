import { isRecord, parseJSON } from '@orkestrel/contract'
import {
	collectStudyEvidence,
	readStudyDeclaration,
	readStudyResult,
} from '@orkestrel/study/server'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import assert from 'node:assert/strict'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'
import {
	StudyDeskDriver,
	buildStudyDeskSummary,
	collectStudyDeskTools,
	isStudyDeskInput,
} from '../../../studies/desk/index.js'
import {
	STUDY_INSTALL_ENTRY,
	STUDY_MEMORY_MODULES,
	buildStudyDeskProfile,
	collectStudyDeskAnswers,
	createMemoryServer,
	createStudyDeskControl,
	createStudyDeskOracle,
	createStudyInstallFixture,
	executeStudyCommand,
	executeStudyInstall,
	executeStudySeries,
	rehearseStudyInstall,
	writeStudyDeskFixture,
} from '../../setupStudy.js'

const declaration = await readStudyDeclaration(resolve('.'), 'disclosure')
const answers = collectStudyDeskAnswers(declaration)

it('reads every request right on both arms under the oracle, each load opening its own area', async () => {
	const scratch = createScratch({ prefix: 'study-desk-oracle-' })
	const server = await createMemoryServer([], {}, createStudyDeskOracle(answers))
	try {
		const profile = buildStudyDeskProfile(server.url)
		const sealed = await executeStudySeries(
			new StudyDeskDriver({ ...STUDY_MEMORY_MODULES, profile, directory: resolve('.') }),
			profile,
			declaration,
			join(scratch.path, 'oracle'),
		)
		if (sealed.status !== 'sealed') throw new Error('The oracle schedule did not seal')
		const evidence = await collectStudyEvidence(sealed)
		const summary = buildStudyDeskSummary({
			schedule: sealed.manifest.schedule,
			attempts: sealed.attempts,
			scenarios: declaration.scenarios,
			rubric: declaration.rubric,
			evidence: new Map(Object.entries(evidence)),
		})
		const exact = { requests: 42, right: 42, late: 0, wrong: 0, text: 0, failed: 0 }
		expect(summary.tallies).toMatchObject({
			area: { ...exact, loads: 0, turns: 84 },
			index: { ...exact, loads: 16, opened: 16, misopened: 0, turns: 100 },
		})
		expect(Object.keys(summary.tallies)).toEqual(['area', 'index'])
		expect(summary.rows.filter((row) => row.first === undefined)).toEqual([])
		const turns = sealed.manifest.schedule.map((trial) => ({
			trial,
			rows: (evidence[trial.id] ?? []).flatMap((row) =>
				row.event === 'turn' && isRecord(row.value) && Array.isArray(row.value.tools)
					? [{ goal: row.goal, tools: row.value.tools.map(String) }]
					: [],
			),
		}))
		for (const entry of turns.filter((candidate) => candidate.trial.arm === 'area'))
			for (const row of entry.rows) {
				const input = declaration.scenarios
					.find((scenario) => scenario.id === entry.trial.scenario)
					?.goals.find((goal) => goal.id === row.goal)?.input
				if (!isStudyDeskInput(input)) throw new Error('Missing goal input')
				expect(row.tools).toEqual(collectStudyDeskTools(input.area))
			}
		expect(
			turns
				.filter((entry) => entry.trial.arm === 'index')
				.map((entry) => entry.rows.filter((row) => row.tools.join() === 'load').length),
		).toEqual([1, 1, 1, 1, 1, 1, 1])
	} finally {
		await server.close()
		await destroyScratch(scratch)
	}
}, 30000)

it('marks the control down on both arms, reproducing phase 0 on arm index', async () => {
	const scratch = createScratch({ prefix: 'study-desk-control-' })
	const server = await createMemoryServer([], {}, createStudyDeskControl(answers))
	try {
		const profile = buildStudyDeskProfile(server.url)
		const sealed = await executeStudySeries(
			new StudyDeskDriver({ ...STUDY_MEMORY_MODULES, profile, directory: resolve('.') }),
			profile,
			declaration,
			join(scratch.path, 'control'),
		)
		if (sealed.status !== 'sealed') throw new Error('The control schedule did not seal')
		const summary = buildStudyDeskSummary({
			schedule: sealed.manifest.schedule,
			attempts: sealed.attempts,
			scenarios: declaration.scenarios,
			rubric: declaration.rubric,
			evidence: new Map(Object.entries(await collectStudyEvidence(sealed))),
		})
		expect(summary.tallies).toMatchObject({
			area: { requests: 42, right: 10, wrong: 32, text: 0, failed: 0, loads: 0 },
			index: { requests: 42, right: 0, wrong: 0, text: 42, failed: 0, loads: 0, turns: 42 },
		})
		expect(
			summary.rows
				.filter((row) => row.arm === 'index')
				.slice(0, 10)
				.filter((row) => row.outcome === 'right'),
		).toEqual([])
	} finally {
		await server.close()
		await destroyScratch(scratch)
	}
}, 30000)

it('rehearses one index conversation from a frozen closure, lists its progress, and replays it keyed and offline with no request', async () => {
	const scratch = createScratch({ prefix: 'study-desk-cli-' })
	const server = await createMemoryServer([], {}, createStudyDeskOracle(answers))
	try {
		const fixture = createStudyInstallFixture(scratch, server.url)
		writeStudyDeskFixture(fixture, server.url)
		const selection = ['--trial', 'r1-s1-a2']
		const rehearsal = await rehearseStudyInstall(fixture, {
			study: 'disclosure',
			profile: 'screen',
			selection,
			duration: 120000,
		})
		for (const step of [rehearsal.freeze, rehearsal.check, rehearsal.execute, rehearsal.grade])
			assert.equal(step.code, 0, step.stderr)
		const sealed = rehearsal.result
		if (sealed?.status !== 'sealed') throw new Error('Execution did not seal')
		expect(sealed.manifest.schedule.map((trial) => [trial.id, trial.arm])).toEqual([
			['r1-s1-a2', 'index'],
		])
		expect(sealed.attempts.map((attempt) => attempt.failure)).toEqual([undefined])
		expect(
			sealed.attempts
				.flatMap((attempt) => attempt.observations)
				.map((observation) => [observation.failure, observation.product?.partial]),
		).toEqual(Array.from({ length: 6 }, () => [undefined, false]))
		const progress = await executeStudyCommand(
			join(rehearsal.closure, STUDY_INSTALL_ENTRY),
			rehearsal.closure,
			['progress', sealed.directory, '--from', 'turn-1'],
		)
		assert.equal(progress.code, 0, progress.stderr)
		expect(progress.stdout).toContain('"loads"')
		expect(parseJSON(progress.stdout)).toBeDefined()
		const count = server.requests.length
		const replay = await executeStudyInstall(
			fixture,
			[
				'execute',
				'disclosure',
				'--profile',
				'screen',
				...selection,
				'--replay',
				sealed.directory,
				'--roles',
				JSON.stringify(['agent', 'metadata']),
				'--offline',
				'true',
				'--out',
				join(scratch.path, 'replay'),
			],
			120000,
		)
		assert.equal(replay.code, 0, replay.stderr)
		expect(server.requests).toHaveLength(count)
		const replayed = await readStudyResult(join(scratch.path, 'replay'))
		if (replayed.status !== 'sealed') throw new Error('Replay did not seal')
		expect(replayed.attempts.map((attempt) => attempt.failure)).toEqual([undefined])
	} finally {
		await server.close()
		await destroyScratch(scratch)
	}
}, 180000)
