// Loads bench.mjs.pre-reply in place as an ES module; its extension names no format.
import { readFileSync } from 'node:fs'
export async function load(url, context, next) {
	if (url.endsWith('.pre-reply')) return { format: 'module', source: readFileSync(new URL(url)), shortCircuit: true }
	return next(url, context)
}
