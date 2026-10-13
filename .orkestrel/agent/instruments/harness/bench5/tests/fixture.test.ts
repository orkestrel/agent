import type { Message } from '../../vendor/agent-0.0.30-trimmed/index.js'
import type { Fixture, FixtureOptions } from './fixture.js'
import { after, afterEach, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createOllama } from '../../vendor/ollama/index.js'
import {
	collectContents,
	loadExchange,
	readSystem,
	replaceContent,
	selectTopic,
	startFixture,
} from './fixture.js'

const RECORDING = join(import.meta.dirname, 'data', 'chat-final.json')
const PREFIX = 'You write one topic summary for the support shift.'
const SUMMARIES = Object.freeze({
	'Luis Ferreira': 'Luis Ferreira holds order LH-79215 and has a full refund.',
	Luis: 'The short topic summary.',
	'Carrier depots': 'Tomasz Brennan releases shipments held at a depot.',
})
const original = globalThis.fetch
const blocked: string[] = []

function guardFetch(input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> {
	const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
	if (/:11434\b/.test(url)) {
		blocked.push(url)
		return Promise.reject(new Error(`blocked daemon request ${url}`))
	}
	return original(input, init)
}

function readRecording(): {
	readonly body: string
	readonly stream: unknown
	readonly contentType: unknown
} {
	const value: unknown = JSON.parse(readFileSync(RECORDING, 'utf8'))
	assert.ok(typeof value === 'object' && value !== null)
	const body = Reflect.get(value, 'body')
	assert.equal(typeof body, 'string')
	return {
		body: String(body),
		stream: Reflect.get(value, 'stream'),
		contentType: Reflect.get(value, 'contentType'),
	}
}

// Joins the content of every NDJSON record the way a client assembles the reply.
function assembleContent(body: string): string {
	return body
		.split('\n')
		.filter((line) => line !== '')
		.map((line): string => {
			const record: unknown = JSON.parse(line)
			const message =
				typeof record === 'object' && record !== null ? Reflect.get(record, 'message') : undefined
			const content =
				typeof message === 'object' && message !== null
					? Reflect.get(message, 'content')
					: undefined
			return typeof content === 'string' ? content : ''
		})
		.join('')
}

async function withFixture(
	options: FixtureOptions,
	work: (fixture: Fixture) => Promise<void>,
): Promise<void> {
	const fixture = await startFixture(options)
	try {
		await work(fixture)
	} finally {
		await fixture.close()
	}
}

async function generate(
	url: string,
	system: string,
	user: string,
	options: Readonly<Record<string, number>>,
): Promise<{ readonly content: unknown; readonly prompt: unknown; readonly total: unknown }> {
	const provider = createOllama({ url, model: 'gemma4:e2b-it-q4_K_M', options })
	const messages: readonly Message[] = [
		{ id: 's', role: 'system', content: system },
		{ id: 'u', role: 'user', content: user },
	]
	const result: unknown = await provider.generate(messages, new AbortController().signal)
	assert.ok(typeof result === 'object' && result !== null)
	const usage = Reflect.get(result, 'usage')
	assert.ok(typeof usage === 'object' && usage !== null)
	return {
		content: Reflect.get(result, 'content'),
		prompt: Reflect.get(usage, 'prompt'),
		total: Reflect.get(usage, 'total'),
	}
}

function postChat(url: string, body: unknown): Promise<Response> {
	return fetch(`${url}/api/chat`, {
		method: 'POST',
		body: typeof body === 'string' ? body : JSON.stringify(body),
	})
}

describe('startFixture', () => {
	before(() => {
		globalThis.fetch = guardFetch
	})

	afterEach(() => {
		assert.deepEqual(blocked, [])
	})

	after(() => {
		globalThis.fetch = original
	})

	it('control: the guard rejects a :11434 request, including the provider default URL', async () => {
		await assert.rejects(guardFetch('http://127.0.0.1:11434/api/chat'), /blocked daemon request/)
		await assert.rejects(
			createOllama({ model: 'gemma4:e2b-it-q4_K_M' }).generate(
				[{ id: 'u', role: 'user', content: 'hi' }],
				new AbortController().signal,
			),
		)
		assert.equal(blocked.length, 2)
		blocked.length = 0
	})

	it('serves the recorded reply and usage to the vendored provider and records the request body', async () => {
		const recording = readRecording()
		const expected = assembleContent(recording.body)
		assert.ok(expected.length > 0)
		await withFixture({}, async (fixture) => {
			const reply = await generate(fixture.url, 'Answer briefly.', 'Reach Sigrid?', {
				temperature: 0,
				num_ctx: 3072,
			})
			assert.equal(reply.content, expected)
			assert.ok(typeof reply.prompt === 'number' && reply.prompt > 0)
			assert.equal(fixture.requests.length, 1)
			const body = fixture.requests[0]
			assert.ok(typeof body === 'object' && body !== null)
			assert.equal(Reflect.get(body, 'stream'), true)
			assert.equal(Reflect.get(body, 'model'), 'gemma4:e2b-it-q4_K_M')
			assert.deepEqual(collectContents(body), ['Answer briefly.', 'Reach Sigrid?'])
			assert.deepEqual(Reflect.get(body, 'options'), { temperature: 0, num_ctx: 3072 })
		})
	})

	it('returns usage for a num_predict 1 request and records the cap', async () => {
		await withFixture({}, async (fixture) => {
			const reply = await generate(fixture.url, 'Flush.', '', { num_ctx: 3072, num_predict: 1 })
			assert.ok(typeof reply.prompt === 'number' && reply.prompt > 0)
			assert.ok(typeof reply.total === 'number' && reply.total >= Number(reply.prompt))
			const body = fixture.requests[0]
			assert.ok(typeof body === 'object' && body !== null)
			assert.equal(Reflect.get(Reflect.get(body, 'options'), 'num_predict'), 1)
		})
	})

	it('replays the recorded status, content type, and body bytes', async () => {
		const recording = readRecording()
		assert.equal(recording.stream, true)
		assert.equal(recording.contentType, 'application/x-ndjson')
		await withFixture({}, async (fixture) => {
			const response = await postChat(fixture.url, { model: 'any', messages: [], stream: true })
			assert.equal(response.status, 200)
			assert.equal(response.headers.get('content-type'), 'application/x-ndjson')
			assert.equal(await response.text(), recording.body)
		})
	})

	it('carries a final record whose prompt_eval_count is a number', () => {
		const lines = loadExchange()
			.body.split('\n')
			.filter((line) => line !== '')
		const last: unknown = JSON.parse(lines[lines.length - 1] ?? 'null')
		assert.ok(typeof last === 'object' && last !== null)
		assert.equal(Reflect.get(last, 'done'), true)
		assert.equal(typeof Reflect.get(last, 'prompt_eval_count'), 'number')
	})

	it('refuses a request whose stream flag differs from the recording with 400 naming the mismatch', async () => {
		await withFixture({}, async (fixture) => {
			const response = await postChat(fixture.url, { model: 'any', messages: [], stream: false })
			assert.equal(response.status, 400)
			assert.match(
				await response.text(),
				/stream flag mismatch: request stream false, recording stream true/,
			)
			assert.equal(fixture.requests.length, 1)
		})
	})

	it('refuses a body that is not a JSON object and records its text', async () => {
		await withFixture({}, async (fixture) => {
			const response = await postChat(fixture.url, 'not json')
			assert.equal(response.status, 400)
			assert.deepEqual(fixture.requests, ['not json'])
		})
	})

	it('answers /api/generate and any other path with 404 and records the body', async () => {
		await withFixture({}, async (fixture) => {
			const generated = await fetch(`${fixture.url}/api/generate`, {
				method: 'POST',
				body: JSON.stringify({ model: 'any', prompt: 'p' }),
			})
			assert.equal(generated.status, 404)
			const listed = await fetch(`${fixture.url}/api/tags`)
			assert.equal(listed.status, 404)
			const chatted = await fetch(`${fixture.url}/api/chat`)
			assert.equal(chatted.status, 404)
			assert.deepEqual(fixture.requests, [{ model: 'any', prompt: 'p' }, '', ''])
		})
	})

	it('answers a summarizer request with the summary of the longest topic named in it', async () => {
		const recording = readRecording()
		await withFixture({ summaries: SUMMARIES, prefix: PREFIX }, async (fixture) => {
			const reply = await generate(
				fixture.url,
				`${PREFIX} Topic: Luis Ferreira. As of 2026-10-08.`,
				'Sources follow.',
				{ temperature: 0 },
			)
			assert.equal(reply.content, SUMMARIES['Luis Ferreira'])
			assert.ok(typeof reply.prompt === 'number' && reply.prompt > 0)
			const other = await generate(
				fixture.url,
				`${PREFIX} Topic: Carrier depots.`,
				'Sources follow.',
				{ temperature: 0 },
			)
			assert.equal(other.content, SUMMARIES['Carrier depots'])
			const plain = await generate(
				fixture.url,
				'You are the operations assistant. Luis Ferreira asks.',
				'Hello',
				{ temperature: 0 },
			)
			assert.equal(plain.content, assembleContent(recording.body))
			assert.equal(readSystem(fixture.requests[0])?.startsWith(PREFIX), true)
		})
	})

	it('selects a summary from the user message when the system text omits the topic', async () => {
		await withFixture({ summaries: SUMMARIES, prefix: PREFIX }, async (fixture) => {
			const reply = await generate(fixture.url, PREFIX, 'Topic: Carrier depots', { temperature: 0 })
			assert.equal(reply.content, SUMMARIES['Carrier depots'])
		})
	})

	it('refuses a summarizer request that names no topic with 400', async () => {
		await withFixture({ summaries: SUMMARIES, prefix: PREFIX }, async (fixture) => {
			const response = await postChat(fixture.url, {
				model: 'any',
				stream: true,
				messages: [{ role: 'system', content: `${PREFIX} Topic: Warehouse.` }],
			})
			assert.equal(response.status, 400)
			assert.match(await response.text(), /no summary topic occurs/)
		})
	})

	it('throws when summaries are given without a prefix', async () => {
		await assert.rejects(startFixture({ summaries: SUMMARIES }), /summaries need a prefix/)
	})

	it('stops listening after close', async () => {
		const fixture = await startFixture()
		const url = fixture.url
		await fixture.close()
		await assert.rejects(postChat(url, { stream: true }))
	})
})

describe('fixture helpers', () => {
	it('replaceContent keeps every record, puts the summary in the first content record, and keeps the final record', () => {
		const body = loadExchange().body
		const replaced = replaceContent(body, 'Only this.')
		const recorded = body.split('\n').filter((line) => line !== '')
		const rewritten = replaced.split('\n').filter((line) => line !== '')
		assert.equal(rewritten.length, recorded.length)
		assert.equal(assembleContent(replaced), 'Only this.')
		assert.equal(rewritten[rewritten.length - 1], recorded[recorded.length - 1])
		assert.ok(replaced.endsWith('\n'))
	})

	it('replaceContent throws on a body with no content record', () => {
		assert.throws(
			() => replaceContent('{"message":{"content":""},"done":true}\n', 'x'),
			/no content record/,
		)
	})

	it('selectTopic returns the longest occurring name, skips an empty name, and returns undefined on no match', () => {
		assert.equal(selectTopic(['Luis', 'Luis Ferreira'], 'about Luis Ferreira'), 'Luis Ferreira')
		assert.equal(selectTopic(['Luis Ferreira', 'Luis'], 'about Luis Ferreira'), 'Luis Ferreira')
		assert.equal(selectTopic([''], 'text'), undefined)
		assert.equal(selectTopic(['Carrier'], 'text'), undefined)
	})

	it('readSystem and collectContents return nothing for a body without messages', () => {
		assert.equal(readSystem({}), undefined)
		assert.equal(readSystem(undefined), undefined)
		assert.deepEqual(collectContents('text'), [])
		assert.equal(readSystem({ messages: [{ role: 'user', content: 'u' }] }), undefined)
	})
})
