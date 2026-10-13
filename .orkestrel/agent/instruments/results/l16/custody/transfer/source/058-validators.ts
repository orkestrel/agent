import type {
	SustainedAttempt,
	SustainedPolicy,
	SustainedExploration,
	SustainedCandidate,
	SustainedClassification,
	SustainedExecution,
	SustainedLimits,
	SustainedMessage,
	SustainedObservation,
	SustainedReceipt,
	SustainedSelection,
} from './types.js'
import { arrayOf, isRecord, isString } from '@orkestrel/contract'
import { isRefitFile } from '../refit/validators.js'
import { isMatrixBudget } from '../matrix/validators.js'

function isCount(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** Checks an explicit exploratory route without duplicate qualification claims. */
export function isSustainedPolicy(value: unknown): value is SustainedPolicy {
	return (
		isRecord(value) &&
		Object.keys(value).every((key) => ['qualified', 'withhold'].includes(key)) &&
		isRefitFile(value.qualified) &&
		typeof value.withhold === 'boolean'
	)
}

/** Checks exactly one form of matrix exposure and optional refused-candidate diagnosis. */
export function isSustainedExploration(value: unknown): value is SustainedExploration {
	return (
		isRecord(value) &&
		Object.keys(value).every((key) => ['matrix', 'diagnosis'].includes(key)) &&
		(value.diagnosis === undefined || isRefitFile(value.diagnosis)) &&
		isRecord(value.matrix) &&
		('pilot' in value.matrix
			? Object.keys(value.matrix).length === 1 && isRefitFile(value.matrix.pilot)
			: Object.keys(value.matrix).length === 2 &&
				isRefitFile(value.matrix.records) &&
				isRefitFile(value.matrix.aggregate))
	)
}

/** Checks finite whole-run limits. */
export function isSustainedLimits(value: unknown): value is SustainedLimits {
	return (
		isRecord(value) &&
		[value.calls, value.tokens, value.wall, value.goals].every((one) => isCount(one) && one > 0) &&
		isCount(value.retries) &&
		isString(value.derivation) &&
		value.derivation.length > 0 &&
		arrayOf(isRefitFile)(value.evidence)
	)
}

/** Checks an explicit continuous execution without accepting copy axes or hidden data. */
export function isSustainedExecution(value: unknown): value is SustainedExecution {
	return (
		isRecord(value) &&
		Object.keys(value).every((key) =>
			[
				'protocol',
				'key',
				'think',
				'arm',
				'phase',
				'frozen',
				'resource',
				'runtime',
				'budget',
				'limits',
				'classification',
				'fit',
				'selection',
				'policy',
				'exploration',
			].includes(key),
		) &&
		value.protocol === 'e1' &&
		isString(value.key) &&
		value.think === false &&
		(value.arm === 'records' || value.arm === 'aggregate') &&
		['filing', 'development', 'evaluation'].includes(String(value.phase)) &&
		isRefitFile(value.frozen) &&
		isRefitFile(value.resource) &&
		isRefitFile(value.runtime) &&
		isMatrixBudget(value.budget) &&
		isSustainedLimits(value.limits) &&
		(value.exploration === undefined ||
			(isRefitFile(value.policy) && isSustainedExploration(value.exploration))) &&
		['classification', 'fit', 'selection', 'policy'].every(
			(key) => value[key] === undefined || isRefitFile(value[key]),
		)
	)
}

/** Checks the sealed runtime classification manifest. */
export function isSustainedClassification(value: unknown): value is SustainedClassification {
	return (
		isRecord(value) &&
		value.protocol === 'e1' &&
		isRefitFile(value.runtime) &&
		isRefitFile(value.frozen) &&
		isRefitFile(value.cache) &&
		arrayOf(isRefitFile)(value.files) &&
		typeof value.accepted === 'boolean' &&
		arrayOf(isString)(value.failures)
	)
}

/** Checks a retained development attempt. */
export function isSustainedAttempt(value: unknown): value is SustainedAttempt {
	return (
		isRecord(value) &&
		isRefitFile(value.execution) &&
		isString(value.run) &&
		arrayOf(isRefitFile)(value.files) &&
		typeof value.accepted === 'boolean' &&
		arrayOf(isString)(value.failures) &&
		isCount(value.served) &&
		isCount(value.exposed)
	)
}

/** Checks a ranked candidate without quality scores. */
export function isSustainedCandidate(value: unknown): value is SustainedCandidate {
	return (
		isRecord(value) &&
		isString(value.key) &&
		isRefitFile(value.frozen) &&
		isRefitFile(value.resource) &&
		(value.exploration === undefined ||
			(isRefitFile(value.policy) && isSustainedExploration(value.exploration))) &&
		['pilot', 'classification', 'fit', 'preparation', 'refusal', 'policy'].every(
			(key) => value[key] === undefined || isRefitFile(value[key]),
		) &&
		arrayOf(isSustainedAttempt)(value.attempts) &&
		typeof value.accepted === 'boolean' &&
		arrayOf(isString)(value.failures)
	)
}

/** Checks the frozen feasible choice or explicit inconclusive decision. */
export function isSustainedSelection(value: unknown): value is SustainedSelection {
	return (
		isRecord(value) &&
		value.protocol === 'e1' &&
		(value.policy === undefined || isRefitFile(value.policy)) &&
		isRefitFile(value.development) &&
		isRefitFile(value.evaluation) &&
		arrayOf(isSustainedCandidate)(value.candidates) &&
		(value.chosen === undefined || isString(value.chosen)) &&
		isCount(value.seed) &&
		Array.isArray(value.order) &&
		value.order.length === 2 &&
		value.order.every((one) => one === 'records' || one === 'aggregate') &&
		new Set(value.order).size === 2 &&
		(value.limits === undefined || isSustainedLimits(value.limits)) &&
		typeof value.accepted === 'boolean' &&
		arrayOf(isString)(value.failures)
	)
}

/** Checks one actual tool outcome. */
export function isSustainedReceipt(value: unknown): value is SustainedReceipt {
	return (
		isRecord(value) &&
		[value.goal, value.call, value.tool, value.content].every(isString) &&
		isRecord(value.arguments) &&
		typeof value.success === 'boolean' &&
		isCount(value.after) &&
		(value.version === undefined || isCount(value.version))
	)
}

/** Checks normalized actual conversation evidence. */
export function isSustainedMessage(value: unknown): value is SustainedMessage {
	return (
		isRecord(value) &&
		[value.id, value.role, value.content].every(isString) &&
		typeof value.request === 'boolean' &&
		(value.seed === undefined || isCount(value.seed)) &&
		(value.goal === undefined || isString(value.goal))
	)
}

/** Checks the independent selected/omitted history observations. */
export function isSustainedObservation(value: unknown): value is SustainedObservation {
	return (
		isRecord(value) &&
		isString(value.goal) &&
		isCount(value.shift) &&
		isCount(value.after) &&
		typeof value.checkpoint === 'boolean' &&
		['conversation', 'sources', 'products', 'selected', 'omitted'].every((key) =>
			arrayOf(isString)(value[key]),
		) &&
		isRecord(value.history) &&
		[
			value.history.arrivals,
			value.history.requests,
			value.history.products,
			value.history.tools,
			value.history.total,
		].every(isCount) &&
		typeof value.exposed === 'boolean' &&
		typeof value.complete === 'boolean'
	)
}
