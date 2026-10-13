# Sustained transport and preparation fixes

Both focused Driver retry regressions failed at the prescribed sent-attempt assertion before correction and passed after correction. The retained preparation report rejects the original cross-contract comparison, passes the exact partition comparisons, and rejects omitted or duplicated controls. Source/build custody is released for independent verification.

## Exact changes and preservation

The owned checkout diff and status are `aggregate-sustained-transport-fix-diff.txt` and `aggregate-sustained-transport-fix-status.txt`. The before byte hashes are in `aggregate-sustained-transport-fix-before-hashes.json`; the released source/build/runner hashes and unchanged-neighbor checks are in `aggregate-sustained-transport-fix-custody.json`.

- `bench5/Driver.ts` derives the accepted local `transport` boolean from judge role, actual send, and thrown transport error or non-2xx status. Its negation applies only to the study noncomplete-outcome term and the matrix-development noncomplete-outcome term. Independent agent rejection, unsent rejection, pre-send call/token/wall checks, token/wall stop terms, raw observations, missing usage, and invalidity recording remain unchanged. JudgeCache and frozen retry settings remain unchanged.
- `bench5/tests/matrixFixture.ts` adds only the finite judge `faults` countdown and its HTTP-500 response branch inside `/api/generate`. Earlier agent, support, parser, and flush controls remain.
- `bench5/tests/development.test.ts` adds a separate focused aggregate-arm Driver proof with authentic freeze/policy, fresh manifested execution/output/cache, transient and exhaustion controls, exact sent counts, missing usage, and operational feasibility rejection. Existing development and flush assertions remain.
- `bench5/sustained/tests/transport.test.ts` adds the focused filing proof before the long trajectory test. It uses only authentic deployment/freeze/resource and safe runtime prerequisites, then tests transient recovery, exact exhaustion, operational filing/preparation rejection, missing-usage charging, and an actual study call limit. The original long transport test and all its assertions remain.
- `bench5/sustained/tests/preparation.test.ts` adopts the prescribed trajectory-only `wire` comparison and complete calibration comparison from `controls`. Both alias orderings, generation identity, total expenditure, generation/diagnosis equality, and later candidate/report assertions remain.

There is no departure from either production prescription. Routine authored-test corrections renamed shadowing callback bindings and aligned the call-limit CLI regex to the actual `e1 integrity/resource failure at request` stop. The retained limit requests still must show exactly one sent HTTP failure, an unsent null retry with `whole-trajectory limit reached`, no excess Driver sends, and a willing real peer. The manual follow-up loopback request returns HTTP 200 after the Driver limit assertions.

## Reached before and after proofs

The same focused commands ran before and after the Driver correction:

```text
node --test --test-name-pattern="retries sent judge transport in real matrix development without admitting missing usage" .orkestrel/agent/instruments/harness/.build/bench5/tests/development.test.js
node --test --test-name-pattern="retries sent filing judge transport within frozen attempts and preserves the study call limit" .orkestrel/agent/instruments/harness/.build/bench5/sustained/tests/transport.test.js
```

The exact argument arrays and full bare stdout/stderr are in the unit's `before-logs`, `after-2-logs`, and `after-3-logs` directories.

| Proof | Before | After | Child durations |
| --- | --- | --- | --- |
| Matrix development | Collected 1, passed 0, failed 1; exit 1; actual sent 1 versus expected 2 at `matrix development must send every budget-permitted judge retry` | Collected 1, passed 1, failed 0; exit 0 | 5518 ms before; 11158 ms after |
| Sustained filing | Collected 1, passed 0, failed 1; exit 1; actual sent 1 versus expected 2 at `filing must send every budget-permitted judge retry` | Collected 1, passed 1, failed 0; exit 0 | 15267 ms before; 35962 ms after |

Each green proof confirms the same-prompt transient sends twice and recovers with HTTP 200. Exhaustion sends the original attempt plus the frozen retries, with every grouped wire attempt sent when budget permits, no extra attempts, no fabricated failed-request usage, and complete retained missing-usage charges. Matrix development remains operationally inadmissible after recovery. Filing remains exit 1 and preparation rejects its authentic operational classification after recovery and exhaustion.

The filing call-limit proof sets only the fresh execution's call limit to 1. The first judge request reaches HTTP 500. The next retry is unsent with a null body and the whole-trajectory limit reason. The peer's finite fault countdown is exhausted and an actual standalone follow-up exchange succeeds, proving the peer could answer while Driver refused another send.

The authentic green fixture roots are `tmp/units/aggregate-sustained-transport-fix-fixtures/development-rRgoOX` and `tmp/units/aggregate-sustained-transport-fix-fixtures/filing-SrL5g4`. Earlier failed fixture evidence remains intact. The original retained trajectory failure from the accepted analyst report remains the longer baseline; this unit did not repeat it.

## Offline preparation exercise

`aggregate-sustained-transport-fix-costs.ts` reads the retained `tmp/units/aggregate-preparation-fixtures/proof-sE7g4b/q4/alias-matrix-costs-0.json` and transcribes the complete expected array printed at the verifier-6 failure. It verifies the original deep equality throws, exact trajectory/calibration partitions pass, empty controls throw, and duplicated nonempty controls throw. The report's retained byte hash remains unchanged. Results and the expected measured array are recorded in `aggregate-sustained-transport-fix-costs-result.json`.

This exercise runs no generation, model, private-oracle read, or retained-artifact mutation. The complete preparation test remains for verifier.

## Scoped checks and command custody

