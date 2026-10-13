// Preload: replaces globalThis.fetch so the harness reaches no daemon. A judge request whose body equals a
// recorded one gets the recorded response; any other judge request gets the recorded response of the first
// recorded question of its form. An agent request gets the next recorded reply of the goal whose request it
// carries, and past them a plain final answer. Bodies go to $DRY_BODIES/NNNNN.json; the run's paths and goals
// go to $DRY_REPORT as JSON lines.
// This copy of results/v8/refinework/dry-run.mjs rescales the prompt count of a recorded agent reply when the served
// body differs from the recorded one: the count less the fixed cost of the tool schemas, times the served messages'
// estimate over the recorded messages' estimate, plus that fixed cost. The harness fits its token scale to these counts,
// so an arm with a shorter prompt reads the scale of its own prompts, as a live run would, and not the recording's.
import { appendFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { estimateMessages } from '/home/user/agent/dist/src/core/index.js'

const dir = process.env.WIRE_DIR
const out = process.env.DRY_BODIES
const report = process.env.DRY_REPORT
const scenario = JSON.parse(readFileSync(process.env.DRY_SCENARIO, 'utf8'))
mkdirSync(out, { recursive: true })
writeFileSync(report, '')
const requests = scenario.goals.map((goal) => goal.request)
const files = readdirSync(dir).filter((name) => name.endsWith('-request.json')).sort()
const judged = new Map()
const replies = new Map()
const recorded = new Map()
const seedChats = []
let choice
let noul
const goalOf = (body) => [...body.messages].reverse().find((message) => message.role === 'user' && requests.includes(message.content))?.content
for (const name of files) {
	const request = JSON.parse(readFileSync(join(dir, name), 'utf8'))
	const response = JSON.parse(readFileSync(join(dir, name.replace('-request.json', '-response.json')), 'utf8'))
	if (request.url.endsWith('/api/generate')) {
		judged.set(JSON.stringify(request.body), response)
		if (request.body.prompt.includes('Answer with the label of the best candidate')) choice ??= response
		else noul ??= response
	} else if (request.url.endsWith('/api/chat')) {
		const goal = goalOf(request.body)
		if (goal === undefined) seedChats.push(response)
		else {
			replies.set(goal, [...(replies.get(goal) ?? []), response])
			recorded.set(goal, [...(recorded.get(goal) ?? []), request.body])
		}
	}
}
// The seed pass sends the seed with the tools and then without them, so the difference is the tool schemas' cost.
const promptOf = (response) => JSON.parse(response.text).prompt_eval_count
const fixed = seedChats.length >= 2 ? promptOf(seedChats[0]) - promptOf(seedChats[1]) : 0
const estimate = (body) => estimateMessages(body.messages.map((message) => ({ role: message.role, content: message.content ?? '', ...(message.tool_calls?.length > 0 ? { calls: message.tool_calls.map((call) => ({ name: call.function.name, arguments: call.function.arguments })) } : {}) })))
const fixedOf = (body) => ((body.tools?.length ?? 0) > 0 ? fixed : 0)
const rescale = (text, body, original) => {
	if (original === undefined || JSON.stringify(original.messages) === JSON.stringify(body.messages)) return { text }
	const ratio = estimate(body) / estimate(original)
	let scaled
	const lines = text.split('\n').map((line) => {
		if (line === '') return line
		const record = JSON.parse(line)
		if (typeof record.prompt_eval_count !== 'number') return line
		scaled = [record.prompt_eval_count, Math.round(fixedOf(body) + (record.prompt_eval_count - fixedOf(original)) * ratio)]
		return JSON.stringify({ ...record, prompt_eval_count: scaled[1] })
	})
	return { text: lines.join('\n'), scaled }
}
let sequence = 0
const served = new Map()
globalThis.fetch = async (input, init = {}) => {
	const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
	const number = String(++sequence).padStart(5, '0')
	const path = new URL(url).pathname
	const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined
	if (body !== undefined) writeFileSync(join(out, `${number}${path.replace(/\//g, '_')}.json`), init.body)
	let text
	let goal
	let scaled
	if (path === '/api/ps') text = JSON.stringify({ models: [] })
	else if (path === '/api/generate') text = (judged.get(init.body) ?? (body.prompt.includes('Answer with the label of the best candidate') ? choice : noul)).text
	else if (path === '/api/chat') {
		goal = goalOf(body)
		if (goal === undefined) text = seedChats.shift().text
		else {
			const at = served.get(goal) ?? 0
			served.set(goal, at + 1)
			const reply = replies.get(goal)[at]
			if (reply !== undefined) ({ text, scaled } = rescale(reply.text, body, recorded.get(goal)[at]))
			else text = `${JSON.stringify({ model: 'dry', message: { role: 'assistant', content: 'Dry run answer.' }, done: false })}\n${JSON.stringify({ model: 'dry', message: { role: 'assistant', content: '' }, done: true, done_reason: 'stop', prompt_eval_count: 2000, eval_count: 5 })}\n`
		}
	} else throw new Error(`dry-run: refused ${url}`)
	appendFileSync(report, `${JSON.stringify({ n: number, path, goal: goal === undefined ? undefined : requests.indexOf(goal) + 1, exact: path === '/api/generate' ? judged.has(init.body) : undefined, scaled })}\n`)
	return new Response(text, { status: 200, headers: { 'content-type': 'application/x-ndjson' } })
}
