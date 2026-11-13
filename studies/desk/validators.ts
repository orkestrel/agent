import type {
	StudyDeskArea,
	StudyDeskArm,
	StudyDeskAssertion,
	StudyDeskDenialRow,
	StudyDeskInput,
	StudyDeskProvider,
	StudyDeskResultRow,
	StudyDeskRuntime,
	StudyDeskSettings,
	StudyDeskToolRow,
} from './types.js'
import {
	isBoolean,
	isFunction,
	isJSONValue,
	isNumber,
	isRecord,
	isString,
	literalOf,
	objectOf,
	recordOf,
	whereOf,
} from '@orkestrel/contract'
import { isStudyAgentRuntime } from '@orkestrel/study'
import { isStudyOllamaMetadata } from '@orkestrel/study/server'
import { STUDY_DESK_ARMS, STUDY_DESK_SKILLS, STUDY_DESK_TOOLS } from './constants.js'

/** Checks that a value names one of the six desk areas.
 * @example isStudyDeskArea('orders') // true
 */
export function isStudyDeskArea(value: unknown): value is StudyDeskArea {
	return literalOf(STUDY_DESK_SKILLS.map((skill) => skill.name))(value)
}

/** Checks that a value names one of the two arms.
 * @example isStudyDeskArm('index') // true
 */
export function isStudyDeskArm(value: unknown): value is StudyDeskArm {
	return literalOf(STUDY_DESK_ARMS)(value)
}

/** Checks a goal's public input and refuses any member beyond the prompt and the area.
 * @example isStudyDeskInput({ prompt: 'Is invoice INV-3310 paid?', area: 'billing' }) // true
 */
export function isStudyDeskInput(value: unknown): value is StudyDeskInput {
	return recordOf({
		prompt: whereOf(isString, (prompt) => prompt.trim() !== ''),
		area: isStudyDeskArea,
	})(value)
}

/** Checks a criterion's private assertion: a catalog tool and the area that holds it.
 * @example isStudyDeskAssertion({ tool: 'payment_status', area: 'billing' }) // true
 */
export function isStudyDeskAssertion(value: unknown): value is StudyDeskAssertion {
	return whereOf(recordOf({ tool: isString, area: isStudyDeskArea }), (assertion) =>
		STUDY_DESK_TOOLS.some((tool) => tool.name === assertion.tool && tool.area === assertion.area),
	)(value)
}

/** Checks the admitted Agent capability surface before a session constructs anything.
 * @example isStudyDeskRuntime({}) // false
 */
export function isStudyDeskRuntime(value: unknown): value is StudyDeskRuntime {
	return (
		isStudyAgentRuntime(value) &&
		objectOf({
			createAgent: isFunction,
			createAuthority: isFunction,
			createScope: isFunction,
			createSkillManager: isFunction,
		})(value)
	)
}

/** Checks the admitted provider factory and the timing reader.
 * @example isStudyDeskProvider({}) // false
 */
export function isStudyDeskProvider(value: unknown): value is StudyDeskProvider {
	return objectOf({
		createOllama: isFunction,
		extractTiming: isFunction,
	})(value)
}

/** Checks the desk settings and refuses another study's treatment switches.
 * @example isStudyDeskSettings({ version: '0.40.16' }) // false
 */
export function isStudyDeskSettings(value: unknown): value is StudyDeskSettings {
	return recordOf({ version: isString, metadata: isStudyOllamaMetadata })(value)
}

/** Checks a retained `tool` row's value: an id, a name, the arguments, and the success flag with its value or error.
 * @example isStudyDeskToolRow({ id: 'c1', name: 'status', arguments: {}, success: true, value: 'Done.' }) // true
 */
export function isStudyDeskToolRow(value: unknown): value is StudyDeskToolRow {
	return recordOf(
		{
			id: isString,
			name: isString,
			arguments: isRecord,
			success: isBoolean,
			value: isJSONValue,
			error: isString,
		},
		['value', 'error'],
	)(value)
}

/** Checks a retained `denial` row's value: the denied call's id and name, with its reason when it is a string.
 * @example isStudyDeskDenialRow({ id: 'c1', name: 'load' }) // true
 */
export function isStudyDeskDenialRow(value: unknown): value is StudyDeskDenialRow {
	return recordOf({ id: isString, name: isString, reason: isString }, ['reason'])(value)
}

/** Checks a retained `result` row's value: the reply and its partial flag, with the summed prompt and the first text when read.
 * @example isStudyDeskResultRow({ content: 'Done.', partial: false }) // true
 */
export function isStudyDeskResultRow(value: unknown): value is StudyDeskResultRow {
	return recordOf({ content: isString, partial: isBoolean, prompt: isNumber, first: isNumber }, [
		'prompt',
		'first',
	])(value)
}
