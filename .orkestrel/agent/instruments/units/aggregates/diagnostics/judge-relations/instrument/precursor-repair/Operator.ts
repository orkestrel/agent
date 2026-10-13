import type { ExecutionOptions, Packet, Reading } from './types.ts'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { AgentJudge, isJudgeQuestion } from '../../../.orkestrel/agent/instruments/harness/node_modules/@orkestrel/agent/dist/src/core/index.js'
import { createOllamaJudge, renderJudgeIdentity, renderJudgePrompt, MICA_RENDER_REVISION } from '../../../.orkestrel/agent/instruments/harness/.build/vendor/ollama/index.js'
import { AGREE_QUESTION } from '../../../.orkestrel/agent/instruments/harness/bench5/aggregates/constants.ts'
import { ATTEMPTS_HASH, BUILD, BUILD_HASH, CANDIDATE_ID, CAUSE_REPLACEMENT, CAUSE_TARGET, DAEMON, EVIDENCE_HASH, GENERATION, HARNESS, LABELS, LABELS_HASH, MANIFEST_HASH, PACKET, PACKET_HASH, REPAIR_TARGET, ROOT, SEQUENCE, SOURCE_SEPARATOR, UNIT, VARIANT_EDITS, VENDOR } from './constants.ts'
import { computeHash, computeOperator, computeReplay, describeDifference, extractRow, readArray, readBinding, readJSON, readNumber, readObject, readString, replaceTarget, validateExecution, writeArtifact } from './helpers.ts'
import { Recorder } from './Recorder.ts'

/** Prepares and executes only the frozen diagnostic sequence. */
export class Operator {
	#tags = 0

