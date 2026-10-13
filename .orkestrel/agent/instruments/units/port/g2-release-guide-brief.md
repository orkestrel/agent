# Unit g2-release-guide — Make the agent guide true of the release

## Role and engine

`opus` on Claude Opus 5.5, reached as a workflow subagent. The wording is this unit's judgment; the facts are fixed. Executor: NATIVE_SUBAGENT.

## Objective

Bring `guides/agent.md` and its executed assertions to commit `c3c654d`, under the rulings in `tmp/units/port-release-rulings.md`.

## Context

- **Rulings.** `tmp/units/port-release-rulings.md`: claims 4, 5, 7, and 10, and findings O1 and O3.
- **Findings 10a to 10j.** `tmp/units/falsify-opus-verdict.md`, verdict 10, each with what right looks like. For 10g, remove the paragraph that reports the research series as the records design; the live port series reports later.
- **Code.** `src/core/**` at `c3c654d`. The release fix renamed `cutItems` to `cutListing` and `LedgerTopic.requests` to `requested`, and added `collectExchanges` and `rankLedgerCut` (`tmp/units/f3-release-fix-last.md`). `npm run test:guides` fails 4 inventory tests at lines 260, 264, 281, and 286 on these.
- **Law.** `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`; `../scaffold/.claude/rules/documentation.md`: a prose claim about behavior has an executed assertion that breaks when the claim goes false; `../scaffold/.claude/rules/writing.md`.
- **Standing conditions.** Never run `npm run build` or `npm run clean`. Write nothing under `/home/user/agent` or `/home/user/agent-port-gauge`. Send no request to `127.0.0.1:11434`.

## Scope

- **Owned.** `guides/agent.md` and `tests/guides.test.ts`.
- **Off-limits.** Every other file.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. Each of 10a to 10j holds as the verdict's "right" states it.
2. **Claim 4.** The ledger section states that the plan bounds the briefing and the tail, that the request and each lookup result enter whole, and that the ledger refuses no over-window prompt.
3. **Claim 5.** The recall bullet states that each source is followed by the amenders the topic does not match itself, and that an amender the topic matches lists as its own newer item.
4. **Claim 7.** The guide names which judge failures hold an item: a refused question (`JudgeError` code `'QUESTION'`) and the deterministic logprob failure; any other failure is asked again on a later request.
5. **O1.** The guide says to run the ledger's agent only through `respond`, and that a run outside it faults.
6. **O3.** The guide names the repeat stop's identity and the projection's lookup identity apart.
7. **Inventory.** The barrel tables list `collectExchanges`, `cutListing`, and `rankLedgerCut`, drop `cutItems`, and every compared summary equals its source.
8. Each changed behavior claim has an executed assertion that breaks when it goes false, or cites the existing test by name.

## Output

Return each changed claim's `path:line`, each assertion's test name, each gate's exit code, and `git status --porcelain`.

## Acceptance criteria

1. `npm run test:guides` exits 0.
2. `npm run test:policy`, `npm run lint:check`, and `npm run format:check` exit 0.
3. `git diff --stat` lists only owned files.
