# Per-topic records for the briefing ledger: the Round B plan (2026-10-09)

## Summary
The briefing ledger is the event-sourced design already built as `--mode ledger` in /home/user/agent/tmp/bench3/bench.mjs: it keeps every message, lookup result, pin, and judge decision as an append-only event, derives everything the 2B model sees from those events, and scored 49 of 60 in Round A.
The part of the event-sourcing idea that was never built is the per-topic record of BRIEFING.md section 9, one record per customer or desk topic rebuilt from that topic's events, and this plan builds it with code, not with the 2B, because the 2B's Round A summaries dropped rules, kept replaced values, and carried its own wrong answers forward.
Round A lost 4 goals because the 2B misread a prompt that held the facts, and no Round A prompt stated today's date, so the record puts the request's current values, today's date, date distances such as "in 13 days", and the request's desk rules into the request message, directly before the question.
The model stays qwen3.5:2b-q4_K_M with thinking off and temperature 0, and the record adds 0 summarizer calls, about 6 judge questions one time at startup, and a projected 1 to 2 seconds per answer against the ledger's 7 questions and 60.2 seconds.
The runs go offline checks first, then a same-day baseline rerun against two placements of the record on the short scenario, and the long scenario only after its loader exists.

## How the three designs scored
The following table scores each design against the Round A evidence and the brief's constraints.

| design | lost goals reached | added cost per goal | determinism | summarizer failure risk | ruling |
|---|---|---|---|---|---|
| code-first | g05, g07 date and Tomasz, g10 by attribution | 0 summarizer calls, about 0 judge questions after the seed | full, byte-stable | none, the 2B writes nothing | base |
| model-first | the same plus g06 by a rider | 0 to 1 card calls, 1 to 3 judge questions, 5 to 15 s | model cards vary with input | low, token checks and a code fallback | graft placement, rules block, date-word rule |
| judge-first | g07 and g10 by grouping and m0, g05 by wording only | 0.3 gists and 0.6 judge questions mean, about 15 s on 3 goals | gist varies | moderate, a 2B paragraph gated by Mica | graft the m0 finding, the `changes` screen, held-out fitting |

The base is code-first, because it reaches the same goals as the others at the lowest cost and keeps every byte reproducible.
The plan grafts 6 parts, each because a measured fact favors it:
- From judge-first: m0, the only seed line that states today's date, is absent from `briefing.seed` in all 10 Round A rows (results/v7/ledger/ledger.jsonl), so the g07 misdate is partly a briefing gap; the record states today from the application calendar.
- From model-first: the record goes into the request turn, because all 4 Round A misses had the fact in the system message (GRADES-ledger.md:27); the system placement stays as the measured contrast.
- From model-first: the record carries the request's desk rules verbatim, so rule 6 sits beside g06's and g09's requests and m8 beside g07's.
- From model-first: a date note follows only a date after a bounding word (until, through, by, before, since, valid) or a date one day from today with no relative word before it, so the carrier estimate gets no note and code-first's open question on it closes. The record carries no handles, because the 2B echoed `[mN]` prefixes (README.md:419) and leaked "m11" in g09 (GRADES-ledger.md:23).
- From judge-first: the `changes` pair screen and fitting on long-seed days 1 and 2 with day 3 held out, in stage 2 only.

The plan rejects 7 parts, each for a stated reason:
- The 2B gist and the 2B cards, because the 2B wrote "No facts." on rule folds and kept replaced values (GRADES-compaction.md:27-30, GRADES-both.md:27-30), and code resolves the pronoun the cards target.
- Regrouping `## Pinned` under record or `## Topics` headings, because it changes a second factor; the `Desk notes` block, because the today line covers m0 and the block surfaces distractor m9; and `needs`, because `over` read false in 10 of 10 rows.
- The two-phone contrast line, because per-line attribution states the same holders; the rider on lookup results, because it changes a tool output the baseline shows verbatim; and notes on every nearby date, because they mark the carrier estimate.

