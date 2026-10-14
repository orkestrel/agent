import type { CapacityFile, CapacityFixture, CapacityProof, CapacityReading } from './types.ts'
import type {
	EnduranceOracle,
	EnduranceRuntime,
} from '../../instruments/harness/bench5/endurance/types.js'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CAPACITY_BUILD, CAPACITY_CUSTOMERS } from './constants.ts'
import { isCapacityRecord } from './validators.ts'

/** Reads one JSON object without coercion.
 * @param path - File path
 * @returns Parsed object
 */
export function readCapacityJSON(path: string): Readonly<Record<string, unknown>> {
	const value: unknown = JSON.parse(readFileSync(path, 'utf8'))
	if (!isCapacityRecord(value)) throw new Error(`expected object: ${path}`)
	return value
}

/** Computes immutable byte custody.
 * @param path - File path
 * @returns Absolute path and SHA256
 */
export function hashCapacityFile(path: string): CapacityFile {
	return {
		path: resolve(path),
		hash: createHash('sha256').update(readFileSync(path)).digest('hex'),
	}
}

/** Writes a create-only JSON artifact.
 * @param path - Destination
 * @param value - Serializable data
 * @returns Nothing
 */
export function writeCapacityJSON(path: string, value: unknown): void {
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' })
}

/** Verifies the root receipt against the current emitted build and retained gate report.
 * @param path - Root receipt path
 * @returns The verified receipt
 */
export function readCapacityProof(path: string): CapacityProof {
	const value = readCapacityJSON(path)
	if (value.passed !== true || !isCapacityRecord(value.build) || !isCapacityRecord(value.report))
		throw new Error('proof receipt did not pass')
	const build = readCapacityReference(value.build)
	const report = readCapacityReference(value.report)
	if (build.path !== CAPACITY_BUILD)
		throw new Error('proof receipt names a different emitted build')
	if (
		hashCapacityFile(build.path).hash !== build.hash ||
		hashCapacityFile(report.path).hash !== report.hash
	)
		throw new Error('missing or stale proof receipt')
	return { passed: true, build, report }
}

/** Reads a well-formed immutable reference.
 * @param value - External object
 * @returns Valid reference
 */
export function readCapacityReference(value: Readonly<Record<string, unknown>>): CapacityFile {
	if (
		typeof value.path !== 'string' ||
		typeof value.hash !== 'string' ||
		!/^[a-f0-9]{64}$/.test(value.hash)
	)
		throw new Error('invalid custody reference')
	return { path: resolve(value.path), hash: value.hash }
}

/** Builds identical synthetic inputs for every profile, model and arm.
 * @returns Public runtime and public derived schema companion
 */
