import type { Message } from '../src/core/types.js'
import type {
	LedgerCategory,
	LedgerClassification,
	LedgerLookupReading,
	LedgerLookupResult,
	LedgerProjection,
	LedgerProjectionInput,
	LedgerProjectionRequest,
} from '../src/core/ledgers/types.js'
import { canonicalStringify, isString } from '@orkestrel/contract'
import {
	buildRecords,
	extractTokens,
	linkOwners,
	splitSentences,
	collectNames,
} from '../src/core/ledgers/helpers.js'

/** Matches a generated handle such as `m12`, `r8`, or `[r8]`, which no helper writes into a text. */
export const LEDGER_HANDLE = /\b[mrp]\d+\b/g

/** Holds the system text of the fictional desk: two names the party prefix must never take. */
export const LEDGER_DESK_SYSTEM =
	'You work the Harbor Lane support desk with Pat Ruiz as shift lead. Today is Thursday 2026-10-08.'

/** Maps each fictional owner of the desk scenario to the names it goes by. */
export const LEDGER_DESK_OWNERS: Readonly<Record<string, readonly string[]>> = Object.freeze({
	'BW-20931': Object.freeze(['Brightwater Studio']),
	'OM-30418': Object.freeze(['Odile Marlow']),
})

/** Carries the parts of a classification as plain collections, which {@link buildLedgerClassification} turns into the projection's maps and sets. */
export interface LedgerClassificationParts {
	readonly quiet?: readonly string[]
	readonly categories?: Readonly<Record<string, LedgerCategory>>
	readonly topics?: Readonly<Record<string, readonly string[]>>
	readonly amended?: Readonly<Record<string, readonly string[]>>
	readonly superseded?: Readonly<Record<string, readonly string[]>>
}

/** Carries the parts of a projection input as plain collections, which {@link buildLedgerInput} turns into the projection's maps. */
export interface LedgerInputParts {
	readonly system?: string
	readonly exclude?: readonly string[]
	readonly owners?: Readonly<Record<string, readonly string[]>>
	readonly messages?: readonly Message[]
	readonly readings?: readonly LedgerLookupReading[]
	readonly entities?: Readonly<Record<string, readonly string[]>>
	readonly classification?: LedgerClassificationParts
}

/**
 * Builds a classification from plain collections.
 *
 * @param parts - The parts to set; an absent part is empty
 * @returns The classification
 */
export function buildLedgerClassification(
	parts: LedgerClassificationParts = {},
): LedgerClassification {
	return {
		quiet: new Set(parts.quiet ?? []),
		categories: new Map(Object.entries(parts.categories ?? {})),
		topics: new Map(Object.entries(parts.topics ?? {})),
		amended: new Map(Object.entries(parts.amended ?? {})),
		superseded: new Map(Object.entries(parts.superseded ?? {})),
	}
}

/**
 * Builds a projection input from plain collections.
 *
 * @param parts - The parts to set; an absent part is empty
 * @returns The projection input
 */
export function buildLedgerInput(parts: LedgerInputParts = {}): LedgerProjectionInput {
	return {
		system: parts.system ?? '',
		exclude: parts.exclude ?? [],
		owners: new Map(Object.entries(parts.owners ?? {})),
		messages: parts.messages ?? [],
		readings: parts.readings ?? [],
		entities: new Map(Object.entries(parts.entities ?? {})),
		classification: buildLedgerClassification(parts.classification),
	}
}

/**
 * Builds a message.
 *
 * @param id - The message id
 * @param role - The message role
 * @param content - The message text
 * @returns The message
 */
export function buildLedgerMessage(id: string, role: Message['role'], content: string): Message {
	return { id, role, content }
}

/**
 * Builds a lookup reading for a tool message.
 *
 * @param id - The tool message id
 * @param name - The lookup tool name
 * @param args - The arguments of the call
 * @param text - The result text
 * @param result - What the handler read; undefined for a lookup that found nothing
 * @returns The reading
 */
export function buildLedgerReading(
	id: string,
	name: string,
	args: Readonly<Record<string, unknown>>,
	text: string,
	result?: LedgerLookupResult,
): LedgerLookupReading {
	return { id, name, arguments: args, text, result }
}

/**
 * Builds the fictional desk scenario: two owners, a rule a correction made stale, a replaced lookup, a quiet message, and an excluded request.
 *
 * @returns A projection input whose build the oracle passes
 */
