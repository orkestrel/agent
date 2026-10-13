import type {
	SustainedAtomLabel,
	SustainedKey,
	SustainedKeys,
	SustainedLabel,
	SustainedLabels,
	SustainedObligationLabel,
} from './types.js'
import { arrayOf, attempt, isString } from '@orkestrel/contract'
import { isExact } from '../../endurance/validators.js'
import { isRefitFile } from '../../refit/validators.js'

/** Checks the closed atomic adjudication schema without coercion.
 * @param value - The candidate outcome
 * @returns True if the complete outcome is valid; false otherwise
 */
export function isSustainedAtomLabel(value: unknown): value is SustainedAtomLabel {
	const result = attempt(
		() =>
			isExact(value, ['id', 'verdict', 'evidence']) &&
			isString(value.id) &&
			(value.verdict === 'pass' || value.verdict === 'fail' || value.verdict === 'ambiguous') &&
			arrayOf(isString)(value.evidence),
	)
	return result.success && result.value
}

/** Checks the closed downstream obligation outcome schema.
 * @param value - The candidate disposition
 * @returns True if the complete disposition is valid; false otherwise
 */
export function isSustainedObligationLabel(value: unknown): value is SustainedObligationLabel {
	const result = attempt(
		() =>
			isExact(value, ['id', 'disposition', 'evidence']) &&
			isString(value.id) &&
			(value.disposition === 'carried' ||
				value.disposition === 'completed' ||
				value.disposition === 'repaired' ||
				value.disposition === 'missed' ||
				value.disposition === 'ambiguous') &&
			arrayOf(isString)(value.evidence),
	)
	return result.success && result.value
}

/** Checks every required adjudication and audit-limitation field.
 * @param value - The candidate product ruling
 * @returns True if the closed product ruling is valid; false otherwise
 */
export function isSustainedLabel(value: unknown): value is SustainedLabel {
	const result = attempt(
		() =>
			isExact(value, ['id', 'atoms', 'critical', 'obligations', 'ambiguous', 'leaks']) &&
			isString(value.id) &&
			arrayOf(isSustainedAtomLabel)(value.atoms) &&
			arrayOf(isSustainedObligationLabel)(value.obligations) &&
			arrayOf(isString)(value.ambiguous) &&
			arrayOf(isString)(value.leaks) &&
			arrayOf(
				(entry: unknown) =>
					isExact(entry, ['rule', 'violated', 'evidence']) &&
					isString(entry.rule) &&
					typeof entry.violated === 'boolean' &&
					arrayOf(isString)(entry.evidence),
			)(value.critical),
	)
	return result.success && result.value
}

/** Checks a custody-bound root adjudication envelope.
 * @param value - Parsed labels
 * @returns True if every ruling and both hashes are structurally valid; false otherwise
 */
export function isSustainedLabels(value: unknown): value is SustainedLabels {
	const result = attempt(
		() =>
			isExact(value, ['authority', 'packet', 'keys', 'labels']) &&
			value.authority === 'root-adjudicated' &&
			isString(value.packet) &&
			/^[a-f0-9]{64}$/.test(value.packet) &&
			isString(value.keys) &&
			/^[a-f0-9]{64}$/.test(value.keys) &&
			arrayOf(isSustainedLabel)(value.labels),
	)
	return result.success && result.value
}

/** Checks a private blind join without admitting public metadata fields.
 * @param value - The private join candidate
 * @returns True if its identity and optional control are valid; false otherwise
 */
export function isSustainedKey(value: unknown): value is SustainedKey {
	const result = attempt(
		() =>
			isExact(value, ['id', 'batch', 'run', 'arm', 'goal', 'files'], ['control']) &&
			isString(value.id) &&
			isString(value.batch) &&
			isString(value.run) &&
			(value.arm === 'records' || value.arm === 'aggregate') &&
			isString(value.goal) &&
			arrayOf(isRefitFile)(value.files) &&
			(value.control === undefined ||
				(isExact(value.control, ['id', 'verdict', 'reason']) &&
					isString(value.control.id) &&
					isString(value.control.reason) &&
					(value.control.verdict === 'stale' ||
						value.control.verdict === 'fabricated' ||
						value.control.verdict === 'ambiguous'))),
	)
	return result.success && result.value
}

/** Checks the exact private key envelope before dependency custody is verified.
 * @param value - Parsed private keys
 * @returns True if the complete key schema is valid; false otherwise
 */
export function isSustainedKeys(value: unknown): value is SustainedKeys {
	const result = attempt(
		() =>
			isExact(value, [
				'protocol',
				'manifest',
				'packet',
				'oracle',
				'runtime',
				'selection',
				'seed',
				'keys',
			]) &&
			value.protocol === 'e1' &&
			isRefitFile(value.manifest) &&
			isRefitFile(value.packet) &&
			isRefitFile(value.oracle) &&
			isRefitFile(value.runtime) &&
			isRefitFile(value.selection) &&
			typeof value.seed === 'number' &&
			Number.isSafeInteger(value.seed) &&
			arrayOf(isSustainedKey)(value.keys),
	)
	return result.success && result.value
}
