import { execFileSync } from 'node:child_process'
import { isDeepStrictEqual } from 'node:util'
import { join, resolve } from 'node:path'
import { isRecord } from '@orkestrel/contract'
import { readBuild } from '../../.orkestrel/agent/instruments/harness/.build/bench5/build/helpers.js'
import { readJSON } from '../../.orkestrel/agent/instruments/harness/.build/bench5/helpers.js'
import { hashFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'
import {
	listMatrixPairFailures,
	matchesMatrixExposure,
	measureMatrixCosts,
	readAttempt,
	readExecution,
	readFrozen,
	readResource,
	verifyMatrixFeasibility,
} from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'
import { isMatrixAttempt } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/validators.js'

const root = resolve(import.meta.dirname, '..', '..')
const results = join(root, '.orkestrel', 'agent', 'instruments', 'results', 'l15')
const cell = join(results, 'q4-think0')
const frozenFile = hashFile(join(cell, 'freeze', 'manifest.json'))
const resourceFile = hashFile(join(cell, 'resource', 'manifest.json'))
const fitFile = hashFile(join(results, 'calibration', 'q4', 'fit', 'fit.json'))
const pilotFile = hashFile(join(cell, 'pilot-2', 'manifest.json'))
const frozen = readFrozen(frozenFile)
const resource = readResource(resourceFile, frozenFile)

if (!resource.accepted) throw new Error('accepted records resource is not accepted')
const baselineAttempt = resource.attempts.at(-1)
if (baselineAttempt === undefined) throw new Error('accepted records resource has no terminal attempt')
const baseline = readAttempt(baselineAttempt)
if (baseline === undefined) throw new Error('accepted records resource has no decoded run')

const pilotValue = readJSON(pilotFile.path)
if (!isRecord(pilotValue) ||
	pilotValue.protocol !== 'l6' ||
	!isDeepStrictEqual(pilotValue.frozen, frozenFile) ||
	!isDeepStrictEqual(pilotValue.resource, resourceFile) ||
	!isDeepStrictEqual(pilotValue.fit, fitFile) ||
	!isMatrixAttempt(pilotValue.attempt))
	throw new Error('pilot manifest custody differs')

const attempt = pilotValue.attempt
const run = readAttempt(attempt)
if (run === undefined) throw new Error('pilot attempt has no decoded run')
let feasibilityError: string | undefined
try {
	verifyMatrixFeasibility(run)
} catch (error) {
	const message = error instanceof Error ? error.message : String(error)
	if (message !== 'operational matrix fault is not configuration infeasibility') throw error
	feasibilityError = message
}
if (run.execution.phase !== 'pilot' ||
	run.execution.arm !== 'aggregate' ||
	run.execution.copy !== 1 ||
	!isDeepStrictEqual(run.execution.frozen, frozenFile) ||
	!isDeepStrictEqual(run.execution.resource, resourceFile))
	throw new Error('pilot execution inputs differ')
const admitted = readExecution(attempt.execution.path)
if (!isDeepStrictEqual(admitted.execution, run.execution))
	throw new Error('emitted execution admission differs from raw pilot run')
if (!isDeepStrictEqual(run.execution.fit, fitFile))
	throw new Error('pilot released fit custody differs')

const exposed = run.rows.filter((row) => matchesMatrixExposure(run, row.goal)).length
const pairedFailures = listMatrixPairFailures(baseline, run)
const exposureMajority = exposed > run.rows.length / 2
const operational = feasibilityError !== undefined || attempt.failures.length > 0 || run.failures.length > 0
const accepted = !operational && pairedFailures.length === 0 && exposureMajority
const manifestFailures = Array.isArray(pilotValue.failures)
	? pilotValue.failures.filter((failure): failure is string => typeof failure === 'string')
	: []
const manifestDecision = {
	served: typeof pilotValue.served === 'number' ? pilotValue.served : undefined,
	exposed: typeof pilotValue.exposed === 'number' ? pilotValue.exposed : undefined,
	accepted: typeof pilotValue.accepted === 'boolean' ? pilotValue.accepted : undefined,
	failures: manifestFailures,
	consistentWithRun: pilotValue.served === run.rows.length &&
		pilotValue.exposed === exposed &&
		isDeepStrictEqual(manifestFailures, [...attempt.failures, ...pairedFailures, ...(!exposureMajority ? ['nonempty wire body exposure is not a majority of served development goals'] : [])]),
}

const roles = ['agent', 'judge', 'summarizer', 'flush']
const roleUsage = roles.map((role) => {
	const observations = run.requests.filter((request) => request.role === role)
	const sent = observations.filter((request) => request.sent)
	const unsent = observations.filter((request) => !request.sent)
	return {
		role,
		sent: sent.length,
		unsent: unsent.length,
		prompt: sent.reduce((total, request) => total + (request.prompt ?? 0), 0),
		completion: sent.reduce((total, request) => total + (request.completion ?? 0), 0),
		unknownUsage: sent.filter((request) => request.prompt === undefined || request.completion === undefined).length,
		failedRequests: observations.filter((request) => request.failures.length > 0).length,
		failureObservations: observations.reduce((total, request) => total + request.failures.length, 0),
		usageEvents: sent.map((request) => ({
			sequence: request.sequence,
			status: request.status,
			promptKnown: request.prompt !== undefined,
			completionKnown: request.completion !== undefined,
			prompt: request.prompt,
			completion: request.completion,
		})),
		unsentEvents: unsent.map((request) => ({
			sequence: request.sequence,
			status: request.status,
			failures: request.failures,
			error: request.error,
		})),
	}
})
const costs = measureMatrixCosts(run)
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim()
const build = readBuild()
const buildFile = hashFile(join(root, '.orkestrel', 'agent', 'instruments', 'harness', '.build', 'build-manifest.json'))
const deploymentFile = hashFile(frozen.deployment.path)
const expected = {
	head: 'ae7af6e946ec8117111a753ff9f37e2ed1bef59a',
	build: '0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc',
	frozen: '95da49bbb6f4811f2bcad63e87ace42c380ba15ceb5ee42c0bd113b509ac72a9',
	deployment: '40442197423b574b61548feb702b55c948d77f61dd719d9d6b26e24ad3016e19',
	resource: 'a4db9c340ad82e69b0f8b6b877ca4d330dac8d3375bb363e0378e58c96f1edcb',
	fit: '46f1bcf297ccd0989c20280f3e50bdaf692c8ab47b8d936487d6996eecd928a8',
}

const report = {
	validation: 'passed',
	qualification: {
		accepted,
		decision: operational ? 'operational_error_not_configuration_infeasibility' : accepted ? 'accepted' : 'valid_refusal',
		feasibilityValidationError: feasibilityError,
		expectedOperatorExit: operational ? 1 : accepted ? 0 : 3,
		served: run.rows.length,
		plannedFromRecordsResource: baseline.rows.length,
		exposed,
		majorityThreshold: run.rows.length / 2,
		attemptFailures: attempt.failures,
		runFailures: run.failures,
		pairedFailures,
		manifestDecision,
		requestFailures: run.requests.flatMap((request) => request.failures.length > 0 || request.error !== undefined
			? [{ sequence: request.sequence, goal: request.goal, role: request.role, sent: request.sent, status: request.status,
				started: request.started, finished: request.finished, duration: request.finished - request.started,
				wall: request.wall, failures: request.failures, error: request.error }]
			: []),
		rows: run.rows.map((row) => ({ goal: row.goal, success: row.success, partial: row.partial, error: row.error,
			sole: row.sole, wall: row.wall, stage: row.stage, flush: row.flush })),
		allFailures: [...attempt.failures, ...run.failures, ...pairedFailures],
	},
	requests: roleUsage,
	costs,
	preparationAndMaintenanceCosts: {
		metadata: costs.metadata,
		calibrationWire: costs.wire.filter((entry) => entry.phase === 'calibration'),
		judge: costs.judge,
		lineage: costs.lineage,
		elapsed: costs.elapsed,
	},
	trajectoryCosts: {
		wire: costs.wire.filter((entry) => entry.phase === 'trajectory'),
		stage: costs.stage,
		flush: costs.flush,
	},
	summaryWithholding: {
		applicable: false,
		reason: 'the emitted reader permits capped-summary withholding only for development-phase executions',
		withheldRequests: 0,
	},
	custody: {
		head,
		expected,
		matches: {
			head: head === expected.head,
			build: buildFile.hash === expected.build,
			frozen: frozenFile.hash === expected.frozen,
			deployment: deploymentFile.hash === expected.deployment,
			resource: resourceFile.hash === expected.resource,
			fit: fitFile.hash === expected.fit,
		},
		build: buildFile,
		buildMembership: { sources: build.sources.length, outputs: build.outputs.length, resources: build.resources.length },
		frozen: frozenFile,
		deployment: deploymentFile,
		resource: resourceFile,
		fit: fitFile,
		pilot: pilotFile,
		execution: hashFile(attempt.execution.path),
		run: hashFile(join(attempt.run, 'run.json')),
	},
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
