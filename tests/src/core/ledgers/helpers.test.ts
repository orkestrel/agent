import type {
	GaugeCall,
	LedgerLookupFinding,
	LedgerOwner,
} from '../../../../src/core/ledgers/types.js'
import type { Message } from '@src/core'
import {
	estimateTokens,
	LEDGER_EXCHANGE_LIMIT,
	LEDGER_KEY_LIMIT,
	LEDGER_QUESTIONS,
	LEDGER_SCALE_DRIFT,
} from '@src/core'
import {
	collectRecallMessages,
	filterRecallGroups,
	collectLedgerExchanges,
	collectLedgerKeys,
	collectLedgerAmenders,
	collectLedgerBrief,
	collectLedgerKnown,
	collectLedgerMatches,
	collectLedgerRecurrences,
	collectLedgerStatements,
	collectLedgerSubjects,
	collectLedgerRecurrenceGroups,
	matchesLedgerSubject,
	linkLedgerIds,
	filterLedgerShown,
	matchesShownSuccessor,
	nameLedgerExchange,
	parseLedgerExchange,
	renderLedgerKeys,
	collectRetiredFindings,
	computeLedgerChecksum,
	digestLedgerTools,
	collectLedgerReplies,
	buildLedgerIndex,
	buildRecallMessage,
	buildRequestMessage,
	findLedgerCut,
	renderTopicNames,
	scanAmendments,
	splitWords,
	buildLines,
	buildRecords,
	collectLive,
	collectNames,
	collectRegistry,
	collectAmendments,
	collectWriteSupersessions,
	computeSkillPrice,
	computeThinking,
	computeToolDensity,
	computeToolPrice,
	requirePredict,
	collectQuestionKeys,
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
	renderLookupCall,
	splitResultLines,
	splitSentences,
	splitKey,
} from '../../../../src/core/ledgers/helpers.js'
import { captureError, createRecorder, invokeUnchecked, requireValue } from '@orkestrel/test'
import { describe, expect, it } from 'vitest'
import {
	buildGaugeCall,
	measureRoom,
	LEDGER_EMPTY_FOUND,
	buildLedgerClassification,
	buildLedgerInput,
	buildLedgerMessage,
	buildLedgerFinding,
	buildLedgerKeyScenario,
	buildLedgerBriefInput,
	buildLedgerWriteScenario,
	LEDGER_BRIEF_REQUESTS,
	LEDGER_KEY_TOPICS,
	LEDGER_WRITE_SUPERSESSIONS,
	checkLedgerProjection,
	createLedgerDesk,
	LEDGER_DESK_OWNERS,
	LEDGER_DESK_SYSTEM,
	LEDGER_HANDLE,
	buildDensityDefinition,
	LEDGER_DENSITY_CALIBRATION,
	LEDGER_DENSITY_CORE,
	LEDGER_DENSITY_SAMPLES,
	LEDGER_LIVE_LOOKUPS,
	LEDGER_LIVE_RATES,
	LEDGER_PRICE_DEFINITIONS,
	LEDGER_TOOL_PRICE_CASES,
} from '../../../setup.js'

