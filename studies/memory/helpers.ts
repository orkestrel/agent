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
	StudyMemoryChange,
	StudyMemoryDifferential,
	StudyMemoryDifferentialOptions,
	StudyMemorySelection,
} from './types.js'
import {
	isRecord,
	parseJSON,
	isJSONValue,
	isObject,
	isArray,
	attempt,
	canonicalStringify,
} from '@orkestrel/contract'
import { StudyError, isStudyProvider, isStudyRoom } from '@orkestrel/study'
import {
	collectStudyEvidence,
	readStudyExchanges,
	readStudyExchangeRows,
	scanStudyDivergence,
} from '@orkestrel/study/server'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { STUDY_MEMORY_ROW_BYTES, STUDY_MEMORY_MEMBERS, STUDY_MEMORY_EXCERPT } from './constants.js'
import {
	isStudyMemoryAssertion,
	isStudyMemoryOptions,
	isStudyMemoryResult,
	isStudyMemoryReceipt,
	isStudyMemoryDeclaration,
	isStudyMemoryProvenance,
} from './validators.js'

/** Finds the first parsed request member difference in declared precedence order.
 * @remarks Message content offsets count UTF-16 code units; other differences use canonical JSON.
 * Excerpts retain at most the declared bound around that offset. Provenance belongs only to the
 * expected-side message at the changed index.
 * @param expected - The parsed baseline body.
 * @param actual - The parsed replay body.
 * @param origins - Baseline context annotations aligned with baseline messages.
 * @returns The first semantic difference, or undefined for equal bodies.
 * @throws StudyError - Thrown with FAULT when either body is not a JSON object.
 * @example
 * ```ts
 * scanStudyMemoryChange({ prompt: 'before' }, { prompt: 'after' }, [])
 * ```
 */
export function scanStudyMemoryChange(
	expected: unknown,
	actual: unknown,
	origins: readonly StudyMemoryProvenance[],
): StudyMemoryChange | undefined {
	if (!isRecord(expected) || !isJSONValue(expected) || !isRecord(actual) || !isJSONValue(actual))
		throw new StudyError('FAULT', 'Memory differential requires parsed JSON request objects')
	const members = STUDY_MEMORY_MEMBERS.map((member) => {
		const values = [expected, actual].map((body) =>
			member === 'flags'
				? Object.fromEntries(
						Object.entries(body).filter(
							([key]) => !STUDY_MEMORY_MEMBERS.some((known) => known !== 'flags' && known === key),
						),
					)
				: body[member],
		)
		return { member, expected: values[0], actual: values[1] }
	})
	const changed = members.find(
		(entry) => canonicalStringify(entry.expected) !== canonicalStringify(entry.actual),
	)
	if (changed === undefined) return undefined
	const index =
		changed.member === 'messages' && isArray(changed.expected) && isArray(changed.actual)
			? Array.from(
					{ length: Math.max(changed.expected.length, changed.actual.length) },
					(_, position) => position,
				).find(
					(position) =>
						canonicalStringify(
							isArray(changed.expected) ? changed.expected[position] : undefined,
						) !==
						canonicalStringify(isArray(changed.actual) ? changed.actual[position] : undefined),
				)
			: undefined
	const entries = [changed.expected, changed.actual].map((value) =>
		index !== undefined && isArray(value) ? value[index] : value,
	)
	const [left, right] = entries
	const content =
		isRecord(left) &&
		isRecord(right) &&
		typeof left.content === 'string' &&
		typeof right.content === 'string' &&
		left.content !== right.content
	const texts = entries.map((value) =>
		content && isRecord(value) && typeof value.content === 'string'
			? value.content
			: (canonicalStringify(value) ?? ''),
	)
	const [before = '', after = ''] = texts
	const offset =
		Array.from({ length: Math.min(before.length, after.length) }, (_, position) => position).find(
			(position) => before[position] !== after[position],
		) ?? Math.min(before.length, after.length)
	const start = Math.max(0, offset - Math.floor(STUDY_MEMORY_EXCERPT / 4))
	const provenance = index === undefined ? undefined : origins[index]
	return {
		member: changed.member,
		index,
		offset,
		expected: before.slice(start, start + STUDY_MEMORY_EXCERPT),
		actual: after.slice(start, start + STUDY_MEMORY_EXCERPT),
		origin: provenance?.origin,
		source: provenance?.source,
	}
}

