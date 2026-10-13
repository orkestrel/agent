import type { EnduranceRuntime } from '../endurance/types.js'
import type { MatrixFreeze, MatrixRequest } from '../matrix/types.js'
import type { RefitFile } from '../refit/types.js'
import type {
	SustainedClassification,
	SustainedCandidate,
	SustainedExploration,
	SustainedPrerequisite,
	SustainedAdmission,
	SustainedBoundary,
	SustainedExecution,
	SustainedLimits,
	SustainedRun,
	SustainedSelection,
} from './types.js'
import { isDeepStrictEqual } from 'node:util'
import { dirname, join, resolve } from 'node:path'
import { isRecord } from '@orkestrel/contract'
import { readJSON, readRows, readWireReading } from '../helpers.js'
import { readRuntime } from '../endurance/helpers.js'
import {
	buildBudget,
	readFrozen,
	readDevelopment,
	matchesCappedSummary,
	readResource,
	readAttempt,
	readRequestOutcome,
	listResourceFailures,
	listCapacityFailures,
	verifyMatrixFeasibility,
} from '../matrix/helpers.js'
import { verifyFiles, readRefitAssessment, selectMajorityCutoff } from '../refit/helpers.js'
import { isMatrixAttempt, isMatrixRequest } from '../matrix/validators.js'
import { isRefitFile, isRefitGeneration } from '../refit/validators.js'
import { readSustainedRun } from './parsers.js'
import { parseMatrixRun } from '../matrix/parsers.js'
import { listMatrixPairFailures, matchesMatrixExposure } from '../matrix/helpers.js'
import {
	isSustainedClassification,
	isSustainedPolicy,
	isSustainedExecution,
	isSustainedSelection,
} from './validators.js'
import { readWorkload } from '../build/helpers.js'

/** Holds the accepted feasibility-only ranking. */
export const SUSTAINED_RANK = Object.freeze(['q4', 'g4', 'q2', 'g2'])

/** Recomputes request and limit validity without trusting stored failure flags.
 * @param info - Retained run metadata
 * @param requests - Actual request boundary evidence
 * @param execution - Validated frozen execution
 * @param frozen - Validated model roles
 * @returns Operational errors separately from measured resource and limit refusals
 */
