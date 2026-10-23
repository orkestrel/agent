import type { JSONValue } from '@orkestrel/contract'
import type { LedgerGauge, Message } from '@orkestrel/agent'
import type { StudyJudgment, StudyProfile, StudyProvider, StudyRoom } from '@orkestrel/study'
import type {
	StudyGradeReading,
	StudyGradeTarget,
	StudyOllamaTransportOptions,
	StudyReference,
} from '@orkestrel/study/server'
import type {
	StudyMemoryArm,
	StudyMemoryCompaction,
	StudyMemoryObservation,
	StudyMemoryProvenance,
	StudyMemoryProvenanceSource,
	StudyMemoryArrival,
	StudyMemoryReceipt,
	StudyMemoryEvidence,
	StudyMemoryClassification,
	StudyMemoryResult,
	StudyMemorySections,
} from './types.js'
import { isRecord, parseJSON, isJSONValue, isObject, isArray, attempt } from '@orkestrel/contract'
import { StudyError, isStudyProvider, isStudyRoom } from '@orkestrel/study'
import { STUDY_MEMORY_ROW_BYTES } from './constants.js'
import {
	isStudyMemoryAssertion,
	isStudyMemoryOptions,
	isStudyMemoryResult,
	isStudyMemoryReceipt,
	isStudyMemoryDeclaration,
} from './validators.js'

/** Captures each named foreign member once, including a public inherited member. @remarks Unlike the contract record-field reader, this boundary admits class implementations and produces an owned member envelope without retaining unknown members. @param value - The foreign object. @param members - Public members to capture. @returns A fresh member envelope. @throws StudyError - Thrown with FAULT when the container is not an object. */
export function readStudyMemoryMembers(
	value: unknown,
	members: readonly string[],
): Readonly<Record<string, unknown>> {
	if (!isObject(value)) throw new StudyError('FAULT', 'Malformed ledger selection container')
	return Object.fromEntries(members.map((member) => [member, Reflect.get(value, member)]))
}

/** Owns the foreign result fields the selection reader consumes before validation. @param result - A resolved foreign Ledger result. @returns Validated, independent receipt members with unknown members excluded. @throws StudyError - Thrown with FAULT when evidence cannot be captured or validated. */
export function buildStudyMemoryResult(result: unknown): StudyMemoryResult {
	const captured = attempt(() => {
		const root = readStudyMemoryMembers(result, ['request', 'receipts', 'passes'])
		return structuredClone({
			request: root.request,
			passes: !isArray(root.passes)
				? root.passes
				: root.passes.map((pass) => {
						const { stop } = readStudyMemoryMembers(pass, ['stop'])
						if (stop === undefined) return {}
						const reading = readStudyMemoryMembers(stop, [
							'layer',
							'id',
							'max',
							'consumed',
							'estimate',
							'usage',
						])
						return {
							stop: {
								...reading,
								usage:
									reading.usage === undefined
										? undefined
										: readStudyMemoryMembers(reading.usage, ['prompt', 'completion', 'total']),
							},
						}
					}),
			receipts: !isArray(root.receipts)
				? root.receipts
				: root.receipts.map((receipt) => {
						const pass = readStudyMemoryMembers(receipt, ['selections', 'calls'])
						return {
							calls: !isArray(pass.calls)
								? pass.calls
								: pass.calls.map((call) =>
										readStudyMemoryMembers(call, [
											'selection',
											'estimate',
											'tools',
											'prompt',
											'completion',
											'thinking',
										]),
									),
							selections: !isArray(pass.selections)
								? pass.selections
								: pass.selections.map((selection) => {
										const adopted = readStudyMemoryMembers(selection, [
											'turn',
											'tail',
											'prior',
											'plan',
											'sources',
										])
										const plan =
											adopted.plan === undefined
												? undefined
												: readStudyMemoryMembers(adopted.plan, [
														'owners',
														'filed',
														'rendered',
														'sentences',
														'omitted',
														'trims',
														'withdrawn',
													])
										return {
											...adopted,
											plan:
												plan === undefined
													? undefined
													: {
															...plan,
															sentences: !isArray(plan.sentences)
																? plan.sentences
																: plan.sentences.map((sentence) =>
																		readStudyMemoryMembers(sentence, ['source', 'sentence']),
																	),
															withdrawn: !isArray(plan.withdrawn)
																? plan.withdrawn
																: plan.withdrawn.map((pair) =>
																		readStudyMemoryMembers(pair, ['earlier', 'later']),
																	),
														},
											sources: !isArray(adopted.sources)
												? adopted.sources
												: adopted.sources.map((source) =>
														readStudyMemoryMembers(source, ['source', 'carriage']),
													),
										}
									}),
						}
					}),
		})
	})
	if (!captured.success || !isStudyMemoryResult(captured.value))
		throw new StudyError('FAULT', 'Malformed ledger selection result')
	return captured.value
}

