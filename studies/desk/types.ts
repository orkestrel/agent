import type {
	createAgent,
	createAuthority,
	createScope,
	createSkillManager,
} from '@orkestrel/agent'
import type {
	StudyAgentRuntime,
	StudyAttempt,
	StudyEvidence,
	StudyRubric,
	StudyScenario,
	StudyTrial,
} from '@orkestrel/study'
import type { StudyDriverOptions } from '@orkestrel/study/server'
import type { createOllama, extractTiming } from '@orkestrel/ollama'

/** Names one area of the fictional desk catalog, which is also the name of the skill that holds its tools.
 * @example const area: StudyDeskArea = 'orders'
 */
export type StudyDeskArea = 'tickets' | 'customers' | 'billing' | 'orders' | 'inventory' | 'staff'

/** Names one arm: the known area's tools through a run scope, or the skills index with `load`.
 * @example const arm: StudyDeskArm = 'index'
 */
export type StudyDeskArm = 'area' | 'index'

/** Names how a request ended, read from the calls the model made.
 * @example const outcome: StudyDeskOutcome = 'right'
 */
export type StudyDeskOutcome = 'right' | 'late' | 'wrong' | 'text' | 'failed'

/** Holds one parameter of a desk tool: its name, its JSON type, and its description.
 * @example const field: StudyDeskField = { name: 'order', type: 'string', description: 'Order number' }
 */
export interface StudyDeskField {
	readonly name: string
	readonly type: 'string' | 'number'
	readonly description: string
}

/** Holds one desk tool and the area it belongs to.
 * @example const tool: StudyDeskTool = STUDY_DESK_TOOLS[0]
 */
export interface StudyDeskTool {
	readonly name: string
	readonly area: StudyDeskArea
	readonly description: string
	readonly fields: readonly StudyDeskField[]
}

/** Holds one area's skill: its name, the index line it shows, and the guidance its body carries.
 * @example const skill: StudyDeskSkill = STUDY_DESK_SKILLS[0]
 */
export interface StudyDeskSkill {
	readonly name: StudyDeskArea
	readonly description: string
	readonly content: string
}

/** Carries one request and the area the host knows it belongs to; the expected tool sits in the rubric alone.
 * @example const input: StudyDeskInput = { prompt: 'Is invoice INV-3310 paid?', area: 'billing' }
 */
export interface StudyDeskInput {
	readonly prompt: string
	readonly area: StudyDeskArea
}

/** Holds the tool that answers a request, the private half of one criterion.
 * @example const assertion: StudyDeskAssertion = { tool: 'payment_status', area: 'billing' }
 */
export interface StudyDeskAssertion {
	readonly tool: string
	readonly area: StudyDeskArea
}

/** Holds one call the model made during a request, read from the retained tool and denial rows: whether its tool succeeded, and whether a denial row pairs with it.
 * @example const call: StudyDeskCall = { name: 'status', denied: false, success: true, arguments: {} }
 */
export interface StudyDeskCall {
	readonly name: string
	readonly denied: boolean
	readonly success: boolean
	readonly arguments: Readonly<Record<string, unknown>>
}

/** Holds a retained `tool` row: the call and its result, as Study's `buildStudyAgentToolResult` projects them.
 * @example const row: StudyDeskToolRow = { id: 'c1', name: 'status', arguments: {}, success: true, value: 'Done.' }
 */
export interface StudyDeskToolRow {
	readonly id: string
	readonly name: string
	readonly arguments: Readonly<Record<string, unknown>>
	readonly success: boolean
	readonly value?: unknown
	readonly error?: string
}

/** Holds a retained `denial` row: the denied call, as Study's `buildStudyAgentToolDenial` projects it.
 * @example const row: StudyDeskDenialRow = { id: 'c1', name: 'load', reason: 'overflow' }
 */
export interface StudyDeskDenialRow {
	readonly id: string
	readonly name: string
	readonly reason?: string
}

/** Holds a retained `result` row: the reply, whether the run ended partial, its summed prompt, and its first text in seconds.
 * @example const row: StudyDeskResultRow = { content: 'Done.', partial: false }
 */