export function readSustainedBoundary(
	info: Readonly<Record<string, unknown>>,
	requests: readonly MatrixRequest[],
	execution: SustainedExecution,
	frozen: MatrixFreeze,
): SustainedBoundary {
	const policy =
		execution.policy === undefined ? undefined : readSustainedPolicy(execution.policy).policy
	const errors: string[] = [...listCapacityFailures(requests, frozen, execution.budget)]
	const failures: string[] = []
	let calls = 0
	let tokens = 0
	const elapsed = typeof info.wall === 'number' && Number.isFinite(info.wall) && info.wall >= 0
	const expired = elapsed && Number(info.wall) >= execution.limits.wall
	for (const [at, request] of requests.entries()) {
		const reading = readWireReading({ body: request.request }, { text: request.response })
		const limited = calls >= execution.limits.calls || tokens >= execution.limits.tokens || expired
		if (request.sequence !== at + 1) errors.push(`request ${request.sequence}: sequence differs`)
		if (!request.sent && (failures.length !== 0 || limited)) {
			if (limited) failures.push('whole-trajectory limit reached')
			continue
		}
		if (failures.length !== 0)
			errors.push(`request ${request.sequence}: sent after resource refusal`)
		const withheld =
			calls < execution.limits.calls &&
			tokens + (reading.prompt ?? 0) + (reading.completion ?? 0) <= execution.limits.tokens &&
			matchesCappedSummary(
				request,
				frozen,
				execution,
				policy,
				false,
				failures.length === 0 ? undefined : failures[0],
			)
		const outcome = readRequestOutcome(request, execution.budget, frozen)
		if (outcome === 'fault') {
			if (
				request.abort === 'wall' &&
				isMatrixRequest(request) &&
				(request.status === undefined || (request.status >= 200 && request.status < 300)) &&
				typeof info.started === 'number' &&
				Number.isFinite(info.started) &&
				typeof info.finished === 'number' &&
				Number.isFinite(info.finished) &&
				info.finished - info.started === info.wall &&
				info.started <= request.started &&
				request.started < info.started + execution.limits.wall &&
				request.finished >= info.started + execution.limits.wall &&
				request.finished <= info.finished
			)
				failures.push('whole-trajectory wall limit reached')
			else errors.push(`request ${request.sequence}: operational transport or response fault`)
		}
		if (outcome === 'refused' && !withheld)
			failures.push(
				`request ${request.sequence}: completed response violates resource or usage bounds`,
			)
		const role =
			request.role === 'judge'
				? frozen.judge
				: request.role === 'summarizer'
					? frozen.summarizer
					: frozen.decision
		if (!isRecord(request.request) || request.request.model !== role.model)
			errors.push(`request ${request.sequence}: model role differs`)
		if (request.role !== 'judge' && (!isRecord(request.request) || request.request.think !== false))
			errors.push(`request ${request.sequence}: thinking differs`)
		if (
			request.role === 'summarizer' &&
			(!isRecord(request.request) ||
				!isDeepStrictEqual(request.request.options, frozen.summarizer.sampler))
		)
			errors.push(`request ${request.sequence}: summarizer configuration differs`)
		if (
			request.prompt !== reading.prompt ||
			request.completion !== reading.completion ||
			request.reason !== reading.reason
		)
			errors.push(`request ${request.sequence}: altered actual usage`)
		const resource = listResourceFailures(
			request.role,
			request.request,
			request.response,
			execution.budget,
			request.status,
			request.error,
			request.capacity,
			request.goal === undefined,
		)
		if (!isDeepStrictEqual(resource, request.failures))
			errors.push(`request ${request.sequence}: resource reading differs`)
		if (outcome === 'refused' && !withheld)
			failures.push(...resource.map((failure) => `request ${request.sequence}: ${failure}`))
		if (request.sent) calls += 1
		tokens += (reading.prompt ?? 0) + (reading.completion ?? 0)
	}
	if (calls !== info.sent || tokens !== info.tokens || !elapsed)
		errors.push('actual request, token, or elapsed counts differ')
	if (calls > execution.limits.calls)
		errors.push('requests continued beyond whole-trajectory call limit')
	if (tokens > execution.limits.tokens || expired) failures.push('whole-trajectory limit reached')
	if (info.status !== 'complete' && failures.length === 0)
		errors.push('run ended without measured resource refusal')
	return { errors, failures }
}

/** Derives the fixed evaluation limits from complete same-configuration development measurements.
 * @param runs - The complete paired development evidence
 * @param goals - The held-out fixed horizon
 * @returns The unchanged retry policy and development-derived finite limits
 */
export function buildEvaluationLimits(
	runs: readonly SustainedRun[],
	goals: number,
): SustainedLimits {
	const first = runs[0]
	if (first === undefined || runs.some((run) => run.failures.length > 0))
		throw new Error('complete development evidence required for limits')
	const scale = goals / Math.max(...runs.map((run) => run.runtime.goals.length))
	const calls = Math.max(...runs.map((run) => run.requests.filter((one) => one.sent).length))
	const tokens = Math.max(
		...runs.map((run) =>
			run.costs.wire.reduce((total, cost) => total + cost.prompt + cost.completion, 0),
		),
	)
	const wall = Math.max(
		...runs.map((run) => (typeof run.costs.elapsed === 'number' ? run.costs.elapsed : 0)),
	)
	return {
		calls: Math.max(1, Math.ceil(calls * scale * 2)),
		tokens: Math.max(1, Math.ceil(tokens * scale * 2)),
		wall: Math.max(1, Math.ceil(wall * scale * 2)),
		retries: first.frozen.configuration.retry,
		goals,
		derivation: `Twice the maximum complete same-configuration development expenditure, scaled by evaluation/development goals (${scale}); all roles included; no reserve/window/retry change. Wall is whole-run elapsed, never the sum of overlapping timers.`,
		evidence: runs.flatMap((run) => run.files),
	}
}

/** Verifies genuine failed development preparation without accepting arbitrary diagnoses or quality labels.
 * @param reference - Retained classification, generation, or unseparated fit
 * @param runtime - Exact development runtime
 * @param frozen - Exact candidate configuration
 */
