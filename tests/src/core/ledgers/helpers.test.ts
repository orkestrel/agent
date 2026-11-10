import type {
	GaugeCall,
	LedgerLine,
	LedgerLookupFinding,
	LedgerOwner,
	LedgerRecord,
} from '../../../../src/core/ledgers/types.js'
import type { Message } from '@src/core'
import {
	collectRecallMessages,
	collectRetiredFindings,
	matchesLookup,
	hasHiddenRecall,
	computeLedgerChecksum,
	digestLedgerTools,
	digestLedgerWindow,
	buildLedgerCut,
	buildLedgerLineKey,
	collectLedgerLines,
	collectLedgerReplies,
	collectLedgerEvidence,
	buildLedgerIndex,
	buildRecallMessage,
	buildRequestMessage,
	collectProjectionIds,
	extractWords,
	findLedgerCut,
	renderCauseChain,
	renderTopicNames,
	scanAmendments,
	splitWords,
	buildLines,
	buildLedgerRenderContext,
	renderLedgerAnnotation,
	buildRecords,
	collectLive,
	collectNames,
	collectRegistry,
	collectAmendments,
	collectWriteSupersessions,
	computeThinking,
	resolvePredict,
	findLedgerCall,
	rankLedgerCut,
	cutListing,
	fitSlope,
	identifyLookup,
	linkOwners,
	matchEntities,
	matchesCutLine,
	mergeSupersessions,
	normalizeArgument,
	normalizeWord,
	placeMember,
	renderLedgerPinned,
	renderLedgerRecord,
	renderLookupCall,
	renderStub,
	selectRecords,
	splitResultLines,
	splitSentences,
	splitTopic,
} from '../../../../src/core/ledgers/helpers.js'
import { captureError, createRecorder, requireValue } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import {
	throwProxyRead,
	buildGaugeCall,
	measureRoom,
	LEDGER_EMPTY_FOUND,
	buildLedgerClassification,
	buildLedgerInput,
	buildLedgerMessage,
	buildLedgerFinding,
	buildLedgerWriteScenario,
	LEDGER_WRITE_SUPERSESSIONS,
	checkLedgerProjection,
	createLedgerDesk,
	createLedgerRequest,
	LEDGER_DESK_OWNERS,
	LEDGER_DESK_SYSTEM,
	LEDGER_HANDLE,
	LEDGER_OWNER_PROJECTION,
	buildLedgerLine,
	replaceLedgerRecord,
} from '../../../setup.js'

describe('extracted ledger leaves', () => {
	it('matches successful canonical lookup copies but not changes empty results or unkeyable calls', () => {
		const first = buildLedgerFinding(
			'first',
			'lookup',
			{ id: 'BW-1' },
			'One. Two.',
			LEDGER_EMPTY_FOUND,
		)
		const copy = { ...first, id: 'copy' }
		expect(matchesLookup(first, copy)).toBe(true)
		for (const changed of [
			{ ...copy, text: 'Other.' },
			{ ...copy, arguments: { id: 'BW-2' } },
			{ ...copy, result: undefined },
			{ ...copy, name: 'other' },
		])
			expect(matchesLookup(first, changed)).toBe(false)
		const unkeyable = { ...first, arguments: { id: 1n } }
		expect(matchesLookup(unkeyable, unkeyable)).toBe(true)
		expect(matchesLookup(unkeyable, { ...unkeyable, id: 'copy' })).toBe(false)
	})
	it('detects each eligible hidden origin including quiet statements but not current turns or notes', () => {
		const messages: readonly Message[] = [
			buildLedgerMessage('fact', 'user', 'Parcel closed. Receipt sealed.'),
			buildLedgerMessage('tool', 'tool', 'Found a parcel. Receipt signed.'),
			buildLedgerMessage('request', 'user', 'Check parcel.'),
			buildLedgerMessage('reply', 'assistant', 'It is sealed.'),
			buildLedgerMessage('quiet', 'user', 'Thanks.'),
			buildLedgerMessage('note', 'user', 'Answer now.'),
			buildLedgerMessage('blank', 'assistant', '  '),
			{
				...buildLedgerMessage('caller', 'assistant', 'Calling.'),
				calls: [{ id: 'call', name: 'lookup', arguments: {} }],
			},
			buildLedgerMessage('unread', 'tool', 'Unfiled.'),
			buildLedgerMessage('current', 'user', 'Shorten.'),
			buildLedgerMessage('turn', 'assistant', 'Current turn.'),
		]
		const input = buildLedgerInput({
			messages,
			findings: [
				buildLedgerFinding(
					'tool',
					'lookup',
					{},
					'Found a parcel. Receipt signed.',
					LEDGER_EMPTY_FOUND,
				),
			],
			classification: { quiet: ['quiet'] },
		})
		const requests = new Set(['request', 'current'])
		const notes = new Set(['note'])
		expect(collectRecallMessages(input, requests, notes).map((message) => message.id)).toEqual([
			'fact',
			'tool',
			'request',
			'reply',
			'quiet',
			'current',
			'turn',
		])
		expect(hasHiddenRecall(input, 'current', requests, notes, messages, [])).toBe(false)
		for (const id of ['fact', 'tool', 'request', 'reply', 'quiet']) {
			const present = messages.filter((message) => message.id !== id)
			expect(hasHiddenRecall(input, 'current', requests, notes, present, [])).toBe(true)
		}
		for (const id of ['fact', 'tool']) {
			const present = messages.filter((message) => message.id !== id)
			const lines = [0, 1].map((sentence) => ({ key: '', title: '', source: id, sentence }))
			expect(hasHiddenRecall(input, 'current', requests, notes, present, lines)).toBe(false)
			expect(hasHiddenRecall(input, 'current', requests, notes, present, lines.slice(0, 1))).toBe(
				true,
			)
		}
		const stub = messages.map((message) =>
			message.id === 'tool'
				? { ...message, content: 'result not shown; call recall with parcel' }
				: message,
		)
		expect(hasHiddenRecall(input, 'current', requests, notes, stub, [])).toBe(true)
		expect(
			hasHiddenRecall(
				input,
				'current',
				requests,
				notes,
				messages.filter((message) => !['note', 'current', 'turn'].includes(message.id)),
				[],
			),
		).toBe(false)
		expect(hasHiddenRecall(input, 'absent', requests, notes, [], [])).toBe(false)
	})

	it('leaves findings a write retired or a later read replaced out of the recall offer', () => {
		const input = buildLedgerInput(buildLedgerWriteScenario())
		expect(collectRecallMessages(input, new Set(), new Set()).map((message) => message.id)).toEqual(
			['request', 'other', 'final', 'after', 'noop'],
		)
	})

	it('collects findings a write superseded or a later finding of the same lookup replaced', () => {
		const scenario = buildLedgerWriteScenario()
		expect(collectRetiredFindings(scenario.messages, scenario.findings)).toEqual(
			new Set(['read', 'order', 'missing', 'list', 'write', 'rewrite']),
		)
		const messages = ['first', 'second', 'third'].map((id) => buildLedgerMessage(id, 'tool', id))
		const first = buildLedgerFinding('first', 'lookup', { id: 'BW-1' }, 'One.', LEDGER_EMPTY_FOUND)
		const changed = buildLedgerFinding(
			'second',
			'lookup',
			{ id: ' bw-1' },
			'Two.',
			LEDGER_EMPTY_FOUND,
		)
		expect(collectRetiredFindings(messages, [first, changed])).toEqual(new Set(['first']))
		expect(
			collectRetiredFindings(messages, [first, { ...changed, arguments: { id: 'BW-2' } }]),
		).toEqual(new Set())
		expect(collectRetiredFindings(messages, [first, { ...changed, text: 'One.' }])).toEqual(
			new Set(),
		)
		expect(
			collectRetiredFindings(messages, [
				first,
				{ ...changed, text: 'No record.', result: undefined },
			]),
		).toEqual(new Set(['first']))
		expect(collectRetiredFindings(messages, [first, changed, { ...first, id: 'third' }])).toEqual(
			new Set(['first', 'second']),
		)
		const unkeyable = { ...first, arguments: { id: 1n } }
		expect(
			collectRetiredFindings(messages, [unkeyable, { ...unkeyable, id: 'second', text: 'Two.' }]),
		).toEqual(new Set())
		expect(collectRetiredFindings(messages.slice(1), [first, changed])).toEqual(new Set())
	})

	it('computes two FNV-1a lanes whose first is the standard 32-bit hash of ASCII text', () => {
		// The published 32-bit FNV-1a vectors: the offset basis for '', 0xe40c292c for 'a', and
		// 0xbf9cf968 for 'foobar'; the second lane starts from the offset 3335557771.
		expect(computeLedgerChecksum('').slice(0, 8)).toBe('811c9dc5')
		expect(computeLedgerChecksum('a').slice(0, 8)).toBe('e40c292c')
		expect(computeLedgerChecksum('foobar').slice(0, 8)).toBe('bf9cf968')
		expect(computeLedgerChecksum('').slice(8)).toBe((3335557771).toString(16))
		expect(computeLedgerChecksum('Refund due $148.50.')).toMatch(/^[0-9a-f]{16}$/)
		expect(computeLedgerChecksum('Refund due $148.50.')).not.toBe(
			computeLedgerChecksum('Refund due $148.60.'),
		)
	})
	it('digests tool definitions as JSON renders them, in order', () => {
		const lookup = { name: 'lookup_order', description: 'Read an order by its id.' }
		const write = {
			name: 'update_order',
			description: "Set an order's refund.",
			parameters: { type: 'object', properties: { id: { type: 'string' } } },
			annotations: { consequential: true },
		}
		const digest = requireValue(digestLedgerTools([lookup]))
		expect(digest).toBe('1eff754a69b7128c')
		expect(digestLedgerTools([{ ...lookup }])).toBe(digest)
		expect(
			digestLedgerTools([{ ...lookup, parameters: { type: 'object', title: undefined } }]),
		).toBe(digestLedgerTools([{ ...lookup, parameters: { type: 'object' } }]))
		expect(digestLedgerTools([lookup, write])).not.toBe(digest)
		expect(digestLedgerTools([write, lookup])).not.toBe(digestLedgerTools([lookup, write]))
		expect(digestLedgerTools([])).not.toBe(digest)
		expect(digestLedgerTools([{ ...lookup, description: 'Read an order by id.' }])).not.toBe(digest)
		expect(digestLedgerTools([{ ...lookup, parameters: { limit: 10n } }])).toBeUndefined()
	})
	it('includes every receipt field in the window digest', () => {
		const messages = [
			buildLedgerMessage('request', 'user', 'Check.'),
			buildLedgerMessage('reply', 'assistant', 'Done.'),
			buildLedgerMessage('source', 'user', 'One. Two.'),
		]
		const line = { key: 'record', title: 'Record', source: 'source', sentence: 0 }
		const entry = { request: 'request', reply: 'reply', copy: 'One.', lines: [line] }
		const digest = requireValue(digestLedgerWindow([entry], messages))
		for (const changed of [
			{ ...line, key: 'other' },
			{ ...line, title: 'Other' },
			{ ...line, sentence: 1 },
		])
			expect(digestLedgerWindow([{ ...entry, lines: [changed] }], messages)).not.toBe(digest)
	})

	it('digests each held message and copy canonically and refuses unencodable messages', () => {
		const exchanges = [
			{
				request: 'request',
				reply: 'reply',
				copy: 'copy',
				lines: [{ key: '', title: '', source: 'source', sentence: 0 }],
			},
		]
		const messages = ['request', 'reply', 'source'].map((id) => ({
			id,
			role: 'user' as const,
			content: id,
		}))
		const digest = requireValue(digestLedgerWindow(exchanges, messages))
		expect(digest).toBe('ed478e691ef87403')
		expect(digest).toMatch(/^[0-9a-f]{16}$/)
		for (const target of messages)
			expect(
				digestLedgerWindow(
					exchanges,
					messages.map((message) =>
						message === target ? { ...message, content: 'changed' } : message,
					),
				),
			).not.toBe(digest)
		expect(
			digestLedgerWindow([{ ...requireValue(exchanges[0]), copy: 'changed' }], messages),
		).not.toBe(digest)
		expect(
			digestLedgerWindow(
				exchanges,
				messages.map(({ id, role, content }) => ({ content, role, id })),
			),
		).toBe(digest)
		const called: Message[] = [
			...messages,
			{
				id: 'caller',
				role: 'assistant',
				content: '',
				calls: [{ id: 'call', name: 'lookup', arguments: { id: 'BW-1' } }],
			},
			{ id: 'result', role: 'tool', call: 'call', content: 'Found.' },
		]
		const lookedUp = [
			{
				request: 'request',
				reply: 'reply',
				lines: [{ key: '', title: '', source: 'result', sentence: 0 }],
			},
		]
		expect(
			digestLedgerWindow(
				lookedUp,
				called.map((message) =>
					message.id === 'caller'
						? { ...message, calls: [{ id: 'call', name: 'lookup', arguments: { id: 'REDACTED' } }] }
						: message,
				),
			),
		).not.toBe(digestLedgerWindow(lookedUp, called))
		expect(digestLedgerWindow(exchanges, [])).toBeUndefined()
		const unreadable = Object.defineProperty({}, 'value', { enumerable: true, get: throwProxyRead })
		const cycle: Record<string, unknown> = {}
		cycle.self = cycle
		for (const value of [unreadable, cycle]) {
			expect(
				digestLedgerWindow(
					exchanges,
					messages.map((message) => ({
						...message,
						calls: [{ id: 'call', name: 'lookup', arguments: { value } }],
					})),
				),
			).toBeUndefined()
		}
		expect(
			digestLedgerWindow(
				exchanges,
				messages.map((message) => ({
					...message,
					calls: [{ id: 'call', name: 'lookup', arguments: { value: 1n } }],
				})),
			),
		).toBeUndefined()
	})
	it('filters receipts by placement and sentence rather than text or source alone', () => {
		const line: LedgerLine = {
			text: 'Same words.',
			source: 'one',
			sentence: 0,
			topics: [],
			role: 'user',
		}
		const record: LedgerRecord = {
			key: 'owner:one',
			title: 'One',
			members: ['one'],
			lines: [line, { ...line, sentence: 1 }, { ...line, source: 'two' }],
		}
		const held = new Set([buildLedgerLineKey({ ...line, key: record.key, title: record.title })])
		expect(collectLedgerLines(record, held).map((entry) => [entry.source, entry.sentence])).toEqual(
			[
				['one', 1],
				['two', 0],
			],
		)
		expect(collectLedgerLines({ ...record, title: 'Other' }, held)).toHaveLength(3)
		expect(collectLedgerLines({ ...record, key: 'owner:two' }, held)).toHaveLength(3)
		expect(record.lines).toHaveLength(3)
	})

	it('pairs replies only across ledger-note separation and rejects a blank final answer', () => {
		const messages: readonly Message[] = [
			{ id: 'request', role: 'user', content: 'Request.' },
			{ id: 'partial', role: 'assistant', content: 'Partial.' },
			{ id: 'note', role: 'user', content: 'Answer.' },
			{ id: 'final', role: 'assistant', content: 'Final.' },
		]
		expect(collectLedgerReplies(messages, new Set(['request']), new Set()).size).toBe(0)
		expect(
			collectLedgerReplies(messages, new Set(['request']), new Set(['note'])).get('request')?.id,
		).toBe('final')
		expect(
			collectLedgerReplies(
				[...messages, { id: 'blank', role: 'assistant', content: ' ' }],
				new Set(['request']),
				new Set(['note']),
			).size,
		).toBe(0)
	})

	it('captures changed and removed source bytes and added or removed touching edges', () => {
		const message: Message = { id: 'one', role: 'user', content: 'Original.' }
		const sources = new Set(['one'])
		const original = collectLedgerEvidence([message], sources, [])
		expect(collectLedgerEvidence([{ ...message, content: 'Changed.' }], sources, [])).not.toEqual(
			original,
		)
		expect(collectLedgerEvidence([], sources, [])).not.toEqual(original)
		expect(
			collectLedgerEvidence([message], sources, [{ earlier: 'one', later: 'two' }]),
		).not.toEqual(original)
		expect(
			collectLedgerEvidence([message], sources, [{ earlier: 'three', later: 'four' }]),
		).toEqual(original)
	})
	it('collects placed and orphan ids without duplicates', () => {
		expect([
			...collectProjectionIds({
				records: [{ key: 'rules', title: 'Rules', members: ['same', 'placed'], lines: [] }],
				amendments: [],
				orphans: ['same', 'orphan'],
			}),
		]).toEqual(['same', 'orphan', 'placed'])
		expect([...collectProjectionIds({ records: [], amendments: [], orphans: [] })]).toEqual([])
	})

	it('walks amendments breadth first, cuts refused branches, and closes cycles', () => {
		const amendments = new Map([
			['start', ['left', 'right', 'blocked']],
			['left', ['shared']],
			['right', ['shared', 'start']],
			['blocked', ['hidden']],
		])
		expect(scanAmendments(amendments, 'start', (id) => id !== 'blocked')).toEqual([
			'start',
			'left',
			'right',
			'shared',
		])
		expect(scanAmendments(amendments, 'start', () => false)).toEqual([])
		expect(amendments.get('start')).toEqual(['left', 'right', 'blocked'])
	})

	it('builds exact recall framing for empty and populated topics', () => {
		for (const topic of ['', 'refunds'])
			expect(buildRecallMessage(topic)).toEqual({
				id: 'call',
				role: 'assistant',
				content: '',
				calls: [{ id: 'call_00000000', name: 'recall', arguments: { topic } }],
			})
	})

	it('builds a request copy carrying the records ahead of the request and keeps the request', () => {
		const request: Message = {
			id: 'request',
			role: 'user',
			content: 'Check BW-5512.',
			images: ['U0NBTg=='],
		}
		const copy = buildRequestMessage(request, '## Records\n- Refund issued.')

		expect(copy).toEqual({
			id: 'request',
			role: 'user',
			content: '## Records\n- Refund issued.\n\n## Request\nCheck BW-5512.',
			images: ['U0NBTg=='],
		})
		expect(copy).not.toBe(request)
		expect(request.content).toBe('Check BW-5512.')
		expect(buildRequestMessage(request, '')).toBe(request)
	})

	it('renders topic names in order without reading criteria', () => {
		expect(
			renderTopicNames([
				{ name: 'refunds', criterion: 'amounts' },
				{ name: 'shipping', criterion: 'dates' },
			]),
		).toBe('refunds, shipping')
		expect(renderTopicNames([])).toBe('')
	})

	it('renders arbitrary causes and bounds cyclic cause chains', () => {
		expect(renderCauseChain(undefined)).toBe('')
		expect(renderCauseChain(new Error('refused', { cause: 'offline' }))).toBe(
			'Error: refused <- offline',
		)
		const error = new Error('cycle')
		error.cause = error
		expect(renderCauseChain(error)).toBe(
			'Error: cycle <- Error: cycle <- Error: cycle <- Error: cycle',
		)
	})

	it('extracts Unicode words and excludes names at sentence boundaries', () => {
		const result = extractWords({
			id: 'note',
			role: 'user',
			content: 'Odile met Dana. Ask Élodie; Morgan called AA-10.',
		})
		expect([...result.words]).toEqual([
			'odile',
			'met',
			'dana',
			'ask',
			'élodie',
			'morgan',
			'called',
			'aa',
			'10',
		])
		expect([...result.names]).toEqual(['dana', 'élodie'])
		expect(extractWords({ id: 'empty', role: 'user', content: '' })).toEqual({
			words: new Set(),
			names: new Set(),
		})
	})

	it('normalizes recall words without dropping internal punctuation', () => {
		expect(splitWords('  “Refunds,” BW-5512! $148.50  ')).toEqual(['refunds', 'bw-5512', '148.50'])
		expect(splitWords('... $ ')).toEqual([])
	})
})

