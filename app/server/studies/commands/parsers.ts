import type { StudyCommandRequest } from './types.js'
import { isAbsolute } from 'node:path'
import { StudyError } from '../../../core/studies/errors.js'
import { isStudyDigest } from '../../../core/studies/validators.js'
import { isStudyCustodyName } from '../stores/validators.js'

/**
 * Parses CLI arguments once and refuses malformed or operation-incompatible flags.
 * @param arguments_ - The exact command tokens
 * @returns The validated independent operation request
 * @throws StudyError - Thrown when tokens are missing, duplicate, foreign, or unsafe
 * @example
 * ```ts
 * parseStudyArguments(['check', 'tools', '--profile', 'local'])
 * ```
 */
export function parseStudyArguments(arguments_: readonly string[]): StudyCommandRequest {
	const command = arguments_[0]
	const target = arguments_[1]
	if (
		!['check', 'execute', 'grade', 'label', 'report'].includes(command ?? '') ||
		target === undefined ||
		target === '' ||
		target.startsWith('-') ||
		arguments_.length % 2 !== 0
	)
		throw new StudyError('CONFIG', 'Expected a study command, target, and paired flags')
	const flags = new Map<string, string>()
	for (let index = 2; index < arguments_.length; index += 2) {
		const flag = arguments_[index]
		const value = arguments_[index + 1]
		if (
			flag === undefined ||
			value === undefined ||
			!flag.startsWith('--') ||
			value === '' ||
			value.startsWith('-') ||
			flags.has(flag)
		)
			throw new StudyError('CONFIG', 'Invalid or duplicate command flag')
		flags.set(flag, value)
	}
	if (command === 'check' || command === 'execute') {
		if (
			!isStudyCustodyName(target) ||
			[...flags.keys()].some(
				(flag) =>
					flag !== '--profile' &&
					!(command === 'execute' && (flag === '--out' || flag === '--expected')),
			)
		)
			throw new StudyError('CONFIG', 'Invalid execution study or flags')
		const profile = flags.get('--profile') ?? 'local'
		const out = flags.get('--out')
		const expected = flags.get('--expected')
		if (!isStudyCustodyName(profile) || (out !== undefined && !isAbsolute(out)))
			throw new StudyError('CONFIG', 'Profile must be a portable name and output must be absolute')
		if (expected !== undefined && !isStudyDigest(expected))
			throw new StudyError('CONFIG', 'Expected execution fingerprint must be a SHA-256 identity')
		return { command, target, profile, out, expected }
	}
	if (command === 'grade') {
		const rubric = flags.get('--rubric')
		if (rubric === undefined || flags.size !== 1)
			throw new StudyError('CONFIG', 'Grade requires only --rubric')
		return { command, target, rubric }
	}
	const grading = flags.get('--grading')
	if (!isStudyDigest(grading))
		throw new StudyError('CONFIG', 'An exact grading identity is required')
	if (command === 'label') {
		const labels = flags.get('--labels')
		if (labels === undefined || flags.size !== 2)
			throw new StudyError('CONFIG', 'Label requires only --grading and --labels')
		return { command, target, grading, labels }
	}
	if (command !== 'report' || flags.size !== 1)
		throw new StudyError('CONFIG', 'Report requires only --grading')
	return { command, target, grading }
}
