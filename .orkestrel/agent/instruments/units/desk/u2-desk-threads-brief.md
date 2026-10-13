# Unit u2-desk-threads — The three thread families on the server

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. Executor: BENCH_ENGINE. You are the engine: implement this unit yourself, and launch no `codex`, no bench probe, and no other agent.

## Objective

Build the server's thread families, `RecordsThread` for the ledger and `AgentThread` for the full view and compaction, with their factories, the call resolver, and their receipts, as `/home/user/agent-port/tmp/units/desk-design.md` § Units, U2 `desk-threads`, specifies. U3 wires them into the turn; this unit changes no turn or page file.

## Context

- **Design.** `/home/user/agent-port/tmp/units/desk-design.md`: § Design, Server, for the per-thread state, the strategy map table, the ledger inputs, and the receipts; § Units, U2 for the contract and acceptance; § Constraints and § Refusals bind.
- **Rulings.** `/home/user/desk/tmp/units/desk-rulings.md` settles the design's tensions and states the standing conditions; read it first. Ruling 3 (no cap with thinking off), ruling 4 (the date sentence, from the U1 helper), ruling 5 (unguarded compaction), and ruling 7 (measured thresholds) bear on this unit.
- **Core contract.** U1 landed the types, constants, parsers, and helpers in `/home/user/desk/app/core/`; use them, and change none.
- **Ledger.** The release candidate in `node_modules/@orkestrel/agent/dist/src/core/index.d.ts` exports `createLedger`, `LEDGER_QUESTIONS`, and `LEDGER_NOTES`; the port source at `/home/user/agent-port/src/core/ledgers/` and `/home/user/agent-port/guides/agent.md` § Serving a conversation through a ledger document the behavior. The Ollama provider and judge come from `@orkestrel/ollama`, as `/home/user/desk/app/server/Desk.ts` builds them.
- **Measured values.** `/home/user/agent/tmp/bench/results/v10/FINAL-CHECK.md` § Arms and § Conditions, `/home/user/agent/tmp/bench/results/v10/cap.md`, and `/home/user/agent/tmp/bench3/bench.mjs` (`LEDGER_FIT` near line 831). Cite each in the constants' TSDoc by series and date in prose, not by a `tmp/` path.
- **Tests.** Use a recording `fetch` that answers in the Ollama wire format, as `/home/user/desk/tests/app/server/Desk.test.ts` does.
- **Law.** `/home/user/desk/AGENTS.md`, which resolves to `/home/user/scaffold/AGENTS.md`, and the rules it names under `/home/user/scaffold/.claude/rules/`.
- **Host.** Vitest runs inside the sandbox; a test that listens on `127.0.0.1` fails with `listen EPERM`. Report such a failure as sandbox-only.

## Scope

- **Owned.** `/home/user/desk/app/server/AgentThread.ts`, `RecordsThread.ts`, `factories.ts`, `helpers.ts`, `constants.ts`, `types.ts`, and their tests under `/home/user/desk/tests/app/server/`.
- **Off-limits.** Every other file, `Desk.ts`, `handlers.ts`, `parsers.ts`, and `errors.ts` included. When a change here breaks a consumer outside the owned files, change nothing there and report it.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create; never commit; never run `npm install`, `npm ci`, or `npm update`. Run every npm command as `PATH=/home/user/desk-npm11/bin:$PATH npm ...` from `/home/user/desk`. Write each new test before its code, run it against the unchanged source, and report that it fails.

## Contracts to land

Every item of the design's U2 list: the server types, the server constants, `resolveCall` with all twelve rows of the design table, `RecordsThread`, `AgentThread`, and the three factories.

## Output

Return one line per contract item with its `path:line`, each new test's name with its failing run, every consumer error outside the owned files, each gate's exit code, and `git status --porcelain`.

## Acceptance criteria

1. The design's U2 acceptance holds, each item a passing test.
2. `resolveCall` reproduces every row of the design table, asserted row by row.
3. `PATH=/home/user/desk-npm11/bin:$PATH npm run test:app:server` exits 0, or fails only on sandbox listeners, each reported.
4. `PATH=/home/user/desk-npm11/bin:$PATH npm run check` exits 0, or fails only on consumers outside the owned files, each reported.
5. `git status --porcelain` lists only owned files and U1's files.