export function readPreparationFailure(
	reference: RefitFile,
	runtime: RefitFile,
	frozen: RefitFile,
): void {
	verifyFiles([reference, runtime, frozen])
	const value = readJSON(reference.path)
	if (isSustainedClassification(value)) {
		if (
			value.accepted ||
			value.failures.length === 0 ||
			value.runtime.hash !== runtime.hash ||
			value.frozen.hash !== frozen.hash
		)
			throw new Error('preparation is successful or foreign')
		verifyFiles([value.cache, ...value.files])
		const metadata = value.files.find((file) => file.path.endsWith('run.json'))
		const info = metadata === undefined ? undefined : readJSON(metadata.path)
		const requests =
			metadata === undefined ? [] : readRows(join(dirname(metadata.path), 'requests.jsonl'))
		if (
			!isRecord(info) ||
			!isSustainedExecution(info.execution) ||
			info.execution.phase !== 'filing' ||
			info.execution.runtime.hash !== runtime.hash ||
			info.execution.frozen.hash !== frozen.hash ||
			!requests.every(isMatrixRequest)
		)
			throw new Error('failed filing lacks actual resource or integrity evidence')
		const boundary = readSustainedBoundary(info, requests, info.execution, readFrozen(frozen))
		if (boundary.errors.length !== 0 || boundary.failures.length === 0)
			throw new Error('operational filing fault is not configuration infeasibility')
		return
	}
	const configuration = readFrozen(frozen)
	if (isRefitGeneration(value)) {
		if (
			value.complete ||
			value.errors.length === 0 ||
			value.sustained?.runtime.hash !== runtime.hash ||
			!isDeepStrictEqual(value.matrix, configuration)
		)
			throw new Error('generation is successful or foreign')
		readClassification(value.sustained.classification, runtime, frozen)
		verifyFiles([value.evidence, value.controls, ...value.files])
		throw new Error('operational generation fault is not configuration infeasibility')
	}
	const diagnosis = readRefitAssessment(reference)
	const generated = readJSON(diagnosis.preparation.manifest.path)
	if (
		diagnosis.accepted ||
		diagnosis.errors.length !== 0 ||
		!isRefitGeneration(generated) ||
		!generated.complete ||
		generated.errors.length !== 0 ||
		generated.sustained?.runtime.hash !== runtime.hash ||
		!isDeepStrictEqual(generated.matrix, configuration)
	)
		throw new Error('unseparated fit custody differs')
	const ancestry = readClassification(generated.sustained.classification, runtime, frozen)
	if (
		generated.model !== configuration.summarizer.model ||
		!isDeepStrictEqual(generated.settings, configuration.configuration)
	)
		throw new Error('generation settings differ from frozen configuration')
	if (
		!isDeepStrictEqual(generated.files, [
			...configuration.files,
			configuration.settings,
			generated.sustained.runtime,
			generated.sustained.classification,
			ancestry.cache,
			...ancestry.files,
		])
	)
		throw new Error('implementation custody membership mismatch')
}

/** Reads sealed classification evidence and refuses changed scenario or role ancestry.
 * @param reference - Exact manifest identity
 * @param runtime - Required runtime bytes
 * @param frozen - Required matrix configuration bytes
 * @returns Verified runtime-only classification ancestry
 */
export function readClassification(
	reference: RefitFile,
	runtime: RefitFile,
	frozen: RefitFile,
): SustainedClassification {
	verifyFiles([reference, runtime, frozen])
	const value = readJSON(reference.path)
	if (
		!isSustainedClassification(value) ||
		!value.accepted ||
		value.failures.length !== 0 ||
		value.runtime.hash !== runtime.hash ||
		value.frozen.hash !== frozen.hash
	)
		throw new Error('foreign, failed, or corrupt classification ancestry')
	verifyFiles([value.cache, ...value.files])
	const run = value.files.find((file) => file.path.endsWith('run.json'))
	const report = run === undefined ? undefined : readJSON(run.path)
	if (
		!isRecord(report) ||
		report.protocol !== 'e1' ||
		report.status !== 'complete' ||
		!isSustainedExecution(report.execution) ||
		report.execution.phase !== 'filing' ||
		report.execution.runtime.hash !== runtime.hash ||
		report.execution.frozen.hash !== frozen.hash
	)
		throw new Error('classification has no complete runtime-only filing evidence')
	const requests = run === undefined ? [] : readRows(join(dirname(run.path), 'requests.jsonl'))
	if (!requests.every(isMatrixRequest) || requests.some((request) => request.role !== 'judge'))
		throw new Error('classification raw usage or completion is invalid')
	const boundary = readSustainedBoundary(report, requests, report.execution, readFrozen(frozen))
	if (boundary.errors.length !== 0 || boundary.failures.length !== 0)
		throw new Error('classification raw usage or completion is invalid')
	return value
}

