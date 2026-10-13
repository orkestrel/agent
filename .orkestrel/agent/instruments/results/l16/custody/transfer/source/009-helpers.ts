import type { Message, NoulQuestion } from '../../vendor/agent-0.0.30-trimmed/index.js'
import type {
	AggregateFocus,
	AggregatePlan,
	AggregateBundle,
	AggregateBlock,
	AggregateAdmission,
	AggregateEntry,
	AggregateFailure,
	AggregateFilter,
	AggregateRef,
	AggregateSource,
	AggregateState,
	AggregateTokens,
	AggregateTopic,
	AggregateVersion,
	MirrorInput,
	MirrorLine,
	MirrorProjection,
	MirrorReading,
} from '../types.js'
// The vendored build is the one import of the agent in bench5; repoint this path when a later build is vendored.
import {
	LEDGER_OWNER_PREFIX,
	buildLines,
	collectLive,
	collectNames,
	estimateMessages,
	extractTokens,
	splitSentences,
} from '../../vendor/agent-0.0.30-trimmed/index.js'
import {
	AGREE_QUESTION,
	FOCUS_QUESTION,
	SUPPORT_REVISION,
	ANY_WORD,
	CHANGE_CRITERIA,
	CHANGE_INSTRUCTIONS,
	CHANGE_STATE_EVENT,
	CHANGE_STATE_SUMMARY,
	ENTRY_SEPARATOR,
	ID_MIXED,
	ID_SHAPE,
	IDS_LABEL,
	IDS_SEPARATOR,
	NAME_WORD,
	RETRY_NOTE,
	RETRY_SLOT,
	SUMMARIES_HEADING,
	SUMMARY_SLOT,
	SUMMARY_SYSTEM,
	SUMMARY_TOPIC_SLOT,
} from './constants.js'
import { buildCacheKey } from '../helpers.js'
import { isDeepStrictEqual } from 'node:util'

/**
 * Fills the `TOPIC` and `DATE` slots of a template in one pass.
 *
 * @param template - The text that holds the slots
 * @param topic - The text that replaces `TOPIC`
 * @param date - The text that replaces `DATE`
 * @returns The template with each slot replaced; a slot word inside `topic` or `date` stays as written
 */
export function fillSlots(template: string, topic: string, date: string): string {
	return template.replace(SUMMARY_SLOT, (slot) => (slot === SUMMARY_TOPIC_SLOT ? topic : date))
}

/**
 * Reads the ids, numbers, name candidates, and words of a text.
 *
 * @remarks
 * An id is a hyphenated token with a digit, or any run of letters and digits that holds both. A name candidate is a capitalized word of two letters or more in any sentence position. Ids are read first, so `LH` in `LH-44870` is no name.
 *
 * @param text - The text to read
 * @returns The uppercased ids, the numbers with grouping commas removed, the lowercased name candidates, and every lowercased word
 */
export function readTokens(text: string): AggregateTokens {
	const base = extractTokens(text)
	const ids = new Set<string>(base.ids)
	const rest = text.replace(ID_SHAPE, (token) => (/\d/.test(token) ? ' ' : token))
	for (const [run] of rest.matchAll(ID_MIXED)) ids.add(run.toUpperCase())
	const plain = rest.replace(ID_MIXED, ' ')
	return {
		ids,
		numbers: new Set<number>(base.numbers),
		names: new Set([...plain.matchAll(NAME_WORD)].map(([word]) => word.toLowerCase())),
		words: new Set((plain.match(ANY_WORD) ?? []).map((word) => word.toLowerCase())),
	}
}

/**
 * Lists the tokens of one reading that a second reading lacks.
 *
 * @param own - The reading of the text to test
 * @param shown - The reading of the text that must hold every token
 * @returns One `id ID`, `number N`, or `name WORD` entry per missing token; a name counts as present when the shown text holds the word in any case
 */
export function listMissing(own: AggregateTokens, shown: AggregateTokens): readonly string[] {
	return [
		...[...own.ids].filter((id) => !shown.ids.has(id)).map((id) => `id ${id}`),
		...[...own.numbers]
			.filter((number) => !shown.numbers.has(number))
			.map((number) => `number ${number}`),
		...[...own.names].filter((name) => !shown.words.has(name)).map((name) => `name ${name}`),
	]
}

