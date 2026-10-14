// Writes a blind audit set from the passed or failed rows of the named runs, and a key that maps each
// opaque id back to its run and goal:
//   node items.ts --dir RESULTS_DIR --rows passes|failures --items ITEMS_OUT (--keys KEY_DIR | --key KEY_OUT) RUN...
// --keys writes the key to KEY_DIR/key-ITEMS_NAME and wins over --key; KEY_DIR must lie outside the items file's
// directory, because the auditors read that directory. Each id is 8 hex characters of a hash over a random 16-byte
// salt that the run draws, the run, and the goal. The last output line is the JSON array of the item ids, for the
// chunk's `ids` in audit.js.
// A control or compaction run (a name holding `control` or `compaction`) reads variants/vN.json; every other
// run reads variants/ledger/vN.json. Rescored rows under RESULTS_DIR/rescored/RUN win over the run's own.
// Items sort by goal, then id, so no arm's rows sit together.
// Exit: 0 written; 1 when a run has no 10-row file or two ids collide; 64 on usage or a key directory inside the items directory.
import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const VARIANTS = join(ROOT, 'bench', 'variants')
const SEED = join(ROOT, 'bench', 'scenario.json')

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

function readRows(dir: string, run: string): readonly Record<string, unknown>[] {
	for (const base of [join(dir, 'rescored', run), join(dir, run)]) {
		if (!existsSync(base)) continue
		const file = readdirSync(base).find((name) => name.endsWith('.jsonl') && !name.startsWith('memory'))
		if (file === undefined) continue
		const rows = readFileSync(join(base, file), 'utf8')
			.split(/\r\n|\n/)
			.filter((line) => line.trim() !== '')
			.map((line): Record<string, unknown> => JSON.parse(line))
			.filter((row) => typeof row.goal === 'string')
		if (rows.length === 10) return rows
	}
	return []
}

function main(): number {
	const argv = process.argv.slice(2)
	const dir = readFlag(argv, '--dir')
	const which = readFlag(argv, '--rows')
	const itemsOut = readFlag(argv, '--items')
	const keyFile = readFlag(argv, '--key')
	const keyDir = readFlag(argv, '--keys')
	const flags = new Set(['--dir', '--rows', '--items', '--key', '--keys'])
	const runs = argv.filter((arg, at) => !arg.startsWith('--') && !flags.has(argv[at - 1] ?? ''))
	if (dir === undefined || (which !== 'passes' && which !== 'failures') || itemsOut === undefined || (keyDir === undefined && keyFile === undefined) || runs.length === 0) {
		process.stderr.write('usage: node items.ts --dir RESULTS_DIR --rows passes|failures --items ITEMS_OUT (--keys KEY_DIR | --key KEY_OUT) RUN...\n')
		return 64
	}
	if (keyDir !== undefined) {
		const away = relative(dirname(resolve(itemsOut)), resolve(keyDir))
		if (away === '' || (!away.startsWith('..') && !isAbsolute(away))) {
			process.stderr.write(`--keys ${keyDir} equals or lies inside the items directory ${dirname(resolve(itemsOut))}\n`)
			return 64
		}
	}
	const keyOut = keyDir === undefined ? (keyFile as string) : join(keyDir, `key-${basename(itemsOut)}`)
	const salt = randomBytes(16)
	const seed = JSON.parse(readFileSync(SEED, 'utf8')).seed
	const items: Record<string, unknown>[] = []
	const keys: Key[] = []
	for (const run of runs) {
		const copy = /-v(\d+)$/.exec(run)?.[1]
		const rows = readRows(dir, run)
		if (copy === undefined || rows.length === 0) {
			process.stderr.write(`${run}: no 10-row file\n`)
			return 1
		}
		const plain = /control|compaction/.test(run)
		const scenario = JSON.parse(readFileSync(plain ? join(VARIANTS, `v${copy}.json`) : join(VARIANTS, 'ledger', `v${copy}.json`), 'utf8'))
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
