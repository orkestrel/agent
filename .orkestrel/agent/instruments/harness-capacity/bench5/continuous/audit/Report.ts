import type { EnduranceRubric } from '../../endurance/types.js'
import type { SustainedItem, SustainedLabel } from '../../sustained/audit/types.js'
import type { ContinuousArm, ContinuousRun } from '../types.js'
import type {
	ContinuousArmCost,
	ContinuousArmInterval,
	ContinuousComparisonInput,
	ContinuousInterval,
	ContinuousKey,
	ContinuousPair,
	ContinuousReport,
} from './types.js'
import { SUSTAINED_DIMENSIONS } from '../../sustained/audit/constants.js'
import { SustainedAuditError } from '../../sustained/audit/errors.js'
import { computeAcceptability } from '../../sustained/audit/helpers.js'
import { CONTINUOUS_LIMITATION } from './constants.js'
import {
	buildDimensionTally,
	listBlockingBatchFailures,
	readAuditLeaks,
	sumRoleUsage,
} from './helpers.js'

/** Reports every arm's adjudicated outcomes by interval, each arm's pairing against records, and the costs, while retaining invalid evidence. */
export class Report {
	/** Builds every fourth-shift checkpoint and disjoint interval, the overall and final intervals, and the verdict.
	 * @param input - The validated runs, the blind packet, and complete root adjudication
	 * @returns The quality, continuity, and cost comparison
	 * @throws SustainedAuditError when the runtime has no fourth-shift checkpoint or a joined product is missing
	 */
	build(input: ContinuousComparisonInput): ContinuousReport {
		const records = input.runs.find((run) => run.execution.arm === 'records')
		const runtime = (records ?? input.runs[0])?.runtime
		if (runtime === undefined) throw new SustainedAuditError('no run to report')
		const failures = input.runs.flatMap((run) =>
			run.failures.map((failure) => `${run.execution.arm}: ${failure}`),
		)
		const audit = readAuditLeaks(
			input.blind.keys,
			input.adjudication.labels,
			input.adjudication.batches.flatMap((batch) =>
				batch.failures.filter((failure) => failure.startsWith('missed ')),
			),
		)
		const blocked = new Set(
			input.adjudication.batches
				.filter((batch) => listBlockingBatchFailures(batch.failures).length > 0)
				.map((batch) => batch.id),
		)
		for (const batch of input.adjudication.batches)
			if (blocked.has(batch.id))
				failures.push(
					`invalid audit batch ${batch.id}: ${listBlockingBatchFailures(batch.failures).join('; ')}`,
				)
		for (const leak of audit.foreign) failures.push(`foreign identity leak ${leak}`)
		const boundaries = runtime.goals.filter(
			(goal, index) => goal.shift % 4 === 0 && runtime.goals[index + 1]?.shift !== goal.shift,
		)
		const complete = Math.min(...input.runs.map((run) => this.#complete(run)))
		const common =
			boundaries.filter((goal) => runtime.goals.indexOf(goal) < complete).at(-1)?.shift ?? 0
		const intervals = boundaries.map((goal, index) =>
			this.#interval(input, (boundaries[index - 1]?.shift ?? 0) + 1, goal.shift),
		)
		const checkpoints = boundaries
			.filter((goal) => goal.shift <= common)
			.map((goal) => this.#interval(input, 1, goal.shift))
		const overall = this.#interval(input, 1, runtime.days.length)
		const final = intervals.at(-1)
		if (final === undefined) throw new SustainedAuditError('runtime has no fourth-shift checkpoint')
		const valid = failures.length === 0 && intervals.every((interval) => interval.valid)
		const reasons: string[] = []
		const status = Object.fromEntries(input.runs.map((run) => [run.execution.arm, run.status]))
		const served = Object.fromEntries(input.runs.map((run) => [run.execution.arm, run.rows.length]))
		for (const run of input.runs)
			if (run.status !== 'complete')
				reasons.push(`The ${run.execution.arm} arm ended with status ${run.status} after ${this.#complete(run)} complete goals.`)
		const compaction = overall.pairs.find((pair) => pair.arm === 'compaction')
		const finalCompaction = final.pairs.find((pair) => pair.arm === 'compaction')
		let verdict: ContinuousReport['verdict'] = 'inconclusive'
		if (records !== undefined && records.status === 'complete' && valid) {
			if (
				compaction !== undefined &&
				finalCompaction !== undefined &&
				status.compaction === 'complete' &&
				compaction.gain.low > 0 &&
				finalCompaction.gain.low > 0 &&
				compaction.regressions.length === 0
			) {
				verdict = 'compaction'
				reasons.push(
					'The compaction arm shows a positive conservative acceptable-product gain over records overall and in the final interval without a critical regression.',
				)
			} else {
				verdict = 'records'
				reasons.push(
					compaction === undefined
						? 'No compaction arm completed the horizon; records is the only complete long-work design.'
						: `The compaction arm shows no positive conservative gain over records (overall ${compaction.gain.low} to ${compaction.gain.high}, final ${finalCompaction?.gain.low ?? 0} to ${finalCompaction?.gain.high ?? 0}).`,
				)
			}
		} else if (records !== undefined && records.status !== 'complete')
			reasons.push('The records arm did not complete the horizon, so no arm verdict follows.')
		if (!valid) reasons.push('Runtime or adjudication evidence does not establish a valid comparison.')
		return {
			protocol: 'c1',
			manifest: input.reference,
			packet: input.packet,
			labels: input.labels,
			valid,
			failures,
			batches: input.adjudication.batches,
			audit,
			status,
			served,
			common,
			checkpoints,
			intervals,
			overall,
			final,
			costs: input.runs.map((run) => this.#cost(run)),
			verdict,
			reasons,
			limitation: CONTINUOUS_LIMITATION,
		}
	}

	#complete(run: ContinuousRun): number {
		let count = 0
		for (const goal of run.runtime.goals) {
			const row = run.rows[count]
			const observation = run.observations.find((entry) => entry.goal === goal.id)
			if (row?.goal !== goal.id || !row.success || observation?.complete !== true) break
			count++
		}
		return count
	}

	#interval(input: ContinuousComparisonInput, from: number, through: number): ContinuousInterval {
		const runtime = input.runs[0]?.runtime
		if (runtime === undefined) throw new SustainedAuditError('no run to report')
		const goals = runtime.goals
			.filter((goal) => goal.shift >= from && goal.shift <= through)
			.map((goal) => goal.id)
		const failures: string[] = []
		const arms = input.runs.map((run) => this.#arm(input, run, goals, failures))
		const records = input.runs.find((run) => run.execution.arm === 'records')
		const pairs = input.runs
			.filter((run) => run.execution.arm !== 'records')
			.map((run) =>
				records === undefined
					? this.#emptyPair(run.execution.arm)
					: this.#pair(input, records, run, goals),
			)
		return {
			from,
			through,
			goals,
			valid: failures.length === 0 && input.runs.every((run) => run.failures.length === 0),
			failures,
			arms,
			pairs,
		}
	}

	#arm(
		input: ContinuousComparisonInput,
		run: ContinuousRun,
		goals: readonly string[],
		failures: string[],
	): ContinuousArmInterval {
		const acceptable = { low: 0, high: 0 }
		let critical = 0
		let ambiguous = 0
		let judged = 0
		let folded = 0
		let omitted = 0
		const downstream: string[] = []
		const dimensions = buildDimensionTally()
		const served = run.rows.filter((row) => goals.includes(row.goal) && row.success).length
		for (const goal of goals) {
			const row = run.rows.find((entry) => entry.goal === goal)
			if (row === undefined || !row.success) continue
			const observation = run.observations.find((entry) => entry.goal === goal)
			const rubric = input.oracle.goals.find((entry) => entry.goal === goal)
			if (observation === undefined || rubric === undefined) {
				failures.push(`${run.execution.arm}:${goal}: missing observation or rubric`)
				continue
			}
			const product = this.#product(input, run.execution.arm, goal)
			if (product === undefined) {
				failures.push(`${run.execution.arm}:${goal}: missing adjudicated product`)
				continue
			}
			if (
				!input.adjudication.batches.some(
					(batch) =>
						batch.id === product.key.batch &&
						listBlockingBatchFailures(batch.failures).length === 0,
				)
			) {
				failures.push(`${run.execution.arm}:${goal}: invalid batch ${product.key.batch}`)
				continue
			}
			judged += 1
			const bounds = computeAcceptability(product.item, product.label)
			acceptable.low += bounds.low
			acceptable.high += bounds.high
			critical += product.label.critical.filter((entry) => entry.violated).length
			if (bounds.low !== bounds.high) ambiguous += 1
			for (const dimension of SUSTAINED_DIMENSIONS) {
				const atoms = product.item.rubric.atoms.filter((atom) => atom.dimension === dimension)
				const outcomes = product.label.atoms.filter((label) =>
					atoms.some((atom) => atom.id === label.id),
				)
				dimensions[dimension].total += atoms.length
				dimensions[dimension].passed += outcomes.filter((atom) => atom.verdict === 'pass').length
				dimensions[dimension].ambiguous += outcomes.filter(
					(atom) => atom.verdict === 'ambiguous',
				).length
			}
			for (const obligation of product.label.obligations)
				if (obligation.disposition === 'completed' || obligation.disposition === 'repaired')
					downstream.push(`${goal}:${obligation.id}:${obligation.disposition}`)
			const required = this.#required(rubric)
			if (required.some((id) => observation.folded.includes(id))) folded += 1
			if (
				required.some((id) => !observation.selected.includes(id) && !observation.folded.includes(id))
			)
				omitted += 1
		}
		return {
			arm: run.execution.arm,
			served,
			judged,
			acceptable,
			critical,
			ambiguous,
			dimensions,
			folded,
			omitted,
			downstream,
		}
	}

	#required(rubric: EnduranceRubric): readonly string[] {
		return [
			...new Set([
				...rubric.atoms.flatMap((atom) => atom.sources.map((source) => `source:${source}`)),
				...rubric.lookups.map((lookup) => `lookup:${lookup.id}@${lookup.from}`),
				...rubric.earlier.map((goal) => `product:${goal}`),
			]),
		]
	}

	#pair(
		input: ContinuousComparisonInput,
		records: ContinuousRun,
		run: ContinuousRun,
		goals: readonly string[],
	): ContinuousPair {
		let wins = 0
		let losses = 0
		let ties = 0
		let ambiguous = 0
		let count = 0
		const gain = { low: 0, high: 0 }
		const regressions: string[] = []
		for (const goal of goals) {
			const left = this.#product(input, 'records', goal)
			const right = this.#product(input, run.execution.arm, goal)
			if (
				left === undefined ||
				right === undefined ||
				!records.rows.some((row) => row.goal === goal && row.success) ||
				!run.rows.some((row) => row.goal === goal && row.success)
			)
				continue
			count += 1
			const base = computeAcceptability(left.item, left.label)
			const other = computeAcceptability(right.item, right.label)
			gain.low += other.low - base.high
			gain.high += other.high - base.low
			if (other.low > base.high) wins += 1
			else if (base.low > other.high) losses += 1
			else if (base.low === base.high && other.low === other.high) ties += 1
			else ambiguous += 1
			for (const violation of right.label.critical)
				if (
					violation.violated &&
					!left.label.critical.some((entry) => entry.rule === violation.rule && entry.violated)
				)
					regressions.push(`${goal}:${violation.rule}`)
		}
		return { arm: run.execution.arm, goals: count, wins, losses, ties, ambiguous, gain, regressions }
	}

