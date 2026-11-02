import type {
	StudyToolsAgentInterface,
	StudyToolsAssertion,
	StudyToolsFile,
	StudyToolsInput,
	StudyToolsName,
	StudyToolsRead,
	StudyToolsRemember,
	StudyToolsRuntime,
	StudyToolsWrite,
} from './types.js'
import type { StudyAgentResponse } from '@orkestrel/study/server'
import { holds, isArray, isConstructor, isJSONValue, isObject, isRecord } from '@orkestrel/contract'
import { matchesStudyKeys } from '@orkestrel/study'
import { isStudyAgentResponse, isStudyCustodyName } from '@orkestrel/study/server'
import {
	STUDY_TOOLS_CALLS,
	STUDY_TOOLS_FILE,
	STUDY_TOOLS_RESPONSES,
	STUDY_TOOLS_TEXT,
} from './constants.js'

/**
 * Checks whether an admitted runtime namespace supplies a constructable Agent and a scope factory.
 * @param value - The admitted built module namespace
 * @returns True if the required exports exist; false otherwise
 * @example
 * ```ts
 * isStudyToolsRuntime({}) // false
 * ```
 */
export function isStudyToolsRuntime(value: unknown): value is StudyToolsRuntime {
	return holds(
		() =>
			isObject(value) &&
			'Agent' in value &&
			isConstructor(value.Agent) &&
			'createScope' in value &&
			typeof value.createScope === 'function',
	)
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
			'memos' in value.context &&
			isObject(value.context.memos) &&
			'add' in value.context.memos &&
			typeof value.context.memos.add === 'function' &&
			'memo' in value.context.memos &&
			typeof value.context.memos.memo === 'function' &&
			'history' in value.context.memos &&
			typeof value.context.memos.history === 'function' &&
			'skills' in value.context &&
			isObject(value.context.skills) &&
			'add' in value.context.skills &&
			typeof value.context.skills.add === 'function' &&
			'skill' in value.context.skills &&
			typeof value.context.skills.skill === 'function' &&
			'instructions' in value.context &&
			isObject(value.context.instructions) &&
			'add' in value.context.instructions &&
			typeof value.context.instructions.add === 'function' &&
			'conversations' in value.context &&
			isObject(value.context.conversations) &&
			'add' in value.context.conversations &&
			typeof value.context.conversations.add === 'function' &&
			'apply' in value.context &&
			typeof value.context.apply === 'function' &&
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
 * Checks whether a scripted response is a valid Study response within this workload's bounds.
 * @remarks
 * Study's guard owns the response shape; this guard adds only the scratch text, call and
 * continuation-name limits.
 * @param value - The candidate response
 * @returns True if the response is valid and within the workload bounds; false otherwise
 * @example
 * ```ts
 * isStudyToolsResponse({ content: 'done', calls: [] }) // true
 * ```
 */
export function isStudyToolsResponse(value: unknown): value is StudyAgentResponse {
	return holds(
		() =>
			isStudyAgentResponse(value) &&
			new TextEncoder().encode(value.content).byteLength <= STUDY_TOOLS_TEXT &&
			value.calls.length <= STUDY_TOOLS_CALLS &&
			(value.consume === undefined || value.consume.length <= 128),
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
			matchesStudyKeys(
				value,
				['prompt', 'responses', 'files', 'admitted'],
				['approval', 'conversation', 'scope', 'skills', 'memos'],
			) &&
			typeof value.prompt === 'string' &&
			value.prompt.trim().length > 0 &&
			new TextEncoder().encode(value.prompt).byteLength <= STUDY_TOOLS_TEXT &&
			typeof value.admitted === 'boolean' &&
			(!('approval' in value) ||
				value.approval === 'approve' ||
				value.approval === 'refuse' ||
				value.approval === 'pending') &&
			isArray(value.responses) &&
			value.responses.length > 0 &&
			value.responses.length <= STUDY_TOOLS_RESPONSES &&
			value.responses.every(isStudyToolsResponse) &&
			isJSONValue(value.responses) &&
			isArray(value.files) &&
			value.files.length <= STUDY_TOOLS_CALLS &&
			value.files.every(isStudyToolsFileName) &&
			new Set(value.files).size === value.files.length &&
			isJSONValue(value.files) &&
			(!('conversation' in value) || isStudyCustodyName(value.conversation)) &&
			(!('scope' in value) ||
				(isRecord(value.scope) &&
					matchesStudyKeys(value.scope, [], ['skills', 'memos']) &&
					(!('skills' in value.scope) || isStudyToolsNames(value.scope.skills)) &&
					(!('memos' in value.scope) || isStudyToolsNames(value.scope.memos)))) &&
			// A skill entry holds the three bounded texts a memo revision holds, under a custody name.
			(!('skills' in value) ||
				(isArray(value.skills) &&
					value.skills.length <= STUDY_TOOLS_CALLS &&
					value.skills.every(
						(skill) => isStudyToolsRemember(skill) && isStudyCustodyName(skill.name),
					))) &&
			(!('memos' in value) ||
				(isStudyToolsNames(value.memos) && new Set(value.memos).size === value.memos.length)),
	)
}

/**
 * Checks whether a declared list holds bounded custody names.
 * @param value - The candidate list
 * @returns True if it is a bounded list of custody names; false otherwise
 * @example
 * ```ts
 * isStudyToolsNames(['tone', 'reach']) // true
 * ```
 */
export function isStudyToolsNames(value: unknown): value is readonly string[] {
	return holds(
		() => isArray(value) && value.length <= STUDY_TOOLS_CALLS && value.every(isStudyCustodyName),
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
 * Checks whether remember arguments declare exactly one bounded memo revision.
 * @param value - The unknown tool arguments
 * @returns True if the arguments are exact and bounded; false otherwise
 * @example
 * ```ts
 * isStudyToolsRemember({ name: 'tone', description: 'Prefers short replies.', content: 'Answer briefly.' }) // true
 * ```
 */
export function isStudyToolsRemember(value: unknown): value is StudyToolsRemember {
	return holds(
		() =>
			isRecord(value) &&
			matchesStudyKeys(value, ['name', 'description', 'content']) &&
			typeof value.name === 'string' &&
			new TextEncoder().encode(value.name).byteLength <= STUDY_TOOLS_TEXT &&
			typeof value.description === 'string' &&
			new TextEncoder().encode(value.description).byteLength <= STUDY_TOOLS_TEXT &&
			typeof value.content === 'string' &&
			new TextEncoder().encode(value.content).byteLength <= STUDY_TOOLS_TEXT,
	)
}

/**
 * Checks whether arguments declare exactly one bounded name.
 * @param value - The unknown tool arguments
 * @returns True if the arguments are exact and bounded; false otherwise
 * @example
 * ```ts
 * isStudyToolsName({ name: 'review' }) // true
 * ```
 */
export function isStudyToolsName(value: unknown): value is StudyToolsName {
	return holds(
		() =>
			isRecord(value) &&
			matchesStudyKeys(value, ['name']) &&
			typeof value.name === 'string' &&
			new TextEncoder().encode(value.name).byteLength <= STUDY_TOOLS_TEXT,
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
		const named =
			value.name === 'write' ||
			value.name === 'read' ||
			value.name === 'remember' ||
			value.name === 'memo' ||
			value.name === 'skill'
		if (value.observation === 'file')
			return (
				matchesStudyKeys(value, ['observation', 'path', 'exists'], ['content']) &&
				isStudyToolsFileName(value.path) &&
				typeof value.exists === 'boolean' &&
				(value.exists ? typeof value.content === 'string' : value.content === undefined)
			)
		if (value.observation === 'tool')
			return (
				matchesStudyKeys(value, ['observation', 'name', 'success'], ['count']) &&
				named &&
				typeof value.success === 'boolean' &&
				(!('count' in value) ||
					(typeof value.count === 'number' && Number.isSafeInteger(value.count) && value.count > 0))
			)
		if (value.observation === 'denial')
			return matchesStudyKeys(value, ['observation', 'name']) && named
		if (value.observation === 'request')
			return (
				matchesStudyKeys(value, ['observation', 'at', 'role', 'text', 'present']) &&
				typeof value.at === 'number' &&
				Number.isSafeInteger(value.at) &&
				value.at >= 0 &&
				(value.role === 'system' || value.role === 'user' || value.role === 'tool') &&
				typeof value.text === 'string' &&
				value.text.length > 0 &&
				typeof value.present === 'boolean'
			)
		if (value.observation === 'memo')
			return (
				matchesStudyKeys(value, ['observation', 'name', 'revisions'], ['description']) &&
				isStudyCustodyName(value.name) &&
				typeof value.revisions === 'number' &&
				Number.isSafeInteger(value.revisions) &&
				value.revisions >= 0 &&
				(!('description' in value) || typeof value.description === 'string')
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
