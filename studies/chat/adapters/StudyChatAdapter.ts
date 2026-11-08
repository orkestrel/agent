import type { StudyDriverInterface, StudyJudgment } from '@orkestrel/study'
import type {
	StudyAdapterInterface,
	StudyAdjudication,
	StudyDriverOptions,
	StudyValidation,
} from '@orkestrel/study/server'
import { StudyError } from '@orkestrel/study'
import { gradeStudyEvidence } from '@orkestrel/study/server'
import { readStudyChatGrade, validateStudyChatProfile } from '../helpers.js'
import { isStudyChatAssertion, isStudyChatInput } from '../validators.js'
import { StudyChatDriver } from '../drivers/StudyChatDriver.js'

/** Validates chat declarations, opens the records driver, and grades retained evidence.
 * @example new StudyChatAdapter().validate(declaration)
 */
export class StudyChatAdapter implements StudyAdapterInterface {
	validate(input: StudyValidation): void {
		validateStudyChatProfile(input.profile)
		if (
			input.definition.driver !== 'chat' ||
			input.definition.purpose !== 'mechanism' ||
			input.definition.arms.length !== 1 ||
			input.definition.arms[0] !== 'records'
		)
			throw new StudyError('CONFIG', 'Chat requires records mechanism')
		for (const scenario of input.scenarios)
			for (const goal of scenario.goals)
				if (!isStudyChatInput(goal.input))
					throw new StudyError('CONFIG', 'Malformed public chat input')
		for (const criterion of input.rubric.criteria)
			if (criterion.method !== 'state' || !isStudyChatAssertion(criterion.assertion))
				throw new StudyError('CONFIG', 'Malformed chat assertion')
	}
	driver(options: StudyDriverOptions): StudyDriverInterface {
		return new StudyChatDriver(options)
	}
	grade(input: StudyAdjudication): readonly StudyJudgment[] {
		return gradeStudyEvidence(input, readStudyChatGrade)
	}
}
