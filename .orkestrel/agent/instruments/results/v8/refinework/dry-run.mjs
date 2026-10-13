// Preload: replaces globalThis.fetch so the harness reaches no daemon. A judge request whose body equals a
// recorded one gets the recorded response; any other judge request gets the recorded response of the first
// recorded question of its form. An agent request gets the next recorded reply of the goal whose request it
// carries, and past them a plain final answer. Bodies go to $DRY_BODIES/NNNNN.json; the run's paths and goals
// go to $DRY_REPORT as JSON lines.
import { appendFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

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
		else replies.set(goal, [...(replies.get(goal) ?? []), response])
	}
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
	if (path === '/api/ps') text = JSON.stringify({ models: [] })
	else if (path === '/api/generate') text = (judged.get(init.body) ?? (body.prompt.includes('Answer with the label of the best candidate') ? choice : noul)).text
	else if (path === '/api/chat') {
		goal = goalOf(body)
		if (goal === undefined) text = seedChats.shift().text
		else {
			const at = served.get(goal) ?? 0
			served.set(goal, at + 1)
			text = replies.get(goal)[at]?.text ?? `${JSON.stringify({ model: 'dry', message: { role: 'assistant', content: 'Dry run answer.' }, done: false })}\n${JSON.stringify({ model: 'dry', message: { role: 'assistant', content: '' }, done: true, done_reason: 'stop', prompt_eval_count: 2000, eval_count: 5 })}\n`
		}
	} else throw new Error(`dry-run: refused ${url}`)
	appendFileSync(report, `${JSON.stringify({ n: number, path, goal: goal === undefined ? undefined : requests.indexOf(goal) + 1, exact: path === '/api/generate' ? judged.has(init.body) : undefined })}\n`)
	return new Response(text, { status: 200, headers: { 'content-type': 'application/x-ndjson' } })
}
