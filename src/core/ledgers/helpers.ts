import type { Message } from '../types.js'
import type {
	GaugeCall,
	LedgerAmendment,
	LedgerCategory,
	LedgerLine,
	LedgerLookupReading,
	LedgerLookupState,
	LedgerPlanningGroup,
	LedgerProjection,
	LedgerProjectionInput,
	LedgerProjectionRequest,
	LedgerRecord,
	LedgerRegistry,
	LedgerRenderContext,
	LedgerTokenSet,
	LedgerTopic,
	LedgerWordSet,
} from './types.js'
import type { ToolCall } from '@orkestrel/tool'
import { canonicalStringify, isError, isFiniteNumber, isString } from '@orkestrel/contract'
import { estimateMessages } from '../agents/helpers.js'
import { renderJSON } from '../helpers.js'
import { isNonNegativeSafeInteger } from '../validators.js'
import { LEDGER_OWNER_PREFIX, LEDGER_RULES_KEY, PLACED_CATEGORIES } from './constants.js'
import { LedgerError } from './errors.js'

/**
 * Collects the live message ids placed in records or left without a record.
 * @param projection - The projected records and unplaced ids
 * @returns The distinct live message ids
 * @example
 * ```ts
 * collectProjectionIds({ records: [], amendments: [], orphans: ['message-1'] }) // Set { 'message-1' }
 * ```
 */
export function collectProjectionIds(projection: LedgerProjection): ReadonlySet<string> {
	return new Set([...projection.orphans, ...projection.records.flatMap((record) => record.members)])
}

/**
 * Scans admitted amendments in breadth-first order without revisiting a message.
 * @param amendments - The later messages attached to each earlier message
 * @param start - The first message to visit
 * @param admit - The predicate that admits a message and its descendants
 * @returns The admitted message ids in visit order
 * @example
 * ```ts
 * scanAmendments(new Map([['first', ['second']]]), 'first', () => true) // ['first', 'second']
 * ```
 */
export function scanAmendments(
	amendments: ReadonlyMap<string, readonly string[]>,
	start: string,
	admit: (id: string) => boolean,
): readonly string[] {
	const queue = [start]
	const seen = new Set<string>()
	const admitted: string[] = []
	for (const id of queue) {
		if (seen.has(id)) continue
		seen.add(id)
		if (!admit(id)) continue
		admitted.push(id)
		for (const later of amendments.get(id) ?? []) queue.push(later)
	}
	return admitted
}

/**
 * Builds the placeholder assistant recall call used to price recall framing.
 * @param topic - The recall topic to price
 * @returns The assistant message carrying the recall call
 * @example
 * ```ts
 * buildRecallMessage('refunds').calls?.[0]?.arguments // { topic: 'refunds' }
 * ```
 */
export function buildRecallMessage(topic: string): Message {
	return {
		id: 'call',
		role: 'assistant',
		content: '',
		calls: [{ id: 'call_00000000', name: 'recall', arguments: { topic } }],
	}
}

/**
 * Renders topic names as a comma-separated list in their supplied order.
 * @param topics - The configured desk topics
 * @returns The topic names joined by a comma and a space
 * @example
 * ```ts
 * renderTopicNames([{ name: 'refunds', criterion: 'Refund amounts' }]) // 'refunds'
 * ```
 */
export function renderTopicNames(topics: readonly LedgerTopic[]): string {
	return topics.map((topic) => topic.name).join(', ')
}

/**
 * Renders an error and its causes, stopping after 4 entries.
 * @param error - The thrown value to describe
 * @returns The names and messages joined by a cause separator
 * @example
 * ```ts
 * renderCauseChain(new Error('refused', { cause: 'offline' })) // 'Error: refused <- offline'
 * ```
 */
export function renderCauseChain(error: unknown): string {
	// The error, then at most three causes: each step extends the chain by the last entry's cause.
	return Array.from({ length: 3 })
		.reduce<readonly unknown[]>(
			(chain) => {
				const last = chain.at(-1)
				const cause = isError(last) ? last.cause : undefined
				return cause === undefined ? chain : [...chain, cause]
			},
			error === undefined ? [] : [error],
		)
		.map((one) => (isError(one) ? `${one.name}: ${one.message}` : String(one)))
		.join(' <- ')
}

/**
 * Extracts lowercase words and capitalized names that do not open a sentence.
 * @param message - The message whose text supplies the words
 * @returns The distinct words and non-opening names
 * @example
 * ```ts
 * extractWords({ id: 'note', role: 'user', content: 'Ask Odile.' }).names // Set { 'odile' }
 * ```
 */
