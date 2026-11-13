# Progressive disclosure: the final design

Decided 2026-11-10 from every input of the design round. Agent is read at `e6a3ae75`; taverna is read at `8ae5382`. No fact of the decided design comes from a run; each "As built" and "As read" paragraph records what a later unit or run read. `.orkestrel/agent/plan.md` § Rulings holds the user's rulings of 2026-11-10, and this record reflects each where the design differs: phase 0 runs first, the durable-job unit is built after phase 2, ROADMAP item 9 is phase 5, the 4B reading is reported and holds nothing, and each phase is estimated as it is reached. The user's rulings of 2026-11-12 are reflected the same way: O is the default and D the fallback, with P and A removed; nothing is deferred; and a bar is a baseline that tells drift from an outlier. § The re-prepared 0.0.42 holds the cut, units K and R, and their claims, and each passage they restate says so. § Agent 0.0.43 holds the caller each tool call receives, the head rebuild after an edit, and their claims.

## Summary

1. **The campaign runs in phases, each closed by its own claims, one review round, and the gates before the next starts.** Phase 0, a breadth-first prototype and probe round, runs first. Then scope and the ceiling; disclosure in the agent, followed by the durable-job unit; disclosure in the ledger; delegation; and delegation under a ledger. Phase 1 ships first and is releasable alone. Phases 2 and 3 form the release taverna adopts. Phase 4 starts behind a design checkpoint, and phase 5 behind its own.
2. **A skill is the area.** `Skill` gains `tools`; the built-ins are `load`, `unload`, `memo`, `remember`, and `switch`. Holding a tool back is presentation and never authority. A built-in passes the same allow-list as any tool, and `remember` and `switch` run only where the ceiling lists what they may touch.
3. **What the model shows is derived from the conversation's stored record of each successful built-in call.** The host shows no skill. It selects a run's workspace with one plain `workspace` option on the agent, a run, a durable job, or a ledger's agent, which the cut of 2026-11-12 left in place of the `disclosure` option phase 2 built. No entity and no snapshot member exist. From phase 2 the head follows a change to the ceiling or the shown set at the next turn.
4. **The ceiling is the context scope intersected with the run scope, read at every turn,** so a host's narrowing reaches every live run, a child's included.
5. **The ledger prices what a pass advertises.** Pricing a hidden definition uses the rule the ledger already holds and lands in phase 1. Pricing an added definition waits for a density probe on the 4B, run in phase 0.
6. **Room.** The plan holds back the largest loadable skill's price and one tool result's. The ledger denies, with an `overflow` note, a `load` or a `remember` the measured remainder cannot hold, and a `load` that takes the thread's shown skills past `share.skills`; an `unload` reopens that `load` in the same request.
7. **Delegation.** Each host-declared `AgentDelegate` is one tool, called at most `calls` times a run, 1 by default. Its invariant: a child calls no tool outside its parent's ceiling and makes no call its parent's authority would not allow outright. Depth is 1. A child never asks. A ledger takes no delegates until phase 5 binds the ledger's tools to the run.
8. **`AgentFanout` refuses a child job that exceeds its parent** in tools, authority, provider, scheduler, limit, timeout, or budget, over the whole tree before the root spawns. The durable-job unit, built after phase 2, gives a job's input a narrowing scope and a `workspace`, checked against its parent.
9. **Each point no fact settles waits on a probe or a red-first proof, run in phase 0 before the decision it settles:** item 67's loop, the derivation table, definition density on the 4B, the delegation checkpoint's probes K1a to K5, and a thin efficacy prototype.
10. **Size.** The weights are provisional, 19.5 units about 66 lane hours at the measured 3.4 hours a unit, plus a reading bounded at 2.4 runner hours, and each phase is estimated as it is reached.
11. **Point 14:** the reading is reported before the phase 3 release and does not hold it. The consumer run's claims hold it, and they do not depend on what the model chooses.
12. **The re-prepared 0.0.42.** The user ruled O the default and D the fallback and removed P and A on 2026-11-12. The cut removes the host's `disclosure` option; unit K calibrates on a bounded sample and refuses a measurement over capacity; unit R lets an allow-list without `load` decide alone, refuses a malformed job tree whole, and refuses an option member no type declares. The deferral list holds no row: each is built, refused, stated as a limit in the guide, or handed to the package that owns it.
13. **Agent 0.0.43.** Each host tool call receives `context.caller`, an `AgentCaller` holding the workspace its request rendered and the live ceiling's `files` list, and a turn after an edit to a rendered file rebuilds the head. In the same wave Toolbox's own `switch` and `workspaces` leave, Toolbox 0.0.32 acts on the caller, and Workspace 0.0.18 gives `search` and `replace` a `paths` list.

## Legend

Paths prefixed `agent/` are in this repository, and paths prefixed `taverna/` are in the taverna repository. Line numbers read Agent at `e6a3ae75`. Short forms:

| Short | File |
| --- | --- |
| A | `agent/src/core/agents/Agent.ts` |
| AT | `agent/src/core/agents/types.ts` |
| AH | `agent/src/core/agents/helpers.ts` |
| AC | `agent/src/core/contexts/AgentContext.ts` |
| CT | `agent/src/core/contexts/types.ts` |
| CH | `agent/src/core/contexts/helpers.ts` |
| H | `agent/src/core/helpers.ts` |
| L | `agent/src/core/ledgers/Ledger.ts` |
| LT | `agent/src/core/ledgers/types.ts` |
| LH | `agent/src/core/ledgers/helpers.ts` |
| G | `agent/guides/agent.md` |
| TD | `@orkestrel/tool` 0.0.22, `dist/src/core/index.d.ts` |
| WD | `@orkestrel/workflow` 0.0.27, `dist/src/core/index.d.ts` |
| BD | `@orkestrel/budget` 0.0.17, `dist/src/core/index.d.ts` |
| TF | `taverna/app/server/agent/factories.ts` |

Terms:

| Term | Meaning |
| --- | --- |
| 4B | the 4-billion-parameter local model this design serves |
| `methods.md` | `@orkestrel/scaffold` `.agents/skills/orkestrel-harden/references/methods.md` |
| ROADMAP item | a numbered item of `agent/ROADMAP.md` |
| F | a numbered fact of § Facts this design rests on |
| E(S) | the token estimate of a definition set `S` |

**[fact]** marks a line read at the cited place. **[lane]** marks a citation taken from an absorb read and not reopened by the design. **[inference]** marks reasoning with no run behind it. No ruling in this file rests on an inference alone: where one would, a probe is ruled in first.

## Facts this design rests on

| # | Fact | Evidence |
| --- | --- | --- |
| F1 | A run takes its options at `stream()`, before its selection runs. The ledger's plan runs inside that selection, and the plan is what narrows `recall` out. | [fact] A:239-321, A:472; L:889-905, L:946, L:1273-1282 |
| F2 | The turn's tool allow-list is read after the `turn` event and the scheduler yield. | [fact] A:517, A:522-529, A:535-545 |
| F3 | A turn's decisions bind the instance held at the snapshot; approval and dispatch re-check identity. | [fact] A:542-544, A:1094, A:1108-1124, A:1172 |
| F4 | A call no definition advertises is denied with `SCOPE_NOTE` and a `deny` event with no decision, before the authority is read. | [fact] A:989-1001 |
| F5 | An abort before dispatch stores nothing. After dispatch starts, the loop awaits it and then stores one tool message per call, with no abort check between. | [fact] A:601-605, A:612-632 |
| F6 | A string a tool returns is stored as its message content unchanged. A failed result's content is its error text. | [fact] AH:951-955, AH:975-987; TD:329-334 |
| F7 | `Message` holds no member that records a call's success. | [fact] `agent/src/core/types.ts:38-60` |
| F8 | A section retains its folded originals; a capped merge and a cumulative fold keep them. | [fact] `agent/src/core/conversations/types.ts:186-192`; `Conversation.ts:345`, `:365-369` |
| F9 | `BudgetInterface.start()` re-arms a fresh signal, and `stream()` calls it on each held budget. | [fact] BD:138-148; A:314-318 |
| F10 | `chargeUsage(budget, usage, charged)` consumes a reported usage against a budget. | [fact] AH:827-837 |
| F11 | A job with no `tools` passes its agent no tool manager, so the agent's context builds an empty one: the job holds no tool. | [fact] `agent/src/core/agents/AgentRegistry.ts:117`, `:127`; AC:138 |
| F12 | `AgentFanout.execute` spawns each declared child with no check against its parent. | [fact] `agent/src/core/agents/AgentFanout.ts:57-64` |
| F13 | The plan subtracts the whole calibrated overhead, and calibration carries every manager definition. | [fact] L:1014-1020, L:566-570, L:582-585 |
| F14 | `#spared` is piecewise: the whole overhead for an empty advertised set, 0 when no calibrated definition is missing, and otherwise the missing definitions at `scale` times their JSON estimate, capped at the overhead. | [fact] L:1680-1689 |
| F15 | The digest is compared only at construction. | [fact] L:313-325 |
| F16 | The ledger observes a turn on `turn` by rebuilding the head and re-reading `context.scope`. | [fact] L:355, L:1658-1678 |
| F17 | The answer pass applies a `tools: []` scope to the shared context and restores it. | [fact] L:494-517 |
| F18 | The ledger's answer note carries every successful tool result after the request, whatever its tool. | [fact] L:1916-1935 |
| F19 | The seed tail keeps only calls that name a lookup or a write, and a completed exchange enters later prompts as its request and reply alone. | [fact] L:1487-1500, L:1232 |
| F20 | The ledger's authority allows exactly its lookup, write, and `recall` names. | [fact] L:274-310 |
| F21 | The repeat stop admits a call through `LedgerRequest.admit`, which throws the `repeat` note on the same name and canonical arguments. | [fact] `agent/src/core/ledgers/LedgerRequest.ts:225-230`; L:1701-1704 |
| F22 | The hidden stub names `recall` whatever the scope advertises. | [fact] LH:1366-1371 |
| F23 | `ToolAnnotations` holds `pure`, `untrusted`, and `consequential`. `ToolContext` holds `signal` and `caller`. `ToolDefinition` holds no area member. | [fact] TD:238-245, TD:265-270, TD:279-290 |
| F24 | A `Runner` runs declared units one at a time by default and resolves results in input order; it is one-shot; a unit whose handler rejects aborts its siblings and rejects the run; `destroy` tears it down. | [fact] WD:2736-2755, WD:2838-2839 for the default, WD:2822-2827 for `destroy` |
| F25 | `ToolManager.execute` resolves a handler throw to an error result, and returns an error result for a signal aborted before handler entry. A `Tool` called directly does neither. | [fact] TD:380-386, TD:362-363 |
| F26 | Taverna builds one ledger per turn from a stored snapshot, applies a turn scope built from the visible records, and approves every ask. It composes no agent registry, queue, or runner. | [fact] TF:186-233, TF:204-208, TF:216-231, TF:353; a search of `taverna/app` for `AgentRegistry`, `createAgentQueue`, and `createAgentRunner` matches nothing |
| F27 | Taverna's room is 15872: `num_ctx` 20480, less the 512 margin, less `num_predict` 4096, at `share.prompt` 1. | [fact] `taverna/app/server/agent/constants.ts:63-64`, `:84`, `:265`, `:271` |
| F28 | `renderIndexEntry` renders a run of line-break code points as one space. | [fact] CH:222-224 |
| F29 | `stringShape` takes an unflagged `pattern` only. | [fact] `@orkestrel/contract` `dist/src/core/index.d.ts:7331-7336` and the `@throws` line before it |
| F30 | The renderer places tool definitions in the system turn. | [fact] `methods.md:343` |
| F31 | An `Approver` frames an ask only when the run's own `ask` chunk is pulled through `agentStreamToFrames`. `generate` leaves a run's chunks undrained. An ask with no frame waits until the run's timeout or an abort. | [fact] AH:262-265, AH:289-292; AT:798-800; `agent/src/core/agents/Approver.ts:67-74`, `:126-134` |
| F32 | An authority with no `ask` member leaves every asked call unanswered, and the loop denies it. | [fact] A:1076-1079; AT:937-938 |
| F33 | The ledger's lookup wrappers, its authority, and its write retirement read the one live request, whichever agent's run reaches them; the retirement fires on the ledger's own agent's `tool` event. | [fact] L:639-642, L:291-292, L:1701-1703, L:332-349, L:1623-1656 |
| F34 | A tool message pairs with its call by position when a leader repeats a call id or when no result of the group carries a `call`, and by id otherwise. A tool message with no unique owner joins the assistant message that leads its run only when that leader holds the id, repeats an id, or the message has no `call`. The loop always stores `call` (A:631). | [fact] LH:385-394; H:488-490, H:504-539 |
| F35 | A conversation snapshot's guard is exact: an undeclared member refuses. | [fact] `agent/src/core/conversations/types.ts:584-587` |
| F36 | Two conversation values opened from one stored snapshot are distinct to the one-run-per-conversation guard. | [fact] AT:741-743; `agent/ROADMAP.md` item 32 |
| F37 | A scope is checked before the authority, and a `Scope` copies its lists at construction. | [fact] A:989-1001; `agent/src/core/contexts/scopes/Scope.ts:16-19`, `:47-57` |
| F38 | Taverna registers a per-resource lookup set and its writes on every turn's ledger. Taverna's own design draft estimates that set at 12219 tokens, which leaves its plan about 3446 of the room. | [fact] TF:189, TF:202-203; the draft's figure is an estimate of taverna's, not a measurement |
| F39 | A job's `children` cross the job contract as JSON records; each child is audited only at its own `build`. | [fact] `agent/src/core/agents/shapers.ts:21`, `:35`; `AgentRegistry.ts:90-99` |
| F40 | `Authority.evaluate` reads the instance's private rules, so a copied method loses them. | [fact] `agent/src/core/agents/Authority.ts:51-61` |
| F41 | A skill added under an existing name replaces it in place and mints another `id`. | [fact] `agent/src/core/contexts/skills/SkillManager.ts:114-125` |
| F42 | A ledger's answer pass stores its results note, the text of each successful tool result, as a `user` message. | [fact] L:486-493, L:1944-1956 |
| F43 | `MemoManager.add` appends a revision under an existing name whose text changed, `memo(name)` returns the last one, and a revision's `origin` comes only from the `add` input. | [fact] `agent/src/core/contexts/memos/MemoManager.ts:118-120`, `:164-180` |
| F44 | The ledger already stands a past value in for a future one: the longest stored reply prices the next reply, and `recall` closes while the remainder under `predict` is less than twice the reply reserve. | [fact] L:1691-1699; `agent/src/core/ledgers/Gauge.ts:91-100`; L:1257-1264 |
| F45 | Seven call sites build a prompt through the context: one in the agent and six in the ledger. `findLedgerCall` has four callers and one test block. | [fact] A:938; L:557, L:1021, L:1665, L:1747, L:1961, L:1974; L:711, L:747, L:1491, L:1594; `agent/tests/src/core/ledgers/helpers.test.ts:623-662` |
| F46 | A `turn` listener's abort is read before that turn's snapshot. | [fact] A:517, A:530-533, A:535 |
| F47 | The loop bills a provider call that reports no usage at its streamed-answer estimate, and emits `usage` only for a call that reported one. | [fact] A:589-592, A:715-722 |

## Phases

The order follows the dependencies and the evidence. The ceiling is read by every later mechanism, so it comes first. The ledger's disclosure reads the agent's, so the agent's comes before it. Delegation depends on phase 2 alone, serves no consumer at 0.0.40 (F26), and holds the most open points, so it comes after the ledger, behind a checkpoint. Delegation under a ledger needs the ledger's tools bound to the run, so it comes last.

| Phase | Slice | Closes | Releasable alone | Recommended release |
| --- | --- | --- | --- | --- |
| 0 | Prototype and probes | every deciding probe and a thin efficacy prototype, before any phase builds | no release | none |
| 1 | Scope and the ceiling | ROADMAP items 67 and 68, the fan-out hole, pricing under a hiding scope, the hidden stub, three documentation defects | yes | first, by itself: taverna's turn scope hides definitions its manager holds, and the plan stops charging for them (F38) |
| 2 | Disclosure in the agent, then the durable-job unit | the built-ins, the derived state, a host-given workspace, the head refresh, a job's narrowing scope and workspace | yes, for a bare agent; a ledger cannot enable a built-in until phase 3 | with phase 3 |
| 3 | Disclosure in the ledger | items 6 and 8, pricing, the holdback, room, the consumer run, the reading | yes | second: the release taverna adopts |
| 4 | Delegation on a bare agent | the user's ruling on delegation | yes | third |
| 5 | ROADMAP item 9: delegation under a ledger | binding the ledger's `recall` and lookup tools to the run, so a ledger takes delegates | set at its checkpoint | set at its checkpoint |

**Rules every phase follows.**

- A phase's units start only after the preceding phase's claims are closed, its review round has ended, and `verifier` has run the tree-wide gates on its integrated result.
- Each phase runs under `orkestrel-harden`, with one review pass a unit and one `orkestrel-falsify` round on the phase's integrated result.
- A probe or a red-first proof a phase names runs before the unit whose decision it settles, on the base and on the proposal, per `.agents/orchestration.md` § Sessions and consultation. Phase 0 runs the probes the plan names; each claim keeps its own red-first test in its unit.
- A phase adds a type or a member only in the phase that first uses it. No phase leaves a declared member unimplemented.
- A phase's documentation unit runs after its falsify round and that round's repairs, and before the verifier, so the guide describes the final behavior (`AGENTS.md` § Work loop, step 6). In phase 3 the reading also comes before the documentation unit, because two of that unit's edits depend on its report. A unit that changes a signature an existing guide fence calls updates that fence in the same change, so `test:guides` stays green at every unit; that is a migration, not prose.
- A unit that adds, removes, or renames a barrel export edits that export's row in the guide's Surface table in the same change, with its summary, and owns those rows of `guides/agent.md` and no other line of it unless its row in the units table names one. `agent/tests/guides.test.ts:413-419` requires it in both directions: "documents every barrel export" and "documents only barrel exports". The documentation unit keeps every other line of the guide and `ROADMAP.md`. Two units that run in parallel each name their own rows, as they name their own declarations in a shared source file.
- Publication is the user's at every phase. A phase that is not published still closes.

**Estimate basis.** Each phase is estimated as it is reached, so every weight in the following tables is provisional. The ledger-writes campaign opened at `19f72405` (2026-11-09 17:44) and landed its fifth unit at `7718f390` (2026-11-10 10:42): five medium units in 16.97 hours of wall time, 3.4 hours a unit [fact: `git log 19f72405~1..7718f390`]. Wall time includes each unit's review and a night of unattended pacing. It bounds lane time only where lanes did not overlap, and no record here shows whether they did: no timer-measured lane hours exist. Every weight is inference; the rate is the one measured figure.

| Phase | Weight | Lane hours at 3.4 |
| --- | --- | --- |
| 0 | set when opened | set when opened |
| 1 | 4.75 | 16.2 |
| 2 | 5.25 | 17.9 |
| The durable-job unit, ruled in by the user | 1.0 | 3.4 |
| 3 | 5.5 | 18.7, plus a reading of at most 2.4 runner hours |
| 4 | 4.0 | 13.6 |
| 5 | set when reached | set when reached |
| **Total, phases 1 to 4 and the durable-job unit** | **20.5** | **about 70** |

Phases 1 to 4 alone weigh 19.5 units, about 66 lane hours. The probe rows inside phases 3 and 4 keep their weights and run in phase 0.

### Phase 0. Prototype and probes

**Goal.** A short, breadth-first round runs every deciding probe and a thin efficacy prototype before any phase builds, so a design claim a run falsifies is found early and decided definitively. Each probe is a throwaway.

**What it runs.**

- Red-first readings on the base `e6a3ae75`: ROADMAP item 67's loop (claim 1.8), ROADMAP item 68's unpriced definition (claim 1.11), the fan-out hole (claim 1.14), the hidden stub (claim 1.13), and the plan charging hidden definitions (claim 1.12).
- The derivation table of claim 2.3, for disclosure derived from the conversation.
- Definition density on the 4B, by the probe § Phase 3 specifies.
- The delegation checkpoint's probes K1a to K5, § Phase 4 specifies.
- A thin efficacy prototype: whether the 4B, given a skill index and a load tool, loads the right area and then calls the right tool, on the desk catalog of `studies/tools` against its known readings.

**Rule.** A probe that fails opens its design question before any phase builds on it.

### Phase 1. Scope and the ceiling

**Goal.** A run's ceiling is the context scope intersected with its run scope at every turn, the ledger reads what a turn dispatched, and a child job cannot widen its parent.

**Proofs that come first.**

- **Item 67, red first.** The item itself requires it: "Prove the loop first" (`agent/ROADMAP.md` item 67). A scripted test on `e6a3ae75` shows a pass that advertised no tools looping to `limit` after a `turn` listener changes the scope behind the ledger's listener.
- **Item 68, red first.** A definition added between two `respond` calls is carried unpriced on `e6a3ae75`.
- **The fan-out hole, red first.** A child job naming a tool its parent lacks spawns on `e6a3ae75`.
- **A census of the ledger tests that observe `context.scope` during a request.** Two are known [fact]: `agent/tests/src/core/ledgers/Ledger.test.ts:876-906` reads the scope at each `select` and expects the second reading to be the answer scope, and `:908-935` reads its `tools` at the first `select`. After unit 1C the answer pass no longer applies a scope, so the first test's second expectation becomes the host's scope narrowed by the plan, and the unit restates it. The same census lists any test that pins a plan budget under a hiding scope; none sits at those lines, and each one found is restated by claim 1.12's formula.

**Units.**

| Unit | Owned files | Depends on | Order | Size | Weight |
| --- | --- | --- | --- | --- | --- |
| 1A fan-out check | `agents/AgentFanout.ts`, `agents/helpers.ts` (`scanJobTree`), their tests | — | parallel with 1B | medium: an authority path | 0.75 |
| 1B run scope and the `request` event | `contexts/types.ts` (`ContextBuildOptions` with `selection` and `scope`; `select`'s fourth parameter), `contexts/AgentContext.ts`, `contexts/helpers.ts` (`intersectFilters`), `contexts/validators.ts` (`isScope`), `scopes/Scope.ts`, `agents/types.ts` (`AgentRunOptions.scope`, `AgentEventMap.request`), `agents/helpers.ts` (`requireScope`), `agents/Agent.ts`, their tests; the call form of all seven `build` callers (F45) and of each existing guide fence that calls `build` | — | first | medium: a public type, concurrency | 1.25 |
| 1C ledger | `ledgers/Ledger.ts`, `ledgers/helpers.ts` (`renderStub`), their tests | 1B | serial | medium | 1.25 |
| Falsify round and its repairs | — | 1C | — | — | 0.75 |
| Repair: the ledger's agent (claims 1.18 to 1.23) | `ledgers/types.ts` (`LedgerAgentInterface`, `LedgerInterface.agent`), `ledgers/Ledger.ts` (the `agent` record and getter, the `request` listener), their tests, the direct-run proofs in `tests/setup.ts` and `tests/guides.test.ts`, and each guide sentence a removed proof pinned | the round | before 1D's TSDoc pass | medium: a public type | 0.75 |
| 1D documentation | `guides/agent.md`, `tests/guides.test.ts`, TSDoc of 1A to 1C, `ROADMAP.md` | the round | after the round | medium | 0.5 |
| Verifier, tree-wide, one time | — | 1D | — | — | 0.25 |

**What 1C changes.**

- A `request` listener replaces the `turn` listener (L:355). After the round's repair it reads every `request` event, because every run on the ledger's agent is a pass of the active `respond` call (claim 1.19). The gauge call's estimate is `estimateMessages(request.messages)` and its `tools` is the length of `request.tools`. `#observeTurn` builds nothing, so the caller at L:1665 goes.
- A run takes one scope, so each pass builds one. The first pass's run scope is the scope the request entered with (L:463). The answer pass's run scope is that entry scope intersected with `{ tools: [] }` through `intersectFilters`, under the name `answer` and with the answer's `select`; with no entry scope it is `createScope({ name: 'answer', tools: [], select })`. The answer pass never touches `context.scope` (F17).
- A scope widened during a request therefore adds no tool, instruction, skill, memo, or file to either pass before the next request, and a scope narrowed during it still reaches the next turn's tools.
- The plan's `recall` narrowing keeps its `apply` and restore (F1).
- The plan subtracts the price of the set the first pass advertises, by the rule `#spared` holds (F14): `total = max(0, (capacity − predict) × share.prompt − (overhead − spared(A_plan))) / (1 + drift)`.
- The digest is recomputed at each `respond` entry; a difference drops the gauge and calibrates before the pass.
- `renderStub` gains `offered`, so a hidden stub names `recall` only when the admitted rung advertises it. The tail's stubs render before the rung is admitted (L:1597-1601 before L:1240-1272), so the plan renders them again after admission; the second render can only shorten a stub, so no price rises.
- Unit 1B has already rewritten the call form of the ledger's `build` callers. Five remain after L:1665 goes: L:557, L:1021, L:1747, L:1961, and L:1974. Phase 3 gives the shown set to four of them: the plan's head at L:1021, `#recall` at L:1747, and the answer note's two fits at L:1961 and L:1974 (claim 3.19). The calibration call at L:557 passes none, in phase 3 as in phase 1, because it reads a ratio over the ungated set (§ The ledger's other changes in phase 3).

**Claims.** "Scripted" means a deterministic test over a scripted provider that records every request it receives, with no model. "Mutation" means the probe `.agents/orchestration.md` § Size gate names, on the load-bearing line.

- **1.1** With a run `scope` absent, every dispatched request equals 0.0.40's. *A seeded differential: the same scripted scenarios run against a tree extracted from `e6a3ae75` with `git archive` and against the candidate, per `quality.md` § Probes before arguments, comparing every recorded request. The `titles.ts` census against `e6a3ae75` is the separate check that no test was lost.*
- **1.2** Under generated context scopes, run scopes, and `apply` calls, a turn advertises no definition outside the two `tools` lists intersected. *Scripted over seeded sequences; mutation.*
- **1.3** A narrower `context.apply` mid-run hides a tool at the next turn, and a call from the earlier advertisement returns `SCOPE_NOTE` with no decision. A wider `apply` never advertises a tool the run scope excludes. *Scripted; mutation that reads the run scope alone.*
- **1.4** The run scope's `select` runs in place of the context scope's, which runs in place of the agent default. *Scripted.*
- **1.5** Overlapping runs on distinct conversations of one agent, with different run scopes, each advertise their own. A scope whose lists read differently on a second read is read one time a turn. *Scripted.*
- **1.6** A run `scope` that `isScope` refuses throws `ContractError` `'placement'` synchronously through `requireScope`, before any state changes. `isScope` is total, reads each member one time, and admits any implementation of `ScopeInterface`: a string `id` and `name`, each list absent or an array of strings, `select` absent or a function, and a `narrow` function. *Scripted, with a throwing getter, a proxy, and a class instance.*
- **1.7** `request` carries the request the provider receives at each turn, after a fold as well, and the conversation the run is bound to. The loop freezes the admitted request object and its `messages` and `tools` arrays at the emit, after admission, so the request a fold rebuilt (A:842) is the one frozen. A listener therefore cannot replace, add, remove, or reorder a message or a definition, and cannot replace `options`. The freeze is one level deep, and the claim reaches no further: each message is the conversation's stored record, which `conversation.message(id)` and `conversation.messages()` already hand any holder unfrozen (`Conversation.ts:188-192`, `:379-398`), and `options` and each definition are objects the turn shares with the agent. A listener on the agent's emitter is host code, trusted as a `turn` listener is, and the event hands it no write it lacks; the guide says a `request` listener reads and never writes (claim 1.15). A turn cancelled before dispatch emits none. *Scripted: a listener's write to the request object or to either array throws, the provider receives the request the listener read, and the case runs with a fold on that turn as well.*
- **1.8** A `turn` listener that changes the context scope after the ledger's listener cannot make a pass that dispatched no tools loop to `limit`. The ledger's recorded tool count equals each dispatched request's. *Scripted, red on `e6a3ae75`.*
- **1.9** The answer pass advertises nothing, leaves `context.scope` identical before and after, and a call there ends the pass after one generation. *Scripted.*
- **1.10** A scope widened during a ledger request adds no tool to either pass and no instruction, skill, memo, or file to the answer pass's head before the next request. A scope narrowed during it hides the tool at the next turn. *Scripted, with the widening placed before the answer pass.*
- **1.11** A definition added to or removed from the ledger's manager between `respond` calls calibrates before the pass. *Scripted by counting calibration calls, red on `e6a3ae75`.*
- **1.12** With `B = (capacity − predict) × share.prompt` and `s` the value `#spared` returns for the set the first pass advertises (F14), the plan's budget is `max(0, B − (overhead − s)) / 1.06`. It rises by exactly `s / 1.06` over 0.0.40's where `B ≥ overhead`, by less where `B < overhead`, which is the region a manager larger than the room sits in, and by nothing where `s = 0`. `s` is piecewise, as § The ledger's pricing writes it: `overhead` when the advertised set is empty, 0 when no calibrated definition is hidden, and `min(overhead, scale × E(hidden))` otherwise. *Scripted over generated `B`, `overhead`, and advertised sets that cover both sides of the clamp and each of the three branches, the empty advertised set with `scale × E(all) < overhead` among them; mutation.*
- **1.13** A hidden stub names `recall` only when the admitted rung advertises it. *Scripted.*
- **1.14** `AgentFanout` refuses, before any spawn, a child job that exceeds its parent on any row of the table in § The `AgentFanout` subset hole: tools, authority, provider, scheduler, limit, timeout, or budget. A child within every row spawns. A retried parent checks again and spawns its children on its first attempt alone. *Scripted with one case a row, red on `e6a3ae75` for each; mutation of each comparison.*
- **1.15** These documentation defects are gone, and each added guide passage is an executed fence: `strict`'s two defaults (AT:525, AT:659; A:209); the `authority` remark that names a default `Authority` (AT:503-505) where the constructor sets none (A:207) and the loop denies (A:1002-1007); "need separate agents" (G:3289); the do-not-forward list (G:2587), which gains `request`, with the statement that a `request` listener is host code that reads the request and never writes to it. *Gate: `npm run test:guides`.*
- **1.16** `scaffold surface` reports no collision for `ContextBuildOptions`, `intersectFilters`, `isScope`, `requireScope`, and `scanJobTree`. *Gate.*
- **1.17** The fan-out check walks the whole tree under a root job before that root spawns or runs: a violation at any depth refuses the root with `AgentError('REGISTRY')`, and no unit of the tree has run. Each descendant is audited through `agentJobContract` first, so a malformed child refuses with `'REGISTRY'` and its faults, never a `TypeError`. *Scripted with a depth-2 violation and a malformed grandchild, counting provider calls.*

**The round's repair: the ledger's agent.** The falsify round found that a run on another conversation of a ledger's agent still reaches the ledger. Of the ledger's listeners, only `request` read the conversation, so such a run moved the gauge, shared the repeat stop, aborted the ledger's pass, and read the ledger's conversation through `recall` and the lookups. The listeners were already unscoped at `e6a3ae75`.

The consultant ruled that the ledger removes the capability rather than check each event. `LedgerInterface.agent` becomes `LedgerAgentInterface`, `Pick<AgentInterface, 'emitter' | 'id' | 'status' | 'context' | 'abort'>`, one frozen record built in the constructor, so `respond` is the only caller that can start a run on the ledger's agent. The ledger starts a run at one site, bound to its conversation, and `respond` admits one call at a time, so every unscoped read of the listeners reads the request of the run that emitted the event. The `request` listener drops its conversation comparison, which no reachable input can make false. `#select`'s ownership check stays, because a host can still call `agent.context.select` by hand. Nothing changes in `Agent.ts` or `AgentEventMap`; claim 1.7 stands for a bare agent's overlapping runs.

Two alternatives were ruled out:
- Per-run identity on events leaves the tool half open, because `ToolContext` and `AuthorityContext` carry no run.
- Stating the rule and deferring leaves open a run whose newest message isn't a user message, which reaches the provider under the default `strict`.

- **1.18** `ledger.agent` holds `emitter`, `id`, `status`, `context`, and `abort`, and no `generate` or `stream` member, own or inherited, on a ledger built bare and on one hydrated from a snapshot. The value is frozen. `ledger.agent.generate` and `ledger.agent.stream` do not typecheck. *Scripted, with a type proof; red on `e6a3ae75`; mutation that returns the agent itself.*
- **1.19** Every run on the ledger's agent is a pass of the active `respond` call. Over requests that take one pass and requests that take the answer pass, the `start` events equal the passes the results report, and each `request` event's conversation is the ledger's. *Scripted.*
- **1.20** The record is live: `agent.status` reads `running` during a pass and the settled status after it, and `agent.abort(reason)` ends the active pass partial with that reason. *Scripted; mutation that copies `status` at construction.*
- **1.21** A direct `agent.context.select` for a message no active `respond` call owns returns a selection whose `fault` is `LedgerError('REQUEST')`, on the ledger's conversation and on another one, and the refusal over another conversation carries that conversation's view alone. *Scripted, restating the existing cases without a run; mutation of the conversation comparison in `#select`.*
- **1.22** A lookup tool that awaits a second thread, written the only way the surface allows (a second ledger or a second agent), leaves the first ledger's gauge after both requests equal to its control arm's. *Scripted, on a deterministic provider.*
- **1.23** `scaffold surface` reports no collision for `LedgerAgentInterface`. *Gate.*

**Release bar.** Claims 1.1 to 1.23 closed with independent receipts; the round all-confirmed or repaired, re-audited one time, and closed; the tree-wide gates green, with the `distribution` project. A finding outside the claims blocks only on a consequence § The release bar lists.

**Stops.**

| Seam | Stop | Reopens on |
| --- | --- | --- |
| Ceiling composition | intersection of host layers | the user's word |
| A pass's bound scope | the scope at `respond` entry | a ledger host that must widen inside a request |
| Fan-out check | a child within its parent on every row | a consumer that needs a child job on another provider or under another principal, which is a root job |
| Head text after a narrowing | a narrowed `instructions`, `skills`, `memos`, or `files` list reaches the head at the next build site, as at 0.0.40 (AT:565-568) | phase 2, which makes it the next turn (claim 2.20) |
| Repair depth | one repair round, then a design question | `.agents/orchestration.md` § Size gate's signals |

**Hands phase 2:** the per-turn ceiling, `ContextBuildOptions`, `intersectFilters`, `isScope`, the `request` event, the per-`respond` digest, and subset pricing.

### Phase 2. Disclosure in the agent

**Goal.** A bare agent's model loads a skill, reads and writes memos, and switches a workspace within its ceiling, and the head follows at the next turn.

**Proofs that come first.**

- **The derivation table.** `collectDisclosure` and its table (claim 2.3) are written and green before the loop reads them. When a row of the class cannot be derived exactly, the phase stops with a design question, and the stored-entity option of § Point 2 is its alternative. Phase 0 runs the table first.
- **Definition equality.** A probe shows that `createTool` values built from one declaration project equal definitions, so a run's definitions equal `collectBuiltinDefinitions` (claim 2.15). Only a run of `createTool` settles it.

**Units.**

