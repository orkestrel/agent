# Mechanisms campaign — falsify verdict, Study

The integrated audit of 2026-10-23 (`mech-falsify`), Study's share. Lanes: the objective lane on GPT-6 Astra (T3, `mech-falsify-astra-1`, `VERDICT: FAIL 6, 8, 12, 18, 20, 21`) and the subjective lane on Claude Opus 5.5 (Workflow `wf_451ecbd7-bbc`, `VERDICT: FAIL 8, 17, 18, 21`), on one claims file, blind to each other. Astra's 45 citations resolve; Opus's resolve inside Study (they are written package-relative). The subject was Study `1f33206..a80a398` and Agent `c008b50e..69c2c939` (`studies/`, `tests/`).

| Claim | Ruling | Carried into |
| --- | --- | --- |
| 8 | overstated claim, no code defect: a refusal before copying writes nothing and an occupied destination stays unchanged, but a refusal during copying (drift, a link added mid-copy) leaves an incomplete destination without `closure.json`; the guide states it | `mech-fix-study` ruling 4 |
| 12 | BROKEN (Astra; reproduced by the Orchestrator at `src/server/ollama/StudyOllamaTransport.ts:497` and `:685-694`): sidecar exhaustion leaves a sent attempt without a terminal row, because the wire is marked recorded before its append succeeds and the failure path appends the full reply | `mech-fix-study` ruling 2 |
| 17, 18 | BROKEN (both lanes; reproduced at `src/core/validators.ts:333-342`): a maintenance-only daemon model passes profile load, and `execute` then refuses at trial 1 with an interrupted result; the converse pin check is missing | `mech-fix-study` ruling 1 |
| 1, 15 (proof strength) | held, but no committed test fails if the replay stops comparing bodies inside the prefix; the command's `finally` stop is caught only by a timing-dependent cancel test (Opus) | `mech-fix-study` ruling 3 |
| cross-Node replay | settled by Opus's probe: a Node 22 replay of a Node 24 recording refuses before any worker ("Replay artifact declaration changed"); the same replay on Node 24 matches; documented as a limit | `mech-fix-study` ruling 5 |
| 19 residual | Agent's consumer evidence ran on Study `3abc31c` and Ollama `38000f9`, not the release candidates | `mech-verify` (re-pin and rerun) |
| 20 | UNRESOLVED (Astra): the full Node matrix and fresh dual-format builds | `mech-verify` |
| 2 to 5, 7, 9 to 11, 13 to 16 (Study and Ollama together) | CONFIRMED by both lanes | — |

The successor review audits the repaired claims (12, 17, 18) and the added proofs only.
