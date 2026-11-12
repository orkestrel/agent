import type { JSONValue } from '@orkestrel/contract'
import type { StudyDriverInterface, StudyJudgment } from '@orkestrel/study'
import type {
	StudyAdapterInterface,
	StudyAdjudication,
	StudyDriverOptions,
	StudyProgressTarget,
	StudyValidation,
} from '@orkestrel/study/server'
import { StudyError } from '@orkestrel/study'
import { gradeStudyEvidence } from '@orkestrel/study/server'
import { readStudyDeskGrade, readStudyDeskProgress, validateStudyDeskProfile } from '../helpers.js'
import { isStudyDeskArm, isStudyDeskAssertion, isStudyDeskInput } from '../validators.js'
import { StudyDeskDriver } from '../drivers/StudyDeskDriver.js'

/** Validates desk declarations, opens the arm driver, grades retained calls, and reads each goal's progress.
 * @example new StudyDeskAdapter().validate(declaration)
 */
export class StudyDeskAdapter implements StudyAdapterInterface {
	/**
	 * Refuses a declaration that is not a desk mechanism study over declared arms, public inputs, and catalog assertions.
	 * @param input - The parsed definition, scenarios, rubric, and profile
	 * @throws StudyError - Thrown with code `CONFIG` on the first difference
	 */
	validate(input: StudyValidation): void {
		validateStudyDeskProfile(input.profile)
		const arms = input.definition.arms
		if (
			input.definition.driver !== 'desk' ||
			input.definition.purpose !== 'mechanism' ||
			!arms.every(isStudyDeskArm)
		)
			throw new StudyError('CONFIG', 'Desk requires a mechanism study over declared arms')
		const goals = new Map(
			input.scenarios.flatMap((scenario) =>
				scenario.goals.map((goal) => [`${scenario.id}/${goal.id}`, goal.input] as const),
			),
		)
		if (![...goals.values()].every(isStudyDeskInput))
			throw new StudyError('CONFIG', 'Malformed public desk input')
		for (const criterion of input.rubric.criteria) {
			const goal = goals.get(`${criterion.scenario}/${criterion.goal}`)
			if (
				criterion.method !== 'state' ||
				!isStudyDeskAssertion(criterion.assertion) ||
				!isStudyDeskInput(goal) ||
				goal.area !== criterion.assertion.area
			)
				throw new StudyError('CONFIG', 'Malformed desk assertion')
		}
	}

	/**
	 * Opens the desk driver over the admitted capabilities.
	 * @param options - The admitted namespaces, the profile, and the scratch parent
	 * @returns The driver
	 */
	driver(options: StudyDriverOptions): StudyDriverInterface {
		return new StudyDeskDriver(options)
	}

	/**
	 * Grades every scheduled request from its retained calls.
	 * @param input - The sealed observations and the selected rubric
	 * @returns One judgment per trial and criterion
	 */
	grade(input: StudyAdjudication): readonly StudyJudgment[] {
		return gradeStudyEvidence(input, readStudyDeskGrade)
	}

	/**
	 * Reads one listed goal's rows into the line `study progress` lists.
	 * @param target - The trial, the goal, and exactly that goal's rows
	 * @returns The goal's calls, loads, turns, and result
	 */
	progress(target: StudyProgressTarget): JSONValue {
		return readStudyDeskProgress(target.evidence)
	}
}
