// Loads a `.pre-fix` copy in place as an ES module; its extension names no format.
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
export async function load(url, context, next) {
	if (url.endsWith('.pre-fix')) return { format: 'module', source: readFileSync(new URL(url)), shortCircuit: true }
	return next(url, context)
}