| Unit | Owned files | Depends on | Order | Size | Weight |
| --- | --- | --- | --- | --- | --- |
| 2A declarations | `contexts/types.ts`, `agents/types.ts`, `contexts/constants.ts`, `agents/constants.ts`, `agents/shapers.ts`, `agents/contracts.ts`, `agents/errors.ts`; `core/helpers.ts` (`findToolCall`) with its four callers at L:711, L:747, L:1491, and L:1594, and its test block moved from `tests/src/core/ledgers/helpers.test.ts:623-662` to `tests/src/core/helpers.test.ts` (F45); in `guides/agent.md`, the Surface row of `findLedgerCall` at G:1738 removed, a `findToolCall` row added to the root helpers' Surface table beside `collectToolGroups` (G:965), and the two test-list entries at G:3721 and G:3775 moved with the block | phase 1 | first | medium | 0.5 |
| 2B contexts | `contexts/AgentContext.ts`, `scopes/Scope.ts` (`workspaces`), `skills/SkillManager.ts`, `contexts/helpers.ts`, their tests | 2A | serial | medium | 0.75 |
| 2C agent loop | `agents/Agent.ts`, with its held-instance sites at A:1094, A:1115, and A:1172 and its build path at A:887-939; `agents/AgentRun.ts`; `agents/helpers.ts`; their tests; the `INTERNAL` row at `tests/guides.test.ts:57` | 2B | serial | medium: authority, concurrency, untrusted input | 2.25 |
| Falsify round and its repairs | — | 2C | — | — | 1.0 |
| 2D documentation | `guides/agent.md`, `tests/guides.test.ts`, TSDoc, `ROADMAP.md` | the round | after the round | medium | 0.5 |
| Verifier, tree-wide, one time | — | 2D | — | — | 0.25 |

**Claims.**

- **2.1** With `builtins` and `workspace` absent, every dispatched request equals phase 1's, whatever `tools` the registered skills name. *A seeded differential against a tree extracted from phase 1's accepted commit, as claim 1.1 runs it; the `titles.ts` census as the separate check.* Restated on 2026-11-12 by the O-and-D ruling.
- **2.2** A built-in is advertised only where the turn's `tools` list admits its name, as any tool is. While `load` is advertised, a tool a registered skill names is advertised only while a shown skill names it; while `load` is not advertised, the allow-list alone decides. Excluding a skill through `scope.skills` never advertises a tool. *Scripted over generated sequences, with a scope that lists and one that omits `load`; mutation of the hold, which must redden a case where a held tool is advertised.*
- **2.3** `collectDisclosure` returns the skills whose last successful `load` no later successful `unload` follows, in first-load order, and the last successfully switched workspace. The table of the class: a denied call, a refused call, an aborted turn, a host tool message equal to a note under another call name, a `memo` body equal to a note, repeated call ids in one turn, a tool message with no owner, a fold, a cumulative fold, and a capped merge. *Scripted table; mutation that drops the note check.*
- **2.4** A `load` in turn k puts the body last in turn k+1's `system` message and the skill's admitted tools in turn k+1's definitions; turn k's request carries neither. In a batch `[load X, a tool of X]` the second call returns `SCOPE_NOTE` with no decision, and the identical call runs the next turn. *Scripted; mutation that disables the refresh comparison.*
- **2.5** Every dispatched request holds at most one `system` message, at index 0, across load, unload, switch, selection, fold, and a host-given workspace. A fold inside the admission of the turn after a load keeps the loaded body and the run scope in the rebuilt head. *Scripted, with a window sized to fold on that turn.*
- **2.6** After a refresh, the messages after the head equal the earlier additions by id. A run whose shown set does not change never rebuilds its head, read through a recorder passed as a skill `format.render`. *Scripted.*
- **2.7** A `workspace` renders from the run's first request within the ceiling; the run option replaces the agent option; the thread's last `switch` outranks both; an unregistered or excluded id renders none; a value that is not a string throws `ContractError` `'placement'` synchronously. *Scripted.* Restated on 2026-11-12 by the O-and-D ruling, which removed the skill clauses and the refusal to `unload` a host-given skill (claims C.4 and C.5).
- **2.8** A ceiling narrowed mid-run drops a loaded body and its tools at the next turn, and they return when the ceiling admits the skill again, with no further `load`. *Scripted.*
- **2.9** Overlapping runs on distinct conversations of one agent, with different run scopes and `workspace`, each advertise and render their own. *Scripted.* Restated on 2026-11-12 by the O-and-D ruling.
- **2.10** A conversation restored from a `ConversationSnapshot` shows the same skills and workspace as before the snapshot. *Scripted.*
- **2.11** `collectDisclosure` over a 1600-message conversation reads at most 6.6 ms, and at most 2.5 times that at 3200 messages, on the run that records the reading. The bar is 1% of the 660 ms selection stop `methods.md:170` records from a measured 13206 ms 4B call. *Bench probe.*
- **2.12** For `load`, `memo`, and `switch`, an absent name and a name outside the ceiling return byte-identical text that lists the admitted names and holds no text of the argument beyond them. A refusal lists at most `BUILTIN_LIMITS.candidates` names, in registry order, and then one fixed sentence that points at the index. *Scripted table, with a registry larger than the cap.*
- **2.13** `memo` returns the current revision's content in the tool role. No memo name, description, or content appears in any `system` message, with a planted heading and a planted line break. *Scripted.*
- **2.14** `remember` runs only where the turn's ceiling defines `memos` and lists the name: with the list undefined it is not advertised and its handler refuses, and a name the list omits refuses. It creates a name no memo holds, and revises a memo only when that memo's current revision carries the run's conversation as its `origin`; any other existing name refuses and writes nothing, so a host-authored memo and another thread's memo are never revised. Under an allow fallback and no approver it is denied as unanswered; with an approver it writes one revision whose `origin` names the run's conversation. A name or description with a control, format, or separator code point, and an over-limit member, refuse. No built-in removes a memo. Over generated requests under an approve-all authority, the memo index never holds a name outside the ceiling's list. *Scripted, red first for the overwrite on a build without the origin check; mutation that drops the annotation; mutation that drops the origin check.*
- **2.15** `switch` runs only where the turn's ceiling defines `workspaces` and lists the id: with the list undefined it is not advertised and its handler refuses. It renders the chosen workspace's text and images for that conversation alone and never moves `workspaces.active`. The workspace index renders in the context message, and only while `switch` is advertised. `Scope.narrow` intersects `workspaces`. *Scripted; mutation that drops the list from `intersectFilters`.* A run's advertised built-in definitions equal `collectBuiltinDefinitions` of its options. *Scripted.*
- **2.16** Each row of § Construction and call refusals that phase 2 adds refuses as tabled. A tool a host adds later under a reserved name is never advertised or dispatched. No built-in call changes `context.scope`, a run scope, or a `Scope` value, by identity. The approval check, the changed-instance check, and dispatch each read a reserved name's instance from the run, never from the host's manager. *Scripted.*
- **2.17** A relay refuses a page request whose `system` message carries a loaded body unless `system.accept`, and a built-in definition the server did not declare unless `tools.accept`. A server that lists `collectBuiltinDefinitions` forwards them. *Scripted.*
- **2.18** `Skill.content`'s TSDoc (CT:674, CT:688), "every turn" where the prompt changes per build site (G:3183, G:3194, G:3714; lines 13 and 669 match the phrase and are ruled by their sense), the host skill pattern (G:304), and the "inert" sentence (G:2554) are corrected, with each added passage an executed fence. The passage that replaces G:304 states that a load belongs to one conversation, where the old pattern served every conversation of the agent. The scope timing at AT:565-568 and G:496 is restated to claim 2.20's. *Gate.*
- **2.19** `scaffold surface` reports no collision for the names phase 2 adds. Only a `scaffold surface` run settles it. *Gate.*
- **2.20** From phase 2, a context scope or run scope whose `instructions`, `skills`, `memos`, `files`, or `workspaces` list changes mid-run rebuilds the head at the next turn, so a narrowed list leaves the next request. A skill replaced under its name mid-run changes its body and its tools at the same turn. A run whose ceiling and shown set do not change never rebuilds. *Scripted; mutation of each comparison.*
- **2.21** A built-in's handler reads the ceiling live when it runs, not the turn's snapshot: a `memo`, `remember`, `load`, or `switch` admitted under one ceiling and dispatched after a narrowing that excludes its name refuses. *Scripted, with the narrowing made from an `allow` listener.*
- **2.22** A `remember` the approver approves runs the run's own instance; a refused one runs nothing; a tool a host registers under `remember` between the ask and the answer changes neither outcome. *Scripted, with an approver.*

**Release bar.** As phase 1's, over claims 2.1 to 2.22.

**Stops.**

| Seam | Stop | Reopens on |
| --- | --- | --- |
| Holding tools back | by registered skills, only while `load` is advertised | a consumer that must hide a tool it also lists in a scope with no `load` |
| Derivation by note text | exact match of `BUILTIN_NOTES`, paired by `findToolCall` | a `Message` member that records a call's success, or a record the ceiling cannot contain |
| Head refresh trigger | a change to the shown set, to a ceiling list, or to whether `switch` is advertised (§ The turn, step 5) | a consumer whose mid-run host edit must reach the next turn with no such change |
| Body placement | last in `system` | phase 3's reading: first text after a load past its bar, or item 6's count of unrequested loads |
| Memo writes | `consequential`; only a name a defined `ceiling.memos` lists; create, or revise what this conversation wrote; single-line index text; no removal | a reading of stale or misleading memos through approved writes; a consumer whose model must name its own memos |
| Refusal size | at most `BUILTIN_LIMITS.candidates` names | a model that cannot find a name the cap left out |
| A bare agent's room | its `window`, as for any tool result | a bare-agent consumer whose run a load ends with `'WINDOW'` |

**Hands phase 3:** `resolveDisclosure`, `filterAdvertisedTools`, `collectBuiltinDefinitions`, `BUILTIN_NOTES`, and the `build` options that carry the shown set.

**As built.** Phase 2 closed on these accepted deviations from the text above. Each one keeps an earlier claim or a rule this design did not state.
- **Placement.**
  - `collectDisclosure` sits in `agents/helpers.ts`, as designed. It never imports `contexts/` into `agents/`.
  - The built-in tool descriptions and annotations are `BUILTIN_TOOLS`, a record keyed by name in `agents/constants.ts`.
  - The argument contracts are `loadToolContract`, `memoToolContract`, `rememberToolContract`, and `switchToolContract`, paired with their shapes in `builtinToolContracts` in `agents/contracts.ts`.
  - Each built-in tool is built by `createBuiltinTool` in `agents/factories.ts`.
  - `isAgentBuiltin` narrows names, in `agents/validators.ts`.
  - `helpers.ts` imports no shaper (`architecture.md` § Keep the leaf pair class-free).
- **Signatures.**
  - `resolveDisclosure` takes the ceiling the turn already read and the run's enabled built-ins, not the run scope, so claim 1.5's one read a turn holds. The entry read serves as the entry build's read.
  - `collectDisclosure` takes the run's enabled built-ins, and counts only their records.
- **Derivation.**
  - A built-in call's stored arguments are admitted by the same contract and lossless repair as the tool door, so a reply and the view agree.
  - A reload after an unload goes last, not at its first-load place.
  - A stored record cannot show who wrote it, so a record written under a built-in's name while that built-in was off counts once it is on, still bounded by the registry and the ceiling.
- **Refusals.**
  - `unload` of a host-given skill always refuses, whether or not the model also loaded it.
  - `remember` refuses a name or description that is blank, meaning empty after removing white space and default-ignorable code points (`ARGUMENT_BLANK_PATTERN`). The one-line check is `ARGUMENT_CONTROL_PATTERN`.
  - `SkillManager` refuses a `tools` member that isn't absent or a dense list of strings, with `ContractError('placement')`, reading it once.
- **Caps.** `BUILTIN_LIMITS` counts code points, as `stringShape` counts them, not UTF-16 code units.
- **The context.**
  - An unregistered `disclosure.workspace` renders no workspace.
  - The active workspace is hidden when the ceiling's `workspaces` list excludes it.
  - `renderIndexLine` keeps a workspace index entry on one line.
- **Claim 2.1.** Requests equal phase 1's over every scenario with no mid-run list change. Under claim 2.20, a changed scenario differs in the rebuilt head. Where a window folds, it may also differ in the tail, but only together with a changed fold decision.

**As ruled, 2026-11-12.** The cut removed the host's `disclosure` option from the agent and the run, so the preceding lines on `unload` of a host-given skill and on `disclosure.workspace` record a surface `46ae3811` is the last tree to hold. The `workspace` option takes the workspace half, and every shown skill is one the thread loaded. Unit R restated how claim 2.2's hold reads the allow-list: an allow-list that admits no `load` definition decides alone, whatever the ceiling's `skills` list holds (claims T.1 to T.4). Claims 2.3, 2.4, 2.8, 2.10, and 2.20 read the record and are unchanged. § The re-prepared 0.0.42 holds each change and its claims.

### The durable-job unit

**Ruling, the user, 2026-11-10.** A durable job's input carries a narrowing scope and disclosure, checked against its parent. The unit is built in this campaign, after phase 2, with weight 1.0 (3.4 lane hours, provisional). The cut of 2026-11-12 keeps the job's `workspace` and removes its skill half (§ The re-prepared 0.0.42).

- A job's agent holds tools alone at 0.0.40, and its `tools` list is already its ceiling (F11). A scope filters nothing a job has unless its agent carries instructions, skills, memos, and workspaces.
- A meaningful carriage therefore needs registry pools for skills, instructions, memos, and workspaces, job keys that name them, `builtins`, and a scope. The unit's brief fixes that shape when the unit is estimated, and decides whether the check against the parent extends `scanJobTree` (§ The `AgentFanout` subset hole).
- A job's `children` cross the job contract as JSON records, each audited only at its own `build` (F39), so the check reads each descendant through `agentJobContract` first, as claim 1.17 does.
- The unit's claims are set when the unit is reached.

**The shape, ruled by the consultant on 2026-11-11.** A job carries the serializable part of what an agent takes, and the registry holds the live part. The ruling builds no per-name pool, no job key that names a pool entry, and no instructions pool, and extends `scanJobTree`.
- `AgentRegistryOptions` gains pre-built `skills`, `memos`, and `workspaces` managers, which every scoped job the registry builds shares. No instructions pool exists: a job's `system` carries its host text.
- `AgentJobInput` gains `scope`, `workspace`, and `builtins`, each optional; `workspace` replaced `disclosure` in the cut of 2026-11-12. A job's `scope` is `Required<Pick<ScopeFilter, 'skills' | 'memos' | 'workspaces'>>`: a job that carries one states each list, with `[]` for none, and a job that carries none is passed no pool, as a job with no `tools` is passed no tool manager. The scope holds no `tools`, `files`, or `instructions` list; a job's `tools` and `builtins` are its tool ceiling.
- `scanJobTree` holds a child within its parent on `scope`, each list within its parent's same list, and on `builtins`. `workspace` is free within the child's own scope.
- A job that names tools or built-ins and no authority refuses at `build` with `AgentError('REGISTRY')`. A job's `remember` runs only under a registry authority whose `ask` answers by itself, because a job drains no frames.
- Probes P1 and P2 ran first on a scripted provider: P1 passed 15 of 15, and P2 7 of 7, with 44 of 166 seeded pairs admitted and none exceeding its parent.

**Claims.**
- **D.1** With `scope`, `workspace`, and `builtins` absent from every job, every dispatched request and every `scanJobTree` result equals `a1e626a1`'s, on a registry that holds the pools and on one that holds none. *Seeded differential against `a1e626a1`.* Restated on 2026-11-12 by the O-and-D ruling, and read against `46ae3811` by claim C.1.
- **D.2** `agentJobContract` admits a job whose `scope` holds the three lists, and refuses a scope that omits one or holds another member, a `workspace` that is not a string, a job that carries `disclosure` as it refuses any undeclared member, and a `builtins` entry that is no `AgentBuiltin`, each with `AgentError('REGISTRY')` at `build`, and in a tree before any unit runs. *Scripted table.* Restated on 2026-11-12 by the O-and-D ruling.
- **D.3** A job with no `scope` renders no skill index, memo index, or workspace text, whatever the registry holds; a scoped job renders exactly the listed names its pools hold; a job restored from a queue store dispatches the requests the enqueued job dispatches. *Scripted; mutations of the scope and of each list.*
- **D.4** A job's `workspace` renders in place of the active one; an id its scope omits, an id the pool lacks, and any `workspace` on a job with no `scope` render none. *Scripted.* Restated on 2026-11-12 by the O-and-D ruling, which removed the skill clause.
- **D.5** A job's `builtins` are advertised from its first request and each call reaches the `evaluate` of the authority its `authority` key names; built-ins with no authority refuse at `build` with `'REGISTRY'`. *Scripted; mutation of the condition.*
- **D.6** On a job, `remember` under an authority with no `ask` is denied as unanswered and writes nothing; under an approving `ask` it writes one revision whose `origin` is the job's conversation, only for a listed name; a second build's or a retried attempt's `remember` of that name refuses. *Scripted.*
- **D.7** Two overlapping jobs of one registry each render their own scope's, and a memo one job wrote is in the index of a later job whose scope lists its name and of no job whose scope omits it. *Scripted.*
- **D.8** `AgentFanout` refuses, before any spawn, a child that exceeds its parent on the `scope` row or the `builtins` row, and a child within both spawns; over seeded trees the scan clears, no child advertises or renders anything its parent's ceiling omits, a child whose `workspace` names one outside its parent's scope included. *Scripted; mutation of each comparison.* Restated on 2026-11-12 by the O-and-D ruling.
- **D.9** The guide's statements are executed fences where they assert a value, and the `AgentFanout` rule line reads "a child job must stay within its parent on tools, builtins, scope, authority, provider, scheduler, limit, timeout, and budget; enqueue a job that needs more as a root job". *Gate.*

**Stops.**

| Seam | Stop | Reopens on |
| --- | --- | --- |
| The pools | the registry's `skills`, `memos`, and `workspaces` managers, shared by every scoped job | a consumer whose jobs must share named instruction texts; a consumer whose jobs of several principals run through one registry |
| The job scope's lists | `skills`, `memos`, `workspaces`, each required | a consumer whose job must hide files of a workspace it holds |
| `workspace` against the parent | held by the ceiling, with no row | the user's word; a trace showing a child that renders a workspace its parent's scope omits |
| Asks on a job | the registry authority's own `ask` | ROADMAP items 26 and 34 |
| A retried job's memo | not revised | a consumer whose retried job must revise it |
| Repair depth | one repair round, then a design question | `.agents/orchestration.md` § Size gate's signals |

**As built.** The unit closed on 2026-11-11. Claims D.1 to D.9 went red, then green: `src:core` 3273 of 3273 and `test:guides` 229 of 229, with mutations m1 to m12 caught. D.1's differential is exact over 120 jobs and 309 requests, and 160 trees and 340 findings. Its review passed: 700 seeded parent and child pairs gave 152 admitted, none of them exceeding its parent, and 35 malformed members each refused.
- **The empty-list rule,** the Orchestrator's, on probe P1's open reading: a built-in whose ceiling list is defined and empty is treated as undefined, neither advertised nor run. `remember` is withheld under `memos: []`, `switch` under `workspaces: []`, and, from phase 3's round, `load` and `unload` under `skills: []`. It amends claims 2.14 and 2.15 for every agent, and `filterBuiltinCandidates` holds it.
- **Accepted deviations.**
  - the export `filterBuiltinCandidates`, with its guide row
  - three lines in `AgentRun.ts`
  - the refusal reads "names tools or builtins and no authority"
  - D.7 checks later jobs only, because a job sees its own memo at the next head rebuild, as unit 2D documented
- **After review.** A case in `DURABLE_EXCESS_CASES`, a memo that shares a name with a skill the parent lists, kills the union mutation `mf` the review found surviving. `renderDurableJob` became `executeDurableJob`, because `render*` names a text result.
- Unit 3C wrote the guide's statements of the ruling.

**As ruled, 2026-11-12.** The cut gave the job `workspace` in place of `disclosure` and restated D.1, D.2, D.4, and D.8; the durable-pair sweep draws a workspace where it drew a disclosure. Unit R built D24: `agentJobShape` states each bound a build reads and refuses a `system` message, and `collectJobRefusals` reports what the shape cannot state, so `scanJobTree` refuses every such job of a tree before anything spawns and `AgentRegistry.build` refuses it as a record. A job's malformed `limit` or `builtins` reads `'REGISTRY'` where it read `'LIMIT'` or `'BUILTIN'` (claims J.1 to J.5, § The re-prepared 0.0.42).

### Phase 3. Disclosure in the ledger

**Goal.** A ledger enables the built-ins, prices what each pass advertises and shows, and admits a load only where the request and the thread have room. Taverna's catalog runs through it on the 4B.

**The probe that comes first: definition density.** No fact exists for the tokens a definition costs beyond the calibrated set. The probe decides § Points 6 and 7's addition term before unit 3A is briefed, and phase 0 runs it.

- **What it runs.** Through the ledger's own provider calls with `think: false`, as calibration does (L:566-570): one bare call, one with a calibrated set `C`, and one with `C` and an added set `X`. `X` is drawn from a fixture of taverna's mean definition size and from the desk catalog's areas in `studies/tools`. It reads `T(X) = prompt(C ∪ X) − prompt(C)`.
- **The service it reaches.** The local model service, with the 4B. `verifier` runs it in the shared execution lane. It reads token counts; no model output is a test subject.
- **The decision rule, set before it runs.** Each call of a sample runs twice, and the largest difference between two identical calls is the probe's noise `n`. A sample `X` is a whole skill's definitions of the fixture, never a single definition, so a tokenizer boundary cannot decide it. When `T(X) ≤ max(scale, overhead / E(C)) × E(X) + n` on every sample, the addition term of § The mechanism ships as written. When any sample exceeds it, the phase stops with one design question: a third calibration call that measures density on a held-back sample, which would add a stored member to `LedgerGauge`. The report states `n` and each sample's `T(X)` beside its bound. The rule's addition term holds until a run settles it.
- **Its price.** Three provider calls a sample, each a prompt evaluation with no generation. No wall-time measurement exists.

**Units.**

| Unit | Owned files | Depends on | Order | Size | Weight |
| --- | --- | --- | --- | --- | --- |
| The density probe and its ruling | throwaway probe | phase 2 | runs in phase 0, before 3A | — | 0.25 |
| 3A ledger | `ledgers/types.ts`, `ledgers/constants.ts`, `ledgers/Ledger.ts`, `Gauge.ts`, `LedgerRequest.ts`, `ledgers/helpers.ts` (`computeToolPrice`, `computeSkillPrice`), their tests | the probe | serial | medium | 1.75 |
| 3B-a desk declarations and grading | `studies/desk/` (`types.ts`, `constants.ts`, `validators.ts`, `helpers.ts`, `scenarios/`), the declaration `studies/disclosure/` with its rubric, and their tests under `tests/studies/desk/` and `tests/studies/disclosure/` | — | beside 3A | medium | 0.35 |
| 3B-b desk session and installed path | `studies/desk/` (`adapters/`, `drivers/`, `sessions/`, `factories.ts`, `index.ts`, `profiles/screen.json`), the policies in `tests/setupStudy.ts`, `tests/studies/desk/integration.test.ts`, and the rows of `studies/README.md` | 3A, 3B-a | after 3A | medium | 0.4 |
| Consumer run | taverna's repository, against a local build of Agent | 3A | before the round | — | 1.0 |
| Falsify round and its repairs | — | 3A, the consumer run | — | — | 1.0 |
| The reading | — | 3B, the round and its repairs | after the round, before 3C; `verifier` runs it in the shared execution lane | — | at most 2.4 runner hours |
| 3C documentation | `guides/agent.md`, `tests/guides.test.ts`, TSDoc, `ROADMAP.md`; among them the composition the guide recommends to a small-model host, written from the reading's report, and the removal of ROADMAP item 6 | the reading's report | after the reading | medium | 0.5 |
| Verifier, tree-wide, one time | — | 3C | last | — | 0.25 |

The reading runs on the behavior the round and its repairs left, which no later unit changes: unit 3C edits the guide, the guide's test, TSDoc, and the roadmap alone. Unit 3C therefore owns both edits that depend on the reading, and the verifier's gates run over them. A claim of this design the reading falsifies holds the release, as point 14 states, and its repair lands before 3C starts.

**Claims.**

- **3.1** With `agent.builtins` and `agent.workspace` absent and no skill naming tools, every request of a thread equals the preceding phase's up to the first request the ledger prices over `capacity − predict`, which is not dispatched. Every plan budget equals the preceding phase's wherever the stored scale does. The scale differs only after a first call that advertised part of the calibrated set, where the preceding phase read the call as bare and the ledger keeps the scale it held. On a provider that charges a definition in proportion to its estimate, the ledger refuses no first request whose charge, with the drift, is within the limit. *Seeded differential against `a1e626a1` on two providers, each supplied gauge stating what its provider charges. Proportional: `differing` holds `over`, `margin`, and `gauge` rows alone. Flat: the same and `spare`, each reported with its count, and the count of under-priced dispatches. The control reruns on the proportional arm.* Restated on 2026-11-12 by the every-ledger, supplied-gauge, and spare-differential rulings; the user accepted it as a baseline (`plan.md` § Rulings). Restated again that day by the O-and-D ruling, and read under unit K by claim K.3's classes.
- **3.2** With 238 definitions of taverna's mean size held back by skills and an ungated core, calibration carries the ungated set alone and the plan's `total` is greater than 0. The 0.0.40 formula reads 0 on the same fixture. *Scripted, red first.*
- **3.3** The exported `computeToolPrice` returns `spared` and `added` for a calibrated set, an advertised set, and a gauge, comparing definitions by their JSON text, so a definition replaced under its name by another text is both hidden and added. An empty advertised set spares the whole overhead; the calibrated set spares and adds nothing; a subset spares the lower of `scale` and the calibrated set's overhead per estimate unit, times the hidden estimate, which is at most the hidden set's proportional share of the overhead, with no cap; a superset adds at the exported `computeToolDensity`, the higher of the two, which is `scale` for an empty calibrated set. The exported `computeSkillPrice` returns a skill's body at `scale` and its added definitions at the added rate. *Unit table over the three helpers, with a subset row on a gauge whose density is over its scale and one whose density is under it; mutations of the spared rate to `scale` and to the density, of the added rate's `max` each way, and of the text comparison. The `cap` mutation is retired with the cap.* Restated on 2026-11-12 by the host-act and spared-rate rulings.
- **3.4** The plan holds back the largest loadable skill's price and one result's price while the first pass advertises `load`, and nothing while it does not. *Scripted.*
- **3.5** A `load` whose price, with the turn's earlier commitments and one result's price, exceeds the measured remainder less `predict` is denied with the `overflow` note and changes nothing; one that fits is admitted. A `remember` is admitted by the same test without the result term. A lookup or a write the wrapper clears earlier in the same turn commits one result's price, so a `load` after it in the batch counts it. *Scripted, with a batch that holds a lookup and a load; mutation of each term.*
- **3.6** A `load` that would take the thread's shown skills, with the loads its batch already admitted, past `share.skills` of the prompt budget is denied with the `overflow` note. After a successful `unload` in the same request, every call the room denied is evaluated again, and the same `load` is admitted where it fits; with no `unload` between, the identical retry is a repeat. *Scripted, in one batch, in one request, and across two; mutation that leaves `request.loads` out of the share.* Restated on 2026-11-11 by the room ruling, and on the reopen by the `switch` ruling.
- **3.7** A definition added to or removed from the calibrated set between `respond` calls calibrates before the pass. A ceiling change, a `load`, and an edit to a held-back definition do not. *Scripted.*
- **3.8** The answer pass advertises nothing and carries every shown body. *Scripted.*
- **3.9** The identical second call of a built-in in one request returns a result whose text is the `repeat` denial, before the host's authority is read, and ends the pass. The wrapper's `evaluate` catches the throw of `LedgerRequest.admit` and returns a `deny` decision whose reason is `LEDGER_NOTES.repeat`; it never lets the throw reach the loop. *Scripted, asserting the tool message's text and that the pass ended; mutation that lets the throw through, which must redden it.*
- **3.10** No built-in tool message files a finding, a record, or a `recall` listing. The answer pass's results note, a stored `user` message (F42), carries a `memo` body and no acknowledgement. *Scripted.*
- **3.11** A ledger given `agent.builtins` and no `agent.authority` refuses at construction; with one, each built-in call reaches its `evaluate` and `ask`. *Scripted.*
- **3.12** A ledger hydrated from a `LedgerSnapshot` shows the skills and workspace its thread showed. Under a narrower ceiling the excluded names show nothing, the stored gauge is reused, and no calibration call is made. *Scripted.*
- **3.13** The guide's per-principal memo composition keeps both memos when two ledgers of one principal each `remember` one during overlapping requests. *Executed fence; unit 3C writes the fence.*
- **3.14** On the 4B, with taverna's catalog registered whole behind skills, nothing shown, and `load` advertised (arm `index`, D on a ledger), the first provider call of every request is served, a fresh thread's first request carries `load` and the ungated definitions other than `recall`, which the plan offers only when it holds something back (claim 1.13), and no tool a skill holds, and each request's first reported prompt is at most 15872. On arm `taverna` (O, the turn scope), the served and capacity clauses hold by its receipt. Each clause reads a call the plan composed before the model chose anything in that request, so no part of this claim depends on what the model chooses. The hydrate clause left the consumer gate: claim 3.12 proves it on a scripted provider, and the run reports it for each thread where the model loaded. The later turns of a request depend on the model: a lookup it chooses returns a result of any size (L:1701-1708), and every later reported prompt against 15872 is reported under claim 3.18 and holds nothing by itself. *Consumer run.* Restated on 2026-11-12 by the O-and-D ruling, with the fresh-thread clause's `recall` exception ruled when arm `index` was accepted.
- **3.15** On that run, each request's first reported prompt is at most the plan's priced estimate times 1.06, on arm `taverna`'s first calls, which read the spared term, and on arm `index`'s first calls. An arm `index` first call on a thread that shows no skill reads the calibrated set and the holdback; one on a thread that shows a loaded skill reads the addition term. The run reports the count of each, and the addition term's first calls are held to the bar wherever they occur. *Consumer run.* Widened to arm `taverna` on 2026-11-12 by the spared-rate ruling, and restated that day by the O-and-D ruling, which removed arm `shown`.
- **3.16** The reading of § The 4B reading is run and reported with its priced arm table. *Reading.*
- **3.17** `scaffold surface` reports no collision for the names phase 3 adds. The surface run reads exported names alone, so the unit also checks each added member by hand against the members of its own module: `overflow`, `commit`, `committed`, `skills`, and `added` name no existing member of `LedgerNote`, `LedgerRequestInterface`, `LedgerShare`, `GaugeCall`, or `GaugeInterface`. *Gate, and the review pass of 3A.*
- **3.18** On the scripted provider, the turn after an admitted `load` reports a prompt no greater than the preceding call's prompt and completion, the turn's stored messages, and `computeSkillPrice` of the skill, each at its rate and times 1.06. On the consumer run, the same comparison is reported for every turn that follows a `load` the model made, and every reported prompt after a request's first is reported against 15872. *Scripted; consumer run, reported.*
- **3.19** Every prompt the ledger builds for a request carries the request's shown set: the plan's head (L:1021), `#recall`'s carried estimate (L:1747), and the answer note's fit (L:1961, L:1974). After a `load`, a `recall` in the same request sizes its listing against a carried estimate that holds the loaded body, and the request stays within capacity. A thread that enters a request with skills shown plans its records against a head that holds their bodies. *Scripted, red first for the `recall` case on a build that omits the shown set at L:1747.*
- **3.20** In one request, `memo n`, a successful `remember n`, `memo n` returns the revised body; `load X`, a successful `unload X`, `load X` loads again; `switch A`, `switch B`, `switch A` switches back. With no such call between, each identical second call is a repeat. *Scripted.*

**The round's claims.** The 3A review and the round's lanes found a request dispatched over capacity after an admitted `load` or `remember`, a `switch` and a host-built head no admission read, host acts inside one request, a ledger with no built-in that sent a request over capacity, a supplied gauge that misstated its overhead, and a spared credit that priced the consumer's first call at a sixth of its charge. Seven consultant rulings answered them, and these claims are theirs, numbered as built. Each restated claim carries the wording of the last ruling the unit built.

