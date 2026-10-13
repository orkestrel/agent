# Claim-4 repair verification

The repaired offline collection and its distinguishing mutation reproduced the recorded outcomes on Windows with Node v24.21.0. The collection launcher exited `0` in 5,739 ms and the mutation launcher exited `0` in 791 ms; neither 240-second cap fired. The unavailable-result write was disabled for the red run, the named test failed on the missing evidence file, and the exact original source bytes were restored before the same test passed green.

The harness-tracked commands were:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-judge-counterfactual-repair-verify.jsonl --errors tmp/units/aggregate-judge-counterfactual-repair-verify.err --cap 240 --status -- node tmp/units/aggregate-judge-counterfactual/verify.ts
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-judge-counterfactual-repair-mutation-verify.jsonl --errors tmp/units/aggregate-judge-counterfactual-repair-mutation-verify.err --cap 240 --status -- node tmp/units/aggregate-judge-counterfactual/mutation-repair.ts
```

The proof records in `tmp/units/aggregate-judge-counterfactual/proof-1791704950004/` preserve every exact argument array, bare stdout and stderr, expected and observed exit, and duration. The verifier collected 5 passing proof tests, 3 passing completion tests, and the expected 1 failing direction control. No tests were skipped, cancelled, or marked todo. The strict TypeScript command exited `0` with empty output. All 20 listed `node --check` commands exited `0` with empty output. Command-level `error` fields are `absent`.

| Exact scoped command | Exit / expected | Duration (ms) | Recorded result |
| --- | ---: | ---: | --- |
| `node tmp/units/aggregate-judge-counterfactual/offline.ts` | 0 / 0 | 304.006 | Default path; native fetch dispatches `0` |
| `node tmp/units/aggregate-judge-counterfactual/prepare-offline.ts` | 1 / 1 | 221.547 | Occupied preparation refused; native fetch dispatches `0` |
| `node --test tmp/units/aggregate-judge-counterfactual/proof.test.ts` | 0 / 0 | 1,542.136 | 5 pass, 0 fail, 0 skipped, 0 cancelled, 0 todo |
| `node --test tmp/units/aggregate-judge-counterfactual/Completion.test.ts` | 0 / 0 | 251.156 | 3 pass, 0 fail, 0 skipped, 0 cancelled, 0 todo |
| `node --test tmp/units/aggregate-judge-counterfactual/negative.test.ts` | 1 / 1 | 175.380 | Direction control collected; 0 pass, 1 fail. Actual `0.8807970779778823`, expected `0.11920292202211755` |
| `node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --allowImportingTsExtensions --module nodenext --target esnext --strict --types node --skipLibCheck <the 20 unit TypeScript files listed in types.json>` | 0 / 0 | 1,020.683 | Empty stdout and stderr; exact resolved arguments are in `types.json` |
| `node --check tmp/units/aggregate-judge-counterfactual/<file>` for `Completion.test.ts`, `Completion.ts`, `constants.ts`, `freeze-repair.ts`, `freeze.ts`, `helpers.ts`, `main.ts`, `mutation-repair.ts`, `negative.test.ts`, `NetworkWitness.ts`, `offline.ts`, `Operator.ts`, `prepare.ts`, `prepare-offline.ts`, `proof.test.ts`, `Recorder.ts`, `retain-repair.ts`, `types.ts`, `Verifier.ts`, and `verify.ts` | 0 / 0 each | 43.335–52.597 each; exact per-file durations are in `syntax-*.json` | Empty stdout and stderr for every file |

The self-restoring mutation ran the same exact test command for its red and green phases:

```text
node --test --test-name-pattern "^real decoder rejection retains per-request unavailable result and explicit missing logprobs evidence$" tmp/units/aggregate-judge-counterfactual/Completion.test.ts
```

The mutation changed only the rejected-result `writeArtifact` line in `Completion.ts` to a comment. The red run exited `1`, collected the named test, and reported pass `0`, fail `1`; its bare output contains `ENOENT` for `proof-completion-rejected-49716-1791704974174/rejected-0.normalized.json`. Red duration was 308.296 ms. The `finally` block restored the saved bytes. The green run of the identical command exited `0`, reported pass `1`, fail `0`, and took 340.571 ms. Exact command arrays and unabridged outputs are in `proof-repair-mutation-1791704973893/red.json` and `green.json`.

The original `Completion.ts` SHA-256 was `b4c3d9a38a4b39ce7210d5b3cead494ff6d13919acb807d657a595e309e89879`; the scoped mutant hash was `c7880f358ec7c092c01634a3674944a30297fd3a643496715f776b44220136a7`. The saved `Completion-original.bin` and the restored source both hash to the original value. The final proof diff hash is `851334b6d6f8f8d1eae6aea0552f49a993e70a0e6ce76cd5b3d7d409c9fafe68`, matching the frozen repair report. `Completion.test.ts` remains at hash `77d833d80f9a9ab8c435d49e1cb55b2d319c788341fffdeeeecbd5a461ce5426`.

The frozen repair report hash is `65006cce1511ac400acfe2e8eb5fccc56ab10505a1697bda8badee0577776462`. Final packet, typed plan, canonical build manifest, and operator digest match their bindings:

| Binding | SHA-256 |
| --- | --- |
| `packet-final.json` | `438710a277663ca0c28a2b6bf3f6c47b354312c12ddb02d0cd697a212499c11f` |
| `plan-ready-repair-typed.json` | `e4f5dfce5b1d6c6fdaf62ddded496c8bb69483c7e4e98f5923ba3d2fcd481f88` |
| Canonical build manifest | `09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf` |
| Operator custody digest | `33570ee0bb82af8786854543ab9edafcde11c5309fa2a684aa16b5e438fa6756` |

The new collection proof is `proof-1791704950004/`; its summary hash is `007f7744c39cdeef94bc847eb10bff2882a670f9380f620ad6d7395e2acd8c6b`, hashes manifest is `fa16d5d245761fe4200be1a97c796737596c56bbe9bd9f4324d11f908fd2dc53`, and review diff matches the frozen hash above. The mutation proof is `proof-repair-mutation-1791704973893/`; its summary records original and restored hash equality and has hash `ef7544381e5407d42e052e0d6ab9465e48e832ffd9a63f1f9aab98487e2c927d`.

The collection launcher PID was `31968`; the mutation launcher PID was `70052`. Both PIDs and their descendants were absent after completion. Each launcher's before and after Git status matched; the observed status contains the known unrelated bench4 edit, audit verdict, and q2 resource/full-view outputs. No source change remained after mutation restoration.

The verifier and mutation made no model request. The offline witness recorded zero native fetch dispatches on the default and occupied-preparation paths, and the collected tests record zero on invalid-hash and occupied-output refusal paths. The mutation's test uses the actual emitted decoder with inert captured data. Live daemon forwarding, cancellation, response custody across a real transport, and model arithmetic remain unobserved. The Undici witness observes native fetch dispatches rather than arbitrary socket activity; fetch exposes decoded entity-body bytes rather than HTTP framing or compressed wire bytes. This report records offline evidence only and makes no model-quality ruling.
