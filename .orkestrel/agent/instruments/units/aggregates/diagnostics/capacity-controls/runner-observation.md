# Aggregate capacity runner observation

The retained runner log supplies exact one-slot, context, per-task token, timing, and release records for all 30 fixed inference requests. The records match the planned request order and each immediate `/api/ps` snapshot. This supplement adds bounded runner evidence; it makes no capacity ruling.

## Byte-exact interval

The source is `tmp/units/aggregate-capacity-probe/daemon.err`, captured at 1,220,112 bytes with SHA-256 `a0698dd627435ca44594eb0fcebc108edb543309547dd350ac614539462d3297`. The retained interval begins at source line 11, byte offset 2,583, at timestamp `2026-10-11T07:03:50.733-04:00`, the first capacity model-load entry. It ends exclusively at byte offset 586,633, immediately before source line 7851, timestamp `2026-10-11T07:14:46.195-04:00`, the later boundary-run load. It includes source lines 11–7850, including Mica's overflow at lines 7844–7849 and its runner termination record at line 7850; startup environment text and the later boundary run are excluded.

The exact bytes are retained in `tmp/units/aggregate-capacity-runner-observation/daemon.err.capacity-prefix.bin` (584,050 bytes; SHA-256 `8779f2d6c5835dc8b134e5e6f06a913a9918b57dee2c2af06ebf643d01bac1e2`). The source-prefix hash through the exclusive end offset is `081142c1b7bb2e29584a66663ec6b53989ff1c0e9d5a2a438e93dae5ac70c1fe`. Extraction timestamp: `2026-10-11T11:17:13.163Z`. `custody.json` records the offsets, original lines, source and prefix hashes, selected-byte hash, and extraction time. `Extract.ts` performs the exact byte extraction; `Analyze.ts` rechecks the slice against the current source prefix before mapping runner records. Commands run:

```text
node --experimental-strip-types tmp/units/aggregate-capacity-runner-observation/Extract.ts
node --experimental-strip-types tmp/units/aggregate-capacity-runner-observation/Analyze.ts
```

The analysis reports 18 runner starts and 30 task prompt records, in the packet's fixed vector order. Every runner command has `-np 1`; every runner log initializes `n_slots = 1`. For all 30 requests, command `-c`, runner `n_ctx_slot`, and the corresponding immediate API snapshot `context_length` agree. Snapshot model names match the packet's model tags. The runner log has no unmatched inference task record; the request-to-task association follows the authorized exclusive serial request sequence, not a per-request PID attestation.

## Executable and model identities

Every logged runner command names `C:\Users\mikes\scoop\apps\ollama-full\current\lib\ollama\llama-server.exe`, 22,920 bytes, SHA-256 `f40a1235a8b0b5465fcb6f7769cbffd30f0952e8af575f97941023d614b9477c`. The model blob SHA below comes from the `using llama-server for model` path and the matching `--model` command argument. The snapshot digest is the API-reported model digest; it is a separate identity value.

| Packet model tag | Logged model blob SHA-256 | Immediate API snapshot digest |
|---|---|---|
| `qwen3.5:2b-q4_K_M` | `d9a552ab2828b2be48a251019c2222c52f067f5e4771d3ee12fbeaa6dbf19052` | `78a738cc751e89cba72bb1feabf70f30c31772eb81a89a66af94ecea90dc5d11` |
| `qwen3.5:4b-q4_K_M` | `a9d0a3e1d8c91732a3812becd31f8d4a8ff57414903f226306069f0437e2ac50` | `d8b0f5e9760cd1682034f292d7ef72ec46f432149be0df7574bf2d6e92e38c04` |
| `gemma4:e2b-it-q4_K_M` | `6dd7ac24fe13a238898e16e253ebc7a72fa27fb83f2658c2f6c241df3af5937d` | `b37049369adfe3d2b653af0ab301a062ca5cbe96ace6aa0d3f2559ee9b563fc2` |
| `gemma4:e4b-it-q4_K_M` | `370c2879f17648d337b0ab4e208fdce348e24d1060064e93d7645daafd56d39c` | `dc35e8d9c6061baa6f0fa870975ab6932e2542b579b13ea0f199fa4bb7300c9c` |
| `hf.co/sky7350/Mica-v0.1-4B:Q4_K_M` | `da563489664ac6e633475149835eea8981aa62a27b6151038cc90a88590703d8` | `ccc93a29870522845fccafeb24fbef6c7307995fd9db105cb5c0abff8da3ce9b` |

