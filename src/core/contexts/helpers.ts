import type { Applicability, Criterion, SelectionOptions } from './types.js'
import type { ConversationInterface } from '../conversations/types.js'
import type { Message, NoulQuestion } from '../types.js'
import type { FileInterface } from '@orkestrel/workspace'
import { isBinary } from '@orkestrel/workspace'
import { matchesJudgment } from '../conversations/helpers.js'
import { NEEDED_QUESTION } from './templates.js'

/**
 * Encodes a condition and its ordered message ids without separator ambiguity.
 * @param condition - The needed condition
 * @param subject - The screened message id
 * @param object - The request message id
 * @returns The JSON tuple used as the judgment key
 * @example
 * ```ts
 * buildConditionKey('needed', 'a', 'b') // '["needed","a","b"]'
 * ```
 */
export function buildConditionKey(condition: 'needed', subject: string, object: string): string {
	return JSON.stringify([condition, subject, object])
}

/**
 * Builds the fixed needed question with the application's true and false criteria.
 * @param needed - The true and false criteria, such as `NEEDED_CRITERION`
 * @returns The binary question whose instructions remain stable across compaction
 * @example
 * ```ts
 * buildNeededQuestion(NEEDED_CRITERION)
 * ```
 */
export function buildNeededQuestion(needed: Pick<Criterion, 'yes' | 'no'>): NoulQuestion {
	return {
		form: 'noul',
		instructions: NEEDED_QUESTION,
		criteria: { true: needed.yes, false: needed.no },
	}
}

/**
 * Renders the view with subject and request markers, appending a folded request as evidence.
 * @param messages - The conversation view in prompt order
 * @param subject - The screened message id marked [A]
 * @param request - The user message marked [B], even when absent from the view
 * @returns The complete state whose bytes determine judgment reuse
 * @example
 * ```ts
 * renderSelectionState([], 'earlier', { id: 'request', role: 'user', content: 'Continue.' })
 * ```
 */
export function renderSelectionState(
	messages: readonly Message[],
	subject: string,
	request: Message,
): string {
	const evidence = messages.some((message) => message.id === request.id)
		? messages
		: [...messages, request]
	return evidence
		.map((message) => {
			const markers = `${message.id === subject ? '[A]' : ''}${message.id === request.id ? '[B]' : ''}`
			return `${markers} ${JSON.stringify(message)}`
		})
		.join('\n')
}

/**
 * Derives needed conditions from matching recorded judgments without asking a judge.
 *
 * @remarks
 * The threshold must lie in the interval above 0.5 up to and including 1, and `createSelection`
 * refuses any other value. The helper reads the true side first.
 *
 * @param conversation - The conversation supplying the view and recorded judgments
 * @param request - The user message the selection serves
 * @param options - The judge identity, screen, and application criterion
 * @returns One applicability per distinct screened id present in the view, in screen order
 * @example
 * ```ts
 * inferApplicability(conversation, request, { judge, screen, needed })
 * ```
 */
export function inferApplicability(
	conversation: ConversationInterface,
	request: Message,
	options: Pick<SelectionOptions, 'judge' | 'screen' | 'needed'>,
): readonly Applicability[] {
	const view = conversation.view()
	const present = new Set(view.map((message) => message.id))
	const question = buildNeededQuestion(options.needed)
	return [...new Set(options.screen(conversation, request))]
		.filter((id) => present.has(id))
		.map((id) => {
			const judgment = conversation.judgments.judgment(buildConditionKey('needed', id, request.id))
			if (
				judgment === undefined ||
				!matchesJudgment(
					judgment,
					question,
					[id, request.id],
					renderSelectionState(view, id, request),
					options.judge.model,
				) ||
				judgment.answer?.form !== 'noul'
			)
				return { id }
			const probability = judgment.answer.noul
			if (probability >= options.needed.threshold) return { id, needed: true }
			if (probability <= 1 - options.needed.threshold) return { id, needed: false }
			return { id }
		})
}

/**
 * Filters decisively unneeded subjects while preserving requests and complete tool groups.
 * @param messages - The conversation view in prompt order
 * @param applicability - The screened subjects and their recorded conditions
 * @param request - The request whose id must be retained when present
 * @returns A subset of the original messages in their original order
 * @example
 * ```ts
 * filterSelectionMessages(conversation.view(), applicability, request)
 * ```
 */
