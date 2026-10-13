import { buildSupportRows } from './support/helpers.js'
import { BUILD } from '../constants.js'
import type { JudgeQuestion } from '../../vendor/agent-0.0.30-trimmed/index.js'
import type {
	CacheRow,
	CalibrateAsked,
	CalibrateConfig,
	CalibrateItem,
	CalibrateSummary,
} from '../types.js'
import type { Fixture } from './fixture.js'
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createOllamaJudge } from '../../vendor/ollama/index.js'
import { AGREE_QUESTION, CHANGE_HEAD, AGREE_HEAD, SUMMARY_PREFIX } from '../aggregates/constants.js'
import { buildAgreeState, buildChangeQuestion, buildChangeState } from '../aggregates/helpers.js'
import {
	Calibrator,
	buildItems,
	buildSources,
	buildSwaps,
	computeShape,
	countTally,
	createRandom,
	extractValues,
	findNext,
	fitAsked,
	fitCutoff,
	parseFlags,
	pickOne,
	readScenario,
	replaceValue,
	selectSources,
} from '../calibrate.js'
import {
	DAEMON,
	HARNESS,
	MICA_CALIBRATION,
	MICA_CONTEXT,
	MICA_MODEL,
	MICA_SYSTEM,
	MODELS,
	SCENARIO_LONG,
	TIMEOUT,
} from '../constants.js'
import { buildCacheKey, readJSON, readRows } from '../helpers.js'
import { readFit } from '../Driver.js'
import { startFixture } from './fixture.js'

const SCRIPT = join(BUILD, 'bench5', 'calibrate.js')
const directory = mkdtempSync(join(tmpdir(), 'bench5-calibrate-'))
const nativeFetch = globalThis.fetch
const fetched: string[] = []
let fixture: Fixture
let runs = 0

// Blocks the daemon port and passes every other address through, so the fixture stays reachable.
globalThis.fetch = async (input, init) => {
	const url = String(input instanceof Request ? input.url : input)
	fetched.push(url)
	if (url.includes(':11434')) throw new Error('the daemon at :11434 is blocked in this proof')
	return await nativeFetch(input, init)
}

// The cache keys carry the judge's identity, which the vendored judge derives from its options; the calibration builds it the same way.
const JUDGE = createOllamaJudge({
	url: DAEMON,
	model: MICA_MODEL,
	system: MICA_SYSTEM,
	calibration: { temperature: MICA_CALIBRATION },
	options: { num_ctx: MICA_CONTEXT },
	keepAlive: '5m',
	timeout: TIMEOUT,
	fetch: () => Promise.reject(new Error('the identity probe sends nothing')),
}).model

// The calibration draws its CHANGE negatives from this seed.
const SEED = 7

interface Entry {
	readonly role: 'user' | 'assistant'
	readonly category: string
	readonly topics: readonly string[]
	readonly content: string
	readonly amends?: readonly number[]
	readonly supersedes?: readonly number[]
}

// The seed keeps each topic name out of the other topics' messages, because the fixture picks a summary by the longest topic name in the request.
const SEED_ENTRIES: readonly Entry[] = [
	{
		role: 'user',
		category: 'fact',
		topics: [],
		content: 'Morning, I am Dana Whitcombe on the Larkspur desk.',
	},
	{ role: 'assistant', category: 'chatter', topics: [], content: 'Good morning, Dana.' },
	{
		role: 'user',
		category: 'rule',
		topics: ['refunds'],
		content: 'Standing rule: a refund over $200 needs approval code MX-4471 from Marcus Oyelaran.',
	},
	{
		role: 'user',
		category: 'fact',
		topics: ['returns'],
		content:
			'Opened items come back with a 15 percent restocking fee. Ticket EX-2219 covers the first one.',
	},
	{
		role: 'user',
		category: 'correction',
		topics: ['refunds'],
		content: 'Marcus rotated the code. Use MX-4486 from now on.',
		amends: [2],
	},
	{
		role: 'user',
		category: 'fact',
		topics: ['delivery'],
		content: 'Carrier Brightline collects from depot D-12 on Fridays.',
	},
	{
		role: 'user',
		category: 'fact',
		topics: ['refunds', 'returns'],
		content: 'Order LH-5001 is a $75 case and needs MX-4486.',
	},
	{
		role: 'user',
		category: 'correction',
		topics: ['returns'],
		content: 'The director scrapped the restocking fee. Opened items come back in full.',
		supersedes: [3],
	},
	{
		role: 'user',
		category: 'fact',
		topics: ['refunds'],
		content: 'Gift orders go back to the original card only.',
	},
	{
		role: 'user',
		category: 'fact',
		topics: ['returns'],
		content: 'Wholesale items come back by pallet slot on Friday.',
	},
]
const SCENARIO = Object.freeze({
	ledger: {
		topics: {
			refunds: 'refund money',
			returns: 'items coming back',
			delivery: 'carriers and depots',
		},
	},
	days: [
		{ date: '2026-10-08', from: 0 },
		{ date: '2026-10-09', from: 5 },
	],
	seed: SEED_ENTRIES.map((entry) => ({
		role: entry.role,
		content: entry.content,
		truth: {
			category: entry.category,
			topics: entry.topics,
			...(entry.amends === undefined ? {} : { amends: entry.amends }),
			...(entry.supersedes === undefined ? {} : { supersedes: entry.supersedes }),
		},
	})),
	goals: [{ after: 7 }, { after: 4 }, { after: 7 }],
})
// The prose the fixture serves for each topic; the delivery prose names an id that no source carries, so it fails the code check on every attempt.
const PROSE = Object.freeze({
	refunds: 'Marcus rotated the code to MX-4486.',
	returns: 'Opened items come back in full.',
	delivery: 'Carrier BX-9999 collects on Fridays.',
})

