import type {
	AgentInterface,
	AgentResult,
	BinaryMIME,
	ConversationSnapshot,
	FileContent,
	FileInterface,
	MessageInterface,
	Position,
	Range,
	SectionInterface,
	ToolCall,
	ToolCallResult,
	ToolResult,
	WorkspaceSnapshot,
} from './types.js'
import { isArray, isNumber, isRecord, isString } from '@orkestrel/contract'
import { EXTENSION_TO_LANGUAGE } from './constants.js'
import { AgentJobError } from './errors.js'

// The pure derivation helper a file uses to fill an inferred language field from its path
// (§4.3 multi-word `infer*` name). Total — an unknown or extension-less input falls back to
// a sensible default rather than throwing.

/**
 * Infer a fenced-code language tag from a file path's extension — what a workspace text file
 * (or the {@link fencedFile} renderer) renders its content block as.
 *
 * @remarks
 * Reads the extension after the last `.` (case-insensitive) and maps it through a
 * fixed extension→language table. An unknown extension, or a path with no extension,
 * falls back to `'text'` (a safe, language-agnostic fence). Total — never throws.
 *
 * @param path - The document's file path (e.g. `'src/main.ts'`)
 * @returns The inferred language tag (e.g. `'typescript'`), or `'text'` when unknown
 *
 * @example
 * ```ts
 * inferLanguage('src/main.ts') // 'typescript'
 * inferLanguage('README.md') // 'markdown'
 * inferLanguage('LICENSE') // 'text'
 * ```
 */
export function inferLanguage(path: string): string {
	const dot = path.lastIndexOf('.')
	if (dot === -1) return 'text'
	const extension = path.slice(dot + 1).toLowerCase()
	return EXTENSION_TO_LANGUAGE[extension] ?? 'text'
}

/**
 * Filter a list of items by a {@link import('./types.js').ScopeInterface} allow-list of
 * keys — the pure, total set-membership primitive the context's build step and the agent
 * loop's tool-advertise step apply a scope through.
 *
 * @remarks
 * Three-way by the allow-list's shape, so a `Scope` category cleanly expresses "all /
 * none / only these":
 * - `undefined` ⇒ NO constraint — every item passes (returned unchanged).
 * - `[]` (empty) ⇒ NONE pass (no key is in an empty set).
 * - a non-empty list ⇒ only items whose `key(item)` is in the list pass.
 *
 * Order-preserving (it filters `items` in place order, never reorders) and total — never
 * throws. Keys are matched by a `Set` for O(1) membership, so a large list is cheap.
 *
 * @typeParam T - The item type being filtered
 * @param allow - The allow-list of keys (`undefined` ⇒ all, `[]` ⇒ none, else only-listed)
 * @param items - The items to filter (returned unchanged when `allow` is `undefined`)
 * @param key - Extracts the key an item is matched on (e.g. an instruction's `name`)
 * @returns The items that pass the allow-list, in their original order
 *
 * @example
 * ```ts
 * const items = [{ name: 'a' }, { name: 'b' }]
 * filterAllowList(undefined, items, (i) => i.name) // [{ name: 'a' }, { name: 'b' }] (all)
 * filterAllowList([], items, (i) => i.name) // [] (none)
 * filterAllowList(['b'], items, (i) => i.name) // [{ name: 'b' }] (only listed)
 * ```
 */
export function filterAllowList<T>(
	allow: readonly string[] | undefined,
	items: readonly T[],
	key: (item: T) => string,
): readonly T[] {
	if (allow === undefined) return items
	if (allow.length === 0) return []
	const set = new Set(allow)
	return items.filter((item) => set.has(key(item)))
}

/**
 * Estimate the context-token footprint of a string — the deterministic char-based heuristic
 * {@link estimateMessages} sums over a conversation's messages (the default context-budget
 * estimator).
 *
 * @remarks
 * Approximates `ceil(length / 4)` (≈ four characters per token — the rough average for
 * English text), so the same input always yields the same estimate (no model round-trip).
 * Empty text is `0`. This is a planning heuristic for reasoning about how much a turn's
 * messages cost the next request, NOT an exact tokenizer count — it never calls a provider,
 * so the agent layer stays provider-agnostic and synchronous where it can be.
 *
 * @param text - The text to estimate (a section summary, a message's content)
 * @returns The estimated token count (`ceil(text.length / 4)`; `0` for empty text)
 *
 * @example
 * ```ts
 * estimateTokens('') // 0
 * estimateTokens('hello') // 2  (ceil(5 / 4))
 * estimateTokens('a'.repeat(40)) // 10
 * ```
 */
