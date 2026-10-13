import type { AggregateFailure } from '../types.js'
import type {
	RefitAttempt,
	RefitControl,
	RefitPreparation,
	RefitAssessment,
	RefitCosts,
	RefitContext,
	RefitCorpus,
	RefitDiagnosis,
	RefitEvidence,
	RefitFile,
	RefitGeneration,
	RefitItem,
	RefitLabels,
	RefitReading,
	RefitPopulation,
	RefitRecall,
} from './types.js'
import { createOllamaJudge } from '../../vendor/ollama/index.js'
import { arrayOf, isRecord, isString, isFiniteNumber } from '@orkestrel/contract'
import {
	isRefitAttempt,
	isRefitControl,
	isRefitSource,
	isRefitCorpus,
	isRefitGeneration,
	isRefitItem,
	isRefitLabels,
	isRefitEvidence,
	isRefitUsage,
	isRefitVerdict,
	isRefitPreparation,
} from './validators.js'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { AGREE_QUESTION, SUPPORT_REVISION } from '../aggregates/constants.js'
import {
	buildAgreeState,
	buildSupportPlan,
	reduceSupport,
	buildSummaryPrompt,
	checkProse,
	collectStaleTokens,
	renderSource,
} from '../aggregates/helpers.js'
import {
	HARNESS,
	SAMPLER,
	MICA_MODEL,
	MICA_SYSTEM,
	MICA_CONTEXT,
	MICA_CALIBRATION,
} from '../constants.js'
import { buildCacheKey, buildSummaryKey, computeDigest, readJSON, readRows } from '../helpers.js'
import { REFIT_GRID, REFIT_LIMITATION, REFIT_CONTROLS, REFIT_CONTROL_HASHES } from './constants.js'

/** Reads a file's exact SHA-256 identity.
 * @param path - The file
 * @returns Its path and byte hash
 */
export function hashFile(path: string): RefitFile {
	return { path, hash: createHash('sha256').update(readFileSync(path)).digest('hex') }
}

/** Refuses any changed lineage file.
 * @param files - Frozen file identities
 */
export function verifyFiles(files: readonly RefitFile[]): void {
	for (const file of files)
		if (hashFile(file.path).hash !== file.hash) throw new Error(`custody mismatch: ${file.path}`)
}

/** Refuses missing, foreign, duplicated, or inconsistent retained cache observations.
 * @param attempts - Actual generation observations
 * @param evidence - Immutable exact cache rows
 * @param manifest - Generation configuration and cache lineage
 * @param model - Configuration-bound judge identity
 */
export function verifyEvidence(
	attempts: readonly RefitAttempt[],
	evidence: RefitEvidence,
	manifest: RefitGeneration,
	model: string,
	controls: readonly RefitControl[] = [],
): void {
	const summaries = new Set<string>()
	const judgments = new Set<string>()
	for (const attempt of attempts) {
		if (attempt.prose !== undefined || attempt.error === undefined) {
			const entry = evidence.summary.find((one) => one.row.key === attempt.key)
			if (entry === undefined) throw new Error('missing observed summary row')
			const row = entry.row
			if (
				row.model !== manifest.model ||
				!isDeepStrictEqual(row.sampler, SAMPLER) ||
				row.predict !== manifest.settings.predict ||
				row.key !== buildSummaryKey(row, attempt.prompt) ||
				row.prose !== attempt.prose ||
				row.raw !== attempt.raw ||
				row.wall !== attempt.duration ||
				!isDeepStrictEqual(row.usage, attempt.usage)
			)
				throw new Error('summary observation mismatch')
			summaries.add(row.key)
		}
	}
	for (const bundle of [
		...attempts.flatMap((attempt) => (attempt.judge === undefined ? [] : [attempt.judge])),
		...controls.flatMap((control) => (control.support === undefined ? [] : [control.support])),
	]) {
		if (bundle.model !== model) throw new Error('judge model mismatch')
		for (const component of bundle.components) {
			const entry = evidence.judge.find((one) => one.row.key === component.key)
			if (entry === undefined) {
				if (component.error === undefined) throw new Error('missing observed judge row')
				continue
			}
			const row = entry.row
			if (
				row.model !== model ||
				row.context !== bundle.context ||
				row.state !== component.state ||
				!isDeepStrictEqual(row.question, component.question) ||
				row.key !== buildCacheKey(model, row.state, row.question, bundle.context) ||
				(component.error === undefined &&
					(row.error !== undefined || row.refusal !== undefined || row.answer?.form !== 'noul')) ||
				(row.answer?.form === 'noul' ? row.answer.noul : undefined) !== component.score ||
				!isDeepStrictEqual(row.usage, component.usage) ||
				!isDeepStrictEqual(row.refusal, component.refusal)
			)
				throw new Error('judge observation mismatch')
			judgments.add(row.key)
		}
	}

	if (summaries.size !== evidence.summary.length || judgments.size !== evidence.judge.length)
		throw new Error('cache observation membership mismatch')
	for (const entry of [...evidence.summary, ...evidence.judge])
		if (!manifest.lineage.after.some((file) => resolve(file.path) === resolve(entry.path)))
			throw new Error('missing observed cache lineage')
}

