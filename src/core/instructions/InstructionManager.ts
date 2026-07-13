import type { EmitterInterface } from '../../emitters/types.js'
import type {
	ContextSectionFormat,
	InstructionInput,
	InstructionInterface,
	InstructionManagerEventMap,
	InstructionManagerInterface,
	InstructionManagerOptions,
} from '../types.js'
import { isArray } from '../../contracts/index.js'
import { Emitter } from '../../emitters/Emitter.js'
import { Instruction } from './Instruction.js'

/**
 * The instruction registry a richer context assembles a directives block from —
 * immutable {@link Instruction}s keyed by `name`, listed by descending `priority`.
 *
 * @remarks
 * - **Registry.** Instructions live in an insertion-ordered `Map` keyed by `name`;
 *   `add` takes one {@link InstructionInput} or a batch (§9.2), MINTS each instruction's
 *   `id`, and a re-`add` of the same name OVERWRITES it (last write wins). `count` is the
 *   map size, `instruction(name)` looks one up, and `instructions()` lists them SORTED by
 *   descending `priority` (a stable sort, so equal priorities keep insertion order).
 * - **Build contract (with the manager-options override).** `description` is the section
 *   header a context renders the instructions under; `format(instruction)` renders one
 *   instruction (its `content`). Each ENCAPSULATES the cascade's `[options-override →
 *   built-in]` half: when `InstructionManagerOptions.format` supplies an `open` /
 *   `render`, `description` / `format` return IT, else the built-in — so a richer context
 *   reads one consistent pair and layers the provider default + per-item override on top
 *   (see {@link import('../AgentContext.js').AgentContext}). The per-item
 *   {@link InstructionInput.format} is round-tripped onto the stored instruction.
 * - **Removal.** `remove` drops one by name, or a batch (§9.2) — `true` when any was
 *   removed; `clear` empties the registry.
 * - **Observable (§13).** The owned {@link emitter} ({@link InstructionManagerEventMap})
 *   carries `add` (the created instruction) / `remove` (the name) / `clear` for
 *   fire-and-forget observers. Every event is emitted directly, strictly AFTER the map
 *   mutation completes; the emitter isolates a listener throw and routes it to its `error`
 *   handler (the `error` option), so a buggy observer can never corrupt a mutation.
 *
 * @example
 * ```ts
 * const manager = new InstructionManager()
 * manager.add([
 * 	{ name: 'tone', content: 'Be concise.', priority: 1 },
 * 	{ name: 'safety', content: 'Refuse unsafe requests.', priority: 10 },
 * ])
 * manager.instructions().map((one) => one.name) // ['safety', 'tone'] — highest priority first
 * ```
 */
export class InstructionManager implements InstructionManagerInterface {
	readonly #instructions = new Map<string, InstructionInterface>()
	// The PUSH observation surface (§13) — owned, never inherited. The emitter isolates a
	// listener throw (routing it to the `error` handler), so it can never escape into a mutation.
	readonly #emitter: Emitter<InstructionManagerEventMap>
	// The MANAGER-OPTIONS level of the build cascade — consulted FIRST by `description` /
	// `format` (falling back to the built-in), so this manager encapsulates the
	// `[options-override → built-in]` half and a context layers the rest on top.
	readonly #format: ContextSectionFormat<InstructionInterface> | undefined

	constructor(options?: InstructionManagerOptions) {
		this.#emitter = new Emitter<InstructionManagerEventMap>({
			on: options?.on,
			error: options?.error,
		})
		this.#format = options?.format
	}

	get emitter(): EmitterInterface<InstructionManagerEventMap> {
		return this.#emitter
	}

	get count(): number {
		return this.#instructions.size
	}

	get description(): string {
		// Manager-options override first, else the built-in header.
		return this.#format?.open ?? '## Instructions'
	}

	get framing(): ContextSectionFormat<InstructionInterface> | undefined {
		// The raw override — so a context's `build()` can interleave the provider default
		// beneath it (this getter / `description` / `format` encapsulate override→built-in).
		return this.#format
	}

	add(input: InstructionInput): InstructionInterface
	add(inputs: readonly InstructionInput[]): readonly InstructionInterface[]
	add(
		input: InstructionInput | readonly InstructionInput[],
	): InstructionInterface | readonly InstructionInterface[] {
		if (isArray(input)) return input.map((one) => this.#create(one))
		return this.#create(input)
	}

	instruction(name: string): InstructionInterface | undefined {
		return this.#instructions.get(name)
	}

	instructions(): readonly InstructionInterface[] {
		// A stable descending-priority sort — Array.prototype.sort is stable, so equal
		// priorities keep their insertion order (the map's iteration order).
		return [...this.#instructions.values()].sort((a, b) => b.priority - a.priority)
	}

	format(instruction: InstructionInterface): string {
		// Manager-options override first, else the built-in (its `content`).
		return this.#format?.render?.(instruction) ?? instruction.content
	}

	remove(name: string): boolean
	remove(names: readonly string[]): boolean
	remove(names: string | readonly string[]): boolean {
		if (isArray(names)) {
			let removed = false
			for (const name of names) {
				if (this.#delete(name)) removed = true
			}
			return removed
		}
		return this.#delete(names)
	}

	clear(): void {
		this.#instructions.clear()
		// Observe the cleared registry — AFTER the map emptied, so a swallowed listener
		// throw can never alter the clear (no payload — `clear` is a pure signal).
		this.#emitter.emit('clear')
	}

	// Mint an immutable instruction, store it by name (overwriting a same-name one), and
	// emit `add` AFTER the map mutation — so a swallowed listener throw can't perturb it.
	#create(input: InstructionInput): InstructionInterface {
		const instruction = new Instruction(input)
		this.#instructions.set(instruction.name, instruction)
		this.#emitter.emit('add', instruction)
		return instruction
	}

	// Delete one instruction, emitting `remove` only when one was actually removed (a
	// delete of an absent name returns `false` and emits nothing) — AFTER the deletion.
	#delete(name: string): boolean {
		const removed = this.#instructions.delete(name)
		if (removed) this.#emitter.emit('remove', name)
		return removed
	}
}
