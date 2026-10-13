# Aggregate capacity probe preparation

The offline packet, observational driver, and explicit controlled-daemon entry are prepared. Scoped strict TypeScript, syntax, frozen-data comparisons, and offline refusal controls pass. No HTTP request, daemon start, process stop, inference, install, cleanup, commit, push, or canonical edit ran. Root resolved the environment-merge instruction interpretation described in the clarification paragraph; no live authorization was given. Independent source review and verification remain root's acceptance work.

## Bind the prepared artifacts

The run on Windows with Node v24.21.0 retained these exact SHA-256 bindings.

| Artifact | SHA-256 | Bytes |
| --- | --- | --- |
| `tmp/units/aggregate-capacity-probe/prepared/packet.json` | `27ff15eb80f8dba7d236cdf08e4330a3e37ddd8fd9a46afaf11ddd77f2a9f7d2` | 80122 |
| `tmp/units/aggregate-capacity-probe/prepared/inventory.json` | `f32a5243fb2765f786be00726d555f11da7a89dfe73c083406f71acc1775f117` | 7379 |
| `tmp/units/aggregate-capacity-probe/checks/offline.json` | `db5daf8d0277e563db9ce4fa89091fca33f107f85a32e5156a6d66f382919cfe` | 3114 |
| `tmp/units/aggregate-capacity-probe/final-source-inventory.json` | `cdfead2e08c018d73fab43e274b8c8abef7103f231517064ede4ace99bfcb0e2` | 3736 |
| `tmp/units/aggregate-capacity-probe/final-additions.diff` | `628a5a9b76f8497b6a5c1244cee8fc42728e14be0ec898758b0f59c8c3a7846f` | 42245 |

The runtime operator hash is `b054ebc86779435ff2935b9a1a669d9a7eac6f20b538ab5fe5d8d6dcce50aa6f`. The final source inventory records each source/configuration file and the exact additions patch; the packet binds runtime source files, reused helper source, evidence reports, retained Mica route evidence, workload manifests, and created diagnostic input files. The prepared inventory records exact request-body hashes and bytes. Earlier `additions.diff` and `source-inventory.json` artifacts remain as the earlier reading; the `final-` artifacts supersede those source readings. No runtime source changed after packet preparation.

## Freeze the sequence

The preparation run measured 30 diagnostic inference bodies and a maximum serialized body of 5639 bytes. Model identities are read from the q2/q4/g2/g4 freeze manifests; their decision/summarizer tags and digests must agree. Mica identities must agree across those manifests and its retained request must select raw `/api/generate`. No evaluation dataset is traversed.

The packet preserves this serial sequence for q2, q4, g2, and g4 in that order: short chronological positive at context8192/predict64; identical-body cache repeat; large-old-message reachability at context8192/predict1; identical history/options at context2048/predict1; short positive at context2048/predict64; original short positive at context8192/predict64; finite integer-generation control at context2048/predict4096. These models use `/api/chat`, think:false, temperature0, seed7, presence_penalty1.5, top_k20, and top_p0.95. Mica follows with the explicit raw ChatML-style reachability/overflow pair at contexts8192/2048, predict1, and temperature1. Every inference body has truncate:false, shift:false, stream:false, and keep_alive:5m.

The reachability history contains a system final-request instruction, older user content consisting of ' 1' repeated 2600 times, an assistant acknowledgement, and a final user request for 'Ready'. Repetition count is an input definition, never a token-count assertion. The short positive uses the fictional identifier PARCEL-CEDAR-7319. These diagnostic inputs are retained in `prepared/short.json`, `history.json`, `generation.json`, and `mica.txt`.

Initial metadata is version/tags/ps followed by show(verbose:false) for each declared model. Every inference capture is immediately followed by a bounded ps capture before another inference. A failed inference transport still attempts that snapshot. Final metadata is tags/ps. No vector retries. The complete plan would issue 30 inference and 40 metadata requests; this is a prepared-plan measurement, not a live count.

Operational limits are inference30, request32768 bytes, response262144 bytes, metadata1048576 bytes, inference timeout300000 ms, metadata timeout30000 ms, and outer duration1200000 ms. A byte breach preserves the captured prefix, aborts the response, attempts the associated snapshot, and ends incomplete. Redirects are refused. Headers/status, exact request bytes, complete/partial entity-body bytes, timestamps, monotonic durations, and native errors including nested causes are retained before any decoding. The driver decodes no inference response or usage field.

## Verify offline behavior

The executed commands and readings were:

```text
node node_modules/typescript/bin/tsc -p tmp/units/aggregate-capacity-probe/tsconfig.json
exit 0, no diagnostics; final run after all source writes

node tmp/units/aggregate-capacity-probe/prepare.ts --prepare
exit 0; offline:true; inference:30; maximum:5639; exact hashes in the artifact table

node tmp/units/aggregate-capacity-probe/verify.ts
exit 0; pass:true; evidence hash db5daf8d0277e563db9ce4fa89091fca33f107f85a32e5156a6d66f382919cfe

node --check tmp/units/aggregate-capacity-probe/index.ts
node --check tmp/units/aggregate-capacity-probe/inventory.ts
exit 0, no diagnostics

node tmp/units/aggregate-capacity-probe/inventory.ts
exit 0; final source inventory hash cdfead2e08c018d73fab43e274b8c8abef7103f231517064ede4ace99bfcb0e2

git status --porcelain
 M .orkestrel/agent/instruments/bench4/Driver.mjs

git diff --numstat
6       292     .orkestrel/agent/instruments/bench4/Driver.mjs
```