/**
 * Counts the tokens of a text that the shown text does not carry.
 *
 * @param text - The text the model reads only through the summaries
 * @param shownText - The text the control arm shows: the briefing, the tail, the system text, and the date line
 * @returns The number of distinct ids, numbers, and name candidates of `text` that `shownText` lacks; `0` means no summary token is the only carrier
 */
export function countSoleTokens(text: string, shownText: string): number {
	return listMissing(readTokens(text), readTokens(shownText)).length
}

/**
 * Keeps the sentences of a summary whose tokens all occur in the shown text.
 *
 * @param prose - The summary prose
 * @param ids - The ids that code copied from the sources
 * @param shownText - The text the control arm shows
 * @returns The kept sentences joined by a space, the ids that occur in the shown text, and the sentences dropped
 */
export function filterProse(
	prose: string,
	ids: readonly string[],
	shownText: string,
): AggregateFilter {
	const shown = readTokens(shownText)
	const sentences = splitSentences(prose)
	const flags = sentences.map((sentence) => listMissing(readTokens(sentence), shown).length === 0)
	return {
		prose: sentences.filter((_sentence, at) => flags[at] === true).join(' '),
		ids: ids.filter((id) => shown.ids.has(id.toUpperCase())),
		dropped: sentences.filter((_sentence, at) => flags[at] !== true),
	}
}

/**
 * Checks a summary against the messages it was written from.
 *
 * @remarks
 * The checks run in this order: empty prose (alone), ids, numbers, names, stale tokens. A name is a capitalized run that `collectNames` reads, and it passes when each of its words occurs in the sources or the owner names.
 *
 * @param prose - The summary prose
 * @param sources - The texts the summarizer read, the date lines and the title included
 * @param ownerNames - The registry owner names
 * @param staleTokens - The ids and numbers of stale sentences that no live line carries
 * @returns One failure per offending token, in check order; empty when the prose passes
 */
export function checkProse(
	prose: string,
	sources: readonly string[],
	ownerNames: readonly string[],
	staleTokens: readonly string[],
): readonly AggregateFailure[] {
	if (prose.trim() === '') return [{ kind: 'empty', token: '' }]
	const own = readTokens(prose)
	const known = readTokens([...sources, ...ownerNames].join('\n'))
	const stale = new Set(staleTokens)
	const names = new Set(
		collectNames(prose).flatMap((run) => run.split(' ').map((word) => word.toLowerCase())),
	)
	return [
		...[...own.ids]
			.filter((id) => !known.ids.has(id))
			.map((token): AggregateFailure => ({ kind: 'id', token })),
		...[...own.numbers]
			.filter((number) => !known.numbers.has(number))
			.map((number): AggregateFailure => ({ kind: 'number', token: String(number) })),
		...[...names]
			.filter((word) => !known.words.has(word))
			.map((token): AggregateFailure => ({ kind: 'name', token })),
		...[...own.ids, ...[...own.numbers].map(String)]
			.filter((token) => stale.has(token))
			.map((token): AggregateFailure => ({ kind: 'stale', token })),
	]
}

/**
 * Collects the stale tokens of a topic.
 *
 * @param gone - The texts of source lines that left the topic
 * @param listed - The tokens the ledger lists for the stale sentences of the topic's messages
 * @param sources - The texts of the lines the topic holds at this read point
 * @returns The ids and numbers of `gone` and `listed` that no current source carries; numbers read as `String(number)`
 */
export function collectStaleTokens(
	gone: readonly string[],
	listed: readonly string[],
	sources: readonly string[],
): readonly string[] {
	const live = readTokens(sources.join('\n'))
	const old = readTokens(gone.join('\n'))
	const tokens = new Set([...listed, ...old.ids, ...[...old.numbers].map(String)])
	return [...tokens].filter((token) => !live.ids.has(token) && !live.numbers.has(Number(token)))
}

/**
 * Lists the topics to maintain: every desk topic that a message concerns, then the owners with a record.
 *
 * @param projection - The projection of the mirror's input
 * @param input - The mirror's input
 * @param owners - The owner ids to maintain, in order
 * @returns The desk topics in the order the messages first name them, then the owner topics whose record holds a line
 */
