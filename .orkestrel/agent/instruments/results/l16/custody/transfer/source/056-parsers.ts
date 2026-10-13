import type { SustainedPreparation, SustainedReading } from './types.js'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { isRecord } from '@orkestrel/contract'
import { readJSON, readRows } from '../helpers.js'
import { projectCopy } from '../endurance/helpers.js'
import { MATRIX_FILES } from '../matrix/constants.js'
import {
	listWireInvariantFailures,
	listCapacityFiles,
	matchesMatrixExposure,
	measureMatrixCosts,
	readAttempt,
	readModelDigest,
	readDevelopment,
} from '../matrix/helpers.js'
import {
	isMatrixAttempt,
	isMatrixExecution,
	isMatrixRequest,
	isMatrixResource,
	isMatrixRow,
	isMatrixSelection,
} from '../matrix/validators.js'
import { hashFile, verifyFiles, readRefitCosts, readRefitAssessment } from '../refit/helpers.js'
import { isRefitAttempt, isRefitFile, isRefitGeneration } from '../refit/validators.js'
import { buildTimeline, parseAggregates } from '../shadow.js'
import { INSTRUCTION_SUMMARIES } from '../aggregates/constants.js'
import { readClassification, readSustainedExecution, readSustainedBoundary } from './helpers.js'
import { parseMatrixRun } from '../matrix/parsers.js'
import {
	isSustainedClassification,
	isSustainedExecution,
	isSustainedMessage,
	isSustainedObservation,
	isSustainedReceipt,
} from './validators.js'

/** Reads real complete or partial continuous evidence without loading private evaluation data.
 * @param path - Driver output directory
 * @returns Revalidated evidence and explicit integrity failures
 */
