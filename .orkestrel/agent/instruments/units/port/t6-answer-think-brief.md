# Unit t6-answer-think — Run the ledger's answer pass with thinking off, always

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. Executor: BENCH_ENGINE. You are the engine: you implement this unit yourself, and you launch no `codex`, no bench probe, and no other agent.

## Objective

Make the ledger's tool-free answer pass always run with thinking off, with no option to turn it on. Reduce `LedgerOptions.think` to a choice for the first pass alone.

## Context

- **Evidence.** In the measured series, the 2B with thinking on ended g01 and g10 with no reply.
  - The first pass's last call wrote its answer as reasoning and ended the turn without closing its think block. Ollama's template opens the block, and the raw output carried no `</think>` (`/home/user/agent/tmp/bench/results/v10/THINKING.md`, section "Measured on 2026-10-09").
  - The tool-free answer pass, run with thinking on, then thought to the generation cap with no content, at both 1,024 and 2,048 tokens (`/home/user/agent/tmp/bench/results/v10/FINAL-CHECK.md:28`).
  - An answer pass exists only to produce the reply from what the first pass gathered. With thinking off, the 2B writes the reply directly.
- **The code.**
  - `LedgerThink` and `LedgerOptions.think` live in `src/core/ledgers/types.ts`.
  - The pass runner is `#runPass` in `src/core/ledgers/Ledger.ts`.
  - The guide documents both in `guides/agent.md`: the `LedgerThink` row, the `LedgerOptions` row, the ledger concept and pattern sections, and the thinking-budget bullet.
  - `tests/guides.test.ts` has a test titled "requests or suppresses thinking on each pass through the think option".
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`.
  - `../scaffold/.claude/rules/typescript.md`, `names.md`, `architecture.md`, `tests.md`, `documentation.md`, and `writing.md`.
- **Host.** Linux, working path `/home/user/agent-port`, where Vitest runs inside the sandbox. A Vitest test that listens on `127.0.0.1` can fail there with `listen EPERM`. Report such a failure as sandbox-only; the Orchestrator re-runs that gate outside the sandbox.
- **Standing conditions.**
  - Never run `npm run build` or `npm run clean`, and never write a `dist` directory.
  - Never write under `/home/user/agent`, and send no request to `127.0.0.1:11434`.

## Scope

- **Owned.** `src/core/ledgers/types.ts`, `src/core/ledgers/Ledger.ts`, `tests/src/core/ledgers/Ledger.test.ts`, `guides/agent.md`, and `tests/guides.test.ts`.
- **Off-limits.** Every other file.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. **Delete `LedgerThink`.** `LedgerOptions.think` becomes `readonly think?: boolean`.
   - It is forwarded on the first pass as the `think` run option. When it is absent, no `think` member is forwarded.
   - Its TSDoc says that it chooses thinking for the first pass, and that the answer pass always runs with thinking off.
2. **The answer pass always forwards `think: false`.** State the reason in one TSDoc sentence on `LedgerOptions.think` or in the `Ledger` class remarks: a thinking model asked for a reply with no tools can end its turn inside its reasoning or think to the generation cap, and the answer pass exists to produce the reply. Cite no figure.
3. **Tests.**
   - The answer pass sends `think: false` whether `think` is `true`, `false`, or absent.
   - The first pass sends the `think` value given, and no `think` member when it is absent.
   - Use the recorder provider the existing per-pass test uses.
4. **Guide.**
   - Remove the `LedgerThink` row.
   - Update the `LedgerOptions` row and every sentence that names `think.first` or `think.answer`.
   - Update the guide test titled "requests or suppresses thinking on each pass through the think option" to the contract above.
   - Every Summary cell equals its TSDoc description paragraph.

## Output

Return:

- one line per contract with its `path:line` and its test's `path:line`;
- each gate's exit code;
- `git status --porcelain` or `unavailable`.

No process diary.

## Acceptance criteria

1. `npx tsc --noEmit --project tsconfig.json` and `npm run check:src:core` exit 0.
2. `npm run test:src:core` and `npm run test:guides` exit 0. The latter can be sandbox-limited; see Host.
3. `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.
4. `grep -rn "LedgerThink\|think.answer\|think.first" src guides tests` prints nothing.
