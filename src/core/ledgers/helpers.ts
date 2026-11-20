import type { Skill } from '../contexts/types.js'
import type { JudgeQuestion, Message } from '../types.js'
import type {
	GaugeCall,
	LedgerAmendment,
	LedgerGauge,
	LedgerClassification,
	LedgerExchange,
	LedgerIndex,
	LedgerKey,
	LedgerLine,
	LedgerMatch,
	LedgerMatchBasis,
	LedgerLookupFinding,
	LedgerProjection,
	LedgerProjectionInput,
	LedgerRecord,
	LedgerRegistry,
	LedgerTopic,
} from './types.js'
import type { ToolDefinition } from '@orkestrel/tool'
import { canonicalStringify, isFiniteNumber, isString } from '@orkestrel/contract'
import { estimateMessages } from '../agents/helpers.js'
import { renderIndexEntry, renderSkillBody } from '../contexts/helpers.js'
import {
	collectToolGroups,
	estimateTokens,
	extractLiterals,
	hasCalls,
	renderJSON,
} from '../helpers.js'
import { isPositiveSafeInteger } from '../validators.js'
import {
	LEDGER_EXCHANGE_LIMIT,
	LEDGER_KEY_LIMIT,
	LEDGER_MATCH_BASES,
	LEDGER_OWNER_PREFIX,
	LEDGER_PREVIOUS_KEY,
	LEDGER_RULES_KEY,
	LEDGER_TAG_LIMIT,
	LEDGER_WORD,
	PLACED_CATEGORIES,
} from './constants.js'
import { LedgerError } from './errors.js'

/**
 * Digests tool definitions as the JSON a provider request carries them, in order.
 *
 * @remarks
 * A ledger stores this digest with its gauge and compares it at a hydrate and at each `respond`
 * call, so it reuses the gauge only for the same definitions: an added, removed, reordered, or
 * edited definition changes the digest. The digest is a {@link computeLedgerChecksum} checksum and
 * makes no security claim.
 *
 * @param definitions - The tool definitions, as a tool manager's `definitions` method returns them
 * @returns The 16-digit hexadecimal digest, or undefined when JSON cannot render the definitions
 * @example
 * ```ts
 * digestLedgerTools([{ name: 'lookup_order', description: 'Read an order by its id.' }]) // '1eff754a69b7128c'
 * ```
 */
export function digestLedgerTools(definitions: readonly ToolDefinition[]): string | undefined {
	const text = renderJSON(definitions)
	return text === undefined ? undefined : computeLedgerChecksum(text)
}

/**
 * Computes the tokens one estimate unit of a definition costs beyond the calibrated set.
 *
 * @remarks
 * The larger of `scale` and the calibrated set's overhead per estimate unit, or `scale` for an
 * empty set or one that estimates 0. A set's estimate is `estimateTokens` over its JSON text.
 *
 * @param calibrated - The definitions the gauge's overhead priced
 * @param gauge - The gauge's scale and overhead
 * @returns The tokens one estimate unit of a definition costs
 * @example
 * ```ts
 * computeToolDensity([], { scale: 1.1, overhead: 400 }) // 1.1
 * ```
 */
export function computeToolDensity(
	calibrated: readonly ToolDefinition[],
	gauge: LedgerGauge,
): number {
	const estimate = calibrated.length === 0 ? 0 : estimateTokens(JSON.stringify(calibrated))
	return estimate > 0 ? Math.max(gauge.scale, gauge.overhead / estimate) : gauge.scale
}

/**
 * Computes what a call's advertised set spares of the calibrated overhead and adds beyond it.
 *
 * @remarks
 * Definitions compare by their JSON text, so a definition replaced under its name by another text
 * is both left out and added. An empty advertised set spares the whole overhead. Otherwise the
 * calibrated definitions the call leaves out spare the lower of `scale` and the calibrated set's
 * overhead per estimate unit, times their estimate, so a credit never exceeds their proportional
 * share of the overhead; the definitions it advertises beyond the calibrated set add
 * {@link computeToolDensity}, the higher of the two, times theirs. A set's estimate is
 * `estimateTokens` over its JSON text, 0 for an empty set. The call's price is
 * `overhead - spared + added`.
 *
 * @param calibrated - The definitions the gauge's overhead priced
 * @param advertised - The definitions the call advertises
 * @param gauge - The gauge's scale and overhead
 * @returns The tokens the call spares and adds
 * @example
 * ```ts
 * computeToolPrice([], [], { scale: 1.1, overhead: 400 }) // { spared: 400, added: 0 }
 * ```
 */
export function computeToolPrice(
	calibrated: readonly ToolDefinition[],
	advertised: readonly ToolDefinition[],
	gauge: LedgerGauge,
): Required<Pick<GaugeCall, 'spared' | 'added'>> {
	if (advertised.length === 0) return { spared: gauge.overhead, added: 0 }
	const sent = new Set(advertised.map((definition) => JSON.stringify(definition)))
	const priced = new Set(calibrated.map((definition) => JSON.stringify(definition)))
	const hidden = calibrated.filter((definition) => !sent.has(JSON.stringify(definition)))
	const extra = advertised.filter((definition) => !priced.has(JSON.stringify(definition)))
	return {
		spared:
			hidden.length === 0
				? 0
				: Math.min(gauge.scale, gauge.overhead / estimateTokens(JSON.stringify(calibrated))) *
					estimateTokens(JSON.stringify(hidden)),
		added:
			extra.length === 0
				? 0
				: computeToolDensity(calibrated, gauge) * estimateTokens(JSON.stringify(extra)),
	}
}

/**
 * Computes the tokens loading a skill adds: its body, and the definitions it names beyond an advertised set.
 *
 * @remarks
 * The body is the text `renderSkillBody` renders, priced at `scale`, and a blank `content` renders
 * no body. The caller passes the definitions the skill names that the turn does not advertise,
 * priced as {@link computeToolPrice} prices an addition.
 *
 * @param skill - The skill to load
 * @param added - The definitions the skill names that the advertised set leaves out
 * @param calibrated - The definitions the gauge's overhead priced
 * @param gauge - The gauge's scale and overhead
 * @returns The tokens the load adds
 * @example
 * ```ts
 * computeSkillPrice({ name: 'refunds', content: 'Check the order first.' }, [], [], { scale: 1, overhead: 0 }) // 9
 * ```
 */
export function computeSkillPrice(
	skill: Pick<Skill, 'name' | 'content'>,
	added: readonly ToolDefinition[],
	calibrated: readonly ToolDefinition[],
	gauge: LedgerGauge,
): number {
	const body =
		skill.content.trim() === '' ? 0 : gauge.scale * estimateTokens(renderSkillBody(skill))
	return body + computeToolPrice(calibrated, [...calibrated, ...added], gauge).added
}

/**
 * Computes a checksum of text: two 32-bit FNV-1a lanes over its code points, as 16 hexadecimal digits.
 *
 * @remarks
 * The checksum detects an edit, can collide, and makes no security claim. Over ASCII text, the first
 * lane is the standard 32-bit FNV-1a hash.
 *
 * @param text - The text to checksum
 * @returns The 16-digit lowercase hexadecimal checksum
 * @example
 * ```ts
 * computeLedgerChecksum('a') // 'e40c292ce457465e'
 * ```
 */
export function computeLedgerChecksum(text: string): string {
	const hash = [...text].reduce(
		(prior, character) => {
			const code = character.codePointAt(0) ?? 0
			return {
				first: Math.imul(prior.first ^ code, 16777619) >>> 0,
				second: Math.imul(prior.second ^ code, 16777619) >>> 0,
			}
		},
		{ first: 2166136261, second: 3335557771 },
	)
	return hash.first.toString(16).padStart(8, '0') + hash.second.toString(16).padStart(8, '0')
}

/**
 * Collects stored messages eligible to open the recall offer.
 * @remarks
 * Notes, findings without a result, and findings {@link collectRetiredFindings} names do not open
 * the offer. User statements, including quiet statements available through recall's word route,
 * can open it; this helper does not filter results.
 * @param input - The messages, findings, and classification
 * @param requests - The marked request ids
 * @param notes - The annotation ids to exclude
 * @returns User statements, lookup findings with results that no write superseded and no later finding replaced, marked requests, and nonblank call-free replies
 * @example
 * ```ts
 * collectRecallMessages(input, new Set(), new Set()) // eligible stored messages
 * ```
 */