- **3.21** The ledger prices every request of a pass as the loop composed it, at the `request` event, and the provider receives none it prices over `capacity − predict`: a first request, the first pass's or the answer pass's, by the index-0 terms, and a later one by `left`. A first pass or a later turn priced over ends with the abort reason `overflow`, the request records no call for it, the pass is partial, and the answer pass answers. The rule reads the same in every ledger, with `agent.builtins` absent too. *Scripted: the room repair's orderings and edges, each at its edge and one token short, rerun on the moved read; in a ledger with no built-in, a first request over the limit in claim 3.32's shape and a later turn after a lookup whose result exceeds the remainder, each asserting the provider's call count and the `abort` event's reason. Mutation of the stop and of each term of both prices (`rate0`, `extra`, `reply`, `slack`, `back`, `more`, `predict`), and a mutation that restores the built-in guard.*
- **3.22** Removed by review on 2026-11-12. It read that a gate whose terms fail ends the pass, and no input reaches that failure: at index 0 an unrenderable definition fails at the `respond` entry's digest or in the plan, before any request exists, and the definitions a sent request carries do not hold the unrenderable bound, so `computeToolPrice` and `estimateMessages` cannot throw on a sent request. The `attempt` around the gate's terms stands by review.
- **3.23** The seeded, model-free room sweep counts every provider call of every pass, the answer pass's included, and reads 0 calls whose recorded prompt plus `predict` exceeds capacity on arms c, e, mild, harsh, host, and `plain`. Arm `plain` runs the sweep's draws with `agent.builtins` absent, a workspace the host gives, and lookups whose results the draw sizes against the capacity. *Seeded sweep on `DensityLedgerProvider`. Reach, each above 0: on the harsh arm, switches carried and switches denied; on the host arm, first passes ended at their first call and `'OVERFLOW'` rejections; on arm `plain`, first-request ends, later-turn ends, and rejections. Control (b), the first-request read and the fit's refusal removed, reads calls over capacity on the host arm; control (a), the `switch` test removed, reddens through the `switch` stop; the built-in guard restored reads calls over capacity on arm `plain`.*
- **3.24** After the gate ends a pass on the turn after an admitted `load`, the answer pass advertises nothing, carries every shown body with the loaded one, and reports a prompt that with `predict` is at most capacity. *Scripted at the largest padding that admits the load, by bisection.*
- **3.25** A `recall` on the turn after a `load` sizes its listing at the rate the calls before the load measured: `#recallRate` skips a call whose `added` is above 0. *Scripted on `DensityLedgerProvider`, red first; mutation of the guard.*
- **3.26** A `switch` whose growth over the shown workspace, with the turn's earlier commitments, exceeds the measured remainder less `predict` is denied with the `overflow` note; the thread shows the workspace it showed, and the next turn and the next request are dispatched. A `switch` to a smaller workspace or to the shown one commits 0 and is admitted. After a successful `unload` in the same request the identical `switch` is evaluated again; with none between, it is a repeat. *Scripted, red first; a batch that holds a lookup and a `switch`; a numeric workspace id; mutation of the growth, `committed`, `drift`, `predict`, and the reopen.*
- **3.27** In every ledger, an answer request that prices over the allowance with no note and no partial reply makes `respond` reject with `LedgerError` code `'OVERFLOW'`: the provider receives no call for the answer pass, the conversation gains no note and no cue, and the ledger serves the next call, which answers after the host narrows the scope. A note that does not fit beside the base is left out, and the pass opens without it. An answer pass whose first request the gate prices over receives no provider call either, and `respond` rejects with the same error when the caller did not abort; the note and the cue then stay stored. *Scripted with a host-given workspace over the capacity, a base one notice short of the allowance, and a host act that grows the shown workspace at the answer pass's `start`, each with every built-in and with none; mutation of the refusal, of the note's test, and of the answer pass's read.*
- **3.28** Every price reads the definitions the gauge measured. A tool a host frees from a skill, adds to the manager, or replaces under its name inside a request prices as added from the next request of that pass, the call that carries it records `added` above 0, and the next `respond` calibrates. *Scripted for each of the three acts at the gate's bisected edge, red first on the room repair's tree for the freed and the replaced tool; mutation that reads the live set at each price site.*
- **3.29** The gate's rate and the fit's rate are at least the gauge's scale in every ledger. A `recall` listing is sized at `#recallRate` with no floor in every ledger. A note's cut is unchanged wherever the request's rate is at least the scale. *Scripted, red first on a scope that swaps one definition for another of the same count between two calls of one request, with the fit's case run in a ledger with no built-in; mutation of the floor in each reader. No test reddens the fit's floor; the row was closed on 2026-11-12, because the fit and the gate read one `#capacityRate` (§ Refused).*
- **3.30** A calibrated definition hidden on the last measured call and advertised on the next is charged the higher of the density and what its hiding was credited. *Scripted on `DensityLedgerProvider` at the edge and one token short, red first on the room repair's tree; mutation that prices the return at `scale`.*
- **3.31** The host-act sweep reads 0 calls whose recorded prompt plus `predict` exceeds capacity on every arm, counting every provider call of every pass. Its arms, each acting in the tool phase unless named: `hfree`, a skill replaced with no tools; `hswap`, a skill replaced with another area's tools; `hadd`, a tool added to the manager; `hedit`, a calibrated tool replaced under its name by a longer text; `hscope`, a scope change; `yield`, workspace growth, a freed skill, and a replaced body during `scheduler.yield()`; `listener`, workspace growth in a `turn` listener added after construction. *Seeded, model-free, on `DensityLedgerProvider`, at capacities of 700 to 8000 and `predict` up to 0.92 of capacity, 300 seeds an arm and 1500 for `hscope`. Each arm holds a reach count above 0. On the room repair's tree the arms read calls over the limit: `hfree` 17, `hswap` 14, `hadd` 14, `hedit` 6, `hscope` 1, `yield` 15, and `listener` 18. Each arm's control by mutation reads calls over capacity.*
- **3.32** A ledger with no built-in, whose definitions price most of the limit and whose host-given workspace exceeds the room they leave, sends no first request: the provider receives no call for the first pass, the agent's `abort` event carries `overflow`, and `passes[0]` is partial with empty content. The answer pass, which advertises nothing, carries the whole workspace and reports a prompt that with `predict` is at most capacity. With the workspace cut to the room, the first request is dispatched byte-equal to the preceding phase's. *Scripted on a provider that reports its estimate, in taverna's shape: 24 records, and the same ledger with 2 records dispatched. Red first on the room repair's tree, which sent 22865 against a capacity of 19968; mutation of the guard.*
- **3.33** A supplied gauge that states what its provider charges prices as a measured one. On the host arm's draws, arm `stated` supplies the gauge a twin ledger's `calibrate` returned on the same provider and definitions, and reads 0 calls whose charge plus `predict` exceeds capacity, counting every provider call of every pass; its ended passes, first passes ended at their first call, and `'OVERFLOW'` rejections equal the measured arm's. Arm `silent` runs the same draws on a provider that charges alike, reports no usage, and records its charge, and reads 0 too. *Seeded, model-free. Reach, above 0 on each arm: passes the gate ended, and admitted loads. Control by fixture: arm `low`, the supplied overhead under the provider's charge, reads calls over capacity on both providers. Control by mutation: the gate's stop removed, on both arms.*
- **3.34** The ledger compares a supplied gauge with no reported prompt, and each misstatement reads as the guide states. An overhead stated over the provider's charge refuses a first request the provider charges within the limit, with `overflow` on the agent's `abort` event. An overhead stated under it sends a first request whose reported prompt plus `predict` exceeds capacity. An overhead stated over it, after a first request whose first call advertised every calibrated definition, leaves `ledger.gauge.scale` under the provider's rate, and the next request's longer first call is sent and reports a prompt over capacity less `predict`. On a provider that reports no usage, the overstated gauge sends no call whose recorded charge plus `predict` exceeds capacity, across two requests. *Scripted at the edge, each case asserting the provider's call count and the reported or recorded charge; the round re-audit's mutations of the overhead and the rescale redden each case.*
- **3.35** On a scripted provider that charges messages at 1.676 an estimate unit and definitions at 0.962, the rates of the 2026-11-12 live calibration, a ledger calibrated over 122 definitions whose first request advertises 42 of them prices that request at no less than its reported prompt over 1.06. Refused: with `capacity − predict` under the first request's reported prompt, the provider receives no call for that request and the pass ends with the abort reason `overflow`. Served: with `capacity − predict` at the reported prompt times 1.06, the first call is served. *Scripted, model-free, red first for the refused case on the tree that capped the credit; a helper row reads the same shape as arithmetic, within 1.06 of the charge. The `spared-scale` mutation reddens the refused case and the helper row, and a mutation that spares nothing reddens the served case.* The spared-rate ruling names it 3.32, which claim 3.32 already holds.
- **3.36** A first call that advertises part of the calibrated set leaves the gauge's scale as held, whatever the hidden definitions estimate. *Scripted on `RatedLedgerProvider` at the live rates, with the 122 calibrated definitions and a first call that advertises 10 of them, so few that `scale × E(hidden)` is over the overhead. Red on the tree that capped the credit, which learned a scale of 59.5 against the 1.625 it held; the `spared-scale` mutation reddens it.*

**Release bar.** As phase 1's, over claims 3.1 to 3.15, 3.17 to 3.21, and 3.23 to 3.36, with 3.16 reported and 3.22 removed by review. Claims 3.14 and 3.15 hold the release. Each reads only the first provider call of a request and the snapshot, so neither depends on the model's choice; the consumer-run half of claim 3.18 is reported and holds nothing. The 4B reading's efficacy holds nothing (§ Point 14). The capacity line and the no-regression line of § The release bar read as phase 3 restated them.

**Stops.**

| Seam | Stop | Reopens on |
| --- | --- | --- |
| Pricing density | the probe's ruled term, `computeToolDensity`; no rescale from a call with `added` | claim 3.15 failing, or a plan that refuses a rung the reported prompt shows fits |
| The spared rate | `min(scale, overhead / E(C)) × E(hidden)`, with no cap | arm `taverna` over 1.06 on a consumer rerun, or a `spare` row on claim 3.1's proportional arm |
| A false refusal on a provider that charges a definition out of proportion to its estimate | admitted as class `spare`, reported | a consumer run or a trace where a model's first request is refused and its composed charge, read from the offline arm or a control dispatch, is within the limit by more than the drift |
| An under-priced partial set | a stated limit of the capacity line | a first call the gate priced as fitting reported over `capacity − predict` |
| The scale of a ledger whose every first call is partial | kept as calibrated | the consumer rerun reading claim 3.15 over its bar on a later request of a thread |
| The measured set | bound to the gauge's measurement; definitions compared by JSON text | a price that reads the live set, found by claim 3.28's mutation |
| Registries, bodies, definitions | live at each turn, as claim 2.20 rules | the user's word |
| A supplied or hydrated gauge | priced as held, rescaled as any gauge, compared with no reported usage; a host that changes its model or provider omits `snapshot.gauge` | a consumer run or a trace where a ledger that holds a supplied or hydrated gauge reports a prompt over the price the gate gave that request, or the user's word |
| Claim 3.1's fixture | two providers, each supplied gauge stating what its provider charges | a `before` row on either arm |
| The gate's read | the frozen request at the `request` event, in every ledger, with the loop's abort read after it | a reported prompt plus `predict` over capacity on a request the gate priced as fitting, with no listener write |
| A first request of a pass | priced by the plan's terms at `capacity − predict`; a refused first pass ends and the answer pass answers without tools | a reported prompt plus `predict` over capacity on a first request the gate priced as fitting; a consumer whose host must not answer without tools, or the user's word |
| The capacity rate | at least the gauge's scale, in the gate and the fit; `#recall` keeps its own rate | the consumer run showing the gate ending passes whose next reported prompt, at the fitted rate, left more room than one result |
| Growth in definitions | `back` at the density, `more` by the difference of `added`, each floored alone | the gate's trigger on a turn whose definitions were swapped for others of equal estimate |
| The margin | the plan's drift in every price | the consumer run or a reading showing the gate ending passes whose request, dispatched under the control, reports a prompt plus `predict` within capacity, on more than 1 request in 10 |
| The answer pass | refused with `'OVERFLOW'` by the fit before it opens, and by the gate at its request | the gate stopping an answer pass the fit admitted with no host act between |
| The head | no cut by the ledger | ROADMAP item 15's design question |
| A ledger with no built-in | the same gate, fit, and refusals as any ledger | the user's word |
| A host-built head | no admission; the first-request read and `'OVERFLOW'` bound it | — |
| Holdback | the largest loadable skill and one result | `overflow` denials on more than 1 request in 10 of the consumer run or the reading |
| Room admission | `load` by its cost and one result, `remember` by its index line, each with the turn's commitments; nothing for the batch's other results, an acknowledgement, or a later turn, which the gate prices | the consumer run or the reading showing the gate ending the pass on the turn after a batch that admitted a `load`, on more than 1 request in 10; a result term per cleared call is then the question |
| A `remember`'s acknowledgement | not priced at admission | the reading showing the gate ending the pass after an admitted `remember`, on more than 1 request in 10 |
| `switch` admission | the tokens the workspace adds over the shown one, with the turn's commitments; no result term; no thread share | the consumer run or the reading showing, in a thread whose workspace an admitted `switch` selected, a later first pass ended at its first call on more than 1 request in 10; a share or a reserve is then the question |
| The result's stand-in | the longer of the longest stored tool result and the gauge's reply reserve (F44); it sizes the room a load leaves for the tool it reveals and bounds no request | loads denied on a thread whose results are small |
| A lookup after a load in one batch | not counted at admission; the gate prices its stored result | the gate's trigger |
| `share.skills` | 0.5, provisional, over the thread's shown skills and the loads the batch already admitted | the reading or the consumer run showing a thread that needs more, or a plan starved under it |
| Calibration set | the definitions no skill holds back, with no scope | the user's word; a host whose ungated definitions exceed its window meets unit K's refusal, which names the remedy |
| Calibration sample and refusal, from unit K | the head the context builds for an empty turn, with no workspace text and no conversation message; the call with the definitions first, and a reported prompt over `capacity` refuses `'GAUGE'` with no bare call and no gauge stored | a served call over capacity in a sweep or a differential under K; arm `taverna`'s live rerun reading a first call over 1.06 of its price; a `plan` row whose scale ratio sits outside the drift |

Each stop is provisional on a run. The consumer runs and the reading of 2026-11-12 met none of these reopen conditions: no `overflow` denial in either consumer run or in the reading, no thread-cap denial, and arm `taverna` within 1.06 after the spared-rate repair. Arm `index`'s live run and probes L1 and L2 met none either: no `overflow` and no `share.skills` denial.

**Hands phase 4:** nothing phase 4 builds on. Phase 4 builds on phase 2.

**As built.** Phase 3's round closed on 2026-11-12 on these rulings and accepted deviations from the preceding text. The consultant ruled the room seam seven times: the turn gate and room admission, and `switch` with the first request, on 2026-11-11; host acts inside a request, the capacity rule in every ledger, the supplied gauge, the spared rate, and claim 3.1's differential, on 2026-11-12.
- **The capacity gate.**
  - The ledger prices the frozen request at the `request` event, in every ledger. A first request prices at `max(0, overhead − spared) + added + rate0 × (1 + drift) × E(messages)`, with `rate0` the scale where no call is recorded and otherwise the floored measured rate. A later request prices by `left = gauge.remainder(calls) − predict − extra − slack − grown`, with `grown = (back + more) × (1 + drift)`.
  - A request priced over `capacity − predict` is not dispatched: the pass ends with the abort reason `overflow`, and the answer pass answers without tools. An answer pass the fit or the gate cannot carry makes `respond` reject with `LedgerError` code `'OVERFLOW'`, whose `context` holds `capacity`, `predict`, and `price`.
  - The loop reads the run's abort after the `request` emit, so a run aborted by a `request` listener reaches no provider for that turn. That one line in `Agent.ts` changes a bare agent in that case alone, and it restates claim 1.7: a turn cancelled before its request is composed emits none, and a run aborted while its `request` listeners run dispatches nothing.
  - The plan cuts only what the ledger owns: record lines, the seed tail, and the exchange window. It cuts no host text, no definition, and no request.
- **Pricing.**
  - Every price reads the definitions the gauge measured, compared by JSON text; the digest is derived from that set where it is read. `computeToolDensity` is exported.
  - A partial advertised set spares `min(scale, overhead / E(C)) × E(hidden)`, rule (a) of the spared-rate ruling. The cap is gone because no input reaches it. The added rate stays `computeToolDensity`, and `back` charges a returned definition the higher of the density and its credit. Under the capped credit the consumer's first calls priced 1035.5 and 1357.4 against reported prompts of 6659 and 6876.
  - A supplied gauge is priced as stated and compared with no reported usage. One `@remarks` sentence on `LedgerOptions` says so.
- **Room admission.**
  - A `switch` is admitted by the tokens its workspace adds over the shown one, with the turn's commitments.
  - `share.skills` counts the thread's shown skills and the loads the batch already admitted, through `LedgerCommit` and `LedgerRequestInterface.loads`. A successful `unload` reopens every call the room denied.
  - An absent gauge denies `load`, `remember`, and `switch`. No test reaches the branch, because `respond` calibrates before its pass.
  - Room admission reads `load`, `switch`, and `remember` arguments through `builtinToolContracts`, as the door does. Claim 3.5 failed the round's subjective lane on a skill named `7` that `{"skill":7}` loaded unpriced, and phase 2's repair ruling R1, arguments admitted one way everywhere, closed it; claims 3.5 and 3.26 gained a numeric case.
- **The empty-list rule,** § The durable-job unit, extended to `skills` in the round's repair. `#advertise` calls `filterBuiltinCandidates`, and `filterAdvertisedTools` holds a skill's tools whenever skills are passed and the allow-list admits `load`, so an excluded skill's tool stays hidden under `skills: []`.
- **Accepted deviations.**
  - one line in `ledgers/errors.ts`, so `isLedgerError` admits `'OVERFLOW'`
  - the plan's and `#recall`'s builds pass `switchable`, so the priced head equals the sent one
  - the turn's advertised set for a load's price is derived from the live ceiling, not stored
  - a `load` of a skill already shown is admitted with no price and no commit
  - claim 3.24's edge is bound by the first-request read, not by the load's room test
  - claim 3.23's control (a) reddens through the `switch` stop, 10 of 91 requests against 1 in 10
  - claim 3.31's `answer` arm read 0 over on the room repair's tree and was dropped; claim 3.27's scripted case grows the workspace at the answer pass's `start`
  - the re-audit's seed 3000096 could not replay; its ruled cause, a returning calibrated definition priced at `scale`, is shown at a scripted edge 100 over capacity on the room repair's tree
  - claim 3.36's fixture `serveLedgerLiveRates` gained `shown`, `scales`, and `settled`
  - each ledger test and guide fence the capacity rule changed is restated and classed: a request the base arm sent over the limit, a fixture gauge that misstated its provider, a margin refusal, or a later turn the gate stops
- **The study bundle,** units 3B-a and 3B-b.
  - `studies/desk/` carries its own judge text, judge options, and filing cutoffs, pinned equal to chat's by a test, because Study loads each bundle from its own root.
  - Arm P keeps each conversation's opening area, with per-request `disclosure` on a kept ledger still deferred. The summary splits arm P's requests into the disclosed area and the others, read from the `disclosure` row the run records.
  - After the round, the grader judges a call that shares a denied call's id by its name and place, counts only an admitted `load` as a load, and builds its guards from `@orkestrel/contract`.
  - Byte allowances, measured from request bytes: goal 4 MiB, trial 8 MiB, record 10 MiB, series 512 MiB.
  - 3B.2 took 72.7 s against a 60 s bar and 3B.3 took 319.6 s against 300 s, both from Study's cost per child process. Both are kept.
- **Reuse,** under the user's standing law that nothing is built that an `@orkestrel` package provides. A census found 12 copies of `@orkestrel` helpers. Agent replaced its copies with the packages' `seededRandom`, `hashStudyBytes` (`computeTextDigest` is deleted), `isRunning`, `decodeJSONLines`, `createLoopback`, and `linkSignal`, and kept three, each with its reason: the JSON round trips in `tests/setup.ts`, because TS2379 refuses `roundTripJSON` on the snapshot types; the memory study session's signal, which joins three signals; and the studies' `ENOENT` checks, because a bench runtime imports no test library. The scaffold-owned copies went to scaffold.

**As ruled, 2026-11-12.** Three lines of the preceding "As built" record a surface the re-prepared 0.0.42 changed. Claim T.1 replaces the empty-list rule's hold under an allow-list that names `load` beside `skills: []`: an allow-list that admits no `load` definition decides alone. Unit U2 removed the study bundle's ledger path, its judge, and arms `all` and `shown`; their readings stay in § The 4B reading. Unit K replaced the calibration calls' messages with a bounded sample and added the refusal of a call over capacity. § The re-prepared 0.0.42 holds each.

### The re-prepared 0.0.42

**Goal.** Agent 0.0.42 composes O as the default and D as the fallback and never P or A, stores no gauge measured over the window, and refuses a malformed job tree or an undeclared option member before anything runs. It was prepared at `46ae3811`, held on the user's ruling of 2026-11-12, and is re-prepared under the same number, which the registry has never served. `plan.md` § Rulings holds the user's rulings and each ruling's decision; this section holds what they rule into the design, the claims, and what was built.

**What the cut rules,** by the O-and-D ruling.

- **Removed:** `AgentOptions.disclosure`, `AgentRunOptions.disclosure`, `AgentJobInput.disclosure`, and the `disclosure` member of the `LedgerAgentOptions` pick; `requireDisclosure`, `agentDisclosureShape`, and `agentDisclosureContract`; and `unload`'s refusal of a host-given skill.
- **Kept under another name:** the workspace half, as `workspace?: string` in those four homes. It names the workspace a run renders in place of the active one until the thread's own `switch`, and a run's value replaces the agent's. A defined value that is not a string throws `ContractError` coded `'placement'` through `requireWorkspace`, at the agent's construction, at the run's entry before any state changes, and at the ledger's construction. A stored job that carries `disclosure` refuses as an undeclared member. Choosing a run's workspace without moving the shared pointer is not P, and a job has no other way to do it.
- **Kept unchanged:** `AgentDisclosure`, `collectDisclosure`, and `ContextBuildOptions.disclosure`, as the state D reads. `resolveDisclosure` takes the workspace string where it took the given value, and its skills are the record's alone.
- **O, the default,** needs no mechanism. One scope per request lists the area's tools (`skills.skill(area)?.tools`), each ungated tool the request may use, `recall` on a ledger, and each built-in it wants, with no `load` and with `skills: []`. On a ledger the host applies it through `context.apply` before `respond`, and `respond` gains no scope.
- **D, the fallback,** needs no mechanism: `builtins: ['load']` with a skill registry whose skills name tools. Its first-reply cost is the load's round trip, reported and never repaired. `unload` stays optional.
- **A** has no mechanism, so removing it removes a study arm and a guide row. That an agent or a ledger with no scope advertises every definition stays stated as behavior, the reason to scope.
- **Not renamed:** "disclosure" names the campaign's subject and the derived value.

**What unit K rules,** by the triage ruling's § D6, K's follow-up ruling, and the Orchestrator's class `refused`.

- The calibration sample is the head the context builds for an empty turn under the ceiling at entry narrowed by `{ workspaces: [] }`, with no conversation message and no workspace text. A fresh thread with no workspace calibrates byte-equal to `46ae3811`.
- The call with the calibrated definitions goes first. When it reports a prompt over `capacity`, the ledger sends no call without them, stores no gauge, and rejects `calibrate` and `respond` with `LedgerError` coded `'GAUGE'`. Its `context` holds `capacity` and `prompt`, and its text names the remedy: hold tools behind a skill with `load`, register fewer tools, or raise `capacity`. A refused `respond` stores no request message, a refused `calibrate` leaves the gauge it held, and no refused digest is remembered.
- The comparison is `>` against `capacity`, the gate's own reading of "fits". Claim F-K2 pins it: the daemon's window reading (Ollama 0.40.16, the 4B, 60 definitions estimating 5981 at `num_ctx` 2048) returned 200 with a reported prompt of 1026 and `done_reason` stop, against 6739 at 16384, so the daemon cuts silently and reports about half its window, never a count equal to it, and `>` stays with a prompt equal to `capacity` admitted.
- **As ruled at the fix round, by the third K ruling (`tmp/units/k3-ruling.md`).** Arm `taverna`'s live rerun (`agent-consumer-live3`) read claim 3.15 at 1.346 on arm `index` request 6: the same 1143-token first call priced 1100 at `46ae3811` and 849 under K, because K's sample dropped a visible policy record that costs about 2.43 tokens a unit against the head's 0.838. The outlier is K's. Calibration keeps the two calls on the head alone and, when the workspace renders text, sends a third call without definitions carrying the head and that text cut to `floor((capacity - bare.prompt) / LEDGER_SAMPLE_BYTES)` characters; the scale is the larger of the head's rate and the rate that call measures. Each of the three calls refuses with `'GAUGE'` from one text template when it reports a prompt over `capacity`, the bare and third calls included (claim F-K3). A workspace shown after calibration, a `switch` included, and dense lookup text in the conversation still price at the stored scale; each is a guide limit, and the host's lever for a changed workspace is `calibrate`.
- The sample's rounding reads as drift, and claim K.3 gains the class `plan`. The Orchestrator added the class `refused`: a host whose calibrated definitions alone exceed `capacity` refuses with `'GAUGE'`, where `46ae3811` stored a gauge measured over the window and served each request a scope fitted. The remedy, tools behind skills, also serves O. This moves the no-regression line (§ The release bar).
- Two limits the guide states in § Limits: a head of a few words measures the scale coarsely until the first served request rescales it, and a host that needs it tighter supplies `gauge`; the refusal reads the prompt the provider reports, so `capacity` must be at most the window the provider serves.

**What unit R rules,** by the refusals ruling and the door ruling.

- **The trap, removed and not refused (T).** `filterAdvertisedTools` returns the admitted list when no skill is passed or when an allow-list admits no `load` definition. A scope that lists `load` beside `skills: []` advertises what the same scope without `load` advertises. With no allow-list, `skills: []` still holds the skills' tools back and withholds `load`, so no catalog is released.
- **D24, built (J).** `agentJobShape` holds `limit` as an integer from 1 to `Number.MAX_SAFE_INTEGER`, `timeout` as an integer from 0 to `MAX_TIMEOUT_MS`, `budget` as a number of at least 0, and each message's role as one of `CONVERSATION_ROLES`. `collectJobRefusals` reports what the shape cannot state: a job that names tools or built-ins and no authority, a `builtins` list `requireBuiltins` refuses, and a built-in its own `tools` name. `scanJobTree` and `AgentRegistry.build` both call the contract and the helper, so a tree refuses whole with `AgentError('REGISTRY')` before anything spawns, and each rule keeps one home.
- **Undeclared option members, refused (O).** The agent's options, a run's options, the ledger's options, the ledger's `agent` pick, and a scope's input and `narrow` filter each pass one `refuseOptionKeys` call of `@orkestrel/contract` against a frozen key list beside the type. An own enumerable member the type does not declare refuses synchronously with `ContractError` coded `'structure'`. On an options object a declared member holding `undefined` reads as omitted; in a record it refuses. Foreign values keep their own checks. D15 leaves phase 4, and claim 4.11 closes in 0.0.42.
- **The door census,** 75 rows, ruled by the Orchestrator. Host-facing configuration doors and per-call options take the same door; stored record inputs become exact records through their contracts; internal helpers and error constructors take none, the second because a refusal thrown while an error is built would mask the error it reports.
- **The fix ruling,** after the falsify round on K and R. The `'GAUGE'` text names the whole calibration call, the head included, and the guide adds that a head over capacity on its own clears only by a shorter system prompt or a larger capacity. `ConversationInput` is per-conversation options and keeps its door; `InstructionInput`, `MemoInput`, and `SkillInput` are data records made exact through contracts, so a present `undefined` refuses there, and their three key lists go unless something else reads them. No stored record carries a present `undefined`. The ledger's `agent` pick refuses as `Ledger agent`, and the guide routes `scope` to `ledger.agent.context.apply` and `budget` to the ledger's own option. The fan-out header covers a job that would not build.

**Units.**

| Unit | Owned files | Order | Receipt |
| --- | --- | --- | --- |
| The census of `disclosure` lines | — | first | 323 lines: KEEP 154, DELETE 46, REACH 52, WORKSPACE 17, STUDY-P 32, UNSURE 22 |
| U1, the cut in `src/` | the agents and ledgers types, shapers, contracts, and helpers; `Agent.ts`, `AgentRun.ts`, `AgentRegistry.ts`, `Ledger.ts`; the TSDoc of `AgentFanout.ts` and the contexts; their tests and `tests/setup.ts`; the guide's rows and each fence a changed signature calls | after the census | `agent-u1-final-mut` |
| U2, the desk study | `studies/desk/`, `studies/disclosure/study.json`, `tests/studies/desk/`, `tests/studies/disclosure/`, `tests/setupStudy.ts`, `studies/README.md` | beside U1 | `agent-od-u2-studies`, `agent-od-u2-probe`, `agent-od-u2-setup` |
| The consumer harness's arm `index` | the harness | beside U1 | `agent-consumer-index-2` |
| The falsify round on the cut | — | after U1 and U2 | both lanes confirmed |
| The D probes E0, S1, L1, and L2 | throwaways | after the round | `agent-e0`, `agent-consumer-dprobes-2`, `agent-dprobe-l1`, `agent-dprobe-l2` |
| K, calibration | `Ledger.ts` (`#measureGauge`); the TSDoc of `ledgers/types.ts` and `errors.ts`; `Ledger.test.ts`; the ledger fixtures of `tests/setup.ts`; the guide's calibration paragraph and its fence | after U1 | `agent-k-green-mut` |
| R, the refusals | the `src/` files each door names, their tests, `tests/setup.ts`, and the guide's rows, fences, and Contract bullets | after K | `agent-r-final-mut`, `agent-r-mut-message` |
| The falsify round on K and R | — | after R | `plan.md` § State |
| Documentation | `guides/agent.md`, `tests/guides.test.ts`, `ROADMAP.md`, TSDoc | after R | `agent-docs-guides2`, `agent-docs-policy` |
| The fix round and its closure check | the `src/` files the fix ruling names, their tests and fixtures, and each guide line they force | after the round | `plan.md` § State |
| The tree-wide gates, one time | — | last | `plan.md` § State |

**Claims of the cut,** by the O-and-D ruling, each read against `46ae3811`.

- **C.1** With `workspace` and `builtins` absent, every dispatched request of a bare agent, a job tree, and a ledger equals `46ae3811`'s with `disclosure` and `builtins` absent. With `workspace: W` it equals `46ae3811`'s under `disclosure: { skills: [], workspace: W }`. *Seeded differential, as claim 1.1 runs it.*
- **C.2** The barrel exports no `requireDisclosure`, `agentDisclosureShape`, or `agentDisclosureContract`, and `createAgent(provider, { disclosure })`, a run's `disclosure`, and a ledger's `agent.disclosure` do not typecheck. *Type proof; `test:guides` in both directions.*
- **C.3** No option composes P. On a conversation with no stored `load` record, the first request of an agent, a run, a job, and a ledger carries no `## Loaded skills` section and no tool a registered skill holds while `load` is advertised, over generated option sets. A job record that carries `disclosure` refuses with `'REGISTRY'`. Claim O.4 restates its past-the-types half: such a member refuses with `'structure'` at the agent, the run, and the ledger's `agent`. *Scripted; mutation that reads a given skill list in `resolveDisclosure`.*
- **C.4** Claim 2.7 as restated. *Scripted; mutations that drop the run's value and that let the given workspace outrank a stored `switch`.*
- **C.5** `unload` of any skill the thread loaded is admitted. *Scripted.*
- **C.6** On one ledger kept across requests, with `builtins: ['load']` and skills that name tools, a request under an O scope advertises exactly the listed definitions in every dispatched request, renders no skills index and no body, and prices no holdback. A scope applied before the next `respond` for another area advertises that area alone, with no calibration call between. A later request under a scope that admits `load` and the skills shows the thread's earlier loads with no further `load`. Claim T.2 restates the clause on an O scope that lists `load` beside `skills: []`: it advertises what the same scope without `load` advertises. *Scripted on a recording provider; mutation of the `load` test in `filterAdvertisedTools`.*
- **C.7** The `disclosure` study declares arms `area` and `index`; its rehearsal executes 14 trials and 84 requests with no model; the routine `desk` proof runs one conversation of arm `index`. *`npm run test:studies`; the rehearsal probe.*
- **C.8** `scaffold surface` reports no collision for any name the cut adds. *Gate.*
- **Restated:** claims 2.1, 2.7, 2.9, D.1, D.2, D.4, D.8, 3.1, 3.14, and 3.15, each in its phase; the fixtures of claims 3.26, 3.27, and 3.32 pass `workspace`. Claims 2.3, 2.4, 2.8, 2.10, 2.20, 3.4, 3.8, 3.12, and 3.19 are unchanged, and for claim 3.12 a host passes `workspace` again after a hydrate.

**Claims of unit K,** by the triage ruling's § D6, with K.2, K.3, and K.4 as K's follow-up ruling restates them, each red first on HEAD.

- **K.1** On a thread whose view estimates over `capacity`, and on a thread whose rendered workspace does, both calibration calls carry the messages a fresh thread with no workspace carries, byte for byte. *Scripted; mutations that restore the view and the workspace.*
- **K.2** A calibration whose call with the definitions reports a prompt over `capacity` sends no call without them, stores no gauge, and rejects `calibrate` and `respond` with `LedgerError` coded `'GAUGE'`, whose `context` holds `capacity` and `prompt`. A `respond` refused this way stores no request message and leaves `gauge` undefined; a `calibrate` refused this way leaves the gauge it held. After the host holds the tools behind a skill under `load`, the next `respond` calibrates and answers. *Scripted; mutations that remove the comparison and that move it after the call without definitions.*
- **K.3** Claim C.1's and claim 3.1's differentials rerun. A scenario that calibrates on a fresh thread with no workspace is equal. Every other differing seed is one of:
  - `calibration`: the calibration calls alone differ.
  - `gauge`: the served calls and results are equal, and each differing scale is within `LEDGER_SCALE_DRIFT` of the base's.
  - `plan`: each differing scale is within the drift; each differing served request holds the base request's messages less some where the candidate's scale is higher, or plus some where it is lower; and no candidate call reads `over` or `margin`.
  - `refused`: the base's call with the definitions charged over `capacity`; every candidate `respond` is a `'GAUGE'` refusal naming that charge and the capacity, after exactly one provider call carrying the base's calibrated definitions; the candidate held and stored no gauge; and the seed's capacity, `predict`, charges, supplied flag, and calibrated set equal the base's.
  - `before`: anything else. The bar is no `before` row. *Seeded differential; the control multiplies each candidate scale past the drift and must read `before`.*
- **K.4** The room sweeps of claims 3.23, 3.31, and 3.33 count calibration calls by class and read 0 calls without definitions whose recorded prompt exceeds capacity. Every call with definitions whose recorded prompt exceeds capacity is refused: no call without definitions follows it, the ledger holds no gauge after it, and its `respond` rejects `'GAUGE'`; the count of such calls equals the count of `'GAUGE'` rejections and is above 0 on the host-act arms. Agent calls over capacity read 0 outside the `low` controls, and each reach count stays above 0. *Seeded, model-free; controls by mutation that restore the view and remove the comparison.*
- **K.5** Claim 3.32's scenario still sends no first request and answers without tools, with its calibration within capacity. *Scripted.*
- **K.6** The guide's calibration paragraph states the sample, the order of the two calls, and the refusal with its remedy, as executed fences where it asserts a value. *Gate: `npm run test:guides`.*

**Claims of unit R,** by the refusals ruling and the door ruling, each red first on the cut tree.

- **T.1** `filterAdvertisedTools` over candidates holding `refund` and no `load`, the allow-list `['refund', 'load']`, a registered skill naming `refund`, and nothing shown returns `refund`. *Unit; mutation that restores `names.includes('load')`.*
- **T.2** On a bare agent and on a kept ledger with `builtins: ['load']`, a request under `tools: [AREA_TOOLS, 'load'], skills: []` dispatches the request an O scope without `load` dispatches, byte for byte. *Scripted on a recording provider.*
- **T.3** The controls hold: with no allow-list and `skills: []` the hold stays and `load` stays unadvertised; an allow-list that names `load` with a `skills` list that admits a skill is D; an allow-list without `load` is O. *The existing tests.*
- **T.4** Claim C.1's differential differs only on scenarios whose ceiling lists `load` with an empty `skills` list. *Seeded.*
- **J.1** `agentJobContract` admits a `limit`, a `timeout`, and a `budget` exactly where `requireLimit`, `createTimeout({ ms })`, and `createTokenBudget({ max })` do not throw, over a boundary table and seeded draws from `seededRandom`. *Unit.*
- **J.2** `scanJobTree` returns a refused-job finding that names the path and the member for a child at depth 1 and at depth 3 holding a J.1 bound, a repeated built-in, `unload` without `load`, a built-in its `tools` also name, `tools` or `builtins` with no `authority`, or a `system` message. *Unit table.*
- **J.3** For each J.2 case under a sound parent, `AgentFanout.execute` throws `AgentError('REGISTRY')` with 0 spawns, 0 registry builds, and 0 provider calls. *Scripted on a recording provider and controller.*
- **J.4** Over seeded job trees, a tree `scanJobTree` clears holds no job whose `build` throws. *Seeded, with a reach count above 0 for each J.2 class; mutation that drops the helper call from the scan.*
- **J.5** `AgentRegistry.build` refuses each J.2 case on a root job with `'REGISTRY'`, and the tests that asserted `'LIMIT'` or `'BUILTIN'` through `build` are restated. *Existing files.*
- **O.1** Each door refuses an own enumerable member its type does not declare, synchronously, with `ContractError` coded `'structure'`, whose text names the member and lists the declared ones. The agent and the ledger are not constructed; a refused run leaves `status` `idle`, the conversation unchanged, and 0 provider calls. *Unit table; mutation that removes each door's call in turn.*
- **O.2** For each door, a fixture typed `Required<T>` that holds every member is admitted. *Unit.*
- **O.3** For each door and each optional member, the member spelled `undefined` yields the first request the omitted member yields, `workspace` included. *Scripted table.*
- **O.4** Claim C.3 restated: a `disclosure` member past the types refuses at the agent, the run, and the ledger's `agent` in each own-enumerable form; the non-enumerable, inherited, symbol-keyed, and `Proxy` forms construct and show nothing. *The existing C.3 tests, restated.*
- **O.5** A ledger whose `agent` holds `scope`, `budget`, `allowance`, `signal`, `error`, `window`, or `tools` refuses. This is claim 4.11. *Unit table.*
- **O.6** `createScope` and `narrow` refuse a misspelled list key, and no scope is built. *Unit.*
- **The door groups.** Each door of the census's groups 1 and 2 refuses a stray member with `'structure'`, and each record input of group 3 refuses through its contract. One mutation a group removes one door's call.

