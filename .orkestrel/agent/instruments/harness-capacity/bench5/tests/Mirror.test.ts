import type { JudgeInterface, Message } from '../../vendor/agent-0.0.30-trimmed/index.js'
import type { Fixture } from './fixture.js'
import type { MirrorRead, ScenarioLookups, SeedMessage } from '../types.js'
import type { ToolResult } from '@orkestrel/tool'
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTool } from '@orkestrel/tool'
import {
	LEDGER_NOTES,
	LEDGER_OWNER_PREFIX,
	LEDGER_QUESTIONS,
	LEDGER_RULES_KEY,
	createLedger,
} from '../../vendor/agent-0.0.30-trimmed/index.js'
import { createOllama } from '../../vendor/ollama/index.js'
import { CORPUS, FIT, HARNESS, MICA_MODEL, MODELS, SAMPLER, SCENARIO_LONG } from '../constants.js'
import {
	buildSystem,
	importCorpus,
	isMessageRole,
	readJSON,
	readLookup,
	readRows,
	resolveLookup,
} from '../helpers.js'
import { JudgeCache } from '../JudgeCache.js'
import { Mirror } from '../Mirror.js'
import { startFixture } from './fixture.js'

const COPY = join(HARNESS, 'bench', 'variants', 'ledger', 'v1.json')
const SEEDED = 48
const POSITION = SEEDED - 1
const LOOKUPS = Object.freeze({ lookup_order: 'id', lookup_customer: 'account' })
const daemon: string[] = []
const original = globalThis.fetch
const directory = mkdtempSync(join(tmpdir(), 'bench5-mirror-'))
let files = 0

