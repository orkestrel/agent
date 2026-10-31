# Context design

`AgentContext` gains two libraries, memos and skills, that reach the prompt as short indexes with bodies loaded on demand. This design covers their shapes, managers, stores, tools, the context wiring, the ledger wiring, and the Authority shape that waits for its consumer. Source locations name a symbol and its file as of `1e82d145`. The noun `Memo` is the default under O4 and Q1.

## Vocabulary

| Term | Meaning |
| --- | --- |
| memo | one durable, cross-conversation fact with a one-line description |
| skill | one on-demand instruction bundle with a description and files |
| supersede | a later entry replaces an earlier one under one key, and the earlier one stays readable: ledger pairs (`supersedes`), memos (same-name `add`), instructions and skills (same-name `add`) |
| literal | an id-shaped token or a number copied verbatim from text (`designs/compaction.md` § Literal vocabulary) |

`Memo` and not `Memory`: across the fleet the `Memory` prefix names the in-process store (`MemoryConversationStore`, `createMemoryWorkspaceStore`), so an entity named `Memory` forces `MemoryMemoryStore`.

## AgentContext

```ts
export interface AgentContextInterface {
	readonly system: string | undefined
	readonly instructions: InstructionManagerInterface
	readonly skills: SkillManagerInterface // always present, empty when not supplied
	readonly memos: MemoManagerInterface // always present, empty when not supplied
	readonly workspaces: WorkspaceManagerInterface
	readonly messages: MessageManagerInterface
	readonly conversations: ConversationManagerInterface
	readonly tools: ToolManagerInterface
	readonly scope: ScopeInterface | undefined
	apply(scope: ScopeInterface | undefined): void
	select(request: Message, signal: AbortSignal): Promise<Selection> | undefined
	build(selection?: Selection): readonly Message[]
}

export interface AgentContextOptions {
	// existing members unchanged
	readonly skills?: SkillManagerInterface
	readonly memos?: MemoManagerInterface
}

export interface ScopeFilter {
	// instructions, tools, files unchanged
	/** Lists the allowed skill names (`undefined` passes all, `[]` passes none, otherwise only the listed). */
	readonly skills?: readonly string[]
	/** Lists the allowed memo names (`undefined` passes all, `[]` passes none, otherwise only the listed). */
	readonly memos?: readonly string[]
}
```

- `AgentOptions` forwards `skills` and `memos` the way it forwards `instructions` and `workspaces`.
- The context stays event-free.
- Order the head from stable to volatile: `system`, instructions, skills index, memos index, workspace text, then the briefing. When rc-a6 promotes, the briefing leaves the head and `Selection.briefing` is deleted (`designs/records.md` § Briefing placement).
- Pin memos-before-workspace with a test; a memo write invalidates the cached workspace text after it, and the other order invalidates memos on every file write. A reading of invalidation counts on the `studies/context` mechanism study can reopen the order.
- Each section uses the `renderSection(open, items, render, close)` cascade; each manager carries its own `open`, `render`, and `close` with a `ContextSectionFormat<T>` override, as `InstructionManager` does. An empty manager renders no header.
- An index line renders as `- name: description` through one shared `renderIndexEntry` in `src/core/contexts/helpers.ts`. The default headers are `## Skills` and `## Memos`.
- Memo and skill index sizes are the host's scope choice, never a shared ceiling; the window stays the only context stop (`tenets.md` § Scope).

## Memos

A memo is authored on purpose, by the model through a tool or by the application. It lives across conversations, and its truth is its most recent revision.

