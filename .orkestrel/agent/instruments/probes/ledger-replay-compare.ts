import type { ProviderCall, WireExchange } from './ledger-replay-support.js'
import type { Message } from '../../src/core/index.js'
import { isArray, isRecord, isString } from '@orkestrel/contract'
import { LEDGER_NOTES, extractTokens, splitSentences, splitTopic } from '../../src/core/index.js'
import { HANDLE_SENTENCE } from './ledger-replay-support.js'

// Compares one recorded agent request with the request the port sent. The recorded body is reduced to
// the members the port controls, normalized by N1 to N8, and, only when it still differs, reduced by the
// two residuals the plan lists: F4a on a pass that advertises no tool, and R2a on the briefing render
// only. N10, the T1 cut shift, then admits a recall, an answer note, or a recall that lists an answer note
// when the only difference is how many candidates the recall kept. Whatever differs after that is unlisted,
// and every unlisted body carries its causes. N9, the held second ask, belongs to the judge transport in
// `ledger-replay-support.ts`.

/** Names the causes an unlisted body is labeled with: C1 to C5 as `u8-report.md` names them, C6 and C8 as `u8b-probe-fix-brief.md` names them. C7 is the held second ask, which N9 admits. */
export const CAUSE = {
	c1: 'C1 seed assistant statements',
	c2: 'C2 cut room',
	c3: 'C3 earlier reading of a lookup',
	c4: 'C4 call text on a lookup line',
	c5: 'C5 earlier answer note in a recall',
	c6: 'C6 stale removal off the briefing route',
	c8: 'C8 unclassified',
} as const

export type Cause = (typeof CAUSE)[keyof typeof CAUSE]

/** Names the normalizations the replay applies to a recorded body. */
export const NORMALIZATIONS = [
	'N1 separator',
	'N2 handle sentence',
	'N3 result prefixes',
	'N4 line leads',
	'N5 amended marks',
	'N6 recall description',
	'N7 recall leads',
	'N8 ended pin lines',
	'N10 T1 cut shift',
] as const

export type NormalizationName = (typeof NORMALIZATIONS)[number]

/** Counts the normalizations applied. */
export type Applied = Record<NormalizationName, number>

/** Creates a zeroed {@link Applied} count. */
export function createApplied(): Applied {
	return {
		'N1 separator': 0,
		'N2 handle sentence': 0,
		'N3 result prefixes': 0,
		'N4 line leads': 0,
		'N5 amended marks': 0,
		'N6 recall description': 0,
		'N7 recall leads': 0,
		'N8 ended pin lines': 0,
		'N10 T1 cut shift': 0,
	}
}

/** Holds one wire message in the shape both sides compare. */
export interface WireMessage {
	readonly role: string
	readonly content: string
	readonly [member: string]: unknown
}

/** Holds a request body reduced to the members the port controls; `schema` is the recorded `format`. */
export interface WireBody {
	readonly messages: readonly WireMessage[]
	readonly tools: readonly unknown[] | undefined
	readonly think: unknown
	readonly schema: unknown
}

/** Names the residuals the plan lists: `records-port-planner.md` section 4. */
export type ResidualName = 'F4a' | 'R2a'

/** Holds one residual difference and its disposition. */
export interface Residual {
	readonly name: ResidualName
	readonly where: string
	readonly detail: string
}

/** Holds one difference the listed normalizations and residuals do not explain. */
export interface Unlisted {
	readonly where: string
	readonly role: string
	readonly recorded: readonly string[]
	readonly port: readonly string[]
	readonly kinds: readonly string[]
	readonly examples: ReadonlyArray<{ readonly kind: string; readonly recorded?: string; readonly port?: string }>
	readonly causes: readonly Cause[]
	/** Holds the lines no cause C1 to C7 explains, exactly as the comparison reads them. */
	readonly unclassified: { readonly recorded: readonly string[]; readonly port: readonly string[] }
}

/** Holds the outcome of comparing one request. */
export interface Comparison {
	readonly file: string
	readonly goal: string
	readonly call: number
	readonly status: 'equal' | 'residual' | 'shift' | 'unlisted'
	readonly residuals: readonly Residual[]
	readonly unlisted: readonly Unlisted[]
	readonly causes: readonly Cause[]
	/** Holds the messages N10 admitted in this body. */
	readonly admitted: readonly Admission[]
}

/** Holds what the comparison reads of the scenario seed and of the run's decisions. */
export interface SeedRoles {
	readonly roles: readonly string[]
	readonly texts: readonly string[]
	/** Holds, per seed handle, whether the message carries a tool call. */
	readonly calls: readonly boolean[]
	/** Holds the corrections the run decided: the later handles per earlier handle. */
	readonly corrections: ReadonlyMap<number, readonly number[]>
	/** Holds the topic names the scenario declares. */
	readonly names: readonly string[]
	/** Holds the handles the run filed under each topic name. */
	readonly labels: ReadonlyMap<string, readonly number[]>
	/** Holds the handles the run filed under a quiet category. */
	readonly quiet: readonly number[]
}

