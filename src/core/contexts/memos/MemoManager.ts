import type {
	ContextSectionFormat,
	Memo,
	MemoInput,
	MemoManagerEventMap,
	MemoManagerInterface,
	MemoManagerOptions,
	MemoSnapshot,
} from '../types.js'
import type { EmitterInterface } from '@orkestrel/emitter'
import { isArray } from '@orkestrel/contract'
import { Emitter } from '@orkestrel/emitter'
import { removeEntries } from '../../helpers.js'
import { MEMO_SECTION_HEADER } from '../constants.js'
import { renderIndexEntry } from '../helpers.js'

/**
 * Registers the revisions of a memo set — durable facts keyed by `name`, where a same-name `add`
 * with changed text appends a revision and the earlier ones stay readable — carrying the `open` /
 * `render` / `close` build contract and an observable `emitter`.
 *
 * @remarks
 * - **Revisions.** Every revision lives in one append-ordered list, so the current revisions,
 *   each name's history, and the snapshot order all derive from it. `add` appends a revision with
 *   a minted `id` and `time` unless the name's current revision holds the same `description` and
 *   `content`; then it returns that revision and emits nothing. `memo(name)` is the name's last
 *   revision, `memos()` lists each name's last revision by its first revision, and `count` is the
 *   number of names.
 * - **Removal.** `remove` drops every revision of a name, so a re-added name starts a fresh
 *   history at the end of `memos()`; `clear` drops every revision.
 * - **Identity.** `id` is the `snapshot.id`, else the `id` option, else a minted UUID. A
 *   `snapshot` option seeds the revisions silently, and `snapshot()` returns them oldest first.
 * - **Build contract.** `open` returns the options `open`, else `'## Memos'`; `render(memo)`
 *   returns the options `render`, else `- name: description`; `close` returns the options
 *   `close`, else `undefined`.
 * - **Observable.** The owned {@link emitter} ({@link MemoManagerEventMap}) carries `add` (the
 *   appended revision) / `remove` (the name) / `clear`, each emitted after the mutation completes;
 *   the emitter isolates a listener throw and routes it to its `error` handler.
 *
 * @example
 * ```ts
 * const memos = new MemoManager({ id: 'ada' })
 * memos.add({ name: 'tone', description: 'Prefers short replies.', content: 'Answer briefly.' })
 * memos.add({ name: 'tone', description: 'Prefers bullet lists.', content: 'Answer in bullets.' })
 * memos.history('tone').length // 2
 * memos.memo('tone')?.description // 'Prefers bullet lists.'
 * ```
 */
export class MemoManager implements MemoManagerInterface {
	readonly #id: string
	// The push observation surface — owned, never inherited. The emitter isolates a
	// listener throw (routing it to the `error` handler), so it can never escape into a mutation.
	readonly #emitter: Emitter<MemoManagerEventMap>
	readonly #format: ContextSectionFormat<Memo> | undefined
	// Every revision, oldest first. Replaced on every change rather than mutated in place.
	#revisions: readonly Memo[]

	constructor(options?: MemoManagerOptions) {
		// Restoring is silent: nothing was edited, so no event fires.
		const snapshot = options?.snapshot
		this.#id = snapshot?.id ?? options?.id ?? crypto.randomUUID()
		this.#emitter = new Emitter<MemoManagerEventMap>(options)
		this.#format = options?.format
		this.#revisions = snapshot === undefined ? [] : [...snapshot.memos]
	}

	get id(): string {
		return this.#id
	}

	get emitter(): EmitterInterface<MemoManagerEventMap> {
		return this.#emitter
	}

	get count(): number {
		return new Set(this.#revisions.map((memo) => memo.name)).size
	}

	get open(): string {
		return this.#format?.open ?? MEMO_SECTION_HEADER
	}

	get close(): string | undefined {
		return this.#format?.close
	}

	add(input: MemoInput): Memo
	add(inputs: readonly MemoInput[]): readonly Memo[]
	add(input: MemoInput | readonly MemoInput[]): Memo | readonly Memo[] {
		if (isArray(input)) return input.map((one) => this.#append(one))
		return this.#append(input)
	}

	memo(name: string): Memo | undefined {
		return this.#revisions.findLast((memo) => memo.name === name)
	}

	memos(): readonly Memo[] {
		// A Map keeps a key's first insertion position while each later set replaces its value, so
		// every name lands at its first revision holding its last one.
		return [...new Map(this.#revisions.map((memo) => [memo.name, memo])).values()]
	}

	history(name: string): readonly Memo[] {
		return this.#revisions.filter((memo) => memo.name === name)
	}

	render(memo: Memo): string {
		return this.#format?.render?.(memo) ?? renderIndexEntry(memo)
	}

	remove(name: string): boolean
	remove(names: readonly string[]): boolean
	remove(names: string | readonly string[]): boolean {
		if (isArray(names)) {
			// Each present name still emits.
			return removeEntries(names, (name) => this.#delete(name))
		}
		return this.#delete(names)
	}

	clear(): void {
		this.#revisions = []
		this.#emitter.emit('clear')
	}

	snapshot(): MemoSnapshot {
		return { id: this.#id, memos: [...this.#revisions] }
	}

	// Append a revision unless the name's current one already holds the same text, and emit `add`
	// after the list changed, so a swallowed listener throw can't perturb it.
	#append(input: MemoInput): Memo {
		const current = this.memo(input.name)
		if (current?.description === input.description && current.content === input.content) {
			return current
		}
		const memo: Memo = {
			id: crypto.randomUUID(),
			name: input.name,
			description: input.description,
			content: input.content,
			time: Date.now(),
			...(input.origin === undefined ? {} : { origin: input.origin }),
		}
		this.#revisions = [...this.#revisions, memo]
		this.#emitter.emit('add', memo)
		return memo
	}

	// Drop every revision of one name, emitting `remove` only when one was present — after the
	// list changed.
	#delete(name: string): boolean {
		const kept = this.#revisions.filter((memo) => memo.name !== name)
		if (kept.length === this.#revisions.length) return false
		this.#revisions = kept
		this.#emitter.emit('remove', name)
		return true
	}
}
