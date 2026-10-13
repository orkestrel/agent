import { BUILD } from '../constants.js'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { JudgeAnswer, JudgeQuestion } from '../../vendor/agent-0.0.30-trimmed/index.js'
import type {
	AggregateMaintenance,
	AggregateRow,
	CacheRow,
	ShadowItem,
	ShadowTruth,
} from '../types.js'
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { LEDGER_QUESTIONS } from '../../vendor/agent-0.0.30-trimmed/index.js'
import { createOllamaJudge } from '../../vendor/ollama/index.js'
import {
	FIT,
	HARNESS,
	MICA_CALIBRATION,
	MICA_CONTEXT,
	MICA_MODEL,
	MICA_SYSTEM,
	MODELS,
	TIMEOUT,
} from '../constants.js'
import {
	buildCacheKey,
	buildCategoryQuestion,
	buildTopicQuestion,
	readJSON,
	readRows,
} from '../helpers.js'
import {
	Shadow,
	buildPairKey,
	buildTimeline,
	parseAggregates,
	computeRate,
	computeRates,
	countFlips,
	findSnapshot,
	formatRate,
	parseFlags,
	readTruth,
	readVerdict,
	renderShadow,
} from '../shadow.js'

const SCRIPT = join(BUILD, 'bench5', 'shadow.js')
const directory = mkdtempSync(join(tmpdir(), 'bench5-shadow-'))
const blocker = join(directory, 'blocker.ts')
const copies = join(directory, 'copies')
const run = join(directory, 'run')
const cache = join(directory, 'cache')
const fetched: string[] = []
const originalFetch = globalThis.fetch
globalThis.fetch = async (input) => {
	fetched.push(String(input instanceof Request ? input.url : input))
	throw new Error('fetch is blocked in this proof')
}
const closers: Array<() => Promise<void>> = []
let outputs = 0

const MODEL = MODELS.q2
// The cache keys carry the judge's identity, which the vendored judge derives from its options; the driver and the shadow build it the same way.
const JUDGE = createOllamaJudge({
	url: 'http://127.0.0.1:11434',
	model: MICA_MODEL,
	system: MICA_SYSTEM,
	calibration: { temperature: MICA_CALIBRATION },
	options: { num_ctx: MICA_CONTEXT },
	keepAlive: '5m',
	timeout: TIMEOUT,
	fetch: () => Promise.reject(new Error('the identity probe sends nothing')),
}).model
const CATEGORY = buildCategoryQuestion(LEDGER_QUESTIONS)
const OWNER = 'Halvorsen Studio uses refund code MX-1000.'
const REFUNDS_FIRST = 'Refunds over 100 need code MX-1000.'
const REFUNDS_SECOND = 'Refund code is MX-2000.'
const ESCALATIONS = 'Marcus covers escalations.'

interface Seed {
	readonly role: 'user' | 'assistant' | 'tool'
	readonly content: string
	readonly category: string
	readonly amends?: readonly number[]
	readonly supersedes?: readonly number[]
	readonly calls?: ReadonlyArray<{
		readonly id: string
		readonly name: string
		readonly arguments: Readonly<Record<string, string>>
	}>
	readonly call?: string
}

// The seed has the shape of the long scenario's first read point: indices 0 to 3 precede the first request, and a tool group sits among them. Message 3 sits at the first read point, so the shadow leaves it out.
const SEED: readonly Seed[] = [
	{ role: 'user', content: 'Morning, I am Dana on the Larkspur desk.', category: 'fact' },
	{
		role: 'assistant',
		content: '',
		category: 'chatter',
		calls: [{ id: 'c1', name: 'lookup_order', arguments: { id: 'LH-5001' } }],
	},
	{
		role: 'tool',
		content: 'Order LH-5001: account AC-77 (Halvorsen Studio), shipped Tuesday.',
		category: 'fact',
		call: 'c1',
	},
	// The amends mark stands in for a pair whose later message is the first read point's last message; the shadow leaves it out.
	{
		role: 'user',
		content: 'Halvorsen asked for refund code MX-1000 on orders over 100.',
		category: 'fact',
		amends: [0],
	},
	{ role: 'user', content: 'Thanks, that is all for now.', category: 'chatter' },
	{
		role: 'user',
		content: 'Correction: the refund code is MX-2000, not MX-1000.',
		category: 'correction',
		amends: [3],
	},
	{ role: 'user', content: 'Lunch is at noon today.', category: 'distractor' },
	{
		role: 'user',
		content: 'Correction: refund code MX-3000, and forget the lunch plan.',
		category: 'correction',
		supersedes: [5, 6],
	},
	{ role: 'user', content: 'I think we should be friendlier.', category: 'opinion' },
]
const REQUESTS = Object.freeze({
	q1: 'Where is order LH-5001?',
	q2: 'Which code do refunds need?',
	q3: 'Any delivery news today?',
})
const AFTER = Object.freeze({ g01: 3, g02: 5, g03: 8 })

// Lists the conversation as the driver adds it: each goal's seed messages, then its request.
const ORDER: readonly string[] = [
	's0',
	's1',
	's2',
	's3',
	'q1',
	's4',
	's5',
	'q2',
	's6',
	's7',
	's8',
	'q3',
]

