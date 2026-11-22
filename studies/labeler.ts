/**
 * Labels a graded result's semantic rows blind with one model lane, imports the labels, and writes counts only.
 * @remarks
 * The user runs it, outside every agent session:
 * `node studies/labeler.ts RESULT --assessment SHA256 [--pass N] [--sample N] [--human PATH] [--closure DIRECTORY]`.
 * It reads the study's authored instruction and controls from `tmp/studies/authored`. For a memory
 * result it reads each goal's abstention and arrival through `study progress` on this repository's
 * entry before it asks the model, and counts every row of an abstained goal as abstained.
 * The model is Claude Haiku 5.5 through Claude Code headless, under the user's own login: one call
 * per request, spawned without a shell from an empty directory, with no tools. Every file holding a
 * row, reason, criterion, or identity stays under `tmp/studies/labels`; the one file a pass writes
 * beside the result, its tally, holds counts only. `--pass N` labels the same pool again as pass N:
 * pass 1, the default, writes `RESULT.tally.json`, and a later pass writes under `pass-N` in the
 * labels folder and to `RESULT.pass-N.tally.json`, reusing only the lane saved for its own pass.
 * `--human` compares a filled spot-check sheet with the named pass's saved model lane and never
 * imports it.
 */
import type { StudyScore, StudyVerdict } from '@orkestrel/study'
import type {
	StudyLabelAgreement,
	StudyLabelAnswer,
	StudyLabelBatch,
	StudyLabelControl,
	StudyLabelImport,
	StudyLabelLane,
	StudyLabelMap,
	StudyLabelPartitionFunction,
	StudyLabelPool,
	StudyLabelRow,
} from '@orkestrel/study/server'
import { isArray, isNumber, isRecord, isString } from '@orkestrel/contract'
import { spawnSync } from 'node:child_process'
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	buildStudyLabelPrompt,
	collectStudyEvidence,
	compareStudyLabels,
	createStudyLabelPool,
	createStudyLabelSheet,
	decodeStudyJSON,
	encodeStudyJSON,
	hashStudyBytes,
	parseStudyLabelLane,
	readStudyResult,
	studyLabelAnswersContract,
} from '@orkestrel/study/server'

/** Names the one model the lane may answer as.
 * @example STUDY_LABELER_MODEL // 'claude-haiku-5-5'
 */
export const STUDY_LABELER_MODEL = 'claude-haiku-5-5'
/** Heads each request's prompt; the authored instruction travels as the system prompt.
 * @example STUDY_LABELER_REQUEST.startsWith('Answer') // true
 */
export const STUDY_LABELER_REQUEST = 'Answer every row below.'
/** Names the protected folder every row-bearing output stays under.
 * @example STUDY_LABELER_LABELS // 'tmp/studies/labels'
 */
export const STUDY_LABELER_LABELS = 'tmp/studies/labels'
/** Names the ignored folder of authored labeler inputs, one instruction and one control file per study.
 * @example STUDY_LABELER_AUTHORED // 'tmp/studies/authored'
 */
export const STUDY_LABELER_AUTHORED = 'tmp/studies/authored'
/** Bounds one model call, in milliseconds.
 * @example STUDY_LABELER_TIMEOUT // 180000
 */
export const STUDY_LABELER_TIMEOUT = 180000
/** States the labels files' version.
 * @example STUDY_LABELER_VERSION // '1'
 */
export const STUDY_LABELER_VERSION = '1'
/** Lists the three verdicts in report order.
 * @example STUDY_LABELER_VERDICTS.length // 3
 */
export const STUDY_LABELER_VERDICTS: readonly StudyVerdict[] = Object.freeze([
	'achieved',
	'unsuccessful',
	'unknown',
])
/** Names the driver whose adapter reports each goal's abstention to `study progress`.
 * @example STUDY_LABELER_DRIVER // 'memory'
 */
export const STUDY_LABELER_DRIVER = 'memory'
/** Names the arm a memory study measures; the one other arm the study lists is its control.
 * @example STUDY_LABELER_STRATEGY // 'records'
 */
export const STUDY_LABELER_STRATEGY = 'records'

/** Holds the labeler's resolved command line. */
export interface StudyLabelerOptions {
	readonly result: string
	readonly assessment: string
	/** Numbers the labeling pass, from 1; a later pass labels the same pool into its own labels folder and tally. */
	readonly pass: number
	/** Counts the rows a blind spot-check sheet draws; absent writes none. */
	readonly sample: number | undefined
	/** Names a filled spot-check sheet to compare as a human lane; absent labels with the model. */
	readonly human: string | undefined
	/** Names the closure whose entry imports and reports a result it executed; absent uses this repository's entry. */
	readonly closure: string | undefined
}

/** Asks the model one prompt and returns its parsed JSON output, or `undefined` when the call produced none. */
export type StudyLabelerCaller = (prompt: string) => Promise<unknown>

/** Counts one lane's requests: asked, asked a second time, and dropped after the second malformed answer. */
export interface StudyLabelerBatches {
	readonly asked: number
	/** Counts the requests asked twice; unknown when the lane was reused from an earlier run. */
	readonly retried: number | undefined
	readonly omitted: number
}

/** Holds one request's answers, absent after a second malformed answer, and whether it was asked twice. */
export interface StudyLabelerAsk {
	readonly answers: readonly StudyLabelAnswer[] | undefined
	readonly retried: boolean
}

/** Holds what one model lane returned over a pool. */
export interface StudyLabelerRun {
	readonly lane: StudyLabelLane
	readonly batches: StudyLabelerBatches
}

/** Counts the pool's rows, controls aside: asked, answered, and left unanswered. */
export interface StudyLabelerRows {
	readonly asked: number
	readonly answered: number
	readonly omitted: number
}

