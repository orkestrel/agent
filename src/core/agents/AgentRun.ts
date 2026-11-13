import type { AgentBuiltin, AgentCaller } from './types.js'
import type {
	AgentContextInterface,
	AgentDisclosure,
	ScopeFilter,
	ScopeInterface,
	Selection,
} from '../contexts/index.js'
import type { ConversationInterface } from '../conversations/index.js'
import type {
	ToolCall,
	ToolContext,
	ToolDefinition,
	ToolInterface,
	ToolManagerInterface,
	ToolResult,
} from '@orkestrel/tool'
import type { FileInterface, WorkspaceInterface } from '@orkestrel/workspace'
import { isString } from '@orkestrel/contract'
import { createToolManager, ToolError } from '@orkestrel/tool'
import {
	createScope,
	intersectFilters,
	intersectKeys,
	resolveWorkspace,
} from '../contexts/index.js'
import { BUILTIN_NOTES } from './constants.js'
import { createBuiltinTool } from './factories.js'
import {
	collectDisclosure,
	describeCandidates,
	filterAdvertisedTools,
	filterBuiltinCandidates,
	matchesHeadLists,
	matchesPlainLine,
	resolveDisclosure,
} from './helpers.js'
import { filterAllowList } from '../helpers.js'

/**
 * Holds one agent run's own tools and the view its turns and builds share: the ceiling a turn
 * read, what it shows, what it advertises, and what the working head was built with.
 *
 * @remarks
 * `Agent` creates one per run, so no public signature names this class. The run's built-in tools
 * live in a tool manager the run owns and never changes after construction, so a tool a host
 * registers under a built-in's name is never read: `tool` and `execute` answer a built-in's name
 * from the run's manager and every other name from the host's. Each handler reads the ceiling when
 * it runs, the context scope intersected with the run scope at that moment, never a turn's copy.
 * The `caller` each call receives reads the ceiling the same way, as the call starts.
 */
export class AgentRun {
	readonly #context: AgentContextInterface
	readonly #conversation: ConversationInterface
	readonly #scope: ScopeInterface | undefined
	readonly #workspace: string | undefined
	readonly #enabled: readonly AgentBuiltin[]
	readonly #builtins: ReadonlySet<string>
	readonly #tools: ToolManagerInterface
	// The view the last `observe` resolved, read by the turn and by every build until the next one.
	#ceiling: ScopeFilter = {}
	#shown: AgentDisclosure = { skills: [] }
	#ids: readonly string[] = []
	// The files the shown workspace renders under the ceiling's `files` list, compared by identity.
	#files: readonly FileInterface[] = []
	#advertised: readonly ToolDefinition[] = []
	// The run scope's lists as the last `observe` read them, which every build until the next one renders by.
	#snapshot: ScopeInterface | undefined
	// What the working head was built with: the selection it rendered, the length of the built
	// array, and the view of that moment.
	#selection: Selection | undefined
	#length = 0
	#head:
		| {
				readonly ceiling: ScopeFilter
				readonly ids: readonly string[]
				readonly workspace: string | undefined
				readonly switchable: boolean
				readonly files: readonly FileInterface[]
				readonly rendered: WorkspaceInterface | undefined
		  }
		| undefined

