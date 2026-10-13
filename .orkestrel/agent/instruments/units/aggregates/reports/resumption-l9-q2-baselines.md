# Qwen 2B think0 development baselines

The records resource run completed and was accepted. The subsequent full-view preflight stopped with exit 1 before acceptance. Its partial files are retained. No retry, fit, label, score-based reserve change, or semantic/adoption judgment was made.

## Custody

- Canonical build manifest `.orkestrel/agent/instruments/harness/.build/build-manifest.json`: SHA-256 `76c3c9c4718f69dbb4cd76eb5f95e49c42b3bfe8924ad7ef89de8832db720734`.
- Frozen manifest `.orkestrel/agent/instruments/results/l9/q2-think0/freeze/manifest.json`: SHA-256 `87c3b7b5b5756b0285f26302f3dfb4beb377e20f394973d011a7d192dc9df3ac`.
- Deployment `tmp/units/aggregate-comparison-deployment.json`: SHA-256 `3403efae36af29daf63123faac2017c82f94b5be3c8816c8611828faa59eef31`.
- Resource and full outputs were absent before the run. The designated daemon PID 38284 and launcher PID 60892 were live; `127.0.0.1:11434` accepted TCP connections. The resource launcher PID 66688 and full launcher PID 70700 are both closed.

## Resource qualification

Command:

`node .orkestrel/agent/instruments/harness/.build/bench5/matrix.js resource --frozen .orkestrel/agent/instruments/results/l9/q2-think0/freeze/manifest.json --out .orkestrel/agent/instruments/results/l9/q2-think0/resource --live --url http://127.0.0.1:11434`

Launched through `node .agents/skills/orkestrel-dispatch/scripts/launch.ts` on 2026-10-11 13:50:30 UTC; closed 13:57:27 UTC. Cap 3,600s; exit 0, uncapped; elapsed 416,794ms. The launcher journal is `tmp/units/aggregate-l9-baselines-2-resource.jsonl`, SHA-256 `5aeb041aadd6e3b10c2ab47b5e83517df47563aef41883899860dc22069d3414`. Its errors file `tmp/units/aggregate-l9-baselines-2-resource.err` records `exit=0 signal=none capped=false duration_ms=416794`, SHA-256 `2b303981c2248ed1bf834825359403cc6c34e887eb0c42d6bc8b12f05f938f47`.

Accepted resource manifest `.orkestrel/agent/instruments/results/l9/q2-think0/resource/manifest.json` has SHA-256 `81f29fd3494dc6d635abcac79e287e8403b2492fecbaf1dde53a0a5bb6a95338`. It records `accepted:true`, reserve 512, request window 3,072, ceiling 3,072, and predict 0. The retained run is `.orkestrel/agent/instruments/results/l9/q2-think0/resource/reserve-512/l6-q2-think0-records-v1`.

The retained run has 24 row entries, 78 request records, 78 calls, 53 turns, and 25 selection records. It records no attempt failures. `requests.jsonl` SHA-256 `ac538e4f74b220f611b1ebb61b042b9e8819e80885e787634ed71a8616860b8e`; `rows.jsonl` `429420e964a6f6712a7946b988c490df5e62a019d935b8692fde1e77d8b49412`; `turns.jsonl` `9c3686a1621194683c4d0ef06a67b6d25aad37c1b0f604bbac08d13ff521b8dd`.

Recorded request usage totals: 101,937 prompt tokens and 3,294 completion tokens (105,231 combined); summed request wall fields 391,119ms. These are observed usage fields, not billing estimates.

## Full-view preflight

Command:

`node .orkestrel/agent/instruments/harness/.build/bench5/matrix.js full --frozen .orkestrel/agent/instruments/results/l9/q2-think0/freeze/manifest.json --resource .orkestrel/agent/instruments/results/l9/q2-think0/resource/manifest.json --out .orkestrel/agent/instruments/results/l9/q2-think0/full --live --url http://127.0.0.1:11434`

Launched through the same dispatcher on 2026-10-11 13:58:19 UTC; closed 14:01:21 UTC. Cap 2,400s; exit 1, uncapped; elapsed 182,083ms. Journal `tmp/units/aggregate-l9-baselines-2-full.jsonl`, SHA-256 `dc854daf65975097a606100f2341822a26b86078f5b614ffbb843e6338d34b79`. Errors `tmp/units/aggregate-l9-baselines-2-full.err`, SHA-256 `397e20dd325c4034e606527c260be4b61817644161f20a5451dd22b76d03292f`.

The command threw `operational matrix fault has invalid thinking custody` from `verifyMatrixFeasibility` via `Matrix.#full`. The full manifest `.orkestrel/agent/instruments/results/l9/q2-think0/full/manifest.json` SHA-256 is `6e5b7e3c28c9fa66d695c68d4bef1ef8b8f63bab5f6847428a34c42a15b7b38a`; its attempt is not accepted and records eight failures. The retained partial run is `.orkestrel/agent/instruments/results/l9/q2-think0/full/preflight/l6-q2-think0-full-v1`.

The partial run contains five row entries, 21 request records, 21 calls, 15 turns, seven selection records, and 277 judgment records. The recorded request rows mark 20 sent and contain two failure entries. Recorded usage totals in those request rows are 45,406 prompt tokens and 574 completion tokens (45,980 combined), with 143,213ms summed request wall fields. These are observed request fields, not billing estimates.

The retained partial `requests.jsonl` SHA-256 is `6310d9a809c7ae1495853dab22d1a7a01e96e8260880e61cf983079ace156738`; `rows.jsonl` `63758e52aab838f414cd4851b35a518b5b37f65f5ebfe31104a0155263d18648`; `turns.jsonl` `5b6bf44b4ed0ae0725bc0fb7198f0a833650b35655221b84a74d892688d5abe1`.

The bound records 24 goals, reserve 512, window 1,068,663, effective ceiling 262,144, growth 512, observed 2,643, payload 3,636, 62 requests, nine turns, and seed 4,666. This full-view preflight is incomplete and supplies no accepted full-view baseline.

## Deviation record

- Expected: accepted full-view preflight after the accepted resource run.
- Found: exit 1 from the operational thinking-custody verification; full manifest attempt `accepted:false` with eight failures.
- Evidence: the stderr and retained partial manifest cited above; five partial rows and 21 requests remain available.
- Done: stopped after the first nonzero command, retained partial files, and launched no retry or further service work.
- Hypothesis: the full-view run's operational matrix fault carries thinking custody inconsistent with the verifier's required matrix identity. This is not classified as model infeasibility.

No held-out answer data was opened. Root retains feasibility acceptance and later semantic grading.
