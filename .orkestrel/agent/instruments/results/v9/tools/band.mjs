// Usage: node band.mjs ARM_A ARM_B [DIR]
// Pairs ARM_A-vN with ARM_B-vN over the reworded copies both arms finished, then applies the band rule:
// a fix must clear mean(d) - 2*sd(d)/sqrt(n) > 0, a trim must clear >= -1, where d = passes(A) - passes(B).
// A run reads DIR/rescored/RUN/FILE when that file exists and its FILE.sha256 holds the hash of DIR/RUN/FILE, because a
// rescore applies the edited forbiddenPatterns, and DIR/RUN/FILE otherwise; each run prints the source it read.
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const [a, b, dir = path.resolve(import.meta.dirname, '..')] = process.argv.slice(2)
const rows = (name) => {
	const run = path.join(dir, name)
	if (!fs.existsSync(run)) return undefined
	const file = fs.readdirSync(run).find((entry) => entry.endsWith('.jsonl') && !entry.startsWith('memory'))
	if (!file) return undefined
	const original = path.join(run, file)
	const rescored = path.join(dir, 'rescored', name, file)
	const recorded = fs.existsSync(`${rescored}.sha256`) ? fs.readFileSync(`${rescored}.sha256`, 'utf8').trim() : undefined
	const current = createHash('sha256').update(fs.readFileSync(original)).digest('hex')
	// A rescored copy without the original's hash comes from an earlier run of the same name.
	const fresh = fs.existsSync(rescored) && recorded === current
	const source = fresh ? rescored : original
	const note = fs.existsSync(rescored) && !fresh ? ` (rescored copy ignored: ${recorded === undefined ? 'no hash' : 'hash differs'})` : ''
	console.log(`source ${name} ${fresh ? 'rescored' : 'original'} ${path.relative(dir, source)}${note}`)
	const lines = fs.readFileSync(source, 'utf8').split('\n').filter(Boolean).flatMap((line) => {
		try { return [JSON.parse(line)] } catch { return [] }
	}).filter((line) => line.goal)
	return lines.length === 10 ? lines : undefined
}
const pairs = []
for (let copy = 1; copy <= 8; copy++) {
	const left = rows(`${a}-v${copy}`)
	const right = rows(`${b}-v${copy}`)
	if (!left || !right) continue
	const marks = (lines) => lines.map((line) => (line.success ? 'P' : '.')).join('')
	const count = (lines) => lines.filter((line) => line.success).length
	pairs.push({ copy, left: marks(left), right: marks(right), d: count(left) - count(right) })
}
for (const pair of pairs) console.log(`v${pair.copy}  ${a} ${pair.left} ${pair.left.split('P').length - 1}  ${b} ${pair.right} ${pair.right.split('P').length - 1}  d ${pair.d}`)
const n = pairs.length
if (n < 2) process.exit(0)
const mean = pairs.reduce((sum, pair) => sum + pair.d, 0) / n
const sd = Math.sqrt(pairs.reduce((sum, pair) => sum + (pair.d - mean) ** 2, 0) / (n - 1))
const lower = mean - (2 * sd) / Math.sqrt(n)
console.log(`n ${n}  mean d ${mean.toFixed(2)}  sd ${sd.toFixed(2)}  lower ${lower.toFixed(2)}  fix ${lower > 0 ? 'clears' : 'does not clear'}  trim ${lower >= -1 ? 'clears' : 'does not clear'}`)
const goals = Array.from({ length: 10 }, (_, index) => index)
console.log('per goal passes', a, goals.map((goal) => pairs.filter((pair) => pair.left[goal] === 'P').length).join(' '), '|', b, goals.map((goal) => pairs.filter((pair) => pair.right[goal] === 'P').length).join(' '))
