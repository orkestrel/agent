import type { LedgerAgentOptions, LedgerLookup, LedgerOptions, LedgerTopic } from '@src/core'
import { Classifier, Gauge, Ledger, createLedger } from '@src/core'
import { isContractError } from '@orkestrel/contract'
import { captureError, invokeUnchecked } from '@orkestrel/test'
import { createTool } from '@orkestrel/tool'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
	LEDGER_INVALID_LIMITS,
	buildLedgerOptions,
	buildProviderModelRefusals,
	createEmptyLedgerLookup,
	createScriptedProvider,
} from '../../../setup.js'

describe('createLedger', () => {
	it('exports the entity, classifier, gauge, and factory through the core barrel', () => {
		const options = buildLedgerOptions({ topics: [], lookups: [] })
		expectTypeOf<LedgerAgentOptions>().not.toHaveProperty('strict')
		expectTypeOf<LedgerOptions>().not.toHaveProperty('recall')
		expectTypeOf<LedgerOptions>().not.toHaveProperty('correction')
		expectTypeOf<LedgerOptions['predict']>().toEqualTypeOf<number>()
		expectTypeOf<LedgerAgentOptions>().toHaveProperty('authority')
		expectTypeOf<LedgerAgentOptions>().not.toHaveProperty('budget')
		expectTypeOf<LedgerAgentOptions>().not.toHaveProperty('signal')
		expectTypeOf<LedgerAgentOptions>().not.toHaveProperty('error')
		expectTypeOf<LedgerAgentOptions>().toHaveProperty('instructions')
		expectTypeOf<LedgerAgentOptions>().toHaveProperty('skills')
		expectTypeOf<LedgerAgentOptions>().toHaveProperty('memos')
		expectTypeOf<LedgerAgentOptions>().toHaveProperty('workspaces')
		expectTypeOf<LedgerAgentOptions>().toHaveProperty('scheduler')
		expectTypeOf<LedgerOptions>().not.toHaveProperty('notes')
		expectTypeOf<Gauge>().not.toHaveProperty('measure')
		const ledger = createLedger(createScriptedProvider([]), options)
		expect(ledger).toBeInstanceOf(Ledger)
		expect(Classifier).toBeTypeOf('function')
		expect(new Gauge({ scale: 1, overhead: 0, capacity: 4096, predict: 1 }).scale).toBe(1)
		expect(ledger.agent.context.conversations.count).toBe(1)
	})
	it('exports no deterministic judge matcher, recall limit default, cause renderer, or predict default resolver', async () => {
		const core = await import('@src/core')
		expect(
			[
				'DETERMINISTIC_JUDGE_ERROR',
				'DEFAULT_RECALL_LIMIT',
				'renderCauseChain',
				'resolvePredict',
			].filter((name) => Object.hasOwn(core, name)),
		).toEqual([])
		expect(core.LEDGER_RECALL_LIMIT).toBe(4)
	})
	it('checks missing threshold keys on both construction routes', () => {
		const options = buildLedgerOptions({ topics: [], lookups: [] })
		for (const key of ['category', 'topic', 'correction', 'amends', 'supersedes']) {
			const thresholds = { ...options.thresholds }
			Reflect.deleteProperty(thresholds, key)
			expect(() => createLedger(createScriptedProvider([]), { ...options, thresholds })).toThrow(
				expect.objectContaining({ code: 'THRESHOLD' }),
			)
			expect(() => new Ledger(createScriptedProvider([]), { ...options, thresholds })).toThrow(
				expect.objectContaining({ code: 'THRESHOLD' }),
			)
		}
	})
	it('rejects every threshold outside (0, 1] with THRESHOLD', () => {
		const options = buildLedgerOptions({ topics: [], lookups: [] })
		for (const key of Object.keys(options.thresholds))
			for (const value of [0, -0, -1, 1.01, NaN, Infinity, -Infinity])
				expect(() =>
					createLedger(createScriptedProvider([]), {
						...options,
						thresholds: { ...options.thresholds, [key]: value },
					}),
				).toThrow(expect.objectContaining({ code: 'THRESHOLD' }))
		expect(() =>
			createLedger(createScriptedProvider([]), {
				...options,
				thresholds: { category: 1, topic: 1, correction: 1, amends: 1, supersedes: 1 },
			}),
		).not.toThrow()
	})
	it('rejects shares, capacity, a generation cap, and an agent limit with their matching codes', () => {
		const options = buildLedgerOptions({ topics: [], lookups: [] })
		for (const value of [0, -1, 1.1, NaN, Infinity]) {
			expect(() =>
				createLedger(createScriptedProvider([]), { ...options, share: { prompt: value } }),
			).toThrow(expect.objectContaining({ code: 'SHARE' }))
			expect(() =>
				createLedger(createScriptedProvider([]), { ...options, share: { skills: value } }),
			).toThrow(expect.objectContaining({ code: 'SHARE' }))
		}
		for (const value of [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
			expect(() =>
				createLedger(createScriptedProvider([]), { ...options, capacity: value }),
			).toThrow(expect.objectContaining({ code: 'CAPACITY' }))
		for (const value of LEDGER_INVALID_LIMITS)
			expect(() =>
				createLedger(createScriptedProvider([]), { ...options, agent: { limit: value } }),
			).toThrow(expect.objectContaining({ code: 'LIMIT' }))
		expect(() =>
			createLedger(createScriptedProvider([]), { ...options, agent: { limit: 0 } }),
		).toThrow(expect.objectContaining({ code: 'LIMIT' }))
	})
	it('refuses a generation cap that is absent, zero, or not a positive safe integer under capacity, and accepts its boundaries', () => {
		const { predict: _predict, ...absent } = buildLedgerOptions({ topics: [], lookups: [] })
		const options = { ...absent, capacity: 4096 }
		expect(
			captureError(() =>
				createLedger(
					createScriptedProvider([]),
					invokeUnchecked(undefined, Object.assign, [{}, options]),
				),
			),
		).toMatchObject({ code: 'CAPACITY' })
		for (const predict of [0, -0, -1, 0.5, NaN, Infinity, 4096, 4097])
			expect(
				captureError(() => createLedger(createScriptedProvider([]), { ...options, predict })),
			).toMatchObject({
				code: 'CAPACITY',
			})
		for (const predict of [1, 4095])
			expect(() => createLedger(createScriptedProvider([]), { ...options, predict })).not.toThrow()
	})
	it.each(['recall', 'correction'])(
		'refuses a %s member as one LedgerOptions does not declare',
		(member) => {
			const error = captureError(() =>
				createLedger(
					createScriptedProvider([]),
					invokeUnchecked(undefined, Object.assign, [
						{},
						buildLedgerOptions({ topics: [], lookups: [] }),
						{ [member]: {} },
					]),
				),
			)

			expect(isContractError(error) ? [error.code, error.context] : error).toEqual([
				'structure',
				{ path: [member], shape: 'LedgerOptions' },
			])
		},
	)
	it('rejects empty or duplicate topics and duplicate or reserved lookup names', () => {
		const options = buildLedgerOptions({ topics: [], lookups: [] })
		for (const name of ['', '  '])
			expect(() =>
				createLedger(createScriptedProvider([]), {
					...options,
					topics: [{ name, criterion: 'desk' }],
				}),
			).toThrow(expect.objectContaining({ code: 'TOPIC' }))
		expect(() =>
			createLedger(createScriptedProvider([]), {
				...options,
				topics: [
					{ name: 'desk', criterion: 'a' },
					{ name: 'desk', criterion: 'b' },
				],
			}),
		).toThrow(expect.objectContaining({ code: 'TOPIC' }))
		const lookup = createEmptyLedgerLookup()
		expect(() =>
			createLedger(createScriptedProvider([]), { ...options, lookups: [lookup, lookup] }),
		).toThrow(expect.objectContaining({ code: 'LOOKUP' }))
		expect(() =>
			createLedger(createScriptedProvider([]), {
				...options,
				lookups: [{ ...lookup, tool: createTool({ name: 'recall', execute: () => '' }) }],
			}),
		).toThrow(expect.objectContaining({ code: 'LOOKUP' }))
	})
	it('refuses a hole in the topic or lookup list, as a for…of visits it as an undefined entry', () => {
		const options = buildLedgerOptions({ topics: [], lookups: [] })
		const topics: LedgerTopic[] = []
		topics[1] = { name: 'desk', criterion: 'a' }
		const lookups: LedgerLookup[] = []
		lookups.length = 2
		expect(
			captureError(() => createLedger(createScriptedProvider([]), { ...options, topics })),
		).toBeInstanceOf(TypeError)
		expect(
			captureError(() => createLedger(createScriptedProvider([]), { ...options, lookups })),
		).toBeInstanceOf(TypeError)
	})
	it('refuses a provider whose model is missing, empty, or not a string with a placement ContractError', () => {
		const options = buildLedgerOptions({ topics: [], lookups: [] })
		const refusals = buildProviderModelRefusals()
		expect(
			refusals.map(([title, provider]) => {
				const error = captureError(() =>
					invokeUnchecked(undefined, createLedger, [provider, options]),
				)
				return [title, isContractError(error) ? [error.code, error.message, error.context] : error]
			}),
		).toEqual(
			refusals.map(([title, , received]) => [
				title,
				[
					'placement',
					`Ledger: provider.model must be a non-empty string naming the model the provider serves; received ${received}`,
					{ path: ['provider', 'model'], limit: 'non-empty string', received },
				],
			]),
		)
		expect(createLedger(createScriptedProvider([], { model: 'qwen3:4b' }), options).gauge).toEqual(
			options.gauge,
		)
	})
	it('refuses invalid supplied gauge values', () => {
		const options = buildLedgerOptions({ topics: [], lookups: [] })
		for (const scale of [0, -1, NaN, Infinity])
			expect(() =>
				createLedger(createScriptedProvider([]), { ...options, gauge: { scale, overhead: 0 } }),
			).toThrow(expect.objectContaining({ code: 'GAUGE' }))
		for (const overhead of [-1, NaN, Infinity])
			expect(() =>
				createLedger(createScriptedProvider([]), { ...options, gauge: { scale: 1, overhead } }),
			).toThrow(expect.objectContaining({ code: 'GAUGE' }))
	})
})