describe('rankLedgerCut', () => {
	it('ranks name matches before unsettled sources, off-topic corrections, rules, and on-topic sources', () => {
		expect(rankLedgerCut(3, true, 'rule')).toBe(0)
		expect(rankLedgerCut(1, true, 'fact')).toBe(1)
		expect(rankLedgerCut(2, false, 'correction')).toBe(2)
		expect(rankLedgerCut(2, false, 'rule')).toBe(3)
		expect(rankLedgerCut(1, false, 'rule')).toBe(4)
		expect(rankLedgerCut(1, false, undefined)).toBe(4)
	})
})

describe('findLedgerCut', () => {
	it('probes nothing when no step exists', () => {
		const probe = createRecorder<[cut: number]>()
		expect(
			findLedgerCut(0, 0, (cut) => {
				probe.handler(cut)
				return { cut }
			}),
		).toBeUndefined()
		expect(probe.count).toBe(0)
	})

	it('probes only the first cut when it fits', () => {
		const probe = createRecorder<[cut: number]>()
		expect(
			findLedgerCut(0, 2140, (cut) => {
				probe.handler(cut)
				return { cut }
			}),
		).toEqual({ cut: 0 })
		expect(probe.calls).toEqual([[0]])
	})

	it.each([1, 2, 3, 4, 7, 8, 9, 64, 65])('reads as the walk does over %i steps', (count) => {
		const thresholds = Array.from({ length: count + 1 }, (_unused, at) => at)
		expect(
			thresholds.map((threshold) =>
				findLedgerCut(0, count, (cut) => (cut >= threshold ? { cut } : undefined)),
			),
		).toEqual(thresholds.map((at) => (at === count ? undefined : { cut: at })))
	})

	it.each([1, 2, 1071, 1785, 2139, 2140])(
		'takes the winning probe at threshold %i, probing no cut twice and at most 13 cuts',
		(threshold) => {
			const probe = createRecorder<[cut: number]>()
			const found = findLedgerCut(0, 2140, (cut) => {
				probe.handler(cut)
				return cut >= threshold ? { cut } : undefined
			})
			const cuts = probe.calls.map(([cut]) => cut)
			expect(found).toEqual(threshold === 2140 ? undefined : { cut: threshold })
			expect(new Set(cuts).size).toBe(cuts.length)
			expect(cuts.length).toBeLessThanOrEqual(13)
		},
	)
})

describe('buildLedgerCut', () => {
	const kept = { text: 'Kept.', source: 'a', sentence: 0, topics: [], role: 'user' } as const
	const dropped = { text: 'Dropped.', source: 'a', sentence: 1, topics: [], role: 'user' } as const
	const records = [{ key: 'owner', title: 'Owner', members: ['a'], lines: [kept, dropped] }]

	it('leaves every line and source without a step', () => {
		const cut = buildLedgerCut([], records, new Set(['b', 'c']))
		expect(cut.records).toEqual(records)
		expect([...cut.included]).toEqual(['b', 'c'])
	})

	it('drops a step by its line and a step by its source', () => {
		const cut = buildLedgerCut([dropped, 'b'], records, new Set(['b', 'c']))
		expect(cut.records[0]?.lines).toEqual([kept])
		expect(cut.records[0]?.key).toBe('owner')
		expect([...cut.included]).toEqual(['c'])
	})

	it('reads a line by identity, so an equal line in another record stays', () => {
		const copy = structuredClone(dropped)
		const cut = buildLedgerCut(
			[dropped],
			[...records, { key: 'other', title: 'Other', members: ['a'], lines: [copy] }],
			new Set(),
		)
		expect(cut.records[1]?.lines).toEqual([copy])
		expect(cut.records[0]?.lines).toEqual([kept])
	})
})

describe('findLedgerCall', () => {
	it('pairs repeated call ids by position under their own arguments', () => {
		const leader: Message = {
			id: 'leader',
			role: 'assistant',
			content: '',
			calls: [
				{ id: 'c1', name: 'lookup', arguments: { id: 'BW-5512' } },
				{ id: 'c1', name: 'lookup', arguments: { id: 'LH-81660' } },
			],
		}
		const first: Message = { id: 'r1', role: 'tool', call: 'c1', content: 'Brightwater.' }
		const second: Message = { id: 'r2', role: 'tool', call: 'c1', content: 'Lighthouse.' }
		expect(findLedgerCall([leader, first, second], first)?.arguments).toEqual({ id: 'BW-5512' })
		expect(findLedgerCall([leader, first, second], second)?.arguments).toEqual({
			id: 'LH-81660',
		})
	})

	it('pairs by call id and falls back to position only for a wholly idless group', () => {
		const leader: Message = {
			id: 'leader',
			role: 'assistant',
			content: '',
			calls: [
				{ id: 'c1', name: 'first', arguments: {} },
				{ id: 'c2', name: 'second', arguments: {} },
			],
		}
		const first: Message = { id: 'r1', role: 'tool', content: 'First.', call: 'c1' }
		const second: Message = { id: 'r2', role: 'tool', content: 'Second.', call: 'c2' }
		const anonymous: Message = { id: 'r3', role: 'tool', content: 'Anonymous.' }
		const other: Message = { id: 'r4', role: 'tool', content: 'Other.' }
		expect(findLedgerCall([leader, second, first], first)?.name).toBe('first')
		expect(findLedgerCall([leader, second, first], second)?.name).toBe('second')
		expect(findLedgerCall([leader, second, anonymous], anonymous)).toBeUndefined()
		expect(findLedgerCall([leader, anonymous, other], anonymous)?.name).toBe('first')
		expect(findLedgerCall([leader, anonymous, other], other)?.name).toBe('second')
		expect(findLedgerCall([leader, first], second)).toBeUndefined()
		expect(findLedgerCall([first], first)).toBeUndefined()
	})
})

describe('computeThinking', () => {
	it('rounds the character share and caps it at the completion', () => {
		expect(computeThinking({ thinking: 'plan', content: 'ok' }, 10)).toBe(7)
		expect(computeThinking({ thinking: 'a', content: 'bb' }, 10)).toBe(3)
		expect(computeThinking({ thinking: 'a', content: 'b' }, 1)).toBe(1)
		expect(computeThinking({ thinking: 'plan', content: '' }, 10)).toBe(10)
		expect(computeThinking({ thinking: 'plan', content: '' }, 0)).toBe(0)
	})

	it('counts serialized calls and returns zero for absent thinking or an empty generation', () => {
		const calls = [{ id: 'one', name: 'recall', arguments: {} }]
		expect(computeThinking({ content: '' }, 20)).toBe(0)
		expect(computeThinking({ thinking: '', content: '' }, 20)).toBe(0)
		expect(computeThinking({ content: '', calls }, 20)).toBe(0)
		// Calls serialize to 45 characters; the thinking contributes another 45.
		expect(JSON.stringify(calls)).toHaveLength(45)
		expect(computeThinking({ thinking: 'a'.repeat(45), content: '', calls }, 20)).toBe(10)
	})

	it('uses zero call characters when calls cannot serialize', () => {
		expect(
			computeThinking(
				{
					thinking: 'plan',
					content: 'ok',
					calls: [{ id: 'one', name: 'recall', arguments: { count: 1n } }],
				},
				10,
			),
		).toBe(7)
	})
})

