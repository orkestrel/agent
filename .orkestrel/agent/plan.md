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
| ollama | https://github.com/orkestrel/ollama |
| study | https://github.com/orkestrel/study |

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
- **The user's standing ruling, 2026-11-10, for every session:** "Honestly, these continuous questions about how many hours are getting annoying, you need to reassess by yourself in terms of reasonability and if it is within what is needed for quality and performance, it's something I want you and the other sessions to do and stop with the annoying checks about how many hours work is and just do the best to get stuff done well and fast."
  - The Orchestrator sets each phase's estimate and ceiling, keeps the work proportionate, and reports the figures in § State.
  - Publishing codes, credentials, scope, and product decisions still go to the user.
- **The user, 2026-11-11, on phase 0's probes:** "to bring more context to the value of the upfront work is that it is evidence that is also front loading with the work for both the implementation and the tests/studies/journeys that would be promoted if they are adopted."
  - Each phase promotes the phase 0 probes it adopts:
    - phase 1: the fan-out probe into 1A, and the scope, digest, stub, and room probes into 1B and 1C
    - phase 2: the derivation table into `collectDisclosure`'s tests
    - phase 3: the density harness into the ledger's pricing proof, and the efficacy harness into the 4B reading's study under `studies/`
    - phase 4: the checkpoint probes into the delegation tests
- **The user, 2026-11-11, on promotion:** "make sure they are not just copy and pasted either, you usually get plenty of leeway to do what you want when you come up with these probes but when you promote them they must strictly follow our conventions and rules and be adopted accordingly making sure they are renamed, organized, placed, and written correctly as expected of any other part of the project."
  - Each unit's review judges promoted code as it judges any other code.
- **The user, 2026-11-11, on pace and Study:** "Why would phase 2 be so many hours? After all that we have done to optimize our approach and strategy, make sure that you are also using the study package to it's full potential to setup scenarios and seed them so we don't have to wait so long for a response or evidence, the purpose of study is to speed things up to get us and the run to where it needs to be with the least amount of setup."
  - Evidence comes from seeded scenarios, not from long setup:
    - Study's `--seed <result>:<trial>:<goal>` starts a run at a retained checkpoint.
    - `--trial` and `--goals` run one segment.
    - Keyed replay serves recorded model exchanges offline.
    - Scripted providers stand in for a model wherever the claim is deterministic.
  - The routine `test:studies` suite runs in minutes. Full-schedule rehearsals run only before a sealed run, never as routine tests.
  - Units with disjoint files run in parallel against the declarations they share, rather than in series.
- **The user, 2026-11-12, about 07:00, on Ollama in scripts:** "no scripts should point to a scoop path or even a specific path like that since they would have to be system agnostic, I know you're trying to pin down a specific Ollama version but that is unnecessary for now, just do what we normally do expectiing Ollama to be available, there are plenty of examples in the agent and Ollama packages looking at the tests and how it expects and checks for Ollama."
  - At 07:11, on the committed study profiles: "you can clean them up, not really interested in pinning the Ollama version anywhere, we're following it's versions as they come."
  - At 07:35, on Study: "it may make sense to track the version but just in case we need that information to debug but I wouldn't want it to refuse a run because of the version."
  - No script, profile, or study names a machine path, a runner copy, or an owned daemon, and none pins an Ollama version. A study profile names Ollama's default URL, and a harness reads `OLLAMA_HOST` and `OLLAMA_MODEL` and checks that Ollama is ready, as the tests do.
  - Study records the serving version as evidence at each pass and refuses nothing for it, by the consultant's Study version ruling, built as ollama `710a650` and study `84e49b7`.
- **The user, 2026-11-12, relayed by scaffold at 09:00, on priority:** "my main aim is to finish agent, that's where all the effort and lanes should prioritize". Finishing Agent takes first claim on effort and on the shared execution lane, scaffold's release comes second, and taverna pauses. Scaffold relayed the same direction at 08:05.
- **The user, 2026-11-12, relayed by scaffold at 11:00, on worktrees:** "I'd rather work on main as much as possible unless truly necessary to work in parallel with worktrees but we need to make sure they are always where we know where they are and can clean them up when done and no random worktrees in places we have no idea about." Work stays on main. A worktree serves only two units that must write the same files at once, in the place `@orkestrel/scaffold` `.agents/orchestration.md` § Parallelism names, and folds back with the worktree removed and its branch deleted, as that section rules.
- **The user, 2026-11-12, about 12:00, on the three bars the spare-differential ruling moved:** accepted, framed as "more like what we would like than what must be the result … we just want to make sure that we have a baseline to differentiate a small change with a huge outlier change and be able to see what was the issue."
  - The three bars are claim 3.1's budget clause, the no-regression line, and the capacity line (`designs/disclosure.md` claim 3.1 and § The release bar).
  - A bar is a target and a recorded baseline, not a hard result. A reading near its baseline is drift; a departure by an order of magnitude, like the consumer's first call reported at 6.43 times its price, is an outlier to trace.
  - The overnight rulings that moved a bar are accepted on this framing and stand, though the user did not accept each separately: the capacity rule in every ledger, the supplied gauge's capacity line, and the Orchestrator's empty-list rule (`designs/disclosure.md` § The durable-job unit).