/** Refuses malformed source grouping, duplicated occurrences, or prompt/checker drift.
 * @param corpus - The frozen corpus
 */
export function verifyCorpus(corpus: RefitCorpus): void {
	if (corpus.contexts.length === 0 || corpus.points.length === 0) throw new Error('empty corpus')
	const ids = new Set<string>()
	for (const context of corpus.contexts) {
		if (ids.has(context.id)) throw new Error('duplicate context')
		ids.add(context.id)
		if (!corpus.points.some((point) => point.goal === context.goal))
			throw new Error('missing request point')
		if (context.sources.length === 0) throw new Error('empty source group')
		const groups = new Map<string, number>()
		for (const source of context.sources) {
			if (groups.has(source.id) && groups.get(source.id) !== source.seed)
				throw new Error('source grouping mismatch')
			groups.set(source.id, source.seed)
		}
		if (
			!isDeepStrictEqual(
				context.prompt,
				buildSummaryPrompt(context.topic.key, context.topic.title, context.date, context.sources),
			)
		)
			throw new Error('frozen prompt mismatch')
		if (
			!isDeepStrictEqual(
				context.stale,
				collectStaleTokens(
					[],
					context.listed,
					context.sources.map((source) => source.text),
				),
			)
		)
			throw new Error('frozen stale context mismatch')
	}
}

/** Builds one blinded item while retaining original message ids as opaque grouping keys.
 * @param attempt - The attempted draft
 * @param context - Its frozen source occurrence
 * @returns The score-free packet item
 */
export function buildRefitItem(attempt: RefitAttempt, context: RefitContext): RefitItem {
	return {
		id: attempt.id,
		revision: SUPPORT_REVISION,
		candidate: attempt.prose ?? '',
		components:
			(attempt.prose ?? '').trim() === ''
				? []
				: buildSupportPlan(attempt.prose ?? '', context.sources).components,
		question: AGREE_QUESTION,
		state: buildAgreeState({ prose: attempt.prose ?? '' }, context.sources),
		sources: context.sources,
	}
}

/** Checks label custody and an exact item-to-label bijection.
 * @param packet - Blinded items
 * @param labels - Root's labels
 */
export function verifyLabels(packet: readonly RefitItem[], labels: RefitLabels): void {
	const ids = new Set(packet.map((item) => item.id))
	if (ids.size !== packet.length || labels.labels.length !== packet.length)
		throw new Error('incomplete label coverage')
	const seen = new Set<string>()
	for (const label of labels.labels) {
		const item = packet.find((candidate) => candidate.id === label.id)
		if (seen.has(label.id) || item === undefined || computeDigest(item) !== label.item)
			throw new Error('label bijection or item hash mismatch')
		seen.add(label.id)
		if (
			label.verdict === 'supported' &&
			label.propositions.some((proposition) => proposition.verdict !== 'supported')
		)
			throw new Error('unsupported proposition in positive label')
		for (const proposition of label.propositions)
			for (const quote of proposition.evidence) {
				if (quote.length === 0 || !item.sources.map(renderSource).join('\n').includes(quote))
					throw new Error('label quotation absent from item')
			}
	}
}

