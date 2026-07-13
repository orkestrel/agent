import type { InstructionInput, InstructionInterface } from '../types.js'

/**
 * An immutable named directive — a {@link InstructionInterface} assembled once from its
 * input (`name` / `content`, an optional `priority` defaulting to `0`), the `id` minted
 * at construction.
 *
 * @remarks
 * A thin immutable value object (mirroring {@link import('../tools/Tool.js').Tool}): the
 * constructor mints a fresh `id` (`crypto.randomUUID()`), copies the input's `name` /
 * `content`, resolves `priority` to the input's value or `0`, and carries the input's
 * per-item `format` override ONLY when supplied (assigned just when present, mirroring a
 * message's `images` / `calls` present-when-given convention — kept absent otherwise).
 * Never mutated after construction. An
 * {@link import('./InstructionManager.js').InstructionManager} keys it by `name` and
 * renders it (highest `priority` first) under its section header.
 *
 * @example
 * ```ts
 * const instruction = new Instruction({ name: 'tone', content: 'Be concise.', priority: 5 })
 * instruction.priority // 5
 * ```
 */
export class Instruction implements InstructionInterface {
	readonly id: string
	readonly name: string
	readonly content: string
	readonly priority: number
	// The per-item format override — the cascade's most-specific level. Assigned ONLY when
	// the input supplied one, so it stays absent (not present-but-undefined) otherwise.
	readonly format?: string

	constructor(input: InstructionInput) {
		this.id = crypto.randomUUID()
		this.name = input.name
		this.content = input.content
		this.priority = input.priority ?? 0
		if (input.format !== undefined) this.format = input.format
	}
}