/** Checks the accepted development fit and explicit transfer custody.
 * @param reference - Fitted thresholds
 * @param frozen - Required role and source identity
 * @param development - The runtime used to fit, distinct from held-out runtime
 */
export function verifySustainedFit(
	reference: RefitFile,
	frozen: MatrixFreeze,
	development: RefitFile,
): void {
	verifyFiles([reference, development])
	const fit = readJSON(reference.path)
	if (
		!isRecord(fit) ||
		fit.separated !== true ||
		!isRecord(fit.sustained) ||
		fit.sustained.runtime !== development.hash ||
		!isRecord(fit.matrix) ||
		!isDeepStrictEqual(fit.matrix.summarizer, frozen.summarizer) ||
		!isDeepStrictEqual(fit.matrix.judge, frozen.judge) ||
		!isDeepStrictEqual(fit.matrix.files, frozen.files) ||
		fit.matrix.settings !== frozen.settings.hash
	)
		throw new Error('development fit transfer lacks accepted exact scenario and role custody')
	if (
		!isRecord(fit.preparation) ||
		!isRefitFile(fit.preparation.manifest) ||
		!isRefitFile(fit.preparation.attempts) ||
		!isRefitFile(fit.preparation.corpus) ||
		!isRefitFile(fit.preparation.labels) ||
		!isRecord(fit.custody)
	)
		throw new Error('development fit lacks independent calibration custody')
	verifyFiles([
		fit.preparation.manifest,
		fit.preparation.attempts,
		fit.preparation.corpus,
		fit.preparation.labels,
	])
	const generation = readJSON(fit.preparation.manifest.path)
	if (
		!isRefitGeneration(generation) ||
		!generation.complete ||
		generation.errors.length !== 0 ||
		generation.sustained?.runtime.hash !== development.hash ||
		generation.sustained.classification.hash !== fit.sustained.classification ||
		generation.attempts !== fit.preparation.attempts.hash ||
		generation.corpus !== fit.preparation.corpus.hash ||
		fit.custody.manifest !== fit.preparation.manifest.hash ||
		fit.custody.labels !== fit.preparation.labels.hash
	)
		throw new Error('development fit generation or adjudication differs')
	verifyFiles([generation.evidence, generation.controls, ...generation.files])
}

/** Reads a frozen exploratory route only after a complete refused qualified selection.
 * @param reference - The immutable exploratory policy
 * @returns The policy and its independently validated qualified prerequisite
 */
export function readSustainedPolicy(reference: RefitFile): SustainedPrerequisite {
	verifyFiles([reference])
	const policy = readJSON(reference.path)
	if (!isSustainedPolicy(policy)) throw new Error('invalid exploratory sustained policy')
	verifyFiles([policy.qualified])
	const qualified = readJSON(policy.qualified.path)
	if (!isSustainedSelection(qualified) || qualified.policy !== undefined || qualified.accepted)
		throw new Error('exploration requires a refused qualified sustained selection')
	const selection = readSustainedSelection(policy.qualified.path)
	return { policy, selection }
}

/** Verifies a matrix support refusal against its own generation and the target summarizer.
 * @param reference - The independently labeled strict diagnosis
 * @param frozen - The target cell configuration
 */
export function verifyMatrixRefusal(reference: RefitFile, frozen: MatrixFreeze): void {
	const assessment = readRefitAssessment(reference)
	const generation = readJSON(assessment.preparation.manifest.path)
	if (
		assessment.accepted ||
		assessment.errors.length !== 0 ||
		!isRefitGeneration(generation) ||
		!generation.complete ||
		generation.errors.length !== 0 ||
		generation.sustained !== undefined ||
		generation.matrix === undefined ||
		generation.model !== frozen.summarizer.model ||
		!isDeepStrictEqual(generation.settings, frozen.configuration)
	)
		throw new Error('matrix prerequisite lacks a completed strict calibration refusal')
	for (const field of [
		'summarizer',
		'judge',
		'files',
		'settings',
		'seed',
		'configuration',
	] as const)
		if (!isDeepStrictEqual(generation.matrix[field], frozen[field]))
			throw new Error(`matrix prerequisite ${field} custody differs`)
}