describe('resolvePredict', () => {
	it('resolves the default, preserves valid boundaries, and refuses invalid caps', () => {
		expect(resolvePredict(undefined, 4096)).toBe(0)
		for (const predict of [0, -0, 4095]) expect(resolvePredict(predict, 4096)).toBe(predict)
		for (const predict of [-1, 0.5, 4096, 4097, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
			expect(() => resolvePredict(predict, 4096)).toThrow(
				expect.objectContaining({ code: 'CAPACITY' }),
			)
	})
})

// Ledger-owned pure helpers on fictional desk fixtures: the sentence and token readings, lookup identity,
// the registry and entity matching, the record projection with correction and replacement handling, the
// renderers, and the recall leaves (topic split, cut, stub, slope).

describe('splitSentences', () => {
	it('splits at a period, question mark, or exclamation mark before a capital, a digit, or a quote', () => {
		expect(
			splitSentences('Ask Odile. Is it open? Yes! 2026-10-08 is the date. "Quoted" next.'),
		).toEqual(['Ask Odile.', 'Is it open?', 'Yes!', '2026-10-08 is the date.', '"Quoted" next.'])
	})

	it('keeps a decimal point, an id, and an amount inside their sentence', () => {
		expect(
			splitSentences('Refund $148.50 for order BW-5512.5 today. Version 1.2 shipped.'),
		).toEqual(['Refund $148.50 for order BW-5512.5 today.', 'Version 1.2 shipped.'])
	})

	it('trims each sentence and drops the empty ones', () => {
		expect(splitSentences('')).toEqual([])
		expect(splitSentences('   ')).toEqual([])
		expect(splitSentences('  One.   Two.  ')).toEqual(['One.', 'Two.'])
	})

	it('keeps a sentence whose next word is lowercase', () => {
		expect(splitSentences('Call me at 5 p.m. tomorrow.')).toEqual(['Call me at 5 p.m. tomorrow.'])
	})
})

describe('collectNames', () => {
	it('leaves out the run that opens each sentence', () => {
		expect(collectNames('Odile Marlow phoned. We asked about Odile Marlow.')).toEqual([
			'Odile Marlow',
		])
	})

	it('stops a run at punctuation and skips quoted and hyphenated words', () => {
		expect(
			collectNames("We met Odile Marlow's niece, Dana Whitcombe. See 'Kestrel' and Re-Entry."),
		).toEqual(['Odile Marlow', 'Dana Whitcombe'])
	})

	it('returns nothing for a text with one run per sentence start', () => {
		expect(collectNames('')).toEqual([])
		expect(collectNames('Odile Marlow phoned.')).toEqual([])
	})
})

describe('identifyLookup', () => {
	it('names one call whatever the key order at any depth (R8)', () => {
		const left = identifyLookup('lookup_order', {
			id: 'BW-5512',
			filter: { status: 'open', window: { from: 1, to: 2 } },
		})
		const right = identifyLookup('lookup_order', {
			filter: { window: { to: 2, from: 1 }, status: 'open' },
			id: 'BW-5512',
		})
		expect(left).toBe(right)
	})

	it('trims and uppercases a top-level string argument', () => {
		expect(identifyLookup('lookup_order', { id: ' bw-5512 ' })).toBe(
			identifyLookup('lookup_order', { id: 'BW-5512' }),
		)
	})

	it('tells apart a tool name, an argument value, and an array order', () => {
		const base = identifyLookup('lookup_order', {
			id: 'BW-5512',
			tags: ['a', 'b'],
		})
		expect(
			identifyLookup('lookup_customer', {
				id: 'BW-5512',
				tags: ['a', 'b'],
			}),
		).not.toBe(base)
		expect(identifyLookup('lookup_order', { id: 'BW-5513', tags: ['a', 'b'] })).not.toBe(base)
		expect(identifyLookup('lookup_order', { id: 'BW-5512', tags: ['b', 'a'] })).not.toBe(base)
		expect(identifyLookup('lookup_order', { id: 'BW-5512' })).not.toBe(base)
	})

	it('names a call with no arguments', () => {
		expect(identifyLookup('lookup_order', {})).toBe('lookup_order {}')
	})
})

describe('normalizeArgument', () => {
	it('trims and uppercases an argument', () => {
		expect(normalizeArgument(' bw-5512 ')).toBe('BW-5512')
		expect(normalizeArgument('\tOM-30418\n')).toBe('OM-30418')
		expect(normalizeArgument('')).toBe('')
	})

	it('gives identity and owner linking one spelling of an argument', () => {
		const owners = new Map(Object.entries(LEDGER_DESK_OWNERS))
		const spelled = ' bw-20931 '
		const links = linkOwners(
			[
				buildLedgerFinding(
					'tool-1',
					'lookup_customer',
					{ account: spelled },
					'Account BW-20931',
					LEDGER_EMPTY_FOUND,
				),
			],
			owners,
		)
		expect([...links]).toEqual([['BW-20931', 'BW-20931']])
		expect(identifyLookup('lookup_customer', { account: spelled })).toBe(
			'lookup_customer {"account":"BW-20931"}',
		)
	})
})

describe('splitResultLines', () => {
	it('splits at a line feed with or without a carriage return before it', () => {
		expect(splitResultLines('Account BW-20931.\r\nRefund is $148.50.\nDone.')).toEqual([
			'Account BW-20931.',
			'Refund is $148.50.',
			'Done.',
		])
	})

	it('keeps empty lines, a lone carriage return, and one empty line for an empty text', () => {
		expect(splitResultLines('One.\n\nTwo.\rStill two.\n')).toEqual([
			'One.',
			'',
			'Two.\rStill two.',
			'',
		])
		expect(splitResultLines('')).toEqual([''])
	})
})

describe('renderLookupCall', () => {
	it('renders the tool name and the arguments in the order JSON writes them', () => {
		expect(renderLookupCall('lookup_order', { id: 'BW-5512', opts: { b: 2, a: 1 } })).toBe(
			'lookup_order {"id":"BW-5512","opts":{"b":2,"a":1}}',
		)
		expect(renderLookupCall('lookup_order', {})).toBe('lookup_order {}')
	})

	it('renders the bare tool name for a BigInt or a cycle', () => {
		const cyclic: Record<string, unknown> = {}
		cyclic.self = cyclic
		expect(renderLookupCall('lookup_order', { count: 1n })).toBe('lookup_order')
		expect(renderLookupCall('lookup_order', cyclic)).toBe('lookup_order')
	})
})

describe('linkOwners', () => {
	const owners = new Map(Object.entries(LEDGER_DESK_OWNERS))

	it('links an owner argument to itself and another id to the one owner its text names', () => {
		const links = linkOwners(
			[
				buildLedgerFinding(
					'tool-1',
					'lookup_order',
					{ id: 'bw-5512' },
					'Order BW-5512 for account BW-20931 (Brightwater Studio).',
					LEDGER_EMPTY_FOUND,
				),
				buildLedgerFinding(
					'tool-2',
					'lookup_order',
					{ account: 'OM-30418' },
					'Account OM-30418: Odile Marlow.',
					LEDGER_EMPTY_FOUND,
				),
			],
			owners,
		)
		expect(Object.fromEntries(links)).toEqual({
			'BW-5512': 'BW-20931',
			'OM-30418': 'OM-30418',
		})
	})

	it('leaves an argument unlinked when its text names no owner or several', () => {
		const links = linkOwners(
			[
				buildLedgerFinding(
					'tool-1',
					'lookup_order',
					{ id: 'BW-5512' },
					'Order BW-5512 has no owner.',
					LEDGER_EMPTY_FOUND,
				),
				buildLedgerFinding(
					'tool-2',
					'lookup_order',
					{ id: 'BW-5513' },
					'Order BW-5513 for BW-20931 and OM-30418.',
					LEDGER_EMPTY_FOUND,
				),
			],
			owners,
		)
		expect(links.size).toBe(0)
	})

	it('skips an empty finding and lets a later finding overwrite an earlier link', () => {
		const links = linkOwners(
			[
				buildLedgerFinding(
					'tool-1',
					'lookup_order',
					{ id: 'BW-5512' },
					'Order BW-5512 for BW-20931.',
					LEDGER_EMPTY_FOUND,
				),
				buildLedgerFinding(
					'tool-2',
					'lookup_order',
					{ id: 'BW-5512' },
					'Order BW-5512 for OM-30418.',
				),
				buildLedgerFinding(
					'tool-3',
					'lookup_order',
					{ id: 'BW-5512' },
					'Order BW-5512 for OM-30418.',
					LEDGER_EMPTY_FOUND,
				),
			],
			owners,
		)
		expect(Object.fromEntries(links)).toEqual({ 'BW-5512': 'OM-30418' })
	})

	it('ignores an argument that is no id', () => {
		const links = linkOwners(
			[
				buildLedgerFinding(
					'tool-1',
					'lookup_order',
					{ id: 'five', n: 5 },
					'Order for BW-20931.',
					LEDGER_EMPTY_FOUND,
				),
			],
			owners,
		)
		expect(links.size).toBe(0)
	})

	it('refuses a hole in the finding list, as a for…of visits it as an undefined finding', () => {
		const findings: LedgerLookupFinding[] = []
		findings[1] = buildLedgerFinding(
			'tool-1',
			'lookup_customer',
			{ account: 'BW-20931' },
			'Account BW-20931',
			LEDGER_EMPTY_FOUND,
		)
		const held = new Map([['BW-20931', ['Brightwater Studio']]])
		expect(captureError(() => linkOwners(findings, held))).toBeInstanceOf(TypeError)
	})
})

describe('collectRegistry', () => {
	it('collects every id and each owner name in the order read', () => {
		const registry = collectRegistry([
			buildLedgerFinding('tool-1', 'lookup_customer', { account: 'BW-20931' }, 'text', {
				ids: ['BW-20931', 'BW-5512'],
				owners: [{ id: 'BW-20931', names: ['Brightwater Studio'] }],
			}),
			buildLedgerFinding('tool-2', 'lookup_customer', { account: 'BW-20931' }, 'text', {
				ids: [],
				owners: [
					{
						id: 'BW-20931',
						names: ['Brightwater Studio', 'BWS Ltd'],
					},
					{ id: 'OM-30418', names: [] },
				],
			}),
		])
		expect([...registry.ids]).toEqual(['BW-20931', 'BW-5512', 'OM-30418'])
		expect(Object.fromEntries(registry.owners)).toEqual({
			'BW-20931': ['Brightwater Studio', 'BWS Ltd'],
			'OM-30418': [],
		})
	})

	it('learns nothing from an empty finding', () => {
		const registry = collectRegistry([
			buildLedgerFinding('tool-1', 'lookup_order', { id: 'BW-5512' }, 'No record.'),
		])
		expect(registry.ids.size + registry.owners.size).toBe(0)
	})

	it('trims a name and drops one without a letter', () => {
		const registry = collectRegistry([
			buildLedgerFinding('tool-1', 'lookup_customer', {}, 'text', {
				ids: [],
				owners: [{ id: 'OM-30418', names: ['  Odile Marlow ', '1234', ' '] }],
			}),
		])
		expect(registry.owners.get('OM-30418')).toEqual(['Odile Marlow'])
	})

	it('refuses a hole in the finding list, as a for…of visits it as an undefined finding', () => {
		const findings: LedgerLookupFinding[] = []
		findings[1] = buildLedgerFinding('tool-1', 'lookup_customer', {}, 'text', {
			ids: ['BW-20931'],
			owners: [{ id: 'BW-20931', names: ['Brightwater Studio'] }],
		})
		expect(captureError(() => collectRegistry(findings))).toBeInstanceOf(TypeError)
	})

	it('refuses a hole in a finding owner list, as a for…of visits it as an undefined owner', () => {
		const owners: LedgerOwner[] = []
		owners[1] = { id: 'BW-20931', names: ['Brightwater Studio'] }
		const findings = [
			buildLedgerFinding('tool-1', 'lookup_customer', {}, 'text', { ids: ['BW-20931'], owners }),
		]
		expect(captureError(() => collectRegistry(findings))).toBeInstanceOf(TypeError)
	})
})

describe('buildLedgerIndex', () => {
	it('indexes each name, its words, and their needles, keeping the registry ids set', () => {
		const registry = collectRegistry([
			buildLedgerFinding('tool-1', 'lookup_customer', {}, 'text', {
				ids: ['BW-5512'],
				owners: [
					{ id: 'BW-20931', names: ['Brightwater Studio'] },
					{ id: 'OM-30418', names: ['Odile Marlow'] },
					{ id: 'OM-77001', names: ['Odile Marsh'] },
				],
			}),
		])
		const index = buildLedgerIndex(registry)
		expect(index.ids).toBe(registry.ids)
		expect(Object.fromEntries(index.aliases)).toEqual({
			'Brightwater Studio': ['BW-20931'],
			'Odile Marlow': ['OM-30418'],
			'Odile Marsh': ['OM-77001'],
		})
		expect(Object.fromEntries(index.carriers)).toEqual({
			Brightwater: ['Brightwater Studio'],
			Studio: ['Brightwater Studio'],
			Odile: ['Odile Marlow', 'Odile Marsh'],
			Marlow: ['Odile Marlow'],
			Marsh: ['Odile Marsh'],
		})
		expect(
			[...index.names].map(([name, needle]) => [
				name,
				needle.flags,
				needle.test(name.toUpperCase()),
			]),
		).toEqual([
			['Brightwater Studio', 'iu', true],
			['Odile Marlow', 'iu', true],
			['Odile Marsh', 'iu', true],
		])
		expect(
			[...index.words].map(([name, needles]) => [
				name,
				needles.map((needle) => [
					needle.flags,
					name.split(' ').filter((word) => needle.test(`${word} called`)),
					needle.test(`${name.toLowerCase()} called`),
				]),
			]),
		).toEqual([
			[
				'Brightwater Studio',
				[
					['u', ['Brightwater'], false],
					['u', ['Studio'], false],
				],
			],
			['Odile Marlow', [['u', ['Marlow'], false]]],
			['Odile Marsh', [['u', ['Marsh'], false]]],
		])
	})

	it('compiles a name that holds pattern characters as text, testing it the same way twice', () => {
		const index = buildLedgerIndex({
			ids: new Set(),
			owners: new Map([['BW-20931', ['A+B (Studio)']]]),
		})
		const needle = requireValue(index.names.get('A+B (Studio)'))
		expect([needle.test('Call A+B (Studio) now'), needle.test('Call A+B (Studio) now')]).toEqual([
			true,
			true,
		])
		expect(needle.test('Call AAB Studio now')).toBe(false)
		expect(index.words.size).toBe(0)
	})

	it('keys each name on its rarest run', () => {
		const index = buildLedgerIndex({
			ids: new Set(),
			owners: new Map([
				['OR-1000', ['Customer OR-1000']],
				['OR-1001', ['Customer OR-1001']],
			]),
		})
		expect(index.keys.has('or')).toBe(false)
		expect(index.keys.has('customer')).toBe(false)
		expect([...index.keys.values()].map((names) => names.length)).toEqual([1, 1])
		expect([...index.keys]).toEqual([
			['1000', ['Customer OR-1000']],
			['1001', ['Customer OR-1001']],
		])
		const tied = buildLedgerIndex({ ids: new Set(), owners: new Map([['NP-1', ['north pier']]]) })
		expect([...tied.keys]).toEqual([['north', ['north pier']]])
	})

	it('keys a unique word under its name', () => {
		const index = buildLedgerIndex({
			ids: new Set(),
			owners: new Map([['BW-20931', ['Brightwater Studio']]]),
		})
		expect([...index.keys]).toEqual([
			['brightwater', ['Brightwater Studio']],
			['studio', ['Brightwater Studio']],
		])
	})

	it('ranks ids and names apart', () => {
		const index = buildLedgerIndex({
			ids: new Set(['A-1', 'B-2']),
			owners: new Map([['B-2', ['A-1']]]),
		})
		expect([...index.ranks.ids]).toEqual([
			['A-1', 0],
			['B-2', 1],
		])
		expect([...index.ranks.names]).toEqual([['A-1', 0]])
	})

	it('indexes nothing for an empty registry', () => {
		const ids = new Set<string>()
		const index = buildLedgerIndex({ ids, owners: new Map() })
		expect(index.ids).toBe(ids)
		expect(index.aliases.size + index.carriers.size + index.names.size + index.words.size).toBe(0)
		expect(index.keys.size + index.ranks.ids.size + index.ranks.names.size).toBe(0)
	})
})

describe('normalizeWord', () => {
	it('folds each case of a word to one form', () => {
		const studio = ['Studio', 'STUDIO', 'studio', 'ſtudio'].map((word) => normalizeWord(word))
		const road = ['ΟΔΟΣ', 'οδος', 'οδοσ'].map((word) => normalizeWord(word))
		expect(new Set(studio)).toEqual(new Set(['studio']))
		expect(new Set(road)).toEqual(new Set(['οδος']))
		expect(normalizeWord('Straße')).toBe('strasse')
		expect(normalizeWord('STRASSE')).toBe('strasse')
	})

	it('keeps a word of no cased letter', () => {
		expect(normalizeWord('1000')).toBe('1000')
		expect(normalizeWord('東京')).toBe('東京')
	})
})

describe('matchEntities', () => {
	const index = buildLedgerIndex(
		collectRegistry([
			buildLedgerFinding('tool-1', 'lookup_customer', {}, 'text', {
				ids: ['BW-5512'],
				owners: [
					{ id: 'BW-20931', names: ['Brightwater Studio'] },
					{ id: 'OM-30418', names: ['Odile Marlow'] },
					{ id: 'OM-77001', names: ['Odile Marsh'] },
				],
			}),
		]),
	)

	const studio = buildLedgerIndex({ ids: new Set(), owners: new Map([['ST-1', ['Studio']]]) })

	it('names a registry id that the text holds as an id token', () => {
		expect([...matchEntities(index, 'Refund for bw-5512 today', false)]).toEqual(['BW-5512'])
		expect(matchEntities(index, 'Refund for BW-55123', true).size).toBe(0)
	})

	it('names an owner by its whole name, whatever the case, at word edges', () => {
		expect([...matchEntities(index, 'brightwater studio called', false)]).toEqual(['BW-20931'])
		expect(matchEntities(index, 'XBrightwater Studio called', false).size).toBe(0)
		expect(matchEntities(index, 'Brightwater Studios called', false).size).toBe(0)
	})

	it('names an owner by a capitalized name word that only one name carries, with partial', () => {
		expect([...matchEntities(index, 'Brightwater called', true)]).toEqual(['BW-20931'])
		expect(matchEntities(index, 'Brightwater called', false).size).toBe(0)
		expect(matchEntities(index, 'brightwater called', true).size).toBe(0)
	})

	it('leaves out a name word that two names carry', () => {
		expect(matchEntities(index, 'Odile called', true).size).toBe(0)
		expect([...matchEntities(index, 'Marlow called', true)]).toEqual(['OM-30418'])
	})

	it('reads a name that holds pattern characters as text', () => {
		const odd = buildLedgerIndex(
			collectRegistry([
				buildLedgerFinding('tool-1', 'lookup_customer', {}, 'text', {
					ids: [],
					owners: [{ id: 'BW-20931', names: ['A+B (Studio)'] }],
				}),
			]),
		)
		expect([...matchEntities(odd, 'Call A+B (Studio) now', false)]).toEqual(['BW-20931'])
		expect(matchEntities(odd, 'Call AAB Studio now', false).size).toBe(0)
	})

	it('keeps registry order for reversed ids', () => {
		expect([...matchEntities(index, 'Compare OM-30418 with BW-5512', false)]).toEqual([
			'BW-5512',
			'OM-30418',
		])
	})

	it('keeps registry order for reversed owners', () => {
		for (const partial of [true, false])
			expect([...matchEntities(index, 'Odile Marlow then Brightwater Studio', partial)]).toEqual([
				'BW-20931',
				'OM-30418',
			])
	})

	it('keeps ids in order when a name spells one', () => {
		const spelled = buildLedgerIndex({
			ids: new Set(['A-1', 'B-2']),
			owners: new Map([['B-2', ['A-1']]]),
		})
		expect([...matchEntities(spelled, 'B-2 then A-1', false)]).toEqual(['A-1', 'B-2'])
	})

	it('finds a long s against an s', () => {
		expect([...matchEntities(studio, 'ſtudio called', false)]).toEqual(['ST-1'])
	})

	it('finds a Greek final sigma', () => {
		const greek = buildLedgerIndex({ ids: new Set(), owners: new Map([['GR-1', ['ΟΔΟΣ']]]) })
		expect([...matchEntities(greek, 'οδος called', false)]).toEqual(['GR-1'])
		expect([...matchEntities(greek, 'οδοσ called', false)]).toEqual(['GR-1'])
	})

	it('folds each run of a wide text alone', () => {
		const greek = buildLedgerIndex({ ids: new Set(), owners: new Map([['GR-1', ['ΟΔΟΣ']]]) })
		expect([...matchEntities(greek, 'ΟΔΟΣ.Α called', false)]).toEqual(['GR-1'])
		expect([...matchEntities(greek, 'οδος.α called', false)]).toEqual(['GR-1'])
		expect([...matchEntities(studio, 'Studio — called', false)]).toEqual(['ST-1'])
	})

	it('finds a unique word that is no anchor', () => {
		expect([...matchEntities(index, 'Studio called', true)]).toEqual(['BW-20931'])
		expect([...matchEntities(index, 'Studio called', false)]).toEqual([])
	})

	it('leaves out a name inside a longer word', () => {
		expect([...matchEntities(studio, 'XStudio called', true)]).toEqual([])
		expect([...matchEntities(studio, 'Studios called', true)]).toEqual([])
	})

	it('finds a whole name holding a shared word', () => {
		expect([...matchEntities(index, 'Odile Marlow called', false)]).toEqual(['OM-30418'])
	})

	it('misses U+0345 written for an iota', () => {
		const greek = buildLedgerIndex({ ids: new Set(), owners: new Map([['GR-2', ['Ιων']]]) })
		expect(requireValue(greek.names.get('Ιων')).test('ͅων called')).toBe(true)
		expect([...matchEntities(greek, 'ͅων called', false)]).toEqual([])
	})

	it('leaves a name with no run unmatched', () => {
		const bare = buildLedgerIndex({ ids: new Set(['ZZ-1']), owners: new Map([['OW-1', ['+++']]]) })
		expect(requireValue(bare.names.get('+++')).test('Call +++ now')).toBe(true)
		expect([...matchEntities(bare, 'Call +++ now', true)]).toEqual([])
		expect([...matchEntities(bare, 'Call ZZ-1 on +++ now', true)]).toEqual(['ZZ-1'])
	})

	it('refuses a hole in an owner name list, as a for…of visits it as an undefined name', () => {
		const names: string[] = []
		names[0] = 'Brightwater Studio'
		names[2] = 'Odile Marlow'
		const sparse = { ids: new Set<string>(), owners: new Map([['BW-20931', names]]) }
		expect(
			captureError(() =>
				matchEntities(buildLedgerIndex(sparse), 'Brightwater Studio called', false),
			),
		).toBeInstanceOf(TypeError)
	})
})

describe('collectLive', () => {
	it('keeps the first unsuperseded finding after a correction in the identical run', () => {
		const text = 'Account BW-20931: Brightwater Studio. Refund is $148.50.'
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('a1', 'tool', text),
				buildLedgerMessage('fix', 'user', 'Correction: refund is $149.50.'),
				buildLedgerMessage('a2', 'tool', text),
			],
			findings: ['a1', 'a2'].map((id) =>
				buildLedgerFinding(id, 'lookup', { id: 'BW-20931' }, text, LEDGER_EMPTY_FOUND),
			),
			classification: { amendments: { a1: ['fix'] }, supersessions: { a1: ['fix'] } },
		})
		expect(collectLive(input)).toEqual(['fix', 'a2'])
		expect(checkLedgerProjection(buildRecords(input), input)).toEqual([])
	})
	it('keeps the earliest finding of the last identical run across interleaved identities', () => {
		const input = buildLedgerInput({
			messages: ['old', 'same', 'other', 'changed', 'repeat'].map((id) =>
				buildLedgerMessage(
					id,
					'tool',
					id === 'changed' || id === 'repeat' ? 'Changed.' : 'Original.',
				),
			),
			findings: ['old', 'same', 'other', 'changed', 'repeat'].map((id) =>
				buildLedgerFinding(
					id,
					'lookup',
					{ id: id === 'other' ? 'BW-2' : 'BW-1' },
					id === 'changed' || id === 'repeat' ? 'Changed.' : 'Original.',
					LEDGER_EMPTY_FOUND,
				),
			),
		})
		expect(collectLive(input)).toEqual(['other', 'changed'])
	})

	it('lists the user messages and the current lookup results, leaving out the excluded, quiet, and supersessions', () => {
		expect(collectLive(createLedgerDesk())).toEqual([
			'user-01',
			'user-02',
			'user-03',
			'tool-02',
			'user-04',
		])
	})

	it('lets an empty finding replace the earlier result of the same call (R5a)', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('tool-a', 'tool', 'Order BW-5512: total $10.00.'),
				buildLedgerMessage('tool-b', 'tool', 'No record of order BW-5512.'),
				buildLedgerMessage('tool-c', 'tool', 'Order BW-5513: total $12.00.'),
			],
			findings: [
				buildLedgerFinding(
					'tool-a',
					'lookup_order',
					{ id: 'BW-5512' },
					'Order BW-5512: total $10.00.',
					LEDGER_EMPTY_FOUND,
				),
				buildLedgerFinding(
					'tool-b',
					'lookup_order',
					{ id: 'bw-5512' },
					'No record of order BW-5512.',
				),
				buildLedgerFinding(
					'tool-c',
					'lookup_order',
					{ id: 'BW-5513' },
					'Order BW-5513: total $12.00.',
					LEDGER_EMPTY_FOUND,
				),
			],
		})
		expect(collectLive(input)).toEqual(['tool-c'])
	})

	it('keeps both results of two calls whose arguments differ', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('tool-a', 'tool', 'one'),
				buildLedgerMessage('tool-b', 'tool', 'two'),
			],
			findings: [
				buildLedgerFinding('tool-a', 'lookup_order', { id: 'BW-5512' }, 'one', LEDGER_EMPTY_FOUND),
				buildLedgerFinding('tool-b', 'lookup_order', { id: 'BW-5513' }, 'two', LEDGER_EMPTY_FOUND),
			],
		})
		expect(collectLive(input)).toEqual(['tool-a', 'tool-b'])
	})

	it('replaces an earlier result when a later call differs only in nested key order (R8)', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('tool-a', 'tool', 'one'),
				buildLedgerMessage('tool-b', 'tool', 'two'),
			],
			findings: [
				buildLedgerFinding(
					'tool-a',
					'lookup_order',
					{ id: 'BW-5512', opts: { a: 1, b: { c: 2, d: 3 } } },
					'one',
					LEDGER_EMPTY_FOUND,
				),
				buildLedgerFinding(
					'tool-b',
					'lookup_order',
					{ opts: { b: { d: 3, c: 2 }, a: 1 }, id: 'BW-5512' },
					'two',
					LEDGER_EMPTY_FOUND,
				),
			],
		})
		expect(collectLive(input)).toEqual(['tool-b'])
	})

	it('leaves out a tool message with no finding and an assistant message', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('tool-a', 'tool', 'text'),
				buildLedgerMessage('assistant-a', 'assistant', 'text'),
			],
		})
		expect(collectLive(input)).toEqual([])
	})
})

