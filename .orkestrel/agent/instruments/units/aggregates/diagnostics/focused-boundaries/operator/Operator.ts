import type { AgentJudge as NativeJudge } from '../../../.orkestrel/agent/instruments/harness/node_modules/@orkestrel/agent/dist/src/core/index.js'
import type { Binding, ExecutionOptions } from '../aggregate-judge-counterfactual/types.ts'
import type { BoundaryReading, RankingResult, ScreenPacket } from './types.ts'
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
import { EMITTED_FILES, FOCUSED, FOCUSED_HASH, LABELS, LABELS_HASH, OPERATOR_FILES, PACKET, POPULATION, POPULATION_HASH, PREDECESSOR, PREDECESSOR_HASH, REUSED_FILES, SPECIFICATION, SPECIFICATION_HASH, UNIT } from './constants.ts'
import { buildChecks, buildComposition, buildSequence, computeOperator, computeRanking, validateDestination, validateExecution, validatePopulation } from './helpers.ts'

/** Prepares and executes the frozen complete-candidate boundary screen. */
export class Operator {
	#tags = 0
	#dispatches = 0

	/** Prepares exact complete requests under refusing dispatch witnesses.
	 * @param output - A create-only preparation destination inside the owned unit
	 * @returns Nothing after retaining immutable packet and plan evidence
	 * @example new Operator().prepare()
	 */
	prepare(output: string = dirname(PACKET)): void {
		const fetch = globalThis.fetch
		const witness = new NetworkWitness()
		globalThis.fetch = this.#refuseFetch.bind(this)
		this.#dispatches = 0
		try {
			const packetpath = resolve(output, 'packet-final.json')
			const planpath = resolve(output, 'plan-final.json')
			if (resolve(output) !== UNIT) validateDestination(output)
			if (existsSync(packetpath) || existsSync(planpath)) throw new Error('Preparation artifacts are occupied')
			const bindings = this.#collectBindings()
			const predecessor = readPacket(readJSON(PREDECESSOR))
			if (!isJudgeQuestion(predecessor.question)) throw new Error('Frozen guard question malformed')
			const composition = buildComposition(readJSON(POPULATION), readJSON(LABELS), readJSON(SPECIFICATION))
			const checks = buildChecks(composition, predecessor.question)
			const sequence = buildSequence(checks)
			const judge = this.#createJudge(predecessor.identity)
			const system = readString(readArray(JSON.parse(predecessor.identity))[1])
			const rendering = checks.map(check => {
				const body = judge.body({ state: check.state, questions: { agree: check.question } })
				if (readObject(body).prompt !== renderJudgePrompt(check.state, check.question, system)) throw new Error('Actual emitted renderer mismatch')
				return { name: check.name, body: JSON.stringify(body) }
			})
			const packet: ScreenPacket = { ...composition, guard: predecessor.question, identity: predecessor.identity, digest: predecessor.digest, checks, sequence, rendering, bindings, operator: computeOperator() }
			validatePopulation(packet)
			const sizes = rendering.map(entry => {
				const body = readObject(JSON.parse(entry.body))
				const prompt = readString(body.prompt)
				const options = readObject(body.options)
				if (options.num_predict !== 1 || options.num_ctx !== 4096) throw new Error('Frozen native context/completion mismatch')
				return { name: entry.name, body: { bytes: Buffer.byteLength(entry.body, 'utf8'), units: entry.body.length }, prompt: { bytes: Buffer.byteLength(prompt, 'utf8'), units: prompt.length }, context: options.num_ctx, completion: options.num_predict }
			})
			if (this.#dispatches !== 0 || witness.count !== 0) throw new Error('Offline preparation dispatched a request')
			if (resolve(output) !== UNIT) mkdirSync(output)
			writeArtifact(packetpath, packet)
			writeArtifact(planpath, { packet: readBinding(packetpath), build: BUILD_HASH, operator: packet.operator, inputs: bindings, sequence, membership: checks.map(check => ({ name: check.name, row: check.row, category: check.category, focus: check.focus, label: check.label })), sizes, counts: { rows: packet.rows.length, spans: packet.rows.reduce((count, row) => count + row.spans.length, 0), guards: packet.rows.length, forward: checks.length, reverse: checks.length, total: sequence.length }, ceilings: { inference: sequence.length, daemon: 2, retries: 0, body: Math.max(...sizes.map(size => size.body.bytes)), prompt: Math.max(...sizes.map(size => size.prompt.bytes)) }, fit: 'Offline token fit is unproved; complete sources and candidates must remain unchanged.', host: { platform: process.platform, node: process.version }, dispatches: { global: this.#dispatches, native: witness.count }, interpretation: 'Offline preparation only; no inference, threshold fitting, qualification, or adoption ruling.' })
			console.log(JSON.stringify({ prepared: true, packet: readBinding(packetpath), operator: packet.operator, checks: checks.length, requests: sequence.length, dispatches: this.#dispatches, native: witness.count }))
		} finally {
			globalThis.fetch = fetch
			console.log(`Offline global-fetch guard dispatches: ${this.#dispatches}; native dispatches: ${witness.count}`)
			witness.close()
		}
	}

	/** Inspects default invocation under global and native dispatch witnesses.
	 * @returns Nothing after reporting offline dispatch counts
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

	/** Executes only after exact local request and runtime custody admission.
	 * @param options - Exact hashes and a vacant owned output destination
	 * @returns Nothing after retaining complete or incomplete-prefix evidence
	 * @example await new Operator().execute({ packet: 'HASH', build: 'HASH', operator: 'HASH', output: 'DIRECTORY' })
	 */
	async execute(options: ExecutionOptions): Promise<void> {
		const packet = validateExecution(options)
		if (JSON.stringify(packet.bindings) !== JSON.stringify(this.#collectBindings())) throw new Error('Frozen dependency/source closure mismatch')
		const admission = this.#createJudge(packet.identity)
		for (const [index, check] of packet.checks.entries()) if (JSON.stringify(admission.body({ state: check.state, questions: { agree: check.question } })) !== packet.rendering[index]?.body) throw new Error('Frozen exact request mismatch before output creation')
		const output = resolve(options.output)
		mkdirSync(output)
		const recorder = new Recorder(output)
		const controller = new AbortController()
		const readings: BoundaryReading[] = []
		let complete = false
		let failure: string | undefined
		let ranking: RankingResult = computeRanking(packet, readings)
		this.#tags = 0
		const abort = controller.abort.bind(controller)
		process.once('SIGINT', abort)
		process.once('SIGTERM', abort)
		try {
			writeArtifact(resolve(output, 'custody.json'), { options, packet: readBinding(PACKET), operator: computeOperator(), bindings: packet.bindings, sequence: packet.sequence, host: { node: process.version, platform: process.platform }, at: new Date().toISOString() })
			const start = await this.#verifyDaemon(packet, output, 'start', controller.signal)
			const judge = this.#createJudge(packet.identity, recorder)
			const tuple = readArray(JSON.parse(packet.identity))
			for (const [index, entry] of packet.sequence.entries()) {
				const check = packet.checks.find(value => value.name === entry.name)
				const frozen = packet.rendering.find(value => value.name === entry.name)
				if (check === undefined || frozen === undefined) throw new Error('Frozen atomic request absent')
				const label = `${String(entry.ordinal).padStart(2, '0')}-${entry.pass}-${entry.name}`
				const request = { state: check.state, questions: { agree: check.question } }
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
				readings.push({ ...entry, row: check.row, label: check.label, score, replay, difference, body, response, usage: result.usage, wall: performance.now() - started })
			}
			const end = await this.#verifyDaemon(packet, output, 'end', controller.signal)
			writeArtifact(resolve(output, 'daemon-comparison.json'), { start, end })
			for (const binding of packet.bindings) readBinding(resolve(ROOT, binding.path), binding.hash)
			if (computeOperator() !== options.operator) throw new Error('Operator changed during execution')
			readBinding(PACKET, options.packet)
			ranking = computeRanking(packet, readings)
			writeArtifact(resolve(output, 'ranking.json'), ranking)
			complete = ranking.status !== 'incomplete'
		} catch (error) {
			failure = error instanceof Error ? error.message : String(error)
			throw error
		} finally {
			controller.abort()
			process.removeListener('SIGINT', abort)
			process.removeListener('SIGTERM', abort)
			if (!complete) ranking = { ...computeRanking(packet, readings), status: 'incomplete', comparisons: [], error: failure }
			writeArtifact(resolve(output, 'outcome.json'), { complete, status: complete ? ranking.status : 'incomplete', ...(failure === undefined ? {} : { failure }), modelRequests: recorder.count, daemonChecks: this.#tags, completed: readings.length, readings, ranking, interpretation: complete ? 'Complete local boundary screen; failed strict ordering refuses the method.' : 'Incomplete measurement; no method ruling.', at: new Date().toISOString() })
		}
	}

	#refuseFetch(): Promise<Response> {
		this.#dispatches += 1
		return Promise.reject(new Error('Offline preparation refuses global fetch'))
	}

	#createJudge(identity: string, recorder?: Recorder): NativeJudge {
		const tuple = readArray(JSON.parse(identity))
		if (tuple.length !== 5 || tuple[4] !== MICA_RENDER_REVISION) throw new Error('Frozen identity revision mismatch')
		const judge = createOllamaJudge({ model: readString(tuple[0]), system: readString(tuple[1]), calibration: { temperature: readNumber(tuple[2]) }, options: readObject(tuple[3]), url: DAEMON, timeout: 300000, ...(recorder === undefined ? {} : { fetch: recorder.fetch.bind(recorder) }) })
		if (!(judge instanceof AgentJudge) || judge.model !== identity) throw new Error('Installed judge identity mismatch')
		return judge
	}

	#collectBindings(): readonly Binding[] {
		const inputs = [readBinding(POPULATION, POPULATION_HASH), readBinding(LABELS, LABELS_HASH), readBinding(SPECIFICATION, SPECIFICATION_HASH), readBinding(PREDECESSOR, PREDECESSOR_HASH), readBinding(FOCUSED, FOCUSED_HASH), readBinding(BUILD, BUILD_HASH)]
		const predecessor = readPacket(readJSON(PREDECESSOR))
		const focused = readObject(readJSON(FOCUSED))
		const bindings: Binding[] = [...predecessor.bindings.map(binding => readBinding(resolve(ROOT, binding.path), binding.hash)), ...readArray(focused.bindings).map(value => { const binding = readObject(value); return readBinding(resolve(ROOT, readString(binding.path)), readString(binding.hash)) }), ...inputs]
		for (const name of REUSED_FILES) bindings.push(readBinding(resolve(UNIT, name)))
		for (const name of OPERATOR_FILES) bindings.push(readBinding(resolve(UNIT, name)))
		const build = readObject(readJSON(BUILD))
		for (const name of EMITTED_FILES) {
			const declared = readArray(build.outputs).map(readObject).find(entry => entry.path === name)
			if (declared === undefined) throw new Error(`Emitted runtime absent from frozen build: ${name}`)
			bindings.push(readBinding(resolve(HARNESS, '.build', name), readString(declared.hash)))
		}
		const queue = [{ origin: VENDOR, name: '@orkestrel/agent' }, { origin: VENDOR, name: '@orkestrel/ndjson' }, { origin: resolve(UNIT, 'validators.ts'), name: '@orkestrel/contract' }]
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
		return [...new Map(bindings.map(binding => [binding.path, binding])).values()]
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
