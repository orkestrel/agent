# Unit f3-release-fix — Close the code findings of the port-release falsify round

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. Executor: BENCH_ENGINE. You are the engine: implement this unit yourself, and launch no `codex`, no bench probe, and no other agent.

## Objective

Land every code ruling in `tmp/units/port-release-rulings.md`: claims 1, 7, 9, and 11, and findings O1, O2, and O4. The guide is a later unit; this unit changes `src/` and `tests/` only.

## Context

- **Rulings.** `tmp/units/port-release-rulings.md` is binding, with its bounds.
- **Evidence.** `tmp/codex/falsify-astra-last.md` and `tmp/units/falsify-opus-verdict.md` give each failing input.
- **Port.** This worktree, `/home/user/agent-port`, branch `port`, at `7f346b5`.
- **Measured method.** `/home/user/agent/tmp/bench3/bench.mjs`, read-only, where a fix touches measured behavior.
- **Law.** `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`; `../scaffold/.claude/rules/names.md`, `typescript.md`, `architecture.md`, `tests.md`, and `writing.md`.
- **Host.** Vitest runs inside the sandbox; a test that listens on `127.0.0.1` fails with `listen EPERM`. Report such a failure as sandbox-only.
- **Standing conditions.** Never run `npm run build` or `npm run clean`. Write nothing under `/home/user/agent` or `/home/user/agent-port-gauge`. Send no request to `127.0.0.1:11434`.

## Scope

- **Owned.** `src/core/**` and `tests/src/core/**`.
- **Off-limits.** `guides/`, `tests/guides.test.ts`, and every other file. When a guide test fails because of this unit's change, change nothing there and report the test and the guide line.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create. Write each new test first, run it against the unchanged source, and report that it fails; then implement.

## Contracts to land

1. **Claim 1.** A cancel that fires before the agent loop commits a final-text outcome commits a partial result. Test: a `usage` listener that aborts the caller after the final text arrives yields `partial: true` from the agent and from `Ledger.respond`, with no answer pass.
2. **Claim 7.** The classifier holds an item on a `JudgeError` with code `'QUESTION'` as well as on an error matching `DETERMINISTIC_JUDGE_ERROR`; a transient error is still asked again. Test both, and that a held `'QUESTION'` item is never asked twice.
3. **O2 and claim 9.** One exported helper in `src/core/conversations/helpers.ts` splits a message list into exchanges: a user message and every message up to the next user message; messages before the first user message form their own exchange; exchanges that one tool group spans join into one. `compact()`, `filterSelectionMessages`, and the ledger's `#selectTail` use it. Tests:
   - the ledger tail never sends a tool result without its call, using the reviewer's interleaved seed;
   - a seed that opens with an assistant message reaches the ledger tail when it fits;
   - each existing compaction and selection test still holds.
4. **O1.** The ledger's selection handler returns a fault selection when no `respond` is active. Test: `ledger.agent.generate()` after a `respond` faults and plans for no earlier request.
5. **O4.** One function maps a plan unit to its record and one exported, tested function ranks a cut; `#plan` calls each once per use.
6. **Claim 11.**
   - Rename `cutItems` under `names.md` § Rejected naming, and `LedgerTopic.requests` to a boolean that reads as an assertion; update every consumer.
   - Write the `@returns` of `quiet` and `decisive` (types and `Classifier`) as "True if …; false otherwise."
   - Replace each `tmp/` path cited in `src/core/ledgers/constants.ts` with the series and its date in prose.
7. **O3.** Name the two lookup identities apart in TSDoc: the repeat stop compares the tool name and canonical arguments; the projection's `identifyLookup` normalizes top-level string arguments.

## Output

Return one line per contract with its `path:line`, each new test's name with its failing run on `7f346b5`, each gate's exit code, every guide test that fails with its line, and `git status --porcelain`.

## Acceptance criteria

1. `npx tsc --noEmit --project tsconfig.json` and `npm run check:src:core` exit 0.
2. `npm run test:src:core` exits 0.
3. `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.
4. `npm run test:guides` exits 0, or fails only on sandbox listeners or on guide lines this unit's change contradicts, each reported.
5. `git diff --stat` lists only owned files.
