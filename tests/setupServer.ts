import type {
	StudyGrading,
	StudyLabels,
	StudyManifest,
	StudyRubric,
} from '../app/core/studies/types.js'
import type { StudySealedResult } from '../app/server/studies/stores/types.js'
import type { RouteInput } from '@orkestrel/router'
import type { ServerInterface } from '@orkestrel/server'
import { StudyResults } from '../app/server/studies/stores/StudyResults.js'
import {
	encodeStudyJSON,
	hashStudyBytes,
	readStudyResult,
} from '../app/server/studies/stores/helpers.js'
import { buildCustodyAttempt, buildCustodyManifest, buildStudyRubric } from './setupStudy.js'
import { createDispatcher } from '@orkestrel/router'
import { createServer } from '@orkestrel/server'

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
