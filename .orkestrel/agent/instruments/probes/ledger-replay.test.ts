import type {
	Admission,
	BodyDifference,
	Cause,
	Comparison,
	SeedRoles,
	ShiftContext,
	WireBody,
} from './ledger-replay-compare.js'
import type { CopyReplay, GoalReplay, HeldRow, ProviderCall, WireExchange } from './ledger-replay-support.js'
import type { Message } from '../../src/core/index.js'
import type { ToolCall, ToolDefinition } from '@orkestrel/tool'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { canonicalStringify, isArray, isRecord, isString, parseJSONAs } from '@orkestrel/contract'
import { MESSAGE_ROLES, LEDGER_NOTES, splitSentences } from '../../src/core/index.js'
import {
	CAUSE,
	NORMALIZATIONS,
	PIN_LINE,
	admitShifts,
	buildPortBody,
	classify,
	compareCall,
	createApplied,
	createShiftPool,
	diffBodies,
	explain,
	isStale,
	listRecallCandidates,
	reduceRecorded,
	stable,
} from './ledger-replay-compare.js'
import {
	COPIES,
	buildSystem,
	createHeldMatcher,
	createJudgeTransport,
	listSeedRoles,
	listSettingMismatches,
	readJudgeContext,
	readJudgeSettings,
	renderHeldPrompt,
	replayCopy,
} from './ledger-replay-support.js'

// Replays the 8 measured a5-records runs through the ported `createLedger` with no model and no daemon:
// the agent replies and the judge responses come from the recorded wire, and the probe compares what the
// port sends with what the measured harness sent (`/home/user/agent/tmp/bench3/bench.mjs`).
//
// The agent bodies equal their recorded bodies after normalizations N1 to N8 (separator, handle sentence,
// `[rN] ` prefixes, line leads, amended marks, recall description, recall leads, ended pin lines), or
// differ by a listed residual: F4a (the answer pass keeps the seed's tool calls) and R2a (stale raw lines
// reach the unscoped briefing; staleness comes from the corrections the run decided, and only the
// briefing route drops them). N10 admits a cut shift: a recall that keeps another number of the same
// candidates in the same order, the answer note that carries those items, and a later recall that lists
// that note (ruling T1; the check is in `ledger-replay-compare.ts`). Any other difference is unlisted, and
// the probe labels it with one or more causes C1 to C6 and C8 and fails on it. N9 admits the held second ask: a judge body with no recorded
// twin that matches a held row gets the recorded failure once per row. Any other judge body with no
// recorded twin fails the judge test.
//
// The scripted provider reports the recorded completion tokens and rewrites `usage.prompt` from the
// per-call ratio in `ledger.jsonl`: the daemon counted the measured bytes and the port sends fewer, and the
// gauge then rescales as it did in the measured run. The last control asserts that this changes a body.

const HERE = dirname(fileURLToPath(import.meta.url))
const REPORT = join(HERE, 'ledger-replay-report.json')
const EVIDENCE = join(HERE, '..', 'units', 'f2-recall-residue-rooms.json')

const replays = new Map<number, CopyReplay>()
for (const copy of COPIES) replays.set(copy, await replayCopy(copy))

function replayOf(copy: number): CopyReplay {
	const replay = replays.get(copy)
	if (replay === undefined) throw new Error(`no replay of copy ${copy}`)
	return replay
}

const rolesOf = new Map<number, SeedRoles>(
	COPIES.map((copy) => {
		const replay = replayOf(copy)
		return [copy, listSeedRoles(replay.scenario, replay.run)]
	}),
)

function seedOf(copy: number): SeedRoles {
	const roles = rolesOf.get(copy)
	if (roles === undefined) throw new Error(`no roles of copy ${copy}`)
	return roles
}

function compareCopy(copy: number): {
	readonly comparisons: readonly Comparison[]
	readonly applied: ReturnType<typeof createApplied>
} {
	const replay = replayOf(copy)
	const applied = createApplied()
	const roles = seedOf(copy)
	// One pool per copy: a later answer note lists the items an earlier recall of the same run shifted.
	const shifts = createShiftPool()
	const comparisons = replay.goals.flatMap((goal) =>
		goal.calls.flatMap((call, index) => {
			const recorded = goal.recorded[index]
			return recorded === undefined
				? []
				: [compareCall({ recorded, call, goal: goal.goal, index, roles, applied, shifts })]
		}),
	)
	return { comparisons, applied }
}

const compared = new Map<number, ReturnType<typeof compareCopy>>(
	COPIES.map((copy) => [copy, compareCopy(copy)]),
)

function clip(text: string, size = 170): string {
	return text.length > size ? `${text.slice(0, size - 3)}...` : text
}

function listHeld(copy: number): ReadonlyArray<{ readonly index: number; readonly item: string }> {
	return replayOf(copy).traces.flatMap((trace, index) =>
		trace.twin === 'held failure' ? [{ index, item: trace.row?.item ?? '' }] : [],
	)
}

const CAUSES: readonly Cause[] = Object.values(CAUSE)

function countCauses(copy: number): ReadonlyMap<Cause, number> {
	const counts = new Map<Cause, number>(CAUSES.map((cause) => [cause, 0]))
	const add = (cause: Cause, by: number): void => {
		counts.set(cause, (counts.get(cause) ?? 0) + by)
	}
	for (const one of compared.get(copy)?.comparisons ?? []) for (const cause of one.causes) add(cause, 1)
	return counts
}

function group(items: readonly string[]): readonly string[] {
	const counts = new Map<string, number>()
	for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1)
	return [...counts].map(([item, count]) => (count === 1 ? item : `${item} (${count} bodies)`))
}

function buildReport(copy: number): string {
	const replay = replayOf(copy)
	const entry = compared.get(copy)
	if (entry === undefined) throw new Error(`no comparison of copy ${copy}`)
	const { comparisons, applied } = entry
	const recordedJudge = replay.run.judge.length
	const held = listHeld(copy)
	const status = (name: Comparison['status']): number =>
		comparisons.filter((one) => one.status === name).length
	const counts = countCauses(copy)
	const out = [
		`copy v${copy}: ${comparisons.length} agent bodies compared in ${replay.goals.length} goals (${replay.run.calibration.length} calibration bodies not replayed: the gauge comes from seed.json); ${replay.traces.length} judge bodies compared (${replay.traces.length - held.length} against the ${recordedJudge} recorded bodies, ${held.length} held second asks under N9)`,
		`  pricing: the scripted provider rewrote usage.prompt from the per-call ratio in ledger.jsonl on ${replay.rewritten} of ${comparisons.length} calls (the recorded prompt_eval_count is not served)`,
		`  normalizations applied: ${NORMALIZATIONS.filter((name) => name !== 'N10 T1 cut shift').map((name) => `${name} ${applied[name]}`).join(', ')}, N9 held second ask ${held.length}, N10 T1 cut shift ${applied['N10 T1 cut shift']}`,
		`  equal after N1 to N8: ${status('equal')}; equal after residuals: ${status('residual')}; admitted by N10: ${status('shift')}; unlisted: ${status('unlisted')}`,
		`  bodies by cause: ${CAUSES.map((cause) => `${cause} ${counts.get(cause) ?? 0}`).join('; ')}`,
	]
	const residuals = group(
		comparisons.flatMap((one) =>
			one.residuals.map((residual) => `${residual.name}: ${clip(residual.detail)}`),
		),
	)
	out.push(`  residuals (each disposition F4a on the answer pass or R2a on the briefing): ${residuals.length} distinct`)
	for (const residual of residuals) out.push(`    ${residual}`)
	const unlisted = comparisons.filter((one) => one.status === 'unlisted')
	out.push(`  unlisted agent bodies: ${unlisted.length}`)
	for (const one of unlisted)
		out.push(
			`    ${one.goal} call ${one.call} (${one.file}) [${one.causes.join('; ')}]: ${one.unlisted.map((difference) => `${difference.where} ${difference.role}: ${difference.kinds.join(', ')}`).join(' | ')}`,
		)
	out.push(`  held second asks (N9): ${held.map((one) => one.item).join('; ')}`)
	for (const one of comparisons)
		for (const admission of one.admitted)
			out.push(
				`  N10 T1 cut shift ${one.goal} call ${one.call} ${admission.where} ${admission.kind}: ${admission.kind === 'answer note' ? '' : `recorded kept ${admission.recordedKept ?? 0} (cut ${admission.recordedCut}), port kept ${admission.portKept ?? 0} (cut ${admission.portCut}); `}shifted lines ${admission.lines.map((line) => clip(line, 60)).join(' / ')}`,
			)
	for (const one of unlisted)
		for (const difference of one.unlisted) {
			if (difference.unclassified.recorded.length + difference.unclassified.port.length === 0) continue
			out.push(`  ${CAUSE.c8} ${one.goal} call ${one.call} (${one.file}) ${difference.where}`)
			for (const line of difference.unclassified.recorded) out.push(`      recorded only: ${line}`)
			for (const line of difference.unclassified.port) out.push(`      port only:     ${line}`)
		}
	// LEDGER_REPLAY_VERBOSE=1 prints every line that differs, unclipped.
	if (process.env.LEDGER_REPLAY_VERBOSE === '1') {
		for (const one of unlisted)
			for (const difference of one.unlisted) {
				out.push(`  exact ${one.goal} call ${one.call} (${one.file}) ${difference.where} [${difference.causes.join('; ')}]`)
				for (const line of difference.recorded) out.push(`      recorded only: ${line}`)
				for (const line of difference.port) out.push(`      port only:     ${line}`)
			}
	}
	return out.join('\n')
}

