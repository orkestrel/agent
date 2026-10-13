// Preload: replaces globalThis.fetch so the bench reaches no daemon. Each /api/chat request body is
// written to $DIAG_BODIES, and the answer replays the recorded agent turn from $DIAG_REPLAY (a bench jsonl).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
const rows = readFileSync(process.env.DIAG_REPLAY, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
const out = process.env.DIAG_BODIES
mkdirSync(out, { recursive: true })
// One step per recorded agent call, in order: its text, the tool call it made, and its recorded counts.
const steps = []
for (const row of rows) {
  const agentCalls = row.calls.filter((call) => call.label === 'agent')
  const tools = [...row.tools]
  agentCalls.forEach((call, index) => {
    const next = agentCalls[index + 1]
    const endsRun = next === undefined || next.run !== call.run
    const text = row.contents[index] ?? ''
    let calls = []
    if (call.overflow) {
      steps.push({ goal: row.goal, overflow: true, hash: call.hash })
      return
    }
    // A run's last turn carries a call only when it is send_reply (the abort) or the turn limit ended it.
    if (!endsRun || (tools[0]?.name === 'send_reply' && tools.length === 1) || (endsRun && row.exhausted === call.run * 8 && call.run === 1 && tools.length > 0)) {
      const tool = tools.shift()
      if (tool !== undefined) calls = [tool]
    }
    steps.push({ goal: row.goal, text, calls, prompt: call.prompt, completion: call.completion, hash: call.hash })
  })
}
let n = 0
const real = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const url = input instanceof URL ? input.href : typeof input === 'string' ? input : input.url
  if (!url.endsWith('/api/chat')) throw new Error(`replay-stub: refused ${url}`)
  const step = steps[n]
  n += 1
  const body = String(init?.body)
  writeFileSync(join(out, `${String(n).padStart(3, '0')}-${step?.goal?.slice(0, 3) ?? 'xxx'}.json`), body)
  if (step === undefined) throw new Error(`replay-stub: no step for request ${n}`)
  if (step.overflow) {
    const refusal = { code: 400, message: 'request exceeds the available context size, try increasing it', type: 'exceed_context_size_error', n_prompt_tokens: 0, n_ctx: 0 }
    return new Response(JSON.stringify({ error: JSON.stringify({ error: refusal }) }), { status: 400, headers: { 'content-type': 'application/json' } })
  }
  const record = (message, done) => ({ model: 'replay', created_at: '2026-10-08T00:00:00Z', message: { role: 'assistant', ...message }, done, ...(done ? { done_reason: 'stop', prompt_eval_count: step.prompt, eval_count: step.completion } : {}) })
  const records = []
  if (step.text !== '') records.push(record({ content: step.text }, false))
  if (step.calls.length > 0) records.push(record({ content: '', tool_calls: step.calls.map((call, index) => ({ id: `call_${n}_${index}`, function: { index, name: call.name, arguments: call.arguments } })) }, false))
  records.push(record({ content: '' }, true))
  return new Response(`${records.map((one) => JSON.stringify(one)).join('\n')}\n`, { status: 200, headers: { 'content-type': 'application/x-ndjson' } })
}
void real
