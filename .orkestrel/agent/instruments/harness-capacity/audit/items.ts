// Writes a blind audit set from the passed or failed rows of the named runs, and a key that maps each
// opaque id back to its run and goal:
//   node items.ts --dir RESULTS_DIR --rows passes|failures --items ITEMS_OUT (--keys KEY_DIR | --key KEY_OUT)
//     [--count N] [--variants DIR] [--seed FILE] RUN...
// --keys writes the key to KEY_DIR/key-ITEMS_NAME and wins over --key; KEY_DIR must lie outside the items file's
// directory, because the auditors read that directory. Each id is 8 hex characters of a hash over a random 16-byte
// salt that the run draws, the run, and the goal. The last output line is the JSON array of the item ids, for the
// chunk's `ids` in audit.js.
// --count N is the row count that a run file must hold (default 10). A run directory holding rows.jsonl reads that
// file; any other directory reads its first .jsonl file whose name does not start with `memory`.
// Without --variants, a control or compaction run (a name holding `control` or `compaction`) reads
// bench/variants/vN.json and every other run reads bench/variants/ledger/vN.json. --variants DIR makes every run read
// DIR/vN.json, for example bench/variants/long. --seed FILE names the scenario file whose `seed` the goals' fact
// indices address (default bench/scenario.json). A relative DIR or FILE resolves against the working directory.
// Rescored rows under RESULTS_DIR/rescored/RUN win over the run's own.
// Items sort by goal, then id, so no arm's rows sit together.
// Exit: 0 written; 1 when a run has no N-row file or two ids collide; 64 on usage, on a malformed --count, or on a key directory inside the items directory.
import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const VARIANTS = join(ROOT, 'bench', 'variants')
const SEED = join(ROOT, 'bench', 'scenario.json')
const COUNT = 10
const USAGE = 'usage: node items.ts --dir RESULTS_DIR --rows passes|failures --items ITEMS_OUT (--keys KEY_DIR | --key KEY_OUT) [--count N] [--variants DIR] [--seed FILE] RUN...\n'

interface Key {
	readonly id: string
	readonly run: string
	readonly goal: string
	readonly passed: boolean
}

function readFlag(argv: readonly string[], name: string): string | undefined {
	const at = argv.indexOf(name)
	if (at < 0) return undefined
	const value = argv[at + 1]
	return value === undefined || value.startsWith('--') ? undefined : value
}

function readCount(value: string | undefined): number | undefined {
	if (value === undefined) return COUNT
	return /^[1-9]\d*$/.test(value) ? Number(value) : undefined
}

function findRowFile(base: string): string | undefined {
	const names = readdirSync(base)
	return names.includes('rows.jsonl') ? 'rows.jsonl' : names.find((name) => name.endsWith('.jsonl') && !name.startsWith('memory'))
}

function readRows(dir: string, run: string, count: number): readonly Record<string, unknown>[] {
	for (const base of [join(dir, 'rescored', run), join(dir, run)]) {
		if (!existsSync(base)) continue
		const file = findRowFile(base)
		if (file === undefined) continue
		const rows = readFileSync(join(base, file), 'utf8')
			.split(/\r\n|\n/)
			.filter((line) => line.trim() !== '')
			.map((line): Record<string, unknown> => JSON.parse(line))
			.filter((row) => typeof row.goal === 'string')
		if (rows.length === count) return rows
	}
	return []
}

function locateScenario(variants: string | undefined, plain: boolean, copy: string): string {
	if (variants !== undefined) return join(resolve(variants), `v${copy}.json`)
	return plain ? join(VARIANTS, `v${copy}.json`) : join(VARIANTS, 'ledger', `v${copy}.json`)
}

function main(): number {
	const argv = process.argv.slice(2)
	const dir = readFlag(argv, '--dir')
	const which = readFlag(argv, '--rows')
	const itemsOut = readFlag(argv, '--items')
	const keyFile = readFlag(argv, '--key')
	const keyDir = readFlag(argv, '--keys')
	const variants = readFlag(argv, '--variants')
	const seedFile = readFlag(argv, '--seed')
	const count = readCount(readFlag(argv, '--count'))
	const flags = new Set(['--dir', '--rows', '--items', '--key', '--keys', '--count', '--variants', '--seed'])
	const runs = argv.filter((arg, at) => !arg.startsWith('--') && !flags.has(argv[at - 1] ?? ''))
	const keyOut = keyDir !== undefined && itemsOut !== undefined ? join(keyDir, `key-${basename(itemsOut)}`) : keyFile
	if (dir === undefined || (which !== 'passes' && which !== 'failures') || itemsOut === undefined || keyOut === undefined || runs.length === 0) {
		process.stderr.write(USAGE)
		return 64
	}
	if (count === undefined) {
		process.stderr.write(`--count takes a positive integer, not ${readFlag(argv, '--count')}\n`)
		return 64
	}
	if (keyDir !== undefined) {
		const away = relative(dirname(resolve(itemsOut)), resolve(keyDir))
		if (away === '' || (!away.startsWith('..') && !isAbsolute(away))) {
			process.stderr.write(`--keys ${keyDir} equals or lies inside the items directory ${dirname(resolve(itemsOut))}\n`)
			return 64
		}
	}
	const salt = randomBytes(16)
	const seed = JSON.parse(readFileSync(seedFile === undefined ? SEED : resolve(seedFile), 'utf8')).seed
	const items: Record<string, unknown>[] = []
	const keys: Key[] = []
	for (const run of runs) {
		const copy = /-v(\d+)$/.exec(run)?.[1]
		const rows = readRows(dir, run, count)
		if (copy === undefined || rows.length === 0) {
			process.stderr.write(`${run}: no ${count}-row file\n`)
			return 1
		}
		const plain = /control|compaction/.test(run)
		const scenario = JSON.parse(readFileSync(locateScenario(variants, plain, copy), 'utf8'))
		for (const row of rows) {
			const passed = row.success === true
			if (passed !== (which === 'passes')) continue
			const goal = scenario.goals.find((entry: { id: string }) => entry.id === row.goal)
			const id = createHash('sha256').update(salt).update(`${run}\0${String(row.goal)}`).digest('hex').slice(0, 8)
			if (keys.some((key) => key.id === id)) {
				process.stderr.write(`${run} ${String(row.goal)}: id ${id} collides; run again\n`)
				return 1
			}
			items.push({
				id,
				goal: row.goal,
				request: goal.request,
				facts: (goal.facts ?? []).map((index: number) => seed[index].content),
				scoring: { expected: goal.expected, expectedAny: goal.expectedAny, forbidden: goal.forbidden, forbiddenPatterns: goal.forbiddenPatterns, tools: goal.tools },
				...(passed ? {} : { failure: { missing: row.missing, forbiddenHit: row.violations, patternsHit: row.patternViolations, replyVia: row.replyVia } }),
				reply: typeof row.reply === 'string' ? row.reply : '',
			})
			keys.push({ id, run, goal: String(row.goal), passed })
		}
	}
	const order = (left: Record<string, unknown>, right: Record<string, unknown>): number => String(left.goal).localeCompare(String(right.goal)) || String(left.id).localeCompare(String(right.id))
	items.sort(order)
	writeFileSync(itemsOut, `${JSON.stringify(items, null, 1)}\n`)
	if (keyDir !== undefined) mkdirSync(keyDir, { recursive: true })
	writeFileSync(keyOut, `${JSON.stringify(keys, null, 1)}\n`)
	process.stdout.write(`items ${items.length}\n${JSON.stringify(items.map((item) => item.id))}\n`)
	return 0
}

process.exit(main())
