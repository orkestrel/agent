import type { JSONValue } from '@orkestrel/contract'
import type { LedgerGauge, Message } from '@orkestrel/agent'
import type {
	StudyJudgment,
	StudyProfile,
	StudyProvider,
	StudyRoom,
	StudyScenario,
	StudyDefinition,
	StudyIdentity,
} from '@orkestrel/study'
import type {
	StudyGradeReading,
	StudyGradeTarget,
	StudyOllamaTransportOptions,
	StudyReference,
	StudyClosure,
	ArtifactFile,
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
	StudyMemoryScreenTarget,
	StudyMemoryScreenReading,
	StudyMemoryScreenAdmission,
	StudyMemoryScreenTrial,
	StudyMemoryScreenStep,
	StudyMemoryScreenTreatment,
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
import {
	StudyError,
	isStudyProvider,
	isStudyRoom,
	isStudyProfile,
	buildStudySchedule,
	parseStudyProfile,
} from '@orkestrel/study'
import {
	collectStudyEvidence,
	readStudyExchanges,
	readStudyExchangeRows,
	scanStudyDivergence,
	hashStudyBytes,
	readStudyResult,
	readStudyReplayHistory,
	validateStudyRecordingDeclaration,
	valueToWire,
	ArtifactLoader,
	resolveStudyInstrument,
	verifyArtifactClosure,
} from '@orkestrel/study/server'
import { realpathSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	STUDY_MEMORY_ROW_BYTES,
	STUDY_MEMORY_MEMBERS,
	STUDY_MEMORY_EXCERPT,
	STUDY_MEMORY_HOST_FILES,
	STUDY_MEMORY_HOST_FILE_BYTES,
	STUDY_MEMORY_HOST_BYTES,
} from './constants.js'
import {
	isStudyMemoryAssertion,
	isStudyMemoryOptions,
	isStudyMemoryResult,
	isStudyMemoryReceipt,
	isStudyMemoryDeclaration,
	isStudyMemoryProvenance,
	isStudyMemoryInput,
} from './validators.js'

/** Derives the host's complete admitted runtime membership through the public loader.
 * @param entry - Canonical native CLI entry.
 * @returns Bounded portable runtime members.
 */
export function readStudyMemoryHost(entry: string): readonly ArtifactFile[] {
	if (realpathSync(entry) !== entry)
		throw new StudyError('CUSTODY', 'Screen host entry must be canonical')
	const root = resolveStudyInstrument(entry)
	const inventory = new ArtifactLoader({
		entries: [entry],
		roots: [root],
		instrument: root,
	}).inspect()
	let bytes = 0
	if (inventory.files.length > STUDY_MEMORY_HOST_FILES)
		throw new StudyError('CUSTODY', 'Screen host member count exceeded')
	return inventory.files
		.map((file) => {
			bytes += file.size
			if (file.size > STUDY_MEMORY_HOST_FILE_BYTES || bytes > STUDY_MEMORY_HOST_BYTES)
				throw new StudyError('CUSTODY', 'Screen host member bytes exceeded')
			return { ...file, path: relative(root, file.path).split(sep).join('/') }
		})
		.sort((left, right) => left.path.localeCompare(right.path))
}

/** Binds native, retained and declared runtime membership before any Study check.
 * @param closure - Internally verified retained capture.
 * @param entry - Root-selected native Study executable.
 * @throws StudyError - A stale or differently selected host is refused.
 */
export function validateStudyMemoryHost(closure: StudyClosure, entry: string): void {
	const root = resolveStudyInstrument(entry)
	for (const specifier of ['@orkestrel/study', '@orkestrel/study/server']) {
		if (resolveStudyInstrument(fileURLToPath(import.meta.resolve(specifier))) !== root)
			throw new StudyError('CUSTODY', 'Screen native Study differs from selected host')
	}
	verifyArtifactClosure(closure.closure, true)
	const retained = resolveStudyInstrument(closure.entry)
	if (closure.closure.options.instrument !== retained)
		throw new StudyError('CUSTODY', 'Screen closure instrument differs from its entry')
	const prefix = relative(closure.closure.destination, retained).split(sep).join('/') + '/'
	const declared = closure.closure.members
		.filter((member) => member.key.startsWith(prefix))
		.map((member) => ({
			path: member.key.slice(prefix.length),
			size: member.size,
			digest: member.digest,
		}))
		.sort((left, right) => left.path.localeCompare(right.path))
	const expected = canonicalStringify(readStudyMemoryHost(entry))
	const actual = canonicalStringify(readStudyMemoryHost(closure.entry))
	const recorded = canonicalStringify(declared)
	if (
		expected === undefined ||
		actual === undefined ||
		recorded === undefined ||
		expected !== actual ||
		actual !== recorded
	)
		throw new StudyError('CUSTODY', 'Screen retained Study differs from selected host')
}
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
								amendments: selection.plan.amendments.map((pair) => ({
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
														'amendments',
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
															amendments: !isArray(plan.amendments)
																? plan.amendments
																: plan.amendments.map((pair) =>
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
	if (profile.settings?.instructions !== undefined && arms.some((arm) => arm !== 'compaction'))
		throw new StudyError('CONFIG', 'Memory instructions settings require the compaction arm')
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
	const settings = isStudyMemoryOptions(profile.settings) ? profile.settings : undefined
	const screen = settings?.screen
	if (screen !== undefined && screen !== false) {
		if (!isStudyProfile(profile))
			throw new StudyError('CONFIG', 'Screen requires a finite parsed profile')
		if (
			arms.some((arm) => arm !== 'records') ||
			settings?.observe !== true ||
			profile.record === undefined ||
			settings.procedure !== undefined ||
			settings.ledger?.lexical !== false ||
			settings.ledger.recent !== false ||
			typeof settings.ledger.work !== 'boolean' ||
			room.context !== 20480 ||
			room.output !== 8192 ||
			room.safety !== 512 ||
			room.think !== false ||
			settings.rolling !== undefined ||
			settings.instructions !== undefined ||
			settings.lookup?.grammar === true
		)
			throw new StudyError(
				'CONFIG',
				'Screen requires observed recorded records, fixed policy and explicit isolated Ledger switches',
			)
		if (
			(screen.preparation && settings.ledger.work) ||
			(screen.sham === true && settings.ledger.work)
		)
			throw new StudyError('CONFIG', 'Screen preparation and sham require work false')
		if (
			profile.bounds.goal.duration > 180000 ||
			profile.bounds.trial.duration > 200000 ||
			profile.bounds.series.duration > (screen.preparation ? 900000 : 225000) ||
			profile.record.calls > 70 ||
			profile.record.duration > (screen.preparation ? 200000 : 56250)
		)
			throw new StudyError('CONFIG', 'Screen profile exceeds the approved finite envelope')
		if (
			profile.record.bytes > 67108864 ||
			profile.bounds.request.duration > (screen.preparation ? 180000 : 56250) ||
			profile.bounds.request.calls !== 1 ||
			profile.bounds.request.tokens > 19968 ||
			profile.bounds.request.bytes > 1048576 ||
			profile.bounds.goal.calls > 74 ||
			profile.bounds.trial.calls > 74 ||
			profile.bounds.series.calls > 296 ||
			profile.bounds.goal.tokens > 1477632 ||
			profile.bounds.trial.tokens > 1477632 ||
			profile.bounds.series.tokens > 5910528 ||
			profile.bounds.goal.bytes > 83886080 ||
			profile.bounds.trial.bytes > 167772160 ||
			profile.bounds.series.bytes > 1073741824
		)
			throw new StudyError(
				'CONFIG',
				'Screen profile exceeds the approved request or cumulative inventory',
			)
	}
	if (arms.includes('compaction') && room.recap === undefined)
		throw new StudyError('CONFIG', 'Memory compaction requires a declared recap allowance')
}

/** Verifies the final-space sham against the source's exact body identity. @param body - Actual encoded body. @param prompt - Original identified user input. @param digest - Source body digest. @returns True only for the sole permitted terminal space difference; false otherwise. */
export function matchesStudyMemorySham(body: string, prompt: string, digest: string): boolean {
	const parsed = parseJSON(body)
	if (!isRecord(parsed) || !isArray(parsed.messages)) return false
	const messages = parsed.messages
	const matches = messages.filter(
		(message) => isRecord(message) && message.role === 'user' && message.content === `${prompt} `,
	)
	if (matches.length !== 1) return false
	const restored = {
		...parsed,
		messages: messages.map((message) =>
			message === matches[0] && isRecord(message) ? { ...message, content: prompt } : message,
		),
	}
	return hashStudyBytes(JSON.stringify(restored)) === digest
}

/** Binds a public two-goal scenario to exact canonical bytes. @param scenario - Public declaration. @returns Its immutable screen identity. @throws StudyError - Thrown for a horizon other than seed and target. */
export function buildStudyMemoryTarget(scenario: StudyScenario): StudyMemoryScreenTarget {
	const [seed, target] = scenario.goals
	if (scenario.goals.length !== 2 || seed === undefined || target === undefined)
		throw new StudyError('CONFIG', 'Screen requires exactly two ordered goals')
	return {
		scenario: scenario.id,
		digest: computeStudyMemoryDigest(scenario),
		seed: { id: seed.id, digest: computeStudyMemoryDigest(seed) },
		target: { id: target.id, digest: computeStudyMemoryDigest(target) },
	}
}

/** Hashes a serializable consumer identity with the installed canonical encoder. @param value - Declaration or identity. @returns SHA-256 of its canonical JSON. @throws StudyError - Thrown when no JSON value exists. */
export function computeStudyMemoryDigest(value: unknown): string {
	const text = canonicalStringify(value)
	if (text === undefined) throw new StudyError('CONFIG', 'Screen identity is not serializable')
	return hashStudyBytes(text)
}

/** Checks the frozen grouped public population before module execution. @param definition - Study declaration. @param scenarios - Ordered public cases. @param profile - Parsed profile. @returns Nothing for an admitted population. */
export function validateStudyMemoryScreen(
	definition: StudyDefinition,
	scenarios: readonly StudyScenario[],
	profile: StudyProfile,
): void {
	const settings = isStudyMemoryOptions(profile.settings) ? profile.settings : undefined
	const screen = settings?.screen
	if (screen === undefined || screen === false) return
	if (
		definition.name !== 'r2-request-screen' ||
		definition.purpose !== 'mechanism' ||
		definition.retries !== 0 ||
		canonicalStringify(definition.arms) !== '["records"]' ||
		canonicalStringify(definition.order) !== '[["records"]]' ||
		canonicalStringify(scenarios.map(buildStudyMemoryTarget)) !== canonicalStringify(screen.targets)
	)
		throw new StudyError('CONFIG', 'Screen definition or frozen population differs')
}

/** Checks complete retained text across Ledger's presentation-only bullet separators. @param messages - Actual emitted request messages. @param content - Exact generated draft or released lookup return. @returns True if one emitted message carries all the text in order; false otherwise. */
export function matchesStudyMemoryCarriage(
	messages: ReadonlyArray<Pick<Message, 'content'>>,
	content: string,
): boolean {
	const expected = content.replace(/\s+/g, ' ').trim()
	return (
		expected.length > 0 &&
		messages.some((message) =>
			message.content
				.replace(/\r?\n- /g, ' ')
				.replace(/\s+/g, ' ')
				.includes(expected),
		)
	)
}

/** Compares the installed host's location-independent code, runtime and fixture identities. Path-bound inventory digests are checked within each closure separately. @param source - Source identities. @param matched - Executing identities. @returns Nothing when portable execution identities agree. */
export function validateStudyMemoryIdentity(source: StudyIdentity, matched: StudyIdentity): void {
	if (
		source.runtime !== matched.runtime ||
		source.content !== matched.content ||
		source.fixtures !== matched.fixtures
	)
		throw new StudyError('CUSTODY', 'Screen runtime, content or public fixture identity differs')
}

/** Compares every materialized code and public asset byte except the deliberately changed profile. Call only after the official checks verify both closures. @param source - Checked preparation closure. @param matched - Checked matched closure. @returns Nothing for exact portable membership and bytes. */
export function validateStudyMemoryClosures(source: StudyClosure, matched: StudyClosure): void {
	validateStudyMemoryIdentity(source.identity, matched.identity)
	const inventories = [source, matched].map((closure) => {
		const profile = relative(
			closure.closure.destination,
			join(closure.root, 'studies/memory/profiles', `${closure.profile}.json`),
		)
			.split(sep)
			.join('/')
		return closure.closure.members
			.filter((member) => member.key !== profile)
			.map(({ key, digest, size }) => ({ key, digest, size }))
			.toSorted((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0))
	})
	if (canonicalStringify(inventories[0]) !== canonicalStringify(inventories[1]))
		throw new StudyError('CUSTODY', 'Screen closed code or public asset bytes differ')
}

/** Reads sealed preparation with the installed custody readers and derives the sole classification cut. @param input - Expected source declarations and checked runtime identity. @returns Exact source receipt with bounded historical model inventory. @throws StudyError - Thrown before dependent execution on incomplete or changed evidence. */
export async function readStudyMemoryAdmission(
	input: StudyMemoryScreenReading,
): Promise<StudyMemoryScreenAdmission> {
	validateStudyMemoryProfile(input.profile, ['records'])
	validateStudyMemoryScreen(input.definition, input.scenarios, input.profile)
	const settings = isStudyMemoryOptions(input.profile.settings) ? input.profile.settings : undefined
	if (settings?.screen === undefined || settings.screen === false || !settings.screen.preparation)
		throw new StudyError('CONFIG', 'Admission requires the original preparation profile')
	const result = await readStudyResult(input.directory)
	if (
		result.status !== 'sealed' ||
		result.manifest.ancestor !== undefined ||
		canonicalStringify(result.manifest.definition) !== canonicalStringify(input.definition) ||
		canonicalStringify(result.manifest.scenarios) !== canonicalStringify(input.scenarios) ||
		canonicalStringify(result.manifest.identity) !== canonicalStringify(input.identity)
	)
		throw new StudyError(
			'CUSTODY',
			'Screen source is unsealed, derived, or differs from the checked declarations',
		)
	const schedule = buildStudySchedule(input.definition, input.scenarios)
	if (
		canonicalStringify(schedule) !== canonicalStringify(result.manifest.schedule) ||
		result.attempts.length !== schedule.length
	)
		throw new StudyError('CUSTODY', 'Screen source trial population differs')
	const evidence = await collectStudyEvidence(result)
	const trials: StudyMemoryScreenTrial[] = []
	for (const [index, trial] of schedule.entries()) {
		const scenario = input.scenarios[index]
		const [seed, target] = scenario?.goals ?? []
		const retained = result.attempts.find((entry) => entry.trial.id === trial.id)
		const rows = evidence[trial.id]
		if (
			scenario === undefined ||
			seed === undefined ||
			target === undefined ||
			!isStudyMemoryInput(seed.input) ||
			!isStudyMemoryInput(target.input) ||
			seed.input.records.length !== 2 ||
			target.input.records.length !== 0 ||
			target.input.arrivals.length !== 0 ||
			retained === undefined ||
			!retained.executed ||
			retained.failure !== undefined ||
			retained.observations.length !== 2 ||
			retained.observations.some(
				(observation) =>
					!observation.executed ||
					observation.failure !== undefined ||
					observation.product?.partial !== false,
			) ||
			rows === undefined
		)
			throw new StudyError(
				'CUSTODY',
				'Screen source requires every complete isolated two-goal product',
			)
		const history = await readStudyExchanges(result, trial.id)
		validateStudyRecordingDeclaration(history.declaration, input.profile, trial, scenario)
		if (history.declaration.ancestor !== undefined)
			throw new StudyError('CUSTODY', 'Screen preparation cannot inherit replay timing')
		const models = history.exchanges.filter((exchange) => exchange.attempt.stage === 'execution')
		const finals = models.filter(
			(exchange) => exchange.attempt.goal === target.id && exchange.attempt.role === 'agent',
		)
		const [final] = finals
		if (finals.length !== 1 || final === undefined || models.at(-1) !== final)
			throw new StudyError(
				'CUSTODY',
				'Screen source must seal exactly one final target agent response',
			)
		const steps = models
			.filter((exchange) => exchange.attempt.ordinal < final.attempt.ordinal)
			.map((exchange): StudyMemoryScreenStep => {
				const request = exchange.attempt
				if (request.role !== 'agent' && request.role !== 'judge')
					throw new StudyError('CUSTODY', 'Screen source has an unsupported role')
				const body = parseJSON(Buffer.from(request.body, 'base64').toString('utf8'))
				if (
					!isRecord(body) ||
					!isRecord(body.options) ||
					body.options.num_predict !== (request.role === 'agent' ? 8192 : 1)
				)
					throw new StudyError('CUSTODY', 'Screen source role policy differs')
				return {
					ordinal: request.ordinal,
					goal: request.goal,
					role: request.role,
					digest: request.digest,
				}
			})
		const classified = steps.at(-1)
		if (
			classified?.goal !== target.id ||
			classified.role !== 'judge' ||
			classified.ordinal !== final.attempt.ordinal - 1 ||
			steps.filter((step) => step.goal === target.id).some((step) => step.role !== 'judge')
		)
			throw new StudyError('CUSTODY', 'Screen prefix must end at unchanged target classification')
		const draft = retained.observations.find((observation) => observation.goal === seed.id)?.product
			?.value
		if (!isRecord(draft) || typeof draft.content !== 'string' || draft.content.trim() === '')
			throw new StudyError('CUSTODY', 'Screen actual seed draft is missing')
		const lookups = seed.input.records.map((record) => ({
			id: record.id,
			content: `${record.id}: ${record.name}\n${record.content}`,
		}))
		const body = parseJSON(Buffer.from(final.attempt.body, 'base64').toString('utf8'))
		if (
			!isRecord(body) ||
			!isArray(body.messages) ||
			!body.messages.every(
				(message): message is Pick<Message, 'content'> =>
					isRecord(message) && typeof message.content === 'string',
			) ||
			!isRecord(body.options) ||
			body.options.num_predict !== 8192
		)
			throw new StudyError('CUSTODY', 'Screen final source body is malformed')
		for (const lookup of lookups) {
			const receipts = rows.filter(
				(row) =>
					row.goal === seed.id &&
					row.event === 'lookup' &&
					isRecord(row.value) &&
					row.value.id === lookup.id &&
					row.value.found === true &&
					row.value.version === hashStudyBytes(lookup.content) &&
					typeof row.value.message === 'string',
			)
			if (receipts.length === 0 || !matchesStudyMemoryCarriage(body.messages, lookup.content))
				throw new StudyError(
					'CUSTODY',
					'Screen required seed receipt or target version carriage is missing',
				)
		}
		const accounts = rows.filter((row) => row.event === 'screen')
		const finalAccount = accounts.at(-1)?.value
		if (
			accounts.length !== 2 ||
			!isRecord(finalAccount) ||
			finalAccount.agent !==
				models.filter((exchange) => exchange.attempt.role === 'agent').length ||
			finalAccount.judge !==
				models.filter((exchange) => exchange.attempt.role === 'judge').length ||
			typeof finalAccount.agent !== 'number' ||
			finalAccount.agent > 6 ||
			typeof finalAccount.judge !== 'number' ||
			finalAccount.judge > 64 ||
			finalAccount.tokens !== finalAccount.agent * 8192 + finalAccount.judge ||
			finalAccount.tokens > 49216 ||
			typeof finalAccount.tools !== 'number' ||
			finalAccount.tools > 4 ||
			typeof finalAccount.rounds !== 'number' ||
			finalAccount.rounds > 2 ||
			typeof finalAccount.recalls !== 'number' ||
			finalAccount.recalls > 2
		)
			throw new StudyError(
				'CUSTODY',
				'Screen source account is missing or exceeds the approved envelope',
			)
		const prefix = final.attempt.ordinal - 1
		await readStudyReplayHistory(
			{ result: input.directory, prefix: { [trial.id]: prefix }, offline: false },
			input.profile,
			trial,
		)
		trials.push({
			id: trial.id,
			prefix,
			file: history.file,
			steps,
			final: {
				ordinal: final.attempt.ordinal,
				goal: target.id,
				role: 'agent',
				digest: final.attempt.digest,
			},
			draft: draft.content,
			lookups,
		})
	}
	return {
		directory: result.directory,
		result: result.manifest.id,
		seal: result.seal.id,
		identity: computeStudyMemoryDigest(result.manifest.identity),
		trials,
	}
}

/** Builds the finite preparation profile over the unchanged serving policy. @param profile - Fixed runtime and recording metadata. @param scenarios - Frozen public population. @returns A parsed profile with the approved nested ceilings. */
export function buildStudyMemoryPreparation(
	profile: StudyProfile,
	scenarios: readonly StudyScenario[],
): StudyProfile {
	const result = parseStudyProfile(
		valueToWire({
			...profile,
			name: 'r2-source-04011',
			qualification: undefined,
			record: { bytes: 67108864, calls: 70, duration: 200000 },
			bounds: {
				request: { duration: 180000, calls: 1, tokens: 19968, bytes: 1048576 },
				goal: { duration: 180000, calls: 74, tokens: 1477632, bytes: 83886080 },
				trial: { duration: 200000, calls: 74, tokens: 1477632, bytes: 167772160 },
				series: { duration: 900000, calls: 296, tokens: 5910528, bytes: 1073741824 },
			},
			settings: {
				...profile.settings,
				observe: true,
				ledger: { lexical: false, recent: false, work: false },
				screen: { preparation: true, targets: scenarios.map(buildStudyMemoryTarget) },
			},
		}),
	)
	validateStudyMemoryProfile(result, ['records'])
	return result
}

/** Builds one matched profile from its strict source receipt without changing the room or provider. @param profile - Preparation profile. @param admission - Strict sealed source receipt. @param treatment - Frozen work and sham controls. @returns A parsed matched profile with independent replay and live bounds. */
export function buildStudyMemoryMatched(
	profile: StudyProfile,
	admission: StudyMemoryScreenAdmission,
	treatment: StudyMemoryScreenTreatment,
): StudyProfile {
	const settings = isStudyMemoryOptions(profile.settings) ? profile.settings : undefined
	if (settings?.screen === undefined || settings.screen === false || !settings.screen.preparation)
		throw new StudyError('CONFIG', 'Matched profile requires preparation settings')
	const result = parseStudyProfile(
		valueToWire({
			...profile,
			name: treatment.name,
			record: { bytes: 67108864, calls: 70, duration: 56250 },
			bounds: {
				...profile.bounds,
				request: { ...profile.bounds.request, duration: 56250 },
				trial: { ...profile.bounds.trial, duration: 180000 },
				series: { ...profile.bounds.series, duration: 225000 },
			},
			settings: {
				...profile.settings,
				ledger: { lexical: false, recent: false, work: treatment.work },
				screen: {
					preparation: false,
					targets: settings.screen.targets,
					sham: treatment.sham,
					admission,
				},
			},
		}),
	)
	validateStudyMemoryProfile(result, ['records'])
	return result
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