describe('collectWriteSupersessions', () => {
	it.each(LEDGER_WRITE_SUPERSESSIONS)(
		'maps %s to the writes that supersede it',
		(_label, id, writes) => {
			const { messages, findings } = buildLedgerWriteScenario()
			expect(collectWriteSupersessions(messages, findings).get(id) ?? []).toEqual(writes)
		},
	)

	it('keys only superseded findings, in conversation order', () => {
		const { messages, findings } = buildLedgerWriteScenario()
		expect([...collectWriteSupersessions(messages, findings).keys()]).toEqual([
			'read',
			'order',
			'missing',
			'write',
			'list',
			'rewrite',
		])
	})

	it('maps nothing when no finding carries targets', () => {
		const { messages, findings } = buildLedgerWriteScenario()
		const reads = findings.map(({ targets: _targets, ...finding }) => finding)
		expect(collectWriteSupersessions(messages, reads)).toEqual(new Map())
	})

	it('skips a finding or a write the messages do not hold', () => {
		const { messages, findings } = buildLedgerWriteScenario()
		const held = messages.filter((message) => message.id !== 'write' && message.id !== 'read')
		const edges = collectWriteSupersessions(held, findings)
		expect(edges.has('read')).toBe(false)
		expect(edges.get('order')).toEqual(['rewrite', 'final'])
	})
})

