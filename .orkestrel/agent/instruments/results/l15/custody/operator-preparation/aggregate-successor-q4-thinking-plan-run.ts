import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { spawnSync } from 'node:child_process'

const root = 'C:/Users/mikes/WebstormProjects/scaffold'
const stdoutPath = resolve(root, 'tmp/units/aggregate-successor-q4-thinking-plan.stdout.log')
const stderrPath = resolve(root, 'tmp/units/aggregate-successor-q4-thinking-plan.stderr.log')
const metadataPath = resolve(root, 'tmp/units/aggregate-successor-q4-thinking-plan.meta.json')
const argv = [resolve(root, 'tmp/units/aggregate-successor-cell-run.ts'), 'q4-think1', '--head', '5ef0eb4fa719386ab7ba9c2dba542552231e6c8e', '--fit', '46f1bcf297ccd0989c20280f3e50bdaf692c8ab47b8d936487d6996eecd928a8']
const started = performance.now()
const result = spawnSync(process.execPath, argv, { cwd: root, encoding: 'buffer', shell: false, windowsHide: true })
const durationMs = performance.now() - started
const stdout = result.stdout ?? Buffer.alloc(0)
const stderr = result.stderr ?? Buffer.alloc(0)
writeFileSync(stdoutPath, stdout, { flag: 'wx' })
writeFileSync(stderrPath, stderr, { flag: 'wx' })
const metadata = {
  command: process.execPath,
  argv,
  cwd: root,
  shell: false,
  exitCode: result.status,
  signal: result.signal,
  durationMs,
  spawnError: result.error?.message,
  stdout: { path: stdoutPath, bytes: stdout.length, sha256: createHash('sha256').update(stdout).digest('hex') },
  stderr: { path: stderrPath, bytes: stderr.length, sha256: createHash('sha256').update(stderr).digest('hex') }
}
writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' })
process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n`)
if (result.error !== undefined || result.status !== 0) process.exitCode = result.status ?? 1