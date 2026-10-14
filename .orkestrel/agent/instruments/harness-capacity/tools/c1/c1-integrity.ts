// Recomputes the integrity failures of every live c1 run through the emitted reader.
// Usage: node tmp/units/c1-integrity.ts [RUN_DIR...]; with no argument it walks the six series runs.
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const build =
	'C:/Users/mikes/WebstormProjects/agent/.orkestrel/agent/instruments/harness/.build/bench5'
const base = 'C:/Users/mikes/WebstormProjects/agent/.orkestrel/agent/instruments/harness/tmp/c1'

interface RunReading {
	readonly status: string
	readonly rows: readonly unknown[]
	readonly failures: readonly string[]
}

const helpers: { readContinuousRun(path: string): RunReading } = await import(
	`file://${build}/continuous/helpers.js`
)

const directories =
	process.argv.length > 2
		? process.argv.slice(2)
		: ['q4', 'q2'].flatMap((key) =>
				['records', 'compaction', 'full'].map((arm) => join(base, key, arm)),
			)

for (const dir of directories) {
	if (!existsSync(join(dir, 'run.json'))) continue
	try {
		const run = helpers.readContinuousRun(dir)
		console.log(`${dir}: status=${run.status} rows=${run.rows.length} failures=${run.failures.length}`)
		for (const failure of run.failures.slice(0, 8)) console.log(`  ${failure}`)
	} catch (error) {
		console.log(`${dir}: reader threw ${error instanceof Error ? error.message : String(error)}`)
	}
}
