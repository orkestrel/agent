// Usage: node tail-view.mjs BODIES REPORT SCENARIO WIRE_DIR. Prints, for the first agent request of each goal of
// a dry run, the role and first 60 characters of every message after the system message, and marks a message
// that no seed message matches. Prints the recorded first agent request's prompt_eval_count beside it.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
const [bodies, reportFile, scenarioFile, wire] = process.argv.slice(2)
const scenario = JSON.parse(readFileSync(scenarioFile, 'utf8'))
const requests = scenario.goals.map((goal) => goal.request)
const seedTexts = new Set(scenario.seed.filter((message) => message.role !== 'tool').map((message) => `${message.role}:${message.content}`))
const seedCalls = new Set(scenario.seed.flatMap((message) => message.calls ?? []).map((call) => `${call.name} ${JSON.stringify(call.arguments)}`))
const fromSeed = (message) => {
	if (message.role === 'tool') return [...seedCalls].some((call) => message.content.startsWith(`${call}: `))
	if (message.tool_calls !== undefined) return message.tool_calls.every((call) => seedCalls.has(`${call.function.name} ${JSON.stringify(call.function.arguments)}`))
	return seedTexts.has(`${message.role}:${message.content}`)
}
// Whether `message` renders seed message `seed`, matched by position, so an earlier goal's call of a seed id
// never passes as the seed call.
const renders = (message, seed) => {
	if (message.role !== seed.role) return false
	if (seed.role === 'tool') {
		const call = scenario.seed.flatMap((one) => one.calls ?? []).find((one) => one.id === seed.call)
		return message.content.startsWith(`${call.name} ${JSON.stringify(call.arguments)}: `)
	}
	const calls = (message.tool_calls ?? []).map((call) => `${call.function.name} ${JSON.stringify(call.function.arguments)}`)
	return message.content === seed.content && JSON.stringify(calls) === JSON.stringify((seed.calls ?? []).map((call) => `${call.name} ${JSON.stringify(call.arguments)}`))
}
const goalOf = (messages) => [...messages].reverse().find((message) => message.role === 'user' && requests.includes(message.content))?.content
const recorded = new Map()
for (const name of readdirSync(wire).filter((one) => one.endsWith('_api_chat-request.json')).sort()) {
	const body = JSON.parse(readFileSync(join(wire, name), 'utf8')).body
	const goal = goalOf(body.messages)
	if (goal === undefined || recorded.has(goal)) continue
	const response = JSON.parse(readFileSync(join(wire, name.replace('-request.json', '-response.json')), 'utf8'))
	const done = response.text.trim().split('\n').map((line) => JSON.parse(line)).find((line) => line.done)
	recorded.set(goal, { n: name.slice(0, 5), prompt: done?.prompt_eval_count, messages: body.messages.length })
}
const report = readFileSync(reportFile, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
const seen = new Set()
let strays = 0
let answers = 0
let seedTails = 0
for (const line of report.filter((one) => one.path === '/api/chat' && one.goal !== undefined)) {
	if (seen.has(line.goal)) continue
	seen.add(line.goal)
	const body = JSON.parse(readFileSync(join(bodies, `${line.n}_api_chat.json`), 'utf8'))
	const goal = scenario.goals[line.goal - 1]
	const tail = body.messages.slice(1)
	const last = tail.at(-1)
	const lastOk = last?.role === 'user' && last.content === goal.request
	const marks = tail.slice(0, -1).map((message) => (fromSeed(message) ? '' : 'EARLIER'))
	strays += marks.filter((mark) => mark !== '').length
	answers += tail.slice(0, -1).filter((message) => message.role === 'assistant' && message.content.trim() !== '' && !seedTexts.has(`assistant:${message.content}`)).length
	const suffix = scenario.seed.slice(scenario.seed.length - (tail.length - 1))
	const seedOnly = tail.length - 1 <= scenario.seed.length && tail.slice(0, -1).every((message, at) => renders(message, suffix[at]))
	if (seedOnly) seedTails += 1
	const before = recorded.get(goal.request)
	console.log(`${goal.id} dry ${line.n}: ${tail.length} messages after system, last is its request ${lastOk}, the rest the seed's last ${tail.length - 1} in order ${seedOnly}; recorded ${before?.n} had ${(before?.messages ?? 1) - 1}, prompt_eval_count ${before?.prompt}`)
	for (const [at, message] of tail.entries()) console.log(`  ${message.role}${message.tool_calls === undefined ? '' : '+call'} ${JSON.stringify(message.content.slice(0, 60))}${at === tail.length - 1 ? ' [request]' : marks[at] === '' ? '' : ` [${marks[at]}]`}`)
}
console.log(`goals ${seen.size}; tails that are a seed suffix and the request ${seedTails}; messages no seed message matches ${strays}; assistant text no seed message carries ${answers}`)
