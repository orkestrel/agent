// Per-topic records: one record per account and one `Rules` record, projected from the stored events. Each line is
// a verbatim sentence of a live source, so the 2B writes nothing into a record. Every export is pure.
import { createHash } from 'node:crypto'

const ID_SHAPE = /\b[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+\b/g
const NUMERIC = /(?<![\w.])\d[\d,]*(?:\.\d+)?/g
// A sentence ends at a period, question mark, or exclamation mark followed by a space and a capital, a digit, or a
// quote, so a decimal point, an id, or an amount never splits one.
const SENTENCE_BREAK = /(?<=[.!?])\s+(?=[\p{Lu}\d"'“])/u
const PRONOUN = /^(?:He|She|They|His|Her|Their)(?![\p{L}\p{N}])/u
// A run stops at punctuation, so "Odile Marlow's" names "Odile Marlow"; a word after a quote or a hyphen
// is a quoted phrase or part of an id, not a name.
const NAME_RUN = /(?<![\p{L}\p{N}'-])\p{Lu}\p{Ll}+(?: \p{Lu}\p{Ll}+)*(?![\p{L}\p{N}-])/gu
const HANDLE = /\b[mrp]\d+\b/g
const CURRENCY = /\$\d+(?:,\d{3})*(?:\.\d+)?/g
const THRESHOLD = /(?<![\p{L}])(over|above|more than|under|below|less than|at least|at most)\s+(\$\d+(?:,\d{3})*(?:\.\d+)?)/giu
const PLACED = ['rule', 'correction']
const RULES = 'rules'

/**
 * Splits a message into sentences by the rule of bench.mjs `splitSentences`.
 * @param text - The message text
 * @returns The trimmed, non-empty sentences in order
 */
export function splitSentences(text) {
	return String(text ?? '')
		.split(SENTENCE_BREAK)
		.map((sentence) => sentence.trim())
		.filter((sentence) => sentence !== '')
}

/**
 * Reads the id-shaped tokens and the numbers of a text by the rule of bench.mjs `extractTokens`.
 * @param text - The text to read
 * @returns The uppercased ids that hold a digit, and the numbers outside those ids with grouping commas removed
 */
export function extractTokens(text) {
	const source = String(text ?? '')
	const ids = new Set()
	for (const [token] of source.matchAll(ID_SHAPE)) if (/\d/.test(token)) ids.add(token.toUpperCase())
	const rest = source.replace(ID_SHAPE, (token) => (/\d/.test(token) ? ' ' : token))
	const numbers = new Set()
	for (const [token] of rest.matchAll(NUMERIC)) {
		const value = Number(token.replace(/,/g, ''))
		if (Number.isFinite(value)) numbers.add(value)
	}
	return { ids, numbers }
}

/**
 * Links each id-shaped lookup argument to its account: an account argument links to itself, and any other
 * id-shaped argument links to the single account key its result text names.
 * @param input - `results` as `{ id, name, arguments, text }` and `accounts` keyed by account id
 * @returns The account id of each linked argument id; an argument whose text names no account or several is absent
 */
export function linkAccounts({ results, accounts }) {
	const keys = new Set(Object.keys(accounts ?? {}))
	const links = {}
	for (const result of results ?? []) {
		const named = [...extractTokens(result.text).ids].filter((id) => keys.has(id))
		for (const subject of readSubjects(result.arguments)) {
			if (keys.has(subject)) links[subject] = subject
			else if (named.length === 1) links[subject] = named[0]
		}
	}
	return links
}

/**
 * Projects the account records and the `Rules` record from the stored events (see RECORDS-PLAN.md, "The first
 * build unit").
 * @param input - `today`, `system`, `exclude`, `accounts`, `messages`, `results`, `entities`, and `judgments`
 * @returns `records` with account records ordered by their first member and `Rules` last, each line
 * `{ text, source, sentence, party?, desk, role }` with `sentence` the zero-based index and `role` the source's;
 * `stale` as `{ source, sentence, tokens }`; `loose` member ids; and `hash`
 */
export function buildRecords(input) {
	const index = indexMessages(input.messages)
	const live = listLive(input, index)
	const links = linkAccounts(input)
	const amending = invertPairs(input.judgments?.amended)
	const stale = listStale(input, index, live)
	const dead = new Set(stale.map((entry) => `${entry.source} ${entry.sentence}`))
	const holders = Object.values(input.accounts ?? {}).flat()
	const system = listRuns(input.system)
	const members = new Map()
	const loose = []
	for (const id of live) {
		const keys = placeMember(input, links, amending, id, new Set())
		if (keys.size === 0) loose.push(id)
		for (const key of keys) members.set(key, [...(members.get(key) ?? []), id])
	}
	const records = [...members]
		.map(([key, ids]) => {
			const lines = ids.flatMap((id) => buildLines(input, index, id, dead, holders, system))
			const account = key.slice('account:'.length)
			const holder = input.accounts?.[account]?.[0]
			const title = key === RULES ? 'Rules' : holder === undefined ? `account ${account}` : `${holder} (account ${account})`
			return { key, title, members: ids, lines, first: index.position.get(ids[0]) }
		})
		.sort((left, right) => (left.key === RULES) - (right.key === RULES) || left.first - right.first || compareText(left.key, right.key))
		.map(({ first, ...record }) => ({ ...record, hash: hashText(`${input.today}\n${record.key}\n${renderRecord(record)}`) }))
	const hash = hashText(JSON.stringify([input.today, records.map((record) => record.hash), stale, loose]))
	return { records, stale, loose, hash }
}

/**
 * Selects a request's view: its account records in the order it names them, then `Rules` with the lines whose
 * desk topics meet the request's first, each group in position order.
 * @param built - The output of `buildRecords`
 * @param request - `accounts` the request names and its `desk` topics
 * @returns The views `{ key, title, lines }`; an account with no record yields none
 */
export function selectRecords(built, request) {
	const desk = new Set(request.desk ?? [])
	const copy = (lines) => lines.map((line) => ({ ...line, desk: [...line.desk] }))
	const views = []
	for (const account of new Set(request.accounts ?? [])) {
		const record = built.records.find((one) => one.key === `account:${account}`)
		if (record !== undefined) views.push({ key: record.key, title: record.title, lines: copy(record.lines) })
	}
	const rules = built.records.find((one) => one.key === RULES)
	if (rules !== undefined) {
		const meets = (line) => line.desk.some((topic) => desk.has(topic))
		views.push({ key: rules.key, title: rules.title, lines: copy([...rules.lines.filter(meets), ...rules.lines.filter((line) => !meets(line))]) })
	}
	return views
}

/**
 * Renders one view as a heading and one list item per line; the briefing joins records with one blank line.
 * @param view - A view or record with `title` and `lines`
 * @returns `## TITLE` followed by `- LINE` for each line
 */
export function renderRecord(view) {
	return [`## ${view.title}`, ...view.lines.map((line) => `- ${line.text}`)].join('\n')
}

/**
 * Renders one account view as `renderRecord` does under a `###` heading, which the briefing nests under its one `## Pinned` heading.
 * @param view - An account view or record with `title` and `lines`
 * @returns `### TITLE` followed by `- LINE` for each line
 */
export function renderPinned(view) {
	return [`### ${view.title}`, ...view.lines.map((line) => `- ${line.text}`)].join('\n')
}

/**
 * Compares each threshold a `Rules` line states after a comparator word with each currency amount in a lookup
 * line of a selected account record. Only `Rules` lines whose desk topics meet the request's take part.
 * @param views - The output of `selectRecords`
 * @param request - The request's `desk` topics
 * @returns One `AMOUNT is over THRESHOLD.`, `AMOUNT is under THRESHOLD.`, or `AMOUNT equals THRESHOLD.` per
 * distinct pair, thresholds in line order and amounts in record order
 */
export function compareAmounts(views, request) {
	const desk = new Set(request.desk ?? [])
	const thresholds = views
		.filter((view) => view.key === RULES)
		.flatMap((view) => view.lines)
		.filter((line) => line.desk.some((topic) => desk.has(topic)))
		.flatMap((line) => [...line.text.matchAll(THRESHOLD)].map((match) => match[2]))
	const amounts = views
		.filter((view) => view.key !== RULES)
		.flatMap((view) => view.lines)
		.filter((line) => line.role === 'tool')
		.flatMap((line) => line.text.match(CURRENCY) ?? [])
	const out = []
	for (const threshold of thresholds)
		for (const amount of amounts) {
			const [left, right] = [readAmount(amount), readAmount(threshold)]
			const text = left > right ? `${amount} is over ${threshold}.` : left < right ? `${amount} is under ${threshold}.` : `${amount} equals ${threshold}.`
			if (!out.includes(text)) out.push(text)
		}
	return out
}

/**
 * Checks a build against its input with passes that share no helper with `buildRecords` for placement and
 * `stale`. Each fault opens with its check: `verbatim`, `dead`, `coverage`, `placement`, `stale`, `handle`, or
 * `order`.
 * @param built - The output of `buildRecords`
 * @param input - The input the build read
 * @returns The faults; empty when clean
 */
export function checkRecords(built, input) {
	const faults = []
	const byId = new Map((input.messages ?? []).map((message, at) => [message.id, { ...message, at }]))
	const sentencesOf = (id) => splitSentences(byId.get(id)?.content)
	const judgments = input.judgments ?? {}
	const excluded = new Set(input.exclude ?? [])
	const quiet = new Set(judgments.quiet ?? [])
	const superseded = new Set(Object.entries(judgments.superseded ?? {}).flatMap(([id, laters]) => (laters.length > 0 ? [id] : [])))
	const lookups = new Map((input.results ?? []).map((result) => [result.id, result]))
	const shape = (result) => `${result.name} ${JSON.stringify(Object.entries(result.arguments ?? {}).map(([key, value]) => [key, typeof value === 'string' ? value.trim().toUpperCase() : value]))}`
	const replaced = new Set()
	for (const result of lookups.values())
		for (const later of lookups.values()) if (byId.get(later.id)?.at > byId.get(result.id)?.at && shape(later) === shape(result)) replaced.add(result.id)
	const live = new Set(
		[...byId.values()]
			.filter((message) => (message.role === 'user' || (message.role === 'tool' && lookups.has(message.id) && !replaced.has(message.id))) && !excluded.has(message.id) && !quiet.has(message.id) && !superseded.has(message.id))
			.map((message) => message.id),
	)
	const staleKeys = new Map(built.stale.map((entry) => [`${entry.source} ${entry.sentence}`, entry]))
	const lines = built.records.flatMap((record) => record.lines.map((line) => ({ record, line })))

	for (const { record, line } of lines) {
		const sentences = sentencesOf(line.source)
		const prefix = line.party === undefined ? '' : `${line.party}: `
		if (!line.text.startsWith(prefix) || line.text.slice(prefix.length) !== sentences[line.sentence])
			faults.push(`verbatim ${record.key}: "${line.text}" is not sentence ${line.sentence} of ${line.source}`)
		if (line.party !== undefined && !listRuns(sentences[line.sentence - 1] ?? '').includes(line.party))
			faults.push(`verbatim ${record.key}: party "${line.party}" is absent from the sentence before ${line.source} sentence ${line.sentence}`)
	}

	for (const { record, line } of lines) {
		const tokens = extractTokens(line.text)
		for (const entry of built.stale)
			if (entry.source === line.source && entry.tokens.some((token) => tokens.ids.has(token) || tokens.numbers.has(Number(token))))
				faults.push(`dead ${record.key}: "${line.text}" holds ${entry.tokens.join(', ')}, which stale lists for ${line.source}`)
		const message = byId.get(line.source)
		const reason =
			message === undefined
				? 'missing'
				: message.role === 'assistant'
					? 'assistant'
					: excluded.has(line.source)
						? 'excluded'
						: quiet.has(line.source)
							? 'quiet'
							: superseded.has(line.source)
								? 'superseded'
								: replaced.has(line.source)
									? 'replaced'
									: live.has(line.source)
										? undefined
										: 'not live'
		if (reason !== undefined) faults.push(`dead ${record.key}: "${line.text}" comes from a ${reason} source ${line.source}`)
	}

	for (const record of built.records)
		for (const id of record.members) {
			if (!live.has(id)) continue
			for (const [at] of sentencesOf(id).entries()) {
				const lined = record.lines.some((line) => line.source === id && line.sentence === at)
				if (!lined && !staleKeys.has(`${id} ${at}`)) faults.push(`coverage ${record.key}: sentence ${at} of ${id} is neither a line nor stale`)
			}
		}

	const links = linkAccounts(input)
	const accountKeys = new Set(Object.keys(input.accounts ?? {}))
	const earlierSides = new Map()
	for (const [earlier, laters] of Object.entries(judgments.amended ?? {})) for (const later of laters) earlierSides.set(later, [...(earlierSides.get(later) ?? []), earlier])
	const expectPlace = (id, seen) => {
		const accounts = new Set()
		for (const entity of input.entities?.[id] ?? []) {
			if (accountKeys.has(entity)) accounts.add(`account:${entity}`)
			else if (links[entity] !== undefined) accounts.add(`account:${links[entity]}`)
		}
		if (accounts.size > 0) return accounts
		const sides = (earlierSides.get(id) ?? []).filter((earlier) => !seen.has(earlier))
		if (sides.length > 0) return new Set(sides.flatMap((earlier) => [...expectPlace(earlier, new Set([...seen, id]))]))
		return PLACED.includes(judgments.categories?.[id]) ? new Set([RULES]) : new Set()
	}
	const placedIn = new Map()
	for (const record of built.records) for (const id of record.members) placedIn.set(id, [...(placedIn.get(id) ?? []), record.key])
	for (const id of built.loose) placedIn.set(id, [...(placedIn.get(id) ?? []), 'loose'])
	for (const id of new Set([...live, ...placedIn.keys()])) {
		const expected = live.has(id) ? [...expectPlace(id, new Set([id]))] : []
		const want = (expected.length === 0 && live.has(id) ? ['loose'] : expected).sort().join(', ')
		const got = [...(placedIn.get(id) ?? [])].sort().join(', ')
		if (want !== got) faults.push(`placement ${id}: placed in [${got}], expected [${want}]`)
	}

	const expectedStale = []
	for (const id of [...live].sort((left, right) => byId.get(left).at - byId.get(right).at)) {
		const laters = (judgments.amended?.[id] ?? []).filter((later) => live.has(later))
		if (laters.length === 0) continue
		for (const [at, sentence] of sentencesOf(id).entries()) {
			const own = extractTokens(sentence)
			const shared = new Set()
			for (const later of laters) {
				const other = extractTokens(byId.get(later).content)
				for (const token of own.ids) if (other.ids.has(token)) shared.add(token)
				for (const token of own.numbers) if (other.numbers.has(token)) shared.add(String(token))
			}
			if (shared.size > 0) expectedStale.push(`${id} ${at} ${[...shared].sort().join(',')}`)
		}
	}
	const gotStale = built.stale.map((entry) => `${entry.source} ${entry.sentence} ${[...entry.tokens].sort().join(',')}`)
	if (JSON.stringify(gotStale) !== JSON.stringify(expectedStale)) faults.push(`stale: built [${gotStale.join('; ')}], expected [${expectedStale.join('; ')}]`)

	for (const { record, line } of lines) {
		const own = new Set(byId.get(line.source)?.content.match(HANDLE) ?? [])
		for (const handle of line.text.match(HANDLE) ?? []) if (!own.has(handle)) faults.push(`handle ${record.key}: "${line.text}" holds ${handle}, which ${line.source} lacks`)
	}

	const reversed = buildRecords(reverseKeys(input)).hash
	if (reversed !== built.hash) faults.push(`order: the build over reversed object keys hashes ${reversed}, the build ${built.hash}`)
	return faults
}

function readSubjects(args) {
	return Object.values(args ?? {})
		.filter((value) => typeof value === 'string')
		.map((value) => value.trim().toUpperCase())
		.filter((subject) => extractTokens(subject).ids.has(subject))
}

function indexMessages(messages) {
	const position = new Map()
	const byId = new Map()
	for (const [at, message] of (messages ?? []).entries()) {
		position.set(message.id, at)
		byId.set(message.id, message)
	}
	return { position, byId }
}

function normalizeArguments(args) {
	return JSON.stringify(Object.entries(args ?? {}).map(([key, value]) => [key, typeof value === 'string' ? value.trim().toUpperCase() : value]))
}

// `results` holds non-empty lookups only, so an empty later result replaces nothing here, where bench.mjs
// `replaced` lets it replace.
function listLive(input, index) {
	const judgments = input.judgments ?? {}
	const excluded = new Set(input.exclude ?? [])
	const quiet = new Set(judgments.quiet ?? [])
	const results = (input.results ?? []).filter((result) => index.position.has(result.id))
	const current = new Set(
		results
			.filter((result) => !results.some((later) => index.position.get(later.id) > index.position.get(result.id) && later.name === result.name && normalizeArguments(later.arguments) === normalizeArguments(result.arguments)))
			.map((result) => result.id),
	)
	return [...index.byId.values()]
		.filter((message) => message.role === 'user' || (message.role === 'tool' && current.has(message.id)))
		.map((message) => message.id)
		.filter((id) => !excluded.has(id) && !quiet.has(id) && (judgments.superseded?.[id] ?? []).length === 0)
}

function invertPairs(pairs) {
	const sides = new Map()
	for (const [earlier, laters] of Object.entries(pairs ?? {})) for (const later of laters) sides.set(later, [...(sides.get(later) ?? []), earlier])
	return sides
}

// The record keys a member joins; `seen` stops a cycle of amended pairs. A member that is not live still
// places, because a correction joins where its earlier side would join.
function placeMember(input, links, amending, id, seen) {
	const accounts = input.accounts ?? {}
	const keys = new Set()
	for (const entity of input.entities?.[id] ?? []) {
		const account = Object.hasOwn(accounts, entity) ? entity : links[entity]
		if (account !== undefined) keys.add(`account:${account}`)
	}
	if (keys.size > 0) return keys
	const earlier = (amending.get(id) ?? []).filter((side) => side !== id && !seen.has(side))
	if (earlier.length > 0) {
		for (const side of earlier) for (const key of placeMember(input, links, amending, side, new Set([...seen, id]))) keys.add(key)
		return keys
	}
	if (PLACED.includes(input.judgments?.categories?.[id])) keys.add(RULES)
	return keys
}

// Only a live amending message renders, so only one carries the value its earlier side drops.
function listStale(input, index, live) {
	const stale = []
	const members = new Set(live)
	for (const id of live) {
		const laters = (input.judgments?.amended?.[id] ?? []).filter((later) => members.has(later)).map((later) => extractTokens(index.byId.get(later).content))
		if (laters.length === 0) continue
		for (const [sentence, text] of splitSentences(index.byId.get(id).content).entries()) {
			const own = extractTokens(text)
			const tokens = new Set()
			for (const other of laters) {
				for (const token of own.ids) if (other.ids.has(token)) tokens.add(token)
				for (const token of own.numbers) if (other.numbers.has(token)) tokens.add(String(token))
			}
			if (tokens.size > 0) stale.push({ source: id, sentence, tokens: [...tokens] })
		}
	}
	return stale
}

function buildLines(input, index, id, dead, holders, system) {
	const message = index.byId.get(id)
	const sentences = splitSentences(message.content)
	const desk = input.judgments?.desk?.[id] ?? []
	return sentences.flatMap((sentence, at) => {
		if (dead.has(`${id} ${at}`)) return []
		const party = PRONOUN.test(sentence) && at > 0 ? listRuns(sentences[at - 1]).filter((name) => !holders.includes(name) && !system.includes(name)).at(-1) : undefined
		const line = { text: party === undefined ? sentence : `${party}: ${sentence}`, source: id, sentence: at, desk: [...desk], role: message.role }
		return [party === undefined ? line : { ...line, party }]
	})
}

// The capitalized runs of a text, each sentence's opening run left out because a sentence opens with a capital
// whatever its first word is.
function listRuns(text) {
	return splitSentences(text).flatMap((sentence) => [...sentence.matchAll(NAME_RUN)].filter((match) => match.index > 0).map((match) => match[0]))
}

function readAmount(text) {
	return Number(text.replace(/[$,]/g, ''))
}

function hashText(text) {
	return createHash('sha256').update(text).digest('hex')
}

function compareText(left, right) {
	return left < right ? -1 : left > right ? 1 : 0
}

function reverseKeys(value) {
	if (Array.isArray(value)) return value.map(reverseKeys)
	if (value === null || typeof value !== 'object') return value
	return Object.fromEntries(
		Object.entries(value)
			.reverse()
			.map(([key, item]) => [key, reverseKeys(item)]),
	)
}
