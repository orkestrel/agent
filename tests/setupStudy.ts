import type { ScratchInterface } from '@orkestrel/test/server'
import type {
	StudyAssessment,
	StudyBounds,
	StudyContext,
	StudyCriterion,
	StudyDefinition,
	StudyJudgment,
	StudyLabels,
	StudyManifest,
	StudyScenario,
	StudyTrial,
	StudyEvidence,
	StudyGoal,
	StudyProduct,
	StudyProfile,
	StudySessionInterface,
} from '@orkestrel/study'
import type {
	StudyExchangeAttempt,
	StudyExchangeRow,
	StudyExchangeSinkInterface,
	StudyOllamaReplayInterface,
	StudySealedResult,
	StudyValidation,
} from '@orkestrel/study/server'
import type { RecorderInterface } from '@orkestrel/test'
import type { StudyAttempt, StudyFailure, StudyRole, StudyRubric } from '@orkestrel/study'
import type { Guard, JSONValue } from '@orkestrel/contract'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import {
	arrayOf,
	canonicalStringify,
	cloneJSONValue,
	isArray,
	isBoolean,
	isInteger,
	isJSONValue,
	isRecord,
	isString,
	literalOf,
	objectOf,
	parseJSON,
	parseJSONAs,
} from '@orkestrel/contract'
import { createRecorder, waitForCondition } from '@orkestrel/test'
import {
	parseStudyProfile,
	parseStudyScenario,
	buildStudySchedule,
	validateStudyInputs,
	StudyControl,
	StudyError,
	StudyMeter,
	StudyScope,
	StudySeries,
} from '@orkestrel/study'
import {
	STUDY_CHECKPOINT_EVENT,
	StudyResultStore,
	buildStudyExchangeDeclaration,
	buildStudyPacket,
	collectStudyEvidence,
	hashStudyBytes,
	readStudyDeclaration,
	readStudyExchanges,
	readStudyResult,
} from '@orkestrel/study/server'
import {
	STUDY_MEMORY_REPEAT,
	StudyMemoryDriver,
	isStudyMemoryArm,
} from '../studies/memory/index.js'
import { StudyToolsDriver } from '../studies/tools/index.js'
import * as agent from '../src/core/index.js'
import * as provider from '@orkestrel/ollama'
import { createScratch } from '@orkestrel/test/server'
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { cpSync, lstatSync, mkdirSync, readFileSync } from 'node:fs'
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
 * the script; `metadata` answers a metadata path ahead of its default; any other request is answered
 * by default, repeating the model it names as a daemon does. The script and the request log are
 * replaced and appended by this entity alone, and its getters return copies.
 */
export class MemoryServer implements MemoryServerFixture {
	readonly #server: Server
	readonly #requests: Array<{ readonly path: string; readonly body: string }> = []
	readonly #metadata: ReadonlyMap<string, string>
	#pending: readonly MemoryWireFixture[]

