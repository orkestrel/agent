import type {
	AgentContextInterface,
	AgentContextOptions,
	ContextBuildOptions,
	InstructionManagerInterface,
	MemoManagerInterface,
	ScopeInterface,
	Selection,
	SelectionHandler,
	SkillManagerInterface,
} from './types.js'
import type { ConversationInterface, ConversationManagerInterface } from '../conversations/index.js'
import type { Message } from '../types.js'
import type { ToolManagerInterface } from '@orkestrel/tool'
import type { WorkspaceManagerInterface } from '@orkestrel/workspace'
import { ToolManager } from '@orkestrel/tool'
import { isTextContent, WorkspaceManager } from '@orkestrel/workspace'
import { InstructionManager } from './instructions/InstructionManager.js'
import { MemoManager } from './memos/MemoManager.js'
import { SkillManager } from './skills/SkillManager.js'
import { ConversationError, ConversationManager } from '../conversations/index.js'
import { CONVERSATION_ROLES } from '../constants.js'
import { filterAllowList } from '../helpers.js'
import {
	attachUserImages,
	collectImageData,
	intersectFilters,
	renderFencedFile,
	renderIndexLine,
	renderSection,
	renderSkillBody,
} from './helpers.js'
import {
	LOADED_SECTION_HEADER,
	WORKSPACE_INDEX_HEADER,
	WORKSPACE_SECTION_HEADER,
} from './constants.js'

/**
 * Assembles a provider request from the richer turn context — the optional system prompt, the
 * observable context managers (instructions / skills / memos / workspaces), the
 * {@link ConversationManagerInterface} message source whose active conversation is `messages`, the
 * {@link ToolManagerInterface} registry, and an active {@link ScopeInterface} changed through
 * {@link AgentContextInterface.apply}. `build()` folds the system prompt, the scoped instructions,
 * the skills index, and the shown skills' bodies into one system message, the memos index and the
 * rendered workspace's text into one `user` context message after it, then the conversation, and
 * never reads `tools`.
 *
 * @remarks
 * - **Composition.** `system` is the optional system prompt; `instructions` / `skills` / `memos` /
 *   `tools` / `workspaces` / `conversations` are the registries passed in `options` (bring your own),
 *   or fresh empty ones when omitted (so `workspaces` is always present); `messages` is the active
 *   conversation's live tail (always defined — see the following item). `scope` is the active filter —
 *   `undefined` (the default) ⇒ no filtering; change it through `apply(scope)`. The structural
 *   `workspaces` / `conversations` registries are fixed at construction; switch their active
 *   members through their own `switch(id)` methods.
 * - **The default conversation — the conversation registry's active conversation.** `conversations`
 *   is a {@link ConversationManagerInterface}. The constructor adds a default conversation when the
 *   manager has no active one, so the dynamic `messages` getter — `this.#conversations.active` — is
 *   always defined. `messages` returns the active conversation itself (it owns the live tail + the
 *   message verbs directly, satisfying
 *   {@link import('../conversations/index.js').MessageManagerInterface} structurally — the same
 *   reference, no duplication), and `build()` with no selection folds that conversation's `view()`
 *   (its per-section summaries + live tail) as the authoritative message inclusion — the scope does
 *   not filter the conversation (it owns inclusion through compaction; scope filters only
 *   instructions / skills / memos / tools / workspace files / workspaces). An agent run binds a conversation at
 *   its call, the active one unless the run names another, and builds through a selection over that
 *   conversation, so `conversations.switch(id)` sets the next run's default at any moment and never
 *   moves a live run; `select(conversation, request, signal)` checks the conversation it is given.
 * - **`build()` — the scoped assembly + the format cascade.** It folds, in order,
 *   the system prompt, the scope-filtered instructions (a block: the section's `open` text,
 *   each item's rendering, then any `close` text), then the scope-filtered skills index (a block
 *   whose entries join with a single newline), then the shown skills' bodies, into one leading
 *   `system` message (prepended only when at least one part exists), then the scope-filtered memos
 *   index (the same block), the listed workspace ids, and the rendered workspace's text files into
 *   one `user` context message (present only when one of those sections renders), then
 *   appends the active conversation's `view()` (the conversation owns message inclusion through
 *   compaction — the scope does not filter the conversation). The instruction manager resolves
 *   each `open` / item / `close` most-specific-first: `open` = manager-options-override >
 *   built-in; per item = item-override > manager-options-override > built-in; `close` =
 *   manager-options-override (no built-in ⇒ no closing line when unset) (see
 *   {@link AgentContextInterface.build}). With no override set, each section is its built-in
 *   header + items, no closing line. The rendered workspace's scoped-in image files' `base64` payload is attached to
 *   the last user message (a vision provider reads images off a user turn); when no user message
 *   exists the attachment is skipped. Built fresh each call (recomputed, never cached), so it
 *   always reflects the current managers / messages / scope / workspaces; it never mutates a
 *   manager or the stored messages. `build(selection)` adds at most one `system` message of its own
 *   and reads the selection's messages as conversation parts without a role check; the select path
 *   refuses a selected `system` role as a `'ROLE'` fault over `view()`; a host's direct
 *   `build(selection)` is host-trusted, and a conversation a host implements itself whose `view()`
 *   holds a `system` message is read as host-trusted too.
 * - **The rendered workspace, by carrier — the sole document/image context.**
 *   The rendered workspace has its {@link import('@orkestrel/workspace').FileInterface} values scope-filtered by `scope.files`,
 *   then split: text files fold into a dedicated `## Workspace` section (fenced reference blocks)
 *   in the context message — a `user` message with a minted id, never stored — and image files'
 *   `base64` payload attaches to the last user message of the conversation, never to the context
 *   message. The `system` message holds host-authored text alone: the system prompt, the
 *   instructions, the skills index, and last the bodies of the skills `options.disclosure` shows.
 *   One workspace renders: the one `options.disclosure` selects, else the active one, and only
 *   while the scope's `workspaces` list admits it; with neither, nothing renders for workspaces.
 *   `options.switchable` adds the admitted workspace ids to the context message, after the memos
 *   index. `build()` never moves the active workspace, and it owns this render (a `Workspace` /
 *   `WorkspaceManager` stays file-focused).
 * - **Tools are structural, not in the prompt.** The registry is advertised to the provider
 *   through `tools.definitions()` (scope-filtered by the loop), never serialized into the
 *   message array — so the output of the `build()` method carries no tool content, scoped or not.
 * - **Event-free context; observable managers.** The context itself owns no Emitter; the
 *   context managers each carry their own (the push observation surface).
 *
 * @example
 * ```ts
 * const context = new AgentContext({ system: 'You are concise.' })
 * context.instructions.add({ name: 'tone', content: 'Be terse.' })
 * context.messages.add({ role: 'user', content: 'Hi' })
 * context.build() // [{ role: 'system', content: 'You are concise.\n\n## Instructions\n\nBe terse.' }, { role: 'user', content: 'Hi' }]
 * ```
 */
