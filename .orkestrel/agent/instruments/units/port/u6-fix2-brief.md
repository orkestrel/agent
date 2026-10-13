# Unit u6-fix2 — Apply the second-round review findings to the Ledger

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. Executor: BENCH_ENGINE. You are the engine: you implement this unit yourself, and you launch no `codex`, no bench probe, and no other agent.

## Objective

Apply every ruled finding of the second-round reviews, with a test pinning each one, and leave every gate green.

## Context

- **Evidence.**
  - The reviews:
    - `tmp/units/u6-rereview-parity.md`, parity with the measured method;
    - `tmp/units/u6-rereview-contract.md`, the package contracts.
  - The first-round brief is `tmp/units/u6-fix-brief.md`. The rulings here override it where they differ.
  - The measured method is `/home/user/agent/tmp/bench3/bench.mjs` and `/home/user/agent/tmp/bench3/records.mjs`. Read them; edit nothing there.
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`.
  - `../scaffold/.claude/rules/typescript.md` (lines 87 and 88: state every thrown error and failure behavior), `../scaffold/.claude/rules/names.md`, `../scaffold/.claude/rules/architecture.md`, `../scaffold/.claude/rules/tests.md`, and `../scaffold/.claude/rules/writing.md`.
- **Host.** Linux, working path `/home/user/agent-port`, where Vitest runs inside the sandbox. A nested `git` can report `not a git repository`; report `git status --porcelain` as unavailable in that case.
- **Standing conditions.**
  - Never run `npm run build` or `npm run clean`, and never write a `dist` directory. Never write under `/home/user/agent`, and send no request to `127.0.0.1:11434`.

## Scope

- **Owned.**
  - `src/core/ledgers/Ledger.ts`, `src/core/ledgers/Classifier.ts`, and `src/core/ledgers/types.ts`;
  - `tests/src/core/ledgers/Ledger.test.ts` and `tests/src/core/ledgers/Classifier.test.ts`.
- **Off-limits.** Every other file.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Ruled findings: fix each one and pin it with a test

### Parity (`u6-rereview-parity.md`)

1. **Recall order, replacing first-round fix 11.**
   - Iterate the matched messages in their newest-first order, with only the `done` check, as the measured recall does (`bench.mjs:2534-2544`, `:2573`). A message's `add` appends its live amended corrections after it unless they are already listed.
   - Drop the `amended` pre-pass.
   - Change the test topic to one where the source is reached first, and add the case where the correction matches on its own and is listed first.
2. **Chain exclusion.** When rendering a unit's amended chain, pass the members of every record for a `rule` unit and the local `held` set (the measured `recorded`) for any other unit, as `bench.mjs:2271`, `:2117`, and `:2152` do.
3. **Record lines stay bare.** Owner-record and rules-record lines render as bare verbatim sentences, as `records.mjs:394` and `bench.mjs:2296` do. The `NAME ARGS:` result lead applies only to a lookup result rendered outside a record: a loose briefing unit, a recall item, or a digest line. That is the measured `line()` (`bench.mjs:1494`) minus its handle. Update the test at `Ledger.test.ts:93`.
4. **The tail opens on a user message.** Skip leading exchanges whose first message is not a user message, as `bench.mjs:1997` shifts entries until one has the user role.
5. **Seed assistant messages.** Keep every assistant message before the first request, empty or not, as `bench.mjs:1966` does with `!loopWritten` alone. When all of a seed call message's calls were dropped, send it without a `calls` member.
6. **Delete the unreachable superseded branch** at `Ledger.ts:858-864`.
7. **Empty-topic recall text.** Return `recall needs a topic: ` followed by the same guidance string as the no-match text, which names the desk topics.
8. **Generic guidance wording.** The guidance names "an owner name, an id, or one of" followed by the desk topics, not "a customer name, an order or account id". This is a recorded departure, because the package carries no desk vocabulary. Match the recall tool description's wording.

### Contracts (`u6-rereview-contract.md`)

9. **6a.** In the `respond` TSDoc (`types.ts` and `Ledger.ts`), state that a failed calibration rejects with `LedgerError` code `'GAUGE'`, and add `@throws {LedgerError}`.
10. **6b.** Where the `GAUGE` code and `calibrate` are documented (`types.ts:315`, `types.ts:610`), say "reports no prompt usage, or a prompt usage of 0 or less".
11. **6c.** Add `@throws {AgentError}` (`CONCURRENCY`) to `calibrate`, and `@throws {LedgerError}` to the `Ledger` constructor.
12. **6d.** Document `fault` on `ClassifierResult` and in the `classify` `@returns`: any throw or caller abort during classification returns the partial result with `fault`.
13. **F1.** The answer-pass selection handler returns a selection that carries `fault` unchanged, with its messages as `view()`, per `src/core/contexts/types.ts:246`. Filter only a successful selection.
14. **F2.** When a judge call rejects with a `JudgeAbortError` that carries a partial result, `classify` folds that partial's usage and answered key into its result before returning the fault, as the stock selection does (`src/core/contexts/factories.ts:137-145`).
15. **F3.** `calibrate` holds the active flag for its whole duration, so that a `respond` or a second `calibrate` started meanwhile rejects with `AgentError` `CONCURRENCY`.

## Output

Return:

- one line per finding number with the fix's `path:line` and its test's `path:line`;
- each gate's exit code;
- `git status --porcelain` or `unavailable`.

No process diary.

## Acceptance criteria

1. `npx tsc --noEmit --project tsconfig.json` and `npm run check:src:core` exit 0.
2. `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers` and `npm run test:src:core` exit 0.
3. `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.
