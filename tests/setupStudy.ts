import type {
	StudyCriterion,
	StudyDefinition,
	StudyGrading,
	StudyJudgment,
	StudyManifest,
	StudyProfile,
	StudyRubric,
	StudyScenario,
	StudyTrial,
} from '../app/core/studies/types.js'
import { buildStudySchedule } from '../app/core/studies/helpers.js'

/** Returns a declared two-arm, two-scenario, two-repetition population. */
export function buildStudyDefinition(change: Partial<StudyDefinition> = {}): StudyDefinition {
	return {
		name: 'study',
		version: '1',
		question: 'Does state survive?',
		purpose: 'quality',
		driver: 'memory',
		arms: ['small', 'large'],
		scenarios: ['first', 'second'],
		order: [
			['large', 'small'],
			['small', 'large'],
		],
		retries: 0,
		rubric: '1',
		...change,
	}
}

/** Returns a two-goal scenario with public JSON inputs. */
export function buildStudyScenario(id = 'first'): StudyScenario {
	return {
		id,
		goals: [
			{ id: 'write', input: { text: 'remember' } },
			{ id: 'read', input: ['recall'] },
		],
	}
}

/** Returns a rubric covering both declared scenarios and goals. */
export function buildStudyRubric(): StudyRubric {
	return {
		version: '1',
		criteria: ['first', 'second'].flatMap((scenario): readonly StudyCriterion[] => [
			{
				id: `${scenario}-write`,
				scenario,
				goal: 'write',
				method: 'state',
				critical: true,
				assertion: { equals: 'remember' },
			},
			{
				id: `${scenario}-read`,
				scenario,
				goal: 'read',
				method: 'semantic',
				critical: false,
				assertion: { relevant: true },
			},
		]),
	}
}

/** Returns a profile whose request and output allowances fit the room. */
export function buildStudyProfile(): StudyProfile {
	const request = { duration: 100, calls: 1, tokens: 100, bytes: 100 }
	return {
		name: 'local',
		subject: 'subject-v1',
		roots: ['dist'],
		bounds: {
			request,
			goal: { ...request, calls: 2 },
			trial: { ...request, calls: 4 },
			series: { ...request, calls: 32 },
		},
		room: { context: 512, output: 32, safety: 16, recap: 32, think: false },
		provider: undefined,
		qualification: undefined,
	}
}

/** Returns a complete sealed declaration with its real schedule. */
export function buildStudyManifest(): StudyManifest {
	const definition = buildStudyDefinition()
	const scenarios = [buildStudyScenario(), buildStudyScenario('second')]
	const profile = buildStudyProfile()
	return {
		version: 1,
		id: 'a'.repeat(64),
		created: '2026-10-14T12:00:00.000Z',
		definition,
		scenarios,
		identity: {
			subject: 'a'.repeat(64),
			provider: undefined,
			instrument: 'b'.repeat(64),
			fixtures: 'c'.repeat(64),
			profile: 'd'.repeat(64),
		},
		schedule: buildStudySchedule(definition, scenarios),
		bounds: profile.bounds,
		qualification: undefined,
		host: {},
	}
}

/** Returns independently attributed grading over the supplied scheduled attempts. */
export function buildStudyGrading(
	schedule: readonly StudyTrial[],
	judgments: readonly StudyJudgment[] = [],
): StudyGrading {
	return {
		version: 1,
		result: 'a'.repeat(64),
		rubric: 'b'.repeat(64),
		grader: 'grader-v1',
		instrument: 'c'.repeat(64),
		attempts: schedule.map((trial) => trial.id),
		labels: undefined,
		judgments,
	}
}

/** Returns an evidence-backed judgment with an explicit verdict and method. */
export function buildStudyJudgment(
	trial: string,
	criterion = 'first-write',
	verdict: StudyJudgment['verdict'] = 'achieved',
	method: StudyJudgment['method'] = 'state',
): StudyJudgment {
	return {
		trial,
		criterion,
		verdict,
		method,
		reason: 'Recorded evidence',
		references: ['attempts/trace.ndjson#1'],
	}
}