**Claims of the fix round,** by the fix ruling, each red first and reddened by its own mutation.

- **F-K1** The `'GAUGE'` message under a refusal the head alone causes, a `lookups: []` ledger with a long system prompt, names the whole call.
- **F-K2** A test pins the comparison at `capacity`, as the daemon's window reading rules it: `>=` when the daemon reports a count equal to its window, otherwise `>` with a prompt equal to `capacity` admitted. The objective lane's mutation `k-ge` survived because no test pinned it.
- **F-R1** `InstructionInput`, `MemoInput`, and `SkillInput` each refuse an undeclared member and a declared member spelled `undefined`, with the contract's code; `ConversationManager.add` admits `undefined` and refuses a stray.
- **F-R2** A memo whose `origin` omits `message`, and an instruction with no `override`, each snapshot with no such own key and round-trip through JSON equal.
- **F-R3** The pick's refusal opens `Ledger agent:`.
- **F-R4** The fan-out header reads "every job in a tree must be readable, hold only the declared members of AgentJobInput, and build under its parent; correct each job a following finding names".
- The objective lane's findings, as the fix ruling's § Objective findings rules them: **F-R5** every required member of the three data records, spelled `undefined` or omitted, refuses at `add`, and every input `add` admits yields a snapshot its manager's hydrate admits, in memory and through JSON, over 200 seeded draws per manager; **F-R6** a non-plain message refuses `'MESSAGE'` through contract's `isRecord`; **F-K3** a bare calibration call over `capacity` refuses `'GAUGE'` and stores no gauge.
- **W.1 to W.6,** by the third K ruling: the first call under a workspace charged about 2.9 times the head's rate reads within `1 + LEDGER_SCALE_DRIFT` of its price; a calibration with no workspace text sends K's two calls and one with workspace text sends three; no calibration call charges over `capacity` across workspace sizes and the stored scale equals the formula; a workspace charged under the head's rate stores the head's rate; a third call over `capacity` refuses `'GAUGE'`; the guide states the three calls and the scale. K.1 and K.5 are restated to the third call.

**As built.**

- **The census** listed 323 `disclosure` lines under `tests/`, `guides/`, `studies/`, and the consumer harness: KEEP 154, DELETE 46, REACH 52, WORKSPACE 17, STUDY-P 32, and UNSURE 22. The room sweeps of claims 3.23, 3.31, and 3.33 draw no host skill; the durable-pair generator and two hand pairs did.
- **U1.** Phase 0 read every C.6 reading yes on HEAD, and a REACH fixture rebuilt on a stored `load` read equal call for call. The cut removed the four `disclosure` members, the three exports, and the refusal, and added `workspace` and `requireWorkspace`; `@orkestrel/contract` 0.0.23 exports no coded string refusal, because `parseString` coerces a finite number and `refuseOptionKeys` reads keys. No pricing line moved: the `Ledger.ts` diff is the import, `#given`'s type and check, and two comments. C.1 read 180 of 180 scenarios equal, with 161 agent, 169 job, and 166 ledger requests, and its control differing; C.3, C.4, and C.6 were each reddened by their mutations `c3`, `c4a`, `c4b`, and `c6`; C.2 holds three `prove` receipts; C.8 read 0 collisions. Red: 27 of 43 selected tests failed on a `46ae3811` tree carrying the candidate's tests (`agent-u1-red`). Green (`agent-u1-final-mut`): `src:core` 3339, policy 179, config 545, setup 353, and guides 231. Accepted deviations: `serveLedgerFirstEdge` is rebuilt as an O composition, so claim 3.18's first-edge case reads the added term through O; the queue case of `factories.test.ts` reaches `billing` through a model `load`, because the queue store's job shape refuses stored tool calls; and 16 of 17 room arms read equal field for field, with `yield` varying run to run in both trees.
- **U2.** The bundle keeps arms `area` and `index` on bare agents. `StudyDeskSession`'s ledger path, the `disclosure` trace row, `StudyDeskDisclosure`, the judge constants, the summary's `shown` split, and the profile's judge left; `validateStudyDeskProfile` refuses a declared judge; and the runtime checks dropped `createLedger`, `LEDGER_QUESTIONS`, and `createOllamaJudge`. `studies/README.md` records the baselines as one run's readings. Gates: `studies` 24; the rehearsal probe sealed 14 attempts and 84 observations with no model in 197.6 s, on the `dist` built before the cut; `setup` 353. The series bounds keep the 28-trial values, looser than 14 trials need and admissible.
- **The consumer harness** dropped arm `shown` with every field only it used, and added arm `index`: taverna's catalog behind its seven skills, `builtins: ['load']`, no turn scope, and one ledger per request hydrated as taverna's route builds it, over two threads of five requests. Offline on the `46ae3811` `dist`, claims 3.14 and 3.15 passed, and the control with `builtins` absent reddened claim 3.14.
- **Arm `index` live** (`agent-consumer-live-index`, 2026-11-12 about 14:04 to 14:11, 40 of 40 calls, the 4B). Claim 3.14 passed: every first call was served, each fresh thread carried `load` with no skill-held tool and no `recall`, and first prompts were at most 3400. Claim 3.15 passed: arm `index` with nothing shown read 0.98, 1.003, and 1.039; arm `index` with a loaded skill read 0.603 to 0.775; and arm `taverna` read 1.020 and 1.018. The model loaded 3 times, 1 right and 2 wrong, one of them refused by the name check. After another area's load it loaded nothing on 4 of 5 requests and the wrong skill on 1. No `overflow` or `share.skills` denial occurred, later prompts were at most 7260, and the hydrate showed what each thread loaded. § The 4B reading holds the question this opened.
- **The falsify round on the cut** confirmed in both lanes. The objective lane's own differential read 300 of 300 scenarios equal against `46ae3811` over five surfaces (agent 162, job 167, ledger 163, kept ledger 429, and scoped 120 requests); 62 of 62 option probes past the types showed nothing; its mutations `m1` to `m5` were killed; no pricing line moved; and `scaffold surface` read 0 collisions. It confirmed C.7 by reading, because the rehearsal ran on the `dist` built before the cut. The subjective lane drove every route to P and found none through a public option; a stored `load` record and a hand-built `context.build({ disclosure })` show a skill, which the ruling admits as host code. Its findings sat below the bar and each was acted on in 0.0.42 by the user's ruling: F1, no deterministic test of the first call's addition term for a skill a prior request's `load` left shown (unit K added it); F2, an undeclared `disclosure` dropped silently on the agent, the run, and the ledger, and the trap's request with no tools (unit R); F3, the `yield` arm's nondeterminism (unit K); F4, the stale guide (the documentation unit); and F5, a stale throwaway, removed. The objective lane's finding that an explicit `workspace: undefined` is admitted went to the refusals ruling.
- **K.** Probe PK1 confirmed the defect: calibration calls of 6480 against a capacity of 4096, and of 23008 against 19968. PK2's proposal, by temporary mutation, sent priced calibration calls over capacity on the host-act arms, because the definitions alone exceed small capacities; read one `before` row from the sample's rounding; and changed arm `taverna`'s calibration, which put its live rerun on the bar. K stopped there for K's follow-up ruling. PK3 held every K.4 class and returned on 15 `before` rows of one shape: capacity 600, a calibrated set priced 759 or 878, `46ae3811` storing that gauge and answering scoped requests that advertised no tool, and the candidate refusing every `respond`. The Orchestrator added the class `refused` for them. Built: `#measureGauge` sends the sample through an empty selection under a scope with `workspaces: []`, with the comparison between the calls, and `stripThinking` left the calibration path because the head carries no thinking. Red: 11 failed and 4 passed on HEAD's `#measureGauge` (`agent-k-red2`). Green (`agent-k-green-mut`): `src:core` 3343, guides 232, policy 179 with 1 skipped, and setup 353. Claim 3.1 under K.3: flat 98 equal, 16 `calibration`, 1 `gauge`, 1 `plan` (seed 40, scale ratio 1.00654), 4 `refused`, and 0 `before`; proportional 91, 12, 6, 0, 11, and 0; the control turns every `gauge` and `plan` seed `before`. C.1 was not rerun: its ledger arm supplies a gauge and never calibrates, so `agent-k-pk2`'s 180 of 180 stands. The sweeps ran twice and repeat field for field on all 17 arms: calls without definitions over capacity 0; calls with definitions over capacity equal to the refusals on `hfree` 81, `hswap` 75, `hadd` 57, `hedit` 45, `hscope` 291, `yield` 54, and `listener` 60; and agent calls over capacity 0 outside the `low` controls, which read 14 and 11, and 71 and 51. Mutations `view`, `workspace`, `compare`, `moved`, and `f1-added` each reddened their claim. F1's test reddens under the `+ price.added` mutation. F3's cause was the fixture scheduler's draw at every yield, and `LedgerSweepScheduler` acts only at the loop's between-turn yield. Accepted deviations: eight tests restated where the refusal reaches their fixture as ruled, among them the taverna-room case that registers every definition with no skill and refuses; and the sweep's rejection event records `code` and `held`.
- **R.** Phase 0 read each probe as its build rule requires. PT failed only the test the ruling names, and a C.1 differential with two surfaces that reach the trap read 31 of 300 scenarios differing, all of them trap scenarios. PJ read the parent running before every child refusal on the base, a `system` message among the cases, and the tightened shape failing only three tests that pinned a refusal of a value never valid at construction. PO failed six tests, each passing a stray on purpose, and guides and studies passed on both arms. Pass 1 built T, J, and O: red, 123 of 2235 failed (`agent-r-red`); green, `src:core` 3522 (`agent-r-green2`). Pass 2 built the door groups: red, 39 of 951 failed and 2 more (`agent-r-red2`, `agent-r-red2b`); green, `src:core` 3586 (`agent-r-green5`). Closing ticket `agent-r-final-mut`: `src:core` 3586, guides 232, policy 179 with 1 skipped, setup 358, and studies 228; T.4 read 31 differing scenarios, all trap; and 14 mutations each reddened their own claim and restored byte-identical, the record door's in `agent-r-mut-message`. Callers PO's sort sent back were fixed at the caller: the `ScriptedWire` and `ScriptedJudge` fixtures, and the guide fence that spread a stored message into `add`. Accepted deviations: `collectJobRefusals` takes a `Pick` of the three members it reads; `AgentError`'s TSDoc is restated where J made it false; `isMessageInput` is an exact `recordOf` guard that reads calls through `isToolCall`, because `ToolCall` is `@orkestrel/tool`'s; two J.3 rows were green on the cut tree, one already refused by the within-parent rule and one reachable only at the root; and `createBuiltinAgent` rewraps the declared options so O.4's forms reach the door. Deviation 4, the record inputs taking `refuseOptionKeys` and so reading `undefined` as omitted, was accepted for review and replaced by the fix ruling. Read at their working trees, taverna, ollama, toolbox, and study pass declared members alone, so none meets a refusal at its re-pin.
- **The falsify round on K and R.** The subjective lane confirmed. 26 refusals through the public doors named the member and listed the declared ones; 23 doors admitted every optional member spelled `undefined`; a host followed the `'GAUGE'` remedy to an answered `respond` by each of its three levers; the trap scope advertised what O advertises; and every J case refused with 0 provider calls. Its five findings below the bar are the fix ruling's. The objective lane had run 10 of its 11 mutations at 18:05, and `k-ge` survived, which became F-K2; its verdict is read in `plan.md` § State with the fix round.
- **Documentation.** The guide holds item 8's table for O and D alone, the O recipe and the D-to-O lever as executed fences, D's live reading on a ledger beside the lever, the restated wording of claim 3.14, the job refusals in the Contract's durable-jobs clause, R's door bullets in § Contract, and one `## Limits` list holding the ledger's limits, K's two, and the closed rows the triage named as limits. No guide line names the cut option as one a host passes, calls a listed `load` beside `skills: []` a mistake, or cites an A or P number. `ROADMAP.md` restates item 7 and removes items 8, 15, 58, and 59; item 59, the user's item on refusing unknown run-option keys, went because unit R built that refusal. `test:guides` read 236 (`agent-docs-guides2`) and policy 179 with 1 skipped (`agent-docs-policy`). The TSDoc census changed no `src/` file.
- **The fix round** (`tmp/units/kr-fix.md`) built every ruling, items 1 to 15. Red first: 42 of 1035, and 8 of 599 for item 15; the third K ruling's model-free probe met its build rule before any `src/` edit and caught a workspace image that made the third call throw `'IMAGES'`, so the third call carries the workspace's text alone. Closing ticket `agent-kr-fix-close-mut`: `src:core` 3640, guides 237, policy 179 with 1 skipped, setup 363, studies 228; claim 3.1 has no `before` row; the room sweeps are equal on all 17 arms; 17 of 18 mutations reddened their claims. The survivor, `r2-memo`, showed the memo `origin` copied field by field was unobservable under F-R1's contract and read a non-enumerable `message` the contract never checks, so the Orchestrator restored the spread `{ ...input.origin }`.
- **The closure check** (`tmp/units/kr-closure.md`) read OPEN F-R1 alone: no test pinned `ConversationManager.add` admitting a member spelled `undefined`, and a mutation refusing one survived 1397 tests. The Orchestrator added the row (every member of `CONVERSATION_INPUT_KEYS` spelled `undefined`, admitted as omitted); its mutation reddened that row alone (1 of 60) and restored with its digest proven, which closes the round. Its gates: `src:core` 3640, guides 237, policy 179 with 1 skipped, setup 363, studies 228; 40 mutations of its own, each red but that one. Below the bar, recorded: a host getter's throw escapes as the host's own error at `SkillManager`'s `tools` and the message `role`, which Agent neither swallows nor renames; `createFile` throws a plain `TypeError`, `@orkestrel/file`'s behavior for its next visit; a getter that answers differently at each read can pass a record check and store another value, stated in the guide's § Limits beside the job tree's `children`.
- **Arm `taverna` live, the final** (`agent-consumer-live4`, 2026-11-12 about 19:53 to 20:01, 483 s, 62 of 62 calls, the 4B, Ollama 0.40.16, the `dist` of 19:52), adopted under the third K ruling's rule: arm `index` request 6 read 1143 against 1100, 1.039; arm `taverna` 1.02 and 1.016; every other first call at most 1.0. Calibration read bare 351 and a third call of 815 on arm `index` thread 2, and bare 178, overhead 13257, and a third call of 642 on arm `taverna`, each as ruled. Claims 3.14, 3.15, and 3.18 pass, with no overflow and every hydrate equal; arm `index` made 1 right and 2 wrong loads, D's drift on a ledger that the D-window ruling records.
- **C.7's rehearsal** on that `dist` (`agent-c7-rehearsal`): 1 of 1 in 185 s, 14 trials and 84 requests with no model.
- **The tree-wide chain** (`agent-chain-final`) on the integrated tree: format, lint, check, and build pass; `src` 3640, policy 179 with 1 skipped, config 545 with 1 skipped, setup 363, guides 237, distribution 10, and studies 228, each exit 0. The F-R1 row and the guide's limit sentence followed it: format, lint, and both type checks pass, guides 237, and the row's own file 60 of 60.

**Stops.**

| Seam | Stop | Reopens on |
| --- | --- | --- |
| O and D | O the default, D the fallback, no added mechanism | the user's word |
| D after a load | the thread-long shown set; a wrong load stays shown for the thread | the user's word, or a reading on one battery where a ledger's entries make no `load` and the bare composition's entries do, by more than the bar's margin of 2 |
| The workspace option | one string on the agent, the run, the job, and the ledger's agent | the user's word |
| An option spelled `undefined` | absent on an options object, refused in a record | the user's word; reversing it refuses `{ system: config.system }` with the value absent and needs a key loop the contract does not provide |
| Error constructors | no door | the user's word |
| A job's bounds | the shape states each bound a build reads, and `collectJobRefusals` holds the rest | a counterexample to claim J.4, which is a fifth case |
| Calibration | § Phase 3, Stops | as that row states |

### Agent 0.0.43

**Goal.** Each host tool call acts on the workspace its turn's request rendered, inside the `files` list the ceiling states, and the next request renders the model's own edit. Agent 0.0.43 carries it; in the same wave Toolbox 0.0.32 acts on the caller and Workspace 0.0.18 gives `search` and `replace` a `paths` list, each in its own repository. `plan.md` § Rulings holds each ruling's decision; this section holds what the rulings rule into the design, the claims, and what was built.

**What the probe read.** The wsedit probe ran on `9e15d18e` with a scripted provider and Toolbox's 0.0.31 build (`agent-wsedit-probe`, 6 of 6 cases), over one agent with `builtins: ['switch']`, a scope listing `orders` and `returns`, `orders` active, and Toolbox's `createWorkspaceTool` registered over `agent.context.workspaces`.

- After the built-in `switch` selected `returns`, every later request rendered `returns`, and Toolbox's `write`, `replace`, and `remove` changed `orders`. The registry's `active` pointer read `orders` at every turn and after every call.
- Each host tool call received a context whose one own key was `signal`: Agent dispatched `run.execute(call, { signal })` and supplied no caller.
- With two conversations over one manager, conversation B's `write` landed in `orders` after conversation A switched to `returns`.
- The model's own edits appeared in none of the requests that followed them. In the control, where the host moved `active` to `returns`, the `write` landed in `returns` and the next request still held no edit, because a file edit changed no term of the view.

**What the rulings rule.** The switch ruling, the wsedit ruling, and the wsfiles ruling were each decided by the consultant on 2026-11-12, and the Orchestrator ruled on the build and the review. § Refused holds each option they refuse.

- **Toolbox's own `switch` and `workspaces` operations leave** (the switch ruling). The operation let a model move one pointer that every conversation over the manager reads, with no list of what it may select. The host keeps `manager.switch` between runs, and under Agent the model keeps the built-in `switch`, per conversation, inside `ceiling.workspaces`. The ruling raised the probe's question as a finding it did not close.
- **Agent hands each host tool call `{ signal, caller }`** (the wsedit ruling, its option (a)). `caller` is an `AgentCaller`, carried by the `caller` member that `ToolContext` of `@orkestrel/tool` 0.0.23 already declares, so that package does not change. Its `workspace` is the instance the turn's request rendered, kept while the live ceiling admits it at the call, else `undefined`. One `resolveWorkspace` serves what `build` renders and what a call receives. `AgentCaller` holds no `conversation` member, because no consumer reads one.
- **An edit to a rendered file rebuilds the head** (the wsedit ruling). The run compares the rendered workspace's files under the ceiling's `files` list by identity at each turn, derived with no listener and no stored flag, so it reads a host's edit and any tool's edit alike. A stale `## Workspace` section shows file text that the model then edits by `replace` query and `splice` range, so the head rebuilds.
- **A `switch` and an edit that share a turn act on the workspace that turn's request rendered,** in either call order, and the switch shows from the next turn, as the built-in's result says (the wsedit ruling).
- **The `files` list binds a tool** (the wsfiles ruling). `AgentCaller` holds a required `files` member: the live ceiling's `files` list at the call, `undefined` when the ceiling states none. Toolbox holds every operation to it, and Workspace's `paths` keeps a file outside the list out of `search` and `replace`, so no hidden text meets a model's pattern. Under an `undefined` list a tool reaches every file of the shown workspace, where an `undefined` `memos` list lets `remember` write none; the guide states the difference.
- **The wsfiles ruling corrects the wsedit ruling.** `{ workspace: undefined }` with no `files` key refuses, so claim F.3 restates claim A.6's table, and the guide sentence that the `files` list never filters what a tool reaches is withdrawn.
- **The Orchestrator:**
  - W43 builds both rulings' Agent parts in one pass.
  - W43's three deviations are accepted at `3509c166`. `isAgentCaller` is exact and refuses a member neither ruling declares, because `context.caller` can arrive from a wire. The getter reads the `workspaces` and `files` lists of the context scope and the run scope one time each, in place of `#live()`, so a turn still reads its `tools` list one time. One more guide sentence names the files compare as a term of the view.
  - The review's O1 and x4 go to a fix round, and its advisories A1 and A2 are recorded in § Refused, § Closed in the 0.0.43 wave, each with its reason.

**Units.**

| Unit | Owned files | Order | Receipt |
| --- | --- | --- | --- |
| The wsedit probe | throwaways | first | `agent-wsedit-probe` |
| W43, the caller and the head rebuild, with the wsfiles ruling's claims F.1 to F.3 | `agents/types.ts`, `agents/validators.ts`, `Agent.ts`, `AgentRun.ts`, `contexts/helpers.ts`, `AgentContext.ts`, the TSDoc of `contexts/types.ts`, `Ledger.ts`, their tests, `tests/setup.ts` with its proofs, the guide's rows and sentences, and `tests/guides.test.ts` | after both rulings | `agent-w43-close2-mut`, committed as `3509c166` |
| The review | — | after W43 | CONFIRMED |
| The fix round on O1 and x4 | `AgentRun.ts`, `Ledger.ts`, `Agent.test.ts` | after the review | `agent-w43-fix-mut`, committed as `f15e8ed4` |

**Claims,** each reddened by its own mutation. A.1 to A.8 and F.1 to F.3 were red first on `9e15d18e`, and O1 on `3509c166`. An `inspect` tool that records its context stands in for Toolbox, which Agent does not install. The agent-level tests use the `createBuiltinAgent` desk, `north` active and `south` registered, for the rulings' `orders` and `returns`. `INSTANCE` stands for a registered workspace.

- **A.1** With `orders` active and no selection, the context a host tool receives has own keys `signal` and `caller`, `isAgentCaller(context.caller)` holds, and `caller.workspace` is `manager.workspace('orders')` by identity. *Mutation: the dispatch passes `{ signal }`.*
- **A.2** After the built-in `switch` selects `returns`, and separately under the `workspace: 'returns'` run option, the next turn's call carries the `returns` instance while `manager.active` is `orders`. *Mutation: the getter reads `workspaces.active`.*
- **A.3** After conversation A switched to `returns`, conversation B's call carries `orders`, and A's later run carries `returns`. *Mutation: as A.2.*
- **A.4** A turn that carries `switch` to `returns` and a host call, in each order, hands the call the `orders` instance, and the next turn's call receives `returns`. *Mutation: the `switch` handler moves the shown workspace when it runs; the order with the host call first stays green, because that call starts before the handler runs.*
- **A.5** With the ceiling's `workspaces` list holding `returns` alone, `orders` active, and no selection, `caller.workspace` is `undefined`. When a `request` listener narrows the list after the turn rendered `orders`, that turn's call receives `undefined`. *Mutation: the getter reads the turn's ceiling in place of the live lists.*
- **A.6** `isAgentCaller` refuses `undefined`, `{}`, `{ subject: 'reader' }`, `{ workspace: 'returns' }`, `{ workspace: null }`, a record whose `workspace` accessor throws, and a revoked proxy, and throws for none; claim F.3 restates the rest of its table. *Mutation: drop the own-key test for `workspace`.*
- **A.7** For each row of selected id, active workspace, and allow-list, the workspace `build` renders is the one `resolveWorkspace` returns. *Mutation: `build` keeps its inline expression with the allow-list test removed.*
- **A.8** After a tool call writes to the shown workspace, the next request of that run contains the edit. A turn after which no rendered file changed reuses the head, whose messages keep their ids. *Red: the probe's control. Mutation: drop the files compare.*
- **F.1** For a context scope listing `['notes.md']`, a run scope listing it, both scopes with their intersection, and neither, `caller.files` equals the ceiling's list, and on the last row the caller holds an own `files` key holding `undefined`. *Mutation: the getter returns `files: undefined`.*
- **F.2** When a `request` listener narrows `files` after the turn rendered, that turn's call receives the narrowed list. *Mutation: the getter reads the turn's ceiling.*
- **F.3** `isAgentCaller` admits `{ workspace: undefined, files: undefined }`, `{ workspace: INSTANCE, files: [] }`, and `{ workspace: INSTANCE, files: ['notes.md'] }`. It refuses `{ workspace: INSTANCE }`, `{ workspace: undefined }`, `files: 'notes.md'`, `files: [7]`, `files: null`, a record whose `files` accessor throws, and each refusal of claim A.6, and throws for none. *Mutation: drop the own-key test for `files`.*
- **O1** With no selection, a `request` listener calls `workspaces.switch('south')` after request 0 is frozen. Request 0 renders the `north` file alone, request 1 renders the `south` file alone, `active` reads `south`, and the call's `caller.workspace` is the `north` instance. *Mutation: the getter resolves the shown id against the live `active` pointer at the call.*

**As built.**

- **Phase 0** (`agent-w43-p0`, `agent-w43-p0-base2`, and `agent-w43-p0-cand`) read yes on each of the wsedit ruling's probe questions before any `src/` edit.
  - A file's value changes identity on a whole, batch, and ranged `write`, a write of the same text, a `prepend`, an empty one included, an `append`, and a `replace` that matches. A `replace` with no match keeps it.
  - `files()` changes length on `remove`, `clear`, and a write to an absent path, and membership on `move`.
  - `manager.workspace(id)` returns one instance at every read.
  - With the files compare applied by temporary mutation in a scratch copy, the request after an edit carried the edit and the request after a turn with no edit kept the head by id. Without it, no request carried the edit.
- **W43** (`3509c166`) built the following:
  - `AgentCaller`, with both keys required.
  - `isAgentCaller`, inside `holds`, over `isRecord` and `matchesExactKeys(value, ['workspace', 'files'])`, reading each member one time. `workspace` is `undefined` or passes `isObject`, because `@orkestrel/workspace` 0.0.17 exports no workspace guard, and `files` is `undefined` or passes `arrayOf(isString)`.
  - `resolveWorkspace(workspaces, selected, allowed)`: the workspace `selected` names, else the active one, while `filterAllowList` admits its id. A selection the registry lacks resolves to `undefined` and never falls back to the active workspace. `AgentContext.build` resolves through it.
  - `AgentRun.observe` stores the rendered workspace's files under the ceiling's `files` list, and the head is stale when that list differs in length or in any element by identity.
  - The dispatch in `Agent` reads `run.caller` one time as each call starts, and `AgentInterface`'s remark reads "Each call's `ToolContext.caller` is an `AgentCaller`."
  - The guide: the three Surface rows, both rulings' sentences at the `switch` paragraph and in § Giving the model documents to read, the wsfiles ruling's sentence beside `scope.files`, and the view sentence in § Scoping a turn. `tests/guides.test.ts` gains one executed case.
  - Red: `agent-w43-red`, 55 failed and 5 passed on `9e15d18e`'s runtime. F.1 and F.3 read red as `isAgentCaller is not a function`, because no tree held a caller without `files`. Green: `agent-w43-green`, 60 passed. The test that asserted no caller reaches a tool handler is restated as "supplies the run caller to a tool handler, with no workspace and no files list on a bare agent", which asserts `{ workspace: undefined, files: undefined }`.
  - Closing ticket `agent-w43-close2-mut`: `src:core` 3696, guides 238, policy 179 with 1 skipped, setup 368, config 545 with 1 skipped, studies 228, and ten mutations, each reddening its claim and restoring byte-identical. Format, lint, and both type checks pass, run directly, and the policy project's `surface` rule passes. The earlier closing ticket `agent-w43-close-mut` failed `src:core` on 3 tests, which the two-list getter and the restated test repaired.
- **The review** (`reviewer` under `orkestrel-falsify`, a fresh context, on `3509c166`) confirmed its four claims: A.1 to A.8 and F.1 to F.3, the caller as a trust boundary, the head rebuild, and no regression.
  - Of 15 mutations, the writer's ten and five of its own, 14 reddened their test.
  - The `rc1` recorder read every request equal against `9e15d18e` on 300 of 300 rows, 5 surfaces by 60 seeds. The 11 rows that execute a host tool differ in the handler context alone.
  - The adverse probe held a narrowing after the render, a run scope that excludes the active workspace, a recorded `switch` beside a run option, two conversations run concurrently, a `files` list narrowed mid-turn, and a handler that writes into its caller.
  - The rebuild matrix of 12 cases replaced the head's message ids after each edit to a rendered file and kept them otherwise, and no hidden file's text reached a request.
  - **O1, below the bar:** with no selection, the caller followed the registry's live `active` pointer, so a host `switch` while the provider answered handed the call a workspace its request never rendered. No ceiling was crossed.
  - **x4, below the bar:** the calibration's `ceiling.workspaces` check survived its mutation, because the calibration's `build` applies the same list.
- **The fix round** (`f15e8ed4`):
  - **O1.** `record`, called right after each build, stores the instance that build rendered, resolved from the build's own inputs in the same synchronous stretch. The getter keeps that instance while the live `workspaces` list admits its id, through `filterAllowList`. A host's `switch` therefore reaches the next turn through the files compare and never the call in flight. The capture sits at the build because a request can be rebuilt after `observe`, by a compaction fold or after a `select` handler awaits.
  - **x4.** The check leaves. The ledger's listing resolves through `resolveWorkspace` with no allow-list, and the `build` that follows applies the context scope's list.
  - Red: `agent-w43-fix-red`, 1 failed at the identity assertion on `3509c166`. `agent-w43-fix-mut`: `src:core` 3697 and guides 238. O1's mutation reddened its test alone, 1 of 461. The mutations of A.2 and A.3, A.4, and A.5 were retargeted at the getter, and each reddened its claim. The x4 check, added back, survived, which is its redundancy receipt. Format, lint, and both type checks pass, run directly.

**Stops.**

| Seam | Stop | Reopens on |
| --- | --- | --- |
| The caller's members | `workspace` and `files`, both required, admitted exactly | a consumer that reads another member |
| The tool contract | `ToolContext.caller` of `@orkestrel/tool`, with no member of its own | the user's word |
| The shared pointer | the built-in `switch` never moves `active`; the host moves it between runs | the user's word |
| The caller's workspace | the instance the request rendered, kept while the live `workspaces` list admits it | the user's word |
| The head rebuild | an identity compare of the rendered files at each turn | a turn-bar reading outside its bar on a run that edits at every turn |
| An `undefined` `files` list | a tool reaches every file of the shown workspace | the user's word |

### Phase 4. Delegation

**Goal.** A host declares a delegate, and a run hands it a task under a ceiling, an authority, and bounds the child cannot exceed.

**The design checkpoint, before any build.** Each probe is a scripted proof on the base and on the proposal, run in phase 0. The checkpoint ends with a ruling recorded in `.orkestrel/agent/plan.md`, and unit 4A is briefed from that ruling.

| Probe | Question | Decides | When it fails |
| --- | --- | --- | --- |
| K1a | Does a `createRunner` execution whose handler returns for every unit resolve every result in input order and run units one at a time, and does `destroy` after it settle cleanly? (F24 is a declaration, not a run.) | the batch composition | a design question: sequential dispatch in the loop with no runner, which needs the user's word against "composes on `@orkestrel/workflow`" |
| K1b | Does a run's own `ToolManager` resolve a delegate tool's throw to a failed result, and return an error result with no handler entered for a call made on an aborted signal? (F25 is a declaration.) | every reserved call executes through the run's manager, and a runner unit's handler is that manager's `execute` | the handler wraps the tool in `attempt` and checks the signal itself |
| K2 | Does a child that shares its parent's `ask`, wired to an `Approver`, wait with no frame until the timeout? | a child holds no `ask` | F31 already rules it; a pass here would reopen the ruling |
| K3 | Does a child run on a ledger's tool manager mark its parent's request, so the parent's later identical lookup returns the `repeat` note? | a ledger takes no delegates until phase 5 | F33 already rules it; a pass here would reopen the ruling |
| K4 | Does a `turn` hook that applies the intersected ceiling to the child hide a tool at the child's next turn after the host narrows the parent's context scope, and does a hook whose read of the parent's scope throws abort the child before that turn's snapshot (F46)? | the live child ceiling, failing closed | the fixed ceiling at the call, with an abort as the host's revocation, stated in the guide |
| K5 | Does a charge from the child's `usage` hook trip the parent's budget signal, and does that abort reach the child? | the parent's cost bound | a charge after the child settles, with the overshoot stated |

**Units.**

| Unit | Owned files | Depends on | Order | Size | Weight |
| --- | --- | --- | --- | --- | --- |
| The checkpoint: the readings of probes K1a to K5 and the ruling | `.orkestrel/agent/plan.md` | phase 2, phase 0 | first | — | 0.5 |
| 4A delegates | `agents/types.ts` (`AgentDelegate`, `AgentOptions.delegates`, `delegate`, `BuiltinNote.stopped`, `BuiltinNote.spent`), `agents/constants.ts` (the two notes, `BUILTIN_LIMITS.task`), `agents/shapers.ts`, `agents/validators.ts` (`isAgentDelegate`), `agents/Agent.ts` (`#dispatch`), `agents/AgentRun.ts`, `agents/helpers.ts`, their tests; the refusal of `agent.delegates` is built in 0.0.42 (claim 4.11) | the checkpoint | serial | medium: authority, concurrency | 1.75 |
| Falsify round and its repairs | — | 4A | — | — | 1.0 |
| 4B documentation | `guides/agent.md`, `tests/guides.test.ts`, TSDoc | the round | after the round | medium | 0.5 |
| Verifier, tree-wide, one time | — | 4B | — | — | 0.25 |

**Claims.**

