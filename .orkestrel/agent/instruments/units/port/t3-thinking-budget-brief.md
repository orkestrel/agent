# Unit t3-thinking-budget — Reserve generation room in the ledger and choose thinking per pass

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. Executor: BENCH_ENGINE. You are the engine: you implement this unit yourself, and you launch no `codex`, no bench probe, and no other agent.

## Objective

Make the ledger's prompt budget and its gauge reserve the generation room a thinking call takes. Count only the thinking the next request carries, and let a caller turn thinking on or off for each pass.

**Invariant.** A ledger at capacity `W + P` with `predict` `P` and thinking on must budget like the same ledger at `W` with thinking off. With `predict` absent and no thinking, every reading must equal today's.

## Context

- **Evidence.**
  - `/home/user/agent/tmp/bench/results/v10/THINKING.md`, sections 1, 2, and 5, holds the design and the measurements. The rulings in this brief override it where they differ.
  - The measured hand rule: the benchmark grew the window by the thinking cap and cut the prompt share, so `(capacity - predict) * 0.7` gave a prompt budget of 2,150.4 tokens in every condition (`/home/user/agent/tmp/bench/results/v10/FINAL-CHECK.md:18,24`).
  - Earlier units landed these, read them first, and consume them unchanged:
    - `Message.thinking`;
    - `ThinkingReplay` and `ProviderInterface.replay`;
    - `stripThinking(messages, replay)` in `src/core/agents/helpers.ts`;
    - an agent loop that stores each call's thinking on the assistant message it appends.
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`.
  - `../scaffold/.claude/rules/typescript.md` (lines 87 and 88: state every thrown error and failure behavior), `../scaffold/.claude/rules/names.md`, `../scaffold/.claude/rules/architecture.md`, `../scaffold/.claude/rules/tests.md`, and `../scaffold/.claude/rules/writing.md`.
- **Host.** Linux, working path `/home/user/agent-port`, where Vitest runs inside the sandbox. A nested `git` can report `not a git repository`; report `git status --porcelain` as unavailable in that case.
- **Standing conditions.**
  - Never run `npm run build` or `npm run clean`, and never write a `dist` directory.
  - Never write under `/home/user/agent`, and send no request to `127.0.0.1:11434`.

## Scope

- **Owned.**
  - `src/core/ledgers/types.ts`, `src/core/ledgers/Gauge.ts`, `src/core/ledgers/Ledger.ts`, and `src/core/ledgers/helpers.ts`;
  - `tests/src/core/ledgers/Gauge.test.ts`, `tests/src/core/ledgers/Ledger.test.ts`, and `tests/src/core/ledgers/helpers.test.ts`.
- **Off-limits.** Every other file. When a contract needs a change elsewhere, change nothing there and report the exact patch.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. **`predict`.** Add `readonly predict?: number` to `LedgerOptions` and `GaugeOptions`.
   - It is the generation cap in tokens, thinking included, that the provider gives each call. Default: 0.
   - It must be a nonnegative safe integer below `capacity`. Otherwise the `Ledger` and `Gauge` constructors throw `LedgerError` with code `'CAPACITY'`; state each one with `@throws`.
   - The `Ledger` passes it to the gauge it builds.
2. **`GaugeOptions.replay`**: `readonly replay?: ThinkingReplay`, default `'none'`. The ledger passes `provider.replay ?? 'none'`.
3. **`GaugeCall.thinking`**: `readonly thinking?: number`, the tokens of the call's completion that were thinking.
   - The `Ledger` sets it on each call whose assistant message carries `thinking`. The value is the completion tokens times the thinking's share of the characters the call generated (its `thinking`, its `content`, and its `calls` as JSON), rounded to the nearest integer and at most the completion.
   - The `Ledger` sets it before the gauge next reads the calls: the recall close rule and room, the next call's observation, and the request's `observe`.
   - The usage event fires before the loop appends the call's assistant message, so read the message when it exists.
   - Put the pure share computation in `src/core/ledgers/helpers.ts`, with TSDoc, an `@example`, and tests.
4. **Plan budget** (`Ledger.ts` at the `total` computation): `Math.max(0, (capacity - predict) * share.prompt - fixed) / (1 + LEDGER_SCALE_DRIFT)`.
5. **`left`**: a call with a measured prompt uses `prompt + completion - carried`, where `carried` is the call's `thinking` when `replay` is `'none'`, and 0 otherwise. Under `'turn'` and `'all'`, the next request in the same pass carries the thinking.
6. **`reserve`**: the reply term reads `completion - (thinking ?? 0)` of the reply call, whatever the `replay`.
7. **`room`**: `Math.max(0, (left - predict - reserve) / 2 / rate)`.
8. **Recall close rule** (`Ledger.ts` in the recall tool): close when `left - predict < 2 * reserve`.
9. **Estimates count what the wire carries.** Before every ledger estimate of messages that a provider receives, apply `stripThinking(messages, provider.replay ?? 'none')`.
   - That covers the turn observation, the tail selection and its cap, and the system-text check.
   - Calibration prices messages it builds itself, which carry no thinking, and stays as it is.
10. **Per-pass thinking.** Add `LedgerThink` to `src/core/ledgers/types.ts`, as `{ readonly first?: boolean; readonly answer?: boolean }`, and add `readonly think?: LedgerThink` to `LedgerOptions`.
    - `#runPass` forwards `think.first` on the first pass and `think.answer` on the answer pass as the `think` run option.
    - An absent member forwards no `think` member, so the provider's default applies.
11. **TSDoc.** Update the remarks of `LedgerOptions`, `GaugeOptions`, `GaugeCall`, and the `left`, `reserve`, and `room` members to state the arithmetic of contracts 4 to 8, and the `Gauge` class remarks.
    - The `GaugeInterface` method TSDoc follows the interface contract.
    - Never write `ensure`, `guarantee`, `should`, `now`, or `new`.

## Tests to land

- **Invariant: plan.** The plan's total at capacity 4,096 with `predict` 1,024, `share.prompt` 0.7, and `fixed` 0 equals the total at capacity 3,072 with no `predict`.
- **Invariant: gauge.** For the same calls, `left - predict`, `reserve`, `room`, and the close decision are equal in two settings:
  - capacity `W + P`, `predict` `P`, `replay` `'none'`, with each completion `c + t` and `thinking` `t`;
  - capacity `W`, with each completion `c` and no thinking.
- **`'turn'`.** Under `replay` `'turn'`, `left` subtracts the whole completion.
- **Unchanged default.** With `predict` absent and no thinking, every ledger test that existed before this unit passes unchanged.
- **Constructors.** Both constructors refuse a negative, fractional, or capacity-sized `predict` with `'CAPACITY'`.
- **Share helper.** The rounding, the cap at the completion, an empty generation, and a call with `calls` only.
- **Per pass.** A recorder provider (a real `ProviderInterface` object that records each call's options) shows the first pass sent `think: true` and the answer pass `think: false` when `think` is `{ first: true, answer: false }`. With `think` absent, neither pass sends a `think` option.
- **Estimates.** With `replay` `'none'`, a turn observation over an assistant message carrying `thinking` gives the same estimate as without it.
- Use no mocks, fakes, spies, or module replacement.

## Output

Return:

- one line per contract number with the fix's `path:line` and its test's `path:line`;
- each gate's exit code;
- `git status --porcelain` or `unavailable`;
- any patch an off-limits file needs.

No process diary.

## Acceptance criteria

1. `npx tsc --noEmit --project tsconfig.json` and `npm run check:src:core` exit 0.
2. `npm run test:src:core` exits 0.
3. `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.
