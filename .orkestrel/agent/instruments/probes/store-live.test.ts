import type { Message, ProviderInterface, ProviderResult } from '@orkestrel/agent'
import type { ToolDefinition } from '@orkestrel/tool'
import { createBrowser } from '@orkestrel/browser/server'
import { isRecord } from '@orkestrel/contract'
import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { reservePort } from '../../tests/setupServer.js'
import { attemptStoreTask, STORE_BOUNDS, STORE_JOURNEY_NAME, STORE_PREDICATES, STORE_SYSTEM_PROMPT, STORE_TASKS } from '../../tests/setupStore.js'
import type { StoreTask } from '../../tests/setupStore.js'
import { createLiveOllama, PAGE_BROWSER_ARGS, requirePageBrowser } from '../../tests/setupService.js'
import { countStale, describeReasons, shapeOf } from './census.js'

// Runs whole live store attempts through the real harness, with one variant applied at the provider
// boundary: the system prompt, the tool definitions the model sees, and the tool results it reads.
// env: STORE_LIVE_LABEL=name STORE_LIVE_TASKS=cart,checkout STORE_LIVE_VARIANTS=T0,T1 STORE_LIVE_PORTS=16 [OLLAMA_MODEL]
interface Variant {
	readonly system?: (prompt: string) => string
	readonly prompt?: (prompt: string) => string
	/** The most tool calls one user turn allows; omitted ⇒ the harness bound. */
	readonly limit?: number
	readonly definitions?: (definitions: readonly ToolDefinition[]) => readonly ToolDefinition[]
	/** Rewrites one tool result; `fields` lists the text-taking rows of the latest page view the model read before it, and `view` is that view's page block. */
	readonly result?: (text: string, fields: readonly string[], view: string) => string
	/** If `true`, a link with the same name and target, unique in its view, keeps the reference the model first saw (V2). */
	readonly links?: boolean
	/** If `true`, a tool call the model emits in a turn that advertised no tool is dropped, so the turn ends (JN). */
	readonly drop?: boolean
	/** Advertises a tool under another name and maps the model's calls back; results and the prompt say the advertised name. */
	readonly rename?: Readonly<Record<string, string>>
	/** If `true`, an `edit` call without `journey` takes the journey task's name, as a tool defaulting to the only saved journey would (TKJ). */
	readonly fill?: boolean
}

function renameTools(definitions: readonly ToolDefinition[], rename: Readonly<Record<string, string>>): readonly ToolDefinition[] {
	return definitions.map((definition) => {
		const advertised = rename[definition.name]
		return advertised === undefined ? definition : { ...definition, name: advertised }
	})
}

function renameMentions(text: string, rename: Readonly<Record<string, string>>): string {
	let renamed = text
	for (const [original, advertised] of Object.entries(rename))
		renamed = renamed.replace(new RegExp(`\\bcall ${original}\\b`, 'g'), `call ${advertised}`)
	return renamed
}

const LINK_ROW = /^\d+: link "([^"]*)" \[ref=(e\d+)\] (\S+)$/
const REF = /\[ref=(e\d+)\]/g
const GONE = /^Element \[ref=(e\d+)\] is not in the current view; call read for fresh refs\.$/m

// Carries each unique link's first reference through later views and remembers the live one behind it.
class LinkBinder {
	#current: ReadonlyMap<string, string> = new Map()

	bind(messages: readonly Message[]): readonly Message[] {
		const canonical = new Map<string, string>()
		let aliases: ReadonlyMap<string, string> = new Map()
		const bound = messages.map((message) => {
			if (message.role !== 'tool') return message
			if (/^page .+$/m.test(message.content)) aliases = this.#alias(message.content, canonical)
			return {
				...message,
				content: message.content.replace(REF, (whole, reference: string) => {
					const alias = aliases.get(reference)
					return alias === undefined ? whole : `[ref=${alias}]`
				}),
			}
		})
		this.#current = new Map([...aliases].map(([live, alias]) => [alias, live]))
		return bound
	}

	resolve(reference: string): string {
		return this.#current.get(reference) ?? reference
	}

