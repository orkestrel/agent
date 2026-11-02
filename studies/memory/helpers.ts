import type { JSONValue } from '@orkestrel/contract'
import type { LedgerGauge, Message } from '@orkestrel/agent'
import type {
	StudyEvidence,
	StudyJudgment,
	StudyProfile,
	StudyProvider,
	StudyRoom,
	StudyScenario,
} from '@orkestrel/study'
import type {
	StudyGradeVerdict,
	StudyGradeTarget,
	StudyOllamaRole,
	StudyOllamaTransportOptions,
	StudyReference,
} from '@orkestrel/study/server'
import type {
	StudyMemoryArm,
	StudyMemoryCompaction,
	StudyMemoryObservation,
	StudyMemoryProvenance,
	StudyMemoryCarriageInput,
	StudyMemoryProgress,
	StudyMemoryProvenanceSource,
	StudyMemoryRetentionInput,
	StudyMemoryTally,
} from './types.js'
import { isArray, isRecord, parseJSON } from '@orkestrel/contract'
import { StudyError, isStudyProvider, isStudyRoom } from '@orkestrel/study'
import {
	STUDY_MEMORY_LEDGER_REPEAT,
	STUDY_MEMORY_REPEAT,
	STUDY_MEMORY_SAMPLING,
} from './constants.js'
import { isStudyMemoryAssertion, isStudyMemoryOptions, isStudyMemoryWire } from './validators.js'

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

/** Checks well-formed driver settings, then the generic provider and room declarations through Study's guards, then what only the selected arms require. @param profile - Runtime profile. @param arms - The arms the study dispatches; the records arm requires a judge model and digest and the compaction arm a recap allowance. @returns Nothing when admitted. @throws StudyError - CONFIG when the settings, the provider declaration (exact digests and uncredentialed origin) or the room (positive finite integers leaving prompt capacity) is invalid, a declared recording names no version or metadata, or an arm's requirement is not met. */
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
			profile.settings.metadata === undefined)
	)
		throw new StudyError('CONFIG', 'Memory recording requires a declared version and metadata')
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

/** Checks the checkpoint list against the scenarios a declaration holds, which only the adapter sees whole under a goal range. @param settings - Profile settings, already well formed. @param scenarios - The declaration's complete scenarios. @returns Nothing when admitted. @throws StudyError - CONFIG when the list is longer than the largest scenario's goal count or an id names no goal of a scenario. */
export function validateStudyMemoryCheckpoints(
	settings: unknown,
	scenarios: readonly StudyScenario[],
): void {
	if (!isStudyMemoryOptions(settings) || settings.checkpoints === undefined) return
	const horizon = Math.max(0, ...scenarios.map((scenario) => scenario.goals.length))
	if (settings.checkpoints.length > horizon)
		throw new StudyError(
			'CONFIG',
			`Memory checkpoints list ${settings.checkpoints.length} goals over a horizon of ${horizon}; list at most one id per goal, or select a study whose scenario holds them`,
		)
	const goals = new Set(scenarios.flatMap((scenario) => scenario.goals.map((goal) => goal.id)))
	for (const checkpoint of settings.checkpoints)
		if (!goals.has(checkpoint))
			throw new StudyError(
				'CONFIG',
				`Memory checkpoint ${checkpoint} names no goal of this study's scenarios; list a declared goal id, or select a study whose scenario holds it`,
			)
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
			options: {
				num_ctx: room.context,
				num_predict: room.output,
				...STUDY_MEMORY_SAMPLING.agent,
			},
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
							...STUDY_MEMORY_SAMPLING.summary,
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
						options: { num_ctx: room.context, num_predict: 1, ...STUDY_MEMORY_SAMPLING.judge },
						think: false,
						strict: false,
						length: true,
					},
				}
			: {}),
	}
}