- **4.1** With `delegates` absent, every dispatched request equals phase 3's. *Scripted.*
- **4.2** At each child turn, the child's ceiling equals the parent's context scope intersected with the parent's run scope and the delegate's `scope`, on every list, over generated filters. A host narrowing during the child's run hides the tool at the child's next turn. A failure to compute the ceiling aborts the child before that turn's snapshot, so no child turn runs under an earlier ceiling: the model reads the `stopped` note and the host reads the error on `delegate`. *Scripted, with a parent scope whose list getter throws on its second read; mutation that drops one list; mutation that swallows the failure.*
- **4.3** No call runs in a child that the parent's `evaluate` does not allow outright: a denied call is denied, and a call ruled `ask` or raised by the floor returns the unanswered note with no handler entered and no ask pending. The child's authority calls `parent.evaluate(context)` on the parent's own instance; it never copies the method (F40). A call the parent's rules allow is allowed in the child, which a copied method would deny. *Scripted, with an `Approver` wired to the parent and a rule-based parent authority.*
- **4.4** A child's tools are the parent's instances. A child advertises no delegate, under any `scope`. *Scripted.*
- **4.5** A child run aborts when the parent run's signal aborts, and no child provider call starts after the parent's `result` settles. A delegate call that reaches the run's manager on an aborted signal returns an error result and builds no child (F25); a child already running takes no further turn (A:530-533). A child stopped by its `limit`, `timeout`, or `budget` returns the `stopped` failure and no partial text. *Scripted, with a recorder on the child's provider and a batch whose second delegate call is queued at the abort.*
- **4.6** A child's answer reaches the parent only as that call's tool message and never in a `system` message. A rejected child reports its error on `delegate`, as the failure arm of the event's outcome, and emits no `fault`; the model's text holds none of the error. Nothing of a child's conversation is stored or registered. *Scripted.*
- **4.7** Each child provider call's reported usage is charged to the parent's run budget; a child whose provider reported none is charged at the estimate of its final answer when it settles, as the loop bills its own unreported calls (F47); the parent's budget instance is never started by a child; exhausting it during a child settles both runs partial with a `budget` stop. *Scripted, with a provider that reports usage and one that reports none; mutation that removes the charge.*
- **4.8** The delegate calls of one batch run one at a time in call order, and each result joins its own call. A delegate tool's throw becomes that call's failed result, the batch's other results stand, and the parent run goes on. The batch's runner is destroyed when its execution settles. *Scripted, by the order of provider calls, with a child that rejects in the middle of a batch.*
- **4.9** `delegate` carries the call, the child's outcome, and the parent run's conversation. The parent's `usage` events and its result's `usage` exclude the child's. *Scripted.*
- **4.10** Each delegate row of § Construction and call refusals refuses as tabled. The declaration is owned at construction: a later change to the host's object changes no child. *Scripted.*
- **4.11** `LedgerAgentOptions` holds no `delegates` key, and a `Ledger` whose `agent` option holds an own enumerable member outside the `LedgerAgentOptions` pick refuses at construction with `ContractError` coded `'structure'`, naming the member, so the spread never carries one to the ledger's agent; a `delegates` member is one such. Phase 5 replaces the refusal of `delegates` with the binding it builds, and adds the key to the pick and to `LEDGER_AGENT_KEYS` then. *Unit table.* Restated on 2026-11-12 by the refusals ruling and closed in 0.0.42 by claim O.5 (§ The re-prepared 0.0.42); unit 4A no longer owns it. It read: a `delegates` member at runtime refuses with `AgentError('BUILTIN')`.
- **4.12** The guide states the trust model of § The delegate's trust model, with each passage an executed fence; the do-not-forward list gains `delegate`. *Gate; unit 4B writes the guide.*
- **4.13** `scaffold surface` reports no collision for the names phase 4 adds. Only a `scaffold surface` run settles it; unit 4A runs it. *Gate.*
- **4.14** A run calls a delegate at most `calls` times, 1 where the declaration sets none. A call past the cap returns the `spent` note and builds no child, in one batch and across turns. *Scripted, with a batch that names one delegate more times than its cap; mutation.*

**Release bar.** As phase 1's, over claims 4.1 to 4.14.

**Stops.**

| Seam | Stop | Reopens on |
| --- | --- | --- |
| Consent in a child | none: `evaluate` alone | a consumer whose child must run a call that needs consent, with ROADMAP items 26 and 34 |
| Delegates under a ledger | none in phases 1 to 4 | phase 5 |
| Delegate bounds | `limit`, `timeout`, `budget`, `window`; `budget` is what bounds the answer | a parent request over capacity after a delegate's answer |
| Delegate calls a run | `calls`, 1 by default | a consumer whose run must hand one delegate several tasks and cannot declare the count |
| Depth and concurrency | depth 1; one child at a time | a consumer whose child must delegate, or whose provider serves children in parallel |

This table is the one home of the three delegation rows the triage of 2026-11-12 closed: consent inside a child, a `delegates` member on `AgentDelegate`, and a delegate concurrency option (§ Refused).

### Phase 5. Delegation under a ledger, ROADMAP item 9

**Ruling, the user, 2026-11-10.** ROADMAP item 9, binding the ledger's `recall` and lookup tools to the run, is phase 5. A ledger can then take delegates, behind its own design checkpoint and estimate.

- **What the binding repairs.** The ledger's lookup wrappers, its authority, and its write retirement read the one live request, whichever agent's run reaches them (F33). A child run on a ledger's tool manager would therefore admit its lookups into its parent's request, so the parent's later identical lookup would read "You already have this result"; a child's write would retire no finding; and a child's `load` would be priced against its parent's remainder.
- **What phases 1 to 4 do.** `LedgerAgentOptions` holds no `delegates` key, and a ledger refuses `agent.delegates` at construction as any member outside the pick, from 0.0.42 (claim 4.11).
- **What the checkpoint settles.** The design of the binding. The phase's units, claims, stops, and weight are set when the phase is reached.

## The rulings on the points

The hard points the user named are Point 1, Point 2, Point 3, Points 6 and 7 together, and the delegate. Each carries every option, its behavior under each adverse ordering, its security analysis, the deciding fact, and a probe where no fact exists.

### Point 1. What an area is

**Ruling.** A skill is the area. `Skill` and `SkillInput` gain `tools`, the names loading the skill advertises.

**Options.**

| Option | What it is | Ruling |
| --- | --- | --- |
| `Skill.tools` | One host-authored unit carries the index line, the guidance, and the tools. | Chosen. |
| An `Area` type | An `Area` type with `AreaManager`, `AgentOptions.areas`, `ScopeFilter.areas`, and `open` and `close` beside `load` and `unload`. | Rejected. It registers a second named, described, host-authored unit beside the skill, with a second verb pair for one act. |
| A label on each tool | Each definition names its area. | Rejected. `ToolDefinition` belongs to `@orkestrel/tool` and holds no such member (F23). |

**Behavior under each adverse ordering.**

| Ordering | Behavior |
| --- | --- |
| The host changes the ceiling mid-run | A narrowed `tools` list hides a tool at the next turn, whatever is loaded. A narrowed `skills` list drops the skill from the shown set at the next turn, so its tools are held back again. The index line of an excluded skill leaves at the next build site, as any scope change to the prompt does (AT:565-568). |
| Overlapping runs with different ceilings | Each turn computes what it holds back from its own run's ceiling and its own conversation. The skill registry is shared host text. |
| An abort mid-load | An abort before dispatch stores nothing, so nothing is loaded. After dispatch starts, the loop stores the tool message, so the skill is loaded for the thread's next run (F5). |
| Hydrate after a narrowing | The record stays in the conversation. The skill shows nothing while the ceiling excludes it, and shows again when admitted. |
| A batch `[load X, a tool of X]` | The tool was not advertised this turn, so the call returns `SCOPE_NOTE` with no decision (F4). It runs the next turn. |
| A child outliving its parent's request | A child starts with nothing loaded. Its loads live in its own conversation, which nothing stores. |
| A child's child | None exists. |

**Security.**

- **Who can widen what.** Nobody widens through a skill. A load advertises names from the skill's `tools` only where the ceiling's `tools` list and the registry already admit them. Registering a skill and listing its tools is host code.
- **Holding back is not authority.** While a turn does not advertise `load`, every tool the ceiling admits is advertised. A host that needs a tool unreachable excludes it from a scope or denies it in its authority. The guide states this in the passage that introduces `Skill.tools`.
- **Narrowing never widens.** Gating reads the registered skills, not the admitted ones, so excluding a skill through `scope.skills` leaves its tools held back.
- **Injection routes.** A skill's name, description, and content are host text read from the registry by name; the model supplies only a lookup key, which no refusal echoes and no prompt renders. A memo cannot name a skill into the head: memo text renders in the context message alone. A stored conversation can mark as loaded only a skill the ceiling admits and the host registered.
- **Principal scoping.** The registry is host text shared by an agent's threads, and "Host text is not secret" (G:2589). What a principal can load is its ceiling's `skills` list.
- **Authority and consent.** `load` passes the host's `evaluate`. It is not `consequential`: it changes what one thread shows, and each tool it reveals still meets the authority on every call.
- **What a refusal reveals.** The names the ceiling admits, which the same prompt's index already lists. An absent name and an excluded name read the same.

**The deciding facts.** [fact] `AGENTS.md` § Design laws, "One concept, one term" and "Minimal public API"; `architecture.md` § System constraints, "Centralize any pattern repeated twice". [fact] F23. [fact] F30: a tool-list change and a body appended to the system content both change the system turn, so a separate area type saves no prefix. [fact] A skill is already the host-registered unit of name, description, and content (`agent/src/core/contexts/skills/SkillManager.ts:114-125`).

**What no fact settles.** Whether a 4B follows the path from index to `load` to call. That is efficacy, not this ruling: arms D and P of § The 4B reading read it in phase 3, and point 14 rules what a miss does.

`RULED(point 1: Skill.tools; no Area type, manager, option, scope list, or error code)`

### Point 2. Where opened state lives

**Ruling.** What the model changed is derived from the conversation. The host selects a workspace with a plain string and shows no skill. Nothing else holds state.

**Options.**

| Option | What it is | Ruling |
| --- | --- | --- |
| Derive from the conversation's success notes | Host preload deferred. | Chosen for the model's part. Its deferral of host pointing is rejected. |
| A `Disclosure` entity | A `Disclosure` entity, `DisclosureState`, a required `LedgerSnapshot.disclosure`, `AgentRunOptions.disclosure` as an instance, and a `'CONCURRENCY'` rule on a shared instance. | Rejected. A run whose host omits the instance gets a fresh state, so the next run on that thread advertises none of the tools its transcript says it loaded. |
| A member on the conversation snapshot | The thread's snapshot carries the shown set beside its messages. | Rejected. The snapshot guard is exact (F35), so every conversation store and stored row changes, for a fact the messages already hold. |
| Chosen | Derivation for the model's part. The host's part, a plain `AgentDisclosure` value on `AgentOptions.disclosure` and `AgentRunOptions.disclosure`, was built in phase 2 and removed by the cut of 2026-11-12; its workspace half stays as the `workspace` option. | — |

**How the derivation reads.** `collectDisclosure(conversation)` walks the section originals and then the live tail. For each tool message it finds the call that owns it through `findToolCall` (F34). A `load` call whose message content equals `BUILTIN_NOTES.loaded` adds its `skill` argument; an `unload` call whose content equals `BUILTIN_NOTES.unloaded` removes it; a `switch` call whose content equals `BUILTIN_NOTES.switched` sets the workspace. Every other message changes nothing.

**Behavior under each adverse ordering.**

| Ordering | Behavior |
| --- | --- |
| The host changes the ceiling mid-run | `resolveDisclosure` intersects the derived set with the turn's ceiling, so a narrowed ceiling changes the shown set, and the refresh drops the body at the next turn. The turn in flight stays pinned (F3). |
| Overlapping runs with different ceilings | State is per conversation, and one conversation holds one live run (A:294-301). Two values opened from one stored snapshot can run together and then diverge, which is the limit F36 already records. |
| An abort mid-load | The state is the stored tool message, and F5 stores it exactly when the handler ran. No second store can disagree with the transcript. |
| Hydrate after a narrowing | The records hydrate with the messages. Excluded names show nothing and return when admitted; nothing is dropped. |
| A batch `[load X, a tool of X]` | The derivation runs at the next turn's step, after the batch's messages are stored. |
| A child outliving its parent's request | A child's records live in a conversation nothing stores, so they reach no thread. |
| A child's child | None exists. |

**Security.**

- **Who can widen what.** Nobody. The derived set is names, and every read of it passes the ceiling and the registry.
- **The stored conversation as an injection route.** A record counts only as an assistant message's `load` call and the tool message `findToolCall` pairs with it, holding the exact note. The following table rules each writer.

| Writer | Can it write such a pair | Bound |
| --- | --- | --- |
| The loop | yes, after the ceiling, `evaluate`, and `ask` passed and the handler succeeded (F4, F5, F6) | the path itself |
| The model, through a denied or refused `load` | no: that tool message holds the denial or the refusal text (F6) | — |
| The model, through another tool that returns its text, a `memo` body included | no: that message pairs with its own call, by position when ids repeat (F34) | — |
| A host that edits the store | yes | host code; the ceiling and the registry |
| A page that holds the conversation | yes: "Read client history and client snapshots as untrusted input" (G:2586) | the ceiling and the registry: the pair shows host text and advertises tools that still meet the authority on every call |

- **Other routes.** A skill name enters as a lookup key alone. A memo enters no part of the derivation. `workspace` is host configuration, a string `requireWorkspace` admits, and it shows no skill.
- **Principal scoping.** The state lives in the thread, and a thread is keyed by its principal (G:2583).
- **Authority and consent.** A record exists only for a call the authority cleared.
- **What a refusal reveals.** An `unload` refusal lists the names this thread loaded.

**Stated limits.** A release that rewords a success note stops reading the older records, and the model loads again at one turn's cost. A host that removes a `load` call's messages from a thread unloads that skill.

**The deciding facts.** [fact] `AGENTS.md` § Design laws, "Derive state"; `typescript.md` § Bindings, "derive every aggregate from the log, never from a running value". [fact] F5, F6, F7, F8, F34. [fact] A run whose host omits an entity instance gets a fresh state, which is the entity option's default. [fact] F26 and taverna's design draft for host pointing: the first consumer loads by "a record of the area is in view" and "the request names a term".

**The proof that gates it.** The derivation table of claim 2.3 is written and green before the loop reads it. A row that cannot be derived exactly stops phase 2 with a design question, and the entity option is its alternative.

`RULED(point 2: derived from the conversation by collectDisclosure; the host gives a workspace string on the agent, the run, the job, and the ledger's agent, and shows no skill, by the cut of 2026-11-12; no entity, no snapshot member, no instance guard; gated by claim 2.3 before the loop is built)`

### Point 3. What a per-run scope means

**Ruling.** Each turn's ceiling is the context scope intersected with the run scope, list by list. The run's `select` runs in place of the context scope's, which runs in place of the agent default.

**Options.**

| Option | What it is | Ruling |
| --- | --- | --- |
| The run scope replaces the context scope | The run scope replaces the context scope for the run; a later `apply` never reaches it. | Rejected. A run option could admit what the agent's own scope excludes, and a pinned run's tools would be immune to `apply`, the one host act that takes a tool from a live run at its next turn. At 0.0.40 and in phase 1 that reach is the `tools` list alone: a narrowed `instructions`, `skills`, `memos`, or `files` list reaches the head at the next build site (AT:565-568), which a run with no fold never meets. Phase 2 makes it the next turn (claim 2.20). |
| Intersection | The ceiling is the run scope intersected with the live context scope; a `request` event; `LedgerOptions.scope`. | Chosen, without `LedgerOptions.scope`: `ledger.agent.context.apply` remains the host's layer. |
| A run filter narrowed one time at the call | `stream()` narrows the context scope with the option and holds the result. | Rejected. It narrows, and then no `apply` reaches the run. |

**Behavior under each adverse ordering.**

| Ordering | Behavior |
| --- | --- |
| The host narrows the context scope mid-run | The next turn's snapshot reads it (F2). The turn in flight stays pinned, and an admitted call completes (F3). A host that needs an immediate stop also aborts the run. |
| The host widens the context scope mid-run | A run with no run scope gains the tools at its next turn. A run with one never exceeds it. In a ledger request, the entry scope caps it (claim 1.10). |
| Overlapping runs with different ceilings | Each run holds its own run scope. The context scope applies to all of them. |
| An abort mid-load | A scope holds no state. |
| Hydrate after a narrowing | A ceiling is never stored. The host gives it at every construction and every run. |
| A batch that mixes calls | Each call is checked against the names the turn read (A:595). |
| A child outliving its parent's request | A child's ceiling is read again at each of its turns, so a narrowing reaches it at its next turn (claim 4.2). |
| A child's child | None exists. |
| The ledger's plan narrows `recall` out during the run | F1 keeps that narrowing an `apply`, restored at settle. The intersection makes it narrow the entry scope, never replace it. |

**Security.**

- **Who can widen what.** Host code alone, through `context.apply` with a wider scope. A run option cannot: it intersects. No model call, tool result, memo, or stored message reaches a scope (claim 2.16).
- **A scope that changes between reads.** A run scope is a host value of a public interface. The loop reads each list one time a turn into its own copy, as A:535 does, so a turn cannot advertise by one reading and check calls by another. `stream()` refuses a value that is not a scope before any state changes.
- **Authority order.** The ceiling is checked before the authority (F37), so an authority never sees a name outside it.
- **Injection routes.** None: no model-authored text enters a scope.
- **Principal scoping.** A host that serves many threads on one agent keeps the principal's reach in the context scope and gives each run its mode as the run scope.
- **What a refusal reveals.** `SCOPE_NOTE` is fixed text beside the encoded call name (AH:623-630).

**Refused as written: "the ledger never calls `context.apply`".** F1 shows that no run option can carry it for the first pass: the run's options are fixed before the plan that decides whether `recall` is advertised. Only an added member that the selection returns could, and a selection holds no tool member by an earlier ruling of the package (CT:259-260: "It carries no tool member"). This design adds none.

**The deciding facts.** [fact] The user's ruling in `.orkestrel/agent/plan.md` § Rulings: "The scope a host gives an agent is its ceiling". [fact] One context scope serves every run (AC:119, AC:186-188). [fact] `Scope.narrow` already intersects (`Scope.ts:59-74`). [fact] F1, F2, F16, F17.

**The proof that gates it.** Item 67's loop is shown red on `e6a3ae75` before unit 1C changes the listener (claim 1.8).

`RULED(point 3: ceiling = context scope ∩ run scope, read one time a turn; AgentEventMap.request added; no LedgerOptions.scope; the first pass's recall narrowing keeps its apply and restore; each ledger pass binds the request's entry scope)`

### Point 4. How the host enables the built-ins

**Ruling.** `AgentOptions.builtins?: readonly AgentBuiltin[]`, absent meaning none. Refusals carry `AgentError` code `'BUILTIN'`. A non-empty `builtins` or `delegates` with no `authority` refuses with `'AUTHORITY'`, the code A:181-186 already uses for the same absence.

- **Chosen: a `builtins` list and the `'BUILTIN'` code.**
- **Rejected: a grouped `AgentOptions.disclosure { tools, core, reserve }`.** Points 6 and 10 derive `core` and `reserve`, so the group would hold one list under a word this design uses for another thing.
- **Delegation** is enabled by declaring `AgentOptions.delegates`, and scoped out through any scope's `tools` list, as the user ruled.

`RULED(point 4: AgentOptions.builtins; AgentErrorCode 'BUILTIN'; delegates declared in AgentOptions.delegates)`

### Point 5. The `build` signature

**Ruling.** `build(options?: ContextBuildOptions)`. Phase 1 gives it `selection` and `scope`; phase 2 adds `disclosure` and `switchable`. `select` gains a fourth parameter, the run scope.

- **Chosen: an options object.**
- **Rejected: `build(selection?, state?)`.** A second optional positional parameter grows a signature the fleet writes as one options object.
- **The name `ContextBuildOptions` stands.** [fact] `ConversationReferenceOptions` (`agent/src/core/conversations/types.ts:326`), `CompactOptions` (`:299`), and `AgentRunOptions` (AT:686) name a method's options the same way.
- Every caller changes in phase 1 (F45). Unit 1B rewrites the call form at all seven sites and in the guide fences, so the tree compiles when it stops: A:938, L:557, L:1021, L:1665, L:1747, L:1961, and L:1974. Unit 1C then removes L:1665 with `#observeTurn`'s build.

`RULED(point 5: build(options?: ContextBuildOptions); select(conversation, request, signal, scope?))`

### Points 6 and 7. The reserve and calibration

**A word.** The room the plan keeps for a later load is the **holdback**. `GaugeInterface.reserve` already names the reply reserve (LT:1164), so the holdback is the plan's term and the options in the tables that follow keep their own word.

**Rulings.** The holdback is derived. Calibration reads no scope. A hidden definition is priced by the rule the ledger holds. An added definition is priced by a term the density probe must confirm before phase 3 builds on it.

**Options for the reserve.**

| Option | What it is | Ruling |
| --- | --- | --- |
| A declared `reserve` | A declared `reserve`, required, in estimate units, charged by a per-request counter. | Rejected. The one figure that lets every skill load is the largest skill's price, which the ledger can compute and the host can only copy. |
| The largest skill the pass can still load | Later loads by the measured remainder. | Chosen. |
| No reserve, refusal alone | The plan fills the room, and the ledger denies a load that does not fit. | Rejected. The plan spends its whole budget (L:1014-1020), so the first load of a request would be denied on most requests. |

**Options for calibration and the digest.**

| Option | What it is | Ruling |
| --- | --- | --- |
| Calibrate on the first pass's advertised set | Digest the reachable catalog, so a ceiling change recalibrates one time. | Rejected. The first consumer builds its turn scope from the visible records (F26), so its ceiling changes on most turns, and each change would cost two provider calls on a ledger built per turn. |
| Calibrate on a set no scope changes | Digest every advertisable definition and the gated set. | Chosen, with a narrower digest: the calibrated set alone, because an edit to a held-back definition changes no calibrated token. |
| A measured density | A third calibration call prices a held-back sample, and the gauge stores the result. | Held as the alternative the density probe opens. |

**Options for the price of an advertised set.**

| Option | Formula | Bias | Ruling |
| --- | --- | --- | --- |
| Subtraction | `overhead − est(C ∖ A) + est(A ∖ C)`, both at `scale` | underprices an addition wherever a definition costs more tokens per estimate unit than prose | Chosen for the subtraction, which is the rule `#spared` holds (F14). |
| Proportion | `(overhead / E(C)) × E(A)` | underprices a subset by the framing share | Chosen for the addition alone, as `max(scale, overhead / E(C))`. |
| Chosen | subtraction at `scale`, addition at `δ = max(scale, overhead / E(C))` | [inference] errs high on an addition, if a definition's tokens scale with its estimate | provisional on the probe |

**What a fact settles, and what a probe must.**

| Part | Settled by |
| --- | --- |
| Calibration reads no scope | [fact] F26 |
| The subtraction for a hidden definition | [fact] F14; it lands in phase 1 |
| The holdback is derived | [fact] `AGENTS.md` § Design laws, "Derive state"; [fact] the consumer's own draft states a derived stop |
| The digest is compared at every `respond` | [fact] F15, and item 68's own text |
| **The addition term** | **no fact. The density probe that phase 0 runs decides it, by the rule § Phase 3 sets before it runs.** |
| **`share.skills`'s default of 0.5** | **no fact. It ships provisional, with its stop; the consumer run and the reading read it.** |
| The addition term's fit to a real prompt | the density probe before the build; claim 3.15, whose first call carries a shown skill's definitions; claim 3.18 for the turn after a load |
| **The result's stand-in** | **F44 is the precedent, not a measurement of results. It ships provisional, with its stop; claim 3.18's report reads it.** |

**The thread's growth.** A load persists with the thread, and each request admits about one more through the holdback. Over a long thread the advertised set would approach the whole catalog, whose price exceeds the room (F27), and the plan's budget would fall to 0. `LedgerShare` gains `skills`: the ledger denies, with the `overflow` note, a `load` that would take the price of the thread's shown skills past `share.skills` of the prompt budget.

**What the model can do after that denial.** It unloads a skill and loads again in the same request, or answers with what it has. The first path needs two rules the ledger did not have, because the wrapper remembers a denied call for the rest of the request (L:291-293, L:328-331): the `deny` listener does not record a denial whose reason is the `overflow` note, and a successful `unload` releases the request's `load` calls that were denied for room, through `LedgerRequest.release`. With no `unload` between, the identical retry is still a repeat, so a model that only retries ends its pass as it does at 0.0.40.

**Behavior under each adverse ordering.**

| Ordering | Behavior |
| --- | --- |
| The host widens the scope during a request | Nothing added is advertised before the next request: each pass binds the entry scope (claim 1.10). Without that binding, subset pricing would let a widened scope carry definitions the plan never priced; at 0.0.40 the whole overhead was always subtracted (F13). |
| The host narrows the scope during a request | The next turn advertises less. The `request` event records what was sent, and the next reported prompt is the measure. |
| Overlapping runs with different ceilings | A ledger serves one request at a time (L:459). Two ledgers with different ceilings over the same registries hold the same digest, because the calibrated set reads no scope. |
| An abort mid-load | The price is committed when the call is admitted. An aborted call leaves it standing until the next call's reported prompt replaces it, which errs toward refusal. |
| `load X` denied for room, `unload Y`, `load X` in one request | The `unload` releases the denied `load`, which is evaluated again and admitted where it fits (claim 3.6). |
| `load X`, then `recall`, in one request | `#recall` builds its carried estimate with the shown set, so the loaded body is counted and the listing's room is not overstated (claim 3.19). |
| A load admitted, then the tool it reveals returns a large result | The admission test and the holdback each keep one result's price (claim 3.5). A result larger than the stand-in can still exceed it; the stops name that. |
| Hydrate after a narrowing | The stored gauge is reused and no calibration call is made (claim 3.12). The plan prices the narrower set. |
| A batch `[load X, a tool of X]` | The load is committed one time; the tool call returns `SCOPE_NOTE`; the next turn's request carries the tools and is measured. |
| A batch of loads | `committed` sums them against one remainder. |
| A batch `[a lookup, load X]` | The lookup commits one result's price when the wrapper clears it, so the `load` is tested against what is left. In the other order the lookup is not counted. |
| A host registers a skill or a tool during a request | Unpriced until the next `respond`, whose digest comparison calibrates. Stated limit, as at 0.0.40. |
| A child outliving its parent's request; a child's child | A ledger takes no delegates until phase 5. |

**Security.**

- **Who can widen what.** Pricing widens nothing. It can only refuse.
- **Spending the room.** The model can spend room by loading. One request is bounded by the measured remainder, the batch sum, and the repeat stop; one thread is bounded by `share.skills`; the turns are bounded by `limit`.
- **Spending the room with memos.** Under an authority that approves every ask (F26), a steered model could add an index line a request until the head left the plan no budget, and no built-in removes a memo. § Each built-in closes it at the source: `remember` writes only a name the ceiling's defined `memos` list holds, so the index a model can grow is the host's list, each line capped by `BUILTIN_LIMITS`. A revision adds no line. The store's history still grows by a revision a write, which is ROADMAP item 40's subject.
- **Injection routes.** None reaches a price. The index line a `remember` adds is priced before it is admitted.
- **A stored gauge.** A snapshot's gauge is checked for range and digest (`agent/src/core/ledgers/Gauge.ts:45-50`; L:313-325), and "The checksum detects edits, not authenticity" (LT:468). A host that stores snapshots where a client can edit them already trusts that store with the conversation.
- **Principal scoping.** A gauge belongs to one ledger, which serves one thread.
- **What a refusal reveals.** The `overflow` note is fixed text and states no size.

`RULED(point 6: computeToolPrice by subtraction at scale, in phase 1 as #spared holds it; the addition term max(scale, overhead / E(C)) provisional on the density probe; holdback = the largest loadable skill's price and one result's; LedgerShare.skills caps a thread; an unload reopens a load denied for room; no stored rate)`

`RULED(point 7: calibrate on manager and built-in definitions minus the names registered skills list, the minus applying only where load is enabled; digest that set; compare at every respond, from phase 1; no recalibration on a ceiling change or a load)`

### Point 8. Where the room refusal sits

**Ruling.** In the ledger alone, for `load` and `remember`, against the measured remainder and the thread's share, through the ledger's authority wrapper.

- **Chosen: placement in the ledger, with coverage of `remember`.** The wrapper sees every call before dispatch (L:289-307), so the bare agent gains no pricing seam.
- **Rejected: a counter in the bare agent.** A bare agent's bound is its `window`, which already folds or refuses an over-window request (A:766-803), and a `load` that overflows it is the same class as a tool result that does.
- **Unloading refunds nothing** because nothing is counted across calls: the next call's reported prompt is the measure.
- **Room for the result.** The admission test leaves room for the result of the tool the load exists to reach, and the first consumer's own draft keeps that room: "Loading stops before a guide that would leave the plan less room than the largest page `list` returns and one more lookup need". The test and the plan's holdback each add one result's price. No fact says how large the next result is, so the ledger stands a past value in for it, as it does for the next reply (F44): the longer of the longest tool result the thread stores and the gauge's reply reserve.
- **The batch.** The authority clears a whole batch before any call runs (A:596). A lookup or a write the wrapper clears commits one result's price, so a `load` later in the batch counts it. A lookup after the `load` is not counted, which the stops name.

`RULED(point 8: ledger only; load: (committed + price + result) × (1 + LEDGER_SCALE_DRIFT) ≤ remainder − predict, and the share.skills cap; remember: the same without the result; LedgerNote.overflow)`

### Point 9. Refusal text

**Ruling.** A refusal states the subject and lists the names the ceiling admits, echoes no argument, and reads byte for byte the same for an absent name and a name outside the ceiling.

- **Taken from the candidate-list option:** the candidate list and the `ToolError` code `'ARGUMENTS'`. [fact] `documentation.md` § Agent-facing surfaces requires "the valid candidates" in a refusal.
- **Taken from the fixed-note option:** no echo, and no existence oracle. [fact] `methods.md` § Make refusal text corrective without pretending to know intent: "a fixed status-first note with a next action and no argument echo".
- **Rejected: an encoded echo of the unknown name.** The model sent it and learns nothing from reading it back.
- **Rejected: a fixed note with no list.** It omits what that rule requires of every refusal: the valid candidates.
- **The list is capped.** A registry of hundreds of names would put hundreds of names into each refusal, outside the ledger's room test. `describeCandidates` lists at most `BUILTIN_LIMITS.candidates` names, in registry order, and then one fixed sentence that sends the model to the index in its prompt. The text stays the same for an absent name and an excluded one.

`RULED(point 9: ToolError 'ARGUMENTS'; text from describeCandidates(subject, admitted names), capped at BUILTIN_LIMITS.candidates; no argument echo; identical for absent and out of ceiling)`

### Point 10. How skill tools are gated

**Ruling.** Implicitly, through the registered skills, and only while the run can load.

- **Chosen: derivation through the registered skills.** While a turn advertises `load`, a tool any registered skill names is advertised only while a shown skill names it. While a turn does not advertise `load`, the allow-list alone decides.
- **Rejected: an explicit `core` list.** It is a second list that can disagree with the skills' lists: a tool in both, or a tool in neither that no turn can reach.
- **Rejected: a run-entry `'BUILTIN'` refusal for skills that name tools while `load` is unlisted.** It makes a run whose scope lists exactly its tools unable to call them, and that run is the delegate a small model needs most.
- `load` and `unload` are never held back. § Point 1 holds the security analysis.

`RULED(point 10: held back = named by a registered skill, not named by a shown skill, and load advertised this turn; no core list; no run-entry refusal)`

### Point 11. The delegate's shape

§ Rulings on the delegate holds the whole contract.

`RULED(point 11: one tool per AgentDelegate in AgentOptions.delegates; { task }; at most calls a run; ceiling read at each child turn; the parent's evaluate and no ask; depth 1; provider optional; no result cap; usage charged to the parent's run budget; one createRunner execution per batch over the run's ToolManager; no delegates under a ledger until phase 5; the delegate adds no AgentJobInput member; built in phase 4 behind its checkpoint)`

### Point 12. The workspace switch's name and state

**Ruling.** `switch { workspace }`. Its state is derived from the conversation, with the `workspace` option as the host's starting value and the registry's active workspace after that. Restated on 2026-11-12 by the O-and-D ruling, which moved the starting value from `disclosure.workspace`.

- **Chosen: the name `switch` and the derivation.** `switch` is the word the workspace registry and the toolbox tool already use for this act.
- **Rejected: the name `workspace`.** A bare noun names a read, and this built-in acknowledges a change.
- The agent's shared pointer never moves. The index of admitted ids renders in the context message, because an id can carry a user's label, and only while a turn advertises `switch`.

`RULED(point 12: switch; derived; the workspace option then workspaces.active as defaults; ScopeFilter.workspaces)`

### Point 13. The ledger types

**Ruling.** `LedgerSnapshot` and `LedgerGaugeSnapshot` keep their shapes and their meaning. `LedgerGauge` keeps its shape unless the density probe fails.

- **Chosen: unchanged shapes.** The digest still names "the definitions the calibration request carried" (LT:348-350).
- **Rejected: a required `disclosure`, a `rate`, and a changed digest meaning.** Points 2, 6, and 7 remove each need.
- **Changed in phase 1:** `renderStub` gains `offered`.
- **Changed in phase 3:** `LedgerAgentOptions` picks `builtins` and `workspace` (`disclosure` until the cut of 2026-11-12), and never `delegates` before phase 5. `LedgerNote` gains `overflow`. `LedgerShare` gains `skills`. `GaugeCall` gains `added`. `LedgerRequestInterface` gains `commit` and `committed`.
- **Three words are not the obvious ones,** because each already names something else in this module. The note is `overflow`, not `room`, because `GaugeInterface.room` is the recall room (LT:1176). The plan's term is the holdback, not a reserve, because `GaugeInterface.reserve` is the reply reserve (LT:1164). The request's members are `commit` and `committed`, not `charge` and `charged`, because `charged` is the loop's word for completion tokens a meter already consumed (AH:818). `scaffold surface` reads exported names and sees none of them, so claim 3.17 adds a check by hand.

`RULED(point 13: snapshot shapes unchanged; LedgerGauge unchanged, conditional on the density probe; the listed members added in the phase named, under the names given)`

### Point 14. Whether the 4B reading gates the release

**Ruling, the user, 2026-11-10.** The reading is reported before the phase 3 release, and an efficacy miss does not hold the release. A design claim the live run falsifies does. Two live instruments close phase 3, and they do different jobs.

| Instrument | What it reads | Holds the release |
| --- | --- | --- |
| The consumer run | claims 3.14 and 3.15, as restated on 2026-11-12: on arm `index` (D on a ledger) a fresh thread's first request carries `load` and no tool a skill holds, every request's first call is served and within capacity, and each first call is within 1.06 of its price; arm `taverna` (O) holds the capacity and price clauses by its receipt. Both read the call the plan composed, before the model chooses anything in the request, so neither depends on what the model chooses. The run's later turns are reported under claim 3.18, and the hydrate is reported for each thread where the model loaded. | yes, like any claim |
| The reading | claim 3.16: whether a 4B, pointed or unpointed, picks the right tool through the index and `load` | no: it is reported before the release, and a miss changes which composition the guide recommends to a small-model host. Unit 3C writes that passage from the reading's report, before the verifier's gates. It is the reading ROADMAP items 6 and 58 wait for. |

A defect either run shows in a claim of this design holds the release like any failed claim: a request over the capacity the plan priced as fitting, a tool advertised outside the ceiling, or text in `system` the host did not author.

- **Why not a block on a miss.** The scripted claims and the consumer run prove the mechanism. A miss on one model and one catalog is a fact about that pair, and taverna's own gate reads its own catalog before it promotes anything.
- **Why not an unqualified "not a gate".** The reading's run can still falsify a mechanism claim, and a falsified claim holds the release whichever run shows it.
- **Claim 3.14 reads no choice.** The release bar holds it, and the point exempts efficacy, so the claim reads what the plan composed.

`RULED(point 14: ruled by the user: the reading is reported before the phase 3 release and its efficacy does not gate; the consumer run's claims gate; a claim either run falsifies gates)`

## Rulings on the delegate

### Options

| Option | What it is | Ruling |
| --- | --- | --- |
| One tool per declared delegate | One tool per declared `AgentDelegate { name, description, provider, system?, filter, builtins?, limit? }`; no inherited budget; an uncapped result; depth not addressed. | Chosen for the shape. |
| One `delegate` tool over profiles | One `delegate { profile, task }` tool over `AgentOptions.delegation { profiles, depth }`; the parent's budget inherited; a required window; a capped result; `consequential` and `untrusted`. | Rejected for the shape: a profile key has no scope list to exclude it. Its signal, its awaited lifetime, and `untrusted` are kept. |
| Host-created children alone | No model-facing delegate; a host fans out through `AgentJobInput.children`. | Rejected. The user ruled that delegation ships as a built-in. |

### The delegate's trust model

