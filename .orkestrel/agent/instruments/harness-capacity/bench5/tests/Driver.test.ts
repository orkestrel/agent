import { BUILD } from '../constants.js'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { Fixture } from './fixture.js'
import type { Message } from '../../vendor/agent-0.0.30-trimmed/index.js'
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { compileRules, scoreText } from '../../bench/rescore.mjs'
import { estimateMessages } from '../../vendor/agent-0.0.30-trimmed/index.js'
import {
	AGREE_QUESTION,
	FOCUS_QUESTION,
	SUMMARIES_HEADING,
	SUMMARY_PREFIX,
} from '../aggregates/constants.js'
import { COPIES_DIR, HARNESS, SAMPLER, VENDOR_AGENT } from '../constants.js'
import { FLUSH_SYSTEM, classifyMisses, describeLookups, parseFlags, shapeBody } from '../Driver.js'
import { computeDigest, isMessageRole, readJSON, readRows } from '../helpers.js'
import { loadExchange, replaceContent, startFixture } from './fixture.js'

const BENCH = join(BUILD, 'bench5', 'bench.js')
const GOALS = 'g01,g11'
const LEAKS = 'g01,g11,g19'
const WEEKDAY = Object.freeze({
	g01: 'Today is Thursday 2026-10-08.',
	g11: 'Today is Friday 2026-10-09.',
})
const LOOKUP_TEXT = 'delivered 2026-10-09 at 7:40 am'
const MICA_PROMPT = 120
const ALLOWANCE = 300
const SQUEEZE = 1500
// Calibration sends two requests with num_predict 1 and each goal's prefix flush sends one more.
const CAPPED = 4
const SUMMARIES = Object.freeze({
	'about refunds as of': 'The standing rule applies to this topic.',
	'about returns as of': 'The standing rule applies to this topic.',
	'about escalations as of':
		'Adeyemi gives any sign-off while Marcus is away. The standing rule applies to this topic.',
	'about delivery as of':
		'WKND15 takes 15 percent off a delayed order. The standing rule applies to this topic.',
	'about warehouse as of': 'The standing rule applies to this topic.',
	'about contacts as of': 'The standing rule applies to this topic.',
})
// The stub files a message under the topic whose pattern its text matches; the patterns stand in for Mica.
const TOPICS = Object.freeze({
	refunds: /refund/,
	returns: /return/,
	escalations: /escalat|sign.?off/,
	delivery: /deliver|late|delay|parcel/,
	warehouse: /warehouse/,
	contacts: /contact/,
})
const directory = mkdtempSync(join(tmpdir(), 'bench5-driver-'))
const blocker = join(directory, 'blocker.ts')
let outputs = 0

interface Outcome {
	readonly code: number | null
	readonly stdout: string
	readonly stderr: string
}

interface Run {
	readonly out: string
	readonly outcome: Outcome
	readonly chat: readonly unknown[]
}

// Holds what the stub changes about its replies; a run sets a flag before it starts and clears it after.
const mode = { empty: false, fail: false, lookup: false }
const wire: { readonly chat: unknown[]; readonly judge: string[] } = { chat: [], judge: [] }

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readField(value: unknown, key: string): unknown {
	return isRecord(value) ? value[key] : undefined
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

function readNumber(value: unknown, key: string): number {
	const field = readField(value, key)
	assert.equal(typeof field, 'number', key)
	return Number(field)
}

function readBody(request: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = []
		request.on('data', (chunk: Buffer) => chunks.push(chunk))
		request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
		request.on('error', reject)
	})
}

// Answers a raw Mica generate request with logprobs: Yes or No for a noul question and the first label for a choice question.
function answerJudge(prompt: string): string {
	const noul = prompt.includes('Answer Yes if true, or No if false.')
	const state = /<state>\n([\s\S]*?)\n<\/state>/.exec(prompt)?.[1] ?? ''
	let tokens: readonly string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
	let first = 'A'
	if (noul) {
		const topic = /The message concerns (\w+):/.exec(prompt)?.[1] ?? ''
		const pattern: unknown = Reflect.get(TOPICS, topic)
		const yes =
			prompt.includes(`Question: ${FOCUS_QUESTION.instructions}\n`) ||
			prompt.includes(`Question: ${AGREE_QUESTION.instructions}\n`) ||
			(pattern instanceof RegExp &&
				pattern.test(state.toLowerCase()) &&
				!prompt.includes('Does the event change'))
		tokens = ['Yes', 'No']
		first = yes ? 'Yes' : 'No'
	}
	return JSON.stringify({
		model: 'stub',
		done: true,
		done_reason: 'stop',
		response: first,
		prompt_eval_count: MICA_PROMPT,
		eval_count: 1,
		logprobs: [
			{
				token: first,
				logprob: -0.05,
				top_logprobs: tokens.map((token) => ({ token, logprob: token === first ? -0.05 : -6 })),
			},
		],
	})
}