/** Reads candidate-specific matrix exposure and independent endurance calibration.
 * @param execution - The explicit exploratory development or evaluation execution
 * @param frozen - The exact role and source configuration
 * @returns The own-scenario fit when feasible and measured admission failures otherwise
 */
export function readSustainedExploration(
	execution: Pick<SustainedCandidate, 'policy' | 'exploration' | 'frozen' | 'resource'>,
	frozen: MatrixFreeze,
): SustainedAdmission {
	if (execution.policy === undefined || execution.exploration === undefined)
		throw new Error('explicit exploratory sustained execution required')
	const { selection } = readSustainedPolicy(execution.policy)
	const exploration = execution.exploration
	const failures = [...readSustainedMatrix(exploration, execution.frozen, execution.resource)]
	if (exploration.diagnosis === undefined) {
		if (failures.length === 0) throw new Error('exploratory endurance diagnosis absent')
		return { failures }
	}
	const assessment = readRefitAssessment(exploration.diagnosis)
	const generation = readJSON(assessment.preparation.manifest.path)
	if (
		assessment.errors.length !== 0 ||
		!isRefitGeneration(generation) ||
		!generation.complete ||
		generation.errors.length !== 0 ||
		!isDeepStrictEqual(generation.matrix, frozen) ||
		generation.model !== frozen.summarizer.model ||
		!isDeepStrictEqual(generation.settings, frozen.configuration) ||
		generation.sustained === undefined ||
		!isDeepStrictEqual(generation.sustained.runtime, selection.development)
	)
		throw new Error('exploratory endurance generation has foreign or operational custody')
	const ancestry = readClassification(
		generation.sustained.classification,
		selection.development,
		execution.frozen,
	)
	if (
		!isDeepStrictEqual(generation.files, [
			...frozen.files,
			frozen.settings,
			generation.sustained.runtime,
			generation.sustained.classification,
			ancestry.cache,
			...ancestry.files,
		])
	)
		throw new Error('exploratory endurance classification or source population differs')
	const cutoff = assessment.accepted ? assessment.cutoff : selectMajorityCutoff(assessment)
	if (cutoff === undefined) failures.push('endurance support admits no exploratory majority cutoff')
	return {
		classification: generation.sustained.classification,
		fit:
			cutoff === undefined
				? undefined
				: { agree: cutoff, change: assessment.change, separated: assessment.accepted },
		failures,
	}
}

/** Reads exact matrix feasibility for an exploratory sustained candidate.
 * @param exploration - The retained qualified pilot or exploratory pair
 * @param frozen - The candidate's exact freeze
 * @param resource - The candidate's accepted resource
 * @returns Measured matrix exposure or pairing failures
 */
export function readSustainedMatrix(
	exploration: SustainedExploration,
	frozen: RefitFile,
	resource: RefitFile,
): readonly string[] {
	if ('pilot' in exploration.matrix)
		return readPilotFeasibility(exploration.matrix.pilot, frozen, resource)
			? []
			: ['matrix pilot infeasible']
	const budget = readResource(resource, frozen).budget
	if (budget === undefined) throw new Error('exploratory matrix resource lacks accepted budget')
	const pair = [exploration.matrix.records, exploration.matrix.aggregate].map((reference) => {
		verifyFiles([reference])
		if (resolve(reference.path) !== resolve(dirname(reference.path), 'run.json'))
			throw new Error('matrix exploration must bind raw run metadata')
		const run = parseMatrixRun(dirname(reference.path))
		if (
			run === undefined ||
			run.execution.phase !== 'development' ||
			run.execution.copy !== 1 ||
			!isDeepStrictEqual(run.execution.frozen, frozen) ||
			!isDeepStrictEqual(run.execution.budget, budget) ||
			run.execution.development === undefined
		)
			throw new Error('exploratory matrix exposure belongs to another cell')
		const development = readDevelopment(run.execution, run.frozen)
		if (!isDeepStrictEqual(development.resource, resource))
			throw new Error('exploratory matrix resource differs')
		if (run.failures.length !== 0)
			throw new Error('exploratory matrix pair has invalid raw evidence')
		return run
	})
	const [records, aggregate] = pair
	if (
		records === undefined ||
		aggregate === undefined ||
		records.execution.arm !== 'records' ||
		aggregate.execution.arm !== 'aggregate'
	)
		throw new Error('exploratory matrix exposure requires records and aggregate arms')
	if (!isDeepStrictEqual(records.execution.development, aggregate.execution.development))
		throw new Error('exploratory matrix pair policies differ')
	const failures = [...listMatrixPairFailures(records, aggregate)]
	if (
		aggregate.rows.filter((row) => matchesMatrixExposure(aggregate, row.goal)).length <=
		aggregate.rows.length / 2
	)
		failures.push('matrix exploratory body exposure is not a majority')
	return failures
}

