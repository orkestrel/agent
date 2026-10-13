# Unit t5-thinking-fix — Apply the review rulings to the thinking change

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. Executor: BENCH_ENGINE. You are the engine: you implement this unit yourself, and you launch no `codex`, no bench probe, and no other agent.

## Objective

Apply every ruled finding of the thinking review, pin each one with a test that would fail without the fix, and leave every gate green, the guide parity test included.

## Context

- **Evidence.**
  - The change under review is commits `d738cfe`, `ccdf574`, `85e3482`, and `4c67660` on branch `port`. Read `git log -p 01710ae..HEAD`.
  - The full review output is `/tmp/claude-0/-home-user/5e260bfe-213d-5ed6-a85a-c681e970c415/tasks/wo7voluh7.output`, under `result.review`. The rulings in this brief override it where they differ.
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`.
  - `../scaffold/.claude/rules/typescript.md`, `../scaffold/.claude/rules/names.md`, `../scaffold/.claude/rules/architecture.md`, `../scaffold/.claude/rules/tests.md`, `../scaffold/.claude/rules/documentation.md`, and `../scaffold/.claude/rules/writing.md`.
- **Host.** Linux, working path `/home/user/agent-port`, where Vitest runs inside the sandbox. A nested `git` can report `not a git repository`; report `git status --porcelain` as unavailable in that case.
- **Standing conditions.**
  - Never run `npm run build` or `npm run clean`, and never write a `dist` directory.
  - Never write under `/home/user/agent`, and send no request to `127.0.0.1:11434`.

## Scope

- **Owned.**
  - every file under `src/core/` and `tests/src/core/`;
  - `tests/setup.ts` and its proof `tests/setup.test.ts`;
  - `guides/agent.md` and `tests/guides.test.ts`, for the parity edits these rulings cause and for the wording rulings 4 and 6.
- **Off-limits.** Every other file.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Rulings: fix each one and pin it with a test

1. **Calibration strips thinking (review F1, blocking).** In the ledger's calibration, build the messages through the replay policy. Use that one array for both provider calls and for the scale estimate. Test: calibrate over a view whose assistant message carries `thinking`, under `'none'`. Assert that no recorded call message carries `thinking`, and that `scale` equals a literal computed by hand from the fixture.
2. **`computeThinking` is total (review F2, blocking).** Guard the calls serialization the way `estimateMessages` does, falling back to 0 call characters.
   - Drop the `@throws` tag, state the fallback in the remarks, and replace the throw test with one that asserts the fallback value.
   - Add a ledger test in which a call has cyclic arguments and carries thinking; it asserts that `respond` resolves.
3. **The calibrated gauge receives `predict` and `replay` (review F3, blocking).** Add a calibrated-ledger case in which recall stays open and the size of its result depends on `room`. Add a calibrated case under `'turn'` whose close decision differs from the one under `'none'`.
4. **Who applies the policy (review F4).** Reword `Message.thinking`, `MessageInput.thinking`, `ThinkingReplay`, and `ProviderInterface.replay` to say what the code does:
   - the agent loop, a relay server, and a ledger apply the policy before they call the provider;
   - a direct `generate` or `stream` call sends the messages as given.
   - Mirror each changed description paragraph in its guide Summary cell.
5. **Redundant sites (review F5).**
   - Remove the `stripThinking` wrapper around the literal system message in the briefing fit check.
   - Remove the thinking read at the start of the turn observation, and retitle its test to the reads that remain (recall and `respond`).
6. **The joined thinking (review F6).** Reword `AgentResult.thinking` and `joinThinking`:
   - each call's non-empty thinking is recorded on the assistant message that call appends;
   - the joined result also holds the thinking of calls that appended no message, such as an aborted call;
   - only recorded thinking can return to a provider.
7. **Summaries see no thinking (review F7).** `Conversation.compact` hands its summarizer the messages without `thinking`. A section summary is prompt text, and thinking stays out of prompt text derived from history, as it stays out of judge state and briefings. Test that the summarizer receives no `thinking` member.
8. **One home for `stripThinking` and `ThinkingReplay`.**
   - Move `ThinkingReplay` to `src/core/types.ts`, beside `Message`, and `stripThinking` to `src/core/helpers.ts`, beside `joinThinking`. The conversations module and `RelayStream` then import root helpers instead of the agents module.
   - Update every import and move both guide rows to the Root module table.
9. **Thinking member written once in the agent loop (checker F2).** Compute the optional thinking member once per provider result and spread it at both message writes.
10. **Defaults resolved once (checker F3).**
    - The `Agent`, the `Ledger`, and `RelayStream` each resolve `provider.replay ?? 'none'` once, at construction, into a private field. A `RelayStream` resolves it per stream if it has no longer-lived owner.
    - The `Ledger` resolves `predict ?? 0` once.
    - Delete the inline repeats.
11. **One predict check (checker F4).** Put the range check in one helper in `src/core/ledgers/helpers.ts`, named by the `names.md` prefix table, that throws `LedgerError` with code `'CAPACITY'`. Call it from both constructors.
12. **One home for the formulas (checker F5).**
    - Keep the budget formulas and the `predict` default in the `LedgerOptions` and `GaugeOptions` TSDoc.
    - Replace the restatements in the `Gauge` class remarks and in the `GaugeInterface` method TSDoc with `{@link}` references.
    - Mirror any changed description paragraph in the guide.
13. **Private method name (checker F6).** Rename the ledger's `#readThinking` after the step it performs, which writes the thinking share onto the last call, using the `names.md` prefix table.
14. **No reshaped stub (checker F7).** Add `replay` to the scripted provider's options in `tests/setup.ts` and remove the `Object.assign` patch in the ledger test.
15. **Documented domain (checker F8).** Delete the fractional-completion case of the `computeThinking` test.
16. **No self-derived assertions (checker F1, R3).**
    - Replace `expect(ledger.gauge?.scale).toBe(200 / estimateMessages(messages))` with a hand-computed literal.
    - Replace the `estimateMessages` thinking assertion in `tests/src/core/agents/helpers.test.ts` with a literal token count for the fixture text.
    - Keep the agent test's `window.consumed` against the parsed wire body, which is a second mechanism.
17. **`estimateMessages` description.** Add "a thinking estimate" to its description paragraph, and mirror it in the guide Summary cell.

These items stay as they are, and you change nothing for them:

- the `predict` name: it matches the generation cap the desk's model settings already call `predict`;
- the `ThinkingReplay` union: one axis with three values that `stripThinking` applies uniformly;
- the `AgentProvider` Classes-table row: the `ProviderInterface` row carries `replay`.

## Output

Return:

- one line per ruling number with the fix's `path:line` and its test's `path:line`;
- each gate's exit code;
- `git status --porcelain` or `unavailable`.

No process diary.

## Acceptance criteria

1. `npx tsc --noEmit --project tsconfig.json` and `npm run check:src:core` exit 0.
2. `npm run test:src:core` and `npm run test:guides` exit 0.
3. `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.
4. `grep -rn "?? 'none'" src/core` prints at most one line per resolving owner.
