// Keeps the saved-predicate reading self-contained; writes no policy, execution, cache, or run.
import type { RefitFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/types.js'
import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { readJSON } from '../../.orkestrel/agent/instruments/harness/.build/bench5/helpers.js'
import { readFrozen } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'
import { isMatrixDevelopment } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/validators.js'
import { hashFile, readRefitAssessment, selectMajorityCutoff } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'
import { isRefitGeneration } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/validators.js'

const started = Date.now()
if (resolve(process.cwd()) !== resolve('C:/Users/mikes/WebstormProjects/scaffold')) throw new Error('Explicit scaffold cwd required')
const policyFile = hashFile(resolve('.orkestrel/agent/instruments/results/l15/g4-think0/exploration/policy.json'))
const policy = readJSON(policyFile.path)
if (!isMatrixDevelopment(policy)) throw new Error('Saved policy contract differs')
const calibration = readFrozen(policy.calibration)
const assessment = readRefitAssessment(policy.diagnosis)
const generation = readJSON(policy.generation.path)
const predicates = [
	{ predicate: 'assessment.accepted', rejects: assessment.accepted },
	{ predicate: 'assessment.errors.length !== 0', rejects: assessment.errors.length !== 0 },
	{ predicate: '!isDeepStrictEqual(assessment.preparation.manifest, policy.generation)', rejects: !isDeepStrictEqual(assessment.preparation.manifest, policy.generation) },
	{ predicate: '!isDeepStrictEqual(assessment.preparation.packet, policy.packet)', rejects: !isDeepStrictEqual(assessment.preparation.packet, policy.packet) },
	{ predicate: '!isDeepStrictEqual(assessment.preparation.labels, policy.labels)', rejects: !isDeepStrictEqual(assessment.preparation.labels, policy.labels) },
	{ predicate: '!isRefitGeneration(generation)', rejects: !isRefitGeneration(generation) },
]
if (!isRefitGeneration(generation)) throw new Error('Unexpected generation predicate failure')
predicates.push(
	{ predicate: '!generation.complete', rejects: !generation.complete },
	{ predicate: 'generation.errors.length !== 0', rejects: generation.errors.length !== 0 },
	{ predicate: 'generation.sustained !== undefined', rejects: generation.sustained !== undefined },
	{ predicate: '!isDeepStrictEqual(generation.matrix, calibration)', rejects: !isDeepStrictEqual(generation.matrix, calibration) },
	{ predicate: 'generation.model !== calibration.summarizer.model', rejects: generation.model !== calibration.summarizer.model },
	{ predicate: '!isDeepStrictEqual(generation.settings, calibration.configuration)', rejects: !isDeepStrictEqual(generation.settings, calibration.configuration) },
	{ predicate: 'assessment.change !== policy.change', rejects: assessment.change !== policy.change },
	{ predicate: 'selectMajorityCutoff(assessment) !== policy.agree', rejects: selectMajorityCutoff(assessment) !== policy.agree },
)
const references = [
	{ name: 'generation', retained: assessment.preparation.manifest, sealed: policy.generation },
	{ name: 'packet', retained: assessment.preparation.packet, sealed: policy.packet },
	{ name: 'labels', retained: assessment.preparation.labels, sealed: policy.labels },
].map(reference => ({
	...reference,
	exact: isDeepStrictEqual(reference.retained, reference.sealed),
	hash: reference.retained.hash === reference.sealed.hash,
	resolved: resolve(reference.retained.path) === resolve(reference.sealed.path),
	actual: hashFile(reference.sealed.path),
	corrected: isDeepStrictEqual(reference.retained, reference.retained),
}))
for (const reference of references) {
	if (!reference.hash || !reference.resolved || reference.actual.hash !== reference.retained.hash || reference.exact || !reference.corrected) throw new Error(`Unexpected G4 reference identity: ${reference.name}`)
}
const failing = predicates.filter(predicate => predicate.rejects)
if (failing.length !== 3 || failing.some(predicate => !predicate.predicate.startsWith('!isDeepStrictEqual(assessment.preparation.'))) throw new Error('Unexpected predicate beyond calibration reference spelling')
const q2Diagnosis = hashFile(resolve('.orkestrel/agent/instruments/results/l15/calibration/q2/fit-2/diagnosis.json'))
if (q2Diagnosis.hash !== '626ac28ed56f4b0f1e1ce51ff2ebdece035ba2760ce532c551642c74d89fc5ca') throw new Error('Q2 diagnosis seal differs')
const q2 = readRefitAssessment(q2Diagnosis)
const q2References: readonly { readonly name: string; readonly retained: RefitFile; readonly sealed: RefitFile }[] = [
	{ name: 'generation', retained: q2.preparation.manifest, sealed: { path: resolve('.orkestrel/agent/instruments/results/l15/calibration/q2/generation/manifest.json'), hash: '10e654ee24fe25b7a32af7e8f6610467154a8c1c5cc65dcbeeb2c6335e722d23' } },
	{ name: 'packet', retained: q2.preparation.packet, sealed: { path: resolve('.orkestrel/agent/instruments/results/l15/calibration/q2/generation/packet.jsonl'), hash: 'a67c510650eaa2ffae29fe5c461fcf56d4cd91e9e3376a3ac4b5fba2b3c14999' } },
	{ name: 'labels', retained: q2.preparation.labels, sealed: { path: resolve('.orkestrel/agent/instruments/results/l15/calibration/q2/labels.json'), hash: 'ae937346c5e0abdc1b4543511b171e93ec117f795b90b9fd93af87e67b53f661' } },
]
for (const reference of q2References) {
	if (reference.retained.hash !== reference.sealed.hash || resolve(reference.retained.path) !== resolve(reference.sealed.path) || hashFile(reference.sealed.path).hash !== reference.sealed.hash) throw new Error(`Unexpected Q2 reference identity: ${reference.name}`)
}
if (q2.accepted || q2.errors.length !== 0 || q2.change !== 0.56 || selectMajorityCutoff(q2) !== 0.68) throw new Error('Unexpected Q2 exploratory predicate')
process.stdout.write(`${JSON.stringify({ policyFile, diagnosis: policy.diagnosis, predicates, failing, references, q2: { diagnosis: q2Diagnosis, accepted: q2.accepted, errors: q2.errors, change: q2.change, agree: selectMajorityCutoff(q2), references: q2References }, durationMs: Date.now() - started, coverage: 'Exact saved G4 cutoff/fresh-calibration block and G4/Q2 sealed reference identity only; no materialization or later development-admission claim.' }, null, 2)}\n`)
