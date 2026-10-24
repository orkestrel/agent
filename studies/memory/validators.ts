import type {
	StudyMemoryArm,
	StudyMemoryAssertion,
	StudyMemoryClassifier,
	StudyMemoryInput,
	StudyMemoryLedger,
	StudyMemoryOptions,
	StudyMemoryProvider,
	StudyMemoryRuntime,
	StudyMemoryReceipt,
	StudyMemoryResult,
	StudyMemoryDeclaration,
	StudyMemoryLedgerOptions,
	StudyMemoryLookupOptions,
	StudyMemoryInstructionOptions,
	StudyMemoryProvenance,
} from './types.js'
import type { AgentStop, LedgerReceipt } from '@orkestrel/agent'
import {
	holds,
	isArray,
	isBoolean,
	isFiniteNumber,
	isObject,
	isRecord,
	objectOf,
	recordOf,
	arrayOf,
	isString,
	isNumber,
	isNonNegativeInteger,
	optionalOf,
} from '@orkestrel/contract'
import { isTokenUsage } from '@orkestrel/budget'
import { isStudyAgentRuntime } from '@orkestrel/study'
import { isStudyOllamaMetadata, isStudyOllamaStep } from '@orkestrel/study/server'
import {
	STUDY_MEMORY_ENTRIES,
	STUDY_MEMORY_TEXT,
	STUDY_MEMORY_LEDGER_KEYS,
	STUDY_MEMORY_LOOKUP_KEYS,
	STUDY_MEMORY_INSTRUCTION_KEYS,
} from './constants.js'

/** Checks the declared boolean instruction settings. @param value - The instruction group. @returns True if every key is admitted and boolean; false otherwise. */
export function isStudyMemoryInstructionOptions(
	value: unknown,
): value is StudyMemoryInstructionOptions {
	return holds(
		() =>
			isRecord(value) &&
			Object.keys(value).every(
				(key) =>
					STUDY_MEMORY_INSTRUCTION_KEYS.some((known) => known === key) && isBoolean(value[key]),
			),
	)
}

/** Checks the declared boolean lookup settings. @param value - The lookup group. @returns True if every key is admitted and boolean; false otherwise. */
export function isStudyMemoryLookupOptions(value: unknown): value is StudyMemoryLookupOptions {
	return holds(
		() =>
			isRecord(value) &&
			Object.keys(value).every(
				(key) => STUDY_MEMORY_LOOKUP_KEYS.some((known) => known === key) && isBoolean(value[key]),
			),
	)
}

/** Checks exactly the declared boolean Ledger treatments. @param value - The settings group. @returns True if every present key is admitted and boolean; false otherwise. */
export function isStudyMemoryLedgerOptions(value: unknown): value is StudyMemoryLedgerOptions {
	return holds(
		() =>
			isRecord(value) &&
			Object.keys(value).every(
				(key) => STUDY_MEMORY_LEDGER_KEYS.some((known) => known === key) && isBoolean(value[key]),
			),
	)
}

/** Checks retained message provenance without inferring a source from text. @param value - A context origin entry. @returns True if its origin and optional source are shaped; false otherwise. */
export function isStudyMemoryProvenance(value: unknown): value is StudyMemoryProvenance {
	return objectOf({
		origin: (origin) =>
			origin === 'input' ||
			origin === 'arrival' ||
			origin === 'summary' ||
			origin === 'tool' ||
			origin === 'history' ||
			origin === 'instructions' ||
			origin === 'mixed' ||
			origin === 'unknown',
		source: optionalOf(isString),
	})(value)
}

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
				(key) =>
					![
						'gauge',
						'observe',
						'checkpoints',
						'rolling',
						'metadata',
						'version',
						'procedure',
						'ledger',
						'lookup',
						'instructions',
					].includes(key),
			)
		)
			return false
		const { gauge, observe, checkpoints, rolling, metadata, version, procedure, ledger } = value
		if ('ledger' in value && !isStudyMemoryLedgerOptions(ledger)) return false
		if ('lookup' in value && !isStudyMemoryLookupOptions(value.lookup)) return false
		if ('instructions' in value && !isStudyMemoryInstructionOptions(value.instructions))
			return false
		if (metadata !== undefined && !isStudyOllamaMetadata(metadata)) return false
		if (version !== undefined || procedure !== undefined) {
			if (typeof version !== 'string' || version.length === 0 || metadata === undefined)
				return false
		}
		if (
			procedure !== undefined &&
			(!isArray(procedure) ||
				procedure.length === 0 ||
				!procedure.every((step, index) => isStudyOllamaStep(step) && step.ordinal === index + 1))
		)
			return false
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