export function collectTopics(
	projection: MirrorProjection,
	input: MirrorInput,
	owners: readonly string[],
): readonly AggregateTopic[] {
	const desk = new Set<string>()
	for (const names of input.classification.topics.values()) for (const name of names) desk.add(name)
	return [
		...[...desk].map((name): AggregateTopic => ({ key: name, title: name, owner: false })),
		...owners.flatMap((id): readonly AggregateTopic[] => {
			const key = `${LEDGER_OWNER_PREFIX}${id}`
			const record = projection.records.find((one) => one.key === key)
			return record === undefined || record.lines.length === 0
				? []
				: [{ key, title: record.title, owner: true }]
		}),
	]
}

/**
 * Lists the messages that feed a topic.
 *
 * @param projection - The projection of the mirror's input
 * @param input - The mirror's input
 * @param topic - The topic
 * @returns The member ids of the owner record for an owner topic; the live messages that the classification files under the desk topic otherwise
 */
export function collectTopicMembers(
	projection: MirrorProjection,
	input: MirrorInput,
	topic: AggregateTopic,
): readonly string[] {
	if (topic.owner)
		return projection.records.find((record) => record.key === topic.key)?.members ?? []
	return collectLive(input).filter(
		(id) => input.classification.topics.get(id)?.includes(topic.key) === true,
	)
}

/**
 * Builds one source from a record line.
 *
 * @param line - The line
 * @param readings - The lookup readings of the mirror's input
 * @param day - The date of the line's message
 * @returns The source; a tool line opens with the tool name and arguments that the ledger renders before a lookup result
 */
export function buildSource(
	line: MirrorLine,
	readings: readonly MirrorReading[],
	day: string,
): AggregateSource {
	const reading = line.role === 'tool' ? readings.find((one) => one.id === line.source) : undefined
	return {
		id: line.source,
		sentence: line.sentence,
		role: line.role,
		text:
			reading === undefined
				? line.text
				: `${reading.name} ${JSON.stringify(reading.arguments)}: ${line.text}`,
		day,
	}
}

/**
 * Collects the lines that a topic summarizes.
 *
 * @remarks
 * An owner topic takes the lines of its record. A desk topic takes the lines of each live message that the classification files under it, built as the ledger builds them. Tool readings carry no desk topic, so they feed owner topics only.
 *
 * @param projection - The projection of the mirror's input
 * @param input - The mirror's input
 * @param topic - The topic
 * @param days - The date of each message id; an unknown id reads as an empty date
 * @returns The sources in message order, then sentence order
 */
export function collectTopicSources(
	projection: MirrorProjection,
	input: MirrorInput,
	topic: AggregateTopic,
	days: ReadonlyMap<string, string>,
): readonly AggregateSource[] {
	if (topic.owner) {
		const record = projection.records.find((one) => one.key === topic.key)
		return (record?.lines ?? []).map((line) =>
			buildSource(line, input.readings, days.get(line.source) ?? ''),
		)
	}
	const byId = new Map(input.messages.map((message) => [message.id, message]))
	const dead = new Set(projection.stale.map((line) => `${line.source} ${line.sentence}`))
	const holders = [...input.owners.values()].flat()
	const system = collectNames(input.system)
	return collectTopicMembers(projection, input, topic)
		.flatMap((id) => buildLines(input, byId, id, dead, holders, system))
		.map((line) => buildSource(line, input.readings, days.get(line.source) ?? ''))
}

/**
 * Renders a source as the summarizer and the judge read it.
 *
 * @param source - The source
 * @returns `(DAY) ROLE: LINE`
 */
export function renderSource(source: AggregateSource): string {
	return `(${source.day}) ${source.role}: ${source.text}`
}

/**
 * Builds the identity of a source line.
 *
 * @param source - The source
 * @returns The message id, sentence index, role, text, and day, so every changed source field changes its identity
 */
export function buildSourceKey(source: AggregateSource): string {
	return JSON.stringify([source.id, source.sentence, source.role, source.text, source.day])
}

