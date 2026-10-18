# Agent round 2 fix round: successor falsify verdict (one lane)

**Subject.** Agent round 2's fix round, uncommitted on `0192ced`. The claims are `tmp/units/agent-r2-fix-claims.md`.
The previous round's verdict is `.orkestrel/agent/agent-r2-audit-verdict.md`.

## Lane

| Lane | Engine | Transport | Report |
| --- | --- | --- | --- |
| Objective (one lane, medium) | GPT-6 Astra xhigh (`analyst`) | T3 `delegate_task` `agent-r2-fix-falsify-astra-1` | `tmp/units/agent-r2-fix-verdict-objective-1.md`: FAIL 1, 3, 5, 6, 7, 8; outside: none |

**Gates.** `tmp/units/agent-r2-fix-verify.md` records a pass. The only flagged line is the lane's own authorized probe.

## Rulings

The Orchestrator reproduced each finding with `tmp/probes/orchestrator-r2-fix-repro.test.ts` against the baseline
staged at `tmp/units/agent-r2-head-orch/`.

1. **Approved: the claim was mis-stated, and the behaviour is B0.**
   - The lane's input was a budget-only run with max 1 and deltas `abcd`, `efgh`, `ijkl`, broken after the first event.
     The baseline gives `'abcd'`, consumed 1. The current tree gives `'abcdefghijkl'`, consumed 3.
   - The baseline's budget-only mid-stream charge aborted after the first delta. B0, which the user accepted in design
     2, removes that charge.
   - With no budget, both trees collect the whole scripted stream on an early break: the lane's held attacks, and the
     `'abc'` pin. So the current tree is B0 behaving as approved.
   - The successor claim omitted B0 from its exceptions, though round 2's claim 1 listed it. The lane's own
     "smallest correction" was to narrow the claim.
   - No code fix.
2. **CONFIRMED.**
3. **BROKEN, reproduced.** `collectToolGroups` over an assistant whose `calls` holds a hole at index 0: the baseline
   throws `TypeError`, and the current tree returns the group. The nested `.map` at `src/core/helpers.ts:297` skips the
   hole. FH's sweep looked at the top-level arrays and missed nested caller arrays. Fix: R1.
4. **CONFIRMED.** Both the queued and the unqueued case match the corrected remark.
5. **BROKEN, reproduced.** `LedgerPass.bill(usage)` keeps the caller's object, so `usage.prompt = 99` after billing
   changes the reading from 10 to 99. The checkpoint's slot form copied the scalars. Fix: R2.
6. **BROKEN, by reading together with the lane's mutation.** At `tests/src/core/agents/Agent.test.ts:2505`, the
   conversion maps an `Error` to its message, so an emitted string `'turn 2 boom'` passes. The former
   `toBeInstanceOf(Error)` claim was lost. Fix: R3.
7. **BROKEN, by reading together with the lane's mutation.** `tests/guides.test.ts:3078` asserts consumption only.
   Removing the held-budget `start()` loop leaves it green. Fix: R4.
8. **BROKEN.** It follows from 3, 5, 6 and 7.

## Fix items

| Item | Finding | Owner file | Prescription | Bound |
| --- | --- | --- | --- | --- |
| R1 | 3 | `src/core/helpers.ts`, `tests/src/core/helpers.test.ts` | `Array.from(leader.calls ?? [], (call) => …)` at `:297`, with a sparse-`calls` test. Then sweep every rewrite in `git diff f52daa4 -- src/core` that iterates a nested caller array (`message.calls`, `section.messages`, a result's `answers` or `refusals`, a reading's lists) with `map`, `flatMap`, `reduce`, `some` or `every`, and match the baseline's hole behaviour. Return a patch for any site in another file | Dense inputs are unchanged. The `local.map`/`local.some` reads at `:315-320` already matched the baseline, so leave them as they are. FH2's `rules.lines` filtering stays |
| R2 | 5 | `src/core/ledgers/LedgerPass.ts`, `tests/src/core/ledgers/LedgerPass.test.ts` | Append `{ prompt, completion }` scalars, read at bill time, instead of the caller's object. Add a test that mutates the billed object after `bill`, and after a later `observe` | Keep the log form and attribution. Add no call slot. The pass-level `usage` sum is out of scope |
| R3 | 6 | `tests/src/core/agents/Agent.test.ts` | Keep the whole-history message assertion and also require `[[expect.any(Error)]]`, or the original error's identity. Scan every recorder conversion in the file, and in FS's ten files read-only, for any mapping that drops a type or identity claim. Fix the ones in `Agent.test.ts` and return patches for the rest | Assertions only. No production change |
| R4 | 7 | `tests/guides.test.ts` | Capture the constructed and the per-run signals before the run. Assert that each per-run signal is replaced and each constructed signal is unchanged, beside the consumption assertions | The guide prose stays as it is |

Each item adopts the lane's prescription, so it closes with its mutation probe: the defect reintroduced must fail the
new assertion.

## Results (native Workflow `wf_a6af27b8-cde`)

Every item passed its independent Haiku checker. In each case the checker reintroduced the defect, saw the new
assertion fail, and reverted the file to a byte-identical hash.

- **R1.** `src/core/helpers.ts:296-302` now uses `Array.from(leader.calls ?? [], …)`. The sparse-`calls` test is at
  `tests/src/core/helpers.test.ts:375`. Before the fix 1 of 55 failed; after it 55 pass.
- **R2.** `bill` appends scalar `{ prompt, completion }` values (`src/core/ledgers/LedgerPass.ts:138-146`). The test
  mutates the billed object after `bill` and after a later `observe`. The three ledger files pass 99 tests.
- **R3.** `[[expect.any(Error)]]` is added at `tests/src/core/agents/Agent.test.ts:2506` and at `:3153`, a second
  conversion that had lost the same claim. The read-only scan of every other conversion found no lost type or identity
  claim. The file passes 229 of 229.
  - **One transient failure.** The builder's first run failed once at `:4308` (`consumed` 1000001 against 1000000).
    The R4 checker was deleting the held-budget `start()` loop from `Agent.ts` at that moment. Four later runs pass.
- **R4.** The per-run start proof now checks signal identity: each per-run signal is replaced and each constructed
  signal is unchanged. With the `start()` loop really deleted, the test fails. 147 of 147 pass.
- **R5.** R1's sweep found that `AgentProvider.#assemble`'s `folded.flatMap((one) => one.tools)` drops a hole in an
  increment's `tools`. The baseline kept it as `undefined`, and `#decide` threw. The fix
  (`folded.flatMap((one) => [...one.tools])`) goes to unit R5 with its proof.
- **R5. Accepted.**
  - The fix is at `src/core/providers/AgentProvider.ts:279`, with a test at
    `tests/src/core/providers/AgentProvider.test.ts:149` asserting `[undefined, call]` with length 2.
  - A probe against the staged baseline gives the same reading.
  - Before the fix 1 of 60 failed; after it 60 pass. Restoring the old line fails only the new test.
  - Dense inputs are unchanged, including the 10 000-increment order test.