- **Authorship:**
  - Host-authored text alone enters privileged context.
  - A model-authored memo, a record, and workspace data stay data.
  - No late system message is admitted (ROADMAP item 6; `methods.md` § Separate authorship from data and project outward explicitly).
- **Authority:** every disclosure the model triggers runs as a tool call under the agent's authority, and is pinned to the instance advertised for that turn (`methods.md` § Keep learned proposals outside deterministic authority).
- **Compositions, the user, 2026-11-12, after the 4B reading:** "Sounds good, let's go with that, and clean up the others, I don't want to leave bloat, which means get rid of P and A. Make sure that agent is properly set up for O and D as you recommended."
  - **O is the default:** each request is scoped to the known area's tools, with no `load` and `skills: []`.
  - **D is the fallback:** the skills index and `load`, with nothing shown.
  - **P and A are removed:** P is a skill pre-shown by the host, plus `load`; A is every tool advertised as a composition.
  - Agent 0.0.42, prepared at `46ae3811`, is held for the cut and re-prepared under the same number.
- **The cut, by the consultant's O-and-D ruling, recorded at `095ce0db` before any dispatch** (`designs/disclosure.md` § The re-prepared 0.0.42):
  - **Removed:** the host's `disclosure` option on the agent, the run, the durable job, and the ledger, with `requireDisclosure`, `agentDisclosureShape`, and `agentDisclosureContract`, and `unload`'s "host gives that skill" refusal.
  - **Kept, under another name:** its workspace half, as one plain `workspace?: string` option in those four homes. A non-string throws `ContractError` `'placement'`, and a stored job carrying `disclosure` refuses as an undeclared member.
  - **Kept unchanged:** `AgentDisclosure`, `collectDisclosure`, `resolveDisclosure`, which takes the workspace string, and `ContextBuildOptions.disclosure`, as the derived state D reads.
  - **Nothing added for O or D:** `respond` gains no scope. The triage later closed `scope` in `LedgerAgentOptions`, and a `scope` member in `agent` refuses at the door.
  - **The guide gains:** the O recipe (a scope built from `skill.tools`, no `load`, `skills: []`) and the D-to-O lever, both as executed fences. The trap this ruling listed beside the recipe, `load` listed beside `skills: []`, was removed by the refusals ruling, so the guide states none.
  - **The claims:** C.1 to C.8 are the cut's own claims. 2.1, 2.7, 2.9, D.1, D.2, D.4, D.8, and 3.1 are restated. 3.14 and 3.15 are restated onto arm `taverna`'s receipt and one live consumer run of arm `index` (D) on a ledger. Arm `shown` leaves the harness.
  - **The desk study:** it keeps arms `area` and `index` on bare agents, and its ledger path and judge leave with `shown`.
  - **The design** keeps every A and P number as the record, and gains an "As ruled, 2026-11-12" paragraph. `46ae3811` is the last tree holding the `disclosure` option and arms `all` and `shown`.
  - **The deferral list** lost "Per-request `disclosure` on a ledger kept across requests" and gained "a shown set that ends with its request"; the triage closed the first and the D-window ruling the second.
- **The user, 2026-11-12, about 14:30, on deferrals:** "Take care of everything now, not interested in deferring anything, especially since the context for this is fresh and you should be able to come up with the best way to go about it now."
  - Read with the no-bloat ruling: every deferred row is built in 0.0.42, closed as refused with its reason, or handed to the package that owns it. Phases 4 and 5 stay planned phases.
  - The question of D after a load is settled by its probes, not deferred.
- **D after a load, by the consultant's D-after-a-load and D-window rulings:** 0.0.42 keeps the thread-long shown set and takes no `src/` change for D. Probe L1 read D on a ledger at 37 of 42, ruled drift; probe L2 read the request-bounded set at 27 of 42, and it is refused. The guide states D's live reading on a ledger and the sentence to serve a request under O whenever the host can tell its area (`designs/disclosure.md` § The 4B reading).
- **The triage, by the consultant, over 41 rows:** 1 built, 1 placed in phase 4, 5 handed on 2026-11-12, and 34 closed as refused (`designs/disclosure.md` § The deferral list maps each row).
  - The Orchestrator confirmed the two flagged closures, D32 as safe-side drift of 1.3 to 1.65 times and D16 because taverna sizes its own workspace text, and reversed D24 to a build under the user's refuse-by-default rule.
  - `ROADMAP.md`: item 7 restated to its second trigger, and items 15 and 58 removed.
  - The guide gains one list of the limits a host meets.
