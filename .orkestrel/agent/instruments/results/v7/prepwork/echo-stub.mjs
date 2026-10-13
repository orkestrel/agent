// Preload: replaces globalThis.fetch so the bench reaches no daemon. Each /api/chat body is written to
// $ECHO_BODIES and answered with one fixed content text; any other URL is refused.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const out = process.env.ECHO_BODIES
mkdirSync(out, { recursive: true })
let count = 0
globalThis.fetch = async (input, init) => {
	const url = input instanceof URL ? input.href : typeof input === 'string' ? input : input.url
	if (!url.endsWith('/api/chat')) throw new Error(`echo-stub: refused ${url}`)
	count += 1
	writeFileSync(join(out, `${String(count).padStart(3, '0')}.json`), String(init?.body))
	const record = (message, done) => ({ model: 'echo', created_at: '2026-10-08T00:00:00Z', message: { role: 'assistant', ...message }, done, ...(done ? { done_reason: 'stop', prompt_eval_count: 100, eval_count: 20 } : {}) })
	const text = 'Dana Whitcombe runs the Larkspur Home support desk on Thursday 2026-10-08.'
	return new Response(`${[record({ content: text }, false), record({ content: '' }, true)].map((one) => JSON.stringify(one)).join('\n')}\n`, { status: 200, headers: { 'content-type': 'application/x-ndjson' } })
}
