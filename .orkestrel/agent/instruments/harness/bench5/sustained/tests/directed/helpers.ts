import type { DirectedFixture } from './types.js'
import type { SustainedDirected, SustainedExecution } from '../../types.js'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import assert from 'node:assert/strict'
import { isRecord } from '@orkestrel/contract'
import { HARNESS } from '../../../constants.js'
import { readBuild } from '../../../build/helpers.js'
import { readJSON } from '../../../helpers.js'
import { readMatrixFiles, buildBudget } from '../../../matrix/helpers.js'
import { isMatrixFreeze } from '../../../matrix/validators.js'
import { hashFile } from '../../../refit/helpers.js'
import { isRefitFile } from '../../../refit/validators.js'

/** Constructs disposable custody for real reader tests without approving a live execution.
 * @param think - If true, uses the retained thinking budget; if false, uses the non-thinking budget
 * @returns Test manifests and original role identity
 */
export function buildDirectedFixture(think: boolean): DirectedFixture {
	const parent = resolve('tmp/units/aggregate-continuous-directed-implementation-fixtures')
	mkdirSync(parent, { recursive: true })
	const directory = mkdtempSync(join(parent, 'proof-'))
	const root = resolve('.orkestrel/agent/instruments/results')
	const custody = join(root, 'l16/custody/transfer')
	const receipt = hashFile(join(custody, 'aggregate-continuous-transfer-proof-receipt.json'))
	const historical = hashFile(
		join(root, 'l15', think ? 'q4-think1' : 'q4-think0', 'freeze/manifest.json'),
	)
	const original = readJSON(historical.path)
	assert.ok(isMatrixFreeze(original))
	const frozen = { ...original, files: readMatrixFiles() }
	const frozenPath = join(directory, 'freeze.json')
	writeFileSync(frozenPath, JSON.stringify(frozen))
	const before = readJSON(join(custody, 'source/build-manifest.json'))
	assert.ok(isRecord(before) && Array.isArray(before.sources) && before.sources.every(isRefitFile))
	const sources = before.sources
	const changes = readBuild()
		.sources.filter(
			(file) => !sources.some((entry) => entry.path === file.path && entry.hash === file.hash),
		)
		.map((file) => ({ path: resolve(HARNESS, file.path), hash: file.hash }))
	const review = join(directory, 'fixture-review.txt')
	writeFileSync(
		review,
		'Offline reader fixture only. This is not root acceptance or permission to run live inference.',
	)
	const runtime = hashFile(
		resolve('.orkestrel/agent/instruments/units/aggregates/endurance/runtime/evaluation.json'),
	)
	const directed: SustainedDirected = {
		protocol: 'e1',
		authority: 'user-directed',
		key: 'q4',
		think,
		frozen: hashFile(frozenPath),
		runtime,
		budget: buildBudget(think ? 1024 : 512),
		limits: {
			calls: 4096,
			tokens: 4000000,
			wall: 28800000,
			goals: 96,
			retries: original.configuration.retry,
			derivation: 'Offline admission fixture for prospective limits.',
			evidence: [receipt],
		},
		seed: 18,
		order: ['records', 'aggregate'],
		blind: think ? 31 : 29,
		transfer: {
			receipt,
			archive: join(custody, 'source'),
			historical,
			resource: hashFile(
				join(root, 'l15', think ? 'q4-think1' : 'q4-think0', 'resource/manifest.json'),
			),
			fit: hashFile(join(root, 'l15/calibration/q4/fit/fit.json')),
			diagnosis: hashFile(join(root, 'l15/calibration/q4/fit/diagnosis.json')),
			review: hashFile(review),
			changes,
		},
	}
	const path = join(directory, 'directed.json')
	writeFileSync(path, JSON.stringify(directed))
	const execution: SustainedExecution = {
		protocol: 'e1',
		key: 'q4',
		think,
		phase: 'filing',
		arm: 'records',
		frozen: directed.frozen,
		resource: directed.transfer.resource,
		runtime,
		budget: directed.budget,
		limits: directed.limits,
		directed: hashFile(path),
	}
	writeFileSync(join(directory, 'execution.json'), JSON.stringify(execution))
	return { directory, path, directed, frozen, execution }
}
