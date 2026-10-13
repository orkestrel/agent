import type { Message } from '../../vendor/agent-0.0.30-trimmed/index.js'
import type { WireRun } from '../types.js'
import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CORPUS, HARNESS, MICA_MODEL, SCENARIO_LONG } from '../constants.js'
import { INSTRUCTION_SUMMARIES, SUMMARIES_HEADING } from '../aggregates/constants.js'
import {
	assignCategory,
	buildCacheKey,
	buildCorpusQuery,
	buildSummaryKey,
	buildSystem,
	computeDigest,
	describeError,
	extractHead,
	findDay,
	importCorpus,
	isCacheRow,
	isCorpusRow,
	isMessageRole,
	isSummaryRow,
	isUsage,
	matchesDeterministic,
	matchesExposure,
	readJSON,
	readWireReading,
	listUsageFailures,
	listWireFailures,
	readLookup,
	readRows,
	renderDate,
	renderMessageState,
	renderPairState,
	resolveLookup,
} from '../helpers.js'

const SHORT = join(HARNESS, 'bench', 'scenario.json')
const COPY = join(HARNESS, 'bench', 'variants', 'ledger', 'v1.json')
const calls: string[] = []
const realFetch = globalThis.fetch
globalThis.fetch = async (input) => {
	calls.push(String(input instanceof Request ? input.url : input))
	throw new Error('fetch is blocked in this proof')
}

function readField(value: unknown, key: string): unknown {
	return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
}

function readList(value: unknown, key: string): readonly unknown[] {
	const field = readField(value, key)
	return Array.isArray(field) ? field : []
}

function readText(value: unknown, key: string): string {
	const field = readField(value, key)
	assert.equal(typeof field, 'string', key)
	return String(field)
}

interface Seeded {
	readonly role: string
	readonly content: string
}

function readSeed(path: string): readonly Seeded[] {
	return readList(readJSON(path), 'seed').map((message) => ({
		role: readText(message, 'role'),
		content: readText(message, 'content'),
	}))
}

function readTopics(): ReadonlyArray<{ readonly name: string; readonly criterion: string }> {
	const topics = readField(readField(readJSON(COPY), 'ledger'), 'topics')
	assert.ok(typeof topics === 'object' && topics !== null)
	return Object.entries(topics).map(([name, criterion]) => ({ name, criterion: String(criterion) }))
}

function readLookups(): Parameters<typeof resolveLookup>[0] {
	const scenario = readJSON(SCENARIO_LONG)
	const tools: Record<string, Record<string, string>> = {}
	const raw = readField(scenario, 'tools')
	assert.ok(typeof raw === 'object' && raw !== null)
	for (const [name, table] of Object.entries(raw)) {
		assert.ok(typeof table === 'object' && table !== null)
		tools[name] = Object.fromEntries(Object.entries(table).map(([id, text]) => [id, String(text)]))
	}
	const lookups = readList(scenario, 'lookups').map((entry) => ({
		tool: readText(entry, 'tool'),
		id: readText(entry, 'id'),
		from: Number(readField(entry, 'from')),
		text: readText(entry, 'text'),
	}))
	return { tools, lookups }
}

