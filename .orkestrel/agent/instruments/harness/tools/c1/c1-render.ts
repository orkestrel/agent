// Renders a c1 report.json as Markdown tables: per-interval atom pass rates, critical violations, folded and
// omitted sources per arm, the pairs against records, the audit readings, and the costs.
// Usage: node tmp/units/c1-render.ts REPORT_JSON
import { readFileSync } from 'node:fs'

interface Dimension {
	readonly passed: number
	readonly total: number
	readonly ambiguous: number
}

interface ArmInterval {
	readonly arm: string
	readonly served: number
	readonly judged: number
	readonly acceptable: { readonly low: number; readonly high: number }
	readonly critical: number
	readonly ambiguous: number
	readonly dimensions: Readonly<Record<string, Dimension>>
	readonly folded: number
	readonly omitted: number
}

interface Pair {
	readonly arm: string
	readonly goals: number
	readonly wins: number
	readonly losses: number
	readonly ties: number
	readonly ambiguous: number
	readonly gain: { readonly low: number; readonly high: number }
	readonly regressions: readonly string[]
}

interface Interval {
	readonly from: number
	readonly through: number
	readonly goals: readonly string[]
	readonly valid: boolean
	readonly arms: readonly ArmInterval[]
	readonly pairs: readonly Pair[]
}

interface Cost {
	readonly arm: string
	readonly [member: string]: unknown
}

interface Report {
	readonly valid: boolean
	readonly verdict: string
	readonly reasons: readonly string[]
	readonly status: Readonly<Record<string, string>>
	readonly served: Readonly<Record<string, number>>
	readonly audit: {
		readonly leaks: Readonly<Record<string, number>>
		readonly foreign: readonly string[]
		readonly controls: readonly string[]
	}
	readonly intervals: readonly Interval[]
	readonly overall: Interval
	readonly final: Interval
	readonly costs: readonly Cost[]
}

const path = process.argv[2]
if (path === undefined) throw new Error('usage: node c1-render.ts REPORT_JSON')
const report: Report = JSON.parse(readFileSync(path, 'utf8'))
const dimensions = ['facts', 'work', 'obligations', 'revision', 'evidence']

function percent(passed: number, total: number): string {
	return total === 0 ? '-' : `${Math.round((100 * passed) / total)}% (${passed}/${total})`
}

function renderArms(interval: Interval, title: string): void {
	console.log(`\n### ${title}: shifts ${interval.from} to ${interval.through}, ${interval.goals.length} goals${interval.valid ? '' : ' (invalid)'}\n`)
	console.log(`| Arm | Served | Judged | ${dimensions.join(' | ')} | Critical | Folded | Omitted |`)
	console.log(`| --- | --- | --- | ${dimensions.map(() => '---').join(' | ')} | --- | --- | --- |`)
	for (const arm of interval.arms) {
		const cells = dimensions.map((dimension) => {
			const tally = arm.dimensions[dimension]
			return tally === undefined ? '-' : percent(tally.passed, tally.total)
		})
		console.log(`| ${arm.arm} | ${arm.served} | ${arm.judged} | ${cells.join(' | ')} | ${arm.critical} | ${arm.folded} | ${arm.omitted} |`)
	}
	if (interval.pairs.length > 0) {
		console.log('\n| Pair vs records | Goals | Wins | Losses | Ties | Gain low..high | Critical regressions |')
		console.log('| --- | --- | --- | --- | --- | --- | --- |')
		for (const pair of interval.pairs)
			console.log(`| ${pair.arm} | ${pair.goals} | ${pair.wins} | ${pair.losses} | ${pair.ties} | ${pair.gain.low}..${pair.gain.high} | ${pair.regressions.length} |`)
	}
}

console.log(`valid: ${report.valid}; verdict: ${report.verdict}`)
for (const reason of report.reasons) console.log(`- ${reason}`)
console.log(`status: ${JSON.stringify(report.status)}; served: ${JSON.stringify(report.served)}`)
console.log(`audit: leaks ${JSON.stringify(report.audit.leaks)}; foreign ${report.audit.foreign.length}; controls missed ${JSON.stringify(report.audit.controls)}`)
renderArms(report.overall, 'Overall')
for (const interval of report.intervals) renderArms(interval, 'Interval')
renderArms(report.final, 'Final')
console.log('\n### Costs\n')
for (const cost of report.costs) console.log(`- ${cost.arm}: ${JSON.stringify(cost)}`)
