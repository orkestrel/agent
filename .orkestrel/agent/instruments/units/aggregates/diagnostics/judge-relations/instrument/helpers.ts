import type { Binding, ExecutionOptions, Packet, WireEvidence, WireField } from './types.ts'
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { BUILD, BUILD_HASH, OPERATOR_FILES, PACKET, ROOT, UNIT } from './constants.ts'

/** Reads an object and refuses all other values. */
export function readObject(value: unknown): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Expected object')
	return Object.fromEntries(Object.entries(value))
}

/** Reads a string without coercion. */
export function readString(value: unknown): string {
	if (typeof value !== 'string') throw new Error('Expected string')
	return value
}

/** Reads a finite number without coercion. */
export function readNumber(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Expected finite number')
	return value
}

/** Reads an array without coercion. */
export function readArray(value: unknown): readonly unknown[] {
	if (!Array.isArray(value)) throw new Error('Expected array')
	return value
}

/** Computes SHA-256 over exact bytes. */
export function computeHash(bytes: string | Uint8Array): string {
	return createHash('sha256').update(bytes).digest('hex')
}

/** Reads JSON as untrusted data. */
export function readJSON(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'))
}

/** Reads and verifies one exact file binding. */
export function readBinding(path: string, expected?: string): Binding {
	const bytes = readFileSync(path)
	const hash = computeHash(bytes)
	if (expected !== undefined && hash !== expected) throw new Error(`Hash mismatch: ${path}; expected ${expected}; found ${hash}`)
	return { path: relative(ROOT, path).split(sep).join('/'), hash, bytes: bytes.length }
}

/** Computes the custody digest of every executable operator file. */
export function computeOperator(): string {
	return computeHash(JSON.stringify(OPERATOR_FILES.map(name => [name, readBinding(resolve(UNIT, name)).hash])))
}

/** Writes a new artifact and refuses an existing file. */
export function writeArtifact(path: string, value: unknown): void {
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' })
}

/** Extracts the selected row and refuses absence or repetition. */
export function extractRow(path: string, id: string): Record<string, unknown> {
	const rows = readFileSync(path, 'utf8').split(/\r\n|\n/).filter(line => line.length > 0).map(line => readObject(JSON.parse(line))).filter(row => row.id === id)
	const row = rows[0]
	if (rows.length !== 1 || row === undefined) throw new Error(`Expected exactly one selected row: ${path}`)
	return row
}

/** Replaces one exact candidate substring and refuses missing or repeated targets. */
export function replaceTarget(candidate: string, target: string, replacement: string): string {
	if (candidate.split(target).length !== 2) throw new Error(`Expected exactly one target: ${target}`)
	return candidate.replace(target, replacement)
}

/** Replays Yes weight using the independent logistic logprob gap. */
export function computeReplay(value: unknown, temperature: number): number {
	if (!Number.isFinite(temperature) || temperature <= 0) throw new Error('Invalid calibration')
	const first = readArray(readObject(value).logprobs)[0]
	const top = readArray(readObject(first).top_logprobs)
	const tokens = new Map<string, number>()
	for (const entry of top) {
		const row = readObject(entry)
		const token = readString(row.token)
		if (tokens.has(token)) throw new Error(`Duplicate token: ${token}`)
		tokens.set(token, readNumber(row.logprob))
	}
	const yes = tokens.get('Yes')
	const no = tokens.get('No')
	if (yes === undefined || no === undefined) throw new Error('Missing exact Yes/No labels')
	const gap = (no - yes) / temperature
	return gap >= 0 ? Math.exp(-gap) / (1 + Math.exp(-gap)) : 1 / (1 + Math.exp(gap))
}

/** Validates explicit hashes and a vacant descendant before any network operation. */
export function validateExecution(options: ExecutionOptions): Packet {
	if (!/^[a-f0-9]{64}$/.test(options.packet) || !/^[a-f0-9]{64}$/.test(options.operator) || options.build !== BUILD_HASH) throw new Error('Expected exact packet/build/operator hash arguments')
	readBinding(PACKET, options.packet)
	readBinding(BUILD, options.build)
	if (computeOperator() !== options.operator) throw new Error('Operator hash mismatch')
	const output = resolve(options.output)
	const descendant = relative(realpathSync(UNIT), output)
	if (descendant === '' || descendant === '..' || descendant.startsWith(`..${sep}`) || isAbsolute(descendant)) throw new Error('Output must be a descendant of the owned directory')
	let cursor = realpathSync(UNIT)
	for (const segment of descendant.split(sep)) {
		cursor = resolve(cursor, segment)
		if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) throw new Error('Output crosses a symbolic link')
	}
	if (existsSync(output)) throw new Error('Output directory is occupied')
	const value = readObject(readJSON(PACKET))
	for (const entry of readArray(value.bindings)) {
		const binding = readObject(entry)
		readBinding(resolve(ROOT, readString(binding.path)), readString(binding.hash))
	}
	return readPacket(value)
}