/**
 * Compares the sources of a built version with the sources at this read point.
 *
 * @param previous - The sources the version was built from
 * @param current - The sources at this read point
 * @returns The previous lines that are gone, and the ids of the messages that have a current line but no previous one, in message order
 */
export function compareSources(
	previous: readonly AggregateSource[],
	current: readonly AggregateSource[],
): { readonly removed: readonly AggregateSource[]; readonly arrived: readonly string[] } {
	const present = new Map<string, number>()
	for (const source of current) {
		const key = buildSourceKey(source)
		present.set(key, (present.get(key) ?? 0) + 1)
	}
	const before = new Set(previous.map((source) => source.id))
	return {
		removed: previous.filter((source) => {
			const key = buildSourceKey(source)
			const count = present.get(key) ?? 0
			if (count === 0) return true
			present.set(key, count - 1)
			return false
		}),
		arrived: [
			...new Set(current.filter((source) => !before.has(source.id)).map((source) => source.id)),
		],
	}
}

/**
 * Collects the identifiers retained with maintained summary evidence.
 *
 * @param sources - The sources
 * @returns The uppercased hyphenated ids that hold a digit, in the order the sources first name them
 */
export function collectIds(sources: readonly AggregateSource[]): readonly string[] {
	return [...extractTokens(sources.map((source) => source.text).join('\n')).ids]
}

/**
 * Lists the sources by message id, sentence, and seed index.
 *
 * @param sources - The sources
 * @param seeds - The seed index of each message id
 * @returns One reference per source; the seed index is `undefined` for a message the seed does not hold
 */
export function buildRefs(
	sources: readonly AggregateSource[],
	seeds: ReadonlyMap<string, number>,
): readonly AggregateRef[] {
	return sources.map((source) => ({
		id: source.id,
		seed: seeds.get(source.id),
		sentence: source.sentence,
	}))
}

/**
 * Builds the summarizer's prompt.
 *
 * @param topic - The topic key, which names the two messages
 * @param title - The topic title that fills the `TOPIC` slot
 * @param asOf - The date that fills the `DATE` slot
 * @param sources - The lines to summarize
 * @param failures - The failures of the previous attempt; a retry includes exact kinds and tokens encoded as JSON data
 * @returns The system message and the user message of one source line per row
 */
export function buildSummaryPrompt(
	topic: string,
	title: string,
	asOf: string,
	sources: readonly AggregateSource[],
	failures: readonly AggregateFailure[] = [],
): readonly Message[] {
	const kinds = JSON.stringify(failures.map(({ kind, token }) => ({ kind, token })))
	const lines = sources.map(renderSource).join('\n')
	return [
		{ id: `${topic}:system`, role: 'system', content: fillSlots(SUMMARY_SYSTEM, title, asOf) },
		{
			id: `${topic}:user`,
			role: 'user',
			content:
				failures.length === 0
					? lines
					: `${lines}\n\n${RETRY_NOTE.replace(RETRY_SLOT, () => kinds)}`,
		},
	]
}

/**
 * Builds the CHANGE question for one topic.
 *
 * @param title - The topic title
 * @returns The noul question whose instructions name the topic
 */
export function buildChangeQuestion(title: string): NoulQuestion {
	return {
		form: 'noul',
		instructions: fillSlots(CHANGE_INSTRUCTIONS, title, ''),
		criteria: CHANGE_CRITERIA,
	}
}

/**
 * Builds the state of the CHANGE question.
 *
 * @param version - The version whose title, date, and prose the state quotes
 * @param lines - The lines of the arriving message
 * @returns `Summary of TOPIC as of DATE: PROSE`, then `Event: ROLE: LINES`
 */
export function buildChangeState(
	version: Pick<AggregateVersion, 'title' | 'asOf' | 'prose'>,
	lines: readonly AggregateSource[],
): string {
	const role = lines[0]?.role ?? ''
	return `${fillSlots(CHANGE_STATE_SUMMARY, version.title, version.asOf)}${version.prose}\n${CHANGE_STATE_EVENT}${role}: ${lines.map((line) => line.text).join(' ')}`
}

/**
 * Builds the state of the AGREE question.
 *
 * @param version - The version whose prose the state quotes
 * @param sources - The sources the version was built from
 * @returns The prose, then `Source messages:` and one source line per row
 */