	#alias(view: string, canonical: Map<string, string>): ReadonlyMap<string, string> {
		const rows = view.split('\n').flatMap((line) => {
			const row = LINK_ROW.exec(line)
			return row === null ? [] : [{ identity: `${row[1]}|${row[3]}`, live: row[2] ?? '' }]
		})
		const counts = new Map<string, number>()
		for (const row of rows) counts.set(row.identity, (counts.get(row.identity) ?? 0) + 1)
		const aliases = new Map<string, string>()
		for (const row of rows) {
			if (counts.get(row.identity) !== 1) continue
			const first = canonical.get(row.identity) ?? row.live
			canonical.set(row.identity, first)
			if (first !== row.live) aliases.set(row.live, first)
		}
		return aliases
	}
}

const CLICK_LINKS = 'Clicks a link, button, checkbox, or tab by its reference, settles its action, and returns the page.'
const TYPE_FIELDS = 'Enters text into a field such as a textbox, searchbox, or combobox, optionally submits its form, and returns the page. Click links and buttons instead.'
const TEXT_WORDS = "The words to enter or the option to choose; never the field's own name."
const FILL_THEN_ACTIVATE =
	"To fill a field or use the site's search box, call type with its reference, the text, and submit true. To activate an element, click its reference from the latest result."
const FOLLOW_THEN_FILL =
	"To follow a link or press a button, call click with its reference from the latest result. To fill a textbox or the site's search box, call type with its reference, the text, and submit true."
const SAVED = /^Nothing is recording; "([^"]+)" was saved\. Call journeys, edit, or replay\.$/m
const SAVED_ANSWER = 'Nothing is recording, so there is nothing to save; "$1" is already saved. Answer the user.'
const PARTIAL = /^This read shows lines \d+–\d+ of \d+; lines (\d+)(?:–(\d+))? (?:is|are) not shown yet\.\n/m
const MISS = /^No line (?:from \d+ (?:on|to \d+) )?matches "[^"]*"\.$/m
const NO_TEXT = /^(Element (?:link|button) "[^"]*" \[ref=e\d+\] takes no text); call click for a (link|button)\.$/m
const FIELD = /^\d+: ((?:textbox|searchbox|combobox|textarea) "[^"]*" \[ref=e\d+\])/
const FIELD_ADVICE = /^(Element (link|button) "[^"]*" \[ref=e\d+\] takes no text); to type, use (.+)\.$/m
const NO_TEXT_ANY = /^(Element (?:link|button) "[^"]*" \[ref=(e\d+)\] takes no text); (?:call click for an? (?:link|button)|to type, use .+)\.$/m

// TX: a type refusal on a link or button names the exact click and no field, whatever is in view.
function clickInstead(text: string): string {
	return text.replace(NO_TEXT_ANY, '$1; call click with ref $2 instead.')
}
const OPEN_CART = 'then open the cart before you complete checkout'
const CLICK_CART = 'click the Cart link, then complete checkout'
const THEN_CLICK_CART = 'then click the Cart link and complete checkout'
const PAST_END = /^Line (\d+) is past the end; the page has (\d+) lines\.$/m
const SAVE_WHEN_DONE = 'When the recorded task is done, call save with one sentence that describes it. '
const SAVE_WHEN_ASKED = 'Call save only when the user asks, with one sentence that describes the journey; after save, edit, or replay succeeds, answer without saving again. '
const TRIMMED = new Set(['capture', 'forget', 'dialog', 'switch', 'navigate', 'press'])

function describeNoText(text: string, fields: readonly string[], advise: boolean): string {
	return text.replace(NO_TEXT, (_whole, head: string, role: string) =>
		fields.length > 0 ? `${head}; to type, use ${fields.join(' or ')}.` : advise ? `${head}; call click for a ${role}.` : `${head}; no field on this page takes text.`,
	)
}

function extractFields(text: string): readonly string[] | undefined {
	if (!/^page .+$/m.test(text)) return undefined
	return text.split('\n').flatMap((line) => {
		const field = FIELD.exec(line)?.[1]
		return field === undefined ? [] : [field]
	})
}

// The page block of a result: from its `page` header line through its footer.
function extractView(text: string): string | undefined {
	const start = text.search(/^page .+$/m)
	return start < 0 ? undefined : text.slice(start)
}

// X6: a past-the-end read shows the end of the page instead of refusing.
function showEnd(text: string, view: string): string {
	return text.replace(PAST_END, (_whole, line: string, total: string) =>
		view === '' ? `Line ${line} is past the end; the page has ${total} lines.` : `Line ${line} is past the end; the page has ${total} lines, shown here.\n\n${view}`,
	)
}

