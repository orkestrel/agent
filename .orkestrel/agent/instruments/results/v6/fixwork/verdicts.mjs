// Prints the scorer's verdict on every recorded reply and answer under results/, one JSON line per row,
// so two runs of it before and after a scoring change can be diffed.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
const { clean, compileRules, scoreText } = await import(process.argv[3] ?? '../../../rescore.mjs')

const root = process.argv[4] ?? new URL('../../', import.meta.url).pathname
const scenario = JSON.parse(readFileSync(process.argv[2] ?? new URL('../../../scenario.json', import.meta.url).pathname, 'utf8'))
const rules = new Map(scenario.goals.map((goal) => [goal.id, compileRules(goal)]))
const files = []
const walk = (dir) => {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name)
		if (statSync(path).isDirectory()) {
			if (name !== 'fixwork') walk(path)
		}
		else if (name.endsWith('.jsonl')) files.push(path)
	}
}
walk(root)
for (const file of files.sort()) {
	for (const [index, line] of readFileSync(file, 'utf8').split('\n').entries()) {
		if (line.trim() === '') continue
		let row
		try {
			row = JSON.parse(line)
		} catch {
			continue
		}
		if (typeof row.goal !== 'string' || !rules.has(row.goal)) continue
		const out = { file: relative(root, file), line: index + 1, goal: row.goal }
		for (const key of ['reply', 'answer', 'content']) {
			if (typeof row[key] !== 'string' || row[key] === '') continue
			out[key] = clean(scoreText(rules.get(row.goal), row[key]))
		}
		console.log(JSON.stringify(out))
	}
}
