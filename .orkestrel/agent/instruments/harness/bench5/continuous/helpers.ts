import type {
	ConversationInterface,
	LedgerGauge,
	Message,
} from '../../vendor/agent-0.0.30-trimmed/index.js'
import type { EnduranceRuntime } from '../endurance/types.js'
import type { MatrixBudget, MatrixFailure, MatrixRequest } from '../matrix/types.js'
import type { RefitFile } from '../refit/types.js'
import type { CallRole } from '../types.js'
import type {
	ContinuousCost,
	ContinuousCosts,
	ContinuousManifest,
	ContinuousRun,
	ContinuousStatus,
} from './types.js'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { isRecord, isString } from '@orkestrel/contract'
import { readRuntime } from '../endurance/helpers.js'
import { readJSON, readRows, readWireReading } from '../helpers.js'
import { MATRIX_CAPACITY } from '../matrix/constants.js'
import { listResourceFailures } from '../matrix/helpers.js'
import { isMatrixRequest } from '../matrix/validators.js'
import { hashFile, verifyFiles } from '../refit/helpers.js'
import { isRefitFile } from '../refit/validators.js'
import { isSustainedMessage, isSustainedReceipt } from '../sustained/validators.js'
import { CONTINUOUS_FILES, UNLOAD_ATTEMPTS, UNLOAD_INTERVAL } from './constants.js'
import {
	isContinuousExecution,
	isContinuousManifest,
	isContinuousObservation,
	isContinuousRow,
	isContinuousSection,
	isContinuousSelection,
	isContinuousStatus,
	isContinuousTurn,
} from './validators.js'

/**
 * Names one trajectory from its model key and arm.
 *
 * @param key - The `MODELS` key
 * @param arm - The arm served
 * @returns The run name, such as `c1-q4-records`
 */
export function nameContinuous(key: string, arm: string): string {
	return `c1-${key}-${arm}`
}

/**
 * Renders folded messages as the transcript the summarizer reads.
 *
 * @param messages - The messages a fold removes from the live tail, in order
 * @returns One line per message as `role: content`, with an assistant turn's calls named after its content
 */
export function renderTranscript(messages: readonly Message[]): string {
	return messages
		.map((message) => {
			const calls = (message.calls ?? [])
				.map((call) => ` [calls ${call.name} ${JSON.stringify(call.arguments)}]`)
				.join('')
			return `${message.role}: ${message.content}${calls}`
		})
		.join('\n')
}

/**
 * Converts the physical window into the estimate units the agent's compaction budget measures.
 *
 * @param budget - The window and the generation reserve in tokens
 * @param gauge - The measured price of a prompt
 * @returns The estimate units a prompt can take before a fold; at least 1
 */
export function computeWindowUnits(budget: MatrixBudget, gauge: LedgerGauge): number {
	return Math.max(1, Math.floor((budget.window - budget.reserve - gauge.overhead) / gauge.scale))
}

/**
 * Checks whether a daemon reply refused the request for its length.
 *
 * @param text - The response body or the error text
 * @returns True if the text names a context, length, or memory refusal; false otherwise
 */
export function matchesOverflow(text: string | undefined): boolean {
	return text !== undefined && MATRIX_CAPACITY.test(text)
}

/**
 * Reads the resource failures of one request without the matrix capacity observation.
 *
 * @param role - The role that sent the request
 * @param request - The request body as sent
 * @param response - The response text, when one arrived
 * @param budget - The frozen budget the request must carry
 * @param status - The HTTP status, when one arrived
 * @param error - The transport error, when one occurred
 * @param calibrating - If `true`, the request is a one-token calibration call; if `false`, a goal call
 * @returns The failures `listResourceFailures` reads, less the capacity snapshot it expects
 */