function readField(value: unknown, key: string): unknown {
	return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
}

function readCount(value: unknown, key: string): number {
	const field = readField(value, key)
	assert.equal(typeof field, 'number', key)
	return Number(field)
}

function readContent(id: string): string {
	if (id in REQUESTS) return String(Reflect.get(REQUESTS, id))
	return SEED[Number(id.slice(1))]?.content ?? ''
}

function renderState(id: string): string {
	return `user: ${readContent(id)}`
}

function renderPair(earlier: string, later: string): string {
	return `Earlier message: ${renderState(earlier)}\nLater message: ${renderState(later)}`
}

function writeRows(path: string, rows: readonly unknown[]): void {
	writeFileSync(path, rows.map((row) => `${JSON.stringify(row)}\n`).join(''))
}

function buildChoice(probabilities: Readonly<Record<string, number>>): JudgeAnswer {
	return { form: 'choice', probabilities }
}

function buildNoul(value: number): JudgeAnswer {
	return { form: 'noul', noul: value }
}

function cacheRow(state: string, question: JudgeQuestion, answer: JudgeAnswer): CacheRow {
	return {
		key: buildCacheKey(JUDGE, state, question),
		model: JUDGE,
		state,
		question,
		answer,
		wall: 1,
		origin: 'live',
		at: 1,
	}
}

function buildJudgment(
	id: readonly string[],
	question: JudgeQuestion,
	state: string,
	answer: JudgeAnswer,
): unknown {
	return {
		id: JSON.stringify(id),
		question,
		answer,
		model: JUDGE,
		sources: id.slice(1),
		state,
		time: 1,
	}
}

function buildAggregate(
	topic: string,
	title: string,
	lastSeed: number,
	event: AggregateRow['event'],
	status: AggregateRow['status'],
	prose: string | undefined,
): AggregateRow {
	return {
		topic,
		prior: undefined,
		projection: [],
		result:
			status === 'current' && (event === 'build' || event === 'keep')
				? {
						version: 1,
						goal: `g0${lastSeed}`,
						point: lastSeed,
						sources: [
							{ id: 's0', sentence: 0, role: 'user', text: 'Recorded source.', day: '2026-10-08' },
						],
					}
				: undefined,
		title,
		goal: `g0${lastSeed}`,
		lastSeed,
		event,
		version: 1,
		status,
		sources: [],
		ids: undefined,
		prose,
		raw: undefined,
		trigger: undefined,
		answers: {},
		failures: [],
		wall: 0,
		cached: false,
	}
}

function completeMaintenance(lastSeed: number): AggregateMaintenance {
	return { event: 'maintenance', goal: `g0${lastSeed}`, lastSeed, status: 'complete' }
}

function buildTopicJudgment(id: string, name: string, value: number): unknown {
	const question = buildTopicQuestion({ name, criterion: `${name} things` }, LEDGER_QUESTIONS)
	return buildJudgment(['topic', id, name], question, renderState(id), buildNoul(value))
}

function renderBlock(...lines: readonly string[]): string {
	return ['Topic summaries:', ...lines].join('\n')
}

