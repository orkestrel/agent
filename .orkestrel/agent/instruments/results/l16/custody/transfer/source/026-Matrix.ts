import type {
	MatrixAttempt,
	MatrixExecution,
	MatrixFreeze,
	MatrixFull,
	MatrixPilot,
	MatrixResource,
} from './types.js'
import type { PlanEntry } from '../types.js'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { isRecord } from '@orkestrel/contract'
import {
	COPIES_DIR,
	DAEMON,
	MICA_CALIBRATION,
	MICA_CONTEXT,
	MICA_MODEL,
	MODELS,
	SAMPLER,
} from '../constants.js'
import { Driver, parseFlags, readSettings } from '../Driver.js'
import { describeError, readJSON } from '../helpers.js'
import { hashFile } from '../refit/helpers.js'
import { collectTransitions } from '../transitions/helpers.js'
import { MATRIX_RESERVES, MATRIX_STAGES } from './constants.js'
import {
	buildBudget,
	buildMatrixBound,
	listMatrixPairFailures,
	matchesMatrixExposure,
	nameMatrix,
	permitsReserve,
	readExecution,
	readFrozen,
	readDeployment,
	readDeploymentModel,
	readMatrixFiles,
	readModelDigest,
	readResource,
	readSeedCache,
	verifyMatrixFeasibility,
} from './helpers.js'
import { parseMatrixRun } from './parsers.js'
import { readBuild } from '../build/helpers.js'

