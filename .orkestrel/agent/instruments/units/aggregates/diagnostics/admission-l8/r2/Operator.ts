import type { Binding, ExecutionOptions, Reading } from '../aggregate-judge-counterfactual/types.ts'
import type { RankingResult, ScreenPacket } from './types.ts'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { AgentJudge, isJudgeQuestion } from '../../../.orkestrel/agent/instruments/harness/node_modules/@orkestrel/agent/dist/src/core/index.js'
import { createOllamaJudge, MICA_RENDER_REVISION, renderJudgePrompt } from '../../../.orkestrel/agent/instruments/harness/.build/vendor/ollama/index.js'
import { BUILD, BUILD_HASH, DAEMON, HARNESS, ROOT, VENDOR } from '../aggregate-judge-counterfactual/constants.ts'
import { computeHash, computeReplay, readArray, readBinding, readJSON, readNumber, readObject, readPacket, readString, writeArtifact } from '../aggregate-judge-counterfactual/helpers.ts'
import { Recorder } from '../aggregate-judge-counterfactual/Recorder.ts'
import { Completion } from '../aggregate-judge-counterfactual/Completion.ts'
import { NetworkWitness } from '../aggregate-judge-counterfactual/NetworkWitness.ts'
import { EMITTED_FILES, PACKET, PREDECESSOR, PREDECESSOR_HASH, REUSED_FILES, SEQUENCE, SPECIFICATION, SPECIFICATION_HASH, UNIT } from './constants.ts'
import { computeOperator, computeRanking, renderState, validateDestination, validateExecution, validatePopulation } from './helpers.ts'

/** Prepares and executes the frozen local discrimination screen. */
export class Operator {
	#tags = 0
	#dispatches = 0

