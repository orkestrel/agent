import type { AggregateFailure, MirrorRead } from '../types.js'
import type {
	RefitAttempt,
	RefitControl,
	RefitContext,
	RefitCorpus,
	RefitEvidence,
	RefitFile,
	RefitGeneration,
	RefitOptions,
	RefitPoint,
} from './types.js'
import { randomUUID } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { isDeepStrictEqual, parseArgs } from 'node:util'
import { isFiniteNumber, isRecord } from '@orkestrel/contract'
import {
	Classifier,
	LEDGER_QUESTIONS,
	collectRegistry,
	createLedger,
	matchEntities,
} from '../../vendor/agent-0.0.30-trimmed/index.js'
import { createOllama, createOllamaJudge } from '../../vendor/ollama/index.js'
import { Support } from '../aggregates/Support.js'
import {
	buildAgreeState,
	reduceSupport,
	buildSummaryPrompt,
	checkProse,
	collectStaleTokens,
	collectTopicMembers,
	collectTopicSources,
	collectTopics,
	renderSource,
} from '../aggregates/helpers.js'
import {
	COPIES_DIR,
	DAEMON,
	FIT,
	HARNESS,
	MICA_CALIBRATION,
	MICA_CONTEXT,
	MICA_MODEL,
	MICA_SYSTEM,
	MODELS,
	SAMPLER,
	TIMEOUT,
} from '../constants.js'
import { appendSeed, readCopy, readSettings } from '../Driver.js'
import {
	buildSummaryKey,
	buildSystem,
	computeDigest,
	describeError,
	findDay,
	isCacheRow,
	isSummaryRow,
	readJSON,
	readLookup,
	readRows,
} from '../helpers.js'
import { JudgeCache } from '../JudgeCache.js'
import { Mirror } from '../Mirror.js'
import { readFrozen, readModelDigest } from '../matrix/helpers.js'
import { readBuild } from '../build/helpers.js'
import { projectCopy, readRuntime } from '../endurance/helpers.js'
import { readClassification } from '../sustained/helpers.js'
import { Summarizer } from '../Summarizer.js'
import {
	REFIT_CONTROLS,
	REFIT_CONTROL_HASHES,
	REFIT_IMPLEMENTATION,
	REFIT_LIMITATION,
} from './constants.js'
import {
	buildRefitItem,
	computeRefitAssessment,
	readRefitControls,
	hashFile,
	verifyCorpus,
	verifyEvidence,
	verifyFiles,
} from './helpers.js'
import { isRefitCorpus, isRefitGeneration, isRefitUsage } from './validators.js'

/** Runs development freezing, score-independent generation, and independently adjudicated fitting. */
export class Refit {
	readonly #options: RefitOptions
	readonly #abort = new AbortController()
	#signal = this.#abort.signal
	#request: 'summarizer' | 'judge' | undefined
	#sent = new Set<string>()
	#requests = 0

	/** Creates a command runner from the closed CLI options.
	 * @param options - Explicit phase, paths, model, and live permission
	 */
	constructor(options: RefitOptions) {
		this.#options = options
	}