export function buildCapacityFixture(): CapacityFixture {
	const seed: Array<EnduranceRuntime['seed'][number]> = [
		{
			id: 'synthetic-opening',
			shift: 0,
			date: '2032-03-01',
			role: 'user',
			content:
				'Synthetic support desk opening: Aster Example, Beryl Example and Cedar Example have pending parcel orders. Every identifier and event in this exercise is fictitious. No delivery completion is evidenced.',
		},
	]
	const days: Array<EnduranceRuntime['days'][number]> = [{ date: '2032-03-01', from: 1 }]
	const goals: Array<EnduranceRuntime['goals'][number]> = []
	for (let batch = 1; batch <= 6; batch += 1) {
		const shift = 1
		const date = '2032-03-01'
		for (let arrival = 0; arrival < 2; arrival += 1) {
			const customer = CAPACITY_CUSTOMERS[(batch + arrival - 1) % CAPACITY_CUSTOMERS.length]
			if (customer === undefined) throw new Error('synthetic customer missing')
			const notes = Array.from(
				{ length: 15 },
				(_, line) =>
					`Line ${line + 1}: ${customer.name}, customer ${customer.id}, order ${customer.order}, parcel item ${line + 1}, quantity ${(line % 3) + 1}; packaging intact, tracking receipt pending, follow-up due at handoff.`,
			).join('\n')
			seed.push({
				id: `synthetic-arrival-${seed.length}`,
				shift,
				date,
				role: 'user',
				content: `Batch ${batch}, arrival ${arrival + 1}: ${customer.name} asks about ${customer.order}. ${batch === 3 && arrival === 1 ? 'Correction: SO-1001 has quantity 3, not 2; the authoritative lookup version changes at arrival 6.' : 'Support notes retain parcel details and pending obligations.'}\n${notes}`,
			})
		}
	}
	for (const product of [1, 2, 4, 6]) {
		const tasks: Readonly<Record<number, string>> = {
			1: 'Prepare a status report for SO-1001. Call lookup_order for SO-1001 before reporting its authoritative status.',
			2: 'Prepare a correction and reconciliation packet. Call lookup_order for SO-1001 and lookup_customer for SC-2001. Compare received notes with authoritative quantities and distinguish pending from completed work.',
			4: 'Prepare the multi-customer support queue for Aster Example, Beryl Example and Cedar Example, including the arrival 6 correction to SO-1001. Call lookup_order for SO-1001 to verify the correction. Reference the source arrival identifiers for every material change.',
			6: 'Prepare a shift handoff for all customers. List outstanding obligations, supporting evidence, corrected quantities and unresolved tracking receipts. Call lookup_order for SO-1001 to verify its current version. Preserve source references.',
		}
		goals.push({
			id: `synthetic-goal-${product}`,
			shift: 1,
			after: seed.length - 1,
			request: `${tasks[product]} Write roughly 300-500 words, and finish by calling send_reply with the complete work product.`,
		})
	}
	const runtime: EnduranceRuntime = {
		id: 'synthetic-capacity-v1',
		system:
			'You are a support desk assistant handling a public synthetic exercise. Use lookup_order and lookup_customer when requested. Preserve source identifiers and distinguish evidence from pending obligations. Finish every request by calling send_reply with the complete answer; only send_reply text counts as your answer.',
		topics: CAPACITY_CUSTOMERS.map((customer) => ({
			name: customer.name,
			criterion: `${customer.name} customer ${customer.id} and order ${customer.order}`,
		})),
		days,
		seed,
		tools: {
			lookup_order: Object.fromEntries(
				CAPACITY_CUSTOMERS.map((customer) => [
					customer.order,
					`Order ${customer.order}, customer ${customer.id}: pending at depot; quantity 2; tracking receipt absent.`,
				]),
			),
			lookup_customer: Object.fromEntries(
				CAPACITY_CUSTOMERS.map((customer) => [
					customer.id,
					`Customer ${customer.id}: ${customer.name}; parcel follow-up due at handoff; notification pending.`,
				]),
			),
		},
		lookups: [
			{
				id: 'SO-1001',
				tool: 'lookup_order',
				from: 6,
				text: 'Order SO-1001, customer SC-2001: corrected quantity 3; pending at depot; tracking receipt absent. Correction released at arrival 6.',
			},
		],
		goals,
	}
	const dimensions: ReadonlyArray<EnduranceOracle['goals'][number]['atoms'][number]['dimension']> =
		['facts', 'work', 'obligations', 'revision', 'evidence']
	const first = goals[0]
	if (first === undefined) throw new Error('synthetic goals missing')
	const oracle: EnduranceOracle = {
		runtime: runtime.id,
		facts: seed.map((source, index) => ({
			id: `synthetic-fact-${index}`,
			version: 1,
			value: source.content,
			from: index,
			sources: [source.id],
			transition: 'arrival',
			case: 'Synthetic desk',
		})),
		obligations: [
			{
				id: 'synthetic-followup',
				version: 1,
				case: 'Synthetic desk',
				from: 0,
				due: 12,
				prerequisites: ['synthetic-fact-0'],
				sources: ['synthetic-opening'],
				description: 'Carry pending follow-up and missing tracking receipts.',
				evidence: [],
			},
		],
		goals: goals.map((goal, index) => ({
			goal: goal.id,
			product: 'handoff',
			case: 'Synthetic desk',
			earlier: index === 0 ? [] : [goals[index - 1]?.id ?? first.id],
			atoms: dimensions.map((dimension) => ({
				id: `${goal.id}-${dimension}`,
				dimension,
				requirement: `Carry synthetic ${dimension} with available sources.`,
				alternatives: [],
				sources: seed.filter((_, at) => at <= goal.after).map((source) => source.id),
				mandatory: true,
			})),
			critical: ['Claiming a shipment or notification without evidence.'],
			distant: [],
			lookups: [],
			obligations: ['synthetic-followup'],
		})),
		controls: [
			{
				id: 'synthetic-stale',
				goal: first.id,
				artifact: 'Use quantity 2 after correction.',
				verdict: 'stale',
				reason: 'Superseded quantity.',
			},
			{
				id: 'synthetic-fabricated',
				goal: first.id,
				artifact: 'Notification sent.',
				verdict: 'fabricated',
				reason: 'No receipt.',
			},
			{
				id: 'synthetic-ambiguous',
				goal: first.id,
				artifact: 'Everything is handled.',
				verdict: 'ambiguous',
				reason: 'No identified obligation.',
			},
		],
		calculations: [],
	}
	return { runtime, oracle }
}