export function listContinuousFailures(
	role: CallRole,
	request: unknown,
	response: string | undefined,
	budget: MatrixBudget,
	status: number | undefined,
	error: string | undefined,
	calibrating: boolean,
): readonly MatrixFailure[] {
	return listResourceFailures(
		role,
		request,
		response,
		budget,
		status,
		error,
		undefined,
		calibrating,
	).filter((failure) => failure !== 'observation')
}

/**
 * Reads the file identities a workload manifest pins.
 *
 * @param path - The workload manifest, schema 1
 * @returns The pinned files
 * @remarks Thrown when the manifest is not schema 1 or a file entry lacks a path and hash.
 */
export function readContinuousWorkload(path: string): readonly RefitFile[] {
	const value = readJSON(path)
	if (
		!isRecord(value) ||
		value.schema !== 1 ||
		!Array.isArray(value.files) ||
		!value.files.every(isRefitFile)
	)
		throw new Error('invalid workload manifest')
	return value.files
}

/**
 * Reads a frozen manifest and checks the custody it names.
 *
 * @param path - The manifest file
 * @returns The manifest and the runtime it serves
 * @remarks Thrown when the shape is invalid, a named file changed, the workload manifest does not pin the runtime and the oracle, or the horizon differs from the runtime's goals.
 */
export function readContinuousManifest(path: string): {
	readonly manifest: ContinuousManifest
	readonly runtime: EnduranceRuntime
} {
	const manifest = readJSON(path)
	if (!isContinuousManifest(manifest)) throw new Error('invalid c1 manifest')
	verifyFiles([
		manifest.workload,
		manifest.runtime,
		manifest.oracle,
		manifest.agent,
		manifest.ollama,
		manifest.tags,
	])
	const pinned = readContinuousWorkload(manifest.workload.path)
	for (const file of [manifest.runtime, manifest.oracle])
		if (!pinned.some((entry) => entry.hash === file.hash))
			throw new Error('workload manifest does not pin the runtime and the oracle')
	const runtime = readRuntime(manifest.runtime.path)
	if (manifest.limits.goals !== runtime.goals.length)
		throw new Error('manifest horizon differs from the runtime goals')
	return { manifest, runtime }
}

/**
 * Lists every message a conversation holds, the folded originals first and the live tail after.
 *
 * @param conversation - The conversation to read
 * @returns The messages in conversation order
 */
export function collectHistory(conversation: ConversationInterface): readonly Message[] {
	return [
		...conversation.sections.flatMap((section) => section.messages),
		...conversation.messages(),
	]
}

/**
 * Sums the fresh wire expenditure by role and phase.
 *
 * @param requests - Every request record of the run
 * @param started - The run's start epoch milliseconds
 * @param finished - The run's end epoch milliseconds
 * @param flush - The summed prefix-flush wall
 * @returns Per-role expenditure, with unknown usage counted separately
 */
export function measureContinuousCosts(
	requests: readonly MatrixRequest[],
	started: number,
	finished: number,
	flush: number,
): ContinuousCosts {
	const roles: readonly CallRole[] = ['agent', 'judge', 'summarizer', 'flush']
	const wire: ContinuousCost[] = []
	for (const role of roles)
		for (const phase of ['calibration', 'trajectory'] as const) {
			const sent = requests.filter(
				(request) =>
					request.sent &&
					request.role === role &&
					(phase === 'calibration') === (request.goal === undefined),
			)
			if (sent.length === 0) continue
			wire.push({
				role,
				phase,
				requests: sent.length,
				wall: sent.reduce((sum, request) => sum + request.wall, 0),
				prompt: sent.reduce((sum, request) => sum + (request.prompt ?? 0), 0),
				completion: sent.reduce((sum, request) => sum + (request.completion ?? 0), 0),
				missing: sent.filter(
					(request) => request.prompt === undefined || request.completion === undefined,
				).length,
			})
		}
	return { wire, elapsed: finished - started, flush }
}

/**
 * Reads a trajectory directory back and rechecks its evidence.
 *
 * @param path - The run directory
 * @returns The run with every integrity failure found
 * @remarks Thrown when `run.json` or the execution binding is malformed or the manifest custody changed.
 */
