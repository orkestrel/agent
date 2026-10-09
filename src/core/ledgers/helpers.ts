import type { Message } from '../types.js'
import type {
	GaugeCall,
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
	LedgerStaleSentence,
	LedgerTokenSet,
} from './types.js'
import type { ToolCall } from '@orkestrel/tool'
import { canonicalStringify, isFiniteNumber, isString } from '@orkestrel/contract'
import { estimateMessages } from '../agents/helpers.js'
import { LEDGER_OWNER_PREFIX, LEDGER_RULES_KEY, PLACED_CATEGORIES } from './constants.js'
import { LedgerError } from './errors.js'

/**
 * Resolves the call that owns a tool message within a collected tool group.
 * @param group - The assistant leader followed by its tool results
 * @param message - The tool result to pair; any result id disables positional fallback for the group
 * @returns The call matching the result's call id, or its position when every result lacks an id; undefined when unpaired
 * @example
 * ```ts
 * resolveLedgerCall(group, result)?.arguments
 * ```
 */
export function resolveLedgerCall(
	group: readonly Message[],
	message: Message,
): ToolCall | undefined {
	const [leader, ...results] = group
	const at = results.findIndex((result) => result.id === message.id)
	if (message.role !== 'tool' || at < 0) return undefined
	return results.some((result) => result.call !== undefined)
		? leader?.calls?.find((call) => call.id === message.call)
		: leader?.calls?.[at]
}

/**
 * Ranks a briefing source for removal before the next prompt.
 *
 * @param group - The planning group: 1 for a topic match, 2 for an off-topic rule or correction, or 3 for a name match
 * @param loose - If `true`, the source is a user message without a decisive category; if `false`, it is another source
 * @param category - The source's recorded category, or undefined when undecided
 * @returns The ascending removal rank: name matches, loose sources, off-topic corrections, off-topic rules, then topic matches
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
	loose: boolean,
	category: LedgerCategory | undefined,
): number {
	return group === 3 ? 0 : loose ? 1 : group === 2 ? (category === 'rule' ? 3 : 2) : 4
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
	if (!Number.isSafeInteger(resolved) || resolved < 0 || resolved >= capacity)
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
	let calls = 0
	try {
		calls = message.calls === undefined ? 0 : JSON.stringify(message.calls).length
	} catch {
		// Non-JSON arguments still belong to the domain call contract.
	}
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
	// A decimal point, an id, or an amount never meets the break, which needs a space and then a capital, a digit, or a quote.
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
	const ids = new Set<string>()
	for (const [token] of text.matchAll(idShape)) if (/\d/.test(token)) ids.add(token.toUpperCase())
	const rest = text.replace(idShape, (token) => (/\d/.test(token) ? ' ' : token))
	const numbers = new Set<number>()
	for (const [token] of rest.matchAll(/(?<![\w.])\d[\d,]*(?:\.\d+)?/g)) {
		const value = Number(token.replace(/,/g, ''))
		if (Number.isFinite(value)) numbers.add(value)
	}
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
 * Identifies a lookup reading for projection by its tool name and normalized arguments.
 *
 * @remarks
 * Two calls share an identity whatever the key order of their arguments at any depth. A top-level
 * string argument is trimmed and uppercased first, so `"lh-1 "` and `"LH-1"` name one call.
 * The ledger's repeat stop instead compares the tool name and canonical arguments without this
 * string normalization, so those argument spellings remain distinct within a request.
 *
 * @param name - The tool name
 * @param args - The arguments the call carried
 * @returns The identity: the name, a space, and the canonical arguments
 *
 * @example
 * ```ts
 * identifyLookup('lookup_order', { id: 'bw-5512', opts: { b: 1, a: 2 } }) ===
 * 	identifyLookup('lookup_order', { opts: { a: 2, b: 1 }, id: ' BW-5512' }) // true
 * ```
 */
