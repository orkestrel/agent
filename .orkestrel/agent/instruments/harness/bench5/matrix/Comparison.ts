import type { MatrixChain, MatrixKey, MatrixRun } from './types.js'
import type { TransitionCategory } from '../types.js'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { isDeepStrictEqual, parseArgs } from 'node:util'
import { isRecord } from '@orkestrel/contract'
import { COPIES_DIR } from '../constants.js'
import { readCopy } from '../Driver.js'
import { computeDigest, readJSON, readRows } from '../helpers.js'
import { hashFile, verifyFiles, readRefitCosts, readRefitAssessment } from '../refit/helpers.js'
import { isRefitAttempt, isRefitFile, isRefitGeneration } from '../refit/validators.js'
import { collectTransitions } from '../transitions/helpers.js'
import { parseMatrixRun } from './parsers.js'
import {
	listMatrixPairFailures,
	matchesMatrixExposure,
	measureMatrixCosts,
	nameMatrix,
	readAttempt,
	readExecution,
} from './helpers.js'
import { isMatrixAttempt, isMatrixExecution, isMatrixResource } from './validators.js'

/** Reads exact matrix runs, prepares blind answers, and reports valid comparisons. */
export class Comparison {
	/** Executes one read-only comparison or create-only blind packet operation.
	 * @param argv - Explicit operation and file arguments
	 * @returns Exit 0 after writing the requested artifact
	 */
	static execute(argv: readonly string[]): number {
		const { values, positionals } = parseArgs({
			args: [...argv],
			allowPositionals: true,
			options: {
				base: { type: 'string' },
				plan: { type: 'string', multiple: true },
				shadow: { type: 'string', multiple: true },
				preparation: { type: 'string', multiple: true },
				out: { type: 'string' },
				keys: { type: 'string' },
				packet: { type: 'string' },
				labels: { type: 'string' },
			},
		})
		if (
			positionals.length !== 1 ||
			(positionals[0] !== 'blind' && positionals[0] !== 'report') ||
			values.base === undefined ||
			values.out === undefined ||
			values.plan === undefined
		)
			throw new Error(
				'usage: compare.ts blind|report --base DIR --plan FILE [--plan FILE] --out FILE [--keys FILE --packet FILE --labels FILE]',
			)
		const reader = new Comparison()
		const runs: MatrixRun[] = []
		const missing: unknown[] = []
		const seen = new Set<string>()
		for (const path of values.plan) {
			const plan = readJSON(path)
			if (!Array.isArray(plan)) throw new Error('plan must be an array')
			for (const entry of plan) {
				if (
					!isRecord(entry) ||
					typeof entry.name !== 'string' ||
					!/^l6-(q2|q4|g2|g4)-think[01]-(records|aggregate|full)-v[2-8]$/.test(entry.name)
				)
					throw new Error('archive or malformed identity in l6 plan')
				if (seen.has(entry.name)) throw new Error('duplicate planned evaluation cell')
				seen.add(entry.name)
				const directory = resolve(values.base, entry.name)
				if (!existsSync(join(directory, 'run.json'))) {
					missing.push({ name: entry.name, reason: 'missing run' })
					continue
				}
				const run = parseMatrixRun(directory)
				if (run === undefined) throw new Error(`malformed l6 run: ${directory}`)
				if (nameMatrix(run.execution) !== entry.name || run.execution.phase !== 'evaluation')
					throw new Error('planned and actual evaluation identities differ')
				if (
					!Array.isArray(entry.args) ||
					!entry.args.every((arg: unknown) => typeof arg === 'string')
				)
					throw new Error('plan arguments absent')
				const at = entry.args.indexOf('--manifest')
				const manifest: unknown = at < 0 ? undefined : entry.args[at + 1]
				if (
					typeof manifest !== 'string' ||
					!isDeepStrictEqual(readExecution(manifest).execution, run.execution)
				)
					throw new Error('plan execution differs from actual run')
				runs.push(run)
			}
			if (existsSync(`${path}.infeasible.json`)) {
				const infeasible = readJSON(`${path}.infeasible.json`)
				if (!Array.isArray(infeasible)) throw new Error('infeasibility manifest must be an array')
				missing.push(...infeasible)
			}
		}
		if (positionals[0] === 'blind') {
			if (values.keys === undefined) throw new Error('blind requires private --keys FILE')
			return reader.#blind(runs, resolve(values.out), resolve(values.keys))
		}
		return reader.#report(
			runs,
			missing,
			resolve(values.out),
			values.keys,
			values.packet,
			values.labels,
			values.shadow,
			values.preparation,
		)
	}

	#blind(runs: readonly MatrixRun[], out: string, keysPath: string): number {
		if (dirname(out) === dirname(keysPath))
			throw new Error('blind packet and private keys must have different directories')
		const salt = randomBytes(32).toString('hex')
		const keys: MatrixKey[] = []
		const packet: unknown[] = []
		for (const run of runs) {
			const copy = readCopy(join(COPIES_DIR, `v${run.execution.copy}.json`))
			for (const row of run.rows) {
				const goal = copy.goals.find((entry) => entry.id === row.goal)
				if (goal === undefined) throw new Error('goal absent from scenario')
				const id = computeDigest([salt, run.path, row.goal])
				keys.push({ id, run: run.path, goal: row.goal, files: run.files })
				packet.push({
					id,
					request: goal.request,
					facts: goal.facts.map((index) => copy.seed[index]?.content),
					stale: goal.stale.map((index) => copy.seed[index]?.content),
					expected: goal.expected,
					expectedAny: goal.expectedAny,
					forbidden: goal.forbidden,
					forbiddenPatterns: goal.forbiddenPatterns,
					reply: row.reply,
				})
			}
		}
		if (packet.length === 0) throw new Error('cannot blind an empty served population')
		packet.sort((left, right) =>
			String(isRecord(left) ? left.id : '').localeCompare(
				String(isRecord(right) ? right.id : ''),
				'en',
			),
		)
		mkdirSync(dirname(out), { recursive: true })
		mkdirSync(dirname(keysPath), { recursive: true })
		writeFileSync(out, `${JSON.stringify(packet, null, 2)}\n`, { flag: 'wx' })
		writeFileSync(keysPath, `${JSON.stringify({ packet: hashFile(out), keys }, null, 2)}\n`, {
			flag: 'wx',
		})
		return 0
	}

	#labels(
		keysPath: string | undefined,
		packetPath: string | undefined,
		labelsPath: string | undefined,
	): ReadonlyMap<string, 'pass' | 'fail' | 'ambiguous'> {
		const result = new Map<string, 'pass' | 'fail' | 'ambiguous'>()
		if (keysPath === undefined && packetPath === undefined && labelsPath === undefined)
			return result
		if (keysPath === undefined || packetPath === undefined || labelsPath === undefined)
			throw new Error('audit requires --keys, --packet, and --labels together')
		const mapping = readJSON(keysPath)
		const labels = readJSON(labelsPath)
		if (
			!isRecord(mapping) ||
			!isRefitFile(mapping.packet) ||
			!Array.isArray(mapping.keys) ||
			!isRecord(labels) ||
			labels.authority !== 'root-adjudicated' ||
			labels.packet !== hashFile(packetPath).hash ||
			!Array.isArray(labels.labels)
		)
			throw new Error('invalid blind packet or adjudication custody')
		verifyFiles([mapping.packet])
		if (mapping.packet.hash !== labels.packet) throw new Error('blind packet mismatch')
		const used = new Set<string>()
		for (const key of mapping.keys) {
			if (
				!isRecord(key) ||
				typeof key.id !== 'string' ||
				typeof key.run !== 'string' ||
				typeof key.goal !== 'string' ||
				!Array.isArray(key.files) ||
				!key.files.every(isRefitFile)
			)
				throw new Error('invalid private audit key')
			verifyFiles(key.files)
			const matches = labels.labels.filter(
				(label: unknown) => isRecord(label) && label.id === key.id,
			)
			const label: unknown = matches[0]
			if (
				matches.length !== 1 ||
				!isRecord(label) ||
				(label.verdict !== 'pass' && label.verdict !== 'fail' && label.verdict !== 'ambiguous') ||
				typeof label.evidence !== 'string' ||
				label.evidence.trim() === '' ||
				used.has(key.id)
			)
				throw new Error('missing, duplicated, or unsupported blind ruling')
			used.add(key.id)
			result.set(`${resolve(key.run)}:${key.goal}`, label.verdict)
		}
		if (used.size !== labels.labels.length) throw new Error('orphan audit ruling')
		return result
	}

	#chains(run: MatrixRun): readonly MatrixChain[] {
		const opportunities = collectTransitions(readJSON(join(COPIES_DIR, 'v1.json')))
		const chains: MatrixChain[] = []
		const last = new Map<string, NonNullable<MatrixRun['picks'][number]['aggregates']>[number]>()
		for (const row of run.rows) {
			if (!matchesMatrixExposure(run, row.goal)) continue
			const pick = run.picks.find(
				(entry) => entry.goal === row.goal && (entry.aggregates?.length ?? 0) > 0,
			)
			for (const binding of pick?.aggregates ?? []) {
				const prior = last.get(binding.topic)
				if (prior !== undefined && !isDeepStrictEqual(prior.state.sources, binding.state.sources)) {
					const changed = opportunities.filter(
						(entry) =>
							entry.index > prior.state.point &&
							entry.index <= binding.state.point &&
							[...prior.state.sources, ...binding.state.sources].some(
								(source) =>
									entry.text.includes(source.text) ||
									source.text.includes(entry.text) ||
									(source.role === 'tool' &&
										entry.id !== undefined &&
										source.text.includes(entry.id)),
							),
					)
					chains.push({
						topic: binding.topic,
						before: prior.state.goal,
						after: binding.state.goal,
						prior: prior.state.version,
						version: binding.state.version,
						transitions: [...new Set(changed.map((entry) => entry.transition))],
						retained: prior.state.version === binding.state.version,
					})
				}
				last.set(binding.topic, binding)
			}
		}
		return chains
	}

	#preparation(runs: readonly MatrixRun[], paths: readonly string[]): readonly unknown[] {
		const costs: unknown[] = []
		const seen = new Set<string>()
		const generations = new Set<string>()
		for (const reference of [
			...paths.map(hashFile),
			...runs.flatMap((run) => [
				run.execution.resource,
				run.execution.full,
				run.execution.pilot,
				run.execution.fit,
			]),
		]) {
			if (reference === undefined || seen.has(reference.hash)) continue
			seen.add(reference.hash)
			verifyFiles([reference])
			const manifest = readJSON(reference.path)
			if (
				isRecord(manifest) &&
				(manifest.phase === 'development' || manifest.development !== undefined)
			)
				throw new Error('development evidence cannot enter qualified comparison')
			const attempts = isMatrixResource(manifest)
				? manifest.attempts
				: isRecord(manifest) && isMatrixAttempt(manifest.attempt)
					? [manifest.attempt]
					: []
			for (const attempt of attempts) {
				const reading = readAttempt(attempt)
				costs.push({
					manifest: reference,
					run: attempt.run,
					accepted: attempt.accepted,
					phase: reading?.execution.phase,
					costs: reading === undefined ? undefined : measureMatrixCosts(reading),
				})
			}
			const preparation: unknown = isRefitGeneration(manifest)
				? {
						attempts: hashFile(join(dirname(reference.path), 'attempts.jsonl')),
						manifest: reference,
					}
				: isRecord(manifest)
					? manifest.preparation
					: undefined
			if (
				isRecord(preparation) &&
				isRefitFile(preparation.attempts) &&
				isRefitFile(preparation.manifest)
			) {
				verifyFiles([preparation.attempts, preparation.manifest])
				if (isRecord(manifest) && manifest.accepted !== undefined) readRefitAssessment(reference)
				const generation = readJSON(preparation.manifest.path)
				if (!isRefitGeneration(generation) || generation.attempts !== preparation.attempts.hash)
					throw new Error('calibration cost custody differs')
				const rows = readRows(preparation.attempts.path)
				if (!rows.every(isRefitAttempt)) throw new Error('invalid calibration cost evidence')
				if (generations.has(preparation.manifest.hash)) continue
				generations.add(preparation.manifest.hash)
				costs.push({
					manifest: reference,
					identity: preparation.manifest.hash,
					phase: 'fit-calibration',
					...readRefitCosts(rows, generation),
					generation,
					summary: rows.map((row) => ({
						cached: row.cached,
						sent: row.sent,
						wall: row.wall,
						duration: row.duration,
						freshUsage: row.sent === true && row.cached !== true ? row.usage : undefined,
					})),
					agree: rows.flatMap((row) =>
						row.judge === undefined
							? []
							: row.judge.components.map((component) => ({
									key: component.key,
									cached: component.cached,
									sent: component.sent,
									wall: component.wall,
									freshUsage:
										component.sent === true && !component.cached ? component.usage : undefined,
								})),
					),
				})
			} else if (attempts.length === 0) costs.push({ manifest: reference, artifact: manifest })
		}
		return costs
	}

	#shadows(paths: readonly string[], runs: readonly MatrixRun[]): readonly unknown[] {
		return paths.map((path) => {
			const report = readJSON(path)
			if (!isRecord(report) || !isMatrixExecution(report.execution))
				throw new Error('archive shadow cannot enter l6 table')
			const execution = report.execution
			const run = runs.find((entry) => nameMatrix(entry.execution) === nameMatrix(execution))
			if (
				run === undefined ||
				!isDeepStrictEqual(run.execution, execution) ||
				!isDeepStrictEqual(run.frozen, report.frozen)
			)
				throw new Error('shadow configuration differs from answer run')
			return { file: hashFile(path), ...report }
		})
	}

	#report(
		runs: readonly MatrixRun[],
		missing: readonly unknown[],
		out: string,
		keysPath?: string,
		packetPath?: string,
		labelsPath?: string,
		shadowPaths: readonly string[] = [],
		preparationPaths: readonly string[] = [],
	): number {
		const labels = this.#labels(keysPath, packetPath, labelsPath)
		const cells = runs.map((run) => {
			const chains = this.#chains(run)
			const observed = new Set(chains.flatMap((chain) => chain.transitions))
			const transitions: readonly TransitionCategory[] = [
				'arrival',
				'repetition',
				'correction',
				'withdrawal',
				'supersession',
				'tool',
			]
			return {
				path: run.path,
				identity: run.execution,
				valid: run.failures.length === 0,
				failures: run.failures,
				served: run.rows.length,
				scored:
					run.failures.length > 0
						? 0
						: run.rows.filter(
								(row) => !row.goal.startsWith('g06') && (row.resource?.length ?? 0) === 0,
							).length,
				outcomes: run.rows.map((row) => ({
					goal: row.goal,
					excluded: row.goal.startsWith('g06'),
					scorer: row.success,
					audited: labels.get(`${resolve(run.path)}:${row.goal}`),
					resource: row.resource,
					exposed: matchesMatrixExposure(run, row.goal),
				})),
				costs: measureMatrixCosts(run),
				maintenance: {
					chains,
					absent: transitions.filter((entry) => !observed.has(entry)),
					deterministic:
						'Mechanism-only fixtures: aggregates.test.ts; FullViewAdapter.test.ts. They supply no natural transition or goal score.',
				},
			}
		})
		const pairs: unknown[] = []
		for (const records of runs.filter((run) => run.execution.arm === 'records'))
			for (const arm of ['aggregate', 'full'] as const) {
				const other = runs.find(
					(run) =>
						run.execution.arm === arm &&
						run.execution.key === records.execution.key &&
						run.execution.think === records.execution.think &&
						run.execution.copy === records.execution.copy,
				)
				const invalid = [...records.failures, ...(other?.failures ?? ['missing comparison arm'])]
				if (
					other !== undefined &&
					(other.execution.frozen.hash !== records.execution.frozen.hash ||
						other.execution.budget.reserve !== records.execution.budget.reserve ||
						(arm === 'aggregate' &&
							!isDeepStrictEqual(other.execution.budget, records.execution.budget)))
				)
					invalid.push('frozen configuration or budget mismatch')
				if (other !== undefined && arm === 'aggregate')
					invalid.push(...listMatrixPairFailures(records, other))
				const goals =
					invalid.length > 0 || other === undefined
						? []
						: records.rows
								.filter((row) => !row.goal.startsWith('g06') && (row.resource?.length ?? 0) === 0)
								.flatMap((left) => {
									const right = other.rows.find(
										(row) => row.goal === left.goal && (row.resource?.length ?? 0) === 0,
									)
									if (right === undefined) return []
									const a = labels.get(`${resolve(records.path)}:${left.goal}`)
									const b = labels.get(`${resolve(other.path)}:${left.goal}`)
									return [
										{
											goal: left.goal,
											improvement: !left.success && right.success,
											regression: left.success && !right.success,
											records: left.success,
											[arm]: right.success,
											audited:
												a === undefined || b === undefined
													? undefined
													: {
															low: Number(b === 'pass') - Number(a !== 'fail'),
															high: Number(b !== 'fail') - Number(a === 'pass'),
															ambiguous: a === 'ambiguous' || b === 'ambiguous',
														},
										},
									]
								})
				pairs.push({
					key: records.execution.key,
					think: records.execution.think,
					copy: records.execution.copy,
					arm,
					denominator: goals.length,
					invalid,
					goals,
					improvements: goals.filter((goal) => goal.improvement).length,
					regressions: goals.filter((goal) => goal.regression).length,
					audited: goals.filter((goal) => goal.audited !== undefined).length,
					low: goals.reduce((total, goal) => total + (goal.audited?.low ?? 0), 0),
					high: goals.reduce((total, goal) => total + (goal.audited?.high ?? 0), 0),
				})
			}
		if (
			labels.size > 0 &&
			runs.some((run) => run.rows.some((row) => !labels.has(`${resolve(run.path)}:${row.goal}`)))
		)
			throw new Error('audit omits served goals')
		mkdirSync(dirname(out), { recursive: true })
		writeFileSync(
			out,
			`${JSON.stringify({ protocol: 'l6', cells, pairs, infeasible: missing, preparation: this.#preparation(runs, preparationPaths), shadows: this.#shadows(shadowPaths, runs), audit: labels.size > 0 ? 'complete served-goal blind adjudication' : 'scorer only; blind audit absent', exclusion: 'g06', judge: 'Judge-shadow rows are a separate table; AGREE is summary support, not an answer-model outcome.', archive: 'Historical l5 requires report.ts --archive and is excluded from these cells.', costs: 'Wire costs count actual fresh requests. Cached summary/AGREE usage is retained separately and is not charged again. Stage/flush/wire elapsed times overlap and must not be summed. Completion usage includes reasoning; no reasoning-token ratio is inferred.', limitation: 'Conditional paired evidence on this source scenario. The matrix does not certify sustained-work adoption.' }, null, 2)}\n`,
			{ flag: 'wx' },
		)
		return 0
	}
}
