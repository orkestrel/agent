# q2 thinking-disabled resource and full-view custody

This report records only q2 with decision thinking disabled. The resource preflight was accepted at its first tested reserve. The following full-view preflight ended with an operational transport fault; it is not a resource-infeasibility result. No response text or answer-quality judgment appears here.

## Frozen inputs and released fit results

- Operator `tmp/units/aggregate-live-feasibility-l7.ts`: SHA-256 `6949f241540dc3ac19514f775f89f3d54ae29f09411501b04b2269dd9bc2f082`.
- Canonical build manifest `.orkestrel/agent/instruments/harness/.build/build-manifest.json`: SHA-256 `09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf`.
- Selected frozen manifest `.orkestrel/agent/instruments/results/l7/q2-think0/freeze/manifest.json`: SHA-256 `026ae06de9f2d132d93b20f5077ce17f77898c241bc94a4fa071f6579166d172`.
- The selected condition is `qwen3.5:2b-q4_K_M`, digest `78a738cc751e89cba72bb1feabf70f30c31772eb81a89a66af94ecea90dc5d11`.
- The selected freeze, settings, seed, census, tags, and source/build bindings totaled 79 files and metadata entries; all 79 hashes matched after the unrelated HEAD movement to `d82f9d10071759544ff39c34172585ae3dae657f`.
- Before the resource phase, the released offline fit diagnoses were present with `accepted=false`: q2 131 supported / 1 admitted, g2 132 / 0, g4 137 / 5, and q4 154 / 1. The resource preflight was separately authorized by the brief.

## Resource phase

The exact command was `node tmp/units/aggregate-live-feasibility-l7.ts --execute --phase resource --key q2 --think false --manifest-hash 09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf`. Outer exec session 34745 tracked canonical launcher PID 23256. Operator and child exited 0, uncapped, signal none, in 133,738 ms; the process and all descendants exited.

The retained resource manifest `.orkestrel/agent/instruments/results/l7/q2-think0/resource/manifest.json` has SHA-256 `b7b098fd96e3a7d4058685f3d8f5a7491dfd257e3ca9c8fd1122a43be9689686`. It records `accepted=true` at reserve 512, resource window 3,072, and prediction reservation 0. It contains one accepted attempt with no failures. All nine attempt file hashes matched disk. The run completed 24 of 24 goal rows, with 53 turns and 78 sent requests/calls. All 78 request records had unique boundaries, HTTP status 200, and prompt/completion usage. Recorded prompt and completion totals were 101,937 and 3,294 tokens.

| Resource attempt artifact | SHA-256 |
| --- | --- |
| `reserve-512/.../run.json` | `a3ba6e22f477c4d523bdcfa91a8e547c05d4221cc4b6160074741084758e81d2` |
| `reserve-512/.../rows.jsonl` | `e8c567c15a9d27da07fd36574b03ed802b0593d2e6d8b0a1d9301c3312fb82a1` |
| `reserve-512/.../selections.jsonl` | `923694ef253728599b28e5b238920a037175d10a33b7ad375382d8edc5db651f` |
| `reserve-512/.../requests.jsonl` | `816cbf3faa7f38654ddc48b2364c0d630400e674c7ec6365c92fb6ec28aae7e2` |
| `reserve-512/.../turns.jsonl` | `9c3686a1621194683c4d0ef06a67b6d25aad37c1b0f604bbac08d13ff521b8dd` |
| `reserve-512/.../calls.jsonl` | `932a1d9a937c0a14495112987b9a0689a5bc6114d14ac7a0ff491a908b41e097` |
| `reserve-512/.../messages.jsonl` | `0f18823f65dfdc91b7925cd4ce4916d00f0f5d18b9ff2cf236071878f9f0ac2c` |
| `reserve-512/.../judgments.jsonl` | `00cc6eb9e76482457dcd7b2d9b1aead0b77cd435b40623da9ec470dd33322654` |
| `reserve-512/.../model-inventory.json` | `6fb04221184bcf46ef33dbb17c79bee4eb1fc2eb8c0fce74593f58c09a4ca986` |

Raw resource stdout `.orkestrel/agent/instruments/results/l7/logs/q2-think0-resource.log` was read in full; it contains 24 per-goal result lines and no response bodies. Its SHA-256 is `c5e51aeec9e27e9c60edab6109c73075394861fa709ded62a71241a0cece58ab`. Raw stderr `.orkestrel/agent/instruments/results/l7/logs/q2-think0-resource.err` was read in full and records `exit=0 signal=none capped=false duration_ms=133738`; SHA-256 `3e62869799e50d53e281718a1d838a69d97ab0fa604a8f6a0069d8df787e14cb`.

## Full-view phase

