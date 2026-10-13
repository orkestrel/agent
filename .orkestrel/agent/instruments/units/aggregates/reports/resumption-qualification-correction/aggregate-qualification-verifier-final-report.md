# Aggregate qualification verifier: accepted successor gate evidence

The `-3` successor sequence passed every released gate. The baseline report remains the separate accepted predecessor evidence [baseline](tmp/units/aggregate-qualification-verifier-baseline-report.md:1); the prior lint and formatter stops remain preserved [first successor stop](tmp/units/aggregate-qualification-verifier-successor-report.md:1), [second successor stop](tmp/units/aggregate-qualification-verifier-successor-2-report.md:1). No gate was repeated after passing, and no source, service, or model operation was performed by this verifier.

All commands below ran from `C:/Users/mikes/WebstormProjects/scaffold`, each through the dispatch launcher with its fresh `successor-3` journal, error file, and before/after status captures. Static/build commands were:

```text
node node_modules/typescript/bin/tsc --noEmit --project .orkestrel/agent/instruments/harness/build.json --typeRoots node_modules/@types
node node_modules/oxfmt/bin/oxfmt --config .oxfmtrc.json --ignore-path tmp/units/aggregate-final-qualification-repair-empty.ignore --check .orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts .orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts .orkestrel/agent/instruments/harness/bench5/aggregates/helpers.ts .orkestrel/agent/instruments/harness/bench5/tests/aggregates.test.ts .orkestrel/agent/instruments/harness/bench5/tests/matrix.test.ts .orkestrel/agent/instruments/harness/bench5/tests/development.test.ts .orkestrel/agent/instruments/harness/bench5/tests/sustained/audit/Comparison.test.ts
node node_modules/oxlint/bin/oxlint --config tmp/units/aggregate-integration-verifier-scoped-lint-1.json --no-ignore --disable-nested-config --deny-warnings .orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts .orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts .orkestrel/agent/instruments/harness/bench5/aggregates/helpers.ts .orkestrel/agent/instruments/harness/bench5/tests/aggregates.test.ts .orkestrel/agent/instruments/harness/bench5/tests/matrix.test.ts .orkestrel/agent/instruments/harness/bench5/tests/development.test.ts .orkestrel/agent/instruments/harness/bench5/tests/sustained/audit/Comparison.test.ts
node .orkestrel/agent/instruments/harness/tools/build.ts --compiler node_modules/typescript/bin/tsc --types node_modules/@types
```

Each touched file ran once in full, in this order:

```text
node --test .orkestrel/agent/instruments/harness/.build/bench5/tests/aggregates.test.js
node --test .orkestrel/agent/instruments/harness/.build/bench5/tests/matrix.test.js
node --test .orkestrel/agent/instruments/harness/.build/bench5/tests/development.test.js
node --test .orkestrel/agent/instruments/harness/.build/bench5/tests/sustained/audit/Comparison.test.js
```

The remaining-core census ran as `node tmp/units/aggregate-qualification-verifier-successor-3-project.ts` under its 1,200-second dispatch cap. That runner prints and executes the exact serial argv `node --test --test-concurrency=1 <21 sorted emitted test paths>`; its complete argument list, the 25-file census size, and the four excluded already-passed touched files are recorded in its raw journal.

Scoped Git status contains exactly the seven released source/test paths. Their final SHA-256 hashes are:

| Source file | SHA-256 |
| --- | --- |
| `matrix/helpers.ts` | `A7DE6C270478C5E41FC6CA09A78EBCBE1362E16C95E2E69035535DB4D57F595A` |
| `aggregates/Aggregator.ts` | `2AB69C0948B69180417B766A694F9419AD2CEC36730AC0E50ED44DBDC73A244B` |
| `aggregates/helpers.ts` | `15671B0A876F6DC229A9E826AC3C7DED629C033A17C603FC28ED2F4E2DEB523E` |
| `tests/aggregates.test.ts` | `606FC9F908CAB1D3805A743FAE686F40044FA8AF0A59CBCA788C93CD59771F1C` |
| `tests/matrix.test.ts` | `99443131E12809E592D217512DB6B3070E6F1AED9B8C3DCF340763D39379184A` |
| `tests/development.test.ts` | `07AB4BEC5C40109089AA89A5163EFB33D3C9CA038EFB8B2D2A519F171C04415D` |
| `tests/sustained/audit/Comparison.test.ts` | `A2197E27E49E46350855ADCE11FC13A9C20EDDA8731F9D24900CB2434F0C8C63` |

