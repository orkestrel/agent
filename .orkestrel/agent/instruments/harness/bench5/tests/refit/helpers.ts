import { Driver, parseFlags } from '../../Driver.js'
import { Matrix } from '../../matrix/Matrix.js'
import { Refit } from '../../refit/Refit.js'
import { MatrixPeer } from '../matrixFixture.js'
import { isMatrixResource } from '../../matrix/validators.js'
import { buildSupportRows } from '../support/helpers.js'
import type { MatrixDevelopment } from '../../matrix/types.js'
import { readFrozen, readResource } from '../../matrix/helpers.js'
import type { EvidenceCase, MembershipCase } from './types.js'
import type {
	RefitAttempt,
	RefitContext,
	RefitCorpus,
	RefitEvidence,
	RefitGeneration,
	RefitLabels,
	RefitOptions,
	RefitVerdict,
} from '../../refit/types.js'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createOllamaJudge } from '../../../vendor/ollama/index.js'
import { AGREE_QUESTION } from '../../aggregates/constants.js'
import {
	COPIES_DIR,
	HARNESS,
	MODELS,
	SAMPLER,
	MICA_MODEL,
	MICA_SYSTEM,
	MICA_CALIBRATION,
	MICA_CONTEXT,
} from '../../constants.js'
import { buildSummaryKey, computeDigest, readJSON, readRows } from '../../helpers.js'
import { REFIT_CONTROLS } from '../../refit/constants.js'
import {
	buildRefitItem,
	hashFile,
	readRefitControls,
	readRefitAssessment,
	selectMajorityCutoff,
} from '../../refit/helpers.js'
import {
	isRefitAttempt,
	isRefitControl,
	isRefitCorpus,
	isRefitGeneration,
	isRefitItem,
} from '../../refit/validators.js'

/** Writes fresh calibration and actual cell resource/full evidence through existing operators. */
export async function writeDevelopmentFixture(
	directory: string,
	frozenPath: string,
	withhold?: boolean,
): Promise<MatrixDevelopment> {
	const peer = new MatrixPeer()
	peer.support = true
	peer.agreement = 0.75
	const url = await peer.start()
	try {
		const frozen = readFrozen(hashFile(frozenPath))
		const resourcePath = join(directory, 'admission-resource')
		if (
			(await Matrix.execute([
				'resource',
				'--frozen',
				frozenPath,
				'--out',
				resourcePath,
				'--live',
				'--url',
				url,
			])) !== 0
		)
			throw new Error('fixture resource preparation failed')
		const resource = readResource(
			hashFile(join(resourcePath, 'manifest.json')),
			hashFile(frozenPath),
		)
		const attempt = resource.attempts.at(-1)
		if (attempt === undefined || resource.budget === undefined)
			throw new Error('fixture resource evidence missing')
		const cache = join(directory, 'admission-seed-cache')
		mkdirSync(cache)
		writeFileSync(join(cache, 'judge.jsonl'), readFileSync(frozen.seed.path))
		const fullPath = join(directory, 'admission-full')
		await Matrix.execute([
			'full',
			'--frozen',
			frozenPath,
			'--resource',
			join(resourcePath, 'manifest.json'),
			'--out',
			fullPath,
			'--live',
			'--url',
			url,
		])
		const corpus = join(directory, 'admission-corpus')
		const generation = join(directory, 'admission-generation')
		const common = ['--frozen', frozenPath, '--model', frozen.summarizer.model]
		if ((await Refit.run(['freeze', ...common, '--cache', cache, '--out', corpus])) !== 0)
			throw new Error('fixture corpus freeze failed')
		if (
			(await Refit.run([
				'generate',
				...common,
				'--corpus',
				corpus,
				'--cache',
				join(directory, 'admission-generation-cache'),
				'--out',
				generation,
				'--live',
				'--url',
				url,
			])) !== 0
		)
			throw new Error('fixture generation failed')
		const manifest = readJSON(join(generation, 'manifest.json'))
		const packet = readRows(join(generation, 'packet.jsonl'))
		if (!isRefitGeneration(manifest) || !packet.every(isRefitItem))
			throw new Error('fixture generation malformed')
		const labels = join(directory, 'admission-labels.json')
		writeFileSync(
			labels,
			JSON.stringify({
				authority: 'root-adjudicated',
				corpus: manifest.corpus,
				attempts: manifest.attempts,
				packet: manifest.packet,
				manifest: hashFile(join(generation, 'manifest.json')).hash,
				labels: packet.map((item) => ({
					id: item.id,
					item: computeDigest(item),
					verdict: 'supported',
					propositions: [
						{ text: item.candidate, verdict: 'supported', evidence: [item.sources[0]?.text ?? ''] },
					],
				})),
			}),
		)
		const fitted = join(directory, 'admission-fit')
		if (
			(await Refit.run([
				'fit',
				...common,
				'--corpus',
				corpus,
				'--attempts',
				generation,
				'--labels',
				labels,
				'--out',
				fitted,
			])) !== 3
		)
			throw new Error('fixture must retain a strict calibration refusal')
		const diagnosis = hashFile(join(fitted, 'diagnosis.json'))
		const agree = selectMajorityCutoff(readRefitAssessment(diagnosis))
		if (agree === undefined) throw new Error('fixture exploratory cutoff absent')
		const full = readJSON(join(fullPath, 'manifest.json'))
		if (!isMatrixResource(full) || full.attempts[0] === undefined)
			throw new Error('fixture full evidence absent')
		return {
			phase: 'development',
			frozen: hashFile(frozenPath),
			calibration: hashFile(frozenPath),
			diagnosis,
			labels: hashFile(labels),
			packet: hashFile(join(generation, 'packet.jsonl')),
			generation: hashFile(join(generation, 'manifest.json')),
			resource: hashFile(join(resourcePath, 'manifest.json')),
			full: hashFile(join(fullPath, 'manifest.json')),
			agree,
			change: 0.56,
			selection: 'highest-grid-majority-occurrences-and-identities',
			continuation: 'failed-goal-after-xml-function-parameter-error',
			...(withhold === undefined ? {} : { withhold }),
			limitation: 'seed-candidates-do-not-certify-diverged-history',
			paired: resource.budget,
			expanded: full.attempts[0].budget,
		}
	} finally {
		await peer.destroy()
	}
}