function listUnlisted(copy: number): readonly string[] {
	const entry = compared.get(copy)
	return (entry?.comparisons ?? [])
		.filter((one) => one.status === 'unlisted')
		.map(
			(one) =>
				`${one.goal} call ${one.call} (${one.file}) [${one.causes.join('; ')}]: ${one.unlisted.map((difference) => `${difference.where} ${difference.kinds.join(', ')}`).join(' | ')}`,
		)
}

function excerpt(lines: readonly string[]): { readonly lines: readonly string[]; readonly omitted: number } {
	return { lines: lines.slice(0, 6).map((line) => clip(line, 240)), omitted: Math.max(0, lines.length - 6) }
}

function buildCopyReport(copy: number): Readonly<Record<string, unknown>> {
	const replay = replayOf(copy)
	const entry = compared.get(copy)
	const comparisons = entry?.comparisons ?? []
	const bodies = [
		...comparisons
			.filter((one) => one.status === 'unlisted')
			.map((one) => ({
				kind: 'agent',
				file: one.file,
				goal: one.goal,
				call: one.call,
				causes: one.causes,
				diff: one.unlisted.map((difference) => ({
					where: difference.where,
					role: difference.role,
					causes: difference.causes,
					kinds: difference.kinds,
					recorded: excerpt(difference.recorded),
					port: excerpt(difference.port),
					unclassified: difference.unclassified,
				})),
			})),
	]
	return {
		copy,
		agentBodies: comparisons.length,
		judgeBodies: replay.traces.length,
		recordedJudgeBodies: replay.run.judge.length,
		usagePromptRewritten: replay.rewritten,
		counts: Object.fromEntries(countCauses(copy)),
		heldSecondAsks: listHeld(copy).map((one) => one.item),
		statuses: Object.fromEntries(
			(['equal', 'residual', 'shift', 'unlisted'] as const).map((name) => [
				name,
				comparisons.filter((one) => one.status === name).length,
			]),
		),
		n10: {
			admissions: entry?.applied['N10 T1 cut shift'] ?? 0,
			shifts: comparisons.flatMap((one) =>
				one.admitted.map((admission) => ({
					goal: one.goal,
					call: one.call,
					where: admission.where,
					kind: admission.kind,
					recordedKept: admission.recordedKept,
					portKept: admission.portKept,
					recordedCut: admission.recordedCut,
					portCut: admission.portCut,
					topic: admission.topic,
					candidates: admission.candidates,
					lines: admission.lines,
				})),
			),
		},
		bodies,
	}
}

writeFileSync(
	REPORT,
	`${JSON.stringify({ causes: CAUSES, copies: COPIES.map((copy) => buildCopyReport(copy)) }, null, 2)}\n`,
)

function byItem(left: { readonly item: string }, right: { readonly item: string }): number {
	return left.item < right.item ? -1 : left.item > right.item ? 1 : 0
}

function byKey(left: { readonly key: string }, right: { readonly key: string }): number {
	return left.key < right.key ? -1 : left.key > right.key ? 1 : 0
}

describe.each(COPIES)('ledger replay of a5-records-v%i', (copy) => {
	const replay = replayOf(copy)

	it('sets up the run as the harness did', () => {
		expect(listSettingMismatches(replay.run)).toEqual([])
		const calibration = replay.run.calibration[0]?.body.messages
		const first = isArray(calibration) ? calibration[0] : undefined
		// The harness builds the system text once; the seed calibration body carries it before any briefing.
		expect(isRecord(first) ? first.content : undefined).toBe(buildSystem(replay.scenario, true))
		const measured = isRecord(replay.run.seed.measured) ? replay.run.seed.measured : {}
		// The gauge the ledger itself holds before its first `respond` call, against the seed's measurement.
		expect(replay.gauge).toEqual({ scale: measured.scale, fixed: measured.fixed })
		// The judge context comes from the run's settings line; every recorded judge body must repeat it.
		const context = readJudgeContext(replay.run)
		expect(
			replay.run.judge
				.filter(
					(exchange) => !isRecord(exchange.body.options) || exchange.body.options.num_ctx !== context,
				)
				.map((exchange) => exchange.file),
		).toEqual([])
		// N9 matches a held row against these members, so the recorded bodies must agree on them.
		expect(readJudgeSettings(replay.run).members).toHaveLength(1)
		// Every calibration row the harness imported reaches the port's conversation, but the reverse-order
		// category rows its choice form never reads; the held failures are the rows it never sent.
		expect(replay.imported.skipped).toBe(0)
		expect(replay.imported.inputs.length + replay.imported.reverse).toBe(replay.run.seed.imported)
	})

	it('sends only judge bodies that have a recorded twin, each recorded body once per recording', () => {
		const withoutTwin = replay.traces.filter((trace) => trace.twin === undefined)
		expect(withoutTwin.map((trace) => String(trace.body.prompt).slice(0, 200))).toEqual([])
		const twinned = replay.traces.filter((trace) => trace.twin !== undefined && trace.twin !== 'held failure')
		// The harness never sent a held row, so no recorded body is the rebuilt body of one.
		const heldRecorded = replay.run.judge.filter((exchange) => replay.isHeld(exchange.body)).length
		expect(heldRecorded).toBe(0)
		expect(twinned).toHaveLength(replay.run.judge.length)
		const twins = new Set(twinned.map((trace) => trace.twin))
		expect(replay.run.judge.filter((exchange) => !twins.has(exchange.file)).map((one) => one.file)).toEqual([])
		const undecided = isArray(replay.run.seed.undecided) ? replay.run.seed.undecided.length : -1
		expect(replay.traces.filter((trace) => trace.twin === 'held failure')).toHaveLength(undecided)
	})

	it('asks each held item a second time as the seed lists it, rejects it as recorded, and asks none a third time', () => {
		const undecided = isArray(replay.run.seed.undecided) ? replay.run.seed.undecided : []
		const listed = undecided.flatMap((one) =>
			isRecord(one) && isString(one.item) && isString(one.state) && isString(one.error)
				? [{ item: one.item, state: one.state, error: one.error }]
				: [],
		)
		expect(listed).toHaveLength(undecided.length)
		const served = replay.traces.flatMap((trace) =>
			trace.twin === 'held failure' && trace.row !== undefined ? [trace.row] : [],
		)
		expect(served.map((row) => ({ item: row.item, state: row.state })).sort(byItem)).toEqual(
			listed.map(({ item, state }) => ({ item, state })).sort(byItem),
		)
		// A held row matched after it was served is a third ask: the transport refuses it with no twin.
		expect(replay.traces.filter((trace) => trace.row !== undefined && trace.twin === undefined)).toEqual([])
		// The judge rejects each served row with the recorded error, under the port's question key.
		const rejected = replay.rejections.filter((one) => served.some((row) => row.key === one.key))
		expect(rejected).toHaveLength(served.length)
		expect(rejected.map(({ key, message }) => ({ key, message })).sort(byKey)).toEqual(
			served
				.map((row) => ({
					key: row.key,
					message: row.error.replace(/question \[.*?\] invalid/, `question ${row.key} invalid`),
				}))
				.sort(byKey),
		)
		expect(listed.map((one) => one.error).sort()).toEqual(
			served.map((row) => row.error).sort(),
		)
	})

	it('makes the recorded number of agent calls in every goal', () => {
		expect(
			replay.goals
				.filter(
					(goal) =>
						goal.calls.length !== goal.recorded.length || goal.overruns > 0 || goal.error !== undefined,
				)
				.map((goal) => `${goal.goal}: ${goal.calls.length} of ${goal.recorded.length} ${goal.error ?? ''}`),
		).toEqual([])
	})

	it('counts each cut shift under N10 and admits only a shift that keeps another number of candidates', () => {
		const entry = compared.get(copy)
		const admitted = (entry?.comparisons ?? []).flatMap((one) => one.admitted)
		expect(entry?.applied['N10 T1 cut shift']).toBe(admitted.length)
		for (const one of admitted.filter((admission) => admission.kind !== 'answer note'))
			expect(one.recordedKept).not.toBe(one.portKept)
	})

	it('sends the first request of every goal as recorded after N1 to N9', () => {
		const entry = compared.get(copy)
		const firsts = (entry?.comparisons ?? []).filter((one) => one.call === 0)
		expect(firsts).toHaveLength(replay.goals.length)
		expect(firsts.filter((one) => one.status !== 'equal').map((one) => `${one.goal} ${one.file}`)).toEqual([])
	})

	it('sends the measured agent requests after N1 to N10 and the listed residuals F4a and R2a on the briefing', () => {
		process.stdout.write(`${buildReport(copy)}\n`)
		expect(listUnlisted(copy)).toEqual([])
	})
})

