# Attack on the briefing ledger: v8 traced run (2026-10-09)

Evidence: results/v8/ledger (rows), results/v8/ledger-wire (call `NNNNN`), results/v8/none-6144 and none-6144-wire (control), results/v7/GRADES-ledger.md and GRADES-none-6144.md (grades), /home/user/agent/tmp/bench3/bench.mjs (`bench.mjs:LINE`), and the lens notes under results/v8/attack/. Every figure is one run per arm at temperature 0. The per-goal trace is results/v8/TRACE-ledger.md.

## Verdict

The briefing did its main job: all 10 requests started with every fact they needed, in prompts 6 to 59 percent smaller than the full view's (largest prompt per goal against the v7 control), and no reply brought back a corrected or withdrawn value (`briefing.recall` 1 and `stale` 0 in 10 of 10 rows). It still lost 3 of 10 requests and 11 of 60 graded points, each time with the needed fact on screen, and the harness made two of those misreads likelier: no prompt states today's date, and every prompt replays the model's own earlier answers, errors included. Its lead over the full view, 49 against 41 points, holds up only for g10 and g05 (6 points); the rest rests on one control run that a rerun did not reproduce. Most of the machinery around the briefing changed no answer, yet with it an answer takes 64.8 s against the full view's 14.8 s. Fix the date, the replayed answers, the rule placement, and the cache breaks, cut the idle parts, and judge each change over 8 reworded copies of the 10 requests instead of one run.

## Figures the lenses disagreed on

The following rulings settle each conflict from the files.
- Agent calls: 38 for the goals; the 40 `api_chat` files include the seed pricing calls 00002 and 00003.
- Recall: 17 calls on the wire, 2 refused as closed (00041, 00065); the rows' `recalls` field counts the 15 executed. Marginal cost is about 80 s (attack/trim/chat-timing.txt; attack/loop gives 77 s); the 157.7 s in attack/pins/PINS.md also counts each goal's cold first call.
- Holds: 110,677 ms from the wire (00015, 00026 and 00027, 00078 and 00079, 00100 and 00101); the 108 s in GRADES-ledger.md is superseded.
- Tail facts: the tail carried 2 goal facts, m44 at g01 (00012) and m40 at g02 (00024), and none from g03 on; the wire lens's count of 1 misses m40.
- Cold calls: 17 agent calls report `prompt_eval_cached_count` 0; they took 287.9 s of the 421.2 s of agent time, of which 186.3 s is prompt evaluation. Both figures stand; they measure different things.
- Arm tool schemas: closing pin, recall, and read cut about 390 tokens (00040 to 00041, 00064 to 00065). No per-tool figure is measured; by schema characters in 00012 the split is pin 25, recall 33, and read 14 percent of 1,991.
- Handle test: `bench.mjs:2030` (`/^[mrp]\d+$/` after `normalizeHandle` at 779-784); line 2061 is the recall listing loop.
- Clock: `bench.mjs:2820` advances it a day per goal, but only expiry reads it (1532-1533) and no pin carries an expiry, so it changed nothing here. The date is missing because nothing renders it.
- Offline replay: `--check-ledger --replay` takes budget and tail from the flags but horizon from the record (`bench.mjs:4441`), so a `--horizon 99` replay needs a code change.
- g10: the scenario notes call 555-0142 a decoy (bench3/scenario.json `notes`, trap b), yet they give Sigrid only an extension and r22 calls 555-0142 the account's main switchboard. A reply that dials the switchboard and then 4127 is defensible, so g10 stays disputed until fix F4.
- Prompt size: the largest ledger prompt per goal is 6 to 59 percent smaller than the v7 control's (rows' `maxPrompt`: g03 2,869 against 3,045, g09 2,112 against 5,132); the "23 to 55 percent" in the control lens is not reproduced by those fields.
- Scorer: under the v8 harness the ledger passes 7 of 10 and the control 6 of 10 (v8 ledger.md, none.md line 3); the "5 / 5" in the grade files is the older scorer.

## What works