/** Reads retained NDJSON records without exposing bodies.
 * @param path - Artifact path
 * @returns Parsed records
 */
export function readCapacityLines(path: string): ReadonlyArray<Readonly<Record<string, unknown>>> {
	return readFileSync(path, 'utf8')
		.split(/\r?\n/)
		.filter((line) => line.trim() !== '')
		.map((line) => {
			const value: unknown = JSON.parse(line)
			if (!isCapacityRecord(value)) throw new Error(`invalid NDJSON: ${path}`)
			return value
		})
}

/** Validates a nonnegative measured integer.
 * @param value - External measurement
 * @returns Valid measurement
 */
export function readCapacityCount(value: unknown): number {
	if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
		throw new Error('missing or invalid measured count')
	return value
}

/** Collects safe role and wire measurements from retained artifacts.
 * @param requests - Wire evidence
 * @param rows - Product outcomes
 * @param sections - Compaction events
 * @returns Aggregate metadata
 */
export function collectCapacityReading(
	requests: ReadonlyArray<Readonly<Record<string, unknown>>>,
	rows: ReadonlyArray<Readonly<Record<string, unknown>>>,
	sections: ReadonlyArray<Readonly<Record<string, unknown>>>,
): CapacityReading {
	const roles: Record<string, number> = {}
	const reasons: Record<string, number> = {}
	const options: Array<Readonly<Record<string, unknown>>> = []
	let calls = 0,
		tokens = 0,
		prompt = 0,
		completion = 0,
		thinking = false
	for (const request of requests) {
		if (request.sent !== true) continue
		calls += 1
		if (typeof request.role !== 'string') throw new Error('wire role missing')
		roles[request.role] = (roles[request.role] ?? 0) + 1
		if (
			request.error !== undefined ||
			(typeof request.status === 'number' && request.status >= 400) ||
			!Array.isArray(request.failures) ||
			request.failures.length > 0
		)
			throw new Error('wire request failed')
		if (request.role !== 'metadata') {
			const input = readCapacityCount(request.prompt),
				output = readCapacityCount(request.completion)
			tokens += input + output
			prompt = Math.max(prompt, input)
			completion = Math.max(completion, output)
		}
		if (typeof request.reason === 'string')
			reasons[request.reason] = (reasons[request.reason] ?? 0) + 1
		if (isCapacityRecord(request.request) && isCapacityRecord(request.request.options))
			options.push({ role: request.role, ...request.request.options, think: request.request.think })
		if (typeof request.response === 'string') {
			for (const line of request.response.split(/\r?\n/).filter((entry) => entry.trim() !== '')) {
				const frame: unknown = JSON.parse(line)
				if (
					isCapacityRecord(frame) &&
					isCapacityRecord(frame.message) &&
					typeof frame.message.thinking === 'string' &&
					frame.message.thinking.length > 0
				)
					thinking = true
			}
		}
	}
	const lookups = rows.reduce(
		(total, row) =>
			total + (isCapacityRecord(row.lookups) ? readCapacityCount(row.lookups.calls) : 0),
		0,
	)
	return {
		calls,
		tokens,
		prompt,
		completion,
		roles,
		reasons,
		thinking,
		options,
		lookups,
		folds: sections.filter((section) => section.event === 'compact').length,
	}
}
