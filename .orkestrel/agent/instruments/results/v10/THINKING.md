# Thinking: what it costs in context, how our budgets count it, how we collect it, and what to change

Lane: the dispatch names `planner`, which is the subjective design lane (shape, naming, design fit). I also make objective accounting claims, each with a citation. The `analyst` lane owns ruling on whether they are correct.

## Design

### 1. What thinking costs in num_ctx, during a call and on later calls

**During the call**, thinking is part of the completion.
- Ollama's `eval_count` value counts thinking and content together (`/home/user/agent/tmp/bench3/bench.mjs:419-420`). So `prompt + completion` must fit within `num_ctx`, and `num_predict` caps thinking plus answer.
- Measured on the 2B with thinking on (distillate, v10 runs):
  - Median completion per first-pass call is 214 to 232 tokens; the 90th percentile is 433 to 1,010.
  - Thinking per run is 7,101 to 26,809 characters (`t2-*.log:14|16`, `Think cut` lines, verified).
  - Thinking is an estimated 76% to 94% of completion tokens. This estimate assumes 2.95 characters per token from the probe, but measured ratios range from 2.24 to 4.09, so the share is approximate.
- Cuts: 5 of the 96 completed agent calls hit the cap, and all 5 were tool-free answer passes. None of the 91 first-pass calls was cut.
  - Raising the cap from 1,024 to 2,048 cut the same two records calls again, with byte-identical prompts (`/home/user/agent/tmp/bench/results/v10/FINAL-CHECK.md:28`; verified call 3 in `t2-records-v1/ledger.jsonl:1`: prompt 1287, completion 1024, `length`, thinking 3660).
- Peak use of the window (prompt + completion against ctx):

| Run | Peak | Share of ctx |
| --- | --- | --- |
| `t2-records` | 2,628 of 4,096 | 64% |
| `t2w-records` | 3,335 of 5,120 (the cut call) | 65% |
| `t2-control` | 4,458 of 7,168 | 62% |
| `t2-compaction` | 4,003 of 4,096 | 97.7% |

- The one overflow, `request (4425 tokens) exceeds ... (4096 tokens)` in `t2-compaction-v1.log:10`, was the prompt alone. Thinking played no part, because no request carries it.

**On later calls**, our stack drops thinking completely.
- In `t2-records-v1/ledger.jsonl:1`, call 0 has prompt 1526 and completion 287, of which thinking is 852 characters. Call 1 has prompt 1632 and cached 1522. The prompt grew by 106 tokens, less than the previous completion.
- The wire request `t2-records-v1-wire/00011_api_chat-request.json:116,126` carries `"think": true` and `num_predict 1024`, and no message in it has a `thinking` field.
- So today thinking costs room only inside its own call.
- What the model sees instead: the Qwen GGUF template renders each assistant message in the current tool turn with a `<think>` block, whether or not the reasoning is empty (`/opt/ollama/models/blobs/sha256-20cb277f…:25886-25887`). Inference: the model reads empty think blocks before its own tool calls. Whether Ollama's Go renderer also writes an empty block is unverified; the research lane's extraction of `qwen35.go` suggests it does.

### 2. How each budget treats thinking, and where it is wrong or blind

1. **Ledger plan budget** (`/home/user/agent-port/src/core/ledgers/Ledger.ts:566-568`): `capacity * share.prompt - fixed`. It has no generation reserve, and it knows nothing of `num_predict`.
   - The harness made up for this by hand: it grew ctx by `THINK_PREDICT` and cut the share (0.525 at 4,096; 0.42 at 5,120) so the prompt budget stayed 2,150 (`run.log:1,7,17`; `FINAL-CHECK.md:18,24`).
   - `(capacity - predict) * 0.7` gives 2,150.4 in all three conditions. The hand rule is that formula.
