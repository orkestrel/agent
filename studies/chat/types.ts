import type { createLedger, LEDGER_QUESTIONS } from '@orkestrel/agent'
import type { createOllama, extractTiming } from '@orkestrel/ollama'
import type {
	StudyAgentRuntime,
	StudyAssessment,
	StudyEvidence,
	StudyRubric,
	StudyScenario,
} from '@orkestrel/study'
import type { StudyDriverOptions } from '@orkestrel/study/server'

/** Holds a sealed dialogue question and its independent answer metadata.
 * @example const probe: StudyChatProbe = seal.picked[0].probes[0]
 */
export interface StudyChatProbe {
	readonly slot: string
	readonly question: string
	readonly gold: string
	readonly accept: readonly string[]
	readonly refuse: readonly string[]
	readonly depth: string
}
/** Holds the original dialogue identity, user turns, and ordered probes.
 * @example const dialogue: StudyChatDialogue = seal.picked[0]
 */
export interface StudyChatDialogue {
	readonly id: string
	readonly turns: readonly string[]
	readonly probes: readonly StudyChatProbe[]
}
/** Holds the authored order record exposed by the real lookup tool.
 * @example const record: StudyChatRecord = { id: 'OR-7', name: 'Dana Reyes', text: 'Ships Friday.' }
 */
export interface StudyChatRecord {
	readonly id: string
	readonly name: string
	readonly text: string
}
/** Holds one authored request and its sealed mechanical check.
 * @example const step: StudyChatStep = { request: 'Hello.', accept: [], check: 'none' }
 */
export interface StudyChatStep {
	readonly request: string
	readonly accept: readonly string[]
	readonly refuse?: readonly string[]
	readonly check: string
}
/** Holds an authored order conversation and its lookup record.
 * @example const script: StudyChatScript = seal.scripted[0]
 */
export interface StudyChatScript {
	readonly id: string
	readonly record: StudyChatRecord
	readonly steps: readonly StudyChatStep[]
}
/** Holds the sealed booking dialogues and authored support conversations.
 * @example const seal: StudyChatSeal = { system, desk, picked, changed, scripted }
 */
export interface StudyChatSeal {
	readonly system: string
	readonly desk: string
	readonly picked: readonly StudyChatDialogue[]
	readonly changed: readonly StudyChatDialogue[]
	readonly scripted: readonly StudyChatScript[]
}
/** Carries only the request and public conversation configuration into the driver; the topic selects the system text in `STUDY_CHAT_SYSTEM`.
 * @example const input: StudyChatInput = { prompt: 'Hello.', topic: 'bookings' }
 */
export interface StudyChatInput {
	readonly prompt: string
	readonly topic: 'bookings' | 'orders'
	readonly record?: StudyChatRecord
}
/** Holds an independent mechanical criterion and its original battery row identity.
 * @example const assertion: StudyChatAssertion = { observation: 'primary', conversation: 'OR-7', turn: 1, group: 'lookup', accept: ['12.50'], refuse: [] }
 */
export interface StudyChatAssertion {
	readonly observation: 'primary' | 'denial' | 'older' | 'completion'
	readonly conversation: string
	readonly turn: number
	readonly group: string
	readonly accept: readonly string[]
	readonly refuse: readonly string[]
	readonly previous?: string
}
/** Pairs the ordered public scenarios with their private grading rubric.
 * @example const conversion: StudyChatConversion = buildStudyChatConversion(source)
 */
export interface StudyChatConversion {
	readonly scenarios: readonly StudyScenario[]
	readonly rubric: StudyRubric
}
/** Requires the admitted Agent runtime to expose its ledger and measured questions.
 * @example const runtime: StudyChatRuntime = admittedAgent
 */
export interface StudyChatRuntime extends StudyAgentRuntime {
	readonly createLedger: typeof createLedger
	readonly LEDGER_QUESTIONS: typeof LEDGER_QUESTIONS
}
/** Requires the admitted provider factory and native timing reader.
 * @example const provider: StudyChatProvider = admittedOllama
 */
export interface StudyChatProvider {
	readonly createOllama: typeof createOllama
	readonly extractTiming: typeof extractTiming
}
/** Adds narrowed capabilities and cancellation to the admitted driver options.
 * @example const options: StudyChatSessionOptions = { ...driverOptions, agent, provider, signal }
 */
export interface StudyChatSessionOptions extends StudyDriverOptions {
	readonly agent: StudyChatRuntime
	readonly provider: StudyChatProvider
	readonly signal: AbortSignal
}
/** Declares the ledger capacity and the independent metadata allowance.
 * @example const settings: StudyChatSettings = { capacity: 19968, metadata: { calls: 64, bytes: 67108864, duration: 600000 } }
 */
export interface StudyChatSettings {
	readonly capacity: number
	readonly metadata: { readonly calls: number; readonly bytes: number; readonly duration: number }
}
/** Joins a verified assessment to its scenarios, rubric, and sealed trial evidence.
 * @example const input: StudyChatSummaryInput = { assessment, scenarios, rubric, evidence }
 */
export interface StudyChatSummaryInput {
	readonly assessment: StudyAssessment
	readonly scenarios: readonly StudyScenario[]
	readonly rubric: StudyRubric
	readonly evidence: ReadonlyMap<string, readonly StudyEvidence[]>
}
/** Retains a graded battery row with independent outcomes and first-text seconds.
 * @example const row: StudyChatRow = summary.rows[0]
 */
export interface StudyChatRow {
	readonly trial: string
	readonly conversation: string
	readonly turn: number
	readonly group: string
	readonly primary: boolean | undefined
	readonly denial: boolean | undefined
	readonly older: boolean | undefined
	readonly first: number | undefined
}
/** Holds one parity group's primary outcomes.
 * @example const parity: StudyChatParity = summary.parity.near
 */
export interface StudyChatParity {
	/** Counts the group's rows whose primary predicate passed. */
	readonly right: number
	/** Counts the group's rows whose primary predicate passed with no denial. */
	readonly undenied: number
	readonly total: number
	/** Counts the group's rows with no retained complete reply. */
	readonly unknown: number
}
/** Holds primary parity groups, right without denial over the dialogue rows, and follow-up latency quantiles.
 * @example const summary: StudyChatSummary = buildStudyChatSummary(input)
 */
export interface StudyChatSummary {
	readonly rows: readonly StudyChatRow[]
	readonly parity: Readonly<Record<string, StudyChatParity>>
	/** Counts the dialogue rows, the groups `STUDY_CHAT_DIALOGUE` names, that are right with no denial. */
	readonly right: number
	readonly first: {
		readonly count: number
		readonly median: number | undefined
		readonly p90: number | undefined
	}
}