/** Writes real seed classification before the cell freeze binds its immutable bytes. */
export async function writeDevelopmentSeed(directory: string, path: string): Promise<void> {
	const peer = new MatrixPeer()
	peer.support = true
	peer.agreement = 0.75
	const url = await peer.start()
	try {
		const cache = join(directory, 'seed-preparation-cache')
		const config = parseFlags([
			'--seed',
			'--live',
			'--copy',
			'1',
			'--fixture',
			'--cache',
			cache,
			'--out',
			join(directory, 'seed-preparation'),
			'--url',
			url,
		])
		if (!config.success) throw new Error(config.error)
		await new Driver(config.value).execute()
		writeFileSync(path, readFileSync(join(cache, 'judge.jsonl')), { flag: 'wx' })
	} finally {
		await peer.destroy()
	}
}

/** Reads the separately retained whole-control observations. */
export function readControls(path: string) {
	return readRows(join(path, 'controls.jsonl')).map((value) => {
		if (!isRefitControl(value)) throw new Error('invalid test control')
		return value
	})
}

/** Seeds current component observations without reusing archived scalar scores. */
export function writeControlCache(path: string): void {
	mkdirSync(path)
	const model = createOllamaJudge({
		model: MICA_MODEL,
		system: MICA_SYSTEM,
		calibration: { temperature: MICA_CALIBRATION },
		options: { num_ctx: MICA_CONTEXT },
	}).model
	writeFileSync(
		join(path, 'judge.jsonl'),
		readRefitControls(REFIT_CONTROLS)
			.flatMap((control) =>
				control.lexical
					? buildSupportRows(
							model,
							control.candidate,
							control.sources,
							control.verdict === 'supported' ? 1 : 0.77,
						)
					: [],
			)
			.map((row) => JSON.stringify(row))
			.join('\n') + '\n',
	)
}

/** Builds explicit command options for isolated fixtures. */
export function buildOptions(out: string, overrides: Partial<RefitOptions> = {}): RefitOptions {
	return {
		phase: 'freeze',
		out,
		cache: join(HARNESS, '..', 'results', 'l5', 'pilot-resumption', 'cache'),
		corpus: '',
		attempts: '',
		labels: '',
		controls: REFIT_CONTROLS,
		scenario: join(COPIES_DIR, 'v1.json'),
		settings: join(HARNESS, 'bench5', 'settings.json'),
		model: MODELS.q2,
		url: 'http://127.0.0.1:9',
		live: false,
		...overrides,
	}
}

/** Reads a typed corpus after the command writes it. */
export function readCorpus(path: string): RefitCorpus {
	const value = readJSON(join(path, 'corpus.json'))
	if (!isRefitCorpus(value)) throw new Error('invalid test corpus')
	return value
}

/** Writes a single real projected context as an isolated fixture corpus. */
export function writeCorpus(path: string, corpus: RefitCorpus, context: RefitContext): void {
	mkdirSync(path)
	writeFileSync(
		join(path, 'corpus.json'),
		JSON.stringify({
			...corpus,
			contexts: [context],
			points: corpus.points.filter((point) => point.goal === context.goal),
		}),
	)
	writeFileSync(
		join(path, 'manifest.json'),
		JSON.stringify({ corpus: hashFile(join(path, 'corpus.json')).hash }),
	)
}

