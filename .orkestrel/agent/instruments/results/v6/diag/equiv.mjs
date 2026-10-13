// Checks that two wire folders differ only in the three lookup and search tool descriptions.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const [left, right] = process.argv.slice(2)
const names = readdirSync(left).filter((name) => name.endsWith('-body.json')).sort()
const strip = (body) => ({ ...body, tools: body.tools?.map((tool) => ({ ...tool, function: { ...tool.function, description: undefined } })) })
let same = 0
let raw = 0
for (const name of names) {
	const a = readFileSync(join(left, name), 'utf8')
	const b = readFileSync(join(right, name), 'utf8')
	if (a === b) raw += 1
	if (JSON.stringify(strip(JSON.parse(a))) === JSON.stringify(strip(JSON.parse(b)))) same += 1
	else process.stdout.write(`${name}: differs beyond descriptions\n`)
}
process.stdout.write(`${left} vs ${right}: ${names.length} bodies, ${raw} byte-identical, ${same} identical once tool descriptions are removed\n`)