/** Normalizes arrival message ids to public sources and other message ids to conversation positions.
 * @remarks Public owner ids, pass indices, call readings, and plan relationships remain unchanged.
 * Conversation order comes from the session rather than the plan being compared.
 * @param value - A validated pass receipt.
 * @returns An independent receipt with deterministic message identities.
 * @throws StudyError - Thrown with FAULT when the receipt is malformed.
 * @example
 * ```ts
 * normalizeStudyMemoryReceipt(receipt)
 * ```
 */
export function normalizeStudyMemoryReceipt(value: StudyMemoryReceipt): StudyMemoryReceipt {
	if (!isStudyMemoryReceipt(value))
		throw new StudyError('FAULT', 'Malformed memory differential receipt')
	const arrivals = new Map(
		value.arrivals.map((arrival) => [arrival.message, `source:${arrival.id}`]),
	)
	const names = new Map([
		...value.messages.map((id, index): readonly [string, string] => [id, `message:${index}`]),
		...arrivals,
	])
	return {
		...value,
		messages: value.messages.map((id) => names.get(id) ?? id),
		request: names.get(value.request) ?? value.request,
		arrivals: value.arrivals.map((arrival) => ({
			...arrival,
			message: names.get(arrival.message) ?? arrival.message,
		})),
		recaps: value.recaps.map((id) => names.get(id) ?? id),
		stop: value.stop === undefined ? undefined : structuredClone(value.stop),
		receipt: {
			calls: value.receipt.calls.map((call) => ({ ...call })),
			selections: value.receipt.selections.map((selection) => ({
				...selection,
				tail: selection.tail.map((id) => names.get(id) ?? id),
				prior: selection.prior.map((id) => names.get(id) ?? id),
				sources: selection.sources.map((source) => ({
					...source,
					source: names.get(source.source) ?? source.source,
				})),
				plan:
					selection.plan === undefined
						? undefined
						: {
								...selection.plan,
								owners: [...selection.plan.owners],
								filed: selection.plan.filed.map((id) => names.get(id) ?? id),
								rendered: selection.plan.rendered.map((id) => names.get(id) ?? id),
								omitted: selection.plan.omitted.map((id) => names.get(id) ?? id),
								sentences: selection.plan.sentences.map((sentence) => ({
									...sentence,
									source: names.get(sentence.source) ?? sentence.source,
								})),
								withdrawn: selection.plan.withdrawn.map((pair) => ({
									earlier: names.get(pair.earlier) ?? pair.earlier,
									later: names.get(pair.later) ?? pair.later,
								})),
							},
			})),
		},
	}
}

/** Finds the first changed goal and pass after normalizing receipt identities.
 * @param expected - Baseline evidence in retained order.
 * @param actual - Sealed replay evidence.
 * @returns The first changed or unmatched receipt, or undefined.
 * @throws StudyError - Thrown with FAULT for malformed or duplicated selection evidence.
 * @example
 * ```ts
 * scanStudyMemorySelection([], []) // undefined
 * ```
 */
export function scanStudyMemorySelection(
	expected: readonly StudyMemoryEvidence[],
	actual: readonly StudyMemoryEvidence[],
): StudyMemorySelection | undefined {
	const [left = [], right = []] = [expected, actual].map((evidence) => {
		const rows = evidence
			.filter((row) => row.event === 'selection')
			.map((row) => {
				if (row.goal === undefined || !isStudyMemoryReceipt(row.value))
					throw new StudyError('FAULT', 'Malformed memory selection evidence')
				return { goal: row.goal, value: normalizeStudyMemoryReceipt(row.value) }
			})
		if (new Set(rows.map((row) => JSON.stringify([row.goal, row.value.pass]))).size !== rows.length)
			throw new StudyError('FAULT', 'Duplicated memory selection pass')
		return rows
	})
	return [...left, ...right]
		.map((row) => ({
			goal: row.goal,
			pass: row.value.pass,
			expected: left.find((entry) => entry.goal === row.goal && entry.value.pass === row.value.pass)
				?.value,
			actual: right.find((entry) => entry.goal === row.goal && entry.value.pass === row.value.pass)
				?.value,
		}))
		.find(
			(row) =>
				canonicalStringify(parseJSON(JSON.stringify(row.expected))) !==
				canonicalStringify(parseJSON(JSON.stringify(row.actual))),
		)
}