function describeTools(definitions: readonly ToolDefinition[]): readonly ToolDefinition[] {
	return definitions.map((definition) => {
		if (definition.name === 'click') return { ...definition, description: CLICK_LINKS }
		if (definition.name !== 'type') return definition
		const parameters = definition.parameters
		const properties = parameters !== undefined && isRecord(parameters['properties']) ? parameters['properties'] : undefined
		const text = properties !== undefined && isRecord(properties['text']) ? properties['text'] : undefined
		return {
			...definition,
			description: TYPE_FIELDS,
			...(parameters === undefined || properties === undefined || text === undefined
				? {}
				: { parameters: { ...parameters, properties: { ...properties, text: { ...text, description: TEXT_WORDS } } } }),
		}
	})
}

const FROM_PRIOR = "The first line to show: 1 for the top, or the line a reply's footer names."
const CLICK_PRIOR = 'Clicks the referenced element, settles its action, and returns the page.'
const TYPE_PRIOR = 'Types into a field such as a search box, optionally submits its form, and returns the page.'
const TEXT_PRIOR = 'The text to type or the option to choose.'
const TYPE_STEER = 'Types into a field such as a search box, optionally submits its form, and returns the page. Click links and buttons instead.'
const TYPE_ENTER = 'Enters text into a field such as a textbox or search box, optionally submits its form, and returns the page. Click links and buttons instead.'
const TYPE_SITE = "Types into a textbox or the site's search box, optionally submits its form, and returns the page; a link or button takes click."
const TYPE_FOCUS = 'Focuses a field such as a search box and types into it, optionally submits its form, and returns the page.'
const SEARCH_FOR = 'Search for kettle and tell me which products match.'
const USE_THE_BOX = 'Use the search box to search for kettle and tell me which products match.'

// Replaces the type description alone, and the click description when `click` is given.
function describeType(definitions: readonly ToolDefinition[], description: string, click?: string): readonly ToolDefinition[] {
	return definitions.map((definition) => {
		if (definition.name === 'type') return { ...definition, description }
		return click !== undefined && definition.name === 'click' ? { ...definition, description: click } : definition
	})
}

// Restores the click and type copy that shipped before browser 2098194, for the search arms.
function restoreTools(definitions: readonly ToolDefinition[]): readonly ToolDefinition[] {
	return definitions.map((definition) => {
		if (definition.name === 'click') return { ...definition, description: CLICK_PRIOR }
		if (definition.name !== 'type') return definition
		const parameters = definition.parameters
		const properties = parameters !== undefined && isRecord(parameters['properties']) ? parameters['properties'] : undefined
		const text = properties !== undefined && isRecord(properties['text']) ? properties['text'] : undefined
		return {
			...definition,
			description: TYPE_PRIOR,
			...(parameters === undefined || properties === undefined || text === undefined
				? {}
				: { parameters: { ...parameters, properties: { ...properties, text: { ...text, description: TEXT_PRIOR } } } }),
		}
	})
}

// Restores read's prior from shape: the parameter required, its description without the default sentence, or both.
function shapeReadFrom(definitions: readonly ToolDefinition[], required: boolean, prior: boolean): readonly ToolDefinition[] {
	return definitions.map((definition) => {
		if (definition.name !== 'read' || definition.parameters === undefined) return definition
		const parameters = definition.parameters
		const properties = isRecord(parameters['properties']) ? parameters['properties'] : undefined
		const from = properties !== undefined && isRecord(properties['from']) ? properties['from'] : undefined
		return {
			...definition,
			parameters: {
				...parameters,
				...(required ? { required: ['from'] } : {}),
				...(prior && properties !== undefined && from !== undefined
					? { properties: { ...properties, from: { ...from, description: FROM_PRIOR } } }
					: {}),
			},
		}
	})
}

// Rewords click alone (and, when asked, type.text), leaving the search-critical type description untouched.
function describeClick(definitions: readonly ToolDefinition[], text: boolean): readonly ToolDefinition[] {
	return definitions.map((definition) => {
		if (definition.name === 'click') return { ...definition, description: CLICK_LINKS }
		if (!text || definition.name !== 'type') return definition
		const parameters = definition.parameters
		const properties = parameters !== undefined && isRecord(parameters['properties']) ? parameters['properties'] : undefined
		const field = properties !== undefined && isRecord(properties['text']) ? properties['text'] : undefined
		return parameters === undefined || properties === undefined || field === undefined
			? definition
			: { ...definition, parameters: { ...parameters, properties: { ...properties, text: { ...field, description: TEXT_WORDS } } } }
	})
}

