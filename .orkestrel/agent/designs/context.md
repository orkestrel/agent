# Context design

`AgentContext` gains two libraries, memos and skills, that reach the prompt as short indexes with bodies loaded on demand. This design covers their shapes, managers, stores, tools, the context wiring, and the ledger wiring. Source locations name a symbol and its file as of `1e82d145`. The noun is `Memo` (Q1).

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
- Order the head from stable to volatile (rc-u9 head order): the `system` message holds the system text, the instructions with loaded skill bodies, and the skills index; one `user` context message after it holds the memos index, then the workspace text (`designs/layout.md` § Final layout). The skills index is host text, so it stays in `system`; memo text can be model-written, so it never enters `system` (O11).
- rc-u10 moves the workspace text out of `system` and the records out of the head, and deletes `Selection.briefing` (`designs/layout.md` § Shapes); rc-u9 adds the skills and memos sections on that layout.
- Pin memos-before-workspace in the context message with a test; a memo write invalidates the cached workspace text after it, and the other order invalidates memos on every file write. A model-driven reading of invalidation counts on the smallest local model, over a workload that writes memos and edits workspace files, can reopen the order; a scripted reading decides nothing, `studies/context` is scripted and refuses a provider, and rc-t1's brief owes the reading on its own driver (`plan.md` O115).
- Each section uses the `renderSection(open, items, render, close)` cascade; each manager carries its own `open`, `render`, and `close` with a `ContextSectionFormat<T>` override, as `InstructionManager` does. An empty manager renders no header.
- An index line renders as `- name: description` through one shared `renderIndexEntry` in `src/core/contexts/helpers.ts`. The default headers are `## Skills` and `## Memos`.
- rc-u9 renders each index, memos and skills, as one block whose entries join with a single newline (O48): `AgentContext#build` passes `[entries.map((one) => manager.render(one)).join('\n')]` as the single member of `renderSection`, and an empty list when the manager holds no entries, so an empty manager renders nothing. `render`, `format.render`, `renderIndexEntry`, the exported `renderSection`, and the instructions section, whose items join with a blank line, stay unchanged; rc-u9 corrects the `ContextSectionFormat` remarks and every guide sentence and example the tight join makes false.
- Agent ships no skill-loading tool, so an index with no loader tool is inert for the model (O48). The guide's one home for this is the `SkillManager` paragraph: a host that adds skills registers its own tool that loads a skill through `context.instructions.add({ name: 'skill:<name>', content })` and unloads it through `context.instructions.remove('skill:<name>')`, and a host that adds no skills sees no `## Skills` section. rc-u9 stays required before 0.0.35, so no manager ships that the prompt never reads.
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

`rc-u8` mirrors the conversation stores, with the four departures O81 accepts: `MemoryMemoStore` keeps its sets copy-on-write, the D14 timing is a throwaway bench read in a quiet runner slot, the contract test is one `describe.each` over a setup table of both factories, and `plantConversationRow` becomes the table-general `plantSnapshotRow`.

- `MemoryMemoStore` and `DatabaseMemoStore` live in `src/core/contexts/stores/`. The database store writes one `{ id, snapshot }` row over `@orkestrel/database`, as `DatabaseConversationStore` does.
- Point access is async; deleting a missing key is a no-op; the snapshot is one opaque column narrowed by `isMemoSnapshot`; a row whose blob id differs reads as absent.
- Every fleet store holds one snapshot per id, so the whole-set row follows the fleet. rc-u8's throwaway bench times `set` over growing memo sets in a quiet runner slot, never as a timing assertion in a test; a one-row-per-revision store waited on D14, whose trigger read 12.5 ms at 2000 revisions under O53, with the 50 ms figure reported beside it (O81). D14 is closed: on the memory driver, `sets 2000 revisions` reads 4.563 ms, with `set` linear from 0.279 ms at 125 revisions to 9.538 ms at 4000 (O104).
- D81 holds the read path, `DatabaseMemoStore.get` through `isMemoSnapshot`, because the same slot's `gets` cells read 14.67, 28.72, and 58.34 ms at 500, 1000, and 2000 revisions on the memory driver alone, the other drivers unmeasured, and decided nothing. rc-u20 cut the guard 12.6x (`designs/measurement.md` § Method, TH-5), so about 4.4 ms at 1000 and about 10 ms at 2000 revisions on the committed tree are derived, unmeasured, and decide nothing (O99).

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
- Each load changes the head one time, one prefix miss per load, accepted and measured: rc-s2's `studies/context` study pins one load per `load` run as a scripted mechanism count that reads no frequency, because it is scripted and refuses a provider; rc-t1's brief owes the frequency reading on its own driver (D4); and rc-a9's skill-load probe reads `cached` around a load (`designs/measurement.md` § Recording). Loaded bodies leave the head only on D4, and never into a late `system` message.
- A load made during a run reaches the model at the next build site, so a run whose next turn does not fold holds the tool's acknowledgement and not the body until the next run, and a turn that folds carries the body; a load then serves that agent's later runs in every conversation until the host removes the instruction (`plan.md` O115, D83). rc-s2 pins the no-fold branch, and rc-d1's guide sentence and its executed case assert both branches and read a second conversation.
- A host scope with an explicit `instructions` allow-list filters a loaded `skill:<name>` instruction; rc-d1 documents this, and no code works around it.

