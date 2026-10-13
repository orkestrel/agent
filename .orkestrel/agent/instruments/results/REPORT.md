# Compaction against selection on the 2B Qwen: the Larkspur reading of 2026-10-08

The sections cap is what lets the conversation keep going. With `window` 1,200 and `sections` 3, both compacted variants ran all 10 goals under a 3,072-token context with no overflow and a largest prompt of 2,114 tokens; without the cap, the summaries themselves filled the window by goal 6 or 7. Selection alone did not bound the prompt: at threshold 0.9 the Mica judge kept nearly every message, so `selection` overflowed at goal 5 exactly as `none` did, at 65 minutes of judge time. Reply quality under the cap is the 2B model's own ceiling: 5 of 10 goals passed in each capped variant, against 7 of 10 when everything fit in 6,144 tokens, and the remaining failures are missed `send_reply` calls, wrong lookups, and fabrication where a summarized fact was gone.

## Setup

- Model: `qwen3.5:2b-q4_K_M` on the Ollama 0.40.0 daemon, `think` false, `temperature` 0, `seed` 7, `truncate` false, so an over-context prompt is refused (HTTP 400) and counted as an overflow.
- Judge: `hf.co/sky7350/Mica-v0.1-4B:Q4_K_M` through the ollama package's `createOllamaJudge`, `num_ctx` 8,192, stock `createSelection` with the `needed` criterion at threshold 0.9.
- Scenario: `scenario.json`, 48 seed messages (14 distractors or chatter) and 10 goals in sequence; 5 goals need a far fact from the first third, 3 need a lookup by an id from the chat, 2 need `search_history` once the fact is out of view. Substring scoring per goal; `send_reply` ends a goal.
- Summarizer: the same qwen model with the generic instruction; compaction `window` 1,200 `estimateMessages` units, `keep` 6.
- Host: 4 CPUs, 15 GB, no GPU. The Mica runner at `num_ctx` 8,192 holds 7.2 GB resident beside the 2.6 GB qwen runner.
- Harness: `bench.mjs` (`tmp/bench/README.md` has the fields). Results under `results/full-ctx6144/` (6,144-token baseline) and `results/full/` (3,072 tokens).

## Runs

| run | context | compaction | selection | passed | replied | overflow from | largest prompt | sections (max) | summarizer calls | judge calls | judge prompt tokens | wall |
| --- | ---: | --- | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `ctx6144/none` | 6,144 | off | off | 7 | 7 | never | 3,922 | 0 | 0 | 0 | 0 | 1.1 min |
| `ctx6144/compaction` | 6,144 | window 1,200, no cap | off | 7 | 7 | never (never folded) | 3,922 | 0 | 0 | 0 | 0 | 1.1 min |
| `none` | 3,072 | off | off | 3 | 3 | g05 | 2,992 | 0 | 0 | 0 | 0 | 1.0 min |
| `compaction` | 3,072 | window 1,200, no cap | off | 3 | 5 | g07 (g05 cut off while generating) | 2,824 | 13 | 26 | 0 | 0 | 11.6 min |
| `both` | 3,072 | window 1,200, no cap | Mica, no limit | 3 | 5 | g06 | 2,813 | 12 | 24 | 242 | 717,900 | 107.8 min |
| `selection` | 3,072 | off | Mica, limit 12 | 3 | 3 | g05 | 2,901 | 0 | 0 | 100 | 463,500 | 64.9 min |
| `compaction-s3` | 3,072 | window 1,200, cap 3 | off | 5 | 8 | never | 2,054 | 3 | 39 | 0 | 0 | 15.7 min |
| `both-s3` | 3,072 | window 1,200, cap 3 | Mica, no limit | 5 | 9 | never | 2,114 | 3 | 48 | 167 | 322,100 | 80.7 min |

The `ctx6144` pair is identical reply for reply, because the window was never reached. Wall time in the judged runs is an upper bound: the daemon swaps the agent and judge models within a goal.

Largest agent prompt per goal, in tokens, at the 3,072-token context:

| run | g01 | g02 | g03 | g04 | g05 | g06 | g07 | g08 | g09 | g10 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `none` | 2,516 | 2,760 | 2,827 | 2,992 | over | over | over | over | over | over |
| `selection` | 2,516 | 2,689 | 2,784 | 2,901 | over | over | over | over | over | over |
| `compaction` | 1,513 | 1,740 | 1,687 | 2,264 | 2,824 | 2,735 | over | over | over | over |
| `both` | 1,468 | 1,645 | 1,860 | 2,037 | 2,365 | 2,813 | over | over | over | over |
| `compaction-s3` | 1,513 | 1,740 | 1,667 | 2,054 | 1,997 | 1,962 | 1,738 | 1,712 | 1,721 | 1,774 |
| `both-s3` | 1,468 | 1,705 | 1,860 | 2,114 | 1,841 | 2,093 | 1,769 | 1,969 | 1,816 | 962 |

