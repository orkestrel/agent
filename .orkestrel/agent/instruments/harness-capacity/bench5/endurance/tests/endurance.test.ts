import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { arrayOf, isRecord, isString } from '@orkestrel/contract'
import { isEnduranceRuntime, isEnduranceOracle } from '../validators.js'
import { isEnduranceError } from '../errors.js'
import {
	readRuntime,
	readOracle,
	projectCopy,
	inspectRuntime,
	inspectOracle,
	measureWorkload,
	collectObligations,
} from '../helpers.js'
import { ENDURANCE_ROOT, ENDURANCE_CORPORA } from './constants.js'
import { isEnduranceMutation } from './validators.js'
import { mutateArtifact } from './helpers.js'
import { resolveLookup } from '../../helpers.js'

describe('frozen endurance workloads', () => {
	it('parses both disjoint complete horizons and refuses private input at the live loader', () => {
		for (const corpus of ENDURANCE_CORPORA) {
			const runtime = readRuntime(join(ENDURANCE_ROOT, 'runtime', `${corpus}.json`))
			const oracle = readOracle(join(ENDURANCE_ROOT, 'private', `${corpus}.json`))
			assert.deepEqual(inspectOracle(runtime, oracle), [])
			assert.equal(runtime.days.length, corpus === 'evaluation' ? 24 : 32)
			assert.equal(runtime.goals.length, corpus === 'evaluation' ? 96 : 128)
			assert.equal(runtime.topics.length, corpus === 'evaluation' ? 12 : 8)
			assert.throws(
				() => readRuntime(join(ENDURANCE_ROOT, 'private', `${corpus}.json`)),
				isEnduranceError,
			)
			const copy = projectCopy(runtime)
			assert.equal(copy.seed.length, runtime.seed.length)
			assert.ok(copy.seed.every((source) => source.role === 'user'))
			for (const goal of copy.goals)
				for (const scores of [
					goal.facts,
					goal.stale,
					goal.expected,
					goal.expectedAny,
					goal.forbidden,
					goal.forbiddenPatterns,
				])
					assert.deepEqual(scores, [])
			assert.equal(JSON.stringify(copy).includes('"mandatory":'), false)
			assert.equal(JSON.stringify(copy).includes('"critical":'), false)
			assert.notEqual(copy.seed, runtime.seed)
			assert.notEqual(copy.tables.lookups, runtime.lookups)
		}
	})

	it('bounds current sources and per-goal load with the actual distinct development horizon', () => {
		const evaluation = readRuntime(join(ENDURANCE_ROOT, 'runtime/evaluation.json'))
		const development = readRuntime(join(ENDURANCE_ROOT, 'runtime/development.json'))
		const evaluated = measureWorkload(
			evaluation,
			readOracle(join(ENDURANCE_ROOT, 'private/evaluation.json')),
		)
		const developed = measureWorkload(
			development,
			readOracle(join(ENDURANCE_ROOT, 'private/development.json')),
		)
		for (const name of ['shift', 'request', 'sources', 'current'] as const)
			assert.ok(
				developed.bounds[name] >= evaluated.bounds[name],
				`${name}: development ${developed.bounds[name]} < evaluation ${evaluated.bounds[name]}`,
			)
		for (const census of [evaluated, developed]) {
			assert.ok(census.bounds.initial < 3072)
			assert.ok(census.bounds.shift < 3072)
		}
		assert.deepEqual(
			evaluated.checkpoints.map((checkpoint) => checkpoint.shift),
			[4, 8, 12, 16, 20, 24],
		)
		const developmentText = JSON.stringify(development)
		for (const topic of evaluation.topics) assert.equal(developmentText.includes(topic.name), false)
		for (const lookup of evaluation.lookups)
			assert.equal(developmentText.includes(lookup.id), false)
		for (const source of evaluation.seed)
			assert.equal(
				development.seed.some(
					(entry) => entry.id === source.id || entry.content === source.content,
				),
				false,
			)
	})

	it('reuses actual lookup version semantics before and at every scheduled release', () => {
		for (const corpus of ENDURANCE_CORPORA) {
			const runtime = readRuntime(join(ENDURANCE_ROOT, 'runtime', `${corpus}.json`))
			const copy = projectCopy(runtime)
			for (const version of runtime.lookups) {
				assert.equal(
					resolveLookup(copy.tables, version.tool, version.id, version.from),
					version.text,
				)
				const previous = runtime.lookups
					.filter(
						(entry) =>
							entry.tool === version.tool && entry.id === version.id && entry.from < version.from,
					)
					.at(-1)
				if (previous === undefined)
					assert.notEqual(
						resolveLookup(copy.tables, version.tool, version.id, version.from - 1),
						version.text,
					)
				else
					assert.equal(
						resolveLookup(copy.tables, version.tool, version.id, version.from - 1),
						previous.text,
					)
			}
		}
	})

	it('rejects every frozen negative control through real JSON files and the actual checkers', () => {
		const controls: unknown = JSON.parse(
			readFileSync(join(ENDURANCE_ROOT, 'private/invalid.json'), 'utf8'),
		)
		assert.ok(arrayOf(isEnduranceMutation)(controls))
		assert.deepEqual(
			new Set(controls.map((control) => control.id)),
			new Set([
				'shifted-arrival',
				'future-lookup',
				'broken-dependency',
				'wrong-calculation',
				'premature-closure',
				'nested-private',
				'tool-private',
				'fact-version',
			]),
		)
		const runtime = readRuntime(join(ENDURANCE_ROOT, 'runtime/evaluation.json'))
		const oracle = readOracle(join(ENDURANCE_ROOT, 'private/evaluation.json'))
		const directory = mkdtempSync(resolve('tmp/endurance-control-'))
		try {
			for (const control of controls) {
				const mutated = mutateArtifact(control.target === 'runtime' ? runtime : oracle, control)
				const path = join(directory, `${control.id}.json`)
				writeFileSync(path, JSON.stringify(mutated))
				const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
				if (control.target === 'runtime') {
					const reasons = isEnduranceRuntime(parsed) ? inspectRuntime(parsed) : ['runtime schema']
					assert.ok(
						reasons.some((reason) => reason.includes(control.reason)),
						`${control.id}: ${reasons.join(',')}`,
					)
					assert.throws(() => readRuntime(path), isEnduranceError)
				} else {
					assert.ok(isEnduranceOracle(parsed), 'oracle mutation must reach semantic validation')
					assert.ok(
						inspectOracle(runtime, parsed).some((reason) => reason.includes(control.reason)),
						control.id,
					)
				}
			}
		} finally {
			rmSync(directory, { recursive: true, force: true })
		}
	})

	it('tracks closure, withdrawal, reopening, and distant original-price dependencies', () => {
		const runtime = readRuntime(join(ENDURANCE_ROOT, 'runtime/evaluation.json'))
		const oracle = readOracle(join(ENDURANCE_ROOT, 'private/evaluation.json'))
		const closure = runtime.seed.findIndex((source) => source.id === 'ev-side-5')
		const reopening = runtime.goals.find((goal) => goal.id === 'ev-15-1')?.after
		assert.ok(reopening !== undefined)
		assert.equal(
			collectObligations(oracle, closure).some((obligation) => obligation.id === 'BC-7303.enquiry'),
			false,
		)
		assert.equal(
			collectObligations(oracle, reopening).find(
				(obligation) => obligation.id === 'BC-7303.enquiry',
			)?.version,
			2,
		)
		assert.equal(
			collectObligations(oracle, runtime.seed.length - 1).some(
				(obligation) => obligation.id === 'BC-7312.acceptance',
			),
			false,
		)
		assert.equal(
			collectObligations(oracle, runtime.seed.length - 2).some(
				(obligation) => obligation.id === 'BC-7312.acceptance',
			),
			true,
		)
		assert.ok(
			oracle.goals
				.find((goal) => goal.goal === 'ev-13-2')
				?.distant.some(
					(link) => link.source === 'ev-source-1-2' && link.requirement.includes('$42.50'),
				),
		)
		assert.equal(
			runtime.seed
				.filter((source) => source.shift >= 2 && source.shift <= 12)
				.some((source) => source.content.includes('Mara') || source.content.includes('BC-7301')),
			false,
		)
		assert.deepEqual(
			new Set(oracle.controls.map((control) => control.verdict)),
			new Set(['stale', 'fabricated', 'ambiguous']),
		)
		for (const control of oracle.controls)
			assert.equal(JSON.stringify(runtime).includes(control.artifact), false)
	})

	it('provides every transition in both halves and evidence for every required dimension', () => {
		for (const corpus of ENDURANCE_CORPORA) {
			const runtime = readRuntime(join(ENDURANCE_ROOT, 'runtime', `${corpus}.json`))
			const oracle = readOracle(join(ENDURANCE_ROOT, 'private', `${corpus}.json`))
			const midpoint = runtime.days.length / 2
			for (const early of [true, false]) {
				const transitions = new Set(
					oracle.facts
						.filter((fact) => (runtime.seed[fact.from]?.shift ?? 0) <= midpoint === early)
						.map((fact) => fact.transition),
				)
				assert.deepEqual(
					transitions,
					new Set(['arrival', 'repetition', 'correction', 'withdrawal', 'supersession', 'tool']),
				)
			}
			for (const rubric of oracle.goals)
				assert.deepEqual(
					new Set(rubric.atoms.map((atom) => atom.dimension)),
					new Set(['facts', 'work', 'obligations', 'revision', 'evidence']),
				)
			const active = collectObligations(oracle, runtime.seed.length - 1)
			if (corpus === 'development') {
				assert.ok(active.some((obligation) => obligation.id === 'DV-8401.statement'))
				for (const order of ['DV-8402', 'DV-8405', 'DV-8406', 'DV-8407'])
					assert.equal(
						active.some((obligation) => obligation.id === `${order}.work`),
						false,
					)
			}
		}
	})

	it('pins every data artifact and the estimator to exact frozen bytes with a failing tamper control', () => {
		const manifest: unknown = JSON.parse(
			readFileSync(join(ENDURANCE_ROOT, 'manifest.json'), 'utf8'),
		)
		assert.ok(isRecord(manifest) && Array.isArray(manifest.files))
		assert.ok(manifest.files.length >= 5)
		for (const entry of manifest.files) {
			assert.ok(isRecord(entry) && isString(entry.path) && isString(entry.hash))
			const bytes = readFileSync(resolve(entry.path))
			assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.hash, entry.path)
			assert.notEqual(
				createHash('sha256')
					.update(Buffer.concat([bytes, Buffer.from(' ')]))
					.digest('hex'),
				entry.hash,
			)
		}
	})

	it('refuses hostile structural input without throwing from total guards', () => {
		const cyclic: Record<string, unknown> = {}
		cyclic['seed'] = cyclic
		assert.equal(isEnduranceRuntime(cyclic), false)
		assert.equal(isEnduranceOracle(cyclic), false)
		assert.equal(
			isEnduranceRuntime(
				new Proxy(
					{},
					{
						ownKeys: () => {
							throw new Error('hostile keys')
						},
					},
				),
			),
			false,
		)
		const oracle = readOracle(join(ENDURANCE_ROOT, 'private/evaluation.json'))
		assert.equal(
			isEnduranceOracle({
				...oracle,
				facts: oracle.facts.map((fact, index) =>
					index === 0 ? { ...fact, transition: ['arrival'] } : fact,
				),
			}),
			false,
		)
	})
})
