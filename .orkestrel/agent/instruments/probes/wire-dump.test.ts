import type { Message, ProviderInterface, ProviderResult, ProviderStreamOptions } from '@orkestrel/agent'
import type { ToolDefinition } from '@orkestrel/tool'
import { createBrowser } from '@orkestrel/browser/server'
import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { reservePort } from '../../tests/setupServer.js'
import { attemptStoreTask, STORE_BOUNDS, STORE_PREDICATES, STORE_TASKS } from '../../tests/setupStore.js'
import type { StoreTask } from '../../tests/setupStore.js'
import { createLiveOllama, PAGE_BROWSER_ARGS, requirePageBrowser } from '../../tests/setupService.js'
import type { OllamaProvider } from '@src/core'

// Runs one live store attempt per task through the real harness and writes every provider turn's
// exact `/api/chat` body beside the parsed result it produced, so the wire can be read and replayed.
// env: WIRE_DUMP_TASKS=journey,search WIRE_DUMP_PORT=49171 WIRE_DUMP_DIR=tmp/codex/wire [OLLAMA_MODEL]

function dumpProvider(provider: OllamaProvider, dir: string): ProviderInterface {
	let turn = 0
	const dump = (messages: readonly Message[], tools: readonly ToolDefinition[] | undefined, options: ProviderStreamOptions | undefined, result: ProviderResult): void => {
		turn += 1
		writeFileSync(
			`${dir}/turn-${String(turn).padStart(2, '0')}.json`,
			JSON.stringify({ body: provider.body({ messages, ...(tools === undefined ? {} : { tools }), ...(options === undefined ? {} : { options }) }), result }, undefined, 2),
		)
	}
	return {
		id: provider.id,
		name: provider.name,
		format: provider.format,
		generate: async (messages, signal, tools, options) => {
			const result = await provider.generate(messages, signal, tools, options)
			dump(messages, tools, options, result)
			return result
		},
		async *stream(messages, signal, tools, options) {
			const result = yield* provider.stream(messages, signal, tools, options)
			dump(messages, tools, options, result)
			return result
		},
	}
}

it('dumps the wire of one live attempt per task', async () => {
	const tasks = (process.env['WIRE_DUMP_TASKS'] ?? 'journey').split(',')
	const port = Number(process.env['WIRE_DUMP_PORT'] ?? '49171')
	const root = process.env['WIRE_DUMP_DIR'] ?? 'tmp/codex/wire'
	const browser = createBrowser({
		executable: requirePageBrowser().executable,
		headless: true,
		args: PAGE_BROWSER_ARGS,
		cdp: { port: await reservePort(), discover: false },
	})
	const summary: string[] = []
	try {
		await browser.connect()
		for (const taskName of tasks) {
			const task: StoreTask | undefined = Object.values(STORE_TASKS).find((candidate) => candidate.name === taskName)
			const predicate = STORE_PREDICATES[taskName]
			if (task === undefined || predicate === undefined) throw new Error(`Unknown task ${taskName}`)
			const dir = `${root}/${taskName}-${port}`
			mkdirSync(dir, { recursive: true })
			const provider = dumpProvider(
				createLiveOllama({ temperature: 0, context: STORE_BOUNDS.context, turn: STORE_BOUNDS.turn, predict: STORE_BOUNDS.predict }),
				dir,
			)
			const { transcript } = await attemptStoreTask(browser, task, 1, provider, port)
			writeFileSync(`${dir}/transcript.json`, JSON.stringify(transcript, undefined, 2))
			summary.push(`${taskName}: ${predicate(transcript) ? 'pass' : 'FAIL'}, ${transcript.calls.length} calls, ${transcript.usages.length} provider turns`)
		}
	} finally {
		await browser.destroy()
	}
	console.log(`wire-dump: ${summary.join('; ')}`)
	expect(summary.length).toBe(tasks.length)
}, 1_800_000)