The following parts carried the 7 passes.
- Coverage: 18 of 18 goal-fact slots in the prompt at entry (attack/trim/sections.txt), with `over` false and overflow 0 in 10 of 10 rows; first prompts 1,823 to 2,077 tokens against the 2,150 budget (results/v8/ledger.log).
- Corrections: m2 "[amended by m29]" is directly followed by m29 in 10 of 10 first calls and m22 by m27 in 5 (attack/pinned-lines.txt); the 15 percent fee (m4) ended superseded at seed and renders nowhere (recall r16 in 00063: "p6 (m4) ended: superseded by m44").
- g05: the only arm that applies the $200 rule with MX-4486 (00066); the control writes "No manager approval code required" from bytes identical in v7 and v8 (none-6144-wire 00009).
- g10: m24 sits in Pinned (00120, line 6 of 13) and the reply carries 4127 and "after 2 pm"; neither control run gives 4127 (v7 and v8 none-6144.jsonl).
- Unpinned user messages: m11, which the judge read as a request (0.731, attack/seed_filing.json row 11), still renders in g06 and g09, and g09 grades 2/2/2.
- Lookups and their pins: 4 lookups with the right ids, each result used (00014, 00025, 00077, 00099); seed results r1 to r4 settle-pinned at seed.
- Judge filing of pairs: all 3 truth relations caught; the shared-token filter drops the false amends m40 to m44 (0.754) and m43 to m44 (0.835) (seed_filing.json `pairs`). The thresholds are fitted on this same seed, so this is in-sample.

## What is broken or missing, by effect on the score

The following defects are ranked by the points they touch; each lost point had its fact in the prompt, so the harness share is a likely cause until its test runs.
1. g07, 5 of 6 points lost (0/1/0, scorer fail). No ledger agent call states today's date: 0 of 38 contain "2026-10-08" or "Thursday", against 20 of 20 control calls with "Today is Thursday 2026-10-08." (grep of both wire folders). bench3/scenario.json `ledger.system` omits the control's date sentence, and m0, the seed's date line, is filed as nothing (chatter 0.559, seed_filing.json row 0) and never renders. The reply says "Today (Friday, October 9, 2026)" (00089). Off-topic rule lines add three Marcus mentions (m2, m29, m18) against one Tomasz line (m8, Pinned line 2 of 14 in 00088); the control also named Marcus, so that cause is unproven.
2. g06, 3 points lost (0/2/1, scorer fail). Rule m6 sits 8th of 11 Pinned lines (00075) as the second clause of a Priya rule, filed under escalations and contacts but not delivery (delivery 0.444, seed_filing.json row 6; group 2 at `bench.mjs:1757`). The forbidden carrier date sits in r19 near the prompt's end, and the reply writes "Estimated Delivery: October 12, 2026" (00077). The hold then told the model to call pin, and the closed tool refused it (00078 note, 00079 "pin is closed"; `affords()` and `closed()` measure room differently, `bench.mjs:1099-1113`). The control breaks the same rule.
3. g05, 2 points lost (1/2/1). "Return window closed" contradicts r5's "open until 2026-10-21" in a prompt with no date, and "The note is ready for sending to Luis Ferreira" copies g03's answer from the tail ("The note is ready for sending.", 00066 tail).
4. g10, 1 point lost (1/2/2, scorer fail). r22 is pinned whole with the switchboard (00120), and recall lists r22 first and m24 last (00121, r25); the scoring of this decoy is disputed (preceding section).
5. Earlier answers in the tail: 233 to 406 tokens per call (attack/ledger-sections.json) that carry errors forward: g05's wrong window into g06 (00075), g06's dated answer into g07 (00088), g07's Marcus answer into g09 (00110). The tail opens on an assistant message with no request before it in 00012, 00024, 00051, and 00110.
6. Handles: replies cite "made in m27" (00089) and "noted in message m11" (00111); recall answers "nothing on" for "m19 assistant" and twice for "m18 user" (00037 to 00041), copied from its own result lines, and the repeat closed g03's arm tools.
7. Cache breaks and model swaps, no score effect: 7 mid-request cold calls (126 s) follow a hold that renders the system message again or a closure that removes tool schemas (`bench.mjs:2278`); each goal swaps the judge in and the agent back (84.1 s of loads); 0 of 71 judge calls reuse the cache.
8. Reporting: `usage` keeps the last pass only (`bench.mjs:2883`; g01 3,682 against 8,599 summed agent calls); the Not shown tally counts a multi-topic pin one time per topic (`bench.mjs:1870-1874`); `toolsOk` marks g03, g05, g07, and g09 down where a pinned result made the lookup unneeded; GRADES-ledger.md line 9 says judge num_ctx 3072 where every judge body sends 4096; the ledger.md seed line's 36.5 s is wall time, of which the judge took 7.5 s (seed.json).