export function collectRecallMessages(
	input: LedgerProjectionInput,
	requests: ReadonlySet<string>,
	notes: ReadonlySet<string>,
): readonly Message[] {
	const retired = collectRetiredFindings(input.messages, input.findings)
	const findings = new Set(
		input.findings
			.filter((finding) => finding.result !== undefined && !retired.has(finding.id))
			.map((finding) => finding.id),
	)
	return input.messages.filter(
		(message) =>
			!notes.has(message.id) &&
			(requests.has(message.id) ||
				(message.role === 'assistant' && !hasCalls(message) && message.content.trim() !== '') ||
				(message.role === 'user' && !hasCalls(message)) ||
				(message.role === 'tool' && findings.has(message.id))),
	)
}

/**
 * Collects the statements of the current exchange: the user messages after the last request's
 * reply, or after the last request when it has no reply, that are neither requests nor notes.
 *
 * @remarks
 * Pass the messages stored before a request. With no request among them, every user message that is
 * not a note is a statement of the current exchange, as a seed's statements are before the first
 * request. A reply is what {@link collectLedgerReplies} selects for the last request.
 *
 * @param messages - The messages stored before a request, in conversation order
 * @param requests - The marked request ids
 * @param notes - The ledger note ids
 * @returns The current statements in conversation order
 * @example
 * ```ts
 * collectLedgerStatements(
 * 	[{ id: 'seed', role: 'user', content: 'Refunds need a manager.' }],
 * 	new Set(),
 * 	new Set(),
 * ).map((message) => message.id) // ['seed']
 * ```
 */
export function collectLedgerStatements(
	messages: readonly Message[],
	requests: ReadonlySet<string>,
	notes: ReadonlySet<string>,
): readonly Message[] {
	const previous = messages.findLast((message) => requests.has(message.id))
	const reply =
		previous === undefined
			? undefined
			: collectLedgerReplies(messages, requests, notes).get(previous.id)
	const start = previous === undefined ? 0 : messages.indexOf(reply ?? previous) + 1
	return messages
		.slice(start)
		.filter(
			(message) => message.role === 'user' && !requests.has(message.id) && !notes.has(message.id),
		)
}

/**
 * Collects the exchanges among messages, newest first: each marked request with the final call-free
 * reply {@link collectLedgerReplies} selects for it.
 *
 * @remarks
 * A request with no such reply makes no exchange, so the first exchange is the last one that has a
 * reply. The `recall` tool and {@link collectLedgerKeys} read the same list, so every exchange key
 * the Earlier index lists resolves.
 *
 * @param messages - Stored conversation messages in order, those before the request a key serves
 * @param requests - Marked request ids
 * @param notes - Ledger notes that separate answer passes
 * @returns The exchanges, newest first
 * @example
 * ```ts
 * collectLedgerExchanges(
 * 	[
 * 		{ id: 'first', role: 'user', content: 'Check OR-7.' },
 * 		{ id: 'reply', role: 'assistant', content: 'OR-7 ships Friday.' },
 * 		{ id: 'second', role: 'user', content: 'And OR-8?' },
 * 	],
 * 	new Set(['first', 'second']),
 * 	new Set(),
 * ).map((exchange) => exchange.request.id) // ['first']
 * ```
 */
export function collectLedgerExchanges(
	messages: readonly Message[],
	requests: ReadonlySet<string>,
	notes: ReadonlySet<string>,
): readonly LedgerExchange[] {
	const replies = collectLedgerReplies(messages, requests, notes)
	return messages
		.filter((message) => requests.has(message.id))
		.flatMap((request) => {
			const reply = replies.get(request.id)
			return reply === undefined ? [] : [{ request, reply }]
		})
		.reverse()
}

/**
 * Parses an exchange key into its depth: 1 for `previous`, and N for `previous-N`.
 *
 * @remarks
 * The key is read trimmed and in any case. A hyphen, a colon, or a space separates the depth, a
 * positive safe integer written without a leading zero. Any other key, `rules` included, is no
 * exchange key. An id that reads `PREVIOUS-2` parses as depth 2, so the exchange key wins and such
 * an id never takes an id row.
 *
 * @param key - A recall key, or one part of a joined key
 * @returns The depth, or `undefined` when the key is no exchange key
 * @example
 * ```ts
 * parseLedgerExchange('previous') // 1
 * parseLedgerExchange('Previous-3') // 3
 * parseLedgerExchange('previous-0') // undefined
 * ```
 */
export function parseLedgerExchange(key: string): number | undefined {
	const lowered = key.trim().toLowerCase()
	if (!lowered.startsWith(LEDGER_PREVIOUS_KEY)) return undefined
	const rest = lowered.slice(LEDGER_PREVIOUS_KEY.length)
	if (rest === '') return 1
	const digits = /^(?:\s*[-:]\s*|\s+)([1-9]\d*)$/.exec(rest)?.[1]
	const depth = digits === undefined ? undefined : Number(digits)
	return depth !== undefined && Number.isSafeInteger(depth) ? depth : undefined
}

/**
 * Names the exchange key of a depth: `previous` for 1, and `previous-N` for N.
 *
 * @remarks
 * It is the name {@link parseLedgerExchange} reads back to the same depth, and the one the Earlier
 * index and a `recall` listing write.
 *
 * @param depth - The exchange's depth, 1 for the last exchange that has a reply
 * @returns The exchange key
 * @example
 * ```ts
 * nameLedgerExchange(1) // 'previous'
 * nameLedgerExchange(3) // 'previous-3'
 * ```
 */
export function nameLedgerExchange(depth: number): string {
	return depth === 1 ? LEDGER_PREVIOUS_KEY : `${LEDGER_PREVIOUS_KEY}-${depth}`
}

/**
 * Collects the recall keys of what a request leaves behind: the messages before it that `recall`
 * can list and that `excluded` does not hold.
 *
 * @remarks
 * The population is what {@link collectRecallMessages} returns before the request, and the earlier
 * messages are the population less `excluded`. A request the messages don't hold counts every
 * message as before it. Every key lists at least one earlier message. The keys come in this order:
 *
 * - at most `LEDGER_EXCHANGE_LIMIT` exchange keys, one per exchange {@link collectLedgerExchanges}
 *   returns whose request and reply `excluded` does not both hold, oldest first: the deepest
 *   `previous-N` first and `previous`, the last exchange that has a reply, last, each named by its
 *   depth among all the exchanges, so a shown exchange leaves a gap and the names stay stable. Each
 *   description names no request text: how far back the exchange is, then the tags of its user side,
 *   its request and the statements before it that are not quiet: up to `LEDGER_TAG_LIMIT` registry
 *   ids `input.entities` names, each with its owner's first name unless an earlier id of the row gave
 *   that name, then the desk topics filed for them, then `rule` or `correction` when a statement was
 *   filed so;
 * - `rules`, when a line of the rules record comes from an earlier message;
 * - at most `LEDGER_KEY_LIMIT` ids an earlier message carries, as `extractLiterals` reads them, but
 *   none that reads as an exchange key: first the ids of the current statements that are earlier,
 *   newest statement first; then the ids the request and the current statements name; then the ids
 *   a lookup named, newest finding first; then the ids that hold a letter and that at least 2
 *   messages of the population carry, the most carried first and a tie going to the newest;
 * - one key per desk topic, in topic order, that an earlier message other than a request files
 *   under, unless an id key holds its name.
 *
 * An id's rank reads the population, so leaving a current statement out moves no other id; its
 * count reads the earlier messages. A statement the judge filed quiet carries no id a lookup named,
 * because `recall` lists it only by words. The current statements are what
 * {@link collectLedgerStatements} returns for the messages before the request. An id key's
 * description holds its owner's names, when the id is an owner's, and its count of earlier messages;
 * a topic key's holds the topic's criterion.
 *
 * @param input - The messages, findings, owners, and classification
 * @param projection - The records projected from `input`, whose rules record the `rules` key lists
 * @param topics - The desk topics
 * @param request - The request id; only messages before it count
 * @param requests - The marked request ids
 * @param notes - The ledger note ids
 * @param excluded - The ids of the messages the prompt carries, which `recall` does not list
 * @returns The keys in order
 * @example
 * ```ts
 * collectLedgerKeys(input, projection, [], 'request', new Set(['first', 'request']), new Set(), new Set(['request']))
 * // [{ name: 'previous', description: 'your last answered request and your reply to it' }, …]
 * ```
 */
