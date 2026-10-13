# Unit g3-release-guide — Make the agent guide true of the second release fix

## Role and engine

`opus` on Claude Opus 5.5, reached as a workflow subagent. The wording is this unit's judgment; the facts are fixed. Executor: NATIVE_SUBAGENT.

## Objective

Bring `guides/agent.md` and its executed assertions to commit `33a5e67`, under `tmp/units/port-release-2-rulings.md`.

## Context

- **Rulings.** `tmp/units/port-release-2-rulings.md`: claims 4, 5, 9a to 9e, 10b, and findings O1, O2, and O3.
- **What right looks like.** `tmp/units/falsify2-opus-verdict.md`, verdicts 4, 5, and 9, and findings O1 and O2, each with its "Right".
- **Code.** `src/core/**` at `33a5e67` (`tmp/units/f4-release-fix-last.md`): pairing by call id (`resolveLedgerCall`), the held-fingerprint set, stub pricing, the `respond`-only admission with `LedgerError` code `'REQUEST'`, calibration replay at the next user boundary, `LedgerPlanningGroup`. `npm run test:guides` fails the inventory tests at lines 260 and 281 on the new exports and summaries.
- **Law.** `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`; `../scaffold/.claude/rules/documentation.md`; `../scaffold/.claude/rules/writing.md`.
- **Standing conditions.** Never run `npm run build` or `npm run clean`. Write nothing under `/home/user/agent` or `/home/user/agent-port-gauge`. Send no request to `127.0.0.1:11434`. Run every gate from `/home/user/agent-port`.

## Scope

- **Owned.** `guides/agent.md` and `tests/guides.test.ts` in `/home/user/agent-port`.
- **Off-limits.** Every other file.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. **Claim 4.** The plan bullet and the limit bullet say the budget bounds the briefing and the tail of the first call, and that the request, lookup results, the pass's own turns, the answer note, and the fault view enter unbounded.
2. **Claim 5.** The direct-run paragraph says a run that no active `respond` call owns gets a faulted selection with `LedgerError` code `'REQUEST'` when its newest message is a user message, and gets no selection and builds from the whole view when it is not; calibration admits no run.
3. **9a to 9e, 10b, O1, O2.** Each as the verdict's "Right" states it, with the claim 8 calibration sentence matching the code: calibration applies the policy as the next request will.
4. **Inventory.** The tables list `LedgerPlanningGroup` and `resolveLedgerCall`, and every compared summary equals its source.
5. Each changed behavior claim has an executed assertion that breaks when it goes false, or cites the existing test by name; the direct-run and no-retirement assertions distinguish the mutations the verdict names.

## Output

Return each changed claim's `path:line`, each assertion's test name, each gate's exit code, and `git status --porcelain`.

## Acceptance criteria

1. From `/home/user/agent-port`: `npm run test:guides` exits 0.
2. `npm run test:policy`, `npm run lint:check`, and `npm run format:check` exit 0.
3. `git diff --stat` lists only owned files.
