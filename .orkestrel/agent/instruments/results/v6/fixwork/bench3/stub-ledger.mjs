// Preload: answers the ledger arm's agent requests offline and records every request body under $STUB_OUT.
// A seed call (stream false) gets a prompt count; a streamed agent call gets the next step of $STUB_SCRIPT,
// each `{ text, calls }` or `{ overflow: N }`, and "Done." after the last. A judge request and any other URL
// are refused, so nothing reaches the daemon.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const AGENT = 'qwen3.5:2b-q4_K_M'
const out = process.env.STUB_OUT
const script = JSON.parse(readFileSync(process.env.STUB_SCRIPT, 'utf8'))
mkdirSync(out, { recursive: true })
let count = 0
let step = 0
const refuse = (url, why) => {
	appendFileSync(join(out, 'refused.txt'), `${url} ${why}\n`)
	throw new Error(`stub-ledger: refused ${url} (${why})`)
}
globalThis.fetch = async (input, init) => {
	const url = input instanceof URL ? input.href : typeof input === 'string' ? input : input.url
	if (!url.endsWith('/api/chat')) return refuse(url, 'not /api/chat')
	const body = JSON.parse(String(init?.body ?? '{}'))
	if (body.model !== AGENT) return refuse(url, `model ${body.model}`)
	count += 1
	writeFileSync(join(out, `${String(count).padStart(3, '0')}-body.json`), String(init.body))
	if (body.stream === false) return Response.json({ model: 'stub', message: { role: 'assistant', content: '' }, done: true, prompt_eval_count: body.tools ? 1600 : 900, eval_count: 1 })
	const next = script[step++] ?? { text: 'Done.' }
	if (next.overflow !== undefined) {
		const error = JSON.stringify({ error: { code: 400, message: `request (${next.overflow} tokens) exceeds the available context size (${body.options.num_ctx} tokens), try increasing it`, type: 'exceed_context_size_error', n_prompt_tokens: next.overflow, n_ctx: body.options.num_ctx } })
		return new Response(JSON.stringify({ error }), { status: 400, headers: { 'content-type': 'application/json' } })
	}
	const record = (message, done) => ({ model: 'stub', created_at: '2026-10-08T00:00:00Z', message: { role: 'assistant', ...message }, done, ...(done ? { done_reason: 'stop', prompt_eval_count: 1700 + count, eval_count: 20 } : {}) })
	const records = [
		...(next.text ? [record({ content: next.text }, false)] : []),
		...(next.calls?.length ? [record({ content: '', tool_calls: next.calls.map((call, index) => ({ function: { index, name: call.name, arguments: call.arguments } })) }, false)] : []),
		record({ content: '' }, true),
	]
	return new Response(`${records.map((one) => JSON.stringify(one)).join('\n')}\n`, { status: 200, headers: { 'content-type': 'application/x-ndjson' } })
}