Because the resource manifest was accepted, the exact full command was `node tmp/units/aggregate-live-feasibility-l7.ts --execute --phase full --key q2 --think false --manifest-hash 09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf`. Outer exec session 20205 tracked canonical launcher PID 73176. Operator and child exited 1, uncapped, signal none, in 1,043,149 ms. The recorded PID and all descendants are gone.

The resource-phase window of 3,072 tokens and the derived full-view physical context window are distinct. `full/bound.json` records a full-view window of 1,068,663 tokens, with reserve 512 and prediction reservation 0. Its 18 scenario, copy, and development-artifact references matched their recorded hashes. The full manifest `.orkestrel/agent/instruments/results/l7/q2-think0/full/manifest.json` has SHA-256 `eb56191859179bf3bfaf2204fad9ec073a632b112dc105577436dc4a2d4ff3d4`; it records `accepted=false`, reserve 512, and the derived window 1,068,663. All nine listed full-attempt artifacts matched their recorded hashes.

The retained copy-1 run has status `complete` and 24 goal rows of 24. It records 41 turns and 66 sent request/call boundaries. Sixty-five calls returned HTTP 200 with usage; one returned HTTP 500 without prompt or completion usage. Request sequence 20 records `failure=transport`, status 500, and the server error `XML syntax error on line 6: element <function> closed by </parameter>`. The full manifest records `failures=["request 20: transport"]`. The actual execution fault therefore prevents a full-view feasibility ruling; the output is not classified as a measured resource refusal. No response text or goal-quality outcomes were inspected for this ruling.

Recorded full-view artifacts:

| Artifact | SHA-256 |
| --- | --- |
| `full/bound.json` | `a0526fbde09a1418e6a0ab13e160dd91099b8e0c5ad8d7541d960777f8c2e47e` |
| `full/manifest.json` | `eb56191859179bf3bfaf2204fad9ec073a632b112dc105577436dc4a2d4ff3d4` |
| `full/preflight/execution.json` | `57aa36f85bbaf917409461479ee5f67ce542d93e5a05f71d82280f39464002b0` |
| `full/preflight/l6-q2-think0-full-v1/run.json` | `b5633401ae6bafab8012446aad05d6cf16c481ff333e9c2107443e1eca2c7162` |
| `full/preflight/l6-q2-think0-full-v1/rows.jsonl` | `1cf4513d5cf7272e67cecd5bfbb962de64b958cb5d03e4a777403aac8702d7d5` |
| `full/preflight/l6-q2-think0-full-v1/selections.jsonl` | `c09a7a4a2d9bd74d11446effb60eeddc38128c8ee7103cd39c912b4f67471266` |
| `full/preflight/l6-q2-think0-full-v1/requests.jsonl` | `4232e4f14a3d7eacb15764fa0bfeb10b2525e348c41e6648d9540e8068c9db81` |
| `full/preflight/l6-q2-think0-full-v1/turns.jsonl` | `47f503bcb2dc524fbc268faceec1735694ad11c2e0646ffa7345c498903f8696` |
| `full/preflight/l6-q2-think0-full-v1/calls.jsonl` | `3e0c5972d9c901f989749e9ce2f279ac1c396edd2d70db8926a287009d5c4a11` |
| `full/preflight/l6-q2-think0-full-v1/messages.jsonl` | `27d23593cd4c52e9a045bd1fe0efa0d10202454a9a4181bc4f71fd06898fa4b3` |
| `full/preflight/l6-q2-think0-full-v1/judgments.jsonl` | `46e8664d18692544e5f7edb2caf9849f32c8d1272c1c7aba202cd796abca76bc` |
| `full/preflight/l6-q2-think0-full-v1/model-inventory.json` | `6fb04221184bcf46ef33dbb17c79bee4eb1fc2eb8c0fce74593f58c09a4ca986` |

Raw full stdout `.orkestrel/agent/instruments/results/l7/logs/q2-think0-full.log` was read in full; it contains 24 per-goal lines. SHA-256 `011e0588fa6dedd35b1d7507ed3c969996a554bf5c30c1c8db54e496f2057594`. Raw stderr `.orkestrel/agent/instruments/results/l7/logs/q2-think0-full.err` was read in full; it records the operational matrix-fault diagnostic and `exit=1 signal=none capped=false duration_ms=1043149`; SHA-256 `bc0358e32fa5627497746d156acbbbd4cc9cc2d099889c503d9bfcb5a02ee77c`.

## Completion and scope

The operator/build identities and all 79 selected freeze bindings matched after the unrelated commit movement. The resource manifest and its nine files, the full-view bound references, and the full manifest's nine run files all passed direct hash checks. Resource and full launcher PIDs 23256 and 73176 are absent, with no remaining descendants. The fixed q2-think0 resource and full-view phases are the only conditions executed by this report; no retry or other model phase was run.