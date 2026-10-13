// Scores every recorded reply under the pre-fix scorer and scenario and under the fixed ones, and prints each flip.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
const bench = '/home/user/agent/tmp/bench'
const root = join(bench, 'results')
const before = await import(join(bench, 'rescore.mjs.pre-fix'))
const after = await import(join(bench, 'rescore.mjs'))
const rulesOf = (lib, file) => new Map(JSON.parse(readFileSync(join(bench, file), 'utf8')).goals.map((goal) => [goal.id, lib.compileRules(goal)]))
const oldRules = rulesOf(before, 'scenario.json.pre-fix')
const newRules = rulesOf(after, 'scenario.json')
const files = []
const walk = (dir) => { for (const name of readdirSync(dir)) { const path = join(dir, name); if (statSync(path).isDirectory()) walk(path); else if (name.endsWith('.jsonl') && !name.includes('rescored')) files.push(path) } }
walk(root)
let rows = 0
let flips = 0
for (const file of files) for (const text of readFileSync(file, 'utf8').split('\n')) {
	if (text.trim() === '') continue
	let row; try { row = JSON.parse(text) } catch { continue }
	if (!newRules.has(row.goal) || typeof row.reply !== 'string' || row.reply === '') continue
	rows += 1
	const was = before.clean(before.scoreText(oldRules.get(row.goal), row.reply))
	const scored = after.scoreText(newRules.get(row.goal), row.reply)
	const now = after.clean(scored)
	if (was === now) continue
	flips += 1
	process.stdout.write(`${file.slice(root.length + 1)} ${row.goal}: ${was ? 'pass' : 'fail'} -> ${now ? 'pass' : 'fail'} (${[...scored.missing, ...scored.violations, ...scored.patterns.map((source) => `#${newRules.get(row.goal).patterns.findIndex((one) => one.source === source) + 1}`)].join('; ') || 'clean'})\n`)
}
process.stdout.write(`${flips} flips over ${rows} non-empty replies in ${files.length} files\n`)
