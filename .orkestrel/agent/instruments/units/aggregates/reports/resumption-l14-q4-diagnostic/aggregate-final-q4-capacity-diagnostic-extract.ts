import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { isRecord } from '@orkestrel/contract'
import { readJSON } from '../../.orkestrel/agent/instruments/harness/.build/bench5/helpers.js'
import { hashFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'
import { readBuild } from '../../.orkestrel/agent/instruments/harness/.build/bench5/build/helpers.js'
import { readAttempt, listCapacityFailures } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'
import { isMatrixResource } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/validators.js'

const root = resolve(import.meta.dirname, '..', '..')
const prefix = join(root, 'tmp', 'units', 'aggregate-final-q4-capacity-diagnostic')
const full = join(root, '.orkestrel', 'agent', 'instruments', 'results', 'l14', 'q4-think0', 'full')
const attempt = join(full, 'preflight', 'l6-q4-think0-full-v1')
const identities = [
	['.orkestrel/agent/instruments/harness/.build/build-manifest.json', 'd361e9d8ec607ae7e21bcee966904effa2be9a0ccaa972eef8d25b540e977c54'],
	[join(full, 'manifest.json'), '52869d2ea3167896efd638f457e9690a95dfdff87fe128d1e7065f260a13f7b8'],
	[join(attempt, 'run.json'), '8e20d6b79e023badb91eecca08f3cee7d3c7e2ca160b0ada84bc08590ca2b0e0'],
	[join(attempt, 'capacity-52.json'), '5b57739c9a861447d69590b8408cf949456550d5a9e0a2cfb1494c0d4a71f84f'],
] as const
const checked = identities.map(([path, expected]) => {
	const file = hashFile(resolve(root, path))
	if (file.hash !== expected) throw new Error(`changed prior artifact: ${file.path}`)
	return file
})
const build = readBuild()
const manifest = readJSON(join(full, 'manifest.json'))
if (!isMatrixResource(manifest)) throw new Error('invalid full manifest')
const reference = manifest.attempts[0]
if (reference === undefined) throw new Error('missing attempt')
const run = readAttempt(reference)
if (run === undefined) throw new Error('missing run')
const requests = run.requests.filter((request) => request.sequence >= 50).map((request) => {
	const raw = isRecord(request.request) ? request.request : undefined
	return {
		sequence: request.sequence, role: request.role, goal: request.goal, sent: request.sent,
		started: request.started, startedUTC: new Date(request.started).toISOString(),
		buffered: request.buffered, bufferedUTC: request.buffered === undefined ? undefined : new Date(request.buffered).toISOString(),
		finished: request.finished, finishedUTC: new Date(request.finished).toISOString(),
		status: request.status, error: request.error, failures: request.failures,
		model: raw?.model, keep_alive: raw?.keep_alive, options: raw?.options,
		prompt: request.prompt, completion: request.completion, reason: request.reason, capacity: request.capacity,
	}
})
const extracts = [
	['tmp/units/aggregate-final-daemon-root.jsonl', 2593, 2598, 'stdout.log'],
	['tmp/units/aggregate-final-daemon-root.err', 332410, 333439, 'stderr.log'],
] as const
const mappings = extracts.map(([source, first, last, suffix]) => {
	const bytes = readFileSync(resolve(root, source))
	let start = 0
	let end = 0
	let line = 1
	for (let index = 0; index < bytes.length; index++) {
		if (line === first && start === 0) start = index
		if (bytes[index] !== 10) continue
		if (line === last) { end = index + 1; break }
		line++
	}
	if (end <= start) throw new Error('missing bounded lines')
	const excerpt = bytes.subarray(start, end)
	const path = `${prefix}-${suffix}`
	writeFileSync(path, excerpt, { flag: 'wx' })
	const reread = readFileSync(resolve(root, source)).subarray(start, end)
	if (!excerpt.equals(reread)) throw new Error('daemon interval changed')
	return { source, first, last, start, end, bytes: excerpt.length, path, hash: createHash('sha256').update(excerpt).digest('hex') }
})
const receipt = {
	checked, build: { sources: build.sources.length, outputs: build.outputs.length },
	requests, capacityFailures: listCapacityFailures(run.requests, run.frozen, run.execution.budget),
	snapshot: readJSON(join(attempt, 'capacity-52.json')), previous: readJSON(join(attempt, 'capacity-50.json')),
	extracts: mappings,
	timezone: new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'longOffset' }).format(new Date(1791773033067)),
}
writeFileSync(`${prefix}-evidence.json`, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' })
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`)
