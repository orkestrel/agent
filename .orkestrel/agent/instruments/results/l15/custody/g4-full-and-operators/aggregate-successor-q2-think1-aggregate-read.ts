import { isDeepStrictEqual } from 'node:util'
import { resolve } from 'node:path'
import { hashFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'
import { parseMatrixRun } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/parsers.js'
import { listMatrixPairFailures, matchesMatrixExposure, measureMatrixCosts, readAttempt, readDevelopment, readExecution, readFrozen, readResource } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'

const root = resolve('.orkestrel/agent/instruments/results/l15/q2-think1')
const frozenFile = hashFile(resolve(root, 'freeze/manifest.json'))
const frozen = readFrozen(frozenFile)
const resourceFile = hashFile(resolve(root, 'resource/manifest.json'))
const resource = readResource(resourceFile, frozenFile)
const baselineAttempt = resource.attempts.at(-1)
if (baselineAttempt === undefined) throw new Error('Accepted resource lacks its terminal attempt')
const baseline = readAttempt(baselineAttempt)
if (baseline === undefined) throw new Error('Resource attempt lacks decoded raw evidence')
const executionFile = hashFile(resolve(root, 'exploration/aggregate-execution.json'))
const admitted = readExecution(executionFile.path)
const policy = readDevelopment(admitted.execution, frozen)
const run = parseMatrixRun(resolve(root, 'exploration/aggregate-run'))
if (run === undefined) throw new Error('Exploratory run lacks decoded raw evidence')
const costs = measureMatrixCosts(run)
const exposed = run.rows.filter((row) => matchesMatrixExposure(run, row.goal)).length
process.stdout.write(`${JSON.stringify({
	frozen: frozenFile,
	resource: resourceFile,
	executionFile,
	policy,
	resourceAccepted: resource.accepted,
	resourceBudget: resource.budget,
	status: run.status,
	served: run.rows.length,
	exposed,
	requests: run.requests.length,
	sent: run.requests.filter((request) => request.sent).length,
	execution: run.execution,
	admissionMatches: isDeepStrictEqual(admitted.execution, run.execution),
	pairFailures: listMatrixPairFailures(baseline, run),
	failures: run.failures,
	goals: run.rows.map((row) => ({ goal: row.goal, success: row.success, partial: row.partial, error: row.error, exposed: matchesMatrixExposure(run, row.goal) })),
	files: run.files.length,
	run: hashFile(resolve(run.path, 'run.json')),
	costs: { metadata: costs.metadata, wire: costs.wire, stage: costs.stage, flush: costs.flush }
}, null, 2)}\n`)