const scenario = readScenario(SCENARIO)

before(async () => {
	fixture = await startFixture({ prefix: SUMMARY_PREFIX, summaries: PROSE })
})

after(async () => {
	await fixture.close()
	rmSync(directory, { recursive: true, force: true })
	globalThis.fetch = nativeFetch
	assert.deepEqual(
		fetched.filter((url) => url.includes(':11434')),
		[],
	)
})

function buildSummary(
	topic: 'refunds' | 'returns',
	point: number,
	prose: string,
): CalibrateSummary {
	const selection = selectSources(scenario.messages, topic, point)
	return {
		topic,
		after: point,
		asOf: point < 5 ? '2026-10-08' : '2026-10-09',
		prose,
		sources: selection.live.flatMap((message) => buildSources(message, scenario.days)),
		live: selection.live.map((message) => message.index),
		stale: selection.stale.map((message) => message.index),
	}
}

function buildAsked(
	head: CalibrateItem['head'],
	label: boolean,
	noul: number | undefined,
	outcome: CalibrateAsked['outcome'] = 'answered',
	cached = false,
): CalibrateAsked {
	const question: JudgeQuestion = AGREE_QUESTION
	const item: CalibrateItem = {
		id: JSON.stringify([head]),
		head,
		variant: 'summary',
		label,
		topic: 'refunds',
		after: 4,
		events: [],
		swap: undefined,
		state: 'state',
		question,
	}
	return { item, noul, outcome, cached, wall: 1 }
}

// Lists the items the calibration asks of the fixture scenario, in the order it asks them.
function planItems(): readonly CalibrateItem[] {
	const random = createRandom(SEED)
	const items: CalibrateItem[] = []
	for (const point of scenario.points) {
		for (const topic of ['refunds', 'returns'] as const) {
			items.push(...buildItems(buildSummary(topic, point, PROSE[topic]), scenario, random))
		}
	}
	return items
}

function writeCache(
	path: string,
	items: readonly CalibrateItem[],
	answer: (item: CalibrateItem) => number,
): void {
	mkdirSync(join(path, '..'), { recursive: true })
	const rows = items.flatMap((item): readonly CacheRow[] =>
		item.support === undefined
			? [
					{
						key: buildCacheKey(JUDGE, item.state, item.question),
						model: JUDGE,
						state: item.state,
						question: item.question,
						answer: { form: 'noul', noul: answer(item) },
						wall: 1,
						origin: 'live',
						at: 1,
					},
				]
			: buildSupportRows(JUDGE, item.support.candidate, item.support.sources, answer(item)),
	)
	writeFileSync(path, rows.map((row) => `${JSON.stringify(row)}\n`).join(''))
}

function prepareRun(): CalibrateConfig {
	runs += 1
	const base = join(directory, `run-${runs}`)
	mkdirSync(base, { recursive: true })
	writeFileSync(join(base, 'scenario.json'), JSON.stringify(SCENARIO))
	writeFileSync(
		join(base, 'settings.json'),
		JSON.stringify({ q2: { allowance: 300, retry: 1, predict: 160 } }),
	)
	return {
		cache: join(base, 'cache'),
		model: MODELS.q2,
		key: 'q2',
		out: join(base, 'out'),
		live: true,
		url: fixture.url,
		scenario: join(base, 'scenario.json'),
		settings: join(base, 'settings.json'),
	}
}

function readField(value: unknown, key: string): unknown {
	return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
}

interface Outcome {
	readonly code: number | null
	readonly stdout: string
	readonly stderr: string
}