### Skill and instruction

An instruction is always on, host-authored, and rendered on every build. A skill is an instruction bundle that is indexed always and loaded on demand; loading it is adding an instruction, with the bundle's files readable through a second tool.

## Tools

The tools live in `@orkestrel/toolbox` (rc-t1), which owns ready-made tools over other packages' managers (`createWorkspaceTool`, `createDescribeTool`). They wait for the toolbox wave (D20); this campaign ships the managers with `studies/context` as their only consumer (Q3).

| Factory | Tool | Returns |
| --- | --- | --- |
| `createMemoTool` | `memo { name }` | the memo's content, as state |
| `createRememberTool` | `remember { name, description, content }` | an acknowledgement |
| `createSkillTool` | `skill { name }` | a bare acknowledgement, after adding `skill:<name>` |
| `createSkillFileTool` | `skill_file { name, path }` | the file's text, as state; an unknown path refuses with the skill's valid paths |

- A tool acknowledges or returns state, never both, so each library has two tools.
- Each tool's argument shape is declared with `@orkestrel/contract`, as the toolbox's existing tools declare theirs.
- Tool definitions carry host text only: no factory interpolates memo names, descriptions, or other stored text into a `description`, because the tools block renders inside the `system` turn (O11; `designs/layout.md` § Boundary). rc-t1's brief states this constraint.
- Each description leads with a worked example and the reply shape. Each refusal names the key path, the expected shape, and the valid names, with an untrusted identifier JSON-encoded and length-capped.
- Authority gates the tools by name with rules, for example `{ match: ({ call }) => call.name === 'remember', zone: 'memo', verdict: 'ask' }` (`designs/authority.md` § Shapes).
- The `studies/context` mechanism study, one declaration over the `tools` driver, proves the managers inside Agent first: a scripted memo write, revision, and read across two conversations; a skill load adds the instruction; scope lists filter (rc-s2, after rc-u9 and before rc-u17 and the falsify round; `plan.md` O94). The release order carries Agent, then Toolbox (`tenets.md` § Release).
- Model-written memos can carry injected text across conversations, so `remember` never ships without Authority `ask`, which ships first, in Agent 0.0.35 as rc-a14 (O2). A memo's text reaches the model in the `user` context message, never in `system` (O11).
- When D20 opens, the tools' gate adds a run on the smallest local model: from each description alone, the model calls each tool with valid arguments and reads each refusal into a valid retry (Q5). Those description goals read no rate, so rc-t1's brief owes the reading for D4, D32, and the memo order, on its own driver, because the `tools` adapter refuses a provider, and it owes D83's one bounded run on the smallest local model (`plan.md` O115).

## Authority

`designs/authority.md` holds Authority `ask` and the `consequential` floor (rc-a14).

## Instructions, scope, and workspace

- Instructions: no model change. Precedence is `priority`, then insertion order, and a same-name `add` supersedes, which already implements later-supersedes-earlier (C25). Path-activated instructions wait for D7.
- Scope: two added allow-lists, `skills` and `memos`. Scope still filters no messages; message inclusion stays the conversation's job through compaction or the selection's job through the ledger.
- Workspace: unchanged and the only document channel. Skills reuse its immutable `FileInterface` and `FileInput` values. Skill and memo stores never live in the active workspace, because `build` renders every active text file into the context message. Index mode waits for D8.

## Ledger wiring

`rc-u9` widens `LedgerAgentOptions` and fixes head pricing in one unit:

```ts
export type LedgerAgentOptions = Pick<AgentOptions, 'limit' | 'timeout' | 'on' | 'instructions' | 'skills' | 'memos' | 'workspaces'>
```

- One memo set can serve many ledgers and agents of one principal; cross-conversation memory depends on that, and a memo can be model-written, so a host never passes one set across principals (`plan.md` O93).
- `Ledger#trim` prices the head and the request copy of one build over `{ messages: [request], judgments: [] }`, not `[options.system, briefing]`, so a workspace image counts on the copy, and the calibration pass keeps the empty selection and sends the same head (`designs/records.md` § Head pricing; `plan.md` O93). Acceptance: with an instruction on the ledger's agent long enough to push the head past the cap when only `system` and the records are priced, the planned request stays at or under the plan cap; with pricing reverted to `options.system`, the same fixture exceeds it.
- The canary of `designs/layout.md` § Canary gains memo and skill sentinels: the skill description appears in `system`, the memo name and description appear in the context message only, the memo content appears in no message, and none of the four reaches a frame (`plan.md` O93).
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
