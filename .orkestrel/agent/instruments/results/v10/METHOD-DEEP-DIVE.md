# Trace g05

**Verdict on g05-luis-approval-note in the records arm (objective lane, read-only)**

The premise does not hold. Records loses g05 at no pipeline stage in any of the 17 runs. The 3 real failures are the 2B model leaving out a code that sat verbatim and current in its system message. A fourth "failure" is a scorer gap.

**Verdicts**

1. **"Records fails g05 on nearly every model and condition": REFUTED.**
   - Records scored 13 passes in 17 runs. The 2B with thinking off (`a5-records-v1` to `v8`) passed 5 of 8: v1, v3, v4, v5 and v6 pass; v2, v7 and v8 fail. The 2B with thinking on and the answer pass off (`t2a-records-v1` to `v4`) passed 3 of 4, failing only v3. `t2w-records-v1` passed. The 4B with thinking off (`f4-records-v1` to `v4`) passed 4 of 4.
   - Evidence: the `^g05` lines of each `*.log`.
   - g05 failure sits mostly in the full-view arm on the 2B: `a1-control` fails 7 of 8 (v2 to v8), `t2w-control` fails v1 to v4 and `t2a-control` fails v1 and v2.

2. **"A method defect rather than model weakness": REFUTED for records.**
   - Method loss: 0 of 17.
   - Model misuse: 3 of 17 (`a5-records-v2`, `a5-records-v7`, `t2a-records-v3`).
   - Scorer false fail: 1 of 17 (`a5-records-v8`).

3. **Relayed claim that the 4B's failures include g05: REFUTED for the 4B records arm.**
   - The 4B records arm fails g06 in v1 to v4 and g08 in v1 to v3 (`v10/f4-records-v*.log`).
   - The only 4B g05 failure is `f4-compaction-v1.log:5`, which is a different arm.
   - I refer the matrix wording to the Orchestrator.

4. **The 4B with thinking on: NOT-EVIDENCED.** `v10/run.log` lists no 4B run with `--think`; every f4 run is thinking off. Nothing can show whether g05 moves under that condition.

**Per-stage trace (all 17 runs)**

1. **Seed.** g05 needs three facts plus the withdrawal:
   - fact 2: m2 is the over-$200 rule, whose second sentence names the stale code MX-4471;
   - fact 29: m29 is the correction to MX-4486;
   - fact 42: r4 is the LH-79215 order result showing $289.00;
   - m44 withdraws the 15 percent restocking fee.

   Scoring expects `mx-4486`. Forbidden patterns cover MX-4471, 245.65, and a restocking fee stated as current. Source: `tmp/bench/scenario.json:1`. The variants keep the seed. **Loss: 0.**

2. **Filing.** Every run imports the same judgments from `v3/cal-categories.jsonl`, so the filing is identical everywhere.
   - m2 is filed as a rule at 0.966 and m29 as a correction at 0.717 (line 27; the threshold is 0.70).
   - Both carry the refunds topic: m2 at 0.796 (line 78) and m29 at 0.645 (line 150; the threshold is 0.60).
   - m29 amends m2 at 0.774 (line 54; the threshold is 0.75). It does not supersede m2 (0.126), so the rule stays live.
   - m44 supersedes m4 at 0.974 and m5 at 0.981 (lines 67 and 69).
   - No needed message was filed quiet or superseded. **Loss: 0.** The margins are thin (0.017, 0.045 and 0.024) but the values never vary because they are imported.

3. **Projection.** Every g05 row has the same Rules record (hash `616dd507b3c3`), with stale 0 and 0 faults. **Loss: 0.**

4. **Plan.** Every g05 row has `cut` 0. The briefing used 334 to 336 of 786 to 796 tokens. **Loss: 0.**

5. **What the model saw.** Wire files `a5-records-v2-wire/00042`, `a5-records-v7-wire/00045`, `a5-records-v8-wire/00044`, `t2a-records-v3-wire/00042` and `f4-records-v1-wire/00042` (each `_api_chat-request.json:10`) carry the following lines:

   ```
   ## Rules
   - Standing rule: any refund over $200 needs a manager approval code in the internal note.
   - Marcus just messaged that the approval code rotated early.
   - Use MX-4486 from now on; MX-4471 is dead.
   ```

   - The Luis record carries "total $289.00" and "the director scrapped the 15 percent restocking fee this morning."
   - The tail carries m44 verbatim and a stub for LH-79215 ("result shown under Pinned").
   - Recalls varied by run:
     - `LH-44870` in `a5-records-v2` and `t2a-records-v3` returned Luis's lines only, with no rule or code (`00043` and `00042`, line 112).
     - `refunds` in `a5-records-v1`, v3, v6 and v8 brought the stale MX-4471 sentence back into context: m2 whole and m3, both marked "[amended by m29]" (`a5-records-v8-wire/00047_api_chat-request.json:112`). All four of those replies used MX-4486.
   - **Loss: 0.**

