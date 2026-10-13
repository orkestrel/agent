# Measured and rejected

Each row is something the campaign measured on the Larkspur support-shift benchmark and dropped, with the reason. Read this before proposing a context change for a small model, and cite the row if you revisit one. Unless a row says otherwise, the reading comes from the 2B Qwen with thinking off at temperature 0. The 4B and thinking-on readings are in the final check (`records-series-verdict.md` and its successor). Paths starting `tmp/` are in the agent checkout; paths starting `.orkestrel/` are in this checkout.

The full harvest, with every citation, is `.orkestrel/agent/harvest/rejected.json`. It was built by workflow `wf_86cadce9-b29` on 2026-10-09, from five blind Haiku lanes condensed and verified by an Opus planner.

## Context strategies

| Rejected | Measured result | Why it is not worth building | Could change if |
| --- | --- | --- | --- |
| Full view with no context management | Overflowed from g05 at 3,072 tokens, 3 of 10. At 6,144 tokens it had the lowest adjudicated mean of the three designs: 4.38 to 5.13 passes per copy, with 8 of its 48 scorer passes false. | It does not fit the small window, and at twice the window it loses to both briefing designs. | A larger model or a thinking pass reads long views better; the final check measures both. |
| Judge selection alone (Mica, whole-view state, `limit` 12) | 3 of 10, overflowed from g05, and spent 463,500 judge prompt tokens over 64.9 minutes. | It bounds nothing, and its cost grows with the square of the view. | A bounded state with newest-first candidates (`tmp/bench/results/REPORT.md:78`). |
| Calibrated judge selection in place of capped compaction | 3, 5, and 4 strict passes at 4 to 20 minutes per goal, against 5 for tuned compaction at 0.6 minutes. | Many times the time for no more strict passes. | Answer-counted passes favored selection (6 and 7 against 5), so a cheaper judge reopens it. |
| Judge selection on top of capped compaction | 5 of 10, the same as compaction alone, for 322,100 judge prompt tokens. | The judge cost bought no passes. | None named. |
| Compaction with no `sections` cap | 3 of 10, grew to 13 sections, and overflowed from g07. With `sections` 3: 5 of 10 and no overflow. | Each fold adds a recap that never merges. | A manager-default cap (`.orkestrel/agent/plan.md:197`). |

## Judge and selection details

| Rejected | Measured result | Why it is not worth building | Could change if |
| --- | --- | --- | --- |
| A selection threshold of 0.70 or 0.80 | Kept 16 of 21 must-keep messages, against 18 at 0.90 and 19 at 0.95. | Loses indirect needs: the approval-code correction, the no-written-date rule, and lookup ids. | A held-out goal set refits it (`tmp/bench/results/JUDGE.md:71`). |
| tev1 0.8B, or Mica through the System One wire, for selection | tev1's needed and noise probabilities overlap (0.36–0.61 against 0.18–0.67), and its 2,050-token context faults whole-view selection. | No threshold separates needed from noise. | A structured-state test of tev1 has not run. |
| Judge question forms other than the binary must-respect `needed` | `score` came out as expected on 2 of 4 rows; the necessity wording missed a standing rule at 0.896. | They miss standing constraints or blur the answer. | Another judge model (`.orkestrel/agent/refine.md:582`). |
| The pair-only state for `needed`; the whole-view state for relation questions | The pair misread a standing rule at 0.804; the view cost twice as much for relation questions with no gain. | Each loses accuracy or cost on its question. | A second transcript with a clarifying message. |
| Gating rule presence on desk-topic filing | Rule m6 reads delivery at 0.444 against a 0.6 fit, so it would drop out of g06's view on every copy. | Presence would ride thin in-sample margins. | None named. |
| Re-asking a judge question whose logprob readout always fails | 8 questions failed on every attempt; 5 were re-asked at every select site. | The same bytes return the same failure. | None. |
| Running the judge beside the agent on the 15 GB host, or a second daemon client | 30 out-of-memory kills at `num_ctx` 8,192; a concurrent probe forced a reload on every call at about 12 s each. | Judged readings fault, and timings are contaminated. | A larger host or a smaller judge window. |

## Briefing ledger parts

