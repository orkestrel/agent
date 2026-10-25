import type { StudyDriverInterface, StudyJudgment } from '@orkestrel/study'
import type {
	StudyAdapterInterface,
	StudyAdjudication,
	StudyDriverOptions,
	StudyValidation,
} from '@orkestrel/study/server'
import { StudyError, validateStudyInputs } from '@orkestrel/study'
import { encodeStudyJSON, gradeStudyEvidence, hashStudyBytes } from '@orkestrel/study/server'
import { gradeStudySentencePartition, hashStudySentenceRequest } from './helpers.js'
import {
	isStudySentenceAssertion,
	isStudySentenceGoal,
	isStudySentenceSettings,
} from './validators.js'
import { StudySentenceDriver } from './StudySentenceDriver.js'

/** Validates frozen public packets and independently grades retained calibration evidence. */
export class StudySentenceAdapter implements StudyAdapterInterface {
	/** Checks declarations and input receipts before executable modules load. @param input - Parsed host declarations. */
	validate(input: StudyValidation): void {
		validateStudyInputs(input.definition, input.scenarios, input.rubric, input.profile)
		const settings = input.profile.settings
		const scenario = input.scenarios[0]
		if (
			input.definition.driver !== 'sentences' ||
			input.definition.purpose !== 'mechanism' ||
			input.definition.arms.length !== 1 ||
			input.definition.arms[0] !== 'calibration' ||
			input.definition.order.length !== 1 ||
			input.scenarios.length !== 1 ||
			scenario === undefined ||
			!isStudySentenceSettings(settings)
		)
			throw new StudyError(
				'CONFIG',
				'Sentence calibration requires one trial and frozen execution settings',
			)
		if (settings.binding.request !== hashStudySentenceRequest())
			throw new StudyError('CONFIG', 'Sentence request binding changed')
		if (
			hashStudyBytes(encodeStudyJSON(scenario)) !== settings.binding.scenario ||
			Object.keys(settings.inputs).length !== scenario.goals.length ||
			JSON.stringify(settings.goals) !== JSON.stringify(scenario.goals.map((goal) => goal.id))
		)
			throw new StudyError('CONFIG', 'Sentence scenario receipt changed')
		for (const goal of scenario.goals) {
			if (
				!isStudySentenceGoal(goal.input) ||
				goal.id !== goal.input.observation ||
				settings.inputs[goal.id] !== hashStudyBytes(encodeStudyJSON(goal.input))
			)
				throw new StudyError('CONFIG', 'Sentence packet receipt changed')
		}
		for (const criterion of input.rubric.criteria) {
			if (
				!isStudySentenceAssertion(criterion.assertion) ||
				criterion.assertion.phase !== 'initial' ||
				criterion.assertion.targets.length !== 0 ||
				criterion.assertion.selection !== undefined ||
				criterion.assertion.digest !== undefined ||
				criterion.assertion.grading !== undefined ||
				hashStudyBytes(encodeStudyJSON(criterion.assertion.binding)) !==
					hashStudyBytes(encodeStudyJSON(settings.binding))
			)
				throw new StudyError('CONFIG', 'Sentence initial rubric differs from frozen public inputs')
		}
	}

	/** Constructs the consumer over captured provider capabilities. @param options - Admitted modules and profile. @returns The bounded sentence driver. */
	driver(options: StudyDriverOptions): StudyDriverInterface {
		return new StudySentenceDriver(options)
	}

	/** Grades retained scores with rubric-only labels. @param input - Sealed execution and independent rubric. @returns Attributable judgments with a JSON fitting carrier. */
	grade(input: StudyAdjudication): readonly StudyJudgment[] {
		return gradeStudyEvidence(input, (target) => {
			try {
				if (!isStudySentenceAssertion(target.criterion.assertion))
					throw new StudyError('EVIDENCE', 'Sentence grading assertion is malformed')
				const result = gradeStudySentencePartition(target.criterion.assertion, input)
				return {
					verdict: 'achieved',
					method: 'state',
					reason: JSON.stringify(result),
					references: [
						{ file: 'attempt' },
						...target.evidence.map((_row, row) => ({ file: 'evidence' as const, row })),
					],
				}
			} catch (error) {
				return {
					verdict: target.attempt === undefined ? 'unknown' : 'unsuccessful',
					method: 'state',
					reason: JSON.stringify({
						explanation: error instanceof Error ? error.message : String(error),
					}),
					references: target.attempt === undefined ? [] : [{ file: 'attempt' }],
				}
			}
		})
	}
}
