import { isDeepStrictEqual } from 'node:util'
import { resolve } from 'node:path'
import { isRecord } from '@orkestrel/contract'
import { readJSON } from '../../.orkestrel/agent/instruments/harness/.build/bench5/helpers.js'
import { hashFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'
import { isMatrixAttempt } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/validators.js'
import { listMatrixPairFailures, matchesMatrixExposure, measureMatrixCosts, readAttempt, readExecution, readFrozen, readResource, verifyMatrixFeasibility } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'

const root = resolve('.orkestrel/agent/instruments/results/l15/g2-think0')
const frozen = hashFile(resolve(root, 'freeze/manifest.json'))
const resourceFile = hashFile(resolve(root, 'resource/manifest.json'))
const fit = hashFile(resolve('.orkestrel/agent/instruments/results/l15/calibration/g2/fit/fit.json'))
const pilotFile = hashFile(resolve(root, 'pilot/manifest.json'))
const resource = readResource(resourceFile, frozen)
const baselineAttempt = resource.attempts.at(-1)
if (baselineAttempt === undefined) throw new Error('accepted resource lacks its terminal attempt')
const baseline = readAttempt(baselineAttempt)
if (baseline === undefined) throw new Error('accepted resource attempt lacks raw evidence')
const value = readJSON(pilotFile.path)
if (!isRecord(value) || value.protocol !== 'l6' || !isDeepStrictEqual(value.frozen, frozen) || !isDeepStrictEqual(value.resource, resourceFile) || !isDeepStrictEqual(value.fit, fit) || !isMatrixAttempt(value.attempt))
	throw new Error('pilot manifest custody differs')
const run = readAttempt(value.attempt)
if (run === undefined) throw new Error('pilot attempt lacks decoded raw evidence')
verifyMatrixFeasibility(run)
if (run.execution.phase !== 'pilot' || run.execution.arm !== 'aggregate' || run.execution.copy !== 1 || !isDeepStrictEqual(run.execution.frozen, frozen) || !isDeepStrictEqual(run.execution.resource, resourceFile) || !isDeepStrictEqual(run.execution.fit, fit))
	throw new Error('pilot execution configuration differs')
const admitted = readExecution(value.attempt.execution.path)
const exposed = run.rows.filter((row) => matchesMatrixExposure(run, row.goal)).length
const failures = [...value.attempt.failures, ...listMatrixPairFailures(baseline, run)]
if (exposed <= run.rows.length / 2) failures.push('nonempty wire body exposure is not a majority of served development goals')
const accepted = failures.length === 0
if (value.served !== run.rows.length || value.exposed !== exposed || !isDeepStrictEqual(value.failures, failures) || value.accepted !== accepted || !isDeepStrictEqual(admitted.execution, run.execution))
	throw new Error('pilot decision differs from emitted evidence helpers')
const costs = measureMatrixCosts(run)
process.stdout.write(`${JSON.stringify({
	frozen,
	resource: resourceFile,
	fit,
	pilot: pilotFile,
	resourceAccepted: resource.accepted,
	resourceBudget: resource.budget,
	accepted,
	served: run.rows.length,
	exposed,
	budget: value.attempt.budget,
	failures,
	status: run.status,
	requests: run.requests.length,
	execution: run.execution,
	admissionMatches: isDeepStrictEqual(admitted.execution, run.execution),
	pairFailures: listMatrixPairFailures(baseline, run),
	costs: { metadata: costs.metadata, wire: costs.wire, stage: costs.stage, flush: costs.flush }
}, null, 2)}\n`)

