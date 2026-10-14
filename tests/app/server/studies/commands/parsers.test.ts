import { describe, expect, it } from 'vitest'
import { STUDY_COMMAND_INVALID_ARGUMENTS } from '../../../../setupStudy.js'
import { parseStudyArguments } from '../../../../../app/server/studies/commands/parsers.js'

describe('study command arguments', () => {
	it.each(STUDY_COMMAND_INVALID_ARGUMENTS)(
		'refuses malformed command tokens %j',
		(...arguments_) => {
			expect(() => parseStudyArguments(arguments_)).toThrow(/\S/)
		},
	)

	it('parses independent operations and the supervisor fingerprint without duplicate flags', () => {
		expect(parseStudyArguments(['check', 'tools'])).toEqual({
			command: 'check',
			target: 'tools',
			profile: 'local',
			out: undefined,
			expected: undefined,
		})
		expect(parseStudyArguments(['execute', 'tools', '--expected', 'a'.repeat(64)])).toMatchObject({
			command: 'execute',
			expected: 'a'.repeat(64),
		})
		expect(parseStudyArguments(['grade', 'result', '--rubric', 'rubric.json'])).toEqual({
			command: 'grade',
			target: 'result',
			rubric: 'rubric.json',
		})
		expect(
			parseStudyArguments([
				'label',
				'result',
				'--grading',
				'a'.repeat(64),
				'--labels',
				'labels.json',
			]),
		).toMatchObject({ command: 'label', labels: 'labels.json' })
		expect(parseStudyArguments(['report', 'result', '--grading', 'a'.repeat(64)])).toMatchObject({
			command: 'report',
			grading: 'a'.repeat(64),
		})
	})
})
