# Lane records-fails

**Lane: objective.** I classified each failing f4-records row from the wires, the item files and the verdicts. Overall, the 4B records arm fails g05, g06 and g08 because of the model, not the method: every failing row had the needed fact or rule in front of it, either in the system briefing or in the tool result just before the reply.

## Verdicts

1. **g06 (Kenji shipping): 4 of 4 failures are model; 0 method, 0 scorer.**
   - **What reaches the model.** Every copy's briefing carries the rule as "And never promise a customer a delivery date in writing." (f4-records-v1-wire/00050_api_chat-request.json:10, and the same file in v2, v3 and v4). The lookup result sits right before the reply and carries "carrier estimated delivery 2026-10-12" (f4-records-v{1,2,3,4}-wire/00051_api_chat-request.json:112). No copy used recall.
   - **Replies.**
     - v1: "It's scheduled for delivery on Oct 12" (audit/b1-fail.json:859).
     - v2: "expected in two days, around Oct 12". It also drops the tracking number PW-6013-2280, although the result carried it (b1-fail.json:733).
     - v3: "estimated to arrive on 2026-10-12" (b4-fail.json:42).
     - v4: "expected to arrive on 2026-10-12" (b5-fail.json:84).
   - **A second, unscored error in all 4 rows.** Each reply says "I've added a gift note". The briefing pins m11 ("needs a gift note that reads 'Happy 40th, Aiko'"), the result says "gift note text is not recorded", and no tool adds a note.
   - **What the method drops.** The records briefing leaves out the assistant's acknowledgement "no delivery dates go in customer replies". That line appears only in f4-records-v*-wire/00002 and 00003, not in the g06 requests.
   - **Why that is not the cause.** The full-view arm has that acknowledgement in every request (f4-control-v{1..4}-wire, 56 files) and still scores 0/4. Its failures are the same: cc33a3a1 and 0c2a1689 (verdicts-b1.json:746 and :827).
   - **Comparison.** t2a-records is also 0/4 with the same date leak (3e6e256e, a28a2ec2, ff9cda0a, 1f0fa3f1). v9 a5-records fails the scorer in 6 of 8, and its v2 also drops the tracking number (v9/a5-records-v2/ledger.jsonl:6).
   - **Smallest method change:** no briefing change is supported. I-289 records that every rule placement and a rewrite failed on the 2B. One candidate is untested on the 4B: mark the estimate field in the lookup result itself as internal, not for customer replies.

2. **g08 (Halvorsen credit): 3 of 3 failures are model; 0 method, 0 scorer.**
   - **What reaches the model.** The credit limit and outstanding balance exist only in the lookup result, and that result is shown in full each time: "credit limit $5,000.00 with $1,240.00 outstanding" (f4-records-v1-wire/00066:112, v2/00067:112, v3/00066:112). The $3,000 is in the request.
   - **Replies.** All three compute "$3,760.00 available" and name Ines Albrecht, but none says whether the $3,000 order fits (b1-fail.json:1246 for v1, b1-fail.json:1122 for v2, b4-fail.json:209 for v3).
   - **The one pass.** v4 passes. Its request opens with the yes/no question, "Does a $3,000 reorder on credit fit…" (f4-records-v4-wire/00066:94), and the reply starts "Yes, a $3,000 reorder would fit" (b5-pass.json:426).
   - **I-295 ("pins bury the question") does not hold for the 4B.** The full view has no pins and is also 1/4. Its failure 10fe01e0 is the same omission (b1-fail.json:1184).
   - **Comparison.** t2a-records fails v1 and v3 with the same omission (e713ad11, 3cd58e99). Its v4 "pass" is a false pass: it calls the $5,000 limit "available credit" (verdicts-b3.json:98).
   - **Smallest method change:** none in the briefing. A candidate is untested: in all three rows the reply was written right after the tool result, and the answer cue did not fire (each request ends at the result, :112–113). Firing the cue with the request's questions restated would put the question last.

3. **g05 (Luis approval note): 2 failures, both rows the scorer passed and the audit marked down. 1 model, 1 ambiguous; 0 method.**
   - **What reaches the model.** The briefing carries the over-$200 rule, "Use MX-4486 from now on; MX-4471 is dead.", the $289.00 total and the card and email lines (f4-records-v4-wire/00042_api_chat-request.json:10; the rule and code lines match in v1, v2 and v3).
   - **v4 (24b9c0f7), model.** The reply invents completed actions: "Refund processed to original payment method." and "Customer notified via email at luis.ferreira@example.net." (b5-pass.json:230). The audit rules it a false pass (verdicts-b5.json:82).
   - **v2 (039bb315), ambiguous.** Every value is right, including MX-4486 and the over-$200 reason, but the reply describes the note instead of writing it (b1-pass.json:917). It counts as a fail only at the low end of the adjudication.
   - **No fact loss on the 4B.** All 4 copies include MX-4486. The 2B's failure, an omitted code (I-292/I-293), does not reproduce: compare v9 a5-records-v2/ledger.jsonl:5 ("is in r8", no code), t2a 77ec9ae4 (no code) and t2a f637a219 ("approval rule … overridden").
   - **Smallest method change:** none for the facts. One untested candidate covers the fabrication here, the g06 gift-note claims and g09 3c4034ea: a system-prompt sentence telling the model to state as done only actions a tool call in this request performed.

## Findings outside the claims

1. **The t2a label does not match what ran.** The computed task describes t2a as having the answer pass with thinking off. On g06 and g08 that pass never fired, so every final reply came from a turn with thinking on.
   - t2a-records-v1-wire/00053 and 00068 both have `"think": true`, and 00053's response streams `thinking` tokens.
   - The only requests with `"think": false` are 00002/00003 in each copy, v1/00013 and 00084, and v2/00044 and 00085.
   - So the 2B's 0/4 on g06 and 1/4 on g08 are results with thinking on: thinking did not fix either goal on the 2B. Whether thinking fixes them on the 4B is NOT-EVIDENCED. Refer this to the Orchestrator as input on the user's thinking hypothesis.
2. **The records briefing pins noise as facts.** The Halvorsen section pins a past request, "Anyway, can you check where the Halvorsen shipment actually is?", and a filler sentence, "I transposed the digits." (f4-records-v1-wire/00065_api_chat-request.json:10). It did not cause a failure, but it is a method defect.
   - Fix: the records builder should drop question and filler sentences. That builder is in /home/user/agent/tmp/bench3/bench.mjs; I did not locate the line.