## What to trim

The following table gives each part's measured effect and cost in the v8 run.

| part | measured in v8 | ruling |
|---|---|---|
| Hold gate | 4 holds, 0 answers changed (held equals delivered in g02, g06, g08; g01 rewords $289.00); 7 calls, 110.7 s, 4 cold prefills | trim: `--gate admit`; `settle()` pins the same results (`bench.mjs:1027-1029`) |
| pin tool, pin sentence, Values block | `pins.model` 0 in 10 of 10; 3 pin calls, all after a hold, all whole copies; "## Values" in 0 of 38 calls | trim |
| read tool | 0 calls; 14 percent of schema characters | trim |
| Not shown tally | 51 to 91 tokens per call; 4 recalls copied a row label word for word (00036, 00038, 00051, 00062) | trim |
| Horizon and touch | 9 retirements, 2 touch re-pins (r3, m24 at g04); net effect is m44 absent from g09 and g10 | trim here (`--horizon 99`); keep for the long scenario |
| Request category question | 10 questions, no consumer (correction reads 0.0004 to 0.0021); about 35 s of judge prefill | trim |
| Request warehouse question | never at or over 0.6; 24.2 s | trim the request question; leave seed topics until a recalibration |
| m9 auto-pin | a distractor in 4 briefings (00036, 00075, 00088, 00120), about 25 tokens each | trim through fix F7 |
| recall | 17 calls, 0 facts the prompt lacked; in g04 and g10, 5 of 6 returned items were already in Pinned (00052, 00121) | test (runs A5 and A7): this scenario never omits a fact |
| Other request topic questions | 50 questions; their Yes answers added m9, m13, and m34 lines | test (run A6) |
| Off-topic rule lines | 6 to 7 lines in every call, about 250 to 300 tokens; the only route of m6 to g06 | fix, not trim (F3) |

## Fixes in order

Each fix lists the offline proof it needs before any live run; "replay" means `node /home/user/agent/tmp/bench3/bench.mjs --check-ledger --replay /home/user/agent/tmp/bench/results/v8/ledger --judgments /home/user/agent/tmp/bench/results/v3/cal-categories.jsonl`, which sends no request to the daemon.
1. F1 Date: append "Today is Thursday 2026-10-08." from `scenario.ledger.clock` to the ledger system text, and stop `advance()` within a shift (`bench.mjs:2820`). Proof: a fixture asserts the clock date in every first-call system message of the replay and an equal clock at g01 and g10.
2. F2 Tail: leave the model's earlier final answers out of the tail and never open it on an assistant or tool message. Proof: the replay shows no earlier answer in any tail and 18 of 18 fact slots at entry, with m44 and m40 still present.
3. F3 Rules: split a compound user rule into one unit per clause, file each clause by topic, render a live rule clause on a this-request lookup's topic directly after that result, then render group 2 only on the request's or the lookup's topics. Proof: a fixture with m6's clauses filed shows the date clause after r19 at g06; the replay keeps m8 at g07 and m2 with m29 at g05 and drops m2, m29, and m18 from g07.
4. F4 Scenario g10: in both scenario files, make the LH-31055 lookup text give 555-0142 as Ines Albrecht's own line, leaving the seed so the recorded judgments stay valid. Proof: `--check-ledger` passes and g08's `expected` "albrecht" still matches the lookup text.
5. F5 Handles: let `normalizeHandle` take a leading handle token, render lines without the role word, and add a system sentence that forbids handles in the final answer. Proof: a fixture where `recall({ topic: 'm18 user' })` returns m18's line; no Pinned line in the replay matches `/^[mrp]\d+ (user|assistant):/`.
6. F6 Cache-stable requests: keep the system message and the tool list fixed within a request, and refuse a closed tool in its result instead of removing its schema (`bench.mjs:2278`). Proof: a fixture asserts that every agent request in a run carries the first request's system message and tool list.
7. F7 m9: auto-pin a decisive user message only when it carries an id, a number, or a name. Proof: the replay leaves m9 unpinned and the other 12 auto pins unchanged.
8. F8 Reporting: sum `usage` over every pass, count each omitted pin one time in the tally, count a lookup as satisfied when its result is pinned at entry, and record `hash` and `replyHash` per call. Proof: replay assertions that `usage.prompt` equals the summed calls plus judge usage and that `toolsOk` reads yes for g03, g05, g07, and g09.
9. F9 Gate repairs, only if run A2 keeps the gate: hold only when `closed()` leaves pin open, and move a pin to an identical repeat lookup instead of ending it. Proof: fixtures with low room and with an identical repeat lookup.

