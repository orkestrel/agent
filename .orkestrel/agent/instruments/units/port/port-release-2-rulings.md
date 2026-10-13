# Rulings — falsify round port-release-2 (2026-10-09)

Lanes: objective, GPT-6 Astra (`tmp/codex/falsify2-astra-last.md`); subjective, the reviewer on Opus 5.5 (`tmp/units/falsify2-opus-verdict.md`). Claims: `tmp/units/port-release-2-claims.md`.

| Claim or finding | Ruling |
| --- | --- |
| 1 Final-text cancel | Holds in both lanes. A budget that trips on the final turn's usage counts as a cancel, as the guide's run-bound contract states. |
| 2 Holds | Fix (Astra): the classifier keeps a set of held fingerprints for its life, each covering the question, state, sources, and judge model, so an alternating model never forgets an earlier hold. |
| 3, O4 Call pairing | Fix (both): pair each call with the tool message whose `call` equals the call's id in the tail, the lookup reader, and the tail stub; fall back to position only when no tool message of the group carries an id, as `collectToolGroups` does. |
| 4 Plan bound | Fix in code (Astra): price the stub each lookup renders with in the final prompt, so a plan that fits stays fit. Fix in the guide (Opus): the budget bounds the briefing and the tail of the first call; the request, lookup results, the pass's own turns, the answer note, and the fault view enter unbounded. |
| 5 Direct run | Fix in code: the selection handler faults unless a `respond` call is active and the run's request is that call's request or one of the ledger's own notes; calibration never admits a run. The guide states that a run whose newest message is not a user message gets no selection and builds from the whole view. |
| 6 Byte identity | Overreached: the exchange fix changes tail decisions on purpose for a seed that opens with a non-user message or interleaves a call group. The identity holds for seeds that open with a user message and interleave no call group, which the replay confirms. |
| 7 Renames | Holds. |
| 8 Thinking replay | Fix: calibration applies the replay policy as the next request will, with a user message after the seed. |
| 9a to 9e Guide | Fix (Opus) as the subjective verdict's "right" states each. |
| 10a `rankLedgerCut` group | Fix: the group is a named literal union in `ledgers/types.ts`, and the helper's contract owns the order the tie-break reads. |
| 10b `cutListing` wording | Fix: "entries" in the TSDoc and the guide row. |
| O1 `LedgerLine` wording | Fix in `types.ts`, `helpers.ts`, and the guide row. |
| O2 Exchange definition | Fix in the guide at the compaction sections. |
| O3 Direct-run error | Fix: a `LedgerError` with a code `LedgerErrorCode` names and the guide documents. |
| A1 `requested` | Advisory; recorded, no change. |
