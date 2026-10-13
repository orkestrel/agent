# Aggregate L10 development live report

## Accepted identities

- Source commit: `cd5994138b8e65a02cc99b1ca56311bdce59210b`.
- Canonical build manifest SHA256: `55a61a0a0514cea350a7eb7c0342cb37f141802029785406f120d1b227fb4b87`.
- Frozen successor: `.orkestrel/agent/instruments/results/l10/q2-think0/freeze/manifest.json`, SHA256 `48c7d86b649a8728b02068a6b33611bb6bfff7f6ccda3aed0cc3f9e8368e017c`.
- Retained predecessor reference: `.orkestrel/agent/instruments/results/l9/q2-think0/freeze/manifest.json`, SHA256 `87c3b7b5b5756b0285f26302f3dbf4beb377e20f394973d011a7d192dc9df3ac`.
- Policy: `.orkestrel/agent/instruments/results/l10/q2-think0/development-policy.json`, SHA256 `a25420bcf0a3c5b90cec6e2a162de3c5382c370359ccb4f439a7594a28de2a51`.
- Execution manifests: records `.orkestrel/agent/instruments/results/l10/q2-think0/records/execution.json`, SHA256 `81231416922aaa2d91a66c0845e385cae1b2abb44a2f6e626e889324accff01d`; aggregate `.orkestrel/agent/instruments/results/l10/q2-think0/aggregate/execution.json`, SHA256 `d6e163f899d9cc107078320e2a0da494edf5e6cddee02d74fe30240305ea5173`; full `.orkestrel/agent/instruments/results/l10/q2-think0/full/execution.json`, SHA256 `9bcbff5bf54fad6c022161ea161feed64a5ac7d0da54be0854f21e5be2883428`.
- The preparation helper validated all three manifests through `readExecution` before any bench arm. It confirmed the retained generation/predecessor association and paired/expanded budgets. It printed command arrays with absolute manifest, cache, and run paths.

## Freeze and live window

The exact daemon check found Ollama PID 38284 listening on `127.0.0.1:11434`. The freeze command completed exit 0, uncapped, in 1,456 ms under launcher PID 31420; that process is gone. Freeze journal and errors are `tmp/units/aggregate-l10-development-live-freeze.jsonl` and `.err`.

## Records arm and deviation

One records arm was launched under cap 900 seconds with launcher PID 10636. It exited 1, uncapped, after 19,367 ms. PID 10636 and its direct children are gone. Journal and errors are `tmp/units/aggregate-l10-development-live-records.jsonl` and `.err`.

The launched command used relative path arguments:

```text
node .orkestrel/agent/instruments/harness/.build/bench5/bench.js --run --live --copy 1 --manifest .orkestrel/agent/instruments/results/l10/q2-think0/records/execution.json --cache .orkestrel/agent/instruments/results/l10/q2-think0/records/cache --out .orkestrel/agent/instruments/results/l10/q2-think0/records/run --url http://127.0.0.1:11434
```

The driver resolved the cache beneath the harness directory. The run records show one served goal of the 24 planned, failed partial row `g01-luis-refund-amount`, and status `failed` with `development integrity failure at request 3`. Request 3 was a sent flush request with HTTP 200, `num_predict: 1`, a length finish, and no shift field. Requests 4 and 5 were unsent agent requests for the same goal, each carrying the recorded stop error. No retry or later arm was launched.

The exposure helper reports the one served goal was not exposed. The existing cost helper reports two calibration agent requests (prompt 4,413, completion 2, no missing usage); one trajectory flush request (prompt 22, completion 1, no missing usage); zero trajectory agent requests; elapsed 18,739 ms; flush stage 5,933.2906 ms; and metadata 2 requests / 7 ms. No answer prose was read for grading.

The unintended cache path is `.orkestrel/agent/instruments/harness/.orkestrel/agent/instruments/results/l10/q2-think0/records/cache/`. Its `judge.jsonl` is 1,317,305 bytes, SHA256 `c52b71f94ab1c2e742a6d6b698bc8fc278b2de1885e4ebdde75caf733355d15e`; `lineage.json` is 477 bytes, SHA256 `98edf69f6745711ee768b5be07866ae5d7692fd410864134529221067534d6f9`. These files remain untouched for root to handle. **Hypothesis:** the driver resolves a relative `--cache` value against the harness root.

The raw run directory is `.orkestrel/agent/instruments/results/l10/q2-think0/records/run/`. `parseMatrixRun` and `measureMatrixCosts` were used for the readings above. Raw artifact SHA256 values:

| File | SHA256 |
| --- | --- |
| `calls.jsonl` | `fd319aec5e2e1eed7db6cf8093e8ae94b11cf7bcff10a69f23e3d7e51065c733` |
| `capacity-1.json` | `66cda104ed64f4069073e071a5456e53abee005a58e14abe622c57289e0fa09d` |
| `capacity-2.json` | `2ccf5162329a01979175c8ee865573325ed1d1181d9a18164e55d027f3c2258e` |
| `judgments.jsonl` | `bd6f8f7c6334cee79d77186e5c1e1048f717cfad2be89a93aa6d1561c5ed0fd2` |
| `messages.jsonl` | `4a7a90ed1c3851e0f4f649eac6bf972aaa51492bc8be1d6f58f4a27388205889` |
| `model-inventory.json` | `6fb04221184bcf46ef33dbb17c79bee4eb1fc2eb8c0fce74593f58c09a4ca986` |
| `requests.jsonl` | `9fb6b5f4034f9a9907d8a0ba2127e1e43c93c246e8bbef5a2e023a7168d70dfc` |
| `rows.jsonl` | `d7e52f000ae377e9db8c15be5960e4c7e05fad22326ba8afe3bf72f65aef9949` |
| `run.json` | `749b73ec03136ea25d3b9e5ede95891aca86e7cf5e7153911fe7b8a75c236d67` |
| `selections.jsonl` | `f54be0197756ea510aa118e1ca91b1a1ecb84fbeee393ba367cf7c355c5aa486` |
| `turns.jsonl` | `d246f47f785ad421c2a3ea03bb0ff514389269cc540be8d4a50ec348e47a88dd` |

## Stop

The relative-path deviation wrote the cache outside this unit's owned result path. Per the deviation contract, work stopped there. Aggregate and full arms were not launched; no cache, run, policy, or execution artifact was repaired or retried. Root owns review and handling of the misplaced cache. No source, canonical build, daemon, or git mutation occurred.