## The record
A record is plain text that code builds for one account or one desk topic from that topic's events, and the request record joins the records of the request's topics.
Membership, digest, and attribution follow these rules:
- Members are user messages that are not a run's request, quiet, or a desk note, plus successful lookup results; assistant messages, seed acknowledgments, and the model's replies never join, so no wrong answer is carried forward (GRADES-both.md:30).
- A member joins `account:A` when its registry topics name A, an alias of A, or an order the order-to-account link maps to A; `#learn` fills that link from "Order X for account Y" (bench.mjs:1140).
- A value is an id-shaped or numeric token (`extractTokens`), an email, or a quoted span, minus the record's own ids; a line is the run of comma-separated segments that hold values, copied verbatim.
- The party is a person named in the clause, or the person named before a clause that opens with a pronoun, or for a lookup result its subject (`order ID`, `account ID`); names in the system text and registered aliases are never persons.
- A decided `amends` pair makes the tokens the two messages share old; a segment holding an old token leaves the record, except in the correcting message, and the record states `Replaced: OLD by NEW.`
- A superseded source, an expired or retired pin's source, and a lookup that a later identical call replaced (`replaced()`, bench.mjs:1501) render nowhere, as in Round A.
- Desk rules are the user rule and correction messages with no entity topic whose decided desk topics meet the request's, verbatim, minus any sentence that holds an old token, ordered by the ledger's relevance score.

The following block is the request record at g10 entry on 2026-10-08, built from m22, m24, m27, r3 (seed 36), and the g08 lookup of LH-31055; the rules part assumes the judge reads `contacts` for the request.

```text
Record for this request. Today is Thursday 2026-10-08.
Halvorsen Interiors (account LH-31055; order LH-80941)
- is escalating a late $1,240 lighting order
- Sigrid Halvorsen: She only takes calls after 2 pm, on her direct line at extension 4127
- the ticket is ESC-2219
- order LH-80941: 8 brass pendant lights, total $1,240.00; Freightline pro number FL-660412; held at the Riverside depot since 2026-10-02 (Friday, 6 days ago)
- account LH-31055: net 30 terms, credit limit $5,000.00 with $1,240.00 outstanding; phone is the main switchboard 555-0142
- Replaced: ESC-2291 by ESC-2219.
Rules for this request
- For anything stuck at a carrier depot, Tomasz Brennan in the warehouse issues the release. He's off tomorrow, Friday 2026-10-09, so release requests have to reach him today.
Request:
Sigrid at Halvorsen Interiors left a voicemail asking for a callback about the stuck shipment. What number do I dial, and when will she pick up?
```

At g05 the Luis record reads `- order LH-79215: 5 quart, total $289.00; Delivered 2026-09-21; return window open until 2026-10-21 (Wednesday, in 13 days)`, m44's "15 percent" yields no line because m4 shares it and m44 supersedes m4, and the refunds rules render m2 without its MX-4471 sentence, m29 verbatim, and `Replaced: MX-4471 by MX-4486.`

## Build and rebuild
The build is a pure function, `Ledger.buildRecords(marks, ends)`, that runs at every select site after `categorize` and `autoPin` and before `plan`, and in the seed pass. It reads the conversation, the results store, the decided judgments, the registry, and the application calendar, and never reads `ledger.clock`, goal members, or truth members.
The calendar is `scenario.ledger.clock` on the short scenario and the `days` entry at the goal's `after` index on the long one; the short clock that advances per goal (bench.mjs:2820) renders nothing, because no short pin carries an expiry (BRIEFING.md:114).
Each record is hashed, and `ledger.records` appends `{ key, version, at, inputs, hash, text, check }` only when the hash differs from the last version; no version is edited or removed. A record's hash changes when a member arrives, a decided `amends` or `supersedes` record touches a member, `replaced()` ends a member result with different text, or the calendar day moves.
On the short scenario the expected versions are the seed build, Luis at g03 entry after g02's account lookup, Kenji at g07 entry after g06's lookup registers LH-81660 to LH-52307, and Halvorsen at g09 entry after g08's account lookup.

