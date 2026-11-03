import type { Message } from '@orkestrel/agent'
import type { StudyMemoryProvenance } from '../../../studies/memory/index.js'
import { describe, expect, it } from 'vitest'
import {
	buildStudyMemoryOrigins,
	buildStudyMemoryRoles,
	computeStudyMemoryCacheShares,
	computeStudyMemoryCarriage,
	computeStudyMemoryReacquisition,
	computeStudyMemoryRetention,
	computeStudyMemoryShare,
	readStudyMemoryCompaction,
	readStudyMemoryGrade,
	readStudyMemoryGauge,
	readStudyMemoryJudge,
	readStudyMemoryProvenance,
	readStudyMemoryRecap,
	STUDY_MEMORY_LEDGER_REPEAT,
	STUDY_MEMORY_LOOKUPS,
	resolveStudyMemoryObservation,
	validateStudyMemoryProfile,
} from '../../../studies/memory/index.js'
import {
	buildMemoryCriterion,
	buildMemoryGradingFixture,
	buildMemoryProfile,
	buildMemoryRecording,
	MEMORY_CARRIAGE,
	MEMORY_EVIDENCE,
	MEMORY_LITERALS,
	MEMORY_RETENTION,
	MEMORY_WIRE_ROWS,
	omitMemoryAuxiliaries,
	readMemoryOrigins,
	STUDY_MEMORY_MALFORMED_SETTINGS,
	STUDY_MEMORY_MODULES,
	STUDY_MEMORY_RECORDING,
	STUDY_MEMORY_SAMPLING_PINS,
	STUDY_MEMORY_SETTINGS,
} from '../../setupStudy.js'

describe('memory declaration and mechanical evidence', () => {
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
			options: { num_ctx: 32768, num_predict: 512, ...STUDY_MEMORY_SAMPLING_PINS.agent },
			think: false,
			strict: false,
			length: true,
		}
		expect(buildStudyMemoryRoles(profile, 'full')).toEqual({ agent })
		// Compaction alone declares the summary role and the strict native flags on every chat role.
		expect(buildStudyMemoryRoles(profile, 'compaction')).toEqual({
			agent: { ...agent, strict: true },
			summary: {
				model: 'model',
				options: { num_ctx: 32768, num_predict: 256, ...STUDY_MEMORY_SAMPLING_PINS.summary },
				think: false,
				strict: true,
				length: false,
			},
		})
		// Records alone declares the one-token judge, which sends no strict fields.
		expect(buildStudyMemoryRoles(profile, 'records')).toEqual({
			agent,
			judge: {
				model: 'judge',
				options: { num_ctx: 32768, num_predict: 1, ...STUDY_MEMORY_SAMPLING_PINS.judge },
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

	it('every role sends every pinned sampling key', () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		const budgets = { agent: 512, summary: 256, judge: 1 }
		const sent = (['full', 'compaction', 'records'] as const).flatMap((arm) => {
			const roles = buildStudyMemoryRoles(profile, arm)
			return (['agent', 'summary', 'judge'] as const).flatMap((role) => {
				const options = roles[role]?.options
				return options === undefined ? [] : [{ arm, role, options }]
			})
		})
		expect(sent.map((entry) => [entry.arm, entry.role])).toEqual([
			['full', 'agent'],
			['compaction', 'agent'],
			['compaction', 'summary'],
			['records', 'agent'],
			['records', 'judge'],
		])
		for (const { role, options } of sent)
			expect(options).toEqual({
				num_ctx: 32768,
				num_predict: budgets[role],
				...STUDY_MEMORY_SAMPLING_PINS[role],
			})
	})

	it('refuses a recording profile with no version or metadata', () => {
		const profile = buildMemoryRecording('http://127.0.0.1:7')
		const { version, metadata } = STUDY_MEMORY_RECORDING.settings
		const refusal = expect.objectContaining({
			code: 'CONFIG',
			message: 'Memory recording requires a declared version and metadata',
		})
		for (const settings of [undefined, { version }, { metadata }])
			expect(() => validateStudyMemoryProfile({ ...profile, settings }, [])).toThrow(refusal)
		expect(() => validateStudyMemoryProfile(profile, [])).not.toThrow()
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

function literals(text: string): ReadonlySet<string> {
	return MEMORY_LITERALS.get(text) ?? new Set()
}

describe('memory measurement instruments', () => {
	it('pins the ledger repeat reason', () => {
		expect(STUDY_MEMORY_LEDGER_REPEAT).toBe(STUDY_MEMORY_MODULES.agent.LEDGER_NOTES.repeat)
	})

	it('reads literal retention over the recurring ids and fails the recap-only control', () => {
		const { history, later, anchored, recap } = MEMORY_RETENTION
		expect(computeStudyMemoryRetention({ history, later, view: anchored, literals })).toEqual({
			found: 2,
			total: 2,
		})
		const control = computeStudyMemoryRetention({ history, later, view: recap, literals })
		expect(control.found).toBe(0)
		expect(control.found).toBeLessThan(2)
		// CC-303 sits in history and view but never recurs, so it adds nothing to the population.
		expect(computeStudyMemoryRetention({ history, later, view: anchored, literals }).total).toBe(2)
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

	it('derives a share from a tally and reads undefined for an empty population', () => {
		expect(computeStudyMemoryShare({ found: 1, total: 4 })).toBe(0.25)
		expect(computeStudyMemoryShare({ found: 0, total: 0 })).toBeUndefined()
	})
})