function writeFixture(): void {
	mkdirSync(copies, { recursive: true })
	mkdirSync(run, { recursive: true })
	mkdirSync(cache, { recursive: true })
	writeFileSync(
		join(copies, 'v1.json'),
		JSON.stringify({
			seed: SEED.map((one) => ({
				role: one.role,
				content: one.content,
				truth: {
					category: one.category,
					topics: [],
					...(one.amends === undefined ? {} : { amends: one.amends }),
					...(one.supersedes === undefined ? {} : { supersedes: one.supersedes }),
				},
			})),
			goals: Object.entries(AFTER).map(([id, point]) => ({ id, after: point })),
		}),
	)
	writeFileSync(
		join(run, 'run.json'),
		JSON.stringify({ status: 'complete', mode: 'run', copy: 1, model: MODEL, arm: 'aggregate' }),
	)
	writeRows(
		join(run, 'messages.jsonl'),
		ORDER.map((id) => {
			const seed = id.startsWith('s') ? SEED[Number(id.slice(1))] : undefined
			return {
				id,
				index: seed === undefined ? undefined : Number(id.slice(1)),
				role: seed?.role ?? 'user',
				content: readContent(id),
				...(seed?.calls === undefined ? {} : { calls: seed.calls }),
				...(seed?.call === undefined ? {} : { call: seed.call }),
				goal: id.startsWith('q') ? `g0${id.slice(1)}` : undefined,
				request: id.startsWith('q'),
			}
		}),
	)
	writeRows(join(run, 'judgments.jsonl'), [
		buildJudgment(['category', 's0'], CATEGORY, renderState('s0'), buildChoice({ fact: 0.9 })),
		buildJudgment(
			['category', 's3'],
			CATEGORY,
			renderState('s3'),
			buildChoice({ fact: 0.9, rule: 0.1 }),
		),
		buildJudgment(
			['category', 's4'],
			CATEGORY,
			renderState('s4'),
			buildChoice({ chatter: 0.8, fact: 0.2 }),
		),
		buildJudgment(
			['category', 's5'],
			CATEGORY,
			renderState('s5'),
			buildChoice({ correction: 0.8, fact: 0.2 }),
		),
		buildJudgment(
			['category', 's6'],
			CATEGORY,
			renderState('s6'),
			buildChoice({ distractor: 0.75, fact: 0.25 }),
		),
		buildJudgment(
			['category', 's7'],
			CATEGORY,
			renderState('s7'),
			buildChoice({ correction: 0.9, rule: 0.1 }),
		),
		buildJudgment(
			['category', 's8'],
			CATEGORY,
			renderState('s8'),
			buildChoice({ opinion: 0.9, chatter: 0.1 }),
		),
		buildTopicJudgment('s3', 'refunds', 0.9),
		buildTopicJudgment('s3', 'escalations', 0.2),
		buildTopicJudgment('s5', 'refunds', 0.8),
		buildTopicJudgment('s6', 'delivery', 0.7),
		buildTopicJudgment('s7', 'refunds', 0.9),
		buildTopicJudgment('s8', 'escalations', 0.7),
		buildTopicJudgment('q1', 'escalations', 0.8),
		buildTopicJudgment('q2', 'refunds', 0.9),
		buildTopicJudgment('q3', 'delivery', 0.8),
		buildJudgment(
			['amends', 's3', 's5'],
			LEDGER_QUESTIONS.amends,
			renderPair('s3', 's5'),
			buildNoul(0.9),
		),
		buildJudgment(
			['amends', 's4', 's5'],
			LEDGER_QUESTIONS.amends,
			renderPair('s4', 's5'),
			buildNoul(0.2),
		),
		buildJudgment(
			['amends', 'q1', 's5'],
			LEDGER_QUESTIONS.amends,
			renderPair('q1', 's5'),
			buildNoul(0.1),
		),
		buildJudgment(
			['amends', 's5', 's7'],
			LEDGER_QUESTIONS.amends,
			renderPair('s5', 's7'),
			buildNoul(0.9),
		),
		buildJudgment(
			['amends', 's3', 's7'],
			LEDGER_QUESTIONS.amends,
			renderPair('s3', 's7'),
			buildNoul(0.3),
		),
		buildJudgment(
			['supersedes', 's5', 's7'],
			LEDGER_QUESTIONS.supersedes,
			renderPair('s5', 's7'),
			buildNoul(0.97),
		),
		buildJudgment(
			['supersedes', 's3', 's5'],
			LEDGER_QUESTIONS.supersedes,
			renderPair('s3', 's5'),
			buildNoul(0.4),
		),
	])
	writeRows(join(run, 'aggregates.jsonl'), [
		buildAggregate('owner:AC-77', 'Halvorsen Studio', 3, 'build', 'current', OWNER),
		buildAggregate('refunds', 'refunds', 3, 'build', 'current', REFUNDS_FIRST),
		buildAggregate('escalations', 'escalations', 3, 'build', 'current', ESCALATIONS),
		completeMaintenance(3),
		buildAggregate('refunds', 'refunds', 5, 'change', 'current', undefined),
		buildAggregate('refunds', 'refunds', 5, 'build', 'stale', 'Refund code is MX-9999.'),
		buildAggregate('refunds', 'refunds', 5, 'agree', 'current', undefined),
		buildAggregate('refunds', 'refunds', 5, 'build', 'current', REFUNDS_SECOND),
		buildAggregate('escalations', 'escalations', 5, 'withhold', 'withheld', undefined),
		buildAggregate('owner:AC-77', 'Halvorsen Studio', 5, 'keep', 'current', OWNER),
		completeMaintenance(5),
		buildAggregate('refunds', 'refunds', 8, 'build', 'current', 'Refund code is MX-3000.'),
		completeMaintenance(8),
	])
	const states: ReadonlyArray<readonly [string, JudgeQuestion, JudgeAnswer]> = [
		[
			`${renderBlock(`refunds: ${REFUNDS_FIRST}`)}\n\nMessage: ${renderState('s4')}`,
			CATEGORY,
			buildChoice({ chatter: 0.4, fact: 0.5, rule: 0.1 }),
		],
		[
			`${renderBlock(`refunds: ${REFUNDS_FIRST}`)}\n\nMessage: ${renderState('s5')}`,
			CATEGORY,
			buildChoice({ chatter: 0.7, correction: 0.3 }),
		],
		[
			`${renderBlock(`refunds: ${REFUNDS_SECOND}`)}\n\nMessage: ${renderState('s7')}`,
			CATEGORY,
			buildChoice({ correction: 0.9, rule: 0.1 }),
		],
		[
			`${renderBlock(`Halvorsen Studio: ${OWNER}`, `refunds: ${REFUNDS_FIRST}`)}\n\n${renderPair('s3', 's5')}`,
			LEDGER_QUESTIONS.amends,
			buildNoul(0.9),
		],
		[
			`${renderBlock(`refunds: ${REFUNDS_FIRST}`)}\n\n${renderPair('s4', 's5')}`,
			LEDGER_QUESTIONS.amends,
			buildNoul(0.8),
		],
		[
			`${renderBlock(`Halvorsen Studio: ${OWNER}`, `escalations: ${ESCALATIONS}`, `refunds: ${REFUNDS_FIRST}`)}\n\n${renderPair('q1', 's5')}`,
			LEDGER_QUESTIONS.amends,
			buildNoul(0.1),
		],
		[
			`${renderBlock(`refunds: ${REFUNDS_SECOND}`)}\n\n${renderPair('s5', 's7')}`,
			LEDGER_QUESTIONS.amends,
			buildNoul(0.9),
		],
		[
			`${renderBlock(`refunds: ${REFUNDS_SECOND}`)}\n\n${renderPair('s5', 's7')}`,
			LEDGER_QUESTIONS.supersedes,
			buildNoul(0.5),
		],
		[
			`${renderBlock(`Halvorsen Studio: ${OWNER}`, `refunds: ${REFUNDS_FIRST}`)}\n\n${renderPair('s3', 's5')}`,
			LEDGER_QUESTIONS.supersedes,
			buildNoul(0.4),
		],
	]
	writeRows(
		join(cache, 'judge.jsonl'),
		states.map(([state, question, answer]) => cacheRow(state, question, answer)),
	)
}

