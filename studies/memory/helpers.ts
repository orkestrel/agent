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
} from './types.js'
import { isRecord } from '@orkestrel/contract'
import { StudyError, isStudyProvider, isStudyRoom } from '@orkestrel/study'
import { isStudyMemoryAssertion, isStudyMemoryOptions } from './validators.js'

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