The no-emit type check passed in 3,304 ms, formatter check passed in 80 ms, scoped oxlint with `--deny-warnings` passed in 291 ms, and canonical build passed in 4,483 ms. Every launch was uncapped and exited 0; complete stdout, stderr, journal, PID, and before/after status captures are under the respective `tmp/units/aggregate-qualification-verifier-successor-3-{noemit,format,lint,build}*` prefixes. The build reports 624 emitted files from 494 exact inputs. The resulting `build-manifest.json` SHA-256 is `0DB4BD7E9F43A7BA8FFF1E79A826A52D114DB6C8E90DE34B8E139737DE43B3FC` [manifest](.orkestrel/agent/instruments/harness/.build/build-manifest.json:1).

The resulting emitted identities for changed implementation and test files are sealed in that manifest:

| Emitted file | SHA-256 |
| --- | --- |
| `matrix/helpers.js` | `EDE5AE3B74D46C79CA460429C04B72A6108D85DA541E03F7489C8895595808D2` |
| `aggregates/Aggregator.js` | `C1C5D09A83F4384A29D680B5578F3BD8AF80BF296A4515223232797094130A2D` |
| `aggregates/helpers.js` | `7C34B53722E41EF3A199214F5B754992C6AD718A1E151EEA9C354C48D742AAFF` |
| `tests/aggregates.test.js` | `499D285C01BAB1BD0F750619FA1520CBD26E7BB4414450D5CE9564E6CE45D37D` |
| `tests/matrix.test.js` | `A02B7501AE7D7DB968E2BFB1ABC57B606DB815A2BD139D3A03CF09C6D5DFA868` |
| `tests/development.test.js` | `0769DE9C4858456B3D848A42B79DEC771EF97F8F29151F35374B84B10B941851` |
| `tests/sustained/audit/Comparison.test.js` | `D7A296BFD51EED911CEF4966CAF1F7610123B770E34D744C5C721CFBBE76BEA4` |

Each touched file was run once, in full, against these emitted hashes:

| File | Relevant passing coverage | Result |
| --- | --- | --- |
| `aggregates.test.js` | request-owner ordering and exact rendered-version/source-change binding [tests](tmp/units/aggregate-qualification-verifier-successor-3-aggregates.jsonl:47) | 51 passed, 10 suites, 0 failed/skipped/todo; 7,705 ms |
| `matrix.test.js` | three-arm planning/refusal and complete real-component resource ladder [planning](tmp/units/aggregate-qualification-verifier-successor-3-matrix.jsonl:252), [resource ladder](tmp/units/aggregate-qualification-verifier-successor-3-matrix.jsonl:328) | 7 passed, 0 failed/skipped/todo; 145,279 ms |
| `development.test.js` | length-terminated production flush and invalid-flush refusal [test](tmp/units/aggregate-qualification-verifier-successor-3-development.jsonl:695) | 7 passed, 0 failed/skipped/todo; 415,745 ms |
| `sustained/audit/Comparison.test.js` | paired selection refuses changed initial plans and permits later scale differences [test](tmp/units/aggregate-qualification-verifier-successor-3-audit.jsonl:14) | 16 passed, 0 failed/skipped/todo; 388 ms |

The full core test population was enumerated from the checked repair census. The verifier runner, `tmp/units/aggregate-qualification-verifier-successor-3-project.ts`, asserts all four touched files belong to the 25-file population, excludes only those four after their successful file runs, retains `matrix/tests/capacity.test.js`, and runs the remaining 21 files serially with `node --test --test-concurrency=1`. The exact argv and exclusions are recorded at the beginning of the raw census output [population and exclusions](tmp/units/aggregate-qualification-verifier-successor-3-project.jsonl:1). This remaining-core run exited 0, uncapped, in 91,041 ms: 342 passed, 71 suites, no failures, cancellations, skips, or todos [result](tmp/units/aggregate-qualification-verifier-successor-3-project.jsonl:641), [counts](tmp/units/aggregate-qualification-verifier-successor-3-project.jsonl:646). Combining that result with the four touched-file runs yields 25 core files, 423 passed tests, 81 suites, 0 failures, 0 cancellations, 0 skips, and 0 todos. All launch artifacts are under `tmp/units/aggregate-qualification-verifier-successor-3-project*`.

The aggregate test durations total 660,158 ms across the four touched files and the remaining core population. They measure this host and fixture load; they do not measure model quality or production performance. The earlier `-1` lint warning and `-2` formatter refusal remain in their original reports and captures; the released lexical and formatter corrections received fresh static checks, build, and test evidence here. No model or live service calls were made.