	/**
	 * Creates the run's own tools for the enabled built-ins.
	 *
	 * @param context - The agent's context
	 * @param conversation - The conversation the run is bound to
	 * @param scope - The run scope, or `undefined`
	 * @param workspace - The workspace the run renders in place of the active one, already checked, or `undefined`
	 * @param builtins - The enabled built-ins, already checked
	 */
	constructor(
		context: AgentContextInterface,
		conversation: ConversationInterface,
		scope: ScopeInterface | undefined,
		workspace: string | undefined,
		builtins: readonly AgentBuiltin[],
	) {
		this.#context = context
		this.#conversation = conversation
		this.#scope = scope
		this.#workspace = workspace
		this.#enabled = builtins
		this.#builtins = new Set(builtins)
		this.#tools = createToolManager()
		this.#tools.add(
			builtins.map((name) => createBuiltinTool(name, (args) => this.#handle(name, args))),
		)
	}

	/**
	 * Returns the conversation the run is bound to.
	 *
	 * @returns The conversation
	 */
	get conversation(): ConversationInterface {
		return this.#conversation
	}

	/**
	 * Returns the run scope.
	 *
	 * @returns The scope, or undefined when the run has none
	 */
	get scope(): ScopeInterface | undefined {
		return this.#scope
	}

	/**
	 * Returns an owned scope holding the run scope's lists as the last `observe` read them, so a build
	 * renders by the turn's one read and never reads the run scope again.
	 *
	 * @returns The owned scope, or undefined when the run has none
	 */
	get snapshot(): ScopeInterface | undefined {
		return this.#snapshot
	}

	/**
	 * Returns the ceiling the last `observe` read: the context scope intersected with the run scope.
	 *
	 * @returns The ceiling's lists
	 */
	get ceiling(): ScopeFilter {
		return this.#ceiling
	}

	/**
	 * Returns the definitions the last `observe` advertised.
	 *
	 * @returns The advertised definitions
	 */
	get advertised(): readonly ToolDefinition[] {
		return this.#advertised
	}

	/**
	 * Returns what a build renders from the last `observe`: the shown skills and workspace, or
	 * undefined when it shows neither.
	 *
	 * @returns The shown value, or undefined
	 */
	get disclosure(): AgentDisclosure | undefined {
		return this.#shown.skills.length === 0 && this.#shown.workspace === undefined
			? undefined
			: this.#shown
	}

	/**
	 * Returns whether the last `observe` advertised `switch`, which lists the workspaces in the head.
	 *
	 * @returns True if `switch` is advertised; false otherwise
	 */
	get switchable(): boolean {
		return this.#advertised.some((definition) => definition.name === 'switch')
	}

	/**
	 * Returns what a tool call receives as `ToolContext.caller`: the workspace instance the working
	 * head rendered, kept only while the ceiling at this moment admits its id, and that ceiling's
	 * `files` list.
	 *
	 * @remarks
	 * The instance is the one the head's build resolved, never the registry's `active` pointer at the
	 * call, so a host's `switch` made while the provider answers reaches the next turn's head and not
	 * this call. Each read of this getter reads the `workspaces` and `files` lists of the context
	 * scope and the run scope one time each, and no other list, so a call reads them as it starts, a
	 * narrowing made after the turn's decision reaches that call, and a turn still reads its `tools`
	 * list once.
	 *
	 * @returns A fresh caller
	 */
	get caller(): AgentCaller {
		const outer = this.#context.scope
		const inner = this.#scope
		const rendered = this.#head?.rendered
		const [workspace] = filterAllowList(
			intersectKeys(outer?.workspaces, inner?.workspaces),
			rendered === undefined ? [] : [rendered],
			(one) => one.id,
		)
		return { workspace, files: intersectKeys(outer?.files, inner?.files) }
	}

	/**
	 * Returns the selection the working head rendered.
	 *
	 * @returns The selection, or undefined before the first build
	 */
	get selection(): Selection | undefined {
		return this.#selection
	}

	/**
	 * Returns the length of the array the working head was built as.
	 *
	 * @returns The length, 0 before the first build
	 */
	get length(): number {
		return this.#length
	}

	/**
	 * Reads the ceiling, resolves what the run shows within it, and computes what it advertises.
	 *
	 * @remarks
	 * The ceiling's lists are each read one time. The conversation's record is read only while
	 * `load`, `unload`, or `switch` is enabled, and only the records of an enabled built-in count.
	 * Registered skills hold their tools back only while `load` is enabled. The view compared with
	 * the working head's is the ceiling's `instructions`, `skills`, `memos`, `files`, and
	 * `workspaces` lists, the shown skills by id, the shown workspace, the files that workspace
	 * renders under the ceiling's `files` list, compared by identity, and whether `switch` is
	 * advertised. An edit to a rendered file, by a tool or by the host, therefore makes the head
	 * stale, and an edit to a file no build renders does not.
	 *
	 * @returns True if the working head was built with another view and must be rebuilt; false otherwise
	 */
	observe(): boolean {
		// The run scope's lists, each read one time this turn, then intersected with the context scope's.
		const lists = this.#scope === undefined ? undefined : intersectFilters(undefined, this.#scope)
		const ceiling = intersectFilters(this.#context.scope, lists)
		this.#snapshot = lists === undefined ? undefined : createScope({ name: 'run', ...lists })
		const shown = resolveDisclosure(
			this.#context,
			this.#conversation,
			this.#workspace,
			ceiling,
			this.#enabled,
		)
		this.#ceiling = ceiling
		this.#shown = shown
		this.#ids = shown.skills.flatMap((name) => this.#context.skills.skill(name)?.id ?? [])
		this.#files = filterAllowList(
			ceiling.files,
			resolveWorkspace(this.#context.workspaces, shown.workspace, ceiling.workspaces)?.files() ??
				[],
			(file) => file.path,
		)
		this.#advertised = filterAdvertisedTools(
			this.#candidates(ceiling),
			ceiling.tools,
			this.#builtins.has('load') ? this.#context.skills.skills() : [],
			shown.skills,
		)
		const head = this.#head
		return (
			head === undefined ||
			!matchesHeadLists(head.ceiling, ceiling) ||
			head.ids.length !== this.#ids.length ||
			head.ids.some((id, index) => id !== this.#ids[index]) ||
			head.workspace !== shown.workspace ||
			head.switchable !== this.switchable ||
			head.files.length !== this.#files.length ||
			head.files.some((file, index) => file !== this.#files[index])
		)
	}

	/**
	 * Records what the working head was built with: the selection, the built array's length, the
	 * view the last `observe` resolved, and the workspace instance the build rendered.
	 *
	 * @remarks
	 * Call it right after the build: it resolves the rendered workspace from the inputs the build
	 * read, the shown workspace and the context scope's `workspaces` list intersected with the
	 * snapshot's.
	 *
	 * @param selection - The selection the build rendered
	 * @param length - The length of the built array
	 */
	record(selection: Selection, length: number): void {
		this.#selection = selection
		this.#length = length
		this.#head = {
			ceiling: this.#ceiling,
			ids: this.#ids,
			workspace: this.#shown.workspace,
			switchable: this.switchable,
			files: this.#files,
			rendered: resolveWorkspace(
				this.#context.workspaces,
				this.#shown.workspace,
				intersectKeys(this.#context.scope?.workspaces, this.#snapshot?.workspaces),
			),
		}
	}

	/**
	 * Finds the tool a call names: the run's own for a built-in's name, the host's for any other.
	 *
	 * @param name - The tool name
	 * @returns The tool, or undefined when none is registered under the name
	 */
	tool(name: string): ToolInterface | undefined {
		return this.#builtins.has(name) ? this.#tools.tool(name) : this.#context.tools.tool(name)
	}

	/**
	 * Executes one call through the run's manager for a built-in's name, and the host's for any other.
	 *
	 * @param call - The call to execute
	 * @param context - The execution context
	 * @returns The correlated result
	 */
	execute(call: ToolCall, context: ToolContext): Promise<ToolResult> {
		return this.#builtins.has(call.name)
			? this.#tools.execute(call, context)
			: this.#context.tools.execute(call, context)
	}

	// The turn's candidates: the host's definitions without a built-in's name, then the run's own,
	// without `remember` or `switch` while the ceiling's list for it names no key.
	#candidates(ceiling: ScopeFilter): readonly ToolDefinition[] {
		return [
			...this.#context.tools.definitions().filter((one) => !this.#builtins.has(one.name)),
			...filterBuiltinCandidates(this.#tools.definitions(), ceiling),
		]
	}

	// The ceiling at this moment: a narrowing made after the turn's decision refuses the call.
	#live(): ScopeFilter {
		return intersectFilters(this.#context.scope, this.#scope)
	}

	// Runs one built-in's handler; the door already admitted the arguments.
	#handle(name: AgentBuiltin, args: Readonly<Record<string, unknown>>): string {
		switch (name) {
			case 'load':
				return this.#load(args.skill)
			case 'unload':
				return this.#unload(args.skill)
			case 'memo':
				return this.#memo(args.name)
			case 'remember':
				return this.#remember(args.name, args.description, args.content)
			case 'switch':
				return this.#switch(args.workspace)
		}
	}

	#load(skill: unknown): string {
		const admitted = filterAllowList(
			this.#live().skills,
			this.#context.skills.skills(),
			(one) => one.name,
		).map((one) => one.name)
		if (!isString(skill) || !admitted.includes(skill)) {
			throw new ToolError('ARGUMENTS', describeCandidates('skill you can load', admitted))
		}
		return BUILTIN_NOTES.loaded
	}

	#unload(skill: unknown): string {
		const loaded = collectDisclosure(this.#conversation, this.#enabled).skills
		if (!isString(skill) || !loaded.includes(skill)) {
			throw new ToolError('ARGUMENTS', describeCandidates('skill you loaded', loaded))
		}
		return BUILTIN_NOTES.unloaded
	}

	#memo(name: unknown): string {
		const admitted = filterAllowList(
			this.#live().memos,
			this.#context.memos.memos(),
			(one) => one.name,
		)
		const memo = admitted.find((one) => one.name === name)
		if (memo === undefined) {
			throw new ToolError(
				'ARGUMENTS',
				describeCandidates(
					'memo you can read',
					admitted.map((one) => one.name),
				),
			)
		}
		return memo.content
	}

