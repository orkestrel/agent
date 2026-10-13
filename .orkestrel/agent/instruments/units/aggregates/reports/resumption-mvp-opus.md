## Design

Root expanded the source citations to repository-relative paths. The original bench answer is retained at tmp/units/aggregate-mvp-opus-report.md. This is a planning opinion; root's ruling is in plan.md.

The MVP is right, and the existing CLI already gives you all three arms. Nothing new has to be built.

- **Records arm:** the accepted `resource` attempt. It is `arm:'records', copy:1`, run on the 24 development goals (`.orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:231-260`).
- **Aggregate arm:** the `pilot` run. It pairs against that same records attempt through `listMatrixPairFailures`, and it records `exposed` against `served` (`.orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:414-422`). So the pilot's own manifest is your check that both arms start from the same initial plan and that the aggregate was actually exposed.
- **Full-view arm:** the `full` preflight. The run stores `bound.json`, which shows the requested window and the effective ceiling (the smaller of the window and the deployment context) (`.orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:347-356`). That covers the "larger context budget disclosed" requirement.

Grade the retained replies by hand against the `copies/v1.json` rubrics (request, facts, stale, expected, forbidden). Score content and tool compliance separately, and treat g06 the same way the historical review did. If you can, strip the arm labels from the replies before grading. If you can't, say the grading was unblinded.

**Biggest risk:** the aggregate arm needs an accepted `fit.json`. Every earlier fit refused, with between 0 and 5 supported drafts admitted out of about 170 (`RESULTS.md:19-24`). So plan as though calibration will refuse.

## Correctness checks that cannot be skipped

These are the only checks that bear on whether the development result is true:

1. **Unsent attempts after a resource refusal must not be read as wire failures.** This changes how `resource` and `full` are classified, so the fix has to land first.
2. **The source guard must accept the refit metadata.** Without it, refit and the pilot are blocked.
3. **Do not override the pilot's pairing failures or its majority-exposure failure.** If either fires, report the run as a refused pilot together with its raw per-goal replies. Do not call it a treatment result.
4. **Check that the freeze is not stale.** If the queued fixes change anything the freeze manifest hashes, the existing `q2-think0/freeze` is obsolete and needs a successor freeze. I did not check what the manifest hashes.
5. **Keep the raw evidence.** Every request, reply, and usage trace and every manifest hash stays retained. Take cost (requests, duration, tokens) from the traces, not from estimates.

## What to defer now

Some current prerequisites serve adoption, not a truthful development measurement. Defer them:

- **Stale-test fixes:** the synthetic judge routing, the partial-prose expectation, and the archived body missing `shift:false`. They fix test expectations, not behavior on the run's path. The full 423-test emitted suite goes before adoption, not before this run.
- **Out of the MVP:** thinking enabled, the other three models, the eight endurance/sustained files, the blind packet, the `compare.js` report, the judge shadow, held-out copies 2–8, and publication with the desk re-pin.
- **Further admission or capacity diagnostics:** none unless something observed invalidates this comparison.

## Units (the overlap)

1. Sol's fixes land. Luna runs the 21-file MVP gate, scoped to the checks listed earlier. Commit and push the checkpoint.
2. Confirm the freeze identity, or make a successor freeze.
3. `refit freeze`, then `refit generate --live`.
4. Independent labeling of the generation output (human time, not GPU) runs in parallel with `resource --live` and then `full --live`. Model work stays serial.
5. `refit fit`. If the fit separates, run `pilot --live`.
6. Grade by hand and report one per-goal table covering:
   - content quality per arm
   - tool compliance per arm
   - aggregate exposure per goal
   - failures
   - cost per arm

## If calibration refuses

Produce a two-arm, per-goal graded comparison of records against full view, plus the fit's refusal counts. That result is useful on its own: it measures how much room a living summary could gain on this workload. If full view barely beats records, keep that in mind before spending more on admission.

The next decision is one of two, and the user makes it:

- (a) change the admission mechanism and run fresh calibration under the same threshold; or
- (b) a disclosed development-only aggregate arm with admission not qualified. This needs a code change, and its result cannot support adoption.

Do not lower the 50% supported-admission requirement.

## If full view fails operationally

Keep the failure evidence and still grade the remaining arms. Allow one retry only if the failure is transient on the service side (the earlier failure was an HTTP 500 at the clamped window). If it recurs at the effective ceiling, report "full view not reachable at this deployment" as the result. Don't start a capacity investigation.

## Tensions

- **Calibration labels are the long pole.** Plan.md treats calibration as a gate. For a development observation, the record of the refusal is a result in its own right, not a blocker to clear first.
- **Grading is manual.** Without a blind packet, the grading is either partly blinded by hand or disclosed as unblinded.

## Limitations of this plan

- I did not check what the freeze manifest hashes, so whether the existing freeze is still valid is unknown.
- I did not read the 21 files in Luna's MVP gate, so I can't confirm it covers the unsent-attempt classification path.

## Next action for root

Before any live run, confirm that Luna's MVP gate exercises the unsent-attempt classification and the refit source guard. Then start `refit generate` as soon as that gate passes, so the independent labeling overlaps the `resource` and `full` runs.
