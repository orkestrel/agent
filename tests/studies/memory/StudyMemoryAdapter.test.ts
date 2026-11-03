import { isRecord, parseJSON } from '@orkestrel/contract'
import { isStudyJudgment, parseStudyProfile, parseStudyScenario } from '@orkestrel/study'
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { createStudyAdapter, isStudyMemoryOptions } from '../../../studies/memory/index.js'
import {
	buildCustodyManifest,
	buildMemoryCriterion,
	buildMemoryGradingFixture,
	buildMemoryProfile,
	loadMemoryInputs,
	omitMemoryAuxiliaries,
	STUDY_MEMORY_PROGRESS_ROWS,
	STUDY_MEMORY_SETTINGS,
} from '../../setupStudy.js'

describe('memory declaration and mechanical evidence', () => {
	it('checks the list against the horizon', async () => {
		const adapter = createStudyAdapter()
		const url = 'http://127.0.0.1:7'
		const q2 = parseStudyProfile(
			parseJSON(await readFile('studies/memory/profiles/q2.json', 'utf8')),
		)
		const input = await loadMemoryInputs(buildMemoryProfile({ url }), 'qualification')
		const declared = input.scenarios[0]?.goals.map((goal) => goal.id) ?? []
		const settings = { ...STUDY_MEMORY_SETTINGS, observe: true }
		expect(declared).toHaveLength(96)
		// Goal k reads the zero-padded ceiling of k/4, then ((k-1) mod 4)+1; the declaration can disagree.
		expect(declared).toEqual(
			Array.from(
				{ length: 96 },
				(_, index) =>
					`ev-${String(Math.ceil((index + 1) / 4)).padStart(2, '0')}-${(index % 4) + 1}`,
			),
		)
		if (!isRecord(q2.settings)) throw new Error('Missing q2 settings')
		expect(q2.settings.checkpoints).toEqual(declared)
		expect(() =>
			adapter.validate({
				...input,
				profile: buildMemoryProfile({ url, settings: { ...settings, checkpoints: declared } }),
			}),
		).not.toThrow()
		for (const [checkpoints, message] of [
			[[...declared, 'ev-25-1'], /horizon of 96/],
			[['ev-25-1'], /ev-25-1 names no goal/],
		] as const)
			expect(() =>
				adapter.validate({
					...input,
					profile: buildMemoryProfile({
						url,
						settings: { ...settings, checkpoints: [...checkpoints] },
					}),
				}),
			).toThrow(
				expect.objectContaining({ code: 'CONFIG', message: expect.stringMatching(message) }),
			)
		const handoff = await loadMemoryInputs(buildMemoryProfile({ url }))
		expect(() =>
			adapter.validate({
				...handoff,
				profile: buildMemoryProfile({ url, settings: { ...settings, checkpoints: [...declared] } }),
			}),
		).toThrow(/horizon of 3/)
	})

	it('declares each transport profile as q2 with only its named differences', async () => {
		const stems = ['system', 'repeat', 'sham', 'separate'] as const
		const named = {
			system: { layout: 'system' },
			repeat: { layout: 'system', seed: 1 },
			sham: { layout: 'tight' },
			separate: { layout: 'separate' },
		}
		const texts = await Promise.all(
			['q2', ...stems].map((stem) => readFile(`studies/memory/profiles/${stem}.json`, 'utf8')),
		)
		const [base, ...arms] = texts.map((text) => parseStudyProfile(parseJSON(text)))
		if (base === undefined || !isRecord(base.settings)) throw new Error('Missing q2 settings')
		// The on arm is q2 itself, which declares neither member.
		expect(Object.keys(base.settings)).not.toContain('layout')
		expect(Object.keys(base.settings)).not.toContain('seed')
		expect(arms).toHaveLength(stems.length)
		for (const [index, stem] of stems.entries()) {
			const arm = arms[index]
			if (arm === undefined) throw new Error(`Missing ${stem} profile`)
			expect(arm).toEqual({ ...base, name: stem, settings: { ...base.settings, ...named[stem] } })
			expect(isStudyMemoryOptions(arm.settings)).toBe(true)
		}
	})

	it('reads one goal into progress', () => {
		expect(
			createStudyAdapter().progress?.({
				trial: { id: 'trial', scenario: 'public', arm: 'records', repetition: 0 },
				goal: 'goal',
				evidence: STUDY_MEMORY_PROGRESS_ROWS,
			}),
		).toEqual({
			calls: { metadata: 1, judge: 1, agent: 3 },
			usage: { prompt: 70, cached: 19, completion: 12, total: 600 },
			partial: true,
			empty: true,
			lookups: { found: 1, missing: 1 },
			repeats: 2,
			system: { count: 2, bytes: 8 },
			cache: [0.25, 0.25],
		})
	})

	it('omits cells for a goal without rows', () => {
		const trial = { id: 'trial', scenario: 'public', arm: 'records', repetition: 0 }
		const adapter = createStudyAdapter()
		const reading = adapter.progress?.({ trial, goal: 'goal', evidence: [] })
		expect(reading).toEqual({})
		expect(isRecord(reading) && 'calls' in reading).toBe(false)
		// A metadata body and a judge body hold no agent request, so the system cell stays absent.
		expect(
			adapter.progress?.({
				trial,
				goal: 'goal',
				evidence: STUDY_MEMORY_PROGRESS_ROWS.slice(0, 3),
			}),
		).toEqual({})
	})

	it('requires an explicit valid gauge for any compaction arm at declaration only', async () => {
		const url = 'http://127.0.0.1:7'
		const adapter = createStudyAdapter()
		const input = await loadMemoryInputs(
			buildMemoryProfile({ url, settings: STUDY_MEMORY_SETTINGS }),
		)
		expect(input.definition.arms).toContain('compaction')
		expect(() => adapter.validate(input)).not.toThrow()
		for (const settings of [undefined, {}, { observe: true }])
			expect(() =>
				adapter.validate({ ...input, profile: buildMemoryProfile({ url, settings }) }),
			).toThrow('gauge')
		expect(() =>
			adapter.validate({
				...input,
				profile: buildMemoryProfile({ url, settings: { gauge: { scale: 0, overhead: 0 } } }),
			}),
		).toThrow('settings')
		for (const arms of [['records'], ['full'], ['records', 'full']])
			expect(() =>
				adapter.validate({
					...input,
					definition: { ...input.definition, arms, order: [arms] },
					profile: buildMemoryProfile({ url }),
				}),
			).not.toThrow()
	})

	it('admits a declaration without an unused auxiliary role and refuses an arm whose role is missing', async () => {
		const adapter = createStudyAdapter()
		const base = buildMemoryProfile({
			url: 'http://127.0.0.1:7',
			settings: STUDY_MEMORY_SETTINGS,
		})
		const bare = omitMemoryAuxiliaries(base)
		const input = await loadMemoryInputs(bare)
		const full = ['full']
		const records = ['records']
		const compaction = ['compaction']
		const every = ['records', 'compaction', 'full']
		expect(() =>
			adapter.validate({
				...input,
				definition: { ...input.definition, arms: full, order: [full] },
			}),
		).not.toThrow()
		expect(() =>
			adapter.validate({
				...input,
				definition: { ...input.definition, arms: records, order: [records] },
			}),
		).toThrow('judge')
		expect(() =>
			adapter.validate({
				...input,
				definition: { ...input.definition, arms: compaction, order: [compaction] },
			}),
		).toThrow('Memory compaction requires a declared recap allowance')
		expect(() =>
			adapter.validate({
				...input,
				definition: { ...input.definition, arms: every, order: [every] },
			}),
		).toThrow('judge model and digest')
		expect(() =>
			adapter.validate({
				...input,
				definition: { ...input.definition, arms: compaction, order: [compaction] },
				profile: { ...bare, room: base.room },
			}),
		).not.toThrow()
		expect(() =>
			adapter.validate({
				...input,
				definition: { ...input.definition, arms: records, order: [records] },
				profile: { ...bare, provider: base.provider },
			}),
		).not.toThrow()
	})
})

