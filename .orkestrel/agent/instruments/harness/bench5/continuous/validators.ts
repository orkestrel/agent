import type { ContinuousKeys, ContinuousPacket } from './audit/types.js'
import type {
	ContinuousArm,
	ContinuousExecution,
	ContinuousFailurePolicy,
	ContinuousManifest,
	ContinuousObservation,
	ContinuousRow,
	ContinuousSection,
	ContinuousSelection,
	ContinuousStatus,
	ContinuousTurn,
} from './types.js'
import { arrayOf, attempt, isFiniteNumber, isRecord, isString } from '@orkestrel/contract'
import { isMatrixBudget } from '../matrix/validators.js'
import { isRefitFile } from '../refit/validators.js'
import { isSustainedObservation } from '../sustained/validators.js'
import { CONTINUOUS_ARMS, CONTINUOUS_FAILURE_POLICIES } from './constants.js'

function isCount(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isDigest(value: unknown): value is string {
	return isString(value) && /^(sha256:)?[a-f0-9]{64}$/.test(value)
}

/** Checks an arm name. */
export function isContinuousArm(value: unknown): value is ContinuousArm {
	return CONTINUOUS_ARMS.some((arm) => arm === value)
}

/** Checks a trajectory status. */
export function isContinuousStatus(value: unknown): value is ContinuousStatus {
	return [
		'started',
		'calibrated',
		'running',
		'complete',
		'overflow',
		'limit',
		'failed',
		'fault',
	].includes(String(value))
}

/** Checks a policy for a goal with no product. */
export function isContinuousFailurePolicy(value: unknown): value is ContinuousFailurePolicy {
	return CONTINUOUS_FAILURE_POLICIES.some((policy) => policy === value)
}

/** Checks a frozen manifest's complete shape; custody follows in `readContinuousManifest`. */
export function isContinuousManifest(value: unknown): value is ContinuousManifest {
	const result = attempt(
		() =>
			isRecord(value) &&
			value.protocol === 'c1' &&
			isString(value.key) &&
			typeof value.think === 'boolean' &&
			['decision', 'summarizer', 'judge'].every(
				(role) =>
					isRecord(value[role]) && isString(value[role].model) && isDigest(value[role].digest),
			) &&
			isRecord(value.sampler) &&
			Object.values(value.sampler).every(isFiniteNumber) &&
			isMatrixBudget(value.budget) &&
			isRecord(value.compaction) &&
			isCount(value.compaction.predict) &&
			value.compaction.predict > 0 &&
			isCount(value.compaction.sections) &&
			value.compaction.sections > 0 &&
			isCount(value.compaction.keep) &&
			isCount(value.retry) &&
			isCount(value.timeout) &&
			value.timeout > 0 &&
			isRecord(value.limits) &&
			[value.limits.calls, value.limits.tokens, value.limits.wall, value.limits.goals].every(
				(one) => isCount(one) && one > 0,
			) &&
			['workload', 'runtime', 'oracle', 'agent', 'ollama', 'tags'].every((key) =>
				isRefitFile(value[key]),
			) &&
			isRecord(value.daemon) &&
			isString(value.daemon.url) &&
			isString(value.daemon.version) &&
			arrayOf(isContinuousArm)(value.arms) &&
			value.arms.length > 0 &&
			new Set(value.arms).size === value.arms.length &&
			isCount(value.blind) &&
			(value.failure === undefined || isContinuousFailurePolicy(value.failure)),
	)
	return result.success && result.value
}

/** Checks one trajectory's execution binding. */
export function isContinuousExecution(value: unknown): value is ContinuousExecution {
	return (
		isRecord(value) &&
		value.protocol === 'c1' &&
		isRefitFile(value.manifest) &&
		isContinuousArm(value.arm) &&
		isRefitFile(value.runtime)
	)
}

/** Checks one served row. */
export function isContinuousRow(value: unknown): value is ContinuousRow {
	const result = attempt(
		() =>
			isRecord(value) &&
			isString(value.goal) &&
			isContinuousArm(value.arm) &&
			typeof value.success === 'boolean' &&
			isString(value.reply) &&
			typeof value.partial === 'boolean' &&
			(value.error === undefined || isString(value.error)) &&
			isCount(value.passes) &&
			['wall', 'flush', 'first', 'last', 'prompt', 'scale', 'folds', 'merges', 'sections', 'recap'].every(
				(key) => isFiniteNumber(value[key]),
			) &&
			(value.entry === undefined || isFiniteNumber(value.entry)) &&
			typeof value.overflow === 'boolean' &&
			arrayOf(isString)(value.failures) &&
			isRecord(value.recalls) &&
			isRecord(value.lookups) &&
			isRecord(value.questions) &&
			isRecord(value.briefing) &&
			isFiniteNumber(value.briefing.tokens) &&
			isString(value.briefing.digest) &&
			isString(value.tail),
	)
	return result.success && result.value
}

/** Checks one selection record. */
export function isContinuousSelection(value: unknown): value is ContinuousSelection {
	const result = attempt(
		() =>
			isRecord(value) &&
			isString(value.goal) &&
			isCount(value.pass) &&
			isCount(value.sequence) &&
			isString(value.briefing) &&
			isString(value.digest) &&
			(value.scale === undefined || isFiniteNumber(value.scale)) &&
			isRecord(value.instructions) &&
			Object.values(value.instructions).every(isString) &&
			Array.isArray(value.tail) &&
			value.tail.every(
				(entry: unknown) =>
					isRecord(entry) &&
					(entry.index === undefined || isCount(entry.index)) &&
					isString(entry.role) &&
					isString(entry.content),
			),
	)
	return result.success && result.value
}

/** Checks one observation, including its folded partition. */
export function isContinuousObservation(value: unknown): value is ContinuousObservation {
	return isSustainedObservation(value) && isRecord(value) && arrayOf(isString)(value.folded)
}

/** Checks one compaction event. */
export function isContinuousSection(value: unknown): value is ContinuousSection {
	return (
		isRecord(value) &&
		isString(value.goal) &&
		(value.event === 'compact' || value.event === 'collapse') &&
		isString(value.id) &&
		isString(value.summary) &&
		arrayOf(isString)(value.messages) &&
		isCount(value.estimate)
	)
}

/** Checks the private keys of a blind packet. */
export function isContinuousKeys(value: unknown): value is ContinuousKeys {
	const result = attempt(
		() =>
			isRecord(value) &&
			value.protocol === 'c1' &&
			['manifest', 'workload', 'runtime', 'oracle', 'packet'].every((key) =>
				isRefitFile(value[key]),
			) &&
			isCount(value.seed) &&
			Array.isArray(value.keys) &&
			value.keys.every(
				(key: unknown) =>
					isRecord(key) &&
					[key.id, key.batch, key.run, key.goal].every(isString) &&
					isContinuousArm(key.arm) &&
					arrayOf(isRefitFile)(key.files) &&
					(key.control === undefined ||
						(isRecord(key.control) &&
							isString(key.control.id) &&
							['stale', 'fabricated', 'ambiguous'].includes(String(key.control.verdict)) &&
							isString(key.control.reason))),
			),
	)
	return result.success && result.value
}

/** Checks the public packet's envelope; each item's shape is the adjudication reader's to refuse. */
export function isContinuousPacket(value: unknown): value is ContinuousPacket {
	return (
		isRecord(value) &&
		value.protocol === 'c1' &&
		Array.isArray(value.items) &&
		value.items.every(
			(item: unknown) =>
				isRecord(item) &&
				isString(item.id) &&
				isString(item.product) &&
				isRecord(item.rubric) &&
				Array.isArray(item.rubric.atoms) &&
				Array.isArray(item.evidence),
		)
	)
}

/** Checks one turn estimate. */
export function isContinuousTurn(value: unknown): value is ContinuousTurn {
	return (
		isRecord(value) &&
		isCount(value.turn) &&
		(value.goal === undefined || isString(value.goal)) &&
		(value.estimate === undefined || isFiniteNumber(value.estimate))
	)
}
