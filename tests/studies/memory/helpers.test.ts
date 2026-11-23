import type { Message } from '@orkestrel/agent'
import type { StudyMemoryProvenance } from '../../../studies/memory/index.js'
import { describe, expect, it } from 'vitest'
import {
	buildStudyMemoryOrigins,
	buildStudyMemoryJudgeModel,
	buildStudyMemoryTriage,
	filterStudyMemoryResult,
	buildStudyMemoryRoles,
	buildStudyMemorySummary,
	collectStudyMemoryCases,
	computeStudyMemoryCacheShares,
	computeStudyMemoryCarriage,
	computeStudyMemoryReacquisition,
	computeStudyMemoryShare,
	filterStudyMemoryRecords,
	inferStudyMemoryCase,
	readStudyMemoryGrade,
	readStudyMemoryJudge,
	readStudyMemoryProgress,
	readStudyMemoryProvenance,
	STUDY_MEMORY_ABSTENTION,
	STUDY_MEMORY_LEDGER_REPEAT,
	STUDY_MEMORY_LOOKUPS,
	renderStudyMemoryRecord,
	renderStudyMemoryStatement,
	inferStudyMemoryRequestCase,
	resolveStudyMemoryObservation,
	validateStudyMemoryProfile,
} from '../../../studies/memory/index.js'
import {
	buildMemoryCriterion,
	buildMemoryGradeFixture,
	buildMemoryProfile,
	buildMemoryRecordProfile,
	MEMORY_ABSTENTION_REPLIES,
	MEMORY_CARRIAGE,
	MEMORY_DESK_CHOICES,
	MEMORY_DESK_OPENING,
	MEMORY_DESK_RECORDS,
	MEMORY_DESK_REGISTER,
	MEMORY_DESK_UNMATCHED,
	MEMORY_TRIAGE_POLICIES,
	MEMORY_TRIAGE_REQUEST,
	MEMORY_TRIAGE_FIRST,
	MEMORY_TRIAGE_SECOND,
	MEMORY_EVIDENCE,
	MEMORY_LITERALS,
	MEMORY_WIRE_ROWS,
	omitMemoryAuxiliaries,
	readMemoryOrigins,
	STUDY_MEMORY_MALFORMED_SETTINGS,
	STUDY_MEMORY_MODULES,
	STUDY_MEMORY_RECORD,
	STUDY_MEMORY_PARAMETER_PINS,
} from '../../setupStudy.js'