The 18 runner command records begin on source lines 12, 403, 751, 1078, 1412, 1789, 2122, 2434, 2758, 3368, 3918, 4447, 4982, 5621, 6193, 6750, 7310, and 7593. In that sequence, the first four runs use the q2 blob, the next four q4, the next four g2, the next four g4, and the final two Mica. Within each model group the configured context sequence is 8192, 2048, 8192, 2048, except Mica's 8192 reachability and 2048 overflow pair. Each slot reports the same configured context as its command. `runner-observations-verified.json` records each row's runner number, source lines, slot, context, blob, snapshot name/digest/context, task ID, timing, and release fields.

## Task and release observations

The table gives each task's `task.n_tokens`, prompt/evaluation timing, runner total, and release line. A zero in the `truncated` column is a literal runner record. Timing values are milliseconds. `prompt ms / tokens` and `eval ms / tokens` come from runner timing lines; `total tokens` and `release n_tokens` are reported separately because they can differ. Source line citations refer to the original daemon error log, not renumbered slice lines.

| Vector | Runner / ctx | Prompt tokens | Prompt ms / tokens | Eval ms / tokens | Total tokens / ms | Release n_tokens / truncated | Source lines: task; timing; release |
|---|---:|---:|---:|---:|---:|---:|---|
| q2-positive | 1 / 8192 | 62 | 164.23 / 62 | 100.50 / 11 | 73 / 264.73 | 72 / 0 | 327; 332–334; 336 |
| q2-cache | 1 / 8192 | 62 | 49.55 / 4 | 112.23 / 11 | 15 / 161.78 | 72 / 0 | 348; 355–357; 359 |
| q2-reachability | 1 / 8192 | 5242 | 8340.19 / 5242 | 0.00 / 1 | 5243 / 8340.19 | 5242 / 0 | 378; 396–398; 400 |
| q2-overflow | 2 / 2048 | 5242 | — | — | — | 0 / 0 | 718–720 |
| q2-smaller | 2 / 2048 | 62 | 164.56 / 62 | 100.33 / 11 | 73 / 264.88 | 72 / 0 | 738; 743–745; 747 |
| q2-restored | 3 / 8192 | 62 | 189.59 / 62 | 97.91 / 11 | 73 / 287.50 | 72 / 0 | 1066; 1071–1073; 1075 |
| q2-generation | 4 / 2048 | 46 | 140.94 / 46 | 17721.12 / 2002 | 2048 / 17862.06 | 2047 / 1 | 1393; 1403–1405; 1407 |
| q4-positive | 5 / 8192 | 62 | 366.02 / 62 | 169.09 / 11 | 73 / 535.11 | 72 / 0 | 1712; 1717–1719; 1721 |
| q4-cache | 5 / 8192 | 62 | 81.73 / 4 | 166.15 / 11 | 15 / 247.89 | 72 / 0 | 1733; 1740–1742; 1744 |
| q4-reachability | 5 / 8192 | 5242 | 21973.89 / 5242 | 0.00 / 1 | 5243 / 21973.90 | 5242 / 0 | 1763; 1782–1784; 1786 |
| q4-overflow | 6 / 2048 | 5242 | — | — | — | 0 / 0 | 2089–2091 |
| q4-smaller | 6 / 2048 | 62 | 342.50 / 62 | 168.87 / 11 | 73 / 511.37 | 72 / 0 | 2109; 2114–2116; 2118 |
| q4-restored | 7 / 8192 | 62 | 345.05 / 62 | 169.62 / 11 | 73 / 514.67 | 72 / 0 | 2422; 2427–2429; 2431 |
| q4-generation | 8 / 2048 | 46 | 325.69 / 46 | 32270.81 / 2002 | 2048 / 32596.51 | 2047 / 1 | 2734; 2749–2751; 2753 |
| g2-positive | 9 / 8192 | 59 | 228.65 / 59 | 96.45 / 11 | 70 / 325.10 | 69 / 0 | 3272; 3277–3279; 3284 |
| g2-cache | 9 / 8192 | 59 | 46.16 / 5 | 92.59 / 11 | 16 / 138.75 | 69 / 0 | 3296; 3305–3307; 3312 |
| g2-reachability | 9 / 8192 | 5239 | 13351.10 / 5239 | 0.00 / 1 | 5240 / 13351.10 | 5239 / 0 | 3331; 3360–3362; 3365 |
| g2-overflow | 10 / 2048 | 5239 | — | — | — | 0 / 0 | 3882–3884 |
| g2-smaller | 10 / 2048 | 59 | 234.10 / 59 | 96.76 / 11 | 70 / 330.86 | 69 / 0 | 3902; 3907–3909; 3914 |
| g2-restored | 11 / 8192 | 59 | 243.78 / 59 | 96.77 / 11 | 70 / 340.54 | 69 / 0 | 4432; 4437–4439; 4444 |
| g2-generation | 12 / 2048 | 43 | 180.91 / 43 | 14074.13 / 1892 | 1935 / 14255.04 | 1934 / 0 | 4961; 4970–4972; 4977 |
| g4-positive | 13 / 8192 | 59 | 475.10 / 59 | 156.98 / 11 | 70 / 632.08 | 69 / 0 | 5524; 5529–5531; 5536 |
| g4-cache | 13 / 8192 | 59 | 69.70 / 5 | 148.76 / 11 | 16 / 218.47 | 69 / 0 | 5548; 5557–5559; 5564 |
| g4-reachability | 13 / 8192 | 5239 | 25855.68 / 5239 | 0.00 / 1 | 5240 / 25855.68 | 5239 / 0 | 5583; 5613–5615; 5618 |
| g4-overflow | 14 / 2048 | 5239 | — | — | — | 0 / 0 | 6157–6159 |
| g4-smaller | 14 / 2048 | 59 | 450.02 / 59 | 147.38 / 11 | 70 / 597.40 | 69 / 0 | 6177; 6182–6184; 6189 |
| g4-restored | 15 / 8192 | 59 | 471.14 / 59 | 154.60 / 11 | 70 / 625.75 | 69 / 0 | 6735; 6740–6742; 6747 |
| g4-generation | 16 / 2048 | 43 | 345.47 / 43 | 23308.11 / 2002 | 2045 / 23653.58 | 2047 / 1 | 7286; 7298–7300; 7305 |
| mica-reachability | 17 / 8192 | 5243 | 22647.19 / 5243 | 0.00 / 1 | 5244 / 22647.19 | 5243 / 0 | 7561; 7586–7588; 7590 |
| mica-overflow | 18 / 2048 | 5243 | — | — | — | 0 / 0 | 7844–7846 |

