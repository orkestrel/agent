import { isRecord } from '@orkestrel/contract'
import { readJSON } from '../../.orkestrel/agent/instruments/harness/.build/bench5/helpers.js'
import { readAttempt, readRequestOutcome, isStoppedRequest } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'
import { isMatrixAttempt } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/validators.js'
import { hashFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'
import { isRefitFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/validators.js'
import { readPilotFeasibility } from '../../.orkestrel/agent/instruments/harness/.build/bench5/sustained/helpers.js'

const pilotPath = '.orkestrel/agent/instruments/results/l15/q4-think0/pilot/manifest.json'
const pilot = readJSON(pilotPath)
if (!isRecord(pilot) ||
	pilot.protocol !== 'l6' ||
	!isRefitFile(pilot.frozen) ||
	!isRefitFile(pilot.resource) ||
	!isRefitFile(pilot.fit) ||
	!isMatrixAttempt(pilot.attempt) ||
	typeof pilot.served !== 'number' ||
	typeof pilot.exposed !== 'number' ||
	typeof pilot.accepted !== 'boolean' ||
	!Array.isArray(pilot.failures) ||
	!pilot.failures.every((failure) => typeof failure === 'string'))
	throw new Error('retained pilot manifest failed existing shape guards')

const frozenReference = pilot.frozen
const resourceReference = pilot.resource
const reference = hashFile(pilotPath)
let feasibility: { readonly returned: true; readonly value: boolean } | { readonly returned: false; readonly error: string }
try {
	feasibility = { returned: true, value: readPilotFeasibility(reference, pilot.frozen, pilot.resource) }
} catch (error) {
	feasibility = { returned: false, error: error instanceof Error ? error.message : String(error) }
}

const run = readAttempt(pilot.attempt)
if (run === undefined)
	throw new Error('retained attempt decoded no raw run')

const sequences = [302, 315]
const failed = sequences.map((sequence) => {
	const request = run.requests.find((entry) => entry.sequence === sequence)
	if (request === undefined)
		throw new Error(`retained run has no request sequence ${sequence}`)
	return {
		role: request.role,
		sequence: request.sequence,
		error: request.error,
		status: request.status,
		stopped: isStoppedRequest(request, run.requests),
		outcome: readRequestOutcome(request, run.execution.budget, run.frozen),
	}
})

const inputFiles = [reference, pilot.frozen, pilot.resource, pilot.fit, pilot.attempt.execution, ...pilot.attempt.files]
const uniqueInputFiles = [...new Map(inputFiles.map((file) => [file.path, file])).values()]
const output = {
	shapeGuards: {
		manifestRecord: true,
		frozen: isRefitFile(pilot.frozen),
		resource: isRefitFile(pilot.resource),
		fit: isRefitFile(pilot.fit),
		attempt: isMatrixAttempt(pilot.attempt),
		frozenReferencePreserved: pilot.frozen === frozenReference,
		resourceReferencePreserved: pilot.resource === resourceReference,
	},
	feasibility,
	decoded: { status: run.status, requestCount: run.requests.length },
	failed,
	references: { frozen: pilot.frozen, resource: pilot.resource },
	hashes: uniqueInputFiles.map(({ path }) => hashFile(path)),
}
process.stdout.write(`${JSON.stringify(output)}\n`)
