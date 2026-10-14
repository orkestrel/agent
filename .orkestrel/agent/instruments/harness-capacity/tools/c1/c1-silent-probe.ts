// Reproduces the silent-daemon proof outside node:test so the run directories survive for inspection.
// Usage: node tmp/units/c1-silent-probe.ts
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const build =
	'C:/Users/mikes/WebstormProjects/agent/.orkestrel/agent/instruments/harness/.build/bench5'

interface Row {
	readonly goal: string
	readonly reply: string
	readonly success: boolean
	readonly partial: boolean
}

interface RunReading {
	readonly status: string
	readonly rows: readonly Row[]
	readonly failures: readonly string[]
}

interface Daemon {
	readonly url: string
	close(): Promise<void>
}

const constants: { MICA_MODEL: string; MODELS: Record<string, string> } = await import(
	`file://${build}/constants.js`
)
const continuous: { Continuous: { execute(argv: readonly string[]): Promise<number> } } = await import(
	`file://${build}/continuous/Continuous.js`
)
const helpers: { readContinuousRun(path: string): RunReading } = await import(
	`file://${build}/continuous/helpers.js`
)
const fixtures: {
	startDaemon(options: Record<string, unknown>): Promise<Daemon>
	writeTrialFiles(directory: string): { runtime: string; oracle: string; workload: string }
} = await import(`file://${build}/tests/continuous/helpers.js`)

const directory = mkdtempSync(join(tmpdir(), 'c1-silent-'))
console.log('directory', directory)
const files = fixtures.writeTrialFiles(join(directory, 'workload'))
const silent = await fixtures.startDaemon({
	factor: 1,
	capacity: 100000,
	decision: constants.MODELS.q2,
	judge: constants.MICA_MODEL,
	silent: 'Shift 2 product 3',
})
const frozen = join(directory, 'freeze')
await continuous.Continuous.execute([
	'freeze',
	'--key',
	'q2',
	'--out',
	frozen,
	'--live',
	'--url',
	silent.url,
	'--workload',
	files.workload,
	'--runtime',
	files.runtime,
	'--oracle',
	files.oracle,
])
const manifest = join(frozen, 'manifest.json')
const stopped = join(directory, 'silent-stop')
const code = await continuous.Continuous.execute([
	'run',
	'--manifest',
	manifest,
	'--arm',
	'full',
	'--out',
	stopped,
	'--live',
	'--url',
	silent.url,
])
console.log('stop exit', code)
const ended = helpers.readContinuousRun(stopped)
console.log('stop status', ended.status, 'rows', ended.rows.length, 'failures', ended.failures)
for (const row of ended.rows)
	console.log('row', row.goal, JSON.stringify(row.reply), row.success, row.partial)
const messages = readFileSync(join(stopped, 'messages.jsonl'), 'utf8')
	.split('\n')
	.filter((line) => line.length > 0)
	.map((line): unknown => JSON.parse(line))
for (const message of messages) {
	if (typeof message !== 'object' || message === null) continue
	if (Reflect.get(message, 'goal') !== 'fx-1-2') continue
	console.log(
		'message',
		Reflect.get(message, 'role'),
		JSON.stringify(Reflect.get(message, 'content')).slice(0, 120),
	)
}
await silent.close()
