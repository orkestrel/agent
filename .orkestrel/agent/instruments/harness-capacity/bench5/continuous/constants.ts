import type {
	ContinuousArm,
	ContinuousCompaction,
	ContinuousFailurePolicy,
	ContinuousLimits,
} from './types.js'
import { join } from 'node:path'
import { HARNESS } from '../constants.js'

/** Names the arms a series serves, in order. */
export const CONTINUOUS_ARMS: readonly ContinuousArm[] = Object.freeze([
	'records',
	'compaction',
	'full',
])

/** Holds the prospective per-trajectory limits; a run that reaches one ends with status `limit`. */
export const CONTINUOUS_LIMITS: Omit<ContinuousLimits, 'goals'> = Object.freeze({
	calls: 4096,
	tokens: 4000000,
	wall: 28800000,
})

/** Configures the compaction arm: a bounded recap list with the newest exchange kept live. */
export const CONTINUOUS_COMPACTION: ContinuousCompaction = Object.freeze({
	predict: 320,
	sections: 3,
	keep: 0,
})

/** Holds the reserve of the fixed ladder every arm runs under; `buildBudget` maps it to the window. */
export const CONTINUOUS_RESERVE = 512

/** Holds the packet randomization seed the freeze records. */
export const CONTINUOUS_BLIND = 29

/** Names the policies a freeze may bind for a goal with no product. */
export const CONTINUOUS_FAILURE_POLICIES: readonly ContinuousFailurePolicy[] = Object.freeze([
	'stop',
	'continue',
])

/** Holds the policy a manifest frozen without one follows: a goal with no product ends the trajectory as `failed`. */
export const CONTINUOUS_FAILURE: ContinuousFailurePolicy = 'stop'

/** Holds the summarizer instruction the compaction arm folds older exchanges with. */
export const COMPACTION_SYSTEM =
	'You maintain the working memory of a support-desk assistant. Rewrite the transcript that follows as a compact recap for the assistant to rely on later. Keep every identifier, amount, date, deadline, decision, approval, correction, and open task with the person who owns it. When a later line replaces an earlier value, keep only the later value and say the earlier one is superseded. Keep what the assistant itself promised or produced. Omit greetings and filler. Write plain sentences without headings.'

/** Names the raw evidence every complete run retains. */
export const CONTINUOUS_FILES: readonly string[] = Object.freeze([
	'run.json',
	'execution.json',
	'rows.jsonl',
	'selections.jsonl',
	'requests.jsonl',
	'turns.jsonl',
	'messages.jsonl',
	'judgments.jsonl',
	'receipts.jsonl',
	'observations.jsonl',
	'sections.jsonl',
	'model-inventory.json',
])

/** Names the terminal statuses a series treats as a finished run. */
export const CONTINUOUS_TERMINAL: readonly string[] = Object.freeze([
	'complete',
	'overflow',
	'limit',
])

/** Points at the endurance workload custody the freeze binds by default. */
export const ENDURANCE_ROOT = join(HARNESS, '..', 'units', 'aggregates', 'endurance')
export const ENDURANCE_WORKLOAD = join(ENDURANCE_ROOT, 'manifest.json')
export const ENDURANCE_RUNTIME = join(ENDURANCE_ROOT, 'runtime', 'evaluation.json')
export const ENDURANCE_ORACLE = join(ENDURANCE_ROOT, 'private', 'evaluation.json')

/** Bounds the wait for the daemon to unload every model before a run. */
export const UNLOAD_ATTEMPTS = 60
export const UNLOAD_INTERVAL = 1000
