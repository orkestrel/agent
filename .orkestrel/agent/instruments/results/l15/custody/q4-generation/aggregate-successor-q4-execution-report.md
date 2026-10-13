# Held Q4 execution preparation

The prepared successor is `tmp/units/aggregate-successor-q4-execution-run.ts`, SHA-256 `d5e562abdc1d8f1ce8d209dd97e438b5eed705b48066ace3c66279145d8f4cdd`. It has not run. The final adaptation diff is `tmp/units/aggregate-successor-q4-execution-adaptation-2.patch`, SHA-256 `576ffd67b9ace412c0afddb49538e7810184cc300fd38c7a3350fc0b071473af`. The l14 runner and historical artifacts remain unchanged. The earlier draft adaptation diff is retained separately.

The existing l14 driver cannot be reused by invocation alone. It fixes its l14 plan path, requires that plan's full command population, and selects its freeze/generation slice at `tmp/units/aggregate-final-calibration-run.ts:9`. Its surrounding dispatch supplied source custody externally. This successor preserves its direct sequential child mechanism and adds only the release identity, fixed Q4 selection, absent destinations, and retained custody required by the checked brief. It introduces no generic orchestration framework, source mechanism, or alternate command plan.

## Use the accepted release

After root supplies the accepted full HEAD SHA-1 and build-manifest SHA-256, replace `ACCEPTED_HEAD` and `ACCEPTED_BUILD` in this proposed invocation. Run from `C:/Users/mikes/WebstormProjects/scaffold` through the tracked dispatch launcher:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-successor-q4-execution-root.jsonl --errors tmp/units/aggregate-successor-q4-execution-root.err --cap 2880 --status -- node tmp/units/aggregate-successor-q4-execution-run.ts --head ACCEPTED_HEAD --build ACCEPTED_BUILD
```

Before launching, root's execution dispatch must confirm that the outer journal, errors file, pid file, and before/after status files named by this invocation are absent. The launcher opens its captures for writing, so the outer captures must be checked before the launcher starts. The execution helper checks its own record/custody captures and every selected command's destinations before its first nested spawn, then checks that command's destinations again before invoking it. Do not substitute an existing journal or rerun a failed sequence.

The runner requires the release values and rejects unknown CLI options at `tmp/units/aggregate-successor-q4-execution-run.ts:30`. It compares those values with the actual HEAD and the existing custody readers' build reading before any command at `tmp/units/aggregate-successor-q4-execution-run.ts:95`. No uncommitted or predecessor HEAD/build identity is hardcoded. Root's final accepted seals are pending; that is the held launch prerequisite, not a preparation failure.

## Bind the fixed commands

The only accepted plan is `tmp/units/aggregate-successor-q4-command-plan.json`, SHA-256 `fbc73fbc19ebd34910fd977a87322ed5be296df9dcb5e761ab0661d1ff54fbb0`. The plan's exact argument arrays remain authoritative and are retained in each command record. The helper changes only the launcher and nested Node executable tokens from `node` to `process.execPath`; flags, ordered arguments, paths, model, settings, seed, and URLs remain those sealed bytes. The checks and executable projection are at `tmp/units/aggregate-successor-q4-execution-run.ts:39` and `tmp/units/aggregate-successor-q4-execution-run.ts:49`.

The selected command identities and output destinations are:

| Identity | Inner action | Existing cap | Output under `.orkestrel/agent/instruments/results/l15/` |
| --- | --- | --- | --- |
| `q4-think0-freeze` | Emitted matrix freeze, key q4, thinking false | 240 seconds | `q4-think0/freeze/manifest.json` |
| `q4-think1-freeze` | Emitted matrix freeze, key q4, thinking true | 240 seconds | `q4-think1/freeze/manifest.json` |
| `q4-calibration-corpus` | Emitted refit freeze against the think0 freeze | 240 seconds | `calibration/q4/corpus/corpus.json`, `calibration/q4/corpus/manifest.json` |
| `q4-calibration-generate` | Emitted refit generate against that frozen corpus | 1800 seconds | `calibration/q4/generation/attempts.jsonl`, `calibration/q4/generation/packet.jsonl`, `calibration/q4/generation/manifest.json` |

Each selected entry keeps its own capped `.agents/skills/orkestrel-dispatch/scripts/launch.ts` invocation with `--status`. Its journal and errors paths remain the exact `l15/logs/<identity>.jsonl` and `.err` paths in the plan. The source file selects only these identities at `tmp/units/aggregate-successor-q4-execution-run.ts:48`; the fit entry is outside that fixed slice, and no CLI option can select it.

The dedicated URL remains `http://127.0.0.1:11435`. The model remains `qwen3.5:4b-q4_K_M`; settings remain the harness `bench5/settings.json`; the seed remains `l5/pilot-resumption/cache/judge.jsonl`; corpus reads the existing l5 cache; generation uses the absent `l15/calibration/q4/cache` destination. The two thinking freezes share the sole fixed think0-bound generation under the existing plan. No labels, packet interpretations, fit invocation, generation retry, or feedback path is added.