describe('helpers.ts', () => {
	after(() => {
		assert.notEqual(globalThis.fetch, realFetch)
		assert.deepEqual(calls, [])
	})

	describe('readers and digests', () => {
		it('reads JSON and JSON Lines files and skips blank lines', () => {
			const directory = mkdtempSync(join(tmpdir(), 'bench5-helpers-'))
			try {
				const json = join(directory, 'one.json')
				const lines = join(directory, 'many.jsonl')
				writeFileSync(json, '{"a":[1,2]}')
				writeFileSync(lines, '{"n":1}\r\n\r\n{"n":2}\n   \n')
				assert.deepEqual(readJSON(json), { a: [1, 2] })
				assert.deepEqual(readRows(lines), [{ n: 1 }, { n: 2 }])
			} finally {
				rmSync(directory, { recursive: true, force: true })
			}
		})

		it('digests text as given and any other value as JSON', () => {
			assert.equal(computeDigest('abc'), createHash('sha256').update('abc').digest('hex'))
			assert.equal(
				computeDigest(['abc', 1]),
				createHash('sha256').update('["abc",1]').digest('hex'),
			)
		})

		it('describes an error chain outermost first and stops at a cycle', () => {
			const inner = new Error('inner')
			const outer = new Error('outer', { cause: inner })
			assert.equal(describeError(outer), 'Error: outer <- Error: inner')
			assert.equal(describeError('plain'), 'plain')
			const loop = new Error('loop')
			loop.cause = loop
			assert.equal(describeError(loop), 'Error: loop')
		})

		it('matches the deterministic judge error anywhere in the chain', () => {
			const deterministic = new Error('wrapped', {
				cause: new Error('invalid or duplicate top logprob token'),
			})
			assert.equal(matchesDeterministic(deterministic), true)
			assert.equal(matchesDeterministic(new Error('socket hang up')), false)
		})

		it('extracts the head of a judgment key and falls back to other', () => {
			assert.equal(extractHead('["topic","m1","refunds"]'), 'topic')
			assert.equal(extractHead('["category","m1"]'), 'category')
			assert.equal(extractHead('not json'), 'other')
			assert.equal(extractHead('{"a":1}'), 'other')
			assert.equal(extractHead('[7]'), 'other')
			assert.equal(extractHead('[]'), 'other')
		})
	})

	describe('system and days', () => {
		it('builds a system text without the full-view protocol, the pin sentence, or a date', () => {
			const system = readText(readField(readJSON(COPY), 'ledger'), 'system')
			assert.ok(system.includes('send_reply') && system.includes('call pin'))
			const built = buildSystem({ ledger: { system } })
			assert.ok(!built.includes('send_reply'))
			assert.ok(!built.includes('pin'))
			assert.ok(!built.includes('Today is'))
			assert.ok(
				built.includes(
					'Finish every request with your complete answer as your final message; that message is what the shift lead receives.',
				),
			)
			assert.ok(built.includes('A message marked amended is changed by the message it names.'))
			assert.ok(built.endsWith(' Never cite a handle such as m12 or r5 in your answer.'))
		})

		it('renders the date instruction with a UTC weekday', () => {
			assert.equal(renderDate('2026-10-08'), 'Today is Thursday 2026-10-08.')
			assert.equal(renderDate('2026-10-09'), 'Today is Friday 2026-10-09.')
			assert.equal(renderDate('2026-10-10'), 'Today is Saturday 2026-10-10.')
		})

		it('finds the day with the greatest start at most the index', () => {
			const days = readList(readJSON(SCENARIO_LONG), 'days').map((day) => ({
				date: readText(day, 'date'),
				from: Number(readField(day, 'from')),
			}))
			assert.deepEqual(
				[0, 47, 77, 78, 119, 120, 151].map((index) => findDay(days, index)?.date),
				[
					'2026-10-08',
					'2026-10-08',
					'2026-10-08',
					'2026-10-09',
					'2026-10-09',
					'2026-10-10',
					'2026-10-10',
				],
			)
			assert.equal(findDay(days, -1), undefined)
			assert.equal(findDay([], 5), undefined)
		})
	})

	describe('lookups', () => {
		it('reads ids and owners from a lookup result and the call argument', () => {
			const reading = readLookup(
				{ id: 'lh-80941' },
				'Order LH-80941 for account LH-31055 (Halvorsen Interiors): 8 brass pendant lights.',
			)
			assert.deepEqual(reading, {
				ids: ['LH-80941', 'LH-31055'],
				owners: [{ id: 'LH-31055', names: ['Halvorsen Interiors'] }],
			})
			const account = readLookup(
				{ account: 'LH-71592' },
				'Account LH-71592: Copperline Cafes, wholesale tier.',
			)
			assert.deepEqual(account, {
				ids: ['LH-71592'],
				owners: [{ id: 'LH-71592', names: ['Copperline Cafes'] }],
			})
		})

		it('returns undefined for a result that reports no record', () => {
			assert.equal(readLookup({ id: 'LH-1' }, 'No record for LH-1'), undefined)
		})

		it('skips an owner whose name holds no letter', () => {
			assert.deepEqual(readLookup({}, 'Account LH-10: 4421, closed'), {
				ids: ['LH-10'],
				owners: [],
			})
		})

		it('resolves the base text before a version starts and the versioned text from its index', () => {
			const lookups = readLookups()
			const base = lookups.tools['lookup_order']?.['LH-80941']
			const versioned = lookups.lookups.find((entry) => entry.id === 'LH-80941')
			assert.ok(base !== undefined && versioned !== undefined && base !== versioned.text)
			assert.equal(versioned.from, 81)
			assert.equal(resolveLookup(lookups, 'lookup_order', 'LH-80941', 80), base)
			assert.equal(resolveLookup(lookups, 'lookup_order', 'LH-80941', 81), versioned.text)
			assert.equal(resolveLookup(lookups, 'lookup_order', 'lh-80941 ', 151), versioned.text)
			const customer = lookups.lookups.find((entry) => entry.id === 'LH-71592')
			const earlier = lookups.tools['lookup_customer']?.['LH-71592']
			assert.ok(customer !== undefined && earlier !== undefined && customer.from === 135)
			assert.equal(resolveLookup(lookups, 'lookup_customer', 'LH-71592', 134), earlier)
			assert.equal(resolveLookup(lookups, 'lookup_customer', 'LH-71592', 135), customer.text)
		})

		it('keeps a version to its own tool and falls back to a no-record text', () => {
			const lookups = readLookups()
			assert.equal(
				resolveLookup(lookups, 'lookup_customer', 'LH-80941', 151),
				'no record for LH-80941',
			)
			assert.equal(resolveLookup(lookups, 'lookup_order', '', 151), 'no record for an empty id')
			assert.equal(
				resolveLookup(lookups, 'lookup_missing', 'LH-80941', 151),
				'no record for LH-80941',
			)
		})

		it('takes the latest of two versions that both start at or before the position', () => {
			const scenario = {
				tools: { find: { A1: 'base' } },
				lookups: [
					{ tool: 'find', id: 'A1', from: 5, text: 'first' },
					{ tool: 'find', id: 'A1', from: 9, text: 'second' },
				],
			}
			assert.equal(resolveLookup(scenario, 'find', 'A1', 4), 'base')
			assert.equal(resolveLookup(scenario, 'find', 'A1', 8), 'first')
			assert.equal(resolveLookup(scenario, 'find', 'A1', 9), 'second')
		})
	})

	describe('cache keys and states', () => {
		it('keys on model, state, and question and on nothing else', () => {
			const question = { form: 'noul' as const, instructions: 'Q?' }
			const key = buildCacheKey('m', 'user: hi', question)
			assert.match(key, /^[0-9a-f]{64}$/)
			assert.equal(
				key,
				createHash('sha256')
					.update('["m","user: hi",{"form":"noul","instructions":"Q?"}]')
					.digest('hex'),
			)
			assert.notEqual(key, buildCacheKey('n', 'user: hi', question))
			assert.notEqual(key, buildCacheKey('m', 'user: ho', question))
			assert.notEqual(key, buildCacheKey('m', 'user: hi', { form: 'noul', instructions: 'Q!' }))
		})

		it('renders a message and a pair as the classifier states them', () => {
			assert.equal(renderMessageState({ role: 'user', content: 'Hello' }), 'user: Hello')
			assert.equal(
				renderPairState({ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }),
				'Earlier message: user: a\nLater message: assistant: b',
			)
		})

		it('renders the first 48 long-seed messages as the short scenario seed does', () => {
			const long = readSeed(SCENARIO_LONG)
			const short = readSeed(SHORT)
			assert.ok(long.length >= 48 && short.length >= 48)
			for (let index = 0; index < 48; index += 1) {
				const left = long[index]
				const right = short[index]
				assert.ok(left !== undefined && right !== undefined)
				assert.equal(renderMessageState(left), `${right.role}: ${right.content}`, `seed ${index}`)
			}
		})
	})

	describe('corpus import', () => {
		const rows = readRows(CORPUS)
		const seed = readSeed(SCENARIO_LONG)
		const topics = readTopics()
		const imported = importCorpus(rows, seed, topics, MICA_MODEL)
		const byKey = new Map(imported.map((row) => [row.key, row]))

		it('narrows corpus rows by field type', () => {
			assert.equal(isCorpusRow({ question: 'topic', index: 3 }), true)
			assert.equal(isCorpusRow({ question: 'topic', index: '3' }), false)
			assert.equal(isCorpusRow({ index: 3 }), false)
			assert.equal(isCorpusRow(null), false)
			assert.equal(isCorpusRow({ question: 'category', probabilities: 4 }), false)
			assert.ok(rows.every(isCorpusRow))
		})

		it('yields a key for every forward category, topic, and pair row of indices 0 to 47', () => {
			let expected = 0
			for (const row of rows) {
				assert.ok(isCorpusRow(row))
				if (row.question === 'category' && row.order !== 'forward') continue
				const index = Math.max(row.index ?? -1, row.later ?? -1)
				assert.ok(index >= 0 && index <= 47, `${row.question} index ${index}`)
				const left = row.index === undefined ? seed[row.earlier ?? -1] : seed[row.index]
				assert.ok(left !== undefined)
				const state =
					row.question === 'amends' || row.question === 'supersedes'
						? `Earlier message: ${left.role}: ${left.content}\nLater message: ${seed[row.later ?? -1]?.role}: ${seed[row.later ?? -1]?.content}`
						: `${left.role}: ${left.content}`
				assert.equal(typeof row.asked, 'string')
				const hit = byKey.get(buildCacheKey(MICA_MODEL, state, JSON.parse(String(row.asked))))
				const deterministic = row.error !== undefined
				assert.ok(hit !== undefined, `${row.question} ${row.index ?? ''} ${row.topic ?? ''}`)
				assert.equal(hit.origin, 'corpus')
				assert.equal(hit.error !== undefined, deterministic)
				assert.equal(hit.model, MICA_MODEL)
				expected += 1
			}
			const reversed = rows.filter((row) => readField(row, 'order') === 'reverse').length
			assert.ok(reversed > 0)
			assert.equal(imported.length, rows.length - reversed)
			assert.equal(imported.length, expected)
			assert.equal(byKey.size, imported.length)
		})

		it('imports the answers the corpus recorded', () => {
			const category = rows.find(
				(row) => readField(row, 'question') === 'category' && readField(row, 'order') === 'forward',
			)
			assert.ok(category !== undefined)
			const state = renderMessageState(
				seed[Number(readField(category, 'index'))] ?? { role: '', content: '' },
			)
			const found = imported.find((row) => row.state === state && row.question.form === 'choice')
			assert.ok(found?.answer?.form === 'choice')
			assert.deepEqual(found.answer.probabilities, readField(category, 'probabilities'))
			const noul = rows.find(
				(row) => readField(row, 'question') === 'topic' && readField(row, 'p') !== undefined,
			)
			assert.ok(noul !== undefined)
			assert.ok(
				imported.some(
					(row) => row.answer?.form === 'noul' && row.answer.noul === readField(noul, 'p'),
				),
			)
		})

		it('imports a deterministic error as an error row and skips another error', () => {
			const errors = imported.filter((row) => row.error !== undefined)
			assert.ok(errors.length > 0)
			assert.ok(errors.every((row) => matchesDeterministic(row.error)))
			assert.ok(errors.every((row) => row.answer === undefined && row.refusal === undefined))
			const first = errors[0]
			assert.ok(first !== undefined)
			const other = importCorpus(
				[{ question: 'topic', index: 2, topic: 'refunds', error: 'socket hang up' }],
				seed,
				topics,
				MICA_MODEL,
			)
			assert.deepEqual(other, [])
		})

		it('skips reversed category rows, unknown topics, missing messages, and a changed question', () => {
			const forward = rows.find(
				(row) => readField(row, 'question') === 'category' && readField(row, 'order') === 'forward',
			)
			assert.ok(isCorpusRow(forward))
			assert.equal(buildCorpusQuery({ ...forward, order: 'reverse' }, seed, topics), undefined)
			assert.equal(buildCorpusQuery({ ...forward, index: 9999 }, seed, topics), undefined)
			assert.equal(
				buildCorpusQuery({ question: 'topic', index: 0, topic: 'nowhere' }, seed, topics),
				undefined,
			)
			assert.equal(
				buildCorpusQuery({ ...forward, asked: '{"form":"choice"}' }, seed, topics),
				undefined,
			)
			assert.equal(buildCorpusQuery({ question: 'amends', earlier: 1 }, seed, topics), undefined)
			assert.equal(buildCorpusQuery({ question: 'unknown', index: 0 }, seed, topics), undefined)
			assert.ok(
				buildCorpusQuery(
					{ question: 'category', order: 'forward', index: forward.index ?? 0 },
					seed,
					topics,
				) !== undefined,
			)
		})

		it('narrows cache rows to those that carry exactly one outcome', () => {
			const [first] = imported
			assert.ok(first !== undefined && isCacheRow(first))
			assert.equal(isCacheRow({ ...first, answer: undefined }), false)
			assert.equal(isCacheRow({ ...first, error: 'x' }), false)
			assert.equal(isCacheRow({ ...first, origin: 'other' }), false)
			assert.equal(isCacheRow({ ...first, key: 3 }), false)
			assert.equal(isCacheRow(undefined), false)
			assert.ok(imported.every(isCacheRow))
		})
	})

	describe('assignCategory', () => {
		const messages = [
			{ id: 'u1', role: 'user' },
			{ id: 'a1', role: 'assistant' },
			{ id: 'a2', role: 'assistant', calls: [{}] },
			{ id: 't1', role: 'tool' },
			{ id: 't2', role: 'tool' },
			{ id: 't3', role: 'tool' },
			{ id: 'r1', role: 'user' },
			{ id: 'a3', role: 'assistant' },
			{ id: 'n1', role: 'user' },
		]
		const results = new Map([
			['t1', { success: true }],
			['t2', { success: false }],
		])
		const none = new Set<string>()
		function assign(
			id: string,
			requests: ReadonlySet<string>,
			annotations: ReadonlySet<string> = none,
		) {
			const message = messages.find((one) => one.id === id)
			assert.ok(message !== undefined)
			return assignCategory(message, messages, requests, annotations, results)
		}

		it('leaves a user message and an early assistant message to the judge', () => {
			assert.equal(assign('u1', none), undefined)
			assert.equal(assign('a1', none), undefined)
			assert.equal(assign('r1', new Set(['r1'])), undefined)
			assert.equal(assign('a1', new Set(['r1'])), undefined)
		})

		it('files an assistant message after the first request as chatter', () => {
			assert.equal(assign('a3', new Set(['r1'])), 'chatter')
			assert.equal(assign('a3', none), undefined)
		})

		it('files an assistant call as chatter whatever the requests', () => {
			assert.equal(assign('a2', none), 'chatter')
		})

		it('files a successful or unrecorded tool result as fact and a failed one as chatter', () => {
			assert.equal(assign('t1', none), 'fact')
			assert.equal(assign('t3', none), 'fact')
			assert.equal(assign('t2', none), 'chatter')
		})

		it('files an annotation as chatter before any other rule', () => {
			assert.equal(assign('n1', none, new Set(['n1'])), 'chatter')
			assert.equal(assign('t1', none, new Set(['t1'])), 'chatter')
			assert.equal(assign('n1', none), undefined)
		})
	})

	describe('buildSummaryKey', () => {
		const options = { model: 'model-a', sampler: { temperature: 0, seed: 7 }, predict: 160 }
		const messages: readonly Message[] = [
			{ id: 's1', role: 'system', content: 'Summarize Marcus Halvorsen.' },
			{ id: 'u1', role: 'user', content: 'Marcus got the refund.' },
		]

		it('digests the model, sampler, cap, and the role and content of each message', () => {
			const expected = computeDigest([
				'model-a',
				{ temperature: 0, seed: 7 },
				160,
				[
					['system', 'Summarize Marcus Halvorsen.'],
					['user', 'Marcus got the refund.'],
				],
			])
			assert.equal(buildSummaryKey(options, messages), expected)
		})

		it('ignores message ids and keys a changed model, sampler, cap, or content apart', () => {
			const renamed = messages.map((message) => ({ ...message, id: `other-${message.id}` }))
			assert.equal(buildSummaryKey(options, renamed), buildSummaryKey(options, messages))
			const keys = new Set([
				buildSummaryKey(options, messages),
				buildSummaryKey({ ...options, model: 'model-b' }, messages),
				buildSummaryKey({ ...options, sampler: { temperature: 0, seed: 8 } }, messages),
				buildSummaryKey({ ...options, predict: 161 }, messages),
				buildSummaryKey(options, messages.slice(0, 1)),
				buildSummaryKey(options, [
					{ id: 's1', role: 'system', content: 'Summarize Dana Ostrow.' },
					...messages.slice(1),
				]),
			])
			assert.equal(keys.size, 6)
		})
	})

	describe('isUsage', () => {
		it('accepts a record with numeric prompt, completion, and total', () => {
			assert.equal(isUsage({ prompt: 10, completion: 4, total: 14 }), true)
			assert.equal(isUsage({ prompt: 0, completion: 0, total: 0, extra: 'kept' }), true)
		})

		it('refuses a non-object, a missing member, and a member of another type', () => {
			for (const value of [
				undefined,
				null,
				14,
				'usage',
				[],
				{},
				{ prompt: 10, completion: 4 },
				{ prompt: '10', completion: 4, total: 14 },
			]) {
				assert.equal(isUsage(value), false, JSON.stringify(value))
			}
		})
	})

	describe('isSummaryRow', () => {
		const row = {
			key: 'k',
			model: 'model-a',
			sampler: {},
			predict: 160,
			prose: 'Marcus was refunded.',
			raw: ' Marcus was refunded.\n',
			wall: 12.5,
			origin: 'live',
			at: 1,
		}

		it('accepts a row with or without a usage', () => {
			assert.equal(isSummaryRow(row), true)
			assert.equal(isSummaryRow({ ...row, origin: 'corpus' }), true)
			assert.equal(isSummaryRow({ ...row, usage: { prompt: 10, completion: 4, total: 14 } }), true)
		})

		it('refuses a non-object, a missing or mistyped field, an unknown origin, and a malformed usage', () => {
			assert.equal(isSummaryRow(null), false)
			assert.equal(isSummaryRow('row'), false)
			for (const key of ['key', 'prose', 'raw', 'wall', 'at', 'origin']) {
				assert.equal(isSummaryRow({ ...row, [key]: undefined }), false, key)
			}
			assert.equal(isSummaryRow({ ...row, prose: 3 }), false)
			assert.equal(isSummaryRow({ ...row, origin: 'cache' }), false)
			assert.equal(isSummaryRow({ ...row, usage: { prompt: 10 } }), false)
		})
	})

	describe('isMessageRole', () => {
		it('accepts the four roles of a message and refuses every other value', () => {
			for (const role of ['system', 'user', 'assistant', 'tool'])
				assert.equal(isMessageRole(role), true, role)
			for (const value of ['developer', 'User', '', undefined, null, 1])
				assert.equal(isMessageRole(value), false, String(value))
		})
	})
})

