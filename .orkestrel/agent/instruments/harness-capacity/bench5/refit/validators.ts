import type { Message } from '../../vendor/agent-0.0.30-trimmed/index.js'
import type { TokenUsage } from '@orkestrel/budget'
import type {
	RefitAttempt,
	RefitControl,
	RefitPreparation,
	RefitContext,
	RefitCorpus,
	RefitEvidence,
	RefitFile,
	RefitGeneration,
	RefitItem,
	RefitLabels,
	RefitSource,
	RefitVerdict,
} from './types.js'
import { arrayOf, attempt, isFiniteNumber, isRecord, isString } from '@orkestrel/contract'
import { isCacheRow, isMessageRole, isSummaryRow, isUsage } from '../helpers.js'
import { isAggregateBundle, isAggregateComponent } from '../aggregates/validators.js'
import { isMatrixFreeze } from '../matrix/validators.js'

/** Checks a serialized projected source, including seed grouping. */
export function isRefitSource(value: unknown): value is RefitSource {
	const result = attempt(
		() =>
			isRecord(value) &&
			isString(value.id) &&
			Number.isInteger(value.seed) &&
			isFiniteNumber(value.seed) &&
			value.seed >= 0 &&
			Number.isInteger(value.sentence) &&
			isFiniteNumber(value.sentence) &&
			value.sentence >= 0 &&
			isMessageRole(value.role) &&
			isString(value.text) &&
			isString(value.day),
	)
	return result.success && result.value
}

/** Checks a file custody record. */
export function isRefitFile(value: unknown): value is RefitFile {
	const result = attempt(
		() =>
			isRecord(value) &&
			isString(value.path) &&
			isString(value.hash) &&
			/^[a-f0-9]{64}$/.test(value.hash),
	)
	return result.success && result.value
}

/** Checks a plain prompt or request message. */
export function isRefitMessage(value: unknown): value is Message {
	const result = attempt(
		() =>
			isRecord(value) && isString(value.id) && isMessageRole(value.role) && isString(value.content),
	)
	return result.success && result.value
}

/** Checks a complete frozen checker context. */
export function isRefitContext(value: unknown): value is RefitContext {
	const result = attempt(
		() =>
			isRecord(value) &&
			isString(value.id) &&
			isString(value.goal) &&
			isFiniteNumber(value.after) &&
			isRecord(value.topic) &&
			isString(value.topic.key) &&
			isString(value.topic.title) &&
			typeof value.topic.owner === 'boolean' &&
			isString(value.date) &&
			arrayOf(isRefitSource)(value.sources) &&
			arrayOf(isString)(value.owners) &&
			arrayOf(isString)(value.listed) &&
			arrayOf(isString)(value.stale) &&
			arrayOf(isString)(value.members) &&
			arrayOf(isRefitMessage)(value.prompt),
	)
	return result.success && result.value
}

/** Checks a frozen development corpus. */
export function isRefitCorpus(value: unknown): value is RefitCorpus {
	const result = attempt(
		() =>
			isRecord(value) &&
			value.mode === 'cold-build seed-only development' &&
			(value.sustained === undefined ||
				(isRecord(value.sustained) &&
					isRefitFile(value.sustained.runtime) &&
					isRefitFile(value.sustained.classification))) &&
			arrayOf(isRefitFile)(value.files) &&
			arrayOf(isRefitContext)(value.contexts) &&
			Array.isArray(value.points) &&
			value.points.every(
				(point: unknown) =>
					isRecord(point) &&
					isString(point.goal) &&
					isRefitMessage(point.request) &&
					'input' in point &&
					'projection' in point,
			),
	)
	return result.success && result.value
}

/** Checks an attempted generation without requiring successful evidence. */
export function isRefitAttempt(value: unknown): value is RefitAttempt {
	const result = attempt(
		() =>
			isRecord(value) &&
			isString(value.id) &&
			isString(value.context) &&
			isFiniteNumber(value.ordinal) &&
			arrayOf(isRefitMessage)(value.prompt) &&
			isString(value.key) &&
			(value.sent === undefined || typeof value.sent === 'boolean') &&
			isFiniteNumber(value.wall) &&
			(value.duration === undefined || isFiniteNumber(value.duration)) &&
			(value.raw === undefined || isString(value.raw)) &&
			(value.prose === undefined || isString(value.prose)) &&
			(value.usage === undefined || isUsage(value.usage)) &&
			(value.cached === undefined || typeof value.cached === 'boolean') &&
			(value.state === undefined || isString(value.state)) &&
			(value.error === undefined || isString(value.error)) &&
			(value.failures === undefined ||
				(Array.isArray(value.failures) &&
					value.failures.every(
						(failure: unknown) =>
							isRecord(failure) &&
							['empty', 'id', 'number', 'name', 'stale', 'agree'].includes(String(failure.kind)) &&
							isString(failure.token),
					))) &&
			(value.judge === undefined || isAggregateBundle(value.judge)),
	)
	return result.success && result.value
}

/** Checks immutable fitting input references.
 * @param value - Parsed preparation
 * @returns True if each required artifact is identified; false otherwise
 */