Sections held after each goal: `compaction` 1, 1, 3, 5, 6, 9, 10, 11, 12, 13; `both` 1, 1, 2, 4, 6, 8, 9, 10, 11, 12; both capped variants 1, 1, 3 and then 3.

## Findings

1. **Uncapped compaction does not bound the prompt.** Each fold adds a recap message to the view, and the folds never merge, so 13 recaps weighed about as much as the messages they replaced; the prompt crossed 3,072 tokens at g07 (`compaction`) and g06 (`both`), two goals later than `none`. Compaction bought goals, not a bound.
2. **The sections cap bounds it.** With `sections` 3, an overflow past the cap folds the oldest sections into one merged section through a further summarizer call. The prompt stayed between 962 and 2,114 tokens across all 10 goals in both capped variants, and the two runs replied to 8 and 9 goals of 10. The cost is a summary of summaries: the far facts (the approval code, the tracking number, the depot contact) were gone from the view by g03 to g07, and the model either searched for them, fabricated them, or missed them.
3. **Selection alone keeps the prompt where `none` leaves it.** At threshold 0.9 Mica dropped at most 3 of 49 to 67 view messages per goal; `selection` overflowed at g05 exactly as `none` did. Two reasons sit in the package design: the rendered state is the whole view with the subject marked, so one question costs 3,800 to 5,300 judge prompt tokens and the cost grows with the square of the view; and `limit` takes candidates oldest first, so with `limit` 12 the fresh tail is never screened after goal 2. Three of the 10 selections faulted (see finding 6) and fell back to the unselected view.
4. **Selection over the capped view is cheaper and changed little.** In `both-s3` the view is 7 to 17 messages, so a question costs 1,100 to 2,200 judge prompt tokens; the run spent 322,100 judge prompt tokens against 717,900 for uncapped `both`. Mica kept every message in 14 of 20 selections (4 of them by the fault fallback), dropped 1 or 2 in 5, and in the one aggressive selection (g10, 3 of 10 kept) removed the recaps the goal depended on, after which the model looked up Kenji's order and answered about the wrong customer. Pass count matched `compaction-s3` at 5 of 10; the capped selection added one reply and changed which goals passed by zero.
5. **Under the cap the model started searching.** `search_history` was never called in the 60 goals where the facts sat in the prompt or in an uncapped recap. Under the cap it was called in 3 goals of `compaction-s3` (4 calls) and 1 goal of `both-s3` (2 calls); g09 (the gift note, a far fact) passed in both capped variants only because the second search, `replacement kettle`, hit after the first phrase, `Kenji Nakamura replacement kettle`, missed. The harness's search is an exact substring over the whole query, so the phrase queries the 2B writes (`Sigrid Halvorsen Interiors` for a message that says `Sigrid Halvorsen`) return nothing; a word-wise search would have given g10 and g06 their facts. That is a harness limit, not a package one, and it understates the capped variants.
6. **The judge faults were the host's.** Every selection fault (3 in `selection`, 2 in `both`, 4 in `both-s3`) was `model runner has unexpectedly stopped`: the daemon's log shows the Mica `llama-server` process killed by signal 9, and the kernel log counts 30 out-of-memory kills over the runs. The `fault` path held each time: the selection reported the error and the turn ran on the unselected view. Measure Mica beside the agent model on a host with more than 15 GB or with a smaller judge `num_ctx`.
7. **The 2B model's own failures set the ceiling.** With everything in a 6,144-token prompt the model still failed 3 of 10 by answering in plain text after a lookup instead of calling `send_reply` (g02, g06, g08), and a fourth reply (g10) ignored an in-prompt fact. Under the cap it looked up invented or wrong ids (`LH-45678`, `LH-31055` as an order, `LH-44870` for Kenji) and wrote fabricated policies where the recap had lost the rule. These are model failures the context policy cannot fix; the policy decides only whether the fact is reachable.

## Grades

An Opus grader read every reply against the scenario's facts on three axes, each 0 to 2 per goal (20 per axis per run): correct (the right facts, the corrected value, no withdrawn rule), complete (the ids, names, and amounts the goal asked for), and faithful (nothing invented). A goal with no `send_reply` text scores 0 on every axis. The grader's per-goal tables are in the session record; the sums follow. Replies, overflows, and passes are counted from the result files.

