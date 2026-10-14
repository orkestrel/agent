import type { StudyAdapterInterface } from '@orkestrel/study/server'
import { StudyMemoryAdapter } from './StudyMemoryAdapter.js'

/** Creates the authored adapter loaded by the study host. @returns The memory domain adapter. */
export function createStudyAdapter(): StudyAdapterInterface {
	return new StudyMemoryAdapter()
}
