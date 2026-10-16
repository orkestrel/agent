import type { StudyAttempt, StudyEvidence } from '@orkestrel/study'
import { isStudyJudgment, parseStudyScenario } from '@orkestrel/study'
import { describe, expect, it } from 'vitest'
import { createStudyAdapter, readStudyMemoryGrade } from '../../../studies/memory/index.js'
import {
	buildCustodyManifest,
	buildMemoryCriterion,
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
	const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
	const definition = {
		name: 'test',
		version: '1',
		question: 'mechanisms',
		purpose: 'capacity',
		driver: 'memory',
		arms: ['full'],
		scenarios: ['desk'],
		order: [['full'], ['full']],
		retries: 0,
		rubric: 'rubric.json',
	} as const
	const manifest = buildCustodyManifest(
		definition,
		[parseStudyScenario({ id: 'desk', goals: [{ id: 'goal', input: {} }] })],
		profile.bounds,
	)
	const [complete, faulted] = manifest.schedule
	if (complete === undefined || faulted === undefined) throw new Error('Missing fixture trials')
	const operational = buildMemoryCriterion('operational', 'state', { observation: 'operational' })
	const meaning = buildMemoryCriterion('meaning', 'semantic', {
		criterion: 'Correctly repaired handoff',
	})
	const source = buildMemoryCriterion('source', 'trace', { observation: 'arrival', id: 'receipt' })
	const lookup = buildMemoryCriterion('lookup', 'trace', { observation: 'lookup', id: 'record' })
	const result = buildMemoryCriterion('result', 'state', { observation: 'result', partial: false })
	const rubric = { version: '1', criteria: [operational, meaning, source, lookup, result] }
	const failure = { cause: 'capacity', message: 'Output cap', role: 'agent' } as const
	const completeAttempt: StudyAttempt = {
		trial: complete,
		duration: 1,
		failure: undefined,
		executed: true,
		observations: [
			{
				goal: 'goal',
				product: { value: { content: '' }, partial: true },
				failure: undefined,
				usage: [],
				duration: 1,
				executed: true,
			},
		],
	}
	const faultedAttempt: StudyAttempt = {
		trial: faulted,
		duration: 1,
		failure,
		executed: true,
		observations: [
			{ goal: 'goal', product: undefined, failure, usage: [], duration: 1, executed: true },
		],
	}
	const completeEvidence: readonly StudyEvidence[] = [
		{ event: 'summary', goal: 'other', value: 'unrelated' },
		{ event: 'arrival', goal: 'goal', value: { id: 'receipt' } },
	]
	const attempts = [completeAttempt, faultedAttempt]
	const evidence = { [complete.id]: completeEvidence, [faulted.id]: [] }

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
		for (const judgment of judgments) {
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

	it('reads each mechanism predicate with zero-based row citations and unknown for foreign assertions', () => {
		const target = {
			trial: complete,
			criterion: source,
			attempt: completeAttempt,
			evidence: completeEvidence,
		}
		expect(readStudyMemoryGrade(target)).toEqual({
			verdict: 'achieved',
			method: 'trace',
			reason: 'Retained observable mechanism evidence',
			references: [{ file: 'evidence', row: 1 }],
		})
		expect(
			readStudyMemoryGrade({
				...target,
				criterion: buildMemoryCriterion('weird', 'trace', { observation: 'unsupported' }),
			}),
		).toMatchObject({ verdict: 'unknown', references: [] })
		expect(readStudyMemoryGrade({ ...target, attempt: undefined, evidence: [] })).toMatchObject({
			verdict: 'unknown',
			references: [],
		})
		expect(readStudyMemoryGrade({ ...target, criterion: meaning })).toEqual({
			verdict: 'unknown',
			method: 'human',
			reason: 'Requires an independent blind semantic label',
			references: [],
		})
	})
})
