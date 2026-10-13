# Prepare the bounded Gemma generation successor

The offline successor is prepared for independent scoped verification and review. No service operation, model inference, daemon startup, source integration, dependency change, or git mutation ran. Acceptance remains with root. The frozen packet is a separate path-bound instrument under `tmp/units/aggregate-capacity-g2-control`; the predecessor remains unchanged.

The completed runtime uses only Gemma tag `gemma4:e2b-it-q4_K_M`, digest `b37049369adfe3d2b653af0ab301a062ca5cbe96ace6aa0d3f2559ee9b563fc2`, on `/api/chat`. Its manifest identity must equal the retained predecessor packet's Gemma identity. The prepared messages preserve the original generation system and final user strings from `aggregate-capacity-probe/live1/g2-generation.request.bin`, with `' 1'.repeat(400)` and `Acknowledged the older content.` inserted as the older user/assistant pair in that order.

The fixed population is reachability followed by generation, each at `num_ctx:2048`; their `num_predict` values are respectively `1` and `4096`. The bodies differ only in that output option. The original `temperature:0`, `seed:7`, `presence_penalty:1.5`, `top_k:20`, `top_p:0.95`, `think:false`, `truncate:false`, `shift:false`, `stream:false`, and `keep_alive:"5m"` settings are preserved.

The unchanged Driver sequence yields the following request IDs: `initial-version`, `initial-tags`, `initial-ps`, `initial-show-g2`, `g2-reachability`, `g2-reachability-ps`, `g2-generation`, `g2-generation-ps`, `final-tags`, and `final-ps`. The prepared plan therefore contains 2 inference requests and 8 metadata requests. This is an offline source/population proof of the planned order; no successor live sequence has been observed.

The request, inference-response, and metadata ceilings are 32,768, 262,144, and 1,048,576 bytes. The per-inference timeout is 60,000 ms, metadata timeout is 30,000 ms, and outer operational ceiling is 180,000 ms. There is no repeat, fallback, alternative prompt, or adaptive increase.

## Frozen identities

The finalization command measured these exact identities. Operator bytes are the UTF-8 size of `JSON.stringify` over the ordered operator binding array, whose hash is the operator identity; they are not the sum of runtime source sizes.

| Artifact | SHA-256 | Bytes |
| --- | --- | ---: |
| `prepared/packet.json` | `bb7d5de942f9c4e5168fa77d0bb344bcb2d585b931129294b68c74bb8e94bd56` | 7380 |
| Ordered operator bindings | `5504592be3b85761ec98574ac48e95be539998b22da5b42f2d1d5a6b6dbca014` | 1332 |
| `prepared/generation.json` | `695dba977ed20b4221d997a93a34e9cb5a5c7acd831c8fa56cd399d95cd7dab3` | 1148 |
| `prepared/g2-reachability.request.bin` | `61668937ffba7c3d9205c9660cd7a424f07a6686250b93bf9871050ca6727614` | 1311 |
| `prepared/g2-generation.request.bin` | `08a3a074bd155facceb93e70dd6cba949e6c985d631a4166fce06d508821df48` | 1314 |
| `prepared/inventory.json` | `e7b6d13ace651afdc352facf93e6bb610399c6a3d1e1f51740ab168e995b9b93` | 1198 |
| `final-source-inventory.json` | `15f01005e2911617ef95f150f79f4fdca5c0eb32a1b280019e3cb7562f2ac26d` | 21777 |
| `predecessor-source.diff` | `7cd2bb83470247d872a614cafdd002467a83dd573589ae7c196bda1f76c5fe0b` | 9930 |

See [the final source/input inventory](aggregate-capacity-g2-control/final-source-inventory.json), [the exact runtime diff against the predecessor](aggregate-capacity-g2-control/predecessor-source.diff), and [the complete owned source additions](aggregate-capacity-g2-control/final-additions.diff). The additions diff has SHA-256 `09a5ba23518ac52be2b429c887913f0319f1f2129e773d3540287641d89f2d7e`. See [the frozen messages](aggregate-capacity-g2-control/prepared/generation.json), [the reachability body](aggregate-capacity-g2-control/prepared/g2-reachability.request.bin), and [the generation body](aggregate-capacity-g2-control/prepared/g2-generation.request.bin).

The runtime diff changes only `constants.ts`, the imports and preparation section of `Driver.ts`, and the population construction in `readModels`/`buildPacket` in `helpers.ts`. The create-only capture, execute/metadata sequence, receipt validation, output validation, byte bounds, argument admission, hash/binding helpers, and default-offline dispatch are byte-identical to the predecessor. Types, daemon source, and the runtime entries are byte-identical copies. Path-derived constants identify the successor directory without changing the directory mechanism.

The before/after predecessor inventories cover 418 files measured by `copy.ts` and `finalize.ts`, including predecessor runtime, prepared inputs, packet, receipt, live captures, and existing check evidence. Both inventories have SHA-256 `89b5836f164c2618ff4ddc2599af5803be7e511e1567de5882eee6124ff4830b`; their complete bindings compare equal. See [the baseline](aggregate-capacity-g2-control/predecessor-before.json) and [the final comparison](aggregate-capacity-g2-control/predecessor-after.json).

## Scoped proof

