# Qwen 4B records resource report

## Execution

The frozen Q4, thinking-disabled resource phase completed and the resource manifest records `accepted: true`. The outer canonical launcher exited `0`, uncapped, after `274,960 ms`; its journal records driver child PID `68724`, exit `0`, no signal, and `capped: false`. The driver spawned nested canonical launcher PID `46304`, whose exit record reports `0`, no signal, `capped: false`, and `274,754 ms`. The inner resource execution reports complete status and `272,269 ms` wall time. Both recorded PIDs were absent after exit.

The exact command was:

```powershell
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-l7-resource-q4-verify.jsonl --errors tmp/units/aggregate-l7-resource-q4-verify.err --cap 900 --status -- node tmp/units/aggregate-live-feasibility-l7.ts --execute --phase resource --key q4 --think false --manifest-hash 09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf
```

The driver retained its canonical inner watchdog of `14,400 s`; the outer launcher supplied the `900 s` operational watchdog. The outer exec session was `12275`. No retry or additional phase ran.

Bindings checked before execution: driver `tmp/units/aggregate-live-feasibility-l7.ts`, SHA-256 `6949f241540dc3ac19514f775f89f3d54ae29f09411501b04b2269dd9bc2f082`; canonical build manifest `09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf`; frozen Q4 manifest SHA-256 `e77d3b27a0a5b5dd6d17a998f4887e734061d5b8f1290f4b03e18c1eaa330656`. The freeze manifest's 79 bound files (including source, settings, seed, census, and tags) still match their recorded hashes. The model inventory records `qwen3.5:4b-q4_K_M` with the frozen digest `d8b0f5e9760cd1682034f292d7ef72ec46f432149be0df7574bf2d6e92e38c04`; all captured requests use that model with `think=false`.

## Resource evidence

The resource manifest contains one complete attempt: reserve `512`, window `3072`, predict allowance `0`, accepted `true`, resource refusal `false`, and no recorded failures. The run is copy `1`, arm `records`, phase `resource`; it covers all 24 frozen goals. The 24 row identifiers are unique and match the run's goal membership.

The run records `67` requests sent. All 67 request entries have distinct sequences from `1` through `67`, each is marked sent, each has status `200`, and all match the call ledger's sequences. Request and row usage fields are present for all entries. Their artifact-level sums are retained separately: the 67 request entries report `79,563` prompt, `2,560` completion, and `82,123` total tokens; the 24 per-goal row usage records sum to `169,694` prompt, `3,032` completion, and `172,726` total tokens. These are distinct recorded aggregation levels and are not combined. No price or tariff is present, so monetary cost is unavailable.

## Artifact custody

The resource output was vacant before execution. Every hash in the resource manifest was recomputed successfully for its 10 bound artifacts, and all 79 frozen input bindings remained unchanged. Raw request/response evidence is retained in `requests.jsonl`; the machine-readable call boundaries are in `calls.jsonl`. No response-quality or score ruling is made here.

| Artifact | SHA-256 |
|---|---|
| resource `manifest.json` | `9133fc224bee9d4af9e9a483e7fac7798d58c36bac311ca9061c22c1e8cd1b34` |
| attempt `execution.json` | `7cc41f08edce83b843f26e33ce3ef3031f7a4078616ce85df66d370178299f5f` |
| `run.json` | `ca556f64a117b21991107ae39e290ef7854ca6070fe3c0c9eb203c392e84fd0c` |
| `requests.jsonl` | `29145e1657a2bf97e7285f04b7f62aca5e374c72a9c766adba41faf5706b468a` |
| `calls.jsonl` | `9410b0c592203531f08c173ac712137b504bc7afe89cf75633e3b7dc57860a56` |
| `rows.jsonl` | `b8e9f2ce08a6748fdec19ba9ae5f9a5236638e2bca429e392e7045d84ea6979d` |
| `model-inventory.json` | `6fb04221184bcf46ef33dbb17c79bee4eb1fc2eb8c0fce74593f58c09a4ca986` |
| inner stdout/log | `4c2ccdf627f2591fc28fd075c88f46d26862b873ca724a9701398b62388021a2` |
| inner exit/error record | `e4bd8ecf9d8784ad948a6998b389d0b6ac3b7e56fab627278f60c6afe7bcf3df` |
| inner PID record | `501ffc84801ab64bcd98ee6f0a22fcaa3a258736aff82a9a2ec8df1a0eb4d6fc` |
| outer journal | `61f2cde79e3f1ebea07b8dba347ccca360372b018b6b7b69ce2feb0c0d86d023` |
| outer exit/error record | `6ed19d3da6e08fa29a2ff3e360c094423b162ffdc64f391953324a608e7ff617` |

The outer launcher status snapshots differ by two expected untracked paths added during the run: this unit's `.orkestrel/agent/instruments/results/l7/q4-think0/resource/` and concurrent Q2 evidence at `.orkestrel/agent/instruments/units/aggregates/diagnostics/q2-full-failure/`. Their snapshot hashes are `912cef89d96d68b604ebc9ae25931937f736194071760db79fb3f675ab862aad` before and `f7b2fb1d7d4d2d1d829e91b794821bbf42cacd13e925a5538c35dba0596cb330` after. No bound input changed.

This report records only the frozen resource measurement. It does not grade responses, select a later reserve, or authorize a full phase, pilot, fit, evaluation, retry, or further inference.