const RESULT_PREFIX = /^\[r\d+\] /
// N8: a pin line the measured recall and answer note print for an ended pin. Every referent is a handle.
export const PIN_LINE = /^p\d+ \([mr]\d+\) ended: superseded by [mr]\d+$/
const CUT_LINE = /^\d+ older items? not shown; /
const CUT_COUNT = /^(\d+) older items? not shown; /
const AMENDED_MARK = / \[amended by [^\]]+\]$/
const LEAD = /^(?:(m\d+): |(r\d+) (?=[a-z_]+ \{))/
// The briefing separator of the measured carrier: an instruction with an empty header (bench.mjs:3500
// `createInstructionManager({ format: { open: '' } })`) after the system text.
const MEASURED_SEPARATOR = '\n\n\n\n'
const PORT_SEPARATOR = '\n\n'
// bench.mjs:2840 recall description and the port's `Ledger` constructor text.
const MEASURED_RECALL_HEAD = 'a customer name, an order or account id, or one of the desk topics'
const PORT_RECALL_HEAD = 'an owner name, an id, or one of the desk topics'
const MEASURED_RECALL_TAIL =
	' Returns pins, messages, and results on it, newest first. A handle such as m12 or r5 returns that message or result.'
const PORT_RECALL_TAIL = ' Returns source lines, newest first.'
const MEASURED_TOPIC = 'A customer name, an order or account id, a desk topic, or a handle'
const PORT_TOPIC = 'An owner name, an id, or a desk topic'

interface Line {
	readonly text: string
	readonly lead: string | undefined
}

interface Options {
	// Applies F4a, and R2a on the briefing route.
	readonly residuals: boolean
	// Applies the stale removal on the recall and digest routes too, which only labels cause C6.
	readonly offRoute: boolean
	readonly roles: SeedRoles
}

// Holds one recorded message whose dropped pin lines shared their content with a cut line.
interface Room {
	readonly at: number
	readonly role: string
	readonly pins: readonly string[]
	readonly cuts: readonly string[]
}

interface Tally {
	readonly applied: Applied
	readonly residuals: Residual[]
	readonly room: Room[]
}

interface Reduced {
	readonly body: WireBody
	readonly leads: ReadonlyArray<ReadonlyMap<string, string>>
}

function cutLead(line: string, applied: Applied | undefined, name: NormalizationName): Line {
	const match = LEAD.exec(line)
	if (match === null) return { text: line, lead: undefined }
	if (applied !== undefined) applied[name] += 1
	return { text: line.slice(match[0].length), lead: match[1] ?? match[2] }
}

function cutMark(text: string, applied: Applied | undefined): string {
	const marked = AMENDED_MARK.test(text)
	if (marked && applied !== undefined) applied['N5 amended marks'] += 1
	return marked ? text.replace(AMENDED_MARK, '') : text
}

/**
 * Tells whether a sentence of a seed message is stale: the run decided a correction of that message, and
 * the sentence shares an id or a number with the correcting message (the test of `collectStale`).
 *
 * @param sentence - The sentence
 * @param handle - The 0-based handle of the message the sentence belongs to
 * @param roles - The seed texts and the decided corrections
 * @returns `true` when a decided correction made the sentence stale
 */
export function isStale(sentence: string, handle: number, roles: SeedRoles): boolean {
	const own = extractTokens(sentence)
	return (roles.corrections.get(handle) ?? []).some((later) => {
		const text = roles.texts[later]
		if (text === undefined) return false
		const other = extractTokens(text)
		return [...own.ids].some((id) => other.ids.has(id)) || [...own.numbers].some((n) => other.numbers.has(n))
	})
}

// R2a: the measured briefing lists a message's raw text, stale sentences included.
function dropStale(line: Line, options: Options, tally: Tally, where: string): string | undefined {
	const handle = line.lead?.startsWith('m') ? Number(line.lead.slice(1)) : undefined
	if (handle === undefined || handle >= options.roles.roles.length) return line.text
	const sentences = splitSentences(line.text)
	const kept = sentences.filter((sentence) => !isStale(sentence, handle, options.roles))
	if (kept.length === sentences.length) return line.text
	const removed = sentences.filter((sentence) => !kept.includes(sentence))
	tally.residuals.push({
		name: 'R2a',
		where,
		detail: `${line.lead}: ${kept.length === 0 ? 'the whole line' : 'the sentence'} ${JSON.stringify(removed.join(' '))}`,
	})
	return kept.length === 0 ? undefined : kept.join(' ')
}

function reduceLines(
	content: string,
	options: Options,
	tally: Tally,
	where: string,
	leadName: NormalizationName,
	stale: boolean,
	pins: boolean,
): { content: string; leads: Map<string, string>; pins: string[]; cuts: string[] } {
	const out: string[] = []
	const leads = new Map<string, string>()
	const dropped: string[] = []
	const cuts: string[] = []
	for (const raw of content.split('\n')) {
		// N8 reads the recorded line before any lead is cut.
		if (pins && PIN_LINE.test(raw)) {
			tally.applied['N8 ended pin lines'] += 1
			dropped.push(raw)
			continue
		}
		if (pins && CUT_LINE.test(raw)) cuts.push(raw)
		const cut = cutLead(raw, tally.applied, leadName)
		const text = cutMark(cut.text, tally.applied)
		const kept = stale ? dropStale({ text, lead: cut.lead }, options, tally, where) : text
		if (kept === undefined) continue
		out.push(kept)
		if (cut.lead !== undefined) leads.set(kept, cut.lead)
	}
	return { content: out.join('\n'), leads, pins: dropped, cuts }
}

function reduceMessage(
	message: WireMessage,
	at: number,
	options: Options,
	tally: Tally,
	where: string,
): { message: WireMessage; leads: Map<string, string> } {
	const { applied } = tally
	if (message.role === 'system' && at === 0) {
		let content = message.content
		if (content.includes(` ${HANDLE_SENTENCE}`)) {
			content = content.replace(` ${HANDLE_SENTENCE}`, '')
			applied['N2 handle sentence'] += 1
		}
		const split = content.indexOf(MEASURED_SEPARATOR)
		if (split < 0) return { message: { ...message, content }, leads: new Map() }
		const briefing = content.slice(split + MEASURED_SEPARATOR.length)
		const reduced = reduceLines(briefing, options, tally, where, 'N4 line leads', options.residuals, false)
		applied['N1 separator'] += 1
		return {
			message: {
				...message,
				content: `${content.slice(0, split)}${PORT_SEPARATOR}${reduced.content}`,
			},
			leads: reduced.leads,
		}
	}
	const digest = message.role === 'user' && message.content.startsWith(LEDGER_NOTES.results)
	if (message.role !== 'tool' && !digest) return { message, leads: new Map() }
	let content = message.content
	if (message.role === 'tool' && RESULT_PREFIX.test(content)) {
		content = content.replace(RESULT_PREFIX, '')
		applied['N3 result prefixes'] += 1
	}
	const reduced = reduceLines(content, options, tally, where, 'N7 recall leads', options.offRoute, true)
	// N8 admits a pin line only where the content holds no cut line: a cut line means the pin took room.
	if (reduced.pins.length > 0 && reduced.cuts.length > 0)
		tally.room.push({ at, role: message.role, pins: reduced.pins, cuts: reduced.cuts })
	return { message: { ...message, content: reduced.content }, leads: reduced.leads }
}

function reduceTool(tool: unknown, applied: Applied): unknown {
	if (!isRecord(tool) || !isRecord(tool.function) || tool.function.name !== 'recall') return tool
	const fn = tool.function
	let description = isString(fn.description) ? fn.description : undefined
	let parameters = fn.parameters
	let changed = false
	if (description?.includes(MEASURED_RECALL_HEAD) === true) {
		description = description
			.replace(MEASURED_RECALL_HEAD, PORT_RECALL_HEAD)
			.replace(MEASURED_RECALL_TAIL, PORT_RECALL_TAIL)
		changed = true
	}
	if (isRecord(parameters) && isRecord(parameters.properties) && isRecord(parameters.properties.topic)) {
		const topic = parameters.properties.topic
		if (topic.description === MEASURED_TOPIC) {
			parameters = {
				...parameters,
				properties: { ...parameters.properties, topic: { ...topic, description: PORT_TOPIC } },
			}
			changed = true
		}
	}
	if (changed) applied['N6 recall description'] += 1
	return {
		...tool,
		function: { ...fn, ...(description === undefined ? {} : { description }), parameters },
	}
}

function readMessages(value: unknown): readonly WireMessage[] {
	if (!isArray(value)) throw new Error('a body carries no messages')
	return value.map((entry) => {
		if (!isRecord(entry) || !isString(entry.role) || !isString(entry.content))
			throw new Error('unreadable wire message')
		return { ...entry, role: entry.role, content: entry.content }
	})
}

function reduceBody(
	body: Readonly<Record<string, unknown>>,
	options: Options,
	tally: Tally,
	where: string,
): Reduced {
	const tools = isArray(body.tools) ? body.tools.map((tool) => reduceTool(tool, tally.applied)) : undefined
	let reduced = readMessages(body.messages).map((message, at) =>
		reduceMessage(message, at, options, tally, where),
	)
	// F4a: the measured answer pass keeps the seed's tool calls and tool messages in its tail; the port
	// drops every call message and tool message from a pass that advertises no tool.
	if (options.residuals && tools === undefined) {
		const kept = reduced.filter(
			({ message }) => message.role !== 'tool' && message.tool_calls === undefined,
		)
		if (kept.length !== reduced.length) {
			tally.residuals.push({
				name: 'F4a',
				where,
				detail: `${reduced.length - kept.length} seed tool or call messages the answer pass no longer carries`,
			})
			reduced = kept
		}
	}
	return {
		body: { messages: reduced.map(({ message }) => message), tools, think: body.think, schema: body.format },
		leads: reduced.map(({ leads }) => leads),
	}
}

// bench.mjs:334 `mapMessages`, the wire form of one message.
function mapMessage(message: Message): WireMessage {
	return {
		role: message.role,
		content: message.content,
		...(message.calls !== undefined && message.calls.length > 0
			? {
					tool_calls: message.calls.map((call) => ({
						function: { name: call.name, arguments: call.arguments },
					})),
				}
			: {}),
		...(message.thinking === undefined ? {} : { thinking: message.thinking }),
		...(message.images === undefined ? {} : { images: message.images }),
	}
}

/**
 * Reduces one provider call of the port to the wire members the recorded body carries.
 *
 * @param call - The call the scripted provider received
 * @returns The wire body
 */
export function buildPortBody(call: ProviderCall): WireBody {
	return {
		messages: call.messages.map(mapMessage),
		tools:
			call.tools === undefined || call.tools.length === 0
				? undefined
				: call.tools.map((tool) => ({
						type: 'function',
						function: {
							name: tool.name,
							...(tool.description === undefined ? {} : { description: tool.description }),
							...(tool.parameters === undefined ? {} : { parameters: tool.parameters }),
						},
					})),
		think: call.options?.think,
		schema: call.options?.schema,
	}
}

function show(value: unknown): string {
	return JSON.stringify(value) ?? 'undefined'
}

/**
 * Serializes a value with sorted keys and without the members that hold `undefined`. The contract
 * package `canonicalStringify` returns `undefined` for any value that holds an `undefined` member, which
 * would make two different bodies compare equal.
 *
 * @param value - The value
 * @returns The serialization, always a string
 */
export function stable(value: unknown): string {
	return (
		JSON.stringify(value, (_key, current: unknown) =>
			isRecord(current) && !isArray(current)
				? Object.fromEntries(Object.entries(current).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)))
				: current,
		) ?? 'undefined'
	)
}

