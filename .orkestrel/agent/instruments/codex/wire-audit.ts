// Reads store-live attempt logs and reports what crossed the wire: prompt sizes per provider turn,
// completions that hit the output budget, assistant turns with no text and no call, calls whose
// arguments did not arrive as an object, and the assistant text that preceded each refused call.
// usage: node tmp/codex/wire-audit.ts [--budget N] [--calls] DIR...
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

interface LoggedCall {
	readonly name: string
	readonly arguments: unknown
	readonly success: boolean
	readonly text: string
}

interface LoggedMessage {
	readonly role: string
	readonly content: string
	readonly calls?: readonly { readonly name: string; readonly arguments: unknown }[]
}

interface LoggedUsage {
	readonly prompt: number
	readonly completion: number
}

interface AttemptLog {
	readonly name: string
	readonly messages: readonly LoggedMessage[]
	readonly calls: readonly LoggedCall[]
	readonly usages: readonly LoggedUsage[]
	readonly partial: boolean
	readonly ended: number
	readonly violations: number
	readonly answer: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readFlag(name: string): string | undefined {
	const index = process.argv.indexOf(name)
	if (index === -1) return undefined
	const value = process.argv[index + 1]
	return value === undefined || value.startsWith('--') ? undefined : value
}

function main(): void {
	const budget = Number(readFlag('--budget') ?? '256')
	const showCalls = process.argv.includes('--calls')
	const dirs = process.argv.slice(2).filter((argument, index, all) => !argument.startsWith('--') && all[index - 1] !== '--budget')
	if (dirs.length === 0) {
		console.error('usage: node tmp/codex/wire-audit.ts [--budget N] [--calls] DIR...')
		process.exit(64)
	}
	for (const dir of dirs) {
		console.log(`# ${dir}`)
		let attempts = 0
		let turns = 0
		let capped = 0
		let silent = 0
		let unshaped = 0
		let maxPrompt = 0
		const cappedCalls = new Map<string, number>()
		for (const file of readdirSync(dir).filter((candidate) => candidate.endsWith('.json')).sort()) {
			const log: AttemptLog = JSON.parse(readFileSync(join(dir, file), 'utf8'))
			attempts += 1
			const assistants = log.messages.filter((message) => message.role === 'assistant')
			const prompts = log.usages.map((usage) => usage.prompt)
			const peak = Math.max(0, ...prompts)
			maxPrompt = Math.max(maxPrompt, peak)
			turns += log.usages.length
			const cappedHere: string[] = []
			log.usages.forEach((usage, index) => {
				if (usage.completion < budget) return
				capped += 1
				const assistant = assistants[index]
				const names = assistant?.calls?.map((call) => call.name).join(',') ?? ''
				const label = names === '' ? (assistant === undefined ? '?' : assistant.content.trim() === '' ? '(nothing)' : '(text)') : names
				cappedCalls.set(label, (cappedCalls.get(label) ?? 0) + 1)
				cappedHere.push(`turn ${index + 1}: ${usage.completion} tokens → ${label}`)
			})
			const silentHere = assistants.filter((message) => message.content.trim() === '' && (message.calls === undefined || message.calls.length === 0)).length
			silent += silentHere
			const unshapedHere = log.calls.filter((call) => !isRecord(call.arguments))
			unshaped += unshapedHere.length
			console.log(
				`${file}: turns ${log.usages.length}, peak prompt ${peak}, capped ${cappedHere.length}, silent ${silentHere}, unshaped ${unshapedHere.length}, violations ${log.violations}, ended ${log.ended}, partial ${log.partial}`,
			)
			for (const line of cappedHere) console.log(`  ${line}`)
			for (const call of unshapedHere) console.log(`  unshaped ${call.name}: ${JSON.stringify(call.arguments).slice(0, 160)}`)
			if (showCalls) {
				for (const message of log.messages) {
					if (message.role !== 'assistant') continue
					const text = message.content.trim()
					const names = message.calls?.map((call) => `${call.name}${JSON.stringify(call.arguments).slice(0, 80)}`).join(' | ') ?? ''
					if (text !== '' || names !== '') console.log(`  ${text === '' ? '' : `"${text.slice(0, 160)}" `}${names}`)
				}
			}
		}
		console.log(`totals: attempts ${attempts}, provider turns ${turns}, capped ${capped}, silent ${silent}, unshaped ${unshaped}, max prompt ${maxPrompt}`)
		for (const [label, count] of [...cappedCalls.entries()].sort((left, right) => right[1] - left[1])) console.log(`  capped → ${label}: ${count}`)
	}
}

main()
