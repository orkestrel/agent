# Unit t1-thinking-record — Record thinking on messages and declare the replay policy

## Role and engine

`builder` on Claude Sonnet 5.5, reached as a native subagent. This brief fixes every name, type, and behavior, so the unit's shape is closed. Executor: NATIVE_SUBAGENT.

## Objective

Give an assistant message its own `thinking` member and give a provider a `replay` policy that names which assistant thinking it sends back. Carry `thinking` through every layer that copies, validates, shapes, or relays a message. Keep it out of judge state, and count it in the message estimate. Add the `stripThinking` helper that applies a policy. This unit does not change the agent loop or the ledger; later units do that.

## Context

- **Evidence.** `/home/user/agent/tmp/bench/results/v10/THINKING.md` holds the design and the reasons (sections 3 to 5). The rulings in this brief override it where they differ.
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`.
  - `../scaffold/.claude/rules/typescript.md`, `../scaffold/.claude/rules/names.md`, `../scaffold/.claude/rules/architecture.md`, `../scaffold/.claude/rules/tests.md`, and `../scaffold/.claude/rules/writing.md`.
- **Host.** Linux, working path `/home/user/agent-port`, a git worktree on local branch `port`.
- **Standing conditions.**
  - A live benchmark series in `/home/user/agent` imports `/home/user/agent/dist`. Never run `npm run build` or `npm run clean`, and never write a `dist` directory.
  - Never write under `/home/user/agent`, and send no request to `127.0.0.1:11434`.

## Scope

- **Owned.**
  - `src/core/types.ts`;
  - `src/core/validators.ts`;
  - `src/core/shapers.ts`;
  - `src/core/helpers.ts`;
  - `src/core/conversations/Conversation.ts`;
  - `src/core/providers/types.ts`;
  - `src/core/providers/RelayProvider.ts`;
  - `src/core/contexts/helpers.ts`;
  - `src/core/agents/types.ts`;
  - `src/core/agents/helpers.ts`;
  - the mirrored tests of those files under `tests/src/core/`.
- **Off-limits.** Every other file: `src/core/agents/Agent.ts`, every provider class other than `RelayProvider`, every `src/core/ledgers/` file, and `guides/agent.md`.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. **`Message.thinking` and `MessageInput.thinking`** in `src/core/types.ts`: `readonly thinking?: string`, placed after `images`.
   - TSDoc: holds the reasoning the provider call that produced an assistant turn separated from its `content`. It is present only on an assistant turn whose call surfaced reasoning. It never enters `content`, judge state, or a briefing. A provider sends it back only as its `replay` policy allows.
   - Extend the `Message` remarks with one sentence to match.
2. **Validation and shape.**
   - `isMessage` in `src/core/validators.ts` accepts an absent or string `thinking` and refuses any other value. Add a refused example.
   - `messageShape` in `src/core/shapers.ts` gains `thinking: optionalShape(stringShape())`.
3. **Conversation copy.** In `Conversation.#create`, carry `thinking` when the input supplies it, in the same conditional-spread form as `images`, and update the comment's list of carried members.
4. **Relay.** `RelayProvider` forwards `thinking` per message in the same form as `images` (`RelayProvider.ts:102`).
5. **Judge state.** `renderSelectionState` in `src/core/contexts/helpers.ts` leaves out `thinking` as it leaves out `images`. Update its remarks. The selection state's bytes for a message with `thinking` must equal those for the same message without it.
6. **`ThinkingReplay`** in `src/core/providers/types.ts`: `export type ThinkingReplay = 'none' | 'turn' | 'all'`.
   - `'none'` sends no assistant thinking back.
   - `'turn'` sends the thinking of the assistant messages that follow the last `user` message, which is the turn in progress.
   - `'all'` sends every assistant message's thinking.
7. **`ProviderInterface.replay`**: `readonly replay?: ThinkingReplay`. TSDoc: names which assistant thinking the provider sends back; absent means `'none'`.
8. **`ProviderOptions.replay`**: `readonly replay?: ThinkingReplay`, which configures a provider's `replay`. Default: `'none'`. In the `ProviderOptions` remarks, state the default in the same form as `timeout`.
   - `RelayProvider` reads it from its options and exposes `replay`. The `AgentProvider` class reads it in a later unit; leave `AgentProvider.ts` untouched.
9. **Rewrite every claim that thinking never re-enters the conversation**: `src/core/providers/types.ts:20-24`, `:31`, `:51-52`; `src/core/agents/types.ts:69-77` and `:95-97`; and `src/core/helpers.ts:52-53`.
   - The replacement says that thinking stays out of `content`, is recorded on the assistant message, and returns to a provider only as that provider's `replay` policy allows.
   - Keep each rewrite no longer than the text it replaces.
10. **`estimateMessages`** in `src/core/agents/helpers.ts` adds `estimateTokens(message.thinking)` when `thinking` is present. Update the remarks' sum. It stays total and never throws.
11. **`stripThinking(messages, replay)`**, exported from `src/core/agents/helpers.ts`. It takes `messages: readonly Message[]` and `replay: ThinkingReplay` and returns `readonly Message[]`.
    - `'all'` returns the input array itself.
    - `'none'` returns a copy in which every message that carries `thinking` is replaced by a copy without that member.
    - `'turn'` does the same for every message at or before the last `user` message. When no `user` message exists, every message counts as inside the turn.
    - Messages without `thinking` keep their identity (the same object). Only members other than `thinking` are copied, and no `undefined` member is ever written.
    - TSDoc with an `@example`.
12. **Barrels.** Every export added here reaches `src/core/index.ts` through the existing `export *` barrels. Add no barrel line by hand unless a module barrel lacks the file.

## Tests to land

- `isMessage` accepts a string `thinking` and refuses a number.
- `messageShape` round-trips `thinking`.
- A conversation stores `thinking` from the input and leaves the member absent without it.
- The relay body carries `thinking`.
- `renderSelectionState` output is byte-equal with and without `thinking`.
- `estimateMessages` grows by `estimateTokens(thinking)`.
- `stripThinking`:
  - `'none'` drops all thinking;
  - `'turn'` keeps only the thinking after the last user message;
  - `'turn'` with no user message keeps all thinking;
  - `'all'` returns the same array;
  - a message without thinking keeps its identity.
- Use real objects and no mocks, fakes, or spies, per `../scaffold/.claude/rules/tests.md`.

## Output

Return:

- one line per contract number with its `path:line` and the test that pins it;
- each gate's exit code;
- `git status --porcelain`.

No process diary.

## Acceptance criteria

1. `npx tsc --noEmit --project tsconfig.json` and `npm run check:src:core` exit 0.
2. `npm run test:src:core` exits 0.
3. `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.
4. `grep -rn "never re-enters" src` prints nothing.
5. `npm run test:guides` might fail only on the added exports `stripThinking` and `ThinkingReplay` (undocumented until the guide unit). Report its output; any other guide failure is this unit's to fix.
