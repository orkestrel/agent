# Gemma2 live capacity observation

The fixed two-inference population completed with all ten captures and all 53 inventoried files bound to disk. The generation response ended after 1,189 output tokens with `done_reason: "length"`; its runner task stopped at 2,047 tokens with `truncated=1` in a 2,048-token slot. The raw response and runner log contain no explicit context-shift event or capacity-stop message, so this report records the observed boundary without assigning a stronger cause.

## Run and custody

Executed on Windows with Node v24.21.0. The exact command was:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-capacity-g2-control/live.log --errors tmp/units/aggregate-capacity-g2-control/live.err --cap 180 -- node tmp/units/aggregate-capacity-g2-control/execute.ts --execute --packet bb7d5de942f9c4e5168fa77d0bb344bcb2d585b931129294b68c74bb8e94bd56 --operator 5504592be3b85761ec98574ac48e95be539998b22da5b42f2d1d5a6b6dbca014 --receipt tmp/units/aggregate-capacity-probe/daemon-start.json --custody 19c077e9190accb54e1e791d2be4493412431d22a86778a1b1e229255854a120 --output tmp/units/aggregate-capacity-g2-control/live1 --host "Windows; controlled attached daemon; exclusive serial client; no other service requests"
```

The launcher recorded child PID 38152, exit 0, no signal, `capped=false`, and 17,737 ms duration. Its bounded stdout/stderr records are [live.log](aggregate-capacity-g2-control/live.log) and [live.err](aggregate-capacity-g2-control/live.err). The driver reported complete output inventory `ca9653b2b87817a617a3559b81958f533aad585c21fe1aabe759d9aec5ac1b2a` (14,434 bytes).

Before execution, the unchanged 449-byte receipt parsed to daemon PID 38284 and start time `2026-10-11T11:00:49.815Z`; its SHA-256 was `19c077e9190accb54e1e791d2be4493412431d22a86778a1b1e229255854a120`. PID 38284 was parented by the original launcher PID 60892, whose command line started the receipt-bound daemon. PID 38284 owned the `127.0.0.1:11434` listener. The initial daemon log byte boundaries were `daemon.err` offset 1,245,122 with prefix SHA-256 `b2998b5d58826b77862e1e658a20296dfa4a086dac18a275ffe0dc131c2a9c05`, and `daemon.log` offset 15,809 with prefix SHA-256 `48a12719ee9333fd9373c2f8b69dab15ce3fd55ceb61a12771b9ca1f71dfee29`.

Packet admission matched the frozen packet SHA-256 `bb7d5de942f9c4e5168fa77d0bb344bcb2d585b931129294b68c74bb8e94bd56` (7,380 bytes), operator identity `5504592be3b85761ec98574ac48e95be539998b22da5b42f2d1d5a6b6dbca014`, receipt SHA-256 above, and the prepared request bodies. The [capture inventory](aggregate-capacity-g2-control/live1/inventory.json) lists ten captures in exact order: `initial-version`, `initial-tags`, `initial-ps`, `initial-show-g2`, `g2-reachability`, `g2-reachability-ps`, `g2-generation`, `g2-generation-ps`, `final-tags`, `final-ps`. Each capture is complete, within its byte bound, and status 200. Independent disk checks matched every inventoried artifact's byte length and SHA-256; both inference request files matched their frozen prepared bodies byte for byte.

The recorded host condition was `Windows; controlled attached daemon; exclusive serial client; no other service requests`. The fixed sequence made 2 inference requests and 8 metadata requests; this lane sent no other service request. No source, packet, receipt, or predecessor evidence was edited. After completion, launcher PID 38152 was absent, while the original daemon PID 38284 and its listener remained present.

## Responses and immediate loaded snapshots

Both requests used `gemma4:e2b-it-q4_K_M`, digest `b37049369adfe3d2b653af0ab301a062ca5cbe96ace6aa0d3f2559ee9b563fc2`, with configured `num_ctx: 2048`. The complete raw evidence is [reachability response](aggregate-capacity-g2-control/live1/g2-reachability.response.bin), [generation response](aggregate-capacity-g2-control/live1/g2-generation.response.bin), and their [request body](aggregate-capacity-g2-control/live1/g2-reachability.request.bin) and [request body](aggregate-capacity-g2-control/live1/g2-generation.request.bin). The bodies are 1,311 bytes (`61668937ffba7c3d9205c9660cd7a424f07a6686250b93bf9871050ca6727614`) and 1,314 bytes (`08a3a074bd155facceb93e70dd6cba949e6c985d631a4166fce06d508821df48`) respectively.

| Request | Start to finish | HTTP | Native fields | Immediate `/api/ps` snapshot |
| --- | --- | --- | --- | --- |
| Reachability (`num_predict: 1`) | `11:55:11.388Z`–`11:55:19.688Z`, 8,299.754 ms | 200 | `done=true`; `done_reason="length"`; `prompt_eval_count=858`; `prompt_eval_cached_count=0`; `eval_count=1`; `total_duration=8,295,850,800 ns`; `load_duration=6,275,503,600 ns`; `prompt_eval_duration=2,018,567,000 ns`; `eval_duration=1,000 ns` | Captured immediately at `11:55:19.688Z`: same model and digest, `context_length=2048`, runner `llamacpp`. |
| Generation (`num_predict: 4096`) | `11:55:19.695Z`–`11:55:28.627Z`, 8,931.490 ms | 200 | `done=true`; `done_reason="length"`; `prompt_eval_count=858`; `prompt_eval_cached_count=857`; `eval_count=1189`; `total_duration=8,927,888,300 ns`; `load_duration=10,287,500 ns`; `prompt_eval_duration=29,726,000 ns`; `eval_duration=8,886,305,000 ns` | Captured immediately at `11:55:28.627Z`: same model and digest, `context_length=2048`, runner `llamacpp`. |

The native JSON objects have no `context_shift` or `total_tokens` field. Cached prompt count is already included in `prompt_eval_count`; the observed generation prompt total is 858, with 857 cached, not 1,715. The immediate snapshots are [reachability ps response](aggregate-capacity-g2-control/live1/g2-reachability-ps.response.bin) and [generation ps response](aggregate-capacity-g2-control/live1/g2-generation-ps.response.bin); their request/capture records are saved alongside them.

The first response is the intentional one-token reachability control. The generation response yielded 1,189 output tokens against the 4,096 request and stopped with `done_reason="length"`; the token count is below the requested output limit. Its prompt and output counts sum to 2,047. These response fields alone do not explicitly name the stop mechanism.

## Bounded runner log interval

After the driver closed, the original log prefixes still matched their starting hashes. Only bytes after the recorded offsets were saved in [daemon-log-intervals.json](aggregate-capacity-g2-live-reading/daemon-log-intervals.json), [daemon.err interval](aggregate-capacity-g2-live-reading/daemon.err.interval.bin), and [daemon.log interval](aggregate-capacity-g2-live-reading/daemon.log.interval.bin):

| File | Start offset and prefix SHA-256 | End offset | Interval bytes and SHA-256 |
| --- | --- | ---: | --- |
| `daemon.err` | 1,245,122; `b2998b5d58826b77862e1e658a20296dfa4a086dac18a275ffe0dc131c2a9c05` | 1,286,044 | 40,922; `901323649121dfbe481ab8fc1449f53dfe6d3bd3345dca8f1f8ac6ce3de5a1a2` |
| `daemon.log` | 15,809; `48a12719ee9333fd9373c2f8b69dab15ce3fd55ceb61a12771b9ca1f71dfee29` | 16,714 | 905; `7676d15fef50397f60fa71121f07cb82d34918fff746b08560be19b7560e87b1` |

The bounded stderr interval records one loaded slot with `n_ctx=2048` and `n_ctx_slot=2048` (interval lines 466 and 476). Reachability is task 0 with `task.n_tokens=858`, 858 prompt-evaluated tokens, 1 generated token, and `stop processing: n_tokens=858, truncated=0` (lines 515–528). Generation is task 4 with `task.n_tokens=858`, 857 cached prompt tokens and one newly evaluated token; its timing line reports 1,189 generated tokens and the stop line reports `n_tokens=2047, truncated=1` (lines 539–555). The corresponding bounded stdout records the same ten HTTP requests in the frozen order, including `/api/chat`, then `/api/ps` after each inference.

Speculative decoding counters are also retained in the raw interval. For reachability, the draft-MTP statistics report one call with zero generated and zero accepted draft tokens. For generation, the timing line reports 1,189 evaluation tokens; draft-MTP reports 928 draft tokens generated and 879 accepted, with 49 not accepted. These draft counters describe speculative work and are not additional response output tokens.

The interval contains no explicit context-shift event, no explicit capacity-stop message, and no output-limit explanation. The generation `n_tokens=2047` and `truncated=1` at the configured 2,048-token slot are direct boundary observations. This report does not infer a stronger stop classification from them.

## Evidence paths

The [complete raw capture directory](aggregate-capacity-g2-control/live1/) retains request and response bytes, response headers, per-request records, immediate snapshots, runtime and receipt copies, the frozen packet copy, and inventory. The [bounded launch logs](aggregate-capacity-g2-control/live.log) and [launcher error log](aggregate-capacity-g2-control/live.err) retain process outcome. Source citations are the unchanged [driver](aggregate-capacity-g2-control/Driver.ts), [capture/admission helpers](aggregate-capacity-g2-control/helpers.ts), and [fixed population](aggregate-capacity-g2-control/prepared/generation.json). Root owns interpretation and deployment acceptance; these are observations from this fixed input and configured deployment.