/** Executes frozen l6 preparation and unscored admission phases. */
export class Matrix {
	/** Parses and executes one explicit matrix phase.
	 * @param argv - Arguments after matrix.ts
	 * @returns Exit 0 for success or 3 for explicit infeasibility
	 */
	static async execute(argv: readonly string[]): Promise<number> {
		readBuild()
		const { values, positionals } = parseArgs({
			args: [...argv],
			allowPositionals: true,
			options: {
				out: { type: 'string' },
				root: { type: 'string' },
				key: { type: 'string' },
				think: { type: 'string' },
				seed: { type: 'string' },
				settings: { type: 'string' },
				deployment: { type: 'string' },
				frozen: { type: 'string' },
				resource: { type: 'string' },
				fit: { type: 'string' },
				stage: { type: 'string' },
				url: { type: 'string', default: DAEMON },
				live: { type: 'boolean', default: false },
			},
		})
		if (positionals.length !== 1 || values.out === undefined)
			throw new Error(
				'usage: matrix.ts freeze|resource|full|pilot|plan --out PATH [--frozen FILE --resource FILE --fit FILE] [--key KEY --think true|false --seed FILE --settings FILE --deployment FILE] [--root DIR --stage A|B|C] [--live --url URL]',
			)
		const phase = positionals[0]
		const out = resolve(values.out)
		if (phase === 'plan') return new Matrix().#plan(values.root, values.stage, out)
		if (!values.live) throw new Error('model phases require --live; no calls were sent')
		mkdirSync(dirname(out), { recursive: true })
		mkdirSync(out)
		const runner = new Matrix()
		if (phase === 'freeze')
			return await runner.#freeze(
				values.key,
				values.think,
				values.seed,
				values.settings,
				values.deployment,
				out,
				values.url,
			)
		if (values.frozen === undefined) throw new Error('--frozen FILE is required')
		const frozen = hashFile(resolve(values.frozen))
		readFrozen(frozen)
		if (phase === 'resource') return await runner.#resource(frozen.path, out, values.url)
		if (values.resource === undefined) throw new Error('--resource FILE is required')
		const resource = hashFile(resolve(values.resource))
		if (phase === 'full') return await runner.#full(frozen.path, resource.path, out, values.url)
		if (phase === 'pilot' && values.fit !== undefined)
			return await runner.#pilot(frozen.path, resource.path, resolve(values.fit), out, values.url)
		throw new Error('phase or required phase arguments are invalid')
	}

	async #freeze(
		key: string | undefined,
		think: string | undefined,
		seed: string | undefined,
		settings: string | undefined,
		deployment: string | undefined,
		out: string,
		url: string,
	): Promise<number> {
		const model = Object.entries(MODELS).find(([name]) => name === key)?.[1]
		if (
			key === undefined ||
			model === undefined ||
			(think !== 'true' && think !== 'false') ||
			seed === undefined ||
			settings === undefined ||
			deployment === undefined
		)
			throw new Error(
				'freeze requires --key, explicit --think, --seed, --settings, and --deployment',
			)
		const receipt = hashFile(resolve(deployment))
		readDeployment(receipt)
		const response = await fetch(new URL('/api/tags', url))
		if (!response.ok) throw new Error(`model inventory HTTP ${response.status}`)
		const tags: unknown = await response.json()
		writeFileSync(join(out, 'tags.json'), `${JSON.stringify(tags, null, 2)}\n`, { flag: 'wx' })
		const configuration = readSettings(resolve(settings), key)
		const census = collectTransitions(readJSON(join(COPIES_DIR, 'v1.json')))
		writeFileSync(
			join(out, 'transitions.json'),
			`${JSON.stringify({ scenario: hashFile(join(COPIES_DIR, 'v1.json')), opportunities: census }, null, 2)}\n`,
			{ flag: 'wx' },
		)
		const frozen: MatrixFreeze = {
			deployment: receipt,
			protocol: 'l6',
			key,
			think: think === 'true',
			decision: {
				model,
				digest: readModelDigest(tags, model),
				think: think === 'true',
				sampler: SAMPLER,
			},
			summarizer: {
				model,
				digest: readModelDigest(tags, model),
				think: false,
				sampler: { ...SAMPLER, num_predict: configuration.predict },
			},
			judge: {
				model: MICA_MODEL,
				digest: readModelDigest(tags, MICA_MODEL),
				think: false,
				sampler: { num_ctx: MICA_CONTEXT, calibration: MICA_CALIBRATION },
			},
			files: readMatrixFiles(),
			settings: hashFile(resolve(settings)),
			seed: hashFile(resolve(seed)),
			configuration,
			census: hashFile(join(out, 'transitions.json')),
			tags: hashFile(join(out, 'tags.json')),
		}
		writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(frozen, null, 2)}\n`, {
			flag: 'wx',
		})
		readFrozen(hashFile(join(out, 'manifest.json')))
		return 0
	}

	async #attempt(
		execution: MatrixExecution,
		directory: string,
		url: string,
	): Promise<MatrixAttempt> {
		mkdirSync(directory)
		const path = join(directory, 'execution.json')
		writeFileSync(path, `${JSON.stringify(execution, null, 2)}\n`, { flag: 'wx' })
		const frozen = readFrozen(execution.frozen)
		const cache = join(directory, 'cache', nameMatrix(execution))
		mkdirSync(cache, { recursive: true })
		writeFileSync(join(cache, 'judge.jsonl'), readSeedCache(frozen), { flag: 'wx' })
		const run = join(directory, nameMatrix(execution))
		const config = parseFlags([
			'--run',
			'--live',
			'--copy',
			String(execution.copy),
			'--manifest',
			path,
			'--cache',
			cache,
			'--out',
			run,
			'--url',
			url,
		])
		if (!config.success) throw new Error(config.error)
		let fault: string | undefined
		try {
			await new Driver(config.value).execute()
		} catch (error) {
			fault = describeError(error)
		}
		const reading = existsSync(join(run, 'run.json')) ? parseMatrixRun(run) : undefined
		const failures = [
			...(reading?.failures ?? ['missing complete run evidence']),
			...(fault === undefined ? [] : [fault]),
		]
		return {
			execution: hashFile(path),
			run,
			budget: execution.budget,
			accepted: failures.length === 0,
			failures,
			resource: reading !== undefined && permitsReserve(reading.requests),
			files: reading?.files ?? [],
		}
	}

	async #resource(path: string, out: string, url: string): Promise<number> {
		const reference = hashFile(path)
		const frozen = readFrozen(reference)
		const attempts: MatrixAttempt[] = []
		for (const reserve of MATRIX_RESERVES) {
			const execution: MatrixExecution = {
				protocol: 'l6',
				key: frozen.key,
				think: frozen.think,
				arm: 'records',
				copy: 1,
				phase: 'resource',
				frozen: reference,
				budget: buildBudget(reserve),
			}
			const attempt = await this.#attempt(execution, join(out, `reserve-${reserve}`), url)
			attempts.push(attempt)
			const manifest: MatrixResource = {
				protocol: 'l6',
				frozen: reference,
				accepted: attempt.accepted,
				attempts,
				...(attempt.accepted ? { budget: attempt.budget } : {}),
			}
			writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
			readResource(hashFile(join(out, 'manifest.json')), reference)
			if (attempt.accepted) return 0
			if (!attempt.resource) return 3
		}
		return 3
	}

	async #full(path: string, resourcePath: string, out: string, url: string): Promise<number> {
		const reference = hashFile(path)
		const frozen = readFrozen(reference)
		const resource = hashFile(resourcePath)
		const accepted = readResource(resource, reference)
		const prior = accepted.attempts.at(-1)
		if (!accepted.accepted || accepted.budget === undefined || prior === undefined)
			throw new Error('full-view preflight requires accepted records resource development')
		const reading = parseMatrixRun(prior.run)
		if (reading === undefined) throw new Error('missing complete records development trace')
		const bound = buildMatrixBound(reading)
		writeFileSync(join(out, 'bound.json'), `${JSON.stringify(bound, null, 2)}\n`, { flag: 'wx' })
		const budget = {
			...accepted.budget,
			window: bound.window,
			ceiling: Math.min(
				bound.window,
				readDeploymentModel(readDeployment(frozen.deployment), frozen.decision).context,
			),
		}
		const execution: MatrixExecution = {
			protocol: 'l6',
			key: frozen.key,
			think: frozen.think,
			arm: 'full',
			copy: 1,
			phase: 'full',
			frozen: reference,
			resource,
			budget,
		}
		const attempt = await this.#attempt(execution, join(out, 'preflight'), url)
		const manifest: MatrixFull = {
			protocol: 'l6',
			frozen: reference,
			bound,
			accepted: attempt.accepted,
			attempts: [attempt],
			...(attempt.accepted ? { budget } : {}),
		}
		writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, {
			flag: 'wx',
		})
		verifyMatrixFeasibility(parseMatrixRun(attempt.run))
		return attempt.accepted ? 0 : 3
	}

	async #pilot(
		path: string,
		resourcePath: string,
		fitPath: string,
		out: string,
		url: string,
	): Promise<number> {
		const reference = hashFile(path)
		const frozen = readFrozen(reference)
		const resource = hashFile(resourcePath)
		const accepted = readResource(resource, reference)
		if (!accepted.accepted || accepted.budget === undefined)
			throw new Error('pilot requires an accepted reserve')
		const fit = hashFile(fitPath)
		const execution: MatrixExecution = {
			protocol: 'l6',
			key: frozen.key,
			think: frozen.think,
			arm: 'aggregate',
			copy: 1,
			phase: 'pilot',
			frozen: reference,
			resource,
			fit,
			budget: accepted.budget,
		}
		const attempt = await this.#attempt(execution, join(out, 'development'), url)
		const run = existsSync(join(attempt.run, 'run.json')) ? parseMatrixRun(attempt.run) : undefined
		const exposed = run?.rows.filter((row) => matchesMatrixExposure(run, row.goal)).length ?? 0
		const failures = [...attempt.failures]
		const records = accepted.attempts.at(-1)
		const baseline = records === undefined ? undefined : parseMatrixRun(records.run)
		failures.push(
			...(baseline === undefined || run === undefined
				? ['missing paired development evidence']
				: listMatrixPairFailures(baseline, run)),
		)
		if (exposed <= (run?.rows.length ?? 0) / 2)
			failures.push('nonempty wire body exposure is not a majority of served development goals')
		const manifest: MatrixPilot = {
			protocol: 'l6',
			frozen: reference,
			resource,
			fit,
			attempt,
			served: run?.rows.length ?? 0,
			exposed,
			accepted: failures.length === 0,
			failures,
		}
		writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, {
			flag: 'wx',
		})
		verifyMatrixFeasibility(run)
		return manifest.accepted ? 0 : 3
	}

	#plan(root: string | undefined, stage: string | undefined, out: string): number {
		if (root === undefined || (stage !== 'A' && stage !== 'B' && stage !== 'C'))
			throw new Error('plan requires --root DIR and --stage A|B|C')
		const plan: PlanEntry[] = []
		const infeasible: unknown[] = []
		const selected = MATRIX_STAGES[stage]
		for (const key of selected.keys)
			for (const think of [false, true]) {
				const base = resolve(root, `${key}-think${think ? '1' : '0'}`)
				const frozen = hashFile(join(base, 'freeze', 'manifest.json'))
				readFrozen(frozen)
				const resource = hashFile(join(base, 'resource', 'manifest.json'))
				const decision = readResource(resource, frozen)
				if (!decision.accepted || decision.budget === undefined) {
					infeasible.push({
						key,
						think,
						arm: 'records',
						reason: 'resource preflight refused',
						resource,
					})
					continue
				}
				for (const copy of selected.copies)
					for (const arm of copy % 2 === 1
						? (['records', 'aggregate', 'full'] as const)
						: (['aggregate', 'records', 'full'] as const)) {
						let execution: MatrixExecution = {
							protocol: 'l6',
							key,
							think,
							arm,
							copy,
							phase: 'evaluation',
							frozen,
							resource,
							budget: decision.budget,
						}
						if (arm === 'aggregate') {
							const pilotPath = join(base, 'pilot', 'manifest.json')
							const pilot = existsSync(pilotPath) ? readJSON(pilotPath) : undefined
							if (
								!isRecord(pilot) ||
								pilot.accepted !== true ||
								!isRecord(pilot.fit) ||
								typeof pilot.fit.path !== 'string'
							) {
								infeasible.push({
									key,
									think,
									arm,
									copy,
									reason: 'aggregate pilot absent or infeasible',
								})
								continue
							}
							execution = {
								...execution,
								pilot: hashFile(pilotPath),
								fit: hashFile(pilot.fit.path),
							}
						}
						if (arm === 'full') {
							const fullPath = join(base, 'full', 'manifest.json')
							const full = existsSync(fullPath) ? readJSON(fullPath) : undefined
							if (
								!isRecord(full) ||
								full.accepted !== true ||
								!isRecord(full.budget) ||
								typeof full.budget.window !== 'number'
							) {
								infeasible.push({
									key,
									think,
									arm,
									copy,
									reason: 'full preflight absent or infeasible',
								})
								continue
							}
							execution = {
								...execution,
								full: hashFile(fullPath),
								budget: {
									...decision.budget,
									window: full.budget.window,
									ceiling: Math.min(
										full.budget.window,
										readDeploymentModel(
											readDeployment(readFrozen(frozen).deployment),
											readFrozen(frozen).decision,
										).context,
									),
								},
							}
						}
						const name = nameMatrix(execution)
						const manifest = join(dirname(out), 'executions', `${name}.json`)
						mkdirSync(dirname(manifest), { recursive: true })
						writeFileSync(manifest, `${JSON.stringify(execution, null, 2)}\n`, { flag: 'wx' })
						readExecution(manifest)
						const cache = join(base, 'cache', name)
						mkdirSync(cache, { recursive: true })
						writeFileSync(join(cache, 'judge.jsonl'), readSeedCache(readFrozen(frozen)), {
							flag: 'wx',
						})
						plan.push({
							name,
							harness: 'bench5',
							estimate: 3600,
							args: [
								'--run',
								'--live',
								'--copy',
								String(copy),
								'--manifest',
								manifest,
								'--cache',
								cache,
							],
						})
					}
			}
		mkdirSync(dirname(out), { recursive: true })
		writeFileSync(out, `${JSON.stringify(plan, null, 2)}\n`, { flag: 'wx' })
		writeFileSync(`${out}.infeasible.json`, `${JSON.stringify(infeasible, null, 2)}\n`, {
			flag: 'wx',
		})
		return 0
	}
}
