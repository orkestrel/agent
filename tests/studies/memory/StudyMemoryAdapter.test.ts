import { isStudyJudgment, parseStudyScenario } from '@orkestrel/study'
import { describe, expect, it } from 'vitest'
import { createStudyAdapter } from '../../../studies/memory/index.js'
import {
	buildCustodyManifest,
	buildMemoryCriterion,
	buildMemoryGradingFixture,
	buildMemoryProfile,
	loadMemoryInputs,
	omitMemoryAuxiliaries,
	STUDY_MEMORY_SETTINGS,
} from '../../setupStudy.js'

describe('memory declaration and mechanical evidence', () => {
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
		complete,
		faulted,
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
