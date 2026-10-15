import type { StudyMemoryRequest } from '../../../../studies/memory/index.js'
import { isRecord, parseJSON } from '@orkestrel/contract'
import { isStudyJudgment, readStudyFailure, StudyError } from '@orkestrel/study'
import { describe, expect, it } from 'vitest'
import { AgentError } from '../../../../src/core/index.js'
import {
	buildStudyMemoryReadings,
	buildStudyMemoryTiming,
	createStudyAdapter,
	gradeStudyMemory,
	isStudyMemoryArm,
	isStudyMemoryAssertion,
	isStudyMemoryInput,
	isStudyMemoryProvider,
	isStudyMemorySettings,
	isStudyMemorySubject,
	projectStudyMemoryRequest,
	readStudyMemoryDigest,
	readStudyMemoryError,
	readStudyMemoryGauge,
	readStudyMemoryRequest,
	readStudyMemorySettings,
	readStudyMemorySupport,
	readStudyMemoryTerminal,
	readStudyMemoryTiming,
	validateStudyMemoryInventory,
	validateStudyMemoryCompletion,
	validateStudyMemoryProfile,
	validateStudyMemoryProjection,
} from '../../../../studies/memory/index.js'
import {
	buildMemoryProfile,
	buildMemoryReply,
	loadMemoryInputs,
	STUDY_MEMORY_MALFORMED_SETTINGS,
	STUDY_MEMORY_MODULES,
	STUDY_MEMORY_SETTINGS,
	STUDY_MEMORY_TIMING,
	STUDY_MEMORY_TIMING_EXPECTED,
} from '../../../setupService.js'

