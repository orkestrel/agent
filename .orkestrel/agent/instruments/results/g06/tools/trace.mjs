// Prints each recorded agent call of a run's wire that concerns the named text, with its thinking, content, and
// tool calls rebuilt from the streamed chunks:
//   node trace.mjs WIRE_DIR [--match TEXT] [--json OUT.json]
// --match keeps calls whose last three messages contain TEXT (case-insensitive; default `kettle`).
// Judge calls (no tools and no thinking requested) are left out.
// Exit: 0; 64 on usage.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const { values, positionals } = parseArgs({ allowPositionals: true, options: { match: { type: 'string' }, json: { type: 'string' } } })
if (positionals.length !== 1) {
	process.stderr.write('usage: node trace.mjs WIRE_DIR [--match TEXT] [--json OUT.json]\n')
	process.exit(64)
}
const dir = positionals[0]
const match = (values.match ?? 'kettle').toLowerCase()
const calls = []
for (const file of readdirSync(dir).filter((name) => name.endsWith('_api_chat-request.json')).sort()) {
	const request = JSON.parse(readFileSync(join(dir, file), 'utf8'))
	const body = typeof request.body === 'string' ? JSON.parse(request.body) : (request.body ?? request)
	if (!Array.isArray(body.tools) || body.tools.length === 0) continue
	if (!JSON.stringify(body.messages.slice(-3)).toLowerCase().includes(match)) continue
	const response = JSON.parse(readFileSync(join(dir, file.replace('request', 'response')), 'utf8'))
	let thinking = ''
	let content = ''
	const toolCalls = []
	for (const line of String(response.text ?? '').split('\n')) {
		if (line.trim() === '') continue
		const chunk = JSON.parse(line)
		thinking += chunk.message?.thinking ?? ''
		content += chunk.message?.content ?? ''
		toolCalls.push(...(chunk.message?.tool_calls ?? []))
	}
	calls.push({ file, think: body.think, last: body.messages.at(-1)?.role, thinking, content, toolCalls: toolCalls.map((call) => call.function ?? call) })
}
for (const call of calls) {
	process.stdout.write(`== ${call.file} think ${call.think} last ${call.last}\n`)
	if (call.thinking !== '') process.stdout.write(`THINKING: ${call.thinking}\n`)
	if (call.content !== '') process.stdout.write(`CONTENT: ${call.content}\n`)
	if (call.toolCalls.length > 0) process.stdout.write(`CALLS: ${JSON.stringify(call.toolCalls)}\n`)
}
if (values.json !== undefined) writeFileSync(values.json, `${JSON.stringify(calls, null, 1)}\n`)
