import type { AggregateBinding } from '../../types.js'
import type { RefitFile } from '../../refit/types.js'
import type { SustainedArm, SustainedRun, SustainedSelection } from '../types.js'
import type {
	SustainedChain,
	SustainedComparisonInput,
	SustainedInterval,
	SustainedItem,
	SustainedKey,
	SustainedLabel,
	SustainedReport,
} from './types.js'
import { isDeepStrictEqual } from 'node:util'
import { listMatrixPairFailures } from '../../matrix/helpers.js'
import { SUSTAINED_DIMENSIONS, SUSTAINED_LIMITATION, SUSTAINED_TRANSITIONS } from './constants.js'
import { SustainedAuditError } from './errors.js'
import {
	collectAuditCoverage,
	computeAcceptability,
	countCompleteGoals,
	matchesCompleteRow,
	measureAuditCosts,
} from './helpers.js'

/** Reports dependent paired outcomes while retaining invalid evidence and ambiguous bounds. */
export class Comparison {
	/** Reports a feasibility refusal without requiring invented trajectories or labels.
	 * @param selection - The shared reader's refused selection
	 * @param reference - Its exact file identity
	 * @param preparation - Validated separate preparation readings
	 * @returns An explicit inconclusive comparison
	 */
	inconclusive(
		selection: SustainedSelection,
		reference: RefitFile,
		preparation: readonly unknown[] = [],
	): SustainedReport {
		if (selection.accepted || selection.chosen !== undefined)
			throw new SustainedAuditError('accepted selection requires actual pair and root adjudication')
		return {
			protocol: 'e1',
			policy: selection.policy,
			selection: reference,
			valid: false,
			failures: selection.failures,
			batches: [],
			served: { records: 0, aggregate: 0 },
			common: 0,
			suffix: { records: [], aggregate: [] },
			checkpoints: [],
			intervals: [],
			observations: [],
			maintenance: [],
			costs: [],
			preparation,
			recommendation: 'inconclusive',
			reasons: ['No configuration passed the frozen feasibility sequence.'],
			limitation: SUSTAINED_LIMITATION,
		}
	}