describe('memory declaration and mechanical evidence', () => {
	it('declares triage only for records and reserves the profile request ceiling', () => {
		const profile = buildMemoryProfile({
			url: 'http://127.0.0.1:1',
			triage: { model: 'tev1', digest: 'c'.repeat(64) },
		})
		expect(buildStudyMemoryRoles(profile, 'records').triage).toEqual({
			model: 'tev1',
			tokens: 32640,
		})
		expect(buildStudyMemoryRoles(profile, 'full').triage).toBeUndefined()
		const provider = profile.provider
		if (provider === undefined) throw new Error('Missing provider')
		const { triage, ...untriaged } = provider
		expect(triage).toBe('tev1')
		for (const broken of [
			untriaged,
			{ ...provider, digest: { model: provider.digest.model, judge: provider.digest.judge } },
		]) {
			expect(() =>
				validateStudyMemoryProfile({ ...profile, provider: broken }, ['records']),
			).toThrow('Memory provider declaration is invalid')
			expect(() => buildStudyMemoryRoles({ ...profile, provider: broken }, 'records')).toThrow(
				'Memory triage requires a model and digest together',
			)
		}
	})
	it('keys the triage identity by every policy member in canonical order', () => {
		const models = MEMORY_TRIAGE_POLICIES.map((policy) =>
			buildStudyMemoryJudgeModel(policy, 'first', 'second'),
		)
		expect(new Set(models).size).toBe(MEMORY_TRIAGE_POLICIES.length)
		const policy = MEMORY_TRIAGE_POLICIES[0]
		if (policy === undefined) throw new Error('Missing policy')
		expect(
			buildStudyMemoryJudgeModel(
				{ referrals: policy.referrals, probability: policy.probability, version: policy.version },
				'first',
				'second',
			),
		).toBe(models[0])
	})
	it('decisions the raw cutoff and filters conflicting or unrequested outcomes directly', () => {
		const edge = MEMORY_TRIAGE_REQUEST.questions.edge
		if (edge === undefined) throw new Error('Missing edge')
		expect(buildStudyMemoryTriage('edge', edge, MEMORY_TRIAGE_FIRST, false)).toEqual({
			id: 'edge',
			outcome: 'kept',
			winner: 'fact',
			probability: 0.65,
		})
		expect(filterStudyMemoryResult(MEMORY_TRIAGE_SECOND, ['edge', 'correction'])).toEqual({
			model: 'second',
			answers: { edge: MEMORY_TRIAGE_SECOND.answers.edge },
			refusals: { correction: { missing: ['fact'] } },
			usage: MEMORY_TRIAGE_SECOND.usage,
		})
	})
	it('validates finite room, actual digest syntax and exact uncredentialed origin', () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		const every = ['records', 'full'] as const
		expect(() => validateStudyMemoryProfile(profile, every)).not.toThrow()
		expect(() =>
			validateStudyMemoryProfile(
				{ ...profile, room: { ...profile.room, safety: profile.room.context } },
				every,
			),
		).toThrow('Memory room declaration is invalid')
		expect(() => validateStudyMemoryProfile({ ...profile, provider: undefined }, every)).toThrow(
			'Memory provider declaration is invalid',
		)
		const provider = profile.provider
		if (provider === undefined) throw new Error('Missing fixture provider')
		expect(() =>
			validateStudyMemoryProfile(
				{
					...profile,
					provider: { ...provider, digest: { model: 'unknown', judge: provider.digest.judge } },
				},
				every,
			),
		).toThrow('Memory provider declaration is invalid')
		expect(() =>
			validateStudyMemoryProfile(
				{
					...profile,
					provider: { ...provider, digest: { model: provider.digest.model, judge: 'unknown' } },
				},
				every,
			),
		).toThrow('Memory provider declaration is invalid')
		expect(() =>
			validateStudyMemoryProfile(
				{ ...profile, provider: { ...provider, url: 'http://user:password@127.0.0.1:7' } },
				every,
			),
		).toThrow('Memory provider declaration is invalid')
	})

	it('requires a judge only for the records arm', () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		const provider = profile.provider
		if (provider === undefined) throw new Error('Missing fixture provider')
		const bare = omitMemoryAuxiliaries(profile)
		expect(() => validateStudyMemoryProfile(bare, [])).not.toThrow()
		expect(() => validateStudyMemoryProfile(bare, ['full'])).not.toThrow()
		expect(() => validateStudyMemoryProfile(bare, ['records'])).toThrow('judge model and digest')
		expect(() => validateStudyMemoryProfile(bare, ['records', 'full'])).toThrow(
			'judge model and digest',
		)
		// Declaring the judge is enough for the arm that uses it.
		expect(() => validateStudyMemoryProfile({ ...bare, provider }, ['records'])).not.toThrow()
		// A declared room member is validated whichever arm is selected.
		expect(() =>
			validateStudyMemoryProfile({ ...bare, room: { ...bare.room, output: 0 } }, ['full']),
		).toThrow('Memory room declaration is invalid')
		expect(() =>
			validateStudyMemoryProfile(
				{
					...bare,
					provider: { ...provider, digest: { model: provider.digest.model, judge: 'unknown' } },
				},
				['full'],
			),
		).toThrow('Memory provider declaration is invalid')
	})

	it('admits absent or valid profile settings and refuses malformed ones, a gauge included', () => {
		const url = 'http://127.0.0.1:7'
		for (const settings of [undefined, {}, { observe: true }])
			expect(() =>
				validateStudyMemoryProfile(buildMemoryProfile({ url, settings }), ['records', 'full']),
			).not.toThrow()
		for (const settings of [
			{ extra: 1 },
			{ gauge: { scale: 1, overhead: 0 } },
			{ checkpoints: ['a'] },
		])
			expect(() =>
				validateStudyMemoryProfile(buildMemoryProfile({ url, settings }), ['records', 'full']),
			).toThrow('settings')
	})

	it('reads the judge only where one is declared', () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		const bare = omitMemoryAuxiliaries(profile)
		const declared = profile.provider
		const undeclared = bare.provider
		if (declared === undefined || undeclared === undefined)
			throw new Error('Missing fixture provider')
		expect(readStudyMemoryJudge(declared)).toBe('judge')
		expect(() => readStudyMemoryJudge(undeclared)).toThrow(
			expect.objectContaining({ code: 'CONFIG', message: expect.stringContaining('judge') }),
		)
	})

	it('reads observation switches only from well-formed settings and refuses malformed ones', () => {
		expect(resolveStudyMemoryObservation(undefined)).toEqual({
			observe: false,
			checkpoints: new Set(),
		})
		for (const settings of [{}, { observe: false }])
			expect(resolveStudyMemoryObservation(settings)).toEqual({
				observe: false,
				checkpoints: new Set(),
			})
		expect(resolveStudyMemoryObservation({ observe: true })).toEqual({
			observe: true,
			checkpoints: new Set(),
		})
		expect(
			resolveStudyMemoryObservation({
				observe: true,
				checkpoints: ['a', 'b'],
			}),
		).toEqual({ observe: true, checkpoints: new Set(['a', 'b']) })
		for (const settings of [
			...STUDY_MEMORY_MALFORMED_SETTINGS.map((entry) => entry.settings),
			null,
			[],
			'observe',
		])
			expect(() => resolveStudyMemoryObservation(settings)).toThrow(
				expect.objectContaining({ code: 'CONFIG', message: expect.stringContaining('settings') }),
			)
	})

	it('declares the exact wire policy of each role an arm dispatches and no other role', () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		const agent = {
			model: 'model',
			options: { num_ctx: 32768, num_predict: 512, ...STUDY_MEMORY_PARAMETER_PINS.agent },
			think: false,
			strict: false,
			length: true,
		}
		expect(buildStudyMemoryRoles(profile, 'full')).toEqual({ agent })
		// Records alone declares the one-token judge, which sends no strict fields.
		expect(buildStudyMemoryRoles(profile, 'records')).toEqual({
			agent,
			judge: {
				model: 'judge',
				options: { num_ctx: 32768, num_predict: 1, ...STUDY_MEMORY_PARAMETER_PINS.judge },
				think: false,
				strict: false,
				length: true,
			},
		})
		const thinking = buildMemoryProfile({
			url: 'http://127.0.0.1:7',
			room: { think: true, context: 4096, output: 64 },
		})
		expect(buildStudyMemoryRoles(thinking, 'full').agent).toMatchObject({
			think: true,
			options: { num_ctx: 4096, num_predict: 64 },
		})
		const bare = omitMemoryAuxiliaries(profile)
		expect(buildStudyMemoryRoles(bare, 'full')).toEqual({ agent })
		expect(() => buildStudyMemoryRoles(bare, 'records')).toThrow('judge')
		expect(() => buildStudyMemoryRoles({ ...profile, provider: undefined }, 'full')).toThrow(
			expect.objectContaining({ code: 'CONFIG' }),
		)
	})

	it('places only the records judge and preserves serialized options without placement', () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		const placed = { ...profile, settings: { judge: { gpu: 0 } } }
		expect(buildStudyMemoryRoles(placed, 'full')).toEqual(buildStudyMemoryRoles(profile, 'full'))
		expect(buildStudyMemoryRoles(placed, 'full').judge).toBeUndefined()
		const original = buildStudyMemoryRoles(profile, 'records')
		const roles = buildStudyMemoryRoles(placed, 'records')
		expect(roles.agent).toEqual(original.agent)
		expect(roles.judge?.options).toEqual({
			num_ctx: 32768,
			num_predict: 1,
			num_gpu: 0,
			...STUDY_MEMORY_PARAMETER_PINS.judge,
		})
		expect(JSON.stringify(original.judge?.options)).toBe(
			JSON.stringify({ num_ctx: 32768, num_predict: 1, ...STUDY_MEMORY_PARAMETER_PINS.judge }),
		)
	})

	it('every role sends every pinned sampling key', () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		const budgets = { agent: 512, judge: 1 }
		const sent = (['full', 'records'] as const).flatMap((arm) => {
			const roles = buildStudyMemoryRoles(profile, arm)
			return (['agent', 'judge'] as const).flatMap((role) => {
				const options = roles[role]?.options
				return options === undefined ? [] : [{ arm, role, options }]
			})
		})
		expect(sent.map((entry) => [entry.arm, entry.role])).toEqual([
			['full', 'agent'],
			['records', 'agent'],
			['records', 'judge'],
		])
		for (const { role, options } of sent)
			expect(options).toEqual({
				num_ctx: 32768,
				num_predict: budgets[role],
				...STUDY_MEMORY_PARAMETER_PINS[role],
			})
	})

	it('refuses a recording profile with no metadata', () => {
		const profile = buildMemoryRecordProfile('http://127.0.0.1:7')
		const refusal = expect.objectContaining({
			code: 'CONFIG',
			message: 'Memory recording requires declared metadata',
		})
		for (const settings of [undefined, {}])
			expect(() => validateStudyMemoryProfile({ ...profile, settings }, [])).toThrow(refusal)
		expect(() =>
			validateStudyMemoryProfile({ ...profile, settings: STUDY_MEMORY_RECORD.settings }, []),
		).not.toThrow()
	})

	it('joins message origins from session state only, in priority order, leaving the rest unknown', () => {
		const source = {
			explicit: new Map<string, StudyMemoryProvenance>([
				['in', { origin: 'input', source: 'opening' }],
				['ar', { origin: 'arrival', source: 'source-1' }],
				['ti', { origin: 'instructions', source: 'triage' }],
			]),
			members: new Set(['in', 'kept', 'tool', 'rules']),
			composed: false,
		}
		const composed = { ...source, composed: true }
		const cases: ReadonlyArray<
			readonly [string, Message, StudyMemoryProvenance, StudyMemoryProvenance]
		> = [
			[
				'explicit input',
				{ id: 'in', role: 'user', content: 'x' },
				{ origin: 'input', source: 'opening' },
				{ origin: 'input', source: 'opening' },
			],
			[
				'explicit arrival',
				{ id: 'ar', role: 'user', content: 'x' },
				{ origin: 'arrival', source: 'source-1' },
				{ origin: 'arrival', source: 'source-1' },
			],
			[
				'explicit instruction beats system role',
				{ id: 'ti', role: 'system', content: 'x' },
				{ origin: 'instructions', source: 'triage' },
				{ origin: 'instructions', source: 'triage' },
			],
			[
				'tool by role beats membership',
				{ id: 'tool', role: 'tool', content: 'x' },
				{ origin: 'tool' },
				{ origin: 'tool' },
			],
			[
				'system without a composer',
				{ id: 'rules', role: 'system', content: 'x' },
				{ origin: 'instructions', source: 'desk' },
				{ origin: 'mixed' },
			],
			[
				'stored message',
				{ id: 'kept', role: 'assistant', content: 'x' },
				{ origin: 'history' },
				{ origin: 'history' },
			],
			[
				'unjoined message',
				{ id: 'orphan', role: 'user', content: 'x' },
				{ origin: 'unknown' },
				{ origin: 'unknown' },
			],
		]
		for (const [label, message, plain, mixed] of cases) {
			expect([label, readStudyMemoryProvenance(message, source)]).toEqual([label, plain])
			expect([label, readStudyMemoryProvenance(message, composed)]).toEqual([label, mixed])
		}
		// Content and position never decide an origin: identical text under another id is unknown.
		expect(
			readStudyMemoryProvenance(
				{ id: 'other', role: 'user', content: '[Source source-1] x' },
				source,
			),
		).toEqual({ origin: 'unknown' })
	})

	it('builds JSON origin annotations aligned one to one with the messages, duplicates kept', () => {
		const source = {
			explicit: new Map<string, StudyMemoryProvenance>([
				['d', { origin: 'arrival', source: 'source-1' }],
			]),
			members: new Set(['x']),
			composed: false,
		}
		const messages: readonly Message[] = [
			{ id: 'd', role: 'user', content: 'a' },
			{ id: 'x', role: 'assistant', content: 'b' },
			{ id: 'd', role: 'user', content: 'a' },
			{ id: 'n', role: 'tool', content: 'c' },
		]
		expect(buildStudyMemoryOrigins(messages, source)).toEqual([
			{ origin: 'arrival', source: 'source-1' },
			{ origin: 'history' },
			{ origin: 'arrival', source: 'source-1' },
			{ origin: 'tool' },
		])
		expect(buildStudyMemoryOrigins([], source)).toEqual([])
		expect(
			readMemoryOrigins(buildStudyMemoryOrigins(messages, source)).map((entry) => entry.source),
		).toEqual(['source-1', undefined, 'source-1', undefined])
	})
})

