import type { JSONValue } from '@orkestrel/contract'
import type {
	StudyAttempt,
	StudyEvidence,
	StudyJudgment,
	StudyManifest,
	StudyRubric,
} from '../../../core/studies/types.js'
import type { StudyToolsAssertion, StudyToolsFile, StudyToolsReading } from './types.js'
import { canonicalStringify, isArray, isObject, isRecord } from '@orkestrel/contract'
import { lstat, readFile, realpath } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { StudyError } from '../../../core/studies/errors.js'
import { buildStudySchedule } from '../../../core/studies/helpers.js'
import { isStudyRubric } from '../../../core/studies/validators.js'
import { isStudyCustodyAttempt, isStudyCustodyEvidence } from '../stores/validators.js'
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
 * Projects foreign provider messages onto the exact fields the workload reads.
 * @param value - The foreign provider message collection
 * @returns Owned JSON message readings in original order
 * @throws StudyError - Thrown when a dereferenced foreign member is malformed
 * @example
 * ```ts
 * readStudyToolsMessages(messages)
 * ```
 */
export function readStudyToolsMessages(value: unknown): readonly JSONValue[] {
	if (!isArray(value)) throw new StudyError('FAULT', 'Provider messages are not an array')
	return Object.freeze(
		Array.from(value).map((message): JSONValue => {
			if (!isObject(message)) throw new StudyError('FAULT', 'Provider message fields are invalid')
			const role = 'role' in message ? message.role : undefined
			const content = 'content' in message ? message.content : undefined
			const call = 'call' in message ? message.call : undefined
			if (
				typeof role !== 'string' ||
				typeof content !== 'string' ||
				(call !== undefined && typeof call !== 'string')
			)
				throw new StudyError('FAULT', 'Provider message fields are invalid')
			return Object.freeze({
				role,
				content,
				...(call === undefined ? {} : { call }),
			})
		}),
	)
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
	let reading: StudyToolsReading = { verdict: 'unknown', row: undefined }
	for (const [row, event] of evidence.entries()) {
		if (event.goal !== goal || event.event !== assertion.observation) continue
		const value = event.value
		if (!isRecord(value)) throw new StudyError('EVIDENCE', 'Domain evidence is not a record')
		let matched: boolean
		if (assertion.observation === 'file') {
			if (!isStudyToolsFile(value)) throw new StudyError('EVIDENCE', 'Malformed file evidence')
			if (value.path !== assertion.path) continue
			matched =
				value.exists === assertion.exists &&
				(assertion.content === undefined || value.content === assertion.content)
		} else if (assertion.observation === 'tool') {
			if (typeof value.name !== 'string' || typeof value.success !== 'boolean')
				throw new StudyError('EVIDENCE', 'Malformed tool evidence')
			if (value.name !== assertion.name) continue
			matched = value.success === assertion.success
		} else if (assertion.observation === 'denial') {
			if (typeof value.name !== 'string')
				throw new StudyError('EVIDENCE', 'Malformed denial evidence')
			if (value.name !== assertion.name) continue
			matched = true
		} else {
			if (typeof value.partial !== 'boolean' || typeof value.content !== 'string')
				throw new StudyError('EVIDENCE', 'Malformed result evidence')
			matched =
				value.partial === assertion.partial &&
				(assertion.content === undefined || value.content === assertion.content)
		}
		reading = { verdict: matched ? 'achieved' : 'unsuccessful', row }
	}
	return Object.freeze(reading)
}

/**
 * Grades only retained observations against independently declared mechanism predicates.
 * @param manifest - The execution's frozen population
 * @param rubric - The independently authored state and trace predicates
 * @param attempts - The retained terminal attempts
 * @param evidence - Retained evidence rows keyed by scheduled trial id
 * @returns Whole-horizon judgments with exact retained row references
 * @throws StudyError - Thrown when declarations, attempts or evidence are incompatible
 * @example
 * ```ts
 * gradeStudyTools(manifest, rubric, attempts, evidence)
 * ```
 */
export function gradeStudyTools(
	manifest: StudyManifest,
	rubric: StudyRubric,
	attempts: readonly StudyAttempt[],
	evidence: Readonly<Record<string, readonly StudyEvidence[]>>,
): readonly StudyJudgment[] {
	validateStudyToolsRubric(rubric)
	const schedule = buildStudySchedule(manifest.definition, manifest.scenarios)
	if (
		manifest.definition.purpose !== 'mechanism' ||
		manifest.definition.driver !== 'tools' ||
		canonicalStringify(schedule) !== canonicalStringify(manifest.schedule)
	)
		throw new StudyError('CONFIG', 'Invalid tools study schedule')
	const trials = new Map(schedule.map((trial) => [trial.id, trial]))
	if (
		!attempts.every((attempt) => isStudyCustodyAttempt(attempt, manifest)) ||
		new Set(attempts.map((attempt) => attempt.trial.id)).size !== attempts.length
	)
		throw new StudyError('EVIDENCE', 'Invalid or duplicate tools attempts')
	if (
		!isRecord(evidence) ||
		!Object.entries(evidence).every(
			([id, rows]) =>
				trials.has(id) && isArray(rows) && Array.from(rows).every(isStudyCustodyEvidence),
		)
	)
		throw new StudyError('EVIDENCE', 'Invalid or foreign tools evidence')
	for (const criterion of rubric.criteria) {
		if (
			!manifest.scenarios.some(
				(scenario) =>
					scenario.id === criterion.scenario &&
					scenario.goals.some((goal) => goal.id === criterion.goal),
			)
		)
			throw new StudyError('CONFIG', 'Tools criterion references an undeclared goal')
	}
	const retained = new Set(attempts.map((attempt) => attempt.trial.id))
	const judgments: StudyJudgment[] = []
	for (const trial of schedule) {
		for (const criterion of rubric.criteria) {
			if (criterion.scenario !== trial.scenario) continue
			if (!isStudyToolsAssertion(criterion.assertion))
				throw new StudyError('CONFIG', 'Unsupported tools assertion')
			const reading = readStudyToolsPredicate(
				criterion.assertion,
				criterion.goal,
				retained.has(trial.id) ? (evidence[trial.id] ?? []) : [],
			)
			judgments.push(
				Object.freeze({
					trial: trial.id,
					criterion: criterion.id,
					verdict: reading.verdict,
					method: criterion.method === 'state' ? 'state' : 'trace',
					reason:
						reading.row === undefined
							? 'No retained observation for the declared predicate'
							: reading.verdict === 'achieved'
								? 'Retained observation matches the independent predicate'
								: 'Retained observation differs from the independent predicate',
					references: Object.freeze(
						reading.row === undefined
							? []
							: [`trials/${trial.id}/evidence.jsonl#${reading.row + 1}`],
					),
				}),
			)
		}
	}
	return Object.freeze(judgments)
}