/** Reads all attempt rows and refuses a malformed test journal. */
export function readAttempts(path: string): readonly RefitAttempt[] {
	return readRows(join(path, 'attempts.jsonl')).map((value) => {
		if (!isRefitAttempt(value)) throw new Error('invalid test attempt')
		return value
	})
}

/** Writes the review's exact cached summary and AGREE observations without a service request. */
export function writeCache(
	path: string,
	context: RefitContext,
	duration: number | undefined,
): void {
	mkdirSync(path)
	const prose = context.sources[0]?.text ?? ''
	const model = createOllamaJudge({
		model: MICA_MODEL,
		system: MICA_SYSTEM,
		calibration: { temperature: MICA_CALIBRATION },
		options: { num_ctx: MICA_CONTEXT },
	}).model
	writeFileSync(
		join(path, 'summary.jsonl'),
		JSON.stringify({
			key: buildSummaryKey({ model: MODELS.q2, sampler: SAMPLER, predict: 160 }, context.prompt),
			model: MODELS.q2,
			sampler: SAMPLER,
			predict: 160,
			prose,
			raw: prose,
			usage: { prompt: 20, completion: 10, total: 30 },
			wall: duration,
			origin: 'live',
			at: 1,
		}).replace('"wall":null', duration === Infinity ? '"wall":1e400' : '"wall":null') + '\n',
	)
	writeFileSync(
		join(path, 'judge.jsonl'),
		[
			...buildSupportRows(model, prose, context.sources, 1),
			...readRefitControls(REFIT_CONTROLS).flatMap((control) =>
				control.lexical
					? buildSupportRows(
							model,
							control.candidate,
							control.sources,
							control.verdict === 'supported' ? 1 : 0.77,
						)
					: [],
			),
		]
			.map((row) => JSON.stringify(row))
			.join('\n') + '\n',
	)
}

/** Writes inert root labels for deterministic fitting tests. */
export function writeLabels(
	path: string,
	attempts: string,
	context: RefitContext,
	verdict: RefitVerdict = 'supported',
): RefitLabels {
	const manifest = readJSON(join(attempts, 'manifest.json'))
	if (!isRefitGeneration(manifest)) throw new Error('invalid generation manifest')
	const labels: RefitLabels = {
		authority: 'root-adjudicated',
		corpus: manifest.corpus,
		attempts: manifest.attempts,
		packet: manifest.packet,
		manifest: hashFile(join(attempts, 'manifest.json')).hash,
		labels: readAttempts(attempts).map((attempt) => ({
			id: attempt.id,
			item: computeDigest(buildRefitItem(attempt, context)),
			verdict,
			propositions: [
				{
					text: attempt.prose ?? '',
					verdict,
					evidence: [context.sources[0]?.text ?? AGREE_QUESTION.instructions ?? ''],
				},
			],
		})),
	}
	writeFileSync(path, JSON.stringify(labels))
	return labels
}

/** Builds missing, altered, and duplicated cache observations. */
export function buildEvidenceCases(evidence: RefitEvidence): readonly EvidenceCase[] {
	return [
		['deleted-judge', { ...evidence, judge: [] }, false],
		[
			'changed-record-time',
			{
				...evidence,
				summary: evidence.summary.map((entry) => ({
					...entry,
					row: { ...entry.row, at: entry.row.at + 1 },
				})),
			},
			false,
		],
		[
			'changed-summary',
			{
				...evidence,
				summary: evidence.summary.map((entry) => ({
					...entry,
					row: { ...entry.row, raw: 'changed raw observation' },
				})),
			},
			false,
		],
		['missing-summary', { ...evidence, summary: [] }, true],
		['missing-judge', { ...evidence, judge: [] }, true],
		[
			'duplicated-summary',
			{ ...evidence, summary: [...evidence.summary, ...evidence.summary] },
			true,
		],
		[
			'wrong-summary',
			{
				...evidence,
				summary: evidence.summary.map((entry) => ({
					...entry,
					row: { ...entry.row, raw: 'changed raw observation' },
				})),
			},
			true,
		],
		[
			'wrong-judge',
			{
				...evidence,
				judge: evidence.judge.map((entry) => ({
					...entry,
					row: { ...entry.row, state: 'changed state' },
				})),
			},
			true,
		],
	]
}

/** Builds empty required source and cache memberships. */
export function buildMembershipCases(manifest: RefitGeneration): readonly MembershipCase[] {
	return [
		['files', [], manifest.lineage],
		['lineage', manifest.files, { before: [], after: [] }],
		[
			'judge-lineage',
			manifest.files,
			{
				...manifest.lineage,
				after: manifest.lineage.after.filter((file) => !file.path.endsWith('judge.jsonl')),
			},
		],
	]
}