6. **Reply.**
   - **`a5-records-v2`:** "The internal note authorizing the refund is in r8, which requires a manager approval code since the refund exceeds $200…" It names no code and cites a handle. Wire: `00043` response. Audit `62b47c46` rules it real.
   - **`a5-records-v7`:** "Approval Code: [Insert Manager Approval Code Here]", with no tool call. Wire: `00045` response. Audit `dcb8bffd` rules it real.
   - **`t2a-records-v3`:** "Manager approval code needed due to amount over $200." Its thinking reads the rule line ("Refund over $200 needs manager approval code … $289, so it qualifies") and skips the two m29 lines. Wire: `00042` response. Audit `77ec9ae4` rules it real.
   - **`a5-records-v8`:** "Code: MX-4486 (rotated early from Marcus Oyelaran's original code MX-4471)". The answer is correct, but the MX-4471 lookbehind has no `original`. Audit `e203b2b5` rules it a misread.

**Full-view comparison**

The full view adds four things the briefing does not show:
- m2's sentence naming MX-4471, which is stale;
- m3 and m30, the assistant acknowledgements;
- Marcus Oyelaran's surname and role;
- the superseded restocking messages m4 and m5.

Only m30 ("Switched to approval code MX-4486…") puts "approval code" and "MX-4486" in one sentence. In the briefing, splitting m29 into sentences leaves the rule line with no code and the code line with no rule.

That extra content does not help the 2B. `a1-control` passes 1 of 8, and all 7 failures are `answerMissing ["mx-4486"]` (`v9/a1-control-v*/none.jsonl:5`). The 4B passes 4 of 4 in both arms.

**Root cause**

The records pipeline delivers MX-4486 verbatim and current on every g05 request. The 3 real failures are the 2B dropping it from a byte-identical briefing that 10 other 2B runs used correctly. A fourth failure is a scorer lookbehind gap.

**Smallest change and its risk**

- **Scorer.** Add `original` and `rotated from` to the MX-4471 lookbehind of g05 and g03. This turns `a5-records-v8` into a pass.
  - Risk: a reply that calls MX-4471 "the original code" while still using it would also pass. Rescore the v9 and v10 g03 and g05 rows before and after to check.
- **Method (hypothesis, unmeasured).** Render a correction's sentences as one line directly under the rule they amend.
  - Evidence against it: the failing `a5-records-v2` and `t2a-records-v3` already had the lines next to each other.
  - Risk to other goals is low: m2 and m29 are the Rules record's only amended pair.

**Findings outside the claims**

- `/home/user/scaffold/.orkestrel/agent/issues.md:196-201` (I-292, "$289 read as below $200"): `t2a-records-v3`'s thinking reads $289 as over $200. Right looks like: restate it as "the code line skipped while the rule line was read", citing `t2a-records-v3-wire/00042_api_chat-response.json`.
- `/home/user/scaffold/.orkestrel/agent/issues.md:203-208` (I-293, the two reports disagree about the briefing): the wires settle it, because MX-4486 is in every records g05 briefing. Right looks like: record that ruling and cite the five request files quoted in stage 5.
- `/home/user/agent/tmp/bench/scenario.json:1` and `/home/user/agent/tmp/bench/variants/ledger/v1.json` to `v8.json:1` (MX-4471 pattern of g05 and g03): the lookbehind is missing `original`. Right looks like: add `original` and `rotated from`, and add a fixture for the `a5-records-v8` reply.
- Two of the 4B passes are weak: `f4-records-v4` g05 is an audited false pass because it invents "Refund processed" (`v10/audit/verdicts-b5.json:82`), and `f4-records-v2` g05 is ambiguous (`verdicts-b1.json:345`). Both are model fabrication or format problems, not losses.
- In 4 runs a `refunds` recall returns m2 whole with MX-4471. No reply in those runs used the stale code, but recall is the one channel through which the stale value comes back.

**Attacked and held**

- **MX-4486 reached all 17 runs.** If m29 had been dropped from the record, the Rules hash would change. All 17 rows read `616dd507b3c3` with `cut` 0, and five wires confirm the line.
- **Filing is fixed.** If the import file differed between runs, `seed.json` would name another path. All runs name `/home/user/agent/tmp/bench/results/v3/cal-categories.jsonl`.

TERMINAL: REFUTED — g05 shows no method loss in the records arm (0 of 17); 3 of 17 are 2B misuse, 1 of 17 is a scorer gap, and the 4B with thinking on is NOT-EVIDENCED.

# Trace g06

**Lane: objective.** I read the run artifacts only and changed nothing.

## Verdicts

**1. Seed: no loss in any of the 17 runs.**
- Seed index 6 holds the rule: "Third rule: copy Priya Raman … And never promise a customer a delivery date in writing." Index 7 is the assistant's acknowledgment: "no delivery dates go in customer replies".
- Seed index 11 is the gift note on LH-81660.
- The canned `lookup_order` result for LH-81660 holds "Shipped 2026-10-07 … tracking PW-6013-2280, carrier estimated delivery 2026-10-12" (`/home/user/agent/tmp/bench/scenario.json:1`).
- Scoring: `facts [6,11]`, `expected ["pw-6013-2280"]`. `forbiddenPatterns` matches any calendar date in the reply.

