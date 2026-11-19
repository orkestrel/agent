import type { StudyLabelControl, StudyLabelPool } from '@orkestrel/study/server'
import { join, resolve, sep } from 'node:path'
import {
	createStudyLabelPool,
	createStudyLabelSheet,
	encodeStudyJSON,
	parseStudyLabelLane,
} from '@orkestrel/study/server'
import { describe, expect, it } from 'vitest'
import {
	STUDY_LABELER_AUTHORED,
	STUDY_LABELER_LABELS,
	STUDY_LABELER_MODEL,
	buildStudyLabelerTally,
	compareStudyLabelerHuman,
	drawStudyLabelerSample,
	isStudyLabelerScore,
	labelStudyPool,
	parseStudyLabelerArguments,
	planStudyLabelerPaths,
	planStudyLabelerSources,
	readStudyLabelerAnswers,
	readStudyLabelerControls,
	resolveStudyLabelerPartition,
} from '../../studies/labeler.js'

// Every text below is fictional; the markers let a test prove none reaches the counts.
const SEAL = 'fictional-seal'
const TRIALS = Object.freeze([
	['neutral-trial-1', 'r1-s1-a1', 'records'],
	['neutral-trial-2', 'r1-s1-a2', 'plain'],
] as const)
const GOALS = Object.freeze(['g-1', 'g-2'] as const)
const CLASSES = Object.freeze(['facts', 'work'] as const)
const CONTROLS: readonly StudyLabelControl[] = Object.freeze([
	{
		input: { prompt: 'CONTROL prompt one' },
		product: { content: 'CONTROL product one' },
		assertion: { criterion: 'CONTROL assertion one' },
		verdict: 'achieved',
	},
	{
		input: { prompt: 'CONTROL prompt two' },
		product: { content: 'CONTROL product two' },
		assertion: { criterion: 'CONTROL assertion two' },
		verdict: 'unsuccessful',
	},
])

function buildPool(): StudyLabelPool {
	const entries = TRIALS.flatMap(([neutral, , arm]) =>
		GOALS.flatMap((goal) =>
			CLASSES.map((name) => ({
				neutral,
				criterion: `neutral-${goal}-${name}`,
				source: {
					trial: TRIALS.find((row) => row[0] === neutral)?.[1] ?? '',
					criterion: `${goal}-${name}`,
				},
				text: `FICTIONAL ${arm} ${goal} ${name}`,
			})),
		),
	)
	return createStudyLabelPool(
		[
			{
				result: SEAL,
				arm: 'endurance',
				packet: encodeStudyJSON({
					entries: entries.map((entry) => ({
						trial: entry.neutral,
						criterion: entry.criterion,
						input: { prompt: `${entry.text} input` },
						product: { content: `${entry.text} product` },
						assertion: { criterion: `${entry.text} assertion` },
					})),
				}),
				legend: encodeStudyJSON({
					result: SEAL,
					entries: entries.map((entry) => ({
						trial: entry.neutral,
						criterion: entry.criterion,
						source: entry.source,
					})),
				}),
			},
		],
		{
			order: 'fictional-order',
			controls: CONTROLS,
			partition: resolveStudyLabelerPartition(GOALS),
		},
	)
}

// Reads the row numbers a prompt shows, one JSON row per line.
function readPromptRows(prompt: string): readonly number[] {
	return prompt
		.split('\n')
		.filter((line) => line.startsWith('{'))
		.map((line) => {
			const value: unknown = JSON.parse(line)
			if (typeof value !== 'object' || value === null || !('row' in value))
				throw new Error('A prompt line holds no row')
			return Number(value.row)
		})
}

function buildOutput(rows: readonly unknown[], model = STUDY_LABELER_MODEL): unknown {
	return {
		type: 'result',
		subtype: 'success',
		is_error: false,
		modelUsage: { [model]: { inputTokens: 1 } },
		structured_output: { rows },
	}
}

function answerAll(prompt: string): unknown {
	return buildOutput(
		readPromptRows(prompt).map((row) => ({
			row,
			verdict: 'achieved',
			reason: `REASON ${String(row)}`,
		})),
	)
}

