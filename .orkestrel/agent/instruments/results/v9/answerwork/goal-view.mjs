// Prints each agent body of one goal from a dry render: its tools and the messages after the goal's request.
// Usage: node goal-view.mjs BODIES REPORT GOAL, where GOAL is the 1-based goal number.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const [bodies, report, goal] = process.argv.slice(2)
const rows = readFileSync(report, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
const files = new Map(readdirSync(bodies).map((name) => [name.slice(0, 5), name]))
for (const row of rows.filter((one) => one.path === '/api/chat' && one.goal === Number(goal))) {
	const body = JSON.parse(readFileSync(join(bodies, files.get(row.n)), 'utf8'))
	const at = body.messages.findLastIndex((message) => message.role === 'user' && !message.content.startsWith('[Desk]'))
	console.log(`${row.n}: ${body.messages.length} messages, tools ${(body.tools ?? []).map((tool) => tool.function.name).join(',') || 'none'}; after the request:`)
	for (const message of body.messages.slice(at + 1))
		console.log(`  ${message.role}${message.tool_calls ? ` calls ${JSON.stringify(message.tool_calls.map((call) => call.function))}` : ''}: ${JSON.stringify(message.content).slice(0, 400)}`)
}
