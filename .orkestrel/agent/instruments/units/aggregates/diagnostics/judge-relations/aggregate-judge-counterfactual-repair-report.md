# Counterfactual diagnostic completion repair

The bounded rejected-request accounting repair is implemented and passes offline proof. Native builder GPT-6.1 Sol performed the work without subagents, model requests, network requests, installation, commit, push, publication, or a broad gate. Acceptance remains with root.

The actual `ask` invocation and await run inside `Completion.execute` at `tmp/units/aggregate-judge-counterfactual/Operator.ts:111`. The boundary persists the actual returned result with `availability: present`, or an unavailable normalized result with the original error name and message. It separately writes captured-body field evidence on either path and rethrows the identical original rejection (`tmp/units/aggregate-judge-counterfactual/Completion.ts:17`). Unavailable results contain no fabricated answer or score. The unchanged outer execution reaches `complete = true` only after the sequence, daemon checks, bindings, and analysis; a rejected request leaves the outcome incomplete (`tmp/units/aggregate-judge-counterfactual/Operator.ts:130`). This is a control-flow reading, not a claim that the full network execution ran.

The pure captured-body projection stays in `helpers.ts`, and the stateful completion boundary stays in its class file. `describeWire` records body availability, byte hash, and byte length, then explicitly describes token, finish, logprobs, usage, and timing fields. Valid JSON with missing fields reports absent fields; malformed JSON reports unparseable fields; an unavailable raw body reports absent fields. Present values, including external nulls, remain present values (`tmp/units/aggregate-judge-counterfactual/helpers.ts:158`). This placement follows the architecture leaf rule. `Recorder.ts`, its original native forwarding, and raw-response custody mechanism received no edits.

The precursor bytes were retained before implementation with `node tmp/units/aggregate-judge-counterfactual/retain-repair.ts`, exit 0. It copied the existing top-level instrument and plan files exclusively into `precursor-repair/`; its custody artifact records the original operator digest and individual hashes. The executable custody tuple adds `Completion.ts`. The packet, source bindings, model identity, settings, and serialized renderings remain identical.

The final readings are SHA-256 values.

| Artifact | Hash |
| --- | --- |
| Original frozen packet `packet-final.json` | `438710a277663ca0c28a2b6bf3f6c47b354312c12ddb02d0cd697a212499c11f` |
| Original `plan-ready.json` | `1c0044b69cb29f66a86ffe86d7629dab611afd521be6f5de8604a565d90657e1` |
| Precursor operator custody digest | `1ef1d01af6d0daefe54131f7a6a7a567cc838e821f53414474ba37603053085b` |
| Precursor `Operator.ts` | `d3e5adf520e489306d1533ff30214743860c0a32f5447bd4a569defb55e18854` |
| Retained precursor `custody.json` | `a728bc6ac25f0e305fd0a864690706099c6546c162a9aee12ad3df2e5963d1ab` |
| Final successor `plan-ready-repair-typed.json` | `e4f5dfce5b1d6c6fdaf62ddded496c8bb69483c7e4e98f5923ba3d2fcd481f88` |
| Successor operator custody digest | `33570ee0bb82af8786854543ab9edafcde11c5309fa2a684aa16b5e438fa6756` |
| Successor `Operator.ts` | `ff345722427bb02d50858728990d6f5e785c7d423b93a9eb1aa8674e989fcdd3` |
| Restored `Completion.ts` | `b4c3d9a38a4b39ce7210d5b3cead494ff6d13919acb807d657a595e309e89879` |
| Final `Completion.test.ts` | `77d833d80f9a9ab8c435d49e1cb55b2d319c788341fffdeeeecbd5a461ce5426` |
| Final proof `summary.json` | `9d6df3c0d07251be43d7ddd8036a0581124bcd761868a0bbeb2da3d7dc1835d5` |
| Final proof `hashes.json` | `dcd7b2fc32a1067fbe417d0226f2e79cf201f1d8e6fa8089817164acdb0fba78` |
| Final proof full-source `review.diff` | `851334b6d6f8f8d1eae6aea0552f49a993e70a0e6ce76cd5b3d7d409c9fafe68` |
| Precursor-to-successor `repair.diff` | `1f88e504e1a3c075bcd456f29d57249e95f621c87257cb65c8a9a4fa09ed5915` |
| Final mutation `summary.json` | `ef7544381e5407d42e052e0d6ab9465e48e832ffd9a63f1f9aab98487e2c927d` |

