// Re-sends one dumped `/api/chat` body (tmp/probes/wire-dump.test.ts) to a daemon with optional
// sampling overrides, and prints what came back chunk by chunk: thinking, content, tool calls,
// the stop reason, and the token counts.
// usage: node tmp/codex/wire-replay.ts FILE [--port P] [--host URL] [--temperature X] [--presence X] [--repeat X] [--last N] [--predict N] [--think true|false] [--raw]
// `--port P` rewrites every loopback port in the body to P, so a decision another port took is re-sent byte for byte.
// exit: 0 on a completed stream; 1 on a non-OK response; 64 on usage
import { readFileSync } from 'node:fs'

function readFlag(name: string): string | undefined {
	const index = process.argv.indexOf(name)
	if (index === -1) return undefined
	const value = process.argv[index + 1]
	return value === undefined || value.startsWith('--') ? undefined : value
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function main(): Promise<void> {
	const file = process.argv[2]
	if (file === undefined || file.startsWith('--')) {
		console.error('usage: node tmp/codex/wire-replay.ts FILE [--host URL] [--temperature X] [--presence X] [--repeat X] [--last N] [--predict N] [--think true|false] [--raw]')
		process.exit(64)
	}
	const port = readFlag('--port')
	const text = readFileSync(file, 'utf8')
	const dumped: unknown = JSON.parse(port === undefined ? text : text.replace(/127\.0\.0\.1:\d+/g, `127.0.0.1:${port}`))
	if (!isRecord(dumped) || !isRecord(dumped['body'])) throw new Error(`${file} holds no body`)
	const body = { ...dumped['body'] }
	// `--log LOG --turn N` keeps the dump's system message, tools, and options, and takes the
	// conversation before the N-th assistant message from a store-live attempt log instead.
	const logFile = readFlag('--log')
	const turn = readFlag('--turn')
	if (logFile !== undefined && turn !== undefined) {
		const log: unknown = JSON.parse(readFileSync(logFile, 'utf8'))
		if (!isRecord(log) || !Array.isArray(log['messages'])) throw new Error(`${logFile} holds no messages`)
		const system = Array.isArray(body['messages']) ? body['messages'][0] : undefined
		const wire: unknown[] = system === undefined ? [] : [system]
		let seen = 0
		for (const message of log['messages']) {
			if (!isRecord(message)) continue
			if (message['role'] === 'assistant') {
				seen += 1
				if (seen >= Number(turn)) break
			}
			const calls = Array.isArray(message['calls']) ? message['calls'] : []
			wire.push({
				role: message['role'],
				content: message['content'],
				...(calls.length > 0 ? { tool_calls: calls.map((call) => (isRecord(call) ? { function: { name: call['name'], arguments: call['arguments'] } } : call)) } : {}),
			})
		}
		body['messages'] = wire
	}
	const options = { ...(isRecord(body['options']) ? body['options'] : {}) }
	const temperature = readFlag('--temperature')
	const presence = readFlag('--presence')
	const repeat = readFlag('--repeat')
	const last = readFlag('--last')
	const predict = readFlag('--predict')
	const think = readFlag('--think')
	if (temperature !== undefined) options['temperature'] = Number(temperature)
	if (presence !== undefined) options['presence_penalty'] = Number(presence)
	if (repeat !== undefined) options['repeat_penalty'] = Number(repeat)
	if (last !== undefined) options['repeat_last_n'] = Number(last)
	if (predict !== undefined) options['num_predict'] = Number(predict)
	body['options'] = options
	if (think !== undefined) body['think'] = think === 'true'
	const host = readFlag('--host') ?? 'http://localhost:11434'
	const raw = process.argv.includes('--raw')
	console.log(`options ${JSON.stringify(options)} think ${String(body['think'])} tools ${Array.isArray(body['tools']) ? body['tools'].length : 0} messages ${Array.isArray(body['messages']) ? body['messages'].length : 0}`)
	const response = await fetch(`${host}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
	if (!response.ok || response.body === null) {
		console.log(`HTTP ${response.status}: ${await response.text()}`)
		process.exit(1)
	}
	let thinking = ''
	let content = ''
	const calls: unknown[] = []
	let done: Record<string, unknown> = {}
	let buffer = ''
	const decoder = new TextDecoder()
	for await (const chunk of response.body) {
		buffer += decoder.decode(chunk, { stream: true })
		let newline = buffer.indexOf('\n')
		while (newline >= 0) {
			const line = buffer.slice(0, newline).trim()
			buffer = buffer.slice(newline + 1)
			newline = buffer.indexOf('\n')
			if (line === '') continue
			const record: unknown = JSON.parse(line)
			if (!isRecord(record)) continue
			if (raw) console.log(line)
			const message = record['message']
			if (isRecord(message)) {
				if (typeof message['thinking'] === 'string') thinking += message['thinking']
				if (typeof message['content'] === 'string') content += message['content']
				if (Array.isArray(message['tool_calls'])) calls.push(...message['tool_calls'])
			}
			if (record['done'] === true) done = record
		}
	}
	console.log(`thinking (${thinking.length}): ${JSON.stringify(thinking.slice(0, 1200))}`)
	console.log(`content (${content.length}): ${JSON.stringify(content.slice(0, 1200))}`)
	console.log(`calls: ${JSON.stringify(calls)}`)
	console.log(`done_reason ${String(done['done_reason'])} prompt ${String(done['prompt_eval_count'])} eval ${String(done['eval_count'])}`)
}

await main()