// Builds the NDJSON of a reply that calls one lookup, reusing the usage counts of the recorded exchange.
function buildToolReply(
	body: string,
	name: string,
	args: Readonly<Record<string, string>>,
): string {
	const records = body.split('\n').filter((line) => line !== '')
	const last: unknown = JSON.parse(records[records.length - 1] ?? '{}')
	return `${JSON.stringify({
		model: readField(last, 'model'),
		created_at: readField(last, 'created_at'),
		message: {
			role: 'assistant',
			content: '',
			tool_calls: [{ function: { name, arguments: args } }],
		},
		done: true,
		done_reason: 'stop',
		prompt_eval_count: readField(last, 'prompt_eval_count'),
		eval_count: readField(last, 'eval_count'),
	})}\n`
}

// Serves Mica's generate path itself and the chat path through the fixture, changing a reply only where a run asks.
function startStub(fixture: Fixture, requests: ReadonlyMap<string, string>): Promise<Server> {
	const exchange = loadExchange()
	const server = createServer((request: IncomingMessage, response: ServerResponse) => {
		if (request.url === '/api/ps') {
			const prior = wire.chat.at(-1)
			response.writeHead(200, { 'content-type': 'application/json' })
			response.end(
				JSON.stringify({
					models: [
						{
							name: readField(prior, 'model'),
							digest: '1'.repeat(64),
							runner: 'llamacpp',
							context_length: readField(readField(prior, 'options'), 'num_ctx'),
							expires_at: new Date(Date.now() + 1800000).toISOString(),
						},
					],
				}),
			)
			return
		}
		readBody(request)
			.then(async (text) => {
				const body: unknown = JSON.parse(text)
				if (request.url === '/api/generate') {
					if (mode.fail) {
						response.writeHead(500, { 'content-type': 'application/json' })
						response.end(JSON.stringify({ error: 'the stub judge is down' }))
						return
					}
					wire.judge.push(readText(body, 'prompt'))
					response.writeHead(200, { 'content-type': 'application/json' })
					response.end(answerJudge(readText(body, 'prompt')))
					return
				}
				wire.chat.push(body)
				const messages = readList(body, 'messages')
				const last = messages[messages.length - 1]
				const asked = readText(last, 'role') === 'user' && readList(body, 'tools').length > 0
				if (asked && mode.empty) {
					response.writeHead(200, { 'content-type': exchange.contentType })
					response.end(replaceContent(exchange.body, ''))
					return
				}
				if (asked && mode.lookup && readText(last, 'content') === requests.get('g11')) {
					response.writeHead(200, { 'content-type': exchange.contentType })
					response.end(buildToolReply(exchange.body, 'lookup_order', { id: 'LH-80941' }))
					return
				}
				const forwarded = await fetch(`${fixture.url}/api/chat`, {
					method: 'POST',
					body: text,
					headers: { 'content-type': 'application/json' },
				})
				response.writeHead(forwarded.status, {
					'content-type': forwarded.headers.get('content-type') ?? 'application/json',
				})
				response.end(await forwarded.text())
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

function runBench(args: readonly string[]): Promise<Outcome> {
	return new Promise((resolve, reject) => {
		const child = spawn(
			process.execPath,
			['--import', pathToFileURL(blocker).href, BENCH, ...args],
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

function pick(name: string): string {
	outputs += 1
	return join(directory, `${name}-${outputs}`)
}

function readFile(path: string): readonly unknown[] {
	return existsSync(path) ? readRows(path) : []
}

function readSystem(body: unknown): string {
	const [first] = readList(body, 'messages')
	return readField(first, 'role') === 'system' ? readText(first, 'content') : ''
}

function lastRole(body: unknown): string {
	const messages = readList(body, 'messages')
	return readText(messages[messages.length - 1], 'role')
}

function hasTools(body: unknown): boolean {
	return readList(body, 'tools').length > 0
}

// Picks the requests that serve a goal's first pass: they advertise tools, carry the instructions, and end on the user's request.
function pickFirstPasses(chat: readonly unknown[]): readonly unknown[] {
	return chat.filter(
		(body) =>
			hasTools(body) && lastRole(body) === 'user' && readSystem(body).includes('## Instructions'),
	)
}

// Picks the answer passes: they advertise no tools and carry the instructions.
function pickAnswerPasses(chat: readonly unknown[]): readonly unknown[] {
	return chat.filter((body) => !hasTools(body) && readSystem(body).includes('## Instructions'))
}

function pickFlushes(chat: readonly unknown[]): readonly unknown[] {
	return chat.filter((body) => readSystem(body) === FLUSH_SYSTEM)
}

function pickSummaries(chat: readonly unknown[]): readonly unknown[] {
	return chat.filter((body) => readSystem(body).startsWith(SUMMARY_PREFIX))
}

function findGoal(rows: readonly unknown[], prefix: string): unknown {
	const row = rows.find((one) => readText(one, 'goal').startsWith(prefix))
	assert.ok(row !== undefined, prefix)
	return row
}

// Lists the scored phrases that a text holds, by running them through the scorer as a goal's expected strings.
function listHeld(phrases: readonly string[], text: string): readonly string[] {
	const rules: unknown = compileRules({ id: 'audit', expected: phrases, forbidden: [] })
	const scored: unknown = scoreText(rules, text)
	const missing = readList(scored, 'missing')
	return phrases.filter((phrase) => !missing.includes(phrase))
}

// Counts the scored phrases that only the summaries carry: held by the summaries and absent from the shown text.
function auditLeaks(phrases: readonly string[], summaries: string, shown: string): number {
	const seen = listHeld(phrases, shown)
	return listHeld(phrases, summaries).filter((phrase) => !seen.includes(phrase)).length
}

const goals = new Map<string, string>()
const expected = new Map<string, readonly string[]>()
const cache = join(directory, 'cache')
const settings = join(directory, 'settings.json')
const fit = join(directory, 'fit.json')
const runs = new Map<string, Run>()
const closers: Array<() => Promise<void>> = []
let url = ''

function stubArgs(extra: readonly string[], list = GOALS, store = cache): readonly string[] {
	return [
		'--fixture',
		'--copy',
		'1',
		'--url',
		url,
		'--cache',
		store,
		'--fit',
		fit,
		'--settings',
		settings,
		'--goals',
		list,
		...extra,
	]
}

async function startRun(
	name: string,
	extra: readonly string[],
	list = GOALS,
	store = cache,
): Promise<void> {
	const out = pick(name)
	const from = wire.chat.length
	const outcome = await runBench(stubArgs([...extra, '--out', out], list, store))
	runs.set(name, { out, outcome, chat: wire.chat.slice(from) })
}

function recall(name: string): Run {
	const run = runs.get(name)
	assert.ok(run !== undefined, name)
	return run
}

function listFile(name: string, file: string): readonly unknown[] {
	return readFile(join(recall(name).out, file))
}

// Rebuilds what the control arm shows at a goal's first pass: the system text and date, the briefing, and the tail.
function shownAt(name: string, prefix: string, index: number): string {
	const record = listFile(name, 'selections.jsonl').find((one) =>
		readText(one, 'goal').startsWith(prefix),
	)
	const system = readSystem(pickFirstPasses(recall(name).chat)[index])
	const cut = system.indexOf(SUMMARIES_HEADING)
	return [
		system.slice(0, cut < 0 ? system.length : cut),
		readText(record, 'briefing'),
		...readList(record, 'tail').map((message) => readText(message, 'content')),
	].join('\n')
}

// Lists the seed indices that precede a goal's request in a run's messages.
function listIndices(name: string, goal: string): readonly number[] {
	const messages = listFile(name, 'messages.jsonl')
	const at = messages.findIndex(
		(one) => readField(one, 'request') === true && readText(one, 'goal').startsWith(goal),
	)
	assert.ok(at >= 0, goal)
	return messages
		.slice(0, at)
		.map((one) => readField(one, 'index'))
		.filter((index): index is number => typeof index === 'number')
}

function listFlushBodies(name: string): readonly string[] {
	return pickFlushes(recall(name).chat).map((body) => JSON.stringify(body))
}

// Reads the prose of the build that a topic got at a goal.
function readProse(name: string, topic: string, goal: string): string {
	const row = listFile(name, 'aggregates.jsonl').find(
		(one) =>
			readField(one, 'event') === 'build' &&
			readField(one, 'status') === 'current' &&
			readField(one, 'topic') === topic &&
			readText(one, 'goal').startsWith(goal),
	)
	assert.ok(row !== undefined, `${topic} at ${goal}`)
	return readText(row, 'prose')
}

// Reads the summaries block that a goal's first select carried.
function readBlock(name: string, goal: string): string {
	const record = listFile(name, 'selections.jsonl').find((one) =>
		readText(one, 'goal').startsWith(goal),
	)
	return String(readField(readField(record, 'instructions'), 'summaries') ?? '')
}

describe('Driver', () => {
	before(async () => {
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
		writeFileSync(
			settings,
			JSON.stringify({ q2: { allowance: ALLOWANCE, retry: 1, predict: 160 } }),
		)
		writeFileSync(fit, JSON.stringify({ change: 0.6, agree: 0.6, separated: true }))
		for (const goal of readList(readJSON(join(COPIES_DIR, 'v1.json')), 'goals')) {
			const prefix = readText(goal, 'id').slice(0, 3)
			goals.set(prefix, readText(goal, 'request'))
			expected.set(prefix, readList(goal, 'expected').map(String))
		}
		const fixture = await startFixture({ prefix: SUMMARY_PREFIX, summaries: SUMMARIES })
		const server = await startStub(fixture, goals)
		closers.push(
			() => fixture.close(),
			() =>
				new Promise((resolve) => {
					server.close(() => resolve())
					server.closeAllConnections()
				}),
		)
		const address = server.address()
		assert.ok(address !== null && typeof address !== 'string')
		url = `http://127.0.0.1:${address.port}`
		mode.lookup = true
		await startRun('records', ['--run', '--live', '--arm', 'records'])
		await startRun('aggregate', ['--run', '--live', '--arm', 'aggregate'])
		await startRun(
			'squeeze',
			['--run', '--live', '--arm', 'aggregate', '--allowance', String(SQUEEZE)],
			LEAKS,
		)
		await startRun('offline', ['--run', '--arm', 'records'])
		mode.lookup = false
		mode.empty = true
		await startRun('answer', ['--run', '--live', '--arm', 'aggregate'])
		mode.empty = false
	})

	after(async () => {
		for (const close of closers) await close()
		rmSync(directory, { recursive: true, force: true })
	})

	describe('usage', () => {
		it('exits 64 without exactly one mode', async () => {
			assert.equal((await runBench(['--copy', '1'])).code, 64)
			assert.equal(
				(await runBench(['--run', '--dry', '--copy', '1', '--out', pick('usage')])).code,
				64,
			)
		})

		it('exits 64 for a copy outside 1 to 8, an unknown model, and an unknown flag', async () => {
			assert.equal((await runBench(['--dry', '--copy', '9'])).code, 64)
			assert.equal((await runBench(['--dry', '--copy', '1', '--model', 'nobody:1b'])).code, 64)
			assert.equal((await runBench(['--dry', '--copy', '1', '--nothing'])).code, 64)
		})

		it('refuses a run without --live that names the daemon, a seed pass without --live, and a dry run with --live', async () => {
			const daemon = await runBench(['--run', '--copy', '1', '--out', pick('daemon')])
			assert.equal(daemon.code, 64)
			assert.match(daemon.stderr, /refuses the daemon URL/)
			assert.equal((await runBench(['--seed', '--copy', '1', '--out', pick('seed')])).code, 64)
			assert.equal((await runBench(['--dry', '--live', '--copy', '1'])).code, 64)
		})

		it('resolves the cache, fit, and settings paths against the harness directory', () => {
			const outcome = parseFlags(['--dry', '--copy', '2', '--cache', 'tmp/x'])
			assert.ok(outcome.success)
			assert.equal(outcome.value.cache, join(HARNESS, 'tmp', 'x'))
			assert.equal(outcome.value.fit, join(HARNESS, 'bench5', 'fit.json'))
			assert.equal(outcome.value.settings, join(HARNESS, 'bench5', 'settings.json'))
			assert.equal(outcome.value.key, 'q2')
		})
	})

	describe('helpers', () => {
		it('lists the lookup version each read point serves', () => {
			const tables = {
				tools: {},
				lookups: [
					{ tool: 'lookup_order', id: 'LH-80941', from: 81, text: 'a' },
					{ tool: 'lookup_order', id: 'LH-80941', from: 134, text: 'b' },
					{ tool: 'lookup_customer', id: 'LH-71592', from: 135, text: 'c' },
				],
			}
			assert.equal(describeLookups(tables, 80), 'LH-80941@base, LH-71592@base')
			assert.equal(describeLookups(tables, 81), 'LH-80941@81, LH-71592@base')
			assert.equal(describeLookups(tables, 135), 'LH-80941@134, LH-71592@135')
		})

		it('sets truncate false on a chat request and num_predict 1 on a calibration call only', () => {
			const body = JSON.stringify({ model: 'm', options: { num_ctx: 3072, temperature: 0 } })
			const options = { num_ctx: 3072, temperature: 0 }
			assert.deepEqual(JSON.parse(shapeBody('agent', body, false)), {
				shift: false,
				model: 'm',
				options,
				truncate: false,
			})
			assert.deepEqual(JSON.parse(shapeBody('agent', body, true)), {
				shift: false,
				model: 'm',
				options: { ...options, num_predict: 1 },
				think: false,
				truncate: false,
			})
			assert.deepEqual(JSON.parse(shapeBody('summarizer', body, true)), {
				model: 'm',
				options,
				truncate: false,
			})
			assert.equal(shapeBody('judge', body, true), body)
		})

		it('splits missed questions into seed-only and request questions', () => {
			const missed = new Set([
				JSON.stringify(['category', 'a']),
				JSON.stringify(['topic', 'r1', 'refunds']),
				JSON.stringify(['amends', 'a', 'r1']),
			])
			assert.deepEqual(classifyMisses(missed, new Set(['r1'])), {
				misses: { category: 1, topic: 1, amends: 1 },
				seed: 1,
				requests: 2,
			})
		})
	})

	describe('dry', () => {
		for (const copy of [1, 2, 3, 4, 5, 6, 7, 8]) {
			it(`exits 0 for copy ${copy} and prints fetches 0`, async () => {
				const outcome = await runBench(['--dry', '--copy', String(copy), '--cache', pick('dry')])
				assert.equal(outcome.code, 0, outcome.stderr)
				assert.match(outcome.stdout, /fetches 0/)
				assert.match(outcome.stdout, /g01-luis-refund-amount after=47 date=2026-10-08/)
				assert.match(
					outcome.stdout,
					/g11-grace-signoff-today after=89 date=2026-10-09 lookups=LH-80941@81, LH-71592@base/,
				)
				assert.match(
					outcome.stdout,
					/g20-copperline-manager after=137 date=2026-10-10 lookups=LH-80941@81, LH-71592@135/,
				)
			})
		}

		it('creates no cache directory', async () => {
			const store = pick('dry')
			assert.equal((await runBench(['--dry', '--copy', '1', '--cache', store])).code, 0)
			assert.equal(existsSync(store), false)
		})

		it('exits 1 for a fit file that holds no valid cutoffs', async () => {
			const broken = join(directory, 'broken-fit.json')
			writeFileSync(broken, JSON.stringify({ change: 0.4, agree: 0.6, separated: false }))
			const outcome = await runBench([
				'--dry',
				'--copy',
				'1',
				'--fit',
				broken,
				'--cache',
				pick('dry'),
			])
			assert.equal(outcome.code, 1)
			assert.match(outcome.stderr, /no valid cutoffs/)
		})
	})

	describe('run', () => {
		it('exits 0 for both arms, with every request on the stub and none on the daemon', () => {
			for (const name of ['records', 'aggregate', 'squeeze', 'answer', 'offline']) {
				const run = recall(name)
				assert.equal(run.outcome.code, 0, `${name}: ${run.outcome.stderr}`)
			}
			assert.ok(wire.chat.length > 0 && wire.judge.length > 0)
		})

		it('writes the rows, selections, messages, judgments, calls, and run files, and the aggregate rows for the aggregate arm only', () => {
			for (const name of ['records', 'aggregate']) {
				assert.equal(listFile(name, 'rows.jsonl').length, 2)
				assert.ok(listFile(name, 'selections.jsonl').length >= 2)
				assert.ok(listFile(name, 'messages.jsonl').length > 48)
				assert.ok(listFile(name, 'judgments.jsonl').length > 48)
				assert.ok(listFile(name, 'calls.jsonl').some((call) => readField(call, 'role') === 'judge'))
			}
			assert.equal(existsSync(join(recall('records').out, 'aggregates.jsonl')), false)
			assert.ok(listFile('aggregate', 'aggregates.jsonl').length > 0)
			const report = readJSON(join(recall('aggregate').out, 'run.json'))
			assert.equal(readField(report, 'status'), 'complete')
			assert.equal(
				readField(readField(report, 'build'), 'sha256'),
				computeDigest(readFileSync(VENDOR_AGENT, 'utf8')),
			)
			assert.equal(readField(readField(report, 'settings'), 'allowance'), ALLOWANCE)
		})

		it('adds the seed through each goal read point before its request', () => {
			assert.deepEqual(
				listIndices('records', 'g01'),
				Array.from({ length: 48 }, (_, at) => at),
			)
			assert.deepEqual(
				listIndices('records', 'g11'),
				Array.from({ length: 90 }, (_, at) => at),
			)
			const added = listFile('records', 'messages.jsonl')
				.map((one) => readField(one, 'index'))
				.filter((index): index is number => typeof index === 'number')
			assert.equal(Math.max(...added), 89)
		})

		it('writes the date instruction of the read point in both arms', () => {
			for (const name of ['records', 'aggregate']) {
				const records = listFile(name, 'selections.jsonl')
				const g01 = records.find((one) => readText(one, 'goal').startsWith('g01'))
				const g11 = records.find((one) => readText(one, 'goal').startsWith('g11'))
				assert.equal(readField(readField(g01, 'instructions'), 'date'), WEEKDAY.g01)
				assert.equal(readField(readField(g11, 'instructions'), 'date'), WEEKDAY.g11)
			}
		})

		it('binds every admitted wire body to the recorded maintenance version and keeps absent bodies unbound', () => {
			let admitted = 0
			let absent = 0
			for (const name of ['records', 'aggregate']) {
				const rows = listFile(name, 'aggregates.jsonl')
				for (const record of listFile(name, 'selections.jsonl')) {
					const bindings = readList(record, 'aggregates')
					const summary = readField(readField(record, 'instructions'), 'summaries')
					if (summary === undefined) {
						absent += 1
						assert.deepEqual(bindings, [])
						continue
					}
					assert.ok(bindings.length > 0)
					for (const binding of bindings) {
						admitted += 1
						const state = readField(binding, 'state')
						const maintenance = rows.find(
							(row) =>
								['build', 'keep'].includes(readText(row, 'event')) &&
								readText(row, 'topic') === readText(binding, 'topic') &&
								readText(row, 'goal') === readText(state, 'goal') &&
								readField(row, 'version') === readField(state, 'version'),
						)
						assert.ok(maintenance !== undefined)
						assert.deepEqual(readField(maintenance, 'result'), state)
						assert.ok(String(summary).includes(readText(binding, 'prose')))
						const position = GOALS.split(',').findIndex((goal) =>
							readText(record, 'goal').startsWith(goal),
						)
						assert.ok(position >= 0)
						const wireRequest = pickFirstPasses(recall(name).chat)[position]
						assert.ok(JSON.stringify(wireRequest).includes(readText(binding, 'prose')))
					}
				}
			}
			assert.ok(admitted > 0)
			assert.ok(absent > 0)
		})

		it('returns the versioned text for a lookup of LH-80941 at g11', () => {
			for (const name of ['records', 'aggregate']) {
				const tools = listFile(name, 'messages.jsonl').filter(
					(one) =>
						readField(one, 'role') === 'tool' && String(readField(one, 'goal')).startsWith('g11'),
				)
				assert.equal(tools.length, 1)
				assert.ok(readText(tools[0], 'content').includes(LOOKUP_TEXT))
				assert.equal(
					readField(readField(findGoal(listFile(name, 'rows.jsonl'), 'g11'), 'lookups'), 'calls'),
					1,
				)
			}
		})

		it('puts the system text, the instructions header, the date, the summaries, and the briefing in that order in the aggregate arm only', () => {
			const text = readText(
				readField(readJSON(join(COPIES_DIR, 'v1.json')), 'ledger'),
				'system',
			).slice(0, 60)
			const aggregate = pickFirstPasses(recall('aggregate').chat)
			assert.equal(aggregate.length, 2)
			for (const [at, goal] of (['g01', 'g11'] as const).entries()) {
				const content = readSystem(aggregate[at])
				const order = [text, '## Instructions', WEEKDAY[goal], SUMMARIES_HEADING, '## Pinned'].map(
					(part) => content.indexOf(part),
				)
				assert.ok(
					order.every((place) => place >= 0),
					`${goal}: ${JSON.stringify(order)}`,
				)
				assert.deepEqual(
					[...order].sort((left, right) => left - right),
					order,
					goal,
				)
			}
			for (const body of pickFirstPasses(recall('records').chat)) {
				assert.equal(readSystem(body).includes(SUMMARIES_HEADING), false)
				assert.ok(readSystem(body).includes('## Instructions'))
			}
		})

		it('removes the stale block from the actual answer-pass request after the selection bypasses aggregation', () => {
			const first = pickFirstPasses(recall('answer').chat)
			const answers = pickAnswerPasses(recall('answer').chat)
			assert.equal(first.length, 2)
			assert.equal(answers.length, 2)
			for (const [at, body] of answers.entries()) {
				assert.ok(!readSystem(body).includes(SUMMARIES_HEADING))
				assert.ok(readSystem(first[at]).includes(SUMMARIES_HEADING))
			}
			for (const row of listFile('answer', 'rows.jsonl')) {
				assert.equal(readNumber(row, 'passes'), 2)
				assert.equal(readField(row, 'via'), 'answered')
			}
		})

		it('prices the summary-free answer request at the ledger turn before sending those same bytes', () => {
			const calls = listFile('answer', 'calls.jsonl')
			const rows = listFile('answer', 'rows.jsonl')
			for (const [at, body] of pickAnswerPasses(recall('answer').chat).entries()) {
				const messages: readonly Message[] = readList(body, 'messages').map((message, index) => {
					const role = readField(message, 'role')
					assert.ok(isMessageRole(role))
					assert.deepEqual(readList(message, 'tool_calls'), [])
					return { id: String(index), role, content: readText(message, 'content') }
				})
				const call = calls.findLast(
					(one) =>
						readField(one, 'role') === 'agent' &&
						readField(one, 'goal') === readField(rows[at], 'goal'),
				)
				assert.equal(readNumber(call, 'estimate'), estimateMessages(messages))
				const contaminated = messages.map((message, index) =>
					index === 0
						? { ...message, content: `${message.content}\n\n${SUMMARIES_HEADING}` }
						: message,
				)
				assert.notEqual(readNumber(call, 'estimate'), estimateMessages(contaminated))
			}
		})

		it('refuses aggregate execution with a failed fit before an output directory or request exists', async () => {
			const failed = pick('failed-fit.json')
			const out = pick('failed-fit-output')
			writeFileSync(failed, JSON.stringify({ change: 0.6, agree: 0.6, separated: false }))
			const count = wire.chat.length
			const outcome = await runBench(
				stubArgs(['--run', '--live', '--arm', 'aggregate', '--fit', failed, '--out', out]),
			)
			assert.equal(outcome.code, 1)
			assert.match(outcome.stderr, /fit.separated/)
			assert.equal(existsSync(out), false)
			assert.equal(wire.chat.length, count)
		})

		it('sends one identical prefix flush per goal in both arms, after the aggregate stage and before the first pass', () => {
			for (const name of ['records', 'aggregate']) {
				const chat = recall(name).chat
				const flushes = pickFlushes(chat)
				assert.equal(flushes.length, 2, name)
				for (const body of flushes) {
					const messages = readList(body, 'messages')
					assert.equal(readText(messages[1], 'content'), '')
					assert.equal(readField(readField(body, 'options'), 'num_predict'), 1)
					assert.equal(readField(readField(body, 'options'), 'num_ctx'), SAMPLER.num_ctx)
					assert.equal(readField(body, 'truncate'), false)
				}
				const passes = pickFirstPasses(chat)
				for (const [at, flush] of flushes.entries()) {
					assert.ok(
						chat.indexOf(flush) < chat.indexOf(passes[at]),
						`${name}: flush ${at} comes before its first pass`,
					)
				}
			}
			const summaries = pickSummaries(recall('aggregate').chat)
			assert.ok(summaries.length > 0)
			assert.ok(
				recall('aggregate').chat.indexOf(summaries[0]) <
					recall('aggregate').chat.indexOf(pickFlushes(recall('aggregate').chat)[0]),
			)
			assert.deepEqual(listFlushBodies('records'), listFlushBodies('aggregate'))
		})

		it('sends truncate false on every chat request and num_predict 1 on the calibration calls and the flush only', () => {
			const chat = recall('aggregate').chat
			for (const body of chat) assert.equal(readField(body, 'truncate'), false)
			const capped = chat.filter(
				(body) => readField(readField(body, 'options'), 'num_predict') === 1,
			)
			assert.equal(capped.length, CAPPED)
			assert.equal(capped.filter((body) => readSystem(body) === FLUSH_SYSTEM).length, 2)
			for (const body of pickSummaries(chat))
				assert.equal(readField(readField(body, 'options'), 'num_predict'), 160)
		})

		it('keeps default shares and the initial calibrated gauge identical across arms', () => {
			const control = readJSON(join(recall('records').out, 'run.json'))
			const aggregate = readJSON(join(recall('aggregate').out, 'run.json'))
			const gauge = readField(aggregate, 'gauge')
			assert.deepEqual(readField(control, 'gauge'), gauge)
			assert.equal(readField(readField(control, 'share'), 'prompt'), 0.7)
			assert.deepEqual(readField(aggregate, 'share'), readField(control, 'share'))
			assert.equal(
				readField(listFile('aggregate', 'rows.jsonl')[0], 'scale'),
				readNumber(gauge, 'scale'),
			)
		})

		it('records the stage and flush walls apart from the agent wall, and the aggregate topics and tokens per goal', () => {
			for (const row of listFile('records', 'rows.jsonl')) {
				assert.equal(readNumber(row, 'stage'), 0)
				assert.deepEqual(readList(row, 'rendered'), [])
				assert.equal(readNumber(row, 'summary'), 0)
				assert.ok(readNumber(row, 'flush') > 0)
			}
			for (const row of listFile('aggregate', 'rows.jsonl')) {
				assert.ok(readNumber(row, 'stage') > 0)
				assert.ok(readNumber(row, 'flush') > 0)
				assert.ok(readNumber(row, 'wall') >= 0)
				assert.ok(readList(row, 'rendered').length > 0)
				assert.ok(readNumber(row, 'summary') > 0)
				assert.ok(readNumber(row, 'entry') > 0)
				assert.ok(readNumber(row, 'last') >= readNumber(row, 'first'))
			}
		})

		it('plans the briefing of the first goal identically in both arms and digests the tail by seed index', () => {
			const control = listFile('records', 'rows.jsonl')
			const aggregate = listFile('aggregate', 'rows.jsonl')
			assert.equal(
				readField(readField(control[0], 'briefing'), 'digest'),
				readField(readField(aggregate[0], 'briefing'), 'digest'),
			)
			assert.equal(
				readField(readField(control[0], 'briefing'), 'tokens'),
				readField(readField(aggregate[0], 'briefing'), 'tokens'),
			)
			assert.equal(readField(control[0], 'tail'), readField(aggregate[0], 'tail'))
			assert.match(String(readField(control[0], 'tail')), /^[0-9a-f]{64}$/)
			const tail = readList(listFile('records', 'selections.jsonl')[0], 'tail')
			assert.ok(tail.length > 0)
			for (const message of tail) {
				assert.equal(isRecord(message) && 'id' in message, false)
				const index = readField(message, 'index')
				assert.ok(index === undefined || typeof index === 'number')
			}
		})

		it('replays a run offline from the cache with the same plan', () => {
			const first = listFile('records', 'rows.jsonl')
			const rows = listFile('offline', 'rows.jsonl')
			assert.equal(rows.length, 2)
			for (const [at, row] of rows.entries()) {
				assert.equal(
					readField(readField(row, 'briefing'), 'digest'),
					readField(readField(first[at], 'briefing'), 'digest'),
				)
				assert.equal(readField(row, 'tail'), readField(first[at], 'tail'))
			}
			const judge = readField(readJSON(join(recall('offline').out, 'run.json')), 'judge')
			assert.deepEqual(readField(judge, 'misses'), {})
		})

		it('refuses an output directory that exists', async () => {
			const outcome = await runBench(stubArgs(['--run', '--live', '--out', recall('records').out]))
			assert.equal(outcome.code, 1)
			assert.match(outcome.stderr, /already exists/)
		})
	})

	describe('summaries pinning', () => {
		it('keeps a name and an id that only the summaries carry out of the block and reports no sole token', () => {
			const rows = listFile('squeeze', 'rows.jsonl')
			const cases = [
				{
					goal: 'g11',
					topic: 'escalations',
					at: 1,
					name: 'Adeyemi',
					summaries: readProse('squeeze', 'escalations', 'g01'),
				},
				{
					goal: 'g19',
					topic: 'delivery',
					at: 2,
					name: 'WKND15',
					summaries: readProse('squeeze', 'delivery', 'g19'),
				},
			]
			for (const { goal, topic, at, name, summaries } of cases) {
				const shown = shownAt('squeeze', goal, at)
				const absent = !shown.toLowerCase().includes(name.toLowerCase())
				assert.ok(summaries.includes(name), `${name} is in the unfiltered prose`)
				const phrases = [name.toLowerCase()]
				assert.deepEqual(expected.get(goal), phrases)
				assert.equal(
					auditLeaks(phrases, summaries, shown),
					absent ? 1 : 0,
					`${goal}: soleScored over the unfiltered prose`,
				)
				assert.equal(
					auditLeaks(phrases, readBlock('squeeze', goal), shown),
					0,
					`${goal}: soleScored over the rendered block`,
				)
				const row = findGoal(rows, goal)
				const selection = listFile('squeeze', 'selections.jsonl').find((entry) =>
					readText(entry, 'goal').startsWith(goal),
				)
				assert.ok(selection !== undefined)
				const bindings = readList(selection, 'aggregates')
				if (absent) {
					assert.ok(readNumber(row, 'filtered') >= 1, `${goal}: filtered`)
					assert.ok(!readList(row, 'rendered').includes(topic), `${goal}: withheld topic`)
					assert.ok(bindings.every((binding) => readText(binding, 'topic') !== topic))
				}
				for (const binding of bindings) {
					const state = readField(binding, 'state')
					const maintenance = listFile('squeeze', 'aggregates.jsonl').find(
						(entry) =>
							['build', 'keep'].includes(readText(entry, 'event')) &&
							readText(entry, 'topic') === readText(binding, 'topic') &&
							readText(entry, 'goal') === readText(state, 'goal') &&
							readField(entry, 'version') === readField(state, 'version'),
					)
					assert.ok(maintenance !== undefined)
					assert.equal(readText(binding, 'prose'), readText(maintenance, 'prose'))
					assert.ok(readBlock('squeeze', goal).includes(readText(maintenance, 'prose')))
				}
				assert.equal(readNumber(row, 'sole'), 0, `${goal}: sole`)
			}
		})
	})

	describe('harness fault', () => {
		it('aborts the run with a fault status after the retry bound and records the failed judge requests', async () => {
			mode.fail = true
			await startRun(
				'fault',
				['--run', '--live', '--retry', '1'],
				GOALS,
				join(directory, 'fault-cache'),
			)
			mode.fail = false
			const run = recall('fault')
			assert.equal(run.outcome.code, 1)
			assert.match(run.outcome.stderr, /harness fault: the judge failed 2 times/)
			assert.equal(readField(readJSON(join(run.out, 'run.json')), 'status'), 'fault')
			assert.equal(listFile('fault', 'rows.jsonl').length, 0)
			const failed = listFile('fault', 'calls.jsonl').filter(
				(call) => readField(call, 'role') === 'judge' && readField(call, 'status') === 500,
			)
			assert.equal(failed.length, 2)
			assert.ok(existsSync(join(run.out, 'messages.jsonl')))
		})
	})

	describe('seed', () => {
		it('asks the judge for the seed and the requests, and a dry run on its cache finds no miss', async () => {
			const store = join(directory, 'seed-cache')
			const out = pick('seed')
			const from = wire.judge.length
			const flags = [
				'--copy',
				'1',
				'--cache',
				store,
				'--fit',
				fit,
				'--settings',
				settings,
				'--goals',
				GOALS,
			]
			const seeded = await runBench(['--seed', '--live', '--url', url, ...flags, '--out', out])
			assert.equal(seeded.code, 0, seeded.stderr)
			assert.ok(wire.judge.length > from)
			assert.ok(readFile(join(out, 'judgments.jsonl')).length > 48)
			assert.ok(
				readFile(join(out, 'calls.jsonl')).every((call) => readField(call, 'role') === 'judge'),
			)
			assert.equal(readField(readJSON(join(out, 'run.json')), 'status'), 'complete')
			const dry = await runBench(['--dry', ...flags])
			assert.equal(dry.code, 0, dry.stderr)
			assert.match(dry.stdout, /misses \{\}; seed-only 0; request 0/)
			assert.match(dry.stdout, /fetches 0/)
		})
	})
})