- **K, calibration, built by the triage's § D6:** calibration sends a bounded sample and refuses a measurement over the window.
  - K's follow-up ruling, by the consultant: rule (b), the comparison between the two calls, with no bound before the call with the definitions, no held-back definition, and no floor on the sample. K.3 gains the class `plan`, and the sweep line reads "0 calls without definitions over capacity, every call with definitions over capacity refused with no gauge stored".
  - The Orchestrator added K.3's class `refused` when probe PK3 returned 15 `before` rows of one shape.
- **The refusals, by the consultant:** the trap's rule changes with no refusal (T); D24 is built in the job shape and `collectJobRefusals` (J); undeclared option members refuse through `refuseOptionKeys` at five doors, D15 leaves phase 4, and claim 4.11 closes in 0.0.42 (O).
  - The Orchestrator decided two points the ruling left: an explicit `undefined` on an optional option member reads as absent and stays refused in a record; and the other option doors are censused, each named row taking the same door.
- **The doors, by the Orchestrator over the census's 75 rows:** host-facing configuration doors and per-call options take the `refuseOptionKeys` door; stored record inputs become exact records through their contracts; internal helpers and error constructors take none, with reasons.
- **The fix ruling, by the Orchestrator, on the round's findings on K and R:** the `'GAUGE'` text names the whole calibration call; `ConversationInput` reads as options, while `InstructionInput`, `MemoInput`, and `SkillInput` become exact records; no stored record carries a present `undefined`; the ledger's `agent` pick refuses as `Ledger agent`; the fan-out header covers a job that would not build; and the guide's surviving `disclosure` lines are checked against the documentation unit's result. F-K2 pins the comparison at capacity as the daemon's window reading rules it.
- **The user, 2026-11-12, at 18:05, on pace:** "What can we do in parallel to speed this up?" The fix round and the records unit run beside the solo live tickets, and the closure check follows the fix round.
- **Decisions recorded for the user,** each reversible on the user's word:
  - An option spelled `undefined` reads as omitted (the refusals ruling). Reversing it refuses `{ system: config.system }` when the value is absent, and needs a key loop the contract does not provide.
  - K.3's class `refused` moves the no-regression line: a ledger whose calibrated definitions alone exceed `capacity` refuses with `'GAUGE'` naming the remedy, where it stored a gauge measured over the window.
  - D32 closed: on D, a shown skill is priced 1.3 to 1.65 times its charge, on the safe side.
  - D16 closed: taverna sizes its own workspace text. Reversing it is a phase-sized build that opens with a viability probe on the 4B.
  - ROADMAP item 59, the user's item on refusing unknown run-option keys, was removed by the documentation unit because unit R built that refusal.

## The roadmap items this campaign meets

Items 6, 8, 58, 67, and 68 meet their triggers here, and items 14, 15, 19, 52, 57, and 69 bear on the same seams. `designs/disclosure.md` § The deferral list records how each closed or keeps its trigger.

## Deferred

Only hand-offs remain, each sent on 2026-11-12 by the triage ruling's § Hand-offs; Agent holds no deferred row. `designs/disclosure.md` § The deferral list maps every former row to its outcome.

| Item | Trigger | Owner |
| --- | --- | --- |
| D19: taverna's plan records the generic list, get, and change surface as its own gate question on its own catalog, or drops it. Sent to taverna's thread as a queued message, because the user paused taverna, with taverna's notes: its workspace text is its own to size; omit `snapshot.gauge` at a model or provider change; `LEDGER_SHARE` needs `skills` under 0.0.42's `LedgerShare`, or the constant takes `Partial<LedgerShare>`; a skill's name and description are what the model loads by; and the `workspace` option and the O and D practice. | taverna's own gate, at its adoption of 0.0.42 | taverna |
| D20: `AgentToolArguments` holds `task` alone and `AgentToolOptions` fixes the child, with no alias, because a model must not set a child's `provider`, `tools`, or `system`. Toolbox's guide sends an Agent host to the built-in `switch` and to skills and `load`; whether `createWorkspaceTool`'s `switch` operation stays for a host that is no Agent is toolbox's ruling, with a consultant question at that visit. `createAgentTool` on `AgentDelegate` waits for phase 4's release. | toolbox's visit after Agent 0.0.42, as scaffold answered at 14:50 | `@orkestrel/toolbox` |
| D21: `methods.md`'s clause names the model-driven loader as the `load` built-in of `@orkestrel/agent`, where it named `@orkestrel/toolbox`. | carried by `@orkestrel/scaffold` commit `5dbe14d0c`; Agent reads it at its next scaffold re-pin | the scaffold session |
| P7: an owned daemon's executable `digest` becomes an observation Study records at each pass and compares with nothing, as `84e49b7` did for the serving version; `--extend` admits a profile that declares no daemon, with empty maintenance, or Study removes `--extend` from the profile form that cannot reach it and says so in its guide. | Study's preparation after Agent 0.0.42 serves; Agent's session folds it in, as scaffold answered at 14:50 | `@orkestrel/study` |