describe('extracted ledger leaves', () => {
	it('collects each recallable origin including quiet statements but not notes, calls, blanks, or unread tool results', () => {
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
				calls: [{ id: 'call_00000000', name: 'recall', arguments: { key: topic } }],
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

	it('normalizes recall words without dropping internal punctuation', () => {
		expect(splitWords('  “Refunds,” BW-5512! $148.50  ')).toEqual(['refunds', 'bw-5512', '148.50'])
		expect(splitWords('... $ ')).toEqual([])
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

describe('requirePredict', () => {
	it('returns a cap at its boundaries and refuses an absent, zero, or invalid cap', () => {
		for (const predict of [1, 4095]) expect(requirePredict(predict, 4096)).toBe(predict)
		expect(() => invokeUnchecked(undefined, requirePredict, [undefined, 4096])).toThrow(
			expect.objectContaining({ code: 'CAPACITY' }),
		)
		for (const predict of [0, -0, -1, 0.5, 4096, 4097, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
			expect(() => requirePredict(predict, 4096)).toThrow(
				expect.objectContaining({ code: 'CAPACITY' }),
			)
	})
})

describe('collectQuestionKeys', () => {
	it('lists the candidate keys of each question form in reading order', () => {
		expect(collectQuestionKeys({ form: 'noul' })).toEqual(['true', 'false'])
		expect(collectQuestionKeys(LEDGER_QUESTIONS.category)).toEqual([
			'fact',
			'rule',
			'correction',
			'request',
			'opinion',
			'chatter',
			'distractor',
		])
		expect(collectQuestionKeys({ form: 'score', criteria: ['low', 'mid', 'high'] })).toEqual([
			'0',
			'1',
			'2',
		])
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

	it('writes no handle into a line or a title', () => {
		const built = buildRecords(createLedgerDesk())
		const texts = built.records.flatMap((record) => [
			record.title,
			...record.lines.map((line) => line.text),
		])
		expect(texts.length).toBeGreaterThan(0)
		for (const text of texts) expect(text.match(LEDGER_HANDLE)).toBeNull()
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

describe('splitKey', () => {
	it('splits at a comma, a semicolon, a slash, and the word and', () => {
		expect(splitKey('BW-5512, Odile Marlow and refunds')).toEqual([
			'BW-5512',
			'Odile Marlow',
			'refunds',
		])
		expect(splitKey('returns; shipping/refunds')).toEqual(['returns', 'shipping', 'refunds'])
		expect(splitKey('returns AND refunds')).toEqual(['returns', 'refunds'])
	})

	it('returns a key with no joint whole', () => {
		expect(splitKey('refund policy')).toEqual(['refund policy'])
		expect(splitKey('Brand and')).toEqual(['Brand and'])
		expect(splitKey('candy bar')).toEqual(['candy bar'])
	})

	it('returns a key whole when its joints leave fewer than two parts', () => {
		expect(splitKey('')).toEqual([''])
		expect(splitKey(', ')).toEqual([', '])
		expect(splitKey('refunds,')).toEqual(['refunds,'])
	})
})

describe('cutListing and matchesCutLine', () => {
	const items = ['first recalled line', 'second recalled line', 'third recalled line']
	it('omits an oversized first group and keeps a later fitting group with its marker', () => {
		const short = 'The vault is closed.\nCorrection: the vault is open.'
		const expected = `${short}\n1 more item not shown; name a narrower key to narrow the recall`
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
			'first recalled line\nsecond recalled line\n1 older item not shown; name a narrower key to narrow the recall',
		)
		expect(cutListing(items, measureRoom(items.slice(0, 1)))).toBe(
			'first recalled line\n2 older items not shown; name a narrower key to narrow the recall',
		)
	})

	it('keeps at least one item whatever the room', () => {
		expect(cutListing(items, 0)).toBe(
			'first recalled line\n2 older items not shown; name a narrower key to narrow the recall',
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
			'first recalled line\n2 more items not shown; name a narrower key to narrow the recall',
		)
		expect(cutListing(items, 0, 'more').split('\n').map(matchesCutLine)).toEqual([false, true])
		expect(matchesCutLine('1 more item not shown; add a topic')).toBe(true)
		expect(matchesCutLine('The 2 more items not shown; ')).toBe(false)
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

describe('computeToolPrice', () => {
	it.each(LEDGER_TOOL_PRICE_CASES)('$title', ({ advertised, gauge, spared, added }) => {
		const calibrated = [LEDGER_PRICE_DEFINITIONS.a, LEDGER_PRICE_DEFINITIONS.b]
		expect(computeToolPrice(calibrated, advertised, gauge)).toEqual({ spared, added })
	})

	it('prices 42 of 122 definitions on a model whose definitions cost less a unit than its messages within 1.06 of the charge', () => {
		const calibrated = LEDGER_LIVE_LOOKUPS.map(({ tool }) => ({
			name: tool.name,
			description: tool.description ?? '',
			parameters: { type: 'object' },
		}))
		const advertised = calibrated.slice(0, 42)
		const { scale, definitions } = LEDGER_LIVE_RATES
		const overhead = definitions * estimateTokens(JSON.stringify(calibrated))
		const { spared, added } = computeToolPrice(calibrated, advertised, { scale, overhead })
		const messages = 400
		const price = Math.max(0, overhead - spared) + added + scale * messages
		const charge = scale * messages + definitions * estimateTokens(JSON.stringify(advertised))
		expect(price * (1 + LEDGER_SCALE_DRIFT)).toBeGreaterThanOrEqual(charge)
		expect(price).toBeLessThanOrEqual(charge * (1 + LEDGER_SCALE_DRIFT))
	})

	it('adds at scale over an empty calibrated set, and spares nothing', () => {
		expect(
			computeToolPrice([], [LEDGER_PRICE_DEFINITIONS.extra], { scale: 1.2, overhead: 0 }),
		).toEqual({ spared: 0, added: 120 })
	})

	it('prices every density sample the 4B read at or above the tokens it added to the core', () => {
		const { scale, overhead, noise, estimate } = LEDGER_DENSITY_CALIBRATION
		const core = LEDGER_DENSITY_CORE.map(buildDensityDefinition)
		expect(estimateTokens(JSON.stringify(core))).toBe(estimate)
		const rows = LEDGER_DENSITY_SAMPLES.map((sample) => {
			const definitions = sample.rows.map(buildDensityDefinition)
			return {
				name: sample.name,
				estimate: estimateTokens(JSON.stringify(definitions)),
				priced: computeToolPrice(core, [...core, ...definitions], { scale, overhead }).added,
				bare: computeToolPrice(core, [...core, ...definitions], { scale, overhead: 0 }).added,
				added: sample.added,
				recorded: sample.estimate,
			}
		})
		expect(rows.map((row) => row.name)).toEqual([
			'desk-tickets',
			'desk-customers',
			'desk-billing',
			'desk-orders',
			'desk-inventory',
			'desk-staff',
			'taverna-policies',
			'taverna-claims',
			'taverna-contacts',
		])
		for (const row of rows) {
			expect(row.estimate).toBe(row.recorded)
			expect(row.priced + noise).toBeGreaterThanOrEqual(row.added)
		}
		// The control: at scale alone, the addition term underprices what the 4B read.
		expect(rows.filter((row) => row.bare + noise < row.added).length).toBeGreaterThan(0)
	})
})

describe('computeToolDensity', () => {
	it.each([
		['the overhead per estimate unit when it exceeds scale', { scale: 1.2, overhead: 300 }, 3],
		['scale when it exceeds the overhead per estimate unit', { scale: 4, overhead: 300 }, 4],
		['scale with no overhead', { scale: 1.2, overhead: 0 }, 1.2],
	] as const)('returns %s', (_title, gauge, density) => {
		const calibrated = [LEDGER_PRICE_DEFINITIONS.a, LEDGER_PRICE_DEFINITIONS.b]
		expect(computeToolDensity(calibrated, gauge)).toBe(density)
	})

	it('returns scale for an empty calibrated set', () => {
		expect(computeToolDensity([], { scale: 1.2, overhead: 300 })).toBe(1.2)
	})
})

describe('computeSkillPrice', () => {
	it('prices the body at scale and the definitions the skill adds as an addition', () => {
		const calibrated = [LEDGER_PRICE_DEFINITIONS.a, LEDGER_PRICE_DEFINITIONS.b]
		const gauge = { scale: 1.2, overhead: 300 }
		const skill = { name: 'refunds', content: 'Check the order first.' }
		expect(computeSkillPrice(skill, [], calibrated, gauge)).toBeCloseTo(10.8, 10)
		expect(
			computeSkillPrice(skill, [LEDGER_PRICE_DEFINITIONS.extra], calibrated, gauge),
		).toBeCloseTo(310.8, 10)
	})

	it('prices no body for blank content and still prices the definitions it adds', () => {
		const calibrated = [LEDGER_PRICE_DEFINITIONS.a, LEDGER_PRICE_DEFINITIONS.b]
		const gauge = { scale: 1.2, overhead: 300 }
		expect(computeSkillPrice({ name: 'blank', content: ' \n ' }, [], calibrated, gauge)).toBe(0)
		expect(
			computeSkillPrice(
				{ name: 'blank', content: '' },
				[LEDGER_PRICE_DEFINITIONS.extra],
				calibrated,
				gauge,
			),
		).toBe(300)
	})
})

describe('collectLedgerStatements', () => {
	it('collects the user statements after the last reply, or after the last request without one, leaving notes and requests out', () => {
		for (const replied of [true, false]) {
			const { input, requests, notes } = buildLedgerKeyScenario(replied)
			const before = input.messages.slice(0, -1)
			expect(collectLedgerStatements(before, requests, notes).map((message) => message.id)).toEqual(
				['quiet', 'refund'],
			)
		}
	})

	it('collects every user statement of a seed before the first request', () => {
		const { input, requests, notes } = buildLedgerKeyScenario(true)
		const seed = input.messages.slice(
			0,
			input.messages.findIndex((message) => message.id === 'first'),
		)
		expect(collectLedgerStatements(seed, requests, notes).map((message) => message.id)).toEqual([
			'rule',
			'order',
			'ticket',
		])
		expect(collectLedgerStatements([], requests, notes)).toEqual([])
	})
})

describe('collectLedgerAmenders', () => {
	const messages = [
		buildLedgerMessage('stated', 'user', 'OR-7 ships Friday.'),
		buildLedgerMessage('early', 'user', 'Correction: OR-7 ships Sunday.'),
		buildLedgerMessage('ask-1', 'user', 'Check OR-7.'),
		buildLedgerMessage('mid', 'user', 'Correction: OR-7 ships Tuesday.'),
		buildLedgerMessage('reply-1', 'assistant', 'OR-7 ships Friday.'),
		buildLedgerMessage('fixed', 'user', 'Correction: OR-7 ships Monday.'),
		buildLedgerMessage('plain', 'user', 'The van is blue.'),
		buildLedgerMessage('note', 'user', 'Correction note.'),
		buildLedgerMessage('ask-2', 'user', 'Check OR-8.'),
		buildLedgerMessage('reply-2', 'assistant', 'OR-8 ships Tuesday.'),
		buildLedgerMessage('late', 'user', 'Correction: OR-8 ships Wednesday.'),
	]
	const requests = new Set(['ask-1', 'ask-2'])
	const notes = new Set(['note'])
	const amendments = new Map([
		['stated', ['early', 'mid', 'fixed', 'note']],
		['ask-2', ['ask-1', 'late']],
	])
	const exchanges = collectLedgerExchanges(messages, requests, notes)

	it("collects the later sides inside the span, from the oldest exchange's request to the newest's reply, in conversation order", () => {
		// `early` precedes the oldest request and `late` follows the newest reply; a request, a note, and
		// a statement no amendment names are no amenders.
		expect(
			collectLedgerAmenders(messages, amendments, requests, notes, exchanges).map(
				(message) => message.id,
			),
		).toEqual(['mid', 'fixed'])
	})

	it('narrows the span to the exchanges given, and collects nothing for none', () => {
		expect(
			collectLedgerAmenders(messages, amendments, requests, notes, exchanges.slice(0, 1)).map(
				(message) => message.id,
			),
		).toEqual([])
		expect(collectLedgerAmenders(messages, amendments, requests, notes, [])).toEqual([])
	})

	it("collects the amenders inside each run's span and none between two runs", () => {
		const runs = [
			buildLedgerMessage('ask-1', 'user', 'Check OR-1.'),
			buildLedgerMessage('inside-1', 'user', 'Correction: OR-1 ships Monday.'),
			buildLedgerMessage('reply-1', 'assistant', 'OR-1 ships Friday.'),
			buildLedgerMessage('between', 'user', 'Correction: OR-2 ships Monday.'),
			buildLedgerMessage('ask-2', 'user', 'Check OR-2.'),
			buildLedgerMessage('reply-2', 'assistant', 'OR-2 ships Friday.'),
			buildLedgerMessage('ask-3', 'user', 'Check OR-3.'),
			buildLedgerMessage('reply-3', 'assistant', 'OR-3 ships Friday.'),
			buildLedgerMessage('inside-3', 'user', 'Correction: OR-3 ships Monday.'),
			buildLedgerMessage('ask-4', 'user', 'Check OR-4.'),
			buildLedgerMessage('reply-4', 'assistant', 'OR-4 ships Friday.'),
		]
		const asks = new Set(['ask-1', 'ask-2', 'ask-3', 'ask-4'])
		const laters = new Map([['stated', ['inside-1', 'between', 'inside-3']]])
		const all = collectLedgerExchanges(runs, asks, new Set())
		// Exchanges 4, 3, and 1 make two runs, 4 and 3, then 1: `inside-3` sits inside the first run's
		// span and `inside-1` inside the second's, while `between` sits between the runs.
		expect(
			collectLedgerAmenders(
				runs,
				laters,
				asks,
				new Set(),
				all.filter((exchange) => exchange.request.id !== 'ask-2'),
			).map((message) => message.id),
		).toEqual(['inside-1', 'inside-3'])
		// With every exchange the window is one run, whose span holds all three.
		expect(
			collectLedgerAmenders(runs, laters, asks, new Set(), all).map((message) => message.id),
		).toEqual(['inside-1', 'between', 'inside-3'])
	})
})

describe('filterLedgerShown', () => {
	const shown = [
		buildLedgerMessage('old', 'user', 'The hall is booked.'),
		buildLedgerMessage('ask', 'user', 'Is the hall booked?'),
		buildLedgerMessage('reply', 'assistant', 'It is booked.'),
		buildLedgerMessage('mid', 'user', 'Correction: the hall is held.'),
		buildLedgerMessage('new', 'user', 'Correction: the hall is free.'),
	]

	it('drops a statement a chain of supersessions links to another shown message, and keeps the rest in order', () => {
		// `old` is superseded by `mid`, which `new` supersedes in turn; `ask` is a request.
		const supersessions = new Map([
			['old', ['mid']],
			['mid', ['new']],
			['ask', ['new']],
		])
		expect(
			filterLedgerShown(shown, supersessions, new Set(['ask'])).map((message) => message.id),
		).toEqual(['ask', 'reply', 'new'])
		// Without `mid` shown, `old` still reaches `new` through it.
		expect(
			filterLedgerShown(
				shown.filter((message) => message.id !== 'mid'),
				supersessions,
				new Set(['ask']),
			).map((message) => message.id),
		).toEqual(['ask', 'reply', 'new'])
	})

	it('keeps a statement whose successors are not shown, and a statement no supersession names', () => {
		expect(
			filterLedgerShown(shown.slice(0, 3), new Map([['old', ['new']]]), new Set(['ask'])).map(
				(message) => message.id,
			),
		).toEqual(['old', 'ask', 'reply'])
		expect(filterLedgerShown(shown, new Map(), new Set(['ask']))).toEqual(shown)
	})
})

describe('matchesShownSuccessor', () => {
	const supersessions = new Map([
		['old', ['mid']],
		['mid', ['new']],
	])

	it('reports a successor, or a successor of a successor, that the set holds', () => {
		expect(matchesShownSuccessor(supersessions, 'old', new Set(['mid']))).toBe(true)
		expect(matchesShownSuccessor(supersessions, 'old', new Set(['new']))).toBe(true)
	})

	it('reports no successor the set lacks, and never the message itself', () => {
		expect(matchesShownSuccessor(supersessions, 'old', new Set(['other']))).toBe(false)
		expect(matchesShownSuccessor(supersessions, 'old', new Set(['old']))).toBe(false)
		expect(matchesShownSuccessor(supersessions, 'new', new Set(['old', 'mid', 'new']))).toBe(false)
	})
})

describe('collectLedgerRecurrences', () => {
	it('collects the newest member of each recurrence, newest first, and no lone statement', () => {
		const messages = [
			buildLedgerMessage('day-1', 'user', 'Current workday: 2031-02-03.'),
			buildLedgerMessage('crate-1', 'user', 'Crate OR-1 is in bay 4.'),
			buildLedgerMessage('lone', 'user', 'The van is blue.'),
			buildLedgerMessage('ask', 'user', 'What is open?'),
			buildLedgerMessage('reply', 'assistant', 'Nothing.'),
			buildLedgerMessage('crate-2', 'user', 'Crate OR-2 is in bay 5.'),
			buildLedgerMessage('day-2', 'user', 'Current workday: 2031-02-04.'),
			buildLedgerMessage('day-3', 'user', 'Current workday: 2031-02-05.'),
		]
		expect(
			collectLedgerRecurrences(messages, new Set(['ask']), new Set(), new Set()).map(
				(message) => message.id,
			),
		).toEqual(['day-3', 'crate-2'])
	})

	it('leaves requests, notes, quiet statements, and messages with calls out of every recurrence', () => {
		const messages: readonly Message[] = [
			buildLedgerMessage('stated', 'user', 'Current workday: 2031-02-03.'),
			buildLedgerMessage('asked', 'user', 'Current workday: 2031-02-04.'),
			buildLedgerMessage('noted', 'user', 'Current workday: 2031-02-05.'),
			buildLedgerMessage('quiet', 'user', 'Current workday: 2031-02-06.'),
			{
				...buildLedgerMessage('called', 'user', 'Current workday: 2031-02-07.'),
				calls: [{ id: 'c1', name: 'lookup', arguments: { id: 'OR-1' } }],
			},
		]
		expect(
			collectLedgerRecurrences(
				messages,
				new Set(['asked']),
				new Set(['noted']),
				new Set(['quiet']),
			),
		).toEqual([])
		expect(
			collectLedgerRecurrences(messages, new Set(), new Set(), new Set()).map(
				(message) => message.id,
			),
		).toEqual(['quiet'])
	})
})

describe('collectLedgerRecurrenceGroups', () => {
	it('collects every member of each recurrence in conversation order, the recurrences by their first members, and no lone statement', () => {
		const messages = [
			buildLedgerMessage('day-1', 'user', 'Current workday: 2031-02-03.'),
			buildLedgerMessage('crate-1', 'user', 'Crate OR-1 is in bay 4.'),
			buildLedgerMessage('lone', 'user', 'The van is blue.'),
			buildLedgerMessage('ask', 'user', 'What is open?'),
			buildLedgerMessage('reply', 'assistant', 'Nothing.'),
			buildLedgerMessage('crate-2', 'user', 'Crate OR-2 is in bay 5.'),
			buildLedgerMessage('day-2', 'user', 'Current workday: 2031-02-04.'),
			buildLedgerMessage('day-3', 'user', 'Current workday: 2031-02-05.'),
		]
		expect(
			collectLedgerRecurrenceGroups(messages, new Set(['ask']), new Set(), new Set()).map(
				(members) => members.map((message) => message.id),
			),
		).toEqual([
			['day-1', 'day-2', 'day-3'],
			['crate-1', 'crate-2'],
		])
	})

	it('leaves a quiet statement out before grouping, so it makes no recurrence with a loud one', () => {
		const messages = [
			buildLedgerMessage('loud', 'user', 'Current workday: 2031-02-03.'),
			buildLedgerMessage('quiet', 'user', 'Current workday: 2031-02-04.'),
		]
		expect(
			collectLedgerRecurrenceGroups(messages, new Set(), new Set(), new Set(['quiet'])),
		).toEqual([])
		expect(
			collectLedgerRecurrenceGroups(messages, new Set(), new Set(), new Set()).map((members) =>
				members.map((message) => message.id),
			),
		).toEqual([['loud', 'quiet']])
	})

	it('leaves requests, notes, and messages with calls out of every recurrence', () => {
		const messages: readonly Message[] = [
			buildLedgerMessage('stated', 'user', 'Current workday: 2031-02-03.'),
			buildLedgerMessage('asked', 'user', 'Current workday: 2031-02-04.'),
			buildLedgerMessage('noted', 'user', 'Current workday: 2031-02-05.'),
			{
				...buildLedgerMessage('called', 'user', 'Current workday: 2031-02-07.'),
				calls: [{ id: 'c1', name: 'lookup', arguments: { id: 'OR-1' } }],
			},
		]
		expect(
			collectLedgerRecurrenceGroups(messages, new Set(['asked']), new Set(['noted']), new Set()),
		).toEqual([])
	})
})

describe('collectLedgerKnown', () => {
	it('knows an id another statement carries, and no id only its own statement carries', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('open', 'user', 'Case BC-7301 is open.'),
				buildLedgerMessage('tagged', 'user', '[Source SRC-9] BC-7301 called back.'),
				buildLedgerMessage('request', 'user', 'What about BC-7301?'),
			],
		})
		const known = collectLedgerKnown(input, 'request', new Set(['request']), new Set())
		expect(known).toEqual(
			new Map([
				['open', ['BC-7301']],
				['tagged', ['BC-7301']],
				['request', ['BC-7301']],
			]),
		)
	})

	it('sets aside a date two same-day sources share when a day marker of a recurrence carries it', () => {
		const sources = [
			buildLedgerMessage('roof', 'user', 'Source email on 2031-03-11: the roof claim is filed.'),
			buildLedgerMessage('photos', 'user', 'Source call on 2031-03-11: the photos arrived.'),
		]
		const marked = buildLedgerInput({
			messages: [
				buildLedgerMessage('marker-1', 'user', 'Current workday: 2031-03-11.'),
				...sources,
				buildLedgerMessage('marker-2', 'user', 'Current workday: 2031-03-12.'),
				buildLedgerMessage('request', 'user', 'What came in?'),
			],
		})
		expect(
			collectLedgerKnown(marked, 'request', new Set(['request']), new Set()).get('roof'),
		).toEqual([])
		// With one marker there is no recurrence, so the shared date is known.
		const lone = buildLedgerInput({
			messages: [
				buildLedgerMessage('marker-1', 'user', 'Current workday: 2031-03-11.'),
				...sources,
				buildLedgerMessage('request', 'user', 'What came in?'),
			],
		})
		expect(
			collectLedgerKnown(lone, 'request', new Set(['request']), new Set()).get('roof'),
		).toEqual(['2031-03-11'])
	})

	it('keeps an id the registry carries known though a recurrence member carries it too', () => {
		const messages = [
			buildLedgerMessage('lead-1', 'user', 'Duty lead BC-7301 on 2031-03-11.'),
			buildLedgerMessage('roof', 'user', 'BC-7301 filed the roof claim.'),
			buildLedgerMessage('photos', 'user', 'BC-7301 sent the photos.'),
			buildLedgerMessage('lead-2', 'user', 'Duty lead BC-7302 on 2031-03-12.'),
			buildLedgerMessage('request', 'user', 'What came in?'),
		]
		const requests = new Set(['request'])
		expect(
			collectLedgerKnown(buildLedgerInput({ messages }), 'request', requests, new Set()).get(
				'roof',
			),
		).toEqual([])
		const registered = buildLedgerInput({
			messages,
			findings: [
				buildLedgerFinding('lookup', 'lookup', { id: 'BC-7301' }, 'Case BC-7301: open.', {
					ids: ['BC-7301'],
					owners: [],
				}),
			],
		})
		expect(collectLedgerKnown(registered, 'request', requests, new Set()).get('roof')).toEqual([
			'BC-7301',
		])
	})

	it('reads the registry ids the entities name, and holds no quiet statement, no message after the request, and no note as a carrier', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('studio', 'user', 'Brightwater Studio called.'),
				buildLedgerMessage('quiet', 'user', 'Thanks for BC-7301.'),
				buildLedgerMessage('open', 'user', 'BC-7301 is open.'),
				buildLedgerMessage('note', 'user', 'Answer about BC-7312 now.'),
				buildLedgerMessage('held', 'user', 'BC-7312 is held.'),
				buildLedgerMessage('request', 'user', 'What is open?'),
				buildLedgerMessage('after', 'user', 'BC-7312 shipped.'),
			],
			findings: [
				buildLedgerFinding('lookup', 'lookup', { id: 'BW-20931' }, 'Account BW-20931.', {
					ids: ['BW-20931'],
					owners: [{ id: 'BW-20931', names: ['Brightwater Studio'] }],
				}),
			],
			entities: { studio: ['BW-20931'] },
			classification: { quiet: ['quiet'] },
		})
		expect(collectLedgerKnown(input, 'request', new Set(['request']), new Set(['note']))).toEqual(
			new Map([
				['studio', ['BW-20931']],
				['quiet', ['BC-7301']],
				['open', []],
				['held', []],
				['request', []],
			]),
		)
	})
})

describe('linkLedgerIds', () => {
	it('links the ids of each group and of groups that share one, labeled by the first id in sorted order', () => {
		const labels = linkLedgerIds(
			[],
			[['BC-7312', 'BC-7301'], ['BC-7312', 'CS-7305'], ['BC-9000'], ['BC-8000', 'BC-8100']],
		)
		expect(labels).toEqual(
			new Map([
				['BC-7301', 'BC-7301'],
				['BC-7312', 'BC-7301'],
				['CS-7305', 'BC-7301'],
				['BC-8000', 'BC-8000'],
				['BC-8100', 'BC-8000'],
			]),
		)
		// A lone id no link reaches has no label.
		expect(labels.has('BC-9000')).toBe(false)
	})

	it('links owners that share a name and an argument to the owner its finding names', () => {
		const labels = linkLedgerIds(
			[
				buildLedgerFinding('first', 'lookup', { id: 'BC-7301' }, 'Owner BC-7301: Mara Ellison.', {
					ids: ['BC-7301'],
					owners: [{ id: 'BC-7301', names: ['Mara Ellison'] }],
				}),
				buildLedgerFinding('second', 'lookup', { id: 'BC-7444' }, 'Owner BC-7444: Mara Ellison.', {
					ids: ['BC-7444'],
					owners: [{ id: 'BC-7444', names: ['Mara Ellison'] }],
				}),
				buildLedgerFinding('claim', 'lookup', { id: 'CS-7305' }, 'Claim CS-7305 of BC-7301.', {
					ids: ['CS-7305'],
					owners: [],
				}),
			],
			[],
		)
		expect(labels.get('BC-7444')).toBe('BC-7301')
		expect(labels.get('CS-7305')).toBe('BC-7301')
	})

	it('links a registry id to each other literal id inside it, and no group id to the ids inside it', () => {
		const findings = [
			buildLedgerFinding('pair', 'lookup', { id: 'BC-7301/CS-7305' }, 'Pair found.', {
				ids: ['BC-7301/CS-7305'],
				owners: [],
			}),
		]
		expect(linkLedgerIds(findings, [])).toEqual(
			new Map([
				['BC-7301', 'BC-7301'],
				['BC-7301/CS-7305', 'BC-7301'],
				['CS-7305', 'BC-7301'],
			]),
		)
		expect(linkLedgerIds([], [['BC-7301/CS-7305', 'BC-7400']]).has('CS-7305')).toBe(false)
	})
})

describe('collectLedgerBrief', () => {
	it('collects the desk rule, the opening note, and the register of a second day, and no source, marker, quiet, or superseded statement', () => {
		expect(
			collectLedgerBrief(buildLedgerBriefInput(), 'ask-2', LEDGER_BRIEF_REQUESTS, new Set()).map(
				(message) => message.id,
			),
		).toEqual(['desk', 'note', 'register'])
	})

	it("knows the opening note's ids through the register, so the note stays for its two subjects", () => {
		expect(
			collectLedgerKnown(buildLedgerBriefInput(), 'ask-2', LEDGER_BRIEF_REQUESTS, new Set()).get(
				'note',
			),
		).toEqual(['BC-7301', 'BC-7312'])
	})

	it.each([
		[
			'keeps the one-case sources while a lone day marker leaves their date counted as an id, an accepted limit until a second marker is stored',
			{ marked: false },
			['desk', 'note', 'register', 'source-1', 'source-2', 'source-3', 'source-4'],
		],
		[
			'keeps the quiet statement when the judge files it loud',
			{ quiet: [] },
			['desk', 'note', 'register', 'thanks'],
		],
		[
			'keeps the hours when nothing amends or supersedes them',
			{ supersessions: {} },
			['desk', 'note', 'register', 'hours'],
		],
		[
			'drops the desk rule when a later correction amends it',
			{
				later: [buildLedgerMessage('desk-fix', 'user', 'Correction: confirm each callback twice.')],
				amendments: { desk: ['desk-fix'] },
			},
			['note', 'register'],
		],
		[
			'drops the note when a later statement links its two cases',
			{ later: [buildLedgerMessage('shared', 'user', 'BC-7301 and BC-7312 share one adjuster.')] },
			['desk', 'register'],
		],
		[
			'keeps the note when that later statement is quiet',
			{
				later: [buildLedgerMessage('shared', 'user', 'BC-7301 and BC-7312 share one adjuster.')],
				quiet: ['thanks', 'shared'],
			},
			['desk', 'note', 'register'],
		],
		[
			'drops the note when a lookup links one of its cases to the other',
			{
				findings: [
					buildLedgerFinding(
						'lookup',
						'lookup',
						{ id: 'BC-7312' },
						'Case BC-7312 belongs to account BC-7301.',
						{ ids: ['BC-7312'], owners: [{ id: 'BC-7301', names: ['Mara Ellison'] }] },
					),
				],
			},
			['desk', 'register'],
		],
	])('%s', (_case, options, expected) => {
		expect(
			collectLedgerBrief(
				buildLedgerBriefInput(options),
				'ask-2',
				LEDGER_BRIEF_REQUESTS,
				new Set(),
			).map((message) => message.id),
		).toEqual(expected)
	})

	it('keeps a note when later statements share only a date it does not carry with each of its cases', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('note', 'user', 'Opening note: BC-7301 and BC-7312 need a callback.'),
				buildLedgerMessage('register', 'user', 'Register: BC-7301, BC-7312, BC-7320.'),
				buildLedgerMessage('ask-1', 'user', 'What is open?'),
				buildLedgerMessage('reply-1', 'assistant', 'Two callbacks.'),
				buildLedgerMessage('first', 'user', 'On 2031-03-11 BC-7301 called.'),
				buildLedgerMessage('second', 'user', 'BC-7312 wrote on 2031-03-11.'),
				buildLedgerMessage('ask-2', 'user', 'Anything else?'),
			],
		})
		// The date is known, because both later statements carry it, but the note doesn't carry it, so
		// it links neither of the note's cases to the other.
		expect(
			collectLedgerBrief(input, 'ask-2', new Set(['ask-1', 'ask-2']), new Set()).map(
				(message) => message.id,
			),
		).toEqual(['note', 'register'])
	})

	it('drops a two-case statement that a later statement names with both of its cases', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('note', 'user', 'Opening note: BC-7301 and BC-7312 need a callback.'),
				buildLedgerMessage('ask-1', 'user', 'What is open?'),
				buildLedgerMessage('reply-1', 'assistant', 'Two callbacks.'),
				buildLedgerMessage('both', 'user', 'BC-7301 and BC-7312 share one adjuster.'),
				buildLedgerMessage('ask-2', 'user', 'Anything else?'),
			],
		})
		expect(collectLedgerBrief(input, 'ask-2', new Set(['ask-1', 'ask-2']), new Set())).toEqual([])
	})

	it('drops a statement whose case the registry links to the case a later statement names beside its other id', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('invoice', 'user', 'Case BC-7301 has invoice IN-7301.'),
				buildLedgerMessage('ask-1', 'user', 'What is open?'),
				buildLedgerMessage('reply-1', 'assistant', 'One invoice.'),
				buildLedgerMessage('paid', 'user', 'BC-4101 paid invoice IN-7301.'),
				buildLedgerMessage('ask-2', 'user', 'Anything else?'),
			],
			findings: [
				buildLedgerFinding(
					'lookup',
					'lookup',
					{ id: 'BC-4101' },
					'Account BC-4101 belongs to BC-7301.',
					{ ids: ['BC-4101'], owners: [{ id: 'BC-7301', names: ['Mara Ellison'] }] },
				),
			],
		})
		// The registry links BC-4101 to BC-7301, so the later statement names one group of the
		// candidate's and its invoice together, and the candidate's ids fall in one subject.
		expect(collectLedgerBrief(input, 'ask-2', new Set(['ask-1', 'ask-2']), new Set())).toEqual([])
	})

	it('reads a candidate again at each request: absent while one case is known, present once a second is, absent once both link, an accepted limit', () => {
		const messages = [
			buildLedgerMessage('register', 'user', 'Register: BC-7320 Ana Ruiz.'),
			buildLedgerMessage('claim', 'user', 'BC-7320 filed claim CLM-501.'),
			buildLedgerMessage('ask-1', 'user', 'What is open?'),
			buildLedgerMessage('reply-1', 'assistant', 'One claim.'),
			buildLedgerMessage('ask-2', 'user', 'Anything else?'),
			buildLedgerMessage('reply-2', 'assistant', 'Nothing else.'),
			buildLedgerMessage('approved', 'user', 'CLM-501 was approved.'),
			buildLedgerMessage('ask-3', 'user', 'Anything new?'),
			buildLedgerMessage('reply-3', 'assistant', 'An approval.'),
			buildLedgerMessage('settled', 'user', 'BC-7320 and CLM-501 are settled.'),
			buildLedgerMessage('ask-4', 'user', 'Anything more?'),
		]
		const input = buildLedgerInput({ messages })
		const requests = new Set(['ask-1', 'ask-2', 'ask-3', 'ask-4'])
		expect(
			['ask-2', 'ask-3', 'ask-4'].map((request) =>
				collectLedgerBrief(input, request, requests, new Set()).map((message) => message.id),
			),
		).toEqual([[], ['claim'], []])
	})

	it('reads every statement before a request no earlier request precedes, drops an amended statement, and carries no amender', () => {
		const messages = [
			buildLedgerMessage('desk', 'user', 'Desk rule: confirm each callback.'),
			buildLedgerMessage('ask-1', 'user', 'What is open?'),
			buildLedgerMessage('reply-1', 'assistant', 'Nothing.'),
			buildLedgerMessage('fix', 'user', 'Correction: confirm each callback twice.'),
			buildLedgerMessage('ask-2', 'user', 'Anything else?'),
		]
		const requests = new Set(['ask-1', 'ask-2'])
		expect(
			collectLedgerBrief(buildLedgerInput({ messages }), 'ask-1', requests, new Set()).map(
				(message) => message.id,
			),
		).toEqual(['desk'])
		expect(
			collectLedgerBrief(buildLedgerInput({ messages }), 'ask-2', requests, new Set()).map(
				(message) => message.id,
			),
		).toEqual(['desk'])
		// Once the correction amends the rule, the rule leaves the brief, and the correction, stored
		// after the first request, never joins it.
		const amended = buildLedgerInput({
			messages,
			classification: { amendments: { desk: ['fix'] } },
		})
		expect(collectLedgerBrief(amended, 'ask-2', requests, new Set())).toEqual([])
	})
})