describe('wire summary validation', () => {
	const summary = `${SUMMARIES_HEADING}\n\n#### Refunds, as of 2026-10-08\nIds: LH-100\nRefund 40.`
	const support = 'Refunds LH-100 Refund 40.'
	const run: WireRun = {
		info: { arm: 'aggregate' },
		picks: [
			{
				goal: 'g01',
				pass: 1,
				sequence: 1,
				briefing: '',
				digest: '',
				tail: [],
				instructions: { [INSTRUCTION_SUMMARIES.name]: summary },
				scale: 1,
			},
		],
		calls: [{ goal: 'g01', role: 'agent', sequence: 2, started: 0, wall: 0, status: 200 }],
		wire: new Map([
			[
				2,
				readWireReading(
					{ body: { messages: [{ role: 'system', content: `${summary}\n\n${support}` }] } },
					{
						text: JSON.stringify({
							done: true,
							done_reason: 'stop',
							prompt_eval_count: 100,
							eval_count: 10,
						}),
					},
				),
			],
		]),
	}

	it('preserves a single supported block and refuses a single unsupported block', () => {
		assert.equal(matchesExposure(run, 'g01'), true)
		assert.deepEqual(listWireFailures(run), [])
		const reading = run.wire.get(2)
		assert.ok(reading !== undefined)
		const unsupported = {
			...run,
			wire: new Map([[2, { ...reading, messages: [{ role: 'system', content: summary }] }]]),
		}
		assert.ok(listWireFailures(unsupported).some((failure) => failure.includes('sole-carried')))
	})

	it('refuses duplicate summaries instead of allowing treatment to support itself', () => {
		const reading = run.wire.get(2)
		assert.ok(reading !== undefined)
		for (const messages of [
			[{ role: 'system', content: `${summary}\n\n${summary}` }],
			[
				{ role: 'system', content: summary },
				{ role: 'system', content: summary },
			],
		]) {
			const duplicate: WireRun = { ...run, wire: new Map([[2, { ...reading, messages }]]) }
			assert.ok(listWireFailures(duplicate).some((failure) => failure.includes('summaries block')))
			assert.equal(matchesExposure(duplicate, 'g01'), false)
		}
	})

	it('refuses extra unrecorded blocks beside an otherwise supported recorded block', () => {
		const reading = run.wire.get(2)
		assert.ok(reading !== undefined)
		const extra = summary.replaceAll('LH-100', 'LH-999').replace('40.', '900.')
		for (const messages of [
			[{ role: 'system', content: `${summary}\n${support}\n${extra}` }],
			[
				{ role: 'system', content: `${summary}\n${support}` },
				{ role: 'system', content: extra },
			],
		]) {
			const unrecorded: WireRun = { ...run, wire: new Map([[2, { ...reading, messages }]]) }
			assert.ok(listWireFailures(unrecorded).some((failure) => failure.includes('summaries block')))
			assert.equal(matchesExposure(unrecorded, 'g01'), false)
		}
	})

	it('does not count an IDs-only entry as nonempty wire exposure', () => {
		const reading = run.wire.get(2)
		assert.ok(reading !== undefined)
		const empty = `${SUMMARIES_HEADING}\n\n#### Refunds, as of 2026-10-08\nIds: LH-100\n`
		const noProse = {
			...run,
			picks: run.picks.map((pick) => ({
				...pick,
				instructions: { [INSTRUCTION_SUMMARIES.name]: empty },
			})),
			wire: new Map([
				[
					2,
					{ ...reading, messages: [{ role: 'system', content: `${empty}\nRefunds Ids: LH-100` }] },
				],
			]),
		}
		assert.equal(matchesExposure(noProse, 'g01'), false)
	})
})