/** Names what one answered row counts as: `abstained` for every row of an abstained goal, whatever its label, and the labeled verdict otherwise. */
export type StudyLabelerOutcome = StudyVerdict | 'abstained'

/** Counts answered rows by outcome, so `achieved` counts an abstained goal's rows as not achieved. */
export interface StudyLabelerOutcomes {
	readonly achieved: number
	readonly unsuccessful: number
	readonly abstained: number
	readonly unknown: number
}

/** Counts one arm's answered rows by outcome. */
export interface StudyLabelerVerdicts extends StudyLabelerOutcomes {
	readonly arm: string
}

/** Counts one arm's answered rows of one criterion class by outcome. */
export interface StudyLabelerClass extends StudyLabelerOutcomes {
	readonly arm: string
	readonly class: string
}

/** Counts each arm's answered rows at arrival goals by outcome, split by whether the control arm abstained at the goal. */
export interface StudyLabelerSplit {
	readonly control: string
	/** Counts the rows at arrival goals the control arm abstained at. */
	readonly declined: readonly StudyLabelerVerdicts[]
	/** Counts the rows at the other arrival goals. */
	readonly attempted: readonly StudyLabelerVerdicts[]
}

/** Holds one answered row's arm and outcome, the two facts a per-arm count reads. */
export interface StudyLabelerEntry {
	readonly arm: string
	readonly outcome: StudyLabelerOutcome
}

/** Holds the goals `study progress` lists, each as `TRIAL/GOAL`: the ones whose reply abstained and the ones holding an `arrival` row. */
export interface StudyLabelerGoals {
	readonly abstained: ReadonlySet<string>
	readonly arrivals: ReadonlySet<string>
}

/** Counts the controls of one authored verdict and the ones the lane omitted or answered otherwise. */
export interface StudyLabelerControls {
	readonly verdict: StudyVerdict
	readonly count: number
	readonly missed: number
}

/** Counts one goal's `lookup` rows. */
export interface StudyLabelerLookups {
	readonly found: number
	readonly missing: number
}

/** Sums the lookups of the goals behind one arm's rows of one verdict, one goal's count for each row. */
export interface StudyLabelerRecall {
	readonly arm: string
	readonly verdict: StudyVerdict
	readonly rows: number
	readonly found: number
	readonly missing: number
}

/** Counts the sampled controls a person answered and how many matched the authored verdict. */
export interface StudyLabelerSpotCheck {
	readonly count: number
	readonly agreed: number
}

/** Holds a human spot-check against the model lane: agreement per class over shared rows, controls aside, and the sampled controls. */
export interface StudyLabelerComparison {
	readonly agreement: readonly StudyLabelAgreement[]
	readonly controls: StudyLabelerSpotCheck
}

/** Holds the counts beside a labeled result: no row, reason, criterion, or identity. */
export interface StudyLabelerTally {
	readonly study: string
	readonly labeler: string
	/** Names the graded assessment the pool came from. */
	readonly assessment: string
	/** Names the assessment `study label` wrote; absent before the import. */
	readonly labeled: string | undefined
	readonly rows: StudyLabelerRows
	readonly batches: StudyLabelerBatches
	/** Counts answered rows the labeler flagged as revealing their arm. */
	readonly revealed: number
	readonly verdicts: readonly StudyLabelerVerdicts[]
	/** Counts each arm's rows per criterion class, in arm then class order. */
	readonly classes: readonly StudyLabelerClass[]
	/** Splits the rows at arrival goals; absent when the input names no control arm. */
	readonly split: StudyLabelerSplit | undefined
	readonly controls: readonly StudyLabelerControls[]
	/** Repeats the labels sheet's own count of the lane's missed controls. */
	readonly missed: number
	readonly recall: readonly StudyLabelerRecall[]
	/** Holds the labeled report's per-arm counts; absent before the import. */
	readonly scores: readonly StudyScore[] | undefined
	/** Holds a human spot-check; absent until `--human` runs. */
	readonly comparison: StudyLabelerComparison | undefined
}

/** Holds what the tally reads. */
export interface StudyLabelerTallyInput {
	readonly study: string
	readonly assessment: string
	readonly labeled: string | undefined
	readonly map: StudyLabelMap
	readonly run: StudyLabelerRun
	readonly sheet: StudyLabelImport
	/** Maps each real trial id to its arm. */
	readonly arms: ReadonlyMap<string, string>
	/** Maps `TRIAL/GOAL` to that goal's lookups. */
	readonly lookups: ReadonlyMap<string, StudyLabelerLookups>
	/** Holds `TRIAL/GOAL` of every goal whose reply abstained. */
	readonly abstained: ReadonlySet<string>
	/** Holds `TRIAL/GOAL` of every goal holding an `arrival` row. */
	readonly arrivals: ReadonlySet<string>
	/** Names the arm whose abstention at a goal splits the arrival goals; absent leaves the tally without a split. */
	readonly control: string | undefined
	readonly scores: readonly StudyScore[] | undefined
}

/** Holds what a labeling run needs beyond its command line, so a test can supply a model and controls of its own. */
export interface StudyLabelerDependencies {
	readonly call: StudyLabelerCaller
	readonly controls: readonly StudyLabelControl[]
	/** Names the repository root the labels folder sits under. */
	readonly root: string
	/** States when the labels sheets were created. */
	readonly created: string
}

/** Holds a study's authored labeler inputs: its instruction text and its `StudyLabelControl[]` file. */
export interface StudyLabelerSources {
	readonly instruction: string
	readonly controls: string
}

/** Holds where the labeler writes: every row-bearing file under `labels`, and the counts beside the result. */
export interface StudyLabelerPaths {
	readonly labels: string
	readonly pool: string
	readonly lane: string
	readonly sheets: string
	readonly sample: string
	readonly answers: string
	readonly tally: string
}