The validation entry runs Node syntax checks on the runtime files and its own files, then invokes main/prepare/execute/start entries with no arguments and checks each offline:true refusal. It compares chronological inputs, cache-body identity, overflow's context-only change, literal controls, routes, exact prepared request bytes, and byte bounds.

Negative controls reach the real admission/bounds code with wrong packet/operator hashes, occupied/escaped/reserved output, missing receipt, absent host condition, repeated arguments, excessive inference count, an oversized body, a wrong body hash, an empty plan, and incomplete execute arguments. Each refuses. Direct Driver.execute with an absent receipt rejects before creating its output directory. No model fake, fetch replacement, network fixture, or live peer is used. These controls cover admission and frozen-data boundaries; streaming transport and daemon lifecycle remain unexecuted.

All writes belong to the assigned instrument directory and this report. The gitignored instrument additions are represented by the exact final patch and inventories. Git status reports only the pre-existing unrelated bench4 change. The reused Recorder/helpers and retained service/instrument/model inputs remain unchanged; the packet records their input hashes. No tree-wide gate ran.

## Declare prospective launch commands

Root must independently review and verify this unit, close the old recorded daemon tree, and authorize the controlled start before running either command. DAEMON_START_SHA256 means the hash root approves after reading the immutable start receipt; it is unknown before a real start. The receipt and live output paths must be vacant.

```powershell
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-capacity-probe/daemon.log --errors tmp/units/aggregate-capacity-probe/daemon.err --cap 43200 -- node tmp/units/aggregate-capacity-probe/start.ts --start --receipt tmp/units/aggregate-capacity-probe/daemon-start.json --operator b054ebc86779435ff2935b9a1a669d9a7eac6f20b538ab5fe5d8d6dcce50aa6f

node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-capacity-probe/live.log --errors tmp/units/aggregate-capacity-probe/live.err --cap 1200 -- node tmp/units/aggregate-capacity-probe/execute.ts --execute --packet 27ff15eb80f8dba7d236cdf08e4330a3e37ddd8fd9a46afaf11ddd77f2a9f7d2 --operator b054ebc86779435ff2935b9a1a669d9a7eac6f20b538ab5fe5d8d6dcce50aa6f --receipt tmp/units/aggregate-capacity-probe/daemon-start.json --custody DAEMON_START_SHA256 --output tmp/units/aggregate-capacity-probe/live1 --host "Windows; controlled attached daemon; exclusive serial client; no other service requests"
```

The daemon entry refuses other platforms, preserves attachment, uses the full Ollama executable with ['serve'], shell:false, windowsHide:true, and detached:false, and pipes child output to the canonical launcher. It overrides only OLLAMA_HOST=http://127.0.0.1:11434, OLLAMA_NUM_PARALLEL=1, OLLAMA_MAX_LOADED_MODELS=0, LLAMA_ARG_CONTEXT_SHIFT=0, and LLAMA_ARG_N_PARALLEL=1. The start receipt records executable byte identity, declared values, child pid, and timestamp once. Terminal exit/error goes to the separate create-only `.exit.json` artifact. It never signals an existing unrelated process; signal forwarding targets only its recorded child tree. Canonical Windows launcher force termination owns the attached tree.

## Record interpretation limits and deviation

The driver certifies no capacity, answer quality, model feasibility, removal-control behavior, model/backend association, selected-child/parent digest equality, or per-sequence capacity. A complete raw capture can contain HTTP errors, malformed usage, or an inconclusive natural stop. The one-token reachability readout is an intentional output-limit diagnostic. Mica's pair makes no generation-shift claim. Exclusive service use is the explicit operator condition, not telemetry. Root must interpret snapshots, raw counts, runner observations, errors, and finite-stop evidence after a later live run.

A force-killed parent can leave terminal or final inventory absent. Root must treat that absence as incomplete evidence, retain per-call artifacts and the canonical launcher journals, and never infer successful completion. Offline controls did not execute the streaming reader, request timeout, byte-abort path, child spawn, or tree termination.

Root clarified after reading portability.md that internal case-insensitive inherited-key filtering solely to construct the child environment is within scope and required by the portability rule. The brief restriction forbids environment dumps, logging, persistence, and unrelated inspection; it permits ordinary in-memory inheritance/merging for spawn. Daemon.ts prints and retains no inherited environment keys or values; only declared override values enter the receipt. The launched brief remains unchanged. Offline preparation, implementation, guards, syntax/types, inventories, and this report are done. Every live operation remains unexecuted and requires a later root dispatch. No unresolved instruction deviation remains.
