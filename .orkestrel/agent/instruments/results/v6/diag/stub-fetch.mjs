// Offline recording stub: replaces globalThis.fetch so the harness reaches no daemon. Each request
// body is written to $DIAG_OUT and answered from the step list in $DIAG_SCRIPT, in order.
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { register } from 'node:module'

register(new URL('./hooks.mjs', import.meta.url))

const out = process.env.DIAG_OUT
const script = JSON.parse(readFileSync(process.env.DIAG_SCRIPT, 'utf8'))
mkdirSync(out, { recursive: true })
let count = 0

globalThis.fetch = async (input, init) => {
	const url = input instanceof URL ? input.href : typeof input === 'string' ? input : input.url
	if (!url.endsWith('/api/chat')) {
		appendFileSync(join(out, 'refused.txt'), `${url}\n`)
		throw new Error(`stub: refused ${url}`)
	}
	count += 1
	const body = String(init?.body ?? '')
	writeFileSync(join(out, `${String(count).padStart(3, '0')}-body.json`), body)
	const step = script[count - 1]
	if (step === undefined) throw new Error(`stub: no scripted answer for request ${count}`)
	if (step.overflow !== undefined) return new Response(step.overflow, { status: 400, headers: { 'content-type': 'application/json' } })
	const record = (message, done) => ({
		model: 'stub',
		created_at: '2026-10-08T00:00:00Z',
		message: { role: 'assistant', ...message },
		done,
		...(done ? { done_reason: 'stop', prompt_eval_count: 100, eval_count: 20 } : {}),
	})
	const records = [
		...(step.text === '' || step.text === undefined ? [] : [record({ content: step.text }, false)]),
		...(step.calls === undefined || step.calls.length === 0
			? []
			: [record({ content: '', tool_calls: step.calls.map((call, index) => ({ function: { index, name: call.name, arguments: call.arguments } })) }, false)]),
		record({ content: '' }, true),
	]
	return new Response(records.map((one) => JSON.stringify(one)).join('\n') + '\n', { status: 200, headers: { 'content-type': 'application/x-ndjson' } })
}