**2. Filing: no loss. Seed 6 is misfiled, but that costs nothing in these runs.**
All 17 runs import the same judgments (`seed.json` field `"judgments":".../v3/cal-categories.jsonl"`).
- Seed 6 is filed as a rule at 0.997 (`/home/user/agent/tmp/bench/results/v3/cal-categories.jsonl:7`). It is never quiet and never superseded.
- Its desk topics are escalations (0.935, line 104) and contacts (0.631, line 107). The delivery topic reads 0.444 (line 105), below the 0.60 threshold. So the delivery-date rule is not filed under delivery, which is g06's desk topic.
- Seed 11 is filed as a request at 0.73 (line 12), so it is never auto-pinned. It reaches the briefing through the delivery topic at 0.974 (line 117).
- Seed 7 (fact 0.53, rule 0.33, line 8) is assistant text, and records never carry assistant text.

**3. Projection: no loss.**
- The Rules record has the same version in all 17 g06 rows: `"versions":{"rules":"616dd507b3c3"}`, from `ledger.jsonl` line 6 of every run.
- The rule is split into its own line, verbatim and current: "- And never promise a customer a delivery date in writing."
- Because the line keeps seed 6's desk topics, it ranks behind the warehouse-release rule in the Rules list (`/home/user/agent/tmp/bench3/records.mjs:124-125`, `:390`).

**4. Plan: no loss.** Every g06 row reads `"cut":0,"cutFrom":[]` in all 17 `ledger.jsonl` files.

**5. What the model saw: the rule and the conflicting date sat side by side in 17 of 17 runs.**
A multiline search confirmed that every answer request holds the Rules line in its system message and the `[rN] Order LH-81660 …` result in the tail. The answer request in each run:

| Arm | Runs and answer request |
| --- | --- |
| 2B, thinking off | `a5-records-v1-wire/00055`, `v2/00051`, `v3/00055`, `v4/00050`, `v5/00054`, `v6/00053`, `v7/00053`, `v8/00055` |
| 2B, thinking on | `t2a-records-v1-wire/00053`, `v2/00052`, `v3/00050`, `v4/00050`, `t2w-records-v1-wire/00053` |
| 4B, thinking off | `f4-records-v1-wire/00051` to `v4/00051` |

Details from those requests:
- Example system message: `f4-records-v1-wire/00051_api_chat-request.json:10`. It also pins Grace's seed 13 and the Halvorsen correction at seed 27.
- Example result: line 112 of the same file, "[r10] Order LH-81660 … carrier estimated delivery 2026-10-12".
- The tail is seeds 31 to 47, with lookups shown as stubs. It holds nothing on Kenji or on delivery dates.
- Every run took 2 turns: `lookup_order LH-81660`, then the answer. No run called `recall`.

**6. Reply: 15 failures, all model misuse. 2 passes: a5-records-v5 and a5-records-v6.**
Each failing reply writes the 2026-10-12 delivery date:

| Arm | Run | Date as written |
| --- | --- | --- |
| 4B | f4-records-v1 | "It's scheduled for delivery on Oct 12." |
| 4B | f4-records-v2 | "around Oct 12" |
| 4B | f4-records-v3 | 2026-10-12 |
| 4B | f4-records-v4 | 2026-10-12 |
| 2B, thinking on | t2a-records-v1 | "Oct 12, 2026" |
| 2B, thinking on | t2w-records-v1 | "Oct 12, 2026" |
| 2B, thinking on | t2a-records-v2 | 2026-10-12 |
| 2B, thinking on | t2a-records-v3 | 2026-10-12, pasting the raw result |
| 2B, thinking on | t2a-records-v4 | 2026-10-12 |
| 2B, thinking off | a5-records-v1 | 2026-10-12 |
| 2B, thinking off | a5-records-v2, v3, v4, v7, v8 | "October 12th" |

- f4-records-v2 and a5-records-v2 also leave out PW-6013-2280, although it was in the result.
- In t2a-records-v1 the thinking pass plans the violation: "I should include the tracking number and estimated delivery date" (`t2a-records-v1-wire/00053_api_chat-response.json`). The rule never comes up in its reasoning.

**Loss count over the 17 runs**

| Stage | Losses |
| --- | --- |
| Seed | 0 |
| Filing | 0 |
| Projection | 0 |
| Plan | 0 |
| What the model saw | 0 |
| Reply | 15 |

- Method loss: 0 of 15.
- Model misuse: 15 of 15, in all three arms: 2B thinking off 6 of 8, 2B thinking on 5 of 5, 4B thinking off 4 of 4.

**Full-view comparison.** The control arm fails 11 of 12; only a1-control-v7 passes (`none.md` row 12).
- The control's answer requests carry seed 6 whole, with its "Third rule:" label, and the acknowledgment at seed 7 ("no delivery dates go in customer replies"). The records briefing never shows that acknowledgment. Example: `f4-control-v1-wire/00014`.
- Example failing control reply: f4-control-v4 writes "Estimated delivery is 2026-10-12."
- So showing more does not change the outcome: 1 of 12 passes in the control against 2 of 17 in records.

**Root cause.** The method delivers the rule verbatim and current, next to the lookup clause that conflicts with it, in every run. The 2B and the 4B both treat "carrier estimated delivery 2026-10-12" as the answer to "has it shipped" and never check it against the rule. g06 is therefore not evidence of a method limit: the full view fails at the same rate. This contradicts the method-limit reading in your request for this goal, and agrees with I-289's ruling that this is a model limit (`/home/user/scaffold/.orkestrel/agent/issues.md:175-180`).

