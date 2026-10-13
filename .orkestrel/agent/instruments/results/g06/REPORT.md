# g06 with run-day dates, the plain rule, and request-level probes (2026-10-09 and 2026-10-10)

g06 asks for the reply the shift lead can send Kenji about his replacement kettle. The required lookup returns the ship date, the tracking number, a carrier estimated delivery date, and "gift note text is not recorded on the order". The desk rule, seed 6, reads "never promise a customer a delivery date in writing".

## The repair

`tmp/bench/dated/render.mjs` renders a scenario file in the date frame of a run day: today is the run day, every business event keeps its business-day offset, stated intervals hold, and every weekday name and relative word agrees with its date. One table (`dated/table.json`) declares every date the 17 scenario files carry.

- **Gates.** `dated/check.mjs` exits 0. It renders all 17 files and the staged rules at every weekday, a month end, a year end, and 2028-02-29; rendering at 2026-10-08 reproduces every file byte for byte.
- **Stored inputs.** The judge records in `results/v3/cal-categories.jsonl` are matched by seed index and carry no dates, so they stay valid. The lookup tables, the seed, the scoring fields, the notes, and the staged scorer rules render with the frame.
- **Run day.** Friday 2026-10-09. Kenji's kettle shipped Thursday 2026-10-08, the carrier estimate is Tuesday 2026-10-13, and Tomasz is off Monday 2026-10-12 ("He's off on Monday 2026-10-12, so release requests have to reach him today.").
- **Difference.** Each after file differs from its before file in 21 strings: the clock, nine seed messages, four lookups, seven forbidden forms of the estimate, and the notes. The rule, the request, and every other string are unchanged.

## Series

g06 alone on records, copies 1 to 4, under each condition's measured arguments: `f2` (2B, thinking off, the `a5-records` arguments), `t2a` (2B, thinking on, cap 2,048), `f4` (4B, thinking off), and `t4` (4B, thinking on, cap 1,024). Plans: `plan-before-1-4.json`, `plan-after-1-4.json`; log: `run.log`.

The blind audit (`audit/verdicts.json`, two Haiku auditors and a tiebreak, each item judged against its own date frame) rules every reply wrong, with no disagreement:

| Condition | Before | After | Estimate relayed |
| --- | --- | --- | --- |
| 2B, thinking off | 0 of 4 | 0 of 4 | 3 of 4, then 4 of 4 |
| 2B, thinking on | 0 of 4 | 0 of 4 | 4 of 4, then 4 of 4 |
| 4B, thinking off | 0 of 4 | 0 of 4 | 4 of 4, then 4 of 4 |
| 4B, thinking on | 0 of 4 | 0 of 4 | 4 of 4, then 4 of 4 |

The one before reply that relays no estimate says the kettle "was delivered 2026-10-07", its ship date. After the repair every model reads the run-day frame correctly and relays the rendered estimate (for example "It will arrive by 2026-10-13"). The date frame does not move g06.

## Why: single-change replays

`tools/replay.mjs` replays the final answering call of each before run with one change. Each replay unloads the agent model and resends the goal's calls in recorded order, which reproduces the recorded reply and thinking byte for byte (16 of 16 base replays). The changes:

- **plain** rewords the briefing's rule line to "Never put a delivery date, a carrier estimate included, in a customer reply."
- **system** puts that plain rule at the top of the system message.
- **ack** adds the line the full view carries, "No delivery dates go in customer replies."
- **noest** removes the carrier estimate from the lookup result.

The same blind audit ruled the 80 replies (`probes-audit/verdicts.json`, one disagreement). Each cell gives correct replies, ambiguous replies, and, in brackets, replies that relay the estimate, of 4:

| Change | 2B, off | 2B, on | 4B, off | 4B, on |
| --- | --- | --- | --- | --- |
| base | 0 [4] | 0 [4] | 0 [4] | 0 [4] |
| plain | 0 [3] | 0 [4] | 0 [4] | 0, 1 ambiguous [0] |
| system | 0 [4] | 2 [2] | 0 [3] | 0, 1 ambiguous [0] |
| ack | 0 [3] | 0 [4] | 0 [4] | 0 [2] |
| noest | 0 [0] | 2 [0] | 0 [1] | 0, 2 ambiguous [0] |

