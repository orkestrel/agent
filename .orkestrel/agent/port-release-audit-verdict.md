# Audit verdict: @orkestrel/agent release, port-release rounds 1 to 3 (2026-10-09)

The subject is the branch `port` of `orkestrel/agent` from `f28d222` (the last integrated round) to `8f5098b`: selection and compaction exchanges, the selection briefing, the ledger module, recorded thinking and the replay policy, and the replay-fidelity fixes. It decides whether the package is bumped, published, and consumed by the desk.

## Lanes

Every round ran two blind lanes on one claims file: the objective lane on GPT-6 Astra (`analyst`, read-only `codex exec`) and the subjective lane on the Opus 5.5 `reviewer`. The Orchestrator reconciled each round into rulings and dispatched the fixes.

| Round | Claims | Rulings | Fixes |
| --- | --- | --- | --- |
| 1 | `port-release-claims.md`, 12 claims | `port-release-rulings.md` | `c3c654d` (code), `6981e2d` (guide) |
| 2 | `port-release-2-claims.md`, 11 claims | `port-release-2-rulings.md` | `33a5e67` (code), `c5dbac9` (guide) |
| 3 | `port-release-3-claims.md`, 8 claims | the lanes' prescriptions, applied verbatim | `8f5098b` |

The claim and ruling files sit in `instruments/units/port/`.

## Per-claim outcome

- **Held in every round.** Concurrency, the answer pass (no tools, thinking off), the briefing (no stale sentence, no handle), the renames, and the stub pricing after its fix.
- **Fixed in code.**
  - A cancel before the final commit reports partial.
  - Refused questions and the logprob failure hold their item, per fingerprint, the judge model included.
  - One exchange splitter serves compaction, selection, and the ledger tail.
  - Calls pair with results by call id, by position for an idless group or a repeated id, and a call with no result leaves the tail.
  - A run that no `respond` call owns faults with `LedgerError` code `'REQUEST'`.
  - Calibration replays thinking at the next user boundary.
  - The tail is priced with the longer stub.
  - The plan's mapping and cut rank have one home each.
- **Restated as overreach.**
  - The budget bound covers the briefing and the tail of a request's first call, and the guide lists what enters unbounded.
  - Calibration prices the whole view, while the request carries only its tail.
  - Byte identity holds for seeds that open with a user message, pair results in order, and price no stub differently.
- **Documented limits.** The ledger refuses no over-window prompt. A run started during a `respond` call shares that call's gauge readings and repeat stop. Only the seed forms the tail. Records don't retire.

## Closing proof

The third round's fixes adopted the lanes' prescriptions verbatim, so a mutation probe closed the chain: each change's mutation fails its test, and each restored test passes. At `8f5098b` the following hold:

- `tsc` and `check:src:core` exit 0;
- `test:src:core` passes 1,250 of 1,250, `test:guides` 120 of 120, and `test:policy` 119 of 120 with 1 skipped;
- `lint:check` and `format:check` exit 0;
- the offline replay of the 8 measured `a5-records` runs passes 108 of 108 with 0 unlisted bodies.

## Not run

No fourth round ran: the third round's findings were edge cases whose fixes followed the prescriptions verbatim, which the falsify skill closes with a mutation probe. The live behavior rests on the U9 series.
