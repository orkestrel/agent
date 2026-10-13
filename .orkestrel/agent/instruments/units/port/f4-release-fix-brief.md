# Unit f4-release-fix — Close the code findings of the second release round

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. Executor: BENCH_ENGINE. You are the engine: implement this unit yourself, and launch no `codex`, no bench probe, and no other agent.

## Objective

Land every code ruling in `tmp/units/port-release-2-rulings.md`: claims 2, 3 with O4, 4 (stub pricing), 5, 8, 10a, 10b (TSDoc), O1 (TSDoc), and O3. The guide is a later unit; this unit changes `src/` and `tests/` only.

## Context

- **Rulings.** `tmp/units/port-release-2-rulings.md` is binding.
- **Evidence.** `tmp/codex/falsify2-astra-last.md` and `tmp/units/falsify2-opus-verdict.md` give each failing input; use them as the failing-first tests.
- **Port.** This worktree, `/home/user/agent-port`, branch `port`, at `6981e2d`.
- **Bound.** The offline replay of the 8 measured `a5-records` runs must keep 0 unlisted bodies: the measured seeds pair each result with its call in order, start with a user message, and carry no thinking, so none of these fixes may change a measured request body.
- **Law.** `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`; `../scaffold/.claude/rules/names.md`, `typescript.md`, `architecture.md`, `tests.md`, and `writing.md`.
- **Host.** Vitest runs inside the sandbox; a test that listens on `127.0.0.1` fails with `listen EPERM`. Report such a failure as sandbox-only.
- **Standing conditions.** Never run `npm run build` or `npm run clean`. Write nothing under `/home/user/agent` or `/home/user/agent-port-gauge`. Send no request to `127.0.0.1:11434`.

## Scope

- **Owned.** `src/core/**` and `tests/src/core/**`.
- **Off-limits.** `guides/`, `tests/guides.test.ts`, and every other file. When a guide test fails because of this unit's change, change nothing there and report the test and the guide line.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create. Write each new test first, run it against the unchanged source, and report that it fails; then implement.

## Contracts to land

1. **Claim 2.** Held failures live in a set of fingerprints, each covering the question, the state, the sources, and the judge model; a model that alternates A, B, A never asks the held A item again.
2. **Claim 3 and O4.** The ledger tail, the lookup reader, and the tail stub pair each call with the tool message whose `call` equals the call's id, falling back to position only when no tool message of the group carries an id. Tests: results that arrive out of call order keep each pair whole in the tail, each record carries its own lookup's text, and each stub names its own call.
3. **Claim 4.** The plan prices each lookup's stub as the final prompt renders it, so a plan that fits stays fit. Test: Astra's 400-character argument fixture keeps the seed tail within the budget.
4. **Claim 5.** The ledger tracks a `respond` call apart from calibration; the selection handler faults unless a `respond` call is active and the run's request is that call's request or one of the ledger's notes. Tests: a direct run during calibration and a direct run during a first pass each fault and ask the judge nothing, and leave the active request's state unchanged.
5. **O3.** That fault is a `LedgerError` with a code `LedgerErrorCode` names, documented in its TSDoc.
6. **Claim 8.** Calibration applies the replay policy as the next request will, with a user message after the seed. Test: under `'turn'` and `'all'`, the calibration body carries exactly the thinking the first request carries.
7. **Claim 10a.** The planning group is a named literal union in `ledgers/types.ts`; `rankLedgerCut` accepts it, and its contract states the order the tie-break reads.
8. **Claim 10b and O1.** `cutListing`'s TSDoc says "entries" throughout; `LedgerLine` and the record-line TSDoc in `types.ts` and `helpers.ts` say "a sentence of a live message, verbatim except that a sentence that opens with a pronoun opens with its party and a colon".

## Output

Return one line per contract with its `path:line`, each new test's name with its failing run on `6981e2d`, each gate's exit code, every guide test that fails with its line, and `git status --porcelain`.

## Acceptance criteria

1. `npx tsc --noEmit --project tsconfig.json` and `npm run check:src:core` exit 0.
2. `npm run test:src:core` exits 0.
3. `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.
4. `npm run test:guides` exits 0, or fails only on sandbox listeners or on guide lines this unit's change contradicts, each reported.
5. `git diff --stat` lists only owned files.
