import type {
	StudyGrading,
	StudyEvidence,
	StudyLabels,
	StudyManifest,
	StudyRubric,
} from '../app/core/studies/types.js'
import type { StudyToolsFixture } from './app/server/studies/tools/types.js'
import type { StudySealedResult } from '../app/server/studies/stores/types.js'
import type { RouteInput } from '@orkestrel/router'
import type { ServerInterface } from '@orkestrel/server'
import type { ScratchInterface } from '@orkestrel/test/server'
import { parseJSON } from '@orkestrel/contract'
import { createScratch } from '@orkestrel/test/server'
import { cpSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	parseStudyDefinition,
	parseStudyProfile,
	parseStudyRubric,
	parseStudyScenario,
} from '../app/core/studies/parsers.js'
import { buildStudySchedule, validateStudyInputs } from '../app/core/studies/helpers.js'
import { isStudyCustodyEvidence } from '../app/server/studies/stores/validators.js'
import { readFile } from 'node:fs/promises'
import { StudyResults } from '../app/server/studies/stores/StudyResults.js'
import {
	buildStudyPacket,
	buildStudyPacketLinks,
	encodeStudyJSON,
	hashStudyBytes,
	readStudyResult,
} from '../app/server/studies/stores/helpers.js'
import {
	buildCustodyAttempt,
	buildCustodyManifest,
	buildStudyManifest,
	buildStudyRubric,
} from './setupStudy.js'
import { createDispatcher } from '@orkestrel/router'
import { createServer } from '@orkestrel/server'

/**
 * Builds supplied neutral labels for a real sealed semantic packet.
 * @param result - The sealed fixture execution
 * @param rubric - The independently retained rubric
 * @param labeler - The supplied accountable labeler; Default: human-v1
 * @returns Original imported neutral labels ready for exact-byte custody
 */
