# Live counterfactual verification report

## Execution and custody

Executed the frozen eight-request sequence with the native verifier. The dispatch launcher exited `0`, uncapped, in `22,635 ms`; the retained launcher error/status record states `exit=0 signal=none capped=false duration_ms=22635`. The launcher execution session was `4671`, and the operator child PID was `55028`; PID `55028` was absent after completion. No retry or additional inference request was made.

Exact command:

```powershell
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-judge-counterfactual-live-verify.jsonl --errors tmp/units/aggregate-judge-counterfactual-live-verify.err --cap 600 --status -- node tmp/units/aggregate-judge-counterfactual/main.ts --execute --packet 438710a277663ca0c28a2b6bf3f6c47b354312c12ddb02d0cd697a212499c11f --build 09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf --operator 33570ee0bb82af8786854543ab9edafcde11c5309fa2a684aa16b5e438fa6756 --output tmp/units/aggregate-judge-counterfactual/live-reviewed-repair-1
```

Frozen identities: packet `438710a277663ca0c28a2b6bf3f6c47b354312c12ddb02d0cd697a212499c11f`; typed plan `e4f5dfce5b1d6c6fdaf62ddded496c8bb69483c7e4e98f5923ba3d2fcd481f88`; build manifest `09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf`; operator `33570ee0bb82af8786854543ab9edafcde11c5309fa2a684aa16b5e438fa6756`; repaired Completion source `b4c3d9a38a4b39ce7210d5b3cead494ff6d13919acb807d657a595e309e89879`; repair report `65006cce1511ac400acfe2e8eb5fccc56ab10505a1697bda8badee0577776462`.

The output has eight request/response pairs and no transport-error artifacts. Every request body matched its frozen packet rendering and its recorded length/hash; every response body matched its response sidecar and wire-evidence length/hash. All eight HTTP responses were 200, with content-length agreement, requested model, `done_reason=length`, 20 top logprobs, normalized output, and prompt/completion usage fields. Packet bindings remained unchanged. The launcher journal is empty; launcher error/status hash is `6d46a589cc2542b4399bbc6a3a0d1cc04c6db800b95676cc3067b3057f8d4b53`.

The daemon tag endpoint returned HTTP 200 before and after execution. The raw tag bytes were 3,451 bytes in both snapshots, SHA-256 `6fb04221184bcf46ef33dbb17c79bee4eb1fc2eb8c0fce74593f58c09a4ca986`; both snapshots included the requested model `hf.co/sky7350/Mica-v0.1-4B:Q4_K_M` with digest `ccc93a29870522845fccafeb24fbef6c7307995fd9db105cb5c0abff8da3ce9b`. Tag metadata matched across the two checks.

Output custody hashes:

| Artifact | SHA-256 |
|---|---|
| `custody.json` | `153fa1b8431e347882e8426b532751038b54ccb78b36bc38bfcbe37b3de76a15` |
| `outcome.json` | `e4ae50af209a9c273434221fe325d9505c0ff431892982db39926e4c718a1d99` |
| `analysis.json` | `4a63f6e939ee7e0cf5ec5df7535442963e279b8b24286c50ca79a29c96eb2c9b` |
| `daemon-comparison.json` | `4f9edecf0cca1bc33c5167e2a6c0aee81e81e2c74d820d1f8661b322bbdf31e2` |
| each `daemon-start.json` / `daemon-end.json` | `f9c8fd0c017f36a8207824176b11424c4e7418f847da559b03898f52f1787255` |
| each daemon raw `.bin` | `6fb04221184bcf46ef33dbb17c79bee4eb1fc2eb8c0fce74593f58c09a4ca986` |

The dispatch before/after repository-status captures differ only because concurrent work staged and modified three unrelated working-tree records: `.orkestrel/agent/instruments/units/aggregates/diagnostics/judge-relations/README.md` changed from untracked to staged, and `.orkestrel/agent/progress.md` plus `RESULTS.md` changed from unstaged modifications to staged modifications. The captures are 37,318 bytes each; hashes are respectively `8c4c1af1f20d07890dde026548aeb88dab7618f36577c36cc0d994a298cc8c9e` and `54d7f851fcb5cbb224091bd00fffdf2b6dd6b40c1a543c1ae7e54861d2e4dc5c`. No verifier output or frozen input changed as part of that status transition.

## Scores and repeat comparison

