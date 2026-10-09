import type { LedgerAgentOptions, LedgerOptions } from '@src/core'
import { Classifier, Gauge, Ledger, LEDGER_QUESTIONS, createLedger } from '@src/core'
import { createTool } from '@orkestrel/tool'
import { beforeEach, describe, expect, expectTypeOf, it } from 'vitest'
import { RecordingJudge, createScriptedProvider } from '../../../setup.js'

describe('createLedger', () => {
	let options: LedgerOptions
	beforeEach(() => {
		options = {
			judge: new RecordingJudge(),
			system: 'Serve the desk.',
			questions: LEDGER_QUESTIONS,
			thresholds: { category: 0.7, topic: 0.8, correction: 0.3, amends: 0.8, supersedes: 0.8 },
			topics: [],
			capacity: 4096,
			gauge: { scale: 1, fixed: 0 },
		}
	})
	it('exports the entity, classifier, gauge, and factory through the core barrel', () => {
		expectTypeOf<LedgerAgentOptions>().not.toHaveProperty('strict')
		const ledger = createLedger(createScriptedProvider([]), options)
		expect(ledger).toBeInstanceOf(Ledger)
		expect(Classifier).toBeTypeOf('function')
		expect(new Gauge({ scale: 1, fixed: 0, capacity: 4096 }).scale).toBe(1)
		expect(ledger.conversation.summarizable).toBe(false)
		expect(ledger.agent.context.conversations.count).toBe(1)
	})
	it('checks missing threshold keys on both construction routes', () => {
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
	it('validates constructor options without relying on the factory', () => {
		const provider = createScriptedProvider([])
		const { gauge: _gauge, ...bare } = options
		expect(() => new Ledger(provider, { ...bare, capacity: -1 })).toThrow(
			expect.objectContaining({ code: 'CAPACITY' }),
		)
		expect(
			() => new Ledger(provider, { ...options, thresholds: { ...options.thresholds, topic: 0 } }),
		).toThrow(expect.objectContaining({ code: 'THRESHOLD' }))
		expect(() => new Ledger(provider, { ...options, share: { tail: 0 } })).toThrow(
			expect.objectContaining({ code: 'SHARE' }),
		)
		expect(() => new Ledger(provider, { ...options, agent: { limit: -1 } })).toThrow(
			expect.objectContaining({ code: 'LIMIT' }),
		)
		expect(() => new Ledger(provider, { ...options, recall: { limit: -1 } })).toThrow(
			expect.objectContaining({ code: 'LIMIT' }),
		)
		expect(
			() => new Ledger(provider, { ...options, topics: [{ name: '', criterion: '' }] }),
		).toThrow(expect.objectContaining({ code: 'TOPIC' }))
		expect(
			() =>
				new Ledger(provider, {
					...options,
					lookups: [
						{ tool: createTool({ name: 'recall', execute: () => '' }), read: () => undefined },
					],
				}),
		).toThrow(expect.objectContaining({ code: 'LOOKUP' }))
		expect(() => new Ledger(provider, { ...options, gauge: { scale: 0, fixed: 0 } })).toThrow(
			expect.objectContaining({ code: 'GAUGE' }),
		)
	})
	it('rejects every threshold outside (0, 1] with THRESHOLD', () => {
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
	it('rejects shares, capacity, and limits with their matching codes and accepts zero limits', () => {
		for (const value of [0, -1, 1.1, NaN, Infinity]) {
			expect(() =>
				createLedger(createScriptedProvider([]), { ...options, share: { prompt: value } }),
			).toThrow(expect.objectContaining({ code: 'SHARE' }))
			expect(() =>
				createLedger(createScriptedProvider([]), { ...options, share: { tail: value } }),
			).toThrow(expect.objectContaining({ code: 'SHARE' }))
		}
		for (const value of [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
			expect(() =>
				createLedger(createScriptedProvider([]), { ...options, capacity: value }),
			).toThrow(expect.objectContaining({ code: 'CAPACITY' }))
		for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
			expect(() =>
				createLedger(createScriptedProvider([]), { ...options, recall: { limit: value } }),
			).toThrow(expect.objectContaining({ code: 'LIMIT' }))
			expect(() =>
				createLedger(createScriptedProvider([]), { ...options, agent: { limit: value } }),
			).toThrow(expect.objectContaining({ code: 'LIMIT' }))
		}
		expect(() =>
			createLedger(createScriptedProvider([]), {
				...options,
				recall: { limit: 0 },
				agent: { limit: 0 },
			}),
		).not.toThrow()
	})
	it('rejects empty or duplicate topics and duplicate or reserved lookup names', () => {
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
		const lookup = {
			tool: createTool({ name: 'lookup', execute: () => 'found' }),
			read: () => undefined,
		}
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
	it('refuses invalid supplied gauge values', () => {
		for (const scale of [0, -1, NaN, Infinity])
			expect(() =>
				createLedger(createScriptedProvider([]), { ...options, gauge: { scale, fixed: 0 } }),
			).toThrow(expect.objectContaining({ code: 'GAUGE' }))
		for (const fixed of [-1, NaN, Infinity])
			expect(() =>
				createLedger(createScriptedProvider([]), { ...options, gauge: { scale: 1, fixed } }),
			).toThrow(expect.objectContaining({ code: 'GAUGE' }))
	})
})