export function collectLedgerKeys(
	input: LedgerProjectionInput,
	projection: LedgerProjection,
	topics: readonly LedgerTopic[],
	request: string,
	requests: ReadonlySet<string>,
	notes: ReadonlySet<string>,
	excluded: ReadonlySet<string>,
): readonly LedgerKey[] {
	const at = input.messages.findIndex((message) => message.id === request)
	const before = at < 0 ? input.messages : input.messages.slice(0, at)
	const positions = new Map(before.map((message, index) => [message.id, index]))
	const population = collectRecallMessages(input, requests, notes).filter((message) =>
		positions.has(message.id),
	)
	const earlier = population.filter((message) => !excluded.has(message.id))
	const registry = collectRegistry(input.findings)
	const quiet = input.classification.quiet
	const carried = new Map(
		population.map((message) => [
			message.id,
			[...extractLiterals(message.content).ids].filter(
				(id) =>
					!registry.ids.has(id) ||
					message.role !== 'user' ||
					requests.has(message.id) ||
					!quiet.has(message.id),
			),
		]),
	)
	const total = new Map(
		[
			...Map.groupBy(
				population.flatMap((message) => carried.get(message.id) ?? []),
				(id) => id,
			),
		].map(([id, all]) => [id, all.length]),
	)
	const listed = new Map(
		[
			...Map.groupBy(
				earlier.flatMap((message) => carried.get(message.id) ?? []),
				(id) => id,
			),
		].map(([id, all]) => [id, all.length]),
	)
	// A later message overwrites an earlier one, so each id maps to the newest message carrying it.
	const newest = new Map(
		population.flatMap((message) =>
			(carried.get(message.id) ?? []).map((id) => [id, positions.get(message.id) ?? 0] as const),
		),
	)
	const statements = collectLedgerStatements(before, requests, notes)
	const cut = statements
		.filter((message) => !excluded.has(message.id))
		.toReversed()
		.flatMap((message) => [...extractLiterals(message.content).ids])
	const named = [
		...extractLiterals(at < 0 ? '' : (input.messages[at]?.content ?? '')).ids,
		...statements.toReversed().flatMap((message) => [...extractLiterals(message.content).ids]),
	]
	const looked = input.findings
		.toReversed()
		.flatMap((finding) =>
			finding.result === undefined
				? []
				: [...finding.result.ids, ...finding.result.owners.map((owner) => owner.id)],
		)
	const recurring = [...total]
		.filter(([id, count]) => count >= 2 && /\p{L}/u.test(id))
		.toSorted(
			([left, many], [right, more]) =>
				more - many || (newest.get(right) ?? 0) - (newest.get(left) ?? 0),
		)
		.map(([id]) => id)
	const ids = [...new Set([...cut, ...named, ...looked, ...recurring])]
		.filter((id) => (listed.get(id) ?? 0) > 0 && parseLedgerExchange(id) === undefined)
		.slice(0, LEDGER_KEY_LIMIT)
	// Exchange rows cover only the exchanges the prompt doesn't carry, each named by its depth among all
	// of them, so a shown exchange leaves its depth unused and the names stay stable.
	const exchanges = collectLedgerExchanges(before, requests, notes)
		.map((exchange, index) => ({ exchange, depth: index + 1 }))
		.filter(
			({ exchange }) => !excluded.has(exchange.request.id) || !excluded.has(exchange.reply.id),
		)
		.slice(0, LEDGER_EXCHANGE_LIMIT)
	const links = linkOwners(input.findings, registry.owners)
	const held = new Set(earlier.map((message) => message.id))
	const ruled = projection.records.some(
		(record) =>
			record.key === LEDGER_RULES_KEY && record.lines.some((line) => held.has(line.source)),
	)
	const filed = new Set(
		earlier
			.filter((message) => !requests.has(message.id) && !quiet.has(message.id))
			.flatMap((message) => input.classification.topics.get(message.id) ?? []),
	)
	const taken = new Set(ids)
	return [
		...exchanges
			.map(({ exchange, depth }) => {
				// The exchange's user side: the statements before its request that are not quiet, then the request.
				const stated = collectLedgerStatements(
					before.slice(0, positions.get(exchange.request.id) ?? 0),
					requests,
					notes,
				).filter((message) => !quiet.has(message.id))
				const side = [...stated, exchange.request]
				const tagged = [...new Set(side.flatMap((message) => input.entities.get(message.id) ?? []))]
					.slice(0, LEDGER_TAG_LIMIT)
					.reduce<{ readonly named: ReadonlySet<string>; readonly tags: readonly string[] }>(
						(state, id) => {
							const name = input.owners.get(
								registry.owners.has(id) ? id : (links.get(id) ?? ''),
							)?.[0]
							return name === undefined || state.named.has(name)
								? { named: state.named, tags: [...state.tags, id] }
								: {
										named: new Set([...state.named, name]),
										tags: [...state.tags, `${id} (${name})`],
									}
						},
						{ named: new Set(), tags: [] },
					).tags
				const filedSide = new Set(
					side.flatMap((message) => input.classification.topics.get(message.id) ?? []),
				)
				const categories = PLACED_CATEGORIES.filter((category) =>
					stated.some((message) => input.classification.categories.get(message.id) === category),
				)
				return {
					name: nameLedgerExchange(depth),
					description: [
						depth === 1
							? 'your last answered request and your reply to it'
							: `your request and reply ${depth} exchanges ago`,
						tagged.join(', '),
						topics
							.filter((topic) => filedSide.has(topic.name))
							.map((topic) => topic.name)
							.join(', '),
						categories.join(', '),
					]
						.filter((part) => part !== '')
						.join('; '),
				}
			})
			.reverse(),
		...(ruled
			? [
					{
						name: LEDGER_RULES_KEY,
						description: 'the standing rules and corrections stated earlier',
					},
				]
			: []),
		...ids.map((id) => {
			const count = listed.get(id) ?? 0
			const owners = input.owners.get(id) ?? []
			const tally = `${count} earlier ${count === 1 ? 'message' : 'messages'}`
			return {
				name: id,
				description: owners.length === 0 ? tally : `${owners.join(', ')}; ${tally}`,
			}
		}),
		...topics
			.filter((topic) => filed.has(topic.name) && !taken.has(topic.name))
			.map((topic) => ({ name: topic.name, description: topic.criterion })),
	]
}

/**
 * Renders the Earlier index a request copy carries: its heading, how to read it, one line per key,
 * and a closing line, or empty text for no key.
 *
 * @remarks
 * The instruction line says what the rows are, when to call `recall` with a key or with joined keys,
 * and when to answer without it. Each key renders through `renderIndexEntry`, as
 * `- NAME: DESCRIPTION` on one line. The instruction and closing lines state no count, so they never
 * disagree with the keys between them.
 *
 * @param keys - The keys in order, as {@link collectLedgerKeys} returns them
 * @returns The index text, or `''` when `keys` is empty
 * @example
 * ```ts
 * renderLedgerKeys([{ name: 'previous', description: 'your last answered request and your reply to it' }])
 * // "## Earlier\nThese earlier exchanges and items are stored, not shown. If the request depends on one you can't see, call recall with its key, or join several keys with commas. If the messages you see are enough, answer without recall.\n- previous: your last answered request and your reply to it\nOther ids, names, and words from a message work too."
 * ```
 */