describe('collectLedgerSubjects', () => {
	it("reads a statement's subject as its known ids' groups, linked through each carrier, and a request's as its own or, naming none, the newest answered request's", () => {
		const messages = [
			buildLedgerMessage('opening', 'user', 'Begin.'),
			buildLedgerMessage('register', 'user', 'Register: BC-7301, BC-7302.'),
			buildLedgerMessage('link', 'user', 'BC-7301 opened claim CS-7305.'),
			buildLedgerMessage('claim', 'user', 'CS-7305 needs the adjuster report.'),
			buildLedgerMessage('ask-1', 'user', 'Check BC-7301.'),
			buildLedgerMessage('reply-1', 'assistant', 'Open.'),
			buildLedgerMessage('ask-2', 'user', 'Check BC-7302.'),
			buildLedgerMessage('ask-3', 'user', 'And the deadline?'),
		]
		const requests = new Set(['opening', 'ask-1', 'ask-2', 'ask-3'])
		// `link` knows both its ids, so it links BC-7301 and CS-7305 into one group under the first in
		// sorted order. The register knows BC-7301 alone, because no other statement carries BC-7302.
		// `ask-2` has no reply, so `ask-3`, which names no id, takes the subject of `ask-1`.
		expect(
			collectLedgerSubjects(buildLedgerInput({ messages }), 'ask-3', requests, new Set()),
		).toEqual(
			new Map([
				['register', new Set(['BC-7301'])],
				['link', new Set(['BC-7301'])],
				['claim', new Set(['BC-7301'])],
				['opening', new Set()],
				['ask-1', new Set(['BC-7301'])],
				['ask-2', new Set(['BC-7302'])],
				['ask-3', new Set(['BC-7301'])],
			]),
		)
	})

	it('links nothing through a brief member, and links through it when an amendment takes it out of the brief', () => {
		const messages = [
			buildLedgerMessage('note', 'user', 'Opening note: BC-7301 and BC-7312 need a callback.'),
			buildLedgerMessage('ask-1', 'user', 'What is open?'),
			buildLedgerMessage('reply-1', 'assistant', 'Two callbacks.'),
			buildLedgerMessage('one', 'user', 'BC-7301 called back.'),
			buildLedgerMessage('two', 'user', 'BC-7312 sent the form.'),
			buildLedgerMessage('fix', 'user', 'Correction: BC-7301 alone needs a callback.'),
			buildLedgerMessage('ask-2', 'user', 'Anything else?'),
		]
		const requests = new Set(['ask-1', 'ask-2'])
		const briefed = collectLedgerSubjects(
			buildLedgerInput({ messages }),
			'ask-2',
			requests,
			new Set(),
		)
		expect([briefed.get('one'), briefed.get('two')]).toEqual([
			new Set(['BC-7301']),
			new Set(['BC-7312']),
		])
		const amended = collectLedgerSubjects(
			buildLedgerInput({ messages, classification: { amendments: { note: ['fix'] } } }),
			'ask-2',
			requests,
			new Set(),
		)
		expect([amended.get('one'), amended.get('two'), amended.get('ask-2')]).toEqual([
			new Set(['BC-7301']),
			new Set(['BC-7301']),
			new Set(),
		])
	})

	it.each([
		['a quiet statement', { quiet: ['both'] }, false],
		['a loud statement', {}, true],
	])('links the cases %s names: %s', (_case, classification, linked) => {
		const messages = [
			buildLedgerMessage('ask-1', 'user', 'What is open?'),
			buildLedgerMessage('reply-1', 'assistant', 'Two callbacks.'),
			buildLedgerMessage('one', 'user', 'BC-7301 called back.'),
			buildLedgerMessage('one-again', 'user', 'BC-7301 asked about the roof.'),
			buildLedgerMessage('two', 'user', 'BC-7312 sent the form.'),
			buildLedgerMessage('two-again', 'user', 'BC-7312 mailed a photo.'),
			buildLedgerMessage('both', 'user', 'BC-7301 and BC-7312 share one adjuster.'),
			buildLedgerMessage('ask-2', 'user', 'Anything else?'),
		]
		const subjects = collectLedgerSubjects(
			buildLedgerInput({ messages, classification }),
			'ask-2',
			new Set(['ask-1', 'ask-2']),
			new Set(),
		)
		expect(subjects.get('two')).toEqual(new Set([linked ? 'BC-7301' : 'BC-7312']))
	})

	it('links nothing through recurrence members that the registry gives two cases, and links through one such statement alone', () => {
		const findings = ['BC-7301', 'BC-7312'].map((id) =>
			buildLedgerFinding(`lookup-${id}`, 'lookup', { id }, `Case ${id}.`, {
				ids: [id],
				owners: [],
			}),
		)
		const recurring = [
			buildLedgerMessage('pair-1', 'user', 'Duty pair BC-7301 and BC-7312 on 2031-03-11.'),
			buildLedgerMessage('pair-2', 'user', 'Duty pair BC-7301 and BC-7312 on 2031-03-12.'),
		]
		const around = [
			buildLedgerMessage('ask-1', 'user', 'What is open?'),
			buildLedgerMessage('reply-1', 'assistant', 'Two callbacks.'),
			buildLedgerMessage('two', 'user', 'BC-7312 sent the form.'),
		]
		const request = buildLedgerMessage('ask-2', 'user', 'Anything else?')
		const requests = new Set(['ask-1', 'ask-2'])
		const members = collectLedgerSubjects(
			buildLedgerInput({ messages: [...around, ...recurring, request], findings }),
			'ask-2',
			requests,
			new Set(),
		)
		// The registry keeps both cases known in each member, but a member carries for its recurrence
		// alone, so neither links them.
		expect([members.get('pair-1'), members.get('two')]).toEqual([
			new Set(['BC-7301', 'BC-7312']),
			new Set(['BC-7312']),
		])
		const lone = collectLedgerSubjects(
			buildLedgerInput({ messages: [...around, ...recurring.slice(0, 1), request], findings }),
			'ask-2',
			requests,
			new Set(),
		)
		expect(lone.get('two')).toEqual(new Set(['BC-7301']))
	})
})

