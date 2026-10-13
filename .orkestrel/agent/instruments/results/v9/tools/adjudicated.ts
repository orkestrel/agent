// Computes the band between arms on adjudicated passes: a row passes when the strict scorer passes it and
// the blind pass audit does not rule it a false pass, or when the scorer fails it and the blind audit rules
// the failure a misread; an ambiguous row of either kind counts as a fail at the low end and a pass at the
// high end. Overrides replace an audit verdict by id, so a later review can rule without
// editing the auditors' files.
//   node adjudicated.ts [--override ID=VERDICT ...] ARM_A:ARM_B ...
// Exit: 0; 64 on usage.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const V9 = resolve(import.meta.dirname, '..')
const AUDIT = join(V9, 'audit')
const VERDICT_FILES: readonly string[] = ['verdicts.json', 'verdicts2.json', 'verdicts3.json', 'verdicts-pass-checked.json']
const KEY_FILES: readonly string[] = ['key.json', 'key2.json', 'key3.json', 'key-pass.json']
type Verdict = 'real' | 'misread' | 'ambiguous' | 'correct' | 'false-pass'

function readVerdicts(overrides: ReadonlyMap<string, Verdict>): ReadonlyMap<string, Verdict> {
	const byRun = new Map<string, Verdict>()
	const ids = new Map<string, string>()
	for (const file of KEY_FILES) {
		if (!existsSync(join(AUDIT, file))) continue
		for (const entry of JSON.parse(readFileSync(join(AUDIT, file), 'utf8'))) ids.set(entry.id, `${entry.run} ${entry.goal}`)
	}
	for (const file of VERDICT_FILES) {
		if (!existsSync(join(AUDIT, file))) continue
		for (const entry of JSON.parse(readFileSync(join(AUDIT, file), 'utf8')).final) {
			const where = ids.get(entry.id)
			if (where !== undefined) byRun.set(where, overrides.get(entry.id) ?? entry.verdict)
		}
	}
	return byRun
}

function readPasses(run: string, verdicts: ReadonlyMap<string, Verdict>): { readonly low: number; readonly high: number } | undefined {
	for (const base of [join(V9, 'rescored', run), join(V9, run)]) {
		if (!existsSync(base)) continue
		const file = readdirSync(base).find((name) => name.endsWith('.jsonl') && !name.startsWith('memory'))
		if (file === undefined) continue
		const rows = readFileSync(join(base, file), 'utf8')
			.split(/\r\n|\n/)
			.filter((line) => line.trim() !== '')
			.map((line): Record<string, unknown> => JSON.parse(line))
			.filter((row) => typeof row.goal === 'string')
		if (rows.length !== 10) continue
		let low = 0
		let high = 0
		for (const row of rows) {
			const verdict = verdicts.get(`${run} ${row.goal}`)
			const passed = row.success === true ? verdict !== 'false-pass' && verdict !== 'ambiguous' : verdict === 'misread'
			if (passed) {
				low += 1
				high += 1
			} else if (verdict === 'ambiguous') high += 1
		}
		return { low, high }
	}
	return undefined
}

function describeBand(label: string, d: readonly number[]): string {
	const mean = d.reduce((sum, value) => sum + value, 0) / d.length
	const sd = Math.sqrt(d.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (d.length - 1))
	const lower = mean - (2 * sd) / Math.sqrt(d.length)
	return `${label}: n ${d.length}, mean d ${mean.toFixed(2)}, sd ${sd.toFixed(2)}, lower ${lower.toFixed(2)}, fix ${lower > 0 ? 'clears' : 'does not clear'}`
}

function main(): number {
	const argv = process.argv.slice(2)
	const overrides = new Map<string, Verdict>()
	const pairs: string[] = []
	for (let at = 0; at < argv.length; at += 1) {
		if (argv[at] === '--override') {
			const [id, verdict] = String(argv[at + 1]).split('=')
			if (verdict !== 'real' && verdict !== 'misread' && verdict !== 'ambiguous' && verdict !== 'correct' && verdict !== 'false-pass') {
				process.stderr.write('usage: --override ID=real|misread|ambiguous|correct|false-pass\n')
				return 64
			}
			overrides.set(id, verdict)
			at += 1
		} else pairs.push(argv[at])
	}
	if (pairs.length === 0) {
		process.stderr.write('usage: node adjudicated.ts [--override ID=VERDICT ...] ARM_A:ARM_B ...\n')
		return 64
	}
	const verdicts = readVerdicts(overrides)
	for (const pair of pairs) {
		const [a, b] = pair.split(':')
		const lows: number[] = []
		const highs: number[] = []
		const lines: string[] = []
		for (let copy = 1; copy <= 8; copy += 1) {
			const left = readPasses(`${a}-v${copy}`, verdicts)
			const right = readPasses(`${b}-v${copy}`, verdicts)
			if (left === undefined || right === undefined) continue
			lows.push(left.low - right.low)
			highs.push(left.high - right.high)
			lines.push(`v${copy} ${a} ${left.low}-${left.high} ${b} ${right.low}-${right.high}`)
		}
		process.stdout.write(`${pair}\n  ${lines.join('\n  ')}\n  ${describeBand('low', lows)}\n  ${describeBand('high', highs)}\n`)
	}
	return 0
}

process.exit(main())
