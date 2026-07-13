import type {
	ToolCall,
	ToolDefinition,
	ToolInterface,
	ToolManagerInterface,
	ToolResult,
} from '../types.js'
import { isArray } from '../../contracts/index.js'

/**
 * The tool registry the agent loop dispatches model tool-calls through — resolves
 * names, lists {@link ToolDefinition}s for the provider, and executes calls with
 * per-call error isolation.
 *
 * @remarks
 * - **Registry.** Tools live in an insertion-ordered `Map` keyed by `tool.name`;
 *   `add` takes one or a batch (§9.2) and a re-`add` of the same name OVERWRITES it
 *   (last write wins). `count` is the map size, `tool(name)` looks one up, `tools()`
 *   lists them in insertion order, and `definitions()` maps each to a plain
 *   {@link ToolDefinition} (`name` / `description?` / `parameters?`, the `execute`
 *   handler stripped) — exactly what a provider advertises to the model.
 * - **Per-call error isolation (the load-bearing part).** `execute` resolves a
 *   {@link ToolCall}'s tool by name and ALWAYS resolves a {@link ToolResult}: an
 *   unknown name → `{ id, name, error: 'tool not found: <name>' }`; a successful run →
 *   `{ id, name, value }`; a handler throw is CAUGHT into `{ id, name, error }` (an
 *   `Error`'s message, else the stringified throw). A tool throw never escapes — it
 *   becomes a result the model can react to.
 * - **Batch never fails as a whole.** `execute(calls)` runs every call via
 *   `Promise.all(calls.map(...))` and resolves the results correlated by `id` in the
 *   input order — a mix of success, throw, and not-found all resolve; one bad call
 *   does not reject the batch.
 * - **Event-free.** A purely functional registry — no Emitter, no events.
 *
 * @example
 * ```ts
 * const manager = new ToolManager()
 * manager.add(new Tool({ name: 'add', execute: (a) => Number(a.x) + Number(a.y) }))
 * const result = await manager.execute({ id: '1', name: 'add', arguments: { x: 1, y: 2 } })
 * result.value // 3
 * ```
 */
export class ToolManager implements ToolManagerInterface {
	readonly #tools = new Map<string, ToolInterface>()

	get count(): number {
		return this.#tools.size
	}

	add(tool: ToolInterface): void
	add(tools: readonly ToolInterface[]): void
	add(tools: ToolInterface | readonly ToolInterface[]): void {
		if (isArray(tools)) {
			for (const tool of tools) this.#tools.set(tool.name, tool)
			return
		}
		this.#tools.set(tools.name, tools)
	}

	tool(name: string): ToolInterface | undefined {
		return this.#tools.get(name)
	}

	tools(): readonly ToolInterface[] {
		return [...this.#tools.values()]
	}

	definitions(): readonly ToolDefinition[] {
		return [...this.#tools.values()].map((tool) => this.#definition(tool))
	}

	execute(call: ToolCall): Promise<ToolResult>
	execute(calls: readonly ToolCall[]): Promise<readonly ToolResult[]>
	execute(call: ToolCall | readonly ToolCall[]): Promise<ToolResult | readonly ToolResult[]> {
		// The batch form runs every call concurrently and resolves results correlated by
		// id in order — one bad call (throw / not-found) never fails the whole batch.
		if (isArray(call)) return Promise.all(call.map((one) => this.#run(one)))
		return this.#run(call)
	}

	remove(name: string): boolean
	remove(names: readonly string[]): boolean
	remove(names: string | readonly string[]): boolean {
		if (isArray(names)) {
			let removed = false
			for (const name of names) {
				if (this.#tools.delete(name)) removed = true
			}
			return removed
		}
		return this.#tools.delete(names)
	}

	clear(): void {
		this.#tools.clear()
	}

	// Run one call with per-call error isolation: an unknown name → a not-found error
	// result; a handler throw → an error result (never re-thrown). The tool throw is
	// turned into a ToolResult the model can react to.
	async #run(call: ToolCall): Promise<ToolResult> {
		const tool = this.#tools.get(call.name)
		if (tool === undefined)
			return { id: call.id, name: call.name, error: `tool not found: ${call.name}` }
		try {
			const value = await tool.execute(call.arguments)
			return { id: call.id, name: call.name, value }
		} catch (error) {
			return {
				id: call.id,
				name: call.name,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	}

	// Strip a tool to the plain ToolDefinition a provider advertises — the schema the
	// model sees (name / description? / parameters?), without the execute handler.
	#definition(tool: ToolInterface): ToolDefinition {
		const definition: {
			name: string
			description?: string
			parameters?: Readonly<Record<string, unknown>>
		} = {
			name: tool.name,
		}
		if (tool.description !== undefined) definition.description = tool.description
		if (tool.parameters !== undefined) definition.parameters = tool.parameters
		return definition
	}
}
