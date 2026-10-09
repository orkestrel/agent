import type {
	AgentContextInterface,
	AgentContextOptions,
	InstructionManagerInterface,
	ScopeInterface,
	Selection,
	SelectionHandler,
} from './types.js'
import type {
	ConversationInterface,
	ConversationManagerInterface,
	MessageManagerInterface,
} from '../conversations/index.js'
import type { Message } from '../types.js'
import type { ToolManagerInterface } from '@orkestrel/tool'
import type { WorkspaceManagerInterface } from '@orkestrel/workspace'
import { ToolManager } from '@orkestrel/tool'
import { isText, WorkspaceManager } from '@orkestrel/workspace'
import { InstructionManager } from './instructions/InstructionManager.js'
import { ConversationManager } from '../conversations/index.js'
import { filterAllowList } from '../helpers.js'
import { attachUserImages, collectImageData, renderFencedFile, renderSection } from './helpers.js'
import { WORKSPACE_SECTION_HEADER } from './constants.js'

/**
 * Assembles a provider request from the richer turn context — the optional system prompt, the
 * observable context managers (instructions / workspaces), the
 * {@link ConversationManagerInterface} message source whose active conversation is `messages`, the
 * {@link ToolManagerInterface} registry, and an active {@link ScopeInterface} changed through
 * {@link AgentContextInterface.apply}. `build()` folds the scoped managers and the active
 * workspace into one system block, then the conversation, and never reads `tools`.
 *
 * @remarks
 * - **Composition.** `system` is the optional system prompt; `instructions` / `tools` /
 *   `workspaces` / `conversations` are the registries passed in `options` (bring your own), or
 *   fresh empty ones when omitted (so `workspaces` is always present); `messages` is the active
 *   conversation's live tail (always defined — see the following item). `scope` is the active filter —
 *   `undefined` (the default) ⇒ no filtering; change it through `apply(scope)`. The structural
 *   `workspaces` / `conversations` registries are fixed at construction; switch their active
 *   members through their own `switch(id)` methods.
 * - **The message source — the conversation registry's active conversation.** `conversations` is a
 *   {@link ConversationManagerInterface}. The constructor adds a default conversation when the
 *   manager has no active one, so the dynamic `messages` getter — `this.#conversations.active` — is
 *   always defined. `messages` returns the active conversation itself (it owns the live tail + the
 *   message verbs directly, satisfying {@link MessageManagerInterface} structurally — the same
 *   reference, no duplication), and `build()` folds that conversation's `view()` (its per-section
 *   summaries + live tail) as the authoritative message inclusion — the scope does not filter the
 *   conversation (it owns inclusion through compaction; scope filters only instructions / tools /
 *   workspace files). Because `messages` is read dynamically, an agent switches the active
 *   conversation between runs (`conversations.switch(id)`) to serve many threads (the real
 *   multi-conversation pattern); switch between runs, not during a run, and use separate agents for
 *   concurrent threads.
 * - **`build()` — the scoped assembly + the format cascade.** It folds, in order,
 *   the system prompt then the scope-filtered instructions → the active workspace's text files
 *   (each as a block: the section's `open` text, each item's rendering, then any `close` text)
 *   into one leading `system` message (prepended only when at least one part exists), then
 *   appends the active conversation's `view()` (the conversation owns message inclusion through
 *   compaction — the scope does not filter the conversation). The instruction manager resolves
 *   each `open` / item / `close` most-specific-first: `open` = manager-options-override >
 *   built-in; per item = item-override > manager-options-override > built-in; `close` =
 *   manager-options-override (no built-in ⇒ no closing line when unset) (see
 *   {@link AgentContextInterface.build}). With no override set, each section is its built-in
 *   header + items, no closing line. The active workspace's scoped-in image files' `base64` payload is attached to
 *   the last user message (a vision provider reads images off a user turn); when no user message
 *   exists the attachment is skipped. Built fresh each call (recomputed, never cached), so it
 *   always reflects the current managers / messages / scope / active workspace; it never mutates a
 *   manager or the stored messages.
 * - **The active workspace, rendered by carrier — the sole document/image context.**
 *   `workspaces.active` (when set) has its {@link import('@orkestrel/workspace').FileInterface}s scope-filtered by `scope.files`,
 *   then split: text files fold into a dedicated `## Workspace` system section (fenced reference
 *   blocks — placed right after the instructions section), and image files' `base64` payload attaches
 *   to the last user message. Active-only — never the other registered workspaces; with no active
 *   workspace nothing renders for workspaces. `build()` owns this render (a `Workspace` /
 *   `WorkspaceManager` stays file-focused).
 * - **Tools are structural, not in the prompt.** The registry is advertised to the provider
 *   through `tools.definitions()` (scope-filtered by the loop), never serialized into the
 *   message array — so `build()`'s output carries no tool content, scoped or not.
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
	// The workspace registry whose active workspace `build()` renders by carrier (text files →
	// the system block, image files → the last user message). Always present (a fresh empty
	// manager when none was supplied). The registry is structural; switch its active workspace
	// through `workspaces.switch(id)`. `build()` reads `active` / its `files()` fresh each call.
	readonly #workspaces: WorkspaceManagerInterface
	// The conversation registry whose active conversation is the message source: the dynamic
	// `messages` getter returns `#conversations.active`, which the constructor seeds when absent, and
	// `build()` folds that conversation's `view()`. The registry is structural; switch its active
	// conversation through `conversations.switch(id)`.
	readonly #conversations: ConversationManagerInterface
	readonly #tools: ToolManagerInterface
	// The agent default; the active scope's `select` overrides it at each `select` call.
	readonly #select: SelectionHandler | undefined
	#scope: ScopeInterface | undefined

	constructor(options?: AgentContextOptions) {
		this.#system = options?.system
		this.#instructions = options?.instructions ?? new InstructionManager()
		// Default to a fresh empty registry so `context.workspaces` is always present (mirroring
		// the always-present instruction manager); a supplied one is reused. The active workspace
		// is the sole document/image context.
		this.#workspaces = options?.workspaces ?? new WorkspaceManager()
		// The conversation registry the message source flows from — a supplied one is reused, else a
		// fresh empty one. Seed an active conversation so `context.messages` (the active conversation's
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

	get workspaces(): WorkspaceManagerInterface {
		return this.#workspaces
	}

	// Dynamic — the active conversation itself (it owns its live tail + the message verbs directly,
	// like a `Workspace` owns its files), always defined: the constructor adds a default when the
	// registry has no active conversation. Computed on every read (never captured), so
	// `context.messages` always points at the current active conversation (the same reference — no
	// duplication) and follows a `conversations.switch(id)`. The active `Conversation` satisfies the
	// message-verb contract directly, so this stays a `MessageManagerInterface`. The `??
	// this.#ensure()` fallback re-seats a default if a caller's supplied manager was emptied (for
	// example `clear()`), so the getter is total — never undefined.
	get messages(): MessageManagerInterface {
		return this.#conversations.active ?? this.#ensure()
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

	select(request: Message, signal: AbortSignal): Promise<Selection> | undefined {
		// Returning `undefined` synchronously keeps the loop's default path free of an `await`.
		const handler = this.#scope?.select ?? this.#select
		if (handler === undefined) return undefined
		return this.#check(handler, this.#conversations.active ?? this.#ensure(), request, signal)
	}

	build(selection?: Selection): readonly Message[] {
		const scope = this.#scope
		// 1–2. Assemble the system block parts: the prompt, then each scoped manager's
		// section (its `open` + each item's rendering + any `close`) when it has any scoped-in
		// items. Tools are not folded in — they reach the provider structurally. The manager
		// resolves every slot of the format cascade, so this reads its `open`, `render`, and
		// `close` as given.
		const parts: string[] = []
		// Configured by `=== undefined`, not falsiness — an explicitly supplied '' (or a
		// whitespace-only) system is opted in and prepended verbatim; a truthiness check would drop it.
		if (this.#system !== undefined) parts.push(this.#system)
		const instructions = filterAllowList(
			scope?.instructions,
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
		// The active workspace's files, rendered by carrier — the sole document/image context.
		// Filter `active.files()` by `scope.files`, then split: text files fold into the
		// `## Workspace` system section (fenced reference blocks, the `renderFencedFile` framing — placed
		// right after the instructions section, grouping the in-prompt text content), image files'
		// `base64` payload attaches to the last user message (collected below, fed to
		// `attachUserImages`). `build()` owns this render — a `Workspace` / `WorkspaceManager` stays
		// file-focused (no `open` / `format` getters). No active workspace ⇒ nothing renders
		// (active-only).
		const files = filterAllowList(
			scope?.files,
			this.#workspaces.active?.files() ?? [],
			(one) => one.path,
		)
		const workspaceTexts = files.filter((file) => isText(file.content))
		// The text files have no format-cascade level of their own (they are not a manager) — the
		// header is the fixed `WORKSPACE_SECTION_HEADER` and each item renders through `renderFencedFile`
		// off its own text arm (`{ text, language }`), narrowed by `isText` (a total guard, never an
		// assertion; the preceding pre-filter means the defensive arm is never reached). An empty set
		// contributes nothing (`renderSection` returns `undefined`).
		const documented = renderSection(
			WORKSPACE_SECTION_HEADER,
			workspaceTexts,
			(file) =>
				isText(file.content)
					? renderFencedFile(file.path, file.content.language, file.content.text)
					: renderFencedFile(file.path, 'text', ''),
			undefined,
		)
		if (documented !== undefined) parts.push(documented)

		// 4. The conversation. The active conversation's `view()` is authoritative (the per-section
		// summaries + the live tail) — the conversation owns message inclusion through compaction, so the
		// scope does not filter the conversation here (scope filters only the preceding instructions /
		// tools / workspace files). The active conversation is always present (the constructor adds
		// one), with `#ensure()` as a total fallback if a caller emptied its supplied registry.
		const conversation =
			selection?.messages ?? (this.#conversations.active ?? this.#ensure()).view()
		// 5. Attach the active workspace's scoped-in image files' `base64` payload to the last user
		// message (a vision provider reads images off a user turn) — the active workspace is the
		// sole image source. Skipped when there is none. (Applies to the conversation's view too.)
		const tail = attachUserImages(conversation, collectImageData(files))

		// A faulted selection's messages are `view()`, so the plan its briefing rested on is void.
		if (
			selection !== undefined &&
			selection.fault === undefined &&
			selection.briefing !== undefined &&
			selection.briefing !== ''
		) {
			parts.push(selection.briefing)
		}

		// 3. Prepend one assembled system message only when some part exists.
		if (parts.length === 0) return tail
		const system: Message = {
			id: crypto.randomUUID(),
			role: 'system',
			content: parts.join('\n\n'),
		}
		return [system, ...tail]
	}

	// Another run can append to the conversation while the handler awaits, so the view's ids are
	// recorded before the call (an async body runs synchronously up to its first `await`) and
	// compared after it; a changed view turns the handler's selection into a fault over `view()`.
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
			return selection
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

	// The total fallback that keeps `messages` / `build()` defined even if a caller's supplied
	// conversation registry was emptied after construction (for example `conversations.clear()`): `add()` a
	// default (auto-activating it when the registry is empty) and return it. Returns the
	// `ConversationInterface` (which satisfies `MessageManagerInterface` structurally for the
	// `messages` getter and carries `view()` for `build()`). Normally never reached — the constructor
	// already seeds an active conversation.
	#ensure(): ConversationInterface {
		const conversation = this.#conversations.add()
		return this.#conversations.active ?? conversation
	}
}