/** Checks the foreign stop members without inferring a stop from partial state. @param value - A stop reading. @returns True if the published stop contract holds; false otherwise. */
export function isStudyMemoryStop(value: unknown): value is AgentStop {
	return holds(
		() =>
			objectOf({
				layer: (layer) => layer === 'model' || layer === 'meter' || layer === 'budget',
				id: isString,
				estimate: optionalOf(isNumber),
				usage: optionalOf(isTokenUsage),
			})(value) &&
			(value.layer === 'model' || objectOf({ max: isNumber, consumed: isNumber })(value)),
	)
}

/** Checks the foreign ledger adoption and gauge evidence. @param value - A pass receipt. @returns True if every dereferenced receipt member holds; false otherwise. */
export function isStudyMemoryPass(value: unknown): value is LedgerReceipt {
	return objectOf({
		selections: arrayOf(
			objectOf({
				turn: optionalOf(isNumber),
				tail: arrayOf(isString),
				prior: arrayOf(isString),
				plan: optionalOf(
					objectOf({
						owners: arrayOf(isString),
						filed: arrayOf(isString),
						rendered: arrayOf(isString),
						omitted: arrayOf(isString),
						trims: isNumber,
						sentences: arrayOf(objectOf({ source: isString, sentence: isNumber })),
						withdrawn: arrayOf(objectOf({ earlier: isString, later: isString })),
					}),
				),
				sources: arrayOf(
					objectOf({
						source: isString,
						carriage: (carriage) =>
							carriage === undefined ||
							carriage === 'verbatim' ||
							carriage === 'record' ||
							carriage === 'recap' ||
							carriage === 'absent',
					}),
				),
			}),
		),
		calls: arrayOf(
			objectOf({
				selection: optionalOf(isNumber),
				estimate: isNumber,
				tools: isNumber,
				prompt: optionalOf(isNumber),
				completion: optionalOf(isNumber),
				thinking: optionalOf(isNumber),
			}),
		),
	})(value)
}

/** Checks the owned foreign result members the consumer dereferences and narrows nothing. @remarks Foreign members retain their published types and admit unknown members; the consumer-owned receipt validates its joins and bounds separately. @param value - A resolved result. @returns True if request, passes and receipts align; false otherwise. */
export function isStudyMemoryResult(value: unknown): value is StudyMemoryResult {
	return holds(
		() =>
			objectOf({
				request: isString,
				receipts: arrayOf(isStudyMemoryPass),
				passes: arrayOf(objectOf({ stop: optionalOf(isStudyMemoryStop) })),
			})(value) && value.receipts.length === value.passes.length,
	)
}

/** Checks an independent goal's required-source declaration. @param value - A declaration before classification. @returns True if its source identities and product reading are shaped; false otherwise. */
export function isStudyMemoryDeclaration(value: unknown): value is StudyMemoryDeclaration {
	return recordOf(
		{
			goal: isString,
			sources: arrayOf(
				recordOf(
					{
						source: isString,
						owner: optionalOf(isString),
						sentences: arrayOf(isNonNegativeInteger),
					},
					['owner'],
				),
			),
			product: optionalOf(isBoolean),
		},
		['product'],
	)(value)
}

