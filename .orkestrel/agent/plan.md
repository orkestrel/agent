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

## The roadmap items this campaign meets

Items 6, 8, 58, 67, and 68 meet their triggers here, and items 14, 15, 19, 52, 57, and 69 bear on the same seams. The design reconciliation plans or rules out each one.

## Deferred

| Item | Trigger | Owner |
| --- | --- | --- |
| `@orkestrel/toolbox`'s agent-facing tools (`createWorkspaceTool`'s switch, `createDescribeTool`, `createAgentTool`) simplified onto Agent's built-ins | This campaign's release, at toolbox's next visit | `@orkestrel/toolbox` |
| The method's example naming `@orkestrel/toolbox` as the owner of the model-driven loader (`orkestrel-harden` `references/methods.md`, Agent `4d897eec`) | This campaign's release | the scaffold session |
| Phase 1's six deferrals, each with its trigger in `designs/disclosure.md` § The deferral list: `scanJobTree`'s cost on deep job trees, the scan and spawn reading `children` more than once, a malformed child bound refused only at the child's build, a supplied `gauge` refusing after a tool is added, `ledger.agent.emitter`'s write members, and a host's own `select` during a pass filing its request again | each row's own | Agent |
| `test:studies` took about 20 minutes on this host. Done: it runs in 397 s in series and 243 s with parallel files; the parallel setting is scaffold item 165 | scaffold's release | the scaffold session |
| Phase 2's four deferrals, each with its trigger in `designs/disclosure.md` § The deferral list: no index of the memo names a model may write, an ask raised for a `remember` its handler refuses, text that passes as visible but reads blank, and claim 2.11's growth margin | each row's own | Agent |
| Phase 3's deferrals, each with its trigger in `designs/disclosure.md` § The deferral list: the fixed part's third calibration call, the decision most worth reopening; a check of an adopted gauge against the provider's reports; the set estimate's rounding against a per-definition charge; the answer fit's untested rate floor; what an `'OVERFLOW'` rejection keeps stored; calibration calls with no gate, inside "Calibration over a ceiling-bounded set"; a fit of a lookup's result, narrowed from the bound on any tool result; a public read of the room a ledger leaves for the head; a `remember` line under a host memo `format.render`; and the durable-job unit's two child refusals at the child's own build | each row's own | Agent |
| Study's owned daemon keeps its executable `digest`, a de facto pin an Ollama update changes, and `--extend` requires an owned daemon, so a profile that declares none cannot extend. The 4B reading used no `--extend`. | the user's word | `@orkestrel/study` |
| Study loads each bundle from its own root, so `studies/desk/` carries chat's judge text, judge options, and filing cutoffs as copies a test pins equal: a cross-bundle sharing gap | Study's next visit | the scaffold session |

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
| Phase 3, documentation | 3C wrote the room rulings' and the durable-job ruling's guide statements, claim 3.13's fence, the owed TSDoc, the 3A review's finding H, the round re-audit's finding F4, and the small-model composition from the reading. It removed ROADMAP item 6 and records item 15's trigger met: taverna's context message prices 8001 of a head of 8208, and the item opens after phase 3. `test:guides` passes 231 of 231 (`agent-3C-guides4`). |
| Study profiles | Under the user's Ollama rulings, the seven chat, memory, and desk profiles name Ollama's default URL with no `provider.daemon`. The chat sources README's digests, `studies/README.md`, and the chat, disclosure, and endurance study tests follow. The endurance test gives its owned-daemon case a dedicated port, because Study refuses an owned daemon on the default one: `agent-desk-dist` read 31 of 32 before that fix, and `agent-endurance-fix` passed after it. |
| Study version unit | The consultant ruled the serving Ollama version an observation that Study records and compares with nothing. Built as ollama `710a650` and study `84e49b7`, each with its gates green and its review passed, release-ready. Agent's consumer changes for that Study are prepared as 42 edits, 41 of them proved red, then green, in a scratch copy, and the last a TSDoc line the review asked for: `settings.version` leaves the desk, chat, and memory study types, validators, helpers, and profiles; `studies/README.md` drops the refusal it states; the study tests assert that a stale `version` refuses; and one TSDoc in `tests/setupStudy.ts` follows. They apply at Agent's devDependency re-pin to that Study, and Agent's profiles keep `settings.version` until then. |
| Release path | Agent 0.0.42 from phase 3; then scaffold's code batch with ollama, toolbox, and study; then Agent's devDependency re-pin to that Study and Ollama, with the prepared consumer changes; then taverna adopts 0.0.42. Publication is the user's. |
| Next | The tree-wide chain, run one time. Then path-limited commits: the code with its tests and docs; the studies, with the desk bundle, the reading, and the profile cleanup; and the records. Then the 0.0.42 release prep, and the list to scaffold and the user. |

### The prepared Study-version consumer change

Unapplied until Agent re-pins its devDependencies to the Study release that carries `84e49b7` and the Ollama release that carries `710a650`, because the installed Study 0.0.18 still requires `settings.version`. It holds 42 edits over 25 files, each named here with what it changes:

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
