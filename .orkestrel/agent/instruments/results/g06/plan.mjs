// Writes a g06-only plan for one arm over one scenario set: copies by FIRST-LAST, the four conditions interleaved per
// copy, each with the arguments of its measured condition:
//   node plan.mjs --set SET --copies FIRST-LAST --out PLAN.json [--arm records|view]
// SET names a folder under tmp/bench/variants/g06/. The records arm (the default) runs bench3: f2 repeats the v9
// a5-records arguments (2B, thinking off); t2a, f4, and t4 repeat plan.ts's records arm. The view arm runs the main
// harness with the full view: f2 repeats the v9 a1-control arguments; t2a, f4, and t4 repeat plan.ts's control arm.
import { existsSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

const BENCH = '/home/user/agent/tmp/bench'
const AGENT_2B = 'qwen3.5:2b-q4_K_M'
const AGENT_4B = 'qwen3.5:4b-q4_K_M'
const CONDITIONS = {
	f2: { model: undefined, think: false, grow: 0, predict: undefined, budget: false },
	t2a: { model: AGENT_2B, think: true, grow: 2048, predict: 2048, budget: true },
	f4: { model: AGENT_4B, think: false, grow: 0, predict: undefined, budget: true },
	t4: { model: AGENT_4B, think: true, grow: 1024, predict: 1024, budget: true },
}
const { values } = parseArgs({ options: { set: { type: 'string' }, copies: { type: 'string' }, out: { type: 'string' }, arm: { type: 'string' } } })
const copies = /^(\d)-(\d)$/.exec(values.copies ?? '')
const arm = values.arm ?? 'records'
if (!/^[a-z0-9-]+$/.test(values.set ?? '') || copies === null || values.out === undefined || !['records', 'view'].includes(arm)) {
	process.stderr.write('usage: node plan.mjs --set SET --copies FIRST-LAST --out PLAN.json [--arm records|view]\n')
	process.exit(64)
}
const plan = []
for (let copy = Number(copies[1]); copy <= Number(copies[2]); copy += 1) {
	const scenario = `${BENCH}/variants/g06/${values.set}/v${copy}.json`
	if (!existsSync(scenario)) {
		process.stderr.write(`no scenario ${scenario}\n`)
		process.exit(64)
	}
	for (const [name, condition] of Object.entries(CONDITIONS)) {
		const model = [
			...(condition.model === undefined ? [] : ['--model', condition.model]),
			...(condition.think ? ['--think'] : []),
			...(condition.predict === undefined ? [] : ['--think-predict', String(condition.predict)]),
		]
		let args
		if (arm === 'records') {
			const ctx = 3072 + condition.grow
			const budget = ((3072 * 0.7) / ctx).toFixed(6).replace(/0+$/, '')
			args = [
				'--mode', 'ledger', '--profile', 'refined', '--scenario', scenario,
				'--ctx', String(ctx), ...(condition.budget ? ['--budget', budget] : []), '--judge', 'mica', '--judge-ctx', '4096', '--tail', '0.35',
				'--judgments', `${BENCH}/results/v3/cal-categories.jsonl`, '--reply', 'terminal', '--records', 'on', ...model,
			]
		} else {
			args = ['--mode', 'none', '--ctx', String(6144 + condition.grow), '--search', 'words', '--reply', 'terminal', '--scenario', scenario, ...model]
		}
		plan.push({ name: `${name}-${values.set}-v${copy}`, harness: arm === 'records' ? 'bench3' : 'bench', estimate: condition.think ? 420 : 300, args })
	}
}
writeFileSync(values.out, `${JSON.stringify(plan, null, '\t')}\n`)
process.stdout.write(`${plan.length} runs written to ${values.out}\n`)
