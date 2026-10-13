// Scores every recorded reply under results/ with two scenario files and prints each row whose verdict differs.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { clean, compileRules, scoreText } from '../../../../rescore.mjs'

const [beforeFile, afterFile, root] = process.argv.slice(2)
const load = (file) => new Map(JSON.parse(readFileSync(file, 'utf8')).goals.map((goal) => [goal.id, compileRules(goal)]))
const before = load(beforeFile)
const after = load(afterFile)
const walk = (dir) => readdirSync(dir).flatMap((name) => {
	const path = join(dir, name)
	return statSync(path).isDirectory() ? walk(path) : path.endsWith('.jsonl') && !path.includes('rescored') ? [path] : []
})
let rows = 0
let flips = 0
for (const file of walk(root)) {
	for (const line of readFileSync(file, 'utf8').split('\n')) {
		if (line.trim() === '') continue
		let row
		try { row = JSON.parse(line) } catch { continue }
		const text = typeof row.reply === 'string' ? row.reply : typeof row.answer === 'string' ? row.answer : undefined
		if (text === undefined || !before.has(row.goal) || !after.has(row.goal)) continue
		rows += 1
		const a = clean(scoreText(before.get(row.goal), text))
		const b = clean(scoreText(after.get(row.goal), text))
		if (a !== b) {
			flips += 1
			process.stdout.write(`${file} ${row.goal}: ${a ? 'pass' : 'fail'} -> ${b ? 'pass' : 'fail'} ${JSON.stringify(text).slice(0, 300)}\n`)
		}
	}
}
process.stdout.write(`${flips} verdict changes over ${rows} recorded replies\n`)
