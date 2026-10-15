import type {
	StudyToolsAgentInterface,
	StudyToolsAssertion,
	StudyToolsFile,
	StudyToolsInput,
	StudyToolsRead,
	StudyToolsResponse,
	StudyToolsRuntime,
	StudyToolsWrite,
} from './types.js'
import { holds, isArray, isConstructor, isJSONValue, isObject, isRecord } from '@orkestrel/contract'
import { isToolCall } from '@orkestrel/tool'
import { matchesStudyKeys } from '@orkestrel/study'
import { isStudyCustodyName } from '@orkestrel/study/server'
import {
	STUDY_TOOLS_CALLS,
	STUDY_TOOLS_FILE,
	STUDY_TOOLS_RESPONSES,
	STUDY_TOOLS_TEXT,
} from './constants.js'

/**
 * Checks whether an admitted runtime namespace supplies a constructable Agent export.
 * @param value - The admitted built module namespace
 * @returns True if the required constructor exists; false otherwise
 * @example
 * ```ts
 * isStudyToolsRuntime({}) // false
 * ```
 */
export function isStudyToolsRuntime(value: unknown): value is StudyToolsRuntime {
	return holds(() => isObject(value) && 'Agent' in value && isConstructor(value.Agent))
}

/**
 * Checks whether a foreign agent exposes every operation this consumer uses.
 * @param value - The newly constructed foreign agent
 * @returns True if the required operations are present; false otherwise
 * @example
 * ```ts
 * isStudyToolsAgent({}) // false
 * ```
 */
export function isStudyToolsAgent(value: unknown): value is StudyToolsAgentInterface {
	return holds(
		() =>
			isObject(value) &&
			'generate' in value &&
			typeof value.generate === 'function' &&
			'abort' in value &&
			typeof value.abort === 'function' &&
			'context' in value &&
			isObject(value.context) &&
			'messages' in value.context &&
			isObject(value.context.messages) &&
			'add' in value.context.messages &&
			typeof value.context.messages.add === 'function' &&
			'emitter' in value &&
			isObject(value.emitter) &&
			'destroy' in value.emitter &&
			typeof value.emitter.destroy === 'function',
	)
}

/**
 * Checks whether a filename is bounded, portable and a single text-file component.
 * @param value - The candidate filename
 * @returns True if it is an admitted scratch filename; false otherwise
 * @example
 * ```ts
 * isStudyToolsFileName('note.txt') // true
 * ```
 */
export function isStudyToolsFileName(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		value.length <= 128 &&
		STUDY_TOOLS_FILE.test(value) &&
		isStudyCustodyName(value.slice(0, -4))
	)
}

/**
 * Checks whether a scripted response has bounded JSON calls and workload controls.
 * @param value - The candidate response
 * @returns True if every declared response member is valid; false otherwise
 * @example
 * ```ts
 * isStudyToolsResponse({ content: 'done', calls: [] }) // true
 * ```
 */
export function isStudyToolsResponse(value: unknown): value is StudyToolsResponse {
	return holds(
		() =>
			isRecord(value) &&
			matchesStudyKeys(value, ['content', 'calls'], ['consume', 'cancel', 'tokens', 'bytes']) &&
			typeof value.content === 'string' &&
			new TextEncoder().encode(value.content).byteLength <= STUDY_TOOLS_TEXT &&
			isArray(value.calls) &&
			value.calls.length <= STUDY_TOOLS_CALLS &&
			value.calls.every(isToolCall) &&
			isJSONValue(value.calls) &&
			(value.consume === undefined ||
				(typeof value.consume === 'string' &&
					value.consume.length > 0 &&
					value.consume.length <= 128)) &&
			(value.cancel === undefined || typeof value.cancel === 'boolean') &&
			['tokens', 'bytes'].every(
				(key) =>
					value[key] === undefined ||
					(typeof value[key] === 'number' && Number.isSafeInteger(value[key]) && value[key] >= 0),
			),
	)
}

/**
 * Checks whether a goal declares bounded scripted work and observable scratch files.
 * @param value - The unknown goal input
 * @returns True if it is a valid tools workload; false otherwise
 * @example
 * ```ts
 * isStudyToolsInput({ prompt: 'Hello', responses: [{ content: 'done', calls: [] }], files: [], admitted: true }) // true
 * ```
 */