/** Builds pass evidence from an owned resolved result and exact identity dictionaries. @param result - The foreign Ledger result; only receipt members are retained. @param arrivals - Arrival-message pairs retained by the session. @param snapshot - Section identities retained across the goal. @returns One independent receipt per pass. @throws StudyError - Thrown with FAULT when resolved evidence is malformed. */
export function buildStudyMemoryReceipts(
	result: unknown,
	arrivals: readonly StudyMemoryArrival[],
	snapshot: StudyMemorySections,
): readonly StudyMemoryReceipt[] {
	const owned = buildStudyMemoryResult(result)
	return owned.receipts.map((receipt, pass) => {
		const tail = new Set(receipt.selections.flatMap((selection) => selection.tail))
		const row: StudyMemoryReceipt = {
			request: owned.request,
			pass,
			role: 'agent',
			receipt,
			arrivals: arrivals
				.filter((arrival) => tail.has(arrival.message))
				.map(({ id, message }) => ({ id, message })),
			recaps: [
				...new Set(snapshot.sections.map((section) => section.id).filter((id) => tail.has(id))),
			],
			stop: owned.passes[pass]?.stop,
		}
		if (!isStudyMemoryReceipt(row))
			throw new StudyError('FAULT', 'Malformed selection identity joins')
		return row
	})
}

/** Measures a compact selection envelope including its newline in UTF-8 bytes. @param goal - The evidence goal. @param value - The selection value. @returns The serialized byte length. */
export function measureStudyMemoryEvidence(goal: string, value: unknown): number {
	return new TextEncoder().encode(`${JSON.stringify({ event: 'selection', goal, value })}\n`)
		.byteLength
}

/** Builds JSON selection evidence with absent members omitted and enforces its envelope bound. @param goal - The evidence goal. @param receipt - A validated pass receipt. @returns An independent JSON value suitable for the trace. @throws StudyError - Thrown with FAULT for malformed evidence or CAPACITY for an exceeded row bound. */
export function buildStudyMemoryEvidence(goal: string, receipt: StudyMemoryReceipt): JSONValue {
	if (!isStudyMemoryReceipt(receipt)) throw new StudyError('FAULT', 'Malformed selection evidence')
	const value = parseJSON(JSON.stringify(receipt))
	if (!isJSONValue(value) || !isStudyMemoryReceipt(value))
		throw new StudyError('FAULT', 'Selection evidence is not JSON')
	if (measureStudyMemoryEvidence(goal, value) > STUDY_MEMORY_ROW_BYTES)
		throw new StudyError('CAPACITY', 'Memory selection row exceeds the byte bound')
	return value
}

