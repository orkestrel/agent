import type {
	MatrixAttempt,
	MatrixBudget,
	MatrixExecution,
	MatrixDevelopment,
	MatrixFreeze,
	MatrixIdentity,
	MatrixRequest,
	MatrixResource,
	MatrixRole,
	MatrixRow,
	MatrixDeployment,
	MatrixSnapshot,
} from './types.js'
import type { SelectionRecord } from '../types.js'
import { arrayOf, attempt, isFiniteNumber, isRecord, isString } from '@orkestrel/contract'
import { MODELS } from '../constants.js'
import { isRefitFile } from '../refit/validators.js'
import { isAggregateState } from '../aggregates/validators.js'

/** Checks an l6 cell without accepting archived identities. */
export function isMatrixIdentity(value: unknown): value is MatrixIdentity {
	const result = attempt(
		() =>
			isRecord(value) &&
			value.protocol === 'l6' &&
			isString(value.key) &&
			Object.hasOwn(MODELS, value.key) &&
			typeof value.think === 'boolean' &&
			(value.arm === 'records' || value.arm === 'aggregate' || value.arm === 'full') &&
			isFiniteNumber(value.copy) &&
			Number.isInteger(value.copy) &&
			value.copy >= 1 &&
			value.copy <= 8,
	)
	return result.success && result.value
}

/** Checks finite physical and planner budgets. */
export function isMatrixBudget(value: unknown): value is MatrixBudget {
	const result = attempt(
		() =>
			isRecord(value) &&
			[value.reserve, value.window, value.predict, value.ceiling].every(
				(entry) => isFiniteNumber(entry) && Number.isSafeInteger(entry) && entry >= 0,
			) &&
			isFiniteNumber(value.reserve) &&
			value.reserve > 0 &&
			isFiniteNumber(value.ceiling) &&
			value.ceiling > 0 &&
			isFiniteNumber(value.window) &&
			value.ceiling <= value.window &&
			isFiniteNumber(value.window) &&
			value.window > value.reserve,
	)
	return result.success && result.value
}

/** Checks a model role with an immutable actual model digest. */
export function isMatrixRole(value: unknown): value is MatrixRole {
	const result = attempt(
		() =>
			isRecord(value) &&
			isString(value.model) &&
			isString(value.digest) &&
			/^(sha256:)?[a-f0-9]{64}$/.test(value.digest) &&
			typeof value.think === 'boolean' &&
			isRecord(value.sampler) &&
			Object.values(value.sampler).every(isFiniteNumber),
	)
	return result.success && result.value
}

/** Checks frozen role and source custody before its semantic validation. */
export function isMatrixFreeze(value: unknown): value is MatrixFreeze {
	const result = attempt(
		() =>
			isRecord(value) &&
			value.protocol === 'l6' &&
			isString(value.key) &&
			Object.hasOwn(MODELS, value.key) &&
			typeof value.think === 'boolean' &&
			isMatrixRole(value.decision) &&
			isMatrixRole(value.summarizer) &&
			isMatrixRole(value.judge) &&
			arrayOf(isRefitFile)(value.files) &&
			isRefitFile(value.seed) &&
			isRefitFile(value.settings) &&
			isRefitFile(value.tags) &&
			isRefitFile(value.deployment) &&
			isRefitFile(value.census) &&
			isRecord(value.configuration) &&
			isFiniteNumber(value.configuration.allowance) &&
			value.configuration.allowance > 0 &&
			isFiniteNumber(value.configuration.predict) &&
			value.configuration.predict > 0 &&
			isFiniteNumber(value.configuration.retry) &&
			value.configuration.retry >= 0,
	)
	return result.success && result.value
}

/** Checks execution custody without accepting an archive as a matrix cell. */
export function isMatrixExecution(value: unknown): value is MatrixExecution {
	const result = attempt(
		() =>
			isMatrixIdentity(value) &&
			isRecord(value) &&
			['resource', 'full', 'pilot', 'evaluation', 'development'].includes(String(value.phase)) &&
			(value.phase === 'development'
				? value.copy === 1 &&
					isRefitFile(value.development) &&
					['resource', 'full', 'fit', 'pilot'].every((key) => value[key] === undefined)
				: value.development === undefined) &&
			isRefitFile(value.frozen) &&
			isMatrixBudget(value.budget) &&
			['resource', 'full', 'fit', 'pilot'].every(
				(key) => value[key] === undefined || isRefitFile(value[key]),
			),
	)
	return result.success && result.value
}