describe('labeler runner over a synthetic pool', () => {
	it('asks every request once and builds a labels sheet from well-formed answers', async () => {
		const pool = buildPool()
		const run = await labelStudyPool(pool, (prompt) => Promise.resolve(answerAll(prompt)))
		expect(run.batches).toEqual({ asked: pool.requests.length, retried: 0, omitted: 0 })
		expect(run.lane.labeler).toBe(STUDY_LABELER_MODEL)
		const sheet = createStudyLabelSheet(pool.map, [run.lane], {
			created: '2026-11-19T00:00:00.000Z',
			version: '1',
			partial: true,
		})
		expect(sheet.omitted).toBe(0)
		expect(sheet.labels.flatMap((labels) => labels.judgments)).toHaveLength(pool.map.links.length)
	})

	it('never lets a malformed answer reach a sheet: it asks once more, then omits the request', async () => {
		const pool = buildPool()
		const [first, second] = pool.requests
		if (first === undefined || second === undefined) throw new Error('The pool needs two requests')
		const firstRows = new Set(first.rows.map((row) => row.row))
		const asked = new Map<string, number>()
		const run = await labelStudyPool(pool, (prompt) => {
			const rows = readPromptRows(prompt)
			const times = (asked.get(prompt) ?? 0) + 1
			asked.set(prompt, times)
			// The first request is malformed twice: one answer leaves a row out, the next breaks the contract.
			if (rows.every((row) => firstRows.has(row)))
				return Promise.resolve(
					times === 1
						? buildOutput(
								rows.slice(1).map((row) => ({ row, verdict: 'achieved', reason: 'MALFORMED' })),
							)
						: buildOutput(rows.map((row) => ({ row, verdict: 'maybe', reason: 'MALFORMED' }))),
				)
			// The second request is malformed once, with a blank reason, then well formed.
			if (rows[0] === second.rows[0]?.row && times === 1)
				return Promise.resolve(
					buildOutput(rows.map((row) => ({ row, verdict: 'achieved', reason: ' ' }))),
				)
			return Promise.resolve(answerAll(prompt))
		})
		expect(run.batches).toEqual({ asked: pool.requests.length, retried: 2, omitted: 1 })
		expect(run.lane.rows.some((row) => firstRows.has(row.row))).toBe(false)
		expect(
			run.lane.rows.some((row) => row.reason === 'MALFORMED' || row.reason.trim() === ''),
		).toBe(false)
		const sheet = createStudyLabelSheet(pool.map, [run.lane], {
			created: '2026-11-19T00:00:00.000Z',
			version: '1',
			partial: true,
		})
		const linked = pool.map.links.filter((link) => firstRows.has(link.row)).length
		expect(sheet.labels.flatMap((labels) => labels.judgments)).toHaveLength(
			pool.map.links.length - linked,
		)
		expect(JSON.stringify(sheet.labels)).not.toContain('MALFORMED')
	})

	it.each([
		[
			'a failed call',
			{
				type: 'result',
				subtype: 'error_max_turns',
				is_error: true,
				modelUsage: { [STUDY_LABELER_MODEL]: {} },
			},
		],
		[
			'no structured answer',
			{
				type: 'result',
				subtype: 'success',
				is_error: false,
				modelUsage: { [STUDY_LABELER_MODEL]: {} },
			},
		],
		['an added row', buildOutput([{ row: 999, verdict: 'achieved', reason: 'r' }])],
		[
			'a repeated row',
			buildOutput([
				{ row: 1, verdict: 'achieved', reason: 'r' },
				{ row: 1, verdict: 'achieved', reason: 'r' },
			]),
		],
		['a verdict outside the three', buildOutput([{ row: 1, verdict: 'maybe', reason: 'r' }])],
	])('reads no answers from %s', (_name, output) => {
		expect(
			readStudyLabelerAnswers(output, { rows: [{ row: 1, input: {}, assertion: {} }] }),
		).toBeUndefined()
	})

	it.each([['claude-sonnet-5-5'], [`${STUDY_LABELER_MODEL},claude-sonnet-5-5`]])(
		'refuses the whole run when the output reports %s',
		async (model) => {
			const pool = buildPool()
			const outputs: unknown[] = []
			await expect(
				labelStudyPool(pool, (prompt) => {
					const rows = readPromptRows(prompt).map((row) => ({
						row,
						verdict: 'achieved',
						reason: 'r',
					}))
					const output = model.includes(',')
						? {
								type: 'result',
								subtype: 'success',
								is_error: false,
								modelUsage: { [STUDY_LABELER_MODEL]: {}, 'claude-sonnet-5-5': {} },
								structured_output: { rows },
							}
						: buildOutput(rows, model)
					outputs.push(output)
					return Promise.resolve(output)
				}),
			).rejects.toThrow(/claude-sonnet-5-5/)
			// The refusal stops the run at the first answer.
			expect(outputs).toHaveLength(1)
		},
	)

	it('keeps every row out of the files outside the labels folder', async () => {
		const root = resolve('fictional-root')
		const result = join(root, 'tmp', 'studies', 'fictional-run')
		const paths = planStudyLabelerPaths(result, SEAL, 'a'.repeat(64), root)
		const labels = join(root, STUDY_LABELER_LABELS)
		for (const path of [
			paths.labels,
			paths.pool,
			paths.lane,
			paths.sheets,
			paths.sample,
			paths.answers,
		])
			expect(path.startsWith(`${labels}${sep}`)).toBe(true)
		expect(paths.tally).toBe(`${result}.tally.json`)
		expect(paths.tally.startsWith(labels)).toBe(false)
		const pool = buildPool()
		const run = await labelStudyPool(pool, (prompt) => Promise.resolve(answerAll(prompt)))
		const tally = buildStudyLabelerTally({
			study: 'endurance',
			assessment: 'a'.repeat(64),
			labeled: 'b'.repeat(64),
			map: pool.map,
			run,
			sheet: createStudyLabelSheet(pool.map, [run.lane], {
				created: '2026-11-19T00:00:00.000Z',
				version: '1',
				partial: true,
			}),
			arms: new Map(TRIALS.map(([, trial, arm]) => [trial, arm])),
			lookups: new Map([['r1-s1-a1/g-1', { found: 2, missing: 1 }]]),
			scores: undefined,
		})
		const text = JSON.stringify(tally)
		for (const marker of [
			'FICTIONAL',
			'CONTROL',
			'REASON',
			'neutral-',
			'r1-s1-a',
			'g-1',
			'g-2',
			SEAL,
		])
			expect(text).not.toContain(marker)
		expect(tally.rows).toEqual({
			asked: pool.map.links.length,
			answered: pool.map.links.length,
			omitted: 0,
		})
		expect(tally.verdicts).toEqual([
			{ arm: 'plain', achieved: 4, unsuccessful: 0, unknown: 0 },
			{ arm: 'records', achieved: 4, unsuccessful: 0, unknown: 0 },
		])
		// Every answer read achieved, so the one unsuccessful control is the one missed.
		expect(tally.controls).toEqual([
			{ verdict: 'achieved', count: 1, missed: 0 },
			{ verdict: 'unsuccessful', count: 1, missed: 1 },
		])
		expect(tally.missed).toBe(1)
		// Goal g-1 of the records trial holds two rows, each counting its goal's lookups once.
		expect(tally.recall).toEqual([
			{ arm: 'plain', verdict: 'achieved', rows: 4, found: 0, missing: 0 },
			{ arm: 'records', verdict: 'achieved', rows: 4, found: 4, missing: 2 },
		])
	})
})

