import type { SustainedItem } from '../../sustained/audit/types.js'
import type { ContinuousAuditInput, ContinuousBlindResult, ContinuousKey } from './types.js'
import { isDeepStrictEqual } from 'node:util'
import { inspectOracle } from '../../endurance/helpers.js'
import { SustainedAuditError } from '../../sustained/audit/errors.js'
import {
	buildAuditItem,
	compareAuditIds,
	computeAuditId,
	verifyAuditControl,
} from '../../sustained/audit/helpers.js'

/** Builds the deterministic blind packet of every arm's actual products and the private joins back to them. */
export class Blind {
	/** Constructs one private audit batch with each available prefrozen control once.
	 * @param input - The validated runs of one manifest and the checked oracle
	 * @param seed - The packet randomization seed the manifest records
	 * @returns Public randomized products and private joins
	 * @throws SustainedAuditError when a run belongs to another manifest, the oracle contradicts the runtime, or a join is missing
	 */
	build(input: ContinuousAuditInput, seed: number): ContinuousBlindResult {
		this.#verify(input)
		const items: SustainedItem[] = []
		const keys: ContinuousKey[] = []
		const batch = computeAuditId(seed, [input.reference.hash, 'batch'])
		for (const run of input.runs) {
			for (const row of run.rows) {
				if (row.reply === '') continue
				const id = computeAuditId(seed, [input.reference.hash, run.path, row.goal])
				items.push(this.#strip(buildAuditItem(run, input.oracle, row.goal, id, row.reply)))
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
			const run = input.runs.find((entry) =>
				entry.rows.some((row) => row.goal === control.goal && row.reply !== ''),
			)
			if (run === undefined) continue
			const id = computeAuditId(seed, [input.reference.hash, batch, run.path, control.id])
			const item = buildAuditItem(run, input.oracle, control.goal, id, control.artifact)
			verifyAuditControl(item, control)
			items.push(this.#strip(item))
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
			packet: { protocol: 'c1', items: items.toSorted(compareAuditIds) },
			keys: keys.toSorted(compareAuditIds),
		}
	}

	// Drops the ledger's own recall receipts, which only the records arm produces and which name no external outcome, so an item carries no arm identity.
	#strip(item: SustainedItem): SustainedItem {
		return { ...item, receipts: item.receipts.filter((receipt) => receipt.tool !== 'recall') }
	}

	#verify(input: ContinuousAuditInput): void {
		if (input.runs.length === 0) throw new SustainedAuditError('no run to blind')
		if (new Set(input.runs.map((run) => run.execution.arm)).size !== input.runs.length)
			throw new SustainedAuditError('an arm appears twice')
		for (const run of input.runs) {
			if (
				!isDeepStrictEqual(run.execution.manifest, input.reference) ||
				!isDeepStrictEqual(run.execution.runtime, input.manifest.runtime) ||
				!isDeepStrictEqual(run.manifest, input.manifest)
			)
				throw new SustainedAuditError('run differs from the manifest custody')
			const failures = inspectOracle(run.runtime, input.oracle)
			if (failures.length > 0) throw new SustainedAuditError(failures.join('\n'))
		}
	}
}