describe('matchesLedgerSubject', () => {
	it.each([
		[[], [], true],
		[['BC-7301'], [], true],
		[[], ['BC-7301'], true],
		[['BC-7301', 'BC-7312'], ['BC-7312'], true],
		[['BC-7301'], ['BC-7302'], false],
	])('reads %j and %j as one subject: %s', (own, other, expected) => {
		expect(matchesLedgerSubject(new Set(own), new Set(other))).toBe(expected)
	})
})

describe('collectLedgerKeys', () => {
	it('orders previous, rules, the ids of the statements left behind, the named, looked-up, and recurring ids, then the filed topics', () => {
		const { input, requests, notes } = buildLedgerKeyScenario(true)
		expect(
			collectLedgerKeys(
				input,
				buildRecords(input),
				LEDGER_KEY_TOPICS,
				'request',
				requests,
				notes,
				new Set(['request']),
			),
		).toEqual([
			// The earlier request's statements hold the rule, so its row carries that category.
			{ name: 'previous', description: 'your last answered request and your reply to it; rule' },
			{ name: 'rules', description: 'the standing rules and corrections stated earlier' },
			{ name: 'BW-5512', description: '3 earlier messages' },
			{ name: 'BW-20931', description: 'Brightwater Studio; 1 earlier message' },
			{ name: 'TK-1', description: '1 earlier message' },
			{ name: 'OR-7', description: '3 earlier messages' },
			{ name: 'refunds', description: 'Refund amounts and approvals' },
		])
	})

	it('counts only the earlier messages, keeps the rank the whole population gave, and lists no topic only a sent statement files', () => {
		const { input, requests, notes } = buildLedgerKeyScenario(true)
		expect(
			collectLedgerKeys(
				input,
				buildRecords(input),
				LEDGER_KEY_TOPICS,
				'request',
				requests,
				notes,
				new Set(['quiet', 'refund', 'request']),
			),
		).toEqual([
			// The earlier request's statements hold the rule, so its row carries that category.
			{ name: 'previous', description: 'your last answered request and your reply to it; rule' },
			{ name: 'rules', description: 'the standing rules and corrections stated earlier' },
			{ name: 'TK-1', description: '1 earlier message' },
			{ name: 'BW-5512', description: '2 earlier messages' },
			{ name: 'BW-20931', description: 'Brightwater Studio; 1 earlier message' },
			{ name: 'OR-7', description: '3 earlier messages' },
		])
	})

	it('offers no exchange row while no earlier request has a reply, and ranks a recurring tie newest first', () => {
		const { input, requests, notes } = buildLedgerKeyScenario(false)
		expect(
			collectLedgerKeys(
				input,
				buildRecords(input),
				LEDGER_KEY_TOPICS,
				'request',
				requests,
				notes,
				new Set(['request']),
			),
		).toEqual([
			{ name: 'rules', description: 'the standing rules and corrections stated earlier' },
			{ name: 'BW-5512', description: '2 earlier messages' },
			{ name: 'BW-20931', description: 'Brightwater Studio; 1 earlier message' },
			{ name: 'TK-1', description: '1 earlier message' },
			{ name: 'OR-7', description: '2 earlier messages' },
			{ name: 'refunds', description: 'Refund amounts and approvals' },
		])
	})

	it('counts every message as earlier for a request the messages do not hold', () => {
		const { input, requests, notes } = buildLedgerKeyScenario(true)
		expect(
			collectLedgerKeys(
				input,
				buildRecords(input),
				LEDGER_KEY_TOPICS,
				'absent',
				requests,
				notes,
				new Set(),
			),
		).toEqual([
			// The last request has no reply, so `previous` reads the last exchange that has one.
			// The earlier request's statements hold the rule, so its row carries that category.
			{ name: 'previous', description: 'your last answered request and your reply to it; rule' },
			{ name: 'rules', description: 'the standing rules and corrections stated earlier' },
			{ name: 'BW-20931', description: 'Brightwater Studio; 1 earlier message' },
			{ name: 'BW-5512', description: '3 earlier messages' },
			{ name: 'OR-7', description: '3 earlier messages' },
			{ name: 'TK-1', description: '2 earlier messages' },
			{ name: 'refunds', description: 'Refund amounts and approvals' },
		])
	})

	it('lists no key while nothing is left behind', () => {
		const { input, requests, notes } = buildLedgerKeyScenario(true)
		const before = input.messages.map((message) => message.id)
		expect(
			collectLedgerKeys(
				input,
				buildRecords(input),
				LEDGER_KEY_TOPICS,
				'first',
				requests,
				notes,
				new Set(before.slice(0, before.indexOf('first') + 1)),
			),
		).toEqual([])
	})
	it('caps the id keys at the index limit, a recurring tie going to the newest', () => {
		const orders = Array.from({ length: 25 }, (_unused, at) => `XA-${at}`)
		const statements = [...orders, ...orders].map((id, at) =>
			buildLedgerMessage(`order-${at}`, 'user', `Order ${id} shipped.`),
		)
		const input = buildLedgerInput({
			exclusions: ['first', 'request'],
			messages: [
				...statements,
				buildLedgerMessage('first', 'user', 'Which orders shipped?'),
				buildLedgerMessage('reply', 'assistant', 'All of them.'),
				buildLedgerMessage('request', 'user', 'Thanks, which are late?'),
			],
		})
		const keys = collectLedgerKeys(
			input,
			buildRecords(input),
			[],
			'request',
			new Set(['first', 'request']),
			new Set(),
			new Set(['request']),
		)
		expect(LEDGER_KEY_LIMIT).toBe(20)
		expect(keys.map((key) => key.name)).toEqual(['previous', ...orders.toReversed().slice(0, 20)])
		expect(new Set(keys.slice(1).map((key) => key.description))).toEqual(
			new Set(['2 earlier messages']),
		)
	})

	it('lists at most the exchange limit of unlabeled exchange rows, oldest first, skips an unreplied request, and leaves the id cap whole', () => {
		const orders = Array.from({ length: 25 }, (_unused, at) => `XA-${at}`)
		const statements = [...orders, ...orders].map((id, at) =>
			buildLedgerMessage(`order-${at}`, 'user', `Order ${id} shipped.`),
		)
		const exchanges = Array.from({ length: 10 }, (_unused, at) => [
			buildLedgerMessage(`ask-${at}`, 'user', `Question ${at} about the desk?`),
			buildLedgerMessage(`answer-${at}`, 'assistant', `Answer ${at}.`),
		]).flat()
		const asks = Array.from({ length: 10 }, (_unused, at) => `ask-${at}`)
		const input = buildLedgerInput({
			exclusions: [...asks, 'late', 'request'],
			messages: [
				...statements,
				...exchanges,
				buildLedgerMessage('late', 'user', 'A request with no reply?'),
				buildLedgerMessage('request', 'user', 'Which are late?'),
			],
		})
		const keys = collectLedgerKeys(
			input,
			buildRecords(input),
			[],
			'request',
			new Set([...asks, 'late', 'request']),
			new Set(),
			new Set(['request']),
		)
		expect(LEDGER_EXCHANGE_LIMIT).toBe(8)
		expect(keys.map((key) => key.name)).toEqual([
			'previous-8',
			'previous-7',
			'previous-6',
			'previous-5',
			'previous-4',
			'previous-3',
			'previous-2',
			'previous',
			...orders.toReversed().slice(0, LEDGER_KEY_LIMIT),
		])
		expect(keys.slice(0, 8).map((key) => key.description)).toEqual([
			...[8, 7, 6, 5, 4, 3, 2].map((depth) => `your request and reply ${depth} exchanges ago`),
			'your last answered request and your reply to it',
		])
		// No row names request text: the rows are unlabeled.
		expect(keys.filter((key) => key.description.includes('Question'))).toEqual([])
	})

	it('gives an exchange the opening shows no row and keeps the depths of the rows past it', () => {
		const exchanges = Array.from({ length: 12 }, (_unused, at) => [
			buildLedgerMessage(`ask-${at}`, 'user', `Question ${at} about the desk?`),
			buildLedgerMessage(`answer-${at}`, 'assistant', `Answer ${at}.`),
		]).flat()
		const asks = Array.from({ length: 12 }, (_unused, at) => `ask-${at}`)
		const input = buildLedgerInput({
			exclusions: [...asks, 'request'],
			messages: [...exchanges, buildLedgerMessage('request', 'user', 'Which are late?')],
		})
		// The opening shows the newest two exchanges, so the rows start at previous-3.
		const keys = collectLedgerKeys(
			input,
			buildRecords(input),
			[],
			'request',
			new Set([...asks, 'request']),
			new Set(),
			new Set(['request', 'ask-11', 'answer-11', 'ask-10', 'answer-10']),
		)
		expect(keys.map((key) => key.name)).toEqual([
			'previous-10',
			'previous-9',
			'previous-8',
			'previous-7',
			'previous-6',
			'previous-5',
			'previous-4',
			'previous-3',
		])
		expect(keys.at(-1)?.description).toBe('your request and reply 3 exchanges ago')
		// An exchange whose reply the opening doesn't show keeps its row, its request shown or not.
		expect(
			collectLedgerKeys(
				input,
				buildRecords(input),
				[],
				'request',
				new Set([...asks, 'request']),
				new Set(),
				new Set(['request', 'ask-11', 'answer-10']),
			)
				.map((key) => key.name)
				.slice(-2),
		).toEqual(['previous-2', 'previous'])
	})

	it('tags an exchange row with its registry ids and owner names once, its topics, and the category of its statements alone', () => {
		const input = buildLedgerInput({
			owners: { 'BC-4101': ['Mara Ellison'] },
			messages: [
				buildLedgerMessage('fixed', 'user', 'Correction: BC-7301 is due $150.'),
				buildLedgerMessage('first', 'user', 'Check BC-7301 for Mara Ellison.'),
				buildLedgerMessage('call', 'assistant', ''),
				buildLedgerMessage('read', 'tool', 'Order BC-7301 for customer BC-4101: Mara Ellison.'),
				buildLedgerMessage('reply', 'assistant', 'It is due $150.'),
				buildLedgerMessage('second', 'user', 'Note the rule.'),
				buildLedgerMessage('noted', 'assistant', 'Noted.'),
				buildLedgerMessage('request', 'user', 'Anything else?'),
			],
			findings: [
				buildLedgerFinding(
					'read',
					'lookup_order',
					{ id: 'BC-7301' },
					'Order BC-7301 for customer BC-4101: Mara Ellison.',
					{ ids: ['BC-7301'], owners: [{ id: 'BC-4101', names: ['Mara Ellison'] }] },
				),
			],
			entities: { first: ['BC-7301', 'BC-4101'] },
			classification: {
				categories: { fixed: 'correction', second: 'rule' },
				topics: { first: ['refunds'] },
			},
		})
		const keys = collectLedgerKeys(
			input,
			buildRecords(input),
			LEDGER_KEY_TOPICS,
			'request',
			new Set(['first', 'second', 'request']),
			new Set(),
			new Set(['request']),
		)
		// The request filed as a rule tags nothing: only a statement's category does.
		expect(keys.slice(0, 2)).toEqual([
			{
				name: 'previous-2',
				description:
					'your request and reply 2 exchanges ago; BC-7301 (Mara Ellison), BC-4101; refunds; correction',
			},
			{ name: 'previous', description: 'your last answered request and your reply to it' },
		])
		expect(estimateTokens(`- previous-2: ${requireValue(keys[0]).description}`)).toBe(27)
	})

	it('leaves an id that reads as an exchange key out of the id rows', () => {
		const input = buildLedgerInput({
			exclusions: ['first', 'request'],
			messages: [
				buildLedgerMessage('ticket', 'user', 'Ticket previous-2 is open.'),
				buildLedgerMessage('again', 'user', 'Ticket previous-2 is still open.'),
				buildLedgerMessage('order', 'user', 'Order XB-1 shipped.'),
				buildLedgerMessage('late', 'user', 'Order XB-1 arrived late.'),
				buildLedgerMessage('first', 'user', 'Which tickets are open?'),
				buildLedgerMessage('reply', 'assistant', 'Ticket previous-2 is open.'),
				buildLedgerMessage('request', 'user', 'And the orders?'),
			],
		})
		expect(
			collectLedgerKeys(
				input,
				buildRecords(input),
				[],
				'request',
				new Set(['first', 'request']),
				new Set(),
				new Set(['request']),
			).map((key) => key.name),
		).toEqual(['previous', 'XB-1'])
	})
})

