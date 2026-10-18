# Study Bindings sweep chain through fix 4: falsify verdict (2026-10-18)

This verdict supersedes `.orkestrel/agent/let-sweep-study-2-audit-verdict.md`, whose findings fix 4 closed.

## Subject and lanes

- **Subject.** Study's chain from `ca81174` to the working tree: rounds 1–2, fix 3, checkpoint `42fe9ac`, and fix 4.
  Claims: `tmp/units/study-fix-4-claims.md`. Diff: `tmp/units/study-fix-4-chain.patch`.
- **Objective lane.** GPT-6 Astra high.
  - Attempt 1 (`study-fix-4-falsify-objective-astra-1`) was refused by "Selected model is at capacity". The bench was
    re-probed live.
  - Attempt 2 (`study-fix-4-falsify-objective-astra-2`) returned `tmp/units/study-fix-4-verdict-objective-1.md`:
    `FAIL 1, 4, 5, 6, 7, 8, 9`.
  - The lane disclosed that a search surfaced an excerpt of the other lane's claim-8 finding before it finished claim
    8, so its claim 8 is not blind.
- **Subjective lane.** Claude Opus 5.5 high, workflow `wf_fe735657-fe7`, verdict
  `tmp/units/study-fix-4-verdict-subjective-1.md`: `FAIL 5, 8, 9; outside the claims: O1`.
- **Reproduction.** The Orchestrator read three findings in the source.
  - The flush registration order: `src/server/agents/StudyAgentTrace.ts:72` invokes the sink before `:73` registers the
    flush.
  - The sparse-token `flatMap` at `src/server/commands/parsers.ts:52`.
  - The missing `readonly` on six registry fields: `StudyMeter#pending`, `StudyScope#pending`, `StudyChannel#pending`,
    `StudyRemoteMeter#tickets` and `#pending`, and `StudyWorker#evidence`.

## Per-claim rulings

| Claim | Objective | Subjective | Ruling |
| --- | --- | --- | --- |
| 1. Behaviour | BROKEN | CONFIRMED | **BROKEN.** A sink that synchronously re-enters `trace.flush` is admitted and duplicates evidence, where `ca81174` refused it with `CONFIG`. A sparse command-token array also passes the missing-flag refusal. The subjective lane attacked error order and fixture outcomes, not re-entry or holes, so the lanes answered different questions. |
| 2. Bound goals | CONFIRMED | CONFIRMED | **CONFIRMED.** |
| 3. Write ordering | CONFIRMED | CONFIRMED | **CONFIRMED.** |
| 4. Fixtures | BROKEN | CONFIRMED | **BROKEN.** The MCP fixture reads its caller's `outcomes` array live instead of a creation-time copy, and the observation fixtures now return snapshots where consumers held live views. The subjective lane searched for a consumer that captures a member and found none in Study's tests. The fixture contract still changed, and the objective probe shows it. |
| 5. Surface | BROKEN | BROKEN | **BROKEN on the record only.** The chain also added eight barrelled exports and made five `StudyOllamaWire` members `readonly`: `resolveStudyAgentContent`, `readStudyAgentResult`, `readArtifactBytes`, `iterateArtifactEntries`, `ArtifactTally`, `collectStudyAncestors`, `readStudyHandle`, `scanStudyTree`, and `StudyOllamaWire.{bytes,text,terminal,timing,settled}`. All are lawful (`architecture.md` § Barrel exports; `let-sweep-brief-2.md`). The acceptance commit names them. |
| 6. Proofs | UNRESOLVED | CONFIRMED | **Narrowed to the independently verified proofs.** Both lanes reproduced the timing-extractor count, the D4 and mid-launch exits, the write ordering and the failure latch. The fix-5 report adds its own mutation inventory. |
| 7. Bindings | BROKEN | CONFIRMED | **BROKEN.** Six operation registries lack the `readonly` binding that the landed **Registries** and **Immutability exceptions** bullets require. The flush order in claim 1 is a registration-after-entry defect. |
| 8. Agent compatibility | BROKEN | BROKEN | **Ordering, confirmed.** This build lacks naming Unit A, so a restage carrying Agent's Unit B must wait for Unit A. That is already the plan's order (`agent-round-2-plan.md` § 4, before wave 3). The two `clear()` calls remain the consumer edits. |
| 9. Coherence | BROKEN | BROKEN | **BROKEN** until fix 5 lands. |
| O1 (subjective) | | BROKEN | **Confirmed.** The rewritten CommonJS peer in `tests/src/server/processes/StudyChannel.test.ts:146-151` adds one `process` `message` listener per goal frame, and Node warns `MaxListenersExceededWarning`. |

## Findings carried into fix 5

1. **Flush re-entry.** Register the flush in `#flushes` before invoking the sink, and remove it on every settle path.
   Add the synchronous-reentry regression beside the pending-flush test.
2. **Sparse tokens.** Iterate argument positions through `entries()` in `parseStudyArguments`, and keep the
   undefined-flag refusal. Add the sparse-array case.
3. **MCP outcomes.** Snapshot the caller's `outcomes` at fixture creation, and index that snapshot through the
   recorder. Add the caller-mutation case.
4. **Live observation views.** Restore the live observation contract of the observer, sink and protocol fixtures
   through an owning fixture entity, with retained-reference coverage.
5. **Registries.** Add `readonly` to `StudyMeter#pending`, `StudyScope#pending`, `StudyChannel#pending`,
   `StudyRemoteMeter#tickets` and `#pending`, and `StudyWorker#evidence`, without changing their membership lifecycle.
6. **O1.** Give the peer one release listener that resolves one release promise, and answer each goal frame from it.
   Never raise `setMaxListeners`.
7. **Record.** The fix-5 report lists every proof with its mutation and result.

## Bounds

- Keep every confirmed behaviour: the bound goals, write ordering, the first-failure latch and the timing extractor.
- Do not remove or intern the claim-5 exports.
- The ADVISORY on `Promise.allSettled` over the pending set stands as advisory only. Real callers await each append,
  so the registry holds at most one entry.

## Next

Fix 5 closes with mutation probes, because each item adopts its lane's prescription. Naming Unit A lands on the
result, and the restage into Agent with the `clear()` edits and Unit B runs in Agent's wave 3.
