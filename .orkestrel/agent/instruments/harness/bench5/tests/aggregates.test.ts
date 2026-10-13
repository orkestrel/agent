import type { JudgeQuestion as InstalledJudgeQuestion } from '@orkestrel/agent'
import { buildSupportRows } from './support/helpers.js'
import { SUPPORT_SPECIMEN } from './support/constants.js'
import { Support } from '../aggregates/Support.js'
import {
	buildSupportPlan,
	partitionCandidate,
	reduceSupport,
	validateCoverage,
} from '../aggregates/helpers.js'
import { collectControlReadings, readRefitControls, measureRefitCosts } from '../refit/helpers.js'
import { REFIT_CONTROLS, REFIT_IMPLEMENTATION } from '../refit/constants.js'
import { isRefitAttempt } from '../refit/validators.js'
import { createOllamaJudge } from '../../vendor/ollama/index.js'
import { MICA_SYSTEM, MICA_CONTEXT, MICA_CALIBRATION } from '../constants.js'
import type {
	JudgeAnswer,
	JudgeInterface,
	JudgeQuestion,
	Message,
	Selection,
} from '../../vendor/agent-0.0.30-trimmed/index.js'
import type { Fixture } from './fixture.js'
import type {
	AggregatorOptions,
	AggregateRow,
	AggregateSource,
	CacheRow,
	Fit,
	MirrorLine,
	ScenarioDay,
	SeedMessage,
} from '../types.js'
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
	appendFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
	Classifier,
	LEDGER_CATEGORIES,
	LEDGER_QUESTIONS,
	collectRegistry,
	createLedger,
	createAgentContext,
	estimateMessages,
	matchEntities,
} from '../../vendor/agent-0.0.30-trimmed/index.js'
import { createOllama } from '../../vendor/ollama/index.js'
import { Aggregator } from '../aggregates/Aggregator.js'
import {
	AGREE_QUESTION,
	FOCUS_QUESTION,
	CHANGE_QUESTION,
	INSTRUCTION_DATE,
	INSTRUCTION_SUMMARIES,
	SUMMARIES_HEADING,
	SUMMARY_PREFIX,
	SUMMARY_SYSTEM,
} from '../aggregates/constants.js'
import {
	buildAgreeState,
	buildChangeQuestion,
	buildChangeState,
	buildSource,
	buildSummaryPrompt,
	checkProse,
	collectStaleTokens,
	collectSummaryBodies,
	collectTopicSources,
	collectTopics,
	compareSources,
	countSoleTokens,
	fillSlots,
	filterProse,
	readTokens,
	renderSource,
	renderSummaries,
	versionToState,
} from '../aggregates/helpers.js'
import { isAggregateSource, isAggregateState } from '../aggregates/validators.js'
import { buildTimeline, findSnapshot, parseAggregates } from '../shadow.js'
import {
	ADMISSION_LIMIT,
	CORPUS,
	FIT,
	HARNESS,
	MICA_MODEL,
	MODELS,
	SAMPLER,
	SCENARIO_LONG,
} from '../constants.js'
import {
	buildCacheKey,
	buildCategoryQuestion,
	buildSystem,
	buildTopicQuestion,
	findDay,
	importCorpus,
	isMessageRole,
	readJSON,
	readLookup,
	readRows,
	renderMessageState,
	renderPairState,
} from '../helpers.js'
import { JudgeCache } from '../JudgeCache.js'
import { Mirror } from '../Mirror.js'
import { Summarizer } from '../Summarizer.js'
import { startFixture } from './fixture.js'

const COPY = join(HARNESS, 'bench', 'variants', 'ledger', 'v1.json')
const SEEDED = 48
const LAST = SEEDED - 1
const PREDICT = 160
const MARCUS = 29
const FITS: Fit = { change: 0.6, agree: 0.6, separated: true }
const AGREED = 0.95
const OWNER = 'owner:LH-44870'
const DESK = ['contacts', 'delivery', 'escalations', 'refunds', 'returns', 'warehouse']
const CORRECTION = 'Correction on the refund approval code: use MX-4490 from now on, not MX-4486.'
const NEWS = 'Update from Sigrid Halvorsen: her direct line moves to extension 4311 from tomorrow.'
const daemon: string[] = []
const original = globalThis.fetch
const directory = mkdtempSync(join(tmpdir(), 'bench5-aggregates-'))
let files = 0

const REFUNDS = [
	'Any refund over $200 needs a manager approval code; use MX-4486 from now on, because MX-4471 is dead.',
	'Opened-item returns get a full refund again after the director scrapped the 15 percent restocking fee.',
]
const RETURNS = [
	'Luis Ferreira on account LH-44870 wants to return an opened stand mixer from order LH-79215.',
	'Opened-item returns get a full refund again after the 15 percent restocking fee was scrapped.',
]
const OWNER_PROSE = [
	'Luis Ferreira on account LH-44870 wants to return an opened stand mixer from order LH-79215.',
	'The order totals $289.00 and the return window is open until 2026-10-21.',
]
const SUMMARIES: Readonly<Record<string, string>> = Object.freeze({
	refunds: REFUNDS.join(' '),
	returns: RETURNS.join(' '),
	escalations:
		'Priya Raman is copied on every escalation, and the Halvorsen Interiors ticket is ESC-2219, not ESC-2291. Grace needs Marcus to sign off first.',
	contacts:
		'Tomasz Brennan is off on Friday 2026-10-09, so release requests must reach him today. Sigrid Halvorsen takes calls after 2 pm on extension 4127.',
	delivery:
		"Tomasz Brennan in the warehouse issues the release for anything stuck at a carrier depot. Kenji Nakamura's replacement kettle on order LH-81660 needs a gift note that reads 'Happy 40th, Aiko'.",
	warehouse:
		'Tomasz Brennan in the warehouse issues the release for stuck shipments, and he is off on Friday 2026-10-09.',
	[OWNER]: OWNER_PROSE.join(' '),
})
const REFUNDS_AFTER =
	'Any refund over $200 needs a manager approval code, and MX-4490 is the code to use from now on, not MX-4486.'
const CONTACTS_AFTER =
	'Tomasz Brennan is off on Friday 2026-10-09. Sigrid Halvorsen takes calls on extension 4311 from tomorrow.'
const MISTYPED = 'Luis Ferreira wants to return the stand mixer from order LH-79251.'

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

