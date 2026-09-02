import type { ConversationSnapshot, Message, Section } from './types.js'
import { isArray, isRecord, isString } from '@orkestrel/contract'
import { isToolCall } from '@orkestrel/tool'

/**
 * Checks whether an `unknown` is structurally a {@link Message} record — the per-message step of
 * the {@link isConversationSnapshot} read-boundary narrow (AGENTS §14: narrow an untrusted storage
 * read via a guard, never an `as`). The conversation analogue of
 * {@link import('@orkestrel/workspace').isFile}.
 *
 * @remarks
 * A total guard (it NEVER throws — adversarial input returns `false`). It checks the message's
 * SHAPE: a record with a `string` `id`, a `string` `role`, a `string` `content`, and — WHEN present
 * — a `calls` array EVERY element of which is a valid
 * {@link import('@orkestrel/tool').ToolCall} ({@link isToolCall} — the
 * ASI06 fail-closed deepening: a tampered `calls` element rejects the message, so the snapshot
 * reads back as absent rather than replaying a malformed call) and an `images` that is an array
 * (an absent optional passes). The `role` is left as a broad `string` here (an open
 * {@link import('./types.js').MessageRole}, so any storage-read role string is accepted
 * defensively rather than rejected against the current literal set). Enough to safely impose the
 * {@link Message} type at
 * a storage boundary WITHOUT a cast.
 *
 * @param value - The value to test (one element of a snapshot's `messages` / a section's `messages`)
 * @returns True if `value` has the structural shape of a {@link Message}; false otherwise
 *
 * @example
 * ```ts
 * isMessage({ id: '1', role: 'user', content: 'hi' }) // true
 * isMessage({ id: '1', role: 'assistant', content: '', calls: [] }) // true
 * isMessage({ id: '1', role: 'user' }) // false (missing content)
 * isMessage({ id: '1', role: 'assistant', content: '', calls: [null] }) // false (malformed call)
 * ```
 */
export function isMessage(value: unknown): value is Message {
	if (!isRecord(value)) return false
	if (!isString(value.id) || !isString(value.role) || !isString(value.content)) return false
	if (value.calls !== undefined && !(isArray(value.calls) && value.calls.every(isToolCall))) {
		return false
	}
	return value.images === undefined || isArray(value.images)
}

/**
 * Checks whether an `unknown` is structurally a {@link Section} record — the per-section step of
 * the {@link isConversationSnapshot} read-boundary narrow (AGENTS §14: narrow an untrusted storage
 * read via a guard, never an `as`).
 *
 * @remarks
 * A total guard (it NEVER throws — adversarial input returns `false`). It checks the section's
 * SHAPE: a record with a `string` `id`, a `string` `summary`, and a `messages` array EVERY element
 * of which is a valid {@link Message} record ({@link isMessage}). Enough to safely impose
 * the {@link Section} type at a storage boundary WITHOUT a cast.
 *
 * @param value - The value to test (one element of a snapshot's `sections` array)
 * @returns True if `value` has the structural shape of a {@link Section}; false otherwise
 *
 * @example
 * ```ts
 * isSection({ id: 's', summary: 'recap', messages: [{ id: '1', role: 'user', content: 'hi' }] }) // true
 * isSection({ id: 's', summary: 'recap', messages: 'nope' }) // false
 * isSection({ id: 's', messages: [] }) // false (missing summary)
 * ```
 */
export function isSection(value: unknown): value is Section {
	if (!isRecord(value)) return false
	if (!isString(value.id) || !isString(value.summary)) return false
	return isArray(value.messages) && value.messages.every(isMessage)
}

/**
 * Narrows an `unknown` to a {@link ConversationSnapshot} — the AGENTS §14 boundary guard for an
 * UNTRUSTED snapshot read (a storage row a
 * {@link import('./conversations/stores/DatabaseConversationStore.js').DatabaseConversationStore}
 * reads back from its opaque JSON column, a snapshot loaded from disk). The EXACT analogue of
 * {@link import('@orkestrel/workspace').isWorkspaceSnapshot}.
 *
 * @remarks
 * A total guard (it NEVER throws — adversarial input returns `false`). It checks the snapshot's
 * SHAPE: a `string` `id`, an OPTIONAL `string` `summary` (present-or-absent — the rollup is
 * `undefined` until the first compaction), a `sections` array EVERY element of which is a valid
 * {@link Section} ({@link isSection}), and a `messages` array EVERY element of which is a
 * valid {@link Message} ({@link isMessage}) — enough to safely impose the
 * {@link ConversationSnapshot} type at a storage boundary WITHOUT a cast. The structural twin of
 * {@link import('@orkestrel/workspace').isWorkspaceSnapshot}. A malformed blob (a non-record, a missing / non-string `id`, a
 * non-string `summary` when present, a non-array `sections` / `messages`, or any malformed
 * element) resolves `false`, so a
 * {@link import('./conversations/stores/DatabaseConversationStore.js').DatabaseConversationStore}
 * read yields `undefined` rather than a broken conversation.
 *
 * @param value - The value to test (an opaque storage read)
 * @returns True if `value` has the structural shape of a {@link ConversationSnapshot}; false otherwise
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