/**
 * Resolves the command line, refusing a missing result or assessment, an unknown or repeated flag, and a malformed value.
 * @param argv - The arguments after the script path
 * @returns The resolved options
 * @throws Error - Thrown when an argument is missing, unknown, repeated, or malformed
 * @example parseStudyLabelerArguments(['tmp/studies/run', '--assessment', 'a'.repeat(64)]).sample // undefined
 */
export function parseStudyLabelerArguments(argv: readonly string[]): StudyLabelerOptions {
	const [target, ...rest] = argv
	if (target === undefined || target.startsWith('--'))
		throw new Error(
			'Usage: node studies/labeler.ts RESULT --assessment SHA256 [--pass N] [--sample N] [--human PATH] [--closure DIRECTORY]',
		)
	const flags = new Map<string, string>()
	for (const [index, flag] of rest.entries()) {
		// Each flag sits at an even index, with its value after it.
		if (index % 2 === 1) continue
		const value = rest[index + 1]
		if (!['--assessment', '--pass', '--sample', '--human', '--closure'].includes(flag))
			throw new Error(`Unknown labeler flag: ${flag}`)
		if (flags.has(flag)) throw new Error(`Repeated labeler flag: ${flag}`)
		if (value === undefined || value.startsWith('--'))
			throw new Error(`Labeler flag ${flag} needs a value`)
		flags.set(flag, value)
	}
	const assessment = flags.get('--assessment')
	if (assessment === undefined || !/^[0-9a-f]{64}$/u.test(assessment))
		throw new Error('The labeler needs --assessment with a lowercase SHA-256')
	const pass = flags.get('--pass')
	if (pass !== undefined && (!/^[1-9][0-9]*$/u.test(pass) || !Number.isSafeInteger(Number(pass))))
		throw new Error('--pass needs a whole number of at least 1')
	const sample = flags.get('--sample')
	if (sample !== undefined && !/^[1-9][0-9]*$/u.test(sample))
		throw new Error('--sample needs a positive whole number')
	const human = flags.get('--human')
	const closure = flags.get('--closure')
	return {
		result: resolve(target),
		assessment,
		pass: pass === undefined ? 1 : Number(pass),
		sample: sample === undefined ? undefined : Number(sample),
		human: human === undefined ? undefined : resolve(human),
		closure: closure === undefined ? undefined : resolve(closure),
	}
}

/**
 * Reads the model ids a Claude Code JSON output reports in `modelUsage`, joined in sorted order.
 * @param output - The parsed JSON output
 * @returns The ids, comma-joined, or `undefined` when the output reports none
 * @example readStudyLabelerModel({ modelUsage: { 'claude-haiku-5-5': {} } }) // 'claude-haiku-5-5'
 */
export function readStudyLabelerModel(output: unknown): string | undefined {
	if (typeof output !== 'object' || output === null || !('modelUsage' in output)) return undefined
	const usage = output.modelUsage
	if (typeof usage !== 'object' || usage === null) return undefined
	const models = Object.keys(usage).toSorted()
	return models.length === 0 ? undefined : models.join(',')
}

/**
 * Reads a successful output's structured answers when they satisfy Study's answer contract and name each of the request's rows once.
 * @param output - The parsed JSON output
 * @param batch - The request the answers belong to
 * @returns The answers, or `undefined` when the output failed, breaks the contract, carries a blank reason, or misses, repeats, or adds a row
 * @example readStudyLabelerAnswers({}, { rows: [] }) // undefined
 */
export function readStudyLabelerAnswers(
	output: unknown,
	batch: StudyLabelBatch,
): readonly StudyLabelAnswer[] | undefined {
	if (
		typeof output !== 'object' ||
		output === null ||
		!('type' in output) ||
		output.type !== 'result' ||
		!('subtype' in output) ||
		output.subtype !== 'success' ||
		!('is_error' in output) ||
		output.is_error !== false ||
		!('structured_output' in output)
	)
		return undefined
	const answers = output.structured_output
	if (!studyLabelAnswersContract.is(answers)) return undefined
	const expected = batch.rows.map((row) => row.row).toSorted((left, right) => left - right)
	const returned = answers.rows.map((row) => row.row).toSorted((left, right) => left - right)
	if (
		expected.length !== returned.length ||
		expected.some((row, index) => row !== returned[index]) ||
		answers.rows.some((row) => row.reason.trim() === '')
	)
		return undefined
	return answers.rows
}

/**
 * Reads one output's answers to a request after refusing any model other than `STUDY_LABELER_MODEL`.
 * @param output - The parsed JSON output
 * @param batch - The request the answers belong to
 * @returns The answers, or `undefined` when the output names no model or its answers are malformed
 * @throws Error - Thrown when the output reports another model, which refuses the whole run
 * @example readStudyLabelerOutput(undefined, { rows: [] }) // undefined
 */
export function readStudyLabelerOutput(
	output: unknown,
	batch: StudyLabelBatch,
): readonly StudyLabelAnswer[] | undefined {
	const model = readStudyLabelerModel(output)
	if (model !== undefined && model !== STUDY_LABELER_MODEL)
		throw new Error(`The labeler answered as ${model}, not ${STUDY_LABELER_MODEL}`)
	return model === undefined ? undefined : readStudyLabelerAnswers(output, batch)
}

/**
 * Asks the model one request, and once more when the first answer is malformed.
 * @param batch - The request
 * @param call - The model caller
 * @returns The answers, absent after a second malformed answer, and whether the request was asked twice
 * @throws Error - Thrown when an output reports another model
 * @example (await askStudyLabelerBatch({ rows: [] }, async () => undefined)).retried // true
 */