/** Names where two wire bodies differ. */
export interface BodyDifference {
	readonly where: string
	readonly recorded: unknown
	readonly port: unknown
}

/**
 * Lists every member and message position at which the recorded body differs from the port's.
 *
 * @param recorded - The reduced recorded body
 * @param port - The port's body
 * @returns The differences, empty when the bodies are equal
 */
export function diffBodies(recorded: WireBody, port: WireBody): readonly BodyDifference[] {
	const out: BodyDifference[] = []
	if (show(recorded.think) !== show(port.think))
		out.push({ where: 'think', recorded: recorded.think, port: port.think })
	if (stable(recorded.schema) !== stable(port.schema))
		out.push({ where: 'schema', recorded: recorded.schema, port: port.schema })
	if (stable(recorded.tools) !== stable(port.tools))
		out.push({ where: 'tools', recorded: recorded.tools, port: port.tools })
	const length = Math.max(recorded.messages.length, port.messages.length)
	for (let at = 0; at < length; at += 1) {
		const left = recorded.messages[at]
		const right = port.messages[at]
		if (stable(left) !== stable(right))
			out.push({ where: `messages[${at}]`, recorded: left, port: right })
	}
	return out
}

function splitLines(message: unknown): readonly string[] {
	return isRecord(message) && isString(message.content) ? message.content.split('\n') : []
}

type Tag =
	| 'pin'
	| 'earlier-reading'
	| 'assistant'
	| 'call-led'
	| 'trimmed'
	| 'corrector'
	| 'paired'
	| 'note-header'
	| 'cut'
	| 'port-only'
	| 'seed-port'
	| 'regroup'
	| 'order'
	| 'nested'
	| 'bare'
	| 'other'
	| 'absent'

interface Tagged {
	readonly side: 'recorded' | 'port' | 'both'
	readonly text: string
	readonly tag: Tag
	// Marks a recorded-only line that follows the recorded earlier answer note header in the same message.
	readonly inNote?: boolean
}

