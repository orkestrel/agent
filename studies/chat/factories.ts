import type { StudyAdapterInterface } from '@orkestrel/study/server'
import { StudyChatAdapter } from './adapters/StudyChatAdapter.js'

/** Creates the captured CLI adapter for the sealed chat instrument.
 * @example createStudyAdapter().validate(declaration)
 */
export function createStudyAdapter(): StudyAdapterInterface {
	return new StudyChatAdapter()
}
