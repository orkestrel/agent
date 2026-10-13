# Correct the single-token judge length classification

The accepted predicate is implemented verbatim inside the existing matrix request-outcome length exception. The real aggregate development regression reached the intended red before the production change, then passed after it. Source/build custody is released to root and the independent verifier. No builder source edit, build, or test follows that release. No model or daemon calls were made.

## Read the exact change

The only production change adds this branch within the existing length exception in `bench5/matrix/helpers.ts`. Existing truncation, usage, HTTP/transport, capacity, completion and whole-run guards remain in their owners.

```ts
(request.role === 'judge' &&
	request.request.raw === true &&
	request.request.stream === false &&
	request.request.logprobs === true &&
	request.request.top_logprobs === 20 &&
	isRecord(options) &&
	options.num_predict === 1 &&
	options.temperature === 1 &&
	reading.completion === 1) ||
```

The prepared tests were applied separately before that branch. MatrixPeer defaults remain unchanged, with an optional response override defaulting to `undefined` and falling back through `?? winner`. The positive response override is `No`, independent of the candidate probabilities the real judge reads. Real reader/cache controls retain malformed and duplicate logprob errors and missing-label refusals without accepted answer rows. Existing calibration, flush and judge transport tests remain intact.

The fixture emits `Fixture answer.` for ordinary agent replies. Those replies lack the scenario's required atoms, so the successful execution records `development-failed-goals`. The positive regression retains that exact status, requires a row with a missing expected atom, and explicitly requires no request error/parser-stop, no row error/partial stop, and zero recorded row faults. This status does not claim semantic goal success.

## Read the reached red and green

The isolated selector is `continues real aggregate development after a fresh single-token length-terminated judge answer`. Its deciding assertion remains `length-terminated fresh judge must complete and work must continue`.

- `red-2`: canonical build exit 0, 4208 ms; isolated regression collected 1/pass 0/fail 1, exit 1, 3235 ms. The deciding assertion compared expected 0 with an actual `harness fault: the judge failed 3 times` whose cause is `development integrity failure at request 3`.
- Retained red fixture: `aggregate-l11-judge-length-fix-fixtures/development-PD976d`. Request 3 was sent HTTP200, raw length termination, completion 1 and failures `[]`; requests 4 and 5 were explicitly unsent, null-bodied followers retaining that integrity error.
- `green-3`: isolated positive collected 1/pass 1/fail 0, exit 0, 7721 ms; full development file collected 5/pass 5/fail 0, exit 0, 59660 ms; capacity collected 6/pass 6/fail 0, exit 0, 443 ms. Real-reader, transport, calibration, flush and parser-stop controls passed. The complete bare stdout/stderr and command arrays are retained.
- Root requested explicit fault/status provenance assertions after green-3 closed. `green-4` reran scoped gates/build and the isolated positive only: collected 1/pass 1/fail 0, exit 0, 7579 ms. Its retained fixture is `aggregate-l11-judge-length-fix-fixtures/development-sMhHfL`. The test checked exact wire protocol, raw length response with `No`, decoded completion 1, successful Driver result 0, classifier completion, a subsequent sent request and a persisted fresh successful real judge answer before checking the ordinary failed-goal provenance.

The initial red launcher stopped before collection because the authored real-reader constructor omitted required `OllamaJudgeOptions.system` (TS2345). Adding existing `MICA_SYSTEM` repaired the fixture construction. Initial green-2 reached all load-bearing positive assertions but failed the authored status expectation `development-complete`; its actual status was `development-failed-goals`. Root accepted the exact fixture status with ordinary mismatch/fault provenance. Both ancillary failures, original runner bytes and logs are preserved; neither changed the production predicate or mechanism.

## Read scoped commands and durations

Every launched chain used `node .agents/skills/orkestrel-dispatch/scripts/launch.ts`, `--cap 600 --status` before `--`, and a distinct journal/errors pair. Phase runners spawn each command without a shell and preserve complete stdout/stderr plus command arguments, PID, exit and duration in stage JSON files. Runner files were never edited after launch.

Final `green-4` stages all exited 0:

