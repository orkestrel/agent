import type { Message } from '../types.js'
import type {
	GaugeCall,
	LedgerAmendment,
	LedgerEvidence,
	LedgerExchangeSnapshot,
	LedgerCategory,
	LedgerClassification,
	LedgerIndex,
	LedgerLine,
	LedgerOccurrence,
	LedgerLookupFinding,
	LedgerLookupState,
	LedgerPlanGroup,
	LedgerProjection,
	LedgerProjectionInput,
	LedgerProjectionRequest,
	LedgerRecord,
	LedgerRegistry,
	LedgerRenderContext,
	LedgerTopic,
	LedgerWordSet,
	LedgerReceipt,
} from './types.js'
import type { ToolCall, ToolDefinition } from '@orkestrel/tool'
import { attempt, canonicalStringify, isError, isFiniteNumber, isString } from '@orkestrel/contract'
import { estimateMessages } from '../agents/helpers.js'
import { collectToolGroups, extractLiterals, hasCalls, renderJSON } from '../helpers.js'
import { isNonNegativeSafeInteger } from '../validators.js'
import {
	LEDGER_OWNER_PREFIX,
	LEDGER_RULES_KEY,
	LEDGER_WORD,
	PLACED_CATEGORIES,
} from './constants.js'
import { LedgerError } from './errors.js'

/**
 * Digests held messages, lookup call context, stored copies, and sentence receipts using canonical text.
 * This non-cryptographic checksum detects host edits and makes no security claim.
 * @param exchanges - The stored exchange entries
 * @param messages - The conversation holding their messages
 * @returns The hexadecimal checksum, or undefined when a required message is absent or canonical encoding fails
 * @example
 * ```ts
 * digestLedgerWindow([], []) // a deterministic hexadecimal checksum
 * ```
 */
export function digestLedgerWindow(
	exchanges: readonly LedgerExchangeSnapshot[],
	messages: readonly Message[],
): string | undefined {
	const byId = new Map(messages.map((message) => [message.id, message]))
	const ids = new Set(
		exchanges.flatMap((entry) => [
			entry.request,
			entry.reply,
			...entry.lines.map((line) => line.source),
		]),
	)
	const held = [...ids].map((id) => byId.get(id))
	const callers = messages.filter(
		(message) => message.role === 'tool' || message.calls !== undefined,
	)
	const encoded = attempt(() => {
		const values = [...held, ...callers].map((message) => canonicalStringify(message))
		return values.some((value) => value === undefined)
			? undefined
			: canonicalStringify([values, exchanges.map((entry) => [entry.copy ?? null, entry.lines])])
	})
	if (!encoded.success || encoded.value === undefined) return undefined
	return computeLedgerChecksum(encoded.value)
}

/**
 * Digests tool definitions as the JSON a provider request carries them, in order.
 *
 * @remarks
 * A ledger stores this digest with its gauge, so a hydrate reuses the gauge only for the same
 * definitions: an added, removed, reordered, or edited definition changes the digest. The digest is
 * a {@link computeLedgerChecksum} checksum and makes no security claim.
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
 * Checks whether an eligible earlier message is absent from the prompt or incompletely covered.
 * A successful finding is held when a finding with the same canonical identity and text is fully received.
 * @param input - The messages, findings, and classification
 * @param request - The current request id; only messages before it count
 * @param requests - The marked request ids
 * @param notes - The annotation ids to exclude
 * @param messages - The seed tail and held exchange messages; lookup stubs retain their rendered text
 * @param lines - The receipts held by the window and the request copy together
 * @returns True if an eligible earlier message is absent or only partly covered; false otherwise
 * @example
 * ```ts
 * hasHiddenRecall(input, request.id, requests, notes, tail, lines) // whether to offer recall
 * ```
 */
export function hasHiddenRecall(
	input: LedgerProjectionInput,
	request: string,
	requests: ReadonlySet<string>,
	notes: ReadonlySet<string>,
	messages: readonly Message[],
	lines: readonly LedgerReceipt[],
): boolean {
	const start = input.messages.findIndex((message) => message.id === request)
	const before = new Set(input.messages.slice(0, Math.max(0, start)).map((message) => message.id))
	const present = new Map(messages.map((message) => [message.id, message]))
	const receipts = Map.groupBy(lines, (line) => line.source)
	return collectRecallMessages(input, requests, notes).some((message) => {
		if (!before.has(message.id)) return false
		if (requests.has(message.id) || message.role === 'assistant') return !present.has(message.id)
		if (present.get(message.id)?.content === message.content) return false
		const finding = input.findings.find((one) => one.id === message.id)
		const copies =
			finding === undefined
				? [message.id]
				: input.findings
						.filter((one) => before.has(one.id) && matchesLookup(finding, one))
						.map((one) => one.id)
		return !copies.some((id) => {
			if (present.get(id)?.content === message.content) return true
			const held = new Set((receipts.get(id) ?? []).map((line) => line.sentence))
			return splitSentences(message.content).every((_, at) => held.has(at))
		})
	})
}

