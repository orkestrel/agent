// Serves bench.mjs or rescore.mjs with one exact replacement from $MUTATE_FILE, $MUTATE_FROM, and $MUTATE_TO, in memory only.
import { readFileSync } from 'node:fs'
export async function load(url, context, next) {
	const file = process.env.MUTATE_FILE ?? 'bench.mjs'
	if (!url.endsWith(`/tmp/bench/${file}`)) return next(url, context)
	const source = readFileSync(new URL(url), 'utf8')
	const from = process.env.MUTATE_FROM
	if (source.split(from).length !== 2) throw new Error(`mutation source must match once in ${file}`)
	return { format: 'module', source: source.replace(from, () => process.env.MUTATE_TO), shortCircuit: true }
}
