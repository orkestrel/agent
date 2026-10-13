# Unit t7-attack-fix — Close the package's test and guide gaps from the attack round

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. Executor: BENCH_ENGINE. You are the engine: you implement this unit yourself, and you launch no `codex`, no bench probe, and no other agent.

## Objective

Close the five package findings the attack round confirmed (lane `package`, F1 to F5). Each is a test or documentation gap; no behavior changes.

## Context

- **Evidence.** The findings, with their verifiers' readings, are in `/home/user/agent/tmp/bench/results/v10/audit/attack.json`, under `confirmed`, lane `package`.
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`;
  - `../scaffold/.claude/rules/tests.md`: test observable behavior; never assert the implementation against itself; no mocks, fakes, or spies;
  - `../scaffold/.claude/rules/documentation.md`: a prose claim about behavior has an executed assertion that breaks when the claim goes false;
  - `../scaffold/.claude/rules/writing.md`.
- **Host.** Linux, working path `/home/user/agent-port`, where Vitest runs inside the sandbox. A test that listens on `127.0.0.1` fails there with `listen EPERM`. Report such a failure as sandbox-only; the Orchestrator re-runs that gate outside the sandbox.
- **Standing conditions.** Never run `npm run build` or `npm run clean`. Never write under `/home/user/agent`, and send no request to `127.0.0.1:11434`.

## Scope

- **Owned.**
  - `tests/src/core/ledgers/Ledger.test.ts` and `tests/src/core/providers/RelayStream.test.ts`;
  - `guides/agent.md` and `tests/guides.test.ts`;
  - `tmp/units/records-port-plan.md`.
- **Off-limits.** Every `src/` file. When a finding needs a source change, change nothing there and report the exact patch.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Rulings

1. **F1.** Add a ledger test showing that, with `think` absent and replay `'none'`, the first pass's request carries no `think` option and the plan budget equals the budget at `predict` 0. The answer pass sends `think: false` by design; assert that as well.
2. **F2.** Add a section, `## Thinking departures`, to `tmp/units/records-port-plan.md`. List what the port does that no measured arm ran:
   - `predict` reserved from the plan, the recall room, and the close rule;
   - thinking subtracted from `left` under `'none'`;
   - the reply reserve without thinking;
   - the rate positivity guard;
   - the answer pass with thinking off.

   Rule that a live port series under thinking measures these before any claim of parity with a measured thinking arm.
3. **F3.**
   - Delete the read-count assertions: `replayReads` in `Ledger.test.ts` near lines 102 to 137, and the matching count in `RelayStream.test.ts` near lines 22 to 47.
   - Replace each with an observable check: change the provider's `replay` getter's value after construction, and assert that the requests the provider receives follow the policy captured at construction.
4. **F4.** Add a ledger test that strips thinking from the tail before the plan's cap. Build an owner record, so that the briefing is non-empty, and a seed assistant reply that carries a large `thinking` in the tail. Assert that the provider's first call has the same system message, briefing included, as the same scenario without the thinking.
5. **F5.**
   - Narrow the guide sentence at `guides/agent.md` near line 624 to what is true for each owner. The agent loop and a relay send the messages they would send with no thinking recorded; a ledger also reads recorded thinking to measure what a call left.
   - Add the executed assertion for the ledger case beside the existing one at `tests/guides.test.ts` near line 1986.

## Output

Return:

- one line per ruling with its `path:line`;
- each gate's exit code;
- `git status --porcelain` or `unavailable`.

## Acceptance criteria

1. `npx tsc --noEmit --project tsconfig.json` and `npm run check:src:core` exit 0.
2. `npm run test:src:core` exits 0. `npm run test:guides` exits 0, or fails only on sandbox listeners.
3. `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.
4. `git diff --stat -- src` is empty.
