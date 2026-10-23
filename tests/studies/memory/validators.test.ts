import { describe, expect, it } from 'vitest'
import {
	buildStudyMemoryRoles,
	isStudyMemoryArm,
	isStudyMemoryAssertion,
	isStudyMemoryClassifier,
	isStudyMemoryInput,
	isStudyMemoryLedger,
	isStudyMemoryOptions,
	isStudyMemoryProvider,
	isStudyMemoryRuntime,
} from '../../../studies/memory/index.js'
import { buildMemoryProfile, STUDY_MEMORY_MODULES } from '../../setupStudy.js'

describe('memory declaration and mechanical evidence', () => {
	it('admits explicit metadata and complete ordered recording settings through Study guards', () => {
		const policy = buildStudyMemoryRoles(
			buildMemoryProfile({ url: 'http://127.0.0.1:1' }),
			'records',
		).agent
		const metadata = { calls: 8, bytes: 65536, duration: 2000 }
		const step = {
			ordinal: 1,
			goal: 'opening',
			role: 'agent',
			path: '/api/chat',
			policy,
			admission: 'capture',
			bytes: 100,
		}
		const settings = { version: 'fixture-1', metadata, procedure: [step] }
		expect(isStudyMemoryOptions(settings)).toBe(true)
		expect(isStudyMemoryOptions({ metadata })).toBe(true)
		for (const invalid of [
			{ ...settings, metadata: { ...metadata, calls: 0 } },
			{ ...settings, metadata: { ...metadata, duration: Number.NaN } },
			{ ...settings, version: '' },
			{ ...settings, version: undefined },
			{ ...settings, procedure: undefined },
			{ ...settings, metadata: undefined },
			{ ...settings, procedure: [] },
			{ ...settings, procedure: [{ ...step, ordinal: 2 }] },
			{ ...settings, procedure: [{ ...step, body: undefined }] },
			{ ...settings, procedure: [{ ...step, bytes: 0 }] },
		])
			expect(isStudyMemoryOptions(invalid)).toBe(false)
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
			expect([label, isStudyMemoryOptions(value)]).toEqual([label, true])
		for (const [label, value] of refused)
			expect([label, isStudyMemoryOptions(value)]).toEqual([label, false])
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
		const record = { id: 'one', name: 'Owner', content: 'fact' }
		expect(
			isStudyMemoryInput({ prompt: 'request', arrivals: [], records: [record, { ...record }] }),
		).toBe(false)
		// An arrival and a record may share an identifier: each list holds its own namespace.
		expect(
			isStudyMemoryInput({
				prompt: 'request',
				arrivals: [{ id: 'one', content: 'fact' }],
				records: [record],
			}),
		).toBe(true)
		expect(isStudyMemoryInput({ prompt: 'x'.repeat(16385), arrivals: [], records: [] })).toBe(false)
		expect(isStudyMemoryRuntime({})).toBe(false)
		expect(isStudyMemoryProvider({})).toBe(false)
		expect(isStudyMemoryArm('records')).toBe(true)
		expect(isStudyMemoryArm('unsupported')).toBe(false)
		expect(isStudyMemoryAssertion({ observation: 'result', partial: false })).toBe(true)
		expect(isStudyMemoryAssertion({ observation: 'result', partial: 'false' })).toBe(false)
	})
})