/**
 * Checks whether two successful findings carry the same text for the same canonical lookup.
 * @param left - The finding to compare
 * @param right - The candidate copy
 * @returns True for the same finding or equal canonical identities and text; unkeyable findings match only themselves
 * @example
 * ```ts
 * matchesLookup(finding, finding) // true when it has a result
 * ```
 */
export function matchesLookup(left: LedgerLookupFinding, right: LedgerLookupFinding): boolean {
	if (left.result === undefined || right.result === undefined || left.text !== right.text)
		return false
	if (left.id === right.id) return true
	const identity = identifyLookup(left.name, left.arguments)
	return identity !== undefined && identity === identifyLookup(right.name, right.arguments)
}

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
 * Builds the copy of a request turn that carries the rendered records ahead of the request.
 * @param request - The stored request message
 * @param records - The rendered records, or empty text when nothing renders
 * @returns The request with its content set to the records, a `## Request` heading, and the request content, or the request itself when the records are empty
 * @example
 * ```ts
 * buildRequestMessage({ id: 'request', role: 'user', content: 'Check BW-5512.' }, '## Records\n- Refund issued.').content
 * // '## Records\n- Refund issued.\n\n## Request\nCheck BW-5512.'
 * ```
 */
export function buildRequestMessage(request: Message, records: string): Message {
	if (records === '') return request
	return { ...request, content: `${records}\n\n## Request\n${request.content}` }
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
		words: new Set(message.content.toLowerCase().match(LEDGER_WORD) ?? []),
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
 * Ranks a source the records render for removal before the next prompt.
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
	group: LedgerPlanGroup,
	unsettled: boolean,
	category: LedgerCategory | undefined,
): number {
	return group === 3 ? 0 : unsettled ? 1 : group === 2 ? (category === 'rule' ? 3 : 2) : 4
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
 * Builds the cut the given steps leave: each step drops the line it is, by identity, or the source it names.
 *
 * @param steps - The lines and source ids to drop
 * @param records - The records to drop lines from
 * @param included - The source ids to drop sources from
 * @returns The records without the dropped lines and the sources without the dropped ids
 * @example
 * ```ts
 * buildLedgerCut(['a'], [], new Set(['a', 'b'])).included // Set { 'b' }
 * ```
 */
export function buildLedgerCut(
	steps: ReadonlyArray<LedgerLine | string>,
	records: readonly LedgerRecord[],
	included: ReadonlySet<string>,
): { readonly records: readonly LedgerRecord[]; readonly included: ReadonlySet<string> } {
	const dropped = new Set(steps)
	return {
		records: records.map((record) => ({
			...record,
			lines: record.lines.filter((line) => !dropped.has(line)),
		})),
		included: new Set([...included].filter((source) => !dropped.has(source))),
	}
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
 * The ledger joins rendered records with one blank line.
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
 * Renders one owner record under a `###` heading, which the records nest under their one `## Records` heading.
 *
 * @param record - An owner record or view with a `title` and `lines`
 * @param context - Rendering facts for optional accepted amendment annotations
 * @returns `### TITLE` followed by `- LINE` for each line
 *
 * @example
 * ```ts
 * renderLedgerPinned({ title: 'Odile Marlow (OM-30418)', lines: [] }) // '### Odile Marlow (OM-30418)'
 * ```
 */
export function renderLedgerPinned(
	record: Pick<LedgerRecord, 'title' | 'lines'>,
	context?: LedgerRenderContext,
): string {
	return `#${renderLedgerRecord(record, context)}`
}

/**
 * Derives complete source identities, first occurrences, and local references from the actual lines of the records.
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
 * Renders a source's reference and its later changes at the source's first retained line.
 * @param line - The retained occurrence to annotate
 * @param context - Actual complete sources, first occurrences, local references, and accepted amendment edges
 * @returns The source's reference and its later-change notes, or empty text for an unrelated or repeated occurrence
 * @throws {LedgerError} Thrown when the context holds no reference for the annotated source or a fully included amender (code `'REFERENCE'`)
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
		throw new LedgerError('REFERENCE', 'Ledger rendering requires retained source references')
	return [
		`[${context.references.get(line.source)}]`,
		...included.map((pair) => ` Changed later by [${context.references.get(pair.later)}].`),
		...(amendments.some((pair) => !context.complete.has(pair.later))
			? [' A later change is not shown.']
			: []),
	].join('')
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
 * By default the cut keeps at least one entry. With `first: false`, it keeps whole entries only
 * when the joined result, tool framing, and omission line fit, and considers later entries after
 * an oversized group. When it leaves some entries out, its last line reads
 * `N older items not shown; name a narrower topic to narrow the recall`, which
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
 * cutListing(['first entry', 'second entry'], 1) // 'first entry\n1 older item not shown; name a narrower topic to narrow the recall'
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
							`${left} ${omitted} item${left === 1 ? '' : 's'} not shown; name a narrower topic to narrow the recall`,
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
						`${left} ${omitted} item${left === 1 ? '' : 's'} ${kept.length === 0 ? "didn't fit in this request; answer from the messages you can see" : 'not shown; name a narrower topic to narrow the recall'}`,
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
					`${left} ${kind} item${left === 1 ? '' : 's'} not shown; name a narrower topic to narrow the recall`,
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
	return /^\d+ (?:older|more) items? (?:not shown; |didn't fit in this request; answer from the messages you can see$)/.test(
		line,
	)
}

/**
 * Renders the tail stub of a lookup result from an earlier request.
 *
 * @param name - The lookup tool name
 * @param args - The arguments the call carried; arguments JSON cannot carry leave the call as its bare tool name, per {@link renderLookupCall}
 * @param state - What became of the result: `failed`, `empty`, `shown` in the records, or `hidden` from them
 * @param write - If `true`, the call is a write's, whose `empty` state reads `changed nothing`; if `false`, a lookup's, whose `empty` state reads `no record`. Default: `false`
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
	write = false,
): string {
	const head = renderLookupCall(name, args)
	if (state === 'failed') return `${head}: failed`
	if (state === 'empty') return write ? `${head}: changed nothing` : `${head}: no record`
	if (state === 'shown') return `${head}: result shown under Records below`
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
 * Encodes a sentence's record placement without comparing rendered text.
 * @param line - The record key, title, source, and zero-based sentence index
 * @returns The serialized placement identity
 * @example
 * ```ts
 * buildLedgerLineKey({ key: 'rules', title: 'Rules', source: 'one', sentence: 0 })
 * ```
 */
export function buildLedgerLineKey(
	line: Pick<LedgerOccurrence, 'key' | 'title' | 'source' | 'sentence'>,
): string {
	return JSON.stringify([line.key, line.title, line.source, line.sentence])
}

/**
 * Collects the record's sentence receipts not already held by a window.
 * @param record - The selected record with its original sentence identities
 * @param held - Placement identities already rendered in the window
 * @returns The remaining sentences with their record placement
 * @example
 * ```ts
 * collectLedgerLines({ key: 'rules', title: 'Rules', members: [], lines: [] }, new Set()) // []
 * ```
 */
export function collectLedgerLines(
	record: LedgerRecord,
	held: ReadonlySet<string>,
): readonly LedgerOccurrence[] {
	return record.lines
		.map((line) => ({ ...line, key: record.key, title: record.title }))
		.filter((line) => !held.has(buildLedgerLineKey(line)))
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
 * Captures source bytes and direct amendment edges for a held window.
 * @param messages - Current stored messages
 * @param sources - Requests, replies, and record sources the window holds
 * @param amendments - Accepted direct amendment edges from the current projection
 * @returns Source and edge identities for stale detection
 * @example
 * ```ts
 * collectLedgerEvidence([], new Set(), []).messages.size // 0
 * ```
 */
export function collectLedgerEvidence(
	messages: readonly Message[],
	sources: ReadonlySet<string>,
	amendments: readonly LedgerAmendment[],
): LedgerEvidence {
	return {
		messages: new Set(
			messages
				.filter((message) => sources.has(message.id))
				.map((message) => JSON.stringify(['message', message])),
		),
		amendments: new Map(
			amendments
				.filter((edge) => sources.has(edge.earlier) || sources.has(edge.later))
				.map((edge) => [JSON.stringify(['edge', edge.earlier, edge.later]), { ...edge }]),
		),
	}
}
