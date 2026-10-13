# Unit score-audit-2 — claims for the objective check of the Haiku scoring audit, batches 2 and 3

## Subject

Two blind audit batches of failed replies from a support-desk benchmark, judged by two independent Claude Haiku 5.5 auditors on the `checker` role with a third on any split: batch 2 in `tmp/bench/results/v9/audit/items2.json` with final verdicts in `tmp/bench/results/v9/audit/verdicts2.json`, and batch 3 in `tmp/bench/results/v9/audit/items3.json` with final verdicts in `tmp/bench/results/v9/audit/verdicts3.json`. Each item gives the request, the seed facts it depends on, the scorer's fields, the scorer's failure details, and the reply, under an opaque `id` with no design label. The scorer is `tmp/bench/rescore.mjs`; the scenario is `tmp/bench/scenario.json`, whose seed holds the facts and rules; today in it is Thursday 2026-10-08. The scorer is the strict one: its stale-value exemptions are `not`, `no`, `no longer`, `instead of`, `rather than`, `corrected from`, and a few listed modifiers, so a reply that names a dead value as replaced in other words fails the scorer and is a candidate misread.

The previous round (`tmp/units/score-audit-claims.md`, Astra session `01a11fc0-2370-7072-93fe-96244da6da2c`) checked batch 1, confirmed its standard, ruled one item ambiguous instead of real, and refused a scorer exemption that passed a wrong reply.

## What the round decides

This decides whether the adjudicated pass counts (scorer passes plus audited misreads, ambiguous items as a range) can stand as the comparison between three context designs.

## Already established

The Orchestrator verified each item itself: batch 2 holds 13 items and batch 3 holds 18; every item is a failed row of the runs it came from; the auditors split on no item in batch 2.

## Review evidence

The four files named under Subject, `tmp/bench/rescore.mjs`, and `tmp/bench/scenario.json`. The lane receives no design label and must not read any `key*.json` file in `tmp/bench/results/v9/audit/`.

## Numbered falsifiable claims

1. Every item with verdict `real` fails on at least one point where the reply is wrong, incomplete, contradicts a seed fact or rule, answers another request, or is empty.
2. Every item with verdict `misread` is correct and complete on every point the scorer failed it for.
3. Every item with verdict `ambiguous` is one a careful grader could rule either way, and the reason names both readings.
4. The two batches apply one standard: two replies that make the same error in different words receive the same verdict, in either batch and across them.
5. No `real` verdict rests only on a scorer point where the reply's words satisfy the request; where an item has a scorer-only miss beside a real fault, the real fault is named.

## Unknowns

Whether a seed fact the item's `facts` list leaves out changes a verdict; the lane reads `tmp/bench/scenario.json` for it and reports it under the claim it breaks.

## The threshold

A finding is worth more than a clean pass: the alternative is a comparison between designs that rests on a biased reading.
