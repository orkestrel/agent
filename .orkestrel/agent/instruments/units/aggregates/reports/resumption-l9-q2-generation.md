# Qwen 2B think0 live preparation

All three prescribed phases completed under the released canonical build. The generation manifest binds to Qwen `qwen3.5:2b-q4_K_M`, `think:false`, the fixed deployment, and the freeze/corpus outputs. It reports `complete:true` and no manifest errors. This is a retained calibration packet; no fit, blind labeling, quality judgment, held-out evaluation, or baseline run was performed by this unit.

## Custody and preflight

- Canonical build manifest: `.orkestrel/agent/instruments/harness/.build/build-manifest.json`, SHA-256 `76c3c9c4718f69dbb4cd76eb5f95e49c42b3bfe8924ad7ef89de8832db720734`.
- Fixed deployment: `tmp/units/aggregate-comparison-deployment.json`, SHA-256 `3403efae36af29daf63123faac2017c82f94b5be3c8816c8611828faa59eef31`.
- At release preflight, recorded PID 38284 (`ollama`) and PID 60892 (`node`) were live, TCP `127.0.0.1:11434` accepted connections, and all four create-only destinations (freeze, corpus, cache, generation) were absent.
- No second Ollama client was active per root's release. Generation launcher PID 59432 closed after exit 0.

## Commands and phase evidence

All commands ran from the scaffold root through `node .agents/skills/orkestrel-dispatch/scripts/launch.ts`. The emitted entrypoints under `.orkestrel/agent/instruments/harness/.build/bench5/` were used.

1. Freeze, 2026-10-11 13:38:41–13:38:43 UTC, cap 240s, exit 0, uncapped, 1,217ms:

   `node .orkestrel/agent/instruments/harness/.build/bench5/matrix.js freeze --key q2 --think false --seed .orkestrel/agent/instruments/results/l5/pilot-resumption/cache/judge.jsonl --settings .orkestrel/agent/instruments/harness/bench5/settings.json --deployment tmp/units/aggregate-comparison-deployment.json --out .orkestrel/agent/instruments/results/l9/q2-think0/freeze --live --url http://127.0.0.1:11434`

   Manifest: `.orkestrel/agent/instruments/results/l9/q2-think0/freeze/manifest.json`, SHA-256 `87c3b7b5b5756b0285f26302f3dfb4beb377e20f394973d011a7d192dc9df3ac`.

2. Corpus freeze, 2026-10-11 13:38:56–13:38:59 UTC, cap 240s, exit 0, uncapped, 2,555ms:

   `node .orkestrel/agent/instruments/harness/.build/bench5/refit.js freeze --frozen .orkestrel/agent/instruments/results/l9/q2-think0/freeze/manifest.json --cache .orkestrel/agent/instruments/results/l5/pilot-resumption/cache --model qwen3.5:2b-q4_K_M --out .orkestrel/agent/instruments/results/l9/calibration/q2/corpus`

   Corpus manifest SHA-256 `1af39db19d5be69ad2af6d1af4f1fc9d8d199527bbe51ba6fec52915d1820fb2`; corpus content hash `27d07d8b2a0954f25c64867370730c86f8665b0207868263b96ada531bedf226`. It records 24 requests, 162 occurrences, 49 initial candidates, and zero transient misses.