// Blocks the model daemon and lets the fixture on its ephemeral port through.
function guardFetch(input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> {
	const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
	if (/:11434\b/.test(url)) {
		daemon.push(url)
		return Promise.reject(new Error(`blocked daemon request ${url}`))
	}
	return original(input, init)
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

function readSeed(scenario: unknown): readonly SeedMessage[] {
	return readList(scenario, 'seed').map((message) => {
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

function readTables(scenario: unknown): ScenarioLookups {
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

function readTopics(): ReadonlyArray<{
	readonly name: string
	readonly criterion: string
	readonly requested: boolean
}> {
	const topics = readField(readField(readJSON(COPY), 'ledger'), 'topics')
	assert.ok(typeof topics === 'object' && topics !== null)
	return Object.entries(topics).map(([name, criterion]) => ({
		name,
		criterion: String(criterion),
		requested: name !== 'warehouse',
	}))
}

// Parses the briefing's owner records into title and raw lines; a blank line ends a record.
function parseOwners(briefing: string): ReadonlyMap<string, readonly string[]> {
	const owners = new Map<string, string[]>()
	let current: string[] | undefined
	for (const line of briefing.split('\n')) {
		if (line.startsWith('### ')) {
			current = []
			owners.set(line.slice(4), current)
		} else if (line === '' || line.startsWith('## ')) {
			current = undefined
		} else {
			current?.push(line)
		}
	}
	return owners
}

function weighQuiet(judgment: unknown): number {
	const answer = readField(judgment, 'answer')
	const probabilities = readField(answer, 'probabilities')
	if (
		readField(answer, 'form') !== 'choice' ||
		typeof probabilities !== 'object' ||
		probabilities === null
	)
		return 0
	return ['chatter', 'distractor'].reduce((sum, category) => {
		const weight: unknown = Reflect.get(probabilities, category)
		return sum + (typeof weight === 'number' ? weight : 0)
	}, 0)
}

interface Rig {
	readonly ledger: ReturnType<typeof createLedger>
	readonly mirror: Mirror
	readonly cache: JudgeCache
	readonly asked: readonly unknown[]
	readonly seed: readonly SeedMessage[]
	readonly request: string
}

// Builds a ledger on the fixture with the offline cache and a mirror over it, and adds the first 48 seed messages.
function createRig(
	fixture: Fixture,
	reads: ReadonlyMap<string, MirrorRead> = new Map(
		Object.keys(LOOKUPS).map((name) => [name, readLookup]),
	),
): Rig {
	const scenario = readJSON(SCENARIO_LONG)
	const seed = readSeed(scenario)
	const tables = readTables(scenario)
	const topics = readTopics()
	const system = buildSystem({
		ledger: { system: readText(readField(readJSON(COPY), 'ledger'), 'system') },
	})
	files += 1
	const path = join(directory, `judge-${files}.jsonl`)
	writeFileSync(
		path,
		importCorpus(readRows(CORPUS), seed, topics, MICA_MODEL)
			.map((row) => `${JSON.stringify(row)}\n`)
			.join(''),
	)
	const asked: unknown[] = []
	const inner: JudgeInterface = {
		id: 'inert',
		name: 'inert judge',
		model: MICA_MODEL,
		ask(request) {
			asked.push(request)
			return Promise.reject(new Error('the inert judge was asked'))
		},
	}
	const cache = new JudgeCache({ judge: inner, path, live: false, retry: 0 })
	const provider = createOllama({ url: fixture.url, model: MODELS.q2, options: SAMPLER })
	const lookups = Object.entries(LOOKUPS).map(([name, key]) => ({
		tool: createTool({
			name,
			description: `Looks up the record for a ${key}.`,
			parameters: { type: 'object', properties: { [key]: { type: 'string' } }, required: [key] },
			execute: (args) => resolveLookup(tables, name, String(args[key] ?? ''), POSITION),
		}),
		read: readLookup,
	}))
	const ledger = createLedger(provider, {
		judge: cache,
		system,
		topics,
		questions: LEDGER_QUESTIONS,
		thresholds: FIT,
		capacity: SAMPLER.num_ctx,
		predict: 0,
		think: false,
		lookups,
	})
	const mirror = new Mirror(ledger, {
		judge: cache,
		questions: LEDGER_QUESTIONS,
		topics,
		thresholds: FIT,
		system,
		reads,
	})
	ledger.conversation.add(seed.slice(0, SEEDED).map((message) => ({ ...message })))
	const goals = readList(scenario, 'goals')
	return { ledger, mirror, cache, asked, seed, request: readText(goals[0], 'request') }
}

function findRequest(rig: Rig): Message {
	const request = rig.ledger.conversation
		.messages()
		.find((message: Message) => message.role === 'user' && message.content === rig.request)
	assert.ok(request !== undefined)
	return request
}

describe('Mirror', () => {
	let fixture: Fixture
	let rig: Rig
	let request: Message
	let briefing = ''

	before(async () => {
		globalThis.fetch = guardFetch
		fixture = await startFixture()
		rig = createRig(fixture)
		const signal = AbortSignal.timeout(60000)
		await rig.ledger.calibrate(signal)
		const selections: unknown[] = []
		rig.ledger.agent.emitter.on('select', (selection: unknown) => selections.push(selection))
		await rig.ledger.respond(rig.request, signal)
		const first = selections[0]
		assert.equal(readField(first, 'fault'), undefined)
		briefing = readText(first, 'briefing')
		request = findRequest(rig)
		rig.mirror.note(request)
	})

	after(async () => {
		await fixture.close()
		globalThis.fetch = original
		rmSync(directory, { recursive: true, force: true })
		assert.deepEqual(daemon, [])
	})

	describe('acceptance on the first request', () => {
		it('names the owner titles that the briefing renders', () => {
			const projection = rig.mirror.projection()
			const titles = rig.mirror
				.owners(request)
				.map((id) =>
					projection.records.find((record) => record.key === `${LEDGER_OWNER_PREFIX}${id}`),
				)
				.filter((record) => record !== undefined && record.lines.length > 0)
				.map((record) => record?.title)
			assert.ok(titles.length > 0, 'the briefing renders no owner record')
			assert.deepEqual(titles, [...parseOwners(briefing).keys()])
		})

		it('derives every owner line in the briefing raw from the record and from the lines of its members', () => {
			const input = rig.mirror.input()
			const projection = rig.mirror.projection(input)
			const owners = parseOwners(briefing)
			assert.ok(owners.size > 0)
			for (const [title, rendered] of owners) {
				const record = projection.records.find((one) => one.title === title)
				assert.ok(record !== undefined, title)
				assert.ok(rendered.length > 0, title)
				const raw = new Set(record.lines.map((line) => `- ${line.text}`))
				const members = new Set(
					record.members
						.flatMap((id) => rig.mirror.lines(id, input, projection))
						.map((line) => `- ${line.text}`),
				)
				for (const line of rendered) {
					assert.ok(raw.has(line), `${title}: ${line} is not a line of the record`)
					assert.ok(members.has(line), `${title}: ${line} is not a line of a member`)
				}
			}
		})

		it('files as quiet the messages that the recorded chatter and distractor weight reaches the category cutoff', () => {
			const input = rig.mirror.input()
			const open = input.messages.filter((message) => rig.mirror.assign(message) === undefined)
			assert.ok(open.length > SEEDED / 2)
			const expected = open
				.filter(
					(message) =>
						weighQuiet(
							rig.ledger.conversation.judgments.judgment(JSON.stringify(['category', message.id])),
						) >= FIT.category,
				)
				.map((message) => message.id)
			assert.ok(expected.length > 0, 'the corpus recorded no quiet message')
			assert.deepEqual(
				open
					.filter((message) => input.classification.quiet.has(message.id))
					.map((message) => message.id),
				expected,
			)
		})

		it('files every message that assign decides as quiet exactly when it is chatter', () => {
			const input = rig.mirror.input()
			const decided = input.messages.filter((message) => rig.mirror.assign(message) !== undefined)
			assert.ok(decided.some((message) => rig.mirror.assign(message) === 'fact'))
			assert.ok(decided.some((message) => rig.mirror.assign(message) === 'chatter'))
			for (const message of decided) {
				assert.equal(
					input.classification.quiet.has(message.id),
					rig.mirror.assign(message) === 'chatter',
					message.id,
				)
			}
		})

		it('excludes the request from the projection input and files the reply after it as chatter', () => {
			const input = rig.mirror.input()
			assert.deepEqual(input.exclusions, [request.id])
			const reply = input.messages.at(-1)
			assert.ok(reply !== undefined && reply.role === 'assistant')
			assert.equal(rig.mirror.assign(reply), 'chatter')
		})

		it('asks no question, because the mirror never classifies', () => {
			const counted = rig.cache.stats()
			rig.mirror.input()
			rig.mirror.projection()
			rig.mirror.near(request)
			rig.mirror.owners(request)
			assert.deepEqual(rig.cache.stats(), counted)
			assert.deepEqual(rig.asked, [])
			assert.deepEqual(daemon, [])
		})
	})

	describe('projection', () => {
		it('reads one reading per seed lookup result with the argument ids added', () => {
			const readings = rig.mirror.readings()
			const results = rig.ledger.conversation
				.messages()
				.filter((message: Message) => message.role === 'tool')
			assert.deepEqual(
				readings.map((reading) => reading.id),
				results.map((message: Message) => message.id),
			)
			const order = readings.find((reading) => reading.arguments['id'] === 'LH-79215')
			assert.ok(order?.result !== undefined)
			assert.ok(order.result.ids.includes('LH-79215'))
			assert.ok(order.result.ids.includes('LH-44870'))
			assert.deepEqual(order.result.owners, [{ id: 'LH-44870', names: ['Luis Ferreira'] }])
		})

		it('builds the lines of a message as the record carries them, with and without the supplied projection', () => {
			const input = rig.mirror.input()
			const projection = rig.mirror.projection(input)
			assert.ok(projection.records.some((record) => record.key === LEDGER_RULES_KEY))
			for (const record of projection.records) {
				for (const id of record.members) {
					const own = record.lines.filter((line) => line.source === id)
					assert.ok(own.length > 0, id)
					assert.deepEqual(rig.mirror.lines(id, input, projection), own)
					assert.deepEqual(rig.mirror.lines(id), own)
				}
			}
			assert.deepEqual(rig.mirror.lines('no such message'), [])
		})

		it('selects the owner a request names by name, by id, and by a linked order id', () => {
			const named = rig.mirror.owners({
				id: 'stub-name',
				role: 'user',
				content: 'Has Luis Ferreira called back?',
			})
			assert.deepEqual(named, ['LH-44870'])
			const id: Message = { id: 'stub-id', role: 'user', content: 'Anything on account LH-44870?' }
			assert.deepEqual(rig.mirror.owners(id), ['LH-44870'])
			const order: Message = {
				id: 'stub-order',
				role: 'user',
				content: 'Any news on order LH-79215?',
			}
			assert.ok(rig.mirror.near(order).has('LH-79215'))
			assert.deepEqual(rig.mirror.owners(order), ['LH-44870'])
			assert.deepEqual(
				rig.mirror.owners({ id: 'stub-none', role: 'user', content: 'Good morning.' }),
				[],
			)
		})

		it('selects an owner by the first name alone, because a request matches names partially', () => {
			const partial: Message = {
				id: 'stub-partial',
				role: 'user',
				content: 'Has Luis called back?',
			}
			assert.ok(rig.mirror.near(partial).has('LH-44870'))
			assert.deepEqual(rig.mirror.owners(partial), ['LH-44870'])
		})

		it('adds the ids that the call arguments carry to the ids that the reader returned', () => {
			const bare = new Map<string, MirrorRead>(
				Object.keys(LOOKUPS).map((name) => [name, () => ({ ids: [], owners: [] })]),
			)
			const own = createRig(fixture, bare)
			const order = own.mirror.readings().find((reading) => reading.arguments['id'] === 'LH-79215')
			assert.deepEqual(order?.result?.ids, ['LH-79215'])
		})
	})

	describe('assign', () => {
		it('files annotations only after the first request', () => {
			const own = createRig(fixture)
			const [first] = own.ledger.conversation.add([{ role: 'user', content: LEDGER_NOTES.cue }])
			assert.ok(first !== undefined)
			assert.equal(own.mirror.assign(first), undefined)
			assert.deepEqual(own.mirror.input().exclusions, [])
			const [asked, cue, digest, plain] = own.ledger.conversation.add([
				{ role: 'user', content: 'Where is order LH-79215?' },
				{ role: 'user', content: LEDGER_NOTES.cue },
				{ role: 'user', content: `${LEDGER_NOTES.results}\nOrder LH-79215 ships soon.` },
				{ role: 'user', content: 'A plain follow-up.' },
			])
			assert.ok(
				asked !== undefined && cue !== undefined && digest !== undefined && plain !== undefined,
			)
			own.mirror.note(asked)
			assert.equal(own.mirror.assign(asked), undefined)
			assert.equal(own.mirror.assign(cue), 'chatter')
			assert.equal(own.mirror.assign(digest), 'chatter')
			assert.equal(own.mirror.assign(plain), undefined)
			assert.deepEqual(own.mirror.input().exclusions, [asked.id, cue.id, digest.id])
		})

		it('files an assistant call as chatter and an assistant reply as chatter only after the first request', () => {
			const own = createRig(fixture)
			const [early, calling, asked, late] = own.ledger.conversation.add([
				{ role: 'assistant', content: 'Noted.' },
				{
					role: 'assistant',
					content: 'Checking.',
					calls: [{ id: 'c1', name: 'lookup_order', arguments: { id: 'LH-79215' } }],
				},
				{ role: 'user', content: 'Where is order LH-79215?' },
				{ role: 'assistant', content: 'It ships soon.' },
			])
			assert.ok(
				early !== undefined && calling !== undefined && asked !== undefined && late !== undefined,
			)
			assert.equal(own.mirror.assign(early), undefined)
			assert.equal(own.mirror.assign(late), undefined)
			own.mirror.note(asked)
			assert.equal(own.mirror.assign(early), undefined)
			assert.equal(own.mirror.assign(calling), 'chatter')
			assert.equal(own.mirror.assign(late), 'chatter')
		})

		it('files a tool result by the outcome that the tool event reported, flushed to the message at its index', () => {
			const own = createRig(fixture)
			const emitter = own.ledger.agent.emitter
			const baseline = own.mirror.readings().length
			const calls = [
				{ id: 'c1', name: 'lookup_order', arguments: { id: 'LH-79215' } },
				{ id: 'c2', name: 'lookup_order', arguments: { id: 'LH-77302' } },
				{ id: 'c3', name: 'lookup_order', arguments: { id: 'LH-80941' } },
			]
			own.ledger.conversation.add([{ role: 'assistant', content: 'Checking.', calls }])
			const failed: ToolResult = {
				success: false,
				id: 'c1',
				name: 'lookup_order',
				error: 'the desk system timed out',
			}
			const worked: ToolResult = { success: true, id: 'c2', name: 'lookup_order', value: 'ok' }
			emitter.emit('tool', calls[0], failed)
			const [lost] = own.ledger.conversation.add([
				{
					role: 'tool',
					content: 'Order LH-79215 for account LH-44870 (Luis Ferreira): stand mixer.',
					call: 'c1',
				},
			])
			emitter.emit('tool', calls[1], worked)
			const [found] = own.ledger.conversation.add([
				{
					role: 'tool',
					content: 'Order LH-77302 for account LH-20418 (Grace Okafor): duvet set.',
					call: 'c2',
				},
			])
			const [bare] = own.ledger.conversation.add([
				{
					role: 'tool',
					content: 'Order LH-80941 for account LH-31055 (Halvorsen Interiors): pendant lights.',
					call: 'c3',
				},
			])
			assert.ok(lost !== undefined && found !== undefined && bare !== undefined)
			assert.equal(own.mirror.assign(lost), 'chatter')
			assert.equal(own.mirror.assign(found), 'fact')
			assert.equal(own.mirror.assign(bare), 'fact')
			const ids = own.mirror.readings().map((reading) => reading.id)
			assert.ok(!ids.includes(lost.id))
			assert.ok(ids.includes(found.id) && ids.includes(bare.id))
			assert.equal(ids.length, baseline + 2)
		})

		it('marks a result failed when its reader throws, and skips it from then on', () => {
			const reads = new Map<string, MirrorRead>([
				['lookup_order', readLookup],
				[
					'lookup_customer',
					() => {
						throw new Error('the reader cannot parse this result')
					},
				],
			])
			const own = createRig(fixture, reads)
			const results = own.ledger.conversation
				.messages()
				.filter((message: Message) => message.role === 'tool')
			const customers = results.filter((message: Message) => message.content.startsWith('Account '))
			assert.ok(customers.length > 0)
			// Assign runs first, so it must read the lookups itself to learn that the reader throws.
			for (const message of customers)
				assert.equal(own.mirror.assign(message), 'chatter', message.id)
			const readings = own.mirror.readings()
			for (const message of customers)
				assert.ok(!readings.some((reading) => reading.id === message.id), message.id)
			assert.equal(readings.length, results.length - customers.length)
		})
	})
})
