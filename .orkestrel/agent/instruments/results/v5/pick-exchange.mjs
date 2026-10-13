import { readFileSync, existsSync } from 'node:fs'
const path = process.argv[2]
if (!existsSync(path)) { console.error(`no calibration at ${path}`); process.exit(1) }
const rows = readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))
const keepRows = rows.filter((row) => row.mustKeep)
const dropRows = rows.filter((row) => row.mustDrop)
if (keepRows.length === 0 || dropRows.length === 0) { console.error('calibration has no scored rows'); process.exit(1) }
const table = []
for (let hundredths = 55; hundredths <= 95; hundredths += 5) {
	const cut = 100 - hundredths
	const kept = (row) => row.p === undefined || Math.round(row.p * 1000) > cut * 10
	table.push({
		threshold: hundredths / 100,
		keep: keepRows.filter(kept).length / keepRows.length,
		drop: dropRows.filter((row) => !kept(row)).length / dropRows.length,
		share: rows.filter(kept).length / rows.length,
	})
}
for (const row of table) console.error(`${row.threshold.toFixed(2)} keep ${(100 * row.keep).toFixed(0)}% drop ${(100 * row.drop).toFixed(0)}% share ${(100 * row.share).toFixed(0)}%`)
const order = (a, b) => b.drop - a.drop || b.threshold - a.threshold
const best = [1, 0.95, 0.9, 0.85].map((floor) => table.filter((row) => row.keep >= floor).sort(order)[0]).find(Boolean)
if (!best) { console.error('no threshold keeps 85% of the needed exchanges'); process.exit(1) }
console.error(`picked ${best.threshold}: keep ${(100 * best.keep).toFixed(0)}% drop ${(100 * best.drop).toFixed(0)}% share ${(100 * best.share).toFixed(0)}%`)
console.log(best.threshold)