/** Reads one declared target against the memory mechanism predicates while leaving meaning for blind labels. @param target - The declared pair with its retained attempt and evidence rows. @returns The attributable mechanical reading citing the retained attempt and zero-based evidence rows. */
export function readStudyMemoryGrade(target: StudyGradeTarget): StudyGradeVerdict {
	const { criterion, attempt, evidence } = target
	const observation = attempt?.observations.find((entry) => entry.goal === criterion.goal)
	const assertion = criterion.assertion
	const eligible =
		attempt !== undefined &&
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
					verdict: complete && attempt.failure === undefined ? 'achieved' : 'unsuccessful',
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

/** Derives a share from a tally. @param tally - Found and counted literals. @returns `found / total`, or `undefined` when nothing was counted. */
export function computeStudyMemoryShare(tally: StudyMemoryTally): number | undefined {
	return tally.total === 0 ? undefined : tally.found / tally.total
}

/** Reads literal retention: the history ids that recur in later requests, and how many of them the post-fold view still carries. @param input - Folded slice, later texts, post-fold view and literal reader. @returns The tally over the recurring ids. */
export function computeStudyMemoryRetention(input: StudyMemoryRetentionInput): StudyMemoryTally {
	const later = new Set<string>()
	for (const text of input.later) for (const id of input.literals(text)) later.add(id)
	const view = new Set<string>()
	for (const text of input.view) for (const id of input.literals(text)) view.add(id)
	const recurring = new Set<string>()
	for (const text of input.history)
		for (const id of input.literals(text)) if (later.has(id)) recurring.add(id)
	const found = [...recurring].filter((id) => view.has(id)).length
	return { found, total: recurring.size }
}

/** Reads carriage: the ids of a referenced prior product that the built prompt carries. @param input - Product text, prompt texts and literal reader. @returns The tally over the product ids. */
export function computeStudyMemoryCarriage(input: StudyMemoryCarriageInput): StudyMemoryTally {
	const prompt = new Set<string>()
	for (const text of input.prompt) for (const id of input.literals(text)) prompt.add(id)
	const product = input.literals(input.product)
	const found = [...product].filter((id) => prompt.has(id)).length
	return { found, total: product.size }
}

/**
 * Reads the cache share of each model request of one role.
 *
 * @remarks Open semantics: whether the daemon's `prompt_eval_count` includes the cached tokens is unresolved; the share is defined as `cached / prompt` as reported.
 * @param evidence - Study evidence rows.
 * @param role - Study role whose `wire` rows are read.
 * @returns One entry per matching `wire` row in row order: `cached / prompt`, or `undefined` when either count is unreported or `prompt` is not above 0.
 */
export function computeStudyMemoryCacheShares(
	evidence: readonly StudyEvidence[],
	role: StudyOllamaRole,
): ReadonlyArray<number | undefined> {
	const shares: Array<number | undefined> = []
	for (const row of evidence) {
		if (row.event !== 'wire' || !isStudyMemoryWire(row.value) || row.value.role !== role) continue
		const counts = row.value.timing?.counts
		shares.push(
			counts !== undefined && counts.prompt !== null && counts.cached !== null && counts.prompt > 0
				? counts.cached / counts.prompt
				: undefined,
		)
	}
	return shares
}

/** Reads the `system` messages of the goal's first retained agent request. @param evidence - One goal's evidence rows. @returns The message count and summed UTF-8 bytes, or `undefined` when no agent `dispatch` row retains a body or the body holds no message list. */
export function readStudyMemorySystem(
	evidence: readonly StudyEvidence[],
): StudyMemoryProgress['system'] {
	for (const row of evidence) {
		if (row.event !== 'dispatch' || !isRecord(row.value) || row.value.role !== 'agent') continue
		const body = row.value.body
		if (typeof body !== 'string') continue
		const parsed = parseJSON(body)
		if (!isRecord(parsed) || !isArray(parsed.messages)) return undefined
		const encoder = new TextEncoder()
		const contents = parsed.messages.flatMap((message) =>
			isRecord(message) && message.role === 'system' && typeof message.content === 'string'
				? [message.content]
				: [],
		)
		return {
			count: contents.length,
			bytes: contents.reduce((sum, content) => sum + encoder.encode(content).byteLength, 0),
		}
	}
	return undefined
}

/**
 * Projects one goal's rows into its progress reading, one to one per goal; each cell filters that goal's rows.
 * @param evidence - One goal's evidence rows.
 * @returns The reading, with each cell absent when the goal holds none of the rows it reads.
 */
export function readStudyMemoryProgress(evidence: readonly StudyEvidence[]): StudyMemoryProgress {
	const wires = evidence.flatMap((row) =>
		row.event === 'wire' && isStudyMemoryWire(row.value) ? [row.value] : [],
	)
	const calls = new Map<string, number>()
	const usage = { prompt: 0, cached: 0, completion: 0, total: 0 }
	for (const wire of wires) {
		calls.set(wire.role, (calls.get(wire.role) ?? 0) + 1)
		usage.prompt += wire.prompt ?? 0
		usage.completion += wire.completion ?? 0
		usage.cached += wire.timing?.counts.cached ?? 0
		usage.total += wire.timing?.durations?.total ?? 0
	}
	const product = evidence.find((row) => row.event === 'result')?.value
	const lookups = evidence.flatMap((row) =>
		row.event === 'lookup' && isRecord(row.value) ? [row.value.found === true] : [],
	)
	const reasons = evidence.flatMap((row) =>
		row.event === 'denial' && isRecord(row.value) ? [row.value.reason] : [],
	)
	const system = readStudyMemorySystem(evidence)
	const cache = computeStudyMemoryCacheShares(evidence, 'agent').filter(
		(share) => share !== undefined,
	)
	return {
		...(wires.length === 0 ? {} : { calls: Object.fromEntries(calls), usage }),
		...(isRecord(product) && typeof product.partial === 'boolean'
			? { partial: product.partial }
			: {}),
		...(isRecord(product) && typeof product.content === 'string'
			? { empty: product.content.trim() === '' }
			: {}),
		...(lookups.length === 0
			? {}
			: {
					lookups: {
						found: lookups.filter((found) => found).length,
						missing: lookups.filter((found) => !found).length,
					},
				}),
		...(reasons.length === 0
			? {}
			: {
					repeats: reasons.filter(
						(reason) => reason === STUDY_MEMORY_REPEAT || reason === STUDY_MEMORY_LEDGER_REPEAT,
					).length,
				}),
		...(system === undefined ? {} : { system }),
		...(cache.length === 0 ? {} : { cache }),
	}
}

/** Counts re-acquisitions per goal. @param evidence - Study evidence rows. @param events - Event names that count. @returns One entry per goal in first-seen row order with the count of its rows whose event is listed; a goal with none reads 0. */
export function computeStudyMemoryReacquisition(
	evidence: readonly StudyEvidence[],
	events: readonly string[],
): ReadonlyMap<string, number> {
	const counts = new Map<string, number>()
	for (const row of evidence) {
		const held = counts.get(row.goal) ?? 0
		counts.set(row.goal, events.includes(row.event) ? held + 1 : held)
	}
	return counts
}
