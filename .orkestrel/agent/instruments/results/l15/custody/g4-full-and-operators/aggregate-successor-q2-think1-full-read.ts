import { isDeepStrictEqual } from 'node:util'
import { resolve } from 'node:path'
import { hashFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'
import { readJSON } from '../../.orkestrel/agent/instruments/harness/.build/bench5/helpers.js'
import { buildMatrixBound, measureMatrixCosts, readAttempt, readExecution, readFrozen, readResource, verifyMatrixFeasibility } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'
import { isMatrixResource } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/validators.js'

const root = resolve('.orkestrel/agent/instruments/results/l15/q2-think1')
const frozen = hashFile(resolve(root, 'freeze/manifest.json'))
const resourceFile = hashFile(resolve(root, 'resource/manifest.json'))
const fullFile = hashFile(resolve(root, 'full/manifest.json'))
readFrozen(frozen)
const resource = readResource(resourceFile, frozen)
const value = readJSON(fullFile.path)

const baselineAttempt = resource.attempts.at(-1)
if (baselineAttempt === undefined) throw new Error('accepted resource lacks its terminal attempt')
const baseline = readAttempt(baselineAttempt)
if (baseline === undefined) throw new Error('accepted resource lacks decoded raw evidence')
if (!isMatrixResource(value) || !isDeepStrictEqual(value.frozen, frozen) || value.attempts.length !== 1 || !isDeepStrictEqual(value.bound, buildMatrixBound(baseline)))
	throw new Error('full manifest custody, attempt count, or empirical bound differs')
const attempt = value.attempts[0]
if (attempt === undefined) throw new Error('full manifest lacks its attempt')
const run = readAttempt(attempt)
if (run === undefined) throw new Error('full manifest attempt lacks decoded raw evidence')
verifyMatrixFeasibility(run)
const admitted = readExecution(attempt.execution.path)
const costs = measureMatrixCosts(run)
process.stdout.write(`${JSON.stringify({
	frozen,
	resource: resourceFile,
	full: fullFile,
	resourceAccepted: resource.accepted,
	resourceBudget: resource.budget,
	fullAccepted: value.accepted,
	fullBudget: value.budget,
	attempt: { budget: attempt.budget, accepted: attempt.accepted, resource: attempt.resource, failures: attempt.failures },
	run: {
		status: run.status,
		rows: run.rows.length,
		requests: run.requests.length,
		failures: run.failures,
		execution: run.execution,
		admissionMatches: isDeepStrictEqual(admitted.execution, run.execution)
	},
	costs: { metadata: costs.metadata, wire: costs.wire, stage: costs.stage, flush: costs.flush }
}, null, 2)}\n`)

