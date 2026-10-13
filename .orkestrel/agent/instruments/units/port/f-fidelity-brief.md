# Unit f-fidelity — Make the ledger's recall, answer note, and tail send what the measured arm sent

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. Executor: BENCH_ENGINE. You are the engine: implement this unit yourself, and launch no `codex`, no bench probe, and no other agent.

## Objective

The offline replay of the 8 measured `a5-records` runs through the port found agent requests the measured harness never sent. Make the port's `recall` result, answer note, and seed tail send what the measured harness sent, under the rulings in `tmp/units/records-port-plan.md` § Replay fidelity rulings. The briefing and the record projection do not change.

## Context

- **Rulings.** `tmp/units/records-port-plan.md` § Replay fidelity rulings is binding.
- **Design detail.** `tmp/units/fidelity-planner.md`: § F1 change (the `recall` tool) and § F2 change (the answer note). Its test names X1 to X5 and its amended-test list apply. `tmp/codex/fidelity-last.md` gives the second lane's evidence for the same rulings; its C7 seam is refused, so build no `hold` method.
- **Replay evidence.** `tmp/units/u8-report.md` (causes C1 to C5, with wire files and diffs) and `tmp/units/u8b-review.md`.
- **Measured harness.** `/home/user/agent/tmp/bench3/bench.mjs`, read-only:
  - the `recall` tool, its searches, `listable`, `onTopic`, `worded`, and item building, near lines 2490 to 2592;
  - the answer note, near lines 1913 to 1941;
  - the tail, `project` and `#history`, near lines 1948 to 1992.
- **Recorded wires.** `/home/user/agent/tmp/bench/results/v9/a5-records-vN-wire/`, read-only. The v7 `00061` to `00063` requests show the multi-word topic `Halvorsen shipment`.
- **Port.** This worktree, `/home/user/agent-port`, branch `port`, at commit `1117e23`.
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`;
  - `../scaffold/.claude/rules/tests.md`: test observable behavior, no mocks, spies, or fakes;
  - `../scaffold/.claude/rules/typescript.md`;
  - `../scaffold/.claude/rules/writing.md`.
- **Host.** Vitest runs inside the sandbox. A test that listens on `127.0.0.1` fails there with `listen EPERM`; report such a failure as sandbox-only.
- **Standing conditions.** Never run `npm run build` or `npm run clean`. Write nothing under `/home/user/agent` or `/home/user/agent-port-gauge`. Send no request to `127.0.0.1:11434`.

## Scope

- **Owned.**
  - `src/core/ledgers/Ledger.ts`;
  - `src/core/ledgers/helpers.ts`, for a pure helper the recall or the note needs; `collectLive` keeps its behavior;
  - `src/core/ledgers/types.ts`, TSDoc only;
  - `tests/src/core/ledgers/Ledger.test.ts` and `tests/src/core/ledgers/helpers.test.ts`.
- **Off-limits.** Every other file, `guides/` and `tests/guides.test.ts` included. When a guide test fails because of this unit's behavior change, change nothing there and report the test name and the guide line.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create. Write each new test first and run it against the unchanged source; report that it fails, then implement.

## Contracts to land

1. **Recall listing (C1, C3, C5, C6).** `#recall` lists as the measured `recall` does, following the planner's F1 steps 1 to 8:
   - call-free, non-quiet seed assistant text is listable;
   - every successful lookup reading is listable, identical repeats included;
   - a word search admits an earlier answer note, and a topic search never does;
   - lines keep their stored content, stale sentences included, with no handle and no amended mark;
   - items are built newest first with amenders after their source, breadth-first, each source once, and cut whole.
2. **Recall searches.** A topic resolves to the searches the measured harness built from it, a multi-word topic that names an owner included. Show with a test from the v7 `Halvorsen shipment` case that the port lists the owner's messages as `a5-records-v7-wire/00061` does.
3. **Answer note (C4, C6).** `#buildDigest` follows the planner's F2 steps 1 to 6: lookup lines carry no `NAME ARGS: ` lead, recall lines keep their stored text, cut lines and duplicate lines drop, and nothing re-projects through the live records.
4. **Seed tail (C6).** A tail message keeps its stored content, as `bench.mjs` `project` does; stale sentences and superseded user messages are not dropped from the tail. Amend the tests at `Ledger.test.ts` near lines 1245 and 1622 to match.
5. **Unchanged.**
   - The briefing, R2a on the briefing, the record projection, and `collectLive`.
   - T1: no handle and no pin line in any model-facing text.
   - The public API: no new export, option, or method.
6. **TSDoc.** Amend `types.ts` near lines 402 to 406 so stale sentences leave the records and the briefing only.

## Output

Return:

- one line per contract with its `path:line`;
- each new test's name, with its failing run on the unchanged source;
- each gate's exit code;
- every guide test that fails, with its line;
- `git status --porcelain`.

## Acceptance criteria

1. `npx tsc --noEmit --project tsconfig.json` and `npm run check:src:core` exit 0.
2. `npm run test:src:core` exits 0.
3. `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.
4. `npm run test:guides` exits 0, or fails only on sandbox listeners or on guide lines this unit's behavior change contradicts, each reported.
5. `git diff --stat` lists only owned files.
