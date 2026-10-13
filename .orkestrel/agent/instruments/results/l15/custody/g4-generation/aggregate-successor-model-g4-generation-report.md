# G4 fixed generation execution report

The fixed G4 freeze, corpus, and generation chain completed under released HEAD `26549dc37437fd38448d60f9648f903edc2c8bfb`. The generated packet is retained at `.orkestrel/agent/instruments/results/l15/calibration/g4/generation/packet.jsonl` with SHA-256 `64b0f89566458745c8099e9351db3b44686102145721ef9395bbd8e06e9d57f5`. The generation manifest SHA-256 is `b9c622ed08613260e489f87a8539b8d7c177ece7a20e5fe0ea8108799fc74d26`; the attempts SHA-256 is `a47701990322dce8ea572b41be2454feed000e691bf79b60c2e8947c27191591`.

The reader did not accept the retained evidence. The first temporary reader invocation failed at module loading because it imported `buildRefitItem` from a module that does not export it; its complete capture is preserved. After correcting only that import to the emitted `refit/helpers.js` export, the reader stopped in emitted `verifyEvidence` with `judge model mismatch`. The typed reader signature confirmed the call shape was correct. No model identity or answer content was read into this report. This mismatch is an evidence integrity fault, so no fit or labels were produced and no generation retry was made.

The exact launched command was:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-successor-model-g4-execution-root.jsonl --errors tmp/units/aggregate-successor-model-g4-execution-root.err --cap 2880 --status -- node tmp/units/aggregate-successor-model-run.ts --key g4 --plan 0e091e45ed2d7ead59ee486565b1c702d96b7338190487a980fda3cd1de3bb22 --head 26549dc37437fd38448d60f9648f903edc2c8bfb --build 0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc
```

The runner, plan, build, and deployment seals were respectively `2781d346a006a8f2fb343504b4a3682568806a9239b41246ed4d0f3dc28193bb`, `0e091e45ed2d7ead59ee486565b1c702d96b7338190487a980fda3cd1de3bb22`, `0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc`, and `40442197423b574b61548feb702b55c948d77f61dd719d9d6b26e24ad3016e19`. Each was checked against the released identity before execution. The before/after custody digest remained `3950AF540D2C3C67E024D652131515EF3F17BAEAA67AF592A530DC52223C033A`; HEAD and source/build stayed fixed.

| Stage | Launcher PID | Runner PID | Exit | Capped | Duration |
|---|---:|---:|---:|---|---:|
| think0 freeze | 69824 | 40652 | 0 | no | 1,204 ms launcher; 1,460.139 ms runner |
| think1 freeze | 55912 | 28024 | 0 | no | 1,208 ms launcher; 1,464.7262 ms runner |
| corpus | 29844 | 9556 | 0 | no | 2,549 ms launcher; 2,807.0722 ms runner |
| generation | 30948 | 39832 | 0 | no | 1,383,783 ms launcher; 1,384,035.975 ms runner |

All stage signals were `none`. The outer dispatcher (PID 16732) exited 0 uncapped after 1,395,916 ms. Its error receipt is `tmp/units/aggregate-successor-model-g4-execution-root.err`; its journal is `tmp/units/aggregate-successor-model-g4-execution-root.jsonl`; the detailed stage sequence is `tmp/units/aggregate-successor-model-g4-execution-sequence.jsonl`. The generation manifest reports completion with no recorded generation errors. The exact freeze manifest hashes are `9fecc71430f9c6af8580bdc7eb43e6ec2b034fa12c45690581af4197ac818f36` (think0) and `7f8c4adacf24086e876feca6b91b8e3fcf7013180d223a318497ee2809307124` (think1). The corpus and corpus-manifest hashes are `918b239b97d41d98e7c18d9ab2d0ef4060011eb50c1fc8ccb34d391ed34d3aa6` and `c5e4a14938b828488b20ac5aed3faa29f69fabe9be70e6265f54a5a1c480f2cc`.

The emitted validation helper is `tmp/units/aggregate-successor-model-g4-generation-read.ts`. Its first failed invocation is preserved in `tmp/units/aggregate-successor-model-g4-generation-read.stdout.txt` and `tmp/units/aggregate-successor-model-g4-generation-read.stderr.txt`. The corrected reader's failed invocation is preserved in `tmp/units/aggregate-successor-model-g4-generation-read-2.stdout.txt`, `tmp/units/aggregate-successor-model-g4-generation-read-2.stderr.txt`, and `tmp/units/aggregate-successor-model-g4-generation-read-2.exit.txt`. The second invocation exited 1 at `verifyEvidence`; consequently packet item count, joined coverage, and emitted cost totals remain unvalidated and are not claimed here.

Process-closure inspection found none of the dispatcher, runner, launcher, or freeze child PIDs still present. The calibration `labels.json`, fit output, and fit logs remained absent. The separate user-owned service/workload was left untouched.

Evidence: [stage sequence](tmp/units/aggregate-successor-model-g4-execution-sequence.jsonl:5) records the first freeze result; the other stage results are at [line 9](tmp/units/aggregate-successor-model-g4-execution-sequence.jsonl:9), [line 13](tmp/units/aggregate-successor-model-g4-execution-sequence.jsonl:13), and [line 17](tmp/units/aggregate-successor-model-g4-execution-sequence.jsonl:17). The outer terminal receipt is [execution-root.err](tmp/units/aggregate-successor-model-g4-execution-root.err:1), and the generation-stage terminal receipt is [g4-calibration-generate.err](.orkestrel/agent/instruments/results/l15/logs/g4-calibration-generate.err:1). The preserved reader failure is [generation-read-2.stderr.txt](tmp/units/aggregate-successor-model-g4-generation-read-2.stderr.txt:1).
