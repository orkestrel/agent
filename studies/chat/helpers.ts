import type { StudyCriterion, StudyProfile, StudyScenario } from '@orkestrel/study'
import type {
	StudyGradeTarget,
	StudyGradeVerdict,
	StudyOllamaTransportOptions,
} from '@orkestrel/study/server'
import type {
	StudyChatAssertion,
	StudyChatConversion,
	StudyChatSummary,
	StudyChatSummaryInput,
} from './types.js'
import { canonicalStringify, isRecord, parseJSON } from '@orkestrel/contract'
import { StudyError } from '@orkestrel/study'
import { hashStudyBytes } from '@orkestrel/study/server'
import {
	STUDY_CHAT_CAPACITIES,
	STUDY_CHAT_DENIAL,
	STUDY_CHAT_DIGEST,
	STUDY_CHAT_FORMATTED,
	STUDY_CHAT_OPTIONS,
} from './constants.js'
import { isStudyChatAssertion, isStudyChatSeal, isStudyChatSettings } from './validators.js'

/** Matches any sealed spelling at ASCII word boundaries, with optional strict shortening.
 * @example matchesStudyChatAnswer('Friday.', ['friday']) // true
 */
export function matchesStudyChatAnswer(
	reply: string,
	accept: readonly string[],
	previous?: string,
): boolean {
	const text = reply.toLowerCase()
	return (
		(previous === undefined || reply.length < previous.length) &&
		accept.some((candidate) =>
			new RegExp(
				`(^|[^a-z0-9])${candidate.toLowerCase().replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}($|[^a-z0-9])`,
				'u',
			).test(text),
		)
	)
}
/** Separates the primary answer from denial and older-value diagnostics.
 * @example buildStudyChatCriteria('script-or-7', 'turn-1', assertion)
 */
export function buildStudyChatCriteria(
	scenario: string,
	goal: string,
	assertion: StudyChatAssertion,
): readonly StudyCriterion[] {
	return ['primary', 'denial', ...(assertion.refuse.length === 0 ? [] : ['older'])].map(
		(observation) => ({
			id: `${scenario}-${goal}-${observation}`,
			scenario,
			goal,
			method: 'state',
			critical: false,
			assertion: { ...assertion, observation },
		}),
	)
}
/** Converts either pinned seal representation into ordered public scenarios and private criteria.
 * @throws StudyError - Thrown when the source digest, shape, or census differs.
 * @example buildStudyChatConversion(sealedText).scenarios.length // 38
 */
export function buildStudyChatConversion(source: string): StudyChatConversion {
	if (![STUDY_CHAT_DIGEST, STUDY_CHAT_FORMATTED].includes(hashStudyBytes(source)))
		throw new StudyError('CONFIG', 'Chat seal digest differs')
	const seal = parseJSON(source)
	if (!isStudyChatSeal(seal)) throw new StudyError('CONFIG', 'Chat seal shape differs')
	const dialogues = [
		...seal.picked.map((dialogue) => ({ dialogue, changed: false })),
		...seal.changed.map((dialogue) => ({ dialogue, changed: true })),
	]
	const scenarios: readonly StudyScenario[] = [
		...dialogues.map(({ dialogue, changed }) => ({
			id: `${changed ? 'changed' : 'picked'}-${dialogue.id.toLowerCase().replace(/\.json$/u, '')}`,
			goals: [...dialogue.turns, ...dialogue.probes.map((probe) => probe.question)].map(
				(prompt, index) => ({
					id: `turn-${index + 1}`,
					input: { prompt, system: seal.system, topic: 'bookings' },
				}),
			),
		})),
		...seal.scripted.map((script) => ({
			id: `script-${script.id.toLowerCase()}`,
			goals: script.steps.map((step, index) => ({
				id: `turn-${index + 1}`,
				input: {
					prompt: step.request,
					system: seal.desk,
					topic: 'orders',
					record: { ...script.record },
				},
			})),
		})),
	]
	const criteria = [
		...dialogues.flatMap(({ dialogue, changed }) =>
			dialogue.probes.flatMap((probe, index) =>
				buildStudyChatCriteria(
					`${changed ? 'changed' : 'picked'}-${dialogue.id.toLowerCase().replace(/\.json$/u, '')}`,
					`turn-${dialogue.turns.length + index + 1}`,
					{
						observation: 'primary',
						conversation: dialogue.id,
						turn: dialogue.turns.length + index + 1,
						group: changed ? 'changed dialogue' : probe.depth,
						accept: probe.accept,
						refuse: changed ? probe.refuse : [],
					},
				),
			),
		),
		...seal.scripted.flatMap((script) =>
			script.steps.flatMap((step, index) =>
				step.check === 'none'
					? []
					: buildStudyChatCriteria(`script-${script.id.toLowerCase()}`, `turn-${index + 1}`, {
							observation: 'primary',
							conversation: script.id,
							turn: index + 1,
							group: step.check === 'changed' ? 'changed script' : step.check,
							accept: step.accept,
							refuse: step.refuse ?? [],
							...(step.check === 'shorter' ? { previous: `turn-${index}` } : {}),
						}),
			),
		),
	]
	if (
		scenarios.length !== 38 ||
		new Set(scenarios.map((scenario) => scenario.id)).size !== 38 ||
		scenarios.flatMap((scenario) => scenario.goals).length !== 294 ||
		criteria.filter(
			(criterion) =>
				isStudyChatAssertion(criterion.assertion) && criterion.assertion.observation === 'primary',
		).length !== 102
	)
		throw new StudyError('CONFIG', 'Chat seal census differs')
	return {
		scenarios,
		rubric: {
			version: '1',
			criteria: [
				...criteria,
				...scenarios.flatMap((scenario) =>
					scenario.goals.flatMap((goal, index) =>
						criteria.some(
							(criterion) => criterion.scenario === scenario.id && criterion.goal === goal.id,
						)
							? []
							: [
									{
										id: `${scenario.id}-${goal.id}-completion`,
										scenario: scenario.id,
										goal: goal.id,
										method: 'state' as const,
										critical: false,
										assertion: {
											observation: 'completion',
											conversation: scenario.id,
											turn: index + 1,
											group: 'ungraded',
											accept: [],
											refuse: [],
										},
									},
								],
					),
				),
			],
		},
	}
}
/** Refuses any change to the converted membership, order, inputs, or rubric.
 * @example validateStudyChatConversion(sealedText, declarations)
 */