| Rejected | Measured result | Why it is not worth building | Could change if |
| --- | --- | --- | --- |
| A tail that replays earlier requests, answers, call groups, or handle marks | Replayed answers carried errors forward three times; `[m48]` prefixes leaked into answers. | The 2B copies whatever the tail replays. | None. |
| The hold (deny) gate on the first reply | 4 holds and 0 changed answers, at a cost of 7 calls and 110.7 s. | It costs time and window and changes no answer. | One run; an 8-copy band was planned and not run. |
| Idle parts: the model `pin` tool, `read`, the Values block, the tally, the horizon, request categories, and auto-pinning every decisive message | 0 model pins in 10 goals; 0 `read` calls; the Values block in 0 of 38 calls; the tally cost 51 to 91 tokens per call. | Each spends tokens or judge time for no answer change. | The horizon is kept for the long scenario (`tmp/bench/results/v8/ATTACK-BRIEFING.md:58`). |
| Budgets that leave out the tool-schema cost, and a 0.55 budget share | Before the 835-token schema cost was charged, 9 of 20 goal runs ended with no answer. | The window fills before the answer. | The 0.55 reading is from a replay only. |
| Unbounded recall, and an answer run with tools and no cue | 8 of 9 no-answer runs were recall chains. | Recall loops end the run with no reply. | None: the recall budget, the cue, and the collapsed view replace it. |
| Stripping lookup handles to fix the credit check | 1 of 7 cold replays passed with the handles stripped, the same as with no change. Dropping the pinned section passed 5 of 7. | The handles are not the cause. | The relevance filter is the open arm (`ideas.md`). |
| Fixing Kenji's delivery date by rule placement or a judge draft check | Every placement passed 0 of 9; a rewrite kept the date in 9 of 9. | The 2B copies the date from the lookup result. | A larger model; the final check reads the 4B. |
| Today's date carried only as a conversation message | The judge dropped the date line at p 0.005 to 0.040; 0 of 38 ledger calls stated it. | A date alone looks irrelevant, so it belongs in the system text. | None. |

## Compaction and summaries

| Rejected | Measured result | Why it is not worth building | Could change if |
| --- | --- | --- | --- |
| Generic summary instructions, and tuned ones that keep dates without their meaning | Generic: 3 of 10 with 11 of 20 correct, against 5 and 14 for the tuned summary. | Next-step text pollutes the recap, and a bare date becomes a wrong deadline. | None. |
| A summarizer guard that accepts `No facts.` and restores ids from replies | Rules with no id vanished; restores recirculated the stale code MX-4471 and the decoy number 555-0142. | It loses rules and feeds back the model's own errors. | None. |
| The rollup on by default | 4 of 9 summarizer calls produced a rollup that no agent request carried. | Its calls produce text the model never sees. | None. |
| Selecting or folding single messages instead of whole exchanges | An orphaned call led the model to resend the g03 note; folds split calls from their results. | The model reads an orphan as live work. | None. |

## Replies, tools, and sampling

| Rejected | Measured result | Why it is not worth building | Could change if |
| --- | --- | --- | --- |
| `send_reply` as the default reply route | With compaction: 2 of 10 against 5 for a terminal reply. | Fewer passes. | One run per design. |
| Greedy sampling for the thinking 2B | Search 4 of 8 at 15.1 s, against 16 of 16 at 7.2 s with the model card's sampler. | The model loops back to reading. | None. |
| Raising the thinking cap to fix the records' no-reply requests | At 1,024 tokens, 2 of 22 calls spent the cap with no content. At 2,048 tokens the same two calls, the tool-free answer passes of g01 and g10 with byte-identical prompts, spent the cap again. | The loop is in the answer pass, not the cap; a thinking-off answer pass is the open arm (`ideas.md`). | None. |
| An optional `from` argument on `read` | Search fell from 16 of 16 to 6, and paging from 16 to 0. | Any regression rejects it. | None. |
| Rewording tool descriptions for the reflexive 2B | Byte-identical rewordings flipped the first call on 3 of 4 ports. | Copy tuning is a lottery for the 2B. | With thinking on, the same bytes read as instructions. |
| Refusal copy that names two exits or addresses the user | Two refusals that pointed at each other made a 36-call loop. | A refusal names the one next call. | None. |
| A concrete example id in lookup descriptions | The model looked up `LH-12345` 6 times. | It invites lookups of an id no goal named. | None. |
| Chat requests without `truncate: false` | An 18,035-token prompt at a 6,144 window returned `prompt_eval_count` 25 with no error. | The daemon drops leading messages silently. | Ollama 0.40.0 only. |

## Scoring and method

| Rejected | Measured result | Why it is not worth building | Could change if |
| --- | --- | --- | --- |
| Plain-substring, raw-markdown, and permissive scorers | Permissive edits passed replies with a stale value or a denied fit. | Each variant errs one way or both. | None: strict patterns plus a blind two-sided audit. |
| Auditing scorer failures alone | 25 of 162 scorer passes were false after Astra's check, 8 of them in the full view. | It inflates the arm with the most false passes. | None. |
| Single runs, and 8-port screens, as evidence | Cold reruns of one design varied by up to 2 passes; an 8-port screen passed a configuration the 16-port reading failed. | Decide with the paired 8-copy band and the 16-port set. | None. |
