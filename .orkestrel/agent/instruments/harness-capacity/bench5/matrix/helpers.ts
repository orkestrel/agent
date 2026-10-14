import type {
	MatrixAttempt,
	MatrixBound,
	MatrixBudget,
	MatrixCosts,
	MatrixExecution,
	MatrixDevelopment,
	MatrixFailure,
	MatrixFreeze,
	MatrixIdentity,
	MatrixOutcome,
	MatrixRequest,
	MatrixResource,
	MatrixRole,
	MatrixRun,
	MatrixDeployment,
	MatrixModel,
	MatrixCapacity,
} from './types.js'
import type { SustainedExecution, SustainedPolicy } from '../sustained/types.js'
import type { RefitFile } from '../refit/types.js'
import type { CallRole, Copy } from '../types.js'
import { readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { isFiniteNumber, isRecord } from '@orkestrel/contract'
import { DEFAULT_LEDGER_LIMIT, estimateMessages } from '../../vendor/agent-0.0.30-trimmed/index.js'
import { readCopy } from '../Driver.js'
import {
	COPIES_DIR,
	HARNESS,
	MICA_CALIBRATION,
	MICA_CONTEXT,
	MICA_MODEL,
	MODELS,
	SAMPLER,
} from '../constants.js'
import {
	buildSystem,
	matchesExposure,
	describeError,
	matchesSummaryBlock,
	readJSON,
	readScoreCarriers,
	readWireReading,
} from '../helpers.js'
import { INSTRUCTION_SUMMARIES, SUMMARIES_HEADING } from '../aggregates/constants.js'
import { collectSummaryBodies, countSoleTokens } from '../aggregates/helpers.js'
import {
	hashFile,
	verifyFiles,
	readRefitAssessment,
	selectMajorityCutoff,
} from '../refit/helpers.js'
import { MATRIX_ADMISSION, MATRIX_RESERVES } from './constants.js'
import {
	isMatrixAttempt,
	isMatrixExecution,
	isMatrixDevelopment,
	isMatrixFreeze,
	isMatrixResource,
	isMatrixDeployment,
	isMatrixSnapshot,
} from './validators.js'
import { parseMatrixRun } from './parsers.js'
import { isSustainedPolicy } from '../sustained/validators.js'
import { BUILD, readBuild } from '../build/helpers.js'
import { isRefitGeneration } from '../refit/validators.js'

/** Reads all hash-bound deployment evidence supplied by root. */
export function readDeployment(reference: RefitFile): MatrixDeployment {
	verifyFiles([reference])
	const value = readJSON(reference.path)
	if (!isMatrixDeployment(value)) throw new Error('invalid deployment receipt')
	if (
		value.environment.OLLAMA_NUM_PARALLEL !== '1' ||
		(value.environment.LLAMA_ARG_CONTEXT_SHIFT !== undefined &&
			value.environment.LLAMA_ARG_CONTEXT_SHIFT !== 'false' &&
			value.environment.LLAMA_ARG_CONTEXT_SHIFT !== '0')
	)
		throw new Error('deployment lacks serial allocation or disabled context shifting')
	verifyFiles([
		value.receipt,
		value.executable,
		value.runner,
		...value.controls,
		...value.models.map((model) => model.metadata),
	])
	if (new Set(value.models.map((model) => model.model)).size !== value.models.length)
		throw new Error('ambiguous deployment model mapping')
	for (const model of value.models) {
		const metadata = readJSON(model.metadata.path)
		if (
			!isRecord(metadata) ||
			!isRecord(metadata.model_info) ||
			metadata.model_info[model.field] !== model.context
		)
			throw new Error('deployment context metadata differs')
	}
	return value
}

/** Resolves only the explicit accepted manifest/backend mapping. */
export function readDeploymentModel(
	deployment: MatrixDeployment,
	role: Pick<MatrixRole, 'model' | 'digest'>,
): MatrixModel {
	const matches = deployment.models.filter(
		(model) =>
			model.model === role.model && model.digest === role.digest && model.backend === 'llamacpp',
	)
	const model = matches[0]
	if (matches.length !== 1 || model === undefined)
		throw new Error('unobserved deployment model identity')
	return model
}

/** Reconstructs configured context from an exact, fresh immediate raw snapshot. */
export function readCapacity(request: MatrixRequest, frozen: MatrixFreeze): MatrixCapacity {
	const capacity = request.capacity
	if (
		request.role !== 'agent' ||
		!request.sent ||
		capacity === undefined ||
		request.buffered === undefined ||
		!isRecord(request.request)
	)
		throw new Error('missing immediate decision capacity observation')
	verifyFiles([capacity.evidence])
	const snapshot = readJSON(capacity.evidence.path)
	if (
		!isMatrixSnapshot(snapshot) ||
		snapshot.sequence !== request.sequence ||
		snapshot.model !== request.request.model ||
		snapshot.request !==
			createHash('sha256').update(JSON.stringify(request.request)).digest('hex') ||
		snapshot.buffered !== request.buffered ||
		snapshot.started < request.buffered ||
		snapshot.finished > request.finished ||
		snapshot.status !== 200 ||
		snapshot.error !== undefined ||
		capacity.wall !== snapshot.finished - snapshot.started
	)
		throw new Error('capacity observation association or transport differs')
	const bytes = Buffer.from(snapshot.raw, 'base64')
	if (
		bytes.toString('base64') !== snapshot.raw ||
		createHash('sha256').update(bytes).digest('hex') !== snapshot.hash
	)
		throw new Error('capacity raw bytes differ')
	const raw: unknown = JSON.parse(bytes.toString('utf8'))
	const model = readDeploymentModel(readDeployment(frozen.deployment), frozen.decision)
	if (!isRecord(raw) || !Array.isArray(raw.models)) throw new Error('missing loaded models')
	const matches = raw.models.filter(
		(entry: unknown) =>
			isRecord(entry) && (entry.name === model.model || entry.model === model.model),
	)
	const entry: unknown = matches[0]
	if (
		matches.length !== 1 ||
		!isRecord(entry) ||
		entry.digest !== model.digest ||
		entry.runner !== model.backend ||
		typeof entry.context_length !== 'number' ||
		!Number.isSafeInteger(entry.context_length) ||
		entry.context_length <= 0 ||
		typeof entry.expires_at !== 'string' ||
		!Number.isFinite(Date.parse(entry.expires_at)) ||
		Date.parse(entry.expires_at) <= snapshot.finished ||
		request.request.model !== model.model ||
		capacity.window !== entry.context_length
	)
		throw new Error('unmatched, stale, ambiguous, or changed loaded capacity')
	return { ...capacity, window: entry.context_length }
}

/** Checks serial observation order and actual decision sampler overrides. */
export function listCapacityFailures(
	requests: readonly MatrixRequest[],
	frozen: MatrixFreeze,
	budget: MatrixBudget,
): readonly string[] {
	const failures: string[] = []
	if (
		!Number.isSafeInteger(budget.ceiling) ||
		budget.ceiling <= 0 ||
		budget.ceiling !==
			Math.min(
				budget.window,
				readDeploymentModel(readDeployment(frozen.deployment), frozen.decision).context,
			)
	)
		failures.push('qualification ceiling differs from frozen model metadata and requested window')
	let finished = 0
	for (const [at, request] of requests.entries()) {
		if (
			request.sequence !== at + 1 ||
			request.started < finished ||
			request.finished < request.started
		)
			failures.push(`request ${request.sequence}: snapshot/request order differs`)
		finished = request.finished
		if (request.role !== 'agent' || !request.sent) continue
		try {
			if (!matchesInterruptedTransport(request)) {
				const capacity = readCapacity(request, frozen)
				if ((capacity.window ?? 0) < budget.ceiling)
					failures.push(`request ${request.sequence}: loaded capacity below frozen ceiling`)
			}
		} catch (error) {
			failures.push(`request ${request.sequence}: ${String(error)}`)
		}
		const expected = {
			...frozen.decision.sampler,
			num_ctx: budget.window,
			num_predict: request.goal === undefined ? 1 : budget.reserve,
		}
		if (!isRecord(request.request) || !isDeepStrictEqual(request.request.options, expected))
			failures.push(`request ${request.sequence}: decision sampler differs`)
	}
	return failures
}

/** Checks whether transport failed before a response could require an immediate observation.
 * @param request - Retained HTTP boundary evidence
 * @returns True only for an errored transport with no buffered response or capacity
 */
export function matchesInterruptedTransport(request: MatrixRequest): boolean {
	return (
		request.error !== undefined &&
		request.buffered === undefined &&
		request.response === undefined &&
		request.capacity === undefined
	)
}

/** Includes every retained raw snapshot in the run's custody population. */
export function listCapacityFiles(requests: readonly MatrixRequest[]): readonly RefitFile[] {
	return requests.flatMap((request) =>
		request.capacity === undefined ? [] : [request.capacity.evidence],
	)
}

/** Returns an unambiguous protocol, role-policy, arm, and copy result key.
 * @param cell - The explicit l6 identity
 * @returns The immutable run name
 */
export function nameMatrix(cell: MatrixIdentity): string {
	return `l6-${cell.key}-think${cell.think ? '1' : '0'}-${cell.arm}-v${cell.copy}`
}

/** Computes the protocol's exact invariant paired reservation.
 * @param reserve - A member of the fixed reserve ladder
 * @returns The physical window and ledger reservation
 */
export function buildBudget(reserve: number): MatrixBudget {
	if (!MATRIX_RESERVES.includes(reserve)) throw new Error('reserve is outside the fixed ladder')
	return {
		reserve,
		window: MATRIX_ADMISSION + reserve,
		ceiling: MATRIX_ADMISSION + reserve,
		predict: reserve - 512,
	}
}

/** Lists all executable bench5 sources recursively, excluding test and frozen data.
 * @param directory - The source root
 * @returns Sorted TypeScript source paths
 */
export function listMatrixSources(directory: string = join(HARNESS, 'bench5')): readonly string[] {
	return readdirSync(directory, { withFileTypes: true })
		.flatMap((entry) =>
			entry.isDirectory()
				? entry.name === 'tests'
					? []
					: listMatrixSources(join(directory, entry.name))
				: entry.name.endsWith('.ts')
					? [join(directory, entry.name)]
					: [],
		)
		.sort()
}

/** Hashes the complete source and frozen vendor population.
 * @returns Byte identities whose changes invalidate a matrix configuration
 */
export function readMatrixFiles(): readonly RefitFile[] {
	readBuild()
	return [
		join(BUILD, 'build-manifest.json'),
		...listMatrixSources(),
		join(HARNESS, 'tools', 'run-one.ts'),
		join(HARNESS, 'tools', 'series.ts'),
		join(HARNESS, 'vendor', 'agent-0.0.30-trimmed', 'index.js'),
		join(HARNESS, 'vendor', 'ollama', 'index.js'),
		join(HARNESS, 'bench', 'scenario-long.json'),
		...Array.from({ length: 8 }, (_entry, at) =>
			join(HARNESS, 'bench', 'variants', 'long', `v${at + 1}.json`),
		),
	].map(hashFile)
}

/** Reads an actual daemon model digest, refusing an absent or ambiguous tag.
 * @param tags - The retained api/tags response
 * @param model - The exact requested tag
 * @returns The daemon's digest
 */
export function readModelDigest(tags: unknown, model: string): string {
	if (!isRecord(tags) || !Array.isArray(tags.models))
		throw new Error('missing actual model inventory')
	const matches = tags.models.filter(
		(entry: unknown) => isRecord(entry) && (entry.name === model || entry.model === model),
	)
	const entry: unknown = matches[0]
	if (
		matches.length !== 1 ||
		!isRecord(entry) ||
		typeof entry.digest !== 'string' ||
		!/^(sha256:)?[a-f0-9]{64}$/.test(entry.digest)
	)
		throw new Error(`actual digest unavailable for ${model}`)
	return entry.digest
}

/** Verifies frozen source, role configuration, and seed custody.
 * @param reference - The immutable freeze file
 * @returns The validated configuration
 */
export function readFrozen(reference: RefitFile): MatrixFreeze {
	verifyFiles([reference])
	const frozen = readJSON(reference.path)
	if (!isMatrixFreeze(frozen)) throw new Error('invalid l6 freeze manifest')
	verifyFiles([
		...frozen.files,
		frozen.settings,
		frozen.seed,
		frozen.census,
		frozen.tags,
		frozen.deployment,
	])
	readDeploymentModel(readDeployment(frozen.deployment), frozen.decision)
	if (!isDeepStrictEqual(frozen.files, readMatrixFiles()))
		throw new Error('stale source or scenario population; re-freeze required')
	const model = Object.entries(MODELS).find(([key]) => key === frozen.key)?.[1]
	const settings = readJSON(frozen.settings.path)
	if (!isRecord(settings) || !isDeepStrictEqual(settings[frozen.key], frozen.configuration))
		throw new Error('settings/corpus configuration mismatch')
	const expected: readonly MatrixRole[] = [
		{ model: model ?? '', digest: frozen.decision.digest, think: frozen.think, sampler: SAMPLER },
		{
			model: model ?? '',
			digest: frozen.summarizer.digest,
			think: false,
			sampler: { ...SAMPLER, num_predict: frozen.configuration.predict },
		},
		{
			model: MICA_MODEL,
			digest: frozen.judge.digest,
			think: false,
			sampler: { num_ctx: MICA_CONTEXT, calibration: MICA_CALIBRATION },
		},
	]
	for (const [at, role] of [frozen.decision, frozen.summarizer, frozen.judge].entries()) {
		if (
			!isDeepStrictEqual(role, expected[at]) ||
			readModelDigest(readJSON(frozen.tags.path), role.model) !== role.digest
		)
			throw new Error('frozen role configuration differs from the accepted protocol')
	}
	return frozen
}

/** Reads a complete reserve decision and validates the fixed no-score ladder.
 * @param reference - The resource decision
 * @param frozen - The expected freeze identity
 * @returns The accepted or refused resource record
 */
export function readResource(reference: RefitFile, frozen: RefitFile): MatrixResource {
	verifyFiles([reference])
	const resource = readJSON(reference.path)
	if (
		!isMatrixResource(resource) ||
		!isDeepStrictEqual(resource.frozen, frozen) ||
		resource.attempts.length === 0
	)
		throw new Error('invalid resource custody')
	for (const [at, attempt] of resource.attempts.entries()) {
		const run = readAttempt(attempt)
		if (run === undefined) throw new Error('operational resource fault lacks raw evidence')
		verifyMatrixFeasibility(run)
		if (
			run !== undefined &&
			(run.execution.phase !== 'resource' ||
				run.execution.arm !== 'records' ||
				run.execution.copy !== 1 ||
				!isDeepStrictEqual(run.execution.frozen, frozen))
		)
			throw new Error('resource attempt configuration mismatch')
		if (!isDeepStrictEqual(attempt.budget, buildBudget(MATRIX_RESERVES[at] ?? 0)))
			throw new Error('resource ladder skipped a reserve')
		if (at < resource.attempts.length - 1 && (attempt.accepted || !attempt.resource))
			throw new Error('resource ladder advanced without explicit resource refusal')
	}
	const last = resource.attempts.at(-1)
	if (
		resource.accepted !== last?.accepted ||
		(resource.accepted && !isDeepStrictEqual(resource.budget, last?.budget))
	)
		throw new Error('resource decision differs from its terminal attempt')
	return resource
}

/** Recomputes admission from retained raw run evidence, never from scores.
 * @param attempt - The declared attempt
 * @returns Its exact decoded evidence when available
 */
export function readAttempt(attempt: MatrixAttempt): MatrixRun | undefined {
	verifyFiles([attempt.execution, ...attempt.files])
	const execution = readJSON(attempt.execution.path)
	if (
		!isMatrixExecution(execution) ||
		execution.phase === 'development' ||
		!isDeepStrictEqual(execution.budget, attempt.budget)
	)
		throw new Error('attempt execution differs')
	const run = attempt.files.length === 0 ? undefined : parseMatrixRun(attempt.run)
	if (
		run !== undefined &&
		(!isDeepStrictEqual(run.files, attempt.files) || !isDeepStrictEqual(run.execution, execution))
	)
		throw new Error('attempt evidence differs')
	if (
		attempt.accepted &&
		(run === undefined || run.failures.length !== 0 || attempt.failures.length !== 0)
	)
		throw new Error('accepted attempt lacks complete valid evidence')
	if (attempt.resource !== (run !== undefined && permitsReserve(run.requests)))
		throw new Error('reserve advancement differs from raw resource evidence')
	return run
}

/** Computes the unchanged finite full-view bound from its actual records resource run.
 * @param run - The measured records resource run
 * @returns Its finite empirical envelope
 */
export function buildMatrixBound(run: MatrixRun): MatrixBound {
	const copy = readCopy(join(COPIES_DIR, 'v1.json'))
	const copies = Array.from({ length: 8 }, (_value, at) =>
		hashFile(join(COPIES_DIR, `v${at + 1}.json`)),
	)
	const scenarios = copies.map((entry) => readCopy(entry.path))
	if (run.gauge === undefined)
		throw new Error('full-view bound requires calibrated development pricing')
	const seed = Math.max(
		...scenarios.map((scenario) =>
			estimateMessages([
				{
					id: 'system',
					role: 'system',
					content: buildSystem({ ledger: { system: scenario.system } }),
				},
				...scenario.seed.map((message, at) => ({ ...message, id: `seed-${at}` })),
			]),
		),
	)
	const requests = Math.max(
		...scenarios.flatMap((scenario) =>
			scenario.goals.map((goal) =>
				estimateMessages([{ id: 'request', role: 'user', content: goal.request }]),
			),
		),
	)
	const payloads = scenarios.flatMap((scenario) => [
		...Object.values(scenario.tables.tools).flatMap((table) => Object.values(table)),
		...scenario.tables.lookups.map((lookup) => lookup.text),
		scenario.seed.map((message) => message.content).join('\n'),
	])
	const payload = Math.max(
		...payloads.map((content) => estimateMessages([{ id: 'tool', role: 'tool', content }])),
	)
	const sent = run.requests.filter(
		(request) => request.role === 'agent' && request.goal !== undefined && request.sent,
	)
	const observed = Math.max(...sent.map((request) => request.prompt ?? 0))
	const growth = Math.max(
		run.execution.budget.reserve,
		...run.rows.map((row) =>
			estimateMessages([{ id: 'reply', role: 'assistant', content: row.reply }]),
		),
	)
	// This is a declared finite empirical envelope. Preflight and every wire request still prove feasibility.
	const window = Math.ceil(
		(seed +
			copy.goals.length * (requests + (DEFAULT_LEDGER_LIMIT + 1) * (growth + payload + requests))) *
			run.gauge.scale +
			run.gauge.overhead +
			observed +
			run.execution.budget.reserve,
	)
	return {
		scenario: hashFile(join(COPIES_DIR, 'v1.json')),
		copies,
		development: run.files,
		gauge: run.gauge,
		goals: copy.goals.length,
		turns: DEFAULT_LEDGER_LIMIT + 1,
		reserve: run.execution.budget.reserve,
		seed,
		requests,
		payload,
		growth,
		observed,
		window,
		limitation:
			'Finite empirical envelope from all copy inputs, largest reachable payload including the complete recall seed, declared turn/completion caps, calibrated pricing, and measured development output. It is not a tokenizer worst-case guarantee; complete copy-1 preflight and actual wire capacity checks must pass. No text is trimmed.',
	}
}

/** Validates fresh calibration and cell-specific development custody.
 * @param execution - The explicit exploratory copy-1 execution
 * @param frozen - The validated target cell freeze
 * @returns The policy with its independently recomputed cutoff and budgets
 */
export function readDevelopment(
	execution: MatrixExecution,
	frozen: MatrixFreeze,
): MatrixDevelopment {
	if (
		!isMatrixExecution(execution) ||
		execution.phase !== 'development' ||
		execution.copy !== 1 ||
		execution.development === undefined ||
		execution.key !== frozen.key ||
		execution.think !== frozen.think
	)
		throw new Error('exact copy-1 development execution required')
	if (!isDeepStrictEqual(frozen, readFrozen(execution.frozen)))
		throw new Error('development frozen identity differs from exact cell custody')
	verifyFiles([execution.development])
	const policy = readJSON(execution.development.path)
	if (!isMatrixDevelopment(policy) || !isDeepStrictEqual(policy.frozen, execution.frozen))
		throw new Error('development policy belongs to another cell')
	verifyFiles([policy.diagnosis, policy.labels, policy.packet, policy.generation])
	const calibration = readFrozen(policy.calibration)
	const shared: ReadonlyArray<keyof MatrixFreeze> = [
		'summarizer',
		'judge',
		'files',
		'settings',
		'seed',
		'configuration',
	]
	for (const key of shared)
		if (!isDeepStrictEqual(calibration[key], frozen[key]))
			throw new Error(`development calibration ${key} differs from cell`)
	const assessment = readRefitAssessment(policy.diagnosis)
	const generation = readJSON(policy.generation.path)
	if (
		assessment.accepted ||
		assessment.errors.length !== 0 ||
		!isDeepStrictEqual(assessment.preparation.manifest, policy.generation) ||
		!isDeepStrictEqual(assessment.preparation.packet, policy.packet) ||
		!isDeepStrictEqual(assessment.preparation.labels, policy.labels) ||
		!isRefitGeneration(generation) ||
		!generation.complete ||
		generation.errors.length !== 0 ||
		generation.sustained !== undefined ||
		!isDeepStrictEqual(generation.matrix, calibration) ||
		generation.model !== calibration.summarizer.model ||
		!isDeepStrictEqual(generation.settings, calibration.configuration) ||
		assessment.change !== policy.change ||
		selectMajorityCutoff(assessment) !== policy.agree
	)
		throw new Error('development cutoff or fresh calibration custody differs')
	const resource = readResource(policy.resource, policy.frozen)
	const previous = resource.attempts.at(-1)
	if (!resource.accepted || previous === undefined || resource.budget === undefined)
		throw new Error('development requires accepted cell resource evidence')
	const records = readAttempt(previous)
	if (records === undefined) throw new Error('development resource lacks raw evidence')
	const bound = buildMatrixBound(records)
	verifyFiles([policy.full])
	const full = readJSON(policy.full.path)
	const expanded: MatrixBudget = {
		...resource.budget,
		window: bound.window,
		ceiling: Math.min(
			bound.window,
			readDeploymentModel(readDeployment(frozen.deployment), frozen.decision).context,
		),
	}
	if (
		!isMatrixResource(full) ||
		!isRecord(full) ||
		!isDeepStrictEqual(full.frozen, policy.frozen) ||
		!isDeepStrictEqual(full.bound, bound) ||
		full.attempts.length !== 1 ||
		!isDeepStrictEqual(policy.paired, resource.budget) ||
		!isDeepStrictEqual(policy.expanded, expanded)
	)
		throw new Error('development resource or full-bound custody differs')
	const attempt = full.attempts[0]
	if (attempt === undefined) throw new Error('development full-view attempt absent')
	const run = readAttempt(attempt)
	verifyMatrixFeasibility(run)
	if (
		run === undefined ||
		run.execution.phase !== 'full' ||
		run.execution.arm !== 'full' ||
		run.execution.copy !== 1 ||
		!isDeepStrictEqual(run.execution.frozen, policy.frozen) ||
		!isDeepStrictEqual(run.execution.resource, policy.resource) ||
		!isDeepStrictEqual(run.execution.budget, expanded) ||
		full.accepted !== attempt.accepted ||
		(full.accepted && !isDeepStrictEqual(full.budget, expanded)) ||
		!isDeepStrictEqual(execution.budget, execution.arm === 'full' ? expanded : resource.budget)
	)
		throw new Error('development full-view or execution budget differs')
	return policy
}

/** Validates phase admission and immutable execution custody.
 * @param path - The explicit execution manifest
 * @returns The execution and frozen roles
 */
export function readExecution(path: string): {
	readonly execution: MatrixExecution
	readonly frozen: MatrixFreeze
} {
	const execution = readJSON(path)
	if (!isMatrixExecution(execution)) throw new Error('invalid l6 execution manifest')
	const frozen = readFrozen(execution.frozen)
	if (execution.key !== frozen.key || execution.think !== frozen.think)
		throw new Error('decision configuration mismatch')
	if (
		execution.budget.ceiling !==
		(execution.arm === 'full'
			? Math.min(
					execution.budget.window,
					readDeploymentModel(readDeployment(frozen.deployment), frozen.decision).context,
				)
			: execution.budget.window)
	)
		throw new Error('qualification ceiling differs from pre-trajectory contract')
	if (
		execution.arm !== 'full' &&
		!isDeepStrictEqual(execution.budget, buildBudget(execution.budget.reserve))
	)
		throw new Error('paired budget mapping differs')
	if (execution.phase !== 'evaluation' && execution.copy !== 1)
		throw new Error('development is copy 1 only')
	if (execution.phase === 'evaluation' && execution.copy === 1)
		throw new Error('copy 1 cannot be evaluated')
	if (execution.phase === 'resource' && execution.arm !== 'records')
		throw new Error('reserve preflight must use records')
	if (execution.phase === 'full' && execution.arm !== 'full')
		throw new Error('full preflight must use full')
	if (execution.phase === 'pilot' && execution.arm !== 'aggregate')
		throw new Error('pilot must use aggregate')
	if (execution.phase === 'development') {
		readDevelopment(execution, frozen)
		return { execution, frozen }
	}
	if (execution.phase !== 'resource') {
		if (execution.resource === undefined) throw new Error('accepted resource manifest required')
		const resource = readResource(execution.resource, execution.frozen)
		if (!resource.accepted || resource.budget?.reserve !== execution.budget.reserve)
			throw new Error('resource configuration is infeasible')
	}
	if (execution.arm === 'aggregate') {
		if (execution.fit === undefined) throw new Error('accepted fit manifest required')
		verifyFiles([execution.fit])
		const fit = readJSON(execution.fit.path)
		if (
			!isRecord(fit) ||
			fit.separated !== true ||
			!isRecord(fit.matrix) ||
			!isDeepStrictEqual(fit.matrix.summarizer, frozen.summarizer) ||
			!isDeepStrictEqual(fit.matrix.judge, frozen.judge) ||
			!isDeepStrictEqual(fit.matrix.files, frozen.files) ||
			fit.matrix.settings !== frozen.settings.hash ||
			fit.matrix.seed !== frozen.seed.hash
		)
			throw new Error(
				'stale or unaccepted fit identity; re-freeze, generate, blind-audit, and fit required',
			)
		if (execution.phase === 'evaluation') {
			if (execution.pilot === undefined) throw new Error('accepted aggregate pilot required')
			verifyFiles([execution.pilot])
			const pilot = readJSON(execution.pilot.path)
			if (
				!isRecord(pilot) ||
				pilot.accepted !== true ||
				!isDeepStrictEqual(pilot.frozen, execution.frozen) ||
				!isDeepStrictEqual(pilot.resource, execution.resource) ||
				!isDeepStrictEqual(pilot.fit, execution.fit) ||
				typeof pilot.served !== 'number' ||
				typeof pilot.exposed !== 'number' ||
				pilot.served <= 0 ||
				pilot.exposed <= pilot.served / 2
			)
				throw new Error('aggregate pilot lacks invariant success and majority body exposure')
			if (!isMatrixAttempt(pilot.attempt) || !pilot.attempt.accepted)
				throw new Error('pilot lacks accepted attempt')
			const run = readAttempt(pilot.attempt)
			if (
				run !== undefined &&
				(!isDeepStrictEqual(run.execution.frozen, execution.frozen) ||
					!isDeepStrictEqual(run.execution.resource, execution.resource))
			)
				throw new Error('pilot configuration differs from evaluation')
			if (
				run === undefined ||
				run.execution.phase !== 'pilot' ||
				!isDeepStrictEqual(run.execution.budget, execution.budget) ||
				!isDeepStrictEqual(run.execution.fit, execution.fit) ||
				run.rows.length !== pilot.served ||
				run.rows.filter((row) => matchesMatrixExposure(run, row.goal)).length !== pilot.exposed
			)
				throw new Error('pilot exposure differs from actual body evidence')
		}
	}
	if (execution.arm === 'full' && execution.phase === 'evaluation') {
		if (execution.full === undefined) throw new Error('accepted full-view preflight required')
		verifyFiles([execution.full])
		const full = readJSON(execution.full.path)
		if (
			!isMatrixResource(full) ||
			full.accepted !== true ||
			!isDeepStrictEqual(full.frozen, execution.frozen) ||
			!isDeepStrictEqual(full.budget, execution.budget) ||
			full.attempts.length !== 1
		)
			throw new Error('full-view configuration is infeasible or changed')
		for (const attempt of full.attempts) {
			const run = readAttempt(attempt)
			if (
				!attempt.accepted ||
				run === undefined ||
				run.execution.phase !== 'full' ||
				!isDeepStrictEqual(run.execution.budget, execution.budget) ||
				!isDeepStrictEqual(run.execution.resource, execution.resource)
			)
				throw new Error('full-view preflight differs')
		}
	}
	return { execution, frozen }
}

/** Classifies actual wire evidence without consulting an answer or score.
 * @param role - The request role
 * @param request - The exact sent JSON body
 * @param response - The retained raw response
 * @param budget - The role's frozen physical bounds
 * @param status - The actual HTTP status
 * @param error - A transport error, if present
 * @returns Explicit resource and operational refusal categories
 */
export function listResourceFailures(
	role: CallRole,
	request: unknown,
	response: string | undefined,
	budget: MatrixBudget,
	status?: number,
	error?: string,
	capacity?: MatrixCapacity,
	calibrating = false,
): readonly MatrixFailure[] {
	if (role !== 'agent') return error !== undefined || (status ?? 0) >= 400 ? ['transport'] : []
	const failures = new Set<MatrixFailure>()
	if (error !== undefined || status === undefined || status < 200 || status >= 300)
		return ['transport']
	if (
		!isRecord(request) ||
		request.truncate !== false ||
		request.shift !== false ||
		!isRecord(request.options) ||
		request.options.num_ctx !== budget.window ||
		request.options.num_predict !== (calibrating ? 1 : budget.reserve) ||
		(calibrating && request.think !== false)
	)
		failures.add('request')
	const reading = readWireReading({ body: request }, { text: response })
	if (
		!reading.complete ||
		reading.prompt === undefined ||
		!Number.isSafeInteger(reading.prompt) ||
		reading.prompt < 0 ||
		reading.completion === undefined ||
		!Number.isSafeInteger(reading.completion) ||
		reading.completion < 0 ||
		reading.reason === undefined
	)
		failures.add('usage')
	if (capacity?.window === undefined) failures.add('observation')
	else if (capacity.window < budget.ceiling) failures.add('observation')
	if (
		reading.reason === 'length' &&
		!(
			calibrating &&
			isRecord(request) &&
			request.think === false &&
			isRecord(request.options) &&
			request.options.num_predict === 1 &&
			reading.completion !== undefined &&
			reading.completion <= 1
		)
	)
		failures.add('length')
	if (reading.completion !== undefined && reading.completion > (calibrating ? 1 : budget.reserve))
		failures.add('completion')
	if (
		reading.prompt !== undefined &&
		reading.completion !== undefined &&
		reading.prompt + reading.completion >= budget.ceiling
	)
		failures.add('capacity')
	for (const line of (response ?? '').split(/\r\n|\n/)) {
		if (line.trim() === '') continue
		try {
			const value: unknown = JSON.parse(line)
			if (!isRecord(value) || value.error !== undefined) failures.add('transport')
			if (isRecord(value) && (value.truncated === true || value.truncation === true))
				failures.add('truncation')
		} catch {
			failures.add('usage')
		}
	}
	return [...failures]
}

/** Reads raw response faults and explicit truncation without hiding a later upstream error.
 * @param response - Retained Ollama response envelopes
 * @returns An operational fault, explicit truncation refusal, or otherwise complete envelopes
 */
export function readResponseOutcome(response: string | undefined): MatrixOutcome {
	let truncated = false
	try {
		for (const line of (response ?? '').split(/\r\n|\n/).filter((entry) => entry.trim() !== '')) {
			const value: unknown = JSON.parse(line)
			if (!isRecord(value) || value.error !== undefined) return 'fault'
			truncated ||= value.truncated === true || value.truncation === true
		}
	} catch {
		return 'fault'
	}
	return truncated ? 'refused' : 'complete'
}

/** Derives request validity from the retained HTTP boundary and completed response.
 * @param request - Actual request and response evidence
 * @param budget - Frozen decision bounds
 * @param frozen - Frozen role and deployment custody when the role requires it
 * @returns A completed request, measured resource refusal, or operational fault
 */
export function readRequestOutcome(
	request: MatrixRequest,
	budget: MatrixBudget,
	frozen?: MatrixFreeze,
): MatrixOutcome {
	if (
		!request.sent ||
		request.error !== undefined ||
		request.status === undefined ||
		request.status < 200 ||
		request.status >= 300 ||
		!isRecord(request.request)
	)
		return 'fault'
	const response = readResponseOutcome(request.response)
	if (response === 'fault') return 'fault'
	const reading = readWireReading({ body: request.request }, { text: request.response })
	if (
		!reading.complete ||
		reading.prompt === undefined ||
		reading.completion === undefined ||
		reading.reason === undefined
	)
		return 'fault'
	let capacity: MatrixCapacity | undefined
	if (request.role === 'agent') {
		if (frozen === undefined) return 'fault'
		try {
			if (
				budget.ceiling !==
				Math.min(
					budget.window,
					readDeploymentModel(readDeployment(frozen.deployment), frozen.decision).context,
				)
			)
				return 'fault'
			capacity = readCapacity(request, frozen)
		} catch {
			return 'fault'
		}
	}
	const failures = listResourceFailures(
		request.role,
		request.request,
		request.response,
		budget,
		request.status,
		request.error,
		capacity,
		request.goal === undefined,
	)
	if (
		failures.some(
			(failure) => !['length', 'capacity', 'completion', 'truncation'].includes(failure),
		)
	)
		return 'fault'
	const options = request.request.options
	if (
		reading.prompt === undefined ||
		reading.completion === undefined ||
		(reading.reason === 'length' &&
			!(
				(request.role === 'agent' && request.goal === undefined && failures.length === 0) ||
				(request.role === 'judge' &&
					request.request.raw === true &&
					request.request.stream === false &&
					request.request.logprobs === true &&
					request.request.top_logprobs === 20 &&
					isRecord(options) &&
					options.num_predict === 1 &&
					options.temperature === 1 &&
					reading.completion === 1) ||
				(request.role === 'flush' &&
					request.request.think === false &&
					isRecord(options) &&
					options.num_predict === 1 &&
					reading.completion === 1)
			)) ||
		response === 'refused' ||
		failures.length !== 0 ||
		(isRecord(options) &&
			((typeof options.num_predict === 'number' && reading.completion > options.num_predict) ||
				(typeof options.num_ctx === 'number' &&
					reading.prompt + reading.completion >= options.num_ctx)))
	)
		return 'refused'
	return 'complete'
}

/** Checks whether the explicit development policy admits only local summary output-cap absence.
 * @param request - Retained request and response evidence
 * @param frozen - Frozen summarizer identity, sampler, context, and output cap
 * @param execution - Explicit development invocation
 * @param policy - Validated development policy
 * @param aborted - If true, refuses the exception; if false, checks the measured cap
 * @param stopped - Existing trajectory stop, which refuses the exception when present
 * @returns True if normal output-cap exhaustion is the sole refusal; false otherwise
 * @example
 * ```ts
 * const local = matchesCappedSummary(request, frozen, execution, policy, false)
 * ```
 */
export function matchesCappedSummary(
	request: MatrixRequest,
	frozen: MatrixFreeze,
	execution: MatrixExecution | SustainedExecution | undefined,
	policy: MatrixDevelopment | SustainedPolicy | undefined,
	aborted: boolean,
	stopped?: string,
): boolean {
	if (
		aborted ||
		stopped !== undefined ||
		execution === undefined ||
		(execution.protocol === 'l6'
			? execution.phase !== 'development' || !isMatrixDevelopment(policy)
			: execution.phase === 'filing' ||
				execution.policy === undefined ||
				!isSustainedPolicy(policy)) ||
		policy?.withhold !== true ||
		request.role !== 'summarizer' ||
		!isRecord(request.request) ||
		request.request.model !== frozen.summarizer.model ||
		request.request.think !== false ||
		request.request.truncate !== false ||
		frozen.summarizer.think !== false ||
		!isRecord(request.request.options) ||
		readRequestOutcome(request, execution.budget, frozen) !== 'refused' ||
		readResponseOutcome(request.response) !== 'complete'
	)
		return false
	const options = request.request.options
	const context = frozen.summarizer.sampler.num_ctx
	const cap = frozen.configuration.predict
	if (
		!Number.isSafeInteger(context) ||
		context === undefined ||
		context <= 0 ||
		!Number.isSafeInteger(cap) ||
		cap <= 0 ||
		!isDeepStrictEqual(options, { ...frozen.summarizer.sampler, num_predict: cap })
	)
		return false
	const reading = readWireReading({ body: request.request }, { text: request.response })
	return (
		reading.complete &&
		reading.reason === 'length' &&
		reading.prompt !== undefined &&
		reading.completion === cap &&
		reading.prompt + reading.completion < context &&
		request.failures.length === 0
	)
}

/** Checks whether an unsent attempt retains the preceding measured refusal's stop reason.
 * @param request - Retained attempt to qualify
 * @param requests - Original retained request sequence
 * @returns True if the attempt was blocked by the preceding sent agent resource refusal; false otherwise
 * @example
 * ```ts
 * const stopped = isStoppedRequest(request, requests)
 * ```
 */
export function isStoppedRequest(
	request: MatrixRequest,
	requests: readonly MatrixRequest[],
): boolean {
	const previous = requests.find((entry) => entry.sequence === request.sequence - 1)
	return (
		!request.sent &&
		request.role === 'agent' &&
		request.request === null &&
		request.status === undefined &&
		request.response === undefined &&
		request.capacity === undefined &&
		request.prompt === undefined &&
		request.completion === undefined &&
		request.reason === undefined &&
		request.failures.length === 1 &&
		request.failures[0] === 'transport' &&
		previous !== undefined &&
		previous.sent &&
		previous.role === 'agent' &&
		previous.goal === request.goal &&
		previous.turn !== undefined &&
		request.turn === previous.turn + 1 &&
		request.started >= previous.finished &&
		previous.error === undefined &&
		previous.failures.length > 0 &&
		(isParserRequest(previous) ||
			previous.failures.every((failure) =>
				['length', 'capacity', 'completion', 'truncation'].includes(failure),
			)) &&
		request.error ===
			describeError(new Error(`decision qualification failed: ${previous.failures.join(', ')}`))
	)
}

/** Recognizes only the retained decision server's XML function/parameter parser error. */
export function isParserRequest(request: MatrixRequest): boolean {
	if (
		!request.sent ||
		request.role !== 'agent' ||
		request.goal === undefined ||
		request.turn === undefined ||
		request.error !== undefined ||
		request.status === undefined ||
		(request.status >= 200 && request.status < 300) ||
		request.response === undefined ||
		!isRecord(request.request) ||
		!Array.isArray(request.request.tools) ||
		request.request.tools.length === 0 ||
		request.prompt !== undefined ||
		request.completion !== undefined ||
		request.reason !== undefined ||
		!isDeepStrictEqual(request.failures, ['transport'])
	)
		return false
	try {
		const body: unknown = JSON.parse(request.response)
		return (
			isRecord(body) &&
			Object.keys(body).length === 1 &&
			typeof body.error === 'string' &&
			/^XML syntax error on line [1-9][0-9]*: element <function> closed by <\/parameter>$/.test(
				body.error,
			)
		)
	} catch {
		return false
	}
}

/** Releases only the originating development goal's exact parser stop and local follower. */
export function permitsContinuation(
	requests: readonly MatrixRequest[],
	frozen: MatrixFreeze,
	execution: MatrixExecution,
	goal: string,
): boolean {
	if (execution.phase !== 'development' || requests.length === 0) return false
	const current = requests.filter((request) => request.goal === goal)
	if (
		current.filter(isParserRequest).length !== 1 ||
		listCapacityFailures(requests, frozen, execution.budget).length !== 0
	)
		return false
	return current.every((request) => {
		if (isStoppedRequest(request, requests)) return true
		if (!isParserRequest(request))
			return readRequestOutcome(request, execution.budget, frozen) === 'complete'
		return (
			isRecord(request.request) &&
			request.request.think === execution.think &&
			request.request.truncate === false &&
			request.request.shift === false &&
			request.request.model === frozen.decision.model
		)
	})
}

/** Refuses operational matrix faults as evidence for eliminating a configuration.
 * @param run - Decoded retained matrix evidence
 */
export function verifyMatrixFeasibility(run: MatrixRun | undefined): void {
	if (run === undefined) throw new Error('operational matrix fault lacks raw evidence')
	const requests = run.requests.filter((request) => !isStoppedRequest(request, run.requests))
	const outcomes = requests.map((request) =>
		readRequestOutcome(request, run.execution.budget, run.frozen),
	)
	if (listCapacityFailures(run.requests, run.frozen, run.execution.budget).length !== 0)
		throw new Error('operational matrix fault has invalid capacity custody')
	if (requests.some(isParserRequest))
		throw new Error('operational matrix fault is not configuration infeasibility')
	for (const request of requests) {
		const pick = run.picks.findLast(
			(entry) => entry.goal === request.goal && entry.sequence < request.sequence,
		)
		if (
			request.role === 'agent' &&
			(!isRecord(request.request) ||
				request.request.think !==
					(request.goal === undefined || (pick?.pass ?? 1) > 1 ? false : run.execution.think))
		)
			throw new Error('operational matrix fault has invalid thinking custody')
		const role =
			request.role === 'summarizer'
				? run.frozen.summarizer
				: request.role === 'judge'
					? run.frozen.judge
					: run.frozen.decision
		if (
			!isRecord(request.request) ||
			request.request.model !== role.model ||
			(request.role === 'summarizer' && !isDeepStrictEqual(request.request.options, role.sampler))
		)
			throw new Error('operational matrix fault has invalid role custody')
	}
	if (outcomes.includes('fault') || (run.status !== 'complete' && !outcomes.includes('refused')))
		throw new Error('operational matrix fault is not configuration infeasibility')
}

/** Determines whether a refused trajectory permits the next fixed reserve.
 * @param requests - Actual request observations
 * @returns Whether an explicit resource refusal occurred with no other cause
 */
export function permitsReserve(requests: readonly MatrixRequest[]): boolean {
	const failures = requests
		.filter((request) => !isStoppedRequest(request, requests))
		.flatMap((request) => request.failures)
	return (
		requests.every((request) => request.sent || isStoppedRequest(request, requests)) &&
		failures.length > 0 &&
		failures.every(
			(failure) =>
				failure === 'length' ||
				failure === 'capacity' ||
				failure === 'completion' ||
				failure === 'truncation',
		)
	)
}

/** Reads exact seed bytes for a configuration-scoped fresh cache.
 * @param frozen - The checked freeze
 * @returns The immutable cache prefix
 */
export function readSeedCache(frozen: MatrixFreeze): string {
	verifyFiles([frozen.seed])
	return readFileSync(frozen.seed.path, 'utf8')
}

/** Checks nonempty bound prose in the exact matching system block of an actual sent request.
 * @param run - The decoded run
 * @param goal - The served goal
 * @returns Whether that goal received the treatment body
 */
export function matchesMatrixExposure(
	run: Pick<MatrixRun, 'picks' | 'requests'> & { readonly execution: Pick<MatrixExecution, 'arm'> },
	goal: string,
): boolean {
	return matchesExposure(
		{
			info: { arm: run.execution.arm },
			picks: run.picks,
			calls: run.requests
				.filter((request) => request.sent)
				.map((request) => ({ sequence: request.sequence, role: request.role, goal: request.goal })),
			wire: new Map(
				run.requests
					.filter((request) => request.sent)
					.map((request) => [
						request.sequence,
						readWireReading({ body: request.request }, { text: request.response }),
					]),
			),
		},
		goal,
	)
}

/** Checks actual system-block custody, admission, and sole-token invariants without the archived fixed completion cap.
 * @param run - The exact request and selection evidence
 * @returns Invariant failures on actual sent requests
 */
export function listMatrixWireFailures(
	run: Pick<MatrixRun, 'execution' | 'picks' | 'requests' | 'gauge'>,
): readonly string[] {
	return listWireInvariantFailures(run, readCopy(join(COPIES_DIR, `v${run.execution.copy}.json`)))
}

/** Rechecks common wire invariants against an explicit safe scenario projection.
 * @param run - Actual selection and wire evidence
 * @param copy - The exact projected runtime
 * @returns Raw admission, support, and recovery failures
 */
export function listWireInvariantFailures(
	run: Pick<MatrixRun, 'picks' | 'requests' | 'gauge'>,
	copy: Copy,
): readonly string[] {
	const failures: string[] = []
	for (const request of run.requests.filter(
		(entry) => entry.sent && entry.role === 'agent' && entry.goal !== undefined,
	)) {
		const reading = readWireReading({ body: request.request }, { text: request.response })
		const pick = run.picks.findLast(
			(entry) => entry.goal === request.goal && entry.sequence < request.sequence,
		)
		const body = pick?.instructions[INSTRUCTION_SUMMARIES.name] ?? ''
		const system = reading.messages
			.filter((message) => message.role === 'system')
			.map((message) => message.content)
			.join('\n')
		const matched = matchesSummaryBlock(body, reading.messages)
		if (system.includes(SUMMARIES_HEADING) && !matched)
			failures.push(`request ${request.sequence}: unbound or stale summary block`)
		if (body !== '' && (!matched || (pick?.aggregates?.length ?? 0) === 0))
			failures.push(
				`request ${request.sequence}: recorded body is absent or lacks maintained binding`,
			)
		if (pick !== undefined && pick.pass > 1 && body !== '')
			failures.push(`request ${request.sequence}: summary on recovery`)
		if (matched) {
			const shown = reading.messages
				.map((message) =>
					message.role === 'system' ? message.content.replace(body, '') : message.content,
				)
				.join('\n')
			const goal = copy.goals.find((entry) => entry.id === request.goal)
			if (goal === undefined) throw new Error('wire goal absent from frozen scenario')
			const own = readScoreCarriers(goal, collectSummaryBodies(body).join('\n'))
			const seen = readScoreCarriers(goal, shown)
			if (own.expected.some((phrase) => !seen.expected.includes(phrase)))
				failures.push(`request ${request.sequence}: sole-carried scored phrase`)
			if (own.stale.some((phrase) => !seen.stale.includes(phrase)))
				failures.push(
					`request ${request.sequence} ${request.goal}: sole-carried stale phrase ${JSON.stringify(own.stale.filter((phrase) => !seen.stale.includes(phrase)))}`,
				)
			if (countSoleTokens(collectSummaryBodies(body).join('\n'), shown) > 0)
				failures.push(`request ${request.sequence}: sole-carried summary token`)
			const first = run.requests.find(
				(entry) => entry.goal === request.goal && entry.role === 'agent' && entry.sent,
			)
			if (
				first === request &&
				(request.estimate === undefined ||
					pick?.scale === undefined ||
					run.gauge === undefined ||
					request.estimate * pick.scale + run.gauge.overhead > MATRIX_ADMISSION)
			)
				failures.push(`request ${request.sequence}: first-request admission ceiling exceeded`)
		}
	}
	return failures
}

/** Retains the paired gauge and initial-plan invariants across every actual trajectory.
 * @param records - The resource-matched records run
 * @param aggregate - The maintained aggregate run
 * @returns Protocol invariant differences
 */
export function listMatrixPairFailures(
	records: Pick<MatrixRun, 'picks' | 'gauge' | 'rows'>,
	aggregate: Pick<MatrixRun, 'picks' | 'gauge' | 'rows'>,
): readonly string[] {
	const failures: string[] = []
	const left = records.picks[0]
	const right = aggregate.picks[0]
	if (
		left === undefined ||
		right === undefined ||
		left.digest !== right.digest ||
		!isDeepStrictEqual(left.tail, right.tail) ||
		left.scale !== right.scale ||
		!isDeepStrictEqual(records.gauge, aggregate.gauge)
	)
		failures.push('initial paired selection or calibrated gauge differs')
	for (const row of aggregate.rows) {
		const prior = records.rows.find((entry) => entry.goal === row.goal)
		if (
			prior !== undefined &&
			(!isFiniteNumber(prior.scale) ||
				prior.scale <= 0 ||
				!isFiniteNumber(row.scale) ||
				row.scale <= 0)
		)
			failures.push(`${row.goal}: paired scale is not finite and positive`)
	}
	return failures
}

/** Separates calibration, actual fresh requests, cache reuse, and maintenance elapsed time.
 * @param run - The exact retained run
 * @returns Measured costs without charging cached token usage as fresh calls
 */
export function measureMatrixCosts(
	run: Pick<MatrixRun, 'path' | 'rows' | 'requests'>,
): MatrixCosts {
	const info = readJSON(join(run.path, 'run.json'))
	return {
		metadata: {
			requests: run.requests.filter((request) => request.capacity !== undefined).length,
			wall: run.requests.reduce((total, request) => total + (request.capacity?.wall ?? 0), 0),
		},
		wire: ['agent', 'judge', 'summarizer', 'flush'].flatMap((role) =>
			(['calibration', 'trajectory'] as const).map((phase) => {
				const requests = run.requests.filter(
					(request) =>
						request.role === role &&
						request.sent &&
						(request.goal === undefined) === (phase === 'calibration'),
				)
				return {
					phase,
					role,
					requests: requests.length,
					wall: requests.reduce((total, request) => total + request.wall, 0),
					prompt: requests.reduce((total, request) => total + (request.prompt ?? 0), 0),
					completion: requests.reduce((total, request) => total + (request.completion ?? 0), 0),
					missing: requests.filter(
						(request) => request.prompt === undefined || request.completion === undefined,
					).length,
				}
			}),
		),
		judge: isRecord(info) ? info.judge : undefined,
		lineage: isRecord(info) ? info.lineage : undefined,
		elapsed: isRecord(info) ? info.wall : undefined,
		stage: run.rows.reduce((total, row) => total + row.stage, 0),
		flush: run.rows.reduce((total, row) => total + row.flush, 0),
	}
}
