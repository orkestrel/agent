# Agent round 2: falsify verdict

**Subject.** `@orkestrel/agent` round 2 (units T, P, C, H, A, K, L, ST, SM and D), uncommitted on checkpoint `9136fd9`.
The baseline is `f52daa4`. The claims are `tmp/units/agent-r2-claims.md`, and the gates are recorded in
`tmp/units/agent-r2-verify.md`.

## Lanes

| Lane | Engine | Transport | Report |
| --- | --- | --- | --- |
| Objective | GPT-6 Astra xhigh (`analyst`) | T3 `delegate_task` `agent-r2-falsify-objective-astra-1` | `tmp/units/agent-r2-verdict-objective-1.md`: FAIL 1, 2, 4, 6, 8, 9, 12; outside: O1 |
| Subjective | Claude Opus 5.5, ultracode: three lens reviewers and a synthesizer (`reviewer`; told that Opus wrote the plan and units A, L and D) | T3 `delegate_task` `agent-r2-falsify-subjective-opus-1` | `tmp/units/agent-r2-verdict-subjective-1.md`: FAIL 2, 4, 9, 12; outside: S1, S2 |
| Census (writer-side evidence, read-only) | GPT-6 Astra high | T3 `delegate_task` `agent-r2-census-astra-1` | `tmp/units/agent-r2-census.md` |

The Orchestrator reproduced every BROKEN finding and every outside finding on both trees. The baseline was staged with
`git archive` at `tmp/units/agent-r2-head-orch/`, and the probe is `tmp/probes/orchestrator-r2-repro.test.ts`. The
reproduction notes are `tmp/units/agent-r2-reconcile-notes.md`.

## Rulings

1. **BROKEN.** The two lanes answered different questions.
   - The subjective lane cancelled through the external signal and `agent.abort()` at every moment, and found the
     result equal to the baseline.
   - The objective lane cancelled by the consumer's `return()` on `events` after the first token, and found the result
     changed.
   - Reproduced: the baseline gives `{ content: 'abc', partial: true }` and the current tree `{ content: 'ab',
     partial: true }`.
   - The objective lane was right on that path, and the subjective lane's held sweep bounds the fix.
   - Fix: A1.
2. **BROKEN.** Both lanes found it. A genuine provider error after streaming charges the `budget` nothing.
   - Reproduced: baseline `consumed=2`, current `consumed=0`.
   - The current code contradicts the `budget` doc at `src/core/agents/types.ts:448`, the guide at
     `guides/agent.md:2244`, and design 2 Q13(a).
   - Fix: A2, adopting the subjective lane's prescription.
3. **CONFIRMED** by both lanes.
4. **BROKEN, split.**
   - **4a: a re-entrant `compact` (objective).** It predates round 2: both lanes saw it on the baseline. Read: with no
     fold pending, `#fold` reaches `summarize` before `compact` adds its fold to `#pending`.
     - The reachable consequence is a duplicated summarizer call over the same slice. Data integrity holds: the second
       commit fails `slice.every(…)` (`src/core/conversations/Conversation.ts:305`), so one section lands.
     - The objective lane's fix, publishing the fold before calling `summarize`, would deadlock a summarizer that
       awaits a re-entrant `compact`.
     - Ruling: document the limit and pin the integrity. Do not reorder.
     - Fix: C1.
   - **4b: a hole in `collectImageData` (subjective).** Reproduced: the baseline throws `TypeError`, and the current
     tree returns `["A","C"]`.
     - Fix: H1.
5. **CONFIRMED** by both lanes.
6. **CONFIRMED.** The subjective lane confirmed it with a differential and an ownership argument. The objective
   lane's UNRESOLVED is settled by the Orchestrator's ownership comparison (`f52daa4:src/core/agents/factories.ts`'s
   bound `new Set<string>()` against `src/core/agents/factories.ts:263-266`). The retention equals the baseline's, and
   releasing an id would break the retry dedupe.
7. **CONFIRMED** by both lanes.
8. **CONFIRMED.** The subjective lane checked the series JSON and the frozen `project/` copies. The objective lane's
   UNRESOLVED clause is settled by the Orchestrator's search: no `*-runtime` or sealed tree resolves Agent's working
   `studies/**`, and no series process is live.
9. **BROKEN.** Both lanes found it, and so did the census.
   - The objective lane found the three count-only recorder fixtures in `tests/setup.ts`. The census adds eight more
     sites.
   - The subjective lane found `LedgerPass#call` and `#position` as call slots. The census flagged them too.
   - Fixes: L1 and T1.
10. **CONFIRMED** by both lanes.
11. **CONFIRMED** by both lanes.
12. **BROKEN.** It follows from 1, 2, 4b, 9, O1/S1 and S2.
    - The subjective lane adds the stale guide: `guides/agent.md:15` and `:2198` say the budget is charged during
      provider streaming, which B0 retired. Reproduced by reading.
    - Fix: D1.
    - U4 Ollama's service budget test expects a budget-only trip mid-generation. That case migrates to
      `allowance: budget` in U4.

