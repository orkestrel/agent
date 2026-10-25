import type { LedgerResult, Message } from '@orkestrel/agent'
import type { StudyMemoryProvenance } from '../../../studies/memory/index.js'
import { describe, expect, it } from 'vitest'
import {
	buildStudyMemoryOrigins,
	buildStudyMemoryReceipts,
	buildStudyMemoryEvidence,
	buildStudyMemoryResult,
	readStudyMemoryMembers,
	classifyStudyMemorySelection,
	isStudyMemoryReceipt,
	isStudyMemoryResult,
	STUDY_MEMORY_ROW_BYTES,
	STUDY_MEMORY_WORKLOAD_BYTES,
	buildStudyMemoryRoles,
	readStudyMemoryCompaction,
	readStudyMemoryGrade,
	readStudyMemoryGauge,
	readStudyMemoryJudge,
	readStudyMemoryProvenance,
	readStudyMemoryRecap,
	resolveStudyMemoryObservation,
	validateStudyMemoryProfile,
} from '../../../studies/memory/index.js'
import {
	buildMemoryCriterion,
	buildMemorySelectionResult,
	buildMemoryClassificationReceipt,
	STUDY_MEMORY_SELECTION_REQUIREMENTS,
	STUDY_MEMORY_SELECTION_ARRIVALS,
	STUDY_MEMORY_SELECTION_MESSAGES,
	buildMemoryGradingFixture,
	buildMemoryProfile,
	omitMemoryAuxiliaries,
	readMemoryOrigins,
	STUDY_MEMORY_MALFORMED_SETTINGS,
	STUDY_MEMORY_SETTINGS,
} from '../../setupStudy.js'

