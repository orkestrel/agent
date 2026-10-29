import type { JudgeResult } from './types.js'
import {
	INTRINSICS,
	holds,
	isObject,
	isFunction,
	isNumber,
	isString,
	arrayOf,
} from '@orkestrel/contract'

/**
 * Reports a judge call cancelled by the caller's signal or its deadline, carrying the
 * {@link JudgeResult} merged from the calls that completed before the cancel and the
 * machine-readable `code` `'ABORT'`.
 *
 * @remarks
 * `partial` keeps the answers and the usage of every completed call, so usage reported by
 * completed calls is retained; a cancel before the first call carries an empty partial. `cause` holds the failure the
 * cancel superseded when a throw raced the abort, and is undefined when the cancel was the only
 * failure.
 */
export class JudgeAbortError extends Error {
	/** Names the machine-readable condition — `'ABORT'`: a judge call cancelled mid-flight. */
	readonly code = 'ABORT' as const
	readonly partial: JudgeResult

	constructor(partial: JudgeResult, options?: ErrorOptions) {
		super('judge call aborted', options)
		this.name = 'JudgeAbortError'
		INTRINSICS.define(this, Symbol.for('@orkestrel/agent.JudgeAbortError'), { value: this })
		this.partial = partial
	}
}

/**
 * Narrows a caught value to a {@link JudgeAbortError} through its identity brand and declared members, so a `catch` can
 * recover its `partial` result.
 *
 * @param value - The caught value
 * @returns True if the value is a {@link JudgeAbortError}; false otherwise
 * @example
 * ```ts
 * isJudgeAbortError(new JudgeAbortError({ model: 'tev1:0.8b', answers: {} })) // true
 * ```
 */
export function isJudgeAbortError(value: unknown): value is JudgeAbortError {
	return holds(() => {
		if (
			!(
				value instanceof Error &&
				INTRINSICS.prototype(value) !== Error.prototype &&
				INTRINSICS.describe(value, Symbol.for('@orkestrel/agent.JudgeAbortError'))?.value === value
			)
		)
			return false
		const code = INTRINSICS.reflect.read(value, 'code')
		if (!(code === 'ABORT')) return false
		const partial = INTRINSICS.reflect.read(value, 'partial')
		if (!(isObject(partial) || isFunction(partial))) return false
		const answers = INTRINSICS.reflect.read(partial, 'answers')
		const refusals = INTRINSICS.reflect.read(partial, 'refusals')
		const usage = INTRINSICS.reflect.read(partial, 'usage')
		return (
			isString(INTRINSICS.reflect.read(partial, 'model')) &&
			(usage === undefined ||
				((isObject(usage) || isFunction(usage)) &&
					['prompt', 'completion', 'total'].every((key) =>
						isNumber(INTRINSICS.reflect.read(usage, key)),
					))) &&
			(isObject(answers) || isFunction(answers)) &&
			INTRINSICS.values(answers).every((answer: unknown) => {
				if (!(isObject(answer) || isFunction(answer))) return false
				const form = INTRINSICS.reflect.read(answer, 'form')
				if (form === 'noul') return isNumber(INTRINSICS.reflect.read(answer, 'noul'))
				const probabilities = INTRINSICS.reflect.read(answer, 'probabilities')
				if (form === 'score') return arrayOf(isNumber)(probabilities)
				return (
					form === 'choice' &&
					(isObject(probabilities) || isFunction(probabilities)) &&
					INTRINSICS.values(probabilities).every(isNumber)
				)
			}) &&
			(refusals === undefined ||
				((isObject(refusals) || isFunction(refusals)) &&
					INTRINSICS.values(refusals).every(
						(refusal: unknown) =>
							(isObject(refusal) || isFunction(refusal)) &&
							arrayOf(isString)(INTRINSICS.reflect.read(refusal, 'missing')),
					)))
		)
	})
}