## Ablation and reliability runs in order

The runs carry A labels so that they differ from the R labels of the records plan.
Every live run starts with `node /home/user/agent/tmp/bench/results/v7/tools/cold-start.mjs` and records its wire with `RECORD_DIR=WIRE_DIR node --import /home/user/agent/tmp/bench/results/v7/tools/record-fetch.mjs`, one client on the daemon; `OUT_DIR` and `WIRE_DIR` are per-run folders and `VARIANT_FILE` is one of 8 scenario files whose 10 requests are reworded (ids, names, amounts, and asked items unchanged, seed unchanged). The ledger base command L is `/home/user/agent/tmp/bench3/bench.mjs --mode ledger --reply terminal --gate deny --judge mica --judge-ctx 4096 --ctx 3072 --budget 0.7 --tail 0.35 --horizon 3 --temperature 0 --seed 7 --judgments /home/user/agent/tmp/bench/results/v3/cal-categories.jsonl --out OUT_DIR`; the control base command C is `/home/user/agent/tmp/bench/bench.mjs --mode none --ctx 6144 --search words --reply terminal --temperature 0 --seed 7 --out OUT_DIR`. Flags marked "to add" do not exist (`parseArgs` is strict, `bench.mjs:95-131`). Costs use the v8 run times, 11.4 min for L and 2.5 min for C (results/v8/run.log); trimmed-arm times are estimates from attack/trim and attack/loop. A step holds when the paired per-variant pass difference d meets mean(d) - 2·sd(d)/√8 >= -1 goal for a trim and > 0 for a fix.
1. A0 Reproduction: L and C on the original requests, twice each. Cost about 28 min. Settles whether a cold rerun gives byte-equal wire files; without it the band measures nothing.
2. A1 Baseline band: L and C with `--scenario VARIANT_FILE` (to add to both harnesses) over 8 variants, F4 applied. Cost about 111 min. Settles the ledger's margin over the control; grade variant 0 with the rubric.
3. A2 Trims: L with `--gate admit --arm-tools recall --tally off --horizon 99 --request-questions topics` (to add, except `--gate` and `--horizon`; `--arm-tools recall` also drops the pin sentence). Cost about 72 min at 9 min per run. Settles the trim table's first seven rows.
4. A3 Date and tail: A2's flags plus `--date on --tail-answers drop` (to add). Cost about 72 min. Settles F1 and F2: g07 must lose "today is Friday" and g05 the copied "ready for sending".
5. A4 Rules: A3's flags plus `--rules topical` (to add, implementing F3). Cost about 72 min. Settles F3: g06 date violations and g07 Tomasz against Marcus.
6. A5 Recall: A4's flags with `--arm-tools none` in place of `--arm-tools recall`. Cost about 61 min at 7.6 min per run. Settles recall on this scenario only.
7. A6 Judge off during requests: A5's flags plus `--request-questions none` (topics from ids and aliases). Cost about 32 min at 4 min per run. Settles whether 226.4 s of judge time and 84.1 s of model swaps per run buy any pass; the replay must first keep 18 of 18 fact slots and m6 at g06.
8. A7 Coverage goals: the full arm (A4's flags) against the trimmed arm (A6's flags) on a scenario variant with 3 added goals: a fact with no entity that is not a rule, a request that carries a correction, and a fact the budget must omit. Cost about 104 min. Settles whether recall, request topics, the request category, or the tally return.
The total is about 9 hours. Keeping both models resident (`OLLAMA_MAX_LOADED_MODELS=2`) would cut about 84 s per run, but it is a daemon setting that needs the user's approval, and it changes cache history, so it gets its own A0 before any comparison.

## What the per-topic records plan must change