export function filterSelectionMessages(
	messages: readonly Message[],
	applicability: readonly Applicability[],
	request: Message,
): readonly Message[] {
	const dropped = new Set(
		applicability.filter((entry) => entry.needed === false).map((entry) => entry.id),
	)
	dropped.delete(request.id)
	const groups = new Map<Message, Message[]>()
	const calls = new Map<string, Message[]>()
	for (const message of messages) {
		if (message.role !== 'assistant' || !message.calls?.length) continue
		groups.set(message, [message])
		for (const call of message.calls) {
			const owners = calls.get(call.id) ?? []
			owners.push(message)
			calls.set(call.id, owners)
		}
	}
	let leader: Message | undefined
	let orphan: Message[] = []
	const orphans: Message[][] = []
	for (const message of messages) {
		if (message.role !== 'tool') {
			leader = groups.has(message) ? message : undefined
			orphan = []
			continue
		}
		const local = leader?.calls ?? []
		const duplicate = new Set(local.map((call) => call.id)).size !== local.length
		const paired =
			leader !== undefined &&
			(duplicate || message.call === undefined || local.some((call) => call.id === message.call))
		const owners = message.call === undefined ? undefined : calls.get(message.call)
		const owner = owners?.length === 1 ? owners[0] : paired ? leader : undefined
		const group = owner === undefined ? undefined : groups.get(owner)
		if (group !== undefined) group.push(message)
		else {
			if (orphan.length === 0) orphans.push(orphan)
			orphan.push(message)
		}
	}
	for (const group of [...groups.values(), ...orphans]) {
		if (group.some((message) => !dropped.has(message.id))) {
			for (const message of group) dropped.delete(message.id)
		}
	}
	return messages.filter((message) => !dropped.has(message.id))
}

/**
 * Renders a path-addressed text body as a fenced reference block — a `File: <path>` label line
 * over a language-tagged fence, the framing an
 * {@link import('./AgentContext.js').AgentContext}'s active-workspace text-file render emits.
 *
 * @remarks
 * Produces `` File: <path>\n```<language>\n<content>\n``` `` — the `File:` label line, then a
 * fenced code block tagged with `language`, the `content` verbatim inside. Pure string assembly,
 * total — never throws. The one fenced-file format string for the whole module — `AgentContext.build()`
 * frames an active workspace's text files with it (each carries its own `language` on its
 * {@link import('@orkestrel/workspace').FileContent} text arm).
 *
 * @param path - The file path shown on the `File:` label line
 * @param language - The fenced-code language tag (for example `'typescript'`)
 * @param content - The file body rendered verbatim inside the fence
 * @returns The fenced reference block
 *
 * @example
 * ```ts
 * import { renderFencedFile } from '@orkestrel/agent'
 *
 * renderFencedFile('src/main.ts', 'typescript', 'const x = 1')
 * // 'File: src/main.ts\n```typescript\nconst x = 1\n```'
 * ```
 */
export function renderFencedFile(path: string, language: string, content: string): string {
	return `File: ${path}\n\`\`\`${language}\n${content}\n\`\`\``
}

/**
 * Renders one context section — the resolved `open`, each item's rendering, and the resolved
 * `close` when one exists, blank-line joined; `undefined` when the section has no items.
 *
 * @remarks
 * Pure and total. A section with no items renders nothing (`undefined`), so an empty or fully
 * scoped-out manager stays silent — its `open` / `close` never appear without items. `close`
 * is the only optional slot: an unset one (there is no built-in close) drops the
 * trailing line.
 *
 * @typeParam T - The section item being rendered
 * @param open - The section's resolved leading text
 * @param items - The already scope-filtered items
 * @param render - Renders one item to its prompt text
 * @param close - The section's resolved trailing text, or `undefined` for none
 * @returns The rendered section, or `undefined` when there are no items
 *
 * @example
 * ```ts
 * renderSection('## Instructions', [{ content: 'Be terse.' }], (one) => one.content, undefined)
 * // '## Instructions\n\nBe terse.'
 * renderSection('<rules>', [], (one) => one.content, '</rules>') // undefined (no items)
 * ```
 */
export function renderSection<T>(
	open: string,
	items: readonly T[],
	render: (item: T) => string,
	close: string | undefined,
): string | undefined {
	if (items.length === 0) return undefined
	const lines = [open, ...items.map(render)]
	if (close !== undefined) lines.push(close)
	return lines.join('\n\n')
}

