import type { JudgeInterface, JudgeRequest, JudgeResult, Message } from '@orkestrel/agent'
import type { SeedMessage } from '../types.js'
import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
	Classifier,
	LEDGER_QUESTIONS,
	createConversationManager,
} from '../../vendor/agent-0.0.30-trimmed/index.js'
import { CORPUS, FIT, HARNESS, JUDGE_MISS, MICA_MODEL, SCENARIO_LONG } from '../constants.js'
import {
	assignCategory,
	buildCacheKey,
	extractHead,
	importCorpus,
	isMessageRole,
	readJSON,
	readRows,
} from '../helpers.js'
import { JudgeCache } from '../JudgeCache.js'

const COPY = join(HARNESS, 'bench', 'variants', 'ledger', 'v1.json')
const V3 = '/home/user/agent/tmp/bench/results/v3/cal-categories.jsonl'
const directory = mkdtempSync(join(tmpdir(), 'bench5-judge-'))
const fetched: string[] = []
globalThis.fetch = async (input) => {
	fetched.push(String(input instanceof Request ? input.url : input))
	throw new Error('fetch is blocked in this proof')
}
let files = 0

after(() => {
	rmSync(directory, { recursive: true, force: true })
	assert.deepEqual(fetched, [])
})

function readField(value: unknown, key: string): unknown {
	return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
}

function readText(value: unknown, key: string): string {
	const field = readField(value, key)
	assert.equal(typeof field, 'string', key)
	return String(field)
}

function pickPath(): string {
	files += 1
	return join(directory, `judge-${files}.jsonl`)
}

function readFile(path: string): readonly unknown[] {
	return existsSync(path) ? readRows(path) : []
}

function askOne(id: string, state: string, instructions = 'Does it hold?'): JudgeRequest {
	return { state, questions: { [id]: { form: 'noul', instructions } } }
}

type Outcome = Error | 'answer' | 'empty'

interface Stub {
	readonly judge: JudgeInterface
	readonly calls: JudgeRequest[]
}

// Replays the outcomes in order, then answers; it implements the judge interface and nothing else.
function createStub(outcomes: readonly Outcome[], model = 'stub-model'): Stub {
	const calls: JudgeRequest[] = []
	const judge: JudgeInterface = {
		id: 'stub',
		name: 'stub judge',
		model,
		async ask(request: JudgeRequest): Promise<JudgeResult> {
			const outcome = outcomes[calls.length] ?? 'answer'
			calls.push(request)
			if (outcome instanceof Error) throw outcome
			const [id] = Object.keys(request.questions)
			if (outcome === 'empty' || id === undefined) return { model, answers: {} }
			return {
				model,
				answers: { [id]: { form: 'noul', noul: 0.8 } },
				usage: { prompt: 5, completion: 1, total: 6 },
			}
		},
	}
	return { judge, calls }
}

const signal = new AbortController().signal