/** Reads the retained first-feasible choice, including a fully evidenced inconclusive result.
 * @param path - Selection manifest
 * @returns Verified frozen ranked selection
 */
export function readSustainedSelection(path: string): SustainedSelection {
	const value = readJSON(path)
	if (!isSustainedSelection(value)) throw new Error('invalid e1 selection')
	verifyFiles([value.development, value.evaluation])
	const development = readRuntime(value.development.path)
	const evaluation = readRuntime(value.evaluation.path)
	const prerequisite =
		value.policy === undefined ? undefined : readSustainedPolicy(value.policy).selection
	if (
		prerequisite !== undefined &&
		(!isDeepStrictEqual(value.development, prerequisite.development) ||
			!isDeepStrictEqual(value.evaluation, prerequisite.evaluation) ||
			value.seed !== prerequisite.seed ||
			!isDeepStrictEqual(value.order, prerequisite.order))
	)
		throw new Error('exploratory selection changes the refused qualified horizon or order')
	let expectedLimits: SustainedLimits | undefined
	if (
		!isDeepStrictEqual(
			value.order,
			value.seed % 2 === 0 ? ['records', 'aggregate'] : ['aggregate', 'records'],
		)
	)
		throw new Error('arm order differs from frozen seed')
	if (development.id === evaluation.id || value.development.hash === value.evaluation.hash)
		throw new Error('development and held-out identities must differ')
	for (const [at, candidate] of value.candidates.entries()) {
		if (candidate.key !== SUSTAINED_RANK[at])
			throw new Error('candidate ranking skipped a configuration')
		if (!isDeepStrictEqual(candidate.policy, value.policy))
			throw new Error('candidate exploratory policy differs from selection')
		const frozen = readFrozen(candidate.frozen)
		if (frozen.key !== candidate.key || frozen.think)
			throw new Error('endurance requires ranked non-thinking configuration')
		const resource = readResource(candidate.resource, candidate.frozen)
		const pilot =
			candidate.pilot === undefined
				? undefined
				: readPilotFeasibility(candidate.pilot, candidate.frozen, candidate.resource)
		if (
			candidate.accepted &&
			(!resource.accepted || (value.policy === undefined && pilot !== true))
		)
			throw new Error('candidate matrix feasibility not established')
		if (candidate.refusal !== undefined) {
			if (candidate.accepted || value.policy !== undefined)
				throw new Error('matrix refusal belongs to rejected qualified prerequisites')
			verifyMatrixRefusal(candidate.refusal, frozen)
		}
		const admission =
			candidate.exploration === undefined ? undefined : readSustainedExploration(candidate, frozen)
		if (
			candidate.accepted &&
			value.policy !== undefined &&
			(admission?.fit === undefined || admission.failures.length !== 0)
		)
			throw new Error('exploratory candidate lacks independent feasible admission')
		if (
			admission?.classification !== undefined &&
			!isDeepStrictEqual(admission.classification, candidate.classification)
		)
			throw new Error('candidate classification differs from independent diagnosis')
		const developmentRuns = candidate.attempts.map((attempt) => {
			verifyFiles([attempt.execution, ...attempt.files])
			const run = readSustainedRun(attempt.run)
			if (run.errors.length !== 0)
				throw new Error('operational development fault is not configuration infeasibility')
			if (
				run.execution.phase !== 'development' ||
				!isDeepStrictEqual(run.execution.policy, value.policy) ||
				!isDeepStrictEqual(run.execution.exploration, candidate.exploration) ||
				run.execution.runtime.hash !== value.development.hash ||
				run.execution.frozen.hash !== candidate.frozen.hash ||
				run.execution.resource.hash !== candidate.resource.hash ||
				attempt.accepted !== (run.failures.length === 0) ||
				run.rows.length !== attempt.served ||
				run.observations.filter((one) => one.exposed).length !== attempt.exposed ||
				!isDeepStrictEqual(run.files, attempt.files)
			)
				throw new Error('development attempt contradicts raw evidence')
			return run
		})
		if (
			candidate.accepted &&
			(candidate.classification === undefined ||
				(value.policy === undefined && candidate.fit === undefined) ||
				candidate.attempts.length !== 2 ||
				candidate.attempts.some((attempt) => !attempt.accepted || attempt.failures.length !== 0))
		)
			throw new Error('candidate lacks paired development feasibility')
		if (candidate.classification !== undefined)
			readClassification(candidate.classification, value.development, candidate.frozen)
		if (candidate.fit !== undefined) verifySustainedFit(candidate.fit, frozen, value.development)
		if (candidate.preparation !== undefined) {
			if (candidate.accepted) throw new Error('accepted candidate carries failed preparation')
			readPreparationFailure(candidate.preparation, value.development, candidate.frozen)
		}
		const records = developmentRuns.find((run) => run.execution.arm === 'records')
		const aggregate = developmentRuns.find((run) => run.execution.arm === 'aggregate')
		const pairedFailure =
			records !== undefined &&
			aggregate !== undefined &&
			(listMatrixPairFailures(records, aggregate).length !== 0 ||
				aggregate.observations.filter((one) => one.exposed).length <= aggregate.rows.length / 2)
		if (
			!candidate.accepted &&
			resource.accepted &&
			candidate.preparation === undefined &&
			candidate.refusal === undefined &&
			(admission === undefined || admission.failures.length === 0) &&
			pilot !== false &&
			!candidate.attempts.some((attempt) => !attempt.accepted && attempt.failures.length > 0) &&
			!pairedFailure
		)
			throw new Error('infeasible candidate lacks retained failed evidence')
		if (candidate.accepted) {
			if (
				records === undefined ||
				aggregate === undefined ||
				listMatrixPairFailures(records, aggregate).length !== 0 ||
				aggregate.observations.filter((one) => one.exposed).length <= aggregate.rows.length / 2
			)
				throw new Error('paired development or majority exposure is not established')
			expectedLimits = buildEvaluationLimits(developmentRuns, evaluation.goals.length)
		}
		if (at < value.candidates.length - 1 && candidate.accepted)
			throw new Error('ranking continued after feasible configuration')
	}
	const chosen = value.candidates.at(-1)
	if (
		value.accepted
			? chosen?.accepted !== true ||
				value.chosen !== chosen.key ||
				value.limits === undefined ||
				value.failures.length !== 0
			: value.chosen !== undefined ||
				value.limits !== undefined ||
				value.candidates.length !== SUSTAINED_RANK.length ||
				value.candidates.some((candidate) => candidate.accepted)
	)
		throw new Error('selection contradicts ranked feasibility evidence')
	if (!isDeepStrictEqual(value.limits, expectedLimits))
		throw new Error('evaluation limits differ from complete development derivation')
	if (value.limits !== undefined) verifyFiles(value.limits.evidence)
	return value
}

