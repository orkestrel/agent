# Unit t4-thinking-guide — Document recorded thinking, the replay policy, and the ledger's thinking budget

## Role and engine

`opus` on Claude Opus 5.5, reached as a native subagent. The judgment load is subjective: guide voice and the order that teaches the thinking contract. Executor: NATIVE_SUBAGENT.

## Objective

Document every export and member the three thinking units added, and correct every guide sentence they made false, so that `npm run test:guides` passes. Teach the thinking contract in one short section, with a fence that `tests/guides.test.ts` executes.

## Context

- **Evidence.**
  - The three commits on branch `port` since `01710ae`. Read `git log -p 01710ae..HEAD -- src` for the source, and read the TSDoc of every changed member.
    - `d738cfe` added `Message.thinking`, `MessageInput.thinking`, `ThinkingReplay`, `ProviderInterface.replay`, `ProviderOptions.replay`, and `stripThinking`. It also counts `thinking` in `estimateMessages` and leaves it out of the selection state.
    - `ccdf574` added `AgentProvider.replay`, stored thinking in the agent loop, and the replay policy at every provider call, at the compaction estimate, and in `RelayStream`.
    - `HEAD` (the ledger unit) added `LedgerOptions.predict`, `LedgerOptions.think`, `LedgerThink`, `GaugeOptions.predict`, `GaugeOptions.replay`, and `GaugeCall.thinking`, with the budget arithmetic in the `Gauge` and `Ledger` TSDoc.
  - The engines proposed guide text in `tmp/units/t2-thinking-replay-guide.patch` (a paragraph and one corrected sentence) and `tmp/units/t3-thinking-budget-off-limits.patch` (the ledger rows and the budget arithmetic). Use both as drafts, not as settled text.
  - The design and its reasons are in `/home/user/agent/tmp/bench/results/v10/THINKING.md`, sections 4 and 5. It contains the vendor survey, in which every surveyed vendor sends thinking back within a tool turn. Paraphrase only what the reader needs to choose a policy. Cite no measurement, because the replay arms are unmeasured.
  - The parity test is `tests/guides.test.ts`. It requires these:
    - every barrel export is documented;
    - every Summary cell equals its TSDoc description paragraph;
    - every behavioral interface has a method table;
    - the flagship fences execute.
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`.
  - `../scaffold/.claude/rules/documentation.md` (§ Parity, § Guide examples, and the prose-claim proof rule), `../scaffold/.claude/rules/writing.md`, and `../scaffold/.claude/rules/tests.md`.
- **Host.** Linux, working path `/home/user/agent-port`, a git worktree on local branch `port`.
- **Standing conditions.**
  - A live benchmark series in `/home/user/agent` imports `/home/user/agent/dist`. Never run `npm run build` or `npm run clean`, and never write a `dist` directory.
  - Never write under `/home/user/agent`, and send no request to `127.0.0.1:11434`.

## Scope

- **Owned.** `guides/agent.md` and `tests/guides.test.ts`.
- **Shared (report-only).** Every `src/core/` file. A Summary cell must equal the TSDoc description, so when a TSDoc paragraph is wrong or reads badly, return an exact TSDoc patch rather than writing a different Summary.
- **Off-limits.** Every other file.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Content to land

1. **Surface rows.** Add rows for `ThinkingReplay` (Providers module), `stripThinking` (Agents module), and `LedgerThink` (Ledgers module). Update every existing row whose interface gained a member: `Message`, `MessageInput`, `ProviderInterface`, `ProviderOptions`, `AgentProvider`, `LedgerOptions`, `GaugeOptions`, and `GaugeCall`.
2. **One section, `### Recording and replaying thinking`, placed after `### The HTTP provider engine`.** Teach in this order:
   1. Where thinking lands: `ProviderResult.thinking`, then the assistant message's `thinking`. It stays out of `content`, the selection state, and a briefing.
   2. What `replay` sends back, with the three values, and that `'none'` is the default and keeps every request as it was.
   3. Why `'turn'` exists: some backends' chat formats keep thinking inside the turn in progress, and some APIs refuse a tool turn without it. Paraphrase that much.
   4. That the agent applies the policy before every provider call and every compaction estimate, so the estimate counts what the wire carries.
   5. That a relay applies both policies.
   - End the section with a fence that runs `stripThinking` on a short conversation under `'none'` and `'turn'`, with the results in comments.
   - Transcribe that fence into the flagship fences of `tests/guides.test.ts` and execute it there.
3. **The ledger section and pattern.** In `### Serving a conversation through a ledger` and `### Serving requests through a ledger`, add the thinking budget:
   - `predict` reserves the generation room that thinking and the reply share;
   - the gauge counts only the thinking the next request carries;
   - `think.first` and `think.answer` choose thinking for each pass.
   - State the invariant: a ledger at capacity `W + P` with `predict` `P` budgets like one at `W` without thinking.
   - Prove the plan-budget half of that invariant in `tests/guides.test.ts`, with the gauge's public methods or the ledger's public surface, whichever the source makes reachable.
4. **Corrections.** Replace every sentence that says thinking never re-enters the conversation, starting at the `## Contract` list item 3. Run `grep -n "re-enter\|never re-enters" guides/agent.md` and rule every hit.
5. **Method tables.** No method changed. Verify that the method tables still match their interfaces, and add the `replay` member to a `## Surface` row only.

## Output

Return:

- each content number with its `guides/agent.md` line range and its test's line;
- each TSDoc patch you propose, as exact text;
- each gate's exit code;
- `git status --porcelain`.

No process diary.

## Acceptance criteria

1. `npm run test:guides` exits 0.
2. `npx tsc --noEmit --project tsconfig.json`, `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.
3. `grep -n "never re-enters" guides/agent.md` prints nothing.
