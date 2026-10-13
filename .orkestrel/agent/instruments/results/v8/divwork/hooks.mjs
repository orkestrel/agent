// Loads bench.mjs.pre-roundb or bench.mjs.pre-repeat in place as an ES module and points it at scenario.json.pre-roundb,
// the scenario that stood beside it, so the v7 harness reads the v7 scenario.
import { readFileSync } from 'node:fs'
export async function load(url, context, next) {
	if (!url.endsWith('.pre-roundb') && !url.endsWith('.pre-repeat')) return next(url, context)
	const source = readFileSync(new URL(url), 'utf8')
	const target = "join(HERE, 'scenario.json')"
	if (source.split(target).length !== 2) throw new Error(`hooks: expected one ${target} in ${url}`)
	return { format: 'module', source: source.replace(target, "join(HERE, 'scenario.json.pre-roundb')"), shortCircuit: true }
}
