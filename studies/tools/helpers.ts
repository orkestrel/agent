import type { JSONValue } from '@orkestrel/contract'
import type { ToolCall } from '@orkestrel/tool'
import type { StudyEvidence, StudyRubric } from '@orkestrel/study'
import type { StudyGradeReading, StudyGradeTarget } from '@orkestrel/study/server'
import type { StudyToolsAssertion, StudyToolsFile, StudyToolsReading } from './types.js'
import { cloneJSONValue, isJSONValue, isObject, isRecord } from '@orkestrel/contract'
import { lstat, readFile, realpath } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { StudyError, isStudyRubric } from '@orkestrel/study'
import { STUDY_TOOLS_TEXT } from './constants.js'
import { StudyToolsRefusal } from './errors.js'
import { isStudyToolsAssertion, isStudyToolsFile, isStudyToolsFileName } from './validators.js'

/**
 * Resolves an admitted scratch file while refusing noncanonical roots and symlinks.
 * @param directory - The exclusive recorded trial directory
 * @param name - The caller's scratch filename
 * @returns The absolute contained file path
 * @throws StudyToolsRefusal - Thrown when the path cannot be admitted safely
 * @example
 * ```ts
 * await resolveStudyToolsPath(directory, 'note.txt')
 * ```
 */
export async function resolveStudyToolsPath(directory: string, name: string): Promise<string> {
	if (!isStudyToolsFileName(name)) throw new StudyToolsRefusal('Scratch path refused')
	const root = await realpath(directory)
	if (resolve(root) !== resolve(directory))
		throw new StudyToolsRefusal('Noncanonical scratch root refused')
	const target = resolve(root, name)
	if (relative(root, target) !== name) throw new StudyToolsRefusal('Outside scratch path refused')
	try {
		const entry = await lstat(target)
		if (entry.isSymbolicLink() || !entry.isFile() || resolve(await realpath(target)) !== target)
			throw new StudyToolsRefusal('Scratch symlink or special file refused')
	} catch (error) {
		if (!isObject(error) || !('code' in error) || error.code !== 'ENOENT') throw error
	}
	return target
}

/**
 * Reads actual bounded file state without converting absence into invented content.
 * @param directory - The exclusive recorded trial directory
 * @param name - The admitted filename
 * @returns The observed existence and bytes
 * @throws StudyToolsRefusal - Thrown when a path or oversized file is refused
 * @example
 * ```ts
 * await observeStudyToolsFile(directory, 'note.txt')
 * ```
 */
export async function observeStudyToolsFile(
	directory: string,
	name: string,
): Promise<StudyToolsFile> {
	const target = await resolveStudyToolsPath(directory, name)
	try {
		const stat = await lstat(target)
		if (stat.size > STUDY_TOOLS_TEXT) throw new StudyToolsRefusal('Oversized scratch file refused')
		const bytes = await readFile(target)
		if (bytes.byteLength > STUDY_TOOLS_TEXT)
			throw new StudyToolsRefusal('Oversized scratch file refused')
		return Object.freeze({
			path: name,
			exists: true,
			content: bytes.toString('utf8'),
			bytes: bytes.byteLength,
		})
	} catch (error) {
		if (isObject(error) && 'code' in error && error.code === 'ENOENT')
			return Object.freeze({ path: name, exists: false })
		throw error
	}
}

/**
 * Reads one admitted Agent tool observation into the JSON evidence value the trace retains.
 * @param event - Whether the Agent dispatched the call or denied it
 * @param call - The observed call
 * @param envelope - The Agent's event payload carrying the denial reason or the tool result
 * @returns The call identity with a denial reason, or with its arguments and the successful value or the error text
 * @throws StudyError - Thrown when the payload carries a malformed or non-JSON result
 * @example
 * ```ts
 * readStudyToolsObservation('denial', call, { call, reason: 'refused' }) // { id: 'c1', name: 'write', reason: 'refused' }
 * ```
 */
export function readStudyToolsObservation(
	event: 'tool' | 'denial',
	call: ToolCall,
	envelope: Readonly<Record<string, unknown>>,
): JSONValue {
	if (event === 'denial')
		return {
			id: call.id,
			name: call.name,
			...(typeof envelope.reason === 'string' ? { reason: envelope.reason } : {}),
		}
	const result = envelope.result
	if (!isObject(result) || !('success' in result) || typeof result.success !== 'boolean')
		throw new StudyError('FAULT', 'Admitted Agent supplied invalid tool result')
	if (result.success) {
		if (!('value' in result) || !isJSONValue(result.value))
			throw new StudyError('FAULT', 'Admitted Agent supplied non-JSON tool value')
		return {
			id: call.id,
			name: call.name,
			arguments: cloneJSONValue(call.arguments),
			success: true,
			value: cloneJSONValue(result.value),
		}
	}
	if (!('error' in result) || typeof result.error !== 'string')
		throw new StudyError('FAULT', 'Admitted Agent supplied invalid tool error')
	return {
		id: call.id,
		name: call.name,
		arguments: cloneJSONValue(call.arguments),
		success: false,
		error: result.error,
	}
}