The final successor is unambiguously `tmp/units/aggregate-judge-counterfactual/plan-ready-repair-typed.json`. `Verifier.run` explicitly reads that filename and refuses a packet, build, or operator mismatch before collecting commands (`tmp/units/aggregate-judge-counterfactual/Verifier.ts:11`). `node tmp/units/aggregate-judge-counterfactual/freeze-repair.ts` exited 0 after checking the packet, build, and every retained source binding; it exclusively created this successor. Earlier plans and proofs remain preserved.

The future execution command from the scaffold checkout is the following. It was not executed.

```text
node tmp/units/aggregate-judge-counterfactual/main.ts --execute --packet 438710a277663ca0c28a2b6bf3f6c47b354312c12ddb02d0cd697a212499c11f --build 09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf --operator 33570ee0bb82af8786854543ab9edafcde11c5309fa2a684aa16b5e438fa6756 --output tmp/units/aggregate-judge-counterfactual/live-reviewed-repair-1
```

The changed-claim instrument covers the completion boundary driven by actual emitted decoder behavior and inert captured data. It excludes native transport forwarding and live model arithmetic. Its missing-logprobs control uses a completed Yes response carrying token and usage fields but removes first-position logprobs. The same test also drives the minimal `{done:true}` response. Both produce the real decoder's `PROTOCOL` rejection, preserve its object identity on rethrow, write unavailable normalized results, and record absent logprobs. The minimal response additionally proves absent token, finish, usage, and timing fields. Captured byte arrays and retained raw files remain byte-identical. The complete Yes/No vector calls the real decoder inside the boundary, returns that result object unchanged, and persists its actual normalized content. Malformed JSON preserves its original `SyntaxError`; absent captured bytes preserve the real decoder's rejection. Both produce explicit raw-field availability rather than an invented score.

The distinguishing mutation disables only the unavailable-result write at `tmp/units/aggregate-judge-counterfactual/Completion.ts:24`. `node tmp/units/aggregate-judge-counterfactual/mutation-repair.ts` exited 0 and retained the final run under `proof-repair-mutation-1791704661272/`. Its exact collected command is the following, identically run for red and restored green.

```text
node --test --test-name-pattern "^real decoder rejection retains per-request unavailable result and explicit missing logprobs evidence$" tmp/units/aggregate-judge-counterfactual/Completion.test.ts
```

The red command exited 1, collected the named test, reported pass 0 and fail 1, and failed with `ENOENT` for `rejected-0.normalized.json`; duration was 460.1396 ms. The restored command exited 0, reported pass 1 and fail 0, and ran in 495.9451 ms. Neither run skipped, cancelled, or marked a test todo. Mutation bytes hash to `c7880f358ec7c092c01634a3674944a30297fd3a643496715f776b44220136a7`; the restored bytes match the preceding Completion hash. Exact commands, stdout, stderr, exit codes, original bytes, mutant bytes, and write-line replacement are retained in the mutation directory. This control establishes discrimination against omitted rejection evidence; it supplies no forwarding or model-quality evidence.

The final bounded collection is `proof-1791704617916/`. `node tmp/units/aggregate-judge-counterfactual/verify.ts` exited 0. It ran these narrow commands, retaining complete command arrays and bare outputs.

| Command | Observed result |
| --- | --- |
| `node tmp/units/aggregate-judge-counterfactual/offline.ts` | Exit 0; observed native fetch dispatches 0 |
| `node tmp/units/aggregate-judge-counterfactual/prepare-offline.ts` | Expected exit 1; occupied preparation refused; dispatches 0 |
| `node --test tmp/units/aggregate-judge-counterfactual/proof.test.ts` | Exit 0; collected pass 5, fail 0; 1603.9852 ms |
| `node --test tmp/units/aggregate-judge-counterfactual/Completion.test.ts` | Exit 0; collected pass 3, fail 0; 220.5003 ms |
| `node --test tmp/units/aggregate-judge-counterfactual/negative.test.ts` | Expected exit 1; collected direction control fail 1; 123.719 ms |
| `node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --allowImportingTsExtensions --module nodenext --target esnext --strict --types node --skipLibCheck` plus the existing complete operative/proof file collection | Exit 0; empty stdout and stderr; exact arguments in `types.json` |
| `node --check` for each operative/proof file in that collection | Exit 0 for each; empty stdout and stderr; individual `syntax-*.json` artifacts |