interface Outcome {
	readonly code: number | null
	readonly stdout: string
	readonly stderr: string
}

function runScript(args: readonly string[]): Promise<Outcome> {
	return new Promise((resolve, reject) => {
		const child = spawn(
			process.execPath,
			['--import', pathToFileURL(blocker).href, SCRIPT, ...args],
			{ cwd: HARNESS },
		)
		const out: Buffer[] = []
		const err: Buffer[] = []
		child.stdout.on('data', (chunk: Buffer) => out.push(chunk))
		child.stderr.on('data', (chunk: Buffer) => err.push(chunk))
		child.on('error', reject)
		child.on('close', (code) =>
			resolve({
				code,
				stdout: Buffer.concat(out).toString('utf8'),
				stderr: Buffer.concat(err).toString('utf8'),
			}),
		)
	})
}

function pickPath(name: string): string {
	outputs += 1
	return join(directory, `${name}-${outputs}.json`)
}

function readBody(request: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = []
		request.on('data', (chunk: Buffer) => chunks.push(chunk))
		request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
		request.on('error', reject)
	})
}

// Serves the judge's generate path with a Yes on every noul question, and records each prompt it receives.
function startJudge(prompts: string[]): Promise<Server> {
	const server = createServer((request: IncomingMessage, response: ServerResponse) => {
		readBody(request)
			.then((text) => {
				const prompt: unknown = readField(JSON.parse(text), 'prompt')
				prompts.push(String(prompt))
				response.writeHead(200, { 'content-type': 'application/json' })
				response.end(
					JSON.stringify({
						model: 'stub',
						done: true,
						done_reason: 'stop',
						response: 'Yes',
						prompt_eval_count: 100,
						eval_count: 1,
						logprobs: [
							{
								token: 'Yes',
								logprob: -0.05,
								top_logprobs: [
									{ token: 'Yes', logprob: -0.05 },
									{ token: 'No', logprob: -6 },
								],
							},
						],
					}),
				)
			})
			.catch((error: unknown) => {
				response.writeHead(500, { 'content-type': 'application/json' })
				response.end(JSON.stringify({ error: String(error) }))
			})
	})
	return new Promise((resolve, reject) => {
		server.once('error', reject)
		server.listen(0, '127.0.0.1', () => resolve(server))
	})
}

function findItem(items: readonly unknown[], id: readonly string[]): unknown {
	const found = items.find((item) => readField(item, 'id') === JSON.stringify(id))
	assert.ok(found !== undefined, JSON.stringify(id))
	return found
}

before(() => {
	writeFileSync(
		blocker,
		[
			'const original = globalThis.fetch',
			'globalThis.fetch = (input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {',
			"\tconst href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url",
			'\tif (/:11434\\b/.test(href)) return Promise.reject(new Error(`blocked daemon request ${href}`))',
			'\treturn original(input, init)',
			'}',
			'',
		].join('\n'),
	)
	writeFixture()
})

after(async () => {
	globalThis.fetch = originalFetch
	for (const close of closers) await close()
	rmSync(directory, { recursive: true, force: true })
})

function buildItem(
	head: ShadowItem['head'],
	seeds: ReadonlyArray<number | undefined>,
	plain: boolean | undefined,
	shadow: boolean | undefined,
): ShadowItem {
	return {
		id: JSON.stringify([head, ...seeds]),
		head,
		seeds,
		point: 9,
		topics: [],
		absent: [],
		state: '',
		outcome: 'asked',
		plain,
		shadow,
	}
}

