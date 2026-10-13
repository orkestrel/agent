// Replays recorded agent calls under a condition to size the thinking cap and the context headroom: how
// many tokens a thinking pass spends before its answer, and how fast each model reads and writes.
//   node think-probe.ts --model MODEL --think on|off --per N --out FILE [--from MODEL] [--tools-only]
//     [--ctx N] [--predict N] [--temperature T] [--seed N] [--timeout-ms N] [--max-cuts K] [--list] WIRE_DIR...
// Each WIRE_DIR gives N agent chat requests spaced evenly through the run, chosen among bodies whose model is
// --from (default qwen3.5:2b-q4_K_M), that are not seed measures (num_predict 1), and, with --tools-only, that
// carry tools. Each replays with stream off, num_predict 4096, and num_ctx 8192 unless --predict or --ctx says
// otherwise. --list prints the selected files and a count, sends nothing, and needs only --per and WIRE_DIR.
// Exit: 0; 1 on a daemon error other than a timeout; 64 on usage.
import { appendFileSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

interface Request {
	readonly file: string
	readonly body: Record<string, unknown>
}

const API = 'http://127.0.0.1:11434/api/chat'
const FROM = 'qwen3.5:2b-q4_K_M'
const PREDICT = 4096
const CTX = 8192
const USAGE =
	'usage: node think-probe.ts --model MODEL --think on|off --per N --out FILE [--from MODEL] [--tools-only] [--ctx N] [--predict N] [--temperature T] [--seed N] [--timeout-ms N] [--max-cuts K] [--list] WIRE_DIR...\n'
const VALUE_FLAGS = new Set(['--model', '--think', '--per', '--out', '--from', '--ctx', '--predict', '--temperature', '--seed', '--timeout-ms', '--max-cuts'])
const SWITCH_FLAGS = new Set(['--tools-only', '--list'])

interface Parsed {
	readonly values: ReadonlyMap<string, string>
	readonly switches: ReadonlySet<string>
	readonly dirs: readonly string[]
}

function parseArgs(argv: readonly string[]): Parsed | undefined {
	const values = new Map<string, string>()
	const switches = new Set<string>()
	const dirs: string[] = []
	for (let at = 0; at < argv.length; at++) {
		const arg = argv[at]
		if (SWITCH_FLAGS.has(arg)) {
			switches.add(arg)
		} else if (VALUE_FLAGS.has(arg)) {
			const value = argv[at + 1]
			if (value === undefined || value.startsWith('--')) return undefined
			values.set(arg, value)
			at++
		} else if (arg.startsWith('--')) {
			return undefined
		} else {
			dirs.push(arg)
		}
	}
	return { values, switches, dirs }
}

function readNumber(values: ReadonlyMap<string, string>, name: string, fallback: number | undefined, integer: boolean, min: number): number | undefined | null {
	const raw = values.get(name)
	if (raw === undefined) return fallback
	const value = Number(raw)
	if (!Number.isFinite(value) || value < min || (integer && !Number.isInteger(value))) return null
	return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readRequests(dir: string, per: number, from: string, toolsOnly: boolean): readonly Request[] {
	const all = readdirSync(dir)
		.filter((name) => name.endsWith('_api_chat-request.json'))
		.sort()
		.map((name): Request | undefined => {
			const parsed: unknown = JSON.parse(readFileSync(join(dir, name), 'utf8'))
			return isRecord(parsed) && isRecord(parsed.body) ? { file: name, body: parsed.body } : undefined
		})
		.filter((request): request is Request => request !== undefined)
		.filter(({ body }) => body.model === from)
		.filter(({ body }) => !(isRecord(body.options) && body.options.num_predict === 1))
		.filter(({ body }) => !toolsOnly || (Array.isArray(body.tools) && body.tools.length > 0))
	if (all.length <= per) return all
	return Array.from({ length: per }, (_, index) => all[Math.floor(((index + 0.5) * all.length) / per)])
}

function isTimeout(error: unknown): boolean {
	return error instanceof Error && error.name === 'TimeoutError'
}

async function main(): Promise<number> {
	const parsed = parseArgs(process.argv.slice(2))
	if (parsed === undefined) {
		process.stderr.write(USAGE)
		return 64
	}
	const { values, switches, dirs } = parsed
	const list = switches.has('--list')
	const toolsOnly = switches.has('--tools-only')
	const model = values.get('--model')
	const think = values.get('--think')
	const out = values.get('--out')
	const from = values.get('--from') ?? FROM
	const per = readNumber(values, '--per', undefined, true, 1)
	const ctx = readNumber(values, '--ctx', CTX, true, 1)
	const predict = readNumber(values, '--predict', PREDICT, true, 1)
	const temperature = readNumber(values, '--temperature', undefined, false, 0)
	const seed = readNumber(values, '--seed', undefined, true, 0)
	const timeoutMs = readNumber(values, '--timeout-ms', undefined, true, 1)
	const maxCuts = readNumber(values, '--max-cuts', undefined, true, 1)
	const valid =
		typeof per === 'number' &&
		typeof ctx === 'number' &&
		typeof predict === 'number' &&
		temperature !== null &&
		seed !== null &&
		timeoutMs !== null &&
		maxCuts !== null &&
		dirs.length > 0 &&
		(list || (model !== undefined && (think === 'on' || think === 'off') && out !== undefined))
	if (!valid) {
		process.stderr.write(USAGE)
		return 64
	}
	if (list) {
		let count = 0
		for (const dir of dirs) {
			for (const { file } of readRequests(dir, per, from, toolsOnly)) {
				process.stdout.write(`${join(dir, file)}\n`)
				count++
			}
		}
		process.stdout.write(`${count} files\n`)
		return 0
	}
	if (model === undefined || out === undefined) return 64
	let cuts = 0
	for (const dir of dirs) {
		for (const { file, body } of readRequests(dir, per, from, toolsOnly)) {
			const recorded = isRecord(body.options) ? body.options : {}
			const options = {
				...recorded,
				num_predict: predict,
				num_ctx: ctx,
				...(temperature === undefined ? {} : { temperature }),
				...(seed === undefined ? {} : { seed }),
			}
			const base = { run: basename(dir), file, model, think: think === 'on', tools: Array.isArray(body.tools) ? body.tools.length : 0 }
			const started = performance.now()
			let record: Record<string, unknown>
			try {
				const response = await fetch(API, {
					method: 'POST',
					body: JSON.stringify({ ...body, model, think: think === 'on', stream: false, options }),
					signal: timeoutMs === undefined ? undefined : AbortSignal.timeout(timeoutMs),
				})
				if (!response.ok) {
					process.stderr.write(`${basename(dir)} ${file}: ${response.status} ${await response.text()}\n`)
					return 1
				}
				const json: unknown = await response.json()
				record = isRecord(json) ? json : {}
			} catch (error) {
				if (!isTimeout(error)) {
					process.stderr.write(`${basename(dir)} ${file}: ${error instanceof Error ? error.message : String(error)}\n`)
					return 1
				}
				const row = {
					...base,
					prompt: null,
					completion: null,
					thinking: 0,
					thinkingText: '',
					content: 0,
					calls: 0,
					reason: 'timeout',
					promptRate: null,
					evalRate: null,
					seconds: (performance.now() - started) / 1000,
				}
				appendFileSync(out, `${JSON.stringify(row)}\n`)
				process.stdout.write(`${row.run} ${row.file} timeout after ${row.seconds.toFixed(1)} s\n`)
				continue
			}
			const message = isRecord(record.message) ? record.message : {}
			const promptCount = Number(record.prompt_eval_count)
			const promptDuration = Number(record.prompt_eval_duration)
			const evalCount = Number(record.eval_count)
			const evalDuration = Number(record.eval_duration)
			const thinkingText = typeof message.thinking === 'string' ? message.thinking : ''
			const row = {
				...base,
				prompt: record.prompt_eval_count,
				completion: record.eval_count,
				thinking: thinkingText.length,
				thinkingText,
				content: typeof message.content === 'string' ? message.content.length : 0,
				calls: Array.isArray(message.tool_calls) ? message.tool_calls.length : 0,
				reason: record.done_reason,
				promptRate: promptDuration > 0 ? (promptCount / promptDuration) * 1e9 : null,
				evalRate: evalDuration > 0 ? (evalCount / evalDuration) * 1e9 : null,
				seconds: Number(record.total_duration) / 1e9,
			}
			appendFileSync(out, `${JSON.stringify(row)}\n`)
			process.stdout.write(`${row.run} ${row.file} prompt ${row.prompt} completion ${row.completion} thinking ${row.thinking} content ${row.content} calls ${row.calls} reason ${row.reason} ${row.seconds.toFixed(1)} s\n`)
			if (row.reason === 'length') {
				cuts++
				if (maxCuts !== undefined && cuts >= maxCuts) {
					process.stdout.write(`stopped: ${cuts} rows reached reason length (--max-cuts ${maxCuts})\n`)
					return 0
				}
			}
		}
	}
	return 0
}

process.exit(await main())
