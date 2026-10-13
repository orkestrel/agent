# Falsify round port-release-2 — the release after its first round's fixes

## Subject

The branch `port` in `/home/user/agent-port`, tip `6981e2d`, over `f28d222`.

| Round | What it claimed to close |
| --- | --- |
| port-release (2026-10-09), claims `tmp/units/port-release-claims.md`, rulings `tmp/units/port-release-rulings.md` | 1 abort, 2 concurrency, 3 answer pass, 4 budget, 5 recall, 6 briefing, 7 judge failures, 8 thinking replay, 9 tail exchanges, 10 guide, 11 API, 12 coherence; outside findings O1 to O4 |
| fix `c3c654d` | claims 1, 7, 9, 11 and O1, O2, O4 in code |
| fix `6981e2d` | claims 4, 5, 7, 10 and O1, O3 in the guide |

Assume this chain has one more defect than the first round found.

## What the round decides

Whether `@orkestrel/agent` at `6981e2d` is bumped, published, and consumed by the desk.

## Already established

The Orchestrator verified each of the following itself on 2026-10-09 at `6981e2d`:

- `tsc`, `check:src:core`, `lint:check`, and `format:check` exit 0; `test:src:core` passes 1,239 of 1,239; `test:guides` 116 of 116; `test:policy` 119 of 120 with 1 skipped.
- The offline replay of the 8 measured `a5-records` runs (`/home/user/agent-port-gauge/tmp/probes/ledger-replay.test.ts`, at `c3c654d`) passes 108 of 108 with 0 unlisted agent bodies and every judge body twinned or a held second ask.
- The first round's claims 2, 3, and 6 held in both lanes; claims 4 and 8 were ruled overreached and are restated here as 4 and 8.

## Review evidence

- The fixes: `git diff 7f346b5 6981e2d -- src guides tests`, saved as `tmp/units/falsify-port-2.diff`.
- The whole subject: `tmp/units/falsify-port.diff` (`f28d222` to `7f346b5`) plus the fixes.
- `git status --porcelain` at `6981e2d`: empty.

## Claims

Every lane rules on every claim. The objective lane leads on 1 to 8; the subjective lane leads on 9 to 11.

1. **Final-text cancel.** A cancel that fires at any point before the agent loop commits its outcome (a `usage` listener, a `tool` listener, the provider's last delta, the stream's end) commits `partial: true`; a cancel after the commit leaves the committed result unchanged; and no completed result that the caller did not cancel reports partial.
2. **Holds.** A `JudgeError` with code `'QUESTION'` and an error matching `DETERMINISTIC_JUDGE_ERROR` hold their item for the ledger's life; every other failure, including a `JudgeError` with another code, an abort, and a transport error, is asked again on a later request; a hold never applies to an item whose question, state, sources, or model differs.
3. **One exchange splitter.** `collectExchanges` is the only splitter of exchanges in `src/`; compaction, selection, and the ledger tail call it; and no result of the three sends a tool message without its call or a call without its results, for every ordering of user, assistant, call, and tool messages, leading messages included.
4. **Plan bound.** Every briefing and tail the plan builds fits `capacity` less `predict`, times the prompt share, less the gauge's fixed cost and drift, whenever the plan can drop to its floor; and the guide states exactly what the plan does not bound.
5. **Direct run.** Any agent run that `respond` did not start gets a fault selection and asks the judge nothing, and a run `respond` started never gets one from that cause, including a `respond` that follows a faulted direct run.
6. **One mapping and one rank.** `#plan` maps each unit to its record once and ranks each cut with `rankLedgerCut`, and the briefing each request gets is byte-identical to the briefing at `7f346b5` for every conversation.
7. **Renames.** `cutListing` and `LedgerTopic.requested` replace `cutItems` and `requests` everywhere in `src/`, the guide, and the tests, with no alias, and `requested` omitted keeps the behavior `requests` omitted had.
8. **Thinking replay.** Under `'none'` no provider request and no calibration body carries recorded thinking; under `'turn'` and `'all'` the calibration body carries what the next request would carry; and no summary or judge state carries thinking under any policy.
9. **Guide.** Every claim the fix `6981e2d` changed or added is true of `6981e2d` and has an executed assertion that fails when it goes false; no claim was replaced by an unfalsifiable one; and the guide carries no sentence about measured results that a reader cannot check.
10. **API.** The exports the fixes added or renamed are needed by a named consumer, named under `../scaffold/.claude/rules/names.md`, and documented in the shape `../scaffold/.claude/rules/typescript.md` requires.
11. **Coherence.** Would you ship `6981e2d`?

## Unknowns

- The live behavior the U9 series measures. Do not rule on scores.

## Threshold

A finding is worth more than a clean pass: the alternative is the desk or another consumer finding it after publication. Do not hedge toward an imagined consensus. `CONFIRMED` requires naming the attack you tried that failed. A claim you cannot decide is `UNRESOLVED`, with what would settle it.