describe('memory declaration and mechanical evidence', () => {
	it('validates finite room, actual digest syntax and exact uncredentialed origin', () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		expect(() => validateStudyMemoryProfile(profile)).not.toThrow()
		expect(() =>
			validateStudyMemoryProfile({
				...profile,
				room: { ...profile.room, safety: profile.room.context },
			}),
		).toThrow('prompt capacity')
		expect(() => validateStudyMemoryProfile({ ...profile, provider: undefined })).toThrow('digests')
		const provider = profile.provider
		if (provider === undefined) throw new Error('Missing fixture provider')
		expect(() =>
			validateStudyMemoryProfile({
				...profile,
				provider: { ...provider, digest: { model: 'unknown', judge: 'unknown' } },
			}),
		).toThrow('digests')
		expect(() =>
			validateStudyMemoryProfile({
				...profile,
				provider: { ...provider, url: 'http://user:password@127.0.0.1:7' },
			}),
		).toThrow('uncredentialed')
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
		]
		for (const [label, value] of accepted)
			expect([label, isStudyMemorySettings(value)]).toEqual([label, true])
		for (const [label, value] of refused)
			expect([label, isStudyMemorySettings(value)]).toEqual([label, false])
	})

	it('admits absent or valid profile settings, refuses malformed ones and reads the gauge only when explicit', () => {
		const url = 'http://127.0.0.1:7'
		for (const settings of [undefined, {}, { observe: true }, STUDY_MEMORY_SETTINGS])
			expect(() => validateStudyMemoryProfile(buildMemoryProfile({ url, settings }))).not.toThrow()
		for (const settings of [
			{ extra: 1 },
			{ gauge: { scale: 0, overhead: 0 } },
			{ checkpoints: ['a'] },
		])
			expect(() => validateStudyMemoryProfile(buildMemoryProfile({ url, settings }))).toThrow(
				'settings',
			)
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

	it('translates only a nominal Agent window refusal into attributable capacity', () => {
		const { subject } = STUDY_MEMORY_MODULES
		if (!isStudyMemorySubject(subject)) throw new Error('Missing admitted Agent subject')
		const surface = {
			Agent: subject.Agent,
			createLedger: subject.createLedger,
			createConversationManager: subject.createConversationManager,
			estimateRequest: subject.estimateRequest,
			LEDGER_QUESTIONS: subject.LEDGER_QUESTIONS,
		}
		expect(isStudyMemorySubject(surface)).toBe(false)
		expect(isStudyMemorySubject({ ...surface, isAgentError: 'guard' })).toBe(false)
		expect(isStudyMemorySubject({ ...surface, isAgentError: subject.isAgentError })).toBe(true)
		const refusal = new STUDY_MEMORY_MODULES.subject.AgentError('WINDOW', 'Request fills window', {
			context: { consumed: 9, max: 8 },
		})
		const translated = readStudyMemoryError(refusal, subject)
		expect(translated).toBeInstanceOf(StudyError)
		expect(translated).toMatchObject({
			code: 'CAPACITY',
			message: 'Request fills window',
			failure: { cause: 'capacity', message: 'Request fills window', role: 'agent' },
		})
		expect(readStudyFailure(translated)).toEqual({
			cause: 'capacity',
			message: 'Request fills window',
			role: 'agent',
		})
		const aborted = AbortSignal.abort(new Error('Cancelled by caller'))
		const identities: ReadonlyArray<readonly [string, unknown]> = [
			...(['CONCURRENCY', 'LIMIT', 'REGISTRY'] as const).map(
				(code) =>
					[
						`nominal ${code}`,
						new STUDY_MEMORY_MODULES.subject.AgentError(code, 'Not a window refusal'),
					] as const,
			),
			['foreign Agent copy', new AgentError('WINDOW', 'Separately loaded Agent')],
			['plain code object', { code: 'WINDOW', message: 'Request fills window' }],
			[
				'named code object',
				{ name: 'AgentError', code: 'WINDOW', message: 'Request fills window' },
			],
			['coded Error', Object.assign(new Error('Request fills window'), { code: 'WINDOW' })],
			[
				'named coded Error',
				Object.assign(new Error('Request fills window'), { name: 'AgentError', code: 'WINDOW' }),
			],
			['study capacity', new StudyError('CAPACITY', 'Already attributed')],
			['summarizer failure', new Error('Summary provider failed')],
			['abort reason', aborted.reason],
			['abort error', new DOMException('The operation was aborted', 'AbortError')],
			['timeout error', new DOMException('The operation timed out', 'TimeoutError')],
			['text', 'WINDOW'],
			['null', null],
			['undefined', undefined],
		]
		for (const [label, value] of identities)
			expect([label, Object.is(readStudyMemoryError(value, subject), value)]).toEqual([label, true])
	})

	it('projects an estimate through the gauge with Math.ceil(overhead + scale * estimate)', () => {
		const cases: ReadonlyArray<readonly [number, number, number, number]> = [
			[1, 0, 10, 10],
			[1.5, 2, 10, 17],
			[0.5, 0.2, 3, 2],
			[2, 5, 0, 5],
			[2, 0, 2.25, 5],
			[1e-9, 100, 7, 101],
			[0.25, 0, 7, 2],
		]
		for (const [scale, overhead, estimate, expected] of cases)
			expect([scale, overhead, estimate, projectStudyMemoryRequest({ scale, overhead }, estimate)]).toEqual([
				scale,
				overhead,
				estimate,
				expected,
			])
	})

	it('accepts a finite positive prompt not above its projection and refuses the rest with attributable errors', () => {
		const [one, ten, eleven, zero, negative, nan, infinite] = [1, 10, 11, 0, -1, Number.NaN, Infinity].map(
			(prompt) => ({ prompt, completion: 2, total: prompt + 2 }),
		)
		if (
			one === undefined ||
			ten === undefined ||
			eleven === undefined ||
			zero === undefined ||
			negative === undefined ||
			nan === undefined ||
			infinite === undefined
		)
			throw new Error('Missing usage fixture')
		expect(() => validateStudyMemoryProjection(ten, 10)).not.toThrow()
		expect(() => validateStudyMemoryProjection(ten, 11)).not.toThrow()
		expect(() => validateStudyMemoryProjection(one, 1)).not.toThrow()
		let capacity: unknown
		try {
			validateStudyMemoryProjection(eleven, 10)
		} catch (error) {
			capacity = error
		}
		expect(capacity).toBeInstanceOf(StudyError)
		expect(capacity).toMatchObject({ code: 'CAPACITY' })
		expect(readStudyFailure(capacity)).toEqual({
			cause: 'capacity',
			message: 'Actual prompt exceeded the gauged projection',
			role: 'agent',
		})
		for (const unusable of [undefined, zero, negative, nan, infinite])
			expect(() => validateStudyMemoryProjection(unusable, 10)).toThrow(
				expect.objectContaining({ code: 'FAULT', message: expect.stringContaining('prompt count') }),
			)
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

	it('reads the pinned serving digest each request role and model is answered by', () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		const request = {
			role: 'agent',
			path: '/api/chat',
			model: 'model',
			output: 512,
			bytes: 1,
			options: {},
		} as const
		const cases: ReadonlyArray<readonly [string, StudyMemoryRequest, string | null]> = [
			['agent', request, 'a'.repeat(64)],
			['summary', { ...request, role: 'summary' }, 'a'.repeat(64)],
			['judge', { ...request, role: 'judge', model: 'judge' }, 'b'.repeat(64)],
			['model metadata', { ...request, role: 'metadata', model: 'model' }, 'a'.repeat(64)],
			['judge metadata', { ...request, role: 'metadata', model: 'judge' }, 'b'.repeat(64)],
			['inventory', { ...request, role: 'metadata', model: undefined }, null],
			['foreign metadata', { ...request, role: 'metadata', model: 'other' }, null],
		]
		for (const [label, entry, expected] of cases)
			expect([label, readStudyMemoryDigest(profile, entry)]).toEqual([label, expected])
		expect(readStudyMemoryDigest({ ...profile, provider: undefined }, request)).toBeNull()
	})

	it('extracts terminal timing without letting a refusing extractor fail the request', () => {
		const row = parseJSON(buildMemoryReply({ timing: STUDY_MEMORY_TIMING }))
		if (!isRecord(row)) throw new Error('Invalid reply row')
		const { extractTiming } = STUDY_MEMORY_MODULES.provider
		expect(readStudyMemoryTiming(extractTiming, row)).toEqual(STUDY_MEMORY_TIMING_EXPECTED)
		expect(
			readStudyMemoryTiming(() => {
				throw new Error('Extractor refused the row')
			}, row),
		).toBeUndefined()
		expect(readStudyMemoryTiming(() => undefined, row)).toBeUndefined()
	})

	it('builds JSON timing evidence that keeps unknown values null and copies invalid names', () => {
		expect(buildStudyMemoryTiming(undefined)).toBeNull()
		const invalid = ['load_duration']
		const built = buildStudyMemoryTiming({
			durations: { total: 9, load: undefined, prompt: 0, decode: 4 },
			counts: { prompt: 6, decode: undefined, cached: undefined },
			invalid,
		})
		expect(built).toEqual({
			durations: { total: 9, load: null, prompt: 0, decode: 4 },
			counts: { prompt: 6, decode: null, cached: null },
			invalid: ['load_duration'],
		})
		invalid.push('late')
		expect(built).toMatchObject({ invalid: ['load_duration'] })
		expect(
			buildStudyMemoryTiming({
				durations: { total: undefined, load: undefined, prompt: undefined, decode: undefined },
				counts: { prompt: undefined, decode: undefined, cached: undefined },
				invalid: [],
			}),
		).toEqual({
			durations: { total: null, load: null, prompt: null, decode: null },
			counts: { prompt: null, decode: null, cached: null },
			invalid: [],
		})
	})

	it('builds classifier readings in asking order, skipping malformed entries and keeping unknown durations null', () => {
		expect(buildStudyMemoryReadings(undefined)).toBeNull()
		expect(buildStudyMemoryReadings('readings')).toBeNull()
		expect(buildStudyMemoryReadings({})).toBeNull()
		expect(buildStudyMemoryReadings({ readings: 'none' })).toBeNull()
		expect(buildStudyMemoryReadings({ readings: [] })).toEqual([])
		expect(
			buildStudyMemoryReadings({
				readings: [
					{ key: 'first', phase: 'ask', outcome: 'cached', duration: 12, extra: 'dropped' },
					{ key: 'second', phase: 'ask', outcome: 'asked' },
					{ key: 7, phase: 'ask', outcome: 'asked' },
					{ phase: 'ask', outcome: 'asked' },
					{ key: 'third', phase: 1, outcome: 'asked' },
					{ key: 'fourth', phase: 'ask' },
					'text',
					null,
					{ key: 'fifth', phase: 'ask', outcome: 'asked', duration: 'long' },
				],
			}),
		).toEqual([
			{ key: 'first', phase: 'ask', outcome: 'cached', duration: 12 },
			{ key: 'second', phase: 'ask', outcome: 'asked', duration: null },
			{ key: 'fifth', phase: 'ask', outcome: 'asked', duration: null },
		])
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
		expect(isStudyMemorySubject({})).toBe(false)
		expect(isStudyMemoryProvider({})).toBe(false)
		expect(isStudyMemoryArm('records')).toBe(true)
		expect(isStudyMemoryArm('unsupported')).toBe(false)
		expect(isStudyMemoryAssertion({ observation: 'result', partial: false })).toBe(true)
		expect(isStudyMemoryAssertion({ observation: 'result', partial: 'false' })).toBe(false)
	})

	it('checks actual inventory identities and refuses duplicate or absent entries', () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		const inventory = {
			models: [
				{ name: 'model', digest: 'a'.repeat(64) },
				{ name: 'judge', digest: 'b'.repeat(64) },
			],
		}
		expect(() => validateStudyMemoryInventory(inventory, profile)).not.toThrow()
		expect(() =>
			validateStudyMemoryInventory({ models: [...inventory.models, inventory.models[0]] }, profile),
		).toThrow('digest')
		expect(() => validateStudyMemoryInventory({ models: [] }, profile)).toThrow('digest')
	})

	it('admits only the exact provider request policy and preserves unknown usage', () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		const init = {
			method: 'POST',
			body: JSON.stringify({
				model: 'model',
				stream: true,
				think: false,
				options: { num_ctx: 32768, num_predict: 512, temperature: 0, seed: 0 },
			}),
		}
		const request = readStudyMemoryRequest(profile, 'agent', 'http://127.0.0.1:7/api/chat', init)
		expect(request.output).toBe(512)
		expect(() =>
			readStudyMemoryRequest(profile, 'agent', 'http://127.0.0.1:8/api/chat', init),
		).toThrow('endpoint')
		expect(() =>
			readStudyMemoryRequest(profile, 'agent', 'http://127.0.0.1:7/api/chat?leak=1', init),
		).toThrow('endpoint')
		expect(
			readStudyMemoryTerminal(
				{ model: 'model', done: true, done_reason: 'stop', message: { content: 'answer' } },
				request,
			),
		).toEqual({ prompt: undefined, completion: undefined, reason: 'stop' })
		expect(() =>
			validateStudyMemoryCompletion(
				{ prompt: 10, completion: 512, reason: 'stop' },
				profile,
				request,
			),
		).toThrow('output cap')
		expect(() =>
			readStudyMemoryTerminal(
				{ model: 'model', done: true, done_reason: 'stop', message: { content: 7 } },
				request,
			),
		).toThrow('message')
	})

	it('requires unambiguous declared model context support', () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		expect(
			readStudyMemorySupport(
				{ model_info: { 'general.architecture': 'fixture', 'fixture.context_length': 32768 } },
				profile,
			),
		).toBe(32768)
		expect(() => readStudyMemorySupport({}, profile)).toThrow('metadata')
		expect(() =>
			readStudyMemorySupport(
				{ model_info: { 'general.architecture': 'fixture', 'fixture.context_length': 1024 } },
				profile,
			),
		).toThrow('support')
		expect(() =>
			readStudyMemorySupport(
				{
					model_info: {
						'general.architecture': 'fixture',
						'fixture.context_length': 32768,
						'other.context_length': 65536,
					},
				},
				profile,
			),
		).toThrow('support')
	})

	it('cites retained attempts and one-based rows, keeps unknowns empty and admits nonfault partial products', () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		const complete = { id: 'complete', arm: 'full', scenario: 'desk', repetition: 0 }
		const faulted = { id: 'faulted', arm: 'full', scenario: 'desk', repetition: 1 }
		const evidence = {
			complete: [
				{ event: 'summary', goal: 'other', value: 'unrelated' },
				{ event: 'arrival', goal: 'goal', value: { id: 'receipt' } },
			],
			faulted: [],
		}
		const judgments = gradeStudyMemory({
			manifest: {
				version: 1,
				id: 'manifest',
				created: '2026-10-14',
				definition: {
					name: 'test',
					version: '1',
					question: 'mechanisms',
					purpose: 'capacity',
					driver: 'memory',
					arms: ['full'],
					scenarios: ['desk'],
					order: [['full']],
					retries: 0,
					rubric: 'rubric.json',
				},
				scenarios: [],
				schedule: [complete, faulted],
				bounds: profile.bounds,
				qualification: undefined,
				host: {},
				identity: {
					subject: 'subject',
					provider: 'provider',
					instrument: 'instrument',
					fixtures: 'fixtures',
					profile: 'profile',
				},
			},
			rubric: {
				version: '1',
				criteria: [
					{
						id: 'operational',
						scenario: 'desk',
						goal: 'goal',
						method: 'state',
						critical: true,
						assertion: { observation: 'operational' },
					},
					{
						id: 'meaning',
						scenario: 'desk',
						goal: 'goal',
						method: 'semantic',
						critical: true,
						assertion: { criterion: 'Correctly repaired handoff' },
					},
					{
						id: 'source',
						scenario: 'desk',
						goal: 'goal',
						method: 'trace',
						critical: false,
						assertion: { observation: 'arrival', id: 'receipt' },
					},
					{
						id: 'lookup',
						scenario: 'desk',
						goal: 'goal',
						method: 'trace',
						critical: false,
						assertion: { observation: 'lookup', id: 'record' },
					},
					{
						id: 'result',
						scenario: 'desk',
						goal: 'goal',
						method: 'state',
						critical: false,
						assertion: { observation: 'result', partial: false },
					},
				],
			},
			attempts: [
				{
					trial: complete,
					duration: 1,
					failure: undefined,
					observations: [
						{
							goal: 'goal',
							product: { value: { content: '' }, partial: true },
							failure: undefined,
							usage: [],
							duration: 1,
						},
					],
				},
				{
					trial: faulted,
					duration: 1,
					failure: { cause: 'capacity', message: 'Output cap', role: 'agent' },
					observations: [
						{
							goal: 'goal',
							product: undefined,
							failure: { cause: 'capacity', message: 'Output cap', role: 'agent' },
							usage: [],
							duration: 1,
						},
					],
				},
			],
			evidence,
		})
		expect(judgments.every((judgment) => isStudyJudgment(judgment))).toBe(true)
		expect(
			judgments.map((judgment) => [
				judgment.trial,
				judgment.criterion,
				judgment.verdict,
				judgment.references,
			]),
		).toEqual([
			['complete', 'operational', 'achieved', ['trials/complete/attempt.json']],
			['complete', 'meaning', 'unknown', []],
			['complete', 'source', 'achieved', ['trials/complete/evidence.jsonl#2']],
			[
				'complete',
				'lookup',
				'unsuccessful',
				['trials/complete/attempt.json', 'trials/complete/evidence.jsonl'],
			],
			['complete', 'result', 'unsuccessful', ['trials/complete/attempt.json']],
			['faulted', 'operational', 'unsuccessful', ['trials/faulted/attempt.json']],
			['faulted', 'meaning', 'unknown', []],
			['faulted', 'source', 'unknown', []],
			['faulted', 'lookup', 'unknown', []],
			['faulted', 'result', 'unknown', []],
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
})