3. **The scorer and the auditors disagree on ship dates.** The g06 scorer pattern rejects any date, ship dates included, and the scenario note says so ("a correct reply names no date, so a shipped-on date also counts", /home/user/agent/tmp/bench/variants/ledger/v1.json:1). The auditors rule that a ship date alone is allowed (verdicts-b3.json:145, verdicts-b2.json:369). No verdict here changes, because every failing reply also names Oct 12. Refer to the Orchestrator to settle the rule.
4. **The adjudicated table uses the low end.** Rows the audit marked ambiguous count as fails (tally.json:63-71: f4-records-v2 low 6, high 8). At the high end, f4-records g05 is 3/4 and g01 is 4/4.
5. **One g08 fail rests on a tie.** The g08 v3 verdict was a split decision (auditor a ambiguous, auditor b real) resolved to real (verdicts-b4.json:171-173).

## Attacked and held

- **Method withholding** in the 7 failing rows the scorer caught: refuted. In every g06 and g08 failure the needed rule or figures are in the request body.
- **Scorer misread** in those same 7 rows: refuted. Each contains the forbidden "Oct 12"/"2026-10-12", or lacks any fit verdict, and the auditors' reasons quote the reply text.
- **Recall garbling:** refuted. g06 and g08 never call recall. g05's recall in v4 returned lines already in the briefing (f4-records-v4-wire/00043:112).
- **I-295 as the cause of the 4B's g08 losses:** refuted by the full-view arm's 1/4.

Terminal: g05, g06 and g08 fail for model reasons on the 4B records arm (0 method, 0 scorer). There is no briefing fix; the untested candidates are a cue that restates the request, a no-fabrication sentence, and an annotation on the lookup result.

# Lane control-gain

**Lane:** objective. I checked the claims against the run logs, the wires and the audit verdicts. I edited nothing and sent no request to the model server.

**Bottom line:** I could only partly confirm the claim that the 4B helps the full view more than the records arm. On the strict count (only verdicts ruled correct), the lift is about the same in both arms. Most of the records arm's remaining misses come from the method, not the model.

## Verdicts

1. **The per-goal table: HELD.** I rebuilt all 40 f4-control and 40 t2w-control cells from `verdicts-b1..b5.json` and their `key-*.json`, counting only verdicts ruled "correct". Every cell matches. The per-copy figures also match `audit/tally.json`: f4-control strict counts 5, 7, 5, 5 (mean 5.50) and lenient counts 7, 8, 6, 7 (mean 7.00); f4-records strict 8, 6, 8, 8 (7.50) and lenient 8.00.

2. **t2w-control is the wrong baseline for a model comparison: FAILS as framed.** The task's condition list never defines t2w. Per `/home/user/agent/tmp/bench/results/v10/run.log:19,27,31,35` and `t2w-control-v1.log:14`, t2w-control is the 2B with thinking on (cap 2048), `--ctx 8192` and `num_predict 2048`. So f4-control against t2w-control changes the model size and thinking at the same time.
   - The clean size comparison is v9 a1-control. It uses the same system prompt (`v9/a1-control-v2-wire/00021_api_chat-request.json:10` matches `v10/f4-control-v1-wire/00014...:10`), the same `num_ctx` 6144, thinking off, and the same variant files. The v2 wording, "Finance wants to match the Halvorsen…", appears in `f4-control-v2-wire/00013`.
   - **Required change:** use a1-control as the 2B full-view baseline and report t2w separately as the thinking effect. On the strict count, thinking did not help the 2B full view: t2w is 4.25 per copy against 4.38 for a1.

3. **"A larger model helps the full view more than the records arm": UNRESOLVED / weak.** These deltas use the v9 2B figures given in the task, which I did not re-derive.
   - Full view: 4.38–5.13 → 5.50–7.00, a lift of +1.12 strict and +1.87 lenient.
   - Records: 6.50–6.75 → 7.50–8.00, a lift of +1.00 strict and +1.25 lenient.
   - The records advantage barely moves on the strict count (2.12 → 2.00). It only shrinks on the lenient count (1.62 → 1.00).
   - The 4B records-versus-full-view gap does not clear at the strict end: `tally.json` bands give d=[3,−1,3,3], bound 0, `clears: false`.
   - So "the records' advantage matters less" holds only at the lenient end.

4. **"The 4B full view sees the whole conversation at num_ctx 6,144": HELD.** `f4-control-v1-wire/00014_api_chat-request.json` shows `num_ctx` 6144 with `truncate` false. The largest prompt is 4,297 tokens (`f4-control-v1.log:27`), with no overflow. The view includes the seed and every earlier answer the model gave in the run.

## Per-goal: what the 4B fixes and what it still fails

Strict counts, 4B full view (4 copies) against 2B full view think-off (a1, 8 copies):

- **g03: fixed, 75% vs 0%.**
  - The 2B puts Halvorsen's corrected ticket on Grace's note: `"**Ticket:** ESC-2291"` (a1-v2 wire line 319). It does this in 6 of its 7 failures (verdicts.json: "dead ticket is presented as current").
  - The 4B separates the two customers: `"Sign-off Required: Marcus Oyelaran … Copy: Priya Raman … PW-5521-9930"` (f4-v3 wire line 306).
  - The 4B's remaining miss is v4, ruled ambiguous for "Priya Raman is copied on the ticket."
  - t2w fails all 4 copies, mostly by reversing the correction: `"ESC-2291 (corrected to ESC-2219)"`.

- **g07: fixed, 4/4 vs 3/8.**
  - The 2B picks the wrong person: `"Who to Contact: Marcus Oyelaran … he has authority over the approval code"` (a1-v2 line 482). It also flips Tomasz's day off.
  - The 4B gets it right: `"go to **Tomasz Brennan** … today, as he is off tomorrow (Friday, 2026-10-09)"` (f4-v3 line 357).
  - t2w fails all 4: three say `"Today, Friday 2026-10-08"` and one is empty. Thinking adds a weekday error here.

- **g09: modest gain, 3/4 vs 4/8.** The 2B misses by denying the record and by claiming things the order doesn't support. The 4B's miss is v4: `"I've already added that text to his order LH-81660"`, an action no tool performed.

