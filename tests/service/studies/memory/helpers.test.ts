import { describe, expect, it } from 'vitest'
import {
	gradeStudyMemory,
	isStudyMemoryArm,
	isStudyMemoryAssertion,
	isStudyMemoryInput,
	isStudyMemoryProvider,
	isStudyMemorySubject,
	readStudyMemoryRequest,
	readStudyMemorySupport,
	readStudyMemoryTerminal,
	validateStudyMemoryInventory,
	validateStudyMemoryCompletion,
	validateStudyMemoryProfile,
} from '../../../../studies/memory/index.js'
import { buildMemoryProfile } from '../../../setupService.js'

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

	it('keeps semantic criteria unknown and permits nonfault partial products for operational capacity', () => {
		const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
		const trial = { id: 'trial', arm: 'full', scenario: 'desk', repetition: 0 }
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
				schedule: [trial],
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
				],
			},
			attempts: [
				{
					trial,
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
			],
			evidence: { trial: [{ event: 'arrival', goal: 'goal', value: { id: 'receipt' } }] },
		})
		expect(judgments.map((judgment) => judgment.verdict)).toEqual([
			'achieved',
			'unknown',
			'achieved',
		])
		expect(judgments[2]?.references).toEqual(['trial:evidence:0'])
	})
})