results/v7/AGGREGATES.md needs the following changes before its R1.
- Seed rerun (defect): R8 and the Noise risk ("a bare pass gets a second run with another seed") rerun at temperature 0 with another `--seed`. At temperature 0 the sampler takes the top token, so the seed selects nothing; the variance that exists comes from prompt-cache history (results/v8/DIVERGENCE.md line 42). Replace R8 with the 8-variant band of run A1 and paired differences, and stop citing BRIEFING.md line 454 and ruling 4 (line 508), which carry the same defect.
- Record-line checks (defect): "every line is a substring of its source" and "no line holds an old token outside its correcting message" fail the plan's own worked example, which U5 must build byte for byte. "Sigrid Halvorsen: She only takes calls ..." adds a party prefix, "account LH-31055: net 30 terms, ...; phone is the main switchboard 555-0142" lowercases and joins segments across a sentence, "(Friday, 6 days ago)" is a date note, and "Replaced: ESC-2291 by ESC-2219." holds the old token. Check each value segment as a substring of its source, and exempt the party prefix, the date note, and the `Replaced:` line by construction.
- Rule 6 placement: the claim that "rule 6 sits beside g06's and g09's requests" fails on the recorded filing. m6 has no delivery topic (0.444), g06's request topics are Kenji and delivery, and g09's request has no desk topic (delivery 0.598, attack/judge_calls.json). Make the record's rules depend on F3's clause filing and lookup topics.
- Today line: the control already states the date, so the date belongs in the baseline (F1), not in an arm; R4 runs with F1, and R7 (`--records today`) is dropped.
- Tail: "no wrong answer is carried forward" holds for the record only, because the tail still replays earlier answers (00066, 00088, 00110). Rebase on F2, or report the tail as a confound.
- Baseline: the plan keeps recall, read, pin, and the gate unchanged. Rebase R4 on the arm that run A2 settles, or every record run carries 110.7 s of holds and 4 cache breaks.
- Determinism: the design table's "full, byte-stable" holds for record bytes, not replies (DIVERGENCE.md line 42); every live run cold-starts and records its wire.
- g10 example: it assumes the judge reads contacts for the request, but v8 read 0.417 (No), and the record keeps 555-0142 beside the request; apply F4 first.
- Cost and bar: the cost section omits the judge's 226.4 s and the model swaps' 84.1 s per run, which `agrees` adds to; replace "sum exceeds R4's" on one run with the band rule of run A1.


## Gaps found by the critic

## Verdicts

1. **The seed filing never ran live in v8, and every planned run reuses the same recording.** REQUIRED CHANGE.
   - **Evidence:**
     - `v8/ledger/seed.json` and `v8/ledger.log:1` record "356 records imported; 0 category, 0 topic, 1 amends" questions asked live (the one live call is 00001).
     - `bench.mjs:2770` imports `v3/cal-categories.jsonl`.
     - The base command L at `AB:82` passes the same file to every A run.
   - **Why it matters:**
     - Every judge reading the report relies on is a v3 recording fitted on this seed: m0 chatter 0.559, m6 delivery 0.444, m11 request 0.731, and m18. The category and topic thresholds are in-sample too, but `AB:34` flags only the pairs as in-sample.
     - The A1 band of 8 variants changes only the request wording, so it can never vary the filing. F3 and A4 are therefore judged against one filing.
     - The cost figure "64.8 s against 14.8 s" (`AB:7`) leaves out live filing of 48 messages (about 356 judge questions).
     - `importJudgments` stamps the current `judge.model` onto the v3 rows (`bench.mjs:2446`). Only question-text equality guards against model drift (`bench.mjs:2432`).
   - **Fix:** `AB:34` and `AB:7` must say the filing is imported and in-sample, and give the cost both with and without live filing.
   - **Cheapest check:**
     - Sum `ms` over the 356 imported rows of `cal-categories.jsonl`.
     - Re-ask about 10 seed questions the conclusions rest on (m0, m6, m8, m11, m18, and m24, category and topics) once against a cold judge, and compare with the import. No agent call is needed.

2. **The coverage figure treats the goal's `facts` list as complete, and that list leaves out the date.** REQUIRED CHANGE.
   - **Evidence:**
     - `briefing.recall` covers only `goal.facts` (`bench.mjs:2504`, `bench.mjs:2524`).
     - g07's facts are [8, 36] and leave out m0, which is the seed's only "today" line. Yet g07's scorer requires "today" or "2026-10-08" (`scenario.json` g07 `expectedAny`).
     - g05's facts [2, 29, 42] leave out the date, so the model cannot check the return window (`AB:41`).
   - **Why it matters:**
     - "Started with every fact they needed" (`AB:7`) and "18 of 18" (`AB:28`) contradict the report's own g07 finding (`AB:39`).
     - The recall trim ruling "0 facts the prompt lacked" (`AB:62`) has the same blind spot.
   - **Fix:** Restate coverage as 18 of 19 with m0 counted as needed for g07, and rule recall on that basis.
   - **Cheapest check:** Re-run `measureBriefing` offline with m0 added to g07. Then check whether recall can reach m0 at all: 00088 lists it under "no topic: 0 pins, 2 messages".

