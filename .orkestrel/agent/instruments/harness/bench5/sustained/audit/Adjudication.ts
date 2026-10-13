import type { SustainedAdjudication, SustainedAdjudicationInput, SustainedLabel } from './types.js'
import { SUSTAINED_CONTROLS } from './constants.js'
import { SustainedAuditError } from './errors.js'
import { listLabelFailures } from './helpers.js'

/** Validates complete custody-bound root adjudication without generating quality labels. */
export class Adjudication {
	/** Refuses incomplete adjudication and marks missed controls or identity leaks by batch.
	 * @param input - Exact packet/key hashes and independent root labels; the keys carry at least each item's identity, batch, and control
	 * @returns Checked labels and batch validity, keeping ambiguity explicit
	 */
	read(input: SustainedAdjudicationInput): SustainedAdjudication {
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
			const refusals = listLabelFailures(item, label)
			if (refusals.length > 0) throw new SustainedAuditError(refusals.join('; '))
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
}