/** Reads a safe runtime-bound shared Driver execution.
 * @param path - Execution file
 * @returns Validated identity, role freeze, and safe runtime
 */
export function readSustainedExecution(path: string): {
	readonly execution: SustainedExecution
	readonly frozen: MatrixFreeze
	readonly runtime: EnduranceRuntime
} {
	const execution = readJSON(path)
	if (!isSustainedExecution(execution)) throw new Error('invalid e1 execution')
	verifyFiles([execution.runtime, ...execution.limits.evidence])
	const frozen = readFrozen(execution.frozen)
	const resource = readResource(execution.resource, execution.frozen)
	if (!resource.accepted || !isDeepStrictEqual(resource.budget, execution.budget))
		throw new Error('e1 resource budget differs from accepted matrix reserve')
	const runtime = readRuntime(execution.runtime.path)
	readWorkload(execution.runtime)
	if (
		frozen.key !== execution.key ||
		frozen.think ||
		!isDeepStrictEqual(execution.budget, buildBudget(execution.budget.reserve)) ||
		execution.limits.goals !== runtime.goals.length ||
		execution.limits.retries !== frozen.configuration.retry
	)
		throw new Error('e1 frozen configuration or complete horizon differs')
	if (execution.phase === 'filing') {
		if (
			execution.arm !== 'records' ||
			execution.classification !== undefined ||
			execution.fit !== undefined ||
			execution.policy !== undefined ||
			execution.exploration !== undefined
		)
			throw new Error('filing must start from runtime-only empty ancestry')
	} else {
		if (execution.classification === undefined)
			throw new Error('sealed runtime classification required')
		readClassification(execution.classification, execution.runtime, execution.frozen)
		let development = execution.runtime
		if (execution.phase === 'evaluation') {
			if (execution.selection === undefined)
				throw new Error('held-out execution requires frozen selection')
			verifyFiles([execution.selection])
			const selection = readSustainedSelection(execution.selection.path)
			const candidate = selection.candidates.at(-1)
			if (
				!selection.accepted ||
				selection.chosen !== execution.key ||
				selection.evaluation.hash !== execution.runtime.hash ||
				candidate?.frozen.hash !== execution.frozen.hash ||
				!isDeepStrictEqual(selection.limits, execution.limits) ||
				execution.fit?.hash !== candidate.fit?.hash ||
				!isDeepStrictEqual(execution.policy, selection.policy) ||
				!isDeepStrictEqual(execution.exploration, candidate.exploration)
			)
				throw new Error('held-out execution differs from frozen choice or transfer')
			development = selection.development
		}
		if (execution.policy !== undefined) {
			const prerequisite = readSustainedPolicy(execution.policy).selection
			if (
				!isDeepStrictEqual(
					execution.runtime,
					execution.phase === 'evaluation' ? prerequisite.evaluation : prerequisite.development,
				)
			)
				throw new Error('exploratory execution changes its declared runtime')
			const admission = readSustainedExploration(execution, frozen)
			if (
				admission.fit === undefined ||
				admission.failures.length !== 0 ||
				(execution.phase === 'development' &&
					!isDeepStrictEqual(admission.classification, execution.classification))
			)
				throw new Error('exploratory sustained execution lacks independent feasible support')
		} else if (execution.arm === 'aggregate') {
			if (execution.fit === undefined)
				throw new Error('aggregate execution requires accepted development fit')
			verifySustainedFit(execution.fit, frozen, development)
		}
	}
	return { execution, frozen, runtime }
}

