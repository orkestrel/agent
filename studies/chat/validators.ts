import type {
	StudyChatAssertion,
	StudyChatDialogue,
	StudyChatInput,
	StudyChatProbe,
	StudyChatProvider,
	StudyChatRecord,
	StudyChatRuntime,
	StudyChatScript,
	StudyChatSeal,
	StudyChatSettings,
	StudyChatStep,
} from './types.js'
import { arrayOf, holds, isObject, isRecord, isString, recordOf } from '@orkestrel/contract'
import { isStudyAgentRuntime } from '@orkestrel/study'
import { isStudyOllamaMetadata } from '@orkestrel/study/server'

/** Checks the public order record without accepting additional fields.
 * @example isStudyChatRecord({ id: 'OR-7', name: 'Dana', text: 'Ships Friday.' }) // true
 */
export function isStudyChatRecord(value: unknown): value is StudyChatRecord {
	return recordOf({ id: isString, name: isString, text: isString }, true)(value)
}
/** Checks the sealed dialogue probe shape.
 * @example isStudyChatProbe(undefined) // false
 */
export function isStudyChatProbe(value: unknown): value is StudyChatProbe {
	return recordOf(
		{
			slot: isString,
			question: isString,
			gold: isString,
			accept: arrayOf(isString),
			refuse: arrayOf(isString),
			depth: isString,
		},
		true,
	)(value)
}
/** Checks the original dialogue identity, turns, and probe collection.
 * @example isStudyChatDialogue({ id: 'example.json', turns: [], probes: [] }) // true
 */
export function isStudyChatDialogue(value: unknown): value is StudyChatDialogue {
	return recordOf(
		{ id: isString, turns: arrayOf(isString), probes: arrayOf(isStudyChatProbe) },
		true,
	)(value)
}
/** Checks a scripted request with its independent mechanical check.
 * @example isStudyChatStep({ request: 'Hello.', accept: [], check: 'none' }) // true
 */
export function isStudyChatStep(value: unknown): value is StudyChatStep {
	return holds(
		() =>
			isRecord(value) &&
			typeof value.request === 'string' &&
			arrayOf(isString)(value.accept) &&
			typeof value.check === 'string' &&
			(value.refuse === undefined || arrayOf(isString)(value.refuse)),
	)
}
/** Checks a scripted conversation and its public lookup record.
 * @example isStudyChatScript(undefined) // false
 */
export function isStudyChatScript(value: unknown): value is StudyChatScript {
	return recordOf(
		{ id: isString, record: isStudyChatRecord, steps: arrayOf(isStudyChatStep) },
		true,
	)(value)
}
/** Checks the seal's structural shape independently of its pinned digest.
 * @example isStudyChatSeal({}) // false
 */
export function isStudyChatSeal(value: unknown): value is StudyChatSeal {
	return recordOf(
		{
			system: isString,
			desk: isString,
			picked: arrayOf(isStudyChatDialogue),
			changed: arrayOf(isStudyChatDialogue),
			scripted: arrayOf(isStudyChatScript),
		},
		true,
	)(value)
}
/** Checks public conversation input and refuses grading metadata or contradictory lookup data.
 * @example isStudyChatInput({ prompt: 'Hello.', system: 'Be brief.', topic: 'bookings' }) // true
 */
export function isStudyChatInput(value: unknown): value is StudyChatInput {
	return holds(
		() =>
			isRecord(value) &&
			Object.keys(value).every((key) => ['prompt', 'system', 'topic', 'record'].includes(key)) &&
			typeof value.prompt === 'string' &&
			typeof value.system === 'string' &&
			((value.topic === 'bookings' && value.record === undefined) ||
				(value.topic === 'orders' && isStudyChatRecord(value.record))),
	)
}
/** Checks an independent criterion with a positive battery turn number.
 * @example isStudyChatAssertion({}) // false
 */
export function isStudyChatAssertion(value: unknown): value is StudyChatAssertion {
	return holds(
		() =>
			isRecord(value) &&
			typeof value.observation === 'string' &&
			['primary', 'denial', 'older', 'completion'].includes(value.observation) &&
			typeof value.conversation === 'string' &&
			typeof value.turn === 'number' &&
			Number.isSafeInteger(value.turn) &&
			value.turn > 0 &&
			typeof value.group === 'string' &&
			arrayOf(isString)(value.accept) &&
			arrayOf(isString)(value.refuse) &&
			(value.previous === undefined || typeof value.previous === 'string'),
	)
}
/** Checks the admitted Agent capability surface before constructing a session.
 * @example isStudyChatRuntime({}) // false
 */
export function isStudyChatRuntime(value: unknown): value is StudyChatRuntime {
	return holds(
		() =>
			isStudyAgentRuntime(value) &&
			'createLedger' in value &&
			typeof value.createLedger === 'function' &&
			'LEDGER_QUESTIONS' in value &&
			isObject(value.LEDGER_QUESTIONS),
	)
}
/** Checks the admitted provider factories and timing capability.
 * @example isStudyChatProvider({}) // false
 */
export function isStudyChatProvider(value: unknown): value is StudyChatProvider {
	return holds(
		() =>
			isObject(value) &&
			'createOllama' in value &&
			typeof value.createOllama === 'function' &&
			'createOllamaJudge' in value &&
			typeof value.createOllamaJudge === 'function' &&
			'extractTiming' in value &&
			typeof value.extractTiming === 'function',
	)
}
/** Checks the chat settings without admitting another study's treatment switches.
 * @example isStudyChatSettings({ capacity: 19968 }) // false
 */
export function isStudyChatSettings(value: unknown): value is StudyChatSettings {
	return holds(
		() =>
			isRecord(value) &&
			typeof value.capacity === 'number' &&
			isStudyOllamaMetadata(value.metadata) &&
			Object.keys(value).every((key) => ['capacity', 'metadata'].includes(key)),
	)
}