function readDays(scenario: unknown): readonly ScenarioDay[] {
	return readList(scenario, 'days').map((day) => ({
		date: readText(day, 'date'),
		from: Number(readField(day, 'from')),
	}))
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

function isAggregateRow(value: unknown): value is AggregateRow {
	return (
		typeof readField(value, 'event') === 'string' &&
		typeof readField(value, 'topic') === 'string' &&
		typeof readField(value, 'version') === 'number' &&
		Array.isArray(readField(value, 'sources')) &&
		Array.isArray(readField(value, 'failures'))
	)
}

function readAggregates(path: string): readonly AggregateRow[] {
	return readRows(path).filter(isAggregateRow)
}

function buildRow(state: string, question: JudgeQuestion, answer: JudgeAnswer): CacheRow {
	return {
		key: buildCacheKey(MICA_MODEL, state, question),
		model: MICA_MODEL,
		state,
		question,
		answer,
		wall: 0,
		origin: 'corpus',
		at: 0,
	}
}

function buildNoul(probability: number): JudgeAnswer {
	return { form: 'noul', noul: probability }
}

function buildChoice(top: string): JudgeAnswer {
	return {
		form: 'choice',
		probabilities: Object.fromEntries(
			LEDGER_CATEGORIES.map((category: string) => [category, category === top ? 0.94 : 0.01]),
		),
	}
}

// Rows for the messages that the tests add after the seed: the category and every topic question, with only the named topic reading as a match.
function buildMessageRows(content: string, category: string, topic: string): readonly CacheRow[] {
	const state = renderMessageState({ role: 'user', content })
	return [
		buildRow(state, buildCategoryQuestion(LEDGER_QUESTIONS), buildChoice(category)),
		...readTopics().map((one) =>
			buildRow(
				state,
				buildTopicQuestion(one, LEDGER_QUESTIONS),
				buildNoul(one.name === topic ? 0.95 : 0.04),
			),
		),
	]
}

function writeRows(path: string, rows: readonly CacheRow[]): void {
	writeFileSync(path, rows.map((row) => `${JSON.stringify(row)}\n`).join(''))
}

interface Rig {
	readonly ledger: ReturnType<typeof createLedger>
	readonly mirror: Mirror
	readonly request: Message
	readonly seeds: Map<string, number>
	readonly days: readonly ScenarioDay[]
	readonly system: string
	readonly asked: readonly unknown[]
	advance(content: string): Promise<Message>
}

// Builds a ledger and a mirror over a conversation of the first 48 seed messages and the first request, and files them from the classification rows.
async function createRig(classify: string): Promise<Rig> {
	const scenario = readJSON(SCENARIO_LONG)
	const seed = readSeed(scenario)
	const topics = readTopics()
	const system = buildSystem({
		ledger: { system: readText(readField(readJSON(COPY), 'ledger'), 'system') },
	})
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
	const cache = new JudgeCache({ judge: inner, path: classify, live: false, retry: 0 })
	const provider = createOllama({ url: 'http://127.0.0.1:9', model: MODELS.q2, options: SAMPLER })
	const ledger = createLedger(provider, {
		judge: cache,
		system,
		topics,
		questions: LEDGER_QUESTIONS,
		thresholds: FIT,
		capacity: SAMPLER.num_ctx,
		predict: 0,
		think: false,
		gauge: { scale: 1.1, overhead: 100 },
	})
	const reads = new Map([
		['lookup_order', readLookup],
		['lookup_customer', readLookup],
	])
	const mirror = new Mirror(ledger, {
		judge: cache,
		questions: LEDGER_QUESTIONS,
		topics,
		thresholds: FIT,
		system,
		reads,
	})
	const seeds = new Map<string, number>()
	for (const [index, message] of ledger.conversation
		.add(seed.slice(0, SEEDED).map((one) => ({ ...one })))
		.entries()) {
		seeds.set(message.id, index)
	}
	const request = ledger.conversation.add({
		role: 'user',
		content: readText(readList(scenario, 'goals')[0], 'request'),
	})
	mirror.note(request)
	const classifier = new Classifier({
		conversation: ledger.conversation,
		judge: cache,
		questions: LEDGER_QUESTIONS,
		topics,
		thresholds: FIT,
		assign: (message: Message) => mirror.assign(message),
		entities: (text: string, partial: boolean) =>
			matchEntities(collectRegistry(mirror.readings()), text, partial),
	})
	const requests = new Set([request.id])
	await classifier.classify(requests, AbortSignal.timeout(60000))
	let count = SEEDED
	return {
		ledger,
		mirror,
		request,
		seeds,
		days: readDays(scenario),
		system,
		asked,
		async advance(content) {
			const message = ledger.conversation.add({ role: 'user', content })
			seeds.set(message.id, count)
			count += 1
			await classifier.classify(requests, AbortSignal.timeout(60000))
			return message
		},
	}
}

function mapDays(rig: Rig): ReadonlyMap<string, string> {
	return new Map(
		rig.mirror
			.input()
			.messages.map((message) => [
				message.id,
				findDay(rig.days, rig.seeds.get(message.id) ?? LAST)?.date ?? '',
			]),
	)
}

function readSources(
	rig: Rig,
	key: string,
): { readonly sources: readonly AggregateSource[]; readonly title: string } {
	const input = rig.mirror.input()
	const projection = rig.mirror.projection(input)
	const topic = collectTopics(projection, input, rig.mirror.owners(rig.request)).find(
		(one) => one.key === key,
	)
	assert.ok(topic !== undefined, key)
	return {
		sources: collectTopicSources(projection, input, topic, mapDays(rig)),
		title: topic.title,
	}
}

function listKeys(rig: Rig): readonly string[] {
	const input = rig.mirror.input()
	return collectTopics(rig.mirror.projection(input), input, rig.mirror.owners(rig.request)).map(
		(topic) => topic.key,
	)
}

function buildAgreeRow(rig: Rig, key: string, prose: string, agree: number): readonly CacheRow[] {
	return buildSupportRows(MICA_MODEL, prose, readSources(rig, key).sources, agree)
}

function buildAgreeRows(
	rig: Rig,
	summaries: Readonly<Record<string, string>>,
	plan: Plan,
): readonly CacheRow[] {
	return listKeys(rig)
		.filter((key) => !(plan.skip ?? []).includes(key))
		.flatMap((key) => buildAgreeRow(rig, key, summaries[key] ?? '', plan.agree ?? AGREED))
}

type Kind = 'first' | 'correct' | 'news'

interface Plan {
	readonly kind: Kind
	readonly summaries?: Readonly<Record<string, string>>
	readonly skip?: readonly string[]
	readonly change?: number
	readonly agree?: number
	readonly retained?: number
	readonly refused?: boolean
	readonly rebuilt?: number
	readonly observe?: (body: unknown) => void
	readonly replacement?: string
}

// Replays the plan on a scratch rig and returns the CHANGE and AGREE rows that the run asks, computed from the states the run reads.
async function computeRows(plan: Plan): Promise<readonly CacheRow[]> {
	const classify = join(directory, `classify-${(files += 1)}.jsonl`)
	writeRows(classify, classifyRows())
	const rig = await createRig(classify)
	const summaries = { ...SUMMARIES, ...plan.summaries }
	const rows = [...buildAgreeRows(rig, summaries, plan)]
	const contacts = readSources(rig, 'contacts')
	if (plan.kind === 'correct') {
		await rig.advance(CORRECTION)
		rows.push(...buildAgreeRow(rig, 'refunds', REFUNDS_AFTER, plan.agree ?? AGREED))
	}
	if (plan.kind === 'news') {
		const news = await rig.advance(NEWS)
		const lines = readSources(rig, 'contacts').sources.filter((source) => source.id === news.id)
		const version = {
			title: contacts.title,
			asOf: findDay(rig.days, LAST)?.date ?? '',
			prose: summaries['contacts'] ?? '',
		}
		rows.push(
			buildRow(
				buildChangeState(version, lines),
				buildChangeQuestion(version.title),
				buildNoul(plan.change ?? 0),
			),
		)
		rows.push(
			...buildAgreeRow(
				rig,
				'contacts',
				plan.replacement ?? CONTACTS_AFTER,
				plan.rebuilt ?? plan.agree ?? AGREED,
			),
		)
		const retained = buildAgreeRow(
			rig,
			'contacts',
			summaries['contacts'] ?? '',
			plan.retained ?? AGREED,
		)
		rows.push(
			...retained.map((row) =>
				plan.refused ? { ...row, answer: undefined, refusal: { missing: ['true'] } } : row,
			),
		)
	}
	return rows
}

// Holds the corpus rows, the first request's topic rows, and the rows of the messages that the tests add later.
function classifyRows(): readonly CacheRow[] {
	const scenario = readJSON(SCENARIO_LONG)
	const seed = readSeed(scenario)
	const request = readText(readList(scenario, 'goals')[0], 'request')
	const state = renderMessageState({ role: 'user', content: request })
	const marcus = seed[MARCUS]
	assert.ok(marcus !== undefined)
	const later = { role: 'user', content: CORRECTION }
	return [
		...importCorpus(readRows(CORPUS), seed, readTopics(), MICA_MODEL),
		...readTopics()
			.filter((topic) => topic.requested)
			.map((topic) =>
				buildRow(
					state,
					buildTopicQuestion(topic, LEDGER_QUESTIONS),
					buildNoul(['refunds', 'returns'].includes(topic.name) ? 0.95 : 0.04),
				),
			),
		...buildMessageRows(CORRECTION, 'correction', 'refunds'),
		buildRow(renderPairState(marcus, later), LEDGER_QUESTIONS.amends, buildNoul(0.95)),
		buildRow(renderPairState(marcus, later), LEDGER_QUESTIONS.supersedes, buildNoul(0.99)),
		...buildMessageRows(NEWS, 'fact', 'contacts'),
	]
}

interface Run {
	readonly options: AggregatorOptions
	readonly rig: Rig
	readonly aggregator: Aggregator
	readonly judge: JudgeCache
	readonly fixture: Fixture
	readonly path: string
	readonly settings: { allowance: number; readonly retry: number; readonly predict: number }
	maintain(goal: string, lastSeed: number): Promise<void>
	rows(): readonly AggregateRow[]
	summarizing(): readonly unknown[]
}

// Starts the fixture with the plan's summaries, builds the rig, and writes the judge rows before the aggregator reads them.
async function createRun(plan: Plan, retry = 1, fit: Fit = FITS): Promise<Run> {
	const computed = await computeRows(plan)
	const summaries = { ...SUMMARIES, ...plan.summaries }
	const longest: Record<string, string> = {}
	for (const [key, prose] of Object.entries(summaries)) {
		longest[`about ${key === OWNER ? 'Luis Ferreira (account LH-44870)' : key} as of`] = prose
	}
	if (plan.kind === 'correct') longest[CORRECTION] = REFUNDS_AFTER
	if (plan.kind === 'news') longest[NEWS] = plan.replacement ?? CONTACTS_AFTER
	const fixture = await startFixture({
		prefix: SUMMARY_PREFIX,
		summaries: longest,
		observe: plan.observe,
	})
	files += 1
	const classify = join(directory, `classify-${files}.jsonl`)
	writeRows(classify, classifyRows())
	const judgePath = join(directory, `judge-${files}.jsonl`)
	writeRows(judgePath, classifyRows())
	appendFileSync(judgePath, computed.map((row) => `${JSON.stringify(row)}\n`).join(''))
	const rig = await createRig(classify)
	const inert: JudgeInterface = {
		id: 'inert',
		name: 'inert judge',
		model: MICA_MODEL,
		ask(request) {
			const entry = Object.entries(request.questions)[0]
			assert.ok(entry)
			const row = computed.find(
				(one) =>
					one.state === request.state && JSON.stringify(one.question) === JSON.stringify(entry[1]),
			)
			if (row === undefined) return Promise.reject(new Error('missing inert protocol input'))
			return Promise.resolve({
				model: MICA_MODEL,
				answers: row.answer === undefined ? {} : { [entry[0]]: row.answer },
				refusals: row.refusal === undefined ? undefined : { [entry[0]]: row.refusal },
				usage: row.usage,
			})
		},
	}
	const judge = new JudgeCache({ judge: inert, path: judgePath, live: true, retry: 0 })
	const provider = createOllama({
		url: fixture.url,
		model: MODELS.q2,
		options: { ...SAMPLER, num_predict: PREDICT },
	})
	const summarizer = new Summarizer({
		provider,
		model: MODELS.q2,
		sampler: SAMPLER,
		predict: PREDICT,
		cache: join(directory, `summary-${files}.jsonl`),
		live: true,
	})
	const settings = { allowance: 100000, retry, predict: PREDICT }
	const path = join(directory, `aggregates-${files}.jsonl`)
	const logged: string[] = []
	const options: AggregatorOptions = {
		mirror: rig.mirror,
		summarizer,
		judge,
		fit,
		settings,
		days: rig.days,
		seeds: rig.seeds,
		path,
		log: (line) => logged.push(line),
	}
	const aggregator = new Aggregator(options)
	return {
		options,
		rig,
		aggregator,
		judge,
		fixture,
		path,
		settings,
		async maintain(goal, lastSeed) {
			await aggregator.maintain(rig.request, goal, lastSeed, AbortSignal.timeout(60000))
			assert.deepEqual(logged, [])
		},
		rows: () => readAggregates(path),
		summarizing: () =>
			fixture.requests.filter((body) => {
				const first = readList(body, 'messages')[0]
				return (
					readField(first, 'role') === 'system' &&
					readText(first, 'content').startsWith(SUMMARY_PREFIX)
				)
			}),
	}
}

function pick(
	rows: readonly AggregateRow[],
	event: AggregateRow['event'],
	topic?: string,
): readonly AggregateRow[] {
	return rows.filter((row) => row.event === event && (topic === undefined || row.topic === topic))
}

function select(run: Run, shown: string): Selection {
	return {
		messages: [run.rig.request],
		judgments: [],
		briefing: shown,
	}
}

describe('aggregate helpers', () => {
	const first: AggregateSource = {
		id: 'a',
		sentence: 0,
		role: 'user',
		text: 'Refunds over $200 need approval code MX-4486.',
		day: '2026-10-08',
	}
	const second: AggregateSource = {
		id: 'b',
		sentence: 0,
		role: 'tool',
		text: 'lookup_order {"id":"LH-79215"}: Order LH-79215 for account LH-44870 (Luis Ferreira): total $289.00.',
		day: '2026-10-09',
	}
	const sources: readonly AggregateSource[] = [first, second]

	it('copies exact source grouping and multiplicity into validated maintenance bindings', () => {
		const version = {
			version: 3,
			goal: 'g03',
			point: 10,
			title: 'refunds',
			asOf: '2026-10-09',
			prose: 'Refunds.',
			raw: 'Refunds.',
			ids: [],
			sources: [first, second, first],
		}
		const state = versionToState(version)
		assert.deepEqual(state, { version: 3, goal: 'g03', point: 10, sources: [first, second, first] })
		assert.notEqual(state?.sources, version.sources)
		assert.notEqual(state?.sources[0], first)
		assert.equal(versionToState(undefined), undefined)
		assert.equal(isAggregateState(state), true)
		assert.equal(isAggregateSource(first), true)
		for (const value of [
			undefined,
			null,
			{},
			{ ...state, version: 0 },
			{ ...state, point: NaN },
			{ ...state, sources: [{ ...first, role: 'unknown' }] },
			{ ...state, sources: [{ ...first, sentence: -1 }] },
		])
			assert.equal(isAggregateState(value), false)
	})

	it('accepts extended retained sources while rejecting invalid declared fields', () => {
		const source = { ...first, seed: 6, rendered: '(2026-10-08) user: retained source' }
		assert.equal(isAggregateSource(source), true)
		assert.equal(isAggregateState({ version: 1, goal: 'g01', point: 0, sources: [source] }), true)
		assert.equal(isAggregateSource({ ...source, sentence: -1 }), false)
		assert.equal(isAggregateSource({ ...source, role: 'unknown' }), false)
	})

	it('names the summarizer prefix and fills its slots in one pass', () => {
		assert.ok(SUMMARY_SYSTEM.startsWith(SUMMARY_PREFIX))
		assert.equal(SUMMARY_PREFIX, 'You maintain a living summary about ')
		assert.equal(
			fillSlots(SUMMARY_SYSTEM, 'a DATE and a TOPIC', '2026-10-08'),
			'You maintain a living summary about a DATE and a TOPIC as of 2026-10-08. The source lines are in message order and use (date) role: text. Select up to three self-contained source clauses that preserve the current state after later corrections, withdrawals, or completions. Prefer open requests, current values, and actionable conditions or deadlines; retain as many distinct useful items as fit. For each selected clause, copy its own (date) role: prefix and wording, including the named parties, action status, conditions, relative time words, ids, amounts, dates, and names. The prefix attributes the clause to its source; it does not assign the action or its event date. If the source date is empty, copy only the role prefix. Keep only earlier facts that later lines leave unchanged. Do not join clauses from separate source lines or turn a request, instruction, policy, or plan into a completed action. Choose clauses whose parties and references are clear from the quoted wording; omit an unclear clause instead of inventing its referent. Write only the summary, with one complete selected clause per sentence and at most three sentences.',
		)
	})

	it('words the questions and the instructions as the proposal does', () => {
		assert.deepEqual(CHANGE_QUESTION, {
			form: 'noul',
			instructions: 'Does the event change what the summary states about TOPIC?',
			criteria: {
				true: 'The event adds, replaces, or withdraws something the summary states or must state',
				false: 'The event repeats the summary or does not bear on it',
			},
		})
		assert.deepEqual(buildChangeQuestion('refunds'), {
			form: 'noul',
			instructions: 'Does the event change what the summary states about refunds?',
			criteria: CHANGE_QUESTION.criteria,
		})
		assert.deepEqual(
			AGREE_QUESTION,
			readField(
				readJSON(join(HARNESS, '..', 'units', 'aggregates', 'admission-l8.json')),
				'question',
			),
		)
		assert.equal(SUMMARIES_HEADING, '### Topic summaries')
		assert.deepEqual([INSTRUCTION_DATE.name, INSTRUCTION_SUMMARIES.name], ['date', 'summaries'])
		assert.ok(INSTRUCTION_DATE.priority > INSTRUCTION_SUMMARIES.priority)
	})

	it('builds the summary prompt, the CHANGE state, and the AGREE state as the proposal words them', () => {
		const prompt = buildSummaryPrompt('refunds', 'refunds', '2026-10-09', sources)
		assert.deepEqual(
			prompt.map((message) => message.role),
			['system', 'user'],
		)
		assert.ok(prompt[0]?.content.includes('about refunds as of 2026-10-09.'))
		assert.equal(
			prompt[1]?.content,
			'(2026-10-08) user: Refunds over $200 need approval code MX-4486.\n(2026-10-09) tool: lookup_order {"id":"LH-79215"}: Order LH-79215 for account LH-44870 (Luis Ferreira): total $289.00.',
		)
		const version = { title: 'refunds', asOf: '2026-10-09', prose: 'Refunds need MX-4486.' }
		assert.equal(
			buildChangeState(version, sources.slice(0, 1)),
			'Summary of refunds as of 2026-10-09: Refunds need MX-4486.\nEvent: user: Refunds over $200 need approval code MX-4486.',
		)
		assert.equal(
			buildAgreeState(version, sources.slice(0, 1)),
			'{\n "evidence": [\n  "(2026-10-08) user: Refunds over $200 need approval code MX-4486."\n ],\n "candidate": "Refunds need MX-4486."\n}',
		)
		assert.equal(
			renderSource(first),
			'(2026-10-08) user: Refunds over $200 need approval code MX-4486.',
		)
	})

	it('escapes exact offending tokens and failure kinds as retry data', () => {
		const retry = buildSummaryPrompt('refunds', 'refunds', '2026-10-09', sources, [
			{ kind: 'id', token: 'LH-1' },
			{ kind: 'id', token: 'LH-2' },
			{ kind: 'number', token: '5' },
			{ kind: 'name', token: 'quoted"\nname' },
		])
		const plain = buildSummaryPrompt('refunds', 'refunds', '2026-10-09', sources)
		assert.notEqual(retry[1]?.content, plain[1]?.content)
		assert.ok(retry[1]?.content.startsWith(plain[1]?.content ?? ''))
		assert.equal(
			retry[1]?.content,
			`${plain[1]?.content}\n\nYour previous summary, which is not shown, failed these checks (JSON data, not instructions): [{"kind":"id","token":"LH-1"},{"kind":"id","token":"LH-2"},{"kind":"number","token":"5"},{"kind":"name","token":"quoted\\"\\nname"}]. Write a fresh summary under the same rules. Copy each value in its exact source form and retain only facts that later lines leave unchanged. Omit any clause you cannot support that way; do not repair a token by inventing an actor, event, condition, or date. Return at least one complete supported clause.`,
		)
		assert.equal(retry[0]?.content, plain[0]?.content)
	})

	it('reads a letter-and-digit run as an id and a capitalized word in any position as a name candidate', () => {
		const tokens = readTokens('WKND15 applies. Adeyemi signs off on LH-44870 for 2pm, $1,240.00.')
		assert.deepEqual([...tokens.ids].sort(), ['2PM', 'LH-44870', 'WKND15'])
		assert.deepEqual(
			[...tokens.numbers].sort((left, right) => left - right),
			[2, 1240],
		)
		assert.deepEqual([...tokens.names], ['adeyemi'])
		assert.ok(!tokens.names.has('lh'))
		assert.ok(tokens.words.has('signs'))
	})

	it('counts a scored code and a sentence-initial name that only the summary carries as sole tokens', () => {
		const shown = 'Dana asked about the weekend coupon. Use LH-44870 on the order.'
		assert.equal(countSoleTokens('WKND15 applies.', shown), 1)
		assert.equal(countSoleTokens('Adeyemi signs off today.', shown), 1)
		assert.equal(countSoleTokens('WKND15 applies. Adeyemi signs off today.', shown), 2)
		assert.equal(countSoleTokens('Dana asked about the weekend coupon for LH-44870.', shown), 0)
		assert.equal(countSoleTokens('The coupon is worth 15 dollars.', shown), 1)
		assert.equal(
			countSoleTokens('The coupon is worth 15 dollars.', `${shown} It saves 15 dollars.`),
			0,
		)
	})

	it('drops the sentences whose tokens the shown text lacks and keeps the ids it shows', () => {
		const shown = 'Marcus approved refund MX-4486 for $200. Dana asked.'
		const filtered = filterProse(
			'Marcus approved MX-4486 for $200. Adeyemi signs off today. Use WKND15 now.',
			['MX-4486', 'MX-4471'],
			shown,
		)
		assert.equal(filtered.prose, 'Marcus approved MX-4486 for $200.')
		assert.deepEqual(filtered.dropped, ['Adeyemi signs off today.', 'Use WKND15 now.'])
		assert.deepEqual(filtered.ids, ['MX-4486'])
		assert.deepEqual(filterProse('Nothing here.', [], 'Other words.').prose, '')
	})

	it('fails a summary by kind: empty, id, number, name, and stale', () => {
		const known = [
			'(2026-10-08) user: Refunds over $200 need approval code MX-4486 from Marcus Oyelaran.',
			'refunds',
			'2026-10-09',
		]
		const owners = ['Luis Ferreira']
		assert.deepEqual(checkProse('  ', known, owners, []), [{ kind: 'empty', token: '' }])
		assert.deepEqual(
			checkProse(
				'Refunds over $200 need MX-4486 from Marcus Oyelaran and Luis Ferreira.',
				known,
				owners,
				[],
			),
			[],
		)
		assert.deepEqual(checkProse('Refunds need MX-4468.', known, owners, []), [
			{ kind: 'id', token: 'MX-4468' },
		])
		assert.deepEqual(checkProse('Refunds over $250 need approval.', known, owners, []), [
			{ kind: 'number', token: '250' },
		])
		assert.deepEqual(checkProse('Refunds are signed by Marcus Okafor today.', known, owners, []), [
			{ kind: 'name', token: 'okafor' },
		])
		assert.deepEqual(
			checkProse('Refunds over $200 need MX-4486 and $300.', known, owners, ['300', 'MX-4471']),
			[
				{ kind: 'number', token: '300' },
				{ kind: 'stale', token: '300' },
			],
		)
		assert.deepEqual(checkProse('Refunds use WKND15 and the code 2pm.', known, owners, []), [
			{ kind: 'id', token: 'WKND15' },
			{ kind: 'id', token: '2PM' },
			{ kind: 'number', token: '2' },
		])
	})

	it('collects the stale tokens that no current source carries', () => {
		const stale = collectStaleTokens(
			['Use MX-4486 from now on; MX-4471 is dead and the fee was 245.65.'],
			['ESC-2291', 'MX-4486'],
			['Correction: use MX-4490, not MX-4486.', 'The fee is 15 dollars.'],
		)
		assert.deepEqual([...stale].sort(), ['245.65', 'ESC-2291', 'MX-4471'].sort())
	})

	it('compares built sources with current sources by message, sentence, and text', () => {
		const current: readonly AggregateSource[] = [
			first,
			{ id: 'c', sentence: 0, role: 'user', text: 'A new line.', day: '2026-10-09' },
			{ id: 'c', sentence: 1, role: 'user', text: 'Another new line.', day: '2026-10-09' },
		]
		const compared = compareSources(sources, current)
		assert.deepEqual(
			compared.removed.map((source) => source.id),
			['b'],
		)
		assert.deepEqual(compared.arrived, ['c'])
		const edited = compareSources(sources, [{ ...first, text: 'Changed.' }, second])
		assert.deepEqual(
			edited.removed.map((source) => source.id),
			['a'],
		)
		assert.deepEqual(edited.arrived, [])
		assert.deepEqual(compareSources([first, first], [first]).removed, [first])
		assert.deepEqual(compareSources([first], [{ ...first, day: '2026-10-10' }]).removed, [first])
		assert.deepEqual(compareSources([first], [{ ...first, role: 'assistant' }]).removed, [first])
	})

	it('puts the tool name and arguments before a tool line and nothing before another line', () => {
		const line: MirrorLine = {
			text: 'Order LH-79215 ships.',
			source: 'm1',
			sentence: 1,
			topics: [],
			role: 'tool',
		}
		const reading = {
			id: 'm1',
			name: 'lookup_order',
			arguments: { id: 'LH-79215' },
			text: '',
			result: undefined,
		}
		assert.equal(
			buildSource(line, [reading], '2026-10-08').text,
			'lookup_order {"id":"LH-79215"}: Order LH-79215 ships.',
		)
		assert.equal(
			buildSource({ ...line, role: 'user' }, [reading], '2026-10-08').text,
			'Order LH-79215 ships.',
		)
		assert.equal(buildSource(line, [], '2026-10-08').text, 'Order LH-79215 ships.')
	})

	it('cuts whole entries from the end until the block price fits the allowance', () => {
		const entries = ['alpha', 'bravo', 'charlie'].map((key) => ({
			key,
			title: key,
			date: '2026-10-08',
			ids: ['AB-12'],
			prose: `${key} prose.`,
		}))
		const price = (text: string): number => text.length
		const all = renderSummaries(entries, 10000, price, () => true)
		assert.deepEqual(
			all.kept.map((entry) => entry.key),
			['alpha', 'bravo', 'charlie'],
		)
		assert.deepEqual(all.cut, [])
		assert.ok(
			all.text.startsWith(
				`${SUMMARIES_HEADING}\n\n#### alpha, as of 2026-10-08\nIds: AB-12\nalpha prose.`,
			),
		)
		const fewer = renderSummaries(entries, all.tokens - 1, price, () => true)
		assert.deepEqual(
			fewer.kept.map((entry) => entry.key),
			['alpha', 'bravo'],
		)
		assert.deepEqual(
			fewer.cut.map((entry) => entry.key),
			['charlie'],
		)
		assert.ok(fewer.tokens <= all.tokens - 1)
		const none = renderSummaries(entries, 1, price, () => true)
		assert.deepEqual([none.text, none.kept, none.tokens], ['', [], 0])
		assert.deepEqual(
			none.cut.map((entry) => entry.key),
			['alpha', 'bravo', 'charlie'],
		)
		assert.ok(
			!renderSummaries(
				[{ key: 'alpha', title: 'alpha', date: '2026-10-08', ids: [], prose: 'alpha prose.' }],
				10000,
				price,
				() => true,
			).text.includes('Ids:'),
		)
	})
})

describe('Aggregator', () => {
	const fixtures: Fixture[] = []

	before(() => {
		globalThis.fetch = guardFetch
	})

	after(async () => {
		for (const fixture of fixtures) await fixture.close()
		globalThis.fetch = original
		rmSync(directory, { recursive: true, force: true })
		assert.deepEqual(daemon, [])
	})

	async function start(plan: Plan, retry = 1, fit: Fit = FITS): Promise<Run> {
		const run = await createRun(plan, retry, fit)
		fixtures.push(run.fixture)
		return run
	}

	describe('first build', () => {
		it('builds every desk topic and the request owner that have sources', async () => {
			const run = await start({ kind: 'first' })
			assert.deepEqual([...listKeys(run.rig)].sort(), [...DESK, OWNER].sort())
			await run.maintain('g01', LAST)
			const rows = run.rows()
			const builds = pick(rows, 'build')
			assert.deepEqual(builds.map((row) => row.topic).sort(), [...DESK, OWNER].sort())
			for (const row of builds) {
				assert.equal(row.status, 'current', row.topic)
				assert.equal(row.version, 1, row.topic)
				assert.equal(row.trigger, 'first', row.topic)
				assert.deepEqual(row.failures, [], row.topic)
				assert.equal(row.cached, false, row.topic)
				assert.equal(row.prose, SUMMARIES[row.topic], row.topic)
				assert.equal(row.goal, 'g01')
				assert.equal(row.lastSeed, LAST)
				assert.ok(row.sources.length > 0, row.topic)
				assert.ok(
					row.sources.every((source) => source.seed !== undefined && source.seed < SEEDED),
					row.topic,
				)
			}
			assert.equal(
				builds.find((row) => row.topic === OWNER)?.title,
				'Luis Ferreira (account LH-44870)',
			)
			assert.match(builds.find((row) => row.topic === 'refunds')?.ids ?? '', /MX-4486/)
		})

		it('maintains only the owners that the request names, and asks a complete contextual bundle per build and CHANGE never', async () => {
			const run = await start({ kind: 'first' })
			await run.maintain('g01', LAST)
			assert.ok(run.rig.mirror.input().owners.size > 1)
			const rows = run.rows()
			assert.deepEqual(
				rows.filter((row) => row.topic.startsWith('owner:') && row.topic !== OWNER),
				[],
			)
			const agrees = pick(rows, 'agree')
			assert.equal(agrees.length, DESK.length + 1)
			for (const row of agrees) {
				assert.equal(row.answers['agree'], AGREED)
				assert.equal(row.cached, false)
				assert.equal(row.status, 'current')
			}
			assert.deepEqual(pick(rows, 'change'), [])
			assert.deepEqual(run.judge.stats(), {
				hits: {},
				misses: {
					agree: agrees.reduce((count, row) => count + (row.support?.components.length ?? 0), 0),
				},
				transient: 0,
			})
			assert.deepEqual(run.rig.asked, [])
		})

		it('keeps every version when nothing changed, and asks nothing on a second read point', async () => {
			const run = await start({ kind: 'first' })
			await run.maintain('g01', LAST)
			const count = run.rows().length
			const requests = run.fixture.requests.length
			const stats = run.judge.stats()
			await run.maintain('g02', LAST)
			assert.equal(run.rows().length, count + DESK.length + 1)
			assert.ok(
				pick(run.rows(), 'keep').every((row) => row.result?.goal === 'g02' && row.version === 1),
			)
			assert.equal(run.fixture.requests.length, requests)
			assert.deepEqual(run.judge.stats(), stats)
		})

		it('keeps the request out of every summarizer prompt', async () => {
			const run = await start({ kind: 'first' })
			await run.maintain('g01', LAST)
			const prompts = run.summarizing()
			assert.equal(prompts.length, DESK.length + 1)
			for (const body of prompts) assert.ok(!JSON.stringify(body).includes(run.rig.request.content))
			assert.equal(run.fixture.requests.length, prompts.length)
		})
	})

	describe('rebuild on a removed source line', () => {
		it('rebuilds a topic whose source an amends and supersedes pair removed, and asks no CHANGE', async () => {
			const run = await start({ kind: 'correct' })
			await run.maintain('g01', LAST)
			const stats = run.judge.stats()
			const correction = await run.rig.advance(CORRECTION)
			const marcus = [...run.rig.seeds].find(([, index]) => index === MARCUS)?.[0]
			assert.ok(marcus !== undefined)
			assert.ok(
				run.rig.mirror.input().classification.supersessions.get(marcus)?.includes(correction.id),
			)
			await run.maintain('g02', SEEDED)
			assert.deepEqual(run.judge.stats().hits['change'] ?? 0, stats.hits['change'] ?? 0)
			assert.equal(
				run.judge.stats().misses.agree,
				pick(run.rows(), 'agree')
					.flatMap((row) => row.support?.components ?? [])
					.filter((component) => !component.cached).length,
			)
			const rows = run.rows()
			assert.deepEqual(pick(rows, 'change'), [])
			const rebuilt = pick(rows, 'build').filter((row) => row.version > 1)
			assert.deepEqual(
				rebuilt.map((row) => [row.topic, row.version, row.trigger, row.status]),
				[['refunds', 2, 'removed', 'current']],
			)
			const [second] = rebuilt
			assert.equal(second?.prose, REFUNDS_AFTER)
			assert.ok(second?.sources.some((source) => source.seed === SEEDED))
			assert.ok(!second?.sources.some((source) => source.seed === MARCUS))
			assert.equal(pick(rows, 'agree', 'refunds').length, 2)
		})

		it('keeps the earlier version in the log beside the rebuilt one', async () => {
			const run = await start({ kind: 'correct' })
			await run.maintain('g01', LAST)
			await run.rig.advance(CORRECTION)
			await run.maintain('g02', SEEDED)
			const versions = pick(run.rows(), 'build', 'refunds')
			assert.deepEqual(
				versions.map((row) => row.version),
				[1, 2],
			)
			assert.equal(versions[0]?.prose, SUMMARIES['refunds'])
			assert.match(versions[0]?.ids ?? '', /MX-4471/)
			assert.equal(versions[1]?.prose, REFUNDS_AFTER)
			assert.doesNotMatch(versions[1]?.prose ?? '', /MX-4471/)
		})
	})

	describe('CHANGE on an arriving message', () => {
		it('keeps the version when CHANGE reads no only after AGREE on the complete changed sources', async () => {
			const run = await start({ kind: 'news', change: 0.1 })
			await run.maintain('g01', LAST)
			const requests = run.summarizing().length
			const agrees = run.judge.stats().misses['agree']
			await run.rig.advance(NEWS)
			await run.maintain('g02', SEEDED)
			const changes = pick(run.rows(), 'change')
			assert.deepEqual(
				changes.map((row) => [row.topic, row.version, row.answers['change'], row.cached]),
				[['contacts', 1, 0.1, true]],
			)
			assert.deepEqual(
				changes[0]?.sources.map((source) => source.seed),
				[SEEDED],
			)
			assert.equal(run.summarizing().length, requests)
			assert.equal(run.judge.stats().misses['agree'], (agrees ?? 0) + 3)
			const kept = pick(run.rows(), 'keep', 'contacts').at(-1)
			assert.equal(kept?.result?.version, 1)
			assert.equal(kept?.result?.point, SEEDED)
			assert.ok((kept?.result?.sources.length ?? 0) > (kept?.prior?.sources.length ?? 0))
			assert.deepEqual(
				pick(run.rows(), 'build').filter((row) => row.version > 1),
				[],
			)
			await run.maintain('g03', SEEDED)
			assert.equal(pick(run.rows(), 'change').length, 1)
			assert.equal(run.judge.stats().hits['change'], 1)
		})

		it('rebuilds retained prose when complete-source AGREE rejects it', async () => {
			const run = await start({ kind: 'news', change: 0.1, retained: 0.1 })
			await run.maintain('g01', LAST)
			await run.rig.advance(NEWS)
			await run.maintain('g02', SEEDED)
			const rows = run.rows().filter((row) => row.goal === 'g02' && row.topic === 'contacts')
			assert.deepEqual(
				pick(rows, 'agree').map((row) => row.status),
				['stale', 'current'],
			)
			assert.deepEqual(
				pick(rows, 'build').map((row) => [row.version, row.trigger, row.prose]),
				[[2, 'check', CONTACTS_AFTER]],
			)
			assert.equal(pick(rows, 'keep').length, 0)
		})

		it('rebuilds the version when CHANGE reaches the cutoff, then checks the new build with AGREE', async () => {
			const run = await start({ kind: 'news', change: 0.9 })
			await run.maintain('g01', LAST)
			await run.rig.advance(NEWS)
			await run.maintain('g02', SEEDED)
			const rows = run.rows()
			assert.deepEqual(
				pick(rows, 'change').map((row) => [row.topic, row.answers['change']]),
				[['contacts', 0.9]],
			)
			const rebuilt = pick(rows, 'build').filter((row) => row.version > 1)
			assert.deepEqual(
				rebuilt.map((row) => [row.topic, row.version, row.trigger, row.status]),
				[['contacts', 2, 'change', 'current']],
			)
			assert.equal(rebuilt[0]?.prose, CONTACTS_AFTER)
			assert.deepEqual(
				pick(rows, 'agree', 'contacts').map((row) => row.version),
				[1, 2],
			)
			assert.equal(
				run.judge.stats().misses.agree,
				pick(run.rows(), 'agree')
					.flatMap((row) => row.support?.components ?? [])
					.filter((component) => !component.cached).length,
			)
		})
	})

	describe('consistency failure', () => {
		it('keeps the version number when a supported rebuild returns unchanged prose', async () => {
			const run = await start({ kind: 'news', change: 0.9, replacement: SUMMARIES['contacts'] })
			await run.maintain('g01', LAST)
			await run.rig.advance(NEWS)
			await run.maintain('g02', SEEDED)
			const builds = pick(run.rows(), 'build', 'contacts')
			assert.deepEqual(
				builds.map((row) => row.version),
				[1, 1],
			)
			assert.equal(builds[1]?.result?.goal, 'g02')
			assert.ok((builds[1]?.result?.sources.length ?? 0) > (builds[0]?.result?.sources.length ?? 0))
		})
		it('rebuilds after a retained AGREE refusal and binds the supported successor', async () => {
			const run = await start({ kind: 'news', change: 0.1, refused: true })
			await run.maintain('g01', LAST)
			await run.rig.advance(NEWS)
			await run.maintain('g02', SEEDED)
			const rows = run.rows().filter((row) => row.goal === 'g02' && row.topic === 'contacts')
			assert.ok(
				pick(rows, 'agree')[0]?.support?.components.every((component) =>
					component.error?.includes('refused'),
				),
			)
			assert.equal(pick(rows, 'build')[0]?.result?.version, 2)
		})

		it('withholds rejected retained and rebuilt prose, then recovers from restored live sources', async () => {
			const run = await start({ kind: 'news', change: 0.1, retained: 0.1, rebuilt: 0.1 }, 0)
			await run.maintain('g01', LAST)
			const message = await run.rig.advance(NEWS)
			await run.maintain('g02', SEEDED)
			const withheld = pick(run.rows(), 'withhold', 'contacts').at(-1)
			assert.equal(withheld?.prior?.version, 1)
			assert.equal(withheld?.result, undefined)
			assert.ok(withheld?.sources.some((source) => source.id === message.id))
			assert.equal(
				findSnapshot(buildTimeline(parseAggregates(readRows(run.path))), SEEDED + 1)?.topics.has(
					'contacts',
				),
				false,
			)
			run.rig.ledger.conversation.remove(message.id)
			await run.maintain('g03', SEEDED + 1)
			const recovered = pick(run.rows(), 'build', 'contacts').at(-1)
			assert.equal(recovered?.result?.goal, 'g03')
			assert.equal(recovered?.status, 'current')
			assert.equal(
				recovered?.result?.sources.some((source) => source.id === message.id),
				false,
			)
		})

		it('retires all sources including owners omitted by the live collector', async () => {
			const run = await start({ kind: 'first' })
			await run.maintain('g01', LAST)
			const prior = run.rows().filter((row) => row.event === 'build')
			run.rig.ledger.conversation.clear()
			assert.deepEqual(listKeys(run.rig), [])
			await run.maintain('g02', SEEDED)
			const retired = pick(run.rows(), 'retire')
			assert.deepEqual(retired.map((row) => row.topic).sort(), prior.map((row) => row.topic).sort())
			assert.ok(
				retired.every(
					(row) => row.prior?.version === 1 && row.result === undefined && row.sources.length === 0,
				),
			)
			assert.equal(
				findSnapshot(buildTimeline(parseAggregates(readRows(run.path))), SEEDED + 1)?.topics.size,
				0,
			)
			await run.maintain('g03', SEEDED + 1)
			assert.equal(pick(run.rows(), 'retire').length, retired.length)
		})

		it('invalidates a pass on abort after the provider receives a rebuild and recovers later', async () => {
			const controller = new AbortController()
			let enabled = false
			const run = await start({
				kind: 'correct',
				observe: () => {
					if (enabled) controller.abort(new Error('fixture abort'))
				},
			})
			await run.maintain('g01', LAST)
			await run.rig.advance(CORRECTION)
			enabled = true
			await run.aggregator.maintain(run.rig.request, 'g02', SEEDED, controller.signal)
			const rows = run.rows().filter((row) => row.goal === 'g02')
			assert.ok(rows.some((row) => row.event === 'fail'))
			assert.equal(
				rows.some((row) => row.result !== undefined),
				false,
			)
			assert.equal(
				rows.some((row) => row.status === 'current'),
				false,
			)
			assert.equal(readField(readRows(run.path).at(-1), 'status'), 'aborted')
			const shown = Object.values(SUMMARIES).join('\n')
			assert.equal(
				run.aggregator.render(
					select(run, shown),
					run.rig.request,
					run.rig.system,
					'',
					1,
					() => true,
				).text,
				'',
			)
			enabled = false
			await run.aggregator.maintain(run.rig.request, 'g03', SEEDED + 1, AbortSignal.timeout(60000))
			assert.equal(pick(run.rows(), 'build', 'refunds').at(-1)?.result?.goal, 'g03')
		})

		it('records a failed maintenance call with prior sources and recovers through the real provider', async () => {
			let failed = false
			const run = await start({
				kind: 'correct',
				observe: () => {
					if (failed) throw new Error('fixture maintenance failure')
				},
			})
			await run.maintain('g01', LAST)
			await run.rig.advance(CORRECTION)
			failed = true
			await run.aggregator.maintain(run.rig.request, 'g02', SEEDED, AbortSignal.timeout(60000))
			const failure = pick(run.rows(), 'fail', 'refunds').at(-1)
			assert.equal(failure?.prior?.version, 1)
			assert.equal(failure?.result, undefined)
			assert.ok((failure?.sources.length ?? 0) > 0)
			assert.ok(failure?.projection?.some((source) => source.text.includes('MX-4490')))
			assert.ok((failure?.error?.length ?? 0) > 0)
			assert.equal(
				findSnapshot(buildTimeline(parseAggregates(readRows(run.path))), SEEDED + 1)?.topics.has(
					'refunds',
				),
				false,
			)
			failed = false
			await run.aggregator.maintain(run.rig.request, 'g03', SEEDED + 1, AbortSignal.timeout(60000))
			assert.equal(pick(run.rows(), 'build', 'refunds').at(-1)?.result?.goal, 'g03')
		})

		it('invalidates older state when the top-level maintenance journal fails', async () => {
			const run = await start({ kind: 'first' })
			await run.maintain('g01', LAST)
			const saved = readFileSync(run.path, 'utf8')
			rmSync(run.path)
			mkdirSync(run.path)
			try {
				await assert.rejects(
					run.aggregator.maintain(run.rig.request, 'g02', SEEDED, AbortSignal.timeout(60000)),
				)
				assert.equal(
					run.aggregator.render(
						select(run, Object.values(SUMMARIES).join('\n')),
						run.rig.request,
						run.rig.system,
						'',
						1,
						() => true,
					).text,
					'',
				)
			} finally {
				rmSync(run.path, { recursive: true })
				writeFileSync(run.path, saved)
			}
			await run.aggregator.maintain(run.rig.request, 'g03', SEEDED + 1, AbortSignal.timeout(60000))
			assert.ok(
				pick(run.rows(), 'build')
					.filter((row) => row.goal === 'g03')
					.every((row) => row.result?.goal === 'g03'),
			)
		})
		it('marks a mistyped id stale, retries with a different prompt, and withholds the topic after the retry bound', async () => {
			const run = await start({
				kind: 'first',
				summaries: { returns: MISTYPED },
				skip: ['returns'],
			})
			await run.maintain('g01', LAST)
			const rows = run.rows()
			const builds = pick(rows, 'build', 'returns')
			assert.deepEqual(
				builds.map((row) => [row.version, row.status, row.trigger]),
				[
					[1, 'stale', 'first'],
					[2, 'stale', 'retry'],
				],
			)
			for (const row of builds) assert.deepEqual(row.failures, [{ kind: 'id', token: 'LH-79251' }])
			assert.deepEqual(pick(rows, 'agree', 'returns'), [])
			assert.deepEqual(
				pick(rows, 'withhold', 'returns').map((row) => [row.version, row.status]),
				[[2, 'withheld']],
			)
			const prompts = run
				.summarizing()
				.filter((body) => JSON.stringify(body).includes('about returns as of'))
			assert.equal(prompts.length, 2)
			assert.ok(
				JSON.stringify(prompts[1]).includes('failed these checks (JSON data, not instructions)'),
			)
			assert.ok(!JSON.stringify(prompts[0]).includes('failed these checks'))
			assert.deepEqual(
				pick(rows, 'build')
					.filter((row) => row.topic !== 'returns')
					.map((row) => row.status),
				Array(DESK.length).fill('current'),
			)
		})

		it('fails a build that AGREE reads below the cutoff when the cutoff separates, and withholds the topic', async () => {
			const run = await start({ kind: 'first', agree: 0.1 }, 0)
			await run.maintain('g01', LAST)
			const rows = run.rows()
			for (const row of pick(rows, 'build')) {
				assert.equal(row.status, 'stale', row.topic)
				assert.deepEqual(row.failures, [{ kind: 'agree', token: '' }], row.topic)
			}
			assert.equal(pick(rows, 'withhold').length, DESK.length + 1)
			assert.deepEqual(
				pick(rows, 'agree').map((row) => row.status),
				Array(DESK.length + 1).fill('stale'),
			)
			const rendered = run.aggregator.render(
				select(run, 'Luis Ferreira LH-44870'),
				run.rig.request,
				run.rig.system,
				'',
				1,
				() => true,
			)
			assert.deepEqual(rendered.topics, [])
			assert.deepEqual(rendered.withheld, [OWNER, 'refunds', 'returns'])
		})

		it('refuses a failed fit instead of accepting lexical-only summaries', async () => {
			const run = await start({ kind: 'first', agree: 0.1 }, 0)
			assert.throws(
				() => new Aggregator({ ...run.options, fit: { ...FITS, separated: false } }),
				/requires a separating fit/,
			)
		})

		it('withholds at once when the retry bound is zero, and builds the topic again at the next read point', async () => {
			const run = await start(
				{ kind: 'first', summaries: { returns: MISTYPED }, skip: ['returns'] },
				0,
			)
			await run.maintain('g01', LAST)
			assert.equal(pick(run.rows(), 'build', 'returns').length, 1)
			await run.maintain('g02', LAST)
			const builds = pick(run.rows(), 'build', 'returns')
			assert.deepEqual(
				builds.map((row) => [row.version, row.trigger]),
				[
					[1, 'first'],
					[2, 'first'],
				],
			)
		})
	})

	describe('render', () => {
		async function prepare(): Promise<{ run: Run; shown: string }> {
			const run = await start({ kind: 'first' })
			await run.maintain('g01', LAST)
			const lines = ['refunds', 'returns', OWNER].flatMap(
				(key) => readSources(run.rig, key).sources,
			)
			// The briefing shows the user lines of the topics and owner, and omits the lookup result with its amount.
			const shown = [
				...new Set(lines.filter((source) => source.role === 'user').map((source) => source.text)),
			].join('\n')
			return { run, shown }
		}

		it('orders the request owners before its desk topics and renders the heading and prose', async () => {
			const { run, shown } = await prepare()
			const rendered = run.aggregator.render(
				select(run, `${shown}\nThe tool says $289.00 until 2026-10-21.`),
				run.rig.request,
				run.rig.system,
				'Today is Thursday 2026-10-08.',
				1,
				() => true,
			)
			assert.deepEqual(rendered.topics, [OWNER, 'refunds', 'returns'])
			assert.deepEqual([rendered.cut, rendered.withheld, rendered.emptied], [[], [], []])
			assert.ok(
				rendered.text.startsWith(
					`${SUMMARIES_HEADING}\n\n#### Luis Ferreira (account LH-44870), as of 2026-10-08\n`,
				),
			)
			assert.ok(
				rendered.text.indexOf('#### Luis Ferreira') <
					rendered.text.indexOf('#### refunds, as of 2026-10-08'),
			)
			assert.ok(rendered.text.indexOf('#### refunds') < rendered.text.indexOf('#### returns'))
			assert.ok(rendered.text.includes(REFUNDS.join(' ')))
			assert.ok(rendered.text.includes(RETURNS.join(' ')))
			assert.ok(rendered.tokens > 0)
			assert.doesNotMatch(rendered.text, /^Ids:/m)
			assert.equal(
				rendered.tokens,
				estimateMessages([{ id: 'summaries', role: 'system', content: rendered.text }]),
			)
			assert.equal(rendered.sole, 0)
		})

		it('preserves checked multiline whitespace byte-for-byte in the exposed binding', async () => {
			const prose = REFUNDS.join('  \r\n\t')
			const run = await start({ kind: 'first', summaries: { refunds: prose } })
			await run.maintain('g01', LAST)
			const rendered = run.aggregator.render(
				select(run, Object.values(SUMMARIES).join('\n')),
				run.rig.request,
				run.rig.system,
				'',
				1,
				() => true,
			)
			assert.equal(rendered.states.find((state) => state.topic === 'refunds')?.prose, prose)
			assert.ok(rendered.text.includes(prose))
			assert.equal(pick(run.rows(), 'agree', 'refunds')[0]?.support?.candidate, prose)
		})

		it('binds the exact rendered version and refuses source changes before the next maintenance', async () => {
			const run = await start({ kind: 'correct' })
			await run.maintain('g01', LAST)
			const shown = [...Object.values(SUMMARIES), REFUNDS_AFTER].join('\n')
			const first = run.aggregator.render(
				select(run, shown),
				run.rig.request,
				run.rig.system,
				'',
				1,
				() => true,
			)
			const binding = first.states.find((one) => one.topic === 'refunds')
			assert.ok(binding !== undefined)
			assert.deepEqual(binding.state, pick(run.rows(), 'build', 'refunds')[0]?.result)
			assert.ok(first.text.includes(binding.prose))
			await run.rig.advance(CORRECTION)
			const stale = run.aggregator.render(
				select(run, shown),
				run.rig.request,
				run.rig.system,
				'',
				1,
				() => true,
			)
			assert.equal(
				stale.states.some((one) => one.topic === 'refunds'),
				false,
			)
			await run.maintain('g02', SEEDED)
			const second = run.aggregator.render(
				select(run, shown),
				run.rig.request,
				run.rig.system,
				'',
				1,
				() => true,
			)
			assert.deepEqual(
				second.states.find((one) => one.topic === 'refunds')?.state,
				pick(run.rows(), 'build', 'refunds').at(-1)?.result,
			)
			assert.equal(second.states.find((one) => one.topic === 'refunds')?.state.version, 2)
			const initialBuild = pick(run.rows(), 'build', 'refunds')[0]
			const updatedBuild = pick(run.rows(), 'build', 'refunds').at(-1)
			assert.ok(initialBuild?.ids && updatedBuild?.ids)
			assert.match(initialBuild.ids, /MX-4471/)
			assert.match(initialBuild.ids, /MX-4486/)
			assert.match(updatedBuild.ids, /MX-4486/)
			assert.match(updatedBuild.ids, /MX-4490/)
			const block = second.text
				.split(/\n\n(?=#### )/)
				.find((entry) => entry.startsWith('#### refunds,'))
			assert.equal(block, `#### refunds, as of 2026-10-08\n${REFUNDS_AFTER}`)
			assert.doesNotMatch(second.text, /^Ids:/m)
			assert.ok(collectSummaryBodies(second.text).includes(`refunds\n\n${REFUNDS_AFTER}`))
			assert.equal(second.sole, 0)
			assert.equal(
				second.tokens,
				estimateMessages([{ id: 'summaries', role: 'system', content: second.text }]),
			)
			await run.maintain('g03', SEEDED)
			assert.equal(pick(run.rows(), 'keep', 'refunds').at(-1)?.ids, updatedBuild.ids)
		})

		it('withholds the whole entry when a sentence would be dropped', async () => {
			const { run, shown } = await prepare()
			const rendered = run.aggregator.render(
				select(run, shown),
				run.rig.request,
				run.rig.system,
				'Today is Thursday 2026-10-08.',
				1,
				() => true,
			)
			assert.deepEqual(rendered.filtered, [{ topic: OWNER, sentence: OWNER_PROSE[1] }])
			assert.ok(!rendered.topics.includes(OWNER))
			assert.ok(rendered.emptied.includes(OWNER))
			assert.ok(!rendered.states.some((state) => state.topic === OWNER))
			assert.ok(!rendered.text.includes('289'))
			assert.ok(!rendered.text.includes('2026-10-21'))
			assert.doesNotMatch(rendered.text, /^Ids:/m)
			assert.equal(rendered.sole, 0)
			const withAmount = run.aggregator.render(
				select(run, `${shown}\nThe tool says $289.00 until 2026-10-21.`),
				run.rig.request,
				run.rig.system,
				'Today is Thursday 2026-10-08.',
				1,
				() => true,
			)
			assert.deepEqual(withAmount.filtered, [])
			assert.ok(withAmount.text.includes(OWNER_PROSE.join(' ')))
			assert.equal(withAmount.sole, 0)
		})

		it('renders nothing for a topic whose title or prose the selection cannot carry', async () => {
			const { run } = await prepare()
			const bare = run.aggregator.render(select(run, ''), run.rig.request, '', '', 1, () => true)
			assert.equal(bare.text, '')
			assert.deepEqual(bare.topics, [])
			assert.ok(bare.emptied.includes(OWNER))
			assert.ok(bare.emptied.includes('refunds'))
			assert.equal(bare.sole, 0)
		})

		it('withholds the title with the prose, so a title never carries an id or a name that the selection lacks', async () => {
			const { run } = await prepare()
			const shown = OWNER_PROSE[1] ?? ''
			const rendered = run.aggregator.render(
				select(run, shown),
				run.rig.request,
				'',
				'',
				1,
				() => true,
			)
			assert.ok(rendered.emptied.includes(OWNER))
			assert.ok(!rendered.text.includes('LH-44870'))
			assert.ok(!rendered.text.includes('Luis Ferreira (account'))
			assert.equal(rendered.sole, 0)
		})

		it('cuts whole topics from the end to fit the allowance at the supplied scale', async () => {
			const { run, shown } = await prepare()
			const selection = select(run, `${shown}\nThe tool says $289.00 until 2026-10-21.`)
			const full = run.aggregator.render(
				selection,
				run.rig.request,
				run.rig.system,
				'',
				1,
				() => true,
			)
			const doubled = run.aggregator.render(
				selection,
				run.rig.request,
				run.rig.system,
				'',
				2,
				() => true,
			)
			assert.ok(Math.abs(doubled.tokens - full.tokens * 2) < 1e-9)
			run.settings.allowance = full.tokens - 0.5
			const fewer = run.aggregator.render(
				selection,
				run.rig.request,
				run.rig.system,
				'',
				1,
				() => true,
			)
			assert.deepEqual(fewer.topics, [OWNER, 'refunds'])
			assert.deepEqual(fewer.cut, ['returns'])
			assert.ok(fewer.tokens <= full.tokens - 0.5)
			assert.ok(!fewer.text.includes('#### returns'))
			run.settings.allowance = 0
			const none = run.aggregator.render(
				selection,
				run.rig.request,
				run.rig.system,
				'',
				1,
				() => true,
			)
			assert.deepEqual([none.text, none.topics, none.cut], ['', [], [OWNER, 'refunds', 'returns']])
		})

		it('lists a withheld topic that the request names and renders its siblings', async () => {
			const run = await start({
				kind: 'first',
				summaries: { returns: MISTYPED },
				skip: ['returns'],
			})
			await run.maintain('g01', LAST)
			const rendered = run.aggregator.render(
				select(run, 'Luis Ferreira LH-44870 refunds'),
				run.rig.request,
				run.rig.system,
				'',
				1,
				() => true,
			)
			assert.deepEqual(rendered.withheld, ['returns'])
			assert.ok(!rendered.topics.includes('returns'))
		})
	})
})

describe('complete contextual support', () => {
	const supportDirectory = mkdtempSync(join(tmpdir(), 'bench5-support-'))
	after(() => rmSync(supportDirectory, { recursive: true, force: true }))
	it('matches the accepted independent specimen and native rendered request bytes', async () => {
		const installed: InstalledJudgeQuestion = FOCUS_QUESTION
		const vendored: JudgeQuestion = installed
		assert.deepEqual(vendored, FOCUS_QUESTION)
		const plan = buildSupportPlan(SUPPORT_SPECIMEN.candidate, SUPPORT_SPECIMEN.sources)
		assert.equal(plan.components.length, SUPPORT_SPECIMEN.components.length)
		const bodies: unknown[] = []
		const judge = createOllamaJudge({
			model: MICA_MODEL,
			system: MICA_SYSTEM,
			calibration: { temperature: MICA_CALIBRATION },
			options: { num_ctx: MICA_CONTEXT },
			fetch: (_input, init) => {
				bodies.push(init?.body)
				return Promise.reject(new Error('captured native body'))
			},
		})
		for (const [index, component] of plan.components.entries()) {
			const expected = SUPPORT_SPECIMEN.components[index]
			assert.ok(expected)
			assert.equal(component.state, expected.state)
			assert.deepEqual(component.question, expected.question)
			assert.deepEqual(component.focus, expected.focus)
			await assert.rejects(
				judge.ask(
					{ state: component.state, questions: { question: component.question } },
					new AbortController().signal,
				),
			)
			assert.equal(bodies[index], expected.body)
		}
	})

	it('covers CRLF, repeated text, date prefixes, Unicode offsets, and every suffix', () => {
		const candidate = '  Repeat. Repeat.\r\n(2026-10-10) user: Wait.\n\t😀 done.  '
		assert.deepEqual(partitionCandidate(candidate), [
			{ start: 2, end: 9, text: 'Repeat.' },
			{ start: 10, end: 17, text: 'Repeat.' },
			{ start: 19, end: 43, text: '(2026-10-10) user: Wait.' },
			{ start: 45, end: 53, text: '😀 done.' },
		])
		assert.throws(() => partitionCandidate(' \r\n\t'), /Empty/)
		const spans = partitionCandidate(candidate)
		assert.throws(() => validateCoverage(candidate, spans.slice(1)), /coverage/)
		assert.throws(() => validateCoverage(candidate, spans.slice(0, -1)), /suffix/)
		assert.throws(() => validateCoverage(candidate, [...spans, ...spans]), /custody/)
		assert.throws(
			() =>
				validateCoverage(
					candidate,
					spans.map((span) => ({ ...span, end: span.end + 1 })),
				),
			/custody/,
		)
	})

	it('requires complete membership, retains low components, and replays only identical semantic input', async () => {
		const candidate = 'First. Second.'
		const sources: readonly AggregateSource[] = [
			{ id: 'one', sentence: 0, role: 'user', day: '2026-10-10', text: candidate },
			{ id: 'two', sentence: 0, role: 'user', day: '', text: 'Confirmed.' },
		]
		const path = join(supportDirectory, 'contextual-rows.jsonl')
		const rows = buildSupportRows(MICA_MODEL, candidate, sources, 0.9).map((row, index) =>
			index === 1 ? { ...row, answer: buildNoul(0.2) } : row,
		)
		writeRows(path, rows)
		const cache = new JudgeCache({
			path,
			live: false,
			retry: 0,
			judge: {
				id: 'inert',
				name: 'inert',
				model: MICA_MODEL,
				ask: () => Promise.reject(new Error('unexpected send')),
			},
		})
		const support = new Support({ judge: cache, sent: () => 0 })
		const bundle = await support.evaluate(candidate, sources, new AbortController().signal)
		assert.equal(reduceSupport(bundle), 0.2)
		assert.equal(bundle.components.length, 3)
		assert.ok(
			bundle.components.every(
				(component) =>
					component.cached && component.sent === false && component.usage?.prompt === 30,
			),
		)
		const replay = await support.evaluate(candidate, sources, new AbortController().signal)
		assert.equal(reduceSupport(replay), 0.2)
		assert.equal(cache.stats().hits.agree, 6)
		for (const components of [
			bundle.components.slice(1),
			[...bundle.components, ...bundle.components],
			bundle.components.toReversed(),
			bundle.components.map((component) => ({ ...component, state: 'foreign' })),
			bundle.components.map((component) => ({ ...component, score: undefined })),
			bundle.components.map((component) => ({ ...component, score: Number.NaN })),
			bundle.components.map((component) => ({ ...component, score: 1.01 })),
			bundle.components.map((component) => ({ ...component, error: 'refused' })),
			bundle.components.map((component) => ({
				...component,
				focus: { start: 0, end: 1, text: 'F' },
			})),
		])
			assert.equal(reduceSupport({ ...bundle, components }), undefined)
		assert.equal(reduceSupport({ ...bundle, revision: 'foreign' }), undefined)
		assert.equal(reduceSupport({ ...bundle, model: 'foreign' }), undefined)
		for (const changed of [
			sources.toReversed(),
			sources.map((source) => ({ ...source, id: 'regrouped' })),
			sources.map((source) => ({ ...source, day: '2026-10-11' })),
		]) {
			const result = await support.evaluate(candidate, changed, new AbortController().signal)
			assert.equal(reduceSupport(result), undefined)
			assert.equal(result.components.length, 3)
			assert.ok(
				result.components.every(
					(component) =>
						!component.cached && component.sent === false && component.error !== undefined,
				),
			)
		}
		assert.equal(
			reduceSupport(await support.evaluate(candidate + ' ', sources, new AbortController().signal)),
			undefined,
		)
		assert.equal(
			buildCacheKey(MICA_MODEL, rows[0]?.state ?? '', FOCUS_QUESTION),
			buildCacheKey(MICA_MODEL, rows[0]?.state ?? '', FOCUS_QUESTION, undefined),
		)
	})

	it('retains refusal and abort attempts without scoring a prefix', async () => {
		const candidate = 'First. Second.'
		const sources: readonly AggregateSource[] = [
			{ id: 'one', sentence: 0, role: 'user', day: '', text: candidate },
		]
		const path = join(supportDirectory, 'contextual-refusal.jsonl')
		writeRows(
			path,
			buildSupportRows(MICA_MODEL, candidate, sources, 0.8).map((row, index) =>
				index === 0 ? { ...row, answer: undefined, refusal: { missing: ['true'] } } : row,
			),
		)
		const cache = new JudgeCache({
			path,
			live: false,
			retry: 0,
			judge: {
				id: 'inert',
				name: 'inert',
				model: MICA_MODEL,
				ask: () => Promise.reject(new Error('unexpected send')),
			},
		})
		const refused = await new Support({ judge: cache }).evaluate(
			candidate,
			sources,
			new AbortController().signal,
		)
		assert.equal(refused.components.length, 3)
		assert.ok(refused.components[0]?.refusal)
		assert.equal(reduceSupport(refused), undefined)
		const abort = new AbortController()
		const live = new JudgeCache({
			path: join(supportDirectory, 'contextual-abort.jsonl'),
			live: true,
			retry: 0,
			judge: {
				id: 'inert',
				name: 'inert',
				model: MICA_MODEL,
				ask: () => {
					abort.abort(new Error('stopped'))
					return Promise.reject(new Error('stopped'))
				},
			},
		})
		const stopped = await new Support({ judge: live }).evaluate(candidate, sources, abort.signal)
		assert.equal(stopped.components.length, 1)
		assert.match(stopped.components[0]?.error ?? '', /stopped/)
		assert.equal(reduceSupport(stopped), undefined)
	})

	it('binds fresh archived controls, refuses historical singular evidence, and sums every component cost', async () => {
		const archived = readRefitControls(REFIT_CONTROLS)
		assert.equal(archived.length, 12)
		assert.throws(() => collectControlReadings(archived, archived), /fresh eligible/)
		const path = join(supportDirectory, 'contextual-controls.jsonl')
		writeRows(
			path,
			archived.flatMap((control) =>
				control.lexical
					? buildSupportRows(
							MICA_MODEL,
							control.candidate,
							control.sources,
							control.verdict === 'supported' ? 0.9 : 0.2,
						)
					: [],
			),
		)
		const support = new Support({
			judge: new JudgeCache({
				path,
				live: false,
				retry: 0,
				judge: {
					id: 'inert',
					name: 'inert',
					model: MICA_MODEL,
					ask: () => Promise.reject(new Error('unexpected send')),
				},
			}),
			sent: () => 0,
		})
		const observed = await Promise.all(
			archived.map(async (control) =>
				control.lexical
					? {
							...control,
							support: await support.evaluate(
								control.candidate,
								control.sources,
								new AbortController().signal,
							),
						}
					: control,
			),
		)
		const readings = collectControlReadings(archived, observed)
		assert.ok(
			readings.every(
				(reading) =>
					!reading.generated &&
					(!reading.lexical || reading.score === (reading.verdict === 'supported' ? 0.9 : 0.2)),
			),
		)
		assert.throws(() => collectControlReadings(archived, observed.slice(1)), /membership/)
		assert.throws(
			() =>
				collectControlReadings(
					archived,
					observed.map((control) => ({ ...control, candidate: control.candidate + ' ' })),
				),
			/bijection/,
		)
		assert.equal(
			isRefitAttempt({
				id: 'one',
				context: 'one',
				ordinal: 0,
				prompt: [],
				key: 'key',
				wall: 0,
				judge: { key: 'historical', score: 1, cached: true, wall: 0 },
			}),
			false,
		)
		const components = observed.flatMap((control) => control.support?.components ?? [])
		const replay = measureRefitCosts([], observed)
		assert.equal(replay.controls[0]?.requests, 0)
		assert.equal(replay.replay, components.length)
		const fresh = observed.map((control) =>
			control.support === undefined
				? control
				: {
						...control,
						support: {
							...control.support,
							components: control.support.components.map((component) => ({
								...component,
								cached: false,
								sent: true,
								wall: 7,
							})),
						},
					},
		)
		const costs = measureRefitCosts([], fresh)
		assert.equal(costs.controls[0]?.requests, components.length)
		assert.equal(costs.controls[0]?.prompt, components.length * 30)
		assert.equal(costs.controls[0]?.completion, components.length)
		assert.equal(costs.controls[0]?.wall, components.length * 7)
		for (const file of [
			'bench5/types.ts',
			'bench5/aggregates/Support.ts',
			'bench5/aggregates/validators.ts',
			'bench5/refit/validators.ts',
			'bench5/calibrate.ts',
			'bench5/report.ts',
			'vendor/agent-0.0.30-trimmed/index.d.ts',
			'vendor/ollama/index.d.ts',
		])
			assert.ok(REFIT_IMPLEMENTATION.includes(file))
	})
})

describe('summary body validation', () => {
	it('requires prose after an optional IDs header without backtracking the header into prose', () => {
		const heading = `${SUMMARIES_HEADING}\n\n#### Refunds, as of 2026-10-08\n`
		for (const body of ['Ids: LH-100', 'Ids: LH-100\n', 'Ids: LH-100\n  \n', 'Ids:\n', '\n  ']) {
			assert.deepEqual(collectSummaryBodies(heading + body), [], JSON.stringify(body))
		}
	})

	it('preserves valid prose with and without an IDs header', () => {
		const heading = `${SUMMARIES_HEADING}\n\n#### Refunds, as of 2026-10-08\n`
		assert.deepEqual(collectSummaryBodies(`${heading}Ids: LH-100\nRefund 40.`), [
			'Refunds\nLH-100\nRefund 40.',
		])
		assert.deepEqual(collectSummaryBodies(`${heading}Refund 40.`), ['Refunds\n\nRefund 40.'])
		assert.deepEqual(collectSummaryBodies(`${heading}Refund 40.\nIds: LH-100`), [
			'Refunds\n\nRefund 40.\nIds: LH-100',
		])
	})
})

describe('complete request admission', () => {
	it('prices the real builder framing, scale, fixed tool cost, and selected evidence while cutting whole entries in order', () => {
		const context = createAgentContext({ system: 'Support desk rules.' })
		context.instructions.add({
			name: 'date',
			content: 'Today is Thursday 2026-10-08.',
			priority: 10,
		})
		const selection = {
			messages: [{ id: 'question', role: 'user' as const, content: 'alpha bravo charlie' }],
			briefing: 'Selected evidence.',
			judgments: [],
		}
		const entries = ['alpha', 'bravo', 'charlie'].map((key) => ({
			key,
			title: key,
			date: '2026-10-08',
			ids: [],
			prose: `${key} details.`,
		}))
		const seen: string[] = []
		const all = renderSummaries(
			entries,
			10000,
			(text) => text.length,
			() => true,
		)
		context.instructions.add({ ...INSTRUCTION_SUMMARIES, content: all.text })
		const scale = 2
		const fixed = ADMISSION_LIMIT - estimateMessages(context.build(selection)) * scale + 1
		const block = renderSummaries(
			entries,
			10000,
			(text) => text.length,
			(text) => {
				seen.push(text)
				context.instructions.add({ ...INSTRUCTION_SUMMARIES, content: text })
				return estimateMessages(context.build(selection)) * scale + fixed <= ADMISSION_LIMIT
			},
		)
		assert.deepEqual(
			block.kept.map((entry) => entry.key),
			['alpha', 'bravo'],
		)
		assert.deepEqual(
			block.cut.map((entry) => entry.key),
			['charlie'],
		)
		assert.equal(seen.length, 2)
		assert.equal(context.build(selection).at(-1), selection.messages[0])
		assert.ok(context.build(selection)[0]?.content.endsWith(selection.briefing))
		assert.ok(estimateMessages(context.build(selection)) * scale + fixed <= ADMISSION_LIMIT)
		const none = renderSummaries(
			entries,
			10000,
			(text) => text.length,
			() => false,
		)
		assert.deepEqual([none.text, none.kept, none.cut], ['', [], entries])
	})

	it('counts nonempty rendered topic prose and rejects a heading-only exposure control', () => {
		assert.deepEqual(collectSummaryBodies(SUMMARIES_HEADING), [])
		assert.deepEqual(
			collectSummaryBodies(`${SUMMARIES_HEADING}\n\n#### Refunds, as of 2026-10-08\n`),
			[],
		)
		assert.deepEqual(
			collectSummaryBodies(
				`${SUMMARIES_HEADING}\n\n#### Refunds, as of 2026-10-08\nIds: LH-100\nRefund 40.`,
			),
			['Refunds\nLH-100\nRefund 40.'],
		)
	})
})
