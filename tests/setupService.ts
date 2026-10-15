import type {
	MemoryContextFixture,
	MemoryProfileFixture,
	MemoryReplyFixture,
	MemoryServerFixture,
	MemoryWireFixture,
	StudyServiceFixture,
	StudyServicePackage,
	StudyServiceResult,
} from './service/studies/memory/types.js'
import type { ScratchInterface } from '@orkestrel/test/server'
import type { StudyEvidence, StudyProfile } from '@orkestrel/study'
import type { StudyValidation } from '@orkestrel/study/server'
import type { StudyToolsFixture } from './service/studies/tools/types.js'
import { isRecord, parseJSON } from '@orkestrel/contract'
import {
	parseStudyDefinition,
	parseStudyProfile,
	parseStudyRubric,
	parseStudyScenario,
	buildStudySchedule,
	validateStudyInputs,
	StudyControl,
	StudyMeter,
	StudyScope,
} from '@orkestrel/study'
import { isStudyCustodyEvidence } from '@orkestrel/study/server'
import * as subject from '../dist/src/core/index.js'
import * as provider from '@orkestrel/ollama'
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { cpSync, lstatSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/** Composes the selected built Agent with the installed public Ollama provider. */
export const STUDY_MEMORY_MODULES = Object.freeze({ subject, provider })

/** Pins the identity gauge compaction fixtures declare explicitly; it prices a request at its raw estimate. */
export const STUDY_MEMORY_SETTINGS = Object.freeze({
	gauge: Object.freeze({ scale: 1, overhead: 0 }),
})

/** Pins a short request whose admission depends on the declared gauge. */
export const WINDOW_GOAL = Object.freeze({
	id: 'first',
	input: { prompt: 'State the order count', arrivals: [], records: [] },
})

/** Pins the authored trial order independently of native execution output. */
export const STUDY_MEMORY_SCHEDULE = Object.freeze([
	Object.freeze(['records', 0]),
	Object.freeze(['compaction', 0]),
	Object.freeze(['full', 0]),
	Object.freeze(['full', 1]),
	Object.freeze(['compaction', 1]),
	Object.freeze(['records', 1]),
])

/** Pins the complete authored goal horizon. */
export const STUDY_MEMORY_GOALS = Object.freeze(['opening', 'correction', 'closure'])

/** Pins the independent before-release, initial, replacement and retained lookup trajectory. */
export const STUDY_MEMORY_RELEASE_GOALS = Object.freeze([
	Object.freeze({ id: 'before', records: Object.freeze([]) }),
	Object.freeze({
		id: 'initial',
		records: Object.freeze([
			Object.freeze({ id: 'order:BC-7301', name: 'Mara Ellison', content: 'Original $265.86' }),
		]),
	}),
	Object.freeze({
		id: 'replacement',
		records: Object.freeze([
			Object.freeze({
				id: 'order:BC-7301',
				name: 'Mara Ellison revised',
				content: 'Corrected $260.35',
			}),
		]),
	}),
	Object.freeze({ id: 'retained', records: Object.freeze([]) }),
])

/** Pins independently chosen public arrival and lookup release boundaries. */
export const STUDY_ENDURANCE_BOUNDARIES = Object.freeze([
	Object.freeze([
		'ev-01-1',
		Object.freeze([
			'endurance-desk',
			'ev-opening',
			'ev-register',
			'endurance-day:2031-02-02',
			'ev-source-1-1',
			'ev-source-1-2',
			'ev-source-1-3',
			'ev-source-1-4',
		]),
		Object.freeze(['order:BC-7301', 'customer:BC-4101']),
	] as const),
	Object.freeze(['ev-01-2', Object.freeze([]), Object.freeze([])] as const),
	Object.freeze([
		'ev-09-1',
		Object.freeze([
			'endurance-day:2031-02-10',
			'ev-source-9-1',
			'ev-source-9-2',
			'ev-source-9-3',
			'ev-source-9-4',
			'ev-side-9',
		]),
		Object.freeze(['order:BC-7309', 'customer:BC-4109', 'customer:BC-4105']),
	] as const),
	Object.freeze([
		'ev-13-1',
		Object.freeze([
			'endurance-day:2031-02-14',
			'ev-source-13-1',
			'ev-source-13-2',
			'ev-source-13-3',
			'ev-source-13-4',
		]),
		Object.freeze(['order:BC-7301', 'customer:BC-4101']),
	] as const),
	Object.freeze([
		'ev-24-1',
		Object.freeze([
			'endurance-day:2031-02-25',
			'ev-source-24-1',
			'ev-source-24-2',
			'ev-source-24-3',
			'ev-source-24-4',
		]),
		Object.freeze(['order:BC-7312']),
	] as const),
	Object.freeze(['ev-24-4', Object.freeze([]), Object.freeze([])] as const),
])

/** Copies manifest and dist bytes for a selected installed runtime dependency closure.
 * @param scratch - Exclusive owner of the copied tree.
 * @param selections - Initial package roots; an earlier selection wins throughout the graph.
 * @returns Every actual source and regular target package directory.
 */
export function captureServicePackages(
	scratch: ScratchInterface,
	selections: ReadonlyMap<string, string>,
): readonly StudyServicePackage[] {
	const sources = new Map(selections)
	const packages: StudyServicePackage[] = []
	for (const [name, source] of sources) {
		const manifest = parseJSON(readFileSync(join(source, 'package.json'), 'utf8'))
		if (!isRecord(manifest) || manifest.name !== name)
			throw new Error(`Malformed selected package ${name}`)
		const dependencies = manifest.dependencies
		if (dependencies !== undefined && !isRecord(dependencies))
			throw new Error(`Invalid dependencies for ${name}`)
		const target = scratch.ensure(join('node_modules', name))
		cpSync(join(source, 'package.json'), join(target, 'package.json'))
		cpSync(join(source, 'dist'), join(target, 'dist'), { recursive: true, dereference: true })
		if (lstatSync(target).isSymbolicLink()) throw new Error(`Linked fixture package ${name}`)
		packages.push(Object.freeze({ name, source, target }))
		const require = createRequire(join(source, 'package.json'))
		for (const dependency of Object.keys(dependencies ?? {}))
			if (!sources.has(dependency))
				sources.set(dependency, dirname(require.resolve(`${dependency}/package.json`)))
	}
	return Object.freeze(packages)
}

/** Captures the actual Agent, installed Study and Ollama bytes with authored CPU workloads.
 * @param scratch - Exclusive workspace owner, cleaned by the caller in finally.
 * @param url - Ephemeral native Ollama protocol fixture origin.
 * @returns The installed command and complete copied runtime closure.
 */
export function createStudyServiceFixture(
	scratch: ScratchInterface,
	url: string,
): StudyServiceFixture {
	const packages = captureServicePackages(
		scratch,
		new Map([
			['@orkestrel/agent', resolve('.')],
			['@orkestrel/study', resolve('node_modules/@orkestrel/study')],
			['@orkestrel/ollama', resolve('node_modules/@orkestrel/ollama')],
		]),
	)
	for (const target of ['memory', 'capacity'])
		cpSync(resolve('studies', target), scratch.ensure(join('studies', target)), { recursive: true })
	const raw = parseJSON(scratch.read('studies/memory/profiles/local.json') ?? '')
	if (!isRecord(raw) || !isRecord(raw.bounds)) throw new Error('Missing authored memory profile')
	const bounds: Record<string, unknown> = {}
	for (const [scope, duration] of Object.entries({
		request: 3000,
		goal: 30000,
		trial: 90000,
		series: 240000,
	})) {
		const limit = raw.bounds[scope]
		if (!isRecord(limit)) throw new Error(`Missing ${scope} bound`)
		bounds[scope] = { ...limit, duration }
	}
	scratch.write(
		'studies/memory/profiles/local.json',
		JSON.stringify({
			...raw,
			name: 'local',
			settings: STUDY_MEMORY_SETTINGS,
			subject: join(scratch.path, 'node_modules/@orkestrel/agent/dist/src/core/index.js'),
			roots: packages.map((entry) => entry.target),
			bounds,
			provider: {
				entry: join(scratch.path, 'node_modules/@orkestrel/ollama/dist/src/core/index.js'),
				url,
				model: 'model',
				judge: 'judge',
				digest: { model: 'a'.repeat(64), judge: 'b'.repeat(64) },
			},
			qualification: 'tmp/studies/memory-capacity',
		}),
	)
	return Object.freeze({
		scratch,
		packages,
		entry: join(scratch.path, 'node_modules/@orkestrel/study/dist/bin/main.js'),
	})
}

/** Drives the actual installed Study executable through its public native command boundary.
 * @param fixture - Captured installed command and working directory.
 * @param arguments_ - Exact public command arguments, including emitted next hints.
 * @param duration - Outer bound; execution retains its own request, trial and series limits.
 * @returns Native exit and separate stdout/stderr bytes.
 */
export function executeStudyService(
	fixture: StudyServiceFixture,
	arguments_: readonly string[],
	duration = 60000,
): Promise<StudyServiceResult> {
	return executeStudyProcess([fixture.entry, ...arguments_], fixture.scratch.path, duration)
}

/** Executes a real Node entry with bounded output and preserves failure diagnostics.
 * @param arguments_ - Exact Node arguments, including its JavaScript entry.
 * @param root - Native working directory.
 * @param duration - Outer process deadline in milliseconds.
 * @returns Native exit and separate stdout/stderr bytes.
 */
export function executeStudyProcess(
	arguments_: readonly string[],
	root: string,
	duration: number,
): Promise<StudyServiceResult> {
	return new Promise((done) =>
		execFile(
			process.execPath,
			[...arguments_],
			{
				cwd: root,
				windowsHide: true,
				timeout: duration,
				maxBuffer: 16 * 1024 * 1024,
			},
			(error, stdout, stderr) =>
				done({
					code: error === null ? 0 : typeof error.code === 'number' ? error.code : 1,
					stdout,
					stderr,
				}),
		),
	)
}

/** Captures and loads the actual q4 dependency topology in one disposable CPU process.
 * @param scratch - Exclusive worker-file owner, cleaned by the caller in finally.
 * @param roots - Optional root selection for admission refusal controls; defaults to q4 roots.
 * @returns Native exit and JSON observations without instantiating sessions or providers.
 * @remarks Package imports remain at their installed native locations. No package bytes are copied.
 */
export function executeStudyTopology(
	scratch: ScratchInterface,
	roots?: readonly string[],
): Promise<StudyServiceResult> {
	const entry = scratch.write(
		'topology.ts',
		`// Self-contained disposable entry: imported test setup would preload the measured modules.
import { createHash } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isArray, isRecord, parseJSON } from ${JSON.stringify(pathToFileURL(resolve('node_modules/@orkestrel/contract/dist/src/core/index.js')).href)}
import { parseStudyProfile } from ${JSON.stringify(pathToFileURL(resolve('node_modules/@orkestrel/study/dist/src/core/index.js')).href)}
import { Artifacts } from ${JSON.stringify(pathToFileURL(resolve('node_modules/@orkestrel/study/dist/src/server/index.js')).href)}

const profile = parseStudyProfile(parseJSON(readFileSync('studies/memory/profiles/q4.json', 'utf8')))
const selection = parseJSON(readFileSync(${JSON.stringify(scratch.write('roots.json', JSON.stringify({ roots })))}, 'utf8'))
if (!isRecord(selection) || (selection.roots !== undefined && (!isArray(selection.roots) || !selection.roots.every((root) => typeof root === 'string'))))
	throw new Error('Invalid topology root selection')
const roots = (selection.roots ?? profile.roots).map((root) => realpathSync(root))
const subject = realpathSync(profile.subject)
if (profile.provider === undefined) throw new Error('Missing q4 provider')
const provider = realpathSync(profile.provider.entry)
const dependency = realpathSync(fileURLToPath(import.meta.resolve('@orkestrel/agent', pathToFileURL(provider).href)))
const installed = realpathSync('node_modules/@orkestrel/agent')
const entries = roots.includes(installed) ? [subject, provider, dependency] : [subject, provider]
const identities = [subject, dependency, provider].map((path) => ({
	path,
	digest: createHash('sha256').update(readFileSync(path)).digest('hex'),
}))
console.log(JSON.stringify({ event: 'selection', roots, entries, subject, provider, dependency, identities }))
const artifacts = new Artifacts({ roots, entries })
const inventory = artifacts.inspect()
console.log(JSON.stringify({ event: 'inventory', ...inventory }))
const selected = await artifacts.load(subject)
console.log(JSON.stringify({ event: 'subject', loaded: true }))
const ollama = await artifacts.load(provider)
const agent = await artifacts.load(dependency)
if (!isRecord(selected) || !isRecord(ollama) || !isRecord(agent)) throw new Error('Invalid captured namespace')
if (typeof ollama.OllamaProvider !== 'function' || typeof ollama.OllamaJudge !== 'function')
	throw new Error('Missing captured provider classes')
console.log(JSON.stringify({
	event: 'loaded',
	subject: { agent: typeof selected.Agent === 'function', ledger: typeof selected.createLedger === 'function' },
	provider: {
		installed: Object.getPrototypeOf(ollama.OllamaProvider) === agent.AgentProvider,
		selected: Object.getPrototypeOf(ollama.OllamaProvider) === selected.AgentProvider,
	},
	judge: {
		installed: Object.getPrototypeOf(ollama.OllamaJudge) === agent.AgentJudge,
		selected: Object.getPrototypeOf(ollama.OllamaJudge) === selected.AgentJudge,
	},
}))
`,
	)
	return executeStudyProcess(['--experimental-import-meta-resolve', entry], resolve('.'), 60000)
}

/** Starts a native loopback Ollama protocol fixture on an ephemeral port. */
export async function createMemoryServer(
	responses: readonly MemoryWireFixture[] = [],
): Promise<MemoryServerFixture> {
	const queue = [...responses]
	const requests: MemoryServerFixture['requests'] = []
	const server = createServer(async (request, response) => {
		const chunks: Buffer[] = []
		for await (const chunk of request)
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
		requests.push({ path: request.url ?? '', body: Buffer.concat(chunks).toString('utf8') })
		if (request.url === '/api/tags' && queue[0]?.path !== '/api/tags') {
			response.end(
				JSON.stringify({
					models: [
						{ name: 'model', digest: 'a'.repeat(64) },
						{ name: 'judge', digest: 'b'.repeat(64) },
					],
				}),
			)
			return
		}
		const supplied = queue[0]?.path === request.url ? queue.shift() : undefined
		if (supplied !== undefined) {
			response.writeHead(supplied.status ?? 200)
			if (supplied.open === true) response.write(supplied.body)
			else response.end(supplied.body)
			return
		}
		if (request.url === '/api/show') {
			response.end(
				JSON.stringify({
					model_info: { 'general.architecture': 'fixture', 'fixture.context_length': 32768 },
				}),
			)
			return
		}
		if (request.url === '/api/generate') {
			response.end(
				JSON.stringify({
					model: 'judge',
					done: true,
					done_reason: 'length',
					response: 'A',
					prompt_eval_count: 10,
					eval_count: 1,
					logprobs: [
						{
							token: 'A',
							logprob: -0.01,
							top_logprobs: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Yes', 'No'].map(
								(token, index) => ({ token, logprob: index === 0 || token === 'Yes' ? -0.01 : -8 }),
							),
						},
					],
				}),
			)
			return
		}
		response.end(buildMemoryReply())
	})
	await new Promise<void>((resolveListen, reject) => {
		server.once('error', reject)
		server.listen(0, '127.0.0.1', resolveListen)
	})
	const address = server.address()
	if (address === null || typeof address === 'string')
		throw new Error('Missing native fixture address')
	return {
		url: `http://127.0.0.1:${address.port}`,
		requests,
		responses: queue,
		close: () =>
			new Promise<void>((resolveClose, reject) => {
				server.closeAllConnections()
				server.close((error) => (error === undefined ? resolveClose() : reject(error)))
			}),
	}
}