The validated deployment remains `tmp/units/aggregate-successor-daemon-deployment.json`, hash `40442197423b574b61548feb702b55c948d77f61dd719d9d6b26e24ad3016e19`. Its retained service validation is `tmp/units/aggregate-successor-service-validation.json`. The root-owned loopback daemon remains PID 1620 according to `tmp/units/aggregate-successor-daemon-start.json`; this unit neither checked the live process nor touched it. The runner makes no separate service call beyond the selected experiment commands.

## Preserve custody and partial results

The runner reuses emitted `readBuild`, `readMatrixFiles`, and `hashFile` readers at `tmp/units/aggregate-successor-q4-execution-run.ts:13`. Those readers verify the canonical source/build membership, compiler and declaration identities, emitted output hashes, and resource bindings, and expose the exact matrix file census. The helper additionally captures HEAD and the deployment, seed, settings, launcher, sealed plan, and runner hashes. It keeps initial, command-boundary, and terminal readings; a changed reading stops the sequence before another spawn.

Absent destinations include the selected output directories, every expected artifact, generation cache, nested journals/errors/pid/status captures, and this unit's sequence and custody files at `tmp/units/aggregate-successor-q4-execution-run.ts:77`. No destination is removed or reused. This preserves every partial child capture and any failed generation output.

The direct child call uses `process.execPath`, explicit scaffold cwd, inherited launcher output, `shell: false`, and `windowsHide: true` at `tmp/units/aggregate-successor-q4-execution-run.ts:119`. The selected nested launchers retain their fixed caps and process-tree handling. No detached process or background shell is introduced. The runner waits for each tracked launcher to close, records its PID, exit, signal, duration from `performance.now()`, expected output hashes present at closure, and journal/error hashes at `tmp/units/aggregate-successor-q4-execution-run.ts:120`. Nonzero exit, spawn error, missing expected output, occupied destination, or changed custody stops execution. No retry or repair path exists.

The create-only records are `tmp/units/aggregate-successor-q4-execution-sequence.jsonl`, `tmp/units/aggregate-successor-q4-execution-custody-before.json`, and `tmp/units/aggregate-successor-q4-execution-custody-after.json`. An operational stop appends its diagnostic and attempts a terminal custody reading at `tmp/units/aggregate-successor-q4-execution-run.ts:148`. A failed custody reader is retained as an error record. Actual command results, nested raw captures, opaque packet identities, and process closure remain the separate execution driver's evidence; this preparation supplies no acceptance conclusion.

## Bound the outer launch

The proposed outer cap is 2880 seconds. The selected nested caps total 2520 seconds: the freeze/corpus stages retain their 240-second caps, and generation retains its 1800-second cap. The remaining 360 seconds cover custody readings, launcher transitions, cleanup at a child cap, and scheduling slack. This outer cap does not extend an inner cap.

The retained Q4 generation reading is 1,281,189 ms at `tmp/units/aggregate-final-calibration-driver-report.md:36`. That run's Q4 freeze and corpus stages took 1490 ms, 1504 ms, and 3737 ms at the same report's stage table. Those historical readings inform the proposal; they are not a successor duration or a reason to retry a refused fit. The fixed command caps remain unchanged.

## Record preparation limits

The execution helper, source/build readers, command plan, service/model commands, tests, compiler, format/lint gates, and Git commands were not executed by this unit. Preparation only read the bounded l14 runner/custody files and necessary source readers, wrote the owned helper/report, generated its textual adaptation diff without Git, hashed the prepared artifacts, and checked report citations. Existing accepted metadata controls and static plan comparisons were not repeated.

The helper is ready for root's source reading and accepted release seals. Runtime behavior and command outcomes remain unverified. No scope widening or missing preparation prerequisite was found.
