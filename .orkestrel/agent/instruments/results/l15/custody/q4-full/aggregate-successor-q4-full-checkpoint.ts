// Stage only accepted l15 evidence and root progress after every live measurement closes.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
assert.equal(resolve(process.cwd()), root)
assert.equal(execFileSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8', windowsHide: true }).trim(), '')
const results = '.orkestrel/agent/instruments/results/l15'
const raw = readdirSync(results, { recursive: true, encoding: 'utf8' }).map(path => `${results}/${path.replaceAll('\\', '/')}`).filter(path => {
	const info = lstatSync(path)
	assert.equal(info.isSymbolicLink(), false, path)
	return info.isFile()
})
const prose = ['RESULTS.md', '.orkestrel/agent/progress.md', '.orkestrel/agent/plan.md', '.orkestrel/agent/ledger.md']
const paths = [...raw, ...prose]
execFileSync('git', ['add', '-f', '--', ...paths], { stdio: 'inherit', windowsHide: true })
const staged = execFileSync('git', ['diff', '--cached', '--name-only', '-z'], { windowsHide: true }).toString('utf8').split('\0').filter(Boolean)
assert.ok(staged.length > 0)
for (const path of staged) assert.ok(paths.includes(path), path)
for (const path of raw) assert.ok(execFileSync('git', ['show', `:${path}`], { windowsHide: true, maxBuffer: 16 * 1024 * 1024 }).equals(readFileSync(path)), path)
execFileSync('git', ['diff', '--cached', '--check', '--', ...prose, `${results}/README.md`], { stdio: 'inherit', windowsHide: true })
writeFileSync('tmp/units/aggregate-successor-q4-full-message.txt', 'docs: retain l15 Qwen4 full-view evidence\n\nPreserve the closed full-view measurement, raw requests, costs, process closure, and source/input custody. The strict aggregate pilot follows from the accepted records resource and fixed fit. Blind task-quality grading follows the closed comparison.\n\nAgent: Codex\n', { flag: 'wx' })
console.log(JSON.stringify({ staged: staged.length, raw: raw.length, bytes: raw.reduce((sum, path) => sum + readFileSync(path).length, 0), equality: 'all retained index bytes match' }))
