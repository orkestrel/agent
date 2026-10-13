// One benchmark run from a cold daemon with its wire recorded. Run it under the dispatch skill's
// launch.ts so the harness tracks it and a cap ends it:
//   node run-one.ts NAME bench|bench3 OUT_BASE -- HARNESS_ARGS...
// It unloads every model, appends a start line to OUT_BASE/run.log, runs the harness with the
// record-fetch preload writing OUT_BASE/NAME-wire, sends the harness output to OUT_BASE/NAME.log,
// appends an end line, and prints the pass count, the median seconds per answer, the largest
// prompt, and one line per goal. It supersedes run-one.sh, which ran the same steps in bash.
// It refuses, before the cold start, when OUT_BASE/NAME, OUT_BASE/NAME.log, or OUT_BASE/NAME-wire exists, and
// ends the start line with the harness file's SHA-256 as `harness-sha256 HEX`.
// Exit: the harness's exit code; 2 when an output already exists; 3 when the cold start fails; 64 on usage.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, closeSync, existsSync, openSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const TOOLS = '/home/user/agent/tmp/bench/results/v7/tools'
const HARNESSES: ReadonlySet<string> = new Set(['bench', 'bench3'])

interface Row {
	readonly goal: string
	readonly success: boolean
	readonly replyVia: string
	readonly reply: string
	readonly wall: number
	readonly maxPrompt: number
}

function readRow(line: string): Row | undefined {
	let value: unknown
	try {
		value = JSON.parse(line)
	} catch {
		return undefined
	}
	if (typeof value !== 'object' || value === null || !('goal' in value) || typeof value.goal !== 'string') return undefined
	return {
		goal: value.goal,
		success: 'success' in value && value.success === true,
		replyVia: 'replyVia' in value && typeof value.replyVia === 'string' ? value.replyVia : '',
		reply: 'reply' in value && typeof value.reply === 'string' ? value.reply : '',
		wall: 'wall' in value && typeof value.wall === 'number' ? value.wall : 0,
		maxPrompt: 'maxPrompt' in value && typeof value.maxPrompt === 'number' ? value.maxPrompt : 0,
	}
}

function readRows(out: string): readonly Row[] {
	if (!existsSync(out)) return []
	const file = readdirSync(out).find((name) => name.endsWith('.jsonl') && !name.startsWith('memory'))
	if (file === undefined) return []
	return readFileSync(join(out, file), 'utf8')
		.split(/\r\n|\n/)
		.flatMap((line) => {
			const row = readRow(line)
			return row === undefined ? [] : [row]
		})
}

function median(values: readonly number[]): number {
	const sorted = [...values].sort((left, right) => left - right)
	if (sorted.length === 0) return 0
	return (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2
}

function main(): number {
	const argv = process.argv.slice(2)
	const split = argv.indexOf('--')
	const [name, harness, base] = argv
	if (split !== 3 || name === undefined || harness === undefined || base === undefined || !HARNESSES.has(harness)) {
		process.stderr.write('usage: node run-one.ts NAME bench|bench3 OUT_BASE -- HARNESS_ARGS...\n')
		return 64
	}
	const args = argv.slice(split + 1)
	const out = join(base, name)
	const log = join(base, 'run.log')
	const taken = [out, `${out}.log`, `${out}-wire`].filter((path) => existsSync(path))
	if (taken.length > 0) {
		process.stderr.write(`run-one: ${name} already has output, which a rerun would overwrite: ${taken.join(', ')}\n`)
		return 2
	}
	const sha = createHash('sha256').update(readFileSync(join('/home/user/agent/tmp', harness, 'bench.mjs'))).digest('hex')
	const cold = spawnSync(process.execPath, [join(TOOLS, 'cold-start.mjs')], { stdio: 'inherit' })
	if (cold.status !== 0) return 3
	appendFileSync(log, `===== ${name} start ${new Date().toISOString().replace(/\.\d+Z$/, 'Z')} [${harness} ${args.join(' ')}] harness-sha256 ${sha}\n`)
	const sink = openSync(`${out}.log`, 'w')
	const run = spawnSync(process.execPath, ['--import', join(TOOLS, 'record-fetch.mjs'), 'bench.mjs', ...args, '--out', out], {
		cwd: join('/home/user/agent/tmp', harness),
		env: { ...process.env, RECORD_DIR: `${out}-wire` },
		stdio: ['ignore', sink, sink],
	})
	closeSync(sink)
	const code = run.status ?? 1
	appendFileSync(log, `===== ${name} end ${new Date().toISOString().replace(/\.\d+Z$/, 'Z')} exit ${code}\n`)
	const rows = readRows(out)
	process.stdout.write(`exit ${code}\n`)
	if (rows.length === 0) {
		process.stdout.write('no rows\n')
		return code
	}
	process.stdout.write(`Passed ${rows.filter((row) => row.success).length} of ${rows.length}\n`)
	process.stdout.write(`median s per answer ${(median(rows.map((row) => row.wall)) / 1000).toFixed(1)} | max prompt ${Math.max(...rows.map((row) => row.maxPrompt))}\n`)
	for (const row of rows) process.stdout.write(`${row.goal.slice(0, 3)} ${row.success ? 'PASS' : 'fail'} ${row.replyVia} | ${row.reply.replace(/\s+/g, ' ').slice(0, 110)}\n`)
	return code
}

process.exit(main())