/** Classifies required source identities over retained selections for a goal. @remarks Each denominator is the declaration's nonempty required-source population. A correct source enters the ignored count only with an independently failing product reading. Recaps establish no original sentence carriage. @param evidence - Retained evidence envelopes. @param declaration - Independent goal requirements and optional product reading. @returns Failure counts with their required-source denominators. @throws StudyError - Thrown with CONFIG for a missing or empty denominator, or FAULT for missing or malformed evidence. */
export function classifyStudyMemorySelection(
	evidence: readonly StudyMemoryEvidence[],
	declaration: unknown,
): StudyMemoryClassification {
	if (
		!isStudyMemoryDeclaration(declaration) ||
		declaration.sources.length === 0 ||
		new Set(declaration.sources.map((source) => source.source)).size !== declaration.sources.length
	)
		throw new StudyError('CONFIG', 'Required-source denominator is missing, empty or duplicated')
	const rows = evidence.filter((row) => row.event === 'selection' && row.goal === declaration.goal)
	if (rows.length === 0)
		throw new StudyError('FAULT', 'Missing selection evidence for declared goal')
	const selections = rows.flatMap((row) => {
		if (!isStudyMemoryReceipt(row.value))
			throw new StudyError('FAULT', 'Malformed selection evidence')
		return row.value.receipt.selections
	})
	if (!selections.some((selection) => selection.plan !== undefined))
		throw new StudyError('FAULT', 'Missing filing evidence for declared goal')
	const classes = declaration.sources.map((required) => {
		const filed = selections.some((selection) => selection.plan?.filed.includes(required.source))
		const carried = selections.filter((selection) =>
			selection.sources.some(
				(source) =>
					source.source === required.source &&
					(source.carriage === 'record' || source.carriage === 'verbatim'),
			),
		)
		if (!filed) return 'unfiled'
		if (carried.length === 0) return 'unselected'
		const correct = carried.some(
			(selection) =>
				(required.owner === undefined ||
					selection.plan?.owners.includes(required.owner) === true) &&
				(selection.sources.some(
					(source) => source.source === required.source && source.carriage === 'verbatim',
				) ||
					(selection.plan?.rendered.includes(required.source) === true &&
						required.sentences.every((sentence) =>
							selection.plan?.sentences.some(
								(line) => line.source === required.source && line.sentence === sentence,
							),
						))),
		)
		if (!correct) return 'incorrect'
		return declaration.product === false ? 'ignored' : undefined
	})
	const denominator = declaration.sources.length
	return {
		unfiled: { count: classes.filter((category) => category === 'unfiled').length, denominator },
		unselected: {
			count: classes.filter((category) => category === 'unselected').length,
			denominator,
		},
		incorrect: {
			count: classes.filter((category) => category === 'incorrect').length,
			denominator,
		},
		ignored:
			declaration.product === undefined
				? undefined
				: { count: classes.filter((category) => category === 'ignored').length, denominator },
	}
}

/** Reads the explicit compaction gauge without supplying a fallback. @param settings - Profile settings. @returns A copy of the declared gauge. @throws StudyError - CONFIG when the settings are absent, malformed or declare no gauge. */
export function readStudyMemoryGauge(settings: unknown): LedgerGauge {
	if (!isStudyMemoryOptions(settings) || settings.gauge === undefined)
		throw new StudyError('CONFIG', 'Memory compaction requires an explicit settings gauge')
	return { scale: settings.gauge.scale, overhead: settings.gauge.overhead }
}

/** Reads the recap allowance only the compaction arm uses. @param room - Declared room. @returns The recap allowance. @throws StudyError - CONFIG when the room declares none. */
export function readStudyMemoryRecap(room: StudyRoom): number {
	if (room.recap === undefined)
		throw new StudyError('CONFIG', 'Memory compaction requires a declared recap allowance')
	return room.recap
}

/** Reads what only the compaction arm declares: its explicit gauge and recap allowance. @param profile - Runtime profile. @returns The gauge copy and the recap allowance. @throws StudyError - CONFIG when the gauge is absent or malformed, or the profile declares no recap allowance. */
export function readStudyMemoryCompaction(profile: StudyProfile): StudyMemoryCompaction {
	const gauge = readStudyMemoryGauge(profile.settings)
	return { gauge, recap: readStudyMemoryRecap(profile.room) }
}

