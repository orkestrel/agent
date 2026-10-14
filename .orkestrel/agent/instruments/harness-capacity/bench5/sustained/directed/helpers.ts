import type { RefitFile } from '../../refit/types.js'
import type { MatrixFreeze } from '../../matrix/types.js'
import type {
	SustainedArchive,
	SustainedDirected,
	SustainedTransfer,
	SustainedPreparation,
} from '../types.js'
import { basename, join, relative, resolve, sep } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { arrayOf, isRecord } from '@orkestrel/contract'
import { HARNESS } from '../../constants.js'
import { readBuild, readWorkload } from '../../build/helpers.js'
import { readJSON, readRows } from '../../helpers.js'
import { readRuntime } from '../../endurance/helpers.js'
import { buildBudget, readFrozen, measureMatrixCosts } from '../../matrix/helpers.js'
import {
	isMatrixFreeze,
	isMatrixResource,
	isMatrixRequest,
	isMatrixRow,
} from '../../matrix/validators.js'
import { hashFile, verifyFiles, readRefitCosts } from '../../refit/helpers.js'
import { isRefitFile, isRefitGeneration, isRefitAttempt } from '../../refit/validators.js'
import { isSustainedDirected } from '../validators.js'

/** Resolves and checks preserved original bytes without rewriting historical references.
 * @param transfer - Root-reviewed transfer envelope
 * @returns Original identities paired with their retained files
 */
export function readDirectedArchive(transfer: SustainedTransfer): readonly SustainedArchive[] {
	verifyFiles([transfer.receipt, transfer.review])
	const receipt = readJSON(transfer.receipt.path)
	if (
		!isRecord(receipt) ||
		receipt.status !== 'validated' ||
		!isRecord(receipt.archive) ||
		!Array.isArray(receipt.archive.files) ||
		!Array.isArray(receipt.steps)
	)
		throw new Error('directed transfer lacks pre-edit validator receipt')
	const steps = receipt.steps
	if (
		![
			'readBuild',
			'q4-think0 readFrozen',
			'q4-think0 readResource',
			'q4-think1 readFrozen',
			'q4-think1 readResource',
			'readRefitAssessment',
		].every((name) =>
			steps.some((step) => isRecord(step) && step.name === name && step.exitCode === 0),
		)
	)
		throw new Error('missing pre-edit validator result')
	return receipt.archive.files.map((entry) => {
		if (
			!isRecord(entry) ||
			typeof entry.originalPath !== 'string' ||
			typeof entry.archivedPath !== 'string' ||
			typeof entry.originalHash !== 'string' ||
			entry.archivedHash !== entry.originalHash
		)
			throw new Error('invalid directed archive mapping')
		const retained = {
			path: join(transfer.archive, basename(entry.archivedPath)),
			hash: entry.originalHash,
		}
		verifyFiles([retained])
		return { original: { path: entry.originalPath, hash: entry.originalHash }, retained }
	})
}

/** Checks historical file identities against preserved bytes, using live bytes only for unchanged evidence.
 * @param files - Original identities
 * @param archive - Validated archive mapping
 */
export function verifyDirectedFiles(
	files: readonly RefitFile[],
	archive: readonly SustainedArchive[],
): void {
	verifyFiles(
		files.map(
			(file) =>
				archive.find(
					(entry) =>
						resolve(entry.original.path) === resolve(file.path) &&
						entry.original.hash === file.hash,
				)?.retained ?? file,
		),
	)
}

/** Checks whether a source delta belongs to the reviewed operator and audit surface.
 * @param path - Harness-relative source path
 * @returns True if the delta is in scope; false otherwise
 */
export function matchesDirectedDelta(path: string): boolean {
	return (
		path === 'README.md' ||
		path === 'bench5/Driver.ts' ||
		path.startsWith('bench5/sustained/') ||
		path.startsWith('bench5/tests/sustained/') ||
		path === 'bench5/tests/Driver.test.ts'
	)
}

/** Checks all source membership and byte differences against the enumerated reviewed delta.
 * @param transfer - Exact transfer and review identities
 * @param archive - Validated original archive
 * @param historical - Original role freeze
 * @param frozen - Successor role freeze
 */
