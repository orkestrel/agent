# Q2 exploratory artifact preparation

Prepared the unexecuted literal Q2 copy of the accepted G4 materializer. Syntax check exited 0 with empty output. Both Q2 resource/full prerequisites and exploration folders remain absent in the preparation existence check. Runtime materialization, admission, cache creation, and inference remain unattempted.

The complete prepared script is tmp/units/aggregate-successor-q2-exploratory-prepare.ts:1, SHA-256 `b33662c6020f67feb528b8e73269435a88474ae8e20456e296ef4a04d69999c9`. The exact data-only diff is tmp/units/aggregate-successor-q2-exploratory-prepare.diff:1, SHA-256 `5c24c798e9471b4f944b340718f4370d5176390a605a89948aa27fd4bab969be`. The predecessor is tmp/units/aggregate-successor-g4-exploratory-prepare.ts:1, SHA-256 `a5ee0d1e2e382f7002919cc10a268432b50d887023c27175fdd9c2fdc9a75e73`, unchanged after preparation.

The diff changes only model/cell/output literals from g4 to q2, Q2 seals, the diagnosis path to `calibration/q2/fit-2/diagnosis.json`, and the required cutoff literal from 0.61 to 0.68. The unsuffixed fit directory supplies no policy input. Every predicate structure, helper, type, create-only write, HEAD check, budget binding, emitted admission call, and command construction is unchanged. The execution remains aggregate, development, copy 1, with `withhold: true`, CHANGE 0.56, and no qualified fit. See tmp/units/aggregate-successor-q2-exploratory-prepare.ts:49, tmp/units/aggregate-successor-q2-exploratory-prepare.ts:57, and tmp/units/aggregate-successor-q2-exploratory-prepare.ts:82.

The exact Q2 seals match the retained fit-2 report, its compact validation, and closed generation report. The materializer derives the cutoff through the unchanged existing reader and selector and requires 0.68. It uses q2-think0 as the original calibration freeze, each selected Q2 decision freeze separately, and each cell’s own validated resource/full manifests. See tmp/units/aggregate-successor-q2-fit-2-report.md:1, tmp/units/aggregate-successor-q2-fit-2-validation.json:1, and tmp/units/aggregate-successor-model-q2-generation-report.md:1. No raw diagnosis JSON or semantic packet/label content was printed or analyzed.

The fixed input seals encoded in the script follow.

| Root-relative input | SHA-256 |
| --- | --- |
| `.orkestrel/agent/instruments/harness/.build/build-manifest.json` | `0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc` |
| `.orkestrel/agent/instruments/results/l15/q2-think0/freeze/manifest.json` | `442dfeb697d843e28ab3c8985aabb720d768d9f9646b33a128124a74560b53fd` |
| `.orkestrel/agent/instruments/results/l15/q2-think1/freeze/manifest.json` | `b356f869b71480ed759e274e2587cf87437c1551987583c2bac81e0e8b4f8f5f` |
| `.orkestrel/agent/instruments/results/l15/calibration/q2/fit-2/diagnosis.json` | `626ac28ed56f4b0f1e1ce51ff2ebdece035ba2760ce532c551642c74d89fc5ca` |
| `.orkestrel/agent/instruments/results/l15/calibration/q2/labels.json` | `ae937346c5e0abdc1b4543511b171e93ec117f795b90b9fd93af87e67b53f661` |
| `.orkestrel/agent/instruments/results/l15/calibration/q2/generation/packet.jsonl` | `a67c510650eaa2ffae29fe5c461fcf56d4cd91e9e3376a3ac4b5fba2b3c14999` |
| `.orkestrel/agent/instruments/results/l15/calibration/q2/generation/manifest.json` | `10e654ee24fe25b7a32af7e8f6610467154a8c1c5cc65dcbeeb2c6335e722d23` |

The prospective invocation is `node tmp/units/aggregate-successor-q2-exploratory-prepare.ts q2-think0|q2-think1 --head RELEASED_HEAD`. Root selects one cell and supplies its released HEAD. That command was not executed.

The exact root-relative prospective paths follow; runtime references and printed commands use absolute scaffold paths.

| Prospective path | Operation |
| --- | --- |
| `.orkestrel/agent/instruments/results/l15/q2-think0/exploration/policy.json` | Created exclusively by the future materializer. |
| `.orkestrel/agent/instruments/results/l15/q2-think0/exploration/aggregate-execution.json` | Created exclusively after existing readDevelopment admission. |
| `.orkestrel/agent/instruments/results/l15/q2-think0/exploration/aggregate-cache` | Printed fresh seed-based cache path; materializer does not create it. |
| `.orkestrel/agent/instruments/results/l15/q2-think0/exploration/aggregate-run` | Printed fresh run path; materializer does not create it. |
| `.orkestrel/agent/instruments/results/l15/q2-think1/exploration/policy.json` | Created exclusively by the future materializer. |
| `.orkestrel/agent/instruments/results/l15/q2-think1/exploration/aggregate-execution.json` | Created exclusively after existing readDevelopment admission. |
| `.orkestrel/agent/instruments/results/l15/q2-think1/exploration/aggregate-cache` | Printed fresh seed-based cache path; materializer does not create it. |
| `.orkestrel/agent/instruments/results/l15/q2-think1/exploration/aggregate-run` | Printed fresh run path; materializer does not create it. |

Driver’s existing development cache path starts from the target freeze’s seed and rejects reused lineage; the materializer creates only policy/execution files and prints the existing bench.js command with endpoint http://127.0.0.1:11435, separate fresh cache/run paths, and no launch. The unchanged readDevelopment/readExecution admission validates the saved policy/execution. See .orkestrel/agent/instruments/harness/bench5/Driver.ts:1328 and .orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:525.

The preparation existence check returned false for every required resource/full input and both exploration folders. Root must release the missing inputs before executing the materializer.

- `.orkestrel/agent/instruments/results/l15/q2-think0/resource/manifest.json`
- `.orkestrel/agent/instruments/results/l15/q2-think0/full/manifest.json`
- `.orkestrel/agent/instruments/results/l15/q2-think1/resource/manifest.json`
- `.orkestrel/agent/instruments/results/l15/q2-think1/full/manifest.json`

Commands ran on Windows PowerShell with explicit cwd `C:/Users/mikes/WebstormProjects/scaffold`; writes used absolute scaffold paths. `git --no-pager diff --no-index -- tmp/units/aggregate-successor-g4-exploratory-prepare.ts tmp/units/aggregate-successor-q2-exploratory-prepare.ts` exited 1 because the files differ; its complete direct output is retained. `node --check tmp/units/aggregate-successor-q2-exploratory-prepare.ts` exited 0 with empty output and executed no script statements. `Get-FileHash -Algorithm SHA256 -LiteralPath` measured named input, predecessor, script, and diff hashes. No runtime materializer, production helper, model/service operation, source/build/HEAD mutation, Git mutation, fit rerun, label change, task-quality/held-out analysis, cache/run artifact, install, cleanup, additional gate, or test occurred. Builder performed the work itself and spawned nothing.

`node .agents/skills/orkestrel-dispatch/scripts/cite.ts tmp/units/aggregate-successor-q2-exploratory-preparation-report.md` exited 0 with 11 citations and 0 unresolved.