| Stage | Command arguments after node | Duration ms |
| --- | --- | --- |
| Scoped formatting | `node_modules/oxfmt/bin/oxfmt --config .oxfmtrc.json --ignore-path <owned-ignore> <four-owned-files>` | 99 |
| Harness TypeScript | `node_modules/typescript/bin/tsc --noEmit --project .orkestrel/agent/instruments/harness/build.json --typeRoots node_modules/@types` | 2952 |
| Scoped lint | `node_modules/oxlint/bin/oxlint --config <owned-lint> --no-ignore --deny-warnings <four-owned-files>` | 247 |
| Format check | Scoped formatting command with `--check` | 70 |
| Canonical build | `.orkestrel/agent/instruments/harness/tools/build.ts --compiler node_modules/typescript/bin/tsc --types node_modules/@types` | 4265 |
| Isolated positive | `--test --test-name-pattern=<exact-selector> .orkestrel/agent/instruments/harness/.build/bench5/tests/development.test.js` | 7579 |

The build emitted 622 files from 493 exact inputs. No tree-wide gate ran. Temporary native scripts were strictly checked with `tsc --ignoreConfig --strict --noEmit --target es2023 --module nodenext --skipLibCheck --types node --typeRoots node_modules/@types`, exit 0. Complete executable arguments for every stage are in the corresponding `<phase>-<successor>-logs/*.json` artifacts.

## Bind final source and build custody

The exact original before hashes remain in `aggregate-l11-judge-length-fix-before-hashes.json`. The final actual source hashes and build identity are in `aggregate-l11-judge-length-fix-custody.json`; the scoped actual diff and complete status are its `-diff.txt` and `-status.txt` siblings. The diff includes earlier pending edits in the owned files; the production helper delta for this unit is only the preceding branch.

| Owned source under bench5 | Before SHA-256 | Final SHA-256 |
| --- | --- | --- |
| matrix/helpers.ts | `93780d9d39d2f5fc8e72273c50f4e72b19eae8928cec84664c947a0a05f34565` | `5a5ed636bfbe7947b10937861fcaacc775ce99d454a8e86518d9bf4d36503ec6` |
| matrix/tests/capacity.test.ts | `36932ed08139292c6eebce716df8f917d754e0af52afd9b0bc3792d560cd3e8a` | `9912c44e299feeed5f6eea65fb54c62cff073edbf56200b00132898e890bc9e0` |
| tests/development.test.ts | `bcfe1a995e25504952ac2bec76897f3c772b21fc8d9e7af47d8a89071f6e7146` | `cdea7df9afb79073853badcca18c6aa7d5551fff6390fbc81583c48528d0ea03` |
| tests/matrixFixture.ts | `ca56aa22cde7a369611146121c2877bc17d46d9bc760dde035cd47ad13bfc627` | `04683a2e4b48939ad9398e0658de0e08b93d4d4605430902fd8530226c3cd494` |

Final canonical `.build/build-manifest.json` SHA-256: `da4a2f8be82aeb0bacc83dfc5729f8617fdd00f0fb75fe34ee7cdd5da9d9cfc0`. The custody script confirmed that the exact predicate in the anchor artifact occurs uniquely in the actual helper. Independent verification removes only that predicate, preserving imports and collection.

Launcher exits were uncapped: initial red 1/3138 ms; red-2 0/7541 ms (the regression exit 1 was expected); green-2 1/15386 ms; green-3 0/75500 ms; green-4 0/15304 ms. All recorded launcher/stage PIDs and their immediate descendant associations were queried after terminal completion; no live row remained. Checked IDs: 29588, 72288, 69196, 16788, 37404, 40536, 24632, 65912, 74636, 27884, 56696, 76496, 38040, 65436, 59632, 18436, 69268, 75756, 4432, 71076, 20076, 46196, 64256, 17180, 4444, 46948, 57376 and 52124.

Source/build release was sent to root immediately after custody/process closure, before this report update. Independent verifier owns mutation, restoration, and the final full touched-file pass. No production deviation, unowned source edit, dependency/worktree change, runtime/product repeat, quality claim or model call was performed.

## Retain the preparation record

The following paragraphs record the preparation state before root's release; the execution outcome and final identities precede them. During preparation, no source/build edit, build, test, daemon access, service call, or model call was executed. The source application script checked all actual owned bytes before either patch was applied and stops on drift.

