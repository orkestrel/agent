import type { Message } from '@orkestrel/agent'
import type { StudyAttempt, StudyEvidence } from '@orkestrel/study'
import type { StudyMemoryProvenance } from '../../../studies/memory/index.js'
import { isStudyJudgment, parseStudyScenario } from '@orkestrel/study'
import { describe, expect, it } from 'vitest'
import {
	buildStudyMemoryOrigins,
	buildStudyMemoryRoles,
	createStudyAdapter,
	isStudyMemoryArm,
	isStudyMemoryAssertion,
	isStudyMemoryClassifier,
	isStudyMemoryInput,
	isStudyMemoryLedger,
	isStudyMemoryProvider,
	isStudyMemoryRuntime,
	isStudyMemorySettings,
	readStudyMemoryCompaction,
	readStudyMemoryGauge,
	readStudyMemoryGrade,
	readStudyMemoryJudge,
	readStudyMemoryProvenance,
	readStudyMemoryRecap,
	readStudyMemorySettings,
	validateStudyMemoryProfile,
} from '../../../studies/memory/index.js'
import {
	buildCustodyManifest,
	buildMemoryCriterion,
	buildMemoryProfile,
	loadMemoryInputs,
	omitMemoryAuxiliaries,
	readMemoryOrigins,
	STUDY_MEMORY_MALFORMED_SETTINGS,
	STUDY_MEMORY_MODULES,
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

	it('accepts exactly the declared settings members and refuses unknown keys and invalid values', () => {
		const gauge = { scale: 1.5, overhead: 0 }
		const names = Array.from({ length: 13 }, (_, index) => `checkpoint-${index}`)
		const accepted: ReadonlyArray<readonly [string, unknown]> = [
			['empty', {}],
			['gauge', { gauge }],
			['smallest scale', { gauge: { scale: Number.MIN_VALUE, overhead: 7 } }],
			['observe false', { observe: false }],
			['observe true', { observe: true }],
			['no checkpoints', { observe: true, checkpoints: [] }],
			['longest checkpoint', { observe: true, checkpoints: ['x'.repeat(128)] }],
			['all members', { gauge, observe: true, checkpoints: names.slice(0, 12) }],
			['undefined members', { gauge: undefined, observe: undefined, checkpoints: undefined }],
			['rolling true', { gauge, rolling: true }],
			['rolling false', { gauge, rolling: false }],
			['rolling alone', { rolling: true }],
			['rolling beside observation', { gauge, rolling: true, observe: true, checkpoints: ['a'] }],
			['undefined rolling', { gauge, rolling: undefined }],
		]
		const refused: ReadonlyArray<readonly [string, unknown]> = [
			['undefined', undefined],
			['null', null],
			['array', []],
			['string', 'gauge'],
			['number', 7],
			['unknown key', { extra: 1 }],
			['unknown key beside gauge', { gauge, extra: true }],
			['cased key', { Gauge: gauge }],
			['zero scale', { gauge: { scale: 0, overhead: 0 } }],
			['negative scale', { gauge: { scale: -1, overhead: 0 } }],
			['NaN scale', { gauge: { scale: Number.NaN, overhead: 0 } }],
			['infinite scale', { gauge: { scale: Number.POSITIVE_INFINITY, overhead: 0 } }],
			['negative overhead', { gauge: { scale: 1, overhead: -1 } }],
			['NaN overhead', { gauge: { scale: 1, overhead: Number.NaN } }],
			['infinite overhead', { gauge: { scale: 1, overhead: Number.POSITIVE_INFINITY } }],
			['text scale', { gauge: { scale: '1', overhead: 0 } }],
			['missing overhead', { gauge: { scale: 1 } }],
			['missing scale', { gauge: { overhead: 0 } }],
			['unknown gauge key', { gauge: { scale: 1, overhead: 0, extra: 0 } }],
			['array gauge', { gauge: [] }],
			['null gauge', { gauge: null }],
			['number gauge', { gauge: 1 }],
			['text observe', { observe: 'true' }],
			['null observe', { observe: null }],
			['checkpoints without observe', { checkpoints: ['a'] }],
			['checkpoints with observe false', { observe: false, checkpoints: ['a'] }],
			['text checkpoints', { observe: true, checkpoints: 'a' }],
			['null checkpoints', { observe: true, checkpoints: null }],
			['empty checkpoint', { observe: true, checkpoints: [''] }],
			['duplicate checkpoint', { observe: true, checkpoints: ['a', 'a'] }],
			['long checkpoint', { observe: true, checkpoints: ['x'.repeat(129)] }],
			['non-text checkpoint', { observe: true, checkpoints: [1] }],
			['too many checkpoints', { observe: true, checkpoints: names }],
			['text rolling', { gauge, rolling: 'true' }],
			['numeric rolling', { gauge, rolling: 1 }],
			['null rolling', { gauge, rolling: null }],
			['array rolling', { gauge, rolling: [true] }],
			['cased rolling key', { gauge, Rolling: true }],
			['sections beside rolling', { gauge, rolling: true, sections: 2 }],
		]
		for (const [label, value] of accepted)
			expect([label, isStudyMemorySettings(value)]).toEqual([label, true])
		for (const [label, value] of refused)
			expect([label, isStudyMemorySettings(value)]).toEqual([label, false])
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

	it('checks each admitted capability its treatments invoke and tolerates a hostile namespace', () => {
		const { agent, provider } = STUDY_MEMORY_MODULES
		expect(isStudyMemoryRuntime(agent)).toBe(true)
		expect(isStudyMemoryLedger(agent)).toBe(true)
		expect(isStudyMemoryProvider(provider)).toBe(true)
		expect(isStudyMemoryClassifier(provider)).toBe(true)
		// A runtime without Ledger capabilities serves the Full and Compaction arms.
		const surface = {
			Agent: agent.Agent,
			createConversationManager: agent.createConversationManager,
			estimateRequest: agent.estimateRequest,
			measureRequest: agent.measureRequest,
			isAgentError: agent.isAgentError,
		}
		expect(isStudyMemoryRuntime(surface)).toBe(true)
		expect(isStudyMemoryLedger(surface)).toBe(false)
		for (const missing of Object.keys(surface)) {
			const remaining = Object.entries(surface).filter(([key]) => key !== missing)
			expect([missing, isStudyMemoryRuntime(Object.fromEntries(remaining))]).toEqual([
				missing,
				false,
			])
		}
		expect(isStudyMemoryRuntime({ ...surface, isAgentError: 'guard' })).toBe(false)
		expect(isStudyMemoryRuntime({ ...surface, Agent: {} })).toBe(false)
		expect(
			isStudyMemoryLedger({ createLedger: agent.createLedger, LEDGER_QUESTIONS: 'questions' }),
		).toBe(false)
		// A provider without the judge factory serves every arm except records.
		expect(isStudyMemoryProvider({ createOllama: provider.createOllama })).toBe(false)
		expect(
			isStudyMemoryProvider({
				createOllama: provider.createOllama,
				extractTiming: provider.extractTiming,
			}),
		).toBe(true)
		expect(
			isStudyMemoryClassifier({
				createOllama: provider.createOllama,
				extractTiming: provider.extractTiming,
			}),
		).toBe(false)
		const hostile = new Proxy(
			{},
			{
				has: () => {
					throw new Error('has')
				},
			},
		)
		for (const value of [{}, undefined, null, hostile])
			expect([
				isStudyMemoryRuntime(value),
				isStudyMemoryLedger(value),
				isStudyMemoryProvider(value),
				isStudyMemoryClassifier(value),
			]).toEqual([false, false, false, false])
	})

	it('reads observation switches only from well-formed settings and refuses malformed ones', () => {
		expect(readStudyMemorySettings(undefined)).toEqual({ observe: false, checkpoints: new Set() })
		for (const settings of [{}, { observe: false }, STUDY_MEMORY_SETTINGS])
			expect(readStudyMemorySettings(settings)).toEqual({ observe: false, checkpoints: new Set() })
		expect(readStudyMemorySettings({ observe: true })).toEqual({
			observe: true,
			checkpoints: new Set(),
		})
		expect(
			readStudyMemorySettings({ ...STUDY_MEMORY_SETTINGS, observe: true, checkpoints: ['a', 'b'] }),
		).toEqual({ observe: true, checkpoints: new Set(['a', 'b']) })
		for (const settings of [
			...STUDY_MEMORY_MALFORMED_SETTINGS.map((entry) => entry.settings),
			null,
			[],
			'observe',
		])
			expect(() => readStudyMemorySettings(settings)).toThrow(
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

	it('accepts bounded inputs and rejects repeated source ids and malformed foreign namespaces', () => {
		expect(
			isStudyMemoryInput({
				prompt: 'request',
				arrivals: [{ id: 'one', content: 'fact' }],
				records: [],
			}),
		).toBe(true)
		expect(
			isStudyMemoryInput({
				prompt: 'request',
				arrivals: [
					{ id: 'one', content: 'fact' },
					{ id: 'one', content: 'fact' },
				],
				records: [],
			}),
		).toBe(false)
		expect(isStudyMemoryInput({ prompt: 'x'.repeat(16385), arrivals: [], records: [] })).toBe(false)
		expect(isStudyMemoryRuntime({})).toBe(false)
		expect(isStudyMemoryProvider({})).toBe(false)
		expect(isStudyMemoryArm('records')).toBe(true)
		expect(isStudyMemoryArm('unsupported')).toBe(false)
		expect(isStudyMemoryAssertion({ observation: 'result', partial: false })).toBe(true)
		expect(isStudyMemoryAssertion({ observation: 'result', partial: 'false' })).toBe(false)
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
