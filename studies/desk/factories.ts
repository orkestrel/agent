import type { StudyAdapterInterface } from '@orkestrel/study/server'
import { StudyDeskAdapter } from './adapters/StudyDeskAdapter.js'

/** Creates the captured CLI adapter for the desk disclosure instrument.
 * @example createStudyAdapter().validate(declaration)
 */
export function createStudyAdapter(): StudyAdapterInterface {
	return new StudyDeskAdapter()
}
