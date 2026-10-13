# Unit f2-recall-residue — Close the recall differences the replay still shows

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. Executor: BENCH_ENGINE. You are the engine: implement this unit yourself, and launch no `codex`, no bench probe, and no other agent.

## Objective

After commit `7f346b5`, the offline replay of the 8 measured `a5-records` runs leaves 13 agent bodies that differ from the recording, all in `recall` results and the answer notes that copy them: g04 calls 2 and 3 in copies v1, v3, v6, v7, and v8, and g07 calls 1 to 3 in copy v7. The full per-body diffs are in `tmp/units/u8-replay-after-4ceab14.json` (`copies[].bodies[].diff`, with `recorded.lines` and `port.lines`). For each body, find the cause and act on it:

- **Candidate set.** The port lists an item the measured `recall` did not list, or omits one it listed. This is a port fix: make `#recall` select exactly as `bench.mjs` `recall` does (near lines 2490 to 2590). One case to start from: v7 g07 call 1, `recall {"topic":"Halvorsen shipment"}`, where the port lists the MX-4471 acknowledgment and its correction and the measured result lists none of it. In the measured harness a part matches a registry or desk topic only when the part's id is exact or every word of the part is in that topic's label; a part that matches none lists only user messages and lookup results that carry every word.
- **Cut point.** The port and the measured result list the same items in the same order but cut at a different point. Reconstruct the measured room for that call from `/home/user/agent/tmp/bench/results/v9/a5-records-vN/ledger.jsonl` and `seed.json` with the measured formula (`bench.mjs` `left`, `reserve`, `marginal`, `room` near lines 1295 to 1335, and `#callSize` near line 2595), and the port's room from its `Gauge` with the same inputs. Then rule:
  - when the two rooms are equal and the port's cut follows from its shorter, handle-free lines (plan ruling T1), report the room, each item's estimate on both sides, and the cut on both sides; change nothing;
  - when the rooms differ, find the input that differs and fix the port to the measured formula, unless a plan ruling names the difference.

## Context

- **Rulings.** `tmp/units/records-port-plan.md`, § Rulings on the tensions (T1) and § Replay fidelity rulings, is binding.
- **Measured harness.** `/home/user/agent/tmp/bench3/bench.mjs`, read-only.
- **Recorded runs.** `/home/user/agent/tmp/bench/results/v9/a5-records-vN/` and `a5-records-vN-wire/`, read-only.
- **Port.** This worktree, `/home/user/agent-port`, branch `port`, at commit `7f346b5`.
- **Law.** `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`; `../scaffold/.claude/rules/tests.md`; `../scaffold/.claude/rules/typescript.md`; `../scaffold/.claude/rules/writing.md`.
- **Host.** Vitest runs inside the sandbox; a test that listens on `127.0.0.1` fails with `listen EPERM`. Report such a failure as sandbox-only.
- **Standing conditions.** Never run `npm run build` or `npm run clean`. Write nothing under `/home/user/agent` or `/home/user/agent-port-gauge`. Send no request to `127.0.0.1:11434`.

## Scope

- **Owned.** `src/core/ledgers/Ledger.ts`, `src/core/ledgers/helpers.ts`, `src/core/ledgers/Gauge.ts`, `tests/src/core/ledgers/Ledger.test.ts`, `tests/src/core/ledgers/helpers.test.ts`, `tests/src/core/ledgers/Gauge.test.ts`, and a report file `tmp/units/f2-recall-residue-rooms.json`.
- **Off-limits.** Every other file, `guides/` included. When a guide claim goes false, report the line.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create. Write each new test first and run it against the unchanged source; report that it fails, then implement.

## Contracts to land

1. Every one of the 13 bodies has a cause: candidate set or cut point, with the evidence.
2. Every candidate-set difference is fixed in the port, with a test that fails on `7f346b5`.
3. Every cut-point difference has both rooms, the per-item estimates on both sides, and both cuts in `tmp/units/f2-recall-residue-rooms.json`, keyed by copy, goal, and call. A room difference is fixed in the port with a test, or names the plan ruling that admits it.
4. The public API, the briefing, and T1 are unchanged.

## Output

Return one line per body with its cause and ruling, each new test's name with its failing run on `7f346b5`, each gate's exit code, and `git status --porcelain`.

## Acceptance criteria

1. `npx tsc --noEmit --project tsconfig.json` and `npm run check:src:core` exit 0.
2. `npm run test:src:core` exits 0.
3. `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.
4. `npm run test:guides` exits 0, or fails only on sandbox listeners or on guide lines this unit's change contradicts, each reported.
5. `git diff --stat` lists only owned files.