3. **The `stale` 0 figure is a check that cannot fail in this scenario, and the report cites it for replies.** REQUIRED CHANGE.
   - **Evidence:**
     - `bench.mjs:2510-2513` scans Pinned lines only, never the tail or recall results.
     - It skips any line that carries "[amended by".
     - It also skips any line whose governing correction is rendered. m27, m29, and m44 are auto-pinned in every briefing (`seed.json` routes `auto` 13).
   - **Mutation:** render m3 "MX-4471" without its marker next to m29. `stale` stays 0.
   - **Fix:** `AB:7` cites a prompt metric for a reply claim. Cite the scorer's `forbiddenPatterns` results and `v7/GRADES-ledger.md:28` instead, and extend `stale` to scan the tail and recall results.

4. **F3's proof contradicts the recorded filing, and it cannot run offline.** REQUIRED CHANGE.
   - **Evidence for the contradiction:**
     - `AB:71` expects the replay to drop m2, m29, and m18 from g07.
     - The g07 request reads escalations Yes 0.8226 (00084), delivery 0.9782 (00085), and contacts 0.906 (00087).
     - m18 is filed under escalations at 0.929 (`attack/seed_filing.json` row 18).
     - So rendering rule lines "only on the request's topics" keeps m18 in g07.
   - **What follows:** `AB:39` calls m18 "off-topic" by goal truth, not by the run's own filing. The Marcus error in g07 may come from the request being filed under escalations, which F3 does not touch.
   - **Why the replay cannot run:** splitting m6 into clauses creates fresh judge questions. The stub judge fails closed on those (`bench.mjs:4375-4390`, `bench.mjs:4615`).
   - **Fix:** Correct F3's expected result and its proof.
   - **Cheapest check:** Print the rule lines the planner gives g07 using the recorded request topics. Then either declare the clause questions to the stub or budget a short live judge pass for them.

5. **The scenario never ends a pin during the shift, so expiry and value-changing replacement are untested.**
   - **Evidence:**
     - All 3 corrections (m27, m29, m44) sit in the seed and are auto-pinned.
     - No pin expires (`AB:19`).
     - The only lookup supersede (r4 by r5, 00013) has identical text.
     - Every canned lookup result is static (`scenario.json` `tools`).
     - A7 (`AB:90`) adds neither an expiring fact nor a lookup whose value changes.
   - **Cheapest check:** Two offline fixtures that need no judge:
     - The same lookup id returns changed text: the older pin ends and only the new text renders.
     - A pin's expiry passes the clock: the pin leaves Pinned and recall lists it as ended.
     - Also add m8-style "off tomorrow" expiry to A7.

6. **The horizon is trimmed, but no planned run can show what it is for.**
   - **Evidence:** `AB:58` says "keep for the long scenario", but no run has one. The briefing room is already close to full: g03 used 557 of 567 tokens and g10 617 of 650 (`ledger.log:4`, `ledger.log:11`).
   - **Cheapest check:** Replay with `--horizon 99` (this needs the code change at `AB:20`) and compare each goal's `plan.tokens` with its room.

7. **F2's cost cannot show in this scenario.**
   - **Evidence:**
     - No goal refers back to an earlier answer.
     - The judge files only requests: 7 calls per goal (00005-00011 through 00113-00119), never replies or tool results.
     - After F2, an earlier answer can only be reached through a handle or entity recall.
   - **Cheapest check:** Add one A7 goal that refers back to an earlier answer, for example asking to send Priya the note drafted for Grace.

8. **The pass bar admits a trim that loses one goal in every variant.** REQUIRED CHANGE.
   - **Evidence:**
     - `AB:82` lets a trim hold when mean(d) − 2·sd/√8 ≥ −1. With d = −1 in all 8 variants, −1 ≥ −1 passes.
     - A2 bundles 5 trims (`AB:85`), so a harmful trim can hide behind a helpful one.
   - **Fix:** Use a strict bar (> −1, or ≥ −0.5). Run leave-one-out for any bundle that fails, and for recall and the request topic questions, which showed nonzero effect in v8.

