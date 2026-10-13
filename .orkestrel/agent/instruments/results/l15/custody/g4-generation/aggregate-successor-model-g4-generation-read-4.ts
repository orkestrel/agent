import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { readJSON, readRows } from '../../.orkestrel/agent/instruments/harness/.build/bench5/helpers.js'
import { hashFile, readRefitCosts, verifyCorpus, verifyEvidence, verifyFiles } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'
import { isRefitControl, isRefitEvidence, isRefitGeneration, isRefitItem } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/validators.js'
import { readAttempts, readCorpus } from '../../.orkestrel/agent/instruments/harness/.build/bench5/tests/refit/helpers.js'
import { buildRefitItem } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'
import { createOllamaJudge } from '../../.orkestrel/agent/instruments/harness/.build/vendor/ollama/index.js'
import { MICA_CALIBRATION, MICA_CONTEXT, MICA_MODEL, MICA_SYSTEM } from '../../.orkestrel/agent/instruments/harness/.build/bench5/constants.js'
import { readFrozen } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'

const root = resolve('.orkestrel/agent/instruments/results/l15')
const corpusDirectory = resolve(root, 'calibration/g4/corpus')
const generationDirectory = resolve(root, 'calibration/g4/generation')
const corpusPath = resolve(corpusDirectory, 'corpus.json')
const generationPath = resolve(generationDirectory, 'manifest.json')
const attemptsPath = resolve(generationDirectory, 'attempts.jsonl')
const packetPath = resolve(generationDirectory, 'packet.jsonl')
const corpus = readCorpus(corpusDirectory)
verifyCorpus(corpus)
const corpusManifest = readJSON(resolve(corpusDirectory, 'manifest.json'))
const attempts = readAttempts(generationDirectory)
const packetRows = readRows(packetPath)
const manifestValue = readJSON(generationPath)
if (!isRefitGeneration(manifestValue)) throw new Error('invalid generation manifest')
const manifest = manifestValue
if (!manifest.complete || manifest.errors.length !== 0) throw new Error('generation is incomplete or has errors')
if (manifest.matrix === undefined || !isDeepStrictEqual(manifest.matrix, readFrozen(hashFile(resolve(root, 'g4-think0/freeze/manifest.json')))))
	throw new Error('generation freeze binding differs')
if (manifest.corpus !== hashFile(corpusPath).hash || manifest.attempts !== hashFile(attemptsPath).hash || manifest.packet !== hashFile(packetPath).hash)
	throw new Error('generation output hashes differ from manifest')
if (typeof corpusManifest !== 'object' || corpusManifest === null || !('corpus' in corpusManifest) || corpusManifest.corpus !== manifest.corpus)
	throw new Error('corpus manifest binding differs')
verifyFiles([...manifest.files, ...corpus.files, manifest.evidence, manifest.controls])
const evidence = readJSON(manifest.evidence.path)
if (!isRefitEvidence(evidence)) throw new Error('invalid retained evidence')
const controls = readRows(manifest.controls.path)
if (!controls.every(isRefitControl)) throw new Error('invalid retained control rows')
verifyEvidence(attempts, evidence, manifest, createOllamaJudge({
	model: MICA_MODEL,
	system: MICA_SYSTEM,
	calibration: { temperature: MICA_CALIBRATION },
	options: { num_ctx: MICA_CONTEXT }
}).model, controls)
const packet = packetRows.filter(isRefitItem)
if (packet.length !== packetRows.length || attempts.length !== packet.length || new Set(attempts.map((attempt) => attempt.id)).size !== attempts.length || new Set(packet.map((item) => item.id)).size !== packet.length)
	throw new Error('attempt and packet membership differs')
const packetById = new Map(packet.map((item) => [item.id, item]))
for (const attempt of attempts) {
	const context = corpus.contexts.find((entry) => entry.id === attempt.context)
	if (context === undefined) throw new Error('attempt references an unknown context')
	const item = packetById.get(attempt.id)
	if (item === undefined || !isDeepStrictEqual(item, buildRefitItem(attempt, context)))
		throw new Error('packet item does not match its source attempt')
}
const contextsCovered = new Set(attempts.map((attempt) => attempt.context)).size
if (contextsCovered !== corpus.contexts.length) throw new Error('attempts do not cover every corpus occurrence')
const costs = readRefitCosts(attempts, manifest)
const costFailures = costs.failures
if (costFailures.length !== 0) throw new Error('generation costs contain unmeasured request boundaries')
const packetFile = hashFile(packetPath)
const attemptFile = hashFile(attemptsPath)
const generationFile = hashFile(generationPath)
process.stdout.write(`${JSON.stringify({
	corpus: { hash: hashFile(corpusPath).hash, contexts: corpus.contexts.length, points: corpus.points.length },
	generation: { hash: generationFile.hash, complete: manifest.complete, errors: manifest.errors.length },
	attempts: { hash: attemptFile.hash, bytes: statSync(attemptsPath).size, count: attempts.length, sent: attempts.filter((attempt) => attempt.sent === true).length, unsent: attempts.filter((attempt) => attempt.sent === false).length, unmeasured: attempts.filter((attempt) => attempt.sent === undefined).length, errors: attempts.filter((attempt) => attempt.error !== undefined).length },
	packet: { hash: packetFile.hash, bytes: statSync(packetPath).size, count: packet.length, exactAttemptJoin: true },
	coverage: { contexts: contextsCovered, expectedContexts: corpus.contexts.length, allOccurrencesCovered: true },
	evidence: { hash: manifest.evidence.hash, controls: controls.length, cacheSummaryRows: evidence.summary.length, cacheJudgeRows: evidence.judge.length },
	costs,
	modelIdentityWithheld: true
}, null, 2)}\n`)

