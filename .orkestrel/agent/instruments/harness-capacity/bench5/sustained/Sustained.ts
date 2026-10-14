import type { EnduranceRuntime } from '../endurance/types.js'
import type { RefitFile } from '../refit/types.js'
import type { MatrixFreeze } from '../matrix/types.js'
import type {
	SustainedAttempt,
	SustainedCandidate,
	SustainedClassification,
	SustainedExecution,
	SustainedLimits,
	SustainedSelection,
} from './types.js'
import { mkdirSync, existsSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { DEFAULT_LEDGER_LIMIT, LEDGER_QUESTIONS } from '../../vendor/agent-0.0.30-trimmed/index.js'
import { DAEMON, MICA_CONTEXT, TIMEOUT } from '../constants.js'
import { Driver, parseFlags } from '../Driver.js'
import { readRuntime } from '../endurance/helpers.js'
import { readJSON, readRows, describeError } from '../helpers.js'
import { readBuild } from '../build/helpers.js'
import { readFrozen, readResource } from '../matrix/helpers.js'
import { hashFile, verifyFiles } from '../refit/helpers.js'
import {
	SUSTAINED_RANK,
	readClassification,
	readSustainedSelection,
	readSustainedPolicy,
	readSustainedExploration,
	verifyMatrixRefusal,
	readPreparationFailure,
	readPilotFeasibility,
	buildEvaluationLimits,
	readSustainedBoundary,
} from './helpers.js'
import { isMatrixRequest } from '../matrix/validators.js'
import { isRecord } from '@orkestrel/contract'
import { readSustainedRun } from './parsers.js'
import { isSustainedCandidate, isSustainedExploration } from './validators.js'
import { readSustainedDirected } from './directed/helpers.js'

function write(path: string, value: unknown): void {
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' })
}

function files(directory: string): readonly RefitFile[] {
	if (!existsSync(directory)) return []
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory()
			? files(join(directory, entry.name))
			: [hashFile(join(directory, entry.name))],
	)
}

/** Materializes finite preparation/development limits from fixed implementation bounds.
 * @param runtime - Safe complete work horizon
 * @param frozen - Unchanged role and retry settings
 * @param window - Fixed selected physical window
 * @param evidence - Bound prerequisite identities
 * @returns Limits with the exact derivation retained
 */
export function buildSustainedLimits(
	runtime: EnduranceRuntime,
	frozen: MatrixFreeze,
	window: number,
	evidence: readonly RefitFile[],
): SustainedLimits {
	const messages = runtime.seed.length + runtime.goals.length * (DEFAULT_LEDGER_LIMIT * 2 + 1)
	const questions = Object.keys(LEDGER_QUESTIONS).length + runtime.topics.length + 1
	const calls =
		messages * messages * questions * (frozen.configuration.retry + 1) +
		runtime.goals.length * DEFAULT_LEDGER_LIMIT * 4
	return {
		calls,
		tokens: calls * (window + MICA_CONTEXT + frozen.configuration.predict),
		retries: frozen.configuration.retry,
		wall: runtime.goals.length * TIMEOUT,
		goals: runtime.goals.length,
		derivation: `Fixed bounded messages=${messages}; pairwise filing heads=${questions}; retries=${frozen.configuration.retry}; decision passes=${DEFAULT_LEDGER_LIMIT}; token bound includes physical window, judge context and summarizer completion. Each goal retains the existing ${TIMEOUT}ms ceiling.`,
		evidence,
	}
}

