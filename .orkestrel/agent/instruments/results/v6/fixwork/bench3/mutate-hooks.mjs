// Serves bench3/bench.mjs with the replacements of the spec file $MUTATE_SPEC applied in memory only; the
// spec uses the block format of edit.mjs, and each `from` text must match exactly COUNT times.
import { readFileSync } from 'node:fs'
export async function load(url, context, next) {
	if (!url.endsWith('/tmp/bench3/bench.mjs')) return next(url, context)
	let source = readFileSync(new URL(url), 'utf8')
	const spec = readFileSync(process.env.MUTATE_SPEC, 'utf8')
	for (const [, count, from, to] of spec.matchAll(/^@@@ from(?: (\d+))?\n([\s\S]*?)\n@@@ to\n([\s\S]*?)\n?@@@ end$/gm)) {
		const found = source.split(from).length - 1
		if (found !== (count === undefined ? 1 : Number(count))) throw new Error(`mutation matched ${found} times: ${from.slice(0, 80)}`)
		source = source.split(from).join(to.replace(/\n$/, ''))
	}
	return { format: 'module', source, shortCircuit: true }
}
