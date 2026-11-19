import type { JSONValue } from '@orkestrel/contract'
import type { Message, JudgeQuestion, JudgeResult } from '@orkestrel/agent'
import type {
	StudyEvidence,
	StudyJudgment,
	StudyProfile,
	StudyProvider,
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
	StudyMemoryPolicy,
	StudyMemoryTriage,
	StudyMemoryObservation,
	StudyMemoryProvenance,
	StudyMemoryCarriageInput,
	StudyMemoryProgress,
	StudyMemoryProvenanceSource,
	StudyMemoryTally,
	StudyMemoryGoalLookups,
	StudyMemoryLookups,
	StudyMemorySummary,
	StudyMemorySummaryInput,
} from './types.js'
import { canonicalStringify, isArray, isRecord, parseJSON } from '@orkestrel/contract'
import { StudyError, isStudyProvider, isStudyRoom } from '@orkestrel/study'
import { collectStudyRows } from '@orkestrel/study/server'
import {
	STUDY_MEMORY_LEDGER_REPEAT,
	STUDY_MEMORY_PARAMETERS,
	STUDY_MEMORY_POLICY,
	STUDY_MEMORY_TOLERANCE,
} from './constants.js'
import { isStudyMemoryAssertion, isStudyMemoryOptions, isStudyMemoryWire } from './validators.js'

/** Serializes every policy and leg identity member in stable key order. */
export function buildStudyMemoryJudgeModel(
	policy: StudyMemoryPolicy,
	first: string,
	second: string,
): string {
	const model = canonicalStringify({ policy, first, second })
	if (model === undefined) throw new StudyError('CONFIG', 'Triage identity is not JSON')
	return model
}

/** Selects a usable complete choice distribution in caller criteria order. */
export function buildStudyMemoryTriage(
	id: string,
	question: JudgeQuestion,
	result: JudgeResult | undefined,
	fault: boolean,
): StudyMemoryTriage {
	const answer =
		result !== undefined && Object.hasOwn(result.answers, id) ? result.answers[id] : undefined
	const candidates =
		question.form === 'choice' && answer?.form === 'choice'
			? Object.keys(question.criteria).map((winner) => ({
					winner,
					probability: Object.hasOwn(answer.probabilities, winner)
						? answer.probabilities[winner]
						: undefined,
				}))
			: []
	const usable =
		answer?.form === 'choice' &&
		candidates.length >= 2 &&
		Object.keys(answer.probabilities).length === candidates.length &&
		candidates.every(
			({ probability }) =>
				probability !== undefined &&
				Number.isFinite(probability) &&
				probability >= 0 &&
				probability <= 1,
		) &&
		Math.abs(candidates.reduce((sum, entry) => sum + (entry.probability ?? 0), 0) - 1) <=
			STUDY_MEMORY_TOLERANCE
	const winner = usable
		? candidates.reduce((top, entry) =>
				(entry.probability ?? -1) > (top.probability ?? -1) ? entry : top,
			)
		: undefined
	const kept =
		!fault &&
		(result?.refusals === undefined || !Object.hasOwn(result.refusals, id)) &&
		winner?.probability !== undefined &&
		winner.probability >= STUDY_MEMORY_POLICY.probability &&
		!STUDY_MEMORY_POLICY.referrals.includes(winner.winner)
	return {
		id,
		outcome: fault ? 'fault' : kept ? 'kept' : 'referred',
		winner: winner?.winner ?? null,
		probability: winner?.probability ?? null,
	}
}