/**
 * Copies a message with image data merged onto its `images` — the message's own images first,
 * then the attached data, carrying `calls` only when present and never mutating the original.
 *
 * @remarks
 * Pure and total: the original message is never mutated. `calls` is carried only when the
 * source message has one (kept omitted otherwise, mirroring the store's present-when-given
 * convention).
 *
 * @param message - The message to copy (left unchanged)
 * @param data - The base64 image data to attach
 * @returns A new message carrying the merged `images`
 *
 * @example
 * ```ts
 * attachImages({ id: '1', role: 'user', content: 'Describe' }, ['<payload>'])
 * // { id: '1', role: 'user', content: 'Describe', images: ['<payload>'] }
 * ```
 */
export function attachImages(message: Message, data: readonly string[]): Message {
	const images = [...(message.images ?? []), ...data]
	return message.calls === undefined
		? { id: message.id, role: message.role, content: message.content, images }
		: {
				id: message.id,
				role: message.role,
				content: message.content,
				calls: message.calls,
				images,
			}
}

/**
 * Attaches image data to a conversation's last user message — the turn a vision provider reads
 * images off — as a new array with that one message replaced by its carrying copy, and unchanged
 * when there is no data or no user turn.
 *
 * @remarks
 * Pure and total: the conversation and its messages are never mutated, and the returned array
 * replaces exactly the one target message with the copy {@link attachImages} builds. Empty
 * data returns the conversation unchanged; a conversation with no user message returns it
 * unchanged too (there is nowhere to attach, and the images already rode the system block).
 *
 * @param conversation - The messages to attach into (left unchanged)
 * @param data - The base64 image data to attach
 * @returns The conversation with its last user message replaced by the carrying copy
 *
 * @example
 * ```ts
 * attachUserImages([{ id: '1', role: 'user', content: 'Describe' }], ['<payload>'])
 * // [{ id: '1', role: 'user', content: 'Describe', images: ['<payload>'] }]
 * ```
 */
export function attachUserImages(
	conversation: readonly Message[],
	data: readonly string[],
): readonly Message[] {
	if (data.length === 0) return conversation
	let target = -1
	for (let index = conversation.length - 1; index >= 0; index -= 1) {
		if (conversation[index]?.role === 'user') {
			target = index
			break
		}
	}
	if (target === -1) return conversation
	return conversation.map((message, index) =>
		index === target ? attachImages(message, data) : message,
	)
}

/**
 * Collects the `base64` payload of the image files in a workspace file list — the data an agent
 * context attaches to the last user message.
 *
 * @remarks
 * Pure and total. `isBinary` narrows the tagless content to its binary arm (a total guard,
 * never an assertion), then the MIME prefix gates it to an image, so a text file and a non-image
 * binary (a PDF) are both skipped. Order follows the file list.
 *
 * @param files - The (already scope-filtered) workspace files
 * @returns The `base64` payload of each image file, in file order
 *
 * @example
 * ```ts
 * collectImageData([createFile({ path: 'a.png', content: { base64: '<payload>', mime: 'image/png' } })])
 * // ['<payload>']
 * ```
 */
export function collectImageData(files: readonly FileInterface[]): readonly string[] {
	const data: string[] = []
	for (const file of files) {
		if (isBinary(file.content) && file.content.mime.startsWith('image/')) {
			data.push(file.content.base64)
		}
	}
	return data
}

/**
 * Intersects two scope category lists under the "`undefined` is the universal set" rule — a
 * fresh copy that can only tighten, and the primitive a scope narrows through.
 *
 * @remarks
 * Pure and total, and it can only tighten: `undefined` ∩ `undefined` is `undefined` (still no
 * constraint); `undefined` ∩ a list is a copy of that list (the `undefined` side imposes
 * nothing); a list ∩ a list keeps the child keys the parent also allows, so a parent-excluded
 * key can never be re-admitted. Every returned list is a fresh copy, so a later mutation of
 * either input cannot leak into the result.
 *
 * @param parent - The parent's allow-list (`undefined` ⇒ no constraint)
 * @param child - The narrowing allow-list (`undefined` ⇒ no constraint)
 * @returns The intersected allow-list, or `undefined` when neither side constrains
 *
 * @example
 * ```ts
 * intersectKeys(['read', 'write'], ['write', 'admin']) // ['write']
 * intersectKeys(undefined, ['read']) // ['read']
 * intersectKeys(undefined, undefined) // undefined
 * ```
 */
export function intersectKeys(
	parent: readonly string[] | undefined,
	child: readonly string[] | undefined,
): readonly string[] | undefined {
	if (parent === undefined) return child === undefined ? undefined : [...child]
	if (child === undefined) return [...parent]
	const allowed = new Set(parent)
	return child.filter((key) => allowed.has(key))
}