```ts
/** Holds one memo revision: a durable fact kept across conversations. */
export interface Memo {
	readonly id: string // minted per revision
	readonly name: string // stable key; a same-name add supersedes
	readonly description: string // the one-line index entry
	readonly content: string // the body: the fact, why it holds, how to apply it
	readonly time: number // Date.now() at add, as Judgment.time
	readonly origin?: MemoOrigin
}

export interface MemoOrigin {
	readonly conversation: string
	readonly message?: string
}

export interface MemoInput {
	readonly name: string
	readonly description: string
	readonly content: string
	readonly origin?: MemoOrigin
}

/** Holds every revision of a memo set, oldest first; the current memo of a name is its last revision. */
export interface MemoSnapshot {
	readonly id: string
	readonly memos: readonly Memo[]
}

export type MemoManagerEventMap = {
	readonly add: readonly [memo: Memo]
	readonly remove: readonly [name: string]
	readonly clear: readonly []
}

export interface MemoManagerOptions {
	readonly id?: string // the memo set's identity, for example a user or a project the host chooses
	readonly on?: EmitterHooks<MemoManagerEventMap>
	readonly error?: EmitterErrorHandler
	readonly format?: ContextSectionFormat<Memo>
	readonly snapshot?: MemoSnapshot
}

export interface MemoManagerInterface {
	readonly id: string
	readonly emitter: EmitterInterface<MemoManagerEventMap>
	readonly count: number
	readonly open: string // built-in '## Memos'
	readonly close: string | undefined
	add(input: MemoInput): Memo
	add(inputs: readonly MemoInput[]): readonly Memo[]
	memo(name: string): Memo | undefined // the current revision
	memos(): readonly Memo[] // current revisions, in first-revision order
	history(name: string): readonly Memo[] // every revision, oldest first
	render(memo: Memo): string // '- name: description' unless a format overrides it
	remove(name: string): boolean
	remove(names: readonly string[]): boolean
	clear(): void
	snapshot(): MemoSnapshot
}

export interface MemoStoreInterface {
	get(id: string): Promise<MemoSnapshot | undefined>
	set(snapshot: MemoSnapshot): Promise<void>
	delete(id: string): Promise<void>
}
```

- A same-name `add` whose description or content changed appends a revision and emits `add`. Re-adding unchanged text is a no-op that emits nothing, as `@orkestrel/brief` treats an unchanged hash.
- `remove` forgets a memo and its whole history: a host's deletion means the fact is gone, privacy included. Supersession is the path that keeps history. Removal is the application's call, never a default model tool.
- Derive a revision number from the memo's position in `history(name)`; store no `revision`, `previous`, or `retired` member.
- Add no `scope` member: the memo set id is the partition, and `ScopeFilter.memos` narrows per conversation.
- Memo types (user, feedback, project, reference) and a Why and How-to-apply body are product policy: the toolbox `remember` tool's description teaches the body, and a host encodes a type in `name` or `description`.
- Place `MemoManager.ts` in `src/core/contexts/memos/` and the types in `src/core/contexts/types.ts`. Factories are `createMemoManager`, `createMemoryMemoStore`, and `createDatabaseMemoStore`; guards are `isMemo` and `isMemoSnapshot`.

### Memo stores

`rc-u8` mirrors the conversation stores line for line.

- `MemoryMemoStore` and `DatabaseMemoStore` live in `src/core/contexts/stores/`. The database store writes one `{ id, snapshot }` row over `@orkestrel/database`, as `DatabaseConversationStore` does.
- Point access is async; deleting a missing key is a no-op; the snapshot is one opaque column narrowed by `isMemoSnapshot`; a row whose blob id differs reads as absent.
- Every fleet store holds one snapshot per id, so the whole-set row follows the fleet. rc-u8's test times `set` over growing memo sets; a one-row-per-revision store waits for D14.

### Memo and record

| | Record | Memo |
| --- | --- | --- |
| origin | derived by a judge from verbatim sentences | authored by the model through a tool, or by the host |
| scope | one conversation | across conversations |
| truth | the verbatim sentence | the most recent revision |
| filing | judged | explicit |
| correction | supersession, history kept | supersession, history kept |
| provenance | `LedgerLine.source` | `Memo.origin` |

Memo consolidation from ledger records waits for D10.

## Skills

