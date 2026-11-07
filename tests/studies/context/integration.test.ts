import { expect, it } from 'vitest'
import { computeStudyScores } from '@orkestrel/study'
import { encodeStudyJSON, hashStudyBytes } from '@orkestrel/study/server'
import { createStudyAdapter } from '../../../studies/tools/index.js'
import {
	buildStudyAssessment,
	collectStudyToolsRows,
	executeStudyToolsFixture,
	loadStudyToolsFixture,
	readStudyToolsRequests,
	readStudyToolsText,
} from '../../setupStudy.js'

it('parses the context declaration', async () => {
	const fixture = await loadStudyToolsFixture('context')
	expect(() =>
		createStudyAdapter().validate({
			definition: fixture.manifest.definition,
			scenarios: fixture.manifest.scenarios,
			rubric: fixture.rubric,
			profile: fixture.profile,
		}),
	).not.toThrow()
})

it('grades every library goal achieved', async () => {
	const run = await executeStudyToolsFixture('context')
	expect(run.attempts).toHaveLength(2)
	expect(run.attempts.every((attempt) => attempt.failure === undefined)).toBe(true)
	const judgments = createStudyAdapter().grade({
		manifest: run.manifest,
		rubric: run.fixture.rubric,
		attempts: run.attempts,
		evidence: run.evidence,
	})
	expect(judgments).toHaveLength(58)
	expect(
		judgments.every(
			(judgment) => judgment.verdict === 'achieved' && judgment.references.length === 1,
		),
	).toBe(true)
	const assessment = {
		...buildStudyAssessment(run.manifest.schedule, judgments),
		result: run.seal,
		rubric: hashStudyBytes(encodeStudyJSON(run.fixture.rubric)),
	}
	expect(computeStudyScores(run.manifest, run.fixture.rubric, assessment)).toEqual([
		{
			arm: 'agent',
			total: 58,
			achieved: 58,
			unsuccessful: 0,
			unknown: 0,
			critical: 0,
			lower: 1,
			upper: 1,
			coverage: 1,
		},
	])
})

it('keeps the exact request history', async () => {
	const { trials } = await executeStudyToolsFixture('context')
	const expected = [
		['system user', 'system user assistant tool tool'],
		[
			'system user user assistant tool tool assistant user',
			'system user user assistant tool tool assistant user assistant tool',
		],
		[
			'system user user assistant tool tool assistant user assistant tool assistant user',
			'system user user assistant tool tool assistant user assistant tool assistant user assistant tool',
		],
		['system user user', 'system user user assistant tool'],
		['system user user assistant tool assistant user'],
		[
			'system user user assistant tool assistant user assistant user',
			'system user user assistant tool assistant user assistant user assistant tool tool tool',
		],
		[
			'system user user assistant tool assistant user assistant user assistant tool tool tool assistant user',
		],
	]
	expect(trials).toHaveLength(2)
	for (const rows of trials)
		expect(
			['write', 'revise', 'refuse', 'read', 'scoped', 'load', 'loaded'].map((goal) =>
				readStudyToolsRequests(rows, goal).map((messages) =>
					messages.map((message) => message.role).join(' '),
				),
			),
		).toEqual(expected)
})

it('counts one load in the load run', async () => {
	const { trials } = await executeStudyToolsFixture('context')
	expect(trials).toHaveLength(2)
	for (const rows of trials)
		expect(
			collectStudyToolsRows(rows, 'tool')
				.filter((row) => row.name === 'skill')
				.map((row) => [row.goal, row.success]),
		).toEqual([
			['load', false],
			['load', false],
			['load', true],
		])
})

it('holds model text out of system', async () => {
	const { trials } = await executeStudyToolsFixture('context')
	expect(trials.map((rows) => rows.filter((row) => row.event === 'provider').length)).toEqual([
		12, 12,
	])
	const systems = trials
		.flatMap((rows) =>
			['write', 'revise', 'refuse', 'read', 'scoped', 'load', 'loaded'].flatMap((goal) =>
				readStudyToolsRequests(rows, goal),
			),
		)
		.flatMap((messages) =>
			messages.filter((message) => message.role === 'system').map((message) => message.content),
		)
	expect(systems).toHaveLength(24)
	expect(
		systems.filter((system) =>
			[
				'- tone:',
				'- reach:',
				'- gossip:',
				'Prefers short replies.',
				'Prefers bullet lists.',
				'Answers by email.',
				'Refused text.',
				'Answer briefly.',
				'Answer in bullets.',
				'Reply by email.',
				'Refused body.',
				'Injected body.',
			].some((text) => system.includes(text)),
		),
	).toEqual([])
})

it('starts each trial with no memo', async () => {
	const { trials } = await executeStudyToolsFixture('context')
	const [, second = []] = trials
	expect(readStudyToolsText(second, 'write', 0, 'system')).not.toContain('## Memos')
	expect(readStudyToolsText(second, 'write', 0, 'user')).not.toContain('## Memos')
	expect(
		collectStudyToolsRows(second, 'memo').filter(
			(row) => row.goal === 'write' && row.name === 'tone',
		),
	).toEqual([{ goal: 'write', name: 'tone', revisions: 1, description: 'Prefers short replies.' }])
})