## Reading limits

The one-token reachability vectors have `num_predict: 1` in the frozen packet, one evaluation token in runner timing, and `truncated: 0`; these are consistent with a configured one-token stop. The 2048-context overflow tasks log explicit rejection of 5239–5243 prompt tokens, followed by release `n_tokens = 0, truncated = 0`; no generation occurred. For the four generation controls, the packet sets `num_predict: 4096` while the runner command and slot context are 2048. Q2 and q4 total 2048 with release 2047/truncated 1; g4 total 2045 with release 2047/truncated 1; g2 total 1935 with release 1934/truncated 0. The g2 result is an early stop without an explicit context-exhaustion line. The g4 total/release discrepancy is preserved verbatim rather than reconciled. The bounded interval contains no explicit context-shift event or context-full stop line. The start receipt declares `LLAMA_ARG_CONTEXT_SHIFT=0`; no per-request PID, full-history retention, or general capacity claim follows from these records.

The fixed vector-to-task relation uses packet order and the exclusive serial capture sequence; task prompt counts corroborate the match. Immediate snapshot metadata in `tmp/units/aggregate-capacity-probe-live-reading/analysis-verified.json` contains full model digest/context after every vector. Full structured runner rows and source line references are in `tmp/units/aggregate-capacity-runner-observation/runner-observations-verified.json`. Raw prefix, custody metadata, and extraction/analysis scripts are retained alongside this report. The preceding live report remains unchanged.