export function buildAgreeState(
	version: Pick<AggregateVersion, 'prose'>,
	sources: readonly AggregateSource[],
): string {
	return JSON.stringify({ evidence: sources.map(renderSource), candidate: version.prose }, null, 1)
}

/** Partitions exact lines with the installed sentence splitter and refuses uncovered text.
 * @param candidate - Unchanged complete prose
 * @returns Ordered UTF-16 spans covering every nonwhitespace character
 */
export function partitionCandidate(candidate: string): readonly AggregateFocus[] {
	const spans: AggregateFocus[] = []
	let offset = 0
	for (const line of candidate.split(/\r\n|\n/)) {
		let cursor = 0
		if (line.trim() !== '')
			for (const text of splitSentences(line)) {
				const start = line.indexOf(text, cursor)
				if (
					text.trim() === '' ||
					start < cursor ||
					start < 0 ||
					/\S/u.test(line.slice(cursor, start))
				)
					throw new Error('Malformed sentence coverage')
				const end = start + text.length
				spans.push({ start: offset + start, end: offset + end, text })
				cursor = end
			}
		if (/\S/u.test(line.slice(cursor))) throw new Error('Uncovered line suffix')
		offset += line.length
		if (candidate.slice(offset, offset + 2) === '\r\n') offset += 2
		else if (candidate[offset] === '\n') offset += 1
	}
	validateCoverage(candidate, spans)
	return spans
}

/** Refuses omitted, overlapping, changed, and empty coverage.
 * @param candidate - Complete unchanged prose
 * @param spans - Exact proposed spans
 */
export function validateCoverage(candidate: string, spans: readonly AggregateFocus[]): void {
	if (spans.length === 0) throw new Error('Empty candidate coverage')
	let cursor = 0
	for (const span of spans) {
		if (
			!Number.isSafeInteger(span.start) ||
			!Number.isSafeInteger(span.end) ||
			span.start < cursor ||
			span.end <= span.start ||
			span.end > candidate.length ||
			span.text.trim() === '' ||
			candidate.slice(span.start, span.end) !== span.text
		)
			throw new Error('Span offset/text custody mismatch')
		if (/\S/u.test(candidate.slice(cursor, span.start)))
			throw new Error('Dropped nonwhitespace span coverage')
		cursor = span.end
	}
	if (/\S/u.test(candidate.slice(cursor))) throw new Error('Dropped nonwhitespace suffix coverage')
}

/** Builds all focused requests followed by the unchanged whole guard.
 * @param candidate - Complete unchanged prose
 * @param sources - Complete ordered source objects, including message grouping
 * @returns Native request fields and separate cache custody
 */
export function buildSupportPlan(
	candidate: string,
	sources: readonly AggregateSource[],
): AggregatePlan {
	return {
		revision: SUPPORT_REVISION,
		candidate,
		sources,
		context: JSON.stringify({ revision: SUPPORT_REVISION, candidate, sources }),
		components: [
			...partitionCandidate(candidate).map((focus) => ({
				id: `focus:${focus.start}:${focus.end}`,
				focus,
				state: JSON.stringify({ evidence: sources.map(renderSource), candidate, focus }, null, 1),
				question: FOCUS_QUESTION,
			})),
			{
				id: 'guard',
				state: buildAgreeState({ prose: candidate }, sources),
				question: AGREE_QUESTION,
			},
		],
	}
}

/** Recomputes the minimum only for complete exact membership and valid scores.
 * @param bundle - Attempted support evidence
 * @returns The weakest component, or absence for incomplete or invalid evidence
 */
export function reduceSupport(bundle: AggregateBundle): number | undefined {
	try {
		const plan = buildSupportPlan(bundle.candidate, bundle.sources)
		if (
			bundle.error !== undefined ||
			bundle.revision !== plan.revision ||
			bundle.context !== plan.context ||
			bundle.components.length !== plan.components.length
		)
			return undefined
		const scores: number[] = []
		for (const [index, expected] of plan.components.entries()) {
			const observed = bundle.components[index]
			if (
				observed === undefined ||
				observed.id !== expected.id ||
				observed.state !== expected.state ||
				!isDeepStrictEqual(observed.focus, expected.focus) ||
				!isDeepStrictEqual(observed.question, expected.question) ||
				observed.key !==
					buildCacheKey(bundle.model, expected.state, expected.question, plan.context) ||
				observed.error !== undefined ||
				observed.refusal !== undefined ||
				observed.score === undefined ||
				!Number.isFinite(observed.score) ||
				observed.score < 0 ||
				observed.score > 1
			)
				return undefined
			scores.push(observed.score)
		}
		return Math.min(...scores)
	} catch {
		return undefined
	}
}