/**
 * Refuses unsupported rubric predicates before any tool workload starts.
 * @param rubric - The independently authored declaration
 * @returns Nothing when every assertion and method is supported
 * @throws StudyError - Thrown when a schema or method is incompatible
 * @example
 * ```ts
 * validateStudyToolsRubric(rubric)
 * ```
 */
export function validateStudyToolsRubric(rubric: StudyRubric): void {
	if (!isStudyRubric(rubric)) throw new StudyError('CONFIG', 'Invalid tools rubric')
	for (const criterion of rubric.criteria) {
		if (
			!isStudyToolsAssertion(criterion.assertion) ||
			criterion.method !== (criterion.assertion.observation === 'file' ? 'state' : 'trace')
		)
			throw new StudyError('CONFIG', 'Unsupported tools assertion or grading method')
	}
}

/**
 * Reads the latest relevant retained state or trace against an independent predicate.
 * @param assertion - The validated predicate
 * @param goal - The declared goal
 * @param evidence - The retained ordered evidence rows
 * @returns A verdict with its original zero-based row, or unknown when no row exists
 * @throws StudyError - Thrown when relevant domain evidence is malformed
 * @example
 * ```ts
 * readStudyToolsPredicate(assertion, 'write', rows)
 * ```
 */
export function readStudyToolsPredicate(
	assertion: StudyToolsAssertion,
	goal: string,
	evidence: readonly StudyEvidence[],
): StudyToolsReading {
	// Each relevant row that names the asserted subject yields one reading; the latest wins.
	const readings = [...evidence.entries()].flatMap(([row, event]): readonly StudyToolsReading[] => {
		if (event.goal !== goal || event.event !== assertion.observation) return []
		const value = event.value
		if (!isRecord(value)) throw new StudyError('EVIDENCE', 'Domain evidence is not a record')
		if (assertion.observation === 'file') {
			if (!isStudyToolsFile(value)) throw new StudyError('EVIDENCE', 'Malformed file evidence')
			if (value.path !== assertion.path) return []
			return [
				{
					verdict:
						value.exists === assertion.exists &&
						(assertion.content === undefined || value.content === assertion.content)
							? 'achieved'
							: 'unsuccessful',
					row,
				},
			]
		}
		if (assertion.observation === 'tool') {
			if (typeof value.name !== 'string' || typeof value.success !== 'boolean')
				throw new StudyError('EVIDENCE', 'Malformed tool evidence')
			if (value.name !== assertion.name) return []
			return [{ verdict: value.success === assertion.success ? 'achieved' : 'unsuccessful', row }]
		}
		if (assertion.observation === 'denial') {
			if (typeof value.name !== 'string')
				throw new StudyError('EVIDENCE', 'Malformed denial evidence')
			if (value.name !== assertion.name) return []
			return [{ verdict: 'achieved', row }]
		}
		if (typeof value.partial !== 'boolean' || typeof value.content !== 'string')
			throw new StudyError('EVIDENCE', 'Malformed result evidence')
		return [
			{
				verdict:
					value.partial === assertion.partial &&
					(assertion.content === undefined || value.content === assertion.content)
						? 'achieved'
						: 'unsuccessful',
				row,
			},
		]
	})
	return Object.freeze(readings.at(-1) ?? { verdict: 'unknown', row: undefined })
}

/**
 * Reads one declared target against the independent state or trace predicate its criterion names.
 * @param target - The declared pair with its retained attempt and evidence rows
 * @returns The verdict, method and reason, citing the zero-based evidence row the predicate matched
 * @throws StudyError - Thrown when the criterion's assertion is unsupported or its evidence malformed
 * @example
 * ```ts
 * readStudyToolsGrade(target)
 * ```
 */
export function readStudyToolsGrade(target: StudyGradeTarget): StudyGradeReading {
	const { criterion, evidence } = target
	if (!isStudyToolsAssertion(criterion.assertion))
		throw new StudyError('CONFIG', 'Unsupported tools assertion')
	const reading = readStudyToolsPredicate(criterion.assertion, criterion.goal, evidence)
	return {
		verdict: reading.verdict,
		method: criterion.method === 'state' ? 'state' : 'trace',
		reason:
			reading.row === undefined
				? 'No retained observation for the declared predicate'
				: reading.verdict === 'achieved'
					? 'Retained observation matches the independent predicate'
					: 'Retained observation differs from the independent predicate',
		references: reading.row === undefined ? [] : [{ file: 'evidence', row: reading.row }],
	}
}
