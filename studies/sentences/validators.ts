import type {
	StudySentenceMemory,
	StudySentenceLabel,
	StudySentencePopulation,
	StudySentenceRuntime,
	StudySentenceGoal,
	StudySentenceBinding,
	StudySentenceObservation,
	StudySentenceSelection,
	StudySentenceTargetLabel,
	StudySentenceMatrix,
	StudySentenceAssertion,
	StudySentenceSettings,
	StudySentenceProvider,
} from './types.js'
import {
	arrayOf,
	holds,
	isBoolean,
	isArray,
	isFunction,
	isNonNegativeInteger,
	isFiniteNumber,
	isObject,
	isRecord,
	isString,
	literalOf,
	objectOf,
	recordOf,
	optionalOf,
} from '@orkestrel/contract'
import { isStudyDigest } from '@orkestrel/study'
import { isStudyOllamaMetadata } from '@orkestrel/study/server'
import { STUDY_SENTENCE_TEXT, STUDY_SENTENCE_ENTRIES } from './constants.js'

/** Checks the source-contained mirror of the public memory input. @param value - Public scenario input. @returns True if the original bounded input contract holds; false otherwise. */
export function isStudySentenceMemory(value: unknown): value is StudySentenceMemory {
	return holds(() => {
		if (
			!isRecord(value) ||
			typeof value.prompt !== 'string' ||
			value.prompt.length === 0 ||
			value.prompt.length > STUDY_SENTENCE_TEXT ||
			!isArray(value.arrivals) ||
			value.arrivals.length > STUDY_SENTENCE_ENTRIES ||
			!isArray(value.records) ||
			value.records.length > STUDY_SENTENCE_ENTRIES
		)
			return false
		const { arrivals, records } = value
		return (
			arrivals.every(
				(arrival) =>
					isRecord(arrival) &&
					typeof arrival.id === 'string' &&
					arrival.id.length > 0 &&
					arrival.id.length <= 128 &&
					typeof arrival.content === 'string' &&
					arrival.content.length <= STUDY_SENTENCE_TEXT,
			) &&
			new Set(arrivals.map((arrival) => (isRecord(arrival) ? arrival.id : undefined))).size ===
				arrivals.length &&
			records.every(
				(record) =>
					isRecord(record) &&
					typeof record.id === 'string' &&
					record.id.length > 0 &&
					record.id.length <= 128 &&
					typeof record.name === 'string' &&
					record.name.length <= 128 &&
					typeof record.content === 'string' &&
					record.content.length <= STUDY_SENTENCE_TEXT,
			) &&
			new Set(records.map((record) => (isRecord(record) ? record.id : undefined))).size ===
				records.length
		)
	})
}

/** Checks one blind label without importing any rubric. @param value - Frozen label row. @returns True if its identity and disposition are present; false otherwise. */
export function isStudySentenceLabel(value: unknown): value is StudySentenceLabel {
	return objectOf({ id: isString, label: literalOf('yes', 'no', 'unresolved') })(value)
}

/** Checks the admitted provider surface without importing its implementation. @param value - Captured namespace. @returns True if its required capabilities exist; false otherwise. */
export function isStudySentenceProvider(value: unknown): value is StudySentenceProvider {
	return objectOf({ createOllamaJudge: isFunction, extractTiming: isFunction })(value)
}

/** Checks a calibration probability without accepting nonfinite or out-of-range values. @param value - Candidate score. @returns True if it is a finite probability; false otherwise. */
export function isStudySentenceScore(value: unknown): value is number {
	return isFiniteNumber(value) && value >= 0 && value <= 1
}

/** Checks immutable input identities. @param value - Binding record. @returns True if all required receipts are SHA-256 digests; false otherwise. */
export function isStudySentenceBinding(value: unknown): value is StudySentenceBinding {
	return recordOf({
		manifest: isStudyDigest,
		request: isStudyDigest,
		labels: isStudyDigest,
		scenario: isStudyDigest,
		agent: isStudyDigest,
		fitting: isStudyDigest,
		validation: isStudyDigest,
	})(value)
}

/** Checks a label-free public goal and refuses undeclared controls. @param value - Goal input. @returns True if the exact public fields are valid; false otherwise. */
export function isStudySentenceGoal(value: unknown): value is StudySentenceGoal {
	return holds(
		() =>
			recordOf({
				id: isStudyDigest,
				observation: isStudyDigest,
				kind: literalOf('base', 'repeat', 'sham'),
				state: isString,
				key: isString,
				digests: arrayOf(isStudyDigest),
			})(value) &&
			value.digests.length === 2 &&
			value.state.length > 0 &&
			value.key.length > 0,
	)
}

/** Checks one completed, attributable score. @param value - Retained product. @returns True if all identity and probability fields hold; false otherwise. */
export function isStudySentenceObservation(value: unknown): value is StudySentenceObservation {
	return recordOf({
		observation: isStudyDigest,
		id: isStudyDigest,
		score: isStudySentenceScore,
		digest: isStudyDigest,
		binding: isStudyDigest,
	})(value)
}

