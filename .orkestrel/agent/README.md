# Agent records campaign

The tracked record of the Agent records campaign: memos, skills, and durable long-conversation strategies for `@orkestrel/agent`. `@orkestrel/scaffold` `.claude/rules/campaign.md` governs this folder.

## Read order

1. This file.
2. `plan.md` § State; its last row is the next action.
3. The first open phase of `plan.md` § Sequence.
4. The design that phase's units name under `designs/`.

## File map

| File | Holds |
| --- | --- |
| `plan.md` | the goal and exit criterion, the repositories, § State, open decisions, rulings and verified facts, deferrals with their triggers, and the sequence with its stop line |
| `ledger.md` | one row per dispatched unit and per user ruling on routing or scope |
| `tenets.md` | the campaign's standing directives, each with its citation |
| `designs/records.md` | the ledger: source of truth, snapshot and hydrate, write cost, the records in the request turn, the moving tail, trim and head-pricing fixes, DeltaDB transfer |
| `designs/compaction.md` | the recap role, the blank-digest refusal, the literal vocabulary, anchored recaps, rule retention, recall, repeat loops, compaction deferrals |
| `designs/context.md` | memos, skills, their managers, stores, and tools, the `AgentContext` and ledger wiring |
| `designs/authority.md` | Authority `ask` and the `consequential` floor: principle, shapes, loop placement and orderings, denial notes, events, what Agent protects against, security deferrals, the denial-text reading |
| `designs/layout.md` | the request layout: the host-authored `system` boundary and its inlets, the layout per configuration, the request turn, the context message, literal strings, shapes, sampling, the canary, the layout readings, layout deferrals |
| `designs/measurement.md` | the cheap-first order, probes, bench, instruments, the subject models, the GPU allowance, recording and the run record, screens, every unit's gate, the GPU order, open uncertainties |
| `designs/runs.md` | the run operations: the user's ruling, the segment shape and checkpoints, the segment plan per GPU step, rc-a9's first readings, progress, stops, the fixes checked while a step runs, replay and the per-lineage pins, the run-operation units with their acceptance, run deferrals |
| `designs/boundary.md` | the browser and server boundary: the four placements and their trust table, the consumer mistakes with remedies R1 to R6 and the rejected list, run binding, relay ownership, the "Page to Node agent" wire with its live `ask` frames, the stored-role refusal, the boundary units, boundary deferrals, and the breaking changes |
| `research/evidence.md` | the external claims C01 to C51 with verdicts and URLs, the DeltaDB mechanisms, the prior-campaign readings with their commits |

## Id law

Every id is numbered for life and never reused. A retired id stays retired.

| Prefix | Names | Home |
| --- | --- | --- |
| `rc-` | a unit, from the consultations' sequence (`rc-p1`, `rc-u1`, `rc-a14`, `rc-u10`, `rc-d1`, and the rest of `plan.md` § Sequence; the retired `rc-a6`, `rc-p3`, and `rc-e1` in `plan.md` § Sequence, Retired ids; the deferred `rc-t1` in `plan.md` § Deferred); the kind after `rc-` names the unit's sort, `rc-st` names a unit in `@orkestrel/study` (`rc-st1`, `rc-st2`, `rc-st3`), and `rc-nm` names the names unit (`rc-nm1`) | `plan.md` § Sequence |
| `O` | an Orchestrator ruling (`O1`, `O2`, …) | `plan.md` § Rulings |
| `F` | a fact the Orchestrator verified (`F1`, `F2`, …) | `plan.md` § Rulings |
| `C` | an external research claim (`C01`, `C02`, …) | `research/evidence.md` |
| `D` | a deferral with its reopen trigger (`D1`, `D2`, …) | `plan.md` § Deferred |
| `Q` | a decision only the user can make (`Q1`, `Q2`, …) | `plan.md` § Decisions |
| `R` | a browser and server boundary remedy (`R1`, `R2`, …) | `designs/boundary.md` § Mistakes |
| `N`, `W` | a ruling of one read-only consultation: `N1` to `N5` on burst 49, `W1` to `W7` on the questions the morning report of 2026-11-03 left | `plan.md` § Rulings, O158 and O161 |
| `Y` | a ruling of the consultation of 2026-11-03 on the S8 briefs' open items, `Y1` to `Y65`, each verified at HEAD `942becd0` | `plan.md` § Rulings, O165 |

- Ids from the closed boost campaign, such as `U45` and `R5b`, keep their meaning there and are cited with the commit that holds them; a bare `R` id in this folder names a boundary remedy.
- The 0.0.32 ledger fixes are named by what they do, never as `D1` or `D2`, because those ids are this campaign's deferrals.