/** Reads the judge model only the records arm uses. @param provider - Declared serving identities. @returns The judge model name. @throws StudyError - CONFIG when the judge model or its digest is not declared. */
export function readStudyMemoryJudge(provider: StudyProvider): string {
	if (provider.judge === undefined || provider.digest.judge === undefined)
		throw new StudyError('CONFIG', 'Memory records require a declared judge model and digest')
	return provider.judge
}

/** Resolves the passive observation switches from generic driver settings. @param settings - Optional profile settings. @returns Disabled observation unless `observe` is true; selected goal ids only while enabled. @throws StudyError - CONFIG when present settings are malformed. */
export function resolveStudyMemoryObservation(settings: unknown): StudyMemoryObservation {
	if (settings === undefined) return { observe: false, checkpoints: new Set() }
	if (!isStudyMemoryOptions(settings))
		throw new StudyError('CONFIG', 'Memory settings are malformed')
	const observe = settings.observe === true
	return { observe, checkpoints: new Set(observe ? (settings.checkpoints ?? []) : []) }
}

/** Reads one message's origin from session-held joins only, never from its text or position. @param message - A message of a measured request. @param source - The session's explicit ids, section ids and conversation membership. @returns The nonadditive origin; `unknown` when no join applies. */
export function readStudyMemoryProvenance(
	message: Message,
	source: StudyMemoryProvenanceSource,
): StudyMemoryProvenance {
	const explicit = source.explicit.get(message.id)
	if (explicit !== undefined) return explicit
	if (source.sections.has(message.id)) return { origin: 'summary', source: message.id }
	if (message.role === 'tool') return { origin: 'tool' }
	if (message.role === 'system')
		return source.composed ? { origin: 'mixed' } : { origin: 'instructions', source: 'desk' }
	return source.members.has(message.id) ? { origin: 'history' } : { origin: 'unknown' }
}

/** Builds the JSON origin annotations of a request's messages, aligned to them one to one. @param messages - The measured request's messages, duplicates included. @param source - The session's joins. @returns One origin object per message, with `source` only when known. */
export function buildStudyMemoryOrigins(
	messages: readonly Message[],
	source: StudyMemoryProvenanceSource,
): JSONValue {
	return messages.map((message) => {
		const found = readStudyMemoryProvenance(message, source)
		return found.source === undefined
			? { origin: found.origin }
			: { origin: found.origin, source: found.source }
	})
}

/** Checks well-formed driver settings, then the generic provider and room declarations through Study's guards, then what only the selected arms require. @param profile - Runtime profile. @param arms - The arms the study dispatches; the records arm requires a judge model and digest and the compaction arm a recap allowance. @returns Nothing when admitted. @throws StudyError - CONFIG when the settings, the provider declaration (exact digests and uncredentialed origin) or the room (positive finite integers leaving prompt capacity) is invalid, or an arm's requirement is not met. */
export function validateStudyMemoryProfile(
	profile: StudyProfile,
	arms: readonly StudyMemoryArm[],
): void {
	const { room, provider } = profile
	if (profile.settings !== undefined && !isStudyMemoryOptions(profile.settings))
		throw new StudyError('CONFIG', 'Memory settings are malformed')
	if (
		profile.record !== undefined &&
		(!isStudyMemoryOptions(profile.settings) ||
			profile.settings.version === undefined ||
			profile.settings.procedure === undefined ||
			profile.settings.metadata === undefined)
	)
		throw new StudyError(
			'CONFIG',
			'Memory recording requires version, metadata and procedure settings',
		)
	if (provider === undefined || !isStudyProvider(provider))
		throw new StudyError('CONFIG', 'Memory provider declaration is invalid')
	if (arms.includes('records') && provider.judge === undefined)
		throw new StudyError(
			'CONFIG',
			'Memory requires an exact judge model and digest where one is used',
		)
	if (!isStudyRoom(room)) throw new StudyError('CONFIG', 'Memory room declaration is invalid')
	if (arms.includes('compaction') && room.recap === undefined)
		throw new StudyError('CONFIG', 'Memory compaction requires a declared recap allowance')
}