describe('collectLedgerMatches', () => {
	it('adds the last answered request ids when no statement left out carries one the request names, and ranks a match on them below one on its own', () => {
		const messages = [
			buildLedgerMessage('ask-0', 'user', 'Check OR-9 status.'),
			buildLedgerMessage('ans-0', 'assistant', 'Checked.'),
			buildLedgerMessage('stated', 'user', 'OR-5 ships Friday.'),
			buildLedgerMessage('ask-1', 'user', 'What about OR-5?'),
			buildLedgerMessage('ans-1', 'assistant', 'It ships Friday.'),
			buildLedgerMessage('request', 'user', 'And OR-9?'),
		]
		const requests = new Set(['ask-0', 'ask-1', 'request'])
		const shown = new Set(['ask-1', 'ans-1', 'request'])
		const matches = collectLedgerMatches(
			buildLedgerInput({ messages }),
			'request',
			requests,
			new Set(),
			shown,
			new Map(),
			new Set(),
		)
		// The request turn on the request's own id ranks above the statement on the inherited one.
		expect(matches.map((match) => [match.source, match.basis])).toEqual([
			['ask-0', 'entity'],
			['stated', 'inherited'],
		])
		// A statement left out that carries the request's own id stops the inheritance.
		const named = collectLedgerMatches(
			buildLedgerInput({
				messages: [buildLedgerMessage('late', 'user', 'OR-9 is late.'), ...messages],
			}),
			'request',
			requests,
			new Set(),
			shown,
			new Map(),
			new Set(),
		)
		expect(named.map((match) => [match.source, match.basis])).toEqual([
			['late', 'entity'],
			['ask-0', 'entity'],
		])
	})

	it('ranks a newer statement ahead of an older one with the higher word score', () => {
		const fillers = [1, 2, 3, 4].flatMap((at) => [
			buildLedgerMessage(`ask-${at}`, 'user', 'Okay.'),
			buildLedgerMessage(`ans-${at}`, 'assistant', 'Fine.'),
		])
		const messages = [
			buildLedgerMessage('old', 'user', 'Lamp crate rests in bay 4 of the blue hall.'),
			...fillers.slice(0, 2),
			buildLedgerMessage('new', 'user', 'Lamp crate moved.'),
			...fillers.slice(2),
			buildLedgerMessage('request', 'user', 'Where is the lamp crate in the blue hall?'),
		]
		const asks = [1, 2, 3, 4].map((at) => `ask-${at}`)
		const matches = collectLedgerMatches(
			buildLedgerInput({ messages }),
			'request',
			new Set([...asks, 'request']),
			new Set(),
			new Set([...fillers.map((message) => message.id), 'request']),
			new Map(),
			new Set(),
		)
		expect(matches.map((match) => [match.source, match.basis])).toEqual([
			['new', 'word'],
			['old', 'word'],
		])
		expect(requireValue(matches[1]).score).toBeGreaterThan(requireValue(matches[0]).score)
	})

	it('scores a lone candidate against the words of every user message, the shown ones too', () => {
		const shown = ['Thanks.', 'Okay.', 'Fine.', 'Sure.'].flatMap((content, at) => [
			buildLedgerMessage(`ask-${at}`, 'user', content),
			buildLedgerMessage(`ans-${at}`, 'assistant', 'Noted.'),
		])
		const matches = collectLedgerMatches(
			buildLedgerInput({
				messages: [
					buildLedgerMessage('code', 'user', 'The vault code is 7391.'),
					...shown,
					buildLedgerMessage('request', 'user', 'What is the vault code?'),
				],
			}),
			'request',
			new Set([0, 1, 2, 3].map((at) => `ask-${at}`).concat('request')),
			new Set(),
			new Set([...shown.map((message) => message.id), 'request']),
			new Map(),
			new Set(),
		)
		expect(matches.map((match) => [match.source, match.basis])).toEqual([['code', 'word']])
		expect(requireValue(matches[0]).score).toBeGreaterThan(0)
	})

	it('fills the places id matches leave with word matches, ranked after them', () => {
		const shown = ['Thanks.', 'Okay.', 'Fine.', 'Sure.'].flatMap((content, at) => [
			buildLedgerMessage(`ask-${at}`, 'user', content),
			buildLedgerMessage(`ans-${at}`, 'assistant', 'Noted.'),
		])
		const matches = collectLedgerMatches(
			buildLedgerInput({
				messages: [
					buildLedgerMessage('order', 'user', 'OR-7 ships Monday.'),
					...shown,
					buildLedgerMessage('lamp', 'user', 'The blue lamp is cracked.'),
					buildLedgerMessage('request', 'user', 'Is the OR-7 blue lamp ready?'),
				],
			}),
			'request',
			new Set([0, 1, 2, 3].map((at) => `ask-${at}`).concat('request')),
			new Set(),
			new Set([...shown.map((message) => message.id), 'request']),
			new Map(),
			new Set(),
		)
		// The newer word match stays behind the older id match.
		expect(matches.map((match) => [match.source, match.basis])).toEqual([
			['order', 'entity'],
			['lamp', 'word'],
		])
	})

	it('drops an unfiled candidate whose counted words a newer shown message carries, and a superseded one whose successor is shown', () => {
		const fillers = [1, 2, 3, 4, 5].flatMap((at) => [
			buildLedgerMessage(`ask-${at}`, 'user', `Okay ${at}.`),
			buildLedgerMessage(`ans-${at}`, 'assistant', 'Fine.'),
		])
		const messages = [
			buildLedgerMessage('budget', 'user', 'My budget is 500 pounds.'),
			buildLedgerMessage('ruled', 'user', 'My budget needs pounds.'),
			buildLedgerMessage('stale', 'user', 'The hall is booked.'),
			buildLedgerMessage('fresh', 'user', 'The hall is free.'),
			...fillers,
			buildLedgerMessage('newer', 'user', 'Actually my budget is 700 pounds.'),
			buildLedgerMessage('request', 'user', 'What is my budget in pounds for the hall?'),
		]
		const asks = [1, 2, 3, 4, 5].map((at) => `ask-${at}`)
		const shown = new Set([...fillers.map((message) => message.id), 'newer', 'request'])
		const input = buildLedgerInput({
			messages,
			classification: { categories: { ruled: 'rule' }, supersessions: { stale: ['fresh'] } },
		})
		const matches = collectLedgerMatches(
			input,
			'request',
			new Set([...asks, 'request']),
			new Set(),
			shown,
			new Map(),
			new Set(),
		)
		// The unfiled budget is stale beside the newer shown one; the filed rule stays; the superseded
		// hall statement stands for its successor, which the opening doesn't show.
		expect(matches.map((match) => match.source).toSorted()).toEqual(['fresh', 'ruled'])
		// With the successor shown, the superseded statement drops rather than adding it again.
		expect(
			collectLedgerMatches(
				input,
				'request',
				new Set([...asks, 'request']),
				new Set(),
				new Set([...shown, 'fresh']),
				new Map(),
				new Set(),
			).map((match) => match.source),
		).toEqual(['ruled'])
	})

	it('leaves out of a match the member a chain of supersessions links to a shown message, and keeps one whose successor is behind', () => {
		const messages = [
			buildLedgerMessage('order', 'user', 'Order OR-5 ships Friday.'),
			buildLedgerMessage('moved', 'user', 'Correction: OR-5 ships Saturday.'),
			buildLedgerMessage('ask', 'user', 'Check the van.'),
			buildLedgerMessage('reply', 'assistant', 'The van is ready.'),
			buildLedgerMessage('fixed', 'user', 'Correction: OR-5 ships Monday.'),
			buildLedgerMessage('request', 'user', 'Where is OR-5?'),
		]
		// `order` is amended by both corrections, and `fixed` supersedes `moved`.
		const input = buildLedgerInput({
			messages,
			classification: {
				amendments: { order: ['moved', 'fixed'], moved: ['fixed'] },
				supersessions: { moved: ['fixed'] },
			},
		})
		const requests = new Set(['ask', 'request'])
		// The opening shows `fixed`, so `order` brings no `moved` beside it.
		expect(
			collectLedgerMatches(
				input,
				'request',
				requests,
				new Set(),
				new Set(['ask', 'reply', 'fixed', 'request']),
				new Map(),
				new Set(),
			).map((match) => [match.source, match.members]),
		).toEqual([['order', ['order']]])
		// With `fixed` behind too, `moved` stands for it, the newer turn ranks first, and `order` brings
		// `moved`, whose successor the opening doesn't show.
		expect(
			collectLedgerMatches(
				input,
				'request',
				requests,
				new Set(),
				new Set(['ask', 'reply', 'request']),
				new Map(),
				new Set(),
			).map((match) => [match.source, match.members]),
		).toEqual([
			['fixed', ['fixed']],
			['order', ['order', 'moved']],
		])
	})

	it('ranks a recent request with no basis, a stale one, or a quiet one last as recent, keeps a stronger basis, and drops a request recent leaves out', () => {
		const fillers = [1, 2, 3, 4].flatMap((at) => [
			buildLedgerMessage(`ask-${at}`, 'user', `Okay ${at}.`),
			buildLedgerMessage(`ans-${at}`, 'assistant', 'Fine.'),
		])
		const messages = [
			buildLedgerMessage('lamp', 'user', 'A cracked blue lamp needs a ready crate.'),
			buildLedgerMessage('bare', 'user', 'Note the van.'),
			buildLedgerMessage('bare-reply', 'assistant', 'Noted.'),
			buildLedgerMessage('order', 'user', 'Check OR-7.'),
			buildLedgerMessage('order-reply', 'assistant', 'Checked.'),
			buildLedgerMessage('stale', 'user', 'Is the blue lamp boxed?'),
			buildLedgerMessage('stale-reply', 'assistant', 'Boxed.'),
			buildLedgerMessage('hush', 'user', 'Thanks a lot.'),
			buildLedgerMessage('hush-reply', 'assistant', 'Welcome.'),
			buildLedgerMessage('left', 'user', 'Note the cart.'),
			buildLedgerMessage('left-reply', 'assistant', 'Noted.'),
			...fillers,
			buildLedgerMessage('newer', 'user', 'The blue lamp is in bay 2.'),
			buildLedgerMessage('request', 'user', 'Is the OR-7 blue lamp ready?'),
		]
		const asks = [
			'bare',
			'order',
			'stale',
			'hush',
			'left',
			...[1, 2, 3, 4].map((at) => `ask-${at}`),
		]
		const input = buildLedgerInput({
			messages,
			classification: { quiet: ['hush'] },
		})
		const matches = collectLedgerMatches(
			input,
			'request',
			new Set([...asks, 'request']),
			new Set(),
			new Set([...fillers.map((message) => message.id), 'newer', 'request']),
			new Map(),
			new Set(['bare', 'order', 'stale', 'hush']),
		)
		// `order` keeps its id basis; `lamp` matches on words; `stale` shares only words the newer shown
		// statement carries, `bare` matches nothing, and `hush` is quiet, so all three are recent copies,
		// newest first, after every other match; `left` is no recent request and matches nothing.
		expect(matches.map((match) => [match.source, match.basis])).toEqual([
			['order', 'entity'],
			['lamp', 'word'],
			['hush', 'recent'],
			['stale', 'recent'],
			['bare', 'recent'],
		])
	})

	it('drops a word or topic match on another subject, keeps an entity match whatever its subject, and passes a recent request on another subject', () => {
		const messages = [
			buildLedgerMessage('roof-1', 'user', 'BC-7301 sent the roof photos.'),
			buildLedgerMessage('call-1', 'user', 'BC-7301 called.'),
			buildLedgerMessage('roof-2', 'user', 'BC-7302 mailed the roof photos at noon.'),
			buildLedgerMessage('call-2', 'user', 'BC-7302 phoned twice.'),
			buildLedgerMessage('claim-1', 'user', 'BC-7301 filed a claim.'),
			buildLedgerMessage('invoice', 'user', 'BC-7301 owes invoice IN-9.'),
			buildLedgerMessage('ask-1', 'user', 'Check BC-7301.'),
			buildLedgerMessage('reply-1', 'assistant', 'Open.'),
			buildLedgerMessage(
				'request',
				'user',
				'Which roof photos and invoice IN-9 came in for BC-7302?',
			),
		]
		const requests = new Set(['ask-1', 'request'])
		const input = buildLedgerInput({
			messages,
			classification: { topics: { 'claim-1': ['claims'], request: ['claims'] } },
		})
		const [scoped, unscoped] = [
			collectLedgerSubjects(input, 'request', requests, new Set()),
			new Map<string, ReadonlySet<string>>(),
		].map((subjects) =>
			collectLedgerMatches(
				input,
				'request',
				requests,
				new Set(),
				new Set(['request']),
				subjects,
				new Set(['ask-1']),
			)
				.map((match) => `${match.source}:${match.basis}`)
				.toSorted(),
		)
		// `roof-1` shares words and `claim-1` a topic with the request, both on BC-7301; `invoice` is on
		// BC-7301 too, but names IN-9, which the request names; `ask-1` is a cut request on BC-7301.
		expect(scoped).toEqual(['ask-1:recent', 'call-2:entity', 'invoice:entity', 'roof-2:entity'])
		// With no subjects, nothing scopes the weak matches.
		expect(unscoped).toEqual([
			'ask-1:recent',
			'call-2:entity',
			'claim-1:topic',
			'invoice:entity',
			'roof-1:word',
			'roof-2:entity',
		])
	})

	it('drops an older day marker matched on shared words, with the subjects or with none, and keeps the newest one on any basis', () => {
		const fillers = [1, 2, 3, 4].flatMap((at) => [
			buildLedgerMessage(`ask-${at}`, 'user', `Okay ${at}.`),
			buildLedgerMessage(`ans-${at}`, 'assistant', 'Fine.'),
		])
		const messages = [
			buildLedgerMessage('marker-1', 'user', 'Current workday: 2031-03-11.'),
			...fillers,
			buildLedgerMessage('marker-2', 'user', 'Current workday: 2031-03-12.'),
			buildLedgerMessage('request', 'user', 'Which workday is it?'),
		]
		const requests = new Set([...[1, 2, 3, 4].map((at) => `ask-${at}`), 'request'])
		const input = buildLedgerInput({ messages })
		const excluded = new Set([...fillers.map((message) => message.id), 'request'])
		// The id-free host passes no subjects; the date each marker carries is set aside, so its
		// subject is empty either way.
		expect(
			[
				collectLedgerSubjects(input, 'request', requests, new Set()),
				new Map<string, ReadonlySet<string>>(),
			].map((subjects) =>
				collectLedgerMatches(
					input,
					'request',
					requests,
					new Set(),
					excluded,
					subjects,
					new Set(),
				).map((match) => [match.source, match.basis]),
			),
		).toEqual([[['marker-2', 'word']], [['marker-2', 'word']]])
	})

	it('matches a templated correction the request names by id on its entity basis, and not its sibling', () => {
		const messages = [
			buildLedgerMessage('fix-11', 'user', 'Correction: order AX-11 ships Monday.'),
			buildLedgerMessage('fix-12', 'user', 'Correction: order BZ-12 ships Monday.'),
			buildLedgerMessage('request', 'user', 'What about AX-11?'),
		]
		const requests = new Set(['request'])
		const input = buildLedgerInput({ messages })
		expect(
			collectLedgerMatches(
				input,
				'request',
				requests,
				new Set(),
				new Set(['request']),
				collectLedgerSubjects(input, 'request', requests, new Set()),
				new Set(),
			).map((match) => [match.source, match.basis]),
		).toEqual([['fix-11', 'entity']])
	})

	it('brings an older templated correction as the amender of a match although its own word match drops', () => {
		const fillers = [1, 2, 3, 4, 5].flatMap((at) => [
			buildLedgerMessage(`ask-${at}`, 'user', `Okay ${at}.`),
			buildLedgerMessage(`ans-${at}`, 'assistant', 'Fine.'),
		])
		const messages = [
			buildLedgerMessage('crate', 'user', 'Crate AX-11 rides the Friday barge.'),
			buildLedgerMessage('fix-11', 'user', 'Correction: freight AX-11 rides Monday.'),
			...fillers,
			buildLedgerMessage('fix-12', 'user', 'Correction: freight BZ-12 rides Monday.'),
			buildLedgerMessage('request', 'user', 'Which barge rides Monday?'),
		]
		const requests = new Set([...[1, 2, 3, 4, 5].map((at) => `ask-${at}`), 'request'])
		const input = buildLedgerInput({
			messages,
			classification: { amendments: { crate: ['fix-11'] } },
		})
		const matches = collectLedgerMatches(
			input,
			'request',
			requests,
			new Set(),
			new Set([...fillers.map((message) => message.id), 'request']),
			collectLedgerSubjects(input, 'request', requests, new Set()),
			new Set(),
		)
		expect(
			matches
				.map((match) => `${match.source}:${match.basis}:${match.members.join('+')}`)
				.toSorted(),
		).toEqual(['crate:word:crate+fix-11', 'fix-12:word:fix-12'])
	})

	it.each([
		['BC-7301', ['lead-1:inherited']],
		['BC-7302', ['lead-2:inherited']],
	])(
		'scopes an older recurrence member the registry gives a case by the ordinary subject test: after a check of %s it keeps %j',
		(checked, expected) => {
			const fillers = [1, 2, 3, 4].flatMap((at) => [
				buildLedgerMessage(`ask-${at}`, 'user', `Okay ${at}.`),
				buildLedgerMessage(`ans-${at}`, 'assistant', 'Fine.'),
			])
			const messages = [
				buildLedgerMessage('lead-1', 'user', 'Duty lead BC-7301 on 2031-03-11.'),
				buildLedgerMessage('lead-2', 'user', 'Duty lead BC-7302 on 2031-03-12.'),
				...fillers,
				buildLedgerMessage('check', 'user', `Check ${checked}.`),
				buildLedgerMessage('checked', 'assistant', 'Open.'),
				buildLedgerMessage('request', 'user', 'Who is the duty lead?'),
			]
			const requests = new Set([...[1, 2, 3, 4].map((at) => `ask-${at}`), 'check', 'request'])
			const input = buildLedgerInput({
				messages,
				findings: ['BC-7301', 'BC-7302'].map((id) =>
					buildLedgerFinding(`lookup-${id}`, 'lookup', { id }, `Case ${id}.`, {
						ids: [id],
						owners: [],
					}),
				),
			})
			// The request names no id, so it inherits the checked case and its subject; the member on that
			// case matches on the inherited id, and the member on the other case shares only words, on
			// another subject.
			expect(
				collectLedgerMatches(
					input,
					'request',
					requests,
					new Set(),
					new Set([...fillers.map((message) => message.id), 'check', 'checked', 'request']),
					collectLedgerSubjects(input, 'request', requests, new Set()),
					new Set(),
				).map((match) => `${match.source}:${match.basis}`),
			).toEqual(expected)
		},
	)
})

