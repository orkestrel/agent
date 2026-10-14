import type { SustainedAuditInput, SustainedBlindResult, SustainedItem, SustainedKey } from './types.js'
import { isDeepStrictEqual } from 'node:util'
import { inspectOracle } from '../../endurance/helpers.js'
import { SustainedAuditError } from './errors.js'
import { buildAuditItem, compareAuditIds, computeAuditId, verifyAuditControl } from './helpers.js'

/** Builds deterministic blind products from actual same-arm work and separately held truth. */
export class Packet {
	/** Constructs one private audit batch with each available prefrozen sensitivity control once.
	 * @param input - The validated pair, selected configuration, and checked oracle
	 * @param seed - The independently recorded packet randomization seed
	 * @returns Public randomized products and private batch/control joins
	 * @throws SustainedAuditError when truth, goal, or evidence joins are missing
	 */
	build(input: SustainedAuditInput, seed: number): SustainedBlindResult {
		this.#verify(input)
		const items: SustainedItem[] = []
		const keys: SustainedKey[] = []
		const batch = computeAuditId(seed, [input.reference.hash, 'batch'])
		for (const run of [input.records, input.aggregate]) {
			for (const row of run.rows) {
				const goal = run.runtime.goals.find((entry) => entry.id === row.goal)
				if (goal === undefined) throw new SustainedAuditError(`missing goal ${row.goal}`)
				const id = computeAuditId(seed, [input.reference.hash, run.path, row.goal])
				items.push(buildAuditItem(run, input.oracle, row.goal, id, row.reply))
				keys.push({
					id,
					batch,
					run: run.path,
					arm: run.execution.arm,
					goal: row.goal,
					files: run.files,
				})
			}
		}
		if (items.length === 0) throw new SustainedAuditError('cannot blind an empty served population')
		for (const control of input.oracle.controls) {
			const run = [input.records, input.aggregate].find((entry) =>
				entry.rows.some((row) => row.goal === control.goal),
			)
			if (run === undefined) continue
			const id = computeAuditId(seed, [input.reference.hash, batch, run.path, control.id])
			const item = buildAuditItem(run, input.oracle, control.goal, id, control.artifact)
			verifyAuditControl(item, control)
			items.push(item)
			keys.push({
				id,
				batch,
				run: run.path,
				arm: run.execution.arm,
				goal: control.goal,
				files: run.files,
				control: { id: control.id, verdict: control.verdict, reason: control.reason },
			})
		}
		return {
			packet: { protocol: 'e1', items: items.toSorted(compareAuditIds) },
			keys: keys.toSorted(compareAuditIds),
		}
	}

	#verify(input: SustainedAuditInput): void {
		if (
			input.directed === undefined &&
			(!input.selection.accepted || input.selection.chosen === undefined)
		)
			throw new SustainedAuditError('blind audit requires an accepted feasibility selection')
		if (input.records.execution.arm !== 'records' || input.aggregate.execution.arm !== 'aggregate')
			throw new SustainedAuditError('pair arms differ')
		for (const run of [input.records, input.aggregate]) {
			if (
				run.execution.phase !== 'evaluation' ||
				run.execution.key !== (input.directed?.key ?? input.selection?.chosen) ||
				run.execution.think !== (input.directed?.think ?? false) ||
				!isDeepStrictEqual(
					input.directed === undefined ? run.execution.selection : run.execution.directed,
					input.reference,
				) ||
				(input.directed === undefined
					? run.execution.directed !== undefined
					: run.execution.selection !== undefined) ||
				!isDeepStrictEqual(
					run.execution.runtime,
					input.directed?.runtime ?? input.selection?.evaluation,
				)
			)
				throw new SustainedAuditError('run differs from selected evaluation custody')
			const failures = inspectOracle(run.runtime, input.oracle)
			if (failures.length > 0) throw new SustainedAuditError(failures.join('\n'))
		}
		if (
			!isDeepStrictEqual(input.records.runtime, input.aggregate.runtime) ||
			!isDeepStrictEqual(input.records.frozen, input.aggregate.frozen) ||
			!isDeepStrictEqual(input.records.execution.budget, input.aggregate.execution.budget)
		)
			throw new SustainedAuditError('paired runtime, roles, or resource bounds differ')
	}
}
