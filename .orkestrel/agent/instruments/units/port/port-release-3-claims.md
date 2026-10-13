# Falsify round port-release-3 — the second round's fixes

## Subject

The branch `port` in `/home/user/agent-port`, tip `c5dbac9`, over `6981e2d`: the fixes `33a5e67` (code) and `c5dbac9` (guide and one constant's TSDoc). The chain:

| Round | Closed |
| --- | --- |
| port-release (`tmp/units/port-release-rulings.md`) | fixes `c3c654d`, `6981e2d` |
| port-release-2 (`tmp/units/port-release-2-rulings.md`) | fixes `33a5e67`, `c5dbac9` |

Assume this chain has one more defect.

## What the round decides

Whether `@orkestrel/agent` at `c5dbac9` is bumped, published, and consumed by the desk.

## Already established

The Orchestrator verified each of the following itself on 2026-10-09 at `c5dbac9`: `tsc` exits 0; `test:src:core` passes 1,247 of 1,247, `test:guides` 118 of 118, `test:policy` 119 of 120 with 1 skipped; `lint:check` and `format:check` exit 0. The offline replay of the 8 measured `a5-records` runs passes 108 of 108 at `33a5e67` with 0 unlisted bodies. The claims that held in round 2 (1 final-text cancel, 7 renames) and in round 1 (2 concurrency, 3 answer pass, 6 briefing) stand; round 2's claim 6 is restated as below.

## Review evidence

The diff `tmp/units/falsify-port-3.diff` (`git diff 6981e2d c5dbac9 -- src guides tests`); `git status --porcelain` at `c5dbac9`: empty.

## Claims

Every lane rules on every claim. The objective lane leads on 1 to 6; the subjective lane leads on 7 and 8.

1. **Pairing.** In the ledger tail, the lookup reader, and the tail stub, every call is paired with the tool message whose `call` equals its id whenever any tool message of its group carries an id, and by position only when none does; no prompt the ledger sends holds a call without its result or a result without its call, for every order of results and every mix of registered and unregistered tools.
2. **Holds.** The classifier asks a held fingerprint (question, state, sources, model) never again for its life, asks every other fingerprint as before, and holds nothing on a failure outside the two named kinds.
3. **Stub pricing.** Whenever the plan accepts a tail, the tail's final rendered estimate, stubs included, fits the tail share of the budget.
4. **Ownership.** A run gets a planned selection only when a `respond` call is active and the run's request is that call's request or one of the ledger's notes; every other run that reaches selection gets `LedgerError` code `'REQUEST'`, asks the judge nothing, and leaves the active request's selection, boundary, and gauge readings unchanged.
5. **Calibration replay.** Under every replay policy, the calibration body carries exactly the thinking the first request after it would carry for the same seed.
6. **Byte identity, restated.** For a seed that opens with a user message, pairs each result with its call in order, and carries no thinking, every request at `c5dbac9` is byte-identical to the request at `7f346b5`.
7. **Guide.** Every claim `c5dbac9` changed or added is true of the code and has an executed assertion that fails when it goes false; the direct-run and no-retirement assertions distinguish the mutations round 2 named; no measured-result sentence remains that a reader cannot check.
8. **Coherence.** Would you ship `c5dbac9`?

## Threshold

A finding is worth more than a clean pass. Do not hedge toward an imagined consensus. `CONFIRMED` requires naming the attack you tried that failed. A claim you cannot decide is `UNRESOLVED`, with what would settle it.