function runScript(args: readonly string[]): Promise<Outcome> {
	return new Promise((done, fail) => {
		const child = spawn(process.execPath, [SCRIPT, ...args], { cwd: HARNESS })
		const out: Buffer[] = []
		const err: Buffer[] = []
		child.stdout.on('data', (chunk: Buffer) => out.push(chunk))
		child.stderr.on('data', (chunk: Buffer) => err.push(chunk))
		child.on('error', fail)
		child.on('close', (code) =>
			done({
				code,
				stdout: Buffer.concat(out).toString('utf8'),
				stderr: Buffer.concat(err).toString('utf8'),
			}),
		)
	})
}

describe('parseFlags', () => {
	it('resolves the cache against the harness and the output against the working directory', () => {
		const outcome = parseFlags([
			'--cache',
			'tmp/l5/cache',
			'--model',
			MODELS.q2,
			'--out',
			'tmp/l5/calibrate',
		])
		assert.equal(outcome.success, true)
		if (!outcome.success) return
		assert.equal(outcome.value.cache, join(HARNESS, 'tmp', 'l5', 'cache'))
		assert.equal(outcome.value.out, resolve('tmp/l5/calibrate'))
		assert.equal(outcome.value.model, MODELS.q2)
		assert.equal(outcome.value.key, 'q2')
		assert.equal(outcome.value.live, false)
		assert.equal(outcome.value.url, DAEMON)
		assert.equal(outcome.value.scenario, SCENARIO_LONG)
		assert.equal(outcome.value.settings, join(HARNESS, 'bench5', 'settings.json'))
	})

	it('keeps an absolute cache and reads --live and --url', () => {
		const outcome = parseFlags([
			'--cache',
			directory,
			'--model',
			MODELS.g4,
			'--out',
			directory,
			'--live',
			'--url',
			'http://127.0.0.1:9',
		])
		assert.equal(outcome.success, true)
		if (!outcome.success) return
		assert.equal(outcome.value.cache, directory)
		assert.equal(outcome.value.key, 'g4')
		assert.equal(outcome.value.live, true)
		assert.equal(outcome.value.url, 'http://127.0.0.1:9')
	})

	it('refuses a missing flag, an unknown model, a bad URL, and an unknown flag', () => {
		const refused = [
			parseFlags([]),
			parseFlags(['--cache', 'c', '--out', 'o']),
			parseFlags(['--cache', 'c', '--model', 'llama:1b', '--out', 'o']),
			parseFlags(['--cache', 'c', '--model', MODELS.q2, '--out', 'o', '--url', 'not a url']),
			parseFlags(['--cache', 'c', '--model', MODELS.q2, '--out', 'o', '--copy', '1']),
		]
		for (const outcome of refused) {
			assert.equal(outcome.success, false)
			if (!outcome.success) assert.match(outcome.error, /usage: node bench5\/calibrate\.ts/)
		}
		const missing = parseFlags([])
		if (!missing.success) {
			assert.match(missing.error, /--cache is required/)
			assert.match(missing.error, /--out is required/)
			assert.match(missing.error, /--model must be one of/)
		}
	})

	it('exits 64 with the usage line when run without flags', async () => {
		const outcome = await runScript([])
		assert.equal(outcome.code, 64)
		assert.match(
			outcome.stderr,
			/usage: node bench5\/calibrate\.ts --cache DIR --model TAG --out DIR \[--live\] \[--url URL\]/,
		)
		assert.equal(outcome.stdout, '')
	})
})

describe('readScenario', () => {
	it('reads the topics, the days, the seed truth, and the distinct read points in ascending order', () => {
		assert.deepEqual(scenario.points, [4, 7])
		assert.deepEqual(
			scenario.topics.map((topic) => topic.name),
			['refunds', 'returns', 'delivery'],
		)
		assert.deepEqual(scenario.days, [
			{ date: '2026-10-08', from: 0 },
			{ date: '2026-10-09', from: 5 },
		])
		assert.equal(scenario.messages.length, 10)
		assert.deepEqual(scenario.messages[4], {
			index: 4,
			role: 'user',
			content: 'Marcus rotated the code. Use MX-4486 from now on.',
			category: 'correction',
			topics: ['refunds'],
			amends: [2],
			supersedes: [],
		})
		assert.deepEqual(scenario.messages[7]?.supersedes, [3])
	})

	it('reads the long scenario file', () => {
		const long = readScenario(readJSON(SCENARIO_LONG))
		assert.equal(long.messages.length, 152)
		assert.equal(long.topics.length, 6)
		assert.deepEqual(
			long.points,
			[47, 89, 95, 105, 111, 115, 123, 127, 132, 133, 137, 139, 143, 145, 149],
		)
	})

	it('throws on a scenario without topics, a seed, a read point, or a known role', () => {
		assert.throws(() => readScenario({}), /ledger\.topics/)
		assert.throws(() => readScenario({ ledger: { topics: {} }, seed: [], goals: [] }), /read point/)
		assert.throws(() => readScenario({ ledger: { topics: {} }, goals: [] }), /no seed/)
		assert.throws(
			() =>
				readScenario({
					ledger: { topics: {} },
					seed: [{ role: 'wizard', content: 'x' }],
					goals: [{ after: 0 }],
				}),
			/seed message 0/,
		)
	})
})