describe('JudgeCache', () => {
	describe('live', () => {
		it('takes id, name, and model from the inner judge', () => {
			const cache = new JudgeCache({
				judge: createStub([]).judge,
				path: pickPath(),
				live: false,
				retry: 0,
			})
			assert.equal(cache.id, 'stub')
			assert.equal(cache.name, 'stub judge')
			assert.equal(cache.model, 'stub-model')
		})

		it('writes a live miss through, then serves the same question as a hit', async () => {
			const path = pickPath()
			const stub = createStub([])
			const cache = new JudgeCache({ judge: stub.judge, path, live: true, retry: 0 })
			const request = askOne('["topic","m1","refunds"]', 'user: refund please')
			const first = await cache.ask(request, signal)
			assert.deepEqual(first.answers, { '["topic","m1","refunds"]': { form: 'noul', noul: 0.8 } })
			assert.equal(stub.calls.length, 1)
			const rows = readFile(path)
			assert.equal(rows.length, 1)
			assert.equal(readField(rows[0], 'origin'), 'live')
			assert.equal(readField(rows[0], 'model'), 'stub-model')
			assert.equal(readField(rows[0], 'state'), 'user: refund please')
			assert.deepEqual(readField(rows[0], 'answer'), { form: 'noul', noul: 0.8 })
			assert.equal(readField(rows[0], 'error'), undefined)
			const second = await cache.ask(request, signal)
			assert.deepEqual(second.answers, first.answers)
			assert.equal(second.model, 'stub-model')
			assert.deepEqual(second.usage, { prompt: 5, completion: 1, total: 6 })
			assert.equal(stub.calls.length, 1)
			assert.equal(readFile(path).length, 1)
			assert.deepEqual(cache.stats(), { hits: { topic: 1 }, misses: { topic: 1 }, transient: 0 })
		})

		it('keys a hit on the content, so a different message id with the same state hits', async () => {
			const stub = createStub([])
			const cache = new JudgeCache({ judge: stub.judge, path: pickPath(), live: true, retry: 0 })
			await cache.ask(askOne('["topic","m1","refunds"]', 'user: same'), signal)
			const other = await cache.ask(askOne('["topic","m9","refunds"]', 'user: same'), signal)
			assert.deepEqual(Object.keys(other.answers), ['["topic","m9","refunds"]'])
			assert.equal(stub.calls.length, 1)
			await cache.ask(askOne('["topic","m1","refunds"]', 'user: other'), signal)
			await cache.ask(askOne('["topic","m1","refunds"]', 'user: same', 'Another question?'), signal)
			assert.equal(stub.calls.length, 3)
		})

		it('counts hits and misses per head and files an unparseable key under other', async () => {
			const cache = new JudgeCache({
				judge: createStub([]).judge,
				path: pickPath(),
				live: true,
				retry: 0,
			})
			await cache.ask(askOne('["category","m1"]', 's1'), signal)
			await cache.ask(askOne('["category","m1"]', 's1'), signal)
			await cache.ask(askOne('["amends","m1","m2"]', 's2'), signal)
			await cache.ask(askOne('plain key', 's3'), signal)
			assert.deepEqual(cache.stats(), {
				hits: { category: 1 },
				misses: { category: 1, amends: 1, other: 1 },
				transient: 0,
			})
		})

		it('serves a recorded answer after a reload', async () => {
			const path = pickPath()
			const writer = new JudgeCache({ judge: createStub([]).judge, path, live: true, retry: 0 })
			const request = askOne('["topic","m1","refunds"]', 'persisted')
			await writer.ask(request, signal)
			const stub = createStub([])
			const reader = new JudgeCache({ judge: stub.judge, path, live: false, retry: 0 })
			const result = await reader.ask(request, signal)
			assert.deepEqual(result.answers, { '["topic","m1","refunds"]': { form: 'noul', noul: 0.8 } })
			assert.equal(stub.calls.length, 0)
		})

		it('replays a recorded refusal under the id of the new request', async () => {
			const path = pickPath()
			const question = { form: 'noul' as const, instructions: 'Does it hold?' }
			const row = {
				key: buildCacheKey('stub-model', 'refused state', question),
				model: 'stub-model',
				state: 'refused state',
				question,
				refusal: { missing: ['old-id'] },
				wall: 1,
				origin: 'live',
				at: 1,
			}
			writeFileSync(path, `${JSON.stringify(row)}\n`)
			const cache = new JudgeCache({ judge: createStub([]).judge, path, live: false, retry: 0 })
			const result = await cache.ask(askOne('new-id', 'refused state'), signal)
			assert.deepEqual(result.answers, {})
			assert.deepEqual(result.refusals, { 'new-id': { missing: ['old-id'] } })
		})

		it('rethrows a recorded error row as an error carrying the recorded text', async () => {
			const path = pickPath()
			const stub = createStub([new Error('invalid or duplicate top logprob token')])
			const cache = new JudgeCache({ judge: stub.judge, path, live: true, retry: 2 })
			const request = askOne('["topic","m1","warehouse"]', 'held')
			await assert.rejects(cache.ask(request, signal), /invalid or duplicate top logprob token/)
			assert.equal(stub.calls.length, 1)
			const rows = readFile(path)
			assert.equal(rows.length, 1)
			assert.match(readText(rows[0], 'error'), /invalid or duplicate top logprob token/)
			assert.equal(readField(rows[0], 'answer'), undefined)
			await assert.rejects(cache.ask(request, signal), /invalid or duplicate top logprob token/)
			assert.equal(stub.calls.length, 1)
			assert.equal(readFile(path).length, 1)
			const reloaded = new JudgeCache({ judge: createStub([]).judge, path, live: false, retry: 0 })
			await assert.rejects(reloaded.ask(request, signal), /invalid or duplicate top logprob token/)
			assert.equal(cache.stats().transient, 0)
		})
	})

	describe('transient errors', () => {
		it('retries a transient error and appends one answer row and no error row', async () => {
			const path = pickPath()
			const stub = createStub([new Error('socket hang up')])
			const cache = new JudgeCache({ judge: stub.judge, path, live: true, retry: 2 })
			const result = await cache.ask(askOne('["category","m1"]', 'retried'), signal)
			assert.equal(Object.keys(result.answers).length, 1)
			assert.equal(stub.calls.length, 2)
			const rows = readFile(path)
			assert.equal(rows.length, 1)
			assert.ok(readField(rows[0], 'answer') !== undefined)
			assert.equal(readField(rows[0], 'error'), undefined)
			assert.equal(cache.stats().transient, 1)
			assert.equal(cache.fault, undefined)
		})

		it('retries a result that lacks the question', async () => {
			const path = pickPath()
			const stub = createStub(['empty'])
			const cache = new JudgeCache({ judge: stub.judge, path, live: true, retry: 1 })
			await cache.ask(askOne('["category","m1"]', 'lacking'), signal)
			assert.equal(stub.calls.length, 2)
			assert.equal(readFile(path).length, 1)
			assert.equal(cache.stats().transient, 1)
		})

		it('faults after the retry bound, appends nothing, and stops asking the inner judge', async () => {
			const path = pickPath()
			const failure = new Error('connection refused')
			const stub = createStub([failure, failure, failure, failure])
			const faults: Error[] = []
			const cache = new JudgeCache({
				judge: stub.judge,
				path,
				live: true,
				retry: 1,
				abort: (fault) => faults.push(fault),
			})
			await assert.rejects(
				cache.ask(askOne('["category","m1"]', 'doomed'), signal),
				/harness fault/,
			)
			assert.equal(stub.calls.length, 2)
			assert.deepEqual(readFile(path), [])
			assert.equal(cache.stats().transient, 2)
			assert.equal(faults.length, 1)
			assert.equal(cache.fault, faults[0])
			assert.equal(faults[0]?.cause, failure)
			await assert.rejects(cache.ask(askOne('["category","m2"]', 'next'), signal), /harness fault/)
			assert.equal(stub.calls.length, 2)
			assert.equal(faults.length, 1)
		})

		it('lets a cached answer through after a fault', async () => {
			const path = pickPath()
			const stub = createStub(['answer', new Error('down'), new Error('down')])
			const cache = new JudgeCache({ judge: stub.judge, path, live: true, retry: 1 })
			await cache.ask(askOne('["category","m1"]', 'kept'), signal)
			await assert.rejects(cache.ask(askOne('["category","m2"]', 'lost'), signal), /harness fault/)
			const again = await cache.ask(askOne('["category","m1"]', 'kept'), signal)
			assert.equal(Object.keys(again.answers).length, 1)
		})

		it('rethrows a failure under an aborted signal without a retry, a row, or a count', async () => {
			const path = pickPath()
			const stub = createStub([new Error('aborted by caller')])
			const cache = new JudgeCache({ judge: stub.judge, path, live: true, retry: 3 })
			const controller = new AbortController()
			controller.abort()
			await assert.rejects(
				cache.ask(askOne('["category","m1"]', 'stopped'), controller.signal),
				/aborted by caller/,
			)
			assert.equal(stub.calls.length, 1)
			assert.deepEqual(readFile(path), [])
			assert.equal(cache.stats().transient, 0)
			assert.equal(cache.fault, undefined)
		})
	})

	describe('offline', () => {
		it('throws the miss error, asks nobody, writes nothing, and fetches nothing', async () => {
			const path = pickPath()
			const stub = createStub([])
			const cache = new JudgeCache({ judge: stub.judge, path, live: false, retry: 2 })
			await assert.rejects(
				cache.ask(askOne('["topic","m1","refunds"]', 'unseen'), signal),
				new Error(JUDGE_MISS),
			)
			assert.equal(stub.calls.length, 0)
			assert.equal(existsSync(path), false)
			assert.deepEqual(fetched, [])
			assert.deepEqual(cache.stats(), { hits: {}, misses: { topic: 1 }, transient: 0 })
		})
	})

	describe('requests', () => {
		it('refuses a request with more than one question', async () => {
			const stub = createStub([])
			const cache = new JudgeCache({ judge: stub.judge, path: pickPath(), live: true, retry: 0 })
			const request: JudgeRequest = {
				state: 's',
				questions: { a: { form: 'noul' }, b: { form: 'noul' } },
			}
			await assert.rejects(cache.ask(request, signal), /expected one question, received 2/)
			assert.equal(stub.calls.length, 0)
		})

		it('answers a request with no question with an empty result', async () => {
			const cache = new JudgeCache({
				judge: createStub([]).judge,
				path: pickPath(),
				live: false,
				retry: 0,
			})
			assert.deepEqual(await cache.ask({ state: 's', questions: {} }, signal), {
				model: 'stub-model',
				answers: {},
			})
		})

		it('skips a malformed row when it loads the file', async () => {
			const path = pickPath()
			writeFileSync(path, '{"key":"k"}\n{"model":"m"}\n')
			const stub = createStub([])
			const cache = new JudgeCache({ judge: stub.judge, path, live: true, retry: 0 })
			await cache.ask(askOne('["category","m1"]', 'fresh'), signal)
			assert.equal(stub.calls.length, 1)
		})
	})

	describe('corpus', () => {
		const seed = readSeed()
		const topics = readTopics()
		const path = pickPath()
		const rows = readRows(CORPUS)
		const imported = importCorpus(rows, seed, topics, MICA_MODEL)

		it('prints the digests of the corpus and its source copy', (t) => {
			const local = createHash('sha256').update(readFileSync(CORPUS)).digest('hex')
			t.diagnostic(`data/cal-categories.jsonl sha256 ${local}`)
			if (!existsSync(V3)) {
				t.diagnostic(`${V3} is absent on this host`)
				return
			}
			const source = createHash('sha256').update(readFileSync(V3)).digest('hex')
			t.diagnostic(`${V3} sha256 ${source}`)
			assert.equal(local, source)
		})

		it('classifies the first 48 messages with misses only on questions the corpus lacks', async (t) => {
			writeFileSync(path, imported.map((row) => `${JSON.stringify(row)}\n`).join(''))
			const inner = createStub([], MICA_MODEL)
			const cache = new JudgeCache({ judge: inner.judge, path, live: false, retry: 0 })
			const missed: string[] = []
			const judge: JudgeInterface = {
				id: cache.id,
				name: cache.name,
				model: cache.model,
				async ask(request, abort) {
					try {
						return await cache.ask(request, abort)
					} catch (error) {
						if (error instanceof Error && error.message === JUDGE_MISS)
							missed.push(...Object.keys(request.questions))
						throw error
					}
				},
			}
			const conversation = createConversationManager().add()
			const messages: readonly Message[] = conversation.add(
				seed.slice(0, 48).map((message) => ({ ...message })),
			)
			const indexes = new Map<string, number>(messages.map((message, index) => [message.id, index]))
			const classifier = new Classifier({
				conversation,
				judge,
				questions: LEDGER_QUESTIONS,
				topics: topics.map((topic) => ({ ...topic, requested: topic.name !== 'warehouse' })),
				thresholds: FIT,
				assign: (message: Message) =>
					assignCategory(message, conversation.messages(), new Set(), new Set(), new Map()),
				entities: () => new Set<string>(),
			})
			const result = await classifier.classify(new Set(), signal)
			assert.equal(result.fault, undefined)
			const forward = new Set<number>()
			const covered = new Set<string>()
			for (const row of rows) {
				if (readField(row, 'question') === 'category' && readField(row, 'order') === 'forward')
					forward.add(Number(readField(row, 'index')))
				if (readField(row, 'question') === 'topic')
					covered.add(`${readField(row, 'index')} ${readField(row, 'topic')}`)
			}
			t.diagnostic(
				`misses ${missed.length}: ${missed.map((id) => describeMiss(id, indexes)).join(', ')}`,
			)
			assert.ok(
				cache.stats().hits['category'] !== undefined && cache.stats().hits['topic'] !== undefined,
			)
			for (const id of missed) {
				const key: unknown = JSON.parse(id)
				assert.ok(Array.isArray(key))
				const index = indexes.get(String(key[1]))
				assert.ok(index !== undefined, id)
				if (extractHead(id) === 'category')
					assert.ok(!forward.has(index), `category question for covered message ${index}`)
				if (extractHead(id) === 'topic')
					assert.ok(
						!covered.has(`${index} ${String(key[2])}`),
						`topic question for covered message ${index}`,
					)
			}
			assert.equal(inner.calls.length, 0)
			const asked = messages.filter(
				(message: Message) => classifier.category(message.id) !== undefined,
			)
			assert.ok(asked.length > 0)
		})
	})
})

function describeMiss(id: string, indexes: ReadonlyMap<string, number>): string {
	const key: unknown = JSON.parse(id)
	if (!Array.isArray(key)) return id
	return [key[0], ...key.slice(1).map((part) => indexes.get(String(part)) ?? part)].join(' ')
}

function readSeed(): readonly SeedMessage[] {
	const seed = readField(readJSON(SCENARIO_LONG), 'seed')
	assert.ok(Array.isArray(seed))
	return seed.map((message) => {
		const calls = readField(message, 'calls')
		const call = readField(message, 'call')
		const role = readField(message, 'role')
		assert.ok(isMessageRole(role), String(role))
		return {
			role,
			content: readText(message, 'content'),
			...(Array.isArray(calls) ? { calls } : {}),
			...(typeof call === 'string' ? { call } : {}),
		}
	})
}

function readTopics(): ReadonlyArray<{ readonly name: string; readonly criterion: string }> {
	const topics = readField(readField(readJSON(COPY), 'ledger'), 'topics')
	assert.ok(typeof topics === 'object' && topics !== null)
	return Object.entries(topics).map(([name, criterion]) => ({ name, criterion: String(criterion) }))
}
