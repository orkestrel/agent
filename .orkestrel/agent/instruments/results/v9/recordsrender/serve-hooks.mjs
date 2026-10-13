// Serves the file $SERVE_FILE names at the URL of bench3/bench.mjs, and $SERVE_RECORDS at the URL of bench3/records.mjs,
// so a candidate resolves its imports and default paths as the installed harness does.
import { readFileSync } from 'node:fs'
const SERVED = {
	'file:///home/user/agent/tmp/bench3/bench.mjs': process.env.SERVE_FILE,
	'file:///home/user/agent/tmp/bench3/records.mjs': process.env.SERVE_RECORDS,
}
export async function load(url, context, next) {
	const file = SERVED[url]
	if (file === undefined) return next(url, context)
	return { format: 'module', source: readFileSync(file, 'utf8'), shortCircuit: true }
}