export class AgentContext implements AgentContextInterface {
	readonly #system: string | undefined
	readonly #instructions: InstructionManagerInterface
	readonly #skills: SkillManagerInterface
	readonly #memos: MemoManagerInterface
	// The workspace registry one of whose workspaces `build()` renders by carrier (text files →
	// the context message, image files → the last user message): the one `disclosure` names, else
	// `active`. Always present (a fresh empty manager when none was supplied). The registry is
	// structural; switch its active workspace through `workspaces.switch(id)`.
	readonly #workspaces: WorkspaceManagerInterface
	// The conversation registry whose active conversation is a run's default: the dynamic `messages`
	// getter returns `#conversations.active`, which the constructor seeds when absent, and `build()`
	// with no selection folds that conversation's `view()`. The registry is structural; switch its
	// active conversation through `conversations.switch(id)`.
	readonly #conversations: ConversationManagerInterface
	readonly #tools: ToolManagerInterface
	// The agent default; the active scope's `select` and a run scope's override it at each `select` call.
	readonly #select: SelectionHandler | undefined
	#scope: ScopeInterface | undefined

	constructor(options?: AgentContextOptions) {
		this.#system = options?.system
		this.#instructions = options?.instructions ?? new InstructionManager()
		this.#skills = options?.skills ?? new SkillManager()
		this.#memos = options?.memos ?? new MemoManager()
		// Default to a fresh empty registry so `context.workspaces` is always present (mirroring
		// the always-present instruction manager); a supplied one is reused.
		this.#workspaces = options?.workspaces ?? new WorkspaceManager()
		// The conversation registry the default conversation flows from — a supplied one is reused,
		// else a fresh empty one. Seed an active conversation so `context.messages` (the active conversation's
		// live tail) is always defined: when the manager has none active, call `add()` for a default
		// (which auto-activates it). NB: `messages` is not captured here — it is computed dynamically
		// (the getter reads `#conversations.active`), so it always tracks the current active
		// conversation's live tail, no duplication.
		this.#conversations = options?.conversations ?? new ConversationManager()
		if (this.#conversations.active === undefined) this.#conversations.add()
		this.#tools = options?.tools ?? new ToolManager()
		this.#select = options?.select
		this.#scope = options?.scope
	}

	get system(): string | undefined {
		return this.#system
	}

	get instructions(): InstructionManagerInterface {
		return this.#instructions
	}

	get skills(): SkillManagerInterface {
		return this.#skills
	}

	get memos(): MemoManagerInterface {
		return this.#memos
	}

	get workspaces(): WorkspaceManagerInterface {
		return this.#workspaces
	}

	// Dynamic — the active conversation itself (it owns its live tail + the message verbs directly,
	// like a `Workspace` owns its files), always defined: the constructor adds a default when the
	// registry has no active conversation. Computed on every read (never captured), so
	// `context.messages` always points at the current active conversation (the same reference — no
	// duplication) and follows a `conversations.switch(id)`. It is the default a run binds, never a
	// live run's target. The `#ensureConversation()` method re-seats a default if a caller's supplied
	// manager was emptied (for example `clear()`), so the getter is total — never undefined.
	get messages(): ConversationInterface {
		return this.#ensureConversation()
	}

	get conversations(): ConversationManagerInterface {
		return this.#conversations
	}

	get tools(): ToolManagerInterface {
		return this.#tools
	}

	get scope(): ScopeInterface | undefined {
		return this.#scope
	}

	apply(scope: ScopeInterface | undefined): void {
		this.#scope = scope
	}

	select(
		conversation: ConversationInterface,
		request: Message,
		signal: AbortSignal,
		scope?: ScopeInterface,
	): Promise<Selection> | undefined {
		// Returning `undefined` synchronously keeps the loop's default path free of an `await`.
		const handler = scope?.select ?? this.#scope?.select ?? this.#select
		if (handler === undefined) return undefined
		return this.#check(handler, conversation, request, signal)
	}

	build(options?: ContextBuildOptions): readonly Message[] {
		// A run scope narrows the active one list by list; each list of each layer is read one time.
		const scope = intersectFilters(this.#scope, options?.scope)
		// Tools reach the provider structurally. Each manager resolves its format cascade.
		const parts: string[] = []
		// Configured by `=== undefined`, not falsiness — an explicitly supplied '' (or a
		// whitespace-only) system is opted in and prepended verbatim; a truthiness check would drop it.
		if (this.#system !== undefined) parts.push(this.#system)
		const instructions = filterAllowList(
			scope.instructions,
			this.#instructions.instructions(),
			(one) => one.name,
		)
		const instructed = renderSection(
			this.#instructions.open,
			instructions,
			(one) => this.#instructions.render(one),
			this.#instructions.close,
		)
		if (instructed !== undefined) parts.push(instructed)
		const skills = filterAllowList(scope.skills, this.#skills.skills(), (one) => one.name)
		const indexed = renderSection(
			this.#skills.open,
			skills.length === 0 ? [] : [skills.map((one) => this.#skills.render(one)).join('\n')],
			(block) => block,
			this.#skills.close,
		)
		if (indexed !== undefined) parts.push(indexed)
		// Shown bodies close the system message: each named skill the ceiling admits and the
		// registry holds, once, in the given order, skipping a blank body.
		const admitted = new Map(skills.map((one) => [one.name, one]))
		const loaded = [...new Set(options?.disclosure?.skills ?? [])].flatMap((name) => {
			const skill = admitted.get(name)
			return skill === undefined || skill.content.trim() === '' ? [] : [skill]
		})
		const bodies = renderSection(LOADED_SECTION_HEADER, loaded, renderSkillBody, undefined)
		if (bodies !== undefined) parts.push(bodies)
		// The shown workspace, else the active one, is the sole document/image context, rendered only
		// while the ceiling admits it. `build()` owns this render because a `Workspace` /
		// `WorkspaceManager` stays file-focused, and it never moves the active workspace.
		const selected = options?.disclosure?.workspace
		const workspace =
			selected === undefined ? this.#workspaces.active : this.#workspaces.workspace(selected)
		const shown = filterAllowList(
			scope.workspaces,
			workspace === undefined ? [] : [workspace],
			(one) => one.id,
		)
		const files = filterAllowList(
			scope.files,
			shown.flatMap((one) => one.files()),
			(one) => one.path,
		)
		const workspaceTexts = files.flatMap((file) =>
			isTextContent(file.content)
				? [{ path: file.path, language: file.content.language, text: file.content.text }]
				: [],
		)
		const documented = renderSection(
			WORKSPACE_SECTION_HEADER,
			workspaceTexts,
			(file) => renderFencedFile(file.path, file.language, file.text),
			undefined,
		)
		const memos = filterAllowList(scope.memos, this.#memos.memos(), (one) => one.name)
		const remembered = renderSection(
			this.#memos.open,
			memos.length === 0 ? [] : [memos.map((one) => this.#memos.render(one)).join('\n')],
			(block) => block,
			this.#memos.close,
		)
		// With no selection, the active conversation's `view()` is authoritative (the per-section
		// summaries + the live tail) — the conversation owns message inclusion through compaction, so the
		// scope does not filter the conversation here (scope filters only the preceding instructions /
		// skills / memos / tools / workspace files / workspaces). The active conversation is always present (the
		// constructor adds one), with `#ensureConversation()` as a total fallback if a caller emptied its
		// supplied registry.
		const conversation = options?.selection?.messages ?? this.#ensureConversation().view()
		// A vision provider reads image payloads from a user turn.
		const tail = attachUserImages(conversation, collectImageData(files))
		// The admitted ids, only while the run can switch the workspace.
		const switchable =
			options?.switchable === true
				? filterAllowList(scope.workspaces, this.#workspaces.workspaces(), (one) => one.id)
				: []
		const listed = renderSection(
			WORKSPACE_INDEX_HEADER,
			switchable.length === 0 ? [] : [switchable.map((one) => renderIndexLine(one.id)).join('\n')],
			(block) => block,
			undefined,
		)
		const slots = [remembered, listed, documented].filter((slot) => slot !== undefined)
		const context: readonly Message[] =
			slots.length === 0
				? []
				: [{ id: crypto.randomUUID(), role: 'user', content: slots.join('\n\n') }]

		if (parts.length === 0) return [...context, ...tail]
		const system: Message = {
			id: crypto.randomUUID(),
			role: 'system',
			content: parts.join('\n\n'),
		}
		return [system, ...context, ...tail]
	}

	// Another run can append to the conversation while the handler awaits, so the view's ids are
	// recorded before the call (an async body runs synchronously up to its first `await`) and
	// compared after it; a changed view turns the handler's selection into a fault over `view()`.
	// Over an unchanged view, a selected message whose role is not a conversation role does the same.
	async #check(
		handler: SelectionHandler,
		conversation: ConversationInterface,
		request: Message,
		signal: AbortSignal,
	): Promise<Selection> {
		const before = conversation.view().map((message) => message.id)
		const selection = await handler(conversation, request, signal)
		const after = conversation.view()
		if (
			after.length === before.length &&
			after.every((message, index) => message.id === before[index])
		) {
			const refused = selection.messages.find(
				(message) => !CONVERSATION_ROLES.some((role) => role === message.role),
			)
			if (refused === undefined) return selection
			const role =
				typeof refused.role === 'string'
					? JSON.stringify(refused.role.slice(0, 32))
					: typeof refused.role
			const reason = `a selected message role must be one of ${CONVERSATION_ROLES.map((one) => JSON.stringify(one)).join(', ')}; message ${selection.messages.indexOf(refused)} has ${role}`
			return {
				messages: after,
				judgments: selection.judgments,
				...(selection.usage === undefined ? {} : { usage: selection.usage }),
				fault: new ConversationError(
					'ROLE',
					reason,
					selection.fault === undefined ? undefined : { cause: selection.fault },
				),
			}
		}
		const text = `conversation ${conversation.id} changed during selection: ${before.length} messages before, ${after.length} after`
		return {
			messages: after,
			judgments: selection.judgments,
			...(selection.usage === undefined ? {} : { usage: selection.usage }),
			fault:
				selection.fault === undefined
					? new Error(text)
					: new Error(text, { cause: selection.fault }),
		}
	}

	// A supplied registry can be emptied after construction. Re-seat a default so the message
	// source stays defined, preferring the active conversation an add observer may have selected.
	#ensureConversation(): ConversationInterface {
		if (this.#conversations.active !== undefined) return this.#conversations.active
		const conversation = this.#conversations.add()
		return this.#conversations.active ?? conversation
	}
}
