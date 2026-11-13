import type { ToolDefinition } from '@orkestrel/tool'
import type { JSONValue } from '@orkestrel/contract'
import type { StudyEvidence, StudyProfile } from '@orkestrel/study'
import type {
	StudyGradeTarget,
	StudyGradeVerdict,
	StudyOllamaTransportOptions,
} from '@orkestrel/study/server'
import type {
	StudyDeskArea,
	StudyDeskCall,
	StudyDeskOutcome,
	StudyDeskTrace,
	StudyDeskRow,
	StudyDeskSummary,
	StudyDeskSummaryInput,
	StudyDeskTally,
	StudyDeskTool,
} from './types.js'
import { isString } from '@orkestrel/contract'
import { StudyError } from '@orkestrel/study'
import { STUDY_DESK_OPTIONS, STUDY_DESK_TOOLS } from './constants.js'
import {
	isStudyDeskAssertion,
	isStudyDeskDenialRow,
	isStudyDeskResultRow,
	isStudyDeskSettings,
	isStudyDeskToolRow,
} from './validators.js'

/** Builds the definition a desk tool advertises, requiring its first field.
 * @example buildStudyDeskDefinition(STUDY_DESK_TOOLS[0]).parameters?.required // ['customer']
 */
export function buildStudyDeskDefinition(tool: StudyDeskTool): ToolDefinition {
	return {
		name: tool.name,
		description: tool.description,
		parameters: {
			type: 'object',
			properties: Object.fromEntries(
				tool.fields.map((field) => [
					field.name,
					{ type: field.type, description: field.description },
				]),
			),
			required: tool.fields.slice(0, 1).map((field) => field.name),
		},
	}
}

/** Collects the tool names of one area, in catalog order.
 * @example collectStudyDeskTools('staff')[0] // 'staff_on_call'
 */
export function collectStudyDeskTools(area: StudyDeskArea): readonly string[] {
	return STUDY_DESK_TOOLS.filter((tool) => tool.area === area).map((tool) => tool.name)
}

/** Reads one goal's retained rows: its calls in dispatch order with their denials, its admitted loads, its turns, and its result.
 * @remarks
 * Each call is judged on its own. A `denial` row pairs with one `tool` row of the same id and name, the
 * earliest unpaired one, so a call that shares a denied call's id, or its id and name, is not denied
 * with it. A load counts only when it was admitted: its tool row succeeded, which a `load` does only
 * by returning Agent's loaded note, and no denial pairs with it. The reader holds no copy of that note.
 * @example readStudyDeskEvidence([]).turns // 0
 */
export function readStudyDeskEvidence(rows: readonly StudyEvidence[]): StudyDeskTrace {
	const tools = rows.flatMap((row) =>
		row.event === 'tool' && isStudyDeskToolRow(row.value) ? [row.value] : [],
	)
	const denials = rows.flatMap((row) =>
		row.event === 'denial' && isStudyDeskDenialRow(row.value) ? [row.value] : [],
	)
	const calls: readonly StudyDeskCall[] = tools.map((tool, index) => ({
		name: tool.name,
		denied:
			denials.filter((denial) => denial.id === tool.id && denial.name === tool.name).length >
			tools
				.slice(0, index)
				.filter((earlier) => earlier.id === tool.id && earlier.name === tool.name).length,
		success: tool.success,
		arguments: tool.arguments,
	}))
	const result = rows.find((row) => row.event === 'result' && isStudyDeskResultRow(row.value))
	const reading = isStudyDeskResultRow(result?.value) ? result.value : undefined
	return {
		calls,
		loads: calls.flatMap((call) =>
			call.name === 'load' && call.success && !call.denied && isString(call.arguments.skill)
				? [call.arguments.skill]
				: [],
		),
		turns: rows.filter((row) => row.event === 'turn').length,
		partial: reading?.partial,
		prompt: reading?.prompt,
		first: reading?.first,
	}
}

/** Infers how a request ended: the first call other than `load` names the tool, a later call does, a call never does, no call at all, or the run failed.
 * @param tool - The tool the rubric names.
 * @param calls - The calls in dispatch order.
 * @param failed - If `true`, the goal failed or ended partial; if `false`, it completed.
 * @example inferStudyDeskOutcome('status', [{ name: 'load', denied: false, arguments: {} }, { name: 'status', denied: false, arguments: {} }], false) // 'right'
 */