## Outside the claims

- **O1 = S1: `removeEntries` skips a hole.** Reproduced: `Conversation.remove` with `keys[1]` a hole gives `false` on
  the baseline and `true` on the current tree. The helper's TSDoc says "Every key is passed to `remove`"
  (`src/core/helpers.ts:189`). Fix: H1.
- **S2: rewritten loops tolerate holes.** Reproduced on the current tree:
  - `Conversation.reference` returns text where the baseline threw `TypeError`;
  - `computeReading` over `[0.2, <hole>, 0.8]` returns a reading where the baseline threw `TypeError`;
  - `buildJudgeResult` with a leading hole merges, with model `fallback`, where the baseline threw `TypeError`;
  - `new JudgmentManager([<hole>])` throws `TypeError` where the baseline threw `ConversationError`.

  Fix: H1.
- **Census-only:** the eight further count-only recorders, which fix T1 carries; and the `vite.config.ts` sites,
  which the scaffold repair closes.
- **The `#input` ruling** was reversed: it is lawful (`tmp/units/agent-r2-verify.md`). Both lanes treated it as
  carried, as their brief told them, so neither attacked it.

## Fix items

| Item | Findings | Owner files | Prescription | Bound |
| --- | --- | --- | --- | --- |
| A1 | 1 | `src/core/agents/Agent.ts`, `tests/src/core/agents/Agent.test.ts` | Restore the baseline pull and cancel boundary on a consumer `return()`, and pin the objective lane's early-break differential (`'abc'`) | The subjective lane's moment sweep (signal and `abort()` at every moment) stays identical, and turn-state ownership stays lawful under § Bindings |
| A2 | 2 | the same | The subjective lane's fix: read `reported` from the abort partial only when the call was interrupted, then run the charge before the non-cancel rethrow. Add a "three failure layers" case: budget-only and separate-allowance runs that throw after `'Once upon'` charge `{ prompt: 0, completion: 3, total: 3 }`. Record its failing count first | Never charge an unaborted error's partial usage, never charge a shared budget twice, and never turn the rejection into a partial. The shared path is unchanged |
| H1 | 4b, O1/S1, S2 | `src/core/helpers.ts`, `src/core/contexts/helpers.ts`, `src/core/providers/helpers.ts`, `src/core/conversations/{Conversation,JudgmentManager}.ts`, and their tests | A rewritten iteration over a caller-supplied array visits holes as the baseline's `for…of` did, through `Array.from(…)`, a spread, or `entries()`. Fix the six reproduced sites, sweep every round-1 and round-2 rewrite in `src/` for the same pattern, and pin each with a sparse test. `JudgmentManager` raises `ConversationError` again | Dense inputs are unchanged. Add no per-site hole guard. `collectToolGroups`, `collectExchanges` and `attachUserImages` keep their baseline hole behaviour |
| C1 | 4a | `src/core/conversations/Conversation.ts` (TSDoc), its test | Document in `compact`'s remarks that a summarizer must not `compact` its own conversation. Pin with a test that a non-awaited re-entrant `compact` commits exactly one section | Do not reorder the `#pending` publication (deadlock) |
| L1 | 9 (subjective, census) | `src/core/ledgers/LedgerPass.ts`, `tests/src/core/ledgers/LedgerRequest.test.ts` (or a new `LedgerPass.test.ts`) | The subjective lane's fix: a pass-owned append-only log of final records (`{ call, position }`, `{ usage }`, `{ thinking }`), with `calls`, `call` and `position` derived from it | Attribution is unchanged. `LedgerRequestInterface`, the Ledger gauge cases and the golden probes stay identical |
| T1 | 9 (objective, census) | `tests/setup.ts`, `tests/setup.test.ts`, `tests/src/core/ledgers/{Classifier,Ledger}.test.ts`, `tests/src/core/providers/RelayStream.test.ts` | Each count-only recorder whose count drives fixture logic becomes either an entity with a `#` counter or a `.values()` iterator over the scripted sequence. A test whose read is only a count asserts the whole history instead | Recorders whose history is read stay. Preserve gate assignment and response order |
| D1 | 12, T1's `tests/guides.test.ts:1693` | `guides/agent.md`, `tests/guides.test.ts` | Rewrite `:15` and `:2198` to the shipped split, in `src/core/agents/types.ts:594`'s words. Add `allowance` to the lists at `:132` and `:148`. Add an executed assertion that a budget-only run reads 0 while the provider streams. Fix the `asks` count-only recorder. Keep parity with every TSDoc that A2, H1, C1 and L1 change | § Three failure layers stays as it is |