export function buildCustodyPacketLabels(
	result: StudySealedResult,
	rubric: StudyRubric,
	labeler = 'human-v1',
): StudyLabels {
	const original = buildCustodyLabels(result, labeler)
	const packet = buildStudyPacket(result, rubric, hashStudyBytes(encodeStudyJSON(rubric)))
	const link = buildStudyPacketLinks(result, rubric).find(
		(entry) =>
			entry.source.trial === original.judgments[0]?.trial &&
			entry.source.criterion === original.judgments[0]?.criterion,
	)
	if (packet === undefined || link === undefined) throw new Error('Missing semantic packet fixture')
	return {
		...original,
		packet: hashStudyBytes(packet.content),
		judgments: original.judgments.map((judgment) => ({
			...judgment,
			trial: link.trial,
			criterion: link.criterion,
		})),
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
		...buildStudyManifest(),
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

/**
 * Creates an offline command fixture with an observable selected-code import marker.
 * @returns The owned scratch repository; callers destroy it in finally
 */
export function createStudyCommandFixture(): ScratchInterface {
	const repository = fileURLToPath(new URL('../', import.meta.url))
	const scratch = createScratch({ prefix: 'study-command-' })
	try {
		cpSync(join(repository, 'tools', 'artifacts'), join(scratch.path, 'tools', 'artifacts'), {
			recursive: true,
		})
		cpSync(join(repository, 'studies', 'tools'), join(scratch.path, 'studies', 'tools'), {
			recursive: true,
		})
		scratch.write('dist/app/server/main.cjs', 'module.exports = {}\n')
		scratch.write(
			'subject/package.json',
			JSON.stringify({ name: '@study/command-fixture', version: '1', type: 'module' }),
		)
		scratch.write(
			'subject/dist/index.js',
			"import { writeFileSync } from 'node:fs'\nwriteFileSync(new URL('../imported.txt', import.meta.url), 'loaded')\nexport const marker = true\n",
		)
		const source = scratch.read('studies/tools/profiles/local.json')
		if (source === undefined) throw new Error('Tools fixture profile is missing')
		const profile = parseStudyProfile(parseJSON(source))
		scratch.write(
			'studies/tools/profiles/local.json',
			new TextDecoder().decode(
				encodeStudyJSON({ ...profile, subject: 'subject/dist/index.js', roots: ['subject'] }),
			),
		)
		return scratch
	} catch (error) {
		scratch.destroy()
		throw error
	}
}

/**
 * Creates a protocol fixture server bound to IPv4 loopback on an ephemeral port.
 *
 * @remarks
 * The caller owns start and stop. After start resolves, stop it in a finally block.
 * Each call creates its own dispatcher and listener; no process lifecycle hook is installed.
 *
 * @param routes - The real dispatcher routes served by this fixture
 * @returns An unstarted server whose caller owns cleanup
 * @example
 * ```ts
 * const server = createFixtureServer([{ method: 'POST', path: '/answer', handler: () => Response.json({ answer: 1 }) }])
 * const port = await server.start()
 * try { await fetch('http://127.0.0.1:' + port + '/answer', { method: 'POST' }) }
 * finally { await server.stop() }
 * ```
 */
export function createFixtureServer(routes: readonly RouteInput[]): ServerInterface<undefined> {
	return createServer({
		dispatcher: createDispatcher({ routes }),
		state: () => undefined,
		host: '127.0.0.1',
		port: 0,
	})
}

/**
 * Retains a complete fixture through the real append-only execution store.
 * @param directory - The nonexistent result directory inside an owned scratch resource
 * @param manifest - The execution declaration; Default: a fresh custody manifest
 * @returns The independently verified sealed execution
 */
export async function retainStudyFixture(
	directory: string,
	manifest: StudyManifest = buildCustodyManifest(),
): Promise<StudySealedResult> {
	const results = new StudyResults({ directory, manifest })
	await results.create()
	for (const trial of manifest.schedule) {
		const sink = await results.start(trial)
		await sink.append({ event: 'saved', goal: 'write', value: 'remember' })
		await results.finish(buildCustodyAttempt(manifest, trial))
	}
	await results.seal()
	const reading = await readStudyResult(directory)
	if (reading.status !== 'sealed') throw new Error('Fixture execution did not seal')
	return reading
}

/**
 * Builds complete predicate judgments while preserving unknown semantic grades.
 * @param result - The verified execution
 * @param rubric - The independently held rubric
 * @param labels - The optional imported semantic labels
 * @returns The complete grading bound to exact imported bytes
 */
export function buildCustodyGrading(
	result: StudySealedResult,
	rubric: StudyRubric = buildStudyRubric(),
	labels?: StudyLabels,
): StudyGrading {
	return {
		version: 1,
		result: result.seal.id,
		rubric: hashStudyBytes(encodeStudyJSON(rubric)),
		grader: 'predicate-v1',
		instrument: 'b'.repeat(64),
		attempts: result.manifest.schedule.map((trial) => trial.id),
		labels: labels === undefined ? undefined : hashStudyBytes(encodeStudyJSON(labels)),
		judgments: result.manifest.schedule.flatMap((trial) =>
			rubric.criteria
				.filter((criterion) => criterion.scenario === trial.scenario)
				.map((criterion) => {
					const imported = labels?.judgments.find(
						(judgment) => judgment.trial === trial.id && judgment.criterion === criterion.id,
					)
					if (imported !== undefined) return imported
					return {
						trial: trial.id,
						criterion: criterion.id,
						verdict: criterion.method === 'semantic' ? 'unknown' : 'achieved',
						method: criterion.method === 'semantic' ? 'human' : criterion.method,
						reason:
							criterion.method === 'semantic'
								? 'No imported semantic labels'
								: 'Recorded fixture state',
						references:
							criterion.method === 'semantic' ? [] : [`trials/${trial.id}/evidence.jsonl#1`],
					}
				}),
		),
	}
}

/**
 * Builds an attributable imported semantic judgment without a generated timestamp.
 * @param result - The sealed execution supplying a scheduled trial
 * @param labeler - The supplied accountable labeler
 * @returns The inert labels artifact
 */
export function buildCustodyLabels(result: StudySealedResult, labeler = 'human-v1'): StudyLabels {
	const trial = result.manifest.schedule[0]
	if (trial === undefined) throw new Error('Fixture has no trial')
	return {
		packet: result.seal.id,
		labeler,
		version: '1',
		created: '2026-10-14T12:00:00.000Z',
		usage: [],
		judgments: [
			{
				trial: trial.id,
				criterion: `${trial.scenario}-read`,
				verdict: 'achieved',
				method: 'human',
				reason: 'Supplied relevant recall label',
				references: [`trials/${trial.id}/attempt.json`],
			},
		],
	}
}
