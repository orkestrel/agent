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
- **The user, 2026-11-10, on scope ownership:** "we need to make this especially aware of scope, from what I understand that would set the scope for a new agent not the current agent, which I think would make sense, but I feel like it's something you mentioned and something we need to think about and how scope works and how agents work within the scope they are giving, it wouldn't really make sense for an agent to manage it's own scope but still have the capability to work and manage what it slows given and securely and efficiently."
  - The scope a host gives an agent is its ceiling, and no call the model makes changes it.
  - The model manages only what it shows within that ceiling.
  - Work that needs a scope the agent wasn't given goes to a new agent, whose ceiling narrows its parent's.
- **The user, 2026-11-10, on delegation:** "I think agent delegation should be built in like any other agent and it can be scoped out if we don't want to give an agent the capability. We also have a workflow package that can help with that, not sure if we already use it or not but it's supposed to handle workflows of agents, tools, and functions."
  - Delegation ships in this campaign as a built-in, and a host scopes it out like any other.
  - It composes on `@orkestrel/workflow`, which Agent already uses for pacing, fan-out, and durable jobs.
- **The user, 2026-11-10, on the final design:** the read-only consultant decides it, "just make sure to provide the information upfront and that they follow AGENTS.md/agents/skills/rules strictly".
  - The design round reconciles into a draft.
  - A read-only consultant decides the final design from every input, given up front.
  - Refuters test its claims before any unit is briefed.
- **The user, 2026-11-10, on phases:** "it may be worth splitting the work into phases since they are heavy work and need refinement, especially the delegation and how scope works with proper care for security. I think you named what the biggest points about what is incompatible is what we need to work out thoroughly"
  - The campaign runs in four phases. Each phase closes on its own claims, review, and tree-wide gates before the next phase's units start.
  - Delegation is the last phase, behind a design checkpoint.
- **The user, 2026-11-10, on the campaign's size:** "Estimate as we reach each phase, the key is to prototype early, keep it concise and focused to gather the evidence we need and find out if it actually works, that will save us time and useless runs. It's about breadth rather than depth, fail early and fast to decide definitively."
  - Each phase is estimated as it's reached.
  - Phase 0, a short breadth-first round, runs every deciding probe and a thin efficacy prototype before any phase builds.
- **The user, 2026-11-10, on the 4B reading:** it's reported before the phase 3 release, and an efficacy miss doesn't hold the release. A design claim the live run falsifies does.
- **The user, 2026-11-10, on durable jobs:** built in this campaign, as one unit after phase 2. A job's input carries a narrowing scope and disclosure, checked against its parent.
- **The user, 2026-11-10, on delegation under a ledger:** ROADMAP item 9, binding the ledger's recall and lookup tools to the run, becomes phase 5. A ledger can then take delegates, behind its own design checkpoint and estimate.
- **Authorship:**
  - Host-authored text alone enters privileged context.
  - A model-authored memo, a record, and workspace data stay data.
  - No late system message is admitted (ROADMAP item 6; `methods.md` § Separate authorship from data and project outward explicitly).
- **Authority:** every disclosure the model triggers runs as a tool call under the agent's authority, and is pinned to the instance advertised for that turn (`methods.md` § Keep learned proposals outside deterministic authority).

## The roadmap items this campaign meets

Items 6, 8, 58, 67, and 68 meet their triggers here, and items 14, 15, 19, 52, 57, and 69 bear on the same seams. The design reconciliation plans or rules out each one.

## Open decisions

- **Each phase's estimate,** from the measurements phase 0 takes, brought to the user as that phase is reached.

## Deferred

| Item | Trigger | Owner |
| --- | --- | --- |
| `@orkestrel/toolbox`'s agent-facing tools (`createWorkspaceTool`'s switch, `createDescribeTool`, `createAgentTool`) simplified onto Agent's built-ins | This campaign's release, at toolbox's next visit | `@orkestrel/toolbox` |
| The method's example naming `@orkestrel/toolbox` as the owner of the model-driven loader (`orkestrel-harden` `references/methods.md`, Agent `4d897eec`) | This campaign's release | the scaffold session |

## State

| Item | State |
| --- | --- |
| Absorb | three distiller reads and a module map, 2026-11-10 |
| Design round | both lanes returned, each revised for the scope ruling; they agree on the ceiling and disclosure split, built-in tools under authority, the head refresh, advertised-set pricing, and closing ROADMAP items 67 and 68; 14 points are incompatible |
| Final design | decided by the consultant on every input. Its four phases are scope and the ceiling; disclosure in the agent; disclosure in the ledger, with the consumer run and the 4B reading; and delegation behind a checkpoint. Two refutations read 255 claims and found 36 failures, 1 stale fact, and 14 unverifiable claims. The design repaired 65 findings and refuted 1. A re-audit closed 57 of the repairs, a closure pass corrected the other 8, and the closure check closed all 8. Its estimate is 19.5 units, about 66 lane hours at 3.4 hours a unit (wall time, `git log 19f72405~1..7718f390`), plus at most 2.4 runner hours. |
| Decisions | the user ruled each phase estimated as reached, prototype first, the reading reported and not holding the release, durable jobs built, and ROADMAP item 9 as phase 5 |
| Next | the final design enters `designs/disclosure.md`, then phase 0's probes and prototype |

## Sequence

0. **Phase 0, prototype and probes,** breadth-first, each throwaway under `tmp/probes/`:
   - red-first readings on the base for ROADMAP items 67 and 68, the fan-out hole, the hidden stub, and the plan charging hidden definitions
   - the derivation table for disclosure derived from the conversation
   - definition density on the 4B
   - the delegation checkpoint probes K1a to K5
   - a thin efficacy prototype: does the 4B, given a skill index and a load tool, load the right area and then call the right tool, on the desk catalog of `studies/tools` against its known readings

   A probe that fails opens its design question before any phase builds on it.
1. **Phase 1, scope and the ceiling.** It is releasable alone.
2. **Phase 2, disclosure in the agent,** then the durable-job unit.
3. **Phase 3, disclosure in the ledger,** with the consumer run on taverna's catalog and the 4B reading, reported and not holding the release. This is the release taverna adopts.
4. **Phase 4, delegation on a bare agent,** behind its checkpoint.
5. **Phase 5, ROADMAP item 9,** so a ledger can take delegates, behind its own checkpoint.

Each phase is estimated as it is reached. Its units run tests first, each with a review. Then one `orkestrel-falsify` round on the phase, and `verifier` tree-wide, close it before the next phase starts. Publication is the user's at each release.
