// Writes the final-check plan for series.ts: the records briefing, the full view, and compaction, interleaved
// by copy so a series stopped early still holds whole copies, under each named condition:
//   node plan.ts --copies FIRST-LAST --conditions f4,t2,t2w,t2a,t4 [--arms records,control,compaction] [--cap N] --out PLAN.json
// Condition f4 runs the 4B agent with thinking off at the think-off windows. Conditions t2 and t2w run the 2B agent
// with thinking on: t2 under the harness's default cap of 1,024 tokens (the pilot), t2w under `--think-predict 2048`.
// Condition t2a is t2w with the records answer pass run with thinking off. The runs of 2026-10-09 passed
// `--answer-think off`; the records harness since sha 5342e209 runs that pass with thinking off under `--think` and
// refuses the flag, so t2a and t2w write the same arguments and differ only by the harness they ran on.
// Condition t4 runs the 4B agent with thinking on under `--think-predict N`, where N is the cap `--cap` gives, a
// multiple of 256 no greater than 4,096 that the sizing probe set (`results/v10/probes/think-4b-on.jsonl`).
// `--arms` limits the arms, in the order given; the default is all three.
// Each arm's window grows by the cap, and the records briefing's budget share shrinks so its prompt budget stays
// the think-off 0.7 of 3,072 tokens.
// Exit: 0; 64 on usage.
import { writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const ROOT = dirname(import.meta.dirname)
const BENCH = `${ROOT}/bench`
const AGENT_2B = 'qwen3.5:2b-q4_K_M'
const AGENT_4B = 'qwen3.5:4b-q4_K_M'
const RECORDS_CTX = 3072
const RECORDS_BUDGET = 0.7
const CONTROL_CTX = 6144
const COMPACTION_CTX = 3072

interface Condition {
	readonly model: string
	readonly think: boolean
	readonly grow: number
	readonly predict: number | undefined
	readonly estimates: Readonly<Record<string, number>>
	readonly records?: readonly string[]
}

function readFlag(argv: readonly string[], name: string): string | undefined {
	const at = argv.indexOf(name)
	if (at < 0) return undefined
	const value = argv[at + 1]
	return value === undefined || value.startsWith('--') ? undefined : value
}

function armArgs(arm: string, copy: number, condition: Condition): readonly string[] {
	const model = ['--model', condition.model, ...(condition.think ? ['--think'] : []), ...(condition.predict === undefined ? [] : ['--think-predict', String(condition.predict)])]
	if (arm === 'records') {
		const ctx = RECORDS_CTX + condition.grow
		const budget = ((RECORDS_CTX * RECORDS_BUDGET) / ctx).toFixed(6).replace(/0+$/, '')
		return [
			'--mode', 'ledger', '--profile', 'refined', '--scenario', `${BENCH}/variants/ledger/v${copy}.json`,
			'--ctx', String(ctx), '--budget', budget, '--judge', 'mica', '--judge-ctx', '4096', '--tail', '0.35',
			'--judgments', `${ROOT}/data/cal-categories.jsonl`, '--reply', 'terminal', '--records', 'on', ...model, ...(condition.records ?? []),
		]
	}
	if (arm === 'control') return ['--mode', 'none', '--ctx', String(CONTROL_CTX + condition.grow), '--search', 'words', '--reply', 'terminal', '--scenario', `${BENCH}/variants/v${copy}.json`, ...model]
	return [
		'--mode', 'compaction', '--ctx', String(COMPACTION_CTX + condition.grow), '--search', 'words', '--summary', 'tuned', '--window', '1600', '--keep', '6', '--sections', '3',
		'--reply', 'terminal', '--scenario', `${BENCH}/variants/v${copy}.json`, '--summary-model', condition.model, ...model,
	]
}

function main(): number {
	const argv = process.argv.slice(2)
	const copies = /^(\d+)-(\d+)$/.exec(readFlag(argv, '--copies') ?? '')
	const names = (readFlag(argv, '--conditions') ?? '').split(',').filter((name) => name !== '')
	const out = readFlag(argv, '--out')
	const arms = (readFlag(argv, '--arms') ?? 'records,control,compaction').split(',').filter((arm) => arm !== '')
	const cap = Number(readFlag(argv, '--cap') ?? 'NaN')
	const capped = Number.isInteger(cap) && cap > 0 && cap <= 4096 && cap % 256 === 0
	if (copies === null || names.length === 0 || out === undefined || arms.length === 0 || arms.some((arm) => !['records', 'control', 'compaction'].includes(arm)) || (names.includes('t4') && !capped)) {
		process.stderr.write('usage: node plan.ts --copies FIRST-LAST --conditions f4,t2,t2w,t2a,t4 [--arms records,control,compaction] [--cap N] --out PLAN.json\n')
		return 64
	}
	const conditions: Readonly<Record<string, Condition>> = {
		f4: { model: AGENT_4B, think: false, grow: 0, predict: undefined, estimates: { records: 1600, control: 400, compaction: 3300 } },
		t2: { model: AGENT_2B, think: true, grow: 1024, predict: undefined, estimates: { records: 1700, control: 1200, compaction: 2400 } },
		t2w: { model: AGENT_2B, think: true, grow: 2048, predict: 2048, estimates: { records: 1900, control: 1400, compaction: 2700 } },
		t2a: { model: AGENT_2B, think: true, grow: 2048, predict: 2048, estimates: { records: 1500, control: 400, compaction: 6200 } },
		t4: { model: AGENT_4B, think: true, grow: cap, predict: cap, estimates: { records: 2400, control: 1500, compaction: 6200 } },
	}
	if (names.some((name) => !Object.hasOwn(conditions, name))) {
		process.stderr.write('--conditions names f4, t2, t2w, t2a, t4, or several\n')
		return 64
	}
	const plan = []
	for (let copy = Number(copies[1]); copy <= Number(copies[2]); copy += 1) {
		for (const name of names) {
			const condition = conditions[name]
			for (const arm of arms) {
				plan.push({ name: `${name}-${arm}-v${copy}`, harness: arm === 'records' ? 'bench3' : 'bench', estimate: condition.estimates[arm], args: armArgs(arm, copy, condition) })
			}
		}
	}
	writeFileSync(out, `${JSON.stringify(plan, null, '\t')}\n`)
	process.stdout.write(`${plan.length} runs written to ${out}\n`)
	return 0
}

process.exit(main())