/** Checks the fixed development policy and refuses qualification claims. */
export function isMatrixDevelopment(value: unknown): value is MatrixDevelopment {
	const result = attempt(
		() =>
			isRecord(value) &&
			value.phase === 'development' &&
			value.separated === undefined &&
			value.accepted === undefined &&
			[
				'frozen',
				'calibration',
				'diagnosis',
				'labels',
				'packet',
				'generation',
				'resource',
				'full',
			].every((key) => isRefitFile(value[key])) &&
			isFiniteNumber(value.agree) &&
			value.agree > 0.5 &&
			value.agree <= 1 &&
			value.change === 0.56 &&
			value.selection === 'highest-grid-majority-occurrences-and-identities' &&
			value.continuation === 'failed-goal-after-xml-function-parameter-error' &&
			(value.withhold === undefined || typeof value.withhold === 'boolean') &&
			value.limitation === 'seed-candidates-do-not-certify-diverged-history' &&
			isMatrixBudget(value.paired) &&
			isMatrixBudget(value.expanded),
	)
	return result.success && result.value
}

/** Checks the complete reserve ladder record. */
export function isMatrixAttempt(value: unknown): value is MatrixAttempt {
	const result = attempt(
		() =>
			isRecord(value) &&
			isRefitFile(value.execution) &&
			isString(value.run) &&
			isMatrixBudget(value.budget) &&
			typeof value.accepted === 'boolean' &&
			typeof value.resource === 'boolean' &&
			arrayOf(isString)(value.failures) &&
			arrayOf(isRefitFile)(value.files),
	)
	return result.success && result.value
}

/** Checks the complete reserve ladder record. */
export function isMatrixResource(value: unknown): value is MatrixResource {
	const result = attempt(
		() =>
			isRecord(value) &&
			value.protocol === 'l6' &&
			isRefitFile(value.frozen) &&
			typeof value.accepted === 'boolean' &&
			(value.budget === undefined || isMatrixBudget(value.budget)) &&
			arrayOf(isMatrixAttempt)(value.attempts),
	)
	return result.success && result.value
}

/** Checks a retained actual-request reading. */
export function isMatrixRequest(value: unknown): value is MatrixRequest {
	const result = attempt(
		() =>
			isRecord(value) &&
			isFiniteNumber(value.sequence) &&
			Number.isSafeInteger(value.sequence) &&
			value.sequence > 0 &&
			isFiniteNumber(value.started) &&
			isFiniteNumber(value.finished) &&
			value.finished >= value.started &&
			(value.abort === undefined ||
				((value.abort === 'wall' || value.abort === 'caller') &&
					value.sent === true &&
					isString(value.error) &&
					value.buffered === undefined &&
					value.response === undefined &&
					value.capacity === undefined)) &&
			(value.buffered === undefined ||
				(isFiniteNumber(value.buffered) &&
					value.buffered >= value.started &&
					value.buffered <= value.finished)) &&
			(value.capacity === undefined ||
				(isRecord(value.capacity) &&
					isRefitFile(value.capacity.evidence) &&
					isFiniteNumber(value.capacity.wall) &&
					value.capacity.wall >= 0 &&
					(value.capacity.window === undefined ||
						(isFiniteNumber(value.capacity.window) &&
							Number.isSafeInteger(value.capacity.window) &&
							value.capacity.window > 0)))) &&
			['agent', 'judge', 'summarizer', 'flush'].includes(String(value.role)) &&
			typeof value.sent === 'boolean' &&
			'request' in value &&
			isFiniteNumber(value.wall) &&
			(value.goal === undefined || isString(value.goal)) &&
			(value.response === undefined || isString(value.response)) &&
			(value.reason === undefined || isString(value.reason)) &&
			(value.error === undefined || isString(value.error)) &&
			['status', 'turn', 'estimate', 'prompt', 'completion'].every(
				(key) => value[key] === undefined || isFiniteNumber(value[key]),
			) &&
			Array.isArray(value.failures) &&
			value.failures.every((entry) =>
				[
					'usage',
					'length',
					'truncation',
					'capacity',
					'completion',
					'request',
					'transport',
					'configuration',
					'observation',
				].includes(String(entry)),
			),
	)
	return result.success && result.value
}

