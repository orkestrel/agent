I'll read the new brief and follow it exactly. The final message will be the document it specifies.The l14 Qwen4 opaque comparison packet is produced by the unit script `tmp/units/aggregate-development-blind-packet-export.ts`. It is still the callable producer. A retained copy is `.orkestrel/agent/instruments/units/aggregates/reports/resumption-l14-q4-pilot/aggregate-development-blind-packet-export.ts`, recorded at `resumption-l14-q4-pilot/restoration.json:5` with SHA-256 `c6f1e212ef8bca0035862b78556fbafc564123ad1590d9f3e27211585b385fb9`. The script has no exported function. Loading it calls `execute(process.argv.slice(2))` at `tmp/units/aggregate-development-blind-packet-export.ts:271`.

The accepted l14 output is `tmp/units/aggregate-development-blind-packet-l14-b/packet.json`, with private joins at `tmp/units/aggregate-development-blind-packet-l14-b/private/joins.json` (`resumption-l14-q4-quality/restoration.json:6`, `resumption-l14-q4-quality/restoration.json:12`). The checker binds those same paths at `resumption-l14-q4-quality/join-3.ts:5` and `resumption-l14-q4-quality/join-3.ts:7`.

## Recorded recipe

The recorded command form is in `tmp/units/aggregate-final-blind-command-lookup-report.md:7`. `CLOSED_RECORDS_RUN`, `CLOSED_AGGREGATE_RUN`, `CLOSED_FULL_RUN`, and `KEY-thinkN` are placeholders. The exporter does not derive them.

```powershell
$copy1 = '.orkestrel/agent/instruments/harness/bench/variants/long/v1.json'
$recordsRun = 'CLOSED_RECORDS_RUN'
$aggregateRun = 'CLOSED_AGGREGATE_RUN'
$fullRun = 'CLOSED_FULL_RUN'
$out = 'C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-development-blind-packet-l14-KEY-thinkN'
node tmp/units/aggregate-development-blind-packet-export.ts --copy $copy1 --run $recordsRun --run $aggregateRun --run $fullRun --out $out
```

The correction that names the run which actually closed is `resumption-l14-q4-diagnostic/export-command-correction.md:3`. It binds `--copy` to `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json`, the unversioned script above, and the output directory `tmp/units/aggregate-development-blind-packet-l14-b`. That run exited 0 and emitted a public packet SHA-256 `14b3d53e58eeb7dac1f975c6160974df0a133b6ae8a0cb76a0558c6e73ebfef7`. The private joins seal recorded beside it is `cc1ef80f9f5bed19ae84956195e0accae726a5ad05a645ae4e5a1f278900b69d` (`resumption-l14-q4-quality/validation.md:9`).

No retained line quotes one argv that combines the unversioned script, that output directory, and the run directories. The private-join hash census names the run files that export hashed (`resumption-l14-q4-quality/validation.md:12`):

- records: `.orkestrel/agent/instruments/results/l14/q4-think0/resource/reserve-512/l6-q4-think0-records-v1`
- aggregate: `.orkestrel/agent/instruments/results/l14/q4-think0/pilot/development/l6-q4-think0-aggregate-v1`
- full: `.orkestrel/agent/instruments/results/l14/q4-think0/full/preflight/l6-q4-think0-full-v1`

Each of those directories contributed `run.json`, `rows.jsonl`, and `messages.jsonl`.

`tmp/units/aggregate-development-blind-packet-export-1.ts` is the obsolete script. Its opaque id omits run identity (`aggregate-development-blind-packet-export-1.ts:194`), and its public file keeps arm-grouped `trajectories` (`aggregate-development-blind-packet-export-1.ts:258`). The correction says the unversioned script is the one that ran.

## What the script does

Arguments are one `--copy`, at least one `--run`, and one absolute `--out` (`aggregate-development-blind-packet-export.ts:225`). Duplicate run paths are refused (`aggregate-development-blind-packet-export.ts:236`). Each run must have `run.json` with `copy === 1`, plus `rows.jsonl` and `messages.jsonl` (`aggregate-development-blind-packet-export.ts:143`). The output directory must sit under `tmp/units`, and its first segment must start with `aggregate-development-blind-packet` (`aggregate-development-blind-packet-export.ts:232`). The directory and both files are create-only (`aggregate-development-blind-packet-export.ts:263`, `aggregate-development-blind-packet-export.ts:267`).