**Smallest method change.** None of the 17 runs shows a briefing-side change that would fix g06, because no stage dropped anything. The cheapest change to test is to append the request's on-topic Rules lines as a desk note right after a lookup result in the same run, so the rule sits next to the forbidden value at generation time.
- This has not been tested on the 4B. I-289 records 0 of 9 for rule placements on the 2B.
- Risk to other goals: it adds roughly 40 to 80 tokens per lookup goal at `num_ctx` 3072. g03 and g05 could over-apply rules, for example copying Priya on a request that is not an escalation. It also duplicates lines the system message already holds.

**4B with thinking on: NOT-EVIDENCED.** No such run exists under `/home/user/agent/tmp/bench/results/v10`. The arms there are f4 (4B, thinking off), t2a and t2w (2B, thinking on), and t2.

## Findings outside the claims

1. **Misfiled rule.** `/home/user/agent/tmp/bench/results/v3/cal-categories.jsonl:105`: seed 6 reads delivery at 0.444, below the 0.60 topic threshold. The rule that governs g06 is therefore ranked off-topic for g06 and would be the first Rules line consolidation cuts (`records.mjs:124-125`; README `/home/user/agent/tmp/bench3/README.md:643`). It caused no loss here (cut 0). To get the right ranking, either judge topics per sentence for a split record line, or re-fit the delivery criterion so "delivery date" rules read as delivery.
2. **Scorer is broader than the rule.** The g06 pattern in `/home/user/agent/tmp/bench/scenario.json:1` fails any written date, including the ship date 2026-10-07, which the rule does not forbid. It changed no verdict in these 29 runs, because every failing reply also wrote the 2026-10-12 date. It would fail a correct reply such as "shipped on 2026-10-07". Referred to the Orchestrator.
3. **Unscored made-up action.** f4-records-v1, v3, v4 and f4-control-v4 claim "I've added a gift note … 'Happy 40th, Aiko'", while the result says "gift note text is not recorded on the order". Seed 11, pinned in g06's briefing, prompts this. No goal scores it.
4. **Copies are not independent.** t2a-records-v1 and t2w-records-v1 give byte-identical g06 replies (temperature 0, seed 7, same variant), so repeated copies overstate how many independent samples the counts rest on.

## Attacked and held

- **"The plan's budget trimmed the rule."** Refuted: `cutFrom` is empty in 17 of 17 runs.
- **"The rule never reached the model."** Refuted: the multiline search matched the rule and the LH-81660 result in the same answer request in 17 of 17 runs.
- **"The scorer over-reach caused the failures."** Refuted: all 15 failing replies contain the 12 October delivery date.
- **"The full view fixes it."** Refuted: the control fails 11 of 12.

VERDICT: g06 loss is model misuse in 15 of 15 records failures and 0 method loss. One latent misfile was found (seed 6 off the delivery topic). 4B with thinking on is NOT-EVIDENCED.

# Trace g08

**Lane: objective.** I read the wires, the `ledger.jsonl` rows, the logs, the calibration, the audits, the scenario and I-295. I did no live probe. No 4B run with thinking on exists in `results/v10`, so that condition is NOT-EVIDENCED. The user asked me to watch whether it moves, and nothing here can show that.

## Verdicts

**1. Premise: "the records method fails g08, which signals a method defect." Partly falsified.**

The pipeline lost nothing in any of the 17 records runs. All 12 failures are a missing verdict: the facts were in front of the model, verbatim and current, and the reply left out "it fits".

Results per run:
- `a5-records` (2B, thinking off): 2 of 8 pass (v1, v2).
- `t2a-records` (2B, thinking on): 2 of 4 pass (v2, v4).
- `t2w-records-v1`: 0 of 1.
- `f4-records` (4B, thinking off): 1 of 4 pass (v4).

Point of loss per stage, over all 17 runs:

| Stage | Losses | Evidence |
|---|---|---|
| 1. Seed | 0 | The goal lists `facts:[22]`. m22 carries only the account id `LH-31055`. The limit, the balance and Ines Albrecht come only from the `lookup_customer LH-31055` result, which is canned tool data and not a seed message. The scorer needs `albrecht` plus one fit word, and none of the "no" wordings (`scenario.json:1`). |
| 2. Filing | 0 | m22 is filed as a fact at 0.969 and on the escalations topic at 0.974. m27 is a correction at 0.969 and amends only the ESC-2291 sentence (`results/v3/cal-categories.jsonl:20,25,128`). Nothing was filed quiet or superseded. |
| 3. Projection | 0 | m22's first sentence reaches the Halvorsen record; stale is 0 in every log line 10. |
| 4. Plan | 0 | Every g08 row reads facts covered 1 of 1, nothing cut, nothing over budget. A grep for any cut line or over-budget flag across all `*-records-v*/ledger.jsonl` finds 0. |
| 5. What the model saw | 0 | Every run makes 2 calls: `lookup_customer`, then the answer, with no recall and tools ok. The result sits verbatim in the tool message, for example `[r13] Account LH-31055: … credit limit $5,000.00 with $1,240.00 outstanding. Account manager Ines Albrecht, direct line 555-0142.` (`v9/a5-records-v3-wire/00070_api_chat-request.json:112`; `v10/f4-records-v1-wire/00066_api_chat-request.json:112`). The record is the same version, `359104ada4da`, in every run. |
| 6. Reply | **12** | All 12 are model misuse in the dispatch's sense. Method loss is 0. |