2. **`left`** (`/home/user/agent-port/src/core/ledgers/Gauge.ts:79-85`): `prompt + completion`. The completion includes thinking that the next request drops, so `left` understates room by that call's thinking. The recall room then varies with how long the last call thought. `FINAL-CHECK.md:30` names this asymmetry.
3. **`reserve`** (`Gauge.ts:87-106`):
   - The reply term is the largest final completion, which includes thinking under think-on (`Gauge.ts:119`, fed by `Ledger.ts:352-355`). Before any reply is observed, it is the longest assistant text, which has no thinking.
   - There is no term for the next call's generation, which can run to `num_predict`.
4. **`room`** and the recall close rule (`Gauge.ts:108-110`, `Ledger.ts:960-967`) inherit both errors in items 2 and 3.
5. **Calibration** runs with `think: false` (`Ledger.ts:271,273`), but serving runs with think on.
   - The generation prompt differs: `<think>\n` against `<think>\n\n</think>\n\n` (template `:25935-25938`).
   - Current-turn assistant messages gain think-block framing.
   - So `fixed` and `scale` are priced under the other mode. The size of this effect is unmeasured.
6. **`GaugeCall`** (`/home/user/agent-port/src/core/ledgers/types.ts:536-541`) carries no thinking. The usage listener copies prompt and completion only (`Ledger.ts:208-217`).
7. **Answer pass**: `#runPass` passes no `think` value (`Ledger.ts:380`), and `LedgerAgentOptions` leaves `think` out (`ledgers/types.ts:227-230`). So the answer pass cannot be run with thinking off.
8. **Agent cost budget**: it charges thinking only through the post-turn usage, not live (`/home/user/agent-port/src/core/agents/Agent.ts:442-446`). This is correct for cost but blind mid-stream.
9. **Agent compaction window**: it estimates messages only (`Agent.ts:389-398`, `estimateMessages` at `agents/helpers.ts:143-159`). This is correct today because thinking is never replayed. It becomes wrong the moment thinking is replayed without being counted.
10. **Harness window growth**: adding `THINK_PREDICT` to every arm's ctx (`FINAL-CHECK.md:18,24`) is sound for generation room. But only the records arm reads the leftover window, so its recall room grows by the cap minus the thinking spent (item 2).

### 3. What is collected today, and what is fed back

**Package and port** (`/home/user/agent`, `/home/user/agent-port`):
- `ProviderResult.thinking` (`providers/types.ts:29-37`) and live `think` chunks (`Agent.ts:827-829`) carry thinking out of the provider.
- It is joined per run (`Agent.ts:501-503`, `helpers.ts:66-69`) and returned as `AgentResult.thinking`. The ledger joins passes (`Ledger.ts:357-367`) and keeps `passes[]`.
- It is not on `Message` (`types.ts:24-38`). Assistant messages are stored with content and calls only (`Agent.ts:529-533,568`).
- The contract says it "never re-enters the conversation" (`providers/types.ts:23,31,51`; `agents/types.ts:69-72`; `helpers.ts:52-53`).
- There is no per-call record and no token count.

**Harnesses**:
- Each call records thinking as an integer character count plus a `cut` flag (`bench3/bench.mjs:421,460-462,484`; `bench/bench.mjs:529-531,555`). Rows sum these (`bench3:6915-6919`; `bench:2525-2558`).
- `f4` rows have no thinking field.
- The thinking text survives only in the wire recorder's response files (`t2-records-v1-wire/00010_api_chat-response.json:4`).
- `mapMessages` sends none of it (`bench3:325-333`; `bench:396-404`), and the self-checks assert it never reaches a later request (`bench3:5880-5916`; `bench:2717-2722`).

### 4. What the primary sources say

The research lane fetched these sources through WebFetch summaries; only the Anthropic page was read in full text. All were accessed 2026-10-09.