export function readSustainedRun(path: string): SustainedReading {
	const info = readJSON(join(path, 'run.json'))
	if (
		!isRecord(info) ||
		info.protocol !== 'e1' ||
		!isSustainedExecution(info.execution) ||
		!isRefitFile(info.executionFile) ||
		typeof info.status !== 'string'
	)
		throw new Error('invalid sustained run metadata')
	verifyFiles([info.executionFile])
	const { execution, frozen, runtime } = readSustainedExecution(info.executionFile.path)
	if (
		execution.phase === 'filing' ||
		!isDeepStrictEqual(info.execution, execution) ||
		!isDeepStrictEqual(info.frozen, frozen)
	)
		throw new Error('scored run has foreign execution custody')
	const inventory = readJSON(join(path, 'model-inventory.json'))
	for (const role of [frozen.decision, frozen.summarizer, frozen.judge])
		if (readModelDigest(inventory, role.model) !== role.digest)
			throw new Error('actual sustained model digest differs')
	const rows = readRows(join(path, 'rows.jsonl'))
	const picks = readRows(join(path, 'selections.jsonl'))
	const requests = readRows(join(path, 'requests.jsonl'))
	const receipts = readRows(join(path, 'receipts.jsonl'))
	const observations = readRows(join(path, 'observations.jsonl'))
	const rawMessages = readRows(join(path, 'messages.jsonl'))
	const messages = rawMessages.map((value) =>
		isRecord(value) ? { ...value, seed: value.index } : value,
	)
	if (
		!rows.every(isMatrixRow) ||
		!picks.every(isMatrixSelection) ||
		!requests.every(isMatrixRequest) ||
		!receipts.every(isSustainedReceipt) ||
		!observations.every(isSustainedObservation) ||
		!messages.every(isSustainedMessage)
	)
		throw new Error('malformed sustained evidence')
	const gauge =
		isRecord(info.gauge) &&
		typeof info.gauge.scale === 'number' &&
		typeof info.gauge.overhead === 'number'
			? { scale: info.gauge.scale, overhead: info.gauge.overhead }
			: undefined
	const boundary = readSustainedBoundary(info, requests, execution, frozen)
	const failures: string[] = [...boundary.failures]
	const errors: string[] = [...boundary.errors]
	if (execution.classification !== undefined) {
		const classification = readClassification(
			execution.classification,
			execution.runtime,
			execution.frozen,
		)
		if (
			!isRecord(info.lineage) ||
			!isRecord(info.lineage.seed) ||
			info.lineage.seed.runtime !== execution.runtime.hash ||
			info.lineage.seed.classification !== execution.classification.hash ||
			info.lineage.seed.hash !== classification.cache.hash ||
			!Array.isArray(info.lineage.before) ||
			info.lineage.before.length !== 1 ||
			!isRefitFile(info.lineage.before[0]) ||
			info.lineage.before[0].hash !== classification.cache.hash
		)
			errors.push('initial scenario cache ancestry differs')
	}
	if (info.status !== 'complete') failures.push(`run status ${info.status}`)
	if (gauge === undefined || !Number.isFinite(gauge.scale) || gauge.scale <= 0)
		(boundary.failures.length === 0 ? errors : failures).push('missing calibrated gauge')
	if (
		!isDeepStrictEqual(
			info.goals,
			runtime.goals.map((goal) => goal.id),
		) ||
		!isDeepStrictEqual(
			rows.map((row) => row.goal),
			runtime.goals.map((goal) => goal.id),
		)
	)
		(boundary.failures.length === 0 ? errors : failures).push(
			'incomplete or reordered continuous horizon',
		)
	if (
		rows.length !== observations.length ||
		!isDeepStrictEqual(
			rows.map((row) => row.goal),
			observations.map((one) => one.goal),
		)
	)
		errors.push('observation membership mismatch')
	const turns = readRows(join(path, 'turns.jsonl'))
	if (info.sent !== requests.filter((one) => one.sent).length || info.turns !== turns.length)
		errors.push('actual request or turn counts differ')
	for (const request of requests) {
		if (
			request.sent &&
			request.role === 'agent' &&
			request.goal !== undefined &&
			!turns.some(
				(turn) =>
					isRecord(turn) &&
					turn.turn === request.turn &&
					turn.goal === request.goal &&
					turn.estimate === request.estimate,
			)
		)
			errors.push(`request ${request.sequence}: missing actual turn`)
	}

	for (const [at, row] of rows.entries()) {
		if (
			row.partial ||
			row.error !== undefined ||
			row.reply === '' ||
			(row.resource?.length ?? 0) !== 0 ||
			row.sole > 0
		)
			(boundary.failures.length === 0 ? errors : failures).push(
				`${row.goal}: incomplete or unsupported response`,
			)
		const observation = observations[at]
		const goal = runtime.goals[at]
		if (observation === undefined || goal === undefined) continue
		if (
			observation.goal !== goal.id ||
			observation.shift !== goal.shift ||
			observation.after !== goal.after ||
			!observation.complete
		)
			(boundary.failures.length === 0 ? errors : failures).push(
				`${row.goal}: incomplete or changed observation`,
			)
		if (
			observation.checkpoint !==
			(observation.complete && goal.shift % 4 === 0 && runtime.goals[at + 1]?.shift !== goal.shift)
		)
			errors.push(`${row.goal}: checkpoint differs from complete continuous horizon`)
		if (
			!(
				at === rows.length - 1 &&
				row.partial === true &&
				row.reply === '' &&
				boundary.failures.length !== 0
			) &&
			(row.reply === '' ||
				!messages.some(
					(message) =>
						message.role === 'assistant' &&
						message.goal === row.goal &&
						message.content === row.reply,
				))
		)
			errors.push(`${row.goal}: response differs from actual conversation product`)
		if (
			!isDeepStrictEqual(
				observation.products.slice().sort(),
				rows
					.slice(0, at)
					.filter((earlier) =>
						messages.some(
							(message) => message.role === 'assistant' && message.goal === earlier.goal,
						),
					)
					.map((earlier) => `product:${earlier.goal}`)
					.sort(),
			)
		)
			errors.push(`${row.goal}: earlier product population differs`)
		if (observation.exposed !== matchesMatrixExposure({ execution, picks, requests }, row.goal))
			errors.push(`${row.goal}: exposure differs from actual request`)
		const available = [...observation.sources, ...observation.products].sort()
		if (
			new Set(available).size !== available.length ||
			!isDeepStrictEqual([...observation.selected, ...observation.omitted].sort(), available)
		)
			errors.push(`${row.goal}: selected/omitted partition differs`)
		for (const id of observation.conversation)
			if (!id.startsWith('message:') || !messages.some((message) => message.id === id.slice(8)))
				errors.push(`${row.goal}: unknown prior message`)
		for (const id of observation.products)
			if (
				!id.startsWith('product:') ||
				!rows.slice(0, at).some((earlier) => earlier.goal === id.slice(8))
			)
				errors.push(`${row.goal}: future or invented prior product`)
		for (const id of observation.sources)
			if (
				!(
					id.startsWith('source:') &&
					runtime.seed.slice(0, goal.after + 1).some((source) => source.id === id.slice(7))
				) &&
				!(
					id.startsWith('lookup:') &&
					receipts.some(
						(receipt) =>
							receipt.success &&
							receipt.after <= goal.after &&
							id ===
								`lookup:${String(receipt.arguments.id ?? receipt.arguments.account)}@${receipt.version}`,
					)
				)
			)
				errors.push(`${row.goal}: source not yet available`)
	}
	for (const receipt of receipts) {
		const goal = runtime.goals.find((one) => one.id === receipt.goal)
		if (
			goal === undefined ||
			receipt.after !== goal.after ||
			!rawMessages.some(
				(message) =>
					isRecord(message) &&
					message.goal === receipt.goal &&
					message.role === 'tool' &&
					message.call === receipt.call &&
					message.content === receipt.content,
			)
		)
			errors.push('tool receipt lacks actual conversation outcome')
		if (
			receipt.version !== undefined &&
			!runtime.lookups.some(
				(lookup) =>
					lookup.tool === receipt.tool &&
					lookup.id === String(receipt.arguments.id ?? receipt.arguments.account) &&
					lookup.from === receipt.version &&
					lookup.from <= receipt.after,
			)
		)
			errors.push('tool receipt uses unavailable version')
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
				(boundary.failures.length === 0 ? errors : failures).push(
					`${row.goal}: maintenance incomplete`,
				)
			for (const pick of picks.filter((one) => one.goal === row.goal))
				for (const binding of pick.aggregates ?? [])
					if (
						!isDeepStrictEqual(binding.state, snapshot?.topics.get(binding.topic)?.state) ||
						binding.state.goal !== row.goal ||
						!pick.instructions[INSTRUCTION_SUMMARIES.name]?.includes(binding.prose)
					)
						errors.push(`${row.goal}: maintenance binding differs`)
		}
	}
	failures.push(...listWireInvariantFailures({ picks, requests, gauge }, projectCopy(runtime)))
	const files = [
		...MATRIX_FILES,
		'receipts.jsonl',
		'observations.jsonl',
		...(execution.arm === 'aggregate' ? ['aggregates.jsonl'] : []),
	].map((file) => hashFile(join(path, file)))
	files.push(
		info.executionFile,
		execution.runtime,
		execution.frozen,
		execution.resource,
		...frozen.files,
		frozen.settings,
		...execution.limits.evidence,
	)
	if (execution.classification !== undefined) {
		const classification = readClassification(
			execution.classification,
			execution.runtime,
			execution.frozen,
		)
		files.push(execution.classification, classification.cache, ...classification.files)
	}
	for (const file of [execution.fit, execution.selection]) if (file !== undefined) files.push(file)
	return {
		path,
		execution,
		frozen,
		runtime,
		status: info.status,
		rows,
		picks,
		requests,
		receipts,
		observations,
		messages,
		gauge,
		journal,
		files: [
			...new Map(
				[...files, ...listCapacityFiles(requests)].map((file) => [
					`${file.path}:${file.hash}`,
					file,
				]),
			).values(),
		],
		failures: [...failures, ...errors],
		errors,
		costs: measureMatrixCosts({ path, rows, requests }),
	}
}

