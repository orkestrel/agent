// Replays recorded think-on agent requests with and without the assistant thinking they dropped, to read
// what sending thinking back costs in prompt tokens and whether Ollama keeps it only inside the turn:
//   node replay-probe.ts --out FILE [--per N] [--predict N] [--dry] WIRE_DIR...
// For each WIRE_DIR, it takes up to N requests (default 6) of each kind, spaced through the run:
//   turn:  a request with an assistant message after its last user message; the variant sets each such
//          message's thinking from the response that produced it.
//   prior: a request with an assistant message before its last user message whose thinking is known; the
//          variant sets thinking on those messages only, so a reading equal to the base shows the drop.
// Each request is sent as recorded (base) and as the variant, with stream off and the recorded options;
// --predict overrides num_predict (1 reads the prompt cost alone). Rows are appended to FILE. --dry prints
// the selection and sends nothing.
// Exit: 0; 1 on a daemon error; 64 on usage.
import { appendFileSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const API = 'http://127.0.0.1:11434/api/chat'

interface Wire {
	readonly file: string
	readonly body: Record<string, unknown>
	readonly reply: { readonly content: string; readonly thinking: string; readonly calls: string } | undefined
}

function readFlag(argv: readonly string[], name: string): string | undefined {
	const at = argv.indexOf(name)
	if (at < 0) return undefined
	const value = argv[at + 1]
	return value === undefined || value.startsWith('--') ? undefined : value
}

function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
	if (value !== null && typeof value === 'object') {
		const record = value as Record<string, unknown>
		return `{${Object.keys(record)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
			.join(',')}}`
	}
	return JSON.stringify(value)
}

function callKey(calls: unknown): string {
	if (!Array.isArray(calls)) return '[]'
	return canonical(
		calls.map((call) => {
			const fn = (call as { function?: { name?: unknown; arguments?: unknown } }).function ?? {}
			return { name: fn.name, arguments: fn.arguments }
		}),
	)
}

function readReply(path: string): Wire['reply'] {
	const text = JSON.parse(readFileSync(path, 'utf8')).text
	if (typeof text !== 'string') return undefined
	let content = ''
	let thinking = ''
	let calls: unknown[] = []
	for (const line of text.split('\n')) {
		if (line.trim() === '') continue
		const record = JSON.parse(line)
		const message = record.message ?? {}
		if (typeof message.content === 'string') content += message.content
		if (typeof message.thinking === 'string') thinking += message.thinking
		if (Array.isArray(message.tool_calls)) calls = [...calls, ...message.tool_calls]
	}
	return { content, thinking, calls: callKey(calls) }
}

function readWires(dir: string): readonly Wire[] {
	return readdirSync(dir)
		.filter((name) => name.endsWith('_api_chat-request.json'))
		.sort()
		.map((name) => {
			const body = JSON.parse(readFileSync(join(dir, name), 'utf8')).body as Record<string, unknown>
			const response = join(dir, name.replace('-request.json', '-response.json'))
			let reply: Wire['reply']
			try {
				reply = readReply(response)
			} catch {
				reply = undefined
			}
			return { file: name, body, reply }
		})
		.filter(({ body }) => body.think === true)
}

function lastUser(messages: readonly Record<string, unknown>[]): number {
	for (let at = messages.length - 1; at >= 0; at -= 1) if (messages[at]?.role === 'user') return at
	return -1
}

// Sets thinking on the assistant messages the pick selects, from the latest earlier reply with the same
// content and calls; returns undefined when a selected message has no match or the match has no thinking.
function attach(
	wires: readonly Wire[],
	at: number,
	pick: (index: number, last: number) => boolean,
): readonly Record<string, unknown>[] | undefined {
	const messages = wires[at]?.body.messages as readonly Record<string, unknown>[]
	const last = lastUser(messages)
	let touched = 0
	const out = messages.map((message, index) => {
		if (message.role !== 'assistant' || !pick(index, last)) return message
		const content = typeof message.content === 'string' ? message.content : ''
		const calls = callKey(message.tool_calls)
		for (let back = at - 1; back >= 0; back -= 1) {
			const reply = wires[back]?.reply
			if (reply !== undefined && reply.content === content && reply.calls === calls) {
				if (reply.thinking === '') return message
				touched += 1
				return { ...message, thinking: reply.thinking }
			}
		}
		return message
	})
	return touched > 0 ? out : undefined
}

