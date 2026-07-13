import type { EmitterInterface } from '../../emitters/types.js'
import type {
	FileInterface,
	Range,
	ReadResult,
	ReplaceOptions,
	ReplaceResult,
	SearchMatch,
	SearchOptions,
	WorkspaceEventMap,
	WorkspaceInterface,
	WorkspaceOptions,
	WorkspaceSnapshot,
} from '../types.js'
import { isArray, isRecord } from '../../contracts/index.js'
import { Emitter } from '../../emitters/Emitter.js'
import { escapeRegExp } from '../../helpers.js'
import { WorkspaceError } from '../errors.js'
import { createFile } from '../factories.js'
import {
	clampRange,
	inferLanguage,
	isText,
	isValidRange,
	sliceRange,
	spliceRange,
} from '../helpers.js'

/**
 * A mutable, `path`-keyed working set of immutable {@link FileInterface}s — the
 * in-memory editing surface over the file primitive.
 *
 * @remarks
 * - **Registry.** Files live in an insertion-ordered `Map` keyed by `path`; `count` is the
 *   map size, `file(path)` looks one up, and `files()` lists them in insertion order.
 * - **Write replaces the File (§11 immutability).** Every edit MINTS a replacement
 *   {@link FileInterface} (via {@link import('../factories.js').createFile}) rather than
 *   mutating in place, transitioning `state` to `'created'` for a brand-new path or
 *   `'modified'` for an existing one. A whole-file string write preserves an existing text
 *   file's `language`, else infers it from the `path` (`inferLanguage`); writing a string
 *   onto an existing BINARY path replaces it with a text file (a deliberate retype). A
 *   ranged `write` splices a `Range` of an existing text file.
 * - **Modality rules.** Text-only ops on a binary file are rejected: a ranged `read` /
 *   `write`, `prepend`, and `append` throw `MODALITY`; a plain `read(path)` of a binary
 *   file returns `undefined`; `search` / `replace` skip binary files (0 matches).
 * - **In-memory removal.** `remove(path)` / `remove(paths)` drop files outright (no
 *   tombstone — the `'loaded'` / `'deleted'` states are reserved for a future FileStore);
 *   `remove()` and `clear()` both empty the registry and emit the single `clear` signal.
 *   The disk/sync lifecycle (`load` / `revert` / `accept` / `purge` / `dirty`) is NOT part
 *   of this surface.
 * - **Observable (§13).** The owned {@link emitter} ({@link WorkspaceEventMap}) carries
 *   `write` (the resulting file) / `remove` (the path) / `move` (`{ from, to }`) / `clear`.
 *   Every event is emitted directly, strictly AFTER the map mutation completes; the
 *   emitter isolates a listener throw and routes it to its `error` handler, so a buggy
 *   observer can never corrupt a mutation.
 *
 * @example
 * ```ts
 * const workspace = new Workspace()
 * workspace.write('src/main.ts', 'const x = 1')
 * workspace.file('src/main.ts')?.state // 'created'
 * workspace.append('src/main.ts', '\nconst y = 2')
 * workspace.file('src/main.ts')?.state // 'modified'
 * workspace.read('src/main.ts') // 'const x = 1\nconst y = 2'
 * ```
 */
export class Workspace implements WorkspaceInterface {
	// The workspace's identity — its key in a WorkspaceManager; minted when not supplied
	// (exactly as Conversation mints its own #id).
	readonly #id: string
	// The path-keyed registry — insertion-ordered, holding immutable Files replaced (not
	// mutated) on every edit.
	readonly #files = new Map<string, FileInterface>()
	// The PUSH observation surface (§13) — owned, never inherited. The emitter isolates a
	// listener throw (routing it to the `error` handler), so it can never escape a mutation.
	readonly #emitter: Emitter<WorkspaceEventMap>

	constructor(options?: WorkspaceOptions, seed?: Iterable<readonly [string, FileInterface]>) {
		this.#id = options?.id ?? crypto.randomUUID()
		this.#emitter = new Emitter<WorkspaceEventMap>({ on: options?.on, error: options?.error })
		// An optional pre-seeded set of files (path → File) — the hydration seam a future
		// FileStore reads a snapshot into, and the only way to seat a non-text (binary) file
		// (the edit surface itself only ever mints text Files). Seeding is silent — it places
		// files without emitting, since nothing was edited.
		if (seed) for (const [path, file] of seed) this.#files.set(path, file)
	}

	get id(): string {
		return this.#id
	}

	get emitter(): EmitterInterface<WorkspaceEventMap> {
		return this.#emitter
	}

	get count(): number {
		return this.#files.size
	}

	file(path: string): FileInterface | undefined {
		return this.#files.get(path)
	}