	/** Parses the command line and executes one explicit phase.
	 * @param args - Arguments after the executable
	 * @returns Exit 0 for completed preparation or an accepted fit; exit 3 for refusal
	 */
	static async run(args: readonly string[]): Promise<number> {
		const { values, positionals } = parseArgs({
			args: [...args],
			allowPositionals: true,
			options: {
				runtime: { type: 'string' },
				classification: { type: 'string' },
				copy: { type: 'string', default: '1' },
				frozen: { type: 'string' },
				settings: { type: 'string' },
				out: { type: 'string' },
				cache: { type: 'string' },
				corpus: { type: 'string' },
				attempts: { type: 'string' },
				labels: { type: 'string' },
				controls: { type: 'string', default: REFIT_CONTROLS },
				model: { type: 'string', default: MODELS.q2 },
				url: { type: 'string', default: DAEMON },
				live: { type: 'boolean', default: false },
			},
		})
		const phase = positionals[0]
		if (
			positionals.length !== 1 ||
			(phase !== 'freeze' && phase !== 'generate' && phase !== 'fit') ||
			values.out === undefined ||
			values.copy !== '1'
		)
			throw new Error(
				'usage: refit.ts freeze|generate|fit --out NEW_DIRECTORY [--copy 1] [--cache DIRECTORY] [--corpus DIRECTORY] [--attempts DIRECTORY --labels FILE] [--model TAG] [--live]',
			)
		if (values.live && phase !== 'generate')
			throw new Error('--live is permitted only for generate')
		if (
			(values.runtime === undefined) !== (values.classification === undefined) ||
			(values.runtime !== undefined && values.frozen === undefined)
		)
			throw new Error('runtime fitting requires both classification and frozen role custody')
		if ((phase === 'freeze' || phase === 'generate') && values.cache === undefined)
			throw new Error('--cache is required')
		if (phase !== 'freeze' && values.corpus === undefined) throw new Error('--corpus is required')
		if (phase === 'fit' && (values.attempts === undefined || values.labels === undefined))
			throw new Error('--attempts and --labels are required')
		return await new Refit({
			runtime: values.runtime,
			classification: values.classification,
			phase,
			frozen: values.frozen,
			out: values.out,
			cache: values.cache ?? '',
			corpus: values.corpus ?? '',
			attempts: values.attempts ?? '',
			labels: values.labels ?? '',
			controls: values.controls,
			scenario: join(COPIES_DIR, 'v1.json'),
			settings:
				values.frozen === undefined
					? (values.settings ?? join(HARNESS, 'bench5', 'settings.json'))
					: readFrozen(hashFile(values.frozen)).settings.path,
			model: values.model,
			url: values.url,
			live: values.live,
		}).execute()
	}