	/** Builds every common checkpoint and disjoint interval, including the frozen final interval.
	 * @param input - Validated runtime pair and complete root adjudication
	 * @returns The quality, exposure, continuity, and cost comparison
	 */
	build(input: SustainedComparisonInput): SustainedReport {
		if (!input.selection.accepted)
			throw new SustainedAuditError('refused selection cannot carry scored runs')
		const failures = [
			...input.records.failures.map((failure) => `records: ${failure}`),
			...input.aggregate.failures.map((failure) => `aggregate: ${failure}`),
		]
		failures.push(...listMatrixPairFailures(input.records, input.aggregate))
		const complete = Math.min(
			countCompleteGoals(input.records),
			countCompleteGoals(input.aggregate),
		)
		const runtime = input.records.runtime
		const boundaries = runtime.goals.filter(
			(goal, index) => goal.shift % 4 === 0 && runtime.goals[index + 1]?.shift !== goal.shift,
		)
		const common =
			boundaries
				.filter(
					(goal) =>
						runtime.goals.indexOf(goal) < complete &&
						input.records.observations.some(
							(entry) => entry.goal === goal.id && entry.checkpoint,
						) &&
						input.aggregate.observations.some(
							(entry) => entry.goal === goal.id && entry.checkpoint,
						),
				)
				.at(-1)?.shift ?? 0
		if (
			input.records.rows.length !== runtime.goals.length ||
			input.aggregate.rows.length !== runtime.goals.length ||
			complete !== runtime.goals.length
		)
			failures.push('incomplete continuous pair')
		for (const batch of input.adjudication.batches)
			if (!batch.valid)
				failures.push(`invalid audit batch ${batch.id}: ${batch.failures.join('; ')}`)
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
		if (!valid)
			reasons.push('Runtime or adjudication evidence does not establish a valid continuous pair.')
		if (!intervals.every((interval) => interval.exposure.majority))
			reasons.push('Treatment was absent from more than half of goals in at least one interval.')
		if (overall.regressions.length > 0)
			reasons.push('An aggregate-only critical violation occurred.')
		if (overall.gain.low <= 0)
			reasons.push('The conservative overall acceptable-product gain is not positive.')
		if (final.gain.low <= 0)
			reasons.push('The conservative final-interval acceptable-product gain is not positive.')
		if (overall.downstream.length === 0 || final.downstream.length === 0)
			reasons.push(
				'A conservative gain with completed or repaired downstream work is absent overall or in the final interval.',
			)
		let recommendation: SustainedReport['recommendation'] = 'inconclusive'
		if (input.selection.policy !== undefined)
			reasons.push(
				'Exploratory provenance does not qualify support or permit an adoption recommendation.',
			)
		if (
			input.selection.policy === undefined &&
			valid &&
			intervals.every((interval) => interval.exposure.majority)
		) {
			if (reasons.length === 0) recommendation = 'conditional'
			else if (overall.regressions.length > 0 || overall.gain.high <= 0 || final.gain.high <= 0)
				recommendation = 'negative'
		}
		if (recommendation === 'conditional')
			reasons.push(
				'Every frozen quality, exposure, continuity, and critical-regression condition passed; the user decision remains conditional on the reported costs and limitations.',
			)
		const records = measureAuditCosts(input.records)
		const aggregate = measureAuditCosts(input.aggregate)
		return {
			protocol: 'e1',
			policy: input.selection.policy,
			selection: input.reference,
			packet: input.packet,
			labels: input.labels,
			valid,
			failures,
			batches: input.adjudication.batches,
			served: { records: input.records.rows.length, aggregate: input.aggregate.rows.length },
			common,
			suffix: {
				records: runtime.goals.filter((goal) => goal.shift > common).map((goal) => goal.id),
				aggregate: input.aggregate.runtime.goals
					.filter((goal) => goal.shift > common)
					.map((goal) => goal.id),
			},
			checkpoints,
			intervals,
			overall,
			final,
			observations: [input.records, input.aggregate].flatMap((run) =>
				this.#observations(run, input),
			),
			maintenance: [input.records, input.aggregate].map((run) => this.#maintenance(run, input)),
			costs: [input.records, input.aggregate].map((run) => ({
				arm: run.execution.arm,
				reading: run.costs,
				detail: run.execution.arm === 'records' ? records : aggregate,
			})),
			incremental: {
				prompt: aggregate.total.prompt - records.total.prompt,
				completion: aggregate.total.completion - records.total.completion,
				missing: aggregate.total.missing + records.total.missing,
			},
			preparation: input.preparation,
			recommendation,
			reasons,
			limitation: SUSTAINED_LIMITATION,
		}
	}

	#interval(input: SustainedComparisonInput, from: number, through: number): SustainedInterval {
		const goals = input.records.runtime.goals
			.filter((goal) => goal.shift >= from && goal.shift <= through)
			.map((goal) => goal.id)
		const failures = [...listMatrixPairFailures(input.records, input.aggregate)]
		const acceptable = { records: { low: 0, high: 0 }, aggregate: { low: 0, high: 0 } }
		const critical = { records: 0, aggregate: 0 }
		const dimensions = {
			facts: {
				records: { passed: 0, total: 0, ambiguous: 0 },
				aggregate: { passed: 0, total: 0, ambiguous: 0 },
			},
			work: {
				records: { passed: 0, total: 0, ambiguous: 0 },
				aggregate: { passed: 0, total: 0, ambiguous: 0 },
			},
			obligations: {
				records: { passed: 0, total: 0, ambiguous: 0 },
				aggregate: { passed: 0, total: 0, ambiguous: 0 },
			},
			revision: {
				records: { passed: 0, total: 0, ambiguous: 0 },
				aggregate: { passed: 0, total: 0, ambiguous: 0 },
			},
			evidence: {
				records: { passed: 0, total: 0, ambiguous: 0 },
				aggregate: { passed: 0, total: 0, ambiguous: 0 },
			},
		}
		let wins = 0
		let losses = 0
		let ties = 0
		let ambiguous = 0
		const regressions: string[] = []
		const downstream: string[] = []
		for (const goal of goals) {
			const left = this.#product(input, 'records', goal)
			const right = this.#product(input, 'aggregate', goal)
			if (left === undefined || right === undefined) {
				failures.push(`missing served pair ${goal}`)
				continue
			}
			const refusals: string[] = []
			for (const product of [left, right]) {
				const run = product.key.arm === 'records' ? input.records : input.aggregate
				const row = run.rows.find((entry) => entry.goal === goal)
				if (
					row === undefined ||
					!matchesCompleteRow(row) ||
					!run.observations.some((entry) => entry.goal === goal && entry.complete)
				)
					refusals.push(`invalid served product ${product.key.arm}:${goal}`)
				if (
					!input.adjudication.batches.some((batch) => batch.id === product.key.batch && batch.valid)
				)
					refusals.push(`invalid batch ${product.key.batch}`)
			}
			if (refusals.length > 0) {
				failures.push(...refusals)
				continue
			}
			const bounds = {
				records: computeAcceptability(left.item, left.label),
				aggregate: computeAcceptability(right.item, right.label),
			}
			for (const product of [left, right]) {
				const arm = product.key.arm
				acceptable[arm].low += bounds[arm].low
				acceptable[arm].high += bounds[arm].high
				critical[arm] += product.label.critical.filter((entry) => entry.violated).length
				for (const dimension of SUSTAINED_DIMENSIONS) {
					const atoms = product.item.rubric.atoms.filter((atom) => atom.dimension === dimension)
					const outcomes = product.label.atoms.filter((label) =>
						atoms.some((atom) => atom.id === label.id),
					)
					dimensions[dimension][arm].total += atoms.length
					dimensions[dimension][arm].passed += outcomes.filter(
						(atom) => atom.verdict === 'pass',
					).length
					dimensions[dimension][arm].ambiguous += outcomes.filter(
						(atom) => atom.verdict === 'ambiguous',
					).length
				}
			}
			if (bounds.aggregate.low > bounds.records.high) {
				wins++
				for (const obligation of right.label.obligations)
					if (obligation.disposition === 'completed' || obligation.disposition === 'repaired')
						downstream.push(`${goal}:${obligation.id}:${obligation.disposition}`)
			} else if (bounds.records.low > bounds.aggregate.high) losses++
			else if (
				bounds.records.low === bounds.records.high &&
				bounds.aggregate.low === bounds.aggregate.high
			)
				ties++
			else ambiguous++
			for (const violation of right.label.critical)
				if (
					violation.violated &&
					!left.label.critical.some((entry) => entry.rule === violation.rule && entry.violated)
				)
					regressions.push(`${goal}:${violation.rule}`)
		}
		const served = input.aggregate.rows.filter((row) => goals.includes(row.goal)).length
		const exposed = input.aggregate.observations.filter(
			(observation) =>
				goals.includes(observation.goal) &&
				observation.exposed &&
				input.aggregate.rows.some((row) => row.goal === observation.goal),
		).length
		return {
			from,
			through,
			goals,
			valid:
				failures.length === 0 &&
				input.records.failures.length === 0 &&
				input.aggregate.failures.length === 0,
			failures,
			acceptable,
			wins,
			losses,
			ties,
			ambiguous,
			gain: {
				low: acceptable.aggregate.low - acceptable.records.high,
				high: acceptable.aggregate.high - acceptable.records.low,
			},
			critical,
			regressions,
			exposure: { served, exposed, majority: served > 0 && exposed > served / 2 },
			downstream,
			dimensions,
		}
	}