The preparation reads the checked brief, accepted independent diagnosis, canonical contracts and mapped rules, dispatch skill and launch reference, harness guide, existing classifier, Driver/cache boundaries, vendored judge constructor/body/reader, and existing fixtures/tests. There is no prescription departure or unowned change.

## Review the prepared patches

The separate patches contain exact before/after source bytes and each original SHA-256 identity:

- `aggregate-l11-judge-length-fix-tests.patch.json` changes only the owned MatrixPeer, development test, and capacity test.
- `aggregate-l11-judge-length-fix-production.patch.json` adds only the accepted judge predicate inside the existing length exception in matrix/helpers.ts.
- The `*.candidate.ts` artifacts show complete proposed files without changing the live files.
- `aggregate-l11-judge-length-fix-anchor.json` records the predicate, focused selector, and deciding failure assertion. Independent Luna owns its deliberate removal.

The positive test uses a real Matrix freeze, empty seed, fresh aggregate development cache, real Driver/JudgeCache/vendored judge, and the ephemeral local MatrixPeer. It records exact protocol flags, raw length termination, completion 1, successful Driver completion, a persisted fresh answer, and a subsequently sent request. Its response override is the plausible single token `No`; semantics remain in the real reader. The prepared optional fixture response defaults to `undefined` and falls back through `?? winner`.

The direct classifier test covers absent/incorrect protocol markers, prediction/temperature controls, HTTP/error/unsent evidence, malformed/incomplete/missing usage, truncation, context boundary, completion 0 or above 1, and chat-shaped/summarizer requests. A separate real judge/cache test retains malformed and duplicate logprob protocol errors and a missing-label refusal, with no accepted answer row for those controls. Existing flush, calibration, and judge transport tests remain in place. Fixture defaults remain stop termination with existing valid candidates.

## Record actual source identities

The snapshot was taken before preparation by the native TypeScript snapshot script and saved in `aggregate-l11-judge-length-fix-before-hashes.json`.

| Owned source under bench5 | Actual SHA-256 |
| --- | --- |
| matrix/helpers.ts | `93780d9d39d2f5fc8e72273c50f4e72b19eae8928cec84664c947a0a05f34565` |
| matrix/tests/capacity.test.ts | `36932ed08139292c6eebce716df8f917d754e0af52afd9b0bc3792d560cd3e8a` |
| tests/development.test.ts | `bcfe1a995e25504952ac2bec76897f3c772b21fc8d9e7af47d8a89071f6e7146` |
| tests/matrixFixture.ts | `ca56aa22cde7a369611146121c2877bc17d46d9bc760dde035cd47ad13bfc627` |

## Execute only after release

The prepared application script is `aggregate-l11-judge-length-fix-apply.ts`. The bounded runner is `aggregate-l11-judge-length-fix-run.ts`, with distinct immutable red and green logs and a dispatch cap of 600 seconds, based on the brief's prior development duration 53426 ms and build duration 4224 ms plus gate/proof allowance. Neither application nor runner was executed during preparation; scripts and candidate bytes are not yet statically checked.

After explicit release, strictly check the temporary scripts, apply the tests patch only, and launch the runner with phase `red`. It builds the canonical consumed graph and runs only the positive selector, requiring build exit 0 and regression exit 1. Read bare output and confirm failure at `length-terminated fresh judge must complete and work must continue` with retained development integrity error and unsent followers before proceeding.

Then apply the separate production predicate and launch phase `green`. It runs scoped formatting, harness TypeScript, scoped strict lint, format check, canonical build, the same focused selector, and full touched development/capacity files. Record commands, counts, exits, durations, hashes, actual diff/status, build identity, and process closure, then explicitly release source/build for the independent mutation control. Stop on drift or a failure requiring another mechanism.

The launch shape is:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-l11-judge-length-fix-red.jsonl --errors tmp/units/aggregate-l11-judge-length-fix-red.err --cap 600 -- node tmp/units/aggregate-l11-judge-length-fix-run.ts red
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-l11-judge-length-fix-green.jsonl --errors tmp/units/aggregate-l11-judge-length-fix-green.err --cap 600 -- node tmp/units/aggregate-l11-judge-length-fix-run.ts green
```

No preparation process remains running. Full-view source/build custody stays with root.
