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
| bindings-rule-4 | text | review | Opus planner; Astra re-audit of repaired claims | **landed** in scaffold `typescript.md` § Bindings and `architecture.md` § Middleware (re-audit: claims 1–4 confirmed; claim 5 census controls pinned in the draft) |
| scaffold-fix verify | scaffold | A, B, B2, rule landing | Haiku verifier | running (`wf_23c86f09-0a5`) |
| agent-round-2-plan | text | designs, census | Opus planner | written (`tmp/units/agent-round-2-plan.md`); D-1 answered "Per-runner entity" |
| scaffold-fix A, B, B2, B3 | scaffold | design, checkpoint `499ade7ab` | Opus (A), Sonnet (B, B2, B3), T3 tasks | done; checkpoint `615ae1b72`; falsify round 3 FAIL 1, 2b, 4–8 plus S1 (verdict `.orkestrel/scaffold/scaffold-fix-audit-verdict.md`) |
| scaffold-fix C, C-instruments | scaffold | round 3 verdict | Sonnet builders (T3 tasks), disjoint files | C done and integrated; C-instruments running; then instruments re-run, Haiku gate, a one-lane review of C's departures, commit |
| scaffold-local-pins | scaffold | fix chain committed | Opus (T3 task) | queued (`tmp/units/scaffold-local-pins-brief.md`): the user-endorsed `pins.json` ledger convention written into `orkestrel-publish` `release.md`/`wave.md`, and `local-pin.ts` ported as a vendored skill script; then build, pin and `scaffold repair --offline` into the fleet (restore pins, stage, repair, re-pin) |
| bindings-rule-3-census-{scaffold,agent,study,budget} | read-only | draft 3 | Grok (scaffold); Astra (others) | scaffold, Study, budget returned; Agent running |
| local-pin | Agent `tmp/` | none | Sonnet builder | accepted (fixture-proved; dry-run on Agent verified) |
| local-pin-absolute | Agent `tmp/` | local-pin | Sonnet builder (T3 task) | **accepted** (fixture-proved): absolute `file:` specs, so `test:distribution` runs under pins; re-pin Agent after its falsify lanes, then Study and Ollama |
| scaffold-fix-design | text | verdict | Opus planner | running |
| rule landing | scaffold rules | draft 4, re-audit | Orchestrator | queued |
| scaffold fix | scaffold | rule landing | Sonnet builders; falsify Astra + Opus | queued |
| Study fix 4 and 5 | Study | verdict, census, draft 4; checkpoint `42fe9ac` | Sonnet builders (T3 tasks); falsify Astra + Opus | **accepted**, commit `a8e9443` (fix 5 adopted the prescriptions; mutation-proved); Study pinned to budget `4d74195` |
| budget sweep and U1 falsify | budget | census | Sonnet builder, Haiku gate; falsify Astra + Opus | **accepted**, commit `4d74195` (fix 3 adopted Astra's prescription; fleet survey confirms claim 5); pin into Agent after unit H |
| Agent round 2 (D1–D10, U2, U3, census, Study restage, naming Unit B; plan `tmp/units/agent-round-2-plan.md`) | Agent | budget, Study, rule | waves 1–4 (T, P, C; A, H; K, L, ST, SM; D); falsify Astra + Opus | checkpoint `9136fd9`; waves 1–4 integrated; gates green (`tmp/units/agent-r2-verify.md`: src:core 1549, setup 168, guides 143, studies 100, distribution 9 under absolute pins); census ruled (`tmp/units/agent-r2-verify.md`); falsify round FAIL 1, 2, 4, 9, 12 plus O1/S1, S2 (verdict `.orkestrel/agent/agent-r2-audit-verdict.md`, every finding reproduced); checkpoint `0192ced`; pins absolute (`test:distribution` 9/9); fix round wave 1 (FA, FH, FL, FT) running, then FD, gates, a one-lane successor review, commit |
| U4 Ollama | Ollama | Agent round 2 | Sonnet builder; Astra review | queued |
| Study naming Unit A | Study | Study fix | Sonnet builder (T3 task) | **accepted**, commit `983dba7` (rulings: `buildCustodyPacketLabeling` added to row 10's family; `StudyProcessOptions` kept); built, ready to restage into Agent after K and L |

Staging follows each accepted unit: scaffold into budget, Study, Agent and Ollama; budget into Agent, Study and Ollama;
Agent into Study and Ollama (and itself through Ollama, by override); Ollama into Agent and Study; Study into Agent.

## Routing

The user's 2026-10-17 instruction makes Claude, Codex and Cursor available and asks for full use of Astra (Codex) and
Grok 4.7 (Cursor). Lanes follow `.agents/orchestration.md` § Engines and § Routing: Astra holds the objective lanes
(analyst, correctness audit, falsify objective lane), Opus the subjective lanes, Sonnet builds, Haiku gates, and Grok
broad mapping and labeling. Grok never takes a design or review lane. Benches were probed live on 2026-10-17: Codex
`gpt-6-astra` session `01a14cd6-e19f-7681-95ac-1b923f7d6c0e`, Cursor `grok-4.7-xhigh` session
`2e8af759-282c-4b87-9904-5ff0ab471c80`, and a native Haiku scout.