```ts
/** Holds one skill: a name and a description the index shows, the instructions loading adds, and bundled files. */
export interface Skill {
	readonly id: string
	readonly name: string
	readonly description: string
	readonly content: string
	readonly files: readonly FileInterface[] // from @orkestrel/workspace, immutable values
}

export interface SkillInput {
	readonly name: string
	readonly description: string
	readonly content: string
	readonly files?: readonly FileInput[] // minted with createFile
}

export type SkillManagerEventMap = {
	readonly add: readonly [skill: Skill]
	readonly remove: readonly [name: string]
	readonly clear: readonly []
}

export interface SkillManagerOptions {
	readonly on?: EmitterHooks<SkillManagerEventMap>
	readonly error?: EmitterErrorHandler
	readonly format?: ContextSectionFormat<Skill>
}

export interface SkillManagerInterface {
	readonly emitter: EmitterInterface<SkillManagerEventMap>
	readonly count: number
	readonly open: string // built-in '## Skills'
	readonly close: string | undefined
	add(input: SkillInput): Skill
	add(inputs: readonly SkillInput[]): readonly Skill[]
	skill(name: string): Skill | undefined
	skills(): readonly Skill[]
	render(skill: Skill): string // '- name: description'
	remove(name: string): boolean
	remove(names: readonly string[]): boolean
	clear(): void
}
```

- Skills are host-supplied and not persisted by Agent, so `SkillManager` has the memo verb set minus `history` and `snapshot`.
- Place `SkillManager.ts` in `src/core/contexts/skills/`. Mint skill files with `createFile` from `@orkestrel/workspace`; never re-export a workspace symbol from Agent's barrel.
- Agent accepts typed `SkillInput`. `SKILL.md` parsing waits for `@orkestrel/markdown` (D9); Agent takes no npm parser.

### Skill load

Loading a skill adds instruction `skill:<name>` with the skill's content to the context's `InstructionManager`.

- The body never folds, because instructions never fold; the vendor repair for skills that stop being followed after compaction is re-attachment (C23, C09).
- The ledger never files the body as a `fact`, because the body is not a tool result; successful tool results file as `fact` (`Ledger#assign` in `src/core/ledgers/Ledger.ts`).
- Host-authored directives do not arrive as tool results, which carry no authority by default (C25).
- The instruction inherits scope and `priority`; unloading is `instructions.remove('skill:<name>')`.
- Each load changes the head one time, one prefix miss per load, accepted and measured: rc-s1's `studies/context` study counts loads per run, and rc-a9's skill-load probe reads `cached` around a load (`designs/measurement.md` § Recording). Loaded bodies move to the late `system` slot only on D4.
- A host scope with an explicit `instructions` allow-list filters a loaded `skill:<name>` instruction; rc-d1 documents this, and no code works around it.

### Skill and instruction

An instruction is always on, host-authored, and rendered on every build. A skill is an instruction bundle that is indexed always and loaded on demand; loading it is adding an instruction, with the bundle's files readable through a second tool.

## Tools

The tools live in `@orkestrel/toolbox` (rc-t1), which owns ready-made tools over other packages' managers (`createWorkspaceTool`, `createDescribeTool`).

| Factory | Tool | Returns |
| --- | --- | --- |
| `createMemoTool` | `memo { name }` | the memo's content, as state |
| `createRememberTool` | `remember { name, description, content }` | an acknowledgement |
| `createSkillTool` | `skill { name }` | a bare acknowledgement, after adding `skill:<name>` |
| `createSkillFileTool` | `skill_file { name, path }` | the file's text, as state; an unknown path refuses with the skill's valid paths |

- A tool acknowledges or returns state, never both, so each library has two tools.
- Each tool's argument shape is declared with `@orkestrel/contract`, as the toolbox's existing tools declare theirs.
- Each description leads with a worked example and the reply shape. Each refusal names the key path, the expected shape, and the valid names, with an untrusted identifier JSON-encoded and length-capped.
- Authority gates the tools by name with the shipped rules, for example `match: ({ call }) => call.name === 'remember'`.
- The `studies/context` mechanism study, modeled on `studies/tools`, proves the managers inside Agent first: a scripted memo write, revision, and read across two conversations; a skill load adds the instruction; scope lists filter (rc-s1). The release order carries Agent, then Toolbox (`tenets.md` § Release).
- Model-written memos can carry injected text across conversations, so `remember` ships with Authority `ask` in one wave (O2).

