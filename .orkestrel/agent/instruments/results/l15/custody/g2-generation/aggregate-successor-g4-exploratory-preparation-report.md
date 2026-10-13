# G4 exploratory artifact preparation

Prepared the existing Gemma4 development-entry materializer without executing it. `node --check tmp/units/aggregate-successor-g4-exploratory-prepare.ts` exited 0 with empty output. Runtime admission, artifact materialization, cache creation, and live execution remain unattempted.

The script is tmp/units/aggregate-successor-g4-exploratory-prepare.ts:1, SHA-256 `a5ee0d1e2e382f7002919cc10a268432b50d887023c27175fdd9c2fdc9a75e73`. It accepts only `g4-think0` or `g4-think1` and a root-supplied SHA-1 HEAD through `--head`. Its prospective invocation is `node tmp/units/aggregate-successor-g4-exploratory-prepare.ts g4-think0|g4-think1 --head RELEASED_HEAD`; root selects one cell and supplies the released HEAD. This command was not executed.

The policy and execution use the existing MatrixDevelopment and MatrixExecution contracts. The fixed shape is phase development, aggregate arm, copy 1, no qualified fit reference, CHANGE 0.56, and `withhold: true`. The materializer derives AGREE through `readRefitAssessment` and `selectMajorityCutoff` and requires exactly 0.61. It keeps the original g4-think0 calibration freeze separate from the selected decision freeze. See .orkestrel/agent/instruments/harness/bench5/matrix/types.ts:101, .orkestrel/agent/instruments/harness/bench5/matrix/types.ts:113, .orkestrel/agent/instruments/harness/bench5/matrix/validators.ts:104, .orkestrel/agent/instruments/harness/bench5/matrix/validators.ts:129, .orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:579, and .orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:594.

The cell resource is validated by `readResource`; its accepted budget supplies the paired execution budget. The cell full manifest supplies its attempt budget as expanded policy data. The existing `readDevelopment` then recomputes resource/full-bound/raw-attempt and calibration custody before execution JSON is saved; `readExecution` validates the saved execution afterward. The script changes no production guard and permits a validated full-view refusal according to that existing reader. See .orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:379, .orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:525, and .orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:627.

The target exploration folder, policy/execution files, cache path, and run path must be absent. `mkdirSync` exclusively creates the folder, and both files use the wx flag. The materializer prints the existing bench.js invocation with --run, --live, --copy 1, --manifest, separate fresh --cache and --out paths, and endpoint http://127.0.0.1:11435; it never launches that command. Driver creates the fresh cache from the selected freeze’s seed and rejects reused development lineage. See .orkestrel/agent/instruments/harness/bench5/Driver.ts:389, .orkestrel/agent/instruments/harness/bench5/Driver.ts:428, .orkestrel/agent/instruments/harness/bench5/Driver.ts:817, and .orkestrel/agent/instruments/harness/bench5/Driver.ts:1328.

The exact root-relative prospective paths follow; runtime references and printed commands use absolute scaffold paths.

| Cell | Prospective path | Operation |
| --- | --- | --- |
| `g4-think0` | `.orkestrel/agent/instruments/results/l15/g4-think0/exploration/policy.json` | Created exclusively by the future materializer. |
| `g4-think0` | `.orkestrel/agent/instruments/results/l15/g4-think0/exploration/aggregate-execution.json` | Created exclusively after readDevelopment accepts the policy. |
| `g4-think0` | `.orkestrel/agent/instruments/results/l15/g4-think0/exploration/aggregate-cache` | Printed as a fresh seed-based cache path; materializer does not create it. |
| `g4-think0` | `.orkestrel/agent/instruments/results/l15/g4-think0/exploration/aggregate-run` | Printed as the fresh run path; materializer does not create it. |
| `g4-think1` | `.orkestrel/agent/instruments/results/l15/g4-think1/exploration/policy.json` | Created exclusively by the future materializer. |
| `g4-think1` | `.orkestrel/agent/instruments/results/l15/g4-think1/exploration/aggregate-execution.json` | Created exclusively after readDevelopment accepts the policy. |
| `g4-think1` | `.orkestrel/agent/instruments/results/l15/g4-think1/exploration/aggregate-cache` | Printed as a fresh seed-based cache path; materializer does not create it. |
| `g4-think1` | `.orkestrel/agent/instruments/results/l15/g4-think1/exploration/aggregate-run` | Printed as the fresh run path; materializer does not create it. |

The following fixed input SHA-256 values were read during preparation and are encoded in the materializer. The diagnosis was not printed as raw JSON; its accepted compact emitted validation was read from tmp/units/aggregate-successor-g4-fit-validation.json:1. The labels, packet, generation, and diagnosis identities follow the retained fit closure at tmp/units/aggregate-successor-g4-fit-report.md:1.

| Fixed root-relative input | SHA-256 |
| --- | --- |
| `.orkestrel/agent/instruments/harness/.build/build-manifest.json` | `0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc` |
| `.orkestrel/agent/instruments/results/l15/g4-think0/freeze/manifest.json` | `9fecc71430f9c6af8580bdc7eb43e6ec2b034fa12c45690581af4197ac818f36` |
| `.orkestrel/agent/instruments/results/l15/g4-think1/freeze/manifest.json` | `7f8c4adacf24086e876feca6b91b8e3fcf7013180d223a318497ee2809307124` |
| `.orkestrel/agent/instruments/results/l15/calibration/g4/fit/diagnosis.json` | `a459c9fa0ab48114163d9257e6178d7c2a55dd7c140f15de0e1350a01fa4e1ba` |
| `.orkestrel/agent/instruments/results/l15/calibration/g4/labels.json` | `09d8e5171e2d65dd1a65fd85cc571a13984d03705b4370fc7e63c8c4ae95d819` |
| `.orkestrel/agent/instruments/results/l15/calibration/g4/generation/packet.jsonl` | `64b0f89566458745c8099e9351db3b44686102145721ef9395bbd8e06e9d57f5` |
| `.orkestrel/agent/instruments/results/l15/calibration/g4/generation/manifest.json` | `b9c622ed08613260e489f87a8539b8d7c177ece7a20e5fe0ea8108799fc74d26` |

The required missing inputs are the cell-specific resource and full manifests. The exact preparation Test-Path reading returned false for each path and both exploration folders.

- `.orkestrel/agent/instruments/results/l15/g4-think0/resource/manifest.json`
- `.orkestrel/agent/instruments/results/l15/g4-think0/full/manifest.json`
- `.orkestrel/agent/instruments/results/l15/g4-think1/resource/manifest.json`
- `.orkestrel/agent/instruments/results/l15/g4-think1/full/manifest.json`

Only the owned script and this report were written. Every command used explicit cwd `C:/Users/mikes/WebstormProjects/scaffold`, and patches used absolute scaffold paths. Syntax checking executed no script statements or imported helpers. No source/build/HEAD/Git mutation, service operation, model request, fit rerun, label change, task-quality or held-out analysis, cache/run artifact, canonical campaign write, install, cleanup, broader gate, or new test occurred. Builder performed the work itself and spawned nothing.

`node .agents/skills/orkestrel-dispatch/scripts/cite.ts tmp/units/aggregate-successor-g4-exploratory-preparation-report.md` exited 0 with 16 citations and 0 unresolved.
