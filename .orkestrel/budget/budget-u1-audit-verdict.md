# Budget U1 and the budget sweep: falsify verdict (2026-10-17)

## Subject and lanes

- **Subject.** Budget's uncommitted chain on `edd3553`: unit U1 (the meter surface and the typed exhaustion reason) and
  the budget test sweep. Claims are in `tmp/units/budget-u1-claims.md`; the diff is `tmp/units/budget-u1-diff.patch`.
- **Objective lane.** GPT-6 Astra high, T3 task `budget-u1-falsify-objective-astra-1`, verdict
  `tmp/units/budget-u1-verdict-objective-1.md`: `FAIL 3, 5, 6, 7, 9; outside the claims: O1`.
- **Subjective lane.** Claude Opus 5.5 high, workflow `wf_94c286f3-7d9`, verdict
  `tmp/units/budget-u1-verdict-subjective-1.md`: `FAIL 1, 6, 9; outside the claims: O1, O2, O3, O4`.
- **Reproduction.** The Orchestrator reproduced the meter re-entry on the built package: `max: 1`, an abort listener
  that charges `'b'`, then `charge('a')`, ends with consumed 3 and charged 1, where serial charging gives 2 and 2.
  It also read the depth cap in the sweep's `locateManifest` (`tests/distribution.test.ts:87`, `:353`), which
  returns `undefined` at depth 64 where HEAD walked on.

## Per-claim rulings

| Claim | Objective | Subjective | Ruling |
| --- | --- | --- | --- |
| 1. Typed exhaustion | CONFIRMED | BROKEN (cross-copy guard) | **CONFIRMED in this package; the cross-copy hazard is bounded.** The subjective lane showed that a reason built by the `require` entry fails the `import` entry's `isBudgetError`. Design 2's reconciliation already ruled on the two-copy case (`budget-meter-design-2.md:1075`, C4) and kept `isInstance`, because every fleet error guard narrows that way and the wave re-pins every consumer to one copy. The ESM/CJS dual-package case is the same fleet-wide hazard. It is recorded below as a fleet finding and is not fixed in budget alone. |
| 2. Parent reasons | CONFIRMED | CONFIRMED | **CONFIRMED.** |
| 3. Meter atomicity | BROKEN (re-entry) | CONFIRMED (claim wording), O2 BROKEN | **BROKEN: re-entry.** A synchronous re-entry through an abort listener or the producer measures its growth from a `charged` that the outer charge has not yet committed, then the outer write regresses it. The subjective proof gap stands: no case shows that a refused estimate's delta stays counted. |
| 4. Hostile input | CONFIRMED | CONFIRMED | **CONFIRMED.** |
| 5. Existing behaviour | UNRESOLVED (fleet completeness) | CONFIRMED | **CONFIRMED with the survey's additions** (`tmp/units/budget-fleet-survey-grok-1.md`, Grok; both positive controls found). The survey adds four sinks § 1.4 does not name. `queue/src/core/Queue.ts:311` changes only the message of a private queue's `QueueError`, because workflow's `Runner` keeps the raw reason as the run failure (`Runner.ts:219-221`, `:410`); no consumer sees it. `budget/tests/src/core/Meter.test.ts:360` and `budget/tests/guides.test.ts:313` are U1's own new assertions. `agent-phase/src/core/agents/Agent.ts:321` mirrors Agent's partial-run payload row and changes with it, because agent-phase follows Agent's tree. These go into the release wave's consumer list, not into U1's code. |
| 6. Instruments | BROKEN (sweep depth cap) | BROKEN (M3 and D1 record) | **BROKEN, both.** The lanes answered different questions. (a) The sweep's depth cap of 64 changes the classifier's answer for deep paths. (b) On Node 24.22.0, `AbortSignal.any` propagates eagerly, so M3 is an equivalent mutant of the shipped guard. D1's "first source in array order" note and its Agent consequence are false on this host. |
| 7. Surface and guide | BROKEN (pairing, guide contract) | CONFIRMED against the law, O1 and O3 BROKEN | **Pairing dropped on the record.** `documentation.md:38` pairs only a titled `@example` with a guide fence. The claim asked for more than the law. The guide's meter contract is false until claim 3 is fixed. O1 (the authoritative `types.ts` lacks the reason contract) and O3 (the Tests-list pin sentence is false) are confirmed. |
| 8. Bindings | CONFIRMED | CONFIRMED | **CONFIRMED.** |
| 9. Coherent | BROKEN | BROKEN | **BROKEN** until the fix lands. |
| Objective O1 / subjective O4 | BROKEN | BROKEN | **Confirmed.** `createReadingProxy` returns only `new ReadingProxy(target)`; `architecture.md` § Wrapper test deletes such a factory. |

## Findings carried into the fix unit

1. **Re-entry.** Claim `#charged = estimate` before invoking the producer and `consume`. On a throw, restore it
   exactly: to the previous value when `#charged` still equals that estimate, and otherwise, when a nested charge
   advanced it, lower it by the refused delta. Restate the `Meter` remarks, `MeterInterface.charged`'s TSDoc and guide
   Contract 14. Prove the abort-listener and producer re-entry paths reach the serial result, prove every throw path
   restores, and prove the nested-throw case. Also prove that a refused estimate's delta stays counted.
2. **Depth cap.** Bound `locateManifest` by the normalized path's own ancestry, so it terminates where HEAD did: the
   nearest manifest, the installed root, or the filesystem root. Probe a fixture deeper than 64 directories and match
   HEAD's answer.
3. **Wrapper.** Delete `createReadingProxy`. Construct `ReadingProxy` at its call sites and move its proof onto the
   class.
