// Serves the file $SERVE_FILE names at the URL of bench3/bench.mjs, so an earlier copy such as bench.mjs.pre-gap
// resolves its imports and default paths as the installed harness does.
import { readFileSync } from 'node:fs'
const TARGET = 'file:///home/user/agent/tmp/bench3/bench.mjs'
export async function load(url, context, next) {
	if (url !== TARGET) return next(url, context)
	return { format: 'module', source: readFileSync(process.env.SERVE_FILE, 'utf8'), shortCircuit: true }
}