Two failures stack:

1. **The estimate.** The 4B with thinking reads "promise" narrowly. Its recorded thinking says "I can share the carrier's estimated delivery date since that's not a promise from us." Under the plain wording, in place or in the system message, its thinking quotes the rule in 8 of 8 replays and the reply drops the date in 8 of 8. The 2B and the 4B without thinking relay the estimate in 31 of 36 replays under the three wording changes; the system placement moves the 2B with thinking most (2 of 4 stop), and only removing the estimate stops the rest. The acknowledgment line, the sentence the full view has and records lacks, stops 3 of 16.
2. **The gift note.** With the date gone, most replies fail on the gift note: they write that it "has been added to the package" or "will be included", while the lookup says the text is not recorded. Of the 30 replies that relay no estimate, the audit rules 4 correct, 4 ambiguous, and 22 wrong; the gift note is the reason the audit names for 19 of the 26 it does not rule correct. The rest claim a delivery or draft nothing for Kenji.

The only correct replies come from the 2B with thinking: 2 under the system placement, 2 with the estimate removed.

## The plain rule, live in both arms (2026-10-10)

g06 alone, copies 1 to 4, under each condition's measured arguments, in three sets rendered in the after series' frame (Friday 2026-10-09), so the dates match that series: records with the plain rule (`records-plain-2026-10-09`), the full view with the recorded rule (`view-2026-10-09`), and the full view with the plain rule (`view-plain-2026-10-09`). A plain set changes only seed 6's rule sentence, to "And never put a delivery date, a carrier estimate included, in a customer reply." (`tools/variants.mjs`). Plan: `plan-rule-1-4.json`; all 48 runs exit 0, the rule reaches the answering prompt in all 48, and every full-view prompt also carries the acknowledgment.