export async function askStudyLabelerBatch(
	batch: StudyLabelBatch,
	call: StudyLabelerCaller,
): Promise<StudyLabelerAsk> {
	const prompt = buildStudyLabelPrompt(batch, STUDY_LABELER_REQUEST)
	const first = readStudyLabelerOutput(await call(prompt), batch)
	if (first !== undefined) return { answers: first, retried: false }
	return { answers: readStudyLabelerOutput(await call(prompt), batch), retried: true }
}

/**
 * Asks the model each request of a pool in order, asking a malformed answer once more and dropping it after a second.
 * @param pool - The pool's blind requests
 * @param call - The model caller
 * @returns The lane, through Study's lane parser, and the request counts
 * @throws Error - Thrown when an output reports a model other than `STUDY_LABELER_MODEL`, which refuses the whole run
 * @example (await labelStudyPool({ requests: [], map: { links: [], checks: [] } }, async () => undefined)).batches.asked // 0
 */
export async function labelStudyPool(
	pool: StudyLabelPool,
	call: StudyLabelerCaller,
): Promise<StudyLabelerRun> {
	const asks: StudyLabelerAsk[] = []
	// One request at a time, in pool order, so a refused model stops the run before another call.
	for (const batch of pool.requests) asks.push(await askStudyLabelerBatch(batch, call))
	return {
		lane: parseStudyLabelLane(
			{ rows: asks.flatMap((ask) => ask.answers ?? []) },
			{ labeler: STUDY_LABELER_MODEL, method: 'model' },
		),
		batches: {
			asked: pool.requests.length,
			retried: asks.filter((ask) => ask.retried).length,
			omitted: asks.filter((ask) => ask.answers === undefined).length,
		},
	}
}

/**
 * Reads a criterion's goal and class from its id, `GOAL-CLASS`, against the result's own goal ids.
 * @param goals - The goal ids the result's scenarios declare
 * @returns The partition reader: the longest goal the id opens with, and the rest as the class
 * @example resolveStudyLabelerPartition(['ev-01-1'])({ trial: 't', criterion: 'ev-01-1-facts' }) // { goal: 'ev-01-1', class: 'facts' }
 */
export function resolveStudyLabelerPartition(
	goals: readonly string[],
): StudyLabelPartitionFunction {
	const ordered = [...new Set(goals)].toSorted((left, right) => right.length - left.length)
	return (source) => {
		const goal = ordered.find(
			(entry) =>
				source.criterion.startsWith(`${entry}-`) && source.criterion.length > entry.length + 1,
		)
		return goal === undefined ? undefined : { goal, class: source.criterion.slice(goal.length + 1) }
	}
}

/**
 * Resolves a memory study's control arm: the one arm it lists beside `STUDY_LABELER_STRATEGY`.
 * @param arms - The arms the study lists
 * @returns The control arm, or `undefined` when the study lists no strategy arm, or not exactly one arm beside it
 * @example resolveStudyLabelerControl(['records', 'plain']) // 'plain'
 */
export function resolveStudyLabelerControl(arms: readonly string[]): string | undefined {
	const others = arms.filter((arm) => arm !== STUDY_LABELER_STRATEGY)
	return arms.includes(STUDY_LABELER_STRATEGY) && others.length === 1 ? others[0] : undefined
}

/**
 * Collects, from the `progress` member `study progress` prints, every listed goal whose adapter reading reports `abstained: true` and every listed goal holding an `arrival` row.
 * @param progress - The `progress` member of the command's output
 * @returns Both sets, each goal written `TRIAL/GOAL`
 * @throws Error - Thrown when the value lists no trials, or lists a malformed trial or goal
 * @example collectStudyLabelerGoals({ trials: [] }).abstained.size // 0
 */
export function collectStudyLabelerGoals(progress: unknown): StudyLabelerGoals {
	if (!isRecord(progress) || !isArray(progress.trials))
		throw new Error('study progress listed no trials')
	const listed = progress.trials.flatMap((entry) => {
		if (
			!isRecord(entry) ||
			!isRecord(entry.trial) ||
			!isString(entry.trial.id) ||
			!isArray(entry.goals)
		)
			throw new Error('study progress listed a malformed trial')
		const trial = entry.trial.id
		return entry.goals.map((goal) => {
			if (!isRecord(goal) || !isString(goal.goal) || !isRecord(goal.events))
				throw new Error('study progress listed a malformed goal')
			const arrivals = goal.events.arrival
			return {
				key: `${trial}/${goal.goal}`,
				abstained: isRecord(goal.projection) && goal.projection.abstained === true,
				arrival: isNumber(arrivals) && arrivals > 0,
			}
		})
	})
	return {
		abstained: new Set(listed.filter((goal) => goal.abstained).map((goal) => goal.key)),
		arrivals: new Set(listed.filter((goal) => goal.arrival).map((goal) => goal.key)),
	}
}

/**
 * Counts outcomes by kind, so the four counts sum to the outcomes given.
 * @param outcomes - One outcome per answered row
 * @returns The count of each outcome
 * @example computeStudyLabelerOutcomes(['achieved', 'abstained']).abstained // 1
 */
export function computeStudyLabelerOutcomes(
	outcomes: readonly StudyLabelerOutcome[],
): StudyLabelerOutcomes {
	return {
		achieved: outcomes.filter((outcome) => outcome === 'achieved').length,
		unsuccessful: outcomes.filter((outcome) => outcome === 'unsuccessful').length,
		abstained: outcomes.filter((outcome) => outcome === 'abstained').length,
		unknown: outcomes.filter((outcome) => outcome === 'unknown').length,
	}
}

/**
 * Counts each arm's entries by outcome, one count per arm in the order given.
 * @param arms - The arms to count, each listed even when no entry names it
 * @param entries - One entry per answered row
 * @returns One count per arm
 * @example computeStudyLabelerVerdicts(['plain'], [{ arm: 'plain', outcome: 'abstained' }])[0]?.abstained // 1
 */
