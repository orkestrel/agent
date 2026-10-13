import type {
	SustainedAdjudication,
	SustainedItem,
	SustainedJudgmentInput,
	SustainedLabel,
} from './types.js'
import { SUSTAINED_CONTROLS } from './constants.js'
import { SustainedAuditError } from './errors.js'
import { matchesCompletionEvidence, matchesFactualEvidence, readAuditCitation } from './helpers.js'

/** Validates complete custody-bound root adjudication without generating quality labels. */
export class Adjudication {
	/** Refuses incomplete adjudication and marks missed controls or identity leaks by batch.
	 * @param input - Exact packet/key hashes and independent root labels
	 * @returns Checked labels and batch validity, keeping ambiguity explicit
	 */
	read(input: SustainedJudgmentInput): SustainedAdjudication {
		if (
			input.labels.authority !== 'root-adjudicated' ||
			input.labels.packet !== input.hashes.packet ||
			input.labels.keys !== input.hashes.keys ||
			input.keys.packet.hash !== input.hashes.packet
		)
			throw new SustainedAuditError('stale packet/key/label custody')
		this.#population(
			input.packet.items.map((item) => item.id),
			input.keys.keys.map((key) => key.id),
			'packet/key',
		)
		this.#population(
			input.packet.items.map((item) => item.id),
			input.labels.labels.map((label) => label.id),
			'label',
		)
		const labels = new Map<string, SustainedLabel>()
		const batches = new Map<string, string[]>()
		for (const key of input.keys.keys) {
			const item = input.packet.items.find((entry) => entry.id === key.id)
			const label = input.labels.labels.find((entry) => entry.id === key.id)
			if (item === undefined || label === undefined)
				throw new SustainedAuditError(`missing adjudication ${key.id}`)
			this.#label(item, label)
			labels.set(key.id, label)
			const failures = batches.get(key.batch) ?? []
			if (label.leaks.length > 0)
				failures.push(`identity leak ${key.id}: ${label.leaks.join('; ')}`)
			if (key.control !== undefined) {
				const control = key.control
				if (control.verdict === 'ambiguous') {
					if (
						label.ambiguous.length === 0 ||
						!label.atoms.some((atom) => atom.verdict === 'ambiguous')
					)
						failures.push(`missed ambiguous control ${control.id}`)
				} else {
					const rule = SUSTAINED_CONTROLS[control.verdict]
					if (!label.critical.some((entry) => entry.rule === rule && entry.violated))
						failures.push(`missed ${control.verdict} control ${control.id}`)
				}
			}
			batches.set(key.batch, failures)
		}
		for (const [id, failures] of batches) {
			for (const expected of ['stale', 'fabricated', 'ambiguous']) {
				if (!input.keys.keys.some((key) => key.batch === id && key.control?.verdict === expected))
					failures.push(`unavailable ${expected} control context`)
			}
		}
		return {
			labels,
			batches: [...batches].map(([id, failures]) => ({
				id,
				valid: failures.length === 0,
				failures,
			})),
		}
	}

	#population(expected: readonly string[], actual: readonly string[], name: string): void {
		if (
			new Set(expected).size !== expected.length ||
			new Set(actual).size !== actual.length ||
			actual.length !== expected.length ||
			actual.some((id) => !expected.includes(id))
		)
			throw new SustainedAuditError(`missing, duplicate, or unknown ${name} outcomes`)
	}

	#label(item: SustainedItem, label: SustainedLabel): void {
		this.#population(
			item.rubric.atoms.map((atom) => atom.id),
			label.atoms.map((atom) => atom.id),
			'atom',
		)
		this.#population(
			item.rubric.critical,
			label.critical.map((critical) => critical.rule),
			'critical',
		)
		this.#population(
			item.rubric.obligations,
			label.obligations.map((obligation) => obligation.id),
			'obligation',
		)
		for (const atom of label.atoms) {
			const definition = item.rubric.atoms.find((entry) => entry.id === atom.id)
			const references = this.#evidence(item, atom.evidence)
			if (definition === undefined) throw new SustainedAuditError(`unknown atom ${atom.id}`)
			if (
				atom.verdict === 'pass' &&
				definition.dimension === 'facts' &&
				!matchesFactualEvidence(item, references, definition.sources)
			)
				throw new SustainedAuditError(`earlier work cannot supply factual credit ${atom.id}`)
		}
		for (const critical of label.critical) this.#evidence(item, critical.evidence)
		for (const obligation of label.obligations) {
			const references = this.#evidence(item, obligation.evidence)
			const definition = item.obligations.find((entry) => entry.id === obligation.id)
			if (definition === undefined)
				throw new SustainedAuditError(`unrelated obligation ${obligation.id}`)
			if (
				obligation.disposition === 'completed' &&
				!matchesCompletionEvidence(item, definition, references)
			)
				throw new SustainedAuditError(
					`downstream outcome lacks bound completion evidence ${obligation.id}`,
				)
			if (
				obligation.disposition === 'repaired' &&
				!references.some(
					(reference) => reference.startsWith('source:') || reference.startsWith('receipt:'),
				)
			)
				throw new SustainedAuditError(`downstream outcome lacks external evidence ${obligation.id}`)
			if (
				obligation.disposition === 'repaired' &&
				!references.some((reference) => reference.startsWith('product:'))
			)
				throw new SustainedAuditError(
					`repaired outcome lacks earlier-work evidence ${obligation.id}`,
				)
		}
		if (
			(label.atoms.some((atom) => atom.verdict === 'ambiguous') ||
				label.obligations.some((obligation) => obligation.disposition === 'ambiguous')) &&
			label.ambiguous.length === 0
		)
			throw new SustainedAuditError(`missing ambiguity evidence ${item.id}`)
		for (const citation of [...label.ambiguous, ...label.leaks]) readAuditCitation(item, citation)
	}

	#evidence(item: SustainedItem, evidence: readonly string[]): readonly string[] {
		if (evidence.length === 0)
			throw new SustainedAuditError(`empty adjudication evidence ${item.id}`)
		const references = evidence.map((citation) => readAuditCitation(item, citation))
		if (!references.includes('product'))
			throw new SustainedAuditError(`ruling does not cite current product ${item.id}`)
		return references
	}
}
