// Applies exact replacements to a file. The spec holds blocks of the form
// `@@@ from [COUNT]` / text / `@@@ to` / text / `@@@ end`; each `from` text must match exactly COUNT times (default 1).
import { readFileSync, writeFileSync } from 'node:fs'
const [file, specPath] = process.argv.slice(2)
const spec = readFileSync(specPath, 'utf8')
const edits = []
const pattern = /^@@@ from(?: (\d+))?\n([\s\S]*?)\n@@@ to\n([\s\S]*?)\n?@@@ end$/gm
for (const [, count, from, to] of spec.matchAll(pattern)) edits.push({ from, to: to.replace(/\n$/, ''), count: count === undefined ? 1 : Number(count) })
let text = readFileSync(file, 'utf8')
for (const [index, { from, to, count }] of edits.entries()) {
	const found = text.split(from).length - 1
	if (found !== count) throw new Error(`edit ${index + 1}: found ${found} matches, expected ${count}: ${from.slice(0, 100)}`)
	text = text.split(from).join(to)
}
writeFileSync(file, text)
process.stdout.write(`applied ${edits.length} edits to ${file}\n`)