export function computeStudyLabelerVerdicts(
	arms: readonly string[],
	entries: readonly StudyLabelerEntry[],
): readonly StudyLabelerVerdicts[] {
	return arms.map((arm) => ({
		arm,
		...computeStudyLabelerOutcomes(
			entries.filter((entry) => entry.arm === arm).map((entry) => entry.outcome),
		),
	}))
}

/**
 * Draws a blind spot-check from every row of a pool, controls among them, in a repeatable order.
 * @param pool - The pool
 * @param count - The rows to draw, at most every row
 * @param order - The text the draw repeats for
 * @returns The drawn rows in row order, holding only what a labeler reads
 * @example drawStudyLabelerSample({ requests: [], map: { links: [], checks: [] } }, 3, 'a').length // 0
 */
export function drawStudyLabelerSample(
	pool: StudyLabelPool,
	count: number,
	order: string,
): readonly StudyLabelRow[] {
	return pool.requests
		.flatMap((batch) => batch.rows)
		.map((row) => ({ row, rank: hashStudyBytes(`${order}\nsample/${String(row.row)}`) }))
		.toSorted((left, right) => (left.rank < right.rank ? -1 : 1))
		.slice(0, count)
		.map((entry) => entry.row)
		.toSorted((left, right) => left.row - right.row)
}

/**
 * Compares a person's spot-check with the model lane, per class over shared rows and on the sampled controls.
 * @param map - The pool's map
 * @param model - The model lane
 * @param human - The person's lane
 * @returns Study's agreement per class, controls aside, and the sampled controls the person matched
 * @example compareStudyLabelerHuman({ links: [], checks: [] }, lane, lane).controls.count // 0
 */
export function compareStudyLabelerHuman(
	map: StudyLabelMap,
	model: StudyLabelLane,
	human: StudyLabelLane,
): StudyLabelerComparison {
	const checked = map.checks.flatMap((check) => {
		const answer = human.rows.find((row) => row.row === check.row)
		return answer === undefined ? [] : [answer.verdict === check.verdict]
	})
	return {
		agreement: compareStudyLabels(human.rows, model.rows, map),
		controls: { count: checked.length, agreed: checked.filter((agreed) => agreed).length },
	}
}

/**
 * Builds the counts beside a labeled result, joining each answered row to its arm and goal through the map alone.
 * @remarks
 * Every row of an abstained goal counts as `abstained`, whatever its label, so `achieved` counts
 * an abstention as not achieved and the four outcomes sum to the answered rows. `recall` keeps the
 * labeled verdicts. The split reads arrival goals only, each on the side the control arm's
 * abstention at that goal puts it.
 * @param input - The pool's map, the lane, the labels sheet, each trial's arm, each goal's lookups, abstention, and arrival, the control arm, and the report
 * @returns The counts: no row, reason, criterion, or identity
 * @example buildStudyLabelerTally(input).rows.asked // the pool's rows, controls aside
 */
export function buildStudyLabelerTally(input: StudyLabelerTallyInput): StudyLabelerTally {
	const answers = new Map(input.run.lane.rows.map((row) => [row.row, row]))
	const controls = [...input.arms].flatMap(([trial, arm]) => (arm === input.control ? [trial] : []))
	const answered = input.map.links.flatMap((link) => {
		const answer = answers.get(link.row)
		if (answer === undefined) return []
		const key = `${link.source.trial}/${link.goal}`
		const outcome: StudyLabelerOutcome = input.abstained.has(key) ? 'abstained' : answer.verdict
		return [
			{
				arm: input.arms.get(link.source.trial) ?? 'unscheduled',
				link,
				answer,
				outcome,
				arrival: input.arrivals.has(key),
				declined: controls.some((trial) => input.abstained.has(`${trial}/${link.goal}`)),
			},
		]
	})
	const arms = [...new Set(answered.map((entry) => entry.arm))].toSorted()
	const arrived = answered.filter((entry) => entry.arrival)
	return {
		study: input.study,
		labeler: input.run.lane.labeler,
		assessment: input.assessment,
		labeled: input.labeled,
		rows: {
			asked: input.map.links.length,
			answered: answered.length,
			omitted: input.sheet.omitted,
		},
		batches: input.run.batches,
		revealed: answered.filter((entry) => entry.answer.revealed === true).length,
		verdicts: computeStudyLabelerVerdicts(arms, answered),
		classes: arms.flatMap((arm) => {
			const selected = answered.filter((entry) => entry.arm === arm)
			return [...new Set(selected.map((entry) => entry.link.class))].toSorted().map((name) => ({
				arm,
				class: name,
				...computeStudyLabelerOutcomes(
					selected.filter((entry) => entry.link.class === name).map((entry) => entry.outcome),
				),
			}))
		}),
		split:
			input.control === undefined
				? undefined
				: {
						control: input.control,
						declined: computeStudyLabelerVerdicts(
							arms,
							arrived.filter((entry) => entry.declined),
						),
						attempted: computeStudyLabelerVerdicts(
							arms,
							arrived.filter((entry) => !entry.declined),
						),
					},
		controls: STUDY_LABELER_VERDICTS.flatMap((verdict) => {
			const checks = input.map.checks.filter((check) => check.verdict === verdict)
			return checks.length === 0
				? []
				: [
						{
							verdict,
							count: checks.length,
							missed: checks.filter((check) => answers.get(check.row)?.verdict !== verdict).length,
						},
					]
		}),
		missed: input.sheet.missed[0] ?? 0,
		recall: arms.flatMap((arm) =>
			STUDY_LABELER_VERDICTS.flatMap((verdict) => {
				const selected = answered.filter(
					(entry) => entry.arm === arm && entry.answer.verdict === verdict,
				)
				if (selected.length === 0) return []
				const counts = selected.map(
					(entry) =>
						input.lookups.get(`${entry.link.source.trial}/${entry.link.goal}`) ?? {
							found: 0,
							missing: 0,
						},
				)
				return [
					{
						arm,
						verdict,
						rows: selected.length,
						found: counts.reduce((sum, count) => sum + count.found, 0),
						missing: counts.reduce((sum, count) => sum + count.missing, 0),
					},
				]
			}),
		),
		scores: input.scores,
		comparison: undefined,
	}
}

