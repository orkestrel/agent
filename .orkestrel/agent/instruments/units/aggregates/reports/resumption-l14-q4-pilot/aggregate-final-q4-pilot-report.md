# Qwen4 thinking-disabled aggregate pilot

## Invocation and closure

The first pilot was launched at the root-authorized frozen HEAD `9cdbdaf6dccfd7d925e93fabce34700ced6de68f`, with the supplied argv unchanged:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal .orkestrel/agent/instruments/results/l14/logs/q4-think0-pilot.jsonl --errors .orkestrel/agent/instruments/results/l14/logs/q4-think0-pilot.err --cap 10800 --status -- node .orkestrel/agent/instruments/harness/.build/bench5/matrix.js pilot --frozen .orkestrel/agent/instruments/results/l14/q4-think0/freeze/manifest.json --resource .orkestrel/agent/instruments/results/l14/q4-think0/resource/manifest.json --fit .orkestrel/agent/instruments/results/l14/calibration/q4/fit/fit.json --out .orkestrel/agent/instruments/results/l14/q4-think0/pilot --live
```

The dispatcher launched Matrix PID `26588`. It ended with exit code `3`, no signal, no watchdog cap, and elapsed time `1,835,032 ms`. The emitted run is complete and has 24 served rows; all planned goals were attempted. The bare retained terminal records are `.orkestrel/agent/instruments/results/l14/logs/q4-think0-pilot.jsonl` (24 goal rows, SHA-256 `bb315bc96a37611d6ca25274da004fc601911d9ec3832f1775c9f967406f5870`) and `.orkestrel/agent/instruments/results/l14/logs/q4-think0-pilot.err` (`exit=3 signal=none capped=false duration_ms=1835032`, SHA-256 `403df495f295580f28bf9e3af4733b4f29e7ff3b6fbc865f600e83b75d1a9afe`). The first and last logged goal names are `g01-luis-refund-amount` and `g24-halvorsen-claim`.

## Emitted validation and observations

The existing emitted matrix readers validated the frozen, resource, fit, pilot manifest and complete attempt. The resource was accepted with budget `{ reserve: 512, window: 3072, ceiling: 3072, predict: 0 }`. The pilot manifest is SHA-256 `626b2df79196c14395bd920b815998e18565de35e8ddb507d68150c712d65035`; the retained run is `.orkestrel/agent/instruments/results/l14/q4-think0/pilot/development/l6-q4-think0-aggregate-v1`. Its `accepted` field is false. The unchanged strict criterion reported these findings:

- Stale-phrase finding on request 64 for `g04-halvorsen-ticket`, carrying `esc-2291`.
- Stale-phrase finding on request 65 for `g04-halvorsen-ticket`, carrying `esc-2291`.
- Stale-phrase finding on request 67 for `g05-luis-approval-note`, carrying `mx-4471`.
- Paired gauge drift beyond the ledger bound for `g02-luis-card`, `g03-grace-escalation`, `g04-halvorsen-ticket`, `g05-luis-approval-note`, `g06-kenji-shipping`, `g08-halvorsen-credit`, `g09-kenji-gift-note`, `g10-sigrid-callback`, `g11-grace-signoff-today`, `g14-beatriz-remedy`, and `g20-copperline-manager`.

The initial selected context and gauge match the resource run: digest and tail equal, scale `1.1633254716981132` in both picks, and gauge `{ scale: 1.1633254716981132, overhead: 467 }` in both runs. The later per-goal scale ratios exceed the sealed bounds on the 11 listed goals; the emitted reader details are retained in the associated custody evidence, with relative deltas ranging from `0.06327` to `0.13051`. This reports the instrument’s qualification findings only and makes no answer-quality or adoption judgment.

## Exposure and cost

The emitted exposure reader reports `18` exposed goals out of `24` served. Cost measurement includes all roles, including failed requests; missing usage is zero in each row:

| Phase | Role | Requests | Wall ms | Prompt | Completion | Missing usage |
|---|---|---:|---:|---:|---:|---:|
| calibration | agent | 2 | 22,191 | 4,413 | 2 | 0 |
| trajectory | agent | 39 | 393,099 | 77,385 | 2,623 | 0 |
| calibration | judge | 0 | 0 | 0 | 0 | 0 |
| trajectory | judge | 238 | 840,231 | 231,154 | 238 | 0 |
| calibration | summarizer | 0 | 0 | 0 | 0 | 0 |
| trajectory | summarizer | 38 | 393,752 | 28,300 | 4,861 | 0 |
| calibration | flush | 0 | 0 | 0 | 0 | 0 |
| trajectory | flush | 24 | 133,613 | 528 | 24 | 0 |

The measured wire total is 341 requests, 1,782,886 ms, 341,780 prompt tokens and 7,748 completion tokens. Metadata usage is 41 requests / 125 ms. The reader reports elapsed `1,792,960 ms`, stage `1,235,784.499 ms` and flush `133,640.354 ms`. Judge-cache accounting is 89 category, 540 topic, 112 amends, 15 supersedes and 28 agree hits; 200 agree and 38 change misses; zero transient misses.

## Seals and process custody

The closing receipt at `tmp/units/aggregate-final-q4-pilot-custody.json` records the frozen identities and artifact hashes. They remain equal to the released values: build `d361e9d8ec607ae7e21bcee966904effa2be9a0ccaa972eef8d25b540e977c54`, deployment `c20472169bc4a0767cfa9882d7674825d84fa4be338b9bab1de386425c743eed`, freeze `2eaffe7d6c4b8f3fc83802130b8b0be18778abb5b4362a154157bcbcab41d831`, resource `63195146d3ec631b50ca7a00dc7b74b3aabb5ed13bc32fbd370f47fd197ae683`, and fit `f694c01ffd924c8c59a17a3e190c4a2e90f4bcc89b4c82024a281f4954f1be56`. The emitted build reader census is unchanged: 494 sources, 1 resource, 202 compiler inputs, 624 outputs and 76 matrix files. HEAD remains `9cdbdaf6dccfd7d925e93fabce34700ced6de68f`.

Matrix PID `26588` is closed; the released daemon PID `26472` remains alive. No source, build, HEAD, fit, freeze, resource, service or criterion mutation occurred in this unit. Root-owned campaign prose changes and pre-existing unrelated dirt remain outside the source/build seal. The previously disclosed adjacent full-view capacity observation (an eviction concurrent with a later Qwen load and separate `/api/chat`, client ownership unknown) remains unresolved and was not probed or used to relax any integrity check.

The custody receipt contains hashes for the run metadata, rows, requests, turns, selections and aggregates in addition to the manifest and terminal logs. All run artifacts remain in place; no cleanup was performed.