	/** Creates an unstarted fixture. @param responses - The scripted replies in the order their paths are requested. @param metadata - The body served for a metadata path ahead of its default. */
	constructor(
		responses: readonly MemoryWireFixture[] = [],
		metadata: Readonly<Record<string, string>> = {},
	) {
		this.#pending = responses
		this.#metadata = new Map(Object.entries(metadata))
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
		const body = Buffer.concat(chunks).toString('utf8')
		this.#requests.push({ path: request.url ?? '', body })
		const [next, ...rest] = this.#pending
		const metadata = this.#metadata.get(request.url ?? '')
		if (metadata !== undefined && next?.path !== request.url) {
			response.end(metadata)
			return
		}
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
		if (request.url === '/api/version' && next?.path !== '/api/version') {
			response.end(JSON.stringify({ version: 'fixture-1' }))
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
					model: readMemoryModel(body, 'judge'),
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
		response.end(buildMemoryReply({ model: readMemoryModel(body, 'model') }))
	}
}

/**
 * Starts a native loopback Ollama protocol fixture on an ephemeral port.
 * @param responses - The scripted replies in the order their paths are requested. Default: none.
 * @param metadata - The body served for a metadata path ahead of its default. Default: none.
 * @returns A listening fixture the caller closes.
 */
export async function createMemoryServer(
	responses: readonly MemoryWireFixture[] = [],
	metadata: Readonly<Record<string, string>> = {},
): Promise<MemoryServerFixture> {
	const server = new MemoryServer(responses, metadata)
	await server.start()
	return server
}

/**
 * Reads the model a request body names, which a daemon's reply repeats.
 * @param body - The request body.
 * @param fallback - The model read when the body names none.
 * @returns The named model, or the fallback.
 */
export function readMemoryModel(body: string, fallback: string): string {
	const value = parseJSON(body)
	return isRecord(value) && isString(value.model) ? value.model : fallback
}

/** Builds inert protocol output consumed by the actual Ollama package. */
export function buildMemoryReply(options: MemoryReplyFixture = {}): string {
	return `${JSON.stringify({ model: options.model ?? 'model', done: true, done_reason: options.reason ?? 'stop', message: { role: 'assistant', content: options.content ?? 'Receipt retained.', ...(options.calls === undefined ? {} : { tool_calls: options.calls }) }, ...(options.unknown === true ? {} : { prompt_eval_count: options.prompt ?? 10, eval_count: options.completion ?? 2 }), ...options.timing })}\n`
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
export const STUDY_MEMORY_OBSERVED_EVENTS = Object.freeze([
	'context',
	'estimate',
	'refusal',
	'checkpoint',
])

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
	Object.freeze({ name: 'empty version', settings: Object.freeze({ version: '' }) }),
	Object.freeze({
		name: 'malformed metadata',
		settings: Object.freeze({ metadata: Object.freeze({ calls: 0, bytes: 1, duration: 1 }) }),
	}),
	Object.freeze({
		name: 'unknown correction member',
		settings: Object.freeze({ correction: Object.freeze({ other: 1 }) }),
	}),
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
			options.seed,
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
		return ['content', 'uniform', 'calls', 'thinking', 'images'].map((key) => {
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
	const meterFixture = createStudyMeterFixture(profile.bounds, signal)
	const appended = createRecorder<readonly [row: StudyEvidence]>()
	return {
		context: {
			signal,
			meter: meterFixture.meter,
			evidence: {
				append: async (row) => {
					appended.handler(row)
				},
			},
		},
		get evidence(): StudyEvidence[] {
			return appended.calls.map(([row]) => row)
		},
		close: () => meterFixture.close(),
	}
}

/**
 * Loads actual CPU tool declarations and the built subject for mechanism proofs.
 * @param study - The declaration over the `tools` driver. Default: `tools`.
 * @returns Actual declarations and a built ESM namespace
 */
export async function loadStudyToolsFixture(study = 'tools'): Promise<StudyToolsFixture> {
	const { definition, rubric, scenarios } = await readStudyDeclaration(
		fileURLToPath(new URL('../', import.meta.url)),
		study,
	)
	const profile = parseStudyProfile(
		parseJSON(
			await readFile(new URL('../studies/tools/profiles/local.json', import.meta.url), 'utf8'),
		),
	)
	validateStudyInputs(definition, scenarios, rubric, profile)
	const manifest = buildCustodyManifest(definition, scenarios, profile.bounds)
	return { manifest, rubric, profile, agent, subject: agent }
}

/** Returns an independently attributed assessment over the supplied scheduled attempts. */
export function buildStudyAssessment(
	schedule: readonly StudyTrial[],
	judgments: readonly StudyJudgment[] = [],
): StudyAssessment {
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
			runtime: 'e'.repeat(64),
			content: 'f'.repeat(64),
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
export function buildMemoryGradeFixture(): MemoryGradeFixture {
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
	const failure: MemoryGradeFixture['failure'] = {
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
	const complete: MemoryGradeFixture['complete'] = {
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
	const faulted: MemoryGradeFixture['faulted'] = {
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

/** Holds one copied package selection in the installed fixture closure. */
export interface StudyInstallPackage {
	readonly name: string
	readonly source: string
	readonly target: string
}
/** Holds an actual installed CLI and its exclusive scratch workspace. */
export interface StudyInstallFixture {
	readonly scratch: ScratchInterface
	readonly entry: string
	readonly packages: readonly StudyInstallPackage[]
}
/** Holds native command output without discarding failed-command diagnostics. */
export interface StudyInstallResult {
	readonly code: number
	readonly stdout: string
	readonly stderr: string
}

/** Holds one inert native HTTP fixture response. */
export interface MemoryWireFixture {
	readonly path: string
	readonly body: string
	readonly status?: number
	readonly open?: boolean
}
/** Holds an actual protocol fixture and captured request bytes. */
export interface MemoryServerFixture {
	readonly url: string
	readonly requests: Array<{ readonly path: string; readonly body: string }>
	readonly responses: MemoryWireFixture[]
	close(): Promise<void>
}
/** Holds real hierarchical accounting with append-only evidence. */
export interface MemoryContextFixture {
	readonly context: StudyContext
	readonly evidence: StudyEvidence[]
	close(): void
}
/** Holds pure profile fixture overrides. */
export interface MemoryProfileFixture {
	readonly url: string
	readonly room?: Partial<StudyProfile['room']>
	/** Supplies driver-owned settings verbatim; omission and `undefined` both emit an absent profile setting. */
	readonly settings?: StudyProfile['settings']
	/** Overrides the per-request deadline in milliseconds. */
	readonly duration?: number
}
/** Holds an inert model reply fixture; `timing` adds raw daemon fields to the terminal row. */
export interface MemoryReplyFixture {
	readonly model?: string
	readonly content?: string
	readonly reason?: string
	readonly prompt?: number
	readonly completion?: number
	readonly unknown?: boolean
	readonly calls?: readonly JSONValue[]
	readonly timing?: Readonly<Record<string, JSONValue>>
}
/** Holds one finished request's comparable measurements without its real elapsed clock. */
export interface MemoryUsageFixture {
	readonly role: StudyRole
	readonly calls: number
	readonly tokens: number | undefined
	readonly bytes: number | undefined
}
/** Holds a real trial's inputs: queued protocol replies, ordered goals and optional driver settings. */
export interface MemoryTrialFixture {
	readonly arm: 'records' | 'compaction' | 'full'
	readonly responses: readonly MemoryWireFixture[]
	readonly goals: readonly StudyGoal[]
	readonly settings?: Readonly<Record<string, JSONValue>>
	readonly duration?: number
	/** Overrides room allowances, such as a window small enough to fold. */
	readonly room?: Partial<StudyProfile['room']>
	/** Holds the checkpoint value the driver's `open` receives. */
	readonly seed?: JSONValue
}
/** Holds one request a protocol fixture received. */
export interface MemoryRequestFixture {
	readonly path: string
	readonly body: string
}
/** Holds what one seated session needs to run one goal against recorded replies. */
export interface MemorySeedFixture {
	readonly arm: 'records' | 'compaction' | 'full'
	readonly profile: StudyProfile
	readonly seed: JSONValue
	readonly goal: StudyGoal
	readonly replies: readonly MemoryWireFixture[]
	/** Holds the body served for each metadata path, keyed by that path. */
	readonly metadata: Readonly<Record<string, string>>
}
/** Holds one request of a seated goal that differs from its recording. */
export interface MemorySeedDifference {
	/** Names the seated goal. */
	readonly goal: string
	/** Holds the recorded exchange's ordinal; undefined when the seated run sent a request the recording does not hold. */
	readonly ordinal: number | undefined
	readonly role: StudyRole | undefined
	/** Holds the first differing byte; 0 when one side holds no request at that position. */
	readonly offset: number
}
/** Holds a sealed segment's comparison of its own recording with each seated checkpoint. */
export interface MemorySeedResult {
	/** Counts the checkpoints whose next goal the result holds. */
	readonly compared: number
	/** Counts those whose first agent request equals its recording, byte for byte. */
	readonly equal: number
	/** Counts those whose control run sent a chat and whose every chat differs from the first agent request, once the newest seated message that request renders is replaced. */
	readonly control: number
	/** Counts those whose every served request equals its recording. */
	readonly whole: number
	/** Lists each differing request, for reading a difference past the first agent request. */
	readonly differences: readonly MemorySeedDifference[]
}
/** Holds what a seeded chain executed and where. */
export interface MemorySeedChainFixture {
	readonly trial: string
	readonly profile: StudyProfile
	readonly first: string
	readonly second: string
	/** Holds the first segment's command result. */
	readonly opened: StudyInstallResult
	/** Holds the seeded segment's command result. */
	readonly seeded: StudyInstallResult
	/** Counts the requests the fixture took once the first segment ended. */
	readonly boundary: number
	/** Counts the requests the fixture took once both segments ended. */
	readonly sent: number
}
/** Holds what a real trial sent, admitted, retained and returned. */
export interface MemoryTrialResult {
	readonly requests: ReadonlyArray<{ readonly path: string; readonly body: string }>
	readonly products: readonly StudyProduct[]
	readonly failure: string | undefined
	readonly usage: readonly MemoryUsageFixture[]
	readonly evidence: readonly StudyEvidence[]
}
/** Holds what a real trial raised at its first failing goal and at the goal after it, with the wire state at both points. */
export interface MemoryFailureResult {
	/** Holds the value the first failing goal rejected with; undefined when every goal completed. */
	readonly first: unknown
	/** Holds the value the goal after the failure rejected with, which is the latched transport fault. */
	readonly latched: unknown
	readonly products: readonly StudyProduct[]
	/** Holds every request the fixture received, in arrival order. */
	readonly requests: ReadonlyArray<{ readonly path: string; readonly body: string }>
	/** Holds the count of requests received before the goal after the failure ran. */
	readonly sent: number
	/** Holds the count of queued replies the fixture never served. */
	readonly queued: number
	readonly usage: readonly MemoryUsageFixture[]
	readonly evidence: readonly StudyEvidence[]
}

/** Holds one reply the daemon could send to a role's first chat request and the failure it must become. */
export interface MemoryNativeFixture {
	readonly name: string
	/** Holds the responsibility whose first chat request the reply answers. */
	readonly role: 'agent' | 'summary'
	/** Holds the treatment that makes that role's chat request the first one sent; replies are supplied separately. */
	readonly trial: Omit<MemoryTrialFixture, 'responses'>
	/** Holds the HTTP status the fixture answers with. */
	readonly status: number
	readonly body: string
	readonly code: 'CAPACITY' | 'FAULT'
	/** Holds a substring of the readable failure message. */
	readonly message: string
}

/** Holds a two-trial mechanical grading population: one complete retained trial and one faulted trial, with one criterion per predicate family. */
export interface MemoryGradeFixture {
	readonly profile: StudyProfile
	readonly definition: StudyDefinition
	readonly manifest: StudyManifest
	/** Holds the trial that completed with retained evidence, its attempt, and the rows retained for it: one foreign-goal row, then the arrival that cites `receipt`. */
	readonly complete: {
		readonly trial: StudyTrial
		readonly attempt: StudyAttempt
		readonly evidence: readonly StudyEvidence[]
	}
	/** Holds the trial that failed with a capacity refusal and its attempt. */
	readonly faulted: {
		readonly trial: StudyTrial
		readonly attempt: StudyAttempt
	}
	readonly operational: StudyCriterion
	readonly meaning: StudyCriterion
	readonly source: StudyCriterion
	readonly lookup: StudyCriterion
	readonly result: StudyCriterion
	readonly rubric: StudyRubric
	readonly failure: StudyFailure
	readonly attempts: readonly StudyAttempt[]
	/** Holds the evidence rows keyed by trial id. */
	readonly evidence: Readonly<Record<string, readonly StudyEvidence[]>>
}

/** Holds the observation-independent subset two trials must agree on. */
export type MemoryAdmissionFixture = Pick<
	MemoryTrialResult,
	'requests' | 'products' | 'failure' | 'usage'
>

/** Holds actual declarations and the existing built Agent used by CPU tool proofs, as both the runtime and the tested subject. */
export interface StudyToolsFixture {
	readonly manifest: StudyManifest
	readonly rubric: StudyRubric
	readonly profile: StudyProfile
	readonly agent: unknown
	readonly subject: unknown
}

/** Holds one sealed in-process series over a declaration of the `tools` driver. */
export interface StudyToolsRun {
	readonly fixture: StudyToolsFixture
	readonly manifest: StudyManifest
	readonly attempts: readonly StudyAttempt[]
	/** Holds the sealed result's id. */
	readonly seal: string
	/** Holds the evidence rows keyed by trial id. */
	readonly evidence: Readonly<Record<string, readonly StudyEvidence[]>>
	/** Holds each scheduled trial's rows, in schedule order. */
	readonly trials: ReadonlyArray<readonly StudyEvidence[]>
}

/** Holds one role and content of one retained request message. */
export interface StudyToolsMessage {
	readonly role: string
	readonly content: string
}

/** Pins one well-formed goal input holding every library member. */
export const STUDY_TOOLS_LIBRARY_INPUT = Object.freeze({
	prompt: 'Answer under the scope.',
	admitted: true,
	files: Object.freeze([]),
	responses: Object.freeze([Object.freeze({ content: 'Scoped.', calls: Object.freeze([]) })]),
	conversation: 'second',
	scope: Object.freeze({ skills: Object.freeze(['triage']), memos: Object.freeze(['reach']) }),
	skills: Object.freeze([
		Object.freeze({
			name: 'triage',
			description: 'Sorts a report by severity.',
			content: 'Read the report, then name its severity.',
		}),
	]),
	memos: Object.freeze(['tone', 'reach']),
})

/** Lists goal inputs that each break one library member of {@link STUDY_TOOLS_LIBRARY_INPUT}. */
export const STUDY_TOOLS_MALFORMED_LIBRARIES: readonly unknown[] = Object.freeze([
	{ ...STUDY_TOOLS_LIBRARY_INPUT, extra: true },
	{ ...STUDY_TOOLS_LIBRARY_INPUT, conversation: 'con' },
	{ ...STUDY_TOOLS_LIBRARY_INPUT, scope: { tools: ['write'] } },
	{
		...STUDY_TOOLS_LIBRARY_INPUT,
		skills: [{ name: 'triage', description: 'Sorts a report by severity.' }],
	},
	{
		...STUDY_TOOLS_LIBRARY_INPUT,
		skills: ['one', 'two', 'three', 'four', 'five'].map((name) => ({
			name,
			description: 'Sorts a report by severity.',
			content: 'Read the report, then name its severity.',
		})),
	},
	{ ...STUDY_TOOLS_LIBRARY_INPUT, memos: ['one', 'two', 'three', 'four', 'five'] },
	{ ...STUDY_TOOLS_LIBRARY_INPUT, scope: { skills: ['one', 'two', 'three', 'four', 'five'] } },
	{ ...STUDY_TOOLS_LIBRARY_INPUT, scope: { memos: ['one', 'two', 'three', 'four', 'five'] } },
	{ ...STUDY_TOOLS_LIBRARY_INPUT, memos: ['tone', 'tone'] },
])

/** Pins the well-formed request, memo, and counted tool assertions the malformed rows break. */
export const STUDY_TOOLS_LIBRARY_ASSERTIONS = Object.freeze({
	request: Object.freeze({
		observation: 'request',
		at: 0,
		role: 'system',
		text: '- review:',
		present: true,
	}),
	memo: Object.freeze({
		observation: 'memo',
		name: 'tone',
		revisions: 2,
		description: 'Prefers bullet lists.',
	}),
	tool: Object.freeze({ observation: 'tool', name: 'skill', success: true, count: 1 }),
})

/** Lists assertions that each break one member of {@link STUDY_TOOLS_LIBRARY_ASSERTIONS}. */
export const STUDY_TOOLS_MALFORMED_ASSERTIONS: readonly unknown[] = Object.freeze([
	{ ...STUDY_TOOLS_LIBRARY_ASSERTIONS.request, at: -1 },
	{ ...STUDY_TOOLS_LIBRARY_ASSERTIONS.request, at: 0.5 },
	{ ...STUDY_TOOLS_LIBRARY_ASSERTIONS.request, role: 'assistant' },
	{ ...STUDY_TOOLS_LIBRARY_ASSERTIONS.request, text: '' },
	{ observation: 'request', at: 0, role: 'system', text: '- review:' },
	{ ...STUDY_TOOLS_LIBRARY_ASSERTIONS.memo, revisions: -1 },
	{ ...STUDY_TOOLS_LIBRARY_ASSERTIONS.memo, name: 'con' },
	{ ...STUDY_TOOLS_LIBRARY_ASSERTIONS.tool, count: 0 },
	{ ...STUDY_TOOLS_LIBRARY_ASSERTIONS.tool, count: 1.5 },
	{ ...STUDY_TOOLS_LIBRARY_ASSERTIONS.tool, name: 'erase' },
	{ ...STUDY_TOOLS_LIBRARY_ASSERTIONS.request, extra: true },
])

/**
 * Executes and seals a declaration of the `tools` driver through `StudySeries`, then removes its scratch.
 * @param study - The declaration. Default: `tools`.
 * @returns The sealed attempts and their collected evidence.
 * @throws Error - Thrown when the result does not seal.
 */
export async function executeStudyToolsFixture(study = 'tools'): Promise<StudyToolsRun> {
	const fixture = await loadStudyToolsFixture(study)
	const scratch = createScratch()
	try {
		const directory = join(scratch.path, 'result')
		const store = new StudyResultStore({ directory, manifest: fixture.manifest })
		await store.create()
		await new StudySeries({
			manifest: fixture.manifest,
			driver: new StudyToolsDriver({
				agent: fixture.agent,
				subject: fixture.subject,
				directory: scratch.ensure('work'),
			}),
			store,
			signal: new AbortController().signal,
		}).execute()
		await store.seal()
		const result = await readStudyResult(directory)
		if (result.status !== 'sealed') throw new Error('The tools series did not seal')
		const evidence = await collectStudyEvidence(result)
		return {
			fixture,
			manifest: result.manifest,
			attempts: result.attempts,
			seal: result.seal.id,
			evidence,
			trials: result.manifest.schedule.map((trial) => evidence[trial.id] ?? []),
		}
	} finally {
		scratch.destroy()
	}
}

/**
 * Reads each request one goal sent, as the roles and contents its retained `provider` rows hold.
 * @param rows - One trial's retained rows.
 * @param goal - The goal to read.
 * @returns One message list per request, in request order.
 * @throws Error - Thrown when a `provider` row holds no list of role and content strings.
 */
export function readStudyToolsRequests(
	rows: readonly StudyEvidence[],
	goal: string,
): ReadonlyArray<readonly StudyToolsMessage[]> {
	return rows
		.filter((row) => row.goal === goal && row.event === 'provider')
		.map((row) => {
			const request: unknown = isRecord(row.value) ? row.value.request : undefined
			if (!arrayOf(isRecord)(request)) throw new Error(`Malformed ${goal} provider row`)
			return request.map(({ role, content }) => {
				if (!isString(role) || !isString(content)) throw new Error(`Malformed ${goal} message`)
				return { role, content }
			})
		})
}

/**
 * Reads the text one role holds in one request of one goal.
 * @param rows - One trial's retained rows.
 * @param goal - The goal to read.
 * @param at - The request's position within the goal.
 * @param role - The role to read.
 * @returns The role's contents joined by line breaks, empty when the request holds no such message.
 * @throws Error - Thrown when the goal sent no such request, so a negative read cannot pass on an absent request.
 */
export function readStudyToolsText(
	rows: readonly StudyEvidence[],
	goal: string,
	at: number,
	role: string,
): string {
	const request = readStudyToolsRequests(rows, goal)[at]
	if (request === undefined) throw new Error(`The ${goal} goal sent no request ${at}`)
	return request
		.filter((message) => message.role === role)
		.map((message) => message.content)
		.join('\n')
}

/**
 * Collects the record values of one event's rows, each beside the goal it names.
 * @param rows - One trial's retained rows.
 * @param event - The event to read.
 * @returns One record per matching row, in row order.
 */
export function collectStudyToolsRows(
	rows: readonly StudyEvidence[],
	event: string,
): ReadonlyArray<Readonly<Record<string, unknown>>> {
	return rows.flatMap((row) =>
		row.event === event && isRecord(row.value) ? [{ goal: row.goal, ...row.value }] : [],
	)
}

/** Holds real request admission and its single cleanup owner. */
export interface StudyMeterFixture {
	readonly control: StudyControl
	readonly meter: StudyMeter
	readonly scopes: readonly StudyScope[]
	close(): void
}

/** Creates a study context whose evidence is captured by a call recorder. */
export function createRecordedStudyContext(
	fixture: StudyMeterFixture,
	rows: RecorderInterface<readonly [StudyEvidence]>,
): StudyContext {
	return {
		signal: fixture.control.signal,
		meter: fixture.meter,
		evidence: {
			append: async (row) => {
				rows.handler(row)
			},
		},
	}
}

/** Creates a study context that appends evidence to the supplied trace. */
export function createTraceStudyContext(
	fixture: StudyMeterFixture,
	rows: StudyEvidence[],
): StudyContext {
	return {
		signal: fixture.control.signal,
		meter: fixture.meter,
		evidence: {
			append: async (row) => {
				rows.push(row)
			},
		},
	}
}

/** Creates a study context with an inert evidence sink. */
export function createQuietStudyContext(fixture: StudyMeterFixture): StudyContext {
	return {
		signal: fixture.control.signal,
		meter: fixture.meter,
		evidence: { append: async () => undefined },
	}
}

/** Maps each memory instrument fixture text to the ids it carries; the cases read it through a callback. */
export const MEMORY_LITERALS: ReadonlyMap<string, ReadonlySet<string>> = Object.freeze(
	new Map<string, ReadonlySet<string>>([
		['refund AA-101 approved', new Set(['AA-101'])],
		['handoff BB-202 to Dana', new Set(['BB-202'])],
		['closed CC-303', new Set(['CC-303'])],
		['AA-101 asked again', new Set(['AA-101'])],
		['status of BB-202', new Set(['BB-202'])],
		['kept AA-101 BB-202 CC-303', new Set(['AA-101', 'BB-202', 'CC-303'])],
		['recap of refunds and handoffs', new Set()],
		['product cites AA-101 and BB-202', new Set(['AA-101', 'BB-202'])],
		['prompt carries AA-101 and BB-202', new Set(['AA-101', 'BB-202'])],
		['seed question only', new Set()],
	]),
)

/** Holds the retention fixture: the folded slice and the later requests, with an anchored view and a recap-only control view. */
export const MEMORY_RETENTION = Object.freeze({
	history: Object.freeze(['refund AA-101 approved', 'handoff BB-202 to Dana', 'closed CC-303']),
	later: Object.freeze(['AA-101 asked again', 'status of BB-202']),
	anchored: Object.freeze(['kept AA-101 BB-202 CC-303']),
	recap: Object.freeze(['recap of refunds and handoffs']),
})

/** Holds the carriage fixture: the referenced product with a prompt that carries it and a seed-only control prompt. */
export const MEMORY_CARRIAGE = Object.freeze({
	product: 'product cites AA-101 and BB-202',
	carried: Object.freeze(['prompt carries AA-101 and BB-202']),
	seed: Object.freeze(['seed question only']),
})

/** Holds the wire evidence fixtures; a `null` timing mirrors an unobserved terminal timing. */
export const MEMORY_WIRE_ROWS = Object.freeze({
	stable: Object.freeze<StudyEvidence[]>([
		{
			event: 'wire',
			goal: 'g1',
			value: { role: 'agent', timing: { counts: { prompt: 1000, cached: 900 } } },
		},
		{
			event: 'wire',
			goal: 'g1',
			value: { role: 'agent', timing: { counts: { prompt: 1000, cached: 900 } } },
		},
	]),
	changed: Object.freeze<StudyEvidence[]>([
		{
			event: 'wire',
			goal: 'g1',
			value: { role: 'agent', timing: { counts: { prompt: 1000, cached: 0 } } },
		},
	]),
	judge: Object.freeze<StudyEvidence[]>([
		{
			event: 'wire',
			goal: 'g1',
			value: { role: 'judge', timing: { counts: { prompt: 1000, cached: 900 } } },
		},
	]),
	absent: Object.freeze<StudyEvidence[]>([
		{ event: 'wire', goal: 'g1', value: { role: 'agent' } },
		{ event: 'wire', goal: 'g1', value: { role: 'agent', timing: null } },
		{
			event: 'wire',
			goal: 'g1',
			value: { role: 'agent', timing: { counts: { prompt: 1000, cached: null } } },
		},
		{
			event: 'wire',
			goal: 'g1',
			value: { role: 'agent', timing: { counts: { prompt: 0, cached: 0 } } },
		},
	]),
})

/** Holds the re-acquisition evidence: `g1` looks up twice, and `g2` holds only other rows. */
export const MEMORY_EVIDENCE: readonly StudyEvidence[] = Object.freeze([
	{ event: 'arrival', goal: 'g1', value: { id: 'one' } },
	{ event: 'lookup', goal: 'g1', value: { id: 'one', found: true } },
	{ event: 'lookup', goal: 'g1', value: { id: 'two', found: false } },
	{ event: 'arrival', goal: 'g2', value: { id: 'one' } },
	{ event: 'result', goal: 'g2', value: { partial: false } },
	{ event: 'wire', goal: 'g2', value: { role: 'agent' } },
	{ event: 'summary', goal: 'g2', value: {} },
])

/**
 * Pins each role's sampling keys apart from `STUDY_MEMORY_PARAMETERS`: agent and summary hold the 2B
 * digest's stored values under temperature 0 and seed 0, and the judge holds Ollama's v0.40.13
 * defaults under temperature 1 and seed 0, because the Mica digest stores no parameters.
 */
export const STUDY_MEMORY_PARAMETER_PINS = Object.freeze({
	agent: Object.freeze({
		temperature: 0,
		seed: 0,
		top_k: 20,
		top_p: 0.95,
		min_p: 0,
		presence_penalty: 1.5,
		repeat_penalty: 1,
	}),
	summary: Object.freeze({
		temperature: 0,
		seed: 0,
		top_k: 20,
		top_p: 0.95,
		min_p: 0,
		presence_penalty: 1.5,
		repeat_penalty: 1,
	}),
	judge: Object.freeze({
		temperature: 1,
		seed: 0,
		top_k: 40,
		top_p: 0.9,
		min_p: 0,
		presence_penalty: 0,
		repeat_penalty: 1,
	}),
})

/** Pins the sorted option keys every generation request sends. */
export const STUDY_MEMORY_OPTION_KEYS = Object.freeze([
	'min_p',
	'num_ctx',
	'num_predict',
	'presence_penalty',
	'repeat_penalty',
	'seed',
	'temperature',
	'top_k',
	'top_p',
])

/** Pins a fixture recording: the sidecar bounds, and the version `MemoryServer` answers with the metadata bounds. */
export const STUDY_MEMORY_RECORD = Object.freeze({
	record: Object.freeze({ bytes: 4194304, calls: 256, duration: 60000 }),
	settings: Object.freeze({
		version: 'fixture-1',
		metadata: Object.freeze({ calls: 64, bytes: 1048576, duration: 30000 }),
	}),
})

/** Holds an inert exchange sink that declares nothing and retains nothing. */
export const STUDY_MEMORY_INERT_EXCHANGES: StudyExchangeSinkInterface = Object.freeze({
	declaration: undefined,
	next: 1,
	append: () => Promise.resolve(),
	close: () => Promise.resolve(),
})

/** Holds an inert replay that answers every fetch with an empty response. */
export const STUDY_MEMORY_INERT_REPLAY: StudyOllamaReplayInterface = Object.freeze({
	fetch: () => Promise.resolve(new Response('')),
	check: () => undefined,
	close: () => Promise.resolve(),
})

/** Pins the message a capture's replay refuses each request with. */
export const STUDY_MEMORY_REPLAY_REFUSAL = 'The capture replay holds no reply'

/** Holds a recording's collaborators and what reached each. */
export interface MemoryCaptureFixture {
	readonly exchanges: StudyExchangeSinkInterface
	readonly replay: StudyOllamaReplayInterface
	/** Holds each row the sink accepted. */
	readonly rows: RecorderInterface<readonly [row: StudyExchangeRow]>
	/** Holds the role and the path of each request the replay refused. */
	readonly sent: RecorderInterface<readonly [role: StudyRole, path: string]>
}

/** Pins the two chat replies a Ledger's first request spends measuring its gauge, ahead of its first pass. */
export const STUDY_MEMORY_CALIBRATION: readonly MemoryWireFixture[] = Object.freeze([
	Object.freeze({ path: '/api/chat', body: buildMemoryReply() }),
	Object.freeze({ path: '/api/chat', body: buildMemoryReply() }),
])

/**
 * Builds a scripted model reply holding one tool call.
 * @param name - The called tool's name.
 * @param args - The call's arguments, in the order the wire carries them.
 * @returns One chat reply for a protocol fixture script.
 */
export function buildMemoryCall(
	name: string,
	args: Readonly<Record<string, JSONValue>>,
): MemoryWireFixture {
	return {
		path: '/api/chat',
		body: buildMemoryReply({ content: '', calls: [{ function: { name, arguments: args } }] }),
	}
}

/**
 * Builds a one-token judge reply whose top reading is the named label.
 * @param label - The label that takes nearly all the probability.
 * @returns One generate reply for a protocol fixture script.
 */
export function buildMemoryVerdict(label: string): MemoryWireFixture {
	return {
		path: '/api/generate',
		body: JSON.stringify({
			model: 'judge',
			done: true,
			done_reason: 'length',
			response: label,
			prompt_eval_count: 10,
			eval_count: 1,
			logprobs: [
				{
					token: label,
					logprob: -0.01,
					top_logprobs: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Yes', 'No'].map((token) => ({
						token,
						logprob: token === label ? -0.01 : -8,
					})),
				},
			],
		}),
	}
}

/**
 * Builds a finite CPU-only profile that declares recording.
 * @param url - The protocol fixture origin.
 * @returns The fixture profile with the recording bounds, version, and metadata.
 */
export function buildMemoryRecordProfile(url: string): StudyProfile {
	return {
		...buildMemoryProfile({ url, settings: STUDY_MEMORY_RECORD.settings }),
		record: STUDY_MEMORY_RECORD.record,
	}
}

/**
 * Builds Study's own declaration of a one-goal recording behind a sink that keeps each row and a replay that refuses each request.
 * @param profile - A recording profile.
 * @param trial - The trial the declaration binds.
 * @param goal - The scenario's only goal.
 * @returns The two collaborators and their recorders.
 */
export function buildMemoryCapture(
	profile: StudyProfile,
	trial: StudyTrial,
	goal: StudyGoal,
): MemoryCaptureFixture {
	const rows = createRecorder<readonly [row: StudyExchangeRow]>()
	const sent = createRecorder<readonly [role: StudyRole, path: string]>()
	return {
		exchanges: {
			...STUDY_MEMORY_INERT_EXCHANGES,
			declaration: buildStudyExchangeDeclaration(
				profile,
				trial,
				parseStudyScenario({ id: trial.scenario, goals: [goal] }),
				false,
			),
			append: async (row) => {
				rows.handler(row)
			},
		},
		replay: {
			...STUDY_MEMORY_INERT_REPLAY,
			fetch: (role, input) => {
				sent.handler(role, new URL(input).pathname)
				return Promise.reject(new StudyError('FAULT', STUDY_MEMORY_REPLAY_REFUSAL))
			},
		},
		rows,
		sent,
	}
}

/**
 * Rewrites a scratch workspace's authored local profile to declare recording, keeping its other members.
 * @param scratch - The workspace `createStudyInstallFixture` populated.
 * @param checkpoints - The goal ids to list. Default: none.
 * @returns Nothing after the profile is replaced.
 * @throws Error - Thrown when the workspace holds no authored local profile.
 */
export function writeStudyInstallRecord(
	scratch: ScratchInterface,
	checkpoints: readonly string[] = [],
): void {
	const path = 'studies/memory/profiles/local.json'
	const raw = parseJSON(scratch.read(path) ?? '')
	if (!isRecord(raw)) throw new Error('Missing authored memory profile')
	scratch.write(
		path,
		JSON.stringify({
			...raw,
			record: STUDY_MEMORY_RECORD.record,
			settings: {
				...STUDY_MEMORY_SETTINGS,
				...STUDY_MEMORY_RECORD.settings,
				observe: true,
				...(checkpoints.length === 0 ? {} : { checkpoints }),
			},
		}),
	)
}

/**
 * Counts the correction pair questions a trial asked its judge, from the exact wire bytes.
 * @param requests - Recorded HTTP requests.
 * @returns The generate requests that carry the `amends` or the `supersedes` instructions.
 */
export function countMemoryPairs(requests: MemoryTrialResult['requests']): number {
	const { amends, supersedes } = agent.LEDGER_QUESTIONS
	return requests.filter(
		(request) =>
			request.path === '/api/generate' &&
			[amends.instructions, supersedes.instructions].some(
				(instructions) =>
					instructions !== undefined &&
					request.body.includes(JSON.stringify(instructions).slice(1, -1)),
			),
	).length
}

/**
 * Waits until this process holds no listening server.
 * @remarks
 * A closed server stays on the active list for a host-chosen number of loop turns after `close` resolves, so one read can see a closing handle.
 * @returns Completion once the active list holds none.
 * @throws Error - Thrown when a server still listens at the end of the budget.
 */
export function waitForMemoryListeners(): Promise<void> {
	return waitForCondition(
		'no listening server',
		() => !process.getActiveResourcesInfo().includes('TCPServerWrap'),
		{ budget: 10000 },
	)
}

/** Pins a four-goal trajectory, so a session seeded after the second goal has two goals to run. */
export const STUDY_MEMORY_SEED_GOALS: readonly StudyGoal[] = Object.freeze([
	...STUDY_MEMORY_OBSERVATION_GOALS,
	Object.freeze({
		id: 'review',
		input: Object.freeze({
			prompt: 'Review handoff',
			arrivals: Object.freeze([{ id: 'source-3', content: 'Review is due Friday.' }]),
			records: Object.freeze([]),
		}),
	}),
])

/** Pins settings that list every goal of the seed trajectory; the gauge serves the compaction arm alone. */
export const STUDY_MEMORY_SEED_SETTINGS = Object.freeze({
	...STUDY_MEMORY_SETTINGS,
	observe: true,
	checkpoints: Object.freeze(STUDY_MEMORY_SEED_GOALS.map((goal) => goal.id)),
})

/** Pins the text that replaces the newest seated message a comparand renders, so the comparison can fail. */
export const STUDY_MEMORY_SEED_SENTINEL = 'A control sentence no goal holds.'

/** Pins one goal's rows, so each progress cell has a hand count: metadata and judge dispatches ahead of the agent's, and a denial of another reason. */
export const STUDY_MEMORY_PROGRESS_ROWS: readonly StudyEvidence[] = Object.freeze(
	[
		{ event: 'dispatch', value: { role: 'metadata', path: '/api/tags', body: null } },
		{
			event: 'dispatch',
			value: { role: 'metadata', path: '/api/show', body: '{"model":"model"}' },
		},
		{
			event: 'dispatch',
			value: { role: 'judge', path: '/api/generate', body: JSON.stringify({ system: 'Judge' }) },
		},
		{
			event: 'dispatch',
			value: {
				role: 'agent',
				path: '/api/chat',
				body: JSON.stringify({
					messages: [
						{ role: 'system', content: 'Désk' },
						{ role: 'system', content: 'two' },
						{ role: 'user', content: 'not counted' },
					],
				}),
			},
		},
		{
			event: 'dispatch',
			value: {
				role: 'agent',
				path: '/api/chat',
				body: JSON.stringify({ messages: [{ role: 'system', content: 'a later request' }] }),
			},
		},
		{ event: 'wire', value: { role: 'metadata', prompt: null, completion: null, timing: null } },
		{
			event: 'wire',
			value: {
				role: 'judge',
				prompt: 10,
				completion: 1,
				timing: { counts: { prompt: 10, cached: 4 }, durations: { total: 100 } },
			},
		},
		{
			event: 'wire',
			value: {
				role: 'agent',
				prompt: 20,
				completion: 5,
				timing: { counts: { prompt: 20, cached: 5 }, durations: { total: 200 } },
			},
		},
		{
			event: 'wire',
			value: {
				role: 'agent',
				prompt: 40,
				completion: 6,
				timing: { counts: { prompt: 40, cached: 10 }, durations: { total: 300 } },
			},
		},
		{ event: 'wire', value: { role: 'agent', prompt: null, completion: null, timing: null } },
		{ event: 'result', value: { content: ' \n', partial: true, conversation: 'c' } },
		{ event: 'lookup', value: { id: 'a', found: true } },
		{ event: 'lookup', value: { id: 'b', found: false } },
		{ event: 'denial', value: { id: '1', name: 'lookup', reason: STUDY_MEMORY_REPEAT } },
		{ event: 'denial', value: { id: '2', name: 'lookup', reason: agent.LEDGER_NOTES.repeat } },
		{
			event: 'denial',
			value: { id: '3', name: 'absent', reason: 'absent is not in the active scope' },
		},
	].map((row) => Object.freeze({ ...row, goal: 'goal' })),
)

/**
 * Builds the replies of a seed trajectory's first two goals: one lookup call, then two answers, with a records trial's calibration ahead of them.
 * @param arm - The treatment.
 * @returns The script; the later goals take the fixture's default replies.
 */
export function buildMemorySeedResponses(
	arm: MemorySeedFixture['arm'],
): readonly MemoryWireFixture[] {
	return [
		...(arm === 'records' ? STUDY_MEMORY_CALIBRATION : []),
		buildMemoryCall('lookup', { id: 'order-1' }),
		...['Initial handoff', 'Corrected handoff'].map((content) => ({
			path: '/api/chat',
			body: buildMemoryReply({ content }),
		})),
	]
}

/**
 * Reads the value of a goal's one retained `checkpoint` row.
 * @param evidence - Retained rows.
 * @param goal - The goal the row names.
 * @returns The owned value.
 * @throws Error - Thrown when the goal does not hold exactly one row.
 */
export function readMemoryCheckpoint(evidence: readonly StudyEvidence[], goal: string): JSONValue {
	const rows = evidence.filter((row) => row.event === STUDY_CHECKPOINT_EVENT && row.goal === goal)
	const [row] = rows
	if (row === undefined || rows.length !== 1)
		throw new Error(`Expected one ${goal} checkpoint row, found ${rows.length}`)
	return row.value
}

/**
 * Reads the value of a goal's one retained `checkpoint` row as a sealed row holds it, with its keys sorted by the canonical text Study's encoder writes.
 * @param evidence - Retained rows.
 * @param goal - The goal the row names.
 * @returns The owned value.
 * @throws Error - Thrown when the goal does not hold exactly one row, or the value holds no canonical text.
 */
export function readMemorySealedCheckpoint(
	evidence: readonly StudyEvidence[],
	goal: string,
): JSONValue {
	const text = canonicalStringify(readMemoryCheckpoint(evidence, goal))
	if (text === undefined) throw new Error(`The ${goal} checkpoint holds no canonical text`)
	const value = parseJSON(text)
	if (!isJSONValue(value)) throw new Error(`The ${goal} checkpoint is not a JSON value`)
	return value
}

/**
 * Reads the state text of each judge request, ignoring every other path.
 * @param requests - Requests in arrival order.
 * @returns The text between the state markers of each `/api/generate` prompt, in arrival order.
 * @throws Error - Thrown when a generate body holds no such text, so a negative read cannot pass on a skipped body.
 */
export function readMemoryJudgeStates(
	requests: readonly MemoryRequestFixture[],
): readonly string[] {
	return requests
		.filter((request) => request.path === '/api/generate')
		.map((request) => {
			const body = parseJSON(request.body)
			const prompt = isRecord(body) ? body.prompt : undefined
			const state = isString(prompt) ? /<state>\n(.*?)\n<\/state>/su.exec(prompt)?.[1] : undefined
			if (state === undefined) throw new Error(`A judge request holds no state: ${request.body}`)
			return state
		})
}

/**
 * Reads the model requests one goal sent, joining each retained `dispatch` row to the request it dispatched.
 * @param result - A finished trial whose rows and requests align one to one.
 * @param goal - The goal to read.
 * @returns The goal's `/api/chat` and `/api/generate` requests in arrival order.
 * @throws Error - Thrown when the rows and requests do not align.
 */
export function readMemoryGoalRequests(
	result: MemoryTrialResult,
	goal: string,
): readonly MemoryRequestFixture[] {
	const dispatches = result.evidence.filter((row) => row.event === 'dispatch')
	if (dispatches.length !== result.requests.length)
		throw new Error('The dispatch rows do not align with the requests')
	return result.requests.filter(
		(request, index) =>
			dispatches[index]?.goal === goal &&
			(request.path === '/api/chat' || request.path === '/api/generate'),
	)
}

/**
 * Reads the body of the first chat request one goal sent.
 * @param result - A finished trial whose rows and requests align one to one.
 * @param goal - The goal to read.
 * @returns The exact body, or `undefined` when the goal sent none.
 */
export function readMemoryFirstChat(result: MemoryTrialResult, goal: string): string | undefined {
	return readMemoryGoalRequests(result, goal).find((request) => request.path === '/api/chat')?.body
}

/**
 * Builds a checkpoint whose ledger member takes the given changes; an `undefined` change removes its member.
 * @param value - A records checkpoint.
 * @param change - The members to replace.
 * @returns The owned changed value.
 * @throws Error - Thrown when the value holds no ledger member.
 */
export function buildMemorySeedLedger(
	value: JSONValue,
	change: Readonly<Record<string, JSONValue | undefined>>,
): JSONValue {
	if (!isRecord(value) || !isRecord(value.ledger)) throw new Error('Missing checkpoint ledger')
	return cloneJSONValue(
		parseJSON(JSON.stringify({ ...value, ledger: { ...value.ledger, ...change } })),
	)
}

/**
 * Builds a checkpoint whose newest conversation message the comparand renders holds {@link STUDY_MEMORY_SEED_SENTINEL}, on either arm's state member.
 * @remarks
 * The comparand is JSON text, so a content renders when its JSON-escaped form occurs there. An empty
 * or non-string content never does, because an empty string occurs in every body and a tool-call
 * message holds empty content.
 * @param value - A checkpoint.
 * @param comparand - The decoded body of the request the seated session reproduces.
 * @returns The owned changed value.
 * @throws Error - Thrown when the value holds no conversation, or the comparand renders none of its messages.
 */
export function buildMemorySeedControl(value: JSONValue, comparand: string): JSONValue {
	if (!isRecord(value)) throw new Error('Missing checkpoint')
	const state = isRecord(value.ledger) ? value.ledger : value
	const conversation = state.conversation
	if (!isRecord(conversation) || !isArray(conversation.messages))
		throw new Error('Missing checkpoint conversation')
	const index = conversation.messages.findLastIndex(
		(message) =>
			isRecord(message) &&
			isString(message.content) &&
			message.content !== '' &&
			comparand.includes(JSON.stringify(message.content).slice(1, -1)),
	)
	const selected: unknown = conversation.messages[index]
	if (!isRecord(selected)) throw new Error('The comparand renders no checkpoint message')
	const replaced = {
		...conversation,
		messages: conversation.messages.with(index, {
			...selected,
			content: STUDY_MEMORY_SEED_SENTINEL,
		}),
	}
	return cloneJSONValue(
		parseJSON(
			JSON.stringify(
				isRecord(value.ledger)
					? { ...value, ledger: { ...value.ledger, conversation: replaced } }
					: { ...value, conversation: replaced },
			),
		),
	)
}

/**
 * Finds the first byte two bodies differ at.
 * @param left - One body.
 * @param right - The other body.
 * @returns The offset, or `undefined` when they are equal.
 */
export function findMemoryOffset(left: Uint8Array, right: Uint8Array): number | undefined {
	const [longer, shorter] = left.byteLength >= right.byteLength ? [left, right] : [right, left]
	const offset = longer.findIndex((byte, index) => byte !== shorter[index])
	return offset === -1 ? undefined : offset
}

/**
 * Reports whether a control run's every chat request differs from the comparand.
 * @remarks
 * Changing a judged message re-asks its question, which moves only `/api/generate`, and a fold's
 * summary chat sits ahead of the agent's request, so no position is read. An absent chat reads false.
 * @param expected - The comparand's bytes.
 * @param requests - The control run's requests in arrival order.
 * @returns True if the run sent a chat and none equals the comparand; false otherwise.
 */
export function readMemoryControl(
	expected: Uint8Array,
	requests: readonly MemoryRequestFixture[],
): boolean {
	const chats = requests.filter((request) => request.path === '/api/chat')
	return (
		chats.length > 0 &&
		chats.every(
			(request) => findMemoryOffset(expected, Buffer.from(request.body, 'utf8')) !== undefined,
		)
	)
}

/**
 * Lists each request of a seated goal that differs from its recording, position by position.
 * @param goal - The seated goal.
 * @param recorded - The goal's recorded attempts.
 * @param seated - The requests the seated session sent.
 * @returns One entry per differing position, with offset 0 where one side holds no request.
 */
export function listMemorySeedDifferences(
	goal: string,
	recorded: readonly StudyExchangeAttempt[],
	seated: readonly MemoryRequestFixture[],
): readonly MemorySeedDifference[] {
	return Array.from({ length: Math.max(recorded.length, seated.length) }).flatMap((_, at) => {
		const attempt = recorded[at]
		const request = seated[at]
		const offset =
			attempt === undefined || request === undefined
				? 0
				: findMemoryOffset(Buffer.from(attempt.body, 'base64'), Buffer.from(request.body, 'utf8'))
		return offset === undefined
			? []
			: [{ goal, ordinal: attempt?.ordinal, role: attempt?.role, offset }]
	})
}

/**
 * Opens a session on a checkpoint and runs one goal against a fresh loopback fixture.
 * @remarks
 * The fixture replaces the profile's provider URL, and neither `provider.daemon` nor `record` reaches
 * the driver, so no daemon starts and no recording opens.
 * @param options - The arm, profile, checkpoint value, goal, replies, and metadata bodies.
 * @returns The goal's `/api/chat` and `/api/generate` requests in arrival order.
 * @throws Error - Rethrows a refused seed or a goal failure, after closing the session and the fixture.
 */
export async function readMemorySeedRequests(
	options: MemorySeedFixture,
): Promise<readonly MemoryRequestFixture[]> {
	const declared = options.profile.provider
	if (declared === undefined) throw new Error('Missing seed provider')
	const server = await createMemoryServer(options.replies, options.metadata)
	// A JSON copy drops both members, which `exactOptionalPropertyTypes` holds no undefined for.
	const profile = parseStudyProfile(
		parseJSON(
			JSON.stringify({
				...options.profile,
				provider: { ...declared, url: server.url, daemon: undefined },
				record: undefined,
			}),
		),
	)
	const fixture = createMemoryContext(profile)
	try {
		const session = await new StudyMemoryDriver({ ...STUDY_MEMORY_MODULES, profile }).open(
			{ id: 'seed', scenario: 'public', arm: options.arm, repetition: 0 },
			fixture.context.signal,
			options.seed,
		)
		try {
			await session.execute(options.goal, fixture.context)
		} finally {
			await session.close()
		}
		return server.requests.filter(
			(request) => request.path === '/api/chat' || request.path === '/api/generate',
		)
	} finally {
		fixture.close()
		await server.close()
	}
}

/**
 * Compares a sealed segment's own recording with each checkpoint it holds, seated and served the recorded replies.
 * @remarks
 * A records goal's first agent request depends on its judge replies, so the recorded replies are
 * served. The comparand is the next goal's first `agent` attempt at `execution`; a request of another
 * role is served and read only into `whole` and `differences`. The control seats the newest message
 * the comparand renders with the sentinel, and reads every chat of its run.
 * @param directory - The sealed result, which holds one trial.
 * @param profile - The profile the segment ran under.
 * @returns The counts and the differences.
 * @throws Error - Thrown when the result is not one sealed trial of a memory arm, a next goal holds no agent attempt, or its comparand renders no seated message.
 */
export async function compareMemorySeed(
	directory: string,
	profile: StudyProfile,
): Promise<MemorySeedResult> {
	const result = await readStudyResult(directory)
	if (result.status !== 'sealed') throw new Error('The seed comparison reads a sealed result')
	const [trial, ...others] = result.manifest.schedule
	if (trial === undefined || others.length > 0)
		throw new Error('The seed comparison reads one trial')
	const { arm } = trial
	if (!isStudyMemoryArm(arm)) throw new Error(`Unsupported memory arm ${arm}`)
	const goals = result.manifest.scenarios.find((scenario) => scenario.id === trial.scenario)?.goals
	if (goals === undefined) throw new Error('The sealed trial names no scenario')
	const evidence = (await collectStudyEvidence(result))[trial.id] ?? []
	const { exchanges } = await readStudyExchanges(result, trial.id)
	const metadata = new Map<string, string>()
	for (const { attempt, response } of exchanges)
		if (attempt.role === 'metadata' && !metadata.has(attempt.path))
			metadata.set(attempt.path, Buffer.from(response.body, 'base64').toString('utf8'))
	const readings: Array<{
		readonly equal: boolean
		readonly control: boolean
		readonly differences: readonly MemorySeedDifference[]
	}> = []
	for (const [index, goal] of goals.entries()) {
		const next = goals[index + 1]
		const row = evidence.find(
			(entry) => entry.event === STUDY_CHECKPOINT_EVENT && entry.goal === goal.id,
		)
		if (next === undefined || row === undefined) continue
		const recorded = exchanges.filter(
			({ attempt }) =>
				attempt.goal === next.id &&
				attempt.stage === 'execution' &&
				(attempt.path === '/api/chat' || attempt.path === '/api/generate'),
		)
		const position = recorded.findIndex(({ attempt }) => attempt.role === 'agent')
		const comparand = recorded[position]
		if (comparand === undefined) throw new Error(`Goal ${next.id} recorded no agent attempt`)
		const seat = {
			arm,
			profile,
			goal: next,
			replies: recorded.map(({ attempt, response }) => ({
				path: attempt.path,
				status: response.status,
				body: Buffer.from(response.body, 'base64').toString('utf8'),
			})),
			metadata: Object.fromEntries(metadata),
		}
		const expected = Buffer.from(comparand.attempt.body, 'base64')
		const seated = await readMemorySeedRequests({ ...seat, seed: row.value })
		const control = await readMemorySeedRequests({
			...seat,
			seed: buildMemorySeedControl(row.value, expected.toString('utf8')),
		})
		readings.push({
			equal:
				findMemoryOffset(expected, Buffer.from(seated[position]?.body ?? '', 'utf8')) === undefined,
			control: readMemoryControl(expected, control),
			differences: listMemorySeedDifferences(
				next.id,
				recorded.map((exchange) => exchange.attempt),
				seated,
			),
		})
	}
	return {
		compared: readings.length,
		equal: readings.filter((entry) => entry.equal).length,
		control: readings.filter((entry) => entry.control).length,
		whole: readings.filter((entry) => entry.differences.length === 0).length,
		differences: readings.flatMap((entry) => entry.differences),
	}
}

/**
 * Reads each listed goal's adapter reading from a `study progress` document.
 * @param stdout - The command's standard output.
 * @returns The readings of the document's first trial, by goal, in listed order.
 * @throws Error - Thrown when the document holds no such trial.
 */
export function readMemoryProgressRows(stdout: string): ReadonlyMap<string, unknown> {
	const document = parseJSON(stdout)
	const progress = isRecord(document) ? document.progress : undefined
	const trials = isRecord(progress) ? progress.trials : undefined
	const [trial] = arrayOf(isRecord)(trials) ? trials : []
	if (trial === undefined || !arrayOf(isRecord)(trial.goals))
		throw new Error('The progress document lists no trial')
	// `reading` is Study's own member of a goal in the progress document, so it keeps its name.
	return new Map(trial.goals.map((goal) => [String(goal.goal), goal.reading]))
}

/**
 * Reads a trial id of one arm from a capacity check's schedule.
 * @param fixture - The installed command.
 * @param arm - The arm to find.
 * @returns The first trial of that arm.
 * @throws Error - Thrown when the check refuses or schedules none.
 */
export async function readStudyInstallTrial(
	fixture: StudyInstallFixture,
	arm: MemorySeedFixture['arm'],
): Promise<string> {
	const checked = await executeStudyInstall(fixture, ['check', 'capacity'])
	const plan: unknown = checked.code === 0 ? parseJSON(checked.stdout) : undefined
	const trial =
		isRecord(plan) && arrayOf(isRecord)(plan.schedule)
			? plan.schedule.find((entry) => entry.arm === arm)
			: undefined
	if (trial === undefined || !isString(trial.id)) throw new Error(`No ${arm} trial is scheduled`)
	return trial.id
}

/**
 * Checks one capacity selection and executes the arguments that check returns, as an operator does.
 * @param fixture - The installed command.
 * @param selectors - The `--trial`, `--goals`, and `--seed` arguments.
 * @param output - The result directory.
 * @returns The refusing check, or the execution.
 * @throws Error - Thrown when a passing check returns no arguments.
 */
export async function executeMemorySegment(
	fixture: StudyInstallFixture,
	selectors: readonly string[],
	output: string,
): Promise<StudyInstallResult> {
	const checked = await executeStudyInstall(fixture, [
		'check',
		'capacity',
		'--profile',
		'local',
		...selectors,
	])
	if (checked.code !== 0) return checked
	const plan = parseJSON(checked.stdout)
	if (!isRecord(plan) || !arrayOf(isString)(plan.next))
		throw new Error('Missing selected execution arguments')
	return executeStudyInstall(fixture, [...plan.next, '--out', output], 260000)
}

/**
 * Executes a two-segment chain on the install fixture's `capacity` target: `opening..correction`, then `closure..closure` seeded from the first segment's `correction` row.
 * @param fixture - The installed command; its `local.json` is rewritten to record and to list each goal.
 * @param server - The loopback provider, whose `/api/version` default answers each verification.
 * @param arm - The arm whose trial runs.
 * @param directory - The folder that holds both results; it is created when absent.
 * @returns The trial, the rewritten profile, both results, and the request counts at the boundary and at the end.
 * @throws Error - Thrown when the check schedules no trial of the arm.
 */
export async function executeMemorySeedChain(
	fixture: StudyInstallFixture,
	server: MemoryServerFixture,
	arm: MemorySeedFixture['arm'],
	directory: string,
): Promise<MemorySeedChainFixture> {
	writeStudyInstallRecord(fixture.scratch, STUDY_MEMORY_GOALS)
	mkdirSync(directory, { recursive: true })
	const trial = await readStudyInstallTrial(fixture, arm)
	const first = join(directory, 'first')
	const second = join(directory, 'second')
	const opened = await executeMemorySegment(
		fixture,
		['--trial', trial, '--goals', 'opening..correction'],
		first,
	)
	const boundary = server.requests.length
	const seeded = await executeMemorySegment(
		fixture,
		['--trial', trial, '--goals', 'closure..closure', '--seed', `${first}:${trial}:correction`],
		second,
	)
	return {
		trial,
		profile: parseStudyProfile(
			parseJSON(fixture.scratch.read('studies/memory/profiles/local.json') ?? ''),
		),
		first,
		second,
		opened,
		seeded,
		boundary,
		sent: server.requests.length,
	}
}

/** Names the rubric classes of one goal, each its criterion id's suffix. */
export type MemoryLabelClass = 'work' | 'completion' | 'facts' | 'obligations'
/** Names a verdict a labeler or a judgment holds. */
export type MemoryLabelVerdict = StudyJudgment['verdict']
/** Names the prompt condition of a labeling node. */
export type MemoryLabelCondition = 'plain' | 'receipts'
/** Holds one sealed segment's retained packet and mapping bytes. */
export interface MemoryLabelSegment {
	/** Holds the sealed result's seal id, which the mapping names. */
	readonly result: string
	readonly arm: string
	readonly packet: Uint8Array
	readonly mapping: Uint8Array
}
/** Holds one authored fictional row that catches an inattentive lane. */
export interface MemoryLabelControl {
	readonly input: JSONValue
	readonly product: JSONValue
	readonly assertion: JSONValue
	readonly verdict: MemoryLabelVerdict
}
/** Holds the one row text a labeler reads; a goal that failed holds no `product`. */
export interface MemoryLabelRow {
	readonly row: number
	readonly input: JSONValue
	readonly product?: JSONValue
	readonly assertion: JSONValue
}
/** Holds the rows one fresh lane labels. */
export interface MemoryLabelRequest {
	readonly rows: readonly MemoryLabelRow[]
}
/** Links one neutral row to its packet identities and its source pair. */
export interface MemoryLabelLink {
	readonly row: number
	/** Holds the index of the request that shows the row. */
	readonly request: number
	/** Holds the packet bytes' digest, which the row's labels bind. */
	readonly packet: string
	readonly result: string
	readonly arm: string
	readonly trial: string
	readonly criterion: string
	readonly source: { readonly trial: string; readonly criterion: string }
	readonly goal: string
	readonly class: MemoryLabelClass
}
/** Links one control's neutral row to the verdict its authored text states. */
export interface MemoryLabelCheck {
	readonly row: number
	readonly request: number
	readonly verdict: MemoryLabelVerdict
}
/** Holds what a lane must not see: each row's identity, and which rows are controls. */
export interface MemoryLabelMap {
	readonly links: readonly MemoryLabelLink[]
	readonly checks: readonly MemoryLabelCheck[]
}
/** Holds a gate's labeling requests and their separate map. */
export interface MemoryLabelPool {
	readonly requests: readonly MemoryLabelRequest[]
	readonly map: MemoryLabelMap
}
/** Holds one row a lane returned. */
export interface MemoryLabelAnswer {
	readonly row: number
	readonly verdict: MemoryLabelVerdict
	readonly reason: string
	/** Holds whether the lane flagged the row's text as revealing its arm. */
	readonly revealed?: boolean
}
/** Holds what one engine returned across its nodes. */
export interface MemoryLabelLane {
	readonly labeler: string
	readonly rows: readonly MemoryLabelAnswer[]
}
/** Holds what a labels file states beside its judgments, and the lane that settles disputes. */
export interface MemoryLabelOptions {
	readonly created: string
	readonly version: string
	readonly third?: MemoryLabelLane
}
/** Holds the labels files of a pool and what their rows came to. */
export interface MemoryLabelImport {
	/** Holds one file per packet. */
	readonly labels: readonly StudyLabels[]
	/** Counts each lane's row that is absent or carries a blank reason, controls aside. */
	readonly omitted: number
	/** Lists the rows the labeling lanes disagree on, before any third lane. */
	readonly disputes: readonly number[]
	/** Counts, per lane in order, the controls it omitted or answered against the authored verdict. */
	readonly missed: readonly number[]
}
/** Holds two lanes' agreement over one class. */
export interface MemoryLabelAgreement {
	readonly class: MemoryLabelClass
	readonly count: number
	readonly agreement: number
	/** Holds Cohen's kappa over the three verdicts; undefined when chance agreement is 1. */
	readonly kappa: number | undefined
	/** Holds both-achieved over either-achieved; undefined when neither side holds an `achieved`. */
	readonly overlap: number | undefined
}
/** Names an arm's place in a gate. */
export type MemoryGateRole = 'treatment' | 'base' | 'repeat' | 'sham'
/** Names what a gate clause asks of the treatment against the base. */
export type MemoryGateRelationship = 'noninferior' | 'improves' | 'falls' | 'unadded'
/** Names the verdict of a clause over every assignment of the unknowns. */
export type MemoryGateVerdict = 'holds' | 'fails' | 'open' | 'unread'
/** Holds one gate clause; `work` scores `achieved` and `completion` scores `unsuccessful`. */
export interface MemoryGateClause {
	readonly class: 'work' | 'completion'
	readonly relationship: MemoryGateRelationship
}
/** Holds each role's judgments across its segments, under source ids. */
export type MemoryGatePopulation = Readonly<Record<MemoryGateRole, readonly StudyJudgment[]>>
/** Holds the arm name each role reads. */
export type MemoryGateAssignment = Readonly<Record<MemoryGateRole, string>>
/** Holds one integer score per role. */
export type MemoryGateScore = Readonly<Record<MemoryGateRole, number>>
/** Holds one arm's scored judgments, its unknown judgments, and its class total. */
export interface MemoryGateCount {
	readonly known: number
	readonly unknown: number
	readonly total: number
}
/** Holds the least and greatest noise over every assignment of the unknowns. */
export interface MemoryGateNoise {
	readonly least: number
	readonly greatest: number
}
/** Names an arm whose unknowns can move an open clause, with how many it holds. */
export interface MemoryGateDecider {
	readonly role: MemoryGateRole
	readonly unknown: number
}
/** Holds a clause's outcome over one gate's arms. */
export interface MemoryGateOutcome {
	readonly verdict: MemoryGateVerdict
	readonly counts: Readonly<Record<MemoryGateRole, MemoryGateCount>>
	/** Holds N's range; undefined when the clause reads no N or an arm is unread. */
	readonly noise: MemoryGateNoise | undefined
	/** Holds the fewest judgments that must change to leave `holds` or `fails`, measured from the unknowns' range. */
	readonly reversal: number | undefined
	/** Lists the arms whose unknowns can decide an `open` clause. */
	readonly deciders: readonly MemoryGateDecider[]
}
/** Holds one hand-computed row of the gate reader's table. */
export interface MemoryGateRow extends MemoryGateOutcome {
	readonly name: string
	readonly clause: MemoryGateClause
}
/** Holds one generated labeling node, its prompt included. */
export interface MemoryLabelNode {
	readonly label: string
	readonly request: number
	readonly engine: string
	readonly condition: MemoryLabelCondition
	/** Counts the prompt's characters, so a rate names its text without holding it. */
	readonly characters: number
	readonly prompt: string
}
/** Holds what a transcript shows of one lane. */
export interface MemoryTranscriptResult {
	/** Lists the lane's tool calls by name, in order. */
	readonly tools: readonly string[]
	/** Holds the milliseconds between its first and last stamped lines; undefined with none. */
	readonly wall: number | undefined
}
/** Holds one workflow node a journal started, with what it returned. */
export interface MemoryJournalNode {
	readonly agent: string
	readonly label: string
	/** Holds the node's return value; undefined when the journal holds none. */
	readonly result: unknown
}
/** Holds the nodes of one workflow journal. */
export interface MemoryJournal {
	/** Counts the journal's `started` and `result` lines. */
	readonly entries: number
	readonly nodes: readonly MemoryJournalNode[]
}
/** Holds one kept labeling node's answers. */
export interface MemoryLabelRead {
	readonly node: Omit<MemoryLabelNode, 'prompt'>
	readonly answers: readonly MemoryLabelAnswer[]
	readonly wall: number | undefined
}
/** Holds what a labeling run's journal came to. */
export interface MemoryLabelRun {
	readonly reads: readonly MemoryLabelRead[]
	/** Counts the labeling nodes whose return holds no `rows` member, the unstarted included. */
	readonly unread: number
	/** Counts the labeling nodes that called a tool other than `StructuredOutput`. */
	readonly discarded: number
	/** Counts the journal's nodes that no labeling node names. */
	readonly foreign: number
	/** Counts the answers kept nodes returned for a row their own request does not show, none of which is kept. */
	readonly strayed: number
}
/** Holds what the first node reports a lane is given, the recorded limit on a lane's blindness. */
export interface MemoryHarnessReport {
	readonly tools: readonly string[]
	readonly context: readonly string[]
}
/** Holds the least, median, and greatest of a set of readings. */
export interface MemorySpread {
	readonly least: number
	readonly median: number
	readonly greatest: number
}
/** Holds one class's pilot result for one engine. */
export interface MemoryPilotClass {
	readonly class: MemoryLabelClass
	/** Holds the spread of the class's row text, in characters of its JSON. */
	readonly characters: MemorySpread | undefined
	/** Counts the class's plain rows the engine answered. */
	readonly count: number
	/** Counts those it answered `achieved`. */
	readonly achieved: number
	/** Counts those whose verdict differs when the receipts are added. */
	readonly changed: number
}
/** Holds one engine's pilot result, each rate beside the text it was read on. */
export interface MemoryPilotResult {
	/** Holds the milliseconds per goal-arm of the plain nodes. */
	readonly wall: MemorySpread | undefined
	/** Holds the characters of each plain node's prompt. */
	readonly characters: MemorySpread | undefined
	/** Holds the milliseconds per 1000 prompt characters of the plain nodes. */
	readonly rate: MemorySpread | undefined
	readonly classes: readonly MemoryPilotClass[]
}
/** Holds a sealed population and the real packet bytes built over it. */
export interface MemoryLabelFixture {
	readonly result: StudySealedResult
	readonly rubric: StudyRubric
	readonly digest: string
	readonly segment: MemoryLabelSegment
}
/** Holds one packet entry's pooling group, row text, and identities. */
export interface MemoryLabelMember {
	readonly group: string
	readonly text: Omit<MemoryLabelRow, 'row'>
	readonly link: Omit<MemoryLabelLink, 'row' | 'request'>
}
/** Holds one row before its number: a packet entry holds a `link`, and a control holds a `verdict`. */
export interface MemoryLabelSeat {
	readonly rank: string
	readonly request: number
	readonly text: Omit<MemoryLabelRow, 'row'>
	readonly link?: Omit<MemoryLabelLink, 'row' | 'request'>
	readonly verdict?: MemoryLabelVerdict
}
/** Holds one public evidence row a receipts prompt shows. */
export interface MemoryLabelReceipt {
	readonly event: string
	readonly value: JSONValue
}
/** Holds what a pool wrapper keeps for its gate wrapper: the pool and its nodes, prompts aside. */
export interface MemoryLabelPlan {
	readonly pool: MemoryLabelPool
	readonly nodes: ReadonlyArray<Omit<MemoryLabelNode, 'prompt'>>
}
/** Holds one clause with what it read. */
export interface MemoryGateResult {
	readonly clause: MemoryGateClause
	readonly outcome: MemoryGateOutcome
}

/** Holds the reason a disputed row's judgment states. */
export const MEMORY_LABEL_DISPUTE = 'Labelers disagree'
/** Holds the reason a row no lane settled reads under in a gate's arms. */
export const MEMORY_LABEL_ABSENT = 'No lane labeled this row'
/** Holds the reasoning effort of every labeling node. */
export const MEMORY_LABEL_EFFORT = 'high'
/** Lists the evidence events a goal's receipts hold; `wire`, `dispatch`, and `checkpoint` rows carry whole requests and state. */
export const MEMORY_LABEL_RECEIPTS: readonly string[] = Object.freeze([
	'arrival',
	'lookup',
	'result',
	'summary',
])
/** Holds the first node's label, which a journal names it by. */
export const MEMORY_LABEL_HARNESS_NODE = 'harness'
/** Holds the first node's prompt, which holds no packet text and records what a lane is given. */
export const MEMORY_LABEL_HARNESS =
	'Return the name of every tool you hold, and name every instruction file, memory text, and other context loaded into this conversation. Call no tool except the structured answer.'
/** Holds fictional controls whose product plainly meets or misses its assertion. */
export const MEMORY_LABEL_CONTROLS: readonly MemoryLabelControl[] = Object.freeze([
	Object.freeze({
		input: { prompt: 'State the shelf that holds the blue lantern.' },
		product: { value: { content: 'The blue lantern sits on shelf 14.' }, partial: false },
		assertion: { criterion: 'The reply names shelf 14 as the blue lantern shelf.' },
		verdict: 'achieved',
	}),
	Object.freeze({
		input: { prompt: 'State the ferry that leaves at dawn.' },
		product: { value: { content: 'The harbor office closes at noon.' }, partial: false },
		assertion: { criterion: 'The reply names the ferry that leaves at dawn.' },
		verdict: 'unsuccessful',
	}),
])
/**
 * Holds the gate reader's table, each row computed by hand: N = 2 x max(|repeat - base|, |sham - base|)
 * at every assignment, and a reversal is the least L1 distance from the score box to a point that
 * answers the other way, each score staying within 0 and its total.
 */
export const MEMORY_GATE_ROWS: readonly MemoryGateRow[] = Object.freeze([
	{
		// N = 2 x max(1, 1) = 2; 3 >= 1 and 4 >= 1. Cost 2 reaches N 0 with 3 >= 3, or t 1 with 1 >= 1; cost 3 reaches t 2 at N 0, or t 0 at N 2.
		name: 'A, noninferior holds',
		clause: { class: 'work', relationship: 'noninferior' },
		counts: {
			treatment: { known: 3, unknown: 1, total: 4 },
			base: { known: 3, unknown: 0, total: 4 },
			repeat: { known: 2, unknown: 0, total: 4 },
			sham: { known: 4, unknown: 0, total: 4 },
		},
		verdict: 'holds',
		noise: { least: 2, greatest: 2 },
		reversal: 3,
		deciders: [],
	},
	{
		// N = 0; 0 >= 4 is false. Cost 1 leaves N at most 2 and 0 >= 1 false; repeat 2 gives N 4 and 0 >= 0, where the treatment alone needs 4.
		name: 'noninferior fails, reversed by N',
		clause: { class: 'work', relationship: 'noninferior' },
		counts: {
			treatment: { known: 0, unknown: 0, total: 4 },
			base: { known: 4, unknown: 0, total: 4 },
			repeat: { known: 4, unknown: 0, total: 4 },
			sham: { known: 4, unknown: 0, total: 4 },
		},
		verdict: 'fails',
		noise: { least: 0, greatest: 0 },
		reversal: 2,
		deciders: [],
	},
	{
		// N = 0; treatment 3 to 6 against 6: 6 >= 6 is true and 3 >= 6 is false.
		name: 'C, noninferior open on the treatment',
		clause: { class: 'work', relationship: 'noninferior' },
		counts: {
			treatment: { known: 3, unknown: 3, total: 6 },
			base: { known: 6, unknown: 0, total: 6 },
			repeat: { known: 6, unknown: 0, total: 6 },
			sham: { known: 6, unknown: 0, total: 6 },
		},
		verdict: 'open',
		noise: { least: 0, greatest: 0 },
		reversal: undefined,
		deciders: [{ role: 'treatment', unknown: 3 }],
	},
	{
		// Repeat 5 gives N 2 and 5 >= 4; repeat 6 gives N 0 and 5 >= 6 is false, so only the repeat arm's unknown decides.
		name: 'noninferior open on N alone',
		clause: { class: 'work', relationship: 'noninferior' },
		counts: {
			treatment: { known: 5, unknown: 0, total: 6 },
			base: { known: 6, unknown: 0, total: 6 },
			repeat: { known: 5, unknown: 1, total: 6 },
			sham: { known: 6, unknown: 0, total: 6 },
		},
		verdict: 'open',
		noise: { least: 0, greatest: 2 },
		reversal: undefined,
		deciders: [{ role: 'repeat', unknown: 1 }],
	},
	{
		// Base 3 gives N 0 and 3 >= 3; base 4 gives N 2 and 3 >= 2. Taking N as an independent point reads 3 >= 4 and calls this open. Cost 1: t 2 at base 3, 2 >= 3 is false.
		name: 'noninferior holds with N following its arms',
		clause: { class: 'work', relationship: 'noninferior' },
		counts: {
			treatment: { known: 3, unknown: 0, total: 4 },
			base: { known: 3, unknown: 1, total: 4 },
			repeat: { known: 3, unknown: 0, total: 4 },
			sham: { known: 3, unknown: 0, total: 4 },
		},
		verdict: 'holds',
		noise: { least: 0, greatest: 2 },
		reversal: 1,
		deciders: [],
	},
	{
		// N = 2 x max(0, 1) = 2; 6 > 5. Cost 1: t 5 and 5 > 5 is false.
		name: 'B, improves holds',
		clause: { class: 'work', relationship: 'improves' },
		counts: {
			treatment: { known: 6, unknown: 0, total: 6 },
			base: { known: 3, unknown: 0, total: 6 },
			repeat: { known: 3, unknown: 0, total: 6 },
			sham: { known: 4, unknown: 0, total: 6 },
		},
		verdict: 'holds',
		noise: { least: 2, greatest: 2 },
		reversal: 1,
		deciders: [],
	},
	{
		// N = 2; 9 > 5. Every cost 1 point keeps base + N at most 7; sham 6 gives N 6 and 9 > 9 is false at cost 2, where the treatment alone needs 4.
		name: 'improves holds, reversed by N',
		clause: { class: 'work', relationship: 'improves' },
		counts: {
			treatment: { known: 9, unknown: 0, total: 9 },
			base: { known: 3, unknown: 0, total: 9 },
			repeat: { known: 3, unknown: 0, total: 9 },
			sham: { known: 4, unknown: 0, total: 9 },
		},
		verdict: 'holds',
		noise: { least: 2, greatest: 2 },
		reversal: 2,
		deciders: [],
	},
	{
		// N = 0; 3 > 3 is false. Cost 1: t 4 and 4 > 3.
		name: 'improves fails',
		clause: { class: 'work', relationship: 'improves' },
		counts: {
			treatment: { known: 3, unknown: 0, total: 6 },
			base: { known: 3, unknown: 0, total: 6 },
			repeat: { known: 3, unknown: 0, total: 6 },
			sham: { known: 3, unknown: 0, total: 6 },
		},
		verdict: 'fails',
		noise: { least: 0, greatest: 0 },
		reversal: 1,
		deciders: [],
	},
	{
		// N = 0; treatment 1 to 2 against 3. The distance runs from the range's top: t 4 is cost 2, and t 3 is 3 > 3, false.
		name: 'improves fails, measured from the unknowns range',
		clause: { class: 'work', relationship: 'improves' },
		counts: {
			treatment: { known: 1, unknown: 1, total: 5 },
			base: { known: 3, unknown: 0, total: 5 },
			repeat: { known: 3, unknown: 0, total: 5 },
			sham: { known: 3, unknown: 0, total: 5 },
		},
		verdict: 'fails',
		noise: { least: 0, greatest: 0 },
		reversal: 2,
		deciders: [],
	},
	{
		// N = 0; treatment 3 to 5 against 3: 3 > 3 is false and 4 > 3 is true.
		name: 'improves open',
		clause: { class: 'work', relationship: 'improves' },
		counts: {
			treatment: { known: 3, unknown: 2, total: 6 },
			base: { known: 3, unknown: 0, total: 6 },
			repeat: { known: 3, unknown: 0, total: 6 },
			sham: { known: 3, unknown: 0, total: 6 },
		},
		verdict: 'open',
		noise: { least: 0, greatest: 0 },
		reversal: undefined,
		deciders: [{ role: 'treatment', unknown: 2 }],
	},
	{
		// N = 2; 1 < 3. Cost 1: sham 3 gives N 4 and 1 < 1 is false, where the treatment alone needs t 3 at cost 2.
		name: 'falls holds, reversed by N',
		clause: { class: 'completion', relationship: 'falls' },
		counts: {
			treatment: { known: 1, unknown: 0, total: 6 },
			base: { known: 5, unknown: 0, total: 6 },
			repeat: { known: 5, unknown: 0, total: 6 },
			sham: { known: 4, unknown: 0, total: 6 },
		},
		verdict: 'holds',
		noise: { least: 2, greatest: 2 },
		reversal: 1,
		deciders: [],
	},
	{
		// N = 0; 5 < 5 is false. Cost 1: t 4 and 4 < 5.
		name: 'falls fails',
		clause: { class: 'completion', relationship: 'falls' },
		counts: {
			treatment: { known: 5, unknown: 0, total: 6 },
			base: { known: 5, unknown: 0, total: 6 },
			repeat: { known: 5, unknown: 0, total: 6 },
			sham: { known: 5, unknown: 0, total: 6 },
		},
		verdict: 'fails',
		noise: { least: 0, greatest: 0 },
		reversal: 1,
		deciders: [],
	},
	{
		// N = 0; treatment 3 to 5 against 5: 3 < 5 is true and 5 < 5 is false.
		name: 'falls open',
		clause: { class: 'completion', relationship: 'falls' },
		counts: {
			treatment: { known: 3, unknown: 2, total: 6 },
			base: { known: 5, unknown: 0, total: 6 },
			repeat: { known: 5, unknown: 0, total: 6 },
			sham: { known: 5, unknown: 0, total: 6 },
		},
		verdict: 'open',
		noise: { least: 0, greatest: 0 },
		reversal: undefined,
		deciders: [{ role: 'treatment', unknown: 2 }],
	},
	{
		// No N; 1 <= 2. Cost 1 reaches 2 <= 2 or 1 <= 1; cost 2 reaches 3 <= 2. The repeat and sham arms hold no judgments and are not read.
		name: 'unadded holds',
		clause: { class: 'completion', relationship: 'unadded' },
		counts: {
			treatment: { known: 1, unknown: 0, total: 4 },
			base: { known: 2, unknown: 0, total: 4 },
			repeat: { known: 0, unknown: 0, total: 0 },
			sham: { known: 0, unknown: 0, total: 0 },
		},
		verdict: 'holds',
		noise: undefined,
		reversal: 2,
		deciders: [],
	},
	{
		// As the preceding row: unequal totals compare only the arms the clause reads, so these totals of 5 and 2 throw nothing.
		name: 'unadded ignores the totals of arms it does not read',
		clause: { class: 'completion', relationship: 'unadded' },
		counts: {
			treatment: { known: 1, unknown: 0, total: 4 },
			base: { known: 2, unknown: 0, total: 4 },
			repeat: { known: 0, unknown: 0, total: 5 },
			sham: { known: 0, unknown: 0, total: 2 },
		},
		verdict: 'holds',
		noise: undefined,
		reversal: 2,
		deciders: [],
	},
	{
		// Treatment 2 to 3 against 2: an unknown critical counts as possibly added.
		name: 'D, unadded open',
		clause: { class: 'completion', relationship: 'unadded' },
		counts: {
			treatment: { known: 2, unknown: 1, total: 3 },
			base: { known: 2, unknown: 0, total: 3 },
			repeat: { known: 0, unknown: 0, total: 0 },
			sham: { known: 0, unknown: 0, total: 0 },
		},
		verdict: 'open',
		noise: undefined,
		reversal: undefined,
		deciders: [{ role: 'treatment', unknown: 1 }],
	},
	{
		// 3 <= 2 is false. Cost 1: t 2 or base 3.
		name: 'unadded fails',
		clause: { class: 'completion', relationship: 'unadded' },
		counts: {
			treatment: { known: 3, unknown: 0, total: 3 },
			base: { known: 2, unknown: 0, total: 3 },
			repeat: { known: 0, unknown: 0, total: 0 },
			sham: { known: 0, unknown: 0, total: 0 },
		},
		verdict: 'fails',
		noise: undefined,
		reversal: 1,
		deciders: [],
	},
	{
		// The repeat arm holds no judgments, so N is unread and the gate is too.
		name: 'noninferior unread on an empty repeat arm',
		clause: { class: 'work', relationship: 'noninferior' },
		counts: {
			treatment: { known: 2, unknown: 0, total: 4 },
			base: { known: 2, unknown: 0, total: 4 },
			repeat: { known: 0, unknown: 0, total: 0 },
			sham: { known: 2, unknown: 0, total: 4 },
		},
		verdict: 'unread',
		noise: undefined,
		reversal: undefined,
		deciders: [],
	},
	{
		// The base arm holds no judgments, and an unread arm reads before the unequal totals would throw.
		name: 'unadded unread on an empty base arm',
		clause: { class: 'completion', relationship: 'unadded' },
		counts: {
			treatment: { known: 1, unknown: 0, total: 4 },
			base: { known: 0, unknown: 0, total: 0 },
			repeat: { known: 0, unknown: 0, total: 0 },
			sham: { known: 0, unknown: 0, total: 0 },
		},
		verdict: 'unread',
		noise: undefined,
		reversal: undefined,
		deciders: [],
	},
])

/**
 * Builds one arm's judgments from its table counts, with one foreign-class and one mechanical row a score must not read.
 * @param count - The arm's known and unknown counts and its class total
 * @param clause - The clause whose class and scored verdict the rows take
 * @returns The judgments the counts describe
 */
export function buildMemoryGateJudgments(
	count: MemoryGateCount,
	clause: MemoryGateClause,
): readonly StudyJudgment[] {
	const [scored, other]: readonly [MemoryLabelVerdict, MemoryLabelVerdict] =
		clause.class === 'work' ? ['achieved', 'unsuccessful'] : ['unsuccessful', 'achieved']
	const verdicts: readonly MemoryLabelVerdict[] = [
		...Array.from({ length: count.known }, () => scored),
		...Array.from({ length: count.unknown }, (): MemoryLabelVerdict => 'unknown'),
		...Array.from({ length: count.total - count.known - count.unknown }, () => other),
	]
	return [
		...verdicts.map((verdict, index): StudyJudgment => ({
			trial: 'trial',
			criterion: `ev-${String(index)}-${clause.class}`,
			verdict,
			method: 'model',
			reason: 'A fixture verdict',
			references: verdict === 'unknown' ? [] : ['fixture'],
		})),
		{
			trial: 'trial',
			criterion: 'ev-0-facts',
			verdict: scored,
			method: 'model',
			reason: 'A foreign class',
			references: ['fixture'],
		},
		{
			trial: 'trial',
			criterion: 'ev-0-receipt',
			verdict: scored,
			method: 'trace',
			reason: 'A mechanical row',
			references: ['fixture'],
		},
	]
}

/**
 * Builds a sealed value over the grading fixture's two trials and its real packet bytes.
 * @param criteria - The semantic criterion ids of the rubric. Default: one work and one completion criterion.
 * @returns The sealed value, its rubric and digest, and the segment a pool reads
 * @throws Error - Thrown when the rubric holds no semantic criterion
 */
export function buildMemoryLabelFixture(
	criteria: readonly string[] = ['goal-work', 'goal-completion'],
): MemoryLabelFixture {
	const grade = buildMemoryGradeFixture()
	const rubric: StudyRubric = {
		version: '1',
		criteria: criteria.map((id) =>
			buildMemoryCriterion(id, 'semantic', { criterion: `Fictional assertion of ${id}` }),
		),
	}
	const result: StudySealedResult = {
		status: 'sealed',
		directory: 'fixture',
		manifest: grade.manifest,
		attempts: grade.attempts,
		seal: { result: 'fixture-result', id: 'fixture-seal', files: [] },
	}
	const digest = hashStudyBytes('fixture rubric')
	const packet = buildStudyPacket(result, rubric, digest)
	if (packet === undefined) throw new Error('The rubric holds no semantic criterion')
	return {
		result,
		rubric,
		digest,
		segment: {
			result: result.seal.id,
			arm: 'full',
			packet: packet.content,
			mapping: packet.mapping,
		},
	}
}

/**
 * Builds inert links, one per listed class, numbered from row 1.
 * @param classes - Each row's class
 * @param arm - The arm every link names. Default: records.
 * @param first - The first link's row. Default: 1.
 * @returns The map, which holds no check
 */
export function buildMemoryLabelMap(
	classes: readonly MemoryLabelClass[],
	arm = 'records',
	first = 1,
): MemoryLabelMap {
	return {
		checks: [],
		links: classes.map((entry, index) => ({
			row: first + index,
			request: index,
			packet: 'a'.repeat(64),
			result: 'fixture-seal',
			arm,
			trial: `t-${String(first + index)}`,
			criterion: `c-${String(first + index)}`,
			source: { trial: `trial-${arm}`, criterion: `ev-${String(first + index)}-${entry}` },
			goal: `ev-${String(first + index)}`,
			class: entry,
		})),
	}
}

/**
 * Builds a lane's answers from its verdicts, numbered from row 1.
 * @param verdicts - Each row's verdict
 * @returns The answers, each with a reason
 */
export function buildMemoryLabelAnswers(
	verdicts: readonly MemoryLabelVerdict[],
): readonly MemoryLabelAnswer[] {
	return verdicts.map((verdict, index) => ({ row: index + 1, verdict, reason: 'A reason' }))
}

/**
 * Renders a fictional workflow journal in the line shape of a finished run's `journal.jsonl`.
 * @param nodes - The nodes it started, each with what it returned; an undefined result writes no `result` line
 * @returns The journal's text
 */
export function renderMemoryJournalFixture(nodes: readonly MemoryJournalNode[]): string {
	const lines = [
		{ type: 'launched' },
		...nodes.flatMap((node) => [
			{
				type: 'started',
				key: `v2:${node.agent}`,
				agentId: node.agent,
				label: node.label,
				phase: 'Label',
			},
			...(node.result === undefined
				? []
				: [
						{
							type: 'result',
							key: `v2:${node.agent}`,
							agentId: node.agent,
							result: node.result,
							toolsUsed: ['StructuredOutput'],
						},
					]),
		]),
	]
	return `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`
}

/**
 * Renders a fictional lane transcript in the line shape of a finished run's `agent-<id>.jsonl`; its request copy holds a tool name the audit must not read.
 * @param tools - The tool calls its assistant lines hold
 * @param start - The first line's timestamp
 * @param end - The last line's timestamp
 * @returns The transcript's text
 */
export function renderMemoryTranscriptFixture(
	tools: readonly string[],
	start: string,
	end: string,
): string {
	const lines = [
		{ type: 'user', timestamp: start, message: { role: 'user', content: 'A fictional prompt' } },
		{ type: 'api-request-shape', timestamp: start, shape: 'fictional' },
		{
			type: 'api-request-blob',
			message: { content: [{ type: 'tool_use', name: 'CopiedInRequest', input: {} }] },
		},
		...tools.map((name) => ({
			type: 'assistant',
			timestamp: start,
			message: { role: 'assistant', content: [{ type: 'tool_use', id: 'x', name, input: {} }] },
		})),
		{ type: 'assistant', timestamp: start, message: { content: [{ type: 'text', text: 'done' }] } },
		{ type: 'user', timestamp: end, message: { role: 'user', content: [{ type: 'tool_result' }] } },
	]
	return `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`
}

/** Lists the rubric classes in their reading order. */
export const MEMORY_LABEL_CLASSES: readonly MemoryLabelClass[] = Object.freeze([
	'work',
	'completion',
	'facts',
	'obligations',
])
/** Lists the verdicts a labeler answers. */
export const MEMORY_LABEL_VERDICTS: readonly MemoryLabelVerdict[] = Object.freeze([
	'achieved',
	'unsuccessful',
	'unknown',
])
/** Lists a gate's roles in their reading order. */
export const MEMORY_GATE_ROLES: readonly MemoryGateRole[] = Object.freeze([
	'treatment',
	'base',
	'repeat',
	'sham',
])
/** Holds a labeling node's answer schema; the `reason` pattern refuses a blank reason at the tool call. */
export const MEMORY_LABEL_SCHEMA = Object.freeze({
	type: 'object',
	properties: {
		rows: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					row: { type: 'integer' },
					verdict: { type: 'string', enum: ['achieved', 'unsuccessful', 'unknown'] },
					reason: { type: 'string', pattern: '\\S' },
					revealed: { type: 'boolean' },
				},
				required: ['row', 'verdict', 'reason'],
			},
		},
	},
	required: ['rows'],
})
/** Holds the first node's answer schema. */
export const MEMORY_LABEL_HARNESS_SCHEMA = Object.freeze({
	type: 'object',
	properties: {
		tools: { type: 'array', items: { type: 'string' } },
		context: { type: 'array', items: { type: 'string' } },
	},
	required: ['tools', 'context'],
})

/** Checks whether a value is one row a lane returned. */
export const isMemoryLabelAnswer: Guard<MemoryLabelAnswer> = objectOf(
	{
		row: isInteger,
		verdict: literalOf('achieved', 'unsuccessful', 'unknown'),
		reason: isString,
		revealed: isBoolean,
	},
	['revealed'],
)
/** Checks whether a value is the first node's report. */
export const isMemoryHarnessReport: Guard<MemoryHarnessReport> = objectOf({
	tools: arrayOf(isString),
	context: arrayOf(isString),
})
/** Checks whether a value holds a retained packet's entries. */
export const isMemoryPacket = objectOf({
	entries: arrayOf(
		objectOf(
			{
				trial: isString,
				criterion: isString,
				input: isJSONValue,
				product: isJSONValue,
				assertion: isJSONValue,
			},
			['product'],
		),
	),
})
/** Checks whether a value holds a retained mapping's result and links. */
export const isMemoryMapping = objectOf({
	result: isString,
	entries: arrayOf(
		objectOf({
			trial: isString,
			criterion: isString,
			source: objectOf({ trial: isString, criterion: isString }),
		}),
	),
})
/** Checks whether a value is what a pool wrapper keeps for its gate wrapper. */
export const isMemoryLabelPlan: Guard<MemoryLabelPlan> = objectOf({
	pool: objectOf({
		requests: arrayOf(
			objectOf({
				rows: arrayOf(
					objectOf(
						{ row: isInteger, input: isJSONValue, product: isJSONValue, assertion: isJSONValue },
						['product'],
					),
				),
			}),
		),
		map: objectOf({
			links: arrayOf(
				objectOf({
					row: isInteger,
					request: isInteger,
					packet: isString,
					result: isString,
					arm: isString,
					trial: isString,
					criterion: isString,
					source: objectOf({ trial: isString, criterion: isString }),
					goal: isString,
					class: literalOf('work', 'completion', 'facts', 'obligations'),
				}),
			),
			checks: arrayOf(
				objectOf({
					row: isInteger,
					request: isInteger,
					verdict: literalOf('achieved', 'unsuccessful', 'unknown'),
				}),
			),
		}),
	}),
	nodes: arrayOf(
		objectOf({
			label: isString,
			request: isInteger,
			engine: isString,
			condition: literalOf('plain', 'receipts'),
			characters: isInteger,
		}),
	),
})

/**
 * Parses the plan a pool wrapper kept.
 * @param text - The plan file's text
 * @returns The plan, or undefined when the text is not JSON or holds another shape
 */
export function parseMemoryLabelPlan(text: string): MemoryLabelPlan | undefined {
	return parseJSONAs(text, isMemoryLabelPlan)
}

/**
 * Parses a criterion id's rubric class from its suffix.
 * @param criterion - The criterion id
 * @returns The class, or undefined when the id holds none
 */
export function parseMemoryLabelClass(criterion: string): MemoryLabelClass | undefined {
	return MEMORY_LABEL_CLASSES.find((entry) => criterion.endsWith(`-${entry}`))
}

/**
 * Computes the rank that orders one pooled key under one order.
 * @param order - The order the rank moves with
 * @param key - The pooled key
 * @returns The rank's digest
 */
export function computeMemoryLabelRank(order: string, key: string): string {
	return hashStudyBytes(`${order}\n${key}`)
}

/**
 * Collects a segment's packet entries with their identities, refusing a mapping that does not cover its packet.
 * @param segment - The segment's retained bytes
 * @returns Each entry's group, row text, and link
 * @throws Error - Thrown when the bytes are malformed, the mapping names another result or does not cover the packet, or a criterion holds no class
 */
export function collectMemoryLabelMembers(
	segment: MemoryLabelSegment,
): readonly MemoryLabelMember[] {
	const decoder = new TextDecoder()
	const packet = parseJSON(decoder.decode(segment.packet))
	const mapping = parseJSON(decoder.decode(segment.mapping))
	if (!isMemoryPacket(packet)) throw new Error(`The packet of ${segment.result} is malformed`)
	if (!isMemoryMapping(mapping)) throw new Error(`The mapping of ${segment.result} is malformed`)
	if (mapping.result !== segment.result)
		throw new Error(`The mapping names ${mapping.result}, and its segment holds ${segment.result}`)
	if (mapping.entries.length !== packet.entries.length)
		throw new Error(`The mapping of ${segment.result} does not cover its packet`)
	const digest = hashStudyBytes(segment.packet)
	return packet.entries.map((entry): MemoryLabelMember => {
		const source = mapping.entries.find(
			(link) => link.trial === entry.trial && link.criterion === entry.criterion,
		)?.source
		if (source === undefined)
			throw new Error(`The mapping of ${segment.result} does not cover its packet`)
		const criterionClass = parseMemoryLabelClass(source.criterion)
		if (criterionClass === undefined)
			throw new Error(`Criterion ${source.criterion} holds no rubric class`)
		const goal = source.criterion.slice(0, -(criterionClass.length + 1))
		return {
			group: `${segment.arm}/${segment.result}/${source.trial}/${goal}`,
			text: {
				input: entry.input,
				...(entry.product === undefined ? {} : { product: entry.product }),
				assertion: entry.assertion,
			},
			link: {
				packet: digest,
				result: segment.result,
				arm: segment.arm,
				trial: entry.trial,
				criterion: entry.criterion,
				source,
				goal,
				class: criterionClass,
			},
		}
	})
}

/**
 * Pools sealed packets into one request per goal-arm under neutral row numbers, every identity in a separate map.
 * @param segments - Each segment's retained packet and mapping bytes
 * @param order - The text the pool's order repeats for and moves with
 * @param controls - The authored rows to seat among the requests, marked in the map alone
 * @returns The requests and their map
 * @throws Error - Thrown when a control holds no request to join, or a segment refuses per its members
 */
export function buildMemoryLabelPool(
	segments: readonly MemoryLabelSegment[],
	order: string,
	controls: readonly MemoryLabelControl[],
): MemoryLabelPool {
	const members = segments.flatMap((segment) => collectMemoryLabelMembers(segment))
	const groups = [...new Set(members.map((member) => member.group))]
		.map((group) => ({ group, rank: computeMemoryLabelRank(order, group) }))
		.toSorted((left, right) => (left.rank < right.rank ? -1 : 1))
		.map((entry) => entry.group)
	if (groups.length === 0 && controls.length > 0)
		throw new Error('A control holds no request to join')
	const seats: readonly MemoryLabelSeat[] = [
		...members.map((member) => ({
			rank: computeMemoryLabelRank(
				order,
				`${member.group}/${member.link.trial}/${member.link.criterion}`,
			),
			request: groups.indexOf(member.group),
			text: member.text,
			link: member.link,
		})),
		...controls.map((control, index) => {
			const rank = computeMemoryLabelRank(order, `control/${String(index)}`)
			return {
				rank,
				request: Number.parseInt(rank.slice(0, 8), 16) % groups.length,
				text: { input: control.input, product: control.product, assertion: control.assertion },
				verdict: control.verdict,
			}
		}),
	]
	const numbered = seats
		.toSorted((left, right) =>
			left.request === right.request
				? left.rank < right.rank
					? -1
					: 1
				: left.request - right.request,
		)
		.map((seat, index) => ({ ...seat, row: index + 1 }))
	const seated = numbered.flatMap((seat) =>
		seat.link === undefined ? [] : [{ ...seat.link, row: seat.row, request: seat.request }],
	)
	return {
		requests: groups.map((_, request) => ({
			rows: numbered
				.filter((seat) => seat.request === request)
				.map((seat) => ({ row: seat.row, ...seat.text })),
		})),
		map: {
			links: seated,
			checks: numbered.flatMap((seat) =>
				seat.verdict === undefined
					? []
					: [{ row: seat.row, request: seat.request, verdict: seat.verdict }],
			),
		},
	}
}

/**
 * Renders a request's rows as JSON-encoded data under the instruction.
 * @param request - The rows one lane labels
 * @param instruction - The fixed instruction
 * @param receipts - One goal-arm's public evidence rows, for the pilot's comparison
 * @returns The prompt, each row and receipt on its own line
 */
export function buildMemoryLabelPrompt(
	request: MemoryLabelRequest,
	instruction: string,
	receipts?: readonly MemoryLabelReceipt[],
): string {
	return [
		instruction.trim(),
		'',
		'Rows, one JSON value per line:',
		...request.rows.map((row) => JSON.stringify(row)),
		...(receipts === undefined
			? []
			: [
					'',
					'Evidence the run recorded for these rows, one JSON value per line:',
					...receipts.map((receipt) => JSON.stringify(receipt)),
				]),
	].join('\n')
}

/**
 * Filters a trial's evidence to one goal's receipts, leaving out the rows that carry whole requests and state.
 * @param evidence - The trial's evidence rows
 * @param goal - The goal id
 * @returns The goal's receipts, without their goal id
 */
export function filterMemoryReceipts(
	evidence: readonly StudyEvidence[],
	goal: string,
): readonly MemoryLabelReceipt[] {
	return evidence
		.filter((entry) => entry.goal === goal && MEMORY_LABEL_RECEIPTS.includes(entry.event))
		.map((entry) => ({ event: entry.event, value: entry.value }))
}

/**
 * Collects a lane's answered rows by row number, leaving out a blank reason, which Study's parser refuses.
 * @param rows - The rows the lane returned
 * @returns Each usable answer under its row
 */
export function collectMemoryLabelAnswers(
	rows: readonly MemoryLabelAnswer[],
): ReadonlyMap<number, MemoryLabelAnswer> {
	return new Map(
		rows
			.filter((entry) => entry.reason.trim().length > 0)
			.map((entry): readonly [number, MemoryLabelAnswer] => [entry.row, entry]),
	)
}

/**
 * Builds one labels file per packet from each lane's rows, settling agreement, dispute, and a third lane's answer.
 * @param map - The pool's map
 * @param lanes - One or two labeling lanes
 * @param options - The file fields and the lane that settles disputes
 * @returns The files, with the omitted rows, the disputes, and each lane's missed controls
 * @throws Error - Thrown on no lane or more than two, a row outside the map, a repeated row, or a third-lane row holding no dispute
 */
export function buildMemoryLabels(
	map: MemoryLabelMap,
	lanes: readonly MemoryLabelLane[],
	options: MemoryLabelOptions,
): MemoryLabelImport {
	if (lanes.length === 0 || lanes.length > 2)
		throw new Error(`An import takes one or two lanes, and it holds ${String(lanes.length)}`)
	const everyLane = [...lanes, ...(options.third === undefined ? [] : [options.third])]
	const known = new Set([...map.links, ...map.checks].map((entry) => entry.row))
	for (const lane of everyLane) {
		const foreign = lane.rows.find((entry) => !known.has(entry.row))
		if (foreign !== undefined) throw new Error(`Row ${String(foreign.row)} is outside the map`)
		const repeated = lane.rows.find(
			(entry, index) => lane.rows.findIndex((other) => other.row === entry.row) !== index,
		)
		if (repeated !== undefined) throw new Error(`A lane repeats row ${String(repeated.row)}`)
	}
	const answers = lanes.map((lane) => collectMemoryLabelAnswers(lane.rows))
	const disputes = map.links
		.filter((link) => {
			const held = answers.map((entry) => entry.get(link.row))
			return !held.includes(undefined) && new Set(held.map((entry) => entry?.verdict)).size > 1
		})
		.map((link) => link.row)
	const late = options.third?.rows.find((entry) => !disputes.includes(entry.row))
	if (late !== undefined) throw new Error(`Row ${String(late.row)} holds no dispute to settle`)
	const third = collectMemoryLabelAnswers(options.third?.rows ?? [])
	const settled = map.links.flatMap((link) => {
		const held = answers.map((entry) => entry.get(link.row))
		const [first] = held
		if (first === undefined || held.includes(undefined)) return []
		const answer: Pick<MemoryLabelAnswer, 'verdict' | 'reason'> = disputes.includes(link.row)
			? (third.get(link.row) ?? { verdict: 'unknown', reason: MEMORY_LABEL_DISPUTE })
			: first
		const judgment: StudyJudgment = {
			trial: link.trial,
			criterion: link.criterion,
			verdict: answer.verdict,
			method: 'model',
			reason: answer.reason,
			references: answer.verdict === 'unknown' ? [] : [link.packet],
		}
		return [{ packet: link.packet, judgment }]
	})
	const names = everyLane.map((lane) => lane.labeler).join('+')
	return {
		labels: [...new Set(map.links.map((link) => link.packet))].map((packet) => ({
			packet,
			labeler: lanes.length === 1 ? `${names} single-labeled` : names,
			version: options.version,
			created: options.created,
			usage: [],
			judgments: settled.filter((entry) => entry.packet === packet).map((entry) => entry.judgment),
		})),
		omitted: answers.flatMap((entry) => map.links.filter((link) => !entry.has(link.row))).length,
		disputes,
		missed: answers.map(
			(entry) =>
				map.checks.filter((check) => entry.get(check.row)?.verdict !== check.verdict).length,
		),
	}
}

/**
 * Compares two lanes per class over the rows both answered, with controls aside.
 * @param left - The first lane's rows
 * @param right - The second lane's rows
 * @param map - The pool's map
 * @returns The agreement of each class that holds a shared row
 */
export function compareMemoryLabels(
	left: readonly MemoryLabelAnswer[],
	right: readonly MemoryLabelAnswer[],
	map: MemoryLabelMap,
): readonly MemoryLabelAgreement[] {
	const lefts = collectMemoryLabelAnswers(left)
	const rights = collectMemoryLabelAnswers(right)
	return MEMORY_LABEL_CLASSES.flatMap((entry) => {
		const pairs = map.links
			.filter((link) => link.class === entry)
			.flatMap((link) => {
				const one = lefts.get(link.row)?.verdict
				const two = rights.get(link.row)?.verdict
				return one === undefined || two === undefined ? [] : [{ one, two }]
			})
		if (pairs.length === 0) return []
		const count = pairs.length
		const agreement = pairs.filter((pair) => pair.one === pair.two).length / count
		const chance = MEMORY_LABEL_VERDICTS.reduce(
			(sum, verdict) =>
				sum +
				(pairs.filter((pair) => pair.one === verdict).length / count) *
					(pairs.filter((pair) => pair.two === verdict).length / count),
			0,
		)
		const either = pairs.filter((pair) => pair.one === 'achieved' || pair.two === 'achieved')
		const both = either.filter((pair) => pair.one === pair.two)
		return [
			{
				class: entry,
				count,
				agreement,
				kappa: chance === 1 ? undefined : (agreement - chance) / (1 - chance),
				overlap: either.length === 0 ? undefined : both.length / either.length,
			},
		]
	})
}

/**
 * Builds one value per gate role.
 * @param read - Reads a role's value
 * @returns The record of each role's value
 */
export function buildMemoryGateRoles<T>(
	read: (role: MemoryGateRole) => T,
): Readonly<Record<MemoryGateRole, T>> {
	return {
		treatment: read('treatment'),
		base: read('base'),
		repeat: read('repeat'),
		sham: read('sham'),
	}
}

/**
 * Lists the roles a relationship reads.
 * @param relationship - The clause's relationship
 * @returns The roles whose arms the clause reads; `unadded` reads no noise arm
 */
export function listMemoryGateRoles(
	relationship: MemoryGateRelationship,
): readonly MemoryGateRole[] {
	return relationship === 'unadded' ? ['treatment', 'base'] : MEMORY_GATE_ROLES
}

/**
 * Computes N from one assignment of the scores: twice the larger distance of `repeat` and `sham` from `base`.
 * @param score - The assignment
 * @returns The noise at that assignment
 */
export function computeMemoryGateNoise(score: MemoryGateScore): number {
	return 2 * Math.max(Math.abs(score.repeat - score.base), Math.abs(score.sham - score.base))
}

/**
 * Checks whether a relationship holds at one assignment of the scores.
 * @param relationship - The clause's relationship
 * @param score - The assignment
 * @returns True if the relationship holds there; false otherwise
 */
export function matchesMemoryGate(
	relationship: MemoryGateRelationship,
	score: MemoryGateScore,
): boolean {
	const noise = computeMemoryGateNoise(score)
	if (relationship === 'noninferior') return score.treatment >= score.base - noise
	if (relationship === 'improves') return score.treatment > score.base + noise
	if (relationship === 'falls') return score.treatment < score.base - noise
	return score.treatment <= score.base
}

/**
 * Builds the integers of one inclusive range.
 * @param least - The lowest integer
 * @param most - The highest integer
 * @returns The integers in order
 */
export function buildMemoryGateRange(least: number, most: number): readonly number[] {
	return Array.from({ length: most - least + 1 }, (_, index) => least + index)
}

/**
 * Lists every integer assignment inside a box lazily, because a reversal search walks far more points than it keeps.
 * @param least - Each role's lowest score
 * @param most - Each role's highest score
 * @yields Each assignment
 */
export function* listMemoryGateScores(
	least: MemoryGateScore,
	most: MemoryGateScore,
): Generator<MemoryGateScore> {
	for (const treatment of buildMemoryGateRange(least.treatment, most.treatment))
		for (const base of buildMemoryGateRange(least.base, most.base))
			for (const repeat of buildMemoryGateRange(least.repeat, most.repeat))
				for (const sham of buildMemoryGateRange(least.sham, most.sham))
					yield { treatment, base, repeat, sham }
}

/**
 * Computes a clause's verdict, N's range, and its reversal over every assignment of the unknowns, with N following its own arms.
 * @param arms - Each role's judgments under source ids, read by class from the criterion id
 * @param clause - The clause to read
 * @returns The outcome
 * @throws Error - Thrown when the arms the clause reads hold unequal class totals
 */
export function computeMemoryGate(
	arms: MemoryGatePopulation,
	clause: MemoryGateClause,
): MemoryGateOutcome {
	const scored: MemoryLabelVerdict = clause.class === 'work' ? 'achieved' : 'unsuccessful'
	const counts = buildMemoryGateRoles((role): MemoryGateCount => {
		const held = arms[role].filter(
			(entry) => parseMemoryLabelClass(entry.criterion) === clause.class,
		)
		return {
			known: held.filter((entry) => entry.verdict === scored).length,
			unknown: held.filter((entry) => entry.verdict === 'unknown').length,
			total: held.length,
		}
	})
	const read = listMemoryGateRoles(clause.relationship)
	if (read.some((role) => counts[role].total === 0))
		return { verdict: 'unread', counts, noise: undefined, reversal: undefined, deciders: [] }
	if (new Set(read.map((role) => counts[role].total)).size > 1)
		throw new Error(
			`The read arms hold unequal class totals: ${read.map((role) => `${role} ${String(counts[role].total)}`).join(', ')}`,
		)
	const least = buildMemoryGateRoles((role) => (read.includes(role) ? counts[role].known : 0))
	const most = buildMemoryGateRoles((role) =>
		read.includes(role) ? counts[role].known + counts[role].unknown : 0,
	)
	const holds = listMemoryGateScores(least, most).some((score) =>
		matchesMemoryGate(clause.relationship, score),
	)
	const fails = listMemoryGateScores(least, most).some(
		(score) => !matchesMemoryGate(clause.relationship, score),
	)
	const noise =
		clause.relationship === 'unadded'
			? undefined
			: {
					least: listMemoryGateScores(least, most).reduce(
						(found, score) => Math.min(found, computeMemoryGateNoise(score)),
						Number.POSITIVE_INFINITY,
					),
					greatest: listMemoryGateScores(least, most).reduce(
						(found, score) => Math.max(found, computeMemoryGateNoise(score)),
						0,
					),
				}
	if (holds && fails)
		return {
			verdict: 'open',
			counts,
			noise,
			reversal: undefined,
			deciders: read
				.filter(
					(role) =>
						counts[role].unknown > 0 &&
						listMemoryGateScores(least, most).some(
							(score) =>
								matchesMemoryGate(clause.relationship, score) !==
								matchesMemoryGate(clause.relationship, { ...score, [role]: least[role] }),
						),
				)
				.map((role) => ({ role, unknown: counts[role].unknown })),
		}
	const zero = buildMemoryGateRoles(() => 0)
	const limit = buildMemoryGateRoles((role) => (read.includes(role) ? counts[role].total : 0))
	return {
		verdict: holds ? 'holds' : 'fails',
		counts,
		noise,
		reversal: listMemoryGateScores(zero, limit)
			.filter((score) => matchesMemoryGate(clause.relationship, score) !== holds)
			.reduce(
				(found, score) =>
					Math.min(
						found,
						read.reduce(
							(sum, role) => sum + Math.max(0, least[role] - score[role], score[role] - most[role]),
							0,
						),
					),
				Number.POSITIVE_INFINITY,
			),
		deciders: [],
	}
}

/**
 * Collects a pool's judgments by their packet and neutral ids.
 * @param labels - The pool's labels files
 * @returns Each judgment under its key
 */
export function collectMemoryLabelJudgments(
	labels: readonly StudyLabels[],
): ReadonlyMap<string, StudyJudgment> {
	return new Map(
		labels.flatMap((file) =>
			file.judgments.map((judgment): readonly [string, StudyJudgment] => [
				`${file.packet}/${judgment.trial}/${judgment.criterion}`,
				judgment,
			]),
		),
	)
}

/**
 * Builds each role's judgments under source ids from a pool's labels; a row no file holds reads `unknown`.
 * @param map - The pool's map
 * @param labels - The pool's labels files
 * @param assignment - The arm each role reads
 * @returns The population a gate reads
 */
export function buildMemoryGatePopulation(
	map: MemoryLabelMap,
	labels: readonly StudyLabels[],
	assignment: MemoryGateAssignment,
): MemoryGatePopulation {
	const judgments = collectMemoryLabelJudgments(labels)
	return buildMemoryGateRoles((role) =>
		map.links
			.filter((link) => link.arm === assignment[role])
			.map((link): StudyJudgment => {
				const judgment = judgments.get(`${link.packet}/${link.trial}/${link.criterion}`)
				return {
					trial: link.source.trial,
					criterion: link.source.criterion,
					verdict: judgment?.verdict ?? 'unknown',
					method: 'model',
					reason: judgment?.reason ?? MEMORY_LABEL_ABSENT,
					references: judgment?.references ?? [],
				}
			}),
	)
}

/**
 * Collects the disputed rows a third lane can settle a gate with: those in the class and arm of an open clause's deciders.
 * @param map - The pool's map
 * @param disputes - The disputed rows
 * @param results - Each clause with its outcome
 * @param assignment - The arm each role reads
 * @returns The rows, in dispute order
 */
export function collectMemoryThirdRows(
	map: MemoryLabelMap,
	disputes: readonly number[],
	results: readonly MemoryGateResult[],
	assignment: MemoryGateAssignment,
): readonly number[] {
	return disputes.filter((row) => {
		const link = map.links.find((entry) => entry.row === row)
		return results.some(
			({ clause, outcome }) =>
				link?.class === clause.class &&
				outcome.deciders.some((decider) => assignment[decider.role] === link.arm),
		)
	})
}

/**
 * Collects the rows a spot check reads: scored rows of a clause's class and arms first, then that class and those arms, then the rest.
 * @param map - The pool's map
 * @param labels - The pool's labels files
 * @param clauses - The gate's clauses
 * @param assignment - The arm each role reads
 * @param count - The most rows to draw
 * @returns The rows, deciding rows first
 */
export function collectMemorySpotRows(
	map: MemoryLabelMap,
	labels: readonly StudyLabels[],
	clauses: readonly MemoryGateClause[],
	assignment: MemoryGateAssignment,
	count: number,
): readonly number[] {
	const judgments = collectMemoryLabelJudgments(labels)
	return map.links
		.map((link) => {
			const read = clauses.filter(
				(clause) =>
					clause.class === link.class &&
					listMemoryGateRoles(clause.relationship).some((role) => assignment[role] === link.arm),
			)
			const verdict = judgments.get(`${link.packet}/${link.trial}/${link.criterion}`)?.verdict
			const scored = read.some(
				(clause) => verdict === (clause.class === 'work' ? 'achieved' : 'unsuccessful'),
			)
			return { row: link.row, rank: scored ? 0 : read.length > 0 ? 1 : 2 }
		})
		.toSorted((left, right) => left.rank - right.rank || left.row - right.row)
		.slice(0, count)
		.map((entry) => entry.row)
}

/**
 * Parses a gate's clause list from its command text, in the form `work:noninferior,completion:unadded`.
 * @param text - The command text
 * @returns The clauses, or undefined when an entry names no known class and relationship
 */
export function parseMemoryGateClauses(text: string): readonly MemoryGateClause[] | undefined {
	const entries = text.split(',')
	const clauses = entries.flatMap((entry): readonly MemoryGateClause[] => {
		const [name, relationship] = entry.split(':')
		return (name === 'work' || name === 'completion') &&
			(relationship === 'noninferior' ||
				relationship === 'improves' ||
				relationship === 'falls' ||
				relationship === 'unadded')
			? [{ class: name, relationship }]
			: []
	})
	return clauses.length === entries.length ? clauses : undefined
}

/**
 * Parses a gate's role assignment from its command text, in the form `treatment=on,base=off,repeat=again,sham=shuffled`.
 * @param text - The command text
 * @returns The assignment, or undefined when a role holds no arm
 */
export function parseMemoryGateAssignment(text: string): MemoryGateAssignment | undefined {
	const found = new Map(
		text.split(',').map((entry): readonly [string, string] => {
			const [role, arm] = entry.split('=')
			return [role ?? '', arm ?? '']
		}),
	)
	return MEMORY_GATE_ROLES.every((role) => (found.get(role) ?? '') !== '')
		? buildMemoryGateRoles((role) => found.get(role) ?? '')
		: undefined
}

/**
 * Builds one neutral node per request per engine per condition; `receipts` adds the second condition.
 * @param requests - The pool's requests
 * @param engines - Each lane's model alias
 * @param instruction - The fixed instruction
 * @param receipts - Each request's public evidence rows, by request index
 * @returns The nodes, each holding its prompt
 */
export function buildMemoryLabelNodes(
	requests: readonly MemoryLabelRequest[],
	engines: readonly string[],
	instruction: string,
	receipts?: ReadonlyArray<readonly MemoryLabelReceipt[]>,
): readonly MemoryLabelNode[] {
	const conditions: readonly MemoryLabelCondition[] =
		receipts === undefined ? ['plain'] : ['plain', 'receipts']
	return conditions
		.flatMap((condition) =>
			engines.flatMap((engine) =>
				requests.map((request, index) => ({
					request: index,
					engine,
					condition,
					prompt: buildMemoryLabelPrompt(
						request,
						instruction,
						condition === 'plain' ? undefined : (receipts?.[index] ?? []),
					),
				})),
			),
		)
		.map((node, index) => ({
			...node,
			label: `node-${String(index + 1)}`,
			characters: node.prompt.length,
		}))
}

/**
 * Renders a labeling workflow script, prompts as JSON string literals: one node with no packet text, then one fresh node per entry, returning counts alone.
 * @param gate - The gate's name
 * @param nodes - The labeling nodes
 * @returns The script's text
 */
export function renderMemoryLabelScript(gate: string, nodes: readonly MemoryLabelNode[]): string {
	return [
		`export const meta = { name: ${JSON.stringify(`rc-s3-${gate}`)}, description: "Labels one gate's rows in fresh nodes and returns counts", phases: [{ title: "Harness" }, { title: "Label" }] }`,
		`const schema = ${JSON.stringify(MEMORY_LABEL_SCHEMA)}`,
		`const nodes = [`,
		...nodes.map(
			(node) =>
				`${JSON.stringify({ label: node.label, model: node.engine, prompt: node.prompt })},`,
		),
		`]`,
		`phase("Harness")`,
		`const harness = await agent(${JSON.stringify(MEMORY_LABEL_HARNESS)}, { label: ${JSON.stringify(MEMORY_LABEL_HARNESS_NODE)}, phase: "Harness", model: ${JSON.stringify(nodes[0]?.engine)}, effort: ${JSON.stringify(MEMORY_LABEL_EFFORT)}, schema: ${JSON.stringify(MEMORY_LABEL_HARNESS_SCHEMA)} })`,
		`phase("Label")`,
		`const returned = await parallel(nodes.map((node) => () => agent(node.prompt, { label: node.label, phase: "Label", model: node.model, effort: ${JSON.stringify(MEMORY_LABEL_EFFORT)}, schema })))`,
		`return { harness: harness === null ? 0 : 1, requests: nodes.length, answers: returned.filter((entry) => entry !== null && Array.isArray(entry.rows)).length }`,
		'',
	].join('\n')
}

/**
 * Reads a workflow journal's started nodes, each with its latest return value.
 * @param text - The journal's text
 * @returns The nodes and the count of `started` and `result` lines
 * @throws Error - Thrown when a line is not a journal line
 */
export function readMemoryJournal(text: string): MemoryJournal {
	const lines = text
		.split('\n')
		.filter((line) => line.trim().length > 0)
		.map((line, index) => {
			const parsed = parseJSON(line)
			if (!isRecord(parsed) || !isString(parsed.type))
				throw new Error(`The journal holds an unreadable line ${String(index + 1)}`)
			return parsed
		})
	const named = lines.flatMap((line) =>
		isString(line.agentId) ? [{ type: line.type, id: line.agentId, line }] : [],
	)
	const results = new Map(
		named
			.filter((entry) => entry.type === 'result')
			.map((entry): readonly [string, unknown] => [entry.id, entry.line.result]),
	)
	const labels = new Map(
		named
			.filter((entry) => entry.type === 'started')
			.map((entry): readonly [string, string] => [
				entry.id,
				isString(entry.line.label) ? entry.line.label : '',
			]),
	)
	return {
		entries: lines.filter((line) => line.type === 'started' || line.type === 'result').length,
		nodes: [...labels].map(([id, label]) => ({ agent: id, label, result: results.get(id) })),
	}
}

/**
 * Extracts the first node's report from a journal, the one return it can print, because that node holds no packet text.
 * @param journal - The run's journal
 * @returns The report, or undefined when the journal holds no such node or it returned another shape
 */
export function extractMemoryHarness(journal: MemoryJournal): MemoryHarnessReport | undefined {
	const result = journal.nodes.findLast((node) => node.label === MEMORY_LABEL_HARNESS_NODE)?.result
	return isMemoryHarnessReport(result) ? result : undefined
}

/**
 * Reads a lane transcript's own tool calls and wall, ignoring the request copies its other lines hold.
 * @param text - The transcript's text
 * @returns The tool calls by name, and the milliseconds between its first and last stamped lines
 * @throws Error - Thrown when a line is not JSON
 */
export function readMemoryTranscript(text: string): MemoryTranscriptResult {
	const lines = text
		.split('\n')
		.filter((line) => line.trim().length > 0)
		.map((line, index) => {
			const parsed = parseJSON(line)
			if (parsed === undefined)
				throw new Error(`The transcript holds an unreadable line ${String(index + 1)}`)
			return parsed
		})
	const stamps = lines.flatMap((line) =>
		isRecord(line) && isString(line.timestamp) ? [Date.parse(line.timestamp)] : [],
	)
	const first = stamps.at(0)
	const last = stamps.at(-1)
	return {
		tools: lines.flatMap((line) =>
			isRecord(line) &&
			line.type === 'assistant' &&
			isRecord(line.message) &&
			isArray(line.message.content)
				? line.message.content.flatMap((block: unknown) =>
						isRecord(block) && block.type === 'tool_use' && isString(block.name)
							? [block.name]
							: [],
					)
				: [],
		),
		wall: first === undefined || last === undefined ? undefined : last - first,
	}
}

/**
 * Builds what a labeling run returned: a lane that called another tool or holds no transcript is discarded, one with no `rows` member is unread, and an answer for a row the node's own request does not show is dropped and counted.
 * @param nodes - The labeling nodes, prompts aside
 * @param journal - The run's journal
 * @param transcripts - Each started node's transcript result, by agent id
 * @param requests - The requests the nodes index
 * @returns The kept reads and the counts of the rest
 */
export function buildMemoryLabelRun(
	nodes: ReadonlyArray<Omit<MemoryLabelNode, 'prompt'>>,
	journal: MemoryJournal,
	transcripts: ReadonlyMap<string, MemoryTranscriptResult>,
	requests: readonly MemoryLabelRequest[],
): MemoryLabelRun {
	const labels = new Set(nodes.map((node) => node.label))
	const found = nodes.flatMap((node) => {
		const entry = journal.nodes.findLast((other) => other.label === node.label)
		return entry === undefined ? [] : [{ node, entry, transcript: transcripts.get(entry.agent) }]
	})
	const kept = found.filter(
		({ transcript }) =>
			transcript !== undefined && transcript.tools.every((name) => name === 'StructuredOutput'),
	)
	const returned = kept.flatMap(({ node, entry, transcript }) =>
		isRecord(entry.result) && isArray(entry.result.rows)
			? [
					{
						node,
						answers: entry.result.rows.filter(isMemoryLabelAnswer),
						wall: transcript?.wall,
					},
				]
			: [],
	)
	const reads = returned.map((read) => ({
		...read,
		answers: read.answers.filter(
			(answer) => requests[read.node.request]?.rows.some((row) => row.row === answer.row) === true,
		),
	}))
	return {
		reads,
		unread: nodes.length - found.length + kept.length - reads.length,
		discarded: found.length - kept.length,
		foreign: journal.nodes.filter((entry) => !labels.has(entry.label)).length,
		strayed:
			returned.flatMap((read) => read.answers).length -
			reads.flatMap((read) => read.answers).length,
	}
}

/**
 * Builds one lane per engine from a run's kept rows of one condition.
 * @param run - The labeling run
 * @param condition - The condition to read
 * @returns Each engine's lane, in the run's order
 */
export function buildMemoryLabelLanes(
	run: MemoryLabelRun,
	condition: MemoryLabelCondition,
): readonly MemoryLabelLane[] {
	const reads = run.reads.filter((read) => read.node.condition === condition)
	return [...new Set(reads.map((read) => read.node.engine))].map((labeler) => ({
		labeler,
		rows: reads.filter((read) => read.node.engine === labeler).flatMap((read) => read.answers),
	}))
}

/**
 * Computes the least, median, and greatest of a set of readings.
 * @param values - The readings
 * @returns The spread, or undefined with no reading
 */
export function computeMemorySpread(values: readonly number[]): MemorySpread | undefined {
	const sorted = values.toSorted((left, right) => left - right)
	const middle = Math.floor(sorted.length / 2)
	const least = sorted.at(0)
	const greatest = sorted.at(-1)
	const upper = sorted.at(middle)
	const lower = sorted.at(middle - 1)
	if (least === undefined || greatest === undefined || upper === undefined || lower === undefined)
		return undefined
	return { least, median: sorted.length % 2 === 0 ? (lower + upper) / 2 : upper, greatest }
}

/**
 * Computes one engine's pilot result: the plain nodes' wall per goal-arm beside the text it was read on, and per class the achieved rows and the verdicts the receipts change.
 * @param map - The pool's map
 * @param requests - The pool's requests
 * @param run - The labeling run
 * @param engine - The engine to read
 * @returns The result
 */
export function computeMemoryPilot(
	map: MemoryLabelMap,
	requests: readonly MemoryLabelRequest[],
	run: MemoryLabelRun,
	engine: string,
): MemoryPilotResult {
	const held = run.reads.filter((read) => read.node.engine === engine)
	const plain = held.filter((read) => read.node.condition === 'plain')
	const answers = collectMemoryLabelAnswers(plain.flatMap((read) => read.answers))
	const receipts = collectMemoryLabelAnswers(
		held.filter((read) => read.node.condition === 'receipts').flatMap((read) => read.answers),
	)
	const sizes = new Map(
		requests.flatMap((request) =>
			request.rows.map((row): readonly [number, number] => [row.row, JSON.stringify(row).length]),
		),
	)
	const timed = plain.flatMap(({ node, wall }) => (wall === undefined ? [] : [{ node, wall }]))
	return {
		wall: computeMemorySpread(timed.map((read) => read.wall)),
		characters: computeMemorySpread(plain.map((read) => read.node.characters)),
		rate: computeMemorySpread(
			timed
				.filter((read) => read.node.characters > 0)
				.map((read) => read.wall / (read.node.characters / 1000)),
		),
		classes: MEMORY_LABEL_CLASSES.map((entry) => {
			const links = map.links.filter((link) => link.class === entry && answers.has(link.row))
			return {
				class: entry,
				characters: computeMemorySpread(links.map((link) => sizes.get(link.row) ?? 0)),
				count: links.length,
				achieved: links.filter((link) => answers.get(link.row)?.verdict === 'achieved').length,
				changed: links.filter((link) => {
					const other = receipts.get(link.row)
					return other !== undefined && other.verdict !== answers.get(link.row)?.verdict
				}).length,
			}
		}),
	}
}