/** Computes conditional judge recall and end-to-end admission separately.
 * @param readings - Audited generated or control records
 * @param cutoff - Candidate cutoff
 * @returns Generated supported population readings, retaining lexical failures
 */
export function measureRecall(readings: readonly RefitReading[], cutoff: number): RefitRecall {
	const supported = readings.filter(
		(reading) => reading.generated && reading.verdict === 'supported',
	)
	const scored = supported.filter((reading) => reading.lexical && reading.score !== undefined)
	const admitted = scored.filter(
		(reading) => reading.score !== undefined && reading.score >= cutoff,
	).length
	return {
		supported: supported.length,
		scored: scored.length,
		admitted,
		conditional: scored.length === 0 ? 0 : admitted / scored.length,
		admission: supported.length === 0 ? 0 : admitted / supported.length,
	}
}

/** Selects the lowest retained cutoff rejecting all scored negatives and ambiguities.
 * @param readings - Audited semantic and operational records
 * @param errors - Custody or cost failures that independently refuse preparation
 * @returns A diagnosis; an accepted result alone permits writing a fit
 */
export function fitReadings(
	readings: readonly RefitReading[],
	errors: readonly string[] = [],
): RefitDiagnosis {
	const reasons = [...errors]
	const negatives = readings.filter(
		(reading) => reading.verdict !== 'supported' && reading.score !== undefined,
	)
	const cutoff = REFIT_GRID.find((candidate) =>
		negatives.every((reading) => reading.score !== undefined && reading.score < candidate),
	)
	if (cutoff === undefined) reasons.push('no cutoff rejects every scored negative and ambiguity')
	if (readings.some((reading) => reading.lexical && reading.score === undefined))
		reasons.push('missing required score')
	if (
		readings.some(
			(reading) =>
				reading.score !== undefined &&
				(!Number.isFinite(reading.score) || reading.score < 0 || reading.score > 1),
		)
	)
		reasons.push('invalid score')
	const occurrences = measureRecall(readings, cutoff ?? 1)
	const identities = collectRefitIdentities(readings)
	reasons.push(...identities.errors)
	const distinct = measureRecall(identities.readings, cutoff ?? 1)
	if (occurrences.supported === 0) reasons.push('absent supported generated population')
	if (occurrences.admission < 0.5) reasons.push('end-to-end admission below 0.5')
	return {
		accepted: reasons.length === 0,
		cutoff,
		reasons: [...new Set(reasons)],
		occurrences,
		distinct,
		readings,
		change: 0.56,
		limitation: REFIT_LIMITATION,
	}
}

/** Rechecks lexical evidence and builds immutable readings from independently labeled attempts.
 * @param attempts - All attempted drafts
 * @param contexts - Every source occurrence
 * @param labels - Verified independent labels
 * @returns One reading for every attempt
 */
export function collectReadings(
	attempts: readonly RefitAttempt[],
	contexts: readonly RefitContext[],
	labels: RefitLabels,
): readonly RefitReading[] {
	return attempts.map((attempt) => {
		const context = contexts.find((one) => one.id === attempt.context)
		const label = labels.labels.find((one) => one.id === attempt.id)
		if (context === undefined || label === undefined)
			throw new Error('attempt lacks source or label')
		const failures = checkProse(
			attempt.prose ?? '',
			[...context.sources.map(renderSource), context.topic.title, context.date],
			context.owners,
			context.stale,
		)
		if (attempt.failures !== undefined && !isDeepStrictEqual(failures, attempt.failures))
			throw new Error('lexical evidence mismatch')
		if (
			attempt.judge !== undefined &&
			(attempt.judge.candidate !== attempt.prose ||
				!isDeepStrictEqual(attempt.judge.sources, context.sources))
		)
			throw new Error('support candidate/source mismatch')
		return {
			id: attempt.id,
			identity: computeDigest([
				AGREE_QUESTION,
				buildAgreeState({ prose: attempt.prose ?? '' }, context.sources),
				context.sources.map(({ seed, sentence }) => [seed, sentence]),
			]),
			generated: true,
			verdict: label.verdict,
			lexical: failures.length === 0,
			score: attempt.judge === undefined ? undefined : reduceSupport(attempt.judge),
		}
	})
}