	/** Prepares exact requests under a rejecting global-fetch guard.
	 * @param output - The create-only artifact destination inside the owned directory
	 * @returns Nothing after writing the frozen packet and preparation plan
	 * @example new Operator().prepare()
	 */
	prepare(output: string = UNIT): void {
		const fetch = globalThis.fetch
		const witness = new NetworkWitness()
		globalThis.fetch = this.#refuseFetch.bind(this)
		this.#dispatches = 0
		try {
			const packetpath = resolve(output, 'packet-final.json')
			const planpath = resolve(output, 'plan-final.json')
			if (resolve(output) !== UNIT) validateDestination(output)
			if (existsSync(packetpath) || existsSync(planpath) || (output !== UNIT && existsSync(output))) throw new Error('Preparation artifacts are occupied')
			const specification = readBinding(SPECIFICATION, SPECIFICATION_HASH)
			const predecessor = readBinding(PREDECESSOR, PREDECESSOR_HASH)
			readBinding(BUILD, BUILD_HASH)
			const original = readPacket(readJSON(PREDECESSOR))
			const spec = readObject(readJSON(SPECIFICATION))
			if (spec.revision !== 'l8' || JSON.stringify(readObject(spec.screen).sequence) !== JSON.stringify(SEQUENCE) || !isJudgeQuestion(spec.question)) throw new Error('Frozen specification mismatch')
			const tuple = readArray(JSON.parse(original.identity))
			if (tuple.length !== 5 || tuple[4] !== MICA_RENDER_REVISION) throw new Error('Frozen identity revision mismatch')
			const judge = createOllamaJudge({ model: readString(tuple[0]), system: readString(tuple[1]), calibration: { temperature: readNumber(tuple[2]) }, options: readObject(tuple[3]), url: DAEMON, timeout: 300000 })
			if (!(judge instanceof AgentJudge) || judge.model !== original.identity) throw new Error('Installed judge identity mismatch')
			const variants = original.variants.map(variant => ({ ...variant, state: renderState(original.sources, variant.candidate) }))
			const question = spec.question
			const rendering = variants.map(variant => {
				const body = judge.body({ state: variant.state, questions: { agree: question } })
				if (readObject(body).prompt !== renderJudgePrompt(variant.state, question, readString(tuple[1]))) throw new Error('Actual emitted renderer mismatch')
				return { name: variant.name, body: JSON.stringify(body) }
			})
			const bindings: Binding[] = original.bindings.map(binding => readBinding(resolve(ROOT, binding.path), binding.hash))
			bindings.push(specification, predecessor)
			for (const name of REUSED_FILES) bindings.push(readBinding(resolve(UNIT, '../aggregate-judge-counterfactual', name)))
			const build = readObject(readJSON(BUILD))
			for (const name of EMITTED_FILES) {
				const declared = readArray(build.outputs).map(readObject).find(entry => entry.path === name)
				if (declared === undefined) throw new Error(`Emitted runtime missing from frozen build: ${name}`)
				bindings.push(readBinding(resolve(HARNESS, '.build', name), readString(declared.hash)))
			}
			this.#bindDependencies(bindings)
			const packet: ScreenPacket = { ...original, specification, predecessor, operator: computeOperator(), question, variants, bindings: [...new Map(bindings.map(binding => [binding.path, binding])).values()], rendering }
			validatePopulation(packet, original)
			if (resolve(output) !== UNIT) mkdirSync(output)
			writeArtifact(packetpath, packet)
			if (this.#dispatches !== 0 || witness.count !== 0) throw new Error('Offline preparation dispatched a request')
			writeArtifact(planpath, { packet: readBinding(packetpath), build: BUILD_HASH, operator: packet.operator, specification, predecessor, sequence: SEQUENCE, host: { platform: process.platform, node: process.version }, requests: { inference: SEQUENCE.length, daemon: 2, retries: 0 }, guard: { dispatches: this.#dispatches, native: witness.count }, interpretation: 'Local discrimination only; no classifier accuracy, cutoff fitting, or adoption verdict.' })
			console.log(JSON.stringify({ prepared: true, packet: readBinding(packetpath), operator: packet.operator, dispatches: this.#dispatches, modelRequests: 0 }))
		} finally {
			globalThis.fetch = fetch
			console.log(`Offline global-fetch guard dispatches: ${this.#dispatches}; native dispatches: ${witness.count}`)
			witness.close()
		}
	}

	/** Imports the execution entry under a refusing global-fetch guard.
	 * @returns Nothing after reporting global and native dispatch counts
	 * @example await new Operator().inspect()
	 */
	async inspect(): Promise<void> {
		const fetch = globalThis.fetch
		const witness = new NetworkWitness()
		this.#dispatches = 0
		globalThis.fetch = this.#refuseFetch.bind(this)
		try { await import('./main.ts') }
		finally {
			globalThis.fetch = fetch
			console.log(`Offline global-fetch guard dispatches: ${this.#dispatches}; native dispatches: ${witness.count}`)
			witness.close()
		}
	}

	/** Executes only after complete local custody validation.
	 * @param options - Exact packet, build, and operator hashes with a vacant owned output
	 * @returns Nothing after persisting complete ranking or incomplete execution evidence
	 * @example await new Operator().execute({ packet: 'HASH', build: 'HASH', operator: 'HASH', output: 'DIRECTORY' })
	 */
	async execute(options: ExecutionOptions): Promise<void> {
		const packet = validateExecution(options)
		const output = resolve(options.output)
		mkdirSync(output)
		const recorder = new Recorder(output)
		const controller = new AbortController()
		const readings: Reading[] = []
		let complete = false
		let failure: string | undefined
		let ranking: RankingResult = { status: 'incomplete', comparisons: [] }
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
				const request = { state: variant.state, questions: { agree: packet.question } }
				const body = JSON.stringify(judge.body(request))
				if (body !== frozen.body) throw new Error('Frozen runtime rendering mismatch')
				recorder.arm(label, body)
				const started = performance.now()
				const result = await new Completion({ output, label, capture: recorder }).execute(() => judge.ask(request, controller.signal))
				if (recorder.count !== index + 1 || recorder.response === undefined) throw new Error('Actual response accounting mismatch')
				const response = Buffer.from(recorder.response).toString('utf8')
				const raw = readObject(JSON.parse(response))
				const answer = result.answers.agree
				if (answer?.form !== 'noul' || result.model !== packet.identity || result.refusals?.agree !== undefined) throw new Error('Missing/malformed normalized Yes answer')
				const replay = computeReplay(raw, readNumber(tuple[2]))
				const score = readNumber(answer.noul)
				const difference = replay - score
				writeArtifact(resolve(output, `${label}.replay.json`), { replay, library: score, difference, token: raw.response, finish: raw.done_reason, top: raw.logprobs, usage: { prompt: raw.prompt_eval_count, completion: raw.eval_count, normalized: result.usage }, timing: { total: raw.total_duration, load: raw.load_duration, prompt: raw.prompt_eval_duration, evaluation: raw.eval_duration } })
				if (Math.abs(difference) > 1e-12 || score < 0 || score > 1) throw new Error('Independent arithmetic replay mismatch')
				if (raw.done !== true || typeof raw.response !== 'string' || typeof raw.done_reason !== 'string' || raw.eval_count !== 1 || result.usage === undefined || result.usage.prompt + result.usage.completion >= 4096) throw new Error('Incomplete, missing-usage, or capacity-bound response evidence')
				readings.push({ ordinal: index + 1, name, score, replay, difference, body, response, usage: result.usage, wall: performance.now() - started })
			}
			const end = await this.#verifyDaemon(packet, output, 'end', controller.signal)
			writeArtifact(resolve(output, 'daemon-comparison.json'), { start, end })
			for (const binding of packet.bindings) readBinding(resolve(ROOT, binding.path), binding.hash)
			if (computeOperator() !== options.operator) throw new Error('Operator changed during execution')
			readBinding(PACKET, options.packet)
			ranking = computeRanking(readings)
			writeArtifact(resolve(output, 'ranking.json'), ranking)
			complete = true
		} catch (error) {
			failure = error instanceof Error ? error.message : String(error)
			throw error
		} finally {
			controller.abort()
			process.removeListener('SIGINT', abort)
			process.removeListener('SIGTERM', abort)
			writeArtifact(resolve(output, 'outcome.json'), { complete, status: complete ? ranking.status : 'incomplete', ...(failure === undefined ? {} : { failure }), modelRequests: recorder.count, daemonChecks: this.#tags, completed: readings.length, readings, ranking, interpretation: complete ? 'Complete local screen; failed ordering refuses the method.' : 'Incomplete measurement; no method ruling.', at: new Date().toISOString() })
		}
	}

	#refuseFetch(): Promise<Response> {
		this.#dispatches += 1
		return Promise.reject(new Error('Offline preparation refuses global fetch'))
	}

	#bindDependencies(bindings: Binding[]): void {
		const queue = [{ origin: VENDOR, name: '@orkestrel/agent' }, { origin: VENDOR, name: '@orkestrel/ndjson' }]
		const visited = new Set<string>()
		for (const dependency of queue) {
			const require = createRequire(pathToFileURL(dependency.origin))
			const packagepath = require.resolve(`${dependency.name}/package.json`)
			if (visited.has(packagepath)) continue
			visited.add(packagepath)
			const packagevalue = readObject(readJSON(packagepath))
			const exported = readObject(readObject(packagevalue.exports)['.'])
			const imports = exported.import
			const entry = resolve(dirname(packagepath), typeof imports === 'string' ? imports : readString(readObject(imports).default))
			const declaration = typeof imports === 'string' ? readString(exported.types) : readString(readObject(imports).types)
			bindings.push(readBinding(packagepath), readBinding(entry), readBinding(resolve(dirname(packagepath), declaration)))
			if (packagevalue.dependencies !== undefined) for (const name of Object.keys(readObject(packagevalue.dependencies))) queue.push({ origin: entry, name })
		}
	}

	async #verifyDaemon(packet: ScreenPacket, output: string, phase: string, signal: AbortSignal): Promise<unknown> {
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
}
