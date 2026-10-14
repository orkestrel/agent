import type {
	MemoryContextFixture,
	MemoryModuleFixture,
	MemoryProfileFixture,
	MemoryReplyFixture,
	MemoryServerFixture,
	MemoryWireFixture,
} from './service/studies/memory/types.js'
import type { StudyEvidence, StudyProfile } from '@orkestrel/study'
import type { StudyToolsFixture } from './service/studies/tools/types.js'
import { parseJSON } from '@orkestrel/contract'
import {
	parseStudyDefinition,
	parseStudyProfile,
	parseStudyRubric,
	parseStudyScenario,
	buildStudySchedule,
	validateStudyInputs,
} from '@orkestrel/study'
import { isStudyCustodyEvidence } from '@orkestrel/study/server'
import { createServer } from 'node:http'
import { cp, mkdir, mkdtemp, rm, symlink, readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { StudyControl, StudyMeter, StudyScope } from '@orkestrel/study'

/** Starts a native loopback Ollama protocol fixture on an ephemeral port. */
export async function createMemoryServer(
	responses: readonly MemoryWireFixture[] = [],
): Promise<MemoryServerFixture> {
	const queue = [...responses]
	const requests: MemoryServerFixture['requests'] = []
	const server = createServer(async (request, response) => {
		const chunks: Buffer[] = []
		for await (const chunk of request)
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
		requests.push({ path: request.url ?? '', body: Buffer.concat(chunks).toString('utf8') })
		if (request.url === '/api/tags' && queue[0]?.path !== '/api/tags') {
			response.end(
				JSON.stringify({
					models: [
						{ name: 'model', digest: 'a'.repeat(64) },
						{ name: 'judge', digest: 'b'.repeat(64) },
					],
				}),
			)
			return
		}
		const supplied = queue[0]?.path === request.url ? queue.shift() : undefined
		if (supplied !== undefined) {
			response.writeHead(supplied.status ?? 200)
			if (supplied.open === true) response.write(supplied.body)
			else response.end(supplied.body)
			return
		}
		if (request.url === '/api/show') {
			response.end(
				JSON.stringify({
					model_info: { 'general.architecture': 'fixture', 'fixture.context_length': 32768 },
				}),
			)
			return
		}
		if (request.url === '/api/generate') {
			response.end(
				JSON.stringify({
					model: 'judge',
					done: true,
					done_reason: 'length',
					response: 'A',
					prompt_eval_count: 10,
					eval_count: 1,
					logprobs: [
						{
							token: 'A',
							logprob: -0.01,
							top_logprobs: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Yes', 'No'].map(
								(token, index) => ({ token, logprob: index === 0 || token === 'Yes' ? -0.01 : -8 }),
							),
						},
					],
				}),
			)
			return
		}
		response.end(buildMemoryReply())
	})
	await new Promise<void>((resolveListen, reject) => {
		server.once('error', reject)
		server.listen(0, '127.0.0.1', resolveListen)
	})
	const address = server.address()
	if (address === null || typeof address === 'string')
		throw new Error('Missing native fixture address')
	return {
		url: `http://127.0.0.1:${address.port}`,
		requests,
		responses: queue,
		close: () =>
			new Promise<void>((resolveClose, reject) => {
				server.closeAllConnections()
				server.close((error) => (error === undefined ? resolveClose() : reject(error)))
			}),
	}
}

/** Builds inert protocol output consumed by the actual Ollama package. */
export function buildMemoryReply(options: MemoryReplyFixture = {}): string {
	return `${JSON.stringify({ model: 'model', done: true, done_reason: options.reason ?? 'stop', message: { role: 'assistant', content: options.content ?? 'Receipt retained.', ...(options.calls === undefined ? {} : { tool_calls: options.calls }) }, ...(options.unknown === true ? {} : { prompt_eval_count: options.prompt ?? 10, eval_count: options.completion ?? 2 }) })}\n`
}

/** Builds a finite CPU-only profile with explicit fixture digests. */
export function buildMemoryProfile(options: MemoryProfileFixture): StudyProfile {
	return {
		name: 'cpu-fixture',
		subject: 'dist/src/core/index.js',
		roots: [],
		qualification: 'tmp/unused-capacity',
		provider: {
			entry: 'unchanged-staged-ollama',
			url: options.url,
			model: 'model',
			judge: 'judge',
			digest: { model: 'a'.repeat(64), judge: 'b'.repeat(64) },
		},
		room: { context: 32768, output: 512, safety: 128, recap: 256, think: false, ...options.room },
		bounds: {
			request: { duration: 2000, calls: 1, tokens: 32768, bytes: 1048576 },
			goal: { duration: 15000, calls: 256, tokens: 8388608, bytes: 268435456 },
			trial: { duration: 30000, calls: 512, tokens: 16777216, bytes: 536870912 },
			series: { duration: 60000, calls: 1024, tokens: 33554432, bytes: 1073741824 },
		},
	}
}

