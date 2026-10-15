import type { StudyDriverInterface, StudyJudgment } from '@orkestrel/study'
import type {
	StudyAdapterInterface,
	StudyAdjudication,
	StudyDriverOptions,
	StudyValidation,
} from '@orkestrel/study/server'
import { StudyError } from '@orkestrel/study'
import { gradeStudyTools, validateStudyToolsRubric } from './helpers.js'
import { isStudyToolsInput } from './validators.js'
import { StudyToolsDriver } from './StudyToolsDriver.js'

/** Supplies actual Agent and Tool mechanism checks to the optional study host. */
export class StudyToolsAdapter implements StudyAdapterInterface {
	/** Checks this consumer's workload and predicate contracts before subject loading.
	 * @param input - Parsed generic declarations.
	 */
	validate(input: StudyValidation): void {
		if (
			input.definition.driver !== 'tools' ||
			input.definition.purpose !== 'mechanism' ||
			input.definition.arms.some((arm) => arm !== 'agent') ||
			input.profile.provider !== undefined ||
			input.profile.qualification !== undefined ||
			!input.scenarios.every((scenario) =>
				scenario.goals.every((goal) => isStudyToolsInput(goal.input)),
			)
		)
			throw new StudyError('CONFIG', 'Unsupported tools mechanism declaration')
		validateStudyToolsRubric(input.rubric)
	}

	/** Constructs the actual tools driver over the admitted built Agent namespace.
	 * @param options - Admitted modules and the exclusive scratch parent.
	 * @returns A fresh driver whose trials own their resources.
	 */
	driver(options: StudyDriverOptions): StudyDriverInterface {
		if (options.provider !== undefined)
			throw new StudyError('CONFIG', 'Tools mechanism uses its declared scripted provider')
		return new StudyToolsDriver({
			agent: options.agent,
			subject: options.subject,
			directory: options.directory,
		})
	}

	/** Grades independent state and trace predicates against retained observations.
	 * @param input - Sealed execution evidence and selected criteria.
	 * @returns Readings with exact evidence references and honest unknowns.
	 */
	grade(input: StudyAdjudication): readonly StudyJudgment[] {
		return gradeStudyTools(input)
	}
}