interface Candidate {
	readonly copy: number
	readonly goal: GoalReplay
	readonly index: number
	readonly call: ProviderCall
	readonly recorded: WireExchange
	readonly baseline: Comparison
}

function listCandidates(): readonly Candidate[] {
	return COPIES.flatMap((copy) =>
		replayOf(copy).goals.flatMap((goal) =>
			goal.calls.flatMap((call, index) => {
				const recorded = goal.recorded[index]
				if (recorded === undefined) return []
				const baseline = compareCall({
					recorded,
					call,
					goal: goal.goal,
					index,
					roles: seedOf(copy),
					applied: createApplied(),
				})
				return [{ copy, goal, index, call, recorded, baseline }]
			}),
		),
	)
}

function compareChanged(
	candidate: Candidate,
	call: ProviderCall,
	recorded: WireExchange = candidate.recorded,
): Comparison {
	return compareCall({
		recorded,
		call,
		goal: candidate.goal.goal,
		index: candidate.index,
		roles: seedOf(candidate.copy),
		applied: createApplied(),
	})
}

function listWheres(comparison: Comparison): readonly string[] {
	return comparison.unlisted.map((one) => one.where)
}

// Builds the provider call that sends a reduced recorded body, so that a control can edit the port's side
// of a request without depending on what the ported ledger lists.
function toCall(body: WireBody): ProviderCall {
	const messages = body.messages.map((wire, at): Message => {
		const role = MESSAGE_ROLES.find((one) => one === wire.role)
		if (role === undefined) throw new Error(`unknown role ${wire.role}`)
		const calls = isArray(wire.tool_calls)
			? wire.tool_calls.flatMap((entry, order): ToolCall[] => {
					const fn = isRecord(entry) ? entry.function : undefined
					return isRecord(fn) && isString(fn.name) && isRecord(fn.arguments)
						? [{ id: `call-${at}-${order}`, name: fn.name, arguments: fn.arguments }]
						: []
				})
			: []
		return {
			id: `message-${at}`,
			role,
			content: wire.content,
			...(calls.length > 0 ? { calls } : {}),
			...(isString(wire.thinking) ? { thinking: wire.thinking } : {}),
			...(isArray(wire.images) ? { images: wire.images.filter(isString) } : {}),
		}
	})
	const tools = isArray(body.tools)
		? body.tools.flatMap((tool): ToolDefinition[] => {
				const fn = isRecord(tool) ? tool.function : undefined
				return isRecord(fn) && isString(fn.name)
					? [
							{
								name: fn.name,
								...(isString(fn.description) ? { description: fn.description } : {}),
								...(isRecord(fn.parameters) ? { parameters: fn.parameters } : {}),
							},
						]
					: []
			})
		: undefined
	return {
		messages,
		tools,
		options: {
			...(typeof body.think === 'boolean' ? { think: body.think } : {}),
			...(isRecord(body.schema) ? { schema: body.schema } : {}),
		},
	}
}

const LEADED = /^m(\d+): (.*?)( \[amended by [^\]]+\])?$/
const RESULT_HEAD = /^\[r\d+\] /

// One recorded recall line led by an `mN` handle whose message has a decided correction.
interface RecallLine {
	readonly position: number
	readonly text: string
	readonly sentences: readonly string[]
	readonly stale: readonly boolean[]
	// Counts the lines of the recorded message that carry a stale sentence: the labeling pass drops each.
	readonly staleLines: number
}

function listRecallLines(candidate: Candidate): readonly RecallLine[] {
	const roles = seedOf(candidate.copy)
	const messages = candidate.recorded.body.messages
	if (!isArray(messages)) return []
	return messages.flatMap((message, position): RecallLine[] => {
		if (!isRecord(message) || message.role !== 'tool' || !isString(message.content)) return []
		const asked = messages[position - 1]
		const answersRecall =
			isRecord(asked) &&
			isArray(asked.tool_calls) &&
			asked.tool_calls.some(
				(call) => isRecord(call) && isRecord(call.function) && call.function.name === 'recall',
			)
		if (!answersRecall) return []
		const read = message.content
			.replace(RESULT_HEAD, '')
			.split('\n')
			.flatMap((line) => {
				const match = LEADED.exec(line)
				const handle = Number(match?.[1])
				if (match?.[2] === undefined || handle >= roles.roles.length) return []
				const sentences = splitSentences(match[2])
				return [{ handle, text: match[2], sentences, stale: sentences.map((one) => isStale(one, handle, roles)) }]
			})
		const staleLines = read.filter((one) => one.stale.includes(true)).length
		return read
			.filter((one) => seedOf(candidate.copy).corrections.has(one.handle))
			.map((one) => ({ position, text: one.text, sentences: one.sentences, stale: one.stale, staleLines }))
	})
}

function editRecorded(
	recorded: WireExchange,
	position: number,
	edit: (content: string) => string,
): WireExchange {
	const messages = recorded.body.messages
	if (!isArray(messages)) throw new Error('a body carries no messages')
	return {
		...recorded,
		body: {
			...recorded.body,
			messages: messages.map((message, at) =>
				at === position && isRecord(message) && isString(message.content)
					? { ...message, content: edit(message.content) }
					: message,
			),
		},
	}
}

interface RecallEdit {
	readonly candidate: Candidate
	readonly line: RecallLine
}

// A decided-correction line with a stale and a non-stale sentence, alone in its message with a stale sentence.
function findMixedLine(candidates: readonly Candidate[]): RecallEdit {
	for (const candidate of candidates) {
		const line = listRecallLines(candidate).find(
			(one) => one.staleLines === 1 && one.stale.includes(true) && one.stale.includes(false),
		)
		if (line !== undefined) return { candidate, line }
	}
	throw new Error('no recorded recall line mixes a stale and a non-stale sentence')
}

function twinWithLine(edit: RecallEdit, replacement: string): ProviderCall {
	const { candidate, line } = edit
	const twin = toCall(reduceRecorded(candidate.recorded, seedOf(candidate.copy)))
	return {
		...twin,
		messages: twin.messages.map((message, at) => {
			if (at !== line.position) return message
			const lines = message.content.split('\n')
			const target = lines.indexOf(line.text)
			if (target < 0) throw new Error('the reduced recall result lacks the selected line')
			return { ...message, content: lines.map((one, order) => (order === target ? replacement : one)).join('\n') }
		}),
	}
}