Every unit TypeScript runner was strict-typechecked with `node node_modules/typescript/bin/tsc --ignoreConfig --strict --noEmit --target es2023 --module nodenext --skipLibCheck --types node --typeRoots node_modules/@types <runner files>` before its proof use. The first standalone compiler invocation reported TS5112 because the installed compiler requires `--ignoreConfig` when file arguments coexist with a workspace config; the corrected invocation passed. Executed runners and their hashes remain in the custody artifact.

The final scoped chain ran these commands on Windows, with the owned file arguments shown verbatim in each stage JSON:

| Stage | Command | Exit | Duration |
| --- | --- | ---: | ---: |
| Scoped format convergence | `node node_modules/oxfmt/bin/oxfmt --config .oxfmtrc.json --ignore-path tmp/units/aggregate-sustained-transport-fix-ignore.txt <owned files>` | 0 | 109 ms |
| Harness typecheck | `node node_modules/typescript/bin/tsc --noEmit --project .orkestrel/agent/instruments/harness/build.json --typeRoots node_modules/@types` | 0 | 4438 ms |
| Scoped lint | `node node_modules/oxlint/bin/oxlint --config tmp/units/aggregate-sustained-transport-fix-lint.json --no-ignore --deny-warnings <owned files>` | 0 | 312 ms |
| Scoped format check | `node node_modules/oxfmt/bin/oxfmt --config .oxfmtrc.json --ignore-path tmp/units/aggregate-sustained-transport-fix-ignore.txt --check <owned files>` | 0 | 103 ms |
| Resource-bound build | `node .orkestrel/agent/instruments/harness/tools/build.ts --compiler node_modules/typescript/bin/tsc --types node_modules/@types --resource tmp/units/aggregate-runtime-workload-audit-2/manifest.json` | 0 | 7475 ms |
| Focused filing | The exact filing command preceding this table | 0 | 35962 ms |

`<owned files>` is exactly Driver, MatrixPeer fixture, development test, transport test, and preparation test at the paths named in the changes section. The lint configuration copies repository rules and the same policy plugin, removing only the campaign-directory ignore. No rule is disabled. The baseline build passed in 5988 ms; the earlier after-2 scoped checks/build also passed before the authored call-limit regex mismatch. The matrix-development green ran on that after-2 build and was not repeated for the transport-only expectation correction.

All long chains used the dispatch launcher with cap 900 seconds and preserved separate executed runners/logs. The final chain was:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-sustained-transport-fix-after-3.jsonl --errors tmp/units/aggregate-sustained-transport-fix-after-3.err --cap 900 -- node tmp/units/aggregate-sustained-transport-fix-after-3.ts
```

The before chain completed expected red proofs with launcher exit 0, uncapped, in 26893 ms. The final after-3 chain completed with exit 0, uncapped, in 48553 ms. Earlier after chains retain their scoped lint warning and authored CLI-regex mismatch evidence; no distinct product defect was inferred or repaired from those test-authoring errors.

## Released hashes and mutation anchors

The released SHA-256 hashes are:

| Harness path | SHA-256 |
| --- | --- |
| `bench5/Driver.ts` | `23a49fd19926270fa6038a842f645e1b0affb23fa674f2ec7724f8ef7a1a3792` |
| `bench5/tests/matrixFixture.ts` | `ca56aa22cde7a369611146121c2877bc17d46d9bc760dde035cd47ad13bfc627` |
| `bench5/tests/development.test.ts` | `bcfe1a995e25504952ac2bec76897f3c772b21fc8d9e7af47d8a89071f6e7146` |
| `bench5/sustained/tests/transport.test.ts` | `0fec10d00bb3f07d5f85c474d59d6eb8b8c80be75ff4db6a2e790a8321a7c164` |
| `bench5/sustained/tests/preparation.test.ts` | `dc68b1d754a8c67300bbff52ee04b97a33797c5f1d74691d5371856ed692de8d` |
| `.build/build-manifest.json` | `56b857db54ef677c9b1f769e8a0509ecd4c5616d09809060fe8ad242a9d9e021` |

The build binds the existing fixture resource manifest exactly once. Peer, Peer direct proof, isolated refusal, sustained runtime, matrix outcome helper, and capacity test hashes match the pre-edit custody artifact. The off-limits user bench4 edit and misplaced cache received no action from this unit.

`aggregate-sustained-transport-fix-anchors.json` contains exact original spans, exact independent replacements, selectors, and required assertion strings. Each original span was checked to occur once. The study mutation removes only `!transport &&` from its noncomplete outcome term. The development mutation removes only that term inside the development qualification branch. These separate mutations remain for the independent verifier.

## Process closure and remaining verification

The final process query returned no row for recorded launch/stage PIDs or their children. Recorded before PIDs were 27836, 62748, 31424, and 47160; first-after PIDs were 69380, 73840, 53852, and 67776; after-2 PIDs were 74652, 50476, 35744, 62828, 61404, 39664, 2636, and 4100; final PIDs were 35660, 22404, 76060, 66556, 74704, 69580, and 16832. All runner completion events are retained. Root received explicit source/build release after closure and custody recording. This unit performs no further source/build changes or tests.

Verifier owns independent guard mutations, complete transport/development/preparation test files, isolated refusal preservation controls, any pending restored capacity proof, and final canonical build. The accepted sustained runtime/products evidence remains; neither was repeated. No external inference, private-oracle read, package change, Git mutation, broad formatting, or cleanup ran. Fixture results establish integration and cost-accounting behavior only.