The following commands ran on Windows with Node v24.21.0. Every command's complete stdout/stderr, exact arguments, exit, signal, and duration is retained without output filtering in [the final gate evidence](aggregate-capacity-g2-control/evidence/gates-2/). The successful `check.ts` invocation took 3,132 ms in the harness measurement. Its strict type command took 916.1143 ms, preparation took 150.491 ms, and population verification took 142.6388 ms in the retained command records. Other host load was not measured.

| Command | Result |
| --- | --- |
| `node tmp/units/aggregate-capacity-g2-control/copy.ts` | Exit 0; create-only runtime copy and predecessor baseline; no network. |
| `node node_modules/typescript/bin/tsc -p tmp/units/aggregate-capacity-g2-control/tsconfig.json` | Exit 0; empty stdout/stderr under strict, unchecked-index, and exact-optional checks. |
| `node --check` for every owned root TypeScript file | All final syntax outcomes exit 0; exact filenames and bare outputs retained. |
| `node tmp/units/aggregate-capacity-g2-control/witness-negative.ts` | Expected exit 3; refusing global witness reports global 1/native 0; no native request. |
| `node --import file:///C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-capacity-g2-control/witness.ts` followed by each default runtime entry | `main.ts`, `prepare.ts`, `execute.ts`, and `start.ts` exit 0, report offline, and report global 0/native 0. |
| `node tmp/units/aggregate-capacity-g2-control/prepare-offline.ts` | Exit 0; packet prepared once after source completion; global 0/native 0. |
| `node tmp/units/aggregate-capacity-g2-control/verify.ts` | Exit 0; exact population, bodies, settings, identity, source preservation, and refusal assertions pass; global 0/native 0. |
| `node tmp/units/aggregate-capacity-g2-control/check.ts` | Final invocation exits 0 and prints `{"gates":true,"service":false}`. |
| `node tmp/units/aggregate-capacity-g2-control/finalize.ts` | Exit 0; exact diffs, inventory, predecessor equality, and actual git status retained. |

The refused controls ran through the real successor Driver and unchanged admission functions. The predecessor packet identity raises `Hash mismatch`; the predecessor operator identity raises `Operator hash mismatch`; the missing receipt raises `ENOENT`; and `Driver.main(['--execute'])` returns 64 with `Expected every named option exactly once`. The prospective output `evidence/never-created` remains absent. See [the population/control record](aggregate-capacity-g2-control/evidence/population.json), SHA-256 `52dac23f45667a410a0d7f3fdf076d5346ac89ecb401d8fea17c2e82bb1aaef2`, 8129 bytes. These controls prove refusal of changed supplied identities; they do not claim exhaustive filesystem-fault or source-mutation coverage.

The refusing global fetch witness follows the established boundary/focused offline pattern and uses the existing `aggregate-judge-counterfactual/NetworkWitness.ts` for native Undici observations. The direct attempted fetch control terminates before native dispatch. No project-owned behavior or capture implementation is mocked, replaced, or replayed.

The initial `check.ts` invocation exited 1 because its wrapper expected exit 1 from the witness negative control, while the witness intentionally sets exit 3 when it records a forbidden dispatch attempt. The control reported global 1/native 0 and the exact refusal message. That invocation froze no packet. The wrapper expectation was corrected to 3 before final preparation, and original evidence remains create-only under `evidence/`; the passing final evidence lives under `evidence/gates-2/`. A rejected initial patch attempted case-colliding `Gates.ts`/`gates.ts` and `Inventory.ts`/`inventory.ts` paths; it wrote nothing. The settled entries are `check.ts` and `finalize.ts`.

The actual final `git status --porcelain` output is retained in [the git-status record](aggregate-capacity-g2-control/evidence/git-status.json):

```text
 M .orkestrel/agent/instruments/bench4/Driver.mjs
```

That preexisting bench edit is unowned. Root's concurrent promotion of its disjoint records accounts for the earlier status differences. This unit created only its owned ignored directory and this report.

## Prospective execution

The following exact command is prospective and was not run. Root must complete independent verification/review and confirm the controlled daemon/receipt before dispatch. The unchanged receipt is 449 bytes, SHA-256 `19c077e9190accb54e1e791d2be4493412431d22a86778a1b1e229255854a120`, with recorded PID 38284; this offline unit did not observe its process or readiness.

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-capacity-g2-control/live.log --errors tmp/units/aggregate-capacity-g2-control/live.err --cap 180 -- node tmp/units/aggregate-capacity-g2-control/execute.ts --execute --packet bb7d5de942f9c4e5168fa77d0bb344bcb2d585b931129294b68c74bb8e94bd56 --operator 5504592be3b85761ec98574ac48e95be539998b22da5b42f2d1d5a6b6dbca014 --receipt tmp/units/aggregate-capacity-probe/daemon-start.json --custody 19c077e9190accb54e1e791d2be4493412431d22a86778a1b1e229255854a120 --output tmp/units/aggregate-capacity-g2-control/live1 --host "Windows; controlled attached daemon; exclusive serial client; no other service requests"
```

Byte measurements establish no token fit. The padded prompt's token size and stop behavior require the later fixed live run. A natural early stop remains inconclusive. Unchanged capture limits remain governed by the root's bounded observational ruling; universal persistence-failure handling, streaming/native faults, service capacity, context shifting, retention, calibration, evaluation, and model quality are not established by this unit. No deviation required a shared capture or unowned change.