P4, `test:studies`' parallel setting, was handed to the scaffold session and owes nothing: scaffold item 165 was already closed.

## State

| Item | State |
| --- | --- |
| Absorb | three distiller reads and a module map, 2026-11-10 |
| Design round | both lanes returned, each revised for the scope ruling; they agree on the ceiling and disclosure split, built-in tools under authority, the head refresh, advertised-set pricing, and closing ROADMAP items 67 and 68; 14 points are incompatible |
| Final design | decided by the consultant on every input. Its four phases are scope and the ceiling; disclosure in the agent; disclosure in the ledger, with the consumer run and the 4B reading; and delegation behind a checkpoint. Two refutations read 255 claims and found 36 failures, 1 stale fact, and 14 unverifiable claims. The design repaired 65 findings and refuted 1. A re-audit closed 57 of the repairs, a closure pass corrected the other 8, and the closure check closed all 8. Its estimate is 19.5 units, about 66 lane hours at 3.4 hours a unit (wall time, `git log 19f72405~1..7718f390`), plus at most 2.4 runner hours. |
| Decisions | the user ruled each phase estimated as reached, prototype first, the reading reported and not holding the release, durable jobs built, and ROADMAP item 9 as phase 5 |
| Design record | `designs/disclosure.md`, with the user's later rulings folded in. The durable-job unit brings the provisional total to 20.5 units, about 70 lane hours. |
| Phase 0 | closed 2026-11-11: every question answered YES; no design question opens |
| Phase 0, the base | All five defects reproduce red on `682a8298`: item 67 loops a pass to 9 provider calls against 2; item 68 reuses the gauge for an added tool; 12 widening fan-out child jobs spawn unrefused; the hidden stub names `recall` under a scope without it; and a scope hiding 79 of 80 definitions leaves the plan `total` 0 at taverna's room. |
| Phase 0, derivation | The derivation is exact on 23 table rows, 22 mutants, and 7 loop-stored rows; 0.94 ms at 1600 messages against a 6.6 ms bar. The stored-entity option stays closed. |
| Phase 0, delegation checkpoint | K1a to K5 all hold, 16 of 16 tests: the workflow runner composition, the run manager's throw and abort results, a child holding no `ask`, a ledger taking no delegates before phase 5, the live child ceiling failing closed, and the parent's budget bounding the child. |
| Phase 0, density on the 4B | YES on 9 samples with noise 0, 54 calls in 125 s, on runner 0.40.15. The addition term ships as written. Margins under the bound run 4% to 8% on desk areas and 11% on areas of taverna's mean size. The runner counts cached tokens inside the prompt. |
| Phase 0, efficacy on the 4B | It ran on a rebuilt desk catalog of 36 tools in 6 areas, because the original was swept on 2026-11-08 with no commit. Index plus `load`: 41 of 42 right, 15 of 15 loads opening the right area, median prompt 2721. All 36 tools: 42 of 42 at 6502. The oracle area: 42 of 42 at 1948. Each opened area costs one turn. The one miss called a shown tool when the needed area was hidden. Area guidance arrived as the `load` result, standing in for phase 2's head refresh. |
| Runner | Retired by the user's Ollama rulings of 2026-11-12: no runner lineage, no pinned version, and no machine path. A runner copy made that morning was reversed. The reading ran on Ollama's default URL, which served 0.40.16. |
| Phase 1 estimate | weight 4.75, about 16 lane hours, set by the Orchestrator; the round's repair adds 0.75 |
| Phase 1, units | Built and closed, uncommitted. 1A (the fan-out check) closed after two repair briefs and a closure check. 1B (the run scope and the `request` event) closed after a follow-up killed its review's five surviving mutations. 1C (the ledger) failed its review on the plan's scope and closed after one repair and a re-check that passed. The integrated tree passes 2868 `test:src` tests. |
| Phase 1, the round | Both lanes confirmed every composed claim but one. A run on another conversation of a ledger's agent still reached the ledger through every listener but `request`, as at 0.0.40. The consultant ruled that `ledger.agent` holds no member that starts a run (claims 1.18 to 1.23). The repair built it, and its re-audit passed with nothing above the bar. Six findings below the bar entered § Deferred. The 160-scenario differential against `e6a3ae75` is byte-identical. |
| Phase 1, documentation | 1D's two passes are done: the guide, the TSDoc, and claim 1.15's defects. Items 66, 67, and 68 are out of `ROADMAP.md`, and item 9 lost its second trigger. Its review passed, and its findings below the bar are fixed. |
| Phase 1 | Closed: claims 1.1 to 1.23, with the round repaired and re-audited. The chain on the 0.0.23 ranges passes `test:src` 2876, policy 179, config 545, setup 354, guides 220, and distribution 10, with format, lint, check, and build clean. Two `test:studies` cases wait on `ollama` and `study` releasing on Agent 0.0.41, because each still nests contract 0.0.22. |
| ROADMAP item 66 | Released alone as Agent 0.0.41 on 2026-11-11, from a standalone clone while phase 1 stayed uncommitted. Main fast-forwarded onto the release and carried phase 1 across by a three-way file merge. Two memory study cases, stale since the gauge digest, were fixed with it. |
| Phase 2 estimate | About 8 lane hours, revised from 18 on the user's ruling. Phase 1 took about 15 hours of wall time, and almost none of it waited on a model. The time went to the shared lane's queue, units run in series, review and repair loops, reviewers building probes from nothing, and a `test:studies` suite that runs for 20 minutes. |
| Phase 2 plan | 2A first. Then 2B and 2C in parallel: 2C writes its tests first against 2A's declarations and takes up 2B's code when it lands. Phase 0's derivation table and checkpoint probes seed the disclosure states as shared fixtures, so the units and the round's lanes compose probes from seeded states. |
| Study suite | Done, on the consultant's ruling. Routine `test:studies` went from 1201.5 s to 397.3 s with files in series, against a 400 s bar, and 204 of 204 pass. With parallel files it runs in 242.9 s; that setting is scaffold's, and the reading went to scaffold. The full chat rehearsal runs on demand before a sealed run (`studies/README.md` § Full rehearsal). A checker marked all 131 original assertions as carried, moved, or dropped by a named row. Study's gaps are scaffold items 161 to 165. |
| Dependencies | The contract 0.0.23 wave is closed. The dev ranges are re-pinned to `ollama` ^0.0.35, `study` ^0.0.18, and `probe` ^0.0.30, and no nested contract copy is left. |
| Phase 2 | Closed 2026-11-11. Claims 2.1 to 2.22 hold, as amended by the design's § Phase 2 "As built". 2A, 2B, and 2C were built, 2B and 2C in parallel. Each unit review passed. The round's subjective lane confirmed, and its objective lane failed claims 4 and 5, both below the bar. One repair took those and the reviews' findings (R1 to R10). Its re-audit left R10 open; the Orchestrator's fix closed it, with an independent closure check. 2D wrote the guide and the TSDoc. The chain passes with format, lint, check, and build clean: `test:src` 3169, policy 179, config 545, setup 354, guides 229, distribution 10, and studies 204. Phase 2 took about 5 hours of wall time against the revised 8. |
| Durable-job unit | Closed 2026-11-11 (design § The durable-job unit): claims D.1 to D.9 and the empty-list rule hold, its review passed, and the Orchestrator fixed the review's surviving mutation and a `render*` name. |
| Phase 3 estimate | About 7 lane hours plus the reading, set by the Orchestrator from phase 2's pace of about 1 hour a weight unit. Phase 3 took about 18.5 hours of wall time, from phase 2's close at `a1e626a1` (17:37 on 2026-11-11) to the reading's report at 12:17 on 2026-11-12, beside the durable-job unit, and its room seam took seven consultant rulings. |
| Phase 3, units | 3A built claims 3.1 to 3.13 and 3.17 to 3.20, and its review failed items 1 and 2: a model-free sweep sent 27 of 5756 calls over the limit after admitted `load` and `remember` calls, 4 of them over capacity, where the control read 0 of 3682. 3B-a and 3B-b built the `studies/desk/` bundle and the `disclosure` declaration; under the oracle every arm reads 42 of 42. The consumer-run harness serves taverna's catalog from taverna `a0a4566` with one copy of each package. The reuse fix replaced Agent's copies of ecosystem helpers. |
| Phase 3, the round | Closed 2026-11-12. The falsify round's objective lane confirmed; its subjective lane failed claim 3.5 on a numeric `load` argument. The room repair's re-audit failed on host acts inside one request. Seven consultant rulings answered the 3A review and the round (design § Phase 3, "As built"), and 3A built them in its room repair, its combined round repair, its spare repair, and its spare differential. The round re-audit passed: 70,600 calls with 0 over capacity. The spare repair's closure check passed: over 1500 partial scopes and 22767 ledger runs, 0 of 759 cases over on the set-proportional provider, and 1 of 741 over by 1 to 2 tokens on the per-definition provider, ruled below the bar and deferred. Receipts: `3A-round-green2-mut` (`src:core` 3339 of 3339, guides 229, policy 179 with 1 skipped); `3A-round-edges-mut` (54 of 55 mutations caught, `floor-fit` deferred); `agent-3A-spare-green2-mut` (753 of 753 scoped tests, 4 of 4 mutations); `agent-3A-spare-diff2-mut` (claim 3.1's two arms as ruled); `agent-sc-sweep` and `agent-sc-mut2`. |
| Phase 3, consumer run | Claims 3.14 and 3.15 hold on the 4B. The live run (`agent-consumer-live`, 397 s, 36 of 36 calls) passed arm `shown`, with ratios of 0.82 to 0.876 against 1.06 and first prompts of at most 8223, and found arm `taverna`'s first calls priced at 1035.5 and 1357.4 against reported prompts of 6659 and 6876, which held the release until the spared-rate repair. The rerun on the repaired build (`agent-consumer-live2`, 390 s, 29 of 29 calls) met the ruling's bar: arm `taverna` at 1.020 and 1.017, arm `shown` at 0.82 to 0.946, no prompt over 15872 with later calls at most 9983, and the offline arm `taverna` at 1.001 and 1.002. Neither run met a holdback or thread-cap denial or a `remember`, and calibration priced 13899 for 122 definitions within its limit. |
| Phase 3, the 4B reading | Read 2026-11-12 (design § The 4B reading, "As read"): 28 trials and 168 requests sealed in 834 s, read as baselines. A 42 of 42, O 42 of 42, D 40 of 42, and P 35 of 42. No stop reopened. |
| Phase 3, documentation | 3C wrote the room rulings' and the durable-job ruling's guide statements, claim 3.13's fence, the owed TSDoc, the 3A review's finding H, the round re-audit's finding F4, and the small-model composition from the reading. It removed ROADMAP item 6 and records item 15's trigger met: taverna's context message prices 8001 of a head of 8208, and the item opens after phase 3. The triage of 2026-11-12 closed its index mode, and the item left the roadmap. `test:guides` passes 231 of 231 (`agent-3C-guides4`). |
| Study profiles | Under the user's Ollama rulings, the seven chat, memory, and desk profiles name Ollama's default URL with no `provider.daemon`. The chat sources README's digests, `studies/README.md`, and the chat, disclosure, and endurance study tests follow. The endurance test gives its owned-daemon case a dedicated port, because Study refuses an owned daemon on the default one: `agent-desk-dist` read 31 of 32 before that fix, and `agent-endurance-fix` passed after it. |
| Study version unit | The consultant ruled the serving Ollama version an observation that Study records and compares with nothing. Built as ollama `710a650` and study `84e49b7`, each with its gates green and its review passed, release-ready. Agent's consumer changes for that Study are prepared as 42 edits, 41 of them proved red, then green, in a scratch copy, and the last a TSDoc line the review asked for: `settings.version` leaves the desk, chat, and memory study types, validators, helpers, and profiles; `studies/README.md` drops the refusal it states; the study tests assert that a stale `version` refuses; and one TSDoc in `tests/setupStudy.ts` follows. They apply at Agent's devDependency re-pin to that Study, and Agent's profiles keep `settings.version` until then. |
| Agent 0.0.42, first preparation | Prepared as `46ae3811`, "Release 0.0.42", after phase 3's chain and the release chain, and held unpublished on the user's ruling of 2026-11-12. The re-preparation replaces it under the same number. |
| The O-and-D cut | Ruled 2026-11-12 and recorded at `095ce0db` before any dispatch. Built uncommitted on that HEAD, whose `src/` equals `46ae3811`'s, by U1 and U2 with the consumer harness's arm `index`. The falsify round confirmed C.1 to C.8 in both lanes; its findings F1 to F5 sat below the bar, and each was acted on in 0.0.42 (`designs/disclosure.md` § The re-prepared 0.0.42). |
| U1 | The cut in `src/`, about 70 minutes of lane time in 21 tickets. C.1 read 180 of 180 scenarios equal. `agent-u1-final-mut`: `src:core` 3339, policy 179, config 545, setup 353, guides 231, and mutations `c3`, `c4a`, `c4b`, and `c6`. |
| U2 | The desk study's two arms. `studies` 24 and `setup` 353; the rehearsal probe sealed 14 attempts and 84 observations with no model in 197.6 s, on the `dist` built before the cut, so C.7's rehearsal reruns on the rebuilt `dist` before the release. |
| Consumer run, arm `index` | Live 2026-11-12, about 14:04 to 14:11, 40 of 40 calls (`agent-consumer-live-index`): claims 3.14 and 3.15 pass as restated, with arm `taverna` at 1.020 and 1.018 in the same run. |
| D after a load | Settled 2026-11-12 with evidence: E0 read 8 of 9 entries loading their own area, S1 read the ledger's window carrying no `load` call, L1 read 37 of 42, and L2 read 27 of 42; L3 did not run, by the rule. Ruled drift; the request-bounded set is refused; no `src/` change. |
| The deferral triage | 41 rows ruled 2026-11-12. Built in 0.0.42: D6 as unit K, and D24 and D15 in unit R. Handed: D19, D20, D21, P4, and P7 (§ Deferred). The other 33 are refused with their reasons. The deferral list is empty. |
| K | Built and green 2026-11-12 (`agent-k-green-mut`): `src:core` 3343, guides 232, policy 179 with 1 skipped, and setup 353; claim 3.1 with no `before` row; every room arm repeating field for field. It closes F1 and F3 of the round on the cut. |
| R | Built and green 2026-11-12, about 75 minutes of ticket time in 17 tickets (`agent-r-final-mut`): `src:core` 3586, guides 232, policy 179 with 1 skipped, setup 358, and studies 228; T.4's 31 differing scenarios are all trap scenarios; 14 mutations each redden their own claim. Accepted for review at 17:30, with its deviation 4 held for the review; the fix ruling replaced it. |
| The falsify round on K and R | Dispatched at 17:30. The subjective lane confirmed, with five findings below the bar, each ruled in the fix ruling. The objective lane had run 10 of its 11 mutations at 18:05, with `k-ge` surviving, which became F-K2; its verdict is read with the fix round. |
| Documentation | The guide, its test, and `ROADMAP.md`: `agent-docs-guides2` 236, and `agent-docs-policy` 179 with 1 skipped. No `src/` change. |
| `dist` | Rebuilt at 18:05 from the tree holding U1, U2, K, R, and the documentation, by `npm run build` run directly, a deviation from the lane form's heavy rule that took seconds. The live rerun reads this build; the fix round changes refusal text and record admission, never calibration or pricing. |
| The fix round | Built 2026-11-12 (`tmp/units/kr-fix.md`): rulings 1 to 15, the third K ruling's workspace sample among them, each red first (42 of 1035, and 8 of 599 for item 15). Closing ticket: `src:core` 3640, guides 237, policy 179 with 1 skipped, setup 363, studies 228; claim 3.1 has no `before` row; the room sweeps equal on 17 arms; 17 of 18 mutations red. The survivor `r2-memo` led the Orchestrator to restore the memo `origin` spread. |
| The closure check | Closed 2026-11-12 (`tmp/units/kr-closure.md`): OPEN on F-R1's `ConversationManager.add` row alone, which the Orchestrator added and proved by mutation (1 of 60 red, restored with its digest). 40 mutations of the reviewer's own, the objective lane's 13 among them, each red but that one; gates green. |
| Arm `taverna` live rerun and the window reading | `agent-consumer-live3` (the 18:05 `dist`) failed claim 3.15 on arm `index` request 6 at 1.346, K's sample dropping a dense workspace; the third K ruling added the cut workspace call. `agent-consumer-live4` (the 19:52 `dist`, 62 of 62 calls) is adopted: request 6 at 1.039, arm `taverna` at 1.02 and 1.016, calibration as ruled, claims 3.14, 3.15, and 3.18 pass. The daemon's window reading: 1026 reported at `num_ctx` 2048 against 6739 at 16384, a silent cut under the window, so F-K2 keeps `>`. C.7's rehearsal read 14 trials and 84 requests on that `dist`. |
| Tree-wide chain | Green 2026-11-12 (`agent-chain-final`): format, lint, check, build; `src` 3640, policy 179 with 1 skipped, config 545 with 1 skipped, setup 363, guides 237, distribution 10, studies 228. The closure check's F-R1 row and one guide limit sentence followed it, each checked directly and by guides 237. |
| Release path | Agent 0.0.42 re-prepared under the same number, which the registry has never served. Then scaffold's code batch with ollama, toolbox (D20), and study (P7); then Agent's devDependency re-pin to that Study and Ollama, with the prepared consumer change; then taverna adopts 0.0.42. Publication is the user's. |
| Next | Path-limited commits of the code with its tests and docs, the studies, and the records; the release chain through `steps.ts`; the release commit `Release 0.0.42`, whose notes replace those of `46ae3811`; the release-ready list to scaffold; the user's code. |