export function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4)
}

/**
 * Estimate the context-token footprint of a batch of messages — the default `consume`
 * estimator for an agent's context `BudgetInterface` (a budgets surface's tracking contract)
 * (the {@link import('./types.js').AgentOptions} `window`).
 *
 * @remarks
 * Sums {@link estimateTokens} over each message's `content` (the `ceil(length / 4)` char
 * heuristic), so it is deterministic and provider-free — the same messages always yield the
 * same estimate, with an empty batch `0`. It is the fully-swappable default an agent's
 * auto-compaction context budget charges each turn's new messages through; a caller wanting a
 * sharper count supplies its own `consume` to `createBudget` instead. Total — never throws.
 *
 * @param messages - The messages to estimate (a turn's appended assistant + tool messages)
 * @returns The summed estimated token count (`Σ estimateTokens(m.content)`; `0` when empty)
 *
 * @example
 * ```ts
 * estimateMessages([]) // 0
 * estimateMessages([{ id: '1', role: 'user', content: 'hello' }]) // 2
 * ```
 */
export function estimateMessages(messages: readonly MessageInterface[]): number {
	return messages.reduce((sum, message) => sum + estimateTokens(message.content), 0)
}

/**
 * Run one rehydrated agent and apply the partial-as-configurable-failure policy — the
 * shared job-handler step BOTH `createAgentQueue` and `createAgentRunner` settle each job
 * through, so the policy can never diverge between them.
 *
 * @remarks
 * A turn that committed PARTIAL (a cancel — abort / budget / timeout) is by default a
 * FAILURE, so it THROWS an {@link import('./errors.js').AgentJobError} carrying the partial
 * (the Queue's retries + a Runner's fail-fast then engage); with `allowPartial` it RESOLVES
 * the partial as success instead. A natural finish ALWAYS resolves with its result.
 *
 * @param agent - The rehydrated {@link AgentInterface} to run to its {@link AgentResult}
 * @param allowPartial - When `true`, a partial result resolves as success; when `false`
 *   (the default policy), a partial result throws an {@link AgentJobError}
 * @returns The agent's {@link AgentResult} (a natural finish, or a partial when `allowPartial`)
 * @throws {AgentJobError} When the run ended `partial` and `allowPartial` is `false`
 *
 * @example
 * ```ts
 * const result = await settleAgentJob(registry.build(input, signal), false)
 * ```
 */
export async function settleAgentJob(
	agent: AgentInterface,
	allowPartial: boolean,
): Promise<AgentResult> {
	const result = await agent.generate()
	if (result.partial && !allowPartial) throw new AgentJobError('agent job ended partial', result)
	return result
}

// Workspaces — the FileContent narrowing surface (the `isText` / `isBinary` / `isImage` guards that
// tell a TAGLESS text-vs-binary content union apart STRUCTURALLY; §14: narrow an untyped arm via a
// guard, never an `as`; there is no `modality` discriminant). `isText` tests `'text' in content`,
// `isBinary` tests `'data' in content`, and `isImage` is a binary whose `mime` starts with `image/`
// (so an image is just a binary with an image MIME). Every former modality check goes through these.
//
// Plus the pure, environment-agnostic derivation helpers a File computes its `size` / `lines` from
// when built, plus the 1-based range helpers the Workspace edit surface slices / splices text with
// (§4.3 multi-word `{verb}{Noun}` names). All ZERO-Node (no `node:*`, no `Buffer`/`Blob`/`atob`/DOM):
// text byte length comes from the standard Web/Node `TextEncoder`, the decoded binary byte length is
// computed ARITHMETICALLY from the base64 string, and the range helpers are pure string math. All
// total — they never throw.
//
// Plus `fencedFile` — the one fenced-reference-block renderer `AgentContext.build()` frames an active
// workspace's text files with (the SOLE document/image context now that the legacy managers are gone).

/**
 * Whether a {@link FileContent} is the TEXT arm — the narrowing guard for the text-vs-binary
 * union (AGENTS §14: narrow an untyped arm via a guard, never an `as`).
 *
 * @remarks
 * Tests `'text' in content` structurally — there is no `modality` discriminant. A `true`
 * narrows `content` to `{ text: string; language: string }`, unlocking `.text` / `.language`.
 * Total — never throws.
 *
 * @param content - The file content to test
 * @returns `true` when `content` is the text arm (carries `text` + `language`)
 *
 * @example
 * ```ts
 * if (isText(file.content)) file.content.text // the literal text + .language
 * ```
 */
