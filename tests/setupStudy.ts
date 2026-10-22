import type {
	MemoryAdmissionFixture,
	MemoryContextFixture,
	MemoryFailureResult,
	MemoryGradingFixture,
	MemoryNativeFixture,
	MemoryProfileFixture,
	MemoryReplyFixture,
	MemoryServerFixture,
	MemoryTrialFixture,
	MemoryTrialResult,
	MemoryUsageFixture,
	MemoryWireFixture,
	StudyInstallFixture,
	StudyInstallPackage,
	StudyInstallResult,
} from './studies/memory/types.js'
import type { ScratchInterface } from '@orkestrel/test/server'
import type {
	StudyBounds,
	StudyContext,
	StudyCriterion,
	StudyDefinition,
	StudyGrading,
	StudyJudgment,
	StudyManifest,
	StudyScenario,
	StudyTrial,
	StudyEvidence,
	StudyGoal,
	StudyProduct,
	StudyProfile,
	StudySessionInterface,
} from '@orkestrel/study'
import type { StudyValidation } from '@orkestrel/study/server'
import type { StudyMeterFixture, StudyToolsFixture } from './studies/tools/types.js'
import type { JSONValue } from '@orkestrel/contract'
import type { LedgerResult } from '@orkestrel/agent'
import type { StudyMemoryReceipt, StudyMemoryRequirement } from '../studies/memory/types.js'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { isRecord, parseJSON } from '@orkestrel/contract'
import { createRecorder } from '@orkestrel/test'
import {
	parseStudyProfile,
	parseStudyScenario,
	buildStudySchedule,
	validateStudyInputs,
	StudyControl,
	StudyMeter,
	StudyScope,
} from '@orkestrel/study'
import { readStudyDeclaration } from '@orkestrel/study/server'
import { buildLedgerOptions, createScriptedProvider, ScriptedReads } from './setup.js'
import { StudyMemoryDriver } from '../studies/memory/index.js'
import * as agent from '../dist/src/core/index.js'
import * as provider from '@orkestrel/ollama'
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { cpSync, lstatSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** Composes the selected built Agent as both runtime and tested subject with the installed public Ollama provider; a distinct subject replaces only `subject`. */
export const STUDY_MEMORY_MODULES = Object.freeze({ agent, subject: agent, provider })

/** Pins the identity gauge compaction fixtures declare explicitly; it prices a request at its raw estimate. */
export const STUDY_MEMORY_SETTINGS = Object.freeze({
	gauge: Object.freeze({ scale: 1, overhead: 0 }),
})

/** Pins a gauge whose projection is the same for every estimate between 0 and 1e9: ceil(100 + 1e-9 * estimate). */
export const STUDY_MEMORY_FIXED_SETTINGS = Object.freeze({
	gauge: Object.freeze({ scale: 1e-9, overhead: 100 }),
})

/** Pins the projection STUDY_MEMORY_FIXED_SETTINGS gives any realistic request, written as arithmetic rather than derived from the helper. */
export const STUDY_MEMORY_FIXED_PROJECTION = 101

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
export function captureStudyPackages(
	scratch: ScratchInterface,
	selections: ReadonlyMap<string, string>,
): readonly StudyInstallPackage[] {
	const sources = new Map(selections)
	const packages: StudyInstallPackage[] = []
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
export function createStudyInstallFixture(
	scratch: ScratchInterface,
	url: string,
): StudyInstallFixture {
	const packages = captureStudyPackages(
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
	const authored = raw.bounds
	const bounds = Object.fromEntries(
		Object.entries({ request: 3000, goal: 30000, trial: 90000, series: 240000 }).map(
			([scope, duration]) => {
				const limit = authored[scope]
				if (!isRecord(limit)) throw new Error(`Missing ${scope} bound`)
				return [scope, { ...limit, duration }]
			},
		),
	)
	const entry = join(scratch.path, 'node_modules/@orkestrel/agent/dist/src/core/index.js')
	scratch.write(
		'studies/memory/profiles/local.json',
		JSON.stringify({
			...raw,
			name: 'local',
			settings: STUDY_MEMORY_SETTINGS,
			agent: entry,
			subject: entry,
			roots: packages.map((captured) => captured.target),
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
export function executeStudyInstall(
	fixture: StudyInstallFixture,
	arguments_: readonly string[],
	duration = 60000,
): Promise<StudyInstallResult> {
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
): Promise<StudyInstallResult> {
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
): Promise<StudyInstallResult> {
	const entry = scratch.write(
		'topology.ts',
		`// Self-contained disposable entry: imported test setup would preload the measured modules.
import { createHash } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isArray, isRecord, parseJSON } from ${JSON.stringify(pathToFileURL(resolve('node_modules/@orkestrel/contract/dist/src/core/index.js')).href)}
import { parseStudyProfile } from ${JSON.stringify(pathToFileURL(resolve('node_modules/@orkestrel/study/dist/src/core/index.js')).href)}
import { ArtifactLoader } from ${JSON.stringify(pathToFileURL(resolve('node_modules/@orkestrel/study/dist/src/server/index.js')).href)}

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
const artifacts = new ArtifactLoader({ roots, entries })
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

/**
 * Serves a native loopback Ollama protocol fixture on an ephemeral port.
 * @remarks
 * Create one per test. A scripted reply is consumed by the next request for its path while it heads
 * the script; any other request is answered by default. The script and the request log are
 * replaced and appended by this entity alone, and its getters return copies.
 */
export class MemoryServer implements MemoryServerFixture {
	readonly #server: Server
	readonly #requests: Array<{ readonly path: string; readonly body: string }> = []
	#pending: readonly MemoryWireFixture[]

	/** Creates an unstarted fixture. @param responses - The scripted replies in the order their paths are requested. */
	constructor(responses: readonly MemoryWireFixture[] = []) {
		this.#pending = responses
		this.#server = createServer((request, response) => this.#serve(request, response))
	}

	/** Holds the origin of the started fixture. @throws Error - Thrown when the fixture is not listening. */
	get url(): string {
		const address = this.#server.address()
		if (address === null || typeof address === 'string')
			throw new Error('Missing native fixture address')
		return `http://127.0.0.1:${address.port}`
	}

	/** Holds a copy of every request received, in arrival order. */
	get requests(): Array<{ readonly path: string; readonly body: string }> {
		return [...this.#requests]
	}

	/** Holds a copy of the scripted replies not yet consumed. */
	get responses(): MemoryWireFixture[] {
		return [...this.#pending]
	}

	/** Begins listening on an ephemeral loopback port. @returns Completion once the fixture accepts connections. */
	start(): Promise<void> {
		return new Promise<void>((resolveListen, reject) => {
			this.#server.once('error', reject)
			this.#server.listen(0, '127.0.0.1', resolveListen)
		})
	}

	/** Drops every connection and stops listening. @returns Completion after the fixture is closed. */
	close(): Promise<void> {
		return new Promise<void>((resolveClose, reject) => {
			this.#server.closeAllConnections()
			this.#server.close((error) => (error === undefined ? resolveClose() : reject(error)))
		})
	}

	async #serve(request: IncomingMessage, response: ServerResponse): Promise<void> {
		const chunks: Buffer[] = []
		for await (const chunk of request)
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
		this.#requests.push({ path: request.url ?? '', body: Buffer.concat(chunks).toString('utf8') })
		const [next, ...rest] = this.#pending
		if (request.url === '/api/tags' && next?.path !== '/api/tags') {
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
		if (next !== undefined && next.path === request.url) {
			this.#pending = rest
			response.writeHead(next.status ?? 200)
			if (next.open === true) response.write(next.body)
			else response.end(next.body)
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
	}
}

/**
 * Starts a native loopback Ollama protocol fixture on an ephemeral port.
 * @param responses - The scripted replies in the order their paths are requested. Default: none.
 * @returns A listening fixture the caller closes.
 */
export async function createMemoryServer(
	responses: readonly MemoryWireFixture[] = [],
): Promise<MemoryServerFixture> {
	const server = new MemoryServer(responses)
	await server.start()
	return server
}

/** Builds inert protocol output consumed by the actual Ollama package. */
export function buildMemoryReply(options: MemoryReplyFixture = {}): string {
	return `${JSON.stringify({ model: 'model', done: true, done_reason: options.reason ?? 'stop', message: { role: 'assistant', content: options.content ?? 'Receipt retained.', ...(options.calls === undefined ? {} : { tool_calls: options.calls }) }, ...(options.unknown === true ? {} : { prompt_eval_count: options.prompt ?? 10, eval_count: options.completion ?? 2 }), ...options.timing })}\n`
}

/** Pins inert daemon timing wire fields: raw nanoseconds and one cached prompt count. */
export const STUDY_MEMORY_TIMING = Object.freeze({
	total_duration: 1234567890,
	load_duration: 234567,
	prompt_eval_duration: 345678,
	eval_duration: 456789,
	prompt_eval_cached_count: 3,
})

/** Pins the event keys present with observation disabled. */
export const STUDY_MEMORY_EVENT_KEYS = Object.freeze({
	selection: Object.freeze(['arrivals', 'pass', 'recaps', 'receipt', 'request', 'role']),
	dispatch: Object.freeze(['bytes', 'model', 'options', 'path', 'role']),
	wire: Object.freeze([
		'bytes',
		'completion',
		'finish',
		'model',
		'options',
		'path',
		'prompt',
		'role',
	]),
	failure: Object.freeze(['bytes', 'path', 'reason', 'role', 'status']),
})

/** Pins the keys observation adds to each existing event, excluding selected-goal body and snapshot. */
export const STUDY_MEMORY_OBSERVED_KEYS = Object.freeze({
	dispatch: Object.freeze(['canonical', 'changed', 'digest', 'id', 'previous', 'revision']),
	wire: Object.freeze(['canonical', 'elapsed', 'id', 'revision', 'sent', 'started', 'timing']),
	failure: Object.freeze(['canonical', 'elapsed', 'id', 'revision', 'sent', 'started']),
})

/** Pins the keys an observed estimate row holds: the calibration pair plus the revision and canonical dispatch it joins to. */
export const STUDY_MEMORY_ESTIMATE_KEYS = Object.freeze([
	'dispatch',
	'estimate',
	'projected',
	'revision',
])

/** Pins the keys a context row holds beyond its dispatch member, which only dispatch-stage rows carry. */
export const STUDY_MEMORY_CONTEXT_KEYS = Object.freeze([
	'estimate',
	'ordinal',
	'origins',
	'parts',
	'projected',
	'revision',
	'role',
	'stage',
])

/** Pins the keys a refusal row holds. */
export const STUDY_MEMORY_REFUSAL_KEYS = Object.freeze([
	'cause',
	'consumed',
	'max',
	'ordinal',
	'revision',
	'role',
])

/** Pins the evidence events only observation adds, so an off-versus-on comparison can exclude exactly them. */
export const STUDY_MEMORY_OBSERVED_EVENTS = Object.freeze(['context', 'estimate', 'refusal'])

/** Builds inert receipt identities with a fallback adoption and independent tails. @returns A resolved Ledger result fixture. */
export function buildMemorySelectionResult(): LedgerResult {
	return {
		request: 'request-2',
		content: 'Answer',
		partial: false,
		readings: [],
		passes: [{ content: 'Answer', partial: false }],
		receipts: [
			{
				selections: [
					{
						turn: undefined,
						tail: ['arrival-1', 'request-1', 'section-old', 'request-2'],
						prior: ['request-1'],
						plan: undefined,
						sources: [{ source: 'section-old', carriage: 'recap' }],
					},
				],
				calls: [{ selection: 0, estimate: 20, tools: 0 }],
			},
		],
	}
}

/** Resolves a real Ledger whose inert system input fails after construction. @returns The resolved fallback receipt. */
export async function runMemoryFallback(): Promise<LedgerResult> {
	const systems = new ScriptedReads<string | undefined>(['Serve the desk.'], undefined)
	const ledger = agent.createLedger(createScriptedProvider([{ content: 'Fallback answer' }]), {
		...buildLedgerOptions(),
		topics: [],
		lookups: [],
		get system() {
			const system = systems.read()
			if (system === undefined) throw new Error('Fixture system unavailable')
			return system
		},
	})
	try {
		return await ledger.respond('Respond')
	} finally {
		ledger.agent.emitter.destroy()
		ledger.conversation.emitter.destroy()
	}
}

/** Pins retained arrival-message identities, including an arrival outside the selected tail. */
export const STUDY_MEMORY_SELECTION_ARRIVALS = Object.freeze([
	Object.freeze({ id: 'outside', message: 'arrival-2' }),
	Object.freeze({ id: 'first', message: 'arrival-1' }),
])

/** Builds declared carriage facts for the independent selection-class controls. @returns An owned pass value with a held source, a missing sentence and correct carriage. */
export function buildMemoryClassificationReceipt(): StudyMemoryReceipt {
	return {
		request: 'request',
		pass: 0,
		role: 'agent',
		arrivals: [],
		recaps: [],
		stop: undefined,
		receipt: {
			calls: [],
			selections: [
				{
					turn: undefined,
					tail: ['verbatim'],
					prior: [],
					plan: {
						owners: ['owner'],
						filed: ['held', 'wrong', 'correct', 'clean'],
						rendered: ['wrong', 'correct', 'clean'],
						omitted: ['held'],
						trims: 1,
						sentences: [
							{ source: 'correct', sentence: 0 },
							{ source: 'clean', sentence: 0 },
						],
						withdrawn: [],
					},
					sources: [
						{ source: 'held', carriage: 'absent' },
						{ source: 'wrong', carriage: 'record' },
						{ source: 'correct', carriage: 'record' },
						{ source: 'clean', carriage: 'record' },
					],
				},
			],
		},
	}
}

/** Declares an independent source for each selection failure class. */
export const STUDY_MEMORY_SELECTION_REQUIREMENTS: readonly StudyMemoryRequirement[] = Object.freeze(
	['missing', 'held', 'wrong', 'correct'].map((source) =>
		Object.freeze({ source, owner: 'owner', sentences: Object.freeze([0]) }),
	),
)

/** Pins distinct goals with identical prompt and arrival text for identity controls. */
export const STUDY_MEMORY_IDENTITY_GOALS: readonly StudyGoal[] = Object.freeze([
	{
		id: 'same-1',
		input: { prompt: 'Same text', arrivals: [{ id: 'a', content: 'Same text' }], records: [] },
	},
	{
		id: 'same-2',
		input: { prompt: 'Same text', arrivals: [{ id: 'b', content: 'Same text' }], records: [] },
	},
])

/** Builds accounting allowances for a complete CPU-scripted endurance trial. @param url - The ephemeral protocol fixture origin. @returns The finite profile used across all declared goals. */
export function buildMemoryEnduranceProfile(url: string): StudyProfile {
	const base = buildMemoryProfile({ url })
	return {
		...base,
		bounds: {
			...base.bounds,
			goal: { duration: 300000, calls: 32768, tokens: 268435456, bytes: 1073741824 },
			trial: { duration: 300000, calls: 32768, tokens: 268435456, bytes: 1073741824 },
			series: { duration: 360000, calls: 65536, tokens: 536870912, bytes: 2147483648 },
		},
	}
}

/** Builds the calibration replies followed by the shared observation trajectory. @returns Ordered inert replies for the real Records arm. */
export function buildMemoryRecordsResponses(): readonly MemoryWireFixture[] {
	return [
		{ path: '/api/chat', body: buildMemoryReply() },
		{ path: '/api/chat', body: buildMemoryReply() },
		...buildMemoryObservationResponses(STUDY_MEMORY_TIMING),
	]
}

/** Pins settings the driver must refuse with CONFIG: checkpoints without observation, a text switch, an unrelated key and an unknown key. */
export const STUDY_MEMORY_MALFORMED_SETTINGS = Object.freeze([
	Object.freeze({
		name: 'checkpoints with observe false',
		settings: Object.freeze({ observe: false, checkpoints: Object.freeze(['opening']) }),
	}),
	Object.freeze({ name: 'string', settings: Object.freeze({ observe: 'true' }) }),
	Object.freeze({
		name: 'checkpoints without observe',
		settings: Object.freeze({ checkpoints: Object.freeze(['opening']) }),
	}),
	Object.freeze({ name: 'unknown key', settings: Object.freeze({ observe: true, extra: 1 }) }),
])

/** Builds a three-goal trajectory with a lookup, a correction and a closing request.
 * @param prompt - Opening request text; changing one byte must change every comparison that includes request bytes.
 * @returns Ordered public goals.
 */
export function buildMemoryObservationGoals(prompt = 'Look up order-1'): readonly StudyGoal[] {
	return Object.freeze([
		Object.freeze({
			id: 'opening',
			input: Object.freeze({
				prompt,
				arrivals: Object.freeze([{ id: 'source-1', content: 'Count was three.' }]),
				records: Object.freeze([{ id: 'order-1', name: 'Owner', content: 'Confirmed reference' }]),
			}),
		}),
		Object.freeze({
			id: 'correction',
			input: Object.freeze({
				prompt: 'Repair handoff',
				arrivals: Object.freeze([{ id: 'source-2', content: 'Correction: count is two.' }]),
				records: Object.freeze([]),
			}),
		}),
		Object.freeze({
			id: 'closure',
			input: Object.freeze({ prompt: 'Close handoff', arrivals: [], records: [] }),
		}),
	])
}

/** Pins settings that observe every request and capture the opening and closing goals. */
export const STUDY_MEMORY_OBSERVED_SETTINGS = Object.freeze({
	observe: true,
	checkpoints: Object.freeze(['opening', 'closure']),
})

/** Pins settings that observe without selecting a checkpoint goal. */
export const STUDY_MEMORY_PASSIVE_SETTINGS = Object.freeze({ observe: true })

/** Joins event key groups into one sorted list for exact key-set comparison.
 * @param groups - Key groups to merge.
 * @returns The sorted union of every group's keys.
 */
export function listMemoryKeys(...groups: ReadonlyArray<readonly string[]>): readonly string[] {
	return [...new Set(groups.flat())].sort()
}

/** Pins the default observation trajectory. */
export const STUDY_MEMORY_OBSERVATION_GOALS: readonly StudyGoal[] = buildMemoryObservationGoals()

/** Builds the queued replies for the observation trajectory: one lookup call, then three final answers. */
export function buildMemoryObservationResponses(
	timing?: MemoryReplyFixture['timing'],
): readonly MemoryWireFixture[] {
	return [
		{
			path: '/api/chat',
			body: buildMemoryReply({
				content: '',
				calls: [{ function: { name: 'lookup', arguments: { id: 'order-1' } } }],
				...(timing === undefined ? {} : { timing }),
			}),
		},
		...['Initial handoff', 'Corrected handoff', 'Closed handoff'].map((content) => ({
			path: '/api/chat',
			body: buildMemoryReply({ content, ...(timing === undefined ? {} : { timing }) }),
		})),
	]
}

/** Executes goals against one session in order and stops at the first refusal.
 * @param session - The open session that retains state across goals.
 * @param goals - Ordered public goals.
 * @param context - Parent accounting and evidence.
 * @returns The products of the goals before the refusal, and the refusal itself in `failure.error` when one occurred.
 */
export function executeMemoryGoals(
	session: StudySessionInterface,
	goals: readonly StudyGoal[],
	context: StudyContext,
): Promise<{
	readonly products: readonly StudyProduct[]
	readonly failure: { readonly error: unknown } | undefined
}> {
	return goals.reduce<ReturnType<typeof executeMemoryGoals>>(
		async (previous, goal) => {
			const run = await previous
			if (run.failure !== undefined) return run
			return session.execute(goal, context).then(
				(product) => ({ products: [...run.products, product], failure: undefined }),
				(error: unknown) => ({ products: run.products, failure: { error } }),
			)
		},
		Promise.resolve({ products: [], failure: undefined }),
	)
}

/** Runs a real driver session against a fresh protocol fixture and returns everything it sent, admitted and retained.
 * @param options - Treatment, queued replies, ordered goals and optional driver settings.
 * @returns Request bytes, products, the first failure, comparable usage and evidence rows.
 */
export async function runMemoryTrial(options: MemoryTrialFixture): Promise<MemoryTrialResult> {
	const server = await createMemoryServer(options.responses)
	const profile = buildMemoryProfile({
		url: server.url,
		...(options.settings === undefined ? {} : { settings: options.settings }),
		...(options.duration === undefined ? {} : { duration: options.duration }),
		...(options.room === undefined ? {} : { room: options.room }),
	})
	const fixture = createMemoryContext(profile)
	// Construction and open sit inside the cleanup boundary so a refused treatment still releases the server and accounting.
	try {
		const session: StudySessionInterface = await new StudyMemoryDriver({
			...STUDY_MEMORY_MODULES,
			profile,
		}).open(
			{ id: 'observation', scenario: 'public', arm: options.arm, repetition: 0 },
			fixture.context.signal,
		)
		try {
			const run = await executeMemoryGoals(session, options.goals, fixture.context)
			await session.close()
			return {
				requests: server.requests.map((request) => ({ path: request.path, body: request.body })),
				products: run.products,
				failure:
					run.failure === undefined
						? undefined
						: run.failure.error instanceof Error
							? run.failure.error.message
							: String(run.failure.error),
				usage: fixture.context.meter.usage.map((row): MemoryUsageFixture => ({
					role: row.role,
					calls: row.calls,
					tokens: row.tokens,
					bytes: row.bytes,
				})),
				evidence: [...fixture.evidence],
			}
		} finally {
			await session.close()
		}
	} finally {
		fixture.close()
		await server.close()
	}
}

/** Runs a real driver session against a fresh protocol fixture until a goal fails, then runs one more goal to read the latched fault.
 * @param options - Treatment, queued replies, ordered goals and optional driver settings.
 * @returns What the failing and the following goal rejected with, plus the wire state before the following goal and after the run.
 */
export async function runMemoryFailure(options: MemoryTrialFixture): Promise<MemoryFailureResult> {
	const server = await createMemoryServer(options.responses)
	const profile = buildMemoryProfile({
		url: server.url,
		...(options.settings === undefined ? {} : { settings: options.settings }),
		...(options.duration === undefined ? {} : { duration: options.duration }),
		...(options.room === undefined ? {} : { room: options.room }),
	})
	const fixture = createMemoryContext(profile)
	try {
		const session: StudySessionInterface = await new StudyMemoryDriver({
			...STUDY_MEMORY_MODULES,
			profile,
		}).open(
			{ id: 'failure', scenario: 'public', arm: options.arm, repetition: 0 },
			fixture.context.signal,
		)
		try {
			const run = await executeMemoryGoals(session, options.goals, fixture.context)
			const sent = server.requests.length
			const latched = await session
				.execute(
					{ id: 'next', input: { prompt: 'Continue', arrivals: [], records: [] } },
					fixture.context,
				)
				.then(
					() => undefined,
					(error: unknown) => error,
				)
			return {
				first: run.failure?.error,
				latched,
				products: run.products,
				requests: server.requests.map((request) => ({ path: request.path, body: request.body })),
				sent,
				queued: server.responses.length,
				usage: fixture.context.meter.usage.map((row): MemoryUsageFixture => ({
					role: row.role,
					calls: row.calls,
					tokens: row.tokens,
					bytes: row.bytes,
				})),
				evidence: [...fixture.evidence],
			}
		} finally {
			await session.close()
		}
	} finally {
		fixture.close()
		await server.close()
	}
}

/** Selects the subset of a trial two runs must share whether or not observation is enabled; real elapsed clocks are excluded.
 * @param result - A finished trial.
 * @returns Exact request bytes, products, failure outcome and per-request admission measurements.
 */
export function readMemoryAdmission(result: MemoryTrialResult): MemoryAdmissionFixture {
	return {
		requests: result.requests,
		products: result.products,
		failure: result.failure,
		usage: result.usage,
	}
}

/** Sums admitted calls and known tokens per role for comparisons that cannot assume request order.
 * @param usage - Finished request measurements.
 * @returns Calls and known tokens by role.
 */
export function totalMemoryUsage(
	usage: readonly MemoryUsageFixture[],
): Readonly<Record<string, { readonly calls: number; readonly tokens: number }>> {
	return Object.fromEntries(
		[...Map.groupBy(usage, (row) => row.role)].map(([role, rows]) => [
			role,
			{
				calls: rows.reduce((sum, row) => sum + row.calls, 0),
				tokens: rows.reduce((sum, row) => sum + (row.tokens ?? 0), 0),
			},
		]),
	)
}

/** Reads the object values of one retained event kind in append order.
 * @param evidence - Retained rows.
 * @param event - Event name.
 * @param goal - Optional goal restriction.
 * @returns The event values.
 */
export function readMemoryEvents(
	evidence: readonly StudyEvidence[],
	event: string,
	goal?: string,
): ReadonlyArray<Readonly<Record<string, unknown>>> {
	return evidence
		.filter((row) => row.event === event && (goal === undefined || row.goal === goal))
		.map((row) => {
			if (!isRecord(row.value)) throw new Error(`Evidence ${event} is not an object`)
			return row.value
		})
}

/** Reads the checkpoint snapshot carried by the first retained event of a goal.
 * @param evidence - Retained rows.
 * @param goal - Selected goal id.
 * @returns The owned snapshot object.
 */
export function readMemorySnapshot(
	evidence: readonly StudyEvidence[],
	goal: string,
): Readonly<Record<string, unknown>> {
	const first = evidence.find((row) => row.goal === goal)
	if (
		first === undefined ||
		first.event !== 'dispatch' ||
		!isRecord(first.value) ||
		!isRecord(first.value.snapshot)
	)
		throw new Error(`Missing ${goal} checkpoint snapshot`)
	return first.value.snapshot
}

/** Reads the monotonic millisecond readings of wire rows, refusing a row without all three.
 * @param wires - Retained wire event values.
 * @returns Admission, send and elapsed readings in row order.
 */
export function readMemoryTimeline(
	wires: ReadonlyArray<Readonly<Record<string, unknown>>>,
): ReadonlyArray<{ readonly started: number; readonly sent: number; readonly elapsed: number }> {
	return wires.map((wire) => {
		const { started, sent, elapsed } = wire
		if (typeof started !== 'number' || typeof sent !== 'number' || typeof elapsed !== 'number')
			throw new Error('Missing wire timeline')
		return { started, sent, elapsed }
	})
}

/** Reads a context row's structural parts, refusing any member that is not the retained shape.
 * @param parts - The `parts` member of a context row.
 * @returns The message count, tools and schema estimates, and the sum of every retained component.
 */
export function readMemoryParts(parts: unknown): {
	readonly count: number
	readonly tools: number
	readonly schema: number
	readonly total: number
} {
	if (
		!isRecord(parts) ||
		!Array.isArray(parts.messages) ||
		typeof parts.tools !== 'number' ||
		typeof parts.schema !== 'number'
	)
		throw new Error('Invalid context parts')
	const components = parts.messages.flatMap((message): readonly number[] => {
		if (!isRecord(message)) throw new Error('Invalid context message')
		return ['content', 'framing', 'calls', 'thinking', 'images'].map((key) => {
			const component = message[key]
			if (typeof component !== 'number') throw new Error('Invalid context component')
			return component
		})
	})
	const total = components.reduce((sum, component) => sum + component, parts.tools + parts.schema)
	return { count: parts.messages.length, tools: parts.tools, schema: parts.schema, total }
}

/** Reads a context row's origin annotations, refusing any entry that is not the retained shape.
 * @param origins - The `origins` member of a context row.
 * @returns One origin and optional source per message, in request order.
 */
export function readMemoryOrigins(
	origins: unknown,
): ReadonlyArray<{ readonly origin: string; readonly source: string | undefined }> {
	if (!Array.isArray(origins)) throw new Error('Invalid context origins')
	return origins.map((entry) => {
		if (!isRecord(entry) || typeof entry.origin !== 'string')
			throw new Error('Invalid origin entry')
		if (entry.source !== undefined && typeof entry.source !== 'string')
			throw new Error('Invalid origin source')
		return { origin: entry.origin, source: entry.source }
	})
}

/** Builds one goal whose eight long arrivals overflow STUDY_MEMORY_SUMMARY_ROOM before the Compaction fold.
 * @param detail - Repeated filler text; changing one byte changes every request that carries it.
 * @returns A single public goal.
 */
export function buildMemoryFoldGoals(
	detail = 'Maintain this source detail. ',
): readonly StudyGoal[] {
	return Object.freeze([
		Object.freeze({
			id: 'opening',
			input: Object.freeze({
				prompt: 'Retain obligations',
				arrivals: Object.freeze(
					Array.from({ length: 8 }, (_, index) => ({
						id: `source-${index}`,
						content: `Obligation ${index}. ${detail.repeat(40)}`,
					})),
				),
				records: Object.freeze([]),
			}),
		}),
	])
}

/** Pins a room whose summary admission room, context less recap less safety (4096 - 64 - 128 = 3904), is wider than the Agent window, context less output less safety (4096 - 2048 - 128 = 1920). */
export const STUDY_MEMORY_SUMMARY_ROOM = Object.freeze({
	context: 4096,
	output: 2048,
	safety: 128,
	recap: 64,
})

/** Pins the summary admission room of STUDY_MEMORY_SUMMARY_ROOM. */
export const STUDY_MEMORY_SUMMARY_LIMIT = 3904

/**
 * Pins hand-counted summary request lengths, each the content length of one folded arrival message,
 * `[Source aN] ` (12 characters) plus its body. A message costs `length / 4 + 4` and the summary
 * instruction (113 characters) costs `ceil(113 / 4) + 4 = 33`, so a seven-message fold projects
 * `33 + 7 * (2196 / 4 + 4) = 3904` for EQUAL, `33 + 6 * 553 + (2192 / 4 + 4) = 3903` for BELOW and
 * `33 + 7 * (2400 / 4 + 4) = 4261` for OVER, under the identity gauge.
 */
export const STUDY_MEMORY_SUMMARY_FOLDS = Object.freeze({
	equal: Object.freeze([2196, 2196, 2196, 2196, 2196, 2196, 2196]),
	below: Object.freeze([2196, 2196, 2196, 2196, 2196, 2196, 2192]),
	over: Object.freeze([2400, 2400, 2400, 2400, 2400, 2400, 2400]),
	small: Object.freeze([1200, 1200, 1200, 1200, 1200, 1200, 1200]),
})

/** Pins the identity-gauge projections the folds above are counted to: equal 3904, below 3903, over 4261, small 33 + 7 * (1200 / 4 + 4) = 2161. */
export const STUDY_MEMORY_SUMMARY_PROJECTIONS = Object.freeze({
	equal: 3904,
	below: 3903,
	over: 4261,
	small: 2161,
})

/**
 * Builds one goal of exactly counted arrivals: the folded ones, then one live one, then the prompt.
 * @param folded - Message content lengths of the arrivals a Compaction fold summarizes; each is at least 12.
 * @param live - Message content length of the last arrival, which stays live beside the prompt.
 * @returns A single public goal whose arrival `aN` has `[Source aN] ` plus `x` repeated to that length.
 */
export function buildMemorySummaryGoals(
	folded: readonly number[],
	live: number,
): readonly StudyGoal[] {
	return Object.freeze([
		Object.freeze({
			id: 'opening',
			input: Object.freeze({
				prompt: 'Retain obligations',
				arrivals: Object.freeze(
					[...folded, live].map((length, index) => {
						if (length < 12 || index > 9) throw new Error('Invalid summary arrival length')
						return { id: `a${index}`, content: 'x'.repeat(length - 12) }
					}),
				),
				records: Object.freeze([]),
			}),
		}),
	])
}

/**
 * Builds two goals that each fold once under STUDY_MEMORY_SUMMARY_ROOM and the identity gauge: the
 * small counted goal, then seven more 1200-character arrivals and a prompt. Each goal's agent window
 * overflows, so a Compaction trial sends summary, agent, summary, agent in that order.
 * @returns Two public goals whose arrival ids are distinct.
 */
export function buildMemoryRollingGoals(): readonly StudyGoal[] {
	return Object.freeze([
		...buildMemorySummaryGoals(STUDY_MEMORY_SUMMARY_FOLDS.small, 400),
		Object.freeze({
			id: 'second',
			input: Object.freeze({
				prompt: 'Retain later obligations',
				arrivals: Object.freeze(
					Array.from({ length: 7 }, (_, index) => ({
						id: `b${index}`,
						content: 'x'.repeat(1188),
					})),
				),
				records: Object.freeze([]),
			}),
		}),
	])
}

/**
 * Runs one Compaction goal over counted arrivals in STUDY_MEMORY_SUMMARY_ROOM under the identity gauge.
 * @param folded - Message content lengths a fold summarizes.
 * @param live - Message content length of the live arrival.
 * @param responses - Queued protocol replies; the first chat reply answers the summary.
 * @param observe - Whether passive evidence is captured; it must change evidence only.
 * @returns The trial result.
 */
export function runMemorySummary(
	folded: readonly number[],
	live: number,
	responses: readonly MemoryWireFixture[],
	observe: boolean,
): Promise<MemoryTrialResult> {
	return runMemoryTrial({
		arm: 'compaction',
		responses,
		goals: buildMemorySummaryGoals(folded, live),
		settings: observe ? { ...STUDY_MEMORY_SETTINGS, observe: true } : STUDY_MEMORY_SETTINGS,
		room: STUDY_MEMORY_SUMMARY_ROOM,
	})
}

/** Pins a negative prompt count in a summary terminal row; it must stay a generic fault that keeps the summary role and its unknown usage. */
export const STUDY_MEMORY_NATIVE_MALFORMED: readonly MemoryNativeFixture[] = Object.freeze([
	{
		name: 'a negative prompt count in an HTTP 200 terminal row of a summary request',
		role: 'summary',
		trial: Object.freeze({
			arm: 'compaction' as const,
			goals: buildMemorySummaryGoals(STUDY_MEMORY_SUMMARY_FOLDS.below, 400),
			settings: STUDY_MEMORY_SETTINGS,
			room: STUDY_MEMORY_SUMMARY_ROOM,
		}),
		status: 200,
		body: buildMemoryReply({ prompt: -1 }),
		code: 'FAULT' as const,
		message: 'Malformed Ollama usage',
	},
])

/** Pins the actual summary reply that exceeds its reserved room and must stop before the next request, tool and goal. */
export const STUDY_MEMORY_ACTUAL_REFUSALS = Object.freeze([
	Object.freeze({
		name: 'a summary prompt one over the summary room',
		settings: STUDY_MEMORY_SETTINGS,
		room: STUDY_MEMORY_SUMMARY_ROOM,
		goal: buildMemorySummaryGoals(STUDY_MEMORY_SUMMARY_FOLDS.below, 400)[0],
		body: buildMemoryReply({ content: 'Recap kept', prompt: STUDY_MEMORY_SUMMARY_LIMIT + 1 }),
		message: 'reserved context capacity',
		role: 'summary',
	}),
])

/** Reads the top-level and option key sets of each recorded generation request from its exact wire bytes.
 * @param requests - Recorded HTTP requests.
 * @returns Sorted body and option keys for chat and generate requests in arrival order.
 */
export function readMemoryShapes(
	requests: MemoryTrialResult['requests'],
): ReadonlyArray<{ readonly body: readonly string[]; readonly options: readonly string[] }> {
	return requests
		.filter((request) => request.path === '/api/chat' || request.path === '/api/generate')
		.map((request) => {
			const body = parseJSON(request.body)
			if (!isRecord(body) || !isRecord(body.options)) throw new Error('Invalid generation request')
			return { body: Object.keys(body).sort(), options: Object.keys(body.options).sort() }
		})
}

/** Reads the model name each recorded generation request carried, from its exact wire bytes.
 * @param requests - Recorded HTTP requests.
 * @returns Model names of chat and generate requests in arrival order.
 */
export function readMemoryModels(requests: MemoryTrialResult['requests']): readonly string[] {
	return requests
		.filter((request) => request.path === '/api/chat' || request.path === '/api/generate')
		.map((request) => {
			const body = parseJSON(request.body)
			if (!isRecord(body) || typeof body.model !== 'string')
				throw new Error('Invalid generation request')
			return body.model
		})
}

/** Reads the native truncate and shift members of each recorded chat request from its exact wire bytes.
 * @param requests - Recorded HTTP requests.
 * @returns One entry per chat request in arrival order; a member the body omits is undefined.
 */
export function readMemoryControls(
	requests: MemoryTrialResult['requests'],
): ReadonlyArray<{ readonly truncate: unknown; readonly shift: unknown }> {
	return requests
		.filter((request) => request.path === '/api/chat')
		.map((request) => {
			const body = parseJSON(request.body)
			if (!isRecord(body)) throw new Error('Invalid chat request')
			return { truncate: body.truncate, shift: body.shift }
		})
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
		agent: 'dist/src/core/index.js',
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
			request: {
				duration: options.duration ?? 2000,
				calls: 1,
				tokens: room.context - room.safety,
				bytes: 1048576,
			},
			goal: { duration: 15000, calls: 256, tokens: 8388608, bytes: 268435456 },
			trial: { duration: 30000, calls: 512, tokens: 16777216, bytes: 536870912 },
			series: { duration: 60000, calls: 1024, tokens: 33554432, bytes: 1073741824 },
		},
		settings: options.settings,
	}
}

/**
 * Removes the declared judge and recap from a profile, as a workflow that uses neither declares it.
 * @param profile - A profile that declares a provider
 * @returns The profile with no judge model, no judge digest and no recap allowance
 * @throws Error - Thrown when the profile declares no provider
 */
export function omitMemoryAuxiliaries(profile: StudyProfile): StudyProfile {
	const configured = profile.provider
	if (configured === undefined) throw new Error('Missing fixture provider')
	return {
		...profile,
		provider: {
			...configured,
			judge: undefined,
			digest: { model: configured.digest.model, judge: undefined },
		},
		room: { ...profile.room, recap: undefined },
	}
}

/**
 * Builds a declared criterion in the `desk` scenario; only the `operational` criterion is critical.
 * @param id - The criterion id
 * @param method - The grading method
 * @param assertion - The independent assertion
 * @param goal - The declared goal it grades. Default: goal.
 * @returns The criterion
 */
export function buildMemoryCriterion(
	id: string,
	method: StudyCriterion['method'],
	assertion: JSONValue,
	goal = 'goal',
): StudyCriterion {
	return { id, scenario: 'desk', goal, method, critical: id === 'operational', assertion }
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
	const { definition, scenarios, rubric } = await readStudyDeclaration(
		fileURLToPath(new URL('../', import.meta.url)),
		name,
	)
	return { definition, scenarios, rubric, profile }
}

/** Reads actual tool-result strings from recorded Ollama chat request bytes.
 * @param body - The captured HTTP request body.
 * @returns Tool receipts in conversation order.
 */
export function readMemoryToolResults(body: string): readonly string[] {
	const value = parseJSON(body)
	if (!isRecord(value) || !Array.isArray(value.messages)) throw new Error('Invalid chat request')
	return value.messages.flatMap((message): readonly string[] => {
		if (!isRecord(message)) throw new Error('Invalid chat message')
		if (message.role !== 'tool') return []
		if (typeof message.content !== 'string') throw new Error('Invalid tool receipt')
		return [message.content]
	})
}

/** Creates actual hierarchical request accounting and an evidence recorder. */
export function createMemoryContext(
	profile: StudyProfile,
	signal = new AbortController().signal,
): MemoryContextFixture {
	const accounting = createStudyMeterFixture(profile.bounds, signal)
	const appended = createRecorder<readonly [row: StudyEvidence]>()
	return {
		context: {
			signal,
			meter: accounting.meter,
			evidence: {
				append: async (row) => {
					appended.handler(row)
				},
			},
		},
		get evidence(): StudyEvidence[] {
			return appended.calls.map(([row]) => row)
		},
		close: () => accounting.close(),
	}
}

/**
 * Loads actual CPU tool declarations and the built subject for mechanism proofs.
 * @returns Actual declarations and a built ESM namespace
 */
export async function loadStudyToolsFixture(): Promise<StudyToolsFixture> {
	const { definition, rubric, scenarios } = await readStudyDeclaration(
		fileURLToPath(new URL('../', import.meta.url)),
		'tools',
	)
	const profile = parseStudyProfile(
		parseJSON(
			await readFile(new URL('../studies/tools/profiles/local.json', import.meta.url), 'utf8'),
		),
	)
	validateStudyInputs(definition, scenarios, rubric, profile)
	const manifest = buildCustodyManifest(definition, scenarios, profile.bounds)
	const namespace = await import('../dist/src/core/index.js')
	return { manifest, rubric, profile, agent: namespace, subject: namespace }
}

/** Returns independently attributed grading over the supplied scheduled attempts. */
export function buildStudyGrading(
	schedule: readonly StudyTrial[],
	judgments: readonly StudyJudgment[] = [],
): StudyGrading {
	return {
		result: 'a'.repeat(64),
		rubric: 'b'.repeat(64),
		grader: 'grader-v1',
		instrument: 'c'.repeat(64),
		attempts: schedule.map((trial) => trial.id),
		labels: undefined,
		judgments,
	}
}

/** Creates real scopes and request admission with one lifecycle owner.
 * @param bounds - Per-scope limit overrides.
 * @param signal - Optional parent cancellation.
 * @returns Owned control, scopes, and meter with cleanup.
 */
export function createStudyMeterFixture(
	bounds: Partial<StudyBounds> = {},
	signal?: AbortSignal,
): StudyMeterFixture {
	const limit = { duration: 1000, calls: 4, tokens: 100, bytes: 100 }
	const control = new StudyControl(signal)
	const scopes = [
		new StudyScope({ limit: bounds.goal ?? limit, control, label: 'Goal' }),
		new StudyScope({ limit: bounds.trial ?? limit, control, label: 'Trial' }),
		new StudyScope({ limit: bounds.series ?? limit, control, label: 'Series' }),
	]
	const meter = new StudyMeter({
		request: bounds.request ?? { ...limit, calls: 1 },
		scopes,
		control,
	})
	return Object.freeze({
		control,
		scopes: Object.freeze(scopes),
		meter,
		close(): void {
			meter.close()
			for (const scope of scopes) scope.close()
			control.close()
		},
	})
}

/**
 * Builds a custody-valid sealed declaration whose schedule is derived from the supplied population.
 * @param definition - The frozen study question and orders
 * @param scenarios - The declared scenarios
 * @param bounds - The execution allowances
 * @param identity - The provider identity digest, or undefined when the study selects none
 * @returns A manifest every custody guard admits
 */
export function buildCustodyManifest(
	definition: StudyDefinition,
	scenarios: readonly StudyScenario[],
	bounds: StudyBounds,
	identity: string | undefined = undefined,
): StudyManifest {
	return {
		id: 'a'.repeat(64),
		created: '2026-10-14T12:00:00.000Z',
		identity: {
			agent: 'a'.repeat(64),
			subject: 'a'.repeat(64),
			provider: identity,
			instrument: 'b'.repeat(64),
			fixtures: 'c'.repeat(64),
			profile: 'd'.repeat(64),
		},
		qualification: undefined,
		host: {},
		definition,
		scenarios,
		schedule: buildStudySchedule(definition, scenarios),
		bounds,
	}
}

/**
 * Builds a two-trial memory grading population over the `full` arm: one complete retained trial and one capacity-faulted trial.
 * @returns The profile, declaration, schedule, criteria, rubric, attempts and evidence the mechanical grading proofs share
 */
export function buildMemoryGradingFixture(): MemoryGradingFixture {
	const profile = buildMemoryProfile({ url: 'http://127.0.0.1:7' })
	const definition: StudyDefinition = {
		name: 'test',
		version: '1',
		question: 'mechanisms',
		purpose: 'capacity',
		driver: 'memory',
		arms: ['full'],
		scenarios: ['desk'],
		order: [['full'], ['full']],
		retries: 0,
		rubric: 'rubric.json',
	}
	const manifest = buildCustodyManifest(
		definition,
		[parseStudyScenario({ id: 'desk', goals: [{ id: 'goal', input: {} }] })],
		profile.bounds,
	)
	const [first, second] = manifest.schedule
	if (first === undefined || second === undefined) throw new Error('Missing fixture trials')
	const operational = buildMemoryCriterion('operational', 'state', { observation: 'operational' })
	const meaning = buildMemoryCriterion('meaning', 'semantic', {
		criterion: 'Correctly repaired handoff',
	})
	const source = buildMemoryCriterion('source', 'trace', { observation: 'arrival', id: 'receipt' })
	const lookup = buildMemoryCriterion('lookup', 'trace', { observation: 'lookup', id: 'record' })
	const result = buildMemoryCriterion('result', 'state', { observation: 'result', partial: false })
	const failure: MemoryGradingFixture['failure'] = {
		cause: 'capacity',
		message: 'Output cap',
		role: 'agent',
		stop: {
			layer: 'model',
			id: 'num_predict',
			max: profile.room.output,
			consumed: profile.room.output,
		},
	}
	const complete: MemoryGradingFixture['complete'] = {
		trial: first,
		attempt: {
			trial: first,
			duration: 1,
			failure: undefined,
			executed: true,
			observations: [
				{
					goal: 'goal',
					product: { value: { content: '' }, partial: true },
					failure: undefined,
					usage: [],
					duration: 1,
					executed: true,
				},
			],
		},
		evidence: [
			{ event: 'summary', goal: 'other', value: 'unrelated' },
			{ event: 'arrival', goal: 'goal', value: { id: 'receipt' } },
		],
	}
	const faulted: MemoryGradingFixture['faulted'] = {
		trial: second,
		attempt: {
			trial: second,
			duration: 1,
			failure,
			executed: true,
			observations: [
				{ goal: 'goal', product: undefined, failure, usage: [], duration: 1, executed: true },
			],
		},
	}
	return {
		profile,
		definition,
		manifest,
		complete,
		faulted,
		operational,
		meaning,
		source,
		lookup,
		result,
		rubric: { version: '1', criteria: [operational, meaning, source, lookup, result] },
		failure,
		attempts: [complete.attempt, faulted.attempt],
		evidence: { [first.id]: complete.evidence, [second.id]: [] },
	}
}

/** Pins the shared public trajectory and protocol replies for observation proofs. */
export const STUDY_MEMORY_PASSIVITY_BASE: MemoryTrialFixture = Object.freeze({
	arm: 'full',
	responses: buildMemoryObservationResponses(STUDY_MEMORY_TIMING),
	goals: STUDY_MEMORY_OBSERVATION_GOALS,
})

/** Pins every memory treatment's passive byte-equality controls and changed-goal trajectory. */
export const STUDY_MEMORY_PASSIVITY_CASES = Object.freeze([
	{
		name: 'Records',
		trial: {
			...STUDY_MEMORY_PASSIVITY_BASE,
			arm: 'records' as const,
			responses: buildMemoryRecordsResponses(),
		},
		settings: undefined,
		observed: STUDY_MEMORY_OBSERVED_SETTINGS,
		changed: buildMemoryObservationGoals('Look up order-2'),
		products: ['Initial handoff', 'Corrected handoff', 'Closed handoff'],
		chats: 6,
		tools: 1,
	},
	{
		name: 'Full',
		trial: STUDY_MEMORY_PASSIVITY_BASE,
		settings: undefined,
		observed: STUDY_MEMORY_OBSERVED_SETTINGS,
		changed: buildMemoryObservationGoals('Look up order-2'),
		products: ['Initial handoff', 'Corrected handoff', 'Closed handoff'],
		chats: 4,
		tools: 1,
	},
	{
		name: 'Compaction',
		trial: { ...STUDY_MEMORY_PASSIVITY_BASE, arm: 'compaction' as const },
		settings: STUDY_MEMORY_FIXED_SETTINGS,
		observed: { ...STUDY_MEMORY_FIXED_SETTINGS, observe: true },
		changed: buildMemoryObservationGoals('Look up order-2'),
		products: ['Initial handoff', 'Corrected handoff', 'Closed handoff'],
		chats: 4,
		tools: 1,
	},
	{
		name: 'fold',
		trial: {
			arm: 'compaction' as const,
			responses: [],
			goals: buildMemoryFoldGoals(),
			room: STUDY_MEMORY_SUMMARY_ROOM,
		},
		settings: STUDY_MEMORY_SETTINGS,
		observed: { ...STUDY_MEMORY_SETTINGS, observe: true },
		changed: buildMemoryFoldGoals('Maintain this other detail. '),
		products: ['Receipt retained.'],
		chats: 2,
		tools: 0,
	},
])
