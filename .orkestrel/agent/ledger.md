# Agent records campaign ledger

One row per dispatched unit and per user ruling on routing or scope. The carrier names the tracked record that absorbed the result.

| Date | Unit | Role | Carrier |
| --- | --- | --- | --- |
| 2026-10-30 | campaign opened; routing ruled: the `grok` role absorbs local material, the `researcher` role researches external sources, and one read-only consultation reconciles the plan | user | `plan.md` |
| 2026-10-30 | rc-g1: prior-campaign distillation | `grok` | `research/evidence.md` § Prior-campaign readings; `tenets.md` |
| 2026-10-30 | rc-g2: source terrain as of `1e82d145` | `grok` | `designs/records.md`; `designs/compaction.md`; `designs/context.md` |
| 2026-10-30 | rc-g3: reuse map, conventions, and instruments | `grok` | `designs/context.md`; `designs/measurement.md` |
| 2026-10-30 | rc-r1: compaction research | `researcher` | `research/evidence.md` § External claims |
| 2026-10-30 | rc-r2: records and memory research | `researcher` | `research/evidence.md` § External claims |
| 2026-10-30 | rc-r3: versioned-context research | `researcher` | `research/evidence.md` § External claims; § DeltaDB |
| 2026-10-30 | rc-r4: skills, memories, instructions, and authority research | `researcher` | `research/evidence.md` § External claims |
| 2026-10-30 | rc-r5: cache performance research | `researcher` | `research/evidence.md` § External claims |
| 2026-10-30 | rc-digest: evidence digest of rc-r1 to rc-r5 | `distiller` | `research/evidence.md` |
| 2026-10-30 | rc-digest verification: claims C01 to C31 re-fetched from their primary sources, one lane per claim | `researcher` | `research/evidence.md` § External claims |
| 2026-10-30 | objective-bench liveness probe: recorded dark, so the objective `analyst` lane ran on the subjective lane's engine | `analyst` | this ledger; `plan.md` § Rulings, O3 |
| 2026-10-31 | rc-d planner: blind design proposal, subjective lane | `planner` | `designs/` |
| 2026-10-31 | rc-d analyst: blind design proposal, objective lane | `analyst` | `designs/` |
| 2026-10-31 | rc-consult: read-only consultation the user named, reconciling the two proposals | `planner` | `plan.md` |
| 2026-10-31 | rc-w: draft of these records | `opus` | every file in this folder |
| 2026-10-31 | rc-c: conformance check of these records (one blocking finding, the repository URLs; one minor) | `checker` | `plan.md` § Repositories; `designs/records.md` |
| 2026-10-31 | rc-v: coverage review of these records (one blocking finding, the release cycle that a second Agent release for `ask` resolves; fifteen minor) | `reviewer` | `plan.md`; `designs/records.md`; `designs/compaction.md`; `designs/context.md`; `designs/measurement.md` |
