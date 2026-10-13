# Aggregate capacity probe: fixed live observation

**Result:** the fixed driver completed with exit 0 in 306,155 ms, `complete: true`, and `capped: false`. Raw custody and independent binding checks pass. This is one controlled local observation; it does not establish general capacity, context shifting, quality, or adoption.

## Execution and custody

Exact command executed once:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-capacity-probe/live.log --errors tmp/units/aggregate-capacity-probe/live.err --cap 1200 -- node tmp/units/aggregate-capacity-probe/execute.ts --execute --packet 27ff15eb80f8dba7d236cdf08e4330a3e37ddd8fd9a46afaf11ddd77f2a9f7d2 --operator b054ebc86779435ff2935b9a1a669d9a7eac6f20b538ab5fe5d8d6dcce50aa6f --receipt tmp/units/aggregate-capacity-probe/daemon-start.json --custody 19c077e9190accb54e1e791d2be4493412431d22a86778a1b1e229255854a120 --output tmp/units/aggregate-capacity-probe/live1 --host "Windows; controlled attached daemon; exclusive serial client; no other service requests"
```

The canonical launcher reported execute PID 53032. Its captured terminal journal is [live.log](tmp/units/aggregate-capacity-probe/live.log); stderr/status is [live.err](tmp/units/aggregate-capacity-probe/live.err), exactly `exit=0 signal=none capped=false duration_ms=306155`. The retained launcher JSON says output `live1`, `complete:true`, inventory 95,140 bytes, SHA-256 `06c7f02d44f0a30d320d091711c4762b0c9a5d77d50d83cacd2d008f23b7e80d`. Inventory lists 70 captures and 353 payload files; all capture IDs match the fixed plan/order, every capture is complete and under its ceiling, and each inference is immediately followed by its `/api/ps` snapshot. All request, response, head, and capture-record files were checked against inventory hashes/byte counts; every frozen vector request matches its exact body/hash/size. Directory membership exactly matches inventory plus `inventory.json`. Overall statuses: 65 HTTP 200 and five HTTP 400; the 400 bodies are complete, bounded observations, not transport failures.

Frozen packet hash/bytes: `27ff15eb80f8dba7d236cdf08e4330a3e37ddd8fd9a46afaf11ddd77f2a9f7d2` / 80,122. Operator identity: `b054ebc86779435ff2935b9a1a669d9a7eac6f20b538ab5fe5d8d6dcce50aa6f`. The receipt [daemon-start.json](tmp/units/aggregate-capacity-probe/daemon-start.json) is 449 bytes, hash `19c077e9190accb54e1e791d2be4493412431d22a86778a1b1e229255854a120`, PID 38284, declaring host 127.0.0.1:11434, parallelism 1, maximum loaded models 0, context shift 0, and parallel runner count 1. Runtime packet/receipt/source bindings match; 23 runtime sources match the packet, and all final source/check bindings match the independent baseline. Packet and final source inventory remained unchanged (inventory SHA `cdfead2e08c018d73fab43e274b8c8abef7103f231517064ede4ace99bfcb0e2`). Root's preflight recorded PID 38284 as the listener and the sole controlled service; this lane issued the fixed serial request sequence. No independent OS load metric was collected, so host load is unquantified.

After terminal status, launcher PID 53032 had no process entry and no children. Controlled daemon PID 38284 remained running/listening as instructed; it was not stopped. No additional service request was made. Request limits were inference 30, request 32,768 bytes, response 262,144 bytes, metadata 1,048,576 bytes; per-inference timeout 300,000 ms, snapshot timeout 30,000 ms, outer cap 1,200 seconds.

## Per-vector observations

`ctx` is configured `num_ctx`; `pred` is configured `num_predict`. Counts are service-reported prompt/evaluation token counts, not configured context sizes. Hashes identify response text bytes; the identical short response hash (`51062b…fe7e6`) corresponds to the expected parcel identifier. The one-token reachability responses all have hash `5fa7aa…44e5f`. No thinking-content field was present in these native results. Cache vectors repeated the positive short request; their reported counts are shown as returned, without subtracting or double-counting any cache field (none was supplied).

| Vector | ctx / pred | HTTP | Model reported | prompt / eval | done / reason | response text SHA-256 prefix |
|---|---:|---:|---|---:|---|---|
| q2-positive | 8192 / 64 | 200 | qwen3.5:2b-q4_K_M | 62 / 11 | true / stop | 51062b…fe7e6 |
| q2-cache | 8192 / 64 | 200 | qwen3.5:2b-q4_K_M | 62 / 11 | true / stop | 51062b…fe7e6 |
| q2-reachability | 8192 / 1 | 200 | qwen3.5:2b-q4_K_M | 5242 / 1 | true / length | 5fa7aa…44e5f |
| q2-overflow | 2048 / 1 | 400 | — | — | — | — |
| q2-smaller | 2048 / 64 | 200 | qwen3.5:2b-q4_K_M | 62 / 11 | true / stop | 51062b…fe7e6 |
| q2-restored | 8192 / 64 | 200 | qwen3.5:2b-q4_K_M | 62 / 11 | true / stop | 51062b…fe7e6 |
| q2-generation | 2048 / 4096 | 200 | qwen3.5:2b-q4_K_M | 46 / 2002 | true / length | 0ccf0a…c8d1 |
| q4-positive | 8192 / 64 | 200 | qwen3.5:4b-q4_K_M | 62 / 11 | true / stop | 51062b…fe7e6 |
| q4-cache | 8192 / 64 | 200 | qwen3.5:4b-q4_K_M | 62 / 11 | true / stop | 51062b…fe7e6 |
| q4-reachability | 8192 / 1 | 200 | qwen3.5:4b-q4_K_M | 5242 / 1 | true / length | 5fa7aa…44e5f |
| q4-overflow | 2048 / 1 | 400 | — | — | — | — |
| q4-smaller | 2048 / 64 | 200 | qwen3.5:4b-q4_K_M | 62 / 11 | true / stop | 51062b…fe7e6 |
| q4-restored | 8192 / 64 | 200 | qwen3.5:4b-q4_K_M | 62 / 11 | true / stop | 51062b…fe7e6 |
| q4-generation | 2048 / 4096 | 200 | qwen3.5:4b-q4_K_M | 46 / 2002 | true / length | 0ccf0a…c8d1 |
| g2-positive | 8192 / 64 | 200 | gemma4:e2b-it-q4_K_M | 59 / 11 | true / stop | 51062b…fe7e6 |
| g2-cache | 8192 / 64 | 200 | gemma4:e2b-it-q4_K_M | 59 / 11 | true / stop | 51062b…fe7e6 |
| g2-reachability | 8192 / 1 | 200 | gemma4:e2b-it-q4_K_M | 5239 / 1 | true / length | 5fa7aa…44e5f |
| g2-overflow | 2048 / 1 | 400 | — | — | — | — |
| g2-smaller | 2048 / 64 | 200 | gemma4:e2b-it-q4_K_M | 59 / 11 | true / stop | 51062b…fe7e6 |
| g2-restored | 8192 / 64 | 200 | gemma4:e2b-it-q4_K_M | 59 / 11 | true / stop | 51062b…fe7e6 |
| g2-generation | 2048 / 4096 | 200 | gemma4:e2b-it-q4_K_M | 43 / 1892 | true / stop | 2a7aa0…07af6 |
| g4-positive | 8192 / 64 | 200 | gemma4:e4b-it-q4_K_M | 59 / 11 | true / stop | 51062b…fe7e6 |
| g4-cache | 8192 / 64 | 200 | gemma4:e4b-it-q4_K_M | 59 / 11 | true / stop | 51062b…fe7e6 |
| g4-reachability | 8192 / 1 | 200 | gemma4:e4b-it-q4_K_M | 5239 / 1 | true / length | 5fa7aa…44e5f |
| g4-overflow | 2048 / 1 | 400 | — | — | — | — |
| g4-smaller | 2048 / 64 | 200 | gemma4:e4b-it-q4_K_M | 59 / 11 | true / stop | 51062b…fe7e6 |
| g4-restored | 8192 / 64 | 200 | gemma4:e4b-it-q4_K_M | 59 / 11 | true / stop | 51062b…fe7e6 |
| g4-generation | 2048 / 4096 | 200 | gemma4:e4b-it-q4_K_M | 43 / 2002 | true / length | 0ccf0a…c8d1 |
| mica-reachability | 8192 / 1 | 200 | hf.co/sky7350/Mica-v0.1-4B:Q4_K_M | 5243 / 1 | true / length | 5fa7aa…44e5f |
| mica-overflow | 2048 / 1 | 400 | — | — | — | — |

All five overflow bodies report `request (5242 tokens) exceeds the available context size (2048 tokens)` for q2/q4, `5239` for g2/g4, and `5243` for Mica; each is native `exceed_context_size_error` with `n_ctx:2048`. These are HTTP errors with complete transport, not missing evidence. For q2/q4/g2/g4, the adequate reachability request at configured 8192 succeeds with prompt count 5239–5242; the paired 2048 overflow rejects it. The separate smaller short prompt at 2048 succeeds and the restored 8192 short prompt succeeds. These are observed request outcomes, not proof of general capacity or retained history.

Immediate `/api/ps` snapshots after every vector report the same model digest and configured active context: q2 digest `78a738cc…0dc5d11`, q4 `d8b0f5e9…2e38c04`, g2 `b3704936…9b563fc2`, g4 `dc35e8d9…7300c9c`; context follows each tested 8192/2048 setting. Mica digest `ccc93a29…8da3ce9b` reports context 8192 after reachability and 2048 after overflow. Each capture's full model/digest/context record is retained in the inventory and analysis JSON.

The generation-control requests use `pred=4096` at configured context 2048. q2, q4, and g4 returned `done_reason:length` at 2002 eval tokens; g2 returned `done_reason:stop` at 1892, so its early stop is inconclusive for context shifting. The separate one-token reachability control stops at `length` as configured. Neither a length stop nor the early stop proves context-window shifting; token totals and retained runner evidence do not distinguish all competing explanations required for that claim. No generation-shift conclusion is made. Mica's pair is reachability/overflow only, with no generation control.

## Evidence files and limits

- Raw response/request/capture custody: `tmp/units/aggregate-capacity-probe/live1/` (all native bytes retained; inventory is authoritative).
- Native analysis: `tmp/units/aggregate-capacity-probe-live-reading/analysis-verified.json`; checker: `tmp/units/aggregate-capacity-probe-live-reading/LiveReading.ts`.
- Launcher stdout and stderr/status: `tmp/units/aggregate-capacity-probe/live.log` and `tmp/units/aggregate-capacity-probe/live.err`.
- Driver's inference/snapshot sequencing: `tmp/units/aggregate-capacity-probe/Driver.ts` lines 76–80; fixed plan/bindings: `tmp/units/aggregate-capacity-probe/prepared/packet.json`.

The execution is bounded to this attached daemon, fixed sequence, and capture. It provides no offline token-fit comparison, no independent service non-truncation proof, no per-request process identity, no full-history-retention demonstration, and no model-quality comparison. Root owns any further interpretation.