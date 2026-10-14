# Extended qualification verifier report

Verifier: native GPT-6 Luna max. Result: **PASS for execution-only qualification**. I read scalar projections from the accepted proof, plan, qualification, four cell readings/manifests, raw run summaries, and request logs. I did not call the model/service, build, access a GPU, or mutate evidence. I did not inspect the prior output-only failure beyond the accepted proof summary.

The qualification is marked `passed=true`, `policy=execution-only`, with the recorded limitation that it does not guarantee full-horizon semantic quality. All four declared cells (`q4/q2 × records/compaction`) have journal status `complete` and raw `run.json` status `complete`. The completed execution does **not** mean every task outcome succeeded: `q2-compaction` records 3 successful, 1 unsuccessful, 1 partial, and 1 empty outcome, with one unserved goal. This is an ordinary task result under the clarified execution-only policy; its run has no operational fault.

| Cell | Outcomes: attempted / successful / unsuccessful / partial / empty | Calls | Tokens | Agent answer calls (8192 cap) | Other one-token / auxiliary calls |
|---|---:|---:|---:|---:|---|
| q4 records | 4 / 4 / 0 / 0 / 0 | 86 | 168,481 | 14 | 2 agent calibrations, 4 flushes, 66 judges |
| q4 compaction | 4 / 4 / 0 / 0 / 0 | 18 | 81,380 | 11 | 2 agent calibrations, 4 flushes, 1 summarizer |
| q2 records | 4 / 4 / 0 / 0 / 0 | 99 | 276,365 | 27 | 2 agent calibrations, 4 flushes, 66 judges |
| q2 compaction | 4 / 3 / 1 / 1 / 1 | 21 | 91,099 | 14 | 2 agent calibrations, 4 flushes, 1 summarizer |
| **Qualification aggregate** | **16 / 15 / 1 / 1 / 1** | **256** | **617,325** | — | — |

The four raw cell request logs contain 224 rows in total (the cell-call sum above); the qualification’s aggregate counter is 256. Both are within the original 512-call allowance. The qualification reports 617,325 tokens, within the 1,000,000-token allowance. Its elapsed value is 1,639,413 ms, within the 1,800,000 ms cap; the retained uncapped launcher record is `exit=0 signal=none capped=false duration_ms=1639673`.

Every substantive `agent` generation request in the raw request logs used `num_ctx=20480` and `num_predict=8192`; all ended with `stop`, not `length`. Counts are 14, 11, 27, and 14 by table row. The q2 records row includes 24 thinking-enabled and 3 thinking-disabled requests, each with the same extended context/output settings. The two one-token agent calibration requests per cell, four one-token flushes per cell, and 66 one-token judge requests in each records cell ended with the expected `length`; these are not output-exhausted answer calls. The compaction summarizer request used `num_ctx=20480`, `num_predict=2048`, and completed with `stop`.

All 224 logged cell requests returned HTTP 200, have no failure entries, and each cell has zero `run.faults`. There are no positive retry counts (`manifest.retry=0` in every cell). Each manifest sets `timeout=360000` ms; the greatest observed request wall time is 52,853 ms, so no role request approached its deadline. The q2-compaction partial/empty outcome is accompanied by `unserved=1`; its run remains operationally complete with zero faults and zero retries.

The profile matches the accepted extension: context window 20,480, output reserve/predict 8,192, safety reserve 512, timeout 360,000 ms; thinking is enabled in the frozen manifest. Observed model capacity records confirm 20,480 context for q4 (`qwen3.5:4b-q4_K_M`, digest `d8b0f5e9760cd1682034f292d7ef72ec46f432149be0df7574bf2d6e92e38c04`) and q2 (`qwen3.5:2b-q4_K_M`, digest `78a738cc751e89cba72bb1feabf70f30c31772eb81a89a66af94ecea90dc5d11`).

The exact frozen build digest in the plan, proof, and build-manifest file SHA-256 is `21f65be21acf15f14dbd84d074c3a3fa1fac6b6e9e373adf4535d991fafe8bd2`, matching the required digest. `proof-extended.json` is passed and has SHA-256 `536c76b201719f0d46857f89f07952f68198c123e4ce705ca2c9563dde361762`; its referenced acceptance report hash matches the current `capacity-extended-proof.md` SHA-256 `a7e84854bd80bfe89ba3022e79a7ffeefebe45e590229c2a17681b8b5b3df746`. Each run identity is the expected `c1-<cell>` identity and each raw run’s vendor entry hash is `8f040acf72b6426246b79e5c2f31d3644291e4c08f49434ad1224e16f176311d`.

## Custody hashes

SHA-256 readings from `Get-FileHash -Algorithm SHA256`:

- `plan.json`: `b52eeab5722ef239a0041d7b1bda1db2e9087f493f5d6750ea4efb2329f34745`
- `qualification.json`: `56a37e912ad0f6d4125f01afd023f2a591ca843afd3a7e5637126df98f392d14`
- `journal.jsonl`: `30361b608a429582f021ca432db12b2a2c50c0b579bef2c1dcb79d3677c36e5b`
- `runtime.json`: `102f26fc97a3112a3b24a02d58e7c027856f66b5df2faefdead321eb0a197a23`
- `oracle.json`: `185ebb505d7bdcd45cd92f837ec6b92b982687ee6d8dda8b03f8a1236253ec6e`
- `workload.json`: `edb90e910a86e5e3dfa17d4b37995ac3a3b8ef620bedbcaf976b1f505452be34`
- `build-manifest.json`: `21f65be21acf15f14dbd84d074c3a3fa1fac6b6e9e373adf4535d991fafe8bd2`
- `q4-records/manifest.json`: `d6b80b62d57965908d4bac8677e577b4c4a90df5a3221b30293dfceb46e2af41`
- `q4-compaction/manifest.json`: `43f74f22591d3b31e429907a6604e47cd630e3f246c5100f3f2dc07d09d9fe80`
- `q2-records/manifest.json`: `13a84a2b95e5f9c3d2b43fc2ef92e6ca25a94fcb3a2fd9f0cfd819fd65e30560`
- `q2-compaction/manifest.json`: `cc6546535cc04968e5872976ac6178a56d996961d35c215f271a232db84be4e0`

## Commands and bare readings

- `Get-Item` on the qualification, plan, proof, launcher record, and cell raw files: measured before reading; qualification 47,750 bytes, plan 11,942 bytes, proof JSON 456 bytes, accepted proof 1,617 bytes; cell reading files 4,323–14,600 bytes; request logs 878,607–2,247,710 bytes.
- `Get-Content -Raw <qualification.json> | ConvertFrom-Json`: `passed=True`, `policy=execution-only`, `elapsed=1639413`, `calls=256`, `tokens=617325`; four readings had `attempted=4` each, with q2-compaction’s `successful=3, unsuccessful=1, partial=1, empty=1`.
- Scalar projection of each raw `run/run.json` and line-wise scalar projection of `run/requests.jsonl`: all statuses `complete`, zero faults, zero retry, all request HTTP statuses 200; per-cell request/outcome counts and role options are tabulated above.
- `Get-Content -Raw <proof-extended.json> | ConvertFrom-Json`: `passed=true`; build digest matches the required digest; proof’s acceptance-report hash matches the current accepted report.
- `Get-FileHash -Algorithm SHA256` on the qualification, plan, journal, input manifests, build manifest, and four cell manifests: exact readings listed under Custody hashes.

This verifies the bounded preflight only. It is not evidence of full 96-goal capacity, complete task success, or semantic quality.
