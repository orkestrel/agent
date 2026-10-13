# Sustained refusal fixture repair

The fixture distinguishes complete responses, measured context refusal, and missing-usage operational faults. The direct regression failed before the response correction and passed afterward. The extracted real filing/ranking proof passed. Production classifiers and pending flush source were not edited.

## Changed files and preserved assertions

- `Peer.ts` adds `boundary = false`. For non-missing generate usage, boundary mode emits prompt usage `Number(body.options.num_ctx) - 1` and completion usage `1`. `filingFailure` still omits both usage fields. The accepted support-question recognition remains intact.
- `Peer.test.ts` adds real loopback generate exchanges using the vendored prompt renderer, exact request/status/response evidence, and the production request classifier. Default is complete, context equality is refused, and missing usage is fault. Every preexisting contextual-question assertion remains and passed.
- `runtime.test.ts` loses only the contiguous ranked-infeasibility block and its unused imports. The later no-live evaluation control and trajectory artifact remain.
- `refusal.test.ts` contains the moved filing/candidate/select/report and borrowed-resource assertions. It creates an empty seed and authentic deployment/freeze/resource prerequisites for `q4`, `g4`, `q2`, and `g2`. It invokes no runtime preparation, generation, fit, trajectory, oracle reader, or live model. Its scratch root is `tmp/units/aggregate-sustained-refusal-fix-fixtures`.

The extracted proof preserves filing exit `3`, candidate exit `3`, selection exit `3`, audit report exit `0`, inconclusive recommendation, preparation coverage, foreign-resource rejection, and the unchanged peer call count during that rejection. The foreign binding uses an authentic parsed `q4` filing execution and the authentic `g4` resource. Additional assertions pin candidate rank `q4`, `g4`, `q2`, `g2`, seed order `aggregate`, `records`, rejected selection, and absent chosen candidate.

The measured filings retain complete integer raw usage, exact frozen judge model identity, a nonempty measured boundary failure, empty boundary errors, and unsent null followers after the first sent request. `readPreparationFailure` accepts each actual classification. The separate authentic `q4` missing-usage filing returns exit `1`; its actual completed HTTP-200 response lacks usage, the real boundary reader retains operational and follower-model errors with no measured refusal, and preparation rejects it. Missing usage resets before measured filings.

The dispatch map results are `aggregate-sustained-refusal-fix-population.md` and `aggregate-sustained-refusal-fix-population-after.md`. Peer consumers are `Peer.test.ts`, `runtime.test.ts`, `transport.test.ts`, `products.test.ts`, `preparation.test.ts`, and the extracted `refusal.test.ts`; no additional consumer appeared. The emitted import basename `Peer.js` is required for the reference census.

## Before and after evidence

The same direct command ran before and after the correction:

```text
node --test .orkestrel/agent/instruments/harness/.build/bench5/sustained/tests/Peer.test.js
```

Before: collected `2`, passed `1`, failed `1`; child exit `1`, duration `473 ms`. The collected refusal regression reported `actual: complete`, `expected: refused`, at `complete boundary usage must produce measured refusal`. The support-question test passed. Before build exited `0` in `4329 ms`.

After: collected `2`, passed `2`, failed `0`; child exit `0`, duration `453 ms`. The isolated command `node --test .orkestrel/agent/instruments/harness/.build/bench5/sustained/tests/refusal.test.js` collected `1`, passed `1`, failed `0`; exit `0`, duration `84815 ms`. Its retained authentic outputs are under `tmp/units/aggregate-sustained-refusal-fix-fixtures/proof-op7fI8`.

The before runner completed the build and regression, then its ancillary count parser rejected Node's spec reporter because it expected TAP-prefixed counts. `aggregate-sustained-refusal-fix-before-2.ts` read the saved full output, checked the named assertion and actual counts, and recorded `before-logs/result.json` without another test run. This reporter mismatch did not change the collected test failure.

## Scoped commands

The scoped after runner used the following argument arrays through Node. Complete outputs and command/PID/duration records are under `tmp/units/aggregate-sustained-refusal-fix-after-logs`.

