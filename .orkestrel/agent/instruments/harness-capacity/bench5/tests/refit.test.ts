import { reduceSupport } from '../aggregates/helpers.js'
import type { RefitCorpus, RefitReading } from '../refit/types.js'
import type { AggregatorOptions } from '../types.js'
import { before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
	appendFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { isRecord } from '@orkestrel/contract'
import {
	Classifier,
	LEDGER_QUESTIONS,
	collectRegistry,
	createLedger,
	matchEntities,
} from '../../vendor/agent-0.0.30-trimmed/index.js'
import { createOllama, createOllamaJudge } from '../../vendor/ollama/index.js'
import { Aggregator } from '../aggregates/Aggregator.js'
import {
	COPIES_DIR,
	FIT,
	HARNESS,
	MICA_CALIBRATION,
	MICA_CONTEXT,
	MICA_MODEL,
	MICA_SYSTEM,
	MODELS,
	SAMPLER,
} from '../constants.js'
import { appendSeed, readCopy } from '../Driver.js'
import {
	buildSystem,
	computeDigest,
	isCacheRow,
	readJSON,
	readLookup,
	readRows,
} from '../helpers.js'
import { JudgeCache } from '../JudgeCache.js'
import { Mirror } from '../Mirror.js'
import { Summarizer } from '../Summarizer.js'
import { Refit } from '../refit/Refit.js'
import {
	buildRefitItem,
	collectReadings,
	fitReadings,
	hashFile,
	measureRecall,
	measureRefitCosts,
	readRefitControls,
	verifyCorpus,
	verifyEvidence,
	verifyFiles,
	verifyLabels,
} from '../refit/helpers.js'
import { REFIT_CONTROLS } from '../refit/constants.js'
import {
	isRefitAttempt,
	isRefitContext,
	isRefitCorpus,
	isRefitEvidence,
	isRefitFile,
	isRefitGeneration,
	isRefitItem,
	isRefitLabels,
	isRefitMessage,
	isRefitSource,
	isRefitUsage,
	isRefitVerdict,
} from '../refit/validators.js'
import { Peer } from './refit/Peer.js'
import { DURATION_CASES } from './refit/constants.js'
import {
	buildEvidenceCases,
	buildMembershipCases,
	buildOptions,
	readAttempts,
	readControls,
	writeControlCache,
	readCorpus,
	writeCorpus,
	writeCache,
	writeLabels,
} from './refit/helpers.js'

const ROOT = join(HARNESS, '..', '..', '..', '..', 'tmp', 'units')
mkdirSync(ROOT, { recursive: true })
const DIRECTORY = mkdtempSync(join(ROOT, 'refit-test-'))
const FROZEN = join(DIRECTORY, 'frozen')
let corpus: RefitCorpus

before(async () => {
	assert.equal(await new Refit(buildOptions(FROZEN)).execute(), 0)
	corpus = readCorpus(FROZEN)
})

describe('refit freeze', () => {
	it('reproduces the all-request census offline and retains later dates, tool arguments and owner groups', () => {
		const manifest = readJSON(join(FROZEN, 'manifest.json'))
		assert.ok(isRecord(manifest))
		assert.equal(manifest.requests, 24)
		assert.equal(manifest.occurrences, 162)
		assert.equal(manifest.initial, 49)
		assert.deepEqual(manifest.stats, {
			hits: { category: 89, topic: 540, amends: 112, supersedes: 15 },
			misses: {},
			transient: 0,
		})
		assert.deepEqual(
			[
				...new Set(
					corpus.contexts
						.filter((context) => context.topic.owner)
						.map((context) => context.topic.key),
				),
			].sort(),
			[
				'owner:LH-20418',
				'owner:LH-31055',
				'owner:LH-44870',
				'owner:LH-58841',
				'owner:LH-60214',
				'owner:LH-71592',
			],
		)
		assert.ok(corpus.contexts.some((context) => context.date > '2026-10-08'))
		assert.ok(
			corpus.contexts.some((context) =>
				context.sources.some((source) => source.text.includes('lookup_order {"id":')),
			),
		)
		assert.ok(corpus.contexts.some((context) => context.listed.length > 0))
		assert.ok(
			corpus.points.every((point) => isRecord(point.input) && Array.isArray(point.input.owners)),
		)
	})

	it('matches every g01 archived runtime group by exact rendered source and seed/sentence grouping', () => {
		const mapping = readRows(
			join(HARNESS, '..', 'units', 'aggregates', 'reports', 'runtime-audit', 'mapping.jsonl'),
		)
		const expected = new Map<string, unknown>()
		for (const row of mapping) {
			assert.ok(
				isRecord(row) &&
					isRecord(row.original) &&
					typeof row.original.topic === 'string' &&
					Array.isArray(row.sources),
			)
			expected.set(
				row.original.topic,
				row.sources.map((source: unknown) => {
					assert.ok(isRecord(source))
					return {
						seed: source.seed,
						sentence: source.sentence,
						role: source.role,
						text: source.text,
						day: source.day,
					}
				}),
			)
		}
		const actual = new Map(
			corpus.contexts
				.filter((context) => context.goal.startsWith('g01'))
				.map((context) => [
					context.topic.key,
					context.sources.map(({ seed, sentence, role, text, day }) => ({
						seed,
						sentence,
						role,
						text,
						day,
					})),
				]),
		)
		assert.deepEqual([...actual.keys()].sort(), [...expected.keys()].sort())
		for (const [topic, sources] of expected) assert.deepEqual(actual.get(topic), sources, topic)
		const missing = new Map(actual)
		missing.delete('warehouse')
		assert.notDeepEqual([...missing.keys()].sort(), [...expected.keys()].sort())
		assert.notDeepEqual(
			actual.get('refunds')?.map((source) => ({ ...source, text: 'mutated source' })),
			expected.get('refunds'),
		)
	})

	it('refuses reused output directories and modified corpus files', async () => {
		await assert.rejects(new Refit(buildOptions(FROZEN)).execute(), /EEXIST/)
		const context = corpus.contexts[0]
		assert.ok(context)
		assert.throws(() => verifyCorpus({ ...corpus, contexts: [context, context] }), /duplicate/)
		assert.throws(
			() =>
				verifyCorpus({ ...corpus, contexts: [{ ...context, sources: context.sources.slice(1) }] }),
			/prompt/,
		)
		assert.throws(
			() =>
				verifyCorpus({
					...corpus,
					contexts: [
						{
							...context,
							sources: context.sources.map((source) => ({ ...source, text: 'changed' })),
						},
					],
				}),
			/prompt/,
		)
		const file = join(DIRECTORY, 'custody.txt')
		writeFileSync(file, 'before')
		const identity = hashFile(file)
		writeFileSync(file, 'after')
		assert.throws(() => verifyFiles([identity]), /custody mismatch/)
	})
})

describe('refit generation and fit custody', () => {
	it('refuses the reviewed negative original summary duration before generation completes', async () => {
		const context = corpus.contexts[0]
		assert.ok(context)
		const selected = join(DIRECTORY, 'duration-selected')
		writeCorpus(selected, corpus, context)
		for (const [name, duration] of DURATION_CASES) {
			const cache = join(DIRECTORY, `duration-${name}-cache`)
			writeCache(cache, context, duration)
			const generated = join(DIRECTORY, `duration-${name}-generated`)
			assert.equal(
				await new Refit(
					buildOptions(generated, { phase: 'generate', corpus: selected, cache }),
				).execute(),
				3,
			)
			const manifest = readJSON(join(generated, 'manifest.json'))
			assert.ok(isRefitGeneration(manifest))
			assert.equal(manifest.complete, false)
			assert.ok(readAttempts(generated)[0]?.error)
			const labels = join(DIRECTORY, `duration-${name}-labels.json`)
			writeLabels(labels, generated, context)
			const out = join(DIRECTORY, `duration-${name}-fit`)
			assert.equal(
				await new Refit(
					buildOptions(out, { phase: 'fit', corpus: selected, attempts: generated, labels }),
				).execute(),
				3,
			)
			assert.equal(existsSync(join(out, 'fit.json')), false)
		}
	})

	it('refuses the reviewed erased manifest custody with unchanged labels', async () => {
		const context = corpus.contexts[0]
		assert.ok(context)
		const selected = join(DIRECTORY, 'erased-selected')
		writeCorpus(selected, corpus, context)
		const cache = join(DIRECTORY, 'erased-cache')
		writeCache(cache, context, 12)
		const generated = join(DIRECTORY, 'erased-generated')
		assert.equal(
			await new Refit(
				buildOptions(generated, { phase: 'generate', corpus: selected, cache }),
			).execute(),
			0,
		)
		const labels = join(DIRECTORY, 'erased-labels.json')
		writeLabels(labels, generated, context)
		const labeled = readFileSync(labels, 'utf8')
		const path = join(generated, 'manifest.json')
		const manifest = readJSON(path)
		assert.ok(isRefitGeneration(manifest))
		writeFileSync(
			path,
			JSON.stringify({ ...manifest, files: [], lineage: { before: [], after: [] } }),
		)
		const out = join(DIRECTORY, 'erased-fit')
		assert.equal(
			await new Refit(
				buildOptions(out, { phase: 'fit', corpus: selected, attempts: generated, labels }),
			).execute(),
			3,
		)
		assert.equal(existsSync(join(out, 'fit.json')), false)
		assert.equal(readFileSync(labels, 'utf8'), labeled)
	})

	it('retains exact cached observations, accepts zero duration and unrelated live cache growth', async () => {
		const context = corpus.contexts[0]
		assert.ok(context)
		const selected = join(DIRECTORY, 'growth-selected')
		writeCorpus(selected, corpus, context)
		for (const duration of [0, 12]) {
			const cache = join(DIRECTORY, `growth-${duration}-cache`)
			writeCache(cache, context, duration)
			const generated = join(DIRECTORY, `growth-${duration}-generated`)
			assert.equal(
				await new Refit(
					buildOptions(generated, { phase: 'generate', corpus: selected, cache }),
				).execute(),
				0,
			)
			const attempt = readAttempts(generated)[0]
			assert.ok(attempt)
			assert.equal(attempt.cached, true)
			assert.equal(attempt.sent, false)
			assert.ok(attempt.judge?.components.every((component) => component.sent === false))
			assert.ok(
				measureRefitCosts(readAttempts(generated)).wire.every(
					(cost) => cost.requests === 0 && cost.missing === 0,
				),
			)
			assert.equal(attempt.duration, duration)
			const labels = join(DIRECTORY, `growth-${duration}-labels.json`)
			writeLabels(labels, generated, context)
			const manifest = readJSON(join(generated, 'manifest.json'))
			assert.ok(isRefitGeneration(manifest))
			const evidence = readJSON(manifest.evidence.path)
			assert.ok(isRefitEvidence(evidence))
			assert.deepEqual(
				evidence.summary.map((entry) => entry.row),
				readRows(join(cache, 'summary.jsonl')),
			)
			assert.deepEqual(
				evidence.judge.map((entry) => entry.row),
				[
					...new Map(
						readRows(join(cache, 'judge.jsonl'))
							.filter(isCacheRow)
							.map((row) => [row.key, row]),
					).values(),
				],
			)
			assert.deepEqual(
				new Set(evidence.judge.map((entry) => entry.row.key)),
				new Set([
					...readAttempts(generated)
						.flatMap((entry) => entry.judge?.components ?? [])
						.map((component) => component.key),
					...readControls(generated)
						.flatMap((control) => control.support?.components ?? [])
						.map((component) => component.key),
				]),
			)
			for (const name of ['summary', 'judge']) {
				const row = readRows(join(cache, `${name}.jsonl`))[0]
				assert.ok(isRecord(row))
				appendFileSync(
					join(cache, `${name}.jsonl`),
					JSON.stringify({ ...row, key: 'unrelated-later-observation' }) + '\n',
				)
			}
			assert.throws(() => verifyFiles(manifest.lineage.after), /custody mismatch/)
			const out = join(DIRECTORY, `growth-${duration}-fit`)
			assert.equal(
				await new Refit(
					buildOptions(out, { phase: 'fit', corpus: selected, attempts: generated, labels }),
				).execute(),
				0,
			)
			const fit = readJSON(join(out, 'fit.json'))
			assert.ok(isRecord(fit) && isRecord(fit.custody))
			assert.equal(fit.custody.manifest, hashFile(join(generated, 'manifest.json')).hash)
			const diagnosis = readJSON(join(out, 'diagnosis.json'))
			assert.ok(isRecord(diagnosis) && isRecord(diagnosis.custody))
			assert.equal(diagnosis.custody.manifest, fit.custody.manifest)
		}
	})

	it('refuses missing observed rows, changed retained bytes, and empty required membership', async () => {
		const context = corpus.contexts[0]
		assert.ok(context)
		const selected = join(DIRECTORY, 'observations-selected')
		writeCorpus(selected, corpus, context)
		const cache = join(DIRECTORY, 'observations-cache')
		writeCache(cache, context, 12)
		const generated = join(DIRECTORY, 'observations-generated')
		assert.equal(
			await new Refit(
				buildOptions(generated, { phase: 'generate', corpus: selected, cache }),
			).execute(),
			0,
		)
		const labels = join(DIRECTORY, 'observations-labels.json')
		writeLabels(labels, generated, context)
		const manifestPath = join(generated, 'manifest.json')
		const manifest = readJSON(manifestPath)
		assert.ok(isRefitGeneration(manifest))
		const evidence = readJSON(manifest.evidence.path)
		assert.ok(isRefitEvidence(evidence))
		const attempts = readAttempts(generated)
		const model = evidence.judge[0]?.row.model
		assert.ok(model)
		verifyEvidence(attempts, evidence, manifest, model, readControls(generated))
		// Removing the live row leaves the immutable observation available to adjudication.
		writeFileSync(join(cache, 'judge.jsonl'), '')
		assert.throws(() => verifyFiles(manifest.lineage.after), /custody mismatch/)
		const retainedFit = join(DIRECTORY, 'retained-after-live-delete')
		assert.equal(
			await new Refit(
				buildOptions(retainedFit, { phase: 'fit', corpus: selected, attempts: generated, labels }),
			).execute(),
			0,
		)
		for (const [name, changed, rebound] of buildEvidenceCases(evidence)) {
			writeFileSync(manifest.evidence.path, JSON.stringify(changed))
			writeFileSync(
				manifestPath,
				JSON.stringify({
					...manifest,
					evidence: rebound ? hashFile(manifest.evidence.path) : manifest.evidence,
				}),
			)
			writeLabels(labels, generated, context)
			const out = join(DIRECTORY, `observations-${name}-fit`)
			assert.equal(
				await new Refit(
					buildOptions(out, { phase: 'fit', corpus: selected, attempts: generated, labels }),
				).execute(),
				3,
				name,
			)
			assert.equal(existsSync(join(out, 'fit.json')), false, name)
		}
		writeFileSync(manifest.evidence.path, JSON.stringify(evidence))
		for (const [name, files, lineage] of buildMembershipCases(manifest)) {
			writeFileSync(
				manifestPath,
				JSON.stringify({ ...manifest, evidence: hashFile(manifest.evidence.path), files, lineage }),
			)
			writeLabels(labels, generated, context)
			const out = join(DIRECTORY, `membership-${name}-fit`)
			assert.equal(
				await new Refit(
					buildOptions(out, { phase: 'fit', corpus: selected, attempts: generated, labels }),
				).execute(),
				3,
				name,
			)
			assert.equal(existsSync(join(out, 'fit.json')), false, name)
		}
	})

	it('binds every completed manifest field to unchanged root labels', async () => {
		const context = corpus.contexts[0]
		assert.ok(context)
		const selected = join(DIRECTORY, 'manifest-selected')
		writeCorpus(selected, corpus, context)
		const cache = join(DIRECTORY, 'manifest-cache')
		writeCache(cache, context, 12)
		const generated = join(DIRECTORY, 'manifest-generated')
		assert.equal(
			await new Refit(
				buildOptions(generated, { phase: 'generate', corpus: selected, cache }),
			).execute(),
			0,
		)
		const labels = join(DIRECTORY, 'manifest-labels.json')
		writeLabels(labels, generated, context)
		const labeled = readFileSync(labels, 'utf8')
		const path = join(generated, 'manifest.json')
		const manifest = readJSON(path)
		assert.ok(isRefitGeneration(manifest))
		writeFileSync(
			path,
			JSON.stringify({ ...manifest, lineage: { ...manifest.lineage, before: [] } }),
		)
		const out = join(DIRECTORY, 'manifest-mutated-fit')
		assert.equal(
			await new Refit(
				buildOptions(out, { phase: 'fit', corpus: selected, attempts: generated, labels }),
			).execute(),
			3,
		)
		assert.equal(existsSync(join(out, 'fit.json')), false)
		assert.equal(readFileSync(labels, 'utf8'), labeled)
		assert.match(readFileSync(join(out, 'diagnosis.json'), 'utf8'), /manifest custody/)
	})

	it('refuses invalid original duration during fitting even with rebound evidence and labels', async () => {
		const context = corpus.contexts[0]
		assert.ok(context)
		const selected = join(DIRECTORY, 'fitting-duration-selected')
		writeCorpus(selected, corpus, context)
		const cache = join(DIRECTORY, 'fitting-duration-cache')
		writeCache(cache, context, 12)
		const generated = join(DIRECTORY, 'fitting-duration-generated')
		assert.equal(
			await new Refit(
				buildOptions(generated, { phase: 'generate', corpus: selected, cache }),
			).execute(),
			0,
		)
		const manifestPath = join(generated, 'manifest.json')
		const manifest = readJSON(manifestPath)
		assert.ok(isRefitGeneration(manifest))
		const evidence = readJSON(manifest.evidence.path)
		assert.ok(isRefitEvidence(evidence))
		const attempts = readAttempts(generated)
		for (const [name, duration] of DURATION_CASES.filter(
			([boundary]) => boundary === 'negative' || boundary === 'missing',
		)) {
			writeFileSync(
				join(generated, 'attempts.jsonl'),
				attempts.map((attempt) => JSON.stringify({ ...attempt, duration })).join('\n') + '\n',
			)
			writeFileSync(
				manifest.evidence.path,
				JSON.stringify({
					...evidence,
					summary: evidence.summary.map((entry) => ({
						...entry,
						row: { ...entry.row, wall: duration ?? 12 },
					})),
				}),
			)
			writeFileSync(
				manifestPath,
				JSON.stringify({
					...manifest,
					attempts: hashFile(join(generated, 'attempts.jsonl')).hash,
					evidence: hashFile(manifest.evidence.path),
				}),
			)
			const labels = join(DIRECTORY, `fitting-duration-${name}-labels.json`)
			writeLabels(labels, generated, context)
			const out = join(DIRECTORY, `fitting-duration-${name}-fit`)
			assert.equal(
				await new Refit(
					buildOptions(out, { phase: 'fit', corpus: selected, attempts: generated, labels }),
				).execute(),
				3,
			)
			assert.equal(existsSync(join(out, 'fit.json')), false)
		}
	})

	it('records lexical exhaustion and retry duplicates without a judge request or lost audit occurrence', async () => {
		const context = corpus.contexts[0]
		assert.ok(context)
		const selected = join(DIRECTORY, 'exhausted-selected')
		writeCorpus(selected, corpus, context)
		const peer = new Peer({ initial: 'MX-9999', retry: 'MX-9999', yes: 0, no: -100, usage: true })
		const url = await peer.start()
		const out = join(DIRECTORY, 'exhausted')
		writeControlCache(join(DIRECTORY, 'exhausted-cache'))
		try {
			assert.equal(
				await new Refit(
					buildOptions(out, {
						phase: 'generate',
						corpus: selected,
						cache: join(DIRECTORY, 'exhausted-cache'),
						live: true,
						url,
					}),
				).execute(),
				0,
			)
			const attempts = readAttempts(out)
			assert.equal(attempts.length, 3)
			assert.equal(peer.requests.length, 2)
			assert.ok(
				attempts.every(
					(attempt) => attempt.judge === undefined && (attempt.failures?.length ?? 0) > 0,
				),
			)
			assert.equal(attempts[2]?.cached, true)
			assert.equal(attempts[1]?.key, attempts[2]?.key)
			const packet = readRows(join(out, 'packet.jsonl'))
			assert.equal(packet.length, 3)
			assert.equal(new Set(packet.filter(isRefitItem).map((item) => item.id)).size, 3)
			const manifest = readJSON(join(out, 'manifest.json'))
			assert.ok(isRefitGeneration(manifest))
			assert.ok(manifest.lineage.before.some((file) => file.path.endsWith('judge.jsonl')))
			const evidence = readJSON(manifest.evidence.path)
			assert.ok(isRefitEvidence(evidence))
			assert.deepEqual(
				new Set(evidence.judge.map((entry) => entry.row.key)),
				new Set(
					readControls(out)
						.flatMap((control) => control.support?.components ?? [])
						.map((component) => component.key),
				),
			)
			assert.deepEqual(
				readControls(out).map((control) => control.id),
				readRefitControls(REFIT_CONTROLS).map((control) => control.id),
			)
			assert.equal(evidence.summary.length, 2)
			const labels = join(DIRECTORY, 'exhausted-labels.json')
			writeLabels(labels, out, context)
			const fitted = join(DIRECTORY, 'exhausted-fit')
			assert.equal(
				await new Refit(
					buildOptions(fitted, { phase: 'fit', corpus: selected, attempts: out, labels }),
				).execute(),
				3,
			)
			const diagnosis = readJSON(join(fitted, 'diagnosis.json'))
			assert.ok(isRecord(diagnosis))
			assert.deepEqual(diagnosis.reasons, ['end-to-end admission below 0.5'])
		} finally {
			await peer.close()
		}
	})

	it('matches real Aggregator wire bytes through its first AGREE decision and retains failed-fit refusal', async () => {
		const context = corpus.contexts[0]
		assert.ok(context)
		const source = context.sources[0]
		assert.ok(source)
		const selected = join(DIRECTORY, 'prefix-selected')
		writeCorpus(selected, corpus, context)
		const peer = new Peer({ initial: 'MX-9999', retry: source.text, yes: 0, no: -100, usage: true })
		const url = await peer.start()
		try {
			assert.equal(
				await new Refit(
					buildOptions(join(DIRECTORY, 'prefix-generated'), {
						phase: 'generate',
						corpus: selected,
						cache: join(DIRECTORY, 'prefix-cache'),
						live: true,
						url,
					}),
				).execute(),
				0,
			)
			const boundary = peer.requests.length
			const prefix = peer.requests.slice(0, 4)
			assert.equal(prefix.length, 4)
			const copy = readCopy(join(COPIES_DIR, 'v1.json'))
			const goal = copy.goals[0]
			assert.ok(goal)
			const provider = createOllama({
				url,
				model: MODELS.q2,
				think: false,
				keepAlive: '30m',
				options: { ...SAMPLER, num_predict: 160 },
			})
			const inner = createOllamaJudge({
				url,
				model: MICA_MODEL,
				system: MICA_SYSTEM,
				calibration: { temperature: MICA_CALIBRATION },
				options: { num_ctx: MICA_CONTEXT },
			})
			const classification = new JudgeCache({
				judge: inner,
				path: buildOptions('').cache + '/judge.jsonl',
				live: false,
				retry: 0,
			})
			const system = buildSystem({ ledger: { system: copy.system } })
			const ledger = createLedger(provider, {
				judge: classification,
				system,
				topics: copy.topics,
				questions: LEDGER_QUESTIONS,
				thresholds: FIT,
				capacity: SAMPLER.num_ctx,
				predict: 0,
			})
			const mirror = new Mirror(ledger, {
				judge: classification,
				system,
				topics: copy.topics,
				questions: LEDGER_QUESTIONS,
				thresholds: FIT,
				reads: new Map([
					['lookup_order', readLookup],
					['lookup_customer', readLookup],
				]),
			})
			const seeds = new Map<string, number>()
			appendSeed(ledger.conversation, copy.seed, 0, goal.after, seeds)
			const request = ledger.conversation.add({ role: 'user', content: goal.request })
			mirror.note(request)
			const classifier = new Classifier({
				conversation: ledger.conversation,
				judge: classification,
				questions: LEDGER_QUESTIONS,
				topics: copy.topics,
				thresholds: FIT,
				assign: (message) => mirror.assign(message),
				entities: (text, partial) =>
					matchEntities(collectRegistry(mirror.readings()), text, partial),
			})
			await classifier.classify(new Set([request.id]), new AbortController().signal)
			const options: AggregatorOptions = {
				mirror,
				summarizer: new Summarizer({
					provider,
					model: MODELS.q2,
					sampler: SAMPLER,
					predict: 160,
					cache: join(DIRECTORY, 'runtime-summary.jsonl'),
					live: true,
				}),
				judge: new JudgeCache({
					judge: inner,
					path: join(DIRECTORY, 'runtime-judge.jsonl'),
					live: true,
					retry: 2,
				}),
				fit: { agree: 0.78, change: 0.56, separated: true },
				settings: { allowance: 555, retry: 2, predict: 160 },
				days: copy.days,
				seeds,
				path: join(DIRECTORY, 'runtime-aggregates.jsonl'),
				log: () => {},
			}
			assert.throws(
				() => new Aggregator({ ...options, fit: { ...options.fit, separated: false } }),
				/requires a separating fit/,
			)
			await new Aggregator(options).maintain(
				request,
				goal.id,
				goal.after,
				new AbortController().signal,
			)
			assert.deepEqual(peer.requests.slice(boundary, boundary + 4), prefix)
			const decision = readRows(options.path).find((row) => isRecord(row) && row.event === 'agree')
			assert.ok(isRecord(decision) && isRecord(decision.answers))
			assert.equal(decision.topic, context.topic.key)
			assert.equal(decision.answers.agree, 1)
		} finally {
			await peer.close()
		}
	})

	it('retries copied tokens, stops on the first lexical success even at AGREE zero, and replays offline', async () => {
		const context = corpus.contexts.find(
			(candidate) => candidate.goal.startsWith('g01') && candidate.topic.key === 'refunds',
		)
		assert.ok(context)
		const source = context.sources[0]
		assert.ok(source)
		const selected = join(DIRECTORY, 'selected')
		writeCorpus(selected, corpus, context)
		const peer = new Peer({
			initial: 'MX-9999',
			retry: source.text,
			yes: -10000,
			no: 0,
			usage: true,
		})
		const url = await peer.start()
		const cache = join(DIRECTORY, 'cache-zero')
		const out = join(DIRECTORY, 'zero')
		try {
			assert.equal(
				await new Refit(
					buildOptions(out, { phase: 'generate', corpus: selected, cache, url, live: true }),
				).execute(),
				0,
			)
			const attempts = readAttempts(out)
			assert.equal(attempts.length, 2)
			assert.ok(attempts[0]?.failures?.some((failure) => failure.token === 'MX-9999'))
			assert.ok(attempts[1]?.prompt[1]?.content.includes('"token":"MX-9999"'))
			assert.ok(attempts[1]?.judge)
			assert.equal(reduceSupport(attempts[1].judge), 0)
			assert.deepEqual(attempts[1]?.failures, [])
			const requests = peer.requests.length
			assert.equal(
				requests,
				2 +
					attempts
						.flatMap((attempt) => attempt.judge?.components ?? [])
						.filter((component) => component.sent).length +
					readControls(out)
						.flatMap((control) => control.support?.components ?? [])
						.filter((component) => component.sent).length,
			)
			const offline = join(DIRECTORY, 'zero-replay')
			assert.equal(
				await new Refit(
					buildOptions(offline, { phase: 'generate', corpus: selected, cache, url, live: false }),
				).execute(),
				0,
			)
			assert.equal(peer.requests.length, requests)
			assert.ok(readAttempts(offline).every((attempt) => attempt.cached))
			assert.ok(
				measureRefitCosts(readAttempts(offline)).wire.every(
					(cost) => cost.requests === 0 && cost.missing === 0,
				),
			)
			const missed = join(DIRECTORY, 'offline-miss')
			assert.equal(
				await new Refit(
					buildOptions(missed, {
						phase: 'generate',
						corpus: selected,
						cache: join(DIRECTORY, 'empty-cache'),
						url,
						live: false,
					}),
				).execute(),
				3,
			)
			assert.match(readAttempts(missed)[0]?.error ?? '', /cache miss/)
			assert.equal(readAttempts(missed)[0]?.sent, false)
			assert.ok(
				measureRefitCosts(readAttempts(missed)).wire.every(
					(cost) => cost.requests === 0 && cost.missing === 0,
				),
			)
			assert.equal(peer.requests.length, requests)
			const packet = readRows(join(out, 'packet.jsonl'))
			assert.ok(packet.every(isRefitItem))
			assert.ok(
				packet.every(
					(item) =>
						isRecord(item) &&
						Object.keys(item).sort().join(',') ===
							'candidate,components,id,question,revision,sources,state',
				),
			)
			assert.equal(packet.length, attempts.length)
		} finally {
			await peer.close()
		}
	})

	it('refuses missing usage and aborts without successful preparation', async () => {
		const context = corpus.contexts[0]
		assert.ok(context)
		const selected = join(DIRECTORY, 'usage-selected')
		writeCorpus(selected, corpus, context)
		const peer = new Peer({
			initial: context.sources[0]?.text ?? '',
			retry: '',
			yes: 0,
			no: -100,
			usage: false,
		})
		const url = await peer.start()
		writeControlCache(join(DIRECTORY, 'usage-cache'))
		try {
			const out = join(DIRECTORY, 'missing-usage')
			assert.equal(
				await new Refit(
					buildOptions(out, {
						phase: 'generate',
						corpus: selected,
						cache: join(DIRECTORY, 'usage-cache'),
						live: true,
						url,
					}),
				).execute(),
				3,
			)
			assert.match(readAttempts(out)[0]?.error ?? '', /usage missing/)
			assert.equal(readAttempts(out)[0]?.sent, true)
			assert.equal(measureRefitCosts(readAttempts(out)).wire[0]?.requests, 1)
			assert.equal(measureRefitCosts(readAttempts(out)).wire[0]?.missing, 1)
			const aborted = join(DIRECTORY, 'aborted')
			assert.equal(
				await new Refit(
					buildOptions(aborted, {
						phase: 'generate',
						corpus: selected,
						cache: join(DIRECTORY, 'abort-cache'),
						live: true,
						url,
					}),
				).execute(AbortSignal.abort(new Error('cancelled'))),
				3,
			)
			assert.match(readAttempts(aborted)[0]?.error ?? '', /cancelled/)
			assert.equal(readAttempts(aborted)[0]?.sent, false)
			assert.equal(measureRefitCosts(readAttempts(aborted)).wire[0]?.requests, 0)
			assert.equal(measureRefitCosts(readAttempts(aborted)).wire[0]?.missing, 0)
			assert.equal(peer.requests.length, 1)
		} finally {
			await peer.close()
		}
	})

	it('charges sent judge failures and sent aborts while marking historical boundaries unmeasured', async () => {
		const context = corpus.contexts[0]
		assert.ok(context)
		const selected = join(DIRECTORY, 'sent-selected')
		writeCorpus(selected, corpus, context)
		for (const operation of ['judge', 'abort']) {
			const abort = new AbortController()
			const peer = new Peer({
				initial: context.sources[0]?.text ?? '',
				retry: '',
				yes: 0,
				no: -100,
				usage: true,
				judge: false,
				...(operation === 'abort' ? { abort } : {}),
			})
			const url = await peer.start()
			try {
				const out = join(DIRECTORY, `sent-${operation}`)
				writeControlCache(join(DIRECTORY, `sent-${operation}-cache`))
				assert.equal(
					await new Refit(
						buildOptions(out, {
							phase: 'generate',
							corpus: selected,
							cache: join(DIRECTORY, `sent-${operation}-cache`),
							live: true,
							url,
						}),
					).execute(abort.signal),
					3,
				)
				const attempts = readAttempts(out)
				const costs = measureRefitCosts(attempts)
				assert.equal(
					costs.wire.reduce((total, cost) => total + cost.requests, 0),
					peer.requests.length,
				)
				assert.equal(
					costs.wire.find((cost) => cost.role === (operation === 'judge' ? 'judge' : 'summarizer'))
						?.missing,
					operation === 'judge' ? attempts[0]?.judge?.components.length : 1,
				)
				assert.equal(attempts[0]?.sent, true)
				if (operation === 'judge')
					assert.ok(attempts[0]?.judge?.components.some((component) => component.sent === true))
				const historical = attempts.map((attempt) => ({
					...attempt,
					sent: undefined,
					judge:
						attempt.judge === undefined
							? undefined
							: {
									...attempt.judge,
									components: attempt.judge.components.map((component) => ({
										...component,
										sent: undefined,
									})),
								},
				}))
				const unmeasured = measureRefitCosts(historical)
				assert.ok(unmeasured.failures.some((failure) => failure.includes('unmeasured')))
				assert.ok(unmeasured.wire.every((cost) => cost.requests === 0 && cost.missing === 0))
				assert.throws(
					() =>
						measureRefitCosts(
							attempts.map((attempt) => ({ ...attempt, sent: true, cached: true })),
						),
					/contradicts cache/,
				)
			} finally {
				await peer.close()
			}
		}
	})

	it('fits only immutable independent labels and preserves all archived hard controls', async () => {
		const context = corpus.contexts[0]
		assert.ok(context)
		const selected = join(DIRECTORY, 'fit-selected')
		writeCorpus(selected, corpus, context)
		const peer = new Peer({
			initial: context.sources[0]?.text ?? '',
			retry: '',
			yes: 0,
			no: -100,
			usage: true,
		})
		const url = await peer.start()
		const generated = join(DIRECTORY, 'generated')
		writeControlCache(join(DIRECTORY, 'fit-cache'))
		try {
			assert.equal(
				await new Refit(
					buildOptions(generated, {
						phase: 'generate',
						corpus: selected,
						cache: join(DIRECTORY, 'fit-cache'),
						live: true,
						url,
					}),
				).execute(),
				0,
			)
		} finally {
			await peer.close()
		}
		const labelsPath = join(DIRECTORY, 'labels.json')
		const labels = writeLabels(labelsPath, generated, context)
		const out = join(DIRECTORY, 'fit')
		assert.equal(
			await new Refit(
				buildOptions(out, {
					phase: 'fit',
					corpus: selected,
					attempts: generated,
					labels: labelsPath,
				}),
			).execute(),
			0,
		)
		const fit = readJSON(join(out, 'fit.json'))
		assert.ok(isRecord(fit))
		assert.equal(fit.agree, 0.78)
		assert.equal(fit.change, 0.56)
		const diagnosis = readJSON(join(out, 'diagnosis.json'))
		assert.ok(isRecord(diagnosis) && Array.isArray(diagnosis.readings))
		assert.equal(
			diagnosis.readings.filter(
				(reading: unknown) => isRecord(reading) && reading.generated === false,
			).length,
			12,
		)
		const attempt = readAttempts(generated)[0]
		assert.ok(attempt)
		const packet = [buildRefitItem(attempt, context)]
		verifyLabels(packet, labels)
		assert.throws(() => verifyLabels(packet, { ...labels, labels: [] }), /coverage/)
		assert.throws(
			() => verifyLabels(packet, { ...labels, labels: [...labels.labels, ...labels.labels] }),
			/coverage/,
		)
		assert.throws(
			() =>
				verifyLabels(packet, {
					...labels,
					labels: labels.labels.map((label) => ({ ...label, item: 'swapped' })),
				}),
			/hash/,
		)
		const label = labels.labels[0]
		assert.ok(label)
		const other = { ...packet[0], id: 'other' }
		assert.ok(isRefitItem(other))
		assert.throws(
			() => verifyLabels([...packet, other], { ...labels, labels: [label, label] }),
			/bijection/,
		)
		assert.throws(
			() => verifyLabels([{ ...packet[0], state: 'changed' }].filter(isRefitItem), labels),
			/hash/,
		)
		assert.throws(
			() =>
				collectReadings(
					[{ ...attempt, failures: [{ kind: 'id', token: 'injected' }] }],
					[context],
					labels,
				),
			/lexical evidence/,
		)
		writeFileSync(labelsPath, JSON.stringify({ ...labels, corpus: 'changed' }))
		const refused = join(DIRECTORY, 'refused-fit')
		assert.equal(
			await new Refit(
				buildOptions(refused, {
					phase: 'fit',
					corpus: selected,
					attempts: generated,
					labels: labelsPath,
				}),
			).execute(),
			3,
		)
		assert.equal(existsSync(join(refused, 'fit.json')), false)
		assert.match(readFileSync(join(refused, 'diagnosis.json'), 'utf8'), /custody/)
		writeFileSync(
			labelsPath,
			JSON.stringify({
				...labels,
				labels: labels.labels.map((row) => ({
					...row,
					verdict: 'ambiguous',
					propositions: row.propositions.map((proposition) => ({
						...proposition,
						verdict: 'ambiguous',
					})),
				})),
			}),
		)
		const ambiguous = join(DIRECTORY, 'ambiguous-fit')
		assert.equal(
			await new Refit(
				buildOptions(ambiguous, {
					phase: 'fit',
					corpus: selected,
					attempts: generated,
					labels: labelsPath,
				}),
			).execute(),
			3,
		)
		assert.equal(existsSync(join(ambiguous, 'fit.json')), false)
	})
})

describe('refit fitting', () => {
	const positive: RefitReading = {
		id: 'positive',
		identity: 'positive',
		generated: true,
		verdict: 'supported',
		lexical: true,
		score: 0.8,
	}
	const negative: RefitReading = {
		id: 'negative',
		identity: 'negative',
		generated: true,
		verdict: 'unsupported',
		lexical: true,
		score: 0.79,
	}
	it('rejects equality at a negative cutoff and scoreable ambiguity', () => {
		assert.equal(fitReadings([positive, negative]).cutoff, 0.8)
		assert.equal(fitReadings([positive, { ...negative, score: 0.8 }]).accepted, false)
		assert.equal(
			fitReadings([positive, { ...negative, verdict: 'ambiguous', score: 1 }]).accepted,
			false,
		)
	})
	it('keeps supported lexical failures in the floor denominator, including the exact 0.5 boundary', () => {
		const failed: RefitReading = {
			id: 'failed',
			identity: 'failed',
			generated: true,
			verdict: 'supported',
			lexical: false,
		}
		assert.deepEqual(measureRecall([positive, failed], 0.8), {
			supported: 2,
			scored: 1,
			admitted: 1,
			conditional: 1,
			admission: 0.5,
		})
		assert.equal(fitReadings([positive, failed, negative]).accepted, true)
		assert.equal(
			fitReadings([positive, failed, { ...failed, id: 'other', identity: 'other' }, negative])
				.accepted,
			false,
		)
	})
	it('refuses missing required scores, absent positives, incomplete costs and conflicting duplicates', () => {
		assert.equal(fitReadings([{ ...positive, score: undefined }, negative]).accepted, false)
		assert.equal(fitReadings([negative]).accepted, false)
		assert.equal(fitReadings([positive, negative], ['missing costs']).accepted, false)
		assert.equal(fitReadings([positive, { ...positive, verdict: 'ambiguous' }]).accepted, false)
		assert.equal(fitReadings([{ ...positive, score: Number.NaN }]).accepted, false)
	})
	it('validates every artifact boundary without treating lexical success as a label', () => {
		for (const guard of [
			isRefitAttempt,
			isRefitContext,
			isRefitCorpus,
			isRefitEvidence,
			isRefitFile,
			isRefitGeneration,
			isRefitItem,
			isRefitLabels,
			isRefitMessage,
			isRefitSource,
			isRefitUsage,
			isRefitVerdict,
		]) {
			assert.equal(guard(undefined), false)
			assert.equal(guard({}), false)
			assert.equal(
				guard(
					new Proxy(
						{},
						{
							get() {
								throw new Error('hostile property')
							},
						},
					),
				),
				false,
			)
		}
		assert.equal(isRefitCorpus(corpus), true)
		assert.equal(isRefitFile(hashFile(join(FROZEN, 'corpus.json'))), true)
		assert.equal(isRefitMessage(corpus.contexts[0]?.prompt[0]), true)
		assert.equal(isRefitSource(corpus.contexts[0]?.sources[0]), true)
		assert.equal(isRefitVerdict('ambiguous'), true)
		assert.equal(isRefitUsage({ prompt: 1, completion: 2, total: 3 }), true)
		assert.equal(isRefitUsage({ prompt: 1, completion: Number.NaN, total: Number.NaN }), false)
		assert.equal(isRefitUsage({ prompt: 1, completion: 2, total: 4 }), false)
		assert.equal(isRefitLabels({ labels: [], authority: 'lexical-pass' }), false)
		assert.notEqual(computeDigest(corpus.contexts[0]), computeDigest({}))
	})
})