describe('raw completion evidence', () => {
	it('requires usage on agent calibration calls before the first served goal too', () => {
		const failures = listWireFailures({
			info: { arm: 'control' },
			picks: [],
			wire: new Map(),
			calls: [{ sequence: 1, role: 'agent', goal: undefined, started: 0, wall: 0, status: 200 }],
		})
		assert.deepEqual(failures, [
			'control calibration request 1: missing wire usage',
			'control calibration request 1: missing wire request',
		])
	})

	it('refuses absent, malformed, incomplete, and invalid usage instead of substituting zero', () => {
		assert.deepEqual(listUsageFailures(undefined), ['missing wire usage'])
		for (const response of [
			undefined,
			{ text: '{broken' },
			{ text: '{"done":false,"prompt_eval_count":12,"eval_count":1}' },
			{ text: '{"done":true,"prompt_eval_count":12}' },
			{ text: '{"done":true,"prompt_eval_count":12,"eval_count":-1}' },
			{ text: '{"done":true,"prompt_eval_count":"12","eval_count":1}' },
		]) {
			assert.deepEqual(listUsageFailures(readWireReading(undefined, response)), [
				'missing or malformed wire usage',
			])
		}
	})

	it('checks the completion ceiling, length reason, and strict total boundary with adjacent passing controls', () => {
		for (const [prompt, completion, reason, failure] of [
			[2559, 512, 'stop', ''],
			[2560, 512, 'stop', 'prompt plus completion'],
			[12, 513, 'stop', 'completion 513'],
			[12, 1, 'length', 'length-limited'],
		] as const) {
			const reading = readWireReading(
				{ body: { messages: [{ role: 'user', content: 'Question' }] } },
				{
					text: `${JSON.stringify({ done: true, done_reason: reason, prompt_eval_count: prompt, eval_count: completion })}\r\n`,
				},
			)
			assert.deepEqual(reading.messages, [{ role: 'user', content: 'Question' }])
			assert.equal(
				listUsageFailures(reading).some((entry) => entry.startsWith(failure)),
				failure !== '',
			)
		}
	})
})