describe('filterRecallGroups', () => {
	it('drops a group whose every call is recall, keeps a lookup group and a group that mixes both whole, and keeps the order', () => {
		const recalled = buildLedgerMessage('recalled', 'assistant', '')
		const looked = buildLedgerMessage('looked', 'assistant', '')
		const mixed = buildLedgerMessage('mixed', 'assistant', '')
		const groups: ReadonlyArray<readonly Message[]> = [
			[
				{ ...looked, calls: [{ id: 'one', name: 'lookup', arguments: { id: 'OR-7' } }] },
				{ id: 'one-result', role: 'tool', content: 'OR-7 ships Monday.', call: 'one' },
			],
			[
				{
					...recalled,
					calls: [
						{ id: 'two', name: 'recall', arguments: { key: 'previous' } },
						{ id: 'three', name: 'recall', arguments: { key: 'rules' } },
					],
				},
				{ id: 'two-result', role: 'tool', content: 'Earlier request: Check OR-7.', call: 'two' },
				{ id: 'three-result', role: 'tool', content: 'Refunds need a manager.', call: 'three' },
			],
			[
				{
					...mixed,
					calls: [
						{ id: 'four', name: 'recall', arguments: { key: 'OR-8' } },
						{ id: 'five', name: 'lookup', arguments: { id: 'OR-8' } },
					],
				},
				{ id: 'four-result', role: 'tool', content: 'Earlier request: Check OR-8.', call: 'four' },
				{ id: 'five-result', role: 'tool', content: 'OR-8 ships Friday.', call: 'five' },
			],
		]
		expect(filterRecallGroups(groups).map((group) => group.map((message) => message.id))).toEqual([
			['looked', 'one-result'],
			['mixed', 'four-result', 'five-result'],
		])
		expect(filterRecallGroups([])).toEqual([])
	})
})

