import type {
	StudyManifest,
	StudyProfile,
	StudyRubric,
	StudyControl,
	StudyMeter,
	StudyScope,
} from '@orkestrel/study'

/** Holds actual declarations and the existing built subject used by CPU tool proofs. */
export interface StudyToolsFixture {
	readonly manifest: StudyManifest
	readonly rubric: StudyRubric
	readonly profile: StudyProfile
	readonly subject: unknown
}

/** Holds real request admission and its single cleanup owner. */
export interface StudyMeterFixture {
	readonly control: StudyControl
	readonly meter: StudyMeter
	readonly scopes: readonly StudyScope[]
	close(): void
}
