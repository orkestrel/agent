// Preload: replaces globalThis.fetch so the harness reaches no daemon. Every /api/chat body is written to
// $IF_OUT/NNN.json and answered by replaying the recorded agent turn from $IF_REPLAY (a bench jsonl).
// Any other URL is refused and logged to $IF_OUT/refused.txt.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { register } from 'node:module'

register(new URL('./hooks.mjs', import.meta.url))
const out = process.env.IF_OUT
mkdirSync(out, { recursive: true })
const rows = readFileSync(process.env.IF_REPLAY, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
const steps = []
for (const row of rows) {
	const agent = row.calls.filter((call) => call.label === 'agent')
	if (agent.length !== row.calls.length) throw new Error(`${row.goal}: non-agent calls; replay covers mode none only`)
	const tools = [...row.tools]
	agent.forEach((call, index) => {
		if (call.status === 400) {
			steps.push({ goal: row.goal, hash: call.hash, overflow: row.error.slice(row.error.indexOf('400 - ') + 6) })
			return
		}
		const endsRun = index === agent.length - 1 || agent[index + 1].run !== call.run
		const runCalls = agent.filter((one) => one.run === call.run).length
		const carries = !endsRun || tools[0]?.name === 'send_reply' || runCalls === 8
		const calls = carries && tools.length > 0 ? [tools.shift()] : []
		steps.push({ goal: row.goal, hash: call.hash, text: row.contents[index] ?? '', calls })
	})
	if (tools.length > 0) throw new Error(`${row.goal}: ${tools.length} tool calls unassigned`)
}
writeFileSync(join(out, 'steps.json'), JSON.stringify(steps, null, 1))
let count = 0
globalThis.fetch = async (input, init) => {
	const url = input instanceof URL ? input.href : typeof input === 'string' ? input : input.url
	if (!url.endsWith('/api/chat')) {
		appendFileSync(join(out, 'refused.txt'), `${url}\n`)
		throw new Error(`replay: refused ${url}`)
	}
	count += 1
	const step = steps[count - 1]
	writeFileSync(join(out, `${String(count).padStart(3, '0')}.json`), String(init?.body))
	if (step === undefined) throw new Error(`replay: no step for request ${count}`)
	if (step.overflow !== undefined) return new Response(step.overflow, { status: 400, headers: { 'content-type': 'application/json' } })
	const record = (message, done) => ({
		model: 'replay',
		created_at: '2026-10-08T00:00:00Z',
		message: { role: 'assistant', ...message },
		done,
		...(done ? { done_reason: 'stop', prompt_eval_count: 100, eval_count: 20 } : {}),
	})
	const records = []
	if (step.text !== '') records.push(record({ content: step.text }, false))
	if (step.calls.length > 0)
		records.push(record({ content: '', tool_calls: step.calls.map((call, index) => ({ function: { index, name: call.name, arguments: call.arguments } })) }, false))
	records.push(record({ content: '' }, true))
	return new Response(`${records.map((one) => JSON.stringify(one)).join('\n')}\n`, { status: 200, headers: { 'content-type': 'application/x-ndjson' } })
}