/** Resolves unique measured preparations without turning filing into a scored trajectory.
 * @param path - Classification, generation, fit, matrix preparation, or development manifest
 * @returns Underlying measured identities, preserving missing usage and invalidity
 */
export function readSustainedPreparation(path: string): readonly SustainedPreparation[] {
	const reference = hashFile(path)
	const value = readJSON(path)
	if (isSustainedClassification(value)) {
		verifyFiles([value.runtime, value.frozen, value.cache, ...value.files])
		const report = value.files.find((file) => file.path.endsWith('run.json'))
		if (report === undefined) throw new Error('filing preparation lacks raw report')
		const directory = dirname(report.path)
		const info = readJSON(report.path)
		const requests = readRows(join(directory, 'requests.jsonl'))
		if (
			!requests.every(isMatrixRequest) ||
			!isRecord(info) ||
			!isSustainedExecution(info.execution) ||
			info.execution.phase !== 'filing' ||
			info.execution.runtime.hash !== value.runtime.hash
		)
			throw new Error('invalid filing measurement')
		return [
			{
				identity: report.hash,
				phase: 'filing',
				files: [reference, value.cache, ...value.files],
				costs: measureMatrixCosts({ path: directory, rows: [], requests }),
				failures: value.failures,
			},
		]
	}
	if (isRefitGeneration(value)) {
		const attempts = hashFile(join(dirname(path), 'attempts.jsonl'))
		if (attempts.hash !== value.attempts) throw new Error('generation attempt custody differs')
		verifyFiles([value.evidence, ...value.files])
		const rows = readRows(attempts.path)
		if (!rows.every(isRefitAttempt)) throw new Error('invalid generation attempts')
		const measured = readRefitCosts(rows, value)
		return [
			{
				identity: reference.hash,
				phase: 'generation',
				files: [reference, attempts, value.evidence, value.controls, ...value.files],
				costs: {
					metadata: { requests: 0, wall: 0 },
					wire: [
						...measured.wire,
						...measured.controls.map((cost) => ({ ...cost, phase: 'calibration' as const })),
					],
					judge: undefined,
					lineage: value.lineage,
					elapsed: undefined,
					stage: 0,
					flush: 0,
				},
				failures: [...value.errors, ...measured.failures],
			},
		]
	}
	if (isRecord(value) && value.accepted !== undefined && value.preparation !== undefined) {
		const diagnosis = readRefitAssessment(reference)
		return readSustainedPreparation(diagnosis.preparation.manifest.path).map((preparation) => ({
			...preparation,
			files: [...preparation.files, reference, ...Object.values(diagnosis.preparation)],
			failures: [...preparation.failures, ...diagnosis.reasons],
		}))
	}
	if (isRecord(value) && isRecord(value.preparation) && isRefitFile(value.preparation.manifest)) {
		verifyFiles([value.preparation.manifest])
		return readSustainedPreparation(value.preparation.manifest.path).map((preparation) => ({
			...preparation,
			files: [...preparation.files, reference],
			failures: [
				...preparation.failures,
				...(value.separated === false ? ['development fit does not separate'] : []),
			],
		}))
	}
	if (
		isRecord(value) &&
		isMatrixExecution(value.execution) &&
		value.execution.phase === 'development'
	) {
		const run = parseMatrixRun(dirname(path))
		if (run === undefined) throw new Error('exploratory matrix preparation lacks raw evidence')
		const policy = readDevelopment(run.execution, run.frozen)
		return [
			...readSustainedPreparation(policy.diagnosis.path),
			...readSustainedPreparation(policy.full.path),
			{
				identity: reference.hash,
				phase: 'matrix',
				files: [reference, ...run.files],
				costs: measureMatrixCosts(run),
				failures: run.failures,
			},
		]
	}
	const attempts = isMatrixResource(value)
		? value.attempts
		: isRecord(value) && isMatrixAttempt(value.attempt)
			? [value.attempt]
			: []
	if (attempts.length > 0)
		return attempts.flatMap((attempt) => {
			const run = readAttempt(attempt)
			return run === undefined
				? []
				: [
						{
							identity: hashFile(join(run.path, 'run.json')).hash,
							phase: 'matrix' as const,
							files: [reference, ...run.files],
							costs: measureMatrixCosts(run),
							failures: run.failures,
						},
					]
		})
	if (
		isRecord(value) &&
		isSustainedExecution(value.execution) &&
		value.execution.phase === 'development'
	) {
		const run = readSustainedRun(dirname(path))
		return [
			{
				identity: reference.hash,
				phase: 'development',
				files: run.files,
				costs: run.costs,
				failures: run.failures,
			},
		]
	}
	throw new Error('unsupported or unmeasured preparation artifact')
}
