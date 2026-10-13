// Runs the five live store tasks N times on one model, stopping at the first failed run.
// usage: node tmp/codex/confirm.ts LABEL MODEL RUNS [PATTERN]
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

const [label, model, count, pattern] = process.argv.slice(2)
if (label === undefined || model === undefined || count === undefined) {
	console.error('usage: node tmp/codex/confirm.ts LABEL MODEL RUNS [PATTERN]')
	process.exit(64)
}
const root = `tmp/codex/confirm/${label}`
mkdirSync(root, { recursive: true })
const results: { run: number; exit: number; cases: { name: string; pass: boolean; ms: number }[] }[] = []
for (let run = 1; run <= Number(count); run += 1) {
	rmSync('tmp/probes/logs', { recursive: true, force: true })
	const child = spawnSync(
		process.execPath,
		[
			'node_modules/vitest/vitest.mjs',
			'run',
			'--config',
			'vite.config.ts',
			'--no-cache',
			'--reporter=verbose',
			'--project',
			'service',
			'tests/service/browser.test.ts',
			'-t',
			pattern ?? '(shipping|cart|search|checkout|paging)',
		],
		{ env: { ...process.env, OLLAMA_MODEL: model }, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 },
	)
	const output = `${child.stdout}${child.stderr}`
	writeFileSync(`${root}/run-${run}.log`, output)
	const cases = [...output.matchAll(/([✓×]) .*'(\w+)' > satisfies its complete predicate (\d+)ms/g)].map((match) => ({
		name: match[2] ?? '',
		pass: match[1] === '✓',
		ms: Number(match[3]),
	}))
	const attempts = (() => {
		try {
			return readFileSync('tmp/probes/logs/.keep', 'utf8')
		} catch {
			return ''
		}
	})()
	results.push({ run, exit: child.status ?? 1, cases })
	console.log(`${label} run ${run}: exit ${child.status} ${cases.map((entry) => `${entry.name} ${entry.pass ? 'pass' : 'FAIL'} ${(entry.ms / 1000).toFixed(1)}s`).join(', ')}${attempts}`)
	cpSync('tmp/probes/logs', `${root}/run-${run}-logs`, { recursive: true })
	writeFileSync(`${root}/results.json`, JSON.stringify(results, undefined, 2))
	if (child.status !== 0) break
}
const clean = results.filter((entry) => entry.exit === 0).length
console.log(`${label}: ${clean}/${results.length} clean runs`)
