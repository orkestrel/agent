import type { ScratchInterface } from '@orkestrel/test/server'
import type {
	OllamaFixtureInterface,
	OllamaFixtureRequest,
	OllamaModel,
} from '@orkestrel/ollama/server'
import type {
	StudyAssessment,
	StudyAllowance,
	StudyContext,
	StudyCriterion,
	StudyDefinition,
	StudyDriverInterface,
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
import type {
	StudyExchangeRow,
	StudyExchangeSinkInterface,
	StudyDeclaration,
	StudyInstall,
	StudyInstallResult,
	StudyLaunchResult,
	StudyOllamaReplayInterface,
	StudyResultView,
	StudyValidation,
} from '@orkestrel/study/server'
import type { RecorderInterface } from '@orkestrel/test'
import type { StudyAttempt, StudyFailure, StudyRole, StudyRubric } from '@orkestrel/study'
import type { JSONValue } from '@orkestrel/contract'
import type { StudyDeskAssertion } from '../studies/desk/types.js'
import type { StudyMemoryArm, StudyMemoryInput } from '../studies/memory/index.js'
import {
	arrayOf,
	canonicalStringify,
	cloneJSONValue,
	isArray,
	isJSONValue,
	isRecord,
	isString,
	parseJSON,
} from '@orkestrel/contract'
import { createRecorder, waitForDelay } from '@orkestrel/test'
import { createTool } from '@orkestrel/tool'
import { buildOllamaReadout, createOllamaFixture } from '@orkestrel/ollama/server'
import { STUDY_CHAT_SYSTEM } from '../studies/chat/constants.js'
import { isStudyChatInput } from '../studies/chat/validators.js'
import { StudyChatDriver } from '../studies/chat/drivers/StudyChatDriver.js'
import { StudyChatJudge } from '../studies/chat/judges/StudyChatJudge.js'
import {
	parseStudyDefinition,
	parseStudyProfile,
	parseStudyScenario,
	buildStudySchedule,
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
	buildStudyOllamaModels,
	buildStudySelectors,
	collectStudyOllamaModels,
	createStudyInstall,
	readStudyDeclaration,
	readStudyResult,
} from '@orkestrel/study/server'
import {
	STUDY_MEMORY_FILE,
	STUDY_MEMORY_TEXT,
	StudyMemoryDriver,
	StudyMemoryJudge,
	isStudyMemoryInput,
} from '../studies/memory/index.js'
import { STUDY_DESK_TOOLS } from '../studies/desk/constants.js'
import { isStudyDeskAssertion, isStudyDeskInput } from '../studies/desk/validators.js'
import * as agent from '../src/core/index.js'
import * as provider from '@orkestrel/ollama'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { deepStrictEqual, strictEqual } from 'node:assert'
import { execFile } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createLedgerJudge } from './setup.js'

/** Composes the selected built Agent as both runtime and tested subject with the installed public Ollama provider; a distinct subject replaces only `subject`. */
export const STUDY_MEMORY_MODULES = Object.freeze({ agent, subject: agent, provider })

/** Pins a short goal that takes one request and no tool. */
export const STUDY_MEMORY_SHORT_GOAL = Object.freeze({
	id: 'first',
	input: { prompt: 'State the order count', arrivals: [], records: [] },
})

