# Request bytes between the v7 and v8 none-6144 runs

No request byte differs. For the same model outputs, the v7 harness (`bench.mjs.pre-roundb`) and the current `bench.mjs` send byte-identical bodies for all 20 requests. The v7 run's request 14 was byte-identical to v8's recorded 00014. The g07 split comes from daemon cache state. The v7 request 14 reused a cached prompt prefix; the v8 request 14 was evaluated from scratch.

## Evidence

Each of the following results comes from `node divwork/compare.mjs` and `node divwork/prefix.mjs` (2026-10-09; helpers and bodies under `divwork/`; no daemon request):

- Both harnesses record the sha256 of the exact body string passed to the transport (`bench.mjs:469`, `bench.mjs.pre-roundb:437`). The v7 and v8 jsonl agree on 14 of 14 call hashes through request 14 (request 14 is `cc4b8a0c835cb522479eea637c3bcbf2da3cd0d2cbbf72728f3396e71b8f6ab8` in both) and on 0 of 6 after it.
- Replaying v7's recorded outputs gives 20 of 20 bodies that match v7's recorded hashes, through `bench.mjs.pre-roundb` (with `scenario.json.pre-roundb`) and through `bench.mjs` alike. Compared body by body and top-level field by field, the two sets are byte-identical for requests 1 to 20. Request 14 is 14058 bytes, with 77 messages, no `tools`, and the same key order.
- To check the method, replaying v8's recorded outputs through `bench.mjs` gives 20 of 20 bodies byte-identical to `JSON.stringify(body)` of the `none-6144-wire` requests.
- No field differs, so no code change caused the split. The claim in README § Changes on 2026-10-09, before Round B, that the change leaves every `none` body unchanged, holds for this arm.

## What differs: daemon state

The v7 rerun started at 00:16:58Z, about 2 minutes after the first v7 run (`results/v7/none-6144-notice`, 00:11:25Z to 00:14:52Z) on the same daemon. v8 ran after the ledger arm. The following timings come from the jsonl records:

| call | v7 prompt_eval ms | v8 prompt_eval ms | v8 load ms |
| --- | ---: | ---: | ---: |
| request 1 | 162 | 14444 | 3711 |
| request 14 (3763 tokens) | 1607 | 21880 | 12.5 |

- Full evaluation runs at 168 to 176 tokens/s (v8 request 1, v8 request 14, and notice request 20). At that rate, 1607 ms covers at most about 280 tokens, so the v7 daemon restored at least about 3480 of the 3763 tokens from cache.
- Notice request 20 (g07 run 2, no tools, 4567 tokens) shares its first 76 of 77 messages and every other field with request 14. It is the only no-tools prompt that run sent. Its bodies were rebuilt through `bench.mjs.pre-repeat`, and 26 of 26 hash to the notice record.
- The runner is `llama-server -c 6144 -np 1 -b 1024 -ub 1024`, read from `/proc` (one slot, with the llama.cpp prompt cache). The replies split at the third token: v7 gave `The Halvorsen Interiors order (LH-80941)` and v8 gave `The Halvorsen pendant lights (Order LH-80941)`.
- Hypothesis, untested: KV restored from a prefix computed under another prompt's batch layout shifts the logits enough to flip a near tie at temperature 0. The live replay of 00014 proves determinism for identical bytes with the same cache history, not across histories. To test it, send notice request 20 and then 00014 to a freshly loaded runner and check whether 00014 returns 187 tokens.

## Briefing harness

No harness change caused the split, so there is none to reach `/home/user/agent/tmp/bench3/bench.mjs`. That harness is exposed to the same daemon-state path, though. It records no request hash and no `prompt_eval_duration`, so its exact Round A reproduction cannot show whether it met an equal cache history or simply hit no near tie.

## Make an unchanged arm reproduce byte for byte

The bodies already reproduce. The harness must also fix the daemon state and record the response:

1. Before the first request of each arm, unload every model that `/api/ps` lists (`/api/generate` with `keep_alive: 0`). Start only when `/api/ps` lists none. That way the runner and its prompt cache start empty. Run arms one at a time, with no other client on the daemon.
2. Record `replyHash` per call beside `hash`: the sha256 of the streamed content plus the tool calls. Keep `load_duration` and `prompt_eval_duration`.
3. To prove a rerun reproduces, compare its jsonl with the reference call by call. Equal `hash` and `replyHash` on every call proves reproduction, and a multi-second request 1 `load_duration` proves a cold start. The first equal `hash` with an unequal `replyHash` marks a daemon divergence; the first unequal `hash` marks a harness or scenario divergence. A wire capture must hash to the record, as v8's 20 of 20 do.

## Live confirmation (2026-10-09)

Tested on the daemon after the offline analysis: request 00014 sent cold (all models unloaded) returned 78 tokens, the v8 reply, with 22,602 ms of prompt evaluation. After unloading again, sending the earlier run's request 20 (89 messages, no tools) and then 00014 returned 187 tokens, the v7 reply word for word, with 1,487 ms of prompt evaluation because the prefix came from the cache. The same request bytes give different temperature-0 replies depending on the prompt cache's history. From here every run starts with `results/v7/tools/cold-start.mjs` and records its wire with `record-fetch.mjs`.
