// Log: tmp/units/aggregate-qualification-verifier-successor-3-project.jsonl; cap: 1200s; changed from aggregate-final-qualification-repair-project.ts by excluding the four touched test files already executed once against this build.
import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

function listTests(path: string): readonly string[] {
	return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
		if (entry.isSymbolicLink()) throw new Error(`test discovery refuses symlink: ${entry.name}`)
		const target = join(path, entry.name)
		return entry.isDirectory() ? listTests(target) : entry.name.endsWith('.test.js') ? [target] : []
	}).sort()
}

const root = resolve('C:/Users/mikes/WebstormProjects/scaffold')
const testRoot = join(root, '.orkestrel/agent/instruments/harness/.build/bench5/tests')
const population = [
	...listTests(testRoot),
	join(root, '.orkestrel/agent/instruments/harness/.build/bench5/matrix/tests/capacity.test.js'),
].sort()
const touched = [
	join(testRoot, 'aggregates.test.js'),
	join(testRoot, 'matrix.test.js'),
	join(testRoot, 'development.test.js'),
	join(testRoot, 'sustained/audit/Comparison.test.js'),
].sort()
for (const file of touched) {
	if (!population.includes(file)) throw new Error(`changed test missing from project census: ${file}`)
}
const remaining = population.filter((file) => !touched.includes(file))
if (remaining.length === 0) throw new Error('remaining project test population is empty')
console.log(JSON.stringify({
	command: process.execPath,
	arguments: ['--test', '--test-concurrency=1', ...remaining],
	totalCoreFiles: population.length,
	excludedAlreadyPassedTouchedFiles: touched,
	remainingCoreFiles: remaining.length,
}, null, 2))
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...remaining], { cwd: root, stdio: 'inherit' })
if (result.error !== undefined) throw result.error
if (result.status === null) throw new Error(`project test interrupted: ${result.signal}`)
process.exitCode = result.status
