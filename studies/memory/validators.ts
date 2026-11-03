import type {
	StudyMemoryArm,
	StudyMemoryAssertion,
	StudyMemoryCheckpoint,
	StudyMemoryClassifier,
	StudyMemoryInput,
	StudyMemoryLedger,
	StudyMemoryOptions,
	StudyMemoryProvider,
	StudyMemoryRuntime,
	StudyMemoryWire,
} from './types.js'
import {
	arrayOf,
	holds,
	isArray,
	isBoolean,
	isFiniteNumber,
	isNonEmptyString,
	isNonNegativeInteger,
	isObject,
	isRecord,
	isString,
	recordOf,
} from '@orkestrel/contract'
import { isStudyAgentRuntime } from '@orkestrel/study'
import { isStudyOllamaMetadata } from '@orkestrel/study/server'
import { STUDY_MEMORY_ENTRIES, STUDY_MEMORY_TEXT } from './constants.js'

/** Checks the admitted Agent runtime every memory arm invokes. @param value - Admitted namespace. @returns Whether the shared runtime capabilities and the Agent, conversation and authority factories exist. */
export function isStudyMemoryRuntime(value: unknown): value is StudyMemoryRuntime {
	return holds(
		() =>
			isStudyAgentRuntime(value) &&
			'Agent' in value &&
			typeof value.Agent === 'function' &&
			'createConversationManager' in value &&
			typeof value.createConversationManager === 'function' &&
			'createAuthority' in value &&
			typeof value.createAuthority === 'function',
	)
}

/** Checks the admitted Agent capabilities only the records arm invokes. @param value - Admitted namespace. @returns Whether the Ledger factory, its question set and its repeat note exist. */
export function isStudyMemoryLedger(value: unknown): value is StudyMemoryLedger {
	return holds(
		() =>
			isObject(value) &&
			'createLedger' in value &&
			typeof value.createLedger === 'function' &&
			'LEDGER_QUESTIONS' in value &&
			isObject(value.LEDGER_QUESTIONS) &&
			'LEDGER_NOTES' in value &&
			isObject(value.LEDGER_NOTES) &&
			'repeat' in value.LEDGER_NOTES &&
			typeof value.LEDGER_NOTES.repeat === 'string',
	)
}

/** Checks the driver-owned settings exactly. @param value - Profile settings. @returns Whether every present member is valid and no member is unknown. */
export function isStudyMemoryOptions(value: unknown): value is StudyMemoryOptions {
	return holds(() => {
		if (!isRecord(value)) return false
		if (
			Object.keys(value).some(
				(key) =>
					![
						'gauge',
						'observe',
						'checkpoints',
						'rolling',
						'version',
						'metadata',
						'correction',
						'seed',
						'moving',
						'sham',
					].includes(key),
			)
		)
			return false
		const {
			gauge,
			observe,
			checkpoints,
			rolling,
			version,
			metadata,
			correction,
			seed,
			moving,
			sham,
		} = value
		if (rolling !== undefined && !isBoolean(rolling)) return false
		if (seed !== undefined && !isNonNegativeInteger(seed)) return false
		if (moving !== undefined && !isBoolean(moving)) return false
		if (sham !== undefined && !isBoolean(sham)) return false
		if (version !== undefined && !isNonEmptyString(version)) return false
		if (metadata !== undefined && !isStudyOllamaMetadata(metadata)) return false
		if (
			correction !== undefined &&
			!recordOf({ limit: isNonNegativeInteger, narrow: isBoolean }, true)(correction)
		)
			return false
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
			new Set(checkpoints).size === checkpoints.length &&
			checkpoints.every(
				(checkpoint) =>
					typeof checkpoint === 'string' && checkpoint.length > 0 && checkpoint.length <= 128,
			)
		)
	})
}

/**
 * Checks a checkpoint's shape, because Agent stays types-only in the bundle.
 * @remarks
 * The admitted `createLedger` and `conversations.add` refuse a malformed state member with their coded `SNAPSHOT` errors; nothing later reads the released records or the arrival ids, so this guard checks each entry.
 * @param value - The value Study hands over at `open`.
 * @returns Whether exactly one state member is a record and the records and arrivals are shaped.
 */
export function isStudyMemoryCheckpoint(value: unknown): value is StudyMemoryCheckpoint {
	return holds(() => {
		if (!isRecord(value)) return false
		const { ledger, conversation, records, arrivals } = value
		return (
			(ledger === undefined
				? isRecord(conversation)
				: isRecord(ledger) && conversation === undefined) &&
			arrayOf(recordOf({ id: isString, name: isString, content: isString }))(records) &&
			arrayOf(isString)(arrivals)
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

/** Checks the members of a Study `wire` value the instruments read. @param value - Evidence value of a `wire` row. @returns Whether `role` is a string, any present `prompt` and `completion` are each a finite number or `null`, and any present timing holds `prompt` and `cached` counts and any `total` duration that are each a finite number or `null`. */
export function isStudyMemoryWire(value: unknown): value is StudyMemoryWire {
	return holds(() => {
		if (!isRecord(value) || typeof value.role !== 'string') return false
		for (const count of [value.prompt, value.completion])
			if (count !== undefined && count !== null && !isFiniteNumber(count)) return false
		const timing = value.timing
		if (timing === undefined || timing === null) return true
		if (!isRecord(timing) || !isRecord(timing.counts)) return false
		const { prompt, cached } = timing.counts
		const durations = timing.durations
		if (
			durations !== undefined &&
			(!isRecord(durations) || (durations.total !== null && !isFiniteNumber(durations.total)))
		)
			return false
		return (
			(prompt === null || isFiniteNumber(prompt)) && (cached === null || isFiniteNumber(cached))
		)
	})
}
