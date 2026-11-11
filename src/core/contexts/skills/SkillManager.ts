import type {
	ContextSectionFormat,
	Skill,
	SkillInput,
	SkillManagerEventMap,
	SkillManagerInterface,
	SkillManagerOptions,
} from '../types.js'
import type { EmitterInterface } from '@orkestrel/emitter'
import { ContractError, isArray, isString, preview } from '@orkestrel/contract'
import { Emitter } from '@orkestrel/emitter'
import { createFile } from '@orkestrel/workspace'
import { removeEntries } from '../../helpers.js'
import { SKILL_SECTION_HEADER } from '../constants.js'
import { renderIndexEntry } from '../helpers.js'

/**
 * Registers the skills a host supplies — instruction bundles keyed by `name`, listed in insertion
 * order, where adding a skill whose name is already stored overwrites it, last write wins —
 * carrying the `open` / `render` / `close` build contract and an observable `emitter`.
 *
 * @remarks
 * - **Registry.** Skills live in an insertion-ordered `Map` keyed by `name`; `add` takes one
 *   {@link SkillInput} or a batch, mints each skill's `id`, and mints each file with `createFile`
 *   from `@orkestrel/workspace`. A same-name `add` replaces the stored skill with a fresh `id` and
 *   keeps the name's position. `count` is the map size, `skill(name)` looks one up, and `skills()`
 *   lists them in insertion order.
 * - **Removal.** `remove` drops one by name, or a batch — `true` only when every supplied name was
 *   removed; `clear` empties the registry.
 * - **Build contract.** `open` returns the options `open`, else `'## Skills'`; `render(skill)`
 *   returns the options `render`, else `- name: description`; `close` returns the options
 *   `close`, else `undefined`.
 * - **Observable.** The owned {@link emitter} ({@link SkillManagerEventMap}) carries `add` (the
 *   created skill) / `remove` (the name) / `clear`, each emitted after the mutation completes; the
 *   emitter isolates a listener throw and routes it to its `error` handler.
 *
 * @example
 * ```ts
 * const skills = new SkillManager()
 * const review = skills.add({
 * 	name: 'review',
 * 	description: 'Reviews a change for defects.',
 * 	content: 'Read the diff, then list each defect with its line.',
 * 	files: [{ path: 'checklist.md', content: { text: '- Tests pass', language: 'markdown' } }],
 * })
 * review.files[0]?.path // 'checklist.md'
 * skills.render(review) // '- review: Reviews a change for defects.'
 * ```
 */
export class SkillManager implements SkillManagerInterface {
	readonly #skills = new Map<string, Skill>()
	// The push observation surface — owned, never inherited. The emitter isolates a
	// listener throw (routing it to the `error` handler), so it can never escape into a mutation.
	readonly #emitter: Emitter<SkillManagerEventMap>
	readonly #format: ContextSectionFormat<Skill> | undefined

	constructor(options?: SkillManagerOptions) {
		this.#emitter = new Emitter<SkillManagerEventMap>(options)
		this.#format = options?.format
	}

	get emitter(): EmitterInterface<SkillManagerEventMap> {
		return this.#emitter
	}

	get count(): number {
		return this.#skills.size
	}

	get open(): string {
		return this.#format?.open ?? SKILL_SECTION_HEADER
	}

	get close(): string | undefined {
		return this.#format?.close
	}

	add(input: SkillInput): Skill
	add(inputs: readonly SkillInput[]): readonly Skill[]
	add(input: SkillInput | readonly SkillInput[]): Skill | readonly Skill[] {
		if (isArray(input)) return input.map((one) => this.#create(one))
		return this.#create(input)
	}

	skill(name: string): Skill | undefined {
		return this.#skills.get(name)
	}

	skills(): readonly Skill[] {
		return [...this.#skills.values()]
	}

	render(skill: Skill): string {
		return this.#format?.render?.(skill) ?? renderIndexEntry(skill)
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
		this.#skills.clear()
		this.#emitter.emit('clear')
	}

	// Mint a skill and its files, store it by name (a same-name one is replaced in place), and emit
	// `add` after the map changed, so a swallowed listener throw can't perturb it. A `tools` member that
	// is neither absent nor an array of strings refuses before anything is stored.
	#create(input: SkillInput): Skill {
		// A JavaScript host can pass anything; a string would mint its characters as tool names. The
		// member is read once and copied densely, so a hole reads as undefined and refuses, and a getter
		// cannot answer the check with one value and the copy with another.
		const given: unknown = input.tools
		const tools: unknown = isArray(given) ? Array.from(given) : given
		if (tools !== undefined && !(isArray(tools) && tools.every(isString))) {
			throw new ContractError('SkillManager: tools must be an array of tool names', {
				code: 'placement',
				context: { path: ['input', 'tools'], limit: 'readonly string[]', received: preview(given) },
			})
		}
		const skill: Skill = {
			id: crypto.randomUUID(),
			name: input.name,
			description: input.description,
			content: input.content,
			files: (input.files ?? []).map((file) => createFile(file)),
			tools: tools === undefined ? [] : tools,
		}
		this.#skills.set(skill.name, skill)
		this.#emitter.emit('add', skill)
		return skill
	}

	// Delete one skill, emitting `remove` only when one was present — after the deletion.
	#delete(name: string): boolean {
		const removed = this.#skills.delete(name)
		if (removed) this.#emitter.emit('remove', name)
		return removed
	}
}