/** Checks the goal outcome fields consumed by comparison. */
export function isMatrixRow(value: unknown): value is MatrixRow {
	const result = attempt(
		() =>
			isRecord(value) &&
			isString(value.goal) &&
			typeof value.success === 'boolean' &&
			isString(value.reply) &&
			(value.partial === undefined || typeof value.partial === 'boolean') &&
			(value.error === undefined || isString(value.error)) &&
			isFiniteNumber(value.sole) &&
			['wall', 'stage', 'flush', 'summary', 'scale'].every((key) => isFiniteNumber(value[key])) &&
			isString(value.tail) &&
			arrayOf(isString)(value.rendered) &&
			Array.isArray(value.resource) &&
			value.resource.every((entry) =>
				[
					'usage',
					'length',
					'truncation',
					'capacity',
					'completion',
					'request',
					'transport',
					'configuration',
					'observation',
				].includes(String(entry)),
			) &&
			isRecord(value.briefing) &&
			isString(value.briefing.digest) &&
			['tokens', 'facts', 'stale'].every(
				(key) => isRecord(value.briefing) && isFiniteNumber(value.briefing[key]),
			),
	)
	return result.success && result.value
}

/** Checks the declared, hash-bound deployment input without reading host environment. */
export function isMatrixDeployment(value: unknown): value is MatrixDeployment {
	const result = attempt(
		() =>
			isRecord(value) &&
			isRefitFile(value.receipt) &&
			isRefitFile(value.executable) &&
			isRefitFile(value.runner) &&
			isString(value.version) &&
			value.version.length > 0 &&
			value.exclusive === true &&
			isRecord(value.environment) &&
			Object.values(value.environment).every(isString) &&
			arrayOf(isRefitFile)(value.controls) &&
			value.controls.length > 0 &&
			Array.isArray(value.models) &&
			value.models.length > 0 &&
			value.models.every(
				(model: unknown) =>
					isRecord(model) &&
					isString(model.model) &&
					isString(model.digest) &&
					/^(sha256:)?[a-f0-9]{64}$/.test(model.digest) &&
					model.backend === 'llamacpp' &&
					isFiniteNumber(model.context) &&
					Number.isSafeInteger(model.context) &&
					model.context > 0 &&
					isString(model.field) &&
					model.field.endsWith('.context_length') &&
					isRefitFile(model.metadata),
			),
	)
	return result.success && result.value
}

/** Checks snapshot transport custody; semantic association is checked against the request. */
export function isMatrixSnapshot(value: unknown): value is MatrixSnapshot {
	const result = attempt(
		() =>
			isRecord(value) &&
			value.role === 'agent' &&
			isFiniteNumber(value.sequence) &&
			Number.isSafeInteger(value.sequence) &&
			value.sequence > 0 &&
			isString(value.model) &&
			isString(value.request) &&
			isString(value.raw) &&
			isString(value.hash) &&
			isFiniteNumber(value.buffered) &&
			isFiniteNumber(value.started) &&
			isFiniteNumber(value.finished) &&
			value.buffered <= value.started &&
			value.started <= value.finished &&
			(value.status === undefined || isFiniteNumber(value.status)) &&
			(value.error === undefined || isString(value.error)),
	)
	return result.success && result.value
}

/** Checks exact selection and maintained binding custody. */
export function isMatrixSelection(value: unknown): value is SelectionRecord {
	const result = attempt(
		() =>
			isRecord(value) &&
			isString(value.goal) &&
			isFiniteNumber(value.pass) &&
			isFiniteNumber(value.sequence) &&
			isString(value.briefing) &&
			isString(value.digest) &&
			(value.scale === undefined || isFiniteNumber(value.scale)) &&
			isRecord(value.instructions) &&
			Object.values(value.instructions).every(isString) &&
			Array.isArray(value.tail) &&
			value.tail.every(
				(entry: unknown) =>
					isRecord(entry) &&
					(entry.index === undefined || isFiniteNumber(entry.index)) &&
					isString(entry.role) &&
					isString(entry.content),
			) &&
			Array.isArray(value.aggregates) &&
			value.aggregates.every(
				(entry: unknown) =>
					isRecord(entry) &&
					isString(entry.topic) &&
					isString(entry.prose) &&
					isAggregateState(entry.state),
			),
	)
	return result.success && result.value
}