/** Builds inert protocol output consumed by the actual Ollama package. */
export function buildMemoryReply(options: MemoryReplyFixture = {}): string {
	return `${JSON.stringify({ model: 'model', done: true, done_reason: options.reason ?? 'stop', message: { role: 'assistant', content: options.content ?? 'Receipt retained.', ...(options.calls === undefined ? {} : { tool_calls: options.calls }) }, ...(options.unknown === true ? {} : { prompt_eval_count: options.prompt ?? 10, eval_count: options.completion ?? 2 }) })}\n`
}

/** Builds a finite CPU-only profile with explicit fixture digests; `settings` is emitted exactly as supplied. */
export function buildMemoryProfile(options: MemoryProfileFixture): StudyProfile {
	const room = {
		context: 32768,
		output: 512,
		safety: 128,
		recap: 256,
		think: false,
		...options.room,
	}
	return {
		name: 'cpu-fixture',
		subject: 'dist/src/core/index.js',
		roots: ['.'],
		qualification: 'tmp/unused-capacity',
		provider: {
			entry: '@orkestrel/ollama',
			url: options.url,
			model: 'model',
			judge: 'judge',
			digest: { model: 'a'.repeat(64), judge: 'b'.repeat(64) },
		},
		room,
		bounds: {
			request: { duration: 2000, calls: 1, tokens: room.context - room.safety, bytes: 1048576 },
			goal: { duration: 15000, calls: 256, tokens: 8388608, bytes: 268435456 },
			trial: { duration: 30000, calls: 512, tokens: 16777216, bytes: 536870912 },
			series: { duration: 60000, calls: 1024, tokens: 33554432, bytes: 1073741824 },
		},
		settings: options.settings,
	}
}

