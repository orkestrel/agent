# Unit score-audit — claims for the objective check of the Haiku scoring audit

## Subject

A blind audit of every failed reply from two context designs in a support-desk benchmark. The items are in `tmp/bench/results/v9/audit/items.json`: each gives the request, the seed facts it depends on, the scorer's fields, the scorer's failure details, and the reply, with an opaque `id` and no design label. Two independent auditors on Claude Haiku 5.5 judged each item; a third ruled on the one item they split. Their final verdicts are in `tmp/bench/results/v9/audit/verdicts.json` (`final[]`: `id`, `verdict` real, misread, or ambiguous, `points`, `reason`, `rule`). The scorer is `tmp/bench/rescore.mjs` (`compileRules`, `plainText`, `scoreText`); the scenario is `tmp/bench/scenario.json`, whose seed holds the facts and rules, and today in it is Thursday 2026-10-08.

## What the round decides

This decides whether the scorer misreads replies from either design, and so whether pass counts can stand as the comparison between the designs, and whether the one proposed rule change is applied.

## Already established

The Orchestrator verified each item itself: the 56 items cover every failed row of the runs they came from; the two auditors agreed on 55 items; the final verdicts are 55 real and 1 misread.

## Review evidence

`tmp/bench/results/v9/audit/items.json`, `tmp/bench/results/v9/audit/verdicts.json`, `tmp/bench/rescore.mjs`, and `tmp/bench/scenario.json`. The lane receives no design label and must not infer one.

## Numbered falsifiable claims

1. Every item with verdict `real` fails on at least one point where the reply is wrong, incomplete, contradicts a seed fact or rule, answers another request, or is empty; no `real` item is correct and complete on every point the scorer failed it for.
2. The item with verdict `misread` is correct and complete on every point the scorer failed it for.
3. The rule change proposed for that item (adding `rotated(?: early)? from` beside `corrected from` before MX-4471 in the g05 pattern) passes that reply and passes no reply that uses MX-4471 as the current approval code.
4. No `real` verdict rests on a scorer point alone where the reply's text satisfies the request in words the scorer's lists lack; where an item has a scorer-only miss beside a real fault, the real fault is named.
5. The verdicts apply one standard to every item: two replies that make the same error in different words receive the same verdict.

## Unknowns

Whether a seed fact the item's `facts` list leaves out changes a verdict; the lane reads `tmp/bench/scenario.json` for it and reports it under the claim it breaks.

## The threshold

A finding is worth more than a clean pass: the alternative is a comparison between designs that rests on a biased scorer.