| Source | Within the current tool turn | Earlier user turns | Counts on later turns |
| --- | --- | --- | --- |
| Anthropic (https://platform.claude.com/docs/en/build-with-claude/thinking) | Required: pass back complete and unmodified, signature included. A modified block gets a 400. | Kept on Opus 4.5+, Sonnet 4.6+, Haiku 5.5. Stripped automatically on older models. | Yes on keep-all models (window and input billing) |
| OpenAI (https://developers.openai.com/api/docs/guides/reasoning) | Pass reasoning items back in function-calling loops (highly recommended) | Not rendered before GPT-5.6. `all_turns` by default on GPT-5.6. | Only when rendered |
| Qwen3 / 3.5 (https://huggingface.co/Qwen/Qwen3-235B-A22B; GGUF template `:25853-25889`) | Kept after the last real user query | Dropped ("historical output … only the final output") | Within the turn only |
| DeepSeek (https://api-docs.deepseek.com/guides/thinking_mode) | Must pass `reasoning_content` back with tools; 400 otherwise | Not concatenated; ignored if sent | With tools only |
| Ollama (https://docs.ollama.com/capabilities/thinking; `qwen35.go`) | Separate `message.thinking` field. The renderer keeps it when `isThinking && i > lastQueryIndex`. | Dropped | Within the turn only |
| OpenAI Agents SDK (https://openai.github.io/openai-agents-python/running_agents/) | `ReasoningItem` carried into next-turn input | Same carry, with an id policy | Yes |
| Vercel AI SDK (https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) | Reasoning parts; `sendReasoning` defaults to true | Provider drops what the API rejects | Yes |
| **Our stack** | **Dropped** | Dropped | No |

Our stack is the only one in the survey that drops thinking inside a tool turn. Anthropic and DeepSeek both reject that with a 400 error.

### 5. Recommendation

**Record thinking separately, per call and per pass.**
- Add `thinking?: string` to `Message` and `MessageInput`, set on the assistant message of every call. This follows the `images` precedent (`types.ts:32-37`).
- Per pass, keep `AgentResult.thinking`. Per request, keep `LedgerResult.passes`.
- Keep thinking out of content. Classifier input already reads only content and calls (`Classifier.ts:307`). The judge selection state must drop `thinking` the way it drops `images` (`contexts/helpers.ts:67`). The briefing and projection read content only.

**Feed back by provider policy.**
- Add `ProviderInterface.replay` with three values: `'none' | 'turn' | 'all'`. `'turn'` means the assistant messages after the last `user` message.
- The Agent applies `stripThinking(messages, replay)` before every provider call and before every estimate, so the estimate and the wire always agree.
- Per family:

| Family | `replay` |
| --- | --- |
| Qwen through Ollama | `'turn'` |
| DeepSeek with tools | `'turn'` |
| Anthropic keep-all models | `'all'` |
| Older Anthropic models | `'turn'` |
| OpenAI before GPT-5.6 | `'turn'` |
| GPT-5.6 | `'all'` |

- `AgentProvider` defaults to `'none'`, so every recorded request keeps its bytes. Our Qwen/Ollama configuration switches to `'turn'` after section 6 rules.
- Limit: Anthropic signatures and OpenAI `encrypted_content` do not fit a plain string. `'turn'` and `'all'` for those backends need an opaque payload field later.

**Make the budgets reserve thinking room.**
- Add `predict?: number` to `LedgerOptions` and `GaugeOptions`: the generation cap, thinking included.
- Plan budget: `total = max(0, (capacity - (predict ?? 0)) * share.prompt - fixed) / (1 + drift)`.
- Add `GaugeCall.thinking?: number`: the tokens of this completion that the next request leaves out.
- `left = capacity - (prompt + completion - (thinking ?? 0))`.
- `room = max(0, left - (predict ?? 0) - reserve) / 2 / rate`.
- Close recall when `left - (predict ?? 0) < 2 * reserve`.
- The reply term reads `completion - thinking`.
- Invariant: thinking on at window W+P behaves like thinking off at W, and `predict` absent behaves exactly as today. This turns the harness's hand rule into the package rule.
- `estimateMessages` counts `thinking` on messages that survive `stripThinking`.

**Answer pass with thinking off.**
- Add `LedgerOptions.think` as `{ first?: boolean; answer?: boolean }`, forwarded by `#runPass` as `agent.generate({ signal, think })`.
- Evidence: all 5 cuts were tool-free answer passes, and a larger cap did not help (`FINAL-CHECK.md:28`).
- Under Qwen, the answer pass's cue message is a new last query, so no first-pass thinking would re-enter it anyway.
- Leave the default unset until the `t2a` condition in section 6 measures it.

**On the user's view ("separate but still recorded").**
- I agree on separate and recorded. Every surveyed API returns reasoning as its own field. We record only character counts, plus the joined run text in the package, and that has to change.
- I differ on "separate" meaning "never fed back":
  - Within one tool-calling turn, the Qwen template, Ollama's renderer, Anthropic, DeepSeek, and OpenAI all feed it back. We are the outlier, and our model reads empty think blocks there.
  - Across user turns, dropping it is the majority rule (Qwen, DeepSeek, OpenAI before 5.6). Anthropic keep-all models and GPT-5.6 are the exceptions.
- No research literature was collected. The vendor rules describe training formats, not a measured gain for a 2B model at 4K context, so section 6 decides.

### 6. The measurement that decides the feed-back question

Run both stages after the v10 series frees the daemon.

**Stage A: replay probe.** A sibling of `/home/user/agent/tmp/bench/results/v9/probes/think-probe.ts`, which already reads wire requests (`:21-29`) and replays them (`:44-45`).
- Input: every agent chat request in the `t2w` and `t2` wires with an assistant message after the last user message.
- Send each in pairs: as recorded, and with `thinking` set from the matching response wire. Use the recorded options (`think` true, cap and ctx of the run).
- Add a control: thinking placed on an assistant message *before* the last user message.
- Readings:
  - The `prompt_eval_count` difference gives the exact context cost.
  - A zero difference on the control proves Ollama 0.40 applies the drop rule; a nonzero difference on the current-turn set proves the keep rule and that `/api/chat` reads input `thinking`.
  - Tool-call equality, completion length, and cuts show the effect on the next call.

**Stage B: end to end.**
- Arms: records, full view, and compaction (`FINAL-CHECK.md:7-11`).
- Conditions:
  - `t2w` with replay none: the existing runs, as the baseline.
  - `t2r`: replay turn.
  - `t2a`: records only, answer pass with thinking off.
- Copies 1 to 4, interleaved. Each pair clears under the band rule mean(d) − 2·sd(d)/√n > 0 (`FINAL-CHECK.md:34`), with the strict scorer and a blind double audit.
- Machinery:
  - `results/v7/tools/series.ts`, `run-one.ts`, and `plan.ts`.
  - A `--replay none|turn` flag in both harnesses. Flag absent means byte-identical bodies, the same discipline as `--think-predict` (`FINAL-CHECK.md:26`).
  - The harness provider injects thinking keyed by `replyHash` (`bench3:478`), so `/home/user/agent/dist` is not rebuilt.

## Alternatives

- **Side store** (a map from message id to thinking) instead of a field on `Message`. It favors judge-state safety. It loses persistence through stores and the relay, and gives the data two sources. The `images` precedent decides for the field.
- **Policy in each provider's `body()`** instead of the Agent applying it. It favors provider autonomy. Then the Agent's compaction window and the gauge would count thinking that the wire drops.
- **Keep share tuning by hand** (the harness way). It needs no API change. Every caller with thinking on redoes the arithmetic, and the recall-room asymmetry stays.

## Constraints

- The harness imports the package's built `dist` (`/home/user/agent/tmp/bench3/bench.mjs:7-27`). A rebuild changes a running series, so package work lands in `/home/user/agent-port` only.
- The judge selection state serializes the whole message except `images` (`/home/user/agent-port/src/core/contexts/helpers.ts:67`).
- Messages are copied field by field (`/home/user/agent-port/src/core/conversations/Conversation.ts:364-374`), and validated and shaped (`src/core/validators.ts:36-41`, `src/core/shapers.ts:40`).
- The relay forwards message fields (`src/core/providers/RelayProvider.ts:102`).
- The Ledger tail spreads whole messages (`Ledger.ts:869,877,904`), so it would carry `thinking`; `stripThinking` must cover it.
- The probe ran at `num_predict` 4,096 and `num_ctx` 8,192 (`think-probe.ts:5,11-12,44`). This resolves contradiction C2 in the distillate.

## Refusals

- One set of shims serving both old and new behavior is foreclosed by "**No compatibility shims.** Update every consumer in the same change." Every `ProviderInterface` implementer declares `replay` in the same unit.
- A `kind` field for the policy is foreclosed by "Name the axis … never `kind` or `type`", hence `replay`.
- Mocking the daemon in tests is foreclosed by "**NEVER** use mocks …". Use the existing stub transports (`bench3:5552-5620`).
- A bash or Python probe is foreclosed by "**ALWAYS** write a script as TypeScript run by Node".

## Measurements

**Supplied and verified here:**
- `Think cut` lines and pass counts in every v10 log.
- `run.log:1,7,17` budgets.
- `t2-records-v1/ledger.jsonl:1`, calls 0 to 3.
- Wire request 00011: no thinking, `num_predict` 1024.
- Wire response 00010: carries thinking.
- The overflow line in `t2-compaction-v1.log:10`.

**Supplied, not re-read:**
- The distillate's percentiles and shares.
- The research lane's quotes, which came through WebFetch summaries except the Anthropic page.

**Missing:**
- The exact token cost of replayed thinking.
- Whether Ollama 0.40 applies the keep and drop rules, and accepts input `thinking`.
- Whether replay changes tool choice.
- Calibration drift between thinking off and on.
- 2B thinking-off completions under the same windows.
- Any research literature on keeping thinking across turns.

**Contradictions found:**
- C1: `FINAL-CHECK.md:24` says "1 of 19". The log shows "2 of 22" (`t2-records-v1.log:16`).
- C4: `t2-compaction` counts 28 calls including the failed call 60; 27 completed.

## Units

The order is U1 → U2 → U3 → (U4, U5) → U6. U7 and U8 do not depend on U1 to U6.

1. **U1 Types** (role `opus`). Owns `/home/user/agent-port/src/core/types.ts` (`Message.thinking`, `MessageInput.thinking`), `src/core/providers/types.ts` (`ThinkingReplay`, `ProviderInterface.replay`, `ProviderOptions.replay`, rewriting the "never re-enters" text at `:20-24,31,51-52`), `src/core/agents/types.ts:69-77`, and `src/core/ledgers/types.ts` (`GaugeCall.thinking`, `GaugeOptions.predict`, `LedgerOptions.predict`, `LedgerOptions.think`). Accepts when the typecheck is clean and no doc block claims thinking never re-enters.
2. **U2 Message plumbing** (`builder`; depends on U1). Owns `shapers.ts:40`, `validators.ts:36-41`, `Conversation.ts:364-374`, `RelayProvider.ts:102`, `contexts/helpers.ts:67` (exclude `thinking`), and `agents/helpers.ts` (`estimateMessages` counts `thinking`; exported `stripThinking`). Accepts on tests: judge-state bytes are unchanged for a message with `thinking`; `stripThinking` keeps only assistant thinking after the last `user` message under `'turn'`.
3. **U3 Agent loop and providers** (`astra`; depends on U2). Owns `Agent.ts:529-533,568` (store thinking), `Agent.ts:815` and the compaction estimate (apply `stripThinking`), and `AgentProvider`, `RelayProvider`, `AgentJudge`, `SystemOneJudge` (declare `replay`). Accepts on stub-transport tests: `'none'` produces the same request bytes as today; `'turn'` sends thinking only inside the turn.
4. **U4 Gauge and plan** (`astra`; depends on U1). Owns `Gauge.ts:79-121` and `Ledger.ts:208-217,352-355,566-570,960-981`. Accepts when: `predict` absent leaves every existing ledger test unchanged; the plan total at (4096, predict 1024, share 0.7, fixed 0) equals that at (3072, no predict); `room` at (W+P, P) equals `room` at (W) for the same calls with the dropped thinking set.
5. **U5 Per-pass think** (`builder`; depends on U1). Owns `Ledger.ts:321,346,375-388`. Accepts when the answer pass forwards `think.answer` and the first pass forwards `think.first`, checked with a recorder provider.
6. **U6 Guide** (`opus`; depends on U1 to U5). Owns `/home/user/agent-port/guides/agent.md` (rows `:744-745,1191` and the provider section). Accepts when `npm run test:guides` is green.
7. **U7 Harness and probe** (`builder`; only after the v10 series ends). Owns `/home/user/agent/tmp/bench3/bench.mjs:325-333,409-448`, `/home/user/agent/tmp/bench/bench.mjs:396-404`, and an added probe `v10/probes/replay-probe.ts`. Accepts when, with the flag absent, request bodies are byte-identical (adapt the checks at `bench3:5900-5916`), and the probe writes paired rows.
8. **U8 Results correction** (`builder`). Owns `FINAL-CHECK.md:24`. Accepts when the sentence reads 2 of 22 and is consistent with `:28`.

## Tensions

- The `AgentProvider.replay` default: `'none'` keeps today's bytes; `'turn'` matches every source.
- Names: `replay`, `stripThinking`, `GaugeCall.thinking` (which means *dropped* tokens), `LedgerOptions.think {first, answer}`, and `predict`.
- The close rule `left - predict < 2 * reserve` double-counts the reply inside `predict`. It errs conservative; the alternative is to drop the reply term when `predict` is set.
- Adoption rule for `'turn'`: adopt unless the band shows it worse or it adds an overflow, or require a clear gain.
- What `replay` a relay declares: `'all'` (the remote decides) overcounts in local estimates.

## Risks

- Rebuilding `/home/user/agent/dist` during the series changes the harness under a running benchmark.
- Thinking leaking into judge state breaks judgment reuse (`contexts/helpers.ts:67`).
- `estimateTokens` assumes 4 characters per token, but thinking measured 2.24 to 4.09, so replayed thinking is underestimated. A content-empty call's completion is exact.
- `'turn'` on the compaction arm, already at 97.7% of ctx, raises overflow risk until its window counts thinking.
- Persisted conversations grow by the thinking text.
- Ollama's acceptance of input `thinking` is unverified until Stage A runs.
## Measured on 2026-10-09

**Stage A, prompt cost** (`probes/replay-probe.ts --predict 1`, rows in `probes/replay-cost.jsonl`):
- Thinking set on the assistant messages after the last user message raised `prompt_eval_count` in 29 of 29 replays, by 41 to 529 tokens, at 3.21 to 4.51 characters per token.
- Thinking set on assistant messages before the last user message changed it in 0 of 18 replays, with 543 to 6,353 characters added.
- Every base replay reproduced its recorded prompt count.
- So Ollama 0.40 reads input `thinking`, keeps it inside the turn in progress, and drops it from earlier turns. For Qwen through Ollama, `'turn'` and `'all'` send the same prompt.
- The probe stopped at `t2-compaction-v1` request 60, the call that overflowed in its run, with that arm's earlier-turn rows unread.

**Empty replies under thinking** (`probes/raw-probe.ts`, rows in `probes/raw.jsonl`):
- The final first-pass calls of g01 and g10 in `t2w-records-v1` (wire `00012`, `00083`) returned empty content.
- The harness log matches the wire: thinking 542 and 295 characters, content empty.
- Rendered through Ollama's template, each prompt ends with `<|im_start|>assistant\n<think>\n`. Replayed raw, the 2B wrote its answer as reasoning and ended its turn with no `</think>` in 146 and 79 tokens.
- The empty content is the model's, not a parsing defect.
- Of 21 or 22 thinking calls per records run, 2 end this way; 0 of 13 in each full-view run.