The 12 reply failures fall into three groups (each reply is on line 8 of the run's `ledger.jsonl`):
- **Values restated, no arithmetic and no verdict (4 runs):** a5 v3, v4, v5 and v7 all give the same text: "…credit limit of $5,000.00 with $1,240.00 currently on the books. Their account manager is Ines Albrecht…".
- **$3,760 worked out, but no verdict (7 runs):** a5 v8, t2a v1, t2a v3, t2w v1, and f4 v1, v2 and v3, for example "so they have $3,760.00 available for the new order".
- **Wrong arithmetic and no verdict (1 run):** a5 v6, "which would bring their balance to $1,240."

**The thinking runs show the model had the verdict and dropped it.** In t2a-v1 the thinking reads "So the $3,000 reorder would fit within their available credit." The content then leaves that sentence out (`t2a-records-v1-wire/00068_api_chat-response.json:4`).

The audits rule these omissions as real misses, not scorer misreads (`v10/audit/verdicts-b4.json:164`, `verdicts-b1.json:895`).

**2. User-relayed claim: g08's 4B failures "point to method limits rather than model weakness". Falsified for g08.**

The 4B full view fails the same way:
- `f4-control-v2/none.jsonl:8` and `f4-control-v3/none.jsonl:8` say "…so they have $3,760.00 available for the new order." That is nearly byte-identical to `f4-records-v2`.
- The control's v1 pass computes "**$3,860** credit available" (`f4-control-v1/none.jsonl:8`). The audit fails it (`verdicts-b1.json:498`).

So the 4B gives a correct, explicit answer in 1 of 4 runs in each arm (v4).

**3. I-295 ("pins bury the question; full view 8 of 8"). Holds for the 2B only.**

- The 2B full view passes 8 of 8 in `v9/a1-control`. The 2B thinking full-view runs pass every listed copy: `t2a-control` v1–v2 and `t2w-control` v1–v4.
- The cold-replay probe on the refined arm (not records) brings the verdict back in 5 of 7 runs with `## Pinned` removed, and 6 of 7 with no briefing (`scaffold/.orkestrel/agent/instruments/results/v9/FINDINGS-A1.md:85-95`).
- No such probe exists for the records arm, so the causal claim for records is UNRESOLVED.
- `issues.md:220`, "full view 8 of 8", is a 2B-only figure and leaves out the 4B result of 2 of 4.

## What the full view shows that the briefing does not

1. **The model's own earlier answers.** Tail-requests and tail-answers are set to drop. In the full view the g01–g07 answers are multi-line answers with explicit conclusions (`v9/a1-control-v3-wire/00018_api_chat-request.json:357,426,488`). In the records arm, the only assistant text in the tail is one-sentence seed replies (`a5-records-v3-wire/00070…:40,74,82`).
2. **The story in conversation order, rather than as bullets in the system message.** The records bullets include noise lines:
   - a past request: "- Anyway, can you check where the Halvorsen shipment actually is?"
   - a fragment: "- I transposed the digits."
   - the late order total "$1,240" twice, beside the $1,240 outstanding (`:10`).
3. **The LH-31055 lookup twice.** It appears once from the g04 run (`a1-control-v3-wire/00018…:398`) and once in g08.

The 2B replies in the full view copy the answer shape of item 1, for example "**Available Credit:** $3,760.00 … fits" (`a1-control-v3/none.jsonl:8`). This copying effect is an inference I have not measured.

## Root cause

The briefing and the tail deliver every fact g08 needs, current and verbatim. The 2B, and in both arms the 4B, then summarize the account and leave out the yes-or-no answer the request asked for. For the 2B, the records context (the account story as bullets, and no earlier explicit answers in the tail) makes that omission likelier than the full view does. For the 4B the omission is a model and request effect that the full view shares.

## Smallest change and its risk

Add one sentence to `ledger.system`: "When the request asks whether something fits, applies, or is allowed, state yes or no in your first sentence, then the figures."
- **Why this one:** it targets the measured failure, an omitted verdict, in every arm, and touches no projection code.
- **Risk:** it is unmeasured. It adds tokens to every goal's system message. It could push a premature "yes" on g05, g06 and g07, where a rule decides the answer.
- **Option ruled out — relevance filter on record lines (I-295):** a larger change. It risks dropping lines g04, g07 and g10 need: the judge read g07's units as mixed (m22 at 0.57), and the AUC is 0.73 (`FINDINGS-A1.md:101-103`).

## Findings outside the claims

- **The scorer passes wrong arithmetic.** The scoring checks only `albrecht` and a fit word, never $3,760 or 555-0142. So $3,860 passes (`f4-control-v1/none.jsonl:8`), and so does "$4,240 … within their available credit" (`verdicts-b1.json:471,517`).
  - **File:** `/home/user/agent/tmp/bench/scenario.json:1`, the g08 entry.
  - **Fix:** add a check that fails any available-credit figure other than $3,760.
- **The dispatch says the goal needs her line 555-0142, but the scorer doesn't check for it.**
  - **File:** `/home/user/agent/tmp/bench/scenario.json:1`.
  - **Fix:** either score it, or drop it from the goal's statement.
- **A request and a sentence fragment render as record facts.** "Anyway, can you check…" and "I transposed the digits." appear as Halvorsen record lines (`a5-records-v3-wire/00070_api_chat-request.json:10`).
  - **File:** `/home/user/agent/tmp/bench3/records.mjs`, the account-record build.
  - **Fix:** leave out user requests and context-free fragments from account records.
- **I-295's figure is 2B-only.** `/home/user/scaffold/.orkestrel/agent/issues.md:220` reads "full view 8 of 8".
  - **Fix:** add "(2B; 4B full view 2 of 4, same omission)".
- **`v10/t2-records-v1` also fails g08** (`t2-records-v1.log:10`). It is not in the dispatch list, so I did not trace it.

## Attacked and held

- **Budget trim as the cause:** cut is 0 and nothing is over budget in all 17 runs.
- **A stale ESC-2291 value or a decoy line confusing the reply:** stale is 0, and every reply names Albrecht and not extension 4127.
- **Missing lookup:** 2 calls and tools ok in every run.
- **A scorer misread of a correct answer:** the audits rule each omission real, and no failing reply contains a verdict in any wording.

**Verdict on the premise:** 0 of 17 records runs lost a needed item in the pipeline, and all 12 failures are omitted verdicts. On the 4B the full view fails the same way. The method effect is evidenced only for the 2B, and its cause in the records arm is UNRESOLVED. **FALSIFIED as stated.**

# Ranking

**Lane: objective.** This lane covers what the 17-run traces, the wires and the contracts allow. I made no edits and sent no request to the daemon.

## Design

Of the three goals, only one carries a method signal: **g08 on the 2B**. Records pass 2 of 8 (`a5`) and 2 of 5 (`t2a`/`t2w`), while the full view passes 8 of 8 (`v9/a1-control`) and every listed think-on control copy. Everything else in g05, g06 and g08 is model behaviour that the full view shares, or a scorer fault.

The matrix sentence is wrong about the 4B. It fails g06 in 4 of 4 runs and g08 in 3 of 4 runs, and does not fail g05 in records. On g06 and g08, `f4-control` fails the same way, so the 4B failures don't point to method limits. No run uses the 4B with thinking on, so whether those failures move is NOT-EVIDENCED. The design measures that before any method change.

The plan has six steps, ranked by evidence:

| Rank | Candidate | Goals and runs it would fix | Stage | Risk to the goals records wins (g02, g03, g04, g07, g09, g10) | Harness (`bench3`) | Port (`ledgers`) | Smallest measurement that shows it works |
|---|---|---|---|---|---|---|---|
| 1 | Measure the 4B with thinking on (U1) | No fix; shows whether g05, g06 and g08 move | none | none | run only | none | `f4t-records` and `f4t-control`, variants v1–v4, thinking on, at the same prompt budget as `f4` |
| 2 | Scorer corrections (U2) | g05: `a5-records-v8` fail to pass. g08: `f4-control-v1` ($3,860) pass to fail, and the $4,240 replies (`verdicts-b1.json:471,517`) pass to fail. g06: no verdict changes | scoring | no records verdict on those goals changes unless the rescore shows one | fixture | none | Rescore every v9 and v10 row before and after; list each changed verdict |
| 3 | Cold-replay probe of the records g08 failures (U3) | Picks among ranks 4 to 6; fixes nothing | none | none | probe | none | The 12 failing records g08 requests, plus `f4-control-v2`/`v3`, with the changes U3 lists |
| 4 | Clean account records: drop user-request sentences and lines with no id, number or name (conditional on U3) | g08 on the 2B, up to 9 runs (`a5` v3–v8, `t2a` v1 and v3, `t2w` v1). None expected on the 4B, because its control fails the same way | projection | g04 and g10 read the Halvorsen record; Rules lines are exempt (the g06 rule carries no specifics) | `records.mjs.next` | `helpers.ts` record build | A live 2B records series over v1–v8 against `a5`, and 4 4B copies against `f4` |
| 5 | Verdict-first sentence in the application system text (conditional on U3) | g08 omissions in both arms: 12 records runs, plus `f4-control` v2 and v3 | system text | might push an early "yes" on g05, g06 and g07, where a rule decides the answer | flag in `bench.mjs.next`, applied to both arms | none: this is application text | Both arms, v1–v8 on the 2B and v1–v4 on the 4B. If both arms gain equally, record it as a prompt fix, not a method fix |
| 6 | Relevance filter on pinned and record lines (I-295) | g08 on the 2B, if rank 4 fails and the probe recovers the verdict with `## Pinned` removed | projection | the judge read g07 as mixed (m22 at 0.57), and the AUC is 0.73 (`FINDINGS-A1.md:101-103`); it could drop lines g04, g07 and g10 need | larger | medium: public type change in `types.ts` and `Classifier.ts` | A full live series after ranks 4 and 5 are ruled out |

**No method change can fix these failures, on the evidence so far:**
- **g06, all 15 records failures.** The rule and the 2026-10-12 date sat in the same request in 17 of 17 runs, and the control fails 11 of 12. On the 2B, rule placement passed 0 of 9 and a rewrite request passed 0 of 9 (`FINDINGS-A1.md:42-46,70`). This is a model limit. I-289's reopen condition is a larger model or thinking; the 4B with thinking on is the one untested case (`issues.md:179`), and U1 and U3 test it.
- **g05, the three 2B omissions** (`a5-records-v2`, `a5-records-v7`, `t2a-records-v3`). MX-4486 was verbatim and current in each request, and records already beat the full view (13 of 17 against 1 of 8 for the 2B control). What remains is model variance.
- **g08 on the 4B** (`f4-records` v1–v3). `f4-control` v2 and v3 give a nearly byte-identical reply. A method change can't close a gap the full view shares; only a prompt change (rank 5) might.
- **g05 `a5-records-v8` and the g08 false passes** are scorer faults, not method faults.

**One finding from the wires settles a question the traces left open.** In `t2a-records-v1`, the "would fit" verdict and the content that leaves it out sit in the same thinking-on response (`00068_api_chat-request.json:116` reads `"think": true`; the thinking and content are in `00068_api_chat-response.json:4`). So the omission happens inside one pass, not at the answer-pass boundary. The thinking ends "I should provide this information to the shift lead", which treats the request as an account summary rather than a yes-or-no question.

## Alternatives

- **Per-sentence topics for split Rules lines (seed 6 reads delivery 0.444).** Deferred. It is a latent misfile with `cut` 0 in 17 of 17 runs and no loss. It matters only when consolidation cuts a Rules line.
- **`--tail-answers keep` (the full view's answer shapes).** It needs no code (`bench.mjs:154`). The copying effect is an unmeasured inference, and the profile chose `drop` for the F2 reasons in `README.md.frozen-3d75138e:477`. Run it as a 2B arm only if U3 shows neither a Pinned cause nor a noise cause.
- **Render a correction as one line under its rule (g05).** Ruled out. `a5-records-v2` and `t2a-records-v3` already had the two lines next to each other and still failed.
- **The `compareAmounts` line for g05 (I-292).** Ruled out for g05. `t2a-records-v3`'s thinking read $289 as over $200 correctly; the code line was skipped, not misread.
- **A rule desk note after a lookup (g06).** Ruled out as a build. It is tested only as a cheap change inside U3 under the 4B with thinking on.

## Constraints

- `/home/user/agent/tmp/units/answer-think-fixed-brief.md:22`: a live series runs `bench.mjs`. Edit a `.next` copy, leave `bench.mjs` untouched, and the Orchestrator installs the change between runs. Apply the same to `records.mjs`.
- `/home/user/agent/tmp/bench/results/v10/run.log:1` and `:23`: `f4` runs `--ctx 3072 --budget 0.7` and `t2a` runs `--ctx 5120 --budget 0.42 --think-predict 2048`. Both give a prompt budget of 2150.4 tokens, so the `t2a` settings keep a 4B think-on arm comparable with `f4`.
- `/home/user/agent-port/src/core/ledgers/types.ts:239-253`: `system` is the application's text. `:259-266`: the answer pass always runs with thinking off.
- `/home/user/agent/tmp/bench3/bench.mjs:1007-1019`: `buildLedgerSystem` appends optional sentences; `HANDLE_SENTENCE` (`:855`, `:1018`) is the pattern for a sentence switched by a flag.
- `/home/user/agent/tmp/bench3/bench.mjs:1022`: `carriesSpecifics` is the existing test for an id, a number or a name.
- `/home/user/agent/tmp/bench3/records.mjs:387-394` (`buildLines`), `:124-125` (Rules order), `:156` (`compareAmounts`). Port: `/home/user/agent-port/src/core/ledgers/helpers.ts:369`.
- `/home/user/scaffold/.orkestrel/agent/instruments/results/v9/FINDINGS-A1.md:50,94`: a cold replay differs from the warm recorded run, so replay counts show direction only.
- `/home/user/scaffold/.orkestrel/agent/instruments/results/v9/probes/credit-probe.ts`: the existing g08 replay probe, measured on the refined arm only (`FINDINGS-A1.md:83-95`).

## Refusals

- **The verdict sentence in the port's ledger** (`LEDGER_NOTES` or a default `system`). Foreclosed by `AGENTS.md:67`: "Mechanism, not product policy. Framework code stops before application decisions."
- **A probe written as `.mjs` or shell.** Foreclosed by `AGENTS.md:47`: "ALWAYS write a script as TypeScript run by Node".
- **Editing `bench.mjs` in place during a series.** Foreclosed by the brief at `answer-think-fixed-brief.md:22`: "Leave `bench.mjs` untouched."

## Measurements

These readings were supplied:
- **Records failures:** g05 4 of 17 (3 model misuse, 1 scorer); g06 15 of 17; g08 12 of 17. Method loss is 0 of 17 for each goal.
- **Control:** g05 on the 2B, 1 of 8. g06, 11 of 12 fail. g08: the 2B full view passes 8 of 8; the 4B gives a correct answer in 1 of 4 runs.
- **Probes on the refined arm:** g06 rule placement 0 of 9 and rewrite 0 of 9. g08 credit check recovers 5 of 7 runs with `## Pinned` removed and 6 of 7 with no briefing.

These readings are missing:
- any 4B think-on run;
- a records-arm g08 replay;
- a rescore under the corrected scorer;
- whether the 4B fits in memory at ctx 5120 with `--think-predict 2048`;
- which seed message holds "Anyway, can you check…" and what category it was filed in;
- whether a rescore entry point exists.

Copies at temperature 0 with seed 7 and the same variant are not independent (`t2a-records-v1` and `t2w-records-v1` gave byte-identical g06 replies). Count variants, not copies.

## Units

**U1. Measure the 4B with thinking on.**
- Role and engine: runner by the Orchestrator; no code.
- Depends on: nothing. Score it after U2.
- Commands: `f4t-records-v1` to `v4` are the `run.log:1` command with `--ctx 5120 --budget 0.42 --think --think-predict 2048`. `f4t-control-v1` to `v4` are the `t2a-control` command (`run.log:45`) with `--model qwen3.5:4b-q4_K_M`.
- Acceptance:
  - a pass table for every goal and arm;
  - g05, g06 and g08 traced to the reply stage;
  - for each g08 and g06 reply, whether the thinking held the verdict or noticed the rule, and whether the content dropped it;
  - how many answer passes ran, and how many reached the generation cap;
  - an audit of each failure.

**U2. Correct the scorer.**
- Role and engine: `builder` on Sonnet.
- Owns:
  - `/home/user/agent/tmp/bench/scenario.json`;
  - `/home/user/agent/tmp/bench/variants/ledger/v1.json` to `v8.json`;
  - the control `variants/v*.json` files, if they carry scoring (check first).
- Contracts to land:
  - add `original` and `rotated from` to the MX-4471 lookbehind for g03 and g05;
  - make g06 fail only the delivery date, so the ship date 2026-10-07 passes;
  - make g08 fail any available-credit figure other than $3,760;
  - add fixtures for the `a5-records-v8` reply, a reply with the ship date only, and the $3,860 and $4,240 replies.
- Acceptance:
  - the scorer flips `a5-records-v8` g05 to a pass and `f4-control-v1` g08 to a fail;
  - every other changed verdict across v9 and v10 is listed with its row;
  - stop and report if no rescore entry point exists.

**U3. Records g08 replay probe, with a 4B think-on case for g06.**
- Role and engine: `builder` on Sonnet writes the probe; the Orchestrator runs it.
- Owns: `/home/user/scaffold/.orkestrel/agent/instruments/results/v10/probes/records-credit-probe.ts`, adapted from `credit-probe.ts`.
- Depends on: U2's g08 scorer.
- For g08, replay each of the 12 failing records requests, plus `f4-control-v2` and `v3` for the verdict-sentence change only. Each replay is cold, once per change:
  - none;
  - `## Pinned` removed;
  - user-request and no-specifics lines removed from the account record;
  - the verdict-first sentence appended to the system text;
  - on the 4B requests, `think: true`.
- For g06, replay `f4-records-v1` to `v4` and `f4-control-v1` to `v4` with `think: true`, with and without the rule as the last desk note.
- Acceptance:
  - output is TypeScript run by Node, exits 64 on a usage error, and has a `--dry` mode that sends nothing;
  - a table of passes per change and arm, with replies quoted;
  - each count labelled as direction only, because the replays are cold.

**U4. Clean account records (only if U3's noise-removed change recovers g08).**
- Role and engine: `builder` on Sonnet.
- Owns: `/home/user/agent/tmp/bench3/records.mjs.next`, then `/home/user/agent-port/src/core/ledgers/helpers.ts` and its test.
- Contract: an account record leaves out a sentence from a message filed as a request, and a line with no id, number or name. Rules lines are exempt.
- Acceptance:
  - a dry render of v1–v8 shows the change only in account records;
  - every goal-fact slot for g02, g03, g04, g07, g09 and g10 stays covered;
  - the bench3 self-check exits 0;
  - the port's file test is green;
  - the live 2B v1–v8 series is a separate run by the Orchestrator.

**U5. Verdict-sentence flag (only if U3 shows the sentence recovers g08).**
- Role and engine: `builder` on Sonnet.
- Owns: `/home/user/agent/tmp/bench3/bench.mjs.next`, and the matching control harness.
- Contract: a boolean flag appends one sentence through `buildLedgerSystem`, and the control arm gets the same sentence.
- Port: none.
- Acceptance:
  - the bench3 self-check exits 0;
  - without the flag, every request body is byte-identical to the current harness.

## Tensions

- **Is rank 5 a method fix?** The sentence acts the same in both arms, so a gain in both is a prompt fix. The Orchestrator rules whether it counts toward the records verdict.
- **Order of U1 and U3.** U1 answers the user's 4B think-on question in the harness's own conditions. U3 is cheaper but cold. I put U1 first; the Orchestrator can run them in parallel.
- **U2 moves the baseline.** It turns one records fail into a pass and at least one control pass into a fail, so the matrix needs a rescore before any comparison.

## Risks

- A cold replay can contradict the live result (`FINDINGS-A1.md:94`).
- The 4B at ctx 5120 might not fit in memory. U1 then needs a smaller ctx with the budget rescaled to the same 2150.4-token prompt budget.
- U4's no-specifics test could drop an account line a later goal needs. The acceptance check on goal-fact slots must run before any live series.
- A larger 4B think-on failure count could come from thinking reaching the generation cap rather than from the reply. U1 must report cap hits separately.