/** Creates actual hierarchical request accounting and an evidence recorder. */
export function createMemoryContext(
	profile: StudyProfile,
	signal = new AbortController().signal,
): MemoryContextFixture {
	const control = new StudyControl(signal)
	const series = new StudyScope({ label: 'series', limit: profile.bounds.series, control })
	const trial = new StudyScope({ label: 'trial', limit: profile.bounds.trial, control })
	const goal = new StudyScope({ label: 'goal', limit: profile.bounds.goal, control })
	const meter = new StudyMeter({
		request: profile.bounds.request,
		scopes: [series, trial, goal],
		control,
	})
	const evidence: StudyEvidence[] = []
	return {
		context: {
			signal,
			meter,
			evidence: {
				append: async (row) => {
					evidence.push(row)
				},
			},
		},
		evidence,
		close: () => {
			meter.close()
			goal.close()
			trial.close()
			series.close()
			control.close()
		},
	}
}

/** Stages unchanged public provider bytes with ordinary resolution to the selected Agent. */
export async function createMemoryModules(): Promise<MemoryModuleFixture> {
	const directory = await mkdtemp(resolve('tmp/memory-modules-'))
	try {
		const packages = join(directory, 'node_modules', '@orkestrel')
		await mkdir(packages, { recursive: true })
		await mkdir(join(packages, 'ollama'))
		await cp(resolve('../ollama/package.json'), join(packages, 'ollama/package.json'))
		await cp(resolve('../ollama/dist'), join(packages, 'ollama/dist'), { recursive: true })
		await symlink(resolve('.'), join(packages, 'agent'), 'junction')
		await symlink(
			resolve('../ollama/node_modules/@orkestrel/ndjson'),
			join(packages, 'ndjson'),
			'junction',
		)
		const subject: unknown = await import(pathToFileURL(resolve('dist/src/core/index.js')).href)
		const provider: unknown = await import(
			pathToFileURL(join(packages, 'ollama/dist/src/core/index.js')).href
		)
		return {
			subject,
			provider,
			close: () => rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 10 }),
		}
	} catch (error) {
		await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 10 })
		throw error
	}
}

/**
 * Loads actual CPU tool declarations and the built subject for mechanism proofs.
 * @returns Actual declarations and a built ESM namespace
 */
export async function loadStudyToolsFixture(): Promise<StudyToolsFixture> {
	const root = new URL('../studies/tools/', import.meta.url)
	const definition = parseStudyDefinition(
		parseJSON(await readFile(new URL('study.json', root), 'utf8')),
	)
	const profile = parseStudyProfile(
		parseJSON(await readFile(new URL('profiles/local.json', root), 'utf8')),
	)
	const rubric = parseStudyRubric(parseJSON(await readFile(new URL('rubric.json', root), 'utf8')))
	const scenarios = await Promise.all(
		definition.scenarios.map(async (name) =>
			parseStudyScenario(
				parseJSON(await readFile(new URL(`scenarios/${name}.json`, root), 'utf8')),
			),
		),
	)
	validateStudyInputs(definition, scenarios, rubric, profile)
	const manifest = {
		version: 1 as const,
		id: 'a'.repeat(64),
		created: '2026-10-14T12:00:00.000Z',
		identity: {
			subject: 'a'.repeat(64),
			provider: undefined,
			instrument: 'b'.repeat(64),
			fixtures: 'c'.repeat(64),
			profile: 'd'.repeat(64),
		},
		qualification: undefined,
		host: {},
		definition,
		scenarios,
		schedule: buildStudySchedule(definition, scenarios),
		bounds: profile.bounds,
	}
	return { manifest, rubric, profile, subject: await import('../dist/src/core/index.js') }
}

/**
 * Reads retained tool evidence through the JSON parser and custody guard.
 * @param directory - The retained result directory
 * @param trial - The scheduled trial identity
 * @returns Ordered validated evidence rows
 */
export async function readStudyToolsEvidence(
	directory: string,
	trial: string,
): Promise<readonly StudyEvidence[]> {
	const text = await readFile(
		join(directory, 'execution', 'trials', trial, 'evidence.jsonl'),
		'utf8',
	)
	const rows: StudyEvidence[] = []
	for (const line of text.split(/\r\n|\n/)) {
		if (line === '') continue
		const row = parseJSON(line)
		if (!isStudyCustodyEvidence(row)) throw new Error('Retained fixture contains invalid evidence')
		rows.push(row)
	}
	return Object.freeze(rows)
}