	files(): readonly FileInterface[] {
		return [...this.#files.values()]
	}

	read(path: string): string | undefined
	read(path: string, range: Range): ReadResult | undefined
	read(paths: readonly string[]): Readonly<Record<string, string>>
	read(
		path: string | readonly string[],
		range?: Range,
	): string | ReadResult | undefined | Readonly<Record<string, string>> {
		if (isArray(path)) {
			const result: Record<string, string> = {}
			for (const one of path) {
				const file = this.#files.get(one)
				if (file && isText(file.content)) result[one] = file.content.text
			}
			return result
		}
		const file = this.#files.get(path)
		if (!file) return undefined
		if (!range) return isText(file.content) ? file.content.text : undefined
		// A ranged read of a binary file is a text-only op aimed at a non-text arm.
		if (!isText(file.content)) {
			throw new WorkspaceError('MODALITY', `Cannot read a range of a binary file: ${path}`, {
				path,
			})
		}
		// `range` reports the clamped span actually applied (so a past-the-end request
		// surfaces the trimmed range, never the original out-of-bounds one).
		return {
			content: sliceRange(file.content.text, range),
			range: clampRange(file.content.text, range),
		}
	}

	has(path: string): boolean
	has(paths: readonly string[]): boolean
	has(path: string | readonly string[]): boolean {
		if (isArray(path)) return path.some((one) => this.#files.has(one))
		return this.#files.has(path)
	}

	search(query: string, options?: SearchOptions): readonly SearchMatch[] {
		const pattern = this.#pattern(query, options)
		const limit = options?.limit
		const matches: SearchMatch[] = []
		for (const file of this.#files.values()) {
			if (limit !== undefined && matches.length >= limit) break
			// Binary files have no lines to scan — they contribute zero matches.
			if (!isText(file.content)) continue
			const lines = file.content.text.split('\n')
			for (let index = 0; index < lines.length; index += 1) {
				if (limit !== undefined && matches.length >= limit) break
				const lineText = lines[index] ?? ''
				pattern.lastIndex = 0
				let hit = pattern.exec(lineText)
				while (hit !== null) {
					if (limit !== undefined && matches.length >= limit) break
					matches.push({
						path: file.path,
						line: index + 1,
						column: hit.index + 1,
						length: hit[0].length,
						content: lineText,
					})
					// A zero-width match would loop forever at the same index — step past it.
					if (hit[0].length === 0) pattern.lastIndex += 1
					hit = pattern.exec(lineText)
				}
			}
		}
		return matches
	}

	replace(query: string, replacement: string, options?: ReplaceOptions): ReplaceResult {
		const pattern = this.#pattern(query, options)
		const limit = options?.limit
		let replaced = 0
		let files = 0
		for (const [path, file] of this.#files) {
			if (limit !== undefined && replaced >= limit) break
			if (!isText(file.content)) continue
			const remaining = limit === undefined ? undefined : limit - replaced
			let count = 0
			pattern.lastIndex = 0
			const next = file.content.text.replace(pattern, (match) => {
				if (remaining !== undefined && count >= remaining) return match
				count += 1
				return replacement
			})
			if (count > 0) {
				replaced += count
				files += 1
				// Route through the write mechanic so the state transition + `write` event fire.
				this.write(path, next)
			}
		}
		return { query, replaced, files }
	}

	write(path: string, content: string): void
	write(path: string, content: string, range: Range): void
	write(files: Readonly<Record<string, string>>): void
	write(path: string | Readonly<Record<string, string>>, content?: string, range?: Range): void {
		if (isRecord(path)) {
			for (const [one, text] of Object.entries(path)) this.#write(one, text)
			return
		}
		const text = content ?? ''
		if (!range) {
			this.#write(path, text)
			return
		}
		this.#splice(path, text, range)
	}

	prepend(path: string, content: string): void
	prepend(files: Readonly<Record<string, string>>): void
	prepend(path: string | Readonly<Record<string, string>>, content?: string): void {
		if (isRecord(path)) {
			for (const [one, text] of Object.entries(path)) this.#prepend(one, text)
			return
		}
		this.#prepend(path, content ?? '')
	}

	append(path: string, content: string): void
	append(files: Readonly<Record<string, string>>): void
	append(path: string | Readonly<Record<string, string>>, content?: string): void {
		if (isRecord(path)) {
			for (const [one, text] of Object.entries(path)) this.#append(one, text)
			return
		}
		this.#append(path, content ?? '')
	}

	move(from: string, to: string): boolean
	move(mapping: Readonly<Record<string, string>>): boolean
	move(from: string | Readonly<Record<string, string>>, to?: string): boolean {
		if (isRecord(from)) {
			let moved = false
			for (const [one, target] of Object.entries(from)) {
				if (this.#move(one, target)) moved = true
			}
			return moved
		}
		return this.#move(from, to ?? '')
	}

	remove(): void
	remove(path: string): boolean
	remove(paths: readonly string[]): boolean
	remove(path?: string | readonly string[]): boolean | void {
		if (path === undefined) {
			// `remove()` empties the registry — the single canonical "emptied" signal.
			this.#files.clear()
			this.#emitter.emit('clear')
			return
		}
		if (isArray(path)) {
			let removed = false
			for (const one of path) {
				if (this.#remove(one)) removed = true
			}
			return removed
		}
		return this.#remove(path)
	}

	clear(): void {
		this.#files.clear()
		// Observe the cleared registry — AFTER the map emptied (no payload — a pure signal).
		this.#emitter.emit('clear')
	}

	snapshot(): WorkspaceSnapshot {
		// The container serializes ITSELF: its id + a flat list of its (already-frozen, plain) Files.
		// A File carries its own `path`, so the flat list reconstructs the path-keyed map on hydrate
		// (the WorkspaceManager seeds a fresh Workspace from `snapshot.files`); pure JSON, mutates nothing.
		return { id: this.#id, files: this.files() }
	}

	// Mint a whole-file replacement, store it by path, and emit `write` AFTER the mutation.
	// The state transitions to 'modified' over an existing path, else 'created'; a text
	// file's language is preserved, else inferred from the path. A string write onto a
	// binary path retypes it to text (a deliberate replacement).
	#write(path: string, content: string): void {
		const existing = this.#files.get(path)
		const language =
			existing && isText(existing.content) ? existing.content.language : inferLanguage(path)
		const file = createFile({
			path,
			content: { text: content, language },
			state: existing ? 'modified' : 'created',
		})
		this.#files.set(path, file)
		this.#emitter.emit('write', file)
	}

	// Splice a Range of an existing text file. The path MUST exist and be text (else
	// MODALITY); the range must be structurally valid (else RANGE). Mints a 'modified'
	// replacement and emits `write` AFTER the mutation.
	#splice(path: string, content: string, range: Range): void {
		const existing = this.#files.get(path)
		if (!existing || !isText(existing.content)) {
			throw new WorkspaceError('MODALITY', `Cannot splice a range of a non-text file: ${path}`, {
				path,
			})
		}
		if (!isValidRange(range)) {
			throw new WorkspaceError('RANGE', `Invalid range for file: ${path}`, { path, range })
		}
		const file = createFile({
			path,
			content: {
				text: spliceRange(existing.content.text, range, content),
				language: existing.content.language,
			},
			state: 'modified',
		})
		this.#files.set(path, file)
		this.#emitter.emit('write', file)
	}

	// Prepend text, creating the file on an absent path (missing treated as empty). A
	// prepend onto a binary file is a text-only op (MODALITY). Routes through `#write` so
	// the state transition + single `write` event fire once.
	#prepend(path: string, content: string): void {
		this.#write(path, content + this.#text(path, 'prepend'))
	}

	// Append text, creating the file on an absent path. A append onto a binary file is a
	// text-only op (MODALITY). Routes through `#write` (one state transition + event).
	#append(path: string, content: string): void {
		this.#write(path, this.#text(path, 'append') + content)
	}

	// The existing text of a path for a text-edit (prepend / append) — '' when absent
	// (create-on-absent), throwing MODALITY when the path holds a binary file.
	#text(path: string, operation: string): string {
		const existing = this.#files.get(path)
		if (!existing) return ''
		if (!isText(existing.content)) {
			throw new WorkspaceError('MODALITY', `Cannot ${operation} text to a binary file: ${path}`, {
				path,
			})
		}
		return existing.content.text
	}