| Stage | Command | Exit | Duration |
| --- | --- | ---: | ---: |
| Scoped format convergence | `node node_modules/oxfmt/bin/oxfmt --config .oxfmtrc.json --ignore-path tmp/units/aggregate-sustained-refusal-fix-ignore.txt <owned files>` | 0 | 77 ms |
| Harness typecheck | `node node_modules/typescript/bin/tsc --noEmit --project .orkestrel/agent/instruments/harness/build.json --typeRoots node_modules/@types` | 0 | 3223 ms |
| Scoped lint | `node node_modules/oxlint/bin/oxlint --config tmp/units/aggregate-sustained-refusal-fix-lint.json --no-ignore --deny-warnings <owned files>` | 0 | 218 ms |
| Scoped format check | `node node_modules/oxfmt/bin/oxfmt --config .oxfmtrc.json --ignore-path tmp/units/aggregate-sustained-refusal-fix-ignore.txt --check <owned files>` | 0 | 71 ms |
| Fixture-bound build | `node .orkestrel/agent/instruments/harness/tools/build.ts --compiler node_modules/typescript/bin/tsc --types node_modules/@types --resource tmp/units/aggregate-runtime-workload-audit-2/manifest.json` | 0 | 4237 ms |
| Direct protocol proof | The exact Peer command preceding this table | 0 | 453 ms |
| Isolated filing/ranking proof | The exact refusal command preceding this table | 0 | 84815 ms |

`<owned files>` is the exact sustained test-directory population `Peer.ts`, `Peer.test.ts`, `runtime.test.ts`, and `refusal.test.ts`. The scoped lint config copies the repository rules, removes only the campaign ignore, and resolves the same policy plugin. The built harness reported `622` files from `493` exact inputs.

The after launch was:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-sustained-refusal-fix-after.jsonl --errors tmp/units/aggregate-sustained-refusal-fix-after.err --cap 300 -- node tmp/units/aggregate-sustained-refusal-fix-after.ts
```

It completed with exit `0`, uncapped, in `93190 ms` on Windows. The before launch used the same `300`-second cap with the `aggregate-sustained-refusal-fix-before` journal/error/runner paths.

## Source custody

Root independently read these exact SHA-256 hashes after the passed proof and before launching the independent verifier:

| Path under the harness | SHA-256 |
| --- | --- |
| `bench5/sustained/tests/Peer.ts` | `895a5248b1faefc2cbfc26d309db7c918cb3066d439f349548ae32c589ea43e7` |
| `bench5/sustained/tests/Peer.test.ts` | `d91291f1fd2acdf8356fb4053de1ac5d38bff8d8ecc27494565a039507c8650e` |
| `bench5/sustained/tests/runtime.test.ts` | `386d835fa16010448813dd63a11086cb807c5a091acfc2279fa5e6ecb9bbd989` |
| `bench5/sustained/tests/refusal.test.ts` | `847d8a33083deb48b6f1d494bcf7de04eefa3db02312682cfcac6c2f23b5b799` |
| `.build/build-manifest.json` | `d8546db78ae17d5427e38a9e11ab14e7ff8808589706123324ceb4b502f37d5e` |

The pending flush files, Driver, user bench4 edit, and misplaced harness cache received no edit from this unit. Root read the actual runtime diff and the full extracted assertions before source release. A tmp custody helper's optional exact-text reconstruction stopped before producing an artifact because its formatter whitespace template did not match; root's independent byte hashes are the custody reading reported here. No source or build mutation resulted from that helper.

## Process closure and release

The before recorded PIDs were `13328`, `27408`, and `68220`. The after recorded PIDs were `7540`, `42316`, `23788`, `53400`, `40124`, `26752`, `20652`, and `66404`. The final Windows process query returned no row for these process IDs or children whose parent is one of these IDs. Source and build were released to root after that reading; no subsequent mutation, build, or check ran in this unit.

## Pending verifier work and limits

The sustained runtime, transport, products, and preparation consumers remain for the independent verifier. The independent verifier also owns the boundary-usage mutation, missing-usage classification controls, existing flush and support-question controls, restoration proofs, and canonical build restoration. No trajectory test, broad population, tree-wide gate, model inference, install, or git mutation ran in this unit. The resource-bound build remains available for the verifier.

These fixture results establish protocol behavior and retained-evidence validation only. They support no model-quality, adoption, or performance conclusion.