**The invariant.** A child calls no tool outside its parent's ceiling at that moment, and makes no call its parent's authority would not allow outright. Every row of the chain serves it. The invariant does not say "no call its parent could not make", which is false of presentation: a child whose `scope` lists a tool and omits `load` is shown that tool immediately, while its parent's turn held it back until a load (§ Point 10). The ceiling and the authority are the same for both.

| Link | Who authors it | What it can do | What bounds it |
| --- | --- | --- | --- |
| The parent model | the model, a proposer | choose an advertised delegate's name and write `task` | the ceiling by name, the host's `evaluate`, the floor, and the parent's own `ask` for the delegate call (F4, A:989-1037) |
| The delegate call | the model | start one child run | `delegateToolShape`; the batch runner; the delegate's `calls` cap for the run, 1 by default (claim 4.14), because a bare agent holds no repeat stop |
| The host's declaration | the host | fix the child's name, description, scope, provider, system text, and bounds | validated and owned at construction (claim 4.10); the model supplies none of it |
| The child's ceiling | derived at each child turn | admit, at most, what the parent's turn admits | the parent's context scope ∩ the parent's run scope ∩ `delegate.scope`, with no `select`; a failure to derive it aborts the child (claim 4.2) |
| The child's authority | a wrapper that calls the parent's `evaluate`, with no `ask` | allow what the parent's rules allow outright | F32: a call ruled `ask`, or raised to `ask` by the floor, is denied as unanswered (claim 4.3) |
| The child's tools | the parent's instances | run under the same principal as the parent | the child's ceiling; the held-instance check in the child's own loop (F3) |
| The child's built-ins | the parent's `builtins` | load, read a memo, switch, within the child's ceiling | `remember` is `consequential`, so no child writes a memo |
| The child's result | the child model | return text | tool role, `untrusted: true`; a partial, blank, or rejected child returns the fixed `stopped` note alone |
| The parent's next turn | the parent model | read the result as it reads any tool result | every later call meets the parent's ceiling and authority again |

**What the invariant settles.**

- **`task` as an injection route.** `task` enters the child as its one `user` turn. In the parent that role is the principal's request; in the child it is the parent model's text, which a tool result the parent read may have steered. The child therefore obeys text the principal never wrote. The invariant bounds the result: the child reaches nothing the steered parent could not reach itself, and it reaches less, because it cannot ask.
- **The result as an injection route.** The answer can relay text the child read. It is tool-role data, annotated `untrusted`, and it grants nothing: the parent's later calls are gated as before.
- **A memo as a route across runs.** A child cannot write one (F32 with the floor), so a steered child leaves nothing that a later prompt renders.
- **A skill name, a stored conversation.** A child's loads live in its own conversation, which is created for the call, never registered, and never stored.
- **Principal scoping.** The child's tools are the parent's instances, so a tool bound to a principal keeps it (TF:189, TF:202 show the pattern). The memo set and the registries are the parent's, read through the child's ceiling.
- **Custody.** A delegate that declares another provider sends that provider the child's whole prompt: the instructions, skills, memos, and workspace files its ceiling admits. The host bounds it with `delegate.scope`. The guide states this beside `provider`.
- **Consent.** A person is asked at most for the delegate call itself, through the parent's own stream. Nothing in a child asks, so no ask waits without a frame (F31), and no approval covers a call the person cannot attribute.
- **What a refusal reveals.** The `stopped` note is fixed text. It holds no child error, no partial answer, and no reason.
- **Cost.** One child spends model time inside its `limit`, `timeout`, and `budget`, and its usage is charged to the parent's run budget. With no `consequential` floor and no repeat stop, a steered parent could queue any number of children in one batch, each with no deadline by default, unless the number is bounded. A run calls a delegate at most `calls` times, 1 unless the host declares more, so the children of a run are bounded by the host's declarations, and a call past the cap builds no child.

### The contract

| Question | Ruling | Evidence |
| --- | --- | --- |
| How a host declares one | `AgentOptions.delegates`. Absent means none. | — |
| How a host scopes it out | Any scope's `tools` list that omits its name, an authority rule on its name, or a skill that lists its name and stays unloaded. | [fact] the user: "it can be scoped out if we don't want to give an agent the capability" |
| What the model supplies | The tool's name and `task`. | — |
| How often a run can call it | `delegate.calls` times. Default: 1. A call past it returns the `spent` note. | claim 4.14 |
| The child's ceiling | Read at each child turn, through a `turn` hook that applies the intersection to the child's context. A hook that fails aborts the child before the turn's snapshot. | [fact] A:517, A:535, F46; probe K4 |
| Authority | A wrapper that calls `evaluate` on the parent's instance. No `ask`. | [fact] F31, F32, F40; probe K2 |
| Provider | `delegate.provider`. Default: the parent's. | — |
| System text | `delegate.system`, host text. Default: none. | — |
| Instructions, skills, memos, workspaces | The parent's registries, read through the child's ceiling. | — |
| Built-ins | The parent's `builtins`, advertised only where the child's `tools` list admits them. | § Point 10 |
| Delegates | None. Depth is 1. | the following list |
| Conversation | A fresh one. `task` is its one `user` turn, through the `prompt` run option. | [fact] AT:746-752 |
| Disclosure | None. The child starts with nothing loaded, on the registry's active workspace. | — |
| Budget | A fresh token budget per call from `delegate.budget`. The parent's instance is never passed. | [fact] F9 |
| Parent's cost bound | Each child provider call's reported usage is charged to the parent's run budget through `chargeUsage`, from the child's `usage` event. A child whose calls reported no usage emits no such event, so the tool charges the estimate of its final answer when it settles. | [fact] F10, F47; AT:242; probe K5 |
| Window | A fresh request budget per call from `delegate.window`, measured by `estimateRequest`. Default: none, as on `AgentOptions`. | [fact] AH:464-471 |
| Limit, timeout | `delegate.limit`, `delegate.timeout`. Defaults: `DEFAULT_AGENT_LIMIT`, none. | — |
| Scheduler, `strict` | The parent's. | — |
| What returns | The child's final `content`, as that call's tool message. | — |
| What the host observes | `delegate` on the parent's emitter, carrying the call, the outcome, and the parent run's conversation: the child's result for a settled child, its error for a rejected one. No `fault`: that event is the warn channel for a failed optimization and "never the run's own outcome" (AT:286-295), and a ledger listens to it. | [fact] AT:286-297; L:354 |
| Annotations | `untrusted: true`. Not `consequential`. | the following list |
| Cancellation | The child's signal is the parent run's, from `ToolContext.signal`. | [fact] A:1172 |
| Lifetime | The loop awaits the child inside the parent's dispatch, so no child run is live after the parent's `stream` settles. A child provider that ignores its signal holds the parent, as any handler does. | [fact] F5; AT:771-778 |
| Under a ledger | Not available before phase 5. `LedgerAgentOptions` holds no `delegates` key. | [fact] F33; probe K3 |
| Size of the answer | Agent cuts nothing. `delegate.budget` is a completion-scoped token ceiling (BD:239), so a child that generates past it settles partial and returns the `stopped` note. A delegate with no `budget`, on a provider with no cap of its own, returns an answer of any size; the guide says so beside `budget`. | the following list |

### Why these

- **A child holds no `ask`.** Sharing the parent's authority instance fails on F31: the child's ask is registered with the approver, no frame crosses, and the child waits until its timeout. A child that holds `evaluate` alone fails closed immediately (F32), and the unanswered note tells the child to report that approval is needed, which the parent can then seek itself.
- **No delegates under a ledger before phase 5.** F33: a child's lookup would be admitted into its parent's request, so the parent's later identical lookup would read "You already have this result"; a child's write would retire no finding; a child's `load` would be priced against its parent's remainder. ROADMAP item 9 names the repair, binding the ledger's tools to the run, and it is phase 5.
- **A ceiling read at each child turn.** Point 3 chose intersection because a host's narrowing must reach a live run. A child whose ceiling was fixed at the call would be the one run that narrowing misses.
- **No inherited budget instance.** "The child's budget is the parent's run budget" fails on F9: the child's `start()` re-arms the instance, and the parent's composed signal keeps the stale one.
- **The parent's bound still holds.** The charge through the child's `usage` event trips the parent's budget signal, which is in the parent's run signal, which is the child's signal. The sentence at AT:767-769, "never inside a handler", gains this exception.
- **Not `consequential`.** A delegate call spends model time inside the child's bounds and grants the child nothing the parent lacks. A host that wants each delegation confirmed writes an `ask` rule on the name. A `consequential` annotation would deny every delegation on a host with no approver.
- **No result cap.** A `result` member is a character cut of a model's answer, under a name that reads as the answer itself. A cut changes what the parent reads without telling it. The triage of 2026-11-12 closed the deferral row on a fit of a lookup's result, and phase 3's capacity gate ends a pass a large result cannot fit (§ Refused).
- **Depth 1.** Each level multiplies model time on a small model, and no consumer delegates at all (F26). A later `delegates` member on `AgentDelegate` is an additive change.

### Behavior under each adverse ordering

| Ordering | Behavior |
| --- | --- |
| The host narrows the ceiling mid-run | The child's next turn reads it. The child's turn in flight stays pinned, as the parent's does. |
| Overlapping runs with different ceilings | Each run's children take that run's ceiling, and charge that run's budget. |
| An abort during a delegate call | The signal reaches the child, which takes no further turn (A:530-533), settles partial, and returns the `stopped` note. A unit of the batch not yet started still reaches the run's tool manager, which returns an error result on the aborted signal and enters no handler (F25), so no further child is built. The loop stores a tool message for each call (F5). |
| A child that throws or rejects | The run's tool manager turns the throw into that call's failed result (F25). The runner sees a returned value, so its fail-fast never runs and the parent run goes on. |
| A hook that cannot read the parent's scope | The child aborts before that turn's snapshot (F46). It never runs a turn under an earlier ceiling. |
| A batch that names one delegate more times than `calls` | The calls up to the cap run in order. Each later one returns the `spent` note and builds no child. |
| A delegate provider that reports no usage | The parent's budget is charged the estimate of the child's final answer at settle (F47). The child's own `budget` bounds it meanwhile. |
| Hydrate after a narrowing | Nothing of a child is stored. The parent's thread holds the delegate call and its tool message, as data. |
| A batch `[load X, a delegate X names]` | The delegate was not advertised this turn, so the call returns `SCOPE_NOTE`. |
| A batch `[a delegate, another tool]` | The other tool runs in the parent while the child runs. A tool that is unsafe under two concurrent calls is already exposed to a batch at 0.0.40 (A:1176). |
| A child outliving its parent's request | It cannot: the parent's dispatch awaits it, and its signal is the parent's. No detached path exists; detached work is a job on the host's queue. |
| A child's child | None. The child is built with no delegates, and a delegate name in its `tools` list names nothing it holds (claim 4.4). |

### What `@orkestrel/workflow` provides, and what Agent adds

**What Agent uses from it** [fact]:

- `SchedulerInterface` paces the loop (A:30, A:522-529), a registry-built agent (`AgentRegistry.ts:12`, `:63`), and the ledger's classifier (L:244).
- `ControllerInterface` is the handle `AgentFanout.execute` receives (`AgentFanout.ts:2`, `:57`).
- `createRunner` backs `createAgentRunner` (`agent/src/core/agents/factories.ts:17-19`, `:305-313`).

**What it provides for delegation** [fact: WD, declarations]:

- A `Runner` that drives a set of declared units through a bounded queue, one at a time by default, and resolves their results in input order (WD:2736-2755).
- A per-unit `ControllerInterface` with its own signal (WD:391-436).
- A scheduler any agent can share.

**What it does not provide.** A ceiling, an authority, a conversation, a budget charge, a mapping from a unit to a tool call, or a limiter that outlives one `execute`: a `Runner` is one-shot (F24).

**What Agent adds.**

- The declaration, its validation, and its owned copy.
- One tool per delegate, created per run.
- The child: its ceiling hook, its `evaluate`-only authority, its fresh conversation and bounds, and its `usage` hook.
- The run's own `ToolManager`. From phase 2 the run's `AgentRun` entity holds one, with every built-in in it; phase 4 adds one tool a delegate. Every reserved call executes through `manager.execute(call, { signal })`, never through the tool directly.
- The routing in `Agent#dispatch`: the delegate calls of one batch become the declared units of one `createRunner<ToolCall, ToolResult>` execution, at the default concurrency of 1. The unit's handler is that manager's `execute` for the unit's call, with the parent run's signal. Results return in call order and join the batch's other results by index. Without it, `Promise.all` at A:1176 would start every child of a batch together against one provider.
- The runner's teardown: `Agent#dispatch` awaits `runner.destroy()` in a `finally` after the execution settles (F24).
- The `calls` count, the result mapping, the `stopped` and `spent` notes, and the `delegate` event.

**Fail-fast never engages.** The handler returns a `ToolResult` for every call, because `ToolManager.execute` resolves a handler throw to a failed result and returns an error result on an aborted signal (F25). A `Tool` called directly does neither (TD:362-363): the delegate's throw of the `stopped` note would reject the unit, fail the runner fast (F24), and reject the parent's dispatch. **The runner's per-attempt `timeout` is unused,** because a runner timeout fails the unit and aborts its siblings (F24); the child's deadline is its own `timeout`. **The runner is never aborted:** the parent's signal reaches each unit through the manager. **The `WorkflowRunner` and its definition tree are unused:** a delegate call is one unit with no phase.

Probes K1a and K1b turn these lines from declarations into readings before unit 4A is briefed.

### The `AgentFanout` subset hole

Built in phase 1. A job names its provider, its scheduler, and its bounds (AT:988-1015) as well as its tools and authority, and a child could exceed each. `AgentFanout.execute` checks every job under its unit against that job's own parent, before it spawns any, and throws `AgentError('REGISTRY')` naming the job's path in the tree and the member at fault:

| Member | A child is within its parent when | Why |
| --- | --- | --- |
| `tools` | each name is in its parent's `tools`; a parent with no `tools` holds none (F11), so its child names none | the tool ceiling |
| `authority` | absent, or equal to its parent's | a registry name is the instance; a child that names tools and no authority is refused by `AgentRegistry.build` as at 0.0.40 (`AgentRegistry.ts:118-124`) |
| `provider` | equal to its parent's | another provider receives the child's messages |
| `scheduler` | absent, or equal to its parent's | the host's pacing |
| `limit` | its effective limit is at most its parent's, where an absent limit is `DEFAULT_AGENT_LIMIT` | the turn cap |
| `timeout` | where its parent holds one, it holds one no larger | the deadline |
| `budget` | where its parent holds one, it holds one no larger | the cost ceiling |
| `system`, `messages` | free | host text and seed data |

- **The whole tree, before anything runs.** The pure helper `scanJobTree` walks every descendant of the unit's job and returns each violation. A depth-2 violation therefore refuses the root before the root or any child has run (claim 1.17). Every later unit of the tree walks its own subtree again, which finds nothing.
- **Audit first.** A job's `children` cross the job contract as bare JSON records (F39), so the walk audits each descendant through `agentJobContract` before it reads a member, and a malformed child refuses with `'REGISTRY'` and its faults.
- **Per child, not per tree.** Each child is held within its parent. The children of one parent can together spend more than it; their number is the host's data.
- **Retry.** The check runs on every attempt, before the unit is recorded as fanned out.
- **A child on another provider, or under another authority,** is a root job the host enqueues.

### What a durable job carries

**Ruling, the user, 2026-11-10.** The durable-job unit, built after phase 2, gives a job's input a narrowing scope and disclosure, checked against its parent. The cut of 2026-11-12 keeps the job's `workspace` and removes its skill half. § The durable-job unit holds the unit. Phases 1 to 4 add no `AgentJobInput` member of their own, and the delegate adds none.

`RULED(delegate: contract and trust model as tabled; scoped out by scope, authority, or skill; at most calls a run, 1 by default; ceiling read at each child turn, without select, failing closed; a wrapper over the parent's evaluate and no ask; the parent's tool instances, registries, scheduler, strict, and builtins; fresh conversation, budget, window; returns final content as a tool message; depth 1; aborted by the parent's signal and awaited by the parent's dispatch; executed through the run's own ToolManager, one createRunner execution per batch; outcome on the delegate event; none under a ledger before phase 5, refused at its construction from 0.0.42; AgentFanout refuses in phase 1 a child that exceeds its parent on any tabled member, over the whole tree; the durable job carries a narrowing scope and a workspace, built after phase 2; phase 4 opens with probes K1a to K5, run in phase 0)`

## Rulings on the points one proposal raised

| Point | Ruling | Carrier |
| --- | --- | --- |
| Memo names and descriptions hold one line, with no control or format code point | Adopted. The `remember` handler refuses one, because F29 bars the flagged pattern a shape would need and F28 covers line breaks only. | 2C; claim 2.14 |
| An in-request `remember` charges its index line | Adopted, as the ledger's room test on `remember`, denied with the `overflow` note. | 3A; claim 3.5 |
| One `MemoManager` per principal, saved from its `add` event | Adopted as a guide passage with an executed fence. Agent loads and saves no store. | 3C; claim 3.13 |
| Built-ins never read `ToolContext.caller` | Adopted as a fact, not a claim: the loop dispatches with `{ signal }` alone (A:1172), and a built-in instance is reachable through the loop only. | authority table |
| Workspace ids can carry user labels | Adopted. The workspace index renders in the context message. | 2B; claim 2.15 |
| Taverna's approve-all `ask` approves `remember` | Adopted as a guide sentence and a consumer-run step. | 3C; consumer run |
| The batch `[load, tool of that skill]` | Adopted. | claim 2.4 |
| Abort consistency | Adopted, and it holds by construction: the state is the stored tool message (F5). | claim 2.3 |
| The 238-definition `total > 0` fixture | Adopted, red first. | claim 3.2 |
| `Scope.narrow` intersects each added list | Adopted for `workspaces`, through `intersectFilters`. | 2B; claim 2.15 |
| `MemoOrigin` set by `remember` | Adopted, with `conversation` alone. The handler holds no honest source for the message id. | claim 2.14 |
| Static built-in definitions for a relay | Adopted as the exported `collectBuiltinDefinitions` helper, which the ledger needs for pricing. Page-side disclosure through a relay was closed on 2026-11-12 (§ Refused). | 2C; claim 2.17 |
| Per-run skill preload | Adopted as `disclosure` in phase 2, and removed by the cut of 2026-11-12, which kept its workspace half as `workspace`. | § Point 2 |
| The prefix cost of a load | No design change. A load changes the system turn (F30), so the conversation after it is read again. The one reading of a changed tool list is a first-text p90 of 2.12 s against 1.44 s [lane: `studies/README.md:72-77`]. The reading reports first text on the turn after a load. | § The 4B reading |

`RULED(one-proposal points: each adopted into the unit and claim named, except page-side disclosure, closed on 2026-11-12, and the per-run skill preload, removed by the cut)`

## Rulings on the names

| Name at risk | Ruling | Law |
| --- | --- | --- |
| `AgentProfile` | Refused. `AgentDelegate`, plain declared data, as `LedgerLookup` and `AuthorityRule` are. | `names.md` § Type-level identifiers |
| `AgentProfile.result` | Refused. No cap member exists. | — |
| `disclosure` for three concepts | One concept: the value `AgentDisclosure`, the loaded skills and the selected workspace. It appears as the build's option and in `collectDisclosure` and `resolveDisclosure`. The agent's and the run's option of that name left with the cut of 2026-11-12, and `workspace` took its workspace half. | "One concept, one term" |
| `DisclosureState`, `ContextState` | Refused. No state type exists. | — |
| `core` | Refused. Derived. | "Derive state" |
| `rate` beside `scale` | Refused. Derived density; `GaugeInterface.rate` keeps its one meaning. | "One concept, one term" |
| `load`/`unload` and `open`/`close` | One pair: `load`, `unload`. The guide, the `Skill` TSDoc, and `methods.md` already say "load"; `open` and `close` are section texts on `SkillManagerInterface` (CT:750-753) and `open` hydrates a conversation. | "One concept, one term" |
| `expand` beside `render` | Refused. The body renders through the exported helper `renderSkillBody`; a host override was closed on 2026-11-12 (§ Refused). | "Minimal public API" |
| `ContextBuildOptions` | Kept. § Point 5. | precedent |
| `createBuiltinTools` | Refused. No factory. The run's own entity creates each tool with `createTool`, as the ledger creates `recall` (L:261-269). | `names.md` § Value-level identifiers |
| `resolveCeiling` | Refused. Layers compose through `intersectFilters` and `intersectKeys`. | `names.md` § Standalone helpers |

Names this design adds, by the phase that adds each:

| Phase | Names |
| --- | --- |
| 1 | `ContextBuildOptions` (`selection`, `scope`), `AgentRunOptions.scope`, the `request` event, `intersectFilters`, `isScope`, `requireScope`, `scanJobTree`, `renderStub`'s `offered` |
| 2 | `AgentBuiltin`, `AgentDisclosure`, `BuiltinNote` (`loaded`, `unloaded`, `remembered`, `switched`), `Skill.tools`, `SkillInput.tools`, `ScopeFilter.workspaces`, `AgentOptions.builtins`, `AgentOptions.disclosure`, `AgentRunOptions.disclosure`, `ContextBuildOptions.disclosure`, `.switchable`, `'BUILTIN'`, `BUILTIN_NOTES`, `BUILTIN_LIMITS`, `LOADED_SECTION_HEADER`, `WORKSPACE_INDEX_HEADER`, `collectDisclosure`, `resolveDisclosure`, `filterAdvertisedTools`, `collectBuiltinDefinitions`, `describeCandidates`, `renderSkillBody`, `findToolCall`, `loadToolShape`, `memoToolShape`, `rememberToolShape`, `switchToolShape`, `agentDisclosureContract`, the interned class `AgentRun` |
| 3 | `LedgerNote.overflow`, `LedgerShare.skills`, `GaugeCall.added`, `LedgerRequestInterface.commit`, `.committed`, `computeToolPrice`, `computeSkillPrice` |
| 4 | `AgentDelegate` (with `calls`), `AgentOptions.delegates`, the `delegate` event, `BuiltinNote.stopped`, `BuiltinNote.spent`, `delegateToolShape`, `isAgentDelegate` |
| The re-prepared 0.0.42 | `workspace` on `AgentOptions`, `AgentRunOptions`, `AgentJobInput`, and `LedgerAgentOptions`; `requireWorkspace`; `collectJobRefusals`; the key lists of § The public API, The re-prepared 0.0.42's surface. It removes phase 2's `AgentOptions.disclosure`, `AgentRunOptions.disclosure`, and `agentDisclosureContract`, with `requireDisclosure` and `agentDisclosureShape`. |

`findToolCall` is `findLedgerCall` (LH:385-394) moved to `src/core/helpers.ts` and renamed, because the agents module cannot import the ledgers module. No name holds an -ing word (`names.md:116`). `loaded`, `unloaded`, `remembered`, `switched`, `stopped`, `spent`, `committed`, `added`, and `offered` follow `denied`, `refused`, `unanswered`, and `spared`. `scanJobTree` takes the `scan*` prefix, which walks a structure and returns its findings, and the two `compute*` helpers calculate deterministically (`names.md:91-105`). `BUILTIN_LIMITS` holds `name`, `description`, `content`, and `candidates` from phase 2, and gains `task` in phase 4 with unit 4A, the phase that first uses it. `scaffold surface` has not run on any of them; each phase's first unit runs it.

`RULED(names: as tabled; scaffold surface owed at each phase's first unit)`

## The public API

Each block names the existing export it changes and the phase that changes it. TSDoc here is abbreviated; each phase's documentation unit writes the published text.

### `src/core/contexts/types.ts`

```ts
// ScopeFilter (CT:231). Phase 2. Scope's constructor and narrow copy and intersect it.
export interface ScopeFilter {
	// …instructions, skills, memos, tools, files unchanged…
	/** Lists the allowed workspace ids (`undefined` ⇒ all, `[]` ⇒ none, else only-listed). */
	readonly workspaces?: readonly string[]
}

// Skill (CT:681) and SkillInput (CT:698). Phase 2.
export interface Skill {
	readonly id: string
	readonly name: string
	readonly description: string
	/** Holds the instructions loading the skill appends to the system message. */
	readonly content: string
	/** Names the tools loading the skill advertises, within the run's ceiling. */
	readonly tools: readonly string[]
	readonly files: readonly FileInterface[]
}
export interface SkillInput {
	readonly name: string
	readonly description: string
	readonly content: string
	/** Names the tools loading the skill advertises. Default: none. */
	readonly tools?: readonly string[]
	readonly files?: readonly FileInput[]
}

/** Holds what one run shows within its ceiling: the loaded skills and the selected workspace. Phase 2. */
export interface AgentDisclosure {
	/** Names the loaded skills, in load order. */
	readonly skills: readonly string[]
	/** Names the selected workspace; omitted ⇒ the registry's active workspace. */
	readonly workspace?: string
}

/** Selects what one `build` call renders. */
export interface ContextBuildOptions {
	/** Phase 1. Holds the messages that replace `view()`; omitted ⇒ the active conversation's `view()`. */
	readonly selection?: Selection
	/** Phase 1. Holds a run's scope; the build filters by the context scope intersected with it. */
	readonly scope?: ScopeInterface
	/** Phase 2. Holds the skills whose bodies close the system message and the workspace to render. Default: no body, the active workspace. */
	readonly disclosure?: AgentDisclosure
	/** Phase 2. If `true`, the context message lists the admitted workspace ids; if `false`, it lists none. Default: `false`. */
	readonly switchable?: boolean
}

// AgentContextInterface (CT:882): build (CT:1032) and select (CT:969). Phase 1.
export interface AgentContextInterface {
	// …unchanged members…
	build(options?: ContextBuildOptions): readonly Message[]
	select(
		conversation: ConversationInterface,
		request: Message,
		signal: AbortSignal,
		scope?: ScopeInterface,
	): Promise<Selection> | undefined
}
```

`ScopeInterface`, `ScopeInput`, `SkillManagerInterface`, `MemoManagerInterface`, and `AgentContextOptions` keep their members.

### `src/core/contexts/constants.ts` and `helpers.ts`

```ts
// Phase 2.
export const LOADED_SECTION_HEADER = '## Loaded skills'
export const WORKSPACE_INDEX_HEADER = '## Workspaces'
/** Renders one loaded skill's body: `### <name>`, a blank line, then its content. */
export function renderSkillBody(skill: Pick<Skill, 'name' | 'content'>): string

// Phase 1; phase 2 adds the workspaces list to it.
/** Intersects two scope filters list by list; an absent side constrains nothing. */
export function intersectFilters(parent: ScopeFilter | undefined, child: ScopeFilter | undefined): ScopeFilter

// Phase 1, in contexts/validators.ts.
/** Checks whether a value implements `ScopeInterface`; total, each member read one time, any implementation admitted. */
export function isScope(value: unknown): value is ScopeInterface
```

`Scope.narrow` calls `intersectFilters`, so one implementation intersects every list.

**Two lists gate a write as well as a read.** From phase 2 the TSDoc of `ScopeFilter.memos` and `ScopeFilter.workspaces` states an exception to "`undefined` ⇒ all": the built-ins `remember` and `switch` run only where their list is defined. A read keeps the three-way rule. The model changes a registry only where the host has listed what it may touch.

### `src/core/agents/types.ts`

```ts
/** Names a tool the agent serves itself. Phase 2. */
export type AgentBuiltin = 'load' | 'unload' | 'memo' | 'remember' | 'switch'

/** Declares one agent a run can hand a task to; the loop serves it as a tool named `name`. Phase 4. */
export interface AgentDelegate {
	/** Names the tool the model calls. */
	readonly name: string
	/** Holds the host text the tool advertises. */
	readonly description: string
	/** Narrows the calling run's ceiling into the child's; `{}` narrows nothing. */
	readonly scope: ScopeFilter
	/** Caps the calls one run makes to this delegate. Default: 1. */
	readonly calls?: number
	/** Holds the provider the child runs against, which receives the child's whole prompt. Default: the parent's. */
	readonly provider?: ProviderInterface
	/** Holds the child's system prompt, host text. Default: none. */
	readonly system?: string
	/** Caps the child's turns. Default: `DEFAULT_AGENT_LIMIT`. */
	readonly limit?: number
	/** Sets the child's deadline in milliseconds. Default: none. */
	readonly timeout?: number
	/** Sets the child's token ceiling, rebuilt per call as `AgentJobInput.budget` is. Default: none. */
	readonly budget?: number
	/** Sets the child's request ceiling in `estimateRequest` units, rebuilt per call. Default: none. */
	readonly window?: number
}

// AgentOptions (AT:543).
export interface AgentOptions {
	// …unchanged members…
	/** Phase 2. Lists the built-in tools the loop serves, each subject to the ceiling and the authority. Default: none. */
	readonly builtins?: readonly AgentBuiltin[]
	/** The re-prepared 0.0.42, in place of phase 2's `disclosure`. Names the workspace every run renders in place of the active one until the thread's own `switch`. Default: the active workspace. */
	readonly workspace?: string
	/** Phase 4. Lists the delegates the loop serves, each subject to the ceiling and the authority. Default: none. */
	readonly delegates?: readonly AgentDelegate[]
}

// AgentRunOptions (AT:686).
export interface AgentRunOptions {
	// …unchanged members…
	/** Phase 1. Narrows this run's ceiling: each turn reads the context scope intersected with it. */
	readonly scope?: ScopeInterface
	/** The re-prepared 0.0.42, in place of phase 2's `disclosure`. Replaces `AgentOptions.workspace` for this run. */
	readonly workspace?: string
}

// AgentEventMap (AT:230).
export type AgentEventMap = {
	// …unchanged events…
	/** Phase 1. Reports the exact request a turn dispatches and the conversation its run is bound to. The request object and its `messages` and `tools` arrays are frozen; each message, `options`, and each definition is a shared object a listener reads and never writes. */
	readonly request: readonly [index: number, request: ProviderRequest, conversation: ConversationInterface]
	/** Phase 4. Reports a delegated child run ended: the delegate call, the child's result or its error, and the parent run's conversation. */
	readonly delegate: readonly [call: ToolCall, outcome: Result<AgentResult, unknown>, conversation: ConversationInterface]
}

/** Holds the model-facing texts the built-ins write. Phase 2; `stopped` and `spent` in phase 4. */
export interface BuiltinNote {
	readonly loaded: string
	readonly unloaded: string
	readonly remembered: string
	readonly switched: string
	readonly stopped: string
	readonly spent: string
}

// AgentErrorCode (AT:1155). Phase 2.
export type AgentErrorCode = /* …existing… */ | 'BUILTIN'
```

`AgentInterface`, `AgentJobInput`, `AgentRegistryOptions`, `AgentTurn`, and `AuthorityContext` keep their members in phases 1 to 4; the durable-job unit changes `AgentJobInput` and `AgentRegistryOptions` as § The durable-job unit sets, and the re-prepared 0.0.42 gives `AgentJobInput` `workspace?: string` in place of `disclosure`.

**The identity on the two events.** An agent's emitter is shared by its overlapping runs, and no event carries a run identity (ROADMAP item 26). `request` holds a whole prompt, tool results included, and `delegate` holds a child's answer, so each carries the conversation its run is bound to, which one live run holds at a time (A:294-301). A listener on an agent that serves several threads reads that member before it forwards anything. `Result` is the outcome type of `@orkestrel/contract`, which the loop already imports (A:21). The other events keep their payloads; item 26 keeps its trigger.

### `src/core/agents/constants.ts`, `shapers.ts`, `contracts.ts`, `helpers.ts`

```ts
// Phase 2, except delegateToolShape, phase 4.
/** Holds the built-ins' success and stop notes. `loaded`, `unloaded`, and `switched` are the texts `collectDisclosure` reads. */
export const BUILTIN_NOTES: BuiltinNote
/** Caps each built-in argument in UTF-16 code units (a name, a memo description, a memo content, and from phase 4 a task) and the names one refusal lists. */
export const BUILTIN_LIMITS: Readonly<{ name: number; description: number; content: number; task: number; candidates: number }> // task: phase 4

export const loadToolShape     // objectShape({ skill: stringShape({ min: 1, max: BUILTIN_LIMITS.name }) }), shared by unload
export const memoToolShape     // objectShape({ name })
export const rememberToolShape // objectShape({ name, description, content })
export const switchToolShape   // objectShape({ workspace })
export const delegateToolShape // objectShape({ task })

// As built in phase 2, and restated by the re-prepared 0.0.42: the workspace string replaces the given value.
/** Collects the loaded skills and the selected workspace a conversation's stored built-in calls record, counting only the built-ins a run enables. */
export function collectDisclosure(
	conversation: Pick<ConversationInterface, 'sections' | 'messages'>,
	builtins: readonly AgentBuiltin[],
): AgentDisclosure
/** Resolves what a turn shows: the conversation's record, and its last switch else the given workspace, within the ceiling and the registries. */
export function resolveDisclosure(
	context: AgentContextInterface,
	conversation: Pick<ConversationInterface, 'sections' | 'messages'>,
	workspace: string | undefined,
	ceiling: ScopeFilter,
	builtins: readonly AgentBuiltin[],
): AgentDisclosure
/** Returns the definitions a turn advertises from the allow-list, the registered skills, and the shown skills; an allow-list that admits no `load` definition decides alone (claim T.1). */
export function filterAdvertisedTools(
	definitions: readonly ToolDefinition[],
	names: readonly string[] | undefined,
	skills: readonly Skill[],
	shown: readonly string[],
): readonly ToolDefinition[]
/** Collects the definitions of the tools an agent serves itself, as a run advertises them. Phase 4 widens the pick to `delegates`. */
export function collectBuiltinDefinitions(options: Pick<AgentOptions, 'builtins'>): readonly ToolDefinition[]
/** Returns the refusal that names a subject and at most `BUILTIN_LIMITS.candidates` of the names a caller can use. */
export function describeCandidates(subject: string, names: readonly string[]): string

// Phase 1.
/** Returns a scope a run can bind, or throws a `ContractError` coded `'placement'`; `undefined` passes through. */
export function requireScope(value: unknown): ScopeInterface | undefined
/** Scans every job under a root for a member that exceeds its own parent's, and from 0.0.42 for a job its build would refuse; an empty result clears the tree. */
export function scanJobTree(root: AgentJobInput): readonly string[]

// The re-prepared 0.0.42.
/** Returns a workspace a run can render, or throws a `ContractError` coded `'placement'`; `undefined` passes through. */
export function requireWorkspace(value: unknown): string | undefined
/** Collects the refusals a job the contract admitted would meet at its build, one line a refusal, the member first. */
export function collectJobRefusals(job: Pick<AgentJobInput, 'tools' | 'builtins' | 'authority'>): readonly string[]

// Phase 4, in agents/validators.ts.
/** Checks whether a value is a well-formed delegate declaration; total. */
export function isAgentDelegate(value: unknown): value is AgentDelegate
```

`src/core/helpers.ts` gains `findToolCall(group, message)`; `findLedgerCall` leaves `ledgers/helpers.ts`. Both are barrel exports the guide's Surface tables pin (G:1738; `agent/tests/guides.test.ts:413-419`), so unit 2A moves the guide row in the same change.

### `src/core/ledgers/types.ts`, `constants.ts`, `helpers.ts`

```ts
// renderStub (LH:1360): a fifth parameter. Phase 1.
export function renderStub(name, args, state, write = false, offered = true): string
// offered - If `true`, a hidden result names the recall route; if `false`, it reads `result not shown`.