/** Filters outcomes to the requested ids, with an answer taking precedence over a conflicting refusal. */
export function filterStudyMemoryResult(result: JudgeResult, ids: readonly string[]): JudgeResult {
	const answers = Object.fromEntries(
		ids.flatMap((id) => {
			const answer = Object.hasOwn(result.answers, id) ? result.answers[id] : undefined
			return answer === undefined ? [] : [[id, answer]]
		}),
	)
	const refusals = Object.fromEntries(
		ids.flatMap((id) => {
			const refusal =
				result.refusals !== undefined && Object.hasOwn(result.refusals, id)
					? result.refusals[id]
					: undefined
			return Object.hasOwn(answers, id) || refusal === undefined ? [] : [[id, refusal]]
		}),
	)
	return {
		model: result.model,
		answers,
		...(Object.keys(refusals).length === 0 ? {} : { refusals }),
		...(result.usage === undefined ? {} : { usage: result.usage }),
	}
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

/** Reads one message's origin from session-held joins only, never from its text or position. @param message - A message of a measured request. @param source - The session's explicit ids and conversation membership. @returns The nonadditive origin; `unknown` when no join applies. */
export function readStudyMemoryProvenance(
	message: Message,
	source: StudyMemoryProvenanceSource,
): StudyMemoryProvenance {
	const explicit = source.explicit.get(message.id)
	if (explicit !== undefined) return explicit
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

/** Checks well-formed driver settings, then the generic provider and room declarations through Study's guards, then what only the selected arms require. @param profile - Runtime profile. @param arms - The arms the study dispatches; the records arm requires a judge model and digest. @returns Nothing when admitted. @throws StudyError - CONFIG when the settings, the provider declaration (exact digests and uncredentialed origin) or the room (positive finite integers leaving prompt capacity) is invalid, a declared recording names no metadata, or an arm's requirement is not met. */
export function validateStudyMemoryProfile(
	profile: StudyProfile,
	arms: readonly StudyMemoryArm[],
): void {
	const { room, provider } = profile
	if (profile.settings !== undefined && !isStudyMemoryOptions(profile.settings))
		throw new StudyError('CONFIG', 'Memory settings are malformed')
	if (
		profile.record !== undefined &&
		(!isStudyMemoryOptions(profile.settings) || profile.settings.metadata === undefined)
	)
		throw new StudyError('CONFIG', 'Memory recording requires declared metadata')
	if (provider === undefined || !isStudyProvider(provider))
		throw new StudyError('CONFIG', 'Memory provider declaration is invalid')
	if (arms.includes('records') && provider.judge === undefined)
		throw new StudyError(
			'CONFIG',
			'Memory requires an exact judge model and digest where one is used',
		)
	if (!isStudyRoom(room)) throw new StudyError('CONFIG', 'Memory room declaration is invalid')
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

/** Declares the exact wire policy of every model role one arm dispatches. @param profile - Runtime profile with serving identities and room. @param arm - The treatment; only records declares the one-token judge and the triage. @returns The agent role, plus the judge role, and the triage role when declared, for records. @throws StudyError - CONFIG when the profile declares no provider, or lacks what the arm's roles need. */
export function buildStudyMemoryRoles(
	profile: StudyProfile,
	arm: StudyMemoryArm,
): StudyOllamaTransportOptions['roles'] {
	const { provider, room } = profile
	if (provider === undefined) throw new StudyError('CONFIG', 'Memory provider is required')
	if ((provider.triage === undefined) !== (provider.digest.triage === undefined))
		throw new StudyError('CONFIG', 'Memory triage requires a model and digest together')
	const placement = isStudyMemoryOptions(profile.settings) ? profile.settings.judge : undefined
	return {
		agent: {
			model: provider.model,
			options: {
				num_ctx: room.context,
				num_predict: room.output,
				...STUDY_MEMORY_PARAMETERS.agent,
			},
			think: room.think,
			strict: false,
			length: true,
		},
		...(arm === 'records' && provider.triage !== undefined
			? { triage: { model: provider.triage, tokens: profile.bounds.request.tokens } }
			: {}),
		...(arm === 'records'
			? {
					judge: {
						model: readStudyMemoryJudge(provider),
						options: {
							num_ctx: room.context,
							num_predict: 1,
							...(placement === undefined ? {} : { num_gpu: placement.gpu }),
							...STUDY_MEMORY_PARAMETERS.judge,
						},
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
	const { criterion, attempt } = target
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
	const row =
		eligible && assertion.observation !== 'operational' && assertion.observation !== 'result'
			? collectStudyRows(target, assertion.observation).find(
					({ evidence }) =>
						isRecord(evidence.value) && 'id' in assertion && evidence.value.id === assertion.id,
				)?.row
			: undefined
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
				: row !== undefined
					? { verdict: 'achieved', references: [{ file: 'evidence', row }] }
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
					repeats: reasons.filter((reason) => reason === STUDY_MEMORY_LEDGER_REPEAT).length,
				}),
		...(system === undefined ? {} : { system }),
		...(cache.length === 0 ? {} : { cache }),
	}
}

/**
 * Reads a sealed memory result's lookups for every scheduled goal, and each arm's totals.
 * @remarks Pass evidence verified by Study's `collectStudyEvidence`. Each goal's count is the one `readStudyMemoryProgress` reports for its rows.
 * @param input - The result's schedule, its scenarios, and its evidence by trial id.
 * @returns Every scheduled goal in schedule and scenario order, with each arm's sums.
 * @throws StudyError - Thrown with code `CONFIG` when a scheduled trial names a scenario the input does not hold.
 * @example buildStudyMemorySummary(input).arms.records?.missing // 2
 */
export function buildStudyMemorySummary(input: StudyMemorySummaryInput): StudyMemorySummary {
	const goals = input.schedule.flatMap((trial): StudyMemoryGoalLookups[] => {
		const scenario = input.scenarios.find((entry) => entry.id === trial.scenario)
		if (scenario === undefined)
			throw new StudyError('CONFIG', `Memory summary has no scenario ${trial.scenario}`)
		const rows = input.evidence.get(trial.id) ?? []
		return scenario.goals.map((goal) => ({
			trial: trial.id,
			arm: trial.arm,
			goal: goal.id,
			lookups: readStudyMemoryProgress(rows.filter((row) => row.goal === goal.id)).lookups ?? {
				found: 0,
				missing: 0,
			},
		}))
	})
	const arms = new Map<string, StudyMemoryLookups>()
	for (const entry of goals) {
		const held = arms.get(entry.arm) ?? { found: 0, missing: 0 }
		arms.set(entry.arm, {
			found: held.found + entry.lookups.found,
			missing: held.missing + entry.lookups.missing,
		})
	}
	return { goals, arms: Object.fromEntries(arms) }
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
