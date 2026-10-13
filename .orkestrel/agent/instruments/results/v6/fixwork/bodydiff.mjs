// Compares two folders of recorded request bodies pairwise, in name order, and classifies every
// difference: options, tools, other top-level fields, and each message whose content or calls differ.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const [left, right] = process.argv.slice(2)
const names = (dir) => readdirSync(dir).filter((name) => name.endsWith('.json')).sort()
const a = names(left)
const b = names(right)
if (a.length !== b.length) process.stdout.write(`body counts differ: ${a.length} against ${b.length}\n`)
const short = (text) => JSON.stringify(text.length > 110 ? `${text.slice(0, 110)}...` : text)
const optionDiffs = new Set()
let identical = 0
const toolsSame = { same: 0, differ: 0 }
for (const [index, name] of a.entries()) {
	const one = JSON.parse(readFileSync(join(left, name), 'utf8'))
	const two = JSON.parse(readFileSync(join(right, b[index]), 'utf8'))
	const notes = []
	if (JSON.stringify(one.options) !== JSON.stringify(two.options)) optionDiffs.add(`${JSON.stringify(one.options)} -> ${JSON.stringify(two.options)}`)
	if (JSON.stringify(one.tools) === JSON.stringify(two.tools)) toolsSame.same += 1
	else {
		toolsSame.differ += 1
		notes.push('tools differ')
	}
	for (const key of new Set([...Object.keys(one), ...Object.keys(two)]))
		if (!['options', 'tools', 'messages'].includes(key) && JSON.stringify(one[key]) !== JSON.stringify(two[key])) notes.push(`field ${key} differs`)
	const count = Math.max(one.messages.length, two.messages.length)
	for (let at = 0; at < count; at += 1) {
		const x = one.messages[at]
		const y = two.messages[at]
		if (JSON.stringify(x) === JSON.stringify(y)) continue
		if (x === undefined || y === undefined) notes.push(`message ${at} only in ${x === undefined ? 'right' : 'left'}`)
		else notes.push(`message ${at} (${x.role}${x.tool_name ? ` ${x.tool_name}` : ''}): ${short(x.content)} -> ${short(y.content)}`)
	}
	if (notes.length === 0) identical += 1
	const notices = notes.filter((note) => note.includes('-> "You already have this result')).length
	const rest = notes.filter((note) => !note.includes('-> "You already have this result'))
	if (notes.length > 0) process.stdout.write(`${b[index]}: ${notices} tool results replaced by the repeat notice${rest.length === 0 ? '' : `; other: ${rest.join(' | ')}`}\n`)
}
process.stdout.write(`${a.length} bodies; identical apart from options: ${identical}\n`)
process.stdout.write(`options changes: ${[...optionDiffs].join(' | ') || 'none'}\n`)
process.stdout.write(`tools arrays: ${toolsSame.same} identical, ${toolsSame.differ} differ\n`)
