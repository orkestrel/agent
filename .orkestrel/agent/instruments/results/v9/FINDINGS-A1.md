# A1 findings from the recorded wires

Each finding cites the run directory under `results/v9` that shows it.

## Failures both designs share

- g06 (Kenji shipping): both designs quote the estimated delivery date in every finished copy (control v1–v6, ledger v1–v3), although seed m6 says "never promise a customer a delivery date in writing". The briefing pins m6 for the Kenji request (a1-ledger-v2-wire request 00075, the first agent call of g06), so the rule is in view and the 2B does not apply it. The `forbiddenPatterns` regex also matches the ship date, which is stricter than the rule; every recorded failure also carries the delivery date, so no grade changes.
- g05 (Luis approval note): the reply omits the approval code. a1-ledger-v1 reasons "$289.00 ... falls below the $200 threshold requiring manager approval", a comparison error by the 2B.

## Briefing faults seen in the roundA prompt (a1-ledger-v2-wire request 00037)

- Noise pinned: m9 (the label printer jam) sits in `## Pinned`.
- Stale value in view: m2 with the dead code MX-4471 is shown next to m29, marked `[amended by m29]`, instead of being replaced.
- The tail replays the held answer and the final answer for g01, so the same answer appears twice.
- `## Not shown` spends lines on topic counts the 2B never acts on.

## Gap under repair

- g04 in a1-ledger-v1 and a1-ledger-v3, and g03 in a1-ledger-v3: the answer run after a repeat stop returns a tool call and no text (replyVia `none`).

## Refined prompt, rendered offline from the a1-ledger-v2 wire

The dry render (`results/v8/refinework/dry-run.mjs`, no daemon) of the Grace escalation request under `--profile refined` shows these changes and faults:

- Fixed: the date line, rules split by sentence under `## Rules`, no tally, no `pin` tool, no replayed answers, and no label-printer pin.
- Distractor kept: m22 and m27 (the Halvorsen ticket ESC-2291 and its correction) sit in `## Pinned` for Grace's request. a1-control-v7 put ESC-2291 into Grace's escalation note, so this value is a live hazard.
- Stale value kept: m2's dead code MX-4471 sentence renders under `## Rules` with `[amended by m29]`.
- Tail residue: the tail keeps the g01 and g02 requests and their tool calls with "result not shown" stubs and no answers.

## a1-ledger-v4 (roundA, 6 of 10)

- g05 answered the wrong request: asked for Luis's refund authorization, the reply is an authorization note for Grace's duvet. The prompt (a1-ledger-v4-wire request 00066) pins every Luis fact, m2, and m29, but its tail ends on the unanswered g03 work: Grace's two lookups with "result not shown" stubs, because g03 ended with no reply. Unfinished earlier work in the tail pulls the 2B back to it.
- Hypothesis for A2: refined drops the answers from the tail but keeps earlier requests and their tool-call stubs, so every earlier request reads as unanswered. Check every A2 reply for one that answers an earlier request.
- g03 ran 6 recalls on "Grace Okafor" with category filters, then gave no reply (roundA has no answer cue).
- g10 dialed 555-0142, the account switchboard, with extension 4127 attached.
- Confirmed offline: the refined dry render of the same request on the copy 4 wire (scratchpad dry-a2v4, body 00052) ends its tail on Grace's request and lookup stubs, then the Halvorsen request, then the Luis request, with no answer between them. Candidate fix if A2 shows wrong-request replies: drop earlier request exchanges from the tail and leave their facts to the briefing.

## Probe: rule placement for the delivery-date rule (results/v9/probes/g06.jsonl)

`probes/probe.mjs` replays the request that wrote each run's g06 answer from a cold daemon, once unchanged and once per change, and scores the reply with the shared scorer. 9 recorded runs: a2-refined-v1, a1-ledger-v1 to v4, a1-control-v1 to v4.

| change | passes | replies quoting the estimate |
|---|---|---|
| none (base) | 0 of 9 | 9 |
| rule appended to the request | 0 of 9 | 9 |
| rule as a last desk note | 0 of 9 | 8 |

- With the rule last, replies acknowledge it and still write the date: "I understand the rule about not promising delivery dates in writing, but I can still provide you with the tracking information and estimated delivery date" (a1-ledger-v4). Placement does not fix g06; the 2B copies a date from the lookup result it quotes.
- Consequence for the design: no briefing or record placement reaches g06. A check on the draft reply against the live rules (the judge asks whether the draft breaks a rule, and the loop returns it once) is the remaining harness lever.
- A cold replay of a mid-run request does not reproduce the recorded reply, because the recorded one followed a warm prompt cache; every probe therefore compares cold against cold.

## a3-refined-v1 (refined with earlier requests out of the tail): 6 of 10

