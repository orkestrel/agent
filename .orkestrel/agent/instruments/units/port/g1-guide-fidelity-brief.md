# Unit g1-guide-fidelity — State what the ledger's recall, answer note, and tail send

## Role and engine

`opus` on Claude Opus 5.5, reached as a workflow subagent. The voice and the wording are this unit's judgment; the facts are fixed. Executor: NATIVE_SUBAGENT.

## Objective

Commit `4ceab14` changed what the ledger's `recall` tool, answer note, and seed tail send (`tmp/units/records-port-plan.md` § Replay fidelity rulings). Make `guides/agent.md` state the behavior as it stands, with an executed assertion behind every changed claim.

## Context

- **Behavior.** `src/core/ledgers/Ledger.ts` at `4ceab14`: `#recall`, `#buildDigest`, and `#selectTail`; the tests in `tests/src/core/ledgers/Ledger.test.ts` named X1 to X5 in `tmp/units/f-fidelity-last.md`.
- **Claims to correct.**
  - `guides/agent.md:519`: a stale sentence leaves "every record and every route to the model". It leaves the records and the briefing; `recall`, the answer note, and the seed tail keep stored content.
  - `guides/agent.md:521`: `recall` "returns the live lines". It lists the earlier messages and lookup readings that match a topic, with stored content, newest first, amenders after their source, cut whole to the room.
  - `guides/agent.md:523`: the answer note carries what the pass's lookups and recalls returned, without call text.
  - `guides/agent.md:2640`: the test list's description of stale sentences across routes.
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`;
  - `../scaffold/.claude/rules/documentation.md`: a prose claim about behavior has an executed assertion that breaks when the claim goes false;
  - `../scaffold/.claude/rules/writing.md`.
- **Standing conditions.** Never run `npm run build` or `npm run clean`. Write nothing under `/home/user/agent` or `/home/user/agent-port-gauge`. Send no request to `127.0.0.1:11434`.

## Scope

- **Owned.** `guides/agent.md` and `tests/guides.test.ts`.
- **Off-limits.** Every other file.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. Each claim in Context reads true of `4ceab14`, in the guide's voice.
2. Each changed claim has an executed assertion in `tests/guides.test.ts` that breaks when the claim goes false, or cites the existing one by name.
3. No other guide line changes.

## Output

Return each changed claim's `path:line`, each assertion's test name, each gate's exit code, and `git status --porcelain`.

## Acceptance criteria

1. `npm run test:guides` exits 0.
2. `npm run test:policy`, `npm run lint:check`, and `npm run format:check` exit 0.
3. `git diff --stat` lists only owned files.