describe('selecting sources', () => {
	it('keeps the carriers that no earlier pair replaced and lists the replaced carriers apart', () => {
		const list = (topic: string, point: number): ReadonlyArray<readonly number[]> => {
			const selection = selectSources(scenario.messages, topic, point)
			return [
				selection.live.map((message) => message.index),
				selection.stale.map((message) => message.index),
			]
		}
		assert.deepEqual(list('refunds', 4), [[4], [2]])
		assert.deepEqual(list('returns', 4), [[3], []])
		assert.deepEqual(list('delivery', 4), [[], []])
		assert.deepEqual(list('refunds', 7), [[4, 6], [2]])
		assert.deepEqual(list('returns', 7), [[6, 7], [3]])
		assert.deepEqual(list('delivery', 7), [[5], []])
	})

	it('counts a pair of any category and ignores a pair after the read point', () => {
		const messages = readScenario({
			ledger: { topics: { refunds: 'r' } },
			goals: [{ after: 0 }],
			seed: [
				{ role: 'user', content: 'A.', truth: { category: 'fact', topics: ['refunds'] } },
				{ role: 'user', content: 'B.', truth: { category: 'fact', topics: ['refunds'] } },
				{
					role: 'user',
					content: 'C.',
					truth: { category: 'opinion', topics: [], supersedes: [0] },
				},
				{ role: 'user', content: 'D.', truth: { category: 'chatter', topics: ['refunds'] } },
				{
					role: 'user',
					content: 'E.',
					truth: { category: 'correction', topics: ['refunds'], amends: [1] },
				},
			],
		}).messages
		const live = (point: number): readonly number[] =>
			selectSources(messages, 'refunds', point).live.map((message) => message.index)
		assert.deepEqual(live(1), [0, 1])
		assert.deepEqual(live(2), [1])
		assert.deepEqual(live(3), [1])
		assert.deepEqual(live(4), [4])
	})

	it('finds the next decisive carrier after the read point', () => {
		assert.equal(findNext(scenario.messages, 'refunds', 4)?.index, 6)
		assert.equal(findNext(scenario.messages, 'refunds', 6)?.index, 8)
		assert.equal(findNext(scenario.messages, 'refunds', 8), undefined)
		assert.equal(findNext(scenario.messages, 'delivery', 5), undefined)
	})

	it('splits a message into sentence sources with its date', () => {
		const message = scenario.messages[4]
		assert.notEqual(message, undefined)
		if (message === undefined) return
		assert.deepEqual(buildSources(message, scenario.days), [
			{ id: 'm4', sentence: 0, role: 'user', text: 'Marcus rotated the code.', day: '2026-10-08' },
			{ id: 'm4', sentence: 1, role: 'user', text: 'Use MX-4486 from now on.', day: '2026-10-08' },
		])
		const later = scenario.messages[6]
		assert.equal(
			later === undefined ? '' : buildSources(later, scenario.days)[0]?.day,
			'2026-10-09',
		)
	})
})

describe('sampling', () => {
	it('repeats a seeded stream and keeps every draw in range', () => {
		const first = createRandom(SEED)
		const second = createRandom(SEED)
		const draws = Array.from({ length: 50 }, () => first())
		assert.deepEqual(
			draws,
			Array.from({ length: 50 }, () => second()),
		)
		assert.ok(draws.every((draw) => draw >= 0 && draw < 1))
		assert.notDeepEqual(draws, Array.from({ length: 50 }, createRandom(SEED + 1)))
	})

	it('picks from a list and draws nothing for an empty list', () => {
		const random = createRandom(SEED)
		const probe = createRandom(SEED)
		assert.equal(pickOne([], random), undefined)
		const list = ['a', 'b', 'c']
		assert.equal(pickOne(list, random), list[Math.floor(probe() * 3)])
	})
})