	/** Creates the diagnostic packet offline and refuses occupied preparation files. */
	prepare(): void {
		if (existsSync(PACKET) || existsSync(resolve(UNIT, 'plan-final.json'))) throw new Error('Preparation artifacts are occupied')
		const bindings = [readBinding(resolve(GENERATION, 'packet.jsonl'), PACKET_HASH), readBinding(LABELS, LABELS_HASH), readBinding(BUILD, BUILD_HASH), readBinding(resolve(GENERATION, 'manifest.json'), MANIFEST_HASH), readBinding(resolve(GENERATION, 'attempts.jsonl'), ATTEMPTS_HASH), readBinding(resolve(GENERATION, 'evidence.json'), EVIDENCE_HASH)]
		const row = extractRow(resolve(GENERATION, 'packet.jsonl'), CANDIDATE_ID)
		const attempt = extractRow(resolve(GENERATION, 'attempts.jsonl'), CANDIDATE_ID)
		const state = readString(row.state)
		const prose = readString(attempt.prose)
		const parts = state.split(SOURCE_SEPARATOR)
		const suffix = parts[1]
		if (parts.length !== 2 || suffix === undefined || parts[0] !== prose || attempt.state !== state) throw new Error('Candidate/state/source-separator join mismatch')
		const sources = readArray(row.sources)
		const ordered = sources.map(value => { const source = readObject(value); return `(${readString(source.day)}) ${readString(source.role)}: ${readString(source.text)}` }).join('\n')
		if (ordered !== suffix || JSON.stringify(row.question) !== JSON.stringify(AGREE_QUESTION)) throw new Error('Exact ordered sources or AGREE question mismatch')
		const labels = readObject(readJSON(LABELS))
		const settled = readArray(labels.labels).map(readObject).filter(label => label.id === CANDIDATE_ID)
		if (settled.length !== 1 || settled[0]?.verdict !== 'unsupported' || labels.packet !== PACKET_HASH || labels.attempts !== ATTEMPTS_HASH || labels.manifest !== MANIFEST_HASH) throw new Error('Settled original label binding mismatch')
		const evidence = readObject(readJSON(resolve(GENERATION, 'evidence.json')))
		const identities = new Set(readArray(evidence.judge).map(entry => readString(readObject(readObject(entry).row).model)))
		const identity = identities.values().next().value
		if (identities.size !== 1 || identity === undefined) throw new Error('Configured judge identity absent or inconsistent')
		const tuple = readArray(JSON.parse(identity))
		const [model, system, calibration, sampler, revision] = tuple
		if (tuple.length !== 5 || revision !== MICA_RENDER_REVISION) throw new Error('Retained rendering revision mismatch')
		const manifest = readObject(readJSON(resolve(GENERATION, 'manifest.json')))
		if (manifest.complete !== true || readArray(manifest.errors).length > 0) throw new Error('Generation manifest incomplete')
		const declared = readObject(readObject(manifest.matrix).judge)
		const options = readObject(sampler)
		const settings = readObject(declared.sampler)
		if (model !== declared.model || calibration !== settings.calibration || options.num_ctx !== 4096 || settings.num_ctx !== 4096 || options.num_predict !== 1 || options.temperature !== 1) throw new Error('Manifest judge settings mismatch')
		const judge = createOllamaJudge({ model: readString(model), system: readString(system), calibration: { temperature: readNumber(calibration) }, options, url: DAEMON, timeout: 300000 })
		if (!(judge instanceof AgentJudge) || judge.model !== identity || renderJudgeIdentity({ model: readString(model), system: readString(system), calibration: { temperature: readNumber(calibration) }, options }) !== identity) throw new Error('Emitted judge/superclass/identity mismatch')
		if (!isJudgeQuestion(row.question)) throw new Error('Malformed frozen question')
		const variants = VARIANT_EDITS.map(edit => ({ ...edit, candidate: edit.cause ? replaceTarget(edit.repair ? replaceTarget(prose, REPAIR_TARGET, '') : prose, CAUSE_TARGET, CAUSE_REPLACEMENT) : edit.repair ? replaceTarget(prose, REPAIR_TARGET, '') : prose, state: '' })).map(variant => ({ ...variant, state: `${variant.candidate}${SOURCE_SEPARATOR}${suffix}` }))
		replaceTarget(prose, REPAIR_TARGET, '')
		replaceTarget(prose, CAUSE_TARGET, CAUSE_REPLACEMENT)
		const rendering = variants.map(variant => {
			if (!isJudgeQuestion(row.question)) throw new Error('Malformed question')
			const body = judge.body({ state: variant.state, questions: { agree: row.question } })
			if (readObject(body).prompt !== renderJudgePrompt(variant.state, row.question, readString(system))) throw new Error('Vendor renderer mismatch')
			return { name: variant.name, body: JSON.stringify(body) }
		})
		for (const path of [resolve(HARNESS, 'vendor/ollama/index.js'), resolve(HARNESS, 'vendor/ollama/index.d.ts'), VENDOR, resolve(HARNESS, '.build/vendor/ollama/index.d.ts'), resolve(HARNESS, 'bench5/constants.ts'), resolve(HARNESS, 'bench5/aggregates/constants.ts'), resolve(HARNESS, 'bench5/JudgeCache.ts'), resolve(HARNESS, 'bench5/helpers.ts')]) bindings.push(readBinding(path))
		const require = createRequire(pathToFileURL(VENDOR))
		for (const name of ['@orkestrel/agent', '@orkestrel/contract', '@orkestrel/ndjson', '@orkestrel/budget', '@orkestrel/timeout']) {
			const packagepath = require.resolve(`${name}/package.json`)
			const packagevalue = readObject(readJSON(packagepath))
			const imports = readObject(readObject(readObject(packagevalue.exports)['.']).import)
			bindings.push(readBinding(packagepath), readBinding(resolve(dirname(packagepath), readString(imports.default))), readBinding(resolve(dirname(packagepath), readString(imports.types))))
		}
		const build = readObject(readJSON(BUILD))
		for (const binding of bindings.filter(binding => binding.path.includes('harness/vendor/ollama/') || binding.path.includes('harness/.build/vendor/ollama/') || binding.path.includes('harness/bench5/'))) {
			const collection = binding.path.includes('/.build/') ? readArray(build.outputs) : readArray(build.sources)
			const relativepath = binding.path.replace('.orkestrel/agent/instruments/harness/.build/', '').replace('.orkestrel/agent/instruments/harness/', '')
			const bound = collection.map(readObject).find(entry => entry.path === relativepath)
			if (bound === undefined || bound.hash !== binding.hash) throw new Error(`Canonical build binding mismatch: ${binding.path}`)
		}
		const packet: Packet = { id: CANDIDATE_ID, identity, digest: readString(declared.digest), question: row.question, separator: SOURCE_SEPARATOR, sources, suffix, sequence: SEQUENCE, variants, bindings, rendering }
		writeArtifact(PACKET, packet)
		writeArtifact(resolve(UNIT, 'plan-final.json'), { prepared: new Date().toISOString(), host: { platform: process.platform, node: process.version }, scope: 'Within-candidate relation-deletion sensitivity only; no classifier-quality or adoption verdict.', packet: readBinding(PACKET), build: BUILD_HASH, operator: computeOperator(), sequence: SEQUENCE, expectations: VARIANT_EDITS, original: { score: readObject(attempt.judge).score, label: settled[0] }, absent: ['historical wire/logprobs', 'historical installed superclass byte binding'], requests: { inference: SEQUENCE.length, tags: 2 }, execution: { explicit: true, sequential: true, retries: 0, directory: 'An explicitly supplied vacant descendant of this unit directory' }, accounting: { sources: sources.length, variants: variants.length, retained: bindings.length } })
		console.log(JSON.stringify({ prepared: true, packet: readBinding(PACKET), operator: computeOperator(), modelRequests: 0 }))
	}

