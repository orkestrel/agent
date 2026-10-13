import type { EnduranceRuntime, EnduranceOracle } from './types.js'
import { arrayOf, attempt, isFiniteNumber, isRecord, isString } from '@orkestrel/contract'

/** Checks an owned record's exact member population.
 * @param value - Candidate record
 * @param required - Required keys
 * @param optional - Optional keys
 * @returns True if every key is permitted and required keys exist; false otherwise
 */
export function isExact(
	value: unknown,
	required: readonly string[],
	optional: readonly string[] = [],
): value is Record<string, unknown> {
	const result = attempt(
		() =>
			isRecord(value) &&
			required.every((key) => Object.hasOwn(value, key)) &&
			Object.keys(value).every((key) => required.includes(key) || optional.includes(key)),
	)
	return result.success && result.value
}

/** Checks a nonnegative integral scheduling coordinate.
 * @param value - Candidate coordinate
 * @returns True if the coordinate is finite and integral; false otherwise
 */
export function isPosition(value: unknown): value is number {
	return isFiniteNumber(value) && Number.isSafeInteger(value) && value >= 0
}

/** Checks the closed external schema and refuses private fields at every structural depth.
 * @param value - Parsed external JSON
 * @returns True if the complete external schema is valid; false otherwise
 */
export function isEnduranceRuntime(value: unknown): value is EnduranceRuntime {
	const result = attempt(
		() =>
			isExact(value, ['id', 'system', 'topics', 'days', 'seed', 'tools', 'lookups', 'goals']) &&
			isString(value.id) &&
			isString(value.system) &&
			Array.isArray(value.topics) &&
			value.topics.every(
				(entry: unknown) =>
					isExact(entry, ['name', 'criterion']) &&
					isString(entry.name) &&
					isString(entry.criterion),
			) &&
			Array.isArray(value.days) &&
			value.days.every(
				(entry: unknown) =>
					isExact(entry, ['date', 'from']) && isString(entry.date) && isPosition(entry.from),
			) &&
			Array.isArray(value.seed) &&
			value.seed.every(
				(entry: unknown) =>
					isExact(entry, ['id', 'shift', 'date', 'role', 'content']) &&
					isString(entry.id) &&
					isPosition(entry.shift) &&
					isString(entry.date) &&
					entry.role === 'user' &&
					isString(entry.content),
			) &&
			isExact(value.tools, ['lookup_order', 'lookup_customer']) &&
			Object.values(value.tools).every(
				(table) =>
					isRecord(table) &&
					Object.entries(table).every(
						([id, text]) => /^[A-Z]{2}-\d{4}$/.test(id) && isString(text),
					),
			) &&
			Array.isArray(value.lookups) &&
			value.lookups.every(
				(entry: unknown) =>
					isExact(entry, ['id', 'tool', 'from', 'text']) &&
					isString(entry.id) &&
					(entry.tool === 'lookup_order' || entry.tool === 'lookup_customer') &&
					isPosition(entry.from) &&
					isString(entry.text),
			) &&
			Array.isArray(value.goals) &&
			value.goals.every(
				(entry: unknown) =>
					isExact(entry, ['id', 'shift', 'after', 'request']) &&
					isString(entry.id) &&
					isPosition(entry.shift) &&
					isPosition(entry.after) &&
					isString(entry.request),
			),
	)
	return result.success && result.value
}

/** Checks the separately stored private oracle without accepting runtime-shaped substitutes.
 * @param value - Parsed private JSON
 * @returns True if all private records satisfy their closed schemas; false otherwise
 */
