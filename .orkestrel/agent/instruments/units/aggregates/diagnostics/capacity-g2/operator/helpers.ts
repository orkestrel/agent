import type { Admission, Binding, DaemonReceipt, ExecutionOptions, Model, Packet, Vector } from './types.ts'
import { existsSync, lstatSync, readFileSync, realpathSync, readdirSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { computeHash, readArray, readNumber, readObject, readString } from '../aggregate-judge-counterfactual/helpers.ts'
import { CHILD_VALUES, DAEMON, EVIDENCE_FILES, HOST, INPUT_FILES, LIMITS, OPERATOR_FILES, PACKET, PREPARED, ROOT, SAMPLER, UNIT, WORKLOADS } from './constants.ts'

/** Reads exact bytes and optionally verifies their custody hash.
 * @param path - The file to bind
 * @param expected - The required SHA-256 hash when supplied
 * @returns The exact file identity
 */
export function readFileBinding(path: string, expected?: string): Binding {
	if (!lstatSync(path).isFile()) throw new Error(`Not a regular file: ${path}`)
	const bytes = readFileSync(path)
	const hash = computeHash(bytes)
	if (expected !== undefined && hash !== expected) throw new Error(`Hash mismatch: ${path}`)
	return { path: relative(ROOT, path).split(sep).join('/'), hash, bytes: bytes.length }
}

/** Computes the runtime operator custody digest.
 * @returns The ordered source binding digest
 */
export function computeOperator(): string {
	return computeHash(JSON.stringify(OPERATOR_FILES.map(name => readFileBinding(resolve(UNIT, name)))))
}

/** Reads declared model identities without loading evaluation data.
 * @returns The frozen Gemma workload identity
 */
export function readModels(): readonly Model[] {
	const models: Model[] = []
	for (const key of WORKLOADS) {
		const manifest = readObject(JSON.parse(readFileSync(resolve(ROOT, `.orkestrel/agent/instruments/results/l7/${key}-think0/freeze/manifest.json`), 'utf8')))
		const decision = readObject(manifest.decision)
		const summarizer = readObject(manifest.summarizer)
		const tag = readString(decision.model)
		const digest = readString(decision.digest)
		if (!/^[a-f0-9]{64}$/.test(digest) || tag !== summarizer.model || digest !== summarizer.digest) throw new Error(`Missing or conflicting workload identity: ${key}`)
		models.push({ key, tag, digest, route: '/api/chat' })
	}
	const predecessor = readObject(JSON.parse(readFileSync(resolve(ROOT, 'tmp/units/aggregate-capacity-probe/prepared/packet.json'), 'utf8')))
	const retained = readArray(predecessor.models).map(readObject).filter(model => model.key === 'g2')
	if (retained.length !== 1 || JSON.stringify(models) !== JSON.stringify(retained)) throw new Error('Frozen Gemma identity mismatch')
	return models
}

/** Builds the exact diagnostic packet from retained inputs.
 * @returns The frozen request plan with source identities and limits
 */
export function buildPacket(): Packet {
	const models = readModels()
	const vectors: Vector[] = []
	for (const model of models) {
		for (const [name, input, context, predict] of [
			['reachability', 'generation.json', 2048, 1],
			['generation', 'generation.json', 2048, 4096],
		] as const) {
			const messages: unknown = JSON.parse(readFileSync(resolve(PREPARED, input), 'utf8'))
			readArray(messages)
			const body = JSON.stringify({ model: model.tag, messages, truncate: false, shift: false, stream: false, keep_alive: '5m', think: false, options: { ...SAMPLER, num_ctx: context, num_predict: predict } })
			vectors.push({ id: `${model.key}-${name}`, model: model.key, route: model.route, body, hash: computeHash(body), bytes: Buffer.byteLength(body) })
		}
	}
	const bindings = [
		...OPERATOR_FILES.map(name => readFileBinding(resolve(UNIT, name))),
		...EVIDENCE_FILES.map(name => readFileBinding(resolve(ROOT, name))),
		...WORKLOADS.map(key => readFileBinding(resolve(ROOT, `.orkestrel/agent/instruments/results/l7/${key}-think0/freeze/manifest.json`))),
		...INPUT_FILES.map(name => readFileBinding(resolve(PREPARED, name))),
	]
	validateBounds(vectors)
	return { version: 1, daemon: DAEMON, models, bindings, operator: computeOperator(), limits: LIMITS, vectors }
}

/** Refuses inference plans beyond their declared request or byte ceilings.
 * @param vectors - The diagnostic requests
 * @returns Nothing when the plan fits
 */
export function validateBounds(vectors: readonly Vector[]): void {
	if (vectors.length === 0 || vectors.length > LIMITS.inference) throw new Error('Inference ceiling breach')
	for (const vector of vectors) {
		if (Buffer.byteLength(vector.body) > LIMITS.request || vector.bytes !== Buffer.byteLength(vector.body) || vector.hash !== computeHash(vector.body)) throw new Error(`Request byte/hash ceiling breach: ${vector.id}`)
	}
}

/** Refuses occupied or escaped output paths before creating artifacts.
 * @param path - The prospective output
 * @returns The normalized vacant descendant
 */
export function validateOutput(path: string): string {
	const output = resolve(path)
	const base = realpathSync(UNIT)
	const descendant = relative(base, output)
	if (descendant === '' || descendant === '..' || descendant.startsWith(`..${sep}`) || isAbsolute(descendant)) throw new Error('Output must remain within the assigned directory')
	let cursor = base
	for (const segment of descendant.split(sep)) {
		if (!/^[A-Za-z0-9._-]+$/.test(segment) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment) || /[. ]$/.test(segment)) throw new Error('Unsafe output segment')
		cursor = resolve(cursor, segment)
		if (existsSync(cursor) && (!lstatSync(cursor).isDirectory() || lstatSync(cursor).isSymbolicLink())) throw new Error('Output crosses a non-directory or symbolic link')
	}
	if (existsSync(output)) throw new Error('Output is occupied')
	return output
}

