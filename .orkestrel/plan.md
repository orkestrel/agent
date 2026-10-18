# Fleet campaign: Bindings sweep, budget layers, Records grading (2026-10-17)

## Goal

Finish three workstreams the user named on 2026-10-17: the `let` sweep under the tightened Bindings rule, the
three-layer budget redesign, and the Records Grok labeling. Publish nothing. Every consumer works on fresh local
builds, pinned in its `package.json` (user, 2026-10-17: "regenerate the distributables so that you can point at them
locally in the package.json … always working on the latest distributables as you work through each package").

## Exit criterion

1. Scaffold `typescript.md` § Bindings and `architecture.md` § Middleware carry the reviewed draft 3 text, and
   scaffold, Study, budget and Agent are swept under it: census sites and verdict fix items closed, one falsify round
   passed per repository, gates green, committed locally.
2. Budget design 2 is built: U1 budget, U2 Agent's provider contract, U3 Agent's loop on D1, U4 Ollama. Falsify passed,
   gates green, committed locally.
3. The Records Grok labels are audited, imported through `study label`, reported, and compared judge-for-judge with
   the `compaction-output-2` Grok grading, with the adjudicator substitution disclosed.
4. Each consumer pins the fresh tarball of every changed package it depends on, through `tmp/units/local-pin.ts`, with
   the replaced registry range recorded in `<consumer>/tmp/tarballs/pins.json`. No version bump, no publish.

## Packages and layer order

Catalog order (`.claude/agents/orkestrel.md`): `@orkestrel/budget` L1; `@orkestrel/workflow` and `@orkestrel/middleware`
L4; `@orkestrel/agent` L5; `@orkestrel/ollama` L6. `@orkestrel/scaffold` is every package's development dependency and
stages on its own. `@orkestrel/study` is unpublished and consumes Agent, Ollama and budget; Agent consumes Study as a
development dependency.

## Units

| Unit | Repository | Depends on | Engine | State |
| --- | --- | --- | --- | --- |
| records-grok-label-import | Agent `tmp/` | Records population (complete) | Sonnet builder; Astra review | **done**: grading `69281cae…`, Records 72/312/0 (0.1875) against Compaction 56/328/0 (0.146); Sol–Grok kappa 0.82 |
| bindings-rule-3-review | text | draft 3 | Astra analyst | FAIL 2–7, 10, F1, each with a prescription |
| bindings-rule-4 | text | review | Opus planner; Astra re-audit of repaired claims | draft written; re-audit running |
| agent-round-2-plan | text | designs, census | Opus planner | written (`tmp/units/agent-round-2-plan.md`); D-1 answered "Per-runner entity" |
| scaffold-fix A, B | scaffold | design, checkpoint `499ade7ab` | Opus (A), Sonnet (B), T3 tasks | running |
| bindings-rule-3-census-{scaffold,agent,study,budget} | read-only | draft 3 | Grok (scaffold); Astra (others) | scaffold, Study, budget returned; Agent running |
| local-pin | Agent `tmp/` | none | Sonnet builder | accepted (fixture-proved; dry-run on Agent verified) |
| scaffold-fix-design | text | verdict | Opus planner | running |
| rule landing | scaffold rules | draft 4, re-audit | Orchestrator | queued |
| scaffold fix | scaffold | rule landing | Sonnet builders; falsify Astra + Opus | queued |
| Study fix 4 | Study | verdict, census, draft 4; checkpoint `42fe9ac` | Sonnet builder (T3 task); falsify Astra + Opus | running |
| budget sweep and U1 falsify | budget | census | Sonnet builder, Haiku gate; falsify Astra + Opus | falsify FAIL (re-entry, depth cap, contract, pin, wrapper); fix 2 green; Astra re-audit and Grok fleet survey running |
| Agent round 2 (D1–D9, U2, U3, census, Study restage, naming Unit B) | Agent | budget, Study, rule | Opus design check; Sonnet builders; falsify Astra + Opus | queued |
| U4 Ollama | Ollama | Agent round 2 | Sonnet builder; Astra review | queued |
| Study naming Unit A | Study | Study fix | Sonnet builder | queued |

Staging follows each accepted unit: scaffold into budget, Study, Agent and Ollama; budget into Agent, Study and Ollama;
Agent into Study and Ollama (and itself through Ollama, by override); Ollama into Agent and Study; Study into Agent.

## Routing

The user's 2026-10-17 instruction makes Claude, Codex and Cursor available and asks for full use of Astra (Codex) and
Grok 4.7 (Cursor). Lanes follow `.agents/orchestration.md` § Engines and § Routing: Astra holds the objective lanes
(analyst, correctness audit, falsify objective lane), Opus the subjective lanes, Sonnet builds, Haiku gates, and Grok
broad mapping and labeling. Grok never takes a design or review lane. Benches were probed live on 2026-10-17: Codex
`gpt-6-astra` session `01a14cd6-e19f-7681-95ac-1b923f7d6c0e`, Cursor `grok-4.7-xhigh` session
`2e8af759-282c-4b87-9904-5ff0ab471c80`, and a native Haiku scout.