/** Rechecks pilot feasibility from exact raw resource, paired, and exposure evidence.
 * @param reference - Emitted pilot manifest
 * @param frozen - Required frozen configuration
 * @param resource - Required resource decision
 * @returns Whether the authentic pilot is feasible
 */
export function readPilotFeasibility(
	reference: RefitFile,
	frozen: RefitFile,
	resource: RefitFile,
): boolean {
	verifyFiles([reference, frozen, resource])
	const value = readJSON(reference.path)
	const reserve = readResource(resource, frozen)
	if (
		!isRecord(value) ||
		!isRefitFile(value.frozen) ||
		value.frozen.hash !== frozen.hash ||
		!isRefitFile(value.resource) ||
		value.resource.hash !== resource.hash ||
		!isRefitFile(value.fit) ||
		!isMatrixAttempt(value.attempt)
	)
		throw new Error('pilot belongs to another configuration')
	verifyFiles([value.frozen, value.resource, value.fit])
	const run = readAttempt(value.attempt)
	const baseline = reserve.attempts.at(-1)
	const records = baseline === undefined ? undefined : readAttempt(baseline)
	if (
		!reserve.accepted ||
		run?.execution.phase !== 'pilot' ||
		run.execution.frozen.hash !== frozen.hash ||
		run.execution.resource?.hash !== resource.hash ||
		run.execution.fit?.hash !== value.fit.hash ||
		!isDeepStrictEqual(run.execution.budget, reserve.budget)
	)
		throw new Error('pilot lacks exact resource and configuration custody')
	verifyMatrixFeasibility(run)
	const exposed = run.rows.filter((row) => matchesMatrixExposure(run, row.goal)).length
	const failures = [
		...run.failures,
		...(records === undefined
			? ['missing paired development evidence']
			: listMatrixPairFailures(records, run)),
	]
	if (exposed <= run.rows.length / 2)
		failures.push('nonempty wire body exposure is not a majority of served development goals')
	if (
		value.served !== run.rows.length ||
		value.exposed !== exposed ||
		value.accepted !== (failures.length === 0) ||
		!isDeepStrictEqual(value.failures, failures)
	)
		throw new Error('pilot contradicts raw feasibility evidence')
	return failures.length === 0
}