- **g05: partly fixed, 0/4 strict both, but the failure changes.**
  - The 2B copies its own g03 note into g05, keeping `"Ticket: ESC-2291"` and the same copy list, and leaves out the approval code (a1-v2 line 428). t2w gives the dead code MX-4471 or none.
  - The 4B finds MX-4486 in all 4 copies, then makes things up: `"Status: Approved by Marcus Oyelaran"` (v1), `"Status: Returned (Opened Item)"` (v3), `"single claim history"` (v4), and v2 describes the note instead of writing it.
  - On the lenient count the 4B gets 2/4. The model fixes the retrieval but not the invention.

- **g10: half fixed, 1/4 vs 1/8.**
  - The 2B gives Ines Albrecht's line 555-0142 as Sigrid's number in most of its failures. None of the 4B's 4 copies do.
  - Instead the 4B invents the current time: `"Since it is currently Thursday afternoon (before 2 pm)"` (v3) and the same in v1, leading to advice to wait.
  - I could not establish why. The time-of-day cues ("fire drill moved to 3 pm", "Last one for the morning") are also in the records view (`f4-records-v1-wire/00081`), where the 4B scored 4/4. **NOT-EVIDENCED.**

- **g06: not fixed, 0/4.** The 4B writes the carrier's estimate into the customer reply: `"You can expect delivery around Oct 12th"`, plus `"The gift note … is attached to the package"` (f4-v3 line 349). Every arm, every model and both thinking settings score 0. This is the open delivery-date issue (I-289), not a reading problem.

- **g08: worse with the 4B, 1/4 vs 6/8.**
  - v1 gets the arithmetic wrong: `"$3,860"`.
  - v2 and v3 work out the figure and stop: `"so they have $3,760.00 available for the new $3,000 reorder"`, with no yes or no.
  - The records arm gives the same answer word for word in shape (`f4-records-v1-wire/00066` response: `"…so they have $3,760.00 available for the new order."`). So this is the 4B's short answers, not how it reads the view.
  - One auditor rated v3 ambiguous rather than failed.

## Why the larger model helps the full view

The 2B's full-view failures are mostly about attaching a fact to the wrong customer or person: the ESC-2291 ticket on Grace, Marcus as the release contact, 555-0142 as Sigrid's line. Those errors then spread, because the full view carries every earlier answer. The 2B's g03 template turns up again in its g05 note (a1-v2 lines 319 and 428).

The records arm avoids both problems by design:
- Its system message groups facts under each customer, for example `"### Halvorsen Interiors … Sigrid … extension 4127 … ESC-2219, not ESC-2291"`, and lists `"Use MX-4486 from now on; MX-4471 is dead"`.
- Its view leaves out earlier goal answers (`f4-records-v1-wire/00066` starts at the label-printer message).

So the 4B's better handling of who-is-who has little left to fix in the records arm. Its own new failures (made-up statuses and actions, a made-up clock time, a missing fit verdict) show up in both arms.

## Records headroom

f4-records misses 10 of 40 cells:
- **g06, 4 misses:** every model and arm, with or without thinking, scores 0. Only a method change fixes this.
- **g08, 3 misses:** the verdict is missing for the 4B in both arms and for every 2B records run (t2a 1/4; t2-records-v1 and t2w-records-v1 both fail). It could be unlocked by an answer-shape prompt or by thinking. 4B thinking is untested.
- **g05, 2 misses** (one ambiguous, one claiming the refund was processed and the customer notified) and **g01, 1 miss** (ambiguous): both are made-up content a model might fix. t2a also scores 2/4 on g05.

Taking the best result any model reached on each goal in the records arm gives 31/40, against the 4B's 30/40. So the runs so far show almost no headroom that a different model unlocks. At most 6 cells (g01, g05, g08) look model-reachable, and the 4 g06 cells need the method.

## Findings outside the claims

- **Thinking on the 2B:** it helped the records arm but not the full view, and it introduced new errors there (the weekday mistake in 4 copies across g07 and g10, and the reversed ESC correction). Whether the 4B behaves the same with thinking on is referred to the Orchestrator for the planned 4B thinking-on runs.
- **The records arm differs in more than the view:** the records arms use a different `ctx`, budget and `--judge mica` (`run.log:1,23`). Those settings weren't held constant against the control arm.

## Attacked and held

- **The table cells:** I re-derived all 80 cells. All held.
- **The v9 baseline:** the same system prompt, `num_ctx` and variant wording held. Test for a hidden difference: if the v9 harness prompt differed, the line-10 strings would not match. They match.
- **"The 4B reads the full view better":** I tested it against g08, where the 4B gets worse. It holds only for goals that need matching facts to the right customer or person. g08's failure is identical in both arms, so it isn't about reading.

**Terminal:** The 4B fixes the who-is-who errors (g03, g07, most of g10) and finds MX-4486 on g05. It still makes up statuses, actions and a clock time, skips the g08 fit verdict, and writes delivery dates on g06. On the strict count, its lift is about the same in both arms. Records headroom a model could unlock is at most 6 of 40 cells, and g06 needs a method change.

# Lane model-card

**Question**

For Qwen3.5 2B and 4B (Ollama `qwen3.5:2b`, `qwen3.5:4b`): official recommended sampling for thinking and non-thinking modes, max output length, context length, thinking-mode failure modes, and thinking-budget advice. Then how the benchmark settings (temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95) depart from them, and the card-sourced risk of each departure for 4B thinking on and off.

**Facts**

1. **4B thinks by default.** Source: https://huggingface.co/Qwen/Qwen3.5-4B/raw/main/README.md (Quickstart; Instruct (or Non-Thinking) Mode). Date: undated, fetched 2026-10-09. Quotes: "Qwen3.5 models operate in thinking mode by default"; "Qwen3.5 will think by default before response."

2. **2B is non-thinking by default.** Source: https://huggingface.co/Qwen/Qwen3.5-2B/raw/main/README.md (Quickstart). Date: undated, fetched 2026-10-09. Quote: "Qwen3.5-2B operates in non-thinking mode by default."

3. **Disabling thinking.** Source: https://huggingface.co/Qwen/Qwen3.5-4B/raw/main/README.md. Quotes: "Qwen3.5 does not officially support the soft switch of Qwen3, i.e., `/think` and `/nothink`."; "You can obtain direct response from the model without thinking by configuring the API parameters." The card also gives `"enable_thinking": False` in `chat_template_kwargs`. The 2B card's Thinking Mode section says "You can make the model think before response by configuring the API parameters."

