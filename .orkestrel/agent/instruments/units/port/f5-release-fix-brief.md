# Unit f5-release-fix — Close the third release round, verbatim

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. Executor: BENCH_ENGINE. You are the engine: implement this unit yourself, and launch no `codex`, no bench probe, and no other agent.

## Objective

Apply the third round's prescriptions exactly as written, at commit `c5dbac9`. The round's verdicts: `tmp/codex/falsify3-astra-last.md` (objective) and `tmp/units/falsify3-opus-verdict.md` (subjective). The chain closes with a mutation probe, so each change carries a test that fails without it.

## Context

- **Port.** This worktree, `/home/user/agent-port`, branch `port`, at `c5dbac9`.
- **Bound.** The offline replay of the 8 measured `a5-records` runs must keep 0 unlisted bodies; the measured seeds pair every result with its own call id in order and use ids of at most 8 characters.
- **Law.** `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`; `../scaffold/.claude/rules/names.md`, `typescript.md`, `tests.md`, `documentation.md`, and `writing.md`.
- **Host.** Vitest runs inside the sandbox; a test that listens on `127.0.0.1` fails with `listen EPERM`. Report such a failure as sandbox-only.
- **Standing conditions.** Never run `npm run build` or `npm run clean`. Write nothing under `/home/user/agent` or `/home/user/agent-port-gauge`. Send no request to `127.0.0.1:11434`.

## Scope

- **Owned.** `src/core/**`, `tests/src/core/**`, `guides/agent.md`, and `tests/guides.test.ts`.
- **Off-limits.** Every other file.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create. Write each new test first, run it against the unchanged source, and report that it fails; then implement.

## Contracts to land

1. **Pairing (claim 1, both lanes).** In `#selectTail`, a call whose paired result is `undefined` leaves the tail. `resolveLedgerCall` pairs by position when the leader repeats a call id, as `collectToolGroups` does. Tests: the mixed id-and-idless group and the repeated-id group from the subjective verdict's claim 1 send no call without its result, and the repeated-id group reads each result under its own arguments.
2. **Concurrent runs (claim 4 and O1, the subjective ruling).** Document the limit at the concurrent-run bullet in `guides/agent.md`: any run started during a `respond` call, faulted or planned, adds its turns and usage to that call's gauge readings and shares its repeat stop. Replace the `Ledger.test.ts` assertion near line 244 with one taken after `await pending` that pins the limit, and narrow the TSDoc that claims more.
3. **Guide gates (7a, 7b).** Add the executed case 7a names (calibrate after a `respond` whose answer pass rejected, then a direct run, expecting `'REQUEST'`), and the case 7b names (a short-id lookup whose shown form is longer, at the tail boundary, asserting the tail fits), and pin the guide sentence each one backs.
4. **Measured wording (7c).** Drop "measured" and the series citations from `src/core/ledgers/constants.ts` lines near 40, 98, 109, and 117 and from the guide rows that copy them; keep the figures as limits.
5. **`'REQUEST'` doc (A2).** "whose request is neither an active `respond` call's request nor a ledger note".
6. **Restated claims (5, 6).** Change no code; the guide's calibration sentence states the policy applies at the next user boundary and the whole view is priced.

## Output

Return one line per contract with its `path:line`, each new test's name with its failing run on `c5dbac9`, each gate's exit code, and `git status --porcelain`.

## Acceptance criteria

1. `npx tsc --noEmit --project tsconfig.json` and `npm run check:src:core` exit 0.
2. `npm run test:src:core` exits 0.
3. `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.
4. `npm run test:guides` exits 0, or fails only on sandbox listeners, each reported.
5. `git diff --stat` lists only owned files.