The final collected suites report no skipped, cancelled, or todo tests. No owned operative/proof file was newly excluded; the unchanged collection still omits the pre-existing exploratory `inspect.ts` file. The existing proof verifies every packet binding, exact identity, actual superclass, frozen serialized bodies, transformations, arithmetic refusal boundaries, and zero-dispatch entry refusals. The scoped types contract alone was also checked before implementation and exited 0.

The unchanged input readings are the following; the complete path/hash/size inventory remains in the frozen packet and final proof summary.

| Input | SHA-256 |
| --- | --- |
| Generation packet | `64f575e39f5b1cae6237fedb67e3559103ee1bf535c2655fee610bda9094a67e` |
| Settled labels | `4965e298d9bd345bbd0f86a418648a6767ccfb776f5d46b232d3defba070cb78` |
| Canonical build manifest | `09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf` |
| Generation manifest | `7cc0e6af513f8f9a65d0cdf35afa6b94b7ab350465328a95e380f42ac9b79216` |
| Selected attempts | `6258734af06361ee0337236311c04eb970f79e190ea103082dd8d5af6db66a8d` |
| Retained evidence identity | `24fddf4bfc7d870a49395ad72b62d5bf8429ebb27e56d18e8f3d666fc1ba81b2` |
| Source and emitted Ollama vendor | `e09277478a425e6227f37730a29b2df5d9f80cfc595740cd0335fa05da22b4a7` |
| Original recorder | `2dda7ba5f7f4bc4e63ea1b4b9ac3f01a134956dd434ebbbc9aeab4d441cf7c08` |
| Original entry | `091ce761faeb703a8dbc485c8984cd77107bda9edcbda28114f21b7df75eaeab` |
| Original bounded proof suite | `5073f62d6d93da74e1fbe0ab4a7aeba11ef07e152990c3611b09473d4916d226` |
| Prior exact review diff | `f28f0fe915bc4d7e5eaedd54476c0732f14d6d43a39caa3022b5f4656aafc85d` |

The exact repair delta is `tmp/units/aggregate-judge-counterfactual/proof-1791704617916/repair.diff`. It contains `git diff --no-index` results against retained precursor files for `types.ts`, `constants.ts`, `helpers.ts`, `Operator.ts`, and `Verifier.ts`, and against `/dev/null` for the added Completion implementation/proof and bounded retention, mutation, and freeze scripts. Full successor source and final plan additions remain in `review.diff`. The repair changes only tmp instrument files and this report.

A preliminary bounded collection retained under `proof-1791704576125/` failed its types stage with TS2339 because the factory exposes `JudgeInterface`, and TS2322 because callback capture lost the question narrowing. Instance narrowing to the actual emitted `OllamaJudge` and binding the already-validated request resolved those diagnostics. The preliminary frozen `plan-ready-repair.json`, hash `b34e9fe5d54a4e4b70edc737e87b43b49e0d4545811b338047b0e961b63d52db`, binds the superseded pre-type-correction operator `ab5e99f538fd3ed824ce6e4b4bff357dcc0658f9a96148b70d81e9902b43be8d` and remains immutable. It is not the final execution authority. No behavioral departure from the reviewer's bounded prescription was made.

An external session moved HEAD from `7d6795d8b` to `d82f9d100` during the work. The final `git log -2 --oneline` identifies the disjoint enterprise-veneer commit. Root identified the q2 resource/full paths as the authorized verifier's concurrent outputs. This unit made none of those changes and stopped source work after its bounded checks; only its final proof delta and report remained to write.

These Windows PowerShell readings used Node v24.21.0 on 2026-10-11. Timing is an observation with concurrent resource verification, not a performance claim. Actual native forwarding, live model arithmetic, daemon cancellation, and partial-response custody remain unobserved. Historical raw wire/logprobs and historical installed-superclass continuity remain absent. No daemon state, request settings, frozen body, dependency, label, or canonical build changed. Fetch custody still means decoded entity-body bytes, not HTTP framing or compressed wire bytes. The retained tests prove completion accounting and preserve the real decoder's outcome; they do not establish model quality or an adoption decision.