export function renderLedgerKeys(keys: readonly LedgerKey[]): string {
	if (keys.length === 0) return ''
	return [
		'## Earlier',
		"These earlier exchanges and items are stored, not shown. If the request depends on one you can't see, call recall with its key, or join several keys with commas. If the messages you see are enough, answer without recall.",
		...keys.map((key) => renderIndexEntry(key)),
		'Other ids, names, and words from a message work too.',
	].join('\n')
}

/**
 * Collects the earlier user messages that match a request, best first: the statements and request turns `excluded` does not show, each matched on the request's ids, the ids it inherits, its desk topics, or the words it shares.
 *
 * @remarks
 * The query is the request's own ids, the literal ids its text carries and the registry ids and
 * owners `input.entities` names, its filed topics, and its words. When no statement left out carries
 * an id the request names, the query adds the ids of the last answered request, and a match on them
 * ranks below one on the request's own. A candidate is a user message before the request that is no
 * note, not quiet, and not in `excluded`:
 *
 * - a superseded candidate stands for its newest successor, and drops when that successor is in
 *   `excluded` or is no candidate;
 * - a candidate the judge filed no category for drops when a newer message `excluded` holds carries
 *   every word it counts;
 * - a candidate brings the amenders {@link scanAmendments} admits, and a message one match brings is
 *   no match of its own.
 *
 * A word counts when fewer than half of the user messages up to and including the request carry it,
 * shown ones too, and a candidate's score sums `log(carried / carriers)` over the counted words it
 * shares with the request. The matches rank by basis in `LEDGER_MATCH_BASES` order, then statements
 * before request turns, then newest first by the request each one precedes, so one turn's
 * statements are equally new, then rules and corrections first, then the higher score, then the
 * later message. Shared words rank last, so they fill only the places the other bases leave.
 *
 * @param input - The messages, owners, entities, and classification
 * @param request - The request id; only messages before it are candidates
 * @param requests - The marked request ids
 * @param notes - The ledger note ids
 * @param excluded - The ids of the messages the opening already shows, the request's among them
 * @returns The matches, best first
 * @example
 * ```ts
 * collectLedgerMatches(input, 'request', new Set(['first', 'request']), new Set(), new Set(['request']))
 * // [{ source: 'stated', members: ['stated'], basis: 'entity', score: 0 }, …]
 * ```
 */