/** Reads a controlled daemon receipt without inventing process attestation.
 * @param value - The untrusted receipt
 * @returns Declared nonsecret launch facts
 */
export function readReceipt(value: unknown): DaemonReceipt {
	const receipt = readObject(value)
	const executable = readObject(receipt.executable)
	const values = readObject(receipt.values)
	if (JSON.stringify(values) !== JSON.stringify(CHILD_VALUES) || receipt.finished !== undefined || receipt.exit !== undefined) throw new Error('Receipt is not an active controlled launch')
	const pid = readNumber(receipt.pid)
	if (!Number.isSafeInteger(pid) || pid <= 0 || typeof receipt.started !== 'string' || !Number.isFinite(Date.parse(receipt.started))) throw new Error('Receipt has no valid launch identity')
	const binding = { path: readString(executable.path), hash: readString(executable.hash), bytes: readNumber(executable.bytes) }
	if (process.platform !== 'win32' || resolve(ROOT, binding.path) !== resolve('C:/Users/mikes/scoop/apps/ollama-full/current/ollama.exe')) throw new Error('Receipt executable or Windows host mismatch')
	readFileBinding(resolve(ROOT, binding.path), binding.hash)
	return { executable: binding, values: CHILD_VALUES, pid, started: receipt.started }
}

/** Admits only the exact packet and explicit operator/receipt custody before HTTP.
 * @param options - Exact execution arguments
 * @returns Verified offline admission facts
 */
export function validateExecution(options: ExecutionOptions): Admission {
	for (const hash of [options.packet, options.operator, options.custody]) if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('Expected exact SHA-256 arguments')
	if (options.host !== HOST) throw new Error('Missing explicit exclusive host condition')
	const output = validateOutput(options.output)
	readFileBinding(PACKET, options.packet)
	if (computeOperator() !== options.operator) throw new Error('Operator hash mismatch')
	const packet = buildPacket()
	if (readFileSync(PACKET, 'utf8') !== `${JSON.stringify(packet, null, 2)}\n`) throw new Error('Packet or bound source changed after preparation')
	const binding = readFileBinding(resolve(options.receipt), options.custody)
	if (binding.bytes > LIMITS.metadata) throw new Error('Receipt exceeds metadata ceiling')
	const receipt = readReceipt(JSON.parse(readFileSync(resolve(options.receipt), 'utf8')))
	return { packet, output, receipt, binding }
}

/** Reads exact named option pairs and refuses ambiguous arguments.
 * @param argv - Arguments following the explicit entry flag
 * @param names - Permitted required option names
 * @returns The validated argument map
 */
export function readArguments(argv: readonly string[], names: readonly string[]): Readonly<Record<string, string>> {
	const options: Record<string, string> = {}
	if (argv.length !== names.length * 2) throw new Error('Expected every named option exactly once')
	for (let index = 0; index < argv.length; index += 2) {
		const name = argv[index]
		const value = argv[index + 1]
		if (name === undefined || value === undefined || !names.includes(name) || options[name] !== undefined || value === '') throw new Error('Unknown, missing, or repeated argument')
		options[name] = value
	}
	return options
}

/** Retains native error properties, nested causes, and aggregate members.
 * @param error - The caught transport failure
 * @returns A JSON-safe error description
 */
export function describeError(error: unknown): unknown {
	if (!(error instanceof Error)) return { thrown: String(error) }
	return { name: error.name, message: error.message, stack: error.stack, properties: Object.fromEntries(Object.getOwnPropertyNames(error).filter(name => !['name', 'message', 'stack', 'cause', 'errors'].includes(name)).map(name => [name, String(Reflect.get(error, name))])), ...(error.cause === undefined ? {} : { cause: describeError(error.cause) }), ...(error instanceof AggregateError ? { errors: Array.from(error.errors, describeError) } : {}) }
}

/** Scans exact output file bytes for final custody inventory.
 * @param directory - The owned capture directory
 * @returns Ordered relative file identities
 */
export function scanInventory(directory: string): readonly Binding[] {
	return readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isFile()).map(entry => readFileBinding(resolve(directory, entry.name))).sort((left, right) => left.path.localeCompare(right.path))
}
