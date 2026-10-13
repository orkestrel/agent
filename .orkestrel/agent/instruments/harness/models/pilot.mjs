// Pilots an agent model on this host against recorded g06 agent calls, with the model swapped and every other field
// of the recorded request kept: cold load, prompt and generation speed, a tool call, the tool round trip, and the
// thinking toggle:
//   node pilot.mjs --model TAG [--think] [--out ROWS.json] REQUEST.json...
// Each REQUEST.json is a recorded wire request whose messages end on the g06 request, so the model is expected to
// call lookup_order for LH-81660. Per request it unloads every resident model, sends the call cold (think off), sends
// it again behind a changed system message to read warm prompt speed, answers a lookup_order call from the
// scenario's table and reads the reply, and under --think sends the call with thinking on.
// Exit: 0; 1 when the daemon refuses a call; 64 on usage.
import { appendFileSync, readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

const DAEMON = 'http://127.0.0.1:11434'
const LOOKUP = 'Order LH-81660 for account LH-52307 (Kenji Nakamura): replacement electric kettle, gift wrapped, no charge. Shipped 2026-10-08 by Parcelway, tracking PW-6013-2280, carrier estimated delivery 2026-10-13; gift note text is not recorded on the order.'
const PREDICT = 256
const THINK_PREDICT = 1024

const { values, positionals } = parseArgs({ allowPositionals: true, options: { model: { type: 'string' }, think: { type: 'boolean' }, out: { type: 'string' } } })
if (values.model === undefined || positionals.length === 0) {
	process.stderr.write('usage: node pilot.mjs --model TAG [--think] [--out ROWS.json] REQUEST.json...\n')
	process.exit(64)
}

function readBody(file) {
	const request = JSON.parse(readFileSync(file, 'utf8'))
	return typeof request.body === 'string' ? JSON.parse(request.body) : request.body
}

async function post(path, body) {
	const response = await fetch(`${DAEMON}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(900_000) })
	const text = await response.text()
	let json
	try {
		json = JSON.parse(text)
	} catch {
		json = { error: text.slice(0, 300) }
	}
	return { status: response.status, json }
}

async function unloadAll() {
	const response = await fetch(`${DAEMON}/api/ps`)
	const { models = [] } = await response.json()
	for (const model of models) await post('/api/generate', { model: model.name, keep_alive: 0 })
}

// Speeds in tokens per second from the daemon's done record, durations in nanoseconds.
function readTiming(json) {
	const rate = (count, duration) => (count > 0 && duration > 0 ? Math.round((count / (duration / 1e9)) * 10) / 10 : null)
	return {
		loadMs: Math.round((json.load_duration ?? 0) / 1e6),
		prompt: json.prompt_eval_count ?? null,
		promptRate: rate(json.prompt_eval_count, json.prompt_eval_duration),
		generated: json.eval_count ?? null,
		generateRate: rate(json.eval_count, json.eval_duration),
		totalMs: Math.round((json.total_duration ?? 0) / 1e6),
	}
}

function readCalls(json) {
	return (json.message?.tool_calls ?? []).map((call) => ({ name: call.function?.name, arguments: call.function?.arguments }))
}

function callBody(recorded, overrides) {
	const body = { ...structuredClone(recorded), model: values.model, stream: false, keep_alive: '30m', options: { ...recorded.options, num_predict: PREDICT }, think: false }
	return { ...body, ...overrides, options: { ...body.options, ...(overrides.options ?? {}) } }
}

const rows = []
let refused = false
for (const file of positionals) {
	const recorded = readBody(file)
	const row = { model: values.model, request: file, recordedModel: recorded.model, messages: recorded.messages.length, tools: (recorded.tools ?? []).map((tool) => tool.function?.name) }
	await unloadAll()
	const cold = await post('/api/chat', callBody(recorded, {}))
	row.cold = { status: cold.status, error: cold.json.error, ...readTiming(cold.json), calls: readCalls(cold.json), content: String(cold.json.message?.content ?? '').slice(0, 400) }
	if (cold.status !== 200) {
		refused = true
		rows.push(row)
		continue
	}
	const nonce = structuredClone(recorded)
	nonce.messages[0] = { ...nonce.messages[0], content: `Pilot run ${Date.now()}.\n${nonce.messages[0].content}` }
	const warm = await post('/api/chat', callBody(nonce, {}))
	row.warm = { status: warm.status, ...readTiming(warm.json) }
	const call = row.cold.calls.find((one) => one.name === 'lookup_order')
	row.toolCall = row.cold.calls.length === 0 ? 'none' : call === undefined ? `other: ${row.cold.calls.map((one) => one.name).join(', ')}` : JSON.stringify(call.arguments)
	if (call !== undefined) {
		const messages = [...recorded.messages, { role: 'assistant', content: '', tool_calls: [{ function: { name: 'lookup_order', arguments: call.arguments } }] }, { role: 'tool', content: String(call.arguments?.id ?? '').toUpperCase() === 'LH-81660' ? LOOKUP : 'No order with that id.', tool_name: 'lookup_order' }]
		const reply = await post('/api/chat', callBody({ ...recorded, messages }, {}))
		const content = String(reply.json.message?.content ?? '')
		row.reply = { status: reply.status, ...readTiming(reply.json), calls: readCalls(reply.json), tracking: content.includes('PW-6013-2280'), estimate: /2026-10-13|oct\w*\.?\s+13|13(?:th)?\s+oct/i.test(content), content: content.slice(0, 600) }
	}
	if (values.think) {
		const thought = await post('/api/chat', callBody(recorded, { think: true, options: { num_predict: THINK_PREDICT } }))
		row.think = { status: thought.status, error: thought.json.error, ...readTiming(thought.json), thinking: String(thought.json.message?.thinking ?? '').length, calls: readCalls(thought.json), content: String(thought.json.message?.content ?? '').slice(0, 300) }
	}
	rows.push(row)
	process.stdout.write(`${JSON.stringify({ model: row.model, request: file.split('/').slice(-2).join('/'), cold: { load: row.cold.loadMs, prompt: row.cold.prompt, promptRate: row.cold.promptRate, generateRate: row.cold.generateRate }, warmPromptRate: row.warm?.promptRate, toolCall: row.toolCall, tracking: row.reply?.tracking, estimate: row.reply?.estimate, think: row.think === undefined ? undefined : { status: row.think.status, thinking: row.think.thinking, calls: row.think.calls.length } })}\n`)
}
if (values.out !== undefined) for (const row of rows) appendFileSync(values.out, `${JSON.stringify(row)}\n`)
process.exit(refused ? 1 : 0)