export function isEnduranceOracle(value: unknown): value is EnduranceOracle {
	const result = attempt(
		() =>
			isExact(value, ['runtime', 'facts', 'obligations', 'goals', 'controls', 'calculations']) &&
			isString(value.runtime) &&
			Array.isArray(value.facts) &&
			value.facts.every(
				(entry: unknown) =>
					isExact(
						entry,
						['id', 'version', 'value', 'from', 'sources', 'transition', 'case'],
						['until'],
					) &&
					isString(entry.id) &&
					isPosition(entry.version) &&
					isString(entry.value) &&
					isPosition(entry.from) &&
					(entry.until === undefined || isPosition(entry.until)) &&
					arrayOf(isString)(entry.sources) &&
					isString(entry.case) &&
					isString(entry.transition) &&
					['arrival', 'repetition', 'correction', 'withdrawal', 'supersession', 'tool'].includes(
						entry.transition,
					),
			) &&
			Array.isArray(value.obligations) &&
			value.obligations.every(
				(entry: unknown) =>
					isExact(
						entry,
						[
							'id',
							'version',
							'case',
							'from',
							'due',
							'prerequisites',
							'sources',
							'description',
							'evidence',
						],
						['closed', 'withdrawn'],
					) &&
					isString(entry.id) &&
					isPosition(entry.version) &&
					isString(entry.case) &&
					isPosition(entry.from) &&
					isPosition(entry.due) &&
					(entry.closed === undefined || isPosition(entry.closed)) &&
					(entry.withdrawn === undefined || isPosition(entry.withdrawn)) &&
					arrayOf(isString)(entry.prerequisites) &&
					arrayOf(isString)(entry.sources) &&
					isString(entry.description) &&
					arrayOf(isString)(entry.evidence),
			) &&
			Array.isArray(value.goals) &&
			value.goals.every(
				(entry: unknown) =>
					isExact(entry, [
						'goal',
						'product',
						'case',
						'earlier',
						'atoms',
						'critical',
						'distant',
						'lookups',
						'obligations',
					]) &&
					isString(entry.goal) &&
					isString(entry.product) &&
					['queue', 'packet', 'reconciliation', 'handoff'].includes(entry.product) &&
					isString(entry.case) &&
					arrayOf(isString)(entry.earlier) &&
					arrayOf(isString)(entry.critical) &&
					arrayOf(isString)(entry.obligations) &&
					Array.isArray(entry.atoms) &&
					entry.atoms.every(
						(atom: unknown) =>
							isExact(atom, [
								'id',
								'dimension',
								'requirement',
								'alternatives',
								'sources',
								'mandatory',
							]) &&
							isString(atom.id) &&
							isString(atom.dimension) &&
							['facts', 'work', 'obligations', 'revision', 'evidence'].includes(atom.dimension) &&
							isString(atom.requirement) &&
							arrayOf(isString)(atom.alternatives) &&
							arrayOf(isString)(atom.sources) &&
							typeof atom.mandatory === 'boolean',
					) &&
					Array.isArray(entry.distant) &&
					entry.distant.every(
						(link: unknown) =>
							isExact(link, ['source', 'requirement']) &&
							isString(link.source) &&
							isString(link.requirement),
					) &&
					Array.isArray(entry.lookups) &&
					entry.lookups.every(
						(lookup: unknown) =>
							isExact(lookup, ['tool', 'id', 'from']) &&
							isString(lookup.tool) &&
							isString(lookup.id) &&
							isPosition(lookup.from),
					),
			) &&
			Array.isArray(value.controls) &&
			value.controls.every(
				(entry: unknown) =>
					isExact(entry, ['id', 'goal', 'artifact', 'verdict', 'reason']) &&
					isString(entry.id) &&
					isString(entry.goal) &&
					isString(entry.artifact) &&
					isString(entry.verdict) &&
					['stale', 'fabricated', 'ambiguous'].includes(entry.verdict) &&
					isString(entry.reason),
			) &&
			Array.isArray(value.calculations) &&
			value.calculations.every(
				(entry: unknown) =>
					isExact(entry, ['id', 'goal', 'sources', 'terms', 'divisor', 'result', 'explanation']) &&
					isString(entry.id) &&
					isString(entry.goal) &&
					arrayOf(isString)(entry.sources) &&
					arrayOf(isFiniteNumber)(entry.terms) &&
					isFiniteNumber(entry.divisor) &&
					isFiniteNumber(entry.result) &&
					isString(entry.explanation),
			),
	)
	return result.success && result.value
}