describe('mergeSupersessions', () => {
	const messages = ['a', 'b', 'c', 'd', 'e'].map((id) => buildLedgerMessage(id, 'tool', id))

	it('adds each edge to the supersessions and the amendments, in conversation order', () => {
		const classification = buildLedgerClassification({
			quiet: ['e'],
			categories: { a: 'fact' },
			topics: { a: ['refunds'] },
			amendments: { a: ['d'], c: ['d'] },
			supersessions: { a: ['d'] },
		})
		const merged = mergeSupersessions(
			classification,
			new Map([
				['a', ['b']],
				['c', ['d']],
				['b', ['e']],
			]),
			messages,
		)
		expect(merged.supersessions).toEqual(
			new Map([
				['a', ['b', 'd']],
				['c', ['d']],
				['b', ['e']],
			]),
		)
		expect(merged.amendments).toEqual(
			new Map([
				['a', ['b', 'd']],
				['c', ['d']],
				['b', ['e']],
			]),
		)
		expect(merged.quiet).toEqual(classification.quiet)
		expect(merged.categories).toEqual(classification.categories)
		expect(merged.topics).toEqual(classification.topics)
	})

	it('keeps every supersession an amendment', () => {
		const merged = mergeSupersessions(
			buildLedgerClassification({
				amendments: { a: ['c'], b: ['c'] },
				supersessions: { b: ['c'] },
			}),
			new Map([['a', ['d']]]),
			messages,
		)
		for (const [earlier, laters] of merged.supersessions)
			expect(merged.amendments.get(earlier)).toEqual(expect.arrayContaining([...laters]))
	})

	it('returns an equal classification for an empty edge map', () => {
		const classification = buildLedgerClassification({
			amendments: { a: ['c'] },
			supersessions: { a: ['c'] },
		})
		expect(mergeSupersessions(classification, new Map(), messages)).toEqual(classification)
	})
})

describe('placeMember', () => {
	const desk = createLedgerDesk()
	const links = linkOwners(desk.findings, desk.owners)

	it('joins the owner records the entities name, directly or through a link', () => {
		expect([...placeMember(desk, links, new Map(), 'user-03', new Set())]).toEqual([
			'owner:BW-20931',
		])
		expect([...placeMember(desk, links, new Map(), 'user-02', new Set())]).toEqual([
			'owner:OM-30418',
		])
	})

	it('joins the rules record for a rule or a correction that names no owner', () => {
		expect([...placeMember(desk, links, new Map(), 'user-01', new Set())]).toEqual(['rules'])
	})

	it('joins where the earlier side of an amendment pair joins', () => {
		const amended = new Map([['user-04', ['user-03']]])
		expect([...placeMember(desk, links, amended, 'user-04', new Set())]).toEqual(['owner:BW-20931'])
	})

	it('stops at a cycle of amendment pairs and leaves a message with no category as an orphan', () => {
		const cycle = new Map([
			['user-05', ['user-07']],
			['user-07', ['user-05']],
		])
		expect(placeMember(desk, links, cycle, 'user-05', new Set()).size).toBe(0)
		expect(placeMember(desk, links, new Map(), 'user-05', new Set()).size).toBe(0)
	})

	it('settles a placement whose walk pruned nothing and leaves a cycle-pruned one unsettled', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('user-a', 'user', 'Standing rule: refunds need code MX-4471.'),
				buildLedgerMessage('user-b', 'user', 'Code MX-4486 replaces MX-4471.'),
				buildLedgerMessage('user-c', 'user', 'Code MX-5000 replaces MX-4486.'),
			],
			classification: { categories: { 'user-a': 'rule' } },
		})
		const chain = new Map([
			['user-b', ['user-a']],
			['user-c', ['user-b']],
		])
		const settled = new Map<string, ReadonlySet<string>>()
		expect([...placeMember(input, new Map(), chain, 'user-c', new Set(), settled)]).toEqual([
			'rules',
		])
		expect([...settled.keys()].toSorted()).toEqual(['user-a', 'user-b', 'user-c'])
		const cycle = new Map([
			['user-a', ['user-b']],
			['user-b', ['user-a']],
		])
		const pruned = new Map<string, ReadonlySet<string>>()
		expect([...placeMember(input, new Map(), cycle, 'user-a', new Set(), pruned)]).toEqual([])
		expect([...pruned.keys()]).toEqual([])
		expect([...placeMember(input, new Map(), cycle, 'user-b', new Set(), pruned)]).toEqual([
			'rules',
		])
	})

	it('returns a placement the settled map already holds', () => {
		const input = buildLedgerInput({
			messages: [buildLedgerMessage('user-a', 'user', 'Standing rule: refunds need a code.')],
			classification: { categories: { 'user-a': 'rule' } },
		})
		const settled = new Map<string, ReadonlySet<string>>([['user-a', new Set(['owner:OM-30418'])]])
		expect([...placeMember(input, new Map(), new Map(), 'user-a', new Set(), settled)]).toEqual([
			'owner:OM-30418',
		])
		expect([...placeMember(input, new Map(), new Map(), 'user-a', new Set())]).toEqual(['rules'])
	})
})

describe('collectAmendments', () => {
	it('chooses the newest reachable live successor across branches and cycles and deduplicates it', () => {
		const input = buildLedgerInput({
			messages: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => buildLedgerMessage(id, 'user', id)),
			classification: {
				amendments: { a: ['b', 'c', 'f'] },
				supersessions: { b: ['c', 'd'], c: ['b', 'e'], f: ['missing'] },
			},
		})
		const expected = [
			{ earlier: 'a', later: 'e' },
			{ earlier: 'a', later: 'f' },
		]
		expect(
			collectAmendments(
				input,
				new Map(input.messages.map((message) => [message.id, message])),
				collectLive(input),
			),
		).toEqual(expected)
		const built = buildRecords(input)
		expect(built.amendments).toEqual(expected)
		expect(checkLedgerProjection(built, input)).toEqual([])
	})

	it('keeps direct edges in conversation order without duplicate or transitive edges', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('a', 'user', 'Original.'),
				buildLedgerMessage('b', 'user', 'Correction.'),
				buildLedgerMessage('c', 'user', 'Further correction.'),
				buildLedgerMessage('other', 'user', 'Unrelated.'),
			],
			classification: { amendments: { b: ['c'], a: ['b', 'b', 'missing'] } },
		})
		expect(
			collectAmendments(
				input,
				new Map(input.messages.map((message) => [message.id, message])),
				collectLive(input),
			),
		).toEqual([
			{ earlier: 'a', later: 'b' },
			{ earlier: 'b', later: 'c' },
		])
	})
	it('preserves headers sibling facts and person-specific permission after an accepted amendment', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage(
					'earlier',
					'user',
					'Account AC-7302 belongs to Ada. Ben may collect AC-7302. Ada may collect AC-7302.',
				),
				buildLedgerMessage(
					'correction',
					'user',
					'For AC-7302 revoke Ada permission; Ben permission remains.',
				),
			],
			classification: {
				categories: { earlier: 'rule', correction: 'correction' },
				amendments: { earlier: ['correction'] },
			},
		})
		expect(
			buildRecords(input)
				.records.flatMap((record) => record.lines)
				.filter((line) => line.source === 'earlier')
				.map((line) => [line.sentence, line.text]),
		).toEqual([
			[0, 'Account AC-7302 belongs to Ada.'],
			[1, 'Ben may collect AC-7302.'],
			[2, 'Ada may collect AC-7302.'],
		])
	})
	it('C3 retains accepted effective identities without another token comparison', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('earlier', 'user', 'Code MX-4471. Limit 200.'),
				buildLedgerMessage('first', 'user', 'Replace MX-4471 with MX-4486.'),
				buildLedgerMessage('second', 'user', 'Retire MX-4471.'),
				buildLedgerMessage('unrelated', 'user', 'Limit 300.'),
				buildLedgerMessage('quiet', 'user', 'Code MX-4471.'),
			],
			classification: {
				amendments: { earlier: ['first', 'second', 'unrelated', 'quiet'] },
				quiet: ['quiet'],
			},
		})
		expect(
			collectAmendments(
				input,
				new Map(input.messages.map((message) => [message.id, message])),
				collectLive(input),
			),
		).toEqual([
			{ earlier: 'earlier', later: 'first' },
			{ earlier: 'earlier', later: 'second' },
			{ earlier: 'earlier', later: 'unrelated' },
		])
	})
	const desk = createLedgerDesk()
	const byId = new Map(desk.messages.map((message) => [message.id, message]))

	it('lists the accepted direct edge of a live message', () => {
		expect(collectAmendments(desk, byId, collectLive(desk))).toEqual([
			{ earlier: 'user-01', later: 'user-04' },
		])
	})

	it('keeps provenance after its correction is itself superseded (R2b)', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('user-a', 'user', 'The code is MX-4471. Refunds over $200 need it.'),
				buildLedgerMessage('user-b', 'user', 'The code is MX-4486, not MX-4471.'),
				buildLedgerMessage('user-c', 'user', 'The code is MX-5000.'),
			],
			classification: {
				amendments: { 'user-a': ['user-b'] },
				supersessions: { 'user-b': ['user-c'] },
			},
		})
		const live = collectLive(input)
		expect(live).toEqual(['user-a', 'user-c'])
		expect(
			collectAmendments(
				input,
				new Map(input.messages.map((message) => [message.id, message])),
				live,
			),
		).toEqual([{ earlier: 'user-a', later: 'user-c' }])
	})

	it('keeps direct chain provenance when its correction is itself corrected (R2b)', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('user-a', 'user', 'The code is MX-4471.'),
				buildLedgerMessage('user-b', 'user', 'The code is MX-4486, not MX-4471.'),
				buildLedgerMessage('user-c', 'user', 'Correction: it is MX-5000, not MX-4486.'),
			],
			classification: {
				amendments: { 'user-a': ['user-b'], 'user-b': ['user-c'] },
			},
		})
		const amendments = collectAmendments(
			input,
			new Map(input.messages.map((message) => [message.id, message])),
			collectLive(input),
		)
		expect(amendments).toEqual([
			{ earlier: 'user-a', later: 'user-b' },
			{ earlier: 'user-b', later: 'user-c' },
		])
	})

	it('never lets an excluded, quiet, or assistant message take effect', () => {
		const messages = [
			buildLedgerMessage('user-a', 'user', 'The code is MX-4471.'),
			buildLedgerMessage('user-b', 'user', 'The code is MX-4486, not MX-4471.'),
			buildLedgerMessage('user-c', 'user', 'Ignore that.'),
		]
		const byMessage = new Map(messages.map((message) => [message.id, message]))
		const classification = {
			amendments: { 'user-a': ['user-b'] },
			supersessions: { 'user-b': ['user-c'] },
		}
		for (const variant of [
			{ exclusions: ['user-b'] },
			{ classification: { ...classification, quiet: ['user-b'] } },
		]) {
			const input = buildLedgerInput({
				messages,
				classification,
				...variant,
			})
			expect(collectAmendments(input, byMessage, collectLive(input))).toEqual([])
		}
		const assistant = [
			buildLedgerMessage('user-a', 'user', 'The code is MX-4471.'),
			buildLedgerMessage('user-b', 'assistant', 'The code is MX-4486, not MX-4471.'),
			buildLedgerMessage('user-c', 'user', 'Ignore that.'),
		]
		const spoken = buildLedgerInput({ messages: assistant, classification })
		expect(
			collectAmendments(
				spoken,
				new Map(assistant.map((message) => [message.id, message])),
				collectLive(spoken),
			),
		).toEqual([])
		const control = buildLedgerInput({ messages, classification })
		expect(collectAmendments(control, byMessage, collectLive(control))).toEqual([
			{ earlier: 'user-a', later: 'user-c' },
		])
	})
})