describe('memory mechanical grading over the shared traversal', () => {
	it('reads each mechanism predicate with zero-based row citations and unknown for foreign assertions', () => {
		const { complete, source, meaning } = buildMemoryGradeFixture()
		const target = {
			trial: complete.trial,
			criterion: source,
			attempt: complete.attempt,
			evidence: complete.evidence,
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

function literals(text: string): ReadonlySet<string> {
	return MEMORY_LITERALS.get(text) ?? new Set()
}

describe('memory measurement instruments', () => {
	it('pins the ledger repeat reason', () => {
		expect(STUDY_MEMORY_LEDGER_REPEAT).toBe(STUDY_MEMORY_MODULES.agent.LEDGER_NOTES.repeat)
	})

	it('reads carriage over the product ids and fails the seed-only control', () => {
		const { product, carried, seed } = MEMORY_CARRIAGE
		expect(computeStudyMemoryCarriage({ product, prompt: carried, literals })).toEqual({
			found: 2,
			total: 2,
		})
		expect(computeStudyMemoryCarriage({ product, prompt: seed, literals })).toEqual({
			found: 0,
			total: 2,
		})
	})

	it('reads the cache share per agent wire row and never reports an unread count as zero', () => {
		expect(computeStudyMemoryCacheShares(MEMORY_WIRE_ROWS.stable, 'agent')).toEqual([0.9, 0.9])
		expect(computeStudyMemoryCacheShares(MEMORY_WIRE_ROWS.changed, 'agent')).toEqual([0])
		expect(computeStudyMemoryCacheShares(MEMORY_WIRE_ROWS.judge, 'agent')).toEqual([])
		expect(computeStudyMemoryCacheShares(MEMORY_WIRE_ROWS.absent, 'agent')).toEqual([
			undefined,
			undefined,
			undefined,
			undefined,
		])
	})

	it('counts lookups per goal and reads zero for a goal that holds none', () => {
		const counts = computeStudyMemoryReacquisition(MEMORY_EVIDENCE, STUDY_MEMORY_LOOKUPS)
		expect(counts.get('g1')).toBe(2)
		expect(counts.get('g2')).toBe(0)
		expect([...counts.keys()]).toEqual(['g1', 'g2'])
	})

	it('summarizes lookups, abstention, and arrival for every scheduled goal and sums each arm', () => {
		const scenarios = [
			{
				id: 's',
				goals: [
					{ id: 'g1', input: {} },
					{ id: 'g2', input: {} },
					{ id: 'g3', input: {} },
				],
			},
		]
		const schedule = [
			{ id: 't1', scenario: 's', arm: 'records', repetition: 1 },
			{ id: 't2', scenario: 's', arm: 'full', repetition: 1 },
		]
		const [refusal] = MEMORY_ABSTENTION_REPLIES.abstained
		if (refusal === undefined) throw new Error('The fixture needs a refusal')
		const summary = buildStudyMemorySummary({
			schedule,
			scenarios,
			evidence: new Map([
				['t1', MEMORY_EVIDENCE],
				[
					't2',
					[
						{ event: 'lookup', goal: 'g2', value: { id: 'x', found: false } },
						{ event: 'result', goal: 'g3', value: { content: refusal, partial: false } },
					],
				],
			]),
		})
		const none = { found: 0, missing: 0 }
		expect(summary.goals).toEqual([
			{
				trial: 't1',
				arm: 'records',
				goal: 'g1',
				lookups: { found: 1, missing: 1 },
				abstained: false,
				arrival: true,
			},
			{ trial: 't1', arm: 'records', goal: 'g2', lookups: none, abstained: false, arrival: true },
			{ trial: 't1', arm: 'records', goal: 'g3', lookups: none, abstained: false, arrival: false },
			{ trial: 't2', arm: 'full', goal: 'g1', lookups: none, abstained: false, arrival: false },
			{
				trial: 't2',
				arm: 'full',
				goal: 'g2',
				lookups: { found: 0, missing: 1 },
				abstained: false,
				arrival: false,
			},
			{ trial: 't2', arm: 'full', goal: 'g3', lookups: none, abstained: true, arrival: false },
		])
		expect(summary.arms).toEqual({
			records: { found: 1, missing: 1 },
			full: { found: 0, missing: 1 },
		})
		expect(summary.abstained).toEqual({ records: 0, full: 1 })
		expect(() =>
			buildStudyMemorySummary({
				schedule: [{ id: 't1', scenario: 'absent', arm: 'records', repetition: 1 }],
				scenarios,
				evidence: new Map(),
			}),
		).toThrow(/absent/)
	})

	it('flags each validated refusal opening and no refusal that follows the start of an answer', () => {
		for (const reply of MEMORY_ABSTENTION_REPLIES.abstained)
			expect([reply, STUDY_MEMORY_ABSTENTION.test(reply)]).toEqual([reply, true])
		for (const reply of MEMORY_ABSTENTION_REPLIES.attempted)
			expect([reply, STUDY_MEMORY_ABSTENTION.test(reply)]).toEqual([reply, false])
	})

	it('reads an empty reply as empty and not abstained, and a refusal as abstained and not empty', () => {
		const [refusal] = MEMORY_ABSTENTION_REPLIES.abstained
		if (refusal === undefined) throw new Error('The fixture needs a refusal')
		expect(
			readStudyMemoryProgress([
				{ event: 'result', goal: 'g', value: { content: ' \n', partial: false } },
			]),
		).toEqual({ partial: false, empty: true, abstained: false })
		expect(
			readStudyMemoryProgress([
				{ event: 'result', goal: 'g', value: { content: refusal, partial: false } },
			]),
		).toEqual({ partial: false, empty: false, abstained: true })
		// A product with no text holds neither cell.
		expect(
			readStudyMemoryProgress([{ event: 'result', goal: 'g', value: { partial: false } }]),
		).toEqual({ partial: false })
	})

	it('collects whole, case-sensitive case ids and infers a case only from exactly one', () => {
		expect([
			...collectStudyMemoryCases('BC-7301, then BC-7301 and BC-7312 (BC-7313, BC-7300)'),
		]).toEqual(['BC-7301', 'BC-7312'])
		for (const text of MEMORY_DESK_UNMATCHED)
			expect({ text, cases: [...collectStudyMemoryCases(text)] }).toEqual({ text, cases: [] })
		expect([...collectStudyMemoryCases('order:BC-7302\nBC-7302.')]).toEqual(['BC-7302'])
		expect(inferStudyMemoryCase('[Source ev-01-2] BC-7301 filter arrived cracked.')).toBe('BC-7301')
		expect(inferStudyMemoryCase('BC-7301 again: BC-7301')).toBe('BC-7301')
		expect(inferStudyMemoryCase(MEMORY_DESK_OPENING.content)).toBeUndefined()
		expect(inferStudyMemoryCase(MEMORY_DESK_REGISTER.content)).toBeUndefined()
		expect(inferStudyMemoryCase('The filter arrived cracked.')).toBeUndefined()
		// The pattern is global, so a read must not carry its position into the next.
		expect(inferStudyMemoryCase('BC-7305')).toBe('BC-7305')
		expect(inferStudyMemoryCase('BC-7305')).toBe('BC-7305')
	})

	it('renders a statement in the source form the conversation uses', () => {
		expect(renderStudyMemoryStatement('ev-01-2', 'BC-7301 filter arrived cracked.')).toBe(
			'[Source ev-01-2] BC-7301 filter arrived cracked.',
		)
		expect(renderStudyMemoryStatement('ev', '')).toBe('[Source ev] ')
	})

	it('chooses the case of the last arrival that files, else the one case the request names, else none', () => {
		for (const [arrivals, prompt, expected] of MEMORY_DESK_CHOICES)
			expect({
				prompt,
				owner: inferStudyMemoryRequestCase({ prompt, arrivals, records: [] }),
			}).toEqual({ prompt, owner: expected })
	})

	it('selects a case record from every released record whose id and content carry only that case, in release order', () => {
		expect(
			filterStudyMemoryRecords('BC-7301', MEMORY_DESK_RECORDS).map((record) => record.id),
		).toEqual(['order:BC-7301', 'customer:BC-4101'])
		expect(
			filterStudyMemoryRecords('BC-7302', MEMORY_DESK_RECORDS).map((record) => record.id),
		).toEqual(['order:BC-7302'])
		expect(filterStudyMemoryRecords('BC-7303', MEMORY_DESK_RECORDS)).toEqual([])
		// A released map's values are read in the order the map holds them.
		const released = new Map(
			[...MEMORY_DESK_RECORDS].reverse().map((record) => [record.id, record] as const),
		)
		expect(
			filterStudyMemoryRecords('BC-7301', released.values()).map((record) => record.id),
		).toEqual(['customer:BC-4101', 'order:BC-7301'])
		// The record's name is not read: only its id and content place it.
		expect(
			filterStudyMemoryRecords('BC-7301', [{ id: 'note', name: 'BC-7302', content: 'BC-7301' }]),
		).toHaveLength(1)
	})

	it('renders a case record: the label, the case records, then the statements oldest first', () => {
		expect(
			renderStudyMemoryRecord('BC-7301', MEMORY_DESK_RECORDS, [
				{ id: 'ev-01-2', content: 'BC-7301 filter arrived cracked.' },
				{ id: 'ev-01-3', content: 'BC-7301 refund is approved.' },
			]),
		).toBe(
			'Case record for BC-7301:\n\norder:BC-7301: Mara Ellison\nOrder BC-7301; ceramic filter breakage.\n\ncustomer:BC-4101: Mara Ellison\nAccount BC-4101; owner Mara Ellison; order BC-7301.\n\n[Source ev-01-2] BC-7301 filter arrived cracked.\n\n[Source ev-01-3] BC-7301 refund is approved.',
		)
		expect(renderStudyMemoryRecord('BC-7303', MEMORY_DESK_RECORDS, [])).toBe(
			'Case record for BC-7303:',
		)
		expect(
			renderStudyMemoryRecord('BC-7302', [], [{ id: 'ev-02-1', content: 'BC-7302 is late.' }]),
		).toBe('Case record for BC-7302:\n\n[Source ev-02-1] BC-7302 is late.')
	})

	it('derives a share from a tally and reads undefined for an empty population', () => {
		expect(computeStudyMemoryShare({ found: 1, total: 4 })).toBe(0.25)
		expect(computeStudyMemoryShare({ found: 0, total: 0 })).toBeUndefined()
	})
})