/** Checks a selection evidence value and its exact tail joins. @param value - An evidence value. @returns True if the row is well formed and its dictionaries agree with its tails; false otherwise. */
export function isStudyMemoryReceipt(value: unknown): value is StudyMemoryReceipt {
	return holds(() => {
		if (
			!recordOf(
				{
					request: isString,
					messages: arrayOf(isString),
					pass: isNonNegativeInteger,
					role: (role) => role === 'agent',
					receipt: isStudyMemoryPass,
					arrivals: arrayOf(recordOf({ id: isString, message: isString })),
					recaps: arrayOf(isString),
					stop: optionalOf(isStudyMemoryStop),
				},
				['stop'],
			)(value)
		)
			return false
		const tail = new Set(value.receipt.selections.flatMap((selection) => selection.tail))
		const prior = new Set(value.receipt.selections.flatMap((selection) => selection.prior))
		const references = [
			value.request,
			...value.recaps,
			...value.receipt.selections.flatMap((selection) => [
				...selection.tail,
				...selection.prior,
				...selection.sources.map((source) => source.source),
				...(selection.plan === undefined
					? []
					: [
							...selection.plan.filed,
							...selection.plan.rendered,
							...selection.plan.omitted,
							...selection.plan.sentences.map((sentence) => sentence.source),
							...selection.plan.withdrawn.flatMap((pair) => [pair.earlier, pair.later]),
						]),
			]),
		]
		return (
			new Set(value.messages).size === value.messages.length &&
			references.every((id) => value.messages.includes(id)) &&
			Object.keys(value.receipt).every((key) => ['selections', 'calls'].includes(key)) &&
			value.receipt.selections.every(
				(selection) =>
					Object.keys(selection).every((key) =>
						['turn', 'tail', 'prior', 'plan', 'sources'].includes(key),
					) &&
					selection.prior.every((id) => selection.tail.includes(id) && id !== value.request) &&
					selection.sources.every((source) =>
						Object.keys(source).every((key) => ['source', 'carriage'].includes(key)),
					) &&
					(selection.plan === undefined ||
						(Object.keys(selection.plan).every((key) =>
							[
								'owners',
								'filed',
								'rendered',
								'sentences',
								'omitted',
								'trims',
								'withdrawn',
							].includes(key),
						) &&
							selection.plan.sentences.every((sentence) =>
								Object.keys(sentence).every((key) => ['source', 'sentence'].includes(key)),
							) &&
							selection.plan.withdrawn.every((pair) =>
								Object.keys(pair).every((key) => ['earlier', 'later'].includes(key)),
							))),
			) &&
			(value.stop === undefined ||
				(Object.keys(value.stop).every((key) =>
					['layer', 'id', 'max', 'consumed', 'estimate', 'usage'].includes(key),
				) &&
					(value.stop.usage === undefined ||
						Object.keys(value.stop.usage).every((key) =>
							['prompt', 'completion', 'total'].includes(key),
						)))) &&
			new Set(value.arrivals.map((arrival) => arrival.id)).size === value.arrivals.length &&
			new Set(value.arrivals.map((arrival) => arrival.message)).size === value.arrivals.length &&
			new Set(value.recaps).size === value.recaps.length &&
			value.arrivals.every(
				(arrival) =>
					tail.has(arrival.message) &&
					arrival.message !== value.request &&
					!prior.has(arrival.message),
			) &&
			value.recaps.every((id) => tail.has(id)) &&
			value.receipt.calls.every(
				(call) =>
					(call.selection === undefined || call.selection < value.receipt.selections.length) &&
					Object.keys(call).every((key) =>
						['selection', 'estimate', 'tools', 'prompt', 'completion', 'thinking'].includes(key),
					) &&
					[call.estimate, call.tools, call.prompt, call.completion, call.thinking].every(
						(reading) => reading === undefined || isFiniteNumber(reading),
					),
			)
		)
	})
}