export function inferStudyDeskOutcome(
	tool: string,
	calls: readonly StudyDeskCall[],
	failed: boolean,
): StudyDeskOutcome {
	const picks = calls.filter((call) => call.name !== 'load')
	const first = picks[0]
	if (first !== undefined && first.name === tool && !first.denied) return 'right'
	if (picks.some((call) => call.name === tool && !call.denied)) return 'late'
	if (failed) return 'failed'
	return first === undefined ? 'text' : 'wrong'
}

/** Grades one request from its retained calls: `right` is achieved, a failure is unknown, and every other outcome is unsuccessful.
 * @example readStudyDeskGrade(target).method // 'state'
 */
export function readStudyDeskGrade(target: StudyGradeTarget): StudyGradeVerdict {
	const assertion = target.criterion.assertion
	const observation = target.attempt?.observations.find((row) => row.goal === target.criterion.goal)
	if (!isStudyDeskAssertion(assertion) || observation === undefined)
		return {
			verdict: 'unknown',
			method: 'state',
			reason: 'Missing retained request',
			references: [],
		}
	const trace = readStudyDeskEvidence(
		target.evidence.filter((row) => row.goal === target.criterion.goal),
	)
	const outcome = inferStudyDeskOutcome(
		assertion.tool,
		trace.calls,
		observation.failure !== undefined ||
			observation.product?.partial !== false ||
			trace.partial !== false,
	)
	return {
		verdict: outcome === 'right' ? 'achieved' : outcome === 'failed' ? 'unknown' : 'unsuccessful',
		method: 'state',
		reason: `Mechanical desk predicate over retained calls: ${outcome}`,
		references: [{ file: 'attempt' }, { file: 'evidence' }],
	}
}

/** Projects one goal's rows into what `study progress` lists: the calls, the loads, the turns, and the result.
 * @example readStudyDeskProgress([]) // { calls: [], loads: [], turns: 0 }
 */
export function readStudyDeskProgress(rows: readonly StudyEvidence[]): JSONValue {
	const trace = readStudyDeskEvidence(rows)
	return {
		calls: trace.calls.map((call) => (call.denied ? `${call.name} (denied)` : call.name)),
		loads: [...trace.loads],
		turns: trace.turns,
		...(trace.partial === undefined ? {} : { partial: trace.partial }),
		...(trace.prompt === undefined ? {} : { prompt: trace.prompt }),
		...(trace.first === undefined ? {} : { first: trace.first }),
	}
}

/** Refuses a profile without a provider, with a judge or a triage role, or with another room than the chat study's.
 * @example validateStudyDeskProfile(profile)
 */
export function validateStudyDeskProfile(profile: StudyProfile): void {
	if (!isStudyDeskSettings(profile.settings))
		throw new StudyError('CONFIG', 'Desk settings differ from version and metadata')
	if (
		profile.provider === undefined ||
		profile.provider.judge !== undefined ||
		profile.provider.triage !== undefined ||
		profile.room.context !== STUDY_DESK_OPTIONS.num_ctx ||
		profile.room.output !== STUDY_DESK_OPTIONS.num_predict ||
		profile.room.safety !== 512 ||
		profile.room.think !== false
	)
		throw new StudyError('CONFIG', 'Desk treatment differs from the chat study wire')
}

/** Declares the agent wire every arm sends.
 * @example buildStudyDeskRoles(profile).agent?.options.num_ctx // 20480
 */
export function buildStudyDeskRoles(profile: StudyProfile): StudyOllamaTransportOptions['roles'] {
	validateStudyDeskProfile(profile)
	const provider = profile.provider
	if (provider === undefined) throw new StudyError('CONFIG', 'Desk requires a provider')
	return {
		agent: {
			model: provider.model,
			options: { ...STUDY_DESK_OPTIONS },
			think: false,
			strict: false,
			length: true,
		},
	}
}

/** Computes the median of a list, averaging the two middle values of an even list, or undefined for none.
 * @example computeStudyDeskMedian([4, 1, 3, 2]) // 2.5
 */
