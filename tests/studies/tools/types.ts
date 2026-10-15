import type {
	StudyManifest,
	StudyProfile,
	StudyRubric,
	StudyControl,
	StudyMeter,
	StudyScope,
} from '@orkestrel/study'

/** Holds actual declarations and the existing built Agent used by CPU tool proofs, as both the runtime and the tested subject. */
export interface StudyToolsFixture {
	readonly manifest: StudyManifest
	readonly rubric: StudyRubric
	readonly profile: StudyProfile
	readonly agent: unknown
	readonly subject: unknown
}

/** Holds real request admission and its single cleanup owner. */
export interface StudyMeterFixture {
	readonly control: StudyControl
	readonly meter: StudyMeter
	readonly scopes: readonly StudyScope[]
	close(): void
}