/** Builds a gauge that prices any request at `offset` units from the profile's window max.
 * @param profile - The profile whose room defines the window max: context less output and safety.
 * @param offset - Distance from the max; a request prices at the max plus this offset rounded up.
 * @returns Settings with an overhead at that distance and a scale small enough that any estimate adds less than one unit.
 */
export function buildMemoryEdge(
	profile: StudyProfile,
	offset: number,
): NonNullable<StudyProfile['settings']> {
	const { context, output, safety } = profile.room
	return { gauge: { scale: 1e-9, overhead: context - output - safety + offset } }
}

/** Loads an authored declaration and its shared memory scenario for generic admission proofs.
 * @param profile - The execution profile to compose with authored inputs.
 * @param name - The selected declaration. Default: capacity.
 * @returns Parsed authored inputs with the caller's profile.
 */
export async function loadMemoryInputs(
	profile: StudyProfile,
	name = 'capacity',
): Promise<StudyValidation> {
	const definition = parseStudyDefinition(
		parseJSON(await readFile(`studies/${name}/study.json`, 'utf8')),
	)
	const rubric = parseStudyRubric(parseJSON(await readFile(`studies/${name}/rubric.json`, 'utf8')))
	const scenarios = await Promise.all(
		definition.scenarios.map(async (scenario) =>
			parseStudyScenario(
				parseJSON(await readFile(`studies/memory/scenarios/${scenario}.json`, 'utf8')),
			),
		),
	)
	return { definition, rubric, scenarios, profile }
}

