// Preload: replaces globalThis.fetch so the bench reaches no daemon. Each /api/chat body is written
// verbatim to $DIV_BODIES/NNN.json and answered with the recorded agent call of $DIV_REPLAY (a bench
// jsonl): its content, its tool call, and its recorded token counts and done reason. Every agent call
// but a goal's last made one tool call in these runs, so the row's tool calls go to its first calls.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { register } from 'node:module'

register(new URL('./hooks.mjs', import.meta.url))

const rows = readFileSync(process.env.DIV_REPLAY, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
const steps = []
for (const row of rows) {
	const agent = row.calls.filter((call) => call.label === 'agent')
	if (agent.length !== row.calls.length) throw new Error(`${row.goal}: non-agent calls present`)
	let tool = 0
	agent.forEach((call, index) => {
		const calls = tool < row.tools.length ? [row.tools[tool++]] : []
		steps.push({ goal: row.goal, text: row.contents[index] ?? '', calls, prompt: call.prompt, completion: call.completion, reason: call.reason, hash: call.hash })
	})
	if (tool !== row.tools.length) throw new Error(`${row.goal}: ${row.tools.length - tool} tool calls unassigned`)
}
const out = process.env.DIV_BODIES
mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'steps.json'), JSON.stringify(steps, null, 1))
let count = 0
globalThis.fetch = async (input, init) => {
	const url = input instanceof URL ? input.href : typeof input === 'string' ? input : input.url
	if (!url.endsWith('/api/chat')) throw new Error(`replay: refused ${url}`)
	count += 1
	writeFileSync(join(out, `${String(count).padStart(3, '0')}.json`), String(init?.body))
	const step = steps[count - 1]
	if (step === undefined) throw new Error(`replay: no step for request ${count}`)
	const record = (message, done) => ({ model: 'replay', created_at: '2026-10-09T00:00:00Z', message: { role: 'assistant', ...message }, done, ...(done ? { done_reason: step.reason, prompt_eval_count: step.prompt, eval_count: step.completion } : {}) })
	const records = []
	if (step.text !== '') records.push(record({ content: step.text }, false))
	if (step.calls.length > 0) records.push(record({ content: '', tool_calls: step.calls.map((call, index) => ({ id: `call_${count}_${index}`, function: { index, name: call.name, arguments: call.arguments } })) }, false))
	records.push(record({ content: '' }, true))
	return new Response(`${records.map((one) => JSON.stringify(one)).join('\n')}\n`, { status: 200, headers: { 'content-type': 'application/x-ndjson' } })
}