describe('labeler leaves', () => {
	it('names the authored instruction and controls of each study under the authored folder', () => {
		const root = resolve('fictional-root')
		expect(planStudyLabelerSources(root, 'endurance')).toEqual({
			instruction: join(root, STUDY_LABELER_AUTHORED, 'instruction.endurance.md'),
			controls: join(root, STUDY_LABELER_AUTHORED, 'controls.endurance.json'),
		})
	})

	it('reads a criterion goal and class from the longest goal its id opens with', () => {
		const partition = resolveStudyLabelerPartition(['ev-01', 'ev-01-1'])
		expect(partition({ trial: 't', criterion: 'ev-01-1-facts' })).toEqual({
			goal: 'ev-01-1',
			class: 'facts',
		})
		expect(partition({ trial: 't', criterion: 'ev-01-2-work' })).toEqual({
			goal: 'ev-01',
			class: '2-work',
		})
		expect(partition({ trial: 't', criterion: 'other-facts' })).toBeUndefined()
		expect(partition({ trial: 't', criterion: 'ev-01-1-' })).toEqual({ goal: 'ev-01', class: '1-' })
	})

	it('draws a repeatable blind sample holding only what a labeler reads', () => {
		const pool = buildPool()
		const drawn = drawStudyLabelerSample(pool, 3, 'sample-order')
		expect(drawn).toEqual(drawStudyLabelerSample(pool, 3, 'sample-order'))
		expect(drawn).toHaveLength(3)
		expect(
			drawn.every((row) =>
				Object.keys(row).every((key) => ['row', 'input', 'product', 'assertion'].includes(key)),
			),
		).toBe(true)
		expect(drawStudyLabelerSample(pool, 1000, 'sample-order')).toHaveLength(
			pool.requests.flatMap((batch) => batch.rows).length,
		)
	})

	it('compares a person with the model lane and counts the sampled controls they matched', async () => {
		const pool = buildPool()
		const run = await labelStudyPool(pool, (prompt) => Promise.resolve(answerAll(prompt)))
		const [link] = pool.map.links
		const checks = pool.map.checks
		if (link === undefined || checks.length !== 2)
			throw new Error('The pool needs a row and two controls')
		const human = parseStudyLabelLane(
			{
				rows: [
					{ row: link.row, verdict: 'unsuccessful', reason: 'The person disagrees' },
					...checks.map((check) => ({ row: check.row, verdict: check.verdict, reason: 'Matches' })),
				],
			},
			{ labeler: 'human', method: 'human' },
		)
		const comparison = compareStudyLabelerHuman(pool.map, run.lane, human)
		expect(comparison.controls).toEqual({ count: 2, agreed: 2 })
		expect(comparison.agreement).toEqual([
			expect.objectContaining({ class: link.class, count: 1, agreement: 0 }),
		])
	})

	it('resolves the command line and refuses what it cannot read', () => {
		const assessment = 'a'.repeat(64)
		expect(
			parseStudyLabelerArguments(['run', '--assessment', assessment, '--sample', '5']),
		).toMatchObject({
			result: resolve('run'),
			assessment,
			sample: 5,
			human: undefined,
			closure: undefined,
		})
		expect(() => parseStudyLabelerArguments([])).toThrow(/Usage/)
		expect(() => parseStudyLabelerArguments(['run'])).toThrow(/assessment/)
		expect(() => parseStudyLabelerArguments(['run', '--assessment', 'A'.repeat(64)])).toThrow(
			/assessment/,
		)
		expect(() =>
			parseStudyLabelerArguments(['run', '--assessment', assessment, '--sample', '0']),
		).toThrow(/sample/)
		expect(() =>
			parseStudyLabelerArguments(['run', '--assessment', assessment, '--model', 'x']),
		).toThrow(/Unknown/)
		expect(() =>
			parseStudyLabelerArguments(['run', '--assessment', assessment, '--assessment', assessment]),
		).toThrow(/Repeated/)
		expect(() => parseStudyLabelerArguments(['run', '--assessment'])).toThrow(/needs a value/)
	})

	it('reads authored controls and refuses one without a verdict', () => {
		const encoder = new TextEncoder()
		expect(readStudyLabelerControls(encoder.encode(JSON.stringify(CONTROLS)))).toEqual(CONTROLS)
		expect(() => readStudyLabelerControls(encoder.encode('{}'))).toThrow(/array/)
		expect(() =>
			readStudyLabelerControls(
				encoder.encode(JSON.stringify([{ input: 1, product: 2, assertion: 3 }])),
			),
		).toThrow(/verdict/)
	})

	it('admits a report score only when it holds every count', () => {
		const score = {
			arm: 'records',
			total: 4,
			achieved: 1,
			unsuccessful: 1,
			unknown: 2,
			critical: 0,
			lower: 0.25,
			upper: 0.75,
			coverage: 0.5,
		}
		expect(isStudyLabelerScore(score)).toBe(true)
		expect(isStudyLabelerScore({ ...score, coverage: '0.5' })).toBe(false)
		expect(isStudyLabelerScore(undefined)).toBe(false)
	})
})