- Fixed: g03 (Grace's escalation) and g06 (Kenji, no date) pass, and no reply answers an earlier request.
- g04, no reply: recall {"topic":"escalations","category":"rule"} repeated identically 6 times past the closed budget (a3-refined-v1-wire 00038 to 00045), because the repeat stop covers lookups only; the cued answer run (00046) advertised no tools and still emitted a recall call, because its history is a row of recall calls. Also recall on "Halvorsen Interiors, LH-80941" matched nothing (a comma-joined topic), and the category filter pointed recall at rules while the ticket sits in facts and corrections. Fixes are built as an uninstalled candidate (results/v9/answerwork) so copies 2 to 8 run on one harness.
- g08 is a scorer misread: "they have plenty of room for another $3,000 order" is a correct yes; the scorer gains the room phrases with their negated forms.
- g07 (Marcus named for the depot release) and g10 (555-0142 dialed with extension 4127) are real misses.

## Probe: can the judge check a draft against a rule (results/v9/probes/judge-rules.jsonl)

Mica, in the harness's question format, read 74 recorded replies against 3 rules, labeled from the reply text.

| rule | replies | breaking | AUC |
|---|---|---|---|
| never promise a delivery date | 26 | 12 | 0.98 |
| copy Priya on every escalation | 22 | 3 | 1.00 |
| approval code on a refund over $200 | 26 | 10 | 0.64 |

- The ranking separates two rules and not the third, and the probabilities are not calibrated across rules: breaking date replies read 0.12 to 0.49, while compliant Priya replies reach 0.51. A shared threshold fails; a draft check needs a threshold fitted per rule, which the short scenario cannot hold out.
- Rewrite probe (results/v9/probes/g06-rewrite.jsonl): each run's own dated g06 reply went back once with "[Desk] This reply breaks the rule: never promise a customer a delivery date in writing. Rewrite the reply so it follows the rule." The rewrite kept a date in 9 of 9 runs. A draft check cannot fix g06 for the 2B, so the branch closes: no draft-check arm.

## Frozen refined series (a4-refined-v1 to v8) against the full view, strict scorer

| copy | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | mean |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| refined | 7 | 7 | 6 | 7 | 7 | 5 | 6 | 7 | 6.5 |
| full view | 5 | 6 | 5 | 8 | 5 | 5 | 7 | 7 | 6.0 |

mean d 0.50, sd 1.20, lower bound -0.35 (`tools/band.ts a4-refined a1-control`): no fix clears; the trim bound clears. Per goal, refined against the full view: g03 7 to 1, g05 7 to 1, g08 0 to 8, g10 1 to 3.

## Probe: why the briefing loses the credit check (results/v9/probes/credit.jsonl)

`probes/credit-probe.ts` replays the request that wrote each failed frozen g08 answer from a cold daemon, once per change, over the 7 failed copies.

| change | passes of 7 |
| --- | --- |
| none | 1 |
| lookup handle stripped | 1 |
| `## Rules` removed | 3 |
| `## Pinned` removed | 5 |
| briefing removed (base system plus the date line) | 6 |

- The pinned Halvorsen story (m22's late $1,240 order, m27, m24, and the depot lookup r12, a4-refined-v5-wire request 00071) pulls the 2B into summarizing the account instead of comparing $3,000 with $5,000 minus $1,240. The handle prefix is not the cause.
- The full view's own request passed cold on copy 1 and failed cold on copy 3, which passed live: cold replays carry the prompt-cache path difference, so the counts read as direction.
- Consequence: topic-scoped pinning brings an account's whole story to a narrow question. The records arm carries the same sentences in its Halvorsen record, so it is expected to keep this loss. Candidate fix for the attack: a relevance filter on pinned units for the request.

## Probe: can the judge pick the pinned facts a request needs (results/v9/probes/relevance.jsonl)

`probes/judge-relevance.ts` asked Mica, in the harness's question format, whether each pinned message of each goal's first agent request on a4-refined-v5 helps answer it (27 units, 86.7 s).

- The readings track need where the request is narrow: g04 keeps m22 (0.98) and m27 (0.97) and drops m24 (0.08); g09 keeps m11 (0.93); g10 keeps m24 (0.99); g08 drops every pinned message (m22 0.01, m27 0.40, m24 0.04), which is the condition that restored the credit verdict in 5 of 7 cold replays.
- g07 reads mixed (m24 0.97, m27 0.86, m22 0.57) although the depot release needs none of them.
- AUC against the scenario's `facts` labels is 0.73, but those labels mark context, not need (g08 lists m22, whose credit facts the lookup carries); the readings, not the AUC, are the evidence.
- Not probed: lookup-result lines, because the probe's line pattern stops at the first colon inside `{"id":…}`.
- Next arm after the records series: a relevance filter that keeps a pinned unit only when the judge reads it as needed, one question per pinned unit per request.
