// Pairs two arms over the reworded copies both finished and applies the band rule:
//   node band.ts ARM_A ARM_B [DIR]
// d is passes(ARM_A) minus passes(ARM_B) per copy; a fix clears when mean(d) - 2*sd(d)/sqrt(n) > 0
// and a trim when that bound is >= -1. A run's rescored rows under DIR/rescored/RUN win over its
// original rows. It supersedes band.mjs. Exit: 0; 64 on usage.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

interface Pair {
	readonly copy: number
	readonly left: string
	readonly right: string
	readonly d: number
}

function readSuccesses(dir: string, run: string): string | undefined {
	for (const base of [join(dir, 'rescored', run), join(dir, run)]) {
		if (!existsSync(base)) continue
		const file = readdirSync(base).find((name) => name.endsWith('.jsonl') && !name.startsWith('memory'))
		if (file === undefined) continue
		const marks = readFileSync(join(base, file), 'utf8')
			.split(/\r\n|\n/)
			.flatMap((line) => {
				try {
					const row: unknown = JSON.parse(line)
					return typeof row === 'object' && row !== null && 'goal' in row ? ['success' in row && row.success === true ? 'P' : '.'] : []
				} catch {
					return []
				}
			})
		if (marks.length === 10) return marks.join('')
	}
	return undefined
}

function countPasses(marks: string): number {
	return marks.split('').filter((mark) => mark === 'P').length
}

function main(): number {
	const [a, b, given] = process.argv.slice(2)
	if (a === undefined || b === undefined) {
		process.stderr.write('usage: node band.ts ARM_A ARM_B [DIR]\n')
		return 64
	}
	const dir = given ?? resolve(import.meta.dirname, '..')
	const pairs: Pair[] = []
	for (let copy = 1; copy <= 8; copy += 1) {
		const left = readSuccesses(dir, `${a}-v${copy}`)
		const right = readSuccesses(dir, `${b}-v${copy}`)
		if (left !== undefined && right !== undefined) pairs.push({ copy, left, right, d: countPasses(left) - countPasses(right) })
	}
	for (const pair of pairs) process.stdout.write(`v${pair.copy}  ${a} ${pair.left} ${countPasses(pair.left)}  ${b} ${pair.right} ${countPasses(pair.right)}  d ${pair.d}\n`)
	if (pairs.length < 2) return 0
	const mean = pairs.reduce((sum, pair) => sum + pair.d, 0) / pairs.length
	const sd = Math.sqrt(pairs.reduce((sum, pair) => sum + (pair.d - mean) ** 2, 0) / (pairs.length - 1))
	const lower = mean - (2 * sd) / Math.sqrt(pairs.length)
	process.stdout.write(`n ${pairs.length}  mean d ${mean.toFixed(2)}  sd ${sd.toFixed(2)}  lower ${lower.toFixed(2)}  fix ${lower > 0 ? 'clears' : 'does not clear'}  trim ${lower >= -1 ? 'clears' : 'does not clear'}\n`)
	const goals = Array.from({ length: 10 }, (_, index) => index)
	const perGoal = (side: 'left' | 'right'): string => goals.map((goal) => pairs.filter((pair) => pair[side][goal] === 'P').length).join(' ')
	process.stdout.write(`per goal passes ${a} ${perGoal('left')} | ${b} ${perGoal('right')}\n`)
	return 0
}

process.exit(main())
