// Runs a planned series of benchmark runs one at a time through run-one.ts, resumable and inside a time
// budget, so one launch under the dispatch skill's launch.ts covers several runs:
//   node series.ts --plan PLAN.json --base OUT_BASE --budget SECONDS
// PLAN.json is an array of { name, harness, estimate, args }: `estimate` is the seconds one run is expected
// to take before any run of its arm has finished. A run whose end line in OUT_BASE/run.log reads exit 0 is
// skipped. Before each run the series stops when the elapsed time plus the run's estimate would pass the
// budget; after a run of an arm finishes, that arm's estimate becomes 1.3 times its longest finished run.
// An arm is the run name without its `-vN` copy suffix.
// The series refuses to start when run.log holds a start line with no end line, because that run might still be
// going or have left a partial output; remove the line only after you confirm the run is gone.
// Exit: 0 when the plan finishes or the budget stops it; 1 when a run exits nonzero; 2 when a run is unfinished; 64 on usage.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const ROOT = dirname(import.meta.dirname)
const RUN_ONE = join(ROOT, 'tools', 'run-one.ts')
const MARGIN = 1.3

interface Planned {
	readonly name: string
	readonly harness: string
	readonly estimate: number
	readonly args: readonly string[]
}

function readFlag(argv: readonly string[], name: string): string | undefined {
	const at = argv.indexOf(name)
	if (at < 0) return undefined
	const value = argv[at + 1]
	return value === undefined || value.startsWith('--') ? undefined : value
}

function readPlan(file: string): readonly Planned[] | undefined {
	const value: unknown = JSON.parse(readFileSync(file, 'utf8'))
	if (!Array.isArray(value)) return undefined
	const plan: Planned[] = []
	for (const entry of value) {
		if (typeof entry?.name !== 'string' || typeof entry.harness !== 'string' || typeof entry.estimate !== 'number' || !Array.isArray(entry.args)) return undefined
		plan.push({ name: entry.name, harness: entry.harness, estimate: entry.estimate, args: entry.args.map(String) })
	}
	return plan
}

// Each finished run's seconds by name, from the start and end lines of run.log; a run that ended nonzero is left out.
function readFinished(log: string): ReadonlyMap<string, number> {
	const finished = new Map<string, number>()
	if (!existsSync(log)) return finished
	const starts = new Map<string, number>()
	for (const line of readFileSync(log, 'utf8').split(/\r\n|\n/)) {
		const start = /^===== (\S+) start (\S+)/.exec(line)
		if (start !== null) starts.set(start[1], Date.parse(start[2]))
		const end = /^===== (\S+) end (\S+) exit (\d+)/.exec(line)
		if (end !== null && end[3] === '0' && starts.has(end[1])) finished.set(end[1], (Date.parse(end[2]) - (starts.get(end[1]) ?? 0)) / 1000)
	}
	return finished
}

// The names whose start line has no end line after it.
function readOpen(log: string): readonly string[] {
	const open = new Set<string>()
	if (!existsSync(log)) return []
	for (const line of readFileSync(log, 'utf8').split(/\r\n|\n/)) {
		const start = /^===== (\S+) start /.exec(line)
		if (start !== null) open.add(start[1])
		const end = /^===== (\S+) end /.exec(line)
		if (end !== null) open.delete(end[1])
	}
	return [...open]
}

function armOf(name: string): string {
	return name.replace(/-v\d+$/, '')
}

function main(): number {
	const argv = process.argv.slice(2)
	const planFile = readFlag(argv, '--plan')
	const base = readFlag(argv, '--base')
	const budget = Number(readFlag(argv, '--budget'))
	const plan = planFile === undefined ? undefined : readPlan(planFile)
	if (plan === undefined || base === undefined || !Number.isFinite(budget) || budget <= 0) {
		process.stderr.write('usage: node series.ts --plan PLAN.json --base OUT_BASE --budget SECONDS\n')
		return 64
	}
	const began = Date.now()
	const log = join(base, 'run.log')
	const open = readOpen(log)
	if (open.length > 0) {
		process.stderr.write(`series: ${log} holds a start line with no end line for ${open.join(', ')}; confirm the run is gone, then remove its start line\n`)
		return 2
	}
	for (const run of plan) {
		const finished = readFinished(log)
		if (finished.has(run.name)) continue
		const longest = Math.max(0, ...[...finished].filter(([name]) => armOf(name) === armOf(run.name)).map(([, seconds]) => seconds))
		const estimate = longest > 0 ? longest * MARGIN : run.estimate
		const elapsed = (Date.now() - began) / 1000
		if (elapsed + estimate > budget) {
			process.stdout.write(`stopped: ${run.name} needs about ${Math.round(estimate)} s and ${Math.round(budget - elapsed)} s remain\n`)
			return 0
		}
		process.stdout.write(`run ${run.name} (estimate ${Math.round(estimate)} s, elapsed ${Math.round(elapsed)} s)\n`)
		const result = spawnSync(process.execPath, [RUN_ONE, run.name, run.harness, base, '--', ...run.args], { stdio: ['ignore', 'inherit', 'inherit'] })
		if (result.status !== 0) {
			process.stdout.write(`failed: ${run.name} exit ${result.status ?? 'none'}\n`)
			return 1
		}
	}
	process.stdout.write('done\n')
	return 0
}

process.exit(main())
