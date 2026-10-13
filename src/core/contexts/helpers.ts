import type { Message } from '../types.js'
import type { FileInterface } from '@orkestrel/workspace'
import { isBinary } from '@orkestrel/workspace'

/**
 * Renders a path-addressed text body as a fenced reference block — a `File: <path>` label line
 * over a language-tagged fence, the framing the
 * active-workspace text-file render of {@link import('./AgentContext.js').AgentContext} emits.
 *
 * @remarks
 * Produces `` File: <path>\n```<language>\n<content>\n``` `` — the `File:` label line, then a
 * fenced code block tagged with `language`, the `content` verbatim inside. The fence is one
 * backtick longer than the longest backtick run in `content`, and never shorter than three (the
 * CommonMark rule), so file text holding a triple backtick cannot close the block early and
 * land outside it; content with no run of three or more keeps the three-backtick fence. Pure
 * string assembly, total — never throws. The one fenced-file format string for the whole
 * module — `AgentContext.build()` frames an active workspace's text files with it (each carries
 * its own `language` on its {@link import('@orkestrel/workspace').FileContent} text arm).
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
	const runs = content.match(/`+/g) ?? []
	const longest = runs.reduce((most, run) => Math.max(most, run.length), 0)
	const fence = '`'.repeat(Math.max(3, longest + 1))
	return `File: ${path}\n${fence}${language}\n${content}\n${fence}`
}

/**
 * Renders one context section — the resolved `open`, each item's rendering, and the resolved
 * `close` when one exists, blank-line joined; `undefined` when the section has no items.
 *
 * @remarks
 * Pure and total. A section with no items renders nothing (`undefined`), so an empty or fully
 * scoped-out manager stays silent — its `open` / `close` appear only when the section has items.
 * An empty or absent slot is dropped before the join, so an `open: ''`, a `close: ''`, an unset
 * `close` (there is no built-in close), and an item rendered to `''` each add no blank line; a
 * section whose every slot is empty renders nothing (`undefined`).
 *
 * @typeParam T - The section item being rendered
 * @param open - The section's resolved leading text
 * @param members - The already scope-filtered items
 * @param render - Renders one item to its prompt text
 * @param close - The section's resolved trailing text, or `undefined` for none
 * @returns The rendered section, or `undefined` when there are no items or every slot is empty
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
	members: readonly T[],
	render: (member: T) => string,
	close: string | undefined,
): string | undefined {
	if (members.length === 0) return undefined
	const lines = [open, ...members.map(render), close].flatMap((line) =>
		line === undefined || line === '' ? [] : [line],
	)
	return lines.length === 0 ? undefined : lines.join('\n\n')
}

/**
 * Copies a message with image data merged onto its `images` — the message's own images first,
 * then the attached data, keeping every other field and never mutating the original.
 *
 * @remarks
 * Pure and total: the original message is never mutated. Every other field the source message
 * carries (`calls`, `call`, `thinking`) is kept as given, and an absent one stays absent,
 * mirroring the store's present-when-given convention.
 *
 * @param message - The message to copy (left unchanged)
 * @param payloads - The base64 image data to attach
 * @returns A new message carrying the merged `images`
 *
 * @example
 * ```ts
 * // IMAGE_BASE64 stands for the base64 text of one image.
 * attachImages({ id: '1', role: 'user', content: 'Describe' }, ['IMAGE_BASE64'])
 * // { id: '1', role: 'user', content: 'Describe', images: ['IMAGE_BASE64'] }
 * ```
 */
export function attachImages(message: Message, payloads: readonly string[]): Message {
	return { ...message, images: [...(message.images ?? []), ...payloads] }
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
 * @param payloads - The base64 image data to attach
 * @returns The conversation with its last user message replaced by the carrying copy
 *
 * @example
 * ```ts
 * attachUserImages([{ id: '1', role: 'user', content: 'Describe' }], ['IMAGE_BASE64'])
 * // [{ id: '1', role: 'user', content: 'Describe', images: ['IMAGE_BASE64'] }]
 * ```
 */
export function attachUserImages(
	conversation: readonly Message[],
	payloads: readonly string[],
): readonly Message[] {
	if (payloads.length === 0) return conversation
	let target = -1
	for (let index = conversation.length - 1; index >= 0; index -= 1) {
		if (conversation[index]?.role === 'user') {
			target = index
			break
		}
	}
	if (target === -1) return conversation
	return conversation.map((message, index) =>
		index === target ? attachImages(message, payloads) : message,
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
 * collectImageData([createFile({ path: 'a.png', content: { base64: 'IMAGE_BASE64', mime: 'image/png' } })])
 * // ['IMAGE_BASE64']
 * ```
 */
export function collectImageData(files: readonly FileInterface[]): readonly string[] {
	const payloads: string[] = []
	for (const file of files) {
		if (isBinary(file.content) && file.content.mime.startsWith('image/')) {
			payloads.push(file.content.base64)
		}
	}
	return payloads
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