export function isText(
	content: FileContent,
): content is { readonly text: string; readonly language: string } {
	return 'text' in content
}

/**
 * Whether a {@link FileContent} is the BINARY arm — the narrowing guard for the text-vs-binary
 * union (AGENTS §14: narrow an untyped arm via a guard, never an `as`).
 *
 * @remarks
 * Tests `'data' in content` structurally — there is no `modality` discriminant. A `true`
 * narrows `content` to `{ data: string; mime: BinaryMIME }`, unlocking `.data` / `.mime`. An
 * image is a binary whose `mime` starts with `image/` ({@link isImage}). Total — never throws.
 *
 * @param content - The file content to test
 * @returns `true` when `content` is the binary arm (carries base64 `data` + `mime`)
 *
 * @example
 * ```ts
 * if (isBinary(file.content)) file.content.data // the base64 payload + .mime
 * ```
 */
export function isBinary(
	content: FileContent,
): content is { readonly data: string; readonly mime: BinaryMIME } {
	return 'data' in content
}

/**
 * Whether a {@link FileContent} is an IMAGE — a {@link isBinary} arm whose `mime` is an
 * `image/*` type (an image is just a binary with an image MIME).
 *
 * @remarks
 * Narrows to the binary arm first, then checks the `image/` MIME prefix — so a future
 * non-image binary (a PDF, `'application/pdf'`) is binary but NOT an image. Total — never
 * throws.
 *
 * @param content - The file content to test
 * @returns `true` when `content` is a binary arm with an `image/*` MIME
 *
 * @example
 * ```ts
 * isImage({ data: '<base64>', mime: 'image/png' }) // true
 * isImage({ text: 'hi', language: 'text' }) // false
 * ```
 */
export function isImage(content: FileContent): boolean {
	return isBinary(content) && content.mime.startsWith('image/')
}

/**
 * Whether an `unknown` is structurally a {@link FileInterface} record — the per-file step of the
 * {@link isWorkspaceSnapshot} read-boundary narrow (AGENTS §14: narrow an untrusted storage read
 * via a guard, never an `as`).
 *
 * @remarks
 * A total guard (it NEVER throws — adversarial input returns `false`). It checks the file's SHAPE:
 * a record with a `string` `path`, a `string` `state`, `number` `size` / `lines`, and a `content`
 * that is EITHER the TEXT arm (`{ text: string; language: string }`) OR the BINARY arm
 * (`{ data: string; mime: string }`) — the tagless {@link FileContent} union, told apart
 * structurally exactly as {@link isText} / {@link isBinary} do (no `modality` discriminant). Enough
 * to safely impose the {@link FileInterface} type at a storage boundary WITHOUT a cast; the `mime`
 * is left as a broad `string` here (an open {@link BinaryMIME}, so any storage-read MIME string is
 * accepted defensively rather than rejected against the current literal set).
 *
 * @param value - The value to test (one element of a snapshot's opaque `files` array)
 * @returns `true` when `value` has the structural shape of a {@link FileInterface}
 *
 * @example
 * ```ts
 * isFile({ path: 'a.ts', content: { text: 'x', language: 'typescript' }, state: 'created', size: 1, lines: 1 }) // true
 * isFile({ path: 'a.png', content: { data: 'AAAA', mime: 'image/png' }, state: 'created', size: 3, lines: 0 }) // true
 * isFile({ path: 'a.ts' }) // false (missing content / state / size / lines)
 * ```
 */
export function isFile(value: unknown): value is FileInterface {
	if (!isRecord(value)) return false
	if (!isString(value.path) || !isString(value.state)) return false
	if (!isNumber(value.size) || !isNumber(value.lines)) return false
	if (!isRecord(value.content)) return false
	const text = isString(value.content.text) && isString(value.content.language)
	const binary = isString(value.content.data) && isString(value.content.mime)
	return text || binary
}