describe('amendment rendering', () => {
	it.each([
		{
			form: 'included',
			retained: ['earlier', 'second'],
			amendments: [{ earlier: 'earlier', later: 'second' }],
			annotated: 'earlier',
			expected: '[1] Changed later by [2].',
		},
		{
			form: 'not included',
			retained: ['earlier'],
			amendments: [{ earlier: 'earlier', later: 'second' }],
			annotated: 'earlier',
			expected: '[1] A later change is not shown.',
		},
		{
			form: 'mixed',
			retained: ['earlier', 'second'],
			amendments: [
				{ earlier: 'earlier', later: 'second' },
				{ earlier: 'earlier', later: 'third' },
			],
			annotated: 'earlier',
			expected: '[1] Changed later by [2]. A later change is not shown.',
		},
		{
			form: 'endpoint',
			retained: ['earlier', 'second'],
			amendments: [{ earlier: 'earlier', later: 'second' }],
			annotated: 'second',
			expected: '[2]',
		},
		{
			form: 'two included',
			retained: ['earlier', 'second', 'third'],
			amendments: [
				{ earlier: 'earlier', later: 'second' },
				{ earlier: 'earlier', later: 'third' },
			],
			annotated: 'earlier',
			expected: '[1] Changed later by [2]. Changed later by [3].',
		},
	])('pins the bytes of the $form annotation', ({ retained, amendments, annotated, expected }) => {
		const lines = retained.map((id) => buildLedgerLine(id, 0, `Text of ${id}.`))
		const messages = ['earlier', 'second', 'third'].map((id) =>
			buildLedgerMessage(id, 'user', `Text of ${id}.`),
		)
		const context = buildLedgerRenderContext(messages, lines, amendments)
		const line = requireValue(lines.find((candidate) => candidate.source === annotated))
		expect(renderLedgerAnnotation(line, context)).toBe(expected)
	})

	it('assigns distinct local references in first retained occurrence order across duplicate interleaved lines', () => {
		const messages = ['omitted', 'first', 'second', 'third'].map((id) =>
			buildLedgerMessage(id, 'user', 'Equal.'),
		)
		const first = buildLedgerLine('first', 0, 'Equal.')
		const second = buildLedgerLine('second', 0, 'Equal.')
		const third = buildLedgerLine('third', 0, 'Equal.')
		const repeated = buildLedgerLine('first', 0, 'Equal.')
		const amendments = [{ earlier: 'first', later: 'second' }]
		const context = buildLedgerRenderContext(
			messages,
			[third, first, second, repeated, third],
			amendments,
		)
		expect([...context.references]).toEqual([
			['third', '1'],
			['first', '2'],
			['second', '3'],
		])
		expect(context.references.has('omitted')).toBe(false)
		expect(context.first.get('first')).toBe(first)
		expect(renderLedgerAnnotation(first, context)).toBe('[2] Changed later by [3].')
		expect(renderLedgerAnnotation(second, context)).toBe('[3]')
		expect(renderLedgerAnnotation(repeated, context)).toBe('')
		const reordered = buildLedgerRenderContext(
			messages,
			[second, repeated, third, first],
			amendments,
		)
		expect([...reordered.references]).toEqual([
			['second', '1'],
			['first', '2'],
			['third', '3'],
		])
		const trimmed = buildLedgerRenderContext(messages, [first, second], amendments)
		expect([...trimmed.references]).toEqual([
			['first', '1'],
			['second', '2'],
		])
		expect(renderLedgerRecord({ title: 'Rules', lines: [first, second] }, trimmed)).toBe(
			'## Rules\n[1] Changed later by [2].\n- Equal.\n[2]\n- Equal.',
		)
	})

	it('rejects missing required display references and preserves authored framing-shaped content', () => {
		const earlier = buildLedgerLine(
			'earlier',
			0,
			'[42] Changed later by [authored-id]. A later change is not shown.',
		)
		const correction = buildLedgerLine('later', 0, 'Correction.')
		const messages = [
			buildLedgerMessage('earlier', 'user', earlier.text),
			buildLedgerMessage('later', 'user', correction.text),
		]
		const context = buildLedgerRenderContext(
			messages,
			[earlier, correction],
			[{ earlier: 'earlier', later: 'later' }],
		)
		expect(() => renderLedgerAnnotation(earlier, { ...context, references: new Map() })).toThrow(
			'retained source references',
		)
		expect(() => renderLedgerAnnotation(earlier, { ...context, references: new Map() })).toThrow(
			expect.objectContaining({ code: 'REFERENCE' }),
		)
		expect(() =>
			renderLedgerAnnotation(earlier, { ...context, references: new Map([['earlier', '1']]) }),
		).toThrow('retained source references')
		expect(renderLedgerRecord({ title: 'Rules', lines: [earlier, correction] }, context)).toContain(
			`- ${earlier.text}`,
		)
	})
	it('distinguishes complete correction identities from duplicates partial and absent text', () => {
		const messages = [
			buildLedgerMessage('earlier', 'user', 'Account header. Original value.'),
			buildLedgerMessage('later', 'user', 'Replacement value. Unchanged permission.'),
		]
		const earlier = buildLedgerLine('earlier', 0, 'Account header.')
		const later = buildLedgerLine('later', 0, 'Replacement value.')
		const end = buildLedgerLine('later', 1, 'Unchanged permission.')
		const amendments = [{ earlier: 'earlier', later: 'later' }]
		const complete = buildLedgerRenderContext(messages, [earlier, later, end], amendments)
		expect([...complete.complete]).toEqual(['later'])
		expect(renderLedgerAnnotation(earlier, complete)).toBe('[1] Changed later by [2].')
		expect(renderLedgerAnnotation(later, complete)).toBe('[2]')
		expect(renderLedgerAnnotation(end, complete)).toBe('')
		const partial = buildLedgerRenderContext(messages, [earlier, later, later], amendments)
		expect([...partial.complete]).toEqual([])
		expect(renderLedgerAnnotation(earlier, partial)).toBe('[1] A later change is not shown.')
		expect(renderLedgerAnnotation(later, partial)).toBe('')
		const absent = buildLedgerRenderContext(messages, [earlier], amendments)
		expect(renderLedgerAnnotation(earlier, absent)).toBe(renderLedgerAnnotation(earlier, partial))
		expect(renderLedgerAnnotation(earlier, absent)).not.toContain('[later]')
	})

	it('moves annotation to the first surviving earlier line and coexists with omitted corrections', () => {
		const messages = [
			buildLedgerMessage('earlier', 'user', 'Header. Original.'),
			buildLedgerMessage('included', 'user', 'Correction.'),
			buildLedgerMessage('hidden-owner-secret', 'user', 'Foreign owner secret.'),
		]
		const header = buildLedgerLine('earlier', 0, 'Header.')
		const original = buildLedgerLine('earlier', 1, 'Original.')
		const correction = buildLedgerLine('included', 0, 'Correction.')
		const amendments = [
			{ earlier: 'earlier', later: 'included' },
			{ earlier: 'earlier', later: 'hidden-owner-secret' },
		]
		const full = buildLedgerRenderContext(messages, [header, original, correction], amendments)
		expect(renderLedgerAnnotation(original, full)).toBe('')
		const trimmed = buildLedgerRenderContext(messages, [original, correction], amendments)
		const rendered = renderLedgerRecord({ title: 'Rules', lines: [original, correction] }, trimmed)
		expect(rendered).toContain(
			'[1] Changed later by [2]. A later change is not shown.\n- Original.',
		)
		expect(rendered).toContain('[2]\n- Correction.')
		expect(rendered).not.toContain('hidden-owner-secret')
		expect(rendered).not.toContain('Foreign owner secret')
		const removed = buildLedgerRenderContext(messages, [correction], amendments)
		expect(renderLedgerRecord({ title: 'Rules', lines: [correction] }, removed)).toBe(
			'## Rules\n- Correction.',
		)
	})
})

describe('buildLines', () => {
	it('turns each sentence into a line that carries its source, index, topics, and role', () => {
		const input = buildLedgerInput({
			messages: [buildLedgerMessage('user-a', 'user', 'First sentence. Second sentence.')],
			classification: { topics: { 'user-a': ['refunds'] } },
		})
		const lines = buildLines(
			input,
			new Map(input.messages.map((message) => [message.id, message])),
			'user-a',
			[],
			[],
		)
		expect(lines).toEqual([
			{
				text: 'First sentence.',
				source: 'user-a',
				sentence: 0,
				topics: ['refunds'],
				role: 'user',
			},
			{
				text: 'Second sentence.',
				source: 'user-a',
				sentence: 1,
				topics: ['refunds'],
				role: 'user',
			},
		])
	})

	it('preserves both original sentences and leaves out an absent message', () => {
		const input = buildLedgerInput({
			messages: [buildLedgerMessage('user-a', 'user', 'One. Two.')],
		})
		const byId = new Map(input.messages.map((message) => [message.id, message]))
		expect(buildLines(input, byId, 'user-a', [], []).map((line) => line.text)).toEqual([
			'One.',
			'Two.',
		])
		expect(buildLines(input, byId, 'user-z', [], [])).toEqual([])
	})

	it('prefixes the party named in the sentence before a pronoun-opening sentence', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage(
					'user-a',
					'user',
					'The lead is Dana Whitcombe. She approved it. Their form is filed.',
				),
			],
		})
		const lines = buildLines(
			input,
			new Map(input.messages.map((message) => [message.id, message])),
			'user-a',
			[],
			[],
		)
		expect(lines.map((line) => line.text)).toEqual([
			'The lead is Dana Whitcombe.',
			'Dana Whitcombe: She approved it.',
			'Their form is filed.',
		])
		expect(lines.map((line) => line.party)).toEqual([undefined, 'Dana Whitcombe', undefined])
	})

	it('takes no party from an owner name, a system name, or the first sentence', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage(
					'user-a',
					'user',
					'She waited. The lead is Pat Ruiz. He agreed. The caller is Odile Marlow. They left.',
				),
			],
		})
		const byId = new Map(input.messages.map((message) => [message.id, message]))
		const lines = buildLines(input, byId, 'user-a', ['Odile Marlow'], ['Pat Ruiz'])
		expect(lines.map((line) => line.party)).toEqual([
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
		])
	})

	it('does not match a word that only starts with a pronoun', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage(
					'user-a',
					'user',
					'The lead is Dana Whitcombe. Hermes shipped it. Heights vary.',
				),
			],
		})
		const lines = buildLines(
			input,
			new Map(input.messages.map((message) => [message.id, message])),
			'user-a',
			[],
			[],
		)
		expect(lines.some((line) => line.party !== undefined)).toBe(false)
	})
})