/**
 * Plans where one labeling pass writes: every row-bearing file under the protected labels folder, and the counts beside the result.
 * @remarks
 * Pass 1 writes under `SEAL/ASSESSMENT` in the labels folder and to `RESULT.tally.json`. A later
 * pass N writes under `SEAL/ASSESSMENT/pass-N` and to `RESULT.pass-N.tally.json`, so no pass reads
 * or replaces another pass's lane or tally.
 * @param options - The result's absolute directory, the graded assessment, and the pass
 * @param seal - The sealed result's seal id
 * @param root - The repository root the labels folder sits under
 * @returns The paths
 * @example planStudyLabelerPaths({ result: '/r/tmp/studies/run', assessment: 'a', pass: 2 }, 's', '/r').tally // '/r/tmp/studies/run.pass-2.tally.json'
 */
export function planStudyLabelerPaths(
	options: Pick<StudyLabelerOptions, 'result' | 'assessment' | 'pass'>,
	seal: string,
	root: string,
): StudyLabelerPaths {
	const assessment = join(root, STUDY_LABELER_LABELS, seal, options.assessment)
	const labels = options.pass === 1 ? assessment : join(assessment, `pass-${String(options.pass)}`)
	return {
		labels,
		pool: join(labels, 'pool.json'),
		lane: join(labels, 'lane.json'),
		sheets: join(labels, 'sheets'),
		sample: join(labels, 'sample.json'),
		answers: join(labels, 'answers.json'),
		tally:
			options.pass === 1
				? `${options.result}.tally.json`
				: `${options.result}.pass-${String(options.pass)}.tally.json`,
	}
}

/**
 * Reads a saved model lane, the whole `StudyLabelLane` the labeler writes, through Study's lane parser.
 * @param bytes - The saved lane file's bytes
 * @returns The lane, labeled by `STUDY_LABELER_MODEL` with method `model`
 * @throws Error - Thrown when the file is not a lane or names another labeler or method
 * @example readStudyLabelerLane(new TextEncoder().encode(JSON.stringify({ labeler: 'claude-haiku-5-5', method: 'model', rows: [] }))).rows // []
 */
export function readStudyLabelerLane(bytes: Uint8Array): StudyLabelLane {
	const value = decodeStudyJSON(bytes)
	if (typeof value !== 'object' || value === null || Array.isArray(value) || !('rows' in value))
		throw new Error('The saved lane holds no rows')
	if (
		!('labeler' in value) ||
		value.labeler !== STUDY_LABELER_MODEL ||
		!('method' in value) ||
		value.method !== 'model'
	)
		throw new Error('The saved lane names another labeler or method')
	return parseStudyLabelLane(
		{ rows: value.rows },
		{ labeler: STUDY_LABELER_MODEL, method: 'model' },
	)
}

/**
 * Reads the model lane an earlier run saved for the same pool, so a failed import is retried without asking the model again.
 * @remarks
 * The saved pool must equal this pool byte for byte: the same packet, controls, and order. The request counts
 * are derived from the lane, and `retried` is unknown, because an earlier run did not keep it.
 * @param paths - The run's paths
 * @param pool - The pool this run built
 * @returns The saved lane and its request counts, or `undefined` when no lane is saved or the saved pool differs
 * @example readStudyLabelerSaved(paths, pool) // undefined before a first run
 */
export function readStudyLabelerSaved(
	paths: StudyLabelerPaths,
	pool: StudyLabelPool,
): StudyLabelerRun | undefined {
	if (!existsSync(paths.pool) || !existsSync(paths.lane)) return undefined
	if (!Buffer.from(readFileSync(paths.pool)).equals(Buffer.from(encodeStudyJSON(pool))))
		return undefined
	const lane = readStudyLabelerLane(readFileSync(paths.lane))
	const answered = new Set(lane.rows.map((row) => row.row))
	return {
		lane,
		batches: {
			asked: pool.requests.length,
			retried: undefined,
			omitted: pool.requests.filter((batch) => batch.rows.every((row) => !answered.has(row.row)))
				.length,
		},
	}
}

/**
 * Labels one pass of a pool: reuses the lane saved for this exact pool under the pass's paths, or asks the model and saves its lane there.
 * @remarks
 * Each pass keeps its own labels folder, so a run reuses only its own pass's lane: the first run of
 * a pass asks the model, and a later run of that pass, after a failed import, asks it nothing.
 * @param paths - The pass's paths
 * @param pool - The pool this run built
 * @param call - The model caller
 * @returns The saved or fresh lane and its request counts
 * @throws Error - Thrown when the saved lane is malformed or an output reports a model other than `STUDY_LABELER_MODEL`
 * @example (await labelStudyPass(paths, pool, call)).batches.asked // pool.requests.length
 */
export async function labelStudyPass(
	paths: StudyLabelerPaths,
	pool: StudyLabelPool,
	call: StudyLabelerCaller,
): Promise<StudyLabelerRun> {
	// The saved pool is read before this pool replaces it.
	const saved = readStudyLabelerSaved(paths, pool)
	mkdirSync(paths.sheets, { recursive: true })
	writeFileSync(paths.pool, encodeStudyJSON(pool))
	if (saved !== undefined) return saved
	const run = await labelStudyPool(pool, call)
	writeFileSync(paths.lane, encodeStudyJSON(run.lane))
	return run
}