9. **The variant band cannot test requests that do not name their entity.**
   - **Evidence:**
     - The variants keep names and ids fixed (`AB:82`), and every request names its entity.
     - Several request-topic readings sit near the 0.6 threshold: 0.534 (00058), 0.494 (00086), 0.598 (00107), and 0.417 (00119).
   - **Cheapest check:** Make 2 of the 8 variants describe the entity instead of naming it, for example "the duvet customer".

10. **No baseline at the same window is planned.**
    - **Evidence:**
      - The v7 compaction run at num_ctx 3072 scored 40/60 and got Tomasz right in g07 (`v7/GRADES-compaction.md:32`).
      - The report compares the ledger only with the full view at 6,144.
    - **Cheapest check:** Add compaction to A0 and A1. It took about 20 minutes wall in v7 (`v7/GRADES-both.md:32`).

11. **Sampling options were never examined.**
    - **Evidence:** Both arms send presence_penalty 1.5, top_k 20, and top_p 0.95 at temperature 0 (`ledger-wire/00012_api_chat-request.json:93-100`; `none-6144-wire/00013_api_chat-request.json:417-424`). No attack file mentions them.
    - **Why it matters:** If the runner applies the penalty before greedy selection, it pushes the model away from copying values exactly. That is the failure class in g07 and g10. Both arms use the same options, so this is a possible cause, not a confound.
    - **Cheapest check:** Read the installed runner's sampler code. If the penalty applies at temperature 0, run one g07 probe with presence_penalty 0.

12. **The two arms' tool schemas differ in a way the report doesn't list.**
    - **Evidence:**
      - Ledger lookup descriptions say "such as LH-12345" (00012:106, 00012:125).
      - The control's say "exactly as written in the conversation (LH, a hyphen, then digits)" (none 00013:430, none 00013:449).
    - **Cheapest check:** Diff the tool arrays of each arm's first call, and make them equal before A1.

13. **The 49 against 41 margin rests on one grader who could see the arm.**
    - **Evidence:** `v7/GRADES-ledger.md:1` is headed "Opus grades", and the grader read each row's arm and cause fields (`GRADES-ledger.md:3`).
    - **Cheapest check:** Have a second grader regrade the 20 replies with arm labels removed and order shuffled, and report agreement per goal.

14. **A3 does not test the date explanation for g05.**
    - **Evidence:** `AB:41` blames the missing date for "Return window closed", but `AB:86` checks only g07 and g05's "ready for sending".
    - **Fix:** Add a criterion that g05 does not say the return window is closed.

15. **Nothing shows that any placement makes the 2B model obey rule 6.**
    - **Evidence:** All 4 v7 arms break it (`v7/GRADES-ledger.md:32`), and A4 costs 72 minutes.
    - **Cheapest check:** Before A4, probe g06 alone over 8 rewordings, with m6's date clause placed after r19 and with the current placement.

## Findings outside the claims

- At `AB:39`, "off-topic" is decided by truth topics, but the harness filed m18 as on-topic for g07 (verdict 4). The report should say which of the two it means.

## Attacked and held

- **No agent call ran out of window:** I checked `done_reason` in all 40 `api_chat` responses, and none is "length". Only the 71 judge `api_generate` responses (num_predict 1) end on "length".
- **No agent-side truth leak in bench3:**
  - The truth reads at `bench.mjs:2504-2508`, `2540-2546`, `3186-3233`, and `5030` serve scoring, acceptance checks, and calibration only.
  - Calibration did pick its pair rows using truth (`bench.mjs:3205-3215`). Those rows reach the run only as answers to questions the ledger generates itself.
- **The judge's temperature 1 adds no nondeterminism:** the sampled token disagrees with the readout 4 times (00019, 00048, 00086, 00119). The readout uses only `top_logprobs` (`/home/user/ollama/dist/src/core/index.js:138-145`), so the sampled token changes nothing.
- **All 364 v3 rows carry `asked`,** so the question-text guard at `bench.mjs:2432` covers every imported row.
- **Model swaps happen:** `v8/ledger/memory.log` lines 1-11 show a new runner pid per goal at ctx 3072.

VERDICT: 15 gaps. Changes are required at AB:7, AB:28, AB:34, AB:71, and AB:82 before the verdict stands. Not appended to ATTACK-BRIEFING.md (no edit tool); the dispatcher must append this list under "Gaps found by the critic".
