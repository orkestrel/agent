// Tallies the blind audits into adjudicated passes per run and reads the band for arm pairs:
//   node tally.ts --audit AUDIT_DIR [--keys KEY_DIR] [--pair A,B,COPIES]... [--json FILE]
// Reads every verdicts-*.json and key-*.json under AUDIT_DIR, and every key-*.json under KEY_DIR. A scorer pass counts unless the audit rules it a false
// pass; a scorer fail counts when the audit rules it a misread; an ambiguous row counts as a fail at the low end and
// a pass at the high end. Each --pair names two run prefixes and a copy range (for example
// t2a-records,t2w-control,1-4); the pair's d per copy is A − B, read at the low end, the high end, and across (A low
// against B high), and it clears when mean(d) − 2·sd(d)/√n > 0. The flag repeats.
// Exit: 0; 1 when a verdict id has no key, an id appears twice across the verdict files, a run of a pair has no audited
// rows, or a paired run's audited row count is not 10; 64 on usage.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROWS = 10

interface Key {
	readonly id: string
	readonly run: string
	readonly goal: string
	readonly passed: boolean
}

interface Verdict {
	readonly id: string
	readonly verdict: string
}

interface Tally {
	scorer: number
	falsePass: number
	ambiguousPass: number
	misread: number
	ambiguousFail: number
	rows: number
}

function readOptions(argv: readonly string[], name: string): readonly string[] {
	const values: string[] = []
	for (let at = 0; at < argv.length; at += 1) {
		const value = argv[at + 1]
		if (argv[at] === name && value !== undefined && !value.startsWith('--')) values.push(value)
	}
	return values
}

function mean(values: readonly number[]): number {
	return values.reduce((sum, value) => sum + value, 0) / values.length
}

function deviation(values: readonly number[]): number {
	const center = mean(values)
	return Math.sqrt(values.reduce((sum, value) => sum + (value - center) ** 2, 0) / (values.length - 1))
}

function main(): number {
	const argv = process.argv.slice(2)
	const dir = readOptions(argv, '--audit')[0]
	const json = readOptions(argv, '--json')[0]
	if (dir === undefined) {
		process.stderr.write('usage: node tally.ts --audit AUDIT_DIR [--keys KEY_DIR] [--pair A,B,COPIES]... [--json FILE]\n')
		return 64
	}
	const files = readdirSync(dir)
	const keys = new Map<string, Key>()
	for (const keyDir of [dir, ...readOptions(argv, '--keys')])
		for (const name of (keyDir === dir ? files : readdirSync(keyDir)).filter((file) => file.startsWith('key-') && file.endsWith('.json')))
			for (const key of JSON.parse(readFileSync(join(keyDir, name), 'utf8')) as Key[]) keys.set(key.id, key)
	const seen = new Map<string, string>()
	const tallies = new Map<string, Tally>()
	for (const name of files.filter((file) => file.startsWith('verdicts-') && file.endsWith('.json'))) {
		for (const verdict of JSON.parse(readFileSync(join(dir, name), 'utf8')) as Verdict[]) {
			const key = keys.get(verdict.id)
			if (key === undefined) {
				process.stderr.write(`${name}: verdict id ${verdict.id} has no key\n`)
				return 1
			}
			const earlier = seen.get(verdict.id)
			if (earlier !== undefined) {
				process.stderr.write(`${name}: verdict id ${verdict.id} appears twice (also in ${earlier})\n`)
				return 1
			}
			seen.set(verdict.id, name)
			const tally = tallies.get(key.run) ?? { scorer: 0, falsePass: 0, ambiguousPass: 0, misread: 0, ambiguousFail: 0, rows: 0 }
			tally.rows += 1
			if (key.passed) {
				tally.scorer += 1
				if (verdict.verdict === 'false-pass') tally.falsePass += 1
				else if (verdict.verdict === 'ambiguous') tally.ambiguousPass += 1
			} else if (verdict.verdict === 'misread') tally.misread += 1
			else if (verdict.verdict === 'ambiguous') tally.ambiguousFail += 1
			tallies.set(key.run, tally)
		}
	}
	const low = (tally: Tally): number => tally.scorer - tally.falsePass - tally.ambiguousPass + tally.misread
	const high = (tally: Tally): number => tally.scorer - tally.falsePass + tally.misread + tally.ambiguousFail
	const runs = [...tallies.keys()].sort()
	process.stdout.write('run scorer false-pass ambiguous+ misread ambiguous- | low high\n')
	for (const run of runs) {
		const tally = tallies.get(run) as Tally
		process.stdout.write(`${run} ${tally.scorer} ${tally.falsePass} ${tally.ambiguousPass} ${tally.misread} ${tally.ambiguousFail} | ${low(tally)} ${high(tally)}\n`)
	}
	const bands = []
	for (const pair of readOptions(argv, '--pair')) {
		const [left, right, range] = pair.split(',')
		const copies = /^(\d+)-(\d+)$/.exec(range ?? '')
		if (left === undefined || right === undefined || copies === null) {
			process.stderr.write(`--pair takes A,B,FIRST-LAST, not ${pair}\n`)
			return 64
		}
		const ends: Record<string, number[]> = { low: [], high: [], across: [] }
		for (let copy = Number(copies[1]); copy <= Number(copies[2]); copy += 1) {
			const a = tallies.get(`${left}-v${copy}`)
			const b = tallies.get(`${right}-v${copy}`)
			if (a === undefined || b === undefined) {
				process.stderr.write(`${a === undefined ? left : right}-v${copy}: no audited rows\n`)
				return 1
			}
			for (const [label, tally] of [[`${left}-v${copy}`, a], [`${right}-v${copy}`, b]] as const) {
				if (tally.rows !== ROWS) {
					process.stderr.write(`${label}: ${tally.rows} audited rows where ${ROWS} are required\n`)
					return 1
				}
			}
			ends.low.push(low(a) - low(b))
			ends.high.push(high(a) - high(b))
			ends.across.push(low(a) - high(b))
		}
		process.stdout.write(`\n${left} against ${right}, copies ${range}\n`)
		for (const [end, d] of Object.entries(ends)) {
			const bound = mean(d) - (2 * deviation(d)) / Math.sqrt(d.length)
			bands.push({ left, right, range, end, d, mean: mean(d), bound, clears: bound > 0 })
			process.stdout.write(`  ${end}: d ${d.join(', ')}; mean ${mean(d).toFixed(2)}; lower bound ${bound.toFixed(2)}; ${bound > 0 ? 'clears' : 'does not clear'}\n`)
		}
	}
	if (json !== undefined) writeFileSync(json, `${JSON.stringify({ runs: Object.fromEntries([...tallies].map(([run, tally]) => [run, { ...tally, low: low(tally), high: high(tally) }])), bands }, null, 1)}\n`)
	return 0
}

process.exit(main())