/** Reads the fixed archived semantic controls and verifies their source custody.
 * @param controls - Archived control directory
 * @returns Independently adjudicated control readings
 */
export function readRefitControls(controls: string): readonly RefitControl[] {
	for (const [name, hash] of Object.entries(REFIT_CONTROL_HASHES))
		if (hashFile(join(controls, name)).hash !== hash)
			throw new Error(`archived control custody mismatch: ${name}`)
	const adjudication = readJSON(join(controls, 'adjudication.json'))
	const packet = readRows(join(controls, 'packet.jsonl'))
	const mapping = readRows(join(controls, 'mapping.jsonl'))
	if (
		!isRecord(adjudication) ||
		!Array.isArray(adjudication.rows) ||
		adjudication.rows.length !== 12 ||
		packet.length !== 12 ||
		mapping.length !== 12
	)
		throw new Error('incomplete archived controls')
	return adjudication.rows.map((row: unknown) => {
		if (!isRecord(row) || !isString(row.id)) throw new Error('invalid archived verdict')
		const verdict = row.verdict === 'genuinely ambiguous' ? 'ambiguous' : row.verdict
		if (!isRefitVerdict(verdict)) throw new Error('invalid archived verdict')
		const item = packet.find((candidate) => isRecord(candidate) && candidate.id === row.id)
		const mapped = mapping.find((candidate) => isRecord(candidate) && candidate.id === row.id)
		if (
			!isRecord(item) ||
			!isRecord(mapped) ||
			!isString(item.state) ||
			!arrayOf(isRefitSource)(mapped.sources)
		)
			throw new Error('missing archived source mapping')
		const score = typeof row.score === 'number' ? row.score : undefined
		if (
			!isRecord(mapped.input) ||
			!Array.isArray(mapped.input.files) ||
			!isRecord(mapped.original) ||
			!Number.isInteger(mapped.original.index) ||
			typeof mapped.original.index !== 'number'
		)
			throw new Error('missing archived build custody')
		const file: unknown = mapped.input.files.find(
			(candidate: unknown) =>
				isRecord(candidate) &&
				isString(candidate.path) &&
				candidate.path.endsWith('/aggregates.jsonl'),
		)
		if (!isRecord(file) || !isString(file.path) || !isString(file.sha256))
			throw new Error('missing archived build path')
		const path = resolve(HARNESS, '../../../..', file.path)
		if (hashFile(path).hash !== file.sha256) throw new Error('archived build file custody mismatch')
		const build = readRows(path)[mapped.original.index]
		if (
			!isRecord(build) ||
			!isString(build.prose) ||
			!Array.isArray(build.failures) ||
			computeDigest(build) !== mapped.input.row
		)
			throw new Error('archived build row custody mismatch')
		const lexical = build.failures.every(
			(failure: unknown) => isRecord(failure) && failure.kind === 'agree',
		)
		if (isRecord(mapped.original.score) && mapped.original.score.agree !== score)
			throw new Error('archived score mismatch')
		if (
			item.state !==
			build.prose + '\nSource messages:\n' + mapped.sources.map(renderSource).join('\n')
		)
			throw new Error('archived semantic input mismatch')
		return {
			id: row.id,
			candidate: build.prose,
			sources: mapped.sources,
			verdict,
			lexical,
			original: {
				item: computeDigest(item),
				mapping: computeDigest(mapped),
				build: computeDigest(build),
			},
		}
	})
}

/** Recomputes fitting from its bound generation and independent labels.
 * @param preparation - Exact input references
 * @param controls - Verified archived readings
 * @returns The recomputed diagnosis
 */