/**
 * Narrow an `unknown` to a {@link WorkspaceSnapshot} — the AGENTS §14 boundary guard for an
 * UNTRUSTED snapshot read (a storage row a
 * {@link import('./workspaces/stores/DatabaseWorkspaceStore.js').DatabaseWorkspaceStore} reads back
 * from its opaque JSON column, a snapshot loaded from disk).
 *
 * @remarks
 * A total guard (it NEVER throws — adversarial input returns `false`). It checks the snapshot's
 * SHAPE: a `string` `id` and a `files` array EVERY element of which is a valid {@link FileInterface}
 * record ({@link isFile}) — enough to safely impose the {@link WorkspaceSnapshot} type at a storage
 * boundary WITHOUT a cast. The structural twin of
 * the analogous `isWorkflowSnapshot` in `@orkestrel/workflow`. A malformed blob (a non-record, a
 * missing / non-string `id`, a non-array `files`, or any malformed file element) resolves `false`,
 * so a {@link import('./workspaces/stores/DatabaseWorkspaceStore.js').DatabaseWorkspaceStore} read
 * yields `undefined` rather than a broken workspace.
 *
 * @param value - The value to test (an opaque storage read)
 * @returns `true` when `value` has the structural shape of a {@link WorkspaceSnapshot}
 *
 * @example
 * ```ts
 * isWorkspaceSnapshot({ id: 'w1', files: [] }) // true
 * isWorkspaceSnapshot({ id: 'w1', files: 'nope' }) // false
 * isWorkspaceSnapshot({ files: [] }) // false (missing id)
 * ```
 */
export function isWorkspaceSnapshot(value: unknown): value is WorkspaceSnapshot {
	return isRecord(value) && isString(value.id) && isArray(value.files) && value.files.every(isFile)
}

/**
 * Whether an `unknown` is structurally a {@link ToolCall} record — the per-call step of the
 * {@link isMessage} read-boundary narrow (AGENTS §14: narrow an untrusted storage read via a
 * guard, never an `as`).
 *
 * @remarks
 * A total guard (it NEVER throws — adversarial input returns `false`). It checks the call's
 * SHAPE: a record with a `string` `id`, a `string` `name`, and a record `arguments` — the real
 * {@link ToolCall} shape a restored assistant turn replays to a provider. This is the ASI06
 * fail-CLOSED element check: a tampered persisted call (`null`, a bare string, a non-record
 * `arguments`) fails the guard, so {@link isMessage} — and through it
 * {@link isConversationSnapshot} — rejects the whole snapshot and a poisoned store row reads
 * back as ABSENT instead of replaying a malformed call into a chat template.
 *
 * @param value - The value to test (one element of an assistant message's `calls`)
 * @returns `true` when `value` has the structural shape of a {@link ToolCall}
 *
 * @example
 * ```ts
 * isToolCall({ id: 'c1', name: 'search', arguments: { q: 'acme' } }) // true
 * isToolCall({ id: 'c1', name: 'search' }) // false (missing arguments)
 * isToolCall({ id: 'c1', name: 123, arguments: {} }) // false (non-string name)
 * ```
 */
export function isToolCall(value: unknown): value is ToolCall {
	if (!isRecord(value)) return false
	return isString(value.id) && isString(value.name) && isRecord(value.arguments)
}

/**
 * Project a {@link ToolResult} into the MCP `CallToolResult` shape — a top-level `error`
 * maps to a single `isError: true` text block (the failure reason), otherwise the `value`
 * is JSON-stringified into a single text block with no `isError`.
 *
 * @param result - The {@link ToolResult} to project (as returned by {@link import('./tools/ToolManager.js').ToolManager.execute})
 * @returns The equivalent {@link ToolCallResult}
 *
 * @example
 * ```ts
 * buildToolResult({ id: 'c1', name: 'search', error: 'max depth' })
 * // { content: [{ type: 'text', text: 'max depth' }], isError: true }
 * buildToolResult({ id: 'c1', name: 'search', value: { count: 1 } })
 * // { content: [{ type: 'text', text: '{"count":1}' }] }
 * ```
 */
export function buildToolResult(result: ToolResult): ToolCallResult {
	if (result.error !== undefined) {
		return { content: [{ type: 'text', text: result.error }], isError: true }
	}
	return { content: [{ type: 'text', text: JSON.stringify(result.value) }] }
}

/**
 * Whether an `unknown` is structurally a {@link MessageInterface} record — the per-message step of
 * the {@link isConversationSnapshot} read-boundary narrow (AGENTS §14: narrow an untrusted storage
 * read via a guard, never an `as`). The conversation analogue of {@link isFile}.
 *
 * @remarks
 * A total guard (it NEVER throws — adversarial input returns `false`). It checks the message's
 * SHAPE: a record with a `string` `id`, a `string` `role`, a `string` `content`, and — WHEN present
 * — a `calls` array EVERY element of which is a valid {@link ToolCall} ({@link isToolCall} — the
 * ASI06 fail-closed deepening: a tampered `calls` element rejects the message, so the snapshot
 * reads back as absent rather than replaying a malformed call) and an `images` that is an array
 * (an absent optional passes). The `role` is left as a broad `string` here (an open
 * {@link import('./types.js').MessageRole}, so any storage-read role string is accepted
 * defensively rather than rejected against the current literal set) — exactly as {@link isFile}
 * accepts a broad `state` / `mime`. Enough to safely impose the {@link MessageInterface} type at
 * a storage boundary WITHOUT a cast.
 *
 * @param value - The value to test (one element of a snapshot's `messages` / a section's `messages`)
 * @returns `true` when `value` has the structural shape of a {@link MessageInterface}
 *
 * @example
 * ```ts
 * isMessage({ id: '1', role: 'user', content: 'hi' }) // true
 * isMessage({ id: '1', role: 'assistant', content: '', calls: [] }) // true
 * isMessage({ id: '1', role: 'user' }) // false (missing content)
 * isMessage({ id: '1', role: 'assistant', content: '', calls: [null] }) // false (malformed call)
 * ```
 */
