import type {
	CalibrationRow,
	ChatMessage,
	ChatRequest,
	ChatTool,
	Goal,
	Scenario,
	Seed,
	SeedMessage,
	UndecidedQuestion,
} from './types.ts'
import { arrayOf, isNumber, isRecord, isString } from '@orkestrel/contract'
import { isToolCall } from '@orkestrel/tool'

/** Checks the historical scenario fields the driver consumes.
 * @param value - The parsed archive value
 * @returns True if the consumed fields match; false otherwise
 */
export function isScenario(value: unknown): value is Scenario {
	try {
		return (
			isRecord(value) &&
			isRecord(value.ledger) &&
			isString(value.ledger.system) &&
			isString(value.ledger.clock) &&
			isRecord(value.ledger.topics) &&
			Object.values(value.ledger.topics).every(isString) &&
			arrayOf(isSeedMessage)(value.seed) &&
			isRecord(value.tools) &&
			Object.values(value.tools).every(
				(tool) => isRecord(tool) && Object.values(tool).every(isString),
			) &&
			arrayOf(isGoal)(value.goals)
		)
	} catch {
		return false
	}
}

/** Checks a seed message against the fields copied onto the ledger.
 * @param value - The parsed message
 * @returns True if the message can be replayed; false otherwise
 */
export function isSeedMessage(value: unknown): value is SeedMessage {
	try {
		return (
			isRecord(value) &&
			(value.role === 'system' ||
				value.role === 'user' ||
				value.role === 'assistant' ||
				value.role === 'tool') &&
			isString(value.content) &&
			(value.calls === undefined || arrayOf(isToolCall)(value.calls)) &&
			(value.call === undefined || isString(value.call))
		)
	} catch {
		return false
	}
}

/** Checks the historical scoring and request wire fields.
 * @param value - The parsed goal
 * @returns True if the consumed fields match; false otherwise
 */
export function isGoal(value: unknown): value is Goal {
	try {
		return (
			isRecord(value) &&
			isString(value.id) &&
			isString(value.request) &&
			['expected', 'expectedAny', 'forbidden', 'forbiddenPatterns'].every(
				(key) => value[key] === undefined || arrayOf(isString)(value[key]),
			)
		)
	} catch {
		return false
	}
}

/** Checks the consumed historical seed fields, including fixed.
 * @param value - The parsed seed
 * @returns True if the consumed fields match; false otherwise
 */
export function isSeed(value: unknown): value is Seed {
	try {
		return (
			isRecord(value) &&
			isNumber(value.imported) &&
			isString(value.judgments) &&
			isRecord(value.measured) &&
			isNumber(value.measured.scale) &&
			isNumber(value.measured.fixed) &&
			arrayOf(
				(entry: unknown): entry is UndecidedQuestion =>
					isRecord(entry) && isString(entry.item) && isString(entry.state),
			)(value.undecided)
		)
	} catch {
		return false
	}
}

/** Checks the consumed calibration row wire fields.
 * @param value - The parsed row
 * @returns True if the consumed fields match; false otherwise
 */
export function isCalibrationRow(value: unknown): value is CalibrationRow {
	try {
		return (
			isRecord(value) &&
			['question', 'order', 'topic', 'asked', 'name', 'error'].every(
				(key) => value[key] === undefined || isString(value[key]),
			) &&
			['index', 'earlier', 'later', 'p'].every(
				(key) => value[key] === undefined || isNumber(value[key]),
			) &&
			(value.probabilities === undefined ||
				(isRecord(value.probabilities) && Object.values(value.probabilities).every(isNumber))) &&
			(value.refusal === undefined ||
				(isRecord(value.refusal) && arrayOf(isString)(value.refusal.missing)))
		)
	} catch {
		return false
	}
}

/** Checks the recorded chat fields that preserve the measured seed and tools.
 * @param value - The recorded chat body
 * @returns True if the consumed fields match; false otherwise
 */
export function isChatRequest(value: unknown): value is ChatRequest {
	try {
		return (
			isRecord(value) &&
			(value.options === undefined || isRecord(value.options)) &&
			isString(value.keep_alive) &&
			arrayOf(
				(message: unknown): message is ChatMessage =>
					isRecord(message) && isString(message.content),
			)(value.messages) &&
			arrayOf(
				(tool: unknown): tool is ChatTool =>
					isRecord(tool) &&
					isRecord(tool.function) &&
					isString(tool.function.name) &&
					(tool.function.description === undefined || isString(tool.function.description)) &&
					(tool.function.parameters === undefined || isRecord(tool.function.parameters)),
			)(value.tools)
		)
	} catch {
		return false
	}
}
