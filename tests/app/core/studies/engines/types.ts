import type {
	StudyControl,
	StudyMeter,
	StudyScope,
} from '../../../../../app/core/studies/engines/index.js'

/** Holds real admission primitives and their owned cleanup boundary. */
export interface StudyMeterFixture {
	readonly control: StudyControl
	readonly scopes: readonly StudyScope[]
	readonly meter: StudyMeter
	close(): void
}
