// Lists the rows whose verdict differs between two verdicts.mjs outputs, with the text that changed.
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line))
const [before, after] = process.argv.slice(2, 4).map(read)
const root = process.argv[4] ?? new URL('../../', import.meta.url).pathname
const counts = new Map()
for (const [index, row] of after.entries()) {
	for (const key of ['reply', 'answer', 'content']) {
		if (row[key] === before[index][key]) continue
		const text = JSON.parse(readFileSync(root + row.file, 'utf8').split('\n')[row.line - 1])[key]
		const id = `${row.goal.slice(0, 3)} ${key} ${before[index][key]}->${row[key]} ${JSON.stringify(text).slice(0, 400)}`
		counts.set(id, (counts.get(id) ?? 0) + 1)
	}
}
for (const [id, count] of counts) console.log(count, id)
