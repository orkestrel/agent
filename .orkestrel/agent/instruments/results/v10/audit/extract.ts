// Writes a blind audit set from the failed rows of the named runs, skipping rows an earlier set
// already holds, and a key that maps each opaque id back to its run:
//   node extract.ts ITEMS_OUT KEY_OUT EARLIER_KEY RUN...
// A records run reads variants/ledger/vN.json; every other run reads variants/vN.json.
// Rescored rows win over the run's own. It supersedes the inline extraction of items.json.
// Exit: 0 written; 64 on usage.
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const RESULTS = '/home/user/agent/tmp/bench/results/v10'
const VARIANTS = '/home/user/agent/tmp/bench/variants'

interface Key {
	readonly id: string
	readonly run: string
	readonly goal: string
}

function readRows(run: string): readonly Record<string, unknown>[] {
	for (const base of [join(RESULTS, 'rescored', run), join(RESULTS, run)]) {
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
	const [itemsOut, keyOut, earlierKey, ...runs] = process.argv.slice(2)
	if (itemsOut === undefined || keyOut === undefined || earlierKey === undefined || runs.length === 0) {
		process.stderr.write('usage: node extract.ts ITEMS_OUT KEY_OUT EARLIER_KEY RUN...\n')
		return 64
	}
	const seen = new Set((JSON.parse(readFileSync(earlierKey, 'utf8')) as readonly Key[]).map((entry) => `${entry.run} ${entry.goal}`))
	const seed = JSON.parse(readFileSync('/home/user/agent/tmp/bench/scenario.json', 'utf8')).seed
	const items: Record<string, unknown>[] = []
	const keys: Key[] = []
	for (const run of runs) {
		const copy = /-v(\d)$/.exec(run)?.[1]
		if (copy === undefined) continue
		const scenario = JSON.parse(readFileSync(!run.includes('-records-') ? join(VARIANTS, `v${copy}.json`) : join(VARIANTS, 'ledger', `v${copy}.json`), 'utf8'))
		for (const row of readRows(run).filter((entry) => entry.success !== true)) {
			if (seen.has(`${run} ${row.goal}`)) continue
			const goal = scenario.goals.find((entry: { id: string }) => entry.id === row.goal)
			const id = createHash('sha256').update(`${run}${row.goal}`).digest('hex').slice(0, 8)
			items.push({
				id,
				goal: row.goal,
				request: goal.request,
				facts: (goal.facts ?? []).map((index: number) => seed[index].content),
				scoring: { expected: goal.expected, expectedAny: goal.expectedAny, forbidden: goal.forbidden, forbiddenPatterns: goal.forbiddenPatterns, tools: goal.tools },
				failure: { missing: row.missing, forbiddenHit: row.violations, patternsHit: row.patternViolations, toolsOk: row.toolsOk, replyVia: row.replyVia },
				reply: typeof row.reply === 'string' ? row.reply : '',
			})
			keys.push({ id, run, goal: String(row.goal) })
		}
	}
	items.sort((left, right) => String(left.goal).localeCompare(String(right.goal)) || String(left.id).localeCompare(String(right.id)))
	writeFileSync(itemsOut, `${JSON.stringify(items, null, 1)}\n`)
	writeFileSync(keyOut, `${JSON.stringify(keys, null, 1)}\n`)
	process.stdout.write(`items ${items.length}\n`)
	return 0
}

process.exit(main())