function trimTools(definitions: readonly ToolDefinition[]): readonly ToolDefinition[] {
	return definitions.filter((definition) => !TRIMMED.has(definition.name))
}

// V6: a cut plain read loses its header line and gains a numbered row naming the unread range.
function numberUnread(text: string): string {
	if (MISS.test(text)) return text
	const partial = PARTIAL.exec(text)
	if (partial === null) return text
	const [line, first, last] = partial
	const footer = text.lastIndexOf('\n[lines ')
	if (footer < 0) return text
	const without = text.replace(line, '')
	const cut = without.lastIndexOf('\n[lines ')
	const range = last === undefined ? `${first}` : `${first}–${last}`
	return `${without.slice(0, cut)}\n${range}: not shown yet; call read with from ${first}.${without.slice(cut)}`
}

const VARIANTS: Readonly<Record<string, Variant>> = {
	T0: {},
	P0: { system: (prompt) => prompt.replace(FOLLOW_THEN_FILL, FILL_THEN_ACTIVATE) },
	C1: { definitions: (definitions) => describeClick(definitions, false) },
	C2: { definitions: (definitions) => describeClick(definitions, true) },
	JC1: { links: true, definitions: (definitions) => describeClick(definitions, false) },
	JC2: { links: true, definitions: (definitions) => describeClick(definitions, true) },
	TF: { definitions: (definitions) => describeType(definitions, TYPE_STEER) },
	TG: { definitions: (definitions) => describeType(definitions, TYPE_ENTER) },
	TH: { definitions: (definitions) => describeType(definitions, TYPE_SITE) },
	TFC: { definitions: (definitions) => describeType(definitions, TYPE_STEER, CLICK_LINKS) },
	TFR: {
		definitions: (definitions) => describeType(definitions, TYPE_STEER),
		result: (text) => text.replace(FIELD_ADVICE, '$1; call click for a $2, or type into $3.'),
	},
	TX0: { result: clickInstead },
	TK: { definitions: (definitions) => describeType(definitions, TYPE_FOCUS) },
	TKJ: { definitions: (definitions) => describeType(definitions, TYPE_FOCUS), fill: true },
	TKS: { definitions: (definitions) => describeType(definitions, TYPE_FOCUS), prompt: (prompt) => prompt.replace(SEARCH_FOR, USE_THE_BOX) },
	T0S: { prompt: (prompt) => prompt.replace(SEARCH_FOR, USE_THE_BOX) },
	TGX: { definitions: (definitions) => describeType(definitions, TYPE_ENTER), result: clickInstead },
	JELD: {
		links: true,
		definitions: restoreTools,
		result: (text) => text.replace(GONE, 'Element [ref=$1] is not on this page; use a reference from the latest result.'),
	},
	D0: { definitions: restoreTools },
	PD0: { definitions: restoreTools, system: (prompt) => prompt.replace(FOLLOW_THEN_FILL, FILL_THEN_ACTIVATE) },
	RF: { definitions: (definitions) => shapeReadFrom(definitions, true, true) },
	RD: { definitions: (definitions) => shapeReadFrom(definitions, false, true) },
	RR: { definitions: (definitions) => shapeReadFrom(definitions, true, false) },
	V1a: { definitions: describeTools },
	V1b: { system: (prompt) => prompt.replace(FILL_THEN_ACTIVATE, FOLLOW_THEN_FILL) },
	V1c: { definitions: describeTools, system: (prompt) => prompt.replace(FILL_THEN_ACTIVATE, FOLLOW_THEN_FILL) },
	V4: { result: (text) => text.replace(SAVED, SAVED_ANSWER) },
	V5: { definitions: trimTools },
	V6: { result: numberUnread },
	JP: { prompt: (prompt) => prompt.replace(OPEN_CART, CLICK_CART) },
	TB: { result: (text, fields) => describeNoText(text, fields, false) },
	TB2: { result: (text, fields) => describeNoText(text, fields, true) },
	TR: { result: (text) => text.replace(NO_TEXT, '$1; type into a textbox or searchbox from the latest result.') },
	JA: {
		prompt: (prompt) => prompt.replace(OPEN_CART, CLICK_CART),
		result: (text, fields) => describeNoText(text.replace(SAVED, SAVED_ANSWER), fields, true),
	},
	JB: {
		prompt: (prompt) => prompt.replace(OPEN_CART, CLICK_CART),
		definitions: describeTools,
		system: (prompt) => prompt.replace(FILL_THEN_ACTIVATE, FOLLOW_THEN_FILL),
		result: (text, fields) => describeNoText(text.replace(SAVED, SAVED_ANSWER), fields, true),
	},
	JL: { limit: 12 },
	JS: { system: (prompt) => prompt.replace(SAVE_WHEN_DONE, SAVE_WHEN_ASKED) },
	JP2: { prompt: (prompt) => prompt.replace(OPEN_CART, THEN_CLICK_CART) },
	X3: { result: (text) => text.replace(PAST_END, 'Line $1 is past the end; the page has $2 lines, all in the latest result.') },
	X6: { result: (text, _fields, view) => showEnd(text, view) },
	JSV: { result: (text) => text.replace(SAVED, 'Saved "$1"; nothing changed.') },
	JN: { drop: true },
	JSN: { rename: { save: 'stop' } },
	JEL: {
		links: true,
		prompt: (prompt) => prompt.replace(OPEN_CART, THEN_CLICK_CART),
		definitions: describeTools,
		system: (prompt) => prompt.replace(FILL_THEN_ACTIVATE, FOLLOW_THEN_FILL),
		result: (text, fields) =>
			describeNoText(
				text.replace(SAVED, SAVED_ANSWER).replace(GONE, 'Element [ref=$1] is not on this page; use a reference from the latest result.'),
				fields,
				true,
			),
	},
	JENL: {
		drop: true,
		links: true,
		prompt: (prompt) => prompt.replace(OPEN_CART, THEN_CLICK_CART),
		definitions: describeTools,
		system: (prompt) => prompt.replace(FILL_THEN_ACTIVATE, FOLLOW_THEN_FILL),
		result: (text, fields) =>
			describeNoText(
				text.replace(SAVED, SAVED_ANSWER).replace(GONE, 'Element [ref=$1] is not on this page; use a reference from the latest result.'),
				fields,
				true,
			),
	},
	JES: {
		rename: { save: 'stop' },
		prompt: (prompt) => prompt.replace(OPEN_CART, THEN_CLICK_CART),
		definitions: describeTools,
		system: (prompt) => prompt.replace(FILL_THEN_ACTIVATE, FOLLOW_THEN_FILL),
		result: (text, fields) => describeNoText(text.replace(SAVED, SAVED_ANSWER), fields, true),
	},
	JEN: {
		drop: true,
		prompt: (prompt) => prompt.replace(OPEN_CART, THEN_CLICK_CART),
		definitions: describeTools,
		system: (prompt) => prompt.replace(FILL_THEN_ACTIVATE, FOLLOW_THEN_FILL),
		result: (text, fields) => describeNoText(text.replace(SAVED, SAVED_ANSWER), fields, true),
	},
	JEV: {
		prompt: (prompt) => prompt.replace(OPEN_CART, THEN_CLICK_CART),
		definitions: describeTools,
		system: (prompt) => prompt.replace(FILL_THEN_ACTIVATE, FOLLOW_THEN_FILL),
		result: (text, fields) => describeNoText(text.replace(SAVED, 'Saved "$1"; nothing changed.'), fields, true),
	},
	JEW: {
		prompt: (prompt) => prompt.replace(OPEN_CART, THEN_CLICK_CART),
		definitions: describeTools,
		system: (prompt) => prompt.replace(FILL_THEN_ACTIVATE, FOLLOW_THEN_FILL).replace(SAVE_WHEN_DONE, SAVE_WHEN_ASKED),
		result: (text, fields) => describeNoText(text.replace(SAVED, 'Saved "$1"; nothing changed.'), fields, true),
	},
	JE: {
		prompt: (prompt) => prompt.replace(OPEN_CART, THEN_CLICK_CART),
		definitions: describeTools,
		system: (prompt) => prompt.replace(FILL_THEN_ACTIVATE, FOLLOW_THEN_FILL),
		result: (text, fields) => describeNoText(text.replace(SAVED, SAVED_ANSWER), fields, true),
	},
	JF: {
		limit: 12,
		prompt: (prompt) => prompt.replace(OPEN_CART, THEN_CLICK_CART),
		definitions: describeTools,
		system: (prompt) => prompt.replace(FILL_THEN_ACTIVATE, FOLLOW_THEN_FILL),
		result: (text, fields) => describeNoText(text.replace(SAVED, SAVED_ANSWER), fields, true),
	},
	JG: {
		definitions: describeTools,
		system: (prompt) => prompt.replace(FILL_THEN_ACTIVATE, FOLLOW_THEN_FILL),
		result: (text, fields) => describeNoText(text.replace(SAVED, SAVED_ANSWER), fields, true),
	},
	V2: { links: true, result: (text) => text.replace(GONE, 'Element [ref=$1] is not on this page; use a reference from the latest result.') },
	JD: {
		limit: 12,
		links: true,
		prompt: (prompt) => prompt.replace(OPEN_CART, CLICK_CART),
		definitions: describeTools,
		system: (prompt) => prompt.replace(FILL_THEN_ACTIVATE, FOLLOW_THEN_FILL).replace(SAVE_WHEN_DONE, SAVE_WHEN_ASKED),
		result: (text, fields) =>
			describeNoText(
				text.replace(SAVED, SAVED_ANSWER).replace(GONE, 'Element [ref=$1] is not on this page; use a reference from the latest result.'),
				fields,
				true,
			),
	},
	JC: {
		limit: 12,
		prompt: (prompt) => prompt.replace(OPEN_CART, CLICK_CART),
		definitions: describeTools,
		system: (prompt) => prompt.replace(FILL_THEN_ACTIVATE, FOLLOW_THEN_FILL).replace(SAVE_WHEN_DONE, SAVE_WHEN_ASKED),
		result: (text, fields) => describeNoText(text.replace(SAVED, SAVED_ANSWER), fields, true),
	},
}