export function extractWords(message: Message): LedgerWordSet {
	return {
		words: new Set(message.content.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []),
		names: new Set(
			[...message.content.matchAll(/(?<![\p{L}\p{N}'-])\p{Lu}\p{Ll}+(?![\p{L}\p{N}-])/gu)]
				.filter((match) => {
					const before = message.content.slice(0, match.index).trimEnd()
					return before !== '' && !/[.!?:;]$/.test(before)
				})
				.map((match) => match[0].toLowerCase()),
		),
	}
}

/**
 * Splits a topic part into lowercase words with surrounding punctuation removed.
 * @param part - The topic part to split
 * @returns The nonempty normalized words
 * @example
 * ```ts
 * splitWords('Refunds, BW-5512!') // ['refunds', 'bw-5512']
 * ```
 */
export function splitWords(part: string): readonly string[] {
	return part
		.split(/\s+/)
		.map((word) => word.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '').toLowerCase())
		.filter((word) => word !== '')
}

/**
 * Finds the call that owns a tool message within a collected tool group.
 * @param group - The assistant leader followed by its tool results
 * @param message - The tool result to pair; distinct leader ids pair by result id when any result has one
 * @returns The call matching the result's call id, or its position when the leader repeats an id or every result lacks an id; undefined when unpaired
 * @example
 * ```ts
 * findLedgerCall(group, result)?.arguments
 * ```
 */
export function findLedgerCall(group: readonly Message[], message: Message): ToolCall | undefined {
	const [leader, ...results] = group
	const at = results.findIndex((result) => result.id === message.id)
	if (message.role !== 'tool' || at < 0) return undefined
	const calls = leader?.calls ?? []
	const duplicate = new Set(calls.map((call) => call.id)).size !== calls.length
	return !duplicate && results.some((result) => result.call !== undefined)
		? calls.find((call) => call.id === message.call)
		: calls[at]
}

/**
 * Ranks a briefing source for removal before the next prompt.
 *
 * @param group - The planning group: 1 for a topic match, 2 for an off-topic rule or correction, or 3 for a name match
 * @param unsettled - If `true`, the source is a user message without a decisive category; if `false`, it is another source
 * @param category - The source's recorded category, or undefined when undecided
 * @returns The ascending removal rank: name matches, unsettled sources, off-topic corrections, off-topic rules, then topic matches
 * @remarks
 * The planner removes lower ranks first. Equal ranks 0, 1, and 4 remove lower scores first;
 * every equal rank then removes later conversation positions first.
 * @example
 * ```ts
 * rankLedgerCut(2, false, 'rule') // 3
 * ```
 */
export function rankLedgerCut(
	group: LedgerPlanningGroup,
	unsettled: boolean,
	category: LedgerCategory | undefined,
): number {
	return group === 3 ? 0 : unsettled ? 1 : group === 2 ? (category === 'rule' ? 3 : 2) : 4
}

/**
 * Resolves the generation cap and checks it against the context capacity.
 *
 * @param predict - The optional generation cap in tokens; see {@link LedgerOptions}
 * @param capacity - The context capacity in tokens
 * @returns The validated cap
 * @throws {LedgerError} Thrown when the cap is not a nonnegative safe integer less than capacity (code `'CAPACITY'`)
 * @example
 * ```ts
 * resolvePredict(1024, 4096) // 1024
 * ```
 */
export function resolvePredict(predict: number | undefined, capacity: number): number {
	const resolved = predict ?? 0
	if (!isNonNegativeSafeInteger(resolved) || resolved >= capacity)
		throw new LedgerError(
			'CAPACITY',
			'predict must be a nonnegative safe integer less than capacity',
		)
	return resolved
}

/**
 * Computes the completion tokens attributable to a message's thinking.
 *
 * @remarks
 * Weights the completion by thinking characters divided by the combined characters of thinking,
 * content, and JSON-serialized calls. Rounds to the nearest integer and caps at the completion.
 * An empty generation yields 0. The completion must be a finite nonnegative integer token count.
 * Calls that cannot be JSON-serialized contribute 0 characters.
 *
 * @param message - The generated thinking, content, and optional calls
 * @param completion - The tokens reported for the completion
 * @returns The thinking share in tokens, or 0 when no thinking characters exist
 *
 * @example
 * ```ts
 * computeThinking({ thinking: 'plan', content: 'ok' }, 10) // 7
 * ```
 */
export function computeThinking(
	message: Pick<Message, 'thinking' | 'content' | 'calls'>,
	completion: number,
): number {
	const thinking = message.thinking?.length ?? 0
	if (thinking === 0) return 0
	const calls = message.calls === undefined ? 0 : (renderJSON(message.calls)?.length ?? 0)
	const generated = thinking + message.content.length + calls
	return Math.min(completion, Math.round(completion * (thinking / generated)))
}

/**
 * Splits a message into its sentences.
 *
 * @remarks
 * A sentence ends at a period, question mark, or exclamation mark followed by a space and a capital
 * letter, a digit, or a quote, so a decimal point, an id, or an amount never splits one.
 *
 * @param text - The message text
 * @returns The trimmed, non-empty sentences in order
 *
 * @example
 * ```ts
 * splitSentences('Refunds over $200 need a manager. Ask Odile.')
 * // ['Refunds over $200 need a manager.', 'Ask Odile.']
 * ```
 */
export function splitSentences(text: string): readonly string[] {
	return text
		.split(/(?<=[.!?])\s+(?=[\p{Lu}\d"'“])/u)
		.map((sentence) => sentence.trim())
		.filter((sentence) => sentence !== '')
}

/**
 * Reads the id-shaped tokens and the numbers of a text.
 *
 * @param text - The text to read
 * @returns The uppercased hyphenated ids that hold a digit, and the numbers outside those ids with grouping commas removed
 *
 * @example
 * ```ts
 * const tokens = extractTokens('Order bw-5512 totals 1,200.50')
 * // tokens.ids is Set { 'BW-5512' }, tokens.numbers is Set { 1200.5 }
 * ```
 */
export function extractTokens(text: string): LedgerTokenSet {
	const idShape = /\b[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+\b/g
	const ids = new Set(
		[...text.matchAll(idShape)].flatMap(([token]) =>
			/\d/.test(token) ? [token.toUpperCase()] : [],
		),
	)
	const rest = text.replace(idShape, (token) => (/\d/.test(token) ? ' ' : token))
	const numbers = new Set(
		[...rest.matchAll(/(?<![\w.])\d[\d,]*(?:\.\d+)?/g)].flatMap(([token]) => {
			const value = Number(token.replace(/,/g, ''))
			return Number.isFinite(value) ? [value] : []
		}),
	)
	return { ids, numbers }
}

/**
 * Collects the capitalized name runs of a text, leaving out the run that opens each sentence.
 *
 * @remarks
 * A sentence opens with a capital whatever its first word is, so its opening run proves nothing.
 * This is the reading the person prefix of {@link buildRecords} rests on.
 *
 * @param text - The text to read
 * @returns The capitalized runs in order, repeats included
 *
 * @example
 * ```ts
 * collectNames('Odile phoned. We asked about Odile Marlow.') // ['Odile Marlow']
 * ```
 */
export function collectNames(text: string): readonly string[] {
	return splitSentences(text).flatMap((sentence) =>
		[...sentence.matchAll(/(?<![\p{L}\p{N}'-])\p{Lu}\p{Ll}+(?: \p{Lu}\p{Ll}+)*(?![\p{L}\p{N}-])/gu)]
			.filter((match) => (match.index ?? 0) > 0)
			.map((match) => match[0]),
	)
}

/**
 * Normalizes a lookup argument string to the spelling that lookup identity and owner linking compare.
 *
 * @remarks
 * {@link identifyLookup} and {@link linkOwners} read an argument through this one form, so a reading
 * a later lookup replaces and the owner link of its argument agree on the spelling.
 *
 * @param value - The string argument a lookup call carried
 * @returns The argument trimmed and uppercased
 *
 * @example
 * ```ts
 * normalizeArgument(' bw-5512 ') // 'BW-5512'
 * ```
 */
export function normalizeArgument(value: string): string {
	return value.trim().toUpperCase()
}

/**
 * Splits a tool result into its lines at each line feed, with or without a carriage return before it.
 *
 * @remarks
 * The recall listing keys each recalled line by its first line, and the answer note reads a result
 * line by line, so both read lines through this one split.
 *
 * @param text - The tool result text
 * @returns The lines in order, an empty line included; one empty line for an empty text
 *
 * @example
 * ```ts
 * splitResultLines('Account BW-20931.\r\nRefund is $148.50.') // ['Account BW-20931.', 'Refund is $148.50.']
 * ```
 */
export function splitResultLines(text: string): readonly string[] {
	return text.split(/\r\n|\n/)
}

/**
 * Renders a lookup call as its tool name and its JSON arguments.
 *
 * @remarks
 * The arguments keep the text `JSON.stringify` writes, key order included. Arguments JSON cannot
 * carry, such as a `BigInt` or a cycle, render the bare tool name instead of throwing.
 *
 * @param name - The lookup tool name
 * @param args - The arguments the call carried
 * @returns The tool name, a space, and the JSON arguments; the bare tool name when JSON cannot carry them
 *
 * @example
 * ```ts
 * renderLookupCall('lookup_order', { id: 'BW-5512' }) // 'lookup_order {"id":"BW-5512"}'
 * renderLookupCall('lookup_order', { count: 1n }) // 'lookup_order'
 * ```
 */
export function renderLookupCall(name: string, args: Readonly<Record<string, unknown>>): string {
	const rendered = renderJSON(args)
	return rendered === undefined ? name : `${name} ${rendered}`
}

/**
 * Identifies a lookup reading for projection by its tool name and normalized arguments.
 *
 * @remarks
 * Two calls share an identity whatever the key order of their arguments at any depth. A top-level
 * string argument passes through {@link normalizeArgument} first, so `"lh-1 "` and `"LH-1"` name one call.
 * The ledger's repeat stop instead compares the tool name and canonical arguments without this
 * string normalization, so those argument spellings remain distinct within a request.
 * An uncanonicalizable call has no identity and neither replaces nor is replaced by another reading.
 *
 * @param name - The tool name
 * @param args - The arguments the call carried
 * @returns The name, a space, and the canonical arguments, or `undefined` when uncanonicalizable
 *
 * @example
 * ```ts
 * identifyLookup('lookup_order', { id: 'bw-5512', opts: { tier: 2, region: 'north' } }) ===
 * 	identifyLookup('lookup_order', { opts: { region: 'north', tier: 2 }, id: ' BW-5512' }) // true
 * ```
 */
export function identifyLookup(
	name: string,
	args: Readonly<Record<string, unknown>>,
): string | undefined {
	const normalized = Object.fromEntries(
		Object.entries(args).map(([key, value]) => [
			key,
			isString(value) ? normalizeArgument(value) : value,
		]),
	)
	const canonical = canonicalStringify(normalized)
	return canonical === undefined ? undefined : `${name} ${canonical}`
}

/**
 * Links each id-shaped lookup argument to its owner.
 *
 * @remarks
 * An owner argument links to itself. Any other id-shaped argument links to the single owner id its
 * reading's text names. An empty reading links nothing, and a later reading overwrites an earlier
 * link of the same argument.
 *
 * @param readings - The lookup readings in conversation order
 * @param owners - The owners keyed by id
 * @returns The owner id of each linked argument id; an argument whose text names no owner or several is absent
 *
 * @example
 * ```ts
 * linkOwners(
 * 	[{ id: 'tool-1', name: 'lookup_order', arguments: { id: 'BW-5512' }, text: 'Order BW-5512 for account BW-20931.', result: { ids: [], owners: [] } }],
 * 	new Map([['BW-20931', ['Brightwater Studio']]]),
 * ) // Map { 'BW-5512' => 'BW-20931' }
 * ```
 */
export function linkOwners(
	readings: readonly LedgerLookupReading[],
	owners: ReadonlyMap<string, readonly string[]>,
): ReadonlyMap<string, string> {
	// A later pair of the same argument overwrites an earlier one, as the `Map` constructor does. The
	// spread visits a hole in `readings` as an undefined reading, as iteration does; `flatMap` skips it.
	return new Map(
		[...readings].flatMap((reading) => {
			if (reading.result === undefined) return []
			const named = [...extractTokens(reading.text).ids].filter((id) => owners.has(id))
			const [only] = named
			return Object.values(reading.arguments)
				.filter(isString)
				.map((value) => normalizeArgument(value))
				.filter((subject) => extractTokens(subject).ids.has(subject))
				.flatMap((subject) => {
					if (owners.has(subject)) return [[subject, subject] as const]
					return named.length === 1 && only !== undefined ? [[subject, only] as const] : []
				})
		}),
	)
}

/**
 * Collects the ids and the owner names the lookup readings named.
 *
 * @remarks
 * Every reading counts, a replaced one included, because an id a lookup named stays registered.
 * An empty reading names nothing. An owner name is trimmed, and a name without a letter is dropped.
 *
 * @param readings - The lookup readings in conversation order
 * @returns The registry: every id named, and each owner's names in the order read
 *
 * @example
 * ```ts
 * const registry = collectRegistry([
 * 	{ id: 'tool-1', name: 'lookup_customer', arguments: { account: 'BW-20931' }, text: 'Account BW-20931: Brightwater Studio', result: { ids: ['BW-20931'], owners: [{ id: 'BW-20931', names: ['Brightwater Studio'] }] } },
 * ])
 * // registry.owners is Map { 'BW-20931' => ['Brightwater Studio'] }
 * ```
 */
export function collectRegistry(readings: readonly LedgerLookupReading[]): LedgerRegistry {
	// The spread and `Array.from` visit a hole in `readings` or in an owner list as an undefined
	// entry, as iteration does; `flatMap` and `map` skip it.
	const results = [...readings].flatMap((reading) =>
		reading.result === undefined ? [] : [reading.result],
	)
	return {
		ids: new Set(
			results.flatMap((result) => [
				...result.ids,
				...Array.from(result.owners, (owner) => owner.id),
			]),
		),
		owners: new Map(
			[
				...Map.groupBy(
					results.flatMap((result) => Array.from(result.owners)),
					(owner) => owner.id,
				),
			].map(([id, listed]) => [
				id,
				[
					...new Set(
						listed.flatMap((owner) =>
							owner.names.map((name) => name.trim()).filter((name) => /\p{L}/u.test(name)),
						),
					),
				],
			]),
		),
	}
}

/**
 * Matches the registry ids and owners a text names.
 *
 * @remarks
 * An id counts when the text holds it as an id token. An owner counts when the text holds one of
 * its names whole. With `partial`, a capitalized name word that only one name carries also names
 * that name's owners, matched case-sensitively so a common word that spells a first name does not.
 *
 * @param registry - The registry to match against
 * @param text - The text to read
 * @param partial - If `true`, a name word only one name carries also names its owners; if `false`, only a whole name does
 * @returns The registry ids and owner ids the text names
 *
 * @example
 * ```ts
 * const registry = { ids: new Set(['BW-20931']), owners: new Map([['BW-20931', ['Brightwater Studio']]]) }
 * matchEntities(registry, 'Ask Brightwater about it', true) // Set { 'BW-20931' }
 * matchEntities(registry, 'Ask Brightwater about it', false) // Set {}
 * ```
 */
export function matchEntities(
	registry: LedgerRegistry,
	text: string,
	partial: boolean,
): ReadonlySet<string> {
	const tokens = extractTokens(text).ids
	// `Array.from` visits a hole in an owner's names as an undefined name, as iteration does; `map` skips it.
	const aliases = Map.groupBy(
		[...registry.owners].flatMap(([id, names]) => Array.from(names, (name) => ({ name, id }))),
		(entry) => entry.name,
	)
	// A word's carriers are the distinct names it appears in.
	const carriers = Map.groupBy(
		[...aliases.keys()].flatMap((name) => [...new Set(name.split(/\s+/))]),
		(word) => word,
	)
	return new Set([
		...[...registry.ids].filter((id) => tokens.has(id)),
		...[...aliases].flatMap(([name, entries]) => {
			const words = partial
				? name
						.split(/\s+/)
						.filter((word) => /^\p{Lu}\p{L}+$/u.test(word) && carriers.get(word)?.length === 1)
				: []
			const needles = [
				{ needle: name, flags: 'iu' },
				...words.map((word) => ({ needle: word, flags: 'u' })),
			]
			const named = needles.some(({ needle, flags }) => {
				const escaped = needle.replace(/[.*+?^$()|{}[\]\\]/g, '\\$&')
				return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, flags).test(text)
			})
			return named ? entries.map((entry) => entry.id) : []
		}),
	])
}

/**
 * Projects the owner records and the rules record from a conversation's messages.
 *
 * @remarks
 * Each line is a sentence of a live message, verbatim except that a sentence that opens with a pronoun opens with its party and a colon. A message is live when it is a user message,
 * or a tool message whose reading is the last reading of its call, and the input neither excludes it nor
 * files it quiet or replaced. A reading with an undefined `result` still replaces the earlier
 * reading of the same call, so the earlier result leaves every record.
 *
 * A live message joins the owner records its entities name, directly or through a linked lookup
 * argument. A message that names no owner joins where its earlier side of an amendment pair joins,
 * or on the rules record when it is filed as a rule or a correction, and is an orphan otherwise.
 *
 * Every live sentence is retained. Accepted direct edges are listed in `amendments`. An amending message
 * that is itself superseded retains its accepted edge without restoring its text.
 *
 * A sentence that opens with a pronoun takes the party named in the sentence before it. The reading
 * trusts capitals, so a capitalized word that is no person, such as a carrier named mid-sentence,
 * is read as the party. This is a documented limit: the prefix carries
 * the follow-up facts the records exist for.
 *
 * @param input - The messages, readings, entities, and classification to project
 * @returns The records with owner records ordered by their first member and the rules record last, the accepted amendments, and the live message ids no record placed
 *
 * @example
 * ```ts
 * const projection = buildRecords({
 * 	system: 'You staff the desk.',
 * 	exclusions: [],
 * 	owners: new Map([['BW-20931', ['Brightwater Studio']]]),
 * 	messages: [{ id: 'user-1', role: 'user', content: 'Brightwater Studio asked for a refund.' }],
 * 	readings: [],
 * 	entities: new Map([['user-1', ['BW-20931']]]),
 * 	classification: { quiet: new Set(), categories: new Map(), topics: new Map(), amendments: new Map(), supersessions: new Map() },
 * })
 * // projection.records[0].title === 'Brightwater Studio (account BW-20931)'
 * ```
 */
export function buildRecords(input: LedgerProjectionInput): LedgerProjection {
	const position = new Map(input.messages.map((message, at) => [message.id, at]))
	const byId = new Map(input.messages.map((message) => [message.id, message]))
	const live = collectLive(input)
	const links = linkOwners(input.readings, input.owners)
	const amending = new Map(
		[
			...Map.groupBy(
				[...input.classification.amendments].flatMap(([earlier, laters]) =>
					laters.map((later) => ({ earlier, later })),
				),
				(pair) => pair.later,
			),
		].map(([later, pairs]) => [later, pairs.map((pair) => pair.earlier)]),
	)
	const amendments = collectAmendments(input, byId, live)
	const holders = [...input.owners.values()].flat()
	const system = collectNames(input.system)
	// The memo belongs to this projection alone: `placeMember` inserts each placement once.
	const settled = new Map<string, ReadonlySet<string>>()
	const placements = live.map((id) => ({
		id,
		keys: placeMember(input, links, amending, id, new Set(), settled),
	}))
	const orphans = placements.filter((placement) => placement.keys.size === 0).map(({ id }) => id)
	const members = Map.groupBy(
		placements.flatMap(({ id, keys }) => [...keys].map((key) => ({ key, id }))),
		(entry) => entry.key,
	)
	const records = [...members]
		.map(([key, entries]) => {
			const ids = entries.map((entry) => entry.id)
			const lines = ids.flatMap((id) => buildLines(input, byId, id, holders, system))
			const owner = key.slice(LEDGER_OWNER_PREFIX.length)
			const holder = input.owners.get(owner)?.[0]
			const title =
				key === LEDGER_RULES_KEY
					? 'Rules'
					: holder === undefined
						? `account ${owner}`
						: `${holder} (account ${owner})`
			const first = position.get(ids[0] ?? '') ?? 0
			return {
				first,
				record: {
					key,
					title,
					members: ids,
					lines,
				} satisfies LedgerRecord,
			}
		})
		.sort(
			(left, right) =>
				Number(left.record.key === LEDGER_RULES_KEY) -
					Number(right.record.key === LEDGER_RULES_KEY) ||
				left.first - right.first ||
				(left.record.key < right.record.key ? -1 : left.record.key > right.record.key ? 1 : 0),
		)
		.map(({ record }) => record)
	return { records, amendments, orphans }
}

/**
 * Selects a request's records, collapsing owners with equal ordered member ids under titles joined with `; `.
 *
 * @remarks
 * The view holds the owner records the request names in the order it names them, then the rules
 * record with the lines whose topics meet the request's first, each group in position order. The
 * returned records and lines are copies. Owner records with the same member ids in the same order
 * collapse into the first requested record, keeping its key, members, and lines and joining their
 * titles with `; ` before trimming.
 *
 * @param projection - The output of {@link buildRecords}
 * @param request - The owners and the desk topics the request names
 * @returns The selected records; an owner with no record yields none
 *
 * @example
 * ```ts
 * selectRecords(projection, { owners: ['BW-20931'], topics: ['refunds'] }).map((record) => record.key)
 * // ['owner:BW-20931', 'rules']
 * ```
 */
export function selectRecords(
	projection: LedgerProjection,
	request: LedgerProjectionRequest,
): readonly LedgerRecord[] {
	const topics = new Set(request.topics)
	const rules = projection.records.find((one) => one.key === LEDGER_RULES_KEY)
	// Lines that meet a request topic lead; each side keeps its position order. `groupBy` visits a
	// hole in `lines` as an undefined line, as iteration does; `filter` skips it.
	const sides = Map.groupBy(
		(rules?.lines ?? []).filter(() => true),
		(line) => line.topics.some((topic) => topics.has(topic)),
	)
	const owners = [...new Set(request.owners)].flatMap((owner) => {
		const record = projection.records.find((one) => one.key === `${LEDGER_OWNER_PREFIX}${owner}`)
		return record === undefined ? [] : [record]
	})
	const groups = Map.groupBy(owners, (record) => JSON.stringify(record.members))
	return [
		...[...groups.values()].flatMap(([record, ...rest]) =>
			record === undefined
				? []
				: [
						structuredClone({
							...record,
							title: [record.title, ...rest.map((one) => one.title)].join('; '),
						}),
					],
		),
		...(rules === undefined
			? []
			: [
					structuredClone({
						...rules,
						lines: [...(sides.get(true) ?? []), ...(sides.get(false) ?? [])],
					}),
				]),
	]
}

/**
 * Renders one record as a heading and one list item per line.
 *
 * @remarks
 * The briefing joins rendered records with one blank line.
 *
 * @param record - A record or view with a `title` and `lines`
 * @param context - Rendering facts for optional accepted amendment annotations
 * @returns `## TITLE` followed by `- LINE` for each line
 *
 * @example
 * ```ts
 * renderLedgerRecord({ title: 'Rules', lines: [{ text: 'Refunds need a manager.', source: 'user-1', sentence: 0, topics: [], role: 'user' }] })
 * // '## Rules\n- Refunds need a manager.'
 * ```
 */
export function renderLedgerRecord(
	record: Pick<LedgerRecord, 'title' | 'lines'>,
	context?: LedgerRenderContext,
): string {
	return [
		`## ${record.title}`,
		...record.lines.flatMap((line) =>
			[context === undefined ? '' : renderLedgerAnnotation(line, context), `- ${line.text}`].filter(
				(text) => text !== '',
			),
		),
	].join('\n')
}

/**
 * Renders one owner record under a `###` heading, which the briefing nests under its one `## Pinned` heading.
 *
 * @param record - An owner record or view with a `title` and `lines`
 * @param context - Rendering facts for optional accepted amendment annotations
 * @returns `### TITLE` followed by `- LINE` for each line
 *
 * @example
 * ```ts
 * renderLedgerPinned({ title: 'Odile Marlow (account OM-30418)', lines: [] }) // '### Odile Marlow (account OM-30418)'
 * ```
 */
export function renderLedgerPinned(
	record: Pick<LedgerRecord, 'title' | 'lines'>,
	context?: LedgerRenderContext,
): string {
	return `#${renderLedgerRecord(record, context)}`
}

/**
 * Derives complete source identities, first occurrences, and local references from the actual briefing lines.
 * @param messages - Original messages whose indexed sentences establish completeness
 * @param lines - Retained lines in rendering order after deduplication and trimming
 * @param amendments - Accepted direct message amendment edges
 * @returns Immutable rendering facts for this retained population
 *
 * @example
 * ```ts
 * buildLedgerRenderContext([], [], []).complete.size // 0
 * ```
 */
export function buildLedgerRenderContext(
	messages: readonly Message[],
	lines: readonly LedgerLine[],
	amendments: readonly LedgerAmendment[],
): LedgerRenderContext {
	const identities = new Set(lines.map((line) => `${line.source} ${line.sentence}`))
	return {
		amendments,
		complete: new Set(
			messages
				.filter((message) => {
					const sentences = splitSentences(message.content)
					return (
						sentences.length > 0 &&
						sentences.every((_, index) => identities.has(`${message.id} ${index}`))
					)
				})
				.map((message) => message.id),
		),
		first: new Map(lines.toReversed().map((line) => [line.source, line])),
		references: new Map(
			[...new Set(lines.map((line) => line.source))].map((source, index) => [
				source,
				String(index + 1),
			]),
		),
	}
}

/**
 * Renders source framing and unresolved amendment scope at a source's first retained line.
 * @param line - The retained occurrence to annotate
 * @param context - Actual complete sources, first occurrences, local references, and accepted amendment edges
 * @returns Source framing and truthful inclusion notes, or empty text for an unrelated or repeated occurrence
 * @throws {LedgerError} Thrown when the context holds no reference for the annotated source or a fully included amender (code `'REQUEST'`)
 *
 * @example
 * ```ts
 * renderLedgerAnnotation({ text: 'Unchanged.', source: 'user-1', sentence: 0, topics: [], role: 'user' }, buildLedgerRenderContext([], [], [])) // ''
 * ```
 */
export function renderLedgerAnnotation(line: LedgerLine, context: LedgerRenderContext): string {
	if (context.first.get(line.source) !== line) return ''
	const amendments = context.amendments.filter((pair) => pair.earlier === line.source)
	const endpoint =
		context.complete.has(line.source) &&
		context.amendments.some((pair) => pair.later === line.source && context.first.has(pair.earlier))
	if (amendments.length === 0 && !endpoint) return ''
	const included = amendments.filter((pair) => context.complete.has(pair.later))
	if (
		context.references.get(line.source) === undefined ||
		included.some((pair) => context.references.get(pair.later) === undefined)
	)
		throw new LedgerError('REQUEST', 'Ledger rendering requires retained source references')
	return [
		`[Ledger source ${context.references.get(line.source)}]`,
		...included.map(
			(pair) =>
				`Accepted later amendment [Ledger source ${context.references.get(pair.later)}] is fully included in this briefing. Sentence scope is unresolved.`,
		),
		...(amendments.some((pair) => !context.complete.has(pair.later))
			? [
					'Accepted later amendment text is not fully included in this briefing. Sentence scope is unresolved.',
				]
			: []),
	].join('\n')
}

/**
 * Splits a recall topic at its joints.
 *
 * @remarks
 * The joints are a comma, a semicolon, a slash, and the word `and`. A topic with no joint is
 * returned whole, so a model that joins a name and an id recalls each part alone.
 *
 * @param topic - The topic the model asked for
 * @returns The trimmed, non-empty parts when there are at least 2; otherwise the topic itself
 *
 * @example
 * ```ts
 * splitTopic('BW-5512, Odile Marlow and refunds') // ['BW-5512', 'Odile Marlow', 'refunds']
 * ```
 */
export function splitTopic(topic: string): readonly string[] {
	const parts = topic
		.split(/\s*[,;/]\s*|\s+and\s+/i)
		.map((part) => part.trim())
		.filter((part) => part !== '')
	return parts.length > 1 ? parts : [topic]
}

/**
 * Cuts entries to a room and names how many it left out.
 *
 * @remarks
 * The cut keeps at least one entry. When it leaves entries out, its last line reads
 * `N older items not shown; name a narrower topic to narrow the recall`, which
 * {@link matchesCutLine} recognizes.
 *
 * @param entries - The entries in the order they are kept
 * @param room - The estimate units the joined entries can take
 * @returns The kept entries followed by the cut line when any were left out, joined by newlines
 *
 * @example
 * ```ts
 * cutListing(['first entry', 'second entry'], 1) // 'first entry\n1 older item not shown; name a narrower topic to narrow the recall'
 * ```
 */
export function cutListing(entries: readonly string[], room: number): string {
	// The cut keeps at least one entry, and stops at the first entry whose addition passes the room.
	const stop = [...entries.keys()].findIndex(
		(at) =>
			at > 0 &&
			estimateMessages([
				{
					id: 'recall',
					role: 'tool',
					content: entries.slice(0, at + 1).join('\n'),
				},
			]) > room,
	)
	const kept = entries.slice(0, stop === -1 ? undefined : stop)
	const left = entries.length - kept.length
	return [
		...kept,
		...(left > 0
			? [
					`${left} older item${left === 1 ? '' : 's'} not shown; name a narrower topic to narrow the recall`,
				]
			: []),
	].join('\n')
}

/**
 * Checks whether a line is the cut line {@link cutListing} writes.
 *
 * @param line - The line to check
 * @returns True if the line is a cut line; false otherwise
 *
 * @example
 * ```ts
 * matchesCutLine('2 older items not shown; name a narrower topic to narrow the recall') // true
 * ```
 */
export function matchesCutLine(line: string): boolean {
	return /^\d+ older items? not shown; /.test(line)
}

/**
 * Renders the tail stub of a lookup result from an earlier request.
 *
 * @param name - The lookup tool name
 * @param args - The arguments the call carried; arguments JSON cannot carry leave the call as its bare tool name, per {@link renderLookupCall}
 * @param state - What became of the result: `failed`, `empty`, `shown` in the briefing, or `hidden` from it
 * @returns The stub text, which carries the call and its state
 *
 * @example
 * ```ts
 * renderStub('lookup_order', { id: 'BW-5512' }, 'hidden')
 * // 'lookup_order {"id":"BW-5512"}: result not shown; call recall with BW-5512'
 * ```
 */
export function renderStub(
	name: string,
	args: Readonly<Record<string, unknown>>,
	state: LedgerLookupState,
): string {
	const head = renderLookupCall(name, args)
	if (state === 'failed') return `${head}: failed`
	if (state === 'empty') return `${head}: no record`
	if (state === 'shown') return `${head}: result shown under Pinned in the system message`
	const id = Object.values(args).find(isString)
	return `${head}: result not shown; call recall with ${(id ?? '').trim() || 'its id'}`
}

/**
 * Fits the marginal tokens one estimate unit adds within a request.
 *
 * @remarks
 * The fit is the least-squares slope of prompt tokens over estimate, taken within each set of calls
 * that advertised the same number of tools and pooled over every group. The estimate counts no tool
 * schema, so a pooled fit across tool counts would read the dropped schemas as a falling rate.
 *
 * @param groups - The calls of each request
 * @returns The slope, or undefined when no set holds 2 calls with a prompt count and an estimate that differ
 *
 * @example
 * ```ts
 * fitSlope([[{ estimate: 100, prompt: 130, tools: 2 }, { estimate: 200, prompt: 260, tools: 2 }]]) // 1.3
 * ```
 */
export function fitSlope(groups: ReadonlyArray<readonly GaugeCall[]>): number | undefined {
	// The spread visits a hole in `groups` as an undefined group, as iteration does; `flatMap` skips it.
	const terms = [...groups].flatMap((group) =>
		[...Map.groupBy(group, (call) => call.tools).values()].flatMap((set) => {
			const points = set.flatMap((call) =>
				isFiniteNumber(call.prompt) && call.estimate > 0
					? [{ estimate: call.estimate, prompt: call.prompt }]
					: [],
			)
			if (points.length < 2) return []
			const meanX = points.reduce((sum, point) => sum + point.estimate, 0) / points.length
			const meanY = points.reduce((sum, point) => sum + point.prompt, 0) / points.length
			return points.map((point) => ({
				spread: (point.estimate - meanX) ** 2,
				product: (point.estimate - meanX) * (point.prompt - meanY),
			}))
		}),
	)
	const spread = terms.reduce((sum, term) => sum + term.spread, 0)
	const product = terms.reduce((sum, term) => sum + term.product, 0)
	return spread > 0 ? product / spread : undefined
}

/**
 * Collects the ids of the live messages in conversation order.
 *
 * @remarks
 * A message is live when it is a user message, or a tool message whose reading is the last reading of its
 * call, and the input neither excludes it nor files it quiet or replaced. A reading replaces any
 * earlier reading of the same call, an empty one included, so an empty lookup leaves the earlier
 * result out of every record. A reading with no canonical identity stays live as its own source
 * and participates in no replacement.
 *
 * @param input - The messages, readings, and classification to read
 * @returns The live message ids
 *
 * @example
 * ```ts
 * collectLive(input) // ['user-1', 'tool-2']
 * ```
 */
export function collectLive(input: LedgerProjectionInput): readonly string[] {
	const { classification } = input
	const excluded = new Set(input.exclusions)
	const position = new Map(input.messages.map((message, at) => [message.id, at]))
	const readings = input.readings.filter((reading) => position.has(reading.id))
	const identities = new Map(
		readings.map((reading) => [reading.id, identifyLookup(reading.name, reading.arguments)]),
	)
	const current = new Set(
		readings
			.filter(
				(reading) =>
					reading.result !== undefined &&
					!readings.some(
						(later) =>
							identities.get(reading.id) !== undefined &&
							(position.get(later.id) ?? -1) > (position.get(reading.id) ?? -1) &&
							identities.get(later.id) === identities.get(reading.id),
					),
			)
			.map((reading) => reading.id),
	)
	return [...new Map(input.messages.map((message) => [message.id, message])).values()]
		.filter(
			(message) => message.role === 'user' || (message.role === 'tool' && current.has(message.id)),
		)
		.map((message) => message.id)
		.filter(
			(id) =>
				!excluded.has(id) &&
				!classification.quiet.has(id) &&
				(classification.supersessions.get(id) ?? []).length === 0,
		)
}

/**
 * Places a message on the record keys it joins.
 *
 * @remarks
 * A message joins the owner records its entities name, directly or through a linked lookup argument.
 * A message that names no owner joins where the earlier side of its amendment pair joins, and a
 * message with no earlier side joins the rules record when it is filed as a rule or a correction.
 * A message that is not live still places, because a correction joins where its earlier side would
 * join.
 *
 * With `settled`, the walk returns a placement the map holds without walking again, and records each
 * placement whose walk, its nested walks included, excluded no earlier side through `seen`. Such a
 * walk reaches no cycle. While every `seen` holds only the path that reached the message, as
 * {@link buildRecords} passes it, that path never holds a message the recorded walk reached, so a
 * fresh walk returns the same keys in the same order. A placement a cycle cut stays unrecorded,
 * because its keys depend on the path that reached it. Sharing one map across the members of one
 * input bounds a dense amendment graph to one walk per message.
 *
 * @param input - The owners, entities, and classification to read
 * @param links - The owner of each linked lookup argument, from {@link linkOwners}
 * @param amending - The earlier sides of each message's amendment pairs
 * @param id - The message id
 * @param seen - The ids already visited, which stops a cycle of amendment pairs
 * @param settled - The placements already walked for the same `input`, `links`, and `amending`; the walk adds to it. Default: no map, so every call walks
 * @returns The record keys, empty when the message is an orphan
 *
 * @example
 * ```ts
 * placeMember(input, new Map(), new Map(), 'user-1', new Set()) // Set { 'owner:BW-20931' }
 * ```
 */
export function placeMember(
	input: LedgerProjectionInput,
	links: ReadonlyMap<string, string>,
	amending: ReadonlyMap<string, readonly string[]>,
	id: string,
	seen: ReadonlySet<string>,
	settled?: Map<string, ReadonlySet<string>>,
): ReadonlySet<string> {
	const known = settled?.get(id)
	if (known !== undefined) return known
	const owners = (input.entities.get(id) ?? []).flatMap((entity) => {
		const owner = input.owners.has(entity) ? entity : links.get(entity)
		return owner === undefined ? [] : [`${LEDGER_OWNER_PREFIX}${owner}`]
	})
	const owned = owners.length > 0
	const sides = owned ? [] : (amending.get(id) ?? []).filter((side) => side !== id)
	const earlier = sides.filter((side) => !seen.has(side))
	const category = input.classification.categories.get(id)
	const ruled =
		!owned && earlier.length === 0 && category !== undefined && PLACED_CATEGORIES.includes(category)
	const keys = new Set([
		...owners,
		...earlier.flatMap((side) => [
			...placeMember(input, links, amending, side, new Set([...seen, id]), settled),
		]),
		...(ruled ? [LEDGER_RULES_KEY] : []),
	])
	if (
		settled !== undefined &&
		earlier.length === sides.length &&
		earlier.every((side) => settled.has(side))
	)
		settled.set(id, keys)
	return keys
}

/**
 * Collects accepted direct amendments of live messages.
 *
 * @remarks
 * An accepted edge relates an earlier live message to an amender without claiming which sentences
 * changed. An amender takes effect while live and retains its edge after another message supersedes
 * it, without restoring the superseded text. An excluded or quiet user or tool message has no effect.
 *
 * @param input - The exclusions and classification to read
 * @param byId - The messages by id
 * @param live - The live message ids from {@link collectLive}
 * @returns The distinct accepted direct edges in conversation order
 *
 * @example
 * ```ts
 * collectAmendments(input, byId, ['user-1', 'user-3']) // [{ earlier: 'user-1', later: 'user-3' }]
 * ```
 */
export function collectAmendments(
	input: LedgerProjectionInput,
	byId: ReadonlyMap<string, Message>,
	live: readonly string[],
): readonly LedgerAmendment[] {
	const { classification } = input
	const excluded = new Set(input.exclusions)
	const living = new Set(live)
	const ordered = [...new Set(input.messages.map((message) => message.id))]
	const positions = new Map(ordered.map((id, index) => [id, index]))
	const effective = new Set([
		...live,
		...[...byId.values()]
			.filter(
				(message) =>
					message.role !== 'assistant' &&
					!excluded.has(message.id) &&
					!classification.quiet.has(message.id) &&
					(classification.supersessions.get(message.id) ?? []).length > 0,
			)
			.map((message) => message.id),
	])
	return ordered
		.filter((id) => living.has(id))
		.flatMap((earlier) =>
			[...new Set(classification.amendments.get(earlier) ?? [])]
				.filter((later) => effective.has(later) && positions.has(later))
				.sort((a, b) => (positions.get(a) ?? 0) - (positions.get(b) ?? 0))
				.map((later) => ({ earlier, later })),
		)
}

/**
 * Builds the record lines of one message.
 *
 * @remarks
 * Each original indexed sentence becomes a line. A sentence that opens with a pronoun and follows
 * another sentence takes the last name of the sentence before it that is neither an owner name nor
 * a system name, and its line text opens with that party and a colon.
 *
 * @param input - The classification whose topics the lines carry
 * @param byId - The messages by id
 * @param id - The message id
 * @param holders - The owner names, which never serve as a party
 * @param system - The system text's names, which never serve as a party
 * @returns The lines in sentence order; empty when the message is absent
 *
 * @example
 * ```ts
 * buildLines(input, byId, 'user-1', [], []).map((line) => line.text)
 * // ['Odile Marlow phoned about BW-5512.', 'Odile Marlow: She wants a refund.']
 * ```
 */
export function buildLines(
	input: LedgerProjectionInput,
	byId: ReadonlyMap<string, Message>,
	id: string,
	holders: readonly string[],
	system: readonly string[],
): readonly LedgerLine[] {
	const message = byId.get(id)
	if (message === undefined) return []
	const sentences = splitSentences(message.content)
	const topics = input.classification.topics.get(id) ?? []
	return sentences.flatMap((sentence, at) => {
		const party =
			/^(?:He|She|They|His|Her|Their)(?![\p{L}\p{N}])/u.test(sentence) && at > 0
				? collectNames(sentences[at - 1] ?? '')
						.filter((name) => !holders.includes(name) && !system.includes(name))
						.at(-1)
				: undefined
		const line = {
			text: party === undefined ? sentence : `${party}: ${sentence}`,
			source: id,
			sentence: at,
			topics: [...topics],
			role: message.role,
		}
		return [party === undefined ? line : { ...line, party }]
	})
}
