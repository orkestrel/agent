# g2 thinking-disabled resource custody

The g2 thinking-disabled resource preflight was accepted at its first reserve. No response text or answer-quality ruling is included.

## Frozen identity and preflight

- Operator: tmp/units/aggregate-live-feasibility-l7.ts; SHA-256 6949f241540dc3ac19514f775f89f3d54ae29f09411501b04b2269dd9bc2f082.
- Build manifest: .orkestrel/agent/instruments/harness/.build/build-manifest.json; SHA-256 09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf.
- Frozen manifest: .orkestrel/agent/instruments/results/l7/g2-think0/freeze/manifest.json; SHA-256 04a1e41ae941899e6af64b3289b7e9604f64b508db86f376fc0bccc0403ef487.
- Model: gemma4:e2b-it-q4_K_M; digest b37049369adfe3d2b653af0ab301a062ca5cbe96ace6aa0d3f2559ee9b563fc2; thinking disabled.
- All 79 freeze bindings (manifest files plus settings, seed, census, and tags) matched before and after. The resource manifest binds this frozen-manifest hash.
- Prior diagnostic PID 55028 and descendants were absent. Resource manifest, phase logs, and report target were vacant.

## Command and outcome

The exact operator command was:

    node tmp/units/aggregate-live-feasibility-l7.ts --execute --phase resource --key g2 --think false --manifest-hash 09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf

The canonical dispatcher used a 600-second outer cap and --status. Harness exec session 72951. Dispatcher PID 32312; operator launch PID 66120. The outer wrapper exited 0, uncapped, in 158,812 ms. The operator child exited 0, uncapped, signal none, in 158,503 ms. Both PIDs and all descendants are gone. The retained operator PID file contains 66120.

The resource manifest .orkestrel/agent/instruments/results/l7/g2-think0/resource/manifest.json has SHA-256 280bee26db0d8930bf010c27d7e64e5752e57914f1cd0e49704f9dfee9b46d76. It records accepted=true at reserve 512, window 3,072, and prediction reservation 0. Copy 1 completed 24 of 24 goal rows over 42 turns. It records 67 sent requests and 67 calls, with 67 unique request sequences; all returned HTTP 200 and all have prompt and completion usage. Totals: 69,553 prompt tokens and 2,775 completion tokens. No retry or other condition ran.

The raw stdout and stderr logs were read in full. Stdout contains 24 goal lines; stderr records exit=0 signal=none capped=false duration_ms=158503. These logs contain no response bodies.

## Retained artifact hashes

All ten attempt artifacts matched the emitted manifest:

| Artifact | SHA-256 |
| --- | --- |
| reserve-512/execution.json | 9c7af01239dddfd0f72ce71b82b3e0323c934a155d60a8d023f316c5bf557d07 |
| reserve-512/l6-g2-think0-records-v1/run.json | 347ed3f69c991e10bccdd426a18e1758cce62cf94c1b2ff9b7d6cc796d3d6334 |
| rows.jsonl | ed00810cb171659386063adb2167dd1c80378a7c936c8449ffeab22099300598 |
| selections.jsonl | f7944c5942a55bcb83ea09f9502bd644e1a25dfb16775e7d79ef16d6bcb2c1c5 |
| requests.jsonl | f05d8476dc82e27e479edf9bf9a66084e03addb30409aadc275ea52d0e1782d1 |
| turns.jsonl | d86f0c8fcfe2663df2b874746d90b8f9845ad00e3af1b939d37e5cb0554aa20d |
| calls.jsonl | ed7a83d5223bd86aa5fa91d7810d22c078331338f6c9fad03ef57fa733727217 |
| messages.jsonl | 4140b5a7f693b737a38ba02de1e653d39a00763d1b65ea8323d13a48b95a5d29 |
| judgments.jsonl | 4a7d2b8111ac5de2fa7fef64389f2daa41e7af207b1d22f881ea0e961bfad890 |
| model-inventory.json | 6fb04221184bcf46ef33dbb17c79bee4eb1fc2eb8c0fce74593f58c09a4ca986 |

- Operator stdout .orkestrel/agent/instruments/results/l7/logs/g2-think0-resource.log: 1,455 bytes; SHA-256 f272e5ceee7c32ac67f2c133659bf5d3ca2197365f6b09956ce4f096ac7033ee.
- Operator stderr .orkestrel/agent/instruments/results/l7/logs/g2-think0-resource.err: 52 bytes; SHA-256 2ded8ddac32c1c1f59701285d18b0768ef234ffc7414e3514abe0a6dc29b3506.
- Dispatcher journal tmp/units/aggregate-l7-resource-g2-launch.log: SHA-256 1d31665af754eefdb1e1d67e28f19c29264a5dab232938f034f7ad6790f95675.
- Dispatcher errors tmp/units/aggregate-l7-resource-g2-launch.err: SHA-256 faf2010f623917eba2f46fbf8398038c0efa749156cfe0aa28144b6884db4526.

Only the g2-think0 resource phase ran. Full-view, retry, and other model conditions remain outside this unit.
