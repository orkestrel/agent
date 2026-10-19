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

## SB-study: the recorder and hole sweep (2026-10-18)

T3 `sb-study-sonnet-1`, brief `tmp/units/study-budget-sweep-brief.md`. The baseline is `ca81174`.

- **Source regressions found and fixed.** The failing-first run was 6 of 67. Each fix is mutation-proved.
  - **B1.** `isStudyCustodyAttempt` accepted an observation hole that the baseline refused.
  - **B2.** `buildStudyPacketLinks` skipped holes in the criteria or the schedule, where the baseline threw.
  - **B3.** `buildStudyPacket` ran every lookup before the first absent-horizon or capacity refusal, so a later hole
    won.
  - **B4.** `StudyAgentTrace` delivered the first row a microtask late, ended an empty goal late, and refused a second
    flush one turn later. The fix adds an internal `rows` getter on `StudyAgentTraceGoal`. The public `flush` is
    unchanged, and Agent's caller at `studies/memory/StudyMemorySession.ts:326` is unaffected.
  - **B5.** `StudyChannel` registered a request after its handler's synchronous path, so re-entry bypassed the limit
    of 64.
- **Differential coverage.** The comparisons covered:
  - 433 server-helper cases and 98 store and process cases;
  - 21 924 series and lease runs;
  - 1 793 script cases;
  - process sessions with real child programs;
  - the launcher, the transport, and the built CLI end to end.

  Controls C1–C4 each reddened a probe.
- **Tests.**
  - About 25 count-only recorders were converted to whole-history assertions.
  - The served-count log is now the entity `OllamaReplyQueue`.
  - New setup helpers: `buildStudySparse` and `buildStudyHole`.
- **Gates.** src 596, policy 119, config 229, setup 72, guides 15 and distribution 10. Format, lint, check and build
  are clean.
- **Ruled by the Orchestrator.** The `__proto__` model label stays in its own-key form. The baseline's assignment loop
  set a prototype and dropped a pinned model, so that was a latent defect, now fixed.
- **Left to the review lane.**
  - One launcher now interrupts every child it launched, where the baseline interrupted only the latest.
  - `StudyProcessSession.#appends` is a `Set<Promise>` that could collapse a shared promise.
  - The reviewer is GPT-6 Astra (T3 `sb-study-falsify-astra-1`), against claims `tmp/units/sb-study-claims.md`.
### SB-study review (one lane), 2026-10-18

GPT-6 Astra high, T3 `sb-study-falsify-astra-1`. The report is `tmp/units/sb-study-verdict-objective-1.md`:
FAIL 5, 6; outside the claims: O1.

- **CONFIRMED.**
  - **1:** B1–B5 restore the baseline, and each control distinguishes its defect.
  - **2:** Bindings and the surface hold. `StudyAgentTraceGoal` stays internal, and `flush` keeps its contract.
  - **3:** the recorders.
  - **4:** the launcher. Interrupting every child of the launcher it owns is a cleanup defect fix, since `StudyCLI`
    constructs a launcher per invocation. The appends `Set<Promise>` holds too: its consumer checks only for unsettled
    evidence.
- **BROKEN.**
  - **5:** the grading traversal (`src/server/adapters/helpers.ts:126`) filters the criteria eagerly. The baseline's
    nested `for…of` reads each next criterion after the preceding predicate returns, so a predicate that replaces a
    criterion in its own rubric array is seen by the baseline and missed here. Fix: a lazy iterator traversal.
  - **O1:** B5 reintroduced a baseline defect. Both reply paths re-read `value.id` after awaiting the handler, so a
    listener that mutates the received frame misroutes the reply (99 instead of 1). `983dba7` was correct. Fix:
    capture the validated id before invoking the handler, and keep the registration order.
  - **6:** follows from 5 and O1.
- **Fix unit.** SB-study-F (T3 `sb-study-fix-sonnet-1`) adopts both prescriptions verbatim, so it closes with
  mutation probes. The lane's leftover `objective-*` probes under `study/tmp/units/` serve as its failing-first
  evidence, and SB-study-F deletes them.