export function verifyDirectedSources(
	transfer: SustainedTransfer,
	archive: readonly SustainedArchive[],
	historical: MatrixFreeze,
	frozen: MatrixFreeze,
): void {
	const original = archive.find(
		(entry) =>
			entry.original.path === historical.files[0]?.path &&
			entry.original.hash === historical.files[0]?.hash,
	)
	if (original === undefined) throw new Error('missing archived build manifest')
	const before = readJSON(original.retained.path)
	const after = readBuild()
	if (
		!isRecord(before) ||
		!arrayOf(isRefitFile)(before.sources) ||
		!isDeepStrictEqual(before.compiler, after.compiler) ||
		!isDeepStrictEqual(before.resources, after.resources)
	)
		throw new Error('directed transfer changes compiler or workload resources')
	const changed: RefitFile[] = []
	for (const file of before.sources) {
		const successor = after.sources.find((entry) => entry.path === file.path)
		if (successor === undefined) throw new Error(`directed transfer removes source: ${file.path}`)
		if (successor.hash !== file.hash)
			changed.push({ path: resolve(HARNESS, successor.path), hash: successor.hash })
	}
	for (const file of after.sources)
		if (!before.sources.some((entry) => entry.path === file.path))
			changed.push({ path: resolve(HARNESS, file.path), hash: file.hash })
	if (
		changed.some(
			(file) => !matchesDirectedDelta(relative(HARNESS, file.path).split(sep).join('/')),
		) ||
		changed.length !== transfer.changes.length ||
		new Set(transfer.changes.map((file) => resolve(file.path))).size !== changed.length ||
		changed.some(
			(file) =>
				!transfer.changes.some(
					(entry) => resolve(entry.path) === file.path && entry.hash === file.hash,
				),
		)
	)
		throw new Error('directed transfer has unreviewed or out-of-scope source delta')
	verifyFiles(transfer.changes)
	verifyDirectedFiles(historical.files, archive)
	for (const file of historical.files) {
		if (!archive.some((entry) => isDeepStrictEqual(entry.original, file)))
			throw new Error('missing archived original freeze file')
		const successor = frozen.files.find((entry) => resolve(entry.path) === resolve(file.path))
		if (successor === undefined) throw new Error('successor drops frozen population')
		if (
			successor.hash !== file.hash &&
			resolve(file.path) !== resolve(historical.files[0]?.path ?? '') &&
			!transfer.changes.some(
				(entry) => resolve(entry.path) === resolve(file.path) && entry.hash === successor.hash,
			)
		)
			throw new Error('successor changes unreviewed frozen source')
	}
}

/** Reads user-directed custody with transferred matrix support and unchanged historical budgets.
 * @param path - Exact directed manifest path
 * @returns Validated operator manifest and successor role freeze
 */
export function readSustainedDirected(path: string): {
	readonly directed: SustainedDirected
	readonly frozen: MatrixFreeze
} {
	const directed = readJSON(path)
	if (!isSustainedDirected(directed)) throw new Error('invalid directed comparison manifest')
	const transfer = directed.transfer
	verifyFiles([
		directed.runtime,
		directed.frozen,
		transfer.historical,
		transfer.resource,
		transfer.fit,
		transfer.diagnosis,
		...directed.limits.evidence,
	])
	const archive = readDirectedArchive(transfer)
	const receipt = readJSON(transfer.receipt.path)
	const arm = directed.think ? 'q4-think1' : 'q4-think0'
	if (
		!isRecord(receipt) ||
		!isRecord(receipt.inputs) ||
		!Array.isArray(receipt.inputs.freezes) ||
		!Array.isArray(receipt.inputs.resources) ||
		!receipt.inputs.freezes.some(
			(entry) =>
				isRecord(entry) &&
				entry.arm === arm &&
				entry.path === transfer.historical.path &&
				entry.hash === transfer.historical.hash,
		) ||
		!receipt.inputs.resources.some(
			(entry) =>
				isRecord(entry) &&
				entry.arm === arm &&
				entry.path === transfer.resource.path &&
				entry.hash === transfer.resource.hash,
		) ||
		!isDeepStrictEqual(receipt.inputs.fit, transfer.fit) ||
		!isDeepStrictEqual(receipt.inputs.diagnosis, transfer.diagnosis)
	)
		throw new Error('directed transfer differs from pre-edit validated inputs')
	const historical = readJSON(transfer.historical.path)
	const frozen = readFrozen(directed.frozen)
	if (
		!isMatrixFreeze(historical) ||
		!isDeepStrictEqual({ ...historical, files: frozen.files }, frozen) ||
		frozen.key !== directed.key ||
		frozen.think !== directed.think
	)
		throw new Error('directed transfer changes historical roles or settings')
	verifyDirectedSources(transfer, archive, historical, frozen)
	const resource = readJSON(transfer.resource.path)
	if (
		!isMatrixResource(resource) ||
		!resource.accepted ||
		!isDeepStrictEqual(resource.frozen, transfer.historical) ||
		!isDeepStrictEqual(resource.budget, directed.budget) ||
		!isDeepStrictEqual(directed.budget, buildBudget(directed.think ? 1024 : 512))
	)
		throw new Error('directed historical resource budget differs')
	for (const attempt of resource.attempts)
		verifyDirectedFiles([attempt.execution, ...attempt.files], archive)
	const fit = readJSON(transfer.fit.path)
	const diagnosis = readJSON(transfer.diagnosis.path)
	if (
		!isRecord(fit) ||
		fit.agree !== 0.61 ||
		fit.change !== 0.56 ||
		fit.separated !== true ||
		!isRecord(fit.matrix) ||
		!isDeepStrictEqual(fit.matrix.summarizer, frozen.summarizer) ||
		!isDeepStrictEqual(fit.matrix.judge, frozen.judge) ||
		!isDeepStrictEqual(fit.matrix.files, historical.files) ||
		fit.matrix.settings !== frozen.settings.hash ||
		fit.matrix.seed !== frozen.seed.hash ||
		!isRecord(diagnosis) ||
		diagnosis.accepted !== true ||
		diagnosis.cutoff !== fit.agree ||
		diagnosis.change !== fit.change ||
		!Array.isArray(diagnosis.errors) ||
		diagnosis.errors.length !== 0 ||
		!isRecord(diagnosis.preparation) ||
		!arrayOf(isRefitFile)(Object.values(diagnosis.preparation)) ||
		!isRecord(fit.preparation) ||
		!isRefitFile(fit.preparation.manifest)
	)
		throw new Error('directed transfer changes fixed matrix calibration')
	const preparation = Object.values(diagnosis.preparation)
	if (!preparation.every(isRefitFile)) throw new Error('invalid calibration preparation')
	verifyDirectedFiles(preparation, archive)
	const generation = readJSON(fit.preparation.manifest.path)
	if (
		!isRefitGeneration(generation) ||
		!generation.complete ||
		generation.errors.length !== 0 ||
		!isDeepStrictEqual(generation.matrix?.files, historical.files) ||
		!isDeepStrictEqual(generation.matrix?.summarizer, frozen.summarizer) ||
		!isDeepStrictEqual(generation.matrix?.judge, frozen.judge)
	)
		throw new Error('directed calibration generation differs')
	verifyDirectedFiles([generation.evidence, generation.controls, ...generation.files], archive)
	const runtime = readRuntime(directed.runtime.path)
	readWorkload(directed.runtime)
	if (
		directed.limits.calls !== 4096 ||
		directed.limits.tokens !== 4000000 ||
		directed.limits.wall !== 28800000 ||
		directed.limits.goals !== 96 ||
		directed.limits.goals !== runtime.goals.length ||
		directed.limits.retries !== frozen.configuration.retry ||
		directed.limits.evidence.length === 0
	)
		throw new Error('directed prospective limits or complete horizon differ')
	return { directed, frozen }
}