describe('shadow', () => {
	describe('helpers', () => {
		it('excludes unmaintained topics at each completed boundary', () => {
			const rows = [
				buildAggregate('a', 'A', 2, 'build', 'current', 'first'),
				buildAggregate('b', 'B', 2, 'build', 'current', 'kept'),
				completeMaintenance(2),
				buildAggregate('a', 'A', 5, 'agree', 'current', undefined),
				buildAggregate('b', 'B', 5, 'withhold', 'withheld', undefined),
				completeMaintenance(5),
				buildAggregate('a', 'A', 8, 'build', 'current', 'second'),
				completeMaintenance(8),
			]
			const timeline = buildTimeline(rows)
			assert.deepEqual(
				timeline.map((one) => [
					one.seed,
					[...one.topics].map(([key, entry]) => `${key}=${entry.prose}`),
				]),
				[
					[2, ['a=first', 'b=kept']],
					[5, []],
					[8, ['a=second']],
				],
			)
			assert.deepEqual(buildTimeline([]), [])
		})

		it('finds the latest snapshot strictly before a message', () => {
			const timeline = buildTimeline([
				buildAggregate('a', 'A', 2, 'build', 'current', 'one'),
				completeMaintenance(2),
				buildAggregate('a', 'A', 5, 'build', 'current', 'two'),
				completeMaintenance(5),
			])
			assert.equal(findSnapshot(timeline, 2), undefined)
			assert.equal(findSnapshot(timeline, 3)?.seed, 2)
			assert.equal(findSnapshot(timeline, 5)?.seed, 2)
			assert.equal(findSnapshot(timeline, 6)?.seed, 5)
			assert.equal(findSnapshot([], 6), undefined)
		})

		it('requires exact source custody and completion and removes retired failed and withheld entries', () => {
			for (const event of ['retire', 'fail', 'withhold'] as const) {
				const initial = buildAggregate('a', 'A', 2, 'build', 'current', 'first')
				const removed = buildAggregate('a', 'A', 2, event, 'failed', undefined)
				const timeline = buildTimeline(parseAggregates([initial, removed, completeMaintenance(2)]))
				assert.equal(findSnapshot(timeline, 3)?.topics.size, 0)
			}
			const first = buildAggregate('a', 'A', 2, 'build', 'current', 'first')
			assert.deepEqual(buildTimeline(parseAggregates([first])), [])
			assert.equal(
				buildTimeline(
					parseAggregates([
						{ ...first, result: { ...first.result, sources: [{}] } },
						completeMaintenance(2),
					]),
				)[0]?.topics.size,
				0,
			)
			assert.equal(
				buildTimeline(
					parseAggregates([
						{ ...first, result: { ...first.result, point: 9 } },
						completeMaintenance(2),
					]),
				)[0]?.topics.size,
				0,
			)
			assert.equal(
				buildTimeline(
					parseAggregates([
						{ ...first, result: { ...first.result, goal: 'future' } },
						completeMaintenance(2),
					]),
				)[0]?.topics.size,
				0,
			)
			for (const status of ['failed', 'aborted'])
				assert.equal(
					buildTimeline(parseAggregates([first, { ...completeMaintenance(2), status }]))[0]?.topics
						.size,
					0,
				)
		})

		it('keeps repeated completed boundaries distinct and never uses a later recovery for an earlier arrival', () => {
			const first = buildAggregate('a', 'A', 2, 'build', 'current', 'first')
			const retained = buildAggregate('a', 'A', 2, 'keep', 'current', 'first')
			const recovered = buildAggregate('a', 'A', 8, 'build', 'current', 'recovered')
			const timeline = buildTimeline([
				first,
				completeMaintenance(2),
				retained,
				completeMaintenance(2),
				{ ...completeMaintenance(5), status: 'failed' },
				recovered,
				completeMaintenance(8),
			])
			assert.equal(timeline.length, 4)
			assert.equal(findSnapshot(timeline, 5)?.topics.get('a')?.prose, 'first')
			assert.equal(findSnapshot(timeline, 8)?.topics.size, 0)
			assert.equal(findSnapshot(timeline, 9)?.topics.get('a')?.prose, 'recovered')
		})

		it('reads a verdict at the ledger cutoffs', () => {
			assert.equal(readVerdict('category', buildChoice({ chatter: FIT.category })), true)
			assert.equal(readVerdict('category', buildChoice({ chatter: 0.4, distractor: 0.3 })), true)
			assert.equal(readVerdict('category', buildChoice({ chatter: 0.3, distractor: 0.3 })), false)
			assert.equal(readVerdict('category', buildChoice({ fact: 1 })), false)
			assert.equal(readVerdict('amends', buildNoul(FIT.amends)), true)
			assert.equal(readVerdict('amends', buildNoul(0.74)), false)
			assert.equal(readVerdict('supersedes', buildNoul(0.94)), false)
			assert.equal(readVerdict('supersedes', buildNoul(FIT.supersedes)), true)
			assert.equal(readVerdict('category', buildNoul(1)), undefined)
			assert.equal(readVerdict('amends', buildChoice({ fact: 1 })), undefined)
			assert.equal(readVerdict('amends', undefined), undefined)
		})

		it('renders the plain state when no summary applies', () => {
			assert.equal(renderShadow('category', 'user: hi', []), 'user: hi')
			assert.equal(renderShadow('amends', 'Earlier message: a', []), 'Earlier message: a')
			assert.equal(
				renderShadow('category', 'user: hi', [
					{ title: 'refunds', prose: 'One.' },
					{ title: 'Ana', prose: 'Two.' },
				]),
				'Topic summaries:\nrefunds: One.\nAna: Two.\n\nMessage: user: hi',
			)
			assert.equal(
				renderShadow('supersedes', 'Earlier message: a', [{ title: 'refunds', prose: 'One.' }]),
				'Topic summaries:\nrefunds: One.\n\nEarlier message: a',
			)
		})

		it('keys a pair only when both messages are seed messages', () => {
			assert.equal(buildPairKey([3, 5]), '3:5')
			assert.equal(buildPairKey([undefined, 5]), undefined)
			assert.equal(buildPairKey([3]), undefined)
		})

		it('computes a rate and leaves the ratio out for a total of 0', () => {
			assert.deepEqual(computeRate(1, 4), { hits: 1, total: 4, rate: 0.25 })
			assert.deepEqual(computeRate(0, 0), { hits: 0, total: 0, rate: undefined })
			assert.equal(formatRate(computeRate(2, 3)), '2/3 0.667')
			assert.equal(formatRate(computeRate(0, 0)), '0/0 (none)')
		})

		it('counts a truth pair that no judgment screened as not read, and leaves an undecided pair out', () => {
			const truth: ShadowTruth = {
				first: 2,
				categories: new Map(),
				amends: new Set(['3:5', '4:5', '6:7']),
				supersedes: new Set(),
			}
			const items = [
				buildItem('amends', [3, 5], true, true),
				buildItem('amends', [4, 5], true, undefined),
				buildItem('amends', [1, 5], false, true),
			]
			const rates = computeRates(items, truth, (one) => one.shadow)
			assert.deepEqual(rates.amends.recall, { hits: 1, total: 2, rate: 0.5 })
			assert.deepEqual(rates.amends.falsedrop, { hits: 1, total: 1, rate: 1 })
			assert.deepEqual(rates.supersedes.recall, { hits: 0, total: 0, rate: undefined })
			assert.deepEqual(countFlips(items), { category: 0, amends: 1, supersedes: 0 })
		})

		it('reads the truth of a copy after its first read point', () => {
			const truth = readTruth(readJSON(join(copies, 'v1.json')))
			assert.equal(truth.first, 3)
			assert.equal(truth.categories.get(5), 'correction')
			assert.deepEqual([...truth.amends].sort(), ['3:5', '5:7', '6:7'])
			assert.ok(
				!truth.amends.has('0:3'),
				'a truth pair that ends at the first read point stays out',
			)
			assert.deepEqual([...truth.supersedes].sort(), ['5:7', '6:7'])
			assert.throws(() => readTruth({ seed: [], goals: [] }), /no goal/)
			assert.throws(() => readTruth({}), /no seed/)
		})

		it('reads the copy of the series from the same field', () => {
			const truth = readTruth(readJSON(join(HARNESS, 'bench', 'variants', 'long', 'v1.json')))
			assert.equal(truth.first, 47)
			assert.ok(truth.amends.has('68:92'))
			assert.ok(!truth.supersedes.has('68:92'))
			assert.ok(truth.supersedes.has('50:94'))
			assert.ok(truth.amends.has('50:94'), 'a truth supersedes pair is also an amends pair')
			assert.ok(truth.supersedes.has('93:138'))
			assert.ok(
				!truth.amends.has('22:27'),
				'a truth pair at or before the first read point stays out',
			)
			assert.ok(!truth.supersedes.has('4:44'))
		})
	})

	describe('flags', () => {
		it('refuses a call without the required flags', () => {
			const outcome = parseFlags([])
			assert.equal(outcome.success, false)
			if (!outcome.success)
				assert.match(outcome.error, /--run is required\n--out is required\nusage:/)
		})

		it('refuses an unknown flag and a bad URL', () => {
			assert.equal(parseFlags(['--run', 'a', '--out', 'b', '--extra']).success, false)
			assert.equal(parseFlags(['--run', 'a', '--out', 'b', '--url', 'not a url']).success, false)
		})

		it('resolves the cache against the harness directory and the rest against the working directory', () => {
			const outcome = parseFlags(['--run', 'r', '--out', 'o.json', '--cache', 'tmp/x', '--live'])
			assert.ok(outcome.success)
			if (!outcome.success) return
			assert.equal(outcome.value.cache, join(HARNESS, 'tmp', 'x'))
			assert.equal(outcome.value.run, join(process.cwd(), 'r'))
			assert.equal(outcome.value.out, join(process.cwd(), 'o.json'))
			assert.equal(outcome.value.live, true)
			assert.equal(outcome.value.url, 'http://127.0.0.1:11434')
		})
	})

	describe('offline', () => {
		it('reproduces the hand-computed counts and rates, asks nobody, and fetches nothing', async () => {
			const out = pickPath('offline')
			const cached = readFileSync(join(cache, 'judge.jsonl'), 'utf8')
			const code = await new Shadow({
				run,
				cache,
				out,
				live: false,
				url: 'http://127.0.0.1:11434',
				copies,
			}).execute()
			assert.equal(code, 0)
			assert.deepEqual(fetched, [])
			assert.equal(readFileSync(join(cache, 'judge.jsonl'), 'utf8'), cached)
			const report = readJSON(out)
			assert.equal(readField(report, 'copy'), 1)
			assert.equal(readField(report, 'model'), MODEL)
			assert.equal(readField(report, 'arm'), 'aggregate')
			assert.deepEqual(readField(report, 'counts'), {
				items: 12,
				plain: 2,
				asked: 9,
				missed: 1,
				failed: 0,
				absent: 7,
			})
			assert.deepEqual(readField(report, 'plain'), {
				keep: { hits: 2, total: 2, rate: 1 },
				drop: { hits: 2, total: 2, rate: 1 },
				amends: {
					recall: { hits: 2, total: 3, rate: 2 / 3 },
					falsedrop: { hits: 0, total: 2, rate: 0 },
				},
				supersedes: {
					recall: { hits: 1, total: 2, rate: 0.5 },
					falsedrop: { hits: 0, total: 1, rate: 0 },
				},
			})
			assert.deepEqual(readField(report, 'shadow'), {
				keep: { hits: 1, total: 2, rate: 0.5 },
				drop: { hits: 1, total: 2, rate: 0.5 },
				amends: {
					recall: { hits: 2, total: 3, rate: 2 / 3 },
					falsedrop: { hits: 1, total: 2, rate: 0.5 },
				},
				supersedes: {
					recall: { hits: 0, total: 2, rate: 0 },
					falsedrop: { hits: 0, total: 1, rate: 0 },
				},
			})
			assert.deepEqual(readField(report, 'flips'), { category: 2, amends: 1, supersedes: 1 })
		})

		it('leaves the state plain where no aggregate is current, and counts the missing topics', async () => {
			const out = pickPath('plain')
			await new Shadow({
				run,
				cache,
				out,
				live: false,
				url: 'http://127.0.0.1:11434',
				copies,
			}).execute()
			const items = readField(readJSON(out), 'items')
			assert.ok(Array.isArray(items))
			const unseen = findItem(items, ['category', 's6'])
			assert.equal(readField(unseen, 'outcome'), 'plain')
			assert.equal(readField(unseen, 'state'), renderState('s6'))
			assert.deepEqual(readField(unseen, 'topics'), [])
			assert.deepEqual(readField(unseen, 'absent'), ['delivery'])
			assert.equal(readField(unseen, 'plain'), true)
			assert.equal(readField(unseen, 'shadow'), true)
			const withheld = findItem(items, ['category', 's8'])
			assert.equal(readField(withheld, 'outcome'), 'plain')
			assert.deepEqual(readField(withheld, 'absent'), ['escalations', 'delivery'])
			const partial = findItem(items, ['category', 's7'])
			assert.equal(readField(partial, 'outcome'), 'asked')
			assert.deepEqual(readField(partial, 'topics'), ['refunds'])
			assert.deepEqual(readField(partial, 'absent'), ['delivery'])
		})

		it('reads the aggregates current before the message, the owner link, and the request topics', async () => {
			const out = pickPath('states')
			await new Shadow({
				run,
				cache,
				out,
				live: false,
				url: 'http://127.0.0.1:11434',
				copies,
			}).execute()
			const items = readField(readJSON(out), 'items')
			assert.ok(Array.isArray(items))
			const owner = findItem(items, ['amends', 's3', 's5'])
			assert.deepEqual(readField(owner, 'topics'), ['owner:AC-77', 'refunds'])
			assert.equal(readField(owner, 'point'), 5)
			assert.equal(
				readField(owner, 'state'),
				`Topic summaries:\nHalvorsen Studio: ${OWNER}\nrefunds: ${REFUNDS_FIRST}\n\n${renderPair('s3', 's5')}`,
			)
			const boundary = findItem(items, ['category', 's5'])
			assert.equal(
				readField(boundary, 'state'),
				`Topic summaries:\nrefunds: ${REFUNDS_FIRST}\n\nMessage: ${renderState('s5')}`,
				'the rows of the read point at seed 5 stay out of the state of message 5',
			)
			const later = findItem(items, ['category', 's7'])
			assert.equal(
				readField(later, 'state'),
				`Topic summaries:\nrefunds: ${REFUNDS_SECOND}\n\nMessage: ${renderState('s7')}`,
			)
			const request = findItem(items, ['amends', 'q1', 's5'])
			assert.deepEqual(readField(request, 'seeds'), [null, 5])
			assert.deepEqual(readField(request, 'topics'), ['owner:AC-77', 'escalations', 'refunds'])
			const missed = findItem(items, ['amends', 's3', 's7'])
			assert.equal(readField(missed, 'outcome'), 'missed')
			assert.equal(readField(missed, 'shadow'), undefined)
			assert.equal(readField(missed, 'plain'), false)
		})

		it('leaves out the judgments at or before the first read point', async () => {
			const out = pickPath('first')
			await new Shadow({
				run,
				cache,
				out,
				live: false,
				url: 'http://127.0.0.1:11434',
				copies,
			}).execute()
			const items = readField(readJSON(out), 'items')
			assert.ok(Array.isArray(items))
			assert.equal(
				items.some((one) => readField(one, 'id') === JSON.stringify(['category', 's0'])),
				false,
			)
			assert.ok(items.every((one) => readCount(one, 'point') > 3))
			assert.equal(
				items.some((one) => readField(one, 'id') === JSON.stringify(['category', 's3'])),
				false,
			)
		})
	})

	describe('command line', () => {
		it('exits 64 without the required flags', async () => {
			const outcome = await runScript([])
			assert.equal(outcome.code, 64)
			assert.match(outcome.stderr, /usage: node bench5\/shadow\.ts/)
			assert.equal((await runScript(['--run', run])).code, 64)
		})

		it('exits 0, prints the rates, and writes the report', async () => {
			const out = pickPath('cli')
			const outcome = await runScript([
				'--run',
				run,
				'--cache',
				cache,
				'--out',
				out,
				'--copies',
				copies,
			])
			assert.equal(outcome.code, 0, outcome.stderr)
			assert.match(
				outcome.stdout,
				/items 12 \(plain 2, asked 9, missed 1, failed 0\); topics without an aggregate 7/,
			)
			assert.match(outcome.stdout, /keep\s+plain 2\/2 1\.000 \| shadow 1\/2 0\.500/)
			assert.match(outcome.stdout, /flips\s+category 2, amends 1, supersedes 1/)
			assert.equal(readField(readJSON(out), 'counts') !== undefined, true)
		})

		it('exits 1 and names the file when the run lacks its aggregates', async () => {
			const control = join(directory, 'control')
			mkdirSync(control, { recursive: true })
			for (const name of ['run.json', 'messages.jsonl', 'judgments.jsonl'])
				copyFileSync(join(run, name), join(control, name))
			const out = pickPath('control')
			const outcome = await runScript([
				'--run',
				control,
				'--cache',
				cache,
				'--out',
				out,
				'--copies',
				copies,
			])
			assert.equal(outcome.code, 1)
			assert.match(outcome.stderr, /missing input: .*aggregates\.jsonl/)
			assert.equal(existsSync(out), false)
		})

		it('exits 1 offline when the cache file is absent, and when the run directory is', async () => {
			const out = pickPath('nocache')
			const empty = join(directory, 'empty-cache')
			mkdirSync(empty, { recursive: true })
			const outcome = await runScript([
				'--run',
				run,
				'--cache',
				empty,
				'--out',
				out,
				'--copies',
				copies,
			])
			assert.equal(outcome.code, 1)
			assert.match(outcome.stderr, /missing input: .*judge\.jsonl/)
			const nothing = await runScript([
				'--run',
				join(directory, 'nowhere'),
				'--cache',
				cache,
				'--out',
				out,
				'--copies',
				copies,
			])
			assert.equal(nothing.code, 1)
			assert.match(nothing.stderr, /missing input: .*run\.json/)
		})

		it('exits 1 when the copy of the run is absent', async () => {
			const outcome = await runScript([
				'--run',
				run,
				'--cache',
				cache,
				'--out',
				pickPath('nocopy'),
				'--copies',
				join(directory, 'no-copies'),
			])
			assert.equal(outcome.code, 1)
			assert.match(outcome.stderr, /missing input: .*v1\.json/)
		})
	})

	describe('live', () => {
		it('asks a missed question of the judge once, appends the answer, and reads it as a flip', async () => {
			const prompts: string[] = []
			const server = await startJudge(prompts)
			closers.push(
				() =>
					new Promise((resolve) => {
						server.close(() => resolve())
					}),
			)
			const address = server.address()
			assert.ok(address !== null && typeof address === 'object')
			const live = join(directory, 'live-cache')
			mkdirSync(live, { recursive: true })
			copyFileSync(join(cache, 'judge.jsonl'), join(live, 'judge.jsonl'))
			const out = pickPath('live')
			const outcome = await runScript([
				'--run',
				run,
				'--cache',
				live,
				'--out',
				out,
				'--copies',
				copies,
				'--live',
				'--url',
				`http://127.0.0.1:${address.port}`,
			])
			assert.equal(outcome.code, 0, outcome.stderr)
			assert.equal(prompts.length, 1)
			assert.match(
				prompts[0] ?? '',
				/Halvorsen Studio: Halvorsen Studio uses refund code MX-1000\./,
			)
			const rows = readRows(join(live, 'judge.jsonl'))
			assert.equal(rows.length, 10)
			assert.equal(readField(rows[9], 'origin'), 'live')
			const report = readJSON(out)
			assert.deepEqual(readField(report, 'counts'), {
				items: 12,
				plain: 2,
				asked: 10,
				missed: 0,
				failed: 0,
				absent: 7,
			})
			assert.deepEqual(readField(report, 'flips'), { category: 2, amends: 2, supersedes: 1 })
			assert.deepEqual(readField(readField(readField(report, 'shadow'), 'amends'), 'falsedrop'), {
				hits: 2,
				total: 3,
				rate: 2 / 3,
			})
			assert.deepEqual(readField(readField(readField(report, 'plain'), 'amends'), 'falsedrop'), {
				hits: 0,
				total: 3,
				rate: 0,
			})
		})
	})
})