export function computeRefitAssessment(
	preparation: RefitPreparation,
	controls: readonly RefitControl[],
): RefitAssessment {
	verifyFiles(Object.values(preparation))
	const manifest = readJSON(preparation.manifest.path)
	const corpus = readJSON(preparation.corpus.path)
	const attempts = readRows(preparation.attempts.path)
	const packet = readRows(preparation.packet.path)
	const labels = readJSON(preparation.labels.path)
	if (
		!isRefitGeneration(manifest) ||
		!isRefitCorpus(corpus) ||
		!arrayOf(isRefitAttempt)(attempts) ||
		!arrayOf(isRefitItem)(packet) ||
		!isRefitLabels(labels)
	)
		throw new Error('invalid generation or root label contract')
	if (
		labels.manifest !== preparation.manifest.hash ||
		manifest.corpus !== preparation.corpus.hash ||
		labels.corpus !== preparation.corpus.hash ||
		manifest.attempts !== preparation.attempts.hash ||
		labels.attempts !== preparation.attempts.hash ||
		manifest.packet !== preparation.packet.hash ||
		labels.packet !== preparation.packet.hash
	)
		throw new Error('corpus/attempt/packet/manifest custody mismatch')
	if (!isDeepStrictEqual(manifest.sustained, corpus.sustained))
		throw new Error('development corpus transfer identity differs')
	verifyCorpus(corpus)
	verifyFiles([...manifest.files, ...corpus.files, manifest.evidence, manifest.controls])
	if (
		resolve(manifest.evidence.path) !== resolve(dirname(preparation.manifest.path), 'evidence.json')
	)
		throw new Error('retained evidence path mismatch')
	if (
		resolve(manifest.controls.path) !==
		resolve(dirname(preparation.manifest.path), 'controls.jsonl')
	)
		throw new Error('retained control path mismatch')
	const evidence = readJSON(manifest.evidence.path)
	if (!isRefitEvidence(evidence)) throw new Error('invalid retained cache evidence')
	const observed = readRows(manifest.controls.path)
	if (!arrayOf(isRefitControl)(observed)) throw new Error('invalid fresh control evidence')
	const controlReadings = collectControlReadings(controls, observed)
	verifyEvidence(
		attempts,
		evidence,
		manifest,
		createOllamaJudge({
			model: MICA_MODEL,
			system: MICA_SYSTEM,
			calibration: { temperature: MICA_CALIBRATION },
			options: { num_ctx: MICA_CONTEXT },
		}).model,
		observed,
	)
	verifyLabels(packet, labels)
	if (
		attempts.length !== packet.length ||
		new Set(attempts.map((attempt) => attempt.id)).size !== attempts.length
	)
		throw new Error('attempt-to-packet bijection mismatch')
	const errors = [...manifest.errors]
	if (!manifest.complete) errors.push('incomplete generation')
	for (const context of corpus.contexts) {
		const rows = attempts.filter((attempt) => attempt.context === context.id)
		if (rows.length === 0 || rows.length > manifest.settings.retry + 1)
			throw new Error('attempt coverage mismatch')
		let failures: readonly AggregateFailure[] = []
		for (const [ordinal, attempt] of rows.entries()) {
			if (ordinal > 0 && failures.length === 0)
				throw new Error('generation continued after lexical success')
			if (
				attempt.ordinal !== ordinal ||
				!isDeepStrictEqual(
					attempt.prompt,
					buildSummaryPrompt(
						context.topic.key,
						context.topic.title,
						context.date,
						context.sources,
						failures,
					),
				)
			)
				throw new Error('attempt prompt sequence mismatch')
			if (
				attempt.key !==
				buildSummaryKey(
					{ model: manifest.model, sampler: SAMPLER, predict: manifest.settings.predict },
					attempt.prompt,
				)
			)
				throw new Error('summary cache identity mismatch')
			const item = packet.find((one) => one.id === attempt.id)
			if (!isDeepStrictEqual(item, buildRefitItem(attempt, context)))
				throw new Error('attempt/source/packet mismatch')
			if (
				attempt.state !== undefined &&
				attempt.state !== buildAgreeState({ prose: attempt.prose ?? '' }, context.sources)
			)
				throw new Error('attempt state mismatch')
			if (attempt.error !== undefined || !isRefitUsage(attempt.usage))
				errors.push('failed call or missing summary costs')
			if (!isFiniteNumber(attempt.duration) || attempt.duration < 0)
				errors.push('summary duration missing or invalid')
			failures = attempt.failures ?? []
			if (
				failures.length === 0 &&
				(attempt.judge === undefined ||
					reduceSupport(attempt.judge) === undefined ||
					attempt.judge.components.some((component) => !isRefitUsage(component.usage)))
			)
				errors.push('missing judge costs or required score')
		}
		if (failures.length > 0 && rows.length !== manifest.settings.retry + 1)
			errors.push('incomplete lexical retry sequence')
	}
	if (
		attempts.some((attempt) => !corpus.contexts.some((context) => context.id === attempt.context))
	)
		throw new Error('foreign attempt context')
	return {
		...fitReadings(
			[...collectReadings(attempts, corpus.contexts, labels), ...controlReadings],
			errors,
		),
		errors: [...new Set(errors)],
		preparation,
		custody: {
			corpus: preparation.corpus.hash,
			attempts: preparation.attempts.hash,
			packet: preparation.packet.hash,
			manifest: preparation.manifest.hash,
			labels: preparation.labels,
			controls: REFIT_CONTROL_HASHES,
		},
	}
}