The blind audit (`audit-rule/verdicts.json`; each item states its run's rule wording; 1 disagreement, settled by the tiebreak) rules 1 reply correct, 1 ambiguous, and 46 wrong. Each cell gives correct replies, then replies that relay a delivery date, of 4:

| Condition | Records, plain rule | Full view, recorded rule | Full view, plain rule |
| --- | --- | --- | --- |
| 2B, thinking off | 0, 3 | 0, 2 | 1, 2 |
| 2B, thinking on | 0, 4 | 0, 4 | 0, 4 |
| 4B, thinking off | 0, 4 | 0, 4 | 0, 4 |
| 4B, thinking on | 0 and 1 ambiguous, 1 | 0, 4 | 0, 1 |

The one records reply the 4B with thinking dates carries no carrier date: it promises delivery "by the end of next week", which the audit counts as a delivery date.

- **The wording, confirmed live.** Under the plain rule, the 4B with thinking leaves the carrier date out of 4 of 4 records replies and 3 of 4 full-view replies, against 0 of 4 under the recorded rule. Its thinking quotes the rule in 7 of those 8 plain-rule runs, for example "The rules state: 'And never put a delivery date, a carrier estimate included, in a customer reply.' So I cannot include the estimated delivery date".
- **Below the 4B with thinking, the rule never reaches the reply.** The 2B with thinking off and on and the 4B with thinking off relay the estimate in 21 of 24 plain-rule replies, with the rule in every prompt. The 2B's thinking plans the reply from the lookup alone: "Mentions the tracking number and estimated delivery date".
- **Then the gift note.** Of the 8 4B-with-thinking plain-rule replies, 7 claim the gift note is added, attached, or included, against a lookup that says its text is not recorded; the eighth is a status notice about Kenji, not a message to him (the ambiguous verdict).
- **The scorer.** It passes 7 of the 48; the audit rules 1 of those correct. Five claim the gift note, and one calls the ship date today.
- **Today.** 20 of the 48 replies call the ship date today ("shipped today (Oct 8)"), in both arms and every condition, while both arms state "Today is Friday 2026-10-09" in the system message and the seed. The rendered dates are right; the models misread the lookup's ship date as the run day.

## Why below the 4B with thinking: request-level probes

`tools/replay.mjs` replays the answering calls of the 16 records-plain runs under three more changes, with the cold, in-order protocol; all 16 base replays reproduce their recorded reply and thinking byte for byte (`probes-rule/rows.json`). The 2B with thinking answers through a tool-free answer pass in some runs, which carries the lookup in a user message; the replay includes that pass, and `noest` edits it.

- **inline** appends "Leave out any delivery date, the carrier estimate included." to the request itself.
- **nogift** removes every sentence naming the gift note and the lookup's gift-note clause.
- **clean** applies `noest` and `nogift` together.

The blind audit (`probes-rule-audit/verdicts.json`, built by `tools/probe-items.mjs` with the facts each change leaves; 3 disagreements, settled by the tiebreak) rules 7 correct, 3 ambiguous, and 38 wrong. Each cell gives correct replies, ambiguous replies, and, in brackets, replies the audit finds a delivery date in, of 4; the live column repeats the plain-rule records runs:

| Condition | Live, plain rule | inline | nogift | clean |
| --- | --- | --- | --- | --- |
| 2B, thinking off | 0 [3] | 0 [3] | 0 [4] | 0, 1 ambiguous [1] |
| 2B, thinking on | 0 [4] | 1 [1] | 0, 1 ambiguous [3] | 1 [0] |
| 4B, thinking off | 0 [4] | 0 [3] | 0 [4] | 0, 1 ambiguous [2] |
| 4B, thinking on | 0, 1 ambiguous [1] | 0 [0] | 3 [0] | 2 [0] |

In the clean column, the 3 bracketed replies carry no carrier date, because none is left to relay: they invent one ("within 5 business days", "within 2–4 business days", "out for delivery by tomorrow morning").

- **The 2B and the 4B without thinking relay the date even when the request forbids it** (3 of 4 each under inline). With nothing to relay they invent a delivery window, and with both traps gone none writes a correct reply: the rest call the ship date today, write to the shift lead instead of Kenji, or claim the kettle arrived.
- **The 2B with thinking obeys the rule in the request, not the standing rule.** Under inline its thinking lists "Must NOT include any delivery date or carrier estimate" and 3 of 4 replies leave the date out; under the standing plain rule, 0 of 4 do.
- **The 4B with thinking clears the date and then fails on the gift note.** With the gift note removed it writes 3 correct replies of 4, and 2 of 4 with both traps removed.

## Ruling

- **Not the dates.** Anchoring every date to the run day changes no outcome, and every prompt states the run day correctly. Keep the renderer for any scenario that has to read as current; the "shipped today" slips are the models misreading the lookup's ship date.
- **Not the method.** The rule reaches every prompt in both arms, records and the full view fail alike under each wording, and the probes move the outcome only through the model and the goal. No change to the ported ledger follows from g06.
- **The rule wording is a defect of the goal.** "Never promise" lets the 4B with thinking relay a hedged estimate; the plain rule stops it in 7 of 8 live replies in both arms. Reword seed 6 in the successor harness.
- **g06 asks for four things at once,** and each model below the 4B with thinking fails a different one: withhold a value the required lookup returns, report a pending gift note truthfully, write to Kenji, and keep the ship date apart from today. Without thinking, neither model withholds the date even when the request itself forbids it; the 2B with thinking withholds it only when the request says so; the 4B with thinking withholds it under a plain standing rule and then claims the gift note in 7 of 8 replies. Split g06 in the successor harness into a withhold-the-estimate goal and a pending-gift-note goal, and keep reading no arm comparison from it.
- **A method lesson for records stands, unmeasured on the full set.** A standing rule rendered whole at the top of the system message beat the split briefing fragment in the earlier replays; the live plain-rule runs show the fragment suffices for the 4B with thinking. Measure the whole-rule rendering on all ten goals before changing the records rendering.