describe('values', () => {
	it('lists dates, ids, amounts, and numbers once, in order of first occurrence', () => {
		assert.deepEqual(
			extractValues('On 2026-10-08 code MX-4471 cost $1,200.50 for 15 items; MX-4471 again.'),
			['2026-10-08', 'MX-4471', '$1,200.50', '15'],
		)
		assert.deepEqual(extractValues('no values here'), [])
	})

	it('shapes ids, amounts, and numbers by character class', () => {
		assert.equal(computeShape('MX-4471'), computeShape('EX-2219'))
		assert.equal(computeShape('MX-4471'), 'AA-9999')
		assert.notEqual(computeShape('MX-4471'), computeShape('ESC-2219'))
		assert.equal(computeShape('$75'), '$99')
		assert.equal(computeShape('2026-10-08'), '9999-99-99')
	})

	it('replaces whole values only', () => {
		assert.equal(
			replaceValue('Code MX-4486 and 15, not 150 or MX-44860.', '15', '20'),
			'Code MX-4486 and 20, not 150 or MX-44860.',
		)
		assert.equal(
			replaceValue('Code MX-4486, again MX-4486.', 'MX-4486', 'MX-4471'),
			'Code MX-4471, again MX-4471.',
		)
	})
})

describe('swapping a value', () => {
	it('puts a stale value and a foreign value of the same shape in place of one value', () => {
		const swaps = buildSwaps(
			'Marcus rotated the code to MX-4486.',
			['Use MX-4486 from now on.'],
			['A refund over $200 needs MX-4471.'],
			['Ticket EX-2219 covers it.', 'The fee is 15 percent.'],
		)
		assert.deepEqual(swaps, [
			{
				variant: 'stale',
				from: 'MX-4486',
				to: 'MX-4471',
				prose: 'Marcus rotated the code to MX-4471.',
			},
			{
				variant: 'cross',
				from: 'MX-4486',
				to: 'EX-2219',
				prose: 'Marcus rotated the code to EX-2219.',
			},
		])
	})

	it('skips a replacement that a live source carries, a different shape, or a value the summary already holds', () => {
		assert.deepEqual(
			buildSwaps(
				'Code MX-4486.',
				['Use MX-4486; MX-4471 is dead.'],
				['MX-4471 was the old code.'],
				[],
			),
			[],
		)
		assert.deepEqual(
			buildSwaps('Code MX-4486.', ['Use MX-4486.'], ['Ticket ESC-2219.'], ['Pay $75.']),
			[],
		)
		assert.deepEqual(
			buildSwaps(
				'Codes MX-4486 and MX-4471.',
				['Use MX-4486 and MX-4471.'],
				['Old code MX-4471.'],
				[],
			),
			[],
		)
		assert.deepEqual(
			buildSwaps('Codes MX-4486 and MX-4471.', ['Use MX-4486.'], ['Old code MX-4471.'], []),
			[],
		)
		assert.deepEqual(buildSwaps('No values.', [], ['MX-4471'], ['EX-2219']), [])
	})

	it('replaces the first value of the summary that has a replacement', () => {
		const swaps = buildSwaps(
			'Pay $75 on MX-4486.',
			['Use MX-4486 and $75.'],
			['Old MX-4471.', 'Old $20.'],
			[],
		)
		assert.deepEqual(swaps, [
			{ variant: 'stale', from: '$75', to: '$20', prose: 'Pay $20 on MX-4486.' },
		])
	})
})

