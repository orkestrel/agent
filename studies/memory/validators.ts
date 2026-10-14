import type {
	StudyMemoryArm,
	StudyMemoryAssertion,
	StudyMemoryInput,
	StudyMemoryProvider,
	StudyMemorySubject,
} from './types.js'
import { holds, isArray, isObject, isRecord } from '@orkestrel/contract'
import { STUDY_MEMORY_ENTRIES, STUDY_MEMORY_TEXT } from './constants.js'

/** Checks the admitted Agent factory surface. @param value - Admitted namespace. @returns Whether the required exports exist. */
export function isStudyMemorySubject(value: unknown): value is StudyMemorySubject {
	return holds(
		() =>
			isObject(value) &&
			'Agent' in value &&
			typeof value.Agent === 'function' &&
			'createLedger' in value &&
			typeof value.createLedger === 'function' &&
			'createConversationManager' in value &&
			typeof value.createConversationManager === 'function' &&
			'estimateMessages' in value &&
			typeof value.estimateMessages === 'function' &&
			'LEDGER_QUESTIONS' in value &&
			isObject(value.LEDGER_QUESTIONS),
	)
}

/** Checks the admitted Ollama factory surface. @param value - Admitted namespace. @returns Whether both public factories exist. */
export function isStudyMemoryProvider(value: unknown): value is StudyMemoryProvider {
	return holds(
		() =>
			isObject(value) &&
			'createOllama' in value &&
			typeof value.createOllama === 'function' &&
			'createOllamaJudge' in value &&
			typeof value.createOllamaJudge === 'function',
	)
}

/** Checks a supported memory arm. @param value - Trial arm. @returns Whether this driver implements the treatment. */
export function isStudyMemoryArm(value: unknown): value is StudyMemoryArm {
	return value === 'records' || value === 'compaction' || value === 'full'
}

/** Checks bounded public goal input. @param value - Public JSON input. @returns Whether messages and references are valid. */
export function isStudyMemoryInput(value: unknown): value is StudyMemoryInput {
	return holds(() => {
		if (
			!isRecord(value) ||
			typeof value.prompt !== 'string' ||
			value.prompt.length === 0 ||
			value.prompt.length > STUDY_MEMORY_TEXT ||
			!isArray(value.arrivals) ||
			value.arrivals.length > STUDY_MEMORY_ENTRIES ||
			!isArray(value.records) ||
			value.records.length > STUDY_MEMORY_ENTRIES
		)
			return false
		const ids = new Set<string>()
		for (const arrival of value.arrivals) {
			if (
				!isRecord(arrival) ||
				typeof arrival.id !== 'string' ||
				arrival.id.length === 0 ||
				arrival.id.length > 128 ||
				ids.has(arrival.id) ||
				typeof arrival.content !== 'string' ||
				arrival.content.length > STUDY_MEMORY_TEXT
			)
				return false
			ids.add(arrival.id)
		}
		ids.clear()
		for (const record of value.records) {
			if (
				!isRecord(record) ||
				typeof record.id !== 'string' ||
				record.id.length === 0 ||
				record.id.length > 128 ||
				ids.has(record.id) ||
				typeof record.name !== 'string' ||
				record.name.length > 128 ||
				typeof record.content !== 'string' ||
				record.content.length > STUDY_MEMORY_TEXT
			)
				return false
			ids.add(record.id)
		}
		return true
	})
}

/** Checks a mechanical assertion. @param value - Independent rubric assertion. @returns Whether the assertion is supported. */
export function isStudyMemoryAssertion(value: unknown): value is StudyMemoryAssertion {
	return holds(() => {
		if (!isRecord(value)) return false
		if (value.observation === 'operational' || value.observation === 'summary') return true
		if (value.observation === 'result') return typeof value.partial === 'boolean'
		return (
			(value.observation === 'arrival' || value.observation === 'lookup') &&
			typeof value.id === 'string'
		)
	})
}