// The first held row whose question is a noul form with both criteria described, which a label swap changes.
function findNoulRow(rows: readonly HeldRow[]): {
	readonly row: HeldRow
	readonly instructions: string | undefined
	readonly criteria: { readonly true: string; readonly false: string }
} {
	for (const row of rows) {
		const { question } = row
		if (question.form !== 'noul') continue
		const { criteria } = question
		const instructions = isString(question.instructions) ? question.instructions : undefined
		if (isString(criteria?.true) && isString(criteria.false))
			return { row, instructions, criteria: { true: criteria.true, false: criteria.false } }
	}
	throw new Error('no held row carries a noul question with both criteria')
}

describe('ledger replay control', () => {
	const replay = replayOf(1)
	const candidates = listCandidates()

	function firstCandidate(): Candidate {
		const candidate = candidates.find((one) => one.copy === 1 && one.index === 0)
		if (candidate === undefined) throw new Error('copy 1 has no first call')
		return candidate
	}

	it('equals the recorded body before any difference is injected', () => {
		expect(firstCandidate().baseline.status).toBe('equal')
	})

	it('fails a request whose briefing carries one injected word', () => {
		const candidate = firstCandidate()
		const comparison = compareChanged(candidate, {
			...candidate.call,
			messages: candidate.call.messages.map((message) =>
				message.role === 'system'
					? { ...message, content: message.content.replace('## Rules', '## Rules\n- Injected rule.') }
					: message,
			),
		})
		expect(comparison.status).toBe('unlisted')
		expect(listWheres(comparison)).toEqual(['messages[0]'])
	})

	it('fails a request whose tail loses one seed message', () => {
		const candidate = firstCandidate()
		const { messages } = candidate.call
		const comparison = compareChanged(candidate, {
			...candidate.call,
			messages: messages.slice(0, -2).concat(messages.slice(-1)),
		})
		expect(comparison.status).toBe('unlisted')
	})

	it('fails a request that advertises another tool description', () => {
		const candidate = firstCandidate()
		const comparison = compareChanged(candidate, {
			...candidate.call,
			tools: candidate.call.tools?.map((tool) =>
				tool.name === 'recall' ? { ...tool, description: `${tool.description ?? ''} Injected.` } : tool,
			),
		})
		expect(comparison.status).toBe('unlisted')
		expect(listWheres(comparison)).toEqual(['tools'])
	})

	it('fails a request that sends a schema where the recording has no format', () => {
		const candidate = firstCandidate()
		const comparison = compareChanged(candidate, {
			...candidate.call,
			options: { ...candidate.call.options, schema: { type: 'object' } },
		})
		expect(comparison.status).toBe('unlisted')
		expect(listWheres(comparison)).toEqual(['schema'])
	})

	it('fails a request whose message carries a thinking member the recording lacks', () => {
		const candidate = firstCandidate()
		const comparison = compareChanged(candidate, {
			...candidate.call,
			messages: candidate.call.messages.map((message, at) =>
				at === candidate.call.messages.length - 1 ? { ...message, thinking: 'Injected.' } : message,
			),
		})
		expect(comparison.status).toBe('unlisted')
		expect(comparison.unlisted.flatMap((one) => one.kinds)).toContain('message members other than content differ')
	})

	it('fails an answer-pass body that loses a non-call user message', () => {
		// The answer pass advertises no tool. The dropped message sits where the baseline reports no difference.
		const found = candidates
			.filter((one) => !isArray(one.recorded.body.tools))
			.flatMap((one) => {
				const before = new Set(listWheres(one.baseline))
				const at = one.call.messages.findIndex(
					(message, position) =>
						position > 0 &&
						message.role === 'user' &&
						(message.calls === undefined || message.calls.length === 0) &&
						!before.has(`messages[${position}]`),
				)
				return at < 0 ? [] : [{ candidate: one, at }]
			})[0]
		if (found === undefined) throw new Error('no recorded answer-pass body with a non-call user message')
		const { candidate, at } = found
		const comparison = compareChanged(candidate, {
			...candidate.call,
			messages: candidate.call.messages.filter((_, position) => position !== at),
		})
		expect(comparison.status).toBe('unlisted')
		expect(listWheres(comparison)).toContain(`messages[${at}]`)
	})

	it('equals the recorded body for a twin the probe builds from the reduced recorded body', () => {
		const edit = findMixedLine(candidates)
		const twin = twinWithLine(edit, edit.line.text)
		expect(compareChanged(edit.candidate, twin).status).toBe('equal')
	})

	it('fails a recall line that loses a sentence no decided correction made stale', () => {
		// The line leads with an `mN` handle whose message has a decided correction, in a result that
		// answers `recall`; the labeling pass can only drop its stale sentence, never the one removed here.
		const edit = findMixedLine(candidates)
		const at = edit.line.stale.indexOf(false)
		const removed = edit.line.sentences[at] ?? ''
		const kept = edit.line.sentences.filter((_, order) => order !== at).join(' ')
		const comparison = compareChanged(edit.candidate, twinWithLine(edit, kept))
		expect(comparison.status).toBe('unlisted')
		const difference = comparison.unlisted.find((one) => one.where === `messages[${edit.line.position}]`)
		expect(difference).toBeDefined()
		expect(difference?.causes).toContain(CAUSE.c8)
		expect(difference?.unclassified.recorded.some((line) => line.includes(removed))).toBe(true)
	})

	it('fails a recall line that loses a stale sentence, which only cause C6 explains', () => {
		const edit = findMixedLine(candidates)
		const kept = edit.line.sentences.filter((_, order) => edit.line.stale[order] === false).join(' ')
		const comparison = compareChanged(edit.candidate, twinWithLine(edit, kept))
		expect(comparison.status).toBe('unlisted')
		const difference = comparison.unlisted.find((one) => one.where === `messages[${edit.line.position}]`)
		expect(difference).toBeDefined()
		expect(difference?.causes).toEqual([CAUSE.c6])
		expect(difference?.unclassified).toEqual({ recorded: [], port: [] })
	})

	describe('ended pin lines', () => {
		function findPinned(): { readonly candidate: Candidate; readonly position: number } {
			for (const candidate of candidates) {
				const messages = candidate.recorded.body.messages
				if (!isArray(messages)) continue
				const position = messages.findIndex(
					(message) =>
						isRecord(message) &&
						message.role === 'tool' &&
						isString(message.content) &&
						message.content.replace(RESULT_HEAD, '').split('\n').some((line) => PIN_LINE.test(line)),
				)
				if (position >= 0) return { candidate, position }
			}
			throw new Error('no recorded result carries an ended pin line')
		}

		function compareTwin(candidate: Candidate, recorded: WireExchange, applied = createApplied()): Comparison {
			return compareCall({
				recorded,
				call: toCall(reduceRecorded(recorded, seedOf(candidate.copy))),
				goal: candidate.goal.goal,
				index: candidate.index,
				roles: seedOf(candidate.copy),
				applied,
			})
		}

		it('counts the dropped pin line and equals the port body that lacks it', () => {
			const { candidate, position } = findPinned()
			const applied = createApplied()
			const original = candidate.recorded.body.messages
			expect(isArray(original) && isRecord(original[position]) ? original[position].content : '').toMatch(/ended: superseded by/)
			expect(compareTwin(candidate, candidate.recorded, applied).status).toBe('equal')
			expect(applied['N8 ended pin lines']).toBeGreaterThan(0)
		})

		it('keeps a pin-like line unlisted when it carries a token that is not a handle', () => {
			const { candidate, position } = findPinned()
			const port = toCall(reduceRecorded(candidate.recorded, seedOf(candidate.copy)))
			const mutated = editRecorded(candidate.recorded, position, (content) =>
				content.replace(/(p\d+ \([mr]\d+\) ended: superseded by )[mr](\d+)/, '$1x$2'),
			)
			const comparison = compareChanged(candidate, port, mutated)
			expect(comparison.status).toBe('unlisted')
			const difference = comparison.unlisted.find((one) => one.where === `messages[${position}]`)
			expect(difference?.causes).toContain(CAUSE.c8)
			expect(difference?.unclassified.recorded.some((line) => /^p\d+ \(.*superseded by x\d+$/.test(line))).toBe(true)
		})

		it('reports a result unlisted with C2 cut room when the pin lines share it with a cut line', () => {
			const { candidate, position } = findPinned()
			const crowded = editRecorded(
				candidate.recorded,
				position,
				(content) => `${content}\n2 older items not shown; call recall with a narrower topic`,
			)
			const comparison = compareTwin(candidate, crowded)
			expect(comparison.status).toBe('unlisted')
			expect(comparison.causes).toContain(CAUSE.c2)
			expect(comparison.unlisted.find((one) => one.where === `messages[${position}]`)?.causes).toEqual([CAUSE.c2])
		})
	})

	describe('N10 T1 cut shift', () => {
		const G04 = 'g04-halvorsen-ticket'
		const G07 = 'g07-depot-release'
		const SHIFTED = 'Understood: refunds above $200 carry approval code MX-4471 from Marcus Oyelaran.'
		const CUT_NOTICE = 'name a narrower topic to narrow the recall'

		function pick(copy: number, goal: string, index: number): Candidate {
			const found = candidates.find((one) => one.copy === copy && one.goal.goal === goal && one.index === index)
			if (found === undefined) throw new Error(`no call ${copy} ${goal} ${index}`)
			return found
		}

		function compareWith(
			candidate: Candidate,
			shifts: ReturnType<typeof createShiftPool>,
			call: ProviderCall = candidate.call,
			recorded: WireExchange = candidate.recorded,
		): { readonly comparison: Comparison; readonly applied: ReturnType<typeof createApplied> } {
			const applied = createApplied()
			const comparison = compareCall({
				recorded,
				call,
				goal: candidate.goal.goal,
				index: candidate.index,
				roles: seedOf(candidate.copy),
				applied,
				shifts,
			})
			return { comparison, applied }
		}

		// The position of the message that carries the shifted item in the port's request.
		function positionOf(call: ProviderCall, role: string): number {
			const at = call.messages.findIndex((message) => message.role === role && message.content.includes(SHIFTED))
			if (at < 0) throw new Error(`no ${role} message carries the shifted item`)
			return at
		}

		function editPort(call: ProviderCall, at: number, edit: (content: string) => string): ProviderCall {
			return {
				...call,
				messages: call.messages.map((message, order) =>
					order === at ? { ...message, content: edit(message.content) } : message,
				),
			}
		}

		// Edits the lines of the port's message that carries the shifted item.
		function editLines(
			candidate: Candidate,
			role: string,
			edit: (lines: readonly string[]) => readonly string[],
		): { readonly call: ProviderCall; readonly at: number } {
			const at = positionOf(candidate.call, role)
			return { at, call: editPort(candidate.call, at, (content) => edit(content.split('\n')).join('\n')) }
		}

		// What a control reads of one comparison: the status, the open messages, and what N10 admitted and counted.
		function outcome(
			comparison: Comparison,
			applied: ReturnType<typeof createApplied>,
		): { readonly status: string; readonly open: readonly string[]; readonly admitted: number; readonly counted: number } {
			return {
				status: comparison.status,
				open: listWheres(comparison),
				admitted: comparison.admitted.length,
				counted: applied['N10 T1 cut shift'],
			}
		}

		function unlistedAt(at: number): ReturnType<typeof outcome> {
			return { status: 'unlisted', open: [`messages[${at}]`], admitted: 0, counted: 0 }
		}

		function summarize(comparison: Comparison): ReadonlyArray<readonly unknown[]> {
			return comparison.admitted.map((one) => [one.kind, one.recordedKept, one.portKept, one.recordedCut, one.portCut])
		}

		// A recall that an earlier shift of the same run admitted, so an answer note has a pool to read.
		function primed(copy: number): ReturnType<typeof createShiftPool> {
			const shifts = createShiftPool()
			expect(compareWith(pick(copy, G04, 2), shifts).comparison.status).toBe('shift')
			return shifts
		}

		// The recall and the answer note that carries it, so a later recall can list the note.
		function primedNote(copy: number): ReturnType<typeof createShiftPool> {
			const shifts = primed(copy)
			expect(compareWith(pick(copy, G04, 3), shifts).comparison.status).toBe('shift')
			return shifts
		}

		// Replaces the name of the call that the message before position `at` makes, on both sides.
		function renameCall(candidate: Candidate, at: number, name: string): { readonly call: ProviderCall; readonly recorded: WireExchange } {
			const messages = candidate.recorded.body.messages
			if (!isArray(messages)) throw new Error('a body carries no messages')
			const recorded: WireExchange = {
				...candidate.recorded,
				body: {
					...candidate.recorded.body,
					messages: messages.map((message, order) =>
						order === at - 1 && isRecord(message) && isArray(message.tool_calls)
							? {
									...message,
									tool_calls: message.tool_calls.map((call) =>
										isRecord(call) && isRecord(call.function)
											? { ...call, function: { ...call.function, name } }
											: call,
									),
								}
							: message,
					),
				},
			}
			const call: ProviderCall = {
				...candidate.call,
				messages: candidate.call.messages.map((message, order) =>
					order === at - 1 && message.calls !== undefined
						? { ...message, calls: message.calls.map((one) => ({ ...one, name })) }
						: message,
				),
			}
			return { call, recorded: recorded }
		}

		it('admits the recall that keeps one more candidate, the answer note that carries it, and nothing else', () => {
			const shifts = createShiftPool()
			const recall = compareWith(pick(1, G04, 2), shifts)
			expect(recall.comparison.status).toBe('shift')
			expect(recall.applied['N10 T1 cut shift']).toBe(1)
			expect(summarize(recall.comparison)).toEqual([['recall', 8, 9, 1, 0]])
			const note = compareWith(pick(1, G04, 3), shifts)
			expect(note.comparison.status).toBe('shift')
			expect(note.comparison.admitted.map((one) => one.kind)).toEqual(['answer note'])
			expect(note.applied['N10 T1 cut shift']).toBe(1)
		})

		it('leaves the answer note unlisted when no admitted shift put its lines on one side', () => {
			const comparison = compareWith(pick(1, G04, 3), createShiftPool()).comparison
			expect(comparison.status).toBe('unlisted')
			expect(comparison.admitted).toEqual([])
		})

		it('admits a recall that lists an earlier answer note only beside the note that carries the shift', () => {
			const later = pick(7, G07, 1)
			expect(compareWith(later, createShiftPool()).comparison.status).toBe('unlisted')
			// The recall alone gives the pool no answer note to read as the recall's first item.
			expect(compareWith(later, primed(7)).comparison.status).toBe('unlisted')
			const comparison = compareWith(later, primedNote(7)).comparison
			expect(comparison.status).toBe('shift')
			expect(summarize(comparison)).toEqual([['recall that lists an answer note', 2, 1, 0, 1]])
		})

		it('keeps a note-bearing recall unlisted when the note it lists carries a pooled line outside its own lines', () => {
			const candidate = pick(7, G07, 1)
			const baseline = compareWith(candidate, primedNote(7)).comparison
			expect(baseline.status).toBe('shift')
			// One m3 line before the note header, as the port would send it with the m3 item left in place.
			const { call, at } = editLines(candidate, 'tool', (lines) => [SHIFTED, ...lines])
			const { comparison, applied } = compareWith(candidate, primedNote(7), call)
			expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
		})

		it('keeps a note-bearing recall unlisted when a pooled line sits after the note instead of inside it', () => {
			const candidate = pick(7, G07, 1)
			const { call, at } = editLines(candidate, 'tool', (lines) => {
				const cut = lines.findIndex((line) => line.endsWith(CUT_NOTICE))
				return [...lines.slice(0, cut), SHIFTED, ...lines.slice(cut)]
			})
			const { comparison, applied } = compareWith(candidate, primedNote(7), call)
			expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
		})

		it('keeps the answer note of a later goal unlisted when only the earlier goal pooled its lines', () => {
			const note = pick(7, G07, 3)
			const { comparison, applied } = compareWith(note, primedNote(7))
			expect(comparison.status).toBe('unlisted')
			expect(comparison.admitted).toEqual([])
			expect(applied['N10 T1 cut shift']).toBe(0)
		})

		it('admits the answer note of a later goal beside the recalls of that goal that carried the lines', () => {
			const shifts = primedNote(7)
			expect(summarize(compareWith(pick(7, G07, 1), shifts).comparison)).toEqual([
				['recall that lists an answer note', 2, 1, 0, 1],
			])
			const second = compareWith(pick(7, G07, 2), shifts).comparison
			expect(second.status).toBe('shift')
			// The recall of the escalations topic keeps 7 candidates of 9 in the record and 8 in the port.
			expect(summarize(second)).toEqual([
				['recall that lists an answer note', 2, 1, 0, 1],
				['recall', 7, 8, 2, 1],
			])
			const note = compareWith(pick(7, G07, 3), shifts).comparison
			expect(note.status).toBe('shift')
			expect(note.admitted.map((one) => one.kind)).toEqual(['answer note'])
		})

		it('derives the candidate sequence of every admitted recall from the seed and equals the evidence', () => {
			const evidence = parseJSONAs(readFileSync(EVIDENCE, 'utf8'), isRecord)
			const recalls = isRecord(evidence) && isRecord(evidence.recalls) ? evidence.recalls : {}
			const keys = Object.keys(recalls)
			expect(keys).toHaveLength(7)
			for (const key of keys) {
				const [version, goal, call] = key.split('/')
				const entry = recalls[key]
				const copy = Number(version?.slice(1))
				if (!isRecord(entry)) throw new Error(`unreadable evidence ${key}`)
				const { topic, candidates: labels } = entry
				if (!isString(topic) || !isArray(labels)) throw new Error(`unreadable evidence ${key}`)
				const admitted = (compared.get(copy)?.comparisons ?? [])
					.filter((one) => one.goal === goal && String(one.call) === call)
					.flatMap((one) => one.admitted)
					.filter((one) => one.kind !== 'answer note' && one.topic === topic.trim())
				expect(admitted).toHaveLength(1)
				// The evidence names the answer note by its handle; the probe holds the note as one item.
				const expected = labels.map((label) =>
					isString(label) && /^m\d+ \(.*answer note\)$/.test(label) ? 'note' : label,
				)
				expect(admitted[0]?.candidates).toEqual(expected)
			}
		})

		it('admits the 13 bodies of the evidence and no other body', () => {
			const bodies = COPIES.flatMap((copy) => compared.get(copy)?.comparisons ?? []).filter(
				(one) => one.admitted.length > 0,
			)
			expect(bodies).toHaveLength(13)
			expect(bodies.every((one) => one.status === 'shift')).toBe(true)
			expect(COPIES.map((copy) => compared.get(copy)?.applied['N10 T1 cut shift'])).toEqual([2, 0, 2, 0, 0, 2, 6, 2])
		})

		it('keeps a shift with one item reordered unlisted', () => {
			const candidate = pick(1, G04, 2)
			const at = positionOf(candidate.call, 'tool')
			const call = editPort(candidate.call, at, (content) => {
				const lines = content.split('\n')
				const [first, second] = [lines[0] ?? '', lines[1] ?? '']
				return [second, first, ...lines.slice(2)].join('\n')
			})
			const { comparison, applied } = compareWith(candidate, createShiftPool(), call)
			expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
		})

		it('keeps a shift whose cut line names a wrong count unlisted', () => {
			const candidate = pick(1, G04, 2)
			const at = positionOf(candidate.call, 'tool')
			const recorded = editRecorded(candidate.recorded, at, (content) =>
				content.replace(/\d+ older items? not shown;/, '2 older items not shown;'),
			)
			expect(recorded).not.toEqual(candidate.recorded)
			const { comparison, applied } = compareWith(candidate, createShiftPool(), candidate.call, recorded)
			expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
		})

		it('keeps a shift whose cut line carries another tail or the wrong noun unlisted', () => {
			const candidate = pick(1, G04, 2)
			const at = positionOf(candidate.call, 'tool')
			for (const [pattern, text] of [
				[CUT_NOTICE, 'Injected tail.'],
				['1 older item not', '1 older items not'],
			] as const) {
				const recorded = editRecorded(candidate.recorded, at, (content) => content.replace(pattern, text))
				expect(recorded).not.toEqual(candidate.recorded)
				const { comparison, applied } = compareWith(candidate, createShiftPool(), candidate.call, recorded)
				expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
			}
		})

		it('keeps a port cut line with another tail unlisted when the recorded side carries no cut line', () => {
			const candidate = pick(7, G07, 1)
			expect(compareWith(candidate, primedNote(7)).comparison.status).toBe('shift')
			const { call, at } = editLines(candidate, 'tool', (lines) =>
				lines.map((line) => (line.endsWith(CUT_NOTICE) ? line.replace(CUT_NOTICE, 'Injected tail.') : line)),
			)
			const { comparison, applied } = compareWith(candidate, primedNote(7), call)
			expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
		})

		it('keeps an answer note with one line beyond the shifted items unlisted', () => {
			const candidate = pick(1, G04, 3)
			const shifts = primed(1)
			const at = positionOf(candidate.call, 'user')
			const call = editPort(candidate.call, at, (content) => `${content}\nInjected line.`)
			const { comparison, applied } = compareWith(candidate, shifts, call)
			expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
		})

		it('keeps an extra item that is not the next candidate unlisted', () => {
			const candidate = pick(1, G04, 2)
			const roles = seedOf(1)
			const at = positionOf(candidate.call, 'tool')
			// A seed line no decided correction touches and that is newer than the last item the recall kept.
			const newer = roles.texts.flatMap((text, handle) =>
				handle > 6 &&
				handle < roles.roles.length &&
				text !== '' &&
				!roles.corrections.has(handle) &&
				![...roles.corrections.values()].some((later) => later.includes(handle))
					? [text]
					: [],
			)
			const free = newer[newer.length - 1]
			if (free === undefined) throw new Error('copy 1 seeds no free message newer than the last kept item')
			const call = editPort(candidate.call, at, (content) =>
				content.slice(0, content.indexOf(SHIFTED)).concat(free),
			)
			expect(call.messages[at]?.content).not.toContain(SHIFTED)
			const { comparison, applied } = compareWith(candidate, createShiftPool(), call)
			expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
		})

		it('keeps the m3 line alone unlisted, because the candidate is the m3 and m29 item', () => {
			const candidate = pick(1, G04, 2)
			const { call, at } = editLines(candidate, 'tool', (lines) => lines.slice(0, lines.indexOf(SHIFTED) + 1))
			expect(call.messages[at]?.content.endsWith(SHIFTED)).toBe(true)
			const { comparison, applied } = compareWith(candidate, createShiftPool(), call)
			expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
		})

		it('keeps an older seed line that is no candidate unlisted in place of the next candidate', () => {
			const candidate = pick(1, G04, 2)
			const roles = seedOf(1)
			const listed = (listRecallCandidates('escalations', roles) ?? []).flatMap((item) => item.lines)
			const older = roles.texts.findIndex(
				(text, handle) => handle < 6 && text !== '' && !listed.includes(text),
			)
			if (older < 0) throw new Error('copy 1 seeds no older message that the topic leaves out')
			const { call, at } = editLines(candidate, 'tool', (lines) => [...lines.slice(0, lines.indexOf(SHIFTED)), roles.texts[older] ?? ''])
			const { comparison, applied } = compareWith(candidate, createShiftPool(), call)
			expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
		})

		it('keeps two extra items in the wrong order unlisted and admits them in the candidate order', () => {
			const candidate = pick(1, G04, 2)
			const at = positionOf(candidate.call, 'tool')
			// The record keeps 7 candidates of 9 and cuts the m6 item and the m3 and m29 item.
			const recorded = editRecorded(candidate.recorded, at, (content) => {
				const lines = content.split('\n')
				return [...lines.slice(0, 7), `2 older items not shown; ${CUT_NOTICE}`].join('\n')
			})
			const ordered = compareWith(candidate, createShiftPool(), candidate.call, recorded)
			expect(ordered.comparison.status).toBe('shift')
			expect(summarize(ordered.comparison)).toEqual([['recall', 7, 9, 2, 0]])
			const { call } = editLines(candidate, 'tool', (lines) => [
				...lines.slice(0, 7),
				...lines.slice(8),
				lines[7] ?? '',
			])
			const { comparison, applied } = compareWith(candidate, createShiftPool(), call, recorded)
			expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
		})

		it('keeps an extra line that is no seed line unlisted', () => {
			const candidate = pick(1, G04, 2)
			const { call, at } = editLines(candidate, 'tool', (lines) => [...lines.slice(0, lines.indexOf(SHIFTED)), 'Injected line.'])
			const { comparison, applied } = compareWith(candidate, createShiftPool(), call)
			expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
		})

		it('keeps a shift with one line after the extra item unlisted', () => {
			const candidate = pick(1, G04, 2)
			const { call, at } = editLines(candidate, 'tool', (lines) => [...lines, 'Injected line.'])
			const { comparison, applied } = compareWith(candidate, createShiftPool(), call)
			expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
		})

		it('keeps an answer note unlisted when it lists a pooled line twice', () => {
			const candidate = pick(1, G04, 3)
			const { call, at } = editLines(candidate, 'user', (lines) => [...lines, SHIFTED])
			const { comparison, applied } = compareWith(candidate, primed(1), call)
			expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
		})

		it('keeps a recall unlisted when its cut count carries a leading zero', () => {
			const candidate = pick(7, G07, 1)
			const { call, at } = editLines(candidate, 'tool', (lines) => [...lines.slice(0, -1), (lines.at(-1) ?? '').replace(/^1 /, '01 ')])
			const { comparison, applied } = compareWith(candidate, primedNote(7), call)
			expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
		})

		it('keeps the g07 answer note unlisted when it repeats the shifted pair after the run carried it on two calls', () => {
			const shifts = primedNote(7)
			expect(compareWith(pick(7, G07, 1), shifts).comparison.status).toBe('shift')
			expect(compareWith(pick(7, G07, 2), shifts).comparison.status).toBe('shift')
			const candidate = pick(7, G07, 3)
			const { call, at } = editLines(candidate, 'user', (lines) => {
				const pair = lines.findIndex((line) => line.startsWith('Understood: refunds above $200'))
				return pair < 0 ? lines : [...lines.slice(0, pair + 2), ...lines.slice(pair, pair + 2), ...lines.slice(pair + 2)]
			})
			const { comparison, applied } = compareWith(candidate, shifts, call)
			expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
		})

		it('keeps an answer note unlisted when it lists half of the m3 and m29 item', () => {
			const candidate = pick(1, G04, 3)
			const { call, at } = editLines(candidate, 'user', (lines) => lines.slice(0, -1))
			expect(call.messages[at]?.content.endsWith(SHIFTED)).toBe(true)
			const { comparison, applied } = compareWith(candidate, primed(1), call)
			expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
		})

		it('keeps an answer note unlisted when the m3 and m29 item sits after the header instead of its place', () => {
			const candidate = pick(1, G04, 3)
			const { call, at } = editLines(candidate, 'user', (lines) => [
				lines[0] ?? '',
				...lines.slice(-2),
				...lines.slice(1, -2),
			])
			const { comparison, applied } = compareWith(candidate, primed(1), call)
			expect(outcome(comparison, applied)).toEqual(unlistedAt(at))
		})

		it('admits a tool message only when it answers a recall call', () => {
			const candidate = pick(1, G04, 2)
			const at = positionOf(candidate.call, 'tool')
			expect(compareWith(candidate, createShiftPool()).comparison.status).toBe('shift')
			const renamed = renameCall(candidate, at, 'lookup_order')
			expect(renamed.call).not.toEqual(candidate.call)
			const { comparison, applied } = compareWith(candidate, createShiftPool(), renamed.call, renamed.recorded)
			expect(comparison.status).toBe('unlisted')
			expect(listWheres(comparison)).toContain(`messages[${at}]`)
			expect(comparison.admitted).toEqual([])
			expect(applied['N10 T1 cut shift']).toBe(0)
		})

		describe('kept counts after an answer note', () => {
			const HEADER = LEDGER_NOTES.results
			const roles: SeedRoles = {
				roles: ['user', 'user', 'user', 'user', 'user'],
				texts: ['kettle gift 0', 'kettle gift 1', 'kettle gift 2', 'kettle gift 3', 'Unrelated.'],
				calls: [false, false, false, false, false],
				corrections: new Map(),
				names: [],
				labels: new Map(),
				quiet: [],
			}
			const NOTE = { recorded: [HEADER, 'kettle gift note'], port: [HEADER, 'kettle gift note', 'kettle gift pooled'] }

			function build(recorded: readonly string[], port: readonly string[]): ShiftContext & { readonly differences: readonly BodyDifference[] } {
				const asked = { role: 'assistant', content: '', tool_calls: [{ function: { name: 'recall', arguments: { topic: 'kettle gift' } } }] }
				const wire = (content: readonly string[]) => ({
					messages: [asked, { role: 'tool', content: content.join('\n') }],
					tools: undefined,
					think: undefined,
					schema: undefined,
				})
				const context = { goal: 'g', call: 2, recorded: wire(recorded), port: wire(port) }
				return {
					...context,
					differences: diffBodies(context.recorded, context.port),
				}
			}

			function admit(recorded: readonly string[], port: readonly string[]): readonly Admission[] {
				const pool = createShiftPool()
				pool.notes.push({
					goal: 'g',
					call: 1,
					recorded: NOTE.recorded,
					port: NOTE.port,
					entries: [{ goal: 'g', call: 0, side: 'port', anchor: 'kettle gift note', items: [['kettle gift pooled']] }],
				})
				const context = build(recorded, port)
				return admitShifts(context.differences, roles, context, pool, createApplied())
			}

			it('counts the note as one item and each item after it as one', () => {
				// The sequence is the note, then m3, m2, m1, m0.
				const sequence = listRecallCandidates('kettle gift', roles, NOTE.port)
				expect(sequence?.map((item) => item.label)).toEqual(['note', 'm3', 'm2', 'm1', 'm0'])
				const cut = (count: number): string => `${count} older ${count === 1 ? 'item' : 'items'} not shown; ${CUT_NOTICE}`
				const admitted = admit(
					[...NOTE.recorded, 'kettle gift 3', 'kettle gift 2', cut(2)],
					[...NOTE.port, 'kettle gift 3', 'kettle gift 2', 'kettle gift 1', cut(1)],
				)
				expect(admitted.map((one) => [one.kind, one.recordedKept, one.portKept, one.recordedCut, one.portCut])).toEqual([
					['recall that lists an answer note', 3, 4, 2, 1],
				])
			})

			it('refuses a count that omits an item after the note', () => {
				const cut = (count: number): string => `${count} older ${count === 1 ? 'item' : 'items'} not shown; ${CUT_NOTICE}`
				expect(
					admit(
						[...NOTE.recorded, 'kettle gift 3', 'kettle gift 2', cut(1)],
						[...NOTE.port, 'kettle gift 3', 'kettle gift 2', 'kettle gift 1', cut(1)],
					),
				).toEqual([])
			})
		})
	})

	it('fails a judge body that no recorded body twins', async () => {
		const exchange = replay.run.judge[0]
		if (exchange === undefined) throw new Error('copy 1 has no judge body')
		const transport = createJudgeTransport(replay.run.judge, () => [])
		const prompt = isString(exchange.body.prompt) ? exchange.body.prompt : ''
		const injected = { ...exchange.body, prompt: `${prompt} Injected.` }
		const response = await transport.fetch(exchange.url, { method: 'POST', body: JSON.stringify(injected) })
		expect(response.status).toBe(500)
		expect(transport.traces.map((trace) => trace.twin)).toEqual([undefined])
	})

	it('fails a recorded judge body the port sends more often than the harness did', async () => {
		const exchange = replay.run.judge[0]
		if (exchange === undefined) throw new Error('copy 1 has no judge body')
		const count = replay.run.judge.filter(
			(one) => canonicalStringify(one.body) === canonicalStringify(exchange.body),
		).length
		const transport = createJudgeTransport(replay.run.judge, () => [])
		const statuses: number[] = []
		for (let sent = 0; sent <= count; sent += 1) {
			const response = await transport.fetch(exchange.url, { method: 'POST', body: JSON.stringify(exchange.body) })
			statuses.push(response.status)
		}
		expect(statuses.slice(0, count)).toEqual(Array.from({ length: count }, () => exchange.status))
		expect(statuses[count]).toBe(500)
		expect(transport.traces[count]?.twin).toBeUndefined()
	})

	it('refuses a held-like judge body whose members, question line, criteria, or answer instruction changed', async () => {
		const exchange = replay.run.judge[0]
		if (exchange === undefined) throw new Error('copy 1 has no judge body')
		const { row, instructions, criteria } = findNoulRow(replay.imported.held)
		const match = createHeldMatcher(readJudgeSettings(replay.run), () => replay.imported.held)
		const prompt = renderHeldPrompt(row)
		const held = { ...exchange.body, prompt }
		expect(match(held)).toContainEqual(row)
		const options = isRecord(exchange.body.options) ? exchange.body.options : {}
		const swapped = renderHeldPrompt({
			...row,
			question: {
				form: 'noul',
				...(instructions === undefined ? {} : { instructions }),
				criteria: { true: criteria.false, false: criteria.true },
			},
		})
		const changed: ReadonlyArray<Readonly<Record<string, unknown>>> = [
			{ ...held, options: { ...options, num_ctx: 8192 } },
			{ ...held, options: { ...options, temperature: 0 } },
			{ ...held, model: 'another-model' },
			{ ...held, system: 'Another system.' },
			{ ...held, top_logprobs: 5 },
			{ ...held, raw: false },
			{ ...held, stream: true },
			{ ...held, logprobs: false },
			{ ...held, keep_alive: '10m' },
			{ ...held, seed: 1 },
			{ ...held, prompt: prompt.replace(`Question: ${instructions ?? ''}`, 'Question: Is this reworded?') },
			{ ...held, prompt: prompt.replace('Answer Yes if true, or No if false.', 'Answer with a number.') },
			{ ...held, prompt: prompt.replace(row.state, `${row.state} Changed.`) },
			{ ...held, prompt: prompt.replace('<|im_end|>\n<|im_start|>assistant', ' Extra.<|im_end|>\n<|im_start|>assistant') },
			{ ...held, prompt: `${prompt}Extra.` },
			{ ...held, prompt: swapped },
		]
		expect(swapped).not.toBe(prompt)
		expect(changed.map((body) => match(body).length)).toEqual(changed.map(() => 0))
		const transport = createJudgeTransport(replay.run.judge, match)
		const response = await transport.fetch(exchange.url, { method: 'POST', body: JSON.stringify(changed[0]) })
		expect(response.status).toBe(500)
		const labels = await transport.fetch(exchange.url, { method: 'POST', body: JSON.stringify(changed[changed.length - 1]) })
		expect(labels.status).toBe(500)
		expect(transport.traces.map((trace) => trace.twin)).toEqual([undefined, undefined])
	})

	it('serves a held row once and refuses its next match with a 500 and no twin', async () => {
		const exchange = replay.run.judge[0]
		const row = replay.imported.held[0]
		if (exchange === undefined || row === undefined) throw new Error('copy 1 has no judge body or held row')
		const match = createHeldMatcher(readJudgeSettings(replay.run), () => replay.imported.held)
		const transport = createJudgeTransport(replay.run.judge, match)
		const body = JSON.stringify({ ...exchange.body, prompt: renderHeldPrompt(row) })
		const first = await transport.fetch(exchange.url, { method: 'POST', body })
		const second = await transport.fetch(exchange.url, { method: 'POST', body })
		expect([first.status, second.status]).toEqual([200, 500])
		expect(transport.traces.map((trace) => trace.twin)).toEqual(['held failure', undefined])
		expect(transport.traces.map((trace) => trace.row)).toEqual([row, row])
	})

	describe('labels', () => {
		const roles = seedOf(1)
		const cut = (count: number): string => `${count} older ${count === 1 ? 'item' : 'items'} not shown; call recall with a narrower topic`

		// The labeling pass reads one message: the recorded lines with their leads against the port's lines.
		function label(recorded: readonly string[], port: readonly string[], leads: ReadonlyMap<string, string>) {
			const labeled = explain(
				{
					where: 'messages[1]',
					recorded: { role: 'tool', content: recorded.join('\n') },
					port: { role: 'tool', content: port.join('\n') },
				},
				leads,
				roles,
			)
			return classify(labeled.tags, roles)
		}

		function findAssistant(): number {
			const at = roles.roles.findIndex((role, handle) => role === 'assistant' && !roles.corrections.has(handle))
			if (at < 0) throw new Error('copy 1 seeds no assistant message')
			return at
		}

		function findFree(count: number, skip: ReadonlySet<number>): readonly number[] {
			const free = roles.texts.flatMap((text, handle) => {
				const related = roles.corrections.has(handle) || [...roles.corrections.values()].some((later) => later.includes(handle))
				return skip.has(handle) || related || text === '' ? [] : [handle]
			})
			if (free.length < count) throw new Error('copy 1 seeds too few unrelated messages')
			return free.slice(0, count)
		}

		it('labels port-only seed lines C1 when their items fit the recorded cut lines', () => {
			const assistant = findAssistant()
			const [first] = findFree(1, new Set([assistant]))
			const recordedLine = roles.texts[assistant] ?? ''
			const line = roles.texts[first ?? -1] ?? ''
			const result = label([recordedLine, cut(1)], [line], new Map([[recordedLine, `m${assistant}`]]))
			expect([...result.causes]).toEqual([CAUSE.c1])
			expect(result.unclassified).toEqual({ recorded: [], port: [] })
		})

		it('counts a seed line with its amender as one item', () => {
			const assistant = findAssistant()
			const pairs = [...roles.corrections].flatMap(([from, to]) => {
				const next = to[0]
				return next === undefined || from === assistant || next === assistant ? [] : [{ earlier: from, later: next }]
			})
			const [first] = pairs
			if (first === undefined) throw new Error('copy 1 decided no correction')
			const { earlier, later } = first
			const recordedLine = roles.texts[assistant] ?? ''
			const pair = [roles.texts[earlier] ?? '', roles.texts[later] ?? '']
			const result = label([recordedLine, cut(1)], pair, new Map([[recordedLine, `m${assistant}`]]))
			expect([...result.causes]).toEqual([CAUSE.c1])
			expect(result.unclassified).toEqual({ recorded: [], port: [] })
		})

		it('labels each port-only seed line C8 with its exact text when the items outnumber the cut lines', () => {
			const assistant = findAssistant()
			const lines = findFree(3, new Set([assistant])).map((handle) => roles.texts[handle] ?? '')
			const recordedLine = roles.texts[assistant] ?? ''
			const result = label([recordedLine, cut(1)], lines, new Map([[recordedLine, `m${assistant}`]]))
			expect(result.unclassified).toEqual({ recorded: [], port: lines })
			expect(label([recordedLine, cut(1), cut(2)], lines, new Map([[recordedLine, `m${assistant}`]])).unclassified).toEqual({
				recorded: [],
				port: [],
			})
		})

		it('labels a bare line C5 only when it follows the recorded note header in the message', () => {
			const header = LEDGER_NOTES.results
			const result = label(['Stray bare line.', header, 'Order note line.'], ['Shared line.'], new Map())
			expect([...result.causes]).toEqual([CAUSE.c5])
			expect(result.unclassified).toEqual({ recorded: ['Stray bare line.'], port: ['Shared line.'] })
		})

		it('labels a bare line C8 when the recorded message carries no note header', () => {
			const result = label(['Order note line.'], ['Shared line.'], new Map())
			expect(result.causes.size).toBe(0)
			expect(result.unclassified.recorded).toEqual(['Order note line.'])
		})
	})

	it('tells two bodies apart when a member holds undefined', () => {
		expect(stable({ a: 1, b: undefined })).not.toBe(stable({ a: 2, b: undefined }))
		expect(stable({ a: 1, b: 2 })).toBe(stable({ b: 2, a: 1 }))
	})

	it('changes at least one body when the scripted provider rewrites usage.prompt from the per-call ratio', async () => {
		const bodies = (copy: CopyReplay): readonly string[] =>
			copy.goals.flatMap((goal) =>
				goal.calls.map((call) => stable(buildPortBody(call))),
			)
		const changed: string[] = []
		for (const copy of COPIES) {
			const unpriced = await replayCopy(copy, false)
			expect(unpriced.rewritten).toBe(0)
			expect(replayOf(copy).rewritten).toBeGreaterThan(0)
			const priced = bodies(replayOf(copy))
			const raw = bodies(unpriced)
			const count =
				Math.abs(priced.length - raw.length) + priced.filter((body, at) => raw[at] !== undefined && body !== raw[at]).length
			process.stdout.write(`repricing v${copy}: ${count} of ${priced.length} port bodies change\n`)
			if (count > 0) changed.push(`v${copy}`)
		}
		expect(changed).not.toEqual([])
	})
})