	/** Executes the phase into a create-only output directory.
	 * @param signal - Optional caller cancellation, combined with fatal judge cancellation
	 * @returns Exit 0 on complete preparation or accepted fit; exit 3 on refusal
	 */
	async execute(signal?: AbortSignal): Promise<number> {
		readBuild()
		this.#signal =
			signal === undefined ? this.#abort.signal : AbortSignal.any([signal, this.#abort.signal])
		mkdirSync(dirname(this.#options.out), { recursive: true })
		mkdirSync(this.#options.out)
		try {
			if (this.#options.frozen !== undefined && this.#options.phase === 'generate') {
				const frozen = readFrozen(hashFile(this.#options.frozen))
				if (this.#options.live) {
					const response = await this.#fetch(new URL('/api/tags', this.#options.url))
					const tags: unknown = await response.json()
					for (const role of [frozen.summarizer, frozen.judge])
						if (readModelDigest(tags, role.model) !== role.digest)
							throw new Error('actual calibration model digest changed')
				}
			}
			if (this.#options.phase === 'freeze') return await this.#freeze()
			if (this.#options.phase === 'generate') return await this.#generate()
			return this.#fit()
		} catch (error) {
			writeFileSync(
				join(this.#options.out, 'diagnosis.json'),
				`${JSON.stringify({ accepted: false, reasons: [describeError(error)], limitation: REFIT_LIMITATION }, null, 2)}\n`,
				{ flag: 'wx' },
			)
			return 3
		}
	}

	#files(): readonly RefitFile[] {
		if (this.#options.frozen !== undefined) {
			const frozen = readFrozen(hashFile(this.#options.frozen))
			if (this.#options.model !== frozen.summarizer.model)
				throw new Error('summarizer model differs from frozen configuration')
			return [...frozen.files, frozen.settings, ...this.#runtimeFiles()]
		}
		return [
			...REFIT_IMPLEMENTATION.map((path) => join(HARNESS, path)),
			this.#options.scenario,
			this.#options.settings,
		].map(hashFile)
	}

	#runtimeFiles(): readonly RefitFile[] {
		if (this.#options.runtime === undefined) return []
		if (this.#options.classification === undefined || this.#options.frozen === undefined)
			throw new Error('runtime refit lacks classification ancestry')
		const runtime = hashFile(this.#options.runtime)
		readRuntime(runtime.path)
		const classification = hashFile(this.#options.classification)
		const ancestry = readClassification(classification, runtime, hashFile(this.#options.frozen))
		return [runtime, classification, ancestry.cache, ...ancestry.files]
	}

	#fetch(input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> {
		if (this.#options.phase !== 'generate' || !this.#options.live)
			return Promise.reject(new Error('offline refit refuses network access'))
		this.#signal.throwIfAborted()
		init?.signal?.throwIfAborted()
		if (this.#request !== undefined) this.#sent.add(this.#request)
		if (this.#request === 'judge') this.#requests += 1
		return fetch(input, init)
	}

	#judge(path: string, live: boolean, retry: number): JudgeCache {
		return new JudgeCache({
			judge: createOllamaJudge({
				url: this.#options.url,
				model: MICA_MODEL,
				system: MICA_SYSTEM,
				calibration: { temperature: MICA_CALIBRATION },
				options: { num_ctx: MICA_CONTEXT },
				timeout: TIMEOUT,
				fetch: (input: Parameters<typeof fetch>[0], init?: RequestInit) => this.#fetch(input, init),
			}),
			path,
			live,
			retry,
			abort: (error) => this.#abort.abort(error),
		})
	}

	async #freeze(): Promise<number> {
		const files = [...this.#files(), hashFile(join(this.#options.cache, 'judge.jsonl'))]
		const copy =
			this.#options.runtime === undefined
				? readCopy(this.#options.scenario)
				: projectCopy(readRuntime(this.#options.runtime))
		if (this.#options.runtime !== undefined) {
			if (this.#options.classification === undefined || this.#options.frozen === undefined)
				throw new Error('runtime refit lacks ancestry')
			const ancestry = readClassification(
				hashFile(this.#options.classification),
				hashFile(this.#options.runtime),
				hashFile(this.#options.frozen),
			)
			if (hashFile(join(this.#options.cache, 'judge.jsonl')).hash !== ancestry.cache.hash)
				throw new Error('refit freeze refuses foreign classification cache')
		}
		const judge = this.#judge(join(this.#options.cache, 'judge.jsonl'), false, 0)
		const provider = createOllama({
			model: this.#options.model,
			fetch: (input: Parameters<typeof fetch>[0], init?: RequestInit) => this.#fetch(input, init),
		})
		const system = buildSystem({ ledger: { system: copy.system } })
		const ledger = createLedger(provider, {
			judge,
			system,
			topics: copy.topics,
			questions: LEDGER_QUESTIONS,
			thresholds: FIT,
			capacity: SAMPLER.num_ctx,
			predict: 0,
		})
		const mirror = new Mirror(ledger, {
			judge,
			questions: LEDGER_QUESTIONS,
			topics: copy.topics,
			thresholds: FIT,
			system,
			reads: new Map<string, MirrorRead>([
				['lookup_order', readLookup],
				['lookup_customer', readLookup],
			]),
		})
		const classifier = new Classifier({
			conversation: ledger.conversation,
			judge,
			questions: LEDGER_QUESTIONS,
			topics: copy.topics,
			thresholds: FIT,
			assign: (message) => mirror.assign(message),
			entities: (text, partial) => matchEntities(collectRegistry(mirror.readings()), text, partial),
		})
		const requests = new Set<string>()
		const seeds = new Map<string, number>()
		const dates = new Map<string, string>()
		const contexts: RefitContext[] = []
		const points: RefitPoint[] = []
		let position = -1
		for (const goal of copy.goals) {
			this.#signal.throwIfAborted()
			if (goal.after > position) {
				appendSeed(ledger.conversation, copy.seed, position + 1, goal.after, seeds)
				position = goal.after
			}
			const request = ledger.conversation.add({ role: 'user', content: goal.request })
			mirror.note(request)
			requests.add(request.id)
			await classifier.classify(requests, this.#signal)
			this.#signal.throwIfAborted()
			if (Object.values(judge.stats().misses).some((count) => count > 0))
				throw new Error('freeze classification cache miss')
			const input = mirror.input()
			const projection = mirror.projection(input)
			for (const message of input.messages)
				if (!dates.has(message.id))
					dates.set(message.id, findDay(copy.days, seeds.get(message.id) ?? goal.after)?.date ?? '')
			points.push({
				goal: goal.id,
				request,
				input: {
					...input,
					owners: [...input.owners],
					entities: [...input.entities],
					classification: Object.fromEntries(
						Object.entries(input.classification).map(([key, value]) => [
							key,
							value instanceof Map ? [...value] : value,
						]),
					),
				},
				projection,
			})
			for (const topic of collectTopics(projection, input, mirror.owners(request))) {
				const sources = collectTopicSources(projection, input, topic, dates).map((source) => {
					const seed = seeds.get(source.id)
					if (seed === undefined) throw new Error('source lost seed identity')
					return { ...source, seed }
				})
				if (sources.length === 0) continue
				const members = collectTopicMembers(projection, input, topic)
				const listed = projection.stale
					.filter((line) => members.includes(line.source))
					.flatMap((line) => line.tokens)
				const date = findDay(copy.days, goal.after)?.date ?? ''
				contexts.push({
					id: randomUUID(),
					goal: goal.id,
					after: goal.after,
					topic,
					date,
					sources,
					owners: [...input.owners.values()].flat(),
					members,
					listed,
					stale: collectStaleTokens(
						[],
						listed,
						sources.map((source) => source.text),
					),
					prompt: buildSummaryPrompt(topic.key, topic.title, date, sources),
				})
			}
		}
		const corpus: RefitCorpus = {
			...(this.#options.runtime === undefined || this.#options.classification === undefined
				? {}
				: {
						sustained: {
							runtime: hashFile(this.#options.runtime),
							classification: hashFile(this.#options.classification),
						},
					}),
			mode: 'cold-build seed-only development',
			files,
			points,
			contexts,
		}
		verifyCorpus(corpus)
		verifyFiles(files)
		writeFileSync(join(this.#options.out, 'corpus.json'), `${JSON.stringify(corpus, null, 2)}\n`, {
			flag: 'wx',
		})
		writeFileSync(
			join(this.#options.out, 'manifest.json'),
			`${JSON.stringify({ corpus: hashFile(join(this.#options.out, 'corpus.json')).hash, requests: points.length, occurrences: contexts.length, initial: new Set(contexts.map((context) => computeDigest(context.prompt))).size, stats: judge.stats(), limitation: REFIT_LIMITATION }, null, 2)}\n`,
			{ flag: 'wx' },
		)
		return 0
	}

	#corpus(): RefitCorpus {
		const path = join(this.#options.corpus, 'corpus.json')
		const corpus = readJSON(path)
		const manifest = readJSON(join(this.#options.corpus, 'manifest.json'))
		if (!isRefitCorpus(corpus) || !isRecord(manifest) || manifest.corpus !== hashFile(path).hash)
			throw new Error('invalid corpus custody')
		verifyCorpus(corpus)
		verifyFiles(corpus.files)
		if (this.#options.frozen !== undefined) {
			const frozen = readFrozen(hashFile(this.#options.frozen))
			if (
				!isDeepStrictEqual(corpus.files.slice(0, -1), this.#files()) ||
				(this.#options.runtime === undefined
					? corpus.files.at(-1)?.hash !== frozen.seed.hash
					: corpus.sustained?.runtime.hash !== hashFile(this.#options.runtime).hash ||
						corpus.sustained.classification.hash !==
							hashFile(this.#options.classification ?? '').hash)
			)
				throw new Error('frozen corpus source/settings/seed population mismatch')
		}
		return corpus
	}

	#lineage(): readonly RefitFile[] {
		return ['judge.jsonl', 'summary.jsonl']
			.map((name) => join(this.#options.cache, name))
			.filter(existsSync)
			.map(hashFile)
	}

	async #generate(): Promise<number> {
		const corpus = this.#corpus()
		const files = this.#files()
		const model = this.#options.model
		const key = Object.entries(MODELS).find(([, tag]) => tag === model)?.[0]
		if (key === undefined) throw new Error('unknown model')
		const settings = readSettings(this.#options.settings, key)
		if (corpus.sustained !== undefined) {
			if (this.#options.frozen === undefined)
				throw new Error('runtime generation lacks frozen roles')
			const ancestry = readClassification(
				corpus.sustained.classification,
				corpus.sustained.runtime,
				hashFile(this.#options.frozen),
			)
			if (existsSync(this.#options.cache))
				throw new Error('runtime generation requires a separate new writable cache')
			mkdirSync(this.#options.cache, { recursive: true })
			writeFileSync(join(this.#options.cache, 'judge.jsonl'), readFileSync(ancestry.cache.path), {
				flag: 'wx',
			})
			writeFileSync(
				join(this.#options.cache, 'lineage.json'),
				JSON.stringify({
					runtime: ancestry.runtime.hash,
					classification: corpus.sustained.classification.hash,
					seed: ancestry.cache.hash,
				}),
				{ flag: 'wx' },
			)
		} else if (this.#options.frozen !== undefined) {
			const frozen = readFrozen(hashFile(this.#options.frozen))
			const custody = {
				summarizer: frozen.summarizer,
				judge: frozen.judge,
				source: frozen.files,
				seed: frozen.seed,
			}
			const lineage = join(this.#options.cache, 'lineage.json')
			const judgePath = join(this.#options.cache, 'judge.jsonl')
			if (existsSync(lineage)) {
				if (!isDeepStrictEqual(readJSON(lineage), custody))
					throw new Error('calibration cache configuration mismatch')
			} else {
				if (
					existsSync(join(this.#options.cache, 'summary.jsonl')) ||
					(existsSync(judgePath) && hashFile(judgePath).hash !== frozen.seed.hash)
				)
					throw new Error('calibration cache lacks fixed seed custody')
				mkdirSync(this.#options.cache, { recursive: true })
				writeFileSync(lineage, JSON.stringify(custody), { flag: 'wx' })
			}
			if (!existsSync(judgePath))
				writeFileSync(judgePath, readFileSync(frozen.seed.path), { flag: 'wx' })
		}
		const before = this.#lineage()
		// A failed judge call refuses preparation immediately; hidden retries cannot have unrecorded costs.
		const judge = this.#judge(join(this.#options.cache, 'judge.jsonl'), this.#options.live, 0)
		const summarizer = new Summarizer({
			provider: createOllama({
				url: this.#options.url,
				model,
				think: false,
				keepAlive: '30m',
				timeout: TIMEOUT,
				options: { ...SAMPLER, num_predict: settings.predict },
				fetch: (input: Parameters<typeof fetch>[0], init?: RequestInit) => this.#fetch(input, init),
			}),
			model,
			sampler: SAMPLER,
			predict: settings.predict,
			cache: join(this.#options.cache, 'summary.jsonl'),
			live: this.#options.live,
		})
		const attempts: RefitAttempt[] = []
		const summaries = new Map<string, RefitEvidence['summary'][number]>()
		const judgments = new Map<string, RefitEvidence['judge'][number]>()
		const errors: string[] = []
		writeFileSync(join(this.#options.out, 'attempts.jsonl'), '', { flag: 'wx' })
		for (const context of corpus.contexts) {
			let failures: readonly AggregateFailure[] = []
			for (let ordinal = 0; ordinal <= settings.retry; ordinal += 1) {
				const prompt = buildSummaryPrompt(
					context.topic.key,
					context.topic.title,
					context.date,
					context.sources,
					failures,
				)
				this.#sent.clear()
				this.#request = 'summarizer'
				const started = performance.now()
				let attempt: RefitAttempt = {
					id: randomUUID(),
					context: context.id,
					ordinal,
					prompt,
					key: buildSummaryKey({ model, sampler: SAMPLER, predict: settings.predict }, prompt),
					wall: 0,
				}
				try {
					this.#signal.throwIfAborted()
					const result = await summarizer.summarize(prompt, this.#signal)
					failures = checkProse(
						result.prose,
						[...context.sources.map(renderSource), context.topic.title, context.date],
						context.owners,
						context.stale,
					)
					attempt = {
						...attempt,
						...result,
						duration: isFiniteNumber(result.wall) ? result.wall : undefined,
						failures,
						state: buildAgreeState({ prose: result.prose }, context.sources),
					}
					const path = join(this.#options.cache, 'summary.jsonl')
					const row = readRows(path)
						.filter(isSummaryRow)
						.findLast((one) => one.key === attempt.key)
					if (row === undefined) throw new Error('missing observed summary row')
					summaries.set(row.key, { path, row })
					if (!isFiniteNumber(result.wall) || result.wall < 0)
						throw new Error('summary duration missing or invalid')
					if (!isRefitUsage(result.usage)) throw new Error('summary usage missing or invalid')
					if (failures.length === 0) {
						this.#request = 'judge'
						const support = await new Support({ judge, sent: () => this.#requests }).evaluate(
							result.prose,
							context.sources,
							this.#signal,
						)
						attempt = { ...attempt, judge: support }
						if (reduceSupport(support) === undefined)
							throw new Error('required contextual score missing or invalid')
						if (support.components.some((component) => !isRefitUsage(component.usage)))
							throw new Error('judge usage missing or invalid')
					}
				} catch (error) {
					attempt = {
						...attempt,
						error: describeError(error),
					}
					errors.push(`${attempt.id}: ${attempt.error}`)
				}
				attempt = {
					...attempt,
					wall: performance.now() - started,
					sent: this.#sent.has('summarizer'),
				}
				this.#request = undefined
				if (attempt.judge !== undefined)
					this.#retain(
						attempt.judge.components.map((component) => component.key),
						judgments,
					)

				attempts.push(attempt)
				appendFileSync(join(this.#options.out, 'attempts.jsonl'), `${JSON.stringify(attempt)}\n`)
				if (attempt.error !== undefined || failures.length === 0) break
			}
			if (this.#signal.aborted) break
		}
		const controls: RefitControl[] = []
		const archived = readRefitControls(this.#options.controls)
		const controlPath = join(this.#options.out, 'controls.jsonl')
		writeFileSync(controlPath, '', { flag: 'wx' })
		for (const control of archived) {
			let observed = control
			if (control.lexical && !this.#signal.aborted) {
				this.#request = 'judge'
				const support = await new Support({ judge, sent: () => this.#requests }).evaluate(
					control.candidate,
					control.sources,
					this.#signal,
				)
				this.#request = undefined
				observed = { ...control, support }
				this.#retain(
					support.components.map((component) => component.key),
					judgments,
				)
				if (
					reduceSupport(support) === undefined ||
					support.components.some((component) => !isRefitUsage(component.usage))
				)
					errors.push(control.id + ': incomplete fresh control support')
			} else if (control.lexical) errors.push(control.id + ': aborted control support')
			controls.push(observed)
			appendFileSync(controlPath, JSON.stringify(observed) + '\n')
		}
		const packet = attempts
			.map((attempt) => {
				const context = corpus.contexts.find((one) => one.id === attempt.context)
				if (context === undefined) throw new Error('attempt context disappeared')
				return buildRefitItem(attempt, context)
			})
			.sort((left, right) => left.id.localeCompare(right.id))
		writeFileSync(
			join(this.#options.out, 'packet.jsonl'),
			packet.map((item) => JSON.stringify(item)).join('\n') + '\n',
			{ flag: 'wx' },
		)
		if (new Set(attempts.map((attempt) => attempt.context)).size !== corpus.contexts.length)
			errors.push('incomplete occurrence coverage')
		verifyFiles(files)
		const evidence: RefitEvidence = {
			summary: [...summaries.values()],
			judge: [...judgments.values()],
		}
		const retained = join(this.#options.out, 'evidence.json')
		writeFileSync(retained, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx' })
		const manifest: RefitGeneration = {
			controls: hashFile(controlPath),
			sustained: corpus.sustained,
			...(this.#options.frozen === undefined
				? {}
				: { matrix: readFrozen(hashFile(this.#options.frozen)) }),
			corpus: hashFile(join(this.#options.corpus, 'corpus.json')).hash,
			attempts: hashFile(join(this.#options.out, 'attempts.jsonl')).hash,
			packet: hashFile(join(this.#options.out, 'packet.jsonl')).hash,
			evidence: hashFile(retained),
			files,
			model,
			settings,
			complete: errors.length === 0,
			errors,
			lineage: { before, after: this.#lineage() },
		}
		if (manifest.complete) verifyEvidence(attempts, evidence, manifest, judge.model, controls)
		writeFileSync(
			join(this.#options.out, 'manifest.json'),
			`${JSON.stringify(manifest, null, 2)}\n`,
			{ flag: 'wx' },
		)
		return manifest.complete ? 0 : 3
	}

	#retain(keys: readonly string[], judgments: Map<string, RefitEvidence['judge'][number]>): void {
		const path = join(this.#options.cache, 'judge.jsonl')
		const rows = existsSync(path) ? readRows(path).filter(isCacheRow) : []
		for (const key of keys) {
			const row = rows.findLast((one) => one.key === key)
			if (row !== undefined) judgments.set(key, { path, row })
		}
	}

	#fit(): number {
		const corpus = this.#corpus()
		const directory = this.#options.attempts
		const manifest = readJSON(join(directory, 'manifest.json'))
		if (!isRefitGeneration(manifest)) throw new Error('invalid generation contract')
		if (!isDeepStrictEqual(manifest.files, this.#files()))
			throw new Error('implementation custody membership mismatch')
		if (!isDeepStrictEqual(manifest.sustained, corpus.sustained))
			throw new Error('development corpus transfer identity differs')
		if (
			this.#options.frozen !== undefined &&
			!isDeepStrictEqual(manifest.matrix, readFrozen(hashFile(this.#options.frozen)))
		)
			throw new Error('generation role configuration differs from freeze')
		const controls = readRefitControls(this.#options.controls)
		writeFileSync(
			join(this.#options.out, 'controls.json'),
			`${JSON.stringify({ adjudication: readJSON(join(this.#options.controls, 'adjudication.json')), packet: readRows(join(this.#options.controls, 'packet.jsonl')), mapping: readRows(join(this.#options.controls, 'mapping.jsonl')), hashes: REFIT_CONTROL_HASHES }, null, 2)}\n`,
			{ flag: 'wx' },
		)
		const diagnosis = computeRefitAssessment(
			{
				manifest: hashFile(join(directory, 'manifest.json')),
				corpus: hashFile(join(this.#options.corpus, 'corpus.json')),
				attempts: hashFile(join(directory, 'attempts.jsonl')),
				packet: hashFile(join(directory, 'packet.jsonl')),
				labels: hashFile(this.#options.labels),
			},
			controls,
		)
		writeFileSync(
			join(this.#options.out, 'diagnosis.json'),
			`${JSON.stringify(diagnosis, null, 2)}\n`,
			{ flag: 'wx' },
		)
		if (!diagnosis.accepted) return 3
		writeFileSync(
			join(this.#options.out, 'fit.json'),
			`${JSON.stringify({ agree: diagnosis.cutoff, change: 0.56, separated: true, ...(manifest.sustained === undefined ? {} : { sustained: { runtime: manifest.sustained.runtime.hash, classification: manifest.sustained.classification.hash } }), ...(manifest.matrix === undefined ? {} : { matrix: { summarizer: manifest.matrix.summarizer, judge: manifest.matrix.judge, files: manifest.matrix.files, settings: manifest.matrix.settings.hash, seed: manifest.matrix.seed.hash }, preparation: { manifest: hashFile(join(directory, 'manifest.json')), attempts: hashFile(join(directory, 'attempts.jsonl')), corpus: hashFile(join(this.#options.corpus, 'corpus.json')), labels: hashFile(this.#options.labels) } }), custody: { corpus: diagnosis.custody.corpus, attempts: diagnosis.custody.attempts, packet: diagnosis.custody.packet, manifest: diagnosis.custody.manifest, labels: hashFile(this.#options.labels).hash }, limitation: REFIT_LIMITATION }, null, 2)}\n`,
			{ flag: 'wx' },
		)
		return 0
	}
}