function spread<T>(list: readonly T[], per: number): readonly T[] {
	if (list.length <= per) return list
	return Array.from({ length: per }, (_, index) => list[Math.floor(((index + 0.5) * list.length) / per)] as T)
}

async function send(body: Record<string, unknown>, predict: number | undefined): Promise<Record<string, unknown>> {
	const options = { ...(body.options as Record<string, unknown>), ...(predict === undefined ? {} : { num_predict: predict }) }
	const response = await fetch(API, { method: 'POST', body: JSON.stringify({ ...body, stream: false, options }) })
	if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
	return response.json()
}

function read(record: Record<string, unknown>): Record<string, unknown> {
	const message = (record.message ?? {}) as Record<string, unknown>
	return {
		prompt: record.prompt_eval_count,
		completion: record.eval_count,
		thinking: typeof message.thinking === 'string' ? message.thinking.length : 0,
		content: typeof message.content === 'string' ? message.content : '',
		calls: callKey(message.tool_calls),
		reason: record.done_reason,
		seconds: typeof record.total_duration === 'number' ? record.total_duration / 1e9 : null,
	}
}

async function main(): Promise<number> {
	const argv = process.argv.slice(2)
	const out = readFlag(argv, '--out')
	const per = Number(readFlag(argv, '--per') ?? '6')
	const predictFlag = readFlag(argv, '--predict')
	const predict = predictFlag === undefined ? undefined : Number(predictFlag)
	const dry = argv.includes('--dry')
	const dirs = argv.filter((arg, at) => !arg.startsWith('--') && !(argv[at - 1]?.startsWith('--') && argv[at - 1] !== '--dry'))
	if (out === undefined || !Number.isInteger(per) || per < 1 || (predict !== undefined && (!Number.isInteger(predict) || predict < 1)) || dirs.length === 0) {
		process.stderr.write('usage: node replay-probe.ts --out FILE [--per N] [--predict N] [--dry] WIRE_DIR...\n')
		return 64
	}
	for (const dir of dirs) {
		const wires = readWires(dir)
		const turn: { at: number; messages: readonly Record<string, unknown>[] }[] = []
		const prior: { at: number; messages: readonly Record<string, unknown>[] }[] = []
		for (let at = 0; at < wires.length; at += 1) {
			const inside = attach(wires, at, (index, last) => index > last)
			if (inside !== undefined) turn.push({ at, messages: inside })
			const before = attach(wires, at, (index, last) => index < last)
			if (before !== undefined) prior.push({ at, messages: before })
		}
		for (const [kind, list] of [['turn', spread(turn, per)], ['prior', spread(prior, per)]] as const) {
			if (dry) process.stdout.write(`${basename(dir)} ${kind}: ${kind === 'turn' ? turn.length : prior.length} eligible of ${wires.length}, ${list.length} picked\n`)
			for (const { at, messages } of list) {
				const wire = wires[at] as Wire
				const added = messages.reduce((sum, message) => sum + (typeof message.thinking === 'string' ? message.thinking.length : 0), 0)
				if (dry) {
					process.stdout.write(`  ${wire.file} added ${added} chars\n`)
					continue
				}
				try {
					const base = read(await send(wire.body, predict))
					const variant = read(await send({ ...wire.body, messages }, predict))
					const row = { run: basename(dir), file: wire.file, kind, predict: predict ?? null, added, base, variant, delta: Number(variant.prompt) - Number(base.prompt), same: base.calls === variant.calls && base.content === variant.content }
					appendFileSync(out, `${JSON.stringify(row)}\n`)
					process.stdout.write(`${row.run} ${row.file} ${kind} added ${added} chars: prompt ${base.prompt} -> ${variant.prompt} (${row.delta}); completion ${base.completion} -> ${variant.completion}; reason ${base.reason}/${variant.reason}; same ${row.same}\n`)
				} catch (error) {
					process.stderr.write(`${basename(dir)} ${wire.file}: ${String(error)}\n`)
					return 1
				}
			}
		}
	}
	return 0
}

process.exit(await main())