| run | correct | complete | faithful | replies | fabrications | overflows | substring passes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `ctx6144/none` | 13 | 13 | 13 | 7 | 1 | 0 | 7 |
| `ctx6144/compaction` | 13 | 13 | 13 | 7 | 1 | 0 | 7 |
| `none` | 8 | 8 | 8 | 3 | 0 | 6 | 3 |
| `compaction` | 6 | 7 | 4 | 5 | 3 | 4, plus g05 cut off while generating | 3 |
| `both` | 9 | 7 | 7 | 5 | 2 | 5 | 3 |
| `selection` | 6 | 6 | 5 | 3 | 1 | 6 | 3 |
| `compaction-s3` | 11 | 11 | 10 | 8 | 3 | 0 | 5 |
| `both-s3` | 13 | 12 | 9 | 9 | 3 | 0 | 5 |

What the grades add to the counts:

- **The capped variants reach the 6,144-token baseline on correctness at half the context.** `both-s3` scored 13 correct against the baseline's 13, and `compaction-s3` 11; they trail on faithful (9 and 10 against 13) because a recap that keeps a rule and loses its value invites an invented value. Both capped runs kept the Priya copy rule, the no-written-date rule, the over-$200 threshold, and ESC-2219 through the folds; both lost MX-4486 and PW-5521-9930, and the gift note came back only through `search_history`.
- **The uncapped runs fabricate more per reply.** `compaction` scored 4 faithful over 5 replies: invented items ("Blanket duvet (size 60x60, color white)"), invented roles, and in g06 a reply about Luis's order written to Kenji. `both` wrote a falsely compliant g05 ("All refund rules met" without the code) and in g06 looked up the wrong order before overflowing.
- **Selection over the capped view moved the sums by 1 or 2 points on one run each**, which is within single-run noise; it added replies on g06 and g07, but the g06 reply is a complete invention (a FedEx number and a November date on Luis's account) and the g10 selection removed the recaps the goal needed.
- **The model's own failures are the same at every context.** No `send_reply` after a correct lookup (g02 in four runs, g06 and g08 at 6,144 tokens); an account number passed as an order id; an invented order id; a flipped rule ("No Manager Approval Code required for refunds under $200" on a $289 refund in `both-s3` g05); a cc to an invented "Michael Chen" in `selection` g03.
- **The substring scorer is generous where facts were summarized away.** It passed `selection` g03 (an invented cc), `compaction` g04 (an invented 24-hour policy), `both-s3` g08 (the reorder tied to the wrong order), both capped g09 replies (the carrier estimate written as a delivery promise, which rule 6 forbids), and `ctx6144` g10 ("shortly" against the after-2-pm fact). It fails `both-s3` g06 only for the missing tracking number and cannot see the invented FedEx number and date, because the forbidden list covers only the 2026-10-12 estimate; it cannot see a revived restocking fee in g03 or g05 either. The next scenario revision must forbid the withdrawn-fee wording on g03 and g05 and any written delivery date on g06 and g09.

## Design implications for the package

- **`sections` must travel with `window`.** A compaction without a cap grows the view by one recap per fold and bounds nothing. The guide's compaction section must show the two together and say why; whether the manager defaults a cap is a design question for the user (a default changes bytes for every compaction consumer).
- **The selection state is the cost.** The stock selection renders the whole view per question. A state that carries the request and the subject with a bounded neighborhood would cut judge cost from quadratic to linear in the view and would let `selection` run without the cap. Referral for the selection round, measured before adoption, because the jaggedness page says irrelevant state distracts and the whole-view state is what Mica was calibrated on here.
- **`limit` screens the wrong end.** Oldest-first candidates mean the newest messages, the ones a request most often depends on, are never asked about once the view exceeds the limit. Newest-first candidates, or a candidate set that excludes messages already kept by an earlier identical judgment, is the alternative; the judgment store already makes the second cheap.
- **Threshold 0.9 is near keep-everything on this state.** The `calibrate.mjs` probe can sweep the threshold on the recorded judgments before the desk pins `OllamaJudgeOptions`.
- **A recap that has lost a fact invites fabrication.** The capped variants' unfaithful replies cluster where the recap named a rule without its value. The summarizer instruction is the application's lever; the `tuned` instruction the harness carries was not run in this reading and is the next arm.
- **Harness note for the agent loop.** `Agent.#trim` runs after tool dispatch with no abort check, so a fold can follow the `replied` abort and spend a summarizer call on a finished goal; the summarizer counts in the capped runs include those folds.

## Files

- `results/full-ctx6144/{none,compaction}/` and `results/full/{none,compaction,both,selection,compaction-s3,both-s3}/`: one `MODE.jsonl` and `MODE.md` per run.
- `results/full/run.log`: start and end stamps per run; `results/full/*.log`: each run's console.
- `scenario.json`: the seed, the goals, the canned lookups, and the notes that name the traps.