The order was `original`, `repair-removed`, `cause-removed`, `both-removed`, `both-removed`, `cause-removed`, `repair-removed`, `original`. Scores below are the judge's `P(true)` probability. “Sampled label” is the model's emitted answer token; it is not the score or a thresholded decision.

| Request | Condition | Sampled label | P(true) | Difference from original anchor | Request bytes / SHA-256 | Response bytes / SHA-256 |
|---:|---|---|---:|---:|---|---|
| 1 | original | No | 0.8425228956087510 | 0 | 3425 / `81b0da6fc318d45975c32d3d9a292ed863de35874de3044153fc1b9d28150e82` | 1735 / `bfaed1e0df5dc3a1713f4a37ef6b3b457697333f555c1444d1f4e5b6e5a8ee0b` |
| 2 | repair-removed | Yes | 0.7995156693414494 | -0.04300722626730169 | 3359 / `746a1705cb1c64a149d84310cace676dbaf8395b9e3f5ed0197c2be85bc2fa49` | 1744 / `78762027f95c0d622070a5ca28d109bcb0000a04fa7d0bcd1d389f46f2b17d0a` |
| 3 | cause-removed | Yes | 0.8600901565538989 | +0.01756726094514782 | 3419 / `197fa27801d1716626187f6476ce82dbe0ec05a4bd3eea8daf621b03a6dcf21f` | 1742 / `773ebb35ddb3a2afeb6df27733115ed73bab06f111b44747f206b7f5eb6b51ff` |
| 4 | both-removed | Yes | 0.8409998800116883 | -0.00152301559706269 | 3353 / `f6b2ccdd28dbd570794b5fdc3881a759031740382711d4be34b2fdc7c2f70124` | 1750 / `753afa58c62daad5c2ac5852442120c68f468531067db12830dd90b8d8d4229c` |
| 5 | both-removed | Yes | 0.8409998800116883 | -0.00152301559706269 | 3353 / `f6b2ccdd28dbd570794b5fdc3881a759031740382711d4be34b2fdc7c2f70124` | 1750 / `4259847631e6b367fbee2a05fb2f31d9d7e9a0e77fd13bb22c77dcec19250bf7` |
| 6 | cause-removed | Yes | 0.8600901565538989 | +0.01756726094514782 | 3419 / `197fa27801d1716626187f6476ce82dbe0ec05a4bd3eea8daf621b03a6dcf21f` | 1742 / `c0ba951b6103902b3a49c2b86acdf64ed1115e11a417e95b71df94c84add5c93` |
| 7 | repair-removed | Yes | 0.7995156693414494 | -0.04300722626730169 | 3359 / `746a1705cb1c64a149d84310cace676dbaf8395b9e3f5ed0197c2be85bc2fa49` | 1744 / `169d4eb70a812cc398dd5ce8a836b1e6213afd17e0442e022811bc670db829dd` |
| 8 | original | Yes | 0.8425228956087510 | 0 | 3425 / `81b0da6fc318d45975c32d3d9a292ed863de35874de3044153fc1b9d28150e82` | 1740 / `d759fd61d16c78271652a16e6c251e8aad6dfce767ecf0b63e5d5247c5c9b475` |

The original score repeated exactly, although its sampled label changed from `No` to `Yes`. Each deletion condition also repeated its score exactly; the two `both-removed` response bodies differ despite identical scores. Independent replay recomputed the score from the raw Yes/No top-logprob gap: maximum absolute difference from retained replay was `0`, and retained replay-to-normalized-result difference was `0` for every request. These are descriptive values from this fixed sequence, not a fitted cutoff or quality/adoption determination.

## Resource use and limits

Across the eight responses, Ollama reported prompt-evaluation tokens `8,184`, cached prompt tokens `4,076`, generated evaluation tokens `8`, total `8,192`. Summed `total_duration` was `22.2296573 s` (load `4.6631056 s`, prompt evaluation `16.913969997 s`, evaluation `0.000008 s`). The normalized wall-time sum was `22,304.565 ms`. No tariff or monetary cost field was supplied, so cost is unavailable from this local run.

This is one fixed eight-request sequence with repeated conditions, not an independent sample. It measures response and arithmetic behavior only; it does not establish classifier quality, a decision threshold, method selection, adoption suitability, or cancellation behavior. Historical raw wire/logprobs and historical installed-runtime continuity remain unavailable. The retained raw bodies and sidecars are in `tmp/units/aggregate-judge-counterfactual/live-reviewed-repair-1`; prompts are not duplicated here.