3. Live generation, 2026-10-11 13:39:14–13:48:58 UTC, cap 3,600s, exit 0, uncapped, 584,451ms:

   `node .orkestrel/agent/instruments/harness/.build/bench5/refit.js generate --frozen .orkestrel/agent/instruments/results/l9/q2-think0/freeze/manifest.json --corpus .orkestrel/agent/instruments/results/l9/calibration/q2/corpus --cache .orkestrel/agent/instruments/results/l9/calibration/q2/cache --model qwen3.5:2b-q4_K_M --out .orkestrel/agent/instruments/results/l9/calibration/q2/generation --live --url http://127.0.0.1:11434`

   Generation manifest `.orkestrel/agent/instruments/results/l9/calibration/q2/generation/manifest.json`: SHA-256 `d44390638081f8ad1e206c341f75dd3e1f7ae76dd3d5256a8cecaaaab7d1f7c1`; complete true; manifest error count 0; model `qwen3.5:2b-q4_K_M`; generation settings allowance 555, retry 2, predict 160. The manifest binds the freeze and deployment hashes above, corpus hash `27d07d8b2a0954f25c64867370730c86f8665b0207868263b96ada531bedf226`, attempts hash `72cfb53842ca1dc408ecc34cfcb4d56d3e6f16a1472c2527919c933fc4497d98`, and packet hash `606faa019bab5d6724ced6b0e1c118568b2c585befeeb43c1c6943fdf514bd58`.

## Retained outputs and counts

- Blind packet: `.orkestrel/agent/instruments/results/l9/calibration/q2/generation/packet.jsonl`, 168 rows, SHA-256 `606faa019bab5d6724ced6b0e1c118568b2c585befeeb43c1c6943fdf514bd58`.
- Attempts: `.orkestrel/agent/instruments/results/l9/calibration/q2/generation/attempts.jsonl`, 168 rows, SHA-256 `72cfb53842ca1dc408ecc34cfcb4d56d3e6f16a1472c2527919c933fc4497d98`.
- Controls: `.orkestrel/agent/instruments/results/l9/calibration/q2/generation/controls.jsonl`, 12 rows, SHA-256 `b5198eaab196d1b218a1bc8728d2e1d3c2496f8fbe64a7b089c9966a089da570`.
- Evidence bundle: `.orkestrel/agent/instruments/results/l9/calibration/q2/generation/evidence.json`, SHA-256 `ac97984f7db6dd8ebadb2d393b4f11842234e4db7cb6788af084b7e62851b531`.
- Cache ancestry: initial judge cache hash `c52b71f94ab1c2e742a6d6b698bc8fc278b2de1885e4ebdde75caf733355d15e`; resulting `cache/judge.jsonl` hash `5c60f1add1452cc21f09eecc204e078c24b2f4cfd7ed72fc38aa2ee66a5a7b3e` (1,125 rows), and `cache/summary.jsonl` hash `3f95adbb92bcfe395e857e0e690a507e3407b7b1cd32150e73ba498b77cf9f67` (52 rows). Cache lineage file hash: `7b5678a97c40f0eacdca1dbc23c962afd820e0f67e4b7bc3c51af6e127ec81db`.
- Attempt records contain 52 rows marked sent and six failure entries. The manifest itself reports no generation errors. Summed usage recorded across attempt rows: 100,433 prompt tokens, 16,191 completion tokens, 116,624 total tokens; summed attempt wall fields 525,275.5ms. These are recorded usage totals, not a billing estimate. Launcher elapsed time was 584,451ms.

## Dispatch logs and closure

- Freeze journal `tmp/units/aggregate-l9-q2-live-2-freeze.jsonl` is empty (SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`); errors file ends `exit=0 signal=none capped=false duration_ms=1217` (SHA-256 `b32fc478fcb6dba0a86f230a736e2969492accd270d0b1f991123aa170e7637c`).
- Corpus journal `tmp/units/aggregate-l9-q2-live-2-corpus.jsonl` is empty (same empty-file hash); errors file ends `exit=0 signal=none capped=false duration_ms=2555` (SHA-256 `534d941d3bd73b1c4499a1a0e8479563c20b9e37fc759964898986484ef24b50`).
- Generation journal `tmp/units/aggregate-l9-q2-live-2-generation.jsonl` is empty (same empty-file hash); errors file ends `exit=0 signal=none capped=false duration_ms=584451` (SHA-256 `cf3db48cef8b368dcc021983cb0ec535b69c17c528e6696a8b9790c89c8b5a4f`).
- All three launcher child processes closed. No retry was made. No fit, labels, scoring, held-out data, or candidate text was used for classification by this unit.