## What the model reads
The model reads the Round A prompt with two additions, and the stored request message stays untouched; only the projected view changes, as stubs do (README.md:210-216).
The system string gains one sentence, stored as `ledger.records` in scenario.json: "Each request comes with a record of its current values and rules; a value under Replaced no longer applies."
Under `--records request`, the record block opens the request turn, then `Request:` and the verbatim request; the tail measures the larger request, so older tail messages leave first. Under `--records system`, the same block ends the system message after `## Not shown`, and the request turn stays verbatim.
A cap of `--record-share` of the budget cuts desk rules by lowest relevance first, then record lines by lowest relevance; a `Replaced:` line goes only with its NEW value's line.
A record line renders only when its source also renders verbatim in the same prompt, in `## Pinned` or the tail, so the record is never the only carrier of a value (BRIEFING.md:519). The tools, `recall`, `read`, `pin`, the gate, and the reply route are unchanged, so no tool description grows.

## What the judge reads
The judge is Mica at judge num_ctx 4096, and the `category`, `topic`, `amends`, and `supersedes` questions keep their Round A states, keys, and thresholds, so every seed judgment is reused.
The arm adds one question, `agrees`: "Does the later message replace or withdraw any value that the record lists as current?" Its state is `Record:`, the heading, and the record's lines whose sources precede the later message as `PARTY: SPAN`, then `Later message: user: CONTENT`; its key is `["agrees", RECORD_KEY, LATER_ID]`.
It is asked for each user message whose correction gate opens (`opensCorrection`, bench.mjs:1362) against each record it joins, after the rebuild that applies that message's marks. Restricting the state to earlier sources keeps its bytes stable while later lookups add lines, so a stored answer is reused.
Stage 2 adds `changes` on the long scenario for each arriving user message whose correction gate stays closed: a decisive yes opens the existing `amends` and `supersedes` questions against the record's sources, as a union with the gate. Stage 2 also adds ruling 1's `["closes", MESSAGE_ID]` question (BRIEFING.md:505), which no arm builds yet and the explicit-close cases need.
The judge never decides dates, date notes, attribution, membership, or which value a request needs (BRIEFING.md:12, 294, 296).

## The consistency check
Code checks every build at no judge cost, and any failure suppresses that record for that version and logs `records.faults`. The code checks are: every line is a substring of its source; every value occurs in its source; no line holds an old token outside its correcting message; no line comes from an ended source; no line renders without its source; no handle matches `/\b[mrp]\d+\b/`; a second build over unchanged stores yields identical bytes.
The judge check is `agrees`: a decisive yes at the fitted threshold marks the version inconsistent and suppresses its record, which returns that topic to the Round A prompt, where stale read 0 in 10 of 10 rows (GRADES-ledger.md:28). A refusal or an undecided reading leaves the record shown, because the code checks still hold, and counts in `records.undecided`.
A suppressed version is not rebuilt on unchanged inputs, because the code build returns the same bytes; this departs from section 9's "marks the aggregate stale and rebuilds it" and is a ruling for the user.

