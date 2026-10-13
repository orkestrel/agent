import type {
	AggregateSource,
	AggregateState,
	AggregateComponent,
	AggregateObservation,
	AggregateBundle,
} from '../types.js'
import {
	arrayOf,
	attempt,
	isRecord,
	isFiniteNumber,
	isNonNegativeInteger,
	isString,
	objectOf,
	recordOf,
	whereOf,
} from '@orkestrel/contract'
import { isMessageRole, isUsage } from '../helpers.js'

/** Checks one native support request and its exact optional focus. */
export function isAggregateComponent(value: unknown): value is AggregateComponent {
	const result = attempt(
		() =>
			isRecord(value) &&
			isString(value.id) &&
			isString(value.state) &&
			isRecord(value.question) &&
			value.question.form === 'noul' &&
			isString(value.question.instructions) &&
			isRecord(value.question.criteria) &&
			isString(value.question.criteria.true) &&
			isString(value.question.criteria.false) &&
			(value.focus === undefined ||
				(isRecord(value.focus) &&
					isNonNegativeInteger(value.focus.start) &&
					isNonNegativeInteger(value.focus.end) &&
					isString(value.focus.text))),
	)
	return result.success && result.value
}

/** Checks an attempted component without treating absent scores as zero. */
export function isAggregateObservation(value: unknown): value is AggregateObservation {
	const result = attempt(
		() =>
			isRecord(value) &&
			isAggregateComponent(value) &&
			isString(value.key) &&
			isFiniteNumber(value.wall) &&
			value.wall >= 0 &&
			typeof value.cached === 'boolean' &&
			(value.sent === undefined || typeof value.sent === 'boolean') &&
			(value.score === undefined ||
				(isFiniteNumber(value.score) && value.score >= 0 && value.score <= 1)) &&
			(value.error === undefined || isString(value.error)) &&
			(value.usage === undefined || isUsage(value.usage)) &&
			(value.refusal === undefined || isRecord(value.refusal)),
	)
	return result.success && result.value
}

/** Checks retained bundle structure; reduction independently checks exhaustive membership. */
export function isAggregateBundle(value: unknown): value is AggregateBundle {
	const result = attempt(
		() =>
			isRecord(value) &&
			isString(value.revision) &&
			isString(value.candidate) &&
			isString(value.context) &&
			isString(value.model) &&
			isFiniteNumber(value.wall) &&
			value.wall >= 0 &&
			(value.error === undefined || isString(value.error)) &&
			arrayOf(isAggregateSource)(value.sources) &&
			arrayOf(isAggregateObservation)(value.components),
	)
	return result.success && result.value
}

/**
 * Checks a recorded source projection line without coercion.
 * @param value - The candidate line
 * @returns True if the line carries source identity, role, text, and day; false otherwise
 */
export function isAggregateSource(value: unknown): value is AggregateSource {
	return (
		isRecord(value) &&
		objectOf({
			id: isString,
			sentence: isNonNegativeInteger,
			role: isMessageRole,
			text: isString,
			day: isString,
		})(value)
	)
}

/**
 * Checks an exact maintained-state binding without discarding source multiplicity.
 * @param value - The candidate binding
 * @returns True if the binding carries a version, goal, read point, and full source projection; false otherwise
 */
export function isAggregateState(value: unknown): value is AggregateState {
	return recordOf({
		version: whereOf(isNonNegativeInteger, (version) => version > 0),
		goal: isString,
		point: isNonNegativeInteger,
		sources: arrayOf(isAggregateSource),
	})(value)
}
