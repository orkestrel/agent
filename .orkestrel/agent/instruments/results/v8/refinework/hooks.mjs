// Loads bench.mjs.pre-refine in place as an ES module, so the unmodified harness runs beside its own scenario.json.pre-refine.
import { readFileSync } from 'node:fs'
export async function load(url, context, next) {
	if (!url.endsWith('.pre-refine')) return next(url, context)
	const source = readFileSync(new URL(url), 'utf8')
	const target = "join(HERE, 'scenario.json')"
	if (source.split(target).length !== 2) throw new Error(`hooks: expected one ${target} in ${url}`)
	return { format: 'module', source: source.replace(target, "join(HERE, 'scenario.json.pre-refine')"), shortCircuit: true }
}
