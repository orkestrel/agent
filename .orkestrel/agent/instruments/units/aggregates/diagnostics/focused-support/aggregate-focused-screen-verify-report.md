# Independent offline verification: aggregate-focused-screen

Run from `C:/Users/mikes/WebstormProjects/scaffold` on Windows PowerShell. The report is evidence only; it makes no semantic-method or adoption ruling.

## Launch and completion

Canonical launcher command:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-focused-screen-verifier.jsonl --errors tmp/units/aggregate-focused-screen-verifier.err --cap 120 --status -- node tmp/units/aggregate-focused-screen/verify.ts --output tmp/units/aggregate-focused-screen/independent-evidence
```

Launcher exit 0; grouped command exit 0; `capped=false`; duration 3111 ms. Recorded PID 15828 was absent from `Win32_Process` after completion, with no child processes. Launcher error artifact ends `exit=0 signal=none capped=false duration_ms=3111`.

The grouped driver was read before execution. It calls each command with `spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' })`, retains stdout/stderr and expected/actual status, and throws on spawn errors or unexpected status. The negative suite alone expects exit 1. Therefore nonzero statuses are not hidden: they are retained and explicitly checked against expectation.

## Gate results

- `node_modules/typescript/bin/tsc -p tmp/units/aggregate-focused-screen/tsconfig.json`: exit 0.
- `node --check tmp/units/aggregate-focused-screen/constants.ts`, `helpers.ts`, `main.ts`, `negative.test.ts`, `offline.config.ts`, `Operator.ts`, `prepare.ts`, `proof.test.ts`, `types.ts`, `Verifier.ts`, and `verify.ts`: each exit 0.
- `node --test tmp/units/aggregate-focused-screen/proof.test.ts`: exit 0; 8 passed, 0 failed, 0 skipped/cancelled/todo.
- `node --test tmp/units/aggregate-focused-screen/negative.test.ts`: expected exit 1; all 11 tests collected and failed at their intended assertions. Controls and observed diagnostics: dropped span — `Dropped nonwhitespace suffix coverage`; changed offset — `Span offset/text custody mismatch`; changed text — `Span offset/text custody mismatch`; swapped chronology — `Ordered source custody mismatch`; omitted source — `Source membership custody mismatch`; corrected candidate drift — `Corrected candidate single-line custody mismatch`; corrected focus drift — `Corrected partition/focus custody mismatch`; missing reading — actual `incomplete`, expected `passed`; equality — actual `refused`, expected `passed`; wrong direction — actual `refused`, expected `passed`; reversed pass — actual `refused`, expected `passed`. Diagnostics are assertion failures in `helpers.ts` or the named negative test assertions, not import or harness faults.
- `node tmp/units/aggregate-focused-screen/offline.config.ts`: exit 0; guarded default reports no model/network request.
- `node tmp/units/aggregate-focused-screen/prepare.ts --output tmp/units/aggregate-focused-screen/independent-evidence/census`: exit 0.

Bare stdout/stderr for all these commands is retained in `tmp/units/aggregate-focused-screen/independent-evidence/verification.json`; the full launcher journal and error/status capture are `tmp/units/aggregate-focused-screen-verifier.jsonl` and `.err`.

## Offline and custody observations

All observed guarded runs report `dispatches=0`, `modelRequests=0`, and `Offline global-fetch guard dispatches: 0; native dispatches: 0`. This includes both positive-suite preparations, guarded default, and independent preparation. No network or model request was made.

Independent preparation reproduced `packet-final.json` at 64259 bytes with SHA-256 `52aa96b66f45b9cad0275cd6db52e63f1a12ffb9f4b80e84132831f9f885cf11`, matching the writer report and checked-in source packet. Operator digest matches `678dacdd3f72ae2a9eef46974b46f4ef2a7e5095dfc7d1e9fc9e3d6a15e8026b`.

The regenerated packet declares 76 file bindings. Independently hashed every bound path: 76 present, 0 byte-count or SHA-256 mismatches. Regenerated plan and packet agree with the writer-reported build manifest (`09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf`, 208461 bytes), corrected specification (`bd907fbb6b214f3fba41115e8ef31a83a58a5174d26ae153efc66d5c893bae71`, 5625 bytes), accepted label record (`32df326cece3fd686ae6bda040af74aee30254687684d93f153c71e9b9e53cb2`, 1411 bytes), and predecessor packet (`5bcb670e5304dce5fd688500f1a8e62e1edbc01f14124513441ead0a51bb6470`, 58309 bytes). The predecessor remains at the writer-reported hash. The packet carries the writer-reported model identity `hf.co/sky7350/Mica-v0.1-4B:Q4_K_M`, seed 1.1244734010661372, `num_ctx=4096`, `num_predict=1`, `temperature=1`, and runtime identity `mica-native-2026-10-07-v1`.

Writer-reported source packet, specification, labels, and predecessor hashes match independent packet, plan, and current-file observations. The verifier inventory records hashes and byte counts for the unit TypeScript/config files. The corrected specification and accepted label record are bound by the regenerated packet.

## Status and deviations

Verifier-captured git status and final `git status --porcelain` both show only the preexisting `.orkestrel/agent/instruments/bench4/Driver.mjs` modification. Verifier-captured diff is likewise that unrelated file only. No source changes or other tracked status changes were observed. No expected gate, output-vacancy, binding, or process-completion deviation occurred.

No live fit, model discrimination, token-fit, or adoption conclusion follows from these offline gates.

The exact captured command output is separated into `tmp/units/aggregate-focused-screen/independent-evidence/bare-stdout.jsonl` and `tmp/units/aggregate-focused-screen/independent-evidence/bare-stderr.jsonl`, with command arguments and exit codes beside each text field. Launcher `--status` captured identical before/after contents in `tmp/units/aggregate-focused-screen-verifier.jsonl.status-before.txt` and `tmp/units/aggregate-focused-screen-verifier.jsonl.status-after.txt`; both contain only the preexisting Driver.mjs modification. The recorded PID is in `tmp/units/aggregate-focused-screen-verifier.jsonl.pid`.