export function isMessage(value: unknown): value is MessageInterface {
	if (!isRecord(value)) return false
	if (!isString(value.id) || !isString(value.role) || !isString(value.content)) return false
	if (value.calls !== undefined && !(isArray(value.calls) && value.calls.every(isToolCall))) {
		return false
	}
	return value.images === undefined || isArray(value.images)
}

/**
 * Whether an `unknown` is structurally a {@link SectionInterface} record — the per-section step of
 * the {@link isConversationSnapshot} read-boundary narrow (AGENTS §14: narrow an untrusted storage
 * read via a guard, never an `as`).
 *
 * @remarks
 * A total guard (it NEVER throws — adversarial input returns `false`). It checks the section's
 * SHAPE: a record with a `string` `id`, a `string` `summary`, and a `messages` array EVERY element
 * of which is a valid {@link MessageInterface} record ({@link isMessage}). Enough to safely impose
 * the {@link SectionInterface} type at a storage boundary WITHOUT a cast.
 *
 * @param value - The value to test (one element of a snapshot's `sections` array)
 * @returns `true` when `value` has the structural shape of a {@link SectionInterface}
 *
 * @example
 * ```ts
 * isSection({ id: 's', summary: 'recap', messages: [{ id: '1', role: 'user', content: 'hi' }] }) // true
 * isSection({ id: 's', summary: 'recap', messages: 'nope' }) // false
 * isSection({ id: 's', messages: [] }) // false (missing summary)
 * ```
 */
export function isSection(value: unknown): value is SectionInterface {
	if (!isRecord(value)) return false
	if (!isString(value.id) || !isString(value.summary)) return false
	return isArray(value.messages) && value.messages.every(isMessage)
}

/**
 * Narrow an `unknown` to a {@link ConversationSnapshot} — the AGENTS §14 boundary guard for an
 * UNTRUSTED snapshot read (a storage row a
 * {@link import('./conversations/stores/DatabaseConversationStore.js').DatabaseConversationStore}
 * reads back from its opaque JSON column, a snapshot loaded from disk). The EXACT analogue of
 * {@link isWorkspaceSnapshot}.
 *
 * @remarks
 * A total guard (it NEVER throws — adversarial input returns `false`). It checks the snapshot's
 * SHAPE: a `string` `id`, an OPTIONAL `string` `summary` (present-or-absent — the rollup is
 * `undefined` until the first compaction), a `sections` array EVERY element of which is a valid
 * {@link SectionInterface} ({@link isSection}), and a `messages` array EVERY element of which is a
 * valid {@link MessageInterface} ({@link isMessage}) — enough to safely impose the
 * {@link ConversationSnapshot} type at a storage boundary WITHOUT a cast. The structural twin of
 * {@link isWorkspaceSnapshot}. A malformed blob (a non-record, a missing / non-string `id`, a
 * non-string `summary` when present, a non-array `sections` / `messages`, or any malformed
 * element) resolves `false`, so a
 * {@link import('./conversations/stores/DatabaseConversationStore.js').DatabaseConversationStore}
 * read yields `undefined` rather than a broken conversation.
 *
 * @param value - The value to test (an opaque storage read)
 * @returns `true` when `value` has the structural shape of a {@link ConversationSnapshot}
 *
 * @example
 * ```ts
 * isConversationSnapshot({ id: 'c1', sections: [], messages: [] }) // true
 * isConversationSnapshot({ id: 'c1', summary: 'recap', sections: [], messages: [] }) // true
 * isConversationSnapshot({ id: 'c1', sections: 'nope', messages: [] }) // false
 * isConversationSnapshot({ sections: [], messages: [] }) // false (missing id)
 * ```
 */