export function createLedgerDesk(): LedgerProjectionInput {
	const found: LedgerLookupResult = {
		ids: ['BW-5512', 'BW-20931'],
		owners: [],
	}
	return buildLedgerInput({
		system: LEDGER_DESK_SYSTEM,
		exclude: ['user-06'],
		owners: LEDGER_DESK_OWNERS,
		messages: [
			buildLedgerMessage(
				'user-01',
				'user',
				'Standing rule: any refund over $200 needs a manager code. This week code is MX-4471.',
			),
			buildLedgerMessage(
				'assistant-01',
				'assistant',
				'Understood. Refunds over $200 carry code MX-4471.',
			),
			buildLedgerMessage(
				'user-02',
				'user',
				'The caller is Odile Marlow, owner of account OM-30418. Her order shipped late.',
			),
			buildLedgerMessage(
				'tool-01',
				'tool',
				'Order BW-5512 for account BW-20931 (Brightwater Studio): linen set, total $140.00.',
			),
			buildLedgerMessage(
				'user-03',
				'user',
				'The shift lead is Dana Whitcombe. She approved the refund of $148.50 for order BW-5512.',
			),
			buildLedgerMessage(
				'tool-02',
				'tool',
				'Order BW-5512 for account BW-20931 (Brightwater Studio): linen set, total $148.50.',
			),
			buildLedgerMessage(
				'user-04',
				'user',
				'Correction: the manager code is MX-4486, not MX-4471.',
			),
			buildLedgerMessage('user-05', 'user', 'Thanks, that is all for now.'),
			buildLedgerMessage('user-06', 'user', 'Can you check the refund for Brightwater Studio?'),
		],
		readings: [
			buildLedgerReading(
				'tool-01',
				'lookup_order',
				{ id: 'bw-5512' },
				'Order BW-5512 for account BW-20931 (Brightwater Studio): linen set, total $140.00.',
				found,
			),
			buildLedgerReading(
				'tool-02',
				'lookup_order',
				{ id: ' BW-5512 ' },
				'Order BW-5512 for account BW-20931 (Brightwater Studio): linen set, total $148.50.',
				found,
			),
		],
		entities: {
			'user-02': ['OM-30418'],
			'user-03': ['BW-5512'],
			'tool-01': ['BW-5512', 'BW-20931'],
			'tool-02': ['BW-5512', 'BW-20931'],
		},
		classification: {
			quiet: ['user-05'],
			categories: { 'user-01': 'rule', 'user-04': 'correction' },
			topics: { 'user-01': ['refunds'], 'user-03': ['refunds'] },
			amended: { 'user-01': ['user-04'] },
		},
	})
}

/**
 * Builds the request that names the desk scenario's Brightwater Studio owner and its refunds topic.
 *
 * @returns The projection request
 */
export function createLedgerRequest(): LedgerProjectionRequest {
	return { owners: ['BW-20931'], topics: ['refunds'] }
}

function flipLedgerItems<T>(items: Iterable<T>): T[] {
	return [...items].reverse()
}

function flipLedgerMap(
	map: ReadonlyMap<string, readonly string[]>,
): Map<string, readonly string[]> {
	return new Map(flipLedgerItems(map).map(([key, value]) => [key, flipLedgerItems(value)]))
}

/**
 * Reverses the insertion order of every map, set, and list of a projection input.
 *
 * @param input - The input to reverse
 * @returns A copy whose collections hold the same members in the opposite order
 */
export function reverseLedgerInput(input: LedgerProjectionInput): LedgerProjectionInput {
	return {
		...input,
		exclude: flipLedgerItems(input.exclude),
		owners: flipLedgerMap(input.owners),
		entities: flipLedgerMap(input.entities),
		classification: {
			quiet: new Set(flipLedgerItems(input.classification.quiet)),
			categories: new Map(flipLedgerItems(input.classification.categories)),
			topics: flipLedgerMap(input.classification.topics),
			amended: flipLedgerMap(input.classification.amended),
			superseded: flipLedgerMap(input.classification.superseded),
		},
	}
}

function sortLedgerKeys(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortLedgerKeys)
	if (typeof value === 'object' && value !== null) {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
				.map(([key, item]) => [key, sortLedgerKeys(item)]),
		)
	}
	return value
}

// The identity of a lookup call by its own reading of the rule: sorted keys at every depth, with top-level
// strings trimmed and uppercased.
function readShape(name: string, args: Readonly<Record<string, unknown>>): string {
	const top = Object.fromEntries(
		Object.entries(args).map(([key, value]) => [
			key,
			isString(value) ? value.trim().toUpperCase() : value,
		]),
	)
	return `${name} ${JSON.stringify(sortLedgerKeys(top))}`
}

