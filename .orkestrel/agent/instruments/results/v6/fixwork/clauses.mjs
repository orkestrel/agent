// Lists the distinct clauses of recorded replies and answers of one goal that hold a word, for calibrating a pattern.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { plainText } from '../../../rescore.mjs'

const [prefix, word] = process.argv.slice(2)
const root = new URL('../../', import.meta.url).pathname
const seen = new Map()
const walk = (dir) => {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name)
		if (statSync(path).isDirectory()) walk(path)
		else if (name.endsWith('.jsonl'))
			for (const line of readFileSync(path, 'utf8').split('\n')) {
				let row
				try {
					row = JSON.parse(line)
				} catch {
					continue
				}
				if (typeof row.goal !== 'string' || !row.goal.startsWith(prefix)) continue
				for (const key of ['reply', 'answer', 'content'])
					for (const clause of plainText(row[key] ?? '').split(/[.\n]/))
						if (new RegExp(word, 'i').test(clause)) seen.set(clause.trim(), (seen.get(clause.trim()) ?? 0) + 1)
			}
	}
}
walk(root)
for (const [clause, count] of [...seen].sort((a, b) => b[1] - a[1])) console.log(count, JSON.stringify(clause))