/** Reads the first wire difference and the independent sealed selection difference for one trial.
 * @remarks The baseline must be sealed and recorded with `settings.observe: true`. Replay rows admit
 * interrupted prefixes. A parsed change requires both attempts on the same path; metadata path
 * changes and unmatched attempts retain only divergence. Origins come exclusively from the baseline
 * dispatch and its dispatch-stage context row.
 * @param options - Baseline, replay, and scheduled trial id.
 * @returns Completion eligibility, wire divergence, parsed change, and a selection difference only for a sealed replay.
 * @throws StudyError - Thrown with CONFIG for an unobserved baseline or missing trial, or FAULT for malformed provenance.
 * @example
 * ```ts
 * await readStudyMemoryDifferential({ baseline, replay, trial: 'r1-s1-a1' })
 * ```
 */
export async function readStudyMemoryDifferential(
	options: StudyMemoryDifferentialOptions,
): Promise<StudyMemoryDifferential> {
	const { baseline, replay, trial } = options
	const history = await readStudyExchanges(baseline, trial)
	const evidence = (await collectStudyEvidence(baseline))[trial]
	if (
		evidence === undefined ||
		!evidence.some(
			(row) => row.event === 'context' && isRecord(row.value) && row.value.stage === 'dispatch',
		)
	)
		throw new StudyError('CONFIG', 'Memory differential requires an observed baseline')
	if (!replay.manifest?.schedule.some((entry) => entry.id === trial))
		throw new StudyError('CONFIG', 'Memory differential replay trial is absent')
	const rows = readStudyExchangeRows(
		await readFile(join(replay.directory, 'execution', 'trials', trial, 'exchanges.jsonl')),
		false,
	)
	const divergence = scanStudyDivergence(history, rows)
	const finished =
		replay.status === 'sealed'
			? replay.attempts.find((entry) => entry.trial.id === trial)
			: undefined
	const complete =
		finished !== undefined &&
		finished.executed &&
		finished.failure === undefined &&
		history.declaration.goals.every((goal) =>
			finished.observations.some(
				(observation) =>
					observation.goal === goal &&
					observation.executed &&
					observation.failure === undefined &&
					observation.product?.partial === false,
			),
		) &&
		rows.some((row) => row.phase === 'complete') &&
		rows.filter((row) => row.phase === 'response' && row.stage !== 'maintenance').length ===
			history.exchanges.filter(({ attempt: request }) => request.stage !== 'maintenance').length
	const dispatch = evidence.find(
		(row) =>
			row.event === 'dispatch' && isRecord(row.value) && row.value.ordinal === divergence?.ordinal,
	)
	const canonical =
		dispatch !== undefined && isRecord(dispatch.value) ? dispatch.value.canonical : undefined
	const context =
		typeof canonical !== 'number'
			? undefined
			: evidence.find(
					(row) =>
						row.event === 'context' &&
						row.goal === dispatch?.goal &&
						isRecord(row.value) &&
						row.value.stage === 'dispatch' &&
						row.value.dispatch === canonical,
				)
	const origins: unknown =
		context !== undefined && isRecord(context.value) ? context.value.origins : []
	if (!isArray(origins) || !origins.every(isStudyMemoryProvenance))
		throw new StudyError('FAULT', 'Malformed memory differential provenance')
	const provenance = origins.filter(isStudyMemoryProvenance)
	const expected =
		divergence?.expected === undefined
			? undefined
			: parseJSON(Buffer.from(divergence.expected.body, 'base64').toString('utf8'))
	const actual =
		divergence?.actual === undefined
			? undefined
			: parseJSON(Buffer.from(divergence.actual.body, 'base64').toString('utf8'))
	if (
		typeof canonical === 'number' &&
		(context === undefined ||
			(isRecord(expected) &&
				isArray(expected.messages) &&
				provenance.length !== expected.messages.length))
	)
		throw new StudyError(
			'FAULT',
			'Memory differential context does not align with the baseline dispatch',
		)
	const change =
		divergence?.expected === undefined ||
		divergence.actual === undefined ||
		divergence.expected.path !== divergence.actual.path ||
		!isRecord(expected) ||
		!isRecord(actual)
			? undefined
			: scanStudyMemoryChange(expected, actual, provenance)
	const selection =
		replay.status !== 'sealed'
			? undefined
			: scanStudyMemorySelection(evidence, (await collectStudyEvidence(replay))[trial] ?? [])
	return { complete, divergence, change, selection }
}

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
			messages: [...snapshot.messages],
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
	if (profile.settings?.ledger !== undefined && arms.some((arm) => arm !== 'records'))
		throw new StudyError('CONFIG', 'Memory ledger settings require the records arm')
	if (
		profile.record !== undefined &&
		(!isStudyMemoryOptions(profile.settings) ||
			profile.settings.version === undefined ||
			profile.settings.metadata === undefined)
	)
		throw new StudyError('CONFIG', 'Memory recording requires version and metadata settings')
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