/**
 * Names a study's authored labeler inputs under the authored folder.
 * @param root - The repository root
 * @param study - The study the graded result declares
 * @returns The instruction, `instruction.STUDY.md`, and the controls, `controls.STUDY.json`
 * @example planStudyLabelerSources('/r', 'endurance').controls // '/r/tmp/studies/authored/controls.endurance.json'
 */
export function planStudyLabelerSources(root: string, study: string): StudyLabelerSources {
	return {
		instruction: join(root, STUDY_LABELER_AUTHORED, `instruction.${study}.md`),
		controls: join(root, STUDY_LABELER_AUTHORED, `controls.${study}.json`),
	}
}

/**
 * Checks one per-arm score of a Study report.
 * @param value - The untrusted value
 * @returns Whether it holds an arm and every count `StudyScore` declares
 * @example isStudyLabelerScore({ arm: 'records' }) // false
 */
export function isStudyLabelerScore(value: unknown): value is StudyScore {
	return (
		typeof value === 'object' &&
		value !== null &&
		'arm' in value &&
		typeof value.arm === 'string' &&
		[
			'total',
			'achieved',
			'unsuccessful',
			'unknown',
			'critical',
			'lower',
			'upper',
			'coverage',
		].every((key) => key in value && typeof Reflect.get(value, key) === 'number')
	)
}

/**
 * Reads the authored controls: a JSON array of `StudyLabelControl`, each holding its text and authored verdict.
 * @param bytes - The controls file's bytes
 * @returns The controls; the pool's contract refuses a verdict outside the three
 * @throws Error - Thrown when the file is not an array of objects each holding input, product, assertion, and verdict
 * @example readStudyLabelerControls(new TextEncoder().encode('[]')) // []
 */
export function readStudyLabelerControls(bytes: Uint8Array): readonly StudyLabelControl[] {
	const value = decodeStudyJSON(bytes)
	if (!Array.isArray(value)) throw new Error('The labeler controls must be a JSON array')
	return value.map((entry, index) => {
		if (
			typeof entry !== 'object' ||
			entry === null ||
			Array.isArray(entry) ||
			!('input' in entry) ||
			!('product' in entry) ||
			!('assertion' in entry) ||
			!('verdict' in entry) ||
			!STUDY_LABELER_VERDICTS.some((verdict) => verdict === entry.verdict)
		)
			throw new Error(
				`Labeler control ${String(index)} needs input, product, assertion, and a verdict`,
			)
		const verdict = STUDY_LABELER_VERDICTS.find((name) => name === entry.verdict) ?? 'unknown'
		return { input: entry.input, product: entry.product, assertion: entry.assertion, verdict }
	})
}

// Spawns one headless Haiku call without a shell from an empty directory, with no tools, and parses its JSON.
function callStudyLabelerModel(prompt: string, instruction: string, directory: string): unknown {
	const done = spawnSync(
		'claude',
		[
			'-p',
			'--model',
			STUDY_LABELER_MODEL,
			'--output-format',
			'json',
			'--tools',
			'',
			'--system-prompt',
			instruction,
			'--json-schema',
			JSON.stringify(studyLabelAnswersContract.schema),
			'--no-session-persistence',
			'--strict-mcp-config',
			'--disable-slash-commands',
			'--setting-sources',
			'project',
		],
		{
			cwd: directory,
			input: prompt,
			encoding: 'utf8',
			timeout: STUDY_LABELER_TIMEOUT,
			shell: false,
			maxBuffer: 1 << 26,
		},
	)
	if (done.status !== 0) return undefined
	try {
		return JSON.parse(done.stdout)
	} catch {
		return undefined
	}
}

// Runs one Study command through the entry that may read the result, and parses its last JSON line.
function runStudyLabelerCommand(
	args: readonly string[],
	closure: string | undefined,
): Record<string, unknown> {
	const entry =
		closure === undefined
			? resolve('node_modules/@orkestrel/study/dist/bin/main.js')
			: join(closure, 'node_modules/@orkestrel/study/dist/bin/main.js')
	const done = spawnSync(process.execPath, [entry, ...args], {
		cwd: closure ?? process.cwd(),
		encoding: 'utf8',
		maxBuffer: 1 << 28,
	})
	if (done.status !== 0)
		throw new Error(
			`study ${args[0] ?? ''} exited ${String(done.status)}: ${(done.stderr ?? '').slice(-300)}`,
		)
	const line = done.stdout
		.split(/\r?\n/u)
		.filter((text) => text.startsWith('{'))
		.at(-1)
	const value: unknown = line === undefined ? undefined : JSON.parse(line)
	if (typeof value !== 'object' || value === null)
		throw new Error(`study ${args[0] ?? ''} printed no JSON`)
	return Object.fromEntries(Object.entries(value))
}

/**
 * Labels, imports, reports, and tallies one graded result, or compares a filled spot-check with its saved lane.
 * @param options - The resolved command line
 * @param dependencies - The model caller, the authored controls, the root the labels folder sits under, and the sheet timestamp
 * @returns The tally text it wrote beside the result
 * @throws Error - Thrown when the result is not sealed, the assessment holds no single packet, or the model is refused
 * @example await labelStudyResult(options, { call, controls, root: process.cwd(), created: new Date().toISOString() })
 */