/**
 * Renders the body of one entry: its title, its ids, and its prose, without the date and the markers.
 *
 * @param entry - The entry
 * @returns The three parts joined by newlines; the ids line is absent when the entry holds no id
 */
export function renderBody(entry: AggregateEntry): string {
	return [entry.title, entry.ids.join(IDS_SEPARATOR), entry.prose]
		.filter((part) => part !== '')
		.join('\n')
}

/**
 * Reads rendered topic bodies without their framing dates or the summaries heading.
 * @param text - A recorded summaries instruction
 * @returns The title, ids, and nonempty prose of each complete rendered entry
 */
export function collectSummaryBodies(text: string): readonly string[] {
	if (!text.startsWith(`${SUMMARIES_HEADING}\n\n`)) return []
	return text
		.split(/\n\n(?=#### )/)
		.slice(1)
		.flatMap((entry) => {
			const match = /^#### (.+), as of [^\n]*\n([\s\S]*)$/.exec(entry)
			if (match === null) return []
			const lines = (match[2] ?? '').split('\n')
			const header = lines[0] ?? ''
			const labeled = header.startsWith(IDS_LABEL)
			const prose = (labeled ? lines.slice(1) : lines).join('\n').trim()
			return prose === ''
				? []
				: [[match[1] ?? '', labeled ? header.slice(IDS_LABEL.length).trim() : '', prose].join('\n')]
		})
}

/**
 * Renders one entry as a summaries block holds it.
 *
 * @param entry - The entry
 * @returns `#### TITLE, as of DATE`, the `Ids:` line when the entry holds an id, and the prose
 */
export function renderEntry(entry: AggregateEntry): string {
	return [
		`#### ${entry.title}, as of ${entry.date}`,
		...(entry.ids.length === 0 ? [] : [`${IDS_LABEL} ${entry.ids.join(IDS_SEPARATOR)}`]),
		entry.prose,
	].join('\n')
}

/**
 * Prices a text as one system message.
 *
 * @param text - The text
 * @param scale - The tokens one estimate unit costs, from the ledger's gauge
 * @returns The estimate of the message times the scale
 */
export function priceText(text: string, scale: number): number {
	return estimateMessages([{ id: 'summaries', role: 'system', content: text }]) * scale
}

/**
 * Renders the entries as one block and cuts whole entries from the end until the block fits.
 *
 * @param entries - The entries in render order
 * @param allowance - The most tokens the block can cost
 * @param price - Prices the block text in tokens
 * @param admit - Checks the complete built request against the admission ceiling
 * @returns The block text, the entries kept, the entries cut, and the block price; with every entry cut the text is empty and the price is `0`
 */
export function renderSummaries(
	entries: readonly AggregateEntry[],
	allowance: number,
	price: (text: string) => number,
	admit: AggregateAdmission,
): AggregateBlock {
	for (let count = entries.length; count > 0; count -= 1) {
		const text = [SUMMARIES_HEADING, ...entries.slice(0, count).map(renderEntry)].join(
			ENTRY_SEPARATOR,
		)
		const tokens = price(text)
		if (tokens <= allowance && admit(text))
			return { text, kept: entries.slice(0, count), cut: entries.slice(count), tokens }
	}
	return { text: '', kept: [], cut: entries, tokens: 0 }
}

/**
 * Copies a summary's version, source projection, and maintenance boundary for consumer evidence.
 * @param version - The supported version, or absence
 * @returns An owned state binding, or undefined
 */
export function versionToState(version: AggregateVersion | undefined): AggregateState | undefined {
	return version === undefined
		? undefined
		: {
				version: version.version,
				goal: version.goal,
				point: version.point,
				sources: version.sources.map((source) => ({ ...source })),
			}
}