/** Pins the authored `capacity` and `memory` trial order independently of native execution output. */
export const STUDY_MEMORY_SCHEDULE = Object.freeze([
	Object.freeze(['records', 0]),
	Object.freeze(['full', 0]),
	Object.freeze(['full', 1]),
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

/** Runs the battery's direct composition independently of the Study session.
 * @example await runStudyChatDirect(server.url, goals, 19968)
 */
export async function runStudyChatDirect(
	url: string,
	goals: readonly StudyGoal[],
	capacity: number,
): Promise<void> {
	const input = goals[0]?.input
	if (!isStudyChatInput(input)) throw new Error('Missing chat input')
	const ledger = agent.createLedger(
		new provider.OllamaProvider({
			model: 'model',
			url,
			think: false,
			options: { num_ctx: 20480, num_predict: 1024, temperature: 0, seed: 0 },
		}),
		{
			judge: new StudyChatJudge(),
			system: STUDY_CHAT_SYSTEM[input.topic],
			topics: [
				{
					name: input.topic,
					criterion:
						input.topic === 'bookings'
							? 'Travel, hotel, restaurant, and taxi requirements a person stated'
							: 'Orders, delivery, refunds, ownership and follow-up obligations',
					requested: false,
				},
			],
			questions: agent.LEDGER_QUESTIONS,
			thresholds: { category: 0.7, topic: 0.7, correction: 0.5, amends: 0.7, supersedes: 0.7 },
			capacity,
			predict: 1024,
			think: false,
			share: { prompt: 1 },
			agent: { limit: 8 },
			lookups: (input.record === undefined ? [] : [input.record]).map((record) => ({
				tool: createTool({
					name: 'lookup',
					description: `Read an order record by id, such as ${record.id}.`,
					parameters: {
						type: 'object',
						properties: { id: { type: 'string' } },
						required: ['id'],
					},
					execute: (args) => (String(args.id) === record.id ? record.text : 'No record'),
				}),
				read: (args) =>
					args.id === record.id
						? { ids: [record.id], owners: [{ id: record.id, names: [record.name] }] }
						: undefined,
			})),
		},
	)
	try {
		for (const goal of goals) {
			if (!isStudyChatInput(goal.input)) throw new Error('Invalid chat input')
			await ledger.respond(goal.input.prompt)
		}
	} finally {
		ledger.agent.emitter.destroy()
		ledger.conversation.emitter.destroy()
	}
}

/** Reads an authored chat profile and rebinds its provider to the protocol fixture, unrecorded, for an in-process run.
 * @example buildStudyChatProfile('tight', server.url).settings // { capacity: 1600, ... }
 */
export function buildStudyChatProfile(
	name: string,
	url: string,
): StudyProfile & { readonly provider: NonNullable<StudyProfile['provider']> } {
	return {
		...parseStudyProfile(
			parseJSON(readFileSync(resolve('studies/chat/profiles', `${name}.json`), 'utf8')),
		),
		record: undefined,
		provider: {
			entry: '@orkestrel/ollama',
			url,
			model: 'model',
			judge: undefined,
			digest: { model: 'a'.repeat(64), judge: undefined },
		},
	}
}

/** Executes chat scenarios in process through `StudySeries` and the chat driver over the built Agent, then seals and reads the result.
 * @param profile - The profile whose bounds the manifest declares and the driver runs.
 * @param declaration - The definition and the scenarios to schedule.
 * @param directory - A result directory that does not exist yet.
 * @example (await executeStudyChatSeries(buildStudyChatProfile('full', url), declaration, join(scratch.path, 'full'))).status // 'sealed'
 */
export function executeStudyChatSeries(
	profile: StudyProfile,
	declaration: Pick<StudyDeclaration, 'definition' | 'scenarios'>,
	directory: string,
): Promise<StudyResultView> {
	return executeStudySeries(
		new StudyChatDriver({ ...STUDY_MEMORY_MODULES, profile, directory: resolve('.') }),
		profile,
		declaration,
		directory,
	)
}

/** Executes a declaration's schedule in process through `StudySeries` and one driver, then seals and reads the result.
 * @param driver - The driver every scheduled trial opens.
 * @param profile - The profile whose bounds the manifest declares.
 * @param declaration - The definition and the scenarios to schedule.
 * @param directory - A result directory that does not exist yet.
 * @example (await executeStudySeries(driver, profile, declaration, join(scratch.path, 'all'))).status // 'sealed'
 */
export async function executeStudySeries(
	driver: StudyDriverInterface,
	profile: StudyProfile,
	declaration: Pick<StudyDeclaration, 'definition' | 'scenarios'>,
	directory: string,
): Promise<StudyResultView> {
	const manifest = buildCustodyManifest(
		declaration.definition,
		declaration.scenarios,
		profile.bounds,
	)
	const store = new StudyResultStore({ directory, manifest })
	await store.create()
	await new StudySeries({
		manifest,
		driver,
		store,
		signal: new AbortController().signal,
	}).execute()
	await store.seal()
	return await readStudyResult(directory)
}

/** Executes a real Node entry with bounded output and preserves failure diagnostics.
 * @remarks Study's `StudyInstall` runs only an installed Study executable, with no runtime flag; this runs any Node arguments, such as the topology probe's entry under `--experimental-import-meta-resolve`.
 * @param arguments_ - Exact Node arguments, including its JavaScript entry.
 * @param root - Native working directory.
 * @param duration - Outer process deadline in milliseconds.
 * @returns Native exit and separate stdout/stderr bytes.
 */
export function executeStudyProcess(
	arguments_: readonly string[],
	root: string,
	duration: number,
): Promise<StudyLaunchResult> {
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

/** Captures and loads the actual recommended dependency topology in one disposable CPU process.
 * @param scratch - Exclusive worker-file owner, cleaned by the caller in finally.
 * @param roots - Optional root selection for admission refusal controls; defaults to recommended roots.
 * @returns Native exit and JSON observations without instantiating sessions or providers.
 * @remarks Package imports remain at their installed native locations. No package bytes are copied.
 */
export function executeStudyTopology(
	scratch: ScratchInterface,
	roots?: readonly string[],
): Promise<StudyLaunchResult> {
	const entry = scratch.write(
		'topology.ts',
		`// Self-contained disposable entry: imported test setup would preload the measured modules.
import { readFileSync, realpathSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isArray, isRecord, parseJSON } from ${JSON.stringify(pathToFileURL(resolve('node_modules/@orkestrel/contract/dist/src/core/index.js')).href)}
import { parseStudyProfile } from ${JSON.stringify(pathToFileURL(resolve('node_modules/@orkestrel/study/dist/src/core/index.js')).href)}
import { ArtifactLoader, hashStudyBytes } from ${JSON.stringify(pathToFileURL(resolve('node_modules/@orkestrel/study/dist/src/server/index.js')).href)}

const profile = parseStudyProfile(parseJSON(readFileSync('studies/memory/profiles/recommended.json', 'utf8')))
const selection = parseJSON(readFileSync(${JSON.stringify(scratch.write('roots.json', JSON.stringify({ roots })))}, 'utf8'))
if (!isRecord(selection) || (selection.roots !== undefined && (!isArray(selection.roots) || !selection.roots.every((root) => typeof root === 'string'))))
	throw new Error('Invalid topology root selection')
const roots = (selection.roots ?? profile.roots).map((root) => realpathSync(root))
const subject = realpathSync(profile.subject)
if (profile.provider === undefined) throw new Error('Missing recommended provider')
const provider = realpathSync(profile.provider.entry)
const dependency = realpathSync(fileURLToPath(import.meta.resolve('@orkestrel/agent', pathToFileURL(provider).href)))
const installed = realpathSync('node_modules/@orkestrel/agent')
const entries = roots.includes(installed) ? [subject, provider, dependency] : [subject, provider]
const identities = [subject, dependency, provider].map((path) => ({
	path,
	digest: hashStudyBytes(readFileSync(path)),
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

/** Pins the protocol fixture's listed models, the version it reports, and the context length its model metadata reports. */
export const STUDY_MEMORY_FIXTURE = Object.freeze({
	models: Object.freeze([
		Object.freeze({ name: 'model', digest: 'a'.repeat(64) }),
		Object.freeze({ name: 'judge', digest: 'b'.repeat(64) }),
	]),
	version: 'fixture-1',
	context: 32768,
})

/** Pins the labels a scripted judge readout lists, in its top order. */
export const STUDY_MEMORY_LABELS = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Yes', 'No'])

/**
 * Answers an Ollama protocol fixture's requests from a script, a policy per path, and the replies a daemon gives a chat and a judge request.
 * @remarks
 * `createMemoryFixture` passes `reply` as the fixture's reply callback, which sees every request
 * first. A scripted reply is consumed by the next request for its path while it heads the script;
 * a policy answers a request for its path that the script does not; an unscripted chat request
 * takes `buildMemoryReply` and an unscripted judge request a one-token readout, each repeating the
 * model the body names, as a daemon does. Every other request is declined, so the fixture's
 * built-in answer applies: its version, its model list, a listed model's metadata, an unload, or a
 * 404. The script is replaced by this entity alone, and its getter returns a copy.
 */
export class MemoryScript {
	readonly #policies: ReadonlyMap<string, MemoryPolicy>
	#pending: readonly MemoryWireFixture[]

	/** Creates a script. @param responses - The scripted replies in the order their paths are requested. Default: none. @param policies - The reply policy for each path, which answers a request the script does not. Default: none. */
	constructor(
		responses: readonly MemoryWireFixture[] = [],
		policies: Readonly<Record<string, MemoryPolicy>> = {},
	) {
		this.#pending = responses
		this.#policies = new Map(Object.entries(policies))
	}

	/** Holds a copy of the scripted replies not yet consumed. */
	get responses(): MemoryWireFixture[] {
		return [...this.#pending]
	}

	/** Answers one logged request, or declines it so the fixture's built-in answer applies.
	 * @param request - The fixture's record of the request.
	 * @returns The reply, or undefined to decline.
	 */
	reply(request: OllamaFixtureRequest): Response | undefined {
		const [next, ...rest] = this.#pending
		if (next !== undefined && next.path === request.path) {
			this.#pending = rest
			return buildMemoryResponse(next)
		}
		const policy = this.#policies.get(request.path)
		if (policy !== undefined) return new Response(policy(parseJSON(request.body)))
		if (request.path === '/api/chat')
			return new Response(buildMemoryReply({ model: readMemoryModel(request.body, 'model') }))
		if (request.path === '/api/generate' && !matchesMemoryUnload(request.body))
			return new Response(
				buildMemoryReadout(readMemoryModel(request.body, 'judge'), 'A', ['A', 'Yes']),
			)
		return undefined
	}
}

/**
 * Starts a loopback Ollama protocol fixture on an ephemeral port that answers through a script ahead of its built-in answers.
 * @param script - The replies. Default: an empty script, which answers each chat and judge request by default.
 * @param models - The models the fixture lists and holds metadata for. Default: `STUDY_MEMORY_FIXTURE.models`.
 * @returns A listening fixture the caller destroys.
 */
export function createMemoryFixture(
	script: MemoryScript = new MemoryScript(),
	models: readonly OllamaModel[] = STUDY_MEMORY_FIXTURE.models,
): Promise<OllamaFixtureInterface> {
	return createOllamaFixture({
		...STUDY_MEMORY_FIXTURE,
		models,
		reply: (request) => script.reply(request),
	})
}

/**
 * Builds the response a scripted reply describes: its status, then its body whole, held open, or after its delayed chunks.
 * @param fixture - The scripted reply.
 * @returns A response the fixture writes verbatim.
 */
export function buildMemoryResponse(fixture: MemoryWireFixture): Response {
	const status = fixture.status ?? 200
	const encoder = new TextEncoder()
	if (fixture.open === true)
		return new Response(
			new ReadableStream({
				start: (controller) => {
					controller.enqueue(encoder.encode(fixture.body))
				},
			}),
			{ status },
		)
	if (fixture.chunks === undefined) return new Response(fixture.body, { status })
	const chunks = streamMemoryChunks(fixture.chunks, fixture.body)
	return new Response(
		new ReadableStream<Uint8Array>({
			pull: async (controller) => {
				const step = await chunks.next()
				if (step.done === true) controller.close()
				else controller.enqueue(step.value)
			},
			cancel: async () => {
				await chunks.return(undefined)
			},
		}),
		{ status },
	)
}

/**
 * Yields each chunk after its delay, then the final body, as encoded bytes.
 * @param chunks - The chunks and the delay in milliseconds before each.
 * @param body - The body written last.
 * @returns The bytes in write order.
 */
export async function* streamMemoryChunks(
	chunks: NonNullable<MemoryWireFixture['chunks']>,
	body: string,
): AsyncGenerator<Uint8Array> {
	const encoder = new TextEncoder()
	for (const chunk of chunks) {
		await waitForDelay(chunk.delay)
		yield encoder.encode(chunk.body)
	}
	yield encoder.encode(body)
}

/**
 * Checks whether a generate body asks to unload its model: a zero `keep_alive` and an absent or empty prompt, as the fixture's built-in unload reads it.
 * @param body - The request body.
 * @returns True if the body asks for an unload; false otherwise.
 */
export function matchesMemoryUnload(body: string): boolean {
	const value = parseJSON(body)
	return (
		isRecord(value) && value.keep_alive === 0 && (value.prompt === undefined || value.prompt === '')
	)
}

/**
 * Reads a fixture's request log as each request's path and exact body, in arrival order.
 * @param fixture - The protocol fixture.
 * @returns The requests without their method and headers.
 */
export function readMemoryRequests(
	fixture: OllamaFixtureInterface,
): readonly MemoryRequestFixture[] {
	return fixture.requests.map((request) => ({ path: request.path, body: request.body }))
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

/** Builds inert protocol output consumed by the actual Ollama package.
 * @remarks Ollama's `buildOllamaReply` types each call as a `ToolCall`, whose `id` the wire then carries; this builder writes the calls as given, so a script can send the id-less call wire and raw or malformed timing fields.
 */
export function buildMemoryReply(options: MemoryReplyFixture = {}): string {
	return `${JSON.stringify({ model: options.model ?? 'model', done: true, done_reason: options.reason ?? 'stop', message: { role: 'assistant', content: options.content ?? 'Receipt retained.', ...(options.calls === undefined ? {} : { tool_calls: options.calls }) }, ...(options.unknown === true ? {} : { prompt_eval_count: options.prompt ?? 10, eval_count: options.completion ?? 2 }), ...options.timing })}\n`
}

/**
 * Builds a one-token judge readout over `STUDY_MEMORY_LABELS`, each likely label at nearly all the probability and the rest far below.
 * @param model - The model the readout names.
 * @param token - The token the readout chose.
 * @param likely - The labels that read likely. Default: the chosen token alone.
 * @returns One generate reply body.
 */
export function buildMemoryReadout(
	model: string,
	token: string,
	likely: readonly string[] = [token],
): string {
	return buildOllamaReadout({
		model,
		token,
		top: STUDY_MEMORY_LABELS.map((label) => ({
			token: label,
			logprob: likely.includes(label) ? -0.01 : -8,
		})),
		counts: { prompt: 10, decode: 1 },
	})
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
	Object.freeze({ name: 'stale version', settings: Object.freeze({ version: '0.40.15' }) }),
	Object.freeze({
		name: 'malformed metadata',
		settings: Object.freeze({ metadata: Object.freeze({ calls: 0, bytes: 1, duration: 1 }) }),
	}),
	Object.freeze({
		name: 'retired correction key',
		settings: Object.freeze({ correction: Object.freeze({ narrow: true }) }),
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
	const server = await createMemoryFixture(new MemoryScript(options.responses))
	const profile = buildMemoryProfile({
		url: server.url,
		...(options.triage === undefined ? {} : { triage: options.triage }),
		...(options.settings === undefined ? {} : { settings: options.settings }),
		...(options.duration === undefined ? {} : { duration: options.duration }),
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
				requests: readMemoryRequests(server),
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
		await server.destroy()
	}
}

/** Runs a real driver session against a fresh protocol fixture until a goal fails, then runs one more goal to read the latched fault.
 * @param options - Treatment, queued replies, ordered goals and optional driver settings.
 * @returns What the failing and the following goal rejected with, plus the wire state before the following goal and after the run.
 */
export async function runMemoryFailure(options: MemoryTrialFixture): Promise<MemoryFailureResult> {
	const script = new MemoryScript(options.responses)
	const server = await createMemoryFixture(script)
	const profile = buildMemoryProfile({
		url: server.url,
		...(options.triage === undefined ? {} : { triage: options.triage }),
		...(options.settings === undefined ? {} : { settings: options.settings }),
		...(options.duration === undefined ? {} : { duration: options.duration }),
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
				requests: readMemoryRequests(server),
				sent,
				queued: script.responses.length,
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
		await server.destroy()
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
			...(options.triage === undefined ? {} : { triage: options.triage.model }),
			digest: {
				model: 'a'.repeat(64),
				judge: 'b'.repeat(64),
				...(options.triage === undefined ? {} : { triage: options.triage.digest }),
			},
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
 * Removes the declared judge from a profile, as a workflow that uses none declares it.
 * @param profile - A profile that declares a provider
 * @returns The profile with no judge model and no judge digest
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

/** Pins the declarations on the memory driver, in sorted order. */
export const STUDY_MEMORY_DECLARATIONS = Object.freeze([
	'capacity',
	'endurance',
	'memory',
	'qualification',
])

/** Pins the SHA-256 of each memory declaration's rubric bytes, so any rubric change is caught; `memory` and `endurance` hold the mechanical criteria authored on 2026-11-19. */
export const STUDY_MEMORY_RUBRICS = Object.freeze({
	capacity: 'df1003c7c282b9dd7ea4b436c087ca0a3b8b3222903da664c1e0bde64a51cc2c',
	endurance: 'bf40b20597572cebdcd5f9db5bcaa9eaf2de26a3c7e7812c367dd0ef54abb957',
	memory: 'a1ae7b9db24267a43735a128d8f3757e05dd6e708a78b2ad9534a0898f4228af',
	qualification: 'b6f1a69d9d45096aff4878eae3cfead3c1e9beb2b5a264c665db5019a1d03ea8',
})

/** Pins each memory profile with the capacity result it names as its qualification. */
export const STUDY_MEMORY_PROFILES = Object.freeze([
	Object.freeze({ name: 'local', qualification: 'tmp/studies/capacity' }),
	Object.freeze({ name: 'recommended', qualification: 'tmp/studies/qualification' }),
])

/** Pins each capacity declaration beside the quality twin it qualifies and the profile the pair runs under. */
export const STUDY_MEMORY_TWINS = Object.freeze([
	Object.freeze({
		capacity: 'capacity',
		quality: 'memory',
		profiles: Object.freeze(['local']),
	}),
	Object.freeze({
		capacity: 'qualification',
		quality: 'endurance',
		profiles: Object.freeze(['recommended']),
	}),
])

/**
 * Lists the declarations under the root `studies/` folder that select the memory driver.
 * @returns Each such declaration's name, in sorted order.
 * @throws Error - Rethrows a declaration Study cannot parse.
 */
export function collectMemoryDeclarations(): readonly string[] {
	return readdirSync(resolve('studies'), { withFileTypes: true })
		.filter(
			(entry) => entry.isDirectory() && existsSync(resolve('studies', entry.name, 'study.json')),
		)
		.map((entry) =>
			parseStudyDefinition(
				parseJSON(readFileSync(resolve('studies', entry.name, 'study.json'), 'utf8')),
			),
		)
		.filter((definition) => definition.driver === 'memory')
		.map((definition) => definition.name)
		.toSorted()
}

/**
 * Reads an authored memory profile as a host runs it: a template's `REQUIRED_` provider takes the CPU fixture provider at `url`, as `writeMemoryLocalProfile` fills an install's.
 * @param name - The profile's file stem under `studies/memory/profiles/`.
 * @param url - The fixture origin a filled template names.
 * @returns The parsed profile.
 * @throws Error - Thrown when the file holds no provider record; rethrows a profile Study refuses.
 */
export function readMemoryProfile(name: string, url: string): StudyProfile {
	const authored = parseJSON(
		readFileSync(resolve('studies/memory/profiles', `${name}.json`), 'utf8'),
	)
	if (!isRecord(authored) || !isRecord(authored.provider))
		throw new Error(`Missing memory profile provider ${name}`)
	const template =
		isString(authored.provider.entry) && authored.provider.entry.startsWith('REQUIRED_')
	return parseStudyProfile(
		template ? { ...authored, provider: buildMemoryProfile({ url }).provider } : authored,
	)
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
	bounds: Partial<StudyAllowance> = {},
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
	bounds: StudyAllowance,
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
			{ event: 'note', goal: 'other', value: 'unrelated' },
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

/** Holds a protocol fixture and the install whose rebound profile names it. */
export interface StudyFixtureInstall {
	readonly server: OllamaFixtureInterface
	readonly install: StudyInstall
}

/** Holds one inert native HTTP fixture response. */
export interface MemoryWireFixture {
	readonly path: string
	readonly body: string
	readonly status?: number
	readonly open?: boolean
	readonly chunks?: ReadonlyArray<{ readonly body: string; readonly delay: number }>
}
/** Decides a protocol fixture's reply body for one path from the request body it parsed. */
export type MemoryPolicy = (body: unknown) => string
/** Holds real hierarchical accounting with append-only evidence. */
export interface MemoryContextFixture {
	readonly context: StudyContext
	readonly evidence: StudyEvidence[]
	close(): void
}
/** Holds pure profile fixture overrides. */
export interface MemoryProfileFixture {
	readonly triage?: { readonly model: string; readonly digest: string }
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
	readonly triage?: MemoryProfileFixture['triage']
	readonly arm: StudyMemoryArm
	readonly responses: readonly MemoryWireFixture[]
	readonly goals: readonly StudyGoal[]
	readonly settings?: Readonly<Record<string, JSONValue>>
	readonly duration?: number
	/** Holds the checkpoint value the driver's `open` receives. */
	readonly seed?: JSONValue
}
/** Holds one request a protocol fixture received. */
export interface MemoryRequestFixture {
	readonly path: string
	readonly body: string
}
/** Holds the shared recording an install file's setup makes once, and what made it. */
export interface MemoryRecordingFixture {
	/** Holds the recording profile, which lists every goal in `checkpoints`. */
	readonly profile: StudyProfile
	/** Holds each scheduled arm's first trial id, by arm. */
	readonly trials: ReadonlyMap<string, string>
	/** Names the recorded `records` trial. */
	readonly trial: string
	/** Holds the selection's check, whose `next` arguments the execution ran. */
	readonly selected: StudyInstallResult
	readonly executed: StudyInstallResult
	/** Holds the result directory. */
	readonly path: string
	/** Counts the requests the fixture took before the first check. */
	readonly start: number
	/** Counts the requests the fixture took once both checks ended. */
	readonly boundary: number
	/** Counts the requests the fixture took once the execution ended. */
	readonly sent: number
}
/** Holds a file's one install, its loopback provider, its owning scratch, and its shared recording. */
export interface MemoryInstallFixture extends StudyFixtureInstall {
	readonly scratch: ScratchInterface
	readonly recording: MemoryRecordingFixture
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

/** Holds real request admission and its single cleanup owner. */
export interface StudyMeterFixture {
	readonly control: StudyControl
	readonly meter: StudyMeter
	readonly scopes: readonly StudyScope[]
	close(): void
}

/** Maps each memory instrument fixture text to the ids it carries; the cases read it through a callback. */
export const MEMORY_LITERALS: ReadonlyMap<string, ReadonlySet<string>> = Object.freeze(
	new Map<string, ReadonlySet<string>>([
		['product cites AA-101 and BB-202', new Set(['AA-101', 'BB-202'])],
		['prompt carries AA-101 and BB-202', new Set(['AA-101', 'BB-202'])],
		['seed question only', new Set()],
	]),
)

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
	{ event: 'note', goal: 'g2', value: {} },
])

/**
 * Pins each role's sampling keys apart from `STUDY_MEMORY_PARAMETERS`: the agent holds the 2B
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

/** Pins a fixture recording: the sidecar bounds and the metadata bounds. */
export const STUDY_MEMORY_RECORD = Object.freeze({
	record: Object.freeze({ bytes: 4194304, calls: 256, duration: 60000 }),
	settings: Object.freeze({
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
	served: () => false,
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
	return { path: '/api/generate', body: buildMemoryReadout('judge', label) }
}

/**
 * Builds a finite CPU-only profile that declares recording.
 * @param url - The protocol fixture origin.
 * @returns The fixture profile with the recording bounds and metadata.
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
 * Writes a profile that declares recording beside an install's `local` profile, keeping that profile's other members and leaving it unchanged.
 * @param root - The install root, whose `local` profile `writeMemoryLocalProfile` wrote.
 * @param name - The written profile's name, which names its file.
 * @param checkpoints - The goal ids to list. Default: none.
 * @returns Nothing after the profile is written.
 * @throws Error - Thrown when the install holds no `local` profile.
 */
export function writeStudyInstallRecord(
	root: string,
	name: string,
	checkpoints: readonly string[] = [],
): void {
	const local = join(root, 'studies/memory/profiles/local.json')
	const raw = existsSync(local) ? parseJSON(readFileSync(local, 'utf8')) : undefined
	if (!isRecord(raw)) throw new Error('Missing authored memory profile')
	writeFileSync(
		join(root, 'studies/memory/profiles', `${name}.json`),
		JSON.stringify({
			...raw,
			name,
			record: STUDY_MEMORY_RECORD.record,
			settings: {
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

/** Pins settings that list every goal of the seed trajectory. */
export const STUDY_MEMORY_SEED_SETTINGS = Object.freeze({
	observe: true,
	checkpoints: Object.freeze(STUDY_MEMORY_SEED_GOALS.map((goal) => goal.id)),
})

/** Pins released records for the desk: a case's order record, a customer record whose content names the case, a second case's order, a policy naming two cases, and one naming none. */
export const MEMORY_DESK_RECORDS = Object.freeze([
	Object.freeze({
		id: 'order:BC-7301',
		name: 'Mara Ellison',
		content: 'Order BC-7301; ceramic filter breakage.',
	}),
	Object.freeze({
		id: 'customer:BC-4101',
		name: 'Mara Ellison',
		content: 'Account BC-4101; owner Mara Ellison; order BC-7301.',
	}),
	Object.freeze({
		id: 'order:BC-7302',
		name: 'Ivo Mercer',
		content: 'Order BC-7302; meter delivery.',
	}),
	Object.freeze({
		id: 'policy:refunds',
		name: 'Refund policy',
		content: 'Refunds need case approval, as on BC-7301 and BC-7302.',
	}),
	Object.freeze({ id: 'policy:money', name: 'Money policy', content: 'Round money to cents.' }),
])

/** Pins an arrival shaped like the battery's opening note: it names two cases, so it stays in the conversation. */
export const MEMORY_DESK_OPENING = Object.freeze({
	id: 'ev-opening',
	content:
		'Desk opening note. The grant obligation on order BC-7312 outlives the claim on order BC-7301.',
})

/** Pins an arrival shaped like the battery's register: it names all twelve cases, so it stays in the conversation. */
export const MEMORY_DESK_REGISTER = Object.freeze({
	id: 'ev-register',
	content: [
		'Customer/order register.',
		...Array.from(
			{ length: 12 },
			(_unused, at) =>
				`Account BC-41${String(at + 1).padStart(2, '0')}; order BC-73${String(at + 1).padStart(2, '0')}.`,
		),
	].join('\n'),
})

/** Pins texts that carry no whole, case-sensitive case id. */
export const MEMORY_DESK_UNMATCHED: readonly string[] = Object.freeze([
	'bc-7301',
	'BC-73010',
	'xBC-7301',
	'BC-7301x',
	'BC-730',
	'BC 7301',
	'',
])

/** Pins the request case choice: each row's arrivals, its request text, and the case the record renders for. */
export const MEMORY_DESK_CHOICES = Object.freeze([
	[
		[
			MEMORY_DESK_OPENING,
			MEMORY_DESK_REGISTER,
			{ id: 'ev-01-2', content: 'BC-7301 filter arrived cracked.' },
		],
		'Open the queue',
		'BC-7301',
	],
	[
		[
			{ id: 'ev-01-2', content: 'BC-7301 filter arrived cracked.' },
			{ id: 'ev-02-1', content: 'BC-7302 meter left at the locked gate.' },
		],
		'Check BC-7301',
		'BC-7302',
	],
	[
		[{ id: 'ev-02-1', content: 'BC-7302 meter left at the locked gate.' }, MEMORY_DESK_OPENING],
		'Check BC-7301',
		'BC-7302',
	],
	[[], 'Return to BC-7301 and decide the refund', 'BC-7301'],
	[[MEMORY_DESK_OPENING], 'Return to BC-7303', 'BC-7303'],
	[[], 'Compare BC-7301 with BC-7302', undefined],
	[[MEMORY_DESK_REGISTER], 'Close the shift', undefined],
	// An arrival id that carries a second case keeps the statement in the conversation.
	[[{ id: 'BC-7302', content: 'BC-7301 is open.' }], 'Close', undefined],
] as const)

/** Pins the adapter's case-binding rows: each changes one loaded scenario and names the CONFIG message it must raise, or none. */
export const MEMORY_DESK_BINDINGS: ReadonlyArray<{
	readonly scenario: 'endurance' | 'handoff'
	readonly drop: string | undefined
	readonly suffix: string
	readonly added: ReadonlyArray<{
		readonly id: string
		readonly name: string
		readonly content: string
	}>
	readonly message: RegExp | undefined
}> = Object.freeze([
	{
		scenario: 'endurance',
		drop: 'order:BC-7312',
		suffix: '',
		added: [],
		message:
			/names cases \[BC-7301, .*BC-7312\] but declares order records for \[BC-7301, .*BC-7311\]/,
	},
	{
		scenario: 'handoff',
		drop: undefined,
		suffix: ' BC-7301',
		added: [],
		message: /names cases \[BC-7301\] but declares order records for \[\]/,
	},
	// A declared id names its own case, so the goal inputs name it too.
	{
		scenario: 'handoff',
		drop: undefined,
		suffix: '',
		added: [{ id: 'order:BC-7301', name: 'Unnamed', content: 'Held.' }],
		message: undefined,
	},
	{
		scenario: 'handoff',
		drop: undefined,
		suffix: '',
		added: [{ id: 'order:BC-7399', name: 'Unnamed', content: 'Held.' }],
		message: /names cases \[\] but declares order records for \[BC-7399\]/,
	},
])

/** Pins a four-goal desk trajectory: two goals that each file one case's statement beside two that stay, a request that names the first case, and a request that names none. */
export const STUDY_MEMORY_DESK_GOALS: readonly StudyGoal[] = Object.freeze([
	Object.freeze({
		id: 'desk-opening',
		input: Object.freeze({
			prompt: 'Open the shift queue',
			arrivals: Object.freeze([
				MEMORY_DESK_OPENING,
				MEMORY_DESK_REGISTER,
				Object.freeze({ id: 'ev-01-2', content: 'BC-7301 filter arrived cracked.' }),
			]),
			records: Object.freeze(MEMORY_DESK_RECORDS.slice(0, 2)),
		}),
	}),
	Object.freeze({
		id: 'desk-second',
		input: Object.freeze({
			prompt: 'Check the meter delivery',
			arrivals: Object.freeze([
				Object.freeze({ id: 'ev-02-1', content: 'BC-7302 meter left at the locked gate.' }),
			]),
			records: Object.freeze(MEMORY_DESK_RECORDS.slice(2)),
		}),
	}),
	Object.freeze({
		id: 'desk-return',
		input: Object.freeze({
			prompt: 'Return to BC-7301 and decide the refund',
			arrivals: Object.freeze([]),
			records: Object.freeze([]),
		}),
	}),
	Object.freeze({
		id: 'desk-close',
		input: Object.freeze({
			prompt: 'Close the shift',
			arrivals: Object.freeze([]),
			records: Object.freeze([]),
		}),
	}),
])

/** Pins the case stores of a well-formed records checkpoint: two cases in first-filed order, statements oldest first. */
export const MEMORY_DESK_CASES = Object.freeze([
	Object.freeze({
		id: 'BC-7301',
		statements: Object.freeze([
			Object.freeze({ id: 'ev-01-2', content: 'BC-7301 filter arrived cracked.' }),
			Object.freeze({ id: 'ev-01-3', content: 'BC-7301 refund is approved.' }),
		]),
	}),
	Object.freeze({
		id: 'BC-7302',
		statements: Object.freeze([
			Object.freeze({ id: 'ev-02-1', content: 'BC-7302 meter left at the locked gate.' }),
		]),
	}),
])

/** Pins a well-formed records checkpoint whose case stores file three of its four taken arrivals. */
export const MEMORY_DESK_CHECKPOINT = Object.freeze({
	ledger: Object.freeze({}),
	records: Object.freeze([]),
	arrivals: Object.freeze(['ev-opening', 'ev-01-2', 'ev-01-3', 'ev-02-1']),
	cases: MEMORY_DESK_CASES,
})

/** Pins checkpoints the guard refuses for their case stores alone, each a change of the well-formed one. */
export const MEMORY_DESK_CHECKPOINT_REFUSALS = Object.freeze([
	Object.freeze({
		name: 'no cases member',
		value: Object.freeze({
			ledger: MEMORY_DESK_CHECKPOINT.ledger,
			records: MEMORY_DESK_CHECKPOINT.records,
			arrivals: MEMORY_DESK_CHECKPOINT.arrivals,
		}),
	}),
	Object.freeze({ name: 'cases as text', value: { ...MEMORY_DESK_CHECKPOINT, cases: 'BC-7301' } }),
	Object.freeze({
		name: 'a case with an undeclared member',
		value: { ...MEMORY_DESK_CHECKPOINT, cases: [{ ...MEMORY_DESK_CASES[1], note: 'held' }] },
	}),
	Object.freeze({
		name: 'a repeated case id',
		value: {
			...MEMORY_DESK_CHECKPOINT,
			cases: [
				{
					id: 'BC-7301',
					statements: [{ id: 'ev-01-2', content: 'BC-7301 filter arrived cracked.' }],
				},
				{ id: 'BC-7301', statements: [{ id: 'ev-01-3', content: 'BC-7301 refund is approved.' }] },
			],
		},
	}),
	Object.freeze({
		name: 'a case id outside the pattern',
		value: {
			...MEMORY_DESK_CHECKPOINT,
			arrivals: ['ev-13-1'],
			cases: [{ id: 'BC-7313', statements: [{ id: 'ev-13-1', content: 'BC-7313 is open.' }] }],
		},
	}),
	Object.freeze({
		name: 'a case id carrying text around its match',
		value: {
			...MEMORY_DESK_CHECKPOINT,
			cases: [
				{
					id: 'order:BC-7302',
					statements: [{ id: 'ev-02-1', content: 'BC-7302 meter left at the locked gate.' }],
				},
			],
		},
	}),
	Object.freeze({
		name: 'a lowercase case id',
		value: {
			...MEMORY_DESK_CHECKPOINT,
			cases: [
				{
					id: 'bc-7302',
					statements: [{ id: 'ev-02-1', content: 'bc-7302 meter left at the gate.' }],
				},
			],
		},
	}),
	Object.freeze({
		name: 'a case with no statement',
		value: {
			...MEMORY_DESK_CHECKPOINT,
			cases: [...MEMORY_DESK_CASES, { id: 'BC-7303', statements: [] }],
		},
	}),
	Object.freeze({
		name: 'a statement id repeated across cases',
		value: {
			...MEMORY_DESK_CHECKPOINT,
			cases: [
				MEMORY_DESK_CASES[0],
				{ id: 'BC-7302', statements: [{ id: 'ev-01-2', content: 'BC-7302 meter is late.' }] },
			],
		},
	}),
	Object.freeze({
		name: 'a statement id repeated within a case',
		value: {
			...MEMORY_DESK_CHECKPOINT,
			cases: [
				{
					id: 'BC-7301',
					statements: [
						{ id: 'ev-01-2', content: 'BC-7301 filter arrived cracked.' },
						{ id: 'ev-01-2', content: 'BC-7301 refund is approved.' },
					],
				},
			],
		},
	}),
	Object.freeze({
		name: 'a statement naming no taken arrival',
		value: {
			...MEMORY_DESK_CHECKPOINT,
			cases: [{ id: 'BC-7301', statements: [{ id: 'ev-09-9', content: 'BC-7301 is closed.' }] }],
		},
	}),
	Object.freeze({
		name: 'a statement carrying another case id',
		value: {
			...MEMORY_DESK_CHECKPOINT,
			cases: [
				{ id: 'BC-7302', statements: [{ id: 'ev-02-1', content: 'BC-7301 meter is late.' }] },
			],
		},
	}),
	Object.freeze({
		name: 'a statement carrying two case ids',
		value: {
			...MEMORY_DESK_CHECKPOINT,
			cases: [
				{ id: 'BC-7302', statements: [{ id: 'ev-02-1', content: 'BC-7302 follows BC-7301.' }] },
			],
		},
	}),
	Object.freeze({
		name: 'a statement carrying no case id',
		value: {
			...MEMORY_DESK_CHECKPOINT,
			cases: [{ id: 'BC-7302', statements: [{ id: 'ev-02-1', content: 'The meter is late.' }] }],
		},
	}),
	Object.freeze({
		name: 'a statement with non-text content',
		value: {
			...MEMORY_DESK_CHECKPOINT,
			cases: [{ id: 'BC-7302', statements: [{ id: 'ev-02-1', content: 7 }] }],
		},
	}),
	Object.freeze({
		name: 'a statement with an undeclared member',
		value: {
			...MEMORY_DESK_CHECKPOINT,
			cases: [
				{
					id: 'BC-7302',
					statements: [{ id: 'ev-02-1', content: 'BC-7302 meter is late.', origin: 'arrival' }],
				},
			],
		},
	}),
	Object.freeze({
		name: 'a statement text over the text bound',
		value: {
			...MEMORY_DESK_CHECKPOINT,
			cases: [
				{
					id: 'BC-7302',
					statements: [
						{
							id: 'ev-02-1',
							content: `BC-7302 ${'x'.repeat(STUDY_MEMORY_TEXT - 'BC-7302 '.length + 1)}`,
						},
					],
				},
			],
		},
	}),
	Object.freeze({
		name: 'a statement id over the text bound',
		value: {
			...MEMORY_DESK_CHECKPOINT,
			arrivals: ['x'.repeat(STUDY_MEMORY_TEXT + 1)],
			cases: [
				{
					id: 'BC-7302',
					statements: [{ id: 'x'.repeat(STUDY_MEMORY_TEXT + 1), content: 'BC-7302 is late.' }],
				},
			],
		},
	}),
])

/** Pins settings that list every goal of the desk trajectory. */
export const STUDY_MEMORY_DESK_SETTINGS = Object.freeze({
	observe: true,
	checkpoints: Object.freeze(STUDY_MEMORY_DESK_GOALS.map((goal) => goal.id)),
})

/**
 * Reads the desk file text a chat request carries in its context message.
 * @param body - The exact chat request body.
 * @returns The text inside the desk file's fenced block, or `undefined` when no message carries the file.
 * @throws Error - Thrown when the body is not a chat request with a message list.
 */
export function readMemoryDeskRecord(body: string): string | undefined {
	const parsed = parseJSON(body)
	if (!isRecord(parsed) || !isArray(parsed.messages)) throw new Error('Missing chat messages')
	const label = `File: ${STUDY_MEMORY_FILE}\n`
	const text = parsed.messages
		.map((message) =>
			isRecord(message) && typeof message.content === 'string' ? message.content : '',
		)
		.find((content) => content.includes(label))
	if (text === undefined) return undefined
	const open = text.indexOf('\n', text.indexOf(label) + label.length) + 1
	return text.slice(open, text.indexOf('\n```', open))
}

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
		{ event: 'denial', value: { id: '1', name: 'lookup', reason: agent.LEDGER_NOTES.repeat } },
		{ event: 'denial', value: { id: '2', name: 'lookup', reason: agent.LEDGER_NOTES.repeat } },
		{
			event: 'denial',
			value: { id: '3', name: 'absent', reason: 'absent is not in the active scope' },
		},
	].map((row) => Object.freeze({ ...row, goal: 'goal' })),
)

/**
 * Pins fictional replies for the abstention detector: `abstained` opens with each validated refusal, in another case and after leading markup or space too, and `attempted` holds a refusal only after an answer begins, or none.
 */
export const MEMORY_ABSTENTION_REPLIES = Object.freeze({
	abstained: Object.freeze([
		'I cannot confirm the refund without the order number.',
		"I can't see a delivery date for that order.",
		'I am unable to find that customer.',
		"I'm unable to verify the replacement.",
		'Unable to locate the earlier handoff note.',
		'I do not have the original invoice.',
		"I don't have the notes from the earlier shift.",
		'I could not find a record of that order.',
		"I couldn't match the refund to an order.",
		'**I cannot** answer from the arrivals alone.',
		' \n"I CANNOT confirm that."',
	]),
	attempted: Object.freeze([
		'I have reviewed the arrivals, but I cannot compare them with the earlier work.',
		"The refund is approved. I don't have the earlier note.",
		'I can confirm the delivery.',
		'Unable',
		'',
	]),
})

/**
 * Builds the replies of a seed trajectory's first two goals: one lookup call, then two answers, with a records trial's calibration ahead of them.
 * @param arm - The treatment.
 * @returns The script; the later goals take the fixture's default replies.
 */
export function buildMemorySeedResponses(arm: StudyMemoryArm): readonly MemoryWireFixture[] {
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
 * Builds a scenario whose every goal input takes a change, keeping the scenario and goal ids.
 * @param scenario - A declared memory scenario.
 * @param change - Returns the changed input of one goal.
 * @returns The changed scenario.
 * @throws Error - Thrown when a goal input is not a memory input, or a changed input is not JSON.
 */
export function buildMemoryScenario(
	scenario: StudyScenario,
	change: (input: StudyMemoryInput) => StudyMemoryInput,
): StudyScenario {
	return {
		id: scenario.id,
		goals: scenario.goals.map((goal) => {
			if (!isStudyMemoryInput(goal.input)) throw new Error(`Malformed goal ${goal.id}`)
			const input: unknown = change(goal.input)
			if (!isJSONValue(input)) throw new Error(`Changed goal ${goal.id} is not JSON`)
			return { id: goal.id, input }
		}),
	}
}

/**
 * Builds a checkpoint whose top-level members take the given changes; an `undefined` change removes its member.
 * @param value - A checkpoint.
 * @param change - The members to replace.
 * @returns The owned changed value.
 * @throws Error - Thrown when the value is not a record.
 */
export function buildMemorySeed(
	value: JSONValue,
	change: Readonly<Record<string, JSONValue | undefined>>,
): JSONValue {
	if (!isRecord(value)) throw new Error('Missing checkpoint')
	return cloneJSONValue(parseJSON(JSON.stringify({ ...value, ...change })))
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
	// `projection` is Study's own member of a goal in the progress document, so it keeps its name.
	return new Map(trial.goals.map((goal) => [String(goal.goal), goal.projection]))
}

/**
 * Reads the first trial of each arm from a check's schedule.
 * @param stdout - The check's standard output.
 * @returns Each scheduled arm's first trial id, by arm, in schedule order.
 * @throws Error - Thrown when the document holds no schedule of trials.
 */
export function readMemoryTrials(stdout: string): ReadonlyMap<string, string> {
	const plan = parseJSON(stdout)
	const schedule = isRecord(plan) ? plan.schedule : undefined
	if (!arrayOf(isRecord)(schedule) || schedule.length === 0)
		throw new Error('The check lists no schedule')
	const trials = new Map<string, string>()
	for (const trial of schedule) {
		if (!isString(trial.arm) || !isString(trial.id)) throw new Error('Invalid scheduled trial')
		if (!trials.has(trial.arm)) trials.set(trial.arm, trial.id)
	}
	return trials
}

/**
 * Records the shared segment of an install fixture's `capacity` target, as an operator does: the schedule's check, the selection's check, then the execution of the arguments that check returns.
 * @remarks
 * The segment is the first `records` trial's `opening..correction`, under the `recorded` profile, which
 * declares recording and lists every goal in `checkpoints`. The `local` profile stays unchanged.
 * @param install - The installed command.
 * @param server - The loopback provider; only this call sends to it while it runs.
 * @param output - The result directory.
 * @returns The profile, the scheduled trials, both checks, the execution, and the request counts.
 * @throws Error - Thrown when a check refuses, schedules no `records` trial, or returns no arguments.
 */
export async function executeMemoryRecording(
	install: StudyInstall,
	server: OllamaFixtureInterface,
	output: string,
): Promise<MemoryRecordingFixture> {
	writeStudyInstallRecord(install.root, 'recorded', STUDY_MEMORY_GOALS)
	const profile = parseStudyProfile(
		parseJSON(readFileSync(join(install.root, 'studies/memory/profiles/recorded.json'), 'utf8')),
	)
	const start = server.requests.length
	const scheduled = await install.execute(['check', 'capacity', '--profile', profile.name])
	if (scheduled.code !== 0) throw new Error(`The schedule check refused: ${scheduled.stderr}`)
	const trials = readMemoryTrials(scheduled.stdout)
	const trial = trials.get('records')
	if (trial === undefined) throw new Error('No records trial is scheduled')
	const selected = await install.execute([
		'check',
		'capacity',
		'--profile',
		profile.name,
		...buildStudySelectors({ trial, goals: { first: 'opening', last: 'correction' } }),
	])
	const plan: unknown = selected.code === 0 ? parseJSON(selected.stdout) : undefined
	if (!isRecord(plan) || !arrayOf(isString)(plan.next))
		throw new Error(`Missing selected execution arguments: ${selected.stderr}`)
	const boundary = server.requests.length
	const executed = await install.execute([...plan.next, '--out', output], 260000)
	return Object.freeze({
		profile,
		trials,
		trial,
		selected,
		executed,
		path: output,
		start,
		boundary,
		sent: server.requests.length,
	})
}

/**
 * Installs studies under one authored profile, rebound to a fresh protocol fixture that lists that profile's own model pins.
 * @remarks Study's `createStudyInstall` copies what `study freeze` keeps for each study and profile into `install` under the scratch, and rebinds the copied profile's provider to the fixture's URL with its own digests.
 * @param scratch - The owner of the install directory.
 * @param studies - The declarations to install; each one's bundle holds the profile.
 * @param profile - The profile to copy and rebind.
 * @param script - The fixture's replies. Default: an empty script.
 * @returns The listening fixture, which the caller destroys, and the install.
 * @throws Error - Thrown when no study is named or the profile declares no provider; rethrows a refused install after destroying the fixture.
 */
export async function createStudyFixtureInstall(
	scratch: ScratchInterface,
	studies: readonly string[],
	profile: string,
	script: MemoryScript = new MemoryScript(),
): Promise<StudyFixtureInstall> {
	const [study] = studies
	if (study === undefined) throw new Error('Missing study to install')
	const { bundle } = await readStudyDeclaration(resolve('.'), study)
	const declared = parseStudyProfile(
		parseJSON(readFileSync(join(bundle, 'profiles', `${profile}.json`), 'utf8')),
	).provider
	if (declared === undefined) throw new Error(`Profile ${profile} declares no provider`)
	const server = await createMemoryFixture(
		script,
		collectStudyOllamaModels(buildStudyOllamaModels(declared)),
	)
	try {
		const install = await createStudyInstall({
			root: resolve('.'),
			directory: join(scratch.path, 'install'),
			studies,
			profiles: [profile],
			provider: { url: server.url, digest: declared.digest },
		})
		return Object.freeze({ server, install })
	} catch (error) {
		await server.destroy()
		throw error
	}
}

/**
 * Writes the `local` profile into a memory install: the authored template, its provider and roots taken from the install's rebound `recommended` profile without triage, and short durations.
 * @remarks The template leaves its provider to the caller, so Study's install neither parses nor rebinds it; this fills it as a host does.
 * @param root - The install root, which holds the rebound `recommended` profile.
 * @returns Nothing after the profile is written.
 * @throws Error - Thrown when the template lacks a bound or the installed profile declares no provider.
 */
export function writeMemoryLocalProfile(root: string): void {
	const template = parseJSON(readFileSync(resolve('studies/memory/profiles/local.json'), 'utf8'))
	if (!isRecord(template) || !isRecord(template.bounds))
		throw new Error('Missing authored memory profile')
	const authored = template.bounds
	const recommended = parseStudyProfile(
		parseJSON(readFileSync(join(root, 'studies/memory/profiles/recommended.json'), 'utf8')),
	)
	const selected = recommended.provider
	if (selected === undefined) throw new Error('Missing installed recommended provider')
	writeFileSync(
		join(root, 'studies/memory/profiles/local.json'),
		JSON.stringify({
			...template,
			roots: recommended.roots,
			provider: {
				entry: selected.entry,
				url: selected.url,
				model: selected.model,
				judge: selected.judge,
				digest: { model: selected.digest.model, judge: selected.digest.judge },
			},
			bounds: Object.fromEntries(
				Object.entries({ request: 3000, goal: 30000, trial: 90000, series: 240000 }).map(
					([scope, duration]) => {
						const limit = authored[scope]
						if (!isRecord(limit)) throw new Error(`Missing ${scope} bound`)
						return [scope, { ...limit, duration }]
					},
				),
			),
		}),
	)
}

/**
 * Builds a file's one memory install against its own loopback provider, and makes its shared recording.
 * @remarks
 * Every case of the file reads this one install. It installs `capacity` and `memory`
 * under `recommended`, whose roots admit the selected Ollama entry, then writes the
 * `local` profile both run under, and the recording writes its own `recorded` profile beside it.
 * @param prefix - The scratch directory's prefix.
 * @returns The scratch, the provider, the install, and the shared recording.
 * @throws Error - Rethrows a failed setup after destroying the provider and removing the scratch.
 */
export async function createMemoryInstall(prefix: string): Promise<MemoryInstallFixture> {
	const scratch = createScratch({ prefix })
	try {
		const { server, install } = await createStudyFixtureInstall(
			scratch,
			['capacity', 'memory'],
			'recommended',
		)
		try {
			writeMemoryLocalProfile(install.root)
			const recording = await executeMemoryRecording(
				install,
				server,
				join(install.root, 'tmp', 'studies', 'recorded'),
			)
			return Object.freeze({ scratch, server, install, recording })
		} catch (error) {
			await server.destroy()
			throw error
		}
	} catch (error) {
		await destroyScratch(scratch)
		throw error
	}
}

/**
 * Closes a file's install: its provider, then its scratch.
 * @param fixture - The install `createMemoryInstall` built.
 * @returns Completion once both are released.
 */
export async function destroyMemoryInstall(fixture: MemoryInstallFixture): Promise<void> {
	try {
		await fixture.server.destroy()
	} finally {
		await destroyScratch(fixture.scratch)
	}
}

/** Pins the triage boundary and mixed question forms without embedding state in evidence. */
export const MEMORY_TRIAGE_REQUEST: agent.JudgeRequest = Object.freeze<agent.JudgeRequest>({
	state: 'PRIVATE ROUTING STATE',
	questions: {
		low: { form: 'choice', criteria: { fact: 'fact', correction: 'correction' } },
		edge: { form: 'choice', criteria: { fact: 'fact', correction: 'correction' } },
		correction: { form: 'choice', criteria: { fact: 'fact', correction: 'correction' } },
		noul: { form: 'noul' },
		score: { form: 'score', criteria: ['low', 'high'] },
	},
})

/** Pins complete first-leg distributions on both sides of the raw cutoff. */
export const MEMORY_TRIAGE_FIRST: agent.JudgeResult = Object.freeze<agent.JudgeResult>({
	model: 'first',
	answers: {
		low: { form: 'choice', probabilities: { fact: 0.64, correction: 0.36 } },
		edge: { form: 'choice', probabilities: { fact: 0.65, correction: 0.35 } },
		correction: { form: 'choice', probabilities: { fact: 0.1, correction: 0.9 } },
	},
	usage: { prompt: 10, completion: 2, total: 12 },
})

/** Pins fallback outcomes, including extraneous ids that must never be returned. */
export const MEMORY_TRIAGE_SECOND: agent.JudgeResult = Object.freeze<agent.JudgeResult>({
	model: 'second',
	answers: {
		low: { form: 'choice', probabilities: { fact: 0.9, correction: 0.1 } },
		edge: { form: 'choice', probabilities: { fact: 0.99, correction: 0.01 } },
		noul: { form: 'noul', noul: 0.8 },
		score: { form: 'score', probabilities: [0.2, 0.8] },
		unrequested: { form: 'noul', noul: 1 },
	},
	refusals: { correction: { missing: ['fact'] }, edge: { missing: ['fact'] } },
	usage: { prompt: 20, completion: 3, total: 23 },
})

/** Builds serial recording legs using the existing judge boundary helper. */
export function createMemoryRouting(
	first?: (request: agent.JudgeRequest) => Promise<agent.JudgeResult>,
	second?: (request: agent.JudgeRequest) => Promise<agent.JudgeResult>,
	models: readonly [string, string] = ['first', 'second'],
) {
	const calls = createRecorder<readonly [string]>()
	const evidence = createRecorder<readonly [string, JSONValue]>()
	const firstSignals = createRecorder<readonly [AbortSignal]>()
	const secondSignals = createRecorder<readonly [AbortSignal]>()
	const requests = createRecorder<readonly [agent.JudgeRequest]>()
	const judge = new StudyMemoryJudge({
		first: new MemoryRoutingJudge(
			createLedgerJudge(
				calls,
				(request) => (first === undefined ? Promise.resolve(MEMORY_TRIAGE_FIRST) : first(request)),
				models[0],
			),
			firstSignals,
		),
		second: new MemoryRoutingJudge(
			createLedgerJudge(
				calls,
				(request) => {
					requests.handler(request)
					return second === undefined ? Promise.resolve(MEMORY_TRIAGE_SECOND) : second(request)
				},
				models[1],
			),
			secondSignals,
		),
		runtime: agent,
		evidence: { append: evidence.handler },
	})
	return { judge, calls, evidence, requests, first: firstSignals, second: secondSignals }
}

/** Pins unusable first-leg outcomes, all of which require the fallback leg. */
export const MEMORY_TRIAGE_UNUSABLE: readonly agent.JudgeResult[] = Object.freeze([
	{
		model: 'first',
		answers: { edge: { form: 'choice', probabilities: { fact: 0.9, correction: 0.9 } } },
	},
	{ model: 'first', answers: {} },
	{ model: 'first', answers: {}, refusals: { edge: { missing: ['fact'] } } },
	{ model: 'first', answers: { edge: { form: 'noul', noul: 1 } } },
	{ model: 'first', answers: { edge: { form: 'choice', probabilities: { fact: 1 } } } },
	{
		model: 'first',
		answers: { edge: { form: 'choice', probabilities: { fact: Number.NaN, correction: 0 } } },
	},
])

/** Pins malformed triage declarations without changing any existing profile fixture. */
export const MEMORY_TRIAGE_INVALID: readonly unknown[] = Object.freeze([
	{ model: 'tev1', digest: `${'a'.repeat(64)}\n` },
	null,
	[],
	{},
	{ model: '', digest: 'a'.repeat(64) },
	{ model: 'tev1', digest: 'A'.repeat(64) },
	{ model: 'tev1', digest: 'a'.repeat(63) },
	{ model: 'tev1', digest: 'g'.repeat(64) },
	{ model: 'tev1', digest: 'a'.repeat(64), extra: true },
])

/** Pins both inventory refusal cases. */
export const MEMORY_TRIAGE_UNAVAILABLE = Object.freeze([
	{ model: 'model', digest: 'c'.repeat(64) },
	{ model: 'absent', digest: 'c'.repeat(64) },
])

/** Pins each unsupported custody collaborator independently. */
export const MEMORY_TRIAGE_CAPTURE = Object.freeze([
	{ exchanges: STUDY_MEMORY_INERT_EXCHANGES },
	{ replay: STUDY_MEMORY_INERT_REPLAY },
])

/** Pins a tie whose distribution order differs from its caller's criteria order. */
export const MEMORY_TRIAGE_TIE: agent.JudgeRequest = Object.freeze<agent.JudgeRequest>({
	state: '',
	questions: { tie: { form: 'choice', criteria: { correction: 'change', fact: 'statement' } } },
})

/** Pins the tied response independently of the criteria order. */
export const MEMORY_TRIAGE_TIED: agent.JudgeResult = Object.freeze<agent.JudgeResult>({
	model: 'first',
	answers: { tie: { form: 'choice', probabilities: { fact: 0.5, correction: 0.5 } } },
})

/** Records identities while constructing the real Mica judge and real Ledger. */
export function createMemoryIdentity(profile: StudyProfile) {
	const models = createRecorder<readonly [string, string]>()
	const driver = new StudyMemoryDriver({
		agent: {
			...agent,
			createLedger: (...args: Parameters<typeof agent.createLedger>) => {
				models.handler('ledger', args[1].judge.model)
				return agent.createLedger(...args)
			},
		},
		subject: agent,
		provider: {
			...provider,
			createOllamaJudge: (...args: Parameters<typeof provider.createOllamaJudge>) => {
				const judge = provider.createOllamaJudge(...args)
				models.handler('mica', judge.model)
				return judge
			},
		},
		profile,
	})
	return { driver, models }
}

/** Pins an operational first-leg failure for a real composed session. */
export const MEMORY_TRIAGE_FAILURES: readonly MemoryWireFixture[] = Object.freeze([
	{ path: '/v1/systemone', status: 503, body: 'unavailable' },
])

/** Holds a high-probability partial that an internal first-leg abort must discard. */
export const MEMORY_TRIAGE_PARTIAL: agent.JudgeResult = Object.freeze<agent.JudgeResult>({
	model: 'first',
	answers: { low: { form: 'choice', probabilities: { fact: 0.9, correction: 0.1 } } },
})

/** Keeps inventory open until the caller aborts it. */
export const MEMORY_TRIAGE_OPEN: readonly MemoryWireFixture[] = Object.freeze([
	{ path: '/api/tags', open: true, body: '' },
])

/** Supplies one public request whose category can be retained over the actual System One protocol. */
export const MEMORY_TRIAGE_GOAL: StudyGoal = Object.freeze({
	id: 'triage',
	input: {
		prompt: 'Summarize the order count.',
		arrivals: [{ id: 'triage-source', content: 'The order count is two.' }],
		records: [],
	},
})

/**
 * Builds a successful System One answer keyed by the request's own question ids, reading `fact` at 0.9 on each choice question and repeating the model the request names, as a System One server does; the policy for `/v1/systemone`.
 * @param body - The parsed `/v1/systemone` request body.
 * @returns The answer body.
 * @throws Error - Thrown when the body names no model, asks no questions, or a question is not a choice.
 */
export function buildMemoryRouteAnswer(body: unknown): string {
	if (!isRecord(body) || !isRecord(body.questions)) throw new Error('Missing System One questions')
	if (!isString(body.model)) throw new Error('Missing System One model')
	return JSON.stringify({
		model: body.model,
		answers: Object.fromEntries(
			Object.entries(body.questions).map(([id, question]) => {
				if (!isRecord(question) || question.type !== 'choice' || !isRecord(question.criteria))
					throw new Error('Expected a choice question')
				const labels = Object.keys(question.criteria)
				return [
					id,
					{
						type: 'choice',
						probabilities: Object.fromEntries(
							labels.map((label) => [label, label === 'fact' ? 0.9 : 0.1 / (labels.length - 1)]),
						),
					},
				]
			}),
		),
	})
}

/** Holds a horizon of triage goals, each releasing one arrival, for proofs that span goals of one trial. */
export const MEMORY_TRIAGE_GOALS: readonly StudyGoal[] = Object.freeze([
	MEMORY_TRIAGE_GOAL,
	{
		id: 'followup',
		input: {
			prompt: 'Summarize the delivery date.',
			arrivals: [{ id: 'delivery', content: 'Delivery is Friday.' }],
			records: [],
		},
	},
	{
		id: 'extended',
		input: {
			prompt: 'Summarize the receiver.',
			arrivals: [{ id: 'receiver', content: 'The receiver is Bea.' }],
			records: [],
		},
	},
])

/** Reads the conversation carried by either memory checkpoint strategy. */
export function readMemoryReplayConversation(
	checkpoint: JSONValue,
): Readonly<Record<string, unknown>> {
	if (!isRecord(checkpoint)) throw new Error('Missing checkpoint')
	const conversation = isRecord(checkpoint.ledger)
		? checkpoint.ledger.conversation
		: checkpoint.conversation
	if (!isRecord(conversation)) throw new Error('Missing checkpoint conversation')
	return conversation
}

/** Reads every message id in checkpoint conversation order. */
export function readMemoryReplayMessages(checkpoint: JSONValue): readonly string[] {
	const conversation = readMemoryReplayConversation(checkpoint)
	if (!isRecord(conversation) || !isArray(conversation.messages))
		throw new Error('Missing checkpoint conversation')
	const ids = conversation.messages.map((message) => {
		if (!isRecord(message) || typeof message.id !== 'string') throw new Error('Missing message id')
		return message.id
	})
	strictEqual(new Set(ids).size, ids.length, 'Conversation repeats a message id')
	return ids
}

/** Translates declared identity fields and references while preserving every other member verbatim. */
export function mapMemoryReplayIds(
	value: JSONValue,
	ids: ReadonlyMap<string, string>,
	member = '',
): JSONValue {
	if (typeof value === 'string') {
		const judgment =
			member === 'questions.id' || /^(ledger\.)?conversation\.judgments\.id$/.test(member)
		const tuple = judgment && value.startsWith('[') ? parseJSON(value) : undefined
		if (
			isArray(tuple) &&
			['category', 'topic', 'amends', 'supersedes'].includes(String(tuple[0]))
		) {
			const count = tuple[0] === 'amends' || tuple[0] === 'supersedes' ? 2 : 1
			return JSON.stringify(
				tuple.map((part, index) => {
					if (index === 0 || index > count) return part
					if (typeof part !== 'string' || !ids.has(part))
						throw new Error('Unmapped decision message id')
					return ids.get(part)
				}),
			)
		}
		if (judgment) return ids.get(value) ?? value
		const reference =
			/^(ledger\.)?conversation\.(id|messages\.id|judgments\.sources)$/.test(member) ||
			/^ledger\.(requests|notes|failures)$/.test(member)
		if (!reference) return value
		const mapped = ids.get(value)
		if (mapped === undefined) throw new Error(`Unmapped ${member.split('.').at(-1)} message id`)
		return mapped
	}
	if (isArray(value)) return value.map((part) => mapMemoryReplayIds(part, ids, member))
	if (isRecord(value)) {
		return Object.fromEntries(
			Object.entries(value).map(([key, part]) => {
				return [
					key,
					key.includes('.')
						? part
						: mapMemoryReplayIds(part, ids, member === '' ? key : `${member}.${key}`),
				]
			}),
		)
	}
	return value
}

/** Validates wall clocks and admits the mapped ledger checkpoint as a snapshot. */
export function normalizeMemoryReplayCheckpoint(
	value: JSONValue,
	ids: ReadonlyMap<string, string>,
): JSONValue {
	const mapped = mapMemoryReplayIds(value, ids)
	const conversation = readMemoryReplayConversation(mapped)
	const judgments = conversation.judgments
	if (judgments !== undefined && !isArray(judgments))
		throw new Error('Invalid checkpoint judgments')
	const normalized = {
		...conversation,
		...(judgments === undefined
			? {}
			: {
					judgments: judgments.map((judgment) => {
						if (
							!isRecord(judgment) ||
							!Object.hasOwn(judgment, 'time') ||
							typeof judgment.time !== 'number' ||
							!Number.isFinite(judgment.time) ||
							!Number.isInteger(judgment.time) ||
							judgment.time < 0
						)
							throw new Error('Judgment clock must be present and a finite non-negative integer')
						return { ...judgment, time: 0 }
					}),
				}),
	}
	if (!isRecord(mapped) || !isRecord(value)) throw new Error('Invalid checkpoint')
	if (mapped.ledger === undefined) {
		const result = { ...mapped, conversation: normalized }
		if (!isJSONValue(result)) throw new Error('Invalid normalized checkpoint')
		return result
	}
	const ledger: unknown = mapped.ledger
	if (!agent.isLedgerSnapshot(value.ledger) || !agent.isLedgerSnapshot(ledger))
		throw new Error('Invalid ledger checkpoint')
	const result = { ...mapped, ledger: { ...ledger, conversation: normalized } }
	if (!isJSONValue(result)) throw new Error('Invalid normalized checkpoint')
	return result
}

/** Asserts the identity bijection and strict content equality with only the ruled run-local projections. */
export function assertMemoryReplay(
	recorded: readonly StudyEvidence[],
	replayed: readonly StudyEvidence[],
): void {
	const checkpoints = recorded.filter((row) => row.event === 'checkpoint')
	const replay = replayed.filter((row) => row.event === 'checkpoint')
	strictEqual(replay.length, checkpoints.length, 'Checkpoint count differs')
	const pairs = checkpoints.flatMap((row, index) => {
		const other = replay[index]
		if (other === undefined) throw new Error('Missing replay checkpoint')
		strictEqual(other.goal, row.goal, 'Checkpoint goal differs')
		const conversation = readMemoryReplayConversation(row.value).id
		const replayConversation = readMemoryReplayConversation(other.value).id
		if (typeof conversation !== 'string' || typeof replayConversation !== 'string')
			throw new Error('Missing conversation id')
		const expected = readMemoryReplayMessages(row.value)
		const actual = readMemoryReplayMessages(other.value)
		strictEqual(actual.length, expected.length, 'Conversation message count differs')
		return [
			[conversation, replayConversation] as const,
			...expected.map((id, position) => {
				const target = actual[position]
				if (target === undefined) throw new Error('Missing replay message')
				return [id, target] as const
			}),
		]
	})
	const ids = new Map(pairs)
	const inverse = new Map(pairs.map(([left, right]) => [right, left]))
	strictEqual(ids.size, inverse.size, 'Message id mapping is not bijective')
	for (const [left, right] of pairs) {
		strictEqual(ids.get(left), right, 'Message id changed position')
		strictEqual(inverse.get(right), left, 'Message id mapping is not bijective')
	}
	const decisions = recorded
		.filter((row) => row.event === 'triage')
		.map((row) => {
			if (!isRecord(row.value) || !isJSONValue(row.value.questions))
				throw new Error('Missing decisions')
			return { goal: row.goal, questions: row.value.questions }
		})
	const answers = replayed
		.filter((row) => row.event === 'triage')
		.map((row) => {
			if (!isRecord(row.value) || !isJSONValue(row.value.questions))
				throw new Error('Missing replay decisions')
			return { goal: row.goal, questions: row.value.questions }
		})
	// Validate references on both sides, including ids that would otherwise match by accident.
	mapMemoryReplayIds(answers, inverse)
	mapMemoryReplayIds(
		replay.map((row) => row.value),
		inverse,
	)
	deepStrictEqual(
		answers,
		mapMemoryReplayIds(decisions, ids),
		'Retained decisions differ after message id mapping',
	)
	const identity = new Map([...ids.keys()].map((id) => [id, id]))
	const expected = checkpoints.map((row) => normalizeMemoryReplayCheckpoint(row.value, identity))
	const actual = replay.map((row) => normalizeMemoryReplayCheckpoint(row.value, inverse))
	deepStrictEqual(actual, expected, 'Checkpoint members differ after message id mapping')
}

/** Builds decisions with identical answers so only their identities distinguish a positional swap. */
export function buildMemoryReplayEvidence(
	ids: readonly string[],
	conversation = 'records',
	time = 0,
	held = 'Message 0',
): readonly StudyEvidence[] {
	const messages: readonly agent.Message[] = ids.map((id, index) => ({
		id,
		role: 'user',
		content: index === 0 ? held : `Message ${index}`,
	}))
	const checkpoint: unknown = {
		ledger: {
			conversation: {
				id: conversation,
				messages,
				judgments: ids.map((id) => ({
					id: JSON.stringify(['topic', id, 'fixture']),
					question: { form: 'noul' },
					answer: { form: 'noul', noul: 0.9 },
					model: 'fixture',
					sources: [id],
					state: 'Fixture state',
					time,
				})),
			},
			requests: [],
			notes: [...ids],
			failures: [],
		},
		records: [],
		arrivals: [],
		cases: [],
	}
	if (!isJSONValue(checkpoint)) throw new Error('Invalid fixture checkpoint')
	return [
		...ids.map((id, index) => ({
			goal: String(index),
			event: 'triage',
			value: {
				questions: [
					{
						id: JSON.stringify(['category', id]),
						outcome: 'kept',
						probability: 0.9,
						winner: 'fact',
					},
				],
			},
		})),
		{
			goal: 'final',
			event: 'checkpoint',
			value: checkpoint,
		},
	]
}

/** Varies each fixed-policy member independently for identity proofs. */
export const MEMORY_TRIAGE_POLICIES = Object.freeze([
	Object.freeze({ version: 1, probability: 0.65, referrals: Object.freeze(['correction']) }),
	Object.freeze({ version: 2, probability: 0.65, referrals: Object.freeze(['correction']) }),
	Object.freeze({ version: 1, probability: 0.66, referrals: Object.freeze(['correction']) }),
	Object.freeze({ version: 1, probability: 0.65, referrals: Object.freeze(['fact']) }),
])

/** Records cancellation signals while delegating to the existing scripted judge boundary. */
export class MemoryRoutingJudge implements agent.JudgeInterface {
	readonly #inner: agent.JudgeInterface
	readonly #signals: RecorderInterface<readonly [AbortSignal]>
	readonly id: string
	readonly name: string
	readonly model: string
	constructor(inner: agent.JudgeInterface, signals: RecorderInterface<readonly [AbortSignal]>) {
		this.#inner = inner
		this.#signals = signals
		this.id = inner.id
		this.name = inner.name
		this.model = inner.model
	}
	ask(request: agent.JudgeRequest, signal: AbortSignal): Promise<agent.JudgeResult> {
		this.#signals.handler(signal)
		return this.#inner.ask(request, signal)
	}
}

/** Holds what a desk reply policy reads from one chat request body: the model it names, which a reply repeats, each message's role, text, and called names, and each advertised tool's name and parameter types. */
export interface StudyDeskBody {
	readonly model: string
	readonly messages: ReadonlyArray<{
		readonly role: string
		readonly content: string
		readonly calls: readonly string[]
	}>
	readonly tools: ReadonlyArray<{
		readonly name: string
		readonly fields: ReadonlyArray<{ readonly name: string; readonly type: string }>
	}>
}

/**
 * Reads a chat request body the desk policies answer.
 * @param value - The parsed `/api/chat` body.
 * @returns The model it names, `model` when it names none, and its messages and advertised tools, in wire order.
 * @throws Error - Thrown when the body carries no message list or a message lacks its role.
 */
export function readStudyDeskBody(value: unknown): StudyDeskBody {
	if (!isRecord(value) || !isArray(value.messages)) throw new Error('Desk body lacks messages')
	return {
		model: isString(value.model) ? value.model : 'model',
		messages: value.messages.map((message) => {
			if (!isRecord(message) || !isString(message.role)) throw new Error('Desk message lacks role')
			return {
				role: message.role,
				content: isString(message.content) ? message.content : '',
				calls: isArray(message.tool_calls)
					? message.tool_calls.flatMap((call) =>
							isRecord(call) && isRecord(call.function) && isString(call.function.name)
								? [call.function.name]
								: [],
						)
					: [],
			}
		}),
		tools: isArray(value.tools)
			? value.tools.flatMap((tool) =>
					isRecord(tool) && isRecord(tool.function) && isString(tool.function.name)
						? [
								{
									name: tool.function.name,
									fields:
										isRecord(tool.function.parameters) &&
										isRecord(tool.function.parameters.properties)
											? Object.entries(tool.function.parameters.properties).map(
													([name, schema]) => ({
														name,
														type:
															isRecord(schema) && isString(schema.type) ? schema.type : 'string',
													}),
												)
											: [],
								},
							]
						: [],
				)
			: [],
	}
}

/**
 * Collects each request's assertion by its prompt, from a desk declaration's scenarios and rubric.
 * @param declaration - The scenarios and the rubric of a desk study.
 * @returns Each prompt mapped to the tool and area its criterion names.
 */
export function collectStudyDeskAnswers(
	declaration: Pick<StudyDeclaration, 'scenarios' | 'rubric'>,
): ReadonlyMap<string, StudyDeskAssertion> {
	return new Map(
		declaration.rubric.criteria.flatMap((criterion) => {
			const input = declaration.scenarios
				.find((scenario) => scenario.id === criterion.scenario)
				?.goals.find((goal) => goal.id === criterion.goal)?.input
			return isStudyDeskInput(input) && isStudyDeskAssertion(criterion.assertion)
				? [[input.prompt, criterion.assertion] as const]
				: []
		}),
	)
}

/**
 * Finds the request a body serves: the prompt its last user message ends with.
 * @param prompts - The declared prompts, each mapped to its assertion.
 * @param body - The read body.
 * @returns The request's assertion, or undefined for a body no declared request opened.
 */
export function findStudyDeskAnswer(
	prompts: ReadonlyMap<string, StudyDeskAssertion>,
	body: StudyDeskBody,
): StudyDeskAssertion | undefined {
	const content = body.messages.findLast((message) => message.role === 'user')?.content
	return content === undefined
		? undefined
		: [...prompts].find(([prompt]) => content.endsWith(prompt))?.[1]
}

/**
 * Reads the messages after a body's last user message: the turns the current request has taken.
 * @param body - The read body.
 * @returns The trailing messages, in order.
 */
export function readStudyDeskTail(body: StudyDeskBody): StudyDeskBody['messages'] {
	return body.messages.slice(body.messages.findLastIndex((message) => message.role === 'user') + 1)
}

/**
 * Builds a call reply that fills each advertised parameter: its own name for a string, 1 for a number.
 * @param body - The read body.
 * @param name - The tool to call.
 * @returns One chat reply holding the call.
 */
export function buildStudyDeskCall(body: StudyDeskBody, name: string): string {
	const fields = body.tools.find((tool) => tool.name === name)?.fields ?? []
	return buildMemoryReply({
		model: body.model,
		content: '',
		calls: [
			{
				function: {
					name,
					arguments: Object.fromEntries(
						fields.map((field) => [field.name, field.type === 'number' ? 1 : field.name]),
					),
				},
			},
		],
	})
}

/**
 * Creates the oracle reply policy: it loads the request's area when the tool is held back, then calls the tool, then answers.
 * @param prompts - The declared prompts, each mapped to its assertion.
 * @returns A `MemoryScript` policy for `/api/chat`.
 */
export function createStudyDeskOracle(
	prompts: ReadonlyMap<string, StudyDeskAssertion>,
): MemoryPolicy {
	return (value) => {
		const body = readStudyDeskBody(value)
		const { model } = body
		const answer = findStudyDeskAnswer(prompts, body)
		const tail = readStudyDeskTail(body)
		if (answer === undefined)
			return buildMemoryReply({ model, content: 'I cannot help with that.' })
		if (tail.some((message) => message.calls.includes(answer.tool)))
			return buildMemoryReply({ model, content: 'Done.' })
		if (body.tools.some((tool) => tool.name === answer.tool))
			return buildStudyDeskCall(body, answer.tool)
		if (
			body.tools.some((tool) => tool.name === 'load') &&
			!tail.some((message) => message.calls.includes('load'))
		)
			return buildMemoryReply({
				model,
				content: '',
				calls: [{ function: { name: 'load', arguments: { skill: answer.area } } }],
			})
		return buildMemoryReply({ model, content: 'I cannot reach a tool for that.' })
	}
}

/**
 * Creates the control reply policy: on a declared request it never loads and calls the first advertised desk tool with no arguments, then answers.
 * @param prompts - The declared prompts; the control reads only which bodies a request opened, never the tool.
 * @returns A `MemoryScript` policy for `/api/chat`.
 */
export function createStudyDeskControl(
	prompts: ReadonlyMap<string, StudyDeskAssertion>,
): MemoryPolicy {
	return (value) => {
		const body = readStudyDeskBody(value)
		const first = body.tools.find((tool) =>
			STUDY_DESK_TOOLS.some((entry) => entry.name === tool.name),
		)
		if (
			findStudyDeskAnswer(prompts, body) === undefined ||
			first === undefined ||
			readStudyDeskTail(body).some((message) => message.role === 'tool')
		)
			return buildMemoryReply({ model: body.model, content: 'Here is what I know.' })
		return buildMemoryReply({
			model: body.model,
			content: '',
			calls: [{ function: { name: first.name, arguments: {} } }],
		})
	}
}

/**
 * Reads the authored `screen` profile with its provider rebound to the protocol fixture's `model`, unrecorded, for an in-process run.
 * @param url - The fixture origin.
 * @returns The parsed profile.
 * @throws Error - Thrown when the authored profile holds no settings.
 */
export function buildStudyDeskProfile(url: string): StudyProfile {
	const raw = parseJSON(readFileSync(resolve('studies/desk/profiles/screen.json'), 'utf8'))
	if (!isRecord(raw) || !isRecord(raw.settings)) throw new Error('Missing desk profile')
	return {
		...parseStudyProfile({
			...raw,
			provider: {
				entry: resolve('node_modules/@orkestrel/ollama/dist/src/core/index.js'),
				url,
				model: 'model',
				digest: { model: 'a'.repeat(64) },
			},
		}),
		record: undefined,
	}
}
