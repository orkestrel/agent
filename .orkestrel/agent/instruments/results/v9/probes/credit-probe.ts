// Replays the request that wrote a goal's final answer in a recorded briefing wire, from a cold daemon,
// with one change to its messages, and scores the reply with the shared scorer:
//   node credit-probe.ts WIRE_DIR SCENARIO GOAL_INDEX TRANSFORM OUT_JSONL
// TRANSFORM is base, strip-handles, strip-rules, strip-pinned, or plain-system. base sends the recorded
// messages unchanged, so it is the cold control the other transforms compare against. It supersedes
// probe.mjs for this question. Exit: 0 probed or skipped; 3 when the cold start fails; 64 on usage.
import { spawnSync } from 'node:child_process'
import { appendFileSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { compileRules, scoreText } from '/home/user/agent/tmp/bench/rescore.mjs'

interface Message {
	readonly role: string
	readonly content: string
	readonly tool_calls?: readonly unknown[]
}

const TRANSFORMS: ReadonlySet<string> = new Set(['base', 'strip-handles', 'strip-rules', 'strip-pinned', 'plain-system'])
const HANDLE = /^\[r\d+\] /

function readMessages(value: unknown): readonly Message[] {
	if (!Array.isArray(value)) return []
	return value.flatMap((entry) =>
		typeof entry === 'object' && entry !== null && typeof entry.role === 'string' && typeof entry.content === 'string' ? [entry] : [],
	)
}

function dropSection(system: string, heading: string): string {
	const start = system.indexOf(`\n${heading}\n`)
	if (start < 0) return system
	const next = system.indexOf('\n## ', start + heading.length + 2)
	return next < 0 ? system.slice(0, start).trimEnd() : system.slice(0, start) + system.slice(next)
}

function transform(name: string, messages: readonly Message[], baseSystem: string): readonly Message[] {
	if (name === 'strip-handles') return messages.map((message) => (message.role === 'tool' ? { ...message, content: message.content.replace(HANDLE, '') } : message))
	if (name === 'strip-rules') return messages.map((message, index) => (index === 0 ? { ...message, content: dropSection(message.content, '## Rules') } : message))
	if (name === 'strip-pinned') return messages.map((message, index) => (index === 0 ? { ...message, content: dropSection(message.content, '## Pinned') } : message))
	if (name === 'plain-system') return messages.map((message, index) => (index === 0 ? { ...message, content: `${baseSystem} Today is Thursday 2026-10-08.` } : message))
	return messages
}

function readStreamed(text: string): { readonly content: string; readonly calls: number } {
	const lines = text
		.split(/\r\n|\n/)
		.filter((line) => line.trim() !== '')
		.map((line): unknown => JSON.parse(line))
	let content = ''
	let calls = 0
	for (const line of lines) {
		if (typeof line !== 'object' || line === null || !('message' in line) || typeof line.message !== 'object' || line.message === null) continue
		if ('content' in line.message && typeof line.message.content === 'string') content += line.message.content
		if ('tool_calls' in line.message && Array.isArray(line.message.tool_calls)) calls += line.message.tool_calls.length
	}
	return { content, calls }
}

async function main(): Promise<number> {
	const [wire, scenarioPath, goalArg, name, out] = process.argv.slice(2)
	if (wire === undefined || scenarioPath === undefined || goalArg === undefined || name === undefined || out === undefined || !TRANSFORMS.has(name)) {
		process.stderr.write('usage: node credit-probe.ts WIRE_DIR SCENARIO GOAL_INDEX base|strip-handles|strip-rules|strip-pinned|plain-system OUT_JSONL\n')
		return 64
	}
	const scenario = JSON.parse(readFileSync(scenarioPath, 'utf8'))
	const goal = scenario.goals[Number(goalArg)]
	const requests = new Set(scenario.goals.map((entry: { request: string }) => entry.request))
	let chosen: { readonly file: string; readonly body: Record<string, unknown>; readonly messages: readonly Message[] } | undefined
	for (const file of readdirSync(wire).filter((entry) => entry.endsWith('_api_chat-request.json')).sort()) {
		const body = JSON.parse(readFileSync(join(wire, file), 'utf8')).body
		const messages = readMessages(body?.messages)
		if (messages.length === 0 || !String(body.model).startsWith('qwen')) continue
		const current = messages.findLast((message) => message.role === 'user' && requests.has(message.content))
		if (current?.content !== goal.request) continue
		const response = readStreamed(JSON.parse(readFileSync(join(wire, file.replace('-request.json', '-response.json')), 'utf8')).text)
		if (response.content.trim() !== '' && response.calls === 0) chosen = { file, body, messages }
	}
	if (chosen === undefined) {
		appendFileSync(out, `${JSON.stringify({ wire, goal: goal.id, transform: name, skipped: 'no final text request' })}\n`)
		return 0
	}
	const cold = spawnSync(process.execPath, ['/home/user/agent/tmp/bench/results/v7/tools/cold-start.mjs'], { stdio: 'ignore' })
	if (cold.status !== 0) return 3
	// Streaming changes how the reply arrives, not what is sampled, so the probe asks for one object.
	const body = { ...chosen.body, stream: false, messages: transform(name, chosen.messages, String(scenario.system)) }
	const started = Date.now()
	const data = await (await fetch('http://127.0.0.1:11434/api/chat', { method: 'POST', body: JSON.stringify(body) })).json()
	const reply = typeof data?.message?.content === 'string' ? data.message.content : ''
	const scored = scoreText(compileRules(goal), reply)
	const pass = scored.missing.length === 0 && scored.violations.length === 0 && scored.patterns.length === 0
	appendFileSync(out, `${JSON.stringify({ wire, request: chosen.file, goal: goal.id, transform: name, pass, missing: scored.missing, patterns: scored.patterns.length, ms: Date.now() - started, reply })}\n`)
	process.stdout.write(`${goal.id} ${name} ${pass ? 'PASS' : 'fail'} ${wire.split('/').pop()}\n`)
	return 0
}

process.exit(await main())
