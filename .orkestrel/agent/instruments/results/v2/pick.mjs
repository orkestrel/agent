import { readFileSync, existsSync } from 'node:fs'
const OUT = '/home/user/agent/tmp/bench/results/v2'
const candidates = [
	['cal-mica-b2-lookup', 'bounded', 2, 'lookup'],
	['cal-mica-b6-lookup', 'bounded', 6, 'lookup'],
	['cal-mica-bounded', 'bounded', 2, 'stock'],
]
const table = []
for (const [dir, state, neighbors, criterion] of candidates) {
	const path = `${OUT}/${dir}/calibration.jsonl`
	if (!existsSync(path)) continue
	const rows = readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))
	if (rows.length < 400) continue
	const keepRows = rows.filter((row) => row.mustKeep)
	const dropRows = rows.filter((row) => row.mustDrop)
	for (let hundredths = 55; hundredths <= 95; hundredths += 5) {
		const cut = (100 - hundredths) / 100
		const kept = (row) => row.p === undefined || row.p > cut
		table.push({
			dir, state, neighbors, criterion, threshold: hundredths / 100,
			keep: keepRows.filter(kept).length / keepRows.length,
			drop: dropRows.filter((row) => !kept(row)).length / dropRows.length,
			share: rows.filter(kept).length / rows.length,
		})
	}
}
const order = (a, b) => b.drop - a.drop || b.threshold - a.threshold
const best = [1, 0.95, 0.9, 0.85].map((floor) => table.filter((row) => row.keep >= floor).sort(order)[0]).find(Boolean)
if (!best) { console.error('no calibration with keep >= 85%'); process.exit(1) }
console.error(`picked ${best.dir} threshold ${best.threshold}: keep ${(100 * best.keep).toFixed(0)}% drop ${(100 * best.drop).toFixed(0)}% share ${(100 * best.share).toFixed(0)}%`)
console.log(`--state ${best.state} --neighbors ${best.neighbors} --criterion ${best.criterion} --threshold ${best.threshold}`)