export function validateStudyChatConversion(source: string, value: StudyChatConversion): void {
	if (canonicalStringify(buildStudyChatConversion(source)) !== canonicalStringify(value))
		throw new StudyError('CONFIG', 'Chat conversion differs from seal')
}
/** Refuses a mismatched capacity, missing judge, triage role, or altered provider room.
 * @example validateStudyChatProfile(profile)
 */
export function validateStudyChatProfile(profile: StudyProfile): void {
	const capacity = Reflect.get(STUDY_CHAT_CAPACITIES, profile.name)
	if (
		!isStudyChatSettings(profile.settings) ||
		!Object.values(STUDY_CHAT_CAPACITIES).some(
			(declared) => declared === profile.settings?.capacity,
		) ||
		(capacity !== undefined && capacity !== profile.settings.capacity)
	)
		throw new StudyError('CONFIG', 'Chat capacity differs from profile')
	if (
		profile.provider?.judge === undefined ||
		profile.provider.digest.judge === undefined ||
		profile.provider.triage !== undefined ||
		profile.room.context !== 20480 ||
		profile.room.output !== 1024 ||
		profile.room.safety !== 512 ||
		profile.room.think !== false
	)
		throw new StudyError('CONFIG', 'Chat treatment differs from battery')
}
/** Declares the battery's effective provider wires without strict-policy additions.
 * @example buildStudyChatRoles(profile).judge?.options.temperature // 1
 */
export function buildStudyChatRoles(profile: StudyProfile): StudyOllamaTransportOptions['roles'] {
	validateStudyChatProfile(profile)
	const provider = profile.provider
	if (provider?.judge === undefined) throw new StudyError('CONFIG', 'Chat requires judge')
	return {
		agent: {
			model: provider.model,
			options: { num_ctx: 20480, num_predict: 1024, temperature: 0, seed: 0 },
			think: false,
			strict: false,
			length: true,
		},
		judge: {
			model: provider.judge,
			options: { ...STUDY_CHAT_OPTIONS, temperature: 1 },
			think: false,
			strict: false,
			length: true,
		},
	}
}
/** Grades complete retained replies mechanically and leaves unavailable replies unknown.
 * @example readStudyChatGrade(target).method // 'state'
 */
