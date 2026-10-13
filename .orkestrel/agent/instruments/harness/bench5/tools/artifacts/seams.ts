// Probes every seam the aggregate arm relies on in an @orkestrel/agent build, offline:
//   node .build/bench5/tools/artifacts/seams.js --build PATH [--json]
// PATH is the build's index.js, resolved against the working directory. The probe replaces fetch with a thrower
// before it imports the build, constructs a ledger from an inert provider and an inert judge, and prints one line
// per seam, the build's SHA-256, and the count of fetch calls.
// Exit: 0 when every seam holds; 1 when a seam fails or the build does not load; 64 on usage.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

interface Seam {
	readonly name: string
	readonly detail: string | undefined
}

type Check = (build: unknown) => Promise<readonly Seam[]>

interface Flags {
	readonly build: string
	readonly json: boolean
}

type Shape = 'function' | 'object' | 'string' | 'number'

interface ExportShape {
	readonly name: string
	readonly shape: Shape
}

const USAGE = 'usage: node .build/bench5/tools/artifacts/seams.js --build PATH [--json]'
const HARNESS = resolve(import.meta.dirname, '../../..')
const TOPICS = join(HARNESS, 'bench', 'variants', 'ledger', 'v1.json')
const SYSTEM = 'You are the Larkspur Home support assistant.'
const CAPACITY = 3072
// The thresholds of bench4/constants.mjs, which the long scenario's ledger runs under.
const FIT = Object.freeze({
	category: 0.7,
	topic: 0.6,
	amends: 0.75,
	supersedes: 0.95,
	correction: 0.3,
})
const NOTES = Object.freeze(['cue', 'results', 'repeat', 'closure'])
const QUESTIONS = Object.freeze(['category', 'topic', 'amends', 'supersedes'])
const CATEGORIES = Object.freeze([
	'fact',
	'rule',
	'correction',
	'request',
	'opinion',
	'chatter',
	'distractor',
])
const OPEN = '## Instructions'
const PINNED = '## Pinned'
const EXPORTS: readonly ExportShape[] = Object.freeze([
	{ name: 'createLedger', shape: 'function' },
	{ name: 'createConversationManager', shape: 'function' },
	{ name: 'createScope', shape: 'function' },
	{ name: 'createAgent', shape: 'function' },
	{ name: 'isLedgerError', shape: 'function' },
	{ name: 'Classifier', shape: 'function' },
	{ name: 'Gauge', shape: 'function' },
	{ name: 'AgentContext', shape: 'function' },
	{ name: 'InstructionManager', shape: 'function' },
	{ name: 'ConversationManager', shape: 'function' },
	{ name: 'buildRecords', shape: 'function' },
	{ name: 'buildLines', shape: 'function' },
	{ name: 'collectRegistry', shape: 'function' },
	{ name: 'collectNames', shape: 'function' },
	{ name: 'collectToolGroups', shape: 'function' },
	{ name: 'matchEntities', shape: 'function' },
	{ name: 'linkOwners', shape: 'function' },
	{ name: 'findLedgerCall', shape: 'function' },
	{ name: 'identifyLookup', shape: 'function' },
	{ name: 'extractTokens', shape: 'function' },
	{ name: 'splitSentences', shape: 'function' },
	{ name: 'estimateMessages', shape: 'function' },
	{ name: 'renderLedgerPinned', shape: 'function' },
	{ name: 'LEDGER_QUESTIONS', shape: 'object' },
	{ name: 'LEDGER_NOTES', shape: 'object' },
	{ name: 'LEDGER_CATEGORIES', shape: 'object' },
	{ name: 'DEFAULT_LEDGER_SHARE', shape: 'object' },
	{ name: 'DETERMINISTIC_JUDGE_ERROR', shape: 'object' },
	{ name: 'DEFAULT_LEDGER_LIMIT', shape: 'number' },
	{ name: 'DEFAULT_RECALL_LIMIT', shape: 'number' },
	{ name: 'LEDGER_SCALE_DRIFT', shape: 'number' },
	{ name: 'LEDGER_RULES_KEY', shape: 'string' },
	{ name: 'LEDGER_OWNER_PREFIX', shape: 'string' },
])

let fetchCalls = 0

function throwFetch(): never {
	fetchCalls += 1
	throw new Error('seams probe: fetch is blocked')
}

function blockFetch(): void {
	globalThis.fetch = throwFetch
}

