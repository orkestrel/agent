import type { StudyDriverInterface, StudyJudgment } from '@orkestrel/study'
import type {
	StudyAdapterInterface,
	StudyAdjudication,
	StudyDriverOptions,
	StudyValidation,
} from '@orkestrel/study/server'
import { StudyError } from '@orkestrel/study'
import { gradeStudyEvidence } from '@orkestrel/study/server'
import {
	readStudyMemoryCompaction,
	readStudyMemoryGrade,
	validateStudyMemoryProfile,
} from './helpers.js'
import { StudyMemoryDriver } from './StudyMemoryDriver.js'
import { isStudyMemoryArm, isStudyMemoryAssertion, isStudyMemoryInput } from './validators.js'

/** Validates and grades the prospective memory study without exposing its rubric to execution. */
export class StudyMemoryAdapter implements StudyAdapterInterface {
	/** Validates public inputs, memory arms and independent criteria offline. @param input - Parsed generic declarations. */
	validate(input: StudyValidation): void {
		const arms = input.definition.arms.filter(isStudyMemoryArm)
		if (input.definition.driver !== 'memory' || arms.length !== input.definition.arms.length)
			throw new StudyError(
				'CONFIG',
				'Memory declaration requires the shared memory driver and supported arms',
			)
		validateStudyMemoryProfile(input.profile, arms)
		if (arms.includes('compaction')) readStudyMemoryCompaction(input.profile)
		if (input.definition.purpose === 'quality' && input.profile.qualification === undefined)
			throw new StudyError('CONFIG', 'Memory quality requires a sealed capacity qualification')
		for (const scenario of input.scenarios)
			for (const goal of scenario.goals)
				if (!isStudyMemoryInput(goal.input))
					throw new StudyError('CONFIG', 'Malformed public memory goal')
		for (const criterion of input.rubric.criteria) {
			if (criterion.method !== 'semantic' && !isStudyMemoryAssertion(criterion.assertion))
				throw new StudyError('CONFIG', 'Unsupported memory mechanism assertion')
			if (
				input.definition.purpose === 'capacity' &&
				(criterion.method === 'semantic' ||
					!isStudyMemoryAssertion(criterion.assertion) ||
					criterion.assertion.observation !== 'operational')
			)
				throw new StudyError('CONFIG', 'Capacity criteria must measure operational completion only')
		}
	}
	/** Constructs the consumer over admitted modules. @param options - Public driver dependencies. @returns The shared memory driver. */
	driver(options: StudyDriverOptions): StudyDriverInterface {
		return new StudyMemoryDriver(options)
	}
	/** Reads retained mechanics separately from semantic labels. @param input - Independent grading inputs. @returns Mechanical judgments and semantic unknowns. */
	grade(input: StudyAdjudication): readonly StudyJudgment[] {
		return gradeStudyEvidence(input, readStudyMemoryGrade)
	}
}