export function readStudyChatGrade(target: StudyGradeTarget): StudyGradeVerdict {
	const assertion = target.criterion.assertion
	const observation = target.attempt?.observations.find((row) => row.goal === target.criterion.goal)
	const previous =
		isStudyChatAssertion(assertion) && assertion.previous !== undefined
			? target.attempt?.observations.find((row) => row.goal === assertion.previous)
			: undefined
	const value = observation?.product?.value
	const before = previous?.product?.value
	if (
		!isStudyChatAssertion(assertion) ||
		observation?.failure !== undefined ||
		observation?.product?.partial !== false ||
		!isRecord(value) ||
		typeof value.content !== 'string' ||
		(assertion.previous !== undefined &&
			(previous?.failure !== undefined ||
				previous?.product?.partial !== false ||
				!isRecord(before) ||
				typeof before.content !== 'string'))
	)
		return {
			verdict: 'unknown',
			method: 'state',
			reason: 'Missing complete retained reply',
			references: [],
		}
	const passed =
		assertion.observation === 'completion'
			? true
			: assertion.observation === 'denial'
				? STUDY_CHAT_DENIAL.test(value.content)
				: assertion.observation === 'older'
					? matchesStudyChatAnswer(value.content, assertion.refuse)
					: matchesStudyChatAnswer(
							value.content,
							assertion.accept,
							isRecord(before) && typeof before.content === 'string' ? before.content : undefined,
						)
	return {
		verdict: passed ? 'achieved' : 'unsuccessful',
		method: 'state',
		reason: 'Mechanical sealed chat predicate over retained reply',
		references: [{ file: 'attempt' }],
	}
}
/** Selects the sorted value at floor(proportion * (count - 1)), or undefined for no values.
 * @example computeStudyChatQuantile([3, 1, 2], 0.5) // 2
 */
export function computeStudyChatQuantile(
	values: readonly number[],
	proportion: number,
): number | undefined {
	return [...values].sort((left, right) => left - right)[
		Math.floor(proportion * (values.length - 1))
	]
}
/** Joins primary assessments and sealed evidence into battery rows and follow-up readings.
 * @remarks Pass evidence verified by Study's collectStudyEvidence and its matching assessment.
 * @example buildStudyChatSummary(input).parity.last
 */
export function buildStudyChatSummary(input: StudyChatSummaryInput): StudyChatSummary {
	const rows = input.assessment.judgments.flatMap((judgment) => {
		const criterion = input.rubric.criteria.find((entry) => entry.id === judgment.criterion)
		if (
			criterion === undefined ||
			!isStudyChatAssertion(criterion.assertion) ||
			criterion.assertion.observation !== 'primary'
		)
			return []
		const assertion = criterion.assertion
		const scenario = input.scenarios.find((entry) => entry.id === criterion.scenario)
		if (!scenario?.goals.some((goal) => goal.id === criterion.goal))
			throw new StudyError('CONFIG', 'Chat summary scenario join differs')
		const diagnostics = input.assessment.judgments.filter((entry) => entry.trial === judgment.trial)
		const denial = diagnostics.find(
			(entry) => entry.criterion === `${criterion.scenario}-${criterion.goal}-denial`,
		)
		const older = diagnostics.find(
			(entry) => entry.criterion === `${criterion.scenario}-${criterion.goal}-older`,
		)
		const timing = input.evidence
			.get(judgment.trial)
			?.find((entry) => entry.goal === criterion.goal && entry.event === 'result')?.value
		return [
			{
				trial: judgment.trial,
				conversation: assertion.conversation,
				turn: assertion.turn,
				group: assertion.group,
				primary: judgment.verdict === 'unknown' ? undefined : judgment.verdict === 'achieved',
				denial:
					denial === undefined || denial.verdict === 'unknown'
						? undefined
						: denial.verdict === 'achieved',
				older:
					older === undefined || older.verdict === 'unknown'
						? undefined
						: older.verdict === 'achieved',
				first: isRecord(timing) && typeof timing.first === 'number' ? timing.first : undefined,
			},
		]
	})
	const times = [...input.evidence.values()].flatMap((evidence) =>
		evidence.flatMap((row) =>
			row.event === 'result' &&
			row.goal !== 'turn-1' &&
			isRecord(row.value) &&
			typeof row.value.first === 'number'
				? [row.value.first]
				: [],
		),
	)
	return {
		rows,
		parity: Object.fromEntries(
			['last', 'near', 'far', 'changed dialogue', 'lookup', 'shorter', 'any', 'changed script'].map(
				(group) => {
					const selected = rows.filter((row) => row.group === group)
					return [
						group,
						{
							right: selected.filter((row) => row.primary === true).length,
							total: selected.length,
							unknown: selected.filter((row) => row.primary === undefined).length,
						},
					]
				},
			),
		),
		right: rows.filter((row) => row.primary === true && row.denial === false).length,
		first: {
			count: times.length,
			median: computeStudyChatQuantile(times, 0.5),
			p90: computeStudyChatQuantile(times, 0.9),
		},
	}
}