/** Reads actual tool-result strings from recorded Ollama chat request bytes.
 * @param body - The captured HTTP request body.
 * @returns Tool receipts in conversation order.
 */
export function readMemoryToolResults(body: string): readonly string[] {
	const value = parseJSON(body)
	if (!isRecord(value) || !Array.isArray(value.messages)) throw new Error('Invalid chat request')
	const receipts: string[] = []
	for (const message of value.messages) {
		if (!isRecord(message)) throw new Error('Invalid chat message')
		if (message.role !== 'tool') continue
		if (typeof message.content !== 'string') throw new Error('Invalid tool receipt')
		receipts.push(message.content)
	}
	return receipts
}

/** Creates actual hierarchical request accounting and an evidence recorder. */
export function createMemoryContext(
	profile: StudyProfile,
	signal = new AbortController().signal,
): MemoryContextFixture {
	const control = new StudyControl(signal)
	const series = new StudyScope({ label: 'series', limit: profile.bounds.series, control })
	const trial = new StudyScope({ label: 'trial', limit: profile.bounds.trial, control })
	const goal = new StudyScope({ label: 'goal', limit: profile.bounds.goal, control })
	const meter = new StudyMeter({
		request: profile.bounds.request,
		scopes: [series, trial, goal],
		control,
	})
	const evidence: StudyEvidence[] = []
	return {
		context: {
			signal,
			meter,
			evidence: {
				append: async (row) => {
					evidence.push(row)
				},
			},
		},
		evidence,
		close: () => {
			meter.close()
			goal.close()
			trial.close()
			series.close()
			control.close()
		},
	}
}

