# Unit p3-probe-t1-cut — Admit a recall cut shift that T1 explains, and nothing else

## Role and engine

`builder` on Claude Sonnet 5.5, reached as a workflow subagent. This brief fixes every contract. Executor: NATIVE_SUBAGENT.

## Objective

The replay leaves 13 agent bodies unlisted, in copies v1, v3, v6, v7, and v8. The recall residue unit showed each is a cut-point shift: both sides list the same candidates in the same order, and the port keeps a different number of them because its handle-free lines and its shorter prompt (plan ruling T1) change the item sizes and the room, while its gauge equals the measured formula on identical inputs. The evidence is `tmp/units/f2-recall-residue-rooms.json`. Add normalization N10, which admits such a shift by a mechanical check, and admits nothing else.

## Context

- **Probe.** `tmp/probes/ledger-replay.test.ts`, `ledger-replay-compare.ts`, and `ledger-replay-support.ts`, in this worktree, `/home/user/agent-port-gauge`, at the port's commit `7f346b5`.
- **Evidence.** `tmp/units/f2-recall-residue-rooms.json`: per body, the candidates, the rooms, the per-item estimates on both sides, and both cuts.
- **Law.** `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`, and `../scaffold/.claude/rules/tests.md`.
- **Standing conditions.** Send no request to `127.0.0.1:11434`. Never run `npm run build` or `npm run clean`. Write nothing under `/home/user/agent` or `/home/user/agent-port`.

## Scope

- **Owned.** The three probe files and `tmp/probes/ledger-replay-report.json`.
- **Off-limits.** Every other file, `src/` and `tests/` included.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. **N10 on a recall result.** After N1 to N9, admit a recall result when:
   - the recorded items and the port items are prefixes of one candidate sequence, item for item equal after the existing normalizations;
   - each side's cut line names exactly the count of candidates it left out, or is absent when it left none;
   - the two sides differ only in how many candidates they keep.
2. **N10 on an answer note.** Admit an answer note whose only difference is the lines of the items that the admitted recall shift kept on one side and cut on the other.
3. **N10 on a cascade.** Admit a later recall that lists an earlier answer note when the only difference inside that note is the shift that contracts 1 and 2 admitted for it, and the later recall's own cut obeys contract 1.
4. **Count and log.** Count each admission under `N10 T1 cut shift`, and print, per admitted recall, both kept counts.
5. **Controls.** Each control is a test that expects the failure:
   - a shift with one item reordered stays unlisted;
   - a shift whose cut line names a wrong count stays unlisted;
   - an answer note with one line beyond the shifted items stays unlisted;
   - an extra item that is not the next candidate stays unlisted.

## Output

Return the per-copy counts, the number of N10 admissions per copy, each gate's exit code, and every remaining unlisted body with its exact diff.

## Acceptance criteria

1. `npx vitest run --config vite.config.ts --project probe tmp/probes/ledger-replay.test.ts` from `/home/user/agent-port-gauge` exits 0, every control included.
2. `npx oxlint --config .oxlintrc.json --deny-warnings` on the three probe files exits 0.
3. `git -C /home/user/agent-port-gauge diff --stat -- src tests` is empty.
