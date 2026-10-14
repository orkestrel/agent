import { Matrix } from './matrix/Matrix.js'
// Writes the aggregate arm's plan for tools/series.ts, interleaved by copy so a series stopped early still holds whole pairs:
//   node bench5/plan.ts --models q2[,g2,...] --copies A-B --cache DIR --out FILE
// Each model key is a `MODELS` key, and A-B is a range of copies from 1 to 8. DIR and FILE resolve against the
// working directory, and the plan carries DIR as an absolute path because run-one.ts starts the driver inside bench5/.
// The entries of a model run in copy order; the control arm runs first on an odd copy and the aggregate arm first on an even one.
// The estimate of an entry is 60 x 1.3 x the projected minutes of its arm, where copy 1 of the aggregate arm
// carries the cache-filling overhead that later copies do not; the pilot's measurements replace the projection.
// Exit: 0; 64 on usage.
import type { PlanEntry, ArchiveArm } from './types.js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { MODELS } from './constants.js'

const USAGE = 'usage: node bench5/plan.ts --models q2[,g2,...] --copies A-B --cache DIR --out FILE'
const SECONDS = 60
const MARGIN = 1.3
const FIRST = 1
const LAST = 8
// Minutes per 24-goal copy: the control arm, and the aggregate arm on copy 1 and on each later copy.
const PROJECTION: {
	readonly [Key in keyof typeof MODELS]: {
		readonly control: number
		readonly first: number
		readonly later: number
	}
} = Object.freeze({
	q2: { control: 17.0, first: 49.6, later: 25.6 },
	q4: { control: 22.5, first: 55.9, later: 31.9 },
	g2: { control: 19.1, first: 52.0, later: 28.0 },
	g4: { control: 25.3, first: 59.1, later: 35.1 },
})

function isModelKey(value: string): value is keyof typeof MODELS {
	return Object.hasOwn(MODELS, value)
}

function listArms(copy: number): readonly ArchiveArm[] {
	return copy % 2 === 1 ? ['control', 'aggregate'] : ['aggregate', 'control']
}

function estimateRun(key: keyof typeof MODELS, arm: ArchiveArm, copy: number): number {
	const row = PROJECTION[key]
	const minutes = arm === 'control' ? row.control : copy === FIRST ? row.first : row.later
	return Math.round(SECONDS * MARGIN * minutes)
}

// The first aggregate copy fills the caches, so series.ts must not price later copies from it; report.ts reads the token as copy 1.
function nameArm(arm: ArchiveArm, copy: number): string {
	return arm === 'aggregate' && copy === FIRST ? 'aggregatefill' : arm
}

function buildEntry(
	key: keyof typeof MODELS,
	arm: ArchiveArm,
	copy: number,
	cache: string,
): PlanEntry {
	return {
		name: `l5-${key}-${nameArm(arm, copy)}-v${copy}`,
		harness: 'bench5',
		estimate: estimateRun(key, arm, copy),
		args: [
			'--run',
			'--live',
			'--copy',
			String(copy),
			'--model',
			MODELS[key],
			'--arm',
			arm,
			'--cache',
			cache,
		],
	}
}

function main(argv: readonly string[]): number {
	let values
	try {
		values = parseArgs({
			args: [...argv],
			options: {
				models: { type: 'string' },
				copies: { type: 'string' },
				cache: { type: 'string' },
				out: { type: 'string' },
			},
			strict: true,
			allowPositionals: false,
		}).values
	} catch (error) {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n${USAGE}\n`)
		return 64
	}
	const range = /^(\d+)-(\d+)$/.exec(values.copies ?? '')
	const keys = (values.models ?? '').split(',')
	const first = range === null ? 0 : Number(range[1])
	const last = range === null ? 0 : Number(range[2])
	const problems: string[] = []
	if (
		values.models === undefined ||
		keys.some((key) => !isModelKey(key)) ||
		new Set(keys).size !== keys.length
	)
		problems.push(`--models must name distinct keys from ${Object.keys(MODELS).join(', ')}`)
	if (range === null || first < FIRST || last > LAST || first > last)
		problems.push(`--copies must be a range A-B within ${FIRST}-${LAST}`)
	if (values.cache === undefined || values.cache === '')
		problems.push('--cache must name a directory')
	if (values.out === undefined || values.out === '') problems.push('--out must name a file')
	if (problems.length > 0 || values.cache === undefined || values.out === undefined) {
		process.stderr.write(`${problems.join('\n')}\n${USAGE}\n`)
		return 64
	}
	const cache = resolve(values.cache)
	const out = resolve(values.out)
	const plan: PlanEntry[] = []
	for (const key of keys) {
		if (!isModelKey(key)) continue
		for (let copy = first; copy <= last; copy += 1) {
			for (const arm of listArms(copy)) plan.push(buildEntry(key, arm, copy, cache))
		}
	}
	mkdirSync(dirname(out), { recursive: true })
	writeFileSync(out, `${JSON.stringify(plan, null, '\t')}\n`)
	process.stdout.write(`${plan.length} runs written to ${out}\n`)
	return 0
}

process.exitCode = process.argv.includes('--archive')
	? main(process.argv.slice(2).filter((arg) => arg !== '--archive'))
	: await Matrix.execute(['plan', ...process.argv.slice(2)])
