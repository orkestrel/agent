// Replaces each exact `old` text of a pair list once in a file, failing when a text is absent or repeated.
import { readFileSync, writeFileSync } from 'node:fs'

export function swap(file, pairs) {
	let text = readFileSync(file, 'utf8')
	for (const [old, replacement] of pairs) {
		const count = text.split(old).length - 1
		if (count !== 1) throw new Error(`${file}: ${count} matches for ${JSON.stringify(old.slice(0, 80))}`)
		text = text.replace(old, () => replacement)
	}
	writeFileSync(file, text)
}