describe('buildRecords', () => {
	it('retains successful findings whose bigint arguments have no lookup identity', () => {
		const text = 'Account BW-20931 (Brightwater Studio): balance $10.00.'
		const input = buildLedgerInput({
			owners: LEDGER_DESK_OWNERS,
			messages: [
				buildLedgerMessage('tool-a', 'tool', text),
				buildLedgerMessage('tool-b', 'tool', text),
			],
			findings: [
				buildLedgerFinding('tool-a', 'lookup', { key: 1n }, text, LEDGER_EMPTY_FOUND),
				buildLedgerFinding('tool-b', 'lookup', { key: 2n }, text, LEDGER_EMPTY_FOUND),
			],
			entities: { 'tool-a': ['BW-20931'], 'tool-b': ['BW-20931'] },
		})
		expect(buildRecords(input).records.map((record) => record.members)).toEqual([
			['tool-a', 'tool-b'],
		])
		expect(identifyLookup('lookup', { key: 1n })).toBeUndefined()
		expect(identifyLookup('lookup', { key: 2n })).toBeUndefined()
	})

	it('projects the desk scenario into owner records ordered by first member, then the rules record', () => {
		const built = buildRecords(createLedgerDesk())
		expect(built.records.map((record) => [record.key, record.title, record.members])).toEqual([
			['owner:OM-30418', 'Odile Marlow (OM-30418)', ['user-02']],
			['owner:BW-20931', 'Brightwater Studio (BW-20931)', ['user-03', 'tool-02']],
			['rules', 'Rules', ['user-01', 'user-04']],
		])
		expect(built.records.map((record) => record.lines.map((line) => line.text))).toEqual([
			['The caller is Odile Marlow, owner of account OM-30418.', 'Her order shipped late.'],
			[
				'The shift lead is Dana Whitcombe.',
				'Dana Whitcombe: She approved the refund of $148.50 for order BW-5512.',
				'Order BW-5512 for account BW-20931 (Brightwater Studio): linen set, total $148.50.',
			],
			[
				'Standing rule: any refund over $200 needs a manager code.',
				'This week code is MX-4471.',
				'Correction: the manager code is MX-4486, not MX-4471.',
			],
		])
		expect(built.amendments).toEqual([{ earlier: 'user-01', later: 'user-04' }])
		expect(built.orphans).toEqual([])
		expect(checkLedgerProjection(built, createLedgerDesk())).toEqual([])
	})

	it('titles an owner without a name by its id', () => {
		const input = buildLedgerInput({
			owners: { 'BW-20931': [] },
			messages: [buildLedgerMessage('user-a', 'user', 'Order for BW-20931 is late.')],
			entities: { 'user-a': ['BW-20931'] },
		})
		expect(buildRecords(input).records.map((record) => record.title)).toEqual(['BW-20931'])
	})

	it('pins the bytes of both owner title forms', () => {
		const named = buildRecords(createLedgerDesk()).records.map((record) => record.title)
		expect(named[0]).toBe('Odile Marlow (OM-30418)')
		expect(named[1]).toBe('Brightwater Studio (BW-20931)')
		const bare = buildLedgerInput({
			owners: { 'BW-20931': [] },
			messages: [buildLedgerMessage('user-a', 'user', 'Order for BW-20931 is late.')],
			entities: { 'user-a': ['BW-20931'] },
		})
		expect(buildRecords(bare).records[0]?.title).toBe('BW-20931')
	})

	it('lists a live message that no record placed as an orphan', () => {
		const input = buildLedgerInput({
			messages: [buildLedgerMessage('user-a', 'user', 'Nothing names an owner here.')],
		})
		const built = buildRecords(input)
		expect(built.orphans).toEqual(['user-a'])
		expect(built.records).toEqual([])
	})

	it('places a message in every owner record its entities name', () => {
		const input = buildLedgerInput({
			owners: LEDGER_DESK_OWNERS,
			messages: [buildLedgerMessage('user-a', 'user', 'Both owners share order BW-5512.')],
			entities: { 'user-a': ['BW-20931', 'OM-30418'] },
		})
		expect(buildRecords(input).records.map((record) => record.key)).toEqual([
			'owner:BW-20931',
			'owner:OM-30418',
		])
	})

	it('orders owner records that share a first member by key whatever the entity order', () => {
		const input = buildLedgerInput({
			owners: LEDGER_DESK_OWNERS,
			messages: [buildLedgerMessage('user-a', 'user', 'Both owners share order BW-5512.')],
			entities: { 'user-a': ['OM-30418', 'BW-20931'] },
		})
		expect(buildRecords(input).records.map((record) => record.key)).toEqual([
			'owner:BW-20931',
			'owner:OM-30418',
		])
	})

	it('takes a lookup result out of every record when an empty finding replaces it (R5a)', () => {
		const text = 'Order BW-5512 for account BW-20931 (Brightwater Studio): total $10.00.'
		const input = buildLedgerInput({
			owners: LEDGER_DESK_OWNERS,
			messages: [
				buildLedgerMessage('tool-a', 'tool', text),
				buildLedgerMessage('tool-b', 'tool', 'No record of order BW-5512.'),
			],
			findings: [
				buildLedgerFinding('tool-a', 'lookup_order', { id: 'BW-5512' }, text, LEDGER_EMPTY_FOUND),
				buildLedgerFinding(
					'tool-b',
					'lookup_order',
					{ id: 'BW-5512' },
					'No record of order BW-5512.',
				),
			],
			entities: { 'tool-a': ['BW-20931'] },
		})
		const built = buildRecords(input)
		expect(built.records).toEqual([])
		expect(built.orphans).toEqual([])
		expect(checkLedgerProjection(built, input)).toEqual([])
	})

	it('keeps the earlier result when the later finding is a different call', () => {
		const text = 'Order BW-5512 for account BW-20931 (Brightwater Studio): total $10.00.'
		const input = buildLedgerInput({
			owners: LEDGER_DESK_OWNERS,
			messages: [
				buildLedgerMessage('tool-a', 'tool', text),
				buildLedgerMessage('tool-b', 'tool', 'No record of order BW-9999.'),
			],
			findings: [
				buildLedgerFinding('tool-a', 'lookup_order', { id: 'BW-5512' }, text, LEDGER_EMPTY_FOUND),
				buildLedgerFinding(
					'tool-b',
					'lookup_order',
					{ id: 'BW-9999' },
					'No record of order BW-9999.',
				),
			],
			entities: { 'tool-a': ['BW-20931'] },
		})
		expect(buildRecords(input).records.map((record) => record.members)).toEqual([['tool-a']])
	})

	it('preserves earlier text and provenance without restoring a superseded correction (R2b)', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage(
					'user-a',
					'user',
					'Standing rule: refunds need code MX-4471. Ask the lead.',
				),
				buildLedgerMessage('user-b', 'user', 'Code MX-4486 replaces MX-4471.'),
				buildLedgerMessage('user-c', 'user', 'Disregard the code change.'),
			],
			classification: {
				categories: { 'user-a': 'rule', 'user-b': 'correction' },
				amendments: { 'user-a': ['user-b'] },
				supersessions: { 'user-b': ['user-c'] },
			},
		})
		const built = buildRecords(input)
		expect(built.amendments).toEqual([{ earlier: 'user-a', later: 'user-c' }])
		const texts = built.records.flatMap((record) => record.lines.map((line) => line.text))
		expect(texts).toContain('Standing rule: refunds need code MX-4471.')
		expect(texts.some((text) => text.includes('MX-4486'))).toBe(false)
		expect(texts).toContain('Ask the lead.')
		expect(checkLedgerProjection(built, input)).toEqual([])
	})

	it('treats lookup results alike whatever the key order of their nested arguments (R8)', () => {
		const text = 'Order BW-5512 for account BW-20931 (Brightwater Studio): total $10.00.'
		const input = buildLedgerInput({
			owners: LEDGER_DESK_OWNERS,
			messages: [
				buildLedgerMessage('tool-a', 'tool', text),
				buildLedgerMessage('tool-b', 'tool', text),
			],
			findings: [
				buildLedgerFinding(
					'tool-a',
					'lookup_order',
					{ id: 'BW-5512', opts: { a: 1, b: 2 } },
					text,
					LEDGER_EMPTY_FOUND,
				),
				buildLedgerFinding(
					'tool-b',
					'lookup_order',
					{ opts: { b: 2, a: 1 }, id: 'BW-5512' },
					text,
					LEDGER_EMPTY_FOUND,
				),
			],
			entities: { 'tool-a': ['BW-20931'], 'tool-b': ['BW-20931'] },
		})
		expect(buildRecords(input).records.map((record) => record.members)).toEqual([['tool-a']])
	})

	it('pins the person prefix as measured, including a company read as the party (documented limit)', () => {
		const input = buildLedgerInput({
			system: LEDGER_DESK_SYSTEM,
			owners: LEDGER_DESK_OWNERS,
			messages: [
				buildLedgerMessage(
					'user-a',
					'user',
					'Send the parcel with Northgate Couriers. She wants a refund.',
				),
			],
			entities: { 'user-a': ['BW-20931'] },
		})
		const [record] = buildRecords(input).records
		expect(record?.lines.map((line) => line.text)).toEqual([
			'Send the parcel with Northgate Couriers.',
			'Northgate Couriers: She wants a refund.',
		])
		expect(record?.lines[1]?.party).toBe('Northgate Couriers')
	})

	it('writes no handle into a line, a title, or a render', () => {
		const built = buildRecords(createLedgerDesk())
		const rendered = built.records.flatMap((record) => [
			renderLedgerRecord(record),
			renderLedgerPinned(record),
		])
		expect(rendered.length).toBeGreaterThan(0)
		for (const text of rendered) expect(text.match(LEDGER_HANDLE)).toBeNull()
	})

	it('leaves its input as it found it and builds the same projection twice', () => {
		const input = createLedgerDesk()
		const snapshot = structuredClone(input)
		const first = buildRecords(input)
		expect(input).toEqual(snapshot)
		expect(buildRecords(input)).toEqual(first)
	})

	it('places a dense chain of corrections that each amend every earlier one on the rules record', () => {
		const ids = Array.from({ length: 24 }, (_unused, at) => `user-${String(at).padStart(2, '0')}`)
		const input = buildLedgerInput({
			messages: ids.map((id, at) =>
				buildLedgerMessage(id, 'user', `Correction ${at} of the code.`),
			),
			classification: {
				categories: { 'user-00': 'rule' },
				amendments: Object.fromEntries(ids.map((id, at) => [id, ids.slice(at + 1)])),
			},
		})
		const built = buildRecords(input)
		expect(built.records.map((record) => [record.key, record.members])).toEqual([['rules', ids]])
		expect(built.orphans).toEqual([])
	})

	it('projects nothing from an empty input', () => {
		expect(buildRecords(buildLedgerInput())).toEqual({
			records: [],
			amendments: [],
			orphans: [],
		})
	})
})

describe('selectRecords', () => {
	const built = buildRecords(createLedgerDesk())

	it('collapses equal-member owners under joined titles before the rules record', () => {
		const projection = LEDGER_OWNER_PROJECTION
		const before = JSON.stringify(projection)
		const views = selectRecords(projection, { owners: ['BW-5512', 'BW-20931'], topics: [] })
		expect(views).toEqual([
			{
				...projection.records[0],
				title: 'Brightwater Studio (BW-5512); Brightwater Studio (BW-20931)',
			},
			projection.records[2],
		])
		expect(JSON.stringify(projection)).toBe(before)
		expect(views[0]).not.toBe(projection.records[0])
		expect(views[0]?.members).not.toBe(projection.records[0]?.members)
		expect(views[0]?.lines[0]).not.toBe(projection.records[0]?.lines[0])
	})

	it('keeps same-name owners separate when one member or its order differs', () => {
		const projection = replaceLedgerRecord(LEDGER_OWNER_PROJECTION, 'owner:BW-5512', (record) => ({
			...record,
			members: [...record.members, 'only-order'],
			lines: [...record.lines, buildLedgerLine('only-order', 0, 'BW-5512 shipped.')],
		}))
		const request = { owners: ['BW-5512', 'BW-20931'], topics: [] }
		expect(JSON.stringify(selectRecords(projection, request))).toBe(
			JSON.stringify(projection.records),
		)
		const reversed = replaceLedgerRecord(LEDGER_OWNER_PROJECTION, 'owner:BW-20931', (record) => ({
			...record,
			members: record.members.toReversed(),
		}))
		expect(selectRecords(reversed, request)).toEqual(reversed.records)
		expect(selectRecords(LEDGER_OWNER_PROJECTION, { owners: ['BW-20931'], topics: [] })).toEqual([
			LEDGER_OWNER_PROJECTION.records[1],
			LEDGER_OWNER_PROJECTION.records[2],
		])
	})

	it('keeps the first requested owner key and joins titles in request order', () => {
		const views = selectRecords(LEDGER_OWNER_PROJECTION, {
			owners: ['BW-20931', 'missing', 'BW-5512', 'BW-20931'],
			topics: [],
		})
		expect(views.map((record) => record.key)).toEqual(['owner:BW-20931', 'rules'])
		expect(views[0]).toEqual({
			...LEDGER_OWNER_PROJECTION.records[1],
			title: 'Brightwater Studio (BW-20931); Brightwater Studio (BW-5512)',
		})
	})

	it('lists the requested owner records in the order named, then the rules record', () => {
		const views = selectRecords(built, {
			owners: ['OM-30418', 'BW-20931'],
			topics: [],
		})
		expect(views.map((view) => view.key)).toEqual(['owner:OM-30418', 'owner:BW-20931', 'rules'])
		expect(
			selectRecords(built, {
				owners: ['BW-20931', 'OM-30418'],
				topics: [],
			}).map((view) => view.key),
		).toEqual(['owner:BW-20931', 'owner:OM-30418', 'rules'])
	})

	it('names an owner once and skips an owner with no record', () => {
		const views = selectRecords(built, {
			owners: ['BW-20931', 'BW-20931', 'XX-1'],
			topics: [],
		})
		expect(views.map((view) => view.key)).toEqual(['owner:BW-20931', 'rules'])
		expect(selectRecords(built, createLedgerRequest()).map((view) => view.key)).toEqual([
			'owner:BW-20931',
			'rules',
		])
	})

	it('puts the rules lines that meet the request topics first, each group in position order', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('user-a', 'user', 'Standing rule about returns.'),
				buildLedgerMessage('user-b', 'user', 'Standing rule about refunds.'),
				buildLedgerMessage('user-c', 'user', 'Standing rule about refunds and shipping.'),
				buildLedgerMessage('user-d', 'user', 'Standing rule about holidays.'),
			],
			classification: {
				categories: {
					'user-a': 'rule',
					'user-b': 'rule',
					'user-c': 'rule',
					'user-d': 'rule',
				},
				topics: {
					'user-a': ['returns'],
					'user-b': ['refunds'],
					'user-c': ['refunds', 'shipping'],
					'user-d': [],
				},
			},
		})
		const [rules] = selectRecords(buildRecords(input), {
			owners: [],
			topics: ['shipping', 'refunds'],
		})
		expect(rules?.lines.map((line) => line.source)).toEqual([
			'user-b',
			'user-c',
			'user-a',
			'user-d',
		])
	})

	it('drops a hole in the rules lines and orders the lines around it', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('user-a', 'user', 'Standing rule about returns.'),
				buildLedgerMessage('user-b', 'user', 'Standing rule about refunds.'),
			],
			classification: {
				categories: { 'user-a': 'rule', 'user-b': 'rule' },
				topics: { 'user-a': ['returns'], 'user-b': ['refunds'] },
			},
		})
		const dense = buildRecords(input)
		const rules = dense.records.find((record) => record.key === 'rules')
		const [first, second] = rules?.lines ?? []
		expect(first?.source).toBe('user-a')
		expect(second?.source).toBe('user-b')
		const sparse = replaceLedgerRecord(dense, 'rules', (record) => ({
			...record,
			lines: Object.assign(new Array<LedgerLine>(3), { 0: first, 2: second }),
		}))
		expect(1 in (sparse.records.find((record) => record.key === 'rules')?.lines ?? [])).toBe(false)
		const [view] = selectRecords(sparse, { owners: [], topics: ['refunds'] })
		expect(view?.lines.map((line) => line.source)).toEqual(['user-b', 'user-a'])
		expect(view?.lines).toHaveLength(2)
	})

	it('selects only the rules record for a request that names no owner', () => {
		expect(selectRecords(built, { owners: [], topics: [] }).map((view) => view.key)).toEqual([
			'rules',
		])
		expect(
			selectRecords({ records: [], amendments: [], orphans: [] }, createLedgerRequest()),
		).toEqual([])
	})

	it('returns copies that share no record, line, or list with the projection', () => {
		const [view] = selectRecords(built, {
			owners: ['OM-30418'],
			topics: [],
		})
		const record = built.records.find((one) => one.key === 'owner:OM-30418')
		expect(view).toEqual(record)
		expect(view).not.toBe(record)
		expect(view?.lines).not.toBe(record?.lines)
		expect(view?.lines[0]).not.toBe(record?.lines[0])
		expect(view?.members).not.toBe(record?.members)
		expect(view?.lines[0]?.topics).not.toBe(record?.lines[0]?.topics)
	})
})

