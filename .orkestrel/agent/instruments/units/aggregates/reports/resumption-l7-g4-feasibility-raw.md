# Gemma 4B records resource report

## Execution

The frozen G4 thinking-disabled records resource phase completed. Its resource manifest records `accepted: true` in one attempt at reserve `512`, window `3072`, predict allowance `0`, with no resource refusal or recorded failures. The run status is `complete`.

The exact command was:

```powershell
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-l7-resource-g4-verify.jsonl --errors tmp/units/aggregate-l7-resource-g4-verify.err --cap 900 --status -- node tmp/units/aggregate-live-feasibility-l7.ts --execute --phase resource --key g4 --think false --manifest-hash 09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf
```

Outer exec session `58301`; outer launcher driver PID `72508`; nested canonical launcher PID `34320`. The outer launcher exited `0`, uncapped, in `270,089 ms`; the driver journal records PID `72508`, exit `0`, no signal, uncapped. The nested launcher exit record reports exit `0`, no signal, uncapped, `269,897 ms`. The resource run reports `267,678 ms` wall time. Both recorded PIDs were absent after completion. The outer watchdog was `900 s`; the driver retained its canonical inner watchdog of `14,400 s`. No retry or subsequent phase ran.

Bindings checked before launch: driver `tmp/units/aggregate-live-feasibility-l7.ts`, SHA-256 `6949f241540dc3ac19514f775f89f3d54ae29f09411501b04b2269dd9bc2f082`; build manifest `09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf`; frozen G4 manifest `b8007bb044629362cabaf8626cd61d2e7657e717d59d083ea872bdf60f73da04`. All 79 freeze-bound files still match their recorded hashes. The frozen decision model is `gemma4:e4b-it-q4_K_M`, digest `dc35e8d9c6061baa6f0fa870975ab6932e2542b579b13ea0f199fa4bb7300c9c`; all captured request bodies use this model with `think=false`.

## Request and row usage

The run covers 24 goals, and the 24 row identifiers are unique and match the run's goal membership. The request and call ledgers both contain 75 unique sequences, `1` through `75`; all 75 requests were marked sent, returned status `200`, and have prompt and completion usage fields.

| Measured ledger | Count | Prompt tokens | Completion tokens | Total tokens |
|---|---:|---:|---:|---:|
| Actual request entries, `agent` role | 51 | 82,649 | 2,209 | 84,858 |
| Actual request entries, `flush` role | 24 | 456 | 24 | 480 |
| All actual request entries | 75 | 83,105 | 2,233 | 85,338 |
| Per-goal row `usage` fields | 24 | 173,649 | 2,705 | 176,354 |

The request totals are the measured fresh transport usage and include all 24 flush requests. The per-goal row totals are a different accounting field and are not fresh Gemma inference cost: `Driver.ts:1724` stores `Ledger.respond` result usage, which includes `selection.usage`; the vendored agent adds selection usage into returned usage (`index.js:4857–4864, 4893–4909`). `JudgeCache.ts:97–119` replays cached usage on a hit, and `Driver.ts:1089–1114` loads the frozen judge cache seed. This run records 756 judge-cache hits, no misses, and no transient errors; the 75 actual request roles are only `agent` and `flush`, with no `judge` request. Thus row usage includes replayed cached judge usage and must not be promoted as fresh request cost. The cache seed is bound at SHA-256 `c52b71f94ab1c2e742a6d6b698bc8fc278b2de1885e4ebdde75caf733355d15e`.

## Artifact custody

The resource output and matching logs were vacant before launch. Every hash in the resource manifest was recomputed successfully for its 10 bound attempt artifacts; all 79 frozen bindings remained unchanged. Raw request/response records are retained in `requests.jsonl`; `calls.jsonl` records sent boundaries. No response-quality or score ruling is made here.

| Artifact | SHA-256 |
|---|---|
| resource `manifest.json` | `f7cc60071b58425e925323bd0947dcc9aa2d846be37fd180f2e6ecb874b00f44` |
| attempt `execution.json` | `63ad53c668daf2c2ff5b8db6e58624bc463191864a658283a9e9e8e40edbdd49` |
| `run.json` | `bfc5f3d4f4da0714567a4f644546547bbe6cb8a8418bef27f4f70f99f05256ba` |
| `rows.jsonl` | `8091d32ed674a9ce5461d0edff0afa481567f34acb2e3244a21a4b38174ca49b` |
| `selections.jsonl` | `bce93ce27482cf5224a208e40323554c36ddb8b3e74157e526994c11847430fa` |
| `requests.jsonl` | `33c09425da67239a1068e8e6ff4bbdf228d95bbdd685fef5c359475823371643` |
| `turns.jsonl` | `fab35076343d708b0608401de9581e884c14be049e363b27fc96163c7e628dac` |
| `calls.jsonl` | `302b44707c18d5fc98c100eecd2e7fd2bb69e36cd67014a6e9f1e85bd9cb0186` |
| `messages.jsonl` | `2c5ae86051a16efa7fa43811354b5576907fc1f6c3ce1d3eac4f12b0ab6ce285` |
| `judgments.jsonl` | `4c4e41f16da58a747e76bc486cfc93f3a9f13c7b1a42b5acababdc60741db1fb` |
| `model-inventory.json` | `6fb04221184bcf46ef33dbb17c79bee4eb1fc2eb8c0fce74593f58c09a4ca986` |
| inner stdout/log | `5893b2b20ec1a551bf888ca88c65433ec2feb037b0a83842be7221f26064dacb` |
| inner exit/error record | `dd6d37a7ad7ba6b3c71d51d92bfd5ec591ba8d645e1eb2b9a9983da1e388d0be` |
| inner PID record | `05af519f5504ac15ffeb1e66e3137c8eb82ec950d889503e69f5992f63efd56b` |
| outer journal | `9ae08f6d87a58a8cc747bd549c3363a9efbba531f7d1c5c6ea5e9db2669acab4` |
| outer exit/error record | `5c31265a7f80b1806b60c646873effeab286103074809d08e305501a2b066735` |

The before/after dispatch status snapshots differ only by this unit's expected untracked resource output directory. Their SHA-256 hashes are `912cef89d96d68b604ebc9ae25931937f736194071760db79fb3f675ab862aad` before and `b2d4876273db5b4a493d31c3e4c7415dcd51ebc1d547fac4a8cd3e883b55f678` after.

This report records only the frozen resource measurement. It does not grade responses, choose a later reserve, or authorize a full phase, pilot, fit, evaluation, retry, or further inference.