/** Reads a frozen packet's shape without unsafe assertions. */
export function readPacket(value: unknown): Packet {
	const packet = readObject(value)
	return {
		id: readString(packet.id), identity: readString(packet.identity), digest: readString(packet.digest),
		question: packet.question, separator: readString(packet.separator), sources: readArray(packet.sources), suffix: readString(packet.suffix),
		sequence: readArray(packet.sequence).map(readString),
		bindings: readArray(packet.bindings).map(entry => { const row = readObject(entry); return { path: readString(row.path), hash: readString(row.hash), bytes: readNumber(row.bytes) } }),
		variants: readArray(packet.variants).map(entry => {
			const row = readObject(entry)
			if (typeof row.repair !== 'boolean' || typeof row.cause !== 'boolean') throw new Error('Malformed edit switches')
			return { name: readString(row.name), expectation: readString(row.expectation), repair: row.repair, cause: row.cause, candidate: readString(row.candidate), state: readString(row.state) }
		}),
		rendering: readArray(packet.rendering).map(entry => { const row = readObject(entry); return { name: readString(row.name), body: readString(row.body) } }),
	}
}

/** Describes byte differences without changing the captured bodies. */
export function describeDifference(left: string, right: string): unknown {
	let prefix = 0
	while (prefix < left.length && prefix < right.length && left[prefix] === right[prefix]) prefix += 1
	let suffix = 0
	while (suffix < left.length - prefix && suffix < right.length - prefix && left[left.length - 1 - suffix] === right[right.length - 1 - suffix]) suffix += 1
	return { equal: left === right, prefix, removed: left.slice(prefix, left.length - suffix), inserted: right.slice(prefix, right.length - suffix), left: computeHash(left), right: computeHash(right) }
}

/** Describes a captured field, preserving present values including external nulls.
 * @param raw - The parsed response object, when readable
 * @param name - The external wire field name
 * @param missing - The reason an unreadable body supplies no field
 * @returns The field's observed availability and its unmodified value when present
 * @example describeField({}, 'response', 'absent') // { availability: 'absent' }
 */
export function describeField(raw: Readonly<Record<string, unknown>> | undefined, name: string, missing: 'absent' | 'unparseable'): WireField {
	if (raw === undefined) return { availability: missing }
	return raw[name] === undefined ? { availability: 'absent' } : { availability: 'present', value: raw[name] }
}

/** Describes captured response bytes independently of the judge's decoding outcome.
 * @param bytes - The untouched captured entity-body bytes, when available
 * @returns Explicit body and raw-field availability without manufacturing scores
 * @example describeWire(undefined).token // { availability: 'absent' }
 */
export function describeWire(bytes: Uint8Array | undefined): WireEvidence {
	let raw: Record<string, unknown> | undefined
	let error: string | undefined
	if (bytes !== undefined) {
		try { raw = readObject(JSON.parse(Buffer.from(bytes).toString('utf8'))) }
		catch (failure) { error = failure instanceof Error ? failure.message : String(failure) }
	}
	const missing = bytes === undefined ? 'absent' : 'unparseable'
	return {
		body: bytes === undefined ? { availability: 'absent' } : { availability: raw === undefined ? 'unparseable' : 'present', hash: computeHash(bytes), bytes: bytes.length, ...(error === undefined ? {} : { error }) },
		token: describeField(raw, 'response', missing), finish: describeField(raw, 'done_reason', missing), top: describeField(raw, 'logprobs', missing),
		usage: { prompt: describeField(raw, 'prompt_eval_count', missing), completion: describeField(raw, 'eval_count', missing) },
		timing: { total: describeField(raw, 'total_duration', missing), load: describeField(raw, 'load_duration', missing), prompt: describeField(raw, 'prompt_eval_duration', missing), evaluation: describeField(raw, 'eval_duration', missing) },
	}
}