	#remember(name: unknown, description: unknown, content: unknown): string {
		const allowed = this.#live().memos
		if (allowed === undefined || allowed.length === 0) {
			throw new ToolError(
				'ARGUMENTS',
				'No memo can be written here: the host lists no memo name you may write. Continue without saving it.',
			)
		}
		if (!isString(name) || !allowed.includes(name)) {
			throw new ToolError('ARGUMENTS', describeCandidates('memo you may write', allowed))
		}
		if (!isString(description) || !isString(content)) {
			throw new ToolError('ARGUMENTS', 'Send description and content as text.')
		}
		if (!matchesPlainLine(name) || !matchesPlainLine(description)) {
			throw new ToolError(
				'ARGUMENTS',
				'The name and the description must each be one line of visible text, with no line break or control character. Send them again on one line.',
			)
		}
		const current = this.#context.memos.memo(name)
		if (current !== undefined && current.origin?.conversation !== this.#conversation.id) {
			throw new ToolError(
				'ARGUMENTS',
				'A memo with that name exists and this conversation did not write it, so it stays as it is. Read it with memo, or write a name you created.',
			)
		}
		this.#context.memos.add({
			name,
			description,
			content,
			origin: { conversation: this.#conversation.id },
		})
		return BUILTIN_NOTES.remembered
	}

	#switch(workspace: unknown): string {
		const allowed = this.#live().workspaces
		if (allowed === undefined || allowed.length === 0) {
			throw new ToolError(
				'ARGUMENTS',
				'No workspace can be selected here: the host lists no workspace you may select. Continue with the workspace you have.',
			)
		}
		const admitted = filterAllowList(
			allowed,
			this.#context.workspaces.workspaces(),
			(one) => one.id,
		).map((one) => one.id)
		if (!isString(workspace) || !admitted.includes(workspace)) {
			throw new ToolError('ARGUMENTS', describeCandidates('workspace you can select', admitted))
		}
		return BUILTIN_NOTES.switched
	}
}
