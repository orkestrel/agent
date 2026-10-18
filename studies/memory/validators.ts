import type {
	StudyMemoryArm,
	StudyMemoryAssertion,
	StudyMemoryClassifier,
	StudyMemoryInput,
	StudyMemoryLedger,
	StudyMemoryOptions,
	StudyMemoryProvider,
	StudyMemoryRuntime,
} from './types.js'
import { holds, isArray, isBoolean, isFiniteNumber, isObject, isRecord } from '@orkestrel/contract'
import { isStudyAgentRuntime } from '@orkestrel/study'
import { STUDY_MEMORY_ENTRIES, STUDY_MEMORY_TEXT } from './constants.js'

/** Checks the admitted Agent runtime every memory arm invokes. @param value - Admitted namespace. @returns Whether the shared runtime capabilities and the Agent and conversation factories exist. */
export function isStudyMemoryRuntime(value: unknown): value is StudyMemoryRuntime {
	return holds(
		() =>
			isStudyAgentRuntime(value) &&
			'Agent' in value &&
			typeof value.Agent === 'function' &&
			'createConversationManager' in value &&
			typeof value.createConversationManager === 'function',
	)
}

/** Checks the admitted Agent capabilities only the records arm invokes. @param value - Admitted namespace. @returns Whether the Ledger factory and its question set exist. */
export function isStudyMemoryLedger(value: unknown): value is StudyMemoryLedger {
	return holds(
		() =>
			isObject(value) &&
			'createLedger' in value &&
			typeof value.createLedger === 'function' &&
			'LEDGER_QUESTIONS' in value &&
			isObject(value.LEDGER_QUESTIONS),
	)
}

/** Checks the driver-owned settings exactly. @param value - Profile settings. @returns Whether every present member is valid and no member is unknown. */
export function isStudyMemoryOptions(value: unknown): value is StudyMemoryOptions {
	return holds(() => {
		if (!isRecord(value)) return false
		if (
			Object.keys(value).some(
				(key) => !['gauge', 'observe', 'checkpoints', 'rolling'].includes(key),
			)
		)
			return false
		const { gauge, observe, checkpoints, rolling } = value
		if (rolling !== undefined && !isBoolean(rolling)) return false
		if (gauge !== undefined) {
			if (
				!isRecord(gauge) ||
				Object.keys(gauge).length !== 2 ||
				!isFiniteNumber(gauge.scale) ||
				gauge.scale <= 0 ||
				!isFiniteNumber(gauge.overhead) ||
				gauge.overhead < 0
			)
				return false
		}
		if (observe !== undefined && !isBoolean(observe)) return false
		if (checkpoints === undefined) return true
		return (
			observe === true &&
			isArray(checkpoints) &&
			checkpoints.length <= 12 &&
			new Set(checkpoints).size === checkpoints.length &&
			checkpoints.every(
				(checkpoint) =>
					typeof checkpoint === 'string' && checkpoint.length > 0 && checkpoint.length <= 128,
			)
		)
	})
}

/** Checks the admitted Ollama surface every memory arm invokes. @param value - Admitted namespace. @returns Whether the provider factory and the timing extractor exist. */
export function isStudyMemoryProvider(value: unknown): value is StudyMemoryProvider {
	return holds(
		() =>
			isObject(value) &&
			'createOllama' in value &&
			typeof value.createOllama === 'function' &&
			'extractTiming' in value &&
			typeof value.extractTiming === 'function',
	)
}

/** Checks the admitted Ollama capability only the records arm invokes. @param value - Admitted namespace. @returns Whether the judge factory exists. */
export function isStudyMemoryClassifier(value: unknown): value is StudyMemoryClassifier {
	return holds(
		() =>
			isObject(value) &&
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
		const { arrivals, records } = value
		// Each list is shaped first, so the identifier read below always meets a string.
		return (
			arrivals.every(
				(arrival) =>
					isRecord(arrival) &&
					typeof arrival.id === 'string' &&
					arrival.id.length > 0 &&
					arrival.id.length <= 128 &&
					typeof arrival.content === 'string' &&
					arrival.content.length <= STUDY_MEMORY_TEXT,
			) &&
			new Set(arrivals.map((arrival) => (isRecord(arrival) ? arrival.id : undefined))).size ===
				arrivals.length &&
			records.every(
				(record) =>
					isRecord(record) &&
					typeof record.id === 'string' &&
					record.id.length > 0 &&
					record.id.length <= 128 &&
					typeof record.name === 'string' &&
					record.name.length <= 128 &&
					typeof record.content === 'string' &&
					record.content.length <= STUDY_MEMORY_TEXT,
			) &&
			new Set(records.map((record) => (isRecord(record) ? record.id : undefined))).size ===
				records.length
		)
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