export function isConversationSnapshot(value: unknown): value is ConversationSnapshot {
	if (!isRecord(value)) return false
	if (!isString(value.id)) return false
	if (value.summary !== undefined && !isString(value.summary)) return false
	if (!isArray(value.sections) || !value.sections.every(isSection)) return false
	return isArray(value.messages) && value.messages.every(isMessage)
}

/**
 * Compute the byte size of a {@link FileContent} — the `size` a {@link FileInterface} derives
 * once when built.
 *
 * @remarks
 * Dispatches on {@link isText}: a text arm is its UTF-8 byte length (via `new
 * TextEncoder().encode(text).length` — the standard Web/Node API, so a multi-byte
 * character like `'é'` or `'😀'` counts as its real encoded bytes, NOT its character
 * count); a binary arm is the decoded payload byte length of its base64 `data` (via
 * {@link decodedSize}, computed arithmetically — no `atob` / `Buffer`). Total — never throws.
 *
 * @param content - The file content to size
 * @returns The byte size (UTF-8 bytes for text; decoded payload bytes for binary)
 *
 * @example
 * ```ts
 * computeSize({ text: 'café', language: 'text' }) // 5 (é is two bytes)
 * computeSize({ data: 'AAAA', mime: 'image/png' }) // 3
 * ```
 */
export function computeSize(content: FileContent): number {
	if (isText(content)) return new TextEncoder().encode(content.text).length
	return decodedSize(content.data)
}

/**
 * Count the lines of a {@link FileContent} — the `lines` a {@link FileInterface} derives once
 * when built.
 *
 * @remarks
 * A text arm's line count is `0` for the empty string, otherwise one more than the
 * number of newline (`\n`) separators it contains — so `'a'` is one line, `'a\nb'` is two,
 * and a trailing newline `'a\n'` counts the empty final line as two. A binary arm has no
 * lines and returns `0`. Total — never throws.
 *
 * @param content - The file content to count lines for
 * @returns The line count (text line count; `0` for a binary arm or empty text)
 *
 * @example
 * ```ts
 * countLines({ text: '', language: 'text' }) // 0
 * countLines({ text: 'a\nb\nc', language: 'text' }) // 3
 * countLines({ data: 'AAAA', mime: 'image/png' }) // 0
 * ```
 */
export function countLines(content: FileContent): number {
	if (!isText(content)) return 0
	if (content.text.length === 0) return 0
	let count = 1
	for (const character of content.text) if (character === '\n') count += 1
	return count
}

/**
 * Compute the decoded byte length of a base64 string ARITHMETICALLY — the image-payload
 * sizing primitive {@link computeSize} uses, with no `atob` / `Buffer` decode.
 *
 * @remarks
 * A base64 string encodes each group of 3 input bytes as 4 characters, so a well-formed
 * string's length is a multiple of 4 and its decoded length is `(length / 4) * 3` MINUS
 * the trailing `=` padding (one `=` ⇒ the last group held 2 bytes, two `==` ⇒ 1 byte).
 * The padding is counted from the trailing `=` characters, so both the `=` and `==` cases
 * are handled. The empty string decodes to `0`. Total — never throws (a malformed,
 * non-multiple-of-4 length still yields a defined non-negative estimate via `floor`).
 *
 * @param base64 - The base64-encoded string (e.g. an image's `data`)
 * @returns The decoded payload's byte length
 *
 * @example
 * ```ts
 * decodedSize('') // 0
 * decodedSize('AAAA') // 3  (no padding)
 * decodedSize('AAA=') // 2  (one '=')
 * decodedSize('AA==') // 1  (two '=')
 * ```
 */
export function decodedSize(base64: string): number {
	if (base64.length === 0) return 0
	let padding = 0
	if (base64.endsWith('==')) padding = 2
	else if (base64.endsWith('=')) padding = 1
	return Math.floor(base64.length / 4) * 3 - padding
}

/**
 * Whether a {@link Range} is STRUCTURALLY valid — the predicate a ranged `write` checks
 * before applying (a `false` here is the `RANGE` throw).
 *
 * @remarks
 * Structural validity is independent of any content: every component must be `>= 1`
 * (1-based lines and columns), and `start` must not come after `end` (an inverted range
 * is invalid). A range that is structurally valid but reaches PAST the end of a specific
 * text is still valid — it is {@link clampRange}d to the bounds when applied, not rejected.
 * Total — never throws.
 *
 * @param range - The range to validate
 * @returns `true` when every component is `>= 1` and `start` is at or before `end`
 *
 * @example
 * ```ts
 * isValidRange({ start: { line: 1, column: 1 }, end: { line: 2, column: 1 } }) // true
 * isValidRange({ start: { line: 2, column: 1 }, end: { line: 1, column: 1 } }) // false (inverted)
 * isValidRange({ start: { line: 0, column: 1 }, end: { line: 1, column: 1 } }) // false (sub-1 line)
 * ```
 */
