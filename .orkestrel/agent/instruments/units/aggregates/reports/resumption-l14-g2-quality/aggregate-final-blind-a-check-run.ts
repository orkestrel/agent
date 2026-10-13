import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const expected = new Map([
	['tmp/units/aggregate-development-blind-packet-l14-a/packet.json', 'c07aa6696eba4d7ff551c0c66f27057e8491704a85095e244ee7be9c0d7ba190'],
	['tmp/units/aggregate-final-blind-a-judgments.json', 'df1a3315a1ff8bf5fae6a793b0ca63427cef494528fd1f2604297953ce5cdf32'],
	['tmp/units/aggregate-l14-a-quality-boundary-check.ts', '4211536b489635fb4615fdabc6e269db9bef54c70c9a9204342346a3f55ec68c'],
	['tmp/units/aggregate-l14-a-quality-join.ts', '3eeee62d361259e00fa140b04138b2aac1615a1cdab25a0cb819b0e879ce157e'],
])
const outputs = [
	'tmp/units/aggregate-l14-a-quality-boundary-addendum.md',
	'tmp/units/aggregate-l14-a-quality-joined.json',
	'tmp/units/aggregate-l14-a-quality-report.md',
	'tmp/units/aggregate-l14-a-quality-join-validation.md',
]

function hashFile(path: string): string {
	return createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex')
}

for (const [path, hash] of expected) {
	if (hashFile(path) !== hash) throw new Error(`Sealed input hash mismatch: ${path}`)
}
for (const path of outputs) {
	if (existsSync(resolve(root, path))) throw new Error(`Create-only output already exists: ${path}`)
}

interface Stage {
	readonly command: string
	readonly exitCode: number | null
	readonly signal: NodeJS.Signals | null
	readonly durationMs: number
	readonly error: string | undefined
	readonly stdoutPath: string
	readonly stderrPath: string
	readonly stdoutBytes: number
	readonly stderrBytes: number
	readonly stdout: string
}

function run(path: string, name: string): Stage {
	const started = Date.now()
	const command = `node ${path}`
	const result = spawnSync(process.execPath, [path], {
		cwd: root,
		input: '',
		maxBuffer: 64 * 1024 * 1024,
		shell: false,
		windowsHide: true,
		timeout: 120_000,
	})
	const stdout = result.stdout ?? Buffer.alloc(0)
	const stderr = result.stderr ?? Buffer.alloc(0)
	const stdoutPath = `tmp/units/aggregate-final-blind-a-check-${name}.stdout.bin`
	const stderrPath = `tmp/units/aggregate-final-blind-a-check-${name}.stderr.bin`
	writeFileSync(resolve(root, stdoutPath), stdout, { flag: 'wx' })
	writeFileSync(resolve(root, stderrPath), stderr, { flag: 'wx' })
	return {
		command,
		exitCode: result.status,
		signal: result.signal,
		durationMs: Date.now() - started,
		error: result.error?.message,
		stdoutPath,
		stderrPath,
		stdoutBytes: stdout.byteLength,
		stderrBytes: stderr.byteLength,
		stdout: stdout.toString('utf8'),
	}
}

const boundary = run('tmp/units/aggregate-l14-a-quality-boundary-check.ts', 'boundary')
const stages: Stage[] = [boundary]
if (boundary.exitCode === 0 && boundary.signal === null && boundary.error === undefined) {
	stages.push(run('tmp/units/aggregate-l14-a-quality-join.ts', 'join'))
}

for (const [path, hash] of expected) {
	if (hashFile(path) !== hash) throw new Error(`Sealed input changed during checks: ${path}`)
}

const summaries = stages.map((stage) => {
	let result: unknown
	if (stage.exitCode === 0 && stage.stdout.length > 0) result = JSON.parse(stage.stdout)
	return {
		command: stage.command,
		exitCode: stage.exitCode,
		signal: stage.signal,
		durationMs: stage.durationMs,
		error: stage.error,
		stdoutPath: stage.stdoutPath,
		stderrPath: stage.stderrPath,
		stdoutBytes: stage.stdoutBytes,
		stderrBytes: stage.stderrBytes,
		result,
	}
})
const outputHashes = Object.fromEntries(
	outputs.filter((path) => existsSync(resolve(root, path))).map((path) => [path, hashFile(path)]),
)
process.stdout.write(`${JSON.stringify({ stages: summaries, outputHashes }, null, 2)}\n`)
if (stages.some((stage) => stage.exitCode !== 0 || stage.signal !== null || stage.error !== undefined)) {
	process.exitCode = stages.find((stage) => stage.exitCode !== 0 || stage.signal !== null || stage.error !== undefined)?.exitCode ?? 1
}