4. **4B thinking sampling.** Source: https://huggingface.co/Qwen/Qwen3.5-4B/raw/main/README.md (Best Practices). Quotes: "temperature=1.0, top_p=0.95, top_k=20, min_p=0.0, presence_penalty=1.5, repetition_penalty=1.0" (general); "temperature=0.6, top_p=0.95, top_k=20, min_p=0.0, presence_penalty=0.0, repetition_penalty=1.0" (precise coding, e.g. WebDev).

5. **4B non-thinking sampling.** Source: same 4B README. Quotes: "temperature=0.7, top_p=0.8, top_k=20, min_p=0.0, presence_penalty=1.5, repetition_penalty=1.0" (instruct, general); "temperature=1.0, top_p=1.0, top_k=40, min_p=0.0, presence_penalty=2.0, repetition_penalty=1.0" (instruct, reasoning). The same card's Chat Completions tip gives "temperature=1.0, top_p=0.95, top_k=20, min_p=0.0, presence_penalty=1.5, repetition_penalty=1.0" for the reasoning case. The card is internally inconsistent here.

6. **2B sampling.** Source: https://huggingface.co/Qwen/Qwen3.5-2B/raw/main/README.md. Thinking values match the 4B card. Non-thinking text tasks: "temperature=1.0, top_p=1.00, top_k=20, min_p=0.0, presence_penalty=2.0, repetition_penalty=1.0". Non-thinking VL: "temperature=0.7, top_p=0.80, top_k=20, min_p=0.0, presence_penalty=1.5". Benchmark footnote: "Experimental settings: top_p=0.95, top_k=20, presence_penalty=1.5, and temperature=1.0 were used."

7. **Max output length.** Source: both raw READMEs (Best Practices, Adequate Output Length). Quotes: "We recommend using an output length of 32,768 tokens for most queries."; "we suggest setting the max output length to 81,920 tokens" (complex math and programming). Code examples use max_tokens=81920 for thinking and 32768 for non-thinking.