/** Measures retained preparation after its original identities have passed the transfer reader.
 * @param directed - Validated directed manifest
 * @returns Separate resource and generation costs without rerunning historical admission
 */
export function readDirectedPreparation(
	directed: SustainedDirected,
): readonly SustainedPreparation[] {
	const resource = readJSON(directed.transfer.resource.path)
	const fit = readJSON(directed.transfer.fit.path)
	if (
		!isMatrixResource(resource) ||
		!isRecord(fit) ||
		!isRecord(fit.preparation) ||
		!isRefitFile(fit.preparation.manifest)
	)
		throw new Error('invalid transferred preparation')
	const preparations: SustainedPreparation[] = resource.attempts.map((attempt) => {
		const requests = readRows(join(attempt.run, 'requests.jsonl'))
		const rows = readRows(join(attempt.run, 'rows.jsonl'))
		if (!requests.every(isMatrixRequest) || !rows.every(isMatrixRow))
			throw new Error('malformed historical resource measurements')
		return {
			identity: hashFile(join(attempt.run, 'run.json')).hash,
			phase: 'matrix',
			files: [directed.transfer.resource, ...attempt.files],
			costs: measureMatrixCosts({ path: attempt.run, rows, requests }),
			failures: attempt.failures,
		}
	})
	const generation = readJSON(fit.preparation.manifest.path)
	if (!isRefitGeneration(generation) || !isRefitFile(fit.preparation.attempts))
		throw new Error('missing transferred generation')
	const rows = readRows(fit.preparation.attempts.path)
	if (!rows.every(isRefitAttempt)) throw new Error('invalid transferred generation attempts')
	const measured = readRefitCosts(rows, generation)
	preparations.push({
		identity: fit.preparation.manifest.hash,
		phase: 'generation',
		files: [
			directed.transfer.fit,
			directed.transfer.diagnosis,
			fit.preparation.manifest,
			fit.preparation.attempts,
			generation.evidence,
			generation.controls,
			...generation.files,
		],
		costs: {
			metadata: { requests: 0, wall: 0 },
			wire: [
				...measured.wire,
				...measured.controls.map((cost) => ({ ...cost, phase: 'calibration' as const })),
			],
			judge: undefined,
			lineage: generation.lineage,
			elapsed: undefined,
			stage: 0,
			flush: 0,
		},
		failures: [...generation.errors, ...measured.failures],
	})
	return preparations
}
