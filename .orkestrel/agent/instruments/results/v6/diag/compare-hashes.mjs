// Compares the sha256 of each stub-recorded body with the hash the live run recorded for the same call.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const [scriptFile, wire] = process.argv.slice(2)
const steps = JSON.parse(readFileSync(scriptFile, 'utf8'))
const bodies = readdirSync(wire).filter((name) => name.endsWith('-body.json')).sort()
let same = 0
steps.forEach((step, index) => {
	const body = bodies[index] === undefined ? undefined : readFileSync(join(wire, bodies[index]), 'utf8')
	const hash = body === undefined ? 'missing' : createHash('sha256').update(body).digest('hex')
	const ok = hash === step.hash
	if (ok) same += 1
	else process.stdout.write(`request ${index + 1} (${step.goal}): differs\n`)
})
process.stdout.write(`${wire}: ${same} of ${steps.length} request bodies byte-identical to the live run (bodies recorded ${bodies.length})\n`)