## The prepared Study-version consumer change

Unapplied until Agent re-pins its devDependencies to the Study release that carries `84e49b7` and the Ollama release that carries `710a650`, because the installed Study 0.0.18 still requires `settings.version`. Unit U2 changed files these edits touch after they were prepared (`studies/desk/`, `studies/README.md`, `tests/setupStudy.ts`, and the desk and disclosure tests), so plan them against the tree at the re-pin with `patch.ts --plan` before they apply. It holds 42 edits over 25 files, each named here with what it changes:

- `studies/desk/types.ts`: the desk settings stop declaring a serving version.
- `studies/desk/validators.ts`: the exact desk settings guard refuses a stale version key because the record names metadata alone.
- `studies/desk/helpers.ts`: the desk refusal names the one setting it checks.
- `studies/desk/profiles/screen.json`: the profile format holds no serving version.
- `studies/chat/types.ts`: the chat settings stop declaring a serving version.
- `studies/chat/validators.ts`: the exact chat settings guard drops the version member, so a stale version key refuses.
- `studies/chat/profiles/compact.json`: the profile format holds no serving version.
- `studies/chat/profiles/full.json`: the profile format holds no serving version.
- `studies/chat/profiles/tight.json`: the profile format holds no serving version.
- `studies/memory/types.ts`: the memory options stop declaring a serving version.
- `studies/memory/validators.ts`: the guard's import list loses the reader only the version check used; the exact memory options guard drops the version member, so a stale version key refuses; nothing reads a version member; nothing checks a version member.
- `studies/memory/helpers.ts`: a recording profile requires metadata alone.
- `studies/memory/StudyMemorySession.ts`: a recorded session requires a declaration and metadata, never a version.
- `studies/memory/profiles/narrow.json`: the profile format holds no serving version.
- `studies/memory/profiles/recommended.json`: the profile format holds no serving version.
- `studies/memory/profiles/smallest.json`: the profile format holds no serving version.
- `studies/README.md`: the guide stated the version refusal this change removes.
- `tests/studies/desk/validators.test.ts`: claim 10, desk half: settings without a version admit, and a stale version key refuses; the screen profile refuses a settings record that still carries a version beside its metadata.
- `tests/studies/disclosure/study.test.ts`: the authored screen profile holds no serving version.
- `tests/studies/endurance/study.test.ts`: an owned daemon declaration holds no version under the released Study; the recommended profile holds no serving version.
- `tests/studies/chat/validators.test.ts`: claim 10, chat half: import the settings guard; claim 10, chat half: settings without a version admit, and a stale version key refuses.
- `tests/studies/memory/validators.test.ts`: claim 10, memory half: metadata and a correction admit, and a stale version key refuses.
- `tests/studies/memory/helpers.test.ts`: a recording profile requires metadata alone.
- `tests/setupStudy.ts`: the chat fixture rebinds the provider and keeps the authored settings, which hold no version; claim 10, memory half: a stale version key is a refused settings row; a fixture recording pins its bounds; the version `MemoryServer` answers is an observation; an owned daemon declaration holds no version under the released Study; the desk record keeps the authored settings, which hold no version; the desk record takes no version; the recording fixture profile carries no serving version under the released Study (the review's below-bar finding at line 2559).
- `tests/setupStudy.test.ts`: the built recording profile holds metadata alone; the released Study's declaration holds no version member.

## Sequence

Phases 0 to 3 are closed, and their records are § State and `designs/disclosure.md` § Phases. The steps left, in order:

1. **The fix round** on the round's findings on K and R: F-K1, F-K2, F-R1 to F-R4, and the objective lane's findings, under `orkestrel-falsify`. Then one closure check by a fresh reviewer, which reads whether each closed and tests no other claim.
2. **Arm `taverna`'s live rerun and the daemon's window reading,** solo in the shared execution lane on the 18:05 `dist`. The window reading rules F-K2's comparison, which the fix round builds.
3. **C.7's rehearsal** on the rebuilt `dist`: 14 trials and 84 requests with no model.
4. **The tree-wide gates,** one time, on the integrated tree, with the `distribution` project.
5. **The records:** fill each PENDING slot, then commit by path: the code with its tests and docs; the studies; the records.
6. **The re-prepared 0.0.42** under `orkestrel-publish`: the release preparation and its chain, then the user's publication.
7. **The release order after it:** scaffold's code batch with ollama, toolbox (D20), and study (P7); Agent's devDependency re-pin with the prepared Study-version consumer change; taverna's adoption of 0.0.42.
8. **Phase 4, delegation on a bare agent,** behind its checkpoint. Claim 4.11 is closed in 0.0.42, so unit 4A no longer owns it.
9. **Phase 5, ROADMAP item 9,** so a ledger can take delegates, behind its own checkpoint.

Each phase is estimated as it is reached. Its units run tests first, each with a review. Then one `orkestrel-falsify` round on the phase, and `verifier` tree-wide, close it before the next phase starts. Publication is the user's at each release.