/** Verifies a retained diagnosis against the original fixed fitting engine.
 * @param reference - Emitted diagnosis
 * @returns The recomputed assessment with verified input custody
 */
export function readRefitAssessment(reference: RefitFile): RefitAssessment {
	verifyFiles([reference])
	const value = readJSON(reference.path)
	if (!isRecord(value) || !isRefitPreparation(value.preparation))
		throw new Error('reproducible refit diagnosis required')
	const expected = computeRefitAssessment(value.preparation, readRefitControls(REFIT_CONTROLS))
	if (!isDeepStrictEqual(value, JSON.parse(JSON.stringify(expected))))
		throw new Error('refit diagnosis contradicts bound evidence')
	return expected
}

/** Derives the highest declared grid cutoff admitting supported occurrences and identities.
 * @param assessment - The fully recomputed assessment
 * @returns The cutoff whose supported occurrence and identity admissions each reach one half, or absence when no grid member qualifies
 */
export function selectMajorityCutoff(assessment: RefitAssessment): number | undefined {
	if (assessment.errors.length !== 0)
		throw new Error('operational preparation failure cannot admit exploration')
	for (const reading of assessment.readings) {
		if (
			(reading.lexical && reading.score === undefined) ||
			(reading.score !== undefined &&
				(!Number.isFinite(reading.score) || reading.score < 0 || reading.score > 1))
		)
			throw new Error('exploratory calibration has missing or invalid scores')
	}
	const identities = collectRefitIdentities(assessment.readings)
	if (identities.errors.length !== 0)
		throw new Error('exploratory calibration has inconsistent duplicate identity')
	const cutoff = REFIT_GRID.findLast(
		(candidate) =>
			measureRecall(assessment.readings, candidate).admission >= 0.5 &&
			measureRecall(identities.readings, candidate).admission >= 0.5,
	)
	return cutoff
}

/** Collects distinct support identities with the strict fitting engine's consistency rule.
 * @param readings - The generated and archived support readings
 * @returns The retained identity population and consistency errors
 */
export function collectRefitIdentities(readings: readonly RefitReading[]): RefitPopulation {
	const identities = new Map<string, RefitReading>()
	const errors: string[] = []
	for (const reading of readings) {
		const previous = identities.get(reading.identity)
		if (
			previous !== undefined &&
			(previous.verdict !== reading.verdict ||
				previous.lexical !== reading.lexical ||
				previous.score !== reading.score)
		)
			errors.push('inconsistent duplicate identity')
		else identities.set(reading.identity, reading)
	}
	return { readings: [...identities.values()], errors }
}

/** Measures only fresh sent requests and reports unmeasured historical boundaries.
 * @param rows - Retained generation attempts
 * @returns Per-role wire costs and measurement limitations
 */