export function isRefitPreparation(value: unknown): value is RefitPreparation {
	const result = attempt(
		() =>
			isRecord(value) &&
			isRefitFile(value.manifest) &&
			isRefitFile(value.attempts) &&
			isRefitFile(value.packet) &&
			isRefitFile(value.corpus) &&
			isRefitFile(value.labels),
	)
	return result.success && result.value
}

/** Checks the blinded packet shape. */
export function isRefitItem(value: unknown): value is RefitItem {
	const result = attempt(
		() =>
			isRecord(value) &&
			isString(value.id) &&
			isString(value.state) &&
			isString(value.candidate) &&
			isString(value.revision) &&
			arrayOf(isAggregateComponent)(value.components) &&
			arrayOf(isRefitSource)(value.sources) &&
			isRecord(value.question) &&
			value.question.form === 'noul' &&
			isString(value.question.instructions) &&
			isRecord(value.question.criteria) &&
			isString(value.question.criteria.true) &&
			isString(value.question.criteria.false),
	)
	return result.success && result.value
}

/** Checks a completed generation manifest. */
export function isRefitGeneration(value: unknown): value is RefitGeneration {
	const result = attempt(
		() =>
			isRecord(value) &&
			(value.matrix === undefined || isMatrixFreeze(value.matrix)) &&
			(value.sustained === undefined ||
				(isRecord(value.sustained) &&
					isRefitFile(value.sustained.runtime) &&
					isRefitFile(value.sustained.classification))) &&
			isString(value.corpus) &&
			isString(value.attempts) &&
			isString(value.packet) &&
			isRefitFile(value.evidence) &&
			isRefitFile(value.controls) &&
			isString(value.model) &&
			typeof value.complete === 'boolean' &&
			arrayOf(isString)(value.errors) &&
			arrayOf(isRefitFile)(value.files) &&
			isRecord(value.lineage) &&
			arrayOf(isRefitFile)(value.lineage.before) &&
			arrayOf(isRefitFile)(value.lineage.after) &&
			isRecord(value.settings) &&
			isFiniteNumber(value.settings.allowance) &&
			isFiniteNumber(value.settings.retry) &&
			isFiniteNumber(value.settings.predict),
	)
	return result.success && result.value
}

/** Checks an independent semantic verdict. */
export function isRefitVerdict(value: unknown): value is RefitVerdict {
	return (
		value === 'supported' ||
		value === 'unsupported' ||
		value === 'contradicted' ||
		value === 'ambiguous'
	)
}

/** Checks root adjudication and proposition evidence. */
export function isRefitLabels(value: unknown): value is RefitLabels {
	const result = attempt(
		() =>
			isRecord(value) &&
			value.authority === 'root-adjudicated' &&
			isString(value.corpus) &&
			isString(value.attempts) &&
			isString(value.packet) &&
			isString(value.manifest) &&
			Array.isArray(value.labels) &&
			value.labels.every(
				(label: unknown) =>
					isRecord(label) &&
					isString(label.id) &&
					isString(label.item) &&
					isRefitVerdict(label.verdict) &&
					Array.isArray(label.propositions) &&
					label.propositions.length > 0 &&
					label.propositions.every(
						(proposition: unknown) =>
							isRecord(proposition) &&
							isString(proposition.text) &&
							isRefitVerdict(proposition.verdict) &&
							arrayOf(isString)(proposition.evidence) &&
							proposition.evidence.length > 0,
					),
			),
	)
	return result.success && result.value
}

/** Checks retained observations while preserving the original cache row contents.
 * @param value - Parsed evidence
 * @returns True if both cache populations contain identified rows; false otherwise
 */
export function isRefitEvidence(value: unknown): value is RefitEvidence {
	const result = attempt(
		() =>
			isRecord(value) &&
			Array.isArray(value.summary) &&
			value.summary.every(
				(entry: unknown) => isRecord(entry) && isString(entry.path) && isSummaryRow(entry.row),
			) &&
			Array.isArray(value.judge) &&
			value.judge.every(
				(entry: unknown) => isRecord(entry) && isString(entry.path) && isCacheRow(entry.row),
			),
	)
	return result.success && result.value
}

/** Checks complete finite usage evidence rather than accepting absent or malformed costs. */
export function isRefitUsage(value: unknown): value is TokenUsage {
	const result = attempt(
		() =>
			isUsage(value) &&
			[value.prompt, value.completion, value.total].every(
				(count) => Number.isFinite(count) && count >= 0,
			) &&
			value.total === value.prompt + value.completion,
	)
	return result.success && result.value
}

/** Checks archived whole-label transfer and separately evaluated support. */
export function isRefitControl(value: unknown): value is RefitControl {
	const result = attempt(
		() =>
			isRecord(value) &&
			isString(value.id) &&
			isString(value.candidate) &&
			arrayOf(isRefitSource)(value.sources) &&
			isRefitVerdict(value.verdict) &&
			typeof value.lexical === 'boolean' &&
			isRecord(value.original) &&
			isString(value.original.item) &&
			isString(value.original.mapping) &&
			isString(value.original.build) &&
			(value.support === undefined || isAggregateBundle(value.support)),
	)
	return result.success && result.value
}
