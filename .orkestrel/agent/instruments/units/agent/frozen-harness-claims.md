# Unit frozen-harness — claims for the objective audit of the frozen briefing harness

## Subject

The briefing-ledger benchmark harness `tmp/bench3/bench.mjs` in the agent checkout (sha256 `3d75138e241ae8a9…`, installed 2026-10-09 07:24Z and frozen for the live series `tmp/bench/results/v9/a4-refined-v1` to `-v8`), and the scorer it shares with the full-view harness `tmp/bench/bench.mjs`. The chain:

| Round | Change | Written by | Reviewed by |
| --- | --- | --- | --- |
| tail | `--tail-requests keep\|drop` (refined drop), and text beside a call no longer survives `--tail-answers drop` | Claude Opus 5.5 | Claude Opus 5.5 (objective lane, while the Astra bench was live and unprobed) |
| answer | `--repeat-stop lookups\|all`, `--answer-view raw\|collapsed`, `--recall-split off\|on`, `--recall-category on\|off` (refined takes the second value of each) | Claude Opus 5.5 | Claude Opus 5.5 |
| scorer | negation words before stale values; credit-check fit phrases ("plenty of room", "enough room", "can easily", "can comfortably", "can still") and the `no … room` pattern | Claude Opus 5.5 and the Orchestrator | Claude Opus 5.5 |

No lane of this round was written by GPT-6 Astra.

## What the round decides

This decides whether the frozen series measures the refined briefing faithfully, so its comparison with the full view (`tmp/bench/results/v9/a1-control-v1` to `-v8`) can stand, and whether any scorer change favors one design.

## Already established

The Orchestrator verified each item itself:

- Under `--profile roundA` the frozen harness replays the recorded roundA wires `tmp/bench/results/v8/ledger-wire` and `tmp/bench/results/v9/a1-ledger-v1-wire` to `-v4-wire` with every request body identical (122, 126, 121, 134, and 128 bodies).
- `node --import tmp/bench/results/v8/refinework/no-net.mjs tmp/bench3/bench.mjs --check-ledger` exits 0 under `--profile refined` and under `--profile roundA` on the frozen file.
- Rescoring with the edited scenario changed exactly three rows, all briefing rows: `a2-refined-v1` g04, `a3-refined-v1` g08, and `a4-refined-v2` g08, each fail to pass; no full-view row changed.

## Review evidence

The agent checkout's `tmp/` is gitignored, so the diffs are file diffs:

- `tmp/units/frozen-harness-tail.diff`: `tmp/bench3/bench.mjs.pre-tail` against `tmp/bench3/bench.mjs.pre-answer`.
- `tmp/units/frozen-harness-answer.diff`: `tmp/bench3/bench.mjs.pre-answer` against the frozen `tmp/bench3/bench.mjs`.
- `tmp/units/frozen-harness-scoring.md`: every scoring field that differs between `tmp/bench/scenario.json.pre-negation` and `tmp/bench/scenario.json`.
- The scorer: `tmp/bench/rescore.mjs` (`compileRules`, `plainText`, `scoreText`, `clean`); the rescore: `tmp/bench/results/v9/rescored/rescore-runs.mjs`; the copy check: `tmp/bench/variants/check.mjs`.
- Recorded live wires of the frozen harness: `tmp/bench/results/v9/a4-refined-v1-wire` to `-v6-wire` (`NNNNN_api_chat-request.json` and `-response.json`), with rows in `tmp/bench/results/v9/a4-refined-vN/ledger.jsonl`.

## Numbered falsifiable claims

1. Under `--profile roundA` every request body, judge body, and row the frozen harness produces equals the body the pre-tail harness produced for the same recorded replies; no new flag reaches a roundA body.
2. Under `--profile refined`, no message from an earlier goal run (its request, an assistant message, a tool call, a tool result, a desk note, the answer cue, a repeat notice, or an answer) appears in the tail of a later goal's request, by any path.
3. Under `--profile refined`, the first repeat of an identical call of any tool, `recall` included, ends the run with reason `repeat` and sends the goal to its answer run; two calls that differ in any argument other than a `recall` category never trigger it.
4. Under `--profile refined`, the answer run advertises no tools; its messages hold no assistant tool-call message and no tool message of the current request; its desk note carries each distinct successful result text of the request with no line of the form `rN NAME {ARGUMENTS}:`; and the answer cue is its last message.
5. Under `--profile refined`, every way a goal's tool loop ends (a repeat stop, the turn limit, a closed recall budget, a final message) leads either to a reply or to the answer run; a goal ends with no reply only when the answer run writes no text.
6. Under `--recall-split on`, a recall topic joined by commas, semicolons, " and ", or "/" returns the union of its parts' results in store order with each item once, and the call fails only when every part matches nothing.
7. The recall budget counts the `recall` calls of one request and starts again at zero for the next request.
8. Under `--recall-category off`, the advertised recall schema has no `category` property, and a call that sends one returns what the call without it returns.
9. No scorer edit turns a reply that uses a stale value as current (ESC-2291 for the Halvorsen ticket, MX-4471 as the approval code, 245.65 or 43.35 as Luis's refund) into a pass, and no edit lets a reply that says the $3,000 order does not fit pass the credit check.
10. Every scenario and variant copy (`tmp/bench/scenario.json`, `tmp/bench3/scenario.json`, `tmp/bench/variants/v1.json` to `v8.json`, `tmp/bench/variants/ledger/v1.json` to `v8.json`) carries identical scoring fields for every goal.
11. `rescore-runs.mjs` recomputes each row's `success` exactly as the harness computes it at run time, given the same scenario, so a rescored row and a fresh run's row agree.

## Unknowns

- Whether a live refined run has hit a path the fixtures do not cover. The lane reads the a4 wires for one and reports it under the claim it breaks.
- Whether the lane's read-only sandbox lets `node` run the offline checks. If it cannot, the lane reasons from the code and the recorded wires and says so per claim.

## The threshold

A finding is worth more than a clean pass: the alternative is a measurement that rests on a defect and a verdict the user acts on.