4. **Contract.** State the reason contract in `BudgetInterface`'s `signal`, `start` and `consume` TSDoc
   (`src/core/types.ts`), and add `isBudget`'s remark that the guard cannot verify the reason.
5. **Tests pin.** Assert each of the three titled pairs on both sides in `tests/guides.test.ts`, so that untitling
   any one reddens.
6. **Record.** Re-run M3 on this host and label the Node version. Restate D1 as a Node 24.21.0 observation, keep the
   composite-signal guard as defensive, and make the guide's Contract 8 sentence and the test comment true on 24.22.0.

## Fix rounds

- **Fix 2.** It closed items 1–6 and the gates were green. Astra's re-audit (`tmp/units/budget-fix-2-review-astra-1.md`)
  returned `FAIL 1, 3, 4`, with claims 2 and 5 confirmed.
  - Claim 1: the claim-and-restore re-entry fix still loses accepted growth when nested refusals meet floating-point
    rounding. Estimates `1`, `1e16`, `1e16 + 2` leave the budget at 2 and `charged` at 1.
  - Claim 3: the recursive `locateManifest` overflows the stack on a 12,000-segment lexical target.
  - Claim 4: Contract 14 promises the disproved equality.
- **Fix 3 adopts the re-audit's prescription verbatim** (`tmp/units/budget-fix-3-brief.md`).
  - The meter keeps `#accepted`, the sum of the growth the budget accepted, apart from a readonly registry of per-call
    claim records. A charge measures its growth from `#accepted` plus the pending claims.
  - `charged` returns `#accepted`, which equals a single-meter budget's `consumed` exactly. Nothing is reconstructed by
    subtraction.
  - The manifest walk derives its ancestor candidates from separator positions, with no recursion.
  - Because the fix is verbatim, it closes with mutation probes.

- **Fix 3 landed** (`tmp/units/budget-fix-3-report.md`; gate `GATE: PASS`).
  - Counterexamples (a) and (b) were red under the old implementation and are green now.
  - The mutations "subtract on refusal" and "raise `#accepted` before `consume` returns" redden 5 and 12 named cases.
  - The walk matches HEAD on a 12,000-segment target and on ten layouts.
  - **Bounded residual.** An abort listener that charges the meter during the crossing, with fractional growths, can
    leave `charged` one ulp from `consumed`. The budget commits the outer growth before it fires its listeners, so the
    two sums add in a different order (1200 of 20000 fuzz seeds). Integer growths are exact, which covers Agent's token
    estimates. Contract 14 states the boundary.
- **Accepted** as budget commit `4d74195`. The `M3` row and the D1 note in `tmp/units/budget-u1-report.md` are Node
  24.21.0 observations, and D1's "Agent consequence (U3)" note is struck. On 24.22.0, `AbortSignal.any` propagates
  eagerly.

## Bounds

- Do not change `isBudgetError` or narrow on `code`. The cross-copy hazard is fleet-wide (design 2 C4). The
  lookalike-refusal case M16 stays.
- Never add a re-entry flag, a slot or a refusal, because a flag is a call slot under the rule draft. Never advance
  `charged` after a failed charge.
- Leave `createBudget`'s pass-through alone; the first design recorded it as a separate fleet finding.
- Leave `vite.config.ts` alone: scaffold content-owns it.

## Fleet findings (not budget's to fix)

- Every fleet guard that narrows an error by `isInstance` misses an instance built by a second copy, whether that is
  another version or the other module format. Consider a scaffold `patterns.md` ruling for cross-copy error guards.

## What is not broken

- Hostile-input containment.
- Parent-reason preservation under every ordering on 24.22.0.
- `Budget` re-entrancy during abort dispatch.
- The fixed message.
- `isBudget` refusing a transparent proxy.
- The sweep's `checkProject`, `buildStage`, distribution and `ReadingProxy` rewrites, which keep every assertion's
  meaning.
- The fleet sinks both lanes checked.

## Engines

- Astra found the re-entry and the depth cap, but prescribed a refusal that the rule bans.
- Opus found the dual-package guard gap, the host-dependent mutant, the types contract and the false pin sentence.
  Its re-entry prescription is the one adopted.

## SB-budget: the recorder and hole sweep (2026-10-18)

T3 `sb-budget-sonnet-1`, brief `tmp/units/study-budget-sweep-brief.md`. The baseline is `edd3553`.

- **Class A, count-only recorders.** Six sites were converted to whole-history `BudgetError` payload assertions:
  - `tests/src/core/Budget.test.ts:158` and `:247`;
  - `tests/src/core/factories.test.ts:27`;
  - `tests/src/core/Meter.test.ts:577`;
  - `tests/guides.test.ts:173` and `:201`.

  The `depths` fixture-logic counter (`Meter.test.ts:473`) is now the entity `CallCounter` (`tests/setup.ts:114`),
  with proofs at `tests/setup.test.ts:112`. Under mutation M1 (`consumed + 1` in `Budget#exhaust`) the old assertions
  pass and the new ones fail.
- **Class B, holes and catch boundaries.** No mismatch. The run drove `Budget.consume`, `start` and `clear` through
  30 000 seeded sequences against the staged baseline, normalizing only the approved `BudgetError` reason, and ran 198
  `ReadingProxy` cases. Three probe controls each diverged. `src/**` is byte-identical to `4d74195`, so the budget
  tarball `39343e7e9395` stays valid and no restage is owed.
- **Gates.** src:core 255, policy 119, config 229, setup 17, guides 33 and distribution 9. Format, lint, check and
  build are clean.
- **Closing.** The fixes adopt the ruling's lawful form and are mutation-proved, so they close by probe. An independent
  Haiku checker runs before the commit.
