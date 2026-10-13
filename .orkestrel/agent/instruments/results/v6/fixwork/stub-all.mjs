// Preload: answers every /api/chat request offline. A summarize request gets a fixed one-sentence
// summary; an agent request gets a fixed final answer. Any other URL is refused.
const answer = (text) =>
	new Response(
		`${[
			{ model: 'stub', created_at: '2026-10-08T00:00:00Z', message: { role: 'assistant', content: text }, done: false },
			{ model: 'stub', created_at: '2026-10-08T00:00:00Z', message: { role: 'assistant', content: '' }, done: true, done_reason: 'stop', prompt_eval_count: 100, eval_count: 20 },
		]
			.map((one) => JSON.stringify(one))
			.join('\n')}\n`,
		{ status: 200, headers: { 'content-type': 'application/x-ndjson' } },
	)
globalThis.fetch = async (input, init) => {
	const url = input instanceof URL ? input.href : typeof input === 'string' ? input : input.url
	if (!url.endsWith('/api/chat')) throw new Error(`stub-all: refused ${url}`)
	const body = JSON.parse(String(init?.body))
	const summarize = body.messages[0]?.content.startsWith('You summarize')
	return answer(summarize ? 'The shift lead worked the support queue on Thursday 2026-10-08.' : 'Done.')
}
