import type { ConversationSnapshot, Section } from './types.js'
import { isArray, isRecord, isString } from '@orkestrel/contract'
import { isMessage } from '../validators.js'

/**
 * Checks whether an `unknown` is structurally a {@link Section} record — a `string` `id` and
 * `summary` beside a `messages` array of valid {@link Message}s, the per-section step of the
 * {@link isConversationSnapshot} read-boundary narrow. Total, never throwing, and never an
 * assertion.
 *
 * @remarks
 * A total guard (it never throws — adversarial input returns `false`). It checks the section's
 * shape: a record with a `string` `id`, a `string` `summary`, and a `messages` array every element
 * of which is a valid {@link Message} record ({@link isMessage}). Enough to safely impose
 * the {@link Section} type at a storage boundary without a cast.
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
 * Narrows an `unknown` to a {@link ConversationSnapshot} — a `string` `id`, an optional `string`
 * `summary`, and valid `sections` and `messages` arrays; the total boundary guard for an
 * untrusted snapshot read (a storage row a
 * {@link import('./stores/DatabaseConversationStore.js').DatabaseConversationStore}
 * reads back from its opaque JSON column, a snapshot loaded from disk), never throwing. The exact
 * analogue of {@link import('@orkestrel/workspace').isWorkspaceSnapshot}.
 *
 * @remarks
 * A total guard (it never throws — adversarial input returns `false`). It checks the snapshot's
 * shape: a `string` `id`, an optional `string` `summary` (present-or-absent — the rollup is
 * `undefined` until the first compaction), a `sections` array every element of which is a valid
 * {@link Section} ({@link isSection}), and a `messages` array every element of which is a
 * valid {@link Message} ({@link isMessage}) — enough to safely impose the
 * {@link ConversationSnapshot} type at a storage boundary without a cast. The structural twin of
 * {@link import('@orkestrel/workspace').isWorkspaceSnapshot}. A malformed blob (a non-record, a missing / non-string `id`, a
 * non-string `summary` when present, a non-array `sections` / `messages`, or any malformed
 * element) resolves `false`, so a
 * {@link import('./stores/DatabaseConversationStore.js').DatabaseConversationStore}
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
