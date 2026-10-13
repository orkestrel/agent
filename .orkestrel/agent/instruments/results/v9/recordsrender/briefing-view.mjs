// Prints the briefing of the first agent body of each named goal of a dry render.
// Usage: node briefing-view.mjs DRY_DIR GOAL..., where GOAL is the 1-based goal number.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
const [dir, ...goals] = process.argv.slice(2)
const rows = readFileSync(join(dir, 'report.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line))
for (const goal of goals) {
	const row = rows.find((one) => one.path === '/api/chat' && one.goal === Number(goal))
	const body = JSON.parse(readFileSync(join(dir, 'bodies', `${row.n}_api_chat.json`), 'utf8'))
	const system = body.messages[0].content
	console.log(`===== g${goal} body ${row.n}\n${system.slice(system.indexOf('\n\n\n\n') + 4)}`)
}
