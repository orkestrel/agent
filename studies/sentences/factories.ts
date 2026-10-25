import type { StudyAdapterInterface } from '@orkestrel/study/server'
import { StudySentenceAdapter } from './StudySentenceAdapter.js'

/** Creates the consumer boundary the Study host loads. @returns Frozen-input validation, isolated execution, and independent grading. */
export function createStudyAdapter(): StudyAdapterInterface {
	return new StudySentenceAdapter()
}