function describeError(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

function isObjectLike(value: unknown): value is object {
	return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readMember(target: unknown, key: string): unknown {
	return isObjectLike(target) ? Reflect.get(target, key) : undefined
}

function hasMember(target: unknown, key: string): boolean {
	return isObjectLike(target) && Reflect.has(target, key)
}

function hasFunction(target: unknown, key: string): boolean {
	return typeof readMember(target, key) === 'function'
}

function callMember(target: unknown, key: string, args: readonly unknown[]): unknown {
	const member = readMember(target, key)
	if (typeof member !== 'function') throw new Error(`${key} is not a function`)
	const result: unknown = Reflect.apply(member, target, args)
	return result
}

function listKeys(value: unknown): readonly string[] {
	return isRecord(value) ? Object.keys(value) : []
}

function listStrings(value: unknown): readonly string[] {
	if (!Array.isArray(value)) return []
	const strings: string[] = []
	for (const item of value) if (typeof item === 'string') strings.push(item)
	return strings
}

function judgeSeam(name: string, holds: boolean, detail: string): Seam {
	return { name, detail: holds ? undefined : detail }
}

function parseFlags(argv: readonly string[]): Flags | undefined {
	let build: string | undefined
	let json = false
	for (let at = 0; at < argv.length; at += 1) {
		const flag = argv[at]
		if (flag === '--json') json = true
		else if (flag === '--build') {
			const value = argv[at + 1]
			if (value === undefined || value.startsWith('--')) return undefined
			build = value
			at += 1
		} else return undefined
	}
	return build === undefined ? undefined : { build, json }
}

function readTopics(): readonly object[] {
	const parsed: unknown = JSON.parse(readFileSync(TOPICS, 'utf8'))
	const topics = readMember(readMember(parsed, 'ledger'), 'topics')
	if (!isRecord(topics)) throw new Error(`${TOPICS} holds no ledger topics`)
	const list: object[] = []
	for (const [name, criterion] of Object.entries(topics))
		list.push({ name, criterion, requested: name !== 'warehouse' })
	return list
}

function createInertProvider(): object {
	return {
		id: 'inert-provider',
		name: 'inert',
		model: 'inert',
		generate: rejectInert,
		replay: rejectInert,
	}
}

function createInertJudge(): object {
	return { id: 'inert-judge', name: 'inert', model: 'inert', ask: rejectInert }
}

function rejectInert(): Promise<never> {
	return Promise.reject(new Error('seams probe: inert boundary called'))
}

function selectMarker(): Promise<object> {
	return Promise.resolve({ messages: [], judgments: ['marker'] })
}

function createLedgerFrom(build: unknown): unknown {
	return callMember(build, 'createLedger', [
		createInertProvider(),
		{
			judge: createInertJudge(),
			system: SYSTEM,
			topics: readTopics(),
			questions: readMember(build, 'LEDGER_QUESTIONS'),
			thresholds: FIT,
			capacity: CAPACITY,
			predict: 0,
			think: false,
		},
	])
}

function compareLists(actual: readonly string[], expected: readonly string[]): boolean {
	return actual.length === expected.length && expected.every((item, at) => actual[at] === item)
}

async function checkExports(build: unknown): Promise<readonly Seam[]> {
	const seams: Seam[] = []
	for (const { name, shape } of EXPORTS) {
		const value = readMember(build, name)
		const actual = value === null ? 'null' : typeof value
		seams.push(
			judgeSeam(
				`export ${name}`,
				actual === shape && value !== undefined,
				`expected ${shape}, found ${actual}`,
			),
		)
	}
	return seams
}

async function checkConstants(build: unknown): Promise<readonly Seam[]> {
	const notes = listKeys(readMember(build, 'LEDGER_NOTES'))
	const questions = listKeys(readMember(build, 'LEDGER_QUESTIONS'))
	const categories = listStrings(readMember(build, 'LEDGER_CATEGORIES'))
	return [
		judgeSeam(
			'LEDGER_NOTES members',
			NOTES.every((key) => notes.includes(key)),
			`expected ${NOTES.join(', ')}, found ${notes.join(', ')}`,
		),
		judgeSeam(
			'LEDGER_QUESTIONS members',
			QUESTIONS.every((key) => questions.includes(key)),
			`expected ${QUESTIONS.join(', ')}, found ${questions.join(', ')}`,
		),
		judgeSeam(
			'LEDGER_CATEGORIES order',
			compareLists(categories, CATEGORIES),
			`expected ${CATEGORIES.join(', ')}, found ${categories.join(', ')}`,
		),
	]
}

async function checkLedger(build: unknown): Promise<readonly Seam[]> {
	const ledger = createLedgerFrom(build)
	const seams: Seam[] = []
	for (const key of ['respond', 'calibrate'])
		seams.push(judgeSeam(`ledger ${key}`, hasFunction(ledger, key), `${key} is not a function`))
	for (const key of ['conversation', 'agent'])
		seams.push(
			judgeSeam(`ledger ${key}`, isObjectLike(readMember(ledger, key)), `${key} is not an object`),
		)
	seams.push(
		judgeSeam(
			'ledger gauge',
			hasMember(ledger, 'gauge') && readMember(ledger, 'gauge') === undefined,
			'gauge is missing or set before calibration',
		),
	)
	return seams
}

async function checkContext(build: unknown): Promise<readonly Seam[]> {
	const agent = readMember(createLedgerFrom(build), 'agent')
	const context = readMember(agent, 'context')
	const instructions = readMember(context, 'instructions')
	const seams: Seam[] = []
	for (const key of ['apply', 'select', 'build'])
		seams.push(judgeSeam(`context ${key}`, hasFunction(context, key), `${key} is not a function`))
	seams.push(judgeSeam('context scope', hasMember(context, 'scope'), 'scope is missing'))
	for (const key of ['add', 'remove', 'instruction'])
		seams.push(
			judgeSeam(`instructions ${key}`, hasFunction(instructions, key), `${key} is not a function`),
		)
	seams.push(
		judgeSeam(
			'agent emitter on',
			hasFunction(readMember(agent, 'emitter'), 'on'),
			'emitter.on is not a function',
		),
	)
	seams.push(
		judgeSeam(
			'instructions open',
			readMember(instructions, 'open') === OPEN,
			`expected ${OPEN}, found ${String(readMember(instructions, 'open'))}`,
		),
	)
	callMember(instructions, 'add', [{ name: 'date', content: 'Today is first.' }])
	callMember(instructions, 'add', [{ name: 'date', content: 'Today is second.' }])
	const kept = readMember(callMember(instructions, 'instruction', ['date']), 'content')
	seams.push(
		judgeSeam(
			'instructions overwrite by name',
			kept === 'Today is second.' && readMember(instructions, 'count') === 1,
			`expected one instruction reading second, found ${String(kept)}`,
		),
	)
	const removed = callMember(instructions, 'remove', ['date'])
	seams.push(
		judgeSeam(
			'instructions remove by name',
			removed === true && callMember(instructions, 'instruction', ['date']) === undefined,
			'remove did not drop the instruction',
		),
	)
	return seams
}

async function checkClassifier(build: unknown): Promise<readonly Seam[]> {
	const prototype = readMember(readMember(build, 'Classifier'), 'prototype')
	const seams: Seam[] = []
	for (const key of ['classify', 'classification', 'category', 'quiet', 'topics'])
		seams.push(
			judgeSeam(`Classifier ${key}`, hasFunction(prototype, key), `${key} is not a function`),
		)
	seams.push(
		judgeSeam(
			'Gauge observe',
			hasFunction(readMember(readMember(build, 'Gauge'), 'prototype'), 'observe'),
			'observe is not a function',
		),
	)
	return seams
}

async function checkBuild(build: unknown): Promise<readonly Seam[]> {
	const context = readMember(readMember(createLedgerFrom(build), 'agent'), 'context')
	callMember(readMember(context, 'instructions'), 'add', [{ name: 'date', content: 'Today is X.' }])
	const built = callMember(context, 'build', [{ messages: [], judgments: [], briefing: PINNED }])
	if (!Array.isArray(built))
		return [judgeSeam('context build order', false, 'build returned no array')]
	const system = built[0]
	const content = readMember(system, 'content')
	const text = typeof content === 'string' ? content : ''
	const at = [text.indexOf(SYSTEM), text.indexOf(`${OPEN}\n\nToday is X.`), text.indexOf(PINNED)]
	return [
		judgeSeam(
			'context build one system message',
			built.length === 1 && readMember(system, 'role') === 'system',
			`expected one system message, found ${built.length} messages`,
		),
		judgeSeam(
			'context build order',
			at[0] === 0 && at[0] < at[1] && at[1] < at[2] && text.endsWith(PINNED),
			`expected system, instruction, briefing last; found offsets ${at.join(', ')}`,
		),
	]
}

async function checkScope(build: unknown): Promise<readonly Seam[]> {
	const ledger = createLedgerFrom(build)
	const context = readMember(readMember(ledger, 'agent'), 'context')
	const request = callMember(readMember(ledger, 'conversation'), 'add', [
		{ role: 'user', content: 'Where is order LH-1?' },
	])
	const signal = new AbortController().signal
	const scope = callMember(build, 'createScope', [{ name: 'marker', select: selectMarker }])
	callMember(context, 'apply', [scope])
	const applied = await callMember(context, 'select', [request, signal])
	const seams = [
		judgeSeam(
			'scope applied after construction',
			readMember(context, 'scope') === scope,
			'context.scope is not the applied scope',
		),
		judgeSeam(
			'select reads the scope at call time',
			listStrings(readMember(applied, 'judgments')).includes('marker'),
			'select did not return the applied scope handler result',
		),
	]
	callMember(context, 'apply', [undefined])
	const restored = await callMember(context, 'select', [request, signal])
	const marked = listStrings(readMember(restored, 'judgments')).includes('marker')
	seams.push(
		judgeSeam(
			'select falls back to the ledger handler',
			Array.isArray(readMember(restored, 'messages')) && !marked,
			'select did not run the ledger handler after the scope was removed',
		),
	)
	return seams
}

async function checkConversation(build: unknown): Promise<readonly Seam[]> {
	const manager = callMember(build, 'createConversationManager', [])
	const conversation = callMember(manager, 'add', [{}])
	const added = callMember(conversation, 'add', [{ role: 'user', content: 'one' }])
	const batch = callMember(conversation, 'add', [
		[
			{ role: 'assistant', content: 'two' },
			{ role: 'user', content: 'three' },
		],
	])
	const messages = callMember(conversation, 'messages', [])
	const identifier = readMember(added, 'id')
	const judgments = readMember(conversation, 'judgments')
	const seams = [
		judgeSeam(
			'conversation add one',
			typeof identifier === 'string',
			'add returned no message with an id',
		),
		judgeSeam(
			'conversation add batch',
			Array.isArray(batch) && batch.length === 2,
			'add of a batch returned no array of two',
		),
		judgeSeam(
			'conversation messages',
			Array.isArray(messages) && messages.length === 3,
			'messages did not list the three messages added',
		),
		judgeSeam(
			'conversation message',
			readMember(callMember(conversation, 'message', [identifier]), 'content') === 'one',
			'message did not return the message by id',
		),
		judgeSeam(
			'conversation view',
			Array.isArray(callMember(conversation, 'view', [])),
			'view returned no array',
		),
	]
	for (const key of ['judgment', 'judgments', 'resolve', 'add'])
		seams.push(
			judgeSeam(`judgments ${key}`, hasFunction(judgments, key), `${key} is not a function`),
		)
	return seams
}

const CHECKS: readonly Check[] = Object.freeze([
	checkExports,
	checkConstants,
	checkLedger,
	checkContext,
	checkClassifier,
	checkBuild,
	checkScope,
	checkConversation,
])

async function executeChecks(build: unknown): Promise<readonly Seam[]> {
	const seams: Seam[] = []
	for (const check of CHECKS) {
		try {
			seams.push(...(await check(build)))
		} catch (error) {
			seams.push({ name: check.name, detail: `threw ${describeError(error)}` })
		}
	}
	return seams
}

function formatSeam(seam: Seam): string {
	return seam.detail === undefined ? `ok   ${seam.name}` : `FAIL ${seam.name}: ${seam.detail}`
}

async function main(argv: readonly string[]): Promise<number> {
	const flags = parseFlags(argv)
	if (flags === undefined) {
		console.error(USAGE)
		return 64
	}
	blockFetch()
	const path = resolve(flags.build)
	const digest = createHash('sha256').update(readFileSync(path)).digest('hex')
	let seams: readonly Seam[]
	try {
		const build: unknown = await import(pathToFileURL(path).href)
		seams = await executeChecks(build)
	} catch (error) {
		seams = [{ name: 'import build', detail: describeError(error) }]
	}
	const failed = seams.filter((seam) => seam.detail !== undefined)
	if (flags.json) {
		console.log(
			JSON.stringify({
				build: path,
				sha256: digest,
				fetchCalls,
				seams: seams.map((seam) => ({
					name: seam.name,
					ok: seam.detail === undefined,
					detail: seam.detail,
				})),
			}),
		)
	} else {
		for (const seam of seams) console.log(formatSeam(seam))
		console.log(`sha256 ${digest}`)
		console.log(`fetch calls ${fetchCalls}`)
	}
	return failed.length === 0 && fetchCalls === 0 ? 0 : 1
}

process.exitCode = await main(process.argv.slice(2))
