// Replays recorded agent calls under a condition to size the thinking cap and the context headroom: how
// many tokens a thinking pass spends before its answer, and how fast each model reads and writes.
//   node think-probe.ts --model MODEL --think on|off --per N --out FILE WIRE_DIR...
// Each WIRE_DIR gives N agent chat requests spaced evenly through the run; each replays with stream off,
// num_predict 4096, and num_ctx 8192, so neither limit cuts the pass. Exit: 0; 1 on a daemon error; 64 on usage.
import { appendFileSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const API = 'http://127.0.0.1:11434/api/chat'
const AGENT = 'qwen3.5:2b-q4_K_M'
const PREDICT = 4096
const CTX = 8192

function readFlag(argv: readonly string[], name: string): string | undefined {
	const at = argv.indexOf(name)
	if (at < 0) return undefined
	const value = argv[at + 1]
	return value === undefined || value.startsWith('--') ? undefined : value
}

function readRequests(dir: string, per: number): readonly { readonly file: string; readonly body: Record<string, unknown> }[] {
	const all = readdirSync(dir)
		.filter((name) => name.endsWith('_api_chat-request.json'))
		.sort()
		.map((name) => ({ file: name, body: JSON.parse(readFileSync(join(dir, name), 'utf8')).body as Record<string, unknown> }))
		.filter(({ body }) => body.model === AGENT)
	if (all.length <= per) return all
	return Array.from({ length: per }, (_, index) => all[Math.floor(((index + 0.5) * all.length) / per)])
}

async function main(): Promise<number> {
	const argv = process.argv.slice(2)
	const model = readFlag(argv, '--model')
	const think = readFlag(argv, '--think')
	const per = Number(readFlag(argv, '--per'))
	const out = readFlag(argv, '--out')
	const dirs = argv.filter((arg, at) => !arg.startsWith('--') && !argv[at - 1]?.startsWith('--'))
	if (model === undefined || (think !== 'on' && think !== 'off') || !Number.isInteger(per) || per < 1 || out === undefined || dirs.length === 0) {
		process.stderr.write('usage: node think-probe.ts --model MODEL --think on|off --per N --out FILE WIRE_DIR...\n')
		return 64
	}
	for (const dir of dirs) {
		for (const { file, body } of readRequests(dir, per)) {
			const options = { ...(body.options as Record<string, unknown>), num_predict: PREDICT, num_ctx: CTX }
			const response = await fetch(API, { method: 'POST', body: JSON.stringify({ ...body, model, think: think === 'on', stream: false, options }) })
			if (!response.ok) {
				process.stderr.write(`${basename(dir)} ${file}: ${response.status} ${await response.text()}\n`)
				return 1
			}
			const record = await response.json()
			const message = record.message ?? {}
			const row = {
				run: basename(dir),
				file,
				model,
				think: think === 'on',
				tools: Array.isArray(body.tools) ? body.tools.length : 0,
				prompt: record.prompt_eval_count,
				completion: record.eval_count,
				thinking: typeof message.thinking === 'string' ? message.thinking.length : 0,
				content: typeof message.content === 'string' ? message.content.length : 0,
				calls: Array.isArray(message.tool_calls) ? message.tool_calls.length : 0,
				reason: record.done_reason,
				promptRate: record.prompt_eval_duration > 0 ? (record.prompt_eval_count / record.prompt_eval_duration) * 1e9 : null,
				evalRate: record.eval_duration > 0 ? (record.eval_count / record.eval_duration) * 1e9 : null,
				seconds: record.total_duration / 1e9,
			}
			appendFileSync(out, `${JSON.stringify(row)}\n`)
			process.stdout.write(`${row.run} ${row.file} prompt ${row.prompt} completion ${row.completion} thinking ${row.thinking} content ${row.content} calls ${row.calls} reason ${row.reason} ${row.seconds.toFixed(1)} s\n`)
		}
	}
	return 0
}

process.exit(await main())
