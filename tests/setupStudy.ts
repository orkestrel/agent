import type { StudySentenceInput, StudySentencePopulation } from '../studies/sentences/types.js'
import type {
	StudySentenceFixture,
	StudySentenceNoiseVector,
	StudySentenceSessionFixture,
	StudySentenceSessionFixtureOptions,
} from './studies/sentences/types.js'
import { StudySentenceDriver } from '../studies/sentences/StudySentenceDriver.js'
import type { StudyAdjudication } from '@orkestrel/study/server'
import type {
	MemoryAdmissionFixture,
	MemoryDifferentialFixture,
	MemoryDifferentialResult,
	MemoryContextFixture,
	MemoryDaemonFixture,
	MemoryDaemonRequest,
	MemoryFailureResult,
	MemoryFallbackResult,
	MemoryGradingFixture,
	MemoryNativeFixture,
	MemoryProfileFixture,
	MemoryReplyFixture,
	MemoryReplayFixture,
	MemoryReplayOptions,
	MemoryServerFixture,
	MemoryTrialFixture,
	MemoryTrialResult,
	MemoryUsageFixture,
	MemoryWireFixture,
	MemoryWorker,
	MemoryRecordingFixture,
	MemoryRecordingReading,
	MemoryRecordingResult,
	MemoryLedgerFixture,
	StudyInstallFixture,
	StudyInstallPackage,
	StudyInstallResult,
	StudyInstallOptions,
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
import type { StudyValidation, StudySealedResult, StudyGradeReading } from '@orkestrel/study/server'
import type { StudyMeterFixture, StudyToolsFixture } from './studies/tools/types.js'
import type { JSONValue } from '@orkestrel/contract'
import type {
	LedgerResult,
	LedgerOptions,
	LedgerInterface,
	ProviderInterface,
} from '@orkestrel/agent'
import type {
	StudyMemoryReceipt,
	StudyMemoryRequirement,
	StudyMemoryArm,
} from '../studies/memory/types.js'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import {
	isRecord,
	parseJSON,
	recordOf,
	objectOf,
	arrayOf,
	isString,
	isNumber,
} from '@orkestrel/contract'
import { createRecorder, waitForCondition, waitForAbort } from '@orkestrel/test'
import { createLoopback, isRunning, createScratch, destroyScratch } from '@orkestrel/test/server'
import {
	parseStudyProfile,
	parseStudyDefinition,
	parseStudyScenario,
	buildStudySchedule,
	validateStudyInputs,
	StudyControl,
	StudyMeter,
	StudyScope,
} from '@orkestrel/study'
import {
	hashStudyBytes,
	readStudyDeclaration,
	readStudyExchanges,
	readStudyResult,
	collectStudyEvidence,
	encodeStudyJSON,
} from '@orkestrel/study/server'
import { buildLedgerOptions, createScriptedProvider, ScriptedReads } from './setup.js'
import {
	StudyMemoryDriver,
	readStudyMemoryDifferential,
	readStudyMemoryGrade,
	isStudyMemoryLedgerOptions,
	isStudyMemoryLookupOptions,
	isStudyMemoryInstructionOptions,
} from '../studies/memory/index.js'
import * as agent from '../dist/src/core/index.js'
import * as provider from '@orkestrel/ollama'
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { cpSync, lstatSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isStudySentencePopulation } from '../studies/sentences/validators.js'
import sentencePopulation from '../studies/sentences/population.json'
import sentenceScenario from '../studies/memory/scenarios/endurance.json'
import sentenceDefinition from '../studies/sentences/study.json'
import sentenceProfile from '../studies/sentences/profiles/calibration.json'
import {
	buildStudySentenceDeclarations,
	buildStudySentenceManifest,
	sampleStudySentences,
	isStudySentenceSettings,
	isStudySentenceGoal,
} from '../studies/sentences/index.js'

/** Builds synthetic labels and exact public packets for consumer calibration proofs. @param url - Ephemeral protocol fixture origin. @returns A complete calibration fixture without reading frozen labels. */
export function buildStudySentenceCalibration(url = 'http://127.0.0.1:1'): StudySentenceFixture {
	const manifest = buildStudySentenceManifest(buildStudySentenceFixture())
	const labels = manifest.packets.map((packet, index) => ({
		id: packet.id,
		label:
			(packet.control?.intent ?? packet.constraint?.intent ?? index % 3 === 0)
				? ('yes' as const)
				: ('no' as const),
	}))
	const profile = parseStudyProfile({
		...sentenceProfile,
		agent: realpathSync('dist/src/core/index.js'),
		subject: realpathSync('dist/src/core/index.js'),
		roots: sentenceProfile.roots.map((root) => realpathSync(root)),
		provider: {
			entry: realpathSync('node_modules/@orkestrel/ollama/dist/src/core/index.js'),
			url,
			model: 'model',
			judge: 'judge',
			digest: { model: 'a'.repeat(64), judge: 'b'.repeat(64) },
		},
	})
	const generated = buildStudySentenceDeclarations(
		manifest,
		labels,
		{
			manifest: hashStudyBytes(encodeStudyJSON(manifest)),
			labels: hashStudyBytes(encodeStudyJSON(labels)),
			agent: hashStudyBytes(readFileSync('dist/src/core/index.js')),
		},
		profile,
	)
	const declarations = {
		...generated,
		profile: parseStudyProfile({
			...generated.profile,
			settings: { ...generated.profile.settings, version: 'fixture-1' },
			bounds: {
				...generated.profile.bounds,
				request: { ...generated.profile.bounds.request, duration: 10000 },
				goal: { ...generated.profile.bounds.goal, duration: 20000 },
				trial: { ...generated.profile.bounds.trial, duration: 120000 },
				series: { ...generated.profile.bounds.series, duration: 120000 },
			},
		}),
	}
	const population = buildCustodyManifest(
		parseStudyDefinition(sentenceDefinition),
		[declarations.scenario],
		declarations.profile.bounds,
	)
	const sample = sampleStudySentences(manifest, labels)
	const fixture = {
		manifest,
		labels,
		sample,
		declarations,
		input: { manifest: population, rubric: declarations.fitting, attempts: [], evidence: {} },
	}
	return { ...fixture, input: buildStudySentenceAdjudication(fixture) }
}

/** Owns an actual session and loopback protocol peer with deterministic cleanup. @param options - Inert replies and native deadlines. @returns A live session fixture whose caller closes every resource. */
export async function createStudySentenceSessionFixture(
	options: StudySentenceSessionFixtureOptions = {},
): Promise<StudySentenceSessionFixture> {
	const server = await createMemoryServer(options.responses)
	const fixture = buildStudySentenceCalibration(server.url)
	const declared = fixture.declarations.profile
	const profile = parseStudyProfile({
		...declared,
		record: undefined,
		bounds: {
			...declared.bounds,
			request: {
				...declared.bounds.request,
				duration: options.duration ?? declared.bounds.request.duration,
			},
		},
	})
	const context = createMemoryContext(profile, options.signal)
	try {
		const session = await new StudySentenceDriver({
			...STUDY_MEMORY_MODULES,
			profile,
			directory: process.cwd(),
		}).open(
			{ id: 'cpu', scenario: 'd1', arm: 'calibration', repetition: 0 },
			context.context.signal,
		)
		return {
			fixture,
			session,
			context,
			server,
			async close() {
				try {
					await session.close()
				} finally {
					context.close()
					await server.close()
				}
			},
		}
	} catch (error) {
		context.close()
		await server.close()
		throw error
	}
}

/** Checks exact response retention against the actual judge dispatch and request bytes. @param evidence - Retained transport evidence. @param goal - Executed goal identity. @param request - Actual encoded request body. @param body - Expected response bytes. @returns True if exactly one matching terminal retains the byte relationship; false otherwise. */
export function retainsStudySentenceResponse(
	evidence: readonly StudyEvidence[],
	goal: string,
	request: string,
	body: string,
): boolean {
	const dispatch = evidence.filter(
		(row) =>
			row.event === 'dispatch' &&
			row.goal === goal &&
			isRecord(row.value) &&
			row.value.role === 'judge' &&
			row.value.path === '/api/generate',
	)
	const value = dispatch[0]?.value
	if (dispatch.length !== 1 || !isRecord(value)) return false
	return (
		evidence.filter(
			(row) =>
				row.goal === goal &&
				isRecord(row.value) &&
				row.value.id === value.id &&
				row.value.role === 'judge' &&
				row.value.path === '/api/generate' &&
				row.value.status === 200 &&
				row.value.bytes === Buffer.byteLength(request) + Buffer.byteLength(body),
		).length === 1
	)
}

/** Builds retained synthetic scores and their independently shaped evidence rows. @param fixture - Public calibration declarations and synthetic labels. @param scores - Optional score overrides keyed by observation identity. @returns Complete custody-shaped adjudication inputs. */
export function buildStudySentenceAdjudication(
	fixture: StudySentenceFixture,
	scores: Readonly<Record<string, number>> = {},
): StudyAdjudication {
	const settings = fixture.declarations.profile.settings
	if (!isStudySentenceSettings(settings))
		throw new Error('Synthetic execution settings are malformed')
	const trial = fixture.input.manifest.schedule[0]
	if (trial === undefined) throw new Error('Synthetic trial is absent')
	const observations = fixture.declarations.scenario.goals.map((goal) => {
		if (!isStudySentenceGoal(goal.input)) throw new Error('Synthetic goal is malformed')
		const identity = goal.input.id
		const label = fixture.labels.find((entry) => entry.id === identity)
		return {
			goal: goal.id,
			executed: true,
			failure: undefined,
			duration: 1,
			usage: [],
			product: {
				partial: false,
				value: {
					id: goal.input.id,
					observation: goal.id,
					score: scores[goal.id] ?? (label?.label === 'yes' ? 0.9 : 0.1),
					digest: hashStudyBytes(encodeStudyJSON(goal.input)),
					binding: hashStudyBytes(encodeStudyJSON(settings.binding)),
				},
			},
		}
	})
	return {
		...fixture.input,
		attempts: [
			{ trial, executed: true, failure: undefined, duration: observations.length, observations },
		],
		evidence: {
			[trial.id]: observations.map((observation) => ({
				event: 'sentence',
				goal: observation.goal,
				value: observation.product.value,
			})),
		},
	}
}

/** Encodes one completed Ollama judge response with both candidate log probabilities. @param score - Desired Yes probability. @returns Protocol bytes consumed by the real installed decoder. */
export function renderStudySentenceReply(score: number): string {
	return JSON.stringify({
		model: 'judge',
		done: true,
		done_reason: 'length',
		response: score >= 0.5 ? 'Yes' : 'No',
		prompt_eval_count: 10,
		eval_count: 1,
		logprobs: [
			{
				token: score >= 0.5 ? 'Yes' : 'No',
				logprob: Math.log(Math.max(score, 1 - score)),
				top_logprobs: [
					{ token: 'Yes', logprob: Math.log(score) },
					{ token: 'No', logprob: Math.log(1 - score) },
				],
			},
		],
	})
}

/** Copies only this consumer's source and synthetic declarations into an owned CPU workspace. @param scratch - Exclusive workspace owner. @param fixture - Synthetic labels and ephemeral provider profile. @returns The run directory relative to that workspace. */
export function prepareStudySentenceWorkspace(
	scratch: ScratchInterface,
	fixture: StudySentenceFixture,
): string {
	for (const file of [
		'types.ts',
		'constants.ts',
		'helpers.ts',
		'validators.ts',
		'factories.ts',
		'StudySentenceAdapter.ts',
		'StudySentenceDriver.ts',
		'StudySentenceSession.ts',
		'index.ts',
		'study.json',
	])
		scratch.write(
			join('studies/sentences', file),
			readFileSync(resolve('studies/sentences', file), 'utf8'),
		)
	scratch.write(
		'studies/sentences/scenarios/d1.json',
		JSON.stringify(fixture.declarations.scenario),
	)
	scratch.write(
		'studies/sentences/profiles/calibration.json',
		JSON.stringify(fixture.declarations.profile),
	)
	scratch.write('studies/sentences/rubric.json', JSON.stringify(fixture.declarations.initial))
	scratch.write('run/fitting.json', JSON.stringify(fixture.declarations.fitting))
	scratch.write('run/validation.json', JSON.stringify(fixture.declarations.validation))
	return 'run'
}

/** Copies a loadable changed Agent entry for raw frozen-build admission controls. @param scratch - Exclusive workspace owner. @param fixture - Original declarations. @param receipt - If true, binds declarations to the copied bytes; if false, retains the earlier receipt. @returns Declarations selecting the explicitly admitted fixture package. */
export function prepareStudySentenceBuild(
	scratch: ScratchInterface,
	fixture: StudySentenceFixture,
	receipt: boolean,
): StudySentenceFixture {
	const profile = fixture.declarations.profile
	if (!isStudySentenceSettings(profile.settings)) throw new Error('Missing frozen settings')
	scratch.write(
		'candidate/package.json',
		JSON.stringify({ name: '@fixture/agent-drift', version: '0.0.0', type: 'module' }),
	)
	scratch.write(
		'candidate/dist/index.js',
		readFileSync(profile.agent, 'utf8') + '\n// Compatible frozen-build drift control.\n',
	)
	const candidate = resolve(scratch.path, 'candidate/dist/index.js')
	const selected = parseStudyProfile({
		...profile,
		agent: 'candidate/dist/index.js',
		subject: candidate,
		roots: [...profile.roots, resolve(scratch.path, 'candidate')],
	})
	const generated = buildStudySentenceDeclarations(
		fixture.manifest,
		fixture.labels,
		{ ...profile.settings.binding, agent: hashStudyBytes(readFileSync(candidate)) },
		selected,
	)
	const declarations = receipt
		? {
				...generated,
				profile: parseStudyProfile({
					...selected,
					settings: { ...generated.profile.settings, version: profile.settings.version },
				}),
			}
		: { ...fixture.declarations, profile: selected }
	return { ...fixture, declarations }
}

/** Retains a real CLI check reply then changes only profile whitespace before launcher admission. @param scratch - Exclusive workspace owner. @returns The fixture entry that delegates to the installed CLI. */
export function prepareStudySentenceDrift(scratch: ScratchInterface): string {
	return scratch.write(
		'profile-drift.ts',
		[
			"import { execFileSync } from 'node:child_process'",
			"import { appendFileSync } from 'node:fs'",
			`const stdout = execFileSync(process.execPath, [${JSON.stringify(resolve('node_modules/@orkestrel/study/dist/bin/main.js'))}, ...process.argv.slice(2)], { encoding: 'utf8', windowsHide: true })`,
			"appendFileSync('studies/sentences/profiles/calibration.json', '\\n')",
			'process.stdout.write(stdout)',
		].join('\n') + '\n',
	)
}

/** Builds the complete public sentence fixture with admitted real lexical helpers. @param population - Explicit declaration overrides for rejecting controls. @returns Real scenario and runtime without model access. */
export function buildStudySentenceFixture(
	population: Partial<StudySentencePopulation> = {},
): StudySentenceInput {
	if (!isStudySentencePopulation(sentencePopulation))
		throw new Error('Invalid public sentence declaration')
	return { scenario: sentenceScenario, agent, population: { ...sentencePopulation, ...population } }
}

/** Pins the public bounded draw's ordinal SHA-256 ranks, independently recomputable from the accepted tuples. */
export const STUDY_SENTENCE_DRAW = Object.freeze([
	'07a2741812654dbba437429af4d690fdd7695835514a6859f12d3cad5ae40699',
	'0ae7b6f642abcb177d64a6274a1f94c6179139940208fd9ea1e89f2e82dbb9ce',
	'0bc3e3dfbdd736154603749cb3123945cfa6093e96650cf2c09033d7e9f8c00a',
	'0cfd3605b2ccd3f366fe6555a8c3ecded43b8a6c1f2185164e70b525dc0265d4',
	'21cfecdcf0001eac370d7eddb1c4639570bd53e6d558cabfa76afb94111b7abf',
	'30592c9428f24d15d432d3b270a4b1f3cb2a1b9ecab7b4f7e5b44929bfaa2acf',
	'3180fec21c118b28513d7775ca3d915e2b4f29260b97f4da98bc8d7380686db9',
	'45af7e7bfc587d04ee84524baa31eb2e79086166d2f62e4c6af99b4fe70f744c',
])

/** Pins a lookup and correction trajectory without measuring requests before recording. */
export const STUDY_MEMORY_REPLAY_GOALS: readonly StudyGoal[] = Object.freeze([
	Object.freeze({
		id: 'opening',
		input: {
			prompt: 'Look up order-1 and retain the order count',
			arrivals: [{ id: 'source', content: 'The order count is three.' }],
			records: [{ id: 'order-1', name: 'Owner', content: 'The order count is three.' }],
		},
	}),
	Object.freeze({
		id: 'closure',
		input: {
			prompt: 'State the corrected order count',
			arrivals: [{ id: 'correction', content: 'Correction: the order count is two.' }],
			records: [{ id: 'order-1', name: 'Owner', content: 'The order count is two.' }],
		},
	}),
])

/** Lists each Ledger treatment whose passivity and positive controls are exercised. */
export const STUDY_MEMORY_DIFFERENTIAL_SWITCHES = Object.freeze(['lexical'] as const)

/** Supplies omitted and explicitly disabled treatment groups for full offline replay. */
export const STUDY_MEMORY_LEDGER_CONTROLS: Readonly<
	Record<string, Readonly<Record<string, JSONValue>>>
> = Object.freeze({
	omitted: Object.freeze({}),
	disabled: Object.freeze({ ledger: Object.freeze({ lexical: false }) }),
})

/** Supplies unknown keys and non-boolean treatment groups that admission must refuse. */
export const STUDY_MEMORY_LEDGER_INVALID: readonly unknown[] = Object.freeze([
	{ unknown: true },
	{ recent: 1 },
	{ work: 'true' },
	{ link: 1 },
	{ link: true },
	{ link: false },
	{ lexical: 'true' },
	{ link: undefined },
	null,
	[],
])

/** Supplies admitted lookup groups independently of the validator. */
export const STUDY_MEMORY_LOOKUP_VALID = Object.freeze([
	Object.freeze({}),
	Object.freeze({ grammar: false }),
	Object.freeze({ grammar: true }),
])

/** Supplies malformed lookup groups, including an explicitly undefined leaf. */
export const STUDY_MEMORY_LOOKUP_INVALID: readonly unknown[] = Object.freeze([
	null,
	[],
	{ unknown: true },
	{ grammar: 1 },
	{ grammar: 'true' },
	{ grammar: undefined },
])

/** Supplies admitted instruction groups independently of the validator. */
export const STUDY_MEMORY_INSTRUCTION_VALID = Object.freeze([
	Object.freeze({}),
	Object.freeze({ standing: false }),
	Object.freeze({ standing: true }),
])

/** Supplies malformed instruction groups, including an explicitly undefined leaf. */
export const STUDY_MEMORY_INSTRUCTION_INVALID: readonly unknown[] = Object.freeze([
	null,
	[],
	{ unknown: true },
	{ standing: 1 },
	{ standing: 'true' },
	{ standing: undefined },
])

/** Pins the public standing source identities independently of study policy. */
export const STUDY_MEMORY_STANDING_SOURCES: readonly string[] = Object.freeze([
	'endurance-desk',
	'ev-opening',
	'ev-register',
])

/** Pins the pre-treatment lookup description independently of production constants. */
export const STUDY_MEMORY_LOOKUP_DESCRIPTION =
	'Reads the latest released public reference snapshot by id'

/** Pins the complete single-sentence grammar extension independently of production constants. */
export const STUDY_MEMORY_GRAMMAR_DESCRIPTION =
	'Reads the latest released public reference snapshot by id. Pass an id of order:<order id> for an order or customer:<account id> for a customer account.'

/** Supplies the omitted, false, empty, and enabled recent-tail replay settings. */
export const STUDY_MEMORY_RECENT_TREATMENTS: MemoryRecordingFixture['treatments'] = Object.freeze({
	omitted: {},
	disabled: { ledger: { recent: false } },
	empty: { ledger: {} },
	enabled: { ledger: { recent: true } },
})

/** Supplies the omitted, false, empty, and enabled named-work replay settings. */
export const STUDY_MEMORY_WORK_TREATMENTS: MemoryRecordingFixture['treatments'] = Object.freeze({
	omitted: {},
	disabled: { ledger: { work: false } },
	empty: { ledger: {} },
	enabled: { ledger: { work: true } },
})

/** Supplies the omitted, false, empty, and enabled grammar replay settings. */
export const STUDY_MEMORY_GRAMMAR_TREATMENTS: MemoryRecordingFixture['treatments'] = Object.freeze({
	omitted: {},
	disabled: { lookup: { grammar: false } },
	empty: { lookup: {} },
	enabled: { lookup: { grammar: true } },
})

/** Supplies the omitted, false, empty, and enabled standing-instruction replay settings. */
export const STUDY_MEMORY_STANDING_TREATMENTS: MemoryRecordingFixture['treatments'] = Object.freeze(
	{
		omitted: {},
		disabled: { instructions: { standing: false } },
		empty: { instructions: {} },
		enabled: { instructions: { standing: true } },
	},
)

/** Supplies complete-own-key guard cases independently of the admitted-key constants. */
export const STUDY_MEMORY_GROUP_CASES = Object.freeze([
	Object.freeze({ name: 'ledger', leaf: 'recent', guard: isStudyMemoryLedgerOptions }),
	Object.freeze({ name: 'lookup', leaf: 'grammar', guard: isStudyMemoryLookupOptions }),
	Object.freeze({ name: 'instructions', leaf: 'standing', guard: isStudyMemoryInstructionOptions }),
])

/** Builds hidden invalid leaves, unknown string and symbol keys, and unreadable inputs.
 * @param leaf - The independently declared boolean member.
 * @returns Invalid plain records and unreadable objects every total group guard refuses.
 */
export function buildMemoryHiddenGroups(leaf: string): readonly unknown[] {
	const revoked = Proxy.revocable({}, {})
	revoked.revoke()
	return [
		Object.defineProperty({}, leaf, { value: 1 }),
		Object.defineProperty({}, leaf, { value: 'true' }),
		Object.defineProperty({}, 'unknown', { value: true }),
		Object.defineProperty({}, Symbol('unknown'), { value: true }),
		Object.defineProperty({}, leaf, {
			get: () => {
				throw new Error('unreadable')
			},
		}),
		new Proxy(
			{},
			{
				ownKeys: () => {
					throw new Error('unreadable')
				},
			},
		),
		revoked.proxy,
	]
}

/** Starts a real records session while recording its factory options and Ledger identity.
 * @param settings - Study settings passed unchanged to the driver.
 * @param responses - Native protocol replies, including pending or partial terminals.
 * @param direct - If `true`, uses the real Ollama provider directly so a protocol refusal reaches Ledger without Study accounting aborting its caller; if `false`, keeps the Study provider boundary.
 * @returns The live fixture whose caller closes every resource.
 */
export async function createMemoryLedgerFixture(
	settings: StudyProfile['settings'],
	responses: readonly MemoryWireFixture[] = [],
	direct = false,
): Promise<MemoryLedgerFixture> {
	const server = await createMemoryServer(responses)
	const profile = buildMemoryProfile({ url: server.url, settings })
	const context = createMemoryContext(profile)
	const recorder = createRecorder<readonly [LedgerOptions, LedgerInterface]>()
	try {
		const session = await new StudyMemoryDriver({
			...STUDY_MEMORY_MODULES,
			agent: {
				...agent,
				createLedger: (upstream: ProviderInterface, options: LedgerOptions) => {
					const ledger = agent.createLedger(
						direct ? provider.createOllama({ url: server.url, model: 'model' }) : upstream,
						options,
					)
					recorder.handler(options, ledger)
					return ledger
				},
			},
			profile,
		}).open(
			{ id: 'handlers', scenario: 'public', arm: 'records', repetition: 0 },
			context.context.signal,
		)
		const [captured] = recorder.calls
		if (captured === undefined) {
			await session.close()
			throw new Error('Missing real Ledger factory call')
		}
		const [options, ledger] = captured
		return {
			session,
			ledger,
			options,
			server,
			context,
			async close() {
				try {
					await session.close()
				} finally {
					context.close()
					await server.close()
				}
			},
		}
	} catch (error) {
		context.close()
		await server.close()
		throw error
	}
}

/** Builds gated first-pass and answer-pass refusals after successful real calibration.
 * @param signal - The fixture gate that releases the pending first response.
 * @returns Native protocol replies that make the real Ledger response reject.
 */
export function buildMemoryRejectedWorkResponses(
	signal: AbortSignal,
): readonly MemoryWireFixture[] {
	return [
		{ path: '/api/chat', body: buildMemoryReply() },
		{ path: '/api/chat', body: buildMemoryReply() },
		{ path: '/api/chat', body: 'Rejected work', status: 500, signal },
		{ path: '/api/chat', body: 'Rejected answer pass', status: 500 },
	]
}

/** Builds distinct partial passes and later complete products for work-identity controls.
 * @returns Native replies whose last eligible partial answer differs from the first pass.
 */
export function buildMemoryPartialWorkResponses(): readonly MemoryWireFixture[] {
	return [
		{ path: '/api/chat', body: buildMemoryReply() },
		{ path: '/api/chat', body: buildMemoryReply() },
		{ path: '/api/chat', body: buildMemoryReply({ content: 'Earlier partial pass.' }) },
		{ path: '/api/chat', body: buildMemoryReply({ content: STUDY_MEMORY_WORK_REPLY }) },
		{ path: '/api/chat', body: buildMemoryReply({ content: 'Later complete draft.' }) },
		{ path: '/api/chat', body: buildMemoryReply() },
	]
}

/** Pins a later request that names both earlier products. */
export const STUDY_MEMORY_WORK_COMPARISON: StudyGoal = Object.freeze({
	id: 'goal-3',
	input: { prompt: 'Compare goal-1 and goal-2.', arrivals: [], records: [] },
})

/** Builds the default-off treatment axis independently of observation settings.
 * @param arm - The arm whose treatment groups are admitted.
 * @returns Omitted settings, explicit false leaves, omitted groups, and empty groups.
 */
export function buildMemoryPassiveTreatments(
	arm: StudyMemoryArm,
): Readonly<Record<string, Readonly<Record<string, JSONValue>> | undefined>> {
	return {
		omitted: undefined,
		disabled: {
			lookup: { grammar: false },
			...(arm === 'records' ? { ledger: { lexical: false, recent: false, work: false } } : {}),
			...(arm === 'compaction' ? { instructions: { standing: false } } : {}),
		},
		ungrouped: {},
		empty: {
			lookup: {},
			...(arm === 'records' ? { ledger: {} } : {}),
			...(arm === 'compaction' ? { instructions: {} } : {}),
		},
	}
}

/** Builds linked receipt identities for normalization and changed-plan controls.
 * @param prefix - The run's minted identity prefix.
 * @param owner - The public owner retained by its plan.
 * @returns A valid pass receipt with arrival, recap, and prior-message joins.
 */
export function buildMemoryDifferentialReceipt(
	prefix: string,
	owner = 'owner',
): StudyMemoryReceipt {
	return {
		request: `${prefix}-request`,
		messages: ['arrival', 'recap', 'history', 'request'].map((id) => `${prefix}-${id}`),
		pass: 0,
		role: 'agent',
		arrivals: [{ id: 'receipt', message: `${prefix}-arrival` }],
		recaps: [`${prefix}-recap`],
		stop: undefined,
		receipt: {
			calls: [{ selection: 0, estimate: 50, tools: 1, prompt: 30, completion: 5, thinking: 2 }],
			selections: [
				{
					turn: 0,
					tail: [`${prefix}-arrival`, `${prefix}-recap`, `${prefix}-history`, `${prefix}-request`],
					prior: [`${prefix}-history`],
					plan: {
						owners: [owner],
						filed: [`${prefix}-arrival`, `${prefix}-history`],
						rendered: [`${prefix}-arrival`],
						omitted: [`${prefix}-history`],
						trims: 1,
						sentences: [{ source: `${prefix}-arrival`, sentence: 0 }],
						withdrawn: [{ earlier: `${prefix}-history`, later: `${prefix}-arrival` }],
					},
					sources: [
						{ source: `${prefix}-arrival`, carriage: 'record' },
						{ source: `${prefix}-history`, carriage: 'absent' },
						{ source: `${prefix}-recap`, carriage: 'recap' },
					],
				},
			],
		},
	}
}

/** Builds a pass whose earlier messages retain their conversation order outside the selection.
 * @param prefix - The run's minted identity prefix.
 * @param pass - The retained pass index.
 * @returns A receipt with independent earlier and unanchored message identities.
 */
export function buildMemoryIdentityReceipt(prefix: string, pass: number): StudyMemoryReceipt {
	return {
		request: `${prefix}-request`,
		messages: ['earlier', 'later', 'unseen-1', 'unseen-2', 'request'].map(
			(id) => `${prefix}-${id}`,
		),
		pass,
		role: 'agent',
		arrivals: [],
		recaps: [],
		stop: undefined,
		receipt: {
			calls: [],
			selections: [
				{
					turn: undefined,
					tail: [`${prefix}-earlier`, `${prefix}-later`, `${prefix}-request`],
					prior: [],
					sources: [],
					plan: {
						owners: [],
						filed: [],
						rendered: [],
						omitted: [],
						sentences: [],
						withdrawn: [],
						trims: 0,
					},
				},
			],
		},
	}
}

/** Captures the exact options passed to the real Ledger factory without executing a goal.
 * @param settings - The memory study settings admitted by the driver.
 * @returns The factory's unchanged option objects after the real session closes.
 */
export async function captureMemoryLedgerOptions(
	settings: StudyProfile['settings'],
): Promise<readonly LedgerOptions[]> {
	const recorder = createRecorder<readonly [LedgerOptions]>()
	const driver = new StudyMemoryDriver({
		...STUDY_MEMORY_MODULES,
		agent: {
			...agent,
			createLedger: (upstream: ProviderInterface, options: LedgerOptions) => {
				recorder.handler(options)
				return agent.createLedger(upstream, options)
			},
		},
		profile: buildMemoryProfile({ url: 'http://127.0.0.1:1', settings }),
	})
	const session = await driver.open(
		{ id: 'capture', scenario: 'public', arm: 'records', repetition: 0 },
		new AbortController().signal,
	)
	try {
		return recorder.calls.map(([options]) => options)
	} finally {
		await session.close()
	}
}

/** Builds unkeyed lookup content whose rare query terms reach lexical discovery.
 * @returns Goals and native replies that expose the lexical treatment.
 */
export function buildMemoryLexicalFixture(): MemoryDifferentialFixture {
	return {
		ordinal: 27,
		marker: 'Amber zephyr quartz requires a signature.',
		goals: [
			{
				id: 'opening',
				input: {
					prompt: 'Read the public reference snapshot.',
					arrivals: Array.from({ length: 8 }, (_, index) => ({
						id: `padding-${index}`,
						content: 'Blue green violet.',
					})),
					records: [
						{
							id: 'BW-20931',
							name: 'Brightwater Studio',
							content: 'Amber zephyr quartz requires a signature.',
						},
					],
				},
			},
			{
				id: 'closure',
				input: { prompt: 'What does amber zephyr quartz require?', arrivals: [], records: [] },
			},
		],
		responses: [
			...Array.from({ length: 2 }, () => ({ path: '/api/chat', body: buildMemoryReply() })),
			{
				path: '/api/chat',
				body: buildMemoryReply({
					content: '',
					calls: [{ function: { name: 'lookup', arguments: { id: 'BW-20931' } } }],
				}),
			},
			{ path: '/api/chat', body: buildMemoryReply({ content: 'Reference retained.' }) },
			{ path: '/api/chat', body: buildMemoryReply({ content: 'Signature required.' }) },
		],
	}
}

/** Builds a recording with no lookup units for either treatment to select.
 * @returns A single goal and its calibration and answer replies.
 */
export function buildMemoryInertFixture(): MemoryDifferentialFixture {
	return {
		marker: '',
		goals: [
			{ id: 'opening', input: { prompt: 'Acknowledge the desk.', arrivals: [], records: [] } },
		],
		responses: Array.from({ length: 3 }, () => ({ path: '/api/chat', body: buildMemoryReply() })),
	}
}

/** Replays a sealed fixture offline with declared treatment settings and retains interrupted results.
 * @param fixture - The installed memory fixture.
 * @param baseline - The sealed recording.
 * @param target - A fresh scratch-relative result directory.
 * @param settings - Settings merged into the recording profile.
 * @returns The native outcome and retained sealed or interrupted replay.
 */
export async function replayMemoryDifferential(
	fixture: MemoryReplayFixture,
	baseline: StudySealedResult,
	target: string,
	settings: Readonly<Record<string, JSONValue>>,
): Promise<MemoryDifferentialResult> {
	const prefix = Object.fromEntries(
		await Promise.all(
			baseline.manifest.schedule.map(async (trial) => [
				trial.id,
				(await readStudyExchanges(baseline, trial.id)).completion.count,
			]),
		),
	)
	fixture.scratch.write(
		'studies/memory/profiles/local.json',
		JSON.stringify({
			...fixture.profile,
			settings: { ...fixture.profile.settings, ...settings },
		}),
	)
	const output = join(fixture.scratch.path, target)
	const command = await executeStudyInstall(
		fixture,
		[
			'execute',
			'memory',
			'--out',
			output,
			'--replay',
			baseline.directory,
			'--prefix',
			JSON.stringify(prefix),
			'--offline',
			'true',
		],
		120000,
	)
	return { command, result: await readStudyResult(output) }
}

/** Records inert replies, replays treatments offline, and releases every fixture resource.
 * @param options - The public goal horizon, arm, and treatment settings.
 * @returns The sealed baseline and strict differential for every treatment.
 * @throws Error - Thrown when recording does not seal or its trial is absent.
 */
export async function executeMemoryRecording(
	options: MemoryRecordingFixture,
): Promise<MemoryRecordingResult> {
	const scratch = createScratch({ parent: resolve('tmp/units'), prefix: 'proto-wiring-fixture-' })
	const server = await createMemoryServer(options.responses).catch(async (error: unknown) => {
		await destroyScratch(scratch)
		throw error
	})
	try {
		const fixture = createMemoryReplayFixture(scratch, server.url, options.arm, {
			goals: options.goals,
			settings: { observe: true },
			...(options.room === undefined ? {} : { room: options.room }),
		})
		const output = join(scratch.path, 'recorded')
		const command = await executeStudyInstall(
			fixture,
			['execute', 'memory', '--out', output],
			120000,
		)
		if (command.code !== 0) throw new Error(JSON.stringify(command))
		const baseline = await readStudyResult(output)
		if (baseline.status !== 'sealed') throw new Error('CPU recording did not seal')
		const [trial] = baseline.manifest.schedule
		if (trial === undefined) throw new Error('Missing CPU recording trial')
		const history = await readStudyExchanges(baseline, trial.id)
		const evidence = (await collectStudyEvidence(baseline))[trial.id]
		if (evidence === undefined) throw new Error('Missing CPU recording evidence')
		const sent = server.requests.length
		const readings: MemoryRecordingReading[] = []
		for (const [name, settings] of Object.entries(options.treatments)) {
			const replay = await replayMemoryDifferential(fixture, baseline, name, settings)
			readings.push({
				name,
				command: replay.command,
				status: replay.result.status,
				differential: await readStudyMemoryDifferential({
					baseline,
					replay: replay.result,
					trial: trial.id,
				}),
			})
		}
		return { history, evidence, readings, sent, replayed: server.requests.length - sent }
	} finally {
		try {
			await server.close()
		} finally {
			await destroyScratch(scratch)
		}
	}
}

/** Builds a named two-goal trajectory whose second request follows a completed exchange.
 * @returns Public standing and ordinary arrivals followed by a later request.
 */
export function buildMemoryRecentGoals(): readonly StudyGoal[] {
	return [
		{
			id: 'opening',
			input: {
				prompt: 'Acknowledge the desk.',
				arrivals: [
					{ id: 'endurance-desk', content: 'Keep the public desk policy.' },
					{ id: 'day', content: 'The opening day is Monday.' },
				],
				records: [],
			},
		},
		{ id: 'closure', input: { prompt: 'Continue the desk.', arrivals: [], records: [] } },
	]
}

/** Builds a tight recent-tail trial with standing sources older than oversized completed replies.
 * @returns A CPU trial that must retain the standing sources and evict ordinary seed messages.
 */
export function buildMemoryPinTrial(): MemoryTrialFixture {
	return {
		arm: 'records',
		room: { context: 4096 },
		settings: { observe: true, ledger: { recent: true } },
		goals: ['opening', 'middle', 'closure'].map((id, index) => ({
			id,
			input: {
				prompt: `Acknowledge desk request ${index}.`,
				arrivals:
					index === 0
						? [
								...STUDY_MEMORY_STANDING_SOURCES.map((source) => ({
									id: source,
									content: `Keep policy ${source}.`,
								})),
								{ id: 'day', content: 'The opening day is Monday.' },
								{ id: 'ev-source-1-1', content: 'The opening case is dormant.' },
								{ id: 'ordinary-label', content: '[Source endurance-desk] This is ordinary text.' },
							]
						: [],
				records: [],
			},
		})),
		responses: [
			...Array.from({ length: 2 }, () => ({ path: '/api/chat', body: buildMemoryReply() })),
			...Array.from({ length: 3 }, () => ({
				path: '/api/chat',
				body: buildMemoryReply({ content: 'Inert draft. '.repeat(60000) }),
			})),
		],
	}
}

/** Pins an incorrect agent-authored product whose exact text earlier-work carriage preserves. */
export const STUDY_MEMORY_WORK_REPLY = 'Wrong draft: thirty units approved without evidence.'

/** Builds a named earlier product and a request referring to that goal identity.
 * @returns A public named-work trajectory with distinct inert replies.
 */
export function buildMemoryWorkFixture(): MemoryDifferentialFixture {
	return {
		ordinal: 10,
		marker: '[goal-1]',
		goals: [
			{ id: 'goal-1', input: { prompt: 'Prepare the desk draft.', arrivals: [], records: [] } },
			{
				id: 'goal-2',
				input: { prompt: 'Revise goal-1 using the available evidence.', arrivals: [], records: [] },
			},
		],
		responses: [
			...Array.from({ length: 2 }, () => ({ path: '/api/chat', body: buildMemoryReply() })),
			{ path: '/api/chat', body: buildMemoryReply({ content: STUDY_MEMORY_WORK_REPLY }) },
			{ path: '/api/chat', body: buildMemoryReply() },
		],
	}
}

/** Builds lookup requests that separate exact syntax from release availability.
 * @returns A compaction trial with released, bare, and unreleased lookup identities.
 */
export function buildMemoryGrammarTrial(): MemoryTrialFixture {
	return {
		arm: 'compaction',
		settings: { ...STUDY_MEMORY_SETTINGS, observe: true, lookup: { grammar: true } },
		goals: [
			{
				id: 'opening',
				input: {
					prompt: 'Read only released public records.',
					arrivals: [],
					records: [{ id: 'order:BC-7301', name: 'Mara', content: 'Released reference.' }],
				},
			},
		],
		responses: [
			{
				path: '/api/chat',
				body: buildMemoryReply({
					content: '',
					calls: ['order:BC-7301', 'BC-7301', 'customer:BC-4101'].map((id) => ({
						function: { name: 'lookup', arguments: { id } },
					})),
				}),
			},
			{ path: '/api/chat', body: buildMemoryReply() },
		],
	}
}

/** Builds short released standing sources and one ordinary arrival for opening carriage.
 * @returns One public opening goal without a compaction fold.
 */
export function buildMemoryStandingGoals(): readonly StudyGoal[] {
	return [
		{
			id: 'opening',
			input: {
				prompt: 'Acknowledge the desk.',
				arrivals: [
					{ id: 'endurance-desk', content: 'Preserve the public policy.' },
					{ id: 'ev-opening', content: 'Keep the grant obligation open.' },
					{ id: 'ev-register', content: 'Preserve distinct account identities.' },
					{ id: 'ordinary', content: 'This arrival stays in conversation.' },
				],
				records: [],
			},
		},
	]
}

/** Builds late standing releases across repeated real folds with summaries that omit their text.
 * @returns A compaction trial whose agent requests retain only the standing sources released so far.
 */
export function buildMemoryStandingTrial(): MemoryTrialFixture {
	return {
		arm: 'compaction',
		room: STUDY_MEMORY_SUMMARY_ROOM,
		settings: { ...STUDY_MEMORY_SETTINGS, observe: true, instructions: { standing: true } },
		goals: STUDY_MEMORY_STANDING_SOURCES.map((source, index) => ({
			id: `release-${index}`,
			input: {
				prompt: 'Retain the released policy.',
				arrivals: [
					{ id: source, content: `Standing text for ${source}.` },
					...(index === 0
						? []
						: Array.from({ length: 8 }, (_, position) => ({
								id: `ordinary-${index}-${position}`,
								content: 'Public case detail. '.repeat(60),
							}))),
				],
				records: [],
			},
		})),
		responses: [
			{ path: '/api/chat', body: buildMemoryReply() },
			...Array.from({ length: 2 }, () => [
				{ path: '/api/chat', body: buildMemoryReply({ content: 'Recap omits standing text.' }) },
				{ path: '/api/chat', body: buildMemoryReply() },
			]).flat(),
		],
	}
}

/** Declares each public packet dry run with exactly one enabled prototype. */
export const STUDY_MEMORY_PROTOTYPE_DRY_RUNS = Object.freeze([
	Object.freeze({
		name: 'R1',
		arm: 'records' as const,
		enabled: { ledger: { recent: true } },
		disabled: { ledger: { recent: false } },
	}),
	Object.freeze({
		name: 'R2',
		arm: 'records' as const,
		enabled: { ledger: { work: true } },
		disabled: { ledger: { work: false } },
	}),
	Object.freeze({
		name: 'Q3a',
		arm: 'compaction' as const,
		enabled: { lookup: { grammar: true } },
		disabled: { lookup: { grammar: false } },
	}),
	Object.freeze({
		name: 'Q1',
		arm: 'compaction' as const,
		enabled: { instructions: { standing: true } },
		disabled: { instructions: { standing: false } },
	}),
])

/** Reads only the public packet or lineage's opening goals for an inert CPU dry run.
 * @param arm - The records packet or compaction lineage selection.
 * @returns The opening public goals, with hidden grading declarations absent.
 */
export function readMemoryPrototypeGoals(arm: 'records' | 'compaction'): readonly StudyGoal[] {
	const name = arm === 'records' ? 'records-packet.json' : 'compaction-lineage.json'
	return parseStudyScenario(
		parseJSON(readFileSync(resolve('studies/memory/scenarios', name), 'utf8')),
	).goals.slice(0, 5)
}

/** Builds the public recording horizon, adding arrivals that force a compaction fold.
 * @param arm - The treatment being recorded.
 * @returns The lookup and correction goals, with a folding opening on compaction.
 */
export function buildMemoryReplayGoals(arm: 'records' | 'compaction'): readonly StudyGoal[] {
	if (arm === 'records') return STUDY_MEMORY_REPLAY_GOALS
	const [opening, closure] = STUDY_MEMORY_REPLAY_GOALS
	if (opening === undefined || closure === undefined || !isRecord(opening.input))
		throw new Error('Missing recording goals')
	return [
		{
			...opening,
			input: {
				...opening.input,
				arrivals: [
					...Array.from({ length: 7 }, (_, index) => ({
						id: `fold-${index}`,
						content: 'Retain the public obligation. '.repeat(41),
					})),
					{ id: 'source', content: 'The order count is three.' },
				],
			},
		},
		closure,
	]
}

/** Builds summary, lookup and distinct per-goal replies for an open recording.
 * @param arm - The treatment whose protocol requests receive the replies.
 * @returns Ordered chat replies; metadata and judge use the fixture's protocol defaults.
 */
export function buildMemoryReplayResponses(
	arm: 'records' | 'compaction',
): readonly MemoryWireFixture[] {
	return [
		...(arm === 'compaction'
			? [{ path: '/api/chat', body: buildMemoryReply({ content: 'Public obligations retained.' }) }]
			: []),
		...(arm === 'records'
			? Array.from({ length: 2 }, () => ({ path: '/api/chat', body: buildMemoryReply() }))
			: []),
		{
			path: '/api/chat',
			body: buildMemoryReply({
				content: '',
				calls: [{ function: { name: 'lookup', arguments: { id: 'order-1' } } }],
			}),
		},
		...['Initial count is three.', 'Corrected count is two.'].map((content) => ({
			path: '/api/chat',
			body: buildMemoryReply({ content }),
		})),
	]
}

/** Captures installed runtimes and authors a bounded open recording without calibration.
 * @param scratch - Exclusive fixture owner.
 * @param url - Ephemeral protocol peer.
 * @param arm - The treatment being recorded.
 * @param options - Optional goal horizon and execution-owned daemon.
 * @returns The installed command and recording profile.
 */
export function createMemoryReplayFixture(
	scratch: ScratchInterface,
	url: string,
	arm: 'records' | 'compaction',
	options: MemoryReplayOptions = {},
): MemoryReplayFixture {
	const fixture = createStudyInstallFixture(scratch, url)
	const base = buildMemoryProfile({
		url,
		room: { ...(arm === 'compaction' ? STUDY_MEMORY_SUMMARY_ROOM : {}), ...options.room },
	})
	const goals = options.goals ?? buildMemoryReplayGoals(arm)
	const installed = parseStudyProfile(
		parseJSON(scratch.read('studies/memory/profiles/local.json') ?? ''),
	)
	const { qualification: _qualification, ...selected } = installed
	if (selected.provider === undefined) throw new Error('Missing recording provider')
	const profile = parseStudyProfile({
		...selected,
		room: base.room,
		bounds: {
			...selected.bounds,
			request: { ...selected.bounds.request, duration: 15000, tokens: base.bounds.request.tokens },
		},
		provider: {
			...selected.provider,
			...(options.daemon === undefined ? {} : { daemon: options.daemon }),
		},
		record: { bytes: 4194304, calls: 256, duration: 60000 },
		settings: {
			version: 'fixture-1',
			metadata: { calls: 64, bytes: 1048576, duration: 30000 },
			...(arm === 'compaction' ? STUDY_MEMORY_SETTINGS : {}),
			...options.settings,
		},
	})
	scratch.write('studies/memory/profiles/local.json', JSON.stringify(profile))
	scratch.write(
		'studies/memory/study.json',
		JSON.stringify({
			name: 'memory',
			version: '1',
			question: 'Does memory replay preserve the product?',
			purpose: 'mechanism',
			driver: 'memory',
			arms: [arm],
			scenarios: ['replay'],
			order: [[arm]],
			retries: 0,
			rubric: 'rubric.json',
		}),
	)
	writeMemoryReplayHorizon(scratch, goals)
	// This boundary records process identities while returning the actual authored adapter unchanged.
	scratch.write(
		'studies/memory/index.ts',
		`
import { appendFileSync } from 'node:fs'
import { createStudyAdapter as createMemoryAdapter } from './factories.js'
export function createStudyAdapter() {
	appendFileSync(new URL('../../workers.jsonl', import.meta.url), JSON.stringify({ pid: process.pid, tz: process.env.TZ, lang: process.env.LANG, intl: Intl.DateTimeFormat().resolvedOptions() }) + '\\n')
	return createMemoryAdapter()
}
`,
	)
	return { ...fixture, profile }
}

/** Reads every retained worker's resolved Intl options without dropping malformed rows.
 * @param scratch - The fixture that owns the worker journal.
 * @returns Validated worker observations in launch order.
 * @throws Error - Thrown when a worker row is malformed.
 */
export function readMemoryWorkers(scratch: ScratchInterface): readonly MemoryWorker[] {
	const rows = (scratch.read('workers.jsonl') ?? '')
		.split(/\r\n|\n/)
		.filter(Boolean)
		.map(parseJSON)
	if (
		!arrayOf(
			recordOf({
				pid: isNumber,
				tz: isString,
				lang: isString,
				intl: objectOf({ locale: isString, timeZone: isString }),
			}),
		)(rows)
	)
		throw new Error('Malformed memory worker observation')
	return rows
}

/** Writes a recording scenario and its matching operational rubric without changing executable bytes.
 * @param scratch - Owner of the authored consumer tree.
 * @param goals - The complete ordered horizon, including the ancestor's unchanged prefix.
 * @returns Nothing after both declarations are retained.
 */
export function writeMemoryReplayHorizon(
	scratch: ScratchInterface,
	goals: readonly StudyGoal[],
): void {
	scratch.write('studies/memory/scenarios/replay.json', JSON.stringify({ id: 'replay', goals }))
	scratch.write(
		'studies/memory/rubric.json',
		JSON.stringify({
			version: '1',
			criteria: goals.map((goal) => ({
				id: goal.id,
				scenario: 'replay',
				goal: goal.id,
				method: 'state',
				critical: true,
				assertion: { observation: 'operational' },
			})),
		}),
	)
}

/** Reserves an origin and declares a Node 24 protocol stand-in owned by Study execution.
 * @param scratch - Owner of the preload, process receipts and request journal.
 * @param target - The memory protocol peer receiving unchanged model requests.
 * @returns A declaration and cleanup boundary; no daemon is started by this factory.
 */
export async function createMemoryDaemonFixture(
	scratch: ScratchInterface,
	target: string,
): Promise<MemoryDaemonFixture> {
	const reserved = await createLoopback(createServer())
	const url = reserved.url
	await reserved.destroy()
	if (new URL(url).port === '11434') throw new Error('Reserved the forbidden daemon port')
	const executable = realpathSync(process.execPath)
	const preload = scratch.write(
		'daemon.ts',
		readFileSync(resolve('tests/studies/memory/fixtures/daemon.ts'), 'utf8'),
	)
	return {
		url,
		declaration: {
			executable,
			digest: hashStudyBytes(readFileSync(executable)),
			version: 'fixture-1',
			environment: {
				NODE_OPTIONS: `--import=${pathToFileURL(preload).href}`,
				MEMORY_DAEMON_TARGET: target,
				MEMORY_DAEMON_REQUESTS: join(scratch.path, 'daemon-requests.jsonl'),
				MEMORY_DAEMON_PIDS: join(scratch.path, 'daemon-pids.jsonl'),
				MEMORY_DAEMON_EVIDENCE: scratch.path,
				MEMORY_DAEMON_VERSION: 'fixture-1',
			},
			models: [
				{ name: 'model', digest: 'a'.repeat(64) },
				{ name: 'judge', digest: 'b'.repeat(64) },
			],
		},
		get requests() {
			return readMemoryDaemonRequests(scratch.read('daemon-requests.jsonl') ?? '')
		},
		get pids() {
			return readMemoryDaemonPids(scratch.read('daemon-pids.jsonl') ?? '')
		},
		async close() {
			for (const pid of readMemoryDaemonPids(scratch.read('daemon-pids.jsonl') ?? '')) {
				if (isRunning(pid)) process.kill(pid, 'SIGKILL')
				await waitForCondition('memory daemon process exit', () => !isRunning(pid), {
					budget: 10000,
				})
			}
		},
	}
}

/** Reads the complete request journal produced by the Node preload.
 * @param text - LF-framed received requests.
 * @returns Validated requests and their durable sidecar positions.
 */
export function readMemoryDaemonRequests(text: string): readonly MemoryDaemonRequest[] {
	return text
		.split(/\r\n|\n/)
		.filter(Boolean)
		.map((line) => {
			const row = parseJSON(line)
			if (
				!recordOf({
					method: isString,
					path: isString,
					body: isString,
					positions: arrayOf(recordOf({ ordinal: isNumber, goal: isString, stage: isString })),
				})(row)
			)
				throw new Error('Malformed daemon request journal')
			return row
		})
}

/** Reads process ids retained by the stand-in across ancestor and continuation executions.
 * @param text - LF-framed process ids.
 * @returns Positive integer process ids.
 */
export function readMemoryDaemonPids(text: string): readonly number[] {
	return text
		.split(/\r\n|\n/)
		.filter(Boolean)
		.map((line) => {
			const pid = parseJSON(line)
			if (typeof pid !== 'number' || !Number.isSafeInteger(pid) || pid <= 0)
				throw new Error('Malformed daemon process receipt')
			return pid
		})
}

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
 * @param options - Environment overrides inherited by the command's fresh workers.
 * @returns Native exit and separate stdout/stderr bytes.
 */
export function executeStudyInstall(
	fixture: StudyInstallFixture,
	arguments_: readonly string[],
	duration = 60000,
	options: StudyInstallOptions = {},
): Promise<StudyInstallResult> {
	return executeStudyProcess(
		[fixture.entry, ...arguments_],
		fixture.scratch.path,
		duration,
		options,
	)
}

/** Executes a real Node entry with bounded output and preserves failure diagnostics.
 * @param arguments_ - Exact Node arguments, including its JavaScript entry.
 * @param root - Native working directory.
 * @param duration - Outer process deadline in milliseconds.
 * @param options - Environment overrides merged by case-insensitive name.
 * @returns Native exit and separate stdout/stderr bytes.
 */
export function executeStudyProcess(
	arguments_: readonly string[],
	root: string,
	duration: number,
	options: StudyInstallOptions = {},
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
				env: {
					...Object.fromEntries(
						Object.entries(process.env).filter(
							([name]) =>
								!Object.keys(options.environment ?? {}).some(
									(key) => key.toLowerCase() === name.toLowerCase(),
								),
						),
					),
					...options.environment,
				},
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
		if (request.url === '/api/version' && next?.path !== '/api/version') {
			response.end(JSON.stringify({ version: 'fixture-1' }))
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
		if (next !== undefined && next.path === request.url) {
			this.#pending = rest
			if (next.signal !== undefined) await waitForAbort(next.signal)
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
	lookup: Object.freeze(['found', 'id', 'message']),
	selection: Object.freeze([
		'arrivals',
		'messages',
		'pass',
		'recaps',
		'receipt',
		'request',
		'role',
	]),
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
export async function runMemoryFallback(): Promise<MemoryFallbackResult> {
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
		const result = await ledger.respond('Respond')
		return { ...result, messages: ledger.conversation.messages().map((message) => message.id) }
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

/** Lists the independent conversation identities used by the inert selection fixtures. */
export const STUDY_MEMORY_SELECTION_MESSAGES: readonly string[] = Object.freeze([
	'arrival-1',
	'request-1',
	'section-old',
	'request-2',
	'source',
	'request-3',
])

/** Builds declared carriage facts for the independent selection-class controls. @returns An owned pass value with a held source, a missing sentence and correct carriage. */
export function buildMemoryClassificationReceipt(): StudyMemoryReceipt {
	return {
		request: 'request',
		messages: ['held', 'wrong', 'correct', 'clean', 'verbatim', 'request'],
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

/** Normalizes only minted UUIDs and real clock values while preserving evidence fields and shape.
 * @param evidence - A finished trial's actual evidence.
 * @returns Stable evidence with consistent identity joins and clock-field presence retained.
 */
export function normalizeMemoryEvidence(evidence: readonly StudyEvidence[]): unknown {
	const serialized = JSON.stringify(evidence)
	const identities = new Map(
		[...new Set(serialized.match(/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}/gi))].map(
			(id, index) => [id, `identity:${index}`],
		),
	)
	// Canonical revisions include minted message ids; retain their equality joins after renaming.
	const revisions = [
		...new Set([...serialized.matchAll(/"revision":"([a-f0-9]{64})"/g)].map((match) => match[1])),
	]
	return normalizeMemoryEvidenceValue(
		evidence,
		new Map([
			...identities,
			...revisions.flatMap((revision, index): ReadonlyArray<[string, string]> =>
				revision === undefined ? [] : [[revision, `revision:${index}`]],
			),
		]),
	)
}

/** Projects evidence recursively without dropping optional keys or unrecognized stable fields.
 * @param value - An evidence subtree.
 * @param identities - The run's canonical minted identities.
 * @returns The normalized subtree.
 */
export function normalizeMemoryEvidenceValue(
	value: unknown,
	identities: ReadonlyMap<string, string>,
): unknown {
	if (typeof value === 'string')
		return (
			identities.get(value) ??
			value.replace(
				/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}/gi,
				(id) => identities.get(id) ?? id,
			)
		)
	if (Array.isArray(value))
		return value.map((entry) => normalizeMemoryEvidenceValue(entry, identities))
	if (!isRecord(value)) return value
	return Object.fromEntries(
		Object.entries(value).map(([key, entry]) => [
			key,
			['started', 'sent', 'elapsed', 'duration', 'time'].includes(key)
				? '<clock>'
				: normalizeMemoryEvidenceValue(entry, identities),
		]),
	)
}

/** Grades one arrival assertion against a run's actual products and evidence.
 * @param result - The finished run.
 * @param goals - Its executed goal declarations.
 * @returns The first arrival's grade, including its actual evidence reference.
 */
export function readMemoryArrivalGrade(
	result: MemoryTrialResult,
	goals: readonly StudyGoal[],
): StudyGradeReading {
	const fixture = buildMemoryGradingFixture()
	const [goal] = goals
	if (goal === undefined || !isRecord(goal.input) || !Array.isArray(goal.input.arrivals))
		throw new Error('Missing passivity arrival')
	const [arrival] = goal.input.arrivals
	if (!isRecord(arrival) || typeof arrival.id !== 'string') throw new Error('Missing arrival id')
	return readStudyMemoryGrade({
		trial: fixture.complete.trial,
		criterion: {
			...fixture.source,
			goal: goal.id,
			assertion: { observation: 'arrival', id: arrival.id },
		},
		attempt: {
			...fixture.complete.attempt,
			observations: goals.map((entry, index) => ({
				goal: entry.id,
				product: result.products[index],
				failure: undefined,
				usage: [],
				duration: 1,
				executed: true,
			})),
		},
		evidence: result.evidence,
	})
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

/** Returns independently fixed tuple hashes and selected noise members for the synthetic labels. @returns Canonical cell vectors in reduction order. */
export function buildStudySentenceNoiseVectors(): readonly StudySentenceNoiseVector[] {
	return [
		{
			partition: 'fitting',
			category: 'repeat',
			label: 'no',
			expected: [
				{
					id: '38ba154d78df5832643e6a0a6112fc1e57bc9a0af45b3d2ed486418e828b0e63',
					tuple: ['d1-repeat-v1', 'customer:BC-4101', 0, 'ev-source-13-2', 48, 0],
					rank: '08e1cb90872cae4dae9357a47f00a2e9759ec60b6f7a347c3e4dcef8ce2072eb',
				},
			],
		},
		{
			partition: 'fitting',
			category: 'repeat',
			label: 'yes',
			expected: [
				{
					id: 'f01d025864a690f54ee9d9c878511d897b3e56c1681b15903b10e24bc4e15115',
					tuple: ['d1-repeat-v1', 'fictional-0-2-earlier', 0, 'fictional-0-2-later', 0, 0],
					rank: '05fca6b3fe553a90004a8c7b97d8e55867a87d08b5ed4ab376e8f42c509bdf2e',
				},
			],
		},
		{
			partition: 'fitting',
			category: 'sham',
			label: 'no',
			expected: [
				{
					id: '713f91bf22038326cb4e0012e1e93fb3edf50e59d802a1b3afba3eb3f072ead6',
					tuple: ['d1-sham-v1', 'ev-source-16-1', 60, 'ev-source-16-3', 60, 0],
					rank: '01fcee59fdd4ae2c7d7724bacb0e71b026f437778e8737a1ef2816894e6247a3',
				},
				{
					id: '55fb87fdd1e26a3015aa5d9b40d2d6c5ae5b23a528a46c2b9de33731bd7f708b',
					tuple: ['d1-sham-v1', 'ev-source-21-1', 80, 'ev-source-21-2', 80, 3],
					rank: '03b95ace5709c3c7b5504ff24caa4e8793404c685a1a587b35fabc2ed9fcfef5',
				},
			],
		},
		{
			partition: 'fitting',
			category: 'sham',
			label: 'yes',
			expected: [
				{
					id: '192c85a80e28dd7fe34c20eabdd7cc7b1c212569d110f3dfdef6455cf1a5082d',
					tuple: ['d1-sham-v1', 'ev-source-5-2', 16, 'ev-source-17-1', 64, 0],
					rank: '06332e6ef215243cf19d267636b87db2193b3a883f631fd1a7676fe32d419f49',
				},
				{
					id: 'b005eaa3e158d4818c384f1f7dda77b365eb60f8c2d1eed284790873fed591c6',
					tuple: ['d1-sham-v1', 'ev-source-17-2', 64, 'ev-source-17-4', 64, 0],
					rank: '09f067196b161c9f16aea54452b9bb996e26e336ace5374e389d0919f2ecdf89',
				},
			],
		},
		{
			partition: 'validation',
			category: 'repeat',
			label: 'no',
			expected: [
				{
					id: '50ae1f67ae8102ea5108d282aad6cea506262aa0af2924cfa3d02887613b4c0d',
					tuple: ['d1-repeat-v1', 'fictional-1-7-earlier', 0, 'fictional-1-7-later', 0, 1],
					rank: '006c10a8072fb39b2eec7a2c0f0b69a07ba59c915b17ec169c8d501c42714879',
				},
				{
					id: '1870437a3e8a4042ad653166546b3a94ae4745a57341b4b718f5ac0b6b798f9b',
					tuple: ['d1-repeat-v1', 'ev-source-8-2', 28, 'ev-source-20-1', 76, 0],
					rank: '080e18cd7ee74f4cd6d41f97942d97bdf45ae339d0cba929c107698c9be5dfc0',
				},
			],
		},
		{
			partition: 'validation',
			category: 'repeat',
			label: 'yes',
			expected: [
				{
					id: '6013ae82d86d17a8de0c724d5718565536aaebf3f83d19e71f433dedf3abb405',
					tuple: ['d1-repeat-v1', 'ev-source-3-3', 8, 'ev-source-15-4', 56, 0],
					rank: '03ca7b41866594a66b26f44110b29b01e488b3dbbbdd15a766bc5c59560454f9',
				},
				{
					id: '1edbecd370cef7ac83b46b965a369bfd6e33b5c05072c4ca5a9961d927fa1f4b',
					tuple: ['d1-repeat-v1', 'ev-source-15-1', 56, 'ev-source-15-4', 56, 0],
					rank: '07450bebb9a4a0b6dca484565866e25fbcf25dca8bc7248669dc2aee1c85ef03',
				},
			],
		},
		{
			partition: 'validation',
			category: 'sham',
			label: 'no',
			expected: [
				{
					id: '1e504698ee462f28ff9554ce4278801ed6b6f137989af7b904d07f9ad2c5e55d',
					tuple: ['d1-sham-v1', 'ev-source-3-1', 8, 'ev-source-15-3', 56, 0],
					rank: '024dcee0ca781bbcb00543b0d632768f8d523ff1cff61ded7805d617a2d13d92',
				},
				{
					id: 'c9e2ac8b4a255194661eb6c6a28692105f48e4d0651ad1772791056c313265b1',
					tuple: ['d1-sham-v1', 'ev-source-2-3', 4, 'ev-source-14-2', 52, 2],
					rank: '035816181e2cb13bee53cc55dc282ce0302c12a9918f9744d3240719edb7d9f6',
				},
			],
		},
		{
			partition: 'validation',
			category: 'sham',
			label: 'yes',
			expected: [
				{
					id: 'e26f0806e25dd34780c92c008630e06c432d68c7743beee3adc89af08efa08a6',
					tuple: ['d1-sham-v1', 'ev-source-23-1', 88, 'ev-source-23-3', 88, 0],
					rank: '0b5fce5582c2f8dd16868d8ff2ce111a72f082e0dd267dd55e13fe277595d8a6',
				},
				{
					id: '861a5492de834000bd9f2df1947af6018c7d3d71675682d4979b489cd6d8b3cc',
					tuple: ['d1-sham-v1', 'ev-source-10-2', 36, 'ev-source-22-1', 84, 0],
					rank: '15f6e5368e2e7e9e6a832f85ecce00a25ddd5ba6af2e2aff41363e251286c0c5',
				},
			],
		},
	]
}