/** Executes bounded e1 phases through the one shared Driver and existing refit artifacts. */
export class Sustained {
	/** Executes a create-only phase.
	 * @param args - Explicit phase and prerequisite paths
	 * @returns Zero for accepted evidence, three for retained infeasibility
	 */
	static async execute(args: readonly string[]): Promise<number> {
		readBuild()
		const { values, positionals } = parseArgs({
			args: [...args],
			allowPositionals: true,
			options: {
				out: { type: 'string' },
				frozen: { type: 'string' },
				resource: { type: 'string' },
				pilot: { type: 'string' },
				preparation: { type: 'string' },
				runtime: { type: 'string' },
				classification: { type: 'string' },
				fit: { type: 'string' },
				development: { type: 'string' },
				evaluation: { type: 'string' },
				candidate: { type: 'string', multiple: true },
				selection: { type: 'string' },
				directed: { type: 'string' },
				arm: { type: 'string' },
				policy: { type: 'string' },
				exploration: { type: 'string' },
				refusal: { type: 'string' },
				withhold: { type: 'boolean', default: false },
				seed: { type: 'string' },
				url: { type: 'string', default: DAEMON },
				live: { type: 'boolean', default: false },
			},
		})
		const phase = positionals[0]
		if (positionals.length !== 1 || values.out === undefined)
			throw new Error(
				'usage: sustained.js filing|development|candidate|select|evaluate --out NEW_PATH [explicit prerequisite flags]',
			)
		const out = resolve(values.out)
		if (existsSync(out)) throw new Error('phase output already exists; evidence cannot restart')
		const runner = new Sustained()
		if (values.directed !== undefined) {
			if (
				!values.live ||
				(phase !== 'filing' && phase !== 'evaluate') ||
				Object.entries(values).some(
					([key, value]) =>
						value !== undefined &&
						value !== false &&
						!['directed', 'out', 'url', 'live', 'classification', 'arm'].includes(key),
				) ||
				(phase === 'filing'
					? values.classification !== undefined || values.arm !== undefined
					: values.classification === undefined ||
						(values.arm !== 'records' && values.arm !== 'aggregate'))
			)
				throw new Error(
					'directed phases refuse identity overrides; evaluate requires --classification and --arm records|aggregate',
				)
			const reference = hashFile(resolve(values.directed))
			const { directed } = readSustainedDirected(reference.path)
			const execution: SustainedExecution = {
				protocol: 'e1',
				key: directed.key,
				think: directed.think,
				arm: values.arm === 'aggregate' ? 'aggregate' : 'records',
				phase: phase === 'filing' ? 'filing' : 'evaluation',
				frozen: directed.frozen,
				resource: directed.transfer.resource,
				runtime: directed.runtime,
				budget: directed.budget,
				limits: directed.limits,
				directed: reference,
				...(phase === 'filing'
					? {}
					: {
							classification: hashFile(resolve(values.classification ?? '')),
							fit: directed.transfer.fit,
						}),
			}
			if (phase === 'filing') return await runner.#filing(execution, out, values.url)
			const attempt = await runner.#attempt(execution, out, values.url)
			return attempt.accepted ? 0 : 3
		}
		if (values.arm !== undefined) throw new Error('--arm requires --directed')
		if (phase === 'policy') {
			if (values.selection === undefined)
				throw new Error('policy requires a refused qualified --selection')
			const qualified = hashFile(resolve(values.selection))
			const selection = readSustainedSelection(qualified.path)
			if (selection.accepted || selection.policy !== undefined)
				throw new Error('policy requires a refused qualified selection')
			write(out, { qualified, withhold: values.withhold })
			readSustainedPolicy(hashFile(out))
			return 0
		}
		const policy = values.policy === undefined ? undefined : hashFile(resolve(values.policy))
		if (policy !== undefined) readSustainedPolicy(policy)
		const exploration =
			values.exploration === undefined ? undefined : readJSON(resolve(values.exploration))
		if (exploration !== undefined && (!isSustainedExploration(exploration) || policy === undefined))
			throw new Error('exploration requires valid evidence and explicit policy')
		if (phase === 'select') {
			if (
				values.development === undefined ||
				values.evaluation === undefined ||
				values.seed === undefined ||
				values.candidate === undefined
			)
				throw new Error(
					'select requires --development --evaluation --seed --candidate (repeat in rank order)',
				)
			return runner.#select(
				values.development,
				values.evaluation,
				values.candidate,
				Number(values.seed),
				out,
				policy,
			)
		}
		if (phase === 'evaluate') {
			if (!values.live || values.selection === undefined || values.classification === undefined)
				throw new Error('evaluate requires --live --selection --classification')
			return await runner.#evaluate(values.selection, values.classification, out, values.url)
		}
		let frozenPath = values.frozen
		let resourcePath = values.resource
		let runtimePath = values.runtime
		if (phase === 'filing' && values.selection !== undefined) {
			const selection = readSustainedSelection(resolve(values.selection))
			const candidate = selection.candidates.at(-1)
			if (!selection.accepted || candidate === undefined)
				throw new Error('evaluation filing requires feasible frozen choice')
			if (frozenPath !== undefined || resourcePath !== undefined || runtimePath !== undefined)
				throw new Error('selection filing refuses identity overrides')
			frozenPath = candidate.frozen.path
			resourcePath = candidate.resource.path
			runtimePath = selection.evaluation.path
		}
		if (frozenPath === undefined || resourcePath === undefined)
			throw new Error('phase requires --frozen and --resource')
		const frozenRef = hashFile(resolve(frozenPath))
		const resourceRef = hashFile(resolve(resourcePath))
		const frozen = readFrozen(frozenRef)
		const resource = readResource(resourceRef, frozenRef)
		if (frozen.think || !SUSTAINED_RANK.includes(frozen.key))
			throw new Error('endurance uses ranked thinking-false configurations')
		if (phase === 'candidate') {
			if (policy !== undefined) {
				const admission =
					resource.accepted && exploration !== undefined
						? readSustainedExploration(
								{ policy, exploration, frozen: frozenRef, resource: resourceRef },
								frozen,
							)
						: undefined
				if (resource.accepted && (admission === undefined || admission.failures.length === 0))
					throw new Error(
						'exploratory candidate requires measured matrix/support refusal or actual paired development',
					)
				const candidate: SustainedCandidate = {
					key: frozen.key,
					frozen: frozenRef,
					resource: resourceRef,
					policy,
					exploration,
					classification: admission?.classification,
					attempts: [],
					accepted: false,
					failures: admission?.failures ?? ['matrix resource infeasible'],
				}
				write(out, candidate)
				return 3
			}
			const refusal = values.refusal === undefined ? undefined : hashFile(resolve(values.refusal))
			if (refusal !== undefined) verifyMatrixRefusal(refusal, frozen)
			const pilot = values.pilot === undefined ? undefined : hashFile(resolve(values.pilot))
			const preparation =
				values.preparation === undefined ? undefined : hashFile(resolve(values.preparation))
			if (preparation !== undefined) {
				if (runtimePath === undefined)
					throw new Error('failed preparation requires explicit development --runtime')
				readPreparationFailure(preparation, hashFile(resolve(runtimePath)), frozenRef)
			}
			if (
				resource.accepted &&
				refusal === undefined &&
				preparation === undefined &&
				(pilot === undefined || readPilotFeasibility(pilot, frozenRef, resourceRef))
			)
				throw new Error(
					'resource-feasible candidate requires a refused pilot or real development evidence',
				)
			const candidate: SustainedCandidate = {
				key: frozen.key,
				frozen: frozenRef,
				resource: resourceRef,
				pilot,
				refusal,
				preparation,
				attempts: [],
				accepted: false,
				failures: [
					refusal !== undefined
						? 'matrix strict calibration refused'
						: preparation !== undefined
							? 'development preparation infeasible'
							: resource.accepted
								? 'matrix pilot infeasible'
								: 'matrix resource infeasible',
				],
			}
			write(out, candidate)
			return 3
		}
		if (
			!values.live ||
			runtimePath === undefined ||
			resource.budget === undefined ||
			!resource.accepted
		)
			throw new Error('execution requires --live --runtime and accepted matrix resource')
		const runtimeRef = hashFile(resolve(runtimePath))
		const runtime = readRuntime(runtimeRef.path)
		const limits = buildSustainedLimits(runtime, frozen, resource.budget.window, [
			frozenRef,
			resourceRef,
			runtimeRef,
		])
		const execution: SustainedExecution = {
			protocol: 'e1',
			key: frozen.key,
			think: false,
			arm: 'records',
			phase: phase === 'filing' ? 'filing' : 'development',
			frozen: frozenRef,
			resource: resourceRef,
			runtime: runtimeRef,
			budget: resource.budget,
			limits,
		}
		if (phase === 'filing') return await runner.#filing(execution, out, values.url)
		if (
			phase !== 'development' ||
			values.classification === undefined ||
			(policy === undefined
				? values.pilot === undefined || values.fit === undefined
				: exploration === undefined)
		)
			throw new Error('development requires --pilot --classification --fit')
		const pilot = values.pilot === undefined ? undefined : hashFile(resolve(values.pilot))
		if (
			policy === undefined &&
			(pilot === undefined || !readPilotFeasibility(pilot, frozenRef, resourceRef))
		)
			throw new Error('development requires accepted exact matrix pilot')
		const classification = hashFile(resolve(values.classification))
		readClassification(classification, runtimeRef, frozenRef)
		const fit = values.fit === undefined ? undefined : hashFile(resolve(values.fit))
		mkdirSync(out, { recursive: true })
		const attempts: SustainedAttempt[] = []
		for (const arm of ['records', 'aggregate'] as const)
			attempts.push(
				await runner.#attempt(
					{ ...execution, arm, classification, fit, policy, exploration },
					join(out, arm),
					values.url,
				),
			)
		const failures = attempts.flatMap((attempt) => attempt.failures)
		const aggregate = attempts[1]
		if (aggregate === undefined || aggregate.exposed <= aggregate.served / 2)
			failures.push('development aggregate exposure is not a majority')
		const candidate: SustainedCandidate = {
			key: frozen.key,
			frozen: frozenRef,
			resource: resourceRef,
			pilot,
			policy,
			exploration,
			classification,
			fit,
			attempts,
			accepted: failures.length === 0,
			failures,
		}
		write(join(out, 'candidate.json'), candidate)
		return candidate.accepted ? 0 : 3
	}

	async #attempt(
		execution: SustainedExecution,
		directory: string,
		url: string,
	): Promise<SustainedAttempt> {
		mkdirSync(directory, { recursive: true })
		const path = join(directory, 'execution.json')
		write(path, execution)
		const run = join(directory, 'run')
		const failures: string[] = []
		try {
			const config = parseFlags([
				'--run',
				'--live',
				'--study',
				path,
				'--out',
				run,
				'--cache',
				join(directory, 'cache'),
				'--url',
				url,
			])
			if (!config.success) throw new Error(config.error)
			await new Driver(config.value).execute()
		} catch (error) {
			failures.push(describeError(error))
		}
		let served = 0
		let exposed = 0
		let retained = files(run)
		const errors: string[] = []
		try {
			const parsed = readSustainedRun(run)
			errors.push(...parsed.errors)
			failures.push(...parsed.failures)
			served = parsed.rows.length
			exposed = parsed.observations.filter((one) => one.exposed).length
			retained = [...parsed.files]
		} catch (error) {
			failures.push(describeError(error))
			errors.push(describeError(error))
		}
		const attempt: SustainedAttempt = {
			execution: hashFile(path),
			run,
			files: retained,
			accepted: failures.length === 0,
			failures,
			served,
			exposed,
		}
		write(join(directory, 'attempt.json'), attempt)
		if (errors.length !== 0) throw new Error(`operational trajectory fault: ${errors.join('; ')}`)
		return attempt
	}

	async #filing(execution: SustainedExecution, out: string, url: string): Promise<number> {
		mkdirSync(out, { recursive: true })
		const path = join(out, 'execution.json')
		write(path, execution)
		const run = join(out, 'run')
		const cache = join(out, 'cache', 'judge.jsonl')
		const failures: string[] = []
		try {
			const config = parseFlags([
				'--seed',
				'--live',
				'--study',
				path,
				'--out',
				run,
				'--cache',
				dirname(cache),
				'--url',
				url,
			])
			if (!config.success) throw new Error(config.error)
			await new Driver(config.value).execute()
		} catch (error) {
			failures.push(describeError(error))
		}
		if (!existsSync(cache)) {
			write(join(out, 'diagnosis.json'), { accepted: false, failures, files: files(run) })
			throw new Error('operational filing fault: missing retained cache')
		}
		const info = readJSON(join(run, 'run.json'))
		const requests = readRows(join(run, 'requests.jsonl'))
		if (!isRecord(info) || !requests.every(isMatrixRequest))
			throw new Error('operational filing fault: malformed retained evidence')
		const boundary = readSustainedBoundary(info, requests, execution, readFrozen(execution.frozen))
		failures.push(...boundary.failures, ...boundary.errors)
		const classification: SustainedClassification = {
			protocol: 'e1',
			runtime: execution.runtime,
			frozen: execution.frozen,
			cache: hashFile(cache),
			files: [hashFile(path), ...files(run), hashFile(join(dirname(cache), 'lineage.json'))],
			accepted: failures.length === 0,
			failures,
		}
		write(join(out, 'classification.json'), classification)
		if (boundary.errors.length !== 0)
			throw new Error(`operational filing fault: ${boundary.errors.join('; ')}`)
		return classification.accepted ? 0 : 3
	}

	#select(
		developmentPath: string,
		evaluationPath: string,
		paths: readonly string[],
		seed: number,
		out: string,
		policy?: RefitFile,
	): number {
		if (!Number.isSafeInteger(seed) || seed < 0)
			throw new Error('seed must be a nonnegative safe integer')
		const development = hashFile(resolve(developmentPath))
		const evaluation = hashFile(resolve(evaluationPath))
		const runtime = readRuntime(evaluation.path)
		const candidates = paths.map((path) => readJSON(resolve(path)))
		if (!candidates.every(isSustainedCandidate)) throw new Error('malformed candidate evidence')
		const chosen = candidates.at(-1)
		let limits: SustainedLimits | undefined
		if (chosen?.accepted) {
			const runs = chosen.attempts.map((attempt) => readSustainedRun(attempt.run))
			if (
				runs.some(
					(run) => run.failures.length !== 0 || run.execution.runtime.hash !== development.hash,
				)
			)
				throw new Error('development evidence is invalid or foreign')
			limits = buildEvaluationLimits(runs, runtime.goals.length)
		}
		const accepted = chosen?.accepted === true
		const selection: SustainedSelection = {
			policy,
			protocol: 'e1',
			development,
			evaluation,
			candidates,
			chosen: accepted ? chosen?.key : undefined,
			seed,
			order: seed % 2 === 0 ? ['records', 'aggregate'] : ['aggregate', 'records'],
			limits,
			accepted,
			failures: accepted ? [] : ['no feasible ranked configuration'],
		}
		write(out, selection)
		readSustainedSelection(out)
		return accepted ? 0 : 3
	}

	async #evaluate(
		path: string,
		classificationPath: string,
		out: string,
		url: string,
	): Promise<number> {
		const selectionRef = hashFile(resolve(path))
		const selection = readSustainedSelection(selectionRef.path)
		const candidate = selection.candidates.at(-1)
		if (
			!selection.accepted ||
			candidate === undefined ||
			selection.limits === undefined ||
			(selection.policy === undefined && candidate.fit === undefined)
		)
			throw new Error('no feasible frozen evaluation choice')
		const resource = readResource(candidate.resource, candidate.frozen)
		if (resource.budget === undefined) throw new Error('missing selected resource budget')
		const classification = hashFile(resolve(classificationPath))
		readClassification(classification, selection.evaluation, candidate.frozen)
		verifyFiles(selection.limits.evidence)
		mkdirSync(out, { recursive: true })
		const attempts: SustainedAttempt[] = []
		for (const arm of selection.order)
			attempts.push(
				await this.#attempt(
					{
						protocol: 'e1',
						key: candidate.key,
						think: false,
						arm,
						phase: 'evaluation',
						frozen: candidate.frozen,
						resource: candidate.resource,
						runtime: selection.evaluation,
						budget: resource.budget,
						limits: selection.limits,
						classification,
						fit: candidate.fit,
						selection: selectionRef,
						policy: selection.policy,
						exploration: candidate.exploration,
					},
					join(out, arm),
					url,
				),
			)
		write(join(out, 'evaluation.json'), {
			protocol: 'e1',
			selection: selectionRef,
			order: selection.order,
			attempts,
			accepted: attempts.every((attempt) => attempt.accepted),
		})
		return attempts.every((attempt) => attempt.accepted) ? 0 : 3
	}
}