it('reads a memo in the second conversation', async () => {
	const { trials } = await executeStudyToolsFixture('context')
	const [rows = []] = trials
	const head = readStudyToolsText(rows, 'read', 0, 'user')
	expect(head).toContain('Read the tone memo.')
	expect(head).not.toContain('Remember the reply tone and reach.')
	expect(head).not.toContain('Revise the reply tone.')
	expect(head).not.toContain('Answer in bullets.')
	expect(collectStudyToolsRows(rows, 'result').filter((row) => row.goal === 'read')).toEqual([
		{ goal: 'read', content: 'Answer in bullets.', partial: false },
	])
})

it('refuses a memo the host refused', async () => {
	const { trials } = await executeStudyToolsFixture('context')
	const [rows = []] = trials
	expect(
		collectStudyToolsRows(rows, 'denial')
			.filter((row) => row.goal === 'refuse')
			.map((row) => row.name),
	).toEqual(['remember'])
	expect(
		collectStudyToolsRows(rows, 'tool').filter(
			(row) => row.goal === 'refuse' && row.name === 'remember' && row.success === true,
		),
	).toEqual([])
	expect(collectStudyToolsRows(rows, 'memo').filter((row) => row.goal === 'refuse')).toEqual([
		{ goal: 'refuse', name: 'gossip', revisions: 0 },
	])
})

it('takes a skill body from the manager', async () => {
	const { trials } = await executeStudyToolsFixture('context')
	const [rows = []] = trials
	expect(
		collectStudyToolsRows(rows, 'tool')
			.filter((row) => row.goal === 'load' && row.name === 'skill' && row.success === false)
			.map((row) => [row.arguments, row.error]),
	).toEqual([
		[{ name: 'missing' }, 'Skill is absent'],
		[{ name: 'triage', content: 'Injected body.' }, expect.stringContaining('content: extra')],
	])
	const system = readStudyToolsText(rows, 'loaded', 0, 'system')
	expect(system).toContain('Read the diff, then list each defect with its line.')
	expect(system).not.toContain('Read the report')
	expect(system).not.toContain('Injected body.')
})

it('reaches the head at the next run', async () => {
	const { trials } = await executeStudyToolsFixture('context')
	const [rows = []] = trials
	expect(readStudyToolsText(rows, 'load', 1, 'system')).toBe(
		readStudyToolsText(rows, 'load', 0, 'system'),
	)
	expect(readStudyToolsText(rows, 'loaded', 0, 'system')).toContain(
		'## Instructions\n\nRead the diff, then list each defect with its line.',
	)
})

it('filters both indexes by scope', async () => {
	const { trials } = await executeStudyToolsFixture('context')
	const [rows = []] = trials
	const system = readStudyToolsText(rows, 'scoped', 0, 'system')
	const user = readStudyToolsText(rows, 'scoped', 0, 'user')
	expect(system).toContain('- triage:')
	expect(system).not.toContain('- review:')
	expect(user).toContain('- reach:')
	expect(user).not.toContain('- tone:')
	expect(readStudyToolsText(rows, 'load', 0, 'system')).toContain('- review:')
	expect(readStudyToolsText(rows, 'load', 0, 'user')).toContain('- tone:')
})

it('leaves the tools requests unchanged', async () => {
	const { trials } = await executeStudyToolsFixture()
	const [rows = []] = trials
	expect(readStudyToolsRequests(rows, 'save')[0]).toEqual([
		{ role: 'user', content: 'Create the scratch note.' },
	])
	const expected = [
		[
			['save', ['user', 'user assistant tool']],
			[
				'recall',
				['user assistant tool assistant user', 'user assistant tool assistant user assistant tool'],
			],
		],
		[['escape', ['user', 'user assistant tool']]],
		[['denied', ['user', 'user assistant tool']]],
		[['abort', ['user']]],
		[
			['save', ['user', 'user assistant tool']],
			['continue', ['user assistant tool assistant user']],
		],
		[
			['refuse', ['user', 'user assistant tool']],
			['pending', ['user assistant tool assistant user']],
			[
				'unanswered',
				[
					'user assistant tool assistant user user',
					'user assistant tool assistant user user assistant tool',
				],
			],
			[
				'approve',
				[
					'user assistant tool assistant user user assistant tool assistant user',
					'user assistant tool assistant user user assistant tool assistant user assistant tool',
				],
			],
		],
	]
	expect(
		trials.map((trial) =>
			[
				...new Set(
					collectStudyToolsRows(trial, 'provider').flatMap((row) =>
						typeof row.goal === 'string' ? [row.goal] : [],
					),
				),
			].map((goal) => [
				goal,
				readStudyToolsRequests(trial, goal).map((messages) =>
					messages.map((message) => message.role).join(' '),
				),
			]),
		),
	).toEqual([...expected, ...expected])
})
