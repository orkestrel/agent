# Unit p4-probe-n10-tight — Tie N10 to the candidate sequence and the shift it admits

## Role and engine

`builder` on Claude Sonnet 5.5, reached as a workflow subagent. This brief fixes every contract. Executor: NATIVE_SUBAGENT.

## Objective

N10 admits the 13 real T1 cut shifts at commit `7f346b5`, and its review (`tmp/units/p3-review.md`) shows it would also admit bodies that are not pure shifts. Apply every "Right" change the review names, so N10 admits exactly a shift of whole items of one candidate sequence and the note lines that shift moves.

## Context

- **Probe.** `tmp/probes/ledger-replay.test.ts`, `ledger-replay-compare.ts`, and `ledger-replay-support.ts`, in this worktree, `/home/user/agent-port-gauge`.
- **Review.** `tmp/units/p3-review.md`, verdicts 1, 2, 3, and 5, and § Findings outside the claims.
- **Evidence.** `tmp/units/f2-recall-residue-rooms.json`, `recalls[*].candidates` and items.
- **Law.** `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`, and `../scaffold/.claude/rules/tests.md`.
- **Standing conditions.** Send no request to `127.0.0.1:11434`. Never run `npm run build` or `npm run clean`. Write nothing under `/home/user/agent` or `/home/user/agent-port`.

## Scope

- **Owned.** The three probe files and `tmp/probes/ledger-replay-report.json`.
- **Off-limits.** Every other file, `src/` and `tests/` included.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. **Candidate sequence.** The extra items are exactly the next whole items of the recall's candidate sequence, a source with its amenders as one item. Derive the sequence from the recorded data the probe holds (the seed, the decided amendments, and the recall's topic), not from the evidence file; check it equals the evidence file's `candidates` for the 7 admitted recalls.
2. **Cut line.** Compare each cut line's whole text with the fixed notice, the count, and `item` or `items` agreeing with the count.
3. **Answer note.** Drop only the lines of the items the admitted recall shift moved, each at most once, in their item order, at the position the shift puts them; tie each pooled entry to the goal and call whose recall produced it.
4. **Cascade.** Limit pooled drops to the recalled note's own lines, from its header to its last line, then apply contract 1 to the items after the note.
5. **Recall only.** Admit a tool message only when it answers a `recall` call.
6. **Kept counts.** Count items after a note correctly.
7. **Controls.** Add each control the review lists in verdict 5, each expecting unlisted, plus an assertion of the 7/8 kept pair.

## Output

Return the per-copy counts, the N10 admissions per copy, each gate's exit code, and every unlisted body with its exact diff.

## Acceptance criteria

1. `npx vitest run --config vite.config.ts --project probe tmp/probes/ledger-replay.test.ts` from `/home/user/agent-port-gauge` exits 0, every control included, with the same 13 admissions.
2. `npx oxlint --config .oxlintrc.json --deny-warnings` on the three probe files exits 0.
3. `git -C /home/user/agent-port-gauge diff --stat -- src tests` is empty.
