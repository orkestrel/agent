import type {
	StudyManifest,
	StudyProfile,
	StudyRubric,
} from '../../../../../app/core/studies/types.js'

/** Holds actual declarations and the existing built subject used by CPU tool proofs. */
export interface StudyToolsFixture {
	readonly manifest: StudyManifest
	readonly rubric: StudyRubric
	readonly profile: StudyProfile
	readonly subject: unknown
}
