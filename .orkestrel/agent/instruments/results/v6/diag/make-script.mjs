// Turns a results jsonl into stub steps that replay each recorded agent call's content and tool call.
// In these runs every agent call but a goal's last made exactly one tool call, so the row's tool
// calls go to its first calls in order; a refused call replays the recorded refusal body.
import { readFileSync, writeFileSync } from 'node:fs'
const [source, target, limit] = process.argv.slice(2)
const rows = readFileSync(source, 'utf8').trim().split('\n').map((line) => JSON.parse(line)).slice(0, limit === undefined ? undefined : Number(limit))
const steps = []
for (const row of rows) {
	const agent = row.calls.filter((call) => call.label === 'agent')
	if (row.calls.length !== agent.length) throw new Error(`${row.goal}: non-agent calls present`)
	let tool = 0
	agent.forEach((call, index) => {
		if (call.status === 400) {
			steps.push({ overflow: row.error.slice(row.error.indexOf('400 - ') + 6), hash: call.hash, goal: row.goal })
			return
		}
		const calls = tool < row.tools.length ? [row.tools[tool++]] : []
		steps.push({ text: row.contents[index] ?? '', calls: calls.map(({ name, arguments: args }) => ({ name, arguments: args })), hash: call.hash, goal: row.goal })
	})
	if (tool !== row.tools.length) throw new Error(`${row.goal}: ${row.tools.length - tool} tool calls unassigned`)
}
writeFileSync(target, JSON.stringify(steps, null, 1))
process.stdout.write(`${steps.length} steps from ${rows.length} goals\n`)