	/** Runs the frozen sequence only after complete local custody validation. */
	async execute(options: ExecutionOptions): Promise<void> {
		const packet = validateExecution(options)
		const output = resolve(options.output)
		mkdirSync(output)
		const recorder = new Recorder(output)
		const controller = new AbortController()
		const readings: Reading[] = []
		let complete = false
		let failure: string | undefined
		this.#tags = 0
		const abort = controller.abort.bind(controller)
		process.once('SIGINT', abort)
		process.once('SIGTERM', abort)
		try {
			writeArtifact(resolve(output, 'custody.json'), { options, packet: readBinding(PACKET), operator: computeOperator(), bindings: packet.bindings, sequence: packet.sequence, host: { node: process.version, platform: process.platform }, at: new Date().toISOString() })
			const start = await this.#verifyDaemon(packet, output, 'start', controller.signal)
			const tuple = readArray(JSON.parse(packet.identity))
			const judge = createOllamaJudge({ model: readString(tuple[0]), system: readString(tuple[1]), calibration: { temperature: readNumber(tuple[2]) }, options: readObject(tuple[3]), url: DAEMON, timeout: 300000, fetch: recorder.fetch.bind(recorder) })
			if (!(judge instanceof AgentJudge) || judge.model !== packet.identity || !isJudgeQuestion(packet.question)) throw new Error('Frozen judge identity/question/superclass mismatch')
			for (const [index, name] of packet.sequence.entries()) {
				const variant = packet.variants.find(entry => entry.name === name)
				const frozen = packet.rendering.find(entry => entry.name === name)
				if (variant === undefined || frozen === undefined) throw new Error('Frozen sequence variant absent')
				const label = `${String(index + 1).padStart(2, '0')}-${name}`
				const body = JSON.stringify(judge.body({ state: variant.state, questions: { agree: packet.question } }))
				if (body !== frozen.body) throw new Error('Frozen runtime rendering mismatch')
				recorder.arm(label, body)
				const started = performance.now()
				const result = await judge.ask({ state: variant.state, questions: { agree: packet.question } }, controller.signal)
				writeArtifact(resolve(output, `${label}.normalized.json`), { result, wall: performance.now() - started })
				if (recorder.count !== index + 1 || recorder.response === undefined) throw new Error('Actual response accounting mismatch')
				const response = Buffer.from(recorder.response).toString('utf8')
				const raw = readObject(JSON.parse(response))
				writeArtifact(resolve(output, `${label}.wire-evidence.json`), { token: raw.response ?? 'absent', finish: raw.done_reason ?? 'absent', top: raw.logprobs ?? 'absent', usage: { prompt: raw.prompt_eval_count ?? 'absent', completion: raw.eval_count ?? 'absent' }, timing: { total: raw.total_duration ?? 'absent', load: raw.load_duration ?? 'absent', prompt: raw.prompt_eval_duration ?? 'absent', evaluation: raw.eval_duration ?? 'absent' } })
				const answer = result.answers.agree
				if (answer?.form !== 'noul' || result.model !== packet.identity || result.refusals?.agree !== undefined) throw new Error('Missing/malformed normalized Yes answer')
				const replay = computeReplay(raw, readNumber(tuple[2]))
				const difference = replay - answer.noul
				writeArtifact(resolve(output, `${label}.replay.json`), { replay, library: answer.noul, difference, token: raw.response ?? 'absent', finish: raw.done_reason ?? 'absent', top: raw.logprobs ?? 'absent', usage: { prompt: raw.prompt_eval_count ?? 'absent', completion: raw.eval_count ?? 'absent', normalized: result.usage ?? 'absent' }, timing: { total: raw.total_duration ?? 'absent', load: raw.load_duration ?? 'absent', prompt: raw.prompt_eval_duration ?? 'absent', evaluation: raw.eval_duration ?? 'absent' } })
				if (Math.abs(difference) > 1e-12) throw new Error('Independent arithmetic replay mismatch')
				if (raw.done !== true || typeof raw.response !== 'string' || typeof raw.done_reason !== 'string' || raw.eval_count !== 1 || result.usage === undefined || result.usage.prompt + result.usage.completion >= 4096) throw new Error('Incomplete, missing-usage, or capacity-bound response evidence')
				readings.push({ ordinal: index + 1, name, score: answer.noul, replay, difference, body, response, usage: result.usage, wall: performance.now() - started })
			}
			const end = await this.#verifyDaemon(packet, output, 'end', controller.signal)
			writeArtifact(resolve(output, 'daemon-comparison.json'), { start, end })
			for (const binding of packet.bindings) readBinding(resolve(ROOT, binding.path), binding.hash)
			if (computeOperator() !== options.operator) throw new Error('Operator changed during execution')
			readBinding(PACKET, options.packet)
			this.#describeReadings(readings, output)
			complete = true
		} catch (error) {
			failure = error instanceof Error ? error.message : String(error)
			throw error
		} finally {
			controller.abort()
			process.removeListener('SIGINT', abort)
			process.removeListener('SIGTERM', abort)
			writeArtifact(resolve(output, 'outcome.json'), { complete, failure: failure ?? 'absent', modelRequests: recorder.count, daemonChecks: this.#tags, completed: readings.length, readings, interpretation: complete ? 'Descriptive relation-deletion sensitivity only' : 'Incomplete measurement; never model infeasibility', at: new Date().toISOString() })
		}
	}

	async #verifyDaemon(packet: Packet, output: string, phase: string, signal: AbortSignal): Promise<unknown> {
		this.#tags += 1
		const response = await fetch(`${DAEMON}/api/tags`, { signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]), redirect: 'error' })
		const bytes = new Uint8Array(await response.arrayBuffer())
		writeFileSync(resolve(output, `daemon-${phase}.bin`), bytes, { flag: 'wx' })
		writeArtifact(resolve(output, `daemon-${phase}.json`), { status: response.status, hash: computeHash(bytes), body: Buffer.from(bytes).toString('utf8') })
		if (!response.ok) throw new Error('Daemon tag check transport failure')
		const models = readArray(readObject(JSON.parse(Buffer.from(bytes).toString('utf8'))).models).map(readObject)
		const model = readString(readArray(JSON.parse(packet.identity))[0])
		const matches = models.filter(entry => entry.name === model || entry.model === model)
		if (matches.length !== 1 || matches[0]?.digest !== packet.digest) throw new Error('Daemon judge tag/digest mismatch')
		return matches[0]
	}

	#describeReadings(readings: readonly Reading[], output: string): void {
		const original = readings[0]
		const repeated = readings[readings.length - 1]
		if (original === undefined || repeated === undefined) throw new Error('Empty readings')
		writeArtifact(resolve(output, 'analysis.json'), { states: VARIANT_EDITS.map(variant => { const values = readings.filter(reading => reading.name === variant.name); return { name: variant.name, expectation: variant.expectation, readings: values, difference: values[1] === undefined || values[0] === undefined ? 'absent' : values[1].score - values[0].score } }), original: { difference: repeated.score - original.score, request: describeDifference(original.body, repeated.body) }, paired: readings.filter(reading => reading.name !== 'original').map(reading => { const anchor = reading.ordinal <= 4 ? original : repeated; return { ordinal: reading.ordinal, name: reading.name, difference: reading.score - anchor.score, request: describeDifference(anchor.body, reading.body) } }), requests: readings.map(reading => ({ ordinal: reading.ordinal, name: reading.name, body: computeHash(reading.body), response: computeHash(reading.response) })), interpretation: 'Repeated measurements expose order/drift sensitivity; they are not independent validation samples. No cutoff fit or quality/adoption verdict.' })
	}
}