describe('memory declaration and mechanical evidence', () => {
	it('C7 owns public foreign result members and excludes unknown bodies before validation', () => {
		const result = buildMemorySelectionResult()
		const inherited: unknown = Object.create({ ...result, unused: () => 'body' })
		expect(buildStudyMemoryResult(inherited)).toEqual({
			request: result.request,
			receipts: result.receipts,
			passes: [{}],
		})
		const tail = ['arrival-1']
		const adopted = result.receipts[0]?.selections[0]
		if (adopted === undefined) throw new Error('Missing inert adoption')
		const rows = buildStudyMemoryReceipts(
			{
				...result,
				receipts: [
					{ calls: [], selections: [{ ...adopted, tail, prior: [], body: () => 'not evidence' }] },
				],
			},
			STUDY_MEMORY_SELECTION_ARRIVALS,
			{ sections: [], messages: STUDY_MEMORY_SELECTION_MESSAGES },
		)
		tail.push('later')
		expect(rows[0]?.receipt.selections[0]?.tail).toEqual(['arrival-1'])
		expect(JSON.stringify(rows)).not.toContain('body')
		expect(readStudyMemoryMembers({ id: 'member', unknown: 'excluded' }, ['id'])).toEqual({
			id: 'member',
		})
		expect(() => readStudyMemoryMembers(undefined, ['id'])).toThrow('container')
		expect(() => buildStudyMemoryResult({ ...result, receipts: [] })).toThrow('Malformed')
	})
	it('C9 accepts foreign receipt numbers without integer narrowing', () => {
		const receipt = {
			selections: [
				{
					turn: 0.5,
					tail: [],
					prior: [],
					plan: {
						owners: [],
						filed: [],
						rendered: [],
						sentences: [{ source: 'source', sentence: 0.5 }],
						omitted: [],
						trims: 0.5,
						amendments: [],
					},
					sources: [],
				},
			],
			calls: [{ selection: 0.5, estimate: 1, tools: 0 }],
			extra: 'foreign member',
		}
		const result: LedgerResult = { ...buildMemorySelectionResult(), receipts: [receipt] }
		expect
			.soft(isStudyMemoryResult(result), 'foreign members retain their published types')
			.toBe(true)
		const rows = buildStudyMemoryReceipts(result, [], {
			sections: [],
			messages: STUDY_MEMORY_SELECTION_MESSAGES,
		})
		expect(rows).toHaveLength(1)
		expect(rows[0]).toMatchObject({
			pass: 0,
			receipt: {
				selections: [
					{
						turn: 0.5,
						plan: { trims: 0.5, sentences: [{ source: 'source', sentence: 0.5 }] },
					},
				],
				calls: [{ selection: 0.5 }],
			},
		})
		expect(rows[0]?.receipt).not.toHaveProperty('extra')
	})
	it('C7 validates selection schema, refuses corrupted joins and fails the full row bound', () => {
		const row = buildStudyMemoryReceipts(
			buildMemorySelectionResult(),
			STUDY_MEMORY_SELECTION_ARRIVALS,
			{ sections: [{ id: 'section-old' }], messages: STUDY_MEMORY_SELECTION_MESSAGES },
		)[0]
		if (row === undefined) throw new Error('Missing fixture row')
		expect(isStudyMemoryReceipt(row)).toBe(true)
		expect(row.messages).toEqual(STUDY_MEMORY_SELECTION_MESSAGES)
		expect(isStudyMemoryReceipt({ ...row, messages: [...row.messages, row.request] })).toBe(false)
		expect(
			isStudyMemoryReceipt({ ...row, messages: row.messages.filter((id) => id !== row.request) }),
		).toBe(false)
		expect(
			isStudyMemoryReceipt({ ...row, arrivals: [{ id: 'bad', message: 'not-in-tail' }] }),
		).toBe(false)
		expect(isStudyMemoryReceipt({ ...row, recaps: ['not-in-tail'] })).toBe(false)
		expect(
			isStudyMemoryReceipt({
				...row,
				receipt: { ...row.receipt, calls: [{ selection: 9, estimate: 1, tools: 0 }] },
			}),
		).toBe(false)
		const evidence = buildStudyMemoryEvidence('goal', row)
		expect(evidence).not.toHaveProperty('stop')
		expect(JSON.stringify(evidence)).not.toContain('null')
		expect(STUDY_MEMORY_ROW_BYTES).toBe(262144)
		expect(STUDY_MEMORY_WORKLOAD_BYTES).toBe(50331648)
		expect(() => buildStudyMemoryEvidence('é'.repeat(STUDY_MEMORY_ROW_BYTES), row)).toThrow(
			'selection row exceeds',
		)
		for (const malformed of [
			undefined,
			null,
			{},
			{ ...row, stop: null },
			{ ...row, receipt: { selections: [], calls: [{}] } },
			{ ...row, body: 'forbidden' },
			{ ...row, receipt: { ...row.receipt, body: 'forbidden' } },
			Proxy.revocable({}, {}).proxy,
		]) {
			expect(isStudyMemoryReceipt(malformed)).toBe(false)
		}
	})

	it('C7 classifies declared sources with denominators and independent product readings', () => {
		const receipt = buildMemoryClassificationReceipt()
		const required = STUDY_MEMORY_SELECTION_REQUIREMENTS
		const selection = [{ event: 'selection', goal: 'goal', value: receipt }]
		expect(
			classifyStudyMemorySelection(selection, { goal: 'goal', sources: required, product: false }),
		).toEqual({
			unfiled: { count: 1, denominator: 4 },
			unselected: { count: 1, denominator: 4 },
			incorrect: { count: 1, denominator: 4 },
			ignored: { count: 1, denominator: 4 },
		})
		const clean = {
			goal: 'goal',
			sources: [{ source: 'clean', owner: 'owner', sentences: [0] }],
			product: true,
		}
		expect(classifyStudyMemorySelection(selection, clean)).toEqual({
			unfiled: { count: 0, denominator: 1 },
			unselected: { count: 0, denominator: 1 },
			incorrect: { count: 0, denominator: 1 },
			ignored: { count: 0, denominator: 1 },
		})
		expect(
			classifyStudyMemorySelection(selection, { ...clean, product: undefined }).ignored,
		).toBeUndefined()
		expect(
			classifyStudyMemorySelection(selection, {
				...clean,
				sources: [{ source: 'clean', owner: 'other', sentences: [0] }],
			}).incorrect.count,
		).toBe(1)
		expect(() => classifyStudyMemorySelection(selection, undefined)).toThrow('denominator')
		expect(() => classifyStudyMemorySelection(selection, { goal: 'goal' })).toThrow('denominator')
		expect(() => classifyStudyMemorySelection(selection, { ...clean, sources: [] })).toThrow(
			'denominator',
		)
		expect(() => classifyStudyMemorySelection([], clean)).toThrow('selection evidence')
		const fallback = buildStudyMemoryReceipts(buildMemorySelectionResult(), [], {
			sections: [],
			messages: STUDY_MEMORY_SELECTION_MESSAGES,
		})
		expect(() =>
			classifyStudyMemorySelection(
				fallback.map((value) => ({ event: 'selection', goal: 'goal', value })),
				clean,
			),
		).toThrow('filing evidence')
		expect(() =>
			classifyStudyMemorySelection(
				[
					{
						...selection[0],
						event: 'selection',
						goal: 'goal',
						value: { ...receipt, arrivals: [{ id: 'corrupt', message: 'foreign' }] },
					},
				],
				clean,
			),
		).toThrow('Malformed selection')
	})
	it('C4 joins arrivals and recaps only by tail identity, never prior request or text', () => {
		const result = buildMemorySelectionResult()
		const rows = buildStudyMemoryReceipts(result, STUDY_MEMORY_SELECTION_ARRIVALS, {
			sections: [{ id: 'section-old' }, { id: 'section-new' }],
			messages: STUDY_MEMORY_SELECTION_MESSAGES,
		})
		expect(rows).toHaveLength(1)
		expect(rows[0]?.arrivals).toEqual([{ id: 'first', message: 'arrival-1' }])
		expect(rows[0]?.recaps).toEqual(['section-old'])
		expect(rows[0]?.receipt.selections[0]?.prior).toEqual(['request-1'])
		expect(rows[0]?.request).toBe('request-2')
		expect(rows[0]?.receipt.selections[0]?.sources).toEqual([
			{ source: 'section-old', carriage: 'recap' },
		])
		const next = buildStudyMemoryReceipts(
			{ ...result, request: 'request-3' },
			STUDY_MEMORY_SELECTION_ARRIVALS,
			{ sections: [], messages: STUDY_MEMORY_SELECTION_MESSAGES },
		)
		expect(next[0]?.request).toBe('request-3')
		expect(next[0]?.recaps).toEqual([])
	})
	it('validates finite room, actual digest syntax and exact uncredentialed origin', () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		const every = ['records', 'compaction', 'full'] as const
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

	it('requires a judge only for the records arm and a recap only for the compaction arm', () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		const provider = profile.provider
		if (provider === undefined) throw new Error('Missing fixture provider')
		const bare = omitMemoryAuxiliaries(profile)
		expect(() => validateStudyMemoryProfile(bare, [])).not.toThrow()
		expect(() => validateStudyMemoryProfile(bare, ['full'])).not.toThrow()
		expect(() => validateStudyMemoryProfile(bare, ['records'])).toThrow('judge model and digest')
		expect(() => validateStudyMemoryProfile(bare, ['compaction'])).toThrow(
			'Memory compaction requires a declared recap allowance',
		)
		expect(() => validateStudyMemoryProfile(bare, ['records', 'compaction', 'full'])).toThrow(
			'judge model and digest',
		)
		// Declaring the auxiliary role is enough for the arm that uses it.
		expect(() =>
			validateStudyMemoryProfile({ ...bare, room: profile.room }, ['compaction']),
		).not.toThrow()
		expect(() => validateStudyMemoryProfile({ ...bare, provider }, ['records'])).not.toThrow()
		// A declared auxiliary is validated whichever arm is selected.
		expect(() =>
			validateStudyMemoryProfile({ ...bare, room: { ...bare.room, recap: 0 } }, ['full']),
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

	it('admits absent or valid profile settings, refuses malformed ones and reads the gauge only when explicit', () => {
		const url = 'http://127.0.0.1:7'
		for (const settings of [undefined, {}, { observe: true }, STUDY_MEMORY_SETTINGS])
			expect(() =>
				validateStudyMemoryProfile(buildMemoryProfile({ url, settings }), ['records', 'full']),
			).not.toThrow()
		for (const settings of [
			{ extra: 1 },
			{ gauge: { scale: 0, overhead: 0 } },
			{ checkpoints: ['a'] },
		])
			expect(() =>
				validateStudyMemoryProfile(buildMemoryProfile({ url, settings }), ['records', 'full']),
			).toThrow('settings')
		const declared = { scale: 2, overhead: 5 }
		const gauge = readStudyMemoryGauge({ gauge: declared, observe: false })
		expect(gauge).toEqual(declared)
		expect(gauge).not.toBe(declared)
		for (const settings of [
			undefined,
			null,
			{},
			{ observe: true },
			{ gauge: { scale: 1 } },
			{ gauge: { scale: 0, overhead: 0 } },
			{ gauge: { scale: 1, overhead: 0 }, extra: 1 },
		])
			expect(() => readStudyMemoryGauge(settings)).toThrow(
				expect.objectContaining({ code: 'CONFIG', message: expect.stringContaining('gauge') }),
			)
	})

	it('reads the compaction declarations together and the judge only where one is declared', () => {
		const profile = buildMemoryProfile({
			url: 'http://127.0.0.1:7',
			settings: { gauge: { scale: 2, overhead: 5 } },
		})
		expect(readStudyMemoryRecap(profile.room)).toBe(256)
		expect(readStudyMemoryCompaction(profile)).toEqual({
			gauge: { scale: 2, overhead: 5 },
			recap: 256,
		})
		const bare = omitMemoryAuxiliaries(profile)
		expect(() => readStudyMemoryRecap(bare.room)).toThrow(
			expect.objectContaining({ code: 'CONFIG', message: expect.stringContaining('recap') }),
		)
		expect(() => readStudyMemoryCompaction(bare)).toThrow('recap')
		expect(() => readStudyMemoryCompaction({ ...profile, settings: undefined })).toThrow('gauge')
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
		for (const settings of [{}, { observe: false }, STUDY_MEMORY_SETTINGS])
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
				...STUDY_MEMORY_SETTINGS,
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
			options: { num_ctx: 32768, num_predict: 512, temperature: 0, seed: 0 },
			think: false,
			strict: false,
			length: false,
		}
		expect(buildStudyMemoryRoles(profile, 'full')).toEqual({ agent })
		// Compaction alone declares the summary role and the strict native flags on every chat role.
		expect(buildStudyMemoryRoles(profile, 'compaction')).toEqual({
			agent: { ...agent, strict: true },
			summary: {
				model: 'model',
				options: { num_ctx: 32768, num_predict: 256, temperature: 0, seed: 0 },
				think: false,
				strict: true,
				length: false,
			},
		})
		// Records alone declares the one-token judge, which may finish on length and sends no strict fields.
		expect(buildStudyMemoryRoles(profile, 'records')).toEqual({
			agent,
			judge: {
				model: 'judge',
				options: { num_ctx: 32768, num_predict: 1, temperature: 1, seed: 0 },
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
		expect(() => buildStudyMemoryRoles(bare, 'compaction')).toThrow('recap')
		expect(() => buildStudyMemoryRoles(bare, 'records')).toThrow('judge')
		expect(() => buildStudyMemoryRoles({ ...profile, provider: undefined }, 'full')).toThrow(
			expect.objectContaining({ code: 'CONFIG' }),
		)
	})

	it('joins message origins from session state only, in priority order, leaving the rest unknown', () => {
		const source = {
			explicit: new Map<string, StudyMemoryProvenance>([
				['in', { origin: 'input', source: 'opening' }],
				['ar', { origin: 'arrival', source: 'source-1' }],
				['ti', { origin: 'instructions', source: 'summary' }],
			]),
			sections: new Set(['sec']),
			members: new Set(['in', 'sec', 'kept', 'tool', 'rules']),
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
				{ origin: 'instructions', source: 'summary' },
				{ origin: 'instructions', source: 'summary' },
			],
			[
				'section recap beats membership',
				{ id: 'sec', role: 'assistant', content: 'x' },
				{ origin: 'summary', source: 'sec' },
				{ origin: 'summary', source: 'sec' },
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
			sections: new Set<string>(),
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
		const { complete, source, meaning } = buildMemoryGradingFixture()
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