/**
 * Loads actual CPU tool declarations and the built subject for mechanism proofs.
 * @returns Actual declarations and a built ESM namespace
 */
export async function loadStudyToolsFixture(): Promise<StudyToolsFixture> {
	const root = new URL('../studies/tools/', import.meta.url)
	const definition = parseStudyDefinition(
		parseJSON(await readFile(new URL('study.json', root), 'utf8')),
	)
	const profile = parseStudyProfile(
		parseJSON(await readFile(new URL('profiles/local.json', root), 'utf8')),
	)
	const rubric = parseStudyRubric(parseJSON(await readFile(new URL('rubric.json', root), 'utf8')))
	const scenarios = await Promise.all(
		definition.scenarios.map(async (name) =>
			parseStudyScenario(
				parseJSON(await readFile(new URL(`scenarios/${name}.json`, root), 'utf8')),
			),
		),
	)
	validateStudyInputs(definition, scenarios, rubric, profile)
	const manifest = {
		version: 1 as const,
		id: 'a'.repeat(64),
		created: '2026-10-14T12:00:00.000Z',
		identity: {
			subject: 'a'.repeat(64),
			provider: undefined,
			instrument: 'b'.repeat(64),
			fixtures: 'c'.repeat(64),
			profile: 'd'.repeat(64),
		},
		qualification: undefined,
		host: {},
		definition,
		scenarios,
		schedule: buildStudySchedule(definition, scenarios),
		bounds: profile.bounds,
	}
	return { manifest, rubric, profile, subject: await import('../dist/src/core/index.js') }
}

/**
 * Reads retained tool evidence through the JSON parser and custody guard.
 * @param directory - The retained result directory
 * @param trial - The scheduled trial identity
 * @returns Ordered validated evidence rows
 */
export async function readStudyToolsEvidence(
	directory: string,
	trial: string,
): Promise<readonly StudyEvidence[]> {
	const text = await readFile(
		join(directory, 'execution', 'trials', trial, 'evidence.jsonl'),
		'utf8',
	)
	const rows: StudyEvidence[] = []
	for (const line of text.split(/\r\n|\n/)) {
		if (line === '') continue
		const row = parseJSON(line)
		if (!isStudyCustodyEvidence(row)) throw new Error('Retained fixture contains invalid evidence')
		rows.push(row)
	}
	return Object.freeze(rows)
}
