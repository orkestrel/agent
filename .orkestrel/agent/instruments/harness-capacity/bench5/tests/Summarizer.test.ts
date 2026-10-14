import type { Message } from '../../vendor/agent-0.0.30-trimmed/index.js'
import type { Fixture } from './fixture.js'
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createOllama } from '../../vendor/ollama/index.js'
import { DAEMON, SAMPLER } from '../constants.js'
import { readRows } from '../helpers.js'
import { Summarizer } from '../Summarizer.js'
import { startFixture } from './fixture.js'

const MODEL = 'gemma4:e2b-it-q4_K_M'
const PREFIX = 'You maintain a short summary'
const PREDICT = 160
const TOPIC = 'Marcus Halvorsen refund'
const SUMMARY = 'Marcus Halvorsen was refunded 42.50 on order LK-1042 on 2026-10-08.'
const PADDED = `  ${SUMMARY}\n\n`
const OTHER = 'Dana Ostrow escalation'
const directory = mkdtempSync(join(tmpdir(), 'bench5-summarizer-'))
const nativeFetch = globalThis.fetch
const fetched: string[] = []
let files = 0
let fixture: Fixture

// Blocks the daemon port and passes every other address through, so the fixture stays reachable.
globalThis.fetch = async (input, init) => {
	const url = String(input instanceof Request ? input.url : input)
	fetched.push(url)
	if (url.includes(':11434')) throw new Error('the daemon at :11434 is blocked in this proof')
	return await nativeFetch(input, init)
}

