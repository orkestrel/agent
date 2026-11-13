import type { InstructionInput, InstructionInterface } from '../types.js'
import { instructionInputContract } from '../contracts.js'
import { requireRecordInput } from '../helpers.js'

/**
 * Represents an immutable named directive — an {@link InstructionInterface} assembled once from
 * its input (`name` / `content` and an optional `priority`), the `id` minted at
 * construction. Default: `0` for `priority`.
 *
 * @remarks
 * A thin immutable value object (mirroring {@link import('@orkestrel/tool').Tool}): the
 * constructor mints a fresh `id` (`crypto.randomUUID()`), copies the input's `name` /
 * `content`, resolves `priority` to the input's value or `0`, and carries the input's
 * per-item `override` value when supplied; otherwise the instance owns no `override` member, so
 * its own keys and a JSON copy carry no member holding `undefined`. The input meets its exact
 * contract first, so a missing required member, an undeclared member, and a declared member holding
 * `undefined` refuse with a `ContractError` coded `'structure'`. Never mutated after construction. An
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
	// Declared without a field initializer, so the property exists only when the constructor assigns it.
	declare readonly override?: string

	constructor(input: InstructionInput) {
		requireRecordInput(input, instructionInputContract, 'Instruction', 'InstructionInput')
		this.id = crypto.randomUUID()
		this.name = input.name
		this.content = input.content
		this.priority = input.priority ?? 0
		if (input.override !== undefined) this.override = input.override
	}
}