function adaptMessages(messages: readonly Message[], variant: Variant): readonly Message[] {
	const result = variant.result
	if (result === undefined) return messages
	let fields: readonly string[] = []
	let view = ''
	return messages.map((message) => {
		const content = message.content
		const found = extractFields(content)
		const adapted = message.role === 'tool' ? { ...message, content: result(content, fields, view) } : message
		if (found !== undefined) {
			fields = found
			view = extractView(content) ?? view
		}
		return adapted
	})
}

function adaptProvider(provider: ProviderInterface, variant: Variant): ProviderInterface {
	const binder = variant.links === true ? new LinkBinder() : undefined
	const rename = variant.rename
	const original = new Map(Object.entries(rename ?? {}).map(([name, advertised]) => [advertised, name]))
	const adaptTools = (tools?: readonly ToolDefinition[]) => {
		if (tools === undefined) return tools
		const shaped = variant.definitions === undefined ? tools : variant.definitions(tools)
		return rename === undefined ? shaped : renameTools(shaped, rename)
	}
	const adapt = (messages: readonly Message[]) => {
		const adapted = adaptMessages(binder === undefined ? messages : binder.bind(messages), variant)
		return rename === undefined
			? adapted
			: adapted.map((message) => (message.role === 'tool' || message.role === 'system' ? { ...message, content: renameMentions(message.content, rename) } : message))
	}
	const resolve = (result: ProviderResult): ProviderResult =>
		(binder === undefined && rename === undefined && variant.fill !== true) || result.tools === undefined
			? result
			: {
					...result,
					tools: result.tools.map((call) => {
						const named = original.has(call.name) ? { ...call, name: original.get(call.name) ?? call.name } : call
						const bound =
							binder !== undefined && typeof named.arguments['ref'] === 'string'
								? { ...named, arguments: { ...named.arguments, ref: binder.resolve(named.arguments['ref']) } }
								: named
						return variant.fill === true && bound.name === 'edit' && bound.arguments['journey'] === undefined
							? { ...bound, arguments: { journey: STORE_JOURNEY_NAME, ...bound.arguments } }
							: bound
					}),
				}
	const settle = (result: ProviderResult, tools: readonly ToolDefinition[] | undefined): ProviderResult => {
		if (variant.drop !== true || (tools !== undefined && tools.length > 0) || result.tools === undefined) return resolve(result)
		const { tools: _dropped, ...answer } = result
		return answer
	}
	return {
		id: provider.id,
		name: provider.name,
		format: provider.format,
		generate: async (messages, signal, tools, options) => {
			const advertised = adaptTools(tools)
			return settle(await provider.generate(adapt(messages), signal, advertised, options), advertised)
		},
		async *stream(messages, signal, tools, options) {
			const advertised = adaptTools(tools)
			return settle(yield* provider.stream(adapt(messages), signal, advertised, options), advertised)
		},
	}
}