## Authority

The shipped model stays: ordered first-match rules, a fallback, and synchronous `evaluate` (`Authority` in `src/core/agents/Authority.ts`). Ordering modes and approver identity are product policy. `rc-a14` adds `ask` in the toolbox wave (D6):

```ts
export type AuthorityVerdict = 'allow' | 'ask' | 'deny' // replaces `allowed: boolean`; no shim

export interface AuthorityRule {
	readonly match: (context: AuthorityContext) => boolean
	readonly zone: string
	readonly verdict?: AuthorityVerdict
	readonly reason?: string
}

export interface AuthorityDecision {
	readonly zone: string
	readonly verdict: AuthorityVerdict
	readonly reason?: string
}

export type AuthorityHandler = (context: AuthorityContext, decision: AuthorityDecision, signal: AbortSignal) => Promise<boolean>

export interface AuthorityOptions {
	readonly rules?: readonly AuthorityRule[]
	readonly fallback?: AuthorityDecision
	readonly ask?: AuthorityHandler // absent: an `ask` verdict denies
}
```

- A matched rule with no `verdict` allows, as a rule with no `allowed` allows in 0.0.34.
- `evaluate` stays synchronous; only the handler is async, and only for `ask` verdicts.
- A union replaces two booleans, so no decision is both allowed and asked.
- `allowed` is replaced with no shim; Ollama, Toolbox, and Study re-pin in one wave.

The four orderings are rc-a14's acceptance tests:

1. An abort while a handler is pending: the call never executes, and the turn settles as a cancel.
2. A handler that throws, or resolves after the abort: deny.
3. Several `ask` calls in one turn: resolve in call order, each raced against the signal, before the pre-dispatch abort guard.
4. An approval permits execution and does not promise that the call executes exactly one time.

## Instructions, scope, and workspace

- Instructions: no model change. Precedence is `priority`, then insertion order, and a same-name `add` supersedes, which already implements later-supersedes-earlier (C25). Path-activated instructions wait for D7.
- Scope: two added allow-lists, `skills` and `memos`. Scope still filters no messages; message inclusion stays the conversation's job through compaction or the selection's job through the ledger.
- Workspace: unchanged and the only document channel. Skills reuse its immutable `FileInterface` and `FileInput` values. Skill and memo stores never live in the active workspace, because `build` renders every active file into the system message. Index mode waits for D8.

## Ledger wiring

`rc-u9` widens `LedgerAgentOptions` and fixes head pricing in one unit:

```ts
export type LedgerAgentOptions = Pick<AgentOptions, 'limit' | 'timeout' | 'on' | 'instructions' | 'skills' | 'memos' | 'workspaces'>
```

- One memo set can serve many ledgers and agents; cross-conversation memory depends on that.
- `Ledger#trim` prices the built head, not `[options.system, briefing]` (`designs/records.md` § Head pricing). Acceptance: with an instruction on the ledger's agent long enough to push the head past the cap when only `system` and the briefing are priced, the planned system message stays at or under the plan cap; with pricing reverted to `options.system`, the same fixture exceeds it.
- The ledger still plugs in through `select`.

## Refused

- An entity named `Memory` (one concept, one term).
- A frontmatter or YAML parser in Agent, and any npm parser package.
- A `type` or `kind` axis on `Memo`.
- Stored `revision`, `previous`, or `retired` members on `Memo`.
- One skill tool that both loads and reads files.
- A skill body delivered as a tool result: compaction folds it, and the ledger files it as a `fact`.
- Exact token counting for index caps (`tenets.md` § Scope).
- Embeddings, vector recall, or rerankers for memos.
- A timer or background consolidation pass for memos.
- Re-exporting `@orkestrel/tool` or `@orkestrel/workspace` types from Agent's barrel.
