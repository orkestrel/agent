# Held l15 Qwen4 cell driver

Prepared `tmp/units/aggregate-successor-cell-run.ts` as the bounded successor of `tmp/units/aggregate-final-cell-driver.ts`. The helper SHA-256 is `3095b52463bbeacd1f1788ac8096be28f5282cbd431af6ce5b266e22803124ae`. Its exact adaptation diff is `tmp/units/aggregate-successor-cell-adaptation.patch`, SHA-256 `1fb8a0d343a6a65fcf29f74eeda30ff322440d7ec4fdae1ba64b5cbae1b27dbe`. The unchanged predecessor SHA-256 is `feef1e8b51e5fa21b46f6be74d11b5f5fb0533e3e4027a6bcc0ea4df8b5f050c`. Neither live nor dry mode was executed.

The delta changes the results root to l15, permits only `q4-think0` and `q4-think1`, and requires root's `--head` SHA-1 and `--fit` SHA-256 arguments at `tmp/units/aggregate-successor-cell-run.ts:20`. The accepted build is bound to `0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc`, and the frozen deployment is bound to `40442197423b574b61548feb702b55c948d77f61dd719d9d6b26e24ad3016e19` at `tmp/units/aggregate-successor-cell-run.ts:41`. The fit hash must match the exact l15 q4 calibration fit file at `tmp/units/aggregate-successor-cell-run.ts:43`; no predecessor fit hash remains. Because the permitted cells require a fit, their resource/full/pilot stage sequence is explicit.

Every emitted operator receives `--url http://127.0.0.1:11435` at `tmp/units/aggregate-successor-cell-run.ts:51`. The printed plan and outer invocation retain the supplied head and fit values at `tmp/units/aggregate-successor-cell-run.ts:56`. The added private custody method reads HEAD through `git rev-parse HEAD` at `tmp/units/aggregate-successor-cell-run.ts:140`; its calls occur before preparation, at dry closure, before and after each live stage, and at successful or fault closure. Those calls remain unexecuted in this preparation.

The predecessor's emitted custody, feasibility, raw-run, empirical-bound, exposure, and execution readers are retained. Resource refusal still stops dependent stages. A validated full refusal still permits the pilot to proceed under the accepted resource. Operational exits/signals still stop the driver, and operator exit must still equal the emitted measured decision. The source retains these branches at `tmp/units/aggregate-successor-cell-run.ts:82` and `tmp/units/aggregate-successor-cell-run.ts:117`. No reporting, qualification, adoption, or quality rule changed.

Use the accepted release head `9273347a159643700017bd31ae94a26f38ad5cae` and replace `RELEASED_FIT_SHA256` with root's exact released fit hash. The following invocation is held for the later execution verifier; it is not execution authorization:

```text
node tmp/units/aggregate-successor-cell-run.ts q4-think0 --head 9273347a159643700017bd31ae94a26f38ad5cae --fit RELEASED_FIT_SHA256
```

That dry mode preserves the predecessor's plan output and absence readings, invokes its custody readers, and prints the exact tracked live invocation. Root may later select `q4-think1` under the same fit custody. A released live invocation has this shape, with the cell-specific paths kept consistent:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-successor-cell-q4-think0-live.jsonl --errors tmp/units/aggregate-successor-cell-q4-think0-live.err --cap 25920 --status -- node tmp/units/aggregate-successor-cell-run.ts q4-think0 --head 9273347a159643700017bd31ae94a26f38ad5cae --fit RELEASED_FIT_SHA256 --live
```

The prepared path bindings are `l15/<cell>/freeze/manifest.json`, `l15/calibration/q4/fit/fit.json`, `l15/<cell>/{resource,full,pilot}/`, and `l15/logs/<cell>-<stage>.{jsonl,err}` under `.orkestrel/agent/instruments/results/`. The sequence and outer captures use `tmp/units/aggregate-successor-cell-<cell>-sequence.jsonl` and `aggregate-successor-cell-<cell>-live.{jsonl,err}`. The predecessor's create-only checks for stage directories and nested journal/error/pid/status captures remain. Before the later outer launch, its execution dispatch must also require the outer capture paths absent, because the launcher's own capture-opening behavior remains unchanged.

The operator caps remain 7200 seconds for resource/full and 10800 seconds for pilot; the outer cap remains 25920 seconds. The checked brief records prior Q4 durations of 524,338 ms for resource, 1,490,075 ms for full, and 1,835,032 ms for pilot. These readings explain the retained limits; this unit made no runtime measurement and proposes no cap change.

Root's source reading, the fixed generation's closure, independent blind labeling, adjudication, fit outcome, released fit hash, and separate execution authorization remain held dependencies. Preparation did not inspect live packet, labels, attempts, or fit bytes. It read only the named predecessor and continuation procedure, produced the owned helper/diff/report, hashed those artifacts, and checked report citations. No helper or custody reader, gate, model/service operation, Git command, canonical edit, retry, or spawned agent occurred. No deviation or production change was required.
