// Aligns the agent calls of a port run with the measured run's, goal by goal, and classifies how each goal's first
// call differs: identical, whitespace only, or in content, naming the first differing message:
//   node diverge.mjs PORT_DIR MEASURED_DIR SCENARIO [--json OUT]
// A goal's calls are the agent calls (tools offered, num_predict other than 1) whose last user message carries the
// goal's request text. The run directories hold the `-wire` folders; the scenario names each goal's request.
// Exit: 0; 64 on usage.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const { values, positionals } = parseArgs({ allowPositionals: true, options: { json: { type: 'string' } } })
if (positionals.length !== 3) {
	process.stderr.write('usage: node diverge.mjs PORT_WIRE MEASURED_WIRE SCENARIO [--json OUT]\n')
	process.exit(64)
}
const [portWire, measuredWire, scenarioPath] = positionals
const scenario = JSON.parse(readFileSync(scenarioPath, 'utf8'))

function readBody(file) {
	const request = JSON.parse(readFileSync(file, 'utf8'))
	return typeof request.body === 'string' ? JSON.parse(request.body) : request.body
}

function agentCalls(dir) {
	return readdirSync(dir)
		.filter((name) => /request\.json$/.test(name))
		.sort()
		.map((name) => ({ name, body: readBody(join(dir, name)) }))
		.filter(({ body }) => String(body?.model).startsWith('qwen3.5') && Array.isArray(body.tools) && body.tools.length > 0 && body.options?.num_predict !== 1)
}

// The goal whose request text the call's last user message carries.
function goalOf(body) {
	const users = body.messages.filter((message) => message.role === 'user').map((message) => String(message.content))
	const last = users.at(-1) ?? ''
	return scenario.goals.find((goal) => last.includes(goal.request.slice(0, 60)))?.id
}

const flat = (text) => String(text ?? '').replace(/\s+/g, ' ').trim()
const port = agentCalls(portWire).map((call) => ({ ...call, goal: goalOf(call.body) }))
const measured = agentCalls(measuredWire).map((call) => ({ ...call, goal: goalOf(call.body) }))
const rows = []
for (const goal of scenario.goals) {
	const a = port.filter((call) => call.goal === goal.id)
	const b = measured.filter((call) => call.goal === goal.id)
	if (a.length === 0 || b.length === 0) {
		rows.push({ goal: goal.id, port: a.length, measured: b.length, first: 'missing' })
		continue
	}
	const ma = a[0].body.messages
	const mb = b[0].body.messages
	let exact = ma.length === mb.length
	let spaced = ma.length === mb.length
	let at = -1
	for (let index = 0; index < Math.max(ma.length, mb.length); index += 1) {
		if (ma[index]?.content === mb[index]?.content && ma[index]?.role === mb[index]?.role) continue
		exact = false
		if (flat(ma[index]?.content) === flat(mb[index]?.content) && ma[index]?.role === mb[index]?.role) continue
		spaced = false
		at = index
		break
	}
	const x = String(ma[at]?.content ?? '')
	const y = String(mb[at]?.content ?? '')
	let k = 0
	while (k < Math.min(x.length, y.length) && x[k] === y[k]) k += 1
	rows.push({
		goal: goal.id,
		port: a.length,
		measured: b.length,
		first: exact ? 'identical' : spaced ? 'whitespace' : 'content',
		...(at >= 0 ? { message: at, role: ma[at]?.role ?? mb[at]?.role, portText: x.slice(Math.max(0, k - 80), k + 160), measuredText: y.slice(Math.max(0, k - 80), k + 160) } : {}),
	})
}
for (const row of rows) process.stdout.write(`${row.goal.padEnd(24)} calls ${row.port}/${row.measured} first ${row.first}${row.message === undefined ? '' : ` at message ${row.message} (${row.role})`}\n`)
if (values.json !== undefined) writeFileSync(values.json, `${JSON.stringify(rows, null, 1)}\n`)