	#product(
		input: SustainedComparisonInput,
		arm: SustainedArm,
		goal: string,
	):
		| { readonly key: SustainedKey; readonly item: SustainedItem; readonly label: SustainedLabel }
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

	#observations(run: SustainedRun, input: SustainedComparisonInput): readonly unknown[] {
		return run.observations.map((observation) => {
			const rubric = input.oracle.goals.find((entry) => entry.goal === observation.goal)
			if (rubric === undefined)
				throw new SustainedAuditError(`missing observation rubric ${observation.goal}`)
			const product = this.#product(input, run.execution.arm, observation.goal)
			return {
				arm: run.execution.arm,
				...observation,
				coverage: collectAuditCoverage(run, rubric),
				requirements: rubric.distant,
				obligations: product?.label.obligations ?? [],
				request: run.requests
					.filter((request) => request.goal === observation.goal)
					.map((request) => ({
						sequence: request.sequence,
						role: request.role,
						turn: request.turn,
						sent: request.sent,
						failures: request.failures,
						prompt: request.prompt,
						completion: request.completion,
						wall: request.wall,
					})),
			}
		})
	}

	#maintenance(run: SustainedRun, input: SustainedComparisonInput): unknown {
		const chains: SustainedChain[] = []
		const last = new Map<string, AggregateBinding>()
		for (const pick of run.picks) {
			if (
				!run.observations.some(
					(observation) => observation.goal === pick.goal && observation.exposed,
				)
			)
				continue
			for (const binding of pick.aggregates ?? []) {
				if (binding.prose.trim() === '') continue
				const prior = last.get(binding.topic)
				if (
					prior !== undefined &&
					prior.state.goal !== binding.state.goal &&
					!isDeepStrictEqual(prior.state.sources, binding.state.sources)
				) {
					const messages = [...prior.state.sources, ...binding.state.sources].map((source) =>
						run.messages.find((message) => message.id === source.id),
					)
					const sources = messages
						.flatMap((message) =>
							message?.seed === undefined ? [] : [run.runtime.seed[message.seed]?.id],
						)
						.filter((id): id is string => id !== undefined)
					const transitions = new Set(
						input.oracle.facts
							.filter(
								(fact) =>
									fact.from > prior.state.point &&
									fact.from <= binding.state.point &&
									fact.sources.some((source) => sources.includes(source)),
							)
							.map((fact) => fact.transition),
					)
					if (
						binding.state.sources.some(
							(source) =>
								source.role === 'tool' &&
								!prior.state.sources.some((earlier) => isDeepStrictEqual(source, earlier)),
						)
					)
						transitions.add('tool')
					chains.push({
						topic: binding.topic,
						before: prior.state.goal,
						after: binding.state.goal,
						prior: prior.state.version,
						version: binding.state.version,
						retained: prior.state.version === binding.state.version,
						sources: [...new Set(sources)],
						transitions: [...transitions],
					})
				}
				last.set(binding.topic, binding)
			}
		}
		return {
			arm: run.execution.arm,
			chains,
			absent: SUSTAINED_TRANSITIONS.filter(
				(transition) => !chains.some((chain) => chain.transitions.includes(transition)),
			),
			journal: run.journal,
		}
	}
}