	#emptyPair(arm: ContinuousArm): ContinuousPair {
		return {
			arm,
			goals: 0,
			wins: 0,
			losses: 0,
			ties: 0,
			ambiguous: 0,
			gain: { low: 0, high: 0 },
			regressions: [],
		}
	}

	#product(
		input: ContinuousComparisonInput,
		arm: ContinuousArm,
		goal: string,
	):
		| { readonly key: ContinuousKey; readonly item: SustainedItem; readonly label: SustainedLabel }
		| undefined {
		const key = input.blind.keys.find(
			(entry) => entry.arm === arm && entry.goal === goal && entry.control === undefined,
		)
		if (key === undefined) return undefined
		const item = input.blind.packet.items.find((entry) => entry.id === key.id)
		const label = input.adjudication.labels.get(key.id)
		if (item === undefined || label === undefined)
			throw new SustainedAuditError(`missing joined product ${key.id}`)
		return { key, item, label }
	}

	#cost(run: ContinuousRun): ContinuousArmCost {
		const sent = run.requests.filter((request) => request.sent)
		return {
			arm: run.execution.arm,
			status: run.status,
			served: run.rows.length,
			truncated: run.rows.filter((row) => row.failures.includes('length')).length,
			reading: run.costs,
			total: {
				prompt: sent.reduce((total, request) => total + (request.prompt ?? 0), 0),
				completion: sent.reduce((total, request) => total + (request.completion ?? 0), 0),
				missing: sent.filter(
					(request) => request.prompt === undefined || request.completion === undefined,
				).length,
			},
			judge: sumRoleUsage(run.requests, 'judge'),
			summarizer: sumRoleUsage(run.requests, 'summarizer'),
		}
	}
}
