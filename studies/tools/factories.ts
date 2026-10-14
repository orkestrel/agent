import type { StudyAdapterInterface } from '@orkestrel/study/server'
import { StudyToolsAdapter } from './StudyToolsAdapter.js'

/** Creates this consumer's mechanism adapter without loading its selected subject.
 * @returns Domain validation, isolated driver construction, and evidence grading.
 */
export function createStudyAdapter(): StudyAdapterInterface {
	return new StudyToolsAdapter()
}
