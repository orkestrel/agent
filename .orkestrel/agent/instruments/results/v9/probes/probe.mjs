// Replays the request that wrote a goal's final answer, from a recorded wire, with one change to its
// messages, from a cold daemon, and scores the reply with the shared scorer. A `base` probe sends the
// recorded body unchanged, so its reply matching the recorded one proves the probe sends what the run sent.
// Usage: node probe.mjs WIRE_DIR SCENARIO GOAL_INDEX TRANSFORM OUT_JSONL
import { execFileSync } from 'node:child_process'
import { appendFileSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { compileRules, scoreText } from '/home/user/agent/tmp/bench/rescore.mjs'

const [wire, scenarioPath, goalArg, transform, out] = process.argv.slice(2)
const scenario = JSON.parse(readFileSync(scenarioPath, 'utf8'))
const goal = scenario.goals[Number(goalArg)]
const requests = new Set(scenario.goals.map((entry) => entry.request))

const TRANSFORMS = {
	base: (messages) => messages,
	'date-rule-request': (messages) => appendToRequest(messages, 'Rule for this request: never promise a customer a delivery date in writing.'),
	'date-rule-last': (messages) => [...messages, { role: 'user', content: '[Desk] Rule for this request: never promise a customer a delivery date in writing.' }],
	// The run's own draft goes back once with the rule it breaks named, as a draft check would return it.
	'date-rewrite': (messages, recorded) => [...messages, { role: 'assistant', content: recorded }, { role: 'user', content: '[Desk] This reply breaks the rule: never promise a customer a delivery date in writing. Rewrite the reply so it follows the rule.' }],
	'approval-rule-request': (messages) => appendToRequest(messages, 'Rules for this request: any refund over $200 needs a manager approval code in the internal note. The approval code rotated early: use MX-4486; MX-4471 is dead.'),
	'approval-rule-compare': (messages) => appendToRequest(messages, 'Rules for this request: any refund over $200 needs a manager approval code in the internal note. The approval code rotated early: use MX-4486; MX-4471 is dead. The refund is $289.00, which is over $200.'),
}

function appendToRequest(messages, line) {
	const at = messages.findLastIndex((message) => message.role === 'user' && message.content === goal.request)
	if (at < 0) throw new Error('request not found in the body')
	return messages.map((message, index) => (index === at ? { ...message, content: `${message.content}\n\n${line}` } : message))
}

// A recorded response is one JSON object, or JSON lines when the run streamed; the text is their content joined.
function streamed(text) {
	const lines = text.split('\n').filter((line) => line.trim() !== '').map((line) => JSON.parse(line))
	return { content: lines.map((line) => line.message?.content ?? '').join(''), calls: lines.reduce((sum, line) => sum + (line.message?.tool_calls?.length ?? 0), 0) }
}

// The goal's final composing request: the last chat request whose current request is this goal's and whose
// recorded response is text with no tool call.
let chosen
for (const name of readdirSync(wire).filter((entry) => entry.endsWith('_api_chat-request.json')).sort()) {
	const { body } = JSON.parse(readFileSync(join(wire, name), 'utf8'))
	if (!body?.messages || !String(body.model).startsWith('qwen')) continue
	const current = body.messages.findLast((message) => message.role === 'user' && requests.has(message.content))
	if (current?.content !== goal.request) continue
	const response = JSON.parse(readFileSync(join(wire, name.replace('-request.json', '-response.json')), 'utf8'))
	const message = streamed(response.text)
	if (message.content.trim() !== '' && message.calls === 0) chosen = { name, body, recorded: message.content }
}
if (!chosen) {
	appendFileSync(out, `${JSON.stringify({ wire, goal: goal.id, transform, skipped: 'no final text request' })}\n`)
	process.exit(0)
}
execFileSync('node', ['/home/user/agent/tmp/bench/results/v7/tools/cold-start.mjs'], { stdio: 'ignore' })
// Streaming changes how the reply arrives, not what is sampled, so the probe asks for one object.
const body = { ...chosen.body, stream: false, messages: TRANSFORMS[transform](chosen.body.messages, chosen.recorded) }
const started = Date.now()
const response = await fetch('http://127.0.0.1:11434/api/chat', { method: 'POST', body: JSON.stringify(body) })
const data = await response.json()
const reply = data.message?.content ?? ''
const scored = scoreText(compileRules(goal), reply)
const pass = scored.missing.length === 0 && scored.violations.length === 0 && scored.patterns.length === 0
appendFileSync(out, `${JSON.stringify({ wire, request: chosen.name, goal: goal.id, transform, pass, missing: scored.missing, violations: scored.violations, patterns: scored.patterns.length, tools: (data.message?.tool_calls ?? []).map((call) => call.function?.name), sameAsRecorded: reply === chosen.recorded, ms: Date.now() - started, reply })}\n`)
console.log(`${goal.id} ${transform} ${pass ? 'PASS' : 'fail'} same ${reply === chosen.recorded} ${wire.split('/').pop()}`)