export function isValidRange(range: Range): boolean {
	if (range.start.line < 1 || range.start.column < 1) return false
	if (range.end.line < 1 || range.end.column < 1) return false
	if (range.start.line > range.end.line) return false
	return !(range.start.line === range.end.line && range.start.column > range.end.column)
}

/**
 * Clamp a 1-based {@link Position} to the bounds of `text` — every component pinned into a
 * caret that actually exists in the content.
 *
 * @remarks
 * `line` is pinned to `[1, lineCount]` and `column` to `[1, lineLength + 1]` of the
 * resolved line (column `lineLength + 1` is the caret just past the line's last
 * character). So a position beyond the end of the text resolves to the end rather than
 * overflowing. Total — never throws.
 *
 * @param text - The text the position addresses
 * @param position - The 1-based position to clamp
 * @returns The clamped {@link Position}
 *
 * @example
 * ```ts
 * clampPosition('ab\ncd', { line: 9, column: 9 }) // { line: 2, column: 3 } (end of 'cd')
 * ```
 */
export function clampPosition(text: string, position: Position): Position {
	const lines = text.split('\n')
	const line = Math.max(1, Math.min(position.line, lines.length))
	const lineText = lines[line - 1] ?? ''
	const column = Math.max(1, Math.min(position.column, lineText.length + 1))
	return { line, column }
}

/**
 * Clamp both ends of a {@link Range} to the bounds of `text` — the actual span a ranged
 * read / write applies (and the `range` a {@link import('./types.js').ReadResult} reports).
 *
 * @remarks
 * Clamps `start` and `end` independently via {@link clampPosition}, so a range reaching
 * past the end of the content is trimmed to the content's end. Total — never throws.
 *
 * @param text - The text the range addresses
 * @param range - The 1-based range to clamp
 * @returns The clamped {@link Range}
 *
 * @example
 * ```ts
 * clampRange('ab\ncd', { start: { line: 1, column: 1 }, end: { line: 9, column: 9 } })
 * // { start: { line: 1, column: 1 }, end: { line: 2, column: 3 } }
 * ```
 */
export function clampRange(text: string, range: Range): Range {
	return { start: clampPosition(text, range.start), end: clampPosition(text, range.end) }
}

/**
 * Convert a 1-based {@link Position} to a 0-based string offset into `text` — the indexing
 * primitive {@link sliceRange} / {@link spliceRange} use, clamped to `text.length`.
 *
 * @remarks
 * Sums each preceding line's length plus its `\n` separator, then adds the `column - 1`
 * within the target line, capped at `text.length`. Total — never throws (an out-of-bounds
 * position yields a defined in-range offset).
 *
 * @param text - The text to index into
 * @param position - The 1-based position to resolve
 * @returns The 0-based offset (in `[0, text.length]`)
 *
 * @example
 * ```ts
 * offsetAt('ab\ncd', { line: 2, column: 1 }) // 3 (just after 'ab\n')
 * ```
 */
export function offsetAt(text: string, position: Position): number {
	const lines = text.split('\n')
	let offset = 0
	for (let index = 0; index < position.line - 1 && index < lines.length; index += 1) {
		offset += (lines[index]?.length ?? 0) + 1
	}
	offset += position.column - 1
	return Math.min(offset, text.length)
}

/**
 * Slice the substring of `text` spanned by a {@link Range} (start INCLUSIVE, end
 * EXCLUSIVE), clamping the range to the text's bounds first — the read half of the ranged
 * edit surface.
 *
 * @remarks
 * Clamps via {@link clampRange}, resolves each end to an offset via {@link offsetAt}, and
 * returns `text.slice(startOffset, endOffset)`. Total — never throws.
 *
 * @param text - The text to slice
 * @param range - The 1-based range to extract
 * @returns The spanned substring (empty when the clamped span is empty)
 *
 * @example
 * ```ts
 * sliceRange('hello\nworld', { start: { line: 1, column: 1 }, end: { line: 1, column: 6 } }) // 'hello'
 * ```
 */
export function sliceRange(text: string, range: Range): string {
	const clamped = clampRange(text, range)
	return text.slice(offsetAt(text, clamped.start), offsetAt(text, clamped.end))
}