// LedgerAgentOptions (LT:381). Phase 3; `workspace` in place of `disclosure` from the re-prepared 0.0.42. It never picks `delegates` before phase 5.
export type LedgerAgentOptions = Pick<AgentOptions, /* …existing… */ | 'builtins' | 'workspace'>

// LedgerNote (LT:107); LEDGER_NOTES gains the text. Phase 3.
export interface LedgerNote {
	// …cue, results, repeat, closure…
	/** Holds the reason the ledger denies a `load` or a `remember` the request or the thread has no room for. */
	readonly overflow: string
}

// LedgerShare (LT:92); DEFAULT_LEDGER_SHARE gains `skills: 0.5`. Phase 3.
export interface LedgerShare {
	readonly prompt: number
	readonly tail: number
	/** Holds the share of the prompt budget a thread's shown skills can take, bodies and tools together. */
	readonly skills: number
}

// GaugeCall (LT:1095). Phase 3.
export interface GaugeCall {
	// …estimate, spared, prompt, completion, thinking, tools…
	/** Tokens of definitions this call advertised beyond the calibrated set. Default: 0. */
	readonly added?: number
}

// LedgerRequestInterface (LT:540). Phase 3.
export interface LedgerRequestInterface {
	// …unchanged members…
	/** Records the tokens one cleared call commits to the next prompt. */
	commit(price: number): void
	/** Holds the tokens committed after the call in flight started. */
	readonly committed: number
}

// Phase 3, in ledgers/helpers.ts: the exported, tested home of the pricing formula.
/** Computes what a call's advertised set spares of the calibrated overhead and adds beyond it. */
export function computeToolPrice(
	calibrated: readonly ToolDefinition[],
	advertised: readonly ToolDefinition[],
	gauge: LedgerGauge,
): Required<Pick<GaugeCall, 'spared' | 'added'>>
/** Computes the tokens loading a skill adds: its body, and the definitions it names beyond an advertised set. */
export function computeSkillPrice(
	skill: Skill,
	added: readonly ToolDefinition[],
	calibrated: readonly ToolDefinition[],
	gauge: LedgerGauge,
): number
```

The ledger's private `#price(messages)` (L:988) keeps its meaning, a message estimate at `scale`; the two helpers carry the tool-side formula under their own names.

`LedgerOptions`, `LedgerSnapshot`, `LedgerGaugeSnapshot`, `LedgerInterface`, `GaugeInterface`, and `LedgerErrorCode` keep their members. `LedgerGauge` keeps its members unless the density probe fails. `Gauge.remainder`'s fallback adds `added`; `Gauge.observe` rescales only when `added` is absent or 0, beside its `spared` condition (`Gauge.ts:110-120`).

### The re-prepared 0.0.42's surface

The cut, unit R, and the fix round change the barrel as follows. Each export has its row in the guide's Surface tables, which `tests/guides.test.ts` checks in both directions.

- **Removed by the cut:** `requireDisclosure` (`agents/helpers.ts`), `agentDisclosureShape` (`agents/shapers.ts`), and `agentDisclosureContract` (`agents/contracts.ts`), with the `disclosure` member of `AgentOptions`, `AgentRunOptions`, `AgentJobInput`, and the `LedgerAgentOptions` pick.
- **Added by the cut:** `workspace?: string` in those four homes, `agentJobShape`'s `workspace` member, and `requireWorkspace` in `agents/helpers.ts`.
- **Kept by the cut:** `AgentDisclosure`, `ContextBuildOptions.disclosure`, `collectDisclosure`, and `resolveDisclosure`, whose third parameter is the workspace string.
- **Added by unit R:** `collectJobRefusals` in `agents/helpers.ts`, and one frozen key list beside each door's type, each declared `satisfies ReadonlyArray<keyof T>` and passed to `refuseOptionKeys`:
  - `agents/constants.ts`: `AGENT_OPTION_KEYS`, `AGENT_RUN_KEYS`, `AUTHORITY_OPTION_KEYS`, `REGISTRY_OPTION_KEYS`, `QUEUE_OPTION_KEYS`, `RUNNER_OPTION_KEYS`
  - `contexts/constants.ts`: `SCOPE_KEYS`, `SCOPE_FILTER_KEYS`, `CONTEXT_OPTION_KEYS`, `BUILD_OPTION_KEYS`, `INSTRUCTION_MANAGER_KEYS`, `MEMO_MANAGER_KEYS`, `SCOPE_MANAGER_KEYS`, `SKILL_MANAGER_KEYS`, and `INSTRUCTION_INPUT_KEYS`, `MEMO_INPUT_KEYS`, and `SKILL_INPUT_KEYS`, which the fix ruling deletes unless something else reads them
  - `conversations/constants.ts`: `CONVERSATION_OPTION_KEYS`, `CONVERSATION_MANAGER_KEYS`, `CONVERSATION_INPUT_KEYS`, `COMPACT_OPTION_KEYS`, `REFERENCE_OPTION_KEYS`
  - `ledgers/constants.ts`: `LEDGER_OPTION_KEYS`, `LEDGER_AGENT_KEYS`, `CLASSIFIER_OPTION_KEYS`, `GAUGE_OPTION_KEYS`
  - `providers/constants.ts`: `RELAY_OPTION_KEYS`, `RELAY_PROVIDER_KEYS`, `RELAY_STREAM_KEYS`, `PROVIDER_INPUT_KEYS`, `JUDGE_INPUT_KEYS`, `SYSTEM_ONE_OPTION_KEYS`, `STREAM_OPTION_KEYS`
- **Changed by unit R:** `agentJobShape` states the bounds of claim J.1 and the conversation roles; `filterAdvertisedTools` lets an allow-list that admits no `load` definition decide alone; `isMessageInput` is a `Guard<MessageInput>` constant built with `recordOf`, exact at its top level, where it was a function.
- **Ordered by the fix ruling,** and read with the fix round's result in `plan.md` § State: `InstructionInput`, `MemoInput`, and `SkillInput` each gain a shape in `shapers.ts` with a guard or a contract, the memo's derived from `memoShape`'s properties.

### Agent 0.0.43's surface

The caller adds three exports, each with its row in the guide's Surface tables (§ Agent 0.0.43).

- **Added:** `AgentCaller` in `agents/types.ts`, with `workspace: WorkspaceInterface | undefined` and `files: readonly string[] | undefined`, both keys required; `isAgentCaller` in `agents/validators.ts`, exact over those two keys and total; and `resolveWorkspace` in `contexts/helpers.ts`, the workspace `selected` names, else the active one, while the allow-list admits its id.
- **Changed:** `AgentInterface`'s remark reads "Each call's `ToolContext.caller` is an `AgentCaller`."; `ScopeFilter`'s remark and the `files` member's TSDoc state that each tool call receives the list as `caller.files`.

### Construction and call refusals

| Refusal | Thrown by | Code | Phase |
| --- | --- | --- | --- |
| `AgentRunOptions.scope` that is not a scope | `stream()`, synchronously, beside `requireConversation` (A:294) | `ContractError` `'placement'` | 1 |
| A job anywhere under a root that exceeds its own parent on any of the seven members § The `AgentFanout` subset hole tables (`tools`, `authority`, `provider`, `scheduler`, `limit`, `timeout`, `budget`), or a descendant `agentJobContract` refuses | `AgentFanout.execute`, through `scanJobTree`, before the root spawns | `AgentError` `'REGISTRY'` | 1 |
| `builtins` non-empty and no `authority` | `Agent` constructor | `AgentError` `'AUTHORITY'` | 2 |
| A `builtins` entry outside `AgentBuiltin`, or repeated | `Agent` constructor | `'BUILTIN'` | 2 |
| `unload` listed without `load` | `Agent` constructor | `'BUILTIN'` | 2 |
| The tool manager holds a tool under an enabled built-in's name | `Agent` constructor | `'BUILTIN'` | 2 |
| A defined `workspace` that is not a string, on the agent, the run, or a ledger's `agent`; phase 2's `disclosure` refusal until the cut | `Agent` constructor; `stream()`, synchronously, after the `prompt` check and before any state changes; `Ledger` constructor; all through `requireWorkspace` | `ContractError` `'placement'` | 0.0.42 |
| An own enumerable member its type does not declare, at the agent's options, a run's options, the ledger's options, the ledger's `agent` pick, a scope's input, `narrow`'s filter, and each door of the census's groups 1 and 2 | the door's constructor, factory, or method, as its first statement, through `refuseOptionKeys` | `ContractError` `'structure'`, naming the member and the declared ones; the ledger's pick as `Ledger agent`, as the fix ruling orders | 0.0.42 |
| A stored record input that holds an undeclared member: `MessageInput` through `isMessageInput`; `InstructionInput`, `MemoInput`, and `SkillInput` through their contracts, as the fix ruling orders | `Conversation.add`; `Instruction` and `InstructionManager.add`; `MemoManager.add`; `SkillManager.add`, a batch checked whole first | `ConversationError` `'MESSAGE'` for a message; the contract's code for the other three | 0.0.42 |
| A job anywhere in a tree with a bound outside `agentJobShape`, a `system` message, or a line from `collectJobRefusals` | `AgentFanout.execute` through `scanJobTree`, before the root spawns; `AgentRegistry.build` for a root, with the lines under `context.refusals` | `AgentError` `'REGISTRY'` | 0.0.42 |
| A calibration whose call with the definitions reports a prompt over `capacity` | `Ledger.calibrate` and `respond`, before the call without definitions | `LedgerError` `'GAUGE'`, with `capacity` and `prompt` in `context` | 0.0.42 |
| `agent.builtins` non-empty and no `agent.authority` | `Ledger` constructor | `AgentError` `'AUTHORITY'` | 3 |
| A `share.skills` that is not finite, or lies outside the interval greater than 0 up to and including 1 | `Ledger` constructor | `LedgerError` `'SHARE'` | 3 |
| `delegates` non-empty and no `authority` | `Agent` constructor | `AgentError` `'AUTHORITY'` | 4 |
| A delegate name blank, untrimmed, repeated, or equal to an `AgentBuiltin` name | `Agent` constructor | `'BUILTIN'` | 4 |
| A delegate `limit` present and not a positive safe integer | `Agent` constructor, through `requireLimit` | `'LIMIT'`, the code that already names it (AT:1155-1162) | 4 |
| A delegate `calls`, `timeout`, `budget`, or `window` present and not a positive safe integer, named by its key path | `Agent` constructor | `'BUILTIN'` | 4 |
| The tool manager holds a tool under a delegate's name | `Agent` constructor | `'BUILTIN'` | 4 |
| `agent.delegates` present on a ledger's options at runtime | `Ledger` constructor, before it builds its agent, as any member outside the `LedgerAgentOptions` pick (claim 4.11) | `ContractError` `'structure'`, where phase 4's design named `AgentError` `'BUILTIN'` | 0.0.42, until phase 5 |

## The mechanism

### The always-on core

| Piece | Message | Author | Bounded by |
| --- | --- | --- | --- |
| System text | `system`, index 0 | host | — |
| Instructions | `system` | host | `ceiling.instructions` |
| Skills index | `system` | host | `ceiling.skills` |
| Loaded bodies, in load order; host-given ones before them until the cut of 2026-11-12 | `system`, last, under `LOADED_SECTION_HEADER` | host | `ceiling.skills`, registered |
| Memo index | `user` context message | host or model | `ceiling.memos` |
| Workspace index, only while `switch` is advertised | `user` context message | host data | `ceiling.workspaces` |
| Workspace text and images | `user` context message; last user turn | data | `ceiling.workspaces`, `ceiling.files` |
| Tools | the tools block | host definitions; Agent's built-in definitions | `filterAdvertisedTools` |

A host bounds the core by what it registers, by the ceiling's lists, and by which built-ins it enables. Agent sets no index ceiling (`methods.md:404`).

**The price on taverna's room.** Every figure is estimate arithmetic on text not yet written, not a measurement [inference]. Claim 3.14 measures it.

| Part | Estimate | Source |
| --- | --- | --- |
| The generic lookups, the write, and `recall` | 1457 | an estimate carried from the design inputs |
| `load` and `unload` definitions | about 150 | at the catalog mean of 18300 / 238 ≈ 77 a definition |
| The skills index | about 200 | taverna's design draft |
| The standing instruction | about 150 | taverna's design draft |
| **Always on** | **about 1960** | of a room of 15872 (F27) |
| Holdback: the largest loadable skill | about 1100 for 10 tools and a 300-token body | area size is taverna's to choose |
| Holdback: one result | not estimated: it is the longest result the thread stores, or the gauge's reply reserve | F44 |
| Plan budget | about (15872 − 1610 − 1100) / 1.06 ≈ 12400, less the result's holdback and the head's text | 0 at 0.0.40 with the typed catalog registered (F13) |
| The thread's cap at `share.skills` 0.5 | 7936 for shown skills | about 7 skills of that size |

### The turn

After the `turn` event and the scheduler yield, where the snapshot sits at 0.0.40 (F2), each turn of `Agent#execute` does this, in order. Step 1 and the `request` emit land in phase 1; steps 2 to 5 land in phase 2.

1. **Ceiling.** Read `context.scope` and the run scope one time each, and intersect them list by list through `intersectKeys`.
2. **Shown.** `resolveDisclosure`: the skills `collectDisclosure` reads from the conversation, keeping each skill that is registered and that `ceiling.skills` admits. The workspace is the conversation's last switch, else the `workspace` option's, kept only when registered and admitted. The given value's skills came first until the cut of 2026-11-12. The loop skips the derivation when none of `load`, `unload`, and `switch` is enabled.
3. **Advertise.** Build one candidate list: the host manager's definitions with each reserved name removed, followed by the run's own definitions from `collectBuiltinDefinitions`, without `remember` while the turn's ceiling defines no `memos` list and without `switch` while it defines no `workspaces` list. A reserved name is an enabled built-in's or a delegate's. `filterAdvertisedTools` runs over that whole list, so the turn's `tools` allow-list admits or hides a built-in exactly as it does a host tool, and `load` is among the definitions the filter reads. Filtering the manager's definitions alone and appending the built-ins after would fire no hold and let no scope hide a built-in.
4. **Hold.** The run's `AgentRun` entity owns a `ToolManager` that holds the run's tools. Its `tool(name)` returns the run's instance for a reserved name and the host manager's for any other. The turn's held map, the approval check (A:1094), the changed-instance check (A:1115), and dispatch (A:1172) each read through it, and dispatch executes a reserved call through the run's manager and every other call through the host's. Sites that read the host manager, which holds no run tool, would deny every approved or allowed built-in as changed after its decision. The run's manager is never changed after the run starts, so the identity check on a reserved name holds by construction, and a host tool registered under that name is never read.
5. **Refresh.** Rebuild the head when any of these differs from what the working head was built with: the ceiling's `instructions`, `skills`, `memos`, `files`, or `workspaces` list; the shown skills, compared by each skill's `id` (F41), so a skill replaced under its name counts; the shown workspace; or whether `switch` is advertised. From 0.0.43 the rendered workspace's files under the ceiling's `files` list, compared by identity, are a term too, so an edit to a rendered file rebuilds the head (claim A.8).
6. **Compose, admit, freeze, emit `request`, dispatch,** as at 0.0.40 from A:550. The freeze follows admission, because a fold composes a second request object (A:842) and that one is dispatched; it covers the request object and its two arrays, as claim 1.7 states. From 0.0.43 each dispatch passes `{ signal, caller: run.caller }` (§ Agent 0.0.43).

`filterAdvertisedTools` is, over the candidate list of step 3:

```text
admitted = filterAllowList(names, definitions)
when no skill is registered, or an allow-list admits no definition named load: return admitted   (claim T.1 builds this line as written)
held  = every name a registered skill lists in tools
open  = every name a shown skill lists in tools
return admitted without each definition whose name is in held, is not in open, and is neither load nor unload
```

### The head refresh

- Every build of a run goes through `Agent#build` (A:937-939), which six call sites reach (A:475, A:832, A:914, A:917, A:920, A:932). `#build` reads the run scope and the turn's shown value from the run's `AgentRun` entity and records there the selection object it rendered, the length of the built array, the ceiling's lists, and the shown value. `#select` passes the run scope to `context.select` (A:894) and returns the selection beside the messages.
- A fold inside admission (A:808-851) rebuilds through that same `#build`, after step 5 has resolved the turn's shown value, so the rebuilt head keeps the loaded bodies and the run scope (claim 2.5).
- A refresh is `[...context.build({ selection, scope, disclosure, switchable }), ...base.slice(length)]`, over the recorded selection. It reads no `view()`, so no stored message enters twice.
- One `system` message stays at index 0. A run whose ceiling and shown set do not change sends the bytes it sends at 0.0.40.
- A refresh carries whatever else the context holds at that moment, a host's instruction edit included. An edit to an instruction's text, with no change to a list or to the shown set, still waits for the next build site.
- A narrowed scope list reaches the next turn's head from phase 2 (claim 2.20). That changes the timing AT:565-568 and G:496 document, and unit 2D restates both.
- **ROADMAP item 6 closes at the end of phase 3,** not in phase 2. Phase 2 lands its mechanism. The item also requires a reading of "actual skill use on the smallest local model" and rules on moving bodies out of the head by a count per 10 turns (`agent/ROADMAP.md` item 6); § The 4B reading takes both, and unit 3C removes the item from the roadmap after that reading is reported.

### Each built-in

Each is a `createTool` value with a contract from `agents/shapers.ts`, created per run and held in the run's own `ToolManager`, never in the host's. Each passes, in order, the ceiling by its name (F4), the host's `evaluate`, the `consequential` floor, `ask`, and the held-instance check, which reads the run's manager for a reserved name (§ The turn, step 4). Agent supplies no default verdict.

**A handler reads the ceiling live.** When a handler checks a name against `ceiling.skills`, `ceiling.memos`, or `ceiling.workspaces`, it intersects the context scope and the run scope at that moment, not the turn's snapshot. A narrowing made between a call's decision and its dispatch therefore refuses the call. The snapshot still decides what the turn advertised.

| Tool | Arguments | On success | Annotations | Reaches the model | Refuses, with `'ARGUMENTS'` |
| --- | --- | --- | --- | --- | --- |
| `load` | `{ skill }` | returns `BUILTIN_NOTES.loaded`; the stored message is the state | none | the next turn of the same run: body and tools | a name not registered or outside `ceiling.skills`, listing the admitted names |
| `unload` | `{ skill }` | returns `BUILTIN_NOTES.unloaded` | none | the next turn | a name the conversation does not record as loaded, listing the model-loaded names |
| `memo` | `{ name }` | returns the current revision's `content` | `pure`, `untrusted` | its own tool message | a name absent or outside `ceiling.memos`, listing the admitted names |
| `remember` | `{ name, description, content }` | `memos.add` with `origin: { conversation }`; returns `BUILTIN_NOTES.remembered` | `consequential` | the index, at the next build site | an undefined `ceiling.memos`; a name that list omits, listing its names; an existing name whose current revision this conversation did not write; a name or description holding a control, format, line, or paragraph separator code point, the class at AH:656 |
| `switch` | `{ workspace }` | returns `BUILTIN_NOTES.switched` | none | the next turn: the context message | an undefined `ceiling.workspaces`; an id not registered or outside that list, listing the admitted ids |

**What `remember` can write.** `MemoManager.add` appends a revision under an existing name and `memo(name)` returns the last (F43), so a `remember` that revised any name the ceiling admitted could replace a host-authored memo, and the approval frame shows the arguments, not that the name exists. Three rules close it:

- **A defined list.** `remember` runs only where the turn's ceiling defines `memos`. An undefined list means the host has named nothing the model may write. The built-in is then not advertised (§ The turn, step 3), and its handler refuses a call that reaches it. `switch` follows the same rule for `workspaces`, because it reads another registry entry into the prompt.
- **Create.** A listed name no memo holds is created.
- **Revise its own.** A listed name a memo holds is revised only when that memo's current revision carries `origin.conversation` equal to the run's conversation id. Only the host's code and this built-in write a revision, and this built-in always writes its own conversation (F43), so the test admits what this thread remembered and refuses a host's memo and another thread's. The refusal says that the memo exists and this conversation did not write it; the name is in the index of the same prompt, so the text reveals nothing.

The model's memos are therefore the slots the host lists: it cannot add an index line the host did not name, which also bounds what `remember` can add to the head across requests (§ Points 6 and 7, Security). § Refused holds free naming and revision across a principal's threads, closed on 2026-11-12.