describe('building items', () => {
	const prose = PROSE.refunds
	const summary = buildSummary('refunds', 4, prose)

	it('labels the CHANGE items from the next carrier, a foreign message, and a repeated source', () => {
		const items = buildItems(summary, scenario, createRandom(SEED)).filter(
			(item) => item.head === CHANGE_HEAD,
		)
		assert.deepEqual(
			items.map((item) => [item.variant, item.label]),
			[
				['next', true],
				['foreign', false],
				['repeat', false],
			],
		)
		const [next, foreign, repeat] = items
		assert.deepEqual(next?.events, [6])
		assert.ok(
			[5, 7, 9].includes(foreign?.events[0] ?? -1),
			'a foreign draw is a later decisive message without the topic',
		)
		assert.deepEqual(repeat?.events, [4])
		assert.equal(next?.id, '["change","m6","refunds",4]')
		assert.equal(
			next?.state,
			'Summary of refunds as of 2026-10-08: Marcus rotated the code to MX-4486.\nEvent: user: Order LH-5001 is a $75 case and needs MX-4486.',
		)
		assert.equal(
			repeat?.state,
			'Summary of refunds as of 2026-10-08: Marcus rotated the code to MX-4486.\nEvent: user: Marcus rotated the code. Use MX-4486 from now on.',
		)
		assert.deepEqual(next?.question, buildChangeQuestion('refunds'))
		for (const item of items) assert.equal(item.swap, undefined)
	})

	it('labels the AGREE items from the summary and its swaps', () => {
		const items = buildItems(summary, scenario, createRandom(SEED)).filter(
			(item) => item.head === AGREE_HEAD,
		)
		assert.deepEqual(
			items.map((item) => [item.variant, item.label, item.swap]),
			[
				['summary', true, undefined],
				['stale', false, 'MX-4486 -> MX-4471'],
				['cross', false, 'MX-4486 -> EX-2219'],
			],
		)
		const evidence = [
			'(2026-10-08) user: Marcus rotated the code.',
			'(2026-10-08) user: Use MX-4486 from now on.',
		]
		assert.equal(items[0]?.state, JSON.stringify({ evidence, candidate: prose }, null, 1))
		assert.equal(
			items[1]?.state,
			JSON.stringify({ evidence, candidate: 'Marcus rotated the code to MX-4471.' }, null, 1),
		)
		assert.equal(
			items[2]?.state,
			JSON.stringify({ evidence, candidate: 'Marcus rotated the code to EX-2219.' }, null, 1),
		)
		assert.equal(items[1]?.id, '["agree","refunds",4,"stale"]')
		assert.deepEqual(items[0]?.question, AGREE_QUESTION)
		assert.equal(items[0]?.state, buildAgreeState({ prose }, summary.sources))
	})

	it('builds the same items from the same seed and draws nothing when no CHANGE item can exist', () => {
		assert.deepEqual(
			buildItems(summary, scenario, createRandom(SEED)),
			buildItems(summary, scenario, createRandom(SEED)),
		)
		let draws = 0
		const counting = (): number => {
			draws += 1
			return 0
		}
		const last = { ...summary, after: 9, live: [9] }
		const items = buildItems(last, scenario, counting)
		assert.equal(items.filter((item) => item.head === CHANGE_HEAD).length, 0)
		assert.equal(draws, 0)
		assert.ok(items.some((item) => item.head === AGREE_HEAD && item.label))
	})

	it('builds one AGREE item for a summary without values and draws one negative per kind that has a pool', () => {
		const plain = buildItems(
			buildSummary('returns', 7, PROSE.returns),
			scenario,
			createRandom(SEED),
		)
		assert.deepEqual(
			plain.map((item) => `${item.head}:${item.variant}:${item.label}`),
			['change:next:true', 'change:foreign:false', 'change:repeat:false', 'agree:summary:true'],
		)
		const [next, foreign, repeat] = plain
		assert.deepEqual(next?.events, [9])
		assert.deepEqual(foreign?.events, [8])
		assert.ok([6, 7].includes(repeat?.events[0] ?? -1))
		assert.equal(
			next?.state,
			buildChangeState({ title: 'returns', asOf: '2026-10-09', prose: PROSE.returns }, [
				{
					id: 'm9',
					sentence: 0,
					role: 'user',
					text: 'Wholesale items come back by pallet slot on Friday.',
					day: '2026-10-09',
				},
			]),
		)
	})
})

describe('fitting a cutoff', () => {
	it('takes the lowest value above 0.5 that gives no yes on the negatives', () => {
		assert.deepEqual(fitCutoff([0.9, 0.8], [0.2, 0.55, 0.4]), { cutoff: 0.56, separated: true })
		assert.deepEqual(fitCutoff([0.9], [0.5, 0.3]), { cutoff: 0.51, separated: true })
		assert.deepEqual(fitCutoff([0.9], [0.56]), { cutoff: 0.57, separated: true })
		assert.deepEqual(fitCutoff([0.9], [0.995]), { cutoff: 1, separated: true })
		assert.deepEqual(fitCutoff([0.9], [0.1, 0.04]), { cutoff: 0.51, separated: true })
	})

	it('counts an answer at the cutoff as a yes', () => {
		assert.deepEqual(fitCutoff([0.9], [0.6]), { cutoff: 0.61, separated: true })
		assert.deepEqual(fitCutoff([0.9], [0.7]), { cutoff: 0.71, separated: true })
	})

	it('takes the best balanced accuracy, lowest on a tie, and reports unseparated when a negative reaches 1', () => {
		assert.deepEqual(fitCutoff([0.9, 0.8, 0.7], [0.6, 1]), { cutoff: 0.61, separated: false })
		assert.deepEqual(fitCutoff([0.9, 0.7], [1, 0.2]), { cutoff: 0.51, separated: false })
		assert.deepEqual(fitCutoff([0.55, 0.55], [1, 1]), { cutoff: 0.51, separated: false })
	})

	it('reports unseparated when a list is empty', () => {
		assert.deepEqual(fitCutoff([0.9], []), { cutoff: 0.51, separated: false })
		assert.deepEqual(fitCutoff([], [0.3]), { cutoff: 0.51, separated: false })
		assert.deepEqual(fitCutoff([], []), { cutoff: 0.51, separated: false })
	})
})