/** Checks a rubric-only independent target. @param value - Rubric row. @returns True if the label and optional control are boolean; false otherwise. */
export function isStudySentenceTargetLabel(value: unknown): value is StudySentenceTargetLabel {
	return recordOf({ id: isStudyDigest, label: isBoolean, control: optionalOf(isBoolean) }, [
		'control',
	])(value)
}

/** Checks one finite confusion matrix. @param value - Selection matrix. @returns True if the counts and measurements are valid; false otherwise. */
export function isStudySentenceMatrix(value: unknown): value is StudySentenceMatrix {
	return recordOf({
		cutoff: isFiniteNumber,
		tp: isNonNegativeInteger,
		fp: isNonNegativeInteger,
		tn: isNonNegativeInteger,
		fn: isNonNegativeInteger,
		precision: isStudySentenceScore,
		recall: isStudySentenceScore,
		margin: isFiniteNumber,
	})(value)
}

/** Checks the complete frozen selection carrier. @param value - Parsed judgment selection. @returns True if all selection members are present and finite; false otherwise. */
export function isStudySentenceSelection(value: unknown): value is StudySentenceSelection {
	return holds(
		() =>
			recordOf({
				binding: isStudySentenceBinding,
				cutoff: isStudySentenceScore,
				noise: isStudySentenceScore,
				matrices: arrayOf(isStudySentenceMatrix),
				observations: isStudyDigest,
				targets: arrayOf(isStudySentenceTargetLabel),
				policy: isStudyDigest,
			})(value) &&
			value.matrices.length === 3 &&
			value.targets.length > 0,
	)
}

/** Checks independent grading declarations without admitting labels into goals. @param value - Criterion assertion. @returns True if the phase and frozen receipts hold; false otherwise. */
export function isStudySentenceAssertion(value: unknown): value is StudySentenceAssertion {
	return recordOf(
		{
			phase: literalOf('initial', 'fitting', 'validation'),
			binding: isStudySentenceBinding,
			targets: arrayOf(isStudySentenceTargetLabel),
			selection: optionalOf(isStudySentenceSelection),
			digest: optionalOf(isStudyDigest),
			grading: optionalOf(isStudyDigest),
		},
		['selection', 'digest', 'grading'],
	)(value)
}

/** Checks the label-free execution receipts and recording metadata. @param value - Profile settings. @returns True if every receipt and budget is declared; false otherwise. */
export function isStudySentenceSettings(value: unknown): value is StudySentenceSettings {
	return holds(
		() =>
			recordOf({
				binding: isStudySentenceBinding,
				inputs: isRecord,
				goals: arrayOf(isStudyDigest),
				version: isString,
				metadata: isStudyOllamaMetadata,
			})(value) && Object.values(value.inputs).every(isStudyDigest),
	)
}

/** Checks the admitted runtime's required lexical exports. @param value - Admitted Agent namespace. @returns True if the real helper capabilities are present; false otherwise. */
export function isStudySentenceRuntime(value: unknown): value is StudySentenceRuntime {
	return objectOf({ extractTokens: isFunction, splitSentences: isFunction })(value)
}

/** Checks the consumer's public declaration shape without interpreting labels. @param value - Public population JSON. @returns True if the shape is complete; false otherwise. */
export function isStudySentencePopulation(value: unknown): value is StudySentencePopulation {
	return holds(
		() =>
			isObject(value) &&
			'cases' in value &&
			arrayOf(
				objectOf({
					id: isString,
					account: isString,
					names: arrayOf(isString),
					partition: literalOf('fitting', 'validation'),
				}),
			)(value.cases) &&
			'membership' in value &&
			isRecord(value.membership) &&
			Object.values(value.membership).every(arrayOf(isString)) &&
			'neutral' in value &&
			arrayOf(isString)(value.neutral) &&
			'standing' in value &&
			arrayOf(isString)(value.standing) &&
			'aliases' in value &&
			arrayOf(
				objectOf({
					id: isString,
					source: objectOf({ id: isString, version: isNonNegativeInteger }),
					role: literalOf('user', 'tool'),
					text: isString,
					evidence: isString,
				}),
			)(value.aliases) &&
			'pairs' in value &&
			arrayOf(
				objectOf({
					earlier: objectOf({ id: isString, version: isNonNegativeInteger }),
					later: objectOf({ id: isString, version: isNonNegativeInteger }),
					required: isBoolean,
					evidence: isString,
				}),
			)(value.pairs) &&
			'controls' in value &&
			arrayOf(
				objectOf({
					id: isString,
					category: isString,
					partition: literalOf('fitting', 'validation'),
					earlier: isString,
					later: isString,
					sentence: isNonNegativeInteger,
					intent: isBoolean,
				}),
			)(value.controls),
	)
}
