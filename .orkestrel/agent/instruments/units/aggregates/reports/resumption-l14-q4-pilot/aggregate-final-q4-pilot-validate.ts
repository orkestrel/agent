import { isDeepStrictEqual } from 'node:util'
import { join } from 'node:path'
import { hashFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'
import { readJSON } from '../../.orkestrel/agent/instruments/harness/.build/bench5/helpers.js'
import { isMatrixAttempt } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/validators.js'
import { listMatrixPairFailures, matchesMatrixExposure, measureMatrixCosts, readAttempt, readFrozen, readResource, verifyMatrixFeasibility } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'

const root = 'C:/Users/mikes/WebstormProjects/scaffold'
const cell = join(root, '.orkestrel/agent/instruments/results/l14/q4-think0')
const frozenPath = join(cell, 'freeze/manifest.json')
const resourcePath = join(cell, 'resource/manifest.json')
const fitPath = join(root, '.orkestrel/agent/instruments/results/l14/calibration/q4/fit/fit.json')
const pilotPath = join(cell, 'pilot/manifest.json')
const frozenReference = hashFile(frozenPath)
const frozen = readFrozen(frozenReference)
const resourceReference = hashFile(resourcePath)
const resource = readResource(resourceReference, frozenReference)
const fitReference = hashFile(fitPath)
const resourceAttempt = resource.attempts.at(-1)
if (!resource.accepted || resourceAttempt === undefined) throw new Error('pilot resource is not accepted')
const baseline = readAttempt(resourceAttempt)
verifyMatrixFeasibility(baseline)
if (baseline === undefined) throw new Error('accepted resource run is missing')

const pilotValue = readJSON(pilotPath)
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
if (!isRecord(pilotValue) || pilotValue.protocol !== 'l6' || !isDeepStrictEqual(pilotValue.frozen, frozenReference) || !isDeepStrictEqual(pilotValue.resource, resourceReference) || !isDeepStrictEqual(pilotValue.fit, fitReference) || !isMatrixAttempt(pilotValue.attempt) || typeof pilotValue.accepted !== 'boolean' || typeof pilotValue.served !== 'number' || typeof pilotValue.exposed !== 'number' || !Array.isArray(pilotValue.failures) || !pilotValue.failures.every(failure => typeof failure === 'string')) throw new Error('pilot manifest identity or shape differs')

const attempt = pilotValue.attempt
const run = readAttempt(attempt)
verifyMatrixFeasibility(run)
if (run === undefined) throw new Error('pilot attempt has no complete retained run')
if (run.execution.phase !== 'pilot' || run.execution.arm !== 'aggregate' || run.execution.copy !== 1 || !isDeepStrictEqual(run.execution.frozen, frozenReference) || !isDeepStrictEqual(run.execution.resource, resourceReference) || !isDeepStrictEqual(run.execution.fit, fitReference)) throw new Error('pilot execution binding differs')

const pairFailures = listMatrixPairFailures(baseline, run)
const exposed = run.rows.filter(row => matchesMatrixExposure(run, row.goal)).length
if (pilotValue.served !== run.rows.length || pilotValue.exposed !== exposed) throw new Error('pilot served or exposure counts differ')
const unattempted = baseline.rows.filter(row => !run.rows.some(candidate => candidate.goal === row.goal)).map(row => row.goal)
const recordPick = baseline.picks.at(0)
const pilotPick = run.picks.at(0)
const driftGoals = pairFailures.filter(failure => failure.endsWith('paired gauge drift exceeds ledger bound')).map(failure => failure.slice(0, failure.indexOf(':')))
const driftDetails = driftGoals.map(goal => {
	const before = baseline.rows.find(row => row.goal === goal)
	const after = run.rows.find(row => row.goal === goal)
	if (before === undefined || after === undefined || before.scale <= 0) throw new Error(`paired drift evidence missing for ${goal}`)
	return { goal, before: before.scale, after: after.scale, relativeDelta: Math.abs(after.scale - before.scale) / before.scale }
})
const costs = measureMatrixCosts(run)
process.stdout.write(JSON.stringify({
	frozen: frozenReference,
	resource: { reference: resourceReference, accepted: resource.accepted, budget: resource.budget },
	fit: fitReference,
	pilot: { accepted: pilotValue.accepted, served: pilotValue.served, exposed, failures: pilotValue.failures, attemptAccepted: attempt.accepted, attemptFailures: attempt.failures },
	run: { path: run.path, status: run.status, phase: run.execution.phase, arm: run.execution.arm, copy: run.execution.copy, failures: run.failures, pairedFailures: pairFailures, unattempted, evidence: run.files },
	pair: {
		initial: {
			bothPresent: recordPick !== undefined && pilotPick !== undefined,
			digestEqual: recordPick !== undefined && pilotPick !== undefined && recordPick.digest === pilotPick.digest,
			tailEqual: recordPick !== undefined && pilotPick !== undefined && isDeepStrictEqual(recordPick.tail, pilotPick.tail),
			scaleEqual: recordPick !== undefined && pilotPick !== undefined && recordPick.scale === pilotPick.scale,
			recordScale: recordPick?.scale,
			pilotScale: pilotPick?.scale
		},
		gaugeEqual: isDeepStrictEqual(baseline.gauge, run.gauge),
		baselineGauge: baseline.gauge,
		pilotGauge: run.gauge,
		driftDetails
	},
	costs
}, null, 2) + '\n')
