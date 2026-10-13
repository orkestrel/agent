# Independent offline verification of the r2 admission screen

The r2 admission screen passed the prescribed offline verification on Windows with Node `v24.21.0`. All frozen packet, operator, build, source, and predecessor bindings remained stable. The run made no model or daemon request.

## Custody

The frozen packet `tmp/units/aggregate-admission-screen-r2/packet-final.json` matched SHA-256 `5bcb670e5304dce5fd688500f1a8e62e1edbc01f14124513441ead0a51bb6470`; the bound operator digest was `75d4de27ef8f82e76ce80ae04b7f1281d217934bfa1359ff0e1ca652baa6b159`; and `.orkestrel/agent/instruments/harness/.build/build-manifest.json` matched `09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf`.

The verifier preparation at `tmp/units/aggregate-admission-screen-r2/verification-preparation-verifier-r2/packet-final.json` matched the frozen packet byte-for-byte: both files were 58,309 bytes. Its preparation plan recorded the same packet and operator hashes, with global and native dispatch counts at zero. The post-run check read all 72 packet bindings from disk and found no mismatch. All 10 files in `aggregate-admission-screen-inventory.json` matched their indexed hashes; its 10 paths matched the 10 paths in `aggregate-admission-screen-source.diff`. All 14 entries in the successor verification artifact's recorded predecessor baseline matched their current files.

The source diff, inventory, status, successor packet, plan, and verification artifact retained their pre-run hashes: `538e2e1b992bda2b0cf3836c4cec259d221245beb065269823df742a1c652933`, `4a1b643ad19affe5dce256efcedfa046a24a3475cc7364f0229856837932c56f`, `b2d4876273db5b4a493d31c3e4c7415dcd51ebc1d547fac4a8cd3e883b55f678`, `5bcb670e5304dce5fd688500f1a8e62e1edbc01f14124513441ead0a51bb6470`, `1805739f4d09e51ffde5d0a23fa47bfaa99cd508d71d78a9b554c187bddd6f75`, and `879249fe6be65d3141eef9f01830c94e66af675970238fb1fcb8cfaab7e6fe87`.

## Commands and collected results

The grouped command runner is `tmp/units/aggregate-admission-screen-verify-r2-runner.ts`. The canonical built launcher is `dist/agents/skills/orkestrel-dispatch/scripts/launch.js`. Its journal is `tmp/units/aggregate-admission-screen-verify-r2.journal.log`; its errors file is `tmp/units/aggregate-admission-screen-verify-r2.errors.log`. The launcher exited 0, was not capped, and reported 2,810 ms. The 180-second cap did not bind. The journal records each child command, real exit, duration, and stdout/stderr path.

| Check | Result |
| --- | --- |
| Scoped TypeScript check | Exit 0; 987 ms |
| Authored syntax checks for `types.ts`, `constants.ts`, `helpers.ts`, `Operator.ts`, `main.ts`, `prepare.ts`, `offline.config.ts`, `proof.test.ts`, and `negative.test.ts` | All 9 exited 0; each took 54–59 ms |
| Positive proof suite | Exit 0; 5 tests, 5 passed, 0 failed, 0 skipped, 0 todo; 333.6143 ms |
| Negative control suite | Exit 1 as required; 7 tests collected, 0 passed, 7 failed, 0 skipped, 0 todo; 226.2705 ms |
| Default `main.ts` invocation | Exit 0; 224 ms; offline message only. This was an additional check, not the named dispatch guard. |
| Create-only preparation | Exit 0; 277 ms; exact frozen packet hash and 0 dispatches |

The negative controls reached their intended failures: swapped evidence/candidate and candidate-byte mutation raised `Candidate/property custody mismatch`; omitted source raised `Source membership custody mismatch`; source-byte mutation raised `Ordered source custody mismatch`; wrong ranking direction, equal scores, and a reversed second pass each reached the assertion comparing actual `refused` with expected `passed`. The node:test runner collected all 7 cases; no collection or harness error occurred.

The grouped runner's offline slot invoked `main.ts` rather than the builder's named `offline.config.ts` guard. I retained that additional default-entry result and then ran the exact guard separately through the canonical launcher. Its journal is `tmp/units/aggregate-admission-screen-verify-r2-offline-guard.journal.log`, its errors file is `tmp/units/aggregate-admission-screen-verify-r2-offline-guard.errors.log`, its real exit was 0, it was not capped, and it took 165 ms. Its complete output reports `Offline global-fetch guard dispatches: 0; native dispatches: 0`. This correction added no source or frozen-input change.

The grouped runner's 14 child-command stdout/stderr pairs are preserved as bare bytes under `tmp/units/aggregate-admission-screen-verify-r2-<command>.{stdout,stderr}.bin`; command names and paths are recorded in the grouped journal. The separate offline-guard journal retains its complete command output, and its errors file records the uncapped exit. The test preparation fixture `proof-preparation-56840/` and occupied-output fixture were created by the existing proof test. No test was changed.

The preparation, positive proof, and named offline guard each recorded global-fetch dispatches 0 and native dispatches 0. The negative controls exercise local custody and ranking assertions only. No live command, model request, network operation, install, source edit, Git mutation, cleanup, or process termination ran.

## Process and workspace state

The grouped launcher recorded PID `47840`; the separate guard launcher recorded PID `68564`. Direct Windows process snapshots for both recorded PIDs and their direct descendants were empty after exit. Both launchers recorded identical before and after status: the pre-existing `.orkestrel/agent/instruments/bench4/Driver.mjs` modification and `.orkestrel/agent/instruments/results/l7/g4-think0/resource/` output. The verification authored only its runner, raw logs, and create-only test/preparation outputs under `tmp/units`.

Live forwarding through the exact r2 operator and model ordering remain unmeasured. This verification makes no claim about those observations.
