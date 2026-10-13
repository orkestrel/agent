// Shows the raw tokens behind recorded calls whose content came back empty: renders each recorded /api/chat
// request through Ollama's own template, sends that prompt raw so no parser splits it, and reports whether the
// model closed its thinking with `</think>` and what it wrote after the tag:
//   node raw-probe.ts --out FILE WIRE_DIR/NNNNN_api_chat-request.json...
// Rendering uses the request field `_debug_render_only`; generation uses /api/generate with `raw: true` and the
// recorded options. Exit: 0; 1 on a daemon error or when Ollama returns no rendered prompt; 64 on usage.
import { appendFileSync, readFileSync } from 'node:fs'
import { basename, dirname } from 'node:path'

const API = 'http://127.0.0.1:11434'

function readFlag(argv: readonly string[], name: string): string | undefined {
	const at = argv.indexOf(name)
	if (at < 0) return undefined
	const value = argv[at + 1]
	return value === undefined || value.startsWith('--') ? undefined : value
}

async function post(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
	const response = await fetch(`${API}${path}`, { method: 'POST', body: JSON.stringify(body) })
	if (!response.ok) throw new Error(`${path} ${response.status} ${await response.text()}`)
	return response.json()
}

async function main(): Promise<number> {
	const argv = process.argv.slice(2)
	const out = readFlag(argv, '--out')
	const files = argv.filter((arg, at) => !arg.startsWith('--') && argv[at - 1] !== '--out')
	if (out === undefined || files.length === 0) {
		process.stderr.write('usage: node raw-probe.ts --out FILE WIRE_DIR/NNNNN_api_chat-request.json...\n')
		return 64
	}
	for (const file of files) {
		const body = JSON.parse(readFileSync(file, 'utf8')).body as Record<string, unknown>
		try {
			const rendered = await post('/api/chat', { ...body, stream: false, _debug_render_only: true })
			const info = (rendered._debug_info ?? {}) as Record<string, unknown>
			const prompt = info.rendered_template
			if (typeof prompt !== 'string' || prompt === '') {
				process.stderr.write(`${file}: no rendered prompt; keys ${Object.keys(rendered).join(',')}\n`)
				return 1
			}
			const raw = await post('/api/generate', { model: body.model, prompt, raw: true, stream: false, keep_alive: '30m', options: body.options })
			const text = typeof raw.response === 'string' ? raw.response : ''
			const close = text.indexOf('</think>')
			const row = {
				run: basename(dirname(file)),
				file: basename(file),
				promptTail: prompt.slice(-80),
				completion: raw.eval_count,
				reason: raw.done_reason,
				closed: close >= 0,
				before: close >= 0 ? text.slice(0, close).length : text.length,
				after: close >= 0 ? text.slice(close + '</think>'.length) : null,
				thinkingField: typeof raw.thinking === 'string' ? raw.thinking.length : null,
				textTail: text.slice(-300),
			}
			appendFileSync(out, `${JSON.stringify(row)}\n`)
			process.stdout.write(`${row.run} ${row.file}: completion ${row.completion} ${row.reason}; </think> ${row.closed ? 'present' : 'absent'}; ${row.before} chars before; after ${JSON.stringify(row.after)}; parser thinking field ${row.thinkingField}\n`)
		} catch (error) {
			process.stderr.write(`${file}: ${String(error)}\n`)
			return 1
		}
	}
	return 0
}

process.exit(await main())