describe('collectLedgerExchanges', () => {
	it('pairs each request with its final reply, newest first, and skips a request with none', () => {
		const messages = [
			buildLedgerMessage('first', 'user', 'Check OR-7.'),
			buildLedgerMessage('reply', 'assistant', 'OR-7 ships Friday.'),
			buildLedgerMessage('second', 'user', 'And OR-8?'),
			buildLedgerMessage('third', 'user', 'And OR-9?'),
			buildLedgerMessage('last', 'assistant', 'OR-9 ships Monday.'),
		]
		expect(
			collectLedgerExchanges(messages, new Set(['first', 'second', 'third']), new Set()).map(
				(exchange) => [exchange.request.id, exchange.reply.id],
			),
		).toEqual([
			['third', 'last'],
			['first', 'reply'],
		])
		expect(collectLedgerExchanges([], new Set(), new Set())).toEqual([])
	})
})

describe('nameLedgerExchange', () => {
	it('names previous for depth 1 and previous-N past it, each read back to its depth', () => {
		expect([1, 2, 8, 12].map((depth) => nameLedgerExchange(depth))).toEqual([
			'previous',
			'previous-2',
			'previous-8',
			'previous-12',
		])
		for (const depth of [1, 2, 8, 12])
			expect(parseLedgerExchange(nameLedgerExchange(depth))).toBe(depth)
	})
})