A fresh 32-byte salt is drawn on every run (`aggregate-development-blind-packet-export.ts:241`). Each opaque id is the first 32 hex characters of SHA-256 over `salt`, a NUL, SHA-256 of the resolved run path, a NUL, and the goal id (`aggregate-development-blind-packet-export.ts:139`, `aggregate-development-blind-packet-export.ts:196`). Public rows are sorted by that id inside each run and again after the runs are combined (`aggregate-development-blind-packet-export.ts:216`, `aggregate-development-blind-packet-export.ts:254`). Equal ids are refused (`aggregate-development-blind-packet-export.ts:257`).

The public file is `{ reference, goals }`. `reference` carries the scenario system text, topics, the full seed array, tools, lookups, days, and every planned goal with `eligibleSeedPrefixThrough` set to `goal.after` (`aggregate-development-blind-packet-export.ts:243`). Each public goal carries `id`, `request`, `eligibleSource.seedPrefixThrough`, goal truth, `status`, `reply`, and goal-local tool actions (`aggregate-development-blind-packet-export.ts:17`, `aggregate-development-blind-packet-export.ts:197`). The script walks every scenario goal. A missing row is `unattempted`, a partial row or a row with `error` is `failed`, and any other row is `served` (`aggregate-development-blind-packet-export.ts:174`). A goal with messages and no row fails the export (`aggregate-development-blind-packet-export.ts:178`).

The private file is `{ salt, joins, hashes }`. Joins stay in `--run` order and scenario-goal order, with `opaque`, `goal`, `runIdentity`, and the resolved `run` path (`aggregate-development-blind-packet-export.ts:214`, `aggregate-development-blind-packet-export.ts:255`, `aggregate-development-blind-packet-export.ts:262`). `hashes` covers the resolved scenario plus each run's `run.json`, `rows.jsonl`, and `messages.jsonl` (`aggregate-development-blind-packet-export.ts:258`). Stdout is one JSON object with `output`, `trajectories`, `plannedPerTrajectory`, `publicRows`, and the public payload SHA-256 (`aggregate-development-blind-packet-export.ts:268`).

The inclusive seed boundary stored on each public goal is `goal.after`. The later checker rejects a `/seed/<index>` pointer when `index` is greater than the judgment's `eligibleSource.through` (`resumption-l14-q4-quality/boundary-check-2.ts:65`).

`node .build/bench5/sustained-audit.js blind` is a different command. `Packet.build` covers records and aggregate rows, takes an integer seed, and writes `keys.json` (`bench5/sustained/audit/Packet.ts:29`, `bench5/sustained/audit/Audit.ts:151`). It does not write this comparison packet.

## l15 substitutions

`--copy` stays `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json` when that scenario file is still the authored copy. This lookup did not rehash it.

| Role | l14 path the joins hashed | l15 file search |
| --- | --- | --- |
| records | `.orkestrel/agent/instruments/results/l14/q4-think0/resource/reserve-512/l6-q4-think0-records-v1` | `.orkestrel/agent/instruments/results/l15/q4-think0/resource/reserve-512/l6-q4-think0-records-v1` has `run.json`, `rows.jsonl`, and `messages.jsonl` |
| aggregate | `.orkestrel/agent/instruments/results/l14/q4-think0/pilot/development/l6-q4-think0-aggregate-v1` | no `run.json` under `.orkestrel/agent/instruments/results/l15` |
| full | `.orkestrel/agent/instruments/results/l14/q4-think0/full/preflight/l6-q4-think0-full-v1` | `.orkestrel/agent/instruments/results/l15/q4-think0/full/preflight/l6-q4-think0-full-v1` has `run.json` and `rows.jsonl`; `messages.jsonl` was absent |

Packet and joins hashes are outputs. The salt is random, so the l14 seals `14b3d53e58eeb7dac1f975c6160974df0a133b6ae8a0cb76a0558c6e73ebfef7` and `cc1ef80f9f5bed19ae84956195e0accae726a5ad05a645ae4e5a1f278900b69d` are not inputs to a fresh export. No l15 `--out` directory is recorded. The path guard accepts a fresh absolute directory under `tmp/units` whose first segment starts with `aggregate-development-blind-packet`.

Unresolved before a fresh export: the closed l15 aggregate run directory, `messages.jsonl` for the l15 full run, and the single historical argv line that would show the unversioned script, the l14-b output directory, and the three run directories together. The live script's bytes were not rehashed against `c6f1e212ef8bca0035862b78556fbafc564123ad1590d9f3e27211585b385fb9`; the `makeRecord` and `execute` bodies match the retained copy.

## Exposure

The quality README's historical comparison summary was visible during the earlier read and is unused here. Packet JSON, private joins, judgment arrays, and model replies were not opened. A search hit opaque ids inside joined output and packet-pointer paths inside the judgment file; those values are not reproduced. No script was run and nothing was written.