export function computeStudyDeskMedian(values: readonly number[]): number | undefined {
	const sorted = [...values].sort((left, right) => left - right)
	const upper = sorted[Math.floor(sorted.length / 2)]
	const lower = sorted[Math.floor(sorted.length / 2) - 1]
	if (upper === undefined) return undefined
	return sorted.length % 2 === 1 || lower === undefined ? upper : (lower + upper) / 2
}

/** Computes the median first text of the rows that read one, or undefined when none does.
 * @example computeStudyDeskFirst([]) // undefined
 */
export function computeStudyDeskFirst(rows: readonly StudyDeskRow[]): number | undefined {
	return computeStudyDeskMedian(rows.flatMap((row) => (row.first === undefined ? [] : [row.first])))
}

/** Computes one arm's counts from its rows.
 * @example computeStudyDeskTally([]).requests // 0
 */
export function computeStudyDeskTally(rows: readonly StudyDeskRow[]): StudyDeskTally {
	const loaded = rows.filter((row) => row.loads.length > 0)
	return {
		requests: rows.length,
		right: rows.filter((row) => row.outcome === 'right').length,
		late: rows.filter((row) => row.outcome === 'late').length,
		wrong: rows.filter((row) => row.outcome === 'wrong').length,
		text: rows.filter((row) => row.outcome === 'text').length,
		failed: rows.filter((row) => row.outcome === 'failed').length,
		loads: rows.reduce((total, row) => total + row.loads.length, 0),
		opened: loaded.filter((row) => row.loads[0] === row.area).length,
		misopened: loaded.filter((row) => row.loads[0] !== row.area).length,
		turns: rows.reduce((total, row) => total + row.turns, 0),
		prompt: computeStudyDeskMedian(
			rows.flatMap((row) => (row.prompt === undefined ? [] : [row.prompt])),
		),
		first: {
			initial: computeStudyDeskFirst(rows.filter((row) => row.initial)),
			loaded: computeStudyDeskFirst(rows.filter((row) => !row.initial && row.loads.length > 0)),
			later: computeStudyDeskFirst(rows.filter((row) => !row.initial && row.loads.length === 0)),
		},
	}
}

/** Joins a sealed result's trials to the rubric into one row per request and one tally per arm.
 * @remarks Pass the attempts and evidence of a result Study verified, through its `readStudyResult` and `collectStudyEvidence` helpers. A trial's first goal is read apart, because Study unloads the models before each trial.
 * @throws StudyError - Thrown when a criterion names a scenario or goal the declaration lacks.
 * @example buildStudyDeskSummary(input).tallies.index?.right
 */
export function buildStudyDeskSummary(input: StudyDeskSummaryInput): StudyDeskSummary {
	const rows: readonly StudyDeskRow[] = input.schedule.flatMap((trial) => {
		const attempt = input.attempts.find((entry) => entry.trial.id === trial.id)
		const evidence = input.evidence.get(trial.id) ?? []
		const scenario = input.scenarios.find((entry) => entry.id === trial.scenario)
		return input.rubric.criteria.flatMap((criterion) => {
			if (criterion.scenario !== trial.scenario || !isStudyDeskAssertion(criterion.assertion))
				return []
			if (!scenario?.goals.some((goal) => goal.id === criterion.goal))
				throw new StudyError('CONFIG', 'Desk summary scenario join differs')
			const observation = attempt?.observations.find((entry) => entry.goal === criterion.goal)
			const trace = readStudyDeskEvidence(evidence.filter((row) => row.goal === criterion.goal))
			return [
				{
					trial: trial.id,
					arm: trial.arm,
					scenario: trial.scenario,
					goal: criterion.goal,
					initial: scenario.goals[0]?.id === criterion.goal,
					tool: criterion.assertion.tool,
					area: criterion.assertion.area,
					outcome: inferStudyDeskOutcome(
						criterion.assertion.tool,
						trace.calls,
						observation === undefined ||
							observation.failure !== undefined ||
							observation.product?.partial !== false ||
							trace.partial !== false,
					),
					loads: trace.loads,
					turns: trace.turns,
					prompt: trace.prompt,
					first: trace.first,
				},
			]
		})
	})
	return {
		rows,
		tallies: Object.fromEntries(
			[...new Set(input.schedule.map((trial) => trial.arm))].map((arm) => [
				arm,
				computeStudyDeskTally(rows.filter((row) => row.arm === arm)),
			]),
		),
	}
}