/** Declares the exact wire policy of every model role one arm dispatches. @param profile - Runtime profile with serving identities and room. @param arm - The treatment; only compaction declares the summary role and the strict native flags, and only records declares the one-token judge. @returns The agent role, plus the summary role for compaction and the judge role for records. @throws StudyError - CONFIG when the profile declares no provider, or lacks what the arm's roles need. */
export function buildStudyMemoryRoles(
	profile: StudyProfile,
	arm: StudyMemoryArm,
): StudyOllamaTransportOptions['roles'] {
	const { provider, room } = profile
	if (provider === undefined) throw new StudyError('CONFIG', 'Memory provider is required')
	const compaction = arm === 'compaction'
	return {
		agent: {
			model: provider.model,
			options: { num_ctx: room.context, num_predict: room.output, temperature: 0, seed: 0 },
			think: room.think,
			strict: compaction,
			length: false,
		},
		...(compaction
			? {
					summary: {
						model: provider.model,
						options: {
							num_ctx: room.context,
							num_predict: readStudyMemoryRecap(room),
							temperature: 0,
							seed: 0,
						},
						think: false,
						strict: true,
						length: false,
					},
				}
			: {}),
		...(arm === 'records'
			? {
					judge: {
						model: readStudyMemoryJudge(provider),
						options: { num_ctx: room.context, num_predict: 1, temperature: 1, seed: 0 },
						think: false,
						strict: false,
						length: true,
					},
				}
			: {}),
	}
}

/** Reads one declared target against the memory mechanism predicates while leaving meaning for blind labels. @param target - The declared pair with its retained attempt and evidence rows. @returns The attributable mechanical reading citing the retained attempt and zero-based evidence rows. */
export function readStudyMemoryGrade(target: StudyGradeTarget): StudyGradeReading {
	const { criterion, attempt: retained, evidence } = target
	const observation = retained?.observations.find((entry) => entry.goal === criterion.goal)
	const assertion = criterion.assertion
	const eligible =
		retained !== undefined &&
		criterion.method !== 'semantic' &&
		isStudyMemoryAssertion(assertion) &&
		observation !== undefined
	const complete =
		eligible && observation.failure === undefined && observation.product !== undefined
	// Only a trace assertion looks for an evidence row; the other two read the attempt alone.
	const index =
		eligible && assertion.observation !== 'operational' && assertion.observation !== 'result'
			? evidence.findIndex(
					(row) =>
						row.goal === criterion.goal &&
						row.event === assertion.observation &&
						(assertion.observation === 'summary' ||
							(isRecord(row.value) && 'id' in assertion && row.value.id === assertion.id)),
				)
			: -1
	const unread: { verdict: StudyJudgment['verdict']; references: readonly StudyReference[] } = {
		verdict: 'unknown',
		references: [],
	}
	const { verdict, references }: typeof unread = !eligible
		? unread
		: assertion.observation === 'operational'
			? {
					verdict: complete && retained.failure === undefined ? 'achieved' : 'unsuccessful',
					references: [{ file: 'attempt' }],
				}
			: assertion.observation === 'result'
				? observation.product === undefined
					? unread
					: {
							verdict:
								observation.product.partial === assertion.partial ? 'achieved' : 'unsuccessful',
							references: [{ file: 'attempt' }],
						}
				: index >= 0
					? { verdict: 'achieved', references: [{ file: 'evidence', row: index }] }
					: complete
						? {
								verdict: 'unsuccessful',
								references: [{ file: 'attempt' }, { file: 'evidence' }],
							}
						: unread
	return {
		verdict,
		method: criterion.method === 'semantic' ? 'human' : criterion.method,
		reason:
			criterion.method === 'semantic'
				? 'Requires an independent blind semantic label'
				: verdict === 'unknown'
					? 'No retained observation for the declared mechanism'
					: 'Retained observable mechanism evidence',
		references,
	}
}
