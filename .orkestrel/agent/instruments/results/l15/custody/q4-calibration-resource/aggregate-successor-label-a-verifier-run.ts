import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = 'C:/Users/mikes/WebstormProjects/scaffold'
const files = {
	packet: 'tmp/units/aggregate-successor-label-a-packet.jsonl',
	labels: 'tmp/units/aggregate-successor-label-a.json',
	report: 'tmp/units/aggregate-successor-label-a-report.md'
}
const paths = {
	stdout: 'tmp/units/aggregate-successor-label-a-verifier.stdout.log',
	stderr: 'tmp/units/aggregate-successor-label-a-verifier.stderr.log',
	meta: 'tmp/units/aggregate-successor-label-a-verifier.meta.json'
}
const expected = {
	packet: '0e3eaecbf38d7dad2450fb2748db860aeb8117679f06f8a7bf27ea93ad5f9541',
	labels: '532865b974936adafddbba040b38a54224b08ba6060c5c4cad5ce652d488adae',
	report: '867f5c34f765d280f268cca403e8ce63f5d0e3f2acf9e621704a150dae0560b0'
}
const hash = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex')
const readHash = (path: string): string => hash(readFileSync(resolve(root, path)))

if (resolve(process.cwd()) !== resolve(root)) throw new Error(`Wrong cwd: ${process.cwd()}`)
for (const path of Object.values(paths)) {
	if (existsSync(resolve(root, path))) throw new Error(`Create-only path already exists: ${path}`)
}
const before = Object.fromEntries(Object.entries(files).map(([name, path]) => [name, readHash(path)]))
for (const name of Object.keys(expected)) {
	if (before[name] !== expected[name]) throw new Error(`Input seal mismatch: ${name}; expected ${expected[name]}; found ${before[name]}`)
}

const command = resolve(root, 'tmp/units/aggregate-successor-label-a-verifier-check.ts')
const argv = [process.execPath, command]
const started = process.hrtime.bigint()
const child = spawnSync(process.execPath, [command], {
	cwd: root,
	shell: false,
	windowsHide: true,
	maxBuffer: 16 * 1024 * 1024
})
const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000
const stdout = child.stdout ?? Buffer.alloc(0)
const stderr = child.stderr ?? Buffer.alloc(0)
writeFileSync(resolve(root, paths.stdout), stdout, { flag: 'wx' })
writeFileSync(resolve(root, paths.stderr), stderr, { flag: 'wx' })
const after = Object.fromEntries(Object.entries(files).map(([name, path]) => [name, readHash(path)]))
const unchanged = Object.keys(before).every((name) => before[name] === after[name])
const result = {
	cwd: root,
	argv,
	child: { pid: child.pid, exitCode: child.status, signal: child.signal, error: child.error?.message },
	durationMs,
	stdout: { path: paths.stdout, bytes: stdout.byteLength, sha256: hash(stdout) },
	stderr: { path: paths.stderr, bytes: stderr.byteLength, sha256: hash(stderr) },
	inputsBefore: before,
	inputsAfter: after,
	inputsUnchanged: unchanged
}
writeFileSync(resolve(root, paths.meta), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
if (child.error !== undefined || child.status !== 0 || child.signal !== null || !unchanged) process.exitCode = 1
