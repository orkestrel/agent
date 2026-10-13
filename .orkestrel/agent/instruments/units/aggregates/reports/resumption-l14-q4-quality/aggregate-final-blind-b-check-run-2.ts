import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'

const root = 'C:/Users/mikes/WebstormProjects/scaffold'
const prefix = resolve(root, 'tmp/units/aggregate-final-blind-b-check-2')
const stages = [
	{ name: 'boundary', script: resolve(root, 'tmp/units/aggregate-l14-b-quality-boundary-check-2.ts') },
	{ name: 'join', script: resolve(root, 'tmp/units/aggregate-l14-b-quality-join-2.ts') }
]

for (const stage of stages) {
	const argv = [process.execPath, stage.script]
	const started = performance.now()
	const result = spawnSync(argv[0], argv.slice(1), { cwd: root, maxBuffer: 64 * 1024 * 1024 })
	const durationMs = performance.now() - started
	const stdout = result.stdout ?? Buffer.alloc(0)
	const stderr = result.stderr ?? Buffer.alloc(0)
	const stdoutPath = `${prefix}-${stage.name}.stdout.log`
	const stderrPath = `${prefix}-${stage.name}.stderr.log`
	const metadataPath = `${prefix}-${stage.name}.meta.json`
	await writeFile(stdoutPath, stdout, { flag: 'wx' })
	await writeFile(stderrPath, stderr, { flag: 'wx' })
	const metadata = {
		name: stage.name,
		cwd: root,
		argv,
		exitCode: result.status,
		signal: result.signal,
		durationMs,
		spawnError: result.error?.message,
		stdout: { path: stdoutPath, bytes: stdout.length, sha256: createHash('sha256').update(stdout).digest('hex') },
		stderr: { path: stderrPath, bytes: stderr.length, sha256: createHash('sha256').update(stderr).digest('hex') }
	}
	await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' })
	process.stdout.write(`${JSON.stringify(metadata)}\n`)
	if (result.error !== undefined || result.status !== 0) {
		process.exitCode = result.status ?? 1
		break
	}
}