	// Re-key one file: absent `from` → false. Else mint a re-keyed 'modified' replacement
	// (the path is identity), delete `from`, set `to` (OVERWRITING an occupied target —
	// last write wins), and emit `move` AFTER the mutation.
	#move(from: string, to: string): boolean {
		const file = this.#files.get(from)
		if (!file) return false
		const moved = createFile({ path: to, content: file.content, state: 'modified' })
		this.#files.delete(from)
		this.#files.set(to, moved)
		this.#emitter.emit('move', { from, to })
		return true
	}

	// Delete one file, emitting `remove` only when one was actually dropped — AFTER the
	// deletion (an in-memory drop, no tombstone).
	#remove(path: string): boolean {
		const removed = this.#files.delete(path)
		if (removed) this.#emitter.emit('remove', path)
		return removed
	}

	// Build the search / replace RegExp from the query + options: a literal substring
	// (escaped) unless `regex`, case-insensitive unless `exact`, always global so every
	// occurrence on a line is found. An invalid user pattern is the PATTERN throw.
	#pattern(query: string, options?: SearchOptions | ReplaceOptions): RegExp {
		const source = options?.regex === true ? query : escapeRegExp(query)
		const flags = options?.exact === false ? 'gi' : 'g'
		try {
			return new RegExp(source, flags)
		} catch {
			throw new WorkspaceError('PATTERN', `Invalid search pattern: ${query}`, { query })
		}
	}
}
