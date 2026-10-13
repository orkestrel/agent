// Diffs two directories of request bodies request by request: top-level fields, options, each tool, and each message.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const [left, right] = process.argv.slice(2)
const names = readdirSync(left).filter((name) => /^\d{3}\.json$/.test(name)).sort()
const kinds = new Map()
for (const name of names) {
	const a = JSON.parse(readFileSync(join(left, name), 'utf8'))
	const b = JSON.parse(readFileSync(join(right, name), 'utf8'))
	const note = (kind) => kinds.set(kind, [...(kinds.get(kind) ?? []), name.slice(0, 3)])
	for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
		if (key === 'messages' || key === 'tools') continue
		if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) note(`field ${key}: ${JSON.stringify(a[key])} | ${JSON.stringify(b[key])}`)
	}
	const order = (body) => (body.tools ?? []).map((tool) => tool.function.name).join(',')
	if (order(a) !== order(b)) note(`tool order: ${order(a)} | ${order(b)}`)
	for (const tool of a.tools ?? []) {
		const other = (b.tools ?? []).find((one) => one.function.name === tool.function.name)
		if (JSON.stringify(tool) !== JSON.stringify(other)) note(`tool ${tool.function.name}: ${JSON.stringify(tool.function.description)} | ${JSON.stringify(other?.function.description)}`)
	}
	if (a.messages.length !== b.messages.length) note(`message count ${a.messages.length} | ${b.messages.length}`)
	a.messages.forEach((message, index) => {
		if (JSON.stringify(message) !== JSON.stringify(b.messages[index])) note(`message ${message.role}: ${JSON.stringify(message).slice(0, 160)} | ${JSON.stringify(b.messages[index]).slice(0, 160)}`)
	})
}
process.stdout.write(`${names.length} request pairs\n`)
for (const [kind, where] of kinds) process.stdout.write(`${kind}\n   in requests ${where.length === names.length ? 'all' : where.join(',')}\n`)
