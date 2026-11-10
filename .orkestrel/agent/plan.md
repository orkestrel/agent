# Progressive disclosure

## Goal and exit criterion

A host gives a small local model progressive reach to everything its principal may do. A small always-on core points the model to the right tools, skills, instructions, and memos, and the model widens it on demand under the host's authority. Every disclosed piece is priced, cached, and stored correctly, and host-authored and model-authored text stay apart.

- The user, 2026-11-10, relayed by taverna's session: "notice how we have instructions, skills, memos, tools, etc we have so many ways to make this possible for small models we just need the right way to present the information in terms of when and how much, we don't have to put everything at once but we need to point it in the right direction in terms of tools to use … I have the AGENTS.md point to when and how so that we start with a small cache and context and then build as we go through a session."
- The user, 2026-11-10: "Let's take care all of this now, this is an agents gap we need to work on before we build source code in the taverna application code, I don't want to build in taverna what should already be in agent already. Let's design this now and give the full capabilities we need for this that you found and also design it safely and securely much like when we had to be careful with the system prompt stuff. Everything needs to be with proper authority but we need these capabilities to be built in, address all that you found in the table and make sure the agent is full fledged and production ready, following the proper focus from AGENTS.md/agents/skills/rules strictly."
- **Exit:**
  - Every row of § Claims, set at the design reconciliation, is closed: implemented with its tests, guide passage, and TSDoc, or excluded with its reason.
  - One real consumer runs end to end: taverna's capability catalog, served through the composed result, on the 4B.
  - One independent `orkestrel-falsify` round runs on the integrated result.
  - `verifier` runs the tree-wide gates once.
  - A model-driven reading on the 4B compares the disclosure path against the arms the design names, each arm priced before it's ruled in.
  - The user publishes.

## Repositories

| Repository | URL |
| --- | --- |
| agent | https://github.com/orkestrel/agent |

## Governing skills

- `orkestrel-harden` governs the units, as a capability and hardening selection. Its methods apply as follows:
  - `references/methods.md` § Load instructions progressively and prove when they take effect
  - § Separate authorship from data and project outward explicitly
  - § Keep learned proposals outside deterministic authority
  - § Price each arm before ruling it in
- `orkestrel-falsify` governs each review and the audit round.
- `orkestrel-dispatch` governs each lane, and `orkestrel-parallel` governs the shared execution lane.
- `orkestrel-publish` governs the release.

## Scope: what Agent 0.0.40 lacks

- **Skills:**
  - The prompt carries only the skills index (`src/core/contexts/AgentContext.ts` `build`).
  - The model has no loader.
  - `Skill.content`'s TSDoc names a loader that doesn't exist (`src/core/contexts/types.ts`).
- **Memos:** the prompt carries only the memo index. The model can't read a memo body or write a memo, and Agent never loads or saves a `MemoStoreInterface` itself.
- **Instructions and the head:** the head is built at run entry, after a selection, and in a compaction rebuild, never per turn (`src/core/agents/Agent.ts`). An instruction, skill, memo, or workspace edit mid-run reaches the model only through a fold. `AgentRunOptions` overrides none of these per run.
- **Scopes:** the model can't widen a scope. One scope serves every overlapping run of an agent. `AgentContext` never reads a `ScopeManagerInterface`.
- **Tools:**
  - No per-run tool choice exists.
  - A durable job carries no instructions, skills, memos, workspace, or scope (`src/core/agents/AgentRegistry.ts`).
- **The ledger:**
  - Its plan subtracts the overhead of every definition it holds, whatever the scope hides (`Ledger.ts`, the `total` in `#plan`). A registry larger than the room leaves no room.
  - Its authority denies every tool but its lookups, writes, and `recall`.
  - It compares its definitions only at construction (ROADMAP item 68).
  - Its scope read and the agent's snapshot can disagree (item 67).
  - The answer pass advertises no tools.
  - A hidden stub names `recall` even when the scope excludes it.
- **Guide defects:**
  - `guides/agent.md` says the workspace reaches the model "every turn", where it does at each build site.
  - `src/core/agents/types.ts` gives `strict` two defaults.
- **No measurement:** no model-driven reading exists for skills, memos, progressive instructions, or an on-demand tool area on any model. The one narrowing reading had the oracle's 6 tools of 36 score 35 of 42 against the full catalog's 42 of 42 on the 4B (`studies/README.md`, `223d6c84`).

## Rulings

- **The user, 2026-11-10:** the capabilities above are built into the Agent stack, with proper authority, before taverna writes its own. Taverna's surface, harness, retire, and ingress units wait on this campaign.
- **The user, 2026-11-10, on placement:** "I don't want toolbox to be a dependency … In my mind toolbox is really going to be for a general use MCP type of package for all orkestrel packages that we can have not specifically agent. I can see how it can have some agent stuff that would work internally and that we can simplify what toolbox has with what agent will now have built in but not the other way around."
  - Every disclosure capability lives in Agent's core.
  - Agent never depends on `@orkestrel/toolbox`.
  - Toolbox may later build on Agent's built-ins, and § Deferred carries that.
- **Authorship:**
  - Host-authored text alone enters privileged context.
  - A model-authored memo, a record, and workspace data stay data.
  - No late system message is admitted (ROADMAP item 6; `methods.md` § Separate authorship from data and project outward explicitly).
- **Authority:** every disclosure the model triggers runs as a tool call under the agent's authority, and is pinned to the instance advertised for that turn (`methods.md` § Keep learned proposals outside deterministic authority).

## The roadmap items this campaign meets

Items 6, 8, 58, 67, and 68 meet their triggers here, and items 14, 15, 19, 52, 57, and 69 bear on the same seams. The design reconciliation plans or rules out each one.

## Open decisions

- **The campaign's size:** the estimate, the spend ceiling, and the stop line, agreed with the user after the design round.

## Deferred

| Item | Trigger | Owner |
| --- | --- | --- |
| `@orkestrel/toolbox`'s agent-facing tools (`createWorkspaceTool`'s switch, `createDescribeTool`, `createAgentTool`) simplified onto Agent's built-ins | This campaign's release, at toolbox's next visit | `@orkestrel/toolbox` |
| The method's example naming `@orkestrel/toolbox` as the owner of the model-driven loader (`orkestrel-harden` `references/methods.md`, Agent `4d897eec`) | This campaign's release | the scaffold session |

## State

| Item | State |
| --- | --- |
| Absorb | three distiller reads and a module map, 2026-11-10 |
| Next | the design round: `planner` and `analyst` on one brief, in clean contexts, blind to each other |

## Sequence

1. The design round, then its reconciliation into claims, a release bar, a stop per seam, units, and a deferral list.
2. The estimate, ceiling, and stop line, agreed with the user.
3. The units, tests first, with each unit's review.
4. A real consumer run on taverna's catalog.
5. One `orkestrel-falsify` round, then `verifier` tree-wide.
6. The model-driven reading on the 4B.
7. The release, with taverna's re-pin.
