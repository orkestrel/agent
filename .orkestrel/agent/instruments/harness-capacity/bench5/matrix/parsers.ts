import type { MatrixRun } from './types.js'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { isFiniteNumber, isRecord } from '@orkestrel/contract'
import { INSTRUCTION_SUMMARIES } from '../aggregates/constants.js'
import { COPIES_DIR } from '../constants.js'
import { readJSON, readRows, readWireReading } from '../helpers.js'
import { hashFile } from '../refit/helpers.js'
import { buildTimeline, parseAggregates } from '../shadow.js'
import { MATRIX_FILES } from './constants.js'
import {
	listMatrixWireFailures,
	listCapacityFailures,
	listCapacityFiles,
	listResourceFailures,
	nameMatrix,
	readFrozen,
	readModelDigest,
	readDevelopment,
	permitsContinuation,
	matchesCappedSummary,
	readRequestOutcome,
	isStoppedRequest,
} from './helpers.js'
import { isMatrixExecution, isMatrixRequest, isMatrixRow, isMatrixSelection } from './validators.js'

/** Decodes a frozen l6 run and refuses archive or malformed evidence.
 * @param path - The run directory
 * @returns The decoded run with explicit invalidity, or absence off-shape
 */
export function parseMatrixRun(path: string): MatrixRun | undefined {
	const info = readJSON(join(path, 'run.json'))
	if (
		!isRecord(info) ||
		info.protocol !== 'l6' ||
		!isMatrixExecution(info.execution) ||
		typeof info.status !== 'string'
	)
		return undefined
	const execution = info.execution
	const frozen = readFrozen(execution.frozen)
	const development =
		execution.phase === 'development' ? readDevelopment(execution, frozen) : undefined
	if (execution.key !== frozen.key || execution.think !== frozen.think)
		throw new Error('run decision identity differs from freeze')
	if (!isDeepStrictEqual(info.frozen, frozen) || info.identity !== nameMatrix(execution))
		throw new Error('run configuration custody mismatch')
	const inventory = readJSON(join(path, 'model-inventory.json'))
	for (const role of [frozen.decision, frozen.summarizer, frozen.judge])
		if (readModelDigest(inventory, role.model) !== role.digest)
			throw new Error('actual run model digest differs from freeze')
	const rows = readRows(join(path, 'rows.jsonl'))
	const picks = readRows(join(path, 'selections.jsonl'))
	const requests = readRows(join(path, 'requests.jsonl'))
	if (
		!rows.every(isMatrixRow) ||
		!picks.every(isMatrixSelection) ||
		!requests.every(isMatrixRequest)
	)
		return undefined
	const gauge =
		isRecord(info.gauge) && isFiniteNumber(info.gauge.scale) && isFiniteNumber(info.gauge.overhead)
			? { scale: info.gauge.scale, overhead: info.gauge.overhead }
			: undefined
	const failures: string[] = [...listCapacityFailures(requests, frozen, execution.budget)]
	for (const row of rows) {
		if (
			(row.partial === true || row.error !== undefined) &&
			(development === undefined || !permitsContinuation(requests, frozen, execution, row.goal))
		)
			failures.push(`${row.goal}: incomplete or failed execution`)
		if (row.sole > 0) failures.push(`${row.goal}: sole-carried summary token`)
	}
	const scenario = readJSON(join(COPIES_DIR, `v${execution.copy}.json`))
	const goals =
		isRecord(scenario) && Array.isArray(scenario.goals)
			? scenario.goals.map((goal: unknown) => (isRecord(goal) ? goal.id : undefined))
			: []
	if (
		goals.length === 0 ||
		!isDeepStrictEqual(
			rows.map((row) => row.goal),
			goals,
		) ||
		!isDeepStrictEqual(info.goals, goals)
	)
		failures.push('incomplete or reordered trajectory')
	if (
		info.status !==
		(development === undefined
			? 'complete'
			: rows.some((row) => !row.success)
				? 'development-failed-goals'
				: 'development-complete')
	)
		failures.push(`run status ${info.status}`)
	if (gauge === undefined || gauge.scale <= 0) failures.push('missing calibrated gauge')
	if (isRecord(info.judge) && info.judge.transient !== 0) failures.push('transient judge fault')
	if (info.sent !== requests.filter((request) => request.sent).length)
		failures.push('actual sent-request count mismatch')
	const turns = readRows(join(path, 'turns.jsonl'))
	if (info.turns !== turns.length) failures.push('turn observation count mismatch')
	for (const request of requests) {
		const continued =
			development !== undefined &&
			request.goal !== undefined &&
			permitsContinuation(requests, frozen, execution, request.goal)
		const withheld =
			development !== undefined &&
			matchesCappedSummary(request, frozen, execution, development, false)
		if (
			development !== undefined &&
			!continued &&
			!withheld &&
			readRequestOutcome(request, execution.budget, frozen) !== 'complete'
		)
			failures.push(`request ${request.sequence}: invalid exploratory completion`)
		const resource = listResourceFailures(
			request.role,
			request.request,
			request.response,
			execution.budget,
			request.status,
			request.error,
			request.capacity,
			request.goal === undefined,
		)
		if (!isDeepStrictEqual(resource, request.failures))
			failures.push(`request ${request.sequence}: resource reading mismatch`)
		if (!continued)
			for (const failure of resource) failures.push(`request ${request.sequence}: ${failure}`)
		const usage = readWireReading({ body: request.request }, { text: request.response })
		if (
			request.prompt !== usage.prompt ||
			request.completion !== usage.completion ||
			request.reason !== usage.reason
		)
			failures.push(`request ${request.sequence}: altered actual usage`)
		if (isStoppedRequest(request, requests)) continue
		const role =
			request.role === 'summarizer'
				? frozen.summarizer
				: request.role === 'judge'
					? frozen.judge
					: frozen.decision
		if (!isRecord(request.request) || request.request.model !== role.model)
			failures.push(`request ${request.sequence}: model role differs`)
		if (
			request.role === 'summarizer' &&
			(!isRecord(request.request) ||
				request.request.think !== false ||
				!isDeepStrictEqual(request.request.options, frozen.summarizer.sampler))
		)
			failures.push(`request ${request.sequence}: summarizer configuration differs`)
		if (request.goal === undefined) {
			if (request.role === 'agent') {
				const reading = readWireReading({ body: request.request }, { text: request.response })
				if (
					!reading.complete ||
					reading.prompt === undefined ||
					reading.completion === undefined ||
					request.error !== undefined ||
					(request.status ?? 0) >= 400
				)
					failures.push(
						`calibration request ${request.sequence}: missing raw usage or failed transport`,
					)
				if (
					!isRecord(request.request) ||
					request.request.think !== false ||
					request.request.truncate !== false ||
					request.request.shift !== false ||
					!isRecord(request.request.options) ||
					request.request.options.num_predict !== 1
				)
					failures.push(`calibration request ${request.sequence}: configuration differs`)
			}
			continue
		}
		if (request.role === 'agent') {
			if (
				request.turn === undefined ||
				!turns.some(
					(turn) =>
						isRecord(turn) &&
						turn.turn === request.turn &&
						turn.goal === request.goal &&
						turn.estimate === request.estimate,
				)
			)
				failures.push(`request ${request.sequence}: missing exact turn observation`)
			const pick = picks.findLast(
				(entry) => entry.goal === request.goal && entry.sequence < request.sequence,
			)
			const recovery = pick !== undefined && pick.pass > 1
			if (
				!isRecord(request.request) ||
				request.request.think !== (recovery ? false : execution.think)
			)
				failures.push(`request ${request.sequence}: thinking policy differs`)
			if (
				recovery &&
				isRecord(request.request) &&
				Array.isArray(request.request.tools) &&
				request.request.tools.length > 0
			)
				failures.push(`request ${request.sequence}: recovery tools enabled`)
		}
	}
	const journal = existsSync(join(path, 'aggregates.jsonl'))
		? readRows(join(path, 'aggregates.jsonl'))
		: []
	if (execution.arm === 'aggregate') {
		for (const row of rows) {
			const end = journal.findLastIndex(
				(entry) => isRecord(entry) && entry.event === 'maintenance' && entry.goal === row.goal,
			)
			const marker = journal[end]
			const snapshot = buildTimeline(parseAggregates(journal.slice(0, end + 1))).at(-1)
			if (!isRecord(marker) || marker.status !== 'complete')
				failures.push(`${row.goal}: maintenance incomplete`)
			for (const pick of picks.filter((entry) => entry.goal === row.goal)) {
				const body = pick.instructions[INSTRUCTION_SUMMARIES.name]
				if ((body === undefined) !== (pick.aggregates?.length === 0))
					failures.push(`${row.goal}: body binding mismatch`)
				for (const binding of pick.aggregates ?? []) {
					if (
						!isDeepStrictEqual(binding.state, snapshot?.topics.get(binding.topic)?.state) ||
						binding.state.goal !== row.goal ||
						binding.prose === '' ||
						!body?.includes(binding.prose)
					)
						failures.push(`${row.goal}: maintained state mismatch`)
				}
			}
		}
	}
	if (
		execution.arm === 'full' &&
		picks.some(
			(pick) => pick.briefing !== '' || pick.instructions[INSTRUCTION_SUMMARIES.name] !== undefined,
		)
	)
		failures.push('full-view selection contains a records or aggregate briefing')
	failures.push(...listMatrixWireFailures({ execution, picks, requests, gauge }))
	return {
		path,
		execution,
		frozen,
		status: info.status,
		rows,
		picks,
		requests,
		gauge,
		journal,
		files: [
			...listCapacityFiles(requests),
			...MATRIX_FILES.map((file) => hashFile(join(path, file))),
			...(journal.length === 0 ? [] : [hashFile(join(path, 'aggregates.jsonl'))]),
		],
		failures,
	}
}