describe('renderLedgerRecord and renderLedgerPinned', () => {
	const view: Pick<LedgerRecord, 'title' | 'lines'> = {
		title: 'Odile Marlow (OM-30418)',
		lines: [
			{
				text: 'The caller is Odile Marlow.',
				source: 'user-a',
				sentence: 0,
				topics: [],
				role: 'user',
			},
			{
				text: 'Dana Whitcombe: She approved it.',
				source: 'user-a',
				sentence: 1,
				topics: [],
				role: 'user',
			},
		],
	}

	it('renders a heading and one list item per line', () => {
		expect(renderLedgerRecord(view)).toBe(
			'## Odile Marlow (OM-30418)\n- The caller is Odile Marlow.\n- Dana Whitcombe: She approved it.',
		)
		expect(renderLedgerPinned(view)).toBe(
			'### Odile Marlow (OM-30418)\n- The caller is Odile Marlow.\n- Dana Whitcombe: She approved it.',
		)
	})

	it('renders a record with no line as its heading alone', () => {
		expect(renderLedgerRecord({ title: 'Rules', lines: [] })).toBe('## Rules')
		expect(renderLedgerPinned({ title: 'Rules', lines: [] })).toBe('### Rules')
	})

	it('renders the desk scenario byte for byte', () => {
		const views = selectRecords(buildRecords(createLedgerDesk()), createLedgerRequest())
		expect(views.map((record) => renderLedgerRecord(record)).join('\n\n')).toBe(
			[
				'## Brightwater Studio (BW-20931)',
				'- The shift lead is Dana Whitcombe.',
				'- Dana Whitcombe: She approved the refund of $148.50 for order BW-5512.',
				'- Order BW-5512 for account BW-20931 (Brightwater Studio): linen set, total $148.50.',
				'',
				'## Rules',
				'- Standing rule: any refund over $200 needs a manager code.',
				'- This week code is MX-4471.',
				'- Correction: the manager code is MX-4486, not MX-4471.',
			].join('\n'),
		)
	})
})

describe('splitTopic', () => {
	it('splits at a comma, a semicolon, a slash, and the word and', () => {
		expect(splitTopic('BW-5512, Odile Marlow and refunds')).toEqual([
			'BW-5512',
			'Odile Marlow',
			'refunds',
		])
		expect(splitTopic('returns; shipping/refunds')).toEqual(['returns', 'shipping', 'refunds'])
		expect(splitTopic('returns AND refunds')).toEqual(['returns', 'refunds'])
	})

	it('returns a topic with no joint whole', () => {
		expect(splitTopic('refund policy')).toEqual(['refund policy'])
		expect(splitTopic('Brand and')).toEqual(['Brand and'])
		expect(splitTopic('candy bar')).toEqual(['candy bar'])
	})

	it('returns a topic whole when its joints leave fewer than two parts', () => {
		expect(splitTopic('')).toEqual([''])
		expect(splitTopic(', ')).toEqual([', '])
		expect(splitTopic('refunds,')).toEqual(['refunds,'])
	})
})

describe('cutListing and matchesCutLine', () => {
	const items = ['first recalled line', 'second recalled line', 'third recalled line']
	it('omits an oversized first group and keeps a later fitting group with its marker', () => {
		const short = 'The vault is closed.\nCorrection: the vault is open.'
		const expected = `${short}\n1 more item not shown; name a narrower topic to narrow the recall`
		const room = measureRoom([expected])
		expect(cutListing(['v'.repeat(4000), short], room, 'older', false)).toBe(expected)
		expect(cutListing(['v'.repeat(4000), short], room - 1, 'older', false)).toBe(
			"2 older items didn't fit in this request; answer from the messages you can see",
		)
		expect(matchesCutLine(cutListing([short], 0, 'more', false))).toBe(true)
		expect(cutListing([short], 0, 'more', false)).toBe(
			"1 more item didn't fit in this request; answer from the messages you can see",
		)
		expect(cutListing([short], measureRoom([short]), 'older', false)).toBe(short)
		expect(cutListing([], -1, 'older', false)).toBe('')
	})

	it('keeps every item that fits and adds no cut line', () => {
		expect(cutListing(items, measureRoom(items))).toBe(items.join('\n'))
		expect(cutListing([], 10)).toBe('')
	})

	it('cuts at the first item that overflows and names how many it left out', () => {
		expect(cutListing(items, measureRoom(items.slice(0, 2)))).toBe(
			'first recalled line\nsecond recalled line\n1 older item not shown; name a narrower topic to narrow the recall',
		)
		expect(cutListing(items, measureRoom(items.slice(0, 1)))).toBe(
			'first recalled line\n2 older items not shown; name a narrower topic to narrow the recall',
		)
	})

	it('keeps at least one item whatever the room', () => {
		expect(cutListing(items, 0)).toBe(
			'first recalled line\n2 older items not shown; name a narrower topic to narrow the recall',
		)
		expect(cutListing(items, -5).startsWith('first recalled line\n')).toBe(true)
	})

	it('matches the cut line it writes and no other line', () => {
		const cut = cutListing(items, 0).split('\n')
		expect(cut.map(matchesCutLine)).toEqual([false, true])
		expect(matchesCutLine('1 older item not shown; add a topic')).toBe(true)
		expect(matchesCutLine('3 older items not shown; ')).toBe(true)
		expect(matchesCutLine('older items not shown; ')).toBe(false)
		expect(matchesCutLine('The 2 older items not shown; ')).toBe(false)
	})

	it('names an omitted item more when the entries are not in age order, and matches that line too', () => {
		expect(cutListing(items, 0, 'more')).toBe(
			'first recalled line\n2 more items not shown; name a narrower topic to narrow the recall',
		)
		expect(cutListing(items, 0, 'more').split('\n').map(matchesCutLine)).toEqual([false, true])
		expect(matchesCutLine('1 more item not shown; add a topic')).toBe(true)
		expect(matchesCutLine('The 2 more items not shown; ')).toBe(false)
	})
})

describe('renderStub', () => {
	const args = { id: ' BW-5512 ' }

	it('renders the call and the state of each lookup result', () => {
		expect(renderStub('lookup_order', args, 'failed')).toBe(
			'lookup_order {"id":" BW-5512 "}: failed',
		)
		expect(renderStub('lookup_order', args, 'empty')).toBe(
			'lookup_order {"id":" BW-5512 "}: no record',
		)
		expect(renderStub('lookup_order', args, 'shown')).toBe(
			'lookup_order {"id":" BW-5512 "}: result shown under Records below',
		)
		expect(renderStub('lookup_order', args, 'hidden')).toBe(
			'lookup_order {"id":" BW-5512 "}: result not shown; call recall with BW-5512',
		)
	})

	it("reads a write's empty state as a call that changed nothing", () => {
		expect(renderStub('update_contact', { id: 'C-12' }, 'empty', true)).toBe(
			'update_contact {"id":"C-12"}: changed nothing',
		)
		expect(renderStub('update_contact', { id: 'C-12' }, 'empty', false)).toBe(
			'update_contact {"id":"C-12"}: no record',
		)
		expect(renderStub('update_contact', { id: 'C-12' }, 'failed', true)).toBe(
			'update_contact {"id":"C-12"}: failed',
		)
	})

	it('names its id when a hidden call carries no string argument', () => {
		expect(renderStub('lookup_order', {}, 'hidden')).toBe(
			'lookup_order {}: result not shown; call recall with its id',
		)
		expect(renderStub('lookup_order', { id: '  ', n: 4 }, 'hidden')).toBe(
			'lookup_order {"id":"  ","n":4}: result not shown; call recall with its id',
		)
	})

	it('renders the bare tool name for arguments JSON cannot carry', () => {
		const cyclic: Record<string, unknown> = { id: 'BW-5512' }
		cyclic.self = cyclic
		expect(renderStub('lookup_order', { id: 'BW-5512', count: 1n }, 'hidden')).toBe(
			'lookup_order: result not shown; call recall with BW-5512',
		)
		expect(renderStub('lookup_order', cyclic, 'failed')).toBe('lookup_order: failed')
	})

	it('writes no handle', () => {
		for (const state of ['failed', 'empty', 'shown', 'hidden'] as const) {
			expect(renderStub('lookup_order', { id: 'BW-5512' }, state).match(LEDGER_HANDLE)).toBeNull()
		}
	})
})

describe('fitSlope', () => {
	it('fits the least-squares slope of prompt over estimate', () => {
		expect(
			fitSlope([
				[buildGaugeCall(100, 130, 2), buildGaugeCall(200, 260, 2), buildGaugeCall(300, 390, 2)],
			]),
		).toBe(1.3)
	})

	it('fits within each tool count and pools the sets, so a dropped schema reads as no change in rate', () => {
		const group = [
			buildGaugeCall(100, 100, 0),
			buildGaugeCall(200, 200, 0),
			buildGaugeCall(100, 150, 2),
			buildGaugeCall(300, 350, 2),
		]
		expect(fitSlope([group])).toBe(1)
	})

	it('pools the sets of every group', () => {
		expect(
			fitSlope([
				[buildGaugeCall(100, 100, 1), buildGaugeCall(200, 200, 1)],
				[buildGaugeCall(100, 150, 1), buildGaugeCall(300, 350, 1)],
			]),
		).toBe(1)
	})

	it('returns undefined when no set holds two usable points that differ', () => {
		expect(fitSlope([])).toBeUndefined()
		expect(fitSlope([[buildGaugeCall(100, 130, 2)]])).toBeUndefined()
		expect(fitSlope([[buildGaugeCall(100, 130, 2), buildGaugeCall(100, 140, 2)]])).toBeUndefined()
		expect(fitSlope([[buildGaugeCall(100, 130, 0), buildGaugeCall(200, 260, 2)]])).toBeUndefined()
	})

	it('skips a call without a prompt count, with an estimate of zero, or with a prompt that is not finite', () => {
		expect(
			fitSlope([[buildGaugeCall(100, undefined, 2), buildGaugeCall(200, 260, 2)]]),
		).toBeUndefined()
		expect(fitSlope([[buildGaugeCall(0, 50, 2), buildGaugeCall(200, 260, 2)]])).toBeUndefined()
		expect(
			fitSlope([[buildGaugeCall(100, Number.NaN, 2), buildGaugeCall(200, 260, 2)]]),
		).toBeUndefined()
		expect(
			fitSlope([
				[
					buildGaugeCall(100, 130, 2),
					buildGaugeCall(200, 260, 2),
					buildGaugeCall(0, 9, 2),
					buildGaugeCall(50, undefined, 2),
				],
			]),
		).toBe(1.3)
	})

	it('refuses a hole in the group list, as a for…of visits it as an undefined group', () => {
		const groups: GaugeCall[][] = []
		groups[0] = [buildGaugeCall(100, 100, 1), buildGaugeCall(200, 200, 1)]
		groups[2] = [buildGaugeCall(100, 150, 1), buildGaugeCall(300, 350, 1)]
		expect(captureError(() => fitSlope(groups))).toBeInstanceOf(TypeError)
	})
})