// Names why a recorded line is absent from the port's request, from its lead and its role in the seed.
// A lookup line counts as an earlier reading only while the port still lists the same text.
function kindOf(
	line: string,
	lead: string | undefined,
	roles: SeedRoles,
	portLines: ReadonlySet<string>,
): { readonly kind: string; readonly tag: Tag } {
	if (line.startsWith(LEDGER_NOTES.results)) return { kind: 'earlier answer note header', tag: 'note-header' }
	if (/^p\d+ \(/.test(line)) return { kind: 'pin line', tag: 'pin' }
	if (CUT_LINE.test(line)) return { kind: 'recall cut line', tag: 'cut' }
	if (lead?.startsWith('r') === true)
		return portLines.has(line)
			? { kind: 'lookup line of an earlier reading of the same call', tag: 'earlier-reading' }
			: { kind: 'lookup line the port does not list', tag: 'other' }
	if (lead?.startsWith('m') === true) {
		const at = Number(lead.slice(1))
		if (at >= roles.roles.length) return { kind: 'line of a ledger note or request (nested digest)', tag: 'nested' }
		const role = roles.roles[at] ?? 'unknown'
		return { kind: `${role} message line`, tag: role === 'assistant' ? 'assistant' : 'other' }
	}
	return { kind: 'line without a lead', tag: 'bare' }
}

export function explain(
	difference: BodyDifference,
	leads: ReadonlyMap<string, string> | undefined,
	roles: SeedRoles,
	known: ReadonlySet<number> = new Set(),
): { readonly entry: Unlisted; readonly tags: readonly Tagged[]; readonly amended: ReadonlySet<number> } {
	if (!difference.where.startsWith('messages[')) {
		const recorded = show(difference.recorded)
		const port = show(difference.port)
		return {
			entry: {
				where: difference.where,
				role: 'request',
				recorded: [recorded],
				port: [port],
				kinds: [`${difference.where} differ`],
				examples: [{ kind: `${difference.where} differ`, recorded, port }],
				causes: [CAUSE.c8],
				unclassified: { recorded: [recorded], port: [port] },
			},
			tags: [],
			amended: new Set(),
		}
	}
	const left = splitLines(difference.recorded)
	const right = splitLines(difference.port)
	// A multiset difference: a line the recorded request lists twice and the port once is recorded-only once.
	const rest = new Map<string, number>()
	for (const line of right) rest.set(line, (rest.get(line) ?? 0) + 1)
	const onlyRecorded: string[] = []
	const commonLeft: string[] = []
	for (const line of left) {
		const count = rest.get(line) ?? 0
		if (count > 0) {
			rest.set(line, count - 1)
			commonLeft.push(line)
		} else onlyRecorded.push(line)
	}
	const unmatched = new Map<string, number>()
	for (const line of left) unmatched.set(line, (unmatched.get(line) ?? 0) + 1)
	const onlyPort: string[] = []
	const commonRight: string[] = []
	for (const line of right) {
		const count = unmatched.get(line) ?? 0
		if (count > 0) {
			unmatched.set(line, count - 1)
			commonRight.push(line)
		} else onlyPort.push(line)
	}
	const examples: Array<{ kind: string; recorded?: string; port?: string }> = []
	const tags: Tagged[] = []
	const add = (kind: string, recorded?: string, port?: string): void => {
		if (!examples.some((example) => example.kind === kind))
			examples.push({
				kind,
				...(recorded === undefined ? {} : { recorded }),
				...(port === undefined ? {} : { port }),
			})
	}
	const paired = new Set<string>()
	for (const line of onlyPort) {
		const twin = onlyRecorded.find((other) => /^[a-z_]+ \{/.test(line) && line.endsWith(`: ${other}`))
		if (twin !== undefined) {
			paired.add(twin)
			add('lookup line led by its call in the port only', twin, line)
			tags.push({ side: 'port', text: line, tag: 'call-led' }, { side: 'recorded', text: twin, tag: 'paired' })
		} else {
			// A port line whose sentences all sit in one recorded-only line is that line with sentences removed.
			const ownSentences = splitSentences(line)
			const whole = onlyRecorded.find((other) => {
				if (paired.has(other) || other === line) return false
				const all = splitSentences(other)
				return ownSentences.length < all.length && ownSentences.every((sentence) => all.includes(sentence))
			})
			if (whole !== undefined) {
				paired.add(whole)
				add('line with sentences missing from the port', whole, line)
				tags.push({ side: 'port', text: line, tag: 'trimmed' }, { side: 'recorded', text: whole, tag: 'trimmed' })
			} else {
				add('line only in the port', undefined, line)
				tags.push({ side: 'port', text: line, tag: roles.texts.includes(line) ? 'seed-port' : 'port-only' })
			}
		}
	}
	const portLines = new Set(commonRight)
	const headerAt = left.findIndex((line) => line.startsWith(LEDGER_NOTES.results))
	const noteLines = new Set(headerAt < 0 ? [] : left.slice(headerAt + 1))
	const missing = onlyRecorded
		.filter((line) => !paired.has(line))
		.map((line) => ({ line, lead: leads?.get(line), ...kindOf(line, leads?.get(line), roles, portLines) }))
	// A correcting message the measured recall lists beside the seed assistant line it amends: the symptom
	// of cause C1 that `u8-report.md` names the user line.
	const amended = new Set([
		...known,
		...missing.flatMap((one) =>
			one.tag === 'assistant' && one.lead !== undefined ? roles.corrections.get(Number(one.lead.slice(1))) ?? [] : [],
		),
	])
	for (const one of missing) {
		const corrector = one.tag === 'other' && one.lead !== undefined && amended.has(Number(one.lead.slice(1)))
		const kind = corrector ? 'correcting line listed beside the seed assistant line it amends' : one.kind
		add(kind, one.line)
		tags.push({
			side: 'recorded',
			text: one.line,
			tag: corrector ? 'corrector' : one.tag,
			...(noteLines.has(one.line) ? { inNote: true } : {}),
		})
	}
	if (difference.recorded === undefined) {
		add('message absent from the recorded request')
		tags.push({ side: 'both', text: 'message absent from the recorded request', tag: 'absent' })
	}
	if (difference.port === undefined) {
		add('message absent from the port request')
		tags.push({ side: 'both', text: 'message absent from the port request', tag: 'absent' })
	}
	if (JSON.stringify(commonLeft) !== JSON.stringify(commonRight)) {
		add('common lines in another order', commonLeft.join(' / '), commonRight.join(' / '))
		// The order is a symptom of cause C1 only when it agrees once the amenders of the missing seed
		// assistant lines leave both sequences: the measured recall lists an amender beside its source.
		const apart = (lines: readonly string[]): string =>
			JSON.stringify(
				lines.filter((line) => {
					const lead = leads?.get(line)
					return !(lead?.startsWith('m') === true && amended.has(Number(lead.slice(1))))
				}),
			)
		tags.push({
			side: 'both',
			text: `${commonLeft.join(' / ')} <> ${commonRight.join(' / ')}`,
			tag: apart(commonLeft) === apart(commonRight) ? 'regroup' : 'order',
		})
	}
	if (isRecord(difference.recorded) && isRecord(difference.port)) {
		const members = (message: Readonly<Record<string, unknown>>): string =>
			stable(Object.fromEntries(Object.entries(message).filter(([name]) => name !== 'content')))
		const before = members(difference.recorded)
		const after = members(difference.port)
		if (before !== after) {
			add('message members other than content differ', before, after)
			tags.push(
				{ side: 'recorded', text: before, tag: 'other' },
				{ side: 'port', text: after, tag: 'other' },
			)
		}
	}
	const role = isRecord(difference.recorded)
		? String(difference.recorded.role)
		: isRecord(difference.port)
			? String(difference.port.role)
			: 'absent'
	return {
		entry: {
			where: difference.where,
			role,
			recorded: onlyRecorded,
			port: onlyPort,
			kinds: examples.map((example) => example.kind),
			examples,
			causes: [],
			unclassified: { recorded: [], port: [] },
		},
		tags,
		amended,
	}
}

// Counts the items of the port-only seed lines: a seed line and the lines of the messages that amend it
// are one item, so a line that another listed line amends does not count on its own.
function countItems(lines: readonly string[], roles: SeedRoles): number {
	const at = lines.map((line) => roles.texts.indexOf(line))
	return at.filter(
		(handle, order) =>
			!at.some(
				(other, index) => index !== order && other !== handle && roles.corrections.get(other)?.includes(handle) === true,
			),
	).length
}

// Names the cause of every tagged line. A symptom of cause C1 counts as C1 only beside a recorded-only
// seed assistant line in the same message: the cut line, a regrouped order of common lines, and a port-only
// seed line while the items those lines make (a seed line with its amenders) number at most the sum of the
// counts the recorded cut lines state. An earlier reading counts as C3 only while the port lists the same
// text. A bare or nested line counts as C5 only when it is a line of the recorded earlier answer note that
// the same message carries. Any other line is unclassified, and its exact text is kept.
export function classify(
	tags: readonly Tagged[],
	roles: SeedRoles,
): {
	readonly causes: ReadonlySet<Cause>
	readonly unclassified: { readonly recorded: readonly string[]; readonly port: readonly string[] }
} {
	const causes = new Set<Cause>()
	const recorded: string[] = []
	const port: string[] = []
	const has = (tag: Tag): boolean => tags.some((one) => one.tag === tag)
	const c1 = (has('assistant') || has('corrector')) && !has('absent')
	const room = c1 && has('cut')
	const c5 = has('note-header')
	const cut = tags.reduce(
		(sum, one) => sum + (one.tag === 'cut' ? Number(CUT_COUNT.exec(one.text)?.[1] ?? 0) : 0),
		0,
	)
	const items = countItems(
		tags.flatMap((one) => (one.tag === 'seed-port' ? [one.text] : [])),
		roles,
	)
	for (const one of tags) {
		const explained =
			one.tag === 'earlier-reading'
				? CAUSE.c3
				: one.tag === 'assistant'
					? CAUSE.c1
					: one.tag === 'call-led' || one.tag === 'paired'
						? CAUSE.c4
						: one.tag === 'note-header'
							? CAUSE.c5
							: (one.tag === 'nested' || one.tag === 'bare') && c5 && one.inNote === true
								? CAUSE.c5
								: (one.tag === 'cut' || one.tag === 'regroup' || one.tag === 'corrector') && c1
									? CAUSE.c1
									: one.tag === 'seed-port' && room && items <= cut
										? CAUSE.c1
										: undefined
		if (explained !== undefined) {
			causes.add(explained)
			continue
		}
		if (one.side !== 'port') recorded.push(one.text)
		if (one.side !== 'recorded') port.push(one.text)
	}
	return { causes, unclassified: { recorded, port } }
}

// Maps a line of the labeling pass back to the line the recorded or port request holds, so an
// unclassified entry shows the exact text: the labeling pass can hold the line with stale sentences removed.
function widen(lines: readonly string[], exact: readonly string[]): readonly string[] {
	const out = lines.map((line) => {
		if (exact.includes(line)) return line
		const sentences = splitSentences(line)
		return (
			exact.find(
				(other) => other.startsWith(line) || sentences.every((sentence) => splitSentences(other).includes(sentence)),
			) ?? line
		)
	})
	return [...new Set(out)]
}

// N10: the T1 cut shift. Plan ruling T1 gives the port handle-free lines and a shorter prompt, so its items
// are smaller and its room differs, and the port keeps another number of the same candidates in the same order
// (`f2-recall-residue-rooms.json`: its Gauge equals the measured formula on identical inputs). A shift is
// admitted only by a mechanical check on the reduced lines of one message:
// - the message answers a `recall` call, and both sides carry the same topic;
// - the candidate sequence of that topic comes from the seed, the decided filings and amendments, and, for a
//   topic no desk topic names, the words of the topic (`listRecallCandidates`): a source line with its decided
//   amenders is one item, newest first;
// - the lines of each side are exactly its first items of that sequence, whole, and its cut line is the fixed
//   notice naming the items it left out, absent when it left none;
// - the two sides keep another number of items, so the longer side's extra items are the next whole items of
//   the sequence.
// An answer note is admitted only when the lines that differ are the extra items of recalls that the same goal
// made on an earlier call, each whole and once, at the position that call's recall puts them; a shift that later requests carry again counts once. A recall that
// lists an admitted answer note carries that note as its first item, with the lines the note held on each side,
// and the shift is then read on the items after the note.

/** Holds one message that N10 admitted. */
export interface Admission {
	readonly where: string
	readonly kind: 'recall' | 'answer note' | 'recall that lists an answer note'
	/** Holds the candidates the recorded recall kept; `undefined` for an answer note. */
	readonly recordedKept: number | undefined
	/** Holds the candidates the port recall kept; `undefined` for an answer note. */
	readonly portKept: number | undefined
	/** Holds the count the cut line names, 0 when the side has none; 0 for an answer note. */
	readonly recordedCut: number
	readonly portCut: number
	/** Holds the lines the shift put on one side only. */
	readonly lines: readonly string[]
	/** Holds the topic the recall asked; `undefined` for an answer note. */
	readonly topic: string | undefined
	/** Holds the labels of the candidate sequence the recall drew from, newest first; empty for an answer note. */
	readonly candidates: readonly string[]
}

/** Holds one whole item of a recall's candidate sequence: a source with its decided amenders. */
export interface RecallItem {
	readonly label: string
	readonly lines: readonly string[]
}

/** Holds the items one admitted recall put on its longer side only, tied to the goal and call that made it. */
export interface ShiftEntry {
	readonly goal: string
	readonly call: number
	readonly side: 'recorded' | 'port'
	/** Holds the line of the longer side that precedes the first extra item. */
	readonly anchor: string
	/** Holds the extra items in sequence order, each as its whole lines. */
	readonly items: ReadonlyArray<readonly string[]>
}

/** Holds one admitted answer note: its lines on each side and the entries it dropped. */
export interface ShiftNote {
	readonly goal: string
	readonly call: number
	readonly recorded: readonly string[]
	readonly port: readonly string[]
	readonly entries: readonly ShiftEntry[]
}

/** Holds what the admitted shifts of one copy put on one side only. */
export interface ShiftPool {
	readonly entries: ShiftEntry[]
	readonly notes: ShiftNote[]
}

/** Creates an empty {@link ShiftPool}. */
export function createShiftPool(): ShiftPool {
	return { entries: [], notes: [] }
}

/** Holds where a comparison sits in its copy and the reduced bodies N10 reads. */
export interface ShiftContext {
	readonly goal: string
	readonly call: number
	readonly recorded: WireBody
	readonly port: WireBody
}

interface Peeled {
	readonly lines: readonly string[]
	readonly cut: number
}

interface Shifted {
	readonly side: 'recorded' | 'port'
	readonly extra: readonly RecallItem[]
	readonly anchor: string
	readonly recordedKept: number
	readonly portKept: number
	readonly candidates: readonly string[]
}

const CUT_EXACT = /^([1-9]\d*) older (items?) not shown; name a narrower topic to narrow the recall$/

function lower(text: string): string {
	return text.toLowerCase()
}

function readWords(part: string): readonly string[] {
	return part
		.split(/\s+/)
		.map((word) => word.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '').toLowerCase())
		.filter((word) => word !== '')
}

/**
 * Lists the candidate sequence of a recall topic, newest first, from what the probe holds of the run.
 *
 * @remarks
 * A seed message is a candidate when the run filed it under a desk topic the topic words name and no quiet
 * category, or, for words no desk topic names, when a user message holds every word. A candidate with its
 * decided amenders is one item. An answer note the recall lists is the first item when it holds every word.
 * The ledger's registry of ids and owners is a state the probe does not hold, so a topic part that names an id,
 * or whose words a lookup result holds, has no sequence.
 *
 * @param topic - The topic the recall asked
 * @param roles - The seed texts, filings, and decided corrections
 * @param note - The lines of the answer note the recall lists, if any
 * @returns The items, or `undefined` when the topic is one this derivation does not cover
 */
export function listRecallCandidates(
	topic: string,
	roles: SeedRoles,
	note?: readonly string[],
): readonly RecallItem[] | undefined {
	const matched = new Set<string>()
	const wordings: Array<readonly string[]> = []
	for (const part of splitTopic(topic.trim())) {
		const words = readWords(part)
		if (words.length === 0 || extractTokens(part).ids.size > 0) return undefined
		const names = roles.names.filter((name) => words.every((word) => lower(name).includes(word)))
		for (const name of names) matched.add(name)
		if (names.length === 0) wordings.push(words)
	}
	const read = (handle: number): string => lower(roles.texts[handle] ?? '')
	if (
		wordings.some((words) =>
			roles.roles.some((role, handle) => role === 'tool' && words.every((word) => read(handle).includes(word))),
		)
	)
		return undefined
	const chosen = (handle: number): boolean => {
		const role = roles.roles[handle]
		const filed =
			role !== 'tool' &&
			roles.calls[handle] !== true &&
			!roles.quiet.includes(handle) &&
			[...matched].some((name) => roles.labels.get(name)?.includes(handle) === true)
		const worded = role === 'user' && wordings.some((words) => words.every((word) => read(handle).includes(word)))
		return filed || worded
	}
	const done = new Set<number>()
	const items: RecallItem[] = []
	for (let handle = roles.roles.length - 1; handle >= 0; handle -= 1) {
		if (!chosen(handle)) continue
		const queue = [handle]
		const members: number[] = []
		while (queue.length > 0) {
			const id = queue.shift()
			if (id === undefined || done.has(id)) continue
			done.add(id)
			members.push(id)
			queue.push(...[...(roles.corrections.get(id) ?? [])].sort((left, right) => left - right))
		}
		if (members.length > 0)
			items.push({
				label: members.map((id) => `m${id}`).join('+'),
				lines: members.flatMap((id) => (roles.texts[id] ?? '').split('\n')),
			})
	}
	if (note !== undefined && wordings.some((words) => words.every((word) => lower(note.join('\n')).includes(word))))
		items.unshift({ label: 'note', lines: note })
	return items
}

// Splits the cut line off the end of a message. The cut line is the fixed notice with a count of at least 1
// and `item` or `items` agreeing with it; any other line shaped like one, or one that is not last, is no shift.
function peelCut(lines: readonly string[]): Peeled | undefined {
	const at = lines.findIndex((line) => CUT_LINE.test(line))
	if (at < 0) return { lines, cut: 0 }
	const match = at === lines.length - 1 ? CUT_EXACT.exec(lines[at] ?? '') : null
	if (match === null) return undefined
	const count = Number(match[1])
	if (lines[at] !== `${count} older ${count === 1 ? 'item' : 'items'} not shown; name a narrower topic to narrow the recall`) return undefined
	return { lines: lines.slice(0, at), cut: count }
}

// Counts the items a side kept: its lines must be exactly the first items of the sequence, whole.
function keptItems(lines: readonly string[], sequence: readonly RecallItem[]): number | undefined {
	let at = 0
	let kept = 0
	for (const item of sequence) {
		if (at >= lines.length) break
		if (!item.lines.every((line, order) => lines[at + order] === line)) return undefined
		at += item.lines.length
		kept += 1
	}
	return at === lines.length && kept > 0 ? kept : undefined
}

// The check of the header comment on two peeled messages and the sequence of each side.
function checkShift(
	recorded: Peeled,
	port: Peeled,
	sequences: { readonly recorded: readonly RecallItem[]; readonly port: readonly RecallItem[] },
): Shifted | undefined {
	const total = sequences.recorded.length
	if (sequences.port.length !== total) return undefined
	const left = keptItems(recorded.lines, sequences.recorded)
	const right = keptItems(port.lines, sequences.port)
	if (left === undefined || right === undefined || left === right) return undefined
	if (recorded.cut !== total - left || port.cut !== total - right) return undefined
	const side = left > right ? 'recorded' : 'port'
	const long = sequences[side]
	const short = Math.min(left, right)
	const prefix = long.slice(0, short).flatMap((item) => item.lines)
	const anchor = prefix[prefix.length - 1]
	if (anchor === undefined) return undefined
	return {
		side,
		extra: long.slice(short, Math.max(left, right)),
		anchor,
		recordedKept: left,
		portKept: right,
		candidates: long.map((item) => item.label),
	}
}

function readPair(difference: BodyDifference): { readonly recorded: WireMessage; readonly port: WireMessage } | undefined {
	const { recorded, port } = difference
	if (!isRecord(recorded) || !isRecord(port) || !isString(recorded.content) || !isString(port.content)) return undefined
	if (recorded.role !== port.role || !isString(recorded.role)) return undefined
	const members = (message: Readonly<Record<string, unknown>>): string =>
		stable(Object.fromEntries(Object.entries(message).filter(([name]) => name !== 'content')))
	if (members(recorded) !== members(port)) return undefined
	return {
		recorded: { ...recorded, role: recorded.role, content: recorded.content },
		port: { ...port, role: recorded.role, content: port.content },
	}
}

// Reads the topic of the `recall` call a tool message answers: the tool messages that follow an assistant
// message answer its calls in order. A tool message that answers any other call has no topic.
function readTopic(body: WireBody, at: number): string | undefined {
	let start = at
	while (start > 0 && body.messages[start - 1]?.role === 'tool') start -= 1
	const asked = body.messages[start - 1]
	if (asked?.role !== 'assistant' || !isArray(asked.tool_calls)) return undefined
	const call: unknown = asked.tool_calls[at - start]
	const fn = isRecord(call) ? call.function : undefined
	if (!isRecord(fn) || fn.name !== 'recall' || !isRecord(fn.arguments) || !isString(fn.arguments.topic))
		return undefined
	return fn.arguments.topic.trim()
}

function startsWith(lines: readonly string[], head: readonly string[]): boolean {
	return head.length > 0 && head.every((line, at) => lines[at] === line)
}

// Contracts 1, 2, 4, 5, and 6: a recall whose only difference is how many items of its candidate sequence it
// kept, with an admitted answer note as its first item when it lists one.
function admitRecall(
	difference: BodyDifference,
	roles: SeedRoles,
	context: ShiftContext,
	pool: ShiftPool,
): Admission | undefined {
	const pair = readPair(difference)
	if (pair === undefined || pair.recorded.role !== 'tool') return undefined
	const at = Number.parseInt(difference.where.slice(9), 10)
	const topic = readTopic(context.recorded, at)
	if (topic === undefined || topic !== readTopic(context.port, at)) return undefined
	const recorded = peelCut(pair.recorded.content.split('\n'))
	const port = peelCut(pair.port.content.split('\n'))
	if (recorded === undefined || port === undefined) return undefined
	const listed = (lines: readonly string[]): boolean => lines[0]?.startsWith(LEDGER_NOTES.results) === true
	let note: ShiftNote | undefined
	if (listed(recorded.lines) || listed(port.lines)) {
		if (!listed(recorded.lines) || !listed(port.lines)) return undefined
		// The note's own lines run from its header to its last line, which the admitted note's line counts fix.
		note = pool.notes.find(
			(one) =>
				(one.goal !== context.goal || one.call < context.call) &&
				startsWith(recorded.lines, one.recorded) &&
				startsWith(port.lines, one.port),
		)
		if (note === undefined) return undefined
	}
	const left = listRecallCandidates(topic, roles, note?.recorded)
	const right = listRecallCandidates(topic, roles, note?.port)
	if (left === undefined || right === undefined) return undefined
	const shifted = checkShift(recorded, port, { recorded: left, port: right })
	if (shifted === undefined) return undefined
	const { goal, call } = context
	// A later request carries the same recall in its history; the first call that carried a shift keeps it, once.
	for (const entry of [
		{ goal, call, side: shifted.side, anchor: shifted.anchor, items: shifted.extra.map((item) => item.lines) },
		...(note?.entries ?? []).map((pooled) => ({ ...pooled, goal, call })),
	])
		if (!pool.entries.some((held) => held.goal === entry.goal && held.side === entry.side && held.anchor === entry.anchor && JSON.stringify(held.items) === JSON.stringify(entry.items)))
			pool.entries.push(entry)
	return {
		where: difference.where,
		kind: note === undefined ? 'recall' : 'recall that lists an answer note',
		recordedKept: shifted.recordedKept,
		portKept: shifted.portKept,
		recordedCut: recorded.cut,
		portCut: port.cut,
		lines: [
			...(note?.entries ?? []).flatMap((entry) => entry.items.flat()),
			...shifted.extra.flatMap((item) => item.lines),
		],
		topic,
		candidates: shifted.candidates,
	}
}

// Removes the items of one entry from the lines of a note: each whole, once, in item order, from the line that
// follows the entry's anchor. An item the other side lists too is no shift and stays.
function takeEntry(lines: string[], other: readonly string[], entry: ShiftEntry): readonly string[] {
	const removed: string[] = []
	const anchor = lines.indexOf(entry.anchor)
	if (anchor < 0) return removed
	for (const item of entry.items) {
		if (item.some((line) => other.includes(line))) break
		if (!item.every((line, order) => lines[anchor + 1 + order] === line)) break
		lines.splice(anchor + 1, item.length)
		removed.push(...item)
	}
	return removed
}

// Contract 3: an answer note whose differing lines are the extra items of recalls that the same goal made on an
// earlier call.
function admitNote(difference: BodyDifference, context: ShiftContext, pool: ShiftPool): Admission | undefined {
	const pair = readPair(difference)
	if (pair === undefined || pair.recorded.role !== 'user') return undefined
	if (
		!pair.recorded.content.startsWith(LEDGER_NOTES.results) ||
		!pair.port.content.startsWith(LEDGER_NOTES.results)
	)
		return undefined
	const recorded = pair.recorded.content.split('\n')
	const port = pair.port.content.split('\n')
	const work = { recorded: [...recorded], port: [...port] }
	const used: ShiftEntry[] = []
	const dropped: string[] = []
	for (const entry of pool.entries) {
		if (entry.goal !== context.goal || entry.call >= context.call) continue
		const removed = takeEntry(work[entry.side], entry.side === 'recorded' ? work.port : work.recorded, entry)
		if (removed.length === 0) continue
		used.push(entry)
		dropped.push(...removed)
	}
	if (dropped.length === 0 || JSON.stringify(work.recorded) !== JSON.stringify(work.port)) return undefined
	pool.notes.push({ goal: context.goal, call: context.call, recorded, port, entries: used })
	return {
		where: difference.where,
		kind: 'answer note',
		recordedKept: undefined,
		portKept: undefined,
		recordedCut: 0,
		portCut: 0,
		lines: dropped,
		topic: undefined,
		candidates: [],
	}
}

/**
 * Admits the messages N10 explains: each recall that differs only in how many items of its candidate
 * sequence it kept, and each answer note whose differing lines are the extra items of an earlier recall of the
 * same goal. Every admission registers its items in the pool and counts under `N10 T1 cut shift`.
 *
 * @param differences - The message differences left after N1 to N9 and the residuals
 * @param roles - The seed texts, filings, and decided corrections
 * @param context - The goal, the call index, and the reduced bodies
 * @param pool - What the admitted shifts of the copy put on one side only
 * @param applied - The counters
 * @returns The admissions, in message order
 */
export function admitShifts(
	differences: readonly BodyDifference[],
	roles: SeedRoles,
	context: ShiftContext,
	pool: ShiftPool,
	applied: Applied,
): readonly Admission[] {
	const admitted: Admission[] = []
	for (const difference of differences) {
		if (!difference.where.startsWith('messages[')) continue
		const one = admitRecall(difference, roles, context, pool) ?? admitNote(difference, context, pool)
		if (one === undefined) continue
		admitted.push(one)
		applied['N10 T1 cut shift'] += 1
	}
	return admitted
}

/** Holds the inputs of one request comparison. */
export interface CompareInput {
	readonly recorded: WireExchange
	readonly call: ProviderCall
	readonly goal: string
	readonly index: number
	readonly roles: SeedRoles
	readonly applied: Applied
	/** Holds what the earlier admitted shifts of the copy put on one side; a call with none admits no answer note. */
	readonly shifts?: ShiftPool
}

/**
 * Reduces a recorded request to the body the port is compared with after N1 to N8, with no residual.
 *
 * @param recorded - The recorded exchange
 * @param roles - The seed texts and the decided corrections
 * @returns The reduced body
 */
export function reduceRecorded(recorded: WireExchange, roles: SeedRoles): WireBody {
	const off = { residuals: false, offRoute: false, roles }
	return reduceBody(recorded.body, off, { applied: createApplied(), residuals: [], room: [] }, '').body
}

function describeRoom(hit: Room): Unlisted {
	const kind = 'ended pin lines in a result that also carries a cut line'
	return {
		where: `messages[${hit.at}]`,
		role: hit.role,
		recorded: [...hit.pins, ...hit.cuts],
		port: [],
		kinds: [kind],
		examples: [{ kind, recorded: hit.pins.join(' / ') }],
		causes: [CAUSE.c2],
		unclassified: { recorded: [], port: [] },
	}
}

/**
 * Compares one recorded agent request with the port's: equal after N1 to N8, equal after the listed
 * residuals F4a and R2a, equal after N10 admitted the cut shifts the residuals leave, or unlisted with its
 * causes. A recorded result that N8 cut pin lines from and that also carries a cut line is unlisted with
 * `C2 cut room`, whatever else matches.
 *
 * @param input - The recorded exchange, the port's call, and the counters
 * @returns The comparison
 */
export function compareCall(input: CompareInput): Comparison {
	const { recorded, call, goal, index, roles, applied } = input
	const where = `${goal} call ${index}`
	const base = { file: recorded.file, goal, call: index }
	const port = buildPortBody(call)
	const off = { residuals: false, offRoute: false, roles }
	const plainTally: Tally = { applied, residuals: [], room: [] }
	const plain = reduceBody(recorded.body, off, plainTally, where)
	const room = plainTally.room.map(describeRoom)
	const crowded = (
		entries: readonly Unlisted[],
		residuals: readonly Residual[],
		admitted: readonly Admission[] = [],
	): Comparison => {
		const all = [...room, ...entries]
		return {
			...base,
			status: 'unlisted',
			residuals,
			unlisted: all,
			causes: [...new Set(all.flatMap((one) => one.causes))].sort(),
			admitted,
		}
	}
	if (diffBodies(plain.body, port).length === 0)
		return room.length > 0
			? crowded([], [])
			: { ...base, status: 'equal', residuals: [], unlisted: [], causes: [], admitted: [] }
	const tally: Tally = { applied: createApplied(), residuals: [], room: [] }
	const reduced = reduceBody(recorded.body, { ...off, residuals: true }, tally, where)
	const differences = diffBodies(reduced.body, port)
	if (differences.length === 0)
		return room.length > 0
			? crowded([], tally.residuals)
			: { ...base, status: 'residual', residuals: tally.residuals, unlisted: [], causes: [], admitted: [] }
	// N10 reads the messages the residuals leave: a message it admits leaves the unlisted differences.
	const admitted = admitShifts(
		differences,
		roles,
		{ goal, call: index, recorded: reduced.body, port },
		input.shifts ?? createShiftPool(),
		applied,
	)
	const open = differences.filter((difference) => !admitted.some((one) => one.where === difference.where))
	if (open.length === 0)
		return room.length > 0
			? crowded([], tally.residuals, admitted)
			: { ...base, status: 'shift', residuals: tally.residuals, unlisted: [], causes: [], admitted }
	// The labeling pass: the same reduction with the stale removal applied on the recall and digest routes
	// too. A line that pass explains is a stale removal off the briefing route.
	const soft = reduceBody(
		recorded.body,
		{ ...off, residuals: true, offRoute: true },
		{ applied: createApplied(), residuals: [], room: [] },
		where,
	)
	const softDifferences = diffBodies(soft.body, port)
	const unlisted = open.map((difference): Unlisted => {
		const at = difference.where.startsWith('messages[') ? Number.parseInt(difference.where.slice(9), 10) : -1
		const strict = explain(difference, reduced.leads[at], roles)
		if (at < 0) return strict.entry
		const other = softDifferences.find((one) => one.where === difference.where)
		const labeled = other === undefined ? undefined : explain(other, soft.leads[at], roles, strict.amended)
		const causes = new Set<Cause>()
		let unclassified: Unlisted['unclassified'] = { recorded: [], port: [] }
		if (labeled === undefined) causes.add(CAUSE.c6)
		else {
			const result = classify(labeled.tags, roles)
			for (const cause of result.causes) causes.add(cause)
			unclassified = {
				recorded: widen(result.unclassified.recorded, strict.entry.recorded),
				port: widen(result.unclassified.port, strict.entry.port),
			}
			if (
				JSON.stringify(strict.entry.recorded) !== JSON.stringify(labeled.entry.recorded) ||
				JSON.stringify(strict.entry.port) !== JSON.stringify(labeled.entry.port)
			)
				causes.add(CAUSE.c6)
		}
		if (causes.size === 0 || unclassified.recorded.length + unclassified.port.length > 0) causes.add(CAUSE.c8)
		return { ...strict.entry, causes: [...causes].sort(), unclassified }
	})
	return crowded(unlisted, tally.residuals, admitted)
}