export function collectLedgerMatches(
	input: LedgerProjectionInput,
	request: string,
	requests: ReadonlySet<string>,
	notes: ReadonlySet<string>,
	excluded: ReadonlySet<string>,
): readonly LedgerMatch[] {
	const at = input.messages.findIndex((message) => message.id === request)
	const before = at < 0 ? input.messages : input.messages.slice(0, at)
	const asked = at < 0 ? [] : input.messages.slice(at, at + 1)
	const classification = input.classification
	const positions = new Map(before.map((message, index) => [message.id, index]))
	const users = before.filter(
		(message) => message.role === 'user' && !hasCalls(message) && !notes.has(message.id),
	)
	const carried = new Map(
		[...users, ...asked].map((message) => [
			message.id,
			new Set([...extractLiterals(message.content).ids, ...(input.entities.get(message.id) ?? [])]),
		]),
	)
	const own = carried.get(request) ?? new Set<string>()
	const candidates = users.filter(
		(message) => !excluded.has(message.id) && !classification.quiet.has(message.id),
	)
	const eligible = new Set(candidates.map((message) => message.id))
	// The last answered request's ids join the query only when no statement left out carries one the
	// request names.
	const named = candidates.some(
		(message) =>
			!requests.has(message.id) && [...(carried.get(message.id) ?? [])].some((id) => own.has(id)),
	)
	const last = named ? undefined : collectLedgerExchanges(before, requests, notes)[0]?.request
	const inherited = new Set(
		[...(last === undefined ? [] : (carried.get(last.id) ?? []))].filter((id) => !own.has(id)),
	)
	const topics = new Set(classification.topics.get(request) ?? [])
	// Each user message's words, up to and including the request, shown ones too.
	const words = new Map(
		[...users, ...asked].map((message) => [
			message.id,
			new Set((message.content.match(LEDGER_WORD) ?? []).map((run) => normalizeWord(run))),
		]),
	)
	const carriers = new Map(
		[
			...Map.groupBy(
				[...words.values()].flatMap((set) => [...set]),
				(word) => word,
			),
		].map(([word, all]) => [word, all.length]),
	)
	const query = [...(words.get(request) ?? [])].filter(
		(word) => (carriers.get(word) ?? 0) < words.size / 2,
	)
	const shown = users.filter((message) => excluded.has(message.id))
	const starts = before.flatMap((message, index) => (requests.has(message.id) ? [index] : []))
	const found = candidates.flatMap((message) => {
		// A superseded candidate stands for its newest successor.
		const source = classification.supersessions.has(message.id)
			? Array.from({ length: before.length }).reduce<string>(
					(id) => classification.supersessions.get(id)?.at(-1) ?? id,
					message.id,
				)
			: message.id
		if (source !== message.id && !eligible.has(source)) return []
		const ids = [...(carried.get(source) ?? [])]
		const counted = query.filter((word) => words.get(source)?.has(word) === true)
		const score = counted.reduce(
			(sum, word) => sum + Math.log(words.size / (carriers.get(word) ?? 1)),
			0,
		)
		const basis: LedgerMatchBasis | undefined = ids.some((id) => own.has(id))
			? 'entity'
			: ids.some((id) => inherited.has(id))
				? 'inherited'
				: (classification.topics.get(source) ?? []).some((topic) => topics.has(topic))
					? 'topic'
					: score > 0
						? 'word'
						: undefined
		const position = positions.get(source) ?? 0
		// An unfiled candidate whose counted words a newer shown message carries is stale.
		const stale =
			!classification.categories.has(source) &&
			counted.length > 0 &&
			shown.some(
				(newer) =>
					(positions.get(newer.id) ?? 0) > position &&
					counted.every((word) => words.get(newer.id)?.has(word) === true),
			)
		if (basis === undefined || stale) return []
		const category = classification.categories.get(source)
		return [
			{
				source,
				basis,
				score,
				position,
				statement: !requests.has(source),
				turn: starts.filter((start) => start < position).length,
				ruled: category !== undefined && PLACED_CATEGORIES.includes(category),
			},
		]
	})
	const ranked = [...new Map(found.map((item) => [item.source, item])).values()].toSorted(
		(left, right) =>
			LEDGER_MATCH_BASES.indexOf(left.basis) - LEDGER_MATCH_BASES.indexOf(right.basis) ||
			Number(right.statement) - Number(left.statement) ||
			right.turn - left.turn ||
			Number(right.ruled) - Number(left.ruled) ||
			right.score - left.score ||
			right.position - left.position,
	)
	// Best first, each match claims its amenders, so a lower match never shows them again.
	return ranked.reduce<{
		readonly claimed: ReadonlySet<string>
		readonly matches: readonly LedgerMatch[]
	}>(
		(state, item) => {
			if (state.claimed.has(item.source)) return state
			const members = scanAmendments(
				classification.amendments,
				item.source,
				(id) => eligible.has(id) && !state.claimed.has(id),
			)
			return {
				claimed: new Set([...state.claimed, ...members]),
				matches: [
					...state.matches,
					{ source: item.source, members, basis: item.basis, score: item.score },
				],
			}
		},
		{ claimed: new Set(), matches: [] },
	).matches
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
 * @param key - The recall key to price
 * @returns The assistant message carrying the recall call
 * @example
 * ```ts
 * buildRecallMessage('refunds').calls?.[0]?.arguments // { key: 'refunds' }
 * ```
 */
export function buildRecallMessage(key: string): Message {
	return {
		id: 'call',
		role: 'assistant',
		content: '',
		calls: [{ id: 'call_00000000', name: 'recall', arguments: { key } }],
	}
}

/**
 * Builds the copy of a request turn that carries the Earlier index ahead of the request.
 * @param request - The stored request message
 * @param index - The Earlier index {@link renderLedgerKeys} renders, or empty text when nothing renders
 * @returns The request with its content set to the index, a `## Request` heading, and the request content, or the request itself when the index is empty
 * @example
 * ```ts
 * buildRequestMessage({ id: 'request', role: 'user', content: 'Check BW-5512.' }, '## Earlier\n- previous: your last answered request and your reply to it').content
 * // '## Earlier\n- previous: your last answered request and your reply to it\n\n## Request\nCheck BW-5512.'
 * ```
 */
export function buildRequestMessage(request: Message, index: string): Message {
	if (index === '') return request
	return { ...request, content: `${index}\n\n## Request\n${request.content}` }
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
 * Collects the candidate keys of a judge question: a choice's criteria keys in their order, a
 * score's level indexes as text, and `true` and `false` for a noul.
 *
 * @remarks
 * A refused judgment lists these keys as `missing`, because a refused question has no reading for
 * any candidate.
 *
 * @param question - The question whose candidates to list
 * @returns The candidate keys, in the order a reading names them
 * @example
 * ```ts
 * collectQuestionKeys({ form: 'noul' }) // ['true', 'false']
 * ```
 */
export function collectQuestionKeys(question: JudgeQuestion): readonly string[] {
	if (question.form === 'noul') return ['true', 'false']
	if (question.form === 'choice') return Object.keys(question.criteria)
	return Array.from(question.criteria.keys(), (level) => String(level))
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
 * Finds the first cut in a range whose probe returns a value, by bisection.
 *
 * @param low - The first cut to try; 0 tries that cut alone before any bisection
 * @param high - The end of the range, which the search never probes
 * @param probe - Reads a cut and returns its value when the cut fits, or undefined when it does not
 * @param found - The value of the earliest fitting cut the search has probed
 * @returns The value of the fitting cut the search lands on, or undefined when none fits
 * @remarks
 * A range of `S` cuts takes at most `ceil(log2(S)) + 1` probes and one probe when cut 0 fits. The
 * cut it lands on is the range's first fitting cut while no cut past a fitting cut stops fitting.
 * @example
 * ```ts
 * findLedgerCut(0, 8, (cut) => (cut >= 3 ? cut : undefined)) // 3
 * ```
 */
export function findLedgerCut<T>(
	low: number,
	high: number,
	probe: (cut: number) => T | undefined,
	found?: T,
): T | undefined {
	if (low >= high) return found
	if (low === 0) return probe(0) ?? findLedgerCut(1, high, probe)
	const middle = Math.floor((low + high) / 2)
	const value = probe(middle)
	return value === undefined
		? findLedgerCut(middle + 1, high, probe, found)
		: findLedgerCut(low, middle, probe, value)
}

/**
 * Checks the generation cap against the context capacity and returns it.
 *
 * @param predict - The generation cap in tokens; see {@link LedgerOptions}
 * @param capacity - The context capacity in tokens
 * @returns The cap
 * @throws {LedgerError} Thrown when the cap is not a positive safe integer less than capacity (code `'CAPACITY'`)
 * @example
 * ```ts
 * requirePredict(1024, 4096) // 1024
 * ```
 */
export function requirePredict(predict: number, capacity: number): number {
	if (!isPositiveSafeInteger(predict) || predict >= capacity)
		throw new LedgerError(
			'CAPACITY',
			`predict must be a positive safe integer less than capacity ${capacity}: the generation cap in tokens each request reserves for the reply`,
		)
	return predict
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
 * {@link identifyLookup} and {@link linkOwners} read an argument through this one form, so a finding
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
 * Identifies a lookup finding for projection by its tool name and normalized arguments.
 *
 * @remarks
 * Two calls share an identity whatever the key order of their arguments at any depth. A top-level
 * string argument passes through {@link normalizeArgument} first, so `"lh-1 "` and `"LH-1"` name one call.
 * The ledger's repeat stop instead compares the tool name and canonical arguments without this
 * string normalization, so those argument spellings remain distinct within a request.
 * An uncanonicalizable call has no identity and neither replaces nor is replaced by another finding.
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
 * finding's text names. An empty finding links nothing, and a later finding overwrites an earlier
 * link of the same argument.
 *
 * @param findings - The lookup findings in conversation order
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
	findings: readonly LedgerLookupFinding[],
	owners: ReadonlyMap<string, readonly string[]>,
): ReadonlyMap<string, string> {
	// A later pair of the same argument overwrites an earlier one, as the `Map` constructor does. The
	// spread visits a hole in `findings` as an undefined finding, as iteration does; `flatMap` skips it.
	return new Map(
		[...findings].flatMap((finding) => {
			if (finding.result === undefined) return []
			const named = [...extractLiterals(finding.text).ids].filter((id) => owners.has(id))
			const [only] = named
			return Object.values(finding.arguments)
				.filter(isString)
				.map((value) => normalizeArgument(value))
				.filter((subject) => extractLiterals(subject).ids.has(subject))
				.flatMap((subject) => {
					if (owners.has(subject)) return [[subject, subject] as const]
					return named.length === 1 && only !== undefined ? [[subject, only] as const] : []
				})
		}),
	)
}

/**
 * Collects the ids and the owner names the lookup findings named.
 *
 * @remarks
 * Every finding counts, a replaced one included, because an id a lookup named stays registered.
 * An empty finding names nothing. An owner name is trimmed, and a name without a letter is dropped.
 *
 * @param findings - The lookup findings in conversation order
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
export function collectRegistry(findings: readonly LedgerLookupFinding[]): LedgerRegistry {
	// The spread and `Array.from` visit a hole in `findings` or in an owner list as an undefined
	// entry, as iteration does; `flatMap` and `map` skip it.
	const results = [...findings].flatMap((finding) =>
		finding.result === undefined ? [] : [finding.result],
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
 * Normalizes a run of letters and digits to the one form each of its cases folds to.
 *
 * @remarks
 * The word is one run as {@link LEDGER_WORD} matches it, not a `carriers` word split on whitespace.
 * The lowercase comes first and last so a capital sharp s, a long s, and a Greek final sigma each
 * reach the form of their plain letters.
 *
 * @param word - The run to normalize
 * @returns The run's one form
 *
 * @example
 * ```ts
 * normalizeWord('ΟΔΟΣ') // 'οδος'
 * normalizeWord('ſtudio') // 'studio'
 * ```
 */
export function normalizeWord(word: string): string {
	return word.toLowerCase().toUpperCase().toLowerCase()
}

/**
 * Builds a registry's matching index: each name's owners, each word's carriers, the needles, keys, and ranks.
 *
 * @remarks
 * The index holds the registry's own `ids` set. A needle escapes its text's pattern characters and
 * matches at word edges: a whole name in any case, and a capitalized name word that only one name
 * carries in its own case, so a common word that spells a first name does not. `keys` enters each
 * name under its least-carried run of {@link LEDGER_WORD}, a tie going to its first run, and under
 * each word its word needles hold. `ranks` holds each id's and each name's position, so
 * {@link matchEntities} returns registry order whatever order a text names them in.
 *
 * @param registry - The registry to index
 * @returns The index, which {@link matchEntities} reads without building anything
 * @throws {TypeError} Thrown when an owner's name list holds a hole
 *
 * @example
 * ```ts
 * const index = buildLedgerIndex({ ids: new Set(['BW-20931']), owners: new Map([['BW-20931', ['Brightwater Studio']]]) })
 * // index.aliases is Map { 'Brightwater Studio' => ['BW-20931'] }
 * ```
 */
export function buildLedgerIndex(registry: LedgerRegistry): LedgerIndex {
	// `Array.from` visits a hole in an owner's names as an undefined name, as iteration does; `map` skips it.
	const aliases = new Map(
		[
			...Map.groupBy(
				[...registry.owners].flatMap(([id, names]) => Array.from(names, (name) => ({ name, id }))),
				(entry) => entry.name,
			),
		].map(([name, entries]) => [name, entries.map((entry) => entry.id)]),
	)
	// A word's carriers are the distinct names it appears in.
	const carriers = new Map(
		[
			...Map.groupBy(
				[...aliases.keys()].flatMap((name) =>
					[...new Set(name.split(/\s+/))].map((word) => ({ word, name })),
				),
				(entry) => entry.word,
			),
		].map(([word, entries]) => [word, entries.map((entry) => entry.name)]),
	)
	// Neither flag set carries `g` or `y`, so a shared needle keeps no `lastIndex` between tests.
	const needles = [...aliases.keys()].flatMap((name) =>
		[
			{ name, needle: name, whole: true },
			...name
				.split(/\s+/)
				.filter((word) => /^\p{Lu}\p{L}+$/u.test(word) && carriers.get(word)?.length === 1)
				.map((word) => ({ name, needle: word, whole: false })),
		].map((entry) => ({
			...entry,
			pattern: new RegExp(
				`(?<![\\p{L}\\p{N}])${entry.needle.replace(/[.*+?^$()|{}[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`,
				entry.whole ? 'iu' : 'u',
			),
		})),
	)
	const unique = Map.groupBy(
		needles.filter((entry) => !entry.whole),
		(entry) => entry.name,
	)
	const runs = new Map(
		[...aliases.keys()].map((name) => [
			name,
			[...new Set((name.match(LEDGER_WORD) ?? []).map((run) => normalizeWord(run)))],
		]),
	)
	const counts = new Map(
		[...Map.groupBy([...runs.values()].flat(), (run) => run)].map(([run, names]) => [
			run,
			names.length,
		]),
	)
	// A stable sort gives a tie to the run that comes first in the name.
	const keyed = [...runs].flatMap(([name, held]) => {
		const anchor = held
			.toSorted((left, right) => (counts.get(left) ?? 0) - (counts.get(right) ?? 0))
			.slice(0, 1)
		const words = (unique.get(name) ?? []).map((entry) => normalizeWord(entry.needle))
		return [...new Set([...anchor, ...words])].map((key) => ({ key, name }))
	})
	return {
		ids: registry.ids,
		aliases,
		carriers,
		names: new Map(
			needles.filter((entry) => entry.whole).map((entry) => [entry.name, entry.pattern]),
		),
		words: new Map(
			[...unique].map(([name, entries]) => [name, entries.map((entry) => entry.pattern)]),
		),
		keys: new Map(
			[...Map.groupBy(keyed, (entry) => entry.key)].map(([key, entries]) => [
				key,
				entries.map((entry) => entry.name),
			]),
		),
		ranks: {
			ids: new Map([...registry.ids].map((id, at) => [id, at])),
			names: new Map([...aliases.keys()].map((name, at) => [name, at])),
		},
	}
}

/**
 * Matches the registry ids and owners a text names.
 *
 * @remarks
 * An id counts when the text holds it as an id token. An owner counts when the text holds one of
 * its names whole. With `partial`, a capitalized name word that only one name carries also names
 * that name's owners, matched case-sensitively so a common word that spells a first name does not.
 * The text's words select candidates through `keys`, and the needles confirm each candidate. A
 * pure-ASCII text takes one lowercase, which equals {@link normalizeWord} on ASCII. Any other text
 * folds run by run, because folding it whole would read a final sigma across a run's edge.
 *
 * The lookup carries two limits. U+0345 folds to iota under the needles' `iu` flags but is no
 * letter, so a text or a name using it in iota's place can pass the needle and miss the key. A name
 * holding no letter or digit run has no key and never matches; {@link collectRegistry} keeps no
 * such name, so only a hand-built registry reaches that limit. The fold was proven on Node 22's
 * Unicode data; a browser's tables are unread.
 *
 * @param index - The registry's index, from {@link buildLedgerIndex}
 * @param text - The text to read
 * @param partial - If `true`, a name word only one name carries also names its owners; if `false`, only a whole name does
 * @returns The registry ids and owner ids the text names
 *
 * @example
 * ```ts
 * const index = buildLedgerIndex({ ids: new Set(['BW-20931']), owners: new Map([['BW-20931', ['Brightwater Studio']]]) })
 * matchEntities(index, 'Ask Brightwater about it', true) // Set { 'BW-20931' }
 * matchEntities(index, 'Ask Brightwater about it', false) // Set {}
 * ```
 */
export function matchEntities(
	index: LedgerIndex,
	text: string,
	partial: boolean,
): ReadonlySet<string> {
	const ids = [...extractLiterals(text).ids]
		.filter((id) => index.ids.has(id))
		.toSorted((left, right) => (index.ranks.ids.get(left) ?? 0) - (index.ranks.ids.get(right) ?? 0))
	if (index.keys.size === 0) return new Set(ids)
	const runs: readonly string[] = /\P{ASCII}/u.test(text)
		? (text.match(LEDGER_WORD) ?? []).map((run) => normalizeWord(run))
		: (text.toLowerCase().match(LEDGER_WORD) ?? [])
	const names = [...new Set(runs.flatMap((run) => index.keys.get(run) ?? []))]
		.filter(
			(name) =>
				index.names.get(name)?.test(text) === true ||
				(partial && (index.words.get(name) ?? []).some((needle) => needle.test(text))),
		)
		.toSorted(
			(left, right) => (index.ranks.names.get(left) ?? 0) - (index.ranks.names.get(right) ?? 0),
		)
	return new Set([...ids, ...names.flatMap((name) => index.aliases.get(name) ?? [])])
}

/**
 * Projects the owner records and the rules record from a conversation's messages.
 *
 * @remarks
 * Each line is a sentence of a live message, verbatim except that a sentence that opens with a
 * pronoun opens with its party and a colon. {@link collectLive} retains user messages and the
 * earliest finding in each call identity's last run of identical text, subject to exclusions,
 * quiet classification, and supersessions. An undefined result still replaces the earlier finding.
 *
 * A live message joins the owner records its entities name, directly or through a linked lookup
 * argument. A message that names no owner joins where its earlier side of an amendment pair joins,
 * or on the rules record when it is filed as a rule or a correction, and is an orphan otherwise.
 *
 * Every live sentence is retained. Accepted edges are listed in `amendments`. An amender that is
 * superseded points to its newest live successor, or retains its endpoint when none exists.
 *
 * A sentence that opens with a pronoun takes the party named in the sentence before it. The reading
 * trusts capitals, so a capitalized word that is no person, such as a carrier named mid-sentence,
 * is read as the party. This is a documented limit: the prefix carries
 * the follow-up facts the records exist for.
 *
 * @param input - The messages, findings, entities, and classification to project
 * @returns The records with owner records ordered by their first member and the rules record last, the accepted amendments, and the live message ids no record placed
 *
 * @example
 * ```ts
 * const projection = buildRecords({
 * 	system: 'You staff the desk.',
 * 	exclusions: [],
 * 	owners: new Map([['BW-20931', ['Brightwater Studio']]]),
 * 	messages: [{ id: 'user-1', role: 'user', content: 'Brightwater Studio asked for a refund.' }],
 * 	findings: [],
 * 	entities: new Map([['user-1', ['BW-20931']]]),
 * 	classification: { quiet: new Set(), categories: new Map(), topics: new Map(), amendments: new Map(), supersessions: new Map() },
 * })
 * // projection.records[0].title === 'Brightwater Studio (BW-20931)'
 * ```
 */
export function buildRecords(input: LedgerProjectionInput): LedgerProjection {
	const position = new Map(input.messages.map((message, at) => [message.id, at]))
	const byId = new Map(input.messages.map((message) => [message.id, message]))
	const live = collectLive(input)
	const links = linkOwners(input.findings, input.owners)
	const amended = new Map(
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
		keys: placeMember(input, links, amended, id, new Set(), settled),
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
				key === LEDGER_RULES_KEY ? 'Rules' : holder === undefined ? owner : `${holder} (${owner})`
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
 * Splits a recall key at its joints.
 *
 * @remarks
 * The joints are a comma, a semicolon, a slash, and the word `and`. A key with no joint is
 * returned whole, so a model that joins a name and an id recalls each part alone.
 *
 * @param key - The key the model asked for
 * @returns The trimmed, non-empty parts when there are at least 2; otherwise the key itself
 *
 * @example
 * ```ts
 * splitKey('BW-5512, Odile Marlow and refunds') // ['BW-5512', 'Odile Marlow', 'refunds']
 * ```
 */
export function splitKey(key: string): readonly string[] {
	const parts = key
		.split(/\s*[,;/]\s*|\s+and\s+/i)
		.map((part) => part.trim())
		.filter((part) => part !== '')
	return parts.length > 1 ? parts : [key]
}

/**
 * Cuts entries to a room and names how many it left out.
 *
 * @remarks
 * By default the cut keeps at least one entry. With `first: false`, it keeps whole entries only
 * when the joined result, tool framing, and omission line fit, and considers later entries after
 * an oversized group. When it leaves some entries out, its last line reads
 * `N older items not shown; name a narrower key to narrow the recall`, which
 * {@link matchesCutLine} recognizes. Pass `more` when the entries aren't in age order, so the line
 * doesn't claim an omitted entry is older than a kept one. A fitted cut also uses `more` when it
 * skips an entry before a kept one. With no kept entry it reads
 * `N older items didn't fit in this request; answer from the messages you can see`.
 *
 * @param entries - The entries in the order they are kept
 * @param room - The estimate units the joined entries can take
 * @param kind - What the cut line calls an omitted entry. Default: `older`
 * @param first - If `true`, keeps the first entry regardless of room; if `false`, fits every entry and the omission line. Default: `true`
 * @returns The kept entries followed by the cut line when any were left out, joined by newlines
 *
 * @example
 * ```ts
 * cutListing(['first entry', 'second entry'], 1) // 'first entry\n1 older item not shown; name a narrower key to narrow the recall'
 * ```
 */
export function cutListing(
	entries: readonly string[],
	room: number,
	kind: 'older' | 'more' = 'older',
	first = true,
): string {
	if (!first) {
		if (estimateMessages([{ id: 'recall', role: 'tool', content: entries.join('\n') }]) <= room)
			return entries.join('\n')
		const kept = entries.reduce<readonly number[]>((accepted, entry, at) => {
			const left = entries.length - accepted.length - 1
			const omitted = accepted.length < at ? 'more' : kind
			const text = [
				...accepted.map((index) => entries[index]),
				entry,
				...(left > 0
					? [
							`${left} ${omitted} item${left === 1 ? '' : 's'} not shown; name a narrower key to narrow the recall`,
						]
					: []),
			].join('\n')
			return estimateMessages([{ id: 'recall', role: 'tool', content: text }]) <= room
				? [...accepted, at]
				: accepted
		}, [])
		const left = entries.length - kept.length
		const omitted = kept.some((at, index) => at !== index) ? 'more' : kind
		return [
			...kept.map((at) => entries[at]),
			...(left > 0
				? [
						`${left} ${omitted} item${left === 1 ? '' : 's'} ${kept.length === 0 ? "didn't fit in this request; answer from the messages you can see" : 'not shown; name a narrower key to narrow the recall'}`,
					]
				: []),
		].join('\n')
	}
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
					`${left} ${kind} item${left === 1 ? '' : 's'} not shown; name a narrower key to narrow the recall`,
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
 * matchesCutLine('2 older items not shown; name a narrower key to narrow the recall') // true
 * ```
 */
export function matchesCutLine(line: string): boolean {
	return /^\d+ (?:older|more) items? (?:not shown; |didn't fit in this request; answer from the messages you can see$)/.test(
		line,
	)
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
 * A message is live when it is a user message or the first unsuperseded finding in its canonical
 * call identity's last run of identical text, and the input neither excludes it nor files it quiet
 * or superseded. When the whole run is superseded, its first finding reaches that final filter.
 * Different text or an undefined result replaces the earlier run, so an empty lookup leaves the
 * earlier result out of every record. A thrown lookup leaves the earlier result live. A finding
 * with no canonical identity participates in no replacement. A finding a write retired is
 * superseded once {@link mergeSupersessions} merges the write's edges into the classification.
 *
 * @param input - The messages, findings, and classification to read
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
	const findings = input.findings.filter((finding) => position.has(finding.id))
	const identities = new Map(
		findings.map((finding) => [finding.id, identifyLookup(finding.name, finding.arguments)]),
	)
	const current = new Set(
		[...Map.groupBy(findings, (finding) => identities.get(finding.id) ?? finding).values()].flatMap(
			(group) => {
				const ordered = group.toSorted(
					(left, right) => (position.get(left.id) ?? -1) - (position.get(right.id) ?? -1),
				)
				const last = ordered.at(-1)
				if (last?.result === undefined) return []
				const boundary = ordered.findLastIndex(
					(finding) => finding.result === undefined || finding.text !== last.text,
				)
				const first =
					ordered
						.slice(boundary + 1)
						.find((finding) => (classification.supersessions.get(finding.id) ?? []).length === 0) ??
					ordered[boundary + 1]
				return first === undefined ? [] : [first.id]
			},
		),
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
 * Collects each finding a write made stale, mapped to the writes that supersede it.
 *
 * @remarks
 * A write is a finding with `targets`. It supersedes another finding whose names meet its targets
 * when that finding comes before it in conversation order, or sits in its own tool group and
 * carries no targets, because one batch dispatches its calls at once. So the later of two writes in
 * one group supersedes the earlier, and never the reverse. A finding's names are its result's `ids`
 * and owner ids, or, for an empty finding, the ids its string arguments name, as `extractLiterals`
 * reads them. Names and targets compare exactly. A write never supersedes itself, a finding with
 * empty `targets` supersedes nothing, and a finding the messages don't hold takes no part.
 *
 * @param messages - The conversation's messages, which fix each finding's position and tool group
 * @param findings - The lookup and write findings of those messages
 * @returns Each superseded finding's id, in conversation order, mapped to the ids of the writes that supersede it, in conversation order
 *
 * @example
 * ```ts
 * collectWriteSupersessions(messages, findings) // Map { 'tool-1' => ['tool-2'] } when tool-2 wrote what tool-1 read
 * ```
 */
export function collectWriteSupersessions(
	messages: readonly Message[],
	findings: readonly LedgerLookupFinding[],
): ReadonlyMap<string, readonly string[]> {
	// A conversation with no write result does no further work.
	if (!findings.some((finding) => (finding.targets ?? []).length > 0)) return new Map()
	const positions = new Map(messages.map((message, at) => [message.id, at]))
	const groups = new Map(
		collectToolGroups(messages).flatMap((group, at) =>
			group.map((message) => [message.id, at] as const),
		),
	)
	const held = findings
		.filter((finding) => positions.has(finding.id))
		.toSorted((left, right) => (positions.get(left.id) ?? 0) - (positions.get(right.id) ?? 0))
	const writes = held.filter((finding) => (finding.targets ?? []).length > 0)
	return new Map(
		held.flatMap((finding) => {
			const names = new Set(
				finding.result === undefined
					? Object.values(finding.arguments)
							.filter(isString)
							.flatMap((value) => [...extractLiterals(value).ids])
					: [...finding.result.ids, ...finding.result.owners.map((owner) => owner.id)],
			)
			const at = positions.get(finding.id) ?? 0
			const group = groups.get(finding.id)
			const targeted = (finding.targets ?? []).length > 0
			const superseders = writes.filter(
				(write) =>
					write.id !== finding.id &&
					(write.targets ?? []).some((target) => names.has(target)) &&
					((positions.get(write.id) ?? 0) > at ||
						(!targeted && group !== undefined && groups.get(write.id) === group)),
			)
			return superseders.length === 0
				? []
				: [[finding.id, superseders.map((write) => write.id)] as const]
		}),
	)
}

/**
 * Collects the findings a write superseded or a later finding of the same lookup replaced.
 *
 * @remarks
 * A write supersedes the findings {@link collectWriteSupersessions} maps. A later finding of the
 * same canonical lookup identity, as {@link identifyLookup} writes it, replaces an earlier one when
 * its text differs or it holds no result, and a later finding with the same text replaces nothing.
 * A finding with no canonical identity is never replaced, and a finding the messages don't hold
 * takes no part. A supersession the judge files is not read here.
 *
 * @param messages - The conversation's messages, which fix each finding's position
 * @param findings - The lookup and write findings of those messages
 * @returns The ids of the superseded and replaced findings
 *
 * @example
 * ```ts
 * collectRetiredFindings(messages, findings) // Set { 'tool-1' } when tool-2 wrote what tool-1 read
 * ```
 */
export function collectRetiredFindings(
	messages: readonly Message[],
	findings: readonly LedgerLookupFinding[],
): ReadonlySet<string> {
	const positions = new Map(messages.map((message, at) => [message.id, at]))
	const held = findings.filter((finding) => positions.has(finding.id))
	const replaced = [
		...Map.groupBy(
			held,
			(finding) => identifyLookup(finding.name, finding.arguments) ?? finding,
		).values(),
	].flatMap((group) => {
		const ordered = group.toSorted(
			(left, right) => (positions.get(left.id) ?? 0) - (positions.get(right.id) ?? 0),
		)
		const last = ordered.at(-1)
		// Every finding up to the last one whose text differs from the newest, or that holds no result,
		// has a later finding that replaces it; the newest itself has none.
		const boundary =
			last === undefined
				? -1
				: ordered.findLastIndex(
						(finding) => finding.result === undefined || finding.text !== last.text,
					)
		return ordered.slice(0, Math.min(boundary + 1, ordered.length - 1)).map((finding) => finding.id)
	})
	return new Set([...collectWriteSupersessions(messages, findings).keys(), ...replaced])
}

/**
 * Merges supersession edges into a classification, adding each edge to both its supersessions and its amendments.
 *
 * @remarks
 * Each earlier message's later ids stay distinct and in conversation order, so every supersession
 * is still an amendment, as the classifier files one. An empty edge map returns the classification
 * itself.
 *
 * @param classification - The judged classification
 * @param edges - The later ids that supersede each earlier id, such as {@link collectWriteSupersessions} returns
 * @param messages - The conversation's messages, which order the later ids
 * @returns The classification with the edges merged
 *
 * @example
 * ```ts
 * mergeSupersessions(classification, new Map([['tool-1', ['tool-2']]]), messages).supersessions.get('tool-1') // ['tool-2']
 * ```
 */
export function mergeSupersessions(
	classification: LedgerClassification,
	edges: ReadonlyMap<string, readonly string[]>,
	messages: readonly Message[],
): LedgerClassification {
	if (edges.size === 0) return classification
	const positions = new Map(messages.map((message, at) => [message.id, at]))
	const [amendments = classification.amendments, supersessions = classification.supersessions] = [
		classification.amendments,
		classification.supersessions,
	].map(
		(laters) =>
			new Map(
				[...new Set([...laters.keys(), ...edges.keys()])].map((earlier) => [
					earlier,
					[...new Set([...(laters.get(earlier) ?? []), ...(edges.get(earlier) ?? [])])].toSorted(
						(left, right) => (positions.get(left) ?? 0) - (positions.get(right) ?? 0),
					),
				]),
			),
	)
	return { ...classification, amendments, supersessions }
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
 * @param amended - The earlier sides of each message's amendment pairs
 * @param id - The message id
 * @param seen - The ids already visited, which stops a cycle of amendment pairs
 * @param settled - The placements already walked for the same `input`, `links`, and `amended`; the walk adds to it. Default: no map, so every call walks
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
	amended: ReadonlyMap<string, readonly string[]>,
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
	const sides = owned ? [] : (amended.get(id) ?? []).filter((side) => side !== id)
	const earlier = sides.filter((side) => !seen.has(side))
	const category = input.classification.categories.get(id)
	const ruled =
		!owned && earlier.length === 0 && category !== undefined && PLACED_CATEGORIES.includes(category)
	const keys = new Set([
		...owners,
		...earlier.flatMap((side) => [
			...placeMember(input, links, amended, side, new Set([...seen, id]), settled),
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
 * Collects accepted amendments of live messages, following superseded amenders to live successors.
 *
 * @remarks
 * An accepted edge relates an earlier live message to an amender without claiming which sentences
 * changed. A superseded amender points to its newest reachable live successor in conversation order,
 * with cycles guarded and duplicate endpoints removed. With no live successor, its endpoint stays.
 * This never restores superseded text. An excluded or quiet user or tool message has no effect.
 *
 * @param input - The exclusions and classification to read
 * @param byId - The messages by id
 * @param live - The live message ids from {@link collectLive}
 * @returns The distinct accepted edges in conversation order
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
			[
				...new Set(
					(classification.amendments.get(earlier) ?? [])
						.filter((later) => effective.has(later) && positions.has(later))
						.map((later) => {
							const successors = new Set(
								scanAmendments(classification.supersessions, later, () => true),
							)
							return ordered.findLast((id) => living.has(id) && successors.has(id)) ?? later
						}),
				),
			]
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

/**
 * Selects each marked request's unambiguous final call-free reply.
 * @param messages - Stored conversation messages in order
 * @param requests - Marked request ids delimiting reply intervals
 * @param notes - Ledger notes that separate answer passes
 * @returns Eligible final replies keyed by request id
 * @example
 * ```ts
 * collectLedgerReplies([], new Set(), new Set()).size // 0
 * ```
 */
export function collectLedgerReplies(
	messages: readonly Message[],
	requests: ReadonlySet<string>,
	notes: ReadonlySet<string>,
): ReadonlyMap<string, Message> {
	const positions = messages.flatMap((message, at) => (requests.has(message.id) ? [at] : []))
	return new Map(
		positions.flatMap((position, index) => {
			const request = messages[position]
			const turns = messages.slice(position + 1, positions[index + 1])
			const reply = turns.findLast((message) => message.role === 'assistant' && !hasCalls(message))
			const answers = turns.flatMap((message, at) =>
				message.role === 'assistant' && !hasCalls(message) && message.content.trim() !== ''
					? [at]
					: [],
			)
			const certain = answers.every(
				(at, offset) =>
					offset === 0 ||
					turns.slice((answers[offset - 1] ?? -1) + 1, at).some((message) => notes.has(message.id)),
			)
			return request !== undefined && certain && reply !== undefined && reply.content.trim() !== ''
				? [[request.id, reply] as const]
				: []
		}),
	)
}

/**
 * Cuts the workspace text a calibration sample adds over its head to a number of characters, or
 * returns `undefined` when the sample adds anything else.
 *
 * @remarks
 * The head and the shown sample are what a context's `build` returns for an empty turn without and
 * with the workspace: the shown sample holds the head's messages with the workspace section appended
 * to the context message, or one context message added where the head holds none. The cut keeps the
 * first `limit` characters of that added text and every other message as the sample holds it. A
 * sample whose messages differ from the head's in any other way, or that adds no text, returns
 * `undefined`.
 *
 * @param head - The head built with no workspace
 * @param shown - The head built with the workspace a request renders
 * @param limit - The characters of added text to keep
 * @returns The cut sample, or `undefined` when the sample adds no trailing text to one message
 *
 * @example
 * ```ts
 * import { cutWorkspaceSample } from '@orkestrel/agent'
 *
 * const head = [{ id: 's', role: 'system', content: 'Serve the desk.' }] as const
 * const shown = [...head, { id: 'c', role: 'user', content: '## Workspace\n\nFile: a.md' }] as const
 * cutWorkspaceSample(head, shown, 12)?.[1]?.content // '## Workspace'
 * ```
 */
export function cutWorkspaceSample(
	head: readonly Message[],
	shown: readonly Message[],
	limit: number,
): readonly Message[] | undefined {
	const at = shown.findIndex(
		(message, index) =>
			message.role !== head[index]?.role || message.content !== head[index]?.content,
	)
	const added = shown[at]
	const extended = shown.length === head.length ? head[at] : undefined
	const prefix = extended?.content ?? ''
	const rest = shown.slice(at + 1)
	const held = head.slice(extended === undefined ? at : at + 1)
	if (added === undefined || shown.length - head.length > 1 || shown.length < head.length)
		return undefined
	if (!added.content.startsWith(prefix) || added.content.length === prefix.length) return undefined
	if (
		rest.length !== held.length ||
		rest.some(
			(message, index) =>
				message.role !== held[index]?.role || message.content !== held[index]?.content,
		)
	)
		return undefined
	return [
		...shown.slice(0, at),
		{ ...added, content: prefix + added.content.slice(prefix.length, prefix.length + limit) },
		...rest,
	]
}