function listPlacementKeys(
	id: string,
	seen: ReadonlySet<string>,
	input: LedgerProjectionInput,
	earlierSides: ReadonlyMap<string, readonly string[]>,
	links: ReadonlyMap<string, string>,
): ReadonlySet<string> {
	const owners = new Set<string>()
	for (const entity of input.entities.get(id) ?? []) {
		const owner = input.owners.has(entity) ? entity : links.get(entity)
		if (owner !== undefined) owners.add(`owner:${owner}`)
	}
	if (owners.size > 0) return owners
	const sides = (earlierSides.get(id) ?? []).filter((earlier) => !seen.has(earlier))
	if (sides.length > 0) {
		return new Set(
			sides.flatMap((earlier) => [
				...listPlacementKeys(earlier, new Set([...seen, id]), input, earlierSides, links),
			]),
		)
	}
	const category = input.classification.categories.get(id)
	return category === 'rule' || category === 'correction' ? new Set(['rules']) : new Set()
}

// A superseded amending message keeps its effect, so a sentence it made stale never revives.
function hasEffect(
	id: string,
	input: LedgerProjectionInput,
	byId: ReadonlyMap<string, { readonly role: string }>,
	live: ReadonlySet<string>,
	excluded: ReadonlySet<string>,
	superseded: ReadonlySet<string>,
): boolean {
	const message = byId.get(id)
	return (
		live.has(id) ||
		(message !== undefined &&
			message.role !== 'assistant' &&
			!excluded.has(id) &&
			!input.classification.quiet.has(id) &&
			superseded.has(id))
	)
}

/**
 * Checks a projection against its input with passes that share only `linkOwners`, `extractTokens`, and `splitSentences` with `buildRecords` and share no liveness, placement, or staleness pass.
 *
 * @remarks
 * Each fault opens with its check: `verbatim`, `dead`, `coverage`, `placement`, `stale`, `handle`,
 * or `order`. The `order` check rebuilds over the input with every collection reversed and expects
 * the same projection.
 *
 * @param built - The output of `buildRecords`
 * @param input - The input the build read
 * @returns The faults; empty when clean
 */