## Expected effect per lost goal
Each effect is a prediction that runs R5 and R6 decide.
- g05 (1/2/1, "Return window closed"): the line "open until 2026-10-21 (Wednesday, in 13 days)" sits under the today line next to the request; correct 1 to 2 is likely, and the "ready for sending to Luis" misroute is not targeted, so faithful can stay 1.
- g07 (0/1/0, Marcus for Tomasz, today as Friday): the today line supplies the date no Round A prompt held, and m8 renders in the rules part next to the request; the date fix is likely and Tomasz is a bet, because m2 still names Marcus in `## Pinned`.
- g10 (1/2/2, dialed 555-0142): extension 4127 is attributed to Sigrid Halvorsen and 555-0142 to the account; it is a bet, because full view and compaction also dialed the switchboard with both facts present.
- g06 (0/2/1, wrote the carrier date): rule 6 renders in the request turn, but the carrier date arrives in the run after it; no effect is claimed, and all 4 Round A arms broke rule 6.
- The six 2/2/2 goals must hold: g04's `Replaced:` line names ESC-2291 under a negation-aware pattern, and g09's Kenji record puts the carrier estimate beside a request that forbids dates, with rule 6 beside it.

## Cost
The following list gives each cost against the Round A ledger's 71 judge questions, 7 per goal, 0 summarizer calls, and 60.2 s median per answer.
- Summarizer calls: 0. Judge questions on the short scenario: about 6 `agrees` questions in the seed pass for the 3 decided corrections (seeds 27, 29, and 44) times their records, and 0 in goals, because every goal-time lookup follows those corrections; about 77 in total, 7.0 per goal.
- Seed seconds: about 20 to 26 s one time, at 3.2 s per question measured in the v7 goals (21.5 to 22.9 s for 7 questions) to 4.3 s on 363-token states (BRIEFING.md:286).
- Seconds per answer: v7 first calls took 14.9 s for 1,823 prompt tokens and 16.2 s for 2,077, about 5 ms per prompt token, and later calls in a goal reuse the cached prefix; a record of 150 to 250 tokens projects to 1 to 2 s per answer, which R2 replaces with a measured token count. Build time is an in-memory projection, reported as `records.ms`.
- Long scenario: the baseline itself asks 1 `category` and 6 `topic` questions per arriving seed message, about 104 arrivals, and the arm adds `agrees`, `changes` at 1 to 3 records per arrival, and `closes` per arrival; no long figure is claimed before R11 reads it.

