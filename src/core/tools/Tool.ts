import type { ToolInterface, ToolOptions } from '../types.js'

/**
 * A registered tool — its {@link import('../types.js').ToolDefinition} schema (the
 * `name` / `description` / `parameters` the model sees) bound to the `execute`
 * handler that runs a call.
 *
 * @remarks
 * A thin value object: the constructor stores the schema fields and the handler, and
 * `execute` delegates to the handler verbatim. `parameters` is kept by reference (the
 * open JSON-Schema the provider forwards as-is) — not cloned. The handler's `args` is
 * the model-supplied `unknown` arguments record, narrowed inside the handler (§14);
 * isolating a throw is the {@link ToolManager}'s job, not this class's. Event-free —
 * no Emitter, no events.
 *
 * @example
 * ```ts
 * const tool = new Tool({
 * 	name: 'add',
 * 	description: 'Add two numbers',
 * 	parameters: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } } },
 * 	execute: (args) => Number(args.a) + Number(args.b),
 * })
 * ```
 */
export class Tool implements ToolInterface {
	readonly name: string
	readonly description?: string
	readonly summary?: string
	readonly parameters?: Readonly<Record<string, unknown>>
	readonly #execute: (args: Readonly<Record<string, unknown>>) => Promise<unknown> | unknown

	constructor(options: ToolOptions) {
		this.name = options.name
		this.description = options.description
		this.summary = options.summary
		this.parameters = options.parameters
		this.#execute = options.execute
	}

	execute(args: Readonly<Record<string, unknown>>): Promise<unknown> | unknown {
		return this.#execute(args)
	}
}