function adaptTask(task: StoreTask, variant: Variant): StoreTask {
	const system = variant.system
	const prompt = variant.prompt
	return {
		...task,
		...(system === undefined ? {} : { system: system(task.system ?? STORE_SYSTEM_PROMPT) }),
		...(prompt === undefined ? {} : { prompt: prompt(task.prompt) }),
		...(variant.limit === undefined ? {} : { limit: variant.limit }),
	}
}

it('measures whole live store attempts per variant', async () => {
	const label = process.env['STORE_LIVE_LABEL'] ?? 'store-live'
	const tasks = (process.env['STORE_LIVE_TASKS'] ?? 'cart').split(',')
	const names = (process.env['STORE_LIVE_VARIANTS'] ?? 'T0').split(',')
	const ports = Array.from({ length: Number(process.env['STORE_LIVE_PORTS'] ?? 16) }, (_, index) => 49171 + index * 2)
	mkdirSync('tmp/codex/store-live', { recursive: true })
	const browser = createBrowser({
		executable: requirePageBrowser().executable,
		headless: true,
		args: PAGE_BROWSER_ARGS,
		cdp: { port: await reservePort(), discover: false },
	})
	const rows: { variant: string; task: string; port: number; pass: boolean; stale: number; calls: number; shape: string; reasons: readonly string[]; answer: string; ms: number }[] = []
	try {
		await browser.connect()
		for (const name of names) {
			const variant = VARIANTS[name]
			if (variant === undefined) throw new Error(`Unknown variant ${name}`)
			for (const taskName of tasks) {
				const task: StoreTask | undefined = Object.values(STORE_TASKS).find((candidate) => candidate.name === taskName)
				const predicate = STORE_PREDICATES[taskName]
				if (task === undefined || predicate === undefined) throw new Error(`Unknown task ${taskName}`)
				for (const [index, port] of ports.entries()) {
					const start = performance.now()
					const provider = adaptProvider(
						createLiveOllama({
							temperature: 0,
							context: STORE_BOUNDS.context,
							turn: STORE_BOUNDS.turn,
							predict: STORE_BOUNDS.predict,
							think: STORE_BOUNDS.think,
						}),
						variant,
					)
					const { transcript } = await attemptStoreTask(browser, adaptTask(task, variant), index + 1, provider, port)
					const pass = predicate(transcript)
					mkdirSync(`tmp/codex/store-live/${label}-logs`, { recursive: true })
					writeFileSync(`tmp/codex/store-live/${label}-logs/${name}-${taskName}-${port}.json`, JSON.stringify(transcript, undefined, 2))
					rows.push({
						variant: name,
						task: taskName,
						port,
						pass,
						stale: countStale(transcript),
						calls: transcript.calls.length,
						shape: shapeOf(transcript),
						reasons: pass ? [] : describeReasons(taskName, transcript),
						answer: transcript.answer.replace(/\s+/g, ' ').slice(0, 120),
						ms: Math.round(performance.now() - start),
					})
					writeFileSync(`tmp/codex/store-live/${label}.json`, JSON.stringify(rows, undefined, 2))
				}
			}
		}
	} finally {
		await browser.destroy()
	}
	const summary: string[] = []
	for (const name of names)
		for (const taskName of tasks) {
			const group = rows.filter((row) => row.variant === name && row.task === taskName)
			summary.push(`${name}/${taskName}: ${group.filter((row) => row.pass).length}/${group.length} pass, ${group.reduce((sum, row) => sum + row.stale, 0)} refused stale references`)
		}
	writeFileSync(
		`tmp/codex/store-live/${label}.md`,
		[`# ${label}`, '', ...summary.map((line) => `- ${line}`), '', '| Variant | Task | Port | Pass | Stale | Shape | Reasons | Answer |', '| --- | --- | --- | --- | --- | --- | --- | --- |', ...rows.map((row) => `| ${row.variant} | ${row.task} | ${row.port} | ${row.pass ? 'pass' : 'FAIL'} | ${row.stale} | \`${row.shape}\` | ${row.reasons.join('; ').replace(/\|/g, '\\|')} | ${row.answer.replace(/\|/g, '\\|')} |`), ''].join('\n'),
	)
	console.log(`store-live ${label}: ${summary.join(' ')}`)
	expect(rows.length).toBeGreaterThan(0)
}, 7_200_000)
