# Thinking cap for the 4B (`t4`)

`probes/think-probe.ts` replayed 32 agent calls of the 4B (`qwen3.5:4b-q4_K_M`) with thinking on, 8 spaced through each of `f4-records-v1`, `f4-records-v3`, `f4-control-v1`, and `f4-control-v3`, on 2026-10-09 (`probes/think-4b-on.jsonl`), at `num_predict` 4,096, `num_ctx` 10,240, temperature 0, and a 900-second timeout.

- Every call stopped on its own, and every call returned content or a tool call.
- Completion, thinking included: minimum 72, median 206, 90th percentile 494, maximum 566 tokens.
- Generation ran at about 6.8 tokens per second; the 32 calls took 1,728 seconds, the longest 118.

The cap is the smallest multiple of 256 at or over 1.5 times the largest completion: 1.5 × 566 = 849, so C = 1,024. Each arm's window grows by C: records `--ctx 4096 --budget 0.525`, so its prompt budget stays 2,150 tokens; the full view `--ctx 7168`. The largest full-view prompt in `f4-control` v1 to v4 was 4,297 tokens, which leaves 2,871 tokens of room against the cap.
