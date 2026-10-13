# Unit u5-ledger-gauge — Port the ledger's prompt gauge

## Role and engine

`builder` on Claude Sonnet 5.5, reached as a native subagent. The shape is closed: `GaugeInterface` and `GaugeOptions` are declared, and the measured arithmetic fixes the behavior. Executor: NATIVE_SUBAGENT.

## Objective

Implement `Gauge` in `src/core/ledgers/Gauge.ts`, satisfying `GaugeInterface` from `src/core/ledgers/types.ts`. It is the measured prompt pricing: the scale and fixed cost of a prompt, the marginal rate inside a request, the room left after a call, the reply reserve, and the recall room.

## Context

- **Evidence.**
  - The measured gauge is in `/home/user/agent/tmp/bench3/bench.mjs`:
    - `measureSeed`, `measureCall`, `measureRun`, and `measureReply`, lines 1257 to 1281;
    - `marginal`, `left`, `reserve`, and `room`, lines 1286 to 1315;
    - `closed`, line 1321, which reads the gauge;
    - `fitSlope`, line 6055;
    - `SCALE_DRIFT` and its comment, found with `rg -n SCALE_DRIFT`.
  - Read them; edit nothing there. The measured seed reading for the records runs is `scale` 1.1634671320535195 and `fixed` 498 over estimate 1,719 (`/home/user/agent/tmp/bench/results/v9/a5-records-v1/seed.json`).
  - The contracts are `GaugeCall`, `GaugeOptions`, `GaugeInterface`, and `LedgerGauge` in `src/core/ledgers/types.ts`, with `LEDGER_SCALE_DRIFT` in `src/core/ledgers/constants.ts`. Unit U3 may already provide `fitSlope` in `src/core/ledgers/helpers.ts`; import it from there when it exists rather than porting a second copy.
  - `estimateMessages` is in `src/core/agents/helpers.ts`.
  - The plan is `tmp/units/records-port-plan.md`.
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`.
  - `../scaffold/.claude/rules/typescript.md`, `../scaffold/.claude/rules/names.md`, `../scaffold/.claude/rules/architecture.md` (one class per file, no nested functions), `../scaffold/.claude/rules/tests.md`, and `../scaffold/.claude/rules/writing.md`.
- **Installed primitives.** `@orkestrel/contract` guards.
- **Host.** Linux, working path `/home/user/agent-port-gauge`, a second git worktree on its own local branch, created from the commit that carries U3. Its `node_modules` is a symlink to `/home/user/agent/node_modules`. The Orchestrator merges the branch into `port`.
- **Standing conditions.**
  - A live benchmark series in `/home/user/agent` imports `/home/user/agent/dist`. Never run `npm run build`, `npm run clean`, or any command that writes a `dist` directory. Never write under `/home/user/agent` or `/home/user/agent-port`, and send no request to `127.0.0.1:11434`.

## Unknowns

None.

## Scope

- **Owned.** `src/core/ledgers/Gauge.ts` and `tests/src/core/ledgers/Gauge.test.ts`.
- **Shared (report-only).** `src/core/ledgers/types.ts`, `src/core/ledgers/constants.ts`, and `src/core/ledgers/helpers.ts`. Return an exact patch; do not apply it.
- **Off-limits.** Every other file.
- **Made false by this change.** None.
- **Tools and limits.** Read, Edit, Write, and Bash for the scoped gates. No install and no build.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Behavior to land

1. The constructor takes `GaugeOptions` (`scale`, `fixed`, and `capacity`). It throws `LedgerError` with code `GAUGE` for a nonfinite or nonpositive `scale` or a negative or nonfinite `fixed`, and with `CAPACITY` for a capacity that is not a positive safe integer.
2. `measure(messages)` is the measured price of a prompt: `fixed + scale * estimateMessages(messages)`, or the exact form the harness applies; match it.
3. `observe(calls)` rescales from the first call of a finished request with the fixed cost taken out, as `measureRun` does. It keeps the calls for the marginal rate and the longest completion for the reply reserve.
4. `rate(calls)` is the pooled least-squares slope per tool count over the kept requests and the calls in progress, falling back to `scale`.
5. `left(calls)` is the capacity minus the latest call's prompt and completion, or minus its estimated price when the counts are absent, never below 0.
6. `reserve(calls, longest)` is the measured reply reserve plus one recall call with a short result, priced at the rate. `longest` is the longest assistant content, used before any reply has been observed.
7. `room(calls, longest)` is `(left - reserve) / 2 / rate`, never below 0.
8. Every arithmetic case is pinned by a test with hand-computed expected values, including:
   - the seed reading above;
   - two tool-count groups that a single slope would misread;
   - a call with no usage;
   - the floor at 0.

## Output

Return:

- the diff summary;
- each behavior with the test that pins it, with `path:line`;
- each gate's exit code with its failure excerpt, if any;
- `git status --porcelain`.

No process diary.

## Deviation contract

Stop and report (expected, found, evidence, done or not done, one hypothesis) when a measured formula cannot be expressed through `GaugeInterface` (return the patch). Settle private names yourself.

## Acceptance criteria

1. `npx tsc --noEmit --project tsconfig.json` and `npm run check:src:core` exit 0.
2. `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers/Gauge.test.ts` exits 0.
3. `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.
4. `git status --porcelain` lists only the owned files and `tmp/` paths.

**Observations, not criteria.** None.

**Measurement.** None.

## Review evidence

The actual diff and `git status --porcelain`.