before(async () => {
	fixture = await startFixture({ prefix: PREFIX, summaries: { [TOPIC]: PADDED, [OTHER]: SUMMARY } })
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

function pickPath(): string {
	files += 1
	return join(directory, `nested-${files}`, 'summary.jsonl')
}

function buildMessages(topic: string, line = 'Marcus got the refund.'): readonly Message[] {
	return [
		{
			id: 's1',
			role: 'system',
			content: `${PREFIX} of what a support desk's messages establish about ${topic} as of 2026-10-08.`,
		},
		{ id: 'u1', role: 'user', content: `(Thu) customer: ${line}` },
	]
}

function buildSummarizer(
	path: string,
	live: boolean,
	predict = PREDICT,
	url = fixture.url,
): Summarizer {
	const provider = createOllama({
		model: MODEL,
		url,
		options: { ...SAMPLER, num_predict: predict },
	})
	return new Summarizer({ provider, model: MODEL, sampler: SAMPLER, predict, cache: path, live })
}

function signal(): AbortSignal {
	return AbortSignal.timeout(10000)
}

function readField(value: unknown, key: string): unknown {
	return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
}

describe('Summarizer', () => {
	it('answers a live miss with the fixture summary, trimmed, and keeps the raw output', async () => {
		const path = pickPath()
		const count = fixture.requests.length
		const result = await buildSummarizer(path, true).summarize(buildMessages(TOPIC), signal())
		assert.equal(result.prose, SUMMARY)
		assert.equal(result.raw, PADDED)
		assert.equal(result.cached, false)
		assert.ok(result.wall >= 0)
		assert.equal(fixture.requests.length - count, 1)
		assert.equal(typeof result.usage?.prompt, 'number')
		assert.equal(typeof result.usage?.completion, 'number')
	})

	it('answers a repeat from the cache without a fixture request', async () => {
		const path = pickPath()
		const summarizer = buildSummarizer(path, true)
		const first = await summarizer.summarize(buildMessages(TOPIC), signal())
		const count = fixture.requests.length
		const second = await summarizer.summarize(buildMessages(TOPIC), signal())
		assert.equal(fixture.requests.length, count)
		assert.equal(second.cached, true)
		assert.equal(second.prose, first.prose)
		assert.equal(second.raw, first.raw)
		assert.deepEqual(second.usage, first.usage)
		assert.equal(second.wall, first.wall)
		assert.equal(readRows(path).length, 1)
	})

	it('answers an offline instance from the rows file a live instance wrote', async () => {
		const path = pickPath()
		const live = await buildSummarizer(path, true).summarize(buildMessages(TOPIC), signal())
		const count = fixture.requests.length
		const offline = await buildSummarizer(path, false).summarize(buildMessages(TOPIC), signal())
		assert.equal(fixture.requests.length, count)
		assert.equal(offline.cached, true)
		assert.equal(offline.prose, live.prose)
	})

	it('throws on an offline miss, with no request and no file', async () => {
		const path = pickPath()
		const count = fixture.requests.length
		await assert.rejects(
			buildSummarizer(path, false).summarize(buildMessages(TOPIC), signal()),
			/^Error: summary cache miss$/,
		)
		assert.equal(fixture.requests.length, count)
		assert.equal(existsSync(path), false)
	})

	it('records think false, the sampler, num_predict, the model, and the messages in the request body', async () => {
		const path = pickPath()
		const messages = buildMessages(OTHER, 'Dana asked for a manager.')
		await buildSummarizer(path, true).summarize(messages, signal())
		const body = fixture.requests[fixture.requests.length - 1]
		assert.equal(readField(body, 'think'), false)
		assert.equal(readField(body, 'model'), MODEL)
		assert.equal(readField(body, 'stream'), true)
		assert.deepEqual(readField(body, 'options'), { ...SAMPLER, num_predict: PREDICT })
		const sent = readField(body, 'messages')
		assert.ok(Array.isArray(sent))
		assert.deepEqual(
			sent.map((message) => [readField(message, 'role'), readField(message, 'content')]),
			messages.map((message) => [message.role, message.content]),
		)
	})

	it('keys the cache by message content, role, model, sampler, and predict', async () => {
		const path = pickPath()
		await buildSummarizer(path, true).summarize(buildMessages(TOPIC), signal())
		const offline = buildSummarizer(path, false)
		await assert.rejects(
			offline.summarize(buildMessages(TOPIC, 'Marcus got a different refund.'), signal()),
			/summary cache miss/,
		)
		await assert.rejects(
			buildSummarizer(path, false, PREDICT + 16).summarize(buildMessages(TOPIC), signal()),
			/summary cache miss/,
		)
		const reversed = buildMessages(TOPIC).map((message): Message => ({ ...message, role: 'user' }))
		await assert.rejects(offline.summarize(reversed, signal()), /summary cache miss/)
		const provider = createOllama({
			model: 'other-model',
			url: fixture.url,
			options: { ...SAMPLER, num_predict: PREDICT },
		})
		const renamed = new Summarizer({
			provider,
			model: 'other-model',
			sampler: SAMPLER,
			predict: PREDICT,
			cache: path,
			live: false,
		})
		await assert.rejects(renamed.summarize(buildMessages(TOPIC), signal()), /summary cache miss/)
		const reseeded = new Summarizer({
			provider,
			model: MODEL,
			sampler: { ...SAMPLER, seed: 8 },
			predict: PREDICT,
			cache: path,
			live: false,
		})
		await assert.rejects(reseeded.summarize(buildMessages(TOPIC), signal()), /summary cache miss/)
		assert.equal((await offline.summarize(buildMessages(TOPIC), signal())).cached, true)
	})

	it('appends no row when the provider fails, and answers a later call', async () => {
		const path = pickPath()
		const summarizer = buildSummarizer(path, true)
		await assert.rejects(summarizer.summarize(buildMessages('no such topic'), signal()))
		assert.equal(existsSync(path) ? readRows(path).length : 0, 0)
		const result = await summarizer.summarize(buildMessages(TOPIC), signal())
		assert.equal(result.cached, false)
		assert.equal(readRows(path).length, 1)
	})

	it('appends no row when the caller aborts', async () => {
		const path = pickPath()
		const controller = new AbortController()
		controller.abort()
		await assert.rejects(
			buildSummarizer(path, true).summarize(buildMessages(TOPIC), controller.signal),
		)
		assert.equal(existsSync(path) ? readRows(path).length : 0, 0)
	})

	it('skips rows that fail the guard and keeps the valid ones', async () => {
		const path = pickPath()
		const messages = buildMessages(TOPIC)
		await buildSummarizer(path, true).summarize(messages, signal())
		const [row] = readRows(path)
		const lines = [
			JSON.stringify({ key: 1 }),
			JSON.stringify({
				...(typeof row === 'object' ? row : {}),
				key: 'broken',
				usage: { prompt: 'x' },
			}),
			'',
			readFileSync(path, 'utf8').trim(),
		]
		writeFileSync(path, `${lines.join('\n')}\n`)
		const result = await buildSummarizer(path, false).summarize(messages, signal())
		assert.equal(result.cached, true)
		assert.equal(result.prose, SUMMARY)
	})

	it('writes one row per live call with the key fields', async () => {
		const path = pickPath()
		await buildSummarizer(path, true).summarize(buildMessages(TOPIC), signal())
		const [row] = readRows(path)
		assert.equal(readField(row, 'model'), MODEL)
		assert.equal(readField(row, 'predict'), PREDICT)
		assert.deepEqual(readField(row, 'sampler'), SAMPLER)
		assert.equal(readField(row, 'origin'), 'live')
		assert.equal(readField(row, 'prose'), SUMMARY)
		assert.equal(readField(row, 'raw'), PADDED)
		assert.match(String(readField(row, 'key')), /^[0-9a-f]{64}$/)
	})

	it('never requests the daemon address', () => {
		assert.deepEqual(
			fetched.filter((url) => url.startsWith(DAEMON)),
			[],
		)
		assert.ok(fetched.length > 0)
	})
})
