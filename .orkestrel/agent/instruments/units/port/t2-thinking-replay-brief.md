# Unit t2-thinking-replay — Store thinking in the agent loop and apply the replay policy

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. Executor: BENCH_ENGINE. You are the engine: you implement this unit yourself, and you launch no `codex`, no bench probe, and no other agent.

## Objective

Make the agent loop record each provider call's thinking on the assistant message it appends. Make every provider call and every prompt estimate in the loop see the messages the provider's `replay` policy allows. With `replay` absent or `'none'`, every request body must stay byte-identical to the bodies before this unit.

## Context

- **Evidence.**
  - `/home/user/agent/tmp/bench/results/v10/THINKING.md` holds the design and the reasons (sections 1, 3, 4, and 5). The rulings in this brief override it where they differ.
  - The preceding unit landed `Message.thinking`, the `ThinkingReplay` type, `ProviderInterface.replay`, `ProviderOptions.replay`, and `stripThinking(messages, replay)` in `src/core/agents/helpers.ts`. Read them first; this unit consumes them unchanged.
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`.
  - `../scaffold/.claude/rules/typescript.md`, `../scaffold/.claude/rules/names.md`, `../scaffold/.claude/rules/architecture.md`, `../scaffold/.claude/rules/tests.md`, and `../scaffold/.claude/rules/writing.md`.
- **Host.** Linux, working path `/home/user/agent-port`, where Vitest runs inside the sandbox. A nested `git` can report `not a git repository`; report `git status --porcelain` as unavailable in that case.
- **Standing conditions.**
  - Never run `npm run build` or `npm run clean`, and never write a `dist` directory.
  - Never write under `/home/user/agent`, and send no request to `127.0.0.1:11434`.

## Scope

- **Owned.**
  - `src/core/agents/Agent.ts`;
  - `src/core/providers/AgentProvider.ts`, `src/core/providers/RelayProvider.ts`, and `src/core/providers/RelayStream.ts`;
  - `tests/src/core/agents/Agent.test.ts` and the mirrored tests of the three provider files.
- **Off-limits.** Every other file, including `src/core/agents/helpers.ts`, `src/core/providers/types.ts`, every `src/core/ledgers/` file, and `guides/agent.md`. When a contract here needs a change in an off-limits file, change nothing there and report the exact patch.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. **`AgentProvider.replay`.**
   - The `AgentProvider` class reads `replay` from its input, default `'none'`, and exposes it as `readonly replay: ThinkingReplay` (a getter over a private field, like `id`).
   - It performs no validation, the same as `timeout`.
   - When the preceding unit gave `RelayProvider` its own `replay` member, remove it so that `RelayProvider` inherits the base member, and pass its options' `replay` through to the base.
2. **Stored thinking.** Every assistant message the loop appends, both the message carrying `calls` and the final answer message, carries `thinking` when the provider call's `result.thinking` is a non-empty string. Otherwise the member is absent.
3. **Provider input.** Every provider call in the loop receives `stripThinking(messages, this.#provider.replay ?? 'none')` in place of the working `messages` array.
4. **Compaction estimate.** The auto-compaction window in `#trim` consumes the same stripped array, so the estimate and the wire agree.
5. **Relay server.** `RelayStream` applies `stripThinking(messages, provider.replay ?? 'none')` to the messages it receives before it calls its provider's `stream`. A relay chain therefore sends back the narrower of the two policies.
6. **TSDoc and comments.**
   - Update the `Agent` class remarks and the comments at the provider call and in `#trim` that describe the prompt input, so that they name the replay policy.
   - Update the `AgentProvider` remarks with the `replay` input and its default.

## Tests to land

- **`'none'` and absent.** A tool-calling run against a provider whose results carry `thinking` sends request bodies that contain no `thinking` member. The bodies equal those of the same run whose results carry no `thinking`. Use a concrete `AgentProvider` subclass over a recording `fetch` transport, as the existing provider tests do.
- **`'turn'`.**
  - The second request of a tool turn carries the first call's thinking on its assistant message.
  - A later run, after a new user message, carries no thinking from the earlier turn.
- **`'all'`.** A later run carries every stored assistant thinking.
- **Stored.**
  - The conversation's assistant messages carry the thinking of their own call.
  - A result with an empty `thinking` string stores no member.
- **Compaction.** With a window that the unstripped messages would exhaust and the stripped messages fit, `'none'` does not compact.
- **Relay.** A `RelayStream` over a provider with `replay` `'none'` passes its provider messages without `thinking`.
- Use no mocks, fakes, spies, or module replacement, per `../scaffold/.claude/rules/tests.md`. A real subclass over a recording transport is the precedent.

## Output

Return:

- one line per contract number with the fix's `path:line` and its test's `path:line`;
- each gate's exit code;
- `git status --porcelain` or `unavailable`;
- any patch an off-limits file needs.

No process diary.

## Acceptance criteria

1. `npx tsc --noEmit --project tsconfig.json` and `npm run check:src:core` exit 0.
2. `npm run test:src:core` exits 0, with every test that existed before this unit unchanged in what it asserts.
3. `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.
