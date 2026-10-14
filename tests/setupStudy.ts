import type {
	StudyAttempt,
	StudyBounds,
	StudyGrading,
	StudyJudgment,
	StudyManifest,
	StudyTrial,
} from '@orkestrel/study'
import type { StudyMeterFixture } from './service/studies/tools/types.js'
import { StudyControl, StudyMeter, StudyScope } from '@orkestrel/study'

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

/** Creates real scopes and request admission with one lifecycle owner.
 * @param bounds - Per-scope limit overrides.
 * @param signal - Optional parent cancellation.
 * @returns Owned control, scopes, and meter with cleanup.
 */
export function createStudyMeterFixture(
	bounds: Partial<StudyBounds> = {},
	signal?: AbortSignal,
): StudyMeterFixture {
	const limit = { duration: 1000, calls: 4, tokens: 100, bytes: 100 }
	const control = new StudyControl(signal)
	const scopes = [
		new StudyScope({ limit: bounds.goal ?? limit, control, label: 'Goal' }),
		new StudyScope({ limit: bounds.trial ?? limit, control, label: 'Trial' }),
		new StudyScope({ limit: bounds.series ?? limit, control, label: 'Series' }),
	]
	const meter = new StudyMeter({
		request: bounds.request ?? { ...limit, calls: 1 },
		scopes,
		control,
	})
	return Object.freeze({
		control,
		scopes: Object.freeze(scopes),
		meter,
		close(): void {
			meter.close()
			for (const scope of scopes) scope.close()
			control.close()
		},
	})
}

/**
 * Builds a complete terminal horizon from the supplied scheduled trial.
 * @param manifest - The authoritative goal horizon
 * @param trial - The scheduled trial
 * @returns The inert terminal record
 */
export function buildCustodyAttempt(manifest: StudyManifest, trial: StudyTrial): StudyAttempt {
	const scenario = manifest.scenarios.find((entry) => entry.id === trial.scenario)
	if (scenario === undefined) throw new Error('Fixture trial has no scenario')
	return {
		trial,
		observations: scenario.goals.map((goal) => ({
			goal: goal.id,
			product: { value: 'remember', partial: false },
			failure: undefined,
			usage: [],
			duration: 0,
		})),
		failure: undefined,
		duration: 0,
	}
}
