// Prints one store-live attempt log as the model saw it: each user turn, each assistant turn's
// thinking and calls with their full arguments, and each tool reply, trimmed to a width.
// usage: node tmp/codex/thinking.ts LOG [--from N] [--width CHARS]
import { readFileSync } from 'node:fs'

interface LoggedMessage {
	readonly role: string
	readonly content: string
	readonly thinking?: string
	readonly calls?: readonly { readonly name: string; readonly arguments: unknown }[]
}

function readFlag(name: string): string | undefined {
	const index = process.argv.indexOf(name)
	if (index === -1) return undefined
	const value = process.argv[index + 1]
	return value === undefined || value.startsWith('--') ? undefined : value
}

function trim(text: string, width: number): string {
	const flat = text.replace(/\s+/g, ' ').trim()
	return flat.length <= width ? flat : `${flat.slice(0, width)}…`
}

function main(): void {
	const file = process.argv[2]
	if (file === undefined || file.startsWith('--')) {
		console.error('usage: node tmp/codex/thinking.ts LOG [--from N] [--width CHARS]')
		process.exit(64)
	}
	const from = Number(readFlag('--from') ?? '1')
	const width = Number(readFlag('--width') ?? '400')
	const log: { readonly messages: readonly LoggedMessage[] } = JSON.parse(readFileSync(file, 'utf8'))
	let turn = 0
	for (const message of log.messages) {
		if (message.role === 'assistant') turn += 1
		if (turn < from && message.role !== 'user') continue
		if (message.role === 'user') console.log(`USER: ${trim(message.content, width)}`)
		else if (message.role === 'assistant') {
			if (message.thinking !== undefined) console.log(`#${turn} think: ${trim(message.thinking, width)}`)
			const calls = message.calls ?? []
			if (calls.length === 0) console.log(`#${turn} says: ${trim(message.content, width) || '(nothing)'}`)
			for (const call of calls) console.log(`#${turn} ${call.name} ${trim(JSON.stringify(call.arguments), width)}`)
		} else if (message.role === 'tool') console.log(`   → ${trim(message.content, width)}`)
	}
}

main()