export async function labelStudyResult(
	options: StudyLabelerOptions,
	dependencies: StudyLabelerDependencies,
): Promise<string> {
	const result = await readStudyResult(options.result)
	if (result.status !== 'sealed') throw new Error('The labeler needs a sealed result')
	const seal = result.seal.id
	const paths = planStudyLabelerPaths(options, seal, dependencies.root)
	const grades = join(options.result, 'grades', options.assessment)
	const packets = readdirSync(grades).filter((name) => name.endsWith('.packet.json'))
	const packet = packets[0]
	if (packet === undefined || packets.length !== 1)
		throw new Error('The assessment needs exactly one semantic packet to label')
	const goals = result.manifest.scenarios.flatMap((scenario) =>
		scenario.goals.map((goal) => goal.id),
	)
	// One segment carries the whole packet, whose digest the labels bind; each row's arm comes from the schedule.
	const pool = createStudyLabelPool(
		[
			{
				result: seal,
				arm: result.manifest.definition.name,
				packet: readFileSync(join(grades, packet)),
				legend: readFileSync(join(grades, packet.replace(/\.packet\.json$/u, '.mapping.json'))),
			},
		],
		{
			order: options.assessment,
			controls: dependencies.controls,
			partition: resolveStudyLabelerPartition(goals),
		},
	)
	if (options.human !== undefined) {
		mkdirSync(paths.sheets, { recursive: true })
		writeFileSync(paths.pool, encodeStudyJSON(pool))
		const tally: unknown = decodeStudyJSON(readFileSync(paths.tally))
		const model = readStudyLabelerLane(readFileSync(paths.lane))
		const human = parseStudyLabelLane(decodeStudyJSON(readFileSync(options.human)), {
			labeler: 'human',
			method: 'human',
		})
		if (typeof tally !== 'object' || tally === null) throw new Error('The tally is malformed')
		const compared = `${JSON.stringify({ ...tally, comparison: compareStudyLabelerHuman(pool.map, model, human) }, null, '\t')}\n`
		writeFileSync(paths.tally, compared)
		return compared
	}
	// This repository's adapter reads each goal's abstention, so a re-label applies the detector it holds; the read precedes any model call.
	const definition = result.manifest.definition
	const [first] = goals
	const progress =
		definition.driver === STUDY_LABELER_DRIVER && first !== undefined
			? runStudyLabelerCommand(['progress', options.result, '--from', first], undefined)
			: undefined
	const marks =
		progress === undefined
			? { abstained: new Set<string>(), arrivals: new Set<string>() }
			: collectStudyLabelerGoals(progress.progress)
	// A lane saved for this pass and this exact pool is reused, so a run that failed after labeling asks the model nothing again.
	const run = await labelStudyPass(paths, pool, dependencies.call)
	const sheet = createStudyLabelSheet(pool.map, [run.lane], {
		created: dependencies.created,
		version: STUDY_LABELER_VERSION,
		partial: true,
	})
	// One sheet per packet, each imported over the graded assessment; the last import names the labeled one.
	const imports = sheet.labels.map((labels) => {
		const file = join(paths.sheets, `${labels.packet}.json`)
		writeFileSync(file, encodeStudyJSON(labels))
		return runStudyLabelerCommand(
			['label', options.result, '--assessment', options.assessment, '--labels', file],
			options.closure,
		)
	})
	const named = imports.at(-1)?.assessment
	const labeled = typeof named === 'string' ? named : undefined
	const reported =
		labeled === undefined
			? undefined
			: runStudyLabelerCommand(['report', options.result, '--assessment', labeled], options.closure)
	const report = reported?.report
	const listed: unknown =
		typeof report === 'object' && report !== null && 'scores' in report ? report.scores : undefined
	const scores = Array.isArray(listed) && listed.every(isStudyLabelerScore) ? listed : undefined
	const evidence = await collectStudyEvidence(result)
	const lookups = new Map<string, StudyLabelerLookups>()
	for (const [trial, rows] of Object.entries(evidence))
		for (const row of rows) {
			if (row.event !== 'lookup' || typeof row.value !== 'object' || row.value === null) continue
			const key = `${trial}/${row.goal}`
			const held = lookups.get(key) ?? { found: 0, missing: 0 }
			const found = 'found' in row.value && row.value.found === true
			lookups.set(key, {
				found: held.found + (found ? 1 : 0),
				missing: held.missing + (found ? 0 : 1),
			})
		}
	const tally = buildStudyLabelerTally({
		study: result.manifest.definition.name,
		assessment: options.assessment,
		labeled,
		map: pool.map,
		run,
		sheet,
		arms: new Map(result.manifest.schedule.map((trial) => [trial.id, trial.arm])),
		lookups,
		abstained: marks.abstained,
		arrivals: marks.arrivals,
		control:
			definition.driver === STUDY_LABELER_DRIVER
				? resolveStudyLabelerControl(definition.arms)
				: undefined,
		scores,
	})
	const text = `${JSON.stringify(tally, null, '\t')}\n`
	writeFileSync(paths.tally, text)
	if (options.sample !== undefined) {
		const drawn = drawStudyLabelerSample(pool, options.sample, options.assessment)
		writeFileSync(paths.sample, encodeStudyJSON({ rows: drawn }))
		writeFileSync(
			paths.answers,
			`${JSON.stringify({ rows: drawn.map((row) => ({ row: row.row, verdict: 'unknown', reason: '' })) }, null, '\t')}\n`,
		)
	}
	return text
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
	const options = parseStudyLabelerArguments(process.argv.slice(2))
	const result = await readStudyResult(options.result)
	if (result.status !== 'sealed') throw new Error('The labeler needs a sealed result')
	const sources = planStudyLabelerSources(process.cwd(), result.manifest.definition.name)
	const instruction = readFileSync(sources.instruction, 'utf8')
	const empty = mkdtempSync(join(tmpdir(), 'study-labeler-'))
	try {
		process.stdout.write(
			await labelStudyResult(options, {
				call: (prompt) => Promise.resolve(callStudyLabelerModel(prompt, instruction, empty)),
				controls: readStudyLabelerControls(readFileSync(sources.controls)),
				root: process.cwd(),
				created: new Date().toISOString(),
			}),
		)
	} finally {
		rmSync(empty, { recursive: true, force: true })
	}
}
