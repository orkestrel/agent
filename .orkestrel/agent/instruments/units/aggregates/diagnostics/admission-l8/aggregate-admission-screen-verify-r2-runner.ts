// Runs the frozen offline r2 command list once and writes create-only bare logs.
import { spawnSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const directory = resolve(root, 'tmp/units')
const prefix = 'aggregate-admission-screen-verify-r2'
const preparation = resolve(root, 'tmp/units/aggregate-admission-screen-r2/verification-preparation-verifier-r2')
const source = 'tmp/units/aggregate-admission-screen-r2'
const commands = [
	{ name: 'types', args: ['node_modules/typescript/bin/tsc', '--noEmit', '-p', `${source}/tsconfig.json`], expected: 0 },
	...['types.ts', 'constants.ts', 'helpers.ts', 'Operator.ts', 'main.ts', 'prepare.ts', 'offline.config.ts', 'proof.test.ts', 'negative.test.ts'].map(file => ({ name: `syntax-${file.replace('.ts', '')}`, args: ['--check', `${source}/${file}`], expected: 0 })),
	{ name: 'positive-tests', args: ['--test', `${source}/proof.test.ts`], expected: 0 },
	{ name: 'negative-controls', args: ['--test', `${source}/negative.test.ts`], expected: 1 },
	{ name: 'offline-default', args: [`${source}/main.ts`], expected: 0 },
	{ name: 'preparation', args: [`${source}/prepare.ts`, '--output', preparation], expected: 0 },
]

if (root.toLowerCase() !== 'c:\\users\\mikes\\webstormprojects\\scaffold'.toLowerCase()) throw new Error(`Unexpected cwd: ${root}`)
for (const command of commands) {
	for (const suffix of ['stdout.bin', 'stderr.bin']) {
		const path = resolve(directory, `${prefix}-${command.name}.${suffix}`)
		if (existsSync(path)) throw new Error(`Log path is not vacant: ${path}`)
	}
}
if (existsSync(preparation)) throw new Error(`Preparation destination is not vacant: ${preparation}`)

const results = []
let failed = false
for (const command of commands) {
	const started = Date.now()
	const result = spawnSync(process.execPath, command.args, { cwd: root, encoding: 'buffer', windowsHide: true, maxBuffer: 100 * 1024 * 1024 })
	const durationMs = Date.now() - started
	const stdoutPath = resolve(directory, `${prefix}-${command.name}.stdout.bin`)
	const stderrPath = resolve(directory, `${prefix}-${command.name}.stderr.bin`)
	writeFileSync(stdoutPath, result.stdout ?? Buffer.alloc(0), { flag: 'wx' })
	writeFileSync(stderrPath, result.stderr ?? Buffer.alloc(0), { flag: 'wx' })
	const row = { name: command.name, args: command.args, expectedExit: command.expected, exitCode: result.status, signal: result.signal, error: result.error?.message, durationMs, stdoutPath, stderrPath }
	results.push(row)
	if (result.status !== command.expected || result.error !== undefined || result.signal !== null) { failed = true; break }
}
console.log(JSON.stringify({ runner: prefix, node: process.version, capSeconds: 180, preparation, completedCommands: results.length, failed, results }))
if (failed) process.exitCode = 1