describe('counting items', () => {
	it('refuses a separating scalar-only historical AGREE fit', () => {
		const fit = fitAsked(
			[
				buildAsked(CHANGE_HEAD, true, 0.9),
				buildAsked(CHANGE_HEAD, false, 0.2),
				buildAsked(AGREE_HEAD, true, 0.9),
				buildAsked(AGREE_HEAD, false, 0.2),
			],
			{ asked: 1, passed: 1, failed: 0 },
		)
		assert.equal(fit.separated, false)
		assert.equal(fit.counts.agree.separated, false)
	})
	it('tallies positives, negatives, and the answers at the cutoff', () => {
		const asked = [
			buildAsked(CHANGE_HEAD, true, 0.9, 'answered', true),
			buildAsked(CHANGE_HEAD, true, 0.5),
			buildAsked(CHANGE_HEAD, false, 0.6),
			buildAsked(CHANGE_HEAD, false, 0.2, 'answered', true),
			buildAsked(CHANGE_HEAD, true, undefined, 'refused'),
			buildAsked(CHANGE_HEAD, false, undefined, 'failed', true),
		]
		assert.deepEqual(countTally(asked, 0.6, false), {
			positives: 2,
			negatives: 2,
			refused: 1,
			failed: 1,
			cached: 2,
			recalled: 1,
			leaked: 1,
			separated: false,
		})
	})

	it('fits both heads and combines their flags', () => {
		const asked = [
			buildAsked(CHANGE_HEAD, true, 0.9),
			buildAsked(CHANGE_HEAD, false, 0.4),
			buildAsked(AGREE_HEAD, true, 0.9),
			buildAsked(AGREE_HEAD, false, 0.7),
			buildAsked(AGREE_HEAD, false, 1),
		]
		const fit = fitAsked(asked, { asked: 3, passed: 2, failed: 1 })
		assert.equal(fit.change, 0.51)
		// The negative at 1 never separates, so the cutoff sits above the other negative, where one of two negatives is rejected and the positive is kept.
		assert.equal(fit.agree, 0.71)
		assert.equal(fit.separated, false)
		assert.deepEqual(fit.counts.summaries, { asked: 3, passed: 2, failed: 1 })
		assert.equal(fit.counts.change.separated, true)
		assert.equal(fit.counts.agree.separated, false)
		assert.equal(fit.counts.agree.leaked, 1)
		assert.equal(fit.counts.agree.recalled, 1)
	})
})

