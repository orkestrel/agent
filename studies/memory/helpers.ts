import type { JSONValue } from '@orkestrel/contract'
import type { LedgerGauge, Message } from '@orkestrel/agent'
import type { StudyJudgment, StudyProfile, StudyProvider, StudyRoom } from '@orkestrel/study'
import type {
	StudyAdjudication,
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
import { isArray, isObject, isRecord } from '@orkestrel/contract'
import { StudyError } from '@orkestrel/study'
import { gradeStudyEvidence } from '@orkestrel/study/server'
import { isStudyMemoryAssertion, isStudyMemoryDigest, isStudyMemorySettings } from './validators.js'

/** Reads the explicit compaction gauge without supplying a fallback. @param settings - Profile settings. @returns A copy of the declared gauge. @throws StudyError - CONFIG when the settings are absent, malformed or declare no gauge. */
export function readStudyMemoryGauge(settings: unknown): LedgerGauge {
	if (!isStudyMemorySettings(settings) || settings.gauge === undefined)
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

/** Reads the passive observation switches from generic driver settings. @param settings - Optional profile settings. @returns Disabled observation unless `observe` is true; selected goal ids only while enabled. @throws StudyError - CONFIG when present settings are malformed. */
export function readStudyMemorySettings(settings: unknown): StudyMemoryObservation {
	if (settings === undefined) return { observe: false, checkpoints: new Set() }
	if (!isStudyMemorySettings(settings))
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

/** Builds the JSON evidence form of a Ledger result's logical classifier readings. @param result - Value returned by the Ledger. @returns Null when the result carries no readings array, else one entry per well-formed reading in asking order. */
export function buildStudyMemoryReadings(result: unknown): JSONValue {
	if (!isObject(result) || !('readings' in result) || !isArray(result.readings)) return null
	const readings: JSONValue[] = []
	for (const entry of result.readings) {
		if (
			!isObject(entry) ||
			!('key' in entry) ||
			typeof entry.key !== 'string' ||
			!('phase' in entry) ||
			typeof entry.phase !== 'string' ||
			!('outcome' in entry) ||
			typeof entry.outcome !== 'string'
		)
			continue
		readings.push({
			key: entry.key,
			phase: entry.phase,
			outcome: entry.outcome,
			duration: 'duration' in entry && typeof entry.duration === 'number' ? entry.duration : null,
		})
	}
	return readings
}

/** Checks well-formed driver settings, the pinned serving identities the selected arms use, and finite room. @param profile - Runtime profile. @param arms - The arms the study dispatches; the records arm requires a judge model and digest and the compaction arm a recap allowance. @returns Nothing when admitted. */
export function validateStudyMemoryProfile(
	profile: StudyProfile,
	arms: readonly StudyMemoryArm[],
): void {
	const { room, provider } = profile
	if (profile.settings !== undefined && !isStudyMemorySettings(profile.settings))
		throw new StudyError('CONFIG', 'Memory settings are malformed')
	if (provider === undefined || !isStudyMemoryDigest(provider.digest.model))
		throw new StudyError('CONFIG', 'Memory requires an exact model digest')
	if (
		(arms.includes('records') && provider.judge === undefined) ||
		(provider.judge !== undefined && !isStudyMemoryDigest(provider.digest.judge))
	)
		throw new StudyError(
			'CONFIG',
			'Memory requires an exact judge model and digest where one is used',
		)
	const allowances = [room.context, room.output, room.safety]
	if (room.recap !== undefined) allowances.push(room.recap)
	if (
		(arms.includes('compaction') && room.recap === undefined) ||
		allowances.some((number) => !Number.isSafeInteger(number) || number <= 0)
	)
		throw new StudyError('CONFIG', 'Memory room allowances must be positive finite integers')
	if (room.context <= Math.max(room.output, room.recap ?? 0) + room.safety)
		throw new StudyError('CONFIG', 'Memory room leaves no prompt capacity')
	const url = new URL(provider.url)
	if (
		!['http:', 'https:'].includes(url.protocol) ||
		url.username !== '' ||
		url.password !== '' ||
		url.search !== '' ||
		url.hash !== '' ||
		url.pathname !== '/'
	)
		throw new StudyError('CONFIG', 'Memory requires an uncredentialed exact origin')
}

/** Declares the pinned serving identities the Ollama transport verifies, keyed by the label their inventory evidence carries. @param provider - Declared serving identities. @returns The model pin, plus the judge pin when the profile declares one. */
export function buildStudyMemoryModels(
	provider: StudyProvider,
): StudyOllamaTransportOptions['models'] {
	return {
		model: { name: provider.model, digest: provider.digest.model },
		...(provider.judge === undefined || provider.digest.judge === undefined
			? {}
			: { judge: { name: provider.judge, digest: provider.digest.judge } }),
	}
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
	let verdict: StudyJudgment['verdict'] = 'unknown'
	let references: readonly StudyReference[] = []
	const assertion = criterion.assertion
	if (
		attempt !== undefined &&
		criterion.method !== 'semantic' &&
		isStudyMemoryAssertion(assertion) &&
		observation !== undefined
	) {
		const complete = observation.failure === undefined && observation.product !== undefined
		if (assertion.observation === 'operational') {
			verdict = complete && attempt.failure === undefined ? 'achieved' : 'unsuccessful'
			references = [{ file: 'attempt' }]
		} else if (assertion.observation === 'result') {
			if (observation.product !== undefined) {
				verdict = observation.product.partial === assertion.partial ? 'achieved' : 'unsuccessful'
				references = [{ file: 'attempt' }]
			}
		} else {
			const index = evidence.findIndex(
				(row) =>
					row.goal === criterion.goal &&
					row.event === assertion.observation &&
					(assertion.observation === 'summary' ||
						(isRecord(row.value) && 'id' in assertion && row.value.id === assertion.id)),
			)
			if (index >= 0) {
				verdict = 'achieved'
				references = [{ file: 'evidence', row: index }]
			} else if (complete) {
				verdict = 'unsuccessful'
				references = [{ file: 'attempt' }, { file: 'evidence' }]
			}
		}
	}
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

/** Grades observable mechanisms while leaving meaning for blind labels. @param input - Sealed attempts, evidence and independent rubric. @returns One attributable mechanical reading for each declared trial and criterion pair, citing retained attempt files and one-based evidence rows. */
export function gradeStudyMemory(input: StudyAdjudication): readonly StudyJudgment[] {
	return gradeStudyEvidence(input, readStudyMemoryGrade)
}
