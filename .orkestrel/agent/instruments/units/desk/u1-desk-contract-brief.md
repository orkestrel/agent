# Unit u1-desk-contract — The core contract for per-thread strategy, model, and thinking

## Role and engine

`builder` on Sonnet 5.5. Implement this unit yourself; spawn nothing.

## Objective

Land the core types, constants, parsers, and helpers that every later desk unit builds on, as `/home/user/agent-port/tmp/units/desk-design.md` § Units, U1 `desk-contract`, specifies. The server and page units consume this contract; this unit changes no server or page file.

## Context

- **Design.** `/home/user/agent-port/tmp/units/desk-design.md`: § Design for the shapes and § Units, U1 for the contract list. Its § Constraints and § Refusals bind.
- **Rulings.** `/home/user/desk/tmp/units/desk-rulings.md` settles the design's tensions and states the standing conditions; read it first. Ruling 4 adds a date-sentence helper to this unit's helpers: one pure function that takes a `Date` and returns `AGENT_SYSTEM` followed by `Today is WEEKDAY YYYY-MM-DD.` in local time.
- **Ledger types.** `node_modules/@orkestrel/agent/dist/src/core/index.d.ts` (the release candidate) declares `LedgerGauge`, `LEDGER_QUESTIONS`, and `LEDGER_NOTES`; read the shapes there, and the port source at `/home/user/agent-port/src/core/ledgers/types.ts` for their TSDoc.
- **Desk files.** `/home/user/desk/app/core/types.ts`, `constants.ts`, `parsers.ts`, `helpers.ts`, and `/home/user/desk/tests/app/core/`.
- **Law.** `/home/user/desk/AGENTS.md`, which resolves to `/home/user/scaffold/AGENTS.md`, and the rules it names: `names.md`, `typescript.md`, `architecture.md`, `tests.md`, and `writing.md` under `/home/user/scaffold/.claude/rules/`.

## Scope

- **Owned.** `/home/user/desk/app/core/types.ts`, `constants.ts`, `parsers.ts`, `helpers.ts`, and `/home/user/desk/tests/app/core/*`.
- **Off-limits.** Every other file. When a change here breaks a consumer outside the owned files (a server or page file that reads `ModelCall.predict`, `TurnBoard`, or `AGENT_TITLE`), change nothing there; report the file, the line, and the error, because the next units own those files.

## Contracts to land

Every item of the design's U1 list, with TSDoc in the shape `typescript.md` prescribes, plus the date-sentence helper of ruling 4. Keep `AGENT_TITLE` and `findSlot` for now; U4 removes them with their last consumer.

## Execution

Write each new test before its code, run it against the unchanged source, and report that it fails.

## Output

Return one line per contract item with its `path:line`, each new test's name with its failing run, every consumer error outside the owned files, each gate's exit code, and `git status --porcelain`.

## Acceptance criteria

1. The design's U1 acceptance holds: a `ThreadReply` survives a JSON round trip through `parseArrival`; a duplicate reply and a reply for an unknown thread leave the board unchanged; `readLane` derives each state.
2. The date-sentence helper returns `Today is Saturday 2026-10-10.` for a local `Date` on that day, after `AGENT_SYSTEM`.
3. `PATH=/home/user/desk-npm11/bin:$PATH npm run test:app:core` exits 0.
4. `PATH=/home/user/desk-npm11/bin:$PATH npm run check` exits 0, or fails only on consumers outside the owned files, each reported.
5. `git status --porcelain` lists only owned files.