describe('memory mechanical grading over the shared traversal', () => {
	const adapter = createStudyAdapter()
	const {
		profile,
		definition,
		manifest,
		complete: { trial: complete },
		faulted: { trial: faulted },
		operational,
		rubric,
		failure,
		attempts,
		evidence,
	} = buildMemoryGradingFixture()

	it('cites retained attempts and one-based rows, keeps unknowns empty and admits nonfault partial products', () => {
		const judgments = adapter.grade({ manifest, rubric, attempts, evidence })
		expect(judgments.every((judgment) => isStudyJudgment(judgment))).toBe(true)
		expect(
			judgments.map((judgment) => [
				judgment.trial,
				judgment.criterion,
				judgment.verdict,
				judgment.method,
				judgment.references,
			]),
		).toEqual([
			[complete.id, 'operational', 'achieved', 'state', [`trials/${complete.id}/attempt.json`]],
			[complete.id, 'meaning', 'unknown', 'human', []],
			[complete.id, 'source', 'achieved', 'trace', [`trials/${complete.id}/evidence.jsonl#2`]],
			[
				complete.id,
				'lookup',
				'unsuccessful',
				'trace',
				[`trials/${complete.id}/attempt.json`, `trials/${complete.id}/evidence.jsonl`],
			],
			[complete.id, 'result', 'unsuccessful', 'state', [`trials/${complete.id}/attempt.json`]],
			[faulted.id, 'operational', 'unsuccessful', 'state', [`trials/${faulted.id}/attempt.json`]],
			[faulted.id, 'meaning', 'unknown', 'human', []],
			[faulted.id, 'source', 'unknown', 'trace', []],
			[faulted.id, 'lookup', 'unknown', 'trace', []],
			[faulted.id, 'result', 'unknown', 'state', []],
		])
		expect(judgments.map((judgment) => judgment.reason)).toEqual([
			'Retained observable mechanism evidence',
			'Requires an independent blind semantic label',
			'Retained observable mechanism evidence',
			'Retained observable mechanism evidence',
			'Retained observable mechanism evidence',
			'Retained observable mechanism evidence',
			'Requires an independent blind semantic label',
			'No retained observation for the declared mechanism',
			'No retained observation for the declared mechanism',
			'No retained observation for the declared mechanism',
		])
		const retained = new Set(
			Object.entries(evidence).flatMap(([id, rows]) => [
				`trials/${id}/attempt.json`,
				`trials/${id}/evidence.jsonl`,
				...Array.from(rows.keys(), (index) => `trials/${id}/evidence.jsonl#${index + 1}`),
			]),
		)
		for (const judgment of judgments) {
			expect(judgment.references.every((reference) => retained.has(reference))).toBe(true)
			expect(judgment.references.length === 0).toBe(judgment.verdict === 'unknown')
			expect(
				judgment.verdict === 'unsuccessful' &&
					judgment.references.some((reference) => reference.includes('#')),
			).toBe(false)
		}
	})

	it('keeps the whole-attempt operational policy: a failed later goal makes every goal of its attempt unsuccessful', () => {
		const plan = buildCustodyManifest(
			{ ...definition, order: [['full']] },
			[
				parseStudyScenario({
					id: 'desk',
					goals: [
						{ id: 'goal', input: {} },
						{ id: 'late', input: {} },
					],
				}),
			],
			profile.bounds,
		)
		const [trial] = plan.schedule
		if (trial === undefined) throw new Error('Missing fixture trial')
		const judgments = adapter.grade({
			manifest: plan,
			rubric: {
				version: '1',
				criteria: [
					operational,
					buildMemoryCriterion('late', 'state', operational.assertion, 'late'),
				],
			},
			attempts: [
				{
					trial,
					duration: 2,
					failure,
					executed: true,
					observations: [
						{
							goal: 'goal',
							product: { value: { content: 'ok' }, partial: false },
							failure: undefined,
							usage: [],
							duration: 1,
							executed: true,
						},
						{ goal: 'late', product: undefined, failure, usage: [], duration: 1, executed: true },
					],
				},
			],
			evidence: {},
		})
		expect(
			judgments.map((judgment) => [judgment.trial, judgment.criterion, judgment.verdict]),
		).toEqual([
			[trial.id, 'operational', 'unsuccessful'],
			[trial.id, 'late', 'unsuccessful'],
		])
	})
})