export function checkLedgerProjection(
	built: LedgerProjection,
	input: LedgerProjectionInput,
): readonly string[] {
	const faults: string[] = []
	const byId = new Map(input.messages.map((message, at) => [message.id, { ...message, at }]))
	const { classification } = input
	const excluded = new Set(input.exclude)
	const superseded = new Set(
		[...classification.superseded].flatMap(([id, laters]) => (laters.length > 0 ? [id] : [])),
	)
	const lookups = new Map(input.readings.map((reading) => [reading.id, reading]))
	const replaced = new Set<string>()
	for (const reading of lookups.values()) {
		for (const later of lookups.values()) {
			const earlierAt = byId.get(reading.id)?.at ?? -1
			const laterAt = byId.get(later.id)?.at ?? -1
			if (
				laterAt > earlierAt &&
				readShape(later.name, later.arguments) === readShape(reading.name, reading.arguments)
			) {
				replaced.add(reading.id)
			}
		}
	}
	const live = new Set(
		[...byId.values()]
			.filter(
				(message) =>
					(message.role === 'user' ||
						(message.role === 'tool' &&
							lookups.get(message.id)?.result !== undefined &&
							!replaced.has(message.id))) &&
					!excluded.has(message.id) &&
					!classification.quiet.has(message.id) &&
					!superseded.has(message.id),
			)
			.map((message) => message.id),
	)
	const staleKeys = new Set(built.stale.map((entry) => `${entry.source} ${entry.sentence}`))
	const lines = built.records.flatMap((record) => record.lines.map((line) => ({ record, line })))

	for (const { record, line } of lines) {
		const sentences = splitSentences(byId.get(line.source)?.content ?? '')
		const prefix = line.party === undefined ? '' : `${line.party}: `
		if (
			!line.text.startsWith(prefix) ||
			line.text.slice(prefix.length) !== sentences[line.sentence]
		) {
			faults.push(
				`verbatim ${record.key}: "${line.text}" is not sentence ${line.sentence} of ${line.source}`,
			)
		}
		if (
			line.party !== undefined &&
			!collectNames(sentences[line.sentence - 1] ?? '').includes(line.party)
		) {
			faults.push(
				`verbatim ${record.key}: party "${line.party}" is absent from the sentence before ${line.source} sentence ${line.sentence}`,
			)
		}
	}

	for (const { record, line } of lines) {
		const tokens = extractTokens(line.text)
		for (const entry of built.stale) {
			if (
				entry.source === line.source &&
				entry.tokens.some((token) => tokens.ids.has(token) || tokens.numbers.has(Number(token)))
			) {
				faults.push(
					`dead ${record.key}: "${line.text}" holds ${entry.tokens.join(', ')}, which stale lists for ${line.source}`,
				)
			}
		}
		const message = byId.get(line.source)
		const reason =
			message === undefined
				? 'missing'
				: message.role === 'assistant'
					? 'assistant'
					: excluded.has(line.source)
						? 'excluded'
						: classification.quiet.has(line.source)
							? 'quiet'
							: superseded.has(line.source)
								? 'superseded'
								: replaced.has(line.source)
									? 'replaced'
									: live.has(line.source)
										? undefined
										: 'not live'
		if (reason !== undefined)
			faults.push(`dead ${record.key}: "${line.text}" comes from a ${reason} source ${line.source}`)
	}

	for (const record of built.records) {
		for (const id of record.members) {
			if (!live.has(id)) continue
			for (const [at] of splitSentences(byId.get(id)?.content ?? '').entries()) {
				const lined = record.lines.some((line) => line.source === id && line.sentence === at)
				if (!lined && !staleKeys.has(`${id} ${at}`)) {
					faults.push(`coverage ${record.key}: sentence ${at} of ${id} is neither a line nor stale`)
				}
			}
		}
	}

	const links = linkOwners(input.readings, input.owners)
	const earlierSides = new Map<string, string[]>()
	for (const [earlier, laters] of classification.amended) {
		for (const later of laters)
			earlierSides.set(later, [...(earlierSides.get(later) ?? []), earlier])
	}
	const placedIn = new Map<string, string[]>()
	for (const record of built.records) {
		for (const id of record.members) placedIn.set(id, [...(placedIn.get(id) ?? []), record.key])
	}
	for (const id of built.loose) placedIn.set(id, [...(placedIn.get(id) ?? []), 'loose'])
	for (const id of new Set([...live, ...placedIn.keys()])) {
		const expected = live.has(id)
			? [...listPlacementKeys(id, new Set([id]), input, earlierSides, links)]
			: []
		const want = (expected.length === 0 && live.has(id) ? ['loose'] : expected).sort().join(', ')
		const got = [...(placedIn.get(id) ?? [])].sort().join(', ')
		if (want !== got) faults.push(`placement ${id}: placed in [${got}], expected [${want}]`)
	}

	const expectedStale: string[] = []
	for (const id of [...live].sort(
		(left, right) => (byId.get(left)?.at ?? 0) - (byId.get(right)?.at ?? 0),
	)) {
		const laters = (classification.amended.get(id) ?? []).filter((later) =>
			hasEffect(later, input, byId, live, excluded, superseded),
		)
		if (laters.length === 0) continue
		for (const [at, sentence] of splitSentences(byId.get(id)?.content ?? '').entries()) {
			const own = extractTokens(sentence)
			const shared = new Set<string>()
			for (const later of laters) {
				const other = extractTokens(byId.get(later)?.content ?? '')
				for (const token of own.ids) if (other.ids.has(token)) shared.add(token)
				for (const token of own.numbers) if (other.numbers.has(token)) shared.add(String(token))
			}
			if (shared.size > 0) expectedStale.push(`${id} ${at} ${[...shared].sort().join(',')}`)
		}
	}
	const gotStale = built.stale.map(
		(entry) => `${entry.source} ${entry.sentence} ${[...entry.tokens].sort().join(',')}`,
	)
	if (JSON.stringify(gotStale) !== JSON.stringify(expectedStale)) {
		faults.push(`stale: built [${gotStale.join('; ')}], expected [${expectedStale.join('; ')}]`)
	}

	for (const { record, line } of lines) {
		const own = new Set(byId.get(line.source)?.content.match(LEDGER_HANDLE) ?? [])
		for (const handle of line.text.match(LEDGER_HANDLE) ?? []) {
			if (!own.has(handle))
				faults.push(
					`handle ${record.key}: "${line.text}" holds ${handle}, which ${line.source} lacks`,
				)
		}
	}

	const reversed = canonicalStringify(buildRecords(reverseLedgerInput(input)))
	if (reversed !== canonicalStringify(built)) {
		faults.push('order: the build over reversed collections differs from the build')
	}
	return faults
}