/**
 * Replace the span of `text` covered by a {@link Range} with `replacement` (start
 * INCLUSIVE, end EXCLUSIVE), clamping the range to the text's bounds first — the write
 * half of the ranged edit surface.
 *
 * @remarks
 * Clamps via {@link clampRange}, then stitches `before + replacement + after` around the
 * resolved offsets. An empty span (`start === end`) becomes a pure insertion. Total —
 * never throws.
 *
 * @param text - The original text
 * @param range - The 1-based range to overwrite
 * @param replacement - The text to splice in place of the spanned range
 * @returns The text with the spanned range replaced by `replacement`
 *
 * @example
 * ```ts
 * spliceRange('hello', { start: { line: 1, column: 1 }, end: { line: 1, column: 6 } }, 'bye') // 'bye'
 * ```
 */
export function spliceRange(text: string, range: Range, replacement: string): string {
	const clamped = clampRange(text, range)
	const start = offsetAt(text, clamped.start)
	const end = offsetAt(text, clamped.end)
	return text.slice(0, start) + replacement + text.slice(end)
}

/**
 * Assemble a 1-based nested {@link Range} from the four FLAT caret integers of the workspace tool's
 * `'splice'` operation — the bridge from the small-model FLAT surface
 * ({@link import('./types.js').WorkspaceOperation}) back to the nested {@link Range} the
 * {@link import('./workspaces/Workspace.js').Workspace} edit surface speaks.
 *
 * @remarks
 * Pairs `(fromLine, fromColumn)` into `start` and `(toLine, toColumn)` into `end` verbatim — a pure
 * structural lift, no validation (a structurally invalid range is rejected downstream by the ranged
 * `write` it feeds, via {@link isValidRange}). Total — never throws. Zero-Node.
 *
 * @param fromLine - The 1-based start line
 * @param fromColumn - The 1-based start column
 * @param toLine - The 1-based end line
 * @param toColumn - The 1-based end column
 * @returns The `{ start, end }` {@link Range}
 *
 * @example
 * ```ts
 * rangeOf(1, 11, 1, 12) // { start: { line: 1, column: 11 }, end: { line: 1, column: 12 } }
 * ```
 */
export function rangeOf(
	fromLine: number,
	fromColumn: number,
	toLine: number,
	toColumn: number,
): Range {
	return { start: { line: fromLine, column: fromColumn }, end: { line: toLine, column: toColumn } }
}

/**
 * Render a path-addressed text body as a fenced reference block — the framing an
 * {@link import('./AgentContext.js').AgentContext}'s ACTIVE-workspace text-file render emits (the
 * active workspace is the SOLE document/image context).
 *
 * @remarks
 * Produces `` File: <path>\n```<language>\n<content>\n``` `` — the `File:` label line, then a
 * fenced code block tagged with `language`, the `content` verbatim inside. Pure string assembly,
 * total — never throws. The one fenced-file format string for the whole module — `AgentContext.build()`
 * frames an active workspace's text files with it (each carries its own `language` on its
 * {@link FileContent} text arm).
 *
 * @param path - The file path shown on the `File:` label line
 * @param language - The fenced-code language tag (e.g. `'typescript'`)
 * @param content - The file body rendered verbatim inside the fence
 * @returns The fenced reference block
 *
 * @example
 * ```ts
 * import { fencedFile } from '@src/core'
 *
 * fencedFile('src/main.ts', 'typescript', 'const x = 1')
 * // 'File: src/main.ts\n```typescript\nconst x = 1\n```'
 * ```
 */
export function fencedFile(path: string, language: string, content: string): string {
	return `File: ${path}\n\`\`\`${language}\n${content}\n\`\`\``
}

/**
 * Escape a string's regex-special characters so it matches LITERALLY inside a `RegExp` — the
 * primitive a {@link import('./workspaces/Workspace.js').Workspace} search builds a literal-text
 * search pattern through (as opposed to a caller-supplied regex pattern).
 *
 * @remarks
 * Prefixes every character in the class `. * + ? ^ $ { } ( ) | [ ] \` with a backslash, so the
 * escaped string, when compiled into a `RegExp`, matches only its own literal characters — no
 * character acts as a quantifier, anchor, group, or class. Pure string assembly, total — never
 * throws.
 *
 * @param value - The text to escape for literal use inside a `RegExp` pattern
 * @returns `value` with every regex-special character backslash-escaped
 *
 * @example
 * ```ts
 * escapeRegExp('a.b*c') // 'a\\.b\\*c'
 * new RegExp(escapeRegExp('a.b*c')).test('a.b*c') // true
 * ```
 */
export function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
