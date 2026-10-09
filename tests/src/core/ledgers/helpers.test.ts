import type { GaugeCall, LedgerLookupReading } from '../../../../src/core/ledgers/types.js'
import { estimateMessages } from '../../../../src/core/agents/helpers.js'
import {
	buildLines,
	buildRecords,
	collectLive,
	collectNames,
	collectRegistry,
	collectStale,
	computeThinking,
	resolvePredict,
	rankLedgerCut,
	cutListing,
	extractTokens,
	fitSlope,
	identifyLookup,
	linkOwners,
	matchEntities,
	matchesCutLine,
	placeMember,
	renderLedgerPinned,
	renderLedgerRecord,
	renderStub,
	selectRecords,
	splitSentences,
	splitTopic,
} from '../../../../src/core/ledgers/helpers.js'
import { describe, expect, it } from 'vitest'
import {
	buildLedgerInput,
	buildLedgerMessage,
	buildLedgerReading,
	checkLedgerProjection,
	createLedgerDesk,
	createLedgerRequest,
	LEDGER_DESK_OWNERS,
	LEDGER_DESK_SYSTEM,
	LEDGER_HANDLE,
} from '../../../setupLedger.js'

describe('rankLedgerCut', () => {
	it('ranks name matches before loose sources, off-topic corrections, rules, and on-topic sources', () => {
		expect(rankLedgerCut(3, true, 'rule')).toBe(0)
		expect(rankLedgerCut(1, true, 'fact')).toBe(1)
		expect(rankLedgerCut(2, false, 'correction')).toBe(2)
		expect(rankLedgerCut(2, false, 'rule')).toBe(3)
		expect(rankLedgerCut(1, false, 'rule')).toBe(4)
		expect(rankLedgerCut(1, false, undefined)).toBe(4)
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
// the registry and entity matching, the record projection with the three fixes (R5a, R2b, R8), the
// renderers, and the recall leaves (topic split, cut, stub, slope).

const found = { ids: [], owners: [] }

function buildReading(
	id: string,
	args: Readonly<Record<string, unknown>>,
	text: string,
	empty = false,
): LedgerLookupReading {
	return buildLedgerReading(id, 'lookup_order', args, text, empty ? undefined : found)
}

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

describe('extractTokens', () => {
	it('reads the uppercased ids that hold a digit', () => {
		const tokens = extractTokens('Order bw-5512 and esc-2291, not well-known or MX-ABC.')
		expect([...tokens.ids]).toEqual(['BW-5512', 'ESC-2291'])
	})

	it('reads the numbers outside ids with grouping commas removed', () => {
		const tokens = extractTokens('Refund 1,200.50 for BW-5512 after 3 days, not v2.')
		expect([...tokens.numbers]).toEqual([1200.5, 3])
	})

	it('reads nothing from an empty text', () => {
		const tokens = extractTokens('')
		expect(tokens.ids.size + tokens.numbers.size).toBe(0)
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

describe('linkOwners', () => {
	const owners = new Map(Object.entries(LEDGER_DESK_OWNERS))

	it('links an owner argument to itself and another id to the one owner its text names', () => {
		const links = linkOwners(
			[
				buildReading(
					'tool-1',
					{ id: 'bw-5512' },
					'Order BW-5512 for account BW-20931 (Brightwater Studio).',
				),
				buildReading('tool-2', { account: 'OM-30418' }, 'Account OM-30418: Odile Marlow.'),
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
				buildReading('tool-1', { id: 'BW-5512' }, 'Order BW-5512 has no owner.'),
				buildReading('tool-2', { id: 'BW-5513' }, 'Order BW-5513 for BW-20931 and OM-30418.'),
			],
			owners,
		)
		expect(links.size).toBe(0)
	})

	it('skips an empty reading and lets a later reading overwrite an earlier link', () => {
		const links = linkOwners(
			[
				buildReading('tool-1', { id: 'BW-5512' }, 'Order BW-5512 for BW-20931.'),
				buildReading('tool-2', { id: 'BW-5512' }, 'Order BW-5512 for OM-30418.', true),
				buildReading('tool-3', { id: 'BW-5512' }, 'Order BW-5512 for OM-30418.'),
			],
			owners,
		)
		expect(Object.fromEntries(links)).toEqual({ 'BW-5512': 'OM-30418' })
	})

	it('ignores an argument that is no id', () => {
		const links = linkOwners(
			[buildReading('tool-1', { id: 'five', n: 5 }, 'Order for BW-20931.')],
			owners,
		)
		expect(links.size).toBe(0)
	})
})

describe('collectRegistry', () => {
	it('collects every id and each owner name in the order read', () => {
		const registry = collectRegistry([
			buildLedgerReading('tool-1', 'lookup_customer', { account: 'BW-20931' }, 'text', {
				ids: ['BW-20931', 'BW-5512'],
				owners: [{ id: 'BW-20931', names: ['Brightwater Studio'] }],
			}),
			buildLedgerReading('tool-2', 'lookup_customer', { account: 'BW-20931' }, 'text', {
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

	it('learns nothing from an empty reading', () => {
		const registry = collectRegistry([
			buildLedgerReading('tool-1', 'lookup_order', { id: 'BW-5512' }, 'No record.'),
		])
		expect(registry.ids.size + registry.owners.size).toBe(0)
	})

	it('trims a name and drops one without a letter', () => {
		const registry = collectRegistry([
			buildLedgerReading('tool-1', 'lookup_customer', {}, 'text', {
				ids: [],
				owners: [{ id: 'OM-30418', names: ['  Odile Marlow ', '1234', ' '] }],
			}),
		])
		expect(registry.owners.get('OM-30418')).toEqual(['Odile Marlow'])
	})
})

describe('matchEntities', () => {
	const registry = collectRegistry([
		buildLedgerReading('tool-1', 'lookup_customer', {}, 'text', {
			ids: ['BW-5512'],
			owners: [
				{ id: 'BW-20931', names: ['Brightwater Studio'] },
				{ id: 'OM-30418', names: ['Odile Marlow'] },
				{ id: 'OM-77001', names: ['Odile Marsh'] },
			],
		}),
	])

	it('names a registry id that the text holds as an id token', () => {
		expect([...matchEntities(registry, 'Refund for bw-5512 today', false)]).toEqual(['BW-5512'])
		expect(matchEntities(registry, 'Refund for BW-55123', true).size).toBe(0)
	})

	it('names an owner by its whole name, whatever the case, at word edges', () => {
		expect([...matchEntities(registry, 'brightwater studio called', false)]).toEqual(['BW-20931'])
		expect(matchEntities(registry, 'XBrightwater Studio called', false).size).toBe(0)
		expect(matchEntities(registry, 'Brightwater Studios called', false).size).toBe(0)
	})

	it('names an owner by a capitalized name word that only one name carries, with partial', () => {
		expect([...matchEntities(registry, 'Brightwater called', true)]).toEqual(['BW-20931'])
		expect(matchEntities(registry, 'Brightwater called', false).size).toBe(0)
		expect(matchEntities(registry, 'brightwater called', true).size).toBe(0)
	})

	it('leaves out a name word that two names carry', () => {
		expect(matchEntities(registry, 'Odile called', true).size).toBe(0)
		expect([...matchEntities(registry, 'Marlow called', true)]).toEqual(['OM-30418'])
	})

	it('reads a name that holds pattern characters as text', () => {
		const odd = collectRegistry([
			buildLedgerReading('tool-1', 'lookup_customer', {}, 'text', {
				ids: [],
				owners: [{ id: 'BW-20931', names: ['A+B (Studio)'] }],
			}),
		])
		expect([...matchEntities(odd, 'Call A+B (Studio) now', false)]).toEqual(['BW-20931'])
		expect(matchEntities(odd, 'Call AAB Studio now', false).size).toBe(0)
	})
})

describe('collectLive', () => {
	it('lists the user messages and the current lookup results, leaving out the excluded, quiet, and superseded', () => {
		expect(collectLive(createLedgerDesk())).toEqual([
			'user-01',
			'user-02',
			'user-03',
			'tool-02',
			'user-04',
		])
	})

	it('lets an empty reading replace the earlier result of the same call (R5a)', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('tool-a', 'tool', 'Order BW-5512: total $10.00.'),
				buildLedgerMessage('tool-b', 'tool', 'No record of order BW-5512.'),
				buildLedgerMessage('tool-c', 'tool', 'Order BW-5513: total $12.00.'),
			],
			readings: [
				buildReading('tool-a', { id: 'BW-5512' }, 'Order BW-5512: total $10.00.'),
				buildReading('tool-b', { id: 'bw-5512' }, 'No record of order BW-5512.', true),
				buildReading('tool-c', { id: 'BW-5513' }, 'Order BW-5513: total $12.00.'),
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
			readings: [
				buildReading('tool-a', { id: 'BW-5512' }, 'one'),
				buildReading('tool-b', { id: 'BW-5513' }, 'two'),
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
			readings: [
				buildReading('tool-a', { id: 'BW-5512', opts: { a: 1, b: { c: 2, d: 3 } } }, 'one'),
				buildReading('tool-b', { opts: { b: { d: 3, c: 2 }, a: 1 }, id: 'BW-5512' }, 'two'),
			],
		})
		expect(collectLive(input)).toEqual(['tool-b'])
	})

	it('leaves out a tool message with no reading and an assistant message', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('tool-a', 'tool', 'text'),
				buildLedgerMessage('assistant-a', 'assistant', 'text'),
			],
		})
		expect(collectLive(input)).toEqual([])
	})
})

describe('placeMember', () => {
	const desk = createLedgerDesk()
	const links = linkOwners(desk.readings, desk.owners)

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

	it('joins where the earlier side of an amended pair joins', () => {
		const amending = new Map([['user-04', ['user-03']]])
		expect([...placeMember(desk, links, amending, 'user-04', new Set())]).toEqual([
			'owner:BW-20931',
		])
	})

	it('stops at a cycle of amended pairs and leaves a message with no category loose', () => {
		const cycle = new Map([
			['user-05', ['user-07']],
			['user-07', ['user-05']],
		])
		expect(placeMember(desk, links, cycle, 'user-05', new Set()).size).toBe(0)
		expect(placeMember(desk, links, new Map(), 'user-05', new Set()).size).toBe(0)
	})
})

describe('collectStale', () => {
	const desk = createLedgerDesk()
	const byId = new Map(desk.messages.map((message) => [message.id, message]))

	it('lists a sentence of a live message that shares an id or a number with its amending message', () => {
		expect(collectStale(desk, byId, collectLive(desk))).toEqual([
			{ source: 'user-01', sentence: 1, tokens: ['MX-4471'] },
		])
	})

	it('keeps a sentence stale after its correction is itself superseded (R2b)', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('user-a', 'user', 'The code is MX-4471. Refunds over $200 need it.'),
				buildLedgerMessage('user-b', 'user', 'The code is MX-4486, not MX-4471.'),
				buildLedgerMessage('user-c', 'user', 'The code is MX-5000.'),
			],
			classification: {
				amended: { 'user-a': ['user-b'] },
				superseded: { 'user-b': ['user-c'] },
			},
		})
		const live = collectLive(input)
		expect(live).toEqual(['user-a', 'user-c'])
		expect(
			collectStale(input, new Map(input.messages.map((message) => [message.id, message])), live),
		).toEqual([{ source: 'user-a', sentence: 0, tokens: ['MX-4471'] }])
	})

	it('keeps a sentence stale when its correction is itself corrected (R2b)', () => {
		const input = buildLedgerInput({
			messages: [
				buildLedgerMessage('user-a', 'user', 'The code is MX-4471.'),
				buildLedgerMessage('user-b', 'user', 'The code is MX-4486, not MX-4471.'),
				buildLedgerMessage('user-c', 'user', 'Correction: it is MX-5000, not MX-4486.'),
			],
			classification: {
				amended: { 'user-a': ['user-b'], 'user-b': ['user-c'] },
			},
		})
		const stale = collectStale(
			input,
			new Map(input.messages.map((message) => [message.id, message])),
			collectLive(input),
		)
		expect(
			stale.map((entry) => `${entry.source} ${entry.sentence} ${entry.tokens.join(',')}`),
		).toEqual(['user-a 0 MX-4471', 'user-b 0 MX-4486'])
	})

	it('never lets an excluded, quiet, or assistant message take effect', () => {
		const messages = [
			buildLedgerMessage('user-a', 'user', 'The code is MX-4471.'),
			buildLedgerMessage('user-b', 'user', 'The code is MX-4486, not MX-4471.'),
			buildLedgerMessage('user-c', 'user', 'Ignore that.'),
		]
		const byMessage = new Map(messages.map((message) => [message.id, message]))
		const classification = {
			amended: { 'user-a': ['user-b'] },
			superseded: { 'user-b': ['user-c'] },
		}
		for (const variant of [
			{ exclude: ['user-b'] },
			{ classification: { ...classification, quiet: ['user-b'] } },
		]) {
			const input = buildLedgerInput({
				messages,
				classification,
				...variant,
			})
			expect(collectStale(input, byMessage, collectLive(input))).toEqual([])
		}
	})
})

describe('buildLines', () => {
	const none = new Set<string>()

	it('turns each sentence into a line that carries its source, index, topics, and role', () => {
		const input = buildLedgerInput({
			messages: [buildLedgerMessage('user-a', 'user', 'First sentence. Second sentence.')],
			classification: { topics: { 'user-a': ['refunds'] } },
		})
		const lines = buildLines(
			input,
			new Map(input.messages.map((message) => [message.id, message])),
			'user-a',
			none,
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

	it('leaves out a dead sentence and an absent message', () => {
		const input = buildLedgerInput({
			messages: [buildLedgerMessage('user-a', 'user', 'One. Two.')],
		})
		const byId = new Map(input.messages.map((message) => [message.id, message]))
		expect(
			buildLines(input, byId, 'user-a', new Set(['user-a 0']), [], []).map((line) => line.text),
		).toEqual(['Two.'])
		expect(buildLines(input, byId, 'user-z', none, [], [])).toEqual([])
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
			none,
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
		const lines = buildLines(input, byId, 'user-a', none, ['Odile Marlow'], ['Pat Ruiz'])
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
			none,
			[],
			[],
		)
		expect(lines.some((line) => line.party !== undefined)).toBe(false)
	})
})

describe('buildRecords', () => {
	it('projects the desk scenario into owner records ordered by first member, then the rules record', () => {
		const built = buildRecords(createLedgerDesk())
		expect(built.records.map((record) => [record.key, record.title, record.members])).toEqual([
			['owner:OM-30418', 'Odile Marlow (account OM-30418)', ['user-02']],
			['owner:BW-20931', 'Brightwater Studio (account BW-20931)', ['user-03', 'tool-02']],
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
				'Correction: the manager code is MX-4486, not MX-4471.',
			],
		])
		expect(built.stale).toEqual([{ source: 'user-01', sentence: 1, tokens: ['MX-4471'] }])
		expect(built.loose).toEqual([])
		expect(checkLedgerProjection(built, createLedgerDesk())).toEqual([])
	})

	it('titles an owner without a name by its id', () => {
		const input = buildLedgerInput({
			owners: { 'BW-20931': [] },
			messages: [buildLedgerMessage('user-a', 'user', 'Order for BW-20931 is late.')],
			entities: { 'user-a': ['BW-20931'] },
		})
		expect(buildRecords(input).records.map((record) => record.title)).toEqual(['account BW-20931'])
	})

	it('lists a live message that no record placed as loose', () => {
		const input = buildLedgerInput({
			messages: [buildLedgerMessage('user-a', 'user', 'Nothing names an owner here.')],
		})
		const built = buildRecords(input)
		expect(built.loose).toEqual(['user-a'])
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

	it('takes a lookup result out of every record when an empty reading replaces it (R5a)', () => {
		const text = 'Order BW-5512 for account BW-20931 (Brightwater Studio): total $10.00.'
		const input = buildLedgerInput({
			owners: LEDGER_DESK_OWNERS,
			messages: [
				buildLedgerMessage('tool-a', 'tool', text),
				buildLedgerMessage('tool-b', 'tool', 'No record of order BW-5512.'),
			],
			readings: [
				buildReading('tool-a', { id: 'BW-5512' }, text),
				buildReading('tool-b', { id: 'BW-5512' }, 'No record of order BW-5512.', true),
			],
			entities: { 'tool-a': ['BW-20931'] },
		})
		const built = buildRecords(input)
		expect(built.records).toEqual([])
		expect(built.loose).toEqual([])
		expect(checkLedgerProjection(built, input)).toEqual([])
	})

	it('keeps the earlier result when the later reading is a different call', () => {
		const text = 'Order BW-5512 for account BW-20931 (Brightwater Studio): total $10.00.'
		const input = buildLedgerInput({
			owners: LEDGER_DESK_OWNERS,
			messages: [
				buildLedgerMessage('tool-a', 'tool', text),
				buildLedgerMessage('tool-b', 'tool', 'No record of order BW-9999.'),
			],
			readings: [
				buildReading('tool-a', { id: 'BW-5512' }, text),
				buildReading('tool-b', { id: 'BW-9999' }, 'No record of order BW-9999.', true),
			],
			entities: { 'tool-a': ['BW-20931'] },
		})
		expect(buildRecords(input).records.map((record) => record.members)).toEqual([['tool-a']])
	})

	it('keeps the old value stale when the correction is superseded (R2b)', () => {
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
				amended: { 'user-a': ['user-b'] },
				superseded: { 'user-b': ['user-c'] },
			},
		})
		const built = buildRecords(input)
		expect(built.stale).toEqual([{ source: 'user-a', sentence: 0, tokens: ['MX-4471'] }])
		const texts = built.records.flatMap((record) => record.lines.map((line) => line.text))
		expect(texts.some((text) => text.includes('MX-4471'))).toBe(false)
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
			readings: [
				buildReading('tool-a', { id: 'BW-5512', opts: { a: 1, b: 2 } }, text),
				buildReading('tool-b', { opts: { b: 2, a: 1 }, id: 'BW-5512' }, text),
			],
			entities: { 'tool-a': ['BW-20931'], 'tool-b': ['BW-20931'] },
		})
		expect(buildRecords(input).records.map((record) => record.members)).toEqual([['tool-b']])
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

	it('projects nothing from an empty input', () => {
		expect(buildRecords(buildLedgerInput())).toEqual({
			records: [],
			stale: [],
			loose: [],
		})
	})
})

describe('selectRecords', () => {
	const built = buildRecords(createLedgerDesk())

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

	it('selects only the rules record for a request that names no owner', () => {
		expect(selectRecords(built, { owners: [], topics: [] }).map((view) => view.key)).toEqual([
			'rules',
		])
		expect(selectRecords({ records: [], stale: [], loose: [] }, createLedgerRequest())).toEqual([])
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
	const view = {
		title: 'Odile Marlow (account OM-30418)',
		lines: [
			{
				text: 'The caller is Odile Marlow.',
				source: 'user-a',
				sentence: 0,
				topics: [],
				role: 'user' as const,
			},
			{
				text: 'Dana Whitcombe: She approved it.',
				source: 'user-a',
				sentence: 1,
				topics: [],
				role: 'user' as const,
			},
		],
	}

	it('renders a heading and one list item per line', () => {
		expect(renderLedgerRecord(view)).toBe(
			'## Odile Marlow (account OM-30418)\n- The caller is Odile Marlow.\n- Dana Whitcombe: She approved it.',
		)
		expect(renderLedgerPinned(view)).toBe(
			'### Odile Marlow (account OM-30418)\n- The caller is Odile Marlow.\n- Dana Whitcombe: She approved it.',
		)
	})

	it('renders a record with no line as its heading alone', () => {
		expect(renderLedgerRecord({ title: 'Rules', lines: [] })).toBe('## Rules')
		expect(renderLedgerPinned({ title: 'Rules', lines: [] })).toBe('### Rules')
	})

	it('renders the desk scenario byte for byte', () => {
		const views = selectRecords(buildRecords(createLedgerDesk()), createLedgerRequest())
		expect(views.map(renderLedgerRecord).join('\n\n')).toBe(
			[
				'## Brightwater Studio (account BW-20931)',
				'- The shift lead is Dana Whitcombe.',
				'- Dana Whitcombe: She approved the refund of $148.50 for order BW-5512.',
				'- Order BW-5512 for account BW-20931 (Brightwater Studio): linen set, total $148.50.',
				'',
				'## Rules',
				'- Standing rule: any refund over $200 needs a manager code.',
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

function measureRoom(kept: readonly string[]): number {
	return estimateMessages([{ id: 'recall', role: 'tool', content: kept.join('\n') }])
}

function buildCall(estimate: number, prompt: number | undefined, tools: number): GaugeCall {
	return prompt === undefined ? { estimate, tools } : { estimate, prompt, tools }
}

describe('cutListing and matchesCutLine', () => {
	const items = ['first recalled line', 'second recalled line', 'third recalled line']

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
			'lookup_order {"id":" BW-5512 "}: result shown under Pinned in the system message',
		)
		expect(renderStub('lookup_order', args, 'hidden')).toBe(
			'lookup_order {"id":" BW-5512 "}: result not shown; call recall with BW-5512',
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

	it('writes no handle', () => {
		for (const state of ['failed', 'empty', 'shown', 'hidden'] as const) {
			expect(renderStub('lookup_order', { id: 'BW-5512' }, state).match(LEDGER_HANDLE)).toBeNull()
		}
	})
})

describe('fitSlope', () => {
	it('fits the least-squares slope of prompt over estimate', () => {
		expect(
			fitSlope([[buildCall(100, 130, 2), buildCall(200, 260, 2), buildCall(300, 390, 2)]]),
		).toBe(1.3)
	})

	it('fits within each tool count and pools the sets, so a dropped schema reads as no change in rate', () => {
		const group = [
			buildCall(100, 100, 0),
			buildCall(200, 200, 0),
			buildCall(100, 150, 2),
			buildCall(300, 350, 2),
		]
		expect(fitSlope([group])).toBe(1)
	})

	it('pools the sets of every group', () => {
		expect(
			fitSlope([
				[buildCall(100, 100, 1), buildCall(200, 200, 1)],
				[buildCall(100, 150, 1), buildCall(300, 350, 1)],
			]),
		).toBe(1)
	})

	it('returns undefined when no set holds two usable points that differ', () => {
		expect(fitSlope([])).toBeUndefined()
		expect(fitSlope([[buildCall(100, 130, 2)]])).toBeUndefined()
		expect(fitSlope([[buildCall(100, 130, 2), buildCall(100, 140, 2)]])).toBeUndefined()
		expect(fitSlope([[buildCall(100, 130, 0), buildCall(200, 260, 2)]])).toBeUndefined()
	})

	it('skips a call without a prompt count, with an estimate of zero, or with a prompt that is not finite', () => {
		expect(fitSlope([[buildCall(100, undefined, 2), buildCall(200, 260, 2)]])).toBeUndefined()
		expect(fitSlope([[buildCall(0, 50, 2), buildCall(200, 260, 2)]])).toBeUndefined()
		expect(fitSlope([[buildCall(100, Number.NaN, 2), buildCall(200, 260, 2)]])).toBeUndefined()
		expect(
			fitSlope([
				[
					buildCall(100, 130, 2),
					buildCall(200, 260, 2),
					buildCall(0, 9, 2),
					buildCall(50, undefined, 2),
				],
			]),
		).toBe(1.3)
	})
})