- A length over `BUILTIN_LIMITS`, a missing member, and an undeclared member are refused by the tool's own door before the handler runs.
- Loading a skill already shown succeeds again and changes nothing. In a ledger, the identical second `load` in one request is a repeat (§ The ledger's other changes in phase 3).
- A skill whose `content` is blank renders no body and still advertises its tools.
- No built-in removes a memo, and none names, returns, or changes a scope.
- Wording of the notes and descriptions is the implementing unit's, under `documentation.md` § Agent-facing surfaces. The constraint here is structural: a success note is one constant, and a refusal echoes no argument.

### The ledger's pricing

**Variables.**

| Symbol | Meaning |
| --- | --- |
| `capacity`, `predict`, `share.prompt`, `share.skills` | the ledger's options |
| `drift` | `LEDGER_SCALE_DRIFT`, 0.06 (`agent/src/core/ledgers/constants.ts:132`) |
| `budget` | `(capacity − predict) × share.prompt` |
| `E(S)` | `estimateTokens(JSON.stringify(S))` for a definition set `S`; 0 for the empty set |
| `U` | the manager's definitions, then `collectBuiltinDefinitions(options.agent)` |
| `G` | the names registered skills list in `tools`, when `agent.builtins` lists `load`; else empty |
| `C` | the calibrated set: `U` without each definition named in `G` |
| `scale` | the bare calibration call's prompt tokens over its message estimate, as at 0.0.40 (L:582) |
| `overhead` | `max(0, priced(C) − bare)`, as at 0.0.40 (L:583), with `C` in place of every definition |
| `δ` | `E(C) > 0 ? max(scale, overhead / E(C)) : scale`, provisional on the density probe |
| `A` | the set a call advertises |

**Price of an advertised set.** The subtraction lands in phase 1, where `A ⊆ C` always holds and `#spared` computes it. The addition lands in phase 3, where the exported `computeToolPrice` holds both terms and returns them as `spared` and `added`.

```text
spared(∅) = overhead                                    added(∅) = 0
spared(A) = min(overhead, scale × E(C ∖ A))             added(A) = δ × E(A ∖ C)
price(A)  = overhead − spared(A) + added(A)
```

Each gauge call carries its `spared` and `added`.

**Price of loading a skill `s` over a set `A`,** which the exported `computeSkillPrice` holds.

```text
cost(s, A) = scale × estimateTokens(renderSkillBody(s)) + δ × E(the definitions s names, within the ceiling and U, not in A)
```

**Price of one tool result.** No fact gives the size of the next result, so a stored one stands in for it (F44).

```text
result = max(scale × estimateMessages([the longest tool message the thread stores]), gauge.reserve(calls, longest))
```

**The plan.**

```text
holdback = load ∈ A_plan and some skill s is registered, admitted, and not shown
             ? the largest cost(s, A_plan) over those skills + result
             : 0
total    = max(0, budget − price(A_plan) − holdback) / (1 + drift)
```

`A_plan` is what the first pass's first turn advertises with `recall` offered, so a ledger with no skill and no scope reads `price(A_plan) = overhead` and the same `total` as 0.0.40.

**Calibration, the digest, snapshot, and hydrate.**

- `#measureGauge` sends `C` in the priced call and stores `digestLedgerTools(C)`.
- From unit K, both calibration calls carry the head the context builds for an empty turn under the ceiling at entry narrowed by `{ workspaces: [] }`, with no conversation message and no workspace text. The call with `C` goes first; when it reports a prompt over `capacity`, the ledger sends no call without `C`, stores no gauge, and rejects `'GAUGE'` (claims K.1 and K.2). `scale` is the call without `C`'s prompt over that head's estimate.
- At each `respond` entry the ledger recomputes that digest. A difference drops the gauge and calibrates before the pass, as a hydrate with another digest does (L:313-325).
- A ceiling change, a `load`, and an edit to a definition a skill holds back change no digest.
- The snapshot is unchanged. The conversation inside it carries what the model loaded; a hydrated ledger derives it again and intersects it with the ceiling it is given.

**Room inside a request and across a thread.** The ledger's authority wrapper, before it reads the host's authority:

```text
load s:    admit when (committed + cost(s, A_turn) + result) × (1 + drift) ≤ gauge.remainder(calls) − predict
           and shown(thread) + cost(s, A_turn) ≤ share.skills × budget
remember:  admit when (committed + scale × estimateTokens(the index line)) × (1 + drift) ≤ gauge.remainder(calls) − predict
```

- `shown(thread)` is the price of every shown skill's body and of the definitions shown skills name. Every shown skill is one the thread loaded: the cut of 2026-11-12 removed the host-given skill, which counted against the share and was never refused.
- An admitted `load` or `remember` records its price through `request.commit`, and a lookup or a write the wrapper clears records one `result`. `committed` sums what was recorded after the call in flight started, so the calls of one batch share one remainder, and the next call's reported prompt replaces the sum.
- A refused call is denied with `LEDGER_NOTES.overflow`, and it is not recorded in the request's memory of denied calls (§ Points 6 and 7).

**ROADMAP item 8 is ruled** in phase 3: the ledger holds the plan across passes, re-prices the head at the answer pass through the live build `#buildDigest` already makes (L:1957-1964), which gains the shown value, and refuses an in-request `remember` the remainder cannot hold.

### The ledger's other changes in phase 3

- **The plan's `recall` narrowing** stays (F1). Its `tools` list is every name in `U` except `recall`, so a ledger with no host scope does not exclude its own built-ins.
- **Authority routing.** A built-in's name reaches the host's `evaluate` and `ask`. The ledger keeps the enabled built-in names in a set of their own beside `names` (L:186): the wrapper's routing (L:291-298) and its `deny` listener (L:328-331) each test both sets, so a built-in is neither sent to the ledger's own allow rule nor missed by the denial memory. The wrapper keeps its deny for any other name the ledger does not advertise (F20).
- **Repeat stop.** The wrapper admits each built-in call through `LedgerRequest.admit` before the host's authority (F21). `admit` throws, and a throw inside `evaluate` is read by the loop as a failed evaluation with the generic denial and no decision (A:1012-1030), which would end no pass. So the wrapper runs `admit` inside `attempt` and, on the repeat throw, returns `{ zone: 'ledger', verdict: 'deny', reason: LEDGER_NOTES.repeat }`, the decision L:291-293 already returns for a denied call's retry. The `tool` listener then reads the repeat denial and ends the pass (L:336-344).
- **What reopens a call.** A lookup is released when a write retires its finding (L:1623-1656). A built-in has no such rule of its own, so a legitimate second call would end the pass. On a successful built-in call the `tool` listener releases, through `LedgerRequest.release`:

  | A successful | Releases |
  | --- | --- |
  | `unload X` | `load X`, and each `load` this request denied with the `overflow` note |
  | `load X` | `unload X` |
  | `switch W` | every other `switch` this request made |
  | `remember n` | `memo n` |

  The released calls are read from the request's own stored messages, so no further state is kept. A release reads only the messages stored before it: a `load` denied for room in the same batch as a later `unload` is released, and one that follows the `unload` in the batch is not. With no such call between, the identical second call is a repeat, and a second `load` of a skill already shown is one.
- **Every build of a request's prompt carries the shown set.** The ledger builds a prompt at five sites after phase 1 (F45): four for a request, and the calibration call. The plan's head (L:1021), `#recall`'s carried estimate (L:1747), and the answer note's two fits (L:1961, L:1974) each pass the request's shown value from `resolveDisclosure`. A `recall` after a `load` would otherwise size its listing against a carried estimate without the body, and a thread entering with skills shown would plan its records against a head without them. Calibration (L:557) is the fifth site and passes none, because it reads a ratio and belongs to no request.
- **Filing.** `#readLookups` reads lookups and writes by name (L:748-753), so a built-in files no finding, record, or `recall` listing. The answer pass's results note (F18, F42) carries a `memo` body, and leaves out the acknowledgements of `load`, `unload`, `remember`, and `switch`.
- **Later requests.** F19 already keeps a built-in's calls out of the seed tail and out of each completed exchange.
- **Items 57 and 69** keep their triggers. The offer probes (L:1238-1265) read `filterAdvertisedTools` and `price`. The omission notice of item 52 keeps its trigger in `ROADMAP.md`.

### Overlapping runs and per-run state

| State | Lives in | Scope of sharing |
| --- | --- | --- |
| The context scope | `AgentContext` | every run of the agent; `apply` reaches each at its next turn |
| The run scope | `AgentRunOptions.scope` | one run |
| The workspace the host selects | `AgentOptions.workspace`, or `AgentRunOptions.workspace`; `AgentJobInput.workspace` for a job | the agent, or one run |
| What the model loaded and switched | the conversation | one thread, across runs; one live run per conversation (A:294-301) |
| Built-in and delegate tool instances, the head record | the run's `AgentRun` entity | one run |
| A child's conversation, budget, and window | created for one delegate call | one call |
| Memos | the agent's `MemoManager` (AC:105, AC:125) | every run of the agent. It holds one principal's memos only where the host builds one agent, or one memo set, per principal (G:2584). On an agent that serves several threads, a run reads what its ceiling's `memos` list admits, and writes only where that list is defined and only what its own conversation wrote. |
| The agent's workspace pointer | `WorkspaceManager` | never moved by a built-in |
| A ledger's agent | the ledger, which exposes it as `LedgerAgentInterface` | no run but the active `respond` call's pass (claim 1.19) |

No per-run instruction text exists: a run selects instructions through its scope's list, and adds guidance by showing a skill.

### Delegation, end to end

Built in phase 4, as its checkpoint rules it.

1. `AgentRun` creates one tool per delegate from `delegateToolShape` and the owned copy of the declaration, and adds it to the run's `ToolManager`.
2. The turn advertises it like any reserved name, and the model calls it with `{ task }`.
3. The call passes the ceiling, the host's `evaluate`, the floor, and the parent's `ask`.
4. `Agent#dispatch` starts every other allowed call as at 0.0.40, and hands the batch's delegate calls to one `createRunner` execution whose handler is the run manager's `execute` for the unit's call, with the run's signal. It destroys the runner when the execution settles.
5. The tool first counts the run's earlier calls to this delegate; at the cap it throws the `spent` note and builds nothing. Otherwise it builds a child `Agent` over the parent's tool manager and registries, with an authority `{ evaluate: (context) => parent.evaluate(context) }` and no `ask` (F40), the parent's scheduler, `strict`, and `builtins`, the delegate's provider, `system`, `limit`, and `timeout`, a fresh budget, and a fresh window.
6. The child's `turn` hook computes `intersectFilters(intersectFilters(parent context scope, parent run scope), delegate.scope)` inside `attempt` and applies it to the child's context, as a scope with no `select`, before each child turn's snapshot. On a failure it aborts the child with the error through a signal the tool folded into the child's, and the loop reads that abort before the snapshot (F46). Its `usage` hook charges the parent's run budget.
7. It awaits `child.generate({ prompt: { content: task }, signal })`.
8. A complete, non-blank answer returns as the value. A partial or blank child throws the `stopped` note. A rejected child throws the `stopped` note. In each case the loop emits `delegate` with the call, the outcome, and the run's conversation: the child's result, or its error. A child whose calls reported no usage is charged to the parent's budget here, at its answer's estimate. The run's manager turns each throw into that call's failed result.
9. The loop stores one tool message per call, in call order.

## The authorship and authority table

| Text or call | Author | Enters | Gate | Refusal |
| --- | --- | --- | --- | --- |
| Context scope, run scope, delegate scope | host | the turn's ceiling | host code alone | no model path exists |
| System text, instructions | host | `system`, index 0 | `ceiling.instructions` | — |
| Skills index line | host | `system` | `ceiling.skills` | — |
| Loaded skill body | host, read from `SkillManager` by name | `system`, last | shown, registered, `ceiling.skills` | — |
| `workspace` option | host | the shown workspace, until the thread's own `switch` | `requireWorkspace`, then the registry and the ceiling | `ContractError` `'placement'`; an unregistered or excluded id renders nothing |
| An option member no type declares | host | nothing | the door's `refuseOptionKeys` | `ContractError` `'structure'` |
| Built-in definitions | Agent | the tools block | `builtins`, `ceiling.tools`, a skill's hold | — |
| A skill's tools | host definitions | the tools block, the turn after a load | `ceiling.tools`, the registry, the authority per call | `SCOPE_NOTE` before then |
| `load`, `unload`, `switch` call | model | a stored tool message | ceiling, `evaluate`, `ask`; the live ceiling in the handler; for `switch`, a defined `ceiling.workspaces`; in a ledger, repeat then room | `'ARGUMENTS'` with candidates; `repeat`; `overflow` |
| Memo index line | host or model | `user` context message | `ceiling.memos` | — |
| Memo body | host or model | tool role. In a ledger's answer pass, also the results note: a stored `user` message, as every successful tool result is (F42). Never `system`. | `memo` call: ceiling, `evaluate`, `ask` | `'ARGUMENTS'` with candidates |
| `remember` call | model | `MemoManager.add` | ceiling, `evaluate`, floor, `ask`, a defined `ceiling.memos` that lists the name, create or revise-its-own, single-line check, limits; in a ledger, repeat then room | `'ARGUMENTS'`; unanswered or refused note; `overflow` |
| Workspace index, text, images | host data | `user` context message; last user turn | `ceiling.workspaces`, `ceiling.files` | — |
| `context.caller` | Agent, from the workspace instance the turn's build rendered and the live ceiling | each tool call's `ToolContext`, from 0.0.43 | the live `workspaces` list admits the instance's id at the call, else `undefined`; `files` is the live ceiling's list; `isAgentCaller` admits these two members alone; a consumer accepts the workspace only as the instance its own manager holds | — |
| Delegate definition | host | the tools block | `ceiling.tools`, a skill's hold | — |
| Delegate call | model | a child run | ceiling, `evaluate`, floor, the parent's `ask`, the delegate's `calls` cap | the authority's denial; the `spent` note |
| `delegate.system`, `delegate.description` | host | the child's `system` message; the parent's tools block | the declaration, owned at construction | the constructor's refusals |
| `task` | model | the child's one `user` turn | `delegateToolShape` | the door's refusal |
| A child's tool call | child model | the parent's tool instances | the child's ceiling; the parent's `evaluate`; no `ask` | `SCOPE_NOTE`; a denial; the unanswered note |
| Child's answer | child model | the parent's tool message | the child's ceiling, authority, limit, timeout, budget, window | the `stopped` note |
| The `delegate` event's outcome | child model, or the child's error | host listeners on the parent's emitter, never a prompt | the host forwards it to no page (G:2587) | — |
| The `request` event's request | every author of the prompt | host listeners on the agent's emitter, with the run's conversation | the request object and its two arrays are frozen at the emit; the listener is host code and writes to no shared message, option, or definition; the host forwards it to no page | — |
| Tool results | handler | tool role. In a ledger's answer pass, also the results note, a stored `user` message (F42). | the authority path | `denyCall` |
| The `repeat` and `overflow` notes | the ledger's constants | tool role, as a denial's reason | the ledger's authority wrapper | — |
| Deny reasons | host rules | tool role | — | verbatim |
| A stored conversation's built-in records | the loop; a host or a page that edits the store | the shown set | registered, ceiling, at every turn | an excluded or unknown name shows nothing |
| A page's system message or definitions through a relay | the page | the relay | `system.accept`, `tools.accept`, the server's declared definitions | `422`, unchanged |

Every built-in dispatch carries `{ signal }` alone (A:1172) until 0.0.43, where every dispatch, a built-in's included, carries `{ signal, caller }`. No built-in reads `caller` or a caller identity.

## The release bar

Each phase's bar is its own claims, its round, and its gates, as § Phases states. A finding outside a phase's claims blocks only when it shows one of these consequences:

- a model-reachable call or advertisement past the ceiling or past the authority
- text in `system` the host did not author
- a request over the capacity the plan priced as fitting, under a gauge the ledger measured or a supplied one that states what its provider charges, on a provider that charges a definition in proportion to its estimate. A calibration call is no request the plan priced; from unit K no gauge is stored from a call with the definitions reported over `capacity`.
- a dispatched request that differs from the preceding phase's with every option the phase adds absent. A ledger with no option set dispatches as the preceding phase did up to the first request it prices over `capacity − predict`, which is not dispatched. Its plan budget reads the scale the ledger holds, which differs from the preceding phase's only after a first call that advertised part of the calibrated set: phase 2 read such a call as carrying no definitions and inflated its scale, and the ledger keeps the scale it held. The re-prepared 0.0.42 reads three changes into this line, each by its ruling: a ledger whose calibrated definitions alone exceed `capacity` refuses with `'GAUGE'` naming the remedy, where `46ae3811` stored a gauge measured over the window (claim K.3's class `refused`); a scope that lists `load` beside `skills: []` dispatches what the same scope without `load` dispatches (claim T.4); and an own option member no type declares refuses with `ContractError` coded `'structure'`, while a host that passes declared members alone dispatches as before (claims O.1 and O.3).
- a stored message lost or stored twice
- a run or a child live after its owner settled
- an ask that waits with no path to an answer

By the user's ruling of 2026-11-12, every other finding is built, refused with its reason in § Refused, stated as a limit in `guides/agent.md` § Limits, or handed to the package that owns it. None is deferred.

Phase 3's rulings restated the capacity line and the no-regression line on 2026-11-12, and the user accepted both, with claim 3.1's budget clause, as a target and a recorded baseline rather than a hard result (`plan.md` § Rulings). A reading near its baseline is drift; a departure by an order of magnitude, like the consumer's first call priced at a sixth of its charge, is an outlier to trace. On a provider that charges a definition out of proportion to its text, a call that advertises part of the calibrated set can be refused when it fits or sent when it doesn't: claim 3.1's flat arm read 3 such refusals in 120 seeds and 0 under-priced dispatches.

### The bar of the re-prepared 0.0.42

The O-and-D ruling, the triage ruling, and the refusals ruling each set lines of this bar, and K's follow-up ruling and the fix ruling restate two of them. Publication stays the user's.

| Line | Ruling | Receipt |
| --- | --- | --- |
| Claims C.1 to C.8 closed with independent receipts, each repair closed by its mutation | O-and-D | `agent-u1-final-mut`; the falsify round on the cut, both lanes confirmed; C.7's rehearsal on the rebuilt `dist`, `plan.md` § Sequence |
| Claims 2.1, 2.7, 2.9, D.1, D.2, D.4, D.8, and 3.1 green as restated | O-and-D | `agent-u1-final-mut`; the objective lane's 300-scenario differential |
| Claims 3.14 and 3.15 closed as restated, by arm `index`'s live run and by arm `taverna`'s receipt, which PK2 puts on a live rerun under K | O-and-D; triage | arm `index`: `agent-consumer-live-index`; arm `taverna`: `plan.md` § State |
| The room sweeps of claims 3.23, 3.31, and 3.33 rerun one time on the tree that holds K and R, with calibration calls counted: 0 calls without definitions over capacity, every call with definitions over capacity refused with no gauge stored, and each reach count above 0 | O-and-D; triage, as K's follow-up ruling rewords it; refusals | `agent-k-green-mut`, run twice; `agent-r-final-mut` |
| Claims K.1 to K.6 closed, each with its mutation | triage | `agent-k-green-mut`; the falsify round on K and R |
| Claim C.1's and claim 3.1's differentials under K with no `before` row | triage, with K.3's classes | `agent-k-green-mut`; `agent-k-pk2` for C.1 |
| Claims T.1 to T.4, J.1 to J.5, and O.1 to O.6 closed, each with its mutation | refusals | `agent-r-final-mut`, `agent-r-mut-message`; the falsify round on K and R |
| Claim C.1's differential under R differs on the trap class alone | refusals | `agent-r-final-mut`: 31 of 300 scenarios, all trap |
| The door census's rows ruled, and each built row green | refusals; door ruling | `agent-r-green5`; `agent-r-final-mut` |
| The guide calls no listed `load` beside `skills: []` a mistake, and states the two refusal contracts and the `undefined` reading | refusals | the documentation unit's greps; the subjective lane's grep |
| Claim 4.11 recorded as closed in 0.0.42, and D15 struck from phase 4 | refusals | claim O.5; § Phase 4 |
| § The deferral list, `plan.md` § Deferred, and `ROADMAP.md` as the triage's units state them, with each hand-off message sent | triage | § The deferral list; `plan.md` § Deferred |
| One `orkestrel-falsify` round on the cut, and one review on K and R | O-and-D; triage | both rounds, § The re-prepared 0.0.42 |
| The fix round on the findings of the round on K and R, closed by one closure check | the fix ruling | `plan.md` § State |
| `verifier` tree-wide, one time, on the integrated commit, with the `distribution` project | O-and-D; triage | `plan.md` § State |

The triage's line on the request-bounded shown set is void: probes L1 and L2 did not adopt it. The consequence lines of the preceding list hold, as restated.

### The bar of Agent 0.0.43

The wsedit ruling and the wsfiles ruling set the lines of this bar, and the consequence lines of § The release bar hold. 0.0.43 reads one change into the no-regression line: a request after a turn whose calls changed a rendered file carries the edit under a rebuilt head (claim A.8), where 0.0.42 reused a head that showed the earlier text. A tool call's context gains `caller`, and a handler that ignores it runs as at 0.0.42. Publication stays the user's.

| Line | Ruling | Receipt |
| --- | --- | --- |
| Claims A.1 to A.8, F.1 to F.3, and O1 closed, each with its mutation | wsedit; wsfiles; the Orchestrator's O1 ruling | `agent-w43-close2-mut`; `agent-w43-fix-mut`; the review, CONFIRMED |
| No caller holds a workspace the live `workspaces` list excludes, and no file a `files` list hides reaches a request | wsedit; wsfiles | the review's adverse probe and its 12 rebuild cases |
| Every request of the `rc1` differential against `9e15d18e` equal, with the handler context the one difference | the no-regression line | the review: 300 of 300 rows |
| The guide states the caller, what a tool reaches under the `files` list, and the rebuild, with an executed case | wsedit; wsfiles | guides 238 in `agent-w43-close2-mut` and in `agent-w43-fix-mut` |
| No fleet collision for `AgentCaller`, `isAgentCaller`, or `resolveWorkspace` | wsedit | the policy project's `surface` rule in `agent-w43-close2-mut` |
| The turn bars read on a run that edits at every turn, a slower reading inside its bar kept | wsedit | read 2026-11-13 (`agent-w43-bench`, solo, 5 processes of 3000 turn samples an arm, scripted, no model): the head rebuild costs 0.048 ms at the median and 0.064 ms at p95 per turn against 0.0.43 with no rebuild, and 0.044 ms over 0.0.42, under 1% of claim 2.11's 6.6 ms bar; noise 0.001 ms at the median; the slowest turn 4.28 ms; read as a small change, kept |
| `@orkestrel/workspace` re-pinned to 0.0.18 from the registry | wsfiles | owed at the release visit |
| The release chain on the integrated commit, with the `distribution` project | `orkestrel-publish` | owed at the release visit |

## The deferral list

The list holds no row. On 2026-11-12, under the user's ruling "Take care of everything now, not interested in deferring anything", the triage ruling settled every row the list held and the rows `plan.md` § Deferred named. The Orchestrator reversed one closure to a build, the refusals ruling built that row and moved one row out of phase 4, and the D-window ruling closed the row the O-and-D ruling had added. Each row went to one home: built in 0.0.42 (§ The re-prepared 0.0.42), refused with its reason (§ Refused), or handed to the package that owns it (`plan.md` § Deferred). A refused row that a host meets is also stated in the guide, in § Limits unless the table names another place. Row numbers are the triage ruling's. The 0.0.43 wave adds no row: the review's advisories and Study's start-time digest race are closed in § Refused, § Closed in the 0.0.43 wave.

| Row | Item | Outcome |
| --- | --- | --- |
| D1 | Consent inside a child | Refused; phase 4's stop "Consent in a child" |
| D2 | A `delegates` member on `AgentDelegate` | Refused; phase 4's stop "Depth and concurrency" |
| D3 | A delegate concurrency option | Refused; phase 4's stop "Depth and concurrency" |
| D4 | A fit of a lookup's result to the measured remainder | Refused; § Limits; phase 3's stop "The capacity rate" |
| D5 | A measured density in the gauge | Refused |
| D6 | Calibration over a ceiling-bounded set | Built as unit K; the row's named form refused |
| D7 | Page-side disclosure through a relay | Refused |
| D8 | A host override of the loaded body's rendering | Refused |
| D9 | Per-request `disclosure` on a ledger kept across requests | Refused |
| D10 | `scope` in `LedgerAgentOptions` | Refused; a `scope` member refuses at the door (claim O.5) |
| D11 | A reader for a skill's bundled `files` | Refused |
| D12 | Agent-owned memo persistence | Refused; the guide states that Agent loads and saves no memo store |
| D13 | A model path to remove a memo | Refused |
| D14 | A memo the model names itself, and revision across threads | Refused |
| D15 | Exact admission of `LedgerOptions.agent` | Built in unit R as claim 4.11, by claim O.5; the triage had placed it in phase 4 |
| D16 | Workspace `read` and an index mode, ROADMAP item 15 | Refused; § Limits; item 15 left `ROADMAP.md` |
| D17 | ROADMAP item 7 | Refused; the item is restated to its second trigger |
| D18 | ROADMAP items 13, 14, 19, 21, 26, 32, 52's notice, 57, 58, and 69 | Refused as a second home; each keeps its trigger in `ROADMAP.md`, and item 58 left it, answered by O and D |
| D19 | The generic-surface arm of the reading | Handed to taverna |
| D20 | toolbox's agent-facing tools on Agent's built-ins | Handed to `@orkestrel/toolbox` |
| D21 | The `methods.md` example naming toolbox as the loader's owner | Handed to `@orkestrel/scaffold`, which carries it as `5dbe14d0c` |
| D22 | `scanJobTree`'s cost | Refused; § Limits |
| D23 | The scan and the spawn each reading `children` | Refused; § Limits |
| D24 | A malformed child bound refused at the child's build | Built in unit R, claims J.1 to J.5; the triage closed it, and the Orchestrator reversed that under the refuse-by-default rule |
| D25 | A supplied `gauge` refusing after a tool is added | Refused |
| D26 | `ledger.agent.emitter`'s write members | Refused; § Limits |
| D27 | A host's own `select` during a pass | Refused; § Limits |
| D28 | No index of the memo names a model may write | Refused; § Limits |
| D29 | An ask for a `remember` its handler refuses | Refused; § Limits |
| D30 | Text that passes as visible and reads blank | Refused; § Limits |
| D31 | Claim 2.11's growth margin | Refused |
| D32 | The fixed part's third calibration call | Refused, and the Orchestrator confirmed the closure; § Limits; phase 3's stops "Pricing density", "The spared rate", and "An under-priced partial set" |
| D33 | A check of an adopted gauge | Refused; § Limits, with the lever of omitting `snapshot.gauge`; phase 3's stop "A supplied or hydrated gauge" |
| D34 | The set estimate's rounding | Refused; § Limits |
| D35 | The answer fit's untested rate floor | Refused |
| D36 | What an `'OVERFLOW'` rejection keeps stored | Refused; the guide states it |
| D37 | A public read of the room | Refused |
| D38 | A `remember` line under a host's memo `format.render` | Refused; the guide's ledger section states it |
| — | A shown set that ends with its request, added by the O-and-D ruling | Refused by the D-window ruling on probe L2's 27 of 42 |
| P4 | `test:studies`' parallel setting | Handed to the scaffold session, where scaffold item 165 was already closed; nothing is owed |
| P7 | Study's executable `digest` and `--extend` | Handed to `@orkestrel/study` |
| P8 | Study's cross-bundle sharing gap | Refused: unit U2 removed the copies |

Phase 3 closed one deferral the host-act ruling had opened: a bound on the spared rate, triggered by the consumer live run of 2026-11-12, whose arm `taverna` reported first prompts 6.43 and 5.07 times their price. Rule (a) of the spared-rate ruling closed it.

ROADMAP items the campaign closes: 67 and 68 in phase 1; the first clause of 37 in phase 2; 6 at the end of phase 3, after its reading; 9 in phase 5. Item 8 is ruled in phase 3, and the documentation unit of 2026-11-12 removed it as answered. Phase 1's repair also removes item 9's second trigger, "an application runs a ledger's agent on another conversation", because the ledger holds no member that starts such a run. Item 9's other trigger and phase 5's binding stay. Phase 3 met item 15's trigger, a workspace over half the head: taverna's context message prices 8001 of a head of 8208; the triage closed the index mode, and item 15 left the roadmap. The triage removed item 58, answered by O and D, and restated item 7 to its second trigger. The documentation unit removed item 59, the user's item on refusing unknown run-option keys, because unit R built that refusal.

## The 4B reading

The reading is phase 3's last run: it follows the falsify round and its repairs, and unit 3C and the verifier's gates follow it, so the guide's recommended composition and ROADMAP item 6's removal have an owning unit and a gate. The reading is reported before the phase 3 release and an efficacy miss does not hold it (§ Point 14). **The priced arms come first.** No wall time of the earlier 36-tool reading is recorded, so each arm is priced by a bound: 42 requests, at most 3 provider turns each, at the 13206 ms a measured 4B call took (`methods.md:170`), is 28 minutes [inference from one measured call; the smoke step replaces it].

| Arm | What | Catalog and prompt | Bound | Ruling |
| --- | --- | --- | --- | --- |
| A | every tool advertised | desk, 36 tools; 2416 tokens read on 2026-11-07 [lane] | 28 min | In. The control must come from this build and this runner; the earlier reading is another lineage. |
| O | the known area's tools, no `load` | desk, 6 tools; 699 tokens read [lane] | 28 min | In, and first to cut. It shows whether the earlier 35 of 42 persists. |
| D | the skills index and `load`, nothing shown | desk | 28 min | In. The unpointed path. |
| P | the known area's skill given through `disclosure`, with `load` advertised | desk | 28 min | In. The composition the first consumer will run. |
| G | a generic list, get, and change surface | taverna's catalog | not priced here | Out. It needs a surface the desk bundle does not hold, and taverna's gate reads it on its own catalog. |
| A on taverna's full catalog | 238 typed tools | about 18300 estimated against 15872 | 0 | Out. It does not fit, and a raised `num_ctx` changes the condition the arms compare. |

**Total bound: 1.9 hours for the arms, 2.4 with the rehearsal and the smoke.**

**The bound under the user's rule that studies run short.**

1. Rehearse the whole series with the model taken out, and read the rehearsal's own cost.
2. Run one smoke: one conversation of arm A, bounded at 8 minutes. Derive the series from the per-request time it reads.
3. Run the series only when it fits 45 minutes on that reading. When it does not, cut arm O, then report to the user before any further cut.
4. One sealed trial an arm. No repeat before the first report. `test:studies` runs no model.

**The bar,** set before any arm runs, on the earlier reading's grader:

| Reading | Bar |
| --- | --- |
| P, right tool | at least 40 of 42 |
| D, right tool | at least 38 of 42 |
| P, median prompt tokens | at most half of A's |
| P and D, median first text | at most A's plus 1.0 s; first text on the turn after a load reported apart |
| D, distinct skills loaded per 10 turns on requests whose area is already shown | reported; 1 or more reopens the body placement stop |
| `overflow` denials by the thread cap | reported; any on this battery reopens `share.skills` |
| D, the count of unpointed `load` calls and of right tools after them | reported: it is the reading of skill use ROADMAP item 6 requires |
| A against its 2026-11-07 reading | reported as the one spread reading across builds |

[inference] The margin of 2 requests assumes the battery repeats at a fixed seed, as the `chat` study did row for row on 2026-11-08 (`agent/studies/README.md`, § What it measured). The A row reads that assumption; a spread wider than the margin voids the bar, and the report says so instead of ruling.

**As recorded, per the consultant's study ruling of 2026-11-11.** The reading runs as a recorded Study.
- The declaration is `disclosure`, over the driver bundle `studies/desk/` (units 3B-a and 3B-b). Phase 0 found no desk catalog under `studies/tools/`.
- Its purpose is `mechanism`, with mechanical grading, one scenario per conversation, and one repetition, under a `screen` profile pinned to the 0.40.16 runner lineage, with `record` declared.
- Arm P runs on a ledger built for each trial, with `agent.disclosure` set at construction. A trial is one conversation, so no kept ledger needs per-request `disclosure`.
- The first-text row reads each trial's goals after its first apart from the first, because Study unloads the models before each trial.
- Live model use is one smoke trial and one recorded schedule. Every later iteration grades offline, or replays the recording by key and sends only changed requests.

**As read, 2026-11-12.** The reading ran after the round closed, on the build of the repaired source, against Ollama 0.40.16 at its default URL with the 4B and the judge pinned by digest. Under the user's Ollama rulings of that morning the `screen` profile names no daemon and pins no runner path; it keeps `settings.version` until Agent re-pins to the Study that drops it. The rehearsal passed with no model in 390.3 s, and the smoke trial sealed in 55.7 s; its derived byte allowances equal the frozen profile's, and the schedule was estimated at about 30 minutes. The recorded schedule sealed 28 trials and 168 requests in 834 s, against the 45-minute bound, so no arm was cut. The offline replay sealed with no request, and grading and an aggregate-only summary followed. Unit 3C wrote the guide's composition for a small-model host from this reading.

| Arm | Right tool | Median prompt | First text at the opening | After a load |
| --- | --- | --- | --- | --- |
| A, all 36 tools | 42 of 42 | 6502.5 | 3.51 s | — |
| O, the known area's 6 tools | 42 of 42 | 1947.5 | 3.79 s | — |
| D, the index and `load`, nothing shown | 40 of 42 | 2791 | 6.20 s | 8.45 s |
| P, the opening area shown, with `load` | 35 of 42 | 2134.5 | 0.97 s | 4.16 s |

Read against the bar as baselines, per the user's ruling of 2026-11-12:
- P reads 5 under its 40 of 42 target. Inside the shown area it reads 24 of 26; on requests that need another area it reads 11 of 16, with 8 loads, 7 of them opening the right area.
- D meets its 38 of 42, and each of its 15 unpointed loads opened the right area. That is the reading of skill use ROADMAP item 6 required.
- P's median prompt meets the bar at a third of A's.
- P's median first text meets the bar of A's plus 1.0 s, 4.51 s. D's is over it, because D's opening turn carries the load's round trip.
- On requests whose area was already shown, D loaded 0 distinct skills per 10 turns, so the body placement stop stays closed.
- No arm met an `overflow` denial, so the `share.skills` stop stays closed.
- A reads 42 of 42, as on 2026-11-07, and O reads 42 of 42 where the earlier lineage read 35 of 42, so the battery reads stable across builds and runners.
- No request was refused or failed in any arm.

**As ruled, 2026-11-12.** The user, on this reading: "Sounds good, let's go with that, and clean up the others, I don't want to leave bloat, which means get rid of P and A. Make sure that agent is properly set up for O and D as you recommended."
- O, each request scoped to the known area's tools with no `load` and `skills: []`, is the default. D, the skills index and `load` with nothing shown, is the fallback. P and A are removed.
- `46ae3811` is the last commit whose tree holds the `disclosure` option and arms `all` and `shown`, so the four-arm reading reproduces from git.
- `1d99e541` is the code commit of the re-prepared 0.0.42 that makes the cut, with K, R, and the fix round; `c0b84d16` holds the desk study to arms `area` and `index`.
- The priced-arm table, the bar, and the reading of 2026-11-12 stay as written; they are the record. The guide states what exists and cites no A or P number.
- The desk study holds arms `area` and `index` on bare agents, and `studies/README.md` records their baselines as one run's readings: `area` 42 of 42 at a median prompt of 1947.5, and `index` 40 of 42 at 2791 with 15 loads, each right.

**D on a ledger, read 2026-11-12.** Arm `index`'s live consumer run (§ The re-prepared 0.0.42) opened the question of D after a first load: on a kept ledger, after another area's load, the model loaded nothing on 4 of 5 requests.
- **The D-after-a-load ruling** kept the thread-long shown set in 0.0.42 and claim 2.3 unchanged, because the desk baseline itself kept each load for its thread. It ordered the probes and wrote their rule before any arm ran, on D's bar of 38 of 42: L1 at or over 38 settles it; L1 under 38 runs L2 and L3, and the request-bounded set is adopted only when both read at least 38 and L3 is within 2 of 40; L1 and L2 both under 38 mean the bound is not the remedy.
- **E0,** a count from the sealed recording (`agent-e0`): of arm `index`'s 9 entries into an area after another area's load, 8 loaded their own area and 7 read right, each after its own load, and 1 made no load.
- **S1,** scripted on the base and the request-bounded builds: a ledger's window carries each earlier request and its call-free reply, so the next request's first prompt holds neither the earlier `load` call nor its note, and no stub; a bare agent sends both. The loaded skill stays shown on both. The request's opening message is derivable exactly when it is named, as a run's prompt or a ledger's request id across both passes, an abort, and a fold that holds it; taken as the last user message, it is wrong.
- **L1** (`agent-dprobe-l1`, about 15:21 to 15:25, the 4B, the desk battery, the `46ae3811` source built as digest `8ba8b06a7646…`, a ledger built and hydrated for each request from the last whole answer's snapshot): 37 of 42, with 0 failed. Openings 7 of 7; visited 24 of 26, the area shown at the first call on 25, with 0 loads; entries after another area's load 6 of 9, with 8 loading. Loads 14 right, 1 wrong, 0 denied. First-text median 3213 ms. Beside it, the bare reading: 40 of 42, entries 7 of 9 with 8 loading their own area (E0).
- **L2** (`agent-dprobe-l2`, about 15:25 to 15:30, the request-bounded build, digest `2b16da6dc784…`, on a ledger): 27 of 42. Openings 7 of 7; entries 7 of 9; visited 13 of 26, with all 26 loading. Loads 39 right, 4 wrong. First-text median 3962 ms. By the rule, the bound is not the remedy, and L3 did not run.
- **The D-window ruling:** L1's 37 of 42 is drift, not a defect. Of its five misses, one made no `load` where one was due; one named the wrong skill; one followed that wrong load; one loaded the right skill and called nothing; and one answered a repeated question from the carried exchange. The model loads with no worked example: 7 of 7 openings and 8 of 9 entries on the ledger, against 8 of 9 bare. The worked-example finding is recorded as a difference in composition with no measured cost. D's bar of 38 stays a baseline for the bare composition; the ledger's 37 is recorded beside it as drift, and no second bar is set from one run. No `src/` change follows, and the request-bounded set is refused (§ Refused).
- **The guide's sentence,** from the D-window ruling, beside the D-to-O lever: "Serve a request under an O scope whenever the host can tell its area, request by request, including on a thread that began under D. Keep D for the request the host cannot place. A host that sees wrong loads on a D thread enables `unload` beside `load` or opens another thread."
- **An observation outside disclosure:** on `c1/turn-6`, a ledger answered a repeated question from its carried exchange with no tool call. It concerns the window's freshness and opens no row.

## Refused

- **Any model path to a scope,** and any built-in that names, returns, or changes one. The user ruled it.
- **A run scope that replaces the context scope.** It turns the agent's ceiling into a default.
- **"The ledger never calls `context.apply`."** F1 makes it false for the first pass's `recall` narrowing.
- **A child given its parent's budget instance.** F9: the child's `start()` strands the parent's bound.
- **A child given its parent's `ask`.** F31: its ask waits with no frame.
- **A delegate under a ledger before phase 5.** F33: the child writes into its parent's request.
- **A `remember` that revises a memo its conversation did not write,** and a `remember` or a `switch` under a ceiling that lists nothing for it. F43: the write would replace a host's memo.
- **A run-held tool called outside the run's `ToolManager`.** F25: only the manager turns a throw into a result and stops a call on an aborted signal.
- **An unbounded count of delegate calls,** and a child that runs a turn after its ceiling could not be read.
- **A fan-out child that exceeds its parent** in provider, scheduler, limit, timeout, or budget, and a check that finds a deep violation after the tree has started.
- **A release bar that reads the model's choice.** Claim 3.14 reads calls the plan composed before the model chose.
- **Deferring any finding that touches a ceiling, a principal, the authority, or authorship.**
- **A ruling on the price of an added definition before the density probe,** and a ruling on the batch runner before probes K1a and K1b.
- **An `Area` type, a `Disclosure` entity, a `core` list, a declared `reserve`, and a stored `rate`.** Each is a second holder of a fact this design derives.
- **A body in a tool result, a run that ends on a load, and a late or second `system` message.**
- **Names of skills, memos, or workspaces in a built-in's definition.** They would move the digest, the prefix, and a relay's check on every registry edit.
- **An echo of a refused argument,** and a refusal with no candidates.
- **A default `allow` for a built-in or a delegate.**
- **A delegate the model parameterizes** with a provider, a scope, tools, or system text, and a child that outlives its parent's run.
- **`consequential` on a delegate by default.** It denies every delegation on a host with no approver.
- **A character cut of a delegate's answer.**

### Closed from the deferral list, 2026-11-12

Each was closed by the triage ruling unless another ruling is named, for the reason given. § The deferral list maps each row to its number.

- **Consent inside a child, a `delegates` member on `AgentDelegate`, and a delegate concurrency option.** Each is phase 4's contract: a child never asks (F31, probe K2), depth is 1, and one child runs at a time (probe K1a). No consumer delegates (F26). Phase 4's stops keep the observations.
- **A fit of a lookup's result to the measured remainder.** No pass ended this way in any run, and the lookup's own `limit` bounds its result; a cut of a result is the act this section already refuses for a delegate's answer.
- **A measured density in the gauge.** Its trigger was the density probe failing, and the probe passed on 9 samples.
- **Calibration over a ceiling-bounded set.** A gauge measured on a scope's subset moves the digest at every scope change, and claim 3.7 rules that a ceiling change calibrates nothing. Unit K builds the defect's remedy instead.
- **Page-side disclosure through a relay, a host override of the loaded body's rendering, and a reader for a skill's bundled `files`.** None has a consumer or a reading. Claim 2.17 refuses by default, the host authors the body, and ROADMAP item 16 holds the parser question.
- **Per-request `disclosure` on a ledger kept across requests.** The cut removed the option it extends.
- **`scope` in `LedgerAgentOptions`.** `context.apply` before `respond` is the one door and construction dispatches nothing; a `scope` member in `agent` refuses at the door (claim O.5).
- **Agent-owned memo persistence, a model path to remove a memo, a memo the model names itself, and revision across a principal's threads.** Persistence and removal are the host's, revision across threads needs a principal identity a run does not hold, and no run met a `remember`.
- **Workspace `read` and an index mode.** The host authors workspace text, and `scope.files`, its lookups, and toolbox's workspace tool compose it; no reading says the 4B answers better from an index and a read. It is the one closed row with a consumer, and reversing it is a phase-sized build that opens with a viability probe on the 4B.
- **ROADMAP item 7 here, and items 13, 14, 19, 21, 26, 32, 52's notice, 57, 58, and 69 as a row.** No authority branches on ingestion, so item 7 keeps its second trigger alone; each other item is `ROADMAP.md`'s to hold, and item 58 is answered by O and D.
- **`scanJobTree`'s cost, and the scan and the spawn each reading `children`.** No consumer runs a job tree (F26), and a job record is host data.
- **A supplied `gauge` refusing after a tool is added.** The refusal is the contract: a gauge holds for the definitions it priced, and the host supplies one for the changed set.
- **`ledger.agent.emitter`'s write members, and a host's own `select` during a pass.** Host code is trusted with `context` too, and claim 1.21 refuses every `select` the ledger can tell from its own; no message is stored twice.
- **An index of the memo names a model may write, a name check before the authority, and a further visible-text rule.** The host names the writable memos in its own instruction text; a check before the authority would list candidate names to a call not yet allowed; and `ARGUMENT_BLANK_PATTERN` and `ARGUMENT_CONTROL_PATTERN` are the floor.
- **Claim 2.11's growth margin.** `collectDisclosure` read 0.94 ms at 1600 messages against a bar of 6.6 ms, and the growth figure is a baseline.
- **The fixed part's third calibration call.** Every trigger read unmet. A shown skill is priced 1.3 to 1.65 times its charge, on the safe side, which the user's framing reads as drift. The call would add a provider call to every calibration, a member to the stored gauge, and terms to `spared` and `added` that seven rulings and three sweeps proved as written. The Orchestrator confirmed the closure.
- **A check of an adopted gauge.** A host that hydrates each turn would adopt the measured gauge again at its next turn, so a provider that charges out of proportion would calibrate at every other request, and closing that needs the gauge's source in the snapshot. A host that changes its model or provider omits `snapshot.gauge`.
- **The set estimate's rounding against a per-definition charge.** 1 of 741 cases read 1 to 2 tokens over, inside a host's context margin.
- **A test that reddens the answer fit's rate floor.** The fit, the first-request price, and the later-turn price read one `#capacityRate`, whose floor the `floor-gate` mutation pins.
- **A rule for what an `'OVERFLOW'` rejection keeps stored.** The guide states it, and the host keeps the snapshot it hydrated from.
- **A public read of the room a ledger leaves for the head.** `ledger.gauge` and the exported price helpers compose it, and a method would hold a derived fact twice.
- **Pricing a `remember` line under a host's memo `format.render` at admission.** The gate and the plan price the head the host's line builds.
- **Study's cross-bundle sharing gap.** Unit U2 removed the copies.
- **A shown set that ends with its request,** the row the O-and-D ruling added, with the `opened` parameter of `collectDisclosure` and the probe-only run option it needed. Probe L2 read it at 27 of 42 against L1's 37, so by the rule written before the run the bound is not the remedy (the D-window ruling).

### Refused by the rulings of 2026-11-12

- **A host-given skill, on an agent, a run, a job, or a ledger.** The user ruled it on 2026-11-12 after arm P read 35 of 42.
- **Every tool advertised as a recommended composition.** The user ruled it with P.
- **`disclosure: { workspace }` as the workspace's home,** a group of one under a word that no longer names what it holds, and **a workspace derived from a ceiling whose `workspaces` list admits one id,** a second meaning for an allow-list. (The O-and-D ruling.)
- **An area type, an area option, a helper that builds the O scope from a skill, and a scope argument on `respond`.** Each restates what `createScope` and `Skill.tools` hold. (The O-and-D ruling.)
- **A harness arm that seeds a `load` record through a scripted first turn, and moving the desk study's arm `index` onto a ledger.** The first builds a provider swap for a reading scripted claims already hold; the second voids the arm's baseline. (The O-and-D ruling.)
- **A bound counted in requests on the shown set, a ledger method or option that clears it, and a change to the pricing of a shown skill.** The first holds a figure no reading sets, the second has no consumer, and first calls on a thread that shows a skill read 0.603 to 0.775 of their price, inside the bar. (The D-after-a-load ruling.)
- **A kept `load` exchange in a ledger's window, a stub for the call, a records line for a `load`, and probe L4.** Each adds weight to the fallback path with no reading behind it, and L4's rule would adopt on a gain of one request. (The D-window ruling.)
- **A bound on calibration before the call with the definitions, a held-back definition, calibrating in parts, a remembered refused digest, a floor on the sample, and a fixed calibration text.** Before that call the ledger holds no density; each of these answers a registration error with a mechanism or a tuned value. (K's follow-up ruling.)
- **A refusal of the trap at `createScope`, at `apply`, or at a run's entry, and a guide sentence that documents the trap.** Two sound scopes intersect into the trap, so no single scope is wrong, and the one-line rule makes the state harmless. (The refusals ruling.)
- **A construction check of `AgentOptions.timeout`, and `scanJobTree` taking the registry to resolve names.** A hand-built agent's bad `timeout` refuses at its first `stream()` before any state changes, and the root's `build` resolves every name before the root runs. (The refusals ruling.)
- **A compiled contract shape for an options object, and `recordOf` with a guard a member.** Options hold live objects no shape describes, and a boolean guard names no key. (The refusals ruling.)
- **A door on an internal helper or an error constructor.** Each helper receives a value an admitted door built or read; a refusal thrown while an error is built would mask the error it reports. (The door ruling.)
- **Toolbox's `switch` kept as it is, kept behind an option, given an allow-list, or with `workspaces` kept as a read.** Both packages would offer a `switch` with opposite reach; an option that turns a hazard on serves no consumer; an allow-list is a second ceiling beside `ScopeFilter.workspaces` that still moves the shared pointer; and a listing with no `switch` discloses ids and file counts outside any ceiling. (The switch ruling.)
- **A resolver option on Toolbox's tool, the built-in `switch` moving the registry's `active` pointer, and an edit tool that refuses when the shown and active workspaces differ.** The resolver leaves the defect as the default; the pointer move carries the cross-conversation hazard into Agent and reverses 0.0.42's statement that the pointer never moves; and the refusal leaves the model unable to edit after any `switch`. (The wsedit ruling.)
- **A `conversation` member on `AgentCaller`, and a member of its own on `ToolContext`.** No consumer reads a conversation id; a workspace member would put a workspace concept in `@orkestrel/tool`, which knows none, and a tool release re-pins every dependent. (The wsedit ruling.)
- **A guide sentence alone for the `files` list, and a filtered view of the workspace in place of the list.** The sentence leaves a file the list omits open to `read`, `search`, and `replace` by default; a view is another object, so the identity test that stops a fabricated caller would go, and `WorkspaceInterface` cannot express `search` and `replace` over a subset. (The wsfiles ruling.)

### Closed in the 0.0.43 wave

Each was recorded below the bar on 2026-11-12 or 2026-11-13, for the reason given; none is deferred.

- **An identical write rebuilds the head and replaces its message ids** (the review's advisory A1). The compare reads identity, and phase 0 read that a file's value changes identity on a write of the same text. The rebuilt head's text is unchanged, so a provider cache keyed on content does not move; only the message ids change.
- **The price moves at the turn after an edit to a rendered file** (the review's advisory A2). The next request carries the edited text under a rebuilt head, so a provider cache keyed on the system and context messages moves at that turn alone. 0.0.42 left a stale head, whose price was lower and whose answer was wrong. A turn that edits no rendered file prices as before, and the turn-bar reading is a line of § The bar of Agent 0.0.43.
- **A digest change between Study's read and Ollama's pre-spawn re-read refuses that daemon start** (the Study P7 review's finding F1). Study reads the executable and hands the digest to Ollama, which re-reads and compares it before spawn. Ollama's `executable.digest` is a required member, so Study cannot remove the window, and that verification is a security check, not a version pin. The refusal needs the file to change between two reads milliseconds apart.