export function readContinuousRun(path: string): ContinuousRun {
	const info = readJSON(join(path, 'run.json'))
	if (
		!isRecord(info) ||
		info.protocol !== 'c1' ||
		!isContinuousExecution(info.execution) ||
		!isRefitFile(info.executionFile) ||
		!isContinuousStatus(info.status)
	)
		throw new Error('invalid c1 run metadata')
	verifyFiles([info.executionFile, info.execution.manifest, info.execution.runtime])
	const { manifest, runtime } = readContinuousManifest(info.execution.manifest.path)
	const execution = readJSON(info.executionFile.path)
	if (!isContinuousExecution(execution) || execution.arm !== info.execution.arm)
		throw new Error('run execution differs from its retained binding')
	const status: ContinuousStatus = info.status
	const rows = readRows(join(path, 'rows.jsonl'))
	const picks = readRows(join(path, 'selections.jsonl'))
	const requests = readRows(join(path, 'requests.jsonl'))
	const receipts = readRows(join(path, 'receipts.jsonl'))
	const observations = readRows(join(path, 'observations.jsonl'))
	const messages = readRows(join(path, 'messages.jsonl'))
	const sections = readRows(join(path, 'sections.jsonl'))
	const turns = readRows(join(path, 'turns.jsonl'))
	if (
		!rows.every(isContinuousRow) ||
		!picks.every(isContinuousSelection) ||
		!requests.every(isMatrixRequest) ||
		!receipts.every(isSustainedReceipt) ||
		!observations.every(isContinuousObservation) ||
		!messages.every(isSustainedMessage) ||
		!sections.every(isContinuousSection) ||
		!turns.every(isContinuousTurn)
	)
		throw new Error('malformed c1 evidence')
	const failures: string[] = []
	const gauge =
		isRecord(info.gauge) &&
		typeof info.gauge.scale === 'number' &&
		typeof info.gauge.overhead === 'number'
			? { scale: info.gauge.scale, overhead: info.gauge.overhead }
			: undefined
	if (gauge === undefined) failures.push('missing calibrated gauge')
	const inventory = readJSON(join(path, 'model-inventory.json'))
	if (!isRecord(inventory) || !Array.isArray(inventory.models))
		failures.push('missing model inventory')
	let calls = 0
	let tokens = 0
	for (const [at, request] of requests.entries()) {
		if (request.sequence !== at + 1) failures.push(`request ${request.sequence}: sequence differs`)
		const reading = readWireReading({ body: request.request }, { text: request.response })
		if (
			request.prompt !== reading.prompt ||
			request.completion !== reading.completion ||
			request.reason !== reading.reason
		)
			failures.push(`request ${request.sequence}: altered actual usage`)
		const expected = listContinuousFailures(
			request.role,
			request.request,
			request.response,
			manifest.budget,
			request.status,
			request.error,
			request.goal === undefined,
		)
		if (JSON.stringify(expected) !== JSON.stringify(request.failures))
			failures.push(`request ${request.sequence}: resource reading differs`)
		if (
			request.role === 'agent' &&
			request.goal !== undefined &&
			request.sent &&
			!turns.some(
				(turn) =>
					turn.turn === request.turn &&
					turn.goal === request.goal &&
					turn.estimate === request.estimate,
			)
		)
			failures.push(`request ${request.sequence}: missing actual turn`)
		if (request.sent) calls += 1
		tokens += (reading.prompt ?? 0) + (reading.completion ?? 0)
	}
	if (calls !== info.sent || tokens !== info.tokens)
		failures.push('actual request or token counts differ')
	if (calls > manifest.limits.calls) failures.push('requests continued beyond the call limit')
	if (rows.length !== observations.length) failures.push('observation membership mismatch')
	const served = runtime.goals.slice(0, rows.length).map((goal) => goal.id)
	if (JSON.stringify(rows.map((row) => row.goal)) !== JSON.stringify(served))
		failures.push('rows differ from the continuous horizon prefix')
	if (status === 'complete' && rows.length !== runtime.goals.length)
		failures.push('complete status without the whole horizon')
	for (const [at, row] of rows.entries()) {
		const observation = observations[at]
		const goal = runtime.goals[at]
		if (observation === undefined || goal === undefined) continue
		if (
			observation.goal !== goal.id ||
			observation.shift !== goal.shift ||
			observation.after !== goal.after
		)
			failures.push(`${row.goal}: observation differs from the horizon`)
		if (
			row.reply !== '' &&
			!messages.some(
				(message) =>
					message.role === 'assistant' &&
					message.goal === row.goal &&
					message.content.trim() === row.reply,
			)
		)
			failures.push(`${row.goal}: response differs from the actual conversation product`)
		const available = [...observation.sources, ...observation.products].sort()
		if (
			new Set(available).size !== available.length ||
			JSON.stringify([...observation.selected, ...observation.omitted].sort()) !==
				JSON.stringify(available) ||
			observation.folded.some((id) => !observation.omitted.includes(id))
		)
			failures.push(`${row.goal}: selected, omitted, and folded partition differs`)
		if (
			manifest.failure !== 'continue' &&
			at < rows.length - 1 &&
			(row.reply === '' || row.partial || row.error !== undefined)
		)
			failures.push(`${row.goal}: an incomplete product precedes a served goal`)
	}
	for (const receipt of receipts) {
		const goal = runtime.goals.find((one) => one.id === receipt.goal)
		if (
			goal === undefined ||
			receipt.after !== goal.after ||
			!messages.some(
				(message) =>
					message.goal === receipt.goal &&
					message.role === 'tool' &&
					message.content === receipt.content,
			)
		)
			failures.push('tool receipt lacks an actual conversation outcome')
	}
	const files = CONTINUOUS_FILES.filter((name) => existsSync(join(path, name))).map((name) =>
		hashFile(join(path, name)),
	)
	files.push(info.execution.manifest, info.execution.runtime, manifest.workload, manifest.agent)
	const costs = measureContinuousCosts(
		requests,
		typeof info.started === 'number' ? info.started : 0,
		typeof info.finished === 'number' ? info.finished : 0,
		rows.reduce((sum, row) => sum + row.flush, 0),
	)
	return {
		path,
		execution,
		manifest,
		runtime,
		status,
		rows,
		picks,
		requests,
		receipts,
		observations,
		messages,
		sections,
		gauge,
		files,
		failures,
		costs,
	}
}

/**
 * Reads the models a daemon holds loaded.
 *
 * @param url - The daemon base URL
 * @returns The loaded model names
 * @remarks Thrown when the daemon does not answer `/api/ps` with a model list.
 */
export async function readLoaded(url: string): Promise<readonly string[]> {
	const response = await fetch(new URL('/api/ps', url))
	const value: unknown = await response.json()
	if (!isRecord(value) || !Array.isArray(value.models)) throw new Error('daemon reports no models')
	return value.models.flatMap((entry: unknown) =>
		isRecord(entry) && isString(entry.name) ? [entry.name] : [],
	)
}

/**
 * Unloads every model the daemon holds and waits until none is loaded, so a run starts cold.
 *
 * @param url - The daemon base URL
 * @remarks Thrown when a model is still loaded after the bounded wait.
 */
export async function unloadModels(url: string): Promise<void> {
	for (const name of await readLoaded(url))
		await fetch(new URL('/api/generate', url), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ model: name, keep_alive: 0 }),
		})
	for (let attempt = 0; attempt < UNLOAD_ATTEMPTS; attempt += 1) {
		if ((await readLoaded(url)).length === 0) return
		await delay(UNLOAD_INTERVAL)
	}
	throw new Error('models still loaded after the unload wait')
}
