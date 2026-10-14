import { BUILD } from '../constants.js'
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { MODELS } from '../constants.js'

const HARNESS = dirname(dirname(import.meta.dirname))
const PLAN = join(BUILD, 'bench5', 'plan.js')
const RUN_ONE = join(BUILD, 'tools', 'run-one.js')
const scratch = mkdtempSync(join(tmpdir(), 'plan-'))
const thrower = join(scratch, 'thrower.mjs')
let written = 0

interface Outcome {
	readonly status: number | null
	readonly stdout: string
	readonly stderr: string
}

function spawnNode(args: readonly string[], cwd: string): Outcome {
	const outcome = spawnSync(process.execPath, args, { cwd, encoding: 'utf8' })
	return { status: outcome.status, stdout: outcome.stdout, stderr: outcome.stderr }
}

// Writes a plan and returns its entries as series.ts reads them.
function writePlan(
	args: readonly string[],
	cwd: string = HARNESS,
): { readonly outcome: Outcome; readonly entries: ReadonlyArray<Record<string, unknown>> } {
	written += 1
	const out = join(scratch, `plan-${written}`, 'plan.json')
	const outcome = spawnNode([PLAN, '--archive', ...args, '--out', out], cwd)
	const parsed: unknown = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : []
	const entries = Array.isArray(parsed)
		? parsed.filter(
				(entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null,
			)
		: []
	return { outcome, entries }
}

// Starts run-one.ts under a preload that replaces fetch with a thrower, so a daemon request cannot leave the test.
function runOne(args: readonly string[]): Outcome {
	return spawnNode(['--import', pathToFileURL(thrower).href, RUN_ONE, ...args], HARNESS)
}

before(() => {
	writeFileSync(
		thrower,
		"globalThis.fetch = () => { throw new Error('fetch is blocked in this test') }\n",
	)
})

after(() => {
	rmSync(scratch, { recursive: true, force: true })
})

describe('plan.ts', () => {
	it('writes eight entries for q2 copies 1-4 in the order control, aggregate, aggregate, control', () => {
		const { outcome, entries } = writePlan([
			'--models',
			'q2',
			'--copies',
			'1-4',
			'--cache',
			join(scratch, 'cache'),
		])
		assert.equal(outcome.status, 0)
		assert.deepEqual(
			entries.map((entry) => entry.name),
			[
				'l5-q2-control-v1',
				'l5-q2-aggregatefill-v1',
				'l5-q2-aggregate-v2',
				'l5-q2-control-v2',
				'l5-q2-control-v3',
				'l5-q2-aggregate-v3',
				'l5-q2-aggregate-v4',
				'l5-q2-control-v4',
			],
		)
	})

	it('writes the harness and the driver arguments of each entry', () => {
		const cache = join(scratch, 'cache')
		const { entries } = writePlan(['--models', 'q2', '--copies', '2-2', '--cache', cache])
		assert.equal(entries.length, 2)
		assert.deepEqual(entries[0], {
			name: 'l5-q2-aggregate-v2',
			harness: 'bench5',
			estimate: entries[0].estimate,
			args: [
				'--run',
				'--live',
				'--copy',
				'2',
				'--model',
				MODELS.q2,
				'--arm',
				'aggregate',
				'--cache',
				cache,
			],
		})
		assert.deepEqual(entries[1].args, [
			'--run',
			'--live',
			'--copy',
			'2',
			'--model',
			MODELS.q2,
			'--arm',
			'control',
			'--cache',
			cache,
		])
		assert.ok(entries.every((entry) => entry.harness === 'bench5'))
	})

	it('writes the cache path absolute and resolved against the working directory', () => {
		const { outcome, entries } = writePlan(
			['--models', 'q2', '--copies', '1-1', '--cache', join('tmp', 'l5', 'cache')],
			scratch,
		)
		assert.equal(outcome.status, 0)
		for (const entry of entries) {
			const args = entry.args
			assert.ok(Array.isArray(args))
			const cache = args[args.indexOf('--cache') + 1]
			assert.equal(typeof cache, 'string')
			assert.ok(isAbsolute(String(cache)))
			assert.equal(cache, resolve(scratch, 'tmp', 'l5', 'cache'))
		}
	})

	it('keeps the series.ts plan shape: a string name and harness, a finite estimate, and string arguments', () => {
		const { entries } = writePlan([
			'--models',
			'g4',
			'--copies',
			'1-3',
			'--cache',
			join(scratch, 'cache'),
		])
		assert.equal(entries.length, 6)
		for (const entry of entries) {
			assert.equal(typeof entry.name, 'string')
			assert.equal(typeof entry.harness, 'string')
			assert.ok(
				typeof entry.estimate === 'number' && Number.isFinite(entry.estimate) && entry.estimate > 0,
			)
			assert.ok(Array.isArray(entry.args) && entry.args.every((arg) => typeof arg === 'string'))
		}
	})

	it('estimates 60 x 1.3 x the projected minutes, with copy 1 of the aggregate arm kept apart', () => {
		const { entries } = writePlan([
			'--models',
			'q2',
			'--copies',
			'1-2',
			'--cache',
			join(scratch, 'cache'),
		])
		const estimates = new Map(entries.map((entry) => [entry.name, entry.estimate]))
		assert.equal(estimates.get('l5-q2-control-v1'), Math.round(60 * 1.3 * 17.0))
		assert.equal(estimates.get('l5-q2-control-v2'), Math.round(60 * 1.3 * 17.0))
		assert.equal(estimates.get('l5-q2-aggregatefill-v1'), Math.round(60 * 1.3 * 49.6))
		assert.equal(estimates.get('l5-q2-aggregate-v2'), Math.round(60 * 1.3 * 25.6))
	})

	it('names only the first aggregate entry of each model with the aggregatefill token', () => {
		const { entries } = writePlan([
			'--models',
			'q2,g4',
			'--copies',
			'1-3',
			'--cache',
			join(scratch, 'cache'),
		])
		const names = entries.map((entry) => String(entry.name))
		assert.deepEqual(
			names.filter((name) => name.includes('aggregatefill')),
			['l5-q2-aggregatefill-v1', 'l5-g4-aggregatefill-v1'],
		)
		assert.equal(names.filter((name) => /-aggregate-v\d+$/.test(name)).length, 4)
		assert.ok(names.every((name) => !name.includes('control') || /-control-v\d+$/.test(name)))
	})

	it('orders several models one after another, each in copy order', () => {
		const { entries } = writePlan([
			'--models',
			'g2,q4',
			'--copies',
			'1-2',
			'--cache',
			join(scratch, 'cache'),
		])
		assert.deepEqual(
			entries.map((entry) => entry.name),
			[
				'l5-g2-control-v1',
				'l5-g2-aggregatefill-v1',
				'l5-g2-aggregate-v2',
				'l5-g2-control-v2',
				'l5-q4-control-v1',
				'l5-q4-aggregatefill-v1',
				'l5-q4-aggregate-v2',
				'l5-q4-control-v2',
			],
		)
		const models = entries.map((entry) =>
			Array.isArray(entry.args) ? entry.args[entry.args.indexOf('--model') + 1] : undefined,
		)
		assert.deepEqual(models, [
			MODELS.g2,
			MODELS.g2,
			MODELS.g2,
			MODELS.g2,
			MODELS.q4,
			MODELS.q4,
			MODELS.q4,
			MODELS.q4,
		])
	})

	it('exits 64 on a usage fault and writes no plan', () => {
		const cache = join(scratch, 'cache')
		const faults: ReadonlyArray<readonly string[]> = [
			['--models', 'zz', '--copies', '1-2', '--cache', cache],
			['--models', 'q2,q2', '--copies', '1-2', '--cache', cache],
			['--models', 'q2', '--copies', '1', '--cache', cache],
			['--models', 'q2', '--copies', '4-2', '--cache', cache],
			['--models', 'q2', '--copies', '0-2', '--cache', cache],
			['--models', 'q2', '--copies', '1-9', '--cache', cache],
			['--models', 'q2', '--copies', '1-2'],
			['--copies', '1-2', '--cache', cache],
			['--models', 'q2', '--copies', '1-2', '--cache', cache, '--bogus', 'x'],
		]
		for (const fault of faults) {
			const { outcome, entries } = writePlan(fault)
			assert.equal(outcome.status, 64, fault.join(' '))
			assert.match(outcome.stderr, /usage: node bench5\/plan\.ts/)
			assert.equal(entries.length, 0)
		}
		assert.equal(
			spawnNode([PLAN, '--archive', '--models', 'q2', '--copies', '1-2', '--cache', cache], HARNESS)
				.status,
			64,
		)
	})
})

describe('run-one.ts', () => {
	const base = join(scratch, 'base')

	before(() => {
		mkdirSync(base, { recursive: true })
	})

	it('exits 2 for a bench5 run whose output directory exists, before any cold start', () => {
		mkdirSync(join(base, 'l5-q2-control-v1'))
		const outcome = runOne(['l5-q2-control-v1', 'bench5', base, '--', '--run', '--live'])
		assert.equal(outcome.status, 2)
		assert.match(outcome.stderr, /already has output/)
		assert.doesNotMatch(outcome.stdout, /cold start/)
		assert.equal(existsSync(join(base, 'run.log')), false)
	})

	it('exits 2 for an existing log or wire directory of a bench5 run', () => {
		writeFileSync(join(base, 'l5-q2-aggregatefill-v1.log'), '')
		assert.equal(
			runOne(['l5-q2-aggregatefill-v1', 'bench5', base, '--', '--run', '--live']).status,
			2,
		)
		mkdirSync(join(base, 'l5-g2-control-v1-wire'))
		assert.equal(runOne(['l5-g2-control-v1', 'bench5', base, '--', '--run', '--live']).status, 2)
		assert.equal(existsSync(join(base, 'run.log')), false)
	})

	it('keeps exit 2 for an existing bench and bench3 output', () => {
		mkdirSync(join(base, 'v1-records'))
		assert.equal(runOne(['v1-records', 'bench3', base, '--', '--mode', 'ledger']).status, 2)
		assert.equal(runOne(['v1-records', 'bench', base, '--', '--mode', 'none']).status, 2)
		assert.equal(existsSync(join(base, 'run.log')), false)
	})

	it('exits 64 for an unknown harness, before the existing-output check and any cold start', () => {
		const outcome = runOne(['l5-q2-control-v1', 'bench4', base, '--', '--run'])
		assert.equal(outcome.status, 64)
		assert.match(outcome.stderr, /usage: node run-one\.ts NAME bench\|bench3\|bench5 OUT_BASE/)
		assert.equal(existsSync(join(base, 'run.log')), false)
	})

	it('exits 64 when the separator or an argument is missing', () => {
		assert.equal(runOne(['l5-q2-control-v9', 'bench5', base]).status, 64)
		assert.equal(runOne(['l5-q2-control-v9', 'bench5', base, '--run']).status, 64)
		assert.equal(runOne(['l5-q2-control-v9', 'bench5']).status, 64)
		assert.equal(existsSync(join(base, 'run.log')), false)
	})
})