8. **Context length.** Source: both raw READMEs. Quotes: "Context Length: 262,144 natively and extensible up to 1,010,000 tokens."; "we advise maintaining a context length of at least 128K tokens to preserve thinking capabilities." The 2B HTML page adds: "If you encounter out-of-memory (OOM) errors, consider reducing the context window." Ollama tags list "256K context window" (https://ollama.com/library/qwen3.5, page "5 days ago" at fetch).

9. **Repetition and language mixing (4B card).** Source: https://huggingface.co/Qwen/Qwen3.5-4B/raw/main/README.md (Best Practices). Quotes: "you can adjust the `presence_penalty` parameter between 0 and 2 to reduce endless repetitions."; "using a higher value may occasionally result in language mixing and a slight decrease in model performance." The 4B card has no overthinking, loop, or thinking-budget text.

10. **2B thinking-loop warning.** Source: https://huggingface.co/Qwen/Qwen3.5-2B/raw/main/README.md (Thinking Mode). Quotes: "Qwen3.5-2B is more prone to entering thinking loops compared to other Qwen3.5 models, which may prevent it from terminating generation properly."; "We recommend further tuning the sampling parameters specific to your use case"; streaming is suggested "to enable timely detection and interruption of such anomalous generation behaviors." The warning names the 2B only.

11. **Thinking budget.** Neither the 2B nor the 4B card mentions a thinking budget (both fetched).

12. **Ollama default parameters, both tags.** Sources: https://registry.ollama.ai/v2/library/qwen3.5/manifests/4b and .../manifests/2b. Both reference params blob `sha256:9371364b27a52acac9d87f88bd93c9db1174d8d6ec57f6888925cdc1788871ff`. Blob content (fetched via the registry's redirect): `{"presence_penalty":1.5,"temperature":1,"top_k":20,"top_p":0.95}`. The Ollama library page lists no parameters.

13. **Ollama template.** Both tags reference template blob `sha256:b507b9c2f6ca642bffcd06665ea7c91f235fd32daeefdf875a0f938db05fb315` (https://registry.ollama.ai/v2/library/qwen3.5/blobs/sha256:b507b9c2f6ca642bffcd06665ea7c91f235fd32daeefdf875a0f938db05fb315). Its content is `{{ .Prompt }}` (13 bytes), so the Ollama template carries no thinking toggle.

14. **Ollama tag facts.** Source: https://ollama.com/library/qwen3.5. `qwen3.5:2b` is 2.7GB to 3.1GB with a 256K context window and Text/Image support. `qwen3.5:4b` is 3.3GB to 4.0GB with a 256K context window and Text/Image support. The page's capability header lists "thinking".

15. **Output-token usage (verbosity signal).** Source: https://artificialanalysis.ai/articles/qwen3-5-small-models, dated 2026-03-05 in the fetched text. The fetch summary reports the 2B used about 390M output tokens and the 4B about 240M to run the Intelligence Index, described as significantly more than larger Qwen3.5 models and Qwen3 predecessors. This is from a fetch summary, not a verified quote.

16. **Predecessor greedy-decoding warning (Qwen3, not 3.5).** Source: https://huggingface.co/Qwen/Qwen3-4B/raw/main/README.md. Quote: "DO NOT use greedy decoding, as it can lead to performance degradation and endless repetitions." The same card gives thinking-mode Temperature=0.6, TopP=0.95, TopK=20, MinP=0. I did not find this line in the 3.5 small-model cards.

17. **Release date.** March 2, 2026, per secondary search-result coverage only (no primary source fetched).

**Secondary and community sources (search snippets or fetch summaries, not verified against primary text)**

- Unsloth German guide, https://unsloth.ai/docs/de/modelle/qwen3.5: says reasoning is disabled by default for 0.8B, 2B, 4B and 9B. This conflicts with the 4B card.
- Doubleword, https://doubleword.ai/models/qwen3-5-4b: says the 4B reasons by default and suggests `"chat_template_kwargs": {"enable_thinking": false}` to disable. This matches the card.
- LM Studio bug report, https://github.com/lmstudio-ai/lmstudio-bug-tracker/issues/1990: reports that enable_thinking=false still produced a think block in one setup.
- oMLX release notes, https://newreleases.io/project/github/jundot/omlx/release/v0.2.18: with reasoning on, the model may emit EOS during tool calls, so enable_thinking=false is advised for agentic coding.
- vLLM forum, https://discuss.vllm.ai/t/thinking-token-budget-silently-ignored-when-passed-via-extra-args-in-vllm-0-18-0/2533: a 9B thinking loop exhausted output tokens with no answer. This is the 9B, not the 4B.
- Engineering wiki, https://wiki.161-35-77-84.sslip.io/lesson-thinking-default-trap.html: says the Qwen3.5 chat template defaults thinking on, and that a short token budget can truncate before any answer.

**Matrix**

Each row gives the benchmark value, the card values, the Ollama default, and the evidence on departure risk. I have not ruled on any row.

| Parameter | Benchmark | Card: thinking | Card: non-thinking | Ollama default blob | Evidence of risk | Evidence against or neutral |
|---|---|---|---|---|---|---|
| temperature | 0 | 1.0 general; 0.6 coding | 0.7 (4B general); 1.0 (2B text; 4B reasoning) | 1 | Qwen3 card (predecessor): greedy decoding "can lead to ... endless repetitions." Not found in the 3.5 cards. | Zero is outside every 3.5 recommended value. Seed 7 is not addressed by any source. |
| top_p | 0.95 | 0.95 | 0.8 (4B general); 1.0 (2B text; 4B reasoning) | 0.95 | None in the 3.5 cards. | Matches thinking mode. Departs from non-thinking values. |
| top_k | 20 | 20 | 20; 40 (4B reasoning) | 20 | None found. | Matches all except the 4B reasoning non-thinking variant. |
| presence_penalty | 1.5 | 1.5 general; 0.0 coding | 1.5 (4B general); 2.0 (2B text; 4B reasoning) | 1.5 | "higher value may occasionally result in language mixing and a slight decrease in model performance." | Card names 0 to 2 as the range for reducing endless repetitions. Matches thinking general and 4B non-thinking general. |
| min_p | not set | 0.0 | 0.0 | absent | none | Ollama default not confirmed. |
| repetition_penalty | not set | 1.0 | 1.0 | absent | none | Ollama default not confirmed. |
| max output | not given | 81,920 (math, code); 32,768 (most) | 32,768 | absent | Truncation risk only in secondary reports. | No primary thinking-length figure for 4B. |
| context | not given | at least 128K advised for thinking | not stated | 256K tag | none | none |

Implications from the cards:
- 4B thinking on: top_p, top_k and presence_penalty match the general thinking values. Temperature 0 is the main departure, and no 3.5 card speaks to it directly.
- 4B thinking off: top_p 0.95 departs from the 0.8 general non-thinking value, and temperature 0 departs from 0.7. Presence 1.5 matches the 4B general non-thinking value.
- The 4B card is silent on loops. The loop warning in the 2B card does not name the 4B.

**Unknowns**

- The Qwen blog post for the 3.5 small models was not retrieved. https://qwen.ai/blog?id=qwen3.5 returned no content on these models, and the correct blog URL is not confirmed.
- No official technical report for the small models was found.
- The Ollama runtime defaults for min_p, repetition_penalty and num_predict are not in the params blob and were not confirmed.
- The GGUF-embedded chat template was not fetched, so the default thinking state as shipped in the Ollama artifact is unconfirmed.
- How Ollama turns thinking on or off for qwen3.5 (for example a `think` request option) was not confirmed.
- The 4B card gives no thinking-length, loop-rate or budget figures. The 4B's loop behaviour is unknown from primary sources.
- The Artificial Analysis token counts come from a fetch summary and have not been checked against the article text.
- Whether the 4B card's non-thinking reasoning values (top_p 1.0 versus 0.95) are intended is unknown.
- The benchmark's max_tokens or num_predict was not given to me, so truncation risk cannot be assessed.
- The card revision dates were not captured, and the HF pages are undated in the fetch.
- The WebFetch tool returned model-processed excerpts, so quotes are as relayed by the fetch tool and not byte-checked against the HTTP response.

# Design

**Lane: objective** (correctness, constraints, and what the harness permits).

## Design

### 1. Cause: the full view catches up, and the 4B does not underperform

**The records arm improved as much as a model can improve it.**
- 4B records scores 7.50–8.00 per copy, against 6.50–6.75 for the 2B with thinking off: +1.00 strict, +1.25 lenient.
- f4-records gets 30/40 cells. Taking the best result any model reached on each goal gives 31/40 (control-gain, Records headroom).
- So the 4B sits within one cell of everything any condition has reached in this arm.

**Method ceiling: g06 caps the records arm at about 9 per copy.**
- g06 scores 0 in every arm, under every model and both thinking settings (f4-records, f4-control, t2a-records, t2w-control, and v9 a5).
- Every failing row had the rule "never promise a customer a delivery date" and the estimate field in its request (records-fails 1). The rule is in the briefing and the date sits in the lookup result just before the reply.
- I-289 records that every rule placement failed. This is the open delivery-date issue, and no model fixes it.

**Model effects that hit both arms equally do not move the lead.**
- g08: the reply works out $3,760 available but never says whether the $3,000 order fits. That is 1/4 in both arms, in the same shape (records-fails 2; control-gain g08).
- Made-up actions and statuses: g05 v4 says the refund was processed, g06 says a gift note was added, g09 says text was added to the order, and the full view's g05 says "Approved by Marcus".

**Model effects confined to the full view: this is the catch-up.**
- The 2B's full-view failures attach a fact to the wrong customer or person. Its g03 note carries Halvorsen's ticket ESC-2291, g07 names Marcus as the contact, and g10 gives 555-0142 as Sigrid's line. Each error spreads, because the full view carries every earlier answer (the a1-v2 lines 319 and 428 template).
- The 4B fixes these: g03 goes from 0/8 to 3/4, g07 from 3/8 to 4/4, and the wrong number disappears from g10.
- The records arm prevents these errors by design: facts are grouped under each customer and earlier answers are left out. So the 4B's better who-is-who handling had little left to fix there.

**The size of the narrowing.**
- On the strict count the lead barely moves, 2.12 to 2.00. Only on the lenient count does it shrink, 1.62 to 1.00 (control-gain 3).
- The 4B's strict pair does not clear the band: d = 3, −1, 3, 3 gives a bound of exactly 0. Copy 2 is the outlier (records 6, control 7).
- The baseline must be v9 a1-control: same system prompt, same `num_ctx` 6144, thinking off. t2w-control changes model size and thinking at once.

### 2. Condition t4: the 4B with thinking on, bounded

**Mechanics the design relies on**
- A thinking cut does not lose the goal. A first pass that spends the cap without content counts as "quiet", and the goal gets a tool-free answer pass with thinking off (bench3 3456–3457, 3387; bench 2951–2967). So a cut turns that goal into a think-off answer, which dilutes the treatment. The cap must keep cuts rare, and each arm's cut share must be reported.
- Thinking is not carried in the history (`mapMessages` sends only `content` and `tool_calls`, bench 396–406), so the window grows only by the generation cap.
- The cap `--think-predict C` goes on every agent call when `--think` is set, the think-off answer pass included (bench3 446, bench 544).

**Step 1: sizing probe.** Run it with the U1 instrument, after the series in progress (t2a-control) finishes, with no other run active.
- **Calls:** every recorded 4B agent request with tools from four wire directories: `f4-records-v1-wire`, `f4-records-v3-wire`, `f4-control-v1-wire` and `f4-control-v3-wire`.
  - Leave out the seed measures (`num_predict` 1, files 00002/00003) and the tool-free answer-scope calls, which run with thinking off under t4.
  - That is about 17 + 17 + 12 + 12 ≈ 58 calls, the whole call population of 2 reworded copies. U1's `--list` gives the exact count.
  - The 2B's 10-call probe understated the tail: its maximum was 666, while the run went past 1,010 and cut calls at 1,024 (FINAL-CHECK.md:22–24).
- **Settings:** think on, temperature 0, seed 7, the harness sampler, stream off.
  - `num_predict` 4096.
  - `num_ctx` 10240, because the largest full-view prompt is 4,297 tokens and 4,297 + 4,096 exceeds the probe's fixed 8,192.
  - Per-call timeout 900 s: 4,096 / 7.2 = 569 s, plus prompt reading and a model load.
  - Stop after 3 calls cut at 4,096 (`--max-cuts 3`).
- **Expected time:** about 58 × (300 / 7.2 + about 20 s) ≈ 1 h. The worst case before the stop is 3 × 900 s plus the rest.
- **Readings:** completion (thinking plus reply) per call, `done_reason`, generation rate, prompt-reading rate, and the thinking text.

**Step 2: cap rule.**
- Let S be the probe calls that stopped on their own.
- C = the smallest multiple of 256 at or above 1.5 × max(completion over S).
- C must also exceed every S call, so that no call the probe saw is cut.
- If C > 4096, do not launch. At 7.2 tokens per second one such call takes more than 9.5 min. Report this to the Orchestrator.
- Calls cut at 4,096 (the runaways) do not set C. They trigger the sampler check, and their share is reported.

**Step 3: windows.** These are plan.ts's existing grow rule with grow = predict = C.
- Records: `--ctx 3072+C --budget 2150.4/(3072+C)`. The prompt budget stays 2,150 tokens.
- Full view: `--ctx 6144+C`.
- Example for C = 2048: records 5120 at budget 0.42, full view 8192 (the same as t2w).

**Step 4: sampler.**
- Keep temperature 0, seed 7, presence_penalty 1.5, top_k 20 and top_p 0.95. These match f4, t2w and t2a. The card's thinking values (top_p 0.95, top_k 20, presence 1.5) match everything except temperature 1.0.
- The check runs only if the probe has a call cut at 4,096.
  - Replay each such call with `--temperature 1` at seeds 7, 8 and 9.
  - A call is a greedy loop when it ran to the cut at 0 but stops on its own at temperature 1 in at least 2 of 3 seeds, with thinking text that repeats one sentence.
  - If any greedy loop appears, the Orchestrator rules (see Tensions). Otherwise temperature 0 stands.

**Step 5: wall-clock bound.**
- The arm-neutral bound is the token cap.
  - Per call: at most C / 7.2 s plus prompt reading, the same for both arms.
  - Per goal: the agent's 8-call limit times that, plus the think-off answer pass (bench3 3347, bench 2347).
- Leave `--timeout` at its 3,600,000 ms default, as a backstop only.
  - A timeout ends a pass with `pass.error`, and `quiet` requires no error (bench3 3456). So a timed-out goal gets no answer pass and no reply.
  - Because the records arm makes more calls per goal, a tight timeout would fall harder on records.
  - With C ≤ 4096, 8 × 4,096 / 7.2 = 4,551 s, which exceeds 3,600 s only if every call runs to the cap. So for C > 3,072, set `--timeout` above 8 × C / 7.2 × 1,000 + 600,000 ms in both arms. That needs the plan.ts extra-args change in U2.

**Step 6: sample and stopping rule.**
- Stage 1: copies 1–4 of t4, records and full view, interleaved by copy (`--arms records,control`), 8 runs.
- After stage 1, compute two bands. A band clears when mean(d) − 2·sd(d)/√n > 0 (FINAL-CHECK.md:34).
  - (a) The t4 pair: d = t4-records − t4-control per copy.
  - (b) The difference in lead: dd = (t4-records − t4-control) − (f4-records − f4-control), paired by copy.
  - Compute both at the strict and the lenient count.
- Stop at 4 copies when (a) clears and (b) is decided either way: its lower bound is above 0, or its upper bound mean + 2·sd/√n is below 0.
- Otherwise run copies 5–8 of t4 **and of f4** (records and full view), so that dd stays paired.

**Step 7: expected wall time.** The think-off baselines come from run.log: records 671–734 s warm (1,170 s cold, v1); full view 174–245 s.
- Let M be the probe's mean completion and k = (M − 33) / 7.2 s of extra generation per thinking call.
  - Records has about 18 calls with thinking on, so it takes about 700 + 18k s.
  - Full view has about 12 calls, so it takes about 210 + 12k s.
- M = 250, like the 2B (median 182, p90 433): records ≈ 1,240 s (21 min), full view ≈ 570 s (9.5 min). That is about 30 min per copy and about 2 h for stage 1.
- M = 600: records ≈ 2,120 s, full view ≈ 1,150 s. That is about 55 min per copy and about 3.6 h for stage 1.
- Every call at C = 2048: records ≈ 5,800 s, full view ≈ 3,620 s.

**Step 8: what supports or refutes the hypothesis.**
- **Supports:** (a) clears and (b) clears at both counts.
  - Decompose the lead per goal into the records change (t4-records − f4-records) and the full-view change (t4-control − f4-control).
  - A lead that grows only because the full view falls (the 2B with thinking added weekday errors on g07 and g10 and reversed the ESC correction) counts as support for "larger lead" but not for "thinking helps records". Report that split.
- **Refutes:** dd's upper bound is below 0, or mean(dd) ≤ 0 at both counts after 8 copies.
- **Not evidenced:** neither of the preceding, after 8 copies.
- **Ceiling:** records can rise only about 1–1.5 per copy (g06 is stuck at 0, and g08, g05 and g01 are the reachable cells). The 2B with thinking did not fix g06 or g08, because its final replies on those goals came from turns with thinking on (records-fails finding 1). So the prior that thinking unlocks records cells on the 4B is weak.
- **Goals to watch:** g08 (fit verdict), g05 (made-up content), g07 and g10 in the full view (weekday and invented clock time).
- **Discount:** a goal answered through `answered` after a cut is a think-off reply. Report each arm's cut share. If it is above the probe's runaway share in either arm, re-size C before the next copy.

**plan.ts condition t4:**
```ts
t4: { model: AGENT_4B, think: true, grow: C, predict: C, estimates: { records: ER, control: EC } }
```
- ER = round(1.3 × (1170 + 18 × p90/rate)).
- EC = round(1.3 × (245 + 12 × p90/rate)).
- Here p90 is the probe's p90 completion and rate is its median generation rate.
- Provisional values for p90 = 433 and rate 7.2: ER ≈ 2,930 and EC ≈ 1,260.
- series.ts replaces each estimate with 1.3 × the longest finished run after the first run of the arm finishes (series.ts:75–76).

## Alternatives

- **Fix the cap at 2,048, the same as t2w.** Comparability with the 2B thinking condition favors it. The probe rule wins because the 2B showed a cap fitted to another model either binds or wastes window (FINAL-CHECK.md:24), and the 4B's thinking length is unmeasured.
- **Probe 2B wires (v9) with `--model` set to the 4B, using the probe as it is.** It favors no code change. U1 wins because those prompts carry the 2B's own earlier answers (the full view replays the 2B's mistakes, such as the ESC-2291 template), so the replay would not show the conversation the 4B will see.
- **Run t4 at the card's temperature 1.0.** The model card (4B thinking values) favors it. Temperature 0 wins unless the probe shows greedy loops: f4, t2w and t2a all ran at 0, and sampling at 1.0 needs several seeds per copy to separate noise from treatment.
- **Use `--timeout` as the bound.** It favors a hard wall clock. The cap wins because a timeout skips the answer-pass rescue and falls harder on the arm with more calls.

## Constraints

- `/home/user/agent/tmp/bench/results/v9/probes/think-probe.ts:10,26` keeps only requests whose `model` is the 2B, so f4 wires (4B bodies) replay nothing.
- `think-probe.ts:11-12` fixes `num_predict` 4096 and `num_ctx` 8192.
- `think-probe.ts:45` puts no timeout on fetch.
- `/home/user/agent/tmp/bench3/bench.mjs:95,175` and `/home/user/agent/tmp/bench/bench.mjs:185`: `--think-predict` defaults to 1024.
- `bench3/bench.mjs:446` and `bench/bench.mjs:544`: `num_predict` equals the cap on every call when thinking is on.
- `bench3/bench.mjs:3387,3456-3457`: an empty or cut first pass leads to the answer pass with thinking off. A pass with an error does not.
- `bench/bench.mjs:2951-2967`: the full view's equivalent (a cut, then an answer under the answer scope with think false).
- `bench3/bench.mjs:186,264,3347-3349` and `bench/bench.mjs:196,288,2347-2349`: `--timeout` defaults to 3,600,000 ms and goes to the agent (limit 8) and the provider.
- `bench3/bench.mjs:493-497`: a call is cut when it hits the length limit before any content.
- `bench/bench.mjs:154`: `SAMPLER = { presence_penalty: 1.5, top_k: 20, top_p: 0.95 }`.
- `bench/bench.mjs:396-406`: thinking is not carried in the history.
- `/home/user/agent/tmp/bench/results/v7/tools/plan.ts:39-50` (grow and budget rule) and `:67-72` (conditions).
- `/home/user/agent/tmp/bench/results/v7/tools/series.ts:15,75-81` (1.3× the longest finished run, and the budget stop).
- `/home/user/agent/tmp/bench/results/v10/FINAL-CHECK.md:22-24` (the probe understated the tail), `:34` (band rule).
- `/home/user/agent/tmp/bench/results/v10/run.log:1-44` (think-off durations); line 49 shows t2a-control-v3 still in progress.

## Refusals

- Compaction arm: excluded, because the user set compaction aside (FINAL-CHECK.md:40).
- Requests to the model server from this lane: refused, because the dispatch says "Send no request to 127.0.0.1:11434". The probe and the runs are units for the operator.
- A records-method change in t4 (an answer cue that restates the request, a no-fabrication sentence, an internal marker on the estimate field): excluded. Each would change the method and the model condition at once, so the comparison with f4 would be confounded.

## Measurements

**Supplied:**
- 4B generation at 7.2 tokens per second; 2B at 14.0.
- 4B think-off completions: median 33, p90 79.
- 2B thinking completions: median 182, p90 433.
- The 2B probe: 69–666 tokens, prompt reading at 172–784 tokens per second (`think-2b-on.jsonl`).
- 4B calls per run: records 21 4B requests, of which 2 are seed measures; full view 14 4B requests (wire counts, f4-*-v1).
- Run times from `run.log` (in the Constraints list).
- The 4B's strict pair band: d = 3, −1, 3, 3, bound 0.

**Missing:**
- The 4B's thinking-length distribution and runaway share at temperature 0.
- The 4B's prompt-reading rate.
- Whether `createAgent`'s timeout applies per run or per call (it lives in the package, which I did not read).
- Whether variants v5–v8 exist under `/home/user/agent/tmp/bench/variants/` for both arms (v9 ran 8 copies, so they probably do).
- The full-view call count without seed measures (00001/00002 are probably seed measures; check with U1's `--list`).

## Units

**U1: make the 4B probe instrument.** Role: executor. Engine: a cheap code model.
- **Owns:** `/home/user/agent/tmp/bench/results/v10/probes/think-probe.ts`, a new copy of the v9 probe. Leave the v9 file unchanged, so the v9 record stays reproducible.
- **Changes:**
  - `--from MODEL`: the body model to keep. It defaults to the 2B.
  - Skip bodies with `options.num_predict === 1`.
  - `--tools-only`: skip bodies without tools.
  - `--ctx N` and `--predict N`, defaulting to 8192 and 4096.
  - `--temperature T` and `--seed N` overrides.
  - `--timeout-ms N`: a timeout writes a row with `reason: "timeout"` and continues.
  - `--max-cuts K`: stop after K rows with `reason: "length"`.
  - `--list`: print the selected files and exit 0 without sending anything.
  - Add `thinkingText` and `promptRate` to each row.
- **Depends on:** nothing.
- **Acceptance:**
  - With no arguments it exits 64.
  - `--list --from qwen3.5:4b-q4_K_M --tools-only --per 99` on the four f4 wire directories prints only 4B tool-bearing requests, without 00002/00003, and sends nothing.
  - With the flags absent, the body it would send matches the v9 probe's.

**U2: add condition t4 to plan.ts.** Role: executor. Engine: a cheap code model.
- **Owns:** `/home/user/agent/tmp/bench/results/v7/tools/plan.ts`.
- **Changes:**
  - Add the `t4` entry with C, ER and EC taken from U3.
  - Add t4 to the usage text and the `--conditions` error message.
  - Add an optional per-condition `extra` array that is appended to both arms' arguments. It carries `--timeout` only when C > 3,072.
- **Depends on:** U3.
- **Acceptance:**
  - `node plan.ts --copies 1-4 --conditions t4 --arms records,control --out SCRATCH.json` writes 8 runs (`SCRATCH.json` is any scratch path).
  - The records arguments carry `--ctx 3072+C --budget` with the plan.ts formatting, plus `--model qwen3.5:4b-q4_K_M --think --think-predict C`.
  - The control arguments carry `--ctx 6144+C` and the same model flags.
  - The f4, t2, t2w and t2a output is byte-identical to before.

**U3: run the probe and size the cap.** Role: operator with daemon access.
- **Owns:** `/home/user/agent/tmp/bench/results/v10/probes/think-4b-on.jsonl` and `cap.md`.
- **Depends on:** U1, and the series in progress finishing.
- **Steps:**
  - Run Step 1 exactly: `--from qwen3.5:4b-q4_K_M --model qwen3.5:4b-q4_K_M --think on --tools-only --per 99 --ctx 10240 --predict 4096 --timeout-ms 900000 --max-cuts 3`.
  - If any call is cut, run the Step 4 sampler check into `think-4b-t1.jsonl`.
- **Acceptance:** `cap.md` gives:
  - the number of calls, max, p90 and median completion, the runaway count, the generation and prompt-reading rates, C under the Step 2 rule, ER and EC under the Step 2 formula, and the sampler-check verdict;
  - and a check that every call shows thinking length > 0, which confirms that thinking is on for the 4B.

**U4: run stage 1.** Role: operator.
- **Owns:** `t4-records-v1..v4` and `t4-control-v1..v4`, with their logs and wires under `/home/user/agent/tmp/bench/results/v10/`.
- **Depends on:** U2 and U3, with C ≤ 4096 and no unresolved greedy-loop ruling.
- **Command:** `series.ts --plan plan-t4.json --base /home/user/agent/tmp/bench/results/v10 --budget B`. Size B from 4 × (ER + EC).
- **Acceptance:** 8 rows in `run.log` with exit 0, and each wire shows `think: true` and `num_predict` C on agent calls and `think: false` on answer-scope calls.

**U5: blind double audit of every t4 row.** It uses the same procedure as `verdicts-b1..b5`. Role: checker (Haiku) plus analyst.
- **Depends on:** U4.
- **Acceptance:** verdict and key files for all 80 cells, plus a strict and lenient tally.

**U6: analysis.** Role: analyst.
- **Depends on:** U5.
- **Produces:**
  - Bands (a) and (b) at both counts.
  - Per-goal decomposition into the records change and the full-view change.
  - Each arm's cut share and the share of replies through `answered` after a cut.
  - Thinking tokens per call by arm.
- **Acceptance:** applies the Step 6 stopping rule and the Step 8 verdict. If stage 2 is needed, it writes a plan for t4 and f4 copies 5–8.

## Tensions

- **Cap choice:** a cap fitted to the 4B by the probe, or 2,048 to match t2w. Fitting to the 4B gives a bounded, uncut measurement; matching t2w makes the 2B and 4B thinking conditions comparable.
- **A greedy-loop finding:** keep temperature 0 and accept cuts that the think-off answer pass rescues, or move both f4 and t4 to temperature 1.0 with several seeds, at about 3× the cost.
- **Count that decides:** strict or lenient for bands (a) and (b). The 4B's strict f4 band sits at exactly 0, so the choice could decide the verdict.
- **Stage 2 cost:** it reruns f4 copies 5–8 to keep dd paired, about 15 min per copy.
- **A larger lead from a falling full view:** whether that counts as support for the user's hypothesis.
- **g06 ship dates (outside t4):** the scorer and the auditors disagree on whether a ship date alone is allowed. No verdict changes here, but the Orchestrator owns the rule.

## Risks

- **The probe may miss tail calls,** because it replays think-off histories. Under t4, earlier thinking replies change later prompts in the full view. The 1.5× margin and the per-copy cut-share re-sizing cover this.
- **Cut asymmetry:** if one arm cuts more, its goals fall back to think-off replies and the difference measures the cap. U6 reports cut share per arm.
- **The records harness's recall room grows by the cap less the thinking spent** (FINAL-CHECK.md:30), and the full view has no such effect. This asymmetry is inherent to the condition.
- **Daemon contention:** running the probe or t4 while t2a-control is still running distorts wall times and the estimates in series.ts.
- **Memory:** the 4B at a context of 10,240 in the probe and up to 6144+C in the runs is unmeasured. U3 must record `ollama ps`.