export function identifyLookup(name: string, args: Readonly<Record<string, unknown>>): string {
	const normalized = Object.fromEntries(
		Object.entries(args).map(([key, value]) => [
			key,
			isString(value) ? value.trim().toUpperCase() : value,
		]),
	)
	return `${name} ${canonicalStringify(normalized) ?? ''}`
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
	const links = new Map<string, string>()
	for (const reading of readings) {
		if (reading.result === undefined) continue
		const named = [...extractTokens(reading.text).ids].filter((id) => owners.has(id))
		const [only] = named
		const subjects = Object.values(reading.arguments)
			.filter(isString)
			.map((value) => value.trim().toUpperCase())
			.filter((subject) => extractTokens(subject).ids.has(subject))
		for (const subject of subjects) {
			if (owners.has(subject)) links.set(subject, subject)
			else if (named.length === 1 && only !== undefined) links.set(subject, only)
		}
	}
	return links
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
	const ids = new Set<string>()
	const owners = new Map<string, readonly string[]>()
	for (const reading of readings) {
		if (reading.result === undefined) continue
		for (const id of reading.result.ids) ids.add(id)
		for (const owner of reading.result.owners) {
			ids.add(owner.id)
			const names = owners.get(owner.id) ?? []
			const added = owner.names
				.map((name) => name.trim())
				.filter((name) => /\p{L}/u.test(name) && !names.includes(name))
			owners.set(owner.id, [...names, ...new Set(added)])
		}
	}
	return { ids, owners }
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
	const found = new Set<string>()
	const tokens = extractTokens(text).ids
	for (const id of registry.ids) if (tokens.has(id)) found.add(id)
	const aliases = new Map<string, string[]>()
	for (const [id, names] of registry.owners) {
		for (const name of names) aliases.set(name, [...(aliases.get(name) ?? []), id])
	}
	const carriers = new Map<string, number>()
	for (const name of aliases.keys()) {
		for (const word of new Set(name.split(/\s+/))) carriers.set(word, (carriers.get(word) ?? 0) + 1)
	}
	for (const [name, ids] of aliases) {
		const words = partial
			? name.split(/\s+/).filter((word) => /^\p{Lu}\p{L}+$/u.test(word) && carriers.get(word) === 1)
			: []
		const needles = [
			{ needle: name, flags: 'iu' },
			...words.map((word) => ({ needle: word, flags: 'u' })),
		]
		const named = needles.some(({ needle, flags }) => {
			const escaped = needle.replace(/[.*+?^$()|{}[\]\\]/g, '\\$&')
			return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, flags).test(text)
		})
		if (named) for (const id of ids) found.add(id)
	}
	return found
}

/**
 * Projects the owner records and the rules record from a conversation's messages.
 *
 * @remarks
 * Each line is a sentence of a live message, verbatim except that a sentence that opens with a pronoun opens with its party and a colon. A message is live when it is a user message,
 * or a tool message whose reading is the last reading of its call, and the input neither excludes it nor
 * files it quiet or superseded. A reading with an undefined `result` still replaces the earlier
 * reading of the same call, so the earlier result leaves every record.
 *
 * A live message joins the owner records its entities name, directly or through a linked lookup
 * argument. A message that names no owner joins where its earlier side of an amended pair joins,
 * or on the rules record when it is filed as a rule or a correction, and is loose otherwise.
 *
 * A sentence an amending message made stale is left out and listed in `stale`. An amending message
 * that is itself superseded keeps that effect, so the old value never revives.
 *
 * A sentence that opens with a pronoun takes the party named in the sentence before it. The reading
 * trusts capitals, so a capitalized word that is no person, such as a carrier named mid-sentence,
 * is read as the party. This is a documented limit that the measured series kept: the prefix carries
 * the follow-up facts the records exist for.
 *
 * @param input - The messages, readings, entities, and classification to project
 * @returns The records with owner records ordered by their first member and the rules record last, the stale sentences, and the live message ids no record placed
 *
 * @example
 * ```ts
 * const projection = buildRecords({
 * 	system: 'You staff the desk.',
 * 	exclude: [],
 * 	owners: new Map([['BW-20931', ['Brightwater Studio']]]),
 * 	messages: [{ id: 'user-1', role: 'user', content: 'Brightwater Studio asked for a refund.' }],
 * 	readings: [],
 * 	entities: new Map([['user-1', ['BW-20931']]]),
 * 	classification: { quiet: new Set(), categories: new Map(), topics: new Map(), amended: new Map(), superseded: new Map() },
 * })
 * // projection.records[0].title === 'Brightwater Studio (account BW-20931)'
 * ```
 */