describe('Calibrator', () => {
	// The fixture scenario asks 12 CHANGE items and 8 AGREE items over 4 passing summaries, and the delivery summary fails every attempt.
	const COUNTS = { change: 12, agree: 8 }

	function answerSeparated(item: CalibrateItem): number {
		if (item.head === CHANGE_HEAD) return item.label ? 0.9 : item.variant === 'repeat' ? 0.55 : 0.2
		if (item.label) return 0.95
		return item.variant === 'cross' && item.topic === 'refunds' && item.after === 7 ? 0.8 : 0.3
	}

	function answerLeaky(item: CalibrateItem): number {
		if (item.head === CHANGE_HEAD) return answerSeparated(item)
		if (item.label) return 0.95
		return item.variant === 'cross' && item.topic === 'refunds' && item.after === 7 ? 1 : 0.3
	}

	function readOutput(config: CalibrateConfig): unknown {
		return readJSON(join(config.out, 'fit.json'))
	}

	it('asks the planned items of the scenario', () => {
		const items = planItems()
		assert.equal(items.filter((item) => item.head === CHANGE_HEAD).length, COUNTS.change)
		assert.equal(items.filter((item) => item.head === AGREE_HEAD).length, COUNTS.agree)
		assert.equal(
			new Set(items.map((item) => item.state + item.head + item.label)).size,
			items.length,
		)
	})

	it('writes the hand-computed cutoffs and counts from live summaries and cached judge answers', async () => {
		const config = prepareRun()
		const items = planItems()
		writeCache(join(config.cache, 'judge.jsonl'), items, answerSeparated)
		const initialRequests = fixture.requests.length
		const code = await new Calibrator(config).execute()
		assert.equal(code, 0)
		const fit = readOutput(config)
		assert.equal(readField(fit, 'change'), 0.56)
		assert.equal(readField(fit, 'agree'), 0.81)
		assert.equal(readField(fit, 'separated'), true)
		assert.deepEqual(readFit(join(config.out, 'fit.json')), {
			change: 0.56,
			agree: 0.81,
			separated: true,
		})
		assert.deepEqual(readField(fit, 'counts'), {
			summaries: { asked: 5, passed: 4, failed: 1 },
			change: {
				positives: 4,
				negatives: 8,
				refused: 0,
				failed: 0,
				cached: COUNTS.change,
				recalled: 4,
				leaked: 0,
				separated: true,
			},
			agree: {
				positives: 4,
				negatives: 4,
				refused: 0,
				failed: 0,
				cached: COUNTS.agree,
				recalled: 4,
				leaked: 0,
				separated: true,
			},
		})
		// Four passing summaries cost one request each, and the failing delivery summary costs the first attempt plus the one retry.
		const sent = fixture.requests.slice(initialRequests)
		assert.equal(sent.length, 6)
		const retried = sent.filter((body) => JSON.stringify(body).includes('failed these checks'))
		assert.equal(retried.length, 1)
		const rows = readRows(join(config.out, 'items.jsonl'))
		assert.deepEqual(
			rows.map((row) => readField(row, 'id')),
			items.map((item) => item.id),
		)
		assert.equal(readField(rows[0], 'noul'), 0.9)
		assert.equal(readField(rows[0], 'outcome'), 'answered')
		assert.equal(readField(rows[0], 'cached'), true)
		assert.equal(readField(rows[0], 'label'), true)
		assert.equal(readField(rows[0], 'head'), 'change')
		assert.deepEqual(readField(rows[0], 'events'), [6])
		const swapped = rows.find((row) => readField(row, 'variant') === 'stale')
		assert.equal(readField(swapped, 'swap'), 'MX-4486 -> MX-4471')
	})

	it('reports unseparated and the best balanced cutoff when a negative reaches 1', async () => {
		const config = prepareRun()
		writeCache(join(config.cache, 'judge.jsonl'), planItems(), answerLeaky)
		assert.equal(await new Calibrator(config).execute(), 0)
		const fit = readOutput(config)
		assert.equal(readField(fit, 'change'), 0.56)
		assert.equal(readField(fit, 'agree'), 0.51)
		assert.equal(readField(fit, 'separated'), false)
		const counts = readField(fit, 'counts')
		assert.deepEqual(readField(readField(counts, 'agree'), 'leaked'), 1)
		assert.equal(readField(readField(counts, 'agree'), 'separated'), false)
		assert.equal(readField(readField(counts, 'change'), 'separated'), true)
	})

	it('repeats the fit offline from the rows the live run wrote, with no request', async () => {
		const config = prepareRun()
		writeCache(join(config.cache, 'judge.jsonl'), planItems(), answerSeparated)
		await new Calibrator(config).execute()
		const live = readOutput(config)
		const count = fixture.requests.length
		const offline: CalibrateConfig = {
			...config,
			live: false,
			out: join(config.out, '..', 'offline'),
		}
		assert.equal(await new Calibrator(offline).execute(), 0)
		assert.equal(fixture.requests.length, count)
		assert.deepEqual(readOutput(offline), live)
		assert.equal(readRows(join(config.cache, 'judge.jsonl')).length, 28)
	})

	it('throws on an offline summary miss and on an offline judge miss, and writes no fit', async () => {
		const bare = prepareRun()
		const count = fixture.requests.length
		await assert.rejects(new Calibrator({ ...bare, live: false }).execute(), /summary cache miss/)
		assert.equal(existsSync(join(bare.out, 'fit.json')), false)
		assert.equal(fixture.requests.length, count)
		const warm = prepareRun()
		writeCache(join(warm.cache, 'judge.jsonl'), planItems(), answerSeparated)
		await new Calibrator(warm).execute()
		rmSync(join(warm.cache, 'judge.jsonl'))
		const cold: CalibrateConfig = { ...warm, live: false, out: join(warm.out, '..', 'cold') }
		await assert.rejects(new Calibrator(cold).execute(), /judge cache miss/)
		assert.equal(existsSync(join(cold.out, 'fit.json')), false)
	})

	it('throws a harness fault when a live judge miss fails every retry', async () => {
		const config = prepareRun()
		await assert.rejects(
			new Calibrator(config).execute(),
			/harness fault: the judge failed 2 times/,
		)
		assert.equal(existsSync(join(config.out, 'fit.json')), false)
	})

	it('draws the same negatives on a rerun', async () => {
		const first = prepareRun()
		const second = prepareRun()
		writeCache(join(first.cache, 'judge.jsonl'), planItems(), answerSeparated)
		writeCache(join(second.cache, 'judge.jsonl'), planItems(), answerSeparated)
		await new Calibrator(first).execute()
		await new Calibrator(second).execute()
		const events = (config: CalibrateConfig): readonly unknown[] =>
			readRows(join(config.out, 'items.jsonl')).map((row) => readField(row, 'events'))
		assert.deepEqual(events(first), events(second))
	})
})
