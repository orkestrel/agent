# Agent records campaign

The tracked record of the Agent records campaign: memos, skills, and durable long-conversation strategies for `@orkestrel/agent`. `.claude/rules/campaign.md` governs this folder.

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
| `designs/records.md` | the ledger: source of truth, snapshot and hydrate, write cost, render path, trim and head-pricing fixes, DeltaDB transfer |
| `designs/compaction.md` | the blank-digest refusal, the literal vocabulary, anchored recaps, rule retention, recall, repeat loops, compaction deferrals |
| `designs/context.md` | memos, skills, their managers, stores, and tools, the `AgentContext` and ledger wiring, Authority `ask` |
| `designs/measurement.md` | the cheap-first order, probes, bench, instruments, recording, screens, every unit's gate, the GPU order, open uncertainties |
| `research/evidence.md` | the external claims C01 to C31 with verdicts and URLs, the DeltaDB mechanisms, the prior-campaign readings with their commits |

## Id law

Every id is numbered for life and never reused. A retired id stays retired.

| Prefix | Names | Home |
| --- | --- | --- |
| `rc-` | a unit, from the consultation's sequence (`rc-p1`, `rc-u1`, `rc-a6`, `rc-e1`, `rc-t1`, `rc-d1`, and the rest of `plan.md` § Sequence) | `plan.md` § Sequence |
| `O` | an Orchestrator ruling (`O1`, `O2`, …) | `plan.md` § Rulings |
| `F` | a fact the Orchestrator verified (`F1`, `F2`, …) | `plan.md` § Rulings |
| `C` | an external research claim (`C01`, `C02`, …) | `research/evidence.md` |
| `D` | a deferral with its reopen trigger (`D1`, `D2`, …) | `plan.md` § Deferred |
| `Q` | an open decision only the user can make (`Q1`, `Q2`, …) | `plan.md` § Open decisions |

- Ids from the closed boost campaign, such as `U45` and `R5b`, keep their meaning there and are cited with the commit that holds them.
- The 0.0.32 ledger fixes are named by what they do, never as `D1` or `D2`, because those ids are this campaign's deferrals.