export function isStudyToolsInput(value: unknown): value is StudyToolsInput {
	return holds(
		() =>
			isRecord(value) &&
			matchesStudyKeys(value, ['prompt', 'responses', 'files', 'admitted']) &&
			typeof value.prompt === 'string' &&
			value.prompt.trim().length > 0 &&
			new TextEncoder().encode(value.prompt).byteLength <= STUDY_TOOLS_TEXT &&
			typeof value.admitted === 'boolean' &&
			isArray(value.responses) &&
			value.responses.length > 0 &&
			value.responses.length <= STUDY_TOOLS_RESPONSES &&
			value.responses.every(isStudyToolsResponse) &&
			isJSONValue(value.responses) &&
			isArray(value.files) &&
			value.files.length <= STUDY_TOOLS_CALLS &&
			value.files.every(isStudyToolsFileName) &&
			new Set(value.files).size === value.files.length &&
			isJSONValue(value.files),
	)
}

/**
 * Checks whether write arguments declare one bounded text payload.
 * @param value - The unknown tool arguments
 * @returns True if the arguments are exact and bounded; false otherwise
 * @example
 * ```ts
 * isStudyToolsWrite({ path: 'note.txt', content: 'hello' }) // true
 * ```
 */
export function isStudyToolsWrite(value: unknown): value is StudyToolsWrite {
	return holds(
		() =>
			isRecord(value) &&
			matchesStudyKeys(value, ['path', 'content']) &&
			typeof value.path === 'string' &&
			typeof value.content === 'string' &&
			new TextEncoder().encode(value.content).byteLength <= STUDY_TOOLS_TEXT,
	)
}

/**
 * Checks whether read arguments declare exactly one path.
 * @param value - The unknown tool arguments
 * @returns True if the argument shape is valid; false otherwise
 * @example
 * ```ts
 * isStudyToolsRead({ path: 'note.txt' }) // true
 * ```
 */
export function isStudyToolsRead(value: unknown): value is StudyToolsRead {
	return holds(
		() => isRecord(value) && matchesStudyKeys(value, ['path']) && typeof value.path === 'string',
	)
}

/**
 * Checks whether an independent assertion uses a supported state or trace schema.
 * @param value - The unknown rubric assertion
 * @returns True if the assertion is supported; false otherwise
 * @example
 * ```ts
 * isStudyToolsAssertion({ observation: 'file', path: 'note.txt', exists: false }) // true
 * ```
 */
export function isStudyToolsAssertion(value: unknown): value is StudyToolsAssertion {
	return holds(() => {
		if (!isRecord(value)) return false
		if (value.observation === 'file')
			return (
				matchesStudyKeys(value, ['observation', 'path', 'exists'], ['content']) &&
				isStudyToolsFileName(value.path) &&
				typeof value.exists === 'boolean' &&
				(value.exists ? typeof value.content === 'string' : value.content === undefined)
			)
		if (value.observation === 'tool')
			return (
				matchesStudyKeys(value, ['observation', 'name', 'success']) &&
				(value.name === 'read' || value.name === 'write') &&
				typeof value.success === 'boolean'
			)
		if (value.observation === 'denial')
			return (
				matchesStudyKeys(value, ['observation', 'name']) &&
				(value.name === 'read' || value.name === 'write')
			)
		return (
			value.observation === 'result' &&
			matchesStudyKeys(value, ['observation', 'partial'], ['content']) &&
			typeof value.partial === 'boolean' &&
			(value.content === undefined || typeof value.content === 'string')
		)
	})
}

/**
 * Checks whether retained file evidence contains an exact observed state.
 * @param value - The unknown observed file
 * @returns True if the observed state is valid; false otherwise
 * @example
 * ```ts
 * isStudyToolsFile({ path: 'note.txt', exists: false }) // true
 * ```
 */
export function isStudyToolsFile(value: unknown): value is StudyToolsFile {
	return holds(
		() =>
			isRecord(value) &&
			matchesStudyKeys(value, ['path', 'exists'], ['content', 'bytes']) &&
			isStudyToolsFileName(value.path) &&
			typeof value.exists === 'boolean' &&
			(value.exists
				? typeof value.content === 'string' &&
					typeof value.bytes === 'number' &&
					Number.isSafeInteger(value.bytes) &&
					value.bytes >= 0
				: value.content === undefined && value.bytes === undefined),
	)
}