## Risks
The following list pairs each risk with its control.
- Room: g03 used 557 of its 567 tokens of briefing room and g10 617 of 650, so a record can push units out; R2 gates every live run on `briefing.recall` 1 and `over` false in all 10 goals.
- Echo: the 2B can copy the record header or `Replaced:` lines; `records.echo` counts replies with the header or 8 consecutive words of a record line.
- Date writing: Kenji's record carries the carrier estimate near g09; `datesWritten` counts date-pattern hits per goal.
- Wrong attribution: a pronoun or a false name such as "Elm Street" can attach a value to the wrong party; lines stay verbatim, and U3's fixture states the party of every value clause in both seeds.
- Missed corrections: the shared-token test misses a tokenless correction; `agrees` and `records.stale` (lines holding a goal's stale value, scored harness-side) cover it.
- In-sample fit: the short seed gives about 6 positive and 6 negative `agrees` items; the long seed fits on days 1 and 2 and reports day 3 as held out.
- Noise: one run spreads 1 to 2 points (BRIEFING.md:454), so a bare pass gets a second run with another seed (ruling 4, BRIEFING.md:508).

## Implementation units, in order
Each unit edits /home/user/agent/tmp/bench3/bench.mjs behind its flag, is checked by `--check-ledger` fixtures with no model and no judge, and keeps `--records off` byte-identical to the v7 replay.
- U1 Calendar and date notes: `calendarDate`, `describeDate`, the bounding-word rule; 2026-10-21 at 2026-10-08 gives "(Wednesday, in 13 days)", the carrier estimate gets no note.
- U2 Clauses, segments, values, and spans: m24, m8, r22, m11, and m22 give the spans of the worked example and its notes. U3 Party attribution: m24 gives Sigrid Halvorsen, m8 gives Tomasz Brennan, r22 gives `account LH-31055`, and Larkspur Home is never a person. U4 builds membership and the order-to-account link, and `topics()` output stays byte-identical.
- U5 Builder, versions, and code checks: the fixture builds the Halvorsen, Luis, and refunds records byte for byte, and each injected fault trips its check.
- U6 Render: `--records off|request|system|today`, `--record-share`, the system sentence in scenario.json, the `assertPlan` checks, and the separation-check exemption for record lines whose source is a live pin.
- U7 `agrees` and `--calibrate-records`: positives are records built with a correction's marks ignored, negatives are the correct builds; writes calibration-records.jsonl and calibration-records.md.
- U8 Row fields: `records.tokens`, `records.versions`, `records.inconsistent`, `records.undecided`, `records.faults`, `records.stale`, `records.echo`, `records.ms`, `questions.agrees`, `briefing.text`, `leaks`, `datesWritten`. U9 is the README section for the flags, fields, and departures from section 9.
- Stage 2: U10 the long-scenario loader (`--scenario PATH`, seed messages up to each goal's `after`, lookups by version, the clock from `days`); U11 `changes`; U12 `closes` and `reopens` with the mark "(ESC-2219 closed by m84)"; U13 the section 9 judge-reader contrast in calibration only.

## Measurement plan
The runs go in the following order; each names its scenario, its baseline, and the decision it settles, and no run sends a model or judge request before R3.
- R1, offline: `node /home/user/agent/tmp/bench3/bench.mjs --check-ledger` exits 0 with U1 to U8 cases. Settles that the code is correct and `--records off` reproduces Round A.
- R2, offline replay of /home/user/agent/tmp/bench/results/v7/ledger with `--records request` and `--records system` at the Round A budget flags. Reads `records.tokens`, `briefing.recall`, `briefing.over`, projected first call, and omitted units per goal, and confirms m0 in no Round A prompt. Settles `--record-share` and whether each placement may run live.
- R3, judge only, short seed: `--calibrate-records --judge mica --judge-ctx 4096`. Settles the `agrees` threshold; with no threshold over 0.5 that separates, `agrees` stays off and the code checks run alone.
- R4, short scenario, `--records off` at the v7 ledger flags (reply terminal, gate deny, budget 0.7, tail 0.35, horizon 3, ctx 3072, temperature 0, seed 7). Settles the same-day baseline against daemon drift.
- R5, short, `--records request`; R6, short, `--records system`. Graded with the Opus three-axis rubric against R4. An arm holds when its sum exceeds R4's, at least 7 of 10 goals grade correct 2, no 2/2/2 goal of R4 loses a point, stale is 0, recall is 1, over is false, and summarizer calls are 0. Settles the placement: the higher sum wins, and a tie goes to `system`, which keeps the request verbatim.
- R7, short, `--records today` (the today line alone), run only when R5 or R6 holds. Settles how much of a gain the date line carries apart from the record.
- R8, the winning arm with another `--seed`, run when R5 or R6 passes by 7 of 10 exactly or by 2 points or fewer. Settles whether the pass survives noise.
- R9, offline: `node /home/user/agent/tmp/bench/check-long.mjs` exits 0 and `--check-ledger` passes the U10 to U12 cases.
- R10, judge only, long seed: calibrate `changes`, `closes`, and the judge-reader contrast with the record in the `amends` and `supersedes` states. Settles each threshold on days 1 and 2 with day 3 held out, and whether the record enters judge states.
- R11, long scenario, `--records off`; R12, long scenario, the winning arm. Settles pass per lifetime case, `records.stale`, consistency failures per rebuild, and judge questions and seconds per answer against R11, which is the first long reading of any arm.

## Rulings the user owns
The plan departs from section 9 in 4 places, and each needs the user's ruling.
- The record holds no summarizer prose; section 9 gives the prose to the summarizer. A failed consistency check suppresses the record instead of rebuilding it, because a code rebuild returns the same bytes.
- The judge reads the record only in `agrees` on the short scenario; the judge-reader form waits for R10. The record reads the application calendar, and the long loader sets the expiry clock from `days`.