export function measureRefitCosts(
	rows: readonly RefitAttempt[],
	controls: readonly RefitControl[] = [],
): RefitCosts {
	const failures: string[] = []
	const wire = ['summarizer', 'judge'].map((role) => {
		const attempts = rows.flatMap((row) =>
			role === 'judge'
				? (row.judge?.components ?? []).map((component) => ({
						sent: component.sent,
						cached: component.cached,
						usage: component.usage,
						wall: component.wall,
					}))
				: [
						{
							sent: row.sent,
							cached: row.cached,
							usage: row.usage,
							wall: row.duration ?? row.wall,
						},
					],
		)
		if (attempts.some((entry) => entry.sent === undefined))
			failures.push(role + ' request boundary unmeasured in historical evidence')
		if (attempts.some((entry) => entry.sent === true && entry.cached === true))
			throw new Error('sent refit request contradicts cache replay')
		const fresh = attempts.filter((entry) => entry.sent === true && entry.cached !== true)
		return {
			phase: 'trajectory' as const,
			role,
			requests: fresh.length,
			wall: fresh.reduce((total, one) => total + one.wall, 0),
			prompt: fresh.reduce((total, one) => total + (one.usage?.prompt ?? 0), 0),
			completion: fresh.reduce((total, one) => total + (one.usage?.completion ?? 0), 0),
			missing: fresh.filter((one) => one.usage === undefined).length,
		}
	})
	const components = controls.flatMap((control) => control.support?.components ?? [])
	const fresh = components.filter((component) => component.sent === true && !component.cached)
	if (components.some((component) => component.sent === undefined))
		failures.push('control request boundary unmeasured')
	if (components.some((component) => component.sent === true && component.cached))
		throw new Error('sent control request contradicts cache replay')
	return {
		wire,
		failures,
		controls: [
			{
				role: 'judge',
				requests: fresh.length,
				wall: fresh.reduce((sum, component) => sum + component.wall, 0),
				prompt: fresh.reduce((sum, component) => sum + (component.usage?.prompt ?? 0), 0),
				completion: fresh.reduce((sum, component) => sum + (component.usage?.completion ?? 0), 0),
				missing: fresh.filter((component) => component.usage === undefined).length,
			},
		],
		replay: [...rows.flatMap((row) => row.judge?.components ?? []), ...components].filter(
			(component) => component.cached,
		).length,
	}
}

/** Reads generation-bound control costs separately from draft preparation costs.
 * @param rows - Retained generated attempts
 * @param manifest - Exact generation manifest
 * @returns Component expenditure and cache replay counts
 */
export function readRefitCosts(
	rows: readonly RefitAttempt[],
	manifest: RefitGeneration,
): RefitCosts {
	verifyFiles([manifest.controls])
	const controls = readRows(manifest.controls.path)
	if (!arrayOf(isRefitControl)(controls)) throw new Error('invalid control cost evidence')
	return measureRefitCosts(rows, controls)
}

/** Verifies the exact archived-label bijection and recomputes fresh control minima.
 * @param archived - Custody-checked immutable controls
 * @param observed - Separately retained successor evaluations
 * @returns Whole-candidate readings; no historical score enters fitting
 */
export function collectControlReadings(
	archived: readonly RefitControl[],
	observed: readonly RefitControl[],
): readonly RefitReading[] {
	if (
		archived.length !== 12 ||
		observed.length !== archived.length ||
		new Set(observed.map((control) => control.id)).size !== archived.length
	)
		throw new Error('incomplete fresh control membership')
	return archived.map((control) => {
		const current = observed.find((one) => one.id === control.id)
		if (current === undefined) throw new Error('missing fresh control')
		const { support, ...input } = current
		if (!isDeepStrictEqual(input, control))
			throw new Error('archived control semantic bijection mismatch')
		if (
			support !== undefined &&
			(support.candidate !== control.candidate ||
				!isDeepStrictEqual(support.sources, control.sources))
		)
			throw new Error('fresh control source/candidate mismatch')
		if (
			control.lexical &&
			(support === undefined ||
				reduceSupport(support) === undefined ||
				support.components.some((component) => !isRefitUsage(component.usage)))
		)
			throw new Error('missing fresh eligible control evidence')
		if (!control.lexical && support !== undefined)
			throw new Error('lexically ineligible control was scored')
		return {
			id: control.id,
			identity: computeDigest([control.candidate, control.sources]),
			generated: false,
			verdict: control.verdict,
			lexical: control.lexical,
			score: support === undefined ? undefined : reduceSupport(support),
		}
	})
}
