// Field-by-field diff of request bodies: top-level fields, options, tools, system text, and messages.
import { readFileSync } from 'node:fs'
const files = process.argv.slice(2)
const bodies = files.map((file) => JSON.parse(readFileSync(file, 'utf8')))
const show = (value) => JSON.stringify(value)
const keys = [...new Set(bodies.flatMap((body) => Object.keys(body)))]
for (const key of keys) {
	if (key === 'messages' || key === 'tools') continue
	const values = bodies.map((body) => show(body[key]))
	process.stdout.write(`${new Set(values).size === 1 ? 'same' : 'DIFF'} ${key}: ${values.join(' | ')}\n`)
}
const toolNames = bodies.map((body) => (body.tools ?? []).map((tool) => tool.function.name).join(','))
process.stdout.write(`${new Set(toolNames).size === 1 ? 'same' : 'DIFF'} tool order: ${toolNames.join(' | ')}\n`)
const allTools = [...new Set(bodies.flatMap((body) => (body.tools ?? []).map((tool) => tool.function.name)))]
for (const name of allTools) {
	const values = bodies.map((body) => show(body.tools?.find((tool) => tool.function.name === name) ?? null))
	process.stdout.write(`${new Set(values).size === 1 ? 'same' : 'DIFF'} tool ${name}:\n${[...new Set(values)].length === 1 ? '' : values.map((value, index) => `   [${index}] ${value}\n`).join('')}`)
}
const counts = bodies.map((body) => body.messages.length)
process.stdout.write(`${new Set(counts).size === 1 ? 'same' : 'DIFF'} message count: ${counts.join(' | ')}\n`)
const longest = Math.max(...counts)
for (let index = 0; index < longest; index += 1) {
	const values = bodies.map((body) => show(body.messages[index] ?? null))
	if (new Set(values).size === 1) continue
	process.stdout.write(`DIFF message ${index}:\n${values.map((value, which) => `   [${which}] ${value}\n`).join('')}`)
}
process.stdout.write(`message roles [0]: ${bodies[0].messages.map((message) => message.role[0]).join('')}\n`)