export interface StudyDeskResultRow {
	readonly content: string
	readonly partial: boolean
	readonly prompt?: number
	readonly first?: number
}

/** Holds what one goal's retained rows show: the calls, the advertised tools of each turn, and the result.
 * @example const trace: StudyDeskTrace = readStudyDeskEvidence(rows)
 */
export interface StudyDeskTrace {
	readonly calls: readonly StudyDeskCall[]
	readonly loads: readonly string[]
	readonly turns: number
	readonly partial: boolean | undefined
	readonly prompt: number | undefined
	readonly first: number | undefined
}

/** Requires the admitted Agent runtime to expose the agent, scope, authority, and skill factories.
 * @example const runtime: StudyDeskRuntime = admittedAgent
 */
export interface StudyDeskRuntime extends StudyAgentRuntime {
	readonly createAgent: typeof createAgent
	readonly createAuthority: typeof createAuthority
	readonly createScope: typeof createScope
	readonly createSkillManager: typeof createSkillManager
}

/** Requires the admitted provider factory and the native timing reader.
 * @example const provider: StudyDeskProvider = admittedOllama
 */
export interface StudyDeskProvider {
	readonly createOllama: typeof createOllama
	readonly extractTiming: typeof extractTiming
}

/** Declares the independent metadata allowance.
 * @example const settings: StudyDeskSettings = { metadata: { calls: 64, bytes: 67108864, duration: 600000 } }
 */
export interface StudyDeskSettings {
	readonly metadata: { readonly calls: number; readonly bytes: number; readonly duration: number }
}

/** Adds the trial's arm, narrowed capabilities, and cancellation to the admitted driver options.
 * @example const options: StudyDeskSessionOptions = { ...driverOptions, arm: 'index', agent, provider, signal }
 */
export interface StudyDeskSessionOptions extends StudyDriverOptions {
	readonly arm: StudyDeskArm
	readonly agent: StudyDeskRuntime
	readonly provider: StudyDeskProvider
	readonly signal: AbortSignal
}

/** Joins a sealed result's schedule, attempts, and evidence to the scenarios and the rubric that names each request's tool.
 * @example const input: StudyDeskSummaryInput = { schedule, attempts, scenarios, rubric, evidence }
 */
export interface StudyDeskSummaryInput {
	readonly schedule: readonly StudyTrial[]
	readonly attempts: readonly StudyAttempt[]
	readonly scenarios: readonly StudyScenario[]
	readonly rubric: StudyRubric
	readonly evidence: ReadonlyMap<string, readonly StudyEvidence[]>
}

/** Holds one graded request of one trial.
 * @example const row: StudyDeskRow = summary.rows[0]
 */
export interface StudyDeskRow {
	readonly trial: string
	readonly arm: string
	readonly scenario: string
	readonly goal: string
	readonly initial: boolean
	readonly tool: string
	readonly area: StudyDeskArea
	readonly outcome: StudyDeskOutcome
	readonly loads: readonly string[]
	readonly turns: number
	readonly prompt: number | undefined
	readonly first: number | undefined
}

/** Holds the median first text of a trial's first goals, of later goals that loaded, and of later goals that did not.
 * @example const first: StudyDeskFirst = tally.first
 */
export interface StudyDeskFirst {
	readonly initial: number | undefined
	readonly loaded: number | undefined
	readonly later: number | undefined
}

/** Holds one arm's counts over the design's bar.
 * @example const tally: StudyDeskTally = summary.tallies.index
 */
export interface StudyDeskTally {
	readonly requests: number
	readonly right: number
	readonly late: number
	readonly wrong: number
	readonly text: number
	readonly failed: number
	readonly loads: number
	readonly opened: number
	readonly misopened: number
	readonly turns: number
	readonly prompt: number | undefined
	readonly first: StudyDeskFirst
}

/** Holds every graded request and each arm's counts.
 * @example const summary: StudyDeskSummary = buildStudyDeskSummary(input)
 */
export interface StudyDeskSummary {
	readonly rows: readonly StudyDeskRow[]
	readonly tallies: Readonly<Record<string, StudyDeskTally>>
}