describe('parseLedgerExchange', () => {
	it.each([
		['previous', 1],
		[' PREVIOUS ', 1],
		['previous-1', 1],
		['Previous-3', 3],
		['previous:4', 4],
		['previous 12', 12],
		['previous - 5', 5],
	] as const)('reads %j as depth %i', (key, depth) => {
		expect(parseLedgerExchange(key)).toBe(depth)
	})

	it.each([
		'previous-0',
		'previous-02',
		'previous2',
		'previously',
		'rules',
		'BW-5512',
		`previous-${'9'.repeat(20)}`,
	])('reads %j as no exchange key', (key) => {
		expect(parseLedgerExchange(key)).toBeUndefined()
	})
})

describe('renderLedgerKeys', () => {
	it('renders the Earlier heading, how to read it, one line per key, and a closing line with no count', () => {
		expect(
			renderLedgerKeys([
				{ name: 'previous', description: 'your last answered request and your reply to it' },
				{ name: 'BW-20931', description: 'Brightwater\nStudio; 2 earlier messages' },
			]),
		).toBe(
			[
				'## Earlier',
				"These earlier exchanges and items are stored, not shown. If the request depends on one you can't see, call recall with its key, or join several keys with commas. If the messages you see are enough, answer without recall.",
				'- previous: your last answered request and your reply to it',
				'- BW-20931: Brightwater Studio; 2 earlier messages',
				'Other ids, names, and words from a message work too.',
			].join('\n'),
		)
	})

	it('renders nothing for no key', () => {
		expect(renderLedgerKeys([])).toBe('')
	})
})