export function buildRecords(input: LedgerProjectionInput): LedgerProjection {
	const position = new Map<string, number>()
	const byId = new Map<string, Message>()
	for (const [at, message] of input.messages.entries()) {
		position.set(message.id, at)
		byId.set(message.id, message)
	}
	const live = collectLive(input)
	const links = linkOwners(input.readings, input.owners)
	const amending = new Map<string, readonly string[]>()
	for (const [earlier, laters] of input.classification.amended) {
		for (const later of laters) amending.set(later, [...(amending.get(later) ?? []), earlier])
	}
	const stale = collectStale(input, byId, live)
	const dead = new Set(stale.map((entry) => `${entry.source} ${entry.sentence}`))
	const holders = [...input.owners.values()].flat()
	const system = collectNames(input.system)
	const members = new Map<string, string[]>()
	const loose: string[] = []
	for (const id of live) {
		const keys = placeMember(input, links, amending, id, new Set())
		if (keys.size === 0) loose.push(id)
		for (const key of keys) members.set(key, [...(members.get(key) ?? []), id])
	}
	const records = [...members]
		.map(([key, ids]) => {
			const lines = ids.flatMap((id) => buildLines(input, byId, id, dead, holders, system))
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
	return { records, stale, loose }
}

/**
 * Selects a request's view of the projected records.
 *
 * @remarks
 * The view holds the owner records the request names in the order it names them, then the rules
 * record with the lines whose topics meet the request's first, each group in position order. The
 * returned records and lines are copies.
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
	const views: LedgerRecord[] = []
	for (const owner of new Set(request.owners)) {
		const record = projection.records.find((one) => one.key === `${LEDGER_OWNER_PREFIX}${owner}`)
		if (record !== undefined) views.push(structuredClone(record))
	}
	const rules = projection.records.find((one) => one.key === LEDGER_RULES_KEY)
	if (rules !== undefined) {
		const met = rules.lines.filter((line) => line.topics.some((topic) => topics.has(topic)))
		const rest = rules.lines.filter((line) => !line.topics.some((topic) => topics.has(topic)))
		views.push(structuredClone({ ...rules, lines: [...met, ...rest] }))
	}
	return views
}

/**
 * Renders one record as a heading and one list item per line.
 *
 * @remarks
 * The briefing joins rendered records with one blank line.
 *
 * @param record - A record or view with a `title` and `lines`
 * @returns `## TITLE` followed by `- LINE` for each line
 *
 * @example
 * ```ts
 * renderLedgerRecord({ title: 'Rules', lines: [{ text: 'Refunds need a manager.', source: 'user-1', sentence: 0, topics: [], role: 'user' }] })
 * // '## Rules\n- Refunds need a manager.'
 * ```
 */
export function renderLedgerRecord(record: Pick<LedgerRecord, 'title' | 'lines'>): string {
	return [`## ${record.title}`, ...record.lines.map((line) => `- ${line.text}`)].join('\n')
}

/**
 * Renders one owner record under a `###` heading, which the briefing nests under its one `## Pinned` heading.
 *
 * @param record - An owner record or view with a `title` and `lines`
 * @returns `### TITLE` followed by `- LINE` for each line
 *
 * @example
 * ```ts
 * renderLedgerPinned({ title: 'Odile Marlow (account OM-30418)', lines: [] }) // '### Odile Marlow (account OM-30418)'
 * ```
 */
export function renderLedgerPinned(record: Pick<LedgerRecord, 'title' | 'lines'>): string {
	return [`### ${record.title}`, ...record.lines.map((line) => `- ${line.text}`)].join('\n')
}

/**
 * Splits a recall topic at its joints.
 *
 * @remarks
 * The joints are a comma, a semicolon, a slash, and the word `and`. A topic with no joint is
 * returned whole, so a model that joins a name and an id recalls each part alone.
 *
 * @param topic - The topic the model asked for
 * @returns The trimmed, non-empty parts when there are at least two; otherwise the topic itself
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
	const kept: string[] = []
	for (const entry of entries) {
		if (
			kept.length > 0 &&
			estimateMessages([
				{
					id: 'recall',
					role: 'tool',
					content: [...kept, entry].join('\n'),
				},
			]) > room
		)
			break
		kept.push(entry)
	}
	const left = entries.length - kept.length
	if (left > 0) {
		kept.push(
			`${left} older item${left === 1 ? '' : 's'} not shown; name a narrower topic to narrow the recall`,
		)
	}
	return kept.join('\n')
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
 * @param args - The arguments the call carried
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
	const head = `${name} ${JSON.stringify(args)}`
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
 * @returns The slope, or undefined when no set holds two calls with a prompt count and an estimate that differ
 *
 * @example
 * ```ts
 * fitSlope([[{ estimate: 100, prompt: 130, tools: 2 }, { estimate: 200, prompt: 260, tools: 2 }]]) // 1.3
 * ```
 */
export function fitSlope(groups: ReadonlyArray<readonly GaugeCall[]>): number | undefined {
	let spread = 0
	let product = 0
	for (const group of groups) {
		for (const set of Map.groupBy(group, (call) => call.tools).values()) {
			const points = set.flatMap((call) =>
				isFiniteNumber(call.prompt) && call.estimate > 0
					? [{ estimate: call.estimate, prompt: call.prompt }]
					: [],
			)
			if (points.length < 2) continue
			const meanX = points.reduce((sum, point) => sum + point.estimate, 0) / points.length
			const meanY = points.reduce((sum, point) => sum + point.prompt, 0) / points.length
			for (const point of points) {
				spread += (point.estimate - meanX) ** 2
				product += (point.estimate - meanX) * (point.prompt - meanY)
			}
		}
	}
	return spread > 0 ? product / spread : undefined
}

/**
 * Collects the ids of the live messages in conversation order.
 *
 * @remarks
 * A message is live when it is a user message, or a tool message whose reading is the last reading of its
 * call, and the input neither excludes it nor files it quiet or superseded. A reading replaces any
 * earlier reading of the same call, an empty one included, so an empty lookup leaves the earlier
 * result out of every record.
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
	const excluded = new Set(input.exclude)
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
				(classification.superseded.get(id) ?? []).length === 0,
		)
}

/**
 * Places a message on the record keys it joins.
 *
 * @remarks
 * A message joins the owner records its entities name, directly or through a linked lookup argument.
 * A message that names no owner joins where the earlier side of its amended pair joins, and a
 * message with no earlier side joins the rules record when it is filed as a rule or a correction.
 * A message that is not live still places, because a correction joins where its earlier side would
 * join.
 *
 * @param input - The owners, entities, and classification to read
 * @param links - The owner of each linked lookup argument, from {@link linkOwners}
 * @param amending - The earlier sides of each message's amended pairs
 * @param id - The message id
 * @param seen - The ids already visited, which stops a cycle of amended pairs
 * @returns The record keys, empty when the message is loose
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
): ReadonlySet<string> {
	const keys = new Set<string>()
	for (const entity of input.entities.get(id) ?? []) {
		const owner = input.owners.has(entity) ? entity : links.get(entity)
		if (owner !== undefined) keys.add(`${LEDGER_OWNER_PREFIX}${owner}`)
	}
	if (keys.size > 0) return keys
	const earlier = (amending.get(id) ?? []).filter((side) => side !== id && !seen.has(side))
	if (earlier.length > 0) {
		for (const side of earlier) {
			for (const key of placeMember(input, links, amending, side, new Set([...seen, id])))
				keys.add(key)
		}
		return keys
	}
	const category = input.classification.categories.get(id)
	if (category !== undefined && PLACED_CATEGORIES.includes(category)) keys.add(LEDGER_RULES_KEY)
	return keys
}

/**
 * Collects the sentences that live messages made stale.
 *
 * @remarks
 * A sentence of a live message is stale when it shares an id or a number with a message that
 * amends it. An amending message takes effect while it is live, and keeps its effect after another
 * message supersedes it, so the value it replaced never revives. A user or tool message that the
 * input excludes or files quiet never takes effect.
 *
 * @param input - The exclusions and classification to read
 * @param byId - The messages by id
 * @param live - The live message ids from {@link collectLive}
 * @returns The stale sentences in conversation order, each with the tokens it shares
 *
 * @example
 * ```ts
 * collectStale(input, byId, ['user-1', 'user-3']) // [{ source: 'user-1', sentence: 1, tokens: ['ESC-2291'] }]
 * ```
 */
export function collectStale(
	input: LedgerProjectionInput,
	byId: ReadonlyMap<string, Message>,
	live: readonly string[],
): readonly LedgerStaleSentence[] {
	const { classification } = input
	const excluded = new Set(input.exclude)
	const effective = new Set([
		...live,
		...[...byId.values()]
			.filter(
				(message) =>
					message.role !== 'assistant' &&
					!excluded.has(message.id) &&
					!classification.quiet.has(message.id) &&
					(classification.superseded.get(message.id) ?? []).length > 0,
			)
			.map((message) => message.id),
	])
	const stale: LedgerStaleSentence[] = []
	for (const id of live) {
		const laters = (classification.amended.get(id) ?? [])
			.filter((later) => effective.has(later))
			.flatMap((later) => {
				const message = byId.get(later)
				return message === undefined ? [] : [extractTokens(message.content)]
			})
		if (laters.length === 0) continue
		for (const [sentence, text] of splitSentences(byId.get(id)?.content ?? '').entries()) {
			const own = extractTokens(text)
			const tokens = new Set<string>()
			for (const other of laters) {
				for (const token of own.ids) if (other.ids.has(token)) tokens.add(token)
				for (const token of own.numbers) if (other.numbers.has(token)) tokens.add(String(token))
			}
			if (tokens.size > 0) stale.push({ source: id, sentence, tokens: [...tokens] })
		}
	}
	return stale
}

/**
 * Builds the record lines of one message.
 *
 * @remarks
 * Each sentence that is not stale becomes a line. A sentence that opens with a pronoun and follows
 * another sentence takes the last name of the sentence before it that is neither an owner name nor
 * a system name, and its line text opens with that party and a colon.
 *
 * @param input - The classification whose topics the lines carry
 * @param byId - The messages by id
 * @param id - The message id
 * @param dead - The stale sentences as `SOURCE SENTENCE` keys
 * @param holders - The owner names, which never serve as a party
 * @param system - The system text's names, which never serve as a party
 * @returns The lines in sentence order; empty when the message is absent
 *
 * @example
 * ```ts
 * buildLines(input, byId, 'user-1', new Set(), [], []).map((line) => line.text)
 * // ['Odile Marlow phoned about BW-5512.', 'Odile Marlow: She wants a refund.']
 * ```
 */
export function buildLines(
	input: LedgerProjectionInput,
	byId: ReadonlyMap<string, Message>,
	id: string,
	dead: ReadonlySet<string>,
	holders: readonly string[],
	system: readonly string[],
): readonly LedgerLine[] {
	const message = byId.get(id)
	if (message === undefined) return []
	const sentences = splitSentences(message.content)
	const topics = input.classification.topics.get(id) ?? []
	return sentences.flatMap((sentence, at) => {
		if (dead.has(`${id} ${at}`)) return []
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
