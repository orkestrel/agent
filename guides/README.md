# Guides

A dual-axis index into this repository's guides — by concept, and by directory.

## By concept

| Concept | Spec                   | Source                    | Tests                                 |
| ------- | ---------------------- | ------------------------- | ------------------------------------- |
| Agent   | [`agent.md`](agent.md) | [`src/core`](../src/core) | [`tests/src/core`](../tests/src/core) |

## By directory

| Directory  | Guide                  |
| ---------- | ---------------------- |
| `src/core` | [`agent.md`](agent.md) |

## Dependency reference

[`abort.md`](abort.md) is a byte-identical mirror of the guide for
`@orkestrel/abort` — a runtime dependency, the cancellation primitive an
agent turn's `signal` is folded from. It documents **that package's** surface
(a typed `AbortController` wrapper), not anything sourced in this repo; it is
kept here so a reader of this package can see the primitive it is built from
without leaving this guide set.

[`budget.md`](budget.md) is a byte-identical mirror of the guide for
`@orkestrel/budget` — a runtime dependency, the token-cost primitive bounding
a provider call / an agent turn and driving automatic conversation
compaction. It documents **that package's** surface (the `Budget` class,
`BudgetInterface`, and token-usage accounting), not anything sourced in this
repo; it is kept here for the same reason.

[`contract.md`](contract.md) is a byte-identical mirror of the guide
for `@orkestrel/contract` — a runtime dependency, the shape DSL other tools
(for example `@orkestrel/toolbox`'s `createWorkspaceTool`) compile their contracts
through. It documents **that package's** surface (guards, combinators,
parsers, and the shape DSL), not anything sourced in this repo; it is kept
here so a reader of this package can see the primitives it is built from
without leaving this guide set.

[`tool.md`](tool.md) is a byte-identical mirror of the guide for
`@orkestrel/tool` — a runtime dependency, the callable-tool runtime the agent
loop advertises definitions from and dispatches calls through. It documents
**that package's** tool definitions, results, and execution, not anything
sourced in this repo.

[`workspace.md`](workspace.md) is a byte-identical mirror of the guide
for `@orkestrel/workspace` — a runtime dependency, the file domain whose active
workspace `AgentContext` renders into a turn. It documents **that package's**
files, editing, persistence, and manager surface, not anything sourced in this
repo; the carrier split that turns those files into prompt content is agent's
own and is documented in [`agent.md`](agent.md).

[`database.md`](database.md) is a byte-identical mirror of the guide
for `@orkestrel/database` — a runtime dependency, the storage layer
`DatabaseConversationStore` persists a conversation snapshot over. It
documents **that package's** surface (the database, tables, and driver layer),
not anything sourced in this repo; it is kept here so a reader of this guide
can see the persistence layer without leaving this guide set.

[`emitter.md`](emitter.md) is a byte-identical mirror of the guide
for `@orkestrel/emitter` — a runtime dependency, the typed push-observation
surface the `Agent`, `Conversation`, and observable agent-owned managers
expose as `emitter`. It documents **that package's** surface, not anything
sourced in this repo; it is kept here for the same reason.

[`queue.md`](queue.md) is a byte-identical mirror of the guide for
`@orkestrel/queue` — a runtime dependency, the bounded-concurrency, retrying,
durable substrate `createAgentQueue` composes for many durable agent jobs. It
documents **that package's** surface (the `Queue` class and `QueueInterface`,
`createMemoryQueueStore` / `createDatabaseQueueStore`), not anything sourced
in this repo; it is kept here for the same reason.

[`timeout.md`](timeout.md) is a byte-identical mirror of the guide
for `@orkestrel/timeout` — a runtime dependency, the wall-clock deadline
primitive bounding an agent turn. It documents **that package's** surface
(a typed countdown timer), not anything sourced in this repo; it is kept
here so a reader of this package can see the primitive it is built from
without leaving this guide set.

[`workflow.md`](workflow.md) is a byte-identical mirror of the guide
for `@orkestrel/workflow` — a runtime dependency, the source of the
`SchedulerInterface` the agent loop yields to between turns and of the
`Runner` `createAgentRunner` composes. It documents **that package's**
surface, not anything sourced in this repo; it is kept here for the same
reason.

[`guide.md`](guide.md) is a byte-identical mirror of the guide for
`@orkestrel/guide` — the devDependency powering this repo's guides-parity
test suite (`tests/guides.test.ts`). It documents **that
package's** surface (`Guide` / `Source`, the manifest and comparison
helpers), not anything sourced in this repo; it is kept here so a reader of
the parity suite can see the primitives it is built from without leaving
this guide set.

[`scaffold.md`](scaffold.md) is a byte-identical mirror of the guide
for `@orkestrel/scaffold` — the devDependency whose blueprint compiler keeps
this repository's own structure, configuration, and tooling on the shared
canon. It documents **that package's** surface (blueprints, plans, artifacts,
and the projections over them), not anything sourced in this repo; it is kept
here for the same reason.

## See also

- [`AGENTS.md`](../AGENTS.md) — the repository's authority pointer; the coding rules it resolves to live in `@orkestrel/scaffold`.
