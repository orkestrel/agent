// Compares the sha256 of each replayed body with the hash the live run recorded for the same call.
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
const [dir] = process.argv.slice(2)
const steps = JSON.parse(readFileSync(join(dir, 'steps.json'), 'utf8'))
let same = 0
steps.forEach((step, index) => {
	const file = join(dir, `${String(index + 1).padStart(3, '0')}.json`)
	const hash = existsSync(file) ? createHash('sha256').update(readFileSync(file, 'utf8')).digest('hex') : 'missing'
	if (hash === step.hash) same += 1
	else process.stdout.write(`request ${index + 1} (${step.goal}) differs\n`)
})
process.stdout.write(`${dir}: ${same} of ${steps.length} bodies byte-identical to the live run\n`)
