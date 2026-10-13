# Records port plan (reconciled 2026-10-09)

The plan reconciles two blind designs on one brief (`tmp/units/records-port-brief.md`): the `planner` lane on Opus 5.5 (`tmp/units/records-port-planner.md`) and the `analyst` lane on GPT-6 Astra (`tmp/codex/records-port-last.md`, session `01a12049-5172-71e0-833d-81517acdb0a9`). Where the lanes agree, the plan takes the shared ruling; each disagreement carries a ruling and its reason.

## Shape

- One module, `src/core/ledgers/`, exported through `src/core/index.ts`. The stateful entity is `Ledger`, built by `createLedger(provider, options)`, the package's factory idiom (`createAgent`, `createSelection`).
- The verb is `respond(content, signal?)`. `execute` is fixed lifecycle vocabulary (`../scaffold/.claude/rules/names.md` § Fixed lifecycle vocabulary).
- A ledger owns one conversation, one agent, and one tool registry: the application's lookups behind a repeat stop, plus `recall`. It runs one answer pass when the first pass ends without final text and the caller did not abort.
- The judge is injected. The ledger never constructs Mica.
- The briefing travels in an additive `Selection.briefing` member, which `AgentContext.build` appends as the last system part. A scope's instruction allow-list never drops it, and the `select` event carries it. The measured carrier was an instruction with an empty header, so the replay normalizes the separator.

## Rulings on the tensions

| Tension | Ruling | Reason |
| --- | --- | --- |
| Handles (T1) | Removed from every model-facing text: briefing lines, recall results, the answer digest, and the tool descriptions. | Both lanes agree. A reply cited `r8` (`a5-records-v2` g05), and 0 of 60 a5 recalls named a handle. |
| Briefing carrier (T2) | `Selection.briefing`, additive. | It makes the receipt complete and observable, and no allow-list can drop it. The replay normalization covers the byte change. |
| Who owns the agent (T3) | The ledger. | The measured invariants hold only under one wiring: the stable cache, the repeat abort, the answer scope, and the gauge events. |
| Person prefix (T4) | Kept as measured, with a test that pins the known false case. | The prefix line carries the Sigrid callback (8 of 8 against 1 and 3 of 8) and the depot release gains. Astra's antecedent grouping is unmeasured, so it waits for a measured arm. |
| Desk-wide correction scope (T5, R9) | Documented limit. | The fix revives the "15 percent" token for other owners (`tmp/bench/results/v9/RECORDS-PLAN.md:54`). The measured behavior stands. |
| Judge wording (T6) | The questions and criteria are an option. The measured wording ships as an exported, documented constant that the desk passes unchanged. The thresholds are required, with no default. | The package supplies the mechanism and the application supplies the policy (`../scaffold/AGENTS.md:67`). The thresholds were fitted on that exact wording. |
| `window` key (T7) | U2 names the token-window option so that it cannot be read as `AgentOptions.window`, a `Budget`, following `names.md`. | One term per concept. |
| Desk questions (T8) | U10 settles them. | The desk has no lookups and uncalibrated thresholds. |
| Calibration (T9) | `gauge` is an option; `calibrate(signal)` measures it when it is absent. | The harness measured the scale once per seed. |
| Seed boundary, retirement (T10, T11) | Documented. | Both are unmeasured on interleaved or long threads. |
| Trim bar (T12) | The U9 trim gate reads `> -1`, the attack's ruling. | `band.ts` prints `>= -1`, so U9 reads the bound itself. |
| Snapshot and restore | Out of the first release. | The first consumer, the desk, holds ledgers in process (`../scaffold/AGENTS.md:65`). Astra's warning stands for a later release: a `ConversationSnapshot` alone loses request boundaries and failure receipts. |
| Over-window admission refusal | Out of the first release; documented. | The daemon refuses an over-window prompt (`exceed_context_size_error`), and the gauge reserves the answer room. |

## Defects fixed by the port

Both lanes rule each of these fixed:

- F3: a repeated call id hides the repeat.
- F4a: the answer pass keeps the seed's tool calls.
- F4b: nested recall leads survive the digest; with no leads, the fix is by construction.
- F5: a timeout or transport error skips the answer pass, except on a caller abort.
- F6: joined handles are not split; with no handles, the fix is by construction.
- F8: the category prices the recall.
- R2a: stale raw lines reach unscoped requests.
- R2b: a corrected correction revives the old value.
- R5a: an empty successor leaves the old result live.
- R8: argument key order changes identity; the key becomes canonical at every depth.
- The `#index` length cache.
- The scenario literals at `tmp/bench3/bench.mjs:774`, `:842`, and `:1369`.
- R6, the tight-budget stub: the stub reads the projected briefing.

## Units

Every unit runs serially in the worktree `/home/user/agent-port`, one writer at a time. No unit runs `npm run build` before U9, and none touches `/home/user/agent/dist`, which the live harnesses import. A `verifier` on Haiku 5.5 runs each unit's gates.

| Unit | Engine | Owns | Depends on |
| --- | --- | --- | --- |
| U1 `selection-briefing` | `builder` on Sonnet 5.5 | `src/core/contexts/types.ts`, `src/core/contexts/AgentContext.ts`, their tests | none |
| U2 `ledger-types` | `opus` on Opus 5.5 | `src/core/ledgers/types.ts`, `constants.ts`, `errors.ts` | U1 |
| U3 `ledger-helpers` | `builder` on Sonnet 5.5 | `src/core/ledgers/helpers.ts`, `tests/src/core/ledgers/helpers.test.ts`, `tests/setupLedger.ts`, `tests/setupLedger.test.ts` | U2 |
| U4 `ledger-classifier` | `astra` on GPT-6 Astra | `src/core/ledgers/Classifier.ts` and its test | U3 |
| U5 `ledger-gauge` | `builder` on Sonnet 5.5 | `src/core/ledgers/Gauge.ts` and its test | U3 |
| U6 `ledger-entity` | `astra` on GPT-6 Astra | `src/core/ledgers/Ledger.ts`, `factories.ts`, `index.ts`, `src/core/index.ts`, their tests | U4, U5 |
| U7 `ledger-guide` | `opus` on Opus 5.5 | `guides/agent.md`, `tests/guides.test.ts` | U6 |
| U8 `ledger-replay` | `builder` on Sonnet 5.5 | `tmp/probes/ledger-replay.test.ts` | U6 |
| U9 `ledger-series` | `builder` on Sonnet 5.5, with `verifier` reading the band | `tmp/bench4/` | U8; the final check finished |
| Publish | the `orkestrel-publish` skill | the version and the release | U9 |
| Sweep | the Orchestrator | `../scaffold/.orkestrel/agent/` | the publish |
| U10 `desk-ledger` | `builder` on Sonnet 5.5 | the desk sites in `records-port-planner.md` section 6 | the sweep |

The units take the gates of `records-port-planner.md` section 5, with the rulings of this plan in place of its tensions.

## Exit criterion

The integrated port passes the tree-wide gates once (`verifier`) and one `orkestrel-falsify` round. The U8 replay matches every recorded agent and judge body after the listed normalizations, with a failing control. The U9 series holds the band: against `a4-refined` the fix bar clears, and against `a5-records` the trim bar clears.
