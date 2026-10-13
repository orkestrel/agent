// Runs credit-probe.ts over the frozen briefing wires whose credit check failed, every transform each,
// one at a time, plus the full view's own request on two copies as the case that must pass:
//   node credit-batch.ts OUT_JSONL WIRE_RUN...
// Each WIRE_RUN is a run name under results/v9 such as a4-refined-v1; its copy number picks the
// scenario. Exit: 0; 64 on usage.
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const V9 = '/home/user/agent/tmp/bench/results/v9'
const PROBE = join(V9, 'probes', 'credit-probe.ts')
const TRANSFORMS: readonly string[] = ['base', 'strip-handles', 'strip-rules', 'strip-pinned', 'plain-system']
const GOAL = '7'

function runProbe(run: string, scenario: string, transform: string, out: string): void {
	const result = spawnSync(process.execPath, [PROBE, join(V9, `${run}-wire`), scenario, GOAL, transform, out], { stdio: 'inherit' })
	if (result.status !== 0) process.stderr.write(`probe failed: ${run} ${transform} exit ${result.status}\n`)
}

function main(): number {
	const [out, ...runs] = process.argv.slice(2)
	if (out === undefined || runs.length === 0) {
		process.stderr.write('usage: node credit-batch.ts OUT_JSONL WIRE_RUN...\n')
		return 64
	}
	for (const run of runs) {
		const copy = /-v(\d)$/.exec(run)?.[1]
		if (copy === undefined) continue
		for (const transform of TRANSFORMS) runProbe(run, `/home/user/agent/tmp/bench/variants/ledger/v${copy}.json`, transform, out)
	}
	for (const copy of ['1', '3']) runProbe(`a1-control-v${copy}`, `/home/user/agent/tmp/bench/variants/v${copy}.json`, 'base', out)
	return 0
}

process.exit(main())
