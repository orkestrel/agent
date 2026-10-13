// Prints every recorded reply and answer for the goals named on the command line, across results/**/*.jsonl.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
const root = '/home/user/agent/tmp/bench/results'
const goals = process.argv.slice(2)
const files = []
const walk = (dir) => { for (const name of readdirSync(dir)) { const path = join(dir, name); if (statSync(path).isDirectory()) walk(path); else if (name.endsWith('.jsonl') && !name.includes('rescored')) files.push(path) } }
walk(root)
const seen = new Set()
for (const file of files) for (const text of readFileSync(file, 'utf8').split('\n')) {
	if (text.trim() === '') continue
	let row; try { row = JSON.parse(text) } catch { continue }
	if (!goals.some((goal) => row.goal?.startsWith(goal)) || !Object.hasOwn(row, 'reply')) continue
	for (const t of [row.reply, row.answer]) { if (!t || seen.has(t)) continue; seen.add(t); process.stdout.write(`=== ${file.slice(root.length + 1)} ${row.goal} success=${row.success}\n${t}\n`) }
}
