import type { EnduranceControl, EnduranceOracle } from '../../endurance/types.js'
import type { SustainedRun } from '../types.js'
import type {
	SustainedAuditInput,
	SustainedBlindResult,
	SustainedEvidence,
	SustainedItem,
	SustainedKey,
} from './types.js'
import { isDeepStrictEqual } from 'node:util'
import { inspectOracle } from '../../endurance/helpers.js'
import { SUSTAINED_CONTROLS } from './constants.js'
import { SustainedAuditError } from './errors.js'
import {
	collectAuditFacts,
	collectAuditObligations,
	compareAuditIds,
	computeAuditId,
} from './helpers.js'

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
				items.push(this.#item(run, input.oracle, row.goal, id, row.reply))
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
			const item = this.#item(run, input.oracle, control.goal, id, control.artifact)
			this.#control(item, control)
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
		if (!input.selection.accepted || input.selection.chosen === undefined)
			throw new SustainedAuditError('blind audit requires an accepted feasibility selection')
		if (input.records.execution.arm !== 'records' || input.aggregate.execution.arm !== 'aggregate')
			throw new SustainedAuditError('pair arms differ')
		for (const run of [input.records, input.aggregate]) {
			if (
				run.execution.phase !== 'evaluation' ||
				run.execution.key !== input.selection.chosen ||
				run.execution.think ||
				!isDeepStrictEqual(run.execution.selection, input.reference) ||
				!isDeepStrictEqual(run.execution.runtime, input.selection.evaluation)
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

	#item(
		run: SustainedRun,
		oracle: EnduranceOracle,
		goalId: string,
		id: string,
		product: string,
	): SustainedItem {
		const goal = run.runtime.goals.find((entry) => entry.id === goalId)
		const rubric = oracle.goals.find((entry) => entry.goal === goalId)
		const observation = run.observations.find((entry) => entry.goal === goalId)
		if (goal === undefined || rubric === undefined || observation === undefined)
			throw new SustainedAuditError(`missing product join ${goalId}`)
		for (const reference of observation.conversation) {
			if (
				!reference.startsWith('message:') ||
				!run.messages.some((message) => message.id === reference.slice(8))
			)
				throw new SustainedAuditError(`missing conversation join ${reference}`)
		}
		const earlier = rubric.earlier.map((reference) => {
			const row = run.rows.find((entry) => entry.goal === reference)
			const request = run.runtime.goals.find((entry) => entry.id === reference)
			if (
				row === undefined ||
				request === undefined ||
				!observation.products.includes(`product:${reference}`)
			)
				throw new SustainedAuditError(`missing earlier same-arm product ${reference}`)
			return { id: reference, request: request.request, product: row.reply }
		})
		const evidence: SustainedEvidence[] = []
		for (const reference of observation.sources) {
			const source = run.runtime.seed.find((entry) => `source:${entry.id}` === reference)
			const lookup = run.runtime.lookups.find(
				(entry) => `lookup:${entry.id}@${entry.from}` === reference,
			)
			if (source !== undefined && run.runtime.seed.indexOf(source) <= goal.after)
				evidence.push({ id: reference, content: source.content, shift: source.shift })
			else if (
				lookup !== undefined &&
				lookup.from <= goal.after &&
				run.runtime.seed[lookup.from] !== undefined
			)
				evidence.push({
					id: reference,
					content: lookup.text,
					shift: run.runtime.seed[lookup.from]?.shift ?? 0,
				})
			else throw new SustainedAuditError(`missing external evidence join ${reference}`)
		}
		for (const atom of rubric.atoms) {
			for (const source of atom.sources)
				if (!evidence.some((entry) => entry.id === `source:${source}`))
					throw new SustainedAuditError(`missing rubric source join ${source}`)
		}
		for (const required of rubric.lookups) {
			const reference = `lookup:${required.id}@${required.from}`
			if (evidence.some((entry) => entry.id === reference)) continue
			const lookup = run.runtime.lookups.find(
				(entry) =>
					entry.id === required.id && entry.tool === required.tool && entry.from === required.from,
			)
			const source = lookup === undefined ? undefined : run.runtime.seed[lookup.from]
			if (lookup === undefined || source === undefined || lookup.from > goal.after)
				throw new SustainedAuditError(`missing available lookup ${reference}`)
			evidence.push({ id: reference, content: lookup.text, shift: source.shift })
		}
		return {
			id,
			point: { shift: goal.shift, after: goal.after },
			request: goal.request,
			product,
			earlier,
			evidence,
			receipts: run.receipts.filter(
				(receipt) =>
					receipt.after <= goal.after &&
					(receipt.goal === goalId || observation.products.includes(`product:${receipt.goal}`)),
			),
			facts: collectAuditFacts(oracle, goal.after),
			obligations: collectAuditObligations(oracle, goal.after),
			rubric,
		}
	}

	#control(item: SustainedItem, control: EnduranceControl): void {
		if (
			control.verdict !== 'ambiguous' &&
			!item.rubric.critical.includes(SUSTAINED_CONTROLS[control.verdict])
		)
			throw new SustainedAuditError(`prefrozen control lacks its exact critical rule ${control.id}`)
	}
}
