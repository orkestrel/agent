import { isRecord, parseJSON } from '@orkestrel/contract'
import { isStudyJudgment, parseStudyProfile, parseStudyScenario } from '@orkestrel/study'
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { createStudyAdapter } from '../../../studies/memory/index.js'
import {
	buildCustodyManifest,
	buildMemoryCriterion,
	buildMemoryGradeFixture,
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
		const smallest = parseStudyProfile(
			parseJSON(await readFile('studies/memory/profiles/recordssmallest.json', 'utf8')),
		)
		const input = await loadMemoryInputs(buildMemoryProfile({ url }), 'recordsqualification')
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
		if (!isRecord(smallest.settings)) throw new Error('Missing smallest settings')
		expect(smallest.settings.checkpoints).toEqual(declared)
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
		const progress = adapter.progress?.({ trial, goal: 'goal', evidence: [] })
		expect(progress).toEqual({})
		expect(isRecord(progress) && 'calls' in progress).toBe(false)
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
			'compactioncapacity',
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
		for (const arms of [['records'], ['records', 'full']])
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
		const records = ['records']
		const compaction = ['compaction']
		const paired = ['records', 'full']
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
				definition: { ...input.definition, arms: paired, order: [paired] },
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

	it('refuses the earlier both-strategy memory declaration before its profile and admits records beside full', async () => {
		const adapter = createStudyAdapter()
		// The gauge admits compaction, so the strategy check is the only refusal the control can meet.
		const input = await loadMemoryInputs(
			buildMemoryProfile({ url: 'http://127.0.0.1:7', settings: STUDY_MEMORY_SETTINGS }),
			'recordsmemory',
		)
		expect(input.definition.arms).toEqual(['records', 'full'])
		expect(() => adapter.validate(input)).not.toThrow()
		// The earlier `memory` declaration, inline, as the control.
		const memory = {
			name: 'memory',
			version: '1',
			question:
				'How do records, compaction and full conversation preserve corrections and unresolved obligations across the same prospective desk trajectory?',
			purpose: 'quality',
			driver: 'memory',
			arms: ['records', 'compaction', 'full'],
			scenarios: ['handoff'],
			order: [
				['records', 'compaction', 'full'],
				['full', 'compaction', 'records'],
			],
			retries: 0,
			rubric: 'rubric.json',
		} as const
		expect(() => adapter.validate({ ...input, definition: memory })).toThrow(
			expect.objectContaining({
				code: 'CONFIG',
				message:
					'Memory declaration "memory" lists both strategies in arms ["records","compaction"]; list one of records or compaction, with full as the only other arm, and run the other strategy as its own study',
			}),
		)
		expect(() =>
			adapter.validate({
				...input,
				definition: { ...input.definition, arms: ['full'], order: [['full']] },
			}),
		).toThrow(
			expect.objectContaining({
				code: 'CONFIG',
				message:
					'Memory declaration "recordsmemory" lists neither strategy in its arms; list one of records or compaction, with full as the only other arm',
			}),
		)
	})

	it('requires quality qualification and refuses semantic capacity assertions offline', () => {
		const adapter = createStudyAdapter()
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		const definition = {
			name: 'test',
			version: '1',
			question: 'mechanisms',
			purpose: 'capacity',
			driver: 'memory',
			arms: ['records', 'full'],
			scenarios: ['desk'],
			order: [['records', 'full']],
			retries: 0,
			rubric: 'rubric.json',
		} as const
		expect(() =>
			adapter.validate({
				definition,
				scenarios: [],
				rubric: { version: '1', criteria: [] },
				profile,
			}),
		).not.toThrow()
		expect(() =>
			adapter.validate({
				definition: { ...definition, purpose: 'quality' },
				scenarios: [],
				rubric: { version: '1', criteria: [] },
				profile: { ...profile, qualification: undefined },
			}),
		).toThrow('qualification')
		expect(() =>
			adapter.validate({
				definition,
				scenarios: [],
				rubric: {
					version: '1',
					criteria: [
						{
							id: 'meaning',
							scenario: 'desk',
							goal: 'goal',
							method: 'semantic',
							critical: true,
							assertion: 'correct',
						},
					],
				},
				profile,
			}),
		).toThrow('operational')
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
	} = buildMemoryGradeFixture